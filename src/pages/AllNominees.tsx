// src/pages/AllNomineesPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import {
  Box, Typography, Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, CircularProgress, Alert, Dialog, DialogActions, DialogContent, DialogTitle, TextField, IconButton,
  Toolbar, AppBar, Grid, Chip, FormControl, InputLabel, Select, MenuItem, InputAdornment, SelectChangeEvent,
  TablePagination, useMediaQuery, Skeleton
} from "@mui/material";
import {
  Visibility as ViewIcon, Search as SearchIcon, Refresh as RefreshIcon,
  CheckCircle as ApproveIcon, Gavel as DisqualifyIcon, Cancel as RejectIcon, Edit as EditIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import toast, { Toaster } from "react-hot-toast";

interface Nominee {
  id: number;
  full_name: string;
  national_id: string;
  position: string;
  status: 1 | 2 | 3 | 4 | 5;
  county: string;
  nomination_date: string;
  constituency?: string;
  ward?: string;
  polling_station?: string;
  rejection_reason?: string;
  disqualify_reason?: string;
  email?: string;
}

interface NomineeDetails {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  physical_address: string;
  id_number: string;
  dob: string;
  gender: string;
  education_level: string;
  occupation: string;
  nomination_date: string;
  rejection_reason?: string;
  disqualify_reason?: string;
  vetting_notes?: string;
  document_path?: string;
  status: 1 | 2 | 3 | 4 | 5;
}

const API_BASE_URL = "https://skizagroundsuite.com/API";

const partyColors = { primary: "#006400", secondary: "#FFA500" } as const;

const statusMap: Record<Nominee["status"], string> = {
  1: "Pending Vetting",
  2: "Approved",
  3: "Rejected",
  4: "Payment Pending",
  5: "Disqualified",
};

type StatusFilter = "all" | "1" | "2" | "3" | "4" | "5";
const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "1", label: statusMap[1] },
  { value: "2", label: statusMap[2] },
  { value: "3", label: statusMap[3] },
  { value: "4", label: statusMap[4] },
  { value: "5", label: statusMap[5] },
];

const getStatusChipColor = (
  statusCode: Nominee["status"]
): "warning" | "success" | "error" | "info" | "default" => {
  switch (statusCode) {
    case 1: return "warning";
    case 2: return "success";
    case 3: return "error";
    case 4: return "info";
    case 5: return "error";
    default: return "default";
  }
};

/* ---------- fetch helpers (timeout, abort, cache) ---------- */
const CACHE_KEY = "nominees:all:v1";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 min

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, credentials: "include" });
    return res;
  } finally {
    clearTimeout(t);
  }
}

const readCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data as Nominee[];
  } catch { return null; }
};

const writeCache = (data: Nominee[]) => {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
};

