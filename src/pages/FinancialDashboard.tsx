import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import {
  Alert,
  Snackbar,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  IconButton,
} from "@mui/material";
import type { AlertColor } from "@mui/material";
import {
  Banknote,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  Wallet,
  Users,
  FolderOpen,
  MoveRight,
  FileCheck,
  LineChart,
  CircleDollarSign,
  PlusCircle,
  DollarSign,
  CheckCircle,
  X,
  BellRing,
  Clock,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";

// ---- Permission constant for this page ----
const FINANCE_DASHBOARD_PERMISSION = "finance.dashboard.view";

// --- Interfaces ---
interface Stats {
  total_donors: number;
  total_spent: number;
  approved_expenses: number;
  pending_expenses: number;
  vendors: number;

  // Keeping this key to avoid breaking your stats API.
  // Even though the module is renamed to "Agent Payments".
  emergency_funds: number;

  total_allocations: number;
  audits_triggered: number;
  vendor_payments: number;
  budget_variance: number;
  funds_remaining: number;
  overdue_payments: number;
}

interface StatBlock {
  title: string;
  path: string;
  icon: JSX.Element;
  statKey: keyof Stats;
  colorClass: string;
  description: string;
  type?: "currency" | "number" | "percentage";
}

interface FinanceModule extends StatBlock {
  requiredPermission?: string; // 🔑 per-module permission
}

interface QuickActionFormProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface OverviewCardProps {
  title: string;
  value: number;
  colorClass: string;
  type: "currency" | "number";
  variance?: number;
  max?: number;
}

interface QuickActionCardProps {
  title: string;
  icon: JSX.Element;
  onClick?: () => void;
  path?: string;
  colorClass: string;
}

// Shared MUI input styling so it’s easy to theme
const inputSx = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "rgba(148, 163, 184, 0.8)" }, // slate-400
    "&:hover fieldset": { borderColor: "rgb(59, 130, 246)" }, // blue-500
    "&.Mui-focused fieldset": { borderColor: "rgb(37, 99, 235)" }, // blue-600
  },
  "& .MuiInputLabel-root": { color: "rgba(148, 163, 184, 1)" },
  "& .MuiInputBase-input": { color: "rgb(15, 23, 42)" },
};

// --- Main Financial Modules (each can have its own permission) ---
const financeModules: FinanceModule[] = [
  {
    title: "Donors & Income",
    path: "/finance/donors",
    icon: <Users size={24} />,
    statKey: "total_donors",
    colorClass: "from-blue-600 to-blue-400",
    description: "Manage funds & contributors.",
    type: "number",
    requiredPermission: "finance.donors.view",
  },
  {
    title: "Expense Ledger",
    path: "/finance/expenses",
    icon: <FileText size={24} />,
    statKey: "total_spent",
    colorClass: "from-red-600 to-red-400",
    description: "All expenses, receipts & details.",
    type: "currency",
    requiredPermission: "finance.expenses.view",
  },
  {
    title: "Approved Payments",
    path: "/finance/approved-expenses",
    icon: <FileCheck size={24} />,
    statKey: "approved_expenses",
    colorClass: "from-emerald-600 to-emerald-400",
    description: "Payments cleared for disbursement.",
    type: "number",
    requiredPermission: "finance.approved_expenses.view",
  },
  {
    title: "Pending Requests",
    path: "/finance/pending-expenses",
    icon: <MoveRight size={24} />,
    statKey: "pending_expenses",
    colorClass: "from-amber-600 to-amber-400",
    description: "Requests awaiting approval.",
    type: "number",
    requiredPermission: "finance.pending_expenses.view",
  },
  {
    title: "Registered Vendors",
    path: "/finance/vendors",
    icon: <FolderOpen size={24} />,
    statKey: "vendors",
    colorClass: "from-indigo-600 to-indigo-400",
    description: "Manage all service providers.",
    type: "number",
    requiredPermission: "finance.vendors.view",
  },
  {
    title: "Vendor Payments",
    path: "/finance/vendor-payments",
    icon: <Banknote size={24} />,
    statKey: "vendor_payments",
    colorClass: "from-teal-600 to-teal-400",
    description: "Track vendor payments.",
    type: "number",
    requiredPermission: "finance.vendor_payments.view",
  },
  {
    title: "Agent Payments",
    path: "/finance/agent-payments",
    icon: <ShieldCheck size={24} />,
    statKey: "emergency_funds", // keep backend statKey unchanged unless you also update API response
    colorClass: "from-purple-600 to-purple-400",
    description: "Allocate and track agent funds.",
    type: "number",
    requiredPermission: "finance.agent_payments.view",
  },
  {
    title: "Budget Allocations",
    path: "/finance/budget-allocations",
    icon: <CircleDollarSign size={24} />,
    statKey: "total_allocations",
    colorClass: "from-lime-600 to-lime-400",
    description: "Funds by region & candidate.",
    type: "number",
    requiredPermission: "finance.budget_allocations.view",
  },
  {
    title: "Audit Triggers",
    path: "/finance/audits",
    icon: <Wallet size={24} />,
    statKey: "audits_triggered",
    colorClass: "from-slate-700 to-slate-500",
    description: "Transactions flagged for review.",
    type: "number",
    requiredPermission: "finance.audits.view",
  },
];

