"use client";

// 釣果分析:月別・魚種別・釣り場別・潮回り別・時間帯別・ルアー別の集計グラフ

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Header from "@/components/Header";
import { MIN_RECORDS, getAnalyzer } from "@/lib/personal";
import { getRecords } from "@/lib/storage";
import { useLocalData } from "@/lib/useClient";
import { useHydrated } from "@/lib/useHydrated";
import type { CatchRecord } from "@/lib/types";

const NO_RECORDS: CatchRecord[] = [];

type Dim = "月別" | "魚種別" | "釣り場別" | "潮回り別" | "時間帯別" | "ルアー別";
const DIMS: Dim[] = ["月別", "魚種別", "釣り場別", "潮回り別", "時間帯別", "ルアー別"];

const SHIO_ORDER = ["大潮", "中潮", "小潮", "長潮", "若潮"];

function timeBucket(startTime: string): string {
  const h = Number(startTime.split(":")[0]);
  if (h < 4) return "深夜";
  if (h < 7) return "早朝";
  if (h < 10) return "朝";
  if (h < 14) return "昼";
  if (h < 17) return "午後";
  if (h < 20) return "夕方";
  return "夜";
}
const TIME_ORDER = ["早朝", "朝", "昼", "午後", "夕方", "夜", "深夜"];

function aggregate(records: CatchRecord[], dim: Dim): { name: string; 匹数: number }[] {
  const map = new Map<string, number>();
  for (const r of records) {
    let key: string;
    switch (dim) {
      case "月別":
        key = `${Number(r.date.split("-")[1])}月`;
        break;
      case "魚種別":
        key = r.species;
        break;
      case "釣り場別":
        key = r.spotName;
        break;
      case "潮回り別":
        key = r.tide ?? "不明";
        break;
      case "時間帯別":
        key = timeBucket(r.startTime);
        break;
      case "ルアー別":
        key = r.lure ?? "その他・不明";
        break;
    }
    map.set(key, (map.get(key) ?? 0) + r.count);
  }
  const entries = [...map.entries()].map(([name, v]) => ({ name, 匹数: v }));
  if (dim === "月別") {
    entries.sort((a, b) => Number(a.name.replace("月", "")) - Number(b.name.replace("月", "")));
  } else if (dim === "潮回り別") {
    entries.sort((a, b) => SHIO_ORDER.indexOf(a.name) - SHIO_ORDER.indexOf(b.name));
  } else if (dim === "時間帯別") {
    entries.sort((a, b) => TIME_ORDER.indexOf(a.name) - TIME_ORDER.indexOf(b.name));
  } else {
    entries.sort((a, b) => b.匹数 - a.匹数);
  }
  return entries;
}

