"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import DataBadge from "@/components/DataBadge";
import { ExpectationChip } from "@/components/ExpectationBadge";
import Header from "@/components/Header";
import { AREA_INFOS, REGIONS } from "@/lib/areas";
import { FISH_KEYS } from "@/lib/fish";
import { getFavorites, toggleFavorite } from "@/lib/storage";
import { useLocalData, useNow } from "@/lib/useClient";
import { useDayForecasts } from "@/lib/useForecast";
import type { Area, FishKey, Region } from "@/lib/types";

const NO_FAVORITES: string[] = [];

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[45vh] items-center justify-center bg-slate-200 dark:bg-navy-light">
      地図を読み込み中…
    </div>
  ),
});

export default function MapPage() {
  const now = useNow();
  const favorites = useLocalData(getFavorites, NO_FAVORITES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [region, setRegion] = useState<Region | "すべて">("すべて");
  const [fishFilter, setFishFilter] = useState<FishKey | "すべて">("すべて");
  const [beginnerOnly, setBeginnerOnly] = useState(false);

  const { forecasts, spots, weathers, loading } = useDayForecasts(now.dateStr);

  const scores = useMemo(() => {
    const m: Record<string, number> = {};
    forecasts.forEach((f) => (m[f.spotId] = f.score));
    return m;
  }, [forecasts]);

  const areasInRegionSet = useMemo(() => {
    if (region === "すべて") return null;
    return new Set<Area>(AREA_INFOS.filter((a) => a.region === region).map((a) => a.name));
  }, [region]);

  const visibleSpots = useMemo(
    () =>
      spots.filter((s) => {
        if (s.fish.length === 0) return false;
        if (areasInRegionSet && !areasInRegionSet.has(s.area)) return false;
        if (fishFilter !== "すべて" && !s.fish.includes(fishFilter)) return false;
        if (beginnerOnly && !s.beginner) return false;
        return true;
      }),
    [spots, areasInRegionSet, fishFilter, beginnerOnly]
  );

  const selected = spots.find((s) => s.id === selectedId);
  const selectedForecast = forecasts.find((f) => f.spotId === selectedId);
  const anyWeather = Object.values(weathers)[0];

  return (
    <>
      <Header title="釣り場マップ" />

      <div className="border-b border-slate-300 dark:border-slate-700">
        <MapView
          spots={visibleSpots}
          favorites={favorites}
          selectedId={selectedId}
          onSelect={setSelectedId}
          scores={scores}
        />
      </div>

      <main className="space-y-3 p-3">
        {/* ---- 絞り込み ---- */}
        <section className="space-y-2 rounded-2xl bg-white p-3 dark:bg-navy-light">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">絞り込み</h2>
            {anyWeather && <DataBadge quality={anyWeather.quality} />}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={region === "すべて"} onClick={() => setRegion("すべて")}>
              全域
            </FilterChip>
            {REGIONS.map((r) => (
              <FilterChip key={r} active={region === r} onClick={() => setRegion(r)}>
                {r}
              </FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              active={fishFilter === "すべて"}
              onClick={() => setFishFilter("すべて")}
            >
              魚種すべて
            </FilterChip>
            {FISH_KEYS.map((f) => (
              <FilterChip key={f} active={fishFilter === f} onClick={() => setFishFilter(f)}>
                {f}
              </FilterChip>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={beginnerOnly}
              onChange={(e) => setBeginnerOnly(e.target.checked)}
              className="h-5 w-5"
            />
            初心者向きの釣り場だけ表示
          </label>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {visibleSpots.length}件を表示中
            {loading && "（期待度を計算中…）"}
          </p>
        </section>

        {/* ---- 選択中の釣り場 ---- */}
        {selected && (
          <section className="rounded-2xl bg-white p-3 dark:bg-navy-light">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selected.area} / {selected.type}
                </p>
              </div>
              <button
                onClick={() => toggleFavorite(selected.id)}
                aria-label="お気に入り登録"
                className="rounded-lg bg-slate-100 px-3 py-2 text-xl dark:bg-navy"
              >
                {favorites.includes(selected.id) ? "⭐" : "☆"}
              </button>
            </div>
            {selectedForecast && (
              <div className="mt-2 flex items-center gap-3">
                <ExpectationChip score={selectedForecast.score} />
                {selectedForecast.best && (
                  <span className="font-bold">
                    狙い目 {selectedForecast.best.start}〜{selectedForecast.best.end}
                  </span>
                )}
              </div>
            )}
            <p className="mt-2 text-sm">{selected.fish.join("・")}</p>
            <Link
              href={`/spot/${selected.id}`}
              className="mt-3 block rounded-xl bg-ocean-700 py-2.5 text-center font-bold text-white"
            >
              釣り場の詳細を見る
            </Link>
          </section>
        )}

        {/* ---- 一覧 ---- */}
        <section className="space-y-1.5">
          <h2 className="font-bold">釣り場一覧</h2>
          {visibleSpots.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`flex w-full items-center gap-2 rounded-xl border p-2.5 text-left ${
                selectedId === s.id
                  ? "border-ocean-500 bg-ocean-50 dark:bg-navy"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-navy-light"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {favorites.includes(s.id) && "⭐ "}
                  {s.name}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {s.area} / {s.type} / {s.fish.slice(0, 4).join("・")}
                </p>
              </div>
              {scores[s.id] !== undefined && <ExpectationChip score={scores[s.id]} />}
            </button>
          ))}
        </section>

        <p className="pb-2 text-xs text-slate-500 dark:text-slate-400">
          釣り場の座標・設備情報は参考値です。立入禁止・釣り禁止の表示や漁業関係者の指示が常に優先されます。
          航空写真は国土地理院「全国最新写真(シームレス)」を使用しています。
        </p>
      </main>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-bold ${
        active
          ? "bg-ocean-700 text-white"
          : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
