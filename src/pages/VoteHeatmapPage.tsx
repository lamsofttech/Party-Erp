// Kenya IEBC Election Heatmap – production-ready React (Leaflet)
// -------------------------------------------------------------
// Patched for mobile correctness:
// - Adds GlobalStyles to neutralize responsive CSS that warps Leaflet tiles/canvas
// - Uses dynamic viewport units (dvh) via a CSS variable fallback for stable heights
// - Adds InvalidateOnResize to force Leaflet to recompute layout after UI size changes
//
// NOTE: Deps (unchanged):
//   npm i react-leaflet leaflet leaflet.heat html-to-image
//   and import Leaflet CSS globally (e.g., in src/main.tsx):
//   import 'leaflet/dist/leaflet.css';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box,
  CircularProgress,
  Alert as MuiAlert,
  Button,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Tooltip,
  Stack,
  Chip,
  GlobalStyles,
} from '@mui/material';
import { MapContainer, TileLayer, useMap, GeoJSON, LayersControl } from 'react-leaflet';
import type { FeatureCollection as GeoJSONFeatureCollection } from 'geojson';
import L from 'leaflet';
import 'leaflet.heat';
import * as htmlToImage from 'html-to-image';

// 👇 import the hover layer (adjust path if needed)
import InteractiveDots from '../components/map/InteractiveDots';

const API_BASE = 'https://skizagroundsuite.com/API';
const HEATMAP_BASE = `${API_BASE}/get_vote_heatmap.php`;

// ---------------- Types ----------------
export type VoteDataPoint = {
  latitude: number;
  longitude: number;
  vote_count: number;
  const_code?: string; // keep as string to avoid .trim on number
  ward_code?: string;

  // Hover info
  turnout?: number;        // percent, e.g., 63.4
  agent_phone?: string;    // E.164 recommended
  label?: string;          // station/area name (optional)

  // NEW (for top-2 colouring)
  candidate_id?: string;
  candidate_name?: string;
};

export type ApiPoint = Partial<VoteDataPoint> & Record<string, any>;
export type CumMap = Map<string, VoteDataPoint>;

export type County = { id: string; name: string; code: string };
export type Constituency = { id: string; name: string; county_code: string };
export type Ward = { id: string; name: string; const_code: string };

// Optional GeoJSON overlays (plug your IEBC files here if/when available)
type BoundaryOverlays = {
  counties?: GeoJSONFeatureCollection;
  constituencies?: GeoJSONFeatureCollection;
  wards?: GeoJSONFeatureCollection;
};

// ---------------- Helpers ----------------
const toKey = (p: VoteDataPoint) =>
  (p.const_code?.trim() || '') +
  '|' +
  (p.ward_code?.trim() || '') +
  '|' +
  `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;

const normalizeResponse = (json: any): VoteDataPoint[] => {
  const rows: ApiPoint[] = Array.isArray(json)
    ? json
    : Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.results)
    ? json.results
    : [];

  return rows
    .map((r): VoteDataPoint | null => {
      const latitude = Number(r.latitude ?? r.lat);
      const longitude = Number(r.longitude ?? r.lng ?? r.lon);
      const vote_count = Number(r.vote_count ?? r.count ?? r.intensity ?? 0);
      const const_code =
        (r.const_code ?? r.constituency_code ?? r.constituency ?? undefined) as string | undefined;
      const ward_code = (r.ward_code ?? r.ward ?? undefined) as string | undefined;

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

      const candidate_id =
        (String(r.candidate_id ?? r.candidate ?? r.cand_id ?? '').trim() || undefined) as
          | string
          | undefined;
      const candidate_name = (r.candidate_name ?? r.cand_name ?? r.name) as string | undefined;

      return {
        latitude,
        longitude,
        vote_count: Number.isFinite(vote_count) ? vote_count : 0,
        const_code,
        ward_code,
        turnout: r.turnout != null ? Number(r.turnout) : undefined,
        agent_phone: (r.agent_phone ?? r.agentPhone ?? r.phone) as string | undefined,
        label: (r.station_name ?? r.place ?? r.label) as string | undefined,
        candidate_id,
        candidate_name,
      };
    })
    .filter((x): x is VoteDataPoint => x !== null);
};

const getJSON = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { method: 'GET' });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} for ${url}. CT=${ct}. Body: ${body.slice(0, 120)}`);
  }
  if (!ct.includes('application/json')) {
    const body = await res.text().catch(() => '');
    throw new Error(`Expected JSON at ${url}, got ${ct}. Body: ${body.slice(0, 120)}`);
  }
  return res.json();
};

