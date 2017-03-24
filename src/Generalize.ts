import * as rbush from 'rbush';

export interface Sprite {
    size: [number, number];
    anchor: [number, number];
}

export interface Atlas {
    sprites: Sprite[];
}

export type LngLat = [number, number];

export interface Marker {
    position: LngLat;
    pixelPosition: [number, number];
    groupIndex: number;

    iconIndex?: number; // Индекс спрайта в атласе, добавляется в ходе генерализации
    drawingOffsets?: number[];
}

export interface PriorityGroup {
    iconIndex: number; // Индекс спрайта в атласе
    safeZone: number; // Отступ чтобы встать
    margin: number; // Отступ после того как встал
}

export function generalize(
    priorityGroups: PriorityGroup[],
    atlas: Atlas,
    markers: Marker[],
): Marker[] {
    const tree = rbush();
    const groups = splitMarkersByGroups(priorityGroups, markers);
    const showedMarkers: Marker[] = [];

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const { safeZone, iconIndex, margin } = priorityGroups[i];
        const sprite = atlas.sprites[iconIndex];

        if (!sprite) {
            // smth shit
            continue;
        }

        for (let j = 0; j < group.length; j++) {
            const marker = group[j];
            const collideBBox = createBBox(sprite, marker, safeZone);

            const isCollide = tree.collides(collideBBox);
            if (!isCollide) {
                const insertBBox = createBBox(sprite, marker, margin);
                tree.insert(insertBBox);
                marker.iconIndex = iconIndex;
                showedMarkers.push(marker);
            } else {
                // Если маркер из текущей группы не смог попасть на экран, то отправляем его вначало следующей
                const nextGroup = groups[i + 1];
                if (nextGroup) {
                    nextGroup.unshift(marker);
                }
            }
        }
    }

    return showedMarkers;
}

function createBBox(
    sprite: Sprite,
    marker: Marker,
    offset: number = 0,
): rbush.BBox {
    const position = marker.pixelPosition;
    const { size, anchor } = sprite;

    const minX = position[0] - size[0] * anchor[0] - offset;
    const minY = position[1] - size[1] * anchor[1] - offset;

    const bbox: rbush.BBox = {
        minX,
        minY,
        maxX: minX + size[0] + offset * 2,
        maxY: minY + size[1] + offset * 2,
    };

    return bbox;
}

function splitMarkersByGroups(priorityGroups: PriorityGroup[], markers: Marker[]): Marker[][] {
    const groups: Marker[][] = [];
    for (let i = 0; i < priorityGroups.length; i++) {
        groups[i] = [];
    }

    for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        const group = groups[marker.groupIndex];
        group.push(marker);
    }

    return groups;
}
