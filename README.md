# 🗺️ Life Grid

**A mobile-first 5×5 mission board with 25 numbered tasks.**

## ✨ Overview

Life Grid is a lightweight web experience designed for mobile users. The home screen shows a **5×5 grid** with tasks numbered **1 to 25**. Tap the hamburger icon at the top-left to open a sidebar and read each task's detailed description.

## 🚀 Features

- 📱 **Mobile-first layout** optimized for phone screens
- 🔢 **5×5 mission grid** with tasks 1–25
- ☰ **Hamburger menu** in the top-left corner
- 📋 **Sidebar task details** for all missions
- 🌐 **English README + Traditional Chinese translation** (`readme_zh.md`)

## 🔐 Authentication

- Login flow has been **temporarily removed**.
- Users now enter the main Life Grid directly without signing in.
- This project is preparing to migrate auth/data features to **Firebase** in a later update.

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
