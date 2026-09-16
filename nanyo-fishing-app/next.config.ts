import type { NextConfig } from "next";

// GitHub Pages などのサブパス(例: /-)で公開するときは NEXT_PUBLIC_BASE_PATH を渡す。
// ローカル開発(npm run dev)では空のまま動く。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // サーバーを持たない静的サイトとして書き出す(スマホからは PWA として使う)
  output: "export",
  // /map -> /map/index.html として出力し、静的ホスティングでそのまま開けるようにする
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
