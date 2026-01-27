import React, { useEffect, useMemo, useRef, useState } from "react";
import { GoogleGenAI, Modality } from "@google/genai";

type Props = {
    open: boolean;
    onClose: () => void;
    contextHint?: string;
};

type LiveMessage = any;

function base64FromArrayBuffer(buf: ArrayBuffer) {
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function pcm16ToFloat32(int16: Int16Array) {
    const f32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 32768;
    return f32;
}

async function startMicPcm16k(onChunk: (pcm16: Int16Array) => void) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new AudioContext(); // usually 48kHz
    const source = audioCtx.createMediaStreamSource(stream);

    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    source.connect(processor);
    processor.connect(audioCtx.destination);

    const inSampleRate = audioCtx.sampleRate;
    const targetRate = 16000;

    processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);

        // resample float32 -> 16k
        const ratio = inSampleRate / targetRate;
        const newLen = Math.floor(input.length / ratio);
        const resampled = new Float32Array(newLen);

        let pos = 0;
        for (let i = 0; i < newLen; i++) {
            const idx = Math.floor(pos);
            resampled[i] = input[idx] ?? 0;
            pos += ratio;
        }

        // float32 -> int16 PCM
        const pcm16 = new Int16Array(resampled.length);
        for (let i = 0; i < resampled.length; i++) {
            const s = Math.max(-1, Math.min(1, resampled[i]));
            pcm16[i] = s < 0 ? s * 32768 : s * 32767;
        }

        onChunk(pcm16);
    };

    return {
        stop: async () => {
            try {
                processor.disconnect();
                source.disconnect();
            } catch { }
            try {
                stream.getTracks().forEach((t) => t.stop());
            } catch { }
            try {
                await audioCtx.close();
            } catch { }
        },
    };
}

