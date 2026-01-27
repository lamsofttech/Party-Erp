import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
} from "@mui/x-data-grid";

import { HowToVote, GroupAdd, Star, StarBorder } from "@mui/icons-material";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";

/**
 * =============================================
 * Gubernatorial Results Page (scalable, reuses cascading filters)
 * =============================================
 */

// ---------- Configure API endpoints (adjust as needed) ----------
const API = {
  regions: "https://skizagroundsuite.com/API/regions_api.php",
  countiesByRegion: (regionId: number) =>
    `https://skizagroundsuite.com/API/counties_by_region_api.php?region_id=${regionId}`,
  candidatesByCounty: (countyName: string) =>
    `https://skizagroundsuite.com/API/candidates_by_county.php?county_name=${encodeURIComponent(
      countyName
    )}&position=Governor`,
  resultsByCounty: (countyName: string) =>
    `https://skizagroundsuite.com/API/gubernatorial_results.php?county_name=${encodeURIComponent(
      countyName
    )}`,
  upsertResult: `https://skizagroundsuite.com/API/save_gubernatorial_result.php`,
  setChosenCandidate: `https://skizagroundsuite.com/API/set_county_winner.php`,
};

// ---------- Types ----------
interface Region {
  id: number;
  name: string;
}
interface County {
  id: string;
  name: string;
  code: string;
  region_id: number;
}
interface Candidate {
  id: string | number;
  name: string;
  party_id?: number;
  party_name?: string;
  photo_url?: string;
}
interface CountyResultRow {
  candidate_id: string | number;
  votes: number;
}

// For the grid
interface RowView {
  id: string | number;
  candidate: string;
  party?: string;
  votes: number;
  percent: number;
  isWinner: boolean;
}

// ---------- Shared hook: Regions ➜ Counties ----------
function useRegionsCounties() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [counties, setCounties] = useState<County[]>([]);
  const [selectedRegionName, setSelectedRegionName] = useState("");
  const [selectedCountyName, setSelectedCountyName] = useState("");

  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [regionErr, setRegionErr] = useState<string | null>(null);
  const [countyErr, setCountyErr] = useState<string | null>(null);

  // ✅ derive regionId from selectedRegionName (no unused state)
  const selectedRegionId = useMemo(() => {
    const region = regions.find((r) => r.name === selectedRegionName);
    return region ? region.id : null;
  }, [regions, selectedRegionName]);

  useEffect(() => {
    (async () => {
      setLoadingRegions(true);
      setRegionErr(null);
      try {
        const res = await fetch(API.regions);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json?.status === "success" && Array.isArray(json.data)) {
          const list: Region[] = json.data.map((r: any) => ({
            id: r.region_id,
            name: r.region_name,
          }));
          setRegions(list);
        } else throw new Error("Unexpected regions format");
      } catch (e: any) {
        setRegionErr(e?.message || String(e));
      } finally {
        setLoadingRegions(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedRegionId) {
      setCounties([]);
      setSelectedCountyName("");
      return;
    }
    (async () => {
      setLoadingCounties(true);
      setCountyErr(null);
      try {
        const res = await fetch(API.countiesByRegion(selectedRegionId));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json?.status === "success" && Array.isArray(json.data)) {
          const list: County[] = json.data.map((c: any) => ({
            id: c.county_code,
            name: c.county_name,
            code: c.county_code,
            region_id: selectedRegionId,
          }));
          setCounties(list);
        } else throw new Error("Unexpected counties format");
      } catch (e: any) {
        setCountyErr(e?.message || String(e));
      } finally {
        setLoadingCounties(false);
      }
    })();
  }, [selectedRegionId]);

  const handleRegionChange = (name: string) => {
    setSelectedRegionName(name);
    setCounties([]);
    setSelectedCountyName("");
  };

  return {
    regions,
    counties,
    selectedRegionName,
    setSelectedRegionName,
    selectedRegionId,
    selectedCountyName,
    setSelectedCountyName,
    loadingRegions,
    loadingCounties,
    regionErr,
    countyErr,
    handleRegionChange,
  } as const;
}

