"use client";

// 「今から釣りに行く」ボタン。
// 現在時刻・天気・風・潮・移動時間・日没までの時間・対象魚・時合いを
// 考慮して、いま出発して間に合う釣り場を提案する。

import { useMemo, useState } from "react";
import Link from "next/link";
import DataBadge from "@/components/DataBadge";
import { ExpectationChip } from "@/components/ExpectationBadge";
import FishSelect from "@/components/FishSelect";
import Header from "@/components/Header";
import Stars from "@/components/Stars";
import WarningBanner from "@/components/WarningBanner";
import { AREA_INFOS } from "@/lib/areas";
import { calcSunMoon, hourToHM } from "@/lib/astro";
import { buildForecast } from "@/lib/forecast";
import { SAFETY_DISCLAIMER } from "@/lib/safety";
import { getSettings, saveSettings, type AppSettings } from "@/lib/storage";
import { useLocalData, useNow } from "@/lib/useClient";
import { useDayForecasts } from "@/lib/useForecast";
import type { FishKey, SpotForecast } from "@/lib/types";

const DEFAULT_SETTINGS: AppSettings = {
  homeArea: "八幡浜",
  travelSpeedKmh: 38,
  useGps: false,
};

/** 2地点間のおおよその距離(km)。ヒュベニの簡易式 */
function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat = ((a[0] + b[0]) / 2) * (Math.PI / 180);
  const x = dLng * Math.cos(lat);
  return Math.sqrt(dLat * dLat + x * x) * R;
}

interface Candidate {
  forecast: SpotForecast;
  distanceKm: number;
  /** 移動時間(分) */
  travelMin: number;
  /** 到着時刻(小数時) */
  arriveHour: number;
  /** 到着後、日没までに残る時間(時間)。負なら日没後 */
  daylightLeftH: number;
  /** 到着してから今日の終わりまでの最高期待度 */
  scoreAfterArrival: number;
  /** 到着後にまだ残っている時合い */
  windowAfterArrival: { start: string; end: string; score: number } | null;
  reason: string;
}

