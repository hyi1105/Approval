# Approval

公司簽核：紙本／Teams 風表單＋JSON 欄位引擎＋簽名流水線＋類 LINE 對話＋雙層儲存。  
**現行執行 Agent：SEED** — 請先讀 [`給SEED的交接簡報.md`](./給SEED的交接簡報.md)。  
進度見 [`學習約定.md`](./學習約定.md) §4A；schema 見 [`schema/form-schema.example.json`](./schema/form-schema.example.json)。

## 假畫面（本機開啟，不依賴 GitHub Pages）

使用者帳號**無法開 GitHub Pages**（設定權限／隱私限制）。請改：

```bash
cd docs && python3 -m http.server 8765
# 瀏覽器開 http://127.0.0.1:8765/
```

或直接開啟 [`docs/index.html`](./docs/index.html)。  
替代公開：Cloudflare Pages／Netlify／Vercel 連本倉庫（若有可授權帳號）。  
倉庫內仍保留 `.github/workflows/pages.yml`，有權限時可再用。

## 約定檔

- **[給SEED的交接簡報.md](./給SEED的交接簡報.md)** — **SEED 必讀**（含可貼開場）。
- **[給其他Agent的學習法簡報.md](./給其他Agent的學習法簡報.md)** — 學習法精簡版。
- **[學習約定.md](./學習約定.md)** — 完整規則＋進度。
- **[.cursor/rules/user-learning-agreements.mdc](./.cursor/rules/user-learning-agreements.mdc)** — Cursor 強制規則摘要。

有新約定時更新上述檔案並提交，以 GitHub 版本為準。
