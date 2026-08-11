"use client";

// 設定:ダークモード、データのバックアップ・復元、外部API接続状況

import { useRef, useState } from "react";
import Header from "@/components/Header";
import { AREA_INFOS } from "@/lib/areas";
import {
  clearAll,
  exportAll,
  getSettings,
  importAll,
  saveSettings,
  type AppSettings,
} from "@/lib/storage";
import { useLocalData } from "@/lib/useClient";
import { useHydrated } from "@/lib/useHydrated";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Area } from "@/lib/types";

const DEFAULT_SETTINGS: AppSettings = {
  homeArea: "八幡浜",
  travelSpeedKmh: 38,
  useGps: false,
};

export default function SettingsPage() {
  const hydrated = useHydrated();
  const [darkOverride, setDarkOverride] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const settings = useLocalData(getSettings, DEFAULT_SETTINGS);

  const isDark =
    darkOverride ?? (hydrated && document.documentElement.classList.contains("dark"));

  const toggleDark = () => {
    const next = !isDark;
    setDarkOverride(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("nanyo:theme", next ? "dark" : "light");
  };

  const handleExport = () => {
    const blob = new Blob([exportAll()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nanyo-fishing-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("バックアップファイルをダウンロードしました。");
  };

  const handleImport = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importAll(reader.result as string);
        setMessage("データを復元しました。ホーム画面で確認してください。");
      } catch {
        setMessage("復元に失敗しました。バックアップファイルを確認してください。");
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (!confirm("釣果記録・追加した釣り場・タックルをすべて削除します。よろしいですか?")) return;
    if (!confirm("本当に削除しますか?この操作は取り消せません。")) return;
    clearAll();
    setMessage("すべてのデータを削除しました。");
  };

  // 天気は既定で Open-Meteo(APIキー不要)に接続する
  const weatherApi =
    process.env.NEXT_PUBLIC_WEATHER_API_URL ?? "https://api.open-meteo.com/v1/forecast";
  const tideApi = process.env.NEXT_PUBLIC_TIDE_API_URL;

  return (
    <main>
      <Header title="設定" />
      <div className="space-y-4 p-4">
        {message && (
          <p className="rounded-xl bg-emerald-100 p-3 text-base font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            {message}
          </p>
        )}

        <section className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
          <h2 className="text-lg font-bold">釣行の基準</h2>
          <label className="mt-2 block text-base font-bold">
            拠点にする地域
            <select
              value={settings.homeArea}
              onChange={(e) => saveSettings({ homeArea: e.target.value as Area })}
              className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-lg dark:border-ocean-800 dark:bg-navy dark:text-white"
            >
              {AREA_INFOS.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}（{a.region}）
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            ホーム画面の「今日の南予・釣り予報」と、「今から行くなら」の出発地の基準になります。
          </p>
          <label className="mt-3 block text-base font-bold">
            移動速度の目安：{settings.travelSpeedKmh}km/h
            <input
              type="range"
              min={20}
              max={60}
              step={2}
              value={settings.travelSpeedKmh}
              onChange={(e) => saveSettings({ travelSpeedKmh: Number(e.target.value) })}
              className="mt-1 w-full"
            />
          </label>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
          <h2 className="text-lg font-bold">表示</h2>
          <button
            onClick={toggleDark}
            className="mt-2 flex w-full items-center justify-between rounded-xl bg-slate-100 p-4 text-lg font-bold dark:bg-navy"
          >
            <span>🌙 ダークモード</span>
            <span
              className={`rounded-full px-4 py-1.5 text-base ${
                isDark ? "bg-ocean-600 text-white" : "bg-slate-300 text-slate-700"
              }`}
            >
              {isDark ? "ON" : "OFF"}
            </span>
          </button>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
          <h2 className="text-lg font-bold">データ</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            データはこの端末内に保存されています。機種変更時はバックアップを保存してください。
          </p>
          <div className="mt-2 space-y-2">
            <button
              onClick={handleExport}
              className="w-full rounded-xl bg-ocean-600 py-3 text-lg font-bold text-white"
            >
              📤 バックアップを保存
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl bg-ocean-100 py-3 text-lg font-bold text-ocean-800 dark:bg-ocean-900 dark:text-ocean-200"
            >
              📥 バックアップから復元
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => handleImport(e.target.files?.[0])}
            />
            <button
              onClick={handleClear}
              className="w-full rounded-xl bg-red-100 py-3 text-lg font-bold text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              🗑️ すべてのデータを削除
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
          <h2 className="text-lg font-bold">外部データ接続</h2>
          <ul className="mt-2 space-y-2 text-base">
            <li className="flex items-center justify-between">
              <span>天気API</span>
              <span className="font-bold text-emerald-600">
                Open-Meteo(APIキー不要)
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>潮汐API</span>
              <span className={tideApi ? "font-bold text-emerald-600" : "text-slate-500"}>
                {tideApi ? "接続設定済み" : "未設定(アプリ内計算の参考値)"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Supabase</span>
              <span
                className={
                  isSupabaseConfigured() ? "font-bold text-emerald-600" : "text-slate-500"
                }
              >
                {isSupabaseConfigured() ? "接続設定済み" : "未設定(端末内保存)"}
              </span>
            </li>
          </ul>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            天気・風・波は Open-Meteo の公開データを使用しています（APIキー不要）。
            エンドポイントを変える場合は環境変数 NEXT_PUBLIC_WEATHER_API_URL /
            NEXT_PUBLIC_MARINE_API_URL を設定してください。詳しくは README の「環境変数」を参照。
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            接続先: {weatherApi}
          </p>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
          <h2 className="text-lg font-bold">このアプリについて</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            南予釣行ナビは愛媛県南予の海釣り向け釣行判断・釣果記録アプリです。
            おすすめ度・天気・潮汐の表示は判断材料であり、釣果や安全を保証するものではありません。
            釣行前には気象庁の警報・注意報を必ず確認し、立入禁止場所には入らず、
            ライフジャケットを着用してください。
          </p>
        </section>
      </div>
    </main>
  );
}
