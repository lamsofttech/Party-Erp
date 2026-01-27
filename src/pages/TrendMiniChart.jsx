// src/components/TrendMiniChart.jsx
import React, { useMemo } from "react";
import {
    ResponsiveContainer,
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
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

export default function TrendMiniChart({ data = [] }) {
    const chartData = useMemo(() => {
        return (data || []).map((d) => ({
            name: d?.name ?? "",
            mobilizations: Number(d?.mobilizations ?? 0),
            funds: Number(d?.funds ?? 0),
            members: Number(d?.members ?? 0),
            districts: Number(d?.districts ?? 0),
        }));
    }, [data]);

    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 14, left: 6, bottom: 0 }}>
                    <CartesianGrid
                        stroke="rgba(15,23,42,0.08)"
                        strokeDasharray="3 6"
                        vertical={false}
                    />

                    <XAxis
                        dataKey="name"
                        tick={{ fill: "rgba(15,23,42,0.55)", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />

                    {/* Left axis for counts */}
                    <YAxis
                        yAxisId="left"
                        tick={{ fill: "rgba(15,23,42,0.55)", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatNumber}
                        width={34}
                    />

                    {/* Right axis for funds */}
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: "rgba(15,23,42,0.45)", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatMoney}
                        width={44}
                    />

                    <Tooltip
                        wrapperStyle={{ outline: "none" }}
                        contentStyle={{
                            background: "rgba(255,255,255,0.92)",
                            border: "1px solid rgba(15,23,42,0.10)",
                            borderRadius: 14,
                            color: "rgba(15,23,42,0.85)",
                            boxShadow: "0 18px 45px rgba(0,0,0,0.12)",
                            padding: "10px 12px",
                        }}
                        labelStyle={{ color: "rgba(15,23,42,0.65)", fontWeight: 800 }}
                        cursor={{ fill: "rgba(245,51,63,0.06)" }}
                        formatter={(value, name) => {
                            if (name === "Funds") return [formatMoney(value), name];
                            return [formatNumber(value), name];
                        }}
                    />

                    {/* Subtle bars for Funds */}
                    <Bar
                        yAxisId="right"
                        dataKey="funds"
                        name="Funds"
                        fill="#F5333F"
                        barSize={14}
                        radius={[10, 10, 6, 6]}
                        opacity={0.35}
                    />

                    {/* Smooth lines */}
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="mobilizations"
                        name="Mobilizations"
                        stroke="#E11D48"
                        strokeWidth={3}
                        dot={false}
                    />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="members"
                        name="Members"
                        stroke="#16A34A"
                        strokeWidth={3}
                        dot={false}
                    />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="districts"
                        name="Districts"
                        stroke="#7C3AED"
                        strokeWidth={3}
                        dot={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
