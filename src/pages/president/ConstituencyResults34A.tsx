// src/pages/president/ConstituencyResults34A.tsx

import React, { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { RequirePermission } from "../../components/RequirePermission";

type Form34AStatus = "draft" | "submitted" | "reviewed" | "locked" | "rejected";

interface CandidateVote {
    candidate_id: number;
    candidate_name: string;
    party_id: number | null;
    votes: number;
}

interface Form34AItem {
    id: number;
    polling_station_id: number;
    polling_station_name?: string | null;
    county_code: string;
    const_code: string;
    caw_code: string;
    form34a_serial: string | null;
    registered_voters_snap: number | null;
    total_valid: number;
    rejected: number;
    total_votes: number;
    status: Form34AStatus;
    review_notes: string | null;
    created_at: string;
    updated_at: string;
    presiding_officer: string | null;
    remarks: string | null;

    // Per-candidate votes
    votes: CandidateVote[];
}

const ConstituencyResults34A: React.FC = () => {
    const { user, token } = useUser();
    const [items, setItems] = useState<Form34AItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<"" | Form34AStatus>("");
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    const toggleRow = (id: number) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const params = new URLSearchParams();
                if (statusFilter) {
                    params.set("status", statusFilter);
                }

                // Prefer context token; fallback to localStorage (in case of refresh)
                const localToken =
                    localStorage.getItem("token") || localStorage.getItem("authToken");
                const effectiveToken = token || localToken || "";

                // Send token in header + query to match PHP extraction
                if (effectiveToken) {
                    params.set("token", effectiveToken);
                }

                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                };

                if (effectiveToken) {
                    headers["Authorization"] = `Bearer ${effectiveToken}`;
                    headers["X-Token"] = effectiveToken;
                }

                const res = await fetch(
                    "/API/results34a-constituency-full.php" +
                    (params.toString() ? `?${params.toString()}` : ""),
                    {
                        method: "GET",
                        headers,
                        credentials: "include", // send cookies too (for prod)
                    }
                );

                const data = await res.json().catch(() => ({}));

                if (res.status === 401) {
                    throw new Error(
                        data.message ||
                        "Unauthorized: invalid or missing token. Please log in again."
                    );
                }

                if (res.status === 403) {
                    throw new Error(
                        data.message ||
                        "You are not authorised to view Constituency Form 34A results."
                    );
                }

                // PHP returns: { status: "success" | "error", data: [...] }
                if (!res.ok || data.status === "error") {
                    throw new Error(
                        data.message || data.error || "Failed to fetch results."
                    );
                }

                // Robust mapping: support both shapes
                // 1) New shape: {header: {...}, votes: [...]}
                // 2) Old shape: {...row, votes?: [...]}
                const rows: Form34AItem[] = (data.data || []).map((row: any) => {
                    const header = row.header ?? row;

                    const votes: CandidateVote[] = Array.isArray(row.votes)
                        ? row.votes.map((v: any) => ({
                            candidate_id: Number(v.candidate_id),
                            candidate_name: String(v.candidate_name ?? ""),
                            party_id:
                                v.party_id === null || v.party_id === undefined
                                    ? null
                                    : Number(v.party_id),
                            votes: Number(v.votes ?? 0),
                        }))
                        : Array.isArray(header.votes)
                            ? header.votes
                            : [];

                    return {
                        id: Number(header.id),
                        polling_station_id: Number(header.polling_station_id),
                        polling_station_name: header.polling_station_name ?? null,
                        county_code: String(header.county_code ?? ""),
                        const_code: String(header.const_code ?? ""),
                        caw_code: String(header.caw_code ?? ""),
                        form34a_serial:
                            header.form34a_serial !== undefined
                                ? header.form34a_serial
                                : null,
                        registered_voters_snap:
                            header.registered_voters_snap !== null &&
                                header.registered_voters_snap !== undefined
                                ? Number(header.registered_voters_snap)
                                : null,
                        total_valid: Number(header.total_valid ?? 0),
                        rejected: Number(header.rejected ?? 0),
                        total_votes: Number(header.total_votes ?? 0),
                        status: header.status as Form34AStatus,
                        review_notes: header.review_notes ?? null,
                        created_at: String(header.created_at ?? ""),
                        updated_at: String(header.updated_at ?? ""),
                        presiding_officer: header.presiding_officer ?? null,
                        remarks: header.remarks ?? null,
                        votes,
                    };
                });

                setItems(rows);
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Failed to fetch results.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [statusFilter, token]);

    const constituencyName =
        user?.constituency_name ||
        user?.county_name ||
        `Constituency ${user?.scope_constituency_id ?? ""}`;

    return (
        <RequirePermission permission="results34a.view">
            <div className="p-6 space-y-4">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Constituency Results – Form 34A
                        </h1>
                        <p className="text-sm text-gray-600">
                            Scoped to:{" "}
                            <span className="font-semibold">{constituencyName}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-700">Filter by status:</label>
                        <select
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter(e.target.value as "" | Form34AStatus)
                            }
                        >
                            <option value="">All</option>
                            <option value="submitted">Submitted</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="locked">Locked</option>
                            <option value="rejected">Rejected</option>
                            <option value="draft">Draft</option>
                        </select>
                    </div>
                </header>

                {loading && (
                    <div className="text-sm text-gray-600">
                        Loading Form 34A results…
                    </div>
                )}

                {error && !loading && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
                        Error: {error}
                    </div>
                )}

                {!loading && !error && items.length === 0 && (
                    <div className="text-sm text-gray-600">
                        No Form 34A records found for your constituency.
                    </div>
                )}

                {!loading && !error && items.length > 0 && (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                        Polling Station
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                        Form 34A Serial
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                        Registered Voters
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                        Valid
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                        Rejected
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                        Total Votes
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                        Status
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                        Last Updated
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((row) => {
                                    const sumCandidateVotes =
                                        row.votes && row.votes.length > 0
                                            ? row.votes.reduce(
                                                (acc, v) => acc + (v.votes || 0),
                                                0
                                            )
                                            : 0;

                                    const hasMismatch =
                                        row.votes &&
                                        row.votes.length > 0 &&
                                        sumCandidateVotes !== row.total_valid;

                                    const isExpanded = expandedRows.has(row.id);

                                    return (
                                        <React.Fragment key={row.id}>
                                            <tr className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-3 py-2">
                                                    <div className="font-medium">
                                                        {row.polling_station_name ||
                                                            `Station #${row.polling_station_id}`}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Code: {row.polling_station_id}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    {row.form34a_serial || (
                                                        <span className="text-gray-400">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {row.registered_voters_snap ?? (
                                                        <span className="text-gray-400">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {row.total_valid}
                                                    {row.votes && row.votes.length > 0 && (
                                                        <div className="text-[0.65rem] text-gray-500">
                                                            Sum of candidates:{" "}
                                                            <span
                                                                className={
                                                                    hasMismatch
                                                                        ? "font-semibold text-red-600"
                                                                        : "font-semibold"
                                                                }
                                                            >
                                                                {sumCandidateVotes}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">{row.rejected}</td>
                                                <td className="px-3 py-2 font-semibold">
                                                    {row.total_votes}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <StatusBadge status={row.status} />
                                                </td>
                                                <td className="px-3 py-2 text-xs text-gray-500">
                                                    {row.updated_at
                                                        ? new Date(row.updated_at).toLocaleString()
                                                        : "-"}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            className="px-2 py-1 rounded-md border text-xs hover:bg-gray-100"
                                                            onClick={() => toggleRow(row.id)}
                                                        >
                                                            {isExpanded
                                                                ? "Hide breakdown"
                                                                : "View breakdown"}
                                                        </button>

                                                        {["submitted", "reviewed"].includes(
                                                            row.status
                                                        ) && (
                                                                <button
                                                                    className="px-2 py-1 rounded-md border text-xs hover:bg-gray-100"
                                                                    onClick={() => {
                                                                        console.log("Review", row.id);
                                                                    }}
                                                                >
                                                                    Review
                                                                </button>
                                                            )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {isExpanded && row.votes && row.votes.length > 0 && (
                                                <tr key={`${row.id}-details`}>
                                                    <td
                                                        className="px-3 py-3 bg-gray-50 border-t border-gray-100"
                                                        colSpan={9}
                                                    >
                                                        <div className="text-xs text-gray-700 mb-2 font-semibold">
                                                            Candidate breakdown for station #
                                                            {row.polling_station_id}
                                                        </div>
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full text-xs border border-gray-200 bg-white rounded-md">
                                                                <thead className="bg-gray-50">
                                                                    <tr>
                                                                        <th className="px-2 py-1 text-left font-semibold text-gray-700">
                                                                            Candidate
                                                                        </th>
                                                                        <th className="px-2 py-1 text-left font-semibold text-gray-700">
                                                                            Party ID
                                                                        </th>
                                                                        <th className="px-2 py-1 text-left font-semibold text-gray-700">
                                                                            Votes
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {row.votes.map((v) => (
                                                                        <tr
                                                                            key={v.candidate_id}
                                                                            className="border-t border-gray-100"
                                                                        >
                                                                            <td className="px-2 py-1">
                                                                                {v.candidate_name}
                                                                            </td>
                                                                            <td className="px-2 py-1">
                                                                                {v.party_id ?? (
                                                                                    <span className="text-gray-400">
                                                                                        -
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-2 py-1 font-semibold">
                                                                                {v.votes}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </RequirePermission>
    );
};

function StatusBadge({ status }: { status: Form34AStatus }) {
    const base =
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
        case "submitted":
            return (
                <span className={`${base} bg-blue-50 text-blue-700`}>Submitted</span>
            );
        case "reviewed":
            return (
                <span className={`${base} bg-amber-50 text-amber-700`}>Reviewed</span>
            );
        case "locked":
            return (
                <span className={`${base} bg-green-50 text-green-700`}>Locked</span>
            );
        case "rejected":
            return (
                <span className={`${base} bg-red-50 text-red-700`}>Rejected</span>
            );
        case "draft":
        default:
            return (
                <span className={`${base} bg-gray-100 text-gray-600`}>Draft</span>
            );
    }
}

export default ConstituencyResults34A;
