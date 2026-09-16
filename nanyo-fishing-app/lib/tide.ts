// 潮汐の計算。
//
// 【データについて】
// 気象庁の潮汐表のような実測・公式予測値ではありません。
// 主要4分潮のうち M2(主太陰半日周潮)と S2(主太陽半日周潮)の2成分だけを使った
// 簡易調和モデルで、潮回り(大潮・小潮)の周期と満干のおおよその時刻・潮位を
// 再現しています。アプリ内では「参考値」と表示すること。
// 実際の釣行前には気象庁の潮汐表を必ず確認してください。

import { calcMoonAge } from "./astro";
import type {
  ShioMawari,
  TideEvent,
  TideInfo,
  TidePoint,
  TideState,
  TideStation,
  TideStationId,
} from "./types";

const RAD = Math.PI / 180;

/** M2分潮の角速度(度/時) */
const SPEED_M2 = 28.9841042;
/** S2分潮の角速度(度/時) */
const SPEED_S2 = 30.0;
/** 月が1日あたり遅れる時間 */
const MOON_DELAY_H = 0.8412;
/** S2 / M2 の振幅比。大潮と小潮の差の大きさを決める */
const S2_RATIO = 0.42;

export const TIDE_STATIONS: TideStation[] = [
  {
    id: "nagahama",
    name: "長浜",
    lat: 33.6122,
    lng: 132.4805,
    meanLevelCm: 130,
    springAmplitudeCm: 125,
    lunitidalIntervalH: 5.2,
  },
  {
    id: "yawatahama",
    name: "八幡浜",
    lat: 33.4642,
    lng: 132.4149,
    meanLevelCm: 150,
    springAmplitudeCm: 145,
    lunitidalIntervalH: 5.6,
  },
  {
    id: "misaki",
    name: "三崎",
    lat: 33.3729,
    lng: 132.0931,
    meanLevelCm: 110,
    springAmplitudeCm: 105,
    lunitidalIntervalH: 5.0,
  },
  {
    id: "mikame",
    name: "三瓶",
    lat: 33.3389,
    lng: 132.4224,
    meanLevelCm: 145,
    springAmplitudeCm: 140,
    lunitidalIntervalH: 5.7,
  },
  {
    id: "uwajima",
    name: "宇和島",
    lat: 33.2233,
    lng: 132.5606,
    meanLevelCm: 150,
    springAmplitudeCm: 145,
    lunitidalIntervalH: 5.9,
  },
  {
    id: "mishou",
    name: "御荘",
    lat: 32.9598,
    lng: 132.5715,
    meanLevelCm: 145,
    springAmplitudeCm: 140,
    lunitidalIntervalH: 6.1,
  },
  {
    id: "ainan",
    name: "愛南(深浦)",
    lat: 32.9312,
    lng: 132.5378,
    meanLevelCm: 140,
    springAmplitudeCm: 135,
    lunitidalIntervalH: 6.2,
  },
];

const STATION_MAP = new Map<TideStationId, TideStation>(
  TIDE_STATIONS.map((s) => [s.id, s])
);

export function getStation(id: TideStationId): TideStation {
  return STATION_MAP.get(id) ?? TIDE_STATIONS[1];
}

/** 朔望月の半分。新月→満月、満月→新月 でそれぞれ大潮〜小潮が1周する */
const HALF_SYNODIC = 14.765294;

/**
 * 月齢から潮回りを判定する。
 * 新月・満月からの経過割合で区切ることで、
 * 大潮→中潮→小潮→長潮→若潮→中潮→大潮 の順序と
 * 潮位の実際の大小(調和モデルの計算結果)が一致するようにしている。
 */
