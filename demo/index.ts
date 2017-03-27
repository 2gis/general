import * as DG from '2gis-maps';
import {
    MarkerDrawer,
    Atlas,
    Marker as DrawMarker,
} from 'markerdrawer';
import {
    generalize,
    Marker as GeneralizeMarker,
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
    return fetch('./demo/search.json')
        .then((res) => res.json())
        .then((data: any) => data.result.items as ApiMarker[]);
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
    const m0 = new Image();
    m0.src = 'demo/markers/pin_commercial.png';

    const m1 = new Image();
    m1.src = 'demo/markers/pin_regular.png';

    const m2 = new Image();
    m2.src = 'demo/markers/pin_tile.png';

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
    //     { lon: 37.916923522949, lat: 55.830142974854, is_advertising: true },
    //     { lon: 37.983196258545, lat: 55.858730316162, is_advertising: false },
    //     { lon: 37.943126678467, lat: 55.796855926514, is_advertising: true },
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
        safeZone: 0,
        margin: 0,
    }, {
        iconIndex: 1,
        safeZone: 100,
        margin: 50,
    }, {
        iconIndex: 2,
        safeZone: 0,
        margin: 0,
    }];

    const config = {
        drawingOffsets: false,
    };

    atlas.whenReady().then(() => {
        const markersWithGroups: GeneralizeMarker[] = markers.map((marker: GeneralizeMarker, i) => {
            marker.groupIndex = markersData[i].is_advertising ? 0 : 1;
            return marker;
        });

        let markerDrawer;
        let showedMarkers: GeneralizeMarker[];

        initGui(config, priorityGroups, updateGeneralization);

        function updateGeneralization() {
            console.time('gen');
            const generalizeMarkers: GeneralizeMarker[] = markersWithGroups.map((marker: GeneralizeMarker) => {
                const point = map.project(L.latLng(marker.position[1], marker.position[0]), map.getZoom());
                marker.pixelPosition = [point.x, point.y];
                return marker;
            });

            showedMarkers = generalize(priorityGroups, atlas, generalizeMarkers);
            showedMarkers.map((marker: GeneralizeMarker) => {
                if (marker.iconIndex === undefined) {
                    return;
                }
                const group = priorityGroups[marker.iconIndex];

                marker.drawingOffsets = [
                    0,
                    group.safeZone,
                    group.margin,
                ];

            });

            if (markerDrawer) {
                markerDrawer.remove();
            }

            markerDrawer = new MarkerDrawer(showedMarkers, atlas, {
                debugDrawing: config.drawingOffsets,
            });
            markerDrawer.on('click', (ev) => {
                const marker = showedMarkers[ev.markers[0]];
                // tslint:disable-next-line
                console.log('click', `{ lon: ${marker.position[0]}, lat: ${marker.position[1]} }`, marker);
            });
            markerDrawer.addTo(map);
            console.timeEnd('gen');
        }

        map.on('zoomend', updateGeneralization);
        updateGeneralization();
    });
}).catch((error) => {
    // tslint:disable-next-line
    console.log(error.stack);
});

function initGui(
    config: { drawingOffsets: boolean },
    priorityGroups: PriorityGroup[],
    updateGeneralization: () => void,
) {
    priorityGroups.forEach((group, i) => {
        const folder = gui.addFolder(`Group ${i}`);
        const safeZone = folder.add(group, 'safeZone', 0, 200);
        const margin = folder.add(group, 'margin', 0, 200);
        safeZone.onChange(updateGeneralization);
        margin.onChange(updateGeneralization);
        folder.open();
    });
    const drawingOffsets = gui.add(config, 'drawingOffsets');
    drawingOffsets.onChange(updateGeneralization);
}
