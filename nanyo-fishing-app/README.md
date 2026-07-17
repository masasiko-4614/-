# 南予釣行ナビ

愛媛県南予(八幡浜・長浜・宇和海・大洲周辺)の海釣りに特化した、釣行判断・釣果記録アプリです。スマートフォンでの利用を想定したレスポンシブ Web アプリ(PWA対応)です。

## 主な機能

- **ホーム** — 今日のおすすめ釣り場・おすすめ度(★1〜5)・風・潮・おすすめ時間帯を大きく表示。前日/翌日の切り替え可能
- **釣り場マップ** — OpenStreetMap + Leaflet。釣り場の詳細(釣れる魚・時期・注意事項)、お気に入り登録、地図長押し(右クリック)で釣り場追加
- **釣果登録** — 魚種チップ選択・匹数ステッパー・写真添付。天気・潮回りは日付から自動入力
- **釣果履歴** — 一覧・魚種絞り込み・削除
- **釣果分析** — 月別/魚種別/釣り場別/潮回り別/時間帯別/ルアー別の集計グラフ(Recharts)と表
- **タックル管理** — ロッド/リール/ライン/リーダー/ルアーの登録、使用中タックルセット管理(初期データ: ダイワ ラテオ 86)
- **設定** — ダークモード、データのバックアップ/復元/削除、API接続状況

### おすすめ度の計算(100点満点)

| 項目 | 配点 |
|---|---|
| 風速 | 25点 |
| 潮の動き(潮回り) | 25点 |
| 時間帯(まづめ・潮の動く時間) | 20点 |
| 天候 | 15点 |
| 過去の釣果実績 | 15点 |

風速10m/s以上や大雨のおそれがある場合は、おすすめ度に関わらず**警告バナー**を表示します。おすすめ度は判断材料であり、釣果・安全を保証するものではありません。

## 起動方法

```bash
npm install
npm run dev
```

http://localhost:3000 をスマートフォンまたはブラウザで開きます。

本番ビルド:

```bash
npm run build
npm start
```

PWA(ホーム画面に追加・オフラインキャッシュ)は本番ビルドで有効になります。

## 環境変数

`.env.example` を `.env.local` にコピーして設定します。**すべて未設定でもサンプルデータで動作します。**

| 変数 | 説明 |
|---|---|
| `NEXT_PUBLIC_WEATHER_API_URL` | Open-Meteo 互換の天気APIエンドポイント。例: `https://api.open-meteo.com/v1/forecast`(APIキー不要)。未設定時は日付から決定的に生成するサンプル天気 |
| `NEXT_PUBLIC_TIDE_API_URL` | 潮汐API(将来の拡張用)。未設定時は月齢からの簡易計算 |
| `NEXT_PUBLIC_MAP_TILE_URL` | 地図タイルURL。未設定時は OpenStreetMap 標準タイル |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 接続情報。未設定時は端末内(localStorage)保存 |

## Supabase の設定方法

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. ダッシュボードの **SQL Editor** で `supabase/schema.sql` の内容を実行(テーブル・RLSポリシー作成)
3. **Project Settings > API** から URL と anon key を取得し、`.env.local` に設定

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

4. 写真をクラウド保存する場合は Storage で `photos` バケットを作成

現在の MVP はデータを端末内(localStorage)に保存します。`lib/storage.ts` がデータアクセス層になっており、`lib/supabase.ts` のクライアントを使って Supabase 版に差し替えられる構成です(スキーマは対応済み)。設定画面の「バックアップを保存/復元」で端末間のデータ移行ができます。

## データについての注意

- 天気・潮汐の値は **サンプル(簡易計算)** です。画面上に「サンプル」バッジで明示しています。日の出・日の入りと潮回り(大潮・中潮など)は天文計算による実用値です
- 実際の釣行前には、気象庁の警報・注意報と正式な潮汐表を必ず確認してください
- サンプル釣り場の座標・情報は目安です。**現地の立入禁止表示・警告が常に優先**です。本アプリはいかなる場所についても安全を保証しません

## 技術構成

- Next.js (App Router) / TypeScript / Tailwind CSS v4
- 地図: OpenStreetMap + Leaflet
- グラフ: Recharts
- DB: Supabase(任意) / localStorage(既定)
- PWA: manifest + Service Worker(本番ビルドのみ)
- ダークモード対応・日本語表示・単位は ℃ / m/s / cm / g

## 開発コマンド

```bash
npm run dev        # 開発サーバー
npm run build      # 本番ビルド(型チェック込み)
npm run lint       # ESLint
npx tsc --noEmit   # 型チェックのみ
```
