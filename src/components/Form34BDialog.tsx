import * as React from "react";
import {
  Dialog, DialogTitle, DialogContent,
  Button, Grid, TextField, Alert, Typography, Box, useMediaQuery, Stack
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import DownloadDoneIcon from "@mui/icons-material/DownloadDone";
import OfflineBoltIcon from "@mui/icons-material/OfflineBolt";
import { saveForm34B } from "../API/form34b";
import type { SaveForm34BRequest } from "../types/form34b";

type Candidate = { id: number; name: string };

interface Props {
  open: boolean;
  onClose: () => void;
  constCode: string;                 // e.g. constituency.const_code
  candidates: Candidate[];           // your candidate list
  form34bId?: number;                // if editing existing
  registeredVotersSum?: number | null;
  stationsExpected?: number | null;
  stationsReported?: number | null;
  token?: string;
  onSaved?: (r: { form34b_id: number }) => void;
}

const DRAFT_KEY = (constCode: string) => `form34b.draft.${constCode}`;

function clampNonNegativeInt(v: string | number): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const CandidateRow = React.memo(function CandidateRow({
  c,
  value,
  onChange
}: {
  c: Candidate;
  value: number | undefined;
  onChange: (id: number, next: number) => void;
}) {
  return (
    <TextField
      label={`${c.name} votes`}
      type="text" // better control; we use inputMode for numeric keypad
      value={value ?? ""}
      onChange={(e) => onChange(c.id, clampNonNegativeInt(e.target.value))}
      onWheel={(e) => (e.target as HTMLInputElement).blur()} // prevent wheel from changing
      inputProps={{
        inputMode: "numeric",
        pattern: "[0-9]*",
        min: 0,
        "aria-label": `${c.name} votes`
      }}
      fullWidth
      size="small"
    />
  );
});

export default function Form34BDialog({
  open, onClose, constCode, candidates,
  form34bId, registeredVotersSum, stationsExpected, stationsReported,
  token, onSaved
}: Props) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const [votes, setVotes] = React.useState<Record<number, number>>({});
  const [rejected, setRejected] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const [offline, setOffline] = React.useState(!navigator.onLine);
  const [dirty, setDirty] = React.useState(false);

  // Load draft on open (per-constituency)
  React.useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY(constCode));
      if (raw) {
        const parsed = JSON.parse(raw) as { votes: Record<number, number>; rejected: number };
        setVotes(parsed.votes ?? {});
        setRejected(parsed.rejected ?? 0);
        setDirty(false);
      } else {
        // initialize zeros for a better mobile UX (optional)
        const init: Record<number, number> = {};
        candidates.forEach(c => { init[c.id] = votes[c.id] ?? 0; });
        setVotes(init);
        setRejected(0);
        setDirty(false);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, constCode]);

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

  // Autosave (throttled) per-constituency
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      localStorage.setItem(
        DRAFT_KEY(constCode),
        JSON.stringify({ votes, rejected })
      );
    }, 350);
    return () => clearTimeout(t);
  }, [votes, rejected, constCode, open]);

  const totalValid = React.useMemo(
    () => Object.values(votes).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0),
    [votes]
  );

  const turnoutWarn =
    registeredVotersSum != null && totalValid + rejected > registeredVotersSum;

  const setVote = React.useCallback((id: number, n: number) => {
    setVotes((s) => {
      if (s[id] === n) return s;
      setDirty(true);
      return { ...s, [id]: n };
    });
  }, []);

  const setRejectedSafe = (val: string) => {
    const n = clampNonNegativeInt(val);
    setRejected((prev) => (prev === n ? prev : n));
    setDirty(true);
  };

  const zeroFill = () => {
    setVotes((s) => {
      const next: Record<number, number> = { ...s };
      candidates.forEach((c) => { next[c.id] = next[c.id] ?? 0; });
      return next;
    });
    setRejected((r) => r ?? 0);
    setDirty(true);
  };

  const clearAll = () => {
    setVotes({});
    setRejected(0);
    setDirty(true);
  };

  // Paste helper (comma/space separated list matching candidate order)
  const handlePasteSeries = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const parts = text
        .trim()
        .split(/[\s,;]+/)
        .map((p) => clampNonNegativeInt(p));
      if (!parts.length) return;
      setVotes((s) => {
        const next = { ...s };
        candidates.forEach((c, idx) => {
          if (typeof parts[idx] === "number") next[c.id] = parts[idx];
        });
        return next;
      });
      setDirty(true);
    } catch {
      // clipboard may be blocked; ignore
    }
  };

  const handleSubmit = async () => {
    setError(null); setOk(null);

    const entries = candidates.map(c => ({
      candidate_id: c.id,
      votes: votes[c.id] ?? 0,
    }));
    if (!entries.length) { setError("Add at least one candidate."); return; }

    const payload: SaveForm34BRequest = {
      const_code: constCode,
      entries,
      rejected_votes: clampNonNegativeInt(rejected),
      form34b_id: form34bId,
      registered_voters_sum: registeredVotersSum ?? null,
      stations_expected: stationsExpected ?? null,
      stations_reported: stationsReported ?? null,
      source_mode: "manual_from_34B",
      status: "submitted",
    };

    try {
      setLoading(true);
      const res = await saveForm34B(payload, token);
      setOk("Form 34B saved.");
      localStorage.removeItem(DRAFT_KEY(constCode));
      setDirty(false);
      onSaved?.({ form34b_id: res.form34b_id });
      onClose();
    } catch (e: any) {
      setError(e?.message || "Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  // Warn on close if unsaved changes
  const handleClose = () => {
    if (loading) return;
    if (dirty) {
      const confirm = window.confirm(
        "You have unsaved changes. Close anyway?"
      );
      if (!confirm) return;
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isXs}
      scroll="paper"
      aria-labelledby="form34b-title"
    >
      <DialogTitle id="form34b-title">Enter Form 34B</DialogTitle>
      <DialogContent dividers sx={{ pb: 0 }}>
        {offline && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <OfflineBoltIcon fontSize="small" style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
            You’re offline. Draft is autosaved locally; you can submit when back online.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}

        {/* Quick actions */}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} useFlexGap flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadDoneIcon />}
            onClick={zeroFill}
          >
            Zero-fill
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ClearAllIcon />}
            onClick={clearAll}
          >
            Clear all
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handlePasteSeries}
            title="Paste a series of numbers to fill votes in candidate order"
          >
            Paste series
          </Button>
        </Stack>

        <Grid container spacing={1.5}>
          {candidates.map(c => (
            <Grid key={c.id} item xs={12} sm={6}>
              <CandidateRow c={c} value={votes[c.id]} onChange={setVote} />
            </Grid>
          ))}

          <Grid item xs={12} sm={6}>
            <TextField
              label="Rejected ballots"
              type="text"
              value={rejected === 0 ? "" : rejected}
              onChange={(e) => setRejectedSafe(e.target.value)}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              inputProps={{
                inputMode: "numeric",
                pattern: "[0-9]*",
                min: 0,
                "aria-label": "Rejected ballots"
              }}
              fullWidth
              size="small"
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Total valid: <b>{totalValid.toLocaleString()}</b>
              {registeredVotersSum != null && (
                <> · Total votes: <b>{(totalValid + rejected).toLocaleString()}</b> / Registered: <b>{registeredVotersSum.toLocaleString()}</b></>
              )}
            </Typography>
            {turnoutWarn && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                Total votes exceed registered voters. You can still submit; the server will flag this.
              </Alert>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      {/* Sticky summary/actions for mobile ergonomics */}
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          zIndex: 1,
          backgroundColor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
          px: 2,
          py: 1
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="flex-end"
        >
          <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
            {registeredVotersSum != null
              ? `Valid ${totalValid.toLocaleString()} · Total ${(totalValid + rejected).toLocaleString()} / Registered ${registeredVotersSum.toLocaleString()}`
              : `Valid ${totalValid.toLocaleString()} · Rejected ${rejected.toLocaleString()}`}
          </Typography>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading || offline}
            >
              {loading ? "Saving..." : "Submit 34B"}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Dialog>
  );
}
