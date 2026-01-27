export const AGENT_PAYMENTS_PERMISSION = "finance.agent_payments.view";
export const API_BASE = "/API/agent_payments";

export const POLLING_ENDPOINTS = [
    `${API_BASE}/polling_station.php`,
    `${API_BASE}/polling-stations.php`,
];

export async function safeFetch(url: string, init?: RequestInit) {
    const res = await fetch(url, init);
    let json: any = null;
    let text = "";
    try {
        json = await res.json();
    } catch {
        try {
            text = await res.text();
        } catch {
            text = "";
        }
    }
    return { res, ok: res.ok, status: res.status, json, text };
}
