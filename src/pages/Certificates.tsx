import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Paper,
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  CircularProgress,
  TablePagination,
} from "@mui/material";
import {
  Search as SearchIcon,
  Close as CloseIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  MoreHoriz as MoreIcon,
  PictureAsPdf as PdfIcon,
  Refresh as RefreshIcon,
  VerifiedUser as ShieldIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

/* ---------------- types ---------------- */
interface Nominee {
  id: string;
  full_name: string;
  position: string;
  county: string;
  status: string | number;
  constituency?: string;
  ward?: string;
  winning_date?: string;
}

/* ---------------- config ---------------- */
const API_BASE_URL = "https://skizagroundsuite.com/API";
const CACHE_KEY = "winning_nominees_v3";
const CACHE_TTL_MS = 2 * 60 * 1000;

/* ---------------- utils ---------------- */
const safeText = (v: unknown) =>
  v === null || v === undefined || String(v).trim() === "" ? "-" : String(v);

const normalizeName = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

const statusLabel = (s: unknown): string => {
  const k = String(s ?? "").trim().toLowerCase();
  if (k === "1" || k.includes("pending")) return "Pending";
  if (k === "2" || k.includes("approved") || k.includes("cleared") || k.includes("win")) return "Approved";
  if (k === "3" || k.includes("reject") || k.includes("disqual")) return "Rejected";
  if (k === "4" || k.includes("payment")) return "Payment Pending";
  return String(s ?? "-") || "-";
};

const statusColor = (s: unknown): "success" | "warning" | "error" | "default" => {
  const k = statusLabel(s).toLowerCase();
  if (k === "approved") return "success";
  if (k.includes("pending")) return "warning";
  if (k === "rejected") return "error";
  return "default";
};

async function fetchJSON(url: string, init?: RequestInit, retries = 1): Promise<any> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 350));
      return fetchJSON(url, init, retries - 1);
    }
    throw e;
  }
}

const toAbsolute = (maybeUrl: string) => {
  try {
    return new URL(maybeUrl, API_BASE_URL + "/").toString();
  } catch {
    return maybeUrl;
  }
};

const useDebounced = (value: string, delay = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
};

