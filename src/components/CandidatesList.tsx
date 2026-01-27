// src/components/CandidatesList.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Alert,
  Box,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Skeleton,
  useMediaQuery,
  TablePagination,
  Stack,
  Divider,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { useTheme } from "@mui/material/styles";

interface Candidate {
  candidate_id: number;
  name: string;
  contact_email: string;
  contact_phone: string;
  photo_url: string;
  status: string;
  county_name: string;
  constituency_name: string;
  ward_name: string;
  party_name: string;
  position_name: string;
}

interface CandidatesListProps {
  wardCode: string;
  wardName: string;
  positionId: number;
  positionName: string;
}

const API_BASE =
  (import.meta as any)?.env?.VITE_API_BASE ?? "https://skizagroundsuite.com/API";

const statusColor = (s: string) => {
  const key = (s || "").toLowerCase();
  if (["approved", "confirmed", "active"].includes(key)) return "success";
  if (["pending", "review", "processing"].includes(key)) return "warning";
  if (["rejected", "inactive", "suspended"].includes(key)) return "error";
  return "default";
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

const buildUrl = (positionId: number, wardCode: string) => {
  const u = new URL(`${API_BASE}/fetch_candidates.php`);
  u.searchParams.set("position_id", String(positionId));
  u.searchParams.set("ward_code", wardCode);
  return u.toString();
};

const CandidatesList: React.FC<CandidatesListProps> = ({
  wardCode,
  wardName,
  positionId,
  positionName,
}) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // trigger refetch

  // pagination (desktop/table)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const abortRef = useRef<AbortController | null>(null);

  const url = useMemo(() => buildUrl(positionId, wardCode), [positionId, wardCode]);

  useEffect(() => {
    let cancelled = false;

    const fetchCandidates = async () => {
      setLoading(true);
      setError(null);

      // abort previous
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // timeout
        const t = setTimeout(() => controller.abort(), 20000);
        const res = await fetch(url, { signal: controller.signal }).finally(() =>
          clearTimeout(t)
        );

        if (!res.ok) {
          // try parse error from backend
          let msg = `Failed to load (HTTP ${res.status})`;
          try {
            const j = await res.json();
            if (j?.message) msg = j.message;
          } catch {}
          throw new Error(msg);
        }

        const result = await res.json();

        if (result?.status === "success" && Array.isArray(result?.data)) {
          if (!cancelled) {
            setCandidates(result.data);
            setPage(0); // reset pagination on new query
          }
        } else {
          throw new Error(result?.message || "Failed to fetch candidates.");
        }
      } catch (err: any) {
        if (cancelled) return;
        if (err?.name === "AbortError") {
          setError("Request timed out. Please try again.");
        } else {
          setError(`Failed to load candidates: ${err?.message ?? String(err)}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCandidates();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, refreshKey]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const pagedCandidates = useMemo(() => {
    if (!isMdUp) return candidates; // cards view uses full list
    const start = page * rowsPerPage;
    return candidates.slice(start, start + rowsPerPage);
  }, [candidates, isMdUp, page, rowsPerPage]);

  if (loading) {
    // nicer loading skeleton
    return (
      <Container sx={{ mt: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h4">
            {positionName} Candidates for {wardName}
          </Typography>
          <IconButton aria-label="Refresh" disabled>
            <RefreshIcon />
          </IconButton>
        </Stack>
        <Paper>
          <Box p={2}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={2} py={1.5}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="text" width="20%" />
                <Skeleton variant="text" width="15%" />
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="text" width="15%" />
                <Skeleton variant="rounded" width={80} height={24} />
              </Stack>
            ))}
          </Box>
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h4">
            {positionName} Candidates for {wardName}
          </Typography>
          <Tooltip title="Retry">
            <IconButton aria-label="Refresh" onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (candidates.length === 0) {
    return (
      <Container sx={{ mt: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h4">
            {positionName} Candidates for {wardName}
          </Typography>
          <Tooltip title="Refresh">
            <IconButton aria-label="Refresh" onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
        <Alert severity="info">
          No candidates found for {positionName} in {wardName}.
        </Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">
          {positionName} Candidates for {wardName}
        </Typography>
        <Tooltip title="Refresh">
          <IconButton aria-label="Refresh" onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Desktop/Table view */}
      {isMdUp ? (
        <Paper>
          <TableContainer component={Paper} sx={{ maxHeight: "70vh" }}>
            <Table stickyHeader aria-label="Candidates table">
              <TableHead>
                <TableRow>
                  <TableCell>Photo</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Party</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedCandidates.map((c) => (
                  <TableRow key={c.candidate_id} hover tabIndex={0}>
                    <TableCell>
                      <Avatar
                        src={c.photo_url || undefined}
                        alt={c.name}
                        imgProps={{ referrerPolicy: "no-referrer" }}
                        sx={{ width: 42, height: 42, bgcolor: "primary.main" }}
                      >
                        {initials(c.name)}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight={600}>
                        {c.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{c.party_name}</TableCell>
                    <TableCell>
                      <Stack spacing={0.2}>
                        <Typography variant="body2">{c.ward_name}</Typography>
                        <Typography variant="body2">{c.constituency_name}</Typography>
                        <Typography variant="body2">{c.county_name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <EmailIcon fontSize="small" />
                          <Typography variant="body2">{c.contact_email}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <PhoneIcon fontSize="small" />
                          <Typography variant="body2">{c.contact_phone}</Typography>
                        </Stack>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={statusColor(c.status) as any}
                        label={c.status}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={candidates.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Paper>
      ) : (
        // Mobile/Card view
        <Stack spacing={1.5}>
          {candidates.map((c) => (
            <Paper key={c.candidate_id} sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  src={c.photo_url || undefined}
                  alt={c.name}
                  imgProps={{ referrerPolicy: "no-referrer" }}
                  sx={{ width: 52, height: 52, bgcolor: "primary.main", flex: "0 0 auto" }}
                >
                  {initials(c.name)}
                </Avatar>
                <Box flex={1} minWidth={0}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {c.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {c.party_name}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5}>
                    <LocationOnIcon fontSize="small" />
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {c.ward_name}, {c.constituency_name}, {c.county_name}
                    </Typography>
                  </Stack>
                </Box>
                <Chip
                  size="small"
                  color={statusColor(c.status) as any}
                  label={c.status}
                  variant="outlined"
                />
              </Stack>

              <Divider sx={{ my: 1 }} />

              <Stack direction="row" spacing={1.5}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <EmailIcon fontSize="small" />
                  <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                    {c.contact_email}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <PhoneIcon fontSize="small" />
                  <Typography variant="body2">{c.contact_phone}</Typography>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  );
};

export default CandidatesList;
