// src/components/forms/Form34A/ViewForm34A.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Typography,
} from "@mui/material";
import { Close, Summarize } from "@mui/icons-material";

import { Candidate, PollingStation, StationResultDraft, readDraft } from "../../../utils/storage";

interface ViewForm34AProps {
    open: boolean;
    onClose: () => void;
    station: PollingStation | null;
    candidates: Candidate[];
}

export const ViewForm34A: React.FC<ViewForm34AProps> = ({ open, onClose, station, candidates }) => {
    const [draft, setDraft] = useState<StationResultDraft | null>(null);

    // Must match EnterForm34A key format
    const draftKey = useMemo(() => {
        if (!station) return "";
        return `form34A:${String(station.id)}`;
    }, [station]);

    useEffect(() => {
        if (!station) return;
        if (!draftKey) return;

        setDraft(readDraft<StationResultDraft>(draftKey));
    }, [station, draftKey]);

    if (!station) return null;

    const county = draft?.county ?? "";
    const constituency = draft?.constituency ?? "";
    const ward = draft?.ward ?? "";

    const totalValid = draft?.totalValid ?? 0;
    const rejectedVotes = draft?.rejectedVotes ?? 0;
    const totalVotes = draft?.totalVotes ?? 0;
    const registeredVoters = draft?.registeredVoters ?? 0;

    const turnout = registeredVoters > 0 ? (totalVotes / registeredVoters) * 100 : 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Summarize /> Results Summary — {station.name}
                <Box sx={{ flexGrow: 1 }} />
                <IconButton onClick={onClose}>
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {!draft ? (
                    <Alert severity="info">No saved draft for this station yet.</Alert>
                ) : (
                    <Box sx={{ display: "grid", gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {[county, constituency, ward].filter(Boolean).join(" / ")}
                        </Typography>

                        <Grid container spacing={1} sx={{ mt: 0.5 }}>
                            {candidates.map((c: Candidate, idx: number) => {
                                const votes = draft.entries[idx]?.votes ?? 0;
                                return (
                                    <Grid item xs={12} sm={6} key={`${c.id}-${idx}`}>
                                        <Card variant="outlined" sx={{ p: 1.2 }}>
                                            <Typography variant="subtitle2">
                                                {c.name}
                                                {c.party ? ` (${c.party})` : ""}
                                            </Typography>
                                            <Typography variant="h6">{votes.toLocaleString()}</Typography>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>

                        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 1 }}>
                            <Chip label={`Valid: ${totalValid.toLocaleString()}`} />
                            <Chip label={`Rejected: ${rejectedVotes.toLocaleString()}`} />
                            <Chip label={`Total: ${totalVotes.toLocaleString()}`} />
                            {registeredVoters > 0 ? <Chip label={`Turnout: ${turnout.toFixed(1)}%`} /> : null}
                        </Box>

                        {draft.form34ARef ? (
                            <Alert severity="success" sx={{ mt: 1 }}>
                                Form 34A: {draft.form34ARef}
                            </Alert>
                        ) : null}

                        {draft.submitted ? (
                            <Alert severity="success" sx={{ mt: 1 }}>
                                ✅ Submitted to server
                            </Alert>
                        ) : (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                                Draft only — not yet submitted
                            </Alert>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};
