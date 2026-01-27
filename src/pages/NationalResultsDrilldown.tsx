import React, { useEffect, useState } from "react";
import { useUser } from "../contexts/UserContext";
import { RequirePermission } from "../components/RequirePermission";

/* ====================== TYPES ======================= */

interface CountyResultSummary {
    county_id: number;
    county_name: string;
    county_code: string;
    registered_voters: number;
    total_valid: number;
    rejected: number;
    total_votes: number;
    turnout_pct?: number; // total_votes / registered_voters * 100
}

interface ConstituencyResultSummary {
    constituency_id: number;
    constituency_name: string;
    constituency_code: string;
    county_id: number;
    county_name?: string;
    registered_voters: number;
    total_valid: number;
    rejected: number;
    total_votes: number;
    turnout_pct?: number;
}

interface WardResultSummary {
    ward_id: number;
    ward_name: string;
    ward_code: string;
    registered_voters: number;
    total_valid: number;
    rejected: number;
    total_votes: number;
    turnout_pct?: number;
}

interface StationResultSummary {
    station_id: number;
    station_name: string;
    ward_id: number;
    registered_voters: number;
    total_valid: number;
    rejected: number;
    total_votes: number;
    turnout_pct?: number;
}

type Step = "counties" | "constituencies" | "wards" | "stations";

/* ====================== UTILS ======================= */

const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

/* ====================== MAIN PAGE ======================= */

