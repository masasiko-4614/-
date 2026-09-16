"use client";

import { FISH_KEYS, FISH_PROFILES } from "@/lib/fish";
import type { FishKey } from "@/lib/types";

/** 魚種の選択チップ。null = 魚種おまかせ */
export default function FishSelect({
  value,
  onChange,
  allowAll = true,
  available,
}: {
  value: FishKey | null;
  onChange: (v: FishKey | null) => void;
  allowAll?: boolean;
  /** 選択肢を絞る(釣り場で狙える魚だけ出すときに使う) */
  available?: FishKey[];
}) {
  const keys = available && available.length > 0 ? available : FISH_KEYS;
  return (
    <div className="flex flex-wrap gap-1.5">
      {allowAll && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-full px-3 py-1.5 text-sm font-bold ${
            value === null
              ? "bg-ocean-700 text-white"
              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          }`}
        >
          おまかせ
        </button>
      )}
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`rounded-full px-3 py-1.5 text-sm font-bold ${
            value === k
              ? "bg-ocean-700 text-white"
              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          }`}
        >
          {FISH_PROFILES[k].emoji} {k}
        </button>
      ))}
    </div>
  );
}
