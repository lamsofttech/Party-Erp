// src/types/form34a.ts

export interface StationResultDraft {
    // vote fields
    disputedVotes?: number;
    spoiltVotes?: number;

    // polling metadata
    pollingDate?: string;   // "YYYY-MM-DD" from <input type="date" />
    openingTime?: string;   // "HH:MM" from <input type="time" />
    closingTime?: string;   // "HH:MM" from <input type="time" />

    // agents info
    agentsSigned?: string;      // if you're storing counts, change to number
    agentsRefused?: string;     // if you're storing counts, change to number
    refusalReasons?: string;

    // IMPORTANT:
    // Add any other properties your draft already uses (candidates array, station id, etc.)
    // so TS doesn't start complaining about those next.
    [key: string]: unknown; // optional escape hatch; remove if you want strict typing
}
