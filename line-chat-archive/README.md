# LINE 對話封存（電腦永久保留）

**結論：** 可以把「一個對話」的文字＋照片做成電腦上的離線封存，之後用瀏覽器回看。  
**不能：** 把這包封存完整「還原」回手機 LINE App（官方不支援自訂還原含媒體）。

官方「聊天備份」到 Google Drive／iCloud 多半以**文字**為主，不要指望靠它把照片也完整救回來。要留照片，必須另外把媒體拷到電腦。

## 你會得到什麼

```text
我的封存/
  index.html      ← 用瀏覽器開這個
  media/          ← 照片／影片
  messages.json   ← 結構化紀錄
  README.txt      ← 封存說明
```

## 準備資料（手動，合法、不破解）

1. 在手機打開那則重要對話。
2. **照片／影片：** 長按 → 儲存到相簿 → 用 USB／雲端／隔空投送拷到電腦資料夾，例如 `inbox/media/`。
3. **文字：** 擇一即可  
   - 電腦版 LINE 對照著打／貼到 `messages.txt`  
   - 或依下面格式自己整理一檔  
4. （選用）官方備份只當文字保險，不當成含圖完整備份。

### `messages.txt` 格式（建議）

每行一則，用 Tab 分開：

```text
時間	發言者	內容
2024-05-01 10:00	我	週末要不要出去？
2024-05-01 10:01	小美	好啊
2024-05-01 10:02	小美	[照片: picnic.jpg]
2024-05-01 10:03	我	[影片: clip.mp4]
```

- 照片／影片請寫 `[照片: 檔名]` 或 `[影片: 檔名]`，檔名要和 `media/` 裡的檔一致。  
- 也可用空格對齊的簡易格式（見 `sample/messages.txt`）。

## 怎麼用

需要已安裝 Python 3.10+（Windows／Mac 都可以）。

```bash
cd line-chat-archive
python archive.py --title "和小美的對話" --input sample/messages.txt --media sample/media --out out/demo
```

然後用瀏覽器開啟 `out/demo/index.html`。

只掃媒體、沒有文字檔也可以（會依檔名排成相簿時間軸）：

```bash
python archive.py --title "只留照片" --media 我的照片資料夾 --out out/photos-only
```

## 清手機空間的建議順序

1. 先確認封存 `index.html` 能看、照片都在。  
2. 再把封存複製一份到硬碟／雲端。  
3. 最後才在手機 LINE 刪除該對話或清除快取。  
4. 刪了之後**無法**靠本工具塞回 LINE。

## 不做什麼（刻意）

- 不讀取／不解密 LINE App 內部資料庫  
- 不提供一鍵還原進 LINE  
- 不協助規避官方條款的第三方破解軟體
