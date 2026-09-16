"use client";

// クライアントにしか存在しない値(localStorage・現在時刻)を、
// SSR とのハイドレーション不一致を起こさずに読むためのフック。
//
// useEffect の中で同期的に setState すると余計な再レンダリングが連鎖するため、
// useSyncExternalStore を使って「外部ストアの購読」として扱う。

import { useSyncExternalStore } from "react";
import { getVersion, subscribeLocalData } from "./localStore";

// ---------------- 端末内データ(localStorage) ----------------

const cache = new Map<() => unknown, { v: number; value: unknown }>();

/**
 * localStorage から読む値を購読する。
 * read には必ずモジュールレベルの安定した関数を渡すこと
 * (毎回新しい関数を渡すとキャッシュが効かず無限ループになる)。
 */
export function useLocalData<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(
    subscribeLocalData,
    () => {
      const v = getVersion();
      const hit = cache.get(read as () => unknown);
      if (hit && hit.v === v) return hit.value as T;
      const value = read();
      cache.set(read as () => unknown, { v, value });
      return value;
    },
    () => serverValue
  );
}

export { notifyLocalDataChanged } from "./localStore";

// ---------------- 現在時刻 ----------------

const CLOCK_INTERVAL_MS = 30000;

function clockSubscribe(cb: () => void): () => void {
  const t = setInterval(cb, CLOCK_INTERVAL_MS);
  return () => clearInterval(t);
}

/**
 * 30秒ごとに更新される現在時刻(ミリ秒)。
 * 30秒単位に丸めているので、同じ時間帯なら常に同じ値を返す(スナップショットが安定する)。
 * SSR 時は 0 を返すので、呼び出し側は 0 を「まだ分からない」として扱う。
 */
export function useNowMs(): number {
  return useSyncExternalStore(
    clockSubscribe,
    () => Math.floor(Date.now() / CLOCK_INTERVAL_MS) * CLOCK_INTERVAL_MS,
    () => 0
  );
}

export interface NowInfo {
  /** クライアントで時刻が確定したか */
  ready: boolean;
  /** YYYY-MM-DD。未確定なら null */
  dateStr: string | null;
  /** 0〜24 の小数時。未確定なら undefined */
  hour: number | undefined;
  /** HH:mm */
  clock: string;
}

/** 現在の日付・時刻をまとめて返す */
export function useNow(): NowInfo {
  const ms = useNowMs();
  if (ms === 0) return { ready: false, dateStr: null, hour: undefined, clock: "--:--" };
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return {
    ready: true,
    dateStr: `${y}-${m}-${day}`,
    hour: d.getHours() + d.getMinutes() / 60,
    clock: `${hh}:${mm}`,
  };
}
