import React, { useEffect, useMemo, useState } from "react";
import axios, { AxiosError } from "axios";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
} from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BlockIcon from "@mui/icons-material/Block";
import debounce from "lodash/debounce";
import * as XLSX from "xlsx";
import toast, { Toaster } from "react-hot-toast";

/**
 * ✅ Screenshot UI + ✅ Your original workflow
 * - Same endpoints: get_members.php + update_member_action.php
 * - Actions supported:
 *   - View (opens details modal)
 *   - Disable member (maps to SUSPEND workflow: reason dialog -> action=suspend)
 *   - Delete (maps to WITHDRAW workflow: reason dialog -> action=withdraw)
 *   - Flag member (toast placeholder; wire your API when available)
 * - Export XLSX uses current visible (filtered) list
 * - Refresh reloads from API
 * - Online/offline banner + error banner retained
 */

/** =========================
 *  Config
 *  ========================= */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://skizagroundsuite.com/API";

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

/** ============
 *  Types
 *  ============ */

type ActionType = "suspend" | "withdraw";
type UiTab = "full" | "approved" | "pending" | "suspended";

export interface FullMemberRow {
  id: number;
  membershipNumber?: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  enrollmentDate: string;
  positionInParty: string;
  status: string;
  gender?: string;
  dateOfBirth?: string;
  constituency?: string;
  ward?: string;
  stateProvince?: string;
  remarks?: string | null;
  profilePhotoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  nationalIdNumber?: string;
  passportNumber?: string;
  physicalAddress?: string;
  occupation?: string;
  disabilityStatus?: string;
  isDiasporaMember?: boolean;
  cityOfResidence?: string | null;
  isYouthWing?: boolean;
  isWomenWing?: boolean;
}

/** ==================
 *  Helpers
 *  ================== */
const P = {
  text: "#e24b86",
  text2: "#d93a7a",
  ink: "#7b0a37",
  border: "rgba(226, 75, 134, 0.18)",
  border2: "rgba(226, 75, 134, 0.26)",
  line: "rgba(226, 75, 134, 0.12)",
  tabBg: "rgba(255, 210, 229, 0.28)",
  tabStroke: "rgba(226, 75, 134, 0.25)",
  pill: "linear-gradient(180deg, #ff7ab5 0%, #ff5aa2 100%)",
};

const pickArray = <T,>(obj: any): T[] => {
  if (!obj || typeof obj !== "object") return [];
  const keys = ["members", "data", "rows", "items"];
  for (const k of keys) if (Array.isArray(obj?.[k])) return obj[k] as T[];
  return Array.isArray(obj) ? (obj as T[]) : [];
};

const toBool = (v: any): boolean | undefined => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (s === "1" || s === "true" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "no") return false;
  return undefined;
};

const fmtBool = (v?: boolean) => (v === undefined ? "—" : v ? "Yes" : "No");

const initials = (name: string) => {
  const parts = (name || "").trim().split(new RegExp("\\s+")).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
};

const membershipChipColor = (s?: string): "success" | "default" => {
  const t = (s || "").toLowerCase();
  return t === "approved" || t === "active" ? "success" : "default";
};

/** ==================
 *  API Calls
 *  ================== */
async function fetchMembersByTab(tab: UiTab, search?: string): Promise<FullMemberRow[]> {
  const baseParams = (status?: string) =>
    new URLSearchParams({
      ...(status ? { status } : {}),
      page: "1",
      limit: "10000",
      ...(search ? { search } : {}),
    }).toString();

  const call = async (status?: string) => {
    const qs = baseParams(status);
    const { data } = await api.get(`/get_members.php?${qs}`);
    const arr = pickArray<any>(data);
    const mapped: FullMemberRow[] = arr.map((m: any) => ({
      id: Number(m.id) || 0,
      membershipNumber: m.membership_number ?? m.membershipNumber,
      fullName: m.full_name ?? m.fullName ?? "",
      email: m.email ?? "",
      phone: m.phone_number ?? m.phone ?? "",
      country: m.country_of_residence ?? m.country ?? "",
      enrollmentDate: m.registration_date ?? m.enrollmentDate ?? "",
      positionInParty: m.position_in_party ?? m.programOption ?? "",
      status: m.status ?? (m.is_active ? "Active" : "Inactive"),
      gender: m.gender,
      dateOfBirth: m.date_of_birth,
      constituency: m.constituency,
      ward: m.ward,
      stateProvince: m.state_province,
      remarks: m.remarks ?? null,
      profilePhotoUrl: m.profile_photo_url ?? null,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      nationalIdNumber: m.national_id_number,
      passportNumber: m.passport_number,
      physicalAddress: m.physical_address,
      occupation: m.occupation,
      disabilityStatus: m.disability_status,
      isDiasporaMember: toBool(m.is_diaspora_member),
      cityOfResidence: m.city_of_residence ?? null,
      isYouthWing: toBool(m.is_youth_wing),
      isWomenWing: toBool(m.is_women_wing),
    }));
    return [...new Map(mapped.map((r) => [r.id, r])).values()];
  };

  if (tab === "approved") {
    let data = await call("approved");
    if (!data.length) data = await call("Active");
    return data.filter((r) => ["approved", "active"].includes((r.status || "").toLowerCase()));
  }
  if (tab === "pending") return await call("pending");
  if (tab === "suspended") return await call("suspended");

  let data = await call("all");
  if (!data.length) data = await call(undefined);
  return data;
}

