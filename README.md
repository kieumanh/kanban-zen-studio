# Kanban Zen Studio v1.0.0

A personal Kanban workspace for Hương Thiền Nature.

Production: https://kanban.huongthiennature.com

## Features
- Chrome-inspired project tabs with custom colors; project create/edit/delete.
- Idea / List / Doing / Done, plus custom columns.
- Task create/edit/delete, descriptions, labels, due dates, drag-and-drop, accessible status selector.
- Checklist create/check/delete; automatic completion and reopening.
- Live project and overall progress, dashboard donut, full task search and filters.
- Release timeline, browser persistence, JSON export/import with validation, one-level deletion/import undo.
- Responsive desktop, tablet and phone layouts.

## Data model
Local-first, no login or backend database. Each browser origin has its own data. Task data never reaches the Worker or GitHub. Export JSON before clearing browser data or moving devices. Sample projects are illustrative, not actual tracked progress.

Task percentage: completed checklist / total checklist. Task without checklist: 100% if Done, otherwise 0%.
Project percentage: (Done tasks + completed checklist items) / (all tasks + all checklist items). Every task and item has equal weight. Moving a task to Done checks all items; moving a completed task to another column reopens its last checklist item. Checking all checklist items moves it to Done.

## Source and validation
Edit `dist/index.html`, `dist/style.css`, `dist/app.js`.

```sh
npm run build
npm test
```

No dependencies are needed to build/test. Google Fonts is optional; system serif/sans fallbacks are present. The generated `worker.mjs` serves the three bundled assets. `wrangler.jsonc` declares the Worker and custom domain for manual deployment with an authenticated Cloudflare Wrangler installation.

## Release 1.0.0 — 2026-10-24
First spark: project tabs, Kanban CRUD, task checklists, aggregate progress, dashboard, release timeline, JSON backups and responsive layout. No multi-user accounts or cross-device synchronization in this release.

Source repository: https://github.com/kieumanh/kanban-zen-studio (private). Production is deployed to Cloudflare Workers. Updating GitHub does not automatically redeploy the Worker; run the build and tests, then deploy the matching generated Worker with authenticated Cloudflare tooling.
