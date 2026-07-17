// 潮汐の簡易計算(サンプルデータ)。
// 月齢から潮回りを判定し、満潮・干潮時刻は月の南中時刻からの
// 簡易モデルで推定する。実際の釣行では気象庁等の潮汐表を確認すること。

import { calcMoonAge } from "./astro";
import type { ShioMawari, TideInfo, TideEvent } from "./types";

/** 月齢から潮回りを判定する(一般的な区分) */
export function shioFromMoonAge(moonAge: number): ShioMawari {
  const d = Math.floor(moonAge) % 30;
  if ([0, 1, 2, 15, 16, 17].includes(d)) return "大潮";
  if ([7, 8, 9, 22, 23, 24].includes(d)) return "小潮";
  if (d === 10 || d === 25) return "長潮";
  if (d === 11 || d === 26) return "若潮";
  return "中潮";
}

const LUNAR_DAY_H = 24.8412; // 月の1日(時間)
const HALF_TIDE_H = LUNAR_DAY_H / 2; // 満潮の間隔 ≒ 12.42h
// 宇和海沿岸向けのサンプル港湾定数(高潮間隔の目安)
const LUNITIDAL_INTERVAL_H = 5.6;

/** その日の最初の満潮時刻(時, 0-24)を返す簡易モデル */
function firstHighTideHour(date: Date): number {
  const age = calcMoonAge(date);
  // 新月時に月は正午頃南中し、1日あたり約0.84時間遅れる
  const transit = (12 + age * (LUNAR_DAY_H - 24)) % 24;
  let h = (transit + LUNITIDAL_INTERVAL_H) % HALF_TIDE_H;
  if (h < 0) h += HALF_TIDE_H;
  return h;
}

function hourToHM(h: number): string {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60) % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

export function calcTideInfo(date: Date): TideInfo {
  const moonAge = calcMoonAge(date);
  const shio = shioFromMoonAge(moonAge);
  const first = firstHighTideHour(date);
  const events: TideEvent[] = [];
  for (let t = first; t < 24; t += HALF_TIDE_H) {
    events.push({ time: hourToHM(t), type: "満潮" });
  }
  for (let t = first + HALF_TIDE_H / 2; t < 24; t += HALF_TIDE_H) {
    events.push({ time: hourToHM(t), type: "干潮" });
  }
  events.sort((a, b) => a.time.localeCompare(b.time));
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return { date: `${y}-${m}-${d}`, shio, moonAge, events, isSample: true };
}

/** 潮回りごとの潮位振幅(相対値) */
export function tideAmplitude(shio: ShioMawari): number {
  switch (shio) {
    case "大潮":
      return 1.0;
    case "中潮":
      return 0.85;
    case "小潮":
      return 0.5;
    case "長潮":
      return 0.35;
    case "若潮":
      return 0.55;
  }
}

/**
 * 指定時刻の「潮の動き」(0〜1)。満潮・干潮の中間で最大になる。
 * hour は 0〜24 の小数。
 */
export function tideMovementAt(date: Date, hour: number): number {
  const first = firstHighTideHour(date);
  const phase = ((hour - first) / HALF_TIDE_H) * 2 * Math.PI;
  const movement = Math.abs(Math.sin(phase));
  return movement * tideAmplitude(shioFromMoonAge(calcMoonAge(date)));
}
