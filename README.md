# Kanban Zen Studio 1.3.0 — Content Studio

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

## 1.1.7 mobile search and drawer
Compact capsule search with a single focus ring; remove nested input border on phones. Smaller sticky header and mode strip. Narrower drawer, compact branding and project rows, single-line project names, tighter footer. Desktop styling remains unchanged.

## 1.2.0
Archived completed projects and pinned tabs; visual note cards with groups, links, sketches and ordering; private account attachments (1 MB/file, 20 MB/account); Eisenhower categories and filtering; dashboard overdue/upcoming/important work; task/checklist ranges on timeline and agenda calendar. Automatic online/focus retries retain local edits and keep CAS conflict protection. File upload requires connectivity. Notes are a lightweight visual notebook inspired by Milanote, not a full infinite canvas. JSON exports include notes and schedules; attachment binaries remain in the separate private file store.

## 1.3.0 Content Studio and private R2 files
- New private R2 bucket `kanban-zen-files`, binding `FILES`. Existing D1 attachments remain readable.
- Browser multipart upload streams 64 MiB parts via authenticated Worker endpoints; 10,000 part ceiling gives a configured 625 GiB per file. This is an architectural limit, not a claim of a tested 625 GiB upload. Large storage can incur Cloudflare charges; no synthetic large uploads were performed.
- No former 20 MB account quota on R2 files. File upload requires network; per-part retries and cancel supported. Incomplete uploads are cleaned after 24 hours. File download remains private; supported image/audio/video types can preview inside cards. Other types download as attachments.
- Recycle bin: projects, tasks, checklists, notes (including nested boards) and individual files; restore within 30 days. Scheduled cleanup removes expired data and old objects. No manual permanent-delete button.
- Content cards: note, heading, link, checklist, nested board, image, audio, video, document, swatch, table, comment note, connecting line, sketch, map link. Columns, grid and free canvas; drag position/order, lock, zoom, resize via card width; copy/move, content template, Markdown and print/PDF.
- Seven-day revocable read-only snapshot links. Private attachments are excluded. This is not simultaneous multi-user editing, a Milanote clone, a formula engine or an arbitrary third-party embed system.
- Migrate existing D1 with `server/migration-1.3.sql` once before deploy. New installs use `server/schema.sql`. Never reapply the ALTER statement.
- Tests cover script initialization, content/trash recovery, graph cycles, multipart state, CSRF, cross-account isolation, file recycle/restore/cleanup, share revoke and existing auth/sync behavior. R2 unit tests use a mock bucket; large production uploads and visual browser QA remain unverified.

## Free storage guardrails
R2 Standard: 25,000,000 bytes/file, 1,000,000,000 bytes for the entire Kanban bucket across all users (including trash, reserved uploads and legacy attachments). Atomic reservations prevent concurrent quota bypass. All asset API calls share a cap of 100,000 per UTC month, allowing headroom for cleanup. Other Cloudflare buckets/services have separate usage and must remain within account free allowances; this application cap is not an account-wide billing switch.

## 1.3.1 Simple notes
Replace visual board authoring with a flat Keep-inspired card grid, retaining existing notes (including nested content), checklists, sketches and attachments. Simple note editor, server-enforced free storage quotas retained. Remove dashboard health panel. Compact outlined menu icons, desktop search capsule, sync state icons and scoped account typography.

## 1.3.2 Calendar and notices
Monthly seven-column calendar with task/checklist date ranges, month navigation and Today. Project tabs retain Timeline/Calendar mode and filter immediately. Pinned tabs use initials and accessible full-name tooltips. Compact search, green cloud success/yellow warning, in-app task notices and private file update polling every minute while open. Existing daily email/push scheduling remains separate.

### Daily welcome content (1.3.5)

The welcome card displays Vietnamese. Each entry retains its source text, attribution and reference URL for comparison; Vietnamese versions are reference translations or clearly labeled paraphrases. The corpus contains 1,121 distinct excerpts, including 26 additions from Laozi, Zhuangzi, Osho and Sadhguru. Classical Buddhist verses 294–295 include contextual notes about their metaphors. All text ships as a static asset: opening the daily welcome does not call a translation or inference service.

Mobile search is centered on the viewport with reserved space for the menu, sync status and notification bell. Desktop search keeps its existing placement.

### Matrix labels (1.3.7)

The four Eisenhower matrix labels are Important and urgent (purple), Important and not urgent (green), Not important and urgent (pink), and Not important and not urgent (orange). Labels keep their existing q1–q4 values, so saved task classifications remain intact.

### Daily welcome refinement (1.3.8)

The daily welcome shows the Vietnamese excerpt and source link without translation notes or an expandable English original. The quote uses Lora with left-aligned, balanced line wrapping; the close button sits at the upper right.

