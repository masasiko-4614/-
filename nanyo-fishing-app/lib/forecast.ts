// 時合い予測エンジン(このアプリの中核)。
//
// 潮の動き・満干からの時間・朝夕まづめ・日の出入・風速・風向・天気・気圧変化・
// 波・季節・時間帯・魚種・釣り場 を組み合わせて、0〜100点の「期待度」を計算する。
//
// 【重要】これは予測であり、釣果を保証するものではない。
// 表示は必ず「期待度」「予測」という言葉を使い、「必ず釣れる」とは書かないこと。
// 安全上の危険がある時間帯は、期待度より安全警告を優先する。

import { calcSunMoon, mazumeFactor, timeBand, hourToHM } from "./astro";
import { FISH_PROFILES } from "./fish";
import { isUnsafeHour, buildWarnings } from "./safety";
import {
  calcTideInfo,
  shioFromMoonAge,
  tideLevelAt,
  tideMovementAt,
  tideStateAt,
} from "./tide";
import { judgeWind } from "./wind";
import { isThunder } from "./weather";
import type {
  BestTime,
  DayWeather,
  ExpectationRank,
  FishKey,
  FishingSpot,
  HourlyForecast,
  HourlyWeather,
  PersonalProfile,
  ScoreBreakdown,
  SpotForecast,
  TideEvent,
  TideInfo,
} from "./types";

// 配点の考え方
//  1. その時刻の「条件」で 100点満点を作る(潮・時間帯・風・天気・波)
//  2. 「適性」(季節と釣り場×魚種の相性)を 0.55〜1.0 の倍率として掛ける
//  3. 個人の釣果傾向による補正(±6点)を足す
// 条件を加点方式だけで積むと、シーズン外の魚でも高得点になってしまうため
// 適性は倍率として効かせている。

/** 条件のスコア。合計100点 */
export const WEIGHTS = {
  tide: 28,
  timeOfDay: 26,
  wind: 20,
  weather: 14,
  wave: 12,
} as const;

/** 適性の内訳(倍率の計算に使う) */
export const SUITABILITY = {
  season: 10,
  spotFish: 7,
} as const;

/** 適性を 0.55〜1.0 の倍率に変換する */
function suitabilityMultiplier(season: number, spotFish: number): number {
  const s = season / SUITABILITY.season;
  const f = spotFish / SUITABILITY.spotFish;
  return 0.55 + 0.45 * (s * 0.5 + f * 0.5);
}

/** 予測の時間分解能(10分) */
const STEP_H = 1 / 6;

// ---------------- 各要素のスコア ----------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** 満潮・干潮のうち、指定時刻に最も近いものと時間差 */
function nearestTideEvent(
  events: TideEvent[],
  hour: number
): { type: "満潮" | "干潮"; diffH: number } | null {
  if (events.length === 0) return null;
  let best = events[0];
  let bestDiff = Math.abs(events[0].hour - hour);
  for (const e of events) {
    const d = Math.abs(e.hour - hour);
    if (d < bestDiff) {
      best = e;
      bestDiff = d;
    }
  }
  return { type: best.type, diffH: bestDiff };
}

/** 潮のスコア(0〜28) */
function tideScore(
  movement: number,
  state: "上げ潮" | "下げ潮" | "潮止まり",
  events: TideEvent[],
  hour: number,
  prefs: readonly string[],
  reasons: string[]
): number {
  // 潮が動いているほど基本点が高い
  const s = movement * 19;
  if (movement >= 0.7) reasons.push("潮がよく動く時間帯");
  else if (state === "潮止まり") reasons.push("潮止まり");

  const near = nearestTideEvent(events, hour);
  let bonus = 0;
  if (near && near.diffH <= 1.5) {
    const closeness = 1 - near.diffH / 1.5; // 0〜1
    if (near.type === "満潮" && prefs.includes("満潮前後")) {
      bonus = Math.max(bonus, 9 * closeness);
      if (closeness > 0.4) reasons.push("満潮前後");
    }
    if (near.type === "干潮" && prefs.includes("干潮前後")) {
      bonus = Math.max(bonus, 9 * closeness);
      if (closeness > 0.4) reasons.push("干潮前後");
    }
  }
  if (state === "上げ潮" && prefs.includes("上げ潮")) {
    bonus = Math.max(bonus, 7 * movement);
    if (movement > 0.4) reasons.push("上げ潮");
  }
  if (state === "下げ潮" && prefs.includes("下げ潮")) {
    bonus = Math.max(bonus, 7 * movement);
    if (movement > 0.4) reasons.push("下げ潮");
  }
  if (prefs.includes("動いている潮")) {
    bonus = Math.max(bonus, 7 * movement);
  }
  return clamp(s + bonus, 0, WEIGHTS.tide);
}

