export type BillingStatus = "pending" | "billed" | "paid" | "unknown";

export type DeployedAgent = {
    id: number | string;
    full_name: string;
    phone?: string;
    region?: string;
    wallet_balance?: number;
    last_allocation_date?: string;
    billing_status?: string;
    lifecycle_status?: string;
    mpesa_number?: string;

    county_id?: number | null;
    constituency_id?: number | null;
    ward_id?: number | null;
    polling_station_id?: number | null;

    county_code?: string | null;
    const_code?: string | null;
    caw_code?: string | null;
    reg_centre_code?: string | null;
};

export type Option = { id: number; name: string; code?: string; extra?: Record<string, any> };

export type BillFilter = "all" | "pending" | "billed" | "paid";
