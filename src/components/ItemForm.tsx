// src/components/ItemForm.tsx
import * as React from "react";
import {
  Box,
  Stack,
  Grid,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Alert,
  Chip,
  Typography,
} from "@mui/material";

type ItemStatus = "Active" | "Inactive";

export interface ItemFormValues {
  id?: string | number;
  name: string;
  sku?: string;
  category?: string;
  price: number;       // >= 0
  quantity: number;    // integer >= 0
  status: ItemStatus;
  description?: string;
  imageFile?: File | null; // optional upload (not autosaved)
}

export interface ItemFormProps {
  initial?: Partial<ItemFormValues>;
  onSubmit: (values: ItemFormValues) => void | Promise<void>;
  onCancel?: () => void;
  busy?: boolean;
  categories?: string[];
  submitLabel?: string;
  draftKey?: string; // default: "itemForm.draft"
}

const clampNonNegInt = (v: string | number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const clampNonNeg = (v: string | number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : 0;
};

export default function ItemForm({
  initial,
  onSubmit,
  onCancel,
  busy = false,
  categories = ["General", "Services", "Hardware", "Software"],
  submitLabel = "Save Item",
  draftKey = "itemForm.draft",
}: ItemFormProps) {
  const [offline, setOffline] = React.useState(!navigator.onLine);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [dirty, setDirty] = React.useState(false);

  const [values, setValues] = React.useState<ItemFormValues>(() => ({
    id: initial?.id,
    name: initial?.name ?? "",
    sku: initial?.sku ?? "",
    category: initial?.category ?? categories[0],
    price: typeof initial?.price === "number" ? initial!.price : 0,
    quantity: Number.isFinite(initial?.quantity) ? (initial!.quantity as number) : 0,
    status: (initial?.status as ItemStatus) ?? "Active",
    description: initial?.description ?? "",
    imageFile: null,
  }));

  const [imagePreview, setImagePreview] = React.useState<string | null>(null);

  // Online/offline awareness (PWA-friendly)
  React.useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Load draft (only if no explicit initial values changed the defaults)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<ItemFormValues>;
        setValues((v) => ({
          ...v,
          ...draft,
          imageFile: null, // never restore files
        }));
        setDirty(false);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Autosave (throttled) excluding imageFile
  React.useEffect(() => {
    const t = setTimeout(() => {
      const { imageFile, ...rest } = values;
      localStorage.setItem(draftKey, JSON.stringify(rest));
    }, 350);
    return () => clearTimeout(t);
  }, [values, draftKey]);

  // Helpers
  const setField = <K extends keyof ItemFormValues>(key: K, val: ItemFormValues[K]) => {
    setValues((s) => ({ ...s, [key]: val }));
    setDirty(true);
    if (errors[key as string]) {
      setErrors((e) => {
        const { [key as string]: _drop, ...rest } = e;
        return rest;
      });
    }
  };

  const validate = (v: ItemFormValues) => {
    const e: Record<string, string> = {};
    if (!v.name?.trim()) e.name = "Name is required.";
    if (v.price < 0) e.price = "Price cannot be negative.";
    if (v.quantity < 0 || !Number.isInteger(v.quantity)) e.quantity = "Quantity must be an integer ≥ 0.";
    return e;
    };

  const handleImage = (file: File | null) => {
    setField("imageFile", file);
    if (!file) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  React.useEffect(() => {
    // Cleanup preview URL
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = { ...values };
    const eMap = validate(v);
    if (Object.keys(eMap).length) {
      setErrors(eMap);
      return;
    }
    await Promise.resolve(onSubmit(v));
    setDirty(false);
    // keep draft until parent confirms persisted, or choose to clear:
    // localStorage.removeItem(draftKey);
  };

  const cancel = () => {
    if (dirty) {
      const ok = window.confirm("Discard changes?");
      if (!ok) return;
    }
    onCancel?.();
  };

  return (
    <Box component="form" onSubmit={submit} noValidate sx={{ p: { xs: 1, sm: 2 } }}>
      {offline && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You’re offline. Edits are saved locally; submit when you’re back online.
        </Alert>
      )}

      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={7}>
          <TextField
            label="Item Name *"
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            error={!!errors.name}
            helperText={errors.name || " "}
            autoComplete="off"
            fullWidth
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={5}>
          <TextField
            label="SKU"
            value={values.sku ?? ""}
            onChange={(e) => setField("sku", e.target.value)}
            helperText=" "
            autoComplete="off"
            fullWidth
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small" error={!!errors.category}>
            <InputLabel id="item-category-label">Category</InputLabel>
            <Select
              labelId="item-category-label"
              value={values.category ?? ""}
              label="Category"
              onChange={(e) => setField("category", e.target.value)}
            >
              {categories.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.category || " "}</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={6} sm={3}>
          <TextField
            label="Price"
            type="text"
            inputProps={{ inputMode: "decimal", pattern: "[0-9]*[.,]?[0-9]*", min: 0 }}
            value={values.price === 0 ? "" : values.price}
            onChange={(e) => setField("price", clampNonNeg(e.target.value))}
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            error={!!errors.price}
            helperText={errors.price || " "}
            fullWidth
            size="small"
          />
        </Grid>

        <Grid item xs={6} sm={3}>
          <TextField
            label="Quantity"
            type="text"
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*", min: 0 }}
            value={values.quantity === 0 ? "" : values.quantity}
            onChange={(e) => setField("quantity", clampNonNegInt(e.target.value))}
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            error={!!errors.quantity}
            helperText={errors.quantity || " "}
            fullWidth
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="item-status-label">Status</InputLabel>
            <Select
              labelId="item-status-label"
              value={values.status}
              label="Status"
              onChange={(e) => setField("status", e.target.value as ItemStatus)}
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </Select>
            <FormHelperText> </FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Description"
            value={values.description ?? ""}
            onChange={(e) => setField("description", e.target.value)}
            multiline
            minRows={3}
            fullWidth
            size="small"
          />
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
            <Button
              component="label"
              variant="outlined"
              size="small"
            >
              Upload Image
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
              />
            </Button>
            {values.imageFile && (
              <Chip
                label={values.imageFile.name}
                onDelete={() => handleImage(null)}
                variant="outlined"
                size="small"
              />
            )}
          </Stack>

          {imagePreview && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">Preview</Typography>
              <Box
                component="img"
                src={imagePreview}
                alt="Item preview"
                sx={{ display: "block", mt: 0.5, maxWidth: 240, maxHeight: 160, borderRadius: 1, border: 1, borderColor: "divider" }}
              />
            </Box>
          )}
        </Grid>
      </Grid>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="flex-end"
        sx={{
          position: { xs: "sticky", sm: "static" },
          bottom: { xs: 0, sm: "auto" },
          mt: 2,
          py: 1,
          backgroundColor: { xs: "background.paper", sm: "transparent" },
          borderTop: { xs: 1, sm: 0 },
          borderColor: "divider",
          zIndex: 1,
        }}
      >
        <Button
          onClick={cancel}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={busy || (offline && !navigator.onLine)} // allow if you want queued submit later
        >
          {busy ? "Saving..." : submitLabel}
        </Button>
      </Stack>
    </Box>
  );
}

