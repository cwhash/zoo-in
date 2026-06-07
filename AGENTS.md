# Codex Project Rules

This document defines development notes for the Zoo-In project.

## Documentation

- `README.md` and `README_zh-TW.md` are product-facing documentation.
- Update both README files when user behavior, Firebase paths, deployment steps, or UI flows change.
- Keep technical implementation notes here when they are useful for future contributors.

## Product Scope

- Zoo-In is the activity platform.
- Life Grid is one activity inside Zoo-In, currently keyed as `life_grid_2027`.
- The production frontend is the Vue app in `client/`, deployed to Firebase Hosting.
- Users land on the Zoo-In activity center after Google sign-in.
- Locked activities should not appear on the user home page.
- Activity unlock is handled by the `unlockActivity` callable Function.
- Task completion, achievements, feed writes, activity code management, and destructive admin actions are handled by callable Functions.
- Photos belong in Firebase Storage. Realtime Database stores only metadata and paths.

## Life Grid Rules

- Life Grid 2027 activity code is configured in the admin backend.
- Activity period is 2026-07-01 through 2027-12-31.
- Activity unlock is allowed before the start date; task edits and completion are still limited to the activity period.
- S/A/B/C tasks are user-defined and lock after first save.
- N tasks are shared official tasks maintained by admins.
- Completing a task requires one 4:5 JPEG photo.
- User-submitted photos are private to the owner and admins.
- Completed tasks are not user-cancellable.
- Achievements are activity-scoped and hidden until unlocked.
- The public activity feed shows nickname-based events only.

## Code Organization

- `client/` contains the Vue 3 + Vite frontend.
- `client/src/router/` defines routes, including `/admin`.
- `client/src/stores/` contains Firebase-backed app state.
- `client/src/components/` contains shared shell and Life Grid UI.
- `functions/` contains the Firebase Cloud Functions backend. Functions deploy to `asia-southeast1` with `maxInstances: 3`.
- `database.rules.json` and `storage.rules` define Firebase security rules.

## Quality Checks

- Run `npm run build` in `client/`.
- Run `node --check functions/index.js`.
- Validate JSON files after edits.
- Keep README files aligned with GitHub Actions deployment behavior.
- For UI changes, test both the activity center and Life Grid view on mobile-width screens.
