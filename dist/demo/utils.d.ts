import { Atlas } from 'markerdrawer';
export declare function lngLatToZoomPoint(lngLat: [number, number], zoom: number): [number, number];
export declare function mapPointToZoomPoint(point: [number, number], zoom: any): [number, number];
export declare function latLngToMapPoint(lngLat: [number, number]): [number, number];
export interface ApiMarker {
    lon: number;
    lat: number;
    is_advertising: boolean;
}
export declare function loadMarkersData(): Promise<ApiMarker[]>;
export declare function loadAtlas(): Promise<Atlas>;
