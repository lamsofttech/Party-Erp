// src/components/OnboardMCACandidateModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress, Alert,
  FormControl, InputLabel, Select, MenuItem, Box, Typography, Input,
  FormHelperText, useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { PersonAdd } from "@mui/icons-material";
import toast, { Toaster } from "react-hot-toast";

interface PoliticalPosition { position_id: number; position_name: string; position_level: string; }
interface PoliticalParty { id: number; name: string; }

export interface OnboardMCACandidateModalProps {
  open: boolean;
  onClose: () => void;
  wardCode: string;
  pollingStationId: string;
  countyName?: string;
  countyCode?: string;
  constituencyName?: string;
  constituencyCode?: string;
  wardName?: string;
  onSuccess?: () => void;
  onCandidateOnboarded?: () => void;
}

/* ---------- tiny offline queue (stores as JSON + dataURL) ---------- */
type Enqueued = {
  payload: Record<string, string>;
  photoDataUrl?: string | null;
  createdAt: number;
};
const QUEUE_KEY = "mcaOnboardQueue:v1";

const getQueue = (): Enqueued[] => JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
const setQueue = (q: Enqueued[]) => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
const enqueue = (item: Enqueued) => setQueue([...getQueue(), item]);

/* ---------- utils ---------- */
function timeoutFetch(input: RequestInfo, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 12000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(input, { ...rest, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

async function compressImage(file: File, maxDim = 800): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    return blob || file;
  } catch {
    return file;
  }
}

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return await res.blob();
};

async function flushQueue() {
  if (!navigator.onLine) return;
  const q = getQueue();
  if (!q.length) return;
  const remaining: Enqueued[] = [];
  for (const item of q) {
    try {
      const fd = new FormData();
      Object.entries(item.payload).forEach(([k, v]) => fd.append(k, v));
      if (item.photoDataUrl) {
        const blob = await dataUrlToBlob(item.photoDataUrl);
        fd.append("photo", blob, "photo.jpg");
      }
      const res = await timeoutFetch("https://skizagroundsuite.com/API/onboard_mca_candidate.php", { method: "POST", body: fd, timeoutMs: 12000 });
      const txt = await res.text();
      const json = (() => { try { return JSON.parse(txt); } catch { return { status: "error", message: txt }; } })();
      if (!res.ok || json?.status !== "success") throw new Error(json?.message || `HTTP ${res.status}`);
    } catch {
      remaining.push(item);
    }
  }
  setQueue(remaining);
}

