import { useEffect, useRef, useState } from "react";

type Status = "idle" | "connecting" | "connected" | "sharing" | "closed" | "error";

function dataUrlToBase64(dataUrl: string) {
    const idx = dataUrl.indexOf(",");
    return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

export default function GeminiScreenShareAgent() {
    const wsRef = useRef<WebSocket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const intervalRef = useRef<number | null>(null);

    const [status, setStatus] = useState<Status>("idle");
    const [log, setLog] = useState<string[]>([]);
    const [text, setText] = useState("");

    const push = (m: string) => setLog((p) => [...p, m]);

    async function connectLive() {
        setStatus("connecting");
        try {
            // Get ephemeral token from your PHP endpoint
            const { token } = await fetch("/API/gemini_live_token.php", { credentials: "include" }).then(r => r.json());
            if (!token) throw new Error("No ephemeral token returned");

            const ws = new WebSocket(
                "wss://generativelanguage.googleapis.com/ws/" +
                "google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent" +
                "?access_token=" + encodeURIComponent(token)
            );

            wsRef.current = ws;

            ws.onopen = () => {
                setStatus("connected");
                push("✅ Live connected");

                // Setup: enable TEXT responses; we will send SCREEN frames as inline data parts.
                ws.send(JSON.stringify({
                    setup: {
                        model: "gemini-2.0-flash-live-001",
                        generation_config: { response_modalities: ["TEXT"] }
                    }
                }));
            };

            ws.onmessage = (e) => push("⬅️ " + e.data);
            ws.onerror = () => { setStatus("error"); push("❌ WebSocket error"); };
            ws.onclose = () => { setStatus("closed"); push("🔌 Live closed"); wsRef.current = null; };
        } catch (err: any) {
            setStatus("error");
            push("❌ " + (err?.message || "Failed to connect"));
        }
    }

    async function startShare() {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            await connectLive();
            // wait a tick for ws to open
            await new Promise((r) => setTimeout(r, 300));
        }

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setStatus("sharing");
            push("🖥️ Screen sharing started");

            // Send frames every 800ms (adjust for cost/latency)
            intervalRef.current = window.setInterval(() => {
                sendFrame();
            }, 800);

            // Stop sharing if user stops from browser UI
            stream.getVideoTracks()[0].addEventListener("ended", stopShare);
        } catch (err: any) {
            setStatus("error");
            push("❌ Screen share failed: " + (err?.message || "unknown"));
        }
    }

    function stopShare() {
        if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;

        setStatus("connected");
        push("🛑 Screen sharing stopped");
    }

    function sendFrame() {
        const ws = wsRef.current;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !video || !canvas) return;

        const w = Math.max(640, Math.min(1280, video.videoWidth || 1280));
        const h = Math.round(w * ((video.videoHeight || 720) / (video.videoWidth || 1280)));

        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, w, h);

        // JPEG compress to reduce payload
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        const base64 = dataUrlToBase64(dataUrl);

        // Send image as inlineData. (If your endpoint expects different keys, we’ll tweak.)
        ws.send(JSON.stringify({
            realtime_input: {
                media_chunks: [{
                    mime_type: "image/jpeg",
                    data: base64
                }]
            }
        }));
    }

    function sendText() {
        const ws = wsRef.current;
        const msg = text.trim();
        if (!ws || ws.readyState !== WebSocket.OPEN || !msg) return;

        ws.send(JSON.stringify({
            client_content: {
                turns: [{ role: "user", parts: [{ text: msg }] }],
                turn_complete: true
            }
        }));

        push("➡️ " + msg);
        setText("");
    }

    function close() {
        stopShare();
        wsRef.current?.close();
        wsRef.current = null;
    }

    useEffect(() => {
        return () => close();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900">Screen-share Agent</h3>
                    <p className="text-[0.75rem] sm:text-xs text-gray-500">
                        Share your screen/tab showing the Form 34A, then ask the agent if everything looks okay.
                    </p>
                </div>

                <div className="flex gap-2">
                    {status === "idle" || status === "closed" || status === "error" ? (
                        <button
                            onClick={connectLive}
                            className="px-3 py-2 rounded-full bg-purple-600 text-white text-xs sm:text-sm hover:bg-purple-700"
                        >
                            Connect
                        </button>
                    ) : null}

                    {status !== "sharing" ? (
                        <button
                            onClick={startShare}
                            className="px-3 py-2 rounded-full border border-purple-300 text-purple-700 text-xs sm:text-sm hover:bg-purple-50"
                        >
                            Share screen
                        </button>
                    ) : (
                        <button
                            onClick={stopShare}
                            className="px-3 py-2 rounded-full border border-red-300 text-red-700 text-xs sm:text-sm hover:bg-red-50"
                        >
                            Stop share
                        </button>
                    )}

                    <button
                        onClick={close}
                        className="px-3 py-2 rounded-full border border-gray-300 text-gray-700 text-xs sm:text-sm hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* hidden capture pipeline */}
            <video ref={videoRef} className="hidden" playsInline />
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-2">
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder='Ask: "Do the candidate votes and totals look consistent?"'
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <button
                    onClick={sendText}
                    className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-black"
                >
                    Send
                </button>
            </div>

            <div className="bg-gray-900 text-gray-100 rounded-xl p-3 text-xs overflow-auto max-h-56">
                <div className="mb-2 opacity-80">Status: {status}</div>
                {log.length ? log.map((m, i) => (
                    <div key={i} className="whitespace-pre-wrap mb-1">{m}</div>
                )) : <div className="opacity-70">No messages yet.</div>}
            </div>
        </div>
    );
}