// Cumulative cache per filter context
const LS_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const cacheKey = (
  candidateId: string,
  countyCode: string,
  constCode: string,
  wardCode: string,
  minVotes: number,
  kenyaBounds: boolean
) =>
  `VOTE_HEATMAP_CUM_V3|cand=${candidateId || 'ALL'}|county=${
    countyCode || 'ALL'
  }|const=${constCode || 'ALL'}|ward=${wardCode || 'ALL'}|min=${minVotes}|bounds=${
    kenyaBounds ? 'KE' : 'ALL'
  }`;

const loadCumulative = (key: string): { points: VoteDataPoint[]; ts: number } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { points: [], ts: 0 };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.points) || typeof parsed.ts !== 'number') return {
      points: [],
      ts: 0,
    };
    if (Date.now() - parsed.ts > LS_TTL_MS) return { points: [], ts: 0 };
    return parsed;
  } catch {
    return { points: [], ts: 0 };
  }
};

const saveCumulative = (key: string, points: VoteDataPoint[]) => {
  try {
    localStorage.setItem(key, JSON.stringify({ points, ts: Date.now() }));
  } catch {}
};

// ---------------- Map bits ----------------
const KENYA_BOUNDS: L.LatLngBoundsExpression = [
  [-4.9, 33.9],
  [5.2, 41.9],
];

const BLUE_GRADIENT: Record<number, string> = {
  0.0: '#e0f2ff',
  0.25: '#bfdbfe',
  0.5: '#60a5fa',
  0.75: '#3b82f6',
  1.0: '#1d4ed8',
};

const YELLOW_GRADIENT: Record<number, string> = {
  0.0: '#fef9c3',
  0.25: '#fde68a',
  0.5: '#fbbf24',
  0.75: '#f59e0b',
  1.0: '#d97706',
};

// NEW: force Leaflet to re-measure after container size changes
const InvalidateOnResize: React.FC<{ deps?: any[] }> = ({ deps = [] }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, deps); // run whenever deps change

  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);

  return null;
};

const HeatLayer: React.FC<{
  points: VoteDataPoint[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
  gradient?: Record<number, string>;
  minOpacity?: number;
}> = ({ points, radius = 18, blur = 22, maxZoom = 12, gradient, minOpacity = 0.15 }) => {
  const map = useMap();

  // Use a generic Leaflet layer; leaflet.heat augments at runtime
  const layerRef = useRef<L.Layer | null>(null);

  const heatData = useMemo(() => {
    // Convert into [lat, lng, intensity] with log scaling for boardrooms
    const max = Math.max(1, ...points.map((p) => p.vote_count));
    return points.map(
      (p) =>
        [p.latitude, p.longitude, Math.log1p(p.vote_count) / Math.log1p(max)] as [
          number,
          number,
          number
        ]
    );
  }, [points]);

  useEffect(() => {
    const opts: any = { radius, blur, maxZoom, minOpacity };
    if (gradient) opts.gradient = gradient;

    if (!layerRef.current) {
      // Create the heat layer once (plugin attaches heatLayer to L at runtime)
      layerRef.current = (L as any).heatLayer(heatData, opts).addTo(map);
    } else {
      const anyLayer = layerRef.current as any;

      // Update points if plugin exposes setLatLngs
      if (typeof anyLayer.setLatLngs === 'function') {
        anyLayer.setLatLngs(heatData);
      }

      // Update options if plugin exposes setOptions
      if (typeof anyLayer.setOptions === 'function') {
        anyLayer.setOptions(opts);
      }
    }

    // Cleanup on unmount
    return () => {
      if (layerRef.current) {
        layerRef.current.removeFrom(map);
        layerRef.current = null;
      }
    };
  }, [heatData, radius, blur, maxZoom, gradient, minOpacity, map]);

  return null;
};

const FitKenya: React.FC<{ restrict: boolean }> = ({ restrict }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(KENYA_BOUNDS, { padding: [20, 20] });
    map.setMinZoom(restrict ? 5 : 0);
  }, [map, restrict]);
  return null;
};

