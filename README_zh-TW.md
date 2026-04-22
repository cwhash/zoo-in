🌐 [English](README.md) | [繁體中文](README_zh-TW.md)

# Life Grid

Life Grid 是一個行動優先的網頁應用程式，以 5×5 棋盤呈現 25 個個人任務。每個任務包含等級、標題、描述和完成狀態，讓使用者能透過簡潔的視覺版面追蹤進度。

## 適用對象

- 想要輕量任務清單、不需安裝 App 的人。
- 偏好依優先等級（S、A、B、C、N）檢視任務的使用者。
- 任何想要快速、單頁、手機友善介面的人。

## 功能

- 在 5×5 格狀版面中檢視全部 25 個任務。
- 一眼掌握各等級任務分佈（S×1、A×2、B×4、C×8、N×10）。
- 透過選單按鈕開啟左側邊欄。
- 展開各任務並編輯標題與描述。
- 以勾選框標記任務完成。
- 完成的任務格會顯示完成日期。

## 介面概覽

- 頂部欄：應用程式標題與選單按鈕。
- 主格狀版面：以等級與編號標示的彩色任務格（例如 `S1`、`A1`、`N10`）。
- 側邊欄：完整任務清單，包含可編輯欄位與完成控制項。

## 技術堆疊

- HTML
- CSS
- JavaScript（原生）

## Firebase 設定

本專案的 `firebase-config.js` 包含 Firebase 設定，包括 Web API 金鑰。

若需更新專案或網域限制，請直接編輯 `firebase-config.js` 並提交更新後的值。

## 本機執行

```bash
git clone https://github.com/cwhash/life-grid.git
cd life-grid
python -m http.server 8000
```

接著在瀏覽器中開啟 `http://localhost:8000`。

## 檔案說明

- `index.html`：頁面結構與核心 UI 容器。
- `styles.css`：視覺主題、版面配置與響應式樣式。
- `script.js`：任務產生、渲染與互動邏輯。
- `README_zh-TW.md`：本檔案（繁體中文版 README）。

## 備註

- 透過 Firebase Authentication 啟用 Google 登入。
- 任務資料儲存於 Firebase Realtime Database，依使用者區隔。

## 登入問題排除

若登入時出現 **「The requested action is invalid.」**，請先檢查以下 Firebase 設定：

1. **Authentication → Sign-in method**：確認已啟用 **Google**。
2. **Authentication → Settings → Authorized domains**：包含目前使用的網域（本機測試需加入 `localhost`）。
3. 若瀏覽器封鎖彈出式登入視窗，請允許此網站的彈出式視窗後重試。
