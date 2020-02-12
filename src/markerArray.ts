import { Marker } from './types';

// Оффсеты должны быть пронумерованы по порядку
export const offsets = {
    pixelPositionX: 0,
    pixelPositionY: 1,
    groupIndex: 2,
    iconIndex: 3,
};

export const stride = Object.keys(offsets).length;

/**
 * Запаковывает переданный массив маркеров в типизированный массив для быстрой передачи в воркер
 */
export function pack(markerArray: Float32Array, markers: Marker[]) {
    for (let i = 0, markerOffset = 0; i < markers.length; i++, markerOffset += stride) {
        const marker = markers[i];

        markerArray[markerOffset + offsets.pixelPositionX] = marker.pixelPosition[0];
        markerArray[markerOffset + offsets.pixelPositionY] = marker.pixelPosition[1];
        markerArray[markerOffset + offsets.groupIndex] = marker.groupIndex;
        markerArray[markerOffset + offsets.iconIndex] = marker.iconIndex;
    }
}

/**
 * Вынимает значения из запакованного типизированного массива в массив маркеров
 */
export function unpack(markers: Marker[], markerArray: Float32Array) {
    for (let i = 0, markerOffset = 0; i < markers.length; i++, markerOffset += stride) {
        markers[i].iconIndex = markerArray[markerOffset + offsets.iconIndex];
    }
}
