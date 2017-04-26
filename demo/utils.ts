import { Atlas } from '@2gis/markerdrawer';

const R = 6378137;
const MAX_LATITUDE = 85.0511287798;

export function lngLatToZoomPoint(lngLat: [number, number], zoom: number) {
    return mapPointToZoomPoint(latLngToMapPoint(lngLat), zoom);
}

export function mapPointToZoomPoint(point: [number, number], zoom): [number, number] {
    const scale = 256 * Math.pow(2, zoom);
    const k = 0.5 / (Math.PI * R);
    return [
        scale * (k * point[0] + 0.5),
        scale * (-k * point[1] + 0.5),
    ];
}

export function latLngToMapPoint(lngLat: [number, number]): [number, number] {
    const d = Math.PI / 180;
    const lat = Math.max(Math.min(MAX_LATITUDE, lngLat[1]), -MAX_LATITUDE);
    const sin = Math.sin(lat * d);
    return [
        R * lngLat[0] * d,
        R * Math.log((1 + sin) / (1 - sin)) / 2,
    ];
}

export interface ApiMarker {
    lon: number;
    lat: number;
    is_advertising: boolean;
}

export function loadMarkersData(): Promise<ApiMarker[]> {
    const m1 = fetch('./demo/search1.json')
        .then((res) => res.json())
        .then((data: any) => data.result.items as ApiMarker[]);

    const m2 = fetch('./demo/search2.json')
        .then((res) => res.json())
        .then((data: any) => data.result.items as ApiMarker[]);

    return Promise.all([m1, m2])
        .then(([m1, m2]) => m1.concat(m2));
}

export function loadAtlas(): Promise<Atlas> {
    const pixelRatio = window.devicePixelRatio > 1 ? 2 : 1;
    const m0 = new Image();
    m0.src = 'demo/markers/' + pixelRatio + '/pin_commercial.png';

    const m1 = new Image();
    m1.src = 'demo/markers/' + pixelRatio + '/pin_regular.png';

    const m2 = new Image();
    m2.src = 'demo/markers/' + pixelRatio + '/pin_tile.png';

    const atlas = new Atlas([{
        image: m0,
        anchor: [0.5, 1],
        pixelDensity: pixelRatio,
    }, {
        image: m1,
        anchor: [0.5, 1],
        pixelDensity: pixelRatio,
    }, {
        image: m2,
        anchor: [0.5, 0.5],
        pixelDensity: pixelRatio,
    }]);

    return atlas.whenReady().then(() => atlas);
}
