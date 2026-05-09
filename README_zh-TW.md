# Zoo-In

[English](README.md) | [繁體中文](README_zh-TW.md)

Zoo-In 是以 Firebase 為基礎的活動平台。正式前端是 `client/` 內的 Vue 3 app，build 後部署到 Firebase Hosting：`https://zoo-in.web.app`。

## 目前產品範圍

- 使用 Firebase Authentication 進行 Google 登入。
- Vue 3 + Vite 前端，搭配 Pinia stores 與 Vue Router。
- Firebase Hosting 是正式前端部署目標。
- 管理員後台路由是 `/admin`。
- 活動解鎖使用 Spark 免費方案可支援的 Realtime Database hash lookup。
- Life Grid 2027 是第一個活動。
- Life Grid 任務完成需要上傳裁切後的 4:5 JPEG 照片到 Firebase Storage。
- Life Grid 有活動專屬的隱藏成就與公開動態。

## Firebase 結構

主要 Realtime Database 路徑：

```txt
users/{uid}/profile
users/{uid}/activity_unlocks/{activity_id}
users/{uid}/activities/{activity_id}/tasks/{task_id}
users/{uid}/achievements/{activity_id}/{achievement_id}
activity_registry/{activity_id}
activity_data/{activity_id}
activities/{activity_id}
activity_code_hashes/{code_hash}
activity_join_counters/{activity_id}
activity_codes/{activity_id} (legacy/admin only)
activity_feeds/{activity_id}/{feed_id}
submissions/{activity_id}/{uid}/{task_id}
admins/{uid}
```

任務照片 Storage 路徑：

```txt
submissions/{activity_id}/{uid}/{task_id}.jpg
```

## Functions 狀態

Spark 免費方案的部署流程不部署 Cloud Functions。`functions/` 目錄保留為 legacy callable 原始碼，供後續維護參考。

目前前端仍透過 Vue activity store 呼叫既有 callable Functions，支援任務完成與部分管理員操作：

- `completeTask`
- `adminUpdateNTask`
- `adminResetTaskCompletion`
- `adminDeleteUserData`

活動代碼解鎖已不再使用 legacy `unlockActivity` callable。現在會在瀏覽器端將輸入代碼 hash 後，查詢 Realtime Database 的 `activity_code_hashes/{code_hash}`。

## 本機執行

```bash
cd client
npm ci
npm run dev
```

若要測試 Google 登入，請在 Firebase Authentication 的 authorized domains 加入 `localhost`。

## Build

```bash
cd client
npm run build
```

正式 build 會產生在 `client/dist`。

## 部署

部署由 GitHub Actions 處理：

- Firebase Hosting 會 build `client/` 並發布 `client/dist`。
- Firebase Database Rules 部署 `database.rules.json`。

GitHub Pages 部署已移除。Firebase Hosting 是正式前端。Spark 免費方案刻意不部署 Cloud Functions。

可用的指定部署指令：

```bash
firebase deploy --only hosting
firebase deploy --only database
```

第一位管理員需要手動加入 Realtime Database：

```txt
admins/{uid}: true
```

## 檔案說明

- `client/`：Vue 3 前端 app。
- `client/src/router/`：路由設定，包含 `/admin`。
- `client/src/stores/`：與 Firebase 串接的 app state。
- `client/src/components/`：共用 UI 與 Life Grid components。
- `firebase.json`：Firebase Hosting 與 rules 設定。
- `database.rules.json`：Realtime Database rules。
- `storage.rules`：Firebase Storage rules。
- `functions/index.js`：legacy Cloud Functions 原始碼，不由 Spark 免費方案 workflow 部署。
