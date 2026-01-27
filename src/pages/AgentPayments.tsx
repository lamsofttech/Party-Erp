import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Snackbar,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Chip,
    Tooltip,
    IconButton,
    Drawer,
    Divider,
    useMediaQuery,
} from "@mui/material";
import type { AlertColor } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";

import { motion } from "framer-motion";
import { RefreshCcw, Wallet, UserCheck, CheckCircle2 } from "lucide-react";
import { useUser } from "../contexts/UserContext";

type BillingStatus = "pending" | "billed" | "paid" | "unknown";

type DeployedAgent = {
    id: number | string;
    full_name: string;
    phone?: string;
    region?: string; // legacy display (users.county)
    wallet_balance?: number;
    last_allocation_date?: string;
    billing_status?: string;
    lifecycle_status?: string;
    mpesa_number?: string;

    county_id?: number | null;
    constituency_id?: number | null;
    ward_id?: number | null;
    polling_station_id?: number | null;

    // sometimes backend may return codes too
    county_code?: string | null;
    const_code?: string | null;
    caw_code?: string | null;
    reg_centre_code?: string | null;
};

type Option = { id: number; name: string; code?: string; extra?: Record<string, any> };

const inputSx = {
    "& .MuiOutlinedInput-root": {
        "& fieldset": { borderColor: "rgba(148, 163, 184, 0.8)" },
        "&:hover fieldset": { borderColor: "rgb(59, 130, 246)" },
        "&.Mui-focused fieldset": { borderColor: "rgb(37, 99, 235)" },
    },
    "& .MuiInputLabel-root": { color: "rgba(148, 163, 184, 1)" },
    "& .MuiInputBase-input": { color: "rgb(15, 23, 42)" },
};

const AGENT_PAYMENTS_PERMISSION = "finance.agent_payments.view";
const API_BASE = "/API/agent_payments";

// Try both names (because your project used both styles)
const POLLING_ENDPOINTS = [`${API_BASE}/polling_station.php`, `${API_BASE}/polling-stations.php`];

function normBillingStatus(v?: string): BillingStatus {
    const x = String(v ?? "").toLowerCase().trim();
    if (x === "pending" || x === "billed" || x === "paid") return x;
    return "unknown";
}

function BillingChip({ status }: { status: BillingStatus }) {
    if (status === "pending") return <Chip size="small" label="PENDING" color="warning" variant="filled" />;
    if (status === "billed") return <Chip size="small" label="BILLED" color="info" variant="filled" />;
    if (status === "paid") return <Chip size="small" label="PAID" color="success" variant="filled" />;
    return <Chip size="small" label="UNKNOWN" variant="outlined" />;
}

function StatCard({ title, value, hint }: { title: string; value: number; hint?: string }) {
    return (
        <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-md p-4 border border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
            {hint ? <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</div> : null}
        </div>
    );
}

// Helpers: tolerate different API shapes during migration
function pickFirst<T = any>(obj: any, keys: string[], fallback?: any): T {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
    }
    return fallback as T;
}

function normalizeListResponse(json: any): any[] {
    if (Array.isArray(json?.data)) return json.data;
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.results)) return json.results;
    return [];
}

// A safe fetch that returns {ok, status, json, text}
async function safeFetch(url: string, init?: RequestInit) {
    const res = await fetch(url, init);
    let json: any = null;
    let text = "";
    try {
        json = await res.json();
    } catch {
        try {
            text = await res.text();
        } catch {
            text = "";
        }
    }
    return { res, ok: res.ok, status: res.status, json, text };
}

// Decide if backend is asking for a certain param
function needsParam(errMsg: string, param: string) {
    const m = (errMsg || "").toLowerCase();
    return m.includes(param.toLowerCase()) && (m.includes("required") || m.includes("must"));
}

