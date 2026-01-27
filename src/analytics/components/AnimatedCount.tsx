import { useEffect, useMemo, useState } from "react";
import { Typography } from "@mui/material";

type Props = {
    end: number;
    durationMs?: number;
    start?: number;
};

export default function AnimatedCount({ end, durationMs = 700, start = 0 }: Props) {
    const [value, setValue] = useState(start);

    const safeEnd = useMemo(() => (Number.isFinite(end) ? end : 0), [end]);

    useEffect(() => {
        let raf = 0;
        const from = value;
        const to = safeEnd;
        const startTime = performance.now();

        const step = (t: number) => {
            const p = Math.min(1, (t - startTime) / durationMs);
            const next = Math.round(from + (to - from) * p);
            setValue(next);
            if (p < 1) raf = requestAnimationFrame(step);
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [safeEnd]);

    return (
        <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700 }}>
            {value.toLocaleString()}
        </Typography>
    );
}
