import { useEffect, useMemo, useState } from "react";
import { Alert, Snackbar, CircularProgress } from "@mui/material";
import type { AlertColor } from "@mui/material";
import { Wallet } from "lucide-react";
import { useUser } from "../../contexts/UserContext";

import { StatCard } from "../components/StatCard";
import { TopActionsBar } from "../components/TopActionsBar";
import { LocationFilters } from "../components/LocationFilters";

import type { BillingStatus, BillFilter, DeployedAgent, Option } from "../utils/types";
import { normBillingStatus, pickFirst, normalizeListResponse, needsParam } from "../utils/helpers";
import { API_BASE, AGENT_PAYMENTS_PERMISSION, POLLING_ENDPOINTS, safeFetch } from "../utils/api";

export default function AgentPaymentsPage() {
    const { hasPermission, user } = useUser();

    const [agents, setAgents] = useState<DeployedAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);
    const [billFilter, setBillFilter] = useState<BillFilter>("all");
    const [submitting, setSubmitting] = useState(false);

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    // drilldown
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

    // maps for codes
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
    // Fetch agents
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

            if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch deployed agents.");

            const list = Array.isArray(data.data) ? data.data : [];
            setAgents(list);
            setSelectedIds((prev) => prev.filter((id) => list.some((a: any) => String(a.id) === String(id))));
        } catch (e: any) {
            setError(e?.message || "Failed to fetch deployed agents.");
        } finally {
            setLoading(false);
        }
    };

    // ✅ Mark paid handler (TopActionsBar collects amount + comment; parent does the API + refresh)
    const handleMarkPaid = async (payload: { amount: number; comment: string }) => {
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
                    body: JSON.stringify({
                        agent_id: id,
                        amount: payload.amount,
                        comment: payload.comment?.trim() || null,
                        paid_by: (user as any)?.id ?? null,
                    }),
                });

                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) throw new Error(data.message || `Failed marking agent ${id} as paid.`);
            }

            setSnackbar({ open: true, severity: "success", message: `Marked ${billedIds.length} agent(s) as PAID.` });
            setSelectedIds([]);
            await fetchAgents();
        } catch (e: any) {
            setSnackbar({ open: true, severity: "error", message: e?.message || "Mark paid failed." });
        } finally {
            setSubmitting(false);
        }
    };

    // lifecycle
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

    useEffect(() => {
        setSelectedIds([]);
        if (allowed) fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [billFilter]);

    useEffect(() => {
        setSelectedIds([]);
        setConstituencies([]);
        setWards([]);
        setPollingStations([]);
        setConstituencyId("");
        setWardId("");
        setPollingStationId("");

        if (countyId !== "") fetchConstituencies(Number(countyId));
        if (allowed) fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [countyId]);

    useEffect(() => {
        setSelectedIds([]);
        setWards([]);
        setPollingStations([]);
        setWardId("");
        setPollingStationId("");

        if (constituencyId !== "") fetchWards(Number(constituencyId));
        if (allowed) fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [constituencyId]);

    useEffect(() => {
        setSelectedIds([]);
        setPollingStations([]);
        setPollingStationId("");

        if (wardId !== "") fetchPollingStations(Number(wardId));
        if (allowed) fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wardId]);

    useEffect(() => {
        setSelectedIds([]);
        if (allowed) fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pollingStationId]);

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
        <div className="container mx-auto px-4 py-6 sm:py-8 min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
            <header className="mb-5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Wallet className="text-purple-500" size={26} />
                    Agent Payments
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Track and act on payment lifecycle: Pending → Billed → Paid.
                </p>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <StatCard title="Pending" value={stats.pending} hint="Eligible to queue" />
                <StatCard title="Billed" value={stats.billed} hint="Ready to mark paid" />
                <StatCard title="Paid" value={stats.paid} hint="Locked actions" />
                <StatCard title="Total" value={agents.length} />
            </div>

            <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-md p-4 sm:p-6 border border-slate-100 dark:border-slate-800">
                <TopActionsBar
                    billFilter={billFilter}
                    setBillFilter={(v) => {
                        setBillFilter(v);
                        setSelectedIds([]);
                    }}
                    loading={loading}
                    submitting={submitting}
                    selectedCount={selectedIds.length}
                    hasRows={filteredAgents.length > 0}
                    onRefresh={fetchAgents}
                    onAllocateSelected={() =>
                        setSnackbar({ open: true, severity: "info", message: "Allocate modal will be moved next." })
                    }
                    onAllocateAllFiltered={() =>
                        setSnackbar({ open: true, severity: "info", message: "Allocate all modal will be moved next." })
                    }
                    onQueueSelected={() =>
                        setSnackbar({ open: true, severity: "info", message: "Queue modal will be moved next." })
                    }
                    onQueueAllPending={() =>
                        setSnackbar({ open: true, severity: "info", message: "Queue all pending modal will be moved next." })
                    }
                    // ✅ real handler now
                    onMarkPaid={handleMarkPaid}
                />

                <LocationFilters
                    counties={counties}
                    constituencies={constituencies}
                    wards={wards}
                    pollingStations={pollingStations}
                    countyId={countyId}
                    setCountyId={setCountyId}
                    constituencyId={constituencyId}
                    setConstituencyId={setConstituencyId}
                    wardId={wardId}
                    setWardId={setWardId}
                    pollingStationId={pollingStationId}
                    setPollingStationId={setPollingStationId}
                    loadingAny={loadingCounties || loadingConstituencies || loadingWards || loadingPollingStations}
                    loadingConstituencies={loadingConstituencies}
                    loadingWards={loadingWards}
                    loadingPollingStations={loadingPollingStations}
                />

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
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                        ✅ Page shell is now componentized. Next we plug in the new table/list UI + “View more” drawer + actions.
                        <div className="mt-2">
                            Rows: <span className="font-semibold">{filteredAgents.length}</span> | Selected:{" "}
                            <span className="font-semibold">{selectedIds.length}</span>
                        </div>

                        {/* ✅ Added: use toggleSelectAll so TS doesn't complain */}
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={toggleSelectAll}
                                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm"
                            >
                                {allSelected ? "Clear selection" : "Select all"}
                            </button>
                        </div>

                        {/* TEMP: basic selectable list so you can keep working */}
                        <div className="mt-4 space-y-2">
                            {filteredAgents.slice(0, 20).map((a) => (
                                <label
                                    key={String(a.id)}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3"
                                >
                                    <div className="min-w-0">
                                        <div className="font-semibold truncate">{a.full_name}</div>
                                        <div className="text-xs text-slate-500">
                                            Wallet: {(a.wallet_balance ?? 0).toLocaleString()} | Status:{" "}
                                            {normBillingStatus(a.billing_status)}
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(a.id)}
                                        onChange={() => toggleSelectOne(a.id)}
                                    />
                                </label>
                            ))}
                        </div>

                        <div className="mt-3 text-xs text-slate-500">
                            Showing first 20 items temporarily (table + mobile list comes next).
                        </div>
                    </div>
                )}
            </section>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={closeSnackbar}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ width: "100%", borderRadius: "8px" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
}
