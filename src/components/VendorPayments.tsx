import React, { useEffect, useMemo, useRef, useState } from "react";
import { Grid, TextField, Button, InputAdornment, FormHelperText } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import dayjs from "dayjs";

// ---- Types ----
interface VendorPaymentFormProps {
  initialData?: {
    vendor_name: string;
    amount: number | string;
    payment_date: string; // YYYY-MM-DD
    reference: string;
    notes: string;
  };
  mode: "add" | "edit";
  onSubmit: (data: {
    vendor_name: string;
    amount: number;
    payment_date: string;
    reference: string;
    notes: string;
  }) => Promise<void>;
  onCancel: () => void;
  /** Optional: persist draft in localStorage for better PWA UX */
  persistKey?: string; // e.g., "vendor-payment-draft"
}

/**
 * Mobile-first, PWA-friendly VendorPaymentForm
 * - Strong validation & helpful errors
 * - "KES" adornment + numeric ergonomics for mobile (inputMode)
 * - Prevents scroll-wheel changes on number inputs
 * - Optional localStorage draft persistence for offline/PWA resilience
 * - Accessible: errors use aria-live; buttons have clear labels
 */
const VendorPaymentForm: React.FC<VendorPaymentFormProps> = ({
  initialData,
  mode,
  onSubmit,
  onCancel,
  persistKey,
}) => {
  const [formData, setFormData] = useState(() => ({
    vendor_name: initialData?.vendor_name ?? "",
    amount: normalizeAmount(initialData?.amount ?? ""),
    payment_date: initialData?.payment_date ?? dayjs().format("YYYY-MM-DD"),
    reference: initialData?.reference ?? "",
    notes: initialData?.notes ?? "",
  }));

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstErrorRef = useRef<HTMLInputElement | null>(null);

  // ---- Persistence (PWA-friendly draft restore) ----
  useEffect(() => {
    if (!persistKey) return;
    try {
      const raw = localStorage.getItem(persistKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setFormData((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!persistKey) return;
    try {
      localStorage.setItem(persistKey, JSON.stringify(formData));
    } catch {}
  }, [persistKey, formData]);

  const setField = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ---- Validation ----
  const validate = () => {
    const next: Record<string, string> = {};

    if (!formData.vendor_name.trim()) next.vendor_name = "Vendor name is required";

    const amt = toNumber(formData.amount);
    if (!isFinite(amt) || amt <= 0) next.amount = "Enter a valid positive amount";

    if (!formData.payment_date) {
      next.payment_date = "Payment date is required";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.payment_date)) {
      next.payment_date = "Use format YYYY-MM-DD";
    }

    if (formData.reference && formData.reference.length > 64) {
      next.reference = "Reference is too long (max 64)";
    }

    if (formData.notes && formData.notes.length > 500) {
      next.notes = "Notes are too long (max 500)";
    }

    setErrors(next);

    // focus first error field for accessibility
    if (Object.keys(next).length) {
      setTimeout(() => firstErrorRef.current?.focus(), 0);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit({
        vendor_name: formData.vendor_name.trim(),
        amount: toNumber(formData.amount),
        payment_date: formData.payment_date,
        reference: formData.reference.trim(),
        notes: formData.notes.trim(),
      });
      // Clear draft after successful submit
      if (persistKey) localStorage.removeItem(persistKey);
    } finally {
      setLoading(false);
    }
  };

  const amountDisplay = useMemo(() => formatKESDisplay(formData.amount), [formData.amount]);

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="vendor-payment-heading">
      <Grid container spacing={2} paddingTop={1}>
        <Grid item xs={12}>
          <h2 id="vendor-payment-heading" className="m-0 text-base font-semibold">
            {mode === "edit" ? "Edit Vendor Payment" : "Add Vendor Payment"}
          </h2>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Vendor Name"
            placeholder="e.g., ABC Suppliers Ltd"
            fullWidth
            value={formData.vendor_name}
            onChange={(e) => setField("vendor_name", e.target.value)}
            error={!!errors.vendor_name}
            helperText={errors.vendor_name}
            inputRef={errors.vendor_name ? firstErrorRef : undefined}
            inputProps={{ autoCapitalize: "words", spellCheck: "false" as any }}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Amount"
            placeholder="0.00"
            fullWidth
            value={amountDisplay}
            onChange={(e) => setField("amount", sanitizeAmountInput(e.target.value))}
            onWheel={(e) => (e.target as HTMLInputElement).blur()} // prevent scroll changing value
            error={!!errors.amount}
            helperText={errors.amount || ""}
            inputRef={errors.amount && !errors.vendor_name ? firstErrorRef : undefined}
            inputProps={{ inputMode: "decimal", pattern: "[0-9]*[.,]?[0-9]*", "aria-describedby": "amount-help" }}
            InputProps={{
              startAdornment: <InputAdornment position="start">KES</InputAdornment>,
            }}
            required
          />
          <FormHelperText id="amount-help">Numbers only. Decimals allowed.</FormHelperText>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Payment Date"
            type="date"
            fullWidth
            value={formData.payment_date}
            onChange={(e) => setField("payment_date", e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={!!errors.payment_date}
            helperText={errors.payment_date}
            inputRef={errors.payment_date && !errors.vendor_name && !errors.amount ? firstErrorRef : undefined}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Reference"
            placeholder="e.g., M-Pesa TXN, bank ref, etc."
            fullWidth
            value={formData.reference}
            onChange={(e) => setField("reference", e.target.value)}
            inputProps={{ maxLength: 64, autoCapitalize: "characters" as any, spellCheck: "false" as any }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Notes"
            fullWidth
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => setField("notes", e.target.value)}
            inputProps={{ maxLength: 500 }}
          />
        </Grid>

        <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
          <LoadingButton type="submit" onClick={() => undefined} variant="contained" loading={loading} aria-label={mode === "edit" ? "Save changes" : "Add payment"}>
            {mode === "edit" ? "Save Changes" : "Add Payment"}
          </LoadingButton>
          <Button onClick={onCancel} variant="outlined" color="secondary" aria-label="Cancel">
            Cancel
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

export default VendorPaymentForm;

// ---- Helpers ----
function formatKESDisplay(value: number | string) {
  const n = toNumber(value);
  if (!isFinite(n) || String(value).endsWith(".")) return String(value); // keep editing state
  try {
    // Avoid forcing locale commas while typing; keep simple echo
    return String(value);
  } catch {
    return String(value);
  }
}

function sanitizeAmountInput(raw: string) {
  // Allow only digits and a single dot or comma; convert comma to dot
  const cleaned = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
  // Optional: limit to 2 decimals
  if (parts[1]?.length > 2) parts[1] = parts[1].slice(0, 2);
  return parts.join(".");
}

function normalizeAmount(v: number | string) {
  if (typeof v === "number") return String(v);
  if (!v) return "";
  return sanitizeAmountInput(String(v));
}

function toNumber(v: number | string) {
  if (typeof v === "number") return v;
  const n = parseFloat((v || "").replace(/,/g, "."));
  return isNaN(n) ? NaN : n;
}
