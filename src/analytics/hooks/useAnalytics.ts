// src/analytics/hooks/useAnalytics.ts
import { useEffect, useMemo, useState } from 'react';
import { ANALYTICS_ENDPOINT } from '../config';
import type { CandidateResult, CountyResult, ConstituencyResult, FiltersState } from '../types';

export const useAnalytics = () => {
    const [national, setNational] = useState<CandidateResult[]>([]);
    const [counties, setCounties] = useState<CountyResult[]>([]);
    const [constits, setConstits] = useState<ConstituencyResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch(ANALYTICS_ENDPOINT);
            if (!res.ok) throw new Error(`Failed to fetch results: ${res.status}`);
            const json = await res.json();
            if (json.status !== 'success') throw new Error(json.message || 'Invalid data format from server');
            setNational(json.national_results);
            setCounties(json.county_results);
            setConstits(json.constituency_results);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAnalytics(); }, []);
    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(fetchAnalytics, 10000);
        return () => clearInterval(id);
    }, [autoRefresh]);

    const totalNationalVotes = useMemo(
        () => national.reduce((sum, r) => sum + Number(r.total_votes), 0),
        [national]
    );
    const parties = useMemo(
        () => Array.from(new Set(national.map((c) => c.party_name).filter(Boolean))).sort(),
        [national]
    );

    return {
        state: { national, counties, constits, loading, error, lastUpdated, autoRefresh, totalNationalVotes, parties },
        actions: { setAutoRefresh, refetch: fetchAnalytics },
    };
};

// helpers to derive sorted/filtered rows (keep logic near data)
export const sortAndFilter = {
    counties: (rows: CountyResult[], filters: FiltersState, normalizedQuery: string) => {
        let copy = [...rows];
        if (normalizedQuery) copy = copy.filter(r => r.county_name.toLowerCase().includes(normalizedQuery));
        if (filters.includeRejected === 'with') copy = copy.filter(r => Number(r.rejected_votes) > 0);
        if (filters.includeRejected === 'without') copy = copy.filter(r => Number(r.rejected_votes) === 0);
        copy.sort((a, b) => {
            switch (filters.sortBy) {
                case 'votes_asc': return Number(a.total_votes) - Number(b.total_votes);
                case 'rejected_desc': return Number(b.rejected_votes) - Number(a.rejected_votes);
                case 'name_asc': return a.county_name.localeCompare(b.county_name);
                default: return Number(b.total_votes) - Number(a.total_votes);
            }
        });
        return copy;
    },
    constits: (rows: ConstituencyResult[], filters: FiltersState, normalizedQuery: string) => {
        let copy = [...rows];
        if (normalizedQuery) copy = copy.filter(r =>
            r.constituency_name.toLowerCase().includes(normalizedQuery) || r.county_name.toLowerCase().includes(normalizedQuery)
        );
        if (filters.includeRejected === 'with') copy = copy.filter(r => Number(r.rejected_votes) > 0);
        if (filters.includeRejected === 'without') copy = copy.filter(r => Number(r.rejected_votes) === 0);
        copy.sort((a, b) => {
            switch (filters.sortBy) {
                case 'votes_asc': return Number(a.total_votes) - Number(b.total_votes);
                case 'rejected_desc': return Number(b.rejected_votes) - Number(a.rejected_votes);
                case 'name_asc': return a.constituency_name.localeCompare(b.constituency_name);
                default: return Number(b.total_votes) - Number(a.total_votes);
            }
        });
        return copy;
    },
};
