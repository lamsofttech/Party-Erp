// src/utils/electionHelpers.ts
const PLACEHOLDER =
    "https://via.placeholder.com/300/607d8b/FFFFFF?text=No+Photo";

export const API_BASE = "https://skizagroundsuite.com/API";
export const ANALYTICS_ENDPOINT = `${API_BASE}/get_extensive_analytics.php`;

export const buildImgUrl = (path: string | null) =>
    path
        ? `https://skizagroundsuite.com/${path.startsWith("uploads/") ? "" : "uploads/"
        }${path}`
        : PLACEHOLDER;

export const percent = (part: number, total: number) =>
    total > 0 ? (part / total) * 100 : 0;

// small debounce hook
import { useEffect, useState } from "react";

export const useDebounced = <T,>(value: T, delay = 350) => {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
};