### Work overview and reports (1.4.0)

Dashboard uses mutually exclusive green Done, purple Doing, orange waiting and red overdue task groups. Hover, focus or tap reveals task-level progress and dates. Project cards align and clamp long descriptions. Project appearance uses an emoji/motif palette and keyboard-accessible HSV wheel with HEX/RGB input. Project keyword configuration is hidden; existing labels remain stored. Incomplete projects can be archived/restored without changing tasks and are excluded from reminders and reports.

Apply `server/migration-1.4.sql` before deploying. Notification preferences expose daily reminder hour, repeated in-app due warnings, and separate opt-in Sunday weekly report hour (Vietnam time). Reports use deterministic rules and real workspace state, with comparisons to previous sent summaries; no AI services are called. `GET /api/weekly-report` previews only the signed-in account's report. Mail outbox freezes payloads, leases sends, retries at most four times daily and uses deterministic Resend idempotency keys. Settings opt-out suppresses pending deliveries. Upcoming reminders include the next 3 days, today and overdue tasks; archived projects are excluded. Sunday snapshots persist for 100 days, job records for 30. New email settings default off until opted in.

The explicit URL `/?enable-notifications=1` opts only the signed-in browser account into daily email and Sunday summaries, retaining its chosen hours; anonymous visitors must sign in first. The query is removed after a successful account-scoped preferences update. No global user preference update is performed.

### Checklist, report presentation and resources (1.4.1)

Checklist editing removes time controls, retains any previously recorded schedule metadata and supports multiline text, completion and undoable removal before save. Cards show one clean status marker per item and at most five entries. Settings checkboxes have explicit dimensions. Weekly emails send both text and inline HTML with four percentage charts and project progress bars. The same generated HTML is previewed in a sandboxed modal frame; Print / Save PDF uses the browser's native print dialogue (choose Save as PDF).

Apply `server/migration-1.4.1.sql` once before deploying to add the frozen HTML outbox column. Existing jobs retain their original payload. Resource Views lists all the signed-in account's ready R2 and legacy attachments, paginated in batches of 60, with name/type/source filters and private metadata/media previews. Delete moves files to existing 30-day trash. Thumbnails load lazily; images larger than 5 MB require opening details to load. No public resource URLs or third-party viewer services are used.

### Navigation and editing refinement (1.5.0)

Project tabs can be reordered by desktop drag/drop, touch hold/drag, or Alt+arrow within their pinned/unpinned group. Order is persisted as workspace array order and synchronized through the existing revision check. Project progress summaries now appear in Timeline and Calendar. Project keyword/color settings are searchable through project result cards and matching task results. The project editor is wider with a larger description area.

The full date field opens an accessible custom calendar with 24-hour time choices; hidden native values preserve the existing API format and validation. Archive requests require confirmation. The sticky due banner opens filtered overdue/upcoming task lists rather than general notifications. Attachment uploads retain the existing private multipart pipeline with a styled selection/drop zone. Resource search remains in Resource Views. Identifier validation rejects characters unsafe in DOM attributes/selectors. No database migration is required for this version.

### Gantt and notes (1.6.0)
Gantt displays dated task bars and progress with finish-to-start arrows. Drag between endpoint dots, tap dots in sequence or use Enter on focused dots. Cycles, duplicate links and self-links are rejected; links are limited to 1,000 per project and validated on server and client. Date conflicts remain visible and dates are never rescheduled automatically. Undated tasks remain in a separate list. Deleting tasks prunes orphan links. Note cards open directly and use reduced-motion-aware hover styling. Emoji search uses Unicode/system glyphs, not bundled JoyPixels artwork. Resource filenames can be renamed through an owner-scoped endpoint.

### Notice detail actions (1.6.1)
Release notifications open version details and mark the release viewed. Task notice cards explicitly show a detail action; opening one marks only that current notice signature as read. The global Mark all viewed action is retained. Dashboard stat icons share rounded botanical forms, and the sidebar footer shows only the version number.

### Nhịp an nhiên (1.6.2)
Rounded Nunito typography, note toolbar, colored priority radio choices, revised guide and red close buttons. Fix duplicated polish/Gantt script imports and missing navigation icon slots that interrupted rendering of the project count. PDF/HTML weekly report includes an SVG donut and rounded progress bars, with numerical distribution retained for email clients that omit SVG. Persistent HttpOnly cookie survives refresh; server session expiry is 10 minutes of inactivity, renewed only by the explicit activity endpoint. Background sync never extends the session. An idle tab checks the server deadline before locking to respect activity in another tab. Unsynced saved data remains in the per-account cache. Confirmed logout lives at the end of Settings.