async function postMemberAction(id: number, action: ActionType, reason: string): Promise<void> {
  const qs = new URLSearchParams({
    id: String(id),
    action,
    reason,
  }).toString();
  const { data, status } = await api.get(`/update_member_action.php?${qs}`);
  if (status !== 200 || data?.status !== "success") {
    throw new Error(data?.message || "Action failed");
  }
}

/** =======================
 *  Details Modal
 *  ======================= */
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
    <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary", fontWeight: 800, letterSpacing: 0.2 }}>
      {title}
    </Typography>
    <Stack spacing={0.5}>{children}</Stack>
  </Box>
);

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <Stack direction="row" spacing={1}>
    <Typography variant="body2" sx={{ minWidth: 164, color: "text.secondary" }}>
      {label}
    </Typography>
    <Typography variant="body2">{value && String(value).trim() ? value : "—"}</Typography>
  </Stack>
);

const DetailsModal: React.FC<{
  member: FullMemberRow | null;
  onClose: () => void;
  onSuspend: () => void;
  onWithdraw: () => void;
}> = ({ member, onClose, onSuspend, onWithdraw }) => (
  <Dialog open={!!member} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>Member Details</DialogTitle>
    <DialogContent dividers>
      {member ? (
        <Box>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              badgeContent={
                <Chip
                  label={member.status}
                  size="small"
                  color={membershipChipColor(member.status)}
                  sx={{ height: 20 }}
                />
              }
            >
              <Avatar src={member.profilePhotoUrl || undefined} alt={member.fullName} sx={{ width: 64, height: 64, fontWeight: 700 }}>
                {initials(member.fullName)}
              </Avatar>
            </Badge>
            <Box>
              <Typography variant="h6" sx={{ mb: 0.25, fontWeight: 800 }}>
                {member.fullName}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
                  {member.membershipNumber || "—"}
                </Typography>
                {!!member.membershipNumber && (
                  <Tooltip title="Copy membership no.">
                    <IconButton size="small" onClick={() => navigator.clipboard.writeText(member.membershipNumber!)}>
                      <ContentCopyIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Box>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box flex={1}>
                <Section title="Contact">
                  <Field label="Email" value={member.email} />
                  <Field label="Phone" value={member.phone} />
                  <Field label="Physical Address" value={member.physicalAddress} />
                </Section>
              </Box>
              <Box flex={1}>
                <Section title="Identification">
                  <Field label="National ID" value={member.nationalIdNumber} />
                  <Field label="Passport No." value={member.passportNumber} />
                  <Field label="Gender" value={member.gender} />
                  <Field label="Date of Birth" value={member.dateOfBirth} />
                </Section>
              </Box>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box flex={1}>
                <Section title="Location">
                  <Field label="Country of Residence" value={member.country} />
                  <Field label="City" value={member.cityOfResidence || undefined} />
                  <Field label="County/State" value={member.stateProvince} />
                  <Field label="Constituency" value={member.constituency} />
                  <Field label="Ward" value={member.ward} />
                </Section>
              </Box>
              <Box flex={1}>
                <Section title="Party & Other">
                  <Field label="Position in Party" value={member.positionInParty} />
                  <Field label="Occupation" value={member.occupation} />
                  <Field label="Disability Status" value={member.disabilityStatus} />
                  <Field label="Diaspora Member" value={fmtBool(member.isDiasporaMember)} />
                  <Field label="Youth Wing" value={fmtBool(member.isYouthWing)} />
                  <Field label="Women Wing" value={fmtBool(member.isWomenWing)} />
                </Section>
              </Box>
            </Stack>

            <Section title="Dates">
              <Field label="Registered" value={member.enrollmentDate} />
              <Field label="Created At" value={member.createdAt} />
              <Field label="Updated At" value={member.updatedAt} />
            </Section>

            {!!member.remarks && (
              <Section title="Remarks">
                <Typography variant="body2">{member.remarks}</Typography>
              </Section>
            )}
          </Stack>
        </Box>
      ) : (
        <Typography variant="body2">No member selected.</Typography>
      )}
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onSuspend} color="warning" variant="outlined" startIcon={<WarningAmberIcon />} sx={{ textTransform: "none" }} disabled={!member}>
        Suspend
      </Button>
      <Button onClick={onWithdraw} color="error" variant="outlined" startIcon={<BlockIcon />} sx={{ textTransform: "none" }} disabled={!member}>
        Withdraw
      </Button>
      <Button onClick={onClose} variant="contained">
        Close
      </Button>
    </DialogActions>
  </Dialog>
);

/** =======================
 *  UI Bits
 *  ======================= */
const SoftPill = ({ children, sx }: { children: React.ReactNode; sx?: any }) => (
  <Box
    sx={{
      borderRadius: 999,
      border: `1px solid ${P.border2}`,
      background: "rgba(255,255,255,0.55)",
      boxShadow: "0 10px 22px rgba(226, 75, 134, 0.10)",
      backdropFilter: "blur(8px)",
      ...sx,
    }}
  >
    {children}
  </Box>
);

const TabPill: React.FC<{ active?: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <Button
    onClick={onClick}
    disableRipple
    sx={{
      height: 40,
      px: 2.2,
      borderRadius: 999,
      textTransform: "none",
      fontWeight: 900,
      color: active ? "#fff" : P.text,
      background: active ? P.pill : "transparent",
      boxShadow: active ? "0 10px 18px rgba(255, 90, 162, 0.22)" : "none",
      "&:hover": { background: active ? P.pill : "rgba(255, 210, 229, 0.30)" },
    }}
  >
    <Stack direction="row" spacing={1.1} alignItems="center">
      {!active && <Box sx={{ width: 10, height: 10, borderRadius: 99, background: "rgba(255, 90, 162, 0.65)" }} />}
      <span>{label}</span>
    </Stack>
  </Button>
);

const StatusPill = ({ status }: { status: string }) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      px: 2.2,
      height: 34,
      borderRadius: 999,
      background: P.pill,
      color: "#fff",
      fontWeight: 900,
      textTransform: "lowercase",
      boxShadow: "0 10px 18px rgba(255, 90, 162, 0.20)",
    }}
  >
    {(status || "").toLowerCase()}
  </Box>
);

