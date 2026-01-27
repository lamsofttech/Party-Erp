declare module 'leaflet.heat' {
  import * as L from 'leaflet';
  export function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
      minOpacity?: number;
      gradient?: Record<string | number, string>;
    }
  ): L.Layer;
}
