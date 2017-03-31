import { PriorityGroup } from '../src';

export type GeneralConfig = { [zoom: number]: PriorityGroup[] };

export const generalConfig: GeneralConfig = {
    9: [{
        iconIndex: 0,
        safeZone: 0,
        margin: 5,
        degradation: 130,
    }, {
        iconIndex: 1,
        safeZone: 20,
        margin: 0,
        degradation: 0,
    }, {
        iconIndex: 2,
        safeZone: 0,
        margin: 2,
        degradation: 0,
    }],
    10: [{
        iconIndex: 0,
        safeZone: 0,
        margin: 5,
        degradation: 180,
    }, {
        iconIndex: 1,
        safeZone: 20,
        margin: 0,
        degradation: 0,
    }, {
        iconIndex: 2,
        safeZone: 0,
        margin: 2,
        degradation: 0,
    }],
    11: [{
        iconIndex: 0,
        safeZone: 0,
        margin: 5,
        degradation: 180,
    }, {
        iconIndex: 1,
        safeZone: 20,
        margin: 0,
        degradation: 0,
    }, {
        iconIndex: 2,
        safeZone: 5,
        margin: 0,
        degradation: 0,
    }],
    12: [{
        iconIndex: 0,
        safeZone: 0,
        margin: 5,
        degradation: 120,
    }, {
        iconIndex: 1,
        safeZone: 20,
        margin: 0,
        degradation: 0,
    }, {
        iconIndex: 2,
        safeZone: 5,
        margin: 0,
        degradation: 0,
    }],
    13: [{
        iconIndex: 0,
        safeZone: 0,
        margin: 5,
        degradation: 200,
    }, {
        iconIndex: 1,
        safeZone: 20,
        margin: 0,
        degradation: 0,
    }, {
        iconIndex: 2,
        safeZone: 0,
        margin: 2,
        degradation: 0,
    }],
    14: [{
        iconIndex: 0,
        safeZone: 0,
        margin: 10,
        degradation: 260,
    }, {
        iconIndex: 1,
        safeZone: 20,
        margin: 0,
        degradation: 0,
    }, {
        iconIndex: 2,
        safeZone: 0,
        margin: 4,
        degradation: 0,
    }],
    15: [{
        iconIndex: 0,
        safeZone: 0,
        margin: 15,
        degradation: 320,
    }, {
        iconIndex: 1,
        safeZone: 20,
        margin: 0,
        degradation: 0,
    }, {
        iconIndex: 2,
        safeZone: 0,
        margin: 4,
        degradation: 0,
    }],
    16: [{
        iconIndex: 0,
        safeZone: 0,
        margin: 15,
        degradation: 380,
    }, {
        iconIndex: 1,
        safeZone: 20,
        margin: 0,
        degradation: 0,
    }, {
        iconIndex: 2,
        safeZone: 0,
        margin: 5,
        degradation: 0,
    }],
    17: [{
        iconIndex: 0,
        safeZone: 0,
        margin: 20,
        degradation: 230,
    }, {
        iconIndex: 1,
        safeZone: 25,
        margin: 0,
        degradation: 0,
    }, {
        iconIndex: 2,
        safeZone: 0,
        margin: 5,
        degradation: 0,
    }],
};
