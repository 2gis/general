import * as markerArray from './markerArray';
import * as labelArray from './labelArray';
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
    private labelArray: Float32Array;

    constructor() {
        this.worker = work(require.resolve('./worker'));
        this.queue = [];
        this.currentJob = undefined;
        this.markerArray = new Float32Array(1000 * markerArray.stride);
        this.labelArray = new Float32Array(1000 * labelArray.stride);

        this.worker.onmessage = (event) => {
            if (this.currentJob === undefined) {
                return;
            }

            const { markers, resolve } = this.currentJob;
            const { data } = event;

            markerArray.unpack(markers, data.markerArray);
            labelArray.unpack(markers, data.labelArray);

            this.markerArray = data.markerArray;
            this.labelArray = data.labelArray;

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

        const markerCount = markers.length;
        const labelCount = markers.filter((marker) => marker.htmlLabel !== undefined).length;

        return new Promise((resolve) => {
            this.queue.push({ message, markers, resolve, markerCount, labelCount });
            this.dequeue();
        });
    }

    public clear() {
        this.queue = [];
    }

    private pack(markers: Marker[], markerCount: number, labelCount: number): void {
        if (markerCount * markerArray.stride > this.markerArray.length) {
            this.markerArray = new Float32Array(markerCount * markerArray.stride);
        }

        if (labelCount * labelArray.stride > this.labelArray.length) {
            this.labelArray = new Float32Array(labelCount * labelArray.stride);
        }

        markerArray.pack(this.markerArray, markers);
        labelArray.pack(this.labelArray, markers);
    }

    private dequeue() {
        if (this.currentJob !== undefined) {
            return;
        }

        const job = this.queue.shift();

        if (job === undefined) {
            return;
        }

        this.pack(job.markers, job.markerCount, job.labelCount);

        const message = job.message as WorkerMessage;
        message.markers = this.markerArray;
        message.markerCount = job.markerCount;
        message.labels = this.labelArray;
        message.labelCount = job.labelCount;

        this.worker.postMessage(message, [message.markers.buffer, message.labels.buffer]);

        this.currentJob = job;
    }
}
