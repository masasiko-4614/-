"use client";

import { formatDateJa, toDateStr } from "@/lib/date";

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + n);
  return toDateStr(date);
}

/** 今週末(次の土曜)。土日なら当日を返す */
function nextWeekend(todayStr: string): string {
  const [y, m, d] = todayStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return todayStr;
  return addDays(todayStr, 6 - dow);
}

/**
 * 日付の切り替え。今日・明日・今週末・任意の日付を選べる。
 * 予報の精度が落ちる先の日付には注意書きを出す。
 */
export default function DateNav({
  value,
  today,
  onChange,
}: {
  value: string;
  today: string;
  onChange: (v: string) => void;
}) {
  const presets: { label: string; value: string }[] = [
    { label: "今日", value: today },
    { label: "明日", value: addDays(today, 1) },
    { label: "今週末", value: nextWeekend(today) },
  ];
  const daysAhead = Math.round(
    (new Date(value).getTime() - new Date(today).getTime()) / 86400000
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="前の日"
          onClick={() => onChange(addDays(value, -1))}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-lg font-bold dark:bg-slate-700"
        >
          ‹
        </button>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                value === p.value
                  ? "bg-ocean-700 text-white"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
          <input
            type="date"
            value={value}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-navy"
          />
        </div>
        <button
          type="button"
          aria-label="次の日"
          onClick={() => onChange(addDays(value, 1))}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-lg font-bold dark:bg-slate-700"
        >
          ›
        </button>
      </div>
      <p className="text-sm font-bold">{formatDateJa(value)}</p>
      {daysAhead > 7 && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          ※ 8日以上先は気象データを取得できないことがあります。潮汐・日の出入りのみの参考表示になります。
        </p>
      )}
      {daysAhead < 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          ※ 過去の日付です。潮汐は計算値、天気は取得できる範囲での表示になります。
        </p>
      )}
    </div>
  );
}
