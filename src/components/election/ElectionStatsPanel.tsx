// src/components/election/ElectionStatsPanel.tsx
import React from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";

interface ElectionStatsPanelProps {
    totalValid: number;
    totalCast: number;
    nullVoid: number;
    totalRegistered: number;
    publishedCenters: number;
    totalCenters: number;
}

interface StatRowProps {
    label: string;
    value: number;
    accent: string;
}

const StatRow: React.FC<StatRowProps> = ({ label, value, accent }) => (
    <Box
        sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            columnGap: 2,
            alignItems: "baseline",
            py: 1,
            borderBottom: "1px solid rgba(148,163,184,0.25)", // subtle divider
        }}
    >
        {/* label */}
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
            }}
        >
            <Box
                sx={{
                    width: 4,
                    height: 20,
                    borderRadius: 999,
                    bgcolor: accent, // little red bar on the left
                }}
            />
            <Typography
                component="span"
                sx={{
                    fontWeight: 600,
                    fontSize: 13,
                    letterSpacing: 0.2,
                    textTransform: "uppercase",
                    color: "#4b5563", // slate-600 on light bg
                }}
            >
                {label}
            </Typography>
        </Box>

        {/* value */}
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 1,
                py: 0.35,
                borderRadius: 999,
                bgcolor: "rgba(244,54,67,0.08)", // soft red chip
            }}
        >
            <Typography
                component="span"
                sx={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#111827", // slate-900
                }}
            >
                {value.toLocaleString()}
            </Typography>
        </Box>
    </Box>
);

const ElectionStatsPanel: React.FC<ElectionStatsPanelProps> = ({
    totalValid,
    totalCast,
    nullVoid,
    totalRegistered,
    publishedCenters,
    totalCenters,
}) => {
    const theme = useTheme();
    const primaryMain = theme.palette.primary.main || "#F43643";

    return (
        <Box
            sx={{
                width: "100%",
                maxWidth: 360,
                borderRadius: 3,
                overflow: "hidden",
                bgcolor: "rgba(255,255,255,0.96)",
                border: `1px solid rgba(244,54,67,0.35)`,
                boxShadow: "0 16px 35px rgba(15,23,42,0.18)",
                position: "relative",
            }}
        >
            {/* Jubilee header strip */}
            <Box
                sx={{
                    px: 2,
                    py: 1.2,
                    bgcolor: primaryMain,
                    color: theme.palette.primary.contrastText || "#ffffff",
                }}
            >
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 800,
                        letterSpacing: 0.12,
                        textTransform: "uppercase",
                    }}
                >
                    National Tally Summary
                </Typography>
            </Box>

            {/* content */}
            <Box sx={{ p: 2 }}>
                <Stack spacing={0.5}>
                    <StatRow
                        label="Total Valid Votes"
                        value={totalValid}
                        accent={primaryMain}
                    />
                    <StatRow
                        label="Total Votes Cast"
                        value={totalCast}
                        accent={primaryMain}
                    />
                    <StatRow
                        label="Null and Void Votes"
                        value={nullVoid}
                        accent={primaryMain}
                    />
                    <StatRow
                        label="Total Registered Voters"
                        value={totalRegistered}
                        accent={primaryMain}
                    />
                    <StatRow
                        label="Published Centers"
                        value={publishedCenters}
                        accent={primaryMain}
                    />
                    <StatRow
                        label="Total Centers"
                        value={totalCenters}
                        accent={primaryMain}
                    />
                </Stack>
            </Box>
        </Box>
    );
};

export default ElectionStatsPanel;
