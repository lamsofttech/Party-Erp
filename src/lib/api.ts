// src/lib/api.ts
/* ============================================================
   Shared API utilities (NO React / NO JSX)
   ============================================================ */

/**
 * ✅ You can override these in env later if you want:
 * Vite: VITE_USERS_API_BASE / VITE_API_BASE / VITE_GEO_BASE
 * CRA:  REACT_APP_USERS_API_BASE / REACT_APP_API_BASE / REACT_APP_GEO_BASE
 */
const ENV: any =
    (typeof import.meta !== "undefined" && (import.meta as any).env) ||
    (typeof process !== "undefined" && (process as any).env) ||
    {};

export const USERS_BASE =
    ENV.VITE_USERS_API_BASE ||
    ENV.REACT_APP_USERS_API_BASE ||
    "https://skizagroundsuite.com/API/api";

export const API_BASE =
    ENV.VITE_API_BASE ||
    ENV.REACT_APP_API_BASE ||
    "https://skizagroundsuite.com/API/api";

export const GEO_BASE =
    ENV.VITE_GEO_BASE ||
    ENV.REACT_APP_GEO_BASE ||
    "https://skizagroundsuite.com/API";

/* =========================
   Types
   ========================= */

export interface User {
    id: string;
    username: string;
    email: string;
    name: string;
    role: string;

    county_code?: string | null;
    county_name?: string | null;
    constituency_code?: string | null;
    constituency_name?: string | null;
    ward_code?: string | null;
    ward_name?: string | null;

    polling_station_id?: string | null;
    polling_station_name?: string | null;

    created_by_name?: string | null;
}

export interface Permission {
    permission_id: number;
    permission_name: string;
    action: string;
    assigned: boolean;
}

export interface RoleModule {
    module: string;
    permissions: Permission[];
}

export interface County {
    id: string; // county_code
    name: string; // county_name
    code: string; // county_code
}

export interface Constituency {
    id: string; // const_code
    name: string; // constituency_name
    county_code: string;
}

export interface Ward {
    id: string; // ward_code
    name: string; // ward_name
    const_code: string;
}

export interface PollingStation {
    id: string; // polling_station_id
    name: string; // polling_station_name
    ward_code: string;
}

export type ApiStatus = "success" | "error";

export type ApiResponse<T> = {
    status?: ApiStatus;
    message?: string;
    data?: T;
    // some endpoints return different shapes:
    user?: User;
    temp_password?: string;
    modules?: RoleModule[];
};

/* =========================
   Helpers
   ========================= */

/**
 * Safe URL builder: prevents double slashes and path issues.
 */
const buildUrl = (base: string, path: string) => {
    const b = base.endsWith("/") ? base : `${base}/`;
    const p = path.startsWith("/") ? path.slice(1) : path;
    return new URL(p, b).toString();
};

/**
 * Safe JSON parser that also returns raw text (useful for debugging PHP errors).
 */
export const safeJson = async <T = any>(
    res: Response
): Promise<{ json: T | null; raw: string }> => {
    const raw = await res.text();
    if (!raw) return { json: null, raw: "" };
    try {
        return { json: JSON.parse(raw) as T, raw };
    } catch (e) {
        // keep this console for debugging server issues
        console.error("Non-JSON response from", res.url, "=>", raw);
        return { json: null, raw };
    }
};

/**
 * Fetch with timeout + credentials include (for cookies)
 */
export const fetchWithTimeout = async (
    url: string,
    timeoutMs = 12000,
    init?: RequestInit
) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            ...init,
            signal: ctrl.signal,
            credentials: "include", // ✅ send cookies (token) cross-site
        });
        return res;
    } finally {
        clearTimeout(t);
    }
};

const cacheGet = (k: string) => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(k);
};

const cacheSet = (k: string, v: unknown) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(k, JSON.stringify(v));
};

export const fromCache = <T,>(k: string): T | null => {
    if (typeof window === "undefined") return null;
    const raw = cacheGet(k);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

/**
 * ✅ Auth headers (very compatible)
 * Many PHP backends expect token in different places.
 * We send multiple common variants at once.
 */
export const toAuthHeaders = (token: string) => ({
    // common patterns:
    Authorization: `Bearer ${token}`,
    "X-Authorization": `Bearer ${token}`,

    // raw token headers:
    "X-Access-Token": token,
    "X-Auth-Token": token,
    "x-auth-token": token,

    // some APIs use api-key header for tokens:
    "X-Api-Key": token,
    "x-api-key": token,

    // plain token header:
    token: token,

    Accept: "application/json",
});

/**
 * Debug helper: logs the HTTP status + parsed JSON message when server says "Missing token." / "Server error occurred."
 */
const debugApi = (
    label: string,
    res: Response,
    raw: string,
    json: any,
    token?: string
) => {
    console.log(`[${label}]`, {
        url: res.url,
        http: res.status,
        ok: res.ok,
        tokenPresent: !!token,
        tokenLen: token?.length ?? 0,
        json,
        rawPreview: raw?.slice(0, 300),
    });
};

/* ============================================================
   API calls (Users + Roles)
   IMPORTANT: include credentials: "include" on protected endpoints
   so HttpOnly cookie token can be sent as well.
   ============================================================ */

export async function apiGetUsers(token: string, signal?: AbortSignal) {
    const headers = toAuthHeaders(token);

    // Try 1: GET users.php with token in query too (common PHP)
    {
        const url = buildUrl(
            USERS_BASE,
            `users.php?token=${encodeURIComponent(token)}`
        );
        const res = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers,
            signal,
        });

        const { json, raw } = await safeJson<ApiResponse<User[]>>(res);
        debugApi("users:GET?token", res, raw, json, token);

        if (res.ok && json?.status === "success" && Array.isArray(json?.data)) {
            return { res, json };
        }
    }

    // Try 2: GET users.php?action=list + token in query
    {
        const url = buildUrl(
            USERS_BASE,
            `users.php?action=list&token=${encodeURIComponent(token)}`
        );
        const res = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers,
            signal,
        });

        const { json, raw } = await safeJson<ApiResponse<User[]>>(res);
        debugApi("users:GET?action=list&token", res, raw, json, token);

        if (res.ok && json?.status === "success" && Array.isArray(json?.data)) {
            return { res, json };
        }
    }

    // Try 3: POST users.php with action + token in body
    {
        const url = buildUrl(USERS_BASE, "users.php");
        const res = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify({ action: "list", token }),
            signal,
        });

        const { json, raw } = await safeJson<ApiResponse<User[]>>(res);
        debugApi("users:POST{action:list,token}", res, raw, json, token);

        return { res, json };
    }
}

