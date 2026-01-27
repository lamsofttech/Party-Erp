// src/pages/CandidateManagementPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// If you use lucide-react, you can swap these with Lucide icons.
// Using simple inline SVGs here to avoid extra deps.
const IconUserPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconClipboardPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M9 7h6M12 10v6M9 13h6" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" />
    <path d="M7 15l4-4 4 3 5-6" stroke="currentColor" strokeWidth="2" />
  </svg>
);

type Candidate = {
  id: number;
  name: string;
  position: string;
  ward: string;
  constituency: string;
  status: "Active" | "Pending" | "Inactive";
};

const MOCK: Candidate[] = [
  { id: 101, name: "Jane Mwangi", position: "MCA", ward: "Kileleshwa", constituency: "Dagoretti North", status: "Active" },
  { id: 102, name: "Peter Otieno", position: "MP", ward: "Nyalenda", constituency: "Kisumu East", status: "Pending" },
  { id: 103, name: "Amina Yusuf", position: "Women Rep", ward: "Mvita", constituency: "Mombasa", status: "Active" },
  { id: 104, name: "John Kiptoo", position: "Senator", ward: "Kapsoya", constituency: "Uasin Gishu", status: "Inactive" },
];

const statusBadge = (s: Candidate["status"]) => {
  const map = {
    Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Pending: "bg-amber-100 text-amber-800 border-amber-200",
    Inactive: "bg-rose-100 text-rose-700 border-rose-200",
  } as const;
  return map[s] || "bg-gray-100 text-gray-700 border-gray-200";
};

const KPICard = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-1 text-3xl font-extrabold text-gray-900">{value}</p>
    {sub ? <p className="mt-1 text-xs text-gray-500">{sub}</p> : null}
  </div>
);

const QuickAction = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
  >
    <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        {icon}
      </span>
      {label}
    </span>
    <span
      aria-hidden
      className="ml-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition group-hover:bg-indigo-600 group-hover:text-white"
    >
      →
    </span>
  </button>
);

const CandidateManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Candidate[]>([]);

  useEffect(() => {
    // simulate initial load; replace with real fetch when API is ready
    const t = setTimeout(() => {
      setRows(MOCK);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) =>
      `${c.name} ${c.position} ${c.ward} ${c.constituency} ${c.status}`
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  const total = rows.length;
  const active = rows.filter((c) => c.status === "Active").length;
  const pending = rows.filter((c) => c.status === "Pending").length;

  return (
    <motion.div
      className="min-h-screen bg-gray-50 text-gray-800"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 16px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      initial={prefersReduced ? undefined : { opacity: 0, y: 8 }}
      animate={prefersReduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="mx-auto max-w-7xl px-4 pb-8">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Candidate Management
            </h1>
            <p className="mt-1 text-gray-600">
              Manage candidate profiles, campaigns, and performance analytics.
            </p>
          </div>

          {/* Search */}
          <div className="w-full sm:w-auto">
            <label className="sr-only" htmlFor="candidate-search">
              Search candidates
            </label>
            <input
              id="candidate-search"
              type="search"
              inputMode="search"
              placeholder="Search candidates…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-[16px] shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:min-w-[280px]"
            />
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-3">
          <KPICard label="Total Candidates" value={`${total}`} sub="Across all positions" />
          <KPICard label="Active" value={`${active}`} sub="Approved & visible" />
          <KPICard label="Pending" value={`${pending}`} sub="Awaiting review" />
        </div>

        {/* Quick actions */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickAction
            icon={<IconUserPlus />}
            label="Register Candidate"
            onClick={() => navigate("/candidates/new")}
          />
          <QuickAction
            icon={<IconClipboardPlus />}
            label="Create Campaign"
            onClick={() => navigate("/campaigns/new")}
          />
          <QuickAction
            icon={<IconChart />}
            label="Open Analytics"
            onClick={() => navigate("/analytics/candidates")}
          />
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Recent Candidates
            </h2>
            <button
              onClick={() => navigate("/candidates")}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-700 hover:underline"
            >
              View all
            </button>
          </div>

          {/* Loading skeletons */}
          {loading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-gray-200 p-4">
                  <div className="mb-2 h-4 w-2/3 rounded bg-gray-200" />
                  <div className="mb-2 h-3 w-1/2 rounded bg-gray-200" />
                  <div className="h-3 w-1/3 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
              No candidates match your search.
            </div>
          ) : (
            <>
              {/* Cards on mobile */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filtered.map((c) => (
                  <div key={c.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{c.position}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {c.ward}, {c.constituency}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => navigate(`/candidates/${c.id}`)}
                      >
                        View
                      </button>
                      <button
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                        onClick={() => navigate(`/candidates/${c.id}/edit`)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table on desktop */}
              <div className="hidden md:block">
                <div className="overflow-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-gray-50 text-gray-700">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Position</th>
                        <th className="px-4 py-3">Ward</th>
                        <th className="px-4 py-3">Constituency</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                          <td className="px-4 py-3">{c.position}</td>
                          <td className="px-4 py-3">{c.ward}</td>
                          <td className="px-4 py-3">{c.constituency}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                                c.status
                              )}`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => navigate(`/candidates/${c.id}`)}
                              >
                                View
                              </button>
                              <button
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                                onClick={() => navigate(`/candidates/${c.id}/edit`)}
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Roadmap / Upcoming */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Features</h3>
          <ul className="mt-2 list-inside list-disc text-gray-600">
            <li>Candidate Registration Forms</li>
            <li>Campaign Finance Tracking</li>
            <li>Voter Outreach Tools per Candidate</li>
            <li>Performance Analytics</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

export default CandidateManagementPage;
