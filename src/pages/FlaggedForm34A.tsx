// ================================
// File: src/pages/FlaggedForm34A.tsx
// ================================
import React, {
    useEffect,
    useMemo,
    useState,
    useCallback,
} from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress,
    Alert,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from "@mui/material";
import type { ChipProps } from "@mui/material";
import { motion } from "framer-motion";
import {
    PictureAsPdf,
    Visibility,
    ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";

import { fetchFlagged34A, fetch34ADetails } from "../lib/electionValidation";

// ---- Local types ----
type FlagIssue = {
    code:
    | "CANDIDATE_TOTALS_MISMATCH"
    | "VALID_VS_SUMCAND_MISMATCH"
    | "TOTALCAST_MISMATCH"
    | "REGISTERED_MISMATCH"
    | "TURNOUT_EXCEEDS_REGISTERED"
    | "DETAILS";
    message: string;
    severity: "Low" | "Medium" | "High";
    meta?: Record<string, any>;
};

type FlagStatus = "Open" | "In Review" | "Resolved" | "Rejected";

type Flagged34ARecord = {
    id: string;
    county: string;
    constituency: string;
    ward?: string;
    pollingStation?: string;
    issue: string;
    severity: "Low" | "Medium" | "High";
    status: FlagStatus;
    evidenceUrl?: string | null;
    issues: FlagIssue[];
};

// summaries used in drilldown
type CountySummary = {
    county: string;
    total: number;
    high: number;
    open: number;
    inReview: number;
    resolved: number;
    rejected: number;
};

type ConstituencySummary = {
    county: string;
    constituency: string;
    total: number;
    high: number;
};

type WardSummary = {
    county: string;
    constituency: string;
    ward: string;
    total: number;
    high: number;
};

type StationSummary = {
    county: string;
    constituency: string;
    ward: string;
    pollingStation: string;
    total: number;
    high: number;
};

type Step = "counties" | "constituencies" | "wards" | "stations";

// ---- helpers ----
const numberFmt = (n: number | null | undefined) =>
    n == null ? "—" : new Intl.NumberFormat().format(n);

/** Normalize API pct that may arrive as 0..1 or 0..100 */
const normalizePct = (p: number | null | undefined) => {
    if (p == null) return 0;
    return p > 1 ? p / 100 : p;
};

const getSeverityColor = (s: "Low" | "Medium" | "High"): ChipProps["color"] => {
    if (s === "High") return "error";
    if (s === "Medium") return "warning";
    return "default";
};

const getStatusColor = (s: FlagStatus): ChipProps["color"] => {
    if (s === "Open" || s === "Rejected") return "error";
    if (s === "In Review") return "warning";
    return "success";
};

const FlaggedForm34A: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [rows, setRows] = useState<Flagged34ARecord[]>([]);
    const [details, setDetails] = useState<Flagged34ARecord | null>(null);

    // drilldown state
    const [step, setStep] = useState<Step>("counties");
    const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
    const [selectedConstituency, setSelectedConstituency] = useState<string | null>(
        null
    );
    const [selectedWard, setSelectedWard] = useState<string | null>(null);

    // dialog: all forms at a polling station
    const [stationDialog, setStationDialog] = useState<{
        stationName: string;
        forms: Flagged34ARecord[];
    } | null>(null);

    // ===========================
    // Load from API (single fetch)
    // ===========================
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        const params: any = {
            includeResolved: false,
            abs_candidate_diff: 0,
            pct_candidate_diff: 0,
            abs_registered_diff: 0,
            abs_totalcast_diff: 0,
        };

        console.log("[FlaggedForm34A] Loading with params:", params);

        try {
            const apiRows = await fetchFlagged34A(params);

            console.log(
                "[FlaggedForm34A] API returned rows:",
                apiRows.length,
                apiRows
            );

            const mapped: Flagged34ARecord[] = apiRows.map((r: any) => {
                const county =
                    r.county ??
                    r.county_name ??
                    r.county_code ??
                    "Unknown county";

                const constituency =
                    r.constituency ??
                    r.constituency_name ??
                    r.const_code ??
                    "Unknown constituency";

                const ward =
                    r.ward ??
                    r.ward_name ??
                    r.caw_code ??
                    "Unknown ward";

                const pollingStation =
                    r.pollingStation ??
                    r.polling_station_name ??
                    r.polling_station_id ??
                    "Unknown station";

                const issue =
                    r.issue ??
                    r.review_notes ??
                    "Rejected Form 34A (no specific issue text provided)";

                const severityValue: "Low" | "Medium" | "High" =
                    (r.severity as "Low" | "Medium" | "High") || "High";

                const rawStatus: string = (r.status || "").toString().toLowerCase();
                let statusValue: FlagStatus = "Open";
                if (rawStatus === "rejected") statusValue = "Rejected";
                else if (rawStatus === "in review") statusValue = "In Review";
                else if (rawStatus === "resolved") statusValue = "Resolved";

                const issues: FlagIssue[] = [
                    {
                        code: "DETAILS",
                        message: issue,
                        severity: severityValue,
                        meta: r.detail_json ?? {},
                    },
                ];

                const breaches = r.detail_json?.candidate_breaches ?? [];
                if (breaches.length) {
                    const diffs = Object.fromEntries(
                        breaches.map((c: any) => [
                            c.candidate_id,
                            {
                                a: c.a_votes,
                                b: c.b_votes,
                                diff: c.diff,
                                pct: normalizePct(c.pct),
                            },
                        ])
                    );
                    issues.push({
                        code: "CANDIDATE_TOTALS_MISMATCH",
                        message: "Candidate totals mismatch vs expected baseline",
                        severity: "High",
                        meta: { diffs },
                    });
                }

                return {
                    id: String(r.id),
                    county,
                    constituency,
                    ward,
                    pollingStation,
                    issue,
                    severity: severityValue,
                    status: statusValue,
                    evidenceUrl: r.evidenceUrl ?? r.primary_image_url ?? null,
                    issues,
                };
            });

            setRows(mapped);
        } catch (e: any) {
            console.error("[FlaggedForm34A] Failed to load:", e);
            const msg =
                e?.message ||
                (typeof e === "string" ? e : "Failed to load flagged Form 34A.");
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // ===========================
    // Counts for KPI cards
    // ===========================
    const counts = useMemo(() => {
        const total = rows.length;
        const open = rows.filter((r) => r.status === "Open").length;
        const inReview = rows.filter((r) => r.status === "In Review").length;
        const resolved = rows.filter((r) => r.status === "Resolved").length;
        const rejected = rows.filter((r) => r.status === "Rejected").length;
        const high = rows.filter((r) => r.severity === "High").length;
        return { total, open, inReview, resolved, rejected, high };
    }, [rows]);

    // ===========================
    // Drilldown summaries
    // ===========================
    const countySummaries: CountySummary[] = useMemo(() => {
        const map = new Map<string, CountySummary>();
        rows.forEach((r) => {
            const key = r.county || "Unknown county";
            const existing =
                map.get(key) || {
                    county: key,
                    total: 0,
                    high: 0,
                    open: 0,
                    inReview: 0,
                    resolved: 0,
                    rejected: 0,
                };
            existing.total += 1;
            if (r.severity === "High") existing.high += 1;
            if (r.status === "Open") existing.open += 1;
            else if (r.status === "In Review") existing.inReview += 1;
            else if (r.status === "Resolved") existing.resolved += 1;
            else if (r.status === "Rejected") existing.rejected += 1;
            map.set(key, existing);
        });
        return Array.from(map.values()).sort((a, b) =>
            a.county.localeCompare(b.county)
        );
    }, [rows]);

    const constituencySummaries: ConstituencySummary[] = useMemo(() => {
        if (!selectedCounty) return [];
        const map = new Map<string, ConstituencySummary>();
        rows.forEach((r) => {
            if (r.county !== selectedCounty) return;
            const key = r.constituency || "Unknown constituency";
            const existing =
                map.get(key) || {
                    county: selectedCounty,
                    constituency: key,
                    total: 0,
                    high: 0,
                };
            existing.total += 1;
            if (r.severity === "High") existing.high += 1;
            map.set(key, existing);
        });
        return Array.from(map.values()).sort((a, b) =>
            a.constituency.localeCompare(b.constituency)
        );
    }, [rows, selectedCounty]);

    const wardSummaries: WardSummary[] = useMemo(() => {
        if (!selectedCounty || !selectedConstituency) return [];
        const map = new Map<string, WardSummary>();
        rows.forEach((r) => {
            if (r.county !== selectedCounty) return;
            if (r.constituency !== selectedConstituency) return;
            const key = r.ward || "Unknown ward";
            const existing =
                map.get(key) || {
                    county: selectedCounty,
                    constituency: selectedConstituency,
                    ward: key,
                    total: 0,
                    high: 0,
                };
            existing.total += 1;
            if (r.severity === "High") existing.high += 1;
            map.set(key, existing);
        });
        return Array.from(map.values()).sort((a, b) => a.ward.localeCompare(b.ward));
    }, [rows, selectedCounty, selectedConstituency]);

    const stationSummaries: StationSummary[] = useMemo(() => {
        if (!selectedCounty || !selectedConstituency || !selectedWard) return [];
        const map = new Map<string, StationSummary>();
        rows.forEach((r) => {
            if (r.county !== selectedCounty) return;
            if (r.constituency !== selectedConstituency) return;
            if (r.ward !== selectedWard) return;
            const key = r.pollingStation || "Unknown station";
            const existing =
                map.get(key) || {
                    county: selectedCounty,
                    constituency: selectedConstituency,
                    ward: selectedWard,
                    pollingStation: key,
                    total: 0,
                    high: 0,
                };
            existing.total += 1;
            if (r.severity === "High") existing.high += 1;
            map.set(key, existing);
        });
        return Array.from(map.values()).sort((a, b) =>
            a.pollingStation.localeCompare(b.pollingStation)
        );
    }, [rows, selectedCounty, selectedConstituency, selectedWard]);

    // ===========================
    // Handlers
    // ===========================
    const handleSelectCounty = (county: string) => {
        setSelectedCounty(county);
        setSelectedConstituency(null);
        setSelectedWard(null);
        setStep("constituencies");
    };

    const handleSelectConstituency = (constituency: string) => {
        setSelectedConstituency(constituency);
        setSelectedWard(null);
        setStep("wards");
    };

    const handleSelectWard = (ward: string) => {
        setSelectedWard(ward);
        setStep("stations");
    };

    const handleSelectStation = (stationName: string) => {
        if (!selectedCounty || !selectedConstituency || !selectedWard) return;
        const forms = rows.filter(
            (r) =>
                r.county === selectedCounty &&
                r.constituency === selectedConstituency &&
                r.ward === selectedWard &&
                (r.pollingStation || "Unknown station") === stationName
        );
        setStationDialog({ stationName, forms });
    };

    const openDetails = async (row: Flagged34ARecord) => {
        try {
            const idNum = parseInt(row.id, 10);
            if (!Number.isFinite(idNum)) {
                setDetails(row);
                return;
            }

            console.log("[FlaggedForm34A] Fetching details for ID:", idNum);

            const diffs = await fetch34ADetails(idNum);
            console.log(
                "[FlaggedForm34A] Details API returned candidates:",
                diffs.length,
                diffs
            );

            const mappedDiffs = Object.fromEntries(
                diffs.map((c: any) => [
                    c.candidate_id,
                    {
                        a: c.a_votes,
                        b: c.b_votes,
                        diff: c.diff,
                        pct: normalizePct(c.pct),
                    },
                ])
            );

            const withDetails: Flagged34ARecord = {
                ...row,
                issues: [
                    ...(row.issues || []),
                    {
                        code: "CANDIDATE_TOTALS_MISMATCH",
                        message: "Candidate-by-candidate comparison",
                        severity: row.severity,
                        meta: { diffs: mappedDiffs },
                    },
                ],
            };
            setDetails(withDetails);
        } catch (e) {
            console.error("[FlaggedForm34A] Failed to load details:", e);
            setDetails(row);
        }
    };

    // ===========================
    // Loading & error UI
    // ===========================
    if (loading) {
        return (
            <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                        Failed to load flagged Form 34A
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        {error}
                    </Typography>
                </Alert>
                <Button variant="outlined" onClick={load}>
                    Retry
                </Button>
            </Box>
        );
    }

    // ===========================
    // Render helpers
    // ===========================
    const renderHeader = () => (
        <header style={{ marginBottom: "1rem" }}>
            <Typography variant="h4" sx={{ fontWeight: "bold", mb: 0.5 }}>
                Flagged / Rejected Form 34A
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Step{" "}
                {{
                    counties: "1",
                    constituencies: "2",
                    wards: "3",
                    stations: "4",
                }[step]}{" "}
                of 4 –{" "}
                {{
                    counties: "View flagged 34A by County",
                    constituencies: "Drill down to Constituencies",
                    wards: "Drill down to Wards",
                    stations: "View Polling Stations & forms",
                }[step]}
            </Typography>
        </header>
    );

    const renderBreadcrumb = () => (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 2 }}
            flexWrap="wrap"
        >
            <Button
                size="small"
                variant="text"
                onClick={() => {
                    setStep("counties");
                    setSelectedCounty(null);
                    setSelectedConstituency(null);
                    setSelectedWard(null);
                }}
            >
                Counties
            </Button>
            {selectedCounty && <span>&gt;</span>}
            {selectedCounty && (
                <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                        setStep("constituencies");
                        setSelectedConstituency(null);
                        setSelectedWard(null);
                    }}
                >
                    {selectedCounty}
                </Button>
            )}
            {selectedConstituency && <span>&gt;</span>}
            {selectedConstituency && (
                <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                        setStep("wards");
                        setSelectedWard(null);
                    }}
                >
                    {selectedConstituency}
                </Button>
            )}
            {selectedWard && <span>&gt;</span>}
            {selectedWard && (
                <Typography
                    variant="body2"
                    sx={{ fontWeight: step === "stations" ? 700 : 400 }}
                >
                    {selectedWard}
                </Typography>
            )}
        </Stack>
    );

    const renderKpiCards = () => (
        <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                            Total Flagged / Rejected
                        </Typography>
                        <Typography variant="h5" fontWeight={700}>
                            {counts.total}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                            Open
                        </Typography>
                        <Typography variant="h5" fontWeight={700}>
                            {counts.open}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                            In Review
                        </Typography>
                        <Typography variant="h5" fontWeight={700}>
                            {counts.inReview}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                            Resolved
                        </Typography>
                        <Typography variant="h5" fontWeight={700}>
                            {counts.resolved}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );

    const renderCountiesStep = () => (
        <Card variant="outlined">
            <CardContent>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                    Step 1: Counties – Flagged 34A Overview
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>County</TableCell>
                                <TableCell align="right">Flagged Forms</TableCell>
                                <TableCell align="right">High Severity</TableCell>
                                <TableCell align="right">Open</TableCell>
                                <TableCell align="right">In Review</TableCell>
                                <TableCell align="right">Resolved</TableCell>
                                <TableCell align="right">Rejected</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {countySummaries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <Box
                                            sx={{
                                                py: 4,
                                                textAlign: "center",
                                                color: "text.secondary",
                                            }}
                                        >
                                            No flagged / rejected Form 34A found.
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                            {countySummaries.map((c) => (
                                <TableRow
                                    key={c.county}
                                    hover
                                    onClick={() => handleSelectCounty(c.county)}
                                    sx={{ cursor: "pointer" }}
                                >
                                    <TableCell>{c.county}</TableCell>
                                    <TableCell align="right">{c.total}</TableCell>
                                    <TableCell align="right">{c.high}</TableCell>
                                    <TableCell align="right">{c.open}</TableCell>
                                    <TableCell align="right">{c.inReview}</TableCell>
                                    <TableCell align="right">{c.resolved}</TableCell>
                                    <TableCell align="right">{c.rejected}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );

    const renderConstituenciesStep = () => (
        <Card variant="outlined">
            <CardContent>
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                >
                    <div>
                        <Typography variant="subtitle1" fontWeight={600}>
                            Step 2: Constituencies – {selectedCounty}
                        </Typography>
                    </div>
                    <Button
                        size="small"
                        onClick={() => {
                            setStep("counties");
                            setSelectedConstituency(null);
                            setSelectedWard(null);
                        }}
                    >
                        ← Back to Counties
                    </Button>
                </Stack>

                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Constituency</TableCell>
                                <TableCell align="right">Flagged Forms</TableCell>
                                <TableCell align="right">High Severity</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {constituencySummaries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3}>
                                        <Box
                                            sx={{
                                                py: 4,
                                                textAlign: "center",
                                                color: "text.secondary",
                                            }}
                                        >
                                            No constituencies with flagged forms in this
                                            county.
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                            {constituencySummaries.map((c) => (
                                <TableRow
                                    key={c.constituency}
                                    hover
                                    sx={{ cursor: "pointer" }}
                                    onClick={() =>
                                        handleSelectConstituency(c.constituency)
                                    }
                                >
                                    <TableCell>{c.constituency}</TableCell>
                                    <TableCell align="right">{c.total}</TableCell>
                                    <TableCell align="right">{c.high}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );

    const renderWardsStep = () => (
        <Card variant="outlined">
            <CardContent>
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                >
                    <div>
                        <Typography variant="subtitle1" fontWeight={600}>
                            Step 3: Wards – {selectedConstituency}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            County: {selectedCounty}
                        </Typography>
                    </div>
                    <Button
                        size="small"
                        onClick={() => {
                            setStep("constituencies");
                            setSelectedWard(null);
                        }}
                    >
                        ← Back to Constituencies
                    </Button>
                </Stack>

                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Ward</TableCell>
                                <TableCell align="right">Flagged Forms</TableCell>
                                <TableCell align="right">High Severity</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {wardSummaries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3}>
                                        <Box
                                            sx={{
                                                py: 4,
                                                textAlign: "center",
                                                color: "text.secondary",
                                            }}
                                        >
                                            No wards with flagged forms in this constituency.
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                            {wardSummaries.map((w) => (
                                <TableRow
                                    key={w.ward}
                                    hover
                                    sx={{ cursor: "pointer" }}
                                    onClick={() => handleSelectWard(w.ward)}
                                >
                                    <TableCell>{w.ward}</TableCell>
                                    <TableCell align="right">{w.total}</TableCell>
                                    <TableCell align="right">{w.high}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );

    const renderStationsStep = () => (
        <Card variant="outlined">
            <CardContent>
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                >
                    <div>
                        <Typography variant="subtitle1" fontWeight={600}>
                            Step 4: Polling Stations – {selectedWard}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            County: {selectedCounty} · Constituency: {selectedConstituency}
                        </Typography>
                    </div>
                    <Button
                        size="small"
                        onClick={() => {
                            setStep("wards");
                        }}
                    >
                        ← Back to Wards
                    </Button>
                </Stack>

                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Polling Station</TableCell>
                                <TableCell align="right">Flagged Forms</TableCell>
                                <TableCell align="right">High Severity</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {stationSummaries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3}>
                                        <Box
                                            sx={{
                                                py: 4,
                                                textAlign: "center",
                                                color: "text.secondary",
                                            }}
                                        >
                                            No polling stations with flagged forms in this
                                            ward.
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                            {stationSummaries.map((s) => (
                                <TableRow
                                    key={s.pollingStation}
                                    hover
                                    sx={{ cursor: "pointer" }}
                                    onClick={() => handleSelectStation(s.pollingStation)}
                                >
                                    <TableCell>{s.pollingStation}</TableCell>
                                    <TableCell align="right">{s.total}</TableCell>
                                    <TableCell align="right">{s.high}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );

    // ===========================
    // Main render
    // ===========================
    return (
        <Box sx={{ p: 4, bgcolor: "#f4f6f8", minHeight: "100vh" }}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                {renderHeader()}

                <Alert severity="info" sx={{ mb: 2 }}>
                    Loaded <strong>{rows.length}</strong> flagged / rejected Form 34A
                    record(s). Use the drilldown to inspect counties → constituencies →
                    wards → polling stations.
                </Alert>

                {renderKpiCards()}
                {renderBreadcrumb()}

                {step === "counties" && renderCountiesStep()}
                {step === "constituencies" && selectedCounty && renderConstituenciesStep()}
                {step === "wards" &&
                    selectedCounty &&
                    selectedConstituency &&
                    renderWardsStep()}
                {step === "stations" &&
                    selectedCounty &&
                    selectedConstituency &&
                    selectedWard &&
                    renderStationsStep()}

                {/* Dialog: all flagged forms for a polling station */}
                <Dialog
                    open={!!stationDialog}
                    onClose={() => setStationDialog(null)}
                    maxWidth="lg"
                    fullWidth
                >
                    <DialogTitle>
                        Flagged Form 34A – {stationDialog?.stationName}
                    </DialogTitle>
                    <DialogContent dividers>
                        {stationDialog && stationDialog.forms.length === 0 && (
                            <Alert severity="info">No forms found for this station.</Alert>
                        )}

                        {stationDialog && stationDialog.forms.length > 0 && (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>ID</TableCell>
                                            <TableCell>Issue</TableCell>
                                            <TableCell>Severity</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stationDialog.forms.map((f) => (
                                            <TableRow key={f.id} hover>
                                                <TableCell>{f.id}</TableCell>
                                                <TableCell>{f.issue}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={f.severity}
                                                        color={getSeverityColor(
                                                            f.severity
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={f.status}
                                                        color={getStatusColor(
                                                            f.status
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Stack
                                                        direction="row"
                                                        spacing={1}
                                                        justifyContent="flex-end"
                                                    >
                                                        <Button
                                                            size="small"
                                                            startIcon={<Visibility />}
                                                            onClick={() => openDetails(f)}
                                                        >
                                                            Breakdown
                                                        </Button>
                                                        {f.evidenceUrl && (
                                                            <Button
                                                                size="small"
                                                                startIcon={<PictureAsPdf />}
                                                                component="a"
                                                                href={f.evidenceUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                PDF
                                                            </Button>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setStationDialog(null)}>Close</Button>
                    </DialogActions>
                </Dialog>

                {/* Mismatch breakdown dialog */}
                <Dialog
                    open={!!details}
                    onClose={() => setDetails(null)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>Validation breakdown — {details?.id}</DialogTitle>
                    <DialogContent dividers>
                        {!details?.issues?.length && (
                            <Alert severity="success">No issues detected.</Alert>
                        )}

                        {!!details?.issues?.length && (
                            <Card variant="outlined" sx={{ mb: 2 }}>
                                <CardContent>
                                    <Typography variant="subtitle2" gutterBottom>
                                        At-a-glance totals
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Card
                                                variant="outlined"
                                                sx={{ bgcolor: "#f9f9f9" }}
                                            >
                                                <CardContent>
                                                    <Typography
                                                        variant="subtitle2"
                                                        color="text.secondary"
                                                    >
                                                        Baseline / Expected
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        Registered:{" "}
                                                        {numberFmt(
                                                            details?.issues?.[0]?.meta
                                                                ?.a_registered_sum
                                                        )}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        Valid:{" "}
                                                        {numberFmt(
                                                            details?.issues?.[0]?.meta
                                                                ?.a_valid_sum
                                                        )}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        Rejected:{" "}
                                                        {numberFmt(
                                                            details?.issues?.[0]?.meta
                                                                ?.a_rejected_sum
                                                        )}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        Total Cast:{" "}
                                                        {numberFmt(
                                                            details?.issues?.[0]?.meta
                                                                ?.a_total_cast
                                                        )}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Card
                                                variant="outlined"
                                                sx={{ bgcolor: "#f9f9f9" }}
                                            >
                                                <CardContent>
                                                    <Typography
                                                        variant="subtitle2"
                                                        color="text.secondary"
                                                    >
                                                        Form 34A
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        Registered:{" "}
                                                        {numberFmt(
                                                            details?.issues?.[0]?.meta
                                                                ?.b_registered_sum
                                                        )}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        Valid:{" "}
                                                        {numberFmt(
                                                            details?.issues?.[0]?.meta
                                                                ?.b_valid_sum
                                                        )}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        Rejected:{" "}
                                                        {numberFmt(
                                                            details?.issues?.[0]?.meta
                                                                ?.b_rejected_sum
                                                        )}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        Total Cast:{" "}
                                                        {numberFmt(
                                                            details?.issues?.[0]?.meta
                                                                ?.b_total_cast
                                                        )}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        )}

                        {details?.issues?.map((iss) => {
                            const candDiffs = (iss.meta as any)?.diffs as
                                | Record<
                                    string,
                                    {
                                        a: number;
                                        b: number;
                                        diff: number;
                                        pct: number;
                                    }
                                >
                                | undefined;

                            return (
                                <Accordion
                                    key={`${details.id}-${iss.code}`}
                                    defaultExpanded
                                    sx={{ mb: 1 }}
                                >
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                        >
                                            <Chip
                                                size="small"
                                                label={iss.severity}
                                                color={getSeverityColor(
                                                    iss.severity
                                                )}
                                            />
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight={700}
                                            >
                                                {iss.code.replaceAll("_", " ")}
                                            </Typography>
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Typography
                                            variant="body2"
                                            sx={{ mb: candDiffs ? 2 : 0 }}
                                        >
                                            {iss.message}
                                        </Typography>

                                        {candDiffs && (
                                            <TableContainer
                                                component={Paper}
                                                variant="outlined"
                                                sx={{ mt: 1 }}
                                            >
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>Candidate</TableCell>
                                                            <TableCell align="right">
                                                                Baseline
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                Form 34A
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                Δ (A−Baseline)
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                |Δ| / Baseline
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {Object.entries(candDiffs).map(
                                                            ([cid, v]) => (
                                                                <TableRow
                                                                    key={cid}
                                                                    hover
                                                                >
                                                                    <TableCell>
                                                                        {cid}
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        {numberFmt(v.a)}
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        {numberFmt(v.b)}
                                                                    </TableCell>
                                                                    <TableCell
                                                                        align="right"
                                                                        sx={{
                                                                            color:
                                                                                v.diff === 0
                                                                                    ? "inherit"
                                                                                    : v.diff >
                                                                                        0
                                                                                        ? "error.main"
                                                                                        : "success.main",
                                                                        }}
                                                                    >
                                                                        {v.diff > 0
                                                                            ? `+${v.diff}`
                                                                            : v.diff}
                                                                    </TableCell>
                                                                    <TableCell
                                                                        align="right"
                                                                        sx={{
                                                                            color:
                                                                                Math.abs(
                                                                                    v.pct
                                                                                ) > 0.05
                                                                                    ? "error.main"
                                                                                    : "success.main",
                                                                        }}
                                                                    >
                                                                        {(
                                                                            Math.abs(
                                                                                v.pct
                                                                            ) * 100
                                                                        ).toFixed(2)}
                                                                        %
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        )}
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </DialogContent>
                    <DialogActions>
                        {details?.evidenceUrl && (
                            <Button
                                startIcon={<PictureAsPdf />}
                                component="a"
                                href={details.evidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Open 34A PDF
                            </Button>
                        )}
                        <Button onClick={() => setDetails(null)}>Close</Button>
                    </DialogActions>
                </Dialog>
            </motion.div>
        </Box>
    );
};

export default FlaggedForm34A;
