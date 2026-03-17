# Codex Project Rules (For AI Assistants & Engineers)

This document defines collaboration and development rules for the **Life Grid** project.

## 1. Documentation Responsibilities
- `README.md` is for end users and players.
- Keep `README.md` bilingual (English + Traditional Chinese) when updating product-facing content.
- `codex.md` is for developers and AI agents.
- Put technical constraints, architecture notes, and workflow standards in `codex.md`, not in user-facing copy.

## 2. Product Scope (Current Baseline)
- Primary target is **mobile users**.
- Main screen must present a **5×5 task grid**.
- Tasks are numbered **1 to 25**.
- The top-left corner includes a **hamburger menu icon**.
- Tapping the menu opens a sidebar containing **detailed task descriptions**.

## 3. UI & UX Principles
- Prioritize touch-friendly spacing, readable font sizes, and simple navigation.
- Keep the main grid as the visual focus.
- Avoid complex animations that reduce responsiveness on low-end phones.
- Maintain accessible labels for interactive controls (menu button, close button, task cells).

## 4. Code Organization
- Keep frontend assets lightweight and framework-free unless explicitly required.
- Recommended baseline file split:
  - `index.html` for structure
  - `styles.css` for presentation
  - `script.js` for behavior
- Prefer clear naming for DOM IDs/classes (`taskGrid`, `sidebar`, `menuButton`, etc.).

## 5. Data & Content Rules
- Maintain exactly 25 default tasks in the baseline UI.
- Task numbering should remain stable (1..25) unless product requirements change.
- Task descriptions can be placeholders but must be present in the sidebar for every task.

## 6. Change Management
- Keep edits small and easy to review.
- If a change affects user behavior or visuals, update `README.md` in both languages.
- Validate the app locally before submitting changes.

## 7. Quality Checks
- Confirm grid renders 25 cells.
- Confirm sidebar opens from hamburger button and closes correctly.
- Confirm task details list includes all 25 tasks.
- Confirm layout remains usable on common mobile widths (e.g., 360px–430px).
