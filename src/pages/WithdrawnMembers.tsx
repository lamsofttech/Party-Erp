import React, { useEffect, useMemo, useState } from "react";
import axios, { AxiosError } from "axios";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Paper,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextareaAutosize,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbarContainer,
  GridRowIdGetter,
  GridRowId,
} from "@mui/x-data-grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import debounce from "lodash/debounce";
import * as XLSX from "xlsx";
import toast, { Toaster } from "react-hot-toast";

/** =========================
 *  Config & Axios client
 *  ========================= */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://skizagroundsuite.com/API";
const partyColors = { primary: "#006400", lightBg: "#f9fafb" };

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    // eslint-disable-next-line no-console
    console.error("API error:", err.response?.data || err.message);
    return Promise.reject(err);
  }
);

/** =========================
 *  Types & helpers
 *  ========================= */
type UIStatus =
  | "pending"
  | "in_progress"
  | "awaiting_settlement"
  | "withdrawn"
  | "rejected"
  | "approved"
  | "dismissed"
  | string;

type Withdrawal = {
  id?: string | number;
  membership_number?: string;
  member_no?: string;
  full_name?: string;
  fullnames?: string;
  email?: string;
  phone_number?: string;
  phone?: string;
  constituency?: string;
  constituency_name?: string;
  state_province?: string;
  county?: string;
  status?: UIStatus;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
  [k: string]: any;
};

const getMembershipNumber = (w: Withdrawal) =>
  (w as any)?.member_no ?? (w as any)?.membership_number ?? "";
const getFullName = (w: Withdrawal) => (w as any)?.full_name ?? (w as any)?.fullnames ?? "";
const getPhone = (w: Withdrawal) => (w as any)?.phone_number ?? (w as any)?.phone ?? "";
const getConstituency = (w: Withdrawal) => (w as any)?.constituency ?? (w as any)?.constituency_name ?? "";
const getCounty = (w: Withdrawal) => (w as any)?.state_province ?? (w as any)?.county ?? "";
const getEmail = (w: Withdrawal) => (w as any)?.email ?? "";
const getStatus = (w: Withdrawal) => (w as any)?.status ?? "";
const getRemarks = (w: Withdrawal) => (w as any)?.remarks ?? "";
const getId = (w: Withdrawal, idx: number) =>
  (w as any)?.id ?? `${getMembershipNumber(w)}-${idx}`;

const STATUS_LABEL = (s: UIStatus) => {
  switch (s) {
    case "pending": return "Pending Review";
    case "in_progress": return "Processing";
    case "awaiting_settlement": return "Awaiting Settlement";
    case "withdrawn": return "Withdrawn & Settled";
    case "rejected": return "Rejected";
    case "approved": return "Approved Member";
    case "dismissed": return "Dismissed";
    default: return "Unknown Status";
  }
};

const STATUS_TO_CODE: Record<string, "1" | "2" | "3" | "4" | "5"> = {
  in_progress: "1",
  awaiting_settlement: "2",
  withdrawn: "3",
  approved: "4",
  rejected: "5",
};

/** =========================
 *  API helpers
 *  ========================= */
async function getWithdrawals(): Promise<Withdrawal[]> {
  const { data, status } = await api.get(`${API_BASE}/get_withdrawn_members.php`, {
    headers: { Accept: "application/json" },
    transformResponse: [(raw) => {
      try { return JSON.parse(raw as string); } catch { return raw; }
    }],
  });
  if (status !== 200 || !data || (data.status && String(data.status).toLowerCase() !== "success" && !data.success)) {
    throw new Error(data?.message || "Failed to load withdrawn members.");
  }
  const arr = Array.isArray(data?.members) ? (data.members as Withdrawal[]) : [];
  return arr.map((m, idx) => ({ ...m, id: getId(m, idx) }));
}

