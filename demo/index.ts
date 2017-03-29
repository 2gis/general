import {
    loadAtlas,
    loadMapsApi,
    loadMarkersData,
    lngLatToZoomPoint,
    mapPointToZoomPoint,
    latLngToMapPoint,
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
};

const priorityGroups: PriorityGroup[] = [{
    iconIndex: 0,
    safeZone: 20,
    margin: 2,
    degradation: 100,
}, {
    iconIndex: 1,
    safeZone: 12,
    margin: 0,
    degradation: 0,
}, {
    iconIndex: 2,
    safeZone: 2,
    margin: 2,
    degradation: 0,
}];

Promise.all([
    loadMapsApi(),
    loadAtlas(),
    loadMarkersData(),
]).then(([map, atlas, markersData]) => {
    // const markersData: any[] = [
    //     { lon: 37.671733856201, lat: 55.73620223999, is_advertising: true },
    //     { lon: 37.657371520996, lat: 55.709766387939, is_advertising: false },
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
        markers.push(marker);
    }

    const config = {
        drawingOffsets: false,
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
        safeZone.onChange(datGuiOnchange);
        margin.onChange(datGuiOnchange);
        degradation.onChange(datGuiOnchange);
        folder.open();
    });
    const drawingOffsets = gui.add(config, 'drawingOffsets');
    drawingOffsets.onChange(datGuiOnchange);

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

        if (config.drawingOffsets) {
            for (let i = 0; i < markers.length; i++) {
                const marker = markers[i];
                if (marker.iconIndex === -1 || marker.iconIndex === undefined) {
                    continue;
                }
                const group = priorityGroups[marker.iconIndex];

                marker.drawingOffsets = [
                    0,
                    group.safeZone,
                    group.margin,
                    group.degradation,
                ];
            }
        }

        if (markerDrawer) {
            markerDrawer.remove();
        }

        markerDrawer = new MarkerDrawer(markers, atlas, {
            debugDrawing: config.drawingOffsets,
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
