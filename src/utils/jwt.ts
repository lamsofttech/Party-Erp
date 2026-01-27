// src/utils/jwt.ts

export interface JwtUserFromCookie {
    role: string | null;
    is_agent: boolean;
    assigned_polling_station_id: string | null;
    county_id: number | null;
    constituency_id: number | null;
    ward_id: number | null;
    county_name: string | null;
    constituency_name: string | null;
    ward_name: string | null;
}

/* ===================== JWT helpers (cookie) ===================== */

function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(
        new RegExp(
            "(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"
        )
    );
    return match ? decodeURIComponent(match[1]) : null;
}

export function getUserFromJwtCookie(): JwtUserFromCookie | null {
    if (typeof document === "undefined") return null;
    const token = getCookie("token");
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const pad = base64.length % 4;
        if (pad) base64 += "=".repeat(4 - pad);
        const json = atob(base64);
        const payload = JSON.parse(json);
        const u = payload.user_data ?? payload;
        return {
            role: u.role ? String(u.role).toUpperCase() : null,
            is_agent: !!u.is_agent,
            assigned_polling_station_id: u.assigned_polling_station_id
                ? String(u.assigned_polling_station_id)
                : null,
            county_id:
                typeof u.county_id === "number" ? u.county_id : u.county_id ?? null,
            constituency_id:
                typeof u.constituency_id === "number"
                    ? u.constituency_id
                    : u.constituency_id ?? null,
            ward_id:
                typeof u.ward_id === "number" ? u.ward_id : u.ward_id ?? null,
            county_name: u.county_name ?? u.county ?? null,
            constituency_name: u.constituency_name ?? u.constituency ?? null,
            ward_name: u.ward_name ?? u.ward ?? null,
        };
    } catch {
        return null;
    }
}
