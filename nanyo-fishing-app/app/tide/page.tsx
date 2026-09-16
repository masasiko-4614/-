"use client";

// 潮汐情報。南予の主要7地点の潮位グラフ・満干・潮回りを表示する。

import { useMemo, useState } from "react";
import DataBadge from "@/components/DataBadge";
import DateNav from "@/components/DateNav";
import Header from "@/components/Header";
import TideChart from "@/components/TideChart";
import { calcSunMoon } from "@/lib/astro";
import { formatDateJa } from "@/lib/date";
import { shioDescription } from "@/lib/forecast";
import { TIDE_STATIONS, calcTideInfo, tideStateAt } from "@/lib/tide";
import { useNow } from "@/lib/useClient";
import type { TideStationId } from "@/lib/types";

export default function TidePage() {
  const now = useNow();
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const [stationId, setStationId] = useState<TideStationId>("yawatahama");

  const today = now.dateStr ?? "";
  const dateStr = dateOverride ?? now.dateStr;
  const nowHour = now.hour;
  const isToday = dateStr === today;
  const date = useMemo(() => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [dateStr]);

  const tide = useMemo(
    () => (date ? calcTideInfo(date, stationId) : null),
    [date, stationId]
  );

  const station = TIDE_STATIONS.find((s) => s.id === stationId)!;
  const sun = useMemo(
    () => (date ? calcSunMoon(date, station.lat, station.lng) : null),
    [date, station]
  );

  const nowState =
    date && isToday && nowHour !== undefined ? tideStateAt(date, nowHour, stationId) : null;

  // 全地点の満干一覧
  const allStations = useMemo(() => {
    if (!date) return [];
    return TIDE_STATIONS.map((s) => ({ station: s, info: calcTideInfo(date, s.id) }));
  }, [date]);

  return (
    <>
      <Header title="潮汐" />
      <main className="space-y-4 p-3">
        <section className="space-y-3 rounded-2xl bg-white p-3 dark:bg-navy-light">
          {dateStr && <DateNav value={dateStr} today={today} onChange={setDateOverride} />}
          <div className="flex flex-wrap gap-1.5">
            {TIDE_STATIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setStationId(s.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                  stationId === s.id
                    ? "bg-ocean-700 text-white"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </section>

        {tide && (
          <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {tide.stationName}
                {dateStr && (
                  <span className="ml-2 text-sm font-normal">{formatDateJa(dateStr)}</span>
                )}
              </h2>
              <DataBadge quality={tide.quality} title={tide.source} />
            </div>

            <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-3xl font-black">{tide.shio}</span>
              <span className="text-sm">月齢 {tide.moonAge.toFixed(1)}</span>
              {nowState && (
                <span className="rounded-lg bg-ocean-100 px-2 py-1 font-bold text-ocean-800 dark:bg-ocean-900 dark:text-ocean-100">
                  現在：{nowState}
                </span>
              )}
            </div>

            <TideChart tide={tide} nowHour={isToday ? nowHour : undefined} height={220} />

            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-sky-50 p-2 dark:bg-navy">
                <p className="font-bold text-sky-700 dark:text-sky-300">満潮</p>
                {tide.events
                  .filter((e) => e.type === "満潮")
                  .map((e) => (
                    <p key={e.time} className="tabular-nums">
                      {e.time} — {e.levelCm}cm
                    </p>
                  ))}
                {tide.events.filter((e) => e.type === "満潮").length === 0 && <p>—</p>}
              </div>
              <div className="rounded-xl bg-slate-100 p-2 dark:bg-navy">
                <p className="font-bold text-slate-600 dark:text-slate-300">干潮</p>
                {tide.events
                  .filter((e) => e.type === "干潮")
                  .map((e) => (
                    <p key={e.time} className="tabular-nums">
                      {e.time} — {e.levelCm}cm
                    </p>
                  ))}
                {tide.events.filter((e) => e.type === "干潮").length === 0 && <p>—</p>}
              </div>
            </div>

            {sun && (
              <p className="mt-2 text-sm">
                日の出 {sun.sunrise} / 日の入り {sun.sunset} / {sun.moonName}
              </p>
            )}
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {date && shioDescription(date, stationId)}
            </p>
          </section>
        )}

        {/* ---- 全地点の比較 ---- */}
        <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
          <h2 className="mb-2 text-lg font-bold">南予 主要地点の満干</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-1.5">地点</th>
                  <th className="p-1.5">潮</th>
                  <th className="p-1.5">満潮</th>
                  <th className="p-1.5">干潮</th>
                </tr>
              </thead>
              <tbody>
                {allStations.map(({ station: s, info }) => (
                  <tr
                    key={s.id}
                    className="border-t border-slate-200 dark:border-slate-700"
                  >
                    <th className="p-1.5 text-left font-bold">{s.name}</th>
                    <td className="p-1.5">{info.shio}</td>
                    <td className="p-1.5 tabular-nums">
                      {info.events
                        .filter((e) => e.type === "満潮")
                        .map((e) => e.time)
                        .join(" / ") || "—"}
                    </td>
                    <td className="p-1.5 tabular-nums">
                      {info.events
                        .filter((e) => e.type === "干潮")
                        .map((e) => e.time)
                        .join(" / ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-400 bg-amber-50 p-3 text-sm dark:bg-amber-950/50">
          <p className="font-bold text-amber-900 dark:text-amber-100">潮汐データについて</p>
          <p className="mt-1 text-amber-900 dark:text-amber-100">
            この潮位は、月と太陽の周期(M2・S2分潮)から計算した<b>参考値</b>です。
            気象庁が公表する正式な潮汐表ではありません。
            実際の潮位は気圧・風・海流の影響で数十cm変わることがあります。
            渡船や磯釣りなど正確な潮位が必要な場面では、必ず気象庁の潮汐表を確認してください。
          </p>
        </section>
      </main>
    </>
  );
}