const NationalResultsDrilldown: React.FC = () => {
    const { user, token } = useUser();

    const [step, setStep] = useState<Step>("counties");

    const [counties, setCounties] = useState<CountyResultSummary[]>([]);
    const [constituencies, setConstituencies] = useState<
        ConstituencyResultSummary[]
    >([]);
    const [wards, setWards] = useState<WardResultSummary[]>([]);
    const [stations, setStations] = useState<StationResultSummary[]>([]);

    const [selectedCounty, setSelectedCounty] =
        useState<CountyResultSummary | null>(null);
    const [selectedConstituency, setSelectedConstituency] =
        useState<ConstituencyResultSummary | null>(null);
    const [selectedWard, setSelectedWard] = useState<WardResultSummary | null>(
        null
    );

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scopeLabel =
        user?.role && user.role.toUpperCase().includes("NATIONAL")
            ? "National – 47 Counties"
            : user?.county_name ||
            user?.constituency_name ||
            "National presidential results";

    /* ============ Helper to build headers + query token ============ */

    const buildAuth = () => {
        const localToken =
            localStorage.getItem("token") || localStorage.getItem("authToken");
        const effectiveToken = token || localToken || "";

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (effectiveToken) {
            headers["Authorization"] = `Bearer ${effectiveToken}`;
            headers["X-Token"] = effectiveToken;
        }

        return { headers, effectiveToken };
    };

    /* ============ 1. Fetch COUNTIES (top-level) ============ */

    useEffect(() => {
        if (step !== "counties") return;

        const fetchCounties = async () => {
            try {
                setError(null);
                setLoading(true);
                setCounties([]);
                setConstituencies([]);
                setWards([]);
                setStations([]);
                setSelectedCounty(null);
                setSelectedConstituency(null);
                setSelectedWard(null);

                const { headers, effectiveToken } = buildAuth();
                const params = new URLSearchParams();
                params.set("page", "1");
                params.set("limit", "100");
                if (effectiveToken) params.set("token", effectiveToken);

                const res = await fetch(
                    "/API/president/get_results_by_county.php?" + params.toString(),
                    {
                        method: "GET",
                        headers,
                        credentials: "include",
                    }
                );

                const data = await res.json().catch(() => ({}));

                if (res.status === 401) {
                    throw new Error(
                        data.message ||
                        "Unauthorized: invalid or missing token. Please log in again."
                    );
                }
                if (res.status === 403) {
                    throw new Error(
                        data.message ||
                        "Forbidden: you are not allowed to view national results."
                    );
                }
                if (!res.ok || data.status === "error") {
                    throw new Error(
                        data.message || data.error || "Failed to fetch county results."
                    );
                }

                const raw = data.data || data.counties || [];

                const rows: CountyResultSummary[] = raw.map((c: any) => {
                    const registered = Number(
                        c.registered_voters ?? c.registered_voters_snap ?? 0
                    );
                    const valid = Number(c.total_valid ?? c.total_valid_votes ?? 0);
                    const rejected = Number(c.rejected ?? c.rejected_votes ?? 0);
                    const total = Number(c.total_votes ?? valid + rejected);

                    return {
                        county_id: Number(c.county_id ?? c.id),
                        county_name: String(
                            c.county_name ?? c.name ?? "Unnamed county"
                        ),
                        county_code: String(c.county_code ?? c.code ?? ""),
                        registered_voters: registered,
                        total_valid: valid,
                        rejected,
                        total_votes: total,
                        turnout_pct:
                            typeof c.turnout_pct === "number"
                                ? Number(c.turnout_pct)
                                : pct(total, registered),
                    };
                });

                setCounties(rows);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to fetch county results.");
            } finally {
                setLoading(false);
            }
        };

        fetchCounties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, token]);

    /* ============ 2. Fetch CONSTITUENCIES when a county is selected ============ */

    const handleSelectCounty = (county: CountyResultSummary) => {
        setSelectedCounty(county);
        setSelectedConstituency(null);
        setSelectedWard(null);
        setConstituencies([]);
        setWards([]);
        setStations([]);
        setStep("constituencies");
    };

    useEffect(() => {
        if (!selectedCounty || step !== "constituencies") return;

        const fetchConstituencies = async () => {
            try {
                setError(null);
                setLoading(true);
                setConstituencies([]);
                setWards([]);
                setStations([]);

                const { headers, effectiveToken } = buildAuth();
                const params = new URLSearchParams();

                // Match working endpoint
                params.set("county_code", selectedCounty.county_code);
                params.set("page", "1");
                params.set("limit", "200");
                if (effectiveToken) params.set("token", effectiveToken);

                const res = await fetch(
                    "/API/president/get_results_by_constituency.php?" +
                    params.toString(),
                    {
                        method: "GET",
                        headers,
                        credentials: "include",
                    }
                );

                const data = await res.json().catch(() => ({}));

                if (res.status === 401) {
                    throw new Error(
                        data.message ||
                        "Unauthorized: invalid or missing token. Please log in again."
                    );
                }
                if (res.status === 403) {
                    throw new Error(
                        data.message ||
                        "Forbidden: you are not allowed to view constituencies for this county."
                    );
                }
                if (!res.ok || data.status === "error") {
                    throw new Error(
                        data.message ||
                        data.error ||
                        "Failed to fetch constituencies."
                    );
                }

                const raw = data.data || data.constituencies || [];

                const rows: ConstituencyResultSummary[] = raw.map((c: any) => {
                    const registered = Number(
                        c.registered_voters ?? c.registered_voters_snap ?? 0
                    );
                    const valid = Number(c.total_valid ?? c.total_valid_votes ?? 0);
                    const rejected = Number(c.rejected ?? c.rejected_votes ?? 0);
                    const total = Number(c.total_votes ?? valid + rejected);

                    return {
                        constituency_id: Number(c.constituency_id ?? c.id),
                        constituency_name: String(
                            c.constituency_name ??
                            c.name ??
                            "Unnamed constituency"
                        ),
                        constituency_code: String(
                            c.constituency_code ?? c.const_code ?? ""
                        ),
                        county_id: selectedCounty.county_id,
                        county_name: selectedCounty.county_name,
                        registered_voters: registered,
                        total_valid: valid,
                        rejected,
                        total_votes: total,
                        turnout_pct:
                            typeof c.turnout_pct === "number"
                                ? Number(c.turnout_pct)
                                : pct(total, registered),
                    };
                });

                setConstituencies(rows);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to fetch constituency results.");
            } finally {
                setLoading(false);
            }
        };

        fetchConstituencies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCounty, step, token]);

    /* ============ 3. Fetch WARDS when a constituency is selected ============ */

    const handleSelectConstituency = (c: ConstituencyResultSummary) => {
        setSelectedConstituency(c);
        setSelectedWard(null);
        setWards([]);
        setStations([]);
        setStep("wards");
    };

    useEffect(() => {
        if (!selectedConstituency || step !== "wards") return;

        const fetchWards = async () => {
            try {
                setError(null);
                setLoading(true);
                setWards([]);
                setStations([]);

                const { headers, effectiveToken } = buildAuth();
                const params = new URLSearchParams();
                params.set("page", "1");
                params.set("limit", "500");

                // 🔑 Use constituency_code (matches get_results_by_ward.php)
                params.set(
                    "constituency_code",
                    selectedConstituency.constituency_code
                );

                if (effectiveToken) params.set("token", effectiveToken);

                const res = await fetch(
                    "/API/president/get_results_by_ward.php?" + params.toString(),
                    {
                        method: "GET",
                        headers,
                        credentials: "include",
                    }
                );

                const data = await res.json().catch(() => ({}));

                if (res.status === 401) {
                    throw new Error(
                        data.message ||
                        "Unauthorized: invalid or missing token. Please log in again."
                    );
                }
                if (res.status === 403) {
                    throw new Error(
                        data.message ||
                        "Forbidden: you are not allowed to view wards for this constituency."
                    );
                }
                if (!res.ok || data.status === "error") {
                    throw new Error(
                        data.message || data.error || "Failed to fetch wards."
                    );
                }

                const raw = data.data || data.wards || [];

                const rows: WardResultSummary[] = raw.map((w: any) => {
                    const registered = Number(
                        w.registered_voters ??
                        w.registered_voters_snap ??
                        w.reg_voters ??
                        0
                    );
                    const valid = Number(w.total_valid ?? w.total_valid_votes ?? 0);
                    const rejected = Number(w.rejected ?? w.rejected_votes ?? 0);
                    const total = Number(w.total_votes ?? valid + rejected);

                    return {
                        ward_id: Number(w.ward_id ?? w.id),
                        ward_name: String(
                            w.ward_name ?? w.caw_name ?? "Unnamed ward"
                        ),
                        ward_code: String(w.ward_code ?? w.caw_code ?? ""),
                        registered_voters: registered,
                        total_valid: valid,
                        rejected,
                        total_votes: total,
                        turnout_pct:
                            typeof w.turnout_pct === "number"
                                ? Number(w.turnout_pct)
                                : pct(total, registered),
                    };
                });

                setWards(rows);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to fetch ward results.");
            } finally {
                setLoading(false);
            }
        };

        fetchWards();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedConstituency, step, token]);

    /* ============ 4. Fetch STATIONS RESULTS when a ward is selected ============ */

    const handleSelectWard = (ward: WardResultSummary) => {
        setSelectedWard(ward);
        setStations([]);
        setStep("stations");
    };

    useEffect(() => {
        if (!selectedWard || step !== "stations") return;

        let intervalId: number | undefined;

        const fetchStationsResults = async () => {
            try {
                setError(null);
                setLoading(true);

                const { headers, effectiveToken } = buildAuth();
                const params = new URLSearchParams();

                // 🔑 PHP expects ward_id OR caw_code.
                // We reliably have ward_code from the wards API, so use it as caw_code.
                if (selectedWard.ward_code) {
                    params.set("caw_code", selectedWard.ward_code);
                }

                // Only send ward_id if it's a valid positive number
                if (
                    typeof selectedWard.ward_id === "number" &&
                    Number.isFinite(selectedWard.ward_id) &&
                    selectedWard.ward_id > 0
                ) {
                    params.set("ward_id", String(selectedWard.ward_id));
                }

                if (effectiveToken) params.set("token", effectiveToken);

                const res = await fetch(
                    "/API/president/get_polling_stations.php?" +
                    params.toString(),
                    {
                        method: "GET",
                        headers,
                        credentials: "include",
                    }
                );

                const data = await res.json().catch(() => ({}));

                if (res.status === 401) {
                    throw new Error(
                        data.message ||
                        "Unauthorized: invalid or missing token. Please log in again."
                    );
                }
                if (res.status === 403) {
                    throw new Error(
                        data.message ||
                        "Forbidden: you are not allowed to view polling stations for this ward."
                    );
                }
                if (!res.ok || data.ok === false || data.status === "error") {
                    throw new Error(
                        data.message ||
                        data.error ||
                        "Failed to fetch station results."
                    );
                }

                const rawStations =
                    data.data || data.polling_centers || data.stations || [];

                const rows: StationResultSummary[] = rawStations.map((s: any) => {
                    const registered = Number(
                        s.registered_voters ??
                        s.registered_voters_snap ??
                        s.reg_voters ??
                        0
                    );
                    const valid = Number(s.total_valid ?? s.total_valid_votes ?? 0);
                    const rejected = Number(s.rejected ?? s.rejected_votes ?? 0);
                    const total = Number(s.total_votes ?? valid + rejected);

                    return {
                        station_id: Number(s.station_id ?? s.id ?? s.stationId),
                        station_name: String(
                            s.station_name ??
                            s.polling_station_name ??
                            s.reg_centre_name ??
                            ""
                        ),
                        ward_id: Number(s.ward_id ?? selectedWard.ward_id ?? 0),
                        registered_voters: registered,
                        total_valid: valid,
                        rejected,
                        total_votes: total,
                        turnout_pct:
                            typeof s.turnout_pct === "number"
                                ? Number(s.turnout_pct)
                                : pct(total, registered),
                    };
                });

                setStations(rows);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to fetch polling station results.");
            } finally {
                setLoading(false);
            }
        };

        // initial load
        fetchStationsResults();

        // OPTIONAL: auto-refresh at station level
        intervalId = window.setInterval(fetchStationsResults, 30000);

        return () => {
            if (intervalId) window.clearInterval(intervalId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWard, step, token]);

    /* ====================== RENDER HELPERS ======================= */

    const renderHeader = () => (
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Presidential Results Drilldown
                </h1>
                <p className="text-sm text-gray-600">
                    Scope: <span className="font-semibold">{scopeLabel}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    Step{" "}
                    {{
                        counties: "1",
                        constituencies: "2",
                        wards: "3",
                        stations: "4",
                    }[step]}{" "}
                    of 4 –{" "}
                    {{
                        counties: "View county-level results",
                        constituencies: "Drill down to Constituencies",
                        wards: "Drill down to Wards",
                        stations: "View Polling Stations",
                    }[step]}
                </p>
            </div>
        </header>
    );

    const renderBreadcrumb = () => (
        <nav className="text-xs text-gray-600 mb-3 flex flex-wrap items-center gap-1">
            <button
                className={`underline ${step === "counties" ? "font-semibold text-gray-900" : ""
                    }`}
                onClick={() => {
                    setStep("counties");
                    setSelectedCounty(null);
                    setSelectedConstituency(null);
                    setSelectedWard(null);
                    setConstituencies([]);
                    setWards([]);
                    setStations([]);
                }}
            >
                Counties
            </button>
            {selectedCounty && <span>&gt;</span>}
            {selectedCounty && (
                <button
                    className={`underline ${step === "constituencies"
                        ? "font-semibold text-gray-900"
                        : ""
                        }`}
                    onClick={() => {
                        setStep("constituencies");
                        setSelectedConstituency(null);
                        setSelectedWard(null);
                        setWards([]);
                        setStations([]);
                    }}
                >
                    {selectedCounty.county_name}
                </button>
            )}
            {selectedConstituency && <span>&gt;</span>}
            {selectedConstituency && (
                <button
                    className={`underline ${step === "wards" ? "font-semibold text-gray-900" : ""
                        }`}
                    onClick={() => {
                        setStep("wards");
                        setSelectedWard(null);
                        setStations([]);
                    }}
                >
                    {selectedConstituency.constituency_name}
                </button>
            )}
            {selectedWard && <span>&gt;</span>}
            {selectedWard && (
                <span
                    className={
                        step === "stations"
                            ? "font-semibold text-gray-900"
                            : "text-gray-600"
                    }
                >
                    {selectedWard.ward_name}
                </span>
            )}
        </nav>
    );

    const renderCountiesStep = () => (
        <section className="border border-gray-200 bg-white rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">
                    Step 1: Counties – Presidential Results
                </h2>
                {loading && (
                    <span className="text-[0.7rem] text-gray-500">Loading…</span>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                                County
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Registered
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Valid votes
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Rejected
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Total votes
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Turnout %
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {counties.length === 0 && !loading && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-4 py-4 text-center text-xs text-gray-500"
                                >
                                    No county results found.
                                </td>
                            </tr>
                        )}

                        {counties.map((c) => {
                            const percentage =
                                typeof c.turnout_pct === "number"
                                    ? c.turnout_pct
                                    : pct(c.total_votes, c.registered_voters);

                            return (
                                <tr
                                    key={c.county_id}
                                    className="border-b border-gray-100 hover:bg-green-50 cursor-pointer"
                                    onClick={() => handleSelectCounty(c)}
                                >
                                    <td className="px-4 py-2 text-gray-800">
                                        {c.county_name}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {c.registered_voters.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {c.total_valid.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {c.rejected.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {c.total_votes.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {percentage.toFixed(1)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );

    const renderConstituenciesStep = () => (
        <section className="border border-gray-200 bg-white rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-800">
                        Step 2: Constituencies – Results
                    </h2>
                    {selectedCounty && (
                        <p className="text-xs text-gray-500 mt-1">
                            County:{" "}
                            <span className="font-semibold">
                                {selectedCounty.county_name}
                            </span>
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
                            setStations([]);
                        }}
                    >
                        &larr; Back to counties
                    </button>
                    {loading && (
                        <span className="text-[0.7rem] text-gray-500">Loading…</span>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                                Constituency
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Registered
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Valid votes
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Rejected
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Total votes
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Turnout %
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {constituencies.length === 0 && !loading && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-4 py-4 text-center text-xs text-gray-500"
                                >
                                    No constituencies found for this county.
                                </td>
                            </tr>
                        )}

                        {constituencies.map((c) => {
                            const percentage =
                                typeof c.turnout_pct === "number"
                                    ? c.turnout_pct
                                    : pct(c.total_votes, c.registered_voters);

                            return (
                                <tr
                                    key={c.constituency_id}
                                    className="border-b border-gray-100 hover:bg-green-50 cursor-pointer"
                                    onClick={() => handleSelectConstituency(c)}
                                >
                                    <td className="px-4 py-2 text-gray-800">
                                        {c.constituency_name}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {c.registered_voters.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {c.total_valid.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {c.rejected.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {c.total_votes.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {percentage.toFixed(1)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );

    const renderWardsStep = () => (
        <section className="border border-gray-200 bg-white rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-800">
                        Step 3: Wards – Results
                    </h2>

                    {selectedCounty && (
                        <p className="text-xs text-gray-500 mt-1">
                            County:{" "}
                            <span className="font-semibold">
                                {selectedCounty.county_name}
                            </span>
                        </p>
                    )}

                    {selectedConstituency && (
                        <p className="text-xs text-gray-500">
                            Constituency:{" "}
                            <span className="font-semibold">
                                {selectedConstituency.constituency_name}
                            </span>
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="text-xs text-gray-600 underline"
                        onClick={() => {
                            setStep("constituencies");
                            setSelectedWard(null);
                            setStations([]);
                        }}
                    >
                        &larr; Back to constituencies
                    </button>
                    {loading && (
                        <span className="text-[0.7rem] text-gray-500">Loading…</span>
                    )}
                </div>
            </div>

            <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
                {wards.length === 0 && !loading && (
                    <div className="px-4 py-4 text-sm text-gray-500">
                        No wards found for this constituency.
                    </div>
                )}

                {wards.map((w) => {
                    const percentage =
                        typeof w.turnout_pct === "number"
                            ? w.turnout_pct
                            : pct(w.total_votes, w.registered_voters);

                    return (
                        <button
                            key={w.ward_id}
                            onClick={() => handleSelectWard(w)}
                            className="w-full text-left px-4 py-3 hover:bg-green-50 focus:bg-green-50 focus:outline-none flex items-center justify-between gap-4"
                        >
                            <div>
                                <div className="font-medium text-gray-900">
                                    {w.ward_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Reg: {w.registered_voters.toLocaleString()} | Valid:{" "}
                                    {w.total_valid.toLocaleString()} | Rejected:{" "}
                                    {w.rejected.toLocaleString()} | Total:{" "}
                                    {w.total_votes.toLocaleString()} (
                                    {percentage.toFixed(1)}%)
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );

    const renderStationsStep = () => (
        <section className="border border-gray-200 bg-white rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-800">
                        Step 4: Polling Stations – Results
                    </h2>

                    {selectedCounty && (
                        <p className="text-xs text-gray-500 mt-1">
                            County:{" "}
                            <span className="font-semibold">
                                {selectedCounty.county_name}
                            </span>
                        </p>
                    )}

                    {selectedConstituency && (
                        <p className="text-xs text-gray-500">
                            Constituency:{" "}
                            <span className="font-semibold">
                                {selectedConstituency.constituency_name}
                            </span>
                        </p>
                    )}

                    {selectedWard && (
                        <p className="text-xs text-gray-500">
                            Ward:{" "}
                            <span className="font-semibold">{selectedWard.ward_name}</span>
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="text-xs text-gray-600 underline"
                        onClick={() => {
                            setStep("wards");
                            setSelectedWard(null);
                            setStations([]);
                        }}
                    >
                        &larr; Back to wards
                    </button>
                    {loading && (
                        <span className="text-[0.7rem] text-gray-500">Loading…</span>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                                Polling Station
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Registered
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Valid votes
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Rejected
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Total votes
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Turnout %
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {stations.length === 0 && !loading && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-4 py-4 text-center text-xs text-gray-500"
                                >
                                    No polling stations found for this ward.
                                </td>
                            </tr>
                        )}

                        {stations.map((s) => {
                            const percentage =
                                typeof s.turnout_pct === "number"
                                    ? s.turnout_pct
                                    : pct(s.total_votes, s.registered_voters);

                            return (
                                <tr key={s.station_id} className="border-b border-gray-100">
                                    <td className="px-4 py-2 text-gray-800">
                                        {s.station_name || `Station #${s.station_id}`}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {s.registered_voters.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {s.total_valid.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {s.rejected.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {s.total_votes.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {percentage.toFixed(1)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );

    return (
        <RequirePermission permission="results.view">
            <div className="p-6 max-w-6xl mx-auto space-y-4">
                {renderHeader()}

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
                        Error: {error}
                    </div>
                )}

                {renderBreadcrumb()}

                {step === "counties" && renderCountiesStep()}
                {step === "constituencies" &&
                    selectedCounty &&
                    renderConstituenciesStep()}
                {step === "wards" && selectedConstituency && renderWardsStep()}
                {step === "stations" && selectedWard && renderStationsStep()}
            </div>
        </RequirePermission>
    );
};

export default NationalResultsDrilldown;