/* ---------- component ---------- */
const OnboardMCACandidateModal: React.FC<OnboardMCACandidateModalProps> = ({
  open, onClose, wardCode, pollingStationId,
  countyName, countyCode, constituencyName, constituencyCode, wardName,
  onSuccess, onCandidateOnboarded
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const [candidateName, setCandidateName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [partyId, setPartyId] = useState<string>("");
  const [positionId, setPositionId] = useState<string>("");
  const [mcaPositionName, setMcaPositionName] = useState<string>("Loading…");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadingPositions, setLoadingPositions] = useState<boolean>(true);
  const [availableParties, setAvailableParties] = useState<PoliticalParty[]>([]);
  const [loadingParties, setLoadingParties] = useState<boolean>(true);

  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; phone?: boolean; party?: boolean }>({});
  const nameRef = useRef<HTMLInputElement>(null);

  /* focus + reset */
  useEffect(() => {
    if (open) {
      setCandidateName(""); setEmail(""); setPhoneNumber("");
      setPartyId(""); setError(null); setTouched({});
      setPhotoFile(null);
      setTimeout(() => nameRef.current?.focus(), 40);
    }
  }, [open]);

  /* online flush */
  useEffect(() => {
    const on = () => flushQueue();
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, []);

  /* cached fetch for positions/parties */
  useEffect(() => {
    if (!open) return;

    const cachedPos = sessionStorage.getItem("politicalPositions:v1");
    const cachedParty = sessionStorage.getItem("politicalParties:v1");

    const loadPositions = async () => {
      setLoadingPositions(true);
      try {
        let data: any;
        if (cachedPos) {
          data = JSON.parse(cachedPos);
        } else {
          const res = await timeoutFetch("https://skizagroundsuite.com/API/political_positions_api.php", { timeoutMs: 12000 });
          if (!res.ok) throw new Error(`Status ${res.status}`);
          data = await res.json();
          sessionStorage.setItem("politicalPositions:v1", JSON.stringify(data));
        }
        if (data?.status === "success" && Array.isArray(data.data)) {
          const byName: PoliticalPosition | undefined = data.data.find((p: PoliticalPosition) => p.position_name?.trim() === "Member of County Assembly");
          const byId: PoliticalPosition | undefined = data.data.find((p: PoliticalPosition) => p.position_id === 8);
          const chosen = byName ?? byId;
          if (chosen) {
            setPositionId(String(chosen.position_id));
            setMcaPositionName(chosen.position_name || "Member of County Assembly");
          } else {
            setPositionId("");
            setMcaPositionName("Not Found");
            setError("Required position 'Member of County Assembly' not found. Contact admin.");
          }
        } else throw new Error("Unexpected positions format.");
      } catch (e: any) {
        setPositionId("");
        setMcaPositionName("Not Found");
        setError(`Failed to load positions: ${e?.message || e}`);
      } finally {
        setLoadingPositions(false);
      }
    };

    const loadParties = async () => {
      setLoadingParties(true);
      try {
        let data: any;
        if (cachedParty) {
          data = JSON.parse(cachedParty);
        } else {
          const res = await timeoutFetch("https://skizagroundsuite.com/API/fetch_political_parties.php", { timeoutMs: 12000 });
          if (!res.ok) throw new Error(`Status ${res.status}`);
          data = await res.json();
          sessionStorage.setItem("politicalParties:v1", JSON.stringify(data));
        }
        if (data?.status === "success" && Array.isArray(data.data)) {
          setAvailableParties(data.data);
        } else throw new Error("Unexpected parties format.");
      } catch (e: any) {
        setAvailableParties([]);
        setError(`Failed to load parties: ${e?.message || e}`);
      } finally {
        setLoadingParties(false);
      }
    };

    loadPositions();
    loadParties();
  }, [open]);

  /* validation */
  const nameValid = candidateName.trim().length >= 2;
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim()), [email]);
  const phoneValid = useMemo(() => /^[\d+()\-\s]{7,20}$/.test(phoneNumber.trim()), [phoneNumber]);
  const partyValid = !!partyId;
  const canSubmit = nameValid && emailValid && phoneValid && partyValid && !!positionId && !loading;

  const handleCloseGuard = (_: object, reason?: "backdropClick" | "escapeKeyDown") => {
    if (loading && (reason === "backdropClick" || reason === "escapeKeyDown")) return;
    onClose();
  };

  const buildPayload = (): Record<string, string> => {
    const base: Record<string, string> = {
      caw_name: candidateName.trim(),
      email: email.trim(),
      phone_number: phoneNumber.trim(),
      party_id: partyId,
      position_id: positionId,
      caw_code: wardCode,
      polling_station_id: String(pollingStationId),
      status: "Pending",
    };
    if (countyCode) base["county_code"] = countyCode;
    if (constituencyCode) base["const_code"] = constituencyCode;
    if (countyName) base["county_name"] = countyName;
    if (constituencyName) base["constituency_name"] = constituencyName;
    if (wardName) base["ward_name"] = wardName;
    return base;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) {
      setTouched({ name: true, email: true, phone: true, party: true });
      setError("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = buildPayload();

    // prepare multipart
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => fd.append(k, v));

    let compressedBlob: Blob | null = null;
    if (photoFile) {
      compressedBlob = await compressImage(photoFile, 900);
      fd.append("photo", compressedBlob, "photo.jpg");
    }

    // OFFLINE? enqueue then exit optimistically
    if (!navigator.onLine) {
      let photoDataUrl: string | null = null;
      if (compressedBlob) {
        photoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result));
          reader.readAsDataURL(compressedBlob!);
        });
      }
      enqueue({ payload, photoDataUrl, createdAt: Date.now() });
      toast.success("Saved offline. Will auto-sync when you're back online.");
      onCandidateOnboarded?.(); onSuccess?.();
      setLoading(false);
      setTimeout(onClose, 900);
      return;
    }

    try {
      const res = await timeoutFetch("https://skizagroundsuite.com/API/onboard_mca_candidate.php", {
        method: "POST",
        body: fd,
        timeoutMs: 12000,
      });
      const txt = await res.text();
      const result = (() => { try { return JSON.parse(txt); } catch { return { status: "error", message: txt }; } })();
      if (!res.ok || result.status !== "success") throw new Error(result.message || `HTTP ${res.status}`);

      toast.success("MCA candidate onboarded successfully!");
      onCandidateOnboarded?.(); onSuccess?.();
      setTimeout(onClose, 900);
    } catch (err: any) {
      // enqueue on network-ish issues
      if (String(err?.name).includes("AbortError") || /network/i.test(String(err?.message))) {
        let photoDataUrl: string | null = null;
        if (compressedBlob) {
          photoDataUrl = await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(String(r.result));
            r.readAsDataURL(compressedBlob!);
          });
        }
        enqueue({ payload, photoDataUrl, createdAt: Date.now() });
        toast.success("Network problem. Saved and will auto-sync later.");
        setTimeout(onClose, 900);
      } else {
        setError(err?.message || "Submission failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseGuard}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      keepMounted
      aria-labelledby="onboard-mca-title"
      transitionDuration={prefersReducedMotion ? 0 : undefined}
      PaperProps={{
        sx: {
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        },
      }}
    >
      <Toaster position="top-right" />
      <DialogTitle id="onboard-mca-title"><PersonAdd sx={{ mr: 1 }} /> Onboard MCA Candidate</DialogTitle>

      <form onSubmit={handleSubmit} noValidate>
        <DialogContent>
          <Box sx={{ mb: 1 }}>
            {countyName && <Typography>County: <strong>{countyName}</strong></Typography>}
            {constituencyName && <Typography>Constituency: <strong>{constituencyName}</strong></Typography>}
            {wardName && <Typography gutterBottom>Ward: <strong>{wardName}</strong></Typography>}
          </Box>

          {error && <Alert severity="error" sx={{ mb: 1.5 }} role="alert">{error}</Alert>}

          <TextField
            inputRef={nameRef}
            label="Candidate Full Name"
            variant="outlined"
            fullWidth
            margin="normal"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            disabled={loading}
            required
            inputProps={{ minLength: 2, autoCapitalize: "words" }}
            autoComplete="name"
            error={!!touched.name && !nameValid}
            helperText={touched.name && !nameValid ? "Enter at least 2 characters." : " "}
          />

          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            margin="normal"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            disabled={loading}
            required
            autoComplete="email"
            error={!!touched.email && !emailValid}
            helperText={touched.email && !emailValid ? "Enter a valid email address." : " "}
          />

          <TextField
            label="Phone Number"
            variant="outlined"
            fullWidth
            margin="normal"
            type="tel"
            inputMode="tel"
            placeholder="+254 7xx xxx xxx"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            disabled={loading}
            required
            autoComplete="tel"
            error={!!touched.phone && !phoneValid}
            helperText={touched.phone && !phoneValid ? "Digits, +, spaces, dashes (7–20 chars)." : " "}
          />

          <FormControl fullWidth margin="normal" required error={!!touched.party && !partyValid}>
            <InputLabel id="party-select-label">Political Party</InputLabel>
            {loadingParties ? (
              <Box sx={{ mt: 2, mb: 1, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                <Select
                  labelId="party-select-label"
                  value={partyId}
                  label="Political Party"
                  onChange={(e) => setPartyId(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, party: true }))}
                  disabled={loading}
                >
                  <MenuItem value=""><em>Select Party</em></MenuItem>
                  {availableParties.map((p) => (
                    <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>
                  ))}
                </Select>
                <FormHelperText>{!!touched.party && !partyValid ? "Please select a party." : " "}</FormHelperText>
              </>
            )}
          </FormControl>

          <FormControl fullWidth margin="normal" required>
            <InputLabel id="position-select-label">Position Applied For</InputLabel>
            <Select
              labelId="position-select-label"
              value={positionId || ""}
              label="Position Applied For"
              disabled
            >
              {loadingPositions ? (
                <MenuItem value=""><em>Loading…</em></MenuItem>
              ) : (
                <MenuItem value={positionId || ""}>{mcaPositionName}</MenuItem>
              )}
            </Select>
            <FormHelperText>Auto-detected as Member of County Assembly.</FormHelperText>
          </FormControl>

          <Box sx={{ mt: 1.5 }}>
            <Typography variant="body2" color="text.secondary">Candidate Photo (optional)</Typography>
            <Input
              type="file"
              inputProps={{ accept: "image/*" }}
              disabled={loading}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const f = e.target.files?.[0] || null;
                setPhotoFile(f);
              }}
            />
            {photoFile && <Typography variant="caption" sx={{ ml: 1 }}>{photoFile.name}</Typography>}
            <FormHelperText>We’ll optimize large photos for faster upload.</FormHelperText>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PersonAdd />}
            disabled={!canSubmit}
          >
            {loading ? "Saving…" : "Onboard MCA"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default OnboardMCACandidateModal;
