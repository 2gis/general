import { stride, offsets } from './markerArray';
import { BBox, PriorityGroup, Atlas, Marker, WorkerMessage, Job } from './types';

const Worker = require('worker-loader?inline&fallback=false!ts-loader!./worker');

const positionXOffset = offsets['positionX'];
const positionYOffset = offsets['positionY'];
const pixelPositionXOffset = offsets['pixelPositionX'];
const pixelPositionYOffset = offsets['pixelPositionY'];
const groupIndexOffset = offsets['groupIndex'];
const iconIndexOffset = offsets['iconIndex'];
const prevGroupIndexOffset = offsets['prevGroupIndex'];

const worker = new Worker();
const queue: Job[] = [];
let currentJob: Job | undefined = undefined;
let markerArray = new Float32Array(1000 * stride);

function pack(markers: Marker[]): Float32Array {
    if (markers.length > markerArray.length) {
        markerArray = new Float32Array(markers.length * stride);
    }

    for (let i = 0, markerOffset = 0; i < markers.length; i++, markerOffset = markerOffset + stride) {
        const marker = markers[i];

        const iconIndex = marker.iconIndex;
        const prevGroupIndex = marker.prevGroupIndex;

        markerArray[markerOffset + positionXOffset] = marker.position[0];
        markerArray[markerOffset + positionYOffset] = marker.position[1];
        markerArray[markerOffset + pixelPositionXOffset] = marker.pixelPosition[0];
        markerArray[markerOffset + pixelPositionYOffset] = marker.pixelPosition[1];
        markerArray[markerOffset + groupIndexOffset] = marker.groupIndex;
        markerArray[markerOffset + iconIndexOffset] =
            iconIndex !== undefined ? iconIndex : NaN;
        markerArray[markerOffset + prevGroupIndexOffset] =
            prevGroupIndex !== undefined ? prevGroupIndex : NaN;
    }

    return markerArray;
}

function dequeue() {
    if (currentJob !== undefined) {
        return;
    }

    const job = queue.shift();

    if (job === undefined) {
        return;
    }

    const message = job.message;
    worker.postMessage(message, [message.markers.buffer]);

    currentJob = job;
}

function recordResult(markers: Marker[], workerMessage: Float32Array) {
    for (let i = 0, markerOffset = 0; i < markers.length; i++, markerOffset = markerOffset + stride) {
        const iconIndex = workerMessage[markerOffset + iconIndexOffset];
        const prevGroupIndex = workerMessage[markerOffset + prevGroupIndexOffset];

        markers[i].iconIndex =
            iconIndex !== iconIndex ? undefined : iconIndex;
        markers[i].prevGroupIndex =
            prevGroupIndex !== prevGroupIndex ? undefined : prevGroupIndex;
    }
};

export function generalize(
    bounds: BBox,
    retinaFactor: number,
    priorityGroups: PriorityGroup[],
    atlas: Atlas,
    markers: Marker[],
): Promise<{}> {
    const message: WorkerMessage = {
        bounds,
        retinaFactor,
        priorityGroups,
        markerCount: markers.length,
        sprites: atlas.sprites,
        markers: pack(markers)
    };

    return new Promise(resolve => {
        queue.push({message, markers, resolve});
        dequeue();

        worker.onmessage = event => {
            if (currentJob === undefined) {
                return;
            }

            const {markers, resolve} = currentJob;

            recordResult(markers, event.data);
            markerArray = event.data;
            currentJob = undefined;

            dequeue();
            resolve();
        };
    });
}