/** 時間帯のスコア(0〜26) */
function timeOfDayScore(
  hour: number,
  sunriseH: number,
  sunsetH: number,
  fishAffinity: number,
  spotHasLight: boolean,
  reasons: string[]
): number {
  const mz = mazumeFactor(hour, sunriseH, sunsetH);
  const band = timeBand(hour, sunriseH, sunsetH);
  if (mz >= 0.8) reasons.push(band === "朝まづめ" ? "朝まづめ" : "夕まづめ");

  let s = (mz * 0.5 + fishAffinity * 0.5) * WEIGHTS.timeOfDay;
  // 常夜灯のある釣り場は夜のプラス補正
  if (spotHasLight && band === "夜") {
    s += 2;
    if (fishAffinity >= 0.7) reasons.push("常夜灯まわりが狙える");
  }
  return clamp(s, 0, WEIGHTS.timeOfDay);
}

/** 天気のスコア(0〜14) */
function weatherScore(h: HourlyWeather, pressureTrend: number, reasons: string[]): number {
  const c = h.weatherCode;
  let s: number;
  if (isThunder(c)) s = 0;
  else if (c === 3) s = 13; // 曇りは光量が落ち着き好条件になりやすい
  else if (c === 2) s = 12;
  else if (c <= 1) s = 10; // 快晴・ピーカンは日中の食いが落ちやすい
  else if (c >= 51 && c <= 57) s = 10; // 小雨・霧雨は悪くない
  else if (c === 45 || c === 48) s = 8;
  else if (c >= 80 && c <= 82) s = 8;
  else if (c >= 61 && c <= 65) s = 6;
  else if (c >= 71 && c <= 86) s = 4;
  else s = 8;

  if (h.precipMm >= 10) s = Math.min(s, 3);
  else if (h.precipMm >= 3) s = Math.min(s, 6);

  // 気圧がゆるやかに下がる局面は活性が上がりやすいとされる
  if (pressureTrend <= -0.5 && pressureTrend >= -2.5) {
    s += 1.5;
    reasons.push("気圧が緩やかに低下");
  } else if (pressureTrend <= -4) {
    s -= 2;
  } else if (pressureTrend >= 3) {
    s -= 1.5;
  }

  if (isThunder(c)) reasons.push("雷のおそれ");
  return clamp(s, 0, WEIGHTS.weather);
}

/** 波のスコア(0〜12)。データ未取得のときは中立(7) */
function waveScore(waveM: number | null, exposed: boolean): number {
  if (waveM === null) return 7;
  const scale = exposed ? 0.65 : 1; // 磯・サーフは同じ波高でも厳しい
  const w = waveM / scale;
  if (w < 0.25) return 9; // 凪ぎすぎは活性が上がりにくい
  if (w < 0.8) return 12;
  if (w < 1.2) return 7;
  if (w < 1.5) return 4;
  if (w < 2.0) return 1;
  return 0;
}

/** 季節の適性(0〜10) */
function seasonScore(month: number, fish: FishKey | null, spot: FishingSpot): number {
  if (fish) {
    const months = FISH_PROFILES[fish].seasonMonths;
    if (months.includes(month)) return 10;
    const prev = ((month - 2 + 12) % 12) + 1;
    const next = (month % 12) + 1;
    if (months.includes(prev) || months.includes(next)) return 6;
    return 2;
  }
  // 魚種未指定なら、その釣り場で狙える魚のうち何割が旬か
  if (spot.fish.length === 0) return 2;
  const inSeason = spot.fish.filter((f) => FISH_PROFILES[f].seasonMonths.includes(month));
  return 2 + 8 * (inSeason.length / spot.fish.length);
}

/** 釣り場と魚種の相性(0〜7) */
function spotFishScore(spot: FishingSpot, fish: FishKey | null): number {
  if (!fish) return clamp(3.5 + spot.fish.length * 0.45, 0, SUITABILITY.spotFish);
  if (!spot.fish.includes(fish)) return 1;
  const p = FISH_PROFILES[fish];
  const typeMatch = p.spotTypes.includes(spot.type);
  return typeMatch ? 7 : 5.5;
}

