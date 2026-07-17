export type Area = "八幡浜" | "長浜" | "宇和海" | "大洲周辺" | "その他";

export const AREAS: Area[] = ["八幡浜", "長浜", "宇和海", "大洲周辺", "その他"];

export type ShioMawari = "大潮" | "中潮" | "小潮" | "長潮" | "若潮";

export interface FishingSpot {
  id: string;
  name: string;
  area: Area;
  lat: number;
  lng: number;
  fish: string[];
  bestSeasons: string[];
  notes: string;
  isCustom?: boolean;
}

export interface CatchRecord {
  id: string;
  date: string; // YYYY-MM-DD
  spotId: string;
  spotName: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  species: string;
  count: number;
  sizeCm?: number;
  lure?: string;
  lureWeightG?: number;
  lureColor?: string;
  weather?: string;
  tide?: ShioMawari;
  wind?: string;
  photo?: string; // dataURL
  memo?: string;
  createdAt: string;
}

export type TackleCategory = "ロッド" | "リール" | "ライン" | "リーダー" | "ルアー";

export const TACKLE_CATEGORIES: TackleCategory[] = [
  "ロッド",
  "リール",
  "ライン",
  "リーダー",
  "ルアー",
];

export interface TackleItem {
  id: string;
  category: TackleCategory;
  name: string;
  spec?: string;
}

export interface TackleSet {
  id: string;
  name: string;
  itemIds: string[];
  isCurrent?: boolean;
}

export interface DailyWeather {
  date: string;
  label: string; // 晴れ / 曇り / 雨 など
  tempMinC: number;
  tempMaxC: number;
  precipProb: number; // %
  windSpeedMs: number;
  windDir: string; // 北 / 北東 ...
  isSample: boolean;
}

export interface TideEvent {
  time: string; // HH:mm
  type: "満潮" | "干潮";
}

export interface TideInfo {
  date: string;
  shio: ShioMawari;
  moonAge: number;
  events: TideEvent[];
  isSample: boolean;
}

export interface SunTimes {
  sunrise: string; // HH:mm
  sunset: string; // HH:mm
}

export interface TimeWindow {
  start: string; // HH:mm
  end: string;
  reasons: string[];
}

export interface SpotScore {
  spotId: string;
  total: number; // 0-100
  stars: number; // 1-5
  breakdown: {
    wind: number;
    tide: number;
    timeOfDay: number;
    weather: number;
    pastResults: number;
  };
  windows: TimeWindow[];
  warnings: string[];
}
