// NewMembers.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Grid,
  Stack,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
} from "@mui/x-data-grid";
import Autocomplete from "@mui/material/Autocomplete";
import RefreshIcon from "@mui/icons-material/Refresh";
import debounce from "lodash.debounce";
import axios, { AxiosError } from "axios";
import toast, { Toaster } from "react-hot-toast";

// ===== Theme =====
const BRAND_RED = "#F5333F";
const BRAND_RED_DARK = "#d62a36";

// ===== Types =====
export interface CountyLocation {
  id: number;
  name: string;
  code: string;
}
export interface OtherLocation {
  id: string | number;
  name: string;
}

export interface NewMemberFormData {
  // Required by backend
  full_name: string;
  email: string;
  phone_number: string;
  national_id_number: string;
  gender: string;
  date_of_birth: string; // YYYY-MM-DD
  constituency_id: string | number;
  state_province_id: string | number | "";
  physical_address: string;
  occupation: string;
  position_in_party: string;
  disability_status: string;

  // Optional
  passport_number?: string;
  ward_id: string | number | "";
  is_diaspora_member: boolean;
  country_of_residence?: string;
  city_of_residence?: string;
  is_youth_wing: boolean;
  is_women_wing: boolean;
}

export interface Member {
  id: number;
  membership_number: string;
  full_name: string;
  phone_number: string;
  email?: string;
  national_id_number?: string;
  passport_number?: string;
  gender?: string;
  date_of_birth?: string;
  county?: string;
  county_id?: number;
  constituency?: string;
  constituency_id?: string | number;
  ward?: string;
  ward_id?: string | number;
  physical_address?: string;
  occupation?: string;
  position_in_party?: string;
  disability_status?: string;
  is_diaspora_member?: 0 | 1;
  country_of_residence?: string;
  city_of_residence?: string;
  is_youth_wing?: 0 | 1;
  is_women_wing?: 0 | 1;
  status: string;
  profile_photo_url?: string;
  [key: string]: any;
}

// API response for add_member.php
type MailDebug = {
  sent?: boolean;
  http_code?: number;
  response?: { success?: boolean; error?: string;[k: string]: any };
  curl_error?: string;
};
type ApiAddMemberResponse = {
  status: "success" | "error";
  message?: string;
  membership_number?: string;
  email_sent?: boolean;
  mail_debug?: MailDebug | null;
};

// Remote list item types (as per mobile code)
type County = { county_code: string; county_name: string };
type Constituency = {
  const_code: string;
  const_name?: string;
  constituency_name?: string;
  county_code?: string;
};
type Ward = { ward_code: string; ward_name: string };

// ===== API Config =====
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://skizagroundsuite.com/API";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (axios.isAxiosError(err)) {
      const msg =
        (err.response?.data as any)?.message || err.message || "Network error";
      toast.error(`⚠️ ${msg}`);
    }
    return Promise.reject(err);
  }
);

// Endpoints (match Expo screen)
const GET_COUNTIES_API_URL = "/get_counties.php";
const GET_CONSTITUENCIES_BY_COUNTY_API_URL = "/get_constituencies_by_county.php"; // ?county_code=XX
const GET_WARDS_API_URL = "/get_wards.php"; // ?const_code=XX
const ADD_MEMBER_API_URL = "/add_member.php";
const GET_MEMBERS_API_URL = "/get_members.php";

// ===== Utilities =====
const pickArray = <T,>(obj: any): T[] => {
  if (!obj || typeof obj !== "object") return [];
  const keys = [
    "data",
    "counties",
    "constituencies",
    "wards",
    "polling_centers",
    "items",
    "rows",
  ];
  for (const k of keys) if (Array.isArray((obj as any)[k])) return (obj as any)[k] as T[];
  return Array.isArray(obj) ? (obj as T[]) : [];
};

const getConstituencyName = (c: Constituency) =>
  c.constituency_name ?? c.const_name ?? "";

const formatMailFailure = (dbg?: MailDebug | null) => {
  if (!dbg) return "unknown error";
  if (dbg.curl_error) return `cURL: ${dbg.curl_error}`;
  if (dbg.response?.error) return dbg.response.error;
  if (typeof dbg.http_code === "number") return `HTTP ${dbg.http_code}`;
  return "unknown error";
};

// ===== Add Member Modal =====
type AddMemberModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void; // refresh table
};

