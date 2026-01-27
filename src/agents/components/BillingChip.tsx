import { Chip } from "@mui/material";
import type { BillingStatus } from "../utils/types";

export function BillingChip({ status }: { status: BillingStatus }) {
    if (status === "pending")
        return (
            <Chip size="small" label="PENDING" color="warning" variant="filled" />
        );

    if (status === "billed")
        return <Chip size="small" label="BILLED" color="info" variant="filled" />;

    if (status === "paid")
        return (
            <Chip size="small" label="PAID" color="success" variant="filled" />
        );

    return <Chip size="small" label="UNKNOWN" variant="outlined" />;
}
