// おすすめ度の計算(100点満点)。
// 風速25点 / 潮の動き25点 / 時間帯20点 / 天候15点 / 過去の釣果実績15点。
// おすすめ度は釣果を保証するものではなく、判断材料のひとつ。

import { calcSunTimes } from "./astro";
import { calcTideInfo, tideMovementAt } from "./tide";
import type {
  CatchRecord,
  DailyWeather,
  FishingSpot,
  SpotScore,
  TideInfo,
  TimeWindow,
} from "./types";

function windScore(ms: number): number {
  if (ms <= 2) return 25;
  if (ms <= 4) return 21;
  if (ms <= 6) return 15;
  if (ms <= 8) return 8;
  if (ms <= 10) return 3;
  return 0;
}

function shioScore(tide: TideInfo): number {
  switch (tide.shio) {
    case "大潮":
      return 25;
    case "中潮":
      return 22;
    case "若潮":
      return 13;
    case "小潮":
      return 10;
    case "長潮":
      return 6;
  }
}

function weatherScore(w: DailyWeather): number {
  let s: number;
  if (w.label.startsWith("晴れ")) s = 15;
  else if (w.label === "曇り") s = 12;
  else s = 4;
  if (w.precipProb >= 60) s = Math.min(s, 5);
  return s;
}

function pastResultScore(spot: FishingSpot, records: CatchRecord[], date: Date): number {
  const month = date.getMonth() + 1;
  const nearMonths = [month, ((month + 10) % 12) + 1, (month % 12) + 1];
  const hits = records.filter(
    (r) =>
      r.spotId === spot.id &&
      r.count > 0 &&
      nearMonths.includes(Number(r.date.split("-")[1]))
  );
  const total = hits.reduce((s, r) => s + r.count, 0);
  if (total >= 10) return 15;
  if (total >= 5) return 13;
  if (total >= 1) return 10;
  // 記録がない場合は中立的な点数
  return 7;
}

/** 指定時刻の「時間帯の良さ」(0〜1)。朝夕まづめで最大 */
function mazumeFactor(hour: number, sunriseH: number, sunsetH: number): number {
  const dRise = Math.abs(hour - sunriseH);
  const dSet = Math.abs(hour - sunsetH);
  const d = Math.min(dRise, dSet);
  if (d <= 1) return 1;
  if (d <= 2) return 0.6;
  if (d <= 3) return 0.3;
  return 0.1;
}

function hourToHM(h: number): string {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h % 1) * 60);
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

/** 時間帯ごとの評価からおすすめ時間帯を抽出する */
function findWindows(
  date: Date,
  sunriseH: number,
  sunsetH: number
): { windows: TimeWindow[]; bestTimeFactor: number } {
  const hourly: { hour: number; score: number; reasons: string[] }[] = [];
  for (let h = 4; h <= 21; h += 0.5) {
    const mz = mazumeFactor(h, sunriseH, sunsetH);
    const tm = tideMovementAt(date, h);
    const reasons: string[] = [];
    if (mz >= 1) reasons.push(Math.abs(h - sunriseH) <= 1 ? "朝まづめ" : "夕まづめ");
    if (tm >= 0.6) reasons.push("潮がよく動く時間帯");
    hourly.push({ hour: h, score: mz * 0.55 + tm * 0.45, reasons });
  }
  const threshold = 0.55;
  const windows: TimeWindow[] = [];
  let cur: { start: number; end: number; reasons: Set<string> } | null = null;
  for (const p of hourly) {
    if (p.score >= threshold) {
      if (!cur) cur = { start: p.hour, end: p.hour + 0.5, reasons: new Set() };
      else cur.end = p.hour + 0.5;
      p.reasons.forEach((r) => cur!.reasons.add(r));
    } else if (cur) {
      windows.push({
        start: hourToHM(cur.start),
        end: hourToHM(cur.end),
        reasons: [...cur.reasons],
      });
      cur = null;
    }
  }
  if (cur) {
    windows.push({
      start: hourToHM(cur.start),
      end: hourToHM(cur.end),
      reasons: [...cur.reasons],
    });
  }
  windows.forEach((w) => {
    if (w.reasons.length === 0) w.reasons.push("潮と時間帯の条件がまずまず");
  });
  const bestTimeFactor = Math.max(...hourly.map((p) => p.score));
  return { windows: windows.slice(0, 3), bestTimeFactor };
}

export function buildWarnings(w: DailyWeather): string[] {
  const warnings: string[] = [];
  if (w.windSpeedMs >= 13) {
    warnings.push(
      "風速13m/s以上の予想です。波浪警報級の可能性があります。釣行は中止してください。"
    );
  } else if (w.windSpeedMs >= 10) {
    warnings.push("強風(10m/s以上)の予想です。海沿いの釣行は危険です。");
  }
  if (w.precipProb >= 80 && w.label.includes("雨")) {
    warnings.push("大雨のおそれがあります。河口・磯は増水や高波に警戒してください。");
  }
  if (warnings.length > 0) {
    warnings.push("最新の警報・注意報は気象庁の発表を必ず確認してください。");
  }
  return warnings;
}

export function calcSpotScore(
  spot: FishingSpot,
  date: Date,
  weather: DailyWeather,
  records: CatchRecord[]
): SpotScore {
  const tide = calcTideInfo(date);
  const sun = calcSunTimes(date, spot.lat, spot.lng);
  const sunriseH = sun.sunrise.getHours() + sun.sunrise.getMinutes() / 60;
  const sunsetH = sun.sunset.getHours() + sun.sunset.getMinutes() / 60;
  const { windows, bestTimeFactor } = findWindows(date, sunriseH, sunsetH);

  const breakdown = {
    wind: windScore(weather.windSpeedMs),
    tide: shioScore(tide),
    timeOfDay: Math.round(bestTimeFactor * 20),
    weather: weatherScore(weather),
    pastResults: pastResultScore(spot, records, date),
  };
  const total = Math.round(
    breakdown.wind +
      breakdown.tide +
      breakdown.timeOfDay +
      breakdown.weather +
      breakdown.pastResults
  );
  const stars = total >= 80 ? 5 : total >= 65 ? 4 : total >= 50 ? 3 : total >= 35 ? 2 : 1;
  return {
    spotId: spot.id,
    total,
    stars,
    breakdown,
    windows,
    warnings: buildWarnings(weather),
  };
}
