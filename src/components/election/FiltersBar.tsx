import React, { useEffect, useState, useCallback } from "react";
import {
    Box,
    Button,
    Chip,
    Checkbox,
    FormControl,
    InputLabel,
    ListItemText,
    MenuItem,
    OutlinedInput,
    Paper,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
    Alert,
    Skeleton,
} from "@mui/material";
import ClearAllRoundedIcon from "@mui/icons-material/ClearAllRounded";
import { FiltersState } from "../../types/election";
import { useDebounced } from "../../utils/electionHelpers";

/* -------------------- Geo types -------------------- */
interface County {
    id: string;
    name: string;
    code: string;
}
interface Constituency {
    id: string;
    name: string;
    county_code: string;
}
interface Ward {
    id: string;
    name: string;
    const_code: string;
}
interface PollingStationLite {
    id: string;
    name: string;
    ward_code: string;
}

/* -------------------- Small helpers (same style as RecruitManageAgentsPage) -------------------- */
const fetchWithTimeout = async (
    url: string,
    timeoutMs = 12000,
    init?: RequestInit
) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            ...init,
            signal: ctrl.signal,
            credentials: "include",
        });
        return res;
    } finally {
        clearTimeout(t);
    }
};

const cacheGet = (k: string) => sessionStorage.getItem(k);
const cacheSet = (k: string, v: unknown) =>
    sessionStorage.setItem(k, JSON.stringify(v));
