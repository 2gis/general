import { generalize } from '../src/worker/generalize';
import { pack, stride } from '../src/markerArray';
import { Marker } from '../src';
import { latLngToMapPoint, mapPointToZoomPoint, lngLatToZoomPoint, getMean, getDeviation } from './utils';

interface ApiMarker {
    lon: number;
    lat: number;
    is_advertising: boolean;
}

function now() {
    const hrtime = process.hrtime();
    return (hrtime[0] + hrtime[1] / 1e9) * 1000;
}

const search1 = require('../demo/search1.json');
const search2 = require('../demo/search1.json');
const markersData: ApiMarker[] = [
    ...search1.result.items,
    ...search2.result.items,
];
const sprites = [{
        position: [2, 2],
        size: [28, 42],
        anchor: [0.5, 1],
        pixelDensity: 1,
    }, {
        position: [34, 2],
        size: [22, 30],
        anchor: [0.5, 1],
        pixelDensity: 1,
    }, {
        position: [60, 2],
        size: [10, 10],
        anchor: [0.5, 0.5],
        pixelDensity: 1,
    },
];
const priorityGroups = [{
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

const center = [37.6206207275390, 55.75088330688495];
const zoom = 11;
const size = [1920, 1024];
const retinaFactor = 1;

const markers: Marker[] = [];
for (let i = 0; i < markersData.length; i++) {
    const markerData = markersData[i];
    const mapPoint = latLngToMapPoint([markerData.lon, markerData.lat]);
    const marker: Marker = {
        groupIndex: markersData[i].is_advertising ? 0 : 1,
        iconIndex: -1,
        pixelPosition: mapPointToZoomPoint(mapPoint, zoom),
    };
    markers.push(marker);
}
const pixelCenter = lngLatToZoomPoint([center[0], center[1]], zoom);

const bounds = {
    minX: pixelCenter[0] - 1.5 * size[0] * retinaFactor,
    minY: pixelCenter[1] - 1.5 * size[1] * retinaFactor,
    maxX: pixelCenter[0] + 1.5 * size[0] * retinaFactor,
    maxY: pixelCenter[1] + 1.5 * size[1] * retinaFactor,
};

const markerArray = new Float32Array(markers.length * stride);

const times: number[] = [];

const count = 1000;
const warmupCount = 10;
const totalCount = count + warmupCount;

for (let i = 0; i < totalCount; i++) {
    pack(markerArray, markers);

    const msg = {
        bounds,
        pixelRatio: retinaFactor,
        priorityGroups,
        sprites,
        markerCount: markers.length,
        markers: markerArray,
    };

    const start = now();
    generalize(msg);
    if (i > warmupCount) {
        times.push(now() - start);
    }
}

// tslint:disable-next-line
console.log(`
Count: ${count}
Mean: ${getMean(times)}
Deviation: ${getDeviation(times)}
`);
