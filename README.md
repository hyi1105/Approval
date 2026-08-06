# Approval

公司簽核：紙本風純文字表單＋JSON 欄位引擎＋簽名流水線＋類 LINE 對話室＋依身分顯示隱私欄。  
現行進度見 **[學習約定.md](./學習約定.md) §4A**；欄位範例見 [`schema/form-schema.example.json`](./schema/form-schema.example.json)。

## 系統地圖 Skill（一眼看懂任意系統）

遇到陌生系統、要查「表在哪／欄怎麼來／誰能編／改來源會炸哪」時，用 Cursor Skill **`/system-map`**：

| 項目 | 路徑 |
|------|------|
| Skill 說明 | [`.cursor/skills/system-map/SKILL.md`](./.cursor/skills/system-map/SKILL.md) |
| JSON schema | [`schema/system-map/system-map.schema.json`](./schema/system-map/system-map.schema.json) |
| 離職單範例 | [`schema/system-map/resignation.example.json`](./schema/system-map/resignation.example.json) |
| 一眼圖頁 | [`docs/system-map/`](./docs/system-map/index.html) |
| 角色×情境模擬 | [`docs/system-map/sim.html`](./docs/system-map/sim.html)（地圖位置固定，只改顏色） |

地圖骨架固定 **12345（3＝資料家主錨）**：故事 → 角色流程 → 表與欄位血緣 → 權限瀑布 → 變更衝擊。

## 假畫面（Teams 風格）

- 本機／預覽：打開 [`docs/index.html`](./docs/index.html)
- 系統一眼圖：[`docs/system-map/index.html`](./docs/system-map/index.html)
- 公開頁（合併到 `main` 並啟用 GitHub Pages 後）：`https://hyi1105.github.io/Approval/`
- 部署：`.github/workflows/pages.yml`（推 `main` 時把 `docs/` 發上 Pages）

倉庫設定若尚未開 Pages：Settings → Pages → Build and deployment → Source 選 **GitHub Actions**。

## 約定檔（請先讀）

- **[給其他Agent的學習法簡報.md](./給其他Agent的學習法簡報.md)** — **可整份複製給任何 Agent** 的快速學習法（含最短可貼版）。
- **[學習約定.md](./學習約定.md)** — 完整規則＋目前課程進度；AI 回覆前應先閱讀此檔。
- **[.cursor/rules/user-learning-agreements.mdc](./.cursor/rules/user-learning-agreements.mdc)** — Cursor Agent 強制套用的規則摘要。

有新約定時，請更新上述檔案並提交，以 GitHub 版本為準。
