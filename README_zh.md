# Zoo-In

[English](README.md) | [繁體中文](README_zh.md)

Zoo-In 是以 Firebase 為基礎的活動平台。正式前端是 `client/` 內的 Vue 3 app，建置後部署到 Firebase Hosting：`https://zoo-in.web.app`。

## 目前產品範圍

- 使用 Firebase Authentication 的同分頁 redirect flow 進行 Google 登入，不使用 popup 登入。
- 前端使用 Vue 3 + Vite，搭配 Pinia stores 與 Vue Router。
- Firebase Hosting 是正式前端。
- 管理員後台網址是 `/admin`。
- Cloud Functions 是可信後端，負責活動解鎖、任務完成、成就、feed 與後台管理操作。
- Life Grid 2027 是第一個活動。
- Life Grid 任務完成需要上傳裁切後的 4:5 JPEG 照片到 Firebase Storage。
- Life Grid 有活動專屬隱藏成就與公開動態牆。

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

## Cloud Functions

專案已升級 Firebase Blaze，Cloud Functions 是正式後端。Callable Functions 部署在 `asia-southeast1`，並設定 `maxInstances: 3`，不設定 warm instances。

正式部署的 callable Functions：

- `unlockActivity`
- `completeTask`
- `adminUpdateActivityCode`
- `adminUpdateNTask`
- `adminResetTaskCompletion`
- `adminDeleteUserData`

活動代碼不放在前端程式碼。管理員在 `/admin` 設定代碼後，後端會正規化並轉成 SHA-256 hash，寫入 `activity_code_hashes/{code_hash}`，並用 transaction 限制 Life Grid 最多 999 人。

## 本機開發

```bash
cd client
npm ci
npm run dev
```

Google 登入使用 Firebase redirect sign-in，會在同一個瀏覽器分頁完成流程，並要求 Google 每次顯示帳號選擇器。在 Firebase Hosting 網域上，前端會把 `authDomain` 設為目前 hosting 網域，讓 auth helper 以同站方式運作。如果需要在本機測 Google 登入，請在 Firebase Authentication authorized domains 加入 `localhost`。

## 建置

```bash
cd client
npm run build
```

正式 build 會輸出到 `client/dist`。

## 部署

部署由 GitHub Actions 處理：

- Firebase Hosting：建置 `client/` 並發布 `client/dist`。
- Firebase Database Rules：部署 `database.rules.json`。
- Firebase Functions：只有後端檔案變更時才部署 `functions/`。

GitHub Pages 部署已移除，Firebase Hosting 是正式前端。

常用的指定部署指令：

```bash
firebase deploy --only hosting
firebase deploy --only database
npx firebase-tools@latest deploy --only functions --project zoo-in --non-interactive
```

第一位管理員需要手動在 Realtime Database 新增：

```txt
admins/{uid}: true
```

## 費用控制

Firebase 專案已升級 Blaze。Google Cloud Budget Alert 已設定，Functions 使用 `maxInstances: 3` 降低費用暴衝風險。Budget Alert 只會通知，不會硬性停止帳單，因此仍需要限制 API key 並在部署後觀察用量。

## 檔案說明

- `client/`：Vue 3 前端 app。
- `client/src/router/`：路由，包含 `/admin`。
- `client/src/stores/`：Firebase-backed app state。
- `client/src/components/`：共用 UI 與 Life Grid components。
- `functions/index.js`：Firebase Cloud Functions 後端。
- `firebase.json`：Firebase Hosting、Functions 與 rules 設定。
- `database.rules.json`：Realtime Database rules。
- `storage.rules`：Firebase Storage rules。
