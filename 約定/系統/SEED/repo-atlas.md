# Repo 總圖（歸 SEED）

最後更新：2026-08-13  
觸發：談「整理 repo／歸 SEED／AI_MD／Approval 放哪」。  
執行步驟：[`合併執行.md`](./合併執行.md)

## 一句話

**SEED＝總部**；其餘 repo 要嘛併入，要嘛只留轉址。

## 帳號現況（2026-08-13）

| Repo | 角色 | 歸 SEED 後 |
|------|------|------------|
| [hyi1105/SEED](https://github.com/hyi1105/SEED) | **總部**：知識書＋Pages＋`approval/` 可執行＋`memory/` | 繼續擴充；收 `約定/`、`tools/ai-md/` |
| [hyi1105/Approval](https://github.com/hyi1105/Approval) | 簽核構想／模組化 `約定/`（本庫） | 可執行已在 SEED；本庫 → 轉址＋交接後可 archive |
| [hyi1105/AI_MD](https://github.com/hyi1105/AI_MD) | 舊知識書站＋AI Doc（`aidoc/`） | 規格已在 `約定/系統/SEED/`；程式 → SEED `tools/ai-md/` 後 archive |
| [hyi1105/down-the-stairs](https://github.com/hyi1105/down-the-stairs) | 娛樂小遊戲 | **只連不併**（避免污染知識庫） |

## 12345（3＝主錨）

```text
1 AI_MD（舊工具／規格）
2 Approval（約定＋簽核構想）
3 SEED（總部／Pages／可執行） ← 主錨
4 知識書＋memory＋棋盤
5 down-the-stairs（外連娛樂）
```

先記 **2↔3↔4**：約定與簽核進 SEED，知識書在 SEED 長出來。

## 目標目錄（SEED 內）

```text
SEED/
├── 約定/                 ← 自 Approval 整包遷入（Agent 入口）
├── approval/             ← 已有；簽核可執行
├── tools/ai-md/          ← 自 AI_MD：aidoc 源碼＋docs 規格＋prompts
│   ├── aidoc/            ← Vite 源碼（不要 web/ 建置大檔）
│   ├── docs/             ← 00-theme／ai-doc／checklist（可與 約定 對齊後瘦身）
│   └── prompts/
├── docs/                 ← Pages（含 approval／walkthrough／seeds.json）
├── memory/               ← 公開筆記
└── README.md             ← 總入口＋四庫地圖
```

## 真相來源（合併後）

| 內容 | 以誰為準 |
|------|----------|
| Agent 約定／idea／口味 | SEED `約定/` |
| 簽核可執行前端 | SEED `approval/`＋`docs/approval/` |
| AI Doc 程式 | SEED `tools/ai-md/aidoc/` |
| 知識書／棋盤 | SEED `docs/`＋`memory/` |
| 娛樂遊戲 | `down-the-stairs` 獨立 |

## 與舊決策關係

`memory/topics/repo-org-and-token.md`（2026-08-08）寫「先標籤、不要一次大融合」。  
**本次升級：** 目錄地圖＋Approval／AI_MD **真遷入**；遊戲仍分開。
