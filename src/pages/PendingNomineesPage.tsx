// src/pages/NomineeManagementPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Toolbar,
  AppBar,
  Grid,
  Chip,
  InputAdornment,
  useMediaQuery,
  Divider,
  TablePagination,
  Avatar,
  Breadcrumbs,
  IconButton,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  ArrowBackIosNew as BackIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import type { ChipProps } from "@mui/material/Chip";
import toast, { Toaster } from "react-hot-toast";

/** ======= CONFIG ======= */
const API_BASE_URL = "https://skizagroundsuite.com/API";

/** ======= TYPES ======= */
interface Nominee {
  id: number;
  full_name: string;
  position: string;
  status: number; // 1: Pending Vetting, 2: Approved, 3: Rejected, 4: Payment Pending
  county?: string | null;
  constituency?: string | null;
  ward?: string | null;
  polling_station?: string | null;
  email?: string | null;

  // Optional flags if/when your API provides them:
  // incomplete_docs?: boolean;
  // urgent?: boolean;
}

interface FetchNomineesSuccess {
  status: "success";
  data: Array<Omit<Nominee, "status"> & { status: number | string }>;
}

interface FetchFailure {
  status: "error" | "fail";
  message?: string;
}

type FetchNomineesResponse = FetchNomineesSuccess | FetchFailure;

interface NomineeDetails {
  email?: string | null;
  phone?: string | null;
  physical_address?: string | null;
  id_number?: string | null;
  dob?: string | null;
  gender?: string | null;
  education_level?: string | null;
  occupation?: string | null;
  nomination_date?: string | null;
  vetting_notes?: string | null;
  document_path?: string | null;
}

interface DetailsSuccess {
  status: "success";
  data: NomineeDetails;
}

type DetailsResponse = DetailsSuccess | FetchFailure;

/** ======= CONSTANTS & HELPERS ======= */
const statusMap: Record<number, string> = {
  1: "Pending",
  2: "Approved",
  3: "Rejected",
  4: "Payment Pending",
};

const getStatusChipColor = (statusCode: number): ChipProps["color"] => {
  switch (statusCode) {
    case 1:
      return "warning";
    case 2:
      return "success";
    case 3:
      return "error";
    case 4:
      return "info";
    default:
      return "default";
  }
};

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** ======= RED/WHITE THEME (matches your screenshot) ======= */
const ui = {
  bg: "#ffffff",
  panel: "#ffffff",
  stroke: "rgba(0,0,0,0.10)",
  strokeStrong: "rgba(0,0,0,0.18)",
  shadow: "0 12px 30px rgba(0,0,0,0.10)",
  shadowSoft: "0 6px 16px rgba(0,0,0,0.06)",
  primary: "#F44336", // brand red
  primaryDark: "#D32F2F",
  tint: "rgba(244, 67, 54, 0.08)",
  text: "#111827",
  textSoft: "rgba(17,24,39,0.65)",
} as const;

