export const cacheGet = (k: string) => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(k);
};

export const cacheSet = (k: string, v: unknown) => {
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