async function updateWithdrawalStatusJSON(args: {
  memberNo: string;
  uiStatus: "withdrawn" | "rejected" | "in_progress" | "awaiting_settlement" | "approved";
  rejectReason?: string;
}): Promise<string> {
  const member_no = args.memberNo.trim();
  const code = STATUS_TO_CODE[args.uiStatus];
  if (!member_no || !code) throw new Error("Missing member number or invalid status.");

  const body: Record<string, any> = { member_no, newStatus: code };
  if (code === "5") {
    const reason = (args.rejectReason || "").trim();
    if (!reason) throw new Error("Rejection reason is required.");
    body.rejectReason = reason;
  }
  const { data, status } = await api.post(`/update_withdrawal_status.php`, body, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });
  if (status !== 200 || !data || (data.status && String(data.status).toLowerCase() !== "success" && !data.success)) {
    throw new Error(data?.message || "Failed to update status.");
  }
  return data?.message || "Status updated.";
}

/** =========================
 *  Component
 *  ========================= */
const Withdrawals: React.FC = () => {
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [openView, setOpenView] = useState(false);

  const [openSettle, setOpenSettle] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false, message: "", severity: "info",
  });

  const refresh = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getWithdrawals();
      setRows(data);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load withdrawn members.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  // Debounced search
  const handleSearch = useMemo(
    () => debounce((q: string) => setSearch(q.toLowerCase().trim()), 300),
    []
  );
  useEffect(() => () => handleSearch.cancel(), [handleSearch]);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    return rows.filter((r) =>
      [getFullName(r), getEmail(r), getMembershipNumber(r), getPhone(r), getConstituency(r), getCounty(r)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(search))
    );
  }, [rows, search]);

  const totalCount = filteredRows.length;

  // Export
  const exportExcel = () => {
    const data = filteredRows.map((w) => ({
      "Membership No": getMembershipNumber(w),
      "Full Name": getFullName(w),
      Email: getEmail(w),
      Phone: getPhone(w),
      Constituency: getConstituency(w),
      County: getCounty(w),
      Status: STATUS_LABEL(getStatus(w)),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Withdrawn Members");
    XLSX.writeFile(wb, "Withdrawn_Members.xlsx");
  };

  // Status updates
  const applyStatus = async (memberNo: string, uiStatus: Parameters<typeof updateWithdrawalStatusJSON>[0]["uiStatus"], reason?: string) => {
    try {
      const msg = await updateWithdrawalStatusJSON({ memberNo, uiStatus, rejectReason: reason });
      toast.success(msg);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    }
  };

  const settle = async () => {
    if (!selected) return;
    await applyStatus(getMembershipNumber(selected), "withdrawn");
    setOpenSettle(false);
  };
  const reject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) return toast.error("Please enter a rejection reason.");
    await applyStatus(getMembershipNumber(selected), "rejected", rejectReason.trim());
    setOpenReject(false);
    setRejectReason("");
  };
  const reinstate = async () => {
    if (!selected) return;
    await applyStatus(getMembershipNumber(selected), "approved");
    setOpenView(false);
  };
  const dismiss = async () => {
    if (!selected) return;
    // If "dismissed" requires a distinct code, extend STATUS_TO_CODE and call that instead.
    await applyStatus(getMembershipNumber(selected), "rejected", rejectReason || undefined);
    setOpenView(false);
  };

  /** Columns */
  const columns: GridColDef<Withdrawal>[] = [
    {
      field: "membership_number",
      headerName: "Membership No.",
      flex: 1.2,
      valueGetter: (_v, r) => getMembershipNumber(r),
    },
    {
      field: "full_name",
      headerName: "Name",
      flex: 1.6,
      valueGetter: (_v, r) => getFullName(r),
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1.4,
      valueGetter: (_v, r) => getEmail(r),
    },
    {
      field: "phone_number",
      headerName: "Phone",
      flex: 1.2,
      valueGetter: (_v, r) => getPhone(r),
    },
    {
      field: "constituency",
      headerName: "Constituency",
      flex: 1.2,
      valueGetter: (_v, r) => getConstituency(r),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      valueGetter: (_v, r) => getStatus(r),
      renderCell: (params: GridRenderCellParams<Withdrawal>) => {
        const val = String(params.value ?? "");
        const color =
          val === "withdrawn" ? "warning" :
          val === "rejected" || val === "dismissed" ? "error" :
          val === "approved" ? "success" : "default";
        return <Chip label={STATUS_LABEL(val)} color={color as any} size="small" variant="outlined" />;
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.6,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const row = params.row as Withdrawal;
        const status = getStatus(row);
        const memberNo = getMembershipNumber(row);
        return (
          <Box>
            <Tooltip title="View details">
              <IconButton
                aria-label="View member"
                onClick={() => { setSelected(row); setOpenView(true); }}
                size="small"
              >
                <VisibilityIcon color="primary" fontSize="small" />
              </IconButton>
            </Tooltip>
            {status === "pending" && (
              <Button
                variant="outlined" size="small"
                onClick={() => applyStatus(memberNo, "in_progress")}
                sx={{ ml: 1, textTransform: "none" }}
              >
                Start Processing
              </Button>
            )}
            {status === "in_progress" && (
              <Button
                variant="contained" size="small"
                onClick={() => applyStatus(memberNo, "awaiting_settlement")}
                sx={{ ml: 1, textTransform: "none" }}
              >
                Continue
              </Button>
            )}
            {(status === "awaiting_settlement" || status === "withdrawn") && (
              <Button
                variant="outlined" color="success" size="small"
                onClick={() => { setSelected(row); setOpenSettle(true); }}
                sx={{ ml: 1, textTransform: "none" }}
              >
                Settle
              </Button>
            )}
            {status !== "rejected" && status !== "withdrawn" && status !== "dismissed" && (
              <Button
                variant="outlined" color="error" size="small"
                onClick={() => { setSelected(row); setOpenReject(true); setRejectReason(getRemarks(row) || ""); }}
                sx={{ ml: 1, textTransform: "none" }}
              >
                Reject
              </Button>
            )}
          </Box>
        );
      },
    },
  ];

  /** Properly typed rowId getter (fixes TS2322/TS7006) */
  const rowIdGetter: GridRowIdGetter<Withdrawal> = (row: Withdrawal): GridRowId => {
    // Prefer the 'id' you set in getWithdrawals(); safe fallback if missing.
    return (row as any)?.id ?? `${getMembershipNumber(row)}-fallback`;
  };

  /** Toolbar */
  const ToolbarContent = () => (
    <GridToolbarContainer sx={{ p: 1.5, gap: 1, justifyContent: "space-between" }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip label={`Withdrawals: ${totalCount}`} color="warning" variant="outlined" />
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          placeholder="Search by name, membership no., constituency..."
          variant="outlined"
          size="small"
          value={searchDraft}
          onChange={(e) => {
            const v = e.target.value;
            setSearchDraft(v);
            handleSearch(v);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchDraft && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearchDraft(""); handleSearch(""); }} edge="end">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            minWidth: 360,
            bgcolor: "white",
            borderRadius: "9999px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            "& .MuiOutlinedInput-root": { borderRadius: "9999px" },
          }}
        />
        <Button
          onClick={exportExcel}
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          color="success"
          disabled={!filteredRows.length}
        >
          Export
        </Button>
        <Button onClick={refresh} variant="outlined" startIcon={<RefreshIcon />} disabled={loading}>
          Refresh
        </Button>
      </Stack>
    </GridToolbarContainer>
  );

  return (
    <Box sx={{ py: 3 }}>
      {/* Uniform Header */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 2 }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h4" sx={{ color: partyColors.primary, fontWeight: "bold" }}>
            Withdrawn Members
          </Typography>
          <Box />
        </Toolbar>
      </AppBar>

      {/* Error banner */}
      {loadError && (
        <Box mb={2}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={refresh}>
                Retry
              </Button>
            }
          >
            {loadError}
          </Alert>
        </Box>
      )}

      <Paper elevation={3} sx={{ p: 1 }}>
        <div className="bg-white rounded-xl">
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={rowIdGetter}
            loading={loading}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[10, 20, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            localeText={{ noRowsLabel: loading ? "" : "No withdrawn members found." }}
            slots={{
              toolbar: ToolbarContent,
              loadingOverlay: () => (
                <Box display="flex" alignItems="center" justifyContent="center" py={6}>
                  <CircularProgress />
                </Box>
              ),
            }}
            sx={{
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: partyColors.lightBg,
                fontWeight: 600,
              },
              "& .MuiDataGrid-cell": { fontSize: "0.875rem" },
              "& .MuiDataGrid-row:hover": { backgroundColor: "#f1f5f9" },
            }}
          />
        </div>
      </Paper>

      {/* View Modal */}
      <Dialog open={openView} onClose={() => setOpenView(false)} fullWidth maxWidth="sm">
        <DialogTitle>Member Details</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Table size="small">
              <TableBody>
                <TableRow><TableCell sx={{ fontWeight: 700 }}>Full Name</TableCell><TableCell>{getFullName(selected)}</TableCell></TableRow>
                <TableRow><TableCell sx={{ fontWeight: 700 }}>Membership No.</TableCell><TableCell>{getMembershipNumber(selected)}</TableCell></TableRow>
                <TableRow><TableCell sx={{ fontWeight: 700 }}>Email</TableCell><TableCell>{getEmail(selected)}</TableCell></TableRow>
                <TableRow><TableCell sx={{ fontWeight: 700 }}>Phone</TableCell><TableCell>{getPhone(selected)}</TableCell></TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={STATUS_LABEL(getStatus(selected))}
                      color={
                        getStatus(selected) === "approved"
                          ? "success"
                          : getStatus(selected) === "withdrawn"
                          ? "warning"
                          : ["rejected", "dismissed"].includes(getStatus(selected))
                          ? "error"
                          : "default"
                      }
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenView(false)}>Close</Button>
          <Button
            onClick={reinstate}
            disabled={!selected || getStatus(selected) === "approved"}
            color="success"
            variant="contained"
          >
            Reinstate
          </Button>
          <Button
            onClick={dismiss}
            disabled={!selected || ["rejected", "dismissed"].includes(getStatus(selected))}
            color="error"
            variant="outlined"
          >
            Fully Dismiss
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settle Modal */}
      <Dialog open={openSettle} onClose={() => setOpenSettle(false)} fullWidth maxWidth="sm">
        <DialogTitle>Confirm Settlement</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Table size="small">
              <TableBody>
                <TableRow><TableCell sx={{ fontWeight: 700 }}>Full Name</TableCell><TableCell>{getFullName(selected)}</TableCell></TableRow>
                <TableRow><TableCell sx={{ fontWeight: 700 }}>Email</TableCell><TableCell>{getEmail(selected)}</TableCell></TableRow>
                <TableRow><TableCell sx={{ fontWeight: 700 }}>Membership No.</TableCell><TableCell>{getMembershipNumber(selected)}</TableCell></TableRow>
                <TableRow><TableCell sx={{ fontWeight: 700 }}>County</TableCell><TableCell>{getCounty(selected)}</TableCell></TableRow>
                <TableRow><TableCell sx={{ fontWeight: 700 }}>Current Status</TableCell><TableCell>{STATUS_LABEL(getStatus(selected))}</TableCell></TableRow>
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettle(false)}>Cancel</Button>
          <Button onClick={settle} color="success" variant="contained">Confirm Settle</Button>
        </DialogActions>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={openReject} onClose={() => setOpenReject(false)} fullWidth maxWidth="sm">
        <DialogTitle>Reject Withdrawal</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb: 1 }}>
            Please provide a reason for rejecting{" "}
            {selected ? <strong>{getFullName(selected)}</strong> : "this member"}.
          </Typography>
          <TextareaAutosize
            minRows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
          />
          {selected && getRemarks(selected) && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Existing remarks: {getRemarks(selected)}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReject(false)}>Cancel</Button>
          <Button onClick={reject} color="error" variant="contained">Confirm Reject</Button>
        </DialogActions>
      </Dialog>

      {/* Snack */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>

      <Toaster position="top-right" />
    </Box>
  );
};

export default Withdrawals;
