import { useEffect, useMemo, useState } from "react";

type Level = "county" | "constituency" | "ward";

type CountyRow = {
    county_code: string;
    name: string;
    base?: number;
    target?: number;
    base_voters?: number;
    target_voters?: number;
    delta?: number;
    delta_pct?: number;
};

type ConstituencyRow = {
    const_code: string;
    name: string;
    base?: number;
    target?: number;
    base_voters?: number;
    target_voters?: number;
    delta?: number;
    delta_pct?: number;
};

type WardRow = {
    ward_id: number;
    caw_code: string;
    name: string;
    base?: number;
    target?: number;
    base_voters?: number;
    target_voters?: number;
    delta?: number;
    delta_pct?: number;
};

type CompareRow = CountyRow | ConstituencyRow | WardRow;

type CountyOption = {
    county_code: string;
    county_name: string;
    registered_voters?: number;
};

type ConstOption = {
    const_code: string;
    const_name: string;
    county_code?: string;
    registered_voters?: number;
};

type WardOption = {
    ward_id: number;
    ward_name?: string;
    name?: string;
    caw_code: string;
    const_code?: string;
    county_code?: string;
};

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const GEO_API = {
    counties: "/API/get_counties.php",
    constituencies: "/API/get_constituencies.php",
    wards: "/API/get_wards.php",
};

const VR_API = {
    compare: "/API/voter-register/compare.php",
};

async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>) {
    const url = new URL(`${API_BASE}${path}`, window.location.origin);

    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && String(v).trim() !== "") url.searchParams.set(k, String(v));
        });
    }

    const res = await fetch(url.toString(), { credentials: "include" });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
        const msg = data?.message || `Request failed (${res.status})`;
        throw new Error(msg);
    }
    if (data.status && data.status !== "success") {
        throw new Error(data.message || "Request failed");
    }
    return data as T;
}

function fmt(n: number) {
    return new Intl.NumberFormat("en-KE").format(Number.isFinite(n) ? n : 0);
}

function fmtPct(n: number) {
    const v = Number.isFinite(n) ? n : 0;
    const sign = v > 0 ? "+" : "";
    return `${sign}${v.toFixed(2)}%`;
}

function badge(delta: number) {
    if (delta > 0) return "bg-green-50 text-green-700 border-green-200";
    if (delta < 0) return "bg-red-50 text-red-700 border-red-200";
    return "bg-gray-50 text-gray-700 border-gray-200";
}

/** Ensure table always has base_voters/target_voters/delta/delta_pct */
function normalizeCompareRow(r: any) {
    const baseV = Number(r.base_voters ?? r.base ?? 0);
    const targetV = Number(r.target_voters ?? r.target ?? 0);

    const delta = Number.isFinite(Number(r.delta)) ? Number(r.delta) : targetV - baseV;
    const deltaPct =
        Number.isFinite(Number(r.delta_pct))
            ? Number(r.delta_pct)
            : baseV === 0
                ? (targetV === 0 ? 0 : 100)
                : ((targetV - baseV) / baseV) * 100;

    return {
        ...r,
        base_voters: baseV,
        target_voters: targetV,
        delta,
        delta_pct: deltaPct,
    };
}

