# Approval Play（行為保真沙盒）

本機開：

```bash
cd play && python3 -m http.server 8765
```

瀏覽器開 `http://localhost:8765/`。

**上線成網站：** 見 [`PUBLISH.md`](./PUBLISH.md)（GitHub Pages 或整包丟到別的靜態庫）。

## 能做什麼

- 沒系統 → **抽出新系統**（欄位＋流水線）
- 有範例「請假簽核」
- 聊天式：送出 → 核准／請填 → 確認；**駁回即結束**
- 換身分只改欄位可編／只看／淡化（座標不搬家）
- 資料存在瀏覽器 `localStorage`（Play，非正式庫）

雙擊左側「狀態」可重置目前案件。