/** ======= COMPONENT ======= */
const NomineeManagementPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [allNominees, setAllNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [openDetailDialog, setOpenDetailDialog] = useState<boolean>(false);
  const [selectedNominee, setSelectedNominee] = useState<Nominee | null>(null);
  const [nomineeDetails, setNomineeDetails] = useState<NomineeDetails | null>(
    null
  );
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearch = useDebounced(searchTerm, 250);

  // Dashboard-style filters
  const [statusFilter, setStatusFilter] = useState<number>(1); // Pending default
  const [flagIncompleteDocs, setFlagIncompleteDocs] = useState(false);
  const [flagUrgent, setFlagUrgent] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /** Fetch nominees */
  const fetchAllNominees = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/fetch_pending_vetting_nominees.php`
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result: FetchNomineesResponse = await response.json();
      if (result.status === "success") {
        const normalized: Nominee[] = result.data.map((n) => ({
          ...n,
          status: Number(n.status),
          county: n.county ?? null,
          constituency: n.constituency ?? null,
          ward: n.ward ?? null,
          polling_station: n.polling_station ?? null,
          email: (n as any).email ?? null,
        }));
        setAllNominees(normalized);
      } else {
        throw new Error(result.message || "Failed to fetch nominees.");
      }
    } catch (err: any) {
      const msg = `Failed to load nominee records: ${err.message || String(err)}`;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /** Fetch single nominee details */
  const fetchNomineeDetails = async (id: number): Promise<NomineeDetails> => {
    const response = await fetch(
      `${API_BASE_URL}/get_nominee_details.php?id=${encodeURIComponent(id)}`
    );
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const result: DetailsResponse = await response.json();
    if (result.status === "success") return result.data;
    throw new Error(result.message || "Failed to fetch nominee details.");
  };

  useEffect(() => {
    void fetchAllNominees();
  }, []);

  const handleReviewNominee = async (nominee: Nominee) => {
    setSelectedNominee(nominee);
    setNomineeDetails(null);
    setDetailsLoading(true);
    setOpenDetailDialog(true);
    try {
      const details = await fetchNomineeDetails(nominee.id);
      setNomineeDetails(details);
    } catch {
      setNomineeDetails(null);
      toast.error("Failed to load nominee details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleApproveNominee = async (id: number) => {
    if (
      !window.confirm(
        "Are you sure you want to approve this nominee? This action is irreversible."
      )
    )
      return;

    const approvalPromise = new Promise<string>(async (resolve, reject) => {
      try {
        const response = await fetch(`${API_BASE_URL}/approve_nominee.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const result: FetchFailure | { status: "success" } = await response.json();
        if (result.status === "success") {
          await fetchAllNominees();
          resolve("Nominee approved successfully!");
        } else {
          reject(
            new Error(
              (result as FetchFailure).message || "Failed to approve nominee."
            )
          );
        }
      } catch (err: any) {
        reject(
          new Error(`Error approving nominee: ${err.message || String(err)}`)
        );
      }
    });

    toast.promise(approvalPromise, {
      loading: "Approving nominee...",
      success: (message) => message,
      error: (error) => (error as Error).message || "Approval failed!",
    });
  };

  const [openRejectDialog, setOpenRejectDialog] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");

  const handleRejectNomineeInitiate = () => {
    setRejectReason("");
    setOpenRejectDialog(true);
  };

  const handleRejectNomineeConfirm = async () => {
    if (!rejectReason.trim()) {
      toast.error("Rejection reason cannot be empty.");
      return;
    }
    if (!selectedNominee) return;

    const rejectionPromise = new Promise<string>(async (resolve, reject) => {
      try {
        const response = await fetch(`${API_BASE_URL}/reject_nominee.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedNominee.id, reason: rejectReason }),
        });
        const result: FetchFailure | { status: "success" } = await response.json();
        if (result.status === "success") {
          await fetchAllNominees();
          setOpenRejectDialog(false);
          resolve("Nominee rejected successfully!");
        } else {
          reject(
            new Error((result as FetchFailure).message || "Failed to reject nominee.")
          );
        }
      } catch (err: any) {
        reject(
          new Error(`Error rejecting nominee: ${err.message || String(err)}`)
        );
      }
    });

    toast.promise(rejectionPromise, {
      loading: "Rejecting nominee...",
      success: (message) => message,
      error: (error) => (error as Error).message || "Rejection failed!",
    });
  };

  /** ======= COUNTS (top cards) ======= */
  const counts = useMemo(() => {
    const pending = allNominees.filter((n) => n.status === 1).length;
    const approved = allNominees.filter((n) => n.status === 2).length;
    const rejected = allNominees.filter((n) => n.status === 3).length;
    return { pending, approved, rejected };
  }, [allNominees]);

  /** ======= FILTERING ======= */
  const filteredNominees = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    return allNominees.filter((n) => {
      // status filter
      if (statusFilter && n.status !== statusFilter) return false;

      // optional flags (UI-only)
      void flagIncompleteDocs;
      void flagUrgent;

      if (!q) return true;
      return (
        n.full_name.toLowerCase().includes(q) ||
        String(n.id).includes(q) ||
        (n.email ?? "").toLowerCase().includes(q) ||
        n.position.toLowerCase().includes(q) ||
        (n.county ?? "").toLowerCase().includes(q) ||
        (n.constituency ?? "").toLowerCase().includes(q) ||
        (n.ward ?? "").toLowerCase().includes(q) ||
        (n.polling_station ?? "").toLowerCase().includes(q)
      );
    });
  }, [allNominees, debouncedSearch, statusFilter, flagIncompleteDocs, flagUrgent]);

  const paginatedNominees = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredNominees.slice(start, start + rowsPerPage);
  }, [filteredNominees, page, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, statusFilter, flagIncompleteDocs, flagUrgent]);

  /** ======= UI building blocks ======= */
  const StatCard = ({
    label,
    value,
    active,
    onClick,
  }: {
    label: string;
    value: number;
    active: boolean;
    onClick: () => void;
  }) => {
    const border = active ? `2px solid ${ui.primary}` : `1px solid ${ui.stroke}`;

    return (
      <Paper
        onClick={onClick}
        role="button"
        tabIndex={0}
        elevation={0}
        sx={{
          cursor: "pointer",
          userSelect: "none",
          p: { xs: 1.5, sm: 2 },
          borderRadius: 3,
          bgcolor: ui.panel,
          border,
          boxShadow: active ? ui.shadow : "none",
          transition: "transform 160ms ease, box-shadow 160ms ease, border 160ms ease",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: ui.shadow,
          },
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: ui.tint,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "999px",
                bgcolor: ui.primary,
              }}
            />
          </Box>

          <Box>
            <Typography
              sx={{ fontWeight: 900, color: ui.text, lineHeight: 1.1 }}
              variant={isMobile ? "h6" : "h5"}
            >
              {label}
            </Typography>
            <Typography sx={{ color: ui.textSoft, fontWeight: 700 }}>
              {value} {label}
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: ui.bg, py: { xs: 2, md: 3 } }}>
      <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 2.5 } }}>
        {/* Top bar / breadcrumb */}
        <AppBar position="static" elevation={0} color="transparent" sx={{ mb: 2 }}>
          <Toolbar
            disableGutters
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton
                size="small"
                aria-label="back"
                sx={{
                  bgcolor: ui.panel,
                  border: `1px solid ${ui.stroke}`,
                }}
                onClick={() => window.history.back()}
              >
                <BackIcon fontSize="small" />
              </IconButton>

              <Breadcrumbs
                aria-label="breadcrumb"
                sx={{
                  color: ui.textSoft,
                  "& .MuiBreadcrumbs-separator": { mx: 0.75 },
                }}
              >
                <Typography sx={{ color: ui.textSoft, fontWeight: 700 }}>
                  Dashboard
                </Typography>
                <Typography sx={{ color: ui.textSoft, fontWeight: 700 }}>
                  Profile
                </Typography>
              </Breadcrumbs>
            </Box>

            <IconButton
              size="small"
              aria-label="settings"
              sx={{
                bgcolor: ui.panel,
                border: `1px solid ${ui.stroke}`,
              }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Title + subtitle */}
        <Box sx={{ mb: 2.25 }}>
          <Typography
            variant={isMobile ? "h4" : "h3"}
            sx={{ fontWeight: 1000, color: ui.text, letterSpacing: -0.5 }}
          >
            Nominee Vetting Dashboard
          </Typography>
          <Typography sx={{ color: ui.textSoft, fontWeight: 600, mt: 0.5 }}>
            Review, verify, and approve candidates
          </Typography>
        </Box>

        {/* Stat cards row */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <StatCard
              label="Pending"
              value={counts.pending}
              active={statusFilter === 1}
              onClick={() => setStatusFilter(1)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              label="Approved"
              value={counts.approved}
              active={statusFilter === 2}
              onClick={() => setStatusFilter(2)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              label="Rejected"
              value={counts.rejected}
              active={statusFilter === 3}
              onClick={() => setStatusFilter(3)}
            />
          </Grid>
        </Grid>

        {/* Search + refresh */}
        <Paper
          elevation={0}
          sx={{
            p: 1.25,
            mb: 1.5,
            borderRadius: 3,
            bgcolor: ui.panel,
            border: `1px solid ${ui.stroke}`,
          }}
        >
          <Box
            display="grid"
            gridTemplateColumns={{ xs: "1fr", sm: "1fr auto" }}
            gap={1}
            alignItems="center"
          >
            <TextField
              placeholder="Search name, ID, email, position..."
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 999,
                  bgcolor: "#fff",
                },
                "& fieldset": {
                  borderColor: ui.stroke,
                },
                "& .MuiOutlinedInput-root:hover fieldset": {
                  borderColor: ui.strokeStrong,
                },
                "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                  borderColor: ui.primary,
                  borderWidth: 2,
                },
              }}
            />

            <Button
              onClick={fetchAllNominees}
              startIcon={<RefreshIcon />}
              sx={{
                height: 44,
                px: 3,
                borderRadius: 999,
                fontWeight: 900,
                textTransform: "none",
                bgcolor: ui.primary,
                color: "white",
                "&:hover": { bgcolor: ui.primaryDark },
              }}
            >
              Refresh
            </Button>
          </Box>
        </Paper>

        {/* Filter chips row */}
        <Paper
          elevation={0}
          sx={{
            p: 1.25,
            mb: 2,
            borderRadius: 3,
            bgcolor: ui.panel,
            border: `1px solid ${ui.stroke}`,
          }}
        >
          <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
            <Chip
              label={statusMap[statusFilter] ?? "Status"}
              color={getStatusChipColor(statusFilter)}
              onClick={() => { }}
              sx={{ fontWeight: 900, borderRadius: 999 }}
            />

            <Chip
              label="Incomplete Docs"
              variant={flagIncompleteDocs ? "filled" : "outlined"}
              onClick={() => setFlagIncompleteDocs((v) => !v)}
              sx={{
                fontWeight: 800,
                borderRadius: 999,
                borderColor: ui.stroke,
                bgcolor: flagIncompleteDocs ? ui.tint : "transparent",
              }}
            />

            <Chip
              label="Urgent"
              variant={flagUrgent ? "filled" : "outlined"}
              onClick={() => setFlagUrgent((v) => !v)}
              sx={{
                fontWeight: 800,
                borderRadius: 999,
                borderColor: ui.stroke,
                bgcolor: flagUrgent ? ui.tint : "transparent",
              }}
            />
          </Box>
        </Paper>

        {/* Main list area */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            bgcolor: ui.panel,
            border: `1px solid ${ui.stroke}`,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box p={2}>
              <Alert severity="error">{error}</Alert>
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  px: { xs: 1.5, sm: 2.5 },
                  py: 1.75,
                  borderBottom: `1px solid ${ui.stroke}`,
                }}
              >
                <Typography sx={{ fontWeight: 1000, color: ui.text }}>
                  {statusMap[statusFilter] ?? "Nominees"} Nominees
                </Typography>
                <Typography sx={{ color: ui.textSoft, fontWeight: 600, mt: 0.25 }}>
                  {filteredNominees.length} record(s) found
                </Typography>
              </Box>

              <Box sx={{ p: { xs: 1.25, sm: 2 }, display: "grid", gap: 1.25 }}>
                {paginatedNominees.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: "center",
                      borderRadius: 3,
                      bgcolor: "#fff",
                      border: `1px solid ${ui.stroke}`,
                    }}
                  >
                    <Typography sx={{ color: ui.textSoft, fontWeight: 700 }}>
                      No nominees found.
                    </Typography>
                  </Paper>
                ) : (
                  paginatedNominees.map((n) => (
                    <Paper
                      key={n.id}
                      elevation={0}
                      sx={{
                        p: { xs: 1.25, sm: 1.75 },
                        borderRadius: 3,
                        bgcolor: "#fff",
                        border: `1px solid ${ui.stroke}`,
                        boxShadow: ui.shadowSoft,
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          md: "1fr auto",
                        },
                        gap: 1.25,
                        alignItems: "center",
                      }}
                    >
                      <Box display="flex" gap={1.25} alignItems="flex-start">
                        <Avatar
                          sx={{
                            width: 44,
                            height: 44,
                            bgcolor: ui.tint,
                            color: ui.primary,
                            fontWeight: 1000,
                          }}
                        >
                          {(n.full_name?.[0] ?? "N").toUpperCase()}
                        </Avatar>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Box display="flex" flexWrap="wrap" gap={1} alignItems="center">
                            <Typography
                              sx={{
                                fontWeight: 1000,
                                color: ui.text,
                                fontSize: 18,
                                lineHeight: 1.1,
                              }}
                            >
                              {n.full_name}
                            </Typography>

                            <Chip
                              label={
                                statusFilter === 1
                                  ? "Pending Review"
                                  : statusMap[n.status] ?? "Unknown"
                              }
                              color={getStatusChipColor(n.status)}
                              size="small"
                              sx={{ fontWeight: 1000, borderRadius: 999 }}
                            />
                          </Box>

                          <Typography sx={{ color: ui.textSoft, fontWeight: 700, mt: 0.25 }}>
                            {n.position || "—"} • ID #{n.id}
                          </Typography>

                          <Divider sx={{ my: 1 }} />

                          <Box
                            display="grid"
                            gridTemplateColumns={{
                              xs: "1fr",
                              sm: "1fr 1fr",
                              md: "repeat(4, minmax(0, 1fr))",
                            }}
                            gap={1}
                          >
                            <Box>
                              <Typography variant="caption" sx={{ color: ui.textSoft, fontWeight: 800 }}>
                                County
                              </Typography>
                              <Typography sx={{ color: ui.text, fontWeight: 800 }}>
                                {n.county || "—"}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: ui.textSoft, fontWeight: 800 }}>
                                Constituency
                              </Typography>
                              <Typography sx={{ color: ui.text, fontWeight: 800 }}>
                                {n.constituency || "—"}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: ui.textSoft, fontWeight: 800 }}>
                                Ward
                              </Typography>
                              <Typography sx={{ color: ui.text, fontWeight: 800 }}>
                                {n.ward || "—"}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: ui.textSoft, fontWeight: 800 }}>
                                Polling Station
                              </Typography>
                              <Typography sx={{ color: ui.text, fontWeight: 800 }}>
                                {n.polling_station || "—"}
                              </Typography>
                            </Box>
                          </Box>

                          {statusFilter === 1 && (
                            <Typography
                              sx={{
                                mt: 1,
                                color: ui.textSoft,
                                fontWeight: 700,
                                fontSize: 13,
                              }}
                            >
                              Waiting for vetting officer action
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      <Box
                        display="flex"
                        justifyContent={{ xs: "stretch", md: "flex-end" }}
                        alignItems="center"
                      >
                        <Button
                          onClick={() => handleReviewNominee(n)}
                          sx={{
                            width: { xs: "100%", md: "auto" },
                            px: 3,
                            py: 1.15,
                            borderRadius: 999,
                            fontWeight: 1000,
                            textTransform: "none",
                            bgcolor: ui.primary,
                            color: "white",
                            "&:hover": { bgcolor: ui.primaryDark },
                          }}
                        >
                          Review Nominee
                        </Button>
                      </Box>
                    </Paper>
                  ))
                )}
              </Box>

              <Box sx={{ borderTop: `1px solid ${ui.stroke}` }}>
                <TablePagination
                  component="div"
                  count={filteredNominees.length}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 20]}
                  labelRowsPerPage={isMobile ? "Rows" : "Rows per page"}
                />
              </Box>
            </>
          )}
        </Paper>

        {/* Details Dialog */}
        <Dialog
          open={openDetailDialog}
          onClose={() => setOpenDetailDialog(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ bgcolor: ui.primary, color: "white", fontWeight: 1000 }}>
            Nominee Details: {selectedNominee?.full_name}
          </DialogTitle>

          <DialogContent dividers>
            {detailsLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : nomineeDetails ? (
              <Grid container spacing={2} sx={{ pt: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Email:</strong> {nomineeDetails.email || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Phone:</strong> {nomineeDetails.phone || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Address:</strong> {nomineeDetails.physical_address || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>ID Number:</strong> {nomineeDetails.id_number || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Date of Birth:</strong> {nomineeDetails.dob || "N/A"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Gender:</strong> {nomineeDetails.gender || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Education Level:</strong> {nomineeDetails.education_level || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Occupation:</strong> {nomineeDetails.occupation || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nomination Date:</strong> {nomineeDetails.nomination_date || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Vetting Notes:</strong> {nomineeDetails.vetting_notes || "N/A"}
                  </Typography>

                  {nomineeDetails.document_path && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Documents:</strong>{" "}
                      <a
                        href={`${API_BASE_URL}/${nomineeDetails.document_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: ui.primary,
                          textDecoration: "none",
                          fontWeight: 900,
                        }}
                      >
                        View Documents
                      </a>
                    </Typography>
                  )}
                </Grid>
              </Grid>
            ) : (
              <Typography color="error" py={4} textAlign="center">
                Details could not be loaded or are not available.
              </Typography>
            )}
          </DialogContent>

          <DialogActions
            sx={{
              p: 2,
              gap: 1,
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <Button
              onClick={() => setOpenDetailDialog(false)}
              variant="outlined"
              sx={{
                borderRadius: 999,
                fontWeight: 900,
                borderColor: ui.strokeStrong,
                color: ui.primary,
              }}
            >
              Close
            </Button>

            <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
              <Button
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                disabled={!selectedNominee}
                onClick={() => selectedNominee && handleApproveNominee(selectedNominee.id)}
                sx={{
                  borderRadius: 999,
                  fontWeight: 1000,
                  textTransform: "none",
                  boxShadow: "none",
                }}
              >
                Approve
              </Button>

              <Button
                variant="contained"
                color="error"
                startIcon={<RejectIcon />}
                disabled={!selectedNominee}
                onClick={handleRejectNomineeInitiate}
                sx={{
                  borderRadius: 999,
                  fontWeight: 1000,
                  textTransform: "none",
                  boxShadow: "none",
                }}
              >
                Reject
              </Button>
            </Box>
          </DialogActions>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog
          open={openRejectDialog}
          onClose={() => setOpenRejectDialog(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ bgcolor: ui.primary, color: "white", fontWeight: 1000 }}>
            Reject Nominee: {selectedNominee?.full_name}
          </DialogTitle>

          <DialogContent dividers>
            <TextField
              autoFocus
              margin="dense"
              label="Reason for rejection"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              sx={{
                mt: 2,
                "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                  borderColor: ui.primary,
                  borderWidth: 2,
                },
              }}
            />
          </DialogContent>

          <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
            <Button
              onClick={() => setOpenRejectDialog(false)}
              variant="outlined"
              sx={{
                borderRadius: 999,
                fontWeight: 900,
                borderColor: ui.strokeStrong,
                color: ui.primary,
              }}
            >
              Cancel
            </Button>

            <Button
              onClick={handleRejectNomineeConfirm}
              variant="contained"
              sx={{
                borderRadius: 999,
                px: 3,
                fontWeight: 1000,
                bgcolor: ui.primary,
                "&:hover": { bgcolor: ui.primaryDark },
                textTransform: "none",
              }}
            >
              Confirm Rejection
            </Button>
          </DialogActions>
        </Dialog>

        {/* Toasts */}
        <Toaster
          position={isMobile ? "bottom-center" : "bottom-left"}
          reverseOrder={false}
          toastOptions={{
            style: {
              border: `1px solid ${ui.stroke}`,
              padding: isMobile ? "12px" : "16px",
              color: "#111827",
              fontSize: isMobile ? "0.95rem" : "1rem",
              background: "#fff",
            },
            success: {
              duration: 3000,
              style: { background: ui.primary, color: "white" },
              iconTheme: { primary: "white", secondary: ui.primary },
            },
            error: {
              duration: 5000,
              style: { background: "#dc3545", color: "white" },
              iconTheme: { primary: "white", secondary: "#dc3545" },
            },
            loading: { duration: Infinity },
          }}
        />
      </Container>
    </Box>
  );
};

export default NomineeManagementPage;
