# Kanban Zen Studio 1.1.2 — Small wins

Production: https://kanban.huongthiennature.com/
Private source: https://github.com/kieumanh/kanban-zen-studio

Personal project tabs, Kanban boards, task checklists, colored keyword labels, dashboard, Timeline and Calendar.

## Accounts and synchronization

Email/password signup requires email verification. Passwords use salted PBKDF2-SHA256 (100,000 iterations, the Workers Web Crypto iteration cap). Opaque session and email tokens use 256-bit randomness and only SHA-256 token digests are stored. Sessions are HttpOnly, Secure, SameSite=Strict, valid seven days. Reset links expire in 30 minutes, verification links in 24 hours; reset invalidates all sessions. Authentication and email requests are rate limited. Mutating API calls enforce same-origin and JSON Content-Type. Queries are parameterized; server validates workspace payloads and derives the owner from the session.

Workspace updates use revision compare-and-swap. Other devices poll every ten seconds while open. Offline edits stay in an account-specific browser cache and are sent on reconnect. Conflicts never silently overwrite server data: export local JSON, then select the cloud version from account settings. A local conflict snapshot is retained. This is conflict detection rather than simultaneous collaborative editing. Existing pre-account local data remains untouched and can be explicitly imported after login.

## Reminders

Opt-in email and Web Push send at 08:00 Asia/Ho_Chi_Minh for due/overdue incomplete work. Cron retries at 08:15 and 08:30 with daily delivery tracking and email idempotency keys. Notifications show a generic reminder to avoid exposing task content on the lock screen. Web Push requires browser permission and supported OS/browser; delivery can be restricted if the browser is fully shut down. Email can be disabled in account settings; push can be disabled per device. Logging out removes that device's push subscription.

## Development and deployment

Requires Node 24 for tests (node:sqlite); no npm dependencies.

```
npm run build
npm test
```

Edit assets in dist/ and backend in server/api.mjs; scripts/build.mjs bundles the Worker without dependencies. server/schema.sql is idempotent schema setup. Tests use an isolated in-memory SQLite database and a mock email provider: they send no real email.

Cloudflare config declares D1 and cron. Set server-only RESEND_API_KEY (sending access restricted to the verified domain) and VAPID_PRIVATE (P-256 JWK) secrets. Set VAPID_PUBLIC as the corresponding uncompressed public key in base64url in Worker variables. Never commit private keys or email credentials. Production secrets and bindings were configured through the Cloudflare API. Preserve VAPID keys across deploys so existing subscriptions continue working. GitHub is source storage; commits do not automatically deploy.

## Validation

Core tests cover progress, schema validation and static routes. Account tests cover hashing, verification/replay prevention, secure sessions, password reset/revocation, account isolation, revision conflicts, CSRF, push endpoint allowlist, email opt-in and daily deduplication, and brute-force throttling. Real inbox delivery and OS push permission require the account holder to exercise them with their own email/device.

## 1.1.1 visual update
Purple, rose and warm orange palette; wisdom-eye SVG identity in the sidebar, authentication screen and favicon. Inline accessible password visibility buttons on login, signup and reset-password forms (email-only recovery does not contain a password field).

## 1.1.2 completion celebrations
Five randomized encouraging messages with illustrated icons and purple/rose/orange fireworks. Triggered by direct checklist completion and task transition into Done (including editor and drag-and-drop). Final checklist item celebrates once as task completion; reopen, refresh, import and remote sync do not trigger. Nonblocking, dismissible, automatic 4.5s dismissal; respects reduced motion.

## 1.1.3 registration feedback
Clarify that registration needs email verification; style successful requests separately from errors and clear/hide the password after successful submission. Investigated account metadata and provider delivery status without accessing password hashes or verification secrets.

## 1.1.4 navigation
Kanban, Timeline and Calendar are grouped in one compact mode selector with distinct line icons. Versions moves to the menu footer and dashboard bottom. Settings consolidates account, notifications, sync and data tools.

## 1.1.5 phone layout
Sticky mobile menu/search and view switch; dismissible navigation drawer with scrim and Escape; 44px controls, 16px form inputs, single-column modal forms, scroll-snap Kanban columns, mobile task cards and calendar agenda. Safe-area spacing and responsive settings dialogs.

## 1.1.6 input and synchronization review
Compact sidebar. Validate real calendar dates and trim empty labels on input/import. Revision-only polling skips unchanged workspace payloads; asynchronous polls never overwrite edits made while the request is in flight. Failed conflict reload preserves local dirty state. Concurrent signup uses insert-or-ignore without changing an existing password. Reminder queries exclude users without active delivery channels; additive indexes support cleanup and user lookups.
