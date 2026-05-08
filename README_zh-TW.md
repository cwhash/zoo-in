# Zoo-In

[English](README.md) | [繁體中文](README_zh-TW.md)

Zoo-In 是以 Firebase 為基礎的活動平台。使用者透過 Google 登入、維護 Zoo-In 個人資料、輸入活動代碼，並解鎖 Life Grid 2027 這類活動體驗。

## 目前產品範圍

- 使用 Firebase Authentication 進行 Google 登入。
- 登入後進入 Zoo-In 會員首頁。
- Zoo-In profile 會保存公開暱稱；Google 顯示名稱與頭像只顯示給本人。
- 活動解鎖使用 Spark 免費方案可支援的 Realtime Database hash lookup。
- Life Grid 2027 是第一個活動。
- Life Grid 任務完成需要上傳裁切後的 4:5 JPEG 照片到 Firebase Storage。
- Life Grid 有活動專屬的隱藏成就。
- Life Grid 活動頁顯示最新 10 筆公開動態。
- 管理員功能放在獨立的 `admin.html`。

## Life Grid 2027 規則

- 活動代碼由管理員後台設定，不區分大小寫。
- 活動期間：2026/07/01 到 2027/12/31。
- 使用者可以在活動開始前先解鎖活動，但任務編輯與完成要等活動開始後才能操作。
- 活動結束後，使用者只能查看紀錄。
- S/A/B/C 任務由使用者填寫，第一次儲存後鎖定。
- N 任務是由管理員維護的官方任務。
- 完成任務需要一張裁切後的 4:5 JPEG 照片。
- 任務照片只有本人與管理員可看。
- 已完成任務不能由使用者自行取消；管理員可重置完成狀態。
- 第一個內建成就：
  - 名稱：`萬丈高樓平地起`
  - 說明：`傳奇的開始！`
  - 條件：完成第一個任務。

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

Spark 免費方案的部署流程不部署 Cloud Functions。`functions/` 目錄會保留為 legacy callable 原始碼，供後續維護參考。

目前前端仍透過 `js/activities/life-grid/functions-adapter.js` 呼叫既有 callable Functions，支援任務完成與部分管理員操作：

- `completeTask`
- `adminUpdateNTask`
- `adminResetTaskCompletion`
- `adminDeleteUserData`

活動代碼解鎖已不再使用 legacy `unlockActivity` callable。現在的免費方案流程會在瀏覽器端將輸入代碼 hash 後，查詢 Realtime Database 的 `activity_code_hashes/{code_hash}`。

## 本機執行

```bash
python -m http.server 8000
```

開啟 `http://localhost:8000`。

若要測試 Google 登入，請在 Firebase Authentication 的 authorized domains 加入 `localhost`。

## 部署

部署由 GitHub Actions 處理：

- GitHub Pages 發布靜態前端。
- Firebase Hosting 發布同一份靜態前端。
- Firebase Database Rules 部署 `database.rules.json`。

Spark 免費方案刻意不部署 Cloud Functions。除非明確指定部署目標，否則不要執行完整 `firebase deploy`。

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

- `index.html`：使用者端 Zoo-In 平台 shell。
- `admin.html`：獨立管理員 shell。
- `styles.css`：共用前端樣式。
- `script.js`：平台 module 的相容入口。
- `admin.js`：後台 module 的相容入口。
- `js/shared/`：共用 Firebase 與活動代碼工具。
- `js/platform/`：使用者端平台入口。
- `js/admin/`：管理員入口。
- `js/activities/life-grid/`：Life Grid 活動設定與 adapters。
- `database.rules.json`：Realtime Database rules。
- `storage.rules`：Firebase Storage rules。
- `functions/index.js`：legacy Cloud Functions 原始碼，不由 Spark 免費方案 workflow 部署。
