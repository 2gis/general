import { stride, offsets } from './markerArray';
import {
    BBox,
    PriorityGroup,
    Atlas,
    Marker,
    WorkerMessage,
    Job,
    JobMessage,
} from './types';
import work from 'webworkify-webpack';

export class General {
    private worker: Worker;
    private queue: Job[];
    private currentJob: Job | undefined;
    private markerArray: Float32Array;

    constructor() {
        this.worker = work(require.resolve('./worker'));
        this.queue = [];
        this.currentJob = undefined;
        this.markerArray = new Float32Array(1000 * stride);

        this.worker.onmessage = (event) => {
            if (this.currentJob === undefined) {
                return;
            }

            const { markers, resolve } = this.currentJob;
            this.recordResult(markers, event.data);
            this.markerArray = event.data;
            this.currentJob = undefined;

            this.dequeue();
            resolve();
        };
    }

    public generalize(
        bounds: BBox,
        pixelRatio: number,
        priorityGroups: PriorityGroup[],
        atlas: Atlas,
        markers: Marker[],
    ): Promise<{}> {
        const message: JobMessage = {
            bounds,
            pixelRatio,
            priorityGroups,
            sprites: atlas.sprites,
        };

        return new Promise((resolve) => {
            this.queue.push({ message, markers, resolve });
            this.dequeue();
        });
    }

    public clear() {
        this.queue = [];
    }

    /**
     * Запаковывает переданный массив маркеров в типизированный массив для быстрой передачи в воркер
     */
    private pack(markers: Marker[]) {
        if (markers.length * stride > this.markerArray.length) {
            this.markerArray = new Float32Array(markers.length * stride);
        }

        const markerArray = this.markerArray;

        for (let i = 0, markerOffset = 0; i < markers.length; i++, markerOffset = markerOffset + stride) {
            const marker = markers[i];

            const iconIndex = marker.iconIndex;
            const prevGroupIndex = marker.prevGroupIndex;

            this.markerArray[markerOffset + offsets.pixelPositionX] = marker.pixelPosition[0];
            this.markerArray[markerOffset + offsets.pixelPositionY] = marker.pixelPosition[1];
            markerArray[markerOffset + offsets.groupIndex] = marker.groupIndex;
            markerArray[markerOffset + offsets.iconIndex] =
                iconIndex !== undefined ? iconIndex : NaN;
            markerArray[markerOffset + offsets.prevGroupIndex] =
                prevGroupIndex !== undefined ? prevGroupIndex : NaN;
        }
    }

    private dequeue() {
        if (this.currentJob !== undefined) {
            return;
        }

        const job = this.queue.shift();

        if (job === undefined) {
            return;
        }

        this.pack(job.markers);

        const message = job.message as WorkerMessage;
        message.markers = this.markerArray;
        message.markerCount = job.markers.length;

        this.worker.postMessage(message, [message.markers.buffer]);

        this.currentJob = job;
    }

    /**
     * Вынимает значения из запакованного типизированного массива в массив маркеров
     */
    private recordResult(markers: Marker[], workerMessage: Float32Array) {
        for (let i = 0, markerOffset = 0; i < markers.length; i++, markerOffset = markerOffset + stride) {
            const iconIndex = workerMessage[markerOffset + offsets.iconIndex];
            const prevGroupIndex = workerMessage[markerOffset + offsets.prevGroupIndex];

            markers[i].iconIndex =
                iconIndex !== iconIndex ? undefined : iconIndex;
            markers[i].prevGroupIndex =
                prevGroupIndex !== prevGroupIndex ? undefined : prevGroupIndex;
        }
    }
}
