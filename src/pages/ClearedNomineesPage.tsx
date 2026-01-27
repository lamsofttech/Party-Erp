// src/pages/ClearedNomineesPage.tsx (UI aligned to mock; mobile-optimized)
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Container,
  Typography,
  Box,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Avatar,
  Chip,
  IconButton,
  CircularProgress,
  Button,
  Stack,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  Skeleton,
  useMediaQuery,
  Card,
  CardContent,
  CardActions,
  Divider,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  FormControl,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Visibility as VisibilityIcon,
  Archive as ArchiveIcon,
  Flag as FlagIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  MoreHoriz as MoreHorizIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  WarningAmber as WarningAmberIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

/** =========================================================
 *  API + Types
 *  ======================================================= */
const API_BASE_URL = "https://skizagroundsuite.com/API";

type StatusKey =
  | "Pending Vetting"
  | "Cleared"
  | "Rejected"
  | "Disqualified"
  | "Withdrawn"
  | "Under Vetting"
  | "Archived";

// 0=pending, 1=winner, 2=conceded
type Finalized = 0 | 1 | 2;

interface NomineeRaw {
  id: string;
  full_name: string;
  national_id: string;
  position: string;
  county: string;
  status: string;
  finalized: string;
  created_at: string;
}

export interface Nominee {
  id: string;
  full_name: string;
  national_id: string;
  position: string;
  county: string;
  status: StatusKey | string;
  finalized: Finalized;
  created_at: string;
}

const finalizedChip = (f: Finalized) =>
  f === 1
    ? { label: "Winner", color: "success" as const }
    : f === 2
      ? { label: "Conceded/Lost", color: "error" as const }
      : { label: "Pending", color: "info" as const };

const normalizeNominee = (n: NomineeRaw): Nominee => {
  const statusName: StatusKey | string =
    n.status === "2" ? "Cleared" : (n.status as StatusKey | string);

  const finalizedNum: Finalized =
    n.finalized === "1" ? 1 : n.finalized === "2" ? 2 : 0;

  return {
    id: n.id,
    full_name: n.full_name,
    national_id: n.national_id,
    position: n.position,
    county: n.county,
    status: statusName,
    finalized: finalizedNum,
    created_at: n.created_at,
  };
};

type ActionType = "archive" | "winner" | "conceded";
type ApiResponse<T> = { status: "success" | "error"; message?: string; data?: T };

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return { __empty: true };
  try {
    return JSON.parse(text);
  } catch {
    return { __raw: text };
  }
}
async function postJSON<T = unknown>(
  url: string,
  body: unknown
): Promise<ApiResponse<T> & any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const msg =
      data?.message || data?.error || data?.__raw || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/** =========================================================
 *  Confirm Dialog
 *  ======================================================= */
const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmText: string;
  confirmColor:
  | "inherit"
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "info"
  | "warning";
  loading?: boolean;
  fullScreen?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({
  open,
  title,
  message,
  confirmText,
  confirmColor,
  loading,
  fullScreen,
  onCancel,
  onConfirm,
}) => (
    <Dialog
      open={open}
      onClose={onCancel}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>{message}</DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onCancel} color="inherit" fullWidth={!!fullScreen}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color={confirmColor}
          variant="contained"
          disabled={!!loading}
          fullWidth={!!fullScreen}
        >
          {loading ? <CircularProgress size={22} /> : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );

/** =========================================================
 *  Component
 *  ======================================================= */
const ClearedNomineesPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTabletDown = useMediaQuery(theme.breakpoints.down("md"));

  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] =
    useState<"success" | "error" | "warning" | "info">("success");

  const [dialog, setDialog] = useState<{
    nominee: Nominee | null;
    type: ActionType | null;
  }>({
    nominee: null,
    type: null,
  });

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters (for mock UI)
  const [q, setQ] = useState("");
  const [finalizationFilter, setFinalizationFilter] =
    useState<"all" | "pending" | "winner" | "conceded">("all");
  const [countyFilter, setCountyFilter] = useState<string>("all");

  // Row actions menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuNominee, setMenuNominee] = useState<Nominee | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const showSnackbar = useCallback(
    (message: string, severity: "success" | "error" | "warning" | "info") => {
      setSnackbarMessage(message);
      setSnackbarSeverity(severity);
      setSnackbarOpen(true);
    },
    []
  );

  const handleCloseSnackbar = useCallback(() => setSnackbarOpen(false), []);

  const fetchClearedNominees = useCallback(async () => {
    setLoading(true);
    setError(null);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_BASE_URL}/fetch_cleared_nominees.php`, {
        signal: abortRef.current.signal,
      });
      const json: ApiResponse<NomineeRaw[]> = await res.json();

      if (json.status === "success" && json.data) {
        const normalized = json.data
          .map(normalizeNominee)
          .filter((n) => n.status === "Cleared");
        setNominees(normalized);
      } else {
        throw new Error(json.message || "Failed to fetch cleared nominees.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setError(
        err?.message ||
        "An unexpected error occurred while fetching cleared nominees."
      );
      setNominees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClearedNominees();
    return () => abortRef.current?.abort();
  }, [fetchClearedNominees]);

  /** ======= Actions ======= */
  const openAction = useCallback((nominee: Nominee, type: ActionType) => {
    setDialog({ nominee, type });
  }, []);

  const closeAction = useCallback(
    () => setDialog({ nominee: null, type: null }),
    []
  );

  const confirmAction = useCallback(async () => {
    if (!dialog.nominee || !dialog.type) return;

    const nominee = dialog.nominee;
    const type = dialog.type;
    closeAction();

    let rollback: Nominee | null = null;
    setActionLoadingId(nominee.id);

    try {
      let endpoint = "";
      let payload: {
        id: string;
        finalized?: number;
        status?: string;
        updatedBy: string;
      } = {
        id: nominee.id,
        updatedBy: "AdminUser",
      };

      let successMessage = "";
      let errorMessage = "";

      if (type === "archive") {
        endpoint = "archive_nominee.php";
        successMessage = `Nominee ${nominee.full_name} archived successfully.`;
        errorMessage = `Failed to archive nominee.`;
        rollback = nominee;
        setNominees((prev) =>
          prev.map((n) => (n.id === nominee.id ? { ...n, status: "Archived" } : n))
        );
      } else if (type === "winner") {
        endpoint = "update_nominee_final_status.php";
        payload.finalized = 1;
        successMessage = `Nominee ${nominee.full_name} marked as Winner!`;
        errorMessage = `Failed to mark nominee as winner.`;
        rollback = nominee;
        setNominees((prev) =>
          prev.map((n) => (n.id === nominee.id ? { ...n, finalized: 1 } : n))
        );
      } else if (type === "conceded") {
        endpoint = "update_nominee_final_status.php";
        payload.finalized = 2;
        successMessage = `Nominee ${nominee.full_name} marked as Conceded/Lost.`;
        errorMessage = `Failed to mark nominee as conceded/lost.`;
        rollback = nominee;
        setNominees((prev) =>
          prev.map((n) => (n.id === nominee.id ? { ...n, finalized: 2 } : n))
        );
      }

      const json = await postJSON(`${API_BASE_URL}/${endpoint}`, payload);

      if (
        json.status === "success" ||
        json.ok === true ||
        json.result === "ok" ||
        json.__empty
      ) {
        showSnackbar(successMessage, "success");
        if (type === "archive") {
          setNominees((prev) => prev.filter((n) => n.id !== nominee.id));
        }
      } else {
        if (rollback) {
          setNominees((prev) =>
            prev.map((n) => (n.id === rollback!.id ? rollback! : n))
          );
        }
        throw new Error(json.message || errorMessage);
      }
    } catch (err: any) {
      showSnackbar(err?.message || "Something went wrong.", "error");
    } finally {
      setActionLoadingId(null);
    }
  }, [dialog, closeAction, showSnackbar]);

  /** ======= UI helpers ======= */
  const isFinalized = (f: Finalized) => f === 1 || f === 2;

  const counties = useMemo(() => {
    const set = new Set<string>();
    nominees.forEach((n) => {
      const c = (n.county || "").trim();
      if (c) set.add(c);
    });
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [nominees]);

  const filteredNominees = useMemo(() => {
    return nominees.filter((n) => {
      const matchesQ =
        !q.trim() ||
        n.full_name?.toLowerCase().includes(q.toLowerCase()) ||
        n.national_id?.toLowerCase().includes(q.toLowerCase());

      const matchesFinal =
        finalizationFilter === "all"
          ? true
          : finalizationFilter === "pending"
            ? n.finalized === 0
            : finalizationFilter === "winner"
              ? n.finalized === 1
              : n.finalized === 2;

      const matchesCounty =
        countyFilter === "all" ? true : n.county === countyFilter;

      return matchesQ && matchesFinal && matchesCounty;
    });
  }, [nominees, q, finalizationFilter, countyFilter]);

  const visibleRows = useMemo(
    () =>
      filteredNominees.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [filteredNominees, page, rowsPerPage]
  );

  // KPI line like mock
  const clearedCount = useMemo(() => nominees.length, [nominees]);
  const pendingFinalizationCount = useMemo(
    () => nominees.filter((n) => n.finalized === 0).length,
    [nominees]
  );

  /** ======= Menu handlers ======= */
  const openRowMenu = (e: React.MouseEvent<HTMLElement>, nominee: Nominee) => {
    setMenuAnchor(e.currentTarget);
    setMenuNominee(nominee);
  };
  const closeRowMenu = () => {
    setMenuAnchor(null);
    setMenuNominee(null);
  };

  /** ======= Export (UI placeholder) ======= */
  const handleExportAll = () => {
    // You can wire this to your export endpoint when ready.
    showSnackbar("Export started (wire endpoint to enable).", "info");
  };

  const handleDownloadPDF = (n: Nominee) => {
    // wire your pdf endpoint here
    showSnackbar(`Download PDF for ${n.full_name} (wire endpoint to enable).`, "info");
  };

  /** ======= Render ======= */
  return (
    <Container maxWidth="lg" sx={{ py: 2, px: { xs: 1, sm: 2 } }}>
      {/* Top header row */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          mb: 2,
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          gap={1}
        >
          <Box>
            <Typography
              variant={isMobile ? "h5" : "h4"}
              fontWeight={800}
              sx={{ letterSpacing: -0.2 }}
              color="error"
            >
              Cleared Nominees
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 1, flexWrap: "wrap" }}
            >
              <Chip
                icon={<CheckCircleOutlineIcon />}
                label={`${clearedCount} nominee cleared`}
                variant="outlined"
                color="success"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                icon={<WarningAmberIcon />}
                label={`${pendingFinalizationCount} pending finalization`}
                variant="outlined"
                color="info"
                sx={{ fontWeight: 600 }}
              />
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Review, finalize, or export cleared nominees.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchClearedNominees}
            disabled={loading}
            size={isTabletDown ? "small" : "medium"}
            sx={{ borderRadius: 999, px: 2.25 }}
          >
            Refresh
          </Button>
        </Box>

        {/* Search + filters row (like mock) */}
        <Box
          mt={2}
          display="grid"
          gridTemplateColumns={{ xs: "1fr", sm: "1fr 180px 180px auto" }}
          gap={1.25}
          alignItems="center"
        >
          <TextField
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search nominee..."
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" fullWidth>
            <Select
              value={finalizationFilter}
              onChange={(e: SelectChangeEvent) => {
                setFinalizationFilter(e.target.value as any);
                setPage(0);
              }}
              displayEmpty
              renderValue={(v) =>
                v === "all"
                  ? "Status"
                  : v === "pending"
                    ? "Pending"
                    : v === "winner"
                      ? "Winner"
                      : "Conceded"
              }
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="winner">Winner</MenuItem>
              <MenuItem value="conceded">Conceded</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <Select
              value={countyFilter}
              onChange={(e: SelectChangeEvent) => {
                setCountyFilter(e.target.value as string);
                setPage(0);
              }}
              displayEmpty
              renderValue={(v) => (v === "all" ? "County" : v)}
            >
              {counties.map((c) => (
                <MenuItem key={c} value={c}>
                  {c === "all" ? "All counties" : c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="success"
            startIcon={<DownloadIcon />}
            onClick={handleExportAll}
            sx={{ borderRadius: 2, justifySelf: { xs: "stretch", sm: "end" } }}
          >
            Export All
          </Button>
        </Box>
      </Paper>

      {/* Responsive: Cards for mobile/tablet, table for desktop */}
      {isTabletDown ? (
        <Box
          display="grid"
          gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
          gap={1.5}
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Paper key={`skeleton-card-${i}`} sx={{ p: 2, borderRadius: 2 }}>
                <Skeleton variant="rectangular" height={24} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={18} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={18} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={36} />
              </Paper>
            ))
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : visibleRows.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body1" color="text.secondary">
                No cleared nominees found.
              </Typography>
            </Paper>
          ) : (
            visibleRows.map((n) => {
              const final = finalizedChip(n.finalized);
              const disabling = actionLoadingId === n.id;

              const positionLabel = n.position?.trim() ? n.position : "Not Assigned";
              const countyLabel = n.county?.trim() ? n.county : "Not Assigned";

              return (
                <Card key={n.id} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ pb: 1.5 }}>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      gap={1}
                    >
                      <Stack
                        direction="row"
                        spacing={1.25}
                        alignItems="center"
                        sx={{ overflow: "hidden" }}
                      >
                        <Avatar sx={{ width: 36, height: 36 }}>
                          {n.full_name?.charAt(0) ?? "?"}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={800} noWrap>
                            {n.full_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {n.national_id}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label="Cleared"
                          color="success"
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                        <Chip label={final.label} color={final.color} size="small" />
                      </Stack>
                    </Box>

                    <Divider sx={{ my: 1.25 }} />

                    <GridLike>
                      <Info label="Position" value={positionLabel} />
                      <Info label="County" value={countyLabel} />
                      <Info
                        label="Progress"
                        value={
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip
                              label="Cleared"
                              color="success"
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={n.finalized === 0 ? "Finalization Pending" : "Finalized"}
                              color={n.finalized === 0 ? "info" : "success"}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                        }
                      />
                    </GridLike>
                  </CardContent>

                  <CardActions sx={{ p: 1.25, pt: 0.5, justifyContent: "space-between" }}>
                    <Button
                      size="small"
                      variant="contained"
                      endIcon={<KeyboardArrowDownIcon />}
                      onClick={() => openAction(n, "winner")}
                      disabled={isFinalized(n.finalized) || disabling}
                      sx={{ borderRadius: 2 }}
                    >
                      Finalize
                    </Button>

                    <IconButton
                      onClick={(e) => openRowMenu(e, n)}
                      disabled={disabling}
                      size="small"
                      aria-label="more"
                    >
                      <MoreHorizIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              );
            })
          )}
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{
            overflow: "hidden",
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <TableContainer sx={{ maxHeight: 560 }}>
            <Table stickyHeader size="small" aria-label="Cleared nominees table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Candidate</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Position</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>County</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Progress</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={5}>
                        <Skeleton variant="rectangular" height={42} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Alert severity="error">{error}</Alert>
                    </TableCell>
                  </TableRow>
                ) : filteredNominees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography variant="subtitle1" color="text.secondary">
                        No cleared nominees found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((n) => {
                    const disabling = actionLoadingId === n.id;

                    const positionLabel = n.position?.trim() ? n.position : "Not Assigned";
                    const countyLabel = n.county?.trim() ? n.county : "Not Assigned";

                    return (
                      <TableRow key={n.id} hover>
                        <TableCell sx={{ minWidth: 260 }}>
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar sx={{ width: 36, height: 36 }}>
                              {n.full_name?.charAt(0) ?? "?"}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography fontWeight={800} noWrap>
                                {n.full_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {n.national_id}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell sx={{ minWidth: 160 }}>
                          <Chip label={positionLabel} size="small" variant="outlined" />
                        </TableCell>

                        <TableCell sx={{ minWidth: 160 }}>
                          <Chip label={countyLabel} size="small" variant="outlined" />
                        </TableCell>

                        {/* Progress = Cleared + Finalization */}
                        <TableCell sx={{ minWidth: 260 }}>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip
                              label="Cleared"
                              color="success"
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={n.finalized === 0 ? "Finalization Pending" : "Finalized"}
                              color={n.finalized === 0 ? "info" : "success"}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                        </TableCell>

                        <TableCell align="right" sx={{ whiteSpace: "nowrap", minWidth: 220 }}>
                          <Button
                            size="small"
                            variant="contained"
                            endIcon={<KeyboardArrowDownIcon />}
                            onClick={() => openAction(n, "winner")}
                            disabled={isFinalized(n.finalized) || disabling}
                            sx={{ borderRadius: 2, mr: 1 }}
                          >
                            Finalize
                          </Button>

                          <IconButton
                            onClick={(e) => openRowMenu(e, n)}
                            disabled={disabling}
                            size="small"
                            aria-label="more"
                          >
                            <MoreHorizIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            rowsPerPageOptions={[5, 10, 25, 50]}
            count={filteredNominees.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Paper>
      )}

      {/* Row menu like mock */}
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={closeRowMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={() => {
            const n = menuNominee;
            closeRowMenu();
            if (n) navigate(`/nominees/${n.id}`);
          }}
        >
          <VisibilityIcon fontSize="small" style={{ marginRight: 10 }} />
          View Details
        </MenuItem>

        <MenuItem
          onClick={() => {
            const n = menuNominee;
            closeRowMenu();
            if (n) showSnackbar(`Flag issue for ${n.full_name} (wire endpoint).`, "info");
          }}
        >
          <FlagIcon fontSize="small" style={{ marginRight: 10 }} />
          Flag Issue
        </MenuItem>

        <MenuItem
          onClick={() => {
            const n = menuNominee;
            closeRowMenu();
            if (n) handleDownloadPDF(n);
          }}
        >
          <DownloadIcon fontSize="small" style={{ marginRight: 10 }} />
          Download PDF
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => {
            const n = menuNominee;
            closeRowMenu();
            if (n) openAction(n, "archive");
          }}
        >
          <ArchiveIcon fontSize="small" style={{ marginRight: 10 }} />
          Archive
        </MenuItem>
      </Menu>

      {/* Existing confirm dialog (kept) */}
      <ConfirmDialog
        open={!!dialog.nominee && !!dialog.type}
        title={
          dialog.type === "archive"
            ? "Archive Nominee"
            : dialog.type === "winner"
              ? "Mark as Winner"
              : "Mark as Conceded/Lost"
        }
        message={
          <Typography>
            Are you sure you want to{" "}
            <strong>
              {dialog.type === "archive"
                ? "archive"
                : dialog.type === "winner"
                  ? "mark as Winner"
                  : "mark as Conceded/Lost"}
            </strong>{" "}
            the nominee <strong>{dialog.nominee?.full_name ?? ""}</strong>?
          </Typography>
        }
        confirmText={
          dialog.type === "archive"
            ? "Archive"
            : dialog.type === "winner"
              ? "Confirm Winner"
              : "Confirm Conceded/Lost"
        }
        confirmColor={
          dialog.type === "archive"
            ? "info"
            : dialog.type === "winner"
              ? "success"
              : "error"
        }
        loading={!!actionLoadingId}
        fullScreen={isMobile}
        onCancel={closeAction}
        onConfirm={confirmAction}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

/* ====== Small mobile helpers ====== */
const GridLike: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box display="grid" gridTemplateColumns={{ xs: "1fr 1fr", sm: "1fr 1fr" }} gap={1}>
    {children}
  </Box>
);

const Info: React.FC<{ label: React.ReactNode; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

export default ClearedNomineesPage;
