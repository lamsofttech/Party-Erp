// src/pages/ApprovedMembers.tsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useDeferredValue,
  useRef,
} from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Typography,
  TextField,
  InputAdornment,
  Alert,
  Box,
  useMediaQuery,
  Skeleton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid, GridColDef, GridToolbarContainer } from "@mui/x-data-grid";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import BlockIcon from "@mui/icons-material/Block";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import axios, { AxiosError } from "axios";
import toast, { Toaster } from "react-hot-toast";

/* ---------------- types ---------------- */
interface Member {
  id: number;
  membership_number: string;
  full_name: string;
  phone_number: string;
  constituency: string;
}

/* ---------------- config ---------------- */
const API = axios.create({
  baseURL: "https://skizagroundsuite.com/API",
  timeout: 12000,
  withCredentials: true,
});
const CACHE_KEY = "approved_members:v1";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/* ---------------- helpers ---------------- */
const statusChip = (
  <Chip label="Approved" color="success" size="small" variant="outlined" />
);

const saveCache = (rows: Member[]) => {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), rows })
    );
  } catch {}
};
const readCache = (): Member[] | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, rows } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return rows as Member[];
  } catch {
    return null;
  }
};

/* ---------------- component ---------------- */
const ApprovedMembers: React.FC = () => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    member: Member | null;
    action: "withdraw" | "suspend" | null;
    reason: string;
  }>({ open: false, member: null, action: null, reason: "" });

  const abortRef = useRef<AbortController | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cached = readCache();
    if (cached) {
      setMembers(cached);
      setLoading(false);
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await API.get("/get_approved_members.php", {
        signal: ctrl.signal,
      });
      if (res.data?.status === "success" && Array.isArray(res.data.members)) {
        const rows: Member[] = res.data.members;
        setMembers(rows);
        saveCache(rows);
      } else {
        throw new Error(
          res.data?.message ||
            "Unexpected response while fetching approved members"
        );
      }
    } catch (e) {
      const err = e as AxiosError;
      if (err.code === "ERR_CANCELED") return;
      const msg = err.response?.data
        ? String(err.response.data)
        : err.message || "Error fetching approved members";
      setError(msg);
      if (!cached) toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    return () => abortRef.current?.abort();
  }, [fetchMembers]);

  /* ------- search (fast, low re-render) ------- */
  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      `${m.full_name} ${m.membership_number} ${m.constituency} ${m.phone_number}`
        .toLowerCase()
        .includes(q)
    );
  }, [members, deferredQuery]);

  /* ------- export (lazy-load XLSX) ------- */
  const downloadExcel = useCallback(async () => {
    const dataToExport = filtered.map((m) => ({
      "Membership No": m.membership_number,
      "Full Name": m.full_name,
      Phone: m.phone_number,
      Constituency: m.constituency,
      Status: "Approved",
    }));

    toast.loading("Preparing Excel…", { id: "export" });
    const XLSX = await import(/* webpackChunkName: "xlsx" */ "xlsx");
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Approved Members");
    XLSX.writeFile(wb, "Approved_Members.xlsx");
    toast.success("Export ready", { id: "export" });
  }, [filtered]);

  /* ------- actions ------- */
  const openActionDialog = useCallback(
    (member: Member, action: "withdraw" | "suspend") =>
      setActionDialog({ open: true, member, action, reason: "" }),
    []
  );

  const closeActionDialog = useCallback(
    () =>
      setActionDialog({ open: false, member: null, action: null, reason: "" }),
    []
  );

  const handleConfirmAction = useCallback(async () => {
    const { member, action, reason } = actionDialog;
    if (!member || !action) return;
    if (!reason.trim())
      return toast.error("⚠️ Please provide a reason for this action.");

    const endpoint =
      action === "withdraw" ? "/withdraw_member.php" : "/suspend_member.php";
    const okMsg =
      action === "withdraw"
        ? "✅ Member withdrawn successfully!"
        : "✅ Member suspended successfully!";

    const p = (async () => {
      const res = await API.post(endpoint, { member_id: member.id, reason });
      if (res.data?.status === "success") {
        await fetchMembers();
        closeActionDialog();
        return okMsg;
      }
      throw new Error(res.data?.message || "❌ Action failed.");
    })();

    toast.promise(p, {
      loading: "Processing...",
      success: (m) => m,
      error: (e) => e.message || "Action failed.",
    });
  }, [actionDialog, closeActionDialog, fetchMembers]);

  /* ------- columns (responsive) ------- */
  const columns: GridColDef<Member>[] = useMemo(
    () => [
      {
        field: "membership_number",
        headerName: "Membership No",
        flex: 1,
        minWidth: isXs ? 120 : 140,
      },
      { field: "full_name", headerName: "Full Name", flex: 1.4, minWidth: 160 },
      {
        field: "phone_number",
        headerName: "Phone",
        flex: 0.9,
        minWidth: 120,
        hide: isXs,
      },
      {
        field: "constituency",
        headerName: "Constituency",
        flex: 1,
        minWidth: isXs ? 120 : 140,
        hide: isXs,
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.7,
        minWidth: 120,
        sortable: false,
        renderCell: () => statusChip,
      },
      {
        field: "actions",
        headerName: "Actions",
        flex: 1,
        minWidth: 160,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              color="error"
              size="small"
              onClick={() => openActionDialog(params.row, "withdraw")}
              title="Withdraw Member"
            >
              <PersonOffIcon fontSize="small" />
            </IconButton>
            <IconButton
              color="warning"
              size="small"
              onClick={() => openActionDialog(params.row, "suspend")}
              title="Suspend Member"
            >
              <BlockIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ],
    [isXs, openActionDialog]
  );

  /* ------- custom toolbar (memoized) ------- */
  const Toolbar = useMemo(
    () =>
      function ToolbarInner() {
        return (
          <GridToolbarContainer
            sx={{
              p: 1,
              display: "flex",
              justifyContent: "space-between",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <TextField
              placeholder="Search members (name, membership no, constituency, phone)…"
              size="small"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{
                minWidth: { xs: "100%", sm: 320 },
                bgcolor: "white",
                "& input": { fontSize: 16 }, // prevent iOS auto-zoom
              }}
              type="search"
              inputMode="search"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: query && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setQuery("")}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" color="success" onClick={downloadExcel}>
              Download Excel
            </Button>
          </GridToolbarContainer>
        );
      },
    [query, downloadExcel]
  );

  return (
    <div
      className="container mx-auto p-6"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 16px)",
        maxWidth: "100vw",
        overflowX: "hidden",
      }}
    >
      <Typography
        variant={isXs ? "h5" : "h4"}
        fontWeight={800}
        color="primary"
        sx={{ mb: 0.5 }}
      >
        Approved Members
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        View, search, export, and manage all approved members.
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchMembers}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {loading && members.length === 0 ? (
        <Box sx={{ bgcolor: "white", borderRadius: 2, p: 2, boxShadow: 1 }}>
          <Skeleton variant="rectangular" height={44} sx={{ mb: 1 }} />
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1 }} />
          ))}
        </Box>
      ) : (
        <Box
          className="bg-white rounded-xl shadow border"
          sx={{
            p: { xs: 1, sm: 2 },
            height: { xs: 560, sm: 640, md: 720 }, // keep virtualization
            maxWidth: "100%",
            overflow: "hidden",
          }}
        >
          <DataGrid
            rows={filtered}
            columns={columns}
            getRowId={(r) => r.id}
            loading={loading}
            density="compact"
            disableColumnMenu={isXs}
            disableColumnSelector={isXs}
            disableDensitySelector
            disableRowSelectionOnClick
            pageSizeOptions={[5, 10, 20, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: isXs ? 10 : 20 } },
            }}
            columnHeaderHeight={isXs ? 40 : 48}
            rowHeight={isXs ? 44 : 44}
            scrollbarSize={8}
            sx={{
              "& .MuiDataGrid-columnHeaders": {
                position: "sticky",
                top: 0,
                zIndex: 1,
              },
              "& .MuiDataGrid-cell": { py: 1.0 },
              "& .MuiDataGrid-row": { cursor: "default" },
              "& .MuiDataGrid-virtualScroller": {
                overflow: "auto",
                scrollbarGutter: "stable both-edges",
                overscrollBehavior: "contain",
              },
              fontSize: isXs ? 14 : 14,
              lineHeight: 1.25,
            }}
            slots={{ toolbar: Toolbar }}
            localeText={{
              noRowsLabel: loading ? "Loading…" : "No Approved Members found.",
            }}
          />
        </Box>
      )}

      <Dialog
        open={actionDialog.open}
        onClose={closeActionDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isXs}
        PaperProps={{
          sx: {
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: "bold", bgcolor: "#1e40af", color: "white" }}>
          {actionDialog.action === "withdraw" ? "Withdraw Member" : "Suspend Member"}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography sx={{ mb: 2, fontWeight: 500 }}>
            Please provide a reason for{" "}
            {actionDialog.action === "withdraw" ? "withdrawing" : "suspending"}{" "}
            <b>{actionDialog.member?.full_name}</b>.
          </Typography>
          <TextField
            fullWidth
            label="Reason"
            placeholder="Type the reason for this action..."
            multiline
            minRows={3}
            value={actionDialog.reason}
            onChange={(e) =>
              setActionDialog((prev) => ({ ...prev, reason: e.target.value }))
            }
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeActionDialog} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            color={actionDialog.action === "withdraw" ? "error" : "warning"}
            variant="contained"
            sx={{ px: 4, py: 1.2, borderRadius: 2, fontWeight: "bold" }}
          >
            {actionDialog.action === "withdraw" ? "Withdraw Member" : "Suspend Member"}
          </Button>
        </DialogActions>
      </Dialog>

      <Toaster position="top-right" />
    </div>
  );
};

export default ApprovedMembers;
