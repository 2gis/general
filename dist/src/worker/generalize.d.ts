import { BBox, Vec2, WorkerMessage } from '../types';
export declare function generalize(data: WorkerMessage): void;
/**
 * Проверяет, пересекает ли область что-либо в плоскости
 *
 * @param arr Плоскость
 * @param width Ширина плоскости
 * @param bbox Проверяемая область
 */
declare function collide(arr: Uint8Array, width: number, bbox: BBox): boolean;
/**
 * Закрашиваем переданную область на плоскости
 *
 * @param arr Плоскость
 * @param width Ширина плоскости
 * @param bbox Закрашиваемая область
 */
declare function putToArray(arr: Uint8Array, width: number, bbox: BBox): void;
declare function bboxIsEmpty(a: BBox): boolean;
declare function createBBox(dst: BBox, planeWidth: number, planeHeight: number, size: Vec2, anchor: Vec2, positionX: number, positionY: number, offset: number): void;
export declare const testHandlers: {
    collide: typeof collide;
    putToArray: typeof putToArray;
    bboxIsEmpty: typeof bboxIsEmpty;
    createBBox: typeof createBBox;
    generalize: typeof generalize;
};
export {};
