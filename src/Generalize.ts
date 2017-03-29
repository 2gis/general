export type Vec2 = [number, number];

export interface Sprite {
    size: Vec2;
    anchor: Vec2;
}

export interface Atlas {
    sprites: Sprite[];
}

export type LngLat = Vec2;

export interface Marker {
    position: LngLat;
    pixelPosition: Vec2;
    groupIndex: number;

    iconIndex?: number; // Индекс спрайта в атласе, добавляется в ходе генерализации
    groupIndexAfterGenerelize?: number;
}

export interface PriorityGroup {
    iconIndex: number; // Индекс спрайта в атласе
    safeZone: number; // Отступ чтобы встать
    margin: number; // Отступ после того как встал
    degradation: number; // Отступ для области в которой все остальные маркера будут деградировать
}

export interface BBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export function generalize(
    bounds: BBox,
    retinaFactor: number,
    priorityGroups: PriorityGroup[],
    atlas: Atlas,
    markers: Marker[],
): Marker[] {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    const degradationPlane = new Uint8Array(width * height + 8 >> 3);
    const plane = new Uint8Array(width * height + 8 >> 3);

    for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        if (marker.groupIndexAfterGenerelize !== undefined) {
            const { iconIndex, margin } = priorityGroups[marker.groupIndexAfterGenerelize];
            const sprite = atlas.sprites[iconIndex];

            if (!sprite) {
                // smth shit
                continue;
            }

            const { size, anchor } = sprite;
            const insertBBox = createBBox(width, height, retinaFactor, size, anchor, marker.pixelPosition, margin);
            putToArray(plane, width, insertBBox);
        }
    }

    for (let i = 0; i < priorityGroups.length; i++) {
        const group = priorityGroups[i];
        const { safeZone, iconIndex, margin, degradation } = group;
        const sprite = atlas.sprites[iconIndex];

        if (!sprite) {
            // smth shit
            continue;
        }

        const { size, anchor } = sprite;

        for (let j = 0; j < markers.length; j++) {
            const marker = markers[j];
            if (marker.groupIndex > i || marker.iconIndex !== -1) {
                continue;
            }

            const collideBBox = createBBox(width, height, retinaFactor, size, anchor, marker.pixelPosition, safeZone);

            if (bboxIsEmpty(collideBBox) ||
                (marker.groupIndex === i && collide(degradationPlane, width, collideBBox))
            ) {
                continue;
            }

            if (!collide(plane, width, collideBBox)) {
                const marginBBox = createBBox(width, height, retinaFactor, size, anchor, marker.pixelPosition, margin);
                if (bboxIsEmpty(marginBBox)) {
                    continue;
                }
                const degradationBBox = createBBox(width, height, retinaFactor, size, anchor,
                    marker.pixelPosition, degradation);

                putToArray(plane, width, marginBBox);
                putToArray(degradationPlane, width, degradationBBox);
                marker.iconIndex = iconIndex;
                marker.groupIndexAfterGenerelize = i;
            }
        }
    }

    return markers;
}

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
    width: number,
    height: number,
    retinaFactor: number,
    size: Vec2,
    anchor: Vec2,
    position: Vec2,
    offset: number,
): BBox {
    const x1 = position[0] - size[0] * anchor[0] / retinaFactor - offset | 0;
    const y1 = position[1] - size[1] * anchor[1] / retinaFactor - offset | 0;

    const x2 = position[0] + size[0] * (1 - anchor[0]) / retinaFactor + offset | 0;
    const y2 = position[1] + size[1] * (1 - anchor[1]) / retinaFactor + offset | 0;

    const bbox: BBox = {
        minX: x1 > 0 ? (x1 < width ? x1 : width) : 0,
        minY: y1 > 0 ? (y1 < height ? y1 : height) : 0,
        maxX: x2 > 0 ? (x2 < width ? x2 : width) : 0,
        maxY: y2 > 0 ? (y2 < height ? y2 : height) : 0,
    };

    return bbox;
}
