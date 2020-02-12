import { ok, equal, deepEqual } from 'assert';
import { BBox, Marker, WorkerMessage } from '../src/types';

import { testHandlers } from '../src/worker/generalize';
import { pack, stride, unpack } from '../src/markerArray';

const {
    putToArray,
    collide,
    createBBox,
    bboxIsEmpty,
    generalize,
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
            createBBox(bbox, 100, 150, [10, 25], [0.5, 1], 25, 40, 0);

            const expect: BBox = {
                minX: 20,
                minY: 15,
                maxX: 30,
                maxY: 40,
            };

            deepEqual(bbox, expect);
        });

        it('обрезает bbox по границам экрана', () => {
            createBBox(bbox, 100, 35, [10, 25], [0.5, 1], 0, 40, 0);

            const expect: BBox = {
                minX: 0,
                minY: 15,
                maxX: 5,
                maxY: 35,
            };

            deepEqual(bbox, expect);
        });

        it('округляет все значения bbox', () => {
            createBBox(bbox, 100, 150, [10, 25], [0.5, 1], 25.1, 40.9, 0);

            const expect: BBox = {
                minX: 20,
                minY: 15,
                maxX: 30,
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

    describe('#generalize', () => {
        describe('two markers one group', () => {
            let msg: WorkerMessage;
            let markers: Marker[];
            let markerArray: Float32Array;

            beforeEach(() => {
                markers = [{
                    pixelPosition: [50, 50],
                    groupIndex: 0,
                    iconIndex: -1,
                }, {
                    pixelPosition: [50, 65],
                    groupIndex: 0,
                    iconIndex: -1,
                }];

                markerArray = new Float32Array(markers.length * stride);
                pack(markerArray, markers);

                msg = {
                    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
                    priorityGroups: [{
                        safeZone: 0,
                        margin: 0,
                        degradation: 0,
                        iconIndex: 0,
                    }],
                    sprites: [{
                        size: [10, 10],
                        anchor: [0.5, 0.5],
                    }],
                    markerCount: markers.length,
                    markers: markerArray,
                };
            });

            it('1ый маркер встал, 2ой маркер тоже встал', () => {
                generalize(msg);
                unpack(markers, markerArray);

                equal(markers[0].iconIndex, 0);
                equal(markers[1].iconIndex, 0);
            });

            it('1ый маркер встал, 2ой маркер не смог встать из-за safeZone', () => {
                msg.priorityGroups[0].safeZone = 10;
                generalize(msg);
                unpack(markers, markerArray);

                equal(markers[0].iconIndex, 0);
                equal(markers[1].iconIndex, -1);
            });

            it('1ый маркер встал, 2ой маркер не смог встать из-за margin', () => {
                msg.priorityGroups[0].margin = 10;
                generalize(msg);
                unpack(markers, markerArray);

                equal(markers[0].iconIndex, 0);
                equal(markers[1].iconIndex, -1);
            });

            it('1ый маркер встал, 2ой маркер тоже, т.к. degradation на него не влияет', () => {
                msg.priorityGroups[0].degradation = 10;
                generalize(msg);
                unpack(markers, markerArray);

                equal(markers[0].iconIndex, 0);
                equal(markers[1].iconIndex, 0);
            });
        });

        describe('two markers three groups', () => {
            let msg: WorkerMessage;
            let markers: Marker[];
            let markerArray: Float32Array;

            beforeEach(() => {
                markers = [{
                    pixelPosition: [50, 50],
                    groupIndex: 0,
                    iconIndex: -1,
                }, {
                    pixelPosition: [50, 65],
                    groupIndex: 1,
                    iconIndex: -1,
                }, {
                    pixelPosition: [65, 65],
                    groupIndex: 2,
                    iconIndex: -1,
                }];

                markerArray = new Float32Array(markers.length * stride);
                pack(markerArray, markers);

                msg = {
                    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
                    priorityGroups: [{
                        safeZone: 0,
                        margin: 0,
                        degradation: 0,
                        iconIndex: 0,
                    }, {
                        safeZone: 0,
                        margin: 0,
                        degradation: 0,
                        iconIndex: 1,
                    }, {
                        safeZone: 0,
                        margin: 0,
                        degradation: 0,
                        iconIndex: 2,
                    }],
                    sprites: [{
                        size: [10, 10],
                        anchor: [0.5, 0.5],
                    }, {
                        size: [6, 6],
                        anchor: [0.5, 0.5],
                    }, {
                        size: [2, 2],
                        anchor: [0.5, 0.5],
                    }],
                    markerCount: markers.length,
                    markers: markerArray,
                };
            });

            it('1ый маркер встал, 2ой маркер деградировал в 3ю группу из-за своей safeZone', () => {
                msg.priorityGroups[1].safeZone = 10;
                generalize(msg);
                unpack(markers, markerArray);

                equal(markers[0].iconIndex, 0);
                equal(markers[1].iconIndex, 2);
            });

            it('1ый маркер встал, 2ой маркер пропал из-за margin 1ой', () => {
                msg.priorityGroups[1].margin = 10;
                generalize(msg);
                unpack(markers, markerArray);

                equal(markers[0].iconIndex, 0);
                equal(markers[1].iconIndex, 2);
            });

            it('1ый маркер встал, 2ой маркер деградировал в 3ю группу из-за degradation 1ой', () => {
                msg.priorityGroups[0].degradation = 10;
                generalize(msg);
                unpack(markers, markerArray);

                equal(markers[0].iconIndex, 0);
                equal(markers[1].iconIndex, 2);
            });
        });

        it('маркер повторно проходящий генерализацию, ' +
            'но не попадающий в переданные границы, должен иметь iconIndex = -1',
        () => {
            const markers: Marker[] = [{
                pixelPosition: [50, 50],
                groupIndex: 0,
                iconIndex: 0,
            }];
            const markerArray = new Float32Array(markers.length * stride);
            pack(markerArray, markers);

            const msg: WorkerMessage = {
                bounds: { minX: 100, minY: 100, maxX: 200, maxY: 200 },
                priorityGroups: [{
                    safeZone: 10,
                    margin: 10,
                    degradation: 0,
                    iconIndex: 0,
                }],
                sprites: [{
                    size: [10, 10],
                    anchor: [0.5, 0.5],
                }],
                markerCount: markers.length,
                markers: markerArray,
            };

            generalize(msg);
            unpack(markers, markerArray);

            equal(markers[0].iconIndex, -1);
        });

        it('маркер третий раз проходящий генерализацию, во второй раз он не попал в границы и получил iconIndex = -1,' +
            'в третий раз он попадает в границы и должен получить iconIndex от группы',
        () => {
            const markers: Marker[] = [{
                pixelPosition: [50, 50],
                groupIndex: 0,
                iconIndex: -1,
            }];
            const markerArray = new Float32Array(markers.length * stride);
            pack(markerArray, markers);

            const msg: WorkerMessage = {
                bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
                priorityGroups: [{
                    safeZone: 10,
                    margin: 10,
                    degradation: 0,
                    iconIndex: 0,
                }],
                sprites: [{
                    size: [10, 10],
                    anchor: [0.5, 0.5],
                }],
                markerCount: markers.length,
                markers: markerArray,
            };

            generalize(msg);
            unpack(markers, markerArray);

            equal(markers[0].iconIndex, 0);
        });
    });
});
