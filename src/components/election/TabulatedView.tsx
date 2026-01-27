import React, { useMemo, useState, useEffect } from "react";
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    Typography,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import FiltersBar from "../../components/election/FiltersBar";
import {
    ConstituencyResult,
    CountyResult,
    FiltersState,
} from "../../types/election";

const DEFAULT_FILTERS: FiltersState = {
    query: "",
    parties: [],
    includeRejected: "all",
    sortBy: "votes_desc",

    // Keep geo fields – they will now be driven by row clicks
    countyCode: null,
    constituencyCode: null,
    wardCode: null,
    stationId: null,
};

interface TabulatedViewProps {
    countyResults: CountyResult[];
    constituencyResults: ConstituencyResult[];
    parties: string[];
}

const TabulatedView: React.FC<TabulatedViewProps> = ({
    countyResults,
    constituencyResults,
    parties,
}) => {
    const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
    const [tabIndex, setTabIndex] = useState(0);

    const normalizedQuery = filters.query.trim().toLowerCase();

    const resetFilters = () => setFilters(DEFAULT_FILTERS);
    const patchFilters = (patch: Partial<FiltersState>) =>
        setFilters((f) => ({ ...f, ...patch }));

    /* -------------------- Keep tab in sync with drill level -------------------- */
    useEffect(() => {
        // If a constituency is selected → show constituency tab
        if (filters.constituencyCode && tabIndex !== 1) {
            setTabIndex(1);
            return;
        }
        // If a county is selected but no constituency → show county tab
        if (filters.countyCode && !filters.constituencyCode && tabIndex !== 0) {
            setTabIndex(0);
        }
    }, [filters.countyCode, filters.constituencyCode, tabIndex]);

    /* -------------------- County-level results -------------------- */
    const filteredCountyResults = useMemo(() => {
        let rows = [...countyResults];

        // GEO: filter by county code if selected
        if (filters.countyCode) {
            rows = rows.filter((r) => r.county_code === filters.countyCode);
        }

        // Text query
        if (normalizedQuery) {
            rows = rows.filter((r) =>
                r.county_name.toLowerCase().includes(normalizedQuery)
            );
        }

        // Rejected votes filter
        if (filters.includeRejected === "with") {
            rows = rows.filter((r) => Number(r.rejected_votes) > 0);
        }
        if (filters.includeRejected === "without") {
            rows = rows.filter((r) => Number(r.rejected_votes) === 0);
        }

        // Sorting
        rows.sort((a, b) => {
            switch (filters.sortBy) {
                case "votes_asc":
                    return Number(a.total_votes) - Number(b.total_votes);
                case "rejected_desc":
                    return Number(b.rejected_votes) - Number(a.rejected_votes);
                case "name_asc":
                    return a.county_name.localeCompare(b.county_name);
                default:
                    return Number(b.total_votes) - Number(a.total_votes);
            }
        });

        return rows;
    }, [countyResults, filters, normalizedQuery]);

    /* -------------------- Constituency-level results -------------------- */
    const filteredConstituencyResults = useMemo(() => {
        let rows = [...constituencyResults];

        // GEO: first by county, then by specific constituency
        if (filters.countyCode) {
            rows = rows.filter((r) => r.county_code === filters.countyCode);
        }
        if (filters.constituencyCode) {
            rows = rows.filter((r) => r.const_code === filters.constituencyCode);
        }

        // Text query
        if (normalizedQuery) {
            rows = rows.filter(
                (r) =>
                    r.constituency_name.toLowerCase().includes(normalizedQuery) ||
                    r.county_name.toLowerCase().includes(normalizedQuery)
            );
        }

        // Rejected votes filter
        if (filters.includeRejected === "with") {
            rows = rows.filter((r) => Number(r.rejected_votes) > 0);
        }
        if (filters.includeRejected === "without") {
            rows = rows.filter((r) => Number(r.rejected_votes) === 0);
        }

        // Sorting
        rows.sort((a, b) => {
            switch (filters.sortBy) {
                case "votes_asc":
                    return Number(a.total_votes) - Number(b.total_votes);
                case "rejected_desc":
                    return Number(b.rejected_votes) - Number(a.rejected_votes);
                case "name_asc":
                    return a.constituency_name.localeCompare(b.constituency_name);
                default:
                    return Number(b.total_votes) - Number(a.total_votes);
            }
        });

        return rows;
    }, [constituencyResults, filters, normalizedQuery]);

    return (
        <Box sx={{ mt: 2 }}>
            <Typography
                variant="h6"
                sx={{
                    fontWeight: 700,
                    mb: 1.5,
                    color: "text.primary",
                    typography: { xs: "subtitle1", sm: "h6" },
                }}
            >
                Tabulated Results (Drill-down)
            </Typography>

            <FiltersBar
                parties={parties}
                filters={filters}
                onChange={patchFilters}
                onReset={resetFilters}
            />

            <Paper sx={{ width: "100%", border: "1px solid #333" }}>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                    <Tabs
                        value={tabIndex}
                        onChange={(_, v) => setTabIndex(v)}
                        aria-label="Geographical breakdown tabs"
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        <Tab label="Counties" />
                        <Tab label="Constituencies" />
                    </Tabs>
                </Box>

                {/* Counties */}
                <Box
                    role="tabpanel"
                    hidden={tabIndex !== 0}
                    id="county-tabpanel"
                    sx={{ width: "100%" }}
                >
                    {tabIndex === 0 && (
                        <TableContainer
                            sx={{
                                maxHeight: 520,
                                "& .MuiTableCell-root": {
                                    fontSize: { xs: 12, sm: 13 },
                                },
                            }}
                        >
                            <Table stickyHeader size="small" aria-label="county results">
                                <TableHead>
                                    <TableRow>
                                        <TableCell
                                            sx={{ fontWeight: "bold", bgcolor: "background.paper" }}
                                        >
                                            County
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{ fontWeight: "bold", bgcolor: "background.paper" }}
                                        >
                                            Total votes
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{ fontWeight: "bold", bgcolor: "background.paper" }}
                                        >
                                            Rejected votes
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <AnimatePresence>
                                        {filteredCountyResults.map((row) => (
                                            <TableRow
                                                key={row.county_code}
                                                component={motion.tr}
                                                initial={{ opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 6 }}
                                                transition={{ duration: 0.2 }}
                                                onClick={() => {
                                                    // Clicking a county row = select county + drill to constituencies
                                                    patchFilters({
                                                        countyCode: row.county_code,
                                                        constituencyCode: null,
                                                        wardCode: null,
                                                        stationId: null,
                                                    });
                                                    setTabIndex(1);
                                                }}
                                                sx={{
                                                    cursor: "pointer",
                                                    "&:hover": {
                                                        backgroundColor: "action.hover",
                                                    },
                                                }}
                                            >
                                                <TableCell>{row.county_name}</TableCell>
                                                <TableCell align="right">
                                                    {Number(row.total_votes).toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {Number(row.rejected_votes).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>

                {/* Constituencies */}
                <Box
                    role="tabpanel"
                    hidden={tabIndex !== 1}
                    id="constituency-tabpanel"
                    sx={{ width: "100%" }}
                >
                    {tabIndex === 1 && (
                        <TableContainer
                            sx={{
                                maxHeight: 520,
                                "& .MuiTableCell-root": {
                                    fontSize: { xs: 12, sm: 13 },
                                },
                            }}
                        >
                            <Table
                                stickyHeader
                                size="small"
                                aria-label="constituency results"
                            >
                                <TableHead>
                                    <TableRow>
                                        <TableCell
                                            sx={{ fontWeight: "bold", bgcolor: "background.paper" }}
                                        >
                                            Constituency
                                        </TableCell>
                                        <TableCell
                                            sx={{ fontWeight: "bold", bgcolor: "background.paper" }}
                                        >
                                            County
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{ fontWeight: "bold", bgcolor: "background.paper" }}
                                        >
                                            Total votes
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{ fontWeight: "bold", bgcolor: "background.paper" }}
                                        >
                                            Rejected votes
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <AnimatePresence>
                                        {filteredConstituencyResults.map((row) => (
                                            <TableRow
                                                key={row.const_code}
                                                component={motion.tr}
                                                initial={{ opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 6 }}
                                                transition={{ duration: 0.2 }}
                                                onClick={() => {
                                                    // Clicking a constituency row = select that constituency
                                                    patchFilters({
                                                        countyCode: row.county_code,
                                                        constituencyCode: row.const_code,
                                                        wardCode: null,
                                                        stationId: null,
                                                    });
                                                    // If you later add a "wards" tab,
                                                    // you can setTabIndex(2) here.
                                                }}
                                                sx={{
                                                    cursor: "pointer",
                                                    "&:hover": {
                                                        backgroundColor: "action.hover",
                                                    },
                                                }}
                                            >
                                                <TableCell>{row.constituency_name}</TableCell>
                                                <TableCell>{row.county_name}</TableCell>
                                                <TableCell align="right">
                                                    {Number(row.total_votes).toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {Number(row.rejected_votes).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            </Paper>
        </Box>
    );
};

export default TabulatedView;
