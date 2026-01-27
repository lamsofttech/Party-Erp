// src/pages/CandidateManagementPage.tsx
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const MotionCard: React.FC<React.PropsWithChildren<{ delay?: number; className?: string }>> = ({
  children,
  delay = 0,
  className = "",
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

const Chip: React.FC<{ label: string; active?: boolean; onClick?: () => void }> = ({
  label,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-sm border transition
      ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white/70 dark:bg-white/10 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-white/5"}`}
  >
    {label}
  </button>
);

const StatCard: React.FC<{ title: string; value: string | number; sub?: string }> = ({
  title,
  value,
  sub,
}) => (
  <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm">
    <p className="text-sm text-gray-500 dark:text-gray-300">{title}</p>
    <p className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-white">{value}</p>
    {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
  </div>
);

const ActionLink: React.FC<{ to: string; label: string; emoji: string; variant?: "primary" | "ghost" }> = ({
  to,
  label,
  emoji,
  variant = "primary",
}) => (
  <Link
    to={to}
    className={
      variant === "primary"
        ? "inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        : "inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    }
  >
    <span>{emoji}</span>
    <span className="font-medium">{label}</span>
  </Link>
);

const CandidateManagementPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Active" | "Pending" | "Rejected">("All");

  // TODO: Replace these with live values from an API
  const stats = useMemo(
    () => [
      { title: "Total Candidates", value: 128, sub: "All positions" },
      { title: "Active", value: 83, sub: "Approved & running" },
      { title: "Pending Review", value: 29, sub: "Need vetting" },
      { title: "Rejected", value: 16, sub: "Not cleared" },
    ],
    []
  );

  return (
    <>
      {/* Skip link for a11y */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <motion.div
        className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-neutral-900 min-h-screen text-gray-800 dark:text-gray-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Candidate Management
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Add, review, and track political candidates across positions and regions.
          </p>

          {/* Quick actions */}
          <div className="mt-4 flex flex-wrap gap-3">
            <ActionLink to="/candidates/new" label="Add Candidate" emoji="➕" />
            <ActionLink to="/candidates" label="View All" emoji="📋" variant="ghost" />
            <ActionLink to="/campaigns/finance" label="Finance" emoji="💳" variant="ghost" />
            <ActionLink to="/outreach" label="Outreach" emoji="📣" variant="ghost" />
            <ActionLink to="/analytics" label="Analytics" emoji="📊" variant="ghost" />
          </div>
        </header>

        <main id="main" className="space-y-8">
          {/* Stats */}
          <MotionCard delay={0.05}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((s, i) => (
                <MotionCard delay={0.06 + i * 0.04} key={s.title} className="h-full">
                  <StatCard title={s.title} value={s.value} sub={s.sub} />
                </MotionCard>
              ))}
            </div>
          </MotionCard>

          {/* Search + Filters */}
          <MotionCard delay={0.1}>
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-md">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, party, or position…"
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-transparent px-4 py-2.5 outline-none ring-0 focus:border-blue-500"
                    aria-label="Search candidates"
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-gray-400">⌘K</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["All", "Active", "Pending", "Rejected"] as const).map((f) => (
                    <Chip key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
                  ))}
                </div>
              </div>

              {/* Suggestion/help row */}
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Tip: Type a county, party, or position (e.g., “Nairobi”, “UDA”, “Senator”).
              </p>
            </div>
          </MotionCard>

          {/* Sections */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <MotionCard delay={0.12}>
              <Link
                to="/candidates"
                className="block h-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🗂️</div>
                  <div>
                    <h3 className="text-lg font-semibold">Candidate Directory</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Browse, filter, and bulk-manage candidate profiles.
                    </p>
                  </div>
                </div>
              </Link>
            </MotionCard>

            <MotionCard delay={0.14}>
              <Link
                to="/candidates/workflows"
                className="block h-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">✅</div>
                  <div>
                    <h3 className="text-lg font-semibold">Vetting & Approvals</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Standardize review steps and track statuses end-to-end.
                    </p>
                  </div>
                </div>
              </Link>
            </MotionCard>

            <MotionCard delay={0.16}>
              <Link
                to="/campaigns/finance"
                className="block h-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💳</div>
                  <div>
                    <h3 className="text-lg font-semibold">Campaign Finance</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Record contributions, expenses, and generate reports.
                    </p>
                  </div>
                </div>
              </Link>
            </MotionCard>

            <MotionCard delay={0.18}>
              <Link
                to="/outreach"
                className="block h-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📣</div>
                  <div>
                    <h3 className="text-lg font-semibold">Voter Outreach</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Coordinate events, messaging, and volunteer engagement.
                    </p>
                  </div>
                </div>
              </Link>
            </MotionCard>

            <MotionCard delay={0.2}>
              <Link
                to="/analytics"
                className="block h-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📊</div>
                  <div>
                    <h3 className="text-lg font-semibold">Performance Analytics</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Track polls, sentiment, and funnel KPIs by region.
                    </p>
                  </div>
                </div>
              </Link>
            </MotionCard>

            <MotionCard delay={0.22}>
              <Link
                to="/settings/roles"
                className="block h-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🛡️</div>
                  <div>
                    <h3 className="text-lg font-semibold">Roles & Permissions</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Control access for admins, staff, and observers.
                    </p>
                  </div>
                </div>
              </Link>
            </MotionCard>
          </section>

          {/* Placeholder list area (optional) */}
          <MotionCard delay={0.24}>
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/10 p-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Start by <Link to="/candidates/new" className="text-blue-600 hover:underline">adding a candidate</Link>, or{" "}
                <Link to="/candidates" className="text-blue-600 hover:underline">open the directory</Link>.
              </p>
            </div>
          </MotionCard>
        </main>
      </motion.div>
    </>
  );
};

export default CandidateManagementPage;
