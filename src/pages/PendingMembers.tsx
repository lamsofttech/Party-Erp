import React, { useEffect, useMemo, useState } from "react";
import axios, { AxiosError } from "axios";
import { DataGrid, GridColDef, GridToolbarContainer } from "@mui/x-data-grid";
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
  Avatar,
  Divider,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelIcon from "@mui/icons-material/Cancel";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import debounce from "lodash/debounce";
import * as XLSX from "xlsx";
import toast, { Toaster } from "react-hot-toast";

/** =========================
 *  Config & Shared UI tokens
 *  ========================= */

// API base
const API_BASE_URL = "https://skizagroundsuite.com/API";

// Jubilee theme colors (matching uploaded swatch)
const partyColors = {
  primary: "#F5333F", // main Jubilee red
  primaryDark: "#C0212A",
  lightBg: "#FFF1F2", // very soft red for table headers / sections
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    console.error("API error:", err.response?.data || err.message);
    return Promise.reject(err);
  }
);

/** ============  Types ============ */
interface Member {
  id: string | number;
  membership_number: string;
  full_name: string;
  phone_number: string;
  constituency: string;
  status?: string;
}

interface MemberDetail extends Member {
  email?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  state_province?: string | null; // County
  ward?: string | null;
  registration_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  remarks?: string | null;
  profile_photo_url?: string | null;
}

type ActionKind = "approve" | "reject" | null;

interface ActionDialogState {
  open: boolean;
  member: Member | null;
  action: ActionKind;
}

/** ================== API Helpers ================== */
async function fetchPendingMembers(): Promise<Member[]> {
  const { data } = await api.get<{
    status: "success" | "error";
    members?: Member[];
    message?: string;
  }>("/get_pending_members.php");

  if (data.status === "success" && Array.isArray(data.members)) return data.members;
  throw new Error(data.message || "Unexpected response while fetching members.");
}

async function fetchMemberDetails(id: string | number): Promise<MemberDetail> {
  const { data } = await api.get<{
    status: "success" | "error";
    member?: MemberDetail;
    message?: string;
  }>(`/get_member_details.php?id=${id}`);

  if (data.status === "success" && data.member) return data.member;
  throw new Error(data.message || "Failed to fetch member details.");
}

// UPDATED: accept optional `reason` for reject
async function postMemberAction(
  id: string | number,
  action: Exclude<ActionKind, null>,
  reason?: string
) {
  const url = action === "approve" ? "/approve_member.php" : "/reject_member.php";

  const payload: any = { member_id: id };
  if (action === "reject" && reason) {
    payload.reason = reason;
  }

  const { data } = await api.post<{ status: "success" | "error"; message?: string }>(
    url,
    payload
  );
  if (data.status !== "success") throw new Error(data.message || `Failed to ${action} member.`);
}

/** ================ Utility Renderers ================ */

const StatusChip = () => (
  <Chip
    label="Pending"
    size="small"
    variant="outlined"
    sx={{
      borderColor: partyColors.primary,
      color: partyColors.primaryDark,
      fontWeight: 600,
      fontSize: "0.7rem",
      px: 0.5,
    }}
  />
);

const LoadingOverlay = () => (
  <Box display="flex" alignItems="center" justifyContent="center" py={6}>
    <CircularProgress sx={{ color: partyColors.primary }} />
  </Box>
);

const DetailsRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <Box mb={1}>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
      {label}
    </Typography>
    <Typography variant="body2">{value || "N/A"}</Typography>
  </Box>
);

/** ======================= Member Details Modal ======================= */

