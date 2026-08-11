"use client";

// OpenStreetMap + Leaflet の地図表示。
// タイルURLは NEXT_PUBLIC_MAP_TILE_URL で差し替え可能。

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FishingSpot } from "@/lib/types";

const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// 航空写真は国土地理院の「全国最新写真(シームレス)」を使う。
// 国土地理院コンテンツ利用規約により、出典を明示すれば利用できる。
const PHOTO_TILE_URL = "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg";

type Layer = "地図" | "航空写真";

interface Props {
  spots: FishingSpot[];
  favorites: string[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onLongSelect?: (lat: number, lng: number) => void;
  /** 釣り場ID -> 今日の期待度。マーカーの色分けに使う */
  scores?: Record<string, number>;
}

function scoreColor(score: number | undefined): string {
  if (score === undefined) return "#2563eb";
  if (score >= 80) return "#f43f5e";
  if (score >= 70) return "#f97316";
  if (score >= 55) return "#10b981";
  if (score >= 40) return "#0ea5e9";
  return "#94a3b8";
}

function markerIcon(
  isFavorite: boolean,
  isCustom: boolean,
  score: number | undefined
): L.DivIcon {
  const bg = isCustom ? "#10b981" : scoreColor(score);
  const star = isFavorite
    ? `<div style="position:absolute;top:-8px;right:-6px;font-size:14px;line-height:1">⭐</div>`
    : "";
  const label =
    score !== undefined
      ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform:rotate(45deg);color:#fff;font-size:11px;font-weight:800">${score}</div>`
      : "";
  return L.divIcon({
    className: "",
    html:
      `<div style="position:relative;width:30px;height:30px">` +
      `<div style="background:${bg};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)">${label}</div>` +
      `${star}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

export default function MapView({
  spots,
  favorites,
  selectedId,
  onSelect,
  onLongSelect,
  scores,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const tileRef = useRef<L.TileLayer | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [layer, setLayer] = useState<Layer>("地図");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [33.42, 132.47],
      zoom: 10,
      zoomControl: true,
      // 操作感度を上げる設定
      zoomSnap: 0.25, // ズームの刻みを細かく
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 30, // ホイール/トラックパッドのズームを速く
      wheelDebounceTime: 20,
      inertia: true,
      inertiaDeceleration: 1500, // 指を離した後もよく滑る
      inertiaMaxSpeed: 3000,
      touchZoom: true,
      bounceAtZoomLimits: false,
    });
    tileRef.current = L.tileLayer(TILE_URL, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);
    map.on("contextmenu", (e: L.LeafletMouseEvent) => {
      onLongSelect?.(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();
    spots.forEach((spot) => {
      const score = scores?.[spot.id];
      const marker = L.marker([spot.lat, spot.lng], {
        icon: markerIcon(favorites.includes(spot.id), Boolean(spot.isCustom), score),
      })
        .addTo(map)
        .bindPopup(
          `<strong style="font-size:15px">${spot.name}</strong><br/>` +
            `<span style="font-size:12px;opacity:.8">${spot.area} / ${spot.type}</span><br/>` +
            `${spot.fish.slice(0, 4).join("・")}` +
            (score !== undefined
              ? `<br/><strong style="color:${scoreColor(score)}">今日の期待度 ${score}点</strong>`
              : "")
        );
      marker.on("click", () => onSelect?.(spot.id));
      markersRef.current.set(spot.id, marker);
    });
  }, [spots, favorites, onSelect, scores]);

  // 地図 / 航空写真の切り替え
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    tileRef.current?.remove();
    tileRef.current = L.tileLayer(layer === "地図" ? TILE_URL : PHOTO_TILE_URL, {
      attribution:
        layer === "地図"
          ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          : '出典: <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a> 全国最新写真(シームレス)',
      maxZoom: 18,
    }).addTo(map);
    tileRef.current.setZIndex(0);
  }, [layer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const marker = markersRef.current.get(selectedId);
    if (marker) {
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 13), {
        animate: true,
        duration: 0.6,
      });
      marker.openPopup();
    }
  }, [selectedId]);

  // 拡大切替後に地図のサイズを再計算する
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(t);
  }, [expanded]);

  return (
    <div
      className={`relative w-full transition-[height] duration-200 ${
        expanded ? "h-[78vh]" : "h-[45vh]"
      }`}
    >
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute right-3 top-3 z-[800] flex flex-col gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "地図を縮小" : "地図を拡大"}
          className="rounded-xl bg-white px-3 py-2 text-lg font-bold text-slate-700 shadow-lg dark:bg-navy-light dark:text-slate-100"
        >
          {expanded ? "🗗 縮小" : "⛶ 拡大"}
        </button>
        <button
          onClick={() => setLayer((v) => (v === "地図" ? "航空写真" : "地図"))}
          aria-label="地図と航空写真を切り替え"
          className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-lg dark:bg-navy-light dark:text-slate-100"
        >
          {layer === "地図" ? "🛰 航空写真" : "🗺 地図"}
        </button>
      </div>
    </div>
  );
}
