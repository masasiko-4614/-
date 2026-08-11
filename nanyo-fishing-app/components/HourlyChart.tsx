"use client";

// 24時間の釣れやすさグラフ。
// 満潮・干潮・日の出・日の入り・朝夕まづめ・現在時刻を重ねて表示する。

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourlyForecast, SunMoonTimes, TideEvent } from "@/lib/types";

interface Props {
  hourly: HourlyForecast[];
  events: TideEvent[];
  sun: SunMoonTimes;
  /** 現在時刻(小数時)。今日以外は渡さない */
  nowHour?: number;
  /** ベストタイムの帯 */
  best?: { startHour: number; endHour: number } | null;
}

interface TooltipPayloadItem {
  payload: HourlyForecast;
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
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-2 text-sm shadow-lg dark:border-slate-600 dark:bg-navy-light">
      <p className="font-bold">
        {String(d.hour).padStart(2, "0")}:00 — 期待度 {d.score}点
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        {d.tideState} / 潮位 {d.tideLevelCm}cm / 風 {d.windSpeedMs}m/s
      </p>
      {d.reasons.length > 0 && (
        <p className="text-slate-600 dark:text-slate-300">{d.reasons.join("・")}</p>
      )}
      {d.unsafe && <p className="font-bold text-red-600">⚠ 安全上の注意が必要な時間帯</p>}
    </div>
  );
}

export default function HourlyChart({ hourly, events, sun, nowHour, best }: Props) {
  if (hourly.length === 0) return null;

  return (
    <div className="w-full">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourly} margin={{ top: 20, right: 10, bottom: 0, left: -22 }}>
            <defs>
              <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.75} />
                <stop offset="45%" stopColor="#3b82f6" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />

            {/* 夜の時間帯を暗く */}
            <ReferenceArea x1={0} x2={Math.max(0, sun.sunriseH)} fill="#0b1f3f" fillOpacity={0.07} />
            <ReferenceArea x1={Math.min(23, sun.sunsetH)} x2={23} fill="#0b1f3f" fillOpacity={0.07} />

            {/* まづめ帯 */}
            <ReferenceArea
              x1={Math.max(0, sun.sunriseH - 1)}
              x2={Math.min(23, sun.sunriseH + 1)}
              fill="#fb923c"
              fillOpacity={0.16}
            />
            <ReferenceArea
              x1={Math.max(0, sun.sunsetH - 1)}
              x2={Math.min(23, sun.sunsetH + 1)}
              fill="#fb923c"
              fillOpacity={0.16}
            />

            {/* ベストタイム */}
            {best && (
              <ReferenceArea
                x1={best.startHour}
                x2={best.endHour}
                fill="#f43f5e"
                fillOpacity={0.14}
                stroke="#f43f5e"
                strokeOpacity={0.5}
              />
            )}

            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, 23]}
              ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
              tickFormatter={(h: number) => `${h}時`}
              tick={{ fontSize: 12 }}
            />
            <YAxis domain={[0, 100]} ticks={[0, 40, 55, 70, 80, 100]} tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />

            <Area
              type="monotone"
              dataKey="score"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="url(#scoreFill)"
              isAnimationActive={false}
            />

            {/* 満潮・干潮(ラベルはグラフ内の下寄りに置いて上部と重ならないようにする) */}
            {events.map((e) => (
              <ReferenceLine
                key={`${e.type}-${e.time}`}
                x={e.hour}
                stroke={e.type === "満潮" ? "#0ea5e9" : "#64748b"}
                strokeDasharray="4 3"
                label={{
                  value: e.type === "満潮" ? `満 ${e.time}` : `干 ${e.time}`,
                  position: "insideBottom",
                  fontSize: 10,
                  offset: 28,
                  angle: -90,
                  fill: e.type === "満潮" ? "#0284c7" : "#64748b",
                }}
              />
            ))}

            {/* 日の出・日の入り */}
            <ReferenceLine
              x={sun.sunriseH}
              stroke="#f59e0b"
              label={{ value: "🌅", position: "top", fontSize: 13 }}
            />
            <ReferenceLine
              x={sun.sunsetH}
              stroke="#f59e0b"
              label={{ value: "🌇", position: "top", fontSize: 13 }}
            />

            {/* 現在時刻 */}
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
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <span>🟧 まづめ</span>
        <span className="text-sky-600 dark:text-sky-400">┊満潮</span>
        <span>┊干潮</span>
        <span>🌅日の出 {sun.sunrise}</span>
        <span>🌇日の入り {sun.sunset}</span>
        {nowHour !== undefined && <span className="text-red-500">┃現在時刻</span>}
      </div>
    </div>
  );
}
