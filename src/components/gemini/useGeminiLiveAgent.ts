import { useRef, useState } from "react";

type AgentStatus = "idle" | "connecting" | "connected" | "closed" | "error";

interface ToolResult {
    name: string;
    response: any;
}

export function useGeminiLiveAgent() {
    const wsRef = useRef<WebSocket | null>(null);

    const [status, setStatus] = useState<AgentStatus>("idle");
    const [messages, setMessages] = useState<string[]>([]);
    const [lastToolResult, setLastToolResult] = useState<ToolResult | null>(null);

    const push = (msg: string) =>
        setMessages((prev) => [...prev, msg]);

    async function connect(setupPayload: any) {
        if (wsRef.current) return;

        setStatus("connecting");

        // 1️⃣ Fetch ephemeral token from PHP backend
        const res = await fetch("/API/gemini_live_token.php", {
            credentials: "include",
        });
        const data = await res.json();

        if (!data?.token) {
            setStatus("error");
            throw new Error("Failed to fetch Gemini live token");
        }

        // 2️⃣ Open WebSocket to Gemini Live API
        const ws = new WebSocket(
            "wss://generativelanguage.googleapis.com/ws/" +
            "google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent" +
            "?access_token=" +
            encodeURIComponent(data.token)
        );

        wsRef.current = ws;

        ws.onopen = () => {
            setStatus("connected");
            ws.send(JSON.stringify({ setup: setupPayload }));
            push("✅ Gemini Live connected");
        };

        ws.onmessage = async (event) => {
            const raw = event.data as string;
            push("⬅️ " + raw);

            let msg: any;
            try {
                msg = JSON.parse(raw);
            } catch {
                return;
            }

            // 🔹 Try to detect tool calls (shape varies slightly)
            const toolCall =
                msg?.tool_call ||
                msg?.toolCall ||
                msg?.serverContent?.toolCall ||
                msg?.server_content?.tool_call;

            if (toolCall?.name) {
                const payload = {
                    name: toolCall.name,
                    args: toolCall.args || toolCall.arguments || {},
                };

                // 3️⃣ Execute tool on your backend
                const toolRes = await fetch("/API/gemini_agent_actions.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(payload),
                });

                const toolData = await toolRes.json();
                setLastToolResult({ name: toolCall.name, response: toolData });

                // 4️⃣ Send tool response back to Gemini
                ws.send(
                    JSON.stringify({
                        tool_response: {
                            name: toolCall.name,
                            response: toolData,
                        },
                    })
                );

                push("➡️ tool_response: " + JSON.stringify(toolData));
            }
        };

        ws.onerror = () => {
            setStatus("error");
            push("❌ WebSocket error");
        };

        ws.onclose = () => {
            setStatus("closed");
            wsRef.current = null;
            push("🔌 Gemini Live disconnected");
        };
    }

    function sendUserText(text: string) {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        ws.send(
            JSON.stringify({
                client_content: {
                    turns: [
                        {
                            role: "user",
                            parts: [{ text }],
                        },
                    ],
                    turn_complete: true,
                },
            })
        );

        push("➡️ " + text);
    }

    function close() {
        wsRef.current?.close();
        wsRef.current = null;
    }

    return {
        status,
        messages,
        connect,
        sendUserText,
        close,
        lastToolResult,
    };
}
