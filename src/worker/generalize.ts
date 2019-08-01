import { BBox, Vec2, WorkerMessage, PriorityGroup, Sprite } from '../types';
import * as markerArray from '../markerArray';
import * as labelArray from '../labelArray';

const collideBBox: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
const marginBBox: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
const degradationBBox: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
const noMarginBBox: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

export function generalize(data: WorkerMessage) {
    const { bounds, priorityGroups, markers, markerCount, labels, labelCount } = data;

    const planeWidth = (bounds.maxX - bounds.minX >> 3) + 1 << 3; // Ширина должна быть кратна 8
    const planeHeight = bounds.maxY - bounds.minY;

    const planeLength = planeWidth * planeHeight + 8 >> 3;

    /**
     * Алгоритм действует по принципу закрашивания плоскости маркерами.
     * Плоскость – массив, каждый элемент которого представляет собой пиксель на экране.
     * Для ускорения процесса используется битовой массив, 1 бит – 1 пиксель.
     * У нас есть несколько плоскостей.
     */

    // Это первая, с помощью нее мы просто проверяем попадание маркеров с safeZone и вставляем их с margin
    const plane = new Uint8Array(planeLength);

    // Эта плоскость аналогична plane, но маркеры вставляются в неё без margin
    const noMarginPlane = new Uint8Array(planeLength);

    /**
     * Следующие плоскости используются для проверки на деградацию маркеров.
     *
     * Область деградации маркера текущей группы действует только на маркера из следующей группы
     * и не влияет на другие маркера текущей группы.
     *
     * Поэтому на каждую группу, кроме последней, нужно создавать свою плоскость,
     * которая будет использоваться с последующими группами.
     */

    const degradationPlanes: Uint8Array[] = [];
    for (let i = 0; i < priorityGroups.length; i++) {
        degradationPlanes[i] = new Uint8Array(planeLength);
    }

    const prevIconIndices = new Int8Array(markerCount);
    for (let i = 0; i < markerCount; i++) {
        const index = i * markerArray.stride + markerArray.offsets.iconIndex;

        // Сохраняем предыдущие индексы иконок для работы гистерезиса
        prevIconIndices[i] = markers[index];

        // Сбрасываем значение iconIndex у маркера
        markers[index] = -1;
    }

    const prevLabelState = new Uint8Array(labelCount);
    for (let i = 0; i < labelCount; i++) {
        const index = i * labelArray.stride + labelArray.offsets.display;

        // Сохраняем предыдущее состояние лейблов
        prevLabelState[i] = labels[index];

        // Сбрасываем состояние лейблов
        labels[index] = 0;
    }

    // Здесь начинает работу основной алгоритм генерализации
    // Генерализуем в таком порядке:
    // 1. Приоритетные маркеры, видимые на экране, затем их подписи
    // 2. Приоритетные маркеры, не видимые на экране, затем их подписи
    // 3. Неприоритетные маркеры, видимые на экране, затем их подписи
    // 4. Неприоритетные маркеры, не видимые на экране, затем их подписи
    generalizePart(
        data, plane, noMarginPlane, degradationPlanes, planeWidth, planeHeight,
        prevIconIndices, prevLabelState, true, true,
    );
    generalizePart(
        data, plane, noMarginPlane, degradationPlanes, planeWidth, planeHeight,
        prevIconIndices, prevLabelState, false, true,
    );
    generalizePart(
        data, plane, noMarginPlane, degradationPlanes, planeWidth, planeHeight,
        prevIconIndices, prevLabelState, true, false,
    );
    generalizePart(
        data, plane, noMarginPlane, degradationPlanes, planeWidth, planeHeight,
        prevIconIndices, prevLabelState, false, false,
    );

}

