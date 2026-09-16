// 自分専用の釣果分析。
//
// いまはルールベース(統計の集計)で実装している。
// 将来 AI / 外部APIに差し替えられるよう、PersonalAnalyzer インターフェース越しに
// 呼び出す構造にしてある(analyzeRecords を置き換えるだけでよい)。

import type {
  CatchRecord,
  PersonalInsight,
  PersonalProfile,
  ShioMawari,
} from "./types";

/** 分析に必要な最低件数 */
export const MIN_RECORDS = 5;

export interface PersonalAnalyzer {
  name: string;
  analyze(records: CatchRecord[]): PersonalProfile;
}

const EMPTY_PROFILE: PersonalProfile = {
  totalRecords: 0,
  insights: [],
  spotBias: {},
  hourBias: new Array(24).fill(0),
  shioBias: {},
};

function hourOf(time: string): number {
  const h = Number(time.split(":")[0]);
  return Number.isFinite(h) ? h : 12;
}

/** 値の集合を -1〜1 の偏差に正規化する */
function toBias(values: Map<string, number[]>): Record<string, number> {
  const means = new Map<string, number>();
  let all: number[] = [];
  for (const [k, v] of values) {
    if (v.length === 0) continue;
    means.set(k, v.reduce((a, b) => a + b, 0) / v.length);
    all = all.concat(v);
  }
  if (all.length === 0) return {};
  const overall = all.reduce((a, b) => a + b, 0) / all.length;
  const max = Math.max(...all, 1);
  const out: Record<string, number> = {};
  for (const [k, m] of means) {
    // 全体平均からの差を、最大値でスケールして -1〜1 に収める
    out[k] = Math.max(-1, Math.min(1, (m - overall) / Math.max(max * 0.5, 1)));
  }
  return out;
}

/** 最頻値を返す */
function mode<T extends string | number>(items: T[]): { value: T; count: number } | null {
  if (items.length === 0) return null;
  const counts = new Map<T, number>();
  items.forEach((i) => counts.set(i, (counts.get(i) ?? 0) + 1));
  let best: T = items[0];
  let bestC = 0;
  for (const [v, c] of counts) {
    if (c > bestC) {
      best = v;
      bestC = c;
    }
  }
  return { value: best, count: bestC };
}

function timeBandLabel(hour: number): string {
  if (hour >= 4 && hour < 8) return "朝まづめ〜午前";
  if (hour >= 8 && hour < 15) return "日中";
  if (hour >= 15 && hour < 19) return "夕まづめ前後";
  if (hour >= 19 && hour < 23) return "夜(前半)";
  return "深夜〜明け方";
}

/**
 * 釣果記録から「自分が釣れやすい条件」を割り出す。
 */
export function analyzeRecords(records: CatchRecord[]): PersonalProfile {
  if (records.length === 0) return { ...EMPTY_PROFILE, hourBias: new Array(24).fill(0) };

  // ---- 釣り場ごとの偏り ----
  const bySpot = new Map<string, number[]>();
  records.forEach((r) => {
    const arr = bySpot.get(r.spotId) ?? [];
    arr.push(r.count);
    bySpot.set(r.spotId, arr);
  });
  const spotBias = toBias(bySpot);

  // ---- 時間帯ごとの偏り ----
  const byHour = new Map<string, number[]>();
  records.forEach((r) => {
    const h = String(hourOf(r.startTime));
    const arr = byHour.get(h) ?? [];
    arr.push(r.count);
    byHour.set(h, arr);
  });
  const hourBiasMap = toBias(byHour);
  const hourBias = new Array(24).fill(0).map((_, h) => hourBiasMap[String(h)] ?? 0);

  // ---- 潮回りごとの偏り ----
  const byShio = new Map<string, number[]>();
  records.forEach((r) => {
    if (!r.tide) return;
    const arr = byShio.get(r.tide) ?? [];
    arr.push(r.count);
    byShio.set(r.tide, arr);
  });
  const shioBias = toBias(byShio) as Partial<Record<ShioMawari, number>>;

  const insights = buildInsights(records);

  return {
    totalRecords: records.length,
    insights,
    spotBias,
    hourBias,
    shioBias,
  };
}

/** 好調だった記録(釣果数が中央値以上)を抜き出す */
function goodRecords(records: CatchRecord[]): CatchRecord[] {
  const counts = records.map((r) => r.count).sort((a, b) => a - b);
  const median = counts[Math.floor(counts.length / 2)] ?? 0;
  const threshold = Math.max(1, median);
  return records.filter((r) => r.count >= threshold);
}

