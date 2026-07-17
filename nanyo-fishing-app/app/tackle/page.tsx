"use client";

// タックル管理:ロッド・リール・ライン・リーダー・ルアーの登録と
// 現在使用中タックルセットの管理

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import {
  getTackleItems,
  getTackleSets,
  newId,
  saveTackleItems,
  saveTackleSets,
} from "@/lib/storage";
import { useHydrated } from "@/lib/useHydrated";
import {
  TACKLE_CATEGORIES,
  type TackleCategory,
  type TackleItem,
  type TackleSet,
} from "@/lib/types";

const CATEGORY_ICONS: Record<TackleCategory, string> = {
  ロッド: "🎣",
  リール: "🎡",
  ライン: "🧵",
  リーダー: "🪢",
  ルアー: "🐟",
};

export default function TacklePage() {
  const hydrated = useHydrated();
  const [itemsOverride, setItemsOverride] = useState<TackleItem[] | null>(null);
  const [setsOverride, setSetsOverride] = useState<TackleSet[] | null>(null);
  const [category, setCategory] = useState<TackleCategory>("ロッド");
  const [name, setName] = useState("");
  const [spec, setSpec] = useState("");
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  const initialItems = useMemo(() => (hydrated ? getTackleItems() : []), [hydrated]);
  const initialSets = useMemo(() => (hydrated ? getTackleSets() : []), [hydrated]);
  const items = itemsOverride ?? initialItems;
  const sets = setsOverride ?? initialSets;

  const updateItems = (next: TackleItem[]) => {
    setItemsOverride(next);
    saveTackleItems(next);
  };
  const updateSets = (next: TackleSet[]) => {
    setSetsOverride(next);
    saveTackleSets(next);
  };

  const handleAdd = () => {
    if (!name) return;
    updateItems([...items, { id: newId(), category, name, spec: spec || undefined }]);
    setName("");
    setSpec("");
  };

  const handleDeleteItem = (id: string) => {
    if (!confirm("このタックルを削除しますか?")) return;
    updateItems(items.filter((i) => i.id !== id));
    updateSets(
      sets.map((s) => ({ ...s, itemIds: s.itemIds.filter((iid) => iid !== id) }))
    );
  };

  const handleAddSet = () => {
    const set: TackleSet = {
      id: newId(),
      name: `セット${sets.length + 1}`,
      itemIds: [],
      isCurrent: sets.length === 0,
    };
    updateSets([...sets, set]);
    setEditingSetId(set.id);
  };

  const handleSetCurrent = (id: string) => {
    updateSets(sets.map((s) => ({ ...s, isCurrent: s.id === id })));
  };

  const handleToggleItemInSet = (setId: string, itemId: string) => {
    updateSets(
      sets.map((s) =>
        s.id === setId
          ? {
              ...s,
              itemIds: s.itemIds.includes(itemId)
                ? s.itemIds.filter((i) => i !== itemId)
                : [...s.itemIds, itemId],
            }
          : s
      )
    );
  };

  const handleDeleteSet = (id: string) => {
    if (!confirm("このセットを削除しますか?")) return;
    updateSets(sets.filter((s) => s.id !== id));
  };

  const inputCls =
    "w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base dark:border-ocean-800 dark:bg-navy dark:text-white";

  return (
    <main>
      <Header title="タックル管理" />
      <div className="space-y-4 p-4">
        {/* 現在のタックルセット */}
        <section className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">🧰 タックルセット</h2>
            <button
              onClick={handleAddSet}
              className="rounded-xl bg-ocean-600 px-4 py-2 text-base font-bold text-white"
            >
              + セット追加
            </button>
          </div>
          <ul className="mt-2 space-y-3">
            {sets.map((set) => (
              <li
                key={set.id}
                className={`rounded-xl border-2 p-3 ${
                  set.isCurrent
                    ? "border-ocean-500 bg-ocean-50 dark:bg-ocean-900"
                    : "border-slate-200 dark:border-ocean-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  {editingSetId === set.id ? (
                    <input
                      className={inputCls}
                      value={set.name}
                      onChange={(e) =>
                        updateSets(
                          sets.map((s) =>
                            s.id === set.id ? { ...s, name: e.target.value } : s
                          )
                        )
                      }
                    />
                  ) : (
                    <p className="text-lg font-extrabold">
                      {set.name}
                      {set.isCurrent && (
                        <span className="ml-2 rounded-md bg-ocean-600 px-2 py-0.5 text-xs font-bold text-white">
                          使用中
                        </span>
                      )}
                    </p>
                  )}
                  <div className="flex shrink-0 gap-1.5">
                    {!set.isCurrent && (
                      <button
                        onClick={() => handleSetCurrent(set.id)}
                        className="rounded-lg bg-ocean-100 px-3 py-1.5 text-sm font-bold text-ocean-800 dark:bg-ocean-900 dark:text-ocean-200"
                      >
                        使用する
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setEditingSetId(editingSetId === set.id ? null : set.id)
                      }
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold dark:bg-navy"
                    >
                      {editingSetId === set.id ? "完了" : "編集"}
                    </button>
                  </div>
                </div>
                <ul className="mt-2 space-y-1 text-base">
                  {set.itemIds.length === 0 && editingSetId !== set.id && (
                    <li className="text-slate-500 dark:text-slate-400">
                      タックル未登録(編集から追加)
                    </li>
                  )}
                  {items
                    .filter((i) => set.itemIds.includes(i.id))
                    .map((i) => (
                      <li key={i.id}>
                        {CATEGORY_ICONS[i.category]} {i.name}
                        {i.spec && (
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {" "}
                            ({i.spec})
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
                {editingSetId === set.id && (
                  <div className="mt-2 space-y-1 rounded-lg bg-white p-2 dark:bg-navy">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      セットに入れるタックルを選択:
                    </p>
                    {items.map((i) => (
                      <label key={i.id} className="flex items-center gap-2 py-1 text-base">
                        <input
                          type="checkbox"
                          className="h-5 w-5"
                          checked={set.itemIds.includes(i.id)}
                          onChange={() => handleToggleItemInSet(set.id, i.id)}
                        />
                        {CATEGORY_ICONS[i.category]} {i.name}
                      </label>
                    ))}
                    <button
                      onClick={() => handleDeleteSet(set.id)}
                      className="mt-1 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-300"
                    >
                      セットを削除
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* タックル追加 */}
        <section className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
          <h2 className="text-lg font-bold">タックルを追加</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {TACKLE_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-4 py-2 text-base font-bold ${
                  category === c
                    ? "bg-ocean-600 text-white"
                    : "bg-slate-100 text-slate-700 dark:bg-navy dark:text-slate-200"
                }`}
              >
                {CATEGORY_ICONS[c]} {c}
              </button>
            ))}
          </div>
          <div className="mt-2 space-y-2">
            <input
              className={inputCls}
              placeholder={`${category}名(例: ダイワ ラテオ 86)`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="スペック・メモ(任意)"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
            />
            <button
              onClick={handleAdd}
              disabled={!name}
              className="w-full rounded-xl bg-ocean-600 py-3 text-lg font-bold text-white disabled:opacity-40"
            >
              追加する
            </button>
          </div>
        </section>

        {/* カテゴリー別一覧 */}
        {TACKLE_CATEGORIES.map((c) => {
          const list = items.filter((i) => i.category === c);
          if (list.length === 0) return null;
          return (
            <section key={c} className="rounded-2xl bg-white p-4 shadow dark:bg-navy-light">
              <h2 className="text-lg font-bold">
                {CATEGORY_ICONS[c]} {c}({list.length})
              </h2>
              <ul className="mt-1 divide-y divide-slate-200 dark:divide-ocean-800">
                {list.map((i) => (
                  <li key={i.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-base font-bold">{i.name}</p>
                      {i.spec && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{i.spec}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteItem(i.id)}
                      className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-300"
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
