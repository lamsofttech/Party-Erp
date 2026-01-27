import React, { useEffect, useMemo, useState } from "react";

import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Chip,
  Divider,
  Grid,
  Stack,
  FormControl,
  Select,
  OutlinedInput,
  Drawer,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Checkbox,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";

import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  MoreVert as MoreIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Edit as EditIcon,
  Cancel as DisqualifyIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

import toast, { Toaster } from "react-hot-toast";


/** =========================
 * Types
 * ========================= */
interface Nominee {
  id: number;
  full_name: string;
  position: string;
  status: number;
  county: string;
  constituency?: string;
  ward?: string;
  polling_station?: string;
  rejection_reason?: string;
  disqualify_reason?: string;
  email?: string;
  rejected_by?: string; // optional if your backend provides
  rejected_on?: string; // optional if your backend provides
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
  status: number;
}

/** =========================
 * Config
 * ========================= */
const API_BASE_URL = "https://skizagroundsuite.com/API";

const partyColors = {
  primary: "#006400",
  secondary: "#FFA500",
};

const statusMap: Record<number, string> = {
  1: "Pending Vetting",
  2: "Approved",
  3: "Rejected",
  4: "Payment Pending",
  5: "Disqualified",
};

const getStatusChipColor = (
  statusCode: number
): "warning" | "success" | "error" | "info" | "default" => {
  switch (statusCode) {
    case 1:
      return "warning";
    case 2:
      return "success";
    case 3:
      return "error";
    case 4:
      return "info";
    case 5:
      return "error";
    default:
      return "default";
  }
};

/** =========================
 * Helpers
 * ========================= */
function formatMaybeDate(v?: string) {
  if (!v) return "—";
  // If backend sends something parseable, show a nice format; otherwise show raw
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleString();
}

