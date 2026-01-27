import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { useUser } from "../contexts/UserContext";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

// ✅ Torch icons (toggle)
import FlashlightOnIcon from "@mui/icons-material/FlashlightOn";
import FlashlightOffIcon from "@mui/icons-material/FlashlightOff";

const BRAND_RED = "#F5333F";
const CARD_CREAM = "#FFF6EC";

type ResultsStatus = "NOT_SUBMITTED" | "PENDING" | "ACCEPTED" | "NEEDS_CORRECTION";
type TurnoutStatus = "NONE" | "PARTIAL" | "FINAL";

// ✅ Presence is a simple toggle now
type PresenceState = "OFF" | "SAVING" | "ON" | "ERROR";

// ✅ CHANGE this to your real backend endpoint (GET or POST).
// If you already have an endpoint, replace only this string.
const PRESENCE_ENDPOINT =
    (import.meta as any)?.env?.VITE_API_BASE_URL
        ? `${(import.meta as any).env.VITE_API_BASE_URL}/agent_presence.php`
        : "https://skizagroundsuite.com/API/agent_presence.php";

/**
 * Sends presence toggle to backend.
 * - present=true  => agent is at station (torch ON)
 * - present=false => agent left station (torch OFF)
 */
async function postAgentPresenceToggle(payload: {
    station_id: string | number;
    agent_id?: string | number | null;
    agent_name?: string | null;
    polling_station_name?: string | null;
    county?: string;
    constituency?: string;
    ward?: string;
    present: boolean;
    device_time_iso: string;
}) {
    // Default: POST JSON. If your backend is GET, tell me and I’ll adjust.
    const { data } = await axios.post(PRESENCE_ENDPOINT, payload, { timeout: 20000 });

    // Flexible success detection
    if (!(data?.status === "success" || data?.ok === true || data?.success === true)) {
        throw new Error(data?.message || "Failed to update presence");
    }
    return data;
}

