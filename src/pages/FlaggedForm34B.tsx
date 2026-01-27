// ================================
// File: src/pages/FlaggedForm34B.tsx
// Drill-down: County -> Constituency -> Flagged rows
// Shows ONLY where flags exist
// Displays proper county/constituency NAMES (via get_counties + get_constituencies_new)
// UX upgrades:
//  - No refetch flicker when meta loads (flagged rows load once)
//  - Search on County + Constituency steps
//  - Clickable breadcrumb chips
//  - Sticky filters on detail step
//  - Debounced search on detail step
//  - Optional "loading names" indicator for constituencies
// FIX:
//  - Normalize county/const codes so "273" matches "0273" etc. (so names resolve)
//  - Fix TS1355 by typing return unions (no `as const` on expressions)
//  - Fix TS7053 by using `Headers` instance (no indexing into HeadersInit)
// ================================
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Stack,
  TextField,
  MenuItem,
  InputAdornment,
  IconButton,
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
  Divider,
  Skeleton,
} from "@mui/material";
import { motion } from "framer-motion";
import { Search, FilterList, PictureAsPdf, Visibility } from "@mui/icons-material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// ✅ Your existing API helpers
import { fetchFlagged34B, fetch34BDetails } from "../lib/electionValidation";

// ---------------- Types ----------------
type Step = "county" | "constituency" | "detail";

type County = { county_code: string | number; county_name: string };
type Constituency = { const_code: string | number; constituency_name: string };

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

type Flagged34BRecord = {
  id: string;
  county_code: string;
  const_code: string;

  issue: string;
  severity: "Low" | "Medium" | "High";
  status: "Open" | "In Review" | "Resolved";
  evidenceUrl?: string;

  issues: FlagIssue[];
};

// ---------------- Helpers ----------------
const numberFmt = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat().format(n));

/** Normalize API pct that may arrive as 0..1 or 0..100 */
const normalizePct = (p: number | null | undefined) => {
  if (p == null) return 0;
  return p > 1 ? p / 100 : p;
};

// MUI Chip color unions
type MuiChipColor = "default" | "error" | "warning" | "success";

const getSeverityColor = (s: "Low" | "Medium" | "High"): Extract<MuiChipColor, "default" | "error" | "warning"> => {
  return s === "High" ? "error" : s === "Medium" ? "warning" : "default";
};

const getStatusColor = (s: "Open" | "In Review" | "Resolved"): Extract<MuiChipColor, "error" | "warning" | "success"> => {
  return s === "Open" ? "error" : s === "In Review" ? "warning" : "success";
};

/**
 * IMPORTANT: normalize codes so mapping works even if API returns:
 *  - "273" vs 273 vs "0273" vs " 273 "
 */
const normCode = (v: any) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  // if numeric-like, collapse leading zeros by parsing
  if (/^\d+$/.test(s)) return String(parseInt(s, 10));
  return s;
};

async function fetchJSON<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Normalize any provided headers to a real Headers instance (fixes TS7053)
  const headers = new Headers(init.headers);

  if (token) {
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("X-Token")) headers.set("X-Token", token);
  }

  const res = await fetch(url, { credentials: "include", ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
  }
  return res.json() as Promise<T>;
}

const API = {
  counties: "/API/get_counties.php",
  constituencies: (countyCode: string) =>
    `/API/get_constituencies_new.php?county_code=${encodeURIComponent(countyCode)}`,
};

