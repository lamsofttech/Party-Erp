import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type PartyTheme = {
    primary: string;
    primaryDark: string;
    secondary: string;

    sidebarGradTop: string;
    sidebarGradMid: string;
    sidebarGradBottom: string;

    sidebarInk: string;
    sidebarMuted: string;
    sidebarBorder: string;

    logoUrl?: string;
    partyName?: string;
};

const DEFAULT_THEME: PartyTheme = {
    primary: "#F5333F",
    primaryDark: "#C4202C",
    secondary: "#FF6B6B",

    sidebarGradTop: "#F5333F",
    sidebarGradMid: "#E62C38",
    sidebarGradBottom: "#B81826",

    sidebarInk: "rgba(255,255,255,0.92)",
    sidebarMuted: "rgba(255,255,255,0.68)",
    sidebarBorder: "rgba(255,255,255,0.12)",

    logoUrl: "https://placehold.co/40x40/F5333F/FFFFFF?text=Logo",
    partyName: "GEN Z POLITICAL PARTY",
};

type Ctx = {
    theme: PartyTheme;
    setTheme: (t: PartyTheme) => void;
    resetTheme: () => void;
};

const PartyThemeContext = createContext<Ctx | null>(null);

function applyCssVars(t: PartyTheme) {
    const r = document.documentElement;
    r.style.setProperty("--brand-primary", t.primary);
    r.style.setProperty("--brand-primary-dark", t.primaryDark);
    r.style.setProperty("--brand-secondary", t.secondary);

    r.style.setProperty("--sidebar-top", t.sidebarGradTop);
    r.style.setProperty("--sidebar-mid", t.sidebarGradMid);
    r.style.setProperty("--sidebar-bottom", t.sidebarGradBottom);

    r.style.setProperty("--sidebar-ink", t.sidebarInk);
    r.style.setProperty("--sidebar-muted", t.sidebarMuted);
    r.style.setProperty("--sidebar-border", t.sidebarBorder);
}

export function PartyThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<PartyTheme>(() => {
        const raw = localStorage.getItem("party_theme");
        return raw ? (JSON.parse(raw) as PartyTheme) : DEFAULT_THEME;
    });

    const setTheme = (t: PartyTheme) => {
        setThemeState(t);
        localStorage.setItem("party_theme", JSON.stringify(t));
    };

    const resetTheme = () => setTheme(DEFAULT_THEME);

    useEffect(() => {
        applyCssVars(theme);
    }, [theme]);

    const value = useMemo(() => ({ theme, setTheme, resetTheme }), [theme]);

    return <PartyThemeContext.Provider value={value}>{children}</PartyThemeContext.Provider>;
}

export function usePartyTheme() {
    const ctx = useContext(PartyThemeContext);
    if (!ctx) throw new Error("usePartyTheme must be used within PartyThemeProvider");
    return ctx;
}
