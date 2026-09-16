#!/bin/sh
# 南予釣行ナビを GitHub Pages に公開する。
# 静的サイトとしてビルドし、out/ の中身を gh-pages ブランチへ送る。
# gh-pages は公開専用のブランチなので、毎回まるごと置き換える。
set -eu

cd "$(dirname "$0")/.."
REPO_URL=$(git remote get-url origin)
# https://<user>.github.io/<repo>/ で公開するため、リポジトリ名をサブパスにする
REPO_NAME=$(basename "$REPO_URL" .git)

rm -rf out
NEXT_PUBLIC_BASE_PATH="/$REPO_NAME" npx next build
# Jekyll に _next フォルダを無視させない
touch out/.nojekyll

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cp -R out/. "$TMP"
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy 南予釣行ナビ ($(date '+%Y-%m-%d %H:%M'))" \
  -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push -q -f "$REPO_URL" gh-pages
echo "公開しました: https://$(echo "$REPO_URL" | sed -E 's#.*github.com[:/]([^/]+)/.*#\1#').github.io/$REPO_NAME/"