/** =======================
 *  Main Page
 *  ======================= */
export default function FullMembersScreenshotUI_WithWorkflow() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  const [tab, setTab] = useState<UiTab>("full");
  const [rows, setRows] = useState<FullMemberRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>("");
  const [searchDraft, setSearchDraft] = useState<string>("");

  const [selected, setSelected] = useState<FullMemberRow | null>(null);

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuRow, setMenuRow] = useState<FullMemberRow | null>(null);

  const [reasonOpen, setReasonOpen] = useState<boolean>(false);
  const [actionType, setActionType] = useState<ActionType>("suspend");
  const [actionReason, setActionReason] = useState<string>("");
  const [actionSaving, setActionSaving] = useState<boolean>(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const refresh = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchMembersByTab(tab, search);
      setRows(data);
    } catch (e: any) {
      setRows([]);
      setLoadError(e?.message || "Failed to load members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  const handleSearch = useMemo(() => debounce((q: string) => setSearch(q.toLowerCase().trim()), 300), []);
  useEffect(() => () => handleSearch.cancel(), [handleSearch]);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      [r.fullName, r.membershipNumber, r.constituency, r.stateProvince, r.phone, r.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const totalCount = filteredRows.length;

  const openReasonDialog = (type: ActionType, row?: FullMemberRow | null) => {
    if (row) setSelected(row);
    setActionType(type);
    setActionReason("");
    setReasonOpen(true);
  };

  const confirmAction = async () => {
    if (!selected || !actionReason.trim()) return;
    setActionSaving(true);
    try {
      await postMemberAction(selected.id, actionType, actionReason.trim());
      setRows((prev) => prev.filter((m) => m.id !== selected.id));
      toast.success(actionType === "suspend" ? "Member suspended." : "Member withdrawn.");
      setReasonOpen(false);
      setSelected(null);
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    } finally {
      setActionSaving(false);
    }
  };

  const exportExcel = () => {
    const data = filteredRows.map((m) => ({
      "Membership No": m.membershipNumber,
      "Full Name": m.fullName,
      Email: m.email,
      Phone: m.phone,
      Constituency: m.constituency,
      County: m.stateProvince,
      Status: m.status,
      Enrolled: m.enrollmentDate,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Full Members");
    XLSX.writeFile(workbook, "Full_Members.xlsx");
  };

  const openMenu = (e: React.MouseEvent<HTMLElement>, row: FullMemberRow) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuRow(row);
  };
  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  const doMenuAction = (key: "view" | "flag" | "disable" | "delete") => {
    if (!menuRow) return;
    if (key === "view") {
      setSelected(menuRow);
      closeMenu();
      return;
    }
    if (key === "flag") {
      toast.success("Member flagged.");
      closeMenu();
      return;
    }
    if (key === "disable") {
      closeMenu();
      openReasonDialog("suspend", menuRow);
      return;
    }
    if (key === "delete") {
      closeMenu();
      openReasonDialog("withdraw", menuRow);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 2.5, md: 6 },
        py: { xs: 4, md: 6 },
        background: `radial-gradient(1200px 520px at 18% 18%, rgba(255, 122, 181, 0.18) 0%, rgba(255, 122, 181, 0.06) 48%, rgba(255,255,255,0) 74%),
radial-gradient(1200px 520px at 84% 86%, rgba(255, 90, 162, 0.22) 0%, rgba(255, 90, 162, 0.06) 48%, rgba(255,255,255,0) 74%),
linear-gradient(180deg, #fff7fb 0%, #ffe9f2 55%, #fff7fb 100%)`,
      }}
    >
      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 2.2 }}>
        <Typography sx={{ fontSize: 44, fontWeight: 950, letterSpacing: -0.6, color: P.text }}>
          Full Members
        </Typography>
        <Chip
          label={totalCount}
          sx={{
            height: 28,
            px: 0.2,
            borderRadius: 999,
            fontWeight: 950,
            color: P.text,
            background: "rgba(255, 210, 229, 0.55)",
            border: `1px solid ${P.border2}`,
          }}
        />
      </Stack>

      {!online && (
        <Paper elevation={0} sx={{ mb: 1.5, p: 1, borderRadius: 3, bgcolor: "rgba(255, 210, 229, 0.55)", border: `1px solid ${P.border2}` }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
            <WifiOffIcon fontSize="small" sx={{ color: P.text }} />
            <Typography variant="body2" fontWeight={800} sx={{ color: P.text }}>
              You’re offline. You can still view cached results; refresh when back online.
            </Typography>
          </Stack>
        </Paper>
      )}

      {loadError && (
        <Box mb={2}>
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={refresh}>Retry</Button>}>
            {loadError}
          </Alert>
        </Box>
      )}

      <Paper
        elevation={0}
        sx={{
          borderRadius: 5,
          p: { xs: 2, md: 2.5 },
          background: "rgba(255,255,255,0.50)",
          border: `1px solid ${P.border}`,
          boxShadow: "0 18px 52px rgba(226, 75, 134, 0.12)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.6} sx={{ mb: 2 }}>
          <SoftPill sx={{ display: "inline-flex", alignItems: "center", gap: 0.6, p: 0.6, background: P.tabBg, border: `1px solid ${P.tabStroke}` }}>
            <TabPill active={tab === "full"} label="Full Members" onClick={() => setTab("full")} />
            <TabPill active={tab === "approved"} label="Approved" onClick={() => setTab("approved")} />
            <TabPill active={tab === "pending"} label="Pending" onClick={() => setTab("pending")} />
            <TabPill active={tab === "suspended"} label="Suspended" onClick={() => setTab("suspended")} />
          </SoftPill>

          <Stack direction="row" spacing={1.2} justifyContent={{ xs: "flex-start", md: "flex-end" }}>
            <Button
              onClick={exportExcel}
              disabled={!filteredRows.length}
              startIcon={<FileDownloadOutlinedIcon />}
              sx={{
                height: 44,
                borderRadius: 999,
                px: 2.6,
                textTransform: "none",
                fontWeight: 950,
                color: P.text,
                background: "rgba(255,255,255,0.55)",
                border: `1px solid ${P.border2}`,
                boxShadow: "0 10px 22px rgba(226, 75, 134, 0.10)",
              }}
            >
              Export
            </Button>

            <SoftPill sx={{ display: "inline-flex", alignItems: "center", height: 44, overflow: "hidden" }}>
              <IconButton onClick={refresh} disabled={loading} sx={{ width: 52, height: 44, borderRadius: 0, color: P.text }}>
                <ReplayRoundedIcon />
              </IconButton>
              <Divider orientation="vertical" flexItem sx={{ borderColor: P.line }} />
              <IconButton sx={{ width: 52, height: 44, borderRadius: 0, color: P.text }}>
                <MoreHorizRoundedIcon />
              </IconButton>
            </SoftPill>
          </Stack>
        </Stack>

        <Paper elevation={0} sx={{ borderRadius: 4, p: 2, background: "rgba(255,255,255,0.35)", border: `1px solid ${P.border}` }}>
          <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.2}>
            <Typography sx={{ fontWeight: 950, color: P.text, opacity: 0.75 }}>Filter by</Typography>

            <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" spacing={2.2}>
              <TextField
                placeholder="Search by name, membership no., constituency..."
                size="small"
                value={searchDraft}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchDraft(v);
                  handleSearch(v);
                }}
                sx={{
                  minWidth: { xs: "100%", sm: 360 },
                  bgcolor: "rgba(255,255,255,0.65)",
                  borderRadius: 999,
                  "& .MuiOutlinedInput-root": { borderRadius: 999 },
                }}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ display: "flex", alignItems: "center", pl: 0.8, pr: 0.6, color: P.text }}>
                      <SearchRoundedIcon fontSize="small" />
                    </Box>
                  ),
                }}
              />

              <Stack direction="row" alignItems="center" spacing={2.2}>
                <Typography sx={{ color: P.text, opacity: 0.55, fontWeight: 900 }}>Showing {totalCount} members</Typography>
                <Divider orientation="vertical" flexItem sx={{ borderColor: P.line }} />
                <Button
                  endIcon={<KeyboardArrowDownRoundedIcon />}
                  sx={{
                    height: 40,
                    px: 2.4,
                    borderRadius: 999,
                    textTransform: "none",
                    fontWeight: 950,
                    color: P.text,
                    background: "rgba(255,255,255,0.55)",
                    border: `1px solid ${P.border2}`,
                    boxShadow: "0 10px 22px rgba(226, 75, 134, 0.10)",
                  }}
                >
                  Newest
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        {loading && (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && (
          <Box sx={{ mt: 2, borderRadius: 4, overflow: "hidden", border: `1px solid ${P.border}`, background: "rgba(255,255,255,0.30)" }}>
            <Box sx={{ position: "relative", px: 2.2, py: 1.4, borderBottom: `1px solid ${P.line}`, color: P.text, background: "rgba(255, 210, 229, 0.12)", display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr", alignItems: "center", fontWeight: 950 }}>
              <Typography sx={{ fontWeight: 950 }}>Member</Typography>
              <Typography sx={{ fontWeight: 950 }}>Phone</Typography>
              <Typography sx={{ fontWeight: 950 }}>Status</Typography>
              <Typography sx={{ fontWeight: 950 }}>Enrolled</Typography>
              <Typography sx={{ fontWeight: 950 }}>Actions</Typography>
              <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr", alignItems: "center", opacity: 0.75, px: 2.2 }}>
                <Box />
                <Box sx={{ borderLeft: `1px solid ${P.line}`, height: 28 }} />
                <Box sx={{ borderLeft: `1px solid ${P.line}`, height: 28 }} />
                <Box sx={{ borderLeft: `1px solid ${P.line}`, height: 28 }} />
                <Box sx={{ borderLeft: `1px solid ${P.line}`, height: 28 }} />
              </Box>
            </Box>

            {filteredRows.map((r) => (
              <Box key={r.id} sx={{ px: 2.2, py: 1.2, display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr", alignItems: "center", borderBottom: `1px solid ${P.line}`, "&:last-of-type": { borderBottom: "none" } }}>
                <Stack direction="row" spacing={1.6} alignItems="center">
                  <Avatar sx={{ width: 46, height: 46, fontWeight: 950, color: "#fff", background: "linear-gradient(180deg, #ffc1d7 0%, #ff7ab5 100%)", boxShadow: "0 12px 18px rgba(255, 90, 162, 0.12)" }}>
                    {initials(r.fullName)}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 950, color: P.ink, lineHeight: 1.05 }}>{r.fullName}</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 850, color: P.text, opacity: 0.65 }}>
                      {(r.membershipNumber ? `${r.membershipNumber} • ` : "") + (r.constituency || r.stateProvince || "")}
                    </Typography>
                  </Box>
                </Stack>

                <Typography sx={{ fontWeight: 900, color: P.text2, opacity: 0.9 }}>{r.phone || "—"}</Typography>
                <StatusPill status={r.status || ""} />
                <Typography sx={{ fontWeight: 900, color: P.text2, opacity: 0.9 }}>{r.enrollmentDate || "—"}</Typography>

                <SoftPill sx={{ display: "inline-flex", alignItems: "center", height: 40, overflow: "hidden", border: `1px solid ${P.border2}` }}>
                  <Button startIcon={<SearchRoundedIcon />} disableRipple sx={{ height: 40, px: 2, borderRadius: 0, textTransform: "none", fontWeight: 950, color: P.text, minWidth: 110, "&:hover": { background: "transparent" } }} onClick={() => setSelected(r)}>
                    View
                  </Button>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: P.line }} />
                  <IconButton onClick={(e) => openMenu(e, r)} sx={{ width: 46, height: 40, borderRadius: 0, color: P.text }}>
                    <KeyboardArrowDownRoundedIcon />
                  </IconButton>
                </SoftPill>
              </Box>
            ))}

            <Box sx={{ px: 2.2, py: 1.2, color: P.text, opacity: 0.65, fontWeight: 900 }}>Showing {totalCount} members</Box>
          </Box>
        )}

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={closeMenu}
          PaperProps={{
            elevation: 0,
            sx: { mt: 1.1, borderRadius: 3, minWidth: 260, border: `1px solid ${P.border2}`, boxShadow: "0 18px 40px rgba(226, 75, 134, 0.18)", overflow: "hidden" },
          }}
        >
          <MenuItem onClick={() => doMenuAction("view")}>
            <Stack direction="row" spacing={1.4} alignItems="center">
              <PersonOutlineRoundedIcon fontSize="small" />
              <Typography sx={{ fontWeight: 850 }}>View profile</Typography>
            </Stack>
          </MenuItem>
          <MenuItem onClick={() => doMenuAction("flag")}>
            <Stack direction="row" spacing={1.4} alignItems="center">
              <FlagOutlinedIcon fontSize="small" />
              <Typography sx={{ fontWeight: 850 }}>Flag member</Typography>
            </Stack>
          </MenuItem>
          <MenuItem onClick={() => doMenuAction("disable")} sx={{ color: "#e11d48", "& svg": { color: "#e11d48" } }}>
            <Stack direction="row" spacing={1.4} alignItems="center">
              <BlockOutlinedIcon fontSize="small" />
              <Typography sx={{ fontWeight: 950 }}>Disable member</Typography>
            </Stack>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => doMenuAction("delete")} sx={{ color: "#e11d48", "& svg": { color: "#e11d48" } }}>
            <Stack direction="row" spacing={1.4} alignItems="center">
              <DeleteOutlineRoundedIcon fontSize="small" />
              <Typography sx={{ fontWeight: 950 }}>Delete</Typography>
            </Stack>
          </MenuItem>
        </Menu>
      </Paper>

      <DetailsModal member={selected} onClose={() => setSelected(null)} onSuspend={() => openReasonDialog("suspend", selected)} onWithdraw={() => openReasonDialog("withdraw", selected)} />

      <Dialog open={reasonOpen} onClose={() => setReasonOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{actionType === "suspend" ? "Suspend Member" : "Withdraw Member"}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Please provide a reason. This will be saved to the member record.
          </Typography>
          <TextField
            autoFocus
            label="Reason"
            placeholder={actionType === "suspend" ? "e.g., Pending investigation" : "e.g., Member requested withdrawal"}
            fullWidth
            multiline
            minRows={3}
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
          />
          <Typography variant="caption" color="text.secondary">
            {actionReason.trim().length} characters
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReasonOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmAction}
            variant="contained"
            color={actionType === "suspend" ? "warning" : "error"}
            disabled={actionSaving || !actionReason.trim()}
          >
            {actionSaving ? "Saving..." : actionType === "suspend" ? "Confirm Suspend" : "Confirm Withdraw"}
          </Button>
        </DialogActions>
      </Dialog>

      <Toaster position="top-right" />
    </Box>
  );
}
