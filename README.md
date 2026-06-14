# Zoo-In

[English](README.md) | [繁體中文](README_zh.md)

Zoo-In is a Firebase-based activity platform. The production frontend is a Vue 3 app built from `client/` and deployed to Firebase Hosting at `https://zoo-in.web.app`.

## Current Product Scope

- Google sign-in through Firebase Authentication using same-tab redirect sign-in, not popup sign-in.
- Vue 3 + Vite frontend with Pinia stores and Vue Router.
- Firebase Hosting is the production frontend target.
- Admin backend route is `/admin`, with Life Grid 2027 settings under `/admin/life-grid-2027`.
- Cloud Functions are the trusted backend for activity unlock, task completion, achievements, feeds, and admin operations.
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

## Functions

The project now runs on Firebase Blaze so Cloud Functions are the official backend. Callable Functions are deployed in `asia-southeast1` with `maxInstances: 3` and no warm instances.

Deployed callable Functions:

- `unlockActivity`
- `completeTask`
- `adminSyncClaims`
- `adminSyncAllClaims`
- `adminUpdateActivityCode`
- `adminUpdateNTask`
- `adminResetTaskCompletion`
- `adminDeleteUserData`

Activity codes are not stored in frontend code. Admins set a code through `/admin/life-grid-2027`; the backend normalizes it, stores its SHA-256 hash in `activity_code_hashes/{code_hash}`, and uses transactions to enforce the 999 participant limit.

Storage admin access uses Firebase Auth custom claims. Admins are still managed in Realtime Database under `admins/{uid}`, but an existing admin must call `adminSyncClaims` for one user or `adminSyncAllClaims` for all users after changing admin membership. Affected users must refresh their ID token or sign in again before Storage rules see the new claim.

## Run Locally

```bash
cd client
npm ci
npm run dev
```

For Google sign-in, the app uses Firebase redirect sign-in in the same browser tab and asks Google to show the account chooser each time. On Firebase Hosting domains, the app sets `authDomain` to the current hosting domain so the auth helper runs on the same site. Add `localhost` in Firebase Authentication authorized domains if local sign-in is needed.

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
- Firebase Functions deploys `functions/` only when backend files change.

GitHub Pages deployment has been removed. Firebase Hosting is the production frontend.

Useful targeted commands:

```bash
firebase deploy --only hosting
firebase deploy --only database
npx firebase-tools@latest deploy --only functions --project zoo-in --non-interactive
```

The first admin must be added manually in Realtime Database:

```txt
admins/{uid}: true
```

## Cost Controls

The Firebase project is on Blaze. Budget Alert is configured in Google Cloud, and Functions use `maxInstances: 3` to reduce runaway cost risk. Google Cloud budgets alert but do not hard-stop billing, so keep API keys restricted and monitor usage after releases.

## File Guide

- `client/`: Vue 3 frontend app.
- `client/src/router/`: routes, including `/admin`.
- `client/src/stores/`: Firebase-backed app state.
- `client/src/components/`: shared UI and Life Grid components.
- `functions/`: Firebase Cloud Functions backend modules.
- `firebase.json`: Firebase Hosting, Functions, and rules configuration.
- `database.rules.json`: Realtime Database rules.
- `storage.rules`: Firebase Storage rules.
