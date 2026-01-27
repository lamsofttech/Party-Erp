// src/lib/api.ts
// ===============================================
// API PATHS (works in dev & production)
// ===============================================

// Your PHP lives at: /API/api/*.php
export const API_ROOT = "/API";
export const API_BASE = `${API_ROOT}/api`;     // => "/API/api"
export const USERS_BASE = API_BASE;            // => "/API/api"
export const GEO_BASE = API_ROOT;              // => "/API"

/**
 * ===============================================
 * safeJson
 * Safely parse JSON from a fetch Response.
 * Returns null instead of throwing on empty/invalid JSON.
 * ===============================================
 */
export const safeJson = async <T = any>(res: Response): Promise<T | null> => {
    const text = await res.text();
    if (!text) return null as any;

    try {
        return JSON.parse(text) as T;
    } catch (e) {
        console.error("Non-JSON response from", res.url, "=>", text);
        return null;
    }
};

/**
 * ===============================================
 * fetchWithTimeout
 * Adds timeout + always includes cookies (credentials)
 * ===============================================
 */
export const fetchWithTimeout = async (
    url: string,
    timeoutMs = 12000,
    init?: RequestInit
) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            ...init,
            signal: controller.signal,
            credentials: "include",
        });
        return res;
    } finally {
        clearTimeout(timer);
    }
};

/**
 * ===============================================
 * GET JSON helper
 *
 * Usage:
 *    getJSON("/roles.php", { headers: { Authorization: `Bearer ${token}` } })
 * ===============================================
 */
export const getJSON = async <T = any>(
    path: string,
    init: RequestInit = {}
): Promise<T | null> => {
    const url = path.startsWith("http")
        ? path
        : `${API_BASE}${path}`;   // => "/API/api" + "/roles.php"

    const res = await fetchWithTimeout(url, 12000, {
        ...init,
        method: "GET",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
            `GET ${url} failed: ${res.status} ${res.statusText} – ${text}`
        );
    }

    return safeJson<T>(res);
};

/**
 * ===============================================
 * POST JSON helper
 *
 * Usage:
 *    postJSON("/users.php", body, {
 *       headers: { Authorization: `Bearer ${token}` }
 *    })
 * ===============================================
 */
export const postJSON = async <T = any>(
    path: string,
    body: any,
    init: RequestInit = {}
): Promise<T | null> => {
    const url = path.startsWith("http")
        ? path
        : `${API_BASE}${path}`;

    const res = await fetchWithTimeout(url, 12000, {
        ...init,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(init.headers || {}),
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
            `POST ${url} failed: ${res.status} ${res.statusText} – ${text}`
        );
    }

    return safeJson<T>(res);
};
