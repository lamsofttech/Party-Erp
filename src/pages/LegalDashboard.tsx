import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Card,
  Grid,
  LinearProgress,
  Typography,
  Alert,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Warning,
  BugReport,
  Error as ErrorIcon,
  ThumbUp,
  HowToVote,
  Gavel,
  NotificationsNone,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

// --- Theme Tokens (from designs) ---
const PRIMARY_RED = '#ff3947';
const CARD_GRADIENT = 'linear-gradient(135deg, #ffffff 0%, #fff7f0 100%)';
const PAGE_BG = '#fff5f6';
const PAGE_MAX_W = 1280;

// --- Interfaces for Data ---
interface VoterTurnoutStats {
  nationalTurnout: number; // as a percentage
  votersRegistered: number;
  votersVoted: number;
  highestTurnoutCounty: { name: string; percentage: number };
  lowestTurnoutCounty: { name: string; percentage: number };
}

interface IncidentFunnel {
  reported: number;
  verified: number;
  assigned: number;
  inLitigation: number;
  closed: number;
}

interface IncidentStats {
  totalIncidents: number;
  openIncidents: number;

  // Optional (UI will fallback if missing)
  highRisk?: number;
  avgResolutionDays?: number;
  evidenceGaps?: number;
  funnel?: Partial<IncidentFunnel>;

  incidentsByType: { [key: string]: number };
  incidentsBySeverity: { [key: string]: number };
}

interface MediaLibraryStats {
  totalItems: number;
  photosCount: number;
  videosCount: number;
  documentsCount: number;

  // Optional (UI will fallback if missing)
  audioCount?: number;
}

interface LegalWarRoomStats {
  contestedSeats: number;
  totalDisputeValue: number;
  activePetitions: number;
  highRiskConstituencies: number;
}

interface LegalDashboardStats {
  voterTurnout: VoterTurnoutStats;
  incidents: IncidentStats;
  mediaLibrary: MediaLibraryStats;
  legalWarRoom: LegalWarRoomStats;
}

// helper: choose URL based on env (dev can use ?dev=true)
const getLegalStatsUrl = () => {
  const base = '/API/legal-dashboard-stats.php';
  if (import.meta.env.DEV) return `${base}?dev=true`;
  return base;
};

// --- Shared styles to match the reference image ---
const softCardSx = {
  borderRadius: 3,
  background: CARD_GRADIENT,
  border: '1px solid rgba(255, 57, 71, 0.10)',
  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
};

const StatTile: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor?: string;
  progress?: number;
  helperRight?: React.ReactNode;
  helperText?: string;
}> = ({ title, value, icon, iconColor = PRIMARY_RED, progress, helperRight, helperText }) => {
  return (
    <Card
      elevation={0}
      sx={{
        ...softCardSx,
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 2.5 },
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 30% 30%, #ffffff 0%, rgba(255, 57, 71, 0.12) 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
        }}
      >
        {icon}
      </Box>

      <Typography
        sx={{
          fontWeight: 700,
          color: PRIMARY_RED,
          mb: 0.5,
          fontSize: { xs: 11, sm: 12 },
        }}
      >
        {title}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography
          sx={{
            fontWeight: 800,
            color: '#111827',
            fontSize: { xs: 28, sm: 32, md: 34 },
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>
        {helperRight}
      </Box>

      {progress !== undefined && (
        <Box sx={{ width: { xs: '100%', sm: '75%', md: '70%' }, mt: 1.25 }}>
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, progress))}
            sx={{
              height: 6,
              borderRadius: 999,
              backgroundColor: 'rgba(255, 148, 164, 0.25)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: PRIMARY_RED,
              },
            }}
          />
          <Typography sx={{ mt: 0.5, fontSize: 12, color: '#6B7280' }}>
            {progress.toFixed(1)}%
          </Typography>
        </Box>
      )}

      {helperText && (
        <Typography sx={{ mt: 0.75, fontSize: 13, color: '#6B7280' }}>
          {helperText}
        </Typography>
      )}
    </Card>
  );
};

