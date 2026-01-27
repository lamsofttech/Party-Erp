// src/analytics/AnalyticsDashboard.tsx
import React, { useMemo, useState } from "react";
import {
    Box,
    Container,
    CssBaseline,
    Typography,
    Stack,
    Button,
    Divider,
    CircularProgress,
    Alert as MuiAlert,
    Grid,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { Link } from "react-router-dom";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import { darkTheme } from "./theme";
import { DEFAULT_FILTERS } from "./utils";
import type { FiltersState } from "./types";
import FiltersBar from "../components/FiltersBar";
import NationalOverview from "./components/NationalOverview";
import GeoSection from "./components/GeoSection";
import { useAnalytics, sortAndFilter } from "./hooks/useAnalytics";
import { motion, AnimatePresence } from "framer-motion";

/**
 * The exact filters shape FiltersBar expects (per your TS error).
 */
type UIFilters = {
    query: string;
    parties: string[];
    includeRejected: "include" | "all" | "exclude";
    sortBy: "votes_desc" | "votes_asc";
};

const normalizeSortBy = (v: unknown): UIFilters["sortBy"] => {
    if (v === "votes_asc" || v === "votes_desc") return v;
    return "votes_desc";
};

/**
 * Map legacy FiltersState.includeRejected -> UIFilters.includeRejected
 * Your compile error shows FiltersState uses a different union (RejectedFilter)
 * that *doesn't* include "include". Common legacy values are "with"/"without".
 */
const toUIIncludeRejected = (v: unknown): UIFilters["includeRejected"] => {
    // UI-native
    if (v === "include" || v === "all" || v === "exclude") return v;

    // legacy possibilities
    if (v === "with") return "include";
    if (v === "without") return "exclude";

    return "exclude";
};

/**
 * Map UIFilters.includeRejected -> legacy FiltersState.includeRejected
 * IMPORTANT: because your FiltersState doesn't accept "include",
 * we map back to "with" (legacy include) by default.
 */
const fromUIIncludeRejected = (v: UIFilters["includeRejected"]): unknown => {
    // If your legacy type uses:
    // - "with" meaning include rejected
    // - "all" meaning include both (?) or no filter
    // - "without" meaning exclude rejected
    // This mapping matches that intent.
    if (v === "include") return "with";
    if (v === "exclude") return "without";
    return "all";
};

/**
 * Convert DEFAULT_FILTERS into FiltersState (app state) safely.
 */
const makeFiltersState = (src: unknown): FiltersState => {
    const obj = (src ?? {}) as Partial<Record<keyof FiltersState, unknown>>;

    const query = typeof (obj as any).query === "string" ? ((obj as any).query as string) : "";
    const parties = Array.isArray((obj as any).parties)
        ? ([...(obj as any).parties] as string[])
        : [];

    const uiInclude = toUIIncludeRejected((obj as any).includeRejected);
    const uiSort = normalizeSortBy((obj as any).sortBy);

    return {
        ...(obj as FiltersState),
        query,
        parties,
        // store legacy value into FiltersState
        includeRejected: fromUIIncludeRejected(uiInclude) as any,
        sortBy: uiSort as any,
    };
};

const AnalyticsDashboard: React.FC = () => {
    const { state, actions } = useAnalytics();
    const {
        national,
        counties,
        constits,
        loading,
        error,
        lastUpdated,
        autoRefresh,
        totalNationalVotes,
        parties,
    } = state;

    const { setAutoRefresh } = actions;

    const [filters, setFilters] = useState<FiltersState>(() => makeFiltersState(DEFAULT_FILTERS));

    const normalizedQuery = ((filters as any).query ?? "").toString().trim().toLowerCase();

    const countyRows = useMemo(
        () => sortAndFilter.counties(counties, filters, normalizedQuery),
        [counties, filters, normalizedQuery]
    );

    const constRows = useMemo(
        () => sortAndFilter.constits(constits, filters, normalizedQuery),
        [constits, filters, normalizedQuery]
    );

    /**
     * Build UI-safe filters for FiltersBar
     */
    const uiFilters: UIFilters = useMemo(
        () => ({
            query: typeof (filters as any).query === "string" ? (filters as any).query : "",
            parties: Array.isArray((filters as any).parties) ? ([...(filters as any).parties] as string[]) : [],
            includeRejected: toUIIncludeRejected((filters as any).includeRejected),
            sortBy: normalizeSortBy((filters as any).sortBy),
        }),
        [filters]
    );

    /**
     * IMPORTANT: This handler is typed exactly as FiltersBar expects.
     * Then we map UIFilters -> FiltersState (legacy) inside.
     */
    const handleFiltersChange = (patch: Partial<UIFilters>) => {
        setFilters((prev) => {
            const next: any = { ...prev };

            if (patch.query !== undefined) {
                next.query = typeof patch.query === "string" ? patch.query : "";
            }
            if (patch.parties !== undefined) {
                next.parties = Array.isArray(patch.parties) ? [...patch.parties] : [];
            }
            if (patch.sortBy !== undefined) {
                next.sortBy = normalizeSortBy(patch.sortBy);
            }
            if (patch.includeRejected !== undefined) {
                next.includeRejected = fromUIIncludeRejected(patch.includeRejected);
            }

            return next as FiltersState;
        });
    };

    const handleFiltersReset = () => {
        setFilters(makeFiltersState(DEFAULT_FILTERS));
    };

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Box sx={{ minHeight: "100vh", py: 5 }}>
                <Container maxWidth="xl">
                    <Typography
                        variant="h3"
                        align="center"
                        gutterBottom
                        sx={{ fontWeight: "bold", color: "primary.main" }}
                    >
                        National Tallying Center
                    </Typography>

                    <Typography
                        variant="h5"
                        align="center"
                        gutterBottom
                        sx={{ color: "secondary.main" }}
                    >
                        Real-time Presidential Election Analytics 🗳️
                    </Typography>

                    <Typography align="center" variant="body1" color="text.secondary">
                        Data streaming live from Form 34A and 34B submissions.
                    </Typography>

                    <Stack direction="row" justifyContent="center" spacing={2} sx={{ my: 2 }}>
                        <Button
                            component={Link}
                            to="/election/heatmap"
                            variant="contained"
                            color="primary"
                            size="large"
                            sx={{ borderRadius: 2, px: 4, py: 1.5 }}
                            endIcon={<ArrowDownwardRoundedIcon />}
                        >
                            View Detailed Voting Heat Map 🌍
                        </Button>

                        <Button
                            variant={autoRefresh ? "contained" : "outlined"}
                            color="secondary"
                            onClick={() => setAutoRefresh((v: boolean) => !v)}
                            startIcon={<RefreshRoundedIcon />}
                        >
                            {autoRefresh ? "Auto refresh: On" : "Auto refresh: Off"}
                        </Button>
                    </Stack>

                    {lastUpdated && (
                        <Typography align="center" variant="body2" color="text.secondary" sx={{ mt: 1, mb: 4 }}>
                            Last updated: {lastUpdated}
                        </Typography>
                    )}

                    <Divider sx={{ my: 3, bgcolor: "#333" }} />

                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
                            <CircularProgress size={60} />
                        </Box>
                    ) : error ? (
                        <MuiAlert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </MuiAlert>
                    ) : (
                        <Grid container spacing={4}>
                            <Grid item xs={12}>
                                <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
                                    National Overview
                                </Typography>
                                <NationalOverview candidates={national} totalVotes={totalNationalVotes} parties={parties} />
                            </Grid>

                            <Grid item xs={12}>
                                <FiltersBar
                                    title="Filters"
                                    parties={parties}
                                    filters={uiFilters}
                                    onChange={handleFiltersChange}
                                    onReset={handleFiltersReset}
                                    anchorId="filters"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <GeoSection
                                    counties={
                                        <AnimatePresence>
                                            {countyRows.map((r) => (
                                                <motion.tr
                                                    key={r.county_code}
                                                    initial={{ opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 6 }}
                                                    transition={{ duration: 0.25 }}
                                                >
                                                    <td>{r.county_name}</td>
                                                    <td align="right">{Number(r.total_votes).toLocaleString()}</td>
                                                    <td align="right">{Number(r.rejected_votes).toLocaleString()}</td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    }
                                    constits={
                                        <AnimatePresence>
                                            {constRows.map((r) => (
                                                <motion.tr
                                                    key={r.const_code}
                                                    initial={{ opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 6 }}
                                                    transition={{ duration: 0.25 }}
                                                >
                                                    <td>{r.constituency_name}</td>
                                                    <td>{r.county_name}</td>
                                                    <td align="right">{Number(r.total_votes).toLocaleString()}</td>
                                                    <td align="right">{Number(r.rejected_votes).toLocaleString()}</td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    }
                                />
                            </Grid>
                        </Grid>
                    )}
                </Container>
            </Box>
        </ThemeProvider>
    );
};

export default AnalyticsDashboard;
