<div align="center">

<!-- Language Switch -->
<a href="#english-version"><img src="https://img.shields.io/badge/🌐_English-blue?style=for-the-badge"></a>
<a href="#chinese-version"><img src="https://img.shields.io/badge/🌐_中文-red?style=for-the-badge"></a>

</div>

---

<a name="english-version"></a>

<div align="center">

# 🗺️ Life Grid

**A mobile-first 5×5 mission board with 25 numbered tasks.**

</div>

## ✨ Overview

Life Grid is a lightweight web experience designed for mobile users. The home screen shows a **5×5 grid** with tasks numbered **1 to 25**. Tap the hamburger icon at the top-left to open a sidebar and read each task's detailed description.

## 🚀 Features

- 📱 **Mobile-first layout** optimized for phone screens
- 🔢 **5×5 mission grid** with tasks 1–25
- ☰ **Hamburger menu** in the top-left corner
- 📋 **Sidebar task details** for all missions
- 🌐 **Bilingual README** (English + Traditional Chinese)


## 🔐 Authentication (Demo)

- Login screen supports **account/password** and a **Google login demo button**.
- A seeded backend demo user is available as **No.1 user**.
- Stored values are SHA-256 hashes:
  - Account hash: `e058108d007bba71d20a52053fa5efe9144ac6d2f48757368ff653ea5da68e47`
  - Password hash: `53e0bf8c098f31212bf5298bc6a47d026684332081b196156c9c5c79218d28c8`

## 🌍 GitHub Pages Deployment

This repo includes a workflow at `.github/workflows/deploy-pages.yml` that deploys the static files to GitHub Pages on every push to `main`.

1. Go to **Settings → Pages**.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Push to `main`, then wait for the **Deploy static site to GitHub Pages** workflow to finish.

> If your site previously showed a broken page, switching Pages source to **GitHub Actions** usually fixes it.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML / CSS / JavaScript |

## 📦 Getting Started

```bash
git clone https://github.com/cwhash/life-grid.git
cd life-grid
python -m http.server 8000
```

Open `http://localhost:8000` in your browser.

---

<a name="chinese-version"></a>

<div align="center">

# 🗺️ Life Grid｜人生任務格

**以手機為主的 5×5 任務面板，共 25 個編號任務。**

</div>

## ✨ 專案簡介

Life Grid 是一個輕量化的手機優先網頁。主畫面提供 **5×5 宮格**，任務編號為 **1～25**。點擊左上角的三條線（漢堡）圖示可開啟側邊欄，查看每個任務的詳細說明。

## 🚀 功能特色

- 📱 **手機優先版面**，針對小螢幕優化
- 🔢 **5×5 任務宮格**，共 1～25 號任務
- ☰ **左上角漢堡選單**，快速開啟任務資訊
- 📋 **側邊欄詳細說明**，完整列出所有任務
- 🌐 **README 雙語內容**（英文 + 繁體中文）


## 🔐 登入驗證（示範）

- 登入畫面支援 **帳號密碼登入** 與 **Google 登入示範按鈕**。
- 內建一位後台示範帳號，登入後顯示為 **No.1 用戶**。
- 儲存值為 SHA-256 雜湊：
  - 帳號 hash：`e058108d007bba71d20a52053fa5efe9144ac6d2f48757368ff653ea5da68e47`
  - 密碼 hash：`53e0bf8c098f31212bf5298bc6a47d026684332081b196156c9c5c79218d28c8`

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

---

<div align="center">
<sub>Made with ❤️ by cwhash</sub>
</div>