async function jpegBase64FromVideo(videoEl: HTMLVideoElement, maxW = 1024) {
    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;
    if (!w || !h) return null;

    const scale = Math.min(1, maxW / w);
    const cw = Math.floor(w * scale);
    const ch = Math.floor(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(videoEl, 0, 0, cw, ch);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
    const base64 = dataUrl.split(",")[1];
    return base64 || null;
}

const GeminiLiveSidecar: React.FC<Props> = ({ open, onClose, contextHint }) => {
    // ✅ Your server endpoint that provisions an ephemeral token
    const TOKEN_ENDPOINT = "/OCR/gemini_ephemeral_token.php";

    const [connected, setConnected] = useState(false);
    const [micOn, setMicOn] = useState(false);
    const [sharing, setSharing] = useState(false);

    const [status, setStatus] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const [transcript, setTranscript] = useState<
        Array<{ who: "you" | "gemini"; text: string }>
    >([]);

    const sessionRef = useRef<any>(null);
    const micStopRef = useRef<null | (() => Promise<void>)>(null);

    const screenStreamRef = useRef<MediaStream | null>(null);
    const screenVideoRef = useRef<HTMLVideoElement | null>(null);
    const frameTimerRef = useRef<number | null>(null);

    const audioOutCtxRef = useRef<AudioContext | null>(null);
    const audioOutQueueRef = useRef<number>(0);

    const model = useMemo(
        () => "gemini-2.5-flash-native-audio-preview-12-2025",
        []
    );

    const config = useMemo(
        () => ({
            responseModalities: [Modality.AUDIO, Modality.TEXT],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
            },
            outputAudioTranscription: {},
            inputAudioTranscription: {},
        }),
        []
    );

    async function playPcm24k(base64Pcm: string) {
        try {
            const bin = atob(base64Pcm);
            const buf = new ArrayBuffer(bin.length);
            const bytes = new Uint8Array(buf);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

            const pcm16 = new Int16Array(buf);
            const f32 = pcm16ToFloat32(pcm16);

            if (!audioOutCtxRef.current) {
                audioOutCtxRef.current = new AudioContext();
                audioOutQueueRef.current = audioOutCtxRef.current.currentTime;
            }

            const ctx = audioOutCtxRef.current;
            const audioBuffer = ctx.createBuffer(1, f32.length, 24000);
            audioBuffer.copyToChannel(f32, 0);

            const src = ctx.createBufferSource();
            src.buffer = audioBuffer;
            src.connect(ctx.destination);

            const startAt = Math.max(ctx.currentTime, audioOutQueueRef.current);
            src.start(startAt);
            audioOutQueueRef.current = startAt + audioBuffer.duration;
        } catch {
            // ignore
        }
    }

    // ✅ IMPORTANT: token provisioning is POST (your PHP is POST-only)
    async function fetchEphemeralToken(): Promise<string> {
        const res = await fetch(TOKEN_ENDPOINT, {
            method: "POST", // ✅ FIX: was GET (caused 405)
            credentials: "include", // ✅ sends cookies/session if your backend uses it
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",

                // OPTIONAL: if later you decide to protect token endpoint using your normal token
                // Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
                // "X-Token": localStorage.getItem("token") || "",
            },
            body: JSON.stringify({}), // keep non-empty JSON to avoid weird servers
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(
                data?.message ||
                data?.error ||
                `Token endpoint failed (${res.status})`
            );
        }

        if (!data?.token) {
            throw new Error("Token endpoint returned no token.");
        }

        return String(data.token);
    }

    async function connect() {
        setErr(null);
        setStatus("Connecting…");

        try {
            const ephemeralToken = await fetchEphemeralToken();

            // ✅ Use ephemeral token as apiKey
            const ai = new GoogleGenAI({ apiKey: ephemeralToken });

            const session = await ai.live.connect({
                model,
                config,
                callbacks: {
                    onopen: () => {
                        setStatus("Connected.");
                        setConnected(true);
                    },
                    onmessage: (message: LiveMessage) => {
                        const outT = message?.serverContent?.outputTranscription?.text;
                        if (typeof outT === "string" && outT.trim()) {
                            setTranscript((t) => [...t, { who: "gemini", text: outT }]);
                        }

                        const inT = message?.serverContent?.inputTranscription?.text;
                        if (typeof inT === "string" && inT.trim()) {
                            setTranscript((t) => [...t, { who: "you", text: inT }]);
                        }

                        if (typeof message?.text === "string" && message.text.trim()) {
                            setTranscript((t) => [...t, { who: "gemini", text: message.text }]);
                        }

                        if (typeof message?.data === "string" && message.data.length > 0) {
                            playPcm24k(message.data);
                        }
                    },
                    onerror: (e: any) => {
                        setErr(e?.message || "Live session error");
                        setStatus(null);
                        setConnected(false);
                    },
                    onclose: () => {
                        setStatus("Closed.");
                        setConnected(false);
                    },
                },
            });

            sessionRef.current = session;

            const primer = `
You are an assistant helping a user verify Kenya election Form 34A OCR results.
The user will share their screen and talk by voice. Please:
- Look at what is on screen
- Ask clarifying questions if something seems off
- Confirm candidate votes, rejected votes, registered voters (optional), and presiding officer name
- Keep responses short and practical
${contextHint ? "\nContext:\n" + contextHint : ""}
      `.trim();

            session.sendClientContent({ turns: primer, turnComplete: true });

            setStatus("Connected. Click Share Screen, then Start Mic.");
        } catch (e: any) {
            setErr(e?.message || "Failed to connect.");
            setStatus(null);
            setConnected(false);
            sessionRef.current = null;
        }
    }

    async function stopShare() {
        if (frameTimerRef.current) {
            window.clearInterval(frameTimerRef.current);
            frameTimerRef.current = null;
        }
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
        }
        setSharing(false);
    }

    async function stopMic() {
        if (micStopRef.current) {
            await micStopRef.current();
            micStopRef.current = null;
        }
        setMicOn(false);
        try {
            sessionRef.current?.sendRealtimeInput?.({ audioStreamEnd: true });
        } catch { }
    }

    async function disconnect() {
        setErr(null);
        setStatus("Closing…");

        await stopShare();
        await stopMic();

        try {
            sessionRef.current?.close?.();
        } catch { }
        sessionRef.current = null;

        setConnected(false);
        setStatus(null);
    }

    async function startShare() {
        setErr(null);
        if (!sessionRef.current) {
            setErr("Connect first.");
            return;
        }

        try {
            const stream = await (navigator.mediaDevices as any).getDisplayMedia({
                video: true,
                audio: false,
            });

            screenStreamRef.current = stream;
            setSharing(true);

            const video = screenVideoRef.current!;
            video.srcObject = stream;
            await video.play();

            frameTimerRef.current = window.setInterval(async () => {
                if (!sessionRef.current || !screenVideoRef.current) return;

                const base64Jpeg = await jpegBase64FromVideo(screenVideoRef.current, 1024);
                if (!base64Jpeg) return;

                sessionRef.current.sendRealtimeInput({
                    video: { data: base64Jpeg, mimeType: "image/jpeg" },
                });
            }, 800);

            const [track] = stream.getVideoTracks();
            track.onended = () => stopShare();
        } catch (e: any) {
            setErr(e?.message || "Screen share failed.");
        }
    }

    async function startMic() {
        setErr(null);
        if (!sessionRef.current) {
            setErr("Connect first.");
            return;
        }

        try {
            const mic = await startMicPcm16k((pcm16) => {
                if (!sessionRef.current) return;

                const base64 = base64FromArrayBuffer(pcm16.buffer);

                sessionRef.current.sendRealtimeInput({
                    audio: { data: base64, mimeType: "audio/pcm;rate=16000" },
                });
            });

            micStopRef.current = mic.stop;
            setMicOn(true);
        } catch (e: any) {
            setErr(e?.message || "Mic start failed.");
        }
    }

    async function sendText(text: string) {
        if (!sessionRef.current) return;
        sessionRef.current.sendClientContent({ turns: text, turnComplete: true });
        setTranscript((t) => [...t, { who: "you", text }]);
    }

    useEffect(() => {
        if (!open) disconnect().catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            <div className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-xl flex flex-col">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                    <div>
                        <div className="font-semibold text-gray-900 text-sm">
                            AI Help (Screen + Voice)
                        </div>
                        <div className="text-[0.72rem] text-gray-500">
                            Share screen and speak; Gemini replies with audio.
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-xs px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    {err && (
                        <div className="text-xs text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded">
                            {err}
                        </div>
                    )}
                    {status && (
                        <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2 rounded">
                            {status}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        {!connected ? (
                            <button
                                onClick={connect}
                                className="text-xs px-3 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Connect
                            </button>
                        ) : (
                            <button
                                onClick={disconnect}
                                className="text-xs px-3 py-2 rounded-full bg-gray-900 text-white hover:bg-gray-800"
                            >
                                Disconnect
                            </button>
                        )}

                        <button
                            onClick={sharing ? stopShare : startShare}
                            disabled={!connected}
                            className="text-xs px-3 py-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                            {sharing ? "Stop Share" : "Share Screen"}
                        </button>

                        <button
                            onClick={micOn ? stopMic : startMic}
                            disabled={!connected}
                            className="text-xs px-3 py-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                            {micOn ? "Stop Mic" : "Start Mic"}
                        </button>
                    </div>

                    <div className="rounded-lg border border-gray-200 overflow-hidden bg-black">
                        <video
                            ref={screenVideoRef}
                            className="w-full h-[200px] object-contain"
                            muted
                        />
                    </div>

                    <TextBox onSend={sendText} disabled={!connected} />

                    <div className="border rounded-lg p-3 h-[240px] overflow-auto bg-gray-50">
                        {transcript.length === 0 ? (
                            <div className="text-xs text-gray-500">
                                Tip: Click <b>Share Screen</b>, then <b>Start Mic</b>, then speak:
                                <br />
                                “Check if these votes match the form. Anything inconsistent?”
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {transcript.map((t, i) => (
                                    <div key={i} className="text-xs">
                                        <span
                                            className={
                                                t.who === "you"
                                                    ? "text-gray-900 font-semibold"
                                                    : "text-green-700 font-semibold"
                                            }
                                        >
                                            {t.who === "you" ? "You" : "Gemini"}:
                                        </span>{" "}
                                        <span className="text-gray-800">{t.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="text-[0.7rem] text-gray-500 leading-relaxed">
                        Using ephemeral token from <b>{TOKEN_ENDPOINT}</b>.
                    </div>
                </div>
            </div>
        </div>
    );
};

const TextBox: React.FC<{ disabled?: boolean; onSend: (t: string) => void }> = ({
    disabled,
    onSend,
}) => {
    const [val, setVal] = useState("");
    return (
        <div className="flex gap-2">
            <input
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder="Type a message (optional)…"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-xs"
                disabled={disabled}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        const t = val.trim();
                        if (!t) return;
                        onSend(t);
                        setVal("");
                    }
                }}
            />
            <button
                disabled={disabled || !val.trim()}
                onClick={() => {
                    const t = val.trim();
                    if (!t) return;
                    onSend(t);
                    setVal("");
                }}
                className="text-xs px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
                Send
            </button>
        </div>
    );
};

export default GeminiLiveSidecar;
