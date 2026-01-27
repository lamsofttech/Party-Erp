// src/types/results.ts

export type StationResultEntry = {
    candidateId: string; // ✅ unify as string
    votes: number;
};

export type StationResultDraft = {
    stationId: string; // ✅ unify as string
    entries: StationResultEntry[];
    submitted?: boolean;
};

export type Form34BEntry = {
    candidateId: string; // ✅ unify as string
    votes: number;
};

export type Form34BResultDraft = {
    constituencyId: string; // ✅ unify as string
    entries: Form34BEntry[];
    totalValid?: number;
    submitted?: boolean;
};
