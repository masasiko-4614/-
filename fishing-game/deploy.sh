#!/bin/sh
# 南予 堤防釣りを GitHub Pages に公開する。
# ゲームのファイルだけを gh-pages ブランチへ送る（毎回まるごと置き換える）。
set -eu

cd "$(dirname "$0")"
REPO_URL="https://github.com/masasiko-4614/nanyo-fishing-game.git"
FILES="index.html manifest.json sw.js icon.svg icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cp $FILES "$TMP"
touch "$TMP/.nojekyll"
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy 南予 堤防釣り ($(date '+%Y-%m-%d %H:%M'))" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q -f "$REPO_URL" gh-pages
echo "公開しました: https://masasiko-4614.github.io/nanyo-fishing-game/"
