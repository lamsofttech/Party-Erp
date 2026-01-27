import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/** ---------------- Types ---------------- */
type County = {
    county_code: string;
    county_name: string;
};

type Constituency = {
    const_code: string;
    constituency_name: string;
};

type Ward = {
    ward_code: string;
    ward_name: string;
};

type AnalyticsKpis = {
    totals_by_cycle: Record<string, number>;
    counts: { counties: number; constituencies: number; wards: number };
    growth_vs_2022?: {
        base_cycle: number;
        target_cycle: number;
        base_voters: number;
        target_voters: number;
        delta: number;
        delta_pct: number;
    };
};

type ApiOk<T> = { status: "success"; data: T };
type ApiErr = { status: "error"; message?: string };
type ApiResp<T> = ApiOk<T> | ApiErr;

/** ---------------- API helpers ---------------- */
const API_BASE =
    (import.meta as any).env?.VITE_API_BASE_URL
        ? `${(import.meta as any).env.VITE_API_BASE_URL}/API`
        : "/API";

async function apiGetData<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
    const text = await res.text();

    let json: ApiResp<T> | null = null;
    try {
        json = JSON.parse(text);
    } catch {
        // non-json
    }

    if (!res.ok) {
        const msg =
            (json && (json as ApiErr)?.message) ||
            `HTTP ${res.status} - ${text?.slice(0, 160) || "Server error"}`;
        throw new Error(msg);
    }

    if (!json || json.status !== "success") {
        throw new Error((json as ApiErr)?.message || "API error");
    }

    return (json as ApiOk<T>).data;
}

/** ---------------- UI helpers ---------------- */
function SkeletonLine({ w = "w-24" }: { w?: string }) {
    return <div className={`h-6 ${w} rounded bg-gray-100 animate-pulse`} />;
}
function fmt(n: number) {
    return new Intl.NumberFormat().format(n ?? 0);
}

