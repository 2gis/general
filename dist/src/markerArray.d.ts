import { Marker } from './types';
export declare const offsets: {
    pixelPositionX: number;
    pixelPositionY: number;
    groupIndex: number;
    iconIndex: number;
    priority: number;
};
export declare const stride: number;
/**
 * Запаковывает переданный массив маркеров в типизированный массив для быстрой передачи в воркер
 */
export declare function pack(markerArray: Float32Array, markers: Marker[]): void;
/**
 * Вынимает значения из запакованного типизированного массива в массив маркеров
 */
export declare function unpack(markers: Marker[], markerArray: Float32Array): void;
