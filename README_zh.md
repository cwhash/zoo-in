# Life Grid

Life Grid 是一個以手機優先設計的網頁應用程式，將 25 個個人任務呈現在 5×5 任務面板中。每個任務都包含等級、標題、內容與完成狀態，讓使用者可以用簡單直觀的方式追蹤進度。

## 適用對象

- 想使用輕量任務清單、又不想安裝 App 的使用者。
- 希望依任務等級（S、A、B、C、N）檢視優先順序的人。
- 需要在手機上快速操作單頁介面的使用者。

## 使用者可以做什麼

- 在 5×5 宮格中查看全部 25 個任務。
- 一眼查看任務等級分佈（S×1、A×2、B×4、C×8、N×10）。
- 透過左上角選單按鈕開啟側邊欄。
- 展開每個任務並編輯標題與內容。
- 使用核取方塊將任務標記為完成。
- 在已完成的任務格上看到完成日期標記。

## 介面說明

- 頂部列：應用程式標題與選單按鈕。
- 主任務格：以顏色區分等級，任務代碼如 `S1`、`A1`、`N10`。
- 側邊欄：完整任務清單，可編輯欄位並切換完成狀態。

## 技術堆疊

- HTML
- CSS
- JavaScript（原生）


## Firebase 設定

目前專案的 `firebase-config.js` 已包含此應用程式使用的 Firebase 設定（含 Web API key）。

若你更新了專案設定或可用網域限制，請直接修改 `firebase-config.js` 並提交新版設定。

## 本機執行

```bash
git clone https://github.com/cwhash/life-grid.git
cd life-grid
python -m http.server 8000
```

接著在瀏覽器開啟 `http://localhost:8000`。

## 檔案導覽

- `index.html`：頁面結構與核心 UI 容器。
- `styles.css`：視覺主題、版面配置與響應式樣式。
- `script.js`：任務生成、畫面渲染與互動邏輯。
- `README.md`：本專案英文說明。

## 備註

- 目前已透過 Firebase Authentication 啟用 Google 登入。
- 任務資料會儲存在 Firebase Realtime Database，並依使用者帳號隔離。

## 登入疑難排解

若登入時出現 **"The requested action is invalid."**，請先檢查以下 Firebase 設定：

1. **Authentication → Sign-in method**：確認已啟用 **Google**。
2. **Authentication → Settings → Authorized domains**：確認包含目前使用網域（本機測試請加入 `localhost`）。
3. 若瀏覽器封鎖彈出視窗，請先允許此網站開啟彈出視窗後再重試。
