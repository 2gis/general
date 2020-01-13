import { BBox, PriorityGroup, Sprite, Marker } from './types';
export declare class General {
    private worker;
    private queue;
    private currentJob;
    private markerArray;
    private labelArray;
    constructor();
    generalize(bounds: BBox, priorityGroups: PriorityGroup[], sprites: Sprite[], markers: Marker[], currentZoom: number): Promise<void>;
    clear(): void;
    private pack;
    private dequeue;
}
