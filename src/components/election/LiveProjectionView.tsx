// src/components/election/LiveProjectionView.tsx
import React, { useMemo } from "react";
import {
    Box,
    Typography,
    Stack,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { motion } from "framer-motion";
import { CandidateResult } from "../../types/election";

// Placeholder now uses project red as the accent color
const PLACEHOLDER =
    "https://via.placeholder.com/300/F5333F/FFFFFF?text=No+Photo";

/**
 * Smart image URL builder
 * - Uses full URLs as-is
 * - For DB paths like "uploads/..." it prefixes your domain
 */
const buildImgUrl = (path: string | null) => {
    if (!path) return PLACEHOLDER;

    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    const normalized = path.replace(/^\/+/, "");
    return `https://skizagroundsuite.com/${normalized}`;
};

const percent = (part: number, total: number) =>
    total > 0 ? (part / total) * 100 : 0;

interface LiveProjectionViewProps {
    nationalResults: CandidateResult[];
    totalNationalVotes: number;
    parties: string[];
}

const LiveProjectionView: React.FC<LiveProjectionViewProps> = ({
    nationalResults,
    totalNationalVotes,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const primaryMain = theme.palette.primary.main;
    const primaryLight = theme.palette.primary.light || primaryMain;
    const primaryDark = theme.palette.primary.dark || primaryMain;
    const primaryContrast =
        theme.palette.primary.contrastText || "#ffffff"; // text on red

    // Sort best → worst
    const orderedResults = useMemo(
        () =>
            [...nationalResults].sort(
                (a, b) => Number(b.total_votes) - Number(a.total_votes)
            ),
        [nationalResults]
    );

    const handleImgError = (
        e: React.SyntheticEvent<HTMLImageElement, Event>
    ) => {
        const img = e.currentTarget;
        if (img.src !== PLACEHOLDER) img.src = PLACEHOLDER;
    };

    return (
        <Box
            sx={{
                maxWidth: 1040,
                mx: "auto",
                mt: 1,
                px: { xs: 0.5, sm: 2 },
            }}
        >
            <Stack spacing={isMobile ? 2 : 2.5}>
                {orderedResults.map((candidate, index) => {
                    const isLeading = index === 0;
                    const votesNumber = Number(candidate.total_votes);
                    const votesText = votesNumber.toLocaleString();
                    const p = percent(votesNumber, totalNationalVotes);

                    const MotionRow = motion(Box);

                    return (
                        <MotionRow
                            key={candidate.candidate_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: index * 0.05 }}
                        >
                            {/* DARK CARD BACKGROUND – ensures all text is readable */}
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "stretch",
                                    gap: { xs: 1.5, sm: 2.5 },
                                    width: "100%",
                                    maxWidth: 960,
                                    p: { xs: 1.5, sm: 2 },
                                    borderRadius: 3,
                                    bgcolor: "#171717", // solid dark background behind ALL text
                                    border: "1px solid #333333",
                                    boxShadow: "0 18px 30px rgba(0,0,0,0.65)",
                                }}
                            >
                                {/* Portrait – gradient only around photo */}
                                <motion.div
                                    whileHover={{ scale: 1.03, y: -3 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                    style={{ flexShrink: 0 }}
                                >
                                    <Box
                                        sx={{
                                            position: "relative",
                                            borderRadius: 2.5,
                                            p: 0.6,
                                            background: isLeading
                                                ? `linear-gradient(135deg, ${primaryLight}, ${primaryDark})`
                                                : "linear-gradient(135deg, #4b5563, #6b7280)", // grey for non-leaders
                                            boxShadow: isLeading
                                                ? "0 22px 45px rgba(0,0,0,0.9)"
                                                : "0 16px 30px rgba(0,0,0,0.75)",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={buildImgUrl(candidate.photo_path)}
                                            alt={candidate.candidate_name}
                                            onError={handleImgError}
                                            sx={{
                                                position: "relative",
                                                display: "block",
                                                width: { xs: 110, sm: 140 },
                                                height: { xs: 135, sm: 170 },
                                                borderRadius: 2,
                                                objectFit: "cover",
                                                backgroundColor: "#ffffff",
                                            }}
                                        />
                                    </Box>
                                </motion.div>

                                {/* Text + stats – all on dark background */}
                                <Box
                                    sx={{
                                        flexGrow: 1,
                                        minWidth: 0,
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                        pt: { xs: 0.5, sm: 1 },
                                    }}
                                >
                                    {/* Name + party */}
                                    <Box sx={{ mb: 1 }}>
                                        <Typography
                                            sx={{
                                                fontWeight: 800,
                                                fontSize: { xs: 18, sm: 22 },
                                                textTransform: "uppercase",
                                                lineHeight: 1.1,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                color: primaryMain, // bright brand red for ALL names
                                            }}
                                        >
                                            {candidate.candidate_name}
                                        </Typography>

                                        <Typography
                                            sx={{
                                                mt: 0.4,
                                                fontSize: { xs: 12, sm: 13.5 },
                                                color: "rgba(229,231,235,0.9)", // light grey on dark bg
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {candidate.party_name}
                                        </Typography>
                                    </Box>

                                    {/* Stats row */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexDirection: { xs: "column", sm: "row" },
                                            alignItems: { xs: "flex-start", sm: "center" },
                                            justifyContent: "space-between",
                                            gap: { xs: 0.75, sm: 1.5 },
                                        }}
                                    >
                                        {/* Left: percentage in RED PILL (theme color) */}
                                        <Box
                                            sx={{
                                                display: "inline-flex",
                                                flexDirection: "column",
                                                alignItems: "flex-start",
                                                justifyContent: "center",
                                                px: 1.6,
                                                py: 0.9,
                                                borderRadius: 999,
                                                bgcolor: primaryMain,
                                                color: primaryContrast, // usually white
                                                minWidth: { sm: 150 },
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontWeight: 900,
                                                    fontSize: { xs: 20, sm: 24 },
                                                    letterSpacing: 0.3,
                                                    color: "inherit",
                                                    lineHeight: 1,
                                                }}
                                            >
                                                {totalNationalVotes > 0
                                                    ? `${p.toFixed(2)}%`
                                                    : "0.00%"}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    mt: 0.4,
                                                    fontSize: { xs: 11, sm: 12.5 },
                                                    color: "inherit",
                                                    opacity: 0.95,
                                                }}
                                            >
                                                of valid votes
                                            </Typography>
                                        </Box>

                                        {/* Middle: votes */}
                                        <Box
                                            sx={{
                                                textAlign: { xs: "left", sm: "center" },
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: { xs: 18, sm: 20 },
                                                    color: "#ffffff", // pure white for numbers
                                                }}
                                            >
                                                {votesText}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    fontSize: { xs: 12, sm: 13 },
                                                    color: "rgba(229,231,235,0.85)",
                                                }}
                                            >
                                                total votes
                                            </Typography>
                                        </Box>

                                        {/* Right: progress bar – red on dark track */}
                                        <Box
                                            sx={{
                                                flexGrow: 1,
                                                width: { xs: "100%", sm: "45%" },
                                                minWidth: { sm: 160 },
                                                mt: { xs: 0.75, sm: 0 },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    height: 10,
                                                    borderRadius: 999,
                                                    overflow: "hidden",
                                                    backgroundColor: "#27272a", // dark grey track
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        height: "100%",
                                                        width: `${p}%`,
                                                        transition: "width 0.4s ease-out",
                                                        background: `linear-gradient(90deg, ${primaryMain}, ${primaryLight})`,
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        </MotionRow>
                    );
                })}
            </Stack>

            {/* Footer summary */}
            <Box
                sx={{
                    mt: 3,
                    textAlign: "center",
                    color: "rgba(229,231,235,0.85)",
                    fontSize: { xs: 12, sm: 13 },
                }}
            >
                Total votes counted:{" "}
                <strong style={{ color: "#ffffff" }}>
                    {totalNationalVotes.toLocaleString()}
                </strong>
            </Box>
        </Box>
    );
};

export default LiveProjectionView;