export default function AnalysisPage() {
  const hydrated = useHydrated();
  const [dim, setDim] = useState<Dim>("月別");

  const records = useLocalData(getRecords, NO_RECORDS);
  const profile = useMemo(() => getAnalyzer().analyze(records), [records]);
  const isDark = useMemo(
    () => hydrated && document.documentElement.classList.contains("dark"),
    [hydrated]
  );

  const data = useMemo(() => aggregate(records, dim), [records, dim]);
  const totalCount = records.reduce((s, r) => s + r.count, 0);
  const maxSize = Math.max(0, ...records.map((r) => r.sizeCm ?? 0));
  const trips = new Set(records.map((r) => `${r.date}:${r.spotId}`)).size;

  // dataviz 検証済みの色(単一系列)
  const barColor = isDark ? "#3b82f6" : "#2563eb";
  const inkMuted = isDark ? "#94a3b8" : "#64748b";
  const grid = isDark ? "#1e3a8a" : "#e2e8f0";
  const horizontal = ["魚種別", "釣り場別", "ルアー別"].includes(dim);

  return (
    <main>
      <Header title="釣果分析" />
      <div className="space-y-4 p-4">
        {records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow dark:bg-navy-light">
            <p className="text-lg font-bold">分析する記録がまだありません</p>
            <Link
              href="/record"
              className="mt-4 inline-block rounded-xl bg-ocean-600 px-6 py-3 text-lg font-bold text-white"
            >
              釣果を登録する
            </Link>
          </div>
        ) : (
          <>
            {/* 自分専用の傾向分析 */}
            <section className="rounded-2xl border-2 border-ocean-400 bg-ocean-50 p-3 dark:border-ocean-700 dark:bg-navy-light">
              <h2 className="mb-1 text-lg font-bold">🤖 あなた専用の傾向分析</h2>
              <p className="mb-2 text-xs text-slate-600 dark:text-slate-400">
                登録した釣果 {records.length} 件から、統計で「釣れやすい条件」を割り出しています。
                {records.length < MIN_RECORDS &&
                  `（${MIN_RECORDS} 件以上でくわしい分析が出ます）`}
              </p>
              <ul className="space-y-2">
                {profile.insights.map((ins, i) => (
                  <li key={i} className="rounded-xl bg-white p-2.5 dark:bg-navy">
                    <p className="font-bold">{ins.title}</p>
                    <p className="text-sm leading-relaxed">{ins.detail}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                この分析結果は、ホームや予報画面の期待度にも ±6点の範囲で反映されます。
              </p>
            </section>

            {/* サマリー */}
            <section className="grid grid-cols-3 gap-3">
              {[
                { label: "釣行回数", value: trips, unit: "回" },
                { label: "合計匹数", value: totalCount, unit: "匹" },
                { label: "最大サイズ", value: maxSize || "-", unit: maxSize ? "cm" : "" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white p-3 text-center shadow dark:bg-navy-light"
                >
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {s.label}
                  </p>
                  <p className="text-2xl font-extrabold">
                    {s.value}
                    <span className="text-base font-bold">{s.unit}</span>
                  </p>
                </div>
              ))}
            </section>

            {/* 集計軸の切り替え */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {DIMS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDim(d)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-base font-bold ${
                    dim === d
                      ? "bg-ocean-600 text-white"
                      : "bg-white text-slate-700 shadow dark:bg-navy-light dark:text-slate-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <section className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
              <h2 className="mb-2 text-lg font-bold">{dim}の匹数</h2>
              <ResponsiveContainer
                width="100%"
                height={horizontal ? Math.max(220, data.length * 44) : 260}
              >
                {horizontal ? (
                  <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid stroke={grid} horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: inkMuted, fontSize: 13 }}
                      stroke={grid}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fill: inkMuted, fontSize: 13 }}
                      stroke={grid}
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? "#1e3a8a55" : "#e2e8f055" }}
                      contentStyle={{
                        background: isDark ? "#14335f" : "#ffffff",
                        border: `1px solid ${grid}`,
                        borderRadius: 8,
                        color: isDark ? "#f1f5f9" : "#0f172a",
                      }}
                    />
                    <Bar
                      dataKey="匹数"
                      fill={barColor}
                      radius={[0, 4, 4, 0]}
                      barSize={22}
                      isAnimationActive={false}
                    />
                  </BarChart>
                ) : (
                  <BarChart data={data} margin={{ left: -16, right: 8 }}>
                    <CartesianGrid stroke={grid} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: inkMuted, fontSize: 13 }}
                      stroke={grid}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: inkMuted, fontSize: 13 }}
                      stroke={grid}
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? "#1e3a8a55" : "#e2e8f055" }}
                      contentStyle={{
                        background: isDark ? "#14335f" : "#ffffff",
                        border: `1px solid ${grid}`,
                        borderRadius: 8,
                        color: isDark ? "#f1f5f9" : "#0f172a",
                      }}
                    />
                    <Bar
                      dataKey="匹数"
                      fill={barColor}
                      radius={[4, 4, 0, 0]}
                      barSize={26}
                      isAnimationActive={false}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>

              {/* 表でも確認できるように */}
              <details className="mt-3">
                <summary className="cursor-pointer text-base font-bold text-ocean-700 dark:text-ocean-300">
                  表で見る
                </summary>
                <table className="mt-2 w-full text-base">
                  <thead>
                    <tr className="border-b border-slate-300 text-left dark:border-ocean-800">
                      <th className="py-1.5">{dim.replace("別", "")}</th>
                      <th className="py-1.5 text-right">匹数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((d) => (
                      <tr
                        key={d.name}
                        className="border-b border-slate-200 dark:border-ocean-900"
                      >
                        <td className="py-1.5">{d.name}</td>
                        <td className="py-1.5 text-right font-bold">{d.匹数}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
