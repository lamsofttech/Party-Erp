// src/types/election.ts

export interface CandidateResult {
    candidate_id: number;
    candidate_name: string;
    party_name: string;
    total_votes: number;
    photo_path: string | null;
}

export interface CountyResult {
    county_name: string;
    county_code: string;
    total_votes: number;
    rejected_votes: number;
}

export interface ConstituencyResult {
    constituency_name: string;

    // ✅ matches TabulatedView.tsx usage: row.const_code
    const_code: string;

    county_name: string;

    // ✅ fixes TS2551: TabulatedView.tsx uses row.county_code
    county_code: string;

    total_votes: number;
    rejected_votes: number;
}

export type IncludeRejected = "all" | "with" | "without";

export type SortBy = "votes_desc" | "votes_asc" | "rejected_desc" | "name_asc";

export interface FiltersState {
    query: string;
    parties: string[];
    includeRejected: IncludeRejected;
    sortBy: SortBy;

    countyCode: string | null;
    constituencyCode: string | null;
    wardCode: string | null;
    stationId: string | null;
}
