"use client";

import Link from "next/link";

export default function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-[900] flex items-center justify-between bg-navy px-4 py-3 text-white shadow-md">
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="flex gap-2">
        <Link
          href="/tackle"
          aria-label="タックル管理"
          className="rounded-lg bg-navy-light px-3 py-1.5 text-lg"
        >
          🧰
        </Link>
        <Link
          href="/settings"
          aria-label="設定"
          className="rounded-lg bg-navy-light px-3 py-1.5 text-lg"
        >
          ⚙️
        </Link>
      </div>
    </header>
  );
}
