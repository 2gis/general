export type Vec2 = [number, number] | Float64Array | number[];

export interface Sprite {
    size: Vec2; // Размер иконки
    anchor: Vec2; // Центр иконки относительно ее размеров, принимает занчения от 0 до 1
    pixelDensity: number; // Плотность частиц иконки, так для иконки, предназначенной для ретины, нужно ставить 2
}

export interface Atlas {
    sprites: Sprite[];
}

export interface Marker {
    pixelPosition: Vec2; // позиция маркера в пикселях
    groupIndex: number; // Индекс в массиве групп, к которой маркер будет изначально принадлежать

    iconIndex?: number; // Индекс спрайта в атласе, добавляется в ходе генерализации
    prevGroupIndex?: number; // Параметр выставляемый после генерализации, нужен, чтобы не считать старые маркера
}

export interface PriorityGroup {
    iconIndex: number; // Индекс иконки в атласе, которая будет установлена маркеру, попавшему в эту группу
    safeZone: number; // Отступ чтобы встать
    margin: number; // Отступ после того как встал
    degradation: number; // Отступ для области в которой все остальные маркера будут деградировать в следующую группу
}

export interface BBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export interface JobMessage {
    bounds: BBox;
    pixelRatio: number;
    priorityGroups: PriorityGroup[];
    sprites: Sprite[];
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
    message: JobMessage;
    markers: Marker[];
    resolve: () => void;
}
