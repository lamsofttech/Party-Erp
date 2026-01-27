import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { RequirePermission } from "../../components/RequirePermission";

type ImportScope = "national" | "jurisdiction";
type Step = "scope" | "counties" | "constituencies" | "wards";

type CountySummary = {
    county_id: number;
    county_name: string;
    county_code: string;
};

type ConstituencySummary = {
    constituency_id: number;
    constituency_name: string;
    constituency_code: string; // used as const_code for get_wards.php
};

type WardSummary = {
    ward_id: number;
    ward_name: string;
    ward_code: string; // backend sometimes calls this caw_code
};

const UPLOAD_ENDPOINT = "/API/voter-register/import__upload.php";

/** Theme helpers: Red / White / Gray (action-driven) */
const THEME = {
    card: "bg-white border border-gray-200 rounded-xl shadow-sm",
    soft: "bg-gray-50",
    red: "text-red-600",
    redBg: "bg-red-600",
    redHover: "hover:bg-red-700",
    redSoft: "bg-red-50",
    redBorder: "border-red-200",
};

const StepPill: React.FC<{ n: number; label: string; active?: boolean }> = ({ n, label, active }) => (
    <div
        className={[
            "flex items-center gap-2 px-3 py-2 rounded-full border text-xs",
            active ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-gray-200 text-gray-600",
        ].join(" ")}
    >
        <span
            className={[
                "inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold",
                active ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700",
            ].join(" ")}
        >
            {n}
        </span>
        <span className="font-medium">{label}</span>
    </div>
);

const WizardHeader: React.FC<{ step: Step; scope: ImportScope | null }> = ({ step, scope }) => {
    const steps =
        scope === "jurisdiction"
            ? [
                { n: 1, key: "scope", label: "Scope" },
                { n: 2, key: "counties", label: "County" },
                { n: 3, key: "constituencies", label: "Constituency (optional)" },
                { n: 4, key: "wards", label: "Ward (optional)" },
            ]
            : [{ n: 1, key: "scope", label: "Scope" }];

    return (
        <div className="flex flex-wrap items-center gap-2">
            {steps.map((s) => (
                <StepPill key={s.key} n={s.n} label={s.label} active={step === (s.key as Step)} />
            ))}
        </div>
    );
};