export default function VoterRegisterCompare() {
    const [level, setLevel] = useState<Level>("county");
    const [baseCycle, setBaseCycle] = useState<number>(2022);
    const [targetCycle, setTargetCycle] = useState<number>(2027);

    const [counties, setCounties] = useState<CountyOption[]>([]);
    const [constituencies, setConstituencies] = useState<ConstOption[]>([]);
    const [wards, setWards] = useState<WardOption[]>([]);

    const [countyCode, setCountyCode] = useState<string>("");
    const [constCode, setConstCode] = useState<string>("");
    const [wardId, setWardId] = useState<string>(""); // optional filter for UI

    const [rows, setRows] = useState<CompareRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [metaError, setMetaError] = useState<string>("");
    const [dataError, setDataError] = useState<string>("");

    const cycles = useMemo(() => [2017, 2022, 2027], []);

    // Load counties
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setMetaError("");
                const resp = await apiGet<{ status: "success"; data: CountyOption[] }>(GEO_API.counties);
                if (!alive) return;
                setCounties(resp.data || []);
            } catch (e: any) {
                if (!alive) return;
                setMetaError(e?.message || "Failed to load counties");
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    // Load constituencies when county changes
    useEffect(() => {
        let alive = true;

        setConstCode("");
        setWardId("");
        setWards([]);
        setConstituencies([]);

        if (!countyCode) return;

        (async () => {
            try {
                setMetaError("");
                const resp = await apiGet<{ status: "success"; data: any[] }>(GEO_API.constituencies, {
                    county_code: countyCode,
                });

                if (!alive) return;

                const normalized = (resp.data || []).map((c: any) => ({
                    const_code: c.const_code,
                    const_name: c.const_name ?? c.constituency_name ?? "",
                    county_code: c.county_code,
                    registered_voters: c.registered_voters,
                }));

                setConstituencies(normalized);
            } catch (e: any) {
                if (!alive) return;
                setMetaError(e?.message || "Failed to load constituencies");
            }
        })();

        return () => {
            alive = false;
        };
    }, [countyCode]);

    // Load wards when constituency changes (for drill-down)
    useEffect(() => {
        let alive = true;

        setWardId("");
        setWards([]);

        if (level !== "ward") return;
        if (!countyCode || !constCode) return;

        (async () => {
            try {
                setMetaError("");

                // IMPORTANT:
                // If your get_wards.php expects const_code, use that.
                // If it expects county_code instead, switch to { county_code }.
                const resp = await apiGet<{ status: "success"; data: any[] }>(GEO_API.wards, {
                    const_code: constCode,
                    // county_code: countyCode, // fallback if your backend filters wards by county instead
                });

                if (!alive) return;

                const normalized = (resp.data || []).map((w: any) => ({
                    ward_id: Number(w.ward_id ?? w.id ?? 0),
                    caw_code: w.caw_code ?? w.code ?? "",
                    ward_name: w.ward_name,
                    name: w.name,
                    const_code: w.const_code,
                    county_code: w.county_code,
                }));

                setWards(normalized);
            } catch (e: any) {
                if (!alive) return;
                setMetaError(e?.message || "Failed to load wards");
            }
        })();

        return () => {
            alive = false;
        };
    }, [level, countyCode, constCode]);

    // Clear irrelevant filters on level change
    useEffect(() => {
        setRows([]);
        setDataError("");
        setMetaError("");

        if (level === "county") {
            setCountyCode("");
            setConstCode("");
            setWardId("");
            setWards([]);
            setConstituencies([]);
        }

        if (level === "constituency") {
            setConstCode("");
            setWardId("");
            setWards([]);
        }

        if (level === "ward") {
            setWardId("");
            // keep county/const as user selected
        }
    }, [level]);

    // Fetch compare data
    useEffect(() => {
        const t = setTimeout(() => {
            (async () => {
                setDataError("");

                if (level === "constituency" && !countyCode) {
                    setRows([]);
                    setDataError("Select a County to compare constituencies.");
                    return;
                }
                if (level === "ward" && (!countyCode || !constCode)) {
                    setRows([]);
                    setDataError("Select a County and Constituency to compare wards.");
                    return;
                }

                setLoading(true);
                try {
                    const resp = await apiGet<{ status: "success"; data: any[]; count: number }>(VR_API.compare, {
                        level,
                        base: baseCycle,
                        target: targetCycle,
                        county_code: level !== "county" ? countyCode : undefined,
                        const_code: level === "ward" ? constCode : undefined,
                        // Optional: if your compare.php supports filtering to one ward, uncomment:
                        // ward_id: level === "ward" && wardId ? Number(wardId) : undefined,
                    });

                    const normalized = (resp.data || []).map(normalizeCompareRow);
                    setRows(normalized as CompareRow[]);
                } catch (e: any) {
                    setRows([]);
                    setDataError(e?.message || "Failed to load comparison");
                } finally {
                    setLoading(false);
                }
            })();
        }, 250);

        return () => clearTimeout(t);
    }, [level, baseCycle, targetCycle, countyCode, constCode /*, wardId*/]);

    const columns = useMemo(() => {
        const base = baseCycle;
        const target = targetCycle;
        return [
            { key: "name", label: level === "county" ? "County" : level === "constituency" ? "Constituency" : "Ward" },
            { key: "base_voters", label: `Voters ${base}` },
            { key: "target_voters", label: `Voters ${target}` },
            { key: "delta", label: "Δ Change" },
            { key: "delta_pct", label: "Δ %" },
        ] as const;
    }, [level, baseCycle, targetCycle]);

    return (
        <div className="p-4 md:p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">Compare Register Cycles</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Compare past vs current register to see growth/decline by County → Constituency → Ward.
                    </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <select className="border rounded-lg px-3 py-2 text-sm bg-white" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
                        <option value="county">County</option>
                        <option value="constituency">Constituency</option>
                        <option value="ward">Ward</option>
                    </select>

                    <select className="border rounded-lg px-3 py-2 text-sm bg-white" value={baseCycle} onChange={(e) => setBaseCycle(Number(e.target.value))}>
                        {cycles.map((c) => (
                            <option key={c} value={c}>
                                Base: {c}
                            </option>
                        ))}
                    </select>

                    <select className="border rounded-lg px-3 py-2 text-sm bg-white" value={targetCycle} onChange={(e) => setTargetCycle(Number(e.target.value))}>
                        {cycles.map((c) => (
                            <option key={c} value={c}>
                                Target: {c}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Filters */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-white p-4">
                    <div className="text-xs font-semibold text-gray-700">County</div>
                    <select
                        className="mt-2 w-full border rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-50"
                        value={countyCode}
                        onChange={(e) => setCountyCode(e.target.value)}
                        disabled={level === "county"}
                    >
                        <option value="">{level === "county" ? "Not needed (County level)" : "Select County"}</option>
                        {counties.map((c) => (
                            <option key={c.county_code} value={c.county_code}>
                                {c.county_name} ({c.county_code})
                            </option>
                        ))}
                    </select>
                    <div className="text-[11px] text-gray-500 mt-2">
                        Required for: <span className="font-medium">Constituency</span> and <span className="font-medium">Ward</span>
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                    <div className="text-xs font-semibold text-gray-700">Constituency</div>
                    <select
                        className="mt-2 w-full border rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-50"
                        value={constCode}
                        onChange={(e) => setConstCode(e.target.value)}
                        disabled={level === "county" || !countyCode}
                    >
                        <option value="">{!countyCode ? "Select County first" : level === "county" ? "Not needed" : "Select Constituency"}</option>
                        {constituencies.map((c) => (
                            <option key={c.const_code} value={c.const_code}>
                                {c.const_name} ({c.const_code})
                            </option>
                        ))}
                    </select>
                    <div className="text-[11px] text-gray-500 mt-2">
                        Required for: <span className="font-medium">Ward</span>
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                    <div className="text-xs font-semibold text-gray-700">Ward (optional)</div>
                    <select
                        className="mt-2 w-full border rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-50"
                        value={wardId}
                        onChange={(e) => setWardId(e.target.value)}
                        disabled={level !== "ward" || !constCode}
                    >
                        <option value="">{level !== "ward" ? "Not needed (not Ward level)" : !constCode ? "Select Constituency first" : "All wards"}</option>
                        {wards.map((w) => (
                            <option key={w.ward_id} value={String(w.ward_id)}>
                                {(w.ward_name ?? w.name ?? "Ward")} ({w.caw_code})
                            </option>
                        ))}
                    </select>
                    <div className="text-[11px] text-gray-500 mt-2">
                        This dropdown uses <span className="font-medium">/API/get_wards.php</span> for drill-down.
                    </div>
                </div>
            </div>

            {/* Errors */}
            {metaError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{metaError}</div>}
            {dataError && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{dataError}</div>}

            {/* Table */}
            <div className="mt-4 rounded-xl border bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="text-sm font-semibold text-gray-800">Comparison Results</div>
                    <div className="text-xs text-gray-500">{loading ? "Loading…" : `${rows.length} rows`}</div>
                </div>

                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                {columns.map((c) => (
                                    <th key={c.key} className="text-left font-semibold px-4 py-3 whitespace-nowrap">
                                        {c.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y">
                            {!loading && rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-500">
                                        No data yet. Select the required filters above.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r: any, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/60">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{r.name}</div>
                                            <div className="text-[11px] text-gray-500 mt-0.5">
                                                {level === "county" && r.county_code ? `Code: ${r.county_code}` : null}
                                                {level === "constituency" && r.const_code ? `Code: ${r.const_code}` : null}
                                                {level === "ward" && r.caw_code ? `Code: ${r.caw_code}` : null}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 whitespace-nowrap">{fmt(r.base_voters ?? 0)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{fmt(r.target_voters ?? 0)}</td>

                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={["inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", badge(r.delta ?? 0)].join(" ")}>
                                                {(r.delta ?? 0) > 0 ? "+" : ""}
                                                {fmt(r.delta ?? 0)}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3 whitespace-nowrap">{fmtPct(r.delta_pct ?? 0)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-4 py-3 border-t text-[11px] text-gray-500">
                    Tip: County compare needs no filters. Constituency compare needs a county. Ward compare needs a constituency.
                </div>
            </div>
        </div>
    );
}
