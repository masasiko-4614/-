// 端末内(localStorage)へのデータ保存。
// Supabase を接続する場合はこの層を差し替える(lib/supabase.ts 参照)。

import { SAMPLE_SPOTS } from "./sampleSpots";
import type {
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
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---- 釣り場 ----

export function getAllSpots(): FishingSpot[] {
  const custom = load<FishingSpot[]>(KEYS.customSpots, []);
  return [...SAMPLE_SPOTS, ...custom];
}

export function addCustomSpot(spot: Omit<FishingSpot, "id" | "isCustom">): FishingSpot {
  const custom = load<FishingSpot[]>(KEYS.customSpots, []);
  const created: FishingSpot = { ...spot, id: newId(), isCustom: true };
  save(KEYS.customSpots, [...custom, created]);
  return created;
}

export function deleteCustomSpot(id: string): void {
  const custom = load<FishingSpot[]>(KEYS.customSpots, []);
  save(
    KEYS.customSpots,
    custom.filter((s) => s.id !== id)
  );
}

// ---- お気に入り ----

export function getFavorites(): string[] {
  return load<string[]>(KEYS.favorites, []);
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
  { id: "init-rod-lateo", category: "ロッド", name: "ダイワ ラテオ 86", spec: "8.6ft シーバスロッド" },
];

export function getTackleItems(): TackleItem[] {
  return load<TackleItem[]>(KEYS.tackleItems, INITIAL_TACKLE);
}

export function saveTackleItems(items: TackleItem[]): void {
  save(KEYS.tackleItems, items);
}

const INITIAL_SETS: TackleSet[] = [
  { id: "init-set-main", name: "メインセット", itemIds: ["init-rod-lateo"], isCurrent: true },
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
      records: load(KEYS.records, []),
      customSpots: load(KEYS.customSpots, []),
      favorites: load(KEYS.favorites, []),
      tackleItems: load(KEYS.tackleItems, INITIAL_TACKLE),
      tackleSets: load(KEYS.tackleSets, INITIAL_SETS),
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
}

export function clearAll(): void {
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
}