function generalizePart(
    data: WorkerMessage,
    plane: Uint8Array,
    noMarginPlane: Uint8Array,
    degradationPlanes: Uint8Array[],
    planeWidth: number,
    planeHeight: number,
    prevIconIndices: Int8Array,
    prevLabelState: Uint8Array,
    processVisible: boolean,
    processPriority: boolean,

): void {
    const { bounds, priorityGroups, sprites, markers, markerCount, labels, labelCount } = data;

    for (let i = 0; i < priorityGroups.length; i++) {
        const sprite = sprites[priorityGroups[i].iconIndex];
        if (!sprite) {
            // Защищаемся от ситуации, когда в конфиге передан некорректный индекс спрайта
            continue;
        }

        const prevDegradationPlane = i !== 0 ? degradationPlanes[i - 1] : undefined;
        const degradationPlane = i !== priorityGroups.length - 1 ? degradationPlanes[i] : undefined;

        for (let j = 0; j < markerCount; j++) {
            const isVisible = prevIconIndices[j] !== -1;
            const isPriority = markers[markerArray.stride * j + markerArray.offsets.priority] === 1;

            const visibilityOk = processVisible && isVisible || !processVisible && !isVisible;
            const priorityOk = processPriority && isPriority || !processPriority && !isPriority;

            if (visibilityOk && priorityOk) {
                generalizeMarker(
                    markers,
                    priorityGroups,
                    sprites,
                    bounds,
                    prevDegradationPlane,
                    degradationPlane,
                    plane,
                    noMarginPlane,
                    planeWidth,
                    planeHeight,
                    i, j,
                );
            }
        }
    }

    for (let i = 0; i < labelCount; i++) {
        const markerIndex = labels[i * labelArray.stride + labelArray.offsets.markerIndex];

        const isVisible = prevLabelState[i] === 1;
        const isPriority = markers[markerIndex * markerArray.stride + markerArray.offsets.priority] === 1;

        const visibilityOk = processVisible && isVisible || !processVisible && !isVisible;
        const priorityOk = processPriority && isPriority || !processPriority && !isPriority;

        if (visibilityOk && priorityOk) {
            generalizeLabel(markers, labels, bounds, plane, noMarginPlane, planeWidth, planeHeight, i);
        }
    }
}

function generalizeMarker(
    markers: Float32Array,
    priorityGroups: PriorityGroup[],
    sprites: Sprite[],
    bounds: BBox,
    prevDegradationPlane: Uint8Array | undefined,
    degradationPlane: Uint8Array | undefined,
    plane: Uint8Array,
    noMarginPlane: Uint8Array,
    planeWidth: number,
    planeHeight: number,
    groupIndex: number,
    markerIndex: number,
): void {
    const { safeZone, iconIndex, margin, degradation } = priorityGroups[groupIndex];
    const { size, anchor } = sprites[iconIndex];
    const { stride, offsets } = markerArray;

    const markerOffset = markerIndex * stride;
    const markerGroupIndex = markers[markerOffset + offsets.groupIndex];
    const pixelPositionX = markers[markerOffset + offsets.pixelPositionX] - bounds.minX;
    const pixelPositionY = markers[markerOffset + offsets.pixelPositionY] - bounds.minY;

    // Пропускаем маркера, чей изначальный groupIndex больше индекса текущей перебираемой группы.
    // Такие маркера будут проверены в следующах группах.
    if (markerGroupIndex > groupIndex) {
        return;
    }

    // Маркер первый раз попал в область деградации – пропускаем
    createBBox(marginBBox, planeWidth, planeHeight, size, anchor, pixelPositionX, pixelPositionY, margin);
    if (bboxIsEmpty(marginBBox) || (markerGroupIndex === groupIndex &&
            prevDegradationPlane && collide(prevDegradationPlane, planeWidth, marginBBox))
    ) {
        return;
    }

    // Область маркера пересекает область уже вставшего маркера – пропускаем
    createBBox(collideBBox, planeWidth, planeHeight, size, anchor, pixelPositionX, pixelPositionY, safeZone);
    if (bboxIsEmpty(collideBBox)) {
        return;
    }

    if (!collide(plane, planeWidth, collideBBox)) {
        createBBox(degradationBBox, planeWidth, planeHeight, size, anchor,
            pixelPositionX, pixelPositionY, degradation);

        // Если все хорошо и маркер выжил, закрашиваем его в двух плоскостях
        putToArray(plane, planeWidth, marginBBox);

        // Вставляем маркер в noMarginPlane для корректного лейблинга подписей
        createBBox(noMarginBBox, planeWidth, planeHeight, size, anchor, pixelPositionX, pixelPositionY, 0);
        putToArray(noMarginPlane, planeWidth, noMarginBBox);

        if (degradationPlane) {
            putToArray(degradationPlane, planeWidth, degradationBBox);
        }

        markers[markerOffset + offsets.iconIndex] = iconIndex;
    }
}

