import { useEffect, useMemo, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { RequirePermission } from "../../components/RequirePermission";

type ExportScope = "national" | "jurisdiction";
type Step = "scope" | "counties" | "constituencies" | "wards";

type CountySummary = {
    county_id: number;
    county_name: string;
    county_code: string;
};

type ConstituencySummary = {
    constituency_id: number;
    constituency_name: string;
    // IMPORTANT: your wards API expects this as const_code
    constituency_code: string;
};

type WardSummary = {
    ward_id: number;
    ward_name: string;
    ward_code: string;
};

const EXPORT_ENDPOINT = "/API/voter-register/export.php";

const VoterRegisterExports = () => {
    const { token } = useUser();

    const [cycle, setCycle] = useState<number>(2027);

    const [scope, setScope] = useState<ExportScope | null>(null);
    const [step, setStep] = useState<Step>("scope");

    const [counties, setCounties] = useState<CountySummary[]>([]);
    const [constituencies, setConstituencies] = useState<ConstituencySummary[]>([]);
    const [wards, setWards] = useState<WardSummary[]>([]);

    const [selectedCounty, setSelectedCounty] = useState<CountySummary | null>(null);
    const [selectedConstituency, setSelectedConstituency] = useState<ConstituencySummary | null>(null);
    const [selectedWard, setSelectedWard] = useState<WardSummary | null>(null);

    const [format, setFormat] = useState<"csv">("csv");

    const [loading, setLoading] = useState(false); // download loading
    const [geoLoading, setGeoLoading] = useState(false); // list loading
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    /* ============ AUTH HELPER (same style as import) ============ */
    const buildAuth = () => {
        const localToken = localStorage.getItem("token") || localStorage.getItem("authToken");
        const effectiveToken = token || localToken || "";

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Accept: "application/json",
        };

        // keep both headers if your backend checks either
        if (effectiveToken) {
            headers["Authorization"] = `Bearer ${effectiveToken}`;
            headers["X-Token"] = effectiveToken;
        }

        return { headers, effectiveToken };
    };

    /* ============ SAFE JSON ============ */
    const safeJson = async (res: Response) => {
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch {
            return { raw: text };
        }
    };

    const extractList = (data: any, keys: string[]) => {
        if (Array.isArray(data)) return data;
        for (const k of keys) {
            const v = data?.[k];
            if (Array.isArray(v)) return v;
        }
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.data?.data)) return data.data.data;
        return [];
    };

    const resetMessages = () => {
        setError(null);
        setSuccess(null);
    };

    const resetAll = () => {
        resetMessages();

        setCounties([]);
        setConstituencies([]);
        setWards([]);

        setSelectedCounty(null);
        setSelectedConstituency(null);
        setSelectedWard(null);

        setGeoLoading(false);
        setLoading(false);
    };

    /* ===================== SCOPE SELECTION ===================== */
    const chooseNational = () => {
        resetAll();
        setScope("national");
        setStep("scope"); // show national download panel
    };

    const chooseJurisdiction = () => {
        resetAll();
        setScope("jurisdiction");
        setStep("counties"); // triggers counties API call
    };

    const backToScope = () => {
        resetAll();
        setScope(null);
        setStep("scope");
    };

    /* ===================== 1) FETCH COUNTIES ===================== */
    useEffect(() => {
        if (scope !== "jurisdiction" || step !== "counties") return;

        const fetchCounties = async () => {
            try {
                resetMessages();
                setGeoLoading(true);

                setCounties([]);
                setConstituencies([]);
                setWards([]);
                setSelectedCounty(null);
                setSelectedConstituency(null);
                setSelectedWard(null);

                const { headers, effectiveToken } = buildAuth();
                const params = new URLSearchParams();
                params.set("page", "1");
                params.set("limit", "500");
                params.set("cycle", String(cycle));
                if (effectiveToken) params.set("token", effectiveToken);

                const url = "/API/get_counties.php?" + params.toString();
                console.log("[GET] Counties:", url);

                const res = await fetch(url, {
                    method: "GET",
                    headers,
                    credentials: "include",
                });

                const data = await safeJson(res);
                console.log("COUNTIES API RESPONSE:", res.status, data);

                if (res.status === 401) throw new Error(data.message || "Unauthorized. Please log in again.");
                if (res.status === 403) throw new Error(data.message || "Forbidden: cannot view counties.");
                if (!res.ok || data.status === "error") throw new Error(data.message || data.error || "Failed to fetch counties.");

                const list = extractList(data, ["counties", "rows", "results", "data"]);

                const rows: CountySummary[] = list.map((c: any) => ({
                    county_id: Number(c.id ?? c.county_id ?? 0),
                    county_name: String(c.county_name ?? c.name ?? c.title ?? "Unnamed county"),
                    county_code: String(c.county_code ?? c.code ?? c.county ?? c.id ?? ""),
                }));

                setCounties(rows);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to fetch counties.");
            } finally {
                setGeoLoading(false);
            }
        };

        fetchCounties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, scope, step, cycle]);

    /* ===================== 2) SELECT COUNTY -> FETCH CONSTITUENCIES ===================== */
    const handleSelectCounty = (county: CountySummary) => {
        resetMessages();
        setSelectedCounty(county);

        setSelectedConstituency(null);
        setSelectedWard(null);
        setConstituencies([]);
        setWards([]);

        setStep("constituencies");
    };

    useEffect(() => {
        if (scope !== "jurisdiction") return;
        if (!selectedCounty || step !== "constituencies") return;

        const fetchConstituencies = async () => {
            try {
                resetMessages();
                setGeoLoading(true);

                setConstituencies([]);
                setWards([]);
                setSelectedConstituency(null);
                setSelectedWard(null);

                const { headers, effectiveToken } = buildAuth();
                const params = new URLSearchParams();
                params.set("page", "1");
                params.set("limit", "500");
                params.set("cycle", String(cycle));

                // keep both
                if (selectedCounty.county_code) {
                    params.set("county_code", selectedCounty.county_code);
                    params.set("county", selectedCounty.county_code);
                }
                params.set("county_id", String(selectedCounty.county_id));
                if (effectiveToken) params.set("token", effectiveToken);

                const url = "/API/get_constituencies.php?" + params.toString();
                console.log("[GET] Constituencies:", url);

                const res = await fetch(url, {
                    method: "GET",
                    headers,
                    credentials: "include",
                });

                const data = await safeJson(res);
                console.log("CONSTITUENCIES API RESPONSE:", res.status, data);

                if (res.status === 401) throw new Error(data.message || "Unauthorized. Please log in again.");
                if (res.status === 403) throw new Error(data.message || "Forbidden: cannot view constituencies.");
                if (!res.ok || data.status === "error") throw new Error(data.message || data.error || "Failed to fetch constituencies.");

                const list = extractList(data, ["constituencies", "rows", "results", "data"]);

                const rows: ConstituencySummary[] = list.map((c: any) => ({
                    constituency_id: Number(c.id ?? c.constituency_id ?? 0),
                    constituency_name: String(c.constituency_name ?? c.name ?? c.title ?? "Unnamed constituency"),
                    constituency_code: String(c.constituency_code ?? c.code ?? c.constituency ?? c.const_code ?? c.id ?? ""),
                }));

                setConstituencies(rows);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to fetch constituencies.");
            } finally {
                setGeoLoading(false);
            }
        };

        fetchConstituencies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCounty, step, token, scope, cycle]);

    /* ===================== 3) SELECT CONSTITUENCY -> FETCH WARDS ===================== */
    const handleSelectConstituency = (c: ConstituencySummary) => {
        resetMessages();
        setSelectedConstituency(c);

        setSelectedWard(null);
        setWards([]);

        setStep("wards");
    };

    useEffect(() => {
        if (scope !== "jurisdiction") return;
        if (!selectedConstituency || step !== "wards") return;

        const fetchWards = async () => {
            try {
                resetMessages();
                setGeoLoading(true);

                setWards([]);
                setSelectedWard(null);

                const { headers, effectiveToken } = buildAuth();
                const params = new URLSearchParams();
                params.set("page", "1");
                params.set("limit", "500");
                params.set("cycle", String(cycle));

                /**
                 * ✅ Critical (Garbage in, Garbage out):
                 * Your get_wards.php REQUIRES ?const_code=
                 * So we map constituency_code -> const_code.
                 */
                params.set("const_code", String(selectedConstituency.constituency_code || "").trim());
                if (selectedCounty?.county_code) params.set("county_code", selectedCounty.county_code);

                if (effectiveToken) params.set("token", effectiveToken);

                const url = "/API/get_wards.php?" + params.toString();
                console.log("[GET] Wards:", url);

                const res = await fetch(url, {
                    method: "GET",
                    headers,
                    credentials: "include",
                });

                const data = await safeJson(res);
                console.log("WARDS API RESPONSE:", res.status, data);

                if (res.status === 401) throw new Error(data.message || "Unauthorized. Please log in again.");
                if (res.status === 403) throw new Error(data.message || "Forbidden: cannot view wards.");
                if (!res.ok || data.status === "error") throw new Error(data.message || data.error || "Failed to fetch wards.");

                const list = extractList(data, ["wards", "rows", "results", "data"]);

                const rows: WardSummary[] = list.map((w: any) => ({
                    ward_id: Number(w.id ?? w.ward_id ?? 0),
                    ward_name: String(w.ward_name ?? w.caw_name ?? w.name ?? w.title ?? "Unnamed ward"),
                    ward_code: String(w.ward_code ?? w.caw_code ?? w.code ?? w.ward ?? w.id ?? ""),
                }));

                setWards(rows);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to fetch wards.");
            } finally {
                setGeoLoading(false);
            }
        };

        fetchWards();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedConstituency, selectedCounty, step, token, scope, cycle]);

    const handleSelectWard = (w: WardSummary) => {
        resetMessages();
        setSelectedWard(w);
    };

    // ✅ FIX: allow download at County OR Constituency OR Ward level (only County required)
    const geoValidationError = useMemo(() => {
        if (scope !== "jurisdiction") return "";
        if (!selectedCounty) return "Please choose a county.";
        return "";
    }, [scope, selectedCounty]);

    /* ===================== DOWNLOAD ===================== */
    const buildDownloadFilename = () => {
        if (scope === "national") return `voter_register_export_national_${cycle}.${format}`;
        if (!selectedCounty) return `voter_register_export_${cycle}.${format}`;

        // safe names by codes only (avoid special chars)
        const county = selectedCounty.county_code || "county";
        const cons = selectedConstituency?.constituency_code || "const";
        const ward = selectedWard?.ward_code || "ward";

        if (selectedWard) return `voter_register_export_ward_${ward}_${cycle}.${format}`;
        if (selectedConstituency) return `voter_register_export_constituency_${cons}_${cycle}.${format}`;
        return `voter_register_export_county_${county}_${cycle}.${format}`;
    };

    const downloadExport = async () => {
        resetMessages();

        if (scope === "jurisdiction" && geoValidationError) {
            setError(geoValidationError);
            return;
        }

        setLoading(true);
        try {
            const { headers } = buildAuth();

            // IMPORTANT: export expects JSON
            const payload: any = {
                cycle,
                format,
            };

            if (scope === "national") {
                payload.level = "national";
                payload.filters = {};
            } else {
                // jurisdiction: choose most-specific level available
                payload.level = selectedWard ? "ward" : selectedConstituency ? "constituency" : selectedCounty ? "county" : "national";

                payload.filters = {
                    county_code: selectedCounty?.county_code || "",
                    // export code uses const_code
                    const_code: selectedConstituency?.constituency_code || "",
                    // export code uses caw_code
                    caw_code: selectedWard?.ward_code || "",
                };
            }

            // filename hint (server may override via content-disposition)
            payload.filename = buildDownloadFilename();

            console.log("[POST] Export:", EXPORT_ENDPOINT, payload);

            const res = await fetch(EXPORT_ENDPOINT, {
                method: "POST",
                headers: {
                    ...headers,
                    Accept: "text/csv,application/json",
                },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const contentType = res.headers.get("content-type") || "";

            // If backend returns JSON (usually error), show it clearly
            if (!res.ok || contentType.includes("application/json")) {
                const data = await safeJson(res);
                const msg = data?.message || data?.error || `Export failed (${res.status})`;
                throw new Error(msg);
            }

            const blob = await res.blob();

            // Prefer filename from server header if present
            const dispo = res.headers.get("content-disposition") || "";
            const match = dispo.match(/filename="([^"]+)"/i);
            const filenameFromHeader = match?.[1];
            const filename = filenameFromHeader || payload.filename || "voter_register_export.csv";

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            setSuccess("Export generated. Download should start automatically.");
        } catch (e: any) {
            console.error(e);
            setError(e?.message || "Export failed");
        } finally {
            setLoading(false);
        }
    };

    /* ===================== UI ===================== */
    const renderHeader = () => (
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Voter Register Exports</h1>
                <p className="text-sm text-gray-600">
                    {step === "scope" ? "Choose how you want to export the register." : `Export scope: ${scope === "national" ? "National" : "By Jurisdiction"}`}
                </p>
            </div>

            {geoLoading && <span className="text-[0.7rem] text-gray-500">Loading…</span>}
        </header>
    );

    const renderScopeStep = () => (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-gray-900">Start here</h2>
                    <p className="text-xs text-gray-600 mt-1">
                        National export downloads the whole dataset. Jurisdiction export lets you drill down and download at county, constituency, or ward level.
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={chooseNational}
                    className={`rounded-xl border px-4 py-4 text-left hover:bg-green-50 transition ${scope === "national" ? "border-green-400 bg-green-50" : "border-gray-200 bg-white"
                        }`}
                >
                    <div className="text-sm font-semibold text-gray-900">National (Whole Country)</div>
                    <div className="text-xs text-gray-600 mt-1">Download one file for all counties / constituencies / wards.</div>
                </button>

                <button
                    type="button"
                    onClick={chooseJurisdiction}
                    className={`rounded-xl border px-4 py-4 text-left hover:bg-blue-50 transition ${scope === "jurisdiction" ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
                        }`}
                >
                    <div className="text-sm font-semibold text-gray-900">By Jurisdiction (Drill-down)</div>
                    <div className="text-xs text-gray-600 mt-1">Pick County (optional: Constituency → Ward). You can download at any level.</div>
                </button>
            </div>

            {/* National download card */}
            {scope === "national" && (
                <div className="mt-4 rounded-xl border bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <div className="text-sm font-semibold text-gray-900">National Export</div>
                            <p className="text-xs text-gray-600 mt-1">Format: CSV</p>
                        </div>

                        <button className="text-xs text-gray-600 underline" onClick={backToScope}>
                            Change
                        </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-white p-3">
                            <label className="text-xs text-gray-500">Election Cycle</label>
                            <select value={cycle} onChange={(e) => setCycle(Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                                <option value={2017}>2017</option>
                                <option value={2022}>2022</option>
                                <option value={2027}>2027</option>
                            </select>
                        </div>

                        <div className="rounded-lg border bg-white p-3">
                            <label className="text-xs text-gray-500">Format</label>
                            <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                                <option value="csv">CSV</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={downloadExport}
                        disabled={loading}
                        className="mt-3 inline-flex items-center justify-center rounded-lg bg-gray-900 text-white text-sm px-4 py-2 hover:bg-black disabled:opacity-50"
                    >
                        {loading ? "Generating…" : "Download National CSV"}
                    </button>

                    <p className="text-[0.72rem] text-gray-500 mt-2">Garbage in → garbage out: Ensure your filters & cycle are correct before exporting.</p>
                </div>
            )}
        </section>
    );

    const renderBreadcrumb = () => {
        if (scope !== "jurisdiction") return null;

        return (
            <nav className="text-xs text-gray-600 mb-3 flex flex-wrap items-center gap-1">
                <button
                    className="underline"
                    onClick={() => {
                        setStep("scope");
                        setScope(null);
                        resetAll();
                    }}
                >
                    Scope
                </button>

                <span>&gt;</span>

                <button
                    className={`underline ${step === "counties" ? "font-semibold text-gray-900" : ""}`}
                    onClick={() => {
                        setStep("counties");
                        setSelectedCounty(null);
                        setSelectedConstituency(null);
                        setSelectedWard(null);
                        setConstituencies([]);
                        setWards([]);
                        resetMessages();
                    }}
                >
                    Counties
                </button>

                {selectedCounty && <span>&gt;</span>}
                {selectedCounty && (
                    <button
                        className={`underline ${step === "constituencies" ? "font-semibold text-gray-900" : ""}`}
                        onClick={() => {
                            setStep("constituencies");
                            setSelectedConstituency(null);
                            setSelectedWard(null);
                            setWards([]);
                            resetMessages();
                        }}
                    >
                        {selectedCounty.county_name}
                    </button>
                )}

                {selectedConstituency && <span>&gt;</span>}
                {selectedConstituency && (
                    <span className={step === "wards" ? "font-semibold text-gray-900" : "text-gray-600"}>{selectedConstituency.constituency_name}</span>
                )}
            </nav>
        );
    };

    const renderCountiesStep = () => (
        <section className="border border-gray-200 bg-white rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Step 1: Choose a County</h2>
                <div className="flex items-center gap-2">
                    <button className="text-xs text-gray-600 underline" onClick={backToScope}>
                        &larr; Change scope
                    </button>
                    {geoLoading && <span className="text-[0.7rem] text-gray-500">Loading…</span>}
                </div>
            </div>

            <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
                {counties.length === 0 && !geoLoading && <div className="px-4 py-4 text-sm text-gray-500">No counties found.</div>}

                {counties.map((c) => (
                    <button
                        key={c.county_id || c.county_code}
                        onClick={() => handleSelectCounty(c)}
                        className="w-full text-left px-4 py-3 hover:bg-green-50 focus:bg-green-50 focus:outline-none"
                    >
                        <div className="font-medium text-gray-900">{c.county_name}</div>
                    </button>
                ))}
            </div>
        </section>
    );

    const renderConstituenciesStep = () => (
        <section className="border border-gray-200 bg-white rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-800">Step 2: Choose a Constituency (Optional)</h2>
                    {selectedCounty && (
                        <p className="text-xs text-gray-500 mt-1">
                            County: <span className="font-semibold">{selectedCounty.county_name}</span>
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="text-xs text-gray-600 underline"
                        onClick={() => {
                            setStep("counties");
                            setSelectedCounty(null);
                            setSelectedConstituency(null);
                            setSelectedWard(null);
                            setConstituencies([]);
                            setWards([]);
                            resetMessages();
                        }}
                    >
                        &larr; Back to counties
                    </button>
                    {geoLoading && <span className="text-[0.7rem] text-gray-500">Loading…</span>}
                </div>
            </div>

            <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
                {constituencies.length === 0 && !geoLoading && <div className="px-4 py-4 text-sm text-gray-500">No constituencies found for this county.</div>}

                {constituencies.map((c) => (
                    <button
                        key={c.constituency_id || c.constituency_code}
                        onClick={() => handleSelectConstituency(c)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                    >
                        <div className="font-medium text-gray-900">{c.constituency_name}</div>
                    </button>
                ))}
            </div>
        </section>
    );

    const renderWardsStep = () => (
        <section className="border border-gray-200 bg-white rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-800">Step 3: Choose a Ward (Optional)</h2>
                    {selectedConstituency && (
                        <p className="text-xs text-gray-500 mt-1">
                            Constituency: <span className="font-semibold">{selectedConstituency.constituency_name}</span>
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="text-xs text-gray-600 underline"
                        onClick={() => {
                            setStep("constituencies");
                            setSelectedWard(null);
                            setWards([]);
                            resetMessages();
                        }}
                    >
                        &larr; Back to constituencies
                    </button>
                    {geoLoading && <span className="text-[0.7rem] text-gray-500">Loading…</span>}
                </div>
            </div>

            <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
                {wards.length === 0 && !geoLoading && <div className="px-4 py-4 text-sm text-gray-500">No wards found for this constituency.</div>}

                {wards.map((w) => (
                    <button
                        key={w.ward_id || w.ward_code}
                        onClick={() => handleSelectWard(w)}
                        className={`w-full text-left px-4 py-3 hover:bg-green-50 focus:bg-green-50 focus:outline-none ${selectedWard?.ward_id === w.ward_id ? "bg-green-50" : ""
                            }`}
                    >
                        <div className="font-medium text-gray-900">{w.ward_name}</div>
                        {w.ward_code ? <div className="text-xs text-gray-500 mt-0.5">Code: {w.ward_code}</div> : null}
                    </button>
                ))}
            </div>
        </section>
    );

    const renderJurisdictionDownloadCard = () => {
        if (scope !== "jurisdiction") return null;

        return (
            <section className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <div className="text-sm font-semibold text-gray-900">Download Register File (By Jurisdiction)</div>
                        <p className="text-xs text-gray-600 mt-1">Format: CSV</p>
                    </div>

                    <button className="text-xs text-gray-600 underline" onClick={backToScope}>
                        Change scope
                    </button>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-white p-3">
                        <label className="text-xs text-gray-500">Election Cycle</label>
                        <select value={cycle} onChange={(e) => setCycle(Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                            <option value={2017}>2017</option>
                            <option value={2022}>2022</option>
                            <option value={2027}>2027</option>
                        </select>
                    </div>

                    <div className="rounded-lg border bg-white p-3">
                        <label className="text-xs text-gray-500">Format</label>
                        <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                            <option value="csv">CSV</option>
                        </select>
                    </div>
                </div>

                <div className="mt-3 text-xs text-gray-700">
                    Target:{" "}
                    <span className="font-semibold">
                        {selectedCounty?.county_name ?? "—"}
                        {selectedConstituency ? ` → ${selectedConstituency.constituency_name}` : ""}
                        {selectedWard ? ` → ${selectedWard.ward_name}` : ""}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={downloadExport}
                    disabled={loading}
                    className="mt-3 inline-flex items-center justify-center rounded-lg bg-gray-900 text-white text-sm px-4 py-2 hover:bg-black disabled:opacity-50"
                >
                    {loading ? "Generating…" : "Download CSV"}
                </button>

                {geoValidationError && <p className="text-[0.72rem] text-gray-500 mt-2">Select at least a County before downloading.</p>}

                <p className="text-[0.72rem] text-gray-500 mt-2">Garbage in → garbage out: correct cycle + correct geography = correct export.</p>
            </section>
        );
    };

    return (
        <RequirePermission permission="results34a.view">
            <div className="p-6 max-w-4xl mx-auto space-y-4">
                {renderHeader()}

                {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">Error: {error}</div>}

                {success && <div className="text-sm text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded">{success}</div>}

                {/* Scope step (always first) */}
                {step === "scope" && renderScopeStep()}

                {/* Drilldown only if scope=jurisdiction */}
                {scope === "jurisdiction" && (
                    <>
                        {renderBreadcrumb()}

                        {step === "counties" && renderCountiesStep()}
                        {step === "constituencies" && selectedCounty && renderConstituenciesStep()}
                        {step === "wards" && selectedConstituency && renderWardsStep()}

                        {renderJurisdictionDownloadCard()}
                    </>
                )}

                {/* Releases */}
                <section className="rounded-xl border bg-white p-4">
                    <div className="text-sm font-semibold text-gray-900">Releases</div>
                    <p className="text-xs text-gray-600 mt-1">Exports are generated on demand and downloaded immediately.</p>
                    <div className="mt-3 text-sm text-gray-500">No releases loaded yet.</div>
                </section>
            </div>
        </RequirePermission>
    );
};

export default VoterRegisterExports;
