"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DataBadge from "@/components/DataBadge";
import { rankBg } from "@/components/ExpectationBadge";
import FishSelect from "@/components/FishSelect";
import HourStrip from "@/components/HourStrip";
import HourlyChart from "@/components/HourlyChart";
import ScoreRing from "@/components/ScoreRing";
import SpotRow from "@/components/SpotRow";
import WarningBanner from "@/components/WarningBanner";
import { AREA_INFOS } from "@/lib/areas";
import { calcSunMoon } from "@/lib/astro";
import { formatDateJa } from "@/lib/date";
import { buildForecast, rankIcon, rankOf, shioDescription } from "@/lib/forecast";
import { SAFETY_DISCLAIMER } from "@/lib/safety";
import { getSettings, type AppSettings } from "@/lib/storage";
import { useNow, useLocalData } from "@/lib/useClient";
import { useDayForecasts } from "@/lib/useForecast";
import { degToDirName, weatherEmoji } from "@/lib/weather";
import type { Area, FishKey } from "@/lib/types";

const DEFAULT_SETTINGS: AppSettings = {
  homeArea: "八幡浜",
  travelSpeedKmh: 38,
  useGps: false,
};

export default function HomePage() {
  const now = useNow();
  const [fish, setFish] = useState<FishKey | null>(null);
  const settings = useLocalData(getSettings, DEFAULT_SETTINGS);
  const [areaOverride, setAreaOverride] = useState<Area | null>(null);
  const area = areaOverride ?? settings.homeArea;

  const dateStr = now.dateStr;
  const { loading, weathers, forecasts, spots, personal, tides, error } = useDayForecasts(
    dateStr,
    fish,
    now.hour
  );

  const areaInfo = AREA_INFOS.find((a) => a.name === area) ?? AREA_INFOS[0];
  const weather = weathers[area];

  // 拠点エリアの代表釣り場(そのエリアで今いちばん期待できる場所)
  const areaBest = useMemo(
    () => forecasts.find((f) => f.area === area) ?? forecasts[0],
    [forecasts, area]
  );

  // 代表釣り場の詳しい予測(おすすめ魚種つき)
  const detail = useMemo(() => {
    if (!areaBest || !dateStr) return null;
    const spot = spots.find((s) => s.id === areaBest.spotId);
    const w = weathers[spot?.area ?? area];
    if (!spot || !w) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    return buildForecast({
      spot,
      date: new Date(y, m - 1, d),
      weather: w,
      fish,
      personal,
      nowHour: now.hour,
      includeTopFish: true,
      tide: tides[spot.tideStation],
    });
  }, [areaBest, spots, weathers, area, dateStr, fish, personal, now.hour, tides]);

  const sun = useMemo(() => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    return calcSunMoon(new Date(y, m - 1, d), areaInfo.lat, areaInfo.lng);
  }, [dateStr, areaInfo]);

  const tide = tides[areaInfo.tideStation];
  const nowHourly = weather?.hourly[Math.floor(now.hour ?? 12)];
  const top5 = forecasts.slice(0, 5);

  return (
    <>
      {/* ================= ヒーロー ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#061426] via-navy to-ocean-900 text-white">
        {/* 奥行きを出す光。装飾なのでクリックは通す */}
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-ocean-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-16 h-48 w-48 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative px-4 pb-4 pt-3">
          {/* 上段 */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-black tracking-widest text-ocean-200">
              🎣 南予釣行ナビ
            </p>
            <div className="flex gap-1.5">
              <Link
                href="/tackle"
                aria-label="タックル管理"
                className="rounded-lg bg-white/10 px-2.5 py-1.5 text-base backdrop-blur"
              >
                🧰
              </Link>
              <Link
                href="/settings"
                aria-label="設定"
                className="rounded-lg bg-white/10 px-2.5 py-1.5 text-base backdrop-blur"
              >
                ⚙️
              </Link>
            </div>
          </div>

          {/* 日付・時刻 */}
          <div className="mt-1 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold text-ocean-300">今日の南予・釣り予報</p>
              <p className="text-2xl font-black leading-tight">
                {now.dateStr ? formatDateJa(now.dateStr) : "—"}
              </p>
            </div>
            <p className="text-4xl font-black leading-none tabular-nums tracking-tight">
              {now.clock}
            </p>
          </div>

          {/* エリア選択 */}
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 pl-3 pr-1 backdrop-blur">
            <span aria-hidden>📍</span>
            <select
              aria-label="基準エリア"
              value={area}
              onChange={(e) => setAreaOverride(e.target.value as Area)}
              className="appearance-none bg-transparent py-1.5 pr-6 text-base font-bold text-white focus:outline-none"
              style={{ colorScheme: "dark" }}
            >
              {AREA_INFOS.map((a) => (
                <option key={a.name} value={a.name} className="text-slate-900">
                  {a.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none -ml-5 pr-2 text-xs" aria-hidden>
              ▼
            </span>
          </div>

          {/* 期待度リング + 今の状況 */}
          <div className="mt-3 flex items-center gap-4">
            {detail ? (
              <ScoreRing score={detail.nowScore} />
            ) : (
              <div className="flex h-[118px] w-[118px] items-center justify-center rounded-full border-4 border-white/15 text-sm text-white/60">
                {loading ? "計算中" : "—"}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ocean-300">現在の釣れやすさ</p>
              {detail && (
                <p
                  className={`mt-0.5 inline-block rounded-lg px-2 py-0.5 text-base font-black ${rankBg(
                    rankOf(detail.nowScore)
                  )}`}
                >
                  {rankIcon(rankOf(detail.nowScore))} {rankOf(detail.nowScore)}
                </p>
              )}
              <p className="mt-0.5 truncate text-lg font-black">
                {detail ? detail.spotName : "—"}
              </p>
              <p className="text-xs text-ocean-200">{area}でいま最有力</p>

              {weather && (
                <div className="mt-2 space-y-0.5 text-sm font-bold">
                  <p>
                    {weatherEmoji(nowHourly?.weatherCode ?? 0)}{" "}
                    {nowHourly?.label ?? weather.label}{" "}
                    <span className="tabular-nums">
                      {Math.round(nowHourly?.tempC ?? weather.tempMaxC)}℃
                    </span>
                  </p>
                  <p className="text-ocean-100">
                    💨 {degToDirName(nowHourly?.windDirDeg ?? weather.windDirDeg)}{" "}
                    {nowHourly?.windSpeedMs ?? weather.windSpeedMaxMs}m/s
                  </p>
                  <p className="text-ocean-100">
                    🌊{" "}
                    {nowHourly?.waveHeightM != null
                      ? `${nowHourly.waveHeightM.toFixed(1)}m`
                      : "波 未取得"}
                    {tide && ` ・ ${tide.shio}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* BEST TIME */}
          {detail?.best ? (
            <div className="mt-3 rounded-2xl bg-gradient-to-r from-rose-500/90 to-orange-500/90 px-4 py-3 shadow-lg">
              <p className="text-xs font-black tracking-widest text-white/90">
                🔥 本日のBEST TIME
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-black tabular-nums tracking-tight">
                  {detail.best.start}
                  <span className="mx-1 text-xl">〜</span>
                  {detail.best.end}
                </p>
                <p className="ml-auto text-lg font-black tabular-nums">
                  {detail.best.score}
                  <span className="text-xs">点</span>
                </p>
              </div>
              <p className="mt-0.5 text-xs font-bold text-white/90">
                {detail.best.reasons.join("・")}
              </p>
            </div>
          ) : (
            detail && (
              <div className="mt-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                <p className="font-bold">本日は目立った時合いが見込めません</p>
                <p className="text-xs text-ocean-100">
                  条件が厳しいか、安全上おすすめできない時間帯が続いています。
                </p>
              </div>
            )
          )}

          {/* まづめ・満干のサマリー */}
          {sun && tide && (
            <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
              <Pill label="朝まづめ" value={sun.dawnStart} />
              <Pill label="夕まづめ" value={sun.duskStart} />
              <Pill
                label="満潮"
                value={
                  tide.events.find((e) => e.type === "満潮")?.time ?? "—"
                }
              />
              <Pill
                label="干潮"
                value={
                  tide.events.find((e) => e.type === "干潮")?.time ?? "—"
                }
              />
            </div>
          )}
        </div>

        {/* 波の区切り */}
        <svg
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          aria-hidden
          className="block h-6 w-full text-slate-100 dark:text-navy"
        >
          <path
            fill="currentColor"
            d="M0,28 C180,60 340,4 540,22 C740,40 900,58 1100,34 C1240,18 1340,26 1440,38 L1440,60 L0,60 Z"
          />
        </svg>
      </section>

      {/* ================= 本文 ================= */}
      <main className="space-y-4 px-3 pb-2">
        {error && (
          <p className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {error}
          </p>
        )}

        {/* 安全警告(最優先) */}
        {detail && <WarningBanner warnings={detail.warnings} />}

        {/* 狙う魚 */}
        <section>
          <h2 className="mb-1.5 text-sm font-bold text-slate-500 dark:text-slate-400">
            狙う魚で予測を切り替える
          </h2>
          <FishSelect value={fish} onChange={setFish} />
          {detail && detail.topFish.length > 0 && (
            <p className="mt-2 text-sm">
              <span className="font-bold">今日のおすすめ：</span>
              {detail.topFish
                .slice(0, 4)
                .map((t) => `${t.fish}(${t.score})`)
                .join(" / ")}
            </p>
          )}
        </section>

        {/* 時間別 */}
        {detail && weather && (
          <section className="rounded-2xl bg-white p-3 shadow-sm dark:bg-navy-light">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold">何時に行く？</h2>
              <DataBadge quality={weather.quality} title={weather.source} />
            </div>
            <HourStrip
              hourly={detail.hourly}
              weather={weather.hourly}
              nowHour={now.hour}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              バーは期待度、下段は風向と風速です。左右にスクロールできます。
            </p>
          </section>
        )}

        {/* おすすめ釣り場 TOP5 */}
        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold">
              今日のおすすめ釣り場 TOP5
              {fish && <span className="ml-1 text-sm font-normal">（{fish}）</span>}
            </h2>
            <Link
              href="/ranking"
              className="text-sm font-bold text-ocean-600 dark:text-ocean-300"
            >
              全体を見る ›
            </Link>
          </div>
          {loading && top5.length === 0 && (
            <p className="rounded-xl bg-white p-4 text-center text-slate-500 dark:bg-navy-light">
              計算中…
            </p>
          )}
          {top5.map((f, i) => (
            <SpotRow key={f.spotId} forecast={f} rank={i + 1} showFish={false} />
          ))}
        </section>

        {/* 24時間グラフ */}
        {detail && tide && sun && (
          <section className="rounded-2xl bg-white p-3 shadow-sm dark:bg-navy-light">
            <h2 className="mb-1 text-lg font-bold">24時間の釣れやすさ</h2>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              {detail.spotName} / {fish ?? "魚種おまかせ"}
            </p>
            <HourlyChart
              hourly={detail.hourly}
              events={tide.events}
              sun={sun}
              nowHour={now.hour}
              best={detail.best}
            />
          </section>
        )}

        {/* 気象・海象 */}
        {weather && sun && tide && (
          <section className="rounded-2xl bg-white p-3 shadow-sm dark:bg-navy-light">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold">{area}の気象・海象</h2>
              <DataBadge quality={weather.quality} title={weather.source} />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <Cell
                icon={weatherEmoji(nowHourly?.weatherCode ?? 0)}
                label="天気"
                value={nowHourly?.label ?? weather.label}
              />
              <Cell
                icon="🌡️"
                label="気温"
                value={`${Math.round(nowHourly?.tempC ?? weather.tempMaxC)}℃`}
                sub={`${weather.tempMinC}/${weather.tempMaxC}℃`}
              />
              <Cell
                icon="☔"
                label="降水確率"
                value={`${nowHourly?.precipProb ?? weather.precipProb}%`}
              />
              <Cell
                icon="💨"
                label="風"
                value={`${degToDirName(nowHourly?.windDirDeg ?? weather.windDirDeg)} ${
                  nowHourly?.windSpeedMs ?? weather.windSpeedMaxMs
                }`}
                sub={`最大 ${weather.windSpeedMaxMs}m/s`}
              />
              <Cell
                icon="🌊"
                label="波"
                value={
                  nowHourly?.waveHeightM != null
                    ? `${nowHourly.waveHeightM.toFixed(1)}m`
                    : "未取得"
                }
                sub={
                  weather.waveMaxM !== null
                    ? `最大 ${weather.waveMaxM.toFixed(1)}m`
                    : undefined
                }
              />
              <Cell
                icon="🌙"
                label="潮"
                value={tide.shio}
                sub={`月齢 ${tide.moonAge.toFixed(1)}`}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <InfoRow
                label="満潮"
                value={
                  tide.events
                    .filter((e) => e.type === "満潮")
                    .map((e) => e.time)
                    .join(" / ") || "—"
                }
              />
              <InfoRow
                label="干潮"
                value={
                  tide.events
                    .filter((e) => e.type === "干潮")
                    .map((e) => e.time)
                    .join(" / ") || "—"
                }
              />
              <InfoRow label="日の出" value={sun.sunrise} />
              <InfoRow label="日の入り" value={sun.sunset} />
              <InfoRow label="朝まづめ" value={`${sun.dawnStart}〜${sun.dawnEnd}`} />
              <InfoRow label="夕まづめ" value={`${sun.duskStart}〜${sun.duskEnd}`} />
            </div>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              潮汐は簡易計算による<b>参考値</b>です（{tide.stationName}基準）。
              {dateStr && ` ${shioDescription(new Date(dateStr), areaInfo.tideStation)}`}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>出所: {weather.source}</span>
              <DataBadge quality={weather.waveQuality} title="波高データの出所" />
            </div>
          </section>
        )}

        {/* クイックリンク */}
        <section className="grid grid-cols-2 gap-2">
          <QuickLink href="/now" icon="🚗" label="今から行くなら" accent />
          <QuickLink href="/forecast" icon="📈" label="時合い予報" />
          <QuickLink href="/tide" icon="🌊" label="潮汐を見る" />
          <QuickLink href="/map" icon="🗺️" label="釣り場マップ" />
          <QuickLink href="/favorites" icon="⭐" label="お気に入り" />
          <QuickLink href="/record" icon="🎣" label="釣果を登録" />
        </section>

        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {SAFETY_DISCLAIMER}
        </p>
      </main>
    </>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 py-1.5 backdrop-blur">
      <p className="text-[10px] font-bold text-ocean-200">{label}</p>
      <p className="text-sm font-black tabular-nums">{value}</p>
    </div>
  );
}

function Cell({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-100 p-2 dark:bg-navy">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        <span aria-hidden>{icon}</span> {label}
      </p>
      <p className="text-base font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-slate-200 pb-1 dark:border-slate-700">
      <span className="w-16 shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  accent = false,
}: {
  href: string;
  icon: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-xl p-3 font-bold shadow-sm ${
        accent
          ? "bg-gradient-to-r from-ocean-600 to-ocean-700 text-white"
          : "bg-white dark:bg-navy-light"
      }`}
    >
      <span className="text-2xl leading-none" aria-hidden>
        {icon}
      </span>
      {label}
    </Link>
  );
}
