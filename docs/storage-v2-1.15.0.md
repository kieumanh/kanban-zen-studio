# Storage v2 — 1.15.0

Cloudflare documents a maximum string, BLOB or table row of 2,000,000 bytes: https://developers.cloudflare.com/d1/platform/limits/ . The old workspace limit was a guard against that physical limit, not an account storage quota.

## Implemented

- `workspace_state` holds a revision and transaction nonce; `workspace_entities` holds root ordering, projects, tasks, notes, trash and templates in separate rows. Each entity is limited to 1.5 MB and the application workspace to 20 MB. These application limits leave room below the D1 row limit.
- `/api/workspace-v2` migrates a user's legacy snapshot on first access, in a guarded transaction. The original snapshot remains available for recovery. Old clients can read current data but cannot overwrite an account after migration.
- The client sends changed entities. Notes without parent/link changes use a fast path reading only the changed note rows, and history is captured only for those rows. Other structural edits validate the reconstructed workspace before an atomic compare-and-swap write.
- Large change sets use authenticated staging requests. Incomplete transfers never become visible; final commit checks the base revision and expected entity count. Pending uploads expire and are cleaned by cron.
- PNG sketches upload to private R2 objects with validated PNG signatures, account/note/content-derived IDs, retry deduplication and the existing 1 GB storage guard. Notes keep owner-protected URLs. Unsynced drawings remain inline in the local draft while offline.
- Main drafts, base snapshots and conflict copies use IndexedDB. Legacy localStorage account data is imported before removal. Small session pointers, preferences and notification receipts remain in localStorage. Settings shows workspace, largest-record and browser storage estimates, plus an optional persistent-storage request.
- Login offers an explicit 30-day remembered-device option. Ordinary sessions retain the 10-minute idle policy. Password reset revokes both types. Remembered sessions require recent password confirmation for sharing, permanent file deletion and destructive workspace removal. Thirty-day timers are scheduled in bounded intervals to avoid browser timer overflow.

## Tooling and modules

Prettier and ESLint are installed with a lockfile. The formatting-only backend/build commit is separate from behavior changes. Auth/session, workspace storage, sketches/files, reports and notifications have separate modules; the legacy workspace adapter remains in the router during migration.

New persistence, delta and Settings capacity code uses ES modules. The older views still use their established render wrappers. Moving each remaining view to a single render function is a continuing migration, not completed by this release. Design tokens are introduced for brand colors, surfaces, spacing and radii. Dark mode still needs an audit of older hard-coded styles.

`package.json` is the version source. Build substitutes `__APP_VERSION__` in application assets. `worker.mjs`, `worker-api.mjs` and `public/` are generated; CI builds them without committing generated bundles. CI runs lint, format checks, backend tests, responsive browser tests, offline tests and publishes regression screenshots before applying `wrangler d1 migrations` and deploying.

## Deployment and recovery

Existing production databases apply `migrations/0001_workspace_entities.sql` and `0002_remember_device.sql` through Wrangler. They add tables and session columns; they do not drop user records. Fresh databases use `server/schema.sql`.

After migration, do not force a legacy write or delete the normalized tables to roll back. Export the normalized workspace first. A code rollback can show only the retained legacy snapshot, which stops updating after storage v2 activation. Keep normalized data and R2 objects intact for recovery.

## Validation scope

Tests cover a workspace larger than 2 MB, a one-note delta smaller than 1 KB, stale revisions, account isolation, history, staged transfers larger than 2 MB, retry-safe R2 sketches, long sessions and sensitive-action confirmation. Browser tests cover desktop/tablet/mobile, Settings capacity and reopening a large IndexedDB draft offline. Automated checks do not constitute an independent penetration or load test at the 20 MB application ceiling.