export type CreateUserPayload = {
    email: string;
    name: string;
    role: string;

    // jurisdiction
    county_id?: string;
    constituency_id?: string;
    ward_id?: string;
    polling_station_id?: string;

    // diaspora
    country_id?: string;

    // assignments
    can_transmit?: boolean;
    positions?: number[];
};

export async function apiCreateUser(token: string, payload: CreateUserPayload) {
    const res = await fetch(buildUrl(USERS_BASE, "users.php"), {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...toAuthHeaders(token),
        },
        // include token in body too for compatibility
        body: JSON.stringify({ ...payload, token }),
    });

    const { json } = await safeJson<ApiResponse<User>>(res);
    return { res, json };
}

export async function apiDeleteUser(token: string, id: string) {
    // include token in query as well for compatibility
    const url = buildUrl(
        USERS_BASE,
        `users.php?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`
    );

    const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
        headers: toAuthHeaders(token),
    });

    const { json } = await safeJson<ApiResponse<null>>(res);
    return { res, json };
}

export async function apiUpdateUserRole(token: string, id: string, role: string) {
    // include token in query as well for compatibility
    const url = buildUrl(
        API_BASE,
        `user_roles.php?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`
    );

    const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...toAuthHeaders(token),
        },
        body: JSON.stringify({ role: role.toUpperCase(), token }),
    });

    const { json } = await safeJson<ApiResponse<null>>(res);
    return { res, json };
}

export async function apiGetRoleModules(token: string, role: string) {
    // include token in query as well for compatibility
    const url = buildUrl(
        API_BASE,
        `get_role_modules.php?role=${encodeURIComponent(
            role.toUpperCase()
        )}&token=${encodeURIComponent(token)}`
    );

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: toAuthHeaders(token),
    });

    const { json } = await safeJson<ApiResponse<RoleModule[]>>(res);
    return { res, json };
}

/* ============================================================
   Geo endpoints (Counties / Constituencies / Wards / Stations)
   These are typically public; we already include credentials via fetchWithTimeout.
   ============================================================ */

export async function apiGetCounties() {
    const cacheKey = "counties:v1";
    const cached = fromCache<any>(cacheKey);
    if (cached) return cached;

    const res = await fetchWithTimeout(buildUrl(GEO_BASE, "get_counties.php"));
    const { json } = await safeJson<any>(res);
    if (json) cacheSet(cacheKey, json);
    return json;
}

export async function apiGetConstituencies(countyCode: string) {
    const cacheKey = `constituencies:${countyCode}:v1`;
    const cached = fromCache<any>(cacheKey);
    if (cached) return cached;

    const res = await fetchWithTimeout(
        buildUrl(
            GEO_BASE,
            `get_constituencies.php?county_code=${encodeURIComponent(countyCode)}`
        )
    );
    const { json } = await safeJson<any>(res);
    if (json) cacheSet(cacheKey, json);
    return json;
}

export async function apiGetWards(constCode: string) {
    const cacheKey = `wards:${constCode}:v1`;
    const cached = fromCache<any>(cacheKey);
    if (cached) return cached;

    const res = await fetchWithTimeout(
        buildUrl(GEO_BASE, `get_wards.php?const_code=${encodeURIComponent(constCode)}`)
    );
    const { json } = await safeJson<any>(res);
    if (json) cacheSet(cacheKey, json);
    return json;
}

export async function apiGetPollingStationsForWard(wardCode: string) {
    const cacheKey = `pollingStations:${wardCode}:v1`;
    const cached = fromCache<any>(cacheKey);
    if (cached) return cached;

    const res = await fetchWithTimeout(
        buildUrl(
            GEO_BASE,
            `get_polling_stations_for_roles.php?ward_code=${encodeURIComponent(wardCode)}`
        )
    );
    const { json } = await safeJson<any>(res);
    if (json) cacheSet(cacheKey, json);
    return json;
}
