export declare type Vec2 = [number, number] | Float64Array;
export interface Sprite {
    size: Vec2;
    anchor: Vec2;
    pixelDensity: number;
}
export interface Atlas {
    sprites: Sprite[];
}
export interface Marker {
    pixelPosition: Vec2;
    groupIndex: number;
    iconIndex?: number;
    prevGroupIndex?: number;
}
export interface PriorityGroup {
    iconIndex: number;
    safeZone: number;
    margin: number;
    degradation: number;
}
export interface BBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export interface WorkerMessage {
    bounds: BBox;
    pixelRatio: number;
    priorityGroups: PriorityGroup[];
    sprites: Sprite[];
    markerCount: number;
    markers: Float32Array;
}
export interface Job {
    message: WorkerMessage;
    markers: Marker[];
    resolve: () => void;
}
