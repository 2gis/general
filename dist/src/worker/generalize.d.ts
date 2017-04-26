import { BBox, Vec2, WorkerMessage } from '../types';
export declare function generalize(data: WorkerMessage): void;
export declare const testHandlers: {
    collide: (arr: Uint8Array, width: number, bbox: BBox) => boolean;
    putToArray: (arr: Uint8Array, width: number, bbox: BBox) => void;
    isNaN: (a: any) => boolean;
    bboxIsEmpty: (a: BBox) => boolean;
    createBBox: (dst: BBox, width: number, height: number, pixelRatio: number, size: Vec2, anchor: Vec2, pixelDensity: number, positionX: number, positionY: number, offset: number) => void;
};
