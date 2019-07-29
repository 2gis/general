import { Marker } from './types';

let i = 0;
export const offsets = {
    markerIndex: i++,
    offsetX: i++,
    offsetY: i++,
    width: i++,
    height: i++,
    display: i++,
};

export const stride = i;

/**
 * Запаковывает переданный массив маркеров в типизированный массив для быстрой передачи в воркер
 */
export function pack(labelArray: Float32Array, markers: Marker[], devicePixelRatio: number) {
    let labelOffset = 0;

    for (let i = 0; i < markers.length; i++) {
        const label = markers[i].htmlLabel;

        if (label === undefined) {
            continue;
        }

        labelArray[labelOffset + offsets.markerIndex] = i;
        labelArray[labelOffset + offsets.offsetX] = label.offset[0] * devicePixelRatio;
        labelArray[labelOffset + offsets.offsetY] = label.offset[1] * devicePixelRatio;
        labelArray[labelOffset + offsets.width] = label.width * devicePixelRatio;
        labelArray[labelOffset + offsets.height] = label.height * devicePixelRatio;
        labelArray[labelOffset + offsets.display] = label.display ? 1 : 0;

        labelOffset += stride;
    }
}

/**
 * Вынимает значения из запакованного типизированного массива в массив маркеров
 */
export function unpack(markers: Marker[], labelArray: Float32Array) {
    let labelOffset = 0;

    for (const marker of markers) {
        const {htmlLabel: label} = marker;

        if (label === undefined) {
            continue;
        }

        label.display = labelArray[labelOffset + offsets.display] === 1;

        labelOffset += stride;
    }
}
