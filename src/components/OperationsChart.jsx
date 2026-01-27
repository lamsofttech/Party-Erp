// src/components/OperationsChart.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

function formatMoney(v) {
  if (typeof v !== "number") return v;
  if (v >= 1000000) return `${Math.round(v / 100000) / 10}M`;
  if (v >= 1000) return `${Math.round(v / 100) / 10}k`;
  return `${v}`;
}

function formatNumber(v) {
  if (typeof v !== "number") return v;
  return v.toLocaleString();
}

// ✅ lightweight media hook (no extra deps)
function useIsSmallScreen(breakpoint = 640) {
  const [isSmall, setIsSmall] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsSmall(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isSmall;
}

/**
 * Hard guarantees for mobile layout:
 * - Wrapper uses max-w-full + overflow-hidden so nothing can push page width
 * - Tooltip is clamped to viewport width and cannot escape x-axis
 * - Tooltip/Legend disabled on small screens and mini
 * - Animations disabled on small screens/mini
 */
function OperationsChart({ chartData = [], variant = "full" }) {
  const isMini = variant === "mini";
  const isSmallScreen = useIsSmallScreen(640);

  // ✅ Lite on mobile + mini
  const lite = isSmallScreen || isMini;

  const data = useMemo(() => {
    const src = Array.isArray(chartData) ? chartData : [];
    return src.map((d) => ({
      name: d?.name ?? "",
      mobilizations: Number(d?.mobilizations ?? 0),
      funds: Number(d?.funds ?? 0),
      members: Number(d?.members ?? 0),
      districts: Number(d?.districts ?? 0),
    }));
  }, [chartData]);

  if (!data.length) {
    return (
      <div className="h-full w-full max-w-full overflow-hidden rounded-2xl bg-[#FFE3CF] border border-[#F4C7A5]" />
    );
  }

  const heightClass = isMini ? "h-[170px] sm:h-[200px]" : "h-[260px] sm:h-[320px]";
  const axisFontSize = lite ? 10 : 12;

  // ✅ Reduce work on mobile
  const showFundsBar = !lite;
  const showMembers = !lite;
  const showDistricts = !lite;

  const animate = !lite;

  const xInterval = lite ? "preserveStartEnd" : 0;
  const xMinGap = lite ? 26 : 10;
  const yTicks = lite ? 4 : 6;

  return (
    // ✅ MOST IMPORTANT: prevent any horizontal overflow from SVG/tooltip
    <div className={`w-full max-w-full overflow-hidden ${heightClass}`}>
      <div className="w-full max-w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={
              lite
                ? { top: 6, right: 8, left: 0, bottom: 0 }
                : { top: 10, right: 12, left: 6, bottom: 0 }
            }
          >
            {!lite && (
              <CartesianGrid
                stroke="rgba(15,23,42,0.08)"
                strokeDasharray="3 6"
                vertical={false}
              />
            )}

            <XAxis
              dataKey="name"
              tick={{ fill: "rgba(15,23,42,0.65)", fontSize: axisFontSize }}
              axisLine={false}
              tickLine={false}
              interval={xInterval}
              minTickGap={xMinGap}
            />

            <YAxis
              yAxisId="left"
              tick={{ fill: "rgba(15,23,42,0.65)", fontSize: axisFontSize }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatNumber}
              width={lite ? 30 : 38}
              tickCount={yTicks}
            />

            {/* ✅ Tooltip can cause overflow: clamp + prevent escaping X */}
            {!lite && (
              <Tooltip
                allowEscapeViewBox={{ x: false, y: true }}
                wrapperStyle={{
                  outline: "none",
                  maxWidth: "calc(100vw - 24px)",
                  whiteSpace: "normal",
                }}
                contentStyle={{
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(15,23,42,0.10)",
                  borderRadius: 14,
                  color: "rgba(15,23,42,0.85)",
                  boxShadow: "0 18px 45px rgba(0,0,0,0.12)",
                  padding: "10px 12px",
                  maxWidth: "calc(100vw - 24px)",
                  overflow: "hidden",
                }}
                labelStyle={{ color: "rgba(15,23,42,0.65)", fontWeight: 700 }}
                cursor={{ fill: "rgba(245,51,63,0.06)" }}
                formatter={(value, name) => {
                  if (name === "Funds Collected") return [formatMoney(value), name];
                  return [formatNumber(value), name];
                }}
              />
            )}

            {!lite && (
              <Legend
                verticalAlign="bottom"
                height={32}
                wrapperStyle={{
                  color: "rgba(15,23,42,0.75)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              />
            )}

            {showFundsBar && (
              <>
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "rgba(15,23,42,0.55)", fontSize: axisFontSize }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatMoney}
                  width={44}
                  tickCount={6}
                />
                <Bar
                  yAxisId="right"
                  dataKey="funds"
                  name="Funds Collected"
                  fill="#F5333F"
                  barSize={28}
                  radius={[12, 12, 6, 6]}
                  isAnimationActive={animate}
                  isUpdateAnimationActive={false}
                />
              </>
            )}

            <Line
              yAxisId="left"
              type="linear"
              dataKey="mobilizations"
              name="Mobilizations"
              stroke="#E11D48"
              strokeWidth={lite ? 2 : 3}
              dot={false}
              activeDot={false}
              isAnimationActive={animate}
              isUpdateAnimationActive={false}
            />

            {showMembers && (
              <Line
                yAxisId="left"
                type="linear"
                dataKey="members"
                name="New Members"
                stroke="#16A34A"
                strokeWidth={3}
                dot={false}
                activeDot={false}
                isAnimationActive={animate}
                isUpdateAnimationActive={false}
              />
            )}

            {showDistricts && (
              <Line
                yAxisId="left"
                type="linear"
                dataKey="districts"
                name="Active Districts"
                stroke="#7C3AED"
                strokeWidth={3}
                dot={false}
                activeDot={false}
                isAnimationActive={animate}
                isUpdateAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default React.memo(OperationsChart);