/** 個人の釣果傾向による補正(-6〜+6) */
function personalScore(
  profile: PersonalProfile | null | undefined,
  spot: FishingSpot,
  hour: number,
  shio: string
): number {
  if (!profile || profile.totalRecords < 5) return 0;
  const spotBias = profile.spotBias[spot.id] ?? 0;
  const hourBias = profile.hourBias[Math.floor(hour) % 24] ?? 0;
  const shioBias = (profile.shioBias as Record<string, number>)[shio] ?? 0;
  return clamp(spotBias * 3 + hourBias * 2 + shioBias * 1, -6, 6);
}

// ---------------- 期待度のランク ----------------

export function rankOf(score: number): ExpectationRank {
  if (score >= 80) return "爆釣期待";
  if (score >= 70) return "かなり期待";
  if (score >= 55) return "期待できる";
  if (score >= 40) return "普通";
  return "厳しい";
}

export function rankIcon(rank: ExpectationRank): string {
  switch (rank) {
    case "爆釣期待":
      return "🔥";
    case "かなり期待":
      return "◎";
    case "期待できる":
      return "○";
    case "普通":
      return "△";
    case "厳しい":
      return "×";
  }
}

export function rankColor(rank: ExpectationRank): string {
  switch (rank) {
    case "爆釣期待":
      return "text-rose-500";
    case "かなり期待":
      return "text-orange-500";
    case "期待できる":
      return "text-emerald-500";
    case "普通":
      return "text-sky-500";
    case "厳しい":
      return "text-slate-400";
  }
}

export function starsOf(score: number): number {
  if (score >= 80) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 40) return 2;
  return 1;
}

// ---------------- 予測の組み立て ----------------

interface FinePoint {
  hour: number;
  score: number;
  unsafe: boolean;
  reasons: string[];
  state: "上げ潮" | "下げ潮" | "潮止まり";
  levelCm: number;
  breakdown: ScoreBreakdown;
  wind: { speedMs: number; dirDeg: number };
}

/** 時刻に対応する時間別天気を取り出す(範囲外は前後で丸める) */
function weatherAt(weather: DayWeather, hour: number): HourlyWeather {
  const i = clamp(Math.floor(hour), 0, 23);
  return weather.hourly[i] ?? weather.hourly[0];
}

/** 前後6時間の気圧変化(hPa) */
function pressureTrendAt(weather: DayWeather, hour: number): number {
  const i = clamp(Math.floor(hour), 0, 23);
  const cur = weather.hourly[i]?.pressureHpa;
  const past = weather.hourly[clamp(i - 6, 0, 23)]?.pressureHpa;
  if (cur === null || cur === undefined || past === null || past === undefined) return 0;
  return cur - past;
}

export interface ForecastOptions {
  spot: FishingSpot;
  date: Date;
  weather: DayWeather;
  /** 魚種を指定すると、その魚種向けの予測になる */
  fish?: FishKey | null;
  personal?: PersonalProfile | null;
  /** 「今」のスコアを求める基準時刻(小数時) */
  nowHour?: number;
  /** おすすめ魚種を計算するか(重いのでリスト表示では省略する) */
  includeTopFish?: boolean;
  /** 計算済みの潮汐情報(使い回して高速化する) */
  tide?: TideInfo;
}

