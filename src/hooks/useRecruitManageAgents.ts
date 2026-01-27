import {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useDeferredValue,
} from "react";
import { useUser } from "../contexts/UserContext";

/* -------------------- Types -------------------- */
export interface County {
    id: string;
    name: string;
    code: string;
}
export interface Constituency {
    id: string;
    name: string;
    county_code: string;
}
export interface Ward {
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
export interface CountyStats {
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
        const res = await fetch(url, {
            ...init,
            signal: ctrl.signal,
            credentials: "include",
        });
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

const progressPct = (current: number, total: number) => (total > 0 ? (current / total) * 100 : 0);

export function useRecruitManageAgents() {
    const { user, hasPermission, token } = useUser();

    const userRole = user?.role || null;
    const userCounty = user?.county || null;

    const isSuperAdmin =
        userRole === "SUPER_ADMIN" ||
        userRole === "SuperAdmin" ||
        userRole === "super_admin" ||
        userRole === "super-admin";

    const canViewAgentsModule = hasPermission("agent.view");
    const canCreateAgent = hasPermission("agent.create");
    const canUpdateAgent = hasPermission("agent.update");
    const canDeleteAgent = hasPermission("agent.delete");
    const canManageCountyOnly = hasPermission("agent.manage.county") && !isSuperAdmin;

    // ✅ FIXED: HeadersInit typing
    const authedFetch = useCallback(
        (url: string, timeoutMs = 12000, init?: RequestInit) => {
            const headers = new Headers(init?.headers);
            if (token) headers.set("Authorization", `Bearer ${token}`);
            return fetchWithTimeout(url, timeoutMs, { ...init, headers });
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

    // load flags & errors
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
    const [agents] = useState<Agent[]>(DUMMY_AGENTS);
    const [countyStats, setCountyStats] = useState<CountyStats | null>(null);

    // UI state
    const [viewMode, setViewMode] = useState<"stations" | "agents">("stations");
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [statusFilter, setStatusFilter] = useState<Agent["status"] | "">("");

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
        open: false,
        message: "",
    });

    // modals state
    const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
    const [selectedStationForOnboard, setSelectedStationForOnboard] = useState<PollingStation | null>(null);
    const [isViewAgentsModalOpen, setIsViewAgentsModalOpen] = useState(false);
    const [selectedStationForView, setSelectedStationForView] = useState<PollingStation | null>(null);

    /* -------------------- Fetch: Counties -------------------- */
    useEffect(() => {
        let alive = true;
        (async () => {
            setLoadingCounties(true);
            setErrCounties(null);

            const cached = fromCache<any>("counties:v1");
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
                cacheSet("counties:v1", json);

                if (!alive) return;
                if (json?.status === "success" && Array.isArray(json.data)) {
                    setAvailableCounties(
                        json.data.map((it: any) => ({
                            id: it.county_code,
                            name: it.county_name,
                            code: it.county_code,
                        }))
                    );
                } else {
                    throw new Error("Bad counties format");
                }
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
    }, [authedFetch]);

    /* Auto-lock county */
    useEffect(() => {
        if (canManageCountyOnly && userCounty && availableCounties.length > 0 && !selectedCounty) {
            const c = availableCounties.find((x) => x.name === userCounty);
            if (c) {
                setSelectedCounty(c.name);
                setSelectedCountyCode(c.id);
            }
        }
    }, [canManageCountyOnly, userCounty, availableCounties, selectedCounty]);

    /* -------------------- Fetch: Constituencies -------------------- */
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

            const cacheKey = `constituencies:${selectedCountyCode}:v1`;
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
                const res = await authedFetch(
                    `https://skizagroundsuite.com/API/get_constituencies.php?county_code=${selectedCountyCode}`
                );
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
                } else {
                    throw new Error("Bad constituencies format");
                }
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
    }, [selectedCountyCode, authedFetch]);

    /* -------------------- Fetch: Wards -------------------- */
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