export default function NowPage() {
  const now = useNow();
  const settings = useLocalData(getSettings, DEFAULT_SETTINGS);
  const [fish, setFish] = useState<FishKey | null>(null);
  const [gps, setGps] = useState<[number, number] | null>(null);
  const [gpsState, setGpsState] = useState<"未使用" | "取得中" | "取得済み" | "失敗">("未使用");

  const homeArea =
    AREA_INFOS.find((a) => a.name === settings.homeArea) ?? AREA_INFOS[0];
  const origin = useMemo<[number, number]>(
    () => gps ?? [homeArea.lat, homeArea.lng],
    [gps, homeArea.lat, homeArea.lng]
  );
  const originLabel = gps ? "現在地(GPS)" : `${homeArea.name}(拠点設定)`;
  const speedKmh = settings.travelSpeedKmh;
  const nowHour = now.hour ?? 12;

  const dateStr = now.dateStr;
  const { forecasts, spots, weathers, tides, personal, loading } = useDayForecasts(
    dateStr,
    fish,
    nowHour
  );

  const useGps = () => {
    if (!navigator.geolocation) {
      setGpsState("失敗");
      return;
    }
    setGpsState("取得中");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps([pos.coords.latitude, pos.coords.longitude]);
        setGpsState("取得済み");
        saveSettings({ useGps: true });
      },
      () => setGpsState("失敗"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const candidates = useMemo<Candidate[]>(() => {
    if (!origin || forecasts.length === 0 || !dateStr) return [];
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);

    return forecasts
      .map((f) => {
        const spot = spots.find((s) => s.id === f.spotId);
        if (!spot) return null;
        const dist = distanceKm(origin, [spot.lat, spot.lng]);
        // 南予は海沿いの細い道が多いので、直線距離を1.45倍して道のりの目安とする
        const roadKm = dist * 1.45;
        const travelMin = Math.round((roadKm / speedKmh) * 60) + 5; // 準備・駐車で+5分
        const arriveHour = nowHour + travelMin / 60;
        if (arriveHour >= 24) return null;

        const sun = calcSunMoon(date, spot.lat, spot.lng);
        const daylightLeftH = sun.sunsetH + 1 - arriveHour; // 夕まづめ終わりまで

        // 到着後の時間帯で最も高い期待度
        const after = f.hourly.filter((h) => h.hour >= arriveHour);
        if (after.length === 0) return null;
        const best = after.reduce((a, b) => (b.score > a.score ? b : a), after[0]);

        // 到着後にまだ残っている時合い
        const win = f.windows.find((w) => w.endHour > arriveHour + 0.25) ?? null;

        const reasons: string[] = [];
        reasons.push(`移動 約${travelMin}分`);
        if (daylightLeftH > 0) reasons.push(`日没まで 約${Math.floor(daylightLeftH)}時間`);
        else if (spot.nightLight) reasons.push("日没後だが常夜灯あり");
        else reasons.push("到着時は日没後(ライト必須)");
        if (win) reasons.push(`時合い ${win.start}〜${win.end}`);

        return {
          forecast: f,
          distanceKm: Math.round(roadKm * 10) / 10,
          travelMin,
          arriveHour,
          daylightLeftH,
          scoreAfterArrival: best.score,
          windowAfterArrival: win
            ? { start: win.start, end: win.end, score: win.score }
            : null,
          reason: reasons.join(" / "),
        } as Candidate;
      })
      .filter((c): c is Candidate => c !== null)
      // 到着後に狙える期待度を優先しつつ、遠すぎる場所は減点する
      .sort((a, b) => {
        const pa = a.scoreAfterArrival - Math.min(25, a.travelMin / 4);
        const pb = b.scoreAfterArrival - Math.min(25, b.travelMin / 4);
        return pb - pa;
      });
  }, [origin, forecasts, spots, speedKmh, nowHour, dateStr]);

  // 上位3件だけは魚種別のスコアも計算する(全件やると重いため)
  const top3 = useMemo(() => {
    if (!dateStr) return [];
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return candidates.slice(0, 3).map((c) => {
      const spot = spots.find((s) => s.id === c.forecast.spotId);
      const weather = spot ? weathers[spot.area] : null;
      if (!spot || !weather) return c;
      return {
        ...c,
        forecast: buildForecast({
          spot,
          date,
          weather,
          fish,
          personal,
          nowHour,
          includeTopFish: true,
          tide: tides[spot.tideStation],
        }),
      };
    });
  }, [candidates, spots, weathers, dateStr, fish, personal, nowHour, tides]);

  const anyWeather = Object.values(weathers)[0];

  return (
    <>
      <Header title="今から行くなら" />
      <main className="space-y-4 p-3">
        <section className="rounded-2xl bg-navy p-3 text-white dark:bg-navy-light">
          <p className="text-sm font-bold text-ocean-200">現在時刻</p>
          <p className="text-4xl font-black tabular-nums">{hourToHM(nowHour)}</p>
          <p className="mt-1 text-sm">出発地：{originLabel}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={useGps}
              className="rounded-xl bg-ocean-600 px-4 py-2 font-bold text-white"
            >
              📍 現在地(GPS)を使う
            </button>
            {gpsState === "取得中" && <span className="self-center text-sm">取得中…</span>}
            {gpsState === "失敗" && (
              <span className="self-center text-sm text-amber-300">
                取得できませんでした。拠点エリアで計算します。
              </span>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
          <h2 className="mb-2 font-bold">狙う魚</h2>
          <FishSelect value={fish} onChange={setFish} />
          <label className="mt-3 block text-sm font-bold">
            移動速度の目安：{speedKmh}km/h
            <input
              type="range"
              min={20}
              max={60}
              step={2}
              value={speedKmh}
              onChange={(e) => saveSettings({ travelSpeedKmh: Number(e.target.value) })}
              className="mt-1 w-full"
            />
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            移動時間は直線距離を1.45倍した概算です。実際の所要時間はカーナビでご確認ください。
          </p>
        </section>

        {loading && (
          <p className="rounded-xl bg-white p-4 text-center text-slate-500 dark:bg-navy-light">
            計算中…
          </p>
        )}

        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold">今から行くならおすすめ TOP3</h2>
            {anyWeather && <DataBadge quality={anyWeather.quality} />}
          </div>
          {top3.length === 0 && !loading && (
            <p className="rounded-xl bg-white p-4 text-center text-slate-500 dark:bg-navy-light">
              今から間に合う釣り場が見つかりませんでした。時間帯を変えて確認してください。
            </p>
          )}
          {top3.map((c, i) => (
            <div
              key={c.forecast.spotId}
              className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-navy-light"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 rounded-lg bg-ocean-800 px-2 py-0.5 text-sm font-black text-white">
                  {i + 1}位
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/spot/${c.forecast.spotId}`} className="block">
                    <p className="truncate text-lg font-bold">{c.forecast.spotName}</p>
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {c.forecast.area} / 約{c.distanceKm}km
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <ExpectationChip score={c.scoreAfterArrival} />
                  <Stars n={c.forecast.stars} size="text-sm" />
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <Info label="到着予定" value={hourToHM(c.arriveHour)} />
                <Info label="移動時間" value={`約${c.travelMin}分`} />
                <Info
                  label="日没まで"
                  value={
                    c.daylightLeftH > 0
                      ? `約${Math.floor(c.daylightLeftH)}時間${Math.round((c.daylightLeftH % 1) * 60)}分`
                      : "日没後"
                  }
                />
                <Info
                  label="残る時合い"
                  value={
                    c.windowAfterArrival
                      ? `${c.windowAfterArrival.start}〜${c.windowAfterArrival.end}`
                      : "—"
                  }
                />
              </div>

              <p className="mt-2 text-sm">
                <b>狙える魚：</b>
                {c.forecast.topFish.length > 0
                  ? c.forecast.topFish.slice(0, 3).map((t) => t.fish).join("・")
                  : "—"}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{c.reason}</p>
              <p className="mt-1 text-sm">
                風：{c.forecast.wind.dirName} {c.forecast.wind.speedMs}m/s（
                {c.forecast.wind.relation}）
              </p>

              <WarningBanner warnings={c.forecast.warnings} compact />

              <Link
                href={`/spot/${c.forecast.spotId}`}
                className="mt-2 block rounded-xl bg-ocean-700 py-2 text-center font-bold text-white"
              >
                詳細とルアー提案を見る
              </Link>
            </div>
          ))}
        </section>

        {candidates.length > 3 && (
          <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
            <h2 className="mb-2 font-bold">その他の候補</h2>
            <ul className="space-y-1 text-sm">
              {candidates.slice(3, 10).map((c) => (
                <li key={c.forecast.spotId}>
                  <Link href={`/spot/${c.forecast.spotId}`} className="flex justify-between gap-2">
                    <span className="truncate">
                      {c.forecast.spotName}
                      <span className="text-slate-500 dark:text-slate-400">
                        （{c.forecast.area} / 約{c.travelMin}分）
                      </span>
                    </span>
                    <b className="shrink-0">{c.scoreAfterArrival}点</b>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="pb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {SAFETY_DISCLAIMER}
        </p>
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-100 p-2 dark:bg-navy">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-bold tabular-nums">{value}</p>
    </div>
  );
}
