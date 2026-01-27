import { useState } from "react";

type CleanupMode = "merge" | "replace";

type DuplicateCandidate = {
    reg_centre_code: string;
    count: number;
};

type InvalidSample = {
    id: number | string;
    reg_centre_code: string;
    error: string;
};

type BatchStats = {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
};

type ValidationData = {
    duplicates?: DuplicateCandidate[];
    invalid_samples?: InvalidSample[];
    stats?: BatchStats;
    // allow extra fields returned by API without breaking typing
    [key: string]: unknown;
};

type ApiResponse = {
    status?: string;
    message?: string;
    error?: string;
    data?: ValidationData;
    [key: string]: unknown;
};

const getErrorMessage = (e: unknown) =>
    e instanceof Error ? e.message : "Something went wrong.";

export default function VoterRegisterCleanup() {
    const [batchId, setBatchId] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [committing, setCommitting] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [data, setData] = useState<ValidationData | null>(null);
    const [message, setMessage] = useState<string>("");

    const safeJson = async (res: Response): Promise<ApiResponse | null> => {
        const text = await res.text();
        try {
            return text ? (JSON.parse(text) as ApiResponse) : null;
        } catch {
            return null;
        }
    };

    const loadDuplicates = async (): Promise<void> => {
        const id = parseInt(batchId, 10);
        if (!id) {
            setError("Please enter a valid batch_id (e.g. 123).");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");
        setData(null);

        try {
            const res = await fetch(
                `/API/voter-register/import__validate.php?batch_id=${id}`,
                {
                    method: "GET",
                    headers: { Accept: "application/json" },
                    credentials: "include",
                }
            );

            const json = await safeJson(res);

            if (!res.ok) {
                const msg =
                    (json && (json.message || json.error)) ||
                    "Failed to load validation results.";
                throw new Error(msg);
            }

            // API returns: { status:"success", data:{ stats, duplicates, invalid_samples, ... } }
            setData((json && json.data) || null);
            setMessage("Validation loaded.");
        } catch (e: unknown) {
            setError(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    const commitCleanup = async (mode: CleanupMode): Promise<void> => {
        const id = parseInt(batchId, 10);
        if (!id) {
            setError("Please enter a valid batch_id (e.g. 123).");
            return;
        }

        setCommitting(true);
        setError("");
        setMessage("");

        try {
            const res = await fetch(
                `/API/voter-register/import__commit.php?batch_id=${id}&mode=${encodeURIComponent(
                    mode
                )}`,
                {
                    method: "POST",
                    headers: { Accept: "application/json" },
                    credentials: "include",
                }
            );

            const json = await safeJson(res);

            if (!res.ok) {
                const msg = (json && (json.message || json.error)) || "Commit failed.";
                throw new Error(msg);
            }

            setMessage((json && json.message) || `Commit complete (${mode}).`);

            // Refresh validation results after commit
            await loadDuplicates();
        } catch (e: unknown) {
            setError(getErrorMessage(e));
        } finally {
            setCommitting(false);
        }
    };

    const duplicates: DuplicateCandidate[] = data?.duplicates ?? [];
    const invalidSamples: InvalidSample[] = data?.invalid_samples ?? [];
    const stats: BatchStats | null = data?.stats ?? null;

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-lg font-semibold text-gray-900">
                Duplicates & Cleanup
            </h1>
            <p className="text-sm text-gray-600 mt-1">
                Detect duplicates and validate imported staging data, then merge into
                snapshots.
            </p>

            <div className="mt-4 rounded-xl border bg-white p-4">
                <div className="flex flex-col gap-3 max-w-2xl">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-800">
                            Batch ID
                        </label>
                        <input
                            value={batchId}
                            onChange={(e) => setBatchId(e.target.value)}
                            placeholder="e.g. 123"
                            className="rounded-lg border px-3 py-2 text-sm"
                        />
                        <div className="text-xs text-gray-500">
                            Uses:{" "}
                            <b>GET /API/voter-register/import__validate.php?batch_id=...</b>{" "}
                            and{" "}
                            <b>
                                POST /API/voter-register/import__commit.php?batch_id=...&mode=merge
                            </b>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={loadDuplicates}
                            disabled={loading}
                            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                            {loading ? "Loading..." : "Load Duplicates / Validation"}
                        </button>

                        <button
                            type="button"
                            onClick={() => commitCleanup("merge")}
                            disabled={committing}
                            className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50"
                        >
                            {committing ? "Committing..." : "Commit (Merge)"}
                        </button>

                        <button
                            type="button"
                            onClick={() => commitCleanup("replace")}
                            disabled={committing}
                            className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50"
                        >
                            {committing ? "Committing..." : "Commit (Replace)"}
                        </button>
                    </div>

                    {error ? <div className="text-sm text-red-600">{error}</div> : null}

                    {message ? (
                        <div className="text-sm text-green-700">{message}</div>
                    ) : null}

                    {stats ? (
                        <div className="rounded-lg border bg-white p-3 text-sm">
                            <div className="font-medium text-gray-900 mb-1">Batch Stats</div>
                            <div className="text-gray-700">
                                Total rows: <b>{stats.total_rows}</b> • Valid:{" "}
                                <b>{stats.valid_rows}</b> • Invalid:{" "}
                                <b>{stats.invalid_rows}</b>
                            </div>
                        </div>
                    ) : null}

                    <div className="rounded-lg border p-3">
                        <div className="text-sm font-medium text-gray-900">
                            Duplicate Candidates (top 50 by reg_centre_code)
                        </div>
                        {duplicates.length === 0 ? (
                            <div className="text-sm text-gray-500 mt-2">
                                No duplicates loaded (or none found).
                            </div>
                        ) : (
                            <ul className="mt-2 space-y-1 text-sm">
                                {duplicates.map((d, idx) => (
                                    <li
                                        key={`${d.reg_centre_code}-${idx}`}
                                        className="flex items-center justify-between border-b py-1 last:border-b-0"
                                    >
                                        <span className="text-gray-800">{d.reg_centre_code}</span>
                                        <span className="text-gray-600">
                                            count: <b>{d.count}</b>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-lg border p-3">
                        <div className="text-sm font-medium text-gray-900">
                            Invalid Samples (up to 200)
                        </div>
                        {invalidSamples.length === 0 ? (
                            <div className="text-sm text-gray-500 mt-2">
                                No invalid samples loaded (or none found).
                            </div>
                        ) : (
                            <ul className="mt-2 space-y-2 text-sm">
                                {invalidSamples.slice(0, 30).map((x) => (
                                    <li key={String(x.id)} className="rounded-md border p-2">
                                        <div className="text-gray-800">
                                            <b>#{x.id}</b> • {x.reg_centre_code}
                                        </div>
                                        <div className="text-gray-600 mt-1">{x.error}</div>
                                    </li>
                                ))}
                                {invalidSamples.length > 30 ? (
                                    <div className="text-xs text-gray-500">
                                        Showing 30 of {invalidSamples.length}…
                                    </div>
                                ) : null}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
