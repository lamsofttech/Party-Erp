import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  Snackbar,
  Alert,
  Slide,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  Chip,
  TextField,
  InputAdornment,
  Divider,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import type { SnackbarOrigin } from "@mui/material";
import { FilePlus, Eye, Search, SlidersHorizontal, Paperclip, X } from "lucide-react";

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
  receipt_url?: string;
  submitted_by: string;
  submitted_by_id?: number;
  submitted_by_role?: string;
  status: "approved" | "pending" | "rejected";
}

const API_BASE = "https://skizagroundsuite.com/API";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // ✅ IMPORTANT: send HttpOnly cookie token from pin-login.php
});

// Optional: also attach bearer token if you store it in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const POLLING_INTERVAL = 5000;

/**
 * If backend returns receipt_url like:
 *   - "https://domain.com/file.pdf" -> keep as is
 *   - "/uploads/file.pdf" or "uploads/file.pdf" -> convert to full URL using API_BASE origin
 */
const toAbsoluteUrl = (maybeUrl?: string) => {
  if (!maybeUrl) return "";
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;

  const baseOrigin = new URL(API_BASE).origin; // https://skizagroundsuite.com
  const cleaned = maybeUrl.startsWith("/") ? maybeUrl : `/${maybeUrl}`;
  return `${baseOrigin}${cleaned}`;
};

const ExpenseLedgerPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [receiptView, setReceiptView] = useState<{ id: number; url: string } | null>(null);

  // permissions (front-end display only; API still enforces)
  const [perms, setPerms] = useState<string[]>([]);
  const can = useMemo(() => {
    const p = perms.map((x) => x.toLowerCase());
    return {
      view: p.includes("expenses.view"),
      create: p.includes("expenses.create"),
      approve: p.includes("expenses.approve"),
      reject: p.includes("expenses.reject"),
      edit: p.includes("expenses.edit"),
    };
  }, [perms]);

  const [userChip, setUserChip] = useState<string>("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    date: "",
    category: "",
    description: "",
    amount: "",
    payment_method: "",
    receipt: null as File | null,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    payment_method: "",
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const [fieldErrors, setFieldErrors] = useState<{
    date?: string;
    category?: string;
    amount?: string;
    payment_method?: string;
  }>({});

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

  // ✅ Load permissions from backend using cookie token (or Bearer if you store it)
  useEffect(() => {
    const loadMyPerms = async () => {
      try {
        const res = await api.get("/auth-my-permissions.php");

        if (res.data?.success) {
          setPerms(res.data.permissions || []);
          setUserChip(`${res.data?.user?.role || "User"} • ID: ${res.data?.user?.id || "-"}`);
        } else {
          setPerms([]);
          setUserChip("No Permissions");
        }
      } catch (err) {
        setPerms([]);
        setUserChip("Not Logged In");
      }
    };

    loadMyPerms();
  }, []);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await api.get("/get_expenses.php");

      if (res.data?.status === "success") {
        const mapped: Expense[] = (res.data.data || []).map((exp: any) => {
          const amt = Number(exp.amount);
          return {
            ...exp,
            id: Number(exp.id),
            amount: Number.isFinite(amt) ? amt : 0,
            receipt_url: exp.receipt_url ? toAbsoluteUrl(exp.receipt_url) : undefined,
            submitted_by: `${exp.submitted_by_role || "User"} (ID: ${exp.submitted_by_id || "-"})`,
          };
        });

        setExpenses(mapped);
      } else {
        setSnackbar({
          open: true,
          message: "Could not fetch expenses: " + (res.data?.message || "Unknown error"),
          severity: "error",
        });
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: getServerMessage(err, "Could not fetch expenses."),
        severity: "error",
      });
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    const intervalId = setInterval(fetchExpenses, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchExpenses]);

  const handleApprove = async (id: number) => {
    try {
      const res = await api.post(
        "/approve_expenses.php",
        { id },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data?.status === "success") {
        setExpenses((prev) => prev.map((exp) => (exp.id === id ? { ...exp, status: "approved" } : exp)));
        setSnackbar({ open: true, message: "Expense approved.", severity: "success" });
      } else {
        setSnackbar({ open: true, message: "Approval failed: " + (res.data?.message || ""), severity: "error" });
        fetchExpenses();
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: getServerMessage(err, "Error approving expense."), severity: "error" });
      fetchExpenses();
    }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await api.post(
        "/reject_expenses.php",
        { id },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data?.status === "success") {
        setExpenses((prev) => prev.map((exp) => (exp.id === id ? { ...exp, status: "rejected" } : exp)));
        setSnackbar({ open: true, message: "Expense rejected.", severity: "success" });
      } else {
        setSnackbar({ open: true, message: "Rejection failed: " + (res.data?.message || ""), severity: "error" });
        fetchExpenses();
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: getServerMessage(err, "Error rejecting expense."), severity: "error" });
      fetchExpenses();
    }
  };

  const validateAddForm = () => {
    const errs: typeof fieldErrors = {};
    if (!newExpense.date) errs.date = "Required";
    if (!newExpense.category) errs.category = "Required";
    if (!newExpense.payment_method) errs.payment_method = "Required";

    if (!newExpense.amount) errs.amount = "Required";
    else if (Number.isNaN(Number(newExpense.amount)) || Number(newExpense.amount) <= 0) {
      errs.amount = "Enter a valid amount";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetAddForm = () => {
    setNewExpense({ date: "", category: "", description: "", amount: "", payment_method: "", receipt: null });
    setFieldErrors({});
  };

  const handleSubmitExpense = async () => {
    if (!validateAddForm()) {
      setSnackbar({ open: true, message: "Please fix the highlighted fields.", severity: "error" });
      return;
    }

    const formData = new FormData();
    formData.append("date", newExpense.date);
    formData.append("category", newExpense.category);
    formData.append("description", newExpense.description || "");
    formData.append("amount", String(newExpense.amount));
    formData.append("payment_method", newExpense.payment_method);

    if (newExpense.receipt) formData.append("receipt", newExpense.receipt);

    try {
      const res = await api.post("/add_expenses.php", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.status === "success") {
        setIsAddModalOpen(false);
        setSnackbar({ open: true, message: "Expense submitted successfully!", severity: "success" });
        resetAddForm();
        fetchExpenses();
      } else {
        setSnackbar({
          open: true,
          message: "Failed to submit expense: " + (res.data?.message || "Unknown error"),
          severity: "error",
        });
        fetchExpenses();
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: getServerMessage(err, "Failed to submit expense."), severity: "error" });
      fetchExpenses();
    }
  };

  const selectedExpense = useMemo(() => {
    if (!receiptView) return null;
    return expenses.find((e) => e.id === receiptView.id) || null;
  }, [receiptView, expenses]);

  const StatusPill = ({ status }: { status: Expense["status"] }) => {
    const label = status === "approved" ? "Approved" : status === "pending" ? "Pending" : "Rejected";
    return (
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
  };

  const searchedAndFiltered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return expenses
      .filter((exp) => {
        const matchesSearch =
          !q ||
          String(exp.id).includes(q) ||
          exp.category?.toLowerCase().includes(q) ||
          exp.description?.toLowerCase().includes(q) ||
          exp.submitted_by?.toLowerCase().includes(q) ||
          exp.payment_method?.toLowerCase().includes(q) ||
          exp.status?.toLowerCase().includes(q);

        const matchesFilters =
          (!filters.category || exp.category === filters.category) &&
          (!filters.status || exp.status === filters.status) &&
          (!filters.payment_method || exp.payment_method === filters.payment_method);

        return matchesSearch && matchesFilters;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return b.id - a.id;
      });
  }, [expenses, searchTerm, filters]);

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui",
        background: `linear-gradient(180deg, ${PARTY_THEME.white} 0%, #FAFAFA 60%, #F5F5F5 100%)`,
      }}
    >
      <div className="w-full">
        <div style={{ height: 34, background: PARTY_THEME.white }} />
        <div style={{ height: 34, background: PARTY_THEME.red }} />
        <div style={{ height: 10, background: PARTY_THEME.black }} />
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 style={{ color: PARTY_THEME.black, fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em" }}>
              Expense Ledger
            </h1>
            <p style={{ color: PARTY_THEME.muted, marginTop: 4 }}>
              Track submissions, approvals and receipts with an audit-friendly layout.
            </p>
          </div>

          <Chip
            label={userChip || "User"}
            sx={{
              backgroundColor: "rgba(0,0,0,0.06)",
              color: PARTY_THEME.black,
              fontWeight: 800,
              borderRadius: "999px",
            }}
          />
        </div>

        {!can.view && (
          <Box sx={{ mb: 2, p: 2, border: `1px solid ${PARTY_THEME.border}`, borderRadius: "12px", background: "#fff" }}>
            <Typography sx={{ fontWeight: 900, color: PARTY_THEME.redDark }}>No access</Typography>
            <Typography sx={{ color: PARTY_THEME.muted, fontWeight: 600 }}>
              You don’t have <code>expenses.view</code>. Ask admin to assign permissions.
            </Typography>
          </Box>
        )}

        <div
          style={{
            background: PARTY_THEME.white,
            border: `1px solid ${PARTY_THEME.border}`,
            borderRadius: 14,
            boxShadow: "0 8px 22px rgba(15, 23, 42, 0.06)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
            <TextField
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Expense ID, Category, Description, Submitted By..."
              variant="outlined"
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
              onClick={() => setIsFilterOpen(true)}
              variant="outlined"
              startIcon={<SlidersHorizontal size={18} />}
              sx={{
                borderRadius: "12px",
                px: 3,
                py: 1.2,
                fontWeight: 900,
                textTransform: "none",
                borderColor: "#CBD5E1",
                color: PARTY_THEME.black,
                backgroundColor: PARTY_THEME.white,
                "&:hover": { backgroundColor: "#F8FAFC", borderColor: "#94A3B8" },
                minWidth: 160,
                height: 48,
              }}
            >
              Apply Filter
            </Button>

            {can.create && (
              <Button
                variant="contained"
                startIcon={<FilePlus />}
                onClick={() => setIsAddModalOpen(true)}
                sx={{
                  borderRadius: "12px",
                  px: 3,
                  py: 1.2,
                  fontWeight: 900,
                  textTransform: "none",
                  background: `linear-gradient(90deg, ${PARTY_THEME.red} 0%, ${PARTY_THEME.redDark} 100%)`,
                  "&:hover": { background: `linear-gradient(90deg, ${PARTY_THEME.redDark} 0%, ${PARTY_THEME.red} 100%)` },
                  minWidth: 150,
                  height: 48,
                }}
              >
                Add Expense
              </Button>
            )}
          </div>

          <Divider />

          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: PARTY_THEME.headerBg }}>
                  <th style={{ padding: "16px 18px", color: PARTY_THEME.muted, fontWeight: 800 }}>Expense ID</th>
                  <th style={{ padding: "16px 18px", color: PARTY_THEME.muted, fontWeight: 800 }}>Category</th>
                  <th style={{ padding: "16px 18px", color: PARTY_THEME.muted, fontWeight: 800 }}>Description</th>
                  <th style={{ padding: "16px 18px", color: PARTY_THEME.muted, fontWeight: 800 }}>Amount</th>
                  <th style={{ padding: "16px 18px", color: PARTY_THEME.muted, fontWeight: 800 }}>Payment</th>
                  <th style={{ padding: "16px 18px", color: PARTY_THEME.muted, fontWeight: 800 }}>Status</th>
                  <th style={{ padding: "16px 18px", color: PARTY_THEME.muted, fontWeight: 800 }}>Date</th>
                  <th style={{ padding: "16px 18px", color: PARTY_THEME.muted, fontWeight: 800, textAlign: "right" }}>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {searchedAndFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: "center", color: PARTY_THEME.muted }}>
                      No expenses found.
                    </td>
                  </tr>
                ) : (
                  searchedAndFiltered.map((exp) => (
                    <tr
                      key={exp.id}
                      style={{ background: PARTY_THEME.white, borderTop: `1px solid ${PARTY_THEME.borderSoft}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = PARTY_THEME.rowHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = PARTY_THEME.white)}
                    >
                      <td style={{ padding: "18px 18px", color: PARTY_THEME.text, fontWeight: 800 }}>
                        EXP-{String(exp.id).padStart(6, "0")}
                      </td>

                      <td style={{ padding: "18px 18px", color: PARTY_THEME.text, fontWeight: 600 }}>{exp.category}</td>

                      <td style={{ padding: "18px 18px", color: PARTY_THEME.muted, maxWidth: 520 }}>
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

                      <td style={{ padding: "18px 18px", color: PARTY_THEME.text, fontWeight: 900 }}>
                        Ksh {exp.amount.toLocaleString()}
                      </td>

                      <td style={{ padding: "18px 18px", color: PARTY_THEME.muted, fontWeight: 600 }}>{exp.payment_method}</td>

                      <td style={{ padding: "18px 18px" }}>
                        <StatusPill status={exp.status} />
                      </td>

                      <td style={{ padding: "18px 18px", color: PARTY_THEME.muted, fontWeight: 600 }}>{exp.date}</td>

                      <td style={{ padding: "18px 18px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                          {exp.receipt_url ? (
                            <Tooltip title="View Receipt">
                              <IconButton
                                onClick={() => setReceiptView({ id: exp.id, url: exp.receipt_url! })}
                                sx={{
                                  border: "1px solid #CBD5E1",
                                  borderRadius: "12px",
                                  width: 42,
                                  height: 42,
                                  color: PARTY_THEME.black,
                                  backgroundColor: PARTY_THEME.white,
                                  "&:hover": { backgroundColor: "#F8FAFC" },
                                }}
                              >
                                <Eye size={18} />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <span style={{ color: "#9CA3AF", fontWeight: 700 }}>—</span>
                          )}

                          <Button
                            variant="outlined"
                            onClick={() => {
                              if (exp.receipt_url) setReceiptView({ id: exp.id, url: exp.receipt_url });
                              else setSnackbar({
                                open: true,
                                message: "No receipt attached for this expense.",
                                severity: "error",
                              });
                            }}
                            sx={{
                              borderRadius: "12px",
                              px: 3,
                              py: 1.1,
                              fontWeight: 900,
                              textTransform: "none",
                              borderColor: "#CBD5E1",
                              color: PARTY_THEME.black,
                              backgroundColor: PARTY_THEME.white,
                              boxShadow: "0 2px 10px rgba(15, 23, 42, 0.06)",
                              "&:hover": { backgroundColor: "#F8FAFC", borderColor: "#94A3B8" },
                            }}
                          >
                            View
                          </Button>

                          {exp.status === "pending" && can.approve && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleApprove(exp.id)}
                              sx={{
                                borderRadius: "12px",
                                px: 2.2,
                                py: 1.1,
                                fontWeight: 900,
                                textTransform: "none",
                                borderColor: "#16A34A",
                                color: "#16A34A",
                                "&:hover": { backgroundColor: "rgba(22,163,74,0.08)", borderColor: "#16A34A" },
                              }}
                            >
                              Approve
                            </Button>
                          )}

                          {exp.status === "pending" && can.reject && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleReject(exp.id)}
                              sx={{
                                borderRadius: "12px",
                                px: 2.2,
                                py: 1.1,
                                fontWeight: 900,
                                textTransform: "none",
                                borderColor: PARTY_THEME.redDark,
                                color: PARTY_THEME.redDark,
                                "&:hover": { backgroundColor: "rgba(255,45,45,0.10)", borderColor: PARTY_THEME.red },
                              }}
                            >
                              Reject
                            </Button>
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

        {/* FILTER DIALOG */}
        <Dialog open={isFilterOpen} onClose={() => setIsFilterOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 900, color: PARTY_THEME.black }}>Apply Filters</DialogTitle>
          <DialogContent sx={{ py: 3 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.category}
                    label="Category"
                    onChange={(e) => setFilters({ ...filters, category: String(e.target.value) })}
                    sx={{
                      borderRadius: "12px",
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: PARTY_THEME.red, borderWidth: "2px" },
                    }}
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    <MenuItem value="Volunteer Meals">Volunteer Meals</MenuItem>
                    <MenuItem value="Billboard Ads">Billboard Ads</MenuItem>
                    <MenuItem value="Fuel">Fuel</MenuItem>
                    <MenuItem value="Social Media Ads">Social Media Ads</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => setFilters({ ...filters, status: String(e.target.value) })}
                    sx={{
                      borderRadius: "12px",
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: PARTY_THEME.red, borderWidth: "2px" },
                    }}
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Payment</InputLabel>
                  <Select
                    value={filters.payment_method}
                    label="Payment"
                    onChange={(e) => setFilters({ ...filters, payment_method: String(e.target.value) })}
                    sx={{
                      borderRadius: "12px",
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: PARTY_THEME.red, borderWidth: "2px" },
                    }}
                  >
                    <MenuItem value="">All Methods</MenuItem>
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                    <MenuItem value="Mpesa">Mpesa</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                <Button
                  onClick={() => {
                    setFilters({ category: "", status: "", payment_method: "" });
                    setSearchTerm("");
                  }}
                  variant="outlined"
                  sx={{
                    borderRadius: "12px",
                    fontWeight: 900,
                    textTransform: "none",
                    borderColor: "#CBD5E1",
                    color: PARTY_THEME.black,
                    "&:hover": { backgroundColor: "#F8FAFC" },
                  }}
                >
                  Reset
                </Button>

                <Button
                  onClick={() => setIsFilterOpen(false)}
                  variant="contained"
                  sx={{
                    borderRadius: "12px",
                    fontWeight: 900,
                    textTransform: "none",
                    background: `linear-gradient(90deg, ${PARTY_THEME.red} 0%, ${PARTY_THEME.redDark} 100%)`,
                    "&:hover": { background: `linear-gradient(90deg, ${PARTY_THEME.redDark} 0%, ${PARTY_THEME.red} 100%)` },
                  }}
                >
                  Apply
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
        </Dialog>

        {/* ADD EXPENSE */}
        <Dialog open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 900, color: PARTY_THEME.black, pb: 1 }}>
            Add Expense
            <Typography sx={{ color: PARTY_THEME.muted, fontWeight: 600, mt: 0.5 }} variant="body2">
              Capture expense details, attach receipt, and submit for approval.
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ pb: 3 }}>
            <Box
              sx={{
                border: `1px solid ${PARTY_THEME.border}`,
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 8px 22px rgba(15, 23, 42, 0.06)",
              }}
            >
              <Box sx={{ height: 8, background: `linear-gradient(90deg, ${PARTY_THEME.red} 0%, ${PARTY_THEME.black} 100%)` }} />

              <Box sx={{ p: 2.5, background: PARTY_THEME.white }}>
                <Stack spacing={2.25}>
                  <Box>
                    <Typography sx={{ fontWeight: 900, color: PARTY_THEME.black, mb: 0.5 }}>Expense Details</Typography>
                    <Typography sx={{ color: PARTY_THEME.muted, fontWeight: 600 }} variant="body2">
                      Fields marked with * are required.
                    </Typography>
                  </Box>

                  <Divider />

                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                    <TextField
                      type="date"
                      label="Date *"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      error={!!fieldErrors.date}
                      helperText={fieldErrors.date || " "}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      sx={{
                        "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: PARTY_THEME.red,
                          borderWidth: "2px",
                        },
                      }}
                    />

                    <FormControl fullWidth size="small" error={!!fieldErrors.category}>
                      <InputLabel>Category *</InputLabel>
                      <Select
                        value={newExpense.category}
                        label="Category *"
                        onChange={(e) => setNewExpense({ ...newExpense, category: String(e.target.value) })}
                        sx={{
                          borderRadius: "12px",
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: PARTY_THEME.red, borderWidth: "2px" },
                        }}
                      >
                        <MenuItem value="">Select Category</MenuItem>
                        <MenuItem value="Volunteer Meals">Volunteer Meals</MenuItem>
                        <MenuItem value="Billboard Ads">Billboard Ads</MenuItem>
                        <MenuItem value="Fuel">Fuel</MenuItem>
                        <MenuItem value="Social Media Ads">Social Media Ads</MenuItem>
                      </Select>
                      <Typography variant="caption" sx={{ color: fieldErrors.category ? "#d32f2f" : "transparent", mt: 0.5 }}>
                        {fieldErrors.category || " "}
                      </Typography>
                    </FormControl>

                    <TextField
                      label="Amount (KES) *"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      error={!!fieldErrors.amount}
                      helperText={fieldErrors.amount || " "}
                      fullWidth
                      InputProps={{ startAdornment: <InputAdornment position="start">Ksh</InputAdornment> }}
                      sx={{
                        "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: PARTY_THEME.red,
                          borderWidth: "2px",
                        },
                      }}
                    />

                    <FormControl fullWidth size="small" error={!!fieldErrors.payment_method}>
                      <InputLabel>Payment Method *</InputLabel>
                      <Select
                        value={newExpense.payment_method}
                        label="Payment Method *"
                        onChange={(e) => setNewExpense({ ...newExpense, payment_method: String(e.target.value) })}
                        sx={{
                          borderRadius: "12px",
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: PARTY_THEME.red, borderWidth: "2px" },
                        }}
                      >
                        <MenuItem value="">Select Method</MenuItem>
                        <MenuItem value="Cash">Cash</MenuItem>
                        <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                        <MenuItem value="Mpesa">Mpesa</MenuItem>
                      </Select>
                      <Typography variant="caption" sx={{ color: fieldErrors.payment_method ? "#d32f2f" : "transparent", mt: 0.5 }}>
                        {fieldErrors.payment_method || " "}
                      </Typography>
                    </FormControl>

                    <TextField
                      label="Description"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      placeholder="e.g., Lunch for 10 volunteers"
                      multiline
                      minRows={3}
                      fullWidth
                      sx={{
                        gridColumn: { xs: "1 / -1", md: "1 / -1" },
                        "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: PARTY_THEME.red,
                          borderWidth: "2px",
                        },
                      }}
                    />
                  </Box>

                  <Box sx={{ border: `1px dashed ${PARTY_THEME.border}`, borderRadius: "14px", p: 2, background: "#FAFAFA" }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }}>
                      <Stack direction="row" spacing={1.25} alignItems="center" style={{ flex: 1 }}>
                        <Paperclip size={18} />
                        <Box>
                          <Typography sx={{ fontWeight: 900, color: PARTY_THEME.black }}>Receipt Attachment</Typography>
                          <Typography sx={{ color: PARTY_THEME.muted, fontWeight: 600 }} variant="body2">
                            JPG, PNG or PDF • Max 5MB
                          </Typography>
                        </Box>
                      </Stack>

                      <Button
                        component="label"
                        variant="outlined"
                        sx={{
                          borderRadius: "12px",
                          fontWeight: 900,
                          textTransform: "none",
                          borderColor: "#CBD5E1",
                          color: PARTY_THEME.black,
                          "&:hover": { backgroundColor: "#F8FAFC" },
                        }}
                      >
                        Choose File
                        <input
                          hidden
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => setNewExpense({ ...newExpense, receipt: e.target.files?.[0] || null })}
                        />
                      </Button>
                    </Stack>

                    {newExpense.receipt && (
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                        <Chip
                          label={`${newExpense.receipt.name} • ${(newExpense.receipt.size / 1024 / 1024).toFixed(2)}MB`}
                          sx={{ borderRadius: "999px", fontWeight: 800 }}
                        />
                        <IconButton
                          onClick={() => setNewExpense({ ...newExpense, receipt: null })}
                          size="small"
                          sx={{ border: "1px solid #CBD5E1", borderRadius: "10px" }}
                        >
                          <X size={16} />
                        </IconButton>
                      </Stack>
                    )}
                  </Box>

                  <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ pt: 1 }}>
                    <Button
                      onClick={() => {
                        setIsAddModalOpen(false);
                        resetAddForm();
                      }}
                      variant="outlined"
                      sx={{
                        borderRadius: "12px",
                        fontWeight: 900,
                        textTransform: "none",
                        borderColor: "#CBD5E1",
                        color: PARTY_THEME.black,
                        "&:hover": { backgroundColor: "#F8FAFC" },
                      }}
                    >
                      Cancel
                    </Button>

                    <Button
                      variant="contained"
                      onClick={handleSubmitExpense}
                      disabled={!can.create}
                      sx={{
                        borderRadius: "12px",
                        fontWeight: 900,
                        textTransform: "none",
                        background: `linear-gradient(90deg, ${PARTY_THEME.red} 0%, ${PARTY_THEME.redDark} 100%)`,
                        "&:hover": { background: `linear-gradient(90deg, ${PARTY_THEME.redDark} 0%, ${PARTY_THEME.red} 100%)` },
                      }}
                    >
                      Submit Expense
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        {/* RECEIPT PREVIEW */}
        <Dialog open={!!receiptView} onClose={() => setReceiptView(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 900, color: PARTY_THEME.black }}>Receipt Preview</DialogTitle>
          <DialogContent dividers>
            {selectedExpense && (
              <div
                className="mb-6 p-4 rounded-2xl text-sm"
                style={{ background: "rgba(255,45,45,0.06)", border: `1px solid ${PARTY_THEME.border}` }}
              >
                <p className="mb-1">
                  <strong>Date:</strong> {selectedExpense.date}
                </p>
                <p className="mb-1">
                  <strong>Submitted By:</strong> {selectedExpense.submitted_by}
                </p>
                <p className="mb-1">
                  <strong>Payment Method:</strong> {selectedExpense.payment_method}
                </p>
                <p>
                  <strong>Status:</strong> {selectedExpense.status}
                </p>
              </div>
            )}

            {receiptView?.url?.toLowerCase().includes(".pdf") ? (
              <iframe
                src={receiptView.url}
                title="Receipt PDF"
                width="100%"
                height="520px"
                className="rounded-2xl border"
                style={{ borderColor: PARTY_THEME.border }}
              />
            ) : (
              <img
                src={receiptView?.url || ""}
                alt="Receipt"
                className="w-full h-auto rounded-2xl border"
                style={{ borderColor: PARTY_THEME.border }}
                onError={(e) => {
                  e.currentTarget.src = "https://placehold.co/600x400/cccccc/000000?text=Image+Not+Found";
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ExpenseLedgerPage;
