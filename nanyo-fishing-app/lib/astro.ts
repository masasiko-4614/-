// 日の出・日の入り(NOAA略式計算)と月齢の計算。
// 外部APIなしで動作する実計算(数分程度の誤差あり)。

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

export function formatHM(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}
