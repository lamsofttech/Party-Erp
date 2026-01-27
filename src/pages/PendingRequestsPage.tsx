import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Slide,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
  Button,
  Box,
  Typography,
  Stack,
  Chip,
  Divider,
  TextField,
  InputAdornment,
} from "@mui/material";
import type { SnackbarOrigin } from "@mui/material";
import { Eye, FileText, Search, X } from "lucide-react";

/* ---------------- THEME (white / red / black) ---------------- */
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

interface Expense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  payee_name?: string;
  payment_reference?: string;
  payment_details?: string;
  receipt_url?: string;
  submitted_by?: string;
  status: "pending" | "rejected" | "declined";
}

type Grouped = {
  pending: Expense[];
  rejected: Expense[];
  declined: Expense[];
};

const API_BASE = "https://skizagroundsuite.com/API";

/**
 * IMPORTANT:
 * - This GET must NOT send Authorization header, otherwise browser does preflight,
 *   and your server currently blocks "authorization" header => CORS fail.
 */
const apiPublic = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

/**
 * For actions (approve/reject/etc), we attach token manually (if present).
 * This way only POST may require auth; GET stays public.
 */
const apiAuth = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

const toAbsoluteUrl = (maybeUrl?: string) => {
  if (!maybeUrl) return "";
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
  const baseOrigin = new URL(API_BASE).origin; // https://skizagroundsuite.com
  const cleaned = maybeUrl.startsWith("/") ? maybeUrl : `/${maybeUrl}`;
  return `${baseOrigin}${cleaned}`;
};

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Grouped>({
    pending: [],
    rejected: [],
    declined: [],
  });

  const [tab, setTab] = useState<number>(0);
  const [query, setQuery] = useState("");

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  const [receiptView, setReceiptView] = useState<string | null>(null);

  const closeSnack = () => setSnackbar((s) => ({ ...s, open: false }));

  const getServerMessage = (err: any, fallback: string) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.response?.data ||
      err?.message ||
      fallback;
    return typeof msg === "string" ? msg : fallback;
  };

  const fetchExpenses = async () => {
    try {
      const res = await apiPublic.get("/get_all_expenses_grouped.php");

      if (res.data?.status === "success" && res.data?.data) {
        const data = res.data.data as Grouped;

        // normalize urls + numbers safely
        const mapRow = (e: any): Expense => ({
          ...e,
          id: Number(e.id),
          amount: Number(e.amount) || 0,
          receipt_url: e.receipt_url ? toAbsoluteUrl(e.receipt_url) : undefined,
          status: e.status,
        });

        setExpenses({
          pending: Array.isArray(data.pending) ? data.pending.map(mapRow) : [],
          rejected: Array.isArray(data.rejected) ? data.rejected.map(mapRow) : [],
          declined: Array.isArray(data.declined) ? data.declined.map(mapRow) : [],
        });
      } else {
        throw new Error(res.data?.message || "Failed to fetch expenses.");
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: getServerMessage(err, "Failed to fetch expenses."),
        severity: "error",
      });
    }
  };

  const handleAction = async (id: number, action: string) => {
    try {
      const token = localStorage.getItem("token"); // adjust if you store token elsewhere
      if (!token) {
        setSnackbar({
          open: true,
          message: "You must be logged in to perform this action (missing token).",
          severity: "error",
        });
        return;
      }

      const res = await apiAuth.post(
        "/update_expense_status.php",
        { id, action },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data?.status === "success") {
        await fetchExpenses();
        setSnackbar({ open: true, message: res.data?.message || "Updated.", severity: "success" });
      } else {
        throw new Error(res.data?.message || "Failed to update status.");
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: getServerMessage(err, "Failed to update status."),
        severity: "error",
      });
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const statusTitles = ["Pending", "Rejected", "Declined"] as const;

  const currentRows = useMemo(() => {
    const rows = tab === 0 ? expenses.pending : tab === 1 ? expenses.rejected : expenses.declined;

    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((e) => {
      const blob = `${e.id} ${e.date} ${e.category} ${e.description} ${e.payment_method} ${e.payee_name ?? ""} ${e.payment_reference ?? ""
        } ${e.submitted_by ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [tab, expenses, query]);

  const StatusPill = ({ label }: { label: string }) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 14px",
        borderRadius: 999,
        border: `2px solid ${PARTY_THEME.pillBorder}`,
        color: PARTY_THEME.pillBorder,
        fontWeight: 800,
        background: PARTY_THEME.white,
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  );

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui",
        background: `linear-gradient(180deg, ${PARTY_THEME.white} 0%, #FAFAFA 60%, #F5F5F5 100%)`,
      }}
    >
      {/* TOP THEME BARS */}
      <div className="w-full">
        <div style={{ height: 34, background: PARTY_THEME.white }} />
        <div style={{ height: 34, background: PARTY_THEME.red }} />
        <div style={{ height: 10, background: PARTY_THEME.black }} />
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* HEADER */}
        <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <FileText size={26} />
            <Box>
              <Typography sx={{ fontSize: 26, fontWeight: 900, color: PARTY_THEME.black, letterSpacing: "-0.02em" }}>
                Expense Requests
              </Typography>
              <Typography sx={{ color: PARTY_THEME.muted, fontWeight: 600 }}>
                Manage pending, rejected, and declined expense requests.
              </Typography>
            </Box>
          </Stack>

          <Chip
            label="White / Red / Black Theme"
            sx={{
              backgroundColor: "rgba(0,0,0,0.06)",
              color: PARTY_THEME.black,
              fontWeight: 800,
              borderRadius: "999px",
            }}
          />
        </Box>

        {/* CARD */}
        <div
          style={{
            background: PARTY_THEME.white,
            border: `1px solid ${PARTY_THEME.border}`,
            borderRadius: 14,
            boxShadow: "0 8px 22px rgba(15, 23, 42, 0.06)",
            overflow: "hidden",
          }}
        >
          {/* Search row */}
          <Box sx={{ p: 2, display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID, category, description, payee, reference, submitted by..."
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} color={PARTY_THEME.muted} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "12px", backgroundColor: PARTY_THEME.white },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: PARTY_THEME.border },
                "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#CBD5E1" },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: PARTY_THEME.red,
                  borderWidth: "2px",
                },
              }}
            />

            <Button
              onClick={fetchExpenses}
              variant="outlined"
              sx={{
                borderRadius: "12px",
                px: 3,
                py: 1.15,
                fontWeight: 900,
                textTransform: "none",
                borderColor: "#CBD5E1",
                color: PARTY_THEME.black,
                backgroundColor: PARTY_THEME.white,
                "&:hover": { backgroundColor: "#F8FAFC", borderColor: "#94A3B8" },
                height: 46,
                whiteSpace: "nowrap",
              }}
            >
              Refresh
            </Button>
          </Box>

          <Divider />

          {/* Tabs */}
          <Box sx={{ px: 2, pt: 1.5 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                "& .MuiTab-root": { fontWeight: 900, textTransform: "none" },
                "& .Mui-selected": { color: PARTY_THEME.redDark },
                "& .MuiTabs-indicator": { backgroundColor: PARTY_THEME.red },
              }}
            >
              <Tab label={`Pending (${expenses.pending.length})`} />
              <Tab label={`Rejected (${expenses.rejected.length})`} />
              <Tab label={`Declined (${expenses.declined.length})`} />
            </Tabs>
          </Box>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: PARTY_THEME.headerBg }}>
                  <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900 }}>#</th>
                  <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900 }}>Date</th>
                  <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900 }}>Category</th>
                  <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900 }}>Description</th>
                  <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900 }}>Amount</th>
                  <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900 }}>Payment</th>
                  <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900 }}>Receipt</th>
                  <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900 }}>Submitted By</th>
                  <th style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 900, textAlign: "right" }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {currentRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 20, textAlign: "center", color: PARTY_THEME.muted }}>
                      No {statusTitles[tab]} expenses.
                    </td>
                  </tr>
                ) : (
                  currentRows.map((exp, idx) => (
                    <tr
                      key={exp.id}
                      style={{ background: PARTY_THEME.white, borderTop: `1px solid ${PARTY_THEME.borderSoft}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = PARTY_THEME.rowHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = PARTY_THEME.white)}
                    >
                      <td style={{ padding: "14px 16px", color: PARTY_THEME.text, fontWeight: 900 }}>{idx + 1}</td>
                      <td style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 700 }}>{exp.date}</td>
                      <td style={{ padding: "14px 16px", color: PARTY_THEME.text, fontWeight: 700 }}>{exp.category}</td>
                      <td style={{ padding: "14px 16px", color: PARTY_THEME.muted, maxWidth: 520 }}>
                        <span
                          style={{
                            display: "inline-block",
                            maxWidth: 520,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {exp.description || "-"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: PARTY_THEME.text, fontWeight: 900 }}>
                        Ksh {Number(exp.amount || 0).toLocaleString()}
                      </td>

                      <td style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 700, whiteSpace: "pre-line" }}>
                        <div>
                          <b>Method:</b> {exp.payment_method || "-"}
                        </div>
                        {exp.payee_name && (
                          <div>
                            <b>Payee:</b> {exp.payee_name}
                          </div>
                        )}
                        {exp.payment_reference && (
                          <div>
                            <b>Ref:</b> {exp.payment_reference}
                          </div>
                        )}
                        {exp.payment_details && <div style={{ marginTop: 6, fontSize: 12 }}>{exp.payment_details}</div>}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        {exp.receipt_url ? (
                          <Tooltip title="View Receipt">
                            <IconButton
                              onClick={() => setReceiptView(exp.receipt_url!)}
                              sx={{
                                border: "1px solid #CBD5E1",
                                borderRadius: "12px",
                                width: 40,
                                height: 40,
                                color: PARTY_THEME.black,
                                backgroundColor: PARTY_THEME.white,
                                "&:hover": { backgroundColor: "#F8FAFC" },
                              }}
                            >
                              <Eye size={18} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <span style={{ color: "#9CA3AF", fontWeight: 800 }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px", color: PARTY_THEME.muted, fontWeight: 700 }}>
                        {exp.submitted_by || "-"}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {/* Status pill */}
                          <StatusPill label={statusTitles[tab]} />

                          {tab === 0 ? (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleAction(exp.id, "approve")}
                                sx={{
                                  borderRadius: "12px",
                                  fontWeight: 900,
                                  textTransform: "none",
                                  background: `linear-gradient(90deg, ${PARTY_THEME.red} 0%, ${PARTY_THEME.redDark} 100%)`,
                                  "&:hover": {
                                    background: `linear-gradient(90deg, ${PARTY_THEME.redDark} 0%, ${PARTY_THEME.red} 100%)`,
                                  },
                                }}
                              >
                                Approve
                              </Button>

                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleAction(exp.id, "reject")}
                                sx={{
                                  borderRadius: "12px",
                                  fontWeight: 900,
                                  textTransform: "none",
                                  borderColor: PARTY_THEME.redDark,
                                  color: PARTY_THEME.redDark,
                                  "&:hover": { backgroundColor: "rgba(255,45,45,0.10)", borderColor: PARTY_THEME.red },
                                }}
                              >
                                Reject
                              </Button>

                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleAction(exp.id, "decline")}
                                sx={{
                                  borderRadius: "12px",
                                  fontWeight: 900,
                                  textTransform: "none",
                                  borderColor: "#D97706",
                                  color: "#D97706",
                                  "&:hover": { backgroundColor: "rgba(217,119,6,0.10)" },
                                }}
                              >
                                Decline
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleAction(exp.id, "reopen")}
                                sx={{
                                  borderRadius: "12px",
                                  fontWeight: 900,
                                  textTransform: "none",
                                  borderColor: "#2563EB",
                                  color: "#2563EB",
                                  "&:hover": { backgroundColor: "rgba(37,99,235,0.08)" },
                                }}
                              >
                                Reopen
                              </Button>

                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleAction(exp.id, "close")}
                                sx={{
                                  borderRadius: "12px",
                                  fontWeight: 900,
                                  textTransform: "none",
                                  background: PARTY_THEME.black,
                                  "&:hover": { background: "#111827" },
                                }}
                              >
                                Close
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4500}
          onClose={closeSnack}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" } as SnackbarOrigin}
          TransitionComponent={(props) => <Slide {...props} direction="up" />}
        >
          <Alert onClose={closeSnack} severity={snackbar.severity} sx={{ width: "100%", borderRadius: "12px" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Receipt Preview */}
        <Dialog open={!!receiptView} onClose={() => setReceiptView(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 900, color: PARTY_THEME.black }}>
            Receipt Preview
            <IconButton onClick={() => setReceiptView(null)} sx={{ float: "right" }}>
              <X />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {receiptView?.toLowerCase().includes(".pdf") ? (
              <iframe
                src={receiptView}
                title="Receipt PDF"
                width="100%"
                height="520px"
                className="rounded-2xl border"
                style={{ borderColor: PARTY_THEME.border }}
              />
            ) : (
              <img
                src={receiptView || ""}
                alt="Receipt"
                className="w-full h-auto rounded-2xl border"
                style={{ borderColor: PARTY_THEME.border }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://placehold.co/600x400/cccccc/000000?text=Image+Not+Found";
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ExpensesPage;
