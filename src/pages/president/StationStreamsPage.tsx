import React, { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { RequirePermission } from "../../components/RequirePermission";
import { useParams, useLocation, useNavigate } from "react-router-dom";

/* ====================== TYPES ======================= */

interface StreamSummary {
    stream_id: number;
    stream_name: string;
    station_id: number;
    has_form: boolean;
    status: "draft" | "submitted" | "reviewed" | "locked" | "rejected" | null;
}

/* ====================== PAGE ======================= */

const StationStreamsPage: React.FC = () => {
    const { user, token } = useUser();
    const { stationId } = useParams<{ stationId: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    // We expect the dashboard to pass the station name in route state:
    // navigate(`/president/station/${station.id}`, { state: { stationName: station.name } })
    const stationName =
        (location.state as any)?.stationName ||
        (location.state as any)?.name ||
        `Station #${stationId}`;

    const [streams, setStreams] = useState<StreamSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const constituencyName =
        user?.constituency_name ||
        user?.county_name ||
        `Constituency ${user?.scope_constituency_id ?? ""}`;

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

    /* ============ FETCH STREAMS FOR THIS STATION ============ */

    useEffect(() => {
        if (!stationId) return;

        const fetchStreams = async () => {
            try {
                setError(null);
                setLoading(true);
                setStreams([]);

                const { headers, effectiveToken } = buildAuth();
                const params = new URLSearchParams();
                params.set("station_id", String(stationId));
                if (effectiveToken) params.set("token", effectiveToken);

                // If your existing endpoint still expects position/form_type,
                // you can uncomment these two lines and hard–code them:
                // params.set("position", "PRESIDENT");
                // params.set("form_type", "34A");

                const res = await fetch(
                    "/API/results-summary-streams.php?" + params.toString(),
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
                        "Forbidden: you are not allowed to view streams for this station."
                    );
                }
                if (!res.ok || data.status === "error") {
                    throw new Error(
                        data.message || data.error || "Failed to fetch streams."
                    );
                }

                const rows: StreamSummary[] = (data.data || []).map((st: any) => ({
                    stream_id: Number(st.stream_id ?? st.id),
                    stream_name:
                        String(st.stream_name ?? st.name ?? "") ||
                        `Stream ${st.stream_no ?? ""}`,
                    station_id: Number(st.station_id ?? stationId),
                    has_form: Boolean(st.has_form ?? st.has_results ?? false),
                    status: (st.status ?? null) as StreamSummary["status"],
                }));

                setStreams(rows);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to fetch streams.");
            } finally {
                setLoading(false);
            }
        };

        fetchStreams();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stationId, token]);

    /* ============ HANDLERS ============ */

    const handleOpenStream = (stream: StreamSummary) => {
        // This should match your router:
        // path="president/results/34a/:stationId/:streamId"
        navigate(`/president/results/34a/${stream.station_id}/${stream.stream_id}`, {
            state: {
                stationId: stream.station_id,
                streamId: stream.stream_id,
                stationName,
                streamName: stream.stream_name,
            },
        });
    };

    const handleCardKeyDown = (
        e: React.KeyboardEvent<HTMLDivElement>,
        stream: StreamSummary
    ) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpenStream(stream);
        }
    };

    /* ====================== RENDER ======================= */

    return (
        <RequirePermission permission="results34a.view">
            <div className="px-3 py-4 sm:p-6 max-w-4xl mx-auto space-y-4">
                {/* Header */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                            {stationName}
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-600">
                            Scope:{" "}
                            <span className="font-semibold">{constituencyName}</span>
                        </p>
                        <p className="text-[0.7rem] sm:text-xs text-gray-500 mt-1 max-w-md">
                            Tap a stream below to upload Form 34A, run OCR and confirm
                            results for that specific stream.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate(-1)}
                        className="self-start text-[0.7rem] sm:text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                    >
                        ← Back
                    </button>
                </header>

                {error && (
                    <div className="text-xs sm:text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
                        Error: {error}
                    </div>
                )}

                {/* Streams list */}
                <section className="border border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-xs sm:text-sm font-semibold text-gray-800">
                            Streams for this polling station
                        </h2>
                        {loading && (
                            <span className="text-[0.65rem] text-gray-500">
                                Loading…
                            </span>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
                        {streams.length === 0 && !loading && (
                            <div className="px-4 py-4 text-xs sm:text-sm text-gray-500">
                                No streams found for this station.
                            </div>
                        )}

                        {streams.map((st) => {
                            const reported =
                                st.has_form ||
                                st.status === "submitted" ||
                                st.status === "reviewed" ||
                                st.status === "locked";

                            return (
                                <div
                                    key={st.stream_id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleOpenStream(st)}
                                    onKeyDown={(e) => handleCardKeyDown(e, st)}
                                    className="px-4 py-3 sm:py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                                >
                                    <div className="min-w-0">
                                        <div className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                            {st.stream_name || `Stream #${st.stream_id}`}
                                        </div>
                                        <div className="mt-1 text-[0.7rem] sm:text-xs text-gray-500 flex items-center gap-2">
                                            <span
                                                className={
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold " +
                                                    (reported
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-yellow-50 text-yellow-800")
                                                }
                                            >
                                                {reported ? "Reported" : "Pending"}
                                            </span>
                                            {st.status && (
                                                <span className="text-[0.65rem] text-gray-500">
                                                    ({st.status})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="ml-3 flex items-center text-[0.7rem] sm:text-xs text-blue-600 font-medium">
                                        <span className="hidden sm:inline">
                                            {reported
                                                ? "View / Update"
                                                : "Upload 34A & Enter"}
                                        </span>
                                        <span className="sm:hidden">Open</span>
                                        <span className="ml-1">›</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </RequirePermission>
    );
};

export default StationStreamsPage;
