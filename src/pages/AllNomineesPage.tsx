// src/pages/AllNominees.tsx
import React, { useEffect, useMemo, useRef, useState, useDeferredValue, useCallback } from "react";
import {
  Box, Typography, Container,Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Alert, Button, TextField, InputAdornment, Chip, TablePagination,
  useMediaQuery, Skeleton
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Search as SearchIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import axios, { AxiosError } from "axios";

// ---------- Types ----------
interface Nominee {
  id: number;
  name: string;
  position: string;
  status: "Pending" | "Approved" | "Rejected" | "Payment Pending" | "Disqualified" | string;
  party: string;
}

// ---------- Helpers ----------
const CACHE_KEY = "all_nominees_cache:v1";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

const statusChipColor = (s: string):
  | "default" | "primary" | "secondary" | "success" | "info" | "warning" | "error" => {
  const k = s.toLowerCase();
  if (k.includes("approved")) return "success";
  if (k.includes("pending")) return "warning";
  if (k.includes("payment")) return "info";
  if (k.includes("rejected")) return "error";
  if (k.includes("disqual")) return "error";
  return "default";
};

// ---------- Component ----------
const AllNominees: React.FC = () => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // filters / search / pagination
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // axios + abort
  const abortRef = useRef<AbortController | null>(null);
  const api = axios.create({ baseURL: "/api", withCredentials: true, timeout: 12000 });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // try cache first
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { ts, data } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL_MS) {
          setNominees(data as Nominee[]);
          setLoading(false);
          return;
        }
      }
    } catch {}

    // abort previous
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await api.get<Nominee[]>("/nominations/all", { signal: ctrl.signal });
      setNominees(res.data);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: res.data }));
    } catch (err) {
      const e = err as AxiosError;
      if (e.code === "ERR_CANCELED") return;
      setError(e.response?.data ? String(e.response.data) : e.message || "Failed to load nominees");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  // --- derived: filtering + pagination
  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return nominees;
    return nominees.filter((n) =>
      `${n.name} ${n.id} ${n.party} ${n.position} ${n.status}`
        .toLowerCase()
        .includes(q)
    );
  }, [nominees, deferredSearch]);

  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  useEffect(() => { setPage(0); }, [deferredSearch]); // reset page when searching

  return (
    <Container maxWidth="lg" sx={{ py: 4, pt: `calc(env(safe-area-inset-top) + 16px)` }}>
      <Box sx={{ mb: 2, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { xs: "stretch", sm: "center" } }}>
        <Typography variant={isXs ? "h5" : "h4"} fontWeight="bold" sx={{ flexGrow: 1 }}>
          All Nominees
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Search name/ID/party/position/status"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: { xs: "100%", sm: 300 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Paper elevation={3}>
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height={56} sx={{ mb: 1 }} />
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={44} sx={{ mb: 1 }} />
            ))}
          </Box>
        </Paper>
      ) : error ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={load}>
              Retry
            </Button>
          }
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      ) : (
        <Paper elevation={3} sx={{ overflow: "hidden" }}>
          <TableContainer sx={{ maxHeight: "70vh" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Party</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">No nominees found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((n, idx) => (
                    <TableRow key={n.id} hover>
                      <TableCell>{page * rowsPerPage + idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{n.name}</TableCell>
                      <TableCell>{n.position}</TableCell>
                      <TableCell>
                        <Chip
                          label={n.status}
                          size="small"
                          color={statusChipColor(n.status)}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{n.party}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      )}
    </Container>
  );
};

export default AllNominees;
