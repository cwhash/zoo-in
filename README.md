# Zoo-In

[English](README.md) | [繁體中文](README_zh-TW.md)

Zoo-In is a Firebase-based activity platform. Users sign in with Google, manage a Zoo-In profile, enter an activity code, and unlock activity-specific experiences such as Life Grid 2027.

## Current Product Scope

- Google sign-in through Firebase Authentication.
- Zoo-In member home after login.
- Public nickname stored in Zoo-In profile. Google display name and avatar are shown only to the signed-in user.
- Activity unlock by Cloud Functions.
- Life Grid 2027 as the first activity.
- Life Grid task completion requires a 4:5 photo upload to Firebase Storage.
- Life Grid has hidden, activity-specific achievements.
- Life Grid activity page shows the latest 10 public feed events.
- Separate `admin.html` page for admin tasks.

## Life Grid 2027 Rules

- Activity code: `2027-LIFE-GRID`, case-insensitive.
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
activities/{activity_id}
activity_codes/{activity_id}
activity_feeds/{activity_id}/{feed_id}
submissions/{activity_id}/{uid}/{task_id}
admins/{uid}
```

Storage path for task photos:

```txt
submissions/{activity_id}/{uid}/{task_id}.jpg
```

## Cloud Functions

The Functions project lives in `functions/`.

Callable functions:

- `unlockActivity`: validates the activity code, cooldown, usage limit, and writes unlock data.
- `completeTask`: verifies unlock state and uploaded photo, completes the task, writes the public feed, and unlocks achievements.
- `adminUpdateNTask`: lets admins edit official N tasks.
- `adminResetTaskCompletion`: lets admins cancel a user's task completion and re-check achievements.
- `adminDeleteUserData`: deletes a user's Zoo-In data, submissions, photos, feed entries, and achievements while leaving Firebase Auth intact.

## Run Locally

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

For Google sign-in, add `localhost` in Firebase Authentication authorized domains.

## Deploy

Install Firebase CLI and deploy:

```bash
firebase deploy
```

The first admin must be added manually in Realtime Database:

```txt
admins/{uid}: true
```

## File Guide

- `index.html`: user-facing Zoo-In and Life Grid UI.
- `admin.html`: separate admin UI.
- `styles.css`: shared frontend styles.
- `script.js`: user-facing app behavior.
- `admin.js`: admin page behavior.
- `database.rules.json`: Realtime Database rules.
- `storage.rules`: Firebase Storage rules.
- `functions/index.js`: Cloud Functions.
