// 風向き判定。
// 釣り場ごとに登録した「海が開けている方位(facing)」と、
// 風が吹いてくる方位を比べて、向かい風・追い風・横風を判定する。

import { degToDirName } from "./weather";
import type { WindJudgement, WindRelation } from "./types";

/** 2つの方位の差(0〜180度) */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * 風の関係を判定する。
 * windDirDeg は「風が吹いてくる方位」、facing は「海が開けている方位」。
 * 海の方角から吹いてくる = 向かい風(オンショア)。
 */
export function windRelation(windDirDeg: number, facing: number, speedMs: number): WindRelation {
  if (speedMs < 1.0) return "ほぼ無風";
  const d = angleDiff(windDirDeg, facing);
  if (d <= 50) return "向かい風";
  if (d >= 130) return "追い風";
  return "横風";
}

/** 風速そのものの釣りやすさ(0〜1) */
function speedFactor(ms: number): number {
  if (ms < 0.8) return 0.85; // 凪ぎすぎは活性が上がりにくいことがある
  if (ms <= 3) return 1.0;
  if (ms <= 5) return 0.85;
  if (ms <= 7) return 0.6;
  if (ms <= 9) return 0.35;
  if (ms <= 11) return 0.15;
  if (ms <= 13) return 0.05;
  return 0;
}

/**
 * 風の総合判定。
 * factor は釣りやすさ(0=釣りにならない 〜 1=最適)。
 * windTolerance は魚種ごとの風への強さ(青物は高く、アジングは低い)。
 */
export function judgeWind(
  windDirDeg: number,
  speedMs: number,
  facing: number,
  windTolerance = 1
): WindJudgement {
  const relation = windRelation(windDirDeg, facing, speedMs);
  const dirName = degToDirName(windDirDeg);
  let factor = speedFactor(speedMs);

  // 風向きによる補正
  if (relation === "追い風") {
    // 陸から海へ吹く風。キャストしやすく波も立ちにくい
    factor = Math.min(1, factor * 1.15);
  } else if (relation === "向かい風") {
    // 弱い向かい風はベイトを岸に寄せるのでプラス。強いと一転して危険
    factor = speedMs <= 4 ? Math.min(1, factor * 1.05) : factor * 0.7;
  } else if (relation === "横風") {
    factor *= 0.85;
  }

  // 魚種ごとの風への強さ。1を超える魚種(青物など)は減点が緩和される
  factor = Math.min(1, factor + (1 - factor) * (windTolerance - 1) * 0.5);
  factor = Math.max(0, Math.min(1, factor));

  const danger = speedMs >= 10 || (relation === "向かい風" && speedMs >= 8);

  let comment: string;
  if (danger) {
    comment =
      relation === "向かい風"
        ? `${dirName}の強い向かい風。波をかぶる危険があります`
        : `${dirName}の強風。安全のため釣行を見合わせてください`;
  } else if (relation === "ほぼ無風") {
    comment = "ほぼ無風。ラインは操作しやすいですが、活性は上がりにくい傾向";
  } else if (relation === "追い風") {
    comment = `${dirName}の追い風。キャストしやすく釣りやすい条件`;
  } else if (relation === "向かい風") {
    comment =
      speedMs <= 4
        ? `${dirName}の弱い向かい風。ベイトが岸に寄りやすい好条件`
        : `${dirName}の向かい風。キャストしづらく、波も立ちやすい`;
  } else {
    comment =
      speedMs <= 4
        ? `${dirName}の横風。軽いリグはやや流されます`
        : `${dirName}の横風が強め。ラインが取られて釣りにくい`;
  }

  return {
    relation,
    speedMs,
    dirDeg: windDirDeg,
    dirName,
    comment,
    factor,
    danger,
  };
}
