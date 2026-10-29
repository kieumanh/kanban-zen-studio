# Backend review — 29 October 2026

Scope: server/api.mjs, storage.mjs, resources.mjs, report-sharing.mjs, task-workflow.mjs and the existing automated tests. This is a source review and automated regression pass, not an independent penetration test.

## Fixed

- Reject malformed notes collections and null entries before nested field access. Invalid workspace writes now return 400 INVALID_WORKSPACE rather than an unexpected 503.
- Require an explicit boardId for board sharing. Nonempty IDs must identify an existing board owned by the current account. Explicit empty boardId remains supported for intentional sharing of the root notebook. Missing IDs no longer implicitly share root notes.
- Rate-limit board share creation to 20 per user per 15-minute window.
- Skip malformed historical trash payloads and task parent references so scheduled cleanup can finish without targeting unrelated files.
- Bound outbound Web Push fetches to 15 seconds.
- Remove the duplicate password-length condition after the early login validation.

## Security controls inspected

Session cookies are HttpOnly, Secure and SameSite=Strict. Mutating API requests check the production Origin. SQL uses bound values. Workspace writes use revision compare-and-swap. Private file reads and modifications are filtered by user_id. Report tokens are hashed and have expiry and revocation. Public password-protected report access is rate-limited. File responses use sandbox CSP and nosniff. Task attachment reparenting is guarded by the successful workspace revision and data.

These findings describe the inspected paths; they do not certify every possible runtime scenario.

## Validation

Successful GitHub Actions run:
https://github.com/kieumanh/kanban-zen-studio/actions/runs/40837895580

npm test passed, including new malformed-input, share-target and corrupt-trash regressions and existing auth, cross-account isolation, reset/verification, workspace conflicts, storage lifecycle, quotas and report-sharing tests.
Mobile/tablet/desktop workflow tests and PDF report layout tests passed.
Production deployment and active commit/health verification passed.

No database migration was introduced. Recovery branch:
backup/before-backend-audit-20261029

## Remaining review limits

No destructive tests ran against real user data. This pass did not perform load testing, credential rotation, an account-wide permission audit or independent penetration testing. The existing package version remains 1.14.8; the Actions run identifies the exact deployed source commit.
