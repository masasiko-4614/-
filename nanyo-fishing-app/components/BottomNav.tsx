"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/forecast", label: "予報", icon: "📈" },
  { href: "/map", label: "マップ", icon: "🗺️" },
  { href: "/record", label: "釣果", icon: "🎣" },
  { href: "/menu", label: "メニュー", icon: "☰" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-[1000] border-t border-ocean-800 bg-navy text-white">
      <div className="mx-auto flex max-w-2xl">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-bold ${
                active ? "text-sky-300" : "text-slate-300"
              }`}
            >
              <span className="text-2xl leading-none" aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
