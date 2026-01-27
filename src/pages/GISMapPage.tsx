// src/pages/GISMapPage.tsx (enhanced - cleaned)
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, IconButton, Drawer, List, ListItem,
  ListItemText, ListItemIcon, Divider, Slider, Tooltip, Switch, FormControlLabel, ListItemButton,
  ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  Map as MapIcon,
  Layers as LayersIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  BarChart as BarChartIcon,
  PinDrop as PinDropIcon,
  FilterAlt as FilterAltIcon,
  ArrowBack as ArrowBackIcon,
  Visibility,
  VisibilityOff,
  Whatshot as WhatshotIcon,
  Insights as InsightsIcon,
  CenterFocusStrong as CenterFocusStrongIcon
} from '@mui/icons-material';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { useLocation, useNavigate } from 'react-router-dom';

// Leaflet
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMapEvents,
  Tooltip as LeafletTooltip,
} from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Token-free heatmap wrapper (uses leaflet.heat under the hood)
import LeafletHeatmap from '../components/LeafletHeatmap';

// ===== API config =====
const API_BASE = 'https://skizagroundsuite.com/API';
const VOTERS_API = `${API_BASE}/get_registered_voters.php`;
const PRES_2022_API = `${API_BASE}/get_presidential_results_2022.php`; // <-- implement on backend

type Year = '2017' | '2022' | '2027';

type MapLayerType = 'heatmap' | 'bubbles';

interface MapLayer {
  id: string;
  name: string;
  type: MapLayerType;
  source: string;
  visible: boolean;
}

const formatInt = (n: number) => Number(n || 0).toLocaleString();
const formatPct = (n: number) => `${(Number(n || 0)).toFixed(2)}%`;

// ===== Types for Presidential 2022 API =====
interface PresResultRow {
  code: string;            // county/constituency/ward code
  name: string;            // display name
  level: 'county' | 'constituency' | 'ward';
  latitude: number;        // centroid lat
  longitude: number;       // centroid lng
  voters_2022?: number | null; // optional for turnout calc
  odinga: number;
  ruto: number;
  mwaure: number;
  wajackoyah: number;
  valid: number;
  rejected: number;
}

// Metric to visualize for bubble size / tooltip emphasis
type PresMetric = 'lead_pct' | 'ruto_pct' | 'odinga_pct' | 'turnout' | 'valid_votes';

const GISMapPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialLevel = () => {
    const params = new URLSearchParams(location.search);
    return (params.get('level') || 'county') as 'county' | 'constituency' | 'ward';
  };
  const getInitialLayer = () => {
    const params = new URLSearchParams(location.search);
    return params.get('layer');
  };

  // Leaflet view (lat, lng) — Kenya
  const center: LatLngExpression = [-0.0236, 37.9062];
  const [zoom, setZoom] = useState<number>(6);

  // HEATMAP controls
  const [heatIntensity, setHeatIntensity] = useState<number>(1.25);
  const [heatRadius, setHeatRadius] = useState<number>(35);
  const [showPointOutlines, setShowPointOutlines] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<Year>('2022');

  // ===== New: Presidential 2022 analysis controls =====
  const [presMetric, setPresMetric] = useState<PresMetric>('lead_pct');
  const [bubbleScale, setBubbleScale] = useState<number>(1.0); // affects circle radius

  // Layers
  const [mapLayers, setMapLayers] = useState<MapLayer[]>([
    {
      id: 'voter-heatmap',
      name: 'Registered Voters (Heatmap)',
      type: 'heatmap',
      source: 'voters-api',
      visible: true,
    },
    {
      id: 'incidents-heatmap',
      name: 'Incident Hotspots (Heatmap)',
      type: 'heatmap',
      source: 'incidents-source',
      visible: false,
    },
    {
      id: 'pres-2022-bubbles',
      name: 'Presidential 2022 (Bubbles)',
      type: 'bubbles',
      source: 'pres-2022-api',
      visible: false,
    },
  ]);

  const [currentLevel, setCurrentLevel] = useState<'county' | 'constituency' | 'ward'>(getInitialLevel());

  // ===== Live voters rows from API =====
  const [voterRows, setVoterRows] = useState<any[]>([]);

  // Fetch voters (live) — POINTS ONLY (latitude/longitude)
  useEffect(() => {
    const lvl = currentLevel;
    const url = `${VOTERS_API}?level=${encodeURIComponent(lvl)}&limit=5000`;
    (async () => {
      try {
        const res = await fetch(url);
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : [];
        // Keep only rows that have valid lat/lng
        setVoterRows(rows.filter((r: any) =>
          Number.isFinite(r?.latitude) && Number.isFinite(r?.longitude)
        ));
        // reasonable zoom per level
        if (lvl === 'county') setZoom(5.5);
        else if (lvl === 'constituency') setZoom(8);
        else setZoom(10);
      } catch {
        setVoterRows([]);
      }
    })();
  }, [currentLevel]);

  // ===== NEW: Presidential 2022 rows from API =====
  const [presRows, setPresRows] = useState<PresResultRow[]>([]);
  // we only set this; we don't read it, so avoid TS6133 by omitting the first tuple item
  const [, setPresLoading] = useState<boolean>(false);

  const fetchPresidentialResults = async (lvl: 'county'|'constituency'|'ward') => {
    setPresLoading(true);
    try {
      const url = `${PRES_2022_API}?level=${encodeURIComponent(lvl)}&limit=5000`;
      const res = await fetch(url);
      const json = await res.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      const cleaned: PresResultRow[] = rows.filter((r: any) =>
        Number.isFinite(r?.latitude) && Number.isFinite(r?.longitude)
      ).map((r: any) => ({
        code: String(r.code),
        name: String(r.name),
        level: (r.level ?? lvl) as PresResultRow['level'],
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        voters_2022: r?.voters_2022 != null ? Number(r.voters_2022) : null,
        odinga: Number(r.odinga) || 0,
        ruto: Number(r.ruto) || 0,
        mwaure: Number(r.mwaure) || 0,
        wajackoyah: Number(r.wajackoyah) || 0,
        valid: Number(r.valid) || 0,
        rejected: Number(r.rejected) || 0,
      }));
      setPresRows(cleaned);
    } catch (e) {
      setPresRows([]);
    } finally {
      setPresLoading(false);
    }
  };

  // Auto-fetch when layer becomes visible or level changes
  useEffect(() => {
    const isPresVisible = mapLayers.find(l => l.id === 'pres-2022-bubbles')?.visible;
    if (isPresVisible) {
      fetchPresidentialResults(currentLevel);
      // scale up map when enabling analysis
      if (currentLevel === 'county') setZoom(6);
      if (currentLevel === 'constituency') setZoom(8.5);
      if (currentLevel === 'ward') setZoom(11);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLayers, currentLevel]);

  // Incident points (demo)
  const incidentPoints = [
    { id: 'inc1', lat: -1.2921, lng: 36.8172, severity: 8, description: 'Protest in CBD' },
    { id: 'inc2', lat: -4.0437, lng: 39.6682, severity: 5, description: 'Minor disruption at rally' },
    { id: 'inc3', lat: -0.1022, lng: 34.7679, severity: 3, description: 'Road closure' },
    { id: 'inc4', lat: -1.22, lng: 36.76, severity: 6, description: 'Local meeting dispute' },
  ];

  // Year helper
  const getVotersForYear = (row: any, y: Year) => {
    if (y === '2017') return Number(row?.voters_2017) || 0;
    if (y === '2027') return Number(row?.voters_2027) || 0; // may be null at some levels
    return Number(row?.voters_2022) || 0; // default 2022
  };

  // Heatmap inputs from LIVE voters API (log-scaled intensity)
  type HeatPoint = { lat: number; lng: number; intensity: number; raw?: any };

  const voterHeatPoints: HeatPoint[] = useMemo(() => {
    const rows = voterRows;
    const vals = rows.map((r) => getVotersForYear(r, selectedYear));
    const max = Math.max(1, ...vals);

    return rows.map((r) => {
      const v = getVotersForYear(r, selectedYear);
      const intensity = Math.log1p(v) / Math.log1p(max); // higher voters → higher intensity
      return { lat: Number(r.latitude), lng: Number(r.longitude), intensity, raw: r };
    });
  }, [voterRows, selectedYear]);

  const incidentHeatPoints: HeatPoint[] = useMemo(() => {
    return incidentPoints.map((f) => {
      const v = Math.max(0.1, Math.min(1, (f.severity ?? 1) / 10));
      return { lat: f.lat, lng: f.lng, intensity: v, raw: f };
    });
  }, []);

  // ?layer= handling — only show that layer if provided
  useEffect(() => {
    const initialLayer = getInitialLayer();
    if (initialLayer) {
      setMapLayers((prev) =>
        prev.map((l) => (l.id === initialLayer ? { ...l, visible: true } : { ...l, visible: false }))
      );
    }
  }, []);

  const onLayerToggle = (id: string) => {
    setMapLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  };

  // ===== Helpers for presidential metrics =====
  const winnerOf = (r: PresResultRow) => {
    const entries = [
      { key: 'Ruto', val: r.ruto },
      { key: 'Odinga', val: r.odinga },
      { key: 'Mwaure', val: r.mwaure },
      { key: 'Wajackoyah', val: r.wajackoyah },
    ];
    entries.sort((a, b) => b.val - a.val);
    return entries[0].key as 'Ruto' | 'Odinga' | 'Mwaure' | 'Wajackoyah';
  };

  const leadPctOf = (r: PresResultRow) => {
    const total = Math.max(1, r.valid);
    const lead = Math.abs(r.ruto - r.odinga);
    return (lead / total) * 100;
  };
  const pct = (part: number, total: number) => (Math.max(0, part) / Math.max(1, total)) * 100;
  const turnoutPct = (r: PresResultRow) => {
    if (!r.voters_2022) return 0;
    const totalCast = Math.max(0, r.valid + r.rejected);
    return pct(totalCast, r.voters_2022);
  };

  const colorForWinner = (r: PresResultRow) => {
    const w = winnerOf(r);
    if (w === 'Ruto') return '#f2c200'; // UDA-ish yellow
    if (w === 'Odinga') return theme.palette.primary.main; // Azimio-ish blue
    if (w === 'Mwaure') return theme.palette.success.main;
    return theme.palette.secondary.main; // Wajackoyah
  };

  // Bubble size = function(presMetric)
  const bubbleRadius = (r: PresResultRow) => {
    const total = Math.max(1, r.valid);
    let base = 8; // default
    switch (presMetric) {
      case 'valid_votes':
        base = Math.sqrt(total) / 20; // proportionate to votes
        break;
      case 'lead_pct':
        base = 6 + leadPctOf(r) / 4; // 6 → ~31 depending on margin
        break;
      case 'ruto_pct':
        base = 6 + pct(r.ruto, total) / 4;
        break;
      case 'odinga_pct':
        base = 6 + pct(r.odinga, total) / 4;
        break;
      case 'turnout':
        base = 6 + turnoutPct(r) / 4;
        break;
    }
    // scale & clamp
    const scaled = base * bubbleScale;
    return Math.max(4, Math.min(36, scaled));
  };

  // Derived presidential points
  const presPoints = useMemo(() => presRows.map((r) => ({
    ...r,
    winner: winnerOf(r),
    ruto_pct: pct(r.ruto, Math.max(1, r.valid)),
    odinga_pct: pct(r.odinga, Math.max(1, r.valid)),
    lead_pct: leadPctOf(r),
    turnout_pct: turnoutPct(r),
  })), [presRows]);

  // Click handling on empty map to clear selection
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);
  const OutlineClickCatcher: React.FC = () => {
    useMapEvents({
      click: () => setSelectedPoint(null),
    });
    return null;
  };

  const isLayerVisible = (id: string) => mapLayers.find(l => l.id === id)?.visible;

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100%', background: isDark ? '#1a1a1a' : '#f0f2f5' }}>
      {/* Left controls */}
      <Drawer
        variant="permanent"
        sx={{
          width: 320,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: 320,
            boxSizing: 'border-box',
            backgroundColor: isDark ? '#2a2a2a' : '#fff',
            color: isDark ? '#e0e0e0' : '#333',
            borderRight: `1px solid ${isDark ? '#444' : '#ddd'}`,
            zIndex: 1200,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>
            <MapIcon sx={{ mr: 1, color: theme.palette.primary.main }} /> GIS Controls
          </Typography>
          <IconButton onClick={() => navigate('/')} sx={{ color: isDark ? '#e0e0e0' : '#333' }}>
            <ArrowBackIcon />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: isDark ? '#444' : '#eee' }} />
        <List>
          <ListItem sx={{ py: 1.5 }}>
            <ListItemText
              primary="Administrative Level"
              primaryTypographyProps={{ variant: 'subtitle1', fontWeight: 600, color: theme.palette.primary.main }}
            />
          </ListItem>
          {(['county', 'constituency', 'ward'] as const).map((level) => (
            <ListItemButton
              key={level}
              selected={currentLevel === level}
              onClick={() => setCurrentLevel(level)}
              sx={{
                cursor: 'pointer',
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                },
                '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.05) },
              }}
            >
              <ListItemText primary={level.replace('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())} />
            </ListItemButton>
          ))}
          <Divider sx={{ borderColor: isDark ? '#444' : '#eee', my: 1 }} />

          <ListItem sx={{ py: 1.5 }}>
            <ListItemText
              primary="Layers"
              primaryTypographyProps={{ variant: 'subtitle1', fontWeight: 600, color: theme.palette.primary.main }}
            />
          </ListItem>
          {mapLayers.map((layer) => (
            <ListItem key={layer.id} sx={{ '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.05) } }}>
              <ListItemIcon sx={{ minWidth: 40, color: layer.visible ? theme.palette.success.main : theme.palette.action.disabled }}>
                <LayersIcon />
              </ListItemIcon>
              <ListItemText primary={layer.name} />
              <Tooltip title={layer.visible ? 'Hide Layer' : 'Show Layer'}>
                <IconButton size="small" onClick={() => onLayerToggle(layer.id)} sx={{ color: layer.visible ? theme.palette.success.main : theme.palette.error.main }}>
                  {layer.visible ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ borderColor: isDark ? '#444' : '#eee' }} />

        {/* Heatmap Controls */}
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={1} sx={{ color: theme.palette.primary.main }}>
            Heatmap Controls <FilterAltIcon sx={{ verticalAlign: 'middle', fontSize: 18, ml: 0.5 }} />
          </Typography>

          {/* Year selector */}
          <Box sx={{ mt: 1 }}>
            <Typography gutterBottom>Year</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {(['2017','2022','2027'] as Year[]).map(y => (
                <Button
                  key={y}
                  size="small"
                  variant={selectedYear === y ? 'contained' : 'outlined'}
                  onClick={() => setSelectedYear(y)}
                >
                  {y}
                </Button>
              ))}
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Intensity</Typography>
            <Slider
              value={heatIntensity}
              onChange={(_, v) => setHeatIntensity(v as number)}
              valueLabelDisplay="auto"
              min={0.2}
              max={3}
              step={0.05}
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Radius</Typography>
            <Slider
              value={heatRadius}
              onChange={(_, v) => setHeatRadius(v as number)}
              valueLabelDisplay="auto"
              min={8}
              max={120}
              step={1}
            />
          </Box>
          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Switch checked={showPointOutlines} onChange={(_, c) => setShowPointOutlines(c)} />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WhatshotIcon fontSize="small" />
                <Typography variant="body2">Show point outlines for hover/click</Typography>
              </Box>
            }
          />
        </Box>

        {/* NEW: Presidential 2022 Analysis Controls */}
        <Divider sx={{ borderColor: isDark ? '#444' : '#eee' }} />
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={1} sx={{ color: theme.palette.primary.main, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InsightsIcon /> Presidential 2022 Analysis
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Toggle <strong>Presidential 2022 (Bubbles)</strong> layer above to fetch live results per {currentLevel} from API and scale the map.
          </Typography>

          <Typography gutterBottom>Metric</Typography>
          <ToggleButtonGroup
            value={presMetric}
            exclusive
            onChange={(_, v) => v && setPresMetric(v)}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}
          >
            <ToggleButton value="lead_pct">Lead %</ToggleButton>
            <ToggleButton value="ruto_pct">Ruto %</ToggleButton>
            <ToggleButton value="odinga_pct">Odinga %</ToggleButton>
            <ToggleButton value="valid_votes">Valid Votes</ToggleButton>
            <ToggleButton value="turnout">Turnout</ToggleButton>
          </ToggleButtonGroup>

          <Typography gutterBottom>Bubble Scale</Typography>
          <Slider
            value={bubbleScale}
            onChange={(_, v) => setBubbleScale(v as number)}
            valueLabelDisplay="auto"
            min={0.5}
            max={2.5}
            step={0.1}
          />

          <Button
            variant="outlined"
            size="small"
            startIcon={<CenterFocusStrongIcon />}
            onClick={() => {
              if (currentLevel === 'county') setZoom(6);
              else if (currentLevel === 'constituency') setZoom(8.5);
              else setZoom(11);
            }}
            sx={{ mt: 1 }}
          >
            Fit view for analysis
          </Button>
        </Box>
      </Drawer>

      {/* Map */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ width: '100%', height: '100%' }}
        >
          <OutlineClickCatcher />

          {/* Free basemap (no token) */}
          <TileLayer
            url={isDark
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            attribution={
              isDark
                ? '&copy; OpenStreetMap contributors &copy; CARTO'
                : '&copy; OpenStreetMap contributors'
            }
          />

          {/* Registered voters heatmap (LIVE, lat/lng) */}
          {isLayerVisible('voter-heatmap') && voterHeatPoints.length > 0 && (
            <LeafletHeatmap
              points={voterHeatPoints.map(p => ({
                lat: p.lat,
                lng: p.lng,
                intensity: Math.min(1, Math.max(0, (p.intensity ?? 0) * heatIntensity)),
              }))}
              radius={heatRadius}
              blur={Math.max(10, Math.round(heatRadius * 0.6))}
              max={1}
            />
          )}

          {/* Incident hotspots heatmap */}
          {isLayerVisible('incidents-heatmap') && incidentHeatPoints.length > 0 && (
            <LeafletHeatmap
              points={incidentHeatPoints.map(p => ({
                lat: p.lat,
                lng: p.lng,
                intensity: Math.min(1, Math.max(0.1, (p.intensity ?? 0.1) * heatIntensity)),
              }))}
              radius={Math.max(8, Math.round(heatRadius * 0.8))}
              blur={Math.max(8, Math.round(heatRadius * 0.5))}
              max={1}
            />
          )}

          {/* Hover + click POINTS for registered voters (from API lat/lng) */}
          {showPointOutlines && voterHeatPoints.map((p) => {
            const r = p.raw || {};
            const voters2017 = Number(r?.voters_2017) || 0;
            const voters2022 = Number(r?.voters_2022) || 0;
            const voters2027 = r?.voters_2027 != null ? Number(r?.voters_2027) || 0 : null;
            const thisYear = (selectedYear === '2017' ? voters2017 : selectedYear === '2027' ? (voters2027 || 0) : voters2022);

            return (
              <CircleMarker
                key={`v-${r?.code}`}
                center={[p.lat, p.lng]} // Leaflet uses [lat, lng]
                pathOptions={{
                  color: isDark ? '#90caf9' : '#1976d2',
                  weight: 1,
                  opacity: 0.9,
                  fillOpacity: 0.4,
                }}
                radius={5}
                eventHandlers={{
                  click: () => setSelectedPoint({ type: 'voters', ...r, lat: p.lat, lng: p.lng, thisYear }),
                }}
              >
                {/* HOVER tooltip with voters */}
                <LeafletTooltip direction="top" sticky>
                  <div>
                    <strong>{r?.name}</strong><br/>
                    Code: {r?.code}<br/>
                    Voters {selectedYear}: {formatInt(thisYear)}
                  </div>
                </LeafletTooltip>
              </CircleMarker>
            );
          })}

          {/* NEW: Presidential 2022 bubbles */}
          {isLayerVisible('pres-2022-bubbles') && presPoints.map((r) => (
            <CircleMarker
              key={`p-${r.code}`}
              center={[r.latitude, r.longitude]}
              radius={bubbleRadius(r)}
              pathOptions={{
                color: alpha(colorForWinner(r), 0.9),
                fillColor: alpha(colorForWinner(r), 0.8),
                fillOpacity: 0.55,
                weight: 1.5,
              }}
              eventHandlers={{
                click: () => setSelectedPoint({ type: 'pres', ...r })
              }}
            >
              <LeafletTooltip direction="top" sticky>
                <div>
                  <strong>{r.name}</strong><br/>
                  Winner: {r.winner} (lead {formatPct(r.lead_pct)})<br/>
                  Ruto: {formatPct(r.ruto_pct)} | Odinga: {formatPct(r.odinga_pct)}<br/>
                  Valid: {formatInt(r.valid)}{r.voters_2022 ? <> | Turnout: {formatPct(r.turnout_pct)}</> : null}
                </div>
              </LeafletTooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Legend */}
        <Paper
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            p: 2,
            borderRadius: 2,
            zIndex: 1,
            background: isDark ? 'rgba(42,42,42,0.9)' : 'rgba(255,255,255,0.9)',
            color: isDark ? '#e0e0e0' : '#333',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: 260,
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            Legend
          </Typography>

          {/* Heat legend */}
          {isLayerVisible('voter-heatmap') && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>Registered Voters Heat</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  width: 160, height: 12,
                  background: 'linear-gradient(90deg, rgba(33,102,172,0) 0%, #66c2a5 20%, #fee08b 40%, #fdae61 60%, #f46d43 80%, #d53e4f 100%)',
                  borderRadius: 1
                }} />
                <Typography variant="caption">low → high</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Intensity = log-scaled registered voters ({selectedYear})
              </Typography>
            </Box>
          )}

          {/* Presidential legend */}
          {isLayerVisible('pres-2022-bubbles') && (
            <Box>
              <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>Presidential 2022 Bubbles</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{ width: 14, height: 14, borderRadius: '50%', background: '#f2c200', border: '1px solid rgba(0,0,0,0.15)' }} />
                <Typography variant="caption">Winner: Ruto</Typography>
                <Box sx={{ width: 14, height: 14, borderRadius: '50%', background: theme.palette.primary.main, border: '1px solid rgba(0,0,0,0.15)', ml: 2 }} />
                <Typography variant="caption">Winner: Odinga</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Bubble size = {presMetric.replace('_', ' ')} · Use controls to change metric/scale
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Right drawer: selected point analytics */}
      <Drawer
        anchor="right"
        open={!!selectedPoint}
        onClose={() => setSelectedPoint(null)}
        sx={{
          width: 380,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: 380,
            boxSizing: 'border-box',
            backgroundColor: isDark ? '#2a2a2a' : '#fff',
            color: isDark ? '#e0e0e0' : '#333',
            borderLeft: `1px solid ${isDark ? '#444' : '#ddd'}`,
            zIndex: 1200,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>
            <InfoIcon sx={{ mr: 1, color: theme.palette.primary.main }} /> Details
          </Typography>
          <IconButton onClick={() => setSelectedPoint(null)} sx={{ color: isDark ? '#e0e0e0' : '#333' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: isDark ? '#444' : '#eee' }} />

        {selectedPoint ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight={700} mb={2}>
              {selectedPoint?.name}
            </Typography>

            {/* If voters point */}
            {selectedPoint.type === 'voters' && (
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Code:</Typography>
                  <Typography variant="h6">{selectedPoint?.code}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Coordinates:</Typography>
                  <Typography variant="h6">
                    {selectedPoint?.lat?.toFixed(5)}, {selectedPoint?.lng?.toFixed(5)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Registered Voters ({selectedYear}):</Typography>
                  <Typography variant="h6">
                    {formatInt(selectedPoint?.thisYear || 0)}
                  </Typography>
                </Grid>

                <Typography variant="subtitle1" fontWeight={600} mt={3} mb={1} sx={{ color: theme.palette.primary.main }}>
                  Local Chart <BarChartIcon sx={{ verticalAlign: 'middle', fontSize: 18, ml: 0.5 }} />
                </Typography>
                <Box sx={{ height: 150, mb: 2 }}>
                  <Bar
                    data={{
                      labels: ['This Area'],
                      datasets: [
                        {
                          label: `Voters ${selectedYear}`,
                          data: [selectedPoint?.thisYear || 0],
                          backgroundColor: [theme.palette.primary.main],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { ticks: { color: isDark ? '#b0b0b0' : 'rgba(0,0,0,0.87)' }, grid: { display: false } },
                        y: { beginAtZero: true, ticks: { color: isDark ? '#b0b0b0' : 'rgba(0,0,0,0.87)' }, grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } },
                      },
                    }}
                  />
                </Box>
                <Button variant="contained" fullWidth sx={{ mt: 2 }}>
                  Plan Visit Here <PinDropIcon sx={{ ml: 1 }} />
                </Button>
                <Button variant="outlined" fullWidth sx={{ mt: 1 }}>
                  View Detailed Reports
                </Button>
              </Grid>
            )}

            {/* If presidential result point */}
            {selectedPoint.type === 'pres' && (
              <>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Level:</Typography>
                    <Typography variant="h6">{selectedPoint.level}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Winner:</Typography>
                    <Typography variant="h6">{selectedPoint.winner} (lead {formatPct(selectedPoint.lead_pct)})</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Valid / Rejected:</Typography>
                    <Typography variant="h6">{formatInt(selectedPoint.valid)} / {formatInt(selectedPoint.rejected)}</Typography>
                  </Grid>
                  {selectedPoint?.voters_2022 ? (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Turnout:</Typography>
                      <Typography variant="h6">{formatPct(selectedPoint.turnout_pct)}</Typography>
                    </Grid>
                  ) : null}
                </Grid>

                <Typography variant="subtitle1" fontWeight={600} mt={3} mb={1} sx={{ color: theme.palette.primary.main }}>
                  Votes by Candidate <BarChartIcon sx={{ verticalAlign: 'middle', fontSize: 18, ml: 0.5 }} />
                </Typography>
                <Box sx={{ height: 220, mb: 2 }}>
                  <Bar
                    data={{
                      labels: ['Ruto', 'Odinga', 'Mwaure', 'Wajackoyah'],
                      datasets: [{
                        label: 'Votes',
                        data: [selectedPoint.ruto, selectedPoint.odinga, selectedPoint.mwaure, selectedPoint.wajackoyah],
                        backgroundColor: [
                          '#f2c200',
                          theme.palette.primary.main,
                          theme.palette.success.main,
                          theme.palette.secondary.main,
                        ],
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { ticks: { color: isDark ? '#b0b0b0' : 'rgba(0,0,0,0.87)' }, grid: { display: false } },
                        y: { beginAtZero: true, ticks: { color: isDark ? '#b0b0b0' : 'rgba(0,0,0,0.87)' }, grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } },
                      },
                    }}
                  />
                </Box>

                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 1 }}
                  onClick={() =>
                    window.open(
                      `/reports/presidential-2022?code=${encodeURIComponent(selectedPoint.code)}&level=${selectedPoint.level}`,
                      '_blank'
                    )
                  }
                >
                  View Detailed Reports
                </Button>
              </>
            )}
          </Box>
        ) : (
          <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
            <Typography>Hover over a point to see voters or results, click for details.</Typography>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};

export default GISMapPage;
