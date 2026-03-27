# 🗺️ Life Grid｜人生任務格

**以手機為主的 5×5 任務面板，共 25 個編號任務。**

## ✨ 專案簡介

Life Grid 是一個輕量化的手機優先網頁。主畫面提供 **5×5 宮格**，任務編號為 **1～25**。點擊左上角的三條線（漢堡）圖示可開啟側邊欄，查看每個任務的詳細說明。

## 🚀 功能特色

- 📱 **手機優先版面**，針對小螢幕優化
- 🔢 **5×5 任務宮格**，共 1～25 號任務
- ☰ **左上角漢堡選單**，快速開啟任務資訊
- 📋 **側邊欄詳細說明**，完整列出所有任務
- 🌐 **英文 README + 繁體中文翻譯**（`readme_zh.md`）

## 🔐 登入驗證

- 登入畫面支援 **帳號密碼登入**。
- 可使用帳號：
  - **測試帳號**：帳號/Email `test`、密碼 `test`（僅供預覽）
- 仍可使用 Supabase 的 Email/密碼帳號進行一般資料同步登入。

## 🌍 GitHub Pages 部署

本專案已包含 `.github/workflows/deploy-pages.yml`，每次 push 到 `main` 都會自動部署靜態檔案到 GitHub Pages。

1. 進入 **Settings → Pages**。
2. 在 **Build and deployment → Source** 選擇 **GitHub Actions**。
3. push 到 `main`，等待 **Deploy static site to GitHub Pages** workflow 完成。

> 若你先前看到壞掉的頁面，將 Pages 來源切換成 **GitHub Actions** 通常可修正。

## 🛠️ 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | HTML / CSS / JavaScript |

## 📦 啟動方式

```bash
git clone https://github.com/cwhash/life-grid.git
cd life-grid
python -m http.server 8000
```

瀏覽器開啟 `http://localhost:8000` 即可使用。
