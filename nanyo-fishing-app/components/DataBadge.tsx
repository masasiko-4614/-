import type { DataQuality } from "@/lib/types";

const STYLES: Record<DataQuality, string> = {
  実データ: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  予測値: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  参考値: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  データ未取得: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};

/**
 * データの出所を明示するバッジ。
 * 架空の値を実データとして見せないために、必ず数値の近くに置く。
 */
export default function DataBadge({
  quality,
  title,
}: {
  quality: DataQuality;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold ${STYLES[quality]}`}
    >
      {quality}
    </span>
  );
}