/** ---------------- Page ---------------- */
export default function VoterRegisterDashboard() {
    const CYCLE = 2027;
    const SCOPE_KEY = `vr_scope_${CYCLE}`;

    /** KPIs (analytics) */
    const [loadingKpis, setLoadingKpis] = useState(false);
    const [kpisError, setKpisError] = useState<string | null>(null);
    const [kpis, setKpis] = useState<AnalyticsKpis | null>(null);

    /** Regional cascade state */
    const [loading, setLoading] = useState(true);
    const [countiesCount, setCountiesCount] = useState<number>(0);

    const [counties, setCounties] = useState<County[]>([]);
    const [constituencies, setConstituencies] = useState<Constituency[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);

    const [loadingCounties, setLoadingCounties] = useState(false);
    const [loadingConstituencies, setLoadingConstituencies] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);

    const [countyError, setCountyError] = useState<string | null>(null);
    const [constituencyError, setConstituencyError] = useState<string | null>(null);
    const [wardError, setWardError] = useState<string | null>(null);

    const [selectedCounty, setSelectedCounty] = useState<{ code: string; name: string } | null>(null);
    const [selectedConstituency, setSelectedConstituency] = useState<{ code: string; name: string } | null>(null);
    const [selectedWard, setSelectedWard] = useState<{ code: string; name: string } | null>(null);

    /** Restore scope */
    useEffect(() => {
        try {
            const raw = localStorage.getItem(SCOPE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as {
                county?: { code: string; name: string } | null;
                constituency?: { code: string; name: string } | null;
                ward?: { code: string; name: string } | null;
            };
            if (parsed?.county?.code) setSelectedCounty(parsed.county);
            if (parsed?.constituency?.code) setSelectedConstituency(parsed.constituency);
            if (parsed?.ward?.code) setSelectedWard(parsed.ward);
        } catch {
            // ignore
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Persist scope */
    useEffect(() => {
        try {
            localStorage.setItem(
                SCOPE_KEY,
                JSON.stringify({ county: selectedCounty, constituency: selectedConstituency, ward: selectedWard })
            );
        } catch {
            // ignore
        }
    }, [selectedCounty, selectedConstituency, selectedWard]);

    /** Load counties once */
    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setLoading(true);
                setLoadingCounties(true);
                setCountyError(null);

                const data = await apiGetData<County[]>(`/get_counties.php?cycle=${encodeURIComponent(String(CYCLE))}`);

                if (!alive) return;
                setCounties(data || []);
                setCountiesCount(data?.length ?? 0);
            } catch (e: any) {
                if (!alive) return;
                setCounties([]);
                setCountiesCount(0);
                setCountyError(e?.message || "Failed to load counties");
            } finally {
                if (alive) {
                    setLoadingCounties(false);
                    setLoading(false);
                }
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    /** Downward resets */
    const resetBelowCounty = () => {
        setSelectedConstituency(null);
        setSelectedWard(null);
        setConstituencies([]);
        setWards([]);
        setConstituencyError(null);
        setWardError(null);
    };

    const resetBelowConstituency = () => {
        setSelectedWard(null);
        setWards([]);
        setWardError(null);
    };

    /** Load constituencies */
    useEffect(() => {
        const countyCode = selectedCounty?.code;
        if (!countyCode) {
            setConstituencies([]);
            return;
        }

        let alive = true;
        (async () => {
            try {
                setLoadingConstituencies(true);
                setConstituencyError(null);

                const data = await apiGetData<Constituency[]>(
                    `/get_constituencies.php?cycle=${encodeURIComponent(String(CYCLE))}&county_code=${encodeURIComponent(
                        countyCode
                    )}`
                );

                if (!alive) return;
                setConstituencies(data || []);
            } catch (e: any) {
                if (!alive) return;
                setConstituencies([]);
                setConstituencyError(e?.message || "Failed to load constituencies");
            } finally {
                if (alive) setLoadingConstituencies(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [selectedCounty?.code]);

    /** Load wards */
    useEffect(() => {
        const constCode = selectedConstituency?.code;
        if (!constCode) {
            setWards([]);
            return;
        }

        let alive = true;
        (async () => {
            try {
                setLoadingWards(true);
                setWardError(null);

                const data = await apiGetData<Ward[]>(
                    `/get_wards.php?cycle=${encodeURIComponent(String(CYCLE))}&const_code=${encodeURIComponent(constCode)}`
                );

                if (!alive) return;
                setWards(data || []);
            } catch (e: any) {
                if (!alive) return;
                setWards([]);
                setWardError(e?.message || "Failed to load wards");
            } finally {
                if (alive) setLoadingWards(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [selectedConstituency?.code]);

    /** ✅ Load analytics KPIs (re-run whenever scope changes) */
    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setLoadingKpis(true);
                setKpisError(null);

                const qs = new URLSearchParams();
                if (selectedCounty?.code) qs.set("county_code", selectedCounty.code);
                if (selectedConstituency?.code) qs.set("const_code", selectedConstituency.code);
                // Optional later if backend supports:
                // if (selectedWard?.code) qs.set("ward_code", selectedWard.code);

                const data = await apiGetData<AnalyticsKpis>(
                    `/voter-register/analytics__kpis.php?${qs.toString()}`
                );

                if (!alive) return;
                setKpis(data);
            } catch (e: any) {
                if (!alive) return;
                setKpis(null);
                setKpisError(e?.message || "Failed to load analytics");
            } finally {
                if (alive) setLoadingKpis(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [selectedCounty?.code, selectedConstituency?.code, selectedWard?.code]);

    /** Cards */
    const cards = useMemo(
        () => [
            { title: "Import & Releases", to: "/voter-register/import", desc: "Upload register CSVs and manage releases." },
            { title: "Register Search", to: "/voter-register/search", desc: "Search voters by name, ID, station, ward." },
            { title: "Register Compare", to: "/voter-register/compare", desc: "Compare two releases and see deltas." },
            { title: "Ward / PS Rollups", to: "/voter-register/rollups", desc: "Aggregated counts by ward and polling station." },
            { title: "Duplicates & Cleanup", to: "/voter-register/cleanup", desc: "Detect anomalies, duplicates and cleanup data." },
            { title: "Geo Mapping", to: "/voter-register/geo-mapping", desc: "Counties → Constituencies → Wards → Stations." },
            { title: "Export Center", to: "/voter-register/exports", desc: "Generate restricted exports for teams." },
            { title: "AI Insights (Beta)", to: "/voter-register/ai-insights", desc: "Predictions, prioritization & hotspots." },
        ],
        []
    );

    const hasScope = !!(selectedCounty?.code || selectedConstituency?.code || selectedWard?.code);
    const breadcrumb =
        [selectedCounty?.name, selectedConstituency?.name, selectedWard?.name].filter(Boolean).join(" → ") || "All Regions";

    /** KPI derived values */
    const voters2027 = kpis?.totals_by_cycle?.["2027"];
    const voters2022 = kpis?.totals_by_cycle?.["2022"];
    const voters2017 = kpis?.totals_by_cycle?.["2017"];
    const wardsCovered = kpis?.counts?.wards;

    /** ERP classes */
    const shell = "min-h-screen bg-[#F6F7FB]";
    const wrap = "mx-auto max-w-6xl p-4 md:p-6";
    const panel = "rounded-2xl border border-black/10 bg-white shadow-[0_8px_18px_rgba(17,24,39,.08)]";
    const btn =
        "rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-black/[0.03] focus:outline-none focus:ring-4 focus:ring-red-500/10";
    const chip = "inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-gray-800";
    const badge = "rounded-full bg-gray-900 px-3 py-1 text-[11px] font-semibold text-white";
    const select =
        "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/30 disabled:bg-gray-50 disabled:text-gray-400";

    return (
        <div className={shell}>
            <div className={wrap}>
                {/* Header */}
                <div className={`${panel} p-4 md:p-5 mb-4`}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg md:text-xl font-extrabold text-gray-900 tracking-tight">Voter Register</h1>
                                <span className={badge}>Cycle {CYCLE}</span>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">Imports • Search • Rollups • Exports • Geo Mapping</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className={chip}>
                                Scope: <span className="font-bold text-[#F43742]">{breadcrumb}</span>
                            </span>

                            {hasScope && (
                                <button
                                    className={btn}
                                    onClick={() => {
                                        setSelectedCounty(null);
                                        resetBelowCounty();
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className={`${panel} p-4`}>
                        <div className="text-xs text-gray-500">Registered Voters</div>

                        <div className="mt-1 text-2xl font-extrabold text-gray-900">
                            {loadingKpis ? <SkeletonLine w="w-28" /> : voters2027 != null ? fmt(voters2027) : "—"}
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                            {kpisError ? (
                                <span className="text-red-600">{kpisError}</span>
                            ) : (
                                <span>
                                    2017: <b>{voters2017 != null ? fmt(voters2017) : "—"}</b> •{" "}
                                    2022: <b>{voters2022 != null ? fmt(voters2022) : "—"}</b> •{" "}
                                    2027: <b>{voters2027 != null ? fmt(voters2027) : "—"}</b>
                                    {kpis?.growth_vs_2022 ? (
                                        <>
                                            {" "}
                                            • Δ: <b>{fmt(kpis.growth_vs_2022.delta)}</b> (
                                            <b>{kpis.growth_vs_2022.delta_pct}%</b>)
                                        </>
                                    ) : null}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={`${panel} p-4`}>
                        <div className="text-xs text-gray-500">Wards Covered</div>
                        <div className="mt-1 text-2xl font-extrabold text-gray-900">
                            {loadingKpis ? <SkeletonLine w="w-16" /> : wardsCovered != null ? fmt(wardsCovered) : "—"}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">From analytics (filtered by scope)</div>
                    </div>

                    <div className={`${panel} p-4`}>
                        <div className="text-xs text-gray-500">Counties</div>
                        <div className="mt-1 text-2xl font-extrabold text-gray-900">{loading ? <SkeletonLine w="w-16" /> : countiesCount}</div>
                        <div className="mt-1 text-xs">
                            {countyError ? (
                                <span className="text-red-600">{countyError}</span>
                            ) : (
                                <span className="text-gray-500">Master list</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className={`${panel} p-4 md:p-5 mb-4`}>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-extrabold text-gray-900">Filters</div>
                            <div className="text-xs text-gray-500 mt-1">Set scope for all modules</div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                className={btn}
                                disabled={!hasScope}
                                onClick={() => {
                                    setSelectedCounty(null);
                                    resetBelowCounty();
                                }}
                                title={!hasScope ? "Nothing to reset" : "Reset scope"}
                            >
                                Reset
                            </button>

                            <button className={btn} onClick={() => window.location.reload()} title="Refresh page">
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div
                        className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4"
                        aria-busy={loadingCounties || loadingConstituencies || loadingWards}
                    >
                        {/* County */}
                        <div>
                            <label className="text-[12px] font-semibold text-gray-700">County</label>
                            {countyError ? (
                                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                                    {countyError}
                                </div>
                            ) : (
                                <select
                                    className={`${select} mt-1`}
                                    value={selectedCounty?.code || ""}
                                    disabled={loadingCounties}
                                    onChange={(e) => {
                                        const code = e.target.value;
                                        if (!code) {
                                            setSelectedCounty(null);
                                            resetBelowCounty();
                                            return;
                                        }
                                        const c = counties.find((x) => x.county_code === code);
                                        if (!c) return;
                                        setSelectedCounty({ code: c.county_code, name: c.county_name });
                                        resetBelowCounty();
                                    }}
                                >
                                    <option value="">{loadingCounties ? "Loading…" : "Select county"}</option>
                                    {counties.map((c) => (
                                        <option key={c.county_code} value={c.county_code}>
                                            {c.county_name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Constituency */}
                        <div>
                            <label className="text-[12px] font-semibold text-gray-700">Constituency</label>
                            <select
                                className={`${select} mt-1`}
                                value={selectedConstituency?.code || ""}
                                disabled={!selectedCounty?.code || loadingConstituencies}
                                onChange={(e) => {
                                    const code = e.target.value;
                                    if (!code) {
                                        setSelectedConstituency(null);
                                        resetBelowConstituency();
                                        return;
                                    }
                                    const ct = constituencies.find((x) => x.const_code === code);
                                    if (!ct) return;
                                    setSelectedConstituency({ code: ct.const_code, name: ct.constituency_name });
                                    resetBelowConstituency();
                                }}
                            >
                                <option value="">
                                    {!selectedCounty?.code ? "Select county first" : loadingConstituencies ? "Loading…" : "Select constituency"}
                                </option>
                                {constituencies.map((ct) => (
                                    <option key={ct.const_code} value={ct.const_code}>
                                        {ct.constituency_name}
                                    </option>
                                ))}
                            </select>
                            {constituencyError && <div className="mt-1 text-xs text-red-600">{constituencyError}</div>}
                        </div>

                        {/* Ward */}
                        <div>
                            <label className="text-[12px] font-semibold text-gray-700">Ward</label>
                            <select
                                className={`${select} mt-1`}
                                value={selectedWard?.code || ""}
                                disabled={!selectedConstituency?.code || loadingWards}
                                onChange={(e) => {
                                    const code = e.target.value;
                                    if (!code) {
                                        setSelectedWard(null);
                                        return;
                                    }
                                    const w = wards.find((x) => x.ward_code === code);
                                    if (!w) return;
                                    setSelectedWard({ code: w.ward_code, name: w.ward_name });
                                }}
                            >
                                <option value="">
                                    {!selectedConstituency?.code ? "Select constituency first" : loadingWards ? "Loading…" : "Select ward"}
                                </option>
                                {wards.map((w) => (
                                    <option key={w.ward_code} value={w.ward_code}>
                                        {w.ward_name}
                                    </option>
                                ))}
                            </select>
                            {wardError && <div className="mt-1 text-xs text-red-600">{wardError}</div>}
                        </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.03] p-3 text-xs text-gray-600">
                        Scope applies to: Imports, Search, Rollups, Exports, Geo Mapping.
                    </div>
                </div>

                {/* Module Tiles */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {cards.map((c) => (
                        <Link
                            key={c.to}
                            to={c.to}
                            className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_8px_18px_rgba(17,24,39,.08)] transition hover:-translate-y-[1px] hover:shadow-[0_12px_26px_rgba(17,24,39,.10)] hover:border-red-500/20 focus:outline-none focus:ring-4 focus:ring-red-500/10"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="font-extrabold text-gray-900">{c.title}</div>
                                <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                                    Open
                                </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-600">{c.desc}</div>

                            <div className="mt-3 h-[6px] rounded-full bg-red-500/10 overflow-hidden">
                                <div className="h-full w-[38%] bg-[#F43742]" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
