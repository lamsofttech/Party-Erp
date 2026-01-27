import { useEffect, useMemo, useState } from "react";

/**
 * ✅ API_BASE rules:
 * - If VITE_API_BASE_URL is set (recommended), we call `${API_BASE}/API/...`
 * - Otherwise we call `/API/...` relative (works if Vite proxies /API to backend)
 */
const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, "") || "").trim();

type ApiResponse<T> = {
    status: "success" | "error";
    message?: string;
    data?: T;
    count?: number;
    meta?: any;
};

type County = { county_code: string; county_name: string };
type Constituency = { const_code: string; constituency_name: string };
type Ward = { ward_code: string; ward_name: string };

type OverviewData = {
    cycle?: string;
    scope?: {
        level?: string;
        county_code?: string | null;
        const_code?: string | null;
        caw_code?: string | null;
    };
    totals?: {
        stations?: number;
        total_registered_voters?: number;
    };
    delta_vs_base?: {
        base_cycle?: string;
        delta_registered?: number;
        delta_pct?: number;
    };
    top_growth?: Array<{
        level?: string;
        code?: string;
        name?: string;
        base_registered?: number;
        target_registered?: number;
        delta?: number;
        delta_pct?: number;
    }>;
};

type HeatmapRow = {
    level?: string;
    code?: string;
    name?: string;
    registered_voters?: number; // if your API uses this as "target/current", keep it
    score?: number;
    delta?: number;
    delta_pct?: number;
    notes?: string;
};

/**
 * ✅ Prediction comparison row
 * This supports the 2 objectives:
 * - mobilize registrations (underperformance)
 * - hotspots beyond prediction (overperformance)
 *
 * If your API returns expected/actual directly, perfect.
 * If not, we can compute, but we need at least both expected and actual from somewhere.
 */
type PredictionRow = {
    level?: string;
    code?: string;
    name?: string;

    expected_registered?: number; // predicted
    actual_registered?: number; // observed

    gap?: number; // actual - expected
    gap_pct?: number; // (actual-expected)/expected*100

    score?: number;
    notes?: string;
};

type AnomalyRow = {
    level?: string;
    code?: string;
    name?: string;
    base_registered?: number;
    target_registered?: number;
    delta?: number;
    delta_pct?: number;
    severity?: "low" | "medium" | "high";
    reason?: string;
};

function apiUrl(path: string) {
    // path should start with "/API/..."
    return API_BASE ? `${API_BASE}${path}` : path;
}

async function apiGet<T>(path: string, params: Record<string, any>) {
    const url = new URL(apiUrl(path), window.location.origin);

    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        url.searchParams.set(k, String(v));
    });

    const res = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
    });

    // safer parsing (avoid crashing if server returns HTML)
    const text = await res.text();
    let json: ApiResponse<T> | null = null;
    try {
        json = JSON.parse(text);
    } catch {
        // ignore
    }

    if (!res.ok) {
        throw new Error(json?.message || `Request failed: ${res.status}`);
    }
    if (!json || json.status !== "success") {
        throw new Error(json?.message || "API error");
    }
    return json;
}

function formatNumber(n?: number | null) {
    if (n === undefined || n === null) return "—";
    try {
        return new Intl.NumberFormat().format(n);
    } catch {
        return String(n);
    }
}

function formatPct(n?: number | null) {
    if (n === undefined || n === null) return "—";
    return `${Number(n).toFixed(2)}%`;
}

function badgeColor(sev?: string) {
    if (sev === "high") return "bg-red-50 text-red-700 border-red-200";
    if (sev === "medium") return "bg-yellow-50 text-yellow-800 border-yellow-200";
    return "bg-gray-50 text-gray-700 border-gray-200";
}

function gapBadgeColor(gapPct?: number | null) {
    if (gapPct === undefined || gapPct === null) return "bg-gray-50 text-gray-700 border-gray-200";
    if (gapPct >= 20) return "bg-green-50 text-green-700 border-green-200"; // exceeded prediction strongly
    if (gapPct >= 0) return "bg-green-50 text-green-700 border-green-200"; // exceeded or on target
    if (gapPct <= -20) return "bg-red-50 text-red-700 border-red-200"; // underperformed strongly
    return "bg-yellow-50 text-yellow-800 border-yellow-200"; // mild underperformance
}

