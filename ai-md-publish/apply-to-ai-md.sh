#!/usr/bin/env bash
# 將本目錄內容套用到本機的 AI_MD 倉庫並推到 main（觸發 GitHub Pages）
# 用法：
#   ./apply-to-ai-md.sh /path/to/AI_MD
# 或先 clone：
#   git clone https://github.com/hyi1105/AI_MD.git
#   ./apply-to-ai-md.sh ./AI_MD

set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-}"

if [[ -z "$TARGET" ]]; then
  echo "用法: $0 /path/to/AI_MD"
  exit 1
fi
if [[ ! -d "$TARGET/.git" ]]; then
  echo "錯誤: $TARGET 不是 git 倉庫"
  exit 1
fi

rsync -a --exclude 'apply-to-ai-md.sh' --exclude 'PUBLISH.md' "$ROOT/" "$TARGET/"
cd "$TARGET"
git checkout main
git pull origin main
git checkout -b cursor/trip-tool-on-homepage-eff8 2>/dev/null || git checkout cursor/trip-tool-on-homepage-eff8
git add -A
git status
git commit -m "Publish round-island trip tool on homepage" || echo "（可能沒有新變更）"
git push -u origin cursor/trip-tool-on-homepage-eff8
echo
echo "已推分支。請開 PR 合併到 main，或執行："
echo "  cd $TARGET && git checkout main && git merge cursor/trip-tool-on-homepage-eff8 && git push origin main"
echo
echo "發布後首頁：https://hyi1105.github.io/AI_MD/"
echo "環島工具：https://hyi1105.github.io/AI_MD/trip-tool/"