const initialForm: NewMemberFormData = {
  // Required
  full_name: "",
  email: "",
  phone_number: "",
  national_id_number: "",
  gender: "",
  date_of_birth: "",
  constituency_id: "",
  state_province_id: "",
  physical_address: "",
  occupation: "",
  position_in_party: "",
  disability_status: "",
  // Optional
  passport_number: "",
  ward_id: "",
  is_diaspora_member: false,
  country_of_residence: "",
  city_of_residence: "",
  is_youth_wing: false,
  is_women_wing: false,
};

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const [form, setForm] = useState<NewMemberFormData>(initialForm);
  const [saving, setSaving] = useState(false);

  // remote lists + state
  const [counties, setCounties] = useState<County[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [countiesLoading, setCountiesLoading] = useState(false);
  const [constituenciesLoading, setConstituenciesLoading] = useState(false);
  const [wardsLoading, setWardsLoading] = useState(false);

  const [countiesError, setCountiesError] = useState<string | null>(null);
  const [constituenciesError, setConstituenciesError] = useState<string | null>(
    null
  );
  const [wardsError, setWardsError] = useState<string | null>(null);

  // Derived selected codes (for fetch chaining)
  const selectedCountyCode = String(form.state_province_id || "");
  const selectedConstCode = String(form.constituency_id || "");

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm")); // mobile: full screen dialog

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      refetchCounties();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof NewMemberFormData>(
    key: K,
    value: NewMemberFormData[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  // Fetchers
  const refetchCounties = useCallback(async () => {
    setCountiesLoading(true);
    setCountiesError(null);
    try {
      const { data } = await api.get(GET_COUNTIES_API_URL);
      const arr = pickArray<County>(data);
      setCounties(arr);
      if (!arr.length) {
        setCountiesError("No counties returned by server.");
        toast("No counties found", { icon: "ℹ️" });
      }
    } catch (e: any) {
      setCounties([]);
      setCountiesError(e?.message || "Could not fetch counties.");
      toast.error(`Counties fetch error: ${e?.message || "Please retry."}`);
    } finally {
      setCountiesLoading(false);
    }
  }, []);

  const refetchConstituencies = useCallback(async (countyCode: string) => {
    if (!countyCode) return;
    setConstituenciesLoading(true);
    setConstituenciesError(null);
    try {
      const { data } = await api.get(
        `${GET_CONSTITUENCIES_BY_COUNTY_API_URL}?county_code=${encodeURIComponent(
          countyCode
        )}`
      );
      const arr = pickArray<Constituency>(data);
      setConstituencies(arr);
      if (!arr.length) {
        setConstituenciesError("No constituencies returned by server.");
        toast("No constituencies found", { icon: "ℹ️" });
      }
    } catch (e: any) {
      setConstituencies([]);
      setConstituenciesError(e?.message || "Could not fetch constituencies.");
      toast.error(
        `Constituencies fetch error: ${e?.message || "Please retry."}`
      );
    } finally {
      setConstituenciesLoading(false);
    }
  }, []);

  const refetchWards = useCallback(async (constCode: string) => {
    if (!constCode) return;
    setWardsLoading(true);
    setWardsError(null);
    try {
      const { data } = await api.get(
        `${GET_WARDS_API_URL}?const_code=${encodeURIComponent(constCode)}`
      );
      const arr = pickArray<Ward>(data);
      setWards(arr);
      if (!arr.length) {
        setWardsError("No wards returned by server.");
        toast("No wards found", { icon: "ℹ️" });
      }
    } catch (e: any) {
      setWards([]);
      setWardsError(e?.message || "Could not fetch wards.");
      toast.error(`Wards fetch error: ${e?.message || "Please retry."}`);
    } finally {
      setWardsLoading(false);
    }
  }, []);

  // When county changes, clear children + load constituencies
  useEffect(() => {
    setForm((p) => ({ ...p, constituency_id: "", ward_id: "" }));
    setConstituencies([]);
    setWards([]);
    if (selectedCountyCode) refetchConstituencies(selectedCountyCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountyCode]);

  // When constituency changes, clear ward + load wards
  useEffect(() => {
    setForm((p) => ({ ...p, ward_id: "" }));
    setWards([]);
    if (selectedConstCode) refetchWards(selectedConstCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConstCode]);

  // Validate EXACTLY what the backend requires
  const validate = (): string | null => {
    if (!form.full_name.trim()) return "Full name is required.";
    if (!form.email.trim()) return "Email is required.";
    if (!/^\+?\d[\d\s-]{6,}$/.test(form.phone_number))
      return "Valid phone number is required.";
    if (!form.national_id_number.trim())
      return "National ID number is required.";
    if (!form.gender) return "Gender is required.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date_of_birth))
      return "Date of birth must be YYYY-MM-DD.";
    if (!String(form.state_province_id).trim())
      return "County/State (ID) is required.";
    if (!String(form.constituency_id).trim())
      return "Constituency (ID) is required.";
    if (!form.physical_address.trim())
      return "Physical address is required.";
    if (!form.occupation.trim()) return "Occupation is required.";
    if (!form.position_in_party.trim())
      return "Position in party is required.";
    if (!form.disability_status.trim())
      return "Disability status is required.";
    return null; // ward_id optional
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast.error(`⚠️ ${err}`);
      return;
    }

    const payload: any = {
      // required
      full_name: form.full_name,
      email: form.email,
      phone_number: form.phone_number,
      national_id_number: form.national_id_number,
      gender: form.gender,
      date_of_birth: form.date_of_birth,
      constituency_id: String(form.constituency_id),
      state_province_id: String(form.state_province_id),
      physical_address: form.physical_address,
      occupation: form.occupation,
      position_in_party: form.position_in_party,
      disability_status: form.disability_status,
      // optional
      ...(form.passport_number && { passport_number: form.passport_number }),
      ...(form.ward_id && { ward_id: String(form.ward_id) }),
      is_diaspora_member: form.is_diaspora_member ? 1 : 0,
      ...(form.country_of_residence && {
        country_of_residence: form.country_of_residence,
      }),
      ...(form.city_of_residence && { city_of_residence: form.city_of_residence }),
      is_youth_wing: form.is_youth_wing ? 1 : 0,
      is_women_wing: form.is_women_wing ? 1 : 0,
    };

    try {
      setSaving(true);
      const { data } = await api.post<ApiAddMemberResponse>(
        ADD_MEMBER_API_URL,
        payload
      );

      if (data?.status === "success") {
        const sent = data?.email_sent ? " (email sent ✅)" : " (email not sent)";
        toast.success(
          `✅ Member created. Membership No: ${data?.membership_number || ""
          }${sent}`
        );

        // Optional: show reason if email failed
        if (!data?.email_sent) {
          const reason = formatMailFailure(data?.mail_debug);
          toast(`ℹ️ Email not sent: ${reason}`);
          if (data?.mail_debug) console.info("MAIL DEBUG:", data.mail_debug);
        }

        onClose();
        onCreated();
      } else {
        toast.error(`⚠️ ${data?.message || "Failed to create member"}`);
      }
    } catch {
      // interceptor already shows toast
    } finally {
      setSaving(false);
    }
  };

  // Autocomplete option maps
  const countyOptions = useMemo(
    () => counties.map((c) => ({ label: c.county_name, value: c.county_code })),
    [counties]
  );
  const constituencyOptions = useMemo(
    () =>
      constituencies.map((c) => ({
        label: getConstituencyName(c),
        value: c.const_code,
      })),
    [constituencies]
  );
  const wardOptions = useMemo(
    () => wards.map((w) => ({ label: w.ward_name, value: w.ward_code })),
    [wards]
  );

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle
        sx={{
          bgcolor: BRAND_RED,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Register New Jubilee Member</span>
        <IconButton
          aria-label="refresh-counties"
          onClick={() => refetchCounties()}
          size="small"
          title="Reload counties"
          sx={{ color: "white" }}
        >
          <RefreshIcon fontSize="inherit" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: "#fafafa" }}>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Full Name"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              fullWidth
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Phone Number"
              value={form.phone_number}
              onChange={(e) => set("phone_number", e.target.value)}
              fullWidth
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              fullWidth
              required
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Gender"
              select
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
              fullWidth
              required
            >
              <MenuItem value={"Male"}>Male</MenuItem>
              <MenuItem value={"Female"}>Female</MenuItem>
              <MenuItem value={"Other"}>Other</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Date of Birth"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => set("date_of_birth", e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="National ID Number"
              value={form.national_id_number}
              onChange={(e) => set("national_id_number", e.target.value)}
              fullWidth
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Passport Number (Optional)"
              value={form.passport_number}
              onChange={(e) => set("passport_number", e.target.value)}
              fullWidth
              placeholder="Optional"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Physical Address"
              value={form.physical_address}
              onChange={(e) => set("physical_address", e.target.value)}
              fullWidth
              required
            />
          </Grid>

          {/* County (state_province_id) */}
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={countyOptions}
              loading={countiesLoading}
              value={
                countyOptions.find((o) => o.value === form.state_province_id) ||
                null
              }
              onChange={(_, newVal) => {
                set("state_province_id", newVal?.value || "");
              }}
              getOptionLabel={(o) => o.label || ""}
              isOptionEqualToValue={(o, v) => o.value === v.value}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="County / State (ID)"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {countiesLoading ? (
                          <CircularProgress color="inherit" size={18} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  error={!!countiesError}
                  helperText={countiesError || undefined}
                />
              )}
            />
          </Grid>

          {/* Constituency (constituency_id) */}
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={constituencyOptions}
              loading={constituenciesLoading}
              value={
                constituencyOptions.find(
                  (o) => o.value === form.constituency_id
                ) || null
              }
              onChange={(_, newVal) => {
                set("constituency_id", newVal?.value || "");
              }}
              getOptionLabel={(o) => o.label || ""}
              isOptionEqualToValue={(o, v) => o.value === v.value}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Constituency (ID)"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {constituenciesLoading ? (
                          <CircularProgress color="inherit" size={18} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  error={!!constituenciesError}
                  helperText={
                    constituenciesError ||
                    (!form.state_province_id ? "Select County first" : undefined)
                  }
                />
              )}
              disabled={!form.state_province_id || !!countiesError}
            />
          </Grid>

          {/* Ward (ward_id) - optional */}
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={wardOptions}
              loading={wardsLoading}
              value={wardOptions.find((o) => o.value === form.ward_id) || null}
              onChange={(_, newVal) => set("ward_id", newVal?.value || "")}
              getOptionLabel={(o) => o.label || ""}
              isOptionEqualToValue={(o, v) => o.value === v.value}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Ward (ID) — Optional"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {wardsLoading ? (
                          <CircularProgress color="inherit" size={18} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  error={!!wardsError}
                  helperText={
                    wardsError ||
                    (!form.constituency_id
                      ? "Select Constituency first"
                      : undefined)
                  }
                />
              )}
              disabled={!form.constituency_id || !!constituenciesError}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Occupation"
              value={form.occupation}
              onChange={(e) => set("occupation", e.target.value)}
              fullWidth
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Position in Party"
              value={form.position_in_party}
              onChange={(e) => set("position_in_party", e.target.value)}
              fullWidth
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Disability Status"
              value={form.disability_status}
              onChange={(e) => set("disability_status", e.target.value)}
              fullWidth
              required
              placeholder="e.g., None"
            />
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.is_diaspora_member}
                    onChange={(e) => set("is_diaspora_member", e.target.checked)}
                  />
                }
                label="Diaspora Member"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.is_youth_wing}
                    onChange={(e) => set("is_youth_wing", e.target.checked)}
                  />
                }
                label="Youth Wing"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.is_women_wing}
                    onChange={(e) => set("is_women_wing", e.target.checked)}
                  />
                }
                label="Women Wing"
              />
            </Stack>
          </Grid>

          {form.is_diaspora_member && (
            <>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Country of Residence"
                  value={form.country_of_residence}
                  onChange={(e) => set("country_of_residence", e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="City of Residence"
                  value={form.city_of_residence}
                  onChange={(e) => set("city_of_residence", e.target.value)}
                  fullWidth
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving}
          sx={{
            bgcolor: BRAND_RED,
            "&:hover": { bgcolor: BRAND_RED_DARK },
          }}
        >
          {saving ? "Saving..." : "Create Member"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ===== Main Component =====
const NewMembers: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [daysFilter] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [rowCount, setRowCount] = useState<number>(0);

  // Modal state
  const [addOpen, setAddOpen] = useState(false);

  // Responsive info
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: pageSize,
        status: "pending",
        ...(daysFilter > 0 && { days: daysFilter }),
        ...(searchQuery && { search: searchQuery }),
      };
      const { data } = await api.get(GET_MEMBERS_API_URL, { params });
      if (data.status === "success" && Array.isArray(data.members)) {
        const fetched: Member[] = data.members.map((m: any) => ({
          ...m,
          id: m.id,
        }));
        setMembers(fetched);
        setRowCount(data.total ?? fetched.length);
      } else {
        setMembers([]);
        setRowCount(0);
        toast.error("⚠️ Failed to fetch members");
      }
    } catch {
      setMembers([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, daysFilter, searchQuery]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Debounced search setter (you can wire this to an input)
  const handleSearch = useMemo(
    () =>
      debounce((query: string) => {
        setSearchQuery(query.trim());
        setPage(0);
      }, 400),
    []
  );

  useEffect(() => {
    return () => handleSearch.cancel();
  }, [handleSearch]);

  // ✅ FIX: type the columns to Member, so params.row is NOT `never`
  const columns: GridColDef<Member>[] = [
    {
      field: "membership_number",
      headerName: "Membership No",
      flex: 1,
    },
    {
      field: "full_name",
      headerName: "Full Name",
      flex: 1.2,
    },
    {
      field: "phone_number",
      headerName: "Phone",
      flex: 0.9,
    },
    {
      field: "constituency",
      headerName: "Constituency",
      flex: 1,
      valueGetter: (_value, row) => row.constituency ?? row.constituency_id ?? "",
    },


    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === "Active" ? "success" : "default"}
          size={isMobile ? "small" : "medium"}
          variant="outlined"
        />
      ),
    },
  ];

  // ===== Mobile layout: stacked cards showing all fields =====
  const renderMobileList = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-6">
          <span className="text-white text-sm">Loading members…</span>
        </div>
      );
    }

    if (!members.length) {
      return (
        <div className="flex justify-center py-6">
          <span className="text-white text-sm">
            No pending Jubilee membership applications.
          </span>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {members.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-red-100 bg-[#FFF7F7] px-3 py-2 text-[11px] text-gray-800 shadow-sm"
          >
            <div className="flex justify-between gap-2 mb-1">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-gray-500">
                  Membership No
                </span>
                <span className="font-semibold text-gray-900 break-all">
                  {m.membership_number || "—"}
                </span>
              </div>
              <span
                className={`self-start px-2 py-[2px] rounded-full text-[10px] font-semibold ${m.status === "Active"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
                  }`}
              >
                {m.status || "pending"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <div>
                <span className="block text-[10px] font-semibold text-gray-500">
                  Full Name
                </span>
                <span className="block text-[11px] font-medium">
                  {m.full_name}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-gray-500">
                  Phone
                </span>
                <span className="block text-[11px]">
                  {m.phone_number || "—"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-gray-500">
                  Constituency
                </span>
                <span className="block text-[11px]">
                  {m.constituency || m.constituency_id || "—"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-gray-500">
                  County
                </span>
                <span className="block text-[11px]">
                  {m.county || m.county_id || "—"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5333F] px-2 sm:px-4 py-3 sm:py-6">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl border border-red-100 p-3 sm:p-6">
        {/* Header / Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-[#B91C1C]">
              New Jubilee Membership Applications
            </h2>
            <p className="text-[11px] sm:text-sm text-gray-600">
              Review and onboard new members into the Jubilee Party registry.
            </p>
          </div>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="flex-end"
          >
            <Button
              variant="contained"
              onClick={() => setAddOpen(true)}
              sx={{
                bgcolor: BRAND_RED,
                "&:hover": { bgcolor: BRAND_RED_DARK },
                textTransform: "none",
                fontWeight: 600,
                fontSize: isMobile ? "0.75rem" : "0.875rem",
                py: isMobile ? 0.7 : 1,
                px: isMobile ? 1.6 : 2.2,
              }}
            >
              + Add Member
            </Button>
          </Stack>
        </div>

        {/* CONTENT: DataGrid for tablet/desktop; cards for mobile */}
        {isMobile ? (
          renderMobileList()
        ) : (
          <div className="w-full">
            <DataGrid
              rows={members}
              columns={columns}
              loading={loading}
              autoHeight
              density={isMobile ? "compact" : "standard"}
              pagination
              rowCount={rowCount}
              paginationMode="server"
              paginationModel={{ page, pageSize }}
              onPaginationModelChange={(model: GridPaginationModel) => {
                setPage(model.page);
                setPageSize(model.pageSize);
              }}
              pageSizeOptions={[5, 10, 25, 50]}
              getRowId={(row) => row.id}
              hideFooterSelectedRowCount
              rowHeight={isMobile ? 40 : 52}
              columnHeaderHeight={isMobile ? 38 : 56}
              sx={{
                width: "100%",
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: "#FEE2E2",
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 600,
                  fontSize: isMobile ? "0.7rem" : "0.8rem",
                  whiteSpace: "nowrap",
                },
                "& .MuiDataGrid-cell": {
                  fontSize: isMobile ? "0.7rem" : "0.85rem",
                  lineHeight: 1.2,
                  whiteSpace: isMobile ? "normal" : "nowrap",
                  alignItems: "center",
                  display: "flex",
                  py: isMobile ? 0 : 0.5,
                },
                "& .MuiDataGrid-row": {
                  "&:nth-of-type(odd)": { bgcolor: "#FFF7F7" },
                },
              }}
            />
          </div>
        )}
      </div>

      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setPage(0);
          fetchMembers();
        }}
      />
    </div>
  );
};

export default NewMembers;