function buildInsights(records: CatchRecord[]): PersonalInsight[] {
  const insights: PersonalInsight[] = [];
  if (records.length < MIN_RECORDS) {
    insights.push({
      title: "まだデータが足りません",
      detail: `釣果を ${MIN_RECORDS} 件以上登録すると、あなた専用の傾向分析が表示されます(現在 ${records.length} 件)。`,
      sampleSize: records.length,
    });
    return insights;
  }

  const good = goodRecords(records);

  // ---- いちばん釣れている釣り場 ----
  const bySpot = new Map<string, CatchRecord[]>();
  records.forEach((r) => {
    const arr = bySpot.get(r.spotId) ?? [];
    arr.push(r);
    bySpot.set(r.spotId, arr);
  });
  const spotStats = [...bySpot.entries()]
    .map(([id, rs]) => ({
      id,
      name: rs[0].spotName,
      outings: rs.length,
      total: rs.reduce((a, b) => a + b.count, 0),
      avg: rs.reduce((a, b) => a + b.count, 0) / rs.length,
      records: rs,
    }))
    .filter((s) => s.outings >= 2)
    .sort((a, b) => b.avg - a.avg);

  if (spotStats.length > 0) {
    const top = spotStats[0];
    const topGood = goodRecords(top.records);
    const hours = topGood.map((r) => hourOf(r.startTime));
    const bandMode = mode(hours.map(timeBandLabel));
    const tideMode = mode(topGood.map((r) => r.tideState).filter((v): v is NonNullable<typeof v> => Boolean(v)));
    const speciesMode = mode(topGood.map((r) => r.species));
    const lureMode = mode(topGood.map((r) => r.lure).filter((v): v is string => Boolean(v)));
    const winds = topGood.map((r) => r.windSpeedMs).filter((v): v is number => typeof v === "number");
    const shioMode = mode(topGood.map((r) => r.tide).filter((v): v is ShioMawari => Boolean(v)));

    const conds: string[] = [];
    if (bandMode) conds.push(bandMode.value);
    if (tideMode) conds.push(tideMode.value);
    if (shioMode) conds.push(shioMode.value);
    if (winds.length > 0) {
      const maxWind = Math.max(...winds);
      conds.push(`風速 ${maxWind.toFixed(1)}m/s 以下`);
    }
    if (lureMode) conds.push(lureMode.value);

    if (conds.length > 0) {
      insights.push({
        title: `${top.name} が得意な釣り場です`,
        detail:
          `1回あたり平均 ${top.avg.toFixed(1)} 匹(${top.outings}回の釣行)。` +
          (speciesMode ? `主なターゲットは ${speciesMode.value}。` : "") +
          `好調だったときの条件は「${conds.join(" / ")}」でした。`,
        sampleSize: top.records.length,
      });
    }
  }

  // ---- 時間帯の傾向 ----
  const bandMode = mode(good.map((r) => timeBandLabel(hourOf(r.startTime))));
  if (bandMode && bandMode.count >= 3) {
    insights.push({
      title: `${bandMode.value} に釣果が集中しています`,
      detail: `好調だった ${good.length} 件のうち ${bandMode.count} 件がこの時間帯でした。この時間に合わせて釣行計画を立てると効率的です。`,
      sampleSize: good.length,
    });
  }

  // ---- 潮回りの傾向 ----
  const shioMode = mode(good.map((r) => r.tide).filter((v): v is ShioMawari => Boolean(v)));
  if (shioMode && shioMode.count >= 3) {
    insights.push({
      title: `${shioMode.value} との相性が良いようです`,
      detail: `好調だった釣行のうち ${shioMode.count} 件が ${shioMode.value} でした。`,
      sampleSize: good.length,
    });
  }

  // ---- ルアーの傾向 ----
  const lureMode = mode(good.map((r) => r.lure).filter((v): v is string => Boolean(v)));
  if (lureMode && lureMode.count >= 3) {
    const colors = good.filter((r) => r.lure === lureMode.value).map((r) => r.lureColor).filter((v): v is string => Boolean(v));
    const colorMode = mode(colors);
    insights.push({
      title: `${lureMode.value} が当たりルアーです`,
      detail:
        `好調だった釣行で ${lureMode.count} 回使用しています。` +
        (colorMode ? `カラーは ${colorMode.value} が最多でした。` : ""),
      sampleSize: good.length,
    });
  }

  // ---- 魚種の傾向 ----
  const speciesMode = mode(records.map((r) => r.species));
  if (speciesMode) {
    const total = records
      .filter((r) => r.species === speciesMode.value)
      .reduce((a, b) => a + b.count, 0);
    insights.push({
      title: `いちばん釣っているのは ${speciesMode.value}`,
      detail: `${speciesMode.count} 回の釣行で通算 ${total} 匹。`,
      sampleSize: records.length,
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "傾向がまだはっきりしません",
      detail:
        "条件がばらついているか、記録に潮・風・ルアーの情報が入っていない可能性があります。釣果登録時に条件も入力すると精度が上がります。",
      sampleSize: records.length,
    });
  }

  return insights;
}

/** 既定のアナライザ(ルールベース) */
export const ruleBasedAnalyzer: PersonalAnalyzer = {
  name: "ルールベース分析",
  analyze: analyzeRecords,
};

/**
 * 将来 AI 分析を追加する場合はここを差し替える。
 * (例: サーバー側のAPIへ records を送り、PersonalProfile を受け取る)
 */
export function getAnalyzer(): PersonalAnalyzer {
  return ruleBasedAnalyzer;
}
