import React, { useMemo, useState } from "react";
import { useGeminiLiveAgent } from "./useGeminiLiveAgent";

type Candidate = { name: string; votes: number };

interface GeminiLiveAgentProps {
    stationId: number;
    streamId: number;
    stationLabel?: string;
    streamLabel?: string;

    // current figures on the page
    candidates: Candidate[];
    rejectedVotes: number;
    registeredVoters?: number | null;
    presidingOfficer?: string | null;

    // optional: allow page to trigger actions after agent advice
    onSuggestFixes?: (suggestion: any) => void;
}

const GeminiLiveAgent: React.FC<GeminiLiveAgentProps> = ({
    stationId,
    streamId,
    stationLabel,
    streamLabel,
    candidates,
    rejectedVotes,
    registeredVoters,
    presidingOfficer,
    onSuggestFixes,
}) => {
    const agent = useGeminiLiveAgent();

    const [prompt, setPrompt] = useState("");
    const [autoSendOnConnect, setAutoSendOnConnect] = useState(true);

    const figuresPayload = useMemo(() => {
        return {
            station_id: stationId,
            stream_id: streamId,
            candidates: candidates.map((c) => ({
                name: c.name,
                votes: Number.isFinite(c.votes) ? Math.max(0, Math.floor(c.votes)) : 0,
            })),
            rejected_votes: Number.isFinite(rejectedVotes)
                ? Math.max(0, Math.floor(rejectedVotes))
                : 0,
            registered_voters:
                registeredVoters === null || registeredVoters === undefined
                    ? null
                    : Math.max(0, Math.floor(registeredVoters)),
            presiding_officer: presidingOfficer || null,
        };
    }, [stationId, streamId, candidates, rejectedVotes, registeredVoters, presidingOfficer]);

    const defaultAsk = useMemo(() => {
        return (
            `You are an election results assistant. Your job is to sanity-check Form 34A OCR figures.\n` +
            `- Identify anomalies (zeros, unusually high values, missing candidates).\n` +
            `- Compare totals if possible and ask clarifying questions if needed.\n` +
            `- If something looks suspicious, call flag_for_review with a clear reason.\n` +
            `- If numbers look plausible, call validate_figures for totals and return a short checklist.\n\n` +
            `Station: ${stationLabel || stationId}\n` +
            `Stream: ${streamLabel || streamId}\n` +
            `Figures (JSON):\n` +
            `${JSON.stringify(figuresPayload, null, 2)}\n`
        );
    }, [figuresPayload, stationLabel, streamLabel, stationId, streamId]);

    const toolsSetup = useMemo(() => {
        return {
            model: "gemini-2.0-flash-live-001",
            generation_config: { response_modalities: ["TEXT"] },
            tools: [
                {
                    function_declarations: [
                        {
                            name: "validate_figures",
                            description:
                                "Validate totals and sanity-check extracted Form 34A figures; return totals and notes.",
                            parameters: {
                                type: "object",
                                properties: {
                                    candidates: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                name: { type: "string" },
                                                votes: { type: "integer" },
                                            },
                                            required: ["name", "votes"],
                                        },
                                    },
                                    rejected_votes: { type: "integer" },
                                    registered_voters: { type: ["integer", "null"] },
                                    station_id: { type: "integer" },
                                    stream_id: { type: "integer" },
                                },
                                required: ["candidates", "rejected_votes", "station_id", "stream_id"],
                            },
                        },
                        {
                            name: "flag_for_review",
                            description:
                                "Flag this station/stream for manual review when OCR looks suspicious or inconsistent.",
                            parameters: {
                                type: "object",
                                properties: {
                                    reason: { type: "string" },
                                    station_id: { type: "integer" },
                                    stream_id: { type: "integer" },
                                },
                                required: ["reason", "station_id", "stream_id"],
                            },
                        },
                        {
                            name: "suggest_fixes",
                            description:
                                "Propose fixes to the extracted figures (e.g., candidate votes corrections). Use only when confident.",
                            parameters: {
                                type: "object",
                                properties: {
                                    suggestions: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                candidate_name: { type: "string" },
                                                suggested_votes: { type: "integer" },
                                                reason: { type: "string" },
                                            },
                                            required: ["candidate_name", "suggested_votes", "reason"],
                                        },
                                    },
                                    rejected_votes: { type: ["integer", "null"] },
                                    registered_voters: { type: ["integer", "null"] },
                                    reason_summary: { type: "string" },
                                },
                                required: ["suggestions", "reason_summary"],
                            },
                        },
                    ],
                },
            ],
        };
    }, []);

    const handleConnect = async () => {
        await agent.connect(toolsSetup);

        if (autoSendOnConnect) {
            // Ask the agent to review figures immediately
            agent.sendUserText(defaultAsk);

            // Encourage tool usage with explicit instruction
            agent.sendUserText(
                `If you find anomalies, call flag_for_review({reason, station_id:${stationId}, stream_id:${streamId}}).\n` +
                `Otherwise call validate_figures with candidates + rejected_votes + station_id + stream_id.\n`
            );
        }
    };

    const handleAsk = () => {
        const text = prompt.trim() || defaultAsk;
        agent.sendUserText(text);
        setPrompt("");
    };

    const handleAskValidateTool = () => {
        agent.sendUserText(
            `Call validate_figures with this payload:\n` +
            `${JSON.stringify(
                {
                    station_id: stationId,
                    stream_id: streamId,
                    candidates: figuresPayload.candidates,
                    rejected_votes: figuresPayload.rejected_votes,
                    registered_voters: figuresPayload.registered_voters,
                },
                null,
                2
            )}`
        );
    };

    const handleAskFlag = () => {
        agent.sendUserText(
            `If anything seems inconsistent, call flag_for_review({` +
            `"reason":"OCR figures need manual review (please specify exact anomaly)",` +
            `"station_id":${stationId},"stream_id":${streamId}}).`
        );
    };

    const handleAskFixes = () => {
        agent.sendUserText(
            `If you are confident about any corrections, call suggest_fixes with proposed votes and a reason per change.\n` +
            `Use only when you can justify from typical Form 34A patterns; otherwise do NOT guess.`
        );
    };

    const handleApplyLastFixes = () => {
        // This is optional: if you choose to parse the latest messages for suggest_fixes output
        // you can implement this in your hook and expose lastToolResult.
        if (!agent.lastToolResult) return;

        if (agent.lastToolResult.name !== "suggest_fixes") return;

        onSuggestFixes?.(agent.lastToolResult.response);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                        Gemini Live Agent
                    </h3>
                    <p className="text-[0.75rem] sm:text-xs text-gray-500 max-w-xl">
                        Use the agent to sanity-check OCR figures and trigger actions (validate/flag). This
                        does not submit results automatically unless you add a submit tool.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {agent.status !== "connected" ? (
                        <button
                            type="button"
                            onClick={handleConnect}
                            disabled={agent.status === "connecting"}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-purple-600 text-white text-[0.8rem] sm:text-sm font-semibold hover:bg-purple-700 disabled:opacity-60"
                        >
                            {agent.status === "connecting" ? "Connecting…" : "Start Agent"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={agent.close}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-purple-300 text-purple-700 text-[0.8rem] sm:text-sm hover:bg-purple-50"
                        >
                            Stop
                        </button>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <input
                    id="autoSend"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={autoSendOnConnect}
                    onChange={(e) => setAutoSendOnConnect(e.target.checked)}
                />
                <label htmlFor="autoSend" className="text-[0.75rem] sm:text-xs text-gray-600">
                    Auto-send figures for validation on connect
                </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={handleAskValidateTool}
                    disabled={agent.status !== "connected"}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-300 text-[0.8rem] sm:text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                >
                    Ask agent to validate totals
                </button>

                <button
                    type="button"
                    onClick={handleAskFlag}
                    disabled={agent.status !== "connected"}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-300 text-[0.8rem] sm:text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                >
                    Ask agent to flag if suspicious
                </button>

                <button
                    type="button"
                    onClick={handleAskFixes}
                    disabled={agent.status !== "connected"}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-300 text-[0.8rem] sm:text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                >
                    Ask agent for suggested fixes
                </button>

                <button
                    type="button"
                    onClick={handleApplyLastFixes}
                    disabled={agent.status !== "connected" || !agent.lastToolResult}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-300 text-[0.8rem] sm:text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                >
                    Apply last fixes (optional)
                </button>
            </div>

            <div className="space-y-2">
                <label className="block text-[0.75rem] sm:text-xs text-gray-600">
                    Ask the agent (optional)
                </label>
                <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[0.8rem] sm:text-sm"
                    rows={4}
                    placeholder="Type a question to Gemini…"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={agent.status !== "connected"}
                />
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleAsk}
                        disabled={agent.status !== "connected"}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-gray-900 text-white text-[0.8rem] sm:text-sm font-semibold hover:bg-black disabled:opacity-60"
                    >
                        Send
                    </button>
                </div>
            </div>

            <div className="bg-gray-900 text-gray-100 rounded-xl p-3 text-xs overflow-auto max-h-56">
                <div className="mb-2 opacity-80">Status: {agent.status}</div>
                {agent.messages.length === 0 ? (
                    <div className="opacity-70">No messages yet.</div>
                ) : (
                    agent.messages.map((m, i) => (
                        <div key={i} className="whitespace-pre-wrap mb-1">
                            {m}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default GeminiLiveAgent;
