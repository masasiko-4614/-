// 天気データの取得。
// 環境変数 NEXT_PUBLIC_WEATHER_API_URL が設定されていれば外部API
// (Open-Meteo互換のJSON)から取得し、未設定の場合は日付から
// 決定的に生成するサンプルデータを返す。

import type { DailyWeather } from "./types";

const WIND_DIRS = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];

/** 文字列から決定的な疑似乱数生成器を作る */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

/** 月ごとの平年値(愛媛県南予の目安) */
function seasonalBase(month: number): { min: number; max: number; rainProb: number } {
  const table: Record<number, { min: number; max: number; rainProb: number }> = {
    1: { min: 3, max: 10, rainProb: 25 },
    2: { min: 3, max: 11, rainProb: 30 },
    3: { min: 6, max: 14, rainProb: 35 },
    4: { min: 10, max: 19, rainProb: 35 },
    5: { min: 15, max: 23, rainProb: 35 },
    6: { min: 19, max: 26, rainProb: 55 },
    7: { min: 23, max: 30, rainProb: 45 },
    8: { min: 24, max: 32, rainProb: 35 },
    9: { min: 21, max: 28, rainProb: 45 },
    10: { min: 15, max: 23, rainProb: 30 },
    11: { min: 10, max: 18, rainProb: 25 },
    12: { min: 5, max: 13, rainProb: 25 },
  };
  return table[month];
}

/** サンプル天気を生成する(同じ日付・場所なら常に同じ値) */
export function sampleWeather(dateStr: string, areaKey: string): DailyWeather {
  const rand = seededRandom(`${dateStr}:${areaKey}`);
  const month = Number(dateStr.split("-")[1]);
  const base = seasonalBase(month);
  const r = rand();
  const precipProb = Math.round(
    Math.min(100, Math.max(0, base.rainProb + (r - 0.5) * 80))
  );
  let label = "晴れ";
  if (precipProb >= 70) label = "雨";
  else if (precipProb >= 45) label = "曇り";
  else if (precipProb >= 30) label = "晴れ時々曇り";
  const windSpeedMs = Math.round((rand() * rand() * 14 + 0.5) * 10) / 10;
  const windDir = WIND_DIRS[Math.floor(rand() * WIND_DIRS.length)];
  const tempJitter = (rand() - 0.5) * 4;
  return {
    date: dateStr,
    label,
    tempMinC: Math.round(base.min + tempJitter),
    tempMaxC: Math.round(base.max + tempJitter),
    precipProb,
    windSpeedMs,
    windDir,
    isSample: true,
  };
}

function degToDir(deg: number): string {
  return WIND_DIRS[Math.round(((deg % 360) / 45)) % 8];
}

/**
 * 天気を取得する。外部API(Open-Meteo形式)が設定されていればそれを使い、
 * 失敗時・未設定時はサンプルデータにフォールバックする。
 */
export async function getWeather(
  dateStr: string,
  lat: number,
  lng: number,
  areaKey: string
): Promise<DailyWeather> {
  const apiUrl = process.env.NEXT_PUBLIC_WEATHER_API_URL;
  if (!apiUrl) return sampleWeather(dateStr, areaKey);
  try {
    const url =
      `${apiUrl}?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,` +
      `wind_speed_10m_max,wind_direction_10m_dominant,weather_code` +
      `&wind_speed_unit=ms&timezone=Asia%2FTokyo&start_date=${dateStr}&end_date=${dateStr}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`weather api: ${res.status}`);
    const json = await res.json();
    const d = json.daily;
    const code: number = d.weather_code?.[0] ?? 0;
    let label = "晴れ";
    if (code >= 61) label = "雨";
    else if (code >= 45) label = "曇り";
    else if (code >= 2) label = "晴れ時々曇り";
    return {
      date: dateStr,
      label,
      tempMinC: Math.round(d.temperature_2m_min[0]),
      tempMaxC: Math.round(d.temperature_2m_max[0]),
      precipProb: Math.round(d.precipitation_probability_max?.[0] ?? 0),
      windSpeedMs: Math.round(d.wind_speed_10m_max[0] * 10) / 10,
      windDir: degToDir(d.wind_direction_10m_dominant?.[0] ?? 0),
      isSample: false,
    };
  } catch {
    return sampleWeather(dateStr, areaKey);
  }
}
