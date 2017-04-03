const members = [
    'positionX',
    'positionY',
    'pixelPositionX',
    'pixelPositionY',
    'groupIndex',
    'iconIndex',
    'prevGroupIndex',
];

export const stride = members.length;
export const offsets: {[key: string]: number} = members.reduce((offsets, member, index) => {
    offsets[member] = index;
    return offsets;
}, {});