            const cacheKey = `wards:${selectedConstituencyCode}:v1`;
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
                const res = await authedFetch(
                    `https://skizagroundsuite.com/API/get_wards.php?const_code=${selectedConstituencyCode}`
                );
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
                } else {
                    throw new Error("Bad wards format");
                }
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
    }, [selectedConstituencyCode, authedFetch]);

    /* -------------------- Fetch: Polling Stations -------------------- */
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

            const cacheKey = `stations:${selectedWardCode}:v1`;
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
                const res = await authedFetch(
                    `https://skizagroundsuite.com/API/get_polling_stations.php?ward_code=${selectedWardCode}`
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                cacheSet(cacheKey, json);

                if (!alive) return;
                if (json?.status === "success" && Array.isArray(json.polling_centers)) {
                    setRawStations(mapToPs(json.polling_centers));
                } else {
                    throw new Error("Bad polling station format");
                }
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
    }, [selectedWardCode, selectedCounty, selectedConstituency, selectedWard, authedFetch]);

    /* -------------------- Data aggregation -------------------- */
    const recalc = useCallback(() => {
        if (!selectedCounty) {
            setPollingStations([]);
            setCountyStats(null);
            return;
        }

        let currentStations: PollingStation[] = [];
        if (selectedWardCode && rawStations.length) {
            currentStations = rawStations.map((s) => {
                const assigned = agents.filter((a) => a.assignedPollingStationId === s.id).length;
                const dummy = DUMMY_POLLING_STATIONS.find((d) => String(d.id) === s.id);
                return { ...s, agentCount: assigned, requiredAgents: dummy?.requiredAgents ?? 3 };
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

        let geoAgents = agents.filter((a) => a.county === selectedCounty);
        if (selectedConstituency) geoAgents = geoAgents.filter((a) => a.constituency === selectedConstituency);
        if (selectedWard) geoAgents = geoAgents.filter((a) => a.ward === selectedWard);

        const stats: CountyStats = {
            totalStations: currentStations.length,
            agentsRequired: currentStations.reduce((s, ps) => s + ps.requiredAgents, 0),
            agentsRecruited: geoAgents.filter((a) => a.status !== "On Leave").length,
            agentsVetted: geoAgents.filter((a) => ["Vetted", "Trained", "Assigned", "Available"].includes(a.status)).length,
            agentsTrained: geoAgents.filter((a) => ["Trained", "Assigned", "Available"].includes(a.status)).length,
            agentsAssigned: geoAgents.filter((a) => a.status === "Assigned").length,
            stationsWithAgents: new Set(geoAgents.map((a) => a.assignedPollingStationId).filter(Boolean)).size,
            stationsNeedingAgents: currentStations.filter((ps) => ps.agentCount < ps.requiredAgents).length,
        };

        setPollingStations(currentStations);
        setCountyStats(stats);
    }, [selectedCounty, selectedConstituency, selectedWard, selectedWardCode, rawStations, agents]);

    useEffect(() => {
        recalc();
    }, [recalc]);

    const filteredAgents = useMemo(() => {
        const q = deferredSearch.trim().toLowerCase();

        let base = agents;
        if (selectedCounty) base = base.filter((a) => a.county === selectedCounty);
        if (selectedConstituency) base = base.filter((a) => a.constituency === selectedConstituency);
        if (selectedWard) base = base.filter((a) => a.ward === selectedWard);

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

    /* -------------------- Handlers -------------------- */
    const handleCountyChange = (name: string) => {
        if (canManageCountyOnly && userCounty && name !== userCounty) {
            setSnackbar({ open: true, message: "You are only allowed to manage your assigned county." });
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
            setSnackbar({ open: true, message: "You don’t have permission to onboard agents." });
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

    const openViewAgents = (station: PollingStation) => {
        setSelectedStationForView(station);
        setIsViewAgentsModalOpen(true);
    };

    const closeViewAgents = () => {
        setIsViewAgentsModalOpen(false);
        setSelectedStationForView(null);
    };

    return {
        // permissions
        canViewAgentsModule,
        canCreateAgent,
        canUpdateAgent,
        canDeleteAgent,
        canManageCountyOnly,
        userCounty,

        // selectors + data
        availableCounties,
        availableConstituencies,
        availableWards,
        selectedCounty,
        selectedConstituency,
        selectedWard,
        pollingStations,
        filteredAgents,
        countyStats,

        // ui
        viewMode,
        setViewMode,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        snackbar,
        setSnackbar,

        // loading/errors
        loadingCounties,
        loadingConstituencies,
        loadingWards,
        loadingStations,
        errCounties,
        errConstituencies,
        errWards,
        errStations,

        // handlers
        handleCountyChange,
        handleConstituencyChange,
        handleWardChange,
        openOnboard,
        closeOnboard,
        openViewAgents,
        closeViewAgents,

        // modals state
        isOnboardModalOpen,
        selectedStationForOnboard,
        isViewAgentsModalOpen,
        selectedStationForView,

        // helpers
        progressPct,
    };
}
