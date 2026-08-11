import type { SafetyWarning, WarningLevel } from "@/lib/types";

const STYLE: Record<WarningLevel, string> = {
  危険: "border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
  警戒: "border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
  注意: "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100",
};

const ICON: Record<WarningLevel, string> = {
  危険: "🚨",
  警戒: "⚠️",
  注意: "💡",
};

/**
 * 安全警告のバナー。
 * 「釣れるかどうか」より優先して、画面の上部に表示する。
 */
export default function WarningBanner({
  warnings,
  compact = false,
}: {
  warnings: SafetyWarning[];
  compact?: boolean;
}) {
  if (warnings.length === 0) return null;
  const shown = compact ? warnings.filter((w) => w.level !== "注意").slice(0, 2) : warnings;
  if (shown.length === 0) return null;

  return (
    <div className="space-y-2" role="alert">
      {shown.map((w, i) => (
        <div key={`${w.title}-${i}`} className={`rounded-xl border-2 p-3 ${STYLE[w.level]}`}>
          <p className="text-base font-bold">
            {ICON[w.level]} {w.level}：{w.title}
          </p>
          <p className="mt-0.5 text-sm font-medium leading-relaxed">{w.detail}</p>
        </div>
      ))}
    </div>
  );
}
