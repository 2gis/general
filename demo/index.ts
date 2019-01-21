import 'whatwg-fetch';
import * as DG from '2gis-maps';
import {
    loadAtlas,
    loadMarkersData,
    lngLatToZoomPoint,
    mapPointToZoomPoint,
    latLngToMapPoint,
    ApiMarker,
} from './utils';
import {
    MarkerDrawer,
    Marker as DrawMarker,
} from '@2gis/markerdrawer';
import {
    BBox,
    General,
    Marker as GeneralizeMarker,
    PriorityGroup,
} from '../src';

declare var dat: any;
const gui = new dat.GUI();
gui.close();

type Marker = DrawMarker & GeneralizeMarker & {
    mapPoint: [number, number],
    data: ApiMarker,
};

const configPriorityGroups: PriorityGroup[] = [{
    iconIndex: 0,
    safeZone: 0,
    margin: 5,
    degradation: 180,
}, {
    iconIndex: 1,
    safeZone: 20,
    margin: 0,
    degradation: 0,
}, {
    iconIndex: 2,
    safeZone: 5,
    margin: 0,
    degradation: 0,
}];

const map = window['map'] = DG.map('map', {
    center: [55.75088330688495, 37.62062072753907],
    zoom: 11,
});

Promise.all([
    loadAtlas(),
    loadMarkersData(),
]).then(([atlas, markersData]) => {
    const retinaFactor = window.devicePixelRatio;

    const markers: Marker[] = [];
    for (let i = 0; i < markersData.length; i++) {
        const markerData = markersData[i];
        const position: [number, number] = [markerData.lon, markerData.lat];
        const mapPoint = latLngToMapPoint(position);
        const pixelPosition = mapPointToZoomPoint(mapPoint, map.getZoom());
        const marker: Marker = {
            position,
            groupIndex: markersData[i].is_advertising ? 0 : 1,
            mapPoint,
            iconIndex: -1,
            data: markerData,
            pixelPosition: [pixelPosition[0] * retinaFactor, pixelPosition[1] * retinaFactor],
        };
        markers.push(marker);
    }

    const config = {
        groups: configPriorityGroups.map(() => ({ drawingOffsets: false })),
    };

    const size = map.getSize();
    let bounds: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    const markerDrawer = new MarkerDrawer();
    markerDrawer.setAtlas(atlas);
    markerDrawer.on('click', (ev: any) => {
        const marker = markers[ev.marker];
        // tslint:disable-next-line
        console.log('click', `{ lon: ${marker.position[0]}, lat: ${marker.position[1]} }`, marker);
    });
    markerDrawer.addTo(map);

    let zoomChanged = false;
    let generalizationIsBusy = false;
    let generalizetionNeedUpdate = false;

    const general = new General();

    // dat gui
    const datGuiOnchange = () => {
        zoomChanged = true;
        updateGeneralization();
    };
    configPriorityGroups.forEach((group, i) => {
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
        if (generalizationIsBusy) {
            generalizetionNeedUpdate = true;
            return;
        }

        // tslint:disable-next-line
        console.time('update');
        generalizationIsBusy = true;
        const center = map.getCenter();
        const zoom = map.getZoom();
        const pixelCenter = lngLatToZoomPoint([center.lng, center.lat], zoom);

        bounds = {
            minX: (pixelCenter[0] - 0.75 * size.x) * retinaFactor,
            minY: (pixelCenter[1] - 0.75 * size.y) * retinaFactor,
            maxX: (pixelCenter[0] + 0.75 * size.x) * retinaFactor,
            maxY: (pixelCenter[1] + 0.75 * size.y) * retinaFactor,
        };

        if (zoomChanged) {
            for (let i = 0; i < markers.length; i++) {
                const marker = markers[i];
                const pixelPosition = mapPointToZoomPoint(marker.mapPoint, zoom);
                marker.pixelPosition = [pixelPosition[0] * retinaFactor, pixelPosition[1] * retinaFactor];
            }
            zoomChanged = false;
        }

        // В генерал нужно отправлять priorityGroups с офсетами взависиомсти от ретина фактора
        const priorityGroups: PriorityGroup[] = configPriorityGroups.map((group) => ({
            iconIndex: group.iconIndex,
            safeZone: group.safeZone * retinaFactor,
            margin: group.margin * retinaFactor,
            degradation: group.degradation * retinaFactor,
        }));

        // tslint:disable-next-line
        console.time('gen');
        general.generalize(bounds, priorityGroups, atlas.sprites, markers).then(() => {
            // tslint:disable-next-line
            console.timeEnd('gen');
            generalizationIsBusy = false;

            const drawingOffsets = config.groups.some((g) => g.drawingOffsets);
            markerDrawer.setDebugDrawing(drawingOffsets);

            if (drawingOffsets) {
                for (let i = 0; i < markers.length; i++) {
                    const marker = markers[i];
                    if (marker.iconIndex === -1) {
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

            markerDrawer.setMarkers(markers);

            // tslint:disable-next-line
            console.timeEnd('update');

            if (generalizetionNeedUpdate) {
                updateGeneralization();
                generalizetionNeedUpdate = false;
            }
        });
    }

    map.on('moveend', updateGeneralization);
    map.on('zoomstart', () => {
        markerDrawer.setMarkers([]);
        zoomChanged = true;
    });
    updateGeneralization();
}).catch((error) => {
    // tslint:disable-next-line
    console.log(error.stack);
});
