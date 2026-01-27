// src/lib/api.ts
/* ============================================================
   Shared API utilities (NO React / NO JSX)
   ============================================================ */

export const USERS_BASE = "https://skizagroundsuite.com/API/api";
export const API_BASE = "https://skizagroundsuite.com/API/api";
export const GEO_BASE = "https://skizagroundsuite.com/API";

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

export const safeJson = async <T = any>(res: Response): Promise<T | null> => {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text) as T;
    } catch (e) {
        // keep this console for debugging server issues
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
        const res = await fetch(url, {
            ...init,
            signal: ctrl.signal,
            credentials: "include",
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

export const toAuthHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
});

/* ============================================================
   API calls (Users + Roles)
   ============================================================ */

export async function apiGetUsers(token: string, signal?: AbortSignal) {
    const res = await fetch(`${USERS_BASE}/users.php`, {
        method: "GET",
        headers: toAuthHeaders(token),
        signal,
    });

    const json = await safeJson<ApiResponse<User[]>>(res);
    return { res, json };
}

export type CreateUserPayload = {
    email: string;
    name: string;
    role: string;
    county_id?: string;
    constituency_id?: string;
    ward_id?: string;
    polling_station_id?: string;
};

export async function apiCreateUser(token: string, payload: CreateUserPayload) {
    const res = await fetch(`${USERS_BASE}/users.php`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...toAuthHeaders(token),
        },
        body: JSON.stringify(payload),
    });

    const json = await safeJson<ApiResponse<User>>(res);
    return { res, json };
}

export async function apiDeleteUser(token: string, id: string) {
    const res = await fetch(
        `${USERS_BASE}/users.php?id=${encodeURIComponent(id)}`,
        {
            method: "DELETE",
            headers: toAuthHeaders(token),
        }
    );

    const json = await safeJson<ApiResponse<null>>(res);
    return { res, json };
}

export async function apiUpdateUserRole(
    token: string,
    id: string,
    role: string
) {
    const res = await fetch(
        `${API_BASE}/user_roles.php?id=${encodeURIComponent(id)}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...toAuthHeaders(token),
            },
            body: JSON.stringify({ role: role.toUpperCase() }),
        }
    );

    const json = await safeJson<ApiResponse<null>>(res);
    return { res, json };
}

export async function apiGetRoleModules(token: string, role: string) {
    const res = await fetch(
        `${API_BASE}/get_role_modules.php?role=${encodeURIComponent(
            role.toUpperCase()
        )}`,
        {
            method: "GET",
            headers: toAuthHeaders(token),
        }
    );

    const json = await safeJson<ApiResponse<null>>(res);
    return { res, json };
}

/* ============================================================
   Geo endpoints (Counties / Constituencies / Wards / Stations)
   ============================================================ */

export async function apiGetCounties() {
    const cacheKey = "counties:v1";
    const cached = fromCache<any>(cacheKey);
    if (cached) return cached;

    const res = await fetchWithTimeout(`${GEO_BASE}/get_counties.php`);
    const json = await safeJson<any>(res);
    if (json) cacheSet(cacheKey, json);
    return json;
}

export async function apiGetConstituencies(countyCode: string) {
    const cacheKey = `constituencies:${countyCode}:v1`;
    const cached = fromCache<any>(cacheKey);
    if (cached) return cached;

    const res = await fetchWithTimeout(
        `${GEO_BASE}/get_constituencies.php?county_code=${encodeURIComponent(
            countyCode
        )}`
    );
    const json = await safeJson<any>(res);
    if (json) cacheSet(cacheKey, json);
    return json;
}

export async function apiGetWards(constCode: string) {
    const cacheKey = `wards:${constCode}:v1`;
    const cached = fromCache<any>(cacheKey);
    if (cached) return cached;

    const res = await fetchWithTimeout(
        `${GEO_BASE}/get_wards.php?const_code=${encodeURIComponent(constCode)}`
    );
    const json = await safeJson<any>(res);
    if (json) cacheSet(cacheKey, json);
    return json;
}

export async function apiGetPollingStationsForWard(wardCode: string) {
    const cacheKey = `pollingStations:${wardCode}:v1`;
    const cached = fromCache<any>(cacheKey);
    if (cached) return cached;

    const res = await fetchWithTimeout(
        `${GEO_BASE}/get_polling_stations_for_roles.php?ward_code=${encodeURIComponent(
            wardCode
        )}`
    );
    const json = await safeJson<any>(res);
    if (json) cacheSet(cacheKey, json);
    return json;
}
