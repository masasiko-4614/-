"use client";

// 期待度のリングゲージ。
// 屋外で一瞬見て分かることを優先し、数字を大きく・色は高コントラストにする。

import { rankOf } from "@/lib/forecast";
import type { ExpectationRank } from "@/lib/types";

const COLOR: Record<ExpectationRank, string> = {
  爆釣期待: "#fb7185",
  かなり期待: "#fb923c",
  期待できる: "#34d399",
  普通: "#38bdf8",
  厳しい: "#94a3b8",
};

export default function ScoreRing({
  score,
  size = 118,
  stroke = 10,
  label = "点",
}: {
  score: number;
  size?: number;
  stroke?: number;
  /** 数字の下に出す単位 */
  label?: string;
}) {
  const rank = rankOf(score);
  const color = COLOR[rank];
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`期待度 ${score}点 ${rank}`}
      >
        {/* 目盛りの土台 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={stroke}
        />
        {/* 点数の弧。12時の位置から時計回り */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset .6s ease-out, stroke .3s" }}
        />
      </svg>
      {/* リング内は数字だけ。ランク名は幅が足りないので外に出す */}
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className="text-5xl font-black tabular-nums tracking-tight"
          style={{ color }}
        >
          {score}
        </span>
        <span className="mt-1 text-xs font-bold text-white/70">{label}</span>
      </div>
    </div>
  );
}