// --- Tabs (kept for routing sync) ---
type TabValue = 'overview' | 'flagged-34a' | 'flagged-34b';

const LegalDashboard: React.FC = () => {
  const [stats, setStats] = useState<LegalDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<TabValue>('overview');

  const navigate = useNavigate();
  const location = useLocation();

  // 🔄 Fetch stats from backend (backend controls access)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        setAccessDenied(false);
        setAccessMessage(null);

        const token = localStorage.getItem('token');
        const url = getLegalStatsUrl();

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });

        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        if (res.status === 401 || res.status === 403 || data.code === 'FORBIDDEN') {
          setAccessDenied(true);
          setAccessMessage(data.message || null);
          setLoading(false);
          return;
        }

        if (!res.ok || !data.success) {
          setError(data.message || 'Failed to load dashboard data.');
          setLoading(false);
          return;
        }

        setStats(data.data as LegalDashboardStats);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard data.');
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Keep selected tab in sync with URL (routing retained)
  useEffect(() => {
    if (location.pathname.includes('/legal/34a')) setTab('flagged-34a');
    else if (location.pathname.includes('/legal/34b')) setTab('flagged-34b');
    else setTab('overview');
  }, [location.pathname]);

  const handleTabChange = (newValue: TabValue) => {
    setTab(newValue);
    if (newValue === 'flagged-34a') navigate('/legal/34a');
    else if (newValue === 'flagged-34b') navigate('/legal/34b');
    else navigate('/legal'); // stay on legal landing (adjust if yours is '/')
  };

  // Derived values to match the reference layout
  const derived = useMemo(() => {
    if (!stats) return null;

    const total = stats.incidents.totalIncidents || 0;
    const open = stats.incidents.openIncidents || 0;

    const incidentsByTypeEntries = Object.entries(stats.incidents.incidentsByType || {});
    const maxType = Math.max(1, ...incidentsByTypeEntries.map(([, v]) => v));

    const highRisk =
      stats.incidents.highRisk ??
      stats.incidents.incidentsBySeverity?.High ??
      stats.incidents.incidentsBySeverity?.high ??
      0;

    const avgResolutionDays = stats.incidents.avgResolutionDays ?? 3.2;
    const evidenceGaps = stats.incidents.evidenceGaps ?? 8;

    const funnel: IncidentFunnel = {
      reported: stats.incidents.funnel?.reported ?? total,
      verified: stats.incidents.funnel?.verified ?? Math.max(0, Math.round(total * 0.73)),
      assigned: stats.incidents.funnel?.assigned ?? Math.max(0, Math.round(total * 0.46)),
      inLitigation: stats.incidents.funnel?.inLitigation ?? Math.max(0, Math.round(total * 0.11)),
      closed: stats.incidents.funnel?.closed ?? Math.max(0, total - open),
    };

    const openPct = total ? (open / total) * 100 : 0;
    const highRiskPct = total ? (highRisk / total) * 100 : 0;

    const mediaAudio = stats.mediaLibrary.audioCount ?? 472;

    return {
      total,
      open,
      openPct,
      maxType,
      incidentsByTypeEntries,
      highRisk,
      highRiskPct,
      avgResolutionDays,
      evidenceGaps,
      funnel,
      mediaAudio,
    };
  }, [stats]);

  // 🔒 Access denied view
  if (accessDenied) {
    return (
      <Box
        sx={{
          bgcolor: PAGE_BG,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Card
          sx={{
            maxWidth: 480,
            width: '100%',
            p: 3,
            borderRadius: 3,
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
            <Warning color="error" />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Access denied
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {accessMessage ||
              'You do not have permission to view the Legal Dashboard. This section is restricted to specific roles or users granted access by the backend.'}
          </Typography>
        </Card>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          p: 4,
          minHeight: '70vh',
          alignItems: 'center',
          bgcolor: PAGE_BG,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !stats || !derived) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: PAGE_BG, minHeight: '100vh' }}>
        <Alert severity="error">{error || 'No data available.'}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: PAGE_BG,
        minHeight: '100vh',
        py: { xs: 3, md: 4 },
        px: { xs: 1.5, sm: 2.5, md: 4 },
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <Box sx={{ maxWidth: PAGE_MAX_W, mx: 'auto' }}>
          {/* Top App Bar (matches reference image) */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                color: '#111827',
                fontSize: { xs: 22, md: 26 },
              }}
            >
              Legal Management
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              {/* mini nav */}
              <Chip
                icon={<DashboardIcon sx={{ fontSize: 18 }} />}
                label="Dashboard"
                variant="outlined"
                onClick={() => handleTabChange('overview')}
                sx={{
                  borderRadius: 999,
                  bgcolor: 'rgba(255,255,255,0.55)',
                  borderColor: 'rgba(15,23,42,0.08)',
                  cursor: 'pointer',
                }}
              />
              <Chip
                icon={<FolderIcon sx={{ fontSize: 18 }} />}
                label="Cases"
                variant="outlined"
                onClick={() => navigate('/legal/cases')}
                sx={{
                  borderRadius: 999,
                  bgcolor: 'rgba(255,255,255,0.55)',
                  borderColor: 'rgba(15,23,42,0.08)',
                  cursor: 'pointer',
                }}
              />

              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: 'rgba(15,23,42,0.06)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <NotificationsNone sx={{ fontSize: 20, color: '#111827' }} />
              </Box>
              <Avatar sx={{ width: 36, height: 36 }}>A</Avatar>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: 'rgba(15,23,42,0.06)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <MenuIcon sx={{ fontSize: 20, color: '#111827' }} />
              </Box>
            </Box>
          </Box>

          {/* Alert strip */}
          <Card
            elevation={0}
            sx={{
              ...softCardSx,
              background:
                'linear-gradient(90deg, rgba(255,57,71,1) 0%, rgba(255,57,71,0.75) 55%, rgba(255,57,71,0.35) 100%)',
              color: '#fff',
              px: { xs: 2, md: 3 },
              py: 1.25,
              mb: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Warning sx={{ color: '#fff' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                3 High-Risk Legal Incidents require action • 12 Forms 34A flagged
              </Typography>
            </Box>

            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 900,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                whiteSpace: 'nowrap',
              }}
              onClick={() => navigate('/legal/war-room')}
            >
              View War Room →
            </Typography>
          </Card>

          {/* KPI row (5 cards) */}
          <Grid container spacing={{ xs: 2, md: 2.25 }} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={6} md={2.4 as any}>
              <StatTile
                title="Total Incidents"
                value={derived.total}
                icon={<Warning fontSize="medium" />}
                iconColor="#DC2626"
                helperRight={
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>
                    +6 <span style={{ fontWeight: 700, color: '#6B7280' }}>today</span>
                  </Typography>
                }
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2.4 as any}>
              <StatTile
                title="Open Cases"
                value={derived.open}
                icon={<BugReport fontSize="medium" />}
                iconColor="#F97316"
                progress={derived.openPct}
                helperRight={
                  <Typography sx={{ fontSize: 14, fontWeight: 900, color: PRIMARY_RED }}>
                    ▲ 3
                  </Typography>
                }
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2.4 as any}>
              <StatTile
                title="High-Risk"
                value={derived.highRisk}
                icon={<ErrorIcon fontSize="medium" />}
                iconColor={PRIMARY_RED}
                progress={derived.highRiskPct}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2.4 as any}>
              <Card elevation={0} sx={{ ...softCardSx, px: 3, py: 2.5, height: '100%' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: PRIMARY_RED }}>
                  Avg Resolution Time
                </Typography>

                <Typography sx={{ fontSize: 34, fontWeight: 900, color: '#111827', mt: 0.5 }}>
                  {derived.avgResolutionDays.toFixed(1)}
                  <Typography component="span" sx={{ fontSize: 14, fontWeight: 800, ml: 1, color: '#6B7280' }}>
                    days
                  </Typography>
                  <Typography component="span" sx={{ fontSize: 13, fontWeight: 900, ml: 1, color: '#10B981' }}>
                    ▼ 0.2 days
                  </Typography>
                </Typography>

                <Box sx={{ mt: 1.25, width: { xs: '100%', sm: '75%', md: '70%' } }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.max(0, derived.avgResolutionDays * 12))}
                    sx={{
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: 'rgba(16,185,129,0.14)',
                      '& .MuiLinearProgress-bar': { backgroundColor: '#10B981' },
                    }}
                  />
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4 as any}>
              <Card elevation={0} sx={{ ...softCardSx, px: 3, py: 2.5, height: '100%' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: PRIMARY_RED }}>
                  Evidence Gaps
                </Typography>

                <Typography sx={{ fontSize: 34, fontWeight: 900, color: '#111827', mt: 0.5 }}>
                  {derived.evidenceGaps}
                </Typography>

                <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.5 }}>
                  Key evidence pending
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Middle row: Case Funnel + Incidents by Type */}
          <Grid container spacing={{ xs: 2, md: 2.25 }} sx={{ mb: 2.5 }}>
            {/* Case Funnel */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ ...softCardSx, p: 2.5 }}>
                <Typography
                  sx={{
                    fontWeight: 900,
                    color: '#111827',
                    mb: 1.25,
                    fontSize: { xs: 18, md: 20 },
                  }}
                >
                  Case Funnel
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid rgba(15,23,42,0.06)',
                  }}
                >
                  {[
                    { label: 'Reported', value: derived.funnel.reported, bg: '#94A3B8' },
                    { label: 'Verified', value: derived.funnel.verified, bg: '#F59E0B' },
                    { label: 'Assigned', value: derived.funnel.assigned, bg: '#FB923C' },
                    { label: 'In Litigation', value: derived.funnel.inLitigation, bg: '#86EFAC' },
                    { label: 'Closed', value: derived.funnel.closed, bg: '#10B981' },
                  ].map((s) => (
                    <Box
                      key={s.label}
                      sx={{
                        flex: 1,
                        py: 1.25,
                        px: 1.25,
                        background: s.bg,
                      }}
                    >
                      <Typography sx={{ fontWeight: 900, fontSize: 16, color: '#0B1220' }}>
                        {s.value}
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(11,18,32,0.75)' }}>
                        {s.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                  {derived.incidentsByTypeEntries.slice(0, 3).map(([k, v]) => (
                    <Chip
                      key={k}
                      label={`${k} (${v})`}
                      sx={{
                        bgcolor: 'rgba(15,23,42,0.04)',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    />
                  ))}
                </Box>
              </Card>
            </Grid>

            {/* Incidents by Type */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ ...softCardSx, p: 2.5 }}>
                <Typography
                  sx={{
                    fontWeight: 900,
                    color: '#111827',
                    mb: 1.25,
                    fontSize: { xs: 18, md: 20 },
                  }}
                >
                  Incidents by Type
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  {derived.incidentsByTypeEntries.map(([label, count]) => (
                    <Box
                      key={label}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 40px 1.2fr',
                        gap: 1.5,
                        alignItems: 'center',
                      }}
                    >
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>
                        {label}
                      </Typography>

                      <Typography sx={{ fontSize: 13, fontWeight: 900, color: '#111827', textAlign: 'right' }}>
                        {count}
                      </Typography>

                      <Box sx={{ height: 10, bgcolor: 'rgba(15,23,42,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            height: '100%',
                            width: `${(count / derived.maxType) * 100}%`,
                            background:
                              'linear-gradient(90deg, rgba(255,57,71,0.35), rgba(255,57,71,0.85))',
                            borderRadius: 999,
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Bottom row: Voter Turnout | Flagged Forms | Media Library */}
          <Grid container spacing={{ xs: 2, md: 2.25 }}>
            {/* Voter Turnout */}
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ ...softCardSx, p: 2.5 }}>
                <Typography sx={{ fontWeight: 900, color: '#111827', mb: 1.25, fontSize: { xs: 18, md: 20 } }}>
                  Voter Turnout
                </Typography>

                <Typography sx={{ fontSize: 12, fontWeight: 800, color: PRIMARY_RED }}>
                  National Turnout
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mt: 0.5 }}>
                  <Typography sx={{ fontSize: 44, fontWeight: 900, color: '#111827', lineHeight: 1 }}>
                    {stats.voterTurnout.nationalTurnout.toFixed(1)}%
                  </Typography>
                  <Typography sx={{ fontSize: 28, fontWeight: 900, color: '#111827', lineHeight: 1 }}>
                    {stats.voterTurnout.votersRegistered.toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ mt: 1.25 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(0, Math.min(100, stats.voterTurnout.nationalTurnout))}
                    sx={{
                      height: 7,
                      borderRadius: 999,
                      backgroundColor: 'rgba(255, 148, 164, 0.25)',
                      '& .MuiLinearProgress-bar': { backgroundColor: PRIMARY_RED },
                    }}
                  />
                  <Typography sx={{ mt: 0.75, fontSize: 12, color: '#6B7280' }}>
                    {stats.voterTurnout.nationalTurnout.toFixed(1)}%
                  </Typography>
                </Box>

                <Box sx={{ mt: 1.5 }}>
                  <Typography sx={{ fontSize: 12, color: '#6B7280', fontWeight: 700 }}>
                    Highest
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>
                    {stats.voterTurnout.highestTurnoutCounty.name}{' '}
                    <Typography component="span" sx={{ color: '#6B7280', fontWeight: 800 }}>
                      ({stats.voterTurnout.highestTurnoutCounty.percentage}%)
                    </Typography>
                  </Typography>

                  <Typography sx={{ fontSize: 12, color: '#6B7280', fontWeight: 700, mt: 1 }}>
                    Lowest
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>
                    {stats.voterTurnout.lowestTurnoutCounty.name}{' '}
                    <Typography component="span" sx={{ color: '#6B7280', fontWeight: 800 }}>
                      ({stats.voterTurnout.lowestTurnoutCounty.percentage}%)
                    </Typography>
                  </Typography>
                </Box>

                {/* map placeholder (drop in your SVG/PNG later) */}
                <Box
                  sx={{
                    mt: 1.75,
                    height: 140,
                    borderRadius: 2,
                    bgcolor: 'rgba(15,23,42,0.04)',
                  }}
                />
              </Card>
            </Grid>

            {/* Flagged Forms */}
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ ...softCardSx, p: 2.5 }}>
                <Typography sx={{ fontWeight: 900, color: '#111827', mb: 1.25, fontSize: { xs: 18, md: 20 } }}>
                  Flagged Forms 34A / 34B
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                  <Chip
                    label="Flagged Forms 34A"
                    onClick={() => handleTabChange('flagged-34a')}
                    sx={{
                      bgcolor: tab === 'flagged-34a' ? PRIMARY_RED : 'rgba(15,23,42,0.06)',
                      color: tab === 'flagged-34a' ? '#fff' : '#111827',
                      borderRadius: 999,
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  />
                  <Chip
                    label="Flagged Forms 34B"
                    onClick={() => handleTabChange('flagged-34b')}
                    sx={{
                      bgcolor: tab === 'flagged-34b' ? PRIMARY_RED : 'rgba(15,23,42,0.06)',
                      color: tab === 'flagged-34b' ? '#fff' : '#111827',
                      borderRadius: 999,
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  />
                </Box>

                {/* Table (demo rows; replace with API rows when available) */}
                <Box
                  sx={{
                    border: '1px solid rgba(15,23,42,0.06)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    background: '#fff',
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 70px 1fr 90px',
                      bgcolor: 'rgba(15,23,42,0.03)',
                      px: 1.5,
                      py: 1,
                    }}
                  >
                    <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#6B7280' }}>Region</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#6B7280' }}>Form</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#6B7280' }}>Issue</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#6B7280' }}>Severity</Typography>
                  </Box>

                  {[
                    { region: 'Makueni', form: '34A', issue: 'Totals mismatch', severity: 'High' as const },
                    { region: 'Bungoma', form: '34A', issue: 'Tampering', severity: 'Moderate' as const },
                    { region: 'Kisumu', form: '34B', issue: 'Network outage', severity: 'Moderate' as const },
                  ].map((r) => (
                    <Box
                      key={`${r.region}-${r.form}-${r.issue}`}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 70px 1fr 90px',
                        px: 1.5,
                        py: 1,
                        borderTop: '1px solid rgba(15,23,42,0.06)',
                      }}
                    >
                      <Typography sx={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>{r.region}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>{r.form}</Typography>
                      <Typography sx={{ fontSize: 13, color: '#374151', fontWeight: 700 }}>{r.issue}</Typography>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: r.severity === 'High' ? '#DC2626' : '#F97316',
                        }}
                      >
                        {r.severity}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Card
                  elevation={0}
                  sx={{
                    mt: 1.75,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,57,71,0.06)',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/legal/war-room')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Gavel sx={{ fontSize: 18, color: PRIMARY_RED }} />
                    <Typography sx={{ fontWeight: 900, color: '#111827', fontSize: 13 }}>
                      View War Room →
                    </Typography>
                  </Box>
                </Card>
              </Card>
            </Grid>

            {/* Media & Evidence Library */}
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ ...softCardSx, p: 2.5 }}>
                <Typography sx={{ fontWeight: 900, color: '#111827', mb: 1.25, fontSize: { xs: 18, md: 20 } }}>
                  Media & Evidence Library
                </Typography>

                <Grid container spacing={1.25}>
                  {[
                    { label: 'Photos / Videos', value: stats.mediaLibrary.photosCount + stats.mediaLibrary.videosCount },
                    { label: 'Documents', value: stats.mediaLibrary.documentsCount },
                    { label: 'Audio Files', value: derived.mediaAudio },
                  ].map((x) => (
                    <Grid item xs={4} key={x.label}>
                      <Box
                        sx={{
                          borderRadius: 2,
                          bgcolor: 'rgba(15,23,42,0.04)',
                          p: 1.25,
                          textAlign: 'center',
                        }}
                      >
                        <Typography sx={{ fontSize: 12, color: '#6B7280', fontWeight: 900 }}>
                          {x.label}
                        </Typography>
                        <Typography sx={{ fontSize: 16, fontWeight: 900, color: '#111827', mt: 0.25 }}>
                          {Number(x.value).toLocaleString()}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ mt: 1.75, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25 }}>
                  <Box sx={{ height: 90, borderRadius: 2, bgcolor: 'rgba(15,23,42,0.05)' }} />
                  <Box sx={{ height: 90, borderRadius: 2, bgcolor: 'rgba(15,23,42,0.05)' }} />
                  <Box sx={{ height: 90, borderRadius: 2, bgcolor: 'rgba(15,23,42,0.05)' }} />
                </Box>

                <Box
                  sx={{
                    mt: 1.5,
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Chip
                    icon={<HowToVote sx={{ fontSize: 18 }} />}
                    label={`${stats.mediaLibrary.photosCount.toLocaleString()} Photos`}
                    sx={{ borderRadius: 999, bgcolor: 'rgba(255,57,71,0.06)', fontWeight: 900 }}
                  />
                  <Chip
                    icon={<ThumbUp sx={{ fontSize: 18 }} />}
                    label={`${stats.mediaLibrary.documentsCount.toLocaleString()} Documents`}
                    sx={{ borderRadius: 999, bgcolor: 'rgba(255,57,71,0.06)', fontWeight: 900 }}
                  />
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </motion.div>
    </Box>
  );
};

export default LegalDashboard;
