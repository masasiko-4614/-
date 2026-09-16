"use client";

// 南予ランキング。地域別・魚種別に今日の期待度を比較する。

import { useMemo, useState } from "react";
import Link from "next/link";
import DataBadge from "@/components/DataBadge";
import { ExpectationChip } from "@/components/ExpectationBadge";
import DateNav from "@/components/DateNav";
import Header from "@/components/Header";
import { RANKING_AREAS } from "@/lib/areas";
import { formatDateJa } from "@/lib/date";
import { FISH_KEYS } from "@/lib/fish";
import { buildForecast } from "@/lib/forecast";
import { useNow } from "@/lib/useClient";
import { useDayForecasts } from "@/lib/useForecast";
import type { Area, FishKey, SpotForecast } from "@/lib/types";

/** ランキングで比較する魚種 */
const RANKING_FISH: FishKey[] = ["アジ", "メバル", "シーバス", "アオリイカ", "青物"];

export default function RankingPage() {
  const now = useNow();
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const [mode, setMode] = useState<"エリア" | "魚種">("エリア");
  const [fish, setFish] = useState<FishKey>("アジ");
  const today = now.dateStr ?? "";
  const dateStr = dateOverride ?? now.dateStr;

  const { forecasts, spots, weathers, tides, personal, loading } = useDayForecasts(
    dateStr,
    mode === "魚種" ? fish : null
  );

  // エリアごとの最高スコア
  const areaRanking = useMemo(() => {
    const byArea = new Map<Area, SpotForecast[]>();
    forecasts.forEach((f) => {
      const arr = byArea.get(f.area) ?? [];
      arr.push(f);
      byArea.set(f.area, arr);
    });
    return [...byArea.entries()]
      .map(([area, list]) => {
        const sorted = [...list].sort((a, b) => b.score - a.score);
        return { area, best: sorted[0], count: list.length };
      })
      .sort((a, b) => b.best.score - a.best.score);
  }, [forecasts]);

  // 代表エリア × 魚種のマトリクス
  const matrix = useMemo(() => {
    if (!dateStr || spots.length === 0 || Object.keys(weathers).length === 0) return [];
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);

    return RANKING_AREAS.map((area) => {
      const areaSpots = spots.filter((s) => s.area === area && s.fish.length > 0);
      const scores = RANKING_FISH.map((f) => {
        let best = 0;
        let bestSpot = "";
        for (const spot of areaSpots) {
          if (!spot.fish.includes(f)) continue;
          const weather = weathers[spot.area];
          if (!weather) continue;
          const fc = buildForecast({
            spot,
            date,
            weather,
            fish: f,
            personal,
            tide: tides[spot.tideStation],
          });
          if (fc.score > best) {
            best = fc.score;
            bestSpot = spot.name;
          }
        }
        return { fish: f, score: best, spotName: bestSpot };
      });
      return { area, scores };
    });
  }, [dateStr, spots, weathers, personal, tides]);

  const anyWeather = Object.values(weathers)[0];

  return (
    <>
      <Header title="南予ランキング" />
      <main className="space-y-4 p-3">
        <section className="space-y-3 rounded-2xl bg-white p-3 dark:bg-navy-light">
          {dateStr && <DateNav value={dateStr} today={today} onChange={setDateOverride} />}
          <div className="flex gap-1.5">
            {(["エリア", "魚種"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-xl py-2 font-bold ${
                  mode === m
                    ? "bg-ocean-700 text-white"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                }`}
              >
                {m}で見る
              </button>
            ))}
          </div>
          {mode === "魚種" && (
            <div className="flex flex-wrap gap-1.5">
              {FISH_KEYS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFish(f)}
                  className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                    fish === f
                      ? "bg-ocean-700 text-white"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </section>

        {loading && (
          <p className="rounded-xl bg-white p-4 text-center text-slate-500 dark:bg-navy-light">
            計算中…
          </p>
        )}

        {/* ---- 地域ランキング ---- */}
        <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold">
              地域別ランキング
              {mode === "魚種" && <span className="ml-1 text-sm">（{fish}）</span>}
            </h2>
            {anyWeather && <DataBadge quality={anyWeather.quality} />}
          </div>
          <ul className="space-y-1.5">
            {areaRanking.map((r, i) => (
              <li key={r.area}>
                <Link
                  href={`/spot/${r.best.spotId}`}
                  className="flex items-center gap-2 rounded-xl bg-slate-100 p-2.5 dark:bg-navy"
                >
                  <span className="w-8 shrink-0 text-center font-black text-ocean-700 dark:text-ocean-300">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{r.area}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      最有力：{r.best.spotName}
                      {r.best.best && ` / ${r.best.best.start}〜${r.best.best.end}`}
                    </p>
                  </div>
                  <ExpectationChip score={r.best.score} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- 主要エリア × 魚種マトリクス ---- */}
        {matrix.length > 0 && (
          <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
            <h2 className="mb-2 text-lg font-bold">主要エリア × 魚種</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white p-1.5 text-left dark:bg-navy-light">
                      エリア
                    </th>
                    {RANKING_FISH.map((f) => (
                      <th key={f} className="p-1.5 text-center">
                        {f}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr key={row.area} className="border-t border-slate-200 dark:border-slate-700">
                      <th className="sticky left-0 bg-white p-1.5 text-left font-bold dark:bg-navy-light">
                        {row.area}
                      </th>
                      {row.scores.map((s) => (
                        <td key={s.fish} className="p-1 text-center">
                          {s.score > 0 ? (
                            <span
                              title={s.spotName}
                              className={`inline-block w-full rounded-lg py-1 font-bold tabular-nums ${cellClass(
                                s.score
                              )}`}
                            >
                              {s.score}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              各エリアで最も期待度の高い釣り場の点数です。「—」はその魚種の登録釣り場がないことを示します。
              {dateStr && ` （${formatDateJa(dateStr)}）`}
            </p>
          </section>
        )}

        {/* ---- 釣り場トップ20 ---- */}
        <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
          <h2 className="mb-2 text-lg font-bold">釣り場トップ20</h2>
          <ol className="space-y-1 text-sm">
            {forecasts.slice(0, 20).map((f, i) => (
              <li key={f.spotId}>
                <Link href={`/spot/${f.spotId}`} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-right text-slate-500">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {f.spotName}
                    <span className="text-slate-500 dark:text-slate-400">（{f.area}）</span>
                  </span>
                  <b className="shrink-0 tabular-nums">{f.score}</b>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}

function cellClass(score: number): string {
  if (score >= 80) return "bg-rose-500 text-white";
  if (score >= 70) return "bg-orange-400 text-white";
  if (score >= 55) return "bg-emerald-500 text-white";
  if (score >= 40) return "bg-sky-400 text-white";
  return "bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-100";
}
