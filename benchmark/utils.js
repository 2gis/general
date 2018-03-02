const R = 6378137;
const MAX_LATITUDE = 85.0511287798;

function lngLatToZoomPoint(lngLat, zoom) {
    return mapPointToZoomPoint(latLngToMapPoint(lngLat), zoom);
}

function mapPointToZoomPoint(point, zoom) {
    const scale = 256 * Math.pow(2, zoom);
    const k = 0.5 / (Math.PI * R);
    return [
        scale * (k * point[0] + 0.5),
        scale * (-k * point[1] + 0.5),
    ];
}

function latLngToMapPoint(lngLat) {
    const d = Math.PI / 180;
    const lat = Math.max(Math.min(MAX_LATITUDE, lngLat[1]), -MAX_LATITUDE);
    const sin = Math.sin(lat * d);
    return [
        R * lngLat[0] * d,
        R * Math.log((1 + sin) / (1 - sin)) / 2,
    ];
}

function getMean(sample) {
    let mean = sample[0];

    for (let i = 1; i < sample.length; i++) {
        mean += sample[i];
    }

    mean /= sample.length;

    return mean;
}

function getDeviation(sample) {
    const mean = getMean(sample);
    let dispersion = 0;

    for (let i = 0; i < sample.length; i++) {
        dispersion += Math.pow(sample[i] - mean, 2);
    }

    return dispersion / sample.length;
}

module.exports = {
    lngLatToZoomPoint,
    mapPointToZoomPoint,
    latLngToMapPoint,
    getMean,
    getDeviation,
};
