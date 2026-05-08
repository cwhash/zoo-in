# Zoo-In

[English](README.md) | [繁體中文](README_zh-TW.md)

Zoo-In is a Firebase-based activity platform. Users sign in with Google, manage a Zoo-In profile, enter an activity code, and unlock activity-specific experiences such as Life Grid 2027.

## Current Product Scope

- Google sign-in through Firebase Authentication.
- Zoo-In member home after login.
- Public nickname stored in the Zoo-In profile. Google display name and avatar are shown only to the signed-in user.
- Activity unlock through a Spark/free-plan Realtime Database hash lookup.
- Life Grid 2027 as the first activity.
- Life Grid task completion requires a cropped 4:5 JPEG photo upload to Firebase Storage.
- Life Grid has hidden, activity-specific achievements.
- Life Grid activity page shows the latest 10 public feed events.
- Separate `admin.html` page for admin tasks.

## Life Grid 2027 Rules

- Activity code is configured in the admin backend and is case-insensitive.
- Activity period: July 1, 2026 to December 31, 2027.
- Users can unlock the activity before the start date, but task editing and completion remain locked until the activity opens.
- After the activity ends, users can only view records.
- S/A/B/C tasks are filled by the user and lock after first save.
- N tasks are shared official tasks edited by admins.
- Completing a task requires a cropped 4:5 JPEG photo.
- Uploaded task photos are private to the user and admins.
- Completed tasks cannot be cancelled by users. Admins can reset completion.
- The first bundled achievement is:
  - Title: `萬丈高樓平地起`
  - Description: `傳奇的開始！`
  - Condition: complete the first task.

## Firebase Structure

Main Realtime Database paths:

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

Storage path for task photos:

```txt
submissions/{activity_id}/{uid}/{task_id}.jpg
```

## Functions Status

The Spark/free deployment path does not deploy Cloud Functions. The `functions/` directory is retained as legacy callable source for reference.

Current frontend code still calls existing callable Functions through `js/activities/life-grid/functions-adapter.js` for task completion and some admin operations:

- `completeTask`
- `adminUpdateNTask`
- `adminResetTaskCompletion`
- `adminDeleteUserData`

Activity code unlock no longer uses the legacy `unlockActivity` callable. The current free-plan unlock flow hashes the submitted code in the browser and looks up `activity_code_hashes/{code_hash}` in Realtime Database.

## Run Locally

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

For Google sign-in, add `localhost` in Firebase Authentication authorized domains.

## Deploy

Deployment is handled by GitHub Actions:

- GitHub Pages publishes the static frontend.
- Firebase Hosting publishes the same static frontend.
- Firebase Database Rules deploys `database.rules.json`.

The Spark/free path intentionally does not deploy Cloud Functions. Avoid running a full `firebase deploy` unless the deployment target is explicit.

Useful targeted commands:

```bash
firebase deploy --only hosting
firebase deploy --only database
```

The first admin must be added manually in Realtime Database:

```txt
admins/{uid}: true
```

## File Guide

- `index.html`: user-facing Zoo-In platform shell.
- `admin.html`: separate admin shell.
- `styles.css`: shared frontend styles.
- `script.js`: compatibility entrypoint for the platform module.
- `admin.js`: compatibility entrypoint for the admin module.
- `js/shared/`: shared Firebase and activity-code utilities.
- `js/platform/`: user-facing platform entrypoint.
- `js/admin/`: admin entrypoint.
- `js/activities/life-grid/`: Life Grid activity config and adapters.
- `database.rules.json`: Realtime Database rules.
- `storage.rules`: Firebase Storage rules.
- `functions/index.js`: legacy Cloud Functions source, not deployed by the Spark/free workflow.
