import {
    MarkerDrawer,
    Atlas,
    Marker,
} from 'markerdrawer';
// import { config } from './config';

const map = L.map('map', {
    center: [54.980156831455, 82.897440725094],
    zoom: 15,
});

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const centerLngLat = [82.897440725094, 54.980156831455];
const markersData: Marker[] = [];
for (let i = 0; i < 5000; i++) {
    markersData.push({
        position: [
            centerLngLat[0] + (Math.random() - 0.5) * 0.25,
            centerLngLat[1] + (Math.random() - 0.5) * 0.1,
        ],
    });
}

const pinAd = new Image();
pinAd.src = 'demo/marker-ad.svg';

const pin = new Image();
pin.src = 'demo/marker-regular.svg';

const atlas = new Atlas([{
    image: pinAd,
    anchor: [0.5, 0.5],
}, {
    image: pin,
    anchor: [0.5, 0.5],
}]);

const markerDrawer = new MarkerDrawer(markersData, atlas);

markerDrawer.on('click', (ev) => {
    // tslint:disable-next-line
    console.log('click', ev);
});

markerDrawer.addTo(map);
