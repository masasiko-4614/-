"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { SAFETY_DISCLAIMER } from "@/lib/safety";

const GROUPS: { title: string; items: { href: string; icon: string; label: string; desc: string }[] }[] =
  [
    {
      title: "予測する",
      items: [
        { href: "/", icon: "🏠", label: "今日の釣り予報", desc: "現在の釣れやすさとBEST TIME" },
        { href: "/forecast", icon: "📈", label: "時合い予報", desc: "明日・週末・指定日の24時間予測" },
        { href: "/now", icon: "🚗", label: "今から行くなら", desc: "移動時間と日没から今すぐの候補TOP3" },
        { href: "/ranking", icon: "🏆", label: "南予ランキング", desc: "地域別・魚種別の期待度比較" },
      ],
    },
    {
      title: "調べる",
      items: [
        { href: "/map", icon: "🗺️", label: "釣り場マップ", desc: "地図・航空写真から釣り場を探す" },
        { href: "/tide", icon: "🌊", label: "潮汐", desc: "主要7地点の潮位グラフと満干" },
        { href: "/favorites", icon: "⭐", label: "お気に入り", desc: "登録した釣り場の今日の期待度" },
      ],
    },
    {
      title: "記録する",
      items: [
        { href: "/record", icon: "🎣", label: "釣果を登録", desc: "魚種・サイズ・ルアー・写真" },
        { href: "/history", icon: "📋", label: "釣果履歴", desc: "過去の釣果を振り返る" },
        { href: "/analysis", icon: "📊", label: "釣果分析", desc: "集計グラフと自分専用の傾向分析" },
      ],
    },
    {
      title: "設定",
      items: [
        { href: "/tackle", icon: "🧰", label: "タックル管理", desc: "ロッド・リール・ルアーの登録" },
        { href: "/settings", icon: "⚙️", label: "設定", desc: "拠点エリア・ダークモード・バックアップ" },
      ],
    },
  ];

export default function MenuPage() {
  return (
    <>
      <Header title="メニュー" />
      <main className="space-y-4 p-3">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="mb-1.5 text-sm font-bold text-slate-500 dark:text-slate-400">
              {g.title}
            </h2>
            <div className="space-y-1.5">
              {g.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className="flex items-center gap-3 rounded-xl bg-white p-3 dark:bg-navy-light"
                >
                  <span className="text-2xl" aria-hidden>
                    {it.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{it.label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {it.desc}
                    </span>
                  </span>
                  <span className="text-slate-400">›</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-2xl border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-navy-light dark:text-slate-300">
          <p className="mb-1 text-sm font-bold">ご利用にあたって</p>
          <p>{SAFETY_DISCLAIMER}</p>
          <p className="mt-2">
            天気・風・波：Open-Meteo(APIキー不要の公開データ) ／
            航空写真：国土地理院「全国最新写真(シームレス)」 ／
            地図：OpenStreetMap ／ 潮汐・日の出入り：アプリ内計算
          </p>
        </section>
      </main>
    </>
  );
}
