// src/pages/RecruitManageAgentsPage.tsx
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useDeferredValue,
  type ReactNode,
} from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  LinearProgress,
  Chip,
  Alert,
  Skeleton,
  useMediaQuery,
  Snackbar,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { motion, useReducedMotion } from "framer-motion";
import { PersonAdd, HomeWork, CheckCircle, GroupAdd } from "@mui/icons-material";

import OnboardAgentModal from "../components/OnboardAgentModal";
import ViewAssignedAgentsModal from "../components/ViewAssignedAgentsModal";
import { useUser } from "../contexts/UserContext";

/* -------------------- Types -------------------- */
interface County {
  id: string;
  name: string;
  code: string;
}
interface Constituency {
  id: string;
  name: string;
  county_code: string;
}
interface Ward {
  id: string;
  name: string;
  const_code: string;
}

export interface Agent {
  id: string;
  name: string;
  status: "Recruited" | "Vetted" | "Trained" | "Assigned" | "Available" | "On Leave";
  assignedPollingStationId?: string;
  contact: string;
  county: string;
  constituency: string;
  ward: string;
}

export interface PollingStation {
  id: string;
  name: string;
  county: string;
  constituency: string;
  ward: string;
  agentCount: number;
  requiredAgents: number;
}

interface CountyStats {
  totalStations: number;
  agentsRequired: number;
  agentsRecruited: number;
  agentsVetted: number;
  agentsTrained: number;
  agentsAssigned: number;
  stationsWithAgents: number;
  stationsNeedingAgents: number;
}

/* -------------------- Dummy data (fallback) -------------------- */
const DUMMY_POLLING_STATIONS = [
  { id: "1", name: "Kasarani Primary", agentCount: 2, requiredAgents: 3 },
  { id: "2", name: "Ruaraka Secondary", agentCount: 3, requiredAgents: 3 },
  { id: "5", name: "Kibra Community Centre", agentCount: 1, requiredAgents: 3 },
  { id: "3", name: "Likoni Social Hall", agentCount: 1, requiredAgents: 2 },
  { id: "4", name: "Mvita CDF Hall", agentCount: 2, requiredAgents: 2 },
  { id: "6", name: "Manyatta Sports Ground", agentCount: 2, requiredAgents: 2 },
];

const DUMMY_AGENTS: Agent[] = [
  {
    id: "AGT001",
    name: "John Doe",
    status: "Assigned",
    assignedPollingStationId: "1",
    contact: "0712345678",
    county: "Nairobi",
    constituency: "Kasarani",
    ward: "Mwiki",
  },
  {
    id: "AGT002",
    name: "Jane Smith",
    status: "Assigned",
    assignedPollingStationId: "2",
    contact: "0723456789",
    county: "Nairobi",
    constituency: "Ruaraka",
    ward: "Baba Dogo",
  },
  {
    id: "AGT003",
    name: "Peter Jones",
    status: "Available",
    contact: "0734567890",
    county: "Nairobi",
    constituency: "Kasarani",
    ward: "Mwiki",
  },
  {
    id: "AGT007",
    name: "Alice Blue",
    status: "Available",
    contact: "0778901234",
    county: "Nairobi",
    constituency: "Kibra",
    ward: "Sarang’ombe",
  },
  {
    id: "AGT004",
    name: "Mary Brown",
    status: "Trained",
    contact: "0745678901",
    county: "Mombasa",
    constituency: "Likoni",
    ward: "Shika Adabu",
  },
  {
    id: "AGT005",
    name: "David Green",
    status: "Recruited",
    contact: "0756789012",
    county: "Mombasa",
    constituency: "Mvita",
    ward: "Majengo",
  },
  {
    id: "AGT006",
    name: "Sarah White",
    status: "Assigned",
    assignedPollingStationId: "3",
    contact: "0767890123",
    county: "Mombasa",
    constituency: "Likoni",
    ward: "Shika Adabu",
  },
  {
    id: "AGT008",
    name: "Robert Red",
    status: "Vetted",
    contact: "0789012345",
    county: "Kisumu",
    constituency: "Kisumu Central",
    ward: "Manyatta B",
  },
];