function exportToCSV(rows: Nominee[], filename = "rejected_nominees.csv") {
  if (!rows.length) {
    toast.error("Nothing to export.");
    return;
  }

  const headers = [
    "ID",
    "Full Name",
    "Email",
    "Position",
    "County",
    "Status",
    "Rejection Reason",
  ];

  const data = rows.map((r) => [
    r.id,
    r.full_name,
    r.email ?? "",
    r.position,
    r.county ?? "",
    statusMap[r.status] ?? r.status,
    r.rejection_reason ?? "",
  ]);

  const csv = [headers, ...data]
    .map((line) =>
      line
        .map((cell) => {
          const str = String(cell ?? "");
          // escape quotes
          const escaped = str.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** =========================
 * Main Component
 * ========================= */
const RejectedNomineesPage: React.FC = () => {
  const [rejectedNominees, setRejectedNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search + filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPosition, setFilterPosition] = useState<string>("ALL");
  const [filterCounty, setFilterCounty] = useState<string>("ALL");
  const [filterReason, setFilterReason] = useState<string>("ALL");

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Top menu (Export / Settings)
  const [anchorMore, setAnchorMore] = useState<null | HTMLElement>(null);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState(0);
  const [selectedNominee, setSelectedNominee] = useState<Nominee | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [nomineeDetails, setNomineeDetails] = useState<NomineeDetails | null>(
    null
  );

  // Reason editing
  const [editReasonOpen, setEditReasonOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");

  const [disqualifyOpen, setDisqualifyOpen] = useState(false);
  const [disqualifyReasonText, setDisqualifyReasonText] = useState("");

  /** =========================
   * API Calls
   * ========================= */
  const fetchRejectedNominees = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/fetch_rejected_nominees.php`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }
      const result: { status: string; message?: string; data?: any[] } =
        await response.json();

      if (result.status === "success" && Array.isArray(result.data)) {
        const mapped: Nominee[] = result.data.map((n: any) => ({
          id: Number(n.id),
          full_name: n.full_name,
          position: n.position,
          status: Number(n.status),
          county: n.county,
          constituency: n.constituency,
          ward: n.ward,
          polling_station: n.polling_station,
          rejection_reason: n.rejection_reason || n.reason || "Not provided",
          disqualify_reason: n.disqualify_reason || "Not provided",
          email: n.email,
          rejected_by: n.rejected_by,
          rejected_on: n.rejected_on,
        }));
        setRejectedNominees(mapped);
      } else {
        throw new Error(result.message || "Failed to fetch rejected nominees.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load.");
      toast.error(err.message || "Failed to load rejected nominees.");
    } finally {
      setLoading(false);
    }
  };

  const fetchNomineeDetails = async (id: number): Promise<NomineeDetails> => {
    const response = await fetch(`${API_BASE_URL}/get_nominee_details.php?id=${id}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }
    const result: { status: string; message?: string; data?: any } =
      await response.json();

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
        rejection_reason:
          result.data.rejection_reason || result.data.reason || "Not Provided",
        disqualify_reason: result.data.disqualify_reason || "Not Provided",
        vetting_notes: result.data.vetting_notes || "N/A",
        document_path: result.data.document_path,
        status: Number(result.data.status),
      };
    }
    throw new Error(result.message || "Failed to fetch nominee details.");
  };

  const approveNominee = async (id: number) => {
    if (
      !window.confirm(
        "Approve this previously rejected nominee? This action is irreversible."
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
        const result: { status: string; message?: string } = await response.json();
        if (response.ok && result.status === "success") {
          await fetchRejectedNominees();
          resolve("Nominee approved successfully!");
        } else {
          reject(new Error(result.message || `Failed with status ${response.status}`));
        }
      } catch (e: any) {
        reject(new Error(e.message || "Approval failed"));
      }
    });

    toast.promise(approvalPromise, {
      loading: "Approving nominee...",
      success: (m) => m,
      error: (e) => e.message || "Approval failed!",
    });
  };

  const updateRejectionReason = async () => {
    if (!reasonText.trim()) {
      toast.error("Rejection reason cannot be empty.");
      return;
    }
    if (!selectedNominee) return;

    const updatePromise = new Promise<string>(async (resolve, reject) => {
      try {
        const response = await fetch(`${API_BASE_URL}/reject_nominee.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedNominee.id,
            reason: reasonText,
            updatedBy: "Admin",
          }),
        });
        const result: { status: string; message?: string } = await response.json();
        if (response.ok && result.status === "success") {
          await fetchRejectedNominees();
          setEditReasonOpen(false);
          resolve("Rejection reason updated successfully!");
        } else {
          reject(new Error(result.message || `Failed with status ${response.status}`));
        }
      } catch (e: any) {
        reject(new Error(e.message || "Update failed"));
      }
    });

    toast.promise(updatePromise, {
      loading: "Updating reason...",
      success: (m) => m,
      error: (e) => e.message || "Update failed!",
    });
  };

  const disqualifyNominee = async () => {
    if (!disqualifyReasonText.trim()) {
      toast.error("Disqualification reason cannot be empty.");
      return;
    }
    if (!selectedNominee) return;

    const disqualifyPromise = new Promise<string>(async (resolve, reject) => {
      try {
        const response = await fetch(`${API_BASE_URL}/disqualify_nominee.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedNominee.id,
            reason: disqualifyReasonText,
            updatedBy: "Admin",
          }),
        });
        const result: { status: string; message?: string } = await response.json();
        if (response.ok && result.status === "success") {
          await fetchRejectedNominees();
          setDisqualifyOpen(false);
          // If it becomes status=5, it will disappear from rejected list; close drawer
          setDrawerOpen(false);
          resolve("Nominee disqualified successfully!");
        } else {
          reject(new Error(result.message || `Failed with status ${response.status}`));
        }
      } catch (e: any) {
        reject(new Error(e.message || "Disqualification failed"));
      }
    });

    toast.promise(disqualifyPromise, {
      loading: "Disqualifying nominee...",
      success: (m) => m,
      error: (e) => e.message || "Disqualification failed!",
    });
  };

  /** =========================
   * Lifecycle
   * ========================= */
  useEffect(() => {
    fetchRejectedNominees();
  }, []);

  /** =========================
   * Derived values
   * ========================= */
  const positions = useMemo(() => {
    const s = new Set<string>();
    rejectedNominees.forEach((n) => n.position && s.add(n.position));
    return ["ALL", ...Array.from(s).sort()];
  }, [rejectedNominees]);

  const counties = useMemo(() => {
    const s = new Set<string>();
    rejectedNominees.forEach((n) => n.county && s.add(n.county));
    return ["ALL", ...Array.from(s).sort()];
  }, [rejectedNominees]);

  const reasons = useMemo(() => {
    const s = new Set<string>();
    rejectedNominees.forEach((n) => n.rejection_reason && s.add(n.rejection_reason));
    return ["ALL", ...Array.from(s).sort()];
  }, [rejectedNominees]);

  const filteredNominees = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    return rejectedNominees.filter((n) => {
      const matchesSearch =
        !t ||
        n.full_name.toLowerCase().includes(t) ||
        n.id.toString().includes(t) ||
        (n.email || "").toLowerCase().includes(t) ||
        n.position.toLowerCase().includes(t) ||
        (n.county || "").toLowerCase().includes(t) ||
        (n.rejection_reason || "").toLowerCase().includes(t);

      const matchesPosition = filterPosition === "ALL" || n.position === filterPosition;
      const matchesCounty = filterCounty === "ALL" || n.county === filterCounty;
      const matchesReason = filterReason === "ALL" || (n.rejection_reason || "") === filterReason;

      return matchesSearch && matchesPosition && matchesCounty && matchesReason;
    });
  }, [rejectedNominees, searchTerm, filterPosition, filterCounty, filterReason]);

  // KPI cards (simple) — if you don't have timestamps, show totals
  const kpiToday = "—";
  const kpiWeek = "—";
  const kpiTotal = rejectedNominees.length;

  /** =========================
   * Handlers
   * ========================= */
  const openDetailsDrawer = async (nominee: Nominee) => {
    setSelectedNominee(nominee);
    setDrawerTab(0);
    setDrawerOpen(true);
    setNomineeDetails(null);
    setDetailsLoading(true);
    try {
      const details = await fetchNomineeDetails(nominee.id);
      setNomineeDetails(details);
    } catch (e: any) {
      toast.error(e.message || "Failed to load nominee details.");
      setNomineeDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(filteredNominees.map((n) => n.id));
    else setSelectedIds([]);
  };

  const toggleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)
    );
  };

  const selectedRows = useMemo(
    () => rejectedNominees.filter((n) => selectedIds.includes(n.id)),
    [rejectedNominees, selectedIds]
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumb + Top actions */}
      <Box sx={{ mb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" color="text.secondary">
          Nominations <span style={{ margin: "0 6px" }}>›</span> Review Queue{" "}
          <span style={{ margin: "0 6px" }}>›</span>{" "}
          <b style={{ color: "#111" }}>Rejected</b>
        </Typography>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => exportToCSV(filteredNominees, "rejected_nominees_filtered.csv")}
            disabled={loading || filteredNominees.length === 0}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchRejectedNominees}
            disabled={loading}
            sx={{ bgcolor: partyColors.secondary, color: "white", "&:hover": { bgcolor: "#e69500" } }}
          >
            Refresh
          </Button>
          <IconButton
            onClick={(e) => setAnchorMore(e.currentTarget)}
            sx={{ border: "1px solid #ddd", borderRadius: 2 }}
          >
            <MoreIcon />
          </IconButton>
          <Menu
            anchorEl={anchorMore}
            open={Boolean(anchorMore)}
            onClose={() => setAnchorMore(null)}
          >
            <MenuItem
              onClick={() => {
                setAnchorMore(null);
                toast("Settings panel can be added here.");
              }}
            >
              <SettingsIcon fontSize="small" style={{ marginRight: 10 }} />
              Settings
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorMore(null);
                exportToCSV(rejectedNominees, "rejected_nominees_all.csv");
              }}
              disabled={rejectedNominees.length === 0}
            >
              <DownloadIcon fontSize="small" style={{ marginRight: 10 }} />
              Export all
            </MenuItem>
          </Menu>
        </Stack>
      </Box>

      {/* Title */}
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
        Rejected Nominees
      </Typography>

      {/* KPI cards */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Rejected (Today)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {kpiToday}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Rejected (This Week)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {kpiWeek}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Total Rejected
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {kpiTotal}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Search + Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search Name, ID, Email, Position"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <Select
                value={filterPosition}
                onChange={(e) => setFilterPosition(String(e.target.value))}
                input={<OutlinedInput />}
              >
                {positions.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p === "ALL" ? "Position: All" : p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <Select
                value={filterCounty}
                onChange={(e) => setFilterCounty(String(e.target.value))}
                input={<OutlinedInput />}
              >
                {counties.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c === "ALL" ? "County: All" : c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <Select
                value={filterReason}
                onChange={(e) => setFilterReason(String(e.target.value))}
                input={<OutlinedInput />}
              >
                {reasons.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r === "ALL" ? "Reason: All" : r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => toast("Add advanced filters (date range / rejected by) if backend supports.")}
              >
                Filters
              </Button>

              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                disabled={selectedIds.length === 0}
                onClick={() => exportToCSV(selectedRows, "rejected_nominees_selected.csv")}
              >
                Export Selected ({selectedIds.length})
              </Button>

              <Box sx={{ flex: 1 }} />

              {(filterCounty !== "ALL" ||
                filterPosition !== "ALL" ||
                filterReason !== "ALL" ||
                searchTerm.trim()) && (
                  <Button
                    variant="text"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterCounty("ALL");
                      setFilterPosition("ALL");
                      setFilterReason("ALL");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={
                        filteredNominees.length > 0 &&
                        selectedIds.length === filteredNominees.length
                      }
                      indeterminate={
                        selectedIds.length > 0 &&
                        selectedIds.length < filteredNominees.length
                      }
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Nominee ID</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Full Name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Position</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Rejected On</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Rejected By</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredNominees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <Typography variant="h6" color="text.secondary">
                        No rejected nominees match your filters.
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "center" }}>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setSearchTerm("");
                            setFilterCounty("ALL");
                            setFilterPosition("ALL");
                            setFilterReason("ALL");
                          }}
                        >
                          Clear Filters
                        </Button>
                        <Button variant="contained" sx={{ bgcolor: partyColors.primary, "&:hover": { bgcolor: "#004d00" } }}>
                          Go to Review Queue
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNominees.map((n) => (
                    <TableRow key={n.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(n.id)}
                          onChange={(e) => toggleSelectOne(n.id, e.target.checked)}
                        />
                      </TableCell>

                      <TableCell sx={{ fontWeight: 700 }}>{`NM-${n.id}`}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{n.full_name}</TableCell>
                      <TableCell>{n.email || "—"}</TableCell>
                      <TableCell>{n.position}</TableCell>
                      <TableCell>{formatMaybeDate(n.rejected_on)}</TableCell>
                      <TableCell>{n.rejected_by || "—"}</TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={statusMap[n.status] || "Unknown"}
                            color={getStatusChipColor(n.status)}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                          <Chip
                            label={(n.rejection_reason || "Not provided").slice(0, 24) + ((n.rejection_reason || "").length > 24 ? "…" : "")}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="View details">
                            <IconButton
                              size="small"
                              onClick={() => openDetailsDrawer(n)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<ApproveIcon />}
                            onClick={() => approveNominee(n.id)}
                          >
                            Approve
                          </Button>

                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            startIcon={<EditIcon />}
                            onClick={() => {
                              setSelectedNominee(n);
                              setReasonText(n.rejection_reason || "");
                              setEditReasonOpen(true);
                            }}
                          >
                            Edit Reason
                          </Button>

                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<DisqualifyIcon />}
                            onClick={() => {
                              setSelectedNominee(n);
                              setDisqualifyReasonText(n.disqualify_reason || "");
                              setDisqualifyOpen(true);
                            }}
                          >
                            Disqualify
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ p: 1.5, display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredNominees.length} of {rejectedNominees.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last refreshed: Just now
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Right Drawer (Details) */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 420 }, p: 2 } }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              {selectedNominee ? `NM-${selectedNominee.id}` : "—"}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              {selectedNominee?.full_name || "Nominee"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedNominee?.email || "—"}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip
                label={selectedNominee ? statusMap[selectedNominee.status] : "—"}
                color={selectedNominee ? getStatusChipColor(selectedNominee.status) : "default"}
                size="small"
                sx={{ fontWeight: 800 }}
              />
            </Box>
          </Box>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Tabs
          value={drawerTab}
          onChange={(_, v) => setDrawerTab(v)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab label="Rejection Details" />
          <Tab label="Audit Trail" />
          <Tab label="Attachments" />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          {detailsLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : !nomineeDetails ? (
            <Typography color="text.secondary">No details loaded.</Typography>
          ) : drawerTab === 0 ? (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Rejection Reason
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                {nomineeDetails.rejection_reason || "Not provided"}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Note: {nomineeDetails.vetting_notes || "—"}
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="body2">
                  <b>Rejected by:</b> {selectedNominee?.rejected_by || "—"}
                </Typography>
                <Typography variant="body2">
                  <b>Rejected on:</b> {formatMaybeDate(selectedNominee?.rejected_on)}
                </Typography>
              </Paper>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="text.secondary">
                Quick Info
              </Typography>
              <Stack spacing={0.6} sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <b>Phone:</b> {nomineeDetails.phone}
                </Typography>
                <Typography variant="body2">
                  <b>ID Number:</b> {nomineeDetails.id_number}
                </Typography>
                <Typography variant="body2">
                  <b>Gender:</b> {nomineeDetails.gender}
                </Typography>
                <Typography variant="body2">
                  <b>Education:</b> {nomineeDetails.education_level}
                </Typography>
              </Stack>
            </Box>
          ) : drawerTab === 1 ? (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Audit Trail (sample)
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="body2">• Submitted → Under Review</Typography>
                <Typography variant="body2">• Under Review → Rejected</Typography>
                <Typography variant="body2" color="text.secondary">
                  (If you have an audit endpoint, I can wire it here.)
                </Typography>
              </Paper>
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Attachments
              </Typography>
              {nomineeDetails.document_path ? (
                <Button
                  variant="contained"
                  sx={{ bgcolor: partyColors.primary, "&:hover": { bgcolor: "#004d00" } }}
                  onClick={() => window.open(`${API_BASE_URL}/${nomineeDetails.document_path}`, "_blank")}
                >
                  View Documents
                </Button>
              ) : (
                <Typography color="text.secondary">No attachments available.</Typography>
              )}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Drawer actions */}
        <Stack direction="row" spacing={1}>
          <Button
            fullWidth
            variant="contained"
            color="success"
            startIcon={<ApproveIcon />}
            disabled={!selectedNominee}
            onClick={() => selectedNominee && approveNominee(selectedNominee.id)}
          >
            Approve
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<EditIcon />}
            disabled={!selectedNominee}
            onClick={() => {
              if (!selectedNominee) return;
              setReasonText(selectedNominee.rejection_reason || "");
              setEditReasonOpen(true);
            }}
          >
            Edit Reason
          </Button>
        </Stack>

        <Button
          sx={{ mt: 1 }}
          fullWidth
          variant="contained"
          color="error"
          startIcon={<DisqualifyIcon />}
          disabled={!selectedNominee}
          onClick={() => {
            if (!selectedNominee) return;
            setDisqualifyReasonText(selectedNominee.disqualify_reason || "");
            setDisqualifyOpen(true);
          }}
        >
          Disqualify
        </Button>
      </Drawer>

      {/* Edit Reason inline "dialog" (simple drawer-like overlay using a basic Paper) */}
      {editReasonOpen && (
        <Drawer
          anchor="right"
          open={editReasonOpen}
          onClose={() => setEditReasonOpen(false)}
          PaperProps={{ sx: { width: { xs: "100%", sm: 420 }, p: 2 } }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Edit Rejection Reason
            </Typography>
            <IconButton onClick={() => setEditReasonOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedNominee?.full_name}
          </Typography>
          <TextField
            label="Reason"
            multiline
            rows={6}
            fullWidth
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button fullWidth variant="outlined" onClick={() => setEditReasonOpen(false)}>
              Cancel
            </Button>
            <Button
              fullWidth
              variant="contained"
              sx={{ bgcolor: partyColors.primary, "&:hover": { bgcolor: "#004d00" } }}
              onClick={updateRejectionReason}
            >
              Update
            </Button>
          </Stack>
        </Drawer>
      )}

      {/* Disqualify drawer */}
      {disqualifyOpen && (
        <Drawer
          anchor="right"
          open={disqualifyOpen}
          onClose={() => setDisqualifyOpen(false)}
          PaperProps={{ sx: { width: { xs: "100%", sm: 420 }, p: 2 } }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Disqualify Nominee
            </Typography>
            <IconButton onClick={() => setDisqualifyOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedNominee?.full_name}
          </Typography>
          <TextField
            label="Disqualification Reason"
            multiline
            rows={6}
            fullWidth
            value={disqualifyReasonText}
            onChange={(e) => setDisqualifyReasonText(e.target.value)}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button fullWidth variant="outlined" onClick={() => setDisqualifyOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth variant="contained" color="error" onClick={disqualifyNominee}>
              Confirm Disqualify
            </Button>
          </Stack>
        </Drawer>
      )}

      <Toaster position="bottom-left" reverseOrder={false} />
    </Container>
  );
};

export default RejectedNomineesPage;
