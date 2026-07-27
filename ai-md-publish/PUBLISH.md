# 發布到 AI_MD（待授權）

本目錄是要寫進 [hyi1105/AI_MD](https://github.com/hyi1105/AI_MD) 的完整變更包。

Cloud Agent 目前對 `AI_MD` **沒有 push 權限**（`cursor[bot]` 403），所以無法直接上線到
https://hyi1105.github.io/AI_MD/ 。請擇一：

## A. 給 Agent 寫入權限後再說「繼續發布」

在 GitHub → `AI_MD` → Settings → Collaborators，或讓 Cursor Cloud Agent 環境能存取此 repo。

## B. 本機一鍵套用

```bash
git clone https://github.com/hyi1105/AI_MD.git
cd Approval   # 本倉庫
chmod +x ai-md-publish/apply-to-ai-md.sh
./ai-md-publish/apply-to-ai-md.sh ../AI_MD
# 再把分支合併進 main 以觸發 Pages
```

## C. 用 patch

```bash
cd AI_MD
git apply ../Approval/ai-md-trip-tool.patch
# 或：git am < ../Approval/ai-md-trip-tool.patch
```

## 變更摘要

- 首頁新增「功能選擇」標籤與按鈕：**環島路線工具**
- 新增 `web/trip-tool/` 地圖路線工具
- `query.html` / `tool.html` 導覽加入「環島路線」
- 更新 checklist／README／idea.history