function computeFinePoints(
  spot: FishingSpot,
  date: Date,
  weather: DayWeather,
  tide: TideInfo,
  fish: FishKey | null,
  personal: PersonalProfile | null | undefined,
  sunriseH: number,
  sunsetH: number
): FinePoint[] {
  const month = date.getMonth() + 1;
  const profile = fish ? FISH_PROFILES[fish] : null;
  const prefs: readonly string[] = profile
    ? profile.tidePref
    : ["動いている潮", "上げ潮", "満潮前後"];
  const windTolerance = profile?.windTolerance ?? 1;
  const exposed = spot.type === "地磯" || spot.type === "沖磯" || spot.type === "サーフ";

  // 時刻に依存しない要素は先に計算しておく
  const season = seasonScore(month, fish, spot);
  const sf = spotFishScore(spot, fish);

  // 魚種未指定のときは、その釣り場で狙える魚の平均活性を使う
  const affinityAt = (h: number): number => {
    const i = Math.floor(h) % 24;
    if (profile) return profile.hourAffinity[i];
    if (spot.fish.length === 0) return 0.4;
    const inSeason = spot.fish.filter((f) =>
      FISH_PROFILES[f].seasonMonths.includes(month)
    );
    const target = inSeason.length > 0 ? inSeason : spot.fish;
    // 「どれか1種でも高活性なら狙える」ので最大値寄りに評価する
    const vals = target.map((f) => FISH_PROFILES[f].hourAffinity[i]);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return max * 0.65 + avg * 0.35;
  };

  const points: FinePoint[] = [];
  for (let h = 0; h < 24; h += STEP_H) {
    const reasons: string[] = [];
    const movement = tideMovementAt(date, h, spot.tideStation);
    const state = tideStateAt(date, h, spot.tideStation);
    const level = tideLevelAt(date, h, spot.tideStation);
    const hw = weatherAt(weather, h);
    const wind = judgeWind(hw.windDirDeg, hw.windSpeedMs, spot.facing, windTolerance);

    const breakdown: ScoreBreakdown = {
      tide: tideScore(movement, state, tide.events, h, prefs, reasons),
      timeOfDay: timeOfDayScore(
        h,
        sunriseH,
        sunsetH,
        affinityAt(h),
        spot.nightLight,
        reasons
      ),
      // 危険度の高い磯場は、同じ風でも竿を出せる条件が限られる
      wind: wind.factor * WEIGHTS.wind * (exposed && spot.danger >= 3 ? 0.85 : 1),
      weather: weatherScore(hw, pressureTrendAt(weather, h), reasons),
      wave: waveScore(hw.waveHeightM, exposed),
      season,
      spotFish: sf,
      personal: personalScore(personal, spot, h, tide.shio),
    };

    if (wind.factor >= 0.85 && hw.windSpeedMs >= 1) reasons.push("風が弱く釣りやすい");
    else if (wind.danger) reasons.push("危険な強風");

    // 条件(100点満点) × 適性(0.55〜1.0) + 個人補正
    const condition =
      breakdown.tide +
      breakdown.timeOfDay +
      breakdown.wind +
      breakdown.weather +
      breakdown.wave;
    let score =
      condition * suitabilityMultiplier(breakdown.season, breakdown.spotFish) +
      breakdown.personal;

    const unsafe = isUnsafeHour(spot, hw);
    // 安全上の問題がある時間帯は、期待度が高くても上限を設ける
    if (unsafe) score = Math.min(score, 25);

    points.push({
      hour: Math.round(h * 1000) / 1000,
      score: clamp(Math.round(score), 0, 100),
      unsafe,
      reasons: [...new Set(reasons)],
      state,
      levelCm: Math.round(level),
      breakdown,
      wind: { speedMs: hw.windSpeedMs, dirDeg: hw.windDirDeg },
    });
  }
  return points;
}

/** ベストタイムとして提示する最大の長さ(時間) */
const MAX_WINDOW_H = 3.5;

/**
 * 長すぎる時間帯は、その中で最も点数の高い MAX_WINDOW_H 分に絞り込む。
 * 「10時間ずっと good」では釣行計画に使えないため。
 */
function trimWindow(
  points: FinePoint[],
  startHour: number,
  endHour: number
): { start: number; end: number } {
  if (endHour - startHour <= MAX_WINDOW_H) return { start: startHour, end: endHour };
  const inRange = points.filter((p) => p.hour >= startHour && p.hour <= endHour);
  const width = Math.round(MAX_WINDOW_H / STEP_H);
  let bestSum = -1;
  let bestIdx = 0;
  for (let i = 0; i + width <= inRange.length; i++) {
    let sum = 0;
    for (let j = i; j < i + width; j++) sum += inRange[j].score;
    if (sum > bestSum) {
      bestSum = sum;
      bestIdx = i;
    }
  }
  return {
    start: inRange[bestIdx].hour,
    end: Math.min(endHour, inRange[bestIdx].hour + MAX_WINDOW_H),
  };
}

/** 高得点の連続する時間帯を抽出する */
function findWindows(points: FinePoint[]): BestTime[] {
  const max = Math.max(...points.map((p) => p.score));
  if (max < 40) return [];
  const threshold = Math.max(50, max - 12);
  const windows: BestTime[] = [];
  let start: number | null = null;
  let peak = 0;
  let reasons = new Set<string>();

  const flush = (endHour: number) => {
    if (start === null) return;
    // 30分未満の細切れは拾わない
    if (endHour - start >= 0.5) {
      const t = trimWindow(points, start, endHour);
      windows.push({
        startHour: t.start,
        endHour: t.end,
        start: hourToHM(t.start),
        end: hourToHM(t.end),
        score: Math.round(peak),
        reasons: [...reasons].slice(0, 4),
      });
    }
    start = null;
    peak = 0;
    reasons = new Set<string>();
  };

  for (const p of points) {
    if (p.score >= threshold && !p.unsafe) {
      if (start === null) start = p.hour;
      peak = Math.max(peak, p.score);
      p.reasons.forEach((r) => reasons.add(r));
    } else {
      flush(p.hour);
    }
  }
  flush(24);

  return windows.sort((a, b) => b.score - a.score).slice(0, 3);
}

