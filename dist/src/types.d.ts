export declare type Vec2 = [number, number] | Float64Array | number[];
export interface Sprite {
    /** Размер иконки */
    size: Vec2;
    /** Центр иконки относительно ее размеров, принимает значения от 0 до 1 */
    anchor: Vec2;
}
export interface Marker {
    /** Позиция маркера в пикселях */
    pixelPosition: Vec2;
    /** Индекс в массиве групп, к которой маркер будет изначально принадлежать */
    groupIndex: number;
    /** Индекс спрайта в атласе, добавляется в ходе генерализации */
    iconIndex: number;
    /** Опциональный флаг, указывающий приоритетность маркера */
    priority?: boolean;
    /** Подпись маркера */
    htmlLabel?: Label;
}
export interface Label {
    offset: Vec2;
    width: number;
    height: number;
    display: boolean;
    minZoom: number;
}
export interface PriorityGroup {
    /** Индекс иконки в атласе, которая будет установлена маркеру, попавшему в эту группу */
    iconIndex: number;
    /** Отступ чтобы встать */
    safeZone: number;
    /** Отступ после того как встал */
    margin: number;
    /** Отступ для области в которой все остальные маркера будут деградировать в следующую группу */
    degradation: number;
}
export interface BBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export declare type LabelBBox = BBox & {
    anchorX: number;
    anchorY: number;
    minZoom: number;
};
export interface JobMessage {
    bounds: BBox;
    priorityGroups: PriorityGroup[];
    sprites: Sprite[];
    currentZoom: number;
}
export interface WorkerMessage {
    bounds: BBox;
    priorityGroups: PriorityGroup[];
    sprites: Sprite[];
    markerCount: number;
    markers: Float32Array;
    labelCount: number;
    labels: Float32Array;
    currentZoom: number;
}
export interface Job {
    message: JobMessage;
    markers: Marker[];
    markerCount: number;
    labelCount: number;
    resolve: () => void;
}
