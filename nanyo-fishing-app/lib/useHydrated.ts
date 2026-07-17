"use client";

// クライアントでのハイドレーション完了を判定するフック。
// localStorage のデータはこのフックが true になってから読むことで、
// SSR とのハイドレーション不一致を避ける。

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
