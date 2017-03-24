import * as rbush from 'rbush';

const tree = rbush.tree();

/**
 * @typedef Marker
 * @property {[number, number]} position LngLat
 * @property {number} icon Номер иконки в спрайте
 * @property {number} groupIndex
 */

/**
 * @typedef PriorityGroup
 * @property {number} safeZone
 */

/**
 * @export
 * @param {PriorityGroup[]} priorityGroups
 * @param {Atlas} atlas
 * @param {Marker[]} markers
 */
export function generalize(priorityGroups, atlas, markers) {
    
}
