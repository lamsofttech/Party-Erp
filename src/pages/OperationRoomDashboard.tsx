// OperationRoomDashboard.tsx
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import type { ReactNode } from "react";
import {
  Box,
  Grid,
  Typography,
  Button,
  useTheme,
  Chip,
  CircularProgress,
  Card,
} from "@mui/material";
import { motion } from "framer-motion";
import { Link as RouterLink } from "react-router-dom";
import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import CountUp from "react-countup";
import {
  CalendarToday as CalendarTodayIcon,
  MeetingRoom as MeetingRoomIcon,
  Description as DescriptionIcon,
  Calculate as CalculateIcon,
  School as SchoolIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Feedback as FeedbackIcon,
  Payments as PaymentsIcon,
  Assignment as AssignmentIcon,
  ArrowForward as ArrowForwardIcon,
  TrendingUp as TrendingUpIcon,
  NotificationsActive as NotificationsActiveIcon,
  ReportProblem as ReportProblemIcon,
} from "@mui/icons-material";
import "chart.js/auto";

// Lazy-load the particle background to keep the initial bundle lean.
const ParticlesBg = lazy(() => import("particles-bg"));

// ------------------------------------------------------
// Access control types & helpers
// ------------------------------------------------------

// Must match keys from /API/operations-dashboard-access.php
type ModuleKey =
  | "campaigns"
  | "onboarding"
  | "events"
  | "media_monitoring"
  | "incidents"
  | "communication_center"
  | "resources"
  | "fundraising"
  | "documents"
  | "volunteers"
  | "reports"
  | "dashboard";

type AllowedModules = Record<ModuleKey, boolean>;

interface OperationsAccessResponse {
  success: boolean;
  authorized?: boolean;
  message?: string;
  allowedModules?: Partial<AllowedModules>;
}

// Helper: API URL
const getOperationsAccessUrl = () => {
  const base = "/API/operations-dashboard-access.php";
  if (import.meta.env.DEV) {
    return `${base}?dev=true`;
  }
  return base;
};

// Default: everything off
const defaultAllowedModules: AllowedModules = {
  campaigns: false,
  onboarding: false,
  events: false,
  media_monitoring: false,
  incidents: false,
  communication_center: false,
  resources: false,
  fundraising: false,
  documents: false,
  volunteers: false,
  reports: false,
  dashboard: false,
};

// ----- Types -----
interface ActionCard {
  title: string;
  icon: ReactNode;
  path: string;
  count?: number;
  info?: string;
  moduleKey?: ModuleKey; // which module controls visibility
}

interface StatCard {
  title: string;
  count: number;
  color: { light: string; dark: string };
  path: string;
  moduleKey?: ModuleKey; // which module controls visibility
}

// ----- Static data (module scope for referential stability) -----
const actionCards: ActionCard[] = [
  {
    title: "Campaign Management",
    icon: <CalculateIcon />,
    path: "/party-operations/campaigns",
    count: 12,
    moduleKey: "campaigns",
  },
  {
    title: "Agent Onboarding & Management",
    icon: <AssignmentTurnedInIcon />,
    path: "/party-operations/onboarding",
    count: 340,
    moduleKey: "onboarding",
  },
  {
    title: "Event & Rally Management",
    icon: <MeetingRoomIcon />,
    path: "/party-operations/events",
    count: 8,
    moduleKey: "events",
  },
  {
    title: "Media Monitoring",
    icon: <SchoolIcon />,
    path: "/party-operations/media-monitoring",
    count: 24,
    moduleKey: "media_monitoring",
  },
  {
    title: "Incident Reporting",
    icon: <FeedbackIcon />,
    path: "/party-operations/incidents",
    count: 5,
    moduleKey: "incidents",
  },
  {
    title: "Communication Center",
    icon: <CalendarTodayIcon />,
    path: "/party-operations/communication-center",
    info: "SMS Blasts: 4 Pending",
    moduleKey: "communication_center",
  },
  {
    title: "Agents Registration Room",
    icon: <DescriptionIcon />,
    path: "/party-operations/resources",
    count: 16,
    moduleKey: "resources",
  },
  {
    title: "Polling Station Agents",
    icon: <PaymentsIcon />,
    path: "/party-operations/fundraising",
    count: 3,
    moduleKey: "fundraising",
  },
  {
    title: "Strategic Documents",
    icon: <AssignmentIcon />,
    path: "/party-operations/documents",
    count: 42,
    moduleKey: "documents",
  },
];

