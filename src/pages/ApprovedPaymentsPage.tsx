// src/pages/ApprovedPaymentsPage.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback, useDeferredValue } from "react";
import axios, { AxiosError } from "axios";
import {
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
  Slide,
  Stack,
  Typography,
  Box,
  Chip,
  Skeleton,
  TextField,
  InputAdornment,
  Tooltip,
  useMediaQuery,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Eye, CheckCircle, XCircle, FileCheck, Info, Search } from "lucide-react";

/* ---------------- theme ---------------- */
const PARTY_THEME = {
  white: "#FFFFFF",
  red: "#FF2D2D",
  redDark: "#C40000",
  black: "#0B0B0B",
  border: "#E5E7EB",
  borderSoft: "#EEF2F7",
  text: "#111827",
  muted: "#6B7280",
  headerBg: "#F8FAFC",
  rowHover: "#F9FAFB",
  pillBorder: "#6B7280",
};

/* ---------------- types ---------------- */
interface ApprovedExpense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  payee_name?: string;
  payment_reference?: string;
  receipt_url?: string;
  submitted_by: string;
  status: "approved";
  payment_status: "pending" | "paid" | "declined";
  payment_details?: string;
}

/* ---------------- config ---------------- */
const API_BASE = "https://skizagroundsuite.com/API";

// Public-page friendly: token is optional. If present, attach it.
const API = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
  withCredentials: false, // keep false unless your backend depends on cookies
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const CACHE_KEY = "approved_expenses_pending:v2";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/* ---------------- helpers ---------------- */
const saveCache = (rows: ApprovedExpense[]) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rows }));
  } catch { }
};

const readCache = (): ApprovedExpense[] | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, rows } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return rows as ApprovedExpense[];
  } catch {
    return null;
  }
};

const toAbsoluteUrl = (maybeUrl?: string) => {
  if (!maybeUrl) return "";
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;

  const baseOrigin = new URL(API_BASE).origin; // https://skizagroundsuite.com
  const cleaned = maybeUrl.startsWith("/") ? maybeUrl : `/${maybeUrl}`;
  return `${baseOrigin}${cleaned}`;
};

