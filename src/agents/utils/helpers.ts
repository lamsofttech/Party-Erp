import type { BillingStatus } from "./types";

export function normBillingStatus(v?: string): BillingStatus {
    const x = String(v ?? "").toLowerCase().trim();
    if (x === "pending" || x === "billed" || x === "paid") return x;
    return "unknown";
}

export function pickFirst<T = any>(obj: any, keys: string[], fallback?: any): T {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
    }
    return fallback as T;
}

export function normalizeListResponse(json: any): any[] {
    if (Array.isArray(json?.data)) return json.data;
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.results)) return json.results;
    return [];
}

export function needsParam(errMsg: string, param: string) {
    const m = (errMsg || "").toLowerCase();
    return m.includes(param.toLowerCase()) && (m.includes("required") || m.includes("must"));
}