const statsCards: StatCard[] = [
  {
    title: "Active Volunteers",
    count: 1240,
    color: { light: "#4CAF50", dark: "#81C784" },
    path: "/party-operations/volunteers",
    moduleKey: "volunteers",
  },
  {
    title: "Events Planned",
    count: 34,
    color: { light: "#2196F3", dark: "#64B5F6" },
    path: "/party-operations/events",
    moduleKey: "events",
  },
  {
    title: "Funds Raised This Month",
    count: 550000,
    color: { light: "#FF9800", dark: "#FFB74D" },
    path: "/party-operations/fundraising",
    moduleKey: "fundraising",
  },
  {
    title: "Branch Reports Received",
    count: 212,
    color: { light: "#9C27B0", dark: "#BA68C8" },
    path: "/party-operations/reports",
    moduleKey: "reports",
  },
  {
    title: "Incidents Reported",
    count: 5,
    color: { light: "#F44336", dark: "#E57373" },
    path: "/party-operations/incidents",
    moduleKey: "incidents",
  },
];

const aiRecommendations: string[] = [
  "🔥 Engage 50 new volunteers in Lagos for upcoming event.",
  "⚠️ 3 incidents reported require urgent review.",
  "✅ Volunteer registrations up 18% this week, consider outreach.",
];

const primaryMain = "#2164a6";

