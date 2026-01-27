import { useEffect, useMemo, useRef, useState } from "react";


/**
 * ConstituencyList — mobile-first, PWA-friendly list with search & lazy rendering
 *
 * - Bottom-sheet friendly spacing with safe-area insets
 * - Sticky header with search & county filter
 * - Large, finger-friendly cards on mobile; dense table-like view on desktop
 * - Lightweight lazy rendering ("Load more") for big datasets
 * - Accessible semantics (list / buttons / labels)
 * - No external deps beyond React + Tailwind classes
 */

export type Constituency = {
  id: string | number;
  name: string;
  code?: string;
  countyName?: string;
  wardsCount?: number;
  agentsCount?: number;
  status?: "Active" | "Inactive" | "Pending" | string;
};

export type ConstituencyListProps = {
  items: Constituency[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelect?: (c: Constituency) => void;
  onRefresh?: () => void | Promise<void>;
  initialVisible?: number; // how many items to show initially (default 20)
  step?: number; // how many more to reveal on each load (default 20)
};

export default function ConstituencyList({
  items,
  loading = false,
  error = null,
  onRetry,
  onSelect,
  onRefresh,
  initialVisible = 20,
  step = 20,
}: ConstituencyListProps) {
  const [query, setQuery] = useState("");
  const [county, setCounty] = useState("All");
  const [visible, setVisible] = useState(initialVisible);
  const headerRef = useRef<HTMLDivElement | null>(null);

  // Derive county options
  const counties = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.countyName && set.add(i.countyName));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  // Filter + sort (keep it fast for mobile)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byCounty = county === "All" ? items : items.filter((i) => (i.countyName || "").toLowerCase() === county.toLowerCase());
    const byQuery = q
      ? byCounty.filter((i) =>
          [i.name, i.code, i.countyName]
            .filter(Boolean)
            .some((s) => (s as string).toLowerCase().includes(q))
        )
      : byCounty;
    return byQuery.sort((a, b) => a.name.localeCompare(b.name));
  }, [items, county, query]);

  // Reset visible when filters change
  useEffect(() => setVisible(initialVisible), [query, county, initialVisible]);

  const canLoadMore = visible < filtered.length;
  const slice = filtered.slice(0, visible);

  // Pull-to-refresh hint for PWAs (manual trigger)
  const handleRefresh = async () => {
    if (!onRefresh) return;
    await onRefresh();
  };

  // Keep header compact on scroll (mobile friendliness)
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const onScroll = () => {
      const y = window.scrollY;
      header.style.boxShadow = y > 2 ? "0 4px 16px rgba(0,0,0,0.06)" : "none";
      header.style.backgroundColor = y > 2 ? "rgba(255,255,255,0.9)" : "transparent";
      header.style.backdropFilter = y > 2 ? "saturate(1.2) blur(8px)" : "none";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="min-h-[60vh] pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Sticky controls */}
      <div
        ref={headerRef}
        className="sticky top-0 z-20 px-4 md:px-6 pt-3 pb-3 md:pt-4 md:pb-4 backdrop-blur supports-[backdrop-filter]:bg-white/70"
        aria-label="List controls"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2">
            <svg aria-hidden viewBox="0 0 24 24" className="w-5 h-5 opacity-60"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 21.49 21.49 20l-5.99-6zM9.5 14A4.5 4.5 0 1 1 14 9.5 4.505 4.505 0 0 1 9.5 14"/></svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search constituencies, code, county"
              className="w-full outline-none text-sm md:text-base bg-transparent placeholder:text-gray-400"
              aria-label="Search constituencies"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="county" className="sr-only">Filter by county</label>
            <select
              id="county"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="h-11 md:h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm md:text-[15px]"
            >
              {counties.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {onRefresh && (
              <button
                onClick={handleRefresh}
                className="h-11 md:h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm md:text-[15px] active:scale-[0.99]"
                aria-label="Refresh list"
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Meta / counts */}
        <div className="mt-2 text-xs md:text-sm text-gray-600">
          Showing <span className="font-medium">{slice.length}</span> of {filtered.length}
        </div>
      </div>

      {/* Loading / Error states */}
      {loading && (
        <div className="px-4 md:px-6 py-6 grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-gradient-to-r from-gray-100 to-gray-50 animate-pulse" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="px-4 md:px-6 py-6">
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
            <p className="font-medium">Failed to load constituencies</p>
            <p className="text-sm opacity-90 mt-1">{error}</p>
            {onRetry && (
              <button onClick={onRetry} className="mt-3 h-10 px-4 rounded-lg bg-red-600 text-white">Try again</button>
            )}
          </div>
        </div>
      )}

      {/* List */}
      {!loading && !error && (
        <ol className="px-4 md:px-6 py-4 grid gap-3 md:gap-4" role="list">
          {slice.map((c) => (
            <li key={c.id} className="">
              <button
                onClick={() => onSelect?.(c)}
                className="w-full text-left rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm active:scale-[0.998] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="truncate font-semibold text-[15px] md:text-base">{c.name}</h3>
                      {c.code && (
                        <span className="shrink-0 text-xs md:text-[13px] text-gray-500">#{c.code}</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs md:text-sm text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                      {c.countyName && <span>{c.countyName}</span>}
                      {typeof c.wardsCount === "number" && (
                        <span>{c.wardsCount} ward{c.wardsCount === 1 ? "" : "s"}</span>
                      )}
                      {typeof c.agentsCount === "number" && (
                        <span>{c.agentsCount} agent{c.agentsCount === 1 ? "" : "s"}</span>
                      )}
                    </div>
                  </div>

                  {/* Status pill */}
                  {c.status && (
                    <span
                      className={`shrink-0 inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium
                        ${c.status === "Active" ? "bg-emerald-100 text-emerald-700" :
                          c.status === "Inactive" ? "bg-gray-100 text-gray-700" :
                          c.status === "Pending" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-700"}`}
                    >
                      {c.status}
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}

          {/* Empty state */}
          {slice.length === 0 && (
            <li className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
              No constituencies match your filters.
            </li>
          )}
        </ol>
      )}

      {/* Load more (lazy render) */}
      {!loading && !error && canLoadMore && (
        <div className="px-4 md:px-6 pb-6">
          <button
            onClick={() => setVisible((v) => v + step)}
            className="w-full h-12 md:h-11 rounded-xl bg-indigo-600 text-white font-medium active:scale-[0.99]"
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}

