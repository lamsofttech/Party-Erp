// src/analytics/components/NationalOverview.tsx
import {
    Box,
    Chip,
    Grid,
    Card,
    Avatar,
    CardContent,
    Typography,
    LinearProgress,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedCount from "./AnimatedCount";
import { percent, buildImgUrl } from "../utils";
import type { CandidateResult } from "../types";

type Props = {
    candidates: CandidateResult[];
    totalVotes: number;
    parties: string[];
};

export default function NationalOverview({ candidates, totalVotes, parties }: Props) {
    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    } as const;

    return (
        <>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 3 }}>
                <Chip
                    label={`Total Votes Counted: ${Number(totalVotes).toLocaleString()}`}
                    color="primary"
                />
                {parties.slice(0, 6).map((p) => (
                    <Chip key={p} label={p} variant="outlined" size="small" />
                ))}
            </Box>

            <Grid container spacing={3}>
                <AnimatePresence>
                    {candidates.map((candidate) => {
                        const votes = Number(candidate.total_votes || 0);
                        const pct = totalVotes > 0 ? percent(votes, totalVotes) : 0;

                        return (
                            <Grid item xs={12} sm={6} md={4} key={candidate.candidate_id}>
                                <motion.div
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    whileHover={{ scale: 1.03 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Card sx={{ display: "flex", p: 2, alignItems: "center", height: "100%" }}>
                                        <Avatar
                                            src={buildImgUrl(candidate.photo_path)}
                                            alt={candidate.candidate_name}
                                            sx={{ width: 60, height: 60, mr: 2, border: "2px solid" }}
                                        />

                                        <CardContent sx={{ flexGrow: 1, p: 0 }}>
                                            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                                                {candidate.candidate_name}
                                            </Typography>

                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                {candidate.party_name}
                                            </Typography>

                                            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                                                <Box sx={{ width: "100%", mr: 1 }}>
                                                    <LinearProgress variant="determinate" value={pct} />
                                                </Box>

                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ minWidth: 52, textAlign: "right" }}
                                                >
                                                    {totalVotes > 0 ? `${pct.toFixed(1)}%` : "0%"}
                                                </Typography>
                                            </Box>

                                            <AnimatedCount end={votes} />
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </Grid>
                        );
                    })}
                </AnimatePresence>
            </Grid>
        </>
    );
}
