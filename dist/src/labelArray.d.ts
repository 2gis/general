import { Marker } from './types';
export declare const offsets: {
    markerIndex: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    display: number;
    minZoom: number;
};
export declare const stride: number;
/**
 * Запаковывает переданный массив маркеров в типизированный массив для быстрой передачи в воркер
 */
export declare function pack(labelArray: Float32Array, markers: Marker[], devicePixelRatio: number): void;
/**
 * Вынимает значения из запакованного типизированного массива в массив маркеров
 */
export declare function unpack(markers: Marker[], labelArray: Float32Array): void;
