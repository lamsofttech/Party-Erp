// src/components/LeafletHeatmap.tsx
import { useEffect, useMemo, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

type HeatPoint = { lat: number; lng: number; intensity?: number };

type Props = {
  points: HeatPoint[];
  radius?: number;
  blur?: number;
  max?: number;
  minOpacity?: number;
  gradient?: Record<string | number, string>;
  /** Auto-fit the map to points (great for small screens). Default: true */
  fitToData?: boolean;
  /** Padding in px when fitting. Default: 32 */
  fitPadding?: number;
  /** Keep radius/blur responsive to zoom & devicePixelRatio. Default: true */
  responsive?: boolean;
  /** z-index for the canvas (above tiles, below markers). Default: 450 */
  zIndex?: number;
};

const DEFAULT_LIGHT_GRADIENT: Record<number, string> = {
  0.0: '#e0f2ff',
  0.3: '#90caf9',
  0.6: '#42a5f5',
  0.8: '#ef5350',
  1.0: '#b71c1c',
};

const DEFAULT_DARK_GRADIENT: Record<number, string> = {
  0.0: '#11263a',
  0.3: '#1e88e5',
  0.6: '#29b6f6',
  0.8: '#ffb74d',
  1.0: '#ff7043',
};

function prefersDark() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
}
function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

const LeafletHeatmap: React.FC<Props> = ({
  points,
  radius = 25,
  blur = 15,
  max = 1,
  minOpacity = 0.05,
  gradient,
  fitToData = true,
  fitPadding = 32,
  responsive = true,
  zIndex = 450,
}) => {
  const map = useMap();

  // Keep the layer instance; `any` avoids plugin typing friction
  const heatRef = useRef<any>(null);

  // Convert points once per change
  const latlngs = useMemo<[number, number, number?][]>(() => {
    if (!points?.length) return [];
    return points.map((p) => [p.lat, p.lng, p.intensity ?? 1]);
  }, [points]);

  // Pick a good default gradient for light/dark if none provided
  const effectiveGradient = useMemo(() => {
    if (gradient && Object.keys(gradient).length) return gradient as any;
    return prefersDark() ? DEFAULT_DARK_GRADIENT : DEFAULT_LIGHT_GRADIENT;
  }, [gradient]);

  // Compute mobile-friendly radius/blur based on zoom & DPR
  const computeResponsiveSizes = () => {
    if (!responsive) return { r: radius, b: blur };

    const zoom = map.getZoom?.() ?? 10;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const reduce = prefersReducedMotion();

    // Gentle scaling with zoom, clamped for stability
    const zoomScale = Math.min(Math.max(zoom / 10, 0.6), 1.8);
    const baseBlur = reduce ? Math.max(blur - 6, 6) : blur;

    const r = Math.max(8, Math.round(radius * zoomScale * dpr));
    const b = Math.max(6, Math.round(baseBlur * zoomScale));
    return { r, b };
  };

  // Create once
  useEffect(() => {
    if (!map || heatRef.current) return;

    const { r, b } = computeResponsiveSizes();
    const layer = (L as any).heatLayer(latlngs, {
      radius: r,
      blur: b,
      max,
      minOpacity,
      gradient: effectiveGradient,
    });

    layer.addTo(map);
    heatRef.current = layer;

    // Put canvas at a sensible z-index for touch interactions on mobile
    const canvas = (layer as any)?._heat?._canvas as HTMLCanvasElement | undefined;
    if (canvas) canvas.style.zIndex = String(zIndex);

    // Initial fit to data (handy on small screens/PWAs)
    if (fitToData && latlngs.length) {
      const bounds = L.latLngBounds(latlngs.map(([la, ln]) => [la, ln]));
      // Small timeout helps if map is inside a freshly mounted layout
      setTimeout(() => map.fitBounds(bounds, { padding: [fitPadding, fitPadding] }), 0);
    }

    return () => {
      if (heatRef.current) {
        try { map.removeLayer(heatRef.current); } catch {}
        heatRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Update data efficiently
  useEffect(() => {
    const layer = heatRef.current;
    if (!map || !layer) return;

    // Skip heavy work if app/tab is hidden (PWA battery friendly)
    if (typeof document !== 'undefined' && document.hidden) return;

    layer.setLatLngs(latlngs);

    // Gentle auto-fit if points move far off-screen (useful for live data)
    if (fitToData && latlngs.length) {
      const bounds = L.latLngBounds(latlngs.map(([la, ln]) => [la, ln]));
      if (!map.getBounds().pad(0.15).contains(bounds)) {
        map.fitBounds(bounds, { padding: [fitPadding, fitPadding] });
      }
    }
  }, [latlngs, fitToData, fitPadding, map]);

  // Update options (no re-create)
  useEffect(() => {
    const layer = heatRef.current;
    if (!layer) return;
    layer.setOptions({
      max,
      minOpacity,
      gradient: effectiveGradient,
    });
  }, [max, minOpacity, effectiveGradient]);

  // Adapt radius/blur on zoom/orientation for better mobile look
  useEffect(() => {
    const layer = heatRef.current;
    if (!map || !layer || !responsive) return;

    let raf = 0;
    const apply = () => {
      const { r, b } = computeResponsiveSizes();
      layer.setOptions({ radius: r, blur: b });
      const canvas = (layer as any)?._heat?._canvas as HTMLCanvasElement | undefined;
      if (canvas) canvas.style.zIndex = String(zIndex);
    };

    const onZoomEnd = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    map.on('zoomend', onZoomEnd);
    const onOrientation = () => onZoomEnd();
    window.addEventListener('orientationchange', onOrientation);

    return () => {
      map.off('zoomend', onZoomEnd);
      window.removeEventListener('orientationchange', onOrientation);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, responsive, radius, blur, zIndex]);

  // Fix sizing when returning from background on mobile
  useEffect(() => {
    if (!map) return;
    const onVis = () => {
      if (!document.hidden) setTimeout(() => map.invalidateSize({ animate: false }), 0);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [map]);

  return null;
};

export default LeafletHeatmap;
