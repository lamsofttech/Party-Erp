import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Clock, Info, Wifi, WifiOff } from "lucide-react";

const NAIROBI_TZ = "Africa/Nairobi";
const DEFAULT_VERSION = "v2.0.0-PROD";
const BRAND_RED = "#F5333F";

function FooterBase() {
  const [timeStr, setTimeStr] = useState<string>("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const timerRef = useRef<number | null>(null);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-KE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: NAIROBI_TZ,
        hour12: false,
      }),
    []
  );

  const appVersion =
    (import.meta as any)?.env?.VITE_APP_VERSION || DEFAULT_VERSION;

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(formatter.format(now));
      const y = now.getFullYear();
      if (y !== year) setYear(y);

      const ms = now.getMilliseconds();
      const delay = 1000 - ms + 2;
      timerRef.current = window.setTimeout(update, delay);
    };

    const start = () => timerRef.current == null && update();
    const stop = () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [formatter, year]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <footer
      role="contentinfo"
      className="
        w-full
        bg-[#F5F1E8]   /* 🔥 Elegant cream color */
        text-slate-800
        border-t border-slate-300/60
        backdrop-blur
        supports-[backdrop-filter]:bg-[#F5F1E8]/95
      "
    >
      {/* Thin brand accent line */}
      <div
        className="w-full h-0.5"
        style={{
          backgroundImage: `linear-gradient(to right, transparent, ${BRAND_RED}, transparent)`,
          opacity: 0.9,
        }}
      />

      {/* FULL WIDTH content – no max-width, no gaps */}
      <div className="
        flex w-full flex-col 
        px-4 py-2.5
        gap-2
        text-[11px]
        sm:flex-row sm:items-center sm:justify-between sm:text-xs
      ">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500">© {year}</span>

          <span className="font-semibold tracking-wide text-slate-800">
            SkizaGroundSuite
          </span>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex flex-wrap items-center gap-3 justify-end">

          {/* Online/Offline */}
          <span
            className={`
              inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1
              ${online
                ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
                : "bg-amber-100 text-amber-800 ring-amber-300"
              }
            `}
          >
            {online ? (
              <Wifi size={13} className="mr-1.5" />
            ) : (
              <WifiOff size={13} className="mr-1.5" />
            )}
            {online ? "Online" : "Offline"}
          </span>

          {/* Version */}
          <div className="flex items-center gap-1.5 text-slate-700">
            <Info size={13} className="text-slate-500" />
            <span className="tracking-tight">
              ERP <span className="font-semibold">{appVersion}</span>
            </span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-1.5 text-slate-700">
            <Clock size={13} className="text-slate-500" />
            <time dateTime={timeStr || undefined} className="tabular-nums">
              {timeStr || "—"}
            </time>{" "}
            EAT
          </div>
        </div>
      </div>
    </footer>
  );
}

export default memo(FooterBase);
