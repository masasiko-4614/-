import { rankIcon, rankOf } from "@/lib/forecast";
import type { ExpectationRank } from "@/lib/types";

const BG: Record<ExpectationRank, string> = {
  爆釣期待: "bg-rose-500 text-white",
  かなり期待: "bg-orange-500 text-white",
  期待できる: "bg-emerald-500 text-white",
  普通: "bg-sky-500 text-white",
  厳しい: "bg-slate-400 text-white dark:bg-slate-600",
};

const TEXT: Record<ExpectationRank, string> = {
  爆釣期待: "text-rose-500",
  かなり期待: "text-orange-500",
  期待できる: "text-emerald-500",
  普通: "text-sky-500",
  厳しい: "text-slate-400",
};

/** 期待度を大きく表示する(トップ画面用) */
export function ExpectationBig({
  score,
  label = "現在の釣れやすさ",
}: {
  score: number;
  label?: string;
}) {
  const rank = rankOf(score);
  return (
    <div className={`rounded-2xl px-4 py-3 ${BG[rank]}`}>
      <p className="text-sm font-bold opacity-90">{label}</p>
      <p className="flex items-baseline gap-2">
        <span className="text-5xl font-black tabular-nums leading-none">{score}</span>
        <span className="text-lg font-bold">点</span>
        <span className="ml-auto text-2xl font-black">
          {rankIcon(rank)} {rank}
        </span>
      </p>
    </div>
  );
}

/** 一覧などで使う小さめの期待度表示 */
export function ExpectationChip({ score }: { score: number }) {
  const rank = rankOf(score);
  return (
    <span className={`inline-flex items-baseline gap-1 font-black ${TEXT[rank]}`}>
      <span className="text-2xl tabular-nums">{score}</span>
      <span className="text-xs">点</span>
      <span className="text-sm">{rankIcon(rank)}</span>
    </span>
  );
}

export function rankBg(rank: ExpectationRank): string {
  return BG[rank];
}
