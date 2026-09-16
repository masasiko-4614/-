// 公開先のサブパス(GitHub Pages なら "/-")。next/link 以外で URL を組み立てるときに使う。
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** public/ 配下のファイルなど、basePath を自動で付けてくれない URL 用 */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}

/**
 * 釣り場詳細ページの URL。
 * 静的書き出しでは自分で登録した釣り場の ID を事前に知れないため、
 * パスではなくクエリで ID を渡す。
 */
export function spotHref(id: string): string {
  return `/spot/?id=${encodeURIComponent(id)}`;
}
