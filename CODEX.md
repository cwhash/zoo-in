# Codex Project Rules

This document defines development notes for the Zoo-In project.

## Documentation

- `README.md` and `README_zh-TW.md` are product-facing documentation.
- Update both README files when user behavior, Firebase paths, deployment steps, or UI flows change.
- Keep technical implementation notes here when they are useful for future contributors.

## Product Scope

- Zoo-In is the activity platform.
- Life Grid is one activity inside Zoo-In, currently keyed as `life_grid_2027`.
- Users land on the Zoo-In activity center after Google sign-in.
- Locked activities should not appear on the user home page.
- Activity unlock and task completion should be handled through Cloud Functions, not direct client-only trust.
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

- `index.html` loads the user-facing platform module from `js/platform/app.js`.
- `admin.html` loads the separate admin module from `js/admin/app.js`.
- `script.js` and `admin.js` are thin compatibility entrypoints.
- `js/shared/` contains shared Firebase and activity-code helpers.
- `js/activities/life-grid/` contains Life Grid config and adapters.
- `functions/` contains Firebase Cloud Functions.
- `database.rules.json` and `storage.rules` define Firebase security rules.

## Quality Checks

- Run `node --check script.js`.
- Run `node --check admin.js`.
- Run `node --check js/platform/app.js`.
- Run `node --check js/admin/app.js`.
- Run `node --check functions/index.js`.
- Validate JSON files after edits.
- For UI changes, test both the activity center and Life Grid view on mobile-width screens.
