import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  PieLabelRenderProps,
} from "recharts";
import { useReducedMotion } from "framer-motion";

// Jubilee color palette for pie segments
const pieColors = ["#C00500", "#FFC000", "#7A0000", "#FF6B6B"];

type MetricCardProps = {
  title: string;
  value: string | number;
  data: Array<{ label: string; value: number }>;
};

// ✅ Custom label renderer so percentages are visible on dark background
const renderPercentageLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: PieLabelRenderProps) => {
  if (!percent || !innerRadius || !outerRadius || cx == null || cy == null) {
    return null;
  }

  // Skip *very* tiny slices (e.g. < 3%)
  if (percent * 100 < 3) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle! * RADIAN);
  const y = cy + radius * Math.sin(-midAngle! * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#FFF5F5"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function MetricCard({ title, value, data }: MetricCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={[
        "rounded-2xl bg-black/30 backdrop-blur-md shadow-[0_16px_40px_rgba(0,0,0,0.7)]",
        "border border-[#4C0000]/80",
        "p-3 sm:p-4 lg:p-5",
        "w-full max-w-full min-w-0",
        prefersReducedMotion
          ? ""
          : "md:hover:scale-[1.02] md:transition-transform md:duration-300",
      ].join(" ")}
      role="group"
      aria-label={`${title} metric card`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm sm:text-base font-semibold text-[#FFF5F5] leading-tight truncate">
          {title}
        </p>
      </div>

      <p className="mt-1 text-xl sm:text-2xl md:text-3xl font-extrabold text-[#FFFFFF] tracking-tight">
        {value}
      </p>

      {/* Chart container */}
      <div className="mt-2 sm:mt-3 w-full h-28 sm:h-32 md:h-40 min-h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart aria-label={`${title} distribution pie chart`}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              label={renderPercentageLabel}
              labelLine={false}
              isAnimationActive={!prefersReducedMotion}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={pieColors[i % pieColors.length]} />
              ))}
            </Pie>

            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              wrapperStyle={{ outline: "none" }}
              contentStyle={{
                background: "rgba(59,0,0,0.96)",
                border: "1px solid rgba(255,192,0,0.45)",
                borderRadius: 12,
                color: "#FFF5F5",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Compact legend – 1 col on mobile, 2 cols from sm up */}
      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] sm:text-xs text-[#FFE5D5]/90">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 min-w-0">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ background: pieColors[i % pieColors.length] }}
              aria-hidden
            />
            <span className="truncate">{d.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
