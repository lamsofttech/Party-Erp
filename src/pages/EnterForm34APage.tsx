import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    LinearProgress,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import {
    CheckCircle,
    CloudUpload,
    ArrowBack,
    HowToVote,
    Save,
} from "@mui/icons-material";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import type { Candidate, PollingStation, StationResultDraft } from "../utils/storage";
import { writeDraft } from "../utils/storage";
import { apply34AOcrToDraft, isValidOcrFile, upload34AForOCR } from "../utils/ocr34a";
import { useUser } from "../contexts/UserContext";

type LocationState = {
    station?: PollingStation | null;
    candidates?: Candidate[];
};

const EnterForm34APage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const navigate = useNavigate();
    const { stationId } = useParams();
    const { user } = useUser();

    const { state } = useLocation() as { state?: LocationState };
    const station = state?.station ?? null;
    const candidates = state?.candidates ?? [];

    const [draft, setDraft] = useState<StationResultDraft | null>(null);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // 34A OCR state
    const [ocrLoadingA, setOcrLoadingA] = useState(false);
    const [ocrInfoA, setOcrInfoA] = useState<string | null>(null);
    const fileInputRefA = useRef<HTMLInputElement | null>(null);

    // Submission state
    const [showSubmittedDialog, setShowSubmittedDialog] = useState(false);
    const [alreadySubmitted, setAlreadySubmitted] = useState(false);

    // Same auth token logic as other pages
    const authToken =
        (user as any)?.token ||
        localStorage.getItem("jwt_token") ||
        localStorage.getItem("token");

    // Draft storage key for this station
    const draftKey = station ? `form34a_draft_${station.id}` : "form34a_draft_unknown";

    // If we have no station or no candidates, show a friendly error
    useEffect(() => {
        if (!station || candidates.length === 0) {
            setError(
                "Missing station or candidate details. Please reopen this page from the results dashboard."
            );
        }
    }, [station, candidates.length]);

    // Check on mount if this station is already submitted (from any previous session)
    useEffect(() => {
        if (!station) return;
        const key = `results_submitted_${station.id}`;
        const isSubmitted = localStorage.getItem(key) === "1";
        if (isSubmitted) setAlreadySubmitted(true);
    }, [station]);

    useEffect(() => {
        if (!station || candidates.length === 0) return;
        if (alreadySubmitted) return;

        // Build a fresh draft when page mounts for a given station
        const fresh: StationResultDraft = {
            stationId: station.id,
            formType: "34A",
            updatedAt: new Date().toISOString(),
            entries: candidates.map((c: Candidate) => ({
                // keep candidateId as string|number (matches storage.ts)
                candidateId: c.id,
                votes: 0,
            })),
            rejected: 0,
            disputed: false,
        };

        setDraft(fresh);
        setError(null);
        setOcrInfoA(null);
        setSuccess(null);
        setShowSubmittedDialog(false);

        // persist initial draft
        writeDraft(draftKey, fresh);
    }, [station, candidates, alreadySubmitted, draftKey]);

    const totals = useMemo(() => {
        if (!draft) return { valid: 0, total: 0, turnout: 0 };

        const valid = draft.entries.reduce((s, e) => s + (Number(e.votes) || 0), 0);
        const rejected = Number(draft.rejected) || 0;
        const total = valid + rejected;

        // turnout not computable without registered voters (not in shared type)
        return { valid, total, turnout: 0 };
    }, [draft]);

    // Keep updatedAt + persist when totals change (lightweight)
    useEffect(() => {
        if (!draft) return;

        const next: StationResultDraft = {
            ...draft,
            updatedAt: new Date().toISOString(),
        };

        setDraft(next);
        writeDraft(draftKey, next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totals.valid, totals.total]);

    const setVotesByIndex = (idx: number, value: string) => {
        if (!draft) return;

        const safe = Math.max(0, Math.floor(Number(value) || 0));
        const next: StationResultDraft = { ...draft, entries: draft.entries.slice() };

        if (!next.entries[idx]) {
            next.entries[idx] = {
                candidateId: candidates[idx]?.id ?? 0,
                votes: 0,
            };
        }

        next.entries[idx] = { ...next.entries[idx], votes: safe };
        next.updatedAt = new Date().toISOString();

        setDraft(next);
        writeDraft(draftKey, next);
        setSuccess(null);
    };

    const setField = (field: keyof StationResultDraft, value: any) => {
        if (!draft) return;
        const next: StationResultDraft = { ...draft, [field]: value, updatedAt: new Date().toISOString() };
        setDraft(next);
        writeDraft(draftKey, next);
        setSuccess(null);
    };

    const validate = (): string | null => {
        if (!draft) return "No draft";
        for (const e of draft.entries) {
            if (!Number.isInteger(e.votes) || e.votes < 0) {
                return "Votes must be non-negative whole numbers.";
            }
        }
        if (!Number.isInteger(draft.rejected ?? 0) || (draft.rejected ?? 0) < 0) {
            return "Rejected votes must be a non-negative whole number.";
        }
        return null;
    };

    const handleSave = async () => {
        if (!draft) return;

        const v = validate();
        if (v) {
            setError(v);
            setSuccess(null);
            return;
        }

        setSaving(true);
        try {
            const next: StationResultDraft = { ...draft, updatedAt: new Date().toISOString() };
            writeDraft(draftKey, next);
            setError(null);
            setSuccess("Draft saved locally.");
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitToServer = async () => {
        if (!draft || alreadySubmitted) return;

        const v = validate();
        if (v) {
            setError(v);
            setSuccess(null);
            return;
        }

        setSubmitting(true);
        try {
            // Build entries from canonical candidates list
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
                rejected_votes: Math.max(0, Math.floor(Number(draft.rejected ?? 0))),
                status: "submitted",
            };

            const resp = await fetch("/API/president/save_pres_results.php", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            if (!resp.ok) {
                const text = await resp.text().catch(() => "");
                throw new Error(
                    `Server error (${resp.status}): ${text || resp.statusText || "Failed to submit results."}`
                );
            }

            // Mark local as submitted
            const submitted: StationResultDraft = { ...draft, updatedAt: new Date().toISOString() };
            writeDraft(draftKey, submitted);

            if (station) localStorage.setItem(`results_submitted_${station.id}`, "1");

            setAlreadySubmitted(true);
            setError(null);
            setSuccess("Results submitted successfully.");
            setShowSubmittedDialog(true);
        } catch (e: any) {
            setError(e?.message || String(e));
            setSuccess(null);
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

        if (!isValidOcrFile(file)) {
            setError("Unsupported file type. Please upload a Form 34A image (JPG, JPEG, PNG or WEBP).");
            setSuccess(null);
            return;
        }

        setError(null);
        setSuccess(null);
        setOcrInfoA(null);
        setOcrLoadingA(true);

        try {
            const ocr = await upload34AForOCR(file, String(draft.stationId));
            const updated = apply34AOcrToDraft(draft as any, ocr as any, candidates as any);

            const updatedDraft: StationResultDraft = {
                ...updated,
                updatedAt: new Date().toISOString(),
            };

            setDraft(updatedDraft);
            writeDraft(draftKey, updatedDraft);

            const notesPieces: string[] = [];
            if ((ocr as any).notes) notesPieces.push((ocr as any).notes);

            setOcrInfoA(
                notesPieces.length
                    ? notesPieces.join(" | ")
                    : "OCR completed. Please review numbers before submitting."
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

    // Missing context
    if (!station || candidates.length === 0) {
        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    bgcolor: "#fafafa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: 2,
                }}
            >
                <Card sx={{ p: 3, maxWidth: 420, width: "100%" }}>
                    <Typography variant="h6" gutterBottom>
                        Missing context
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        We could not find the polling station or candidates for this page. Please go back to
                        the results dashboard and open this page again.
                    </Typography>
                    <Box sx={{ mt: 2, textAlign: "right" }}>
                        <Button variant="contained" onClick={() => navigate(-1)} startIcon={<ArrowBack />}>
                            Go back
                        </Button>
                    </Box>
                </Card>
            </Box>
        );
    }

    // Already submitted – hide form completely
    if (alreadySubmitted) {
        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    bgcolor: "#f5f5f7",
                    py: 3,
                    px: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Card sx={{ p: 3, maxWidth: 480, width: "100%", borderRadius: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1.5, gap: 1 }}>
                        <CheckCircle color="success" />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Results already submitted
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Presidential Form 34A results for <strong>{station.name}</strong> have already been
                        submitted for this polling station.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        If you believe a correction is needed, contact your supervisor or county tally center.
                        You cannot submit this station&apos;s results again from this device.
                    </Typography>
                    <Box sx={{ mt: 3, textAlign: "right", display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
                        <Button startIcon={<ArrowBack />} onClick={() => navigate("/agent")}>
                            Back to Agent Home
                        </Button>
                    </Box>
                </Card>
            </Box>
        );
    }

    // Normal entry form
    return (
        <Box
            sx={{
                minHeight: "100vh",
                bgcolor: "#f5f5f7",
                py: isMobile ? 1.5 : 3,
                px: isMobile ? 1.5 : 3,
            }}
        >
            <Box sx={{ maxWidth: 1000, mx: "auto" }}>
                {/* Header */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        mb: isMobile ? 1.5 : 2,
                        gap: 1.5,
                    }}
                >
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                        <IconButton
                            size={isMobile ? "small" : "medium"}
                            onClick={() => navigate(-1)}
                            sx={{
                                mt: 0.3,
                                bgcolor: "white",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                            }}
                        >
                            <ArrowBack fontSize={isMobile ? "small" : "medium"} />
                        </IconButton>

                        <Box sx={{ minWidth: 0 }}>
                            <Typography
                                variant="overline"
                                sx={{
                                    letterSpacing: 1.5,
                                    color: "text.secondary",
                                    fontSize: 10,
                                }}
                            >
                                PRESIDENTIAL RESULTS ENTRY
                            </Typography>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                <HowToVote fontSize={isMobile ? "small" : "medium"} color="primary" />
                                <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                    {station.name}
                                </Typography>
                            </Box>

                            {stationLine && (
                                <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
                                    {stationLine}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {stationId && (
                        <Chip label={`Station ID: ${stationId}`} size="small" sx={{ alignSelf: "flex-start" }} />
                    )}
                </Box>

                {/* Alerts */}
                <Box sx={{ mb: isMobile ? 1.5 : 2 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 1, fontSize: 13 }}>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert severity="success" sx={{ mb: 1, fontSize: 13 }}>
                            {success}
                        </Alert>
                    )}
                    {ocrInfoA && (
                        <Alert severity="info" sx={{ mb: 1, fontSize: 13 }}>
                            {ocrInfoA}
                        </Alert>
                    )}
                </Box>

                {!draft ? (
                    <Box sx={{ py: 6, display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {/* OCR Block */}
                        <Card
                            variant="outlined"
                            sx={{
                                mb: isMobile ? 1.5 : 2,
                                p: isMobile ? 1.5 : 2,
                                borderRadius: 3,
                            }}
                        >
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
                                OCR will try to read candidate votes and rejected votes. Please confirm and correct any numbers before submitting.
                            </Typography>
                        </Card>

                        {/* Form Grid */}
                        <Card
                            sx={{
                                p: isMobile ? 1.5 : 2,
                                borderRadius: 3,
                                boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
                            }}
                        >
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
                                        value={draft.rejected ?? 0}
                                        onChange={(e) => setField("rejected", Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                                        inputMode="numeric"
                                        inputProps={{ min: 0 }}
                                        fullWidth
                                        size="small"
                                    />
                                </Grid>
                            </Grid>

                            {/* Totals */}
                            <Card
                                variant="outlined"
                                sx={{
                                    mt: isMobile ? 1.5 : 2,
                                    p: isMobile ? 1.5 : 2,
                                    borderRadius: 2,
                                    bgcolor: "#f9fafb",
                                }}
                            >
                                <Typography variant="subtitle1" sx={{ fontWeight: "bold", fontSize: 14, mb: 0.5 }}>
                                    Totals
                                </Typography>
                                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                                    <Chip label={`Valid: ${totals.valid.toLocaleString()}`} color="primary" size={isMobile ? "small" : "medium"} />
                                    <Chip label={`Rejected: ${(draft.rejected ?? 0).toLocaleString()}`} color="warning" size={isMobile ? "small" : "medium"} />
                                    <Chip label={`Total: ${totals.total.toLocaleString()}`} size={isMobile ? "small" : "medium"} />
                                </Box>

                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min(100, totals.total > 0 ? 100 : 0)}
                                    sx={{ mt: 1.5, height: 6, borderRadius: 4 }}
                                />
                            </Card>
                        </Card>

                        {/* Actions */}
                        <Box
                            sx={{
                                mt: isMobile ? 2 : 3,
                                display: "flex",
                                flexDirection: isMobile ? "column-reverse" : "row",
                                alignItems: isMobile ? "stretch" : "center",
                                justifyContent: "flex-end",
                                gap: isMobile ? 1 : 2,
                            }}
                        >
                            <Button
                                startIcon={!isMobile ? <Save /> : undefined}
                                onClick={handleSave}
                                disabled={!draft || saving || ocrLoadingA || submitting}
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
                                startIcon={!isMobile ? <CheckCircle /> : undefined}
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
                        </Box>
                    </>
                )}
            </Box>

            {/* Success dialog after submission */}
            <Dialog
                open={showSubmittedDialog}
                onClose={() => {
                    setShowSubmittedDialog(false);
                    navigate("/agent");
                }}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                    <CheckCircle color="success" fontSize="small" />
                    Results Submitted
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Your Form 34A presidential results for this polling station have been submitted successfully.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        You will now be taken back to your agent home.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setShowSubmittedDialog(false);
                            navigate("/agent");
                        }}
                        variant="contained"
                        color="primary"
                    >
                        Back to Agent Home
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EnterForm34APage;
