import * as rbush from 'rbush';

export interface Sprite {
    size: [number, number];
    anchor: [number, number];
}

export interface Atlas {
    sprites: Sprite[];
}

export type BBox = rbush.BBox;

export type LngLat = [number, number];

export interface Marker {
    position: LngLat;
    pixelPosition: [number, number];
    groupIndex: number;

    iconIndex?: number; // Индекс спрайта в атласе, добавляется в ходе генерализации
    drawingOffsets?: number[];
    groupIndexAfterGenerelize?: number;
}

export interface PriorityGroup {
    iconIndex: number; // Индекс спрайта в атласе
    safeZone: number; // Отступ чтобы встать
    margin: number; // Отступ после того как встал
}

export function generalize(
    bounds: BBox,
    retinaFactor: number,
    priorityGroups: PriorityGroup[],
    atlas: Atlas,
    markers: Marker[],
): Marker[] {
    const tree = rbush();

    for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        if (marker.groupIndexAfterGenerelize !== undefined) {
            const { iconIndex, margin } = priorityGroups[marker.groupIndexAfterGenerelize];
            const sprite = atlas.sprites[iconIndex];
            const insertBBox = createBBox(retinaFactor, sprite, marker, margin);
            tree.insert(insertBBox);
        }
    }

    for (let i = 0; i < priorityGroups.length; i++) {
        const group = priorityGroups[i];
        const { safeZone, iconIndex, margin } = group;
        const sprite = atlas.sprites[iconIndex];

        if (!sprite) {
            // smth shit
            continue;
        }

        for (let j = 0; j < markers.length; j++) {
            const marker = markers[j];
            if (marker.groupIndex > i || marker.iconIndex !== -1) {
                continue;
            }

            const collideBBox = createBBox(retinaFactor, sprite, marker, safeZone);

            if (!bboxIntersect(bounds, collideBBox)) {
                continue;
            }

            if (!tree.collides(collideBBox)) {
                const insertBBox = createBBox(retinaFactor, sprite, marker, margin);
                tree.insert(insertBBox);
                marker.iconIndex = iconIndex;
                marker.groupIndexAfterGenerelize = i;
            }
        }
    }

    return markers;
}

function bboxIntersect(a: BBox, b: BBox): boolean {
    return b.maxX >= a.minX && b.minX <= a.maxX &&
        b.maxY >= a.minY && b.minY <= a.maxY;
}

function createBBox(
    retinaFactor: number,
    sprite: Sprite,
    marker: Marker,
    offset: number = 0,
): rbush.BBox {
    const position = marker.pixelPosition;
    const { size, anchor } = sprite;

    const x1 = position[0] - size[0] * anchor[0] / retinaFactor - offset;
    const y1 = position[1] - size[1] * anchor[1] / retinaFactor - offset;

    const x2 = position[0] + size[0] * (1 - anchor[0]) / retinaFactor + offset;
    const y2 = position[1] + size[1] * (1 - anchor[1]) / retinaFactor + offset;

    const bbox: rbush.BBox = {
        minX: x1,
        minY: y1,
        maxX: x2,
        maxY: y2,
    };

    return bbox;
}