function generalizeLabel(
    markers: Float32Array,
    labels: Float32Array,
    bounds: BBox,
    plane: Uint8Array,
    noMarginPlane: Uint8Array,
    planeWidth: number,
    planeHeight: number,
    labelIndex: number,
): void {
    const { stride, offsets } = labelArray;
    const labelOffset = labelIndex * stride;

    const markerIndex = labels[labelOffset + offsets.markerIndex];
    const markerOffset = markerIndex * markerArray.stride;
    const markerIsDisplayed = markers[markerOffset + markerArray.offsets.iconIndex] !== -1;

    if (!markerIsDisplayed) {
        return;
    }

    const pixelPositionX = markers[markerOffset + markerArray.offsets.pixelPositionX] - bounds.minX;
    const pixelPositionY = markers[markerOffset + markerArray.offsets.pixelPositionY] - bounds.minY;

    const size = [
        labels[labelOffset + offsets.width],
        labels[labelOffset + offsets.height],
    ];

    const anchor = [
        -labels[labelOffset + offsets.offsetX] / size[0],
        -labels[labelOffset + offsets.offsetY] / size[1],
    ];

    createBBox(noMarginBBox, planeWidth, planeHeight, size, anchor, pixelPositionX, pixelPositionY, 0);
    if (bboxIsEmpty(noMarginBBox)) {
        return;
    }

    if (!collide(noMarginPlane, planeWidth, noMarginBBox)) {
        putToArray(plane, planeWidth, noMarginBBox);
        putToArray(noMarginPlane, planeWidth, noMarginBBox);
        labels[labelOffset + offsets.display] = 1;
    }
}

/**
 * Проверяет, пересекает ли область что-либо в плоскости
 *
 * @param arr Плоскость
 * @param width Ширина плоскости
 * @param bbox Проверяемая область
 */
function collide(arr: Uint8Array, width: number, bbox: BBox): boolean {
    const x1 = bbox.minX;
    const y1 = bbox.minY;
    const x2 = bbox.maxX;
    const y2 = bbox.maxY;

    for (let j = y1; j < y2; j++) {
        const start = j * width + x1 >> 3;
        const end = j * width + x2 >> 3;
        let sum = 0;

        // Если начальный байт равен конечному, то нужно проверить только его
        if (start === end) {
            sum = arr[start] & (255 >> (x1 & 7) & 255 << (8 - (x2 & 7)));
        } else {
            // Проверяем начальный байт
            sum = arr[start] & (255 >> (x1 & 7));
            // Перебираем все промежуточные между начальным и конечным
            for (let i = start + 1; i < end; i++) {
                sum = arr[i] | sum;
            }
            // Проверяем конечный байт
            sum = arr[end] & (255 << (8 - (x2 & 7))) | sum;
        }

        if (sum !== 0) {
            return true;
        }
    }

    return false;
}

/**
 * Закрашиваем переданную область на плоскости
 *
 * @param arr Плоскость
 * @param width Ширина плоскости
 * @param bbox Закрашиваемая область
 */
function putToArray(arr: Uint8Array, width: number, bbox: BBox) {
    const x1 = bbox.minX;
    const y1 = bbox.minY;
    const x2 = bbox.maxX;
    const y2 = bbox.maxY;

    for (let j = y1; j < y2; j++) {
        const start = j * width + x1 >> 3;
        const end = j * width + x2 >> 3;

        // Если начальный байт равен конечному, то нужно закрасить биты только в нем
        if (start === end) {
            arr[start] = arr[start] | (255 >> (x1 & 7) & 255 << (8 - (x2 & 7)));
        } else {
            // Закрашиваем биты в начальном байте
            arr[start] = arr[start] | (255 >> (x1 & 7));
            // Закрашиваем все промежуточные байты между начальным и конечным
            for (let i = start + 1; i < end; i++) {
                arr[i] = 255;
            }
            // Закрашиваем биты в коненом байте
            arr[end] = arr[end] | (255 << (8 - (x2 & 7)));
        }
    }
}

function bboxIsEmpty(a: BBox): boolean {
    return a.minX === a.maxX || a.minY === a.maxY;
}

function createBBox(
    dst: BBox,
    planeWidth: number,
    planeHeight: number,
    size: Vec2,
    anchor: Vec2,
    positionX: number,
    positionY: number,
    offset: number,
): void {
    const x1 = positionX - size[0] * anchor[0] - offset | 0;
    const y1 = positionY - size[1] * anchor[1] - offset | 0;

    const x2 = positionX + size[0] * (1 - anchor[0]) + offset | 0;
    const y2 = positionY + size[1] * (1 - anchor[1]) + offset | 0;

    // Обрезаем область по установленным границам плоскости
    dst.minX = x1 > 0 ? (x1 < planeWidth ? x1 : planeWidth) : 0;
    dst.minY = y1 > 0 ? (y1 < planeHeight ? y1 : planeHeight) : 0;
    dst.maxX = x2 > 0 ? (x2 < planeWidth ? x2 : planeWidth) : 0;
    dst.maxY = y2 > 0 ? (y2 < planeHeight ? y2 : planeHeight) : 0;
}

export const testHandlers = {
    collide,
    putToArray,
    bboxIsEmpty,
    createBBox,
    generalize,
};
