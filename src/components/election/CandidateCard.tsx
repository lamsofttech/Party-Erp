// src/components/election/CandidateCard.tsx
import React from "react";
import {
    Avatar,
    Box,
    Card,
    CardContent,
    LinearProgress,
    Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import AnimatedCount from "./AnimatedCount";
import { CandidateResult } from "../../types/election";
import { buildImgUrl, percent } from "../../utils/electionHelpers";

interface CandidateCardProps {
    candidate: CandidateResult;
    totalNationalVotes: number;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
    candidate,
    totalNationalVotes,
}) => {
    const percentage = percent(
        Number(candidate.total_votes),
        totalNationalVotes
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            whileHover={{ scale: 1.02 }}
        >
            <Card
                sx={{
                    display: "flex",
                    p: 2,
                    alignItems: "center",
                    height: "100%",
                }}
            >
                <Avatar
                    src={buildImgUrl(candidate.photo_path)}
                    alt={candidate.candidate_name}
                    sx={{
                        width: { xs: 52, sm: 60 },
                        height: { xs: 52, sm: 60 },
                        mr: 2,
                        border: "2px solid",
                    }}
                />
                <CardContent sx={{ flexGrow: 1, p: 0 }}>
                    <Typography
                        variant="subtitle1"
                        component="div"
                        sx={{ fontWeight: "bold" }}
                    >
                        {candidate.candidate_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                        {candidate.party_name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                        <Box sx={{ width: "100%", mr: 1 }}>
                            <LinearProgress
                                variant="determinate"
                                value={percentage}
                            />
                        </Box>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ minWidth: 52, textAlign: "right" }}
                        >
                            {totalNationalVotes > 0 ? `${percentage.toFixed(1)}%` : "0%"}
                        </Typography>
                    </Box>
                    <AnimatedCount end={Number(candidate.total_votes)} />
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default CandidateCard;
