import Link from "next/link";
import { ExpectationChip } from "./ExpectationBadge";
import Stars from "./Stars";
import type { SpotForecast } from "@/lib/types";
import { spotHref } from "@/lib/paths";

/** 上位3件はメダル風にして、順位が一目で分かるようにする */
function rankStyle(rank: number): string {
  if (rank === 1) return "bg-gradient-to-br from-amber-400 to-amber-600 text-white";
  if (rank === 2) return "bg-gradient-to-br from-slate-300 to-slate-500 text-white";
  if (rank === 3) return "bg-gradient-to-br from-orange-400 to-orange-700 text-white";
  return "bg-ocean-800 text-white";
}

/** おすすめ釣り場の1行。順位つきで一覧に並べる */
export default function SpotRow({
  forecast,
  rank,
  showFish = true,
}: {
  forecast: SpotForecast;
  rank?: number;
  showFish?: boolean;
}) {
  const f = forecast;
  const danger = f.warnings.filter((w) => w.level === "危険").length;
  return (
    <Link
      href={spotHref(f.spotId)}
      className="block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-ocean-400 dark:border-slate-700 dark:bg-navy-light"
    >
      <div className="flex items-start gap-2">
        {rank !== undefined && (
          <span
            className={`mt-0.5 shrink-0 rounded-lg px-2 py-0.5 text-sm font-black shadow-sm ${rankStyle(
              rank
            )}`}
          >
            {rank}位
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{f.spotName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{f.area}</p>
        </div>
        <div className="shrink-0 text-right">
          <ExpectationChip score={f.score} />
          <Stars n={f.stars} size="text-sm" />
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {showFish && f.topFish.length > 0 && (
          <span className="font-bold text-ocean-700 dark:text-ocean-300">
            {f.topFish.slice(0, 3).map((t) => t.fish).join("・")}
          </span>
        )}
        {f.best && (
          <span className="font-bold">
            狙い目 {f.best.start}〜{f.best.end}
          </span>
        )}
        <span className="text-slate-500 dark:text-slate-400">
          {f.wind.dirName} {f.wind.speedMs}m/s
        </span>
        {danger > 0 && <span className="font-bold text-red-600">🚨 安全警告あり</span>}
      </div>
    </Link>
  );
}
