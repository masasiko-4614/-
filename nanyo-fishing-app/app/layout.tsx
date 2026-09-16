import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import RegisterSW from "@/components/RegisterSW";
import { withBase } from "@/lib/paths";

export const metadata: Metadata = {
  title: "南予釣行ナビ",
  description: "愛媛県南予の海釣り 釣行判断・釣果記録アプリ",
  manifest: withBase("/manifest.json"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "南予釣行ナビ",
  },
  icons: {
    icon: withBase("/icon.svg"),
    // iPhone のホーム画面は SVG を使えないので PNG を渡す
    apple: withBase("/apple-touch-icon.png"),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b1f3f",
};

const themeInit = `
try {
  const t = localStorage.getItem("nanyo:theme");
  if (t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">
        <div className="mx-auto w-full max-w-2xl flex-1 pb-24">{children}</div>
        <BottomNav />
        <RegisterSW />
      </body>
    </html>
  );
}