/* ---------------- component ---------------- */
const CertificatesNomineeVerification: React.FC = () => {
  const [rows, setRows] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [query, setQuery] = useState("");
  const q = useDebounced(query, 250);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [countyFilter, setCountyFilter] = useState<string>("All Counties");

  // expand state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // row generating
  const [rowGenerating, setRowGenerating] = useState<string | null>(null);

  // pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({ open: false, message: "", severity: "success" });

  // abort + cache
  const abortRef = useRef<AbortController | null>(null);

  const readCache = (): Nominee[] | null => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL_MS) return null;
      return data as Nominee[];
    } catch {
      return null;
    }
  };

  const saveCache = (data: Nominee[]) => {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // ignore
    }
  };

  const fetchNominees = useCallback(async () => {
    setError(null);
    setLoading(true);

    const cached = readCache();
    if (cached) {
      setRows(cached);
      setLoading(false);
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const result = await fetchJSON(`${API_BASE_URL}/fetch_winning_nominees.php`, {
        signal: ctrl.signal as any,
      });

      if (result?.status === "success" && Array.isArray(result.data)) {
        const mapped: Nominee[] = result.data.map((n: any) => ({
          id: String(n.id),
          full_name: safeText(n.full_name),
          position: safeText(n.position),
          county: safeText(n.county),
          constituency: safeText(n.constituency),
          ward: safeText(n.ward),
          status: n.status,
          winning_date: safeText(n.winning_date),
        }));
        setRows(mapped);
        saveCache(mapped);
      } else {
        throw new Error(result?.message || "Could not load data.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      if (!cached) setError(err?.message || "Failed to fetch nominees");
      setSnackbar({ open: true, message: "Could not refresh list.", severity: "warning" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNominees();
    return () => abortRef.current?.abort();
  }, [fetchNominees]);

  const counties = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(safeText(r.county)));
    return ["All Counties", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((n) => {
      const matchesQuery =
        !needle ||
        [n.full_name, n.id, n.position, n.county, n.constituency, n.ward, statusLabel(n.status)]
          .join(" ")
          .toLowerCase()
          .includes(needle);

      const matchesStatus = statusFilter === "All" || statusLabel(n.status).toLowerCase() === statusFilter.toLowerCase();

      const matchesCounty = countyFilter === "All Counties" || String(n.county) === countyFilter;

      return matchesQuery && matchesStatus && matchesCounty;
    });
  }, [rows, q, statusFilter, countyFilter]);

  // Group by normalized name (expandable like the screenshot)
  const groups = useMemo(() => {
    const m = new Map<string, Nominee[]>();
    filtered.forEach((n) => {
      const k = normalizeName(n.full_name);
      const arr = m.get(k) ?? [];
      arr.push(n);
      m.set(k, arr);
    });

    return Array.from(m.entries())
      .map(([key, items]) => {
        const displayName = items[0]?.full_name ?? key;
        items.sort((a, b) => Number(a.id) - Number(b.id));
        return { key, displayName, items };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [filtered]);

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("All");
    setCountyFilter("All Counties");
  };

  const toggleGroup = (key: string) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // Download menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuNominee, setMenuNominee] = useState<Nominee | null>(null);
  const openMenu = (e: React.MouseEvent<HTMLElement>, nominee: Nominee) => {
    setMenuAnchor(e.currentTarget);
    setMenuNominee(nominee);
  };
  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuNominee(null);
  };

  const generateAndOpenPdf = async (nominee: Nominee) => {
    const preOpened = window.open("about:blank", "_blank");

    setRowGenerating(nominee.id);
    try {
      const res = await fetch(`${API_BASE_URL}/generate_certificate.php?id=${encodeURIComponent(nominee.id)}`, {
        headers: { Accept: "application/pdf,application/json" },
      });

      if (!res.ok) throw new Error(`Failed to generate certificate for ${nominee.full_name}.`);

      const ct = (res.headers.get("content-type") || "").toLowerCase();

      if (ct.includes("application/pdf")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (preOpened) preOpened.location.href = url;
        else window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        const data = await res.json().catch(() => ({} as any));
        const fileUrl: string | undefined = data?.url || data?.pdf_url || data?.file || data?.file_url;
        if (!fileUrl) throw new Error(data?.message || "Response did not include a PDF.");
        const absolute = toAbsolute(fileUrl);
        if (preOpened) preOpened.location.href = absolute;
        else window.open(absolute, "_blank", "noopener,noreferrer");
      }

      setSnackbar({ open: true, message: "Certificate opened in a new tab.", severity: "success" });
    } catch (err: any) {
      try {
        preOpened?.close();
      } catch {
        // ignore
      }
      setSnackbar({ open: true, message: `Error: ${err?.message || "Unknown error"}`, severity: "error" });
    } finally {
      setRowGenerating(null);
    }
  };

  // paging at group level (matches screenshot behavior better)
  const pagedGroups = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return groups.slice(start, end);
  }, [groups, page, rowsPerPage]);

  const totalGroups = groups.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      {/* Background treatment */}
      <Box
        sx={{
          minHeight: "100%",
          p: { xs: 2, md: 3 },
          borderRadius: 6,
          background:
            "radial-gradient(1000px 600px at 8% 12%, rgba(244, 67, 54, 0.22), transparent 62%), radial-gradient(900px 520px at 92% 88%, rgba(244, 67, 54, 0.18), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,247,247,0.96))",
          border: "1px solid rgba(244, 67, 54, 0.12)",
        }}
      >
        {/* Header */}
        <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 1 }}>
          <Toolbar sx={{ px: 0, justifyContent: "space-between", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 3,
                  bgcolor: "error.main",
                  display: "grid",
                  placeItems: "center",
                  color: "white",
                  boxShadow: "0 10px 26px rgba(244, 67, 54, 0.30)",
                }}
              >
                <ShieldIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.2 }}>
                  Certificates &amp; Nominee Verification
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Verify approved nominees and download official certificates
                </Typography>
              </Box>
            </Box>

            <Button
              variant="outlined"
              color="success"
              startIcon={<RefreshIcon />}
              onClick={fetchNominees}
              sx={{ borderRadius: 999, whiteSpace: "nowrap" }}
            >
              Refresh
            </Button>
          </Toolbar>
        </AppBar>

        {/* Approved banner */}
        <Paper
          elevation={0}
          sx={{
            mb: 2,
            p: 1.25,
            borderRadius: 3,
            bgcolor: "rgba(76, 175, 80, 0.10)",
            border: "1px solid rgba(76, 175, 80, 0.22)",
          }}
        >
          <Alert
            severity="success"
            icon={<CheckCircleIcon fontSize="small" />}
            sx={{ p: 0, bgcolor: "transparent", alignItems: "center" }}
          >
            <Typography variant="body2" fontWeight={700}>
              All certificates shown are officially approved
            </Typography>
          </Alert>
        </Paper>

        {/* Search + Filters row */}
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, mb: 2, border: "1px solid rgba(0,0,0,0.05)" }}>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, nominee ID, seat, or county"
              size="small"
              sx={{ flex: "1 1 360px" }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setQuery("")} aria-label="Clear search">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />

            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(String(e.target.value))}>
                  <MenuItem value="All">All</MenuItem>
                  <MenuItem value="Approved">Approved</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Rejected">Rejected</MenuItem>
                  <MenuItem value="Payment Pending">Payment Pending</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 190 }}>
                <InputLabel>County</InputLabel>
                <Select label="County" value={countyFilter} onChange={(e) => setCountyFilter(String(e.target.value))}>
                  {counties.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button color="error" onClick={clearFilters} sx={{ whiteSpace: "nowrap" }}>
                Clear Filters
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Table */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.04)",
          }}
        >
          {loading && !rows.length ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 2 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: 620 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 44 }} />
                      <TableCell sx={{ fontWeight: 900 }}>Nominee</TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>Position</TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>County</TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 900, width: 240 }}>Certificate</TableCell>
                      <TableCell sx={{ width: 48 }} />
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {groups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                          No matching nominees found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedGroups.map((g) => {
                        const parent = g.items[0];
                        const isOpen = !!openGroups[g.key];
                        const count = g.items.length;

                        return (
                          <React.Fragment key={g.key}>
                            {/* Parent row */}
                            <TableRow
                              hover
                              sx={{
                                bgcolor: "rgba(244, 67, 54, 0.035)",
                                "& td": { borderBottomColor: "rgba(0,0,0,0.06)" },
                              }}
                            >
                              <TableCell>
                                <IconButton size="small" onClick={() => toggleGroup(g.key)} aria-label="Expand group">
                                  {isOpen ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />}
                                </IconButton>
                              </TableCell>

                              <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Typography fontWeight={900}>{g.displayName}</Typography>
                                  <Chip
                                    size="small"
                                    label={`${count} record${count > 1 ? "s" : ""}`}
                                    sx={{ bgcolor: "rgba(0,0,0,0.04)" }}
                                  />
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  Nominee ID: {parent?.id ?? "-"}
                                </Typography>
                              </TableCell>

                              <TableCell>{safeText(parent?.position)}</TableCell>
                              <TableCell>{safeText(parent?.county)}</TableCell>

                              <TableCell>
                                <Chip size="small" label={statusLabel(parent?.status)} color={statusColor(parent?.status)} />
                              </TableCell>

                              <TableCell>
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  startIcon={
                                    rowGenerating === parent?.id ? <CircularProgress size={16} color="inherit" /> : <PdfIcon />
                                  }
                                  onClick={() => parent && generateAndOpenPdf(parent)}
                                  disabled={!parent || rowGenerating === parent?.id}
                                  sx={{ borderRadius: 999, mr: 1, textTransform: "none", fontWeight: 800 }}
                                >
                                  Download PDF
                                </Button>

                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  onClick={(e) => parent && openMenu(e, parent)}
                                  sx={{ borderRadius: 999, minWidth: 44, px: 0, textTransform: "none", fontWeight: 900 }}
                                  aria-label="Download options"
                                >
                                  ▾
                                </Button>
                              </TableCell>

                              <TableCell align="right">
                                <IconButton size="small" aria-label="More">
                                  <MoreIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>

                            {/* Children */}
                            <TableRow>
                              <TableCell colSpan={7} sx={{ p: 0, borderBottom: "none" }}>
                                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                  <Box sx={{ p: 1.25, bgcolor: "background.paper" }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                                      {normalizeName(g.displayName)} ({count} records)
                                    </Typography>

                                    <Divider sx={{ mb: 1 }} />

                                    <Table size="small">
                                      <TableBody>
                                        {g.items.map((n) => (
                                          <TableRow key={n.id} hover>
                                            <TableCell sx={{ width: 110, whiteSpace: "nowrap", color: "text.secondary" }}>
                                              {safeText(n.id)}
                                            </TableCell>
                                            <TableCell sx={{ whiteSpace: "nowrap" }}>{safeText(n.position)}</TableCell>
                                            <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>{safeText(n.county)}</TableCell>
                                            <TableCell>
                                              <Chip size="small" label={statusLabel(n.status)} color={statusColor(n.status)} />
                                            </TableCell>
                                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                              <Button
                                                variant="contained"
                                                color="success"
                                                size="small"
                                                startIcon={
                                                  rowGenerating === n.id ? (
                                                    <CircularProgress size={16} color="inherit" />
                                                  ) : (
                                                    <PdfIcon />
                                                  )
                                                }
                                                onClick={() => generateAndOpenPdf(n)}
                                                disabled={rowGenerating === n.id}
                                                sx={{ borderRadius: 999, textTransform: "none", fontWeight: 800 }}
                                              >
                                                Download PDF
                                              </Button>
                                            </TableCell>
                                            <TableCell align="right" sx={{ width: 48 }}>
                                              <IconButton size="small" aria-label="More">
                                                <MoreIcon fontSize="small" />
                                              </IconButton>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Footer pagination like the mock */}
              <TablePagination
                component="div"
                count={totalGroups}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25]}
                labelRowsPerPage="Rows per page"
              />
            </>
          )}
        </Paper>

        {/* Download menu */}
        <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
          <MenuItem
            onClick={() => {
              if (menuNominee) generateAndOpenPdf(menuNominee);
              closeMenu();
            }}
          >
            Open PDF in new tab
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (menuNominee) generateAndOpenPdf(menuNominee);
              closeMenu();
            }}
          >
            Download PDF
          </MenuItem>
        </Menu>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </motion.div>
  );
};

export default CertificatesNomineeVerification;