// ---------- Page Component ----------
function GubernatorialResultsPage() {
  const location = useLocation();
  const ONBOARD_URL = "/nominations/onboard";
  const RESULTS_URL = "/onboarding/Governor-candidates/results"; // this page
  const tabValue = location.pathname.startsWith(RESULTS_URL) ? 1 : 0;

  // filters
  const {
    regions,
    counties,
    selectedRegionName,
    selectedRegionId,
    selectedCountyName,
    setSelectedCountyName,
    loadingRegions,
    loadingCounties,
    regionErr,
    countyErr,
    handleRegionChange,
  } = useRegionsCounties();

  // data
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<CountyResultRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [manualChosenId, setManualChosenId] = useState<string | number | "">(
    ""
  );

  const isReady = !!selectedCountyName;

  // fetch per-county candidates
  useEffect(() => {
    if (!selectedCountyName) {
      setCandidates([]);
      setResults([]);
      setManualChosenId("");
      return;
    }
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const res = await fetch(API.candidatesByCounty(selectedCountyName));
        if (!res.ok) throw new Error(`Fetch candidates HTTP ${res.status}`);
        const json = await res.json();
        const list: Candidate[] = Array.isArray(json?.data)
          ? json.data.map((c: any) => ({
            id: c.id ?? c.candidate_id ?? c.ID,
            name: c.name ?? c.candidate_name,
            party_id: c.party_id,
            party_name: c.party_name,
            photo_url: c.photo_url,
          }))
          : [];
        if (!cancelled) setCandidates(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCountyName]);

  // fetch per-county results
  useEffect(() => {
    if (!selectedCountyName) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API.resultsByCounty(selectedCountyName));
        if (!res.ok) throw new Error(`Fetch results HTTP ${res.status}`);
        const json = await res.json();
        const rows: CountyResultRow[] = Array.isArray(json?.data)
          ? json.data.map((r: any) => ({
            candidate_id: r.candidate_id ?? r.id,
            votes: Number(r.votes ?? 0),
          }))
          : [];
        if (!cancelled) setResults(rows);
        if (!cancelled && json?.chosen_candidate_id)
          setManualChosenId(json.chosen_candidate_id);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCountyName]);

  // combine for view
  const rows: RowView[] = useMemo(() => {
    if (!candidates.length) return [];
    const voteMap = new Map(
      results.map((r) => [String(r.candidate_id), r.votes])
    );
    const total = Array.from(voteMap.values()).reduce((a, b) => a + b, 0);
    const computed = candidates.map((c) => {
      const votes = voteMap.get(String(c.id)) ?? 0;
      const percent = total > 0 ? (votes / total) * 100 : 0;
      return {
        id: c.id,
        candidate: c.name,
        party: c.party_name,
        votes,
        percent: Number(percent.toFixed(2)),
        isWinner: false,
      } as RowView;
    });
    // mark winner by highest votes
    if (computed.length) {
      const maxVotes = Math.max(...computed.map((r) => r.votes));
      computed.forEach(
        (r) => (r.isWinner = r.votes === maxVotes && maxVotes > 0)
      );
    }
    return computed.sort((a, b) => b.votes - a.votes);
  }, [candidates, results]);

  const autoWinnerId = useMemo(
    () => rows.find((r) => r.isWinner)?.id ?? "",
    [rows]
  );

  const columns: GridColDef<RowView>[] = [
    {
      field: "candidate",
      headerName: "Candidate",
      flex: 1.2,
      renderCell: (params: GridRenderCellParams<RowView, string>) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {params.row.isWinner ? (
            <Star fontSize="small" color="warning" />
          ) : (
            <StarBorder fontSize="small" />
          )}
          <Typography>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "party",
      headerName: "Party",
      flex: 0.8,
      // v6+ signature: (value, row) => ...
      valueGetter: (_value, row) => row.party || "—",
    },
    { field: "votes", headerName: "Votes", flex: 0.5, type: "number" },
    {
      field: "percent",
      headerName: "%",
      flex: 0.4,
      // v6+ signature: (value) => ...
      valueFormatter: (value) => (value != null ? `${value}%` : "—"),
    },
  ];

  const handleVoteEdit = useCallback(
    (candidateId: string | number, nextVotes: number) => {
      setResults((prev) => {
        const key = String(candidateId);
        const exist = prev.find((r) => String(r.candidate_id) === key);
        if (exist)
          return prev.map((r) =>
            String(r.candidate_id) === key ? { ...r, votes: nextVotes } : r
          );
        return [...prev, { candidate_id: candidateId, votes: nextVotes }];
      });
    },
    []
  );

  const handleSave = async () => {
    if (!selectedCountyName) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // 1) upsert votes
      const payload = new FormData();
      payload.append("county_name", selectedCountyName);
      payload.append(
        "results",
        JSON.stringify(
          results.map((r) => ({ candidate_id: r.candidate_id, votes: r.votes }))
        )
      );
      const res = await fetch(API.upsertResult, {
        method: "POST",
        body: payload,
      });
      if (!res.ok) throw new Error(`Save results HTTP ${res.status}`);
      const json = await res.json();
      if (json?.status !== "success")
        throw new Error(json?.message || "Failed to save");

      // 2) set/confirm winner
      const winnerId = manualChosenId || autoWinnerId;
      if (winnerId) {
        const payload2 = new FormData();
        payload2.append("county_name", selectedCountyName);
        payload2.append("candidate_id", String(winnerId));
        const res2 = await fetch(API.setChosenCandidate, {
          method: "POST",
          body: payload2,
        });
        if (!res2.ok)
          throw new Error(`Save chosen candidate HTTP ${res2.status}`);
        const json2 = await res2.json();
        if (json2?.status !== "success")
          throw new Error(json2?.message || "Failed to set winner");
      }

      setSuccess("Results saved successfully.");
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Top tabs (same routes for consistency) */}
      <Box sx={{ mb: 2 }}>
        <Tabs value={tabValue} aria-label="navigation tabs">
          <Tab
            component={Link}
            to={ONBOARD_URL}
            icon={<GroupAdd />}
            iconPosition="start"
            label="Onboard Candidates"
          />
          <Tab
            component={Link}
            to={RESULTS_URL}
            icon={<HowToVote />}
            iconPosition="start"
            label="Gubernatorial Results"
          />
        </Tabs>
      </Box>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
          Gubernatorial Results333
        </Typography>

        {/* Region > County filters (identical UX) */}
        <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel id="region-select-label">Region</InputLabel>
            {loadingRegions ? (
              <CircularProgress size={22} sx={{ mt: 1, ml: 2 }} />
            ) : regionErr ? (
              <Alert severity="error" sx={{ mt: 1 }}>
                {regionErr}
              </Alert>
            ) : (
              <Select
                labelId="region-select-label"
                value={selectedRegionName}
                label="Region"
                onChange={(e) => handleRegionChange(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select Region</em>
                </MenuItem>
                {regions.map((r) => (
                  <MenuItem key={r.id} value={r.name}>
                    {r.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </FormControl>

          {selectedRegionId && (
            <FormControl sx={{ minWidth: 220 }} disabled={!selectedRegionId}>
              <InputLabel id="county-select-label">County</InputLabel>
              {loadingCounties ? (
                <CircularProgress size={22} sx={{ mt: 1, ml: 2 }} />
              ) : countyErr ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {countyErr}
                </Alert>
              ) : (
                <Select
                  labelId="county-select-label"
                  value={selectedCountyName}
                  label="County"
                  onChange={(e) => setSelectedCountyName(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Select County</em>
                  </MenuItem>
                  {counties.map((c) => (
                    <MenuItem key={c.id} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          )}
        </Box>

        {!selectedRegionName ? (
          <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
            <Typography variant="h6">
              Pick a region, then a county to view results.
            </Typography>
          </Box>
        ) : !isReady ? (
          <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
            <Typography variant="h6">Now choose a county.</Typography>
          </Box>
        ) : (
          <>
            {/* Summary header */}
            <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {selectedCountyName} County — Governor Race
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {candidates.length} candidate
                    {candidates.length === 1 ? "" : "s"}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      justifyContent: { xs: "flex-start", md: "flex-end" },
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Chip
                      label={
                        autoWinnerId
                          ? `Projected winner: ${rows.find((r) => r.id === autoWinnerId)?.candidate
                          }`
                          : "No votes yet"
                      }
                      color={autoWinnerId ? "success" : "default"}
                      variant={autoWinnerId ? "filled" : "outlined"}
                    />
                    <FormControl size="small" sx={{ minWidth: 240 }}>
                      <InputLabel id="chosen-candidate-label">
                        Chosen Candidate (override)
                      </InputLabel>
                      <Select
                        labelId="chosen-candidate-label"
                        label="Chosen Candidate (override)"
                        value={manualChosenId}
                        onChange={(e) => setManualChosenId(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>Use highest votes</em>
                        </MenuItem>
                        {rows.map((r) => (
                          <MenuItem key={r.id} value={r.id}>
                            {r.candidate}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      disabled={saving || !rows.length}
                    >
                      {saving ? <CircularProgress size={20} /> : "Save Results"}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Card>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert
                severity="success"
                sx={{ mb: 2 }}
                onClose={() => setSuccess(null)}
              >
                {success}
              </Alert>
            )}

            {/* Results table */}
            <Card variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ height: 480 }}>
                <DataGrid
                  rows={rows}
                  columns={columns}
                  disableRowSelectionOnClick
                  pageSizeOptions={[5, 10, 25]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10, page: 0 } },
                  }}
                  getRowClassName={(params) =>
                    params.row.isWinner ? "winner-row" : ""
                  }
                />
              </Box>

              {/* Inline editor for quick data entry */}
              <Box
                sx={{
                  mt: 2,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
                  gap: 2,
                }}
              >
                {candidates.map((c) => {
                  const currentVotes =
                    results.find(
                      (r) => String(r.candidate_id) === String(c.id)
                    )?.votes ?? 0;
                  return (
                    <TextField
                      key={c.id}
                      label={`Votes — ${c.name}`}
                      type="number"
                      value={currentVotes}
                      inputProps={{ min: 0 }}
                      onChange={(e) =>
                        handleVoteEdit(
                          c.id,
                          Math.max(0, Number(e.target.value || 0))
                        )
                      }
                    />
                  );
                })}
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                Tip: Enter votes above, then Save Results to persist. The
                highest-vote candidate becomes the winner unless you pick an
                override.
              </Typography>
            </Card>
          </>
        )}
      </motion.div>

      <style>
        {`
        .winner-row .MuiDataGrid-cell { font-weight: 700; }
        `}
      </style>
    </Box>
  );
}

export default GubernatorialResultsPage;
