import { BBox, PriorityGroup, Atlas, Marker } from './types';
export declare class General {
    private worker;
    private queue;
    private currentJob;
    private markerArray;
    constructor();
    generalize(bounds: BBox, pixelRatio: number, priorityGroups: PriorityGroup[], atlas: Atlas, markers: Marker[]): Promise<{}>;
    clear(): void;
    private pack(markers);
    private dequeue();
    private recordResult(markers, workerMessage);
}
