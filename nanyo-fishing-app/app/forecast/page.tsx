"use client";

// 時合い予報。
// 日付(今日・明日・今週末・指定日) × 魚種 × エリア で釣り場を比較し、
// 24時間の釣れやすさグラフとベストタイムを表示する。

import { useMemo, useState } from "react";
import DataBadge from "@/components/DataBadge";
import DateNav from "@/components/DateNav";
import { ExpectationBig } from "@/components/ExpectationBadge";
import FishSelect from "@/components/FishSelect";
import Header from "@/components/Header";
import HourlyChart from "@/components/HourlyChart";
import SpotRow from "@/components/SpotRow";
import WarningBanner from "@/components/WarningBanner";
import { AREA_INFOS, REGIONS } from "@/lib/areas";
import { calcSunMoon } from "@/lib/astro";
import { formatDateJa } from "@/lib/date";
import { buildForecast, shioDescription } from "@/lib/forecast";
import { SAFETY_DISCLAIMER } from "@/lib/safety";
import { useNow } from "@/lib/useClient";
import { useDayForecasts } from "@/lib/useForecast";
import type { Area, FishKey, Region } from "@/lib/types";

export default function ForecastPage() {
  const now = useNow();
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const [fish, setFish] = useState<FishKey | null>(null);
  const [region, setRegion] = useState<Region | "すべて">("すべて");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const today = now.dateStr ?? "";
  const dateStr = dateOverride ?? now.dateStr;
  const nowHour = now.hour;
  const isToday = dateStr === today;
  const { forecasts, spots, weathers, tides, personal, loading, error } = useDayForecasts(
    dateStr,
    fish,
    isToday ? nowHour : undefined
  );

  const areasInRegionSet = useMemo(() => {
    if (region === "すべて") return null;
    return new Set<Area>(AREA_INFOS.filter((a) => a.region === region).map((a) => a.name));
  }, [region]);

  const filtered = useMemo(
    () =>
      forecasts.filter((f) => !areasInRegionSet || areasInRegionSet.has(f.area)),
    [forecasts, areasInRegionSet]
  );

  // 選択中の釣り場(未選択なら1位)
  const target = useMemo(() => {
    const chosen = selectedId ? filtered.find((f) => f.spotId === selectedId) : null;
    return chosen ?? filtered[0] ?? null;
  }, [filtered, selectedId]);

  const detail = useMemo(() => {
    if (!target || !dateStr) return null;
    const spot = spots.find((s) => s.id === target.spotId);
    const weather = spot ? weathers[spot.area] : null;
    if (!spot || !weather) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    return buildForecast({
      spot,
      date: new Date(y, m - 1, d),
      weather,
      fish,
      personal,
      nowHour: isToday ? nowHour : undefined,
      includeTopFish: true,
      tide: tides[spot.tideStation],
    });
  }, [target, spots, weathers, dateStr, fish, personal, nowHour, isToday, tides]);

  const detailSpot = spots.find((s) => s.id === detail?.spotId);
  const sun = useMemo(() => {
    if (!detailSpot || !dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    return calcSunMoon(new Date(y, m - 1, d), detailSpot.lat, detailSpot.lng);
  }, [detailSpot, dateStr]);
  const tide = detailSpot ? tides[detailSpot.tideStation] : null;
  const weather = detailSpot ? weathers[detailSpot.area] : null;

  return (
    <>
      <Header title="時合い予報" />
      <main className="space-y-4 p-3">
        {/* ---- 条件 ---- */}
        <section className="space-y-3 rounded-2xl bg-white p-3 dark:bg-navy-light">
          {dateStr && <DateNav value={dateStr} today={today} onChange={setDateOverride} />}
          <div>
            <p className="mb-1 text-sm font-bold">狙う魚</p>
            <FishSelect value={fish} onChange={setFish} />
          </div>
          <div>
            <p className="mb-1 text-sm font-bold">エリア</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={region === "すべて"} onClick={() => setRegion("すべて")}>
                南予全域
              </Chip>
              {REGIONS.map((r) => (
                <Chip key={r} active={region === r} onClick={() => setRegion(r)}>
                  {r}
                </Chip>
              ))}
            </div>
          </div>
        </section>

        {loading && (
          <p className="rounded-xl bg-white p-4 text-center text-slate-500 dark:bg-navy-light">
            予測を計算中…
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {error}
          </p>
        )}

        {/* ---- 選択中の釣り場の予報 ---- */}
        {detail && (
          <>
            <WarningBanner warnings={detail.warnings} />
            <section className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-bold">{detail.spotName}</h2>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {detail.area} / {dateStr && formatDateJa(dateStr)}
                </span>
              </div>
              <ExpectationBig
                score={isToday ? detail.nowScore : detail.score}
                label={isToday ? "現在の釣れやすさ" : "この日の最高期待度"}
              />
              {detail.best && (
                <div className="rounded-2xl border-2 border-rose-400 bg-rose-50 p-3 dark:bg-rose-950/40">
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                    BEST TIME
                  </p>
                  <p className="text-3xl font-black tabular-nums">
                    {detail.best.start}〜{detail.best.end}
                  </p>
                  <p className="font-bold">期待度 {detail.best.score}点</p>
                  <p className="mt-1 text-sm">{detail.best.reasons.join("・")}</p>
                </div>
              )}
            </section>

            {tide && sun && (
              <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-bold">24時間の釣れやすさ</h2>
                  {weather && <DataBadge quality={weather.quality} title={weather.source} />}
                </div>
                <HourlyChart
                  hourly={detail.hourly}
                  events={tide.events}
                  sun={sun}
                  nowHour={isToday ? nowHour : undefined}
                  best={detail.best}
                />
                <p className="mt-2 text-sm">
                  <b>潮回り：</b>
                  {tide.shio}（月齢 {tide.moonAge.toFixed(1)}・{tide.stationName}基準の参考値）
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {dateStr &&
                    detailSpot &&
                    shioDescription(new Date(dateStr), detailSpot.tideStation)}
                </p>
              </section>
            )}

            {detail.topFish.length > 0 && (
              <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
                <h2 className="mb-2 text-lg font-bold">魚種別の期待度</h2>
                <ul className="space-y-1">
                  {detail.topFish.map((t) => (
                    <li key={t.fish} className="flex items-center gap-2">
                      <span className="w-20 shrink-0 font-bold">{t.fish}</span>
                      <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-navy">
                        <span
                          className="block h-full rounded-full bg-ocean-500"
                          style={{ width: `${t.score}%` }}
                        />
                      </span>
                      <span className="w-10 shrink-0 text-right font-bold tabular-nums">
                        {t.score}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {/* ---- 釣り場ランキング ---- */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold">
            この条件のおすすめ順（{filtered.length}件）
          </h2>
          {filtered.slice(0, 15).map((f, i) => (
            <button
              key={f.spotId}
              onClick={() => setSelectedId(f.spotId)}
              className="block w-full text-left"
            >
              <div
                className={
                  f.spotId === detail?.spotId
                    ? "rounded-xl ring-2 ring-ocean-500"
                    : undefined
                }
              >
                <SpotRow forecast={f} rank={i + 1} showFish={false} />
              </div>
            </button>
          ))}
        </section>

        <p className="pb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {SAFETY_DISCLAIMER}
        </p>
      </main>
    </>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-bold ${
        active
          ? "bg-ocean-700 text-white"
          : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
