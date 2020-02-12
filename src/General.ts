import { stride, pack, unpack } from './markerArray';
import {
    BBox,
    PriorityGroup,
    Sprite,
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
            unpack(markers, event.data);
            this.markerArray = event.data;
            this.currentJob = undefined;

            this.dequeue();
            resolve();
        };
    }

    public generalize(
        bounds: BBox,
        priorityGroups: PriorityGroup[],
        sprites: Sprite[],
        markers: Marker[],
    ): Promise<void> {
        const message: JobMessage = {
            bounds,
            priorityGroups,
            sprites,
        };

        return new Promise((resolve) => {
            this.queue.push({ message, markers, resolve });
            this.dequeue();
        });
    }

    public clear() {
        this.queue = [];
    }

    private pack(markers: Marker[]) {
        if (markers.length * stride > this.markerArray.length) {
            this.markerArray = new Float32Array(markers.length * stride);
        }

        pack(this.markerArray, markers);
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
}
