// 天気・風・波の取得。
//
// APIキー不要の公開データ Open-Meteo を既定で使用する。
//  - 天気/風/気圧: https://api.open-meteo.com/v1/forecast
//  - 波高:        https://marine-api.open-meteo.com/v1/marine
// 取得に失敗した場合は平年値ベースの参考値にフォールバックし、
// 画面上は「データ未取得」と明示する(架空値を実データとして出さない)。

import type { DataQuality, DayWeather, HourlyWeather } from "./types";

const FORECAST_URL =
  process.env.NEXT_PUBLIC_WEATHER_API_URL ?? "https://api.open-meteo.com/v1/forecast";
const MARINE_URL =
  process.env.NEXT_PUBLIC_MARINE_API_URL ?? "https://marine-api.open-meteo.com/v1/marine";

const WIND_DIRS = [
  "北",
  "北北東",
  "北東",
  "東北東",
  "東",
  "東南東",
  "南東",
  "南南東",
  "南",
  "南南西",
  "南西",
  "西南西",
  "西",
  "西北西",
  "北西",
  "北北西",
];

/** 風向(度)を16方位の日本語に変換する */
export function degToDirName(deg: number): string {
  const d = ((deg % 360) + 360) % 360;
  return WIND_DIRS[Math.round(d / 22.5) % 16];
}

/** WMO weather code を日本語のラベルに変換する */
export function weatherLabel(code: number): string {
  if (code === 0) return "快晴";
  if (code === 1) return "晴れ";
  if (code === 2) return "晴れ時々曇り";
  if (code === 3) return "曇り";
  if (code === 45 || code === 48) return "霧";
  if (code >= 51 && code <= 57) return "霧雨";
  if (code >= 61 && code <= 65) return "雨";
  if (code === 66 || code === 67) return "着氷性の雨";
  if (code >= 71 && code <= 77) return "雪";
  if (code >= 80 && code <= 82) return "にわか雨";
  if (code === 85 || code === 86) return "にわか雪";
  if (code >= 95) return "雷雨";
  return "—";
}

export function weatherEmoji(code: number): string {
  if (code <= 1) return "☀️";
  if (code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 95) return "⛈️";
  if (code >= 71 && code <= 86) return "🌨️";
  if (code >= 51) return "🌧️";
  return "🌤️";
}

export function isThunder(code: number): boolean {
  return code >= 95;
}

// ---------------- フォールバック用の参考値 ----------------

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

/**
 * 平年値をもとにした参考値を生成する(同じ日付・場所なら常に同じ値)。
 * これは実データではないため、必ず「データ未取得」として表示すること。
 */
export function fallbackWeather(dateStr: string, areaKey: string): DayWeather {
  const rand = seededRandom(`${dateStr}:${areaKey}`);
  const month = Number(dateStr.split("-")[1]);
  const base = seasonalBase(month);
  const precipProb = Math.round(
    Math.min(100, Math.max(0, base.rainProb + (rand() - 0.5) * 60))
  );
  let code = 1;
  if (precipProb >= 70) code = 61;
  else if (precipProb >= 45) code = 3;
  else if (precipProb >= 30) code = 2;
  const windBase = Math.round((rand() * rand() * 12 + 0.8) * 10) / 10;
  const windDirDeg = Math.floor(rand() * 16) * 22.5;
  const tempJitter = (rand() - 0.5) * 4;
  const tMin = Math.round(base.min + tempJitter);
  const tMax = Math.round(base.max + tempJitter);

  const hourly: HourlyWeather[] = [];
  for (let h = 0; h < 24; h++) {
    // 日中に気温が上がる単純な日変化
    const t = tMin + (tMax - tMin) * Math.max(0, Math.sin(((h - 5) / 14) * Math.PI));
    hourly.push({
      hour: h,
      tempC: Math.round(t * 10) / 10,
      precipProb,
      precipMm: precipProb >= 70 ? 1 : 0,
      label: weatherLabel(code),
      weatherCode: code,
      windSpeedMs: Math.round(windBase * (0.75 + 0.35 * Math.sin(((h - 8) / 12) * Math.PI)) * 10) / 10,
      windGustMs: Math.round(windBase * 1.6 * 10) / 10,
      windDirDeg,
      waveHeightM: null,
      pressureHpa: null,
    });
  }

  return {
    date: dateStr,
    label: weatherLabel(code),
    tempMinC: tMin,
    tempMaxC: tMax,
    precipProb,
    windSpeedMaxMs: Math.max(...hourly.map((h) => h.windSpeedMs)),
    windDirDeg,
    waveMaxM: null,
    hourly,
    quality: "データ未取得",
    waveQuality: "データ未取得",
    source: "平年値からの参考値(外部データ未取得)",
  };
}