/* -------------------- Small helpers -------------------- */
const fetchWithTimeout = async (url: string, timeoutMs = 12000, init?: RequestInit) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, credentials: "include" });
    return res;
  } finally {
    clearTimeout(t);
  }
};

const cacheGet = (k: string) => sessionStorage.getItem(k);
const cacheSet = (k: string, v: unknown) => sessionStorage.setItem(k, JSON.stringify(v));
const fromCache = <T,>(k: string): T | null => {
  const raw = cacheGet(k);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/**
 * Convert any HeadersInit into a plain object so we can safely do:
 * headers.Authorization = ...
 */
const headersInitToObject = (h?: HeadersInit): Record<string, string> => {
  if (!h) return {};

  // Headers instance
  if (typeof Headers !== "undefined" && h instanceof Headers) {
    const out: Record<string, string> = {};
    h.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }

  // Array of tuples
  if (Array.isArray(h)) {
    return Object.fromEntries(h) as Record<string, string>;
  }

  // Record
  return { ...(h as Record<string, string>) };
};

/* -------------------- Stat Card -------------------- */
interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
  progress?: number;
  progressLabel?: string;
}
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  progress,
  progressLabel,
}) => (
  <Card
    variant="outlined"
    sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      p: 2,
      borderLeft: `5px solid ${color}`,
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
      <Box sx={{ color, mr: 1 }}>{icon}</Box>
      <Typography variant="h6" sx={{ fontWeight: 500 }}>
        {title}
      </Typography>
    </Box>
    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
      {value}
    </Typography>
    {typeof progress === "number" && (
      <Box sx={{ width: "100%", mt: 1 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 8, borderRadius: 5, mb: 0.5 }}
          color={progress === 100 ? "success" : "primary"}
        />
        <Typography variant="caption" color="text.secondary">
          {progressLabel}
        </Typography>
      </Box>
    )}
  </Card>
);

