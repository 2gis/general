import { BBox, Vec2, WorkerMessage } from './types';
import { stride, offsets } from './markerArray';

declare const postMessage: (message: any, transfer?: any[]) => void;

const collideBBox: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
const marginBBox: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
const degradationBBox: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

onmessage = (event) => {
    const data: WorkerMessage = event.data;
    const { bounds, pixelRatio, priorityGroups, sprites, markers, markerCount } = data;

    const width = (bounds.maxX - bounds.minX >> 3) + 1 << 3; // Ширина должна быть кратна 8
    const height = bounds.maxY - bounds.minY;

    const planeLength = width * height + 8 >> 3;

    /**
     * Алгоритм действует по принципу закрашивания плоскости маркерами.
     * Плоскость – массив, каждый элемент которого представляет собой пиксель на экране.
     * Для ускорения процесса используется битовой массив, 1 бит – 1 пиксель.
     * Всего у нас есть три плоскости:
     */

    // Это первая, с помощью нее мы просто проверяем попадание маркеров с safeZone и вставляем их с margin
    const plane = new Uint8Array(planeLength);

    /**
     * Следующие две используются для проверки на деградацию маркеров.
     * Область деградации маркера текущей группы действует только на маркера из следующей группы
     * и не влияет на другие маркера текущей группы.
     * Поэтому их две:
     */

    // Одна – для проверки текущей группы с предыдущими
    const currentDegradationPlane = new Uint8Array(planeLength);
    // Вторая – для передачи в следующие группы
    const degradationPlane = new Uint8Array(planeLength);

    /**
     * Одни и те же маркера могут участвовать в генерализации несколько раз,
     * такие маркера имеют поле prevGroupIndex.
     *
     * Чтобы не делать лишнюю работу, и чтобы результат генерализации был устойчив,
     * мы используем результаты предыдущей генерализации.
     */

    // Поэтому вначале закрашиваем плоскость повторно генерализуемыми маркерами
    for (let i = 0; i < markerCount; i++) {
        const prevGroupIndex = markers[i * stride + offsets.prevGroupIndex];
        const pixelPositionX = markers[i * stride + offsets.pixelPositionX];
        const pixelPositionY = markers[i * stride + offsets.pixelPositionY];

        // prevGroupIndex не равен NaN, если маркер уже проходил генерализацию
        if (!isNaN(prevGroupIndex)) {
            const { iconIndex, margin, degradation } = priorityGroups[prevGroupIndex];
            const sprite = sprites[iconIndex];

            if (!sprite) {
                // smth shit
                continue;
            }

            const { size, anchor, pixelDensity } = sprite;

            // Вставляем их на основную плоскость и плоскость деградции без всяких проверок
            createBBox(marginBBox, width, height, pixelRatio, size, anchor, pixelDensity,
                pixelPositionX, pixelPositionY, margin);

            if (!bboxIsEmpty(marginBBox)) {
                putToArray(plane, width, marginBBox);
            }

            createBBox(degradationBBox, width, height, pixelRatio, size, anchor, pixelDensity,
                pixelPositionX, pixelPositionY, degradation);

            if (!bboxIsEmpty(degradationBBox)) {
                putToArray(degradationPlane, width, degradationBBox);
            }
        }
    }

    // Здесь начинает работу основной алгоритм генерализации.
    // У нас два вложенных цикла: по группам -> по маркерам.
    for (let i = 0; i < priorityGroups.length; i++) {
        const group = priorityGroups[i];
        const { safeZone, iconIndex, margin, degradation } = group;
        const sprite = sprites[iconIndex];

        if (!sprite) {
            // smth shit
            continue;
        }

        const { size, anchor, pixelDensity } = sprite;

        // Копируем область деградации от предудщих групп,
        // чтобы маркера текущей группы не влияли друг на друга.
        currentDegradationPlane.set(degradationPlane);

        for (let j = 0; j < markerCount; j++) {
            const markerOffset = j * stride;

            const groupIndex = markers[markerOffset + offsets.groupIndex];
            const prevGroupIndex = markers[markerOffset + offsets.prevGroupIndex];
            const pixelPositionX = markers[markerOffset + offsets.pixelPositionX];
            const pixelPositionY = markers[markerOffset + offsets.pixelPositionY];

            // Пропускаем маркера, чей изначальный groupIndex больше индекса текущей перебираемой группы.
            // Такие маркера будут проверены в следующах группах.
            // Также пропускаем повторно генерализуемые маркера.
            if (groupIndex > i || !isNaN(prevGroupIndex)) {
                continue;
            }

            // Маркер первый раз попал в область деградации – пропускаем
            createBBox(marginBBox, width, height, pixelRatio, size, anchor, pixelDensity,
                pixelPositionX, pixelPositionY, margin);
            if (bboxIsEmpty(marginBBox) ||
                (groupIndex === i && collide(currentDegradationPlane, width, marginBBox))
            ) {
                continue;
            }

            // Область маркера пересекает область уже вставшего маркера – пропускаем
            createBBox(collideBBox, width, height, pixelRatio, size, anchor, pixelDensity,
                pixelPositionX, pixelPositionY, safeZone);
            if (bboxIsEmpty(collideBBox)) {
                continue;
            }

            if (!collide(plane, width, collideBBox)) {
                createBBox(degradationBBox, width, height, pixelRatio, size, anchor, pixelDensity,
                    pixelPositionX, pixelPositionY, degradation);

                // Если все хорошо и маркер выжил, закрашиваем его в двух плоскостях
                putToArray(plane, width, marginBBox);
                putToArray(degradationPlane, width, degradationBBox);

                markers[markerOffset + offsets.iconIndex] = iconIndex;
                markers[markerOffset + offsets.prevGroupIndex] = i;
            }
        }
    }

    postMessage(markers);
};

/**
 * Проверяет, пересекает ли область что-либо в плоскости
 *
 * @param {Uint8Array} arr Плоскость
 * @param {number} width Ширина плоскости
 * @param {BBox} bbox Проверяемая область
 * @returns {boolean}
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
 * @param {Uint8Array} arr Плоскость
 * @param {number} width Ширина плоскости
 * @param {BBox} bbox Закрашиваемая область
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

function isNaN(a) {
    return a !== a;
}

function bboxIsEmpty(a: BBox): boolean {
    return a.minX === a.maxX || a.minY === a.maxY;
}

function createBBox(
    dst: BBox,
    width: number,
    height: number,
    pixelRatio: number,
    size: Vec2,
    anchor: Vec2,
    pixelDensity: number,
    positionX: number,
    positionY: number,
    offset: number,
): void {
    const spriteScale = pixelRatio / pixelDensity;

    const x1 = positionX * pixelRatio - size[0] * spriteScale * anchor[0] - offset | 0;
    const y1 = positionY * pixelRatio - size[1] * spriteScale * anchor[1] - offset | 0;

    const x2 = positionX * pixelRatio + size[0] * spriteScale * (1 - anchor[0]) + offset | 0;
    const y2 = positionY * pixelRatio + size[1] * spriteScale * (1 - anchor[1]) + offset | 0;

    // Обрезаем область по установленным границам плоскости
    dst.minX = x1 > 0 ? (x1 < width ? x1 : width) : 0;
    dst.minY = y1 > 0 ? (y1 < height ? y1 : height) : 0;
    dst.maxX = x2 > 0 ? (x2 < width ? x2 : width) : 0;
    dst.maxY = y2 > 0 ? (y2 < height ? y2 : height) : 0;
}
