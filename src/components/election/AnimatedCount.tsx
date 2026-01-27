// src/components/election/AnimatedCount.tsx
import React, { useEffect, useRef } from "react";
import { Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useCountUp } from "react-countup";

interface AnimatedCountProps {
    end: number;
}

const AnimatedCount: React.FC<AnimatedCountProps> = ({ end }) => {
    const countUpRef = useRef<HTMLSpanElement | null>(null);
    const { update } = useCountUp({
        ref: countUpRef,
        start: 0,
        end,
        duration: 1.2,
        separator: ",",
        enableScrollSpy: false,
    });

    useEffect(() => {
        update(end);
    }, [end, update]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", color: "primary.main", mt: 0.5 }}
            >
                <span ref={countUpRef}>{end.toLocaleString()}</span> votes
            </Typography>
        </motion.div>
    );
};

export default AnimatedCount;
