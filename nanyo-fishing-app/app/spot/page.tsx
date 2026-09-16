import { Suspense } from "react";
import Header from "@/components/Header";
import SpotDetail from "./SpotDetail";

// 釣り場 ID はクエリ(?id=...)で受け取る。useSearchParams は Suspense の内側で使う。
export default function SpotPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header title="釣り場詳細" />
          <p className="p-4 text-center text-slate-500">読み込み中…</p>
        </>
      }
    >
      <SpotDetail />
    </Suspense>
  );
}
