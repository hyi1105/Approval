# Approval Play — 怎麼上線成網站

`play/` **整包就是靜態網站**（只需 `index.html`、`styles.css`、`app.js`、favicon）。不用伺服器、不用資料庫；資料在瀏覽器 `localStorage`。

預期網址（本倉已開 GitHub Pages）：  
https://hyi1105.github.io/approval/

---

## A. 本倉 GitHub Pages（建議）

倉庫已設 `build_type: workflow`。合併含 `.github/workflows/deploy-play.yml` 的 PR 到 `main` 後會自動部署 `play/`。

手動重跑：GitHub → Actions → **Deploy Approval Play** → Run workflow。

若第一次沒出現網站：Repo **Settings → Pages**，確認 Source 為 **GitHub Actions**。

---

## B. 推到「另一個資源庫」再發布（你要的路徑）

1. 新建（或既有）可靜態託管的 repo／專案。  
2. 把 **`play/` 裡面的檔案放到該庫根目錄**（不要多一層 `play/` 資料夾，除非你打算用子路徑）。  
   最少需要：

   ```text
   index.html
   styles.css
   app.js
   favicon.svg
   favicon.ico
   ```

3. 依平台開啟靜態網站：

| 平台 | 做法 |
|------|------|
| **GitHub Pages** | Settings → Pages → Deploy from branch → `main` / root（或用 Actions） |
| **Cloudflare Pages** | 接 Git；Build 指令留空；Output directory = `/` |
| **Netlify** | 接 Git；Publish directory = `/`（或拖曳整個資料夾到 Netlify Drop） |
| **Azure Static Web Apps / Vercel** | Framework = 無；根目錄即輸出 |

4. 開網站根路徑即可用（例如 `https://你的帳號.github.io/庫名/`）。

---

## C. 本機預覽

```bash
cd play && python3 -m http.server 8765
# http://localhost:8765/
```

---

## 注意

- 相對路徑已寫好；只要「網站根＝這些檔案」即可。  
- 若必須掛在子路徑（例如 `/approval/play/`），要再加 `<base href="...">` 或改資源路徑——目前設計是**站根部署**。  
- 這是 **Play 沙盒**，不是公司正式 Run（無登入／SharePoint）。
