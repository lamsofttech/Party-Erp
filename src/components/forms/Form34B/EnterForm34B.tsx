// src/components/forms/Form34B/EnterForm34B.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    TextField,
    Typography,
} from "@mui/material";
import { CheckCircle, CloudUpload, Close, Save, Summarize } from "@mui/icons-material";

import { Candidate, Constituency, Form34BResultDraft, write34BDraft } from "../../../utils/storage";
import { postJSON } from "../../../utils/api";
import { apply34BOcrToDraft, upload34BForOCR } from "../../../utils/ocr34b";
import { isValidOcrFile } from "../../../utils/ocr34a";

interface EnterForm34BProps {
    open: boolean;
    onClose: () => void;
    countyName: string;
    countyCode: string;
    constituency: Constituency | null;
    candidates: Candidate[];
    onSaved: (draft: Form34BResultDraft) => void;
    onSubmitted: (draft: Form34BResultDraft) => void;
}

type Save34BResponse = { status: "success"; form34b_id: number };

export const EnterForm34B: React.FC<EnterForm34BProps> = ({
    open,
    onClose,
    countyName,
    countyCode,
    constituency,
    candidates,
    onSaved,
    onSubmitted,
}) => {
    const [draft, setDraft] = useState<Form34BResultDraft | null>(null);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // OCR state
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrInfo, setOcrInfo] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!constituency || candidates.length === 0) return;

        const fresh: Form34BResultDraft = {
            countyCode,
            constituencyId: constituency.id,
            entries: candidates.map((c: Candidate) => ({
                candidateId: c.id,
                votes: 0,
            })), // aligned by index
            rejectedVotes: 0,
            totalValid: 0,
            returningOfficer: "",
            form34BRef: "",
            remarks: "",
            submitted: false,
            lastSavedAt: Date.now(),
            updatedAt: new Date().toISOString(),
        };

        setDraft(fresh);
        setError(null);
        setOcrInfo(null);
    }, [constituency, candidates, countyCode, countyName]);

    const totals = useMemo(() => {
        if (!draft) return { valid: 0, total: 0 };
        const valid = draft.entries.reduce((s, e) => s + (Number(e.votes) || 0), 0);
        return { valid, total: valid + (Number(draft.rejectedVotes) || 0) };
    }, [draft]);

    useEffect(() => {
        if (!draft) return;

        const next: Form34BResultDraft = {
            ...draft,
            totalValid: totals.valid,
            lastSavedAt: Date.now(),
            updatedAt: new Date().toISOString(),
        };

        setDraft(next);
        write34BDraft(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totals.valid, totals.total]);

    const setVotesByIndex = (idx: number, value: string) => {
        if (!draft) return;
        const safe = Math.max(0, Math.floor(Number(value) || 0));
        const next: Form34BResultDraft = { ...draft, entries: draft.entries.slice() };

        if (!next.entries[idx]) {
            next.entries[idx] = {
                candidateId: String(candidates[idx]?.id || ""),
                votes: 0,
            };
        }

        next.entries[idx] = { ...next.entries[idx], votes: safe };
        next.lastSavedAt = Date.now();
        next.updatedAt = new Date().toISOString();

        setDraft(next);
    };

    const setField = <K extends keyof Form34BResultDraft>(field: K, value: Form34BResultDraft[K]) => {
        if (!draft) return;
        const next: Form34BResultDraft = {
            ...draft,
            [field]: value,
            lastSavedAt: Date.now(),
            updatedAt: new Date().toISOString(),
        };
        setDraft(next);
    };

    const validate = (): string | null => {
        if (!draft) return "No draft";
        for (const e of draft.entries) {
            const v = Number(e.votes);
            if (!Number.isInteger(v) || v < 0) return "Votes must be non-negative whole numbers.";
        }
        const r = Number(draft.rejectedVotes ?? 0);
        if (!Number.isInteger(r) || r < 0) return "Rejected votes must be a non-negative whole number.";
        return null;
    };

    const buildEntriesFromCandidates = () => {
        if (!draft) throw new Error("No draft");
        const entries = candidates.map((c: Candidate, idx: number) => {
            const idNum = Number(c.id);
            if (!Number.isInteger(idNum) || idNum <= 0) {
                throw new Error(`Invalid candidate id "${c.id}" at index ${idx}`);
            }
            const votes = Math.max(0, Math.floor(Number(draft.entries[idx]?.votes ?? 0)));
            return { candidate_id: idNum, votes };
        });

        const seen = new Set(entries.map((e) => e.candidate_id));
        if (seen.size !== entries.length) {
            throw new Error("Duplicate or missing candidate IDs in submission.");
        }

        return entries;
    };

    const handleSave = async () => {
        if (!draft) return;
        const v = validate();
        if (v) return setError(v);

        setSaving(true);
        try {
            // Optional server-side draft save (keeps form34b_id for future updates)
            try {
                const entries = buildEntriesFromCandidates();

                const resp = await postJSON<Save34BResponse | null>(
                    "https://skizagroundsuite.com/API/president/save_pres_34b.php",
                    {
                        const_code: draft.constituencyId,
                        entries,
                        rejected_votes: Math.max(0, Math.floor(Number(draft.rejectedVotes) || 0)),
                        source_mode: "manual_from_34B",
                        status: "draft",
                        review_notes: draft.remarks ?? null,
                        ...(draft.form34bId ? { form34b_id: Number(draft.form34bId) } : {}),
                    }
                );

                if (!resp) throw new Error("Draft sync failed: server returned no response.");

                const next: Form34BResultDraft = {
                    ...draft,
                    lastSavedAt: Date.now(),
                    updatedAt: new Date().toISOString(),
                    form34bId: resp.form34b_id,
                };

                write34BDraft(next);
                setDraft(next);
                onSaved(next);
                setError(null);
            } catch (e: any) {
                // Local-only save fallback
                const localNext: Form34BResultDraft = {
                    ...draft,
                    lastSavedAt: Date.now(),
                    updatedAt: new Date().toISOString(),
                };
                write34BDraft(localNext);
                setDraft(localNext);
                onSaved(localNext);
                setError(`Saved locally. Draft sync failed: ${e?.message || String(e)}`);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitToServer = async () => {
        if (!draft) return;
        const v = validate();
        if (v) return setError(v);

        setSubmitting(true);
        try {
            const entries = buildEntriesFromCandidates();

            const payload: any = {
                const_code: draft.constituencyId,
                entries,
                rejected_votes: Math.max(0, Math.floor(Number(draft.rejectedVotes) || 0)),
                stations_expected: null,
                stations_reported: null,
                registered_voters_sum: null,
                source_mode: "manual_from_34B",
                compiled_by_agent_id: null,
                status: "submitted",
                review_notes: draft.remarks ?? null,
                ...(draft.form34bId ? { form34b_id: Number(draft.form34bId) } : {}),
            };

            const resp = await postJSON<Save34BResponse | null>(
                "https://skizagroundsuite.com/API/president/save_pres_34b.php",
                payload
            );

            if (!resp) throw new Error("Submission failed: server returned no response.");

            const submitted: Form34BResultDraft = {
                ...draft,
                submitted: true,
                lastSavedAt: Date.now(),
                updatedAt: new Date().toISOString(),
                form34bId: resp.form34b_id,
            };

            write34BDraft(submitted);
            setDraft(submitted);
            onSubmitted(submitted);
            setError(null);
            onClose();
        } catch (e: any) {
            const msg = String(e?.message || e);
            if (msg.toLowerCase().includes("locked")) {
                setError("This Form 34B is locked and can’t be edited.");
            } else {
                setError(msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ===== OCR handlers =====
    const handleOcrButtonClick = () => {
        if (!fileInputRef.current) return;
        fileInputRef.current.value = ""; // allow same file re-select
        fileInputRef.current.click();
    };

    const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !draft || !constituency) return;

        // Frontend validation: images only
        if (!isValidOcrFile(file)) {
            setError("Unsupported file type. Please upload a Form 34B image (JPG, JPEG, PNG or WEBP).");
            return;
        }

        setError(null);
        setOcrInfo(null);
        setOcrLoading(true);
        try {
            // IMPORTANT: use constituencyId (not constituencyCode)
            const ocr = await upload34BForOCR(file, String(draft.constituencyId));
            const updated = apply34BOcrToDraft(draft, ocr, candidates);

            const next: Form34BResultDraft = {
                ...updated,
                lastSavedAt: Date.now(),
                updatedAt: new Date().toISOString(),
            };

            setDraft(next);
            write34BDraft(next);

            const notesPieces: string[] = [];
            if ((ocr as any).county_name || (ocr as any).constituency_name) {
                notesPieces.push(
                    `Detected: ${(ocr as any).county_name || "?"} / ${(ocr as any).constituency_name || "?"}`
                );
            }
            if ((ocr as any).notes) notesPieces.push((ocr as any).notes);

            setOcrInfo(
                notesPieces.length ? notesPieces.join(" | ") : "OCR completed. Please review numbers before submitting."
            );
        } catch (err: any) {
            setError(err?.message || "OCR failed. Please try again.");
        } finally {
            setOcrLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Summarize /> Enter Form 34B — {constituency?.name} ({countyName})
                <Box sx={{ flexGrow: 1 }} />
                <IconButton onClick={onClose}>
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {!draft ? (
                    <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ display: "grid", gap: 2 }}>
                        {error && <Alert severity="error">{error}</Alert>}
                        {ocrInfo && <Alert severity="info">{ocrInfo}</Alert>}

                        {/* OCR Upload block */}
                        <Card variant="outlined" sx={{ p: 2 }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                    gap: 2,
                                }}
                            >
                                <Typography variant="subtitle2">
                                    Upload scanned Form 34B (Image) to auto-fill totals:
                                </Typography>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    style={{ display: "none" }}
                                    onChange={handleOcrFileChange}
                                />

                                <Button
                                    variant="outlined"
                                    startIcon={<CloudUpload />}
                                    onClick={handleOcrButtonClick}
                                    disabled={ocrLoading}
                                    size="small"
                                >
                                    {ocrLoading ? "Running OCR…" : "Upload 34B (OCR)"}
                                </Button>
                            </Box>

                            <Typography variant="caption" color="text.secondary">
                                OCR will try to read candidate totals, rejected votes and the returning officer details.
                                You can still edit any field before submitting.
                            </Typography>
                        </Card>

                        <Grid container spacing={2}>
                            {candidates.map((c: Candidate, idx: number) => (
                                <Grid item xs={12} sm={6} md={4} key={`${c.id}-${idx}`}>
                                    <TextField
                                        type="number"
                                        label={`${c.name}${c.party ? ` (${c.party})` : ""}`}
                                        value={draft.entries[idx]?.votes ?? 0}
                                        onChange={(e) => setVotesByIndex(idx, e.target.value)}
                                        inputProps={{ min: 0 }}
                                        fullWidth
                                    />
                                </Grid>
                            ))}

                            <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                    type="number"
                                    label="Rejected Votes"
                                    value={Number(draft.rejectedVotes ?? 0)}
                                    onChange={(e) =>
                                        setField(
                                            "rejectedVotes",
                                            Math.max(0, Math.floor(Number(e.target.value) || 0))
                                        )
                                    }
                                    inputProps={{ min: 0 }}
                                    fullWidth
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={8}>
                                <TextField
                                    label="Returning Officer"
                                    value={draft.returningOfficer ?? ""}
                                    onChange={(e) => setField("returningOfficer", e.target.value)}
                                    fullWidth
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={8}>
                                <TextField
                                    label="Form 34B Link / ID (optional)"
                                    value={draft.form34BRef ?? ""}
                                    onChange={(e) => setField("form34BRef", e.target.value)}
                                    fullWidth
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Remarks (optional)"
                                    value={draft.remarks ?? ""}
                                    onChange={(e) => setField("remarks", e.target.value)}
                                    fullWidth
                                    multiline
                                    minRows={2}
                                />
                            </Grid>
                        </Grid>

                        <Card variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                                Totals
                            </Typography>

                            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 1 }}>
                                <Chip label={`Valid: ${totals.valid.toLocaleString()}`} color="primary" />
                                <Chip
                                    label={`Rejected: ${Number(draft.rejectedVotes ?? 0).toLocaleString()}`}
                                    color="warning"
                                />
                                <Chip label={`Total: ${totals.total.toLocaleString()}`} />
                            </Box>
                        </Card>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button startIcon={<Save />} onClick={handleSave} disabled={!draft || saving || ocrLoading}>
                    {saving ? "Saving…" : "Save Draft"}
                </Button>

                <Button
                    variant="contained"
                    startIcon={<CheckCircle />}
                    onClick={handleSubmitToServer}
                    disabled={!draft || submitting || ocrLoading}
                >
                    {submitting ? "Submitting…" : "Submit 34B"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
