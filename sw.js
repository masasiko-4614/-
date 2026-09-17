// サービスワーカー。
//  - アプリの画面(HTML/JS/CSS)はネットワーク優先 + キャッシュへ保存
//  - 地図タイルはキャッシュ優先(オフラインでも直近に見た範囲は表示できる)
//  - 気象APIはネットワーク優先。失敗時は前回のレスポンスを返す
//    (アプリ側でも localStorage に前回値を持っているため二重の備え)
//
// これにより、オフラインでも「登録済み釣り場・過去の釣果・前回取得した潮汐/天気」を
// 閲覧できる。潮汐と日の出入りは端末内の計算なので通信なしで動作する。

const VERSION = "v3";
const APP_CACHE = `nanyo-app-${VERSION}`;
const TILE_CACHE = `nanyo-tiles-${VERSION}`;
const API_CACHE = `nanyo-api-${VERSION}`;
const KEEP = [APP_CACHE, TILE_CACHE, API_CACHE];

// 公開先のサブパス(GitHub Pages なら "/-/")。登録時の scope から求める
const BASE = new URL(self.registration.scope).pathname;

const PRECACHE = [
  "",
  "forecast/",
  "map/",
  "tide/",
  "now/",
  "ranking/",
  "favorites/",
  "record/",
  "history/",
  "analysis/",
  "tackle/",
  "settings/",
  "menu/",
  "spot/",
  "manifest.json",
  "icon.svg",
  "icon-192.png",
  "apple-touch-icon.png",
].map((p) => BASE + p);

/** 地図タイルの上限枚数(端末の容量を圧迫しないため) */
const TILE_LIMIT = 400;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      // 1つでも失敗すると addAll 全体が失敗するので、個別に入れる
      .then((cache) => Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => {}))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

/** キャッシュの件数を上限内に収める */
async function trimCache(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  for (const key of keys.slice(0, keys.length - limit)) {
    await cache.delete(key);
  }
}

function isMapTile(url) {
  return (
    url.hostname.endsWith("tile.openstreetmap.org") ||
    url.hostname === "cyberjapandata.gsi.go.jp"
  );
}

function isWeatherApi(url) {
  return url.hostname.endsWith("open-meteo.com");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // ---- 地図タイル: キャッシュ優先 ----
  if (isMapTile(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request)
            .then((res) => {
              if (res.ok) {
                const copy = res.clone();
                caches
                  .open(TILE_CACHE)
                  .then((cache) => cache.put(request, copy))
                  .then(() => trimCache(TILE_CACHE, TILE_LIMIT))
                  .catch(() => {});
              }
              return res;
            })
            .catch(() => Response.error())
      )
    );
    return;
  }

  // ---- 気象API: ネットワーク優先、失敗時は前回の値 ----
  if (isWeatherApi(url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches
              .open(API_CACHE)
              .then((cache) => cache.put(request, copy))
              .then(() => trimCache(API_CACHE, 60))
              .catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached ?? Response.error())
        )
    );
    return;
  }

  // ---- 外部のその他は素通し ----
  if (url.origin !== self.location.origin) return;

  // ---- アプリ本体: ネットワーク優先、失敗時はキャッシュ ----
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches
            .open(APP_CACHE)
            .then((cache) => cache.put(request, copy))
            .catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode !== "navigate") return Response.error();
          // 釣り場詳細(?id=...)などはクエリ違いでも同じ画面を使える
          return caches
            .match(request, { ignoreSearch: true })
            // それも無ければトップページを返してオフラインでも操作できるようにする
            .then((page) => page ?? caches.match(BASE));
        })
      )
  );
});
