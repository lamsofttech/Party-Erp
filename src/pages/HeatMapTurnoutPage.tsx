// src/pages/HeatMapTurnoutPage.tsx
// Kenya IEBC Turnout Heatmap – production-ready React (Leaflet)
// - POSTs to get_turmnout_heatmap.php (wards → const → county)
// - Heatmap (if API returns lat/lng) or Choropleth fallback via ward GeoJSON
// - Kenya bounds, Boardroom Mode, Legend, PNG export, KPIs

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "@mui/material";
import {
  MapContainer,
  TileLayer,
  useMap,
  GeoJSON,
  LayersControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import * as htmlToImage from "html-to-image";

// ========= Config =========
const API_BASE = "https://skizagroundsuite.com/API";
const TURNOUT_BASE = `${API_BASE}/get_turmnout_heatmap.php`; // POST endpoint

// ========= Types =========
type TurnoutDataPoint = {
  latitude?: number; // heatmap if provided
  longitude?: number;
  turnout: number; // summed per ward (absolute)
  const_code?: string;
  ward_code?: string; // maps API caw_code → ward_code
};

type BoundaryOverlays = {
  counties?: GeoJSON.FeatureCollection;
  constituencies?: GeoJSON.FeatureCollection;
  wards?: GeoJSON.FeatureCollection; // needed for choropleth fallback
};

type County = { id: string; name: string; code: string };
type Constituency = { id: string; name: string; county_code: string };
type Ward = { id: string; name: string; const_code: string };

// ========= Small utils =========
const KENYA_BOUNDS: L.LatLngBoundsExpression = [
  [-4.9, 33.9],
  [5.2, 41.9],
];

const toKey = (p: TurnoutDataPoint) =>
  (p.const_code?.trim() || "") +
  "|" +
  (p.ward_code?.trim() || "") +
  "|" +
  (Number.isFinite(p.latitude as number) && Number.isFinite(p.longitude as number)
    ? `${(p.latitude as number).toFixed(5)},${(p.longitude as number).toFixed(5)}`
    : "POLY");

const normalizeTurnoutResponse = (
  json: any
): { wards: TurnoutDataPoint[]; hasLatLng: boolean } => {
  const rows: any[] = Array.isArray(json?.wards)
    ? json.wards
    : Array.isArray(json?.data)
    ? json.data
    : [];
  let hasLatLng = false;

  const points = rows
    .map((r): TurnoutDataPoint | null => {
      const turnout = Number(r.turnout ?? r.turnout_sum ?? 0);
      const const_code = r.const_code ?? r.constituency_code ?? undefined;
      const ward_code = r.caw_code ?? r.ward_code ?? undefined;

      const lat = r.latitude ?? r.lat;
      const lng = r.longitude ?? r.lng ?? r.lon;
      const latitude = lat !== undefined ? Number(lat) : undefined;
      const longitude = lng !== undefined ? Number(lng) : undefined;

      if (latitude !== undefined && longitude !== undefined) {
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) hasLatLng = true;
      }

      return {
        latitude: Number.isFinite(latitude as number) ? (latitude as number) : undefined,
        longitude: Number.isFinite(longitude as number) ? (longitude as number) : undefined,
        turnout: Number.isFinite(turnout) ? turnout : 0,
        const_code: typeof const_code === "string" ? const_code : undefined,
        ward_code: typeof ward_code === "string" ? ward_code : undefined,
      };
    })
    .filter((x): x is TurnoutDataPoint => x !== null);

  return { wards: points, hasLatLng };
};

const getJSON = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { method: "GET" });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url}. CT=${ct}. Body: ${body.slice(0, 120)}`);
  }
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Expected JSON at ${url}, got ${ct}. Body: ${text.slice(0, 120)}`);
    }
  }
  return res.json();
};

// Cumulative cache (24h)
const LS_TTL_MS = 24 * 60 * 60 * 1000;
const cacheKey = (
  countyCode: string,
  constCode: string,
  wardCode: string,
  minTurnout: number,
  kenyaBounds: boolean
) =>
  `TURNOUT_HEATMAP_CUM_V3|county=${countyCode || "ALL"}|const=${
    constCode || "ALL"
  }|ward=${wardCode || "ALL"}|min=${minTurnout}|bounds=${kenyaBounds ? "KE" : "ALL"}`;