// ----- Component -----
const OperationRoomDashboard = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [ticker, setTicker] = useState<string[]>([
    "John registered as a volunteer in Abuja.",
    "New event planned in Lagos this weekend.",
    "Incident reported in Enugu, awaiting approval.",
  ]);

  const [currentRecommendation, setCurrentRecommendation] = useState<string>(
    aiRecommendations[0]
  );

  const [chartData, setChartData] = useState<
    ChartData<"line", number[], string>
  >({
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    datasets: [
      {
        label: "Volunteers Registered",
        backgroundColor: "rgba(33, 100, 166, 0.2)",
        borderColor: primaryMain,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        data: [50, 100, 200, 180, 250, 300, 450],
      },
    ],
  });

  const chartOptions: ChartOptions<"line"> = useMemo(
    () => ({
      maintainAspectRatio: false,
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { display: false } },
      },
    }),
    []
  );

  // ------------ ACCESS CONTROL STATE ------------
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [allowedModules, setAllowedModules] = useState<AllowedModules>(
    defaultAllowedModules
  );

  // Call operations access API on mount
  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoadingAccess(true);
        setAccessDenied(false);
        setAccessMessage(null);

        const token = localStorage.getItem("token");
        const url = getOperationsAccessUrl();

        const res = await fetch(url, {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        });

        let data: OperationsAccessResponse = { success: false };
        try {
          data = await res.json();
        } catch {
          // ignore JSON parse error, we'll treat as failure
        }

        // 401 / 403 or explicit unauthorized
        if (
          res.status === 401 ||
          res.status === 403 ||
          data.authorized === false
        ) {
          setAccessDenied(true);
          setAccessMessage(
            data.message ||
            "You do not have permission to view the Operations Room Dashboard. Contact the system administrator for access."
          );
          setLoadingAccess(false);
          return;
        }

        if (!res.ok || !data.success) {
          setAccessDenied(true);
          setAccessMessage(
            data.message ||
            "Access to the Operations Room Dashboard is restricted or could not be verified."
          );
          setLoadingAccess(false);
          return;
        }

        // Merge backend allowedModules with default (in case backend omits some keys)
        const modulesFromApi = data.allowedModules || {};
        const merged: AllowedModules = {
          ...defaultAllowedModules,
          ...modulesFromApi,
          // ensure boolean:
          dashboard: !!modulesFromApi.dashboard,
        };

        // If dashboard itself is not allowed, deny
        if (!merged.dashboard) {
          setAccessDenied(true);
          setAccessMessage(
            data.message ||
            "You are not authorised to view the Operations Room Dashboard."
          );
          setLoadingAccess(false);
          return;
        }

        setAllowedModules(merged);
        setLoadingAccess(false);
      } catch (err) {
        console.error("Failed to verify operations access:", err);
        setAccessDenied(true);
        setAccessMessage(
          "Unable to verify access to the Operations Room Dashboard. Please try again or contact support."
        );
        setLoadingAccess(false);
      }
    };

    checkAccess();
  }, []);

  // Rotate ticker, AI, and random chart updates (visual only)
  useEffect(() => {
    const tickerInterval = setInterval(() => {
      setTicker((prev: string[]) =>
        prev.length > 1 ? [...prev.slice(1), prev[0]] : prev
      );
    }, 5000);

    const aiInterval = setInterval(() => {
      setCurrentRecommendation((prev: string) => {
        const index = aiRecommendations.indexOf(prev);
        return aiRecommendations[(index + 1) % aiRecommendations.length];
      });
    }, 7000);

    const chartInterval = setInterval(() => {
      setChartData((prev: ChartData<"line", number[], string>) => {
        const nextDatasets = prev.datasets.map((ds) => {
          const data = (ds.data as number[]).map((v) => {
            const delta = Math.floor(Math.random() * 5) - 2; // -2..+2
            const next = v + delta;
            return next < 0 ? 0 : next;
          });
          return { ...ds, data };
        });
        return { ...prev, datasets: nextDatasets };
      });
    }, 5000);

    return () => {
      clearInterval(tickerInterval);
      clearInterval(aiInterval);
      clearInterval(chartInterval);
    };
  }, []);

  // While verifying access
  if (loadingAccess) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: isDark ? "#0c0c0c" : "#f0f2f5",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Access denied
  if (accessDenied) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: isDark ? "#0c0c0c" : "#f0f2f5",
          p: 2,
        }}
      >
        <Card
          sx={{
            maxWidth: 480,
            width: "100%",
            p: 3,
            borderRadius: 3,
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.15)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 1.5,
              gap: 1,
            }}
          >
            <ReportProblemIcon color="error" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Access denied
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {accessMessage}
          </Typography>
        </Card>
      </Box>
    );
  }

  // Filter cards by allowedModules
  const visibleActionCards = actionCards.filter((card) => {
    if (!card.moduleKey) return true;
    return allowedModules[card.moduleKey];
  });

  const visibleStatsCards = statsCards.filter((stat) => {
    if (!stat.moduleKey) return true;
    return allowedModules[stat.moduleKey];
  });

  // ✅ Normal dashboard view if access is allowed
  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        p: 3,
        background: isDark ? "#0c0c0c" : "#f0f2f5",
      }}
    >
      {/* Particle background (lazy) */}
      <Suspense fallback={null}>
        <ParticlesBg type="cobweb" color="#2164a6" num={60} bg={false} />
      </Suspense>


      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{
              background: "linear-gradient(45deg, #1a9970, #2164a6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Operation Room Dashboard
          </Typography>
          <Chip
            icon={<NotificationsActiveIcon />}
            label={ticker[0]}
            variant="outlined"
            sx={{ maxWidth: 420 }}
          />
        </Box>

        <Box
          mb={3}
          p={2}
          borderRadius={2}
          sx={{
            background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
            boxShadow: "0 0 20px rgba(0,0,0,0.05)",
          }}
        >
          <Typography fontWeight={600} mb={0.5}>
            AI Recommendation:
          </Typography>
          <Typography>{currentRecommendation}</Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Action Cards */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              {visibleActionCards.map((card, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <motion.div whileHover={{ scale: 1.04 }}>
                    <Box
                      component={RouterLink}
                      to={card.path}
                      p={2}
                      borderRadius={2}
                      role="button"
                      aria-label={card.title}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        height: 150,
                        background: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "#fff",
                        boxShadow: "0 0 10px rgba(0,0,0,0.05)",
                        textDecoration: "none",
                        color: "inherit",
                        transition: "box-shadow .2s ease",
                        "&:hover": {
                          boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                        },
                      }}
                    >
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="start"
                      >
                        <Box sx={{ color: primaryMain }}>{card.icon}</Box>
                        {typeof card.count === "number" && (
                          <Typography fontWeight={700}>
                            <CountUp
                              end={card.count}
                              duration={1}
                              separator=","
                            />
                          </Typography>
                        )}
                      </Box>
                      <Typography
                        fontWeight={600}
                        sx={{ lineHeight: 1.25 }}
                      >
                        {card.title}
                      </Typography>
                      {card.info && (
                        <Typography fontSize={12} color="text.secondary">
                          {card.info}
                        </Typography>
                      )}
                    </Box>
                  </motion.div>
                </Grid>
              ))}
            </Grid>

            {/* Chart */}
            <Box
              mt={3}
              p={3}
              borderRadius={2}
              sx={{
                background: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "#fff",
                boxShadow: "0 0 10px rgba(0,0,0,0.05)",
              }}
            >
              <Typography
                mb={2}
                fontWeight={600}
                display="flex"
                alignItems="center"
              >
                <TrendingUpIcon sx={{ mr: 1 }} /> Volunteer Registration Trends
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line data={chartData} options={chartOptions} />
              </Box>
            </Box>
          </Grid>

          {/* Stats */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={2}>
              {visibleStatsCards.map((stat, idx) => (
                <Grid item xs={12} key={idx}>
                  <motion.div whileHover={{ scale: 1.02 }}>
                    <Box
                      p={2}
                      borderRadius={2}
                      sx={{
                        background: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "#fff",
                        boxShadow: "0 0 10px rgba(0,0,0,0.05)",
                        transition: "box-shadow .2s ease",
                        "&:hover": {
                          boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {stat.title}
                      </Typography>
                      <Typography
                        variant="h4"
                        fontWeight={700}
                        sx={{ color: stat.color.light }}
                      >
                        <CountUp
                          end={stat.count}
                          duration={1.5}
                          separator=","
                        />
                      </Typography>
                      <Button
                        component={RouterLink}
                        to={stat.path}
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        sx={{ mt: 1 }}
                      >
                        View Details
                      </Button>
                    </Box>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default OperationRoomDashboard;
