// 日の出・日の入り(NOAA略式)、月齢、まづめ時間の計算。
// 外部APIなしで動作する実計算(数分程度の誤差あり)。

import type { SunMoonTimes } from "./types";

const RAD = Math.PI / 180;

function toJulian(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function fromJulian(j: number): Date {
  return new Date((j - 2440587.5) * 86400000);
}

/** 日の出・日の入り時刻を計算する(ローカルタイム) */
export function calcSunTimes(
  date: Date,
  lat: number,
  lng: number
): { sunrise: Date; sunset: Date } {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const J2000 = 2451545.0;
  const n = Math.round(toJulian(dayStart) - J2000 - 0.0009 - -lng / 360);
  const jStar = J2000 + 0.0009 + -lng / 360 + n;
  const M = (357.5291 + 0.98560028 * (jStar - J2000)) % 360;
  const C =
    1.9148 * Math.sin(M * RAD) +
    0.02 * Math.sin(2 * M * RAD) +
    0.0003 * Math.sin(3 * M * RAD);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const jTransit =
    jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const delta = Math.asin(Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD));
  const cosH =
    (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(delta)) /
    (Math.cos(lat * RAD) * Math.cos(delta));
  const H = Math.acos(Math.min(1, Math.max(-1, cosH))) / RAD;
  const jSet = jTransit + H / 360;
  const jRise = jTransit - H / 360;
  return { sunrise: fromJulian(jRise), sunset: fromJulian(jSet) };
}

/** 月齢を計算する(0〜29.53) */
export function calcMoonAge(date: Date): number {
  const SYNODIC = 29.530588853;
  // 基準新月: 2000-01-06 18:14 UTC
  const base = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const now = date.getTime() / 86400000;
  const age = (now - base) % SYNODIC;
  return age < 0 ? age + SYNODIC : age;
}

/** 月齢から月の呼び名を返す */
export function moonName(age: number): string {
  if (age < 1.5) return "新月";
  if (age < 6.5) return "三日月〜上弦前";
  if (age < 8.5) return "上弦の月";
  if (age < 13.5) return "十日夜〜満月前";
  if (age < 16.5) return "満月";
  if (age < 21.5) return "十八夜〜下弦前";
  if (age < 23.5) return "下弦の月";
  if (age < 28.5) return "有明月";
  return "新月";
}

export function formatHM(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function hourToHM(h: number): string {
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) {
    mm = 0;
    hh += 1;
  }
  return `${(hh % 24).toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

export function dateToHour(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

/**
 * 日の出・日の入り・まづめ時間をまとめて返す。
 * 朝まづめ = 日の出の1時間前〜1時間後、夕まづめ = 日の入りの1時間前〜1時間後 とする。
 */
export function calcSunMoon(date: Date, lat: number, lng: number): SunMoonTimes {
  const { sunrise, sunset } = calcSunTimes(date, lat, lng);
  const sunriseH = dateToHour(sunrise);
  const sunsetH = dateToHour(sunset);
  const age = calcMoonAge(date);
  return {
    sunrise: formatHM(sunrise),
    sunset: formatHM(sunset),
    sunriseH,
    sunsetH,
    dawnStart: hourToHM(Math.max(0, sunriseH - 1)),
    dawnEnd: hourToHM(Math.min(24, sunriseH + 1)),
    duskStart: hourToHM(Math.max(0, sunsetH - 1)),
    duskEnd: hourToHM(Math.min(24, sunsetH + 1)),
    moonAge: age,
    moonName: moonName(age),
  };
}

/**
 * 指定時刻の「まづめ度」(0〜1)。
 * 日の出・日の入りのちょうどで1.0、±1時間で0.5、±2時間で0.15程度。
 */
export function mazumeFactor(hour: number, sunriseH: number, sunsetH: number): number {
  const d = Math.min(Math.abs(hour - sunriseH), Math.abs(hour - sunsetH));
  if (d <= 0.5) return 1;
  if (d <= 1) return 0.8;
  if (d <= 1.5) return 0.55;
  if (d <= 2) return 0.3;
  if (d <= 3) return 0.15;
  return 0.05;
}

/** その時刻が朝まづめ / 夕まづめ / 日中 / 夜 のどれかを返す */
export function timeBand(
  hour: number,
  sunriseH: number,
  sunsetH: number
): "朝まづめ" | "夕まづめ" | "日中" | "夜" {
  if (Math.abs(hour - sunriseH) <= 1) return "朝まづめ";
  if (Math.abs(hour - sunsetH) <= 1) return "夕まづめ";
  if (hour > sunriseH && hour < sunsetH) return "日中";
  return "夜";
}
