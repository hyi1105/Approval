# Idea（進行中的構想）

最後更新：2026-08-13  
用途：突發奇想／對話構想 → AI 整理 → **寫這裡**。  
已結案見 [`idea.history.md`](./idea.history.md)。規則見 [`../學習/構想流.md`](../學習/構想流.md)。

### 寫入規則（給 AI）

每則構想必須：

1. 改寫**繁體中文**  
2. 用下方模板（缺的標「待補／待拍板」）  
3. **追加到本檔最上方**  
4. 未上線功能不要發明 checklist 項  

### 模板

```markdown
## YYYY-MM-DD — 短標題
- 狀態：open｜building｜waiting-owner
- 來源：對話／語音（可註關鍵句）
- 為什麼（Why）：
- 做什麼（What）：
- 怎麼做（How）：
- 優點（Pros）：
- 缺點／風險（Cons）：
- 不做的替代方案：
- 完成後可查核的一句（若將來有產品）：
- 待拍板：
```

---

## 2026-08-13 — 全 GitHub repo 整理歸 SEED

- 狀態：building
- 來源：對話「我想把我所有github上的repo, 全部都整理起來到Seed上, 有ai_md approval seed」
- 為什麼（Why）：帳號有多個 repo（SEED／Approval／AI_MD／down-the-stairs），真相來源分散、Agent 開錯庫就接不到完整記憶；要一個總部
- 做什麼（What）：以 **SEED** 為唯一總部；Approval 可執行碼已在 SEED；AI_MD 規格＋程式遷入 SEED；Approval 本庫只留轉址／交接；娛樂小遊戲目錄連過去但不塞程式
- 怎麼做（How）：見 [`../系統/SEED/repo-atlas.md`](../系統/SEED/repo-atlas.md)＋[`../系統/SEED/合併執行.md`](../系統/SEED/合併執行.md)；可貼開場見 `交給SEED/可貼開場.md`。本輪 Agent 僅有 Approval 推送權，先把地圖／約定／交接包寫好
- 優點（Pros）：一個入口、Pages 已在 SEED、約定與產品同庫
- 缺點／風險（Cons）：歷史／CI 遷移成本；AI_MD 大檔（web 建置產物）勿整包塞；需有 SEED 推送權的 Agent 收尾
- 不做的替代方案：維持多庫＋README 互相連（舊 `repo-org-and-token` 第一步）——本次升級為真合併
- 完成後可查核的一句（若將來有產品）：SEED README／棋盤能看到 AI Doc＋Approval＋知識書入口；AI_MD／Approval README 頂部寫「已遷 SEED」
- 待拍板：AI_MD／Approval 是否 archive（預設：合併驗收後再 archive）；down-the-stairs 只連不併（沿用舊偏好）

---

## 2026-08-09 — 自 AI_MD 併入：未結案構想

> 原 repo：`hyi1105/AI_MD`（擬刪）。下列為併入時仍 open／waiting-owner 者。

### 主題／知識書（SEED）

#### 知識書架（瀏覽／發布）
- 狀態：open  
- Why：主題是知識書，沒有書架就只剩工具  
- What：可瀏覽、發布自己的知識書  
- How：新頁面／資料模型；與 AI Doc 銜接（待設計）  
- Pros：產品本體出現  
- Cons：工程量大；權限與儲存  
- 替代：先單頁靜態展示  
- 待拍板：是否優先  

#### 關注產品或 KOL／知識書
- 狀態：open  
- Why：要「長期關注」，不是用完即走  
- What：可關注並回訪看更新  
- How：關注列表＋通知或更新時間（待設計）  
- Pros：回訪動機  
- Cons：多半要帳號  
- 替代：本機追蹤關鍵字（舊站有過）  
- 待拍板：是否要登入  

#### 編排／策展他人內容
- 狀態：open  
- Why：知識可在授權下二次整理  
- What：授權範圍內重新編排  
- How：授權模型＋編排 UI（待設計）  
- Pros：生態  
- Cons：侵權風險  
- 替代：先只允許作者自己編  
- 待拍板：授權條款  

#### 分享連結與權限
- 狀態：open  
- Why：知識書要能傳出去且可控  
- What：連結；公開／部分公開  
- How：權限欄位＋分享 URL  
- Pros：傳播基本盤  
- Cons：外洩／錯設  
- 替代：整本僅本機  
- 待拍板：無帳號時怎麼做權限  

#### 商業：訂閱／解鎖／分成
- 狀態：waiting-owner  
- Why：主題含可商業化，模式未定  
- What：訂閱或單章解鎖或分成之一（待選）  
- How：金流＋後端；純 Pages 不夠  
- Pros：可持續  
- Cons：法務稅務客服  
- 替代：長期免費  
- 待拍板：做不做、哪一種  

### AI Doc

#### 真 LLM API＋費用控管
- 狀態：waiting-owner  
- Why：舊站 AI 側欄是示範，易誤導  
- What：真模型改稿＋額度／失敗處理  
- How：供應商＋金鑰策略（靜態站不能藏 server key）  
- Pros：真助益  
- Cons：費用、濫用、後端  
- 替代：維持標「示範引擎」  
- 待拍板：是否優先  

#### 真 P2P／CRDT／跨裝置
- 狀態：waiting-owner  
- Why：舊站僅示範按鈕  
- What：真連線或永久標示範／弱化入口  
- How：實作或收斂 UI  
- Pros：誠實產品  
- Cons：技術重或顯得縮水  
- 替代：UI 標示範 only  
- 待拍板：是否正式路線  

### 決策

#### 下一季優先：書架 vs AI Doc 真 LLM
- 狀態：waiting-owner  
- Why：資源有限  
- What：選定主軸  
- 待拍板：圈選後改對應項為 building  

#### Repo／網域（原 AI_MD）
- 狀態：building  
- Why：改為「歸 SEED 總部」而非直接刪  
- What：程式遷 SEED `tools/ai-md/`；規格在 `約定/系統/SEED/`；驗收後 archive AI_MD  
- 待拍板：archive 時機（預設：SEED 合併 PR 合入後）  
- 相關：見最上方「2026-08-13 — 全 GitHub repo 整理歸 SEED」
