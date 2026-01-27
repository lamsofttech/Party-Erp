// src/components/maps/InteractiveDots.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { LatLngTuple } from 'leaflet';
import { CircleMarker, LayerGroup, Tooltip, useMap } from 'react-leaflet';

/** Minimal point shape expected by this layer */
export type DotPoint = {
  latitude: number;
  longitude: number;
  vote_count?: number;
  turnout?: number;      // 0–100 (percent)
  agent_phone?: string;  // E.164 recommended
  const_code?: string;
  ward_code?: string;
  label?: string;        // e.g., polling station name
};

export type InteractiveDotsProps = {
  points: DotPoint[];
  /** Only render when map zoom >= minZoom (prevents DOM overload). Default: 9 */
  minZoom?: number;
  /** Safety cap on rendered points. Default: 4000 */
  cap?: number;
  /** Show agent phone? (You can gate this by role/permissions). Default: true */
  showAgentPhone?: boolean;
  /** Mask phone numbers like +2547***12**. Default: false */
  maskAgentPhone?: boolean;
  /** Size of the (barely visible) circle marker. Default: 6 */
  radius?: number;
};

const maskPhone = (msisdn: string) => {
  // crude mask: keep prefix & last 2; adjust to your policy
  if (!msisdn || msisdn.length < 6) return '***';
  const keepStart = Math.min(5, Math.ceil(msisdn.length * 0.4));
  const keepEnd = 2;
  const start = msisdn.slice(0, keepStart);
  const end = msisdn.slice(-keepEnd);
  return `${start}${'*'.repeat(Math.max(0, msisdn.length - keepStart - keepEnd))}${end}`;
};

const InteractiveDots: React.FC<InteractiveDotsProps> = ({
  points,
  minZoom = 9,
  cap = 4000,
  showAgentPhone = true,
  maskAgentPhone = false,
  radius = 6,
}) => {
  const map = useMap();
  const [enabled, setEnabled] = useState(() => map.getZoom() >= minZoom);

  useEffect(() => {
    const onZoom = () => setEnabled(map.getZoom() >= minZoom);
    map.on('zoomend', onZoom);
    return () => {
      map.off('zoomend', onZoom);
    };
  }, [map, minZoom]);

  // enforce a rendering cap to avoid DOM overload
  const safePoints = useMemo(() => points.slice(0, cap), [points, cap]);

  if (!enabled || safePoints.length === 0) return null;

  return (
    <LayerGroup>
      {safePoints.map((p, idx) => {
        const center: LatLngTuple = [p.latitude, p.longitude];
        const phone =
          p.agent_phone ? (maskAgentPhone ? maskPhone(p.agent_phone) : p.agent_phone) : undefined;

        return (
          <CircleMarker
            key={`${p.latitude},${p.longitude}|${idx}`}
            center={center}
            radius={radius}
            pathOptions={{
              // Leaflet PathOptions (typed): we pass these through pathOptions
              bubblingMouseEvents: true,
              opacity: 0,        // invisible stroke
              fillOpacity: 0.06, // barely visible; keeps it hoverable
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div style={{ minWidth: 180 }}>
                {p.label && <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.label}</div>}

                {typeof p.turnout === 'number' && (
                  <div>
                    Turnout: <b>{p.turnout.toFixed(1)}%</b>
                  </div>
                )}

                {typeof p.vote_count === 'number' && (
                  <div>
                    Votes (rel.): <b>{p.vote_count}</b>
                  </div>
                )}

                {showAgentPhone && phone && (
                  <div>
                    Agent: <b>{phone}</b>
                  </div>
                )}

                {(p.const_code || p.ward_code) && (
                  <div style={{ color: '#666', marginTop: 2, fontSize: 12 }}>
                    {p.const_code && <>Const: {p.const_code} </>}
                    {p.ward_code && <>• Ward: {p.ward_code}</>}
                  </div>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </LayerGroup>
  );
};

export default InteractiveDots;
