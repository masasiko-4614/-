// 安全判定。
// このアプリでは「釣れるかどうか」より「安全に釣行できるか」を優先する。
// 判定は取得できた気象データにもとづく目安であり、
// 実際の警報・注意報は気象庁の発表を必ず確認すること。

import { isThunder } from "./weather";
import type { DayWeather, FishingSpot, HourlyWeather, SafetyWarning } from "./types";

/** 磯・沖磯など、より厳しい基準を適用する釣り場か */
function isExposed(spot: FishingSpot): boolean {
  return spot.type === "地磯" || spot.type === "沖磯" || spot.type === "サーフ";
}

/**
 * その日の安全警告を組み立てる。
 * 危険度の高い順に返す。
 */
export function buildWarnings(spot: FishingSpot, weather: DayWeather): SafetyWarning[] {
  const w: SafetyWarning[] = [];
  const exposed = isExposed(spot);
  const maxGust = Math.max(...weather.hourly.map((h) => h.windGustMs));
  const wind = weather.windSpeedMaxMs;

  // ---- 風 ----
  const windDangerLimit = exposed ? 10 : 13;
  const windWarnLimit = exposed ? 7 : 10;
  const windCautionLimit = exposed ? 5 : 8;
  if (wind >= windDangerLimit) {
    w.push({
      level: "危険",
      title: `強風(最大 ${wind}m/s)`,
      detail: exposed
        ? "磯・サーフでは波をかぶる危険が非常に高い状態です。釣行を中止してください。"
        : "波浪警報級の風です。海沿いでの釣行は中止してください。",
    });
  } else if (wind >= windWarnLimit) {
    w.push({
      level: "警戒",
      title: `強い風(最大 ${wind}m/s)`,
      detail: "足元をすくわれる、ロッドを煽られるなどの危険があります。無理をしないでください。",
    });
  } else if (wind >= windCautionLimit) {
    w.push({
      level: "注意",
      title: `やや強い風(最大 ${wind}m/s)`,
      detail: "堤防の先端や柵のない場所では特に注意してください。",
    });
  }
  if (maxGust >= 18) {
    w.push({
      level: "危険",
      title: `突風(最大瞬間 ${maxGust}m/s)`,
      detail: "瞬間的に体を持っていかれる強さです。海沿いには近づかないでください。",
    });
  } else if (maxGust >= 14 && wind < windWarnLimit) {
    w.push({
      level: "警戒",
      title: `突風のおそれ(最大瞬間 ${maxGust}m/s)`,
      detail: "平均風速が穏やかでも、突発的に強い風が吹く予報です。",
    });
  }

  // ---- 波 ----
  if (weather.waveMaxM !== null) {
    const wave = weather.waveMaxM;
    const waveDanger = exposed ? 1.5 : 2.0;
    const waveWarn = exposed ? 1.0 : 1.5;
    const waveCaution = exposed ? 0.6 : 1.0;
    if (wave >= waveDanger) {
      w.push({
        level: "危険",
        title: `高波(最大 ${wave.toFixed(1)}m)`,
        detail:
          "波にさらわれる危険があります。特に地磯・テトラ・堤防先端には絶対に立ち入らないでください。",
      });
    } else if (wave >= waveWarn) {
      w.push({
        level: "警戒",
        title: `波が高い(最大 ${wave.toFixed(1)}m)`,
        detail: "うねりが入っています。予報より大きな波が突発的に来ることがあります。",
      });
    } else if (wave >= waveCaution) {
      w.push({
        level: "注意",
        title: `ややうねりあり(最大 ${wave.toFixed(1)}m)`,
        detail: "水際に近づきすぎないようにしてください。",
      });
    }
  }

  // ---- 雷 ----
  if (weather.hourly.some((h) => isThunder(h.weatherCode))) {
    const hours = weather.hourly
      .filter((h) => isThunder(h.weatherCode))
      .map((h) => `${h.hour}時`)
      .join("・");
    w.push({
      level: "危険",
      title: "雷のおそれ",
      detail: `${hours}頃に雷雨の予報です。カーボンロッドは避雷針になります。ただちに車内など安全な場所へ避難してください。`,
    });
  }

  // ---- 大雨 ----
  const maxRain = Math.max(...weather.hourly.map((h) => h.precipMm));
  if (maxRain >= 20) {
    w.push({
      level: "危険",
      title: `激しい雨(最大 ${maxRain}mm/h)`,
      detail: "河口・河川は急激な増水のおそれがあります。低い場所には立ち入らないでください。",
    });
  } else if (maxRain >= 10) {
    w.push({
      level: "警戒",
      title: `強い雨(最大 ${maxRain}mm/h)`,
      detail: "足場が滑りやすくなります。河口部は増水と濁りに注意してください。",
    });
  } else if (weather.precipProb >= 80) {
    w.push({
      level: "注意",
      title: `降水確率 ${weather.precipProb}%`,
      detail: "雨具の準備を。濡れた堤防・磯は非常に滑ります。",
    });
  }

  // ---- 気圧(低気圧・台風の接近) ----
  const pressures = weather.hourly
    .map((h) => h.pressureHpa)
    .filter((p): p is number => p !== null);
  if (pressures.length >= 12) {
    const minP = Math.min(...pressures);
    const drop = pressures[0] - pressures[pressures.length - 1];
    if (minP <= 990 && wind >= 8) {
      w.push({
        level: "警戒",
        title: `低気圧の接近(最低 ${Math.round(minP)}hPa)`,
        detail:
          "発達した低気圧または台風が接近している可能性があります。気象庁の台風情報を必ず確認してください。",
      });
    } else if (drop >= 8) {
      w.push({
        level: "注意",
        title: `気圧が急降下(24時間で ${Math.round(drop)}hPa)`,
        detail: "天候が急変するおそれがあります。こまめに空と海の様子を確認してください。",
      });
    }
  }

  // ---- 気温 ----
  if (weather.tempMaxC >= 35) {
    w.push({
      level: "警戒",
      title: `猛暑日(最高 ${weather.tempMaxC}℃)`,
      detail:
        "熱中症の危険が非常に高い状態です。日中の釣行は避け、朝夕に切り替えてください。水分・塩分・日陰の確保を。",
    });
  } else if (weather.tempMaxC >= 31) {
    w.push({
      level: "注意",
      title: `暑さに注意(最高 ${weather.tempMaxC}℃)`,
      detail: "こまめな水分補給を。堤防は日陰がありません。",
    });
  }
  if (weather.tempMinC <= 2) {
    w.push({
      level: "注意",
      title: `低温(最低 ${weather.tempMinC}℃)`,
      detail: "夜釣りは低体温症に注意。防寒装備と携帯カイロを。",
    });
  }

  // ---- 釣り場そのものの危険度 ----
  if (spot.danger >= 3) {
    w.push({
      level: "注意",
      title: "危険度の高い釣り場です",
      detail:
        "足場が悪く、上級者向けのポイントです。ライフジャケット・磯靴を必ず着用し、単独釣行は避けてください。",
    });
  }
  if (spot.caution) {
    w.push({
      level: "注意",
      title: "現地のルール・立入制限",
      detail: spot.caution,
    });
  }

  const order = { 危険: 0, 警戒: 1, 注意: 2 } as const;
  return w.sort((a, b) => order[a.level] - order[b.level]);
}

/** 危険レベルの警告があるか */
export function hasDanger(warnings: SafetyWarning[]): boolean {
  return warnings.some((x) => x.level === "危険");
}

/** その時刻が安全上「行くべきでない」時間帯か */
export function isUnsafeHour(spot: FishingSpot, h: HourlyWeather): boolean {
  const exposed = isExposed(spot);
  if (isThunder(h.weatherCode)) return true;
  if (h.windSpeedMs >= (exposed ? 10 : 13)) return true;
  if (h.windGustMs >= 18) return true;
  if (h.waveHeightM !== null && h.waveHeightM >= (exposed ? 1.5 : 2.0)) return true;
  if (h.precipMm >= 20) return true;
  return false;
}

/** 常に表示する免責・注意文 */
export const SAFETY_DISCLAIMER =
  "表示される期待度は判断材料のひとつであり、釣果を保証するものではありません。" +
  "気象・海象データは予報であり、実際の状況とは異なることがあります。" +
  "釣行前には気象庁の警報・注意報、津波情報、および現地の立入禁止表示を必ず確認してください。" +
  "ライフジャケットの着用と、単独釣行を避けることを強くおすすめします。";
