# Zoo-In

[English](README.md) | [繁體中文](README_zh-TW.md)

Zoo-In 是一個以 Firebase 為基礎的活動平台。使用者用 Google 登入後，可以管理 Zoo-In 會員資料、輸入活動代碼，並解鎖 Life Grid 2027 這類活動。

## 目前產品範圍

- 使用 Firebase Authentication 做 Google 登入。
- 登入後先進入 Zoo-In 會員活動中心。
- Zoo-In 會員資料會保存公開暱稱。Google 原始姓名與大頭貼只顯示給本人。
- 活動代碼由 Cloud Functions 驗證。
- Life Grid 2027 是第一個活動。
- Life Grid 完成任務時必須上傳 4:5 照片，照片存於 Firebase Storage。
- Life Grid 有獨立的隱藏成就系統。
- Life Grid 活動頁下方顯示最新 10 筆公開動態。
- 管理員後台獨立於 `admin.html`。

## Life Grid 2027 規則

- 活動代碼：`2027-LIFE-GRID`，不分大小寫。
- 活動時間：2026/07/01 到 2027/12/31。
- 使用者可以在開始日前先解鎖活動，但任務填寫與完成仍需等活動開始。
- 活動結束後只能查看紀錄，不能新增或完成任務。
- S/A/B/C 任務由使用者自行填寫，第一次儲存後鎖定。
- N 任務是所有人共用的官方任務，由管理員後台編輯。
- 完成任務需要裁切並上傳 4:5 JPEG 照片。
- 任務照片只允許本人與管理員查看，不公開。
- 使用者不能自行取消完成，管理員可以取消。
- 目前內建第一個成就：
  - 標題：`萬丈高樓平地起`
  - 內文：`傳奇的開始！`
  - 條件：完成第一個任務。

## Firebase 資料結構

主要 Realtime Database 路徑：

```txt
users/{uid}/profile
users/{uid}/activity_unlocks/{activity_id}
users/{uid}/activities/{activity_id}/tasks/{task_id}
users/{uid}/achievements/{activity_id}/{achievement_id}
activities/{activity_id}
activity_codes/{activity_id}
activity_feeds/{activity_id}/{feed_id}
submissions/{activity_id}/{uid}/{task_id}
admins/{uid}
```

任務照片 Storage 路徑：

```txt
submissions/{activity_id}/{uid}/{task_id}.jpg
```

## Cloud Functions

Functions 專案位於 `functions/`。

Callable functions：

- `unlockActivity`：驗證活動代碼、冷卻時間、使用次數，並寫入解鎖資料。
- `completeTask`：檢查活動解鎖與照片上傳，完成任務、寫入公開動態、發放成就。
- `adminUpdateNTask`：管理員編輯官方 N 任務。
- `adminResetTaskCompletion`：管理員取消會員任務完成狀態，並重新檢查成就。
- `adminDeleteUserData`：刪除會員 Zoo-In 資料、提交紀錄、照片、公開動態與成就，但保留 Firebase Auth 帳號。

## 本機執行

```bash
python -m http.server 8000
```

打開 `http://localhost:8000`。

Google 登入需要先在 Firebase Authentication 的 Authorized domains 加入 `localhost`。

## 部署

安裝 Firebase CLI 後部署：

```bash
firebase deploy
```

第一個管理員需要手動在 Realtime Database 加入：

```txt
admins/{uid}: true
```

## 檔案說明

- `index.html`：使用者前台 Zoo-In 與 Life Grid UI。
- `admin.html`：獨立管理員後台。
- `styles.css`：共用樣式。
- `script.js`：前台互動邏輯。
- `admin.js`：後台互動邏輯。
- `database.rules.json`：Realtime Database 規則。
- `storage.rules`：Firebase Storage 規則。
- `functions/index.js`：Cloud Functions。
