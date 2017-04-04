import { BBox, Vec2, WorkerMessage } from './types';
import { stride, offsets } from './markerArray';

declare const postMessage: (message: any, transfer?: any[]) => void;

const iconIndexOffset = offsets['iconIndex'];
const groupIndexOffset = offsets['groupIndex'];
const prevGroupIndexOffset = offsets['prevGroupIndex'];
const pixelPositionXOffset = offsets['pixelPositionX'];
const pixelPositionYOffset = offsets['pixelPositionY'];

const collideBBox: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
const marginBBox: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
const degradationBBox: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

onmessage = (event) => {
    const data: WorkerMessage = event.data;
    const { bounds, retinaFactor, priorityGroups, sprites, markers, markerCount } = data;

    const width = (bounds.maxX - bounds.minX >> 3) + 1 << 3; // Ширина должна быть кратна 8
    const height = bounds.maxY - bounds.minY;

    const planeLength = width * height + 8 >> 3;
    const currentDegradationPlane = new Uint8Array(planeLength);
    const degradationPlane = new Uint8Array(planeLength);
    const plane = new Uint8Array(planeLength);

    for (let i = 0; i < markerCount; i++) {
        const prevGroupIndex = markers[i * stride + prevGroupIndexOffset];
        const pixelPositionX = markers[i * stride + pixelPositionXOffset];
        const pixelPositionY = markers[i * stride + pixelPositionYOffset];

        if (prevGroupIndex === prevGroupIndex) {
            const { iconIndex, margin, degradation } = priorityGroups[prevGroupIndex];
            const sprite = sprites[iconIndex];

            if (!sprite) {
                // smth shit
                continue;
            }

            const { size, anchor } = sprite;
            createBBox(marginBBox, width, height, retinaFactor, size, anchor,
                pixelPositionX, pixelPositionY, margin);
            createBBox(degradationBBox, width, height, retinaFactor, size, anchor,
                pixelPositionX, pixelPositionY, degradation);

            putToArray(plane, width, marginBBox);
            putToArray(degradationPlane, width, degradationBBox);
        }
    }

    for (let i = 0; i < priorityGroups.length; i++) {
        const group = priorityGroups[i];
        const { safeZone, iconIndex, margin, degradation } = group;
        const sprite = sprites[iconIndex];

        if (!sprite) {
            // smth shit
            continue;
        }

        const { size, anchor } = sprite;
        currentDegradationPlane.set(degradationPlane);

        for (let j = 0; j < markerCount; j++) {
            const markerOffset = j * stride;

            const groupIndex = markers[markerOffset + groupIndexOffset];
            const markerIconIndex = markers[markerOffset + iconIndexOffset];
            const pixelPositionX = markers[markerOffset + pixelPositionXOffset];
            const pixelPositionY = markers[markerOffset + pixelPositionYOffset];

            if (groupIndex > i || markerIconIndex !== -1) {
                continue;
            }

            createBBox(marginBBox, width, height, retinaFactor, size, anchor,
                pixelPositionX, pixelPositionY, margin);
            if (bboxIsEmpty(marginBBox) ||
                (groupIndex === i && collide(currentDegradationPlane, width, marginBBox))
            ) {
                continue;
            }

            createBBox(collideBBox, width, height, retinaFactor, size, anchor,
                pixelPositionX, pixelPositionY, safeZone);
            if (bboxIsEmpty(collideBBox)) {
                continue;
            }

            if (!collide(plane, width, collideBBox)) {
                createBBox(degradationBBox, width, height, retinaFactor, size, anchor,
                    pixelPositionX, pixelPositionY, degradation);

                putToArray(plane, width, marginBBox);
                putToArray(degradationPlane, width, degradationBBox);

                markers[markerOffset + iconIndexOffset] = iconIndex;
                markers[markerOffset + prevGroupIndexOffset] = i;
            }
        }
    }

    postMessage(markers);
};

function collide(arr: Uint8Array, width: number, bbox: BBox): boolean {
    const x1 = bbox.minX;
    const y1 = bbox.minY;
    const x2 = bbox.maxX;
    const y2 = bbox.maxY;

    for (let j = y1; j < y2; j++) {
        const start = j * width + x1 >> 3;
        const end = j * width + x2 >> 3;
        let sum = 0;

        if (start === end) {
            sum = arr[start] & (255 >> (x1 & 7) & 255 << (8 - (x2 & 7)));
        } else {
            sum = arr[start] & (255 >> (x1 & 7));
            for (let i = start + 1; i < end; i++) {
                sum = arr[i] | sum;
            }
            sum = arr[end] & (255 << (8 - (x2 & 7))) | sum;
        }

        if (sum !== 0) {
            return true;
        }
    }

    return false;
}

function putToArray(arr: Uint8Array, width: number, bbox: BBox) {
    const x1 = bbox.minX;
    const y1 = bbox.minY;
    const x2 = bbox.maxX;
    const y2 = bbox.maxY;

    for (let j = y1; j < y2; j++) {
        const start = j * width + x1 >> 3;
        const end = j * width + x2 >> 3;

        if (start === end) {
            arr[start] = arr[start] | (255 >> (x1 & 7) & 255 << (8 - (x2 & 7)));
        } else {
            arr[start] = arr[start] | (255 >> (x1 & 7));
            for (let i = start + 1; i < end; i++) {
                arr[i] = 255;
            }
            arr[end] = arr[end] | (255 << (8 - (x2 & 7)));
        }
    }
}

function bboxIsEmpty(a: BBox): boolean {
    return a.minX === a.maxX || a.minY === a.maxY;
}

function createBBox(
    dst: BBox,
    width: number,
    height: number,
    retinaFactor: number,
    size: Vec2,
    anchor: Vec2,
    positionX: number,
    positionY: number,
    offset: number,
): void {
    const x1 = positionX - size[0] * anchor[0] / retinaFactor - offset | 0;
    const y1 = positionY - size[1] * anchor[1] / retinaFactor - offset | 0;

    const x2 = positionX + size[0] * (1 - anchor[0]) / retinaFactor + offset | 0;
    const y2 = positionY + size[1] * (1 - anchor[1]) / retinaFactor + offset | 0;

    dst.minX = x1 > 0 ? (x1 < width ? x1 : width) : 0;
    dst.minY = y1 > 0 ? (y1 < height ? y1 : height) : 0;
    dst.maxX = x2 > 0 ? (x2 < width ? x2 : width) : 0;
    dst.maxY = y2 > 0 ? (y2 < height ? y2 : height) : 0;
}