// ---------------- 実データ取得 ----------------

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

interface OpenMeteoHourly {
  time?: string[];
  temperature_2m?: number[];
  precipitation_probability?: number[];
  precipitation?: number[];
  weather_code?: number[];
  wind_speed_10m?: number[];
  wind_gusts_10m?: number[];
  wind_direction_10m?: number[];
  pressure_msl?: number[];
}

interface OpenMeteoMarineHourly {
  time?: string[];
  wave_height?: number[];
}

function num(arr: number[] | undefined, i: number, fallback = 0): number {
  const v = arr?.[i];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

const HOURLY_PARAMS =
  "temperature_2m,precipitation_probability,precipitation,weather_code," +
  "wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl";

const SOURCE_LABEL = "Open-Meteo(APIキー不要の公開データ)";

/** Open-Meteo のレスポンスを HourlyWeather[] に変換する */
function parseHourly(h: OpenMeteoHourly | undefined): HourlyWeather[] | null {
  if (!h?.time || h.time.length < 24) return null;
  const out: HourlyWeather[] = [];
  for (let i = 0; i < 24; i++) {
    const code = num(h.weather_code, i, 0);
    out.push({
      hour: i,
      tempC: Math.round(num(h.temperature_2m, i) * 10) / 10,
      precipProb: Math.round(num(h.precipitation_probability, i)),
      precipMm: Math.round(num(h.precipitation, i) * 10) / 10,
      label: weatherLabel(code),
      weatherCode: code,
      windSpeedMs: Math.round(num(h.wind_speed_10m, i) * 10) / 10,
      windGustMs: Math.round(num(h.wind_gusts_10m, i) * 10) / 10,
      windDirDeg: Math.round(num(h.wind_direction_10m, i)),
      waveHeightM: null,
      pressureHpa: h.pressure_msl?.[i] ?? null,
    });
  }
  return out;
}

/** 波高を hourly に流し込む。1件でも入れば "予測値" を返す */
function applyWaves(
  hourly: HourlyWeather[],
  wh: number[] | undefined
): DataQuality {
  if (!wh || wh.length < 24) return "データ未取得";
  for (let i = 0; i < 24; i++) {
    const v = wh[i];
    hourly[i].waveHeightM =
      typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
  }
  return hourly.some((x) => x.waveHeightM !== null) ? "予測値" : "データ未取得";
}

/** 時間別データから1日のサマリーを組み立てる */
function summarize(
  dateStr: string,
  hourly: HourlyWeather[],
  quality: DataQuality,
  waveQuality: DataQuality,
  source: string
): DayWeather {
  const temps = hourly.map((x) => x.tempC);
  const waves = hourly.map((x) => x.waveHeightM).filter((v): v is number => v !== null);
  // その日の代表的な天気は、日中(6〜18時)で最も悪い(コードの大きい)ものを採る
  const daytime = hourly.slice(6, 19);
  const worst = daytime.reduce((a, b) => (b.weatherCode > a.weatherCode ? b : a), daytime[0]);
  // 代表風向は最も強く吹く時間帯のもの
  const windiest = hourly.reduce((a, b) => (b.windSpeedMs > a.windSpeedMs ? b : a), hourly[0]);

  return {
    date: dateStr,
    label: worst.label,
    tempMinC: Math.round(Math.min(...temps)),
    tempMaxC: Math.round(Math.max(...temps)),
    precipProb: Math.max(...hourly.map((x) => x.precipProb)),
    windSpeedMaxMs: windiest.windSpeedMs,
    windDirDeg: windiest.windDirDeg,
    waveMaxM: waves.length > 0 ? Math.max(...waves) : null,
    hourly,
    quality,
    waveQuality,
    source,
  };
}

/**
 * 指定日の天気を取得する。
 * 取得できなかった項目は null / "データ未取得" のままにし、
 * 全体が取得できない場合は平年値ベースの参考値を返す。
 */
export async function getDayWeather(
  dateStr: string,
  lat: number,
  lng: number,
  areaKey: string
): Promise<DayWeather> {
  const forecastUrl =
    `${FORECAST_URL}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&hourly=${HOURLY_PARAMS}&wind_speed_unit=ms&timezone=Asia%2FTokyo` +
    `&start_date=${dateStr}&end_date=${dateStr}`;

  let hourly: HourlyWeather[] | null = null;
  try {
    const json = (await fetchJson(forecastUrl)) as { hourly?: OpenMeteoHourly };
    hourly = parseHourly(json.hourly);
  } catch {
    hourly = null;
  }
  if (!hourly) return fallbackWeather(dateStr, areaKey);

  // 波高は別APIなので、取得できなくても天気データは活かす
  let waveQuality: DataQuality = "データ未取得";
  try {
    const marineUrl =
      `${MARINE_URL}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
      `&hourly=wave_height&timezone=Asia%2FTokyo&start_date=${dateStr}&end_date=${dateStr}`;
    const json = (await fetchJson(marineUrl, 6000)) as { hourly?: OpenMeteoMarineHourly };
    waveQuality = applyWaves(hourly, json.hourly?.wave_height);
  } catch {
    // 波データは無くても続行する
  }

  return summarize(dateStr, hourly, "予測値", waveQuality, SOURCE_LABEL);
}

export interface WeatherPoint {
  key: string;
  lat: number;
  lng: number;
}

/**
 * 複数地点の天気をまとめて取得する(Open-Meteo は緯度経度をカンマ区切りで
 * 複数指定でき、1リクエストで返してくれる)。
 * 南予の全エリア分を1〜2回の通信で取得できるので、一覧画面で使う。
 */
export async function getAreaWeathers(
  dateStr: string,
  points: WeatherPoint[]
): Promise<Record<string, DayWeather>> {
  if (points.length === 0) return {};
  const lats = points.map((p) => p.lat.toFixed(4)).join(",");
  const lngs = points.map((p) => p.lng.toFixed(4)).join(",");
  const out: Record<string, DayWeather> = {};

  let hourlies: (HourlyWeather[] | null)[] = [];
  try {
    const url =
      `${FORECAST_URL}?latitude=${lats}&longitude=${lngs}` +
      `&hourly=${HOURLY_PARAMS}&wind_speed_unit=ms&timezone=Asia%2FTokyo` +
      `&start_date=${dateStr}&end_date=${dateStr}`;
    const json = await fetchJson(url, 12000);
    const list = (Array.isArray(json) ? json : [json]) as { hourly?: OpenMeteoHourly }[];
    hourlies = points.map((_, i) => parseHourly(list[i]?.hourly));
  } catch {
    hourlies = points.map(() => null);
  }

  // 波高もまとめて取得
  let waveLists: (number[] | undefined)[] = [];
  try {
    const url =
      `${MARINE_URL}?latitude=${lats}&longitude=${lngs}` +
      `&hourly=wave_height&timezone=Asia%2FTokyo&start_date=${dateStr}&end_date=${dateStr}`;
    const json = await fetchJson(url, 10000);
    const list = (Array.isArray(json) ? json : [json]) as {
      hourly?: OpenMeteoMarineHourly;
    }[];
    waveLists = points.map((_, i) => list[i]?.hourly?.wave_height);
  } catch {
    waveLists = points.map(() => undefined);
  }

  points.forEach((p, i) => {
    const hourly = hourlies[i];
    if (!hourly) {
      out[p.key] = fallbackWeather(dateStr, p.key);
      return;
    }
    const waveQuality = applyWaves(hourly, waveLists[i]);
    out[p.key] = summarize(dateStr, hourly, "予測値", waveQuality, SOURCE_LABEL);
  });

  return out;
}

// ---------------- キャッシュ(オフライン対応) ----------------

const CACHE_KEY = "nanyo:weatherCache";
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3時間

interface CacheEntry {
  savedAt: number;
  data: DayWeather;
}

function cacheKey(dateStr: string, areaKey: string): string {
  return `${dateStr}|${areaKey}`;
}

function readCache(): Record<string, CacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeCache(all: Record<string, CacheEntry>): void {
  if (typeof window === "undefined") return;
  try {
    // 古いものは捨てて肥大化を防ぐ
    const entries = Object.entries(all)
      .sort((a, b) => b[1].savedAt - a[1].savedAt)
      .slice(0, 60);
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // 保存できなくても動作は続ける
  }
}

/**
 * キャッシュを使って天気を取得する。
 * オフライン時は前回取得した値を「参考値」として返す。
 */
export async function getDayWeatherCached(
  dateStr: string,
  lat: number,
  lng: number,
  areaKey: string
): Promise<DayWeather> {
  const all = readCache();
  const key = cacheKey(dateStr, areaKey);
  const hit = all[key];
  const fresh = hit && Date.now() - hit.savedAt < CACHE_TTL_MS;
  if (fresh) return hit.data;

  const data = await getDayWeather(dateStr, lat, lng, areaKey);
  if (data.quality === "データ未取得" && hit) {
    // 取得に失敗したが前回の値がある場合は、そちらを参考値として返す
    return {
      ...hit.data,
      quality: "参考値",
      waveQuality: hit.data.waveQuality === "予測値" ? "参考値" : hit.data.waveQuality,
      source: `${hit.data.source} / 前回取得したデータ(オフライン)`,
    };
  }
  if (data.quality !== "データ未取得") {
    all[key] = { savedAt: Date.now(), data };
    writeCache(all);
  }
  return data;
}

/** 前回取得した値をオフライン用に格下げして返す */
function staleCopy(data: DayWeather): DayWeather {
  return {
    ...data,
    quality: "参考値",
    waveQuality: data.waveQuality === "予測値" ? "参考値" : data.waveQuality,
    source: `${data.source} / 前回取得したデータ(オフライン)`,
  };
}

/**
 * 複数地点ぶんをキャッシュ付きで取得する。
 * すべてキャッシュにあれば通信しない(オフラインでも動く)。
 */
export async function getAreaWeathersCached(
  dateStr: string,
  points: WeatherPoint[]
): Promise<Record<string, DayWeather>> {
  const all = readCache();
  const out: Record<string, DayWeather> = {};
  const missing: WeatherPoint[] = [];

  for (const p of points) {
    const hit = all[cacheKey(dateStr, p.key)];
    if (hit && Date.now() - hit.savedAt < CACHE_TTL_MS) out[p.key] = hit.data;
    else missing.push(p);
  }
  if (missing.length === 0) return out;

  const fetched = await getAreaWeathers(dateStr, missing);
  let changed = false;
  for (const p of missing) {
    const data = fetched[p.key];
    const hit = all[cacheKey(dateStr, p.key)];
    if (data && data.quality !== "データ未取得") {
      out[p.key] = data;
      all[cacheKey(dateStr, p.key)] = { savedAt: Date.now(), data };
      changed = true;
    } else if (hit) {
      out[p.key] = staleCopy(hit.data);
    } else {
      out[p.key] = data ?? fallbackWeather(dateStr, p.key);
    }
  }
  if (changed) writeCache(all);
  return out;
}
