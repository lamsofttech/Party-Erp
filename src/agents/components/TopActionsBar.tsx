"use client";

import React from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Tooltip,
} from "@mui/material";
import { RefreshCcw, CheckCircle2 } from "lucide-react";
import type { BillFilter } from "../utils/types";

type ActionPayload = { amount: number; comment: string };
type QueuePayload = { amount?: number; comment: string };

export function TopActionsBar(props: {
    billFilter: BillFilter;
    setBillFilter: (v: BillFilter) => void;
    loading: boolean;
    submitting: boolean;
    selectedCount: number;
    hasRows: boolean;

    onRefresh: () => void;

    // CHANGED: these now receive payloads
    onAllocateSelected: (payload: ActionPayload) => void;
    onAllocateAllFiltered: (payload: ActionPayload) => void;

    onQueueSelected: (payload: QueuePayload) => void;
    onQueueAllPending: (payload: QueuePayload) => void;

    onMarkPaid: (payload: ActionPayload) => void;
}) {
    const disabled = props.loading || props.submitting;

    // ----------------------------
    // Allocate modal state
    // ----------------------------
    const [allocOpen, setAllocOpen] = React.useState(false);
    const [allocMode, setAllocMode] = React.useState<"selected" | "all">("selected");
    const [allocAmount, setAllocAmount] = React.useState<string>("");
    const [allocComment, setAllocComment] = React.useState<string>("");
    const [allocTouched, setAllocTouched] = React.useState(false);

    const allocAmountNum = Number(allocAmount);
    const allocAmountValid = Number.isFinite(allocAmountNum) && allocAmountNum > 0;

    const openAllocate = (mode: "selected" | "all") => {
        setAllocMode(mode);
        setAllocTouched(false);
        setAllocAmount("");
        setAllocComment("");
        setAllocOpen(true);
    };

    const submitAllocate = () => {
        setAllocTouched(true);
        if (!allocAmountValid) return;

        const payload: ActionPayload = { amount: allocAmountNum, comment: allocComment.trim() };

        if (allocMode === "selected") props.onAllocateSelected(payload);
        else props.onAllocateAllFiltered(payload);

        setAllocOpen(false);
    };

    // ----------------------------
    // Queue modal state
    // ----------------------------
    const [queueOpen, setQueueOpen] = React.useState(false);
    const [queueMode, setQueueMode] = React.useState<"selected" | "all">("selected");
    const [queueAmount, setQueueAmount] = React.useState<string>("");
    const [queueComment, setQueueComment] = React.useState<string>("");
    const [queueTouched, setQueueTouched] = React.useState(false);

    const queueAmountStr = queueAmount.trim();
    const queueAmountNum = queueAmountStr ? Number(queueAmountStr) : undefined;
    const queueAmountValid = queueAmountStr === "" || (Number.isFinite(queueAmountNum) && (queueAmountNum ?? 0) >= 0);

    const openQueue = (mode: "selected" | "all") => {
        setQueueMode(mode);
        setQueueTouched(false);
        setQueueAmount("");
        setQueueComment("");
        setQueueOpen(true);
    };

    const submitQueue = () => {
        setQueueTouched(true);
        if (!queueAmountValid) return;

        const payload: QueuePayload = {
            amount: queueAmountStr === "" ? undefined : Number(queueAmountStr),
            comment: queueComment.trim(),
        };

        if (queueMode === "selected") props.onQueueSelected(payload);
        else props.onQueueAllPending(payload);

        setQueueOpen(false);
    };

    // ----------------------------
    // Mark Paid modal state
    // ----------------------------
    const [markPaidOpen, setMarkPaidOpen] = React.useState(false);
    const [paidAmount, setPaidAmount] = React.useState<string>("");
    const [paidComment, setPaidComment] = React.useState<string>("");
    const [paidTouched, setPaidTouched] = React.useState(false);

    const paidAmountNum = Number(paidAmount);
    const paidAmountValid = Number.isFinite(paidAmountNum) && paidAmountNum > 0;

    const openMarkPaid = () => {
        setPaidTouched(false);
        setPaidAmount("");
        setPaidComment("");
        setMarkPaidOpen(true);
    };

    const submitMarkPaid = () => {
        setPaidTouched(true);
        if (!paidAmountValid) return;

        props.onMarkPaid({ amount: paidAmountNum, comment: paidComment.trim() });
        setMarkPaidOpen(false);
    };

    return (
        <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                <div className="text-base sm:text-lg font-semibold">Deployed Agents</div>

                <div className="flex flex-wrap items-center gap-2">
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Billing</InputLabel>
                        <Select
                            label="Billing"
                            value={props.billFilter}
                            onChange={(e) => props.setBillFilter(e.target.value as BillFilter)}
                        >
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="billed">Billed</MenuItem>
                            <MenuItem value="paid">Paid</MenuItem>
                        </Select>
                    </FormControl>

                    <Button
                        variant="outlined"
                        onClick={props.onRefresh}
                        disabled={disabled}
                        startIcon={<RefreshCcw size={16} />}
                        className="!border-slate-300 dark:!border-slate-700"
                    >
                        Refresh
                    </Button>

                    {/* Allocate */}
                    <Tooltip title="Allocate only for Pending/Unknown (disabled for Billed/Paid)">
                        <span>
                            <Button
                                variant="contained"
                                disabled={disabled || props.selectedCount === 0}
                                onClick={() => openAllocate("selected")}
                                className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                            >
                                Allocate Selected
                            </Button>
                        </span>
                    </Tooltip>

                    <Button
                        variant="contained"
                        disabled={disabled || !props.hasRows}
                        onClick={() => openAllocate("all")}
                        className="!bg-emerald-900 hover:!bg-emerald-950 !text-white"
                    >
                        Allocate All (Filtered)
                    </Button>

                    {/* Queue */}
                    <Button
                        variant="contained"
                        disabled={disabled || props.selectedCount === 0}
                        onClick={() => openQueue("selected")}
                        className="!bg-purple-600 hover:!bg-purple-700 !text-white"
                    >
                        Queue Selected
                    </Button>

                    <Button
                        variant="contained"
                        disabled={disabled || !props.hasRows}
                        onClick={() => openQueue("all")}
                        className="!bg-slate-900 hover:!bg-slate-800 !text-white"
                    >
                        Queue All Pending
                    </Button>

                    {/* Mark Paid */}
                    <Button
                        variant="contained"
                        disabled={disabled || props.selectedCount === 0}
                        onClick={openMarkPaid}
                        startIcon={<CheckCircle2 size={16} />}
                        className="!bg-emerald-700 hover:!bg-emerald-800 !text-white"
                    >
                        Mark Paid
                    </Button>
                </div>
            </div>

            {/* ----------------------------
          Allocate Modal
      ---------------------------- */}
            <Dialog open={allocOpen} onClose={() => setAllocOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{allocMode === "selected" ? "Allocate Selected" : "Allocate All (Filtered)"}</DialogTitle>
                <DialogContent className="flex flex-col gap-3 !pt-2">
                    <TextField
                        label="Amount (KES)"
                        value={allocAmount}
                        onChange={(e) => setAllocAmount(e.target.value)}
                        type="number"
                        inputProps={{ min: 0, step: "0.01" }}
                        error={allocTouched && !allocAmountValid}
                        helperText={allocTouched && !allocAmountValid ? "Enter a valid amount greater than 0" : " "}
                        fullWidth
                        size="small"
                    />
                    <TextField
                        label="Comment"
                        value={allocComment}
                        onChange={(e) => setAllocComment(e.target.value)}
                        placeholder="Optional comment / reference"
                        fullWidth
                        size="small"
                        multiline
                        minRows={3}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAllocOpen(false)} disabled={disabled}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={submitAllocate} disabled={disabled}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ----------------------------
          Queue Modal
      ---------------------------- */}
            <Dialog open={queueOpen} onClose={() => setQueueOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{queueMode === "selected" ? "Queue Selected" : "Queue All Pending"}</DialogTitle>
                <DialogContent className="flex flex-col gap-3 !pt-2">
                    <TextField
                        label="Amount (optional)"
                        value={queueAmount}
                        onChange={(e) => setQueueAmount(e.target.value)}
                        type="number"
                        inputProps={{ min: 0, step: "0.01" }}
                        error={queueTouched && !queueAmountValid}
                        helperText={queueTouched && !queueAmountValid ? "Amount must be a valid number (>= 0) or empty" : " "}
                        fullWidth
                        size="small"
                    />
                    <TextField
                        label="Comment"
                        value={queueComment}
                        onChange={(e) => setQueueComment(e.target.value)}
                        placeholder="Optional comment / reference"
                        fullWidth
                        size="small"
                        multiline
                        minRows={3}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setQueueOpen(false)} disabled={disabled}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={submitQueue} disabled={disabled}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ----------------------------
          Mark Paid Modal
      ---------------------------- */}
            <Dialog open={markPaidOpen} onClose={() => setMarkPaidOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Mark Paid</DialogTitle>
                <DialogContent className="flex flex-col gap-3 !pt-2">
                    <TextField
                        label="Amount"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        type="number"
                        inputProps={{ min: 0, step: "0.01" }}
                        error={paidTouched && !paidAmountValid}
                        helperText={paidTouched && !paidAmountValid ? "Enter a valid amount greater than 0" : " "}
                        fullWidth
                        size="small"
                    />
                    <TextField
                        label="Comment"
                        value={paidComment}
                        onChange={(e) => setPaidComment(e.target.value)}
                        placeholder="Optional comment / reference"
                        fullWidth
                        size="small"
                        multiline
                        minRows={3}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMarkPaidOpen(false)} disabled={disabled}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={submitMarkPaid} disabled={disabled}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
