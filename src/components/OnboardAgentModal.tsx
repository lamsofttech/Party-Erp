import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

/** ✅ Local Types (Fixes TS2614 import error) */
type Agent = {
  status: "Recruited" | "Vetted" | "Trained" | "Available";
};

type PollingStation = {
  id: string | number;
  name: string;
  county: string;
  constituency: string;
  ward: string;
};


interface OnboardAgentModalProps {
  open: boolean;
  onClose: () => void;
  pollingStation: PollingStation | null;
  onAgentOnboarded: () => void;
}

type EnqueuedAgent = {
  payload: any;
  createdAt: number;
};

const QUEUE_KEY = "onboardAgentQueue:v1";

function enqueue(payload: any) {
  const q: EnqueuedAgent[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  q.push({ payload, createdAt: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

async function flushQueue() {
  const q: EnqueuedAgent[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  if (!q.length || !navigator.onLine) return;
  const remaining: EnqueuedAgent[] = [];
  for (const item of q) {
    try {
      await submitAgent(item.payload, 8000);
    } catch {
      remaining.push(item); // keep if still failing
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

async function submitAgent(payload: any, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("https://skizagroundsuite.com/API/add_agent.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.status !== "success") {
      const msg =
        json?.message || json?.error || (!res.ok ? `HTTP ${res.status}` : "Failed to onboard agent.");
      throw new Error(msg);
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

const OnboardAgentModal: React.FC<OnboardAgentModalProps> = ({
  open,
  onClose,
  pollingStation,
  onAgentOnboarded,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const [agentName, setAgentName] = useState("");
  const [agentContact, setAgentContact] = useState("");
  const [agentEmail, setAgentEmail] = useState("");            // 👈 NEW
  const [agentStatus, setAgentStatus] = useState<Agent["status"]>("Recruited");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ name?: boolean; contact?: boolean; email?: boolean }>({}); // 👈 UPDATED

  const nameRef = useRef<HTMLInputElement>(null);

  // Reset on open, focus first field
  useEffect(() => {
    if (open) {
      setAgentName("");
      setAgentContact("");
      setAgentEmail("");                                      // 👈 NEW
      setAgentStatus("Recruited");
      setError(null);
      setSuccess(null);
      setTouched({});
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, pollingStation]);

  // Flush any queued requests when we come online
  useEffect(() => {
    const onOnline = () => flushQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const phoneValid = useMemo(() => {
    // Basic, permissive: digits, +, spaces, dashes, parentheses; 7–20 chars
    const v = agentContact.trim();
    return /^[\d+()\-\s]{7,20}$/.test(v);
  }, [agentContact]);

  const emailValid = useMemo(() => {
    const v = agentEmail.trim();
    if (!v) return false;
    // very simple email check (good enough for UI)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }, [agentEmail]);

  const nameValid = agentName.trim().length >= 2;
  const canSubmit = nameValid && phoneValid && emailValid && !!pollingStation && !loading; // 👈 UPDATED

  const handleCloseGuard = (
    _e: object,
    reason?: "backdropClick" | "escapeKeyDown"
  ) => {
    if (loading && (reason === "backdropClick" || reason === "escapeKeyDown")) return; // don't close while submitting
    onClose();
  };

  const buildPayload = () => ({
    agent_name: agentName.trim(),
    contact: agentContact.trim(),
    email: agentEmail.trim(),                                 // 👈 NEW: send email to backend
    status: agentStatus,
    assigned_polling_station_id: pollingStation!.id,
    county_name: pollingStation!.county,
    constituency_name: pollingStation!.constituency,
    ward_name: pollingStation!.ward,
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) {
      setTouched({ name: true, contact: true, email: true }); // 👈 ensure email shows errors too
      setError("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = buildPayload();

    // If offline, enqueue and resolve optimistically
    if (!navigator.onLine) {
      enqueue(payload);
      setSuccess("You're offline. Saved and will sync automatically when online.");
      onAgentOnboarded();
      setLoading(false);
      // Close after short delay to feel responsive
      setTimeout(onClose, 1200);
      return;
    }

    try {
      await submitAgent(payload);
      setSuccess("Agent onboarded successfully!");
      onAgentOnboarded();
      setTimeout(onClose, 800);
    } catch (err: any) {
      console.error("Error onboarding agent:", err);
      // If network-ish error, enqueue
      if (String(err?.name).includes("AbortError") || String(err?.message).toLowerCase().includes("network")) {
        enqueue(payload);
        setSuccess("Network issue. Saved locally and will auto-sync when back online.");
        setTimeout(onClose, 1200);
      } else {
        setError(err?.message || "An unknown error occurred during onboarding.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseGuard}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      keepMounted
      aria-labelledby="onboard-agent-title"
      transitionDuration={prefersReducedMotion ? 0 : undefined}
      PaperProps={{
        sx: {
          // Safe areas for mobile notches
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        },
      }}
    >
      <DialogTitle id="onboard-agent-title">
        Onboard Agent{pollingStation?.name ? ` — ${pollingStation.name}` : ""}
      </DialogTitle>

      <form onSubmit={handleSubmit} noValidate>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} role="alert">
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} role="status">
              {success}
            </Alert>
          )}

          <TextField
            inputRef={nameRef}
            margin="dense"
            id="agentName"
            name="name"
            label="Agent Name"
            type="text"
            fullWidth
            variant="outlined"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            required
            inputProps={{ minLength: 2, autoCapitalize: "words" }}
            autoComplete="name"
            error={!!touched.name && !nameValid}
            helperText={touched.name && !nameValid ? "Please enter at least 2 characters." : " "}
          />

          <TextField
            margin="dense"
            id="agentContact"
            name="tel"
            label="Contact Number"
            type="tel"
            inputMode="tel"
            fullWidth
            variant="outlined"
            value={agentContact}
            onChange={(e) => setAgentContact(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, contact: true }))}
            required
            autoComplete="tel"
            placeholder="+254 7xx xxx xxx"
            error={!!touched.contact && !phoneValid}
            helperText={
              touched.contact && !phoneValid
                ? "Use a valid phone number (digits, +, spaces, dashes)."
                : " "
            }
          />

          {/* 👇 NEW Email field */}
          <TextField
            margin="dense"
            id="agentEmail"
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={agentEmail}
            onChange={(e) => setAgentEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            required
            autoComplete="email"
            placeholder="agent@example.com"
            error={!!touched.email && !emailValid}
            helperText={
              touched.email && !emailValid
                ? "Enter a valid email address (e.g. name@example.com)."
                : " "
            }
          />

          <FormControl fullWidth margin="dense" sx={{ mb: 1.5 }}>
            <InputLabel id="agent-status-label">Initial Status</InputLabel>
            <Select
              labelId="agent-status-label"
              id="agentStatus"
              value={agentStatus}
              label="Initial Status"
              onChange={(e) => setAgentStatus(e.target.value as Agent["status"])}
            >
              <MenuItem value="Recruited">Recruited</MenuItem>
              <MenuItem value="Vetted">Vetted</MenuItem>
              <MenuItem value="Trained">Trained</MenuItem>
              <MenuItem value="Available">Available</MenuItem>
            </Select>
            <FormHelperText>You can update progression later.</FormHelperText>
          </FormControl>

          <TextField
            margin="dense"
            id="pollingStation"
            label="Assigned Polling Station"
            type="text"
            fullWidth
            variant="outlined"
            value={pollingStation?.name || ""}
            disabled
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!canSubmit}
            startIcon={loading ? <CircularProgress size={18} /> : undefined}
          >
            {loading ? "Saving…" : "Onboard Agent"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default OnboardAgentModal;