export default function VoterRegisterAIInsights() {
    const [cycle, setCycle] = useState<string>("2027");
    const [base, setBase] = useState<string>("2022");
    const [level, setLevel] = useState<"county" | "constituency" | "ward" | "station">("ward");

    // ✅ Cascade selection
    const [counties, setCounties] = useState<County[]>([]);
    const [constituencies, setConstituencies] = useState<Constituency[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);

    const [countyCode, setCountyCode] = useState<string>("");
    const [constCode, setConstCode] = useState<string>("");
    const [cawCode, setCawCode] = useState<string>("");

    const [loadingGeo, setLoadingGeo] = useState({ counties: false, consts: false, wards: false });
    const [geoError, setGeoError] = useState<{ counties?: string; consts?: string; wards?: string }>({});

    const scopeParams = useMemo(() => {
        return {
            cycle,
            base,
            level,
            county_code: countyCode,
            const_code: constCode,
            caw_code: cawCode,
        };
    }, [cycle, base, level, countyCode, constCode, cawCode]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");

    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [heatmap, setHeatmap] = useState<HeatmapRow[]>([]);
    const [anomalies, setAnomalies] = useState<AnomalyRow[]>([]);

    // ✅ NEW: predicted-vs-actual comparisons
    const [underperform, setUnderperform] = useState<PredictionRow[]>([]);
    const [overperform, setOverperform] = useState<PredictionRow[]>([]);

    // ✅ Geo: load counties
    useEffect(() => {
        let live = true;

        (async () => {
            try {
                setLoadingGeo((p) => ({ ...p, counties: true }));
                setGeoError((p) => ({ ...p, counties: "" }));

                const res = await apiGet<County[]>("/API/get_counties.php", { cycle });

                if (!live) return;
                setCounties(res.data || []);
            } catch (e: any) {
                if (!live) return;
                setCounties([]);
                setGeoError((p) => ({ ...p, counties: e?.message || "Failed to load counties" }));
            } finally {
                if (live) setLoadingGeo((p) => ({ ...p, counties: false }));
            }
        })();

        return () => {
            live = false;
        };
    }, [cycle]);

    // ✅ Geo: load constituencies when county changes (reset downward)
    useEffect(() => {
        setConstCode("");
        setCawCode("");
        setConstituencies([]);
        setWards([]);
        setGeoError((p) => ({ ...p, consts: "", wards: "" }));

        if (!countyCode) return;

        let live = true;
        (async () => {
            try {
                setLoadingGeo((p) => ({ ...p, consts: true }));
                const res = await apiGet<Constituency[]>("/API/get_constituencies.php", {
                    cycle,
                    county_code: countyCode,
                });

                if (!live) return;
                setConstituencies(res.data || []);
            } catch (e: any) {
                if (!live) return;
                setConstituencies([]);
                setGeoError((p) => ({ ...p, consts: e?.message || "Failed to load constituencies" }));
            } finally {
                if (live) setLoadingGeo((p) => ({ ...p, consts: false }));
            }
        })();

        return () => {
            live = false;
        };
    }, [countyCode, cycle]);

    // ✅ Geo: load wards when constituency changes (reset downward)
    useEffect(() => {
        setCawCode("");
        setWards([]);
        setGeoError((p) => ({ ...p, wards: "" }));

        if (!constCode) return;

        let live = true;
        (async () => {
            try {
                setLoadingGeo((p) => ({ ...p, wards: true }));
                const res = await apiGet<Ward[]>("/API/get_wards.php", { cycle, const_code: constCode });

                if (!live) return;
                setWards(res.data || []);
            } catch (e: any) {
                if (!live) return;
                setWards([]);
                setGeoError((p) => ({ ...p, wards: e?.message || "Failed to load wards" }));
            } finally {
                if (live) setLoadingGeo((p) => ({ ...p, wards: false }));
            }
        })();

        return () => {
            live = false;
        };
    }, [constCode, cycle]);

    function normalizePredictionRows(rows: PredictionRow[] = []) {
        return rows.map((r) => {
            const expected = r.expected_registered ?? null;
            const actual = r.actual_registered ?? null;

            let gap: number | null = r.gap ?? null;
            let gapPct: number | null = r.gap_pct ?? null;

            if (expected !== null && actual !== null) {
                gap = gap ?? actual - expected;
                gapPct = gapPct ?? (expected === 0 ? null : (gap / expected) * 100);
            }

            return { ...r, gap: gap ?? undefined, gap_pct: gapPct ?? undefined };
        });
    }

    // ✅ Insights fetch
    const fetchInsights = async () => {
        setError("");
        setLoading(true);

        try {
            const [ov, hm, an, pred] = await Promise.all([
                apiGet<OverviewData>("/API/voter-register/analytics__overview.php", scopeParams),
                apiGet<HeatmapRow[]>("/API/voter-register/analytics__heatmap.php", scopeParams),
                apiGet<AnomalyRow[]>("/API/voter-register/analytics__anomalies.php", {
                    ...scopeParams,
                    threshold_pct: 30,
                }),

                /**
                 * ✅ NEW endpoint (recommended):
                 * Returns rows with expected_registered and actual_registered per code
                 * Example item:
                 * { code, name, expected_registered, actual_registered, score, notes }
                 */
                apiGet<PredictionRow[]>("/API/voter-register/analytics__predicted_vs_actual.php", {
                    ...scopeParams,
                }),
            ]);

            setOverview(ov.data || null);
            setHeatmap(hm.data || []);
            setAnomalies(an.data || []);

            const predRows = normalizePredictionRows(pred.data || []);

            // Underperformance = actual < expected (gap negative)
            const under = predRows
                .filter((r) => (r.gap ?? 0) < 0)
                .sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0)); // most negative first

            // Overperformance = actual > expected (gap positive)
            const over = predRows
                .filter((r) => (r.gap ?? 0) > 0)
                .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0)); // biggest positive first

            setUnderperform(under);
            setOverperform(over);
        } catch (e: any) {
            setError(e?.message || "Failed to load insights.");
            setOverview(null);
            setHeatmap([]);
            setAnomalies([]);
            setUnderperform([]);
            setOverperform([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scopeParams]);

    const selectedCountyName = counties.find((c) => c.county_code === countyCode)?.county_name || "";
    const selectedConstName = constituencies.find((c) => c.const_code === constCode)?.constituency_name || "";
    const selectedWardName = wards.find((w) => w.ward_code === cawCode)?.ward_name || "";
    const breadcrumb = [selectedCountyName, selectedConstName, selectedWardName].filter(Boolean).join(" • ") || "—";

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">AI Insights (Beta)</h1>
                    <p className="text-sm text-gray-600 mt-1">Analytics, prioritization, and anomaly detection for the voter register.</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Using: {base} (base) → {cycle} (target) • Level: {level}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Selected: {breadcrumb}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select value={cycle} onChange={(e) => setCycle(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
                        <option value="2027">2027</option>
                        <option value="2022">2022</option>
                        <option value="2017">2017</option>
                    </select>

                    <select value={base} onChange={(e) => setBase(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
                        <option value="2022">Base: 2022</option>
                        <option value="2017">Base: 2017</option>
                    </select>

                    <select value={level} onChange={(e) => setLevel(e.target.value as any)} className="border rounded-lg px-3 py-2 text-sm bg-white">
                        <option value="county">County</option>
                        <option value="constituency">Constituency</option>
                        <option value="ward">Ward</option>
                        <option value="station">Polling Station</option>
                    </select>

                    <button onClick={fetchInsights} className="rounded-lg bg-gray-900 text-white px-3 py-2 text-sm hover:bg-black">
                        Refresh
                    </button>
                </div>
            </div>

            {/* Regional Cascade Driver */}
            <div className="mt-4 rounded-xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-gray-900">Regional Driver</div>
                        <div className="text-xs text-gray-600 mt-1">County → Constituency → Ward (drives the same scope used by analytics endpoints).</div>
                    </div>
                    <button
                        className="text-xs px-3 py-2 rounded-lg border hover:bg-gray-50"
                        onClick={() => {
                            setCountyCode("");
                            setConstCode("");
                            setCawCode("");
                            setConstituencies([]);
                            setWards([]);
                        }}
                    >
                        Reset
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div>
                        <div className="text-[11px] text-gray-500 mb-1">County</div>
                        {loadingGeo.counties ? (
                            <div className="text-xs text-gray-500">Loading…</div>
                        ) : geoError.counties ? (
                            <div className="text-xs text-red-600">{geoError.counties}</div>
                        ) : (
                            <select value={countyCode} onChange={(e) => setCountyCode(e.target.value)} className="w-full border rounded-md p-2 text-sm bg-white">
                                <option value="">Select county…</option>
                                {counties.map((c) => (
                                    <option key={c.county_code} value={c.county_code}>
                                        {c.county_name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <div className="text-[11px] text-gray-500 mb-1">Constituency</div>
                        {!countyCode ? (
                            <div className="text-xs text-gray-400">Pick county first</div>
                        ) : loadingGeo.consts ? (
                            <div className="text-xs text-gray-500">Loading…</div>
                        ) : geoError.consts ? (
                            <div className="text-xs text-red-600">{geoError.consts}</div>
                        ) : (
                            <select value={constCode} onChange={(e) => setConstCode(e.target.value)} className="w-full border rounded-md p-2 text-sm bg-white">
                                <option value="">Select constituency…</option>
                                {constituencies.map((ct) => (
                                    <option key={ct.const_code} value={ct.const_code}>
                                        {ct.constituency_name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <div className="text-[11px] text-gray-500 mb-1">Ward</div>
                        {!constCode ? (
                            <div className="text-xs text-gray-400">Pick constituency first</div>
                        ) : loadingGeo.wards ? (
                            <div className="text-xs text-gray-500">Loading…</div>
                        ) : geoError.wards ? (
                            <div className="text-xs text-red-600">{geoError.wards}</div>
                        ) : (
                            <select value={cawCode} onChange={(e) => setCawCode(e.target.value)} className="w-full border rounded-md p-2 text-sm bg-white">
                                <option value="">Select ward…</option>
                                {wards.map((w) => (
                                    <option key={w.ward_code} value={w.ward_code}>
                                        {w.ward_name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                    <div className="text-xs text-red-600 mt-1">
                        If you don’t have <b>analytics__predicted_vs_actual.php</b> yet, tell me your current API response and I’ll adjust the frontend OR I’ll give you the full API file.
                    </div>
                </div>
            ) : null}

            {loading ? (
                <div className="mt-6 rounded-xl border bg-white p-4 text-sm text-gray-600">Loading insights…</div>
            ) : (
                <>
                    {/* Overview cards */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-xl border bg-white p-4">
                            <div className="text-xs text-gray-500">Stations in scope</div>
                            <div className="text-xl font-semibold text-gray-900 mt-1">{formatNumber(overview?.totals?.stations)}</div>
                            <div className="text-xs text-gray-500 mt-2">Level: {overview?.scope?.level || level}</div>
                        </div>

                        <div className="rounded-xl border bg-white p-4">
                            <div className="text-xs text-gray-500">Total Registered (target)</div>
                            <div className="text-xl font-semibold text-gray-900 mt-1">{formatNumber(overview?.totals?.total_registered_voters)}</div>
                            <div className="text-xs text-gray-500 mt-2">Cycle: {overview?.cycle || cycle}</div>
                        </div>

                        <div className="rounded-xl border bg-white p-4">
                            <div className="text-xs text-gray-500">Change vs base ({overview?.delta_vs_base?.base_cycle || base})</div>
                            <div className="text-xl font-semibold text-gray-900 mt-1">{formatNumber(overview?.delta_vs_base?.delta_registered)}</div>
                            <div className="text-xs text-gray-500 mt-2">{formatPct(overview?.delta_vs_base?.delta_pct)}</div>
                        </div>
                    </div>

                    {/* Objective 1: Mobilize registrations (Underperformance) */}
                    <div className="mt-6 rounded-xl border bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Mobilize Registrations (Under target)</h2>
                                <p className="text-xs text-gray-500 mt-1">Where actual registrations are below prediction (biggest deficits first).</p>
                            </div>
                            <div className="text-xs text-gray-500">{underperform.length} rows</div>
                        </div>

                        <div className="mt-3 overflow-auto">
                            <table className="min-w-[980px] w-full text-sm">
                                <thead className="text-xs text-gray-500">
                                    <tr className="border-b">
                                        <th className="py-2 text-left">Name</th>
                                        <th className="py-2 text-left">Code</th>
                                        <th className="py-2 text-right">Expected</th>
                                        <th className="py-2 text-right">Actual</th>
                                        <th className="py-2 text-right">Gap</th>
                                        <th className="py-2 text-right">Gap %</th>
                                        <th className="py-2 text-left">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {underperform.slice(0, 15).map((r, idx) => (
                                        <tr key={`${r.code}-${idx}`} className="border-b last:border-0">
                                            <td className="py-2 font-medium text-gray-900">{r.name || "—"}</td>
                                            <td className="py-2 text-gray-600">{r.code || "—"}</td>
                                            <td className="py-2 text-right">{formatNumber(r.expected_registered)}</td>
                                            <td className="py-2 text-right">{formatNumber(r.actual_registered)}</td>
                                            <td className="py-2 text-right">{formatNumber(r.gap)}</td>
                                            <td className="py-2 text-right">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs ${gapBadgeColor(r.gap_pct)}`}>
                                                    {formatPct(r.gap_pct)}
                                                </span>
                                            </td>
                                            <td className="py-2 text-gray-600">{r.notes || "—"}</td>
                                        </tr>
                                    ))}
                                    {!underperform.length ? (
                                        <tr>
                                            <td className="py-3 text-gray-500" colSpan={7}>
                                                No underperformance rows returned for the selected scope.
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Objective 2: Beyond prediction (Overperformance hotspots) */}
                    <div className="mt-6 rounded-xl border bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Hotspots Beyond Prediction (Over target)</h2>
                                <p className="text-xs text-gray-500 mt-1">Where actual registrations exceeded prediction (biggest surges first).</p>
                            </div>
                            <div className="text-xs text-gray-500">{overperform.length} rows</div>
                        </div>

                        <div className="mt-3 overflow-auto">
                            <table className="min-w-[980px] w-full text-sm">
                                <thead className="text-xs text-gray-500">
                                    <tr className="border-b">
                                        <th className="py-2 text-left">Name</th>
                                        <th className="py-2 text-left">Code</th>
                                        <th className="py-2 text-right">Expected</th>
                                        <th className="py-2 text-right">Actual</th>
                                        <th className="py-2 text-right">Surge</th>
                                        <th className="py-2 text-right">Surge %</th>
                                        <th className="py-2 text-left">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {overperform.slice(0, 15).map((r, idx) => (
                                        <tr key={`${r.code}-${idx}`} className="border-b last:border-0">
                                            <td className="py-2 font-medium text-gray-900">{r.name || "—"}</td>
                                            <td className="py-2 text-gray-600">{r.code || "—"}</td>
                                            <td className="py-2 text-right">{formatNumber(r.expected_registered)}</td>
                                            <td className="py-2 text-right">{formatNumber(r.actual_registered)}</td>
                                            <td className="py-2 text-right">{formatNumber(r.gap)}</td>
                                            <td className="py-2 text-right">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs ${gapBadgeColor(r.gap_pct)}`}>
                                                    {formatPct(r.gap_pct)}
                                                </span>
                                            </td>
                                            <td className="py-2 text-gray-600">{r.notes || "—"}</td>
                                        </tr>
                                    ))}
                                    {!overperform.length ? (
                                        <tr>
                                            <td className="py-3 text-gray-500" colSpan={7}>
                                                No overperformance rows returned for the selected scope.
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Existing Heatmap */}
                    <div className="mt-6 rounded-xl border bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Hotspots (priority)</h2>
                                <p className="text-xs text-gray-500 mt-1">Highest score areas to prioritize.</p>
                            </div>
                            <div className="text-xs text-gray-500">{heatmap.length} rows</div>
                        </div>

                        <div className="mt-3 overflow-auto">
                            <table className="min-w-[900px] w-full text-sm">
                                <thead className="text-xs text-gray-500">
                                    <tr className="border-b">
                                        <th className="py-2 text-left">Name</th>
                                        <th className="py-2 text-left">Code</th>
                                        <th className="py-2 text-right">Registered</th>
                                        <th className="py-2 text-right">Δ</th>
                                        <th className="py-2 text-right">Δ%</th>
                                        <th className="py-2 text-right">Score</th>
                                        <th className="py-2 text-left">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {heatmap.slice(0, 15).map((r, idx) => (
                                        <tr key={`${r.code}-${idx}`} className="border-b last:border-0">
                                            <td className="py-2 font-medium text-gray-900">{r.name || "—"}</td>
                                            <td className="py-2 text-gray-600">{r.code || "—"}</td>
                                            <td className="py-2 text-right">{formatNumber(r.registered_voters)}</td>
                                            <td className="py-2 text-right">{formatNumber(r.delta)}</td>
                                            <td className="py-2 text-right">{formatPct(r.delta_pct)}</td>
                                            <td className="py-2 text-right">{r.score?.toFixed(2) ?? "—"}</td>
                                            <td className="py-2 text-gray-600">{r.notes || "—"}</td>
                                        </tr>
                                    ))}
                                    {!heatmap.length ? (
                                        <tr>
                                            <td className="py-3 text-gray-500" colSpan={7}>
                                                No hotspot rows returned for the selected scope.
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Existing Anomalies */}
                    <div className="mt-6 rounded-xl border bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Anomalies</h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Large changes from {base} → {cycle}.
                                </p>
                            </div>
                            <div className="text-xs text-gray-500">{anomalies.length} rows</div>
                        </div>

                        <div className="mt-3 overflow-auto">
                            <table className="min-w-[950px] w-full text-sm">
                                <thead className="text-xs text-gray-500">
                                    <tr className="border-b">
                                        <th className="py-2 text-left">Name</th>
                                        <th className="py-2 text-left">Code</th>
                                        <th className="py-2 text-right">Base</th>
                                        <th className="py-2 text-right">Target</th>
                                        <th className="py-2 text-right">Δ</th>
                                        <th className="py-2 text-right">Δ%</th>
                                        <th className="py-2 text-left">Severity</th>
                                        <th className="py-2 text-left">Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {anomalies.slice(0, 15).map((r, idx) => (
                                        <tr key={`${r.code}-${idx}`} className="border-b last:border-0">
                                            <td className="py-2 font-medium text-gray-900">{r.name || "—"}</td>
                                            <td className="py-2 text-gray-600">{r.code || "—"}</td>
                                            <td className="py-2 text-right">{formatNumber(r.base_registered)}</td>
                                            <td className="py-2 text-right">{formatNumber(r.target_registered)}</td>
                                            <td className="py-2 text-right">{formatNumber(r.delta)}</td>
                                            <td className="py-2 text-right">{formatPct(r.delta_pct)}</td>
                                            <td className="py-2">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs ${badgeColor(r.severity)}`}>
                                                    {r.severity || "—"}
                                                </span>
                                            </td>
                                            <td className="py-2 text-gray-600">{r.reason || "—"}</td>
                                        </tr>
                                    ))}
                                    {!anomalies.length ? (
                                        <tr>
                                            <td className="py-3 text-gray-500" colSpan={8}>
                                                No anomalies returned for the selected scope.
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
