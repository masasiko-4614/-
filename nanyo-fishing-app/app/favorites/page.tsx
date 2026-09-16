"use client";

// お気に入り釣り場。今日の期待度を一覧表示する。

import { useMemo, useState } from "react";
import Link from "next/link";
import DateNav from "@/components/DateNav";
import Header from "@/components/Header";
import FishSelect from "@/components/FishSelect";
import SpotRow from "@/components/SpotRow";
import { buildForecast } from "@/lib/forecast";
import { getFavorites, toggleFavorite } from "@/lib/storage";
import { useLocalData, useNow } from "@/lib/useClient";
import { useDayForecasts } from "@/lib/useForecast";
import type { FishKey } from "@/lib/types";

const NO_FAVORITES: string[] = [];

export default function FavoritesPage() {
  const now = useNow();
  const favorites = useLocalData(getFavorites, NO_FAVORITES);
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const [fish, setFish] = useState<FishKey | null>(null);
  const today = now.dateStr ?? "";
  const dateStr = dateOverride ?? now.dateStr;

  const isToday = dateStr === today;
  const { forecasts, spots, weathers, tides, personal, loading } = useDayForecasts(
    dateStr,
    fish,
    isToday ? now.hour : undefined
  );

  // お気に入りは件数が少ないので、魚種別のおすすめまで計算する
  const favForecasts = useMemo(() => {
    if (!dateStr) return [];
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return forecasts
      .filter((f) => favorites.includes(f.spotId))
      .map((f) => {
        const spot = spots.find((s) => s.id === f.spotId);
        const weather = spot ? weathers[spot.area] : null;
        if (!spot || !weather) return f;
        return buildForecast({
          spot,
          date,
          weather,
          fish,
          personal,
          nowHour: isToday ? now.hour : undefined,
          includeTopFish: true,
          tide: tides[spot.tideStation],
        });
      })
      .sort((a, b) => b.score - a.score);
  }, [forecasts, favorites, spots, weathers, dateStr, fish, personal, isToday, now.hour, tides]);

  return (
    <>
      <Header title="お気に入り" />
      <main className="space-y-4 p-3">
        <section className="space-y-3 rounded-2xl bg-white p-3 dark:bg-navy-light">
          {dateStr && <DateNav value={dateStr} today={today} onChange={setDateOverride} />}
          <FishSelect value={fish} onChange={setFish} />
        </section>

        {loading && favForecasts.length === 0 && favorites.length > 0 && (
          <p className="rounded-xl bg-white p-4 text-center text-slate-500 dark:bg-navy-light">
            計算中…
          </p>
        )}

        {favorites.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center dark:bg-navy-light">
            <p className="text-lg font-bold">お気に入りがまだありません</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              釣り場の詳細画面やマップの ☆ ボタンから登録すると、
              その日の期待度をここにまとめて表示します。
            </p>
            <Link
              href="/map"
              className="mt-3 inline-block rounded-xl bg-ocean-700 px-4 py-2 font-bold text-white"
            >
              マップから探す
            </Link>
          </div>
        ) : (
          <section className="space-y-2">
            <h2 className="text-lg font-bold">
              今日の期待度（{favForecasts.length}件）
            </h2>
            {favForecasts.map((f, i) => (
              <div key={f.spotId} className="relative">
                <SpotRow forecast={f} rank={i + 1} />
                <button
                  onClick={() => toggleFavorite(f.spotId)}
                  aria-label="お気に入りから外す"
                  className="absolute right-2 top-2 rounded-lg bg-slate-100 px-2 py-1 text-sm dark:bg-navy"
                >
                  ⭐
                </button>
              </div>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
