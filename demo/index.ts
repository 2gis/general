import {
    loadAtlas,
    loadMapsApi,
    loadMarkersData,
    lngLatToZoomPoint,
    mapPointToZoomPoint,
    latLngToMapPoint,
    ApiMarker,
} from './utils';
import {
    MarkerDrawer,
    Marker as DrawMarker,
} from 'markerdrawer';
import {
    BBox,
    generalize,
    Marker as GeneralizeMarker,
    PriorityGroup,
} from '../src';

declare var dat: any;
const gui = new dat.GUI();

type Marker = DrawMarker & GeneralizeMarker & {
    mapPoint: [number, number],
    data: ApiMarker,
};

const priorityGroups: PriorityGroup[] = [{
    iconIndex: 0,
    safeZone: 0,
    margin: 5,
    degradation: 160,
}, {
    iconIndex: 1,
    safeZone: 5,
    margin: 0,
    degradation: 0,
}, {
    iconIndex: 2,
    safeZone: 5,
    margin: 0,
    degradation: 0,
}];

Promise.all([
    loadMapsApi(),
    loadAtlas(),
    loadMarkersData(),
]).then(([map, atlas, markersData]) => {
    window['map'] = map;

    // const markersData: any[] = [
    //     { lon: 38.016845703125, lat: 55.624744415283, is_advertising: false },
    //     { lon: 38.057151794434, lat: 55.630252838135, is_advertising: false },
    //     { lon: 38.029899597168, lat: 55.624053955078, is_advertising: false },
    //     { lon: 38.040855407715, lat: 55.628795623779, is_advertising: false },
    // ];

    const markers: Marker[] = [];
    for (let i = 0; i < markersData.length; i++) {
        const markerData = markersData[i];
        const marker: any = {};
        marker.position = [
            markerData.lon,
            markerData.lat,
        ];
        marker.groupIndex = markersData[i].is_advertising ? 0 : 1;
        marker.mapPoint = latLngToMapPoint(marker.position);
        marker.iconIndex = -1;
        marker.data = markerData;
        markers.push(marker);
    }

    const config = {
        groups: priorityGroups.map(() => ({ drawingOffsets: false })),
    };

    const retinaFactor = window.devicePixelRatio;
    const size = map.getSize();
    const bounds: BBox = {
        minX: -size.x * retinaFactor / 2,
        minY: -size.y * retinaFactor / 2,
        maxX: size.x * retinaFactor * 1.5,
        maxY: size.y * retinaFactor * 1.5,
    };

    let markerDrawer;
    let resetLastGroupIndex = false;

    // dat gui
    const datGuiOnchange = () => {
        resetLastGroupIndex = true;
        updateGeneralization();
    };
    priorityGroups.forEach((group, i) => {
        const folder = gui.addFolder('Group ' + i);
        const safeZone = folder.add(group, 'safeZone', 0, 200);
        const margin = folder.add(group, 'margin', 0, 200);
        const degradation = folder.add(group, 'degradation', 0, 200);
        const drawingOffsets = folder.add(config.groups[i], 'drawingOffsets');
        safeZone.onChange(datGuiOnchange);
        margin.onChange(datGuiOnchange);
        degradation.onChange(datGuiOnchange);
        drawingOffsets.onChange(datGuiOnchange);
        folder.open();
    });

    function updateGeneralization() {
        // tslint:disable-next-line
        console.time('update');
        const center = map.getCenter();
        const zoom = map.getZoom();
        const pixelCenter = lngLatToZoomPoint([center.lng, center.lat], zoom);
        const topLeft = [pixelCenter[0] - size.x, pixelCenter[1] - size.y];

        for (let i = 0; i < markers.length; i++) {
            const marker = markers[i];
            const point = mapPointToZoomPoint(marker.mapPoint, zoom);
            marker.pixelPosition = [point[0] - topLeft[0], point[1] - topLeft[1]];
        }

        if (resetLastGroupIndex) {
            for (let i = 0; i < markers.length; i++) {
                const marker = markers[i];
                marker.groupIndexAfterGenerelize = undefined;
                marker.iconIndex = -1;
            }
            resetLastGroupIndex = false;
        }

        // tslint:disable-next-line
        console.time('gen');
        generalize(bounds, retinaFactor, priorityGroups, atlas, markers);
        // tslint:disable-next-line
        console.timeEnd('gen');

        const drawingOffsets = config.groups.some((g) => g.drawingOffsets);

        if (drawingOffsets) {
            for (let i = 0; i < markers.length; i++) {
                const marker = markers[i];
                if (marker.iconIndex === -1 || marker.iconIndex === undefined) {
                    continue;
                }

                if (config.groups[marker.iconIndex].drawingOffsets) {
                    const group = priorityGroups[marker.iconIndex];
                    marker.drawingOffsets = [
                        0,
                        group.safeZone,
                        group.margin,
                        group.degradation,
                    ];
                } else {
                    marker.drawingOffsets = [];
                }
            }
        }

        if (markerDrawer) {
            markerDrawer.remove();
        }

        markerDrawer = new MarkerDrawer(markers, atlas, {
            debugDrawing: drawingOffsets,
        });
        markerDrawer.on('click', (ev) => {
            ev.markers.forEach((index) => {
                const marker = markers[index];
                // tslint:disable-next-line
                console.log('click', `{ lon: ${marker.position[0]}, lat: ${marker.position[1]} }`, marker);
            });
        });
        markerDrawer.addTo(map);
        // tslint:disable-next-line
        console.timeEnd('update');
    }

    map.on('moveend', updateGeneralization);
    map.on('zoomstart', () => resetLastGroupIndex = true);
    updateGeneralization();
}).catch((error) => {
    // tslint:disable-next-line
    console.log(error.stack);
});
