import { useEffect, useMemo, useState } from "react";

type ApiStatus = "idle" | "loading" | "error" | "success";

type AnomalyRow = {
    caw_code: string;
    ward_name: string;
    county_code: string;
    const_code: string;
    base: number;
    target: number;
    base_voters: number;
    target_voters: number;
    delta: number;
    abs_delta_pct: number;
};

type AnomaliesResponse = {
    status: "success" | "error";
    data?: AnomalyRow[];
    count?: number;
    meta?: { threshold_pct: number };
    message?: string;
};

function apiBase() {
    const base = import.meta.env.VITE_API_BASE_URL || "";
    return `${base.replace(/\/$/, "")}/API/voter-register`;
}

async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { credentials: "include" });
    const text = await res.text();
    let data: any = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        // non-json response
    }
    if (!res.ok) {
        const msg = data?.message || `HTTP ${res.status} at ${url}`;
        throw new Error(msg);
    }
    return data as T;
}

export default function VoterRegisterCleanup() {
    const [baseCycle, setBaseCycle] = useState<number>(2022);
    const [targetCycle, setTargetCycle] = useState<number>(2027);
    const [thresholdPct, setThresholdPct] = useState<number>(30);
    const [countyCode, setCountyCode] = useState<string>("");
    const [constCode, setConstCode] = useState<string>("");

    const [status, setStatus] = useState<ApiStatus>("idle");
    const [error, setError] = useState<string>("");
    const [rows, setRows] = useState<AnomalyRow[]>([]);

    const base = useMemo(() => apiBase(), []);

    const url = useMemo(() => {
        const qs = new URLSearchParams();
        qs.set("level", "ward");
        qs.set("base", String(baseCycle));
        qs.set("target", String(targetCycle));
        qs.set("threshold_pct", String(thresholdPct));
        if (countyCode.trim()) qs.set("county_code", countyCode.trim());
        if (constCode.trim()) qs.set("const_code", constCode.trim());
        return `${base}/analytics__anomalies.php?${qs.toString()}`;
    }, [base, baseCycle, targetCycle, thresholdPct, countyCode, constCode]);

    useEffect(() => {
        let live = true;

        (async () => {
            try {
                setStatus("loading");
                setError("");
                const r = await fetchJson<AnomaliesResponse>(url);
                if (!live) return;

                if (r.status !== "success" || !r.data) {
                    throw new Error(r.message || "Failed to load anomalies");
                }

                setRows(r.data);
                setStatus("success");
            } catch (e: any) {
                if (!live) return;
                setError(e?.message || "Failed to load anomalies");
                setStatus("error");
            }
        })();

        return () => {
            live = false;
        };
    }, [url]);

    return (
        <div className="p-5">
            <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
                <div className="flex-1">
                    <h1 className="text-xl font-semibold">Data Cleanup & Quality</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Detect unusual voter register shifts (baseline vs target) to flag
                        mapping issues, bad uploads, or suspicious changes.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 w-full md:w-auto">
                    <div>
                        <label className="text-[11px] text-gray-500">Base</label>
                        <select
                            value={baseCycle}
                            onChange={(e) => setBaseCycle(Number(e.target.value))}
                            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                        >
                            <option value={2017}>2017</option>
                            <option value={2022}>2022</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] text-gray-500">Target</label>
                        <select
                            value={targetCycle}
                            onChange={(e) => setTargetCycle(Number(e.target.value))}
                            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                        >
                            <option value={2027}>2027</option>
                            <option value={2022}>2022</option>
                            <option value={2017}>2017</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] text-gray-500">Threshold %</label>
                        <input
                            type="number"
                            min={1}
                            max={300}
                            value={thresholdPct}
                            onChange={(e) => setThresholdPct(Number(e.target.value))}
                            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] text-gray-500">County Code</label>
                        <input
                            value={countyCode}
                            onChange={(e) => setCountyCode(e.target.value)}
                            placeholder="e.g. 047"
                            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] text-gray-500">Const Code</label>
                        <input
                            value={constCode}
                            onChange={(e) => setConstCode(e.target.value)}
                            placeholder="optional"
                            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-5 rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-gray-900">
                            Anomalies (Ward-level)
                        </div>
                        <div className="text-xs text-gray-500">
                            API: <span className="font-mono">{url}</span>
                        </div>
                    </div>

                    {status === "loading" && (
                        <span className="text-xs text-gray-500">Loading…</span>
                    )}
                    {status === "error" && (
                        <span className="text-xs text-red-600">{error}</span>
                    )}
                    {status === "success" && (
                        <span className="text-xs text-gray-600">
                            {rows.length.toLocaleString()} flagged
                        </span>
                    )}
                </div>

                <div className="mt-3 overflow-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-600">
                            <tr>
                                <th className="text-left px-3 py-2">Ward</th>
                                <th className="text-right px-3 py-2">Base</th>
                                <th className="text-right px-3 py-2">Target</th>
                                <th className="text-right px-3 py-2">Δ</th>
                                <th className="text-right px-3 py-2">Abs Δ%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.caw_code} className="border-t">
                                    <td className="px-3 py-2">
                                        <div className="font-medium">{r.ward_name}</div>
                                        <div className="text-[11px] text-gray-500 font-mono">
                                            {r.caw_code} • {r.county_code}/{r.const_code}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {r.base_voters.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {r.target_voters.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {r.delta.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold">
                                        {r.abs_delta_pct.toFixed(2)}%
                                    </td>
                                </tr>
                            ))}

                            {rows.length === 0 && status === "success" && (
                                <tr>
                                    <td className="px-3 py-3 text-gray-500" colSpan={5}>
                                        No anomalies above threshold. Try lowering threshold % or
                                        remove filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                    Next step: add “Fix workflow” (e.g. open ward → compare snapshots →
                    update station/ward totals → commit import batch).
                </div>
            </div>
        </div>
    );
}
