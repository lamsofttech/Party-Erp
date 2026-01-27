import { useEffect, useMemo, useRef, useState } from "react";
import { Search, MapPin, Users, ChevronRight, X } from "lucide-react";

/**
 * Mobile-first, PWA-friendly PollingStationList
 * - Sticky search bar with safe-area support (iOS standalone)
 * - Fast client-side filtering (name/code/location fields)
 * - Optional sections by county/constituency (grouped list)
 * - Keyboard navigation + aria roles for accessibility
 * - Virtual-friendly container (sets a max height but grows naturally)
 * - Empty + loading states
 */

export type PollingStation = {
  id: string | number;
  name: string;
  code?: string;
  ward?: string;
  constituency?: string;
  county?: string;
  registeredVoters?: number;
  status?: "open" | "closed" | "busy" | "unknown";
};

type Props = {
  stations: PollingStation[];
  isLoading?: boolean;
  groupBy?: "none" | "county" | "constituency";
  placeholder?: string;
  onSelect?: (station: PollingStation) => void;
  /** If provided, component becomes controlled for search text */
  query?: string;
  onQueryChange?: (value: string) => void;
  /** Optional max height for the scroll area */
  maxHeight?: number | string; // e.g., 480 or "60vh"
};

export default function PollingStationList({
  stations,
  isLoading = false,
  groupBy = "none",
  placeholder = "Search name, code, or location…",
  onSelect,
  query,
  onQueryChange,
  maxHeight = "min(62vh, 640px)",
}: Props) {
  const [internalQuery, setInternalQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const q = query ?? internalQuery;

  // Debounce for controlled parent handlers
  useEffect(() => {
    const t = setTimeout(() => {
      if (onQueryChange) onQueryChange(q);
    }, 120);
    return () => clearTimeout(t);
  }, [q]);

  const filtered = useMemo(() => {
    if (!q) return stations;
    const needle = normalize(q);
    return stations.filter((s) => {
      const hay = normalize(
        [s.name, s.code, s.ward, s.constituency, s.county].filter(Boolean).join(" ")
      );
      return hay.includes(needle);
    });
  }, [stations, q]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return null;
    const key = (s: PollingStation) => (groupBy === "county" ? s.county : s.constituency) ?? "Other";
    const map = new Map<string, PollingStation[]>();
    for (const s of filtered) {
      const k = key(s) || "Other";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupBy]);

  const hasResults = filtered.length > 0;

  return (
    <section
      aria-labelledby="psl-heading"
      className="w-full max-w-3xl mx-auto rounded-2xl bg-white/5 backdrop-blur-md ring-1 ring-white/10 text-white shadow-md overflow-hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Sticky header with search */}
      <header
        className="sticky top-0 z-10 bg-gradient-to-b from-black/40 to-black/10 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)+10px)] pb-3"
        style={{ paddingTop: `calc(env(safe-area-inset-top) + 10px)` }}
      >
        <h2 id="psl-heading" className="text-base sm:text-lg font-bold">🗳️ Polling Stations</h2>

        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" aria-hidden />
          <input
            ref={inputRef}
            value={query !== undefined ? query : internalQuery}
            onChange={(e) => (onQueryChange ? onQueryChange(e.target.value) : setInternalQuery(e.target.value))}
            placeholder={placeholder}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/10 text-white placeholder-white/60 outline-none ring-1 ring-white/10 focus:ring-white/30"
            inputMode="search"
            aria-label="Search polling stations"
          />
          {(q?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => (onQueryChange ? onQueryChange("") : setInternalQuery(""))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 focus:ring-2 focus:ring-white/40"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Scroll area */}
      <div
        role="list"
        aria-label="Polling station results"
        className="px-2 sm:px-4 py-3 overflow-auto"
        style={{ maxHeight }}
      >
        {isLoading ? (
          <LoadingSkeleton />
        ) : hasResults ? (
          groupBy === "none" ? (
            <ul className="space-y-2">
              {filtered.map((s) => (
                <ListItem key={s.id} s={s} onSelect={onSelect} />)
              )}
            </ul>
          ) : (
            <div className="space-y-4">
              {grouped!.map(([groupName, items]) => (
                <div key={groupName}>
                  <div className="sticky top-[52px] sm:top-[56px] z-0 bg-white/5 px-2 sm:px-3 py-1.5 rounded-lg ring-1 ring-white/10 text-xs font-semibold tracking-wide">
                    {groupName} <span className="opacity-70">• {items.length}</span>
                  </div>
                  <ul className="mt-2 space-y-2">
                    {items.map((s) => (
                      <ListItem key={s.id} s={s} onSelect={onSelect} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        ) : (
          <EmptyState query={q} />
        )}
      </div>
    </section>
  );
}

function ListItem({ s, onSelect }: { s: PollingStation; onSelect?: (s: PollingStation) => void }) {
  const subtitle = [s.ward, s.constituency, s.county].filter(Boolean).join(" • ");
  const statusColor =
    s.status === "open" ? "bg-emerald-500" : s.status === "busy" ? "bg-amber-500" : s.status === "closed" ? "bg-rose-500" : "bg-slate-400";

  return (
    <li
      role="listitem"
      tabIndex={0}
      className="group rounded-xl p-3 sm:p-4 bg-white/5 ring-1 ring-white/10 hover:ring-white/20 focus:ring-white/30 outline-none cursor-pointer"
      onClick={() => onSelect?.(s)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(s);
        }
      }}
      aria-label={`${s.name}${s.code ? ` (${s.code})` : ""}${subtitle ? `, ${subtitle}` : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-1 w-2 h-2 rounded-full ${statusColor}`} aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold leading-snug truncate">{s.name}</p>
            {s.code && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 ring-1 ring-white/10">{s.code}</span>}
          </div>
          <p className="mt-0.5 text-xs text-white/80 flex items-center gap-1 truncate">
            <MapPin className="w-3.5 h-3.5" aria-hidden /> {subtitle || "—"}
          </p>
          {typeof s.registeredVoters === "number" && (
            <p className="mt-1 text-xs text-white/75 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" aria-hidden /> {formatNumber(s.registeredVoters)} registered
            </p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" aria-hidden />
      </div>
    </li>
  );
}

function LoadingSkeleton() {
  return (
    <ul className="space-y-2 animate-pulse" aria-label="Loading stations">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="rounded-xl p-4 bg-white/5 ring-1 ring-white/10">
          <div className="h-3 w-40 bg-white/20 rounded" />
          <div className="mt-2 h-3 w-56 bg-white/10 rounded" />
          <div className="mt-2 h-3 w-28 bg-white/10 rounded" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ query }: { query?: string }) {
  return (
    <div className="flex items-center justify-center text-center py-16">
      <div>
        <p className="text-sm font-semibold">{query ? "No matches found" : "No stations available"}</p>
        <p className="text-xs text-white/80 mt-1">
          {query ? "Try a different spelling or location filter." : "Please connect a data source."}
        </p>
      </div>
    </div>
  );
}

function formatNumber(n?: number) {
  if (typeof n !== "number") return "";
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(n);
  }
}

function normalize(s?: string) {
  return (s || "").toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "");
}