const VoterRegisterImport: React.FC = () => {
    const { token } = useUser();

    const [scope, setScope] = useState<ImportScope | null>(null);
    const [step, setStep] = useState<Step>("scope");

    const [counties, setCounties] = useState<CountySummary[]>([]);
    const [constituencies, setConstituencies] = useState<ConstituencySummary[]>([]);
    const [wards, setWards] = useState<WardSummary[]>([]);

    const [selectedCounty, setSelectedCounty] = useState<CountySummary | null>(null);
    const [selectedConstituency, setSelectedConstituency] = useState<ConstituencySummary | null>(null);
    const [selectedWard, setSelectedWard] = useState<WardSummary | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState("");

    const [loading, setLoading] = useState(false); // upload loading
    const [geoLoading, setGeoLoading] = useState(false); // list loading
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    /* ============ SAFE JSON + LIST EXTRACTORS (handles many backend shapes) ============ */
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

        setFile(null);
        setFileName("");

        setGeoLoading(false);
        setLoading(false);
    };

    /* ============ AUTH HELPERS ============ */
    const buildJsonAuth = () => {
        const localToken = localStorage.getItem("token") || localStorage.getItem("authToken");
        const effectiveToken = token || localToken || "";

        const headers: Record<string, string> = {
            Accept: "application/json",
            "Content-Type": "application/json",
        };

        if (effectiveToken) {
            headers["Authorization"] = `Bearer ${effectiveToken}`;
            headers["X-Token"] = effectiveToken;
        }

        return { headers, effectiveToken };
    };

    // ✅ IMPORTANT: for FormData do NOT set Content-Type manually
    const buildFormAuthHeaders = () => {
        const localToken = localStorage.getItem("token") || localStorage.getItem("authToken");
        const effectiveToken = token || localToken || "";

        const headers: Record<string, string> = {
            Accept: "application/json",
        };

        if (effectiveToken) {
            headers["Authorization"] = `Bearer ${effectiveToken}`;
            headers["X-Token"] = effectiveToken;
        }

        return { headers, effectiveToken };
    };

    /* ===================== FILE HANDLER ===================== */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files && e.target.files[0];
        if (!selected) return;

        setFile(selected);
        setFileName(selected.name);
        resetMessages();
    };

    /* ===================== 0) SCOPE SELECTION (ACTION-DRIVEN) ===================== */
    const chooseNational = () => {
        resetAll();
        setScope("national");
        setStep("scope"); // stays on scope; shows national upload
    };

    const chooseJurisdiction = () => {
        resetAll();
        setScope("jurisdiction");
        setStep("scope"); // selection first; then Continue -> counties
    };

    const continueFromScope = () => {
        resetMessages();
        if (scope === "jurisdiction") setStep("counties");
        // national stays in scope view (upload panel visible)
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

                const { headers, effectiveToken } = buildJsonAuth();
                const params = new URLSearchParams();
                params.set("page", "1");
                params.set("limit", "500");
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
    }, [token, scope, step]);

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

                const { headers, effectiveToken } = buildJsonAuth();
                const params = new URLSearchParams();
                params.set("page", "1");
                params.set("limit", "500");

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
    }, [selectedCounty, step, token, scope]);

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

                const { headers, effectiveToken } = buildJsonAuth();
                const params = new URLSearchParams();
                params.set("page", "1");
                params.set("limit", "500");

                // ✅ get_wards.php requires ?const_code=
                params.set("const_code", String(selectedConstituency.constituency_code || "").trim());
                if (selectedCounty?.county_code) params.set("county_code", String(selectedCounty.county_code || "").trim());
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
    }, [selectedConstituency, selectedCounty, step, token, scope]);

    const handleSelectWard = (w: WardSummary) => {
        resetMessages();
        setSelectedWard(w);
    };

    // ✅ Match export behavior: require County only; Constituency/Ward optional.
    const geoValidationError = useMemo(() => {
        if (scope !== "jurisdiction") return "";
        if (!selectedCounty) return "Please choose a county.";
        return "";
    }, [scope, selectedCounty]);

    /* ===================== UPLOAD ===================== */
    const uploadFile = async () => {
        resetMessages();

        if (!file) {
            setError("Please select a file first.");
            return;
        }

        if (scope === "jurisdiction" && geoValidationError) {
            setError(geoValidationError);
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            if (scope === "national") {
                formData.append("scope", "national");
                formData.append("import_level", "national");
                formData.append("level", "national");
            } else {
                formData.append("scope", "jurisdiction");
                formData.append("import_level", selectedWard ? "ward" : selectedConstituency ? "constituency" : "county");
                formData.append("level", selectedWard ? "ward" : selectedConstituency ? "constituency" : "county");

                // send multiple keys to match backend flexibility
                formData.append("county_code", selectedCounty?.county_code || "");
                formData.append("county", selectedCounty?.county_code || "");
                formData.append("county_id", String(selectedCounty?.county_id || ""));

                // constituency
                formData.append("constituency_code", selectedConstituency?.constituency_code || "");
                formData.append("constituency", selectedConstituency?.constituency_code || "");
                formData.append("constituency_id", String(selectedConstituency?.constituency_id || ""));

                // wards endpoint naming
                formData.append("const_code", selectedConstituency?.constituency_code || "");

                // ward
                formData.append("ward_code", selectedWard?.ward_code || "");
                formData.append("ward", selectedWard?.ward_code || "");
                formData.append("ward_id", String(selectedWard?.ward_id || ""));

                // some backends use caw_code naming
                formData.append("caw_code", selectedWard?.ward_code || "");
            }

            const { headers } = buildFormAuthHeaders();

            console.log("[POST] Import:", UPLOAD_ENDPOINT, {
                scope,
                county: selectedCounty,
                constituency: selectedConstituency,
                ward: selectedWard,
                file: file?.name,
            });

            const res = await fetch(UPLOAD_ENDPOINT, {
                method: "POST",
                headers, // ✅ no Content-Type here
                body: formData,
                credentials: "include",
            });

            const data = await safeJson(res);
            console.log("IMPORT RESPONSE:", res.status, data);

            if (res.status === 401) throw new Error(data.message || "Unauthorized. Please log in again.");
            if (res.status === 403) throw new Error(data.message || "Forbidden: you are not allowed to import.");
            if (!res.ok || data.status === "error") throw new Error(data.message || data.error || "Import failed.");

            setSuccess(data.message || "File uploaded successfully. Processing started.");
            setFile(null);
            setFileName("");
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Upload failed.");
        } finally {
            setLoading(false);
        }
    };

    /* ===================== UI ===================== */
    const renderHeader = () => (
        <header className="mb-2">
            <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Voter Register Import</h1>
                        <p className="text-sm text-gray-600">
                            Upload a register file and start processing — follow the steps below.
                        </p>
                    </div>

                    {geoLoading && <span className="text-xs text-gray-500">Loading…</span>}
                </div>

                <WizardHeader step={step} scope={scope} />
            </div>
        </header>
    );

    const renderScopeStep = () => (
        <section className={`${THEME.card} p-4`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-gray-900">Choose import scope</h2>
                    <p className="text-xs text-gray-600 mt-1">National = full refresh. Jurisdiction = update specific areas.</p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={chooseNational}
                    className={[
                        "rounded-xl border px-4 py-4 text-left transition",
                        scope === "national" ? "border-red-300 bg-red-50" : "border-gray-200 bg-white hover:bg-gray-50",
                    ].join(" ")}
                >
                    <div className="text-sm font-semibold text-gray-900">National (Whole Country)</div>
                    <div className="text-xs text-gray-600 mt-1">Upload one file covering all counties / constituencies / wards.</div>
                </button>

                <button
                    type="button"
                    onClick={chooseJurisdiction}
                    className={[
                        "rounded-xl border px-4 py-4 text-left transition",
                        scope === "jurisdiction" ? "border-red-300 bg-red-50" : "border-gray-200 bg-white hover:bg-gray-50",
                    ].join(" ")}
                >
                    <div className="text-sm font-semibold text-gray-900">By Jurisdiction (Drill-down)</div>
                    <div className="text-xs text-gray-600 mt-1">Pick County (optional: Constituency → Ward), then upload.</div>
                </button>
            </div>

            {/* National upload panel: action-first */}
            {scope === "national" && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <div className="text-sm font-semibold text-gray-900">Upload national register</div>
                            <p className="text-xs text-gray-600 mt-1">Supported: CSV, XLS, XLSX</p>
                        </div>

                        <button className="text-xs text-gray-600 underline" onClick={backToScope}>
                            Clear
                        </button>
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="text-sm" />

                        <div className="text-xs text-gray-600">
                            {fileName ? (
                                <>
                                    Selected: <span className="font-semibold text-gray-900">{fileName}</span>
                                </>
                            ) : (
                                "No file selected"
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={uploadFile}
                            disabled={loading || !file}
                            className={[
                                "mt-2 inline-flex items-center justify-center rounded-lg text-white text-sm px-4 py-2 disabled:opacity-50",
                                THEME.redBg,
                                THEME.redHover,
                            ].join(" ")}
                        >
                            {loading ? "Uploading..." : "Upload & Start Processing"}
                        </button>
                    </div>
                </div>
            )}

            {/* Continue CTA (for jurisdiction) */}
            <div className="mt-4 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={continueFromScope}
                    disabled={!scope || scope === "national"}
                    className={[
                        "inline-flex items-center justify-center rounded-lg text-white text-sm px-4 py-2 disabled:opacity-50",
                        THEME.redBg,
                        THEME.redHover,
                    ].join(" ")}
                    title={scope === "national" ? "National upload is available above." : undefined}
                >
                    Continue →
                </button>
            </div>

            {scope === "national" && (
                <div className="mt-2 text-[0.72rem] text-gray-500">
                    Tip: National import is usually used for first-time setup or a full refresh.
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
                    <span className={step === "wards" ? "font-semibold text-gray-900" : "text-gray-600"}>
                        {selectedConstituency.constituency_name}
                    </span>
                )}
            </nav>
        );
    };

    const renderCountiesStep = () => (
        <section className={THEME.card}>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Select a county</h2>
                <div className="flex items-center gap-2">
                    <button className="text-xs text-gray-600 underline" onClick={backToScope}>
                        &larr; Change scope
                    </button>
                    {geoLoading && <span className="text-[0.7rem] text-gray-500">Loading…</span>}
                </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto divide-y divide-gray-100">
                {counties.length === 0 && !geoLoading && <div className="px-4 py-4 text-sm text-gray-500">No counties found.</div>}

                {counties.map((c) => (
                    <button
                        key={c.county_id || c.county_code}
                        onClick={() => handleSelectCounty(c)}
                        className="w-full text-left px-4 py-3 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
                    >
                        <div className="font-medium text-gray-900">{c.county_name}</div>
                    </button>
                ))}
            </div>
        </section>
    );

    const renderConstituenciesStep = () => (
        <section className={THEME.card}>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-800">Select a constituency (optional)</h2>
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
                        &larr; Back
                    </button>
                    {geoLoading && <span className="text-[0.7rem] text-gray-500">Loading…</span>}
                </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto divide-y divide-gray-100">
                {constituencies.length === 0 && !geoLoading && (
                    <div className="px-4 py-4 text-sm text-gray-500">No constituencies found for this county.</div>
                )}

                {/* Optional skip */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <button
                        className="text-xs underline text-gray-700"
                        onClick={() => {
                            // upload at county level; move to wards step isn't necessary, keep on constituencies for optional list
                            // action panel already allows upload as long as a county is selected
                            resetMessages();
                        }}
                    >
                        Skip (upload at county level)
                    </button>
                </div>

                {constituencies.map((c) => (
                    <button
                        key={c.constituency_id || c.constituency_code}
                        onClick={() => handleSelectConstituency(c)}
                        className="w-full text-left px-4 py-3 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
                    >
                        <div className="font-medium text-gray-900">{c.constituency_name}</div>
                    </button>
                ))}
            </div>
        </section>
    );

    const renderWardsStep = () => (
        <section className={THEME.card}>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-800">Select a ward (optional)</h2>
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
                        &larr; Back
                    </button>
                    {geoLoading && <span className="text-[0.7rem] text-gray-500">Loading…</span>}
                </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto divide-y divide-gray-100">
                {wards.length === 0 && !geoLoading && <div className="px-4 py-4 text-sm text-gray-500">No wards found for this constituency.</div>}

                {/* Optional skip */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <button
                        className="text-xs underline text-gray-700"
                        onClick={() => {
                            // upload at constituency level; no ward needed
                            resetMessages();
                        }}
                    >
                        Skip (upload at constituency level)
                    </button>
                </div>

                {wards.map((w) => (
                    <button
                        key={w.ward_id || w.ward_code}
                        onClick={() => handleSelectWard(w)}
                        className={[
                            "w-full text-left px-4 py-3 hover:bg-red-50 focus:bg-red-50 focus:outline-none",
                            selectedWard?.ward_id === w.ward_id ? "bg-red-50" : "",
                        ].join(" ")}
                    >
                        <div className="font-medium text-gray-900">{w.ward_name}</div>
                        {w.ward_code ? <div className="text-xs text-gray-500 mt-0.5">Code: {w.ward_code}</div> : null}
                    </button>
                ))}
            </div>
        </section>
    );

    /** Jurisdiction action panel: always visible, always showing Upload */
    const renderJurisdictionActionPanel = () => {
        if (scope !== "jurisdiction") return null;

        const targetLevel = selectedWard ? "Ward" : selectedConstituency ? "Constituency" : selectedCounty ? "County" : "—";
        const targetLabel = [
            selectedCounty?.county_name ?? null,
            selectedConstituency?.constituency_name ?? null,
            selectedWard?.ward_name ?? null,
        ]
            .filter(Boolean)
            .join(" → ");

        return (
            <aside className={`${THEME.card} p-4 h-fit lg:sticky lg:top-4`}>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold text-gray-900">Action</div>
                        <p className="text-xs text-gray-600 mt-1">Select an area then upload the register file.</p>
                    </div>
                    <button className="text-xs text-gray-600 underline" onClick={backToScope}>
                        Change scope
                    </button>
                </div>

                <div className="mt-3 rounded-lg border border-gray-200 p-3 bg-gray-50">
                    <div className="text-xs text-gray-700 font-medium">Target</div>
                    <div className="text-xs text-gray-600 mt-1">
                        Level: <span className="font-semibold text-gray-900">{targetLevel}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                        {targetLabel ? (
                            <span className="font-semibold text-gray-900">{targetLabel}</span>
                        ) : (
                            <span className="text-gray-500">Choose a county to begin.</span>
                        )}
                    </div>
                </div>

                <div className="mt-4">
                    <label className="text-xs font-medium text-gray-700">Register file</label>
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="mt-2 text-sm w-full" />

                    <div className="mt-2 text-xs text-gray-600">
                        {fileName ? (
                            <>
                                Selected: <span className="font-semibold text-gray-900">{fileName}</span>
                            </>
                        ) : (
                            "No file selected"
                        )}
                    </div>

                    {geoValidationError && <p className="text-[0.72rem] text-gray-500 mt-2">Select at least a County before uploading.</p>}

                    <button
                        type="button"
                        onClick={uploadFile}
                        disabled={loading || !!geoValidationError || !file}
                        className={[
                            "mt-3 w-full inline-flex items-center justify-center rounded-lg text-white text-sm px-4 py-2 disabled:opacity-50",
                            THEME.redBg,
                            THEME.redHover,
                        ].join(" ")}
                    >
                        {loading ? "Uploading..." : "Upload & Start Processing"}
                    </button>

                    <div className="mt-3 text-[0.72rem] text-gray-500">
                        Tip: Constituency and Ward are optional — you can upload at County level.
                    </div>
                </div>
            </aside>
        );
    };

    return (
        <RequirePermission permission="results34a.view">
            <div className="p-6 max-w-5xl mx-auto space-y-4">
                {renderHeader()}

                {error && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded">
                        Error: {error}
                    </div>
                )}

                {success && (
                    <div className="text-sm text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded">
                        {success}
                    </div>
                )}

                {/* Step: Scope */}
                {step === "scope" && renderScopeStep()}

                {/* Jurisdiction workflow: Work area + action panel */}
                {scope === "jurisdiction" && step !== "scope" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 space-y-4">
                            {renderBreadcrumb()}

                            {step === "counties" && renderCountiesStep()}
                            {step === "constituencies" && selectedCounty && renderConstituenciesStep()}
                            {step === "wards" && selectedConstituency && renderWardsStep()}
                        </div>

                        {renderJurisdictionActionPanel()}
                    </div>
                )}

                {/* Secondary: collapsible (keeps focus on action) */}
                <details className={`${THEME.card} p-4`}>
                    <summary className="cursor-pointer text-sm font-semibold text-gray-900 flex items-center justify-between">
                        Recent imports
                        <span className="text-xs text-gray-500 font-normal">View status</span>
                    </summary>
                    <p className="text-xs text-gray-600 mt-2">Imports appear here after processing begins.</p>
                    <div className="mt-3 text-sm text-gray-500">No imports loaded yet.</div>
                </details>
            </div>
        </RequirePermission>
    );
};

export default VoterRegisterImport;
