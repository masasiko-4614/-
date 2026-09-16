"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DataBadge from "@/components/DataBadge";
import DateNav from "@/components/DateNav";
import { ExpectationBig } from "@/components/ExpectationBadge";
import FishSelect from "@/components/FishSelect";
import Header from "@/components/Header";
import HourlyChart from "@/components/HourlyChart";
import Stars from "@/components/Stars";
import TideChart from "@/components/TideChart";
import WarningBanner from "@/components/WarningBanner";
import { calcSunMoon } from "@/lib/astro";
import { formatDateJa } from "@/lib/date";
import { FISH_PROFILES } from "@/lib/fish";
import { suggestLure } from "@/lib/lure";
import { SAFETY_DISCLAIMER } from "@/lib/safety";
import { getAllSpots, getFavorites, toggleFavorite } from "@/lib/storage";
import { calcTideInfo } from "@/lib/tide";
import { useLocalData, useNow } from "@/lib/useClient";
import { useSpotForecast } from "@/lib/useForecast";
import { degToDirName, weatherEmoji } from "@/lib/weather";
import type { FishKey, FishingSpot } from "@/lib/types";

const NO_FAVORITES: string[] = [];
const NO_SPOTS: FishingSpot[] = [];

export default function SpotDetail() {
  const spotId = useSearchParams().get("id");
  const now = useNow();
  const allSpots = useLocalData(getAllSpots, NO_SPOTS);
  const favorites = useLocalData(getFavorites, NO_FAVORITES);
  const [fish, setFish] = useState<FishKey | null>(null);
  const [dateOverride, setDateOverride] = useState<string | null>(null);

  const spot = useMemo(
    () => allSpots.find((s) => s.id === spotId),
    [allSpots, spotId]
  );
  const today = now.dateStr ?? "";
  const dateStr = dateOverride ?? now.dateStr;
  const nowHour = now.hour;
  const isToday = dateStr === today;
  const { forecast, weather, loading } = useSpotForecast(
    spot,
    dateStr,
    fish,
    isToday ? nowHour : undefined
  );

  const sun = useMemo(() => {
    if (!spot || !dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    return calcSunMoon(new Date(y, m - 1, d), spot.lat, spot.lng);
  }, [spot, dateStr]);

  const tide = useMemo(() => {
    if (!spot || !dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    return calcTideInfo(new Date(y, m - 1, d), spot.tideStation);
  }, [spot, dateStr]);

  // ルアー提案は「ベストタイムの時刻」を基準にする
  const advice = useMemo(() => {
    if (!spot || !forecast || !sun || !dateStr) return null;
    const target = fish ?? forecast.topFish[0]?.fish ?? spot.fish[0];
    if (!target) return null;
    const hour = forecast.best
      ? (forecast.best.startHour + forecast.best.endHour) / 2
      : (nowHour ?? 12);
    const hf = forecast.hourly[Math.floor(hour)] ?? forecast.hourly[0];
    const hw = weather?.hourly[Math.floor(hour)];
    return suggestLure({
      spot,
      fish: target,
      hour,
      tideState: hf?.tideState ?? "上げ潮",
      windSpeedMs: hw?.windSpeedMs ?? 2,
      sunriseH: sun.sunriseH,
      sunsetH: sun.sunsetH,
      month: Number(dateStr.split("-")[1]),
      murky: (hw?.precipMm ?? 0) >= 3,
    });
  }, [spot, forecast, sun, dateStr, fish, nowHour, weather]);

  if (!now.ready) {
    return (
      <>
        <Header title="釣り場詳細" />
        <p className="p-4 text-center text-slate-500">読み込み中…</p>
      </>
    );
  }

  if (!spot) {
    return (
      <>
        <Header title="釣り場詳細" />
        <main className="p-4">
          <p className="rounded-xl bg-white p-4 text-center dark:bg-navy-light">
            釣り場が見つかりませんでした。
          </p>
          <Link href="/map" className="mt-3 block text-center font-bold text-ocean-600">
            マップへ戻る
          </Link>
        </main>
      </>
    );
  }

  const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
  const nowHourly = weather?.hourly[Math.floor(nowHour ?? 12)];

  return (
    <>
      <Header title={spot.name} />
      <main className="space-y-4 p-3">
        {/* ---- 基本情報 ---- */}
        <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-black">{spot.name}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {spot.area} / {spot.type}
                {spot.isCustom && " / 自分で追加した釣り場"}
              </p>
            </div>
            <button
              onClick={() => toggleFavorite(spot.id)}
              aria-label="お気に入り登録"
              className="rounded-lg bg-slate-100 px-3 py-2 text-2xl dark:bg-navy"
            >
              {favorites.includes(spot.id) ? "⭐" : "☆"}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5 text-sm">
            <Tag>{spot.beginner ? "初心者向き" : "経験者向け"}</Tag>
            <Tag>危険度 {"⚠".repeat(spot.danger)}</Tag>
            <Tag>足場 {spot.footing}</Tag>
            <Tag>駐車場 {spot.parking}</Tag>
            <Tag>{spot.toilet ? "トイレあり" : "トイレなし"}</Tag>
            <Tag>{spot.nightLight ? "常夜灯あり" : "常夜灯なし"}</Tag>
          </div>

          <a
            href={gmaps}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block rounded-xl bg-ocean-700 py-2.5 text-center font-bold text-white"
          >
            🚗 Googleマップでナビ
          </a>
        </section>

        {/* ---- 日付・魚種 ---- */}
        <section className="space-y-3 rounded-2xl bg-white p-3 dark:bg-navy-light">
          {dateStr && <DateNav value={dateStr} today={today} onChange={setDateOverride} />}
          <FishSelect value={fish} onChange={setFish} available={spot.fish} />
        </section>

        {loading && (
          <p className="rounded-xl bg-white p-4 text-center text-slate-500 dark:bg-navy-light">
            予測を計算中…
          </p>
        )}

        {/* ---- 安全警告 ---- */}
        {forecast && <WarningBanner warnings={forecast.warnings} />}

        {/* ---- 期待度 ---- */}
        {forecast && (
          <section className="space-y-2">
            <ExpectationBig
              score={isToday ? forecast.nowScore : forecast.score}
              label={isToday ? "現在の釣れやすさ" : `${formatDateJa(dateStr!)}の最高期待度`}
            />
            <div className="flex items-center justify-between rounded-xl bg-white p-3 dark:bg-navy-light">
              <span className="font-bold">この日の総合評価</span>
              <span className="flex items-center gap-2">
                <Stars n={forecast.stars} />
                <span className="text-lg font-black">{forecast.score}点</span>
              </span>
            </div>
            {forecast.best && (
              <div className="rounded-2xl border-2 border-rose-400 bg-rose-50 p-3 dark:bg-rose-950/40">
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300">BEST TIME</p>
                <p className="text-3xl font-black tabular-nums">
                  {forecast.best.start}〜{forecast.best.end}
                </p>
                <p className="font-bold">期待度 {forecast.best.score}点</p>
                <p className="mt-1 text-sm">{forecast.best.reasons.join("・")}</p>
              </div>
            )}
            {forecast.windows.length > 1 && (
              <div className="rounded-xl bg-white p-3 dark:bg-navy-light">
                <p className="mb-1 font-bold">その他の狙い目</p>
                <ul className="space-y-1 text-sm">
                  {forecast.windows.slice(1).map((w) => (
                    <li key={w.start}>
                      <b className="tabular-nums">
                        {w.start}〜{w.end}
                      </b>{" "}
                      期待度 {w.score}点 — {w.reasons.join("・")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* ---- 24時間グラフ ---- */}
        {forecast && tide && sun && (
          <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
            <h2 className="mb-2 text-lg font-bold">24時間の釣れやすさ</h2>
            <HourlyChart
              hourly={forecast.hourly}
              events={tide.events}
              sun={sun}
              nowHour={isToday ? nowHour : undefined}
              best={forecast.best}
            />
          </section>
        )}

        {/* ---- 気象・風向き ---- */}
        {weather && forecast && (
          <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold">気象・風向き</h2>
              <DataBadge quality={weather.quality} title={weather.source} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Cell
                label="天気"
                value={`${weatherEmoji(nowHourly?.weatherCode ?? 0)} ${nowHourly?.label ?? weather.label}`}
              />
              <Cell label="気温" value={`${weather.tempMinC}〜${weather.tempMaxC}℃`} />
              <Cell label="降水確率" value={`${weather.precipProb}%`} />
              <Cell
                label="風"
                value={`${degToDirName(weather.windDirDeg)} ${weather.windSpeedMaxMs}m/s`}
              />
              <Cell
                label="波"
                value={weather.waveMaxM !== null ? `${weather.waveMaxM.toFixed(1)}m` : "未取得"}
              />
              <Cell label="潮" value={tide?.shio ?? "—"} />
            </div>
            <div
              className={`mt-2 rounded-xl p-3 ${
                forecast.wind.danger
                  ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                  : "bg-slate-100 dark:bg-navy"
              }`}
            >
              <p className="font-bold">
                風向き判定：{forecast.wind.relation}（この釣り場は
                {degToDirName(spot.facing)}向きに開けています）
              </p>
              <p className="text-sm">{forecast.wind.comment}</p>
            </div>
          </section>
        )}

        {/* ---- 潮汐 ---- */}
        {tide && (
          <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-bold">潮汐（{tide.stationName}）</h2>
              <DataBadge quality={tide.quality} title={tide.source} />
            </div>
            <p className="mb-1 text-sm font-bold">
              {tide.shio} / 月齢 {tide.moonAge.toFixed(1)}
            </p>
            <TideChart tide={tide} nowHour={isToday ? nowHour : undefined} />
            <p className="mt-1 text-sm">
              {tide.events.map((e) => `${e.type} ${e.time}(${e.levelCm}cm)`).join(" / ")}
            </p>
          </section>
        )}

        {/* ---- ルアー提案 ---- */}
        {advice && (
          <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
            <h2 className="mb-1 text-lg font-bold">おすすめルアー</h2>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{advice.context}</p>
            <div className="rounded-xl bg-ocean-50 p-3 dark:bg-navy">
              <p className="text-lg font-black">{advice.primary.type}</p>
              <dl className="mt-1 space-y-0.5 text-sm">
                <Row label="サイズ" value={advice.primary.size} />
                <Row label="重量" value={advice.primary.weight} />
                <Row label="カラー" value={advice.primary.color} />
                <Row label="レンジ" value={advice.primary.range} />
                <Row label="アクション" value={advice.primary.action} />
              </dl>
            </div>
            <p className="mt-2 text-sm">
              <b>理由：</b>
              {advice.reason}
            </p>
            {advice.alternatives.length > 0 && (
              <div className="mt-2">
                <p className="font-bold">他の選択肢</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {advice.alternatives.map((a) => (
                    <li key={a.type} className="rounded-lg bg-slate-100 p-2 dark:bg-navy">
                      <b>{a.type}</b>（{a.size} / {a.weight}）— {a.action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 rounded-xl bg-slate-100 p-3 dark:bg-navy">
              <p className="font-bold">おすすめタックル</p>
              <dl className="mt-1 space-y-0.5 text-sm">
                <Row label="ロッド" value={advice.tackle.rod} />
                <Row label="リール" value={advice.tackle.reel} />
                <Row label="ライン" value={advice.tackle.line} />
                <Row label="リーダー" value={advice.tackle.leader} />
                <Row label="ルアー重量" value={advice.tackle.lureWeight} />
              </dl>
              {advice.tackle.note && <p className="mt-1 text-sm">{advice.tackle.note}</p>}
              <p className="mt-1 text-sm">
                <b>エサ釣りなら：</b>
                {advice.rig}
              </p>
            </div>
          </section>
        )}

        {/* ---- 釣り場の詳細 ---- */}
        <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
          <h2 className="mb-2 text-lg font-bold">釣り場の情報</h2>
          <dl className="space-y-1 text-sm">
            <Row label="狙える魚" value={spot.fish.join("・") || "—"} />
            <Row label="おすすめ時期" value={spot.bestSeasons.join("・")} />
            <Row label="おすすめ時間" value={spot.bestHours} />
            <Row label="有利な潮" value={spot.bestTide} />
            <Row label="水深" value={spot.depth} />
            <Row label="ルアー" value={spot.lureHint} />
            <Row label="仕掛け" value={spot.rigHint} />
          </dl>
          <p className="mt-2 text-sm leading-relaxed">{spot.notes}</p>
          {spot.caution && (
            <p className="mt-2 rounded-xl border border-amber-400 bg-amber-50 p-2 text-sm font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              ⚠️ {spot.caution}
            </p>
          )}
        </section>

        {/* ---- 魚種別の詳細 ---- */}
        {spot.fish.length > 0 && (
          <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
            <h2 className="mb-2 text-lg font-bold">この釣り場で狙える魚</h2>
            <div className="space-y-2">
              {(fish ? [fish] : spot.fish).map((k) => {
                const p = FISH_PROFILES[k];
                const s = forecast?.topFish.find((t) => t.fish === k)?.score;
                return (
                  <details key={k} className="rounded-xl bg-slate-100 p-2 dark:bg-navy">
                    <summary className="cursor-pointer font-bold">
                      {p.emoji} {k}
                      {s !== undefined && (
                        <span className="ml-2 text-sm font-normal">今日の期待度 {s}点</span>
                      )}
                    </summary>
                    <dl className="mt-2 space-y-0.5 text-sm">
                      <Row label="シーズン" value={p.seasonNote} />
                      <Row label="時間帯" value={p.hourNote} />
                      <Row label="適した潮" value={p.tidePref.join("・")} />
                      <Row label="水深・レンジ" value={p.depth} />
                      <Row label="適水温" value={`${p.waterTemp[0]}〜${p.waterTemp[1]}℃`} />
                      <Row
                        label="ルアー"
                        value={p.lures
                          .map((l) => `${l.type}(${l.size} / ${l.weight})`)
                          .join(" / ")}
                      />
                      <Row label="タックル" value={`${p.tackle.rod} / ${p.tackle.reel} / ${p.tackle.line}`} />
                    </dl>
                  </details>
                );
              })}
            </div>
          </section>
        )}

        <p className="pb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {SAFETY_DISCLAIMER}
        </p>
      </main>
    </>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-lg bg-slate-100 px-2 py-1 font-bold dark:bg-navy">{children}</span>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 p-2 dark:bg-navy">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-base font-bold leading-tight">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="flex-1 font-medium">{value}</dd>
    </div>
  );
}