const MemberDetailsModal: React.FC<{
  selectedMember: MemberDetail | null;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}> = ({ selectedMember, onClose, loading, error }) => {
  // MOBILE: make dialog full-screen on small devices for easier viewing
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={Boolean(selectedMember)}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          backgroundColor: partyColors.primary,
          color: "white",
          py: 1.3,
        }}
      >
        <VisibilityIcon />
        Jubilee Member Details
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          backgroundColor: "#FFFFFF",
          p: { xs: 1.5, sm: 2 }, // MOBILE: slightly smaller padding on phones
        }}
      >
        {loading ? (
          <LoadingOverlay />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : selectedMember ? (
          <>
            <Box
              display="flex"
              alignItems="center"
              gap={2}
              mb={2}
              flexDirection={{ xs: "column", sm: "row" }} // MOBILE: stack avatar + text
              textAlign={{ xs: "center", sm: "left" }}
            >
              <Avatar
                src={selectedMember.profile_photo_url || ""}
                alt={selectedMember.full_name}
                sx={{ width: 64, height: 64, bgcolor: partyColors.primary }}
              >
                {selectedMember.full_name ? selectedMember.full_name.charAt(0) : <PersonIcon />}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {selectedMember.full_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Membership No: {selectedMember.membership_number}
                </Typography>
                <Chip
                  label="Pending Jubilee Application"
                  size="small"
                  sx={{
                    mt: 0.5,
                    borderColor: partyColors.primary,
                    color: partyColors.primaryDark,
                  }}
                  variant="outlined"
                />
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <DetailsRow label="Email" value={selectedMember.email} />
            <DetailsRow label="Phone" value={selectedMember.phone_number} />
            <DetailsRow label="Gender" value={selectedMember.gender} />
            <DetailsRow label="Date of Birth" value={selectedMember.date_of_birth} />
            <DetailsRow label="Constituency" value={selectedMember.constituency} />
            <DetailsRow label="County" value={selectedMember.state_province} />
            <DetailsRow label="Ward" value={selectedMember.ward} />
            <DetailsRow label="Registration Date" value={selectedMember.registration_date} />
            <DetailsRow label="Created At" value={selectedMember.created_at} />
            <DetailsRow label="Updated At" value={selectedMember.updated_at} />
            <DetailsRow label="Remarks" value={selectedMember.remarks} />

            {selectedMember.profile_photo_url && (
              <Box mt={2}>
                <img
                  src={selectedMember.profile_photo_url}
                  alt="Profile"
                  style={{
                    maxWidth: "100%",
                    borderRadius: "0.5rem",
                    border: "1px solid #e5e7eb",
                  }}
                />
              </Box>
            )}
          </>
        ) : (
          <Typography>No member selected.</Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          p: { xs: 1.5, sm: 2 },
          justifyContent: { xs: "center", sm: "flex-end" },
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          sx={{ bgcolor: partyColors.primary }}
          fullWidth={fullScreen} // MOBILE: full-width close button
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/** =================== Main Page: Pending Jubilee Members =================== */

const PendingMembers: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");

  const [actionDialog, setActionDialog] = useState<ActionDialogState>({
    open: false,
    member: null,
    action: null,
  });

  // NEW: rejection reason state
  const [rejectReason, setRejectReason] = useState<string>("");

  const refresh = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchPendingMembers();
      setMembers(result);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load pending members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Debounced search
  const handleSearch = useMemo(
    () =>
      debounce((query: string) => {
        setSearchQuery(query.toLowerCase());
      }, 300),
    []
  );
  useEffect(() => () => handleSearch.cancel(), [handleSearch]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    return members.filter((m) =>
      `${m.full_name} ${m.membership_number} ${m.constituency}`
        .toLowerCase()
        .includes(searchQuery)
    );
  }, [members, searchQuery]);

  const pendingCount = filteredMembers.length;

  const handleViewMore = async (member: Member) => {
    setDetailsLoading(true);
    setDetailsError(null);
    setSelectedMember({ ...member });
    try {
      const detail = await fetchMemberDetails(member.id);
      setSelectedMember(detail);
    } catch (e: any) {
      setDetailsError(e?.message || "Error fetching member details.");
      toast.error("Server error while loading details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleApproveClick = (member: Member) => {
    setRejectReason(""); // clear any previous value
    setActionDialog({ open: true, member, action: "approve" });
  };

  const handleRejectClick = (member: Member) => {
    setRejectReason(""); // clear any previous value
    setActionDialog({ open: true, member, action: "reject" });
  };

  const handleCloseActionDialog = () => {
    setActionDialog({ open: false, member: null, action: null });
    setRejectReason("");
  };

  const handleConfirmAction = async () => {
    if (!actionDialog.member || !actionDialog.action) return;

    // Enforce reason for reject
    if (actionDialog.action === "reject") {
      if (!rejectReason.trim()) {
        toast.error("Please enter a reason for rejection.");
        return;
      }
    }

    const { id } = actionDialog.member;
    try {
      await postMemberAction(
        id,
        actionDialog.action,
        actionDialog.action === "reject" ? rejectReason.trim() : undefined
      );
      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success(`Member ${actionDialog.action}d successfully.`);
    } catch (e: any) {
      toast.error(e?.message || `Failed to ${actionDialog.action} member.`);
    } finally {
      handleCloseActionDialog();
    }
  };

  const downloadExcel = () => {
    const dataToExport = filteredMembers.map((m) => ({
      "Membership No": m.membership_number,
      "Full Name": m.full_name,
      Phone: m.phone_number,
      Constituency: m.constituency,
      Status: "Pending",
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pending Members");
    XLSX.writeFile(workbook, "Pending_Members.xlsx");
  };

  /** Columns
   * On mobile: fewer columns to avoid horizontal scroll
   * - Membership No | Name | Phone | Actions
   * Extra info is available via “View Details”.
   */
  const columns: GridColDef<Member>[] = useMemo(() => {
    const base: GridColDef<Member>[] = [
      {
        field: "membership_number",
        headerName: "Membership No",
        flex: 1,
        minWidth: 120, // MOBILE: smaller min width
      },
      {
        field: "full_name",
        headerName: "Full Name",
        flex: 1.5,
        minWidth: 150, // MOBILE: smaller min width
      },
      {
        field: "phone_number",
        headerName: "Phone",
        flex: 1,
        minWidth: 120,
        renderCell: (params) => (
          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-xs">
            {params.value}
          </span>
        ),
      },
      {
        field: "constituency",
        headerName: "Constituency",
        flex: 1,
        minWidth: 150,
      },
      {
        field: "status",
        headerName: "Approval Status",
        flex: 0.8,
        minWidth: 140,
        renderCell: () => <StatusChip />,
        sortable: false,
        filterable: false,
      },
      {
        field: "actions",
        headerName: "Actions",
        flex: 1,
        minWidth: 170,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Box display="flex" gap={0.5}>
            <IconButton
              color="primary"
              size="small"
              onClick={() => handleViewMore(params.row)}
              title="View application"
              sx={{ color: partyColors.primary }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
            <IconButton
              color="success"
              size="small"
              onClick={() => handleApproveClick(params.row)}
              title="Approve"
            >
              <CheckCircleOutlineIcon fontSize="small" />
            </IconButton>
            <IconButton
              color="error"
              size="small"
              onClick={() => handleRejectClick(params.row)}
              title="Reject"
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ];

    // On mobile, hide constituency + status columns to avoid horizontal scrolling
    if (isMobile) {
      return base.filter(
        (col) =>
          col.field === "membership_number" ||
          col.field === "full_name" ||
          col.field === "phone_number" ||
          col.field === "actions"
      );
    }

    // On tablet, keep constituency but hide approval status (still visible via chip in details)
    if (isTablet) {
      return base.filter(
        (col) =>
          col.field === "membership_number" ||
          col.field === "full_name" ||
          col.field === "phone_number" ||
          col.field === "constituency" ||
          col.field === "actions"
      );
    }

    // Desktop: all columns
    return base;
  }, [isMobile, isTablet]);

  /** Toolbar: responsive search + export + refresh + count */
  const ToolbarContent = () => (
    <GridToolbarContainer
      sx={{
        p: { xs: 1, sm: 1.5 },
        gap: 1,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip
          label={`Pending: ${pendingCount}`}
          sx={{
            borderColor: partyColors.primary,
            color: partyColors.primaryDark,
            fontWeight: 600,
          }}
          variant="outlined"
          size="small"
        />
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ width: { xs: "100%", sm: "auto" } }}
      >
        <TextField
          placeholder="Search name / membership / constituency"
          variant="outlined"
          size="small"
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => handleSearch("")} edge="end">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            width: { xs: "100%", sm: 320, md: 360 },
            bgcolor: "white",
            borderRadius: 999,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            "& .MuiOutlinedInput-root": { borderRadius: 999 },
            "& .MuiInputBase-input": {
              fontSize: { xs: "0.78rem", sm: "0.85rem" }, // MOBILE: smaller font
            },
          }}
        />

        <Stack
          direction="row"
          spacing={1}
          justifyContent={{ xs: "space-between", sm: "flex-start" }}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          <Button
            onClick={downloadExcel}
            variant="outlined"
            startIcon={<FileDownloadIcon fontSize="small" />}
            sx={{
              borderColor: partyColors.primary,
              color: partyColors.primaryDark,
              "&:hover": { borderColor: partyColors.primaryDark, bgcolor: "#FEE2E2" },
              px: { xs: 1, sm: 2 },
              minWidth: { xs: 0, sm: 120 },
            }}
          >
            {/* MOBILE: icon-only on phones */}
            {isMobile ? "" : "Export"}
          </Button>
          <Button
            onClick={refresh}
            variant="outlined"
            startIcon={<RefreshIcon fontSize="small" />}
            sx={{
              borderColor: partyColors.primary,
              color: partyColors.primaryDark,
              "&:hover": { borderColor: partyColors.primaryDark, bgcolor: "#FEE2E2" },
              px: { xs: 1, sm: 2 },
              minWidth: { xs: 0, sm: 120 },
            }}
          >
            {isMobile ? "" : "Refresh"}
          </Button>
        </Stack>
      </Stack>
    </GridToolbarContainer>
  );

  return (
    <Box
      sx={{
        py: { xs: 2, sm: 3 },
        px: { xs: 1, sm: 3 },
        bgcolor: partyColors.primary, // Jubilee red background
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{ mb: { xs: 1.5, sm: 2 }, background: "transparent" }}
      >
        <Toolbar
          disableGutters
          sx={{
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box sx={{ width: "100%" }}>
            <Typography
              variant="h4"
              sx={{
                color: "white",
                fontWeight: 800,
                fontSize: { xs: "1.25rem", sm: "1.8rem" }, // MOBILE: slightly smaller
                lineHeight: 1.2,
              }}
            >
              New Jubilee Membership Applications
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#FED7D7",
                maxWidth: 520,
                mt: 0.5,
                fontSize: { xs: "0.78rem", sm: "0.85rem" },
              }}
            >
              Review and onboard new members into the Jubilee Party registry. This list is managed
              by the Jubilee Party Secretariat.
            </Typography>
          </Box>
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

      {/* Table card */}
      <Paper
        elevation={4}
        sx={{
          p: { xs: 0.5, sm: 1.5 }, // MOBILE: tighter padding
          borderRadius: { xs: 2, sm: 3 },
          overflow: "hidden",
          bgcolor: "#ffffff",
        }}
      >
        <div className="rounded-xl">
          <DataGrid
            rows={filteredMembers}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[5, 10, 20, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: isMobile ? 5 : 10 } }, // MOBILE: fewer rows per page
            }}
            density={isMobile ? "compact" : "standard"}
            localeText={{ noRowsLabel: loading ? "" : "No pending members found." }}
            slots={{
              toolbar: ToolbarContent,
              loadingOverlay: LoadingOverlay,
            }}
            disableColumnMenu // MOBILE: simpler header UI
            sx={{
              width: "100%",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: partyColors.lightBg,
                fontWeight: 700,
                fontSize: { xs: "0.7rem", sm: "0.8rem" }, // MOBILE: smaller header text
                lineHeight: 1.1,
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                whiteSpace: "nowrap",
              },
              "& .MuiDataGrid-cell": {
                fontSize: { xs: "0.75rem", sm: "0.8rem" },
                py: isMobile ? 0.4 : 1,
              },
              "& .MuiDataGrid-row": {
                maxHeight: isMobile ? 44 : "none",
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "#FFF7F7",
              },
              // MOBILE: make grid scrollable if needed without breaking layout
              "& .MuiDataGrid-virtualScroller": {
                overscrollBehavior: "contain",
              },
            }}
          />
        </div>
      </Paper>

      {/* Details Modal */}
      <MemberDetailsModal
        selectedMember={selectedMember}
        onClose={() => setSelectedMember(null)}
        loading={detailsLoading}
        error={detailsError}
      />

      {/* Action Confirm Dialog */}
      <Dialog open={actionDialog.open} onClose={handleCloseActionDialog} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          {actionDialog.action === "approve" ? "Approve Jubilee Member" : "Reject Jubilee Member"}
        </DialogTitle>
        <DialogContent
          sx={{
            fontSize: { xs: "0.85rem", sm: "0.95rem" },
          }}
        >
          <Typography sx={{ mb: actionDialog.action === "reject" ? 2 : 0 }}>
            Are you sure you want to {actionDialog.action}{" "}
            <strong>{actionDialog.member?.full_name}</strong>
            {"’s"} application? This action cannot be undone.
          </Typography>

          {actionDialog.action === "reject" && (
            <TextField
              label="Reason for rejection"
              multiline
              minRows={2}
              fullWidth
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              sx={{ mt: 1.5 }}
            />
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 1.5, sm: 3 },
            pb: { xs: 1.5, sm: 2 },
          }}
        >
          <Button
            onClick={handleCloseActionDialog}
            sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            color={actionDialog.action === "approve" ? "success" : "error"}
            variant="contained"
            sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
          >
            {actionDialog.action === "approve" ? "Approve" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toasts */}
      <Toaster position="top-right" />
    </Box>
  );
};

export default PendingMembers;
