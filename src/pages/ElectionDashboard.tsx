// src/pages/AnalyticsDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert as MuiAlert,
  Box,
  CircularProgress,
  Container,
  CssBaseline,
  Divider,
  ThemeProvider,
  Typography,
  createTheme,
  Paper,
  Tabs,
  Tab,
  Button,
  Tooltip,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useNavigate } from "react-router-dom";

import LiveProjectionView from "../components/election/LiveProjectionView";
// TabulatedView is now on its own page (NationalResultsDrilldown)
// import TabulatedView from "../components/election/TabulatedView";
import HeatmapView from "../components/election/HeatmapView";
import ElectionStatsPanel from "../components/election/ElectionStatsPanel";

import {
  CandidateResult,
  ConstituencyResult,
  CountyResult,
} from "../types/election";
import { ANALYTICS_ENDPOINT } from "../utils/electionHelpers";
import { useUser } from "../contexts/UserContext";

// -----------------------------------------------------------------------------
// Theme: clean, broadcast-style, dark using PROJECT RED (#F5333F)
// -----------------------------------------------------------------------------
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#F5333F" }, // Project theme red from screenshot
    secondary: { main: "#ffffff" }, // Neutral secondary (used for accents)
    background: {
      default: "#050506",
      paper: "#111111",
    },
    text: {
      primary: "#ffffff",
      secondary: "rgba(255,255,255,0.7)",
    },
    divider: "rgba(255,255,255,0.12)",
  },
  typography: {
    fontFamily:
      "Roboto, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 999,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          letterSpacing: 0.2,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 999,
          fontWeight: 600,
        },
      },
    },
  },
});

