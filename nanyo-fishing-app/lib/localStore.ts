// 端末内データ(localStorage)の変更通知。
// React に依存しない購読の仕組みだけを持つ。
// 画面側は lib/useClient.ts の useLocalData から購読する。

const listeners = new Set<() => void>();

/** 変更を検知するための世代番号。書き換えるたびに増える */
let version = 0;

export function subscribeLocalData(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** 端末内データを書き換えたあとに呼ぶ */
export function notifyLocalDataChanged(): void {
  version += 1;
  listeners.forEach((l) => l());
}

export function getVersion(): number {
  return version;
}
