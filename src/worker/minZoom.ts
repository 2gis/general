import { LabelBBox } from '../types';

interface Interval {
    min: number;
    max: number;
}

const intersectionRangeX: Interval = { min: -Infinity, max: Infinity };
const intersectionRangeY: Interval = { min: -Infinity, max: Infinity };
const intersectionRange: Interval = { min: -Infinity, max: Infinity };

const intersectionRangeLimit: Interval = { min: 0, max: Infinity };

/**
 * Вычисляет зум, на котором лейблинг-боксы bbox1 и bbox2 начинают пересекаться.
 *
 * BBox определяется:
 * 1. Якорем — точкой в координатах экрана
 * 2. Оффсетами от якоря, обозначающими границы бокса в каждую из четырёх сторон от якоря.
 *    Оффсеты называются minX, maxX, minY и maxY.
 *
 * Фукнция работает следующим образом:
 * 1. Вычисляет текущее расстояние между якорями боксов по двум осям (dx и dy).
 * 2. Вычисляет диапазон расстояний dx и dy, внутри которых боксы будут пересекаться.
 *    Эти вычисления производятся отдельно для двух осей. Результаты вычислений делятся
 *    на текущие расстояния dx и dy. Таким образом, мы получаем результат в виде
 *    множителей текущего расстояния.
 * 3. Выполняется пересечение полученных интервалов для x и y.
 * 4. Берётся максимальное граница интервала, из него вычисляется финальное значение зума.
 */
export function getIntersectionZoom(
    bbox1: LabelBBox,
    bbox2: LabelBBox,
    currentZoom: number,
): number {
    // Вычисляем текущее расстояние между якорями боксов
    const dx = bbox2.anchorX - bbox1.anchorX;
    const dy = bbox2.anchorY - bbox1.anchorY;

    // Вычисляем диапазон множителей dx, внутри которого боксы пересекаются вдоль оси X
    calcIntersectionRange(
        intersectionRangeX,
        bbox1.minX,
        bbox1.maxX,
        bbox2.minX,
        bbox2.maxX,
        dx,
    );

    // Вычисляем диапазон множителей dy, внутри которого боксы пересекаются вдоль оси Y
    calcIntersectionRange(
        intersectionRangeY,
        bbox1.minY,
        bbox1.maxY,
        bbox2.minY,
        bbox2.maxY,
        dy,
    );

    // Находим пересечение этих диапазонов
    intersect(
        intersectionRange,
        intersectionRangeX,
        intersectionRangeY,
        intersectionRangeLimit,
    );

    // Получили пустой интервал — боксы не пересекутся никогда
    if (intersectionRange.min >= intersectionRange.max) {
        return -Infinity;
    }

    // Берём максимальное значение диапазона и вычисляем из него зум
    return currentZoom + Math.log(intersectionRange.max) / Math.log(2);
}

/**
 * Вычисляет диапазон расстояний между якорями, в котором два бокса пересекаются вдоль одной оси.
 */
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

/**
 * Выполняет операцию пересечения трёх интервалов. Результат записывается в интервал dest.
 */
function intersect(
    dest: Interval,
    interval1: Interval,
    interval2: Interval,
    interval3: Interval,
): void {
    dest.min = Math.max(interval1.min, interval2.min, interval3.min);
    dest.max = Math.min(interval1.max, interval2.max, interval3.max);
}
