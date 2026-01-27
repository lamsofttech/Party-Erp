import React, { useMemo, useState } from "react";
import {
    Box,
    Stack,
    Typography,
    useTheme,
    useMediaQuery,
    Autocomplete,
    TextField,
    Paper,
    Button,
    Divider,
} from "@mui/material";
import {
    CandidateResult,
    CountyResult,
    ConstituencyResult,
} from "../../types/election";

type WardResult = {
    ward_name: string;
    constituency_name: string;
    county_name: string;
    total_votes: number;
    leading_candidate?: string;
    leading_votes?: number;
};

type Step = "national" | "counties" | "constituencies" | "wards";

interface ResultsDrilldownProps {
    countyResults: CountyResult[];
    constituencyResults: ConstituencyResult[];
    wardResults?: WardResult[];
    nationalResults: CandidateResult[];
}

const ResultsDrilldown: React.FC<ResultsDrilldownProps> = ({
    countyResults,
    constituencyResults,
    wardResults = [],
    nationalResults,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const primaryMain = theme.palette.primary.main || "#F43643";

    // ------------------ STEP + SELECTION STATE ---------------------
    const [step, setStep] = useState<Step>("national");
    const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
    const [selectedConstituency, setSelectedConstituency] = useState<string | null>(null);
    const [selectedWard, setSelectedWard] = useState<string | null>(null);

    // When you change a higher level, clear lower levels (like first component)
    const handleCountyChange = (_: any, value: string | null) => {
        setSelectedCounty(value);
        setSelectedConstituency(null);
        setSelectedWard(null);

        if (value) {
            setStep("counties");
        } else {
            setStep("national");
        }
    };

    const handleConstituencyChange = (_: any, value: string | null) => {
        setSelectedConstituency(value);
        setSelectedWard(null);

        if (value) {
            setStep("constituencies");
        } else if (selectedCounty) {
            setStep("counties");
        } else {
            setStep("national");
        }
    };

    const handleWardChange = (_: any, value: string | null) => {
        setSelectedWard(value);
        if (value) {
            setStep("wards");
        } else if (selectedConstituency) {
            setStep("constituencies");
        } else if (selectedCounty) {
            setStep("counties");
        } else {
            setStep("national");
        }
    };

    // ------------------ DERIVED LISTS (FILTERS) ---------------------

    // 1) unique county names
    const countyNames = useMemo(
        () =>
            Array.from(
                new Set(
                    countyResults
                        .map((c: any) => c.county_name || c.county || "")
                        .filter(Boolean)
                )
            ).sort(),
        [countyResults]
    );

    // 2) constituencies in selected county
    const filteredConstituencies = useMemo(() => {
        if (!selectedCounty) return [];
        return constituencyResults.filter((c: any) => {
            const cCounty = c.county_name || c.county || "";
            return cCounty === selectedCounty;
        });
    }, [constituencyResults, selectedCounty]);

    const constituencyNames = useMemo(
        () =>
            Array.from(
                new Set(
                    filteredConstituencies
                        .map((c: any) => c.constituency_name || c.constituency || "")
                        .filter(Boolean)
                )
            ).sort(),
        [filteredConstituencies]
    );

    // 3) wards in selected constituency
    const filteredWards = useMemo(() => {
        if (!selectedCounty || !selectedConstituency || !wardResults.length) return [];
        return wardResults.filter(
            (w) =>
                (w.county_name === selectedCounty ||
                    (w as any).county === selectedCounty) &&
                (w.constituency_name === selectedConstituency ||
                    (w as any).constituency === selectedConstituency)
        );
    }, [selectedCounty, selectedConstituency, wardResults]);

    const wardNames = useMemo(
        () =>
            Array.from(
                new Set(filteredWards.map((w) => w.ward_name).filter(Boolean))
            ).sort(),
        [filteredWards]
    );

    // 4) selected ward details
    const selectedWardResult = useMemo(() => {
        if (!selectedWard) return null;
        return filteredWards.find((w) => w.ward_name === selectedWard) || null;
    }, [filteredWards, selectedWard]);

    // ------------------ SUMMARY CARDS (RIGHT SIDE) ------------------

    const renderNationalSummary = () => {
        const totalVotes = nationalResults.reduce(
            (sum, c) => sum + Number(c.total_votes || 0),
            0
        );

        return (
            <Box>
                <Typography
                    variant="subtitle2"
                    sx={{ textTransform: "uppercase", color: "#9ca3af", mb: 0.5 }}
                >
                    National overview
                </Typography>
                <Typography
                    variant="h5"
                    sx={{ fontWeight: 800, color: "#ffffff", mb: 0.5 }}
                >
                    {totalVotes.toLocaleString()} votes
                </Typography>
                <Typography sx={{ fontSize: 13, color: "#d1d5db" }}>
                    Aggregated presidential results for all 47 counties. Drill down by
                    county, constituency and ward using the filters & list on the left.
                </Typography>
            </Box>
        );
    };

    const renderCountySummary = () => {
        if (!selectedCounty) return null;

        const countyRows = countyResults.filter((c: any) => {
            const cCounty = c.county_name || c.county || "";
            return cCounty === selectedCounty;
        });

        const totalVotes = countyRows.reduce(
            (sum: number, row: any) => sum + Number(row.total_votes || 0),
            0
        );

        return (
            <Box>
                <Typography
                    variant="subtitle2"
                    sx={{ textTransform: "uppercase", color: "#9ca3af", mb: 0.5 }}
                >
                    County overview
                </Typography>
                <Typography
                    variant="h5"
                    sx={{ fontWeight: 800, color: "#ffffff", mb: 0.5 }}
                >
                    {selectedCounty}
                </Typography>
                <Typography sx={{ fontSize: 13, color: "#d1d5db", mb: 0.5 }}>
                    Total valid votes:{" "}
                    <strong>{totalVotes.toLocaleString()}</strong>
                </Typography>
                <Typography sx={{ fontSize: 13, color: "#d1d5db" }}>
                    Select a constituency within this county to see a finer breakdown.
                </Typography>
            </Box>
        );
    };

    const renderConstituencySummary = () => {
        if (!selectedConstituency) return null;

        const rows = filteredConstituencies.filter((c: any) => {
            const name = c.constituency_name || c.constituency || "";
            return name === selectedConstituency;
        });

        const totalVotes = rows.reduce(
            (sum: number, row: any) => sum + Number(row.total_votes || 0),
            0
        );

        return (
            <Box>
                <Typography
                    variant="subtitle2"
                    sx={{ textTransform: "uppercase", color: "#9ca3af", mb: 0.5 }}
                >
                    Constituency overview
                </Typography>
                <Typography
                    variant="h6"
                    sx={{ fontWeight: 800, color: "#ffffff", mb: 0.25 }}
                >
                    {selectedConstituency}
                </Typography>
                <Typography sx={{ fontSize: 13, color: "#d1d5db", mb: 0.5 }}>
                    County: <strong>{selectedCounty}</strong>
                </Typography>
                <Typography sx={{ fontSize: 13, color: "#d1d5db" }}>
                    Total valid votes:{" "}
                    <strong>{totalVotes.toLocaleString()}</strong>. Choose a ward to
                    see station-level behaviour (once wired).
                </Typography>
            </Box>
        );
    };

    const renderWardSummary = () => {
        if (!selectedWardResult) return null;
        return (
            <Box>
                <Typography
                    variant="subtitle2"
                    sx={{ textTransform: "uppercase", color: "#9ca3af", mb: 0.5 }}
                >
                    Ward result
                </Typography>
                <Typography
                    variant="h6"
                    sx={{ fontWeight: 800, color: "#ffffff", mb: 0.25 }}
                >
                    {selectedWardResult.ward_name}
                </Typography>
                <Typography sx={{ fontSize: 13, color: "#d1d5db", mb: 0.25 }}>
                    {selectedWardResult.constituency_name},{" "}
                    {selectedWardResult.county_name}
                </Typography>
                <Typography sx={{ fontSize: 13, color: "#d1d5db", mb: 0.5 }}>
                    Total valid votes:{" "}
                    <strong>
                        {Number(selectedWardResult.total_votes || 0).toLocaleString()}
                    </strong>
                </Typography>
                {selectedWardResult.leading_candidate && (
                    <Typography sx={{ fontSize: 13, color: "#d1d5db" }}>
                        Leading candidate:{" "}
                        <strong>{selectedWardResult.leading_candidate}</strong>{" "}
                        ({Number(selectedWardResult.leading_votes || 0).toLocaleString()}{" "}
                        votes)
                    </Typography>
                )}
            </Box>
        );
    };

    const renderRightSide = () => {
        switch (step) {
            case "counties":
                return renderCountySummary();
            case "constituencies":
                return renderConstituencySummary();
            case "wards":
                return renderWardSummary();
            default:
                return renderNationalSummary();
        }
    };

    // ------------------ LEFT LISTS (ROW-BASED FILTERS) ------------------

    const renderList = () => {
        // This mimics the first component: the list itself is the filter
        if (step === "national" || step === "counties") {
            return (
                <Box>
                    <Typography
                        sx={{
                            mb: 1,
                            fontSize: 13,
                            color: "#9ca3af",
                            textTransform: "uppercase",
                        }}
                    >
                        Counties (47)
                    </Typography>
                    <Stack spacing={0.5}>
                        {countyNames.map((name) => (
                            <Box
                                key={name}
                                sx={{
                                    px: 1.25,
                                    py: 0.75,
                                    borderRadius: 1.5,
                                    bgcolor:
                                        selectedCounty === name
                                            ? "rgba(244,54,67,0.18)"
                                            : "rgba(17,24,39,0.6)",
                                    border:
                                        selectedCounty === name
                                            ? `1px solid ${primaryMain}`
                                            : "1px solid rgba(55,65,81,0.8)",
                                    cursor: "pointer",
                                    "&:hover": {
                                        bgcolor:
                                            selectedCounty === name
                                                ? "rgba(244,54,67,0.25)"
                                                : "rgba(31,41,55,0.9)",
                                    },
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                                onClick={() => handleCountyChange(null, name)}
                            >
                                <Typography
                                    sx={{ fontSize: 13.5, color: "#f9fafb", fontWeight: 500 }}
                                >
                                    {name}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            );
        }

        if (step === "constituencies" || step === "wards") {
            return (
                <Box>
                    <Typography
                        sx={{
                            mb: 1,
                            fontSize: 13,
                            color: "#9ca3af",
                            textTransform: "uppercase",
                        }}
                    >
                        Constituencies in {selectedCounty}
                    </Typography>
                    <Stack spacing={0.5}>
                        {constituencyNames.map((name) => (
                            <Box
                                key={name}
                                sx={{
                                    px: 1.25,
                                    py: 0.75,
                                    borderRadius: 1.5,
                                    bgcolor:
                                        selectedConstituency === name
                                            ? "rgba(244,54,67,0.18)"
                                            : "rgba(17,24,39,0.6)",
                                    border:
                                        selectedConstituency === name
                                            ? `1px solid ${primaryMain}`
                                            : "1px solid rgba(55,65,81,0.8)",
                                    cursor: "pointer",
                                    "&:hover": {
                                        bgcolor:
                                            selectedConstituency === name
                                                ? "rgba(244,54,67,0.25)"
                                                : "rgba(31,41,55,0.9)",
                                    },
                                }}
                                onClick={() => handleConstituencyChange(null, name)}
                            >
                                <Typography
                                    sx={{ fontSize: 13.5, color: "#f9fafb", fontWeight: 500 }}
                                >
                                    {name}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>

                    {step === "wards" && wardNames.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Typography
                                sx={{
                                    mb: 1,
                                    fontSize: 13,
                                    color: "#9ca3af",
                                    textTransform: "uppercase",
                                }}
                            >
                                Wards in {selectedConstituency}
                            </Typography>
                            <Stack spacing={0.5}>
                                {wardNames.map((name) => (
                                    <Box
                                        key={name}
                                        sx={{
                                            px: 1.25,
                                            py: 0.6,
                                            borderRadius: 1.5,
                                            bgcolor:
                                                selectedWard === name
                                                    ? "rgba(244,54,67,0.30)"
                                                    : "rgba(17,24,39,0.6)",
                                            border:
                                                selectedWard === name
                                                    ? `1px solid ${primaryMain}`
                                                    : "1px solid rgba(55,65,81,0.8)",
                                            cursor: "pointer",
                                            "&:hover": {
                                                bgcolor:
                                                    selectedWard === name
                                                        ? "rgba(244,54,67,0.40)"
                                                        : "rgba(31,41,55,0.9)",
                                            },
                                        }}
                                        onClick={() => handleWardChange(null, name)}
                                    >
                                        <Typography
                                            sx={{
                                                fontSize: 13.5,
                                                color: "#f9fafb",
                                                fontWeight: 500,
                                            }}
                                        >
                                            {name}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Box>
            );
        }

        return null;
    };

    // ------------------ BREADCRUMB + STEP HEADER ------------------

    const stepNumber =
        step === "national" ? 1 : step === "counties" ? 2 : step === "constituencies" ? 3 : 4;

    const stepLabelMap: Record<Step, string> = {
        national: "National overview",
        counties: "Drill down to counties",
        constituencies: "Drill down to constituencies",
        wards: "View ward-level results",
    };

    const handleBreadcrumbToNational = () => {
        setStep("national");
        setSelectedCounty(null);
        setSelectedConstituency(null);
        setSelectedWard(null);
    };

    const handleBreadcrumbToCounty = () => {
        if (!selectedCounty) return;
        setStep("counties");
        setSelectedConstituency(null);
        setSelectedWard(null);
    };

    const handleBreadcrumbToConstituency = () => {
        if (!selectedConstituency) return;
        setStep("constituencies");
        setSelectedWard(null);
    };

    // ------------------ RENDER ------------------

    return (
        <Paper
            sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(15,23,42,0.96)",
                border: "1px solid rgba(148,163,184,0.4)",
            }}
        >
            {/* Header like NationalTurnoutDrilldown */}
            <Stack
                direction={isMobile ? "column" : "row"}
                justifyContent="space-between"
                alignItems={isMobile ? "flex-start" : "center"}
                spacing={1}
                sx={{ mb: 2 }}
            >
                <Box>
                    <Typography
                        variant="h6"
                        sx={{ color: "#f9fafb", fontWeight: 700, mb: 0.5 }}
                    >
                        Presidential Results Drilldown
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>
                        Step {stepNumber} of 4 – {stepLabelMap[step]}
                    </Typography>
                </Box>
            </Stack>

            {/* Filters row (Autocomplete) */}
            <Stack
                direction={isMobile ? "column" : "row"}
                spacing={2}
                sx={{ mb: 2 }}
            >
                <Autocomplete
                    size="small"
                    sx={{ minWidth: 200 }}
                    options={countyNames}
                    value={selectedCounty}
                    onChange={handleCountyChange}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="County"
                            placeholder="All counties"
                            variant="outlined"
                        />
                    )}
                />

                <Autocomplete
                    size="small"
                    sx={{ minWidth: 220 }}
                    options={constituencyNames}
                    value={selectedConstituency}
                    onChange={handleConstituencyChange}
                    disabled={!selectedCounty}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Constituency"
                            placeholder={
                                selectedCounty ? "Choose constituency" : "Select county first"
                            }
                            variant="outlined"
                        />
                    )}
                />

                <Autocomplete
                    size="small"
                    sx={{ minWidth: 220 }}
                    options={wardNames}
                    value={selectedWard}
                    onChange={handleWardChange}
                    disabled={!selectedConstituency || wardNames.length === 0}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Ward"
                            placeholder={
                                selectedConstituency
                                    ? wardNames.length
                                        ? "Choose ward"
                                        : "No ward data yet"
                                    : "Select constituency first"
                            }
                            variant="outlined"
                        />
                    )}
                />
            </Stack>

            {/* Breadcrumb like NationalTurnoutDrilldown */}
            <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                    onClick={handleBreadcrumbToNational}
                    sx={{
                        p: 0,
                        minWidth: "auto",
                        fontSize: 12,
                        textTransform: "none",
                        color: "#9ca3af",
                    }}
                >
                    All counties
                </Button>
                {selectedCounty && (
                    <>
                        <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{`>`}</Typography>
                        <Button
                            onClick={handleBreadcrumbToCounty}
                            sx={{
                                p: 0,
                                minWidth: "auto",
                                fontSize: 12,
                                textTransform: "none",
                                color:
                                    step === "counties" ? "#f9fafb" : "#9ca3af",
                                fontWeight: step === "counties" ? 600 : 400,
                            }}
                        >
                            {selectedCounty}
                        </Button>
                    </>
                )}
                {selectedConstituency && (
                    <>
                        <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{`>`}</Typography>
                        <Button
                            onClick={handleBreadcrumbToConstituency}
                            sx={{
                                p: 0,
                                minWidth: "auto",
                                fontSize: 12,
                                textTransform: "none",
                                color:
                                    step === "constituencies" ? "#f9fafb" : "#9ca3af",
                                fontWeight: step === "constituencies" ? 600 : 400,
                            }}
                        >
                            {selectedConstituency}
                        </Button>
                    </>
                )}
                {selectedWard && (
                    <>
                        <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{`>`}</Typography>
                        <Typography
                            sx={{
                                fontSize: 12,
                                color: step === "wards" ? "#f9fafb" : "#9ca3af",
                                fontWeight: step === "wards" ? 600 : 400,
                            }}
                        >
                            {selectedWard}
                        </Typography>
                    </>
                )}
            </Box>

            <Divider sx={{ borderColor: "rgba(55,65,81,0.8)", mb: 2 }} />

            {/* Main layout: list left, summary right */}
            <Stack
                direction={isMobile ? "column" : "row"}
                spacing={2}
                alignItems="flex-start"
            >
                <Box sx={{ flex: 1 }}>{renderList()}</Box>

                <Box
                    sx={{
                        flex: 1,
                        borderRadius: 2,
                        border: "1px solid rgba(55,65,81,0.9)",
                        bgcolor: "rgba(15,23,42,0.9)",
                        p: 2,
                    }}
                >
                    {renderRightSide()}
                </Box>
            </Stack>
        </Paper>
    );
};

export default ResultsDrilldown;
