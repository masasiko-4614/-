// 端末内(localStorage)へのデータ保存。
// ログイン不要で使えることを優先し、既定では端末内にのみ保存する。
// Supabase を接続する場合はこの層を差し替える(lib/supabase.ts 参照)。

import { notifyLocalDataChanged } from "./localStore";
import { SPOTS } from "./spots";
import type {
  Area,
  CatchRecord,
  FishingSpot,
  TackleItem,
  TackleSet,
} from "./types";

const KEYS = {
  records: "nanyo:records",
  customSpots: "nanyo:customSpots",
  favorites: "nanyo:favorites",
  tackleItems: "nanyo:tackleItems",
  tackleSets: "nanyo:tackleSets",
  settings: "nanyo:settings",
} as const;

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 容量オーバーなどでも落とさない
  }
  // 読んでいる画面に変更を知らせる
  notifyLocalDataChanged();
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---- 設定 ----

export interface AppSettings {
  /** 拠点にしている地域 */
  homeArea: Area;
  /** 移動速度の目安(km/h)。「今から行くなら」の所要時間計算に使う */
  travelSpeedKmh: number;
  /** GPSの使用を許可したか */
  useGps: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  homeArea: "八幡浜",
  travelSpeedKmh: 38,
  useGps: false,
};

export function getSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...load<Partial<AppSettings>>(KEYS.settings, {}) };
}

export function saveSettings(s: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...s };
  save(KEYS.settings, next);
  return next;
}

// ---- 釣り場 ----

export function getCustomSpots(): FishingSpot[] {
  return load<FishingSpot[]>(KEYS.customSpots, []);
}

export function getAllSpots(): FishingSpot[] {
  return [...SPOTS, ...getCustomSpots()];
}

export function addCustomSpot(spot: Omit<FishingSpot, "id" | "isCustom">): FishingSpot {
  const custom = getCustomSpots();
  const created: FishingSpot = { ...spot, id: newId(), isCustom: true };
  save(KEYS.customSpots, [...custom, created]);
  return created;
}

export function deleteCustomSpot(id: string): void {
  save(
    KEYS.customSpots,
    getCustomSpots().filter((s) => s.id !== id)
  );
}

// ---- お気に入り ----

export function getFavorites(): string[] {
  return load<string[]>(KEYS.favorites, []);
}

export function isFavorite(spotId: string): boolean {
  return getFavorites().includes(spotId);
}

export function toggleFavorite(spotId: string): string[] {
  const favs = getFavorites();
  const next = favs.includes(spotId)
    ? favs.filter((id) => id !== spotId)
    : [...favs, spotId];
  save(KEYS.favorites, next);
  return next;
}

// ---- 釣果記録 ----

export function getRecords(): CatchRecord[] {
  return load<CatchRecord[]>(KEYS.records, []).sort((a, b) =>
    `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`)
  );
}

export function addRecord(record: Omit<CatchRecord, "id" | "createdAt">): CatchRecord {
  const records = load<CatchRecord[]>(KEYS.records, []);
  const created: CatchRecord = {
    ...record,
    id: newId(),
    createdAt: new Date().toISOString(),
  };
  save(KEYS.records, [...records, created]);
  return created;
}

export function deleteRecord(id: string): void {
  const records = load<CatchRecord[]>(KEYS.records, []);
  save(
    KEYS.records,
    records.filter((r) => r.id !== id)
  );
}

// ---- タックル ----

const INITIAL_TACKLE: TackleItem[] = [
  {
    id: "init-rod-lateo",
    category: "ロッド",
    name: "ダイワ ラテオ 86",
    spec: "8.6ft シーバスロッド",
  },
];

export function getTackleItems(): TackleItem[] {
  return load<TackleItem[]>(KEYS.tackleItems, INITIAL_TACKLE);
}

export function saveTackleItems(items: TackleItem[]): void {
  save(KEYS.tackleItems, items);
}

const INITIAL_SETS: TackleSet[] = [
  {
    id: "init-set-main",
    name: "メインセット",
    itemIds: ["init-rod-lateo"],
    isCurrent: true,
  },
];

export function getTackleSets(): TackleSet[] {
  return load<TackleSet[]>(KEYS.tackleSets, INITIAL_SETS);
}

export function saveTackleSets(sets: TackleSet[]): void {
  save(KEYS.tackleSets, sets);
}

// ---- バックアップ ----

export function exportAll(): string {
  return JSON.stringify(
    {
      version: 2,
      records: load(KEYS.records, []),
      customSpots: load(KEYS.customSpots, []),
      favorites: load(KEYS.favorites, []),
      tackleItems: load(KEYS.tackleItems, INITIAL_TACKLE),
      tackleSets: load(KEYS.tackleSets, INITIAL_SETS),
      settings: getSettings(),
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function importAll(json: string): void {
  const data = JSON.parse(json);
  if (data.records) save(KEYS.records, data.records);
  if (data.customSpots) save(KEYS.customSpots, data.customSpots);
  if (data.favorites) save(KEYS.favorites, data.favorites);
  if (data.tackleItems) save(KEYS.tackleItems, data.tackleItems);
  if (data.tackleSets) save(KEYS.tackleSets, data.tackleSets);
  if (data.settings) save(KEYS.settings, data.settings);
}

export function clearAll(): void {
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  window.localStorage.removeItem("nanyo:weatherCache");
  notifyLocalDataChanged();
}
