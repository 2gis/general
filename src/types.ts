export type Vec2 = [number, number] | Float64Array;

export interface Sprite {
    size: Vec2;
    anchor: Vec2;
    pixelDensity: number;
}

export interface Atlas {
    sprites: Sprite[];
}

export type LngLat = Vec2;

export interface Marker {
    position: LngLat;
    pixelPosition: Vec2;
    groupIndex: number;

    iconIndex?: number; // Индекс спрайта в атласе, добавляется в ходе генерализации
    prevGroupIndex?: number;
}

export interface PriorityGroup {
    iconIndex: number; // Индекс спрайта в атласе
    safeZone: number; // Отступ чтобы встать
    margin: number; // Отступ после того как встал
    degradation: number; // Отступ для области в которой все остальные маркера будут деградировать
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