export function shioFromMoonAge(moonAge: number): ShioMawari {
  const p = (moonAge % HALF_SYNODIC) / HALF_SYNODIC; // 0=大潮のピーク, 0.5付近=小潮
  if (p < 0.15) return "大潮";
  if (p < 0.45) return "中潮";
  if (p < 0.62) return "小潮";
  if (p < 0.69) return "長潮";
  if (p < 0.76) return "若潮";
  return "中潮";
}

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hourToHM(h: number): string {
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) {
    mm = 0;
    hh += 1;
  }
  return `${(hh % 24).toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

/** その日の月の南中時刻(ローカル時、0時起点の小数時。24を超えることがある) */
function moonTransitHour(date: Date): number {
  const age = calcMoonAge(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0));
  return 12 + age * MOON_DELAY_H;
}

/**
 * 指定時刻の潮位(cm)を返す。
 * hour は その日の0時からの小数時(0〜24、前後にはみ出しても可)。
 */
export function tideLevelAt(date: Date, hour: number, stationId: TideStationId): number {
  const st = getStation(stationId);
  const aM2 = st.springAmplitudeCm / (1 + S2_RATIO);
  const aS2 = aM2 * S2_RATIO;
  const transit = moonTransitHour(date);
  const lag = st.lunitidalIntervalH;
  const argM2 = SPEED_M2 * (hour - transit - lag);
  const argS2 = SPEED_S2 * (hour - 12 - lag);
  return st.meanLevelCm + aM2 * Math.cos(argM2 * RAD) + aS2 * Math.cos(argS2 * RAD);
}

/** 潮位の変化速度(cm/時)。正なら上げ潮、負なら下げ潮 */
export function tideSlopeAt(date: Date, hour: number, stationId: TideStationId): number {
  const d = 1 / 60; // 1分
  return (
    (tideLevelAt(date, hour + d, stationId) - tideLevelAt(date, hour - d, stationId)) /
    (2 * d)
  );
}

/** 大潮時の理論上の最大変化速度(cm/時)。潮の動きの正規化基準 */
function springMaxSlope(st: TideStation): number {
  return st.springAmplitudeCm * SPEED_M2 * RAD;
}

/**
 * 指定時刻の「潮の動き」(0〜1)。満潮・干潮の中間で最大、潮止まりで0。
 * 日ごとの最大値ではなく大潮基準で正規化しているため、
 * 小潮の日は全体的に低い値になり、潮回りの差がそのまま出る。
 */
export function tideMovementAt(
  date: Date,
  hour: number,
  stationId: TideStationId
): number {
  const st = getStation(stationId);
  const slope = Math.abs(tideSlopeAt(date, hour, stationId));
  return Math.min(1, slope / springMaxSlope(st));
}

/** 指定時刻の潮の状態 */
export function tideStateAt(
  date: Date,
  hour: number,
  stationId: TideStationId
): TideState {
  const slope = tideSlopeAt(date, hour, stationId);
  const st = getStation(stationId);
  // 大潮時の最大変化速度の12%未満なら潮止まりとみなす
  if (Math.abs(slope) < springMaxSlope(st) * 0.12) return "潮止まり";
  return slope > 0 ? "上げ潮" : "下げ潮";
}

/** 満潮・干潮を抽出する */
function findEvents(date: Date, stationId: TideStationId): TideEvent[] {
  const events: TideEvent[] = [];
  const step = 1 / 12; // 5分
  let prevSlope = tideSlopeAt(date, -0.5, stationId);
  for (let h = -0.5 + step; h <= 24.5; h += step) {
    const slope = tideSlopeAt(date, h, stationId);
    if (prevSlope > 0 && slope <= 0) {
      // 満潮。線形補間で極値の時刻を求める
      const t = h - step + (prevSlope / (prevSlope - slope)) * step;
      if (t >= 0 && t < 24) {
        events.push({
          hour: t,
          time: hourToHM(t),
          type: "満潮",
          levelCm: Math.round(tideLevelAt(date, t, stationId)),
        });
      }
    } else if (prevSlope < 0 && slope >= 0) {
      const t = h - step + (prevSlope / (prevSlope - slope)) * step;
      if (t >= 0 && t < 24) {
        events.push({
          hour: t,
          time: hourToHM(t),
          type: "干潮",
          levelCm: Math.round(tideLevelAt(date, t, stationId)),
        });
      }
    }
    prevSlope = slope;
  }
  return events.sort((a, b) => a.hour - b.hour);
}

/** 10分刻みの潮位カーブ */
function buildCurve(date: Date, stationId: TideStationId): TidePoint[] {
  const curve: TidePoint[] = [];
  for (let h = 0; h <= 24; h += 1 / 6) {
    curve.push({
      hour: Math.round(h * 1000) / 1000,
      levelCm: Math.round(tideLevelAt(date, h, stationId)),
    });
  }
  return curve;
}

export function calcTideInfo(date: Date, stationId: TideStationId): TideInfo {
  const moonAge = calcMoonAge(date);
  const st = getStation(stationId);
  return {
    date: ymd(date),
    stationId,
    stationName: st.name,
    shio: shioFromMoonAge(moonAge),
    moonAge,
    events: findEvents(date, stationId),
    curve: buildCurve(date, stationId),
    quality: "参考値",
    source: "M2+S2 簡易調和モデル(アプリ内計算)",
  };
}

/** 潮回りごとの相対的な潮の大きさ(0〜1) */
export function shioStrength(shio: ShioMawari): number {
  switch (shio) {
    case "大潮":
      return 1.0;
    case "中潮":
      return 0.85;
    case "若潮":
      return 0.55;
    case "小潮":
      return 0.45;
    case "長潮":
      return 0.35;
  }
}

/** 直近の満潮・干潮からの経過時間(時間)を返す */
export function nearestEvent(
  events: TideEvent[],
  hour: number
): { event: TideEvent; diffH: number } | null {
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
  return { event: best, diffH: bestDiff };
}

/** 外部の潮汐APIが設定されているか(将来の実データ接続点) */
export function isExternalTideConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TIDE_API_URL);
}