const loadCumulative = (key: string): { points: TurnoutDataPoint[]; ts: number } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { points: [], ts: 0 };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.points) || typeof parsed.ts !== "number")
      return { points: [], ts: 0 };
    if (Date.now() - parsed.ts > LS_TTL_MS) return { points: [], ts: 0 };
    return parsed;
  } catch {
    return { points: [], ts: 0 };
  }
};

const saveCumulative = (key: string, points: TurnoutDataPoint[]) => {
  try {
    localStorage.setItem(key, JSON.stringify({ points, ts: Date.now() }));
  } catch {}
};

// ========= Map helpers =========
type HeatLayerProps = {
  points: TurnoutDataPoint[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
};

function HeatLayer({ points, radius = 18, blur = 22, maxZoom = 12 }: HeatLayerProps) {
  const map = useMap();
  const layerRef = useRef<ReturnType<typeof L.heatLayer> | null>(null);
  const styleKey = `${radius}|${blur}|${maxZoom}`;

  const heatData = useMemo(() => {
    const max = Math.max(1, ...points.map((p) => p.turnout));
    return points
      .filter(
        (p) => Number.isFinite(p.latitude as number) && Number.isFinite(p.longitude as number)
      )
      .map(
        (p) =>
          [
            p.latitude as number,
            p.longitude as number,
            Math.log1p(p.turnout) / Math.log1p(max),
          ] as [number, number, number]
      );
  }, [points]);

  // Recreate layer when style changes
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.removeFrom(map);
      layerRef.current = null;
    }
    layerRef.current = (L as any).heatLayer(heatData, { radius, blur, maxZoom }).addTo(map);
    return () => {
      layerRef.current?.removeFrom(map);
      layerRef.current = null;
    };
  }, [map, styleKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update data only
  useEffect(() => {
    layerRef.current?.setLatLngs(heatData);
  }, [heatData]);

  return null;
}

function FitKenya({ restrict }: { restrict: boolean }) {
  const map = useMap();
  useEffect(() => {
    // Fit once on mount / when flag flips
    map.fitBounds(KENYA_BOUNDS, { padding: [20, 20] });

    if (restrict) {
      // pass bounds directly (already a LatLngBoundsExpression)
      map.setMaxBounds(KENYA_BOUNDS);
      map.setMinZoom(5);
    } else {
      // clear max bounds (Leaflet accepts null; cast once to satisfy TS)
      (map as unknown as { setMaxBounds: (b: L.LatLngBoundsExpression | null) => void })
        .setMaxBounds(null);
      map.setMinZoom(2);
    }
  }, [map, restrict]);
  return null;
}

// Choropleth styling
const CHORO_COLORS = [
  "#fff5f0",
  "#fee0d2",
  "#fcbba1",
  "#fc9272",
  "#fb6a4a",
  "#ef3b2c",
  "#cb181d",
  "#99000d",
];
const choroplethColor = (v: number, max: number) => {
  if (max <= 0) return CHORO_COLORS[0];
  const t = v / max;
  const idx = Math.min(CHORO_COLORS.length - 1, Math.floor(t * (CHORO_COLORS.length - 1)));
  return CHORO_COLORS[idx];
};

