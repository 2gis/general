import { equal } from 'assert';

import { offsets } from '../src/markerArray';

describe('markerArray.ts', () => {
    it('значения полей в offsets должны идти по порядку и с 0', () => {
        let lastValue = -1;

        for (const key in offsets) {
            if (offsets.hasOwnProperty(key)) {
                equal(offsets[key], lastValue + 1);
                lastValue = offsets[key];
            }
        }
    });
});
