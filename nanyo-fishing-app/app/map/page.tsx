"use client";

// 釣り場マップ:地図と釣り場一覧、お気に入り登録、釣り場の追加

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import {
  addCustomSpot,
  deleteCustomSpot,
  getAllSpots,
  getFavorites,
  toggleFavorite,
} from "@/lib/storage";
import { useHydrated } from "@/lib/useHydrated";
import { AREAS, type Area } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[45vh] items-center justify-center bg-slate-200 dark:bg-navy-light">
      地図を読み込み中…
    </div>
  ),
});

interface NewSpotForm {
  name: string;
  area: Area;
  lat: string;
  lng: string;
  fish: string;
  bestSeasons: string;
  notes: string;
}

const EMPTY_FORM: NewSpotForm = {
  name: "",
  area: "その他",
  lat: "",
  lng: "",
  fish: "",
  bestSeasons: "",
  notes: "",
};

export default function MapPage() {
  const hydrated = useHydrated();
  const [spotsVersion, setSpotsVersion] = useState(0);
  const [favOverride, setFavOverride] = useState<string[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string>("すべて");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewSpotForm>(EMPTY_FORM);

  const spots = useMemo(
    () => (hydrated ? getAllSpots() : []),
    // spotsVersion は追加・削除後に localStorage から読み直すための依存
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hydrated, spotsVersion]
  );
  const initialFavs = useMemo(() => (hydrated ? getFavorites() : []), [hydrated]);
  const favorites = favOverride ?? initialFavs;

  const filtered = useMemo(
    () => (areaFilter === "すべて" ? spots : spots.filter((s) => s.area === areaFilter)),
    [spots, areaFilter]
  );
  const selected = spots.find((s) => s.id === selectedId) ?? null;

  const handleToggleFavorite = (id: string) => setFavOverride(toggleFavorite(id));

  const handleLongSelect = (lat: number, lng: number) => {
    setForm({ ...EMPTY_FORM, lat: lat.toFixed(5), lng: lng.toFixed(5) });
    setShowForm(true);
  };

  const handleAddSpot = () => {
    if (!form.name || !form.lat || !form.lng) return;
    addCustomSpot({
      name: form.name,
      area: form.area,
      lat: Number(form.lat),
      lng: Number(form.lng),
      fish: form.fish.split(/[、,\s]+/).filter(Boolean),
      bestSeasons: form.bestSeasons.split(/[、,\s]+/).filter(Boolean),
      notes: form.notes || "ユーザー追加の釣り場。安全性は自身で確認してください。",
    });
    setSpotsVersion((v) => v + 1);
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (id: string) => {
    if (!confirm("この釣り場を削除しますか?")) return;
    deleteCustomSpot(id);
    setSpotsVersion((v) => v + 1);
    if (selectedId === id) setSelectedId(null);
  };

  const inputCls =
    "w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base dark:border-ocean-800 dark:bg-navy dark:text-white";

  return (
    <main>
      <Header title="釣り場マップ" />
      <MapView
        spots={filtered}
        favorites={favorites}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onLongSelect={handleLongSelect}
      />
      <div className="space-y-3 p-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          地図を長押し(右クリック)するとその場所に釣り場を追加できます。
        </p>

        {/* エリアフィルタ */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["すべて", ...AREAS].map((a) => (
            <button
              key={a}
              onClick={() => setAreaFilter(a)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-base font-bold ${
                areaFilter === a
                  ? "bg-ocean-600 text-white"
                  : "bg-white text-slate-700 shadow dark:bg-navy-light dark:text-slate-200"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* 選択中の釣り場詳細 */}
        {selected && (
          <section className="rounded-2xl border-2 border-ocean-500 bg-white p-4 shadow dark:bg-navy-light">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-extrabold">{selected.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selected.area}
                  {selected.isCustom && "(ユーザー追加)"}
                </p>
              </div>
              <button
                onClick={() => handleToggleFavorite(selected.id)}
                className="rounded-xl bg-amber-100 px-3 py-2 text-2xl dark:bg-amber-900"
                aria-label="お気に入り"
              >
                {favorites.includes(selected.id) ? "⭐" : "☆"}
              </button>
            </div>
            <dl className="mt-2 space-y-1.5 text-base">
              <div>
                <dt className="font-bold text-ocean-700 dark:text-ocean-300">🐟 釣れる魚</dt>
                <dd>{selected.fish.join("・") || "未登録"}</dd>
              </div>
              <div>
                <dt className="font-bold text-ocean-700 dark:text-ocean-300">📅 おすすめ時期</dt>
                <dd>{selected.bestSeasons.join("・") || "未登録"}</dd>
              </div>
              <div>
                <dt className="font-bold text-red-600 dark:text-red-400">⚠️ 注意事項</dt>
                <dd>{selected.notes}</dd>
              </div>
            </dl>
            {selected.isCustom && (
              <button
                onClick={() => handleDelete(selected.id)}
                className="mt-3 rounded-xl bg-red-100 px-4 py-2 font-bold text-red-700 dark:bg-red-950 dark:text-red-300"
              >
                この釣り場を削除
              </button>
            )}
          </section>
        )}

        {/* 一覧 */}
        <section className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">釣り場一覧({filtered.length})</h2>
            <button
              onClick={() => {
                setForm(EMPTY_FORM);
                setShowForm((v) => !v);
              }}
              className="rounded-xl bg-ocean-600 px-4 py-2 text-base font-bold text-white"
            >
              {showForm ? "閉じる" : "+ 追加"}
            </button>
          </div>

          {showForm && (
            <div className="mt-3 space-y-2 rounded-xl bg-ocean-50 p-3 dark:bg-ocean-900">
              <input
                className={inputCls}
                placeholder="釣り場名(必須)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <select
                className={inputCls}
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value as Area })}
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder="緯度(必須)"
                  inputMode="decimal"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="経度(必須)"
                  inputMode="decimal"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                />
              </div>
              <input
                className={inputCls}
                placeholder="釣れる魚(読点区切り)"
                value={form.fish}
                onChange={(e) => setForm({ ...form, fish: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="おすすめ時期(例:春、秋)"
                value={form.bestSeasons}
                onChange={(e) => setForm({ ...form, bestSeasons: e.target.value })}
              />
              <textarea
                className={inputCls}
                placeholder="注意事項"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <button
                onClick={handleAddSpot}
                disabled={!form.name || !form.lat || !form.lng}
                className="w-full rounded-xl bg-ocean-600 py-3 text-lg font-bold text-white disabled:opacity-40"
              >
                釣り場を追加する
              </button>
            </div>
          )}

          <ul className="mt-2 divide-y divide-slate-200 dark:divide-ocean-800">
            {filtered.map((spot) => (
              <li key={spot.id}>
                <button
                  onClick={() => setSelectedId(spot.id)}
                  className="flex w-full items-center justify-between py-3 text-left"
                >
                  <div>
                    <p className="text-base font-bold">
                      {spot.name}
                      {spot.isCustom && (
                        <span className="ml-1 text-xs text-emerald-600 dark:text-emerald-400">
                          追加
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {spot.area} / {spot.fish.slice(0, 3).join("・")}
                    </p>
                  </div>
                  <span className="text-2xl">
                    {favorites.includes(spot.id) ? "⭐" : "☆"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
