// src/utils/storage.ts

/* ============================================================================
   TYPES
============================================================================ */

export type Candidate = {
    id: string | number;
    name: string;
    party?: string;
};

export type PollingStation = {
    id: string | number;
    name: string;
    code?: string;

    // IDs (canonical)
    constituencyId?: string | number;

    // Optional display fields (used by Form34A UI)
    county?: string;
    constituency?: string; // name/label
    ward?: string;

    // Optional station meta used in UI
    registeredVoters?: number;
};

export type Constituency = {
    id: string | number;
    name: string;
    code?: string;
};

export type StationResultDraft = {
    // Keep flexible for now to avoid breaking callers, but many places should String() it when needed
    stationId: string | number;

    formType?: "34A";

    // Candidate vote entries
    entries: { candidateId: string | number; votes: number }[];

    // Totals & validation-related fields (used by Enter/View Form34A)
    totalValid?: number;
    totalVotes?: number;

    // These are the names your UI is using
    rejectedVotes?: number;
    disputedVotes?: number;
    spoiltVotes?: number;

    registeredVoters?: number;

    // Extra metadata fields used in your UI / payload
    stationName?: string;
    county?: string;
    constituency?: string;
    ward?: string;

    presidingOfficer?: string;
    form34ARef?: string;
    remarks?: string;

    pollingDate?: string; // ISO date string (e.g. "2026-01-21")
    openingTime?: string; // "HH:MM"
    closingTime?: string; // "HH:MM"

    agentsSigned?: string;
    agentsRefused?: string;
    refusalReasons?: string;

    submitted?: boolean;
    lastSavedAt?: number;

    // Backwards-compatible fields (older drafts)
    rejected?: number; // legacy: some old code may write this
    disputed?: boolean; // legacy: old boolean flag

    // Prefer ISO string timestamps for consistency
    updatedAt: string; // ISO string
};

export type Form34BResultDraft = {
    // Canonical ID (use this; replace any constituencyCode usage in UI with constituencyId)
    constituencyId: string | number;

    formType?: "34B";

    // Candidate vote entries
    entries: { candidateId: string | number; votes: number }[];

    // Optional geo/code fields used by EnterForm34B UI
    countyCode?: string | number;

    // Totals & validation-related fields used by EnterForm34B
    totalValid?: number;

    // UI uses this name
    rejectedVotes?: number | string;

    // Extra metadata fields used in UI / payload
    returningOfficer?: string;
    form34BRef?: string;
    remarks?: string;

    // Backend reference / existing record id (optional)
    form34bId?: string | number;

    // Draft status + timestamps
    submitted?: boolean;
    lastSavedAt?: number;

    // Backwards-compatible legacy field (older drafts may have this)
    rejected?: number;

    // Prefer ISO string timestamps for consistency
    updatedAt: string; // ISO string
};

/* ============================================================================
   STORAGE HELPERS
============================================================================ */

export function cacheSet<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
}

export function fromCache<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function cacheRemove(key: string): void {
    localStorage.removeItem(key);
}

export function cacheClear(): void {
    localStorage.clear();
}

/* ============================================================================
   DRAFT HELPERS
============================================================================ */

export function writeDraft<T>(key: string, data: T): void {
    localStorage.setItem(key, JSON.stringify(data));
}

export function readDraft<T>(key: string): T | null {
    return fromCache<T>(key);
}

export function clearDraft(key: string): void {
    localStorage.removeItem(key);
}

/* ============================================================================
   DRAFT KEYS (shared across app)
============================================================================ */

export const DRAFT_KEYS = {
    // NOTE: Form34A is station-specific in your components, so prefer using form34AForStation().
    // These constants remain for compatibility with any existing code.
    form34A: "draft:form34A",
    form34B: "draft:form34B",

    // Prefix to build station-specific keys:
    form34AStationPrefix: "draft:form34A:",
} as const;

/* ============================================================================
   FORM-SPECIFIC CONVENIENCE WRAPPERS
============================================================================ */

// Station-specific key builder (recommended)
export function form34AForStation(stationId: string | number): string {
    return `${DRAFT_KEYS.form34AStationPrefix}${String(stationId)}`;
}

/**
 * Legacy single-key writers/readers (kept for backward compatibility).
 * If your UI uses station-specific drafts, use write34ADraftForStation/read34ADraftForStation instead.
 */
export function write34ADraft(data: StationResultDraft): void {
    writeDraft(DRAFT_KEYS.form34A, data);
}

export function read34ADraft(): StationResultDraft | null {
    return readDraft<StationResultDraft>(DRAFT_KEYS.form34A);
}

export function clear34ADraft(): void {
    clearDraft(DRAFT_KEYS.form34A);
}

// Recommended station-specific wrappers
export function write34ADraftForStation(stationId: string | number, data: StationResultDraft): void {
    writeDraft(form34AForStation(stationId), data);
}

export function read34ADraftForStation(stationId: string | number): StationResultDraft | null {
    return readDraft<StationResultDraft>(form34AForStation(stationId));
}

export function clear34ADraftForStation(stationId: string | number): void {
    clearDraft(form34AForStation(stationId));
}

export function write34BDraft(data: Form34BResultDraft): void {
    writeDraft(DRAFT_KEYS.form34B, data);
}

export function read34BDraft(): Form34BResultDraft | null {
    return readDraft<Form34BResultDraft>(DRAFT_KEYS.form34B);
}

export function clear34BDraft(): void {
    clearDraft(DRAFT_KEYS.form34B);
}
