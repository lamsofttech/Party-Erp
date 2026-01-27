import React, { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { RequirePermission } from "../../components/RequirePermission";

/* ====================== TYPES ======================= */

type TurnoutStatus = "good" | "fair" | "danger" | "not_started" | "open";
type TurnoutStatusColor = "green" | "yellow" | "red" | "gray";

interface CountySummary {
    county_id: number;
    county_name: string;
    county_code: string;
    registered_voters: number;
    turn_out: number;

    turnout_pct?: number;
    status?: TurnoutStatus;
    status_color?: TurnoutStatusColor;
}

interface ConstituencySummary {
    constituency_id: number;
    constituency_name: string;
    constituency_code: string;
    county_id: number;
    registered_voters: number;
    turn_out: number;

    turnout_pct?: number;
    status?: TurnoutStatus;
    status_color?: TurnoutStatusColor;
}

interface WardSummary {
    ward_id: number;
    ward_name: string;
    ward_code: string;
    registered_voters?: number;
    turn_out?: number;

    turnout_pct?: number;
    status?: TurnoutStatus;
    status_color?: TurnoutStatusColor;
}

interface StationTurnoutSummary {
    station_id: number;
    station_name: string;
    ward_id: number;
    registered_voters: number;
    turn_out: number;

    turnout_pct?: number;
    expected_pct?: number;
    elapsed_hours?: number;
    status?: TurnoutStatus;
    status_color?: TurnoutStatusColor;
}

type Step = "counties" | "constituencies" | "wards" | "stations";

/* ====================== UTILS ======================= */

const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

/**
 * Classify turnout vs expected over 8 hours (50% by hour 4, 100% by hour 8)
 */
function classifyTurnout(
    registered_voters: number,
    turn_out: number
): {
    turnoutPct: number;
    expectedPct: number;
    elapsedHours: number;
    status: TurnoutStatus;
    color: TurnoutStatusColor;
} {
    const tzOffsetMs = new Date().getTimezoneOffset() * 60 * 1000;
    const nowLocal = new Date(Date.now() - tzOffsetMs); // approximate local (browser) time
    const start = new Date(nowLocal);
    start.setHours(6, 0, 0, 0); // 06:00 local

    let diffMs = nowLocal.getTime() - start.getTime();
    if (diffMs < 0) diffMs = 0;

    const totalHours = 8;
    const elapsedHours = Math.min(totalHours, diffMs / 3_600_000);
    const expectedPct = Math.min(100, (elapsedHours / totalHours) * 100);

    const turnoutPct =
        registered_voters > 0 ? (turn_out / Math.max(1, registered_voters)) * 100 : 0;

    let status: TurnoutStatus = "not_started";
    let color: TurnoutStatusColor = "gray";

    if (elapsedHours <= 0.25) {
        if (turn_out > 0) {
            status = "open";
            color = "green";
        } else {
            status = "not_started";
            color = "gray";
        }
    } else if (expectedPct > 0) {
        const ratio = turnoutPct / expectedPct;

        if (turn_out === 0 && elapsedHours > 1) {
            status = "danger";
            color = "red";
        } else if (ratio >= 0.9) {
            status = "good";
            color = "green";
        } else if (ratio >= 0.5) {
            status = "fair";
            color = "yellow";
        } else {
            status = "danger";
            color = "red";
        }
    } else {
        if (turn_out > 0) {
            status = "open";
            color = "green";
        } else {
            status = "not_started";
            color = "gray";
        }
    }

    return {
        turnoutPct,
        expectedPct,
        elapsedHours,
        status,
        color,
    };
}

/* ====================== MAIN PAGE ======================= */

const NationalTurnoutDrilldown: React.FC = () => {
    const { user, token } = useUser();

    const [step, setStep] = useState<Step>("counties");

    const [counties, setCounties] = useState<CountySummary[]>([]);
    const [constituencies, setConstituencies] = useState<ConstituencySummary[]>([]);
    const [wards, setWards] = useState<WardSummary[]>([]);
    const [stations, setStations] = useState<StationTurnoutSummary[]>([]);

    const [selectedCounty, setSelectedCounty] = useState<CountySummary | null>(null);
    const [selectedConstituency, setSelectedConstituency] =
        useState<ConstituencySummary | null>(null);
    const [selectedWard, setSelectedWard] = useState<WardSummary | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scopeLabel =
        user?.role && user.role.toUpperCase().includes("NATIONAL")
            ? "National – 47 Counties"
            : user?.county_name || user?.constituency_name || "National turnout";

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
                    "/API/president/get_turnout_by_county.php?" + params.toString(),
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
                        "Forbidden: you are not allowed to view national turnout."
                    );
                }
                if (!res.ok || data.status === "error") {
                    throw new Error(
                        data.message || data.error || "Failed to fetch county turnout."
                    );
                }

                const raw = data.data || data.counties || [];

                const rows: CountySummary[] = raw.map((c: any) => {
                    const registered = Number(c.registered_voters ?? c.reg_voters ?? 0);
                    const turnout = Number(c.turn_out ?? c.turnout ?? 0);

                    const fromClass = classifyTurnout(registered, turnout);

                    return {
                        county_id: Number(c.county_id ?? c.id),
                        county_name: String(c.county_name ?? c.name ?? "Unnamed county"),
                        county_code: String(c.county_code ?? c.code ?? ""),
                        registered_voters: registered,
                        turn_out: turnout,
                        turnout_pct:
                            typeof c.turnout_pct === "number"
                                ? Number(c.turnout_pct)
                                : fromClass.turnoutPct,
                        status: (c.status as TurnoutStatus) ?? fromClass.status,
                        status_color:
                            (c.status_color as TurnoutStatusColor) ?? fromClass.color,
                    };
                });

                setCounties(rows);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to fetch county turnout.");
            } finally {
                setLoading(false);
            }
        };

        fetchCounties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, token]);

    /* ============ 2. Fetch CONSTITUENCIES when a county is selected ============ */

    const handleSelectCounty = (county: CountySummary) => {
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
                params.set("county_id", String(selectedCounty.county_id));
                if (effectiveToken) params.set("token", effectiveToken);

                const res = await fetch(
                    "/API/president/get_turnout_by_constituency.php?" + params.toString(),
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
                        data.message || data.error || "Failed to fetch constituencies."
                    );
                }

                const raw = data.data || data.constituencies || [];

                const rows: ConstituencySummary[] = raw.map((c: any) => {
                    const registered = Number(c.registered_voters ?? c.reg_voters ?? 0);
                    const turnout = Number(c.turn_out ?? c.turnout ?? 0);

                    const fromClass = classifyTurnout(registered, turnout);

                    return {
                        constituency_id: Number(c.constituency_id ?? c.id),
                        constituency_name: String(
                            c.constituency_name ?? c.name ?? "Unnamed constituency"
                        ),
                        constituency_code: String(c.constituency_code ?? c.code ?? ""),
                        county_id: selectedCounty.county_id,
                        registered_voters: registered,
                        turn_out: turnout,
                        turnout_pct:
                            typeof c.turnout_pct === "number"
                                ? Number(c.turnout_pct)
                                : fromClass.turnoutPct,
                        status: (c.status as TurnoutStatus) ?? fromClass.status,
                        status_color:
                            (c.status_color as TurnoutStatusColor) ?? fromClass.color,
                    };
                });

                setConstituencies(rows);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to fetch constituency turnout.");
            } finally {
                setLoading(false);
            }
        };

        fetchConstituencies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCounty, step, token]);

    /* ============ 3. Fetch WARDS when a constituency is selected ============ */

    const handleSelectConstituency = (c: ConstituencySummary) => {
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
                params.set("constituency_id", String(selectedConstituency.constituency_id));
                if (effectiveToken) params.set("token", effectiveToken);

                const res = await fetch(
                    "/API/president/get_wards.php?" + params.toString(),
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

                const rows: WardSummary[] = raw.map((w: any) => {
                    const registered = Number(
                        w.registered_voters ?? w.reg_voters ?? w.total_registered ?? 0
                    );
                    const turnout = Number(
                        w.turn_out ?? w.turnout ?? w.total_turnout ?? 0
                    );

                    let fromClass: ReturnType<typeof classifyTurnout> | null = null;
                    if (registered > 0 || turnout > 0) {
                        fromClass = classifyTurnout(registered, turnout);
                    }

                    return {
                        ward_id: Number(w.id ?? w.ward_id),
                        ward_name: String(w.ward_name ?? w.caw_name ?? "Unnamed ward"),
                        ward_code: String(w.ward_code ?? w.caw_code ?? ""),
                        registered_voters: registered || undefined,
                        turn_out: turnout || undefined,
                        turnout_pct:
                            typeof w.turnout_pct === "number"
                                ? Number(w.turnout_pct)
                                : fromClass?.turnoutPct,
                        status: (w.status as TurnoutStatus) ?? fromClass?.status,
                        status_color:
                            (w.status_color as TurnoutStatusColor) ?? fromClass?.color,
                    };
                });

                setWards(rows);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to fetch wards.");
            } finally {
                setLoading(false);
            }
        };

        fetchWards();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedConstituency, step, token]);

    /* ============ 4. Fetch STATIONS TURNOUT when a ward is selected ============ */

    const handleSelectWard = (ward: WardSummary) => {
        setSelectedWard(ward);
        setStations([]);
        setStep("stations");
    };

    useEffect(() => {
        if (!selectedWard || step !== "stations") return;

        let intervalId: number | undefined;

        const fetchStationsTurnout = async () => {
            try {
                setError(null);
                setLoading(true);

                const { headers, effectiveToken } = buildAuth();
                const params = new URLSearchParams();
                params.set("ward_id", String(selectedWard.ward_id));
                if (selectedWard.ward_code) {
                    params.set("caw_code", selectedWard.ward_code);
                }
                if (effectiveToken) params.set("token", effectiveToken);

                const res = await fetch(
                    "/API/president/get_turnout_by_station.php?" + params.toString(),
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
                        "Failed to fetch turnout for polling stations."
                    );
                }

                const rawStations =
                    data.data || data.polling_centers || data.stations || [];

                const rows: StationTurnoutSummary[] = rawStations.map((s: any) => {
                    const registered = Number(
                        s.registered_voters ??
                        s.registered_voters_snap ??
                        s.reg_voters ??
                        0
                    );
                    const turnout = Number(
                        s.turn_out ?? s.turnout ?? s.turnout_count ?? 0
                    );

                    const turnoutPctFromApi =
                        typeof s.turnout_pct === "number"
                            ? Number(s.turnout_pct)
                            : pct(turnout, registered);

                    const expectedPctFromApi =
                        typeof s.expected_pct === "number"
                            ? Number(s.expected_pct)
                            : 0;

                    return {
                        station_id: Number(s.station_id ?? s.id ?? s.stationId),
                        station_name: String(
                            s.station_name ??
                            s.polling_station_name ??
                            s.reg_centre_name ??
                            ""
                        ),
                        ward_id: Number(s.ward_id ?? selectedWard.ward_id),
                        registered_voters: registered,
                        turn_out: turnout,
                        turnout_pct: turnoutPctFromApi,
                        expected_pct: expectedPctFromApi,
                        elapsed_hours:
                            typeof s.elapsed_hours === "number"
                                ? Number(s.elapsed_hours)
                                : undefined,
                        status: (s.status as TurnoutStatus) || undefined,
                        status_color: (s.status_color as TurnoutStatusColor) || undefined,
                    };
                });

                setStations(rows);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to fetch polling stations turnout.");
            } finally {
                setLoading(false);
            }
        };

        // initial load
        fetchStationsTurnout();

        // auto-refresh every 30 seconds while on this ward
        intervalId = window.setInterval(fetchStationsTurnout, 30000);

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
                    National Turnout Monitor
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
                        counties: "View 47 Counties",
                        constituencies: "Drill down to Constituencies",
                        wards: "Drill down to Wards",
                        stations: "View Polling Stations",
                    }[step]}
                </p>
            </div>
        </header>
    );

    const renderStatusChip = (
        status?: TurnoutStatus,
        color?: TurnoutStatusColor,
        fallbackLabel = "No turnout reported"
    ) => {
        let label = fallbackLabel;
        let classes =
            "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-gray-200 text-gray-700";

        if (status && color) {
            if (status === "good") label = "On track";
            else if (status === "fair") label = "Slightly behind";
            else if (status === "danger") label = "Behind target";
            else if (status === "not_started") label = "Polls not started";
            else if (status === "open") label = "Open";

            if (color === "green") {
                classes =
                    "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-green-600 text-white";
            } else if (color === "yellow") {
                classes =
                    "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-yellow-400 text-gray-900";
            } else if (color === "red") {
                classes =
                    "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-red-600 text-white";
            } else if (color === "gray") {
                classes =
                    "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-gray-200 text-gray-700";
            }
        }

        return <span className={classes}>{label}</span>;
    };

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
                    className={`underline ${step === "constituencies" ? "font-semibold text-gray-900" : ""
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
                    Step 1: Counties – Turnout Overview
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
                                Turnout
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Turnout %
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {counties.length === 0 && !loading && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-4 text-center text-xs text-gray-500"
                                >
                                    No county turnout data found.
                                </td>
                            </tr>
                        )}

                        {counties.map((c) => {
                            const percentage =
                                typeof c.turnout_pct === "number"
                                    ? c.turnout_pct
                                    : pct(c.turn_out, c.registered_voters);

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
                                        {c.turn_out.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {percentage.toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {renderStatusChip(c.status, c.status_color)}
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
                        Step 2: Constituencies – Turnout
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
                                Turnout
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Turnout %
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {constituencies.length === 0 && !loading && (
                            <tr>
                                <td
                                    colSpan={5}
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
                                    : pct(c.turn_out, c.registered_voters);

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
                                        {c.turn_out.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {percentage.toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {renderStatusChip(c.status, c.status_color)}
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
                        Step 3: Wards – Turnout
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
                    const registered = w.registered_voters ?? 0;
                    const turnout = w.turn_out ?? 0;

                    const percentage =
                        typeof w.turnout_pct === "number"
                            ? w.turnout_pct
                            : pct(turnout, registered);

                    const fromClass =
                        registered > 0 || turnout > 0
                            ? classifyTurnout(registered, turnout)
                            : null;

                    const status = w.status ?? fromClass?.status;
                    const color = w.status_color ?? fromClass?.color;

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
                                {registered > 0 && (
                                    <div className="text-xs text-gray-500">
                                        Reg: {registered.toLocaleString()} | Turnout:{" "}
                                        {turnout.toLocaleString()} (
                                        {percentage.toFixed(1)}%)
                                    </div>
                                )}
                            </div>
                            <div>{renderStatusChip(status, color)}</div>
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
                        Step 4: Polling Stations – Turnout
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
                            <span className="font-semibold">
                                {selectedWard.ward_name}
                            </span>
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
                                Turnout
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                                Turnout %
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {stations.length === 0 && !loading && (
                            <tr>
                                <td
                                    colSpan={5}
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
                                    : pct(s.turn_out, s.registered_voters);

                            let status = s.status;
                            let color = s.status_color;

                            if (!status || !color) {
                                const fromClass = classifyTurnout(
                                    s.registered_voters,
                                    s.turn_out
                                );
                                status = fromClass.status;
                                color = fromClass.color;
                            }

                            return (
                                <tr key={s.station_id} className="border-b border-gray-100">
                                    <td className="px-4 py-2 text-gray-800">
                                        {s.station_name || `Station #${s.station_id}`}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {s.registered_voters.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {s.turn_out.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-800">
                                        {percentage.toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {renderStatusChip(status, color)}
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
        <RequirePermission permission="turnout.view">
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

export default NationalTurnoutDrilldown;
