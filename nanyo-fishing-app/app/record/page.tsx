"use client";

// 釣果登録:入力操作を減らすため、日付から天気・潮を自動入力し、
// 魚種はチップ選択、匹数はステッパーで入力する。

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { FISH_SPECIES } from "@/lib/sampleSpots";
import { calcTideInfo } from "@/lib/tide";
import { sampleWeather } from "@/lib/weather";
import { addRecord, getAllSpots, getTackleItems } from "@/lib/storage";
import { useHydrated } from "@/lib/useHydrated";
import { todayStr } from "@/lib/date";

export default function RecordPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const spots = useMemo(() => (hydrated ? getAllSpots() : []), [hydrated]);
  const lures = useMemo(
    () => (hydrated ? getTackleItems().filter((t) => t.category === "ルアー") : []),
    [hydrated]
  );
  const [saved, setSaved] = useState(false);

  const [date, setDate] = useState(todayStr());
  const [spotIdState, setSpotIdState] = useState("");
  const spotId = spotIdState || spots[0]?.id || "";
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("09:00");
  const [species, setSpecies] = useState("");
  const [speciesOther, setSpeciesOther] = useState("");
  const [count, setCount] = useState(1);
  const [sizeCm, setSizeCm] = useState("");
  const [lure, setLure] = useState("");
  const [lureWeightG, setLureWeightG] = useState("");
  const [lureColor, setLureColor] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [memo, setMemo] = useState("");

  // 日付から天気・潮を自動入力(編集も可能)
  const dateObj = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [date]);
  const autoTide = useMemo(() => calcTideInfo(dateObj).shio, [dateObj]);
  const spot = spots.find((s) => s.id === spotId);
  const autoWeather = useMemo(
    () => sampleWeather(date, spot?.id ?? "yawatahama-port"),
    [date, spot]
  );
  // 自動入力値をベースに、ユーザーが編集した場合のみ上書き値を使う
  const [weatherOverride, setWeatherOverride] = useState<string | null>(null);
  const [windOverride, setWindOverride] = useState<string | null>(null);
  const weather = weatherOverride ?? autoWeather.label;
  const wind = windOverride ?? `${autoWeather.windDir} ${autoWeather.windSpeedMs}m/s`;

  const handlePhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // 保存容量節約のため縮小して保存
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 800 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhoto(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const finalSpecies = species === "その他" ? speciesOther : species;
  const canSave = Boolean(date && spotId && finalSpecies);

  const handleSave = () => {
    if (!canSave || !spot) return;
    addRecord({
      date,
      spotId,
      spotName: spot.name,
      startTime,
      endTime,
      species: finalSpecies,
      count,
      sizeCm: sizeCm ? Number(sizeCm) : undefined,
      lure: lure || undefined,
      lureWeightG: lureWeightG ? Number(lureWeightG) : undefined,
      lureColor: lureColor || undefined,
      weather,
      tide: autoTide,
      wind,
      photo,
      memo: memo || undefined,
    });
    setSaved(true);
    setTimeout(() => router.push("/history"), 800);
  };

  const inputCls =
    "w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-lg dark:border-ocean-800 dark:bg-navy-light dark:text-white";
  const labelCls = "mb-1 block text-base font-bold text-slate-600 dark:text-slate-300";

  return (
    <main>
      <Header title="釣果登録" />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>釣行日</label>
            <input
              type="date"
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>釣り場</label>
            <select
              className={inputCls}
              value={spotId}
              onChange={(e) => setSpotIdState(e.target.value)}
            >
              {spots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>開始</label>
            <input
              type="time"
              className={inputCls}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>終了</label>
            <input
              type="time"
              className={inputCls}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>魚種</label>
          <div className="flex flex-wrap gap-2">
            {FISH_SPECIES.map((f) => (
              <button
                key={f}
                onClick={() => setSpecies(f)}
                className={`rounded-full px-4 py-2 text-base font-bold ${
                  species === f
                    ? "bg-ocean-600 text-white"
                    : "bg-white text-slate-700 shadow dark:bg-navy-light dark:text-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {species === "その他" && (
            <input
              className={`${inputCls} mt-2`}
              placeholder="魚種を入力"
              value={speciesOther}
              onChange={(e) => setSpeciesOther(e.target.value)}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>匹数</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCount((c) => Math.max(0, c - 1))}
                className="h-12 w-12 rounded-xl bg-ocean-100 text-2xl font-bold text-ocean-800 dark:bg-ocean-900 dark:text-ocean-200"
              >
                −
              </button>
              <span className="min-w-12 text-center text-2xl font-extrabold">{count}</span>
              <button
                onClick={() => setCount((c) => c + 1)}
                className="h-12 w-12 rounded-xl bg-ocean-100 text-2xl font-bold text-ocean-800 dark:bg-ocean-900 dark:text-ocean-200"
              >
                +
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              0匹(ボウズ)も記録できます
            </p>
          </div>
          <div>
            <label className={labelCls}>サイズ(cm)</label>
            <input
              type="number"
              inputMode="decimal"
              className={inputCls}
              placeholder="例: 45"
              value={sizeCm}
              onChange={(e) => setSizeCm(e.target.value)}
            />
          </div>
        </div>

        <details className="rounded-xl bg-white p-3 shadow dark:bg-navy-light" open>
          <summary className="cursor-pointer text-base font-bold">🎯 ルアー情報</summary>
          <div className="mt-2 space-y-2">
            {lures.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {lures.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLure(l.name)}
                    className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                      lure === l.name
                        ? "bg-ocean-600 text-white"
                        : "bg-slate-100 dark:bg-navy dark:text-slate-200"
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            )}
            <input
              className={inputCls}
              placeholder="ルアー名(例: セットアッパー 110S)"
              value={lure}
              onChange={(e) => setLure(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                className={inputCls}
                placeholder="重量(g)"
                value={lureWeightG}
                onChange={(e) => setLureWeightG(e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="カラー"
                value={lureColor}
                onChange={(e) => setLureColor(e.target.value)}
              />
            </div>
          </div>
        </details>

        <details className="rounded-xl bg-white p-3 shadow dark:bg-navy-light">
          <summary className="cursor-pointer text-base font-bold">
            🌤️ 天気・潮・風(自動入力済み)
          </summary>
          <div className="mt-2 space-y-2">
            <input
              className={inputCls}
              value={weather}
              onChange={(e) => setWeatherOverride(e.target.value)}
              placeholder="天気"
            />
            <p className="rounded-xl bg-ocean-50 p-3 text-base font-bold dark:bg-ocean-900">
              潮回り:{autoTide}(自動計算)
            </p>
            <input
              className={inputCls}
              value={wind}
              onChange={(e) => setWindOverride(e.target.value)}
              placeholder="風(例: 北西 3m/s)"
            />
          </div>
        </details>

        <div>
          <label className={labelCls}>📷 写真</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="w-full text-base"
            onChange={(e) => handlePhoto(e.target.files?.[0])}
          />
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="釣果写真" className="mt-2 max-h-48 rounded-xl" />
          )}
        </div>

        <div>
          <label className={labelCls}>メモ</label>
          <textarea
            className={inputCls}
            rows={2}
            placeholder="ヒットパターンなど"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave || saved}
          className="w-full rounded-2xl bg-ocean-600 py-4 text-xl font-extrabold text-white shadow-lg disabled:opacity-40"
        >
          {saved ? "✅ 保存しました" : "釣果を保存する"}
        </button>
        {!canSave && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            日付・釣り場・魚種を入力すると保存できます
          </p>
        )}
      </div>
    </main>
  );
}
