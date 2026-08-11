"use client";

// 潮位グラフ。満潮・干潮と現在時刻を重ねて表示する。

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TideInfo } from "@/lib/types";

interface TooltipPayloadItem {
  payload: { hour: number; levelCm: number };
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  const h = Math.floor(d.hour);
  const m = Math.round((d.hour - h) * 60);
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-2 text-sm shadow-lg dark:border-slate-600 dark:bg-navy-light">
      <p className="font-bold">
        {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")} — 潮位 {d.levelCm}cm
      </p>
    </div>
  );
}

export default function TideChart({
  tide,
  nowHour,
  height = 180,
}: {
  tide: TideInfo;
  nowHour?: number;
  height?: number;
}) {
  const levels = tide.curve.map((c) => c.levelCm);
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const pad = Math.max(10, Math.round((max - min) * 0.15));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={tide.curve} margin={{ top: 14, right: 10, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis
            dataKey="hour"
            type="number"
            domain={[0, 24]}
            ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]}
            tickFormatter={(h: number) => `${h}`}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={[Math.max(0, min - pad), max + pad]}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${Math.round(v)}`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="levelCm"
            stroke="#0284c7"
            strokeWidth={2.5}
            fill="url(#tideFill)"
            isAnimationActive={false}
          />
          {tide.events.map((e) => (
            <ReferenceDot
              key={`${e.type}${e.time}`}
              x={e.hour}
              y={e.levelCm}
              r={4}
              fill={e.type === "満潮" ? "#0ea5e9" : "#64748b"}
              stroke="white"
              label={{
                value: `${e.type === "満潮" ? "満" : "干"} ${e.time}`,
                position: e.type === "満潮" ? "top" : "bottom",
                fontSize: 11,
                fill: e.type === "満潮" ? "#0284c7" : "#64748b",
              }}
            />
          ))}
          {nowHour !== undefined && (
            <ReferenceLine
              x={nowHour}
              stroke="#ef4444"
              strokeWidth={2}
              label={{ value: "今", position: "top", fontSize: 12, fill: "#ef4444" }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