// ==========================
// Premium UI helpers (command-center shell)
// ==========================
const formatKES = (n: number) =>
  `KES ${Number(n || 0).toLocaleString("en-KE")}`;

const Chip: React.FC<{
  label: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}> = ({ label, tone = "neutral" }) => {
  const tones = {
    good: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    warn: "bg-amber-500/15 text-amber-300 border-amber-500/20",
    bad: "bg-rose-500/15 text-rose-300 border-rose-500/20",
    neutral: "bg-white/10 text-slate-200 border-white/15",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
};

const GlassCard: React.FC<{
  title?: string;
  icon?: JSX.Element;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, children, className }) => (
  <div
    className={`rounded-2xl border border-white/10 bg-white/70 dark:bg-slate-900/55 backdrop-blur-xl shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)] ${className || ""
      }`}
  >
    {(title || icon) && (
      <div className="flex items-center gap-2 px-6 pt-6">
        {icon}
        {title && (
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h2>
        )}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const KPIBar: React.FC<{
  items: Array<{
    label: string;
    value: string;
    hint?: string;
    tone?: "good" | "warn" | "bad" | "neutral";
  }>;
}> = ({ items }) => (
  <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/70 dark:bg-slate-900/55 backdrop-blur-xl">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((k, i) => (
        <div
          key={i}
          className="px-5 py-4 border-b sm:border-b-0 sm:border-r border-white/10 last:border-r-0"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {k.label}
            </p>
            {k.tone && (
              <Chip
                label={
                  k.tone === "good"
                    ? "Healthy"
                    : k.tone === "warn"
                      ? "Attention"
                      : k.tone === "bad"
                        ? "Risk"
                        : "Info"
                }
                tone={k.tone}
              />
            )}
          </div>
          <p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
            {k.value}
          </p>
          {k.hint && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {k.hint}
            </p>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ==========================
// Small Presentational Components
// ==========================
const FinancialOverviewSkeleton: React.FC = () => (
  <div className="p-6 bg-slate-100 dark:bg-slate-700 rounded-lg shadow-sm animate-pulse flex flex-col justify-between h-full">
    <div className="h-5 bg-slate-300 dark:bg-slate-600 rounded w-2/3 mb-2" />
    <div className="h-10 bg-slate-300 dark:bg-slate-600 rounded w-4/5 mb-4" />
    <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2.5 mt-auto" />
  </div>
);

const OverviewCard: React.FC<OverviewCardProps> = ({
  title,
  value,
  colorClass,
  type,
  variance,
  max,
}) => {
  const isVariance = typeof variance === "number";
  const valueColorClass = isVariance
    ? variance < 0
      ? "text-red-100"
      : "text-emerald-100"
    : "text-white";

  const progress =
    max && value ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <motion.div
      className={`relative flex flex-col justify-between rounded-xl shadow-md overflow-hidden p-5 sm:p-6 text-white bg-gradient-to-br ${colorClass} h-36 transition-all duration-300`}
      whileHover={{ scale: 1.01, boxShadow: "0 12px 24px -8px rgba(0,0,0,0.3)" }}
    >
      <h4 className="text-sm sm:text-base font-medium opacity-90 leading-tight">
        {title}
      </h4>
      <div className="text-2xl sm:text-3xl font-extrabold flex-grow flex items-center">
        {isVariance ? (
          <span className={valueColorClass}>
            {variance === 0 ? (
              "KES 0"
            ) : (
              <CountUp
                end={variance}
                duration={1.5}
                separator=","
                prefix="KES "
              />
            )}
          </span>
        ) : (
          <CountUp
            end={value}
            duration={1.5}
            separator=","
            prefix={type === "currency" ? "KES " : ""}
          />
        )}
      </div>
      {max !== undefined && (
        <div className="w-full bg-white bg-opacity-30 rounded-full h-1.5 mt-2">
          <motion.div
            className="h-full rounded-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      )}
    </motion.div>
  );
};

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  icon,
  onClick,
  path,
  colorClass,
}) => {
  const content = (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 10px 20px -8px rgba(0,0,0,0.3)" }}
      whileTap={{ scale: 0.97 }}
      className={`rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer 
                  flex items-center gap-3 px-4 py-3 text-sm font-medium ${colorClass}`}
      onClick={onClick}
    >
      {React.cloneElement(icon, { size: 20 })}
      <span className="text-left leading-snug">{title}</span>
    </motion.div>
  );

  if (path) {
    return (
      <Link to={path} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

// ==========================
// Quick Action Forms
// ==========================
const AddIncomeForm: React.FC<QuickActionFormProps> = ({
  onClose,
  onSuccess,
  onError,
}) => {
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [contact, setContact] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearForm = () => {
    setDonorName("");
    setAmount("");
    setPaymentMethod("");
    setContact("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const API_URL =
    import.meta.env.VITE_ADD_DONOR_URL ??
    "https://skizagroundsuite.com/API/add_donor.php";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: donorName,
          contact: contact,
          amount: parseFloat(amount),
          method: paymentMethod,
          date: date,
        }),
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        onSuccess(
          result.message ||
          `KES ${amount} from ${donorName || "anonymous"} registered successfully!`
        );
        clearForm();
        onClose();
      } else {
        onError(result.message || "Failed to register income. Please try again.");
      }
    } catch (error) {
      console.error("Error during API call:", error);
      onError(
        "Network error or server unreachable. Please check your server and network."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-5 text-slate-900 dark:text-slate-50">
        Register New Income
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Donor Name"
          variant="outlined"
          fullWidth
          value={donorName}
          onChange={(e) => setDonorName(e.target.value)}
          required
          color="primary"
          sx={inputSx}
        />
        <TextField
          label="Contact (Optional)"
          variant="outlined"
          fullWidth
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          color="primary"
          sx={inputSx}
        />
        <TextField
          label="Amount (KES)"
          variant="outlined"
          fullWidth
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          color="primary"
          sx={inputSx}
        />
        <TextField
          label="Date"
          variant="outlined"
          fullWidth
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          InputLabelProps={{ shrink: true }}
          color="primary"
          sx={inputSx}
        />
        <FormControl fullWidth variant="outlined" color="primary" sx={inputSx}>
          <InputLabel id="payment-method-label">Payment Method</InputLabel>
          <Select
            labelId="payment-method-label"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as string)}
            label="Payment Method"
            required
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            <MenuItem value="M-Pesa">M-Pesa</MenuItem>
            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
            <MenuItem value="Online Gateway">Online Gateway</MenuItem>
          </Select>
        </FormControl>
        <div className="flex justify-end gap-3">
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={isSubmitting}
            className="!text-slate-600 dark:!text-slate-300 !border-slate-300 dark:!border-slate-600"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <CircularProgress size={20} color="inherit" className="!mr-2" />{" "}
                Registering...
              </span>
            ) : (
              "Register Income"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

const RecordExpenseForm: React.FC<QuickActionFormProps> = ({
  onClose,
  onSuccess,
  onError,
}) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearForm = () => {
    setRecipient("");
    setAmount("");
    setCategory("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const amountNum = parseFloat(amount);
    if (!category || isNaN(amountNum) || amountNum <= 0) {
      onError("Please enter a valid amount (> 0) and select a category.");
      setIsSubmitting(false);
      return;
    }

    // TODO: wire to API
    console.log({ recipient, amount, category, description, date });
    setTimeout(() => {
      onSuccess(`KES ${amount} expense for '${category}' recorded.`);
      clearForm();
      onClose();
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-md max-h-[calc(100vh-100px)] overflow-y-auto">
      <h3 className="text-xl font-semibold mb-5 text-slate-900 dark:text-slate-50">
        Record New Expense
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Recipient/Vendor"
          variant="outlined"
          fullWidth
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          color="primary"
          sx={inputSx}
        />
        <TextField
          label="Amount (KES)"
          variant="outlined"
          fullWidth
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          color="primary"
          sx={inputSx}
        />
        <TextField
          label="Date"
          variant="outlined"
          fullWidth
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          InputLabelProps={{ shrink: true }}
          color="primary"
          sx={inputSx}
        />
        <FormControl fullWidth variant="outlined" color="primary" sx={inputSx}>
          <InputLabel id="category-label">Category</InputLabel>
          <Select
            labelId="category-label"
            value={category}
            onChange={(e) => setCategory(e.target.value as string)}
            label="Category"
            required
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            <MenuItem value="Logistics">Logistics</MenuItem>
            <MenuItem value="Staff Salaries">Staff Salaries</MenuItem>
            <MenuItem value="Campaign Materials">Campaign Materials</MenuItem>
            <MenuItem value="Travel">Travel</MenuItem>
            <MenuItem value="Office Supplies">Office Supplies</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Description"
          variant="outlined"
          fullWidth
          multiline
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          color="primary"
          sx={inputSx}
        />
        <div className="flex justify-end gap-3">
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={isSubmitting}
            className="!text-slate-600 dark:!text-slate-300 !border-slate-300 dark:!border-slate-600"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            className="!bg-sky-600 hover:!bg-sky-700 !text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <CircularProgress size={20} color="inherit" className="!mr-2" />{" "}
                Recording...
              </span>
            ) : (
              "Record Expense"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

// ==========================
// Main FinancialDashboard Component
// ==========================
const FinancialDashboard: React.FC = () => {
  const { hasPermission, user } = useUser();

  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // error + access control states
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  // Quick action UI state
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [leftDrawerContent, setLeftDrawerContent] =
    useState<"income" | null>(null);

  const [isBottomLeftModalOpen, setIsBottomLeftModalOpen] = useState(false);
  const [bottomLeftModalContent, setBottomLeftModalContent] =
    useState<"expense" | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const isSuperAdmin =
    user &&
    user.role &&
    String(user.role).toUpperCase() === "SUPER_ADMIN";

  // 🔐 Per-module visible list
  const visibleFinanceModules = useMemo(() => {
    if (!financeModules.length || typeof hasPermission !== "function") {
      return [];
    }

    if (isSuperAdmin) return financeModules;

    return financeModules.filter((module) => {
      if (!module.requiredPermission) return true;
      return hasPermission(module.requiredPermission);
    });
  }, [user, hasPermission, isSuperAdmin]);

  useEffect(() => {
    const fetchStats = async () => {
      // 1) Page-level permission guard
      if (typeof hasPermission === "function") {
        const allowed = hasPermission(FINANCE_DASHBOARD_PERMISSION);
        if (!allowed) {
          setAccessDenied(true);
          setAccessMessage(
            "You do not have permission to view the Financial Dashboard. Contact your administrator to request finance access."
          );
          setIsLoading(false);
          return;
        }
      }

      try {
        setIsLoading(true);
        setError(null);
        setAccessDenied(false);
        setAccessMessage(null);

        const token = localStorage.getItem("token");

        const res = await fetch("/API/finance-dashboard-stats.php", {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        });

        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        // 2) Backend guard
        if (res.status === 401 || res.status === 403) {
          setAccessDenied(true);
          setAccessMessage(data.message || null);
          setIsLoading(false);
          return;
        }

        if (!res.ok || !data.success) {
          setError(data.message || "Failed to load financial dashboard data.");
          setIsLoading(false);
          return;
        }

        setStats(data.data as Stats);
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load financial dashboard data.");
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [hasPermission]);

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const openQuickAction = (actionType: "income" | "expense") => {
    if (actionType === "income") {
      setLeftDrawerContent("income");
      setIsLeftDrawerOpen(true);
      setIsBottomLeftModalOpen(false);
    } else {
      setBottomLeftModalContent("expense");
      setIsBottomLeftModalOpen(true);
      setIsLeftDrawerOpen(false);
    }
  };

  const handleFormSuccess = (message: string) => {
    setSnackbar({ open: true, message: message, severity: "success" });
  };

  const handleFormError = (message: string) => {
    setSnackbar({ open: true, message: message, severity: "error" });
  };

  // ============ Access / Error Views ============
  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold mb-2 text-red-600 dark:text-red-400">
            Access denied
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {accessMessage ||
              "You do not have permission to view the Financial Dashboard. Contact your administrator to request finance access."}
          </p>
        </div>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold mb-2 text-red-600 dark:text-red-400">
            Error
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  // If page allowed but user has no modules assigned
  if (!isLoading && visibleFinanceModules.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-red-600 mb-2">
          No finance modules assigned
        </h1>
        <p className="text-slate-700 dark:text-slate-300">
          You’re allowed to open the Finance Dashboard, but no specific finance
          modules have been assigned to your account yet. Contact your
          administrator.
        </p>
      </div>
    );
  }

  // ============ Command-center dashboard view ============
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-200">
      {/* Premium gradient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -top-24 right-0 h-[520px] w-[520px] rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent dark:via-slate-950/40" />
      </div>

      <div className="relative container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Financial Command Center
              </h1>
              <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl">
                Real-time oversight of income, spending, risk, approvals, vendors, and compliance.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Chip label="Realtime" tone="neutral" />
              <Chip
                label={
                  (stats?.audits_triggered || 0) > 0 ||
                    (stats?.overdue_payments || 0) > 0
                    ? "Needs Attention"
                    : "All Clear"
                }
                tone={
                  (stats?.overdue_payments || 0) > 0
                    ? "bad"
                    : (stats?.audits_triggered || 0) > 0
                      ? "warn"
                      : "good"
                }
              />
            </div>
          </div>
        </header>

        {/* KPI Ribbon */}
        <div className="mb-8">
          <KPIBar
            items={[
              {
                label: "Funds Under Management",
                value: formatKES(stats?.funds_remaining || 0),
                hint: "Available balance now",
                tone: "neutral",
              },
              {
                label: "Committed Expenses",
                value: formatKES(stats?.total_spent || 0),
                hint: "Recorded spend",
                tone: (stats?.total_spent || 0) > 0 ? "warn" : "neutral",
              },
              {
                label: "Available to Spend",
                value: formatKES(stats?.funds_remaining || 0),
                hint: "Uncommitted funds",
                tone: "good",
              },
              {
                label: "Outstanding Approvals",
                value: `${stats?.pending_expenses || 0}`,
                hint: "Pending review",
                tone: (stats?.pending_expenses || 0) > 0 ? "warn" : "good",
              },
              {
                label: "Audit Risk",
                value: (stats?.audits_triggered || 0) > 0 ? "Medium" : "Low",
                hint: `${stats?.audits_triggered || 0} flagged`,
                tone: (stats?.audits_triggered || 0) > 0 ? "warn" : "good",
              },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main content */}
          <main className="lg:col-span-3 space-y-8">
            <GlassCard
              title="Executive Financial Summary"
              icon={<LineChart size={20} className="text-emerald-500" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <FinancialOverviewSkeleton key={i} />
                  ))
                ) : (
                  <>
                    <OverviewCard
                      title="Total Income"
                      value={
                        stats?.total_donors || 0 /* TODO: replace with total_income when API supports */
                      }
                      colorClass="from-emerald-600 to-emerald-500"
                      type="currency"
                      max={3000000}
                    />
                    <OverviewCard
                      title="Total Expenses"
                      value={stats?.total_spent || 0}
                      colorClass="from-rose-600 to-rose-500"
                      type="currency"
                      max={2800000}
                    />
                    <OverviewCard
                      title="Funds Available"
                      value={stats?.funds_remaining || 0}
                      colorClass="from-sky-600 to-sky-500"
                      type="currency"
                      max={500000}
                    />
                    <OverviewCard
                      title="Budget Variance"
                      value={0}
                      variance={stats?.budget_variance || 0}
                      colorClass="from-violet-600 to-violet-500"
                      type="currency"
                    />
                  </>
                )}
              </div>
            </GlassCard>

            {/* Action Required + Overview */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <GlassCard
                className="xl:col-span-1"
                title="Action Required"
                icon={<BellRing size={18} className="text-amber-500" />}
              >
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-700/40 animate-pulse" />
                    <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-700/40 animate-pulse" />
                    <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-700/40 animate-pulse" />
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/60 dark:bg-slate-900/35 p-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
                        <X size={16} />
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold">Overdue payments</p>
                        <p className="text-slate-600 dark:text-slate-400">
                          {stats?.overdue_payments || 0} vendor payment(s) past due.
                        </p>
                      </div>
                      <Link
                        to="/finance/vendor-payments"
                        className="text-slate-900 dark:text-white underline underline-offset-4"
                      >
                        Resolve
                      </Link>
                    </div>

                    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/60 dark:bg-slate-900/35 p-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                        <Clock size={16} />
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold">Pending approvals</p>
                        <p className="text-slate-600 dark:text-slate-400">
                          {stats?.pending_expenses || 0} request(s) awaiting review.
                        </p>
                      </div>
                      <Link
                        to="/finance/pending-expenses"
                        className="text-slate-900 dark:text-white underline underline-offset-4"
                      >
                        Review
                      </Link>
                    </div>

                    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/60 dark:bg-slate-900/35 p-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/15 text-sky-400">
                        <ShieldCheck size={16} />
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold">Audit alerts</p>
                        <p className="text-slate-600 dark:text-slate-400">
                          {stats?.audits_triggered || 0} transaction(s) flagged.
                        </p>
                      </div>
                      <Link
                        to="/finance/audits"
                        className="text-slate-900 dark:text-white underline underline-offset-4"
                      >
                        Investigate
                      </Link>
                    </div>
                  </div>
                )}
              </GlassCard>

              <GlassCard
                className="xl:col-span-2"
                title="Financial Overview"
                icon={<CircleDollarSign size={18} className="text-sky-500" />}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-white/10 bg-white/60 dark:bg-slate-900/35 p-5">
                    <p className="text-sm font-semibold">Allocations</p>
                    <p className="mt-2 text-2xl font-extrabold">
                      {formatKES(stats?.total_allocations || 0)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Total allocations (by region/candidate)
                    </p>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>Registered Vendors</span>
                        <span className="font-semibold">{stats?.vendors || 0}</span>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>Vendor Payments</span>
                        <span className="font-semibold">
                          {stats?.vendor_payments || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>Approved Payments</span>
                        <span className="font-semibold">
                          {stats?.approved_expenses || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/60 dark:bg-slate-900/35 p-5">
                    <p className="text-sm font-semibold">Spend Health</p>
                    <p className="mt-2 text-2xl font-extrabold">
                      {formatKES(stats?.total_spent || 0)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Total recorded spend
                    </p>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 dark:text-slate-300">
                          Budget variance
                        </span>
                        <span className="font-semibold">
                          {formatKES(stats?.budget_variance || 0)}
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-700/50">
                        <div
                          className="h-2 rounded-full bg-sky-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                5,
                                (Math.abs(stats?.budget_variance || 0) / 1000000) *
                                100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Modules */}
            <GlassCard
              title="Key Financial Modules"
              icon={<FolderOpen size={20} className="text-indigo-500" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {visibleFinanceModules.map((module, index) => (
                  <Link
                    to={module.path}
                    key={`${module.title}-${index}`}
                    className="block w-full h-full"
                  >
                    <motion.div
                      className={`relative rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between h-full
                        bg-gradient-to-br ${module.colorClass} text-white transition-all duration-300`}
                      whileHover={{
                        scale: 1.02,
                        boxShadow: "0 18px 34px -18px rgba(0,0,0,0.55)",
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {React.cloneElement(module.icon, {
                          size: 24,
                          className: "text-white",
                        })}
                        <h3 className="text-lg font-semibold leading-tight">
                          {module.title}
                        </h3>
                      </div>
                      <p className="text-sm opacity-90 mb-4 flex-grow">
                        {module.description}
                      </p>
                      <div className="flex items-center justify-between text-lg font-bold">
                        {isLoading ? (
                          <div className="h-6 bg-white/30 rounded w-1/2 animate-pulse" />
                        ) : (
                          <span>
                            {module.type === "currency" ? "KES " : ""}
                            <CountUp
                              end={(stats?.[module.statKey] as number) || 0}
                              duration={1.5}
                              separator=","
                            />
                          </span>
                        )}
                        <ArrowUpRight size={18} className="text-white/80" />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </GlassCard>
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <GlassCard title="Quick Actions">
              <div className="space-y-3">
                <QuickActionCard
                  title="Add donor / income"
                  icon={<DollarSign />}
                  onClick={() => openQuickAction("income")}
                  colorClass="bg-emerald-50/80 dark:bg-emerald-900/35 text-emerald-800 dark:text-emerald-100"
                />
                <QuickActionCard
                  title="Record expense"
                  icon={<PlusCircle />}
                  onClick={() => openQuickAction("expense")}
                  colorClass="bg-sky-50/80 dark:bg-sky-900/35 text-sky-800 dark:text-sky-100"
                />
                <QuickActionCard
                  title="Approve pending payments"
                  icon={<CheckCircle />}
                  path="/finance/pending-expenses"
                  colorClass="bg-violet-50/80 dark:bg-violet-900/35 text-violet-800 dark:text-violet-100"
                />
                <QuickActionCard
                  title="View all expenses"
                  icon={<FileText />}
                  path="/finance/expenses"
                  colorClass="bg-slate-50/80 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100"
                />
              </div>
            </GlassCard>

            {/* Keep your original alert logic but in glass */}
            <GlassCard
              title="Critical Alerts"
              icon={<BellRing size={18} className="text-orange-500" />}
            >
              <div className="space-y-4">
                {isLoading ? (
                  <>
                    <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                    <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                  </>
                ) : (
                  <>
                    {stats?.pending_expenses && stats.pending_expenses > 0 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 100,
                          delay: 0.05,
                        }}
                        className="p-3 bg-amber-50 dark:bg-amber-900/40 border-l-4 border-amber-500 rounded-lg text-amber-900 dark:text-amber-50 text-sm flex items-start gap-3"
                      >
                        <Clock size={18} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold">Pending approvals</h3>
                          <p>
                            {stats.pending_expenses} expense request
                            {stats.pending_expenses > 1 ? "s" : ""} awaiting
                            review.{" "}
                            <Link
                              to="/finance/pending-expenses"
                              className="font-medium underline underline-offset-2"
                            >
                              Review
                            </Link>
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {stats?.overdue_payments && stats.overdue_payments > 0 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 100,
                          delay: 0.1,
                        }}
                        className="p-3 bg-rose-50 dark:bg-rose-900/40 border-l-4 border-rose-500 rounded-lg text-rose-900 dark:text-rose-50 text-sm flex items-start gap-3"
                      >
                        <X size={18} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold">Overdue payments</h3>
                          <p>
                            {stats.overdue_payments} vendor payment
                            {stats.overdue_payments > 1 ? "s" : ""} past due.{" "}
                            <Link
                              to="/finance/vendor-payments"
                              className="font-medium underline underline-offset-2"
                            >
                              Resolve
                            </Link>
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {stats?.audits_triggered && stats.audits_triggered > 0 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 100,
                          delay: 0.15,
                        }}
                        className="p-3 bg-sky-50 dark:bg-sky-900/40 border-l-4 border-sky-500 rounded-lg text-sky-900 dark:text-sky-50 text-sm flex items-start gap-3"
                      >
                        <ShieldCheck size={18} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold">Audit alerts</h3>
                          <p>
                            {stats.audits_triggered} transaction
                            {stats.audits_triggered > 1 ? "s" : ""} flagged for
                            review.{" "}
                            <Link
                              to="/finance/audits"
                              className="font-medium underline underline-offset-2"
                            >
                              Investigate
                            </Link>
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {stats?.pending_expenses === 0 &&
                      stats?.overdue_payments === 0 &&
                      stats?.audits_triggered === 0 && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/40 border-l-4 border-emerald-500 rounded-lg text-emerald-900 dark:text-emerald-50 text-sm flex items-start gap-3">
                          <CheckCircle
                            size={18}
                            className="flex-shrink-0 mt-0.5"
                          />
                          <div>
                            <h3 className="font-semibold">All clear</h3>
                            <p>No critical financial alerts at the moment.</p>
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>
            </GlassCard>
          </aside>
        </div>

        {/* Overlays for Quick Action Forms */}
        <AnimatePresence>
          {isLeftDrawerOpen && leftDrawerContent === "income" && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl z-50 p-6 overflow-y-auto"
            >
              <IconButton
                onClick={() => {
                  setIsLeftDrawerOpen(false);
                  setLeftDrawerContent(null);
                }}
                className="absolute top-4 right-4 text-slate-500 dark:text-slate-300"
              >
                <X size={24} />
              </IconButton>
              <AddIncomeForm
                onSuccess={handleFormSuccess}
                onError={handleFormError}
                onClose={() => {
                  setIsLeftDrawerOpen(false);
                  setLeftDrawerContent(null);
                }}
              />
            </motion.div>
          )}

          {isBottomLeftModalOpen && bottomLeftModalContent === "expense" && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed bottom-0 left-0 w-full sm:w-1/2 md:w-2/5 lg:w-1/3 bg-white dark:bg-slate-900 shadow-2xl z-50 rounded-t-2xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <IconButton
                onClick={() => {
                  setIsBottomLeftModalOpen(false);
                  setBottomLeftModalContent(null);
                }}
                className="absolute top-4 right-4 text-slate-500 dark:text-slate-300"
              >
                <X size={24} />
              </IconButton>
              <RecordExpenseForm
                onSuccess={handleFormSuccess}
                onError={handleFormError}
                onClose={() => {
                  setIsBottomLeftModalOpen(false);
                  setBottomLeftModalContent(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: "100%", borderRadius: "8px" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </div>
  );
};

export default FinancialDashboard;