/* ===================================================== */
/* ===================== Component ===================== */
/* ===================================================== */
const RecruitManageAgentsPage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const isXs = useMediaQuery("(max-width:600px)");
  const { user, hasPermission, token } = useUser();

  // Permissions & county-lock
  const userCounty = user?.county || null;
  const userRole = user?.role || null;

  // 🔓 treat super admins as NOT county-locked
  const isSuperAdmin =
    userRole === "SUPER_ADMIN" ||
    userRole === "SuperAdmin" ||
    userRole === "super_admin" ||
    userRole === "super-admin";

  const canViewAgentsModule = hasPermission("agent.view");
  const canCreateAgent = hasPermission("agent.create");
  const canUpdateAgent = hasPermission("agent.update");
  const canDeleteAgent = hasPermission("agent.delete");
  // Only non–super-admins are county-locked
  const canManageCountyOnly = hasPermission("agent.manage.county") && !isSuperAdmin;

  // 🔐 Wrapper that always sends Authorization: Bearer <token>
  // ✅ FIXED: avoid indexing HeadersInit with ["Authorization"] (TS7053)
  const authedFetch = useCallback(
    (url: string, timeoutMs = 12000, init?: RequestInit) => {
      const headers: Record<string, string> = {
        ...headersInitToObject(init?.headers),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      return fetchWithTimeout(url, timeoutMs, {
        ...init,
        headers,
      });
    },
    [token]
  );

  // selectors
  const [availableCounties, setAvailableCounties] = useState<County[]>([]);
  const [availableConstituencies, setAvailableConstituencies] = useState<Constituency[]>([]);
  const [availableWards, setAvailableWards] = useState<Ward[]>([]);

  const [selectedCounty, setSelectedCounty] = useState("");
  const [selectedCountyCode, setSelectedCountyCode] = useState<string | null>(null);
  const [selectedConstituency, setSelectedConstituency] = useState("");
  const [selectedConstituencyCode, setSelectedConstituencyCode] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedWardCode, setSelectedWardCode] = useState<string | null>(null);

  // fetch/load flags & errors
  const [errCounties, setErrCounties] = useState<string | null>(null);
  const [errConstituencies, setErrConstituencies] = useState<string | null>(null);
  const [errWards, setErrWards] = useState<string | null>(null);
  const [errStations, setErrStations] = useState<string | null>(null);

  const [loadingCounties, setLoadingCounties] = useState(true);
  const [loadingConstituencies, setLoadingConstituencies] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);

  // data
  const [rawStations, setRawStations] = useState<PollingStation[]>([]);
  const [pollingStations, setPollingStations] = useState<PollingStation[]>([]);
  // NOTE: agents is the master list; we DO NOT reset/filter it inside recalc() anymore
  const [agents] = useState<Agent[]>(DUMMY_AGENTS);
  const [countyStats, setCountyStats] = useState<CountyStats | null>(null);

  // UI
  const [viewMode, setViewMode] = useState<"stations" | "agents">("stations");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState<Agent["status"] | "">("");

  // modals
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [selectedStationForOnboard, setSelectedStationForOnboard] =
    useState<PollingStation | null>(null);
  const [isViewAgentsModalOpen, setIsViewAgentsModalOpen] = useState(false);
  const [selectedStationForView, setSelectedStationForView] =
    useState<PollingStation | null>(null);

  // snackbar for warnings
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  /* -------------------- Fetch: Counties (cached, role-aware) -------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingCounties(true);
      setErrCounties(null);

      const countyCacheKey = `counties:${userRole || "anon"}:${userCounty || "all"}:v1`;

      const cached = fromCache<any>(countyCacheKey);
      if (cached?.status === "success" && Array.isArray(cached.data)) {
        if (!alive) return;
        setAvailableCounties(
          cached.data.map((it: any) => ({
            id: it.county_code,
            name: it.county_name,
            code: it.county_code,
          }))
        );
        setLoadingCounties(false);
        return;
      }
      try {
        const res = await authedFetch("https://skizagroundsuite.com/API/get_counties.php");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        cacheSet(countyCacheKey, json);
        if (!alive) return;
        if (json?.status === "success" && Array.isArray(json.data)) {
          setAvailableCounties(
            json.data.map((it: any) => ({
              id: it.county_code,
              name: it.county_name,
              code: it.county_code,
            }))
          );
        } else throw new Error("Bad counties format");
      } catch (e: any) {
        if (!alive) return;
        setErrCounties(e?.message || "Failed to load counties");
        setAvailableCounties([]);
      } finally {
        if (alive) setLoadingCounties(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authedFetch, userRole, userCounty]);

  /* 🔐 Auto-lock county ONLY for county-level users (not super admins) */
  useEffect(() => {
    if (!canManageCountyOnly) return;
    if (selectedCounty) return;
    if (availableCounties.length === 0) return;

    const c =
      (userCounty && availableCounties.find((x) => x.name === userCounty)) ||
      (availableCounties.length === 1 ? availableCounties[0] : undefined);

    if (c) {
      setSelectedCounty(c.name);
      setSelectedCountyCode(c.id);
    }
  }, [canManageCountyOnly, userCounty, availableCounties, selectedCounty]);

  /* -------------------- Fetch: Constituencies (cached per county, role-aware) -------------------- */
  useEffect(() => {
    if (!selectedCountyCode) {
      setAvailableConstituencies([]);
      setSelectedConstituency("");
      setSelectedConstituencyCode(null);
      setAvailableWards([]);
      setSelectedWard("");
      setSelectedWardCode(null);
      return;
    }
    let alive = true;
    (async () => {
      setLoadingConstituencies(true);
      setErrConstituencies(null);
      const cacheKey = `constituencies:${selectedCountyCode}:${userRole || "anon"}:${userCounty || "all"
        }:v1`;
      const cached = fromCache<any>(cacheKey);
      if (cached?.status === "success" && Array.isArray(cached.data)) {
        if (!alive) return;
        setAvailableConstituencies(
          cached.data.map((it: any) => ({
            id: it.const_code,
            name: it.constituency_name,
            county_code: selectedCountyCode,
          }))
        );
        setLoadingConstituencies(false);
        return;
      }
      try {
        const res = await authedFetch(`/API/get_constituencies.php?county_code=${selectedCountyCode}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        cacheSet(cacheKey, json);
        if (!alive) return;
        if (json?.status === "success" && Array.isArray(json.data)) {
          setAvailableConstituencies(
            json.data.map((it: any) => ({
              id: it.const_code,
              name: it.constituency_name,
              county_code: selectedCountyCode,
            }))
          );
        } else throw new Error("Bad constituencies format");
      } catch (e: any) {
        if (!alive) return;
        setErrConstituencies(e?.message || "Failed to load constituencies");
        setAvailableConstituencies([]);
      } finally {
        if (alive) setLoadingConstituencies(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedCountyCode, authedFetch, userRole, userCounty]);

  /* -------------------- Fetch: Wards (cached per constituency, role-aware) -------------------- */
  useEffect(() => {
    if (!selectedConstituencyCode) {
      setAvailableWards([]);
      setSelectedWard("");
      setSelectedWardCode(null);
      return;
    }
    let alive = true;
    (async () => {
      setLoadingWards(true);
      setErrWards(null);
      const cacheKey = `wards:${selectedConstituencyCode}:${userRole || "anon"}:${userCounty || "all"}:v1`;
      const cached = fromCache<any>(cacheKey);
      if (cached?.status === "success" && Array.isArray(cached.data)) {
        if (!alive) return;
        setAvailableWards(
          cached.data.map((it: any) => ({
            id: it.ward_code,
            name: it.ward_name,
            const_code: selectedConstituencyCode,
          }))
        );
        setLoadingWards(false);
        return;
      }
      try {
        const res = await authedFetch(`/API/get_wards.php?const_code=${selectedConstituencyCode}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        cacheSet(cacheKey, json);
        if (!alive) return;
        if (json?.status === "success" && Array.isArray(json.data)) {
          setAvailableWards(
            json.data.map((it: any) => ({
              id: it.ward_code,
              name: it.ward_name,
              const_code: selectedConstituencyCode,
            }))
          );
        } else throw new Error("Bad wards format");
      } catch (e: any) {
        if (!alive) return;
        setErrWards(e?.message || "Failed to load wards");
        setAvailableWards([]);
      } finally {
        if (alive) setLoadingWards(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedConstituencyCode, authedFetch, userRole, userCounty]);

  /* -------------------- Fetch: Polling Stations (cached per ward, role-aware) -------------------- */
  useEffect(() => {
    if (!selectedWardCode) {
      setRawStations([]);
      setErrStations(null);
      return;
    }
    let alive = true;
    (async () => {
      setLoadingStations(true);
      setErrStations(null);
      const cacheKey = `stations:${selectedWardCode}:${userRole || "anon"}:${userCounty || "all"}:v1`;
      const cached = fromCache<any>(cacheKey);

      const mapToPs = (arr: any[]): PollingStation[] =>
        arr.map((it: any) => ({
          id: String(it.id),
          name: it.polling_station_name,
          county: selectedCounty,
          constituency: selectedConstituency,
          ward: selectedWard,
          agentCount: 0,
          requiredAgents: 0,
        }));

      if (cached?.status === "success" && Array.isArray(cached.polling_centers)) {
        if (!alive) return;
        setRawStations(mapToPs(cached.polling_centers));
        setLoadingStations(false);
        return;
      }
      try {
        const res = await authedFetch(`API/get_polling_stations.php?ward_code=${selectedWardCode}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        cacheSet(cacheKey, json);
        if (!alive) return;
        if (json?.status === "success" && Array.isArray(json.polling_centers)) {
          setRawStations(mapToPs(json.polling_centers));
        } else throw new Error("Bad polling station format");
      } catch (e: any) {
        if (!alive) return;
        setErrStations(e?.message || "Failed to load polling stations");
        setRawStations([]);
      } finally {
        if (alive) setLoadingStations(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [
    selectedWardCode,
    selectedCounty,
    selectedConstituency,
    selectedWard,
    authedFetch,
    userRole,
    userCounty,
  ]);

  /* -------------------- Data aggregation -------------------- */
  const recalc = useCallback(() => {
    if (!selectedCounty) {
      setPollingStations([]);
      setCountyStats(null);
      return;
    }

    // Determine current stations (API by ward else dummy fallback)
    let currentStations: PollingStation[] = [];
    if (selectedWardCode && rawStations.length) {
      currentStations = rawStations.map((s) => {
        const assigned = agents.filter((a) => a.assignedPollingStationId === s.id).length;
        const dummy = DUMMY_POLLING_STATIONS.find((d) => String(d.id) === s.id);
        return {
          ...s,
          agentCount: assigned,
          requiredAgents: dummy?.requiredAgents ?? 3,
        };
      });
    } else {
      currentStations = DUMMY_POLLING_STATIONS.map((d) => {
        const assigned = agents.filter((a) => a.assignedPollingStationId === d.id).length;
        return {
          id: d.id,
          name: d.name,
          county: selectedCounty,
          constituency: selectedConstituency || "",
          ward: selectedWard || "",
          agentCount: assigned,
          requiredAgents: d.requiredAgents,
        };
      });
    }

    // Agents filtered by geography (local only, we don't setAgents here)
    let geoAgents = agents.filter((a) => a.county === selectedCounty);
    if (selectedConstituency) {
      geoAgents = geoAgents.filter((a) => a.constituency === selectedConstituency);
    }
    if (selectedWard) {
      geoAgents = geoAgents.filter((a) => a.ward === selectedWard);
    }

    const stats: CountyStats = {
      totalStations: currentStations.length,
      agentsRequired: currentStations.reduce((s, ps) => s + ps.requiredAgents, 0),
      agentsRecruited: geoAgents.filter((a) => a.status !== "On Leave").length,
      agentsVetted: geoAgents.filter((a) =>
        ["Vetted", "Trained", "Assigned", "Available"].includes(a.status)
      ).length,
      agentsTrained: geoAgents.filter((a) =>
        ["Trained", "Assigned", "Available"].includes(a.status)
      ).length,
      agentsAssigned: geoAgents.filter((a) => a.status === "Assigned").length,
      stationsWithAgents: new Set(
        geoAgents.map((a) => a.assignedPollingStationId).filter(Boolean)
      ).size,
      stationsNeedingAgents: currentStations.filter((ps) => ps.agentCount < ps.requiredAgents)
        .length,
    };

    setPollingStations(currentStations);
    setCountyStats(stats);
  }, [selectedCounty, selectedConstituency, selectedWard, selectedWardCode, rawStations, agents]);

  useEffect(() => {
    recalc();
  }, [recalc]);

  /* -------------------- Derived filtering/search -------------------- */
  const filteredAgents = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();

    // First filter by geography (same logic as stats)
    let base = agents;
    if (selectedCounty) base = base.filter((a) => a.county === selectedCounty);
    if (selectedConstituency) base = base.filter((a) => a.constituency === selectedConstituency);
    if (selectedWard) base = base.filter((a) => a.ward === selectedWard);

    // Then apply status + text search
    return base.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.contact.toLowerCase().includes(q) ||
        a.constituency.toLowerCase().includes(q) ||
        a.ward.toLowerCase().includes(q)
      );
    });
  }, [agents, deferredSearch, statusFilter, selectedCounty, selectedConstituency, selectedWard]);

  const getAgentStatusChipColor = (status: Agent["status"]) => {
    switch (status) {
      case "Assigned":
        return "success";
      case "Available":
        return "info";
      case "Recruited":
        return "primary";
      case "Vetted":
        return "warning";
      case "Trained":
        return "secondary";
      case "On Leave":
        return "error";
      default:
        return "default";
    }
  };

  const progressPct = (current: number, total: number) => (total > 0 ? (current / total) * 100 : 0);

  /* -------------------- Handlers -------------------- */
  const handleCountyChange = (name: string) => {
    // Only enforce lock for county-level, not super admin
    if (canManageCountyOnly && userCounty && name !== userCounty) {
      setSnackbar({
        open: true,
        message: "You are only allowed to manage your assigned county.",
      });
      return;
    }

    setSelectedCounty(name);
    const c = availableCounties.find((x) => x.name === name);
    setSelectedCountyCode(c ? c.id : null);
    setSelectedConstituency("");
    setSelectedConstituencyCode(null);
    setSelectedWard("");
    setSelectedWardCode(null);
    setRawStations([]);
  };

  const handleConstituencyChange = (name: string) => {
    setSelectedConstituency(name);
    const c = availableConstituencies.find((x) => x.name === name);
    setSelectedConstituencyCode(c ? c.id : null);
    setSelectedWard("");
    setSelectedWardCode(null);
    setRawStations([]);
  };

  const handleWardChange = (name: string) => {
    setSelectedWard(name);
    const w = availableWards.find((x) => x.name === name);
    setSelectedWardCode(w ? w.id : null);
  };

  const openOnboard = (station: PollingStation) => {
    if (!canCreateAgent) {
      setSnackbar({
        open: true,
        message: "You don’t have permission to onboard agents.",
      });
      return;
    }

    if (station.agentCount >= station.requiredAgents) {
      setSnackbar({
        open: true,
        message: "This polling station is fully staffed. Delete an agent to add another.",
      });
      return;
    }
    setSelectedStationForOnboard(station);
    setIsOnboardModalOpen(true);
  };

  const closeOnboard = () => {
    setIsOnboardModalOpen(false);
    setSelectedStationForOnboard(null);
  };

  const onboarded = () => {
    recalc();
  };

  const openViewAgents = (station: PollingStation) => {
    setSelectedStationForView(station);
    setIsViewAgentsModalOpen(true);
  };

  const closeViewAgents = () => {
    setIsViewAgentsModalOpen(false);
    setSelectedStationForView(null);
  };

  /* -------------------- Permission guard -------------------- */
  if (!canViewAgentsModule) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          You do not have permission to view the Agent Onboarding Room. Please contact your system
          administrator if you believe this is an error.
        </Alert>
      </Box>
    );
  }

  /* -------------------- Render -------------------- */
  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, pt: `calc(env(safe-area-inset-top) + 16px)` }}>
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Typography
          variant={isXs ? "h5" : "h4"}
          component="h1"
          gutterBottom
          sx={{ mb: 2, fontWeight: 700 }}
        >
          <GroupAdd sx={{ mr: 1, verticalAlign: "middle" }} /> Agent Onboarding Room
        </Typography>

        {/* Selectors */}
        <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl
            sx={{ minWidth: 200, flex: "1 1 220px" }}
            disabled={canManageCountyOnly && !!userCounty}
          >
            <InputLabel id="county-select-label">County</InputLabel>
            {loadingCounties ? (
              <Skeleton variant="rounded" height={56} />
            ) : errCounties ? (
              <Alert severity="error">{errCounties}</Alert>
            ) : (
              <Select
                labelId="county-select-label"
                value={selectedCounty}
                label="County"
                onChange={(e: SelectChangeEvent<string>) => handleCountyChange(e.target.value)}
              >
                {!canManageCountyOnly && (
                  <MenuItem value="">
                    <em>Select County</em>
                  </MenuItem>
                )}
                {availableCounties.map((c) => (
                  <MenuItem key={c.id} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </FormControl>

          {selectedCounty && (
            <FormControl sx={{ minWidth: 200, flex: "1 1 220px" }} disabled={!selectedCounty}>
              <InputLabel id="constituency-select-label">Constituency</InputLabel>
              {loadingConstituencies ? (
                <Skeleton variant="rounded" height={56} />
              ) : errConstituencies ? (
                <Alert severity="error">{errConstituencies}</Alert>
              ) : (
                <Select
                  labelId="constituency-select-label"
                  value={selectedConstituency}
                  label="Constituency"
                  onChange={(e: SelectChangeEvent<string>) =>
                    handleConstituencyChange(e.target.value)
                  }
                >
                  <MenuItem value="">
                    <em>Select Constituency</em>
                  </MenuItem>
                  {availableConstituencies.map((c) => (
                    <MenuItem key={c.id} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          )}

          {selectedConstituency && (
            <FormControl sx={{ minWidth: 200, flex: "1 1 220px" }} disabled={!selectedConstituency}>
              <InputLabel id="ward-select-label">Ward</InputLabel>
              {loadingWards ? (
                <Skeleton variant="rounded" height={56} />
              ) : errWards ? (
                <Alert severity="error">{errWards}</Alert>
              ) : (
                <Select
                  labelId="ward-select-label"
                  value={selectedWard}
                  label="Ward"
                  onChange={(e: SelectChangeEvent<string>) => handleWardChange(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Select Ward</em>
                  </MenuItem>
                  {availableWards.map((w) => (
                    <MenuItem key={w.id} value={w.name}>
                      {w.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          )}
        </Box>

        {!selectedCounty ? (
          <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
            <Typography variant="h6">
              Please select a county to begin managing agents and polling stations.
            </Typography>
          </Box>
        ) : (
          <>
            {loadingStations && (
              <Skeleton
                variant="rectangular"
                height={isXs ? 120 : 140}
                sx={{ mb: 2, borderRadius: 2 }}
              />
            )}

            {errStations && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errStations}
              </Alert>
            )}

            {countyStats && (
              <Card variant="outlined" sx={{ mb: 3, p: { xs: 2, md: 3 }, boxShadow: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Overview for {selectedCounty} County
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Total Stations"
                      value={countyStats.totalStations}
                      icon={<HomeWork />}
                      color="var(--mui-palette-info-main, #0288d1)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Agents Recruited"
                      value={countyStats.agentsRecruited}
                      icon={<PersonAdd />}
                      color="var(--mui-palette-primary-main, #1976d2)"
                      progress={progressPct(countyStats.agentsRecruited, countyStats.agentsRequired)}
                      progressLabel={`Needed: ${countyStats.agentsRequired}`}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Agents Assigned"
                      value={countyStats.agentsAssigned}
                      icon={<CheckCircle />}
                      color="var(--mui-palette-success-main, #2e7d32)"
                      progress={progressPct(countyStats.agentsAssigned, countyStats.agentsRequired)}
                      progressLabel={`Assigned: ${countyStats.agentsAssigned}/${countyStats.agentsRequired}`}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Stations Fully Staffed"
                      value={countyStats.stationsWithAgents}
                      icon={<HomeWork />}
                      color="var(--mui-palette-warning-main, #ed6c02)"
                      progress={progressPct(countyStats.stationsWithAgents, countyStats.totalStations)}
                      progressLabel={`Staffed: ${countyStats.stationsWithAgents}/${countyStats.totalStations}`}
                    />
                  </Grid>
                </Grid>
              </Card>
            )}

            {/* Filters */}
            <Box
              sx={{
                mb: 2,
                display: "flex",
                gap: 1.5,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <TextField
                label="Search Agents/Stations"
                variant="outlined"
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ flexGrow: 1, maxWidth: 360 }}
              />
              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel id="agent-status-label" size="small">
                  Agent Status
                </InputLabel>
                <Select
                  labelId="agent-status-label"
                  label="Agent Status"
                  size="small"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter((e.target.value as Agent["status"]) || "")}
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {["Assigned", "Available", "Trained", "Vetted", "Recruited", "On Leave"].map(
                    (s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                disabled={!canCreateAgent}
                onClick={() => {
                  if (!canCreateAgent) {
                    setSnackbar({
                      open: true,
                      message: "You don’t have permission to recruit new agents.",
                    });
                    return;
                  }
                  console.log("Consider a global recruit flow that asks for target station.");
                }}
              >
                Recruit New Agent
              </Button>
              <Button variant="outlined" disabled={!(canUpdateAgent || canDeleteAgent)}>
                Bulk Actions
              </Button>
            </Box>

            {/* View toggle */}
            <Box sx={{ mb: 2, display: "flex", justifyContent: "center", gap: 1 }}>
              <Button
                variant={viewMode === "stations" ? "contained" : "outlined"}
                onClick={() => setViewMode("stations")}
              >
                Polling Stations ({pollingStations.length})
              </Button>
              <Button
                variant={viewMode === "agents" ? "contained" : "outlined"}
                onClick={() => setViewMode("agents")}
              >
                Agents ({filteredAgents.length})
              </Button>
            </Box>

            {/* Content */}
            {viewMode === "stations" ? (
              <Grid container spacing={2}>
                {pollingStations.length === 0 ? (
                  <Grid item xs={12}>
                    <Typography sx={{ textAlign: "center", py: 3 }} color="text.secondary">
                      No polling stations found for the selected area.
                    </Typography>
                  </Grid>
                ) : (
                  pollingStations
                    .filter((ps) =>
                      ps.name.toLowerCase().includes(deferredSearch.trim().toLowerCase())
                    )
                    .map((station) => (
                      <Grid item xs={12} sm={6} md={4} key={station.id}>
                        <motion.div
                          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
                          animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
                          transition={{ duration: 0.25 }}
                        >
                          <Card
                            variant="outlined"
                            sx={{
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                            }}
                          >
                            <CardContent>
                              <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
                                {station.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Agents: {station.agentCount} / {station.requiredAgents}
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={progressPct(station.agentCount, station.requiredAgents)}
                                sx={{ my: 1, height: 6, borderRadius: 3 }}
                                color={
                                  station.agentCount >= station.requiredAgents
                                    ? "success"
                                    : "primary"
                                }
                              />
                              {station.agentCount < station.requiredAgents && (
                                <Chip
                                  label={`Needs ${station.requiredAgents - station.agentCount} more`}
                                  color="error"
                                  size="small"
                                  sx={{ mt: 0.5 }}
                                />
                              )}
                            </CardContent>
                            <CardContent sx={{ pt: 0, display: "flex", gap: 1 }}>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => openOnboard(station)}
                                disabled={station.agentCount >= station.requiredAgents || !canCreateAgent}
                              >
                                Onboard Agent
                              </Button>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => openViewAgents(station)}
                              >
                                View Details
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Grid>
                    ))
                )}
              </Grid>
            ) : (
              <Grid container spacing={2}>
                {filteredAgents.length === 0 ? (
                  <Grid item xs={12}>
                    <Typography sx={{ textAlign: "center", py: 3 }} color="text.secondary">
                      No agents found for the selected filters.
                    </Typography>
                  </Grid>
                ) : (
                  filteredAgents.map((agent) => (
                    <Grid item xs={12} sm={6} md={4} key={agent.id}>
                      <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
                        animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                      >
                        <Card variant="outlined" sx={{ height: "100%" }}>
                          <CardContent>
                            <Typography variant="h6">{agent.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Contact: {agent.contact}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Location: {agent.constituency}, {agent.ward}
                            </Typography>
                            <Chip
                              label={agent.status}
                              color={getAgentStatusChipColor(agent.status)}
                              size="small"
                              sx={{ mt: 1 }}
                            />
                            {agent.assignedPollingStationId && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Assigned to:{" "}
                                {pollingStations.find((ps) => ps.id === agent.assignedPollingStationId)
                                  ?.name || "N/A"}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  ))
                )}
              </Grid>
            )}
          </>
        )}
      </motion.div>

      {/* Modals */}
      <OnboardAgentModal
        open={isOnboardModalOpen}
        onClose={closeOnboard}
        pollingStation={selectedStationForOnboard}
        onAgentOnboarded={onboarded}
      />

      <ViewAssignedAgentsModal
        open={isViewAgentsModalOpen}
        onClose={closeViewAgents}
        pollingStation={selectedStationForView}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default RecruitManageAgentsPage;
