"use client";

// 釣果履歴:一覧表示・絞り込み・削除

import { useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { deleteRecord, getRecords } from "@/lib/storage";
import { useHydrated } from "@/lib/useHydrated";
import { formatDateJa } from "@/lib/date";

export default function HistoryPage() {
  const hydrated = useHydrated();
  const [version, setVersion] = useState(0);
  const [speciesFilter, setSpeciesFilter] = useState("すべて");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const records = useMemo(
    () => (hydrated ? getRecords() : []),
    // version は削除後に localStorage から読み直すための依存
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hydrated, version]
  );

  const speciesList = useMemo(
    () => ["すべて", ...new Set(records.map((r) => r.species))],
    [records]
  );
  const filtered = useMemo(
    () =>
      speciesFilter === "すべて"
        ? records
        : records.filter((r) => r.species === speciesFilter),
    [records, speciesFilter]
  );

  const handleDelete = (id: string) => {
    if (!confirm("この記録を削除しますか?")) return;
    deleteRecord(id);
    setVersion((v) => v + 1);
  };

  return (
    <main>
      <Header title="釣果履歴" />
      <div className="space-y-3 p-4">
        {records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow dark:bg-navy-light">
            <p className="text-lg font-bold">まだ釣果記録がありません</p>
            <Link
              href="/record"
              className="mt-4 inline-block rounded-xl bg-ocean-600 px-6 py-3 text-lg font-bold text-white"
            >
              最初の釣果を登録する
            </Link>
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {speciesList.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeciesFilter(s)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-base font-bold ${
                    speciesFilter === s
                      ? "bg-ocean-600 text-white"
                      : "bg-white text-slate-700 shadow dark:bg-navy-light dark:text-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {filtered.length}件の記録
            </p>
            <ul className="space-y-3">
              {filtered.map((r) => (
                <li
                  key={r.id}
                  className="overflow-hidden rounded-2xl bg-white shadow dark:bg-navy-light"
                >
                  <button
                    className="flex w-full items-center gap-3 p-4 text-left"
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    {r.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.photo}
                        alt=""
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-ocean-100 text-3xl dark:bg-ocean-900">
                        🐟
                      </span>
                    )}
                    <div className="flex-1">
                      <p className="text-lg font-extrabold">
                        {r.species} × {r.count}
                        {r.sizeCm ? `(${r.sizeCm}cm)` : ""}
                      </p>
                      <p className="text-base">{r.spotName}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDateJa(r.date)} {r.startTime}〜{r.endTime}
                      </p>
                    </div>
                    <span className="text-xl text-slate-400">
                      {expandedId === r.id ? "▲" : "▼"}
                    </span>
                  </button>
                  {expandedId === r.id && (
                    <div className="border-t border-slate-200 p-4 dark:border-ocean-800">
                      <dl className="grid grid-cols-2 gap-2 text-base">
                        {r.lure && (
                          <div>
                            <dt className="text-sm font-bold text-slate-500 dark:text-slate-400">
                              ルアー
                            </dt>
                            <dd>
                              {r.lure}
                              {r.lureWeightG ? ` ${r.lureWeightG}g` : ""}
                              {r.lureColor ? ` / ${r.lureColor}` : ""}
                            </dd>
                          </div>
                        )}
                        {r.weather && (
                          <div>
                            <dt className="text-sm font-bold text-slate-500 dark:text-slate-400">
                              天気
                            </dt>
                            <dd>{r.weather}</dd>
                          </div>
                        )}
                        {r.tide && (
                          <div>
                            <dt className="text-sm font-bold text-slate-500 dark:text-slate-400">
                              潮回り
                            </dt>
                            <dd>{r.tide}</dd>
                          </div>
                        )}
                        {r.wind && (
                          <div>
                            <dt className="text-sm font-bold text-slate-500 dark:text-slate-400">
                              風
                            </dt>
                            <dd>{r.wind}</dd>
                          </div>
                        )}
                      </dl>
                      {r.memo && <p className="mt-2 text-base">📝 {r.memo}</p>}
                      {r.photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.photo}
                          alt="釣果写真"
                          className="mt-2 max-h-64 rounded-xl"
                        />
                      )}
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="mt-3 rounded-xl bg-red-100 px-4 py-2 font-bold text-red-700 dark:bg-red-950 dark:text-red-300"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
