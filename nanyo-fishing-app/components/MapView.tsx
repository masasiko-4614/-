"use client";

// OpenStreetMap + Leaflet の地図表示。
// タイルURLは NEXT_PUBLIC_MAP_TILE_URL で差し替え可能。

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FishingSpot } from "@/lib/types";

const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

interface Props {
  spots: FishingSpot[];
  favorites: string[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onLongSelect?: (lat: number, lng: number) => void;
}

function markerIcon(isFavorite: boolean, isCustom: boolean): L.DivIcon {
  const bg = isFavorite ? "#f59e0b" : isCustom ? "#10b981" : "#2563eb";
  return L.divIcon({
    className: "",
    html: `<div style="background:${bg};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

export default function MapView({
  spots,
  favorites,
  selectedId,
  onSelect,
  onLongSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [33.42, 132.47],
      zoom: 10,
      zoomControl: true,
    });
    L.tileLayer(TILE_URL, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
      const marker = L.marker([spot.lat, spot.lng], {
        icon: markerIcon(favorites.includes(spot.id), Boolean(spot.isCustom)),
      })
        .addTo(map)
        .bindPopup(
          `<strong style="font-size:15px">${spot.name}</strong><br/>${spot.fish
            .slice(0, 4)
            .join("・")}`
        );
      marker.on("click", () => onSelect?.(spot.id));
      markersRef.current.set(spot.id, marker);
    });
  }, [spots, favorites, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const marker = markersRef.current.get(selectedId);
    if (marker) {
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 13));
      marker.openPopup();
    }
  }, [selectedId]);

  return <div ref={containerRef} className="h-[45vh] w-full" />;
}
