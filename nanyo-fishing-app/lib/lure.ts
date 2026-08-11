// ルアー提案エンジン。
// 「場所 × 魚種 × 時間 × 潮 × 風」から、おすすめのルアーと理由を組み立てる。
// 提案は一般的なセオリーにもとづく目安であり、正解はひとつではない。

import { timeBand } from "./astro";
import { FISH_PROFILES } from "./fish";
import type {
  FishKey,
  FishingSpot,
  LureSuggestion,
  TackleSuggestion,
  TideState,
} from "./types";

export interface LureAdvice {
  primary: LureSuggestion;
  alternatives: LureSuggestion[];
  /** なぜこの組み合わせなのか */
  reason: string;
  tackle: TackleSuggestion;
  rig: string;
  /** 状況の要約(八幡浜 / アジ / 19:30 / 上げ潮 / 風2.5m/s) */
  context: string;
}

export interface LureContext {
  spot: FishingSpot;
  fish: FishKey;
  /** 小数時(19.5 = 19:30) */
  hour: number;
  tideState: TideState;
  windSpeedMs: number;
  sunriseH: number;
  sunsetH: number;
  month: number;
  /** 雨などによる濁りがあるか */
  murky?: boolean;
}

function hm(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** 状況に応じてカラーを言い換える */
function adjustColor(base: string, ctx: LureContext, band: string): string {
  if (ctx.murky) return "チャート・オレンジなどアピール系(濁り対策)";
  if (band === "夜") {
    return ctx.spot.nightLight
      ? "クリア・ケイムラ(常夜灯の明かりに同調)"
      : "グロー・ホワイトなど視認性の高い色";
  }
  if (band === "朝まづめ" || band === "夕まづめ") {
    return "ピンク・チャートバックなどシルエットの出る色";
  }
  return base;
}

/** 風と水深からウェイトを補正するコメント */
function weightNote(base: string, windSpeedMs: number): string {
  if (windSpeedMs >= 6) return `${base}(風が強いので上限側〜さらに重めを推奨)`;
  if (windSpeedMs >= 4) return `${base}(やや重め寄りが扱いやすい)`;
  if (windSpeedMs <= 1.5) return `${base}(無風なので軽め寄りで繊細に)`;
  return base;
}

/** 魚種ごとに、状況に合うルアーのインデックスを選ぶ */
function pickIndex(ctx: LureContext, band: string): number {
  const lures = FISH_PROFILES[ctx.fish].lures;
  const last = lures.length - 1;

  switch (ctx.fish) {
    case "アジ":
      // 0:ジグ単 1:キャロ/フロート 2:マイクロメタルジグ
      if (ctx.windSpeedMs >= 5) return 1;
      if (band === "日中") return 2;
      return 0;
    case "メバル":
      // 0:ジグ単 1:小型プラグ
      return band === "夜" && ctx.tideState !== "潮止まり" ? 1 : 0;
    case "シーバス":
      // 0:ミノー 1:シンペン 2:バイブ
      if (ctx.murky) return 2;
      if (ctx.spot.type === "河口" && ctx.tideState === "下げ潮") return 1;
      return 0;
    case "チヌ":
      // 0:フリーリグ 1:トップ
      if (ctx.month >= 6 && ctx.month <= 9 && (band === "朝まづめ" || band === "夕まづめ"))
        return 1;
      return 0;
    case "アオリイカ":
      // 0:春3.5号 1:秋2.5〜3.0号
      return ctx.month >= 9 || ctx.month <= 1 ? 1 : 0;
    case "青物":
      // 0:メタルジグ 1:ミノー 2:トップ
      if (ctx.windSpeedMs >= 6) return 0;
      if (band === "朝まづめ") return 2;
      return 1;
    case "タチウオ":
      // 0:ワインド 1:メタルジグ
      return band === "夕まづめ" || ctx.hour < 21 ? 0 : 1;
    case "カサゴ":
      // 0:ジグヘッド 1:テキサス/フリーリグ
      return ctx.windSpeedMs >= 5 ? 1 : 0;
    case "ハタ類":
      // 0:シャッド 1:メタルジグ
      return ctx.windSpeedMs >= 6 ? 1 : 0;
    case "マダイ":
      // 0:メタルジグ 1:タイラバ
      return ctx.tideState === "潮止まり" ? 1 : 0;
    case "ヒラメ":
      // 0:メタルジグ 1:シンキングミノー 2:シャッド
      if (ctx.windSpeedMs >= 6) return 0;
      if (band === "朝まづめ") return 1;
      return 2;
    case "キス":
      return 0;
    default:
      return Math.min(0, last);
  }
}

/** 提案理由を組み立てる */
function buildReason(ctx: LureContext, band: string): string {
  const parts: string[] = [];

  // 時間帯
  if (band === "朝まづめ") parts.push("朝まづめでベイトの動きが活発になる");
  else if (band === "夕まづめ") parts.push("夕まづめ");
  else if (band === "夜") parts.push(ctx.spot.nightLight ? "夜の常夜灯まわり" : "夜間");
  else parts.push("日中");

  // 潮
  if (ctx.tideState === "上げ潮") parts.push("上げ潮で港内・岸寄りへの回遊が期待できる");
  else if (ctx.tideState === "下げ潮") parts.push("下げ潮で流れが効き、ベイトが流される");
  else parts.push("潮止まりで動きが鈍い");

  // 風
  if (ctx.windSpeedMs >= 6) parts.push(`風速${ctx.windSpeedMs}m/sと強く、重めのルアーが必要`);
  else if (ctx.windSpeedMs >= 3.5) parts.push(`風速${ctx.windSpeedMs}m/sでラインが取られやすい`);
  else parts.push(`風速${ctx.windSpeedMs}m/sと穏やかで軽いリグも扱える`);

  // 季節
  const p = FISH_PROFILES[ctx.fish];
  if (p.seasonMonths.includes(ctx.month)) parts.push(`${ctx.month}月は${ctx.fish}のシーズン`);
  else parts.push(`${ctx.month}月は${ctx.fish}のシーズン外で難易度が高い`);

  return parts.join("。") + "。";
}

export function suggestLure(ctx: LureContext): LureAdvice {
  const profile = FISH_PROFILES[ctx.fish];
  const band = timeBand(ctx.hour, ctx.sunriseH, ctx.sunsetH);
  const idx = pickIndex(ctx, band);
  const base = profile.lures[Math.min(idx, profile.lures.length - 1)];

  const primary: LureSuggestion = {
    ...base,
    weight: weightNote(base.weight, ctx.windSpeedMs),
    color: adjustColor(base.color, ctx, band),
  };

  const alternatives = profile.lures.filter((_, i) => i !== idx);

  return {
    primary,
    alternatives,
    reason: buildReason(ctx, band),
    tackle: profile.tackle,
    rig: profile.rig,
    context: `${ctx.spot.name} / ${ctx.fish} / ${hm(ctx.hour)} / ${ctx.tideState} / 風速${ctx.windSpeedMs}m/s`,
  };
}