/* ---------------- component ---------------- */
const ApprovedPaymentsPage: React.FC = () => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [expenses, setExpenses] = useState<ApprovedExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // permissions: page is public, but UI/actions depend on perms
  const [perms, setPerms] = useState<string[]>([]);
  const can = useMemo(() => {
    const p = perms.map((x) => x.toLowerCase());
    return {
      view: p.includes("expenses.view") || p.includes("expenses.approve") || p.includes("expenses.payments.view"),
      markPaid: p.includes("expenses.payments.mark_paid") || p.includes("expenses.payments.paid") || p.includes("expenses.payments.update"),
      decline: p.includes("expenses.payments.decline") || p.includes("expenses.payments.mark_declined") || p.includes("expenses.payments.update"),
      // (optional) allow approve permission to also do actions, if you want:
      // markPaid: p.includes("expenses.approve") || ...
    };
  }, [perms]);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const [receiptView, setReceiptView] = useState<string | null>(null);
  const [detailsView, setDetailsView] = useState<ApprovedExpense | null>(null);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const abortRef = useRef<AbortController | null>(null);

  const getServerMessage = (err: any, fallback: string) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.response?.data ||
      err?.message ||
      fallback;
    return typeof msg === "string" ? msg : fallback;
  };

  const fetchMyPermissions = useCallback(async () => {
    // token may not exist -> keep perms empty
    const token = localStorage.getItem("token");
    if (!token) {
      setPerms([]);
      return;
    }

    try {
      // If you already have a perms endpoint, use it here:
      // Example response: { status: "success", permissions: ["expenses.view", ...] }
      const res = await API.get("/auth-my-permissions.php");
      if (res.data?.status === "success") {
        const list: string[] = res.data.permissions || res.data.data || [];
        setPerms(Array.isArray(list) ? list : []);
      } else {
        setPerms([]);
      }
    } catch {
      setPerms([]);
    }
  }, []);

  const fetchApprovedExpenses = useCallback(async () => {
    setLoading(true);

    // Fast paint from cache
    const cached = readCache();
    if (cached) {
      setExpenses(cached);
      setLoading(false);
    }

    // If user lacks view permission, show message but keep page accessible
    if (!can.view) {
      setLoading(false);
      if (!cached) setExpenses([]);
      return;
    }

    // Abort in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await API.get("/get_approved_expenses.php", { signal: ctrl.signal });
      if (res.data?.status === "success" && Array.isArray(res.data.data)) {
        const rows: ApprovedExpense[] = res.data.data
          .map((x: any) => ({
            ...x,
            receipt_url: x.receipt_url ? toAbsoluteUrl(x.receipt_url) : undefined,
          }))
          .filter((exp: ApprovedExpense) => exp.payment_status === "pending");

        setExpenses(rows);
        saveCache(rows);
      } else {
        throw new Error(res.data?.message || "Failed to fetch approved expenses.");
      }
    } catch (err) {
      const e = err as AxiosError;
      if (e.code === "ERR_CANCELED") return;

      // If server returned 403, show proper message
      if ((e as any)?.response?.status === 403) {
        setSnackbar({ open: true, message: "You don’t have permission to view this list.", severity: "error" });
      } else {
        setSnackbar({ open: true, message: getServerMessage(err, "Failed to fetch expenses. Please try again."), severity: "error" });
      }
    } finally {
      setLoading(false);
    }
  }, [can.view]);

  useEffect(() => {
    // public page: we attempt perms first (if token exists), then fetch list if allowed
    fetchMyPermissions().finally(() => {
      fetchApprovedExpenses();
    });

    return () => abortRef.current?.abort();
  }, [fetchMyPermissions, fetchApprovedExpenses]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return expenses;

    return expenses.filter((exp) =>
      `${exp.category} ${exp.description} ${exp.payment_method} ${exp.submitted_by} ${exp.payee_name ?? ""} ${exp.payment_reference ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [expenses, deferredQuery]);

  const handleAction = async (id: number, action: "paid" | "declined") => {
    // UI guard (backend still enforces)
    if (action === "paid" && !can.markPaid) {
      setSnackbar({ open: true, message: "You don’t have permission to mark as paid.", severity: "error" });
      return;
    }
    if (action === "declined" && !can.decline) {
      setSnackbar({ open: true, message: "You don’t have permission to decline.", severity: "error" });
      return;
    }

    try {
      const endpoint = action === "paid" ? "/mark_as_paid.php" : "/mark_as_declined.php";
      const res = await API.post(endpoint, { id }, { headers: { "Content-Type": "application/json" } });

      if (res.data?.status === "success") {
        setExpenses((prev) => prev.filter((exp) => exp.id !== id));
        setSnackbar({ open: true, message: `Expense marked as ${action}`, severity: "success" });
        setDetailsView(null);
      } else {
        throw new Error(res.data?.message || "Failed to update status.");
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: getServerMessage(err, "Failed to update expense status."), severity: "error" });
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui",
        background: `linear-gradient(180deg, ${PARTY_THEME.white} 0%, #FAFAFA 60%, #F5F5F5 100%)`,
        paddingTop: "calc(env(safe-area-inset-top) + 16px)",
        paddingLeft: "max(env(safe-area-inset-left), 12px)",
        paddingRight: "max(env(safe-area-inset-right), 12px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Theme stripes */}
      <div className="w-full">
        <div style={{ height: 34, background: PARTY_THEME.white }} />
        <div style={{ height: 34, background: PARTY_THEME.red }} />
        <div style={{ height: 10, background: PARTY_THEME.black }} />
      </div>

      <div
        className="mx-auto"
        style={{
          maxWidth: 1100,
          padding: "clamp(12px, 2.5vw, 28px)",
        }}
      >
        <div
          style={{
            background: PARTY_THEME.white,
            border: `1px solid ${PARTY_THEME.border}`,
            borderRadius: 16,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box sx={{ p: 2.5, borderBottom: `1px solid ${PARTY_THEME.border}` }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "14px",
                  border: `1px solid ${PARTY_THEME.border}`,
                  background: "rgba(255,45,45,0.06)",
                  color: PARTY_THEME.redDark,
                }}
              >
                <FileCheck size={22} />
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 900, color: PARTY_THEME.black, fontSize: isXs ? 22 : 28, letterSpacing: "-0.02em" }}>
                  Expense Approvals
                </Typography>
                <Typography sx={{ color: PARTY_THEME.muted, fontWeight: 600 }}>
                  Only <b>pending</b> transactions are displayed for quick action.
                </Typography>
              </Box>

              <Chip
                label={can.view ? "Access: Allowed" : "Access: Limited"}
                sx={{
                  fontWeight: 900,
                  borderRadius: "999px",
                  background: can.view ? "rgba(16,185,129,0.12)" : "rgba(255,45,45,0.10)",
                  color: can.view ? "#065F46" : PARTY_THEME.redDark,
                }}
              />
            </Stack>

            {!can.view && (
              <Box sx={{ mt: 2, p: 2, borderRadius: "12px", border: `1px solid ${PARTY_THEME.border}`, background: "#fff" }}>
                <Typography sx={{ fontWeight: 900, color: PARTY_THEME.redDark }}>No access</Typography>
                <Typography sx={{ color: PARTY_THEME.muted, fontWeight: 600 }}>
                  You don’t have <code>expenses.view</code> (or equivalent). The page is public, but the list is permission-protected.
                </Typography>
              </Box>
            )}
          </Box>

          {/* Controls */}
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
              <TextField
                placeholder="Search (category, desc, method, submitted by, payee, reference)…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                size="small"
                fullWidth={isXs}
                sx={{
                  minWidth: { xs: "100%", sm: 380 },
                  "& input": { fontSize: 16 },
                  bgcolor: "white",
                  "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: PARTY_THEME.border },
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: PARTY_THEME.red, borderWidth: "2px" },
                }}
                type="search"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} color={PARTY_THEME.muted} />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                variant="outlined"
                onClick={fetchApprovedExpenses}
                sx={{
                  borderRadius: "12px",
                  fontWeight: 900,
                  textTransform: "none",
                  borderColor: "#CBD5E1",
                  color: PARTY_THEME.black,
                  "&:hover": { backgroundColor: "#F8FAFC" },
                }}
              >
                Refresh
              </Button>

              <Button
                variant="text"
                onClick={fetchMyPermissions}
                sx={{
                  borderRadius: "12px",
                  fontWeight: 900,
                  textTransform: "none",
                  color: PARTY_THEME.redDark,
                }}
              >
                Reload Permissions
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Content */}
            {loading && expenses.length === 0 ? (
              <Stack spacing={1}>
                {[...Array(4)].map((_, i) => (
                  <Box key={i} sx={{ p: 2, borderRadius: "14px", border: `1px solid ${PARTY_THEME.border}` }}>
                    <Skeleton variant="text" height={24} width="60%" />
                    <Skeleton variant="text" height={20} width="40%" />
                    <Skeleton variant="rectangular" height={12} sx={{ my: 1 }} />
                    <Skeleton variant="text" height={18} width="30%" />
                    <Skeleton variant="text" height={18} width="50%" />
                    <Skeleton variant="rectangular" height={36} sx={{ mt: 1, borderRadius: 2 }} />
                  </Box>
                ))}
              </Stack>
            ) : isXs ? (
              // ===== MOBILE CARDS =====
              <Stack spacing={1.5}>
                {filtered.length === 0 ? (
                  <Box sx={{ borderRadius: "14px", border: `1px dashed ${PARTY_THEME.border}`, textAlign: "center", p: 4, color: PARTY_THEME.muted }}>
                    No pending expenses to display.
                  </Box>
                ) : (
                  filtered.map((exp) => (
                    <Box key={exp.id} sx={{ borderRadius: "14px", border: `1px solid ${PARTY_THEME.border}`, background: "#fff", p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography fontWeight={900} sx={{ color: PARTY_THEME.black }}>
                          {exp.category}
                        </Typography>

                        <Chip
                          size="small"
                          label="Pending"
                          variant="outlined"
                          sx={{
                            fontWeight: 900,
                            borderColor: PARTY_THEME.redDark,
                            color: PARTY_THEME.redDark,
                          }}
                        />
                      </Stack>

                      <Typography variant="body2" sx={{ mb: 1, color: PARTY_THEME.muted, fontWeight: 600 }}>
                        {exp.description}
                      </Typography>

                      <Stack spacing={0.5} sx={{ fontSize: 14, color: PARTY_THEME.text }}>
                        <div><b>Date:</b> {exp.date}</div>
                        <div><b>Amount:</b> Ksh {exp.amount.toLocaleString()}</div>
                        <div><b>Method:</b> {exp.payment_method}</div>
                        <div><b>By:</b> {exp.submitted_by}</div>
                        {exp.payee_name && <div><b>Payee:</b> {exp.payee_name}</div>}
                        {exp.payment_reference && <div><b>Reference:</b> {exp.payment_reference}</div>}
                      </Stack>

                      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                        <Tooltip title="View details">
                          <IconButton onClick={() => setDetailsView(exp)} aria-label="View details">
                            <Info size={20} />
                          </IconButton>
                        </Tooltip>

                        {exp.receipt_url && (
                          <Tooltip title="View receipt">
                            <IconButton onClick={() => setReceiptView(exp.receipt_url!)} aria-label="View receipt">
                              <Eye size={20} />
                            </IconButton>
                          </Tooltip>
                        )}

                        {can.markPaid && (
                          <Tooltip title="Mark paid">
                            <IconButton onClick={() => handleAction(exp.id, "paid")} aria-label="Mark paid">
                              <CheckCircle size={20} />
                            </IconButton>
                          </Tooltip>
                        )}

                        {can.decline && (
                          <Tooltip title="Decline">
                            <IconButton onClick={() => handleAction(exp.id, "declined")} aria-label="Decline">
                              <XCircle size={20} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Box>
                  ))
                )}
              </Stack>
            ) : (
              // ===== DESKTOP TABLE =====
              <div
                style={{
                  borderRadius: 14,
                  border: `1px solid ${PARTY_THEME.border}`,
                  overflowX: "auto",
                  background: "#fff",
                }}
              >
                <table className="min-w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: PARTY_THEME.headerBg }}>
                      <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900, textAlign: "left" }}>#</th>
                      <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900, textAlign: "left" }}>Category</th>
                      <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900, textAlign: "left" }}>Description</th>
                      <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900, textAlign: "left" }}>Amount</th>
                      <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900, textAlign: "left" }}>Payment Method</th>
                      <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900, textAlign: "left" }}>Submitted By</th>
                      <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900, textAlign: "left" }}>Status</th>
                      <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900, textAlign: "left" }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: 22, textAlign: "center", color: PARTY_THEME.muted }}>
                          No pending expenses to display.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((exp, idx) => (
                        <tr
                          key={exp.id}
                          style={{ borderTop: `1px solid ${PARTY_THEME.borderSoft}` }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = PARTY_THEME.rowHover)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = PARTY_THEME.white)}
                        >
                          <td style={{ padding: "16px", fontWeight: 800, color: PARTY_THEME.text }}>{idx + 1}</td>
                          <td style={{ padding: "16px", fontWeight: 700, color: PARTY_THEME.text }}>{exp.category}</td>
                          <td style={{ padding: "16px", color: PARTY_THEME.muted, maxWidth: 520 }}>{exp.description}</td>
                          <td style={{ padding: "16px", fontWeight: 900, color: PARTY_THEME.text }}>
                            Ksh {exp.amount.toLocaleString()}
                          </td>
                          <td style={{ padding: "16px", color: PARTY_THEME.muted, fontWeight: 600 }}>{exp.payment_method}</td>
                          <td style={{ padding: "16px", color: PARTY_THEME.muted, fontWeight: 600 }}>{exp.submitted_by}</td>
                          <td style={{ padding: "16px" }}>
                            <Chip
                              size="small"
                              variant="outlined"
                              label="Pending"
                              sx={{ fontWeight: 900, borderColor: PARTY_THEME.redDark, color: PARTY_THEME.redDark }}
                            />
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Tooltip title="View details">
                                <IconButton onClick={() => setDetailsView(exp)}>
                                  <Info size={20} />
                                </IconButton>
                              </Tooltip>

                              {exp.receipt_url && (
                                <Tooltip title="View receipt">
                                  <IconButton onClick={() => setReceiptView(exp.receipt_url!)}>
                                    <Eye size={20} />
                                  </IconButton>
                                </Tooltip>
                              )}

                              {can.markPaid && (
                                <Tooltip title="Mark paid">
                                  <IconButton onClick={() => handleAction(exp.id, "paid")}>
                                    <CheckCircle size={20} />
                                  </IconButton>
                                </Tooltip>
                              )}

                              {can.decline && (
                                <Tooltip title="Decline">
                                  <IconButton onClick={() => handleAction(exp.id, "declined")}>
                                    <XCircle size={20} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Box>

          {/* Snackbar */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            TransitionComponent={(props) => <Slide {...props} direction="up" />}
          >
            <Alert
              onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
              severity={snackbar.severity}
              sx={{ width: "100%", borderRadius: "12px" }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>

          {/* Receipt Dialog */}
          <Dialog open={!!receiptView} onClose={() => setReceiptView(null)} maxWidth="md" fullWidth fullScreen={isXs}>
            <DialogTitle sx={{ fontWeight: 900, color: PARTY_THEME.black }}>Receipt Preview</DialogTitle>
            <DialogContent dividers sx={{ p: { xs: 0, sm: 2 } }}>
              {receiptView?.toLowerCase().endsWith(".pdf") ? (
                <iframe src={receiptView} title="Receipt PDF" width="100%" style={{ height: isXs ? "80dvh" : "70vh", border: 0 }} />
              ) : (
                <img
                  src={receiptView!}
                  alt="Receipt"
                  style={{ width: "100%", maxHeight: isXs ? "80dvh" : "70vh", objectFit: "contain", display: "block" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "https://placehold.co/600x400/cccccc/000000?text=No+Receipt";
                  }}
                />
              )}
            </DialogContent>
            {!isXs && (
              <DialogActions>
                <Button onClick={() => setReceiptView(null)}>Close</Button>
              </DialogActions>
            )}
          </Dialog>

          {/* Details Dialog */}
          <Dialog open={!!detailsView} onClose={() => setDetailsView(null)} maxWidth="sm" fullWidth fullScreen={isXs}>
            <DialogTitle sx={{ fontWeight: 900, color: PARTY_THEME.black }}>Expense Details</DialogTitle>
            <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
              {detailsView && (
                <Box className="space-y-2">
                  <Row k="ID" v={detailsView.id} />
                  <Row k="Date" v={detailsView.date} />
                  <Row k="Category" v={detailsView.category} />
                  <Row k="Description" v={detailsView.description} />
                  <Row k="Amount" v={`Ksh ${detailsView.amount.toLocaleString()}`} strong />
                  <Row k="Payment Method" v={detailsView.payment_method} />
                  {detailsView.payee_name && <Row k="Payee Name" v={detailsView.payee_name} />}
                  {detailsView.payment_reference && <Row k="Payment Reference" v={detailsView.payment_reference} />}
                  {detailsView.payment_details && <Row k="Payment Instructions" v={detailsView.payment_details} />}
                  <Row k="Submitted By" v={detailsView.submitted_by} />
                  <Row k="Approval Status" v={detailsView.status} />
                  <Row k="Payment Status" v={detailsView.payment_status} />

                  {detailsView.receipt_url && (
                    <Button
                      variant="outlined"
                      startIcon={<Eye />}
                      onClick={() => {
                        setReceiptView(detailsView.receipt_url!);
                        setDetailsView(null);
                      }}
                      sx={{
                        mt: 1,
                        borderRadius: "12px",
                        fontWeight: 900,
                        textTransform: "none",
                        borderColor: "#CBD5E1",
                        color: PARTY_THEME.black,
                        "&:hover": { backgroundColor: "#F8FAFC" },
                      }}
                    >
                      View Receipt
                    </Button>
                  )}

                  <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 2 }}>
                    {can.markPaid && (
                      <Button
                        variant="contained"
                        onClick={() => handleAction(detailsView.id, "paid")}
                        sx={{
                          borderRadius: "12px",
                          fontWeight: 900,
                          textTransform: "none",
                          background: `linear-gradient(90deg, ${PARTY_THEME.red} 0%, ${PARTY_THEME.redDark} 100%)`,
                          "&:hover": { background: `linear-gradient(90deg, ${PARTY_THEME.redDark} 0%, ${PARTY_THEME.red} 100%)` },
                        }}
                        startIcon={<CheckCircle />}
                      >
                        Mark as Paid
                      </Button>
                    )}

                    {can.decline && (
                      <Button
                        variant="outlined"
                        onClick={() => handleAction(detailsView.id, "declined")}
                        sx={{
                          borderRadius: "12px",
                          fontWeight: 900,
                          textTransform: "none",
                          borderColor: PARTY_THEME.redDark,
                          color: PARTY_THEME.redDark,
                          "&:hover": { backgroundColor: "rgba(255,45,45,0.10)", borderColor: PARTY_THEME.red },
                        }}
                        startIcon={<XCircle />}
                      >
                        Decline
                      </Button>
                    )}
                  </Stack>
                </Box>
              )}
            </DialogContent>

            {!isXs && (
              <DialogActions>
                <Button onClick={() => setDetailsView(null)}>Close</Button>
              </DialogActions>
            )}
          </Dialog>
        </div>
      </div>
    </div>
  );
};

/* tiny presentational helper for details rows */
function Row({ k, v, strong = false }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2}>
      <Typography sx={{ color: "text.secondary", minWidth: 140 }}>{k}:</Typography>
      <Typography sx={{ fontWeight: strong ? 800 : 600, textAlign: "right", flex: 1 }}>{v}</Typography>
    </Stack>
  );
}

export default ApprovedPaymentsPage;
