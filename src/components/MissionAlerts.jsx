import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * MissionAlerts — responsive / ERP-style, mobile-first
 */
export default function MissionAlerts({ alerts = [], strategies = [] }) {
  const hasAlerts = alerts.length > 0;
  const hasStrategies = strategies.length > 0;

  // Stable keys for AnimatePresence
  const keyedAlerts = useMemo(
    () => alerts.map((a, i) => ({ key: `${(a.title || "alert")}-${i}`, ...a })),
    [alerts]
  );

  return (
    <section
      aria-labelledby="mission-alerts-heading"
      className="w-full pb-6 sm:pb-8"
    >
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mt-4 sm:mt-6"
        role="group"
        aria-label="Mission alerts and strategic commands"
      >
        {/* Alerts Card */}
        <article
          aria-live="polite"
          aria-busy={!hasAlerts}
          className="w-full min-w-0 max-w-full rounded-2xl shadow-lg backdrop-blur-md bg-[#4C0000]/40 text-[#FFF5F5] ring-1 ring-white/10 border border-[#7A0000]/40"
        >
          <header className="p-3 sm:p-4 md:p-5 border-b border-white/10">
            <h3
              id="mission-alerts-heading"
              className="text-sm sm:text-base md:text-lg font-bold tracking-tight"
            >
              🔔 Mission Alerts
            </h3>
          </header>

          <div className="p-3 sm:p-4 md:p-5">
            {hasAlerts ? (
              <ul
                role="list"
                className="space-y-2.5 sm:space-y-3 md:space-y-4"
              >
                <AnimatePresence initial={false}>
                  {keyedAlerts.map(({ key, title, desc }) => (
                    <motion.li
                      key={key}
                      role="listitem"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="rounded-xl p-3 sm:p-4 bg-[#7A0000]/40 ring-1 ring-white/10 hover:ring-white/20 focus-within:ring-white/30"
                    >
                      <p className="font-semibold leading-snug text-xs sm:text-sm md:text-[15px] line-clamp-2">
                        {title}
                      </p>
                      <p className="mt-1 text-[11px] sm:text-sm text-[#FFE5D5]/90 leading-relaxed line-clamp-3 break-words">
                        {desc}
                      </p>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <EmptyState
                title="No alerts"
                subtitle="You're all clear for now."
              />
            )}
          </div>
        </article>

        {/* Strategies Card */}
        <article className="w-full min-w-0 max-w-full rounded-2xl shadow-lg text-white bg-gradient-to-tr from-[#A30000] to-[#C00500] ring-1 ring-white/10 border border-[#FFD966]/20">
          <header className="p-3 sm:p-4 md:p-5 border-b border-white/20">
            <h3 className="text-sm sm:text-base md:text-lg font-bold tracking-tight">
              🎯 Strategic Command
            </h3>
          </header>

          <div className="p-3 sm:p-4 md:p-5">
            {hasStrategies ? (
              <ul
                role="list"
                className="space-y-2 sm:space-y-2.5 md:space-y-3 text-[11px] sm:text-sm"
              >
                {strategies.map((item, idx) => (
                  <li
                    key={`${String(item)}-${idx}`}
                    role="listitem"
                    className="pl-3 sm:pl-4 relative"
                  >
                    <span
                      aria-hidden
                      className="absolute left-0 top-2.5 w-1.5 h-1.5 rounded-full bg-[#FFE599]"
                    />
                    <span className="leading-relaxed break-words">
                      {typeof item === "string" ? item : String(item)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No strategies yet"
                subtitle="Add tactics to guide the mission."
                light
              />
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function EmptyState({ title, subtitle, light = false }) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center rounded-xl border",
        "min-h-[100px] sm:min-h-[130px] p-4 sm:p-6 select-none",
        light
          ? "border-white/30 bg-white/10 text-white"
          : "border-white/10 bg-white/5 text-white",
      ].join(" ")}
    >
      <p className="text-xs sm:text-sm font-semibold opacity-90">{title}</p>
      <p className="text-[11px] sm:text-xs opacity-80 mt-1 max-w-[36ch]">
        {subtitle}
      </p>
    </div>
  );
}
