// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useUser } from "../contexts/UserContext";

const OperationsChart = React.lazy(() => import("../components/OperationsChart.jsx"));

const CARD_CREAM = "#FFF6EC";

// ✅ Mobile-optimized: lighter shadows on phones (heavy shadows are expensive)
const CREAM_CARD_BASE =
  "rounded-3xl border-0 bg-[#FFF6EC] shadow-md sm:shadow-[0_16px_40px_rgba(0,0,0,0.18)]";

// ✅ Avoid recreating main background style every render
const DASH_BG_STYLE: React.CSSProperties = {
  background:
    "radial-gradient(circle at top, #FF5A65 0, #F5333F 45%, #D70E1B 100%)",
};

// ========= Simulated data =========
const totalMobilizationsToday = 870;
const fundsToday = "$124,000";
const newMembers = 320;
const activeDistricts = 28;

const leadershipMessages = [
  "Prioritize ground mobilization in key wards.",
  "Scale digital campaigns for undecided voters.",
  "Align fundraising with field operations.",
  "Support regional teams with quick decisions.",
  "Keep messaging aligned to party values.",
  "Grow youth and volunteer networks.",
  "Review progress against campaign milestones.",
];

// ========= Helpers =========
function useOnScreenOnce<T extends Element>(rootMargin = "160px") {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { root: null, rootMargin, threshold: 0.01 }
    );

    obs.observe(node);
    return () => obs.disconnect();
  }, [rootMargin, visible]);

  return { ref, visible } as const;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts.length) return "JB";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

