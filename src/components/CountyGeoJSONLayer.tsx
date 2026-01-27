import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface CountyGeoJSONLayerProps {
  data: any;
  visible: boolean;
}

const CountyGeoJSONLayer: React.FC<CountyGeoJSONLayerProps> = ({ data, visible }) => {
  const map = useMap();

  useEffect(() => {
    if (!data) return;

    // Create the GeoJSON layer
    const geoJsonLayer = L.geoJSON(data, {
      style: () => ({
        color: 'grey',
        weight: 2,
        opacity: 0.5,
        fillColor: 'transparent',
        fillOpacity: 0.2,
      }),
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.COUNTY_NAM) {
          layer.bindTooltip(feature.properties.COUNTY_NAM);
        }
      },
    });

    // Handle visibility: add or remove the layer from the map
    if (visible) {
      geoJsonLayer.addTo(map);
    } else {
      map.removeLayer(geoJsonLayer);
    }

    // Cleanup function to remove the layer when component unmounts or visibility changes
    return () => {
      map.removeLayer(geoJsonLayer);
    };
  }, [data, map, visible]);

  return null;
};

export default CountyGeoJSONLayer;