const AllNomineesPage: React.FC = () => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [allNominees, setAllNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [openDetailDialog, setOpenDetailDialog] = useState<boolean>(false);
  const [selectedNominee, setSelectedNominee] = useState<Nominee | null>(null);
  const [nomineeDetails, setNomineeDetails] = useState<NomineeDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const deferredSearch = useDeferredValue(searchTerm);

  const [openReasonDialog, setOpenReasonDialog] = useState<boolean>(false);
  const [reasonText, setReasonText] = useState<string>("");
  const [currentActionType, setCurrentActionType] =
    useState<"reject" | "disqualify" | "edit-reject" | "edit-disqualify" | null>(null);

  // pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Abort across refreshes
  const fetchAbortRef = useRef<AbortController | null>(null);

  const fetchAllNominees = useCallback(async () => {
    setLoading(true);
    setError(null);

    // try cache first
    const cached = readCache();
    if (cached) {
      setAllNominees(cached);
      setLoading(false);
      return;
    }

    // cancel previous
    fetchAbortRef.current?.abort();
    const ctrl = new AbortController();
    fetchAbortRef.current = ctrl;

    try {
      // small retry loop
      let lastErr: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetchWithTimeout(`${API_BASE_URL}/fetch_all_nominees.php`, { signal: ctrl.signal }, 12000);
          if (!res.ok) {
            let serverMessage = "";
            try { serverMessage = (await res.json())?.message ?? ""; } catch {}
            throw new Error(serverMessage || `HTTP ${res.status}`);
          }
          const result: { status: string; message?: string; data?: any[] } = await res.json();
          if (result.status === "success" && Array.isArray(result.data)) {
            const normalized: Nominee[] = result.data.map((n) => ({
              id: Number(n.id),
              full_name: n.full_name,
              national_id: n.national_id || "N/A",
              position: n.position,
              status: Number(n.status) as Nominee["status"],
              county: n.county,
              nomination_date: n.nomination_date || "N/A",
              constituency: n.constituency,
              ward: n.ward,
              polling_station: n.polling_station,
              rejection_reason: n.rejection_reason,
              disqualify_reason: n.disqualify_reason,
              email: n.email,
            }));
            setAllNominees(normalized);
            writeCache(normalized);
            setLoading(false);
            return;
          }
          throw new Error(result.message || "Failed to fetch nominees.");
        } catch (err: any) {
          lastErr = err;
          await new Promise((r) => setTimeout(r, 400)); // brief backoff
        }
      }
      throw lastErr || new Error("Failed to fetch nominees.");
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      const msg = `Failed to load nominee records: ${err.message}`;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNomineeDetails = useCallback(async (id: number): Promise<NomineeDetails> => {
    const res = await fetchWithTimeout(`${API_BASE_URL}/get_nominee_details.php?id=${id}`);
    if (!res.ok) {
      let serverMessage = "";
      try { serverMessage = (await res.json())?.message ?? ""; } catch {}
      throw new Error(serverMessage || `HTTP ${res.status}`);
    }
    const result: { status: string; message?: string; data?: any } = await res.json();
    if (result.status === "success" && result.data) {
      return {
        id: Number(result.data.id),
        full_name: result.data.full_name,
        email: result.data.email || "N/A",
        phone: result.data.phone || "N/A",
        physical_address: result.data.physical_address || "N/A",
        id_number: result.data.id_number || "N/A",
        dob: result.data.dob || "N/A",
        gender: result.data.gender || "N/A",
        education_level: result.data.education_level || "N/A",
        occupation: result.data.occupation || "N/A",
        nomination_date: result.data.nomination_date || "N/A",
        rejection_reason: result.data.rejection_reason || result.data.reason || "Not Provided",
        disqualify_reason: result.data.disqualify_reason || "Not Provided",
        vetting_notes: result.data.vetting_notes || "N/A",
        document_path: result.data.document_path,
        status: Number(result.data.status) as NomineeDetails["status"],
      };
    }
    throw new Error(result.message || "Failed to fetch nominee details.");
  }, []);

  useEffect(() => { fetchAllNominees(); return () => fetchAbortRef.current?.abort(); }, [fetchAllNominees]);

  /* ---------- derived filtering + pagination ---------- */
  const filteredNominees = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    const statusNum = statusFilter === "all" ? null : Number(statusFilter);
    return allNominees.filter((n) => {
      const matchesStatus = statusNum == null || n.status === (statusNum as Nominee["status"]);
      if (!needle) return matchesStatus;
      const hay =
        `${n.full_name} ${n.id} ${n.national_id} ${n.email ?? ""} ${n.position} ${n.county} ${n.rejection_reason ?? ""} ${n.disqualify_reason ?? ""}`.toLowerCase();
      return matchesStatus && hay.includes(needle);
    });
  }, [allNominees, deferredSearch, statusFilter]);

  const pagedNominees = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredNominees.slice(start, start + rowsPerPage);
  }, [filteredNominees, page, rowsPerPage]);

  useEffect(() => { setPage(0); }, [statusFilter, deferredSearch]); // reset page on filter/search

  /* ---------- actions ---------- */
  const handleViewDetails = async (nominee: Nominee) => {
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
    if (!window.confirm("Are you sure you want to approve this nominee?")) return;
    const approvalPromise = (async () => {
      const response = await fetch(`${API_BASE_URL}/approve_nominee.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result: { status: string; message?: string } = await response.json();
      if (response.ok && result.status === "success") {
        await fetchAllNominees();
        return "Nominee approved successfully!";
      }
      throw new Error(result.message || `Failed with status: ${response.status}`);
    })();
    toast.promise(approvalPromise, {
      loading: "Approving nominee...",
      success: (m) => m,
      error: (e) => e.message || "Approval failed!",
    });
  };

  const startReasonFlow = (type: "reject" | "disqualify" | "edit-reject" | "edit-disqualify", nominee: Nominee) => {
    setSelectedNominee(nominee);
    setCurrentActionType(type);
    setReasonText(
      type === "reject" || type === "edit-reject" ? nominee.rejection_reason || "" : nominee.disqualify_reason || ""
    );
    setOpenReasonDialog(true);
  };

  const handleReasonActionConfirm = async () => {
    if (!reasonText.trim()) return toast.error("Reason cannot be empty.");
    if (!selectedNominee || !currentActionType) return toast.error("No nominee selected or invalid action.");

    let endpoint = "";
    let okMsg = "";
    let failMsg = "";
    if (currentActionType === "reject" || currentActionType === "edit-reject") {
      endpoint = `${API_BASE_URL}/reject_nominee.php`;
      okMsg = currentActionType === "reject" ? "Nominee rejected successfully!" : "Rejection reason updated successfully!";
      failMsg = "Rejection failed!";
    } else {
      endpoint = `${API_BASE_URL}/disqualify_nominee.php`;
      okMsg = currentActionType === "disqualify" ? "Nominee disqualified successfully!" : "Disqualification reason updated successfully!";
      failMsg = "Disqualification failed!";
    }

    const actionPromise = (async () => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedNominee.id, reason: reasonText, updatedBy: "Admin" }),
      });
      const result: { status: string; message?: string } = await response.json();
      if (response.ok && result.status === "success") {
        await fetchAllNominees();
        setOpenReasonDialog(false);
        return okMsg;
      }
      throw new Error(result.message || `Failed with status: ${response.status}`);
    })();

    toast.promise(actionPromise, {
      loading: "Processing...",
      success: (m) => m,
      error: (e) => e.message || failMsg,
    });
  };

  /* ---------- labels ---------- */
  const reasonDialogTitle = (() => {
    if (!selectedNominee) return "Action Nominee";
    const base = selectedNominee.full_name;
    switch (currentActionType) {
      case "reject": return `Reject Nominee: ${base}`;
      case "disqualify": return `Disqualify Nominee: ${base}`;
      case "edit-reject": return `Edit Rejection Reason: ${base}`;
      case "edit-disqualify": return `Edit Disqualification Reason: ${base}`;
      default: return `Reason for ${base}`;
    }
  })();

  const reasonLabel = (() => {
    switch (currentActionType) {
      case "reject": return "Reason for Rejection";
      case "disqualify": return "Reason for Disqualification";
      case "edit-reject": return "Update Rejection Reason";
      case "edit-disqualify": return "Update Disqualification Reason";
      default: return "Reason";
    }
  })();

  const confirmBtnText = (() => {
    switch (currentActionType) {
      case "reject": return "Confirm Rejection";
      case "disqualify": return "Confirm Disqualification";
      case "edit-reject":
      case "edit-disqualify": return "Update Reason";
      default: return "Confirm";
    }
  })();

  /* ---------- render ---------- */
  return (
    <Container maxWidth="xl" sx={{ py: 4, pt: `calc(env(safe-area-inset-top) + 16px)` }}>
      <AppBar position="sticky" sx={{ top: 0, mb: 3, bgcolor: partyColors.primary, boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
        <Toolbar
          sx={{
            justifyContent: "space-between",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
            gap: { xs: 1.5, md: 0 },
            py: { xs: 1.5, md: 1 },
          }}
        >
          <Typography variant={isXs ? "h5" : "h4"} component="h1" sx={{ color: "white", fontWeight: "bold" }}>
            All Nominees
          </Typography>
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap" justifyContent={{ xs: "center", md: "flex-end" }}>
            <TextField
              placeholder="Search (Name, ID, Email, Position, County, Reason)"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                minWidth: { xs: "100%", sm: 320 },
                bgcolor: "white",
                borderRadius: 1,
                ".MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ mr: 0.5, color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl sx={{ minWidth: 160, bgcolor: "white", borderRadius: 1 }} size="small">
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Status"
                onChange={(event: SelectChangeEvent) => setStatusFilter(event.target.value as StatusFilter)}
              >
                {statusFilterOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              sx={{ bgcolor: partyColors.secondary, color: "white", "&:hover": { bgcolor: "#e69500" } }}
              startIcon={<RefreshIcon />}
              onClick={fetchAllNominees}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {loading ? (
        <Paper elevation={3} sx={{ overflow: "hidden" }}>
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height={56} sx={{ mb: 1 }} />
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={44} sx={{ mb: 1 }} />
            ))}
          </Box>
        </Paper>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Paper elevation={3} sx={{ overflow: "hidden" }}>
          <TableContainer sx={{ maxHeight: "70vh" }}>
            <Table stickyHeader size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: partyColors.primary }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>ID</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>Full Name</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", display: { xs: "none", md: "table-cell" } }}>
                    National ID
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>Position</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", display: { xs: "none", sm: "table-cell" } }}>
                    County
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>Status</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", display: { xs: "none", sm: "table-cell" } }}>
                    Nomination Date
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", display: { xs: "none", md: "table-cell" } }}>
                    Reason
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedNominees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                      <Typography variant="h6" color="text.secondary">
                        No nominees found matching your criteria.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedNominees.map((n) => (
                    <TableRow key={n.id} hover>
                      <TableCell sx={{ fontSize: "0.9rem" }}>{n.id}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: "1rem" }}>{n.full_name}</TableCell>
                      <TableCell sx={{ fontSize: "0.9rem", display: { xs: "none", md: "table-cell" } }}>
                        {n.national_id}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.9rem" }}>{n.position}</TableCell>
                      <TableCell sx={{ fontSize: "0.9rem", display: { xs: "none", sm: "table-cell" } }}>
                        {n.county}
                      </TableCell>
                      <TableCell>
                        <Chip label={statusMap[n.status]} color={getStatusChipColor(n.status)} size="small" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.9rem", display: { xs: "none", sm: "table-cell" } }}>
                        {n.nomination_date}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.9rem", display: { xs: "none", md: "table-cell" } }}>
                        {n.status === 3 ? (n.rejection_reason || "N/A")
                          : n.status === 5 ? (n.disqualify_reason || "N/A")
                          : "N/A"}
                      </TableCell>
                      <TableCell align="center" sx={{ minWidth: 220 }}>
                        <IconButton color="primary" onClick={() => handleViewDetails(n)} size="small" aria-label={`View ${n.full_name}`}>
                          <ViewIcon fontSize="small" />
                        </IconButton>

                        {(n.status === 1 || n.status === 3) && (
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => handleApproveNominee(n.id)}
                            startIcon={<ApproveIcon />}
                            size="small"
                            sx={{ ml: 0.5 }}
                          >
                            Approve
                          </Button>
                        )}

                        {(n.status === 1 || n.status === 2) && (
                          <Button
                            variant="contained"
                            color="error"
                            onClick={() => startReasonFlow("reject", n)}
                            startIcon={<RejectIcon />}
                            size="small"
                            sx={{ ml: 0.5 }}
                          >
                            Reject
                          </Button>
                        )}

                        {(n.status === 3 || n.status === 5) && (
                          <Button
                            variant="contained"
                            color="warning"
                            onClick={() => startReasonFlow(n.status === 3 ? "edit-reject" : "edit-disqualify", n)}
                            startIcon={<EditIcon />}
                            size="small"
                            sx={{ ml: 0.5 }}
                          >
                            Edit Reason
                          </Button>
                        )}

                        {n.status !== 5 && (
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => startReasonFlow("disqualify", n)}
                            startIcon={<DisqualifyIcon />}
                            size="small"
                            sx={{ ml: 0.5, bgcolor: "#6a0dad", "&:hover": { bgcolor: "#5a0cab" } }}
                          >
                            Disqualify
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredNominees.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      )}

      {/* Details dialog */}
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isXs}
        transitionDuration={window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : undefined}
        PaperProps={{
          sx: {
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: partyColors.primary, color: "white", fontWeight: "bold" }}>
          Nominee Details: {selectedNominee?.full_name}
        </DialogTitle>
        <DialogContent dividers>
          {detailsLoading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : nomineeDetails ? (
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography><strong>ID:</strong> {nomineeDetails.id}</Typography>
                <Typography><strong>Full Name:</strong> {nomineeDetails.full_name}</Typography>
                <Typography><strong>National ID:</strong> {nomineeDetails.id_number}</Typography>
                <Typography><strong>Position:</strong> {nomineeDetails.occupation}</Typography>
                <Typography><strong>County:</strong> {nomineeDetails.physical_address.split(",").pop()?.trim() || "N/A"}</Typography>
                <Typography><strong>Status:</strong> {statusMap[nomineeDetails.status] || "Unknown"}</Typography>
                <Typography><strong>Nomination Date:</strong> {nomineeDetails.nomination_date}</Typography>
                <Typography><strong>Email:</strong> {nomineeDetails.email}</Typography>
                <Typography><strong>Phone:</strong> {nomineeDetails.phone}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography><strong>Address:</strong> {nomineeDetails.physical_address}</Typography>
                <Typography><strong>Date of Birth:</strong> {nomineeDetails.dob}</Typography>
                <Typography><strong>Gender:</strong> {nomineeDetails.gender}</Typography>
                <Typography><strong>Education Level:</strong> {nomineeDetails.education_level}</Typography>
                <Typography><strong>Occupation:</strong> {nomineeDetails.occupation}</Typography>
                {nomineeDetails.status === 3 && (
                  <Typography sx={{ mt: 1, color: "error.main", fontWeight: "bold" }}>
                    <strong>Rejection Reason:</strong> {nomineeDetails.rejection_reason || "Not Provided"}
                  </Typography>
                )}
                {nomineeDetails.status === 5 && (
                  <Typography sx={{ mt: 1, color: "error.main", fontWeight: "bold" }}>
                    <strong>Disqualification Reason:</strong> {nomineeDetails.disqualify_reason || "Not Provided"}
                  </Typography>
                )}
                <Typography sx={{ mt: 1 }}><strong>Vetting Notes:</strong> {nomineeDetails.vetting_notes}</Typography>
                {nomineeDetails.document_path && (
                  <Typography>
                    <strong>Documents:</strong>{" "}
                    <a
                      href={`${API_BASE_URL}/${nomineeDetails.document_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: partyColors.primary, textDecoration: "none", fontWeight: "bold" }}
                    >
                      View Documents
                    </a>
                  </Typography>
                )}
              </Grid>
            </Grid>
          ) : (
            <Typography color="error" py={4} textAlign="center">Details could not be loaded or are not available.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: "center" }}>
          <Button onClick={() => setOpenDetailDialog(false)} variant="outlined" sx={{ color: partyColors.primary, borderColor: partyColors.primary }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reason dialog */}
      <Dialog
        open={openReasonDialog}
        onClose={() => setOpenReasonDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isXs}
        transitionDuration={window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : undefined}
      >
        <DialogTitle sx={{ bgcolor: partyColors.primary, color: "white", fontWeight: "bold" }}>
          {reasonDialogTitle}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            margin="dense"
            label={reasonLabel}
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: "space-around" }}>
          <Button onClick={() => setOpenReasonDialog(false)} variant="outlined" sx={{ color: partyColors.primary, borderColor: partyColors.primary }}>
            Cancel
          </Button>
          <Button
            onClick={handleReasonActionConfirm}
            variant="contained"
            color={currentActionType === "reject" || currentActionType === "disqualify" ? "error" : "primary"}
            sx={{ "&:hover": { bgcolor: currentActionType === "reject" || currentActionType === "disqualify" ? "#dc3545" : "#004d00" } }}
          >
            {confirmBtnText}
          </Button>
        </DialogActions>
      </Dialog>

      <Toaster
        position="bottom-left"
        toastOptions={{
          style: { border: `1px solid ${partyColors.primary}`, padding: 16, color: "#333", fontSize: "1rem" },
        }}
      />
    </Container>
  );
};

export default AllNomineesPage;