export default function AgentPayments() {
    const { hasPermission, user } = useUser();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const [moreAgent, setMoreAgent] = useState<DeployedAgent | null>(null);
    const openMore = (agent: DeployedAgent) => setMoreAgent(agent);
    const closeMore = () => setMoreAgent(null);

    const [agents, setAgents] = useState<DeployedAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

    const [openAllocSingle, setOpenAllocSingle] = useState(false);
    const [openAllocBulk, setOpenAllocBulk] = useState(false);
    const [openQueue, setOpenQueue] = useState(false);
    const [openMarkPaid, setOpenMarkPaid] = useState(false);

    const [selectedAgent, setSelectedAgent] = useState<DeployedAgent | null>(null);

    const [amount, setAmount] = useState("");
    const [remark, setRemark] = useState("");

    const [queueAmount, setQueueAmount] = useState("");
    const [queueRemark, setQueueRemark] = useState("");

    const [billFilter, setBillFilter] = useState<"all" | "pending" | "billed" | "paid">("all");

    const [submitting, setSubmitting] = useState(false);

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    // ✅ Drill-down options + selected ids
    const [counties, setCounties] = useState<Option[]>([]);
    const [constituencies, setConstituencies] = useState<Option[]>([]);
    const [wards, setWards] = useState<Option[]>([]);
    const [pollingStations, setPollingStations] = useState<Option[]>([]);

    const [countyId, setCountyId] = useState<number | "">("");
    const [constituencyId, setConstituencyId] = useState<number | "">("");
    const [wardId, setWardId] = useState<number | "">("");
    const [pollingStationId, setPollingStationId] = useState<number | "">("");

    const [loadingCounties, setLoadingCounties] = useState(false);
    const [loadingConstituencies, setLoadingConstituencies] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);
    const [loadingPollingStations, setLoadingPollingStations] = useState(false);

    const isSuperAdmin = !!(user?.role && String(user.role).toUpperCase() === "SUPER_ADMIN");

    const allowed = useMemo(() => {
        if (isSuperAdmin) return true;
        if (typeof hasPermission !== "function") return true;
        return hasPermission(AGENT_PAYMENTS_PERMISSION);
    }, [hasPermission, isSuperAdmin]);

    const closeSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));

    const filteredAgents = useMemo(() => {
        if (billFilter === "all") return agents;
        return agents.filter((a) => normBillingStatus(a.billing_status) === billFilter);
    }, [agents, billFilter]);

    const stats = useMemo(() => {
        const s: Record<BillingStatus, number> = { pending: 0, billed: 0, paid: 0, unknown: 0 };
        for (const a of agents) {
            const b = normBillingStatus(a.billing_status);
            s[b] = (s[b] ?? 0) + 1;
        }
        return s;
    }, [agents]);

    const allSelected = filteredAgents.length > 0 && selectedIds.length === filteredAgents.length;

    const toggleSelectAll = () => {
        if (allSelected) setSelectedIds([]);
        else setSelectedIds(filteredAgents.map((a) => a.id));
    };

    const toggleSelectOne = (id: number | string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    // Build maps so we can access codes for selected items
    const countyById = useMemo(() => new Map(counties.map((c) => [c.id, c])), [counties]);
    const constituencyById = useMemo(() => new Map(constituencies.map((c) => [c.id, c])), [constituencies]);
    const wardById = useMemo(() => new Map(wards.map((w) => [w.id, w])), [wards]);
    const pollingById = useMemo(() => new Map(pollingStations.map((p) => [p.id, p])), [pollingStations]);

    const selectedCounty = useMemo(
        () => (countyId === "" ? null : countyById.get(Number(countyId)) || null),
        [countyId, countyById]
    );
    const selectedConstituency = useMemo(
        () => (constituencyId === "" ? null : constituencyById.get(Number(constituencyId)) || null),
        [constituencyId, constituencyById]
    );
    const selectedWard = useMemo(() => (wardId === "" ? null : wardById.get(Number(wardId)) || null), [wardId, wardById]);
    const selectedPolling = useMemo(
        () => (pollingStationId === "" ? null : pollingById.get(Number(pollingStationId)) || null),
        [pollingStationId, pollingById]
    );

    // -------------------------
    // Fetch option lists
    // -------------------------
    const fetchCounties = async () => {
        try {
            setLoadingCounties(true);

            const { ok, json, text, status } = await safeFetch(`${API_BASE}/get_counties.php`, {
                method: "GET",
                credentials: "include",
            });
            if (!ok) {
                const msg = json?.message || text || `Failed to load counties (HTTP ${status}).`;
                throw new Error(msg);
            }

            const list = normalizeListResponse(json);

            setCounties(
                list
                    .map((x: any) => ({
                        id: Number(pickFirst(x, ["county_id", "id"])),
                        name: String(pickFirst(x, ["county_name", "name"], "")),
                        code: String(pickFirst(x, ["county_code"], "")) || undefined,
                        extra: x,
                    }))
                    .filter((x: Option) => Number.isFinite(x.id) && x.name)
            );
        } catch (e: any) {
            setSnackbar({ open: true, severity: "error", message: e?.message || "Failed to load counties." });
            setCounties([]);
        } finally {
            setLoadingCounties(false);
        }
    };

    const fetchConstituencies = async (cId: number) => {
        try {
            setLoadingConstituencies(true);

            let url = `${API_BASE}/constituencies.php?county_id=${cId}`;
            let r = await safeFetch(url, { method: "GET", credentials: "include" });

            if (!r.ok) {
                const msg = r.json?.message || r.text || "";
                const countyCode = countyById.get(cId)?.code;
                if (countyCode && needsParam(msg, "county_code")) {
                    url = `${API_BASE}/constituencies.php?county_code=${encodeURIComponent(countyCode)}`;
                    r = await safeFetch(url, { method: "GET", credentials: "include" });
                }
            }

            if (!r.ok) {
                const msg = r.json?.message || r.text || "Failed to load constituencies.";
                throw new Error(msg);
            }

            const list = normalizeListResponse(r.json);

            setConstituencies(
                list
                    .map((x: any) => ({
                        id: Number(pickFirst(x, ["constituency_id", "id"])),
                        name: String(pickFirst(x, ["constituency_name", "name", "const_name"], "")),
                        code: String(pickFirst(x, ["const_code"], "")) || undefined,
                        extra: x,
                    }))
                    .filter((x: Option) => Number.isFinite(x.id) && x.name)
            );
        } catch (e: any) {
            setSnackbar({ open: true, severity: "error", message: e?.message || "Failed to load constituencies." });
            setConstituencies([]);
        } finally {
            setLoadingConstituencies(false);
        }
    };

    const fetchWards = async (constituencyNumericId: number) => {
        try {
            setLoadingWards(true);

            let url = `${API_BASE}/wards.php?constituency_id=${constituencyNumericId}`;
            let r = await safeFetch(url, { method: "GET", credentials: "include" });

            if (!r.ok) {
                const msg = r.json?.message || r.text || "";
                const constCode = constituencyById.get(constituencyNumericId)?.code;
                if (constCode && needsParam(msg, "const_code")) {
                    url = `${API_BASE}/wards.php?const_code=${encodeURIComponent(constCode)}`;
                    r = await safeFetch(url, { method: "GET", credentials: "include" });
                }
            }

            if (!r.ok) {
                const msg = r.json?.message || r.text || "Failed to load wards.";
                throw new Error(msg);
            }

            const list = normalizeListResponse(r.json);

            setWards(
                list
                    .map((x: any) => ({
                        id: Number(pickFirst(x, ["ward_id", "id"])),
                        name: String(pickFirst(x, ["ward_name", "name", "caw_name"], "")),
                        code: String(pickFirst(x, ["caw_code"], "")) || undefined,
                        extra: x,
                    }))
                    .filter((x: Option) => Number.isFinite(x.id) && x.name)
            );
        } catch (e: any) {
            setSnackbar({ open: true, severity: "error", message: e?.message || "Failed to load wards." });
            setWards([]);
        } finally {
            setLoadingWards(false);
        }
    };

    const fetchPollingStations = async (wardNumericId: number) => {
        try {
            setLoadingPollingStations(true);

            const ward = wardById.get(wardNumericId);
            const cawCode = ward?.code;

            let lastErr = "";

            for (const endpoint of POLLING_ENDPOINTS) {
                let url = `${endpoint}?ward_id=${wardNumericId}`;
                let r = await safeFetch(url, { method: "GET", credentials: "include" });

                if (!r.ok) {
                    const msg = r.json?.message || r.text || "";
                    if (cawCode && needsParam(msg, "caw_code")) {
                        url = `${endpoint}?caw_code=${encodeURIComponent(cawCode)}`;
                        r = await safeFetch(url, { method: "GET", credentials: "include" });
                    }
                }

                if (r.ok) {
                    const list = normalizeListResponse(r.json);

                    setPollingStations(
                        list
                            .map((x: any) => ({
                                id: Number(pickFirst(x, ["polling_station_id", "id"])),
                                name: String(pickFirst(x, ["polling_station_name", "name", "reg_centre_name"], "")),
                                code: String(pickFirst(x, ["reg_centre_code"], "")) || undefined,
                                extra: x,
                            }))
                            .filter((x: Option) => Number.isFinite(x.id) && x.name)
                    );
                    return;
                }

                lastErr = r.json?.message || r.text || `Polling stations failed on ${endpoint}`;
            }

            throw new Error(lastErr || "Failed to load polling stations.");
        } catch (e: any) {
            setSnackbar({ open: true, severity: "error", message: e?.message || "Failed to load polling stations." });
            setPollingStations([]);
        } finally {
            setLoadingPollingStations(false);
        }
    };

    // -------------------------
    // Fetch agents (SERVER FILTERED)
    // -------------------------
    const fetchAgents = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("token");

            const params = new URLSearchParams();
            if (billFilter !== "all") params.set("billStatus", billFilter);

            if (countyId !== "") {
                params.set("county_id", String(countyId));
                if (selectedCounty?.code) params.set("county_code", selectedCounty.code);
            }
            if (constituencyId !== "") {
                params.set("constituency_id", String(constituencyId));
                if (selectedConstituency?.code) params.set("const_code", selectedConstituency.code);
            }
            if (wardId !== "") {
                params.set("ward_id", String(wardId));
                if (selectedWard?.code) params.set("caw_code", selectedWard.code);
            }
            if (pollingStationId !== "") {
                params.set("polling_station_id", String(pollingStationId));
                if (selectedPolling?.code) params.set("reg_centre_code", selectedPolling.code);
            }

            const url = `${API_BASE}/deployed-agents.php?${params.toString()}`;

            const res = await fetch(url, {
                method: "GET",
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                credentials: "include",
            });

            let data: any = {};
            try {
                data = await res.json();
            } catch {
                data = {};
            }

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to fetch deployed agents.");
            }

            const list = Array.isArray(data.data) ? data.data : [];
            setAgents(list);

            setSelectedIds((prev) => prev.filter((id) => list.some((a: any) => String(a.id) === String(id))));
        } catch (e: any) {
            setError(e?.message || "Failed to fetch deployed agents.");
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        if (!allowed) {
            setLoading(false);
            setError("Access denied. Contact admin to request Agent Payments access.");
            return;
        }
        fetchCounties();
        fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowed]);

    // When bill filter changes -> refresh + clear selection
    useEffect(() => {
        setSelectedIds([]);
        if (allowed) fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [billFilter]);

    // When county changes -> reset children + fetch constituencies + refresh agents
    useEffect(() => {
        setSelectedIds([]);

        setConstituencies([]);
        setWards([]);
        setPollingStations([]);

        setConstituencyId("");
        setWardId("");
        setPollingStationId("");

        if (countyId !== "") {
            fetchConstituencies(Number(countyId));
        }

        if (allowed) fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [countyId]);

    // When constituency changes -> reset children + fetch wards + refresh agents
    useEffect(() => {
        setSelectedIds([]);

        setWards([]);
        setPollingStations([]);

        setWardId("");
        setPollingStationId("");

        if (constituencyId !== "") {
            fetchWards(Number(constituencyId));
        }

        if (allowed) fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [constituencyId]);

    // When ward changes -> reset polling stations + fetch + refresh agents
    useEffect(() => {
        setSelectedIds([]);

        setPollingStations([]);
        setPollingStationId("");

        if (wardId !== "") {
            fetchPollingStations(Number(wardId));
        }

        if (allowed) fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wardId]);

    // When polling station changes -> refresh agents
    useEffect(() => {
        setSelectedIds([]);
        if (allowed) fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pollingStationId]);

    // -------------------------
    // Allocate (single)
    // -------------------------
    const openAllocateSingle = (agent: DeployedAgent) => {
        setSelectedAgent(agent);
        setAmount("");
        setRemark("");
        setOpenAllocSingle(true);
    };

    const submitAllocateSingle = async () => {
        if (!selectedAgent) return;

        const amt = Number(amount);
        if (!amount || Number.isNaN(amt) || amt <= 0) {
            setSnackbar({ open: true, severity: "error", message: "Please enter a valid amount (> 0)." });
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem("token");

            const res = await fetch(`${API_BASE}/allocate-agent-funds.php`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: "include",
                body: JSON.stringify({
                    mode: "single",
                    agent_id: selectedAgent.id,
                    amount: amt,
                    remark: remark?.trim() || null,
                    allocated_by: (user as any)?.id ?? null,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) throw new Error(data.message || "Allocation failed.");

            setSnackbar({ open: true, severity: "success", message: data.message || "Funds allocated successfully." });

            setOpenAllocSingle(false);
            setSelectedAgent(null);
            fetchAgents();
        } catch (e: any) {
            setSnackbar({ open: true, severity: "error", message: e?.message || "Allocation failed." });
        } finally {
            setSubmitting(false);
        }
    };

    // -------------------------
    // Allocate (bulk)
    // -------------------------
    const submitAllocateBulk = async (mode: "batch" | "all") => {
        const amt = Number(amount);
        if (!amount || Number.isNaN(amt) || amt <= 0) {
            setSnackbar({ open: true, severity: "error", message: "Please enter a valid amount (> 0)." });
            return;
        }

        if (mode === "batch" && selectedIds.length === 0) {
            setSnackbar({ open: true, severity: "warning", message: "Select at least one agent first." });
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem("token");

            const payload =
                mode === "batch"
                    ? {
                        mode: "batch",
                        agent_ids: selectedIds,
                        amount: amt,
                        remark: remark?.trim() || null,
                        allocated_by: (user as any)?.id ?? null,
                    }
                    : {
                        mode: "all",
                        amount: amt,
                        remark: remark?.trim() || null,
                        allocated_by: (user as any)?.id ?? null,
                        filters: {
                            billStatus: billFilter !== "all" ? billFilter : null,
                            county_id: countyId !== "" ? Number(countyId) : null,
                            county_code: selectedCounty?.code ?? null,
                            constituency_id: constituencyId !== "" ? Number(constituencyId) : null,
                            const_code: selectedConstituency?.code ?? null,
                            ward_id: wardId !== "" ? Number(wardId) : null,
                            caw_code: selectedWard?.code ?? null,
                            polling_station_id: pollingStationId !== "" ? Number(pollingStationId) : null,
                            reg_centre_code: selectedPolling?.code ?? null,
                        },
                    };

            const res = await fetch(`${API_BASE}/allocate-agent-funds.php`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) throw new Error(data.message || "Bulk allocation failed.");

            setSnackbar({ open: true, severity: "success", message: data.message || "Bulk allocation successful." });

            setOpenAllocBulk(false);
            setAmount("");
            setRemark("");
            setSelectedIds([]);
            fetchAgents();
        } catch (e: any) {
            setSnackbar({ open: true, severity: "error", message: e?.message || "Bulk allocation failed." });
        } finally {
            setSubmitting(false);
        }
    };

    // -------------------------
    // Queue (one/batch/all)
    // -------------------------
    const submitQueue = async (mode: "one" | "batch" | "all") => {
        if (mode === "one" && selectedIds.length !== 1) {
            setSnackbar({ open: true, severity: "warning", message: "Select exactly 1 agent to queue as 'one'." });
            return;
        }
        if (mode === "batch" && selectedIds.length === 0) {
            setSnackbar({ open: true, severity: "warning", message: "Select at least one agent to queue." });
            return;
        }

        const amtStr = queueAmount.trim();
        const amt = amtStr ? Number(amtStr) : 0;
        if (amtStr && (Number.isNaN(amt) || amt < 0)) {
            setSnackbar({ open: true, severity: "error", message: "Queue amount must be a valid number (>= 0)." });
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem("token");

            const payload: any =
                mode === "all"
                    ? {
                        mode: "all",
                        amount: amt,
                        remark: queueRemark?.trim() || null,
                        billing_status: "pending",
                        filters: {
                            county_id: countyId !== "" ? Number(countyId) : null,
                            county_code: selectedCounty?.code ?? null,
                            constituency_id: constituencyId !== "" ? Number(constituencyId) : null,
                            const_code: selectedConstituency?.code ?? null,
                            ward_id: wardId !== "" ? Number(wardId) : null,
                            caw_code: selectedWard?.code ?? null,
                            polling_station_id: pollingStationId !== "" ? Number(pollingStationId) : null,
                            reg_centre_code: selectedPolling?.code ?? null,
                        },
                    }
                    : mode === "batch"
                        ? { mode: "batch", agent_ids: selectedIds, amount: amt, remark: queueRemark?.trim() || null }
                        : { mode: "one", agent_id: selectedIds[0], amount: amt, remark: queueRemark?.trim() || null };

            const res = await fetch(`${API_BASE}/queue-agent-payments.php`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) throw new Error(data.message || "Queue failed.");

            setSnackbar({
                open: true,
                severity: "success",
                message: data.message || `Queued ${data.queued ?? 0} agent(s) successfully.`,
            });

            setOpenQueue(false);
            setQueueAmount("");
            setQueueRemark("");
            setSelectedIds([]);
            fetchAgents();
        } catch (e: any) {
            setSnackbar({ open: true, severity: "error", message: e?.message || "Queue failed." });
        } finally {
            setSubmitting(false);
        }
    };

    // -------------------------
    // Mark Paid (billed -> paid)
    // -------------------------
    const markPaid = async () => {
        const billedIds = agents
            .filter((a) => selectedIds.some((x) => String(x) === String(a.id)))
            .filter((a) => normBillingStatus(a.billing_status) === "billed")
            .map((a) => a.id);

        if (billedIds.length === 0) {
            setSnackbar({ open: true, severity: "warning", message: "Select at least one BILLED agent to mark as PAID." });
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem("token");

            for (const id of billedIds) {
                const res = await fetch(`${API_BASE}/mark-agent-paid.php`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    credentials: "include",
                    body: JSON.stringify({ agent_id: id }),
                });

                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) throw new Error(data.message || `Failed marking agent ${id} as paid.`);
            }

            setSnackbar({ open: true, severity: "success", message: `Marked ${billedIds.length} agent(s) as PAID.` });
            setOpenMarkPaid(false);
            setSelectedIds([]);
            fetchAgents();
        } catch (e: any) {
            setSnackbar({ open: true, severity: "error", message: e?.message || "Mark paid failed." });
        } finally {
            setSubmitting(false);
        }
    };

    if (!allowed) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 px-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6">
                    <h2 className="text-xl font-bold mb-2 text-red-600 dark:text-red-400">Access denied</h2>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                        You do not have permission to view Agent Payments. Contact your administrator.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
            <header className="mb-5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Wallet className="text-purple-500" size={26} />
                    Agent Payments
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Track and act on payment lifecycle: Pending → Billed → Paid.
                </p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
                <StatCard title="Pending" value={stats.pending} hint="Eligible to queue" />
                <StatCard title="Billed" value={stats.billed} hint="Ready to mark paid" />
                <StatCard title="Paid" value={stats.paid} hint="Locked actions" />
                <StatCard title="Total" value={agents.length} />
            </div>

            <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-md p-4 sm:p-6 border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col gap-3 mb-4">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                            <UserCheck size={18} className="text-emerald-500" />
                            Deployed Agents
                        </h2>

                        <div className="flex flex-wrap items-center gap-2">
                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel>Billing</InputLabel>
                                <Select
                                    label="Billing"
                                    value={billFilter}
                                    onChange={(e) => {
                                        setBillFilter(e.target.value as any);
                                        setSelectedIds([]);
                                    }}
                                >
                                    <MenuItem value="all">All</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="billed">Billed</MenuItem>
                                    <MenuItem value="paid">Paid</MenuItem>
                                </Select>
                            </FormControl>

                            <Button
                                variant="outlined"
                                onClick={fetchAgents}
                                disabled={loading || submitting}
                                startIcon={<RefreshCcw size={16} />}
                                className="!border-slate-300 dark:!border-slate-700"
                            >
                                Refresh
                            </Button>

                            <Tooltip title="Allocate only for Pending/Unknown (disabled for Billed/Paid)">
                                <span>
                                    <Button
                                        variant="contained"
                                        disabled={loading || submitting || selectedIds.length === 0}
                                        onClick={() => {
                                            setAmount("");
                                            setRemark("");
                                            setOpenAllocBulk(true);
                                        }}
                                        className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                                    >
                                        Allocate Selected
                                    </Button>
                                </span>
                            </Tooltip>

                            <Button
                                variant="contained"
                                disabled={loading || submitting || filteredAgents.length === 0}
                                onClick={() => {
                                    setSelectedIds([]);
                                    setAmount("");
                                    setRemark("");
                                    setOpenAllocBulk(true);
                                }}
                                className="!bg-emerald-900 hover:!bg-emerald-950 !text-white"
                            >
                                Allocate All (Filtered)
                            </Button>

                            <Button
                                variant="contained"
                                disabled={loading || submitting || selectedIds.length === 0}
                                onClick={() => {
                                    setQueueAmount("");
                                    setQueueRemark("");
                                    setOpenQueue(true);
                                }}
                                className="!bg-purple-600 hover:!bg-purple-700 !text-white"
                            >
                                Queue Selected
                            </Button>

                            <Button
                                variant="contained"
                                disabled={loading || submitting || filteredAgents.length === 0}
                                onClick={() => {
                                    setSelectedIds([]);
                                    setQueueAmount("");
                                    setQueueRemark("");
                                    setOpenQueue(true);
                                }}
                                className="!bg-slate-900 hover:!bg-slate-800 !text-white"
                            >
                                Queue All Pending
                            </Button>

                            <Button
                                variant="contained"
                                disabled={loading || submitting || selectedIds.length === 0}
                                onClick={() => setOpenMarkPaid(true)}
                                startIcon={<CheckCircle2 size={16} />}
                                className="!bg-emerald-700 hover:!bg-emerald-800 !text-white"
                            >
                                Mark Paid
                            </Button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        <FormControl size="small" sx={{ minWidth: 220 }}>
                            <InputLabel>County</InputLabel>
                            <Select
                                label="County"
                                value={countyId}
                                onChange={(e) => setCountyId(e.target.value === "" ? "" : Number(e.target.value))}
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

                        <FormControl size="small" sx={{ minWidth: 240 }} disabled={countyId === "" || loadingConstituencies}>
                            <InputLabel>Constituency</InputLabel>
                            <Select
                                label="Constituency"
                                value={constituencyId}
                                onChange={(e) => setConstituencyId(e.target.value === "" ? "" : Number(e.target.value))}
                            >
                                <MenuItem value="">
                                    <em>All Constituencies</em>
                                </MenuItem>
                                {constituencies.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 220 }} disabled={constituencyId === "" || loadingWards}>
                            <InputLabel>Ward</InputLabel>
                            <Select
                                label="Ward"
                                value={wardId}
                                onChange={(e) => setWardId(e.target.value === "" ? "" : Number(e.target.value))}
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

                        <FormControl size="small" sx={{ minWidth: 260 }} disabled={wardId === "" || loadingPollingStations}>
                            <InputLabel>Polling Station</InputLabel>
                            <Select
                                label="Polling Station"
                                value={pollingStationId}
                                onChange={(e) => setPollingStationId(e.target.value === "" ? "" : Number(e.target.value))}
                            >
                                <MenuItem value="">
                                    <em>All Polling Stations</em>
                                </MenuItem>
                                {pollingStations.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        {p.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {(loadingCounties || loadingConstituencies || loadingWards || loadingPollingStations) && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <CircularProgress size={16} /> Loading locations...
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="py-10 flex items-center justify-center">
                        <CircularProgress />
                    </div>
                ) : error ? (
                    <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-100">
                        {error}
                    </div>
                ) : filteredAgents.length === 0 ? (
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                        No agents found for this filter.
                    </div>
                ) : (
                    <>
                        {/* DESKTOP: show only Name + Amount + Status. Others go to View More drawer */}
                        {!isMobile ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b border-slate-200 dark:border-slate-800">
                                            <th className="py-3 pr-3 w-10">
                                                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                                            </th>
                                            <th className="py-3 pr-3">Name</th>
                                            <th className="py-3 pr-3">Allocated (KES)</th>
                                            <th className="py-3 pr-3">Status</th>
                                            <th className="py-3 pr-3 text-right">Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredAgents.map((a) => {
                                            const billing = normBillingStatus(a.billing_status);
                                            const canQueue = billing === "pending" || billing === "unknown";
                                            const canAllocate = billing === "pending" || billing === "unknown";
                                            const isPaid = billing === "paid";

                                            return (
                                                <motion.tr
                                                    key={String(a.id)}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="border-b border-slate-100 dark:border-slate-800"
                                                >
                                                    <td className="py-3 pr-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(a.id)}
                                                            onChange={() => toggleSelectOne(a.id)}
                                                        />
                                                    </td>

                                                    <td className="py-3 pr-3 font-medium">{a.full_name}</td>

                                                    <td className="py-3 pr-3">{(a.wallet_balance ?? 0).toLocaleString()}</td>

                                                    <td className="py-3 pr-3">
                                                        <BillingChip status={billing} />
                                                    </td>

                                                    <td className="py-3 pr-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                disabled={submitting || !canQueue}
                                                                onClick={() => {
                                                                    setSelectedIds([a.id]);
                                                                    setQueueAmount("");
                                                                    setQueueRemark("");
                                                                    setOpenQueue(true);
                                                                }}
                                                            >
                                                                Queue
                                                            </Button>

                                                            {isPaid ? (
                                                                <Button size="small" variant="contained" disabled className="!bg-slate-400 !text-white">
                                                                    Paid
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="small"
                                                                    variant="contained"
                                                                    disabled={submitting || !canAllocate}
                                                                    onClick={() => openAllocateSingle(a)}
                                                                    className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                                                                >
                                                                    Allocate
                                                                </Button>
                                                            )}

                                                            <IconButton size="small" onClick={() => openMore(a)} aria-label="View more">
                                                                <MoreVertIcon fontSize="small" />
                                                            </IconButton>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                                    Showing: <span className="font-semibold">{filteredAgents.length}</span> &nbsp;|&nbsp; Selected:{" "}
                                    <span className="font-semibold">{selectedIds.length}</span>
                                </div>
                            </div>
                        ) : (
                            /* MOBILE: card list */
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                                        Select all
                                    </label>

                                    <div className="text-xs text-slate-600 dark:text-slate-300">
                                        Selected: <span className="font-semibold">{selectedIds.length}</span>
                                    </div>
                                </div>

                                {filteredAgents.map((a) => {
                                    const billing = normBillingStatus(a.billing_status);
                                    const canQueue = billing === "pending" || billing === "unknown";
                                    const canAllocate = billing === "pending" || billing === "unknown";
                                    const isPaid = billing === "paid";

                                    return (
                                        <motion.div
                                            key={String(a.id)}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm"
                                        >
                                            <div className="flex items-start gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="mt-1"
                                                    checked={selectedIds.includes(a.id)}
                                                    onChange={() => toggleSelectOne(a.id)}
                                                />

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="font-semibold truncate">{a.full_name}</div>
                                                            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                                                Allocated:{" "}
                                                                <span className="font-semibold">{(a.wallet_balance ?? 0).toLocaleString()}</span> KES
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            <BillingChip status={billing} />
                                                            <IconButton size="small" onClick={() => openMore(a)} aria-label="View more">
                                                                <MoreVertIcon fontSize="small" />
                                                            </IconButton>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 flex gap-2">
                                                        <Button
                                                            fullWidth
                                                            size="small"
                                                            variant="outlined"
                                                            disabled={submitting || !canQueue}
                                                            onClick={() => {
                                                                setSelectedIds([a.id]);
                                                                setQueueAmount("");
                                                                setQueueRemark("");
                                                                setOpenQueue(true);
                                                            }}
                                                        >
                                                            Queue
                                                        </Button>

                                                        {isPaid ? (
                                                            <Button
                                                                fullWidth
                                                                size="small"
                                                                variant="contained"
                                                                disabled
                                                                className="!bg-slate-400 !text-white"
                                                            >
                                                                Paid
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                fullWidth
                                                                size="small"
                                                                variant="contained"
                                                                disabled={submitting || !canAllocate}
                                                                onClick={() => openAllocateSingle(a)}
                                                                className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                                                            >
                                                                Allocate
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* View More Drawer */}
                        <Drawer anchor="bottom" open={Boolean(moreAgent)} onClose={closeMore} PaperProps={{ className: "rounded-t-2xl" }}>
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-base font-semibold truncate">{moreAgent?.full_name}</div>
                                        <div className="mt-1">
                                            <BillingChip status={normBillingStatus(moreAgent?.billing_status)} />
                                        </div>
                                    </div>

                                    <Button variant="outlined" onClick={closeMore}>
                                        Close
                                    </Button>
                                </div>

                                <Divider className="!my-3" />

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <PhoneIphoneIcon fontSize="small" />
                                        <span className="text-slate-600 dark:text-slate-300">Phone:</span>
                                        <span className="font-medium">{moreAgent?.phone || moreAgent?.mpesa_number || "-"}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <PlaceOutlinedIcon fontSize="small" />
                                        <span className="text-slate-600 dark:text-slate-300">Region:</span>
                                        <span className="font-medium">{moreAgent?.region || "-"}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <AccountTreeOutlinedIcon fontSize="small" />
                                        <span className="text-slate-600 dark:text-slate-300">Lifecycle:</span>
                                        <span className="font-medium">{moreAgent?.lifecycle_status || "—"}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <EventOutlinedIcon fontSize="small" />
                                        <span className="text-slate-600 dark:text-slate-300">Last allocation:</span>
                                        <span className="font-medium">{moreAgent?.last_allocation_date || "-"}</span>
                                    </div>

                                    <div className="pt-2">
                                        <div className="text-xs text-slate-500">Allocated (KES)</div>
                                        <div className="text-lg font-bold">{(moreAgent?.wallet_balance ?? 0).toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </Drawer>
                    </>
                )}
            </section>

            {/* Allocate Single */}
            <Dialog open={openAllocSingle} onClose={() => setOpenAllocSingle(false)} fullWidth maxWidth="sm">
                <DialogTitle>Allocate Funds</DialogTitle>
                <DialogContent className="space-y-4">
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                        Agent: <span className="font-semibold">{selectedAgent?.full_name}</span>
                    </div>

                    <TextField
                        label="Amount (KES)"
                        type="number"
                        fullWidth
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        sx={inputSx}
                        required
                    />

                    <TextField
                        label="Remark (Optional)"
                        fullWidth
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        sx={inputSx}
                        multiline
                        rows={2}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAllocSingle(false)} disabled={submitting} variant="outlined">
                        Cancel
                    </Button>
                    <Button
                        onClick={submitAllocateSingle}
                        disabled={submitting}
                        variant="contained"
                        className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <CircularProgress size={18} color="inherit" /> Allocating...
                            </span>
                        ) : (
                            "Allocate"
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Allocate */}
            <Dialog open={openAllocBulk} onClose={() => setOpenAllocBulk(false)} fullWidth maxWidth="sm">
                <DialogTitle>Bulk Allocate Funds</DialogTitle>
                <DialogContent className="space-y-4">
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                        {selectedIds.length > 0 ? (
                            <>
                                Allocate to <span className="font-semibold">{selectedIds.length}</span> selected agent(s).
                            </>
                        ) : (
                            <>
                                Allocate to <span className="font-semibold">ALL</span> agents in the current filter.
                            </>
                        )}
                    </div>

                    <TextField
                        label="Amount (KES)"
                        type="number"
                        fullWidth
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        sx={inputSx}
                        required
                    />

                    <TextField
                        label="Remark (Optional)"
                        fullWidth
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        sx={inputSx}
                        multiline
                        rows={2}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAllocBulk(false)} disabled={submitting} variant="outlined">
                        Cancel
                    </Button>
                    <Button
                        onClick={() => submitAllocateBulk(selectedIds.length > 0 ? "batch" : "all")}
                        disabled={submitting}
                        variant="contained"
                        className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <CircularProgress size={18} color="inherit" /> Processing...
                            </span>
                        ) : (
                            "Allocate"
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Queue Modal */}
            <Dialog open={openQueue} onClose={() => setOpenQueue(false)} fullWidth maxWidth="sm">
                <DialogTitle>Queue Payments</DialogTitle>
                <DialogContent className="space-y-4">
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                        {selectedIds.length > 0 ? (
                            <>
                                Queue payment for <span className="font-semibold">{selectedIds.length}</span> selected agent(s).
                            </>
                        ) : (
                            <>
                                Queue payment for <span className="font-semibold">ALL pending</span> agents.
                            </>
                        )}
                    </div>

                    <TextField
                        label="Amount (Optional)"
                        type="number"
                        fullWidth
                        value={queueAmount}
                        onChange={(e) => setQueueAmount(e.target.value)}
                        sx={inputSx}
                        helperText="Leave empty if backend calculates the payout amount."
                    />

                    <TextField
                        label="Remark (Optional)"
                        fullWidth
                        value={queueRemark}
                        onChange={(e) => setQueueRemark(e.target.value)}
                        sx={inputSx}
                        multiline
                        rows={2}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenQueue(false)} disabled={submitting} variant="outlined">
                        Cancel
                    </Button>

                    <Button
                        onClick={() => submitQueue(selectedIds.length === 1 ? "one" : selectedIds.length > 1 ? "batch" : "all")}
                        disabled={submitting}
                        variant="contained"
                        className="!bg-purple-600 hover:!bg-purple-700 !text-white"
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <CircularProgress size={18} color="inherit" /> Queuing...
                            </span>
                        ) : (
                            "Queue"
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Mark Paid Modal */}
            <Dialog open={openMarkPaid} onClose={() => setOpenMarkPaid(false)} fullWidth maxWidth="sm">
                <DialogTitle>Mark as Paid</DialogTitle>
                <DialogContent className="space-y-3">
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                        Marks selected <span className="font-semibold">BILLED</span> agents as{" "}
                        <span className="font-semibold">PAID</span>.
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">Tip: Use the “Billed” filter then select all.</div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenMarkPaid(false)} disabled={submitting} variant="outlined">
                        Cancel
                    </Button>

                    <Button
                        onClick={markPaid}
                        disabled={submitting || selectedIds.length === 0}
                        variant="contained"
                        startIcon={<CheckCircle2 size={16} />}
                        className="!bg-emerald-700 hover:!bg-emerald-800 !text-white"
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <CircularProgress size={18} color="inherit" /> Updating...
                            </span>
                        ) : (
                            "Mark Paid"
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={closeSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ width: "100%", borderRadius: "8px" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
}