const fromCache = <T,>(k: string): T | null => {
    const raw = cacheGet(k);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

interface FiltersBarProps {
    parties: string[];
    filters: FiltersState;
    onChange: (patch: Partial<FiltersState>) => void;
    onReset: () => void;
}

const FiltersBar: React.FC<FiltersBarProps> = ({
    parties,
    filters,
    onChange,
    onReset,
}) => {
    const debouncedQuery = useDebounced(filters.query);

    // Geo data
    const [counties, setCounties] = useState<County[]>([]);
    const [constituencies, setConstituencies] = useState<Constituency[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);
    const [stations, setStations] = useState<PollingStationLite[]>([]);

    // Loading & errors
    const [loadingCounties, setLoadingCounties] = useState(true);
    const [loadingConstituencies, setLoadingConstituencies] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);
    const [loadingStations, setLoadingStations] = useState(false);

    const [errCounties, setErrCounties] = useState<string | null>(null);
    const [errConstituencies, setErrConstituencies] = useState<string | null>(
        null
    );
    const [errWards, setErrWards] = useState<string | null>(null);
    const [errStations, setErrStations] = useState<string | null>(null);

    /* -------------- Debounced query sync -------------- */
    useEffect(() => {
        // When the user types, useDebounced will lag behind. Once it settles, push it upward.
        // IMPORTANT: Only push when different to avoid loops.
        if (debouncedQuery !== filters.query) {
            onChange({ query: debouncedQuery });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQuery]);

    /* -------------- Fetch: Counties (47) -------------- */
    useEffect(() => {
        let alive = true;
        (async () => {
            setLoadingCounties(true);
            setErrCounties(null);

            const cacheKey = "election:counties:v1";
            const cached = fromCache<any>(cacheKey);
            if (cached?.status === "success" && Array.isArray(cached.data)) {
                if (!alive) return;
                setCounties(
                    cached.data.map((it: any) => ({
                        id: it.county_code,
                        name: it.county_name,
                        code: it.county_code,
                    }))
                );
                setLoadingCounties(false);
                return;
            }

            try {
                const res = await fetchWithTimeout(
                    "https://skizagroundsuite.com/API/get_counties.php"
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                cacheSet(cacheKey, json);
                if (!alive) return;

                if (json?.status === "success" && Array.isArray(json.data)) {
                    setCounties(
                        json.data.map((it: any) => ({
                            id: it.county_code,
                            name: it.county_name,
                            code: it.county_code,
                        }))
                    );
                } else {
                    throw new Error("Bad counties format");
                }
            } catch (e: any) {
                if (!alive) return;
                setErrCounties(e?.message || "Failed to load counties");
                setCounties([]);
            } finally {
                if (alive) setLoadingCounties(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    /* -------------- Fetch: Constituencies (per county) -------------- */
    useEffect(() => {
        const countyCode = filters.countyCode;

        // If county cleared, clear everything downstream
        if (!countyCode) {
            setConstituencies([]);
            setWards([]);
            setStations([]);
            setErrConstituencies(null);
            setErrWards(null);
            setErrStations(null);
            return;
        }

        let alive = true;
        (async () => {
            setLoadingConstituencies(true);
            setErrConstituencies(null);

            const cacheKey = `election:constituencies:${countyCode}:v1`;
            const cached = fromCache<any>(cacheKey);
            if (cached?.status === "success" && Array.isArray(cached.data)) {
                if (!alive) return;
                setConstituencies(
                    cached.data.map((it: any) => ({
                        id: it.const_code,
                        name: it.constituency_name,
                        county_code: countyCode,
                    }))
                );
                setLoadingConstituencies(false);
                return;
            }

            try {
                const res = await fetchWithTimeout(
                    `https://skizagroundsuite.com/API/get_constituencies.php?county_code=${encodeURIComponent(
                        countyCode
                    )}`
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                cacheSet(cacheKey, json);
                if (!alive) return;

                if (json?.status === "success" && Array.isArray(json.data)) {
                    setConstituencies(
                        json.data.map((it: any) => ({
                            id: it.const_code,
                            name: it.constituency_name,
                            county_code: countyCode,
                        }))
                    );
                } else {
                    throw new Error("Bad constituencies format");
                }
            } catch (e: any) {
                if (!alive) return;
                setErrConstituencies(e?.message || "Failed to load constituencies");
                setConstituencies([]);
            } finally {
                if (alive) setLoadingConstituencies(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [filters.countyCode]);

    /* -------------- Fetch: Wards (per constituency) -------------- */
    useEffect(() => {
        const constCode = filters.constituencyCode;

        if (!constCode) {
            setWards([]);
            setStations([]);
            setErrWards(null);
            setErrStations(null);
            return;
        }

        let alive = true;
        (async () => {
            setLoadingWards(true);
            setErrWards(null);

            const cacheKey = `election:wards:${constCode}:v1`;
            const cached = fromCache<any>(cacheKey);
            if (cached?.status === "success" && Array.isArray(cached.data)) {
                if (!alive) return;
                setWards(
                    cached.data.map((it: any) => ({
                        id: it.ward_code,
                        name: it.ward_name,
                        const_code: constCode,
                    }))
                );
                setLoadingWards(false);
                return;
            }

            try {
                const res = await fetchWithTimeout(
                    `https://skizagroundsuite.com/API/get_wards.php?const_code=${encodeURIComponent(
                        constCode
                    )}`
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                cacheSet(cacheKey, json);
                if (!alive) return;

                if (json?.status === "success" && Array.isArray(json.data)) {
                    setWards(
                        json.data.map((it: any) => ({
                            id: it.ward_code,
                            name: it.ward_name,
                            const_code: constCode,
                        }))
                    );
                } else {
                    throw new Error("Bad wards format");
                }
            } catch (e: any) {
                if (!alive) return;
                setErrWards(e?.message || "Failed to load wards");
                setWards([]);
            } finally {
                if (alive) setLoadingWards(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [filters.constituencyCode]);

    /* -------------- Fetch: Polling Stations (per ward) -------------- */
    useEffect(() => {
        const wardCode = filters.wardCode;

        if (!wardCode) {
            setStations([]);
            setErrStations(null);
            return;
        }

        let alive = true;
        (async () => {
            setLoadingStations(true);
            setErrStations(null);

            const cacheKey = `election:stations:${wardCode}:v1`;
            const cached = fromCache<any>(cacheKey);
            if (
                cached?.status === "success" &&
                Array.isArray(cached.polling_centers)
            ) {
                if (!alive) return;
                setStations(
                    cached.polling_centers.map((it: any) => ({
                        id: String(it.id),
                        name: it.polling_station_name,
                        ward_code: wardCode,
                    }))
                );
                setLoadingStations(false);
                return;
            }

            try {
                const res = await fetchWithTimeout(
                    `https://skizagroundsuite.com/API/get_polling_stations.php?ward_code=${encodeURIComponent(
                        wardCode
                    )}`
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                cacheSet(cacheKey, json);
                if (!alive) return;

                if (json?.status === "success" && Array.isArray(json.polling_centers)) {
                    setStations(
                        json.polling_centers.map((it: any) => ({
                            id: String(it.id),
                            name: it.polling_station_name,
                            ward_code: wardCode,
                        }))
                    );
                } else {
                    throw new Error("Bad polling station format");
                }
            } catch (e: any) {
                if (!alive) return;
                setErrStations(e?.message || "Failed to load polling stations");
                setStations([]);
            } finally {
                if (alive) setLoadingStations(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [filters.wardCode]);

    /* -------------- Handlers (cascade) -------------- */
    const handleCountyChange = useCallback(
        (code: string) => {
            onChange({
                countyCode: code || null,
                constituencyCode: null,
                wardCode: null,
                stationId: null,
            });
        },
        [onChange]
    );

    const handleConstituencyChange = useCallback(
        (code: string) => {
            onChange({
                constituencyCode: code || null,
                wardCode: null,
                stationId: null,
            });
        },
        [onChange]
    );

    const handleWardChange = useCallback(
        (code: string) => {
            onChange({
                wardCode: code || null,
                stationId: null,
            });
        },
        [onChange]
    );

    const handleStationChange = useCallback(
        (id: string) => {
            onChange({
                stationId: id || null,
            });
        },
        [onChange]
    );

    /* -------------- Render -------------- */
    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 2,
                border: "1px solid #333",
            }}
        >
            <Stack spacing={2}>
                {/* Header + reset */}
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary" }}>
                        Filters
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title="Reset all filters">
                        <Button
                            startIcon={<ClearAllRoundedIcon />}
                            onClick={onReset}
                            variant="outlined"
                            size="small"
                        >
                            Reset
                        </Button>
                    </Tooltip>
                </Stack>

                {/* GEO CASCADE (county → constituency → ward → station) */}
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", md: "flex-end" }}
                >
                    {/* County */}
                    <FormControl
                        fullWidth
                        size="small"
                        sx={{ minWidth: 180, flex: "1 1 180px" }}
                    >
                        <InputLabel id="county-select-label">County</InputLabel>
                        {loadingCounties ? (
                            <Skeleton variant="rounded" height={40} />
                        ) : errCounties ? (
                            <Alert severity="error">{errCounties}</Alert>
                        ) : (
                            <Select
                                labelId="county-select-label"
                                value={filters.countyCode ?? ""}
                                label="County"
                                onChange={(e) => handleCountyChange(e.target.value as string)}
                            >
                                <MenuItem value="">
                                    <em>All counties (47)</em>
                                </MenuItem>
                                {counties.map((c) => (
                                    <MenuItem key={c.id} value={c.code}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        )}
                    </FormControl>

                    {/* Constituency */}
                    <FormControl
                        fullWidth
                        size="small"
                        sx={{ minWidth: 180, flex: "1 1 180px" }}
                        disabled={!filters.countyCode}
                    >
                        <InputLabel id="constituency-select-label">Constituency</InputLabel>
                        {loadingConstituencies ? (
                            <Skeleton variant="rounded" height={40} />
                        ) : errConstituencies ? (
                            <Alert severity="error">{errConstituencies}</Alert>
                        ) : (
                            <Select
                                labelId="constituency-select-label"
                                value={filters.constituencyCode ?? ""}
                                label="Constituency"
                                onChange={(e) => handleConstituencyChange(e.target.value as string)}
                            >
                                <MenuItem value="">
                                    <em>
                                        {filters.countyCode ? "All constituencies" : "Select county"}
                                    </em>
                                </MenuItem>
                                {constituencies.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        )}
                    </FormControl>

                    {/* Ward */}
                    <FormControl
                        fullWidth
                        size="small"
                        sx={{ minWidth: 180, flex: "1 1 180px" }}
                        disabled={!filters.constituencyCode}
                    >
                        <InputLabel id="ward-select-label">Ward</InputLabel>
                        {loadingWards ? (
                            <Skeleton variant="rounded" height={40} />
                        ) : errWards ? (
                            <Alert severity="error">{errWards}</Alert>
                        ) : (
                            <Select
                                labelId="ward-select-label"
                                value={filters.wardCode ?? ""}
                                label="Ward"
                                onChange={(e) => handleWardChange(e.target.value as string)}
                            >
                                <MenuItem value="">
                                    <em>
                                        {filters.constituencyCode
                                            ? "All wards"
                                            : "Select constituency"}
                                    </em>
                                </MenuItem>
                                {wards.map((w) => (
                                    <MenuItem key={w.id} value={w.id}>
                                        {w.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        )}
                    </FormControl>

                    {/* Polling station */}
                    <FormControl
                        fullWidth
                        size="small"
                        sx={{ minWidth: 220, flex: "1 1 220px" }}
                        disabled={!filters.wardCode}
                    >
                        <InputLabel id="station-select-label">Polling station</InputLabel>
                        {loadingStations ? (
                            <Skeleton variant="rounded" height={40} />
                        ) : errStations ? (
                            <Alert severity="error">{errStations}</Alert>
                        ) : (
                            <Select
                                labelId="station-select-label"
                                value={filters.stationId ?? ""}
                                label="Polling station"
                                onChange={(e) => handleStationChange(e.target.value as string)}
                            >
                                <MenuItem value="">
                                    <em>
                                        {filters.wardCode ? "All polling stations" : "Select ward"}
                                    </em>
                                </MenuItem>
                                {stations.map((s) => (
                                    <MenuItem key={s.id} value={s.id}>
                                        {s.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        )}
                    </FormControl>
                </Stack>

                {/* Search + party + rejected + sort */}
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Search (county / constituency / ward / station)"
                        value={filters.query}
                        onChange={(e) => onChange({ query: e.target.value })}
                        placeholder="Type a name…"
                    />

                    <FormControl fullWidth size="small">
                        <InputLabel id="party-filter">Party</InputLabel>
                        <Select
                            labelId="party-filter"
                            multiple
                            value={filters.parties}
                            onChange={(e) =>
                                onChange({
                                    parties:
                                        typeof e.target.value === "string"
                                            ? e.target.value.split(",")
                                            : (e.target.value as string[]),
                                })
                            }
                            input={<OutlinedInput label="Party" />}
                            renderValue={(selected) => (selected as string[]).join(", ")}
                        >
                            {parties.map((p) => (
                                <MenuItem key={p} value={p}>
                                    <Checkbox checked={filters.parties.indexOf(p) > -1} />
                                    <ListItemText primary={p} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                        <InputLabel id="rejected-filter">Rejected votes</InputLabel>
                        <Select
                            labelId="rejected-filter"
                            value={filters.includeRejected}
                            label="Rejected votes"
                            onChange={(e) =>
                                onChange({
                                    includeRejected: e.target.value as FiltersState["includeRejected"],
                                })
                            }
                        >
                            <MenuItem value="all">Show all</MenuItem>
                            <MenuItem value="with">Only with rejected</MenuItem>
                            <MenuItem value="without">Exclude rejected</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                        <InputLabel id="sortby">Sort by</InputLabel>
                        <Select
                            labelId="sortby"
                            value={filters.sortBy}
                            label="Sort by"
                            onChange={(e) =>
                                onChange({
                                    sortBy: e.target.value as FiltersState["sortBy"],
                                })
                            }
                        >
                            <MenuItem value="votes_desc">Votes (high → low)</MenuItem>
                            <MenuItem value="votes_asc">Votes (low → high)</MenuItem>
                            <MenuItem value="rejected_desc">Rejected (high → low)</MenuItem>
                            <MenuItem value="name_asc">Name (A → Z)</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>

                {/* Active filter chips */}
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {filters.query && (
                        <Chip
                            size="small"
                            color="primary"
                            label={`Search: ${filters.query}`}
                            onDelete={() => onChange({ query: "" })}
                        />
                    )}
                    {filters.parties.map((p) => (
                        <Chip
                            key={p}
                            size="small"
                            color="secondary"
                            label={p}
                            onDelete={() =>
                                onChange({
                                    parties: filters.parties.filter((x) => x !== p),
                                })
                            }
                        />
                    ))}
                    {filters.includeRejected !== "all" && (
                        <Chip
                            size="small"
                            label={
                                filters.includeRejected === "with"
                                    ? "Only with rejected"
                                    : "Exclude rejected"
                            }
                            onDelete={() => onChange({ includeRejected: "all" })}
                        />
                    )}
                </Stack>
            </Stack>
        </Paper>
    );
};

export default FiltersBar;
