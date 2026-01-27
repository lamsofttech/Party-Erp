import { useEffect, useMemo, useState } from "react";


type VoterRow = {
    id?: string;
    voter_id?: string;
    name?: string;
    full_name?: string;
    ward?: string;
    ward_name?: string;
    pollingStation?: string;
    station?: string;
    station_name?: string;
};

export default function VoterRegisterSearch() {
    const [q, setQ] = useState<string>("");
    const [rows, setRows] = useState<VoterRow[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const safeJson = async (res: Response): Promise<any> => {
        const text = await res.text();
        try {
            return text ? JSON.parse(text) : null;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        const query = q.trim();
        if (!query) {
            setRows([]);
            setError("");
            return;
        }

        const controller = new AbortController();
        const t = window.setTimeout(async () => {
            setLoading(true);
            setError("");

            try {
                const res = await fetch(
                    `/api/v1/voter-register/voters?q=${encodeURIComponent(query)}`,
                    {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                        signal: controller.signal,
                    }
                );

                const data = await safeJson(res);

                if (!res.ok) {
                    throw new Error(
                        (data && (data.message || data.error)) ||
                        "Search failed."
                    );
                }

                const list =
                    (data && (data.data || data.results || data.voters)) ||
                    (Array.isArray(data) ? data : []);

                setRows(Array.isArray(list) ? (list as VoterRow[]) : []);
            } catch (e: any) {
                if (e?.name !== "AbortError") {
                    setError(e?.message || "Something went wrong.");
                }
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            window.clearTimeout(t);
            controller.abort();
        };
    }, [q]);

    const results = useMemo(() => rows, [rows]);

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-lg font-semibold text-gray-900">Register Search</h1>
            <p className="text-sm text-gray-600 mt-1">
                Search voters by name/ID and filter by geography.
            </p>

            <div className="mt-4 max-w-3xl">
                <div className="rounded-xl border bg-white p-4">
                    <label className="text-xs font-semibold text-gray-700">Search</label>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Type name or voter ID..."
                        className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    />

                    <div className="mt-4 border-t pt-4">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Results</div>

                        {!q.trim() ? (
                            <div className="text-sm text-gray-500">Enter a query to see results.</div>
                        ) : loading ? (
                            <div className="text-sm text-gray-500">Searching…</div>
                        ) : error ? (
                            <div className="text-sm text-red-600">{error}</div>
                        ) : results.length === 0 ? (
                            <div className="text-sm text-gray-500">No matches found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-gray-600">
                                        <tr>
                                            <th className="text-left py-2">Voter ID</th>
                                            <th className="text-left py-2">Name</th>
                                            <th className="text-left py-2">Ward</th>
                                            <th className="text-left py-2">Polling Station</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((r, idx) => (
                                            <tr
                                                key={String(r.id || r.voter_id || idx)}
                                                className="border-t"
                                            >
                                                <td className="py-2">{r.id || r.voter_id || "-"}</td>
                                                <td className="py-2">{r.name || r.full_name || "-"}</td>
                                                <td className="py-2">{r.ward || r.ward_name || "-"}</td>
                                                <td className="py-2">
                                                    {r.pollingStation || r.station || r.station_name || "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                    API: <b>GET /api/v1/voter-register/voters?q=...</b>
                </p>
            </div>
        </div>
    );
}
