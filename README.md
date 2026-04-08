# Life Grid

Life Grid is a mobile-first web app that presents 25 personal missions in a 5×5 board. Each mission has a level, title, description, and completion state so users can track progress in a simple visual layout.

## Who this is for

- People who want a lightweight mission checklist without installing an app.
- Users who prefer to review tasks by priority level (S, A, B, C, N).
- Anyone who wants a fast, single-page interface that works on phones.

## What users can do

- View all 25 tasks in a 5×5 grid.
- See task level distribution at a glance (S×1, A×2, B×4, C×8, N×10).
- Open the left sidebar from the menu button.
- Expand each task and edit its title and description.
- Mark tasks as completed with a checkbox.
- See a completion date stamp on completed task cells.

## Interface overview

- Top bar: app title and menu button.
- Main grid: colored task cells labeled by level and index (for example, `S1`, `A1`, `N10`).
- Sidebar: full task list with editable fields and completion controls.

## Tech stack

- HTML
- CSS
- JavaScript (vanilla)


## Firebase configuration

`firebase-config.js` in this repository contains the Firebase configuration used by the app, including the Web API key.

If you update the project or domain restrictions, edit `firebase-config.js` directly and commit the updated values.

## Run locally

```bash
git clone https://github.com/cwhash/life-grid.git
cd life-grid
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## File guide

- `index.html`: page structure and core UI containers.
- `styles.css`: visual theme, layout, and responsive styles.
- `script.js`: task generation, rendering, and interactions.
- `README_zh.md`: Traditional Chinese version of this README.

## Notes

- Google sign-in is enabled via Firebase Authentication.
- Task data is stored in Firebase Realtime Database and is scoped per user.

## Login troubleshooting

If sign-in shows **"The requested action is invalid."**, check these Firebase settings first:

1. **Authentication → Sign-in method**: ensure **Google** is enabled.
2. **Authentication → Settings → Authorized domains**: include your current domain (for local testing, include `localhost`).
3. If popup sign-in is blocked by the browser, allow popups for this site and try again.
