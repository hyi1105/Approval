---
name: system-map
description: >-
  把陌生任意系統解析成「一張圖就看懂」的系統地圖：表在哪、欄位怎麼來、
  誰可看／可編／要填、資料被誰用、故事流程與變更衝擊面。
  在使用者貼表格／截圖／口頭描述陌生系統、問資料來源、欄位權限、
  流程角色、或「若某來源改成 SAP／缺某欄會炸哪」時使用。
  也可手動 /system-map。
---

# System Map（系統地圖 Skill）

目標：人用試算表整理需求很好改；完全不懂的人更需要**一張圖**。  
本 Skill 把任意系統收成可機器讀、可畫圖、可追衝擊的 `system-map` JSON，再輸出直觀視圖。

## 何時啟動

- 使用者要理解陌生系統／平台／簽核／表單
- 貼了類似「表＋欄位＋來源＋故事」的試算表或截圖
- 問：資料存在哪、怎麼來、誰填誰看、被誰用
- 問變更衝擊：例如「人員資訊改由 SAP 提供、若沒部門會怎樣」

## 強制產出骨架（12345 同一畫面，3＝主錨）

回覆與圖都必須對齊這五塊（不要拆成無關小節亂飄）：

```
1 觸發故事／需求（為什麼有這系統）
    ↓
2 角色怎麼走流程（誰在哪一步做什麼）
    ↓
3 資料家 ←── 主錨
      ├─ 表在哪（DB／清單／檔案）
      ├─ 每欄：來源（人工／參照／計算／同步／自動）
      └─ 表與表怎麼連
    ↓
4 欄位權限瀑布（依步驟／角色：可見｜可編｜必填｜使用）
    ↓
5 變更衝擊（改來源／缺欄 → 炸哪些表／欄／步驟）
```

記憶口訣：冰箱（3）是資料家；上面燈（2）是角色流程；燈上鈕（1）是觸發故事；旁箭頭（4）是權限瀑布；下（5）是衝擊水花。

## 工作流程（Agent 必做）

1. **蒐集**：讀使用者貼的表、截圖描述、口頭說明、現有 schema／程式。缺關鍵資訊時最多問 **3** 題（過關用），其餘標 `unknown`／`待補`，不要卡住。
2. **結構化**：寫出符合 `assets/system-map.schema.json` 的 JSON。
3. **落檔**：存到使用者指定路徑，或本 Skill 旁 `assets/<system-id>.json`。範例見 `assets/resignation.example.json`。
4. **驗證**：執行 `python scripts/validate_map.py <json路徑>`。
5. **畫圖**：用 Mermaid（見 `references/output-views.md`）產出至少：
   - 一張「整系統一眼圖」（含 1→5）
   - 資料血緣／ER
   - 角色×步驟流程
   - 欄位權限瀑布（可簡化成關鍵欄）
6. **衝擊**：若使用者問變更，跑 `python scripts/impact_query.py <json> --table <表> --field <欄>` 或依 JSON 的 `lineage` 手動推導，列出受影響表／欄／步驟／角色。
7. **視覺頁／模擬頁**：倉庫內靜態一眼圖與 `sim.html` 已移除；以對話內 Mermaid＋JSON 為主（互動模擬規則仍見 `references/output-views.md` §G）。

語言：一律台灣繁體中文。教學時標明關卡與完成％（見學習約定）。

## 欄位來源（source.kind）標準詞

| kind | 意思 | 例子 |
|------|------|------|
| `auto` | 系統自動產生 | 流水號 ID |
| `manual` | 人工輸入 | 離職原因 |
| `lookup` | 依條件參考他表／他欄 | 姓名下拉連人員主檔 ID；部門依申請人帶入 |
| `api_sync` | 外部系統同步 | HR API／SAP |
| `computed` | 計算而來 | 天數＝結束−開始 |
| `derived_permission` | 依登入身分／權限決定可寫內容 | 只能填自己、多部門可選 |

每個欄位還要盡量填：

- `filled_by`：誰負責填
- `visible_to` / `editable_by`：誰看／誰編（可依 `steps` 再細）
- `consumed_by`：後來誰／哪一步／哪系統使用
- `source.from` + `source.condition`：參照哪裡、什麼條件

## 輸出給使用者時的順序

1. **一句結論**：這系統在幹嘛  
2. **一張整圖**（Mermaid，12345）  
3. **資料家摘要**（表在哪＋關鍵欄來源）  
4. **權限瀑布**（只列會影響判斷的欄）  
5. **若有變更問題 → 衝擊清單**（缺什麼會壞什麼）  
6. **JSON 路徑**（方便之後增減需求＝改表）

詳細視圖樣板見 `references/output-views.md`。  
訪談清單見 `references/interview-checklist.md`。  
衝擊推導規則見 `references/impact-analysis.md`。

## 與本倉庫 Approval 的關係

Approval 紙本簽核的欄位 schema（`schema/form-schema.example.json`）是「單一表單引擎」視角。  
本 Skill 是上一層：**跨表、跨來源、跨角色、跨平台**的系統地圖。  
分析 Approval 或離職單時，兩者可並存：form-schema 管畫面欄位；system-map 管全貌與衝擊。
