"use client";

// ホーム:今日のおすすめ釣り場・風・潮・おすすめ時間帯を大きく表示する

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Stars from "@/components/Stars";
import WarningBanner from "@/components/WarningBanner";
import SampleBadge from "@/components/SampleBadge";
import { calcSunTimes, formatHM } from "@/lib/astro";
import { calcTideInfo } from "@/lib/tide";
import { getWeather, sampleWeather } from "@/lib/weather";
import { calcSpotScore } from "@/lib/score";
import { getAllSpots, getFavorites, getRecords } from "@/lib/storage";
import { useHydrated } from "@/lib/useHydrated";
import { todayStr, formatDateJa, toDateStr } from "@/lib/date";
import type { CatchRecord, DailyWeather, FishingSpot, SpotScore } from "@/lib/types";

interface Ranked {
  spot: FishingSpot;
  score: SpotScore;
  weather: DailyWeather;
}

export default function HomePage() {
  const hydrated = useHydrated();
  const [dateStr, setDateStr] = useState(todayStr());
  const [ranked, setRanked] = useState<Ranked[]>([]);

  const spots = useMemo<FishingSpot[]>(() => (hydrated ? getAllSpots() : []), [hydrated]);
  const favorites = useMemo<string[]>(() => (hydrated ? getFavorites() : []), [hydrated]);
  const records = useMemo<CatchRecord[]>(() => (hydrated ? getRecords() : []), [hydrated]);

  const date = useMemo(() => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [dateStr]);

  useEffect(() => {
    if (spots.length === 0) return;
    let cancelled = false;
    (async () => {
      const results: Ranked[] = [];
      for (const spot of spots) {
        // サンプル天気は釣り場ごとにシードを変え、スコアに差が出るようにする
        const weather = await getWeather(dateStr, spot.lat, spot.lng, spot.id);
        results.push({ spot, weather, score: calcSpotScore(spot, date, weather, records) });
      }
      // お気に入りを優先しつつスコア順に並べる
      results.sort((a, b) => {
        const favA = favorites.includes(a.spot.id) ? 1 : 0;
        const favB = favorites.includes(b.spot.id) ? 1 : 0;
        if (favA !== favB) return favB - favA;
        return b.score.total - a.score.total;
      });
      if (!cancelled) setRanked(results);
    })();
    return () => {
      cancelled = true;
    };
  }, [spots, favorites, records, dateStr, date]);

  const best = ranked[0];
  const tide = useMemo(() => calcTideInfo(date), [date]);
  const sun = useMemo(() => {
    const lat = best?.spot.lat ?? 33.46;
    const lng = best?.spot.lng ?? 132.42;
    return calcSunTimes(date, lat, lng);
  }, [date, best]);
  const weather = best?.weather ?? sampleWeather(dateStr, "八幡浜");

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDateStr(toDateStr(d));
  };

  return (
    <main>
      <Header title="南予釣行ナビ" />
      <div className="space-y-4 p-4">
        {/* 日付切り替え */}
        <div className="flex items-center justify-between rounded-xl bg-white p-2 shadow dark:bg-navy-light">
          <button
            onClick={() => shiftDate(-1)}
            className="rounded-lg bg-ocean-100 px-4 py-2 text-lg font-bold text-ocean-800 dark:bg-ocean-900 dark:text-ocean-200"
          >
            ◀ 前日
          </button>
          <div className="text-center">
            <p className="text-lg font-bold">{formatDateJa(dateStr)}</p>
            {dateStr === todayStr() && (
              <p className="text-sm text-ocean-600 dark:text-ocean-300">今日</p>
            )}
          </div>
          <button
            onClick={() => shiftDate(1)}
            className="rounded-lg bg-ocean-100 px-4 py-2 text-lg font-bold text-ocean-800 dark:bg-ocean-900 dark:text-ocean-200"
          >
            翌日 ▶
          </button>
        </div>

        {best && <WarningBanner warnings={best.score.warnings} />}

        {/* 今日のおすすめ */}
        <section className="rounded-2xl bg-gradient-to-br from-ocean-800 to-ocean-600 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-sky-200">
              {dateStr === todayStr() ? "今日" : "この日"}のおすすめ
            </h2>
            <SampleBadge show={weather.isSample} />
          </div>
          {best ? (
            <>
              <p className="mt-1 text-3xl font-extrabold">{best.spot.name}</p>
              <div className="mt-2 flex items-center gap-3">
                <Stars n={best.score.stars} size="text-3xl" />
                <span className="text-xl font-bold">{best.score.total}点</span>
              </div>
              <p className="mt-2 text-sm text-sky-100">
                釣れる魚:{best.spot.fish.slice(0, 4).join("・")}
              </p>
              <p className="mt-1 text-xs text-sky-200">
                ※おすすめ度は判断材料です。釣果を保証するものではありません。
              </p>
            </>
          ) : (
            <p className="mt-2 text-lg">計算中…</p>
          )}
        </section>

        {/* 風・潮・時間の大きな表示 */}
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
            <p className="text-base font-bold text-slate-500 dark:text-slate-300">🌬️ 風</p>
            <p className="mt-1 text-3xl font-extrabold">
              {weather.windSpeedMs}
              <span className="text-lg font-bold"> m/s</span>
            </p>
            <p className="text-lg font-bold">{weather.windDir}の風</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
            <p className="text-base font-bold text-slate-500 dark:text-slate-300">🌊 潮</p>
            <p className="mt-1 text-3xl font-extrabold">{tide.shio}</p>
            <p className="text-sm font-medium">
              {tide.events
                .map((e) => `${e.type === "満潮" ? "満" : "干"}${e.time}`)
                .join(" / ")}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
            <p className="text-base font-bold text-slate-500 dark:text-slate-300">☀️ 天気</p>
            <p className="mt-1 text-2xl font-extrabold">{weather.label}</p>
            <p className="text-lg font-bold">
              {weather.tempMinC}〜{weather.tempMaxC}℃ / 降水{weather.precipProb}%
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
            <p className="text-base font-bold text-slate-500 dark:text-slate-300">🌅 日の出入</p>
            <p className="mt-1 text-xl font-extrabold">出 {formatHM(sun.sunrise)}</p>
            <p className="text-xl font-extrabold">入 {formatHM(sun.sunset)}</p>
          </div>
        </section>

        {/* おすすめ時間帯 */}
        {best && best.score.windows.length > 0 && (
          <section className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
            <h2 className="text-lg font-bold">⏰ おすすめの時間帯</h2>
            <ul className="mt-2 space-y-2">
              {best.score.windows.map((w) => (
                <li
                  key={w.start}
                  className="rounded-xl bg-ocean-50 p-3 dark:bg-ocean-900"
                >
                  <p className="text-2xl font-extrabold text-ocean-800 dark:text-ocean-200">
                    {w.start} 〜 {w.end}
                  </p>
                  <p className="text-base font-medium">{w.reasons.join("・")}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 他の釣り場ランキング */}
        <section className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
          <h2 className="text-lg font-bold">📍 釣り場ランキング</h2>
          <ul className="mt-2 divide-y divide-slate-200 dark:divide-ocean-800">
            {ranked.slice(0, 6).map(({ spot, score }) => (
              <li key={spot.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-base font-bold">
                    {favorites.includes(spot.id) && "⭐ "}
                    {spot.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{spot.area}</p>
                </div>
                <div className="text-right">
                  <Stars n={score.stars} size="text-lg" />
                  <p className="text-sm font-bold">{score.total}点</p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/map"
            className="mt-3 block rounded-xl bg-ocean-600 py-3 text-center text-lg font-bold text-white"
          >
            マップで見る
          </Link>
        </section>

        <p className="px-2 text-sm text-slate-500 dark:text-slate-400">
          天気・潮汐はAPIキー未設定のためサンプル値です(潮回り・日の出入は計算値)。実際の釣行前は気象庁の警報・注意報と潮汐表を必ず確認してください。
        </p>
      </div>
    </main>
  );
}