/** 24時間グラフ用に1時間刻みへ落とす */
function toHourly(points: FinePoint[]): HourlyForecast[] {
  const out: HourlyForecast[] = [];
  for (let h = 0; h < 24; h++) {
    const inHour = points.filter((p) => Math.floor(p.hour) === h);
    if (inHour.length === 0) continue;
    // その時間帯の代表値は最高点(時合いを見逃さないため)
    const best = inHour.reduce((a, b) => (b.score > a.score ? b : a), inHour[0]);
    out.push({
      hour: h,
      score: best.score,
      tideState: best.state,
      tideLevelCm: best.levelCm,
      windSpeedMs: best.wind.speedMs,
      windDirDeg: best.wind.dirDeg,
      reasons: best.reasons,
      unsafe: inHour.some((p) => p.unsafe),
    });
  }
  return out;
}

/**
 * 釣り場ひとつ分の予測を組み立てる。
 */
export function buildForecast(opts: ForecastOptions): SpotForecast {
  const { spot, date, weather, fish = null, personal = null } = opts;
  const tide = opts.tide ?? calcTideInfo(date, spot.tideStation);
  const sun = calcSunMoon(date, spot.lat, spot.lng);
  const points = computeFinePoints(
    spot,
    date,
    weather,
    tide,
    fish,
    personal,
    sun.sunriseH,
    sun.sunsetH
  );

  const windows = findWindows(points);
  const best = windows[0] ?? null;
  const hourly = toHourly(points);

  const nowHour = opts.nowHour;
  const nowPoint =
    nowHour === undefined
      ? null
      : points.reduce((a, b) =>
          Math.abs(b.hour - nowHour) < Math.abs(a.hour - nowHour) ? b : a
        );

  // 代表スコアはベストタイムの点数(その日いちばんの時合い)
  const dayScore = best ? best.score : Math.max(...points.map((p) => p.score));
  const peakPoint = points.reduce((a, b) => (b.score > a.score ? b : a), points[0]);

  let topFish: { fish: FishKey; score: number }[] = [];
  if (opts.includeTopFish && spot.fish.length > 0) {
    topFish = spot.fish
      .map((f) => {
        const pts = computeFinePoints(
          spot,
          date,
          weather,
          tide,
          f,
          personal,
          sun.sunriseH,
          sun.sunsetH
        );
        return { fish: f, score: Math.max(...pts.map((p) => p.score)) };
      })
      .sort((a, b) => b.score - a.score);
  }

  // 代表の風判定は、ベストタイム(なければ最高点)の時刻のもの
  const refHour = best ? (best.startHour + best.endHour) / 2 : peakPoint.hour;
  const refWeather = weatherAt(weather, refHour);
  const windJudge = judgeWind(
    refWeather.windDirDeg,
    refWeather.windSpeedMs,
    spot.facing,
    fish ? FISH_PROFILES[fish].windTolerance : 1
  );

  return {
    spotId: spot.id,
    spotName: spot.name,
    area: spot.area,
    date: weather.date,
    score: dayScore,
    nowScore: nowPoint ? nowPoint.score : dayScore,
    rank: rankOf(dayScore),
    stars: starsOf(dayScore),
    hourly,
    best,
    windows,
    breakdown: peakPoint.breakdown,
    topFish,
    wind: windJudge,
    warnings: buildWarnings(spot, weather),
  };
}

/** 潮回りの説明文 */
export function shioDescription(date: Date, stationId: FishingSpot["tideStation"]): string {
  const info = calcTideInfo(date, stationId);
  const shio = shioFromMoonAge(info.moonAge);
  switch (shio) {
    case "大潮":
      return "潮の動きが最も大きい日。時合いがはっきり出やすい一方、流れが速すぎる時間帯もあります。";
    case "中潮":
      return "適度に潮が動き、一日を通して安定して狙いやすい潮回りです。";
    case "小潮":
      return "潮の動きが小さい日。動く時間帯が限られるので、満干の前後に集中しましょう。";
    case "長潮":
      return "潮の動きが最も小さい日。潮止まりが長く、厳しい展開になりがちです。";
    case "若潮":
      return "小潮から潮が大きくなり始める日。徐々に動きが出てきます。";
  }
}