const AnalyticsDashboard: React.FC = () => {
  const { isAuthenticated, hasPermission, token, user } = useUser();
  const navigate = useNavigate();

  // DB-driven permission (configured via roles + role_permissions)
  const canViewAnalytics = hasPermission("analytics.dashboard.view");

  const [nationalResults, setNationalResults] = useState<CandidateResult[]>([]);
  const [countyResults, setCountyResults] = useState<CountyResult[]>([]);
  const [, setConstituencyResults] = useState<ConstituencyResult[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Optional: message if backend itself returns 401/403
  const [authErrorFromApi, setAuthErrorFromApi] = useState<string | null>(null);

  // module tab: 0 = live projection, 1 = tabulated (routes to page), 2 = heatmap
  const [moduleTab, setModuleTab] = useState(0);

  const fetchAnalytics = async () => {
    // If frontend already knows you're not allowed, don't even call backend
    if (!isAuthenticated || !canViewAnalytics) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAuthErrorFromApi(null);

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(ANALYTICS_ENDPOINT, {
        method: "GET",
        headers,
        // ❗ no credentials: "include" here – keep CORS behaviour same as before
      });

      if (response.status === 401 || response.status === 403) {
        const json = await response.json().catch(() => ({}));
        setAuthErrorFromApi(
          json.message ||
          "You are not authorised to view the Analytics Dashboard"
        );
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch results: ${response.status}`);
      }

      const json = await response.json();

      if (json.status === "success") {
        setNationalResults(json.national_results || []);
        setCountyResults(json.county_results || []);
        setConstituencyResults(json.constituency_results || []);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        throw new Error(json.message || "Invalid data format from server");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch – only when authenticated + has permission
  useEffect(() => {
    if (!isAuthenticated || !canViewAnalytics) {
      setLoading(false);
      return;
    }
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canViewAnalytics]);

  // Auto-refresh polling – only when allowed AND on Live Projection tab
  useEffect(() => {
    if (!autoRefresh) return;
    if (!isAuthenticated || !canViewAnalytics) return;
    // Only refresh when Live Projection tab is active
    if (moduleTab !== 0) return;

    const interval = setInterval(fetchAnalytics, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, isAuthenticated, canViewAnalytics, moduleTab]);

  const totalNationalVotes = useMemo(
    () =>
      nationalResults.reduce((sum, item) => sum + Number(item.total_votes), 0),
    [nationalResults]
  );

  const parties = useMemo(
    () =>
      Array.from(
        new Set(
          nationalResults.map((c) => c.party_name).filter((name) => !!name)
        )
      ).sort(),
    [nationalResults]
  );

  // ---------------------------------------------------------------------------
  // Aggregate stats for the top-right ElectionStatsPanel
  // ---------------------------------------------------------------------------
  const totalValidVotes = useMemo(
    () =>
      countyResults.reduce(
        (sum, row) => sum + Number(row.total_votes || 0),
        0
      ),
    [countyResults]
  );

  const totalRejectedVotes = useMemo(
    () =>
      countyResults.reduce(
        (sum, row) => sum + Number(row.rejected_votes || 0),
        0
      ),
    [countyResults]
  );

  const totalVotesCast = useMemo(
    () => totalValidVotes + totalRejectedVotes,
    [totalValidVotes, totalRejectedVotes]
  );

  // Placeholders until backend exposes these
  const totalRegistered = 0;
  const publishedCenters = 0;
  const totalCenters = 0;

  // ---------------------------------------------------------------------------
  // FRONTEND ACCESS CONTROL UI
  // ---------------------------------------------------------------------------
  const showAccessDenied =
    !isAuthenticated || !canViewAnalytics || !!authErrorFromApi;

  // Handle tab changes – when clicking Tabulated Results (index 1),
  // navigate to /election/national-results
  const handleModuleTabChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ) => {
    setModuleTab(newValue);

    if (newValue === 1) {
      navigate("/election/national-results");
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", py: { xs: 2, md: 4 } }}>
        <Container maxWidth="xl">
          {showAccessDenied ? (
            <Paper
              sx={{
                p: 4,
                borderRadius: 3,
                background:
                  "linear-gradient(135deg, #1F2933 0%, #111827 50%, #020617 100%)",
                boxShadow: 8,
                color: "common.white",
                mt: 4,
              }}
            >
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontWeight: "bold", mb: 1 }}
              >
                Access denied
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {authErrorFromApi
                  ? authErrorFromApi
                  : !isAuthenticated
                    ? "You must be logged in to view the Analytics Dashboard."
                    : "You are not authorised to view the Analytics Dashboard."}
              </Typography>

              {user && (
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Logged in as: <strong>{user.email}</strong> (
                  {user.role || "UNKNOWN ROLE"})
                </Typography>
              )}
            </Paper>
          ) : (
            <>
              {/* Branded header with project red gradient */}
              <Paper
                sx={{
                  mb: 2.5,
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  background:
                    "linear-gradient(135deg, #F5333F 0%, #C81923 50%, #7A1016 100%)",
                  boxShadow: 8,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "flex-start", sm: "center" },
                    justifyContent: "space-between",
                    gap: 1,
                    color: "common.white",
                  }}
                >
                  <Box>
                    <Typography
                      component="h1"
                      sx={{
                        fontWeight: "bold",
                        typography: { xs: "h5", sm: "h4" },
                      }}
                    >
                      Presidential Results
                    </Typography>
                    {lastUpdated && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 0.5,
                          color: "rgba(255,255,255,0.8)",
                        }}
                      >
                        Last updated: {lastUpdated}
                      </Typography>
                    )}
                  </Box>

                  <Tooltip
                    title={
                      autoRefresh ? "Auto-refresh is ON" : "Auto-refresh is OFF"
                    }
                  >
                    <Button
                      variant={autoRefresh ? "contained" : "outlined"}
                      color="inherit"
                      onClick={() => setAutoRefresh((v) => !v)}
                      startIcon={<RefreshRoundedIcon />}
                      size="small"
                      sx={{
                        mt: { xs: 1, sm: 0 },
                        borderColor: "rgba(255,255,255,0.8)",
                        bgcolor: autoRefresh
                          ? "rgba(0,0,0,0.35)"
                          : "transparent",
                        "&:hover": {
                          bgcolor: autoRefresh
                            ? "rgba(0,0,0,0.55)"
                            : "rgba(0,0,0,0.25)",
                        },
                      }}
                    >
                      {autoRefresh ? "Auto refresh: On" : "Auto refresh: Off"}
                    </Button>
                  </Tooltip>
                </Box>
              </Paper>

              <Divider sx={{ mb: 2 }} />

              {/* Module selector just under header */}
              <Paper
                sx={(theme) => ({
                  mb: 2.5,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  overflow: "hidden",
                })}
              >
                <Tabs
                  value={moduleTab}
                  onChange={handleModuleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  aria-label="Results modules"
                >
                  <Tab label="Live Projection" />
                  <Tab label="Tabulated Results" />
                  <Tab label="Heatmap Analysis" />
                </Tabs>
              </Paper>

              {/* Content per module */}
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
                  <CircularProgress size={60} sx={{ color: "primary.main" }} />
                </Box>
              ) : error ? (
                <MuiAlert
                  severity="error"
                  sx={(theme) => ({
                    mt: 2,
                    bgcolor: theme.palette.background.paper,
                    borderLeft: `4px solid ${theme.palette.error.main}`,
                  })}
                >
                  {error}
                </MuiAlert>
              ) : (
                <>
                  {moduleTab === 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", md: "row" },
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 2,
                      }}
                    >
                      {/* Left: Live leaderboard */}
                      <Box sx={{ flexGrow: 1 }}>
                        <LiveProjectionView
                          nationalResults={nationalResults}
                          totalNationalVotes={totalNationalVotes}
                          parties={parties}
                        />
                      </Box>

                      {/* Right: Stats panel (top-right) */}
                      <Box sx={{ width: { xs: "100%", md: 340 } }}>
                        <ElectionStatsPanel
                          totalValid={totalValidVotes || totalNationalVotes}
                          totalCast={totalVotesCast || totalNationalVotes}
                          nullVoid={totalRejectedVotes}
                          totalRegistered={totalRegistered}
                          publishedCenters={publishedCenters}
                          totalCenters={totalCenters}
                        />
                      </Box>
                    </Box>
                  )}

                  {/* Tabulated Results (index 1) now lives on /election/national-results */}
                  {moduleTab === 2 && <HeatmapView />}
                </>
              )}
            </>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default AnalyticsDashboard;