const FlaggedForm34B: React.FC = () => {
  // UI flow
  const [step, setStep] = useState<Step>("county");
  const [selectedCountyCode, setSelectedCountyCode] = useState<string | null>(null);
  const [selectedCountyName, setSelectedCountyName] = useState<string | null>(null);

  const [selectedConstCode, setSelectedConstCode] = useState<string | null>(null);
  const [selectedConstName, setSelectedConstName] = useState<string | null>(null);

  // loading/error
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [constMetaLoading, setConstMetaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // meta
  const [counties, setCounties] = useState<County[]>([]);
  const [constituencyMap, setConstituencyMap] = useState<Record<string, string>>({});

  const countyMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of counties) m[normCode(c.county_code)] = c.county_name;
    return m;
  }, [counties]);

  // search on drill steps
  const [countySearch, setCountySearch] = useState("");
  const [constSearch, setConstSearch] = useState("");

  // filters for the final table (debounced query)
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("All");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    const t = setTimeout(() => setQuery(queryInput), 250);
    return () => clearTimeout(t);
  }, [queryInput]);

  // data
  const [rows, setRows] = useState<Flagged34BRecord[]>([]);
  const [details, setDetails] = useState<
    (Flagged34BRecord & { county_name?: string; constituency_name?: string }) | null
  >(null);

  // ---------------- Load counties meta once ----------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setMetaLoading(true);
        const json = await fetchJSON<any>(API.counties);
        if (!alive) return;
        if (json?.status === "success" && Array.isArray(json.data)) {
          setCounties(json.data as County[]);
        } else {
          setCounties([]);
        }
      } catch {
        setCounties([]);
      } finally {
        if (alive) setMetaLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ---------------- Load flagged rows once ----------------
  const loadFlagged = async () => {
    setLoading(true);
    setError(null);

    try {
      const apiRows = await fetchFlagged34B({
        includeResolved: false,
        abs_candidate_diff: 0,
        pct_candidate_diff: 0,
        abs_registered_diff: 0,
        abs_totalcast_diff: 0,
      });

      const mapped: Flagged34BRecord[] = apiRows.map((r: any) => {
        const county_code = normCode(r.county);
        const const_code = normCode(r.constituency);

        const issues: FlagIssue[] = [
          {
            code: "DETAILS",
            message: r.issue,
            severity: r.severity,
            meta: r.detail_json,
          },
        ];

        const breaches = r.detail_json?.candidate_breaches ?? [];
        if (Array.isArray(breaches) && breaches.length) {
          const diffs = Object.fromEntries(
            breaches.map((c: any) => [
              String(c.candidate_id),
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
            message: "Candidate totals mismatch vs 34A aggregate",
            severity: "High",
            meta: { diffs },
          });
        }

        return {
          id: String(r.id),
          county_code,
          const_code,
          issue: r.issue,
          severity: r.severity,
          status: r.status,
          evidenceUrl: undefined,
          issues,
        };
      });

      setRows(mapped);
    } catch (e: any) {
      setError(e?.message || "Failed to load flagged Form 34B.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlagged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- When a county is selected, load constituencies for mapping names ----------------
  useEffect(() => {
    if (!selectedCountyCode) return;

    let alive = true;
    (async () => {
      try {
        setConstMetaLoading(true);
        const json = await fetchJSON<any>(API.constituencies(selectedCountyCode));
        if (!alive) return;

        if (json?.status === "success" && Array.isArray(json.data)) {
          const map: Record<string, string> = {};
          for (const ct of json.data as Constituency[]) {
            map[normCode(ct.const_code)] = ct.constituency_name;
          }
          setConstituencyMap(map);
        } else {
          setConstituencyMap({});
        }
      } catch {
        setConstituencyMap({});
      } finally {
        if (alive) setConstMetaLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedCountyCode]);

  // name resolvers
  const resolveCountyName = (code: string) => countyMap[normCode(code)] || selectedCountyName || normCode(code) || "—";
  const resolveConstName = (code: string) => constituencyMap[normCode(code)] || selectedConstName || normCode(code) || "—";

  // ---------------- Derived: ONLY counties with flags ----------------
  const flaggedByCounty = useMemo(() => {
    const m: Record<string, { county_code: string; count: number }> = {};
    for (const r of rows) {
      const key = normCode(r.county_code);
      if (!m[key]) m[key] = { county_code: key, count: 0 };
      m[key].count++;
    }
    return Object.values(m).sort((a, b) => b.count - a.count);
  }, [rows]);

  const filteredCounties = useMemo(() => {
    const q = countySearch.trim().toLowerCase();
    if (!q) return flaggedByCounty;

    return flaggedByCounty.filter((c) => {
      const name = resolveCountyName(c.county_code).toLowerCase();
      const code = String(c.county_code).toLowerCase();
      return name.includes(q) || code.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flaggedByCounty, countySearch, countyMap, selectedCountyName]);

  // ---------------- Derived: ONLY constituencies with flags for selected county ----------------
  const flaggedConstituencies = useMemo(() => {
    if (!selectedCountyCode) return [];
    const m: Record<string, { const_code: string; count: number }> = {};

    for (const r of rows) {
      if (normCode(r.county_code) !== normCode(selectedCountyCode)) continue;
      const key = normCode(r.const_code);
      if (!m[key]) m[key] = { const_code: key, count: 0 };
      m[key].count++;
    }

    return Object.values(m).sort((a, b) => b.count - a.count);
  }, [rows, selectedCountyCode]);

  const filteredConstituencies = useMemo(() => {
    const q = constSearch.trim().toLowerCase();
    if (!q) return flaggedConstituencies;

    return flaggedConstituencies.filter((c) => {
      const name = resolveConstName(c.const_code).toLowerCase();
      const code = String(c.const_code).toLowerCase();
      return name.includes(q) || code.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flaggedConstituencies, constSearch, constituencyMap, selectedConstName]);

  // ---------------- Final table rows (selected county+constituency only) ----------------
  const detailRows = useMemo(() => {
    return rows
      .filter((r) => {
        if (!selectedCountyCode || !selectedConstCode) return false;
        if (normCode(r.county_code) !== normCode(selectedCountyCode)) return false;
        if (normCode(r.const_code) !== normCode(selectedConstCode)) return false;

        const countyName = resolveCountyName(r.county_code);
        const constName = resolveConstName(r.const_code);

        const matchesQuery =
          !query || [r.id, countyName, constName, r.issue].join(" ").toLowerCase().includes(query.toLowerCase());
        const matchesSeverity = severity === "All" || r.severity === severity;
        const matchesStatus = status === "All" || r.status === status;

        return matchesQuery && matchesSeverity && matchesStatus;
      })
      .map((r) => ({
        ...r,
        county_name: resolveCountyName(r.county_code),
        constituency_name: resolveConstName(r.const_code),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, selectedCountyCode, selectedConstCode, query, severity, status, countyMap, constituencyMap]);

  // KPI counts for detail step
  const counts = useMemo(() => {
    const total = detailRows.length;
    const open = detailRows.filter((r: any) => r.status === "Open").length;
    const inReview = detailRows.filter((r: any) => r.status === "In Review").length;
    const resolved = detailRows.filter((r: any) => r.status === "Resolved").length;
    const high = detailRows.filter((r: any) => r.severity === "High").length;
    return { total, open, inReview, resolved, high };
  }, [detailRows]);

  // ---------------- Drill handlers ----------------
  const pickCounty = (c: { county_code: string }) => {
    const code = normCode(c.county_code);
    setSelectedCountyCode(code);
    setSelectedCountyName(resolveCountyName(code));
    setSelectedConstCode(null);
    setSelectedConstName(null);
    setConstSearch("");
    setQueryInput("");
    setSeverity("All");
    setStatus("All");
    setStep("constituency");
  };

  const pickConstituency = (ct: { const_code: string }) => {
    const code = normCode(ct.const_code);
    setSelectedConstCode(code);
    setSelectedConstName(resolveConstName(code));
    setQueryInput("");
    setSeverity("All");
    setStatus("All");
    setStep("detail");
  };

  const goBack = () => {
    if (step === "detail") {
      setStep("constituency");
      setSelectedConstCode(null);
      setSelectedConstName(null);
      setQueryInput("");
      return;
    }
    if (step === "constituency") {
      setStep("county");
      setSelectedCountyCode(null);
      setSelectedCountyName(null);
      setSelectedConstCode(null);
      setSelectedConstName(null);
      setCountySearch("");
      return;
    }
  };

  const openDetails = async (row: any) => {
    try {
      const idNum = parseInt(String(row.id), 10);
      const county_name = resolveCountyName(row.county_code);
      const constituency_name = resolveConstName(row.const_code);

      if (!Number.isFinite(idNum)) return setDetails({ ...row, county_name, constituency_name });

      const diffs = await fetch34BDetails(idNum);
      const mappedDiffs = Object.fromEntries(
        diffs.map((c: any) => [
          String(c.candidate_id),
          {
            a: c.a_votes,
            b: c.b_votes,
            diff: c.diff,
            pct: normalizePct(c.pct),
          },
        ])
      );

      const withDetails = {
        ...row,
        county_name,
        constituency_name,
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
    } catch {
      const county_name = resolveCountyName(row.county_code);
      const constituency_name = resolveConstName(row.const_code);
      setDetails({ ...row, county_name, constituency_name });
    }
  };

  const clearFilters = () => {
    setQueryInput("");
    setSeverity("All");
    setStatus("All");
  };

  // ---------------- Loading/Error ----------------
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
        <Alert severity="error">{error}</Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={loadFlagged}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, bgcolor: "#f4f6f8", minHeight: "100vh" }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              Flagged Form 34B
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drill down: County → Constituency → Detailed flagged items
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            {step !== "county" && (
              <Button variant="outlined" onClick={goBack}>
                Back
              </Button>
            )}
            <Button variant="contained" onClick={loadFlagged}>
              Refresh
            </Button>
          </Stack>
        </Stack>

        {/* Clickable Breadcrumb Chips */}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Navigation
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip
                label="Counties"
                clickable
                onClick={() => {
                  setStep("county");
                  setSelectedCountyCode(null);
                  setSelectedCountyName(null);
                  setSelectedConstCode(null);
                  setSelectedConstName(null);
                  setCountySearch("");
                  setConstSearch("");
                  clearFilters();
                }}
                variant={step === "county" ? "filled" : "outlined"}
              />

              {selectedCountyCode && (
                <Chip
                  label={resolveCountyName(selectedCountyCode)}
                  clickable
                  onClick={() => {
                    setStep("constituency");
                    setSelectedConstCode(null);
                    setSelectedConstName(null);
                    setConstSearch("");
                    clearFilters();
                  }}
                  variant={step === "constituency" ? "filled" : "outlined"}
                />
              )}

              {selectedConstCode && (
                <Chip label={resolveConstName(selectedConstCode)} variant={step === "detail" ? "filled" : "outlined"} />
              )}

              {(metaLoading || constMetaLoading) && <Chip size="small" label="Loading names…" variant="outlined" />}
            </Stack>
          </CardContent>
        </Card>

        {/* STEP 1: Counties */}
        {step === "county" && (
          <Box>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <TextField
                  value={countySearch}
                  onChange={(e) => setCountySearch(e.target.value)}
                  placeholder="Search county…"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </CardContent>
            </Card>

            <Grid container spacing={2}>
              {filteredCounties.length === 0 ? (
                <Grid item xs={12}>
                  <Alert severity="success">No flagged Form 34B found.</Alert>
                </Grid>
              ) : (
                filteredCounties.map((c) => (
                  <Grid key={c.county_code} item xs={12} sm={6} md={4}>
                    <Card
                      variant="outlined"
                      sx={{ cursor: "pointer", "&:hover": { boxShadow: 3 } }}
                      onClick={() => pickCounty(c)}
                    >
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          County
                        </Typography>

                        {metaLoading && !countyMap[normCode(c.county_code)] ? (
                          <Skeleton width="70%" height={32} />
                        ) : (
                          <Typography variant="h6" fontWeight={800}>
                            {resolveCountyName(c.county_code)}
                          </Typography>
                        )}

                        <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                          <Chip size="small" label={`${c.count} flagged`} color="error" />
                          <Chip size="small" label={`Code: ${c.county_code}`} variant="outlined" />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Box>
        )}

        {/* STEP 2: Constituencies */}
        {step === "constituency" && (
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
              Constituencies with flags in {selectedCountyCode ? resolveCountyName(selectedCountyCode) : "—"}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {constMetaLoading && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Loading constituencies for {selectedCountyCode ? resolveCountyName(selectedCountyCode) : "—"}…
              </Alert>
            )}

            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <TextField
                  value={constSearch}
                  onChange={(e) => setConstSearch(e.target.value)}
                  placeholder="Search constituency…"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </CardContent>
            </Card>

            <Grid container spacing={2}>
              {filteredConstituencies.length === 0 ? (
                <Grid item xs={12}>
                  <Alert severity="success">No flagged constituencies found for this county.</Alert>
                </Grid>
              ) : (
                filteredConstituencies.map((ct) => (
                  <Grid key={ct.const_code} item xs={12} sm={6} md={4}>
                    <Card
                      variant="outlined"
                      sx={{ cursor: "pointer", "&:hover": { boxShadow: 3 } }}
                      onClick={() => pickConstituency(ct)}
                    >
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Constituency
                        </Typography>

                        {constMetaLoading && !constituencyMap[normCode(ct.const_code)] ? (
                          <Skeleton width="70%" height={32} />
                        ) : (
                          <Typography variant="h6" fontWeight={800}>
                            {resolveConstName(ct.const_code)}
                          </Typography>
                        )}

                        <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                          <Chip size="small" label={`${ct.count} flagged`} color="error" />
                          <Chip size="small" label={`Code: ${ct.const_code}`} variant="outlined" />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Box>
        )}

        {/* STEP 3: Detailed flagged rows */}
        {step === "detail" && (
          <Box>
            {/* KPI cards */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Flagged
                    </Typography>
                    <Typography variant="h5" fontWeight={800}>
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
                    <Typography variant="h5" fontWeight={800}>
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
                    <Typography variant="h5" fontWeight={800}>
                      {counts.inReview}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      High Severity
                    </Typography>
                    <Typography variant="h5" fontWeight={800}>
                      {counts.high}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Sticky Filters */}
            <Box sx={{ position: "sticky", top: 16, zIndex: 2, mb: 2 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", sm: "center" }}
                  >
                    <TextField
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      placeholder="Search ID, county, constituency, issue…"
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      select
                      label="Severity"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      sx={{ minWidth: 180 }}
                    >
                      {["All", "Low", "Medium", "High"].map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      select
                      label="Status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      sx={{ minWidth: 180 }}
                    >
                      {["All", "Open", "In Review", "Resolved"].map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </TextField>

                    <Chip icon={<FilterList />} label={`${detailRows.length} shown`} />
                    <Button variant="text" onClick={clearFilters}>
                      Clear
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {/* Table */}
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>County</TableCell>
                    <TableCell>Constituency</TableCell>
                    <TableCell>Issue</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {detailRows.map((row: any) => (
                    <TableRow key={row.id} hover sx={{ cursor: "pointer" }} onClick={() => openDetails(row)}>
                      <TableCell sx={{ fontWeight: 700 }}>{row.id}</TableCell>
                      <TableCell>{row.county_name}</TableCell>
                      <TableCell>{row.constituency_name}</TableCell>
                      <TableCell>{row.issue}</TableCell>
                      <TableCell>
                        <Chip size="small" label={row.severity} color={getSeverityColor(row.severity)} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={row.status} color={getStatusColor(row.status)} />
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton size="small" title="View mismatch breakdown" onClick={() => openDetails(row)}>
                            <Visibility />
                          </IconButton>
                          {row.evidenceUrl && (
                            <IconButton
                              size="small"
                              component="a"
                              href={row.evidenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open 34B evidence (PDF)"
                            >
                              <PictureAsPdf />
                            </IconButton>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}

                  {detailRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
                          <Typography variant="body1">No flagged rows match your filters.</Typography>
                          <Button onClick={clearFilters} sx={{ mt: 2 }}>
                            Clear Filters
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Details dialog */}
            <Dialog open={!!details} onClose={() => setDetails(null)} maxWidth="md" fullWidth>
              <DialogTitle>
                Validation breakdown — {details?.id} • {details?.county_name} • {details?.constituency_name}
              </DialogTitle>
              <DialogContent dividers>
                {!details?.issues?.length && <Alert severity="success">No issues detected.</Alert>}

                {!!details?.issues?.length && (
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        At-a-glance totals
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Card variant="outlined" sx={{ bgcolor: "#f9f9f9" }}>
                            <CardContent>
                              <Typography variant="subtitle2" color="text.secondary">
                                Sum of 34A (constituency)
                              </Typography>
                              <Typography variant="body2">
                                Registered: {numberFmt((details as any)?.issues?.[0]?.meta?.a_registered_sum)}
                              </Typography>
                              <Typography variant="body2">
                                Valid: {numberFmt((details as any)?.issues?.[0]?.meta?.a_valid_sum)}
                              </Typography>
                              <Typography variant="body2">
                                Rejected: {numberFmt((details as any)?.issues?.[0]?.meta?.a_rejected_sum)}
                              </Typography>
                              <Typography variant="body2">
                                Total Cast: {numberFmt((details as any)?.issues?.[0]?.meta?.a_total_cast)}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Card variant="outlined" sx={{ bgcolor: "#f9f9f9" }}>
                            <CardContent>
                              <Typography variant="subtitle2" color="text.secondary">
                                Form 34B
                              </Typography>
                              <Typography variant="body2">
                                Registered: {numberFmt((details as any)?.issues?.[0]?.meta?.b_registered_sum)}
                              </Typography>
                              <Typography variant="body2">
                                Valid: {numberFmt((details as any)?.issues?.[0]?.meta?.b_valid_sum)}
                              </Typography>
                              <Typography variant="body2">
                                Rejected: {numberFmt((details as any)?.issues?.[0]?.meta?.b_rejected_sum)}
                              </Typography>
                              <Typography variant="body2">
                                Total Cast: {numberFmt((details as any)?.issues?.[0]?.meta?.b_total_cast)}
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
                    | Record<string, { a: number; b: number; diff: number; pct: number }>
                    | undefined;

                  return (
                    <Accordion key={`${details.id}-${iss.code}`} defaultExpanded sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" label={iss.severity} color={getSeverityColor(iss.severity)} />
                          <Typography variant="subtitle1" fontWeight={700}>
                            {iss.code.replaceAll("_", " ")}
                          </Typography>
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" sx={{ mb: candDiffs ? 2 : 0 }}>
                          {iss.message}
                        </Typography>

                        {candDiffs && (
                          <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Candidate</TableCell>
                                  <TableCell align="right">Sum 34A</TableCell>
                                  <TableCell align="right">34B</TableCell>
                                  <TableCell align="right">Δ (B−A)</TableCell>
                                  <TableCell align="right">|Δ| / A</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {Object.entries(candDiffs).map(([cid, v]) => (
                                  <TableRow key={cid} hover>
                                    <TableCell>{cid}</TableCell>
                                    <TableCell align="right">{numberFmt(v.a)}</TableCell>
                                    <TableCell align="right">{numberFmt(v.b)}</TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{
                                        color: v.diff === 0 ? "inherit" : v.diff > 0 ? "error.main" : "success.main",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {v.diff > 0 ? `+${v.diff}` : v.diff}
                                    </TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{
                                        color: Math.abs(v.pct) > 0.05 ? "error.main" : "success.main",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {(Math.abs(v.pct) * 100).toFixed(2)}%
                                    </TableCell>
                                  </TableRow>
                                ))}
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
                    Open 34B PDF
                  </Button>
                )}
                <Button onClick={() => setDetails(null)}>Close</Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
      </motion.div>
    </Box>
  );
};

export default FlaggedForm34B;
