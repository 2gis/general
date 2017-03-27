import * as DG from '2gis-maps';
import {
    MarkerDrawer,
    Atlas,
    Marker as DrawMarker,
} from 'markerdrawer';
import {
    BBox,
    generalize,
    PriorityGroup,
} from '../src';

declare var dat: any;
const gui = new dat.GUI();

interface ApiMarker {
    lon: number;
    lat: number;
    is_advertising: boolean;
}

function loadMarkersData(): Promise<ApiMarker[]> {
    const m1 = fetch('./demo/search1.json')
        .then((res) => res.json())
        .then((data: any) => data.result.items as ApiMarker[]);

    const m2 = fetch('./demo/search2.json')
        .then((res) => res.json())
        .then((data: any) => data.result.items as ApiMarker[]);

    return Promise.all([m1, m2])
        .then(([m1, m2]) => m1.concat(m2));
}

function loadMapsApi(): Promise<L.Map> {
    return new Promise((res) => {
        DG.then(() => {
            const map = L.map('map', {
                center: [55.75088330688495, 37.62062072753907],
                zoom: 11,
            });

            res(map);
        });
    });
}

function loadAtlas(): Promise<Atlas> {
    const folder = window.devicePixelRatio > 1 ? 2 : 1;
    const m0 = new Image();
    m0.src = 'demo/markers/' + folder + '/pin_commercial.png';

    const m1 = new Image();
    m1.src = 'demo/markers/' + folder + '/pin_regular.png';

    const m2 = new Image();
    m2.src = 'demo/markers/' + folder + '/pin_tile.png';

    const atlas = new Atlas([{
        image: m0,
        anchor: [0.5, 0.5],
    }, {
        image: m1,
        anchor: [0.5, 0.5],
    }, {
        image: m2,
        anchor: [0.5, 0.5],
    }]);

    return atlas.whenReady().then(() => atlas);
}

Promise.all([
    loadMapsApi(),
    loadAtlas(),
    loadMarkersData(),
]).then(([map, atlas, markersData]) => {
    // const markersData: any[] = [
    //     { lon: 37.671733856201, lat: 55.73620223999, is_advertising: true },
    //     { lon: 37.657371520996, lat: 55.709766387939, is_advertising: false },
    // ];
    const markers: DrawMarker[] = [];

    for (let i = 0; i < markersData.length; i++) {
        const markerData = markersData[i];

        markers.push({
            position: [
                markerData.lon,
                markerData.lat,
            ],
        });
    }

    const priorityGroups: PriorityGroup[] = [{
        iconIndex: 0,
        safeZone: 20,
        margin: 2,
    }, {
        iconIndex: 1,
        safeZone: 12,
        margin: 0,
    }, {
        iconIndex: 2,
        safeZone: 2,
        margin: 2,
    }];

    const config = {
        drawingOffsets: false,
    };

    atlas.whenReady().then(() => {
        const generalizeMarkers: any[] = markers.map((marker: any, i) => {
            marker.groupIndex = markersData[i].is_advertising ? 0 : 1;
            marker.mapPoint = project(marker.position);
            marker.iconIndex = -1;
            return marker;
        });

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
            safeZone.onChange(datGuiOnchange);
            margin.onChange(datGuiOnchange);
            folder.open();
        });
        const drawingOffsets = gui.add(config, 'drawingOffsets');
        drawingOffsets.onChange(datGuiOnchange);

        function updateGeneralization() {
            console.time('update');
            const center = map.getCenter();
            const zoom = map.getZoom();
            const pixelCenter = lngLatToScreenPoint([center.lng, center.lat], zoom);
            const topLeft = [pixelCenter[0] - size.x, pixelCenter[1] - size.y]; // todo: а тут сайз пополоам не должен делиться?

            for (let i = 0; i < generalizeMarkers.length; i++) {
                const marker = generalizeMarkers[i];
                const point = mapPointToScreenPoint(marker.mapPoint, zoom);
                marker.pixelPosition = [point[0] - topLeft[0], point[1] - topLeft[1]];
            }

            if (resetLastGroupIndex) {
                for (let i = 0; i < generalizeMarkers.length; i++) {
                    const marker = generalizeMarkers[i];
                    marker.groupIndexAfterGenerelize = undefined;
                    marker.iconIndex = -1;
                }
                resetLastGroupIndex = false;
            }

            console.time('gen');
            generalize(bounds, retinaFactor, priorityGroups, atlas, generalizeMarkers);
            console.timeEnd('gen');

            if (config.drawingOffsets) {
                for (let i = 0; i < generalizeMarkers.length; i++) {
                    const marker = generalizeMarkers[i];
                    if (marker.iconIndex === -1 || marker.iconIndex === undefined) {
                        continue;
                    }
                    const group = priorityGroups[marker.iconIndex];

                    marker.drawingOffsets = [
                        0,
                        group.safeZone,
                        group.margin,
                    ];
                }
            }

            if (markerDrawer) {
                markerDrawer.remove();
            }

            markerDrawer = new MarkerDrawer(generalizeMarkers, atlas, {
                debugDrawing: config.drawingOffsets,
            });
            markerDrawer.on('click', (ev) => {
                ev.markers.forEach((index) => {
                    const marker = generalizeMarkers[index];
                    // tslint:disable-next-line
                    console.log('click', `{ lon: ${marker.position[0]}, lat: ${marker.position[1]} }`, marker);
                });
            });
            markerDrawer.addTo(map);
            console.timeEnd('update');
        }

        map.on('moveend', updateGeneralization);
        map.on('zoomstart', () => resetLastGroupIndex = true);
        updateGeneralization();
    }).catch((error) => {
        // tslint:disable-next-line
        console.log(error.stack);
    });
}).catch((error) => {
    // tslint:disable-next-line
    console.log(error.stack);
});

const R = 6378137;
const MAX_LATITUDE = 85.0511287798;

function lngLatToScreenPoint(lngLat: any, zoom: any) {
    return mapPointToScreenPoint(project(lngLat), zoom);
}

function mapPointToScreenPoint(point: [number, number], zoom): [number, number] {
    const scale = 256 * Math.pow(2, zoom);
    const k = 0.5 / (Math.PI * R);
    return [
        scale * (k * point[0] + 0.5),
        scale * (-k * point[1] + 0.5),
    ];
}

function project(lngLat: [number, number]): [number, number] {
    const d = Math.PI / 180;
    const lat = Math.max(Math.min(MAX_LATITUDE, lngLat[1]), -MAX_LATITUDE);
    const sin = Math.sin(lat * d);
    return [
        R * lngLat[0] * d,
        R * Math.log((1 + sin) / (1 - sin)) / 2,
    ];
}
