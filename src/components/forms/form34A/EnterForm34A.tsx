// src/components/forms/Form34A/EnterForm34A.tsx

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
    LinearProgress,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { CheckCircle, CloudUpload, Close, HowToVote, Save } from "@mui/icons-material";

import { Candidate, PollingStation, StationResultDraft, writeDraft } from "../../../utils/storage";
import { postJSON } from "../../../utils/api";
import { apply34AOcrToDraft, isValidOcrFile, upload34AForOCR } from "../../../utils/ocr34a";

interface EnterForm34AProps {
    open: boolean;
    onClose: () => void;
    station: PollingStation | null;
    candidates: Candidate[];
    onSaved: (draft: StationResultDraft) => void;
    onSubmitted: (draft: StationResultDraft) => void;
}

export const EnterForm34A: React.FC<EnterForm34AProps> = ({
    open,
    onClose,
    station,
    candidates,
    onSaved,
    onSubmitted,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const [draft, setDraft] = useState<StationResultDraft | null>(null);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 34A OCR state
    const [ocrLoadingA, setOcrLoadingA] = useState(false);
    const [ocrInfoA, setOcrInfoA] = useState<string | null>(null);
    const fileInputRefA = useRef<HTMLInputElement | null>(null);

    // Stable storage key per-station
    const draftKey = useMemo(() => {
        if (!station) return "";
        return `form34A:${String(station.id)}`;
    }, [station]);

    useEffect(() => {
        if (!station || candidates.length === 0) return;

        // fresh draft each time dialog opens for a given station
        const nowIso = new Date().toISOString();

        const fresh: StationResultDraft = {
            stationId: station.id,
            stationName: station.name,
            county: station.county,
            constituency: station.constituency,
            ward: station.ward,

            // ✅ candidateId MUST be number
            entries: candidates.map((c: Candidate) => ({
                candidateId: Number(c.id),
                votes: 0,
            })),

            rejectedVotes: 0,

            // 🔹 NEW legal / war-room numeric fields (keep if they exist in your type)
            disputedVotes: 0,
            spoiltVotes: 0,
            totalValid: 0,
            totalVotes: 0,
            registeredVoters: station.registeredVoters,

            // 🔹 NEW legal / war-room text fields (keep if they exist in your type)
            pollingDate: "",
            openingTime: "",
            closingTime: "",
            agentsSigned: "",
            agentsRefused: "",
            refusalReasons: "",

            // ✅ required by StationResultDraft (per your TS2741 error)
            updatedAt: nowIso,
        };

        setDraft(fresh);
        setError(null);
        setOcrInfoA(null);
    }, [station, candidates]);

    const totals = useMemo(() => {
        if (!draft) return { valid: 0, total: 0, turnout: 0 };

        const valid = draft.entries.reduce((s, e) => s + (Number(e.votes) || 0), 0);
        const rejected = Number(draft.rejectedVotes ?? 0) || 0;
        const total = valid + rejected;

        const denom = Number(draft.registeredVoters ?? 0) || 0;
        const turnout = denom > 0 ? (total / denom) * 100 : 0;

        return { valid, total, turnout: Number.isFinite(turnout) ? turnout : 0 };
    }, [draft]);

    // Keep totals in the draft + persist
    useEffect(() => {
        if (!draft) return;
        if (!draftKey) return;

        const next: StationResultDraft = {
            ...draft,
            totalValid: totals.valid,
            totalVotes: totals.total,
            updatedAt: new Date().toISOString(),
        };

        setDraft(next);
        writeDraft(draftKey, next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totals.valid, totals.total, draftKey]);

    const setVotesByIndex = (idx: number, value: string) => {
        if (!draft) return;

        const safe = Math.max(0, Math.floor(Number(value) || 0));
        const nextEntries = draft.entries.slice();

        if (!nextEntries[idx]) {
            nextEntries[idx] = {
                candidateId: Number(candidates[idx]?.id || 0),
                votes: 0,
            };
        }

        nextEntries[idx] = { ...nextEntries[idx], votes: safe };

        const next: StationResultDraft = {
            ...draft,
            entries: nextEntries,
            updatedAt: new Date().toISOString(),
        };

        setDraft(next);
    };

    const setField = (field: keyof StationResultDraft, value: any) => {
        if (!draft) return;
        setDraft({ ...draft, [field]: value, updatedAt: new Date().toISOString() });
    };

    const validate = (): string | null => {
        if (!draft) return "No draft";

        for (const e of draft.entries) {
            if (!Number.isInteger(e.votes) || e.votes < 0) return "Votes must be non-negative whole numbers.";

            // ✅ candidateId can be string|number in some flows — normalize then validate
            const cid = typeof e.candidateId === "string" ? Number(e.candidateId) : e.candidateId;
            if (!Number.isInteger(cid) || cid <= 0) return "Candidate IDs are invalid. Please refresh.";
        }

        const rejectedVotes = draft.rejectedVotes ?? 0;
        if (!Number.isInteger(rejectedVotes) || rejectedVotes < 0) {
            return "Rejected votes must be a non-negative whole number.";
        }

        // 🔹 validate disputed & spoilt votes as integers (if present in your type)
        const disputedVotes = draft.disputedVotes ?? 0;
        if (!Number.isInteger(disputedVotes) || disputedVotes < 0) {
            return "Disputed votes must be a non-negative whole number.";
        }

        const spoiltVotes = draft.spoiltVotes ?? 0;
        if (!Number.isInteger(spoiltVotes) || spoiltVotes < 0) {
            return "Spoilt ballots must be a non-negative whole number.";
        }

        const reg = Number(draft.registeredVoters ?? 0) || 0;
        if (reg > 0 && totals.total > reg) {
            return "Total votes cannot exceed registered voters.";
        }

        return null;
    };

    const handleSave = async () => {
        if (!draft) return;
        if (!draftKey) return;

        const v = validate();
        if (v) return setError(v);

        setSaving(true);
        try {
            const next: StationResultDraft = { ...draft, updatedAt: new Date().toISOString() };
            writeDraft(draftKey, next);
            onSaved(next);
            setError(null);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitToServer = async () => {
        if (!draft) return;
        if (!draftKey) return;

        const v = validate();
        if (v) return setError(v);

        setSubmitting(true);

        try {
            // Build entries from canonical candidates list to avoid FK issues
            const entries = candidates.map((c: Candidate, idx: number) => {
                const idNum = Number(c.id);
                if (!Number.isInteger(idNum) || idNum <= 0) {
                    throw new Error(`Invalid candidate id "${c.id}" at index ${idx}`);
                }
                const votes = Math.max(0, Math.floor(Number(draft.entries[idx]?.votes ?? 0)));
                return { candidate_id: idNum, votes };
            });

            const payload = {
                station_id: draft.stationId,
                entries,
                rejected_votes: Math.max(0, Math.floor(Number(draft.rejectedVotes ?? 0))),

                // 🔹 NEW legal / war-room numeric fields in payload
                disputed_votes: Math.max(0, Math.floor(Number(draft.disputedVotes ?? 0))),
                spoilt_votes: Math.max(0, Math.floor(Number(draft.spoiltVotes ?? 0))),

                registered_voters_snap: draft.registeredVoters ?? null,
                presiding_officer: draft.presidingOfficer ?? null,
                form34a_serial: draft.form34ARef ?? null,
                remarks: draft.remarks ?? null,

                // 🔹 NEW legal / war-room meta fields in payload
                polling_date: draft.pollingDate || null,
                poll_open_time: draft.openingTime || null,
                poll_close_time: draft.closingTime || null,
                agents_signed: draft.agentsSigned || null,
                agents_refused: draft.agentsRefused || null,
                refusal_reasons: draft.refusalReasons || null,

                status: "submitted",
            };

            await postJSON("https://skizagroundsuite.com/API/president/save_pres_results.php", payload);

            const submitted: StationResultDraft = {
                ...draft,
                submitted: true,
                updatedAt: new Date().toISOString(),
            };

            writeDraft(draftKey, submitted);
            onSubmitted(submitted);
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setSubmitting(false);
        }
    };

    // ===== 34A OCR handlers =====
    const handleOcrButtonClickA = () => {
        if (!fileInputRefA.current) return;
        fileInputRefA.current.value = "";
        fileInputRefA.current.click();
    };

    const handleOcrFileChangeA = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !draft) return;
        if (!draftKey) return;

        // Frontend validation: images only
        if (!isValidOcrFile(file)) {
            setError("Unsupported file type. Please upload a Form 34A image (JPG, JPEG, PNG or WEBP).");
            return;
        }

        setError(null);
        setOcrInfoA(null);
        setOcrLoadingA(true);

        try {
            // ✅ upload34AForOCR expects stationId as string
            const ocr = await upload34AForOCR(file, String(draft.stationId));

            const updatedDraft = apply34AOcrToDraft(
                { ...draft, updatedAt: new Date().toISOString() },
                ocr,
                candidates
            );

            setDraft(updatedDraft);
            writeDraft(draftKey, updatedDraft);

            const notesPieces: string[] = [];
            if (ocr.notes) notesPieces.push(ocr.notes);

            setOcrInfoA(
                notesPieces.length ? notesPieces.join(" | ") : "OCR completed. Please review numbers before submitting."
            );
        } catch (err: any) {
            setError(err?.message || "OCR failed. Please try again.");
        } finally {
            setOcrLoadingA(false);
        }
    };

    const stationLine = station
        ? [station.ward, station.constituency, station.county].filter(Boolean).join(" • ")
        : "";

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
            scroll="paper"
        >
            <DialogTitle
                sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    pr: 1,
                    pb: isMobile ? 0.5 : 1,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <HowToVote fontSize={isMobile ? "small" : "medium"} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant={isMobile ? "subtitle1" : "h6"}
                            sx={{ fontWeight: 600, lineHeight: 1.2 }}
                            noWrap
                        >
                            Enter Presidential Results
                        </Typography>

                        {station && (
                            <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }} noWrap>
                                {station.name}
                            </Typography>
                        )}

                        {stationLine && (
                            <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }} noWrap>
                                {stationLine}
                            </Typography>
                        )}
                    </Box>
                </Box>

                <Box sx={{ flexGrow: 1 }} />

                <IconButton onClick={onClose} edge="end" size={isMobile ? "small" : "medium"}>
                    <Close fontSize={isMobile ? "small" : "medium"} />
                </IconButton>
            </DialogTitle>

            <DialogContent
                dividers
                sx={{
                    px: isMobile ? 1.5 : 3,
                    py: isMobile ? 1.5 : 2.5,
                }}
            >
                {!draft ? (
                    <Box sx={{ py: 6, display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: isMobile ? 1.5 : 2 }}>
                        {error && (
                            <Alert severity="error" sx={{ fontSize: 13 }}>
                                {error}
                            </Alert>
                        )}

                        {ocrInfoA && (
                            <Alert severity="info" sx={{ fontSize: 13 }}>
                                {ocrInfoA}
                            </Alert>
                        )}

                        {/* 34A OCR Upload block */}
                        <Card variant="outlined" sx={{ p: isMobile ? 1.5 : 2, borderRadius: 2 }}>
                            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600 }}>
                                    Upload Form 34A image to auto-fill results
                                </Typography>

                                <input
                                    ref={fileInputRefA}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    style={{ display: "none" }}
                                    onChange={handleOcrFileChangeA}
                                />

                                <Button
                                    variant="outlined"
                                    startIcon={<CloudUpload />}
                                    onClick={handleOcrButtonClickA}
                                    disabled={ocrLoadingA}
                                    size={isMobile ? "small" : "medium"}
                                >
                                    {ocrLoadingA ? "Running OCR…" : "Upload 34A (OCR)"}
                                </Button>
                            </Box>

                            <Typography variant="caption" color="text.secondary">
                                OCR will try to read candidate votes, rejected votes, registered voters and presiding officer details.
                                Please confirm and correct any numbers before submitting.
                            </Typography>
                        </Card>

                        {/* Candidate + meta fields */}
                        <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mt: 0.5 }}>
                            {candidates.map((c: Candidate, idx: number) => (
                                <Grid item xs={12} sm={6} md={4} key={`${c.id}-${idx}`}>
                                    <TextField
                                        type="number"
                                        label={`${c.name}${c.party ? ` (${c.party})` : ""}`}
                                        value={draft.entries[idx]?.votes ?? 0}
                                        onChange={(e) => setVotesByIndex(idx, e.target.value)}
                                        inputMode="numeric"
                                        inputProps={{ min: 0 }}
                                        fullWidth
                                        size="small"
                                    />
                                </Grid>
                            ))}

                            <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                    type="number"
                                    label="Rejected Votes"
                                    value={draft.rejectedVotes ?? 0}
                                    onChange={(e) => setField("rejectedVotes", Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                                    inputMode="numeric"
                                    inputProps={{ min: 0 }}
                                    fullWidth
                                    size="small"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                    type="number"
                                    label="Disputed Votes (if any)"
                                    value={draft.disputedVotes ?? 0}
                                    onChange={(e) => setField("disputedVotes", Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                                    inputMode="numeric"
                                    inputProps={{ min: 0 }}
                                    fullWidth
                                    size="small"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                    type="number"
                                    label="Spoilt Ballots (if any)"
                                    value={draft.spoiltVotes ?? 0}
                                    onChange={(e) => setField("spoiltVotes", Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                                    inputMode="numeric"
                                    inputProps={{ min: 0 }}
                                    fullWidth
                                    size="small"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                    type="number"
                                    label="Registered Voters (optional)"
                                    value={draft.registeredVoters ?? ""}
                                    onChange={(e) =>
                                        setField("registeredVoters", Math.max(0, Math.floor(Number(e.target.value) || 0)))
                                    }
                                    inputMode="numeric"
                                    inputProps={{ min: 0 }}
                                    fullWidth
                                    size="small"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                    label="Presiding Officer"
                                    value={draft.presidingOfficer ?? ""}
                                    onChange={(e) => setField("presidingOfficer", e.target.value)}
                                    fullWidth
                                    size="small"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={8}>
                                <TextField
                                    label="Form 34A Serial / Link (optional)"
                                    value={draft.form34ARef ?? ""}
                                    onChange={(e) => setField("form34ARef", e.target.value)}
                                    fullWidth
                                    size="small"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                    label="Polling Date (YYYY-MM-DD)"
                                    value={draft.pollingDate ?? ""}
                                    onChange={(e) => setField("pollingDate", e.target.value)}
                                    fullWidth
                                    size="small"
                                    placeholder="2027-08-09"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                    label="Opening Time (HH:MM)"
                                    value={draft.openingTime ?? ""}
                                    onChange={(e) => setField("openingTime", e.target.value)}
                                    fullWidth
                                    size="small"
                                    placeholder="06:00"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                    label="Closing Time (HH:MM)"
                                    value={draft.closingTime ?? ""}
                                    onChange={(e) => setField("closingTime", e.target.value)}
                                    fullWidth
                                    size="small"
                                    placeholder="17:00"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Agents who signed (names / parties)"
                                    value={draft.agentsSigned ?? ""}
                                    onChange={(e) => setField("agentsSigned", e.target.value)}
                                    fullWidth
                                    multiline
                                    minRows={isMobile ? 2 : 2}
                                    size="small"
                                    placeholder="e.g. ODM agent – Jane Doe; UDA agent – John Doe"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Agents who refused / absent"
                                    value={draft.agentsRefused ?? ""}
                                    onChange={(e) => setField("agentsRefused", e.target.value)}
                                    fullWidth
                                    multiline
                                    minRows={isMobile ? 2 : 2}
                                    size="small"
                                    placeholder="e.g. Party X agent refused to sign"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Reasons for refusal / dispute (if any)"
                                    value={draft.refusalReasons ?? ""}
                                    onChange={(e) => setField("refusalReasons", e.target.value)}
                                    fullWidth
                                    multiline
                                    minRows={isMobile ? 2 : 3}
                                    size="small"
                                    placeholder="Briefly describe any disputes raised at this polling station."
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Remarks (optional)"
                                    value={draft.remarks ?? ""}
                                    onChange={(e) => setField("remarks", e.target.value)}
                                    fullWidth
                                    multiline
                                    minRows={isMobile ? 2 : 3}
                                    size="small"
                                />
                            </Grid>
                        </Grid>

                        {/* Totals card */}
                        <Card variant="outlined" sx={{ p: isMobile ? 1.5 : 2, borderRadius: 2, mt: 0.5 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: "bold", fontSize: 14, mb: 0.5 }}>
                                Totals
                            </Typography>

                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                                <Chip
                                    label={`Valid: ${totals.valid.toLocaleString()}`}
                                    color="primary"
                                    size={isMobile ? "small" : "medium"}
                                />
                                <Chip
                                    label={`Rejected: ${(draft.rejectedVotes ?? 0).toLocaleString()}`}
                                    color="warning"
                                    size={isMobile ? "small" : "medium"}
                                />
                                <Chip
                                    label={`Disputed: ${(draft.disputedVotes ?? 0).toLocaleString()}`}
                                    size={isMobile ? "small" : "medium"}
                                />
                                <Chip
                                    label={`Spoilt: ${(draft.spoiltVotes ?? 0).toLocaleString()}`}
                                    size={isMobile ? "small" : "medium"}
                                />
                                <Chip
                                    label={`Total (valid + rejected): ${totals.total.toLocaleString()}`}
                                    size={isMobile ? "small" : "medium"}
                                />
                                <Chip
                                    label={`Turnout: ${totals.turnout.toFixed(1)}%`}
                                    color="success"
                                    size={isMobile ? "small" : "medium"}
                                />
                            </Box>

                            {Number(draft.registeredVoters ?? 0) > 0 && (
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min(100, (totals.total / Number(draft.registeredVoters)) * 100)}
                                    sx={{ mt: 1.5, height: 6, borderRadius: 4 }}
                                />
                            )}
                        </Card>
                    </Box>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    px: isMobile ? 1.5 : 3,
                    py: isMobile ? 1 : 1.5,
                    flexDirection: isMobile ? "column-reverse" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                    gap: isMobile ? 1 : 0,
                }}
            >
                <Button
                    startIcon={!isMobile && <Save />}
                    onClick={handleSave}
                    disabled={!draft || saving || ocrLoadingA}
                    sx={{
                        textTransform: "none",
                        fontSize: 13,
                        width: isMobile ? "100%" : "auto",
                    }}
                >
                    {saving ? "Saving…" : "Save Draft"}
                </Button>

                <Button
                    variant="contained"
                    startIcon={!isMobile && <CheckCircle />}
                    onClick={handleSubmitToServer}
                    disabled={!draft || submitting || ocrLoadingA}
                    sx={{
                        textTransform: "none",
                        fontSize: 14,
                        fontWeight: 600,
                        width: isMobile ? "100%" : "auto",
                    }}
                >
                    {submitting ? "Submitting…" : "Submit Results"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
