# 環島行程拼貼模板

把 **6 張照片** + **行程文字** 放進這個模板，就能生出類似「白底黑字標籤疊在 3×2 照片格」的環島紀錄圖。

## 最快用法

```bash
cd trip-collage
pip install -r requirements.txt

# 1) 把照片換成你的（檔名固定）
#    photos/01.jpg … photos/06.jpg

# 2) 改 config.json 的標題與每格文字（已填好你提供的行程）

# 3) 產生圖片
python3 make_collage.py
# 輸出：output/collage.png
```

沒有照片時可先看版型：

```bash
python3 make_collage.py --demo
```

瀏覽器預覽（選圖即時看版面）：用瀏覽器打開 `preview.html`。

## 六張照片怎麼對應

| 檔名 | 位置 | 建議內容 |
|------|------|----------|
| `photos/01.jpg` | 左上 | 出發／第一站合照（可加名字標籤） |
| `photos/02.jpg` | 右上 | 宜蘭／花蓮停靠 |
| `photos/03.jpg` | 左中 | 北回歸線／午餐 |
| `photos/04.jpg` | 右中 | 台東／屏東加油站 |
| `photos/05.jpg` | 左下 | 傍晚加油站 |
| `photos/06.jpg` | 右下 | 夜間／回程 |

支援 `.jpg` / `.png` / `.webp`（改 `config.json` 的 `file` 路徑即可）。

## 怎麼在 Cursor 對話裡把圖給我

任選一種：

1. **直接貼圖**：在聊天視窗一次貼上 6 張（或分批），並標明順序：`01 左上`、`02 右上`…
2. **拖進專案**：把檔案放到 `trip-collage/photos/`，跟我說「用現有 photos 產生」
3. **給檔名對照**：例如  
   `01=群照合照`、`02=加油站`…

同時貼上（或說「用 config 裡的文字」）這類行程即可：

```text
05:00 台北出發
06:00-06:20 北宜坪林7-11 (20分鐘)
…
23:21 到台北
```

標題、日期也可一起改，例如：

```text
日期：2026/07/26
標題：丞恩很久沒環島 18.5 小時
副標：總共 18.5 小時 = 騎乘 14 小時 + 休息 4.5 小時
```

## 改文字（config.json）

- `date` / `title` / `subtitle`：最上方三行白底標籤
- `photos[i].lines`：每格底部 1～2 行行程
- `photos[0].labels`：可選人名標籤，`x`/`y` 為相對座標（0～1）
- `cell_width` / `cell_height`：單格尺寸（預設 900×700）

第一張人名標籤位置若不準，微調：

```json
"labels": [
  { "text": "小黃", "x": 0.18, "y": 0.42 },
  { "text": "丞恩", "x": 0.38, "y": 0.38 }
]
```

## 給 AI 生圖工具的提示詞（備用）

若你要用外部 AI 繪圖／拼貼工具，可貼這段（再附上 6 張參考圖）：

```text
Make a vertical photo collage of a Taiwan motorcycle round-island trip.
Layout: tight 3 rows × 2 columns photo grid, NO gaps between photos.
Overlay a centered header on the top of the collage with three white rectangular banners
with thin black borders and bold black Chinese sans-serif text:
1) date
2) large main title
3) smaller subtitle with total hours breakdown
Each of the 6 photos has a white banner at the bottom with 1–2 lines of bold black itinerary text
(timestamps + place names + rest duration).
Optional small white name tags on people in the first photo.
Chronological daylight → night. Photorealistic collage, not illustration. Exact Chinese text as provided.
```

## 注意

- 本模板用 **Pillow 真實拼圖**，文字位置可控、不會被 AI 亂改字。
- Windows 建議安裝「微軟正黑體」；macOS 會自動找 PingFang；Linux 可用文泉驛／Noto CJK。
