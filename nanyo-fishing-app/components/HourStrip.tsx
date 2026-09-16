"use client";

// 時間別の天気と期待度を横スクロールで並べる帯。
// 「何時に行くか」を指で流しながら決められるようにする。

import { useEffect, useRef } from "react";
import { rankOf } from "@/lib/forecast";
import { degToDirName, weatherEmoji } from "@/lib/weather";
import type { ExpectationRank, HourlyForecast, HourlyWeather } from "@/lib/types";

const BAR: Record<ExpectationRank, string> = {
  爆釣期待: "bg-rose-500",
  かなり期待: "bg-orange-500",
  期待できる: "bg-emerald-500",
  普通: "bg-sky-500",
  厳しい: "bg-slate-400",
};

export default function HourStrip({
  hourly,
  weather,
  nowHour,
}: {
  hourly: HourlyForecast[];
  weather: HourlyWeather[];
  /** 現在時刻(小数時)。今日以外は渡さない */
  nowHour?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  const currentHour = nowHour === undefined ? -1 : Math.floor(nowHour);

  // 現在時刻が左端に来るようにスクロールしておく(これから先の時間を見たいため)
  useEffect(() => {
    const box = scrollRef.current;
    const cell = nowRef.current;
    if (!box || !cell) return;
    box.scrollLeft = Math.max(0, cell.offsetLeft - box.offsetLeft - 8);
  }, [currentHour, hourly.length]);

  if (hourly.length === 0) return null;

  return (
    <div ref={scrollRef} className="-mx-3 overflow-x-auto px-3 pb-1">
      <div className="flex gap-1.5" style={{ minWidth: "max-content" }}>
        {hourly.map((h) => {
          const w = weather[h.hour];
          const isNow = h.hour === currentHour;
          const rank = rankOf(h.score);
          return (
            <div
              key={h.hour}
              ref={isNow ? nowRef : undefined}
              className={`w-14 shrink-0 rounded-xl px-1 py-2 text-center ${
                isNow
                  ? "bg-ocean-600 text-white ring-2 ring-ocean-300"
                  : "bg-slate-100 dark:bg-navy"
              }`}
            >
              <p className="text-xs font-bold tabular-nums">
                {isNow ? "今" : `${h.hour}時`}
              </p>
              <p className="text-lg leading-tight" aria-hidden>
                {w ? weatherEmoji(w.weatherCode) : "—"}
              </p>
              <p className="text-xs tabular-nums">{w ? `${Math.round(w.tempC)}°` : "—"}</p>

              {/* 期待度のバー(下から伸びる) */}
              <div className="mx-auto mt-1 flex h-10 w-4 items-end overflow-hidden rounded-full bg-slate-300/70 dark:bg-slate-700">
                <div
                  className={`w-full rounded-full ${BAR[rank]}`}
                  style={{ height: `${Math.max(6, h.score)}%` }}
                />
              </div>
              <p className="mt-0.5 text-xs font-black tabular-nums">{h.score}</p>

              <p
                className={`text-[10px] leading-tight ${
                  isNow ? "text-white/80" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {w ? degToDirName(w.windDirDeg).slice(0, 2) : ""}
                <br />
                {w ? `${w.windSpeedMs}` : ""}
              </p>
              {h.unsafe && <p className="text-xs">⚠️</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