function LegendChoropleth({ max }: { max: number }) {
  return (
    <Box
      sx={{
        position: "absolute",
        right: 12,
        bottom: 12,
        background: "rgba(255,255,255,0.9)",
        p: 1.2,
        borderRadius: 1,
        boxShadow: 1,
        fontSize: 12,
        lineHeight: 1.2,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Turnout (absolute)</div>
      <Stack direction="row" gap={0.5} alignItems="center">
        {CHORO_COLORS.map((c) => (
          <Box key={c} sx={{ width: 28, height: 10, background: c, border: "1px solid #ddd" }} />
        ))}
      </Stack>
      <div style={{ marginTop: 4 }}>0 → {max.toLocaleString("en-KE")}</div>
    </Box>
  );
}

function LegendHeat() {
  return (
    <Box
      sx={{
        position: "absolute",
        right: 12,
        bottom: 12,
        background: "rgba(255,255,255,0.9)",
        p: 1.2,
        borderRadius: 1,
        boxShadow: 1,
        fontSize: 12,
        lineHeight: 1.2,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Intensity (relative)</div>
      <Stack direction="row" gap={0.5} alignItems="center">
        {["#00f", "#0f0", "#ff0", "#f80", "#f00"].map((c) => (
          <Box key={c} sx={{ width: 36, height: 10, background: c, border: "1px solid #ddd" }} />
        ))}
      </Stack>
    </Box>
  );
}

// ========= Page =========
function HeatMapTurnoutPage({ overlays }: { overlays?: BoundaryOverlays }) {
  const [counties, setCounties] = useState<County[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedCountyCode, setSelectedCountyCode] = useState<string>("");
  const [selectedConstCode, setSelectedConstCode] = useState<string>("");
  const [selectedWardCode, setSelectedWardCode] = useState<string>("");

  const [minTurnout, setMinTurnout] = useState<number>(0);
  const [kenyaBounds, setKenyaBounds] = useState<boolean>(true);
  const [boardroomMode, setBoardroomMode] = useState<boolean>(false);

  const [turnoutPoints, setTurnoutPoints] = useState<TurnoutDataPoint[]>([]);
  const [choroplethMap, setChoroplethMap] = useState<Map<string, number>>(new Map()); // ward_code -> turnout
  const [hasLatLng, setHasLatLng] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const lsKey = useMemo(
    () =>
      cacheKey(
        selectedCountyCode,
        selectedConstCode,
        selectedWardCode,
        minTurnout,
        kenyaBounds
      ),
    [selectedCountyCode, selectedConstCode, selectedWardCode, minTurnout, kenyaBounds]
  );

  // Load LS cumulative
  useEffect(() => {
    const cached = loadCumulative(lsKey);
    setTurnoutPoints(cached.points);
    setLoading(cached.points.length === 0);
  }, [lsKey]);

  // Filters data
  useEffect(() => {
    (async () => {
      try {
        const json = await getJSON<{
          status: string;
          data: { county_code: string; county_name: string }[];
        }>(`${API_BASE}/get_counties.php`);
        if (json.status === "success" && Array.isArray(json.data)) {
          setCounties(
            json.data.map((c) => ({
              id: c.county_code,
              name: c.county_name,
              code: c.county_code,
            }))
          );
        } else setCounties([]);
      } catch {
        setCounties([]);
      }
    })();
  }, []);

  useEffect(() => {
    setSelectedConstCode("");
    setSelectedWardCode("");
    setConstituencies([]);
    setWards([]);
    if (!selectedCountyCode) return;
    (async () => {
      try {
        const json = await getJSON<{
          status: string;
          data: { const_code: string; constituency_name: string }[];
        }>(`${API_BASE}/get_constituencies.php?county_code=${encodeURIComponent(selectedCountyCode)}`);
        if (json.status === "success" && Array.isArray(json.data)) {
          setConstituencies(
            json.data.map((r) => ({
              id: r.const_code,
              name: r.constituency_name,
              county_code: selectedCountyCode,
            }))
          );
        } else setConstituencies([]);
      } catch {
        setConstituencies([]);
      }
    })();
  }, [selectedCountyCode]);

  useEffect(() => {
    setSelectedWardCode("");
    setWards([]);
    if (!selectedConstCode) return;
    (async () => {
      try {
        const json = await getJSON<{
          status: string;
          data: { ward_code: string; ward_name: string }[];
        }>(`${API_BASE}/get_wards.php?const_code=${encodeURIComponent(selectedConstCode)}`);
        if (json.status === "success" && Array.isArray(json.data)) {
          setWards(
            json.data.map((w) => ({
              id: w.ward_code,
              name: w.ward_name,
              const_code: selectedConstCode,
            }))
          );
        } else setWards([]);
      } catch {
        setWards([]);
      }
    })();
  }, [selectedConstCode]);

  // Fetch turnout (POST) + 5-min refresh
  const reqIdRef = useRef(0);
  const fetchTurnoutData = useCallback(async () => {
    const myId = ++reqIdRef.current;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      setError(null);

      const body: any = { min_turnout: Math.max(0, Number(minTurnout) || 0) };
      if (selectedCountyCode) body.county_code = selectedCountyCode;
      if (selectedConstCode) body.const_code = selectedConstCode;
      if (selectedWardCode) body.caw_code = selectedWardCode;

      const res = await fetch(TURNOUT_BASE, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new Error(
          `HTTP ${res.status}. CT=${ct}. Body: ${bodyText.slice(0, 160)}`
        );
      }

      const json = ct.includes("json") ? await res.json() : JSON.parse(await res.text());
      const { wards: freshRows, hasLatLng: apiHasLatLng } = normalizeTurnoutResponse(json);

      // Build choropleth map (ward_code -> turnout)
      const wardToTurnout = new Map<string, number>();
      for (const r of freshRows) {
        if (r.ward_code)
          wardToTurnout.set(
            r.ward_code,
            (wardToTurnout.get(r.ward_code) || 0) + r.turnout
          );
      }
      setChoroplethMap(wardToTurnout);

      // Cumulative merge for points
      const base = loadCumulative(lsKey).points;
      const cum = new Map<string, TurnoutDataPoint>(base.map((p) => [toKey(p), p]));
      for (const p of freshRows) {
        const k = toKey(p);
        const prev = cum.get(k);
        if (!prev) cum.set(k, p);
        else {
          cum.set(k, {
            latitude: prev.latitude ?? p.latitude,
            longitude: prev.longitude ?? p.longitude,
            const_code: prev.const_code ?? p.const_code,
            ward_code: prev.ward_code ?? p.ward_code,
            turnout: Math.max(prev.turnout, p.turnout),
          });
        }
      }
      const merged = Array.from(cum.values());

      if (reqIdRef.current !== myId) return; // ignore stale
      setHasLatLng(
        apiHasLatLng &&
          merged.some(
            (p) =>
              Number.isFinite(p.latitude as number) && Number.isFinite(p.longitude as number)
          )
      );
      setTurnoutPoints(merged);
      saveCumulative(lsKey, merged);
      setLastUpdated(new Date().toLocaleTimeString("en-KE"));
    } catch (e: any) {
      setError(e?.message || "Failed to fetch turnout data.");
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [selectedCountyCode, selectedConstCode, selectedWardCode, minTurnout, lsKey]);

  useEffect(() => {
    fetchTurnoutData();
    const id = setInterval(fetchTurnoutData, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchTurnoutData]);

  // Export PNG
  const mapRef = useRef<HTMLDivElement | null>(null);
  const handleExport = async () => {
    if (!mapRef.current) return;
    const blob = await htmlToImage.toBlob(mapRef.current, {
      pixelRatio: 2,
      cacheBust: true,
    });
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iebc_turnout_${hasLatLng ? "heatmap" : "choropleth"}_${new Date()
      .toISOString()
      .slice(0, 19)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: "grid", placeItems: "center", minHeight: "40vh" }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading turnout data…
        </Typography>
      </Box>
    );
  }

  const mapHeight = boardroomMode ? "82vh" : "68vh";

  // KPIs
  const totalTurnout = turnoutPoints.reduce(
    (s, p) => s + (Number.isFinite(p.turnout) ? p.turnout : 0),
    0
  );
  const wardsCount = choroplethMap.size || turnoutPoints.filter((p) => p.ward_code).length;
  const avgTurnoutPerWard = wardsCount ? Math.round(totalTurnout / wardsCount) : 0;

  // Choropleth scale
  const choroMax = choroplethMap.size
    ? Math.max(...Array.from(choroplethMap.values()))
    : 0;

  // Ward code extractor for GeoJSON
  const getFeatureWardCode = (feat: any): string | undefined => {
    const p = feat?.properties || {};
    return (
      p.caw_code ??
      p.ward_code ??
      p.WARD_CODE ??
      p.WARD_ID ??
      p.WARDID ??
      p.CAW_CODE ??
      undefined
    );
  };

  // Choropleth styles
  const wardStyle = (feat: any) => {
    const code = getFeatureWardCode(feat);
    const v = code ? choroplethMap.get(String(code)) || 0 : 0;
    const fill = choroplethColor(v, choroMax);
    return {
      color: "#555",
      weight: 0.6,
      fillColor: fill,
      fillOpacity: 0.75,
    } as L.PathOptions;
  };

  const onEachWard = (feat: any, layer: L.Layer) => {
    const code = getFeatureWardCode(feat) || "—";
    const v = choroplethMap.get(String(code)) || 0;
    const name = feat?.properties?.ward_name ?? feat?.properties?.WARD_NAME ?? "Ward";
    (layer as any).bindTooltip?.(
      `${name} (${code}) • Turnout: ${v.toLocaleString("en-KE")}`,
      { sticky: true, direction: "top" }
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Typography variant={boardroomMode ? "h3" : "h4"} sx={{ fontWeight: 700 }}>
          Kenya IEBC Turnout {hasLatLng ? "Heatmap" : "Choropleth"}
        </Typography>
        <Stack direction="row" gap={1} alignItems="center">
          <Chip
            label="Boardroom Mode"
            color={boardroomMode ? "primary" : "default"}
            variant={boardroomMode ? "filled" : "outlined"}
          />
          <FormControlLabel
            control={
              <Switch
                checked={boardroomMode}
                onChange={(e) => setBoardroomMode(e.target.checked)}
              />
            }
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

      {/* KPIs */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
        <Chip
          label={`Total Turnout: ${totalTurnout.toLocaleString("en-KE")}`}
          variant="filled"
          color="primary"
        />
        <Chip label={`Wards: ${wardsCount.toLocaleString("en-KE")}`} variant="outlined" />
        <Chip
          label={`Avg/Ward: ${avgTurnoutPerWard.toLocaleString("en-KE")}`}
          variant="outlined"
        />
        {lastUpdated && <Chip label={`Updated: ${lastUpdated}`} variant="outlined" />}
      </Stack>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>County</InputLabel>
            <Select
              label="County"
              value={selectedCountyCode}
              onChange={(e) => setSelectedCountyCode(e.target.value)}
            >
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
            <Select
              label="Ward"
              value={selectedWardCode}
              onChange={(e) => setSelectedWardCode(e.target.value)}
            >
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
            label="Min turnout (≥)"
            type="number"
            value={minTurnout}
            onChange={(e) => setMinTurnout(Math.max(0, Number(e.target.value) || 0))}
            inputProps={{ min: 0 }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3} sx={{ display: "flex", alignItems: "center" }}>
          <FormControlLabel
            control={
              <Switch
                checked={kenyaBounds}
                onChange={(e) => setKenyaBounds(e.target.checked)}
              />
            }
            label="Kenya bounds only"
          />
        </Grid>

        <Grid item xs={12} sm="auto">
          <Button variant="outlined" onClick={fetchTurnoutData}>
            Apply / Refresh
          </Button>
        </Grid>

        <Grid item xs={12} sm="auto">
          <Button
            variant="text"
            onClick={() => {
              setSelectedCountyCode("");
              setSelectedConstCode("");
              setSelectedWardCode("");
              setMinTurnout(0);
              setKenyaBounds(true);
              localStorage.removeItem(lsKey);
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
            <Button size="small" variant="outlined" onClick={fetchTurnoutData}>
              Retry now
            </Button>
          </Box>
        </MuiAlert>
      )}

      {/* Map */}
      <Box
        ref={mapRef}
        sx={{
          position: "relative",
          height: mapHeight,
          borderRadius: 1,
          overflow: "hidden",
          boxShadow: 1,
        }}
      >
        <MapContainer
          style={{ height: "100%", width: "100%" }}
          bounds={KENYA_BOUNDS}
          maxBounds={kenyaBounds ? KENYA_BOUNDS : undefined}
          scrollWheelZoom
          zoomControl
          preferCanvas
        >
          <FitKenya restrict={kenyaBounds} />
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            crossOrigin="anonymous"
          />

          <LayersControl position="topright">
            {hasLatLng && (
              <LayersControl.Overlay checked name="Turnout Heatmap">
                <HeatLayer
                  points={turnoutPoints}
                  radius={boardroomMode ? 24 : 18}
                  blur={boardroomMode ? 28 : 22}
                />
              </LayersControl.Overlay>
            )}

            {!hasLatLng && overlays?.wards && (
              <LayersControl.Overlay checked name="Turnout Choropleth (Wards)">
                <GeoJSON
                  data={overlays.wards as any}
                  style={wardStyle as any}
                  onEachFeature={onEachWard as any}
                />
              </LayersControl.Overlay>
            )}

            {overlays?.counties && (
              <LayersControl.Overlay name="County Boundaries">
                <GeoJSON
                  data={overlays.counties as any}
                  style={{ color: "#2b8a3e", weight: 1, fillOpacity: 0 }}
                />
              </LayersControl.Overlay>
            )}

            {overlays?.constituencies && (
              <LayersControl.Overlay name="Constituencies">
                <GeoJSON
                  data={overlays.constituencies as any}
                  style={{ color: "#1f6feb", weight: 0.8, fillOpacity: 0 }}
                />
              </LayersControl.Overlay>
            )}
          </LayersControl>
        </MapContainer>

        {hasLatLng ? <LegendHeat /> : <LegendChoropleth max={choroMax} />}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        Notes: Heatmap mode activates when the API sends ward centroids (lat/lng). Otherwise we
        render a choropleth by ward code. Use KPIs + color scale for quick boardroom decisions.
      </Typography>
    </Box>
  );
}

export default HeatMapTurnoutPage;