const Legend: React.FC<{ mode: 'single' | 'dual'; labels?: { c1?: string; c2?: string } }> = ({
  mode,
  labels,
}) => (
  <Box
    sx={{
      position: 'absolute',
      right: 12,
      bottom: 12,
      background: 'rgba(255,255,255,0.9)',
      p: 1.2,
      borderRadius: 1,
      boxShadow: 1,
      fontSize: 12,
      lineHeight: 1.2,
    }}
  >
    <div style={{ fontWeight: 700, marginBottom: 6 }}>
      {mode === 'dual' ? 'Intensity (relative) — Top-2' : 'Intensity (relative)'}
    </div>
    {mode === 'dual' ? (
      <Stack gap={1.2}>
        <Stack direction="row" gap={0.5} alignItems="center">
          <Box sx={{ minWidth: 120 }}>{labels?.c1 || 'Top 1'} (Blue)</Box>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <Box
              key={t}
              sx={{ width: 24, height: 10, background: (BLUE_GRADIENT as any)[t], border: '1px solid #ddd' }}
            />
          ))}
        </Stack>
        <Stack direction="row" gap={0.5} alignItems="center">
          <Box sx={{ minWidth: 120 }}>{labels?.c2 || 'Top 2'} (Yellow)</Box>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <Box
              key={t}
              sx={{
                width: 24,
                height: 10,
                background: (YELLOW_GRADIENT as any)[t],
                border: '1px solid #ddd',
              }}
            />
          ))}
        </Stack>
      </Stack>
    ) : (
      <Stack direction="row" gap={0.5} alignItems="center">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <Box
            key={t}
            sx={{ width: 36, height: 10, background: `rgba(255,0,0,${t})`, border: '1px solid #ddd' }}
          />
        ))}
      </Stack>
    )}
  </Box>
);

