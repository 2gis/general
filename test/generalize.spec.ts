import { ok, deepEqual } from 'assert';
import { BBox } from '../src/types';

import { testHandlers } from '../src/worker/generalize';

const {
    putToArray,
    collide,
    createBBox,
    bboxIsEmpty,
    isNaN,
} = testHandlers;

describe('generalize.ts', () => {
    describe('#putToArray', () => {
        const width = 32;
        const height = 32;
        const planeLength = width * height + 8 >> 3;
        let plane: Uint8Array;

        beforeEach(() => {
            plane = new Uint8Array(planeLength);
        });

        it('правильно закрашивает bbox занимающий несколько байтов по ширине', () => {
            const bbox: BBox = {
                minX: 12,
                minY: 1,
                maxX: 25,
                maxY: 3,
            };
            const expect = plane.slice(0);

            // y = 1
            expect[width / 8 * 1 + 1] = parseInt('1111', 2);
            expect[width / 8 * 1 + 2] = 255;
            expect[width / 8 * 1 + 3] = parseInt('10000000', 2);

            // y = 2
            expect[width / 8 * 2 + 1] = parseInt('1111', 2);
            expect[width / 8 * 2 + 2] = 255;
            expect[width / 8 * 2 + 3] = parseInt('10000000', 2);

            putToArray(plane, width, bbox);
            deepEqual(plane, expect);
        });
    });

    describe('#collide', () => {
        const width = 32;
        const height = 32;
        const planeLength = width * height + 8 >> 3;
        const addedBbox: BBox = {
            minX: 12,
            minY: 1,
            maxX: 25,
            maxY: 3,
        };
        let plane: Uint8Array;

        beforeEach(() => {
            plane = new Uint8Array(planeLength);
            putToArray(plane, width, addedBbox);
        });

        it('не пересекается с закрашенным bbox', () => {
            const bbox: BBox = {
                minX: 25,
                minY: 3,
                maxX: 27,
                maxY: 20,
            };
            ok(!collide(plane, width, bbox));
        });

        it('пересекается с закрашенным bbox', () => {
            const bbox: BBox = {
                minX: 0,
                minY: 0,
                maxX: 13,
                maxY: 2,
            };
            ok(collide(plane, width, bbox));
        });
    });

    describe('#createBBox', () => {
        let bbox: BBox;

        beforeEach(() => {
            bbox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        });

        it('создает простой bbox', () => {
            createBBox(bbox, 100, 150, 1, [10, 25], [0.5, 1], 1, 25, 40, 0);

            const expect: BBox = {
                minX: 20,
                minY: 15,
                maxX: 30,
                maxY: 40,
            };

            deepEqual(bbox, expect);
        });

        it('обрезает bbox по границам экрана', () => {
            createBBox(bbox, 100, 35, 1, [10, 25], [0.5, 1], 1, 0, 40, 0);

            const expect: BBox = {
                minX: 0,
                minY: 15,
                maxX: 5,
                maxY: 35,
            };

            deepEqual(bbox, expect);
        });

        it('округляет все значения bbox', () => {
            createBBox(bbox, 100, 150, 1, [10, 25], [0.5, 1], 1, 25.1, 40.9, 0);

            const expect: BBox = {
                minX: 20,
                minY: 15,
                maxX: 30,
                maxY: 40,
            };

            deepEqual(bbox, expect);
        });

        it('если pixelRatio = 2, размеры и координаты увеличивает в 2 раза', () => {
            createBBox(bbox, 100, 150, 2, [10, 25], [0.5, 1], 1, 25, 40, 0);

            const expect: BBox = {
                minX: 40,
                minY: 30,
                maxX: 60,
                maxY: 80,
            };

            deepEqual(bbox, expect);
        });

        it('если pixelDensity = 2, размеры уменьшает в 2 раза', () => {
            createBBox(bbox, 100, 150, 1, [10, 25], [0.5, 1], 2, 25, 40, 0);

            const expect: BBox = {
                minX: 22,
                minY: 27,
                maxX: 27,
                maxY: 40,
            };

            deepEqual(bbox, expect);
        });
    });

    describe('#bboxIsEmpty', () => {
        it('возвращает false для нормального bbox', () => {
            const bbox: BBox = {
                minX: 5,
                minY: 10,
                maxX: 15,
                maxY: 30,
            };

            ok(!bboxIsEmpty(bbox));
        });

        it('возвращает true если ширина 0', () => {
            const bbox: BBox = {
                minX: 5,
                minY: 10,
                maxX: 5,
                maxY: 30,
            };

            ok(bboxIsEmpty(bbox));
        });

        it('возвращает true если высота 0', () => {
            const bbox: BBox = {
                minX: 5,
                minY: 10,
                maxX: 15,
                maxY: 10,
            };

            ok(bboxIsEmpty(bbox));
        });
    });

    describe('#isNaN', () => {
        it('проверка с числами', () => {
            ok(!isNaN(1));
            ok(!isNaN(0));
            ok(!isNaN(-5));
        });

        it('проверка с NaN', () => {
            ok(isNaN(NaN));
        });
    });
});
