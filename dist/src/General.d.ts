import { BBox, PriorityGroup, Atlas, Marker } from './types';
export declare class General {
    private worker;
    private queue;
    private currentJob;
    private markerArray;
    constructor();
    generalize(bounds: BBox, pixelRatio: number, priorityGroups: PriorityGroup[], atlas: Atlas, markers: Marker[]): Promise<{}>;
    clear(): void;
    /**
     * Запаковывает переданный массив маркеров в типизированный массив для быстрой передачи в воркер
     */
    private pack(markers);
    private dequeue();
    /**
     * Вынимает значения из запакованного типизированного массива в массив маркеров
     */
    private recordResult(markers, workerMessage);
}