const TIME_RANGES = ["Today", "This week", "This month"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

type Activity = {
  name: string;
  location: string;
  tag: string;
  tagTone: "neutral" | "success" | "warning" | "purple";
};

const activitiesSeed: Activity[] = [
  { name: "Geoffrey Mwangi", location: "Nainoa County", tag: "Today", tagTone: "neutral" },
  { name: "Janet Wanjiru", location: "Nakuru County", tag: "New Member", tagTone: "success" },
  { name: "Kevin Otieno", location: "Kisumu County", tag: "New Member", tagTone: "success" },
  { name: "Jackson Wafula", location: "Bungoma County", tag: "New Member", tagTone: "success" },
  { name: "Sarah Mwende", location: "Machakos County", tag: "New Member", tagTone: "success" },
  { name: "Thika Town", location: "Kiambu County", tag: "District is active", tagTone: "purple" },
];

function toneClass(tone: Activity["tagTone"]) {
  switch (tone) {
    case "success":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "warning":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "purple":
      return "bg-violet-50 text-violet-700 border-violet-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

const SectionTitle = React.memo(function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3 sm:mb-4">
      <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
        {title}
      </h2>
      {subtitle ? (
        <p className="hidden md:block text-xs sm:text-sm text-white/80 max-w-2xl mt-1">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
});

// =====================================================
// Local UI components
// =====================================================
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type UIButtonVariant = "default" | "outline";
type UIButtonSize = "xs" | "sm" | "md";

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: UIButtonVariant;
    size?: UIButtonSize;
  }
> = React.memo(({ className, variant = "default", size = "md", type = "button", ...props }) => {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold select-none " +
    "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-60 disabled:cursor-not-allowed";

  const sizes: Record<UIButtonSize, string> = {
    xs: "text-xs px-3 py-1",
    sm: "text-sm px-3.5 py-2",
    md: "text-sm px-4 py-2.5",
  };

  const variants: Record<UIButtonVariant, string> = {
    default: "bg-white text-slate-900 border border-white/20 hover:bg-white/90",
    outline: "bg-transparent text-white border border-white/25 hover:bg-white/10",
  };

  return (
    <button
      type={type}
      className={cx(base, "rounded-full", sizes[size], variants[variant], className)}
      {...props}
    />
  );
});

const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement>> = React.memo(
  ({ className, ...props }) => (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        className
      )}
      {...props}
    />
  )
);

const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = React.memo(
  ({ className, ...props }) => <div className={cx("w-full", className)} {...props} />
);

const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = React.memo(
  ({ className, ...props }) => <label className={cx("text-xs", className)} {...props} />
);

// ✅ Mobile-optimized: remove translucent bg (expensive) -> solid bg + normal border
const ActivityRow = React.memo(function ActivityRow({ a }: { a: Activity }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
      <div className="h-10 w-10 rounded-full bg-slate-200 border border-white flex items-center justify-center text-xs font-bold text-slate-700">
        {getInitials(a.name)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-slate-900 truncate">{a.name}</p>
          <span
            className={cx(
              "text-[11px] px-2.5 py-1 rounded-full border font-semibold shrink-0",
              toneClass(a.tagTone)
            )}
          >
            {a.tag}
          </span>
        </div>
        <p className="text-xs text-slate-600 truncate">{a.location}</p>
      </div>
    </div>
  );
});

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("Today");
  const { user } = useUser();
  const prefersReducedMotion = useReducedMotion();

  const { currentDate, dailyMessage } = useMemo(() => {
    const today = new Date();
    return {
      currentDate: today.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      dailyMessage: leadershipMessages[today.getDay()],
    };
  }, []);

  const displayName =
    user?.name ?? (user as any)?.fullName ?? user?.username ?? "Officer";

  const currentRole = (user?.role || "AGENT").toUpperCase();

  const countyName = (user as any)?.county_name ?? (user as any)?.county ?? null;
  const constituencyName =
    (user as any)?.constituency_name ?? (user as any)?.constituency ?? null;
  const wardName = (user as any)?.ward_name ?? (user as any)?.ward ?? null;

  const isNational =
    currentRole === "SUPER_ADMIN" || currentRole === "NATIONAL_OFFICER";
  const isCounty = currentRole === "COUNTY_OFFICER";
  const isConstituency = currentRole === "CONSTITUENCY_OFFICER";
  const isWard = currentRole === "WARD_OFFICER" || currentRole === "AGENT";

  const scopeLabel = useMemo(() => {
    if (isNational) return "National overview – all counties";
    if (isCounty) return countyName ? `County – ${countyName}` : "County – (not set)";
    if (isConstituency) {
      const c = countyName || "county not set";
      const k = constituencyName || "constituency not set";
      return `Constituency – ${k}, ${c}`;
    }
    if (isWard) {
      const w = wardName || "ward not set";
      const k = constituencyName || "constituency not set";
      return `Ward – ${w}, ${k}`;
    }
    return "Jurisdiction not set";
  }, [isNational, isCounty, isConstituency, isWard, countyName, constituencyName, wardName]);

  const metricCards = useMemo(
    () => [
      {
        title: "Mobilizations",
        value: totalMobilizationsToday.toLocaleString(),
        description: "Total field and digital mobilization events logged.",
        accent: "#F5333F",
        iconBg: "#FFECEC",
        icon: "👥",
      },
      {
        title: "Funds (Today)",
        value: fundsToday,
        description: "Reported campaign & operations funds collected today.",
        accent: "#D97706",
        iconBg: "#FFF1D6",
        icon: "💰",
      },
      {
        title: "New Members",
        value: newMembers.toLocaleString(),
        description: "Newly registered members recorded today.",
        accent: "#059669",
        iconBg: "#DFFBEF",
        icon: "➕",
      },
      {
        title: "Active Districts",
        value: activeDistricts.toLocaleString(),
        description: "Districts with active operations today.",
        accent: "#6366F1",
        iconBg: "#E5E7FF",
        icon: "📍",
      },
    ],
    []
  );

  const chartData = useMemo(
    () => [
      { name: "Sat", mobilizations: 120, funds: 10000, members: 20, districts: 9 },
      { name: "Sun", mobilizations: 210, funds: 22000, members: 60, districts: 12 },
      { name: "Mon", mobilizations: 180, funds: 14000, members: 40, districts: 13 },
      { name: "Tue", mobilizations: 260, funds: 124000, members: 110, districts: 18 },
      { name: "Wed", mobilizations: 300, funds: 98000, members: 140, districts: 20 },
      { name: "Thu", mobilizations: 360, funds: 102000, members: 170, districts: 22 },
      { name: "Fri", mobilizations: 420, funds: 108000, members: 210, districts: 24 },
      { name: "Sat2", mobilizations: 520, funds: 124000, members: 320, districts: 28 },
    ],
    []
  );

  const miniChartData = useMemo(() => {
    const last = chartData.slice(-5);
    return last.map((d) => ({
      ...d,
      funds: Math.round(d.funds * 0.7),
      mobilizations: Math.round(d.mobilizations * 0.85),
      members: Math.round(d.members * 0.9),
      districts: d.districts,
    }));
  }, [chartData]);

  const { ref: chartRef, visible: chartVisible } = useOnScreenOnce<HTMLDivElement>();
  const { ref: lowerRef, visible: lowerVisible } = useOnScreenOnce<HTMLDivElement>();

  const [idleReady, setIdleReady] = useState(false);
  useEffect(() => {
    const w = window as any;
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setIdleReady(true), { timeout: 1200 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setIdleReady(true), 300);
    return () => window.clearTimeout(t);
  }, []);

  const canShowCharts = idleReady;

  // ✅ Optional: reduce motion cost on phones
  const enableMotion =
    !prefersReducedMotion && (typeof window === "undefined" ? true : window.innerWidth >= 640);

  const KpiGrid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
      {metricCards.map((item) => (
        <Card key={item.title} className={`${CREAM_CARD_BASE} h-full p-5`} style={{ backgroundColor: CARD_CREAM }}>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold" style={{ color: item.accent }}>
                {item.title}
              </h3>
              <p className="text-3xl font-extrabold text-slate-900 leading-none">
                {item.value}
              </p>
            </div>

            {/* ✅ Mobile: remove extra radial background paint cost */}
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center text-lg border border-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
              style={{ backgroundColor: item.iconBg }}
            >
              <span className="text-[22px]">{item.icon}</span>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-600">{item.description}</p>
        </Card>
      ))}
    </div>
  );

  return (
    <main
      className={[
        "min-h-screen text-white",
        "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
        "overscroll-y-contain overflow-x-hidden",
      ].join(" ")}
      style={DASH_BG_STYLE}
      role="main"
      aria-label="SkizaGroundSuite Dashboard"
    >
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Title */}
        <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-[28px] font-extrabold tracking-tight text-white drop-shadow">
              SkizaGroundSuite Operations Dashboard
            </h1>
            <p className="mt-1 text-[11px] sm:text-sm text-white/80">
              Mobilizations, membership and grassroots activity across your jurisdiction.
            </p>
            <p className="mt-1 text-[11px] sm:text-xs text-white/80">
              Welcome, <span className="font-semibold text-white">{displayName}</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge className="border border-white/25 bg-white/15 text-white shadow-sm">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                Live
              </span>
            </Badge>
            <span className="hidden sm:block text-xs text-white/80">{currentDate}</span>
          </div>
        </div>

        {/* KPI cards */}
        {enableMotion ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {KpiGrid}
          </motion.div>
        ) : (
          KpiGrid
        )}

        {/* Filters */}
        <div className="mt-4 sm:mt-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <Badge className="bg-white text-slate-900 border border-red-100 py-2 shadow-sm w-fit">
            <span>📍</span>
            <span className="truncate max-w-[360px]">{scopeLabel}</span>
          </Badge>

          <div className="flex items-center gap-3">
            <Label className="text-white/80 hidden sm:block">Time range</Label>
            <div className="flex flex-wrap items-center gap-2">
              {TIME_RANGES.map((range) => (
                <Button
                  key={range}
                  size="xs"
                  variant={timeRange === range ? "default" : "outline"}
                  onClick={() => setTimeRange(range)}
                  className={[
                    "rounded-full",
                    timeRange === range
                      ? "bg-[#F5333F] text-white border-[#F5333F] hover:bg-[#F5333F]/90"
                      : "bg-white/10 text-white border-white/25 hover:bg-white/15",
                  ].join(" ")}
                  aria-pressed={timeRange === range}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <SectionTitle
            title="Trend View"
            subtitle="Mobilizations, funds, members, and active districts over time."
          />
        </div>

        {/* ✅ content-visibility speeds up mobile by skipping offscreen rendering */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6"
          style={{ contentVisibility: "auto", containIntrinsicSize: "600px" }}
        >
          {/* Chart */}
          <div ref={chartRef} className="lg:col-span-8">
            <Card className={`${CREAM_CARD_BASE} p-4 sm:p-5`} style={{ backgroundColor: CARD_CREAM }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <h3 className="text-base font-bold text-slate-900">
                    Party Operations Overview
                  </h3>
                </div>

                <Badge className="rounded-full bg-white border border-slate-200 text-slate-700 px-3 py-1 text-xs shadow-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    {scopeLabel}
                  </span>
                </Badge>
              </div>

              {/* ✅ Only mount Suspense + chart when visible AND idle */}
              <div className="w-full min-h-[260px] sm:min-h-[320px] rounded-2xl">
                {chartVisible && canShowCharts ? (
                  <Suspense
                    fallback={
                      <div className="h-[260px] sm:h-[320px] rounded-2xl bg-[#FFE3CF] border border-[#F4C7A5] animate-pulse" />
                    }
                  >
                    <OperationsChart chartData={chartData} />
                  </Suspense>
                ) : (
                  <div className="h-[260px] sm:h-[320px]" />
                )}
              </div>
            </Card>
          </div>

          {/* Activities */}
          <aside className="lg:col-span-4" aria-label="Recent activities">
            <Card className={`${CREAM_CARD_BASE} p-4 sm:p-5`} style={{ backgroundColor: CARD_CREAM }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-900">Recent Activities</h3>
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {activitiesSeed.map((a) => (
                  <ActivityRow key={`${a.name}-${a.tag}`} a={a} />
                ))}
              </div>
            </Card>
          </aside>
        </div>

        {/* ✅ On mobile, skip rendering the second chart for faster load */}
        <div
          ref={lowerRef}
          className="mt-6 hidden sm:block"
          style={{ contentVisibility: "auto", containIntrinsicSize: "260px" }}
        >
          <Card className={`${CREAM_CARD_BASE} p-4 sm:p-5`} style={{ backgroundColor: CARD_CREAM }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="inline-flex items-center gap-2 text-slate-700 text-sm font-semibold">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm border border-slate-300 bg-slate-50" />
                  Chart
                </span>
                <span className="opacity-40 font-medium">Trend</span>
              </div>

              <span className="text-xs text-slate-500">Compact summary</span>
            </div>

            <div className="w-full h-[170px] sm:h-[200px] rounded-2xl">
              {lowerVisible && canShowCharts ? (
                <Suspense
                  fallback={
                    <div className="h-[170px] sm:h-[200px] rounded-2xl bg-[#FFE3CF] border border-[#F4C7A5] animate-pulse" />
                  }
                >
                  <OperationsChart chartData={miniChartData} />
                </Suspense>
              ) : (
                <div className="h-[170px] sm:h-[200px]" />
              )}
            </div>
          </Card>
        </div>

        <div className="mt-6 text-xs text-white/85">
          <span className="font-semibold">Today&apos;s focus:&nbsp;</span>
          <span>{dailyMessage}</span>
        </div>
      </div>
    </main>
  );
}
