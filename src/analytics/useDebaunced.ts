// src/analytics/hooks/useDebounced.ts
import { useEffect, useState } from 'react';
export const useDebounced = <T,>(value: T, delay = 350) => {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
    return v;
};
