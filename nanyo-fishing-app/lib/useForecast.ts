"use client";

// 画面から使う予測データのフック。
// 天気は「エリア中心の座標」単位で1リクエストにまとめて取得し、
// そのエリアに属する釣り場すべてで共有する(通信を最小限にするため)。

import { useCallback, useEffect, useMemo, useState } from "react";
import { AREA_INFOS } from "./areas";
import { buildForecast } from "./forecast";
import { analyzeRecords } from "./personal";
import { getRecords, getAllSpots } from "./storage";
import { calcTideInfo } from "./tide";
import { useLocalData } from "./useClient";
import { getAreaWeathersCached, type WeatherPoint } from "./weather";
import type {
  Area,
  CatchRecord,
  DayWeather,
  FishKey,
  FishingSpot,
  PersonalProfile,
  SpotForecast,
  TideInfo,
  TideStationId,
} from "./types";

const AREA_POINTS: WeatherPoint[] = AREA_INFOS.map((a) => ({
  key: a.name,
  lat: a.lat,
  lng: a.lng,
}));

const TIDE_STATION_IDS: TideStationId[] = [
  "nagahama",
  "yawatahama",
  "misaki",
  "mikame",
  "uwajima",
  "mishou",
  "ainan",
];

const NO_SPOTS: FishingSpot[] = [];
const NO_RECORDS: CatchRecord[] = [];

export interface DayData {
  loading: boolean;
  /** エリア名 -> 天気 */
  weathers: Record<string, DayWeather>;
  /** 全釣り場の予測(スコア降順) */
  forecasts: SpotForecast[];
  spots: FishingSpot[];
  personal: PersonalProfile | null;
  /** 潮汐地点 -> 潮汐情報 */
  tides: Record<string, TideInfo>;
  error: string | null;
  reload: () => void;
}

function dateFromStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface WeatherState {
  /** どの日付・世代のデータか */
  key: string | null;
  weathers: Record<string, DayWeather>;
  error: string | null;
}

/** 端末内の釣り場・釣果を読む(localStorage) */
export function useLocalSpots(): FishingSpot[] {
  return useLocalData(getAllSpots, NO_SPOTS);
}

export function usePersonalProfile(): PersonalProfile | null {
  const records = useLocalData(getRecords, NO_RECORDS);
  return useMemo(() => analyzeRecords(records), [records]);
}

/**
 * 指定日の全釣り場の予測を計算する。
 * fish を指定するとその魚種向けの予測になる。
 */
export function useDayForecasts(
  dateStr: string | null,
  fish: FishKey | null = null,
  nowHour?: number
): DayData {
  const [state, setState] = useState<WeatherState>({
    key: null,
    weathers: {},
    error: null,
  });
  const [nonce, setNonce] = useState(0);
  const spots = useLocalSpots();
  const personal = usePersonalProfile();

  const wantKey = dateStr ? `${dateStr}#${nonce}` : null;

  useEffect(() => {
    if (!dateStr) return;
    let cancelled = false;
    const key = `${dateStr}#${nonce}`;
    getAreaWeathersCached(dateStr, AREA_POINTS)
      .then((w) => {
        if (cancelled) return;
        const anyReal = Object.values(w).some((x) => x.quality === "予測値");
        setState({
          key,
          weathers: w,
          error: anyReal
            ? null
            : "気象データを取得できませんでした。表示は平年値からの参考値です。",
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ key, weathers: {}, error: "気象データの取得に失敗しました。" });
      });
    return () => {
      cancelled = true;
    };
  }, [dateStr, nonce]);

  const loading = wantKey !== null && state.key !== wantKey;
  // 日付が変わった直後に古い天気で計算しないよう、キーが一致したときだけ使う
  const weathers = useMemo(
    () => (state.key === wantKey ? state.weathers : {}),
    [state.key, state.weathers, wantKey]
  );

  const tides = useMemo(() => {
    if (!dateStr) return {};
    const date = dateFromStr(dateStr);
    const out: Record<string, TideInfo> = {};
    TIDE_STATION_IDS.forEach((s) => {
      out[s] = calcTideInfo(date, s);
    });
    return out;
  }, [dateStr]);

  const forecasts = useMemo(() => {
    if (!dateStr || Object.keys(weathers).length === 0 || spots.length === 0) return [];
    const date = dateFromStr(dateStr);
    const list: SpotForecast[] = [];
    for (const spot of spots) {
      if (spot.fish.length === 0) continue; // 内陸拠点などは対象外
      const weather = weathers[spot.area];
      if (!weather) continue;
      list.push(
        buildForecast({
          spot,
          date,
          weather,
          fish,
          personal,
          nowHour,
          tide: tides[spot.tideStation],
        })
      );
    }
    return list.sort((a, b) => b.score - a.score);
  }, [dateStr, weathers, spots, fish, personal, nowHour, tides]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    loading,
    weathers,
    forecasts,
    spots,
    personal,
    tides,
    error: state.key === wantKey ? state.error : null,
    reload,
  };
}

/** 単一の釣り場について、詳しい予測(おすすめ魚種つき)を作る */
export function useSpotForecast(
  spot: FishingSpot | undefined,
  dateStr: string | null,
  fish: FishKey | null,
  nowHour?: number
): { loading: boolean; forecast: SpotForecast | null; weather: DayWeather | null } {
  const [state, setState] = useState<{ key: string | null; weather: DayWeather | null }>({
    key: null,
    weather: null,
  });
  const personal = usePersonalProfile();

  const wantKey = spot && dateStr ? `${spot.id}#${dateStr}` : null;

  useEffect(() => {
    if (!spot || !dateStr) return;
    let cancelled = false;
    const key = `${spot.id}#${dateStr}`;
    const area = AREA_INFOS.find((a) => a.name === spot.area);
    const point: WeatherPoint = {
      key: spot.area,
      lat: area?.lat ?? spot.lat,
      lng: area?.lng ?? spot.lng,
    };
    getAreaWeathersCached(dateStr, [point])
      .then((w) => {
        if (!cancelled) setState({ key, weather: w[spot.area] ?? null });
      })
      .catch(() => {
        if (!cancelled) setState({ key, weather: null });
      });
    return () => {
      cancelled = true;
    };
  }, [spot, dateStr]);

  const weather = state.key === wantKey ? state.weather : null;
  const loading = wantKey !== null && state.key !== wantKey;

  const forecast = useMemo(() => {
    if (!spot || !dateStr || !weather) return null;
    return buildForecast({
      spot,
      date: dateFromStr(dateStr),
      weather,
      fish,
      personal,
      nowHour,
      includeTopFish: true,
    });
  }, [spot, dateStr, weather, fish, personal, nowHour]);

  return { loading, forecast, weather };
}

/** エリアごとの最高スコア(ランキング用) */
export function areaScores(
  forecasts: SpotForecast[]
): { area: Area; score: number; best: SpotForecast }[] {
  const byArea = new Map<Area, SpotForecast[]>();
  forecasts.forEach((f) => {
    const arr = byArea.get(f.area) ?? [];
    arr.push(f);
    byArea.set(f.area, arr);
  });
  return [...byArea.entries()]
    .map(([area, list]) => {
      const sorted = [...list].sort((a, b) => b.score - a.score);
      return { area, score: sorted[0].score, best: sorted[0] };
    })
    .sort((a, b) => b.score - a.score);
}
