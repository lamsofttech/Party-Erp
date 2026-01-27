const API_BASE = "/API";
export const GEO_BASE = API_BASE;

export const safeJson = async (res: Response) => {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Non-JSON response from", res.url, "=>", text);
        return null;
    }
};

export const fetchWithTimeout = async (
    url: string,
    timeoutMs = 12000,
    init?: RequestInit
) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        return await fetch(url, {
            ...init,
            signal: ctrl.signal,
            credentials: "include",
        });
    } finally {
        clearTimeout(t);
    }
};

export { API_BASE };
