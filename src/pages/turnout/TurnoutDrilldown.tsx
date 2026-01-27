import React, { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { RequirePermission } from "../../components/RequirePermission";

/* ====================== TYPES ======================= */

interface WardSummary {
    ward_id: number;
    ward_name: string;
    ward_code: string;
}

type TurnoutStatus = "good" | "fair" | "danger" | "not_started" | "open";

type TurnoutStatusColor = "green" | "yellow" | "red" | "gray";

interface StationTurnoutSummary {
    station_id: number;
    station_name: string;
    ward_id: number;
    registered_voters: number;
    turn_out: number;

    // NEW – from API (optional but preferred)
    turnout_pct?: number;
    expected_pct?: number;
    elapsed_hours?: number;
    status?: TurnoutStatus;
    status_color?: TurnoutStatusColor;
}

type Step = "wards" | "stations";

/* ====================== UTILS ======================= */

const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

/* ====================== MAIN PAGE ======================= */

const TurnoutDrilldown: React.FC = () => {
    const { user, token } = useUser();

    const [step, setStep] = useState<Step>("wards");

    const [wards, setWards] = useState<WardSummary[]>([]);
    const [stations, setStations] = useState<StationTurnoutSummary[]>([]);

    const [selectedWard, setSelectedWard] = useState<WardSummary | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const constituencyName =
        user?.constituency_name ||
        user?.county_name ||
        `Constituency ${user?.scope_constituency_id ?? ""}`;

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

    /* ============ 1. Fetch WARDS (first screen) ============ */

    useEffect(() => {
        const fetchWards = async () => {
            try {
                setError(null);
                setLoading(true);
                setWards([]);
                setStations([]);
                setSelectedWard(null);
                setStep("wards");

                const { headers, effectiveToken } = buildAuth();
                const params = new URLSearchParams();
                params.set("page", "1");
                params.set("limit", "500");
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
                        "Forbidden: you are not allowed to view turnout for this constituency."
                    );
                }
                if (!res.ok || data.status === "error") {
                    throw new Error(data.message || data.error || "Failed to fetch wards.");
                }

                const rows: WardSummary[] = (data.data || []).map((w: any) => ({
                    ward_id: Number(w.id ?? w.ward_id),
                    ward_name: String(w.ward_name ?? w.caw_name ?? "Unnamed ward"),
                    ward_code: String(w.ward_code ?? w.caw_code ?? ""),
                }));

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
    }, [token]);

    /* ============ 2. Fetch STATIONS TURNOUT when a ward is selected ============ */

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

                // REAL-TIME TURNOUT API (polling_station.turn_out + registered_voters + status)
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

                const rawStations = data.data || data.polling_centers || data.stations || [];

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

    /* ====================== RENDER ======================= */

    const renderHeader = () => (
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Turnout Monitor</h1>
                <p className="text-sm text-gray-600">
                    Scope: <span className="font-semibold">{constituencyName}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    Step {step === "wards" ? "1" : "2"} of 2 –{" "}
                    {step === "wards" ? "Choose a Ward" : "View Polling Stations"}
                </p>
            </div>
        </header>
    );

    const renderBreadcrumb = () => (
        <nav className="text-xs text-gray-600 mb-3 flex flex-wrap items-center gap-1">
            <button
                className={`underline ${step === "wards" ? "font-semibold text-gray-900" : ""
                    }`}
                onClick={() => {
                    setStep("wards");
                    setSelectedWard(null);
                    setStations([]);
                }}
            >
                Wards
            </button>
            {selectedWard && <span>&gt;</span>}
            {selectedWard && (
                <span
                    className={
                        step === "stations" ? "font-semibold text-gray-900" : "text-gray-600"
                    }
                >
                    {selectedWard.ward_name}
                </span>
            )}
        </nav>
    );

    const renderWardsStep = () => (
        <section className="border border-gray-200 bg-white rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">
                    Step 1: Choose a Ward
                </h2>
                {loading && (
                    <span className="text-[0.7rem] text-gray-500">Loading…</span>
                )}
            </div>
            <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
                {wards.length === 0 && !loading && (
                    <div className="px-4 py-4 text-sm text-gray-500">
                        No wards found for this constituency.
                    </div>
                )}

                {wards.map((w) => (
                    <button
                        key={w.ward_id}
                        onClick={() => handleSelectWard(w)}
                        className="w-full text-left px-4 py-3 hover:bg-green-50 focus:bg-green-50 focus:outline-none"
                    >
                        <div className="font-medium text-gray-900">{w.ward_name}</div>
                    </button>
                ))}
            </div>
        </section>
    );

    const renderStationsStep = () => (
        <section className="border border-gray-200 bg-white rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-800">
                        Step 2: Polling Stations – Turnout
                    </h2>
                    {selectedWard && (
                        <p className="text-xs text-gray-500 mt-1">
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

                            // Default / fallback
                            let statusLabel = "No turnout reported";
                            let statusClasses =
                                "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-gray-200 text-gray-700";

                            // Prefer API-driven status if present
                            if (s.status && s.status_color) {
                                if (s.status === "good") {
                                    statusLabel = "On track";
                                } else if (s.status === "fair") {
                                    statusLabel = "Slightly behind";
                                } else if (s.status === "danger") {
                                    statusLabel = "Behind target";
                                } else if (s.status === "not_started") {
                                    statusLabel = "Polls not started";
                                } else if (s.status === "open") {
                                    statusLabel = "Open";
                                }

                                if (s.status_color === "green") {
                                    statusClasses =
                                        "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-green-600 text-white";
                                } else if (s.status_color === "yellow") {
                                    statusClasses =
                                        "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-yellow-400 text-gray-900";
                                } else if (s.status_color === "red") {
                                    statusClasses =
                                        "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-red-600 text-white";
                                } else if (s.status_color === "gray") {
                                    statusClasses =
                                        "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-gray-200 text-gray-700";
                                }
                            } else {
                                // Legacy fallback: simple logic
                                if (s.turn_out > 0) {
                                    statusLabel = "Reporting";
                                    statusClasses =
                                        "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-blue-600 text-white";
                                }

                                if (
                                    s.registered_voters > 0 &&
                                    s.turn_out >= s.registered_voters
                                ) {
                                    statusLabel = "Full turnout";
                                    statusClasses =
                                        "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-green-600 text-white";
                                }
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
                                        <span className={statusClasses}>{statusLabel}</span>
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
            <div className="p-6 max-w-4xl mx-auto space-y-4">
                {renderHeader()}

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
                        Error: {error}
                    </div>
                )}

                {renderBreadcrumb()}

                {step === "wards" && renderWardsStep()}
                {step === "stations" && selectedWard && renderStationsStep()}
            </div>
        </RequirePermission>
    );
};

export default TurnoutDrilldown;
