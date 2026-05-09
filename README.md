# Zoo-In

[English](README.md) | [繁體中文](README_zh-TW.md)

Zoo-In is a Firebase-based activity platform. The production frontend is a Vue 3 app built from `client/` and deployed to Firebase Hosting at `https://zoo-in.web.app`.

## Current Product Scope

- Google sign-in through Firebase Authentication.
- Vue 3 + Vite frontend with Pinia stores and Vue Router.
- Firebase Hosting is the production frontend target.
- Admin backend route is `/admin`.
- Activity unlock uses the Spark/free-plan Realtime Database hash lookup flow.
- Life Grid 2027 is the first activity.
- Life Grid task completion requires a cropped 4:5 JPEG photo upload to Firebase Storage.
- Life Grid has hidden, activity-specific achievements and a public feed.

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

Current frontend code still calls existing callable Functions through the Vue activity store for task completion and some admin operations:

- `completeTask`
- `adminUpdateNTask`
- `adminResetTaskCompletion`
- `adminDeleteUserData`

Activity code unlock no longer uses the legacy `unlockActivity` callable. The current flow hashes the submitted code in the browser and looks up `activity_code_hashes/{code_hash}` in Realtime Database.

## Run Locally

```bash
cd client
npm ci
npm run dev
```

For Google sign-in, add `localhost` in Firebase Authentication authorized domains.

## Build

```bash
cd client
npm run build
```

The production build is generated in `client/dist`.

## Deploy

Deployment is handled by GitHub Actions:

- Firebase Hosting builds `client/` and publishes `client/dist`.
- Firebase Database Rules deploys `database.rules.json`.

GitHub Pages deployment has been removed. Firebase Hosting is the production frontend. The Spark/free path intentionally does not deploy Cloud Functions.

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

- `client/`: Vue 3 frontend app.
- `client/src/router/`: routes, including `/admin`.
- `client/src/stores/`: Firebase-backed app state.
- `client/src/components/`: shared UI and Life Grid components.
- `firebase.json`: Firebase Hosting and rules configuration.
- `database.rules.json`: Realtime Database rules.
- `storage.rules`: Firebase Storage rules.
- `functions/index.js`: legacy Cloud Functions source, not deployed by the Spark/free workflow.