// Helper to export the map area as PNG
const exportNodeToPng = async (node: HTMLElement, fileName: string) => {
  const blob = await htmlToImage.toBlob(node, { pixelRatio: 2 });
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

// ---------------- Page ----------------
const VoteHeatmapPage: React.FC<{ overlays?: BoundaryOverlays }> = ({ overlays }) => {
  const [counties, setCounties] = useState<County[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedCountyCode, setSelectedCountyCode] = useState<string>('');
  const [selectedConstCode, setSelectedConstCode] = useState<string>('');
  const [selectedWardCode, setSelectedWardCode] = useState<string>('');

  const [candidateId, setCandidateId] = useState<string>('');
  const [minVotes, setMinVotes] = useState<number>(0);
  const [kenyaBounds, setKenyaBounds] = useState<boolean>(true);
  const [boardroomMode, setBoardroomMode] = useState<boolean>(false);

  const [voteData, setVoteData] = useState<VoteDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // NEW: top-2 mode
  const [colorTopTwo, setColorTopTwo] = useState<boolean>(true);
  const [pointsTop1, setPointsTop1] = useState<VoteDataPoint[]>([]);
  const [pointsTop2, setPointsTop2] = useState<VoteDataPoint[]>([]);
  const [topLabels, setTopLabels] = useState<{ c1?: string; c2?: string }>({});

  const lsKey = useMemo(
    () => cacheKey(candidateId, selectedCountyCode, selectedConstCode, selectedWardCode, minVotes, kenyaBounds),
    [candidateId, selectedCountyCode, selectedConstCode, selectedWardCode, minVotes, kenyaBounds]
  );

  useEffect(() => {
    const cached = loadCumulative(lsKey);
    setVoteData(cached.points);
    setLoading(cached.points.length === 0);
  }, [lsKey]);

  // --- Filters data ---
  useEffect(() => {
    (async () => {
      try {
        const json = await getJSON<{ status: string; data: { county_code: string; county_name: string }[] }>(
          `${API_BASE}/get_counties.php`
        );
        if (json.status === 'success' && Array.isArray(json.data)) {
          setCounties(json.data.map((c) => ({ id: c.county_code, name: c.county_name, code: c.county_code })));
        } else setCounties([]);
      } catch (e: any) {
        console.error('Counties fetch error:', e?.message || e);
        setCounties([]);
      }
    })();
  }, []);

  useEffect(() => {
    setSelectedConstCode('');
    setSelectedWardCode('');
    setConstituencies([]);
    setWards([]);
    if (!selectedCountyCode) return;
    (async () => {
      try {
        const json = await getJSON<{ status: string; data: { const_code: string; constituency_name: string }[] }>(
          `${API_BASE}/get_constituencies.php?county_code=${encodeURIComponent(selectedCountyCode)}`
        );
        if (json.status === 'success' && Array.isArray(json.data)) {
          setConstituencies(
            json.data.map((r) => ({ id: r.const_code, name: r.constituency_name, county_code: selectedCountyCode }))
          );
        } else setConstituencies([]);
      } catch (e: any) {
        console.error('Constituencies fetch error:', e?.message || e);
        setConstituencies([]);
      }
    })();
  }, [selectedCountyCode]);

  useEffect(() => {
    setSelectedWardCode('');
    setWards([]);
    if (!selectedConstCode) return;
    (async () => {
      try {
        const json = await getJSON<{ status: string; data: { ward_code: string; ward_name: string }[] }>(
          `${API_BASE}/get_wards.php?const_code=${encodeURIComponent(selectedConstCode)}`
        );
        if (json.status === 'success' && Array.isArray(json.data)) {
          setWards(json.data.map((w) => ({ id: w.ward_code, name: w.ward_name, const_code: selectedConstCode })));
        } else setWards([]);
      } catch (e: any) {
        console.error('Wards fetch error:', e?.message || e);
        setWards([]);
      }
    })();
  }, [selectedConstCode]);

  // --- Fetch heatmap (with filters) + 5min refresh + cumulative merge ---
  const fetchVoteData = useCallback(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      setError(null);
      const qs = new URLSearchParams();
      if (candidateId) qs.set('candidate_id', String(candidateId));
      if (selectedCountyCode) qs.set('county_code', selectedCountyCode);
      if (minVotes > 0) qs.set('min_votes', String(minVotes));
      if (!kenyaBounds) qs.set('all', '1');
      if (selectedConstCode) qs.set('const_code', selectedConstCode);
      if (selectedWardCode) qs.set('ward_code', selectedWardCode);

      const url = `${HEATMAP_BASE}?${qs.toString()}`;
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      const ct = res.headers.get('content-type') || '';

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}. CT=${ct}. Body: ${body.slice(0, 120)}`);
      }
      if (!ct.includes('application/json')) {
        const body = await res.text().catch(() => '');
        throw new Error(`Expected JSON but got "${ct}". Body: ${body.slice(0, 120)}`);
      }

      const json = await res.json();
      const fresh = normalizeResponse(json);

      const filteredByConst = selectedConstCode ? fresh.filter((p) => p.const_code === selectedConstCode) : fresh;
      const filtered = selectedWardCode
        ? filteredByConst.filter((p) => (p.ward_code ? p.ward_code === selectedWardCode : true))
        : filteredByConst;

      // Build cumulative view (max vote_count per location key)
      const base = loadCumulative(lsKey).points;
      const cum: CumMap = new Map(base.map((p) => [toKey(p), p]));
      for (const p of filtered) {
        const k = toKey(p);
        const prev = cum.get(k);
        if (!prev) cum.set(k, p);
        else {
          cum.set(k, {
            latitude: prev.latitude,
            longitude: prev.longitude,
            const_code: prev.const_code ?? p.const_code,
            ward_code: prev.ward_code ?? p.ward_code,
            vote_count: Math.max(prev.vote_count, p.vote_count),
            turnout: prev.turnout ?? p.turnout,
            agent_phone: prev.agent_phone ?? p.agent_phone,
            label: prev.label ?? p.label,
            candidate_id: prev.candidate_id ?? p.candidate_id,
            candidate_name: prev.candidate_name ?? p.candidate_name,
          });
        }
      }

      const merged = Array.from(cum.values());
      setVoteData(merged);
      saveCumulative(lsKey, merged);
      setLastUpdated(new Date().toLocaleTimeString('en-KE'));

      // ---- NEW: compute top-2 splits from current filtered snapshot (not cumulative) ----
      if (colorTopTwo && filtered.some((p) => p.candidate_id)) {
        const totals = new Map<string, number>();
        const names = new Map<string, string | undefined>();
        for (const p of filtered) {
          if (!p.candidate_id) continue;
          totals.set(p.candidate_id, (totals.get(p.candidate_id) || 0) + p.vote_count);
          if (p.candidate_name && !names.has(p.candidate_id)) names.set(p.candidate_id, p.candidate_name);
        }
        const topTwo = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
        if (topTwo.length === 2) {
          const [c1, c2] = [topTwo[0][0], topTwo[1][0]];
          setPointsTop1(filtered.filter((p) => p.candidate_id === c1));
          setPointsTop2(filtered.filter((p) => p.candidate_id === c2));
          setTopLabels({
            c1: names.get(c1) || `Candidate ${c1}`,
            c2: names.get(c2) || `Candidate ${c2}`,
          });
        } else {
          setPointsTop1([]);
          setPointsTop2([]);
          setTopLabels({});
        }
      } else {
        setPointsTop1([]);
        setPointsTop2([]);
        setTopLabels({});
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch heatmap data.');
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [
    candidateId,
    selectedCountyCode,
    selectedConstCode,
    selectedWardCode,
    minVotes,
    kenyaBounds,
    lsKey,
    colorTopTwo,
  ]);

  useEffect(() => {
    fetchVoteData();
    const id = setInterval(fetchVoteData, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchVoteData]);

  const mapRef = useRef<HTMLDivElement | null>(null);

  const handleExport = async () => {
    if (mapRef.current) {
      await exportNodeToPng(mapRef.current, `iebc_heatmap_${new Date().toISOString().slice(0, 19)}.png`);
    }
  };

  // Use dynamic viewport units for mobile stability
  const mapHeight = boardroomMode ? 'calc(var(--vh, 1vh) * 82)' : 'calc(var(--vh, 1vh) * 68)';
  const useDual = colorTopTwo && pointsTop1.length > 0 && pointsTop2.length > 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Global fixes injected at runtime */}
      <GlobalStyles
        styles={`
          /* Stable viewport height across mobile browsers */
          :root { --vh: 1vh; }
          @supports (height: 100dvh) {
            :root { --vh: 1dvh; }
          }

          /* Prevent global responsive rules from warping Leaflet tiles/canvas */
          .leaflet-container img,
          .leaflet-container .leaflet-tile,
          .leaflet-container .leaflet-marker-icon,
          .leaflet-container .leaflet-marker-shadow { max-width: none !important; }
          .leaflet-container canvas { max-width: none !important; height: auto !important; }
        `}
      />

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant={boardroomMode ? 'h3' : 'h4'} sx={{ fontWeight: 700 }}>
          Kenya IEBC Vote Heatmap
        </Typography>
        <Stack direction="row" gap={1} alignItems="center">
          <Chip
            label="Boardroom Mode"
            color={boardroomMode ? 'primary' : 'default'}
            variant={boardroomMode ? 'filled' : 'outlined'}
          />
          <FormControlLabel
            control={<Switch checked={boardroomMode} onChange={(e) => setBoardroomMode(e.target.checked)} />}
            labelPlacement="start"
            label=""
          />
          <Tooltip title="Export current map view as PNG">
            <Button size="small" variant="outlined" onClick={handleExport}>
              Export PNG
            </Button>
          </Tooltip>
        </Stack>
      </Stack>
      {lastUpdated && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Last updated: {lastUpdated}
        </Typography>
      )}

      {/* ---- Filters ---- */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>County</InputLabel>
            <Select label="County" value={selectedCountyCode} onChange={(e) => setSelectedCountyCode(e.target.value)}>
              <MenuItem value="">
                <em>All Counties</em>
              </MenuItem>
              {counties.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small" disabled={!selectedCountyCode}>
            <InputLabel>Constituency</InputLabel>
            <Select
              label="Constituency"
              value={selectedConstCode}
              onChange={(e) => setSelectedConstCode(e.target.value)}
            >
              <MenuItem value="">
                <em>All Constituencies</em>
              </MenuItem>
              {constituencies.map((k) => (
                <MenuItem key={k.id} value={k.id}>
                  {k.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small" disabled={!selectedConstCode}>
            <InputLabel>Ward</InputLabel>
            <Select label="Ward" value={selectedWardCode} onChange={(e) => setSelectedWardCode(e.target.value)}>
              <MenuItem value="">
                <em>All Wards</em>
              </MenuItem>
              {wards.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            size="small"
            label="Candidate ID (optional)"
            type="number"
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            inputProps={{ min: 0 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            size="small"
            label="Min votes"
            type="number"
            value={minVotes}
            onChange={(e) => setMinVotes(Math.max(0, Number(e.target.value) || 0))}
            inputProps={{ min: 0 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={<Switch checked={kenyaBounds} onChange={(e) => setKenyaBounds(e.target.checked)} />}
            label="Kenya bounds only"
          />
        </Grid>

        {/* NEW: toggle for top-2 colouring */}
        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={<Switch checked={colorTopTwo} onChange={(e) => setColorTopTwo(e.target.checked)} />}
            label="Color top-2 (blue/yellow)"
          />
        </Grid>

        <Grid item xs={12} sm="auto">
          <Button variant="outlined" onClick={fetchVoteData}>
            Apply / Refresh
          </Button>
        </Grid>

        <Grid item xs={12} sm="auto">
          <Button
            variant="text"
            onClick={() => {
              setSelectedCountyCode('');
              setSelectedConstCode('');
              setSelectedWardCode('');
              setCandidateId('');
              setMinVotes(0);
              setKenyaBounds(true);
            }}
          >
            Clear filters
          </Button>
        </Grid>
      </Grid>

      {error && (
        <MuiAlert severity="warning" sx={{ mb: 2 }}>
          {error}
          <Box sx={{ mt: 1 }}>
            <Button size="small" variant="outlined" onClick={fetchVoteData}>
              Retry now
            </Button>
          </Box>
        </MuiAlert>
      )}

      {/* ---- Map ---- */}
      <Box
        ref={mapRef}
        sx={{ position: 'relative', height: mapHeight, borderRadius: 1, overflow: 'hidden', boxShadow: 1 }}
      >
        <MapContainer
          style={{ height: '100%', width: '100%' }}
          bounds={KENYA_BOUNDS}
          maxBounds={kenyaBounds ? KENYA_BOUNDS : undefined}
          scrollWheelZoom={true}
          zoomControl={true}
          preferCanvas
        >
          {/* Force layout recompute when UI size-affecting state changes */}
          <InvalidateOnResize deps={[boardroomMode, kenyaBounds]} />

          <FitKenya restrict={kenyaBounds} />
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <LayersControl position="topright">
            {useDual ? (
              <>
                <LayersControl.Overlay checked name={`${topLabels.c1 || 'Top 1'} (Blue)`}>
                  <HeatLayer
                    points={pointsTop1}
                    radius={boardroomMode ? 24 : 18}
                    blur={boardroomMode ? 28 : 22}
                    gradient={BLUE_GRADIENT}
                    minOpacity={0.18}
                  />
                </LayersControl.Overlay>
                <LayersControl.Overlay checked name={`${topLabels.c2 || 'Top 2'} (Yellow)`}>
                  <HeatLayer
                    points={pointsTop2}
                    radius={boardroomMode ? 24 : 18}
                    blur={boardroomMode ? 28 : 22}
                    gradient={YELLOW_GRADIENT}
                    minOpacity={0.18}
                  />
                </LayersControl.Overlay>
              </>
            ) : (
              <LayersControl.Overlay checked name="Heatmap">
                {/* Heat intensity uses log scaling for clear boardroom contrast */}
                <HeatLayer points={voteData} radius={boardroomMode ? 24 : 18} blur={boardroomMode ? 28 : 22} />
              </LayersControl.Overlay>
            )}

            {/* Hover tooltips (turnout + agent phone) */}
            <LayersControl.Overlay checked name="Point hover (turnout & agent)">
              <InteractiveDots
                points={useDual ? [...pointsTop1, ...pointsTop2] : voteData}
                minZoom={9} // render tooltips only when zoomed in
                cap={4000} // safety cap for DOM performance
                showAgentPhone // toggle off to hide numbers
                maskAgentPhone // mask by default; remove if you want full numbers
                radius={6}
              />
            </LayersControl.Overlay>

            {overlays?.counties && (
              <LayersControl.Overlay name="County Boundaries">
                <GeoJSON data={overlays.counties as any} style={{ color: '#2b8a3e', weight: 1, fillOpacity: 0 }} />
              </LayersControl.Overlay>
            )}

            {overlays?.constituencies && (
              <LayersControl.Overlay name="Constituencies">
                <GeoJSON data={overlays.constituencies as any} style={{ color: '#1f6feb', weight: 0.8, fillOpacity: 0 }} />
              </LayersControl.Overlay>
            )}

            {overlays?.wards && (
              <LayersControl.Overlay name="Wards">
                <GeoJSON data={overlays.wards as any} style={{ color: '#f59e0b', weight: 0.6, fillOpacity: 0 }} />
              </LayersControl.Overlay>
            )}
          </LayersControl>
        </MapContainer>
        <Legend mode={useDual ? 'dual' : 'single'} labels={topLabels} />

        {/* Optional: small progress overlay while loading */}
        {loading && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <CircularProgress />
          </Box>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Notes: Heat intensity is relative to the current filter scope. For IEBC reporting, pair with turnout/registered
        voter overlays for richer insights.
      </Typography>
    </Box>
  );
};

export default VoteHeatmapPage;