export default function AgentLandingPage() {
    const { user } = useUser();
    const navigate = useNavigate();

    const county = user?.county_name ?? (user as any)?.county ?? "-";
    const constituency = user?.constituency_name ?? (user as any)?.constituency ?? "-";
    const ward = user?.ward_name ?? (user as any)?.ward ?? "-";
    const stationName = (user as any)?.polling_station_name ?? "Polling station not set";

    const stationId: string | number | null =
        (user as any)?.polling_station_id ?? (user as any)?.station_id ?? null;

    const agentId: string | number | null = (user as any)?.id ?? (user as any)?.user_id ?? null;
    const agentName: string | null = (user as any)?.full_name ?? (user as any)?.name ?? null;

    const [resultsStatus, setResultsStatus] = useState<ResultsStatus>("NOT_SUBMITTED");
    const [turnoutStatus] = useState<TurnoutStatus>("NONE");
    const [openIncidents] = useState<number>(0);

    // ✅ Presence toggle (torch)
    const [presenceState, setPresenceState] = useState<PresenceState>("OFF");
    const [presenceError, setPresenceError] = useState<string | null>(null);

    useEffect(() => {
        if (stationName && stationName !== "Polling station not set") {
            document.title = stationName;
        } else {
            document.title = "Agent – Polling Station";
        }
    }, [stationName]);

    useEffect(() => {
        if (!stationId) return;
        const key = `results_submitted_${stationId}`;
        const isSubmitted = localStorage.getItem(key) === "1";
        setResultsStatus(isSubmitted ? "ACCEPTED" : "NOT_SUBMITTED");
    }, [stationId]);

    // ✅ Load saved presence (torch state)
    useEffect(() => {
        if (!stationId) return;
        const key = `agent_present_${stationId}`;
        const isPresent = localStorage.getItem(key) === "1";
        setPresenceState(isPresent ? "ON" : "OFF");
    }, [stationId]);

    const resultsStatusLabel = {
        NOT_SUBMITTED: "Not submitted",
        PENDING: "Pending verification",
        ACCEPTED: "Results submitted",
        NEEDS_CORRECTION: "Needs correction",
    }[resultsStatus];

    const turnoutStatusLabel = {
        NONE: "No updates",
        PARTIAL: "Partial updates",
        FINAL: "Final turnout sent",
    }[turnoutStatus];

    const resultsCardDisabled = resultsStatus === "ACCEPTED";

    const handleResultsClick = () => {
        if (resultsCardDisabled) return;
        navigate("/agent/results", { state: { autoOpenEnter: true } });
    };

    const goToTurnoutGame = () => {
        if (!stationId) return;

        navigate(`/turnout/${stationId}`, {
            state: {
                station: {
                    id: String(stationId),
                    name: stationName,
                    county,
                    constituency,
                    ward,
                },
            },
        });
    };

    // ✅ Toggle torch ON/OFF and notify backend
    const togglePresence = async () => {
        if (!stationId) {
            setPresenceState("ERROR");
            setPresenceError("Station not assigned. Contact your supervisor.");
            return;
        }

        setPresenceError(null);

        const isCurrentlyOn = presenceState === "ON";
        const nextPresent = !isCurrentlyOn;

        // optimistic UI
        setPresenceState("SAVING");

        try {
            await postAgentPresenceToggle({
                station_id: stationId,
                agent_id: agentId,
                agent_name: agentName,
                polling_station_name: stationName,
                county,
                constituency,
                ward,
                present: nextPresent,
                device_time_iso: new Date().toISOString(),
            });

            localStorage.setItem(`agent_present_${stationId}`, nextPresent ? "1" : "0");
            setPresenceState(nextPresent ? "ON" : "OFF");
        } catch (e: any) {
            // revert (keep previous state)
            setPresenceState(isCurrentlyOn ? "ON" : "OFF");
            setPresenceError(e?.message || "Failed to update presence");
        }
    };

    const torchOn = presenceState === "ON";
    const torchSaving = presenceState === "SAVING";

    return (
        <main
            className="min-h-screen text-white pt-4 pb-6 px-3 sm:px-5"
            style={{ backgroundColor: BRAND_RED }}
        >
            <div className="mx-auto w-full max-w-md space-y-4 sm:space-y-6">
                {/* Header */}
                <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/80">
                            Polling station agent view
                        </p>

                        {/* ✅ Station + Torch toggle (icon turns green when ON) */}
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold leading-tight truncate">{stationName}</h1>

                            <button
                                type="button"
                                onClick={togglePresence}
                                disabled={torchSaving}
                                className={[
                                    "shrink-0 rounded-full border border-white/30 p-1.5 transition-all",
                                    torchOn ? "bg-emerald-500/25" : "bg-white/10",
                                    torchSaving ? "opacity-70 cursor-wait" : "active:scale-[0.98]",
                                ].join(" ")}
                                title={torchOn ? "Present at station" : "Left station"}
                                aria-label={torchOn ? "Present at station" : "Left station"}
                            >
                                {torchOn ? (
                                    <FlashlightOnIcon sx={{ color: "#16a34a", fontSize: 22 }} />
                                ) : (
                                    <FlashlightOffIcon sx={{ color: "#e5e7eb", fontSize: 22 }} />
                                )}
                            </button>
                        </div>

                        <p className="text-[11px] text-white/85 truncate">
                            {ward} • {constituency} • {county}
                        </p>

                        {/* Optional tiny error line (only shows if backend fails) */}
                        {presenceError && (
                            <p className="text-[10px] text-yellow-200/95 mt-1">{presenceError}</p>
                        )}
                    </div>

                    <Badge
                        variant="outline"
                        className="rounded-full border-white/70 bg-white/15 px-3 py-1 text-[10px]"
                    >
                        Agent
                    </Badge>
                </header>

                {/* Info strip */}
                <section className="text-[10px] text-white/85 bg-black/10 rounded-2xl px-3 py-2 flex items-center justify-between">
                    <span>Today: submit results here only.</span>
                </section>

                {/* Main actions – 3 big cards */}
                <section className="space-y-3 mt-1">
                    {/* 1. Submit Results */}
                    <Card
                        role={resultsCardDisabled ? "group" : "button"}
                        tabIndex={resultsCardDisabled ? -1 : 0}
                        onClick={handleResultsClick}
                        onKeyDown={(e) => !resultsCardDisabled && e.key === "Enter" && handleResultsClick()}
                        className={[
                            "rounded-3xl border-0 shadow-[0_10px_30px_rgba(0,0,0,0.18)] p-4 flex items-center justify-between gap-3 transition-transform",
                            resultsCardDisabled
                                ? "opacity-60 cursor-not-allowed"
                                : "active:scale-[0.99] cursor-pointer",
                        ].join(" ")}
                        style={{ backgroundColor: CARD_CREAM }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="h-11 w-11 rounded-2xl flex items-center justify-center text-xl"
                                style={{ backgroundColor: "#FCE4E7" }}
                            >
                                📄
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    {resultsCardDisabled ? "Results Submitted" : "Submit Results"}
                                </h2>
                                <p className="text-[11px] text-slate-700 leading-snug">
                                    {resultsCardDisabled
                                        ? "Your Form 34A results are in. Contact your coordinator to request payment."
                                        : "Upload the official form and enter final tallies for this station."}
                                </p>
                            </div>
                        </div>
                        <Badge className="bg-white text-slate-900 border border-red-100 text-[10px] whitespace-nowrap">
                            {resultsStatusLabel}
                        </Badge>
                    </Card>

                    {/* 2. Voter Turnout */}
                    <Card
                        role="button"
                        tabIndex={0}
                        onClick={goToTurnoutGame}
                        onKeyDown={(e) => e.key === "Enter" && goToTurnoutGame()}
                        className={[
                            "rounded-3xl border-0 shadow-[0_10px_30px_rgba(0,0,0,0.18)] p-4 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform",
                            !stationId ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
                        ].join(" ")}
                        style={{ backgroundColor: CARD_CREAM }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="h-11 w-11 rounded-2xl flex items-center justify-center text-xl"
                                style={{ backgroundColor: "#FFE7C2" }}
                            >
                                📊
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">Voter Turnout</h2>
                                <p className="text-[11px] text-slate-700 leading-snug">
                                    Report current or final turnout numbers during the day.
                                </p>
                                {!stationId && (
                                    <p className="text-[10px] text-red-600 mt-1">
                                        Station not assigned. Contact your supervisor.
                                    </p>
                                )}
                            </div>
                        </div>
                        <Badge className="bg-white text-slate-900 border border-amber-100 text-[10px] whitespace-nowrap">
                            {turnoutStatusLabel}
                        </Badge>
                    </Card>

                    {/* 3. Incident Reporting */}
                    <Card
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate("/agent/incidents")}
                        onKeyDown={(e) => e.key === "Enter" && navigate("/agent/incidents")}
                        className="rounded-3xl border-0 shadow-[0_10px_30px_rgba(0,0,0,0.18)] p-4 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
                        style={{ backgroundColor: CARD_CREAM }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="h-11 w-11 rounded-2xl flex items-center justify-center text-xl"
                                style={{ backgroundColor: "#FFF4C2" }}
                            >
                                ⚠️
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">Report Incident</h2>
                                <p className="text-[11px] text-slate-700 leading-snug">
                                    Log problems like violence, bribery, or equipment failure.
                                </p>
                            </div>
                        </div>
                        <div className="text-right text-[10px] text-slate-700">
                            <div>Open incidents</div>
                            <div className="font-semibold text-slate-900">{openIncidents}</div>
                        </div>
                    </Card>
                </section>

                <footer className="pt-2 text-center text-[10px] text-white/80">
                    If you&apos;re unsure what to do, contact your supervisor or hotline.
                </footer>
            </div>
        </main>
    );
}
