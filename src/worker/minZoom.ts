import { LabelBBox } from '../types';

interface Interval {
    min: number;
    max: number;
}

const intersectionRangeX: Interval = { min: -Infinity, max: Infinity };
const intersectionRangeY: Interval = { min: -Infinity, max: Infinity };
const intersectionRange: Interval = { min: -Infinity, max: Infinity };

const intersectionRangeLimit: Interval = { min: 0, max: Infinity };

function calcIntersectionRange(
    dest: Interval,
    min1: number,
    max1: number,
    min2: number,
    max2: number,
    d0: number,
): void {
    const min = d0 > 0 ? min1 - max2 : min2 - max1;
    const max = d0 > 0 ? max1 - min2 : max2 - min1;

    dest.min = min / Math.abs(d0);
    dest.max = max / Math.abs(d0);
}

function intersect(
    dest: Interval,
    interval1: Interval,
    interval2: Interval,
    interval3: Interval,
): void {
    dest.min = Math.max(interval1.min, interval2.min, interval3.min);
    dest.max = Math.min(interval1.max, interval2.max, interval3.max);
}

export function getIntersectionZoom(
    bbox1: LabelBBox,
    bbox2: LabelBBox,
    currentZoom: number,
): number {
    const dx = bbox2.anchorX - bbox1.anchorX;
    const dy = bbox2.anchorY - bbox1.anchorY;

    calcIntersectionRange(
        intersectionRangeX,
        bbox1.minX,
        bbox1.maxX,
        bbox2.minX,
        bbox2.maxX,
        dx,
    );

    calcIntersectionRange(
        intersectionRangeY,
        bbox1.minY,
        bbox1.maxY,
        bbox2.minY,
        bbox2.maxY,
        dy,
    );

    intersect(
        intersectionRange,
        intersectionRangeX,
        intersectionRangeY,
        intersectionRangeLimit,
    );

    if (intersectionRange.min >= intersectionRange.max) {
        return -Infinity;
    }

    return currentZoom + Math.log(intersectionRange.max) / Math.log(2);
}
