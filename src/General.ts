import { stride, offsets } from './markerArray';
import {
    BBox,
    PriorityGroup,
    Atlas,
    Marker,
    WorkerMessage,
    Job,
} from './types';

const Worker = require('worker-loader?inline&fallback=false!ts-loader!./worker');

export class General {
    private worker = new Worker();
    private queue: Job[] = [];
    private currentJob: Job | undefined = undefined;
    private markerArray = new Float32Array(1000 * stride);

    constructor() {
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
        const message: WorkerMessage = {
            bounds,
            pixelRatio,
            priorityGroups,
            markerCount: markers.length,
            sprites: atlas.sprites,
            markers: this.pack(markers),
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
    private pack(markers: Marker[]): Float32Array {
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

        return markerArray;
    }

    private dequeue() {
        if (this.currentJob !== undefined) {
            return;
        }

        const job = this.queue.shift();

        if (job === undefined) {
            return;
        }

        const message = job.message;
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
    };
}
