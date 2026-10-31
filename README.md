# Kanban Zen Studio

Số phiên bản hiện tại nằm trong `package.json`; production báo cùng số tại `/health`. Các mục 1.1.1–1.13.3 bên dưới là lịch sử gốc và không còn đầy đủ. Từ 1.15.30, ghi chú từng bản nằm ở `docs/release-notes/`, và danh sách hiển thị trong ứng dụng nằm ở mục Nhật ký phát triển (`dist/welcome.js`).

Production: https://kanban.huongthiennature.com/
Private source: https://github.com/kieumanh/kanban-zen-studio

Personal project tabs, Kanban boards, task checklists, colored keyword labels, dashboard, Timeline and Calendar.

## Accounts and synchronization

Email/password signup requires email verification. Passwords use salted PBKDF2-SHA256 (100,000 iterations, the Workers Web Crypto iteration cap). Opaque session and email tokens use 256-bit randomness and only SHA-256 token digests are stored. Sessions are HttpOnly, Secure, SameSite=Strict, valid seven days. Reset links expire in 30 minutes, verification links in 24 hours; reset invalidates all sessions. Authentication and email requests are rate limited. Mutating API calls enforce same-origin and JSON Content-Type. Queries are parameterized; server validates workspace payloads and derives the owner from the session.

Workspace updates use revision compare-and-swap. Other devices poll every ten seconds while open. Offline edits stay in an account-specific browser cache and are sent on reconnect. Conflicts never silently overwrite server data: export local JSON, then select the cloud version from account settings. A local conflict snapshot is retained. This is conflict detection rather than simultaneous collaborative editing. Existing pre-account local data remains untouched and can be explicitly imported after login.

## Reminders

Opt-in email and Web Push send at 08:00 Asia/Ho_Chi_Minh for due/overdue incomplete work. Cron retries at 08:15 and 08:30 with daily delivery tracking and email idempotency keys. Notifications show a generic reminder to avoid exposing task content on the lock screen. Web Push requires browser permission and supported OS/browser; delivery can be restricted if the browser is fully shut down. Email can be disabled in account settings; push can be disabled per device. Logging out removes that device's push subscription.

## Development and deployment

Requires Node 24 (node:sqlite). The application has no runtime npm dependencies; ESLint and Prettier are development tools installed with `npm ci`.

```
npm ci
npm run lint
npm run format:check
npm run build
npm test
```

Edit assets in dist/ and backend in server/api.mjs; scripts/build.mjs bundles the Worker without dependencies. server/schema.sql is idempotent schema setup. Tests use an isolated in-memory SQLite database and a mock email provider: they send no real email.

wrangler.jsonc declares the Worker, D1 (DB), R2 (FILES), static assets and a five-minute cron. Set server-only RESEND_API_KEY (sending access restricted to the verified domain) and VAPID_PRIVATE (P-256 JWK) secrets. Set VAPID_PUBLIC as the corresponding uncompressed public key in base64url in Worker variables. Never commit private keys or email credentials. Production secrets and bindings were configured through the Cloudflare API. Preserve VAPID keys across deploys so existing subscriptions continue working. Pushing to `main` runs the GitHub Actions workflow "Verify and deploy Kanban Production" (lint, build, tests, responsive browser checks, then `wrangler deploy --keep-vars`); see `docs/production-deployment.md`.

## Migration (cập nhật 1.15.30)

`migrations/` là hệ thống migration có phiên bản (hiện có 0001 và 0002), đã áp dụng cho production ngày 2026-10-29; mã băm SHA-256 nằm trong `migrations/production-receipt.json`. Không sửa các tệp đã áp dụng hay biên nhận; schema mới là tệp SQL mới và chờ Mạnh xác nhận trước khi áp dụng. Các tệp `server/migration-*.sql` là bước chạy một lần từ trước khi có hệ thống `migrations/`, không phải đường migration hiện hành. Khi workflow thiếu secret `CLOUDFLARE_D1_API_TOKEN`, nó chỉ đối chiếu mã băm với biên nhận và chặn mọi tệp SQL mới hoặc đã sửa; khi có secret, nó chạy `wrangler d1 migrations apply`.

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

### Chạm để hiểu (1.6.3)
Dashboard summary cards are native buttons with hover/focus motion and drill-down lists. Counts and detail lists share the exact same scope, including overdue Doing tasks in the Doing statistic. Project/progress drill-down opens the chosen project. Alert actions have rounded outlined buttons and icons, with wrapping on small screens. Sync glyph has its own compact status background. Saved account photos render on both avatars and update immediately on profile save; absent/broken photos fall back to name initials.

### Dòng việc liền mạch (1.7.0)
Gantt joins the four view modes; move bars and resize edges by pointer or arrow keys. Changes preserve times and update the due date, without shifting dependent tasks. Date windows are 14/28/56 days; unscheduled tasks can be placed today. Server/client dependency validation continues to reject cycles. Desktop hides the duplicate project sidebar, while touch/tablet/mobile retain it.
Task checklists are native checkboxes on Kanban cards and auto-update progress/Done. Compact editor textareas grow without inner scrollbars. Unclassified is a neutral grey chip.
Notes support multiple comma-separated keywords, keyword filtering/search, editable todo lists with direct card checking, and per-note reminder times in Vietnam time with 15-minute/1-hour/1-day lead. Saved reminders appear on Dashboard; due reminders join the bell. Optional per-note emails are checked every 5 minutes, use stable outbox keys across midnight, and are cancelled after disabling, deleting or completing a checklist. No AI calls are used.
Trash combines workspace records and R2/legacy files, counts categories, offers list/grid and per-item restore/purge. Permanent file purge is account-owned and deleted-only, with retryable deletion state. Bulk purge snapshots the selected IDs, works in batches of 20, and requires confirmation. It does not remove files still active in Resources. Workspace changes use the existing CAS sync; pending local data blocks purge until synchronized.

### Chia sẻ điều đang lớn (1.8.0)
Weekly report share links create fixed server-generated snapshots. Owners choose public-by-link or password protection and 1/3/5/7/10/15/30-day expiry, list active shares and revoke them. Tokens are random 256-bit values stored as SHA-256 hashes; passwords use salted PBKDF2. Anonymous reads check expiry/revocation and protected reports return no content before password verification; unlock requests have IP and token rate limits. The standalone /report.html#token viewer does not load account/workspace scripts, renders reports in a sandboxed iframe, and hides content on expiry. Apply migration-1.8.0.sql before deployment.
Project icon library uses categorized native Unicode emoji with English keyword search, including tone variations. It does not bundle JoyPixels artwork. Note color controls reuse the existing HSV wheel with brightness, HEX and RGB inputs.


### 1.9.1 — sourced wisdom expansion

Recovered the deployed 1.9.0 assets and the existing report-view/report-table source changes before editing. Added 185 excerpts: 117 from Analects, 56 new passages from Tao Te King after excluding 5 overlaps, and 12 short excerpts from official teaching sites. Curated translations and public-domain English source snapshots are versioned in scripts/ and sources/. Every imported classical excerpt is matched to its source; the script is idempotent.

The corpus has 1,351 entries: 1,306 excerpts carrying source references and 45 explicitly attributed Zen Studio editorial reflections. The 9,999-excerpt target is NOT complete: 8,693 remain. Legacy translations have not all been re-reviewed; source presence is not a claim of human validation. Raw downloaded passages do not count. Status is available at /wisdom-status.json.

Selection uses every entry exactly once per full cycle, including Marcus Aurelius, instead of repeating single-entry authors every 45 slots and omitting unprofiled authors. Four Vietnam slots remain 05:00–10:59, 11:00–13:59, 14:00–17:59, 18:00–04:59 (the evening slot belongs to its starting date). Editorial reflections display Zen Studio as author. Existing data/sessions/notifications are preserved. Added a public-domain photo of a historical Marcus Aurelius bust; eight existing profiles still lack a sourced portrait and use an explicit initials fallback.

Validation: npm test (accounts, sync, content, reports, project UX, resources, reminders, sharing, source/ID/duplicate checks, timezone boundaries, full-cycle coverage, import idempotency). This does not substitute for editorial review of all legacy translations.

### 1.9.2 — classical sources and broader author coverage

Added 261 Vietnamese excerpts after excluding two overlapping Zhuangzi passages: 103 Mencius passages, 109 Zhuangzi passages, 43 Xunzi passages, and six from Pema Chödrön, Sri Aurobindo, Master Oneness, Vạn Hạnh, Trần Nhân Tông and Tuệ Trung Thượng Sĩ.

Chinese originals are translated as source excerpts, not copied from modern Vietnamese translations. Public-domain source snapshots, explicit Vietnamese selections and chapter/section alignment are versioned. Zhuangzi entries explicitly identify the literary work traditionally attributed to Zhuangzi; fictional dialogues are not certified as historical speech. The classical Vietnamese poems are each one complete entry, not multiple entries created by splitting their lines.

Current corpus: 1,612 entries, including 1,567 sourced excerpts and 45 separately attributed editorial reflections. 8,432 sourced excerpts remain before the 9,999 target. The importer enforces the ceiling and does not count untranslated candidate passages. Source alignment does not mean all legacy translations have received human review.

Added public-domain historical portrait illustrations of Zhuangzi and Xunzi from Wikimedia Commons with provenance and illustration labels. Six profiles still lack sourced images and retain their explicit initials fallback. No invented portrait is used. The existing four Vietnam slots and complete selection cycle are preserved.

## v1.10.3

- Thêm ảnh xem trước mạng xã hội Open Graph 1200 × 630 và metadata Twitter cho trang chính, bảng chia sẻ và báo cáo tuần.
- Thêm thumbnail PNG vào gói Worker để ảnh chia sẻ được phục vụ trực tiếp từ cùng tên miền.

## v1.10.2

- Sửa lỗi tham chiếu ảnh còn sót sau khi gỡ khỏi ghi chú, tránh ảnh vỡ làm tràn hoặc lệch thẻ bên ngoài.
- Tự ẩn ảnh đính kèm lỗi tải trong thẻ ghi chú và đồng bộ bản vá phiên bản 1.10.2 toàn ứng dụng.

## v1.10.1

- Gom tệp đính kèm trong ghi chú theo nhóm ảnh và tài liệu; thumbnail co theo khung, tên dài không làm vỡ bố cục.
- Thêm hình dự phòng cho ảnh xem trước liên kết khi ảnh lỗi hoặc đã bị gỡ.
- Đồng bộ phiên bản giao diện, API health và metadata dự án lên 1.10.1.

## v1.10.0
Note history retains accepted previous snapshots for seven days in an account-scoped D1 table; restoration creates a new save. History begins after this upgrade. Client sync now stores its acknowledged baseline for three-way merge; competing edits remain explicit, with an opt-in recovery preserving differing records as copies. Persistent legacy conflicts require Settings → Hợp nhất và giữ cả hai bản. No forced workspace overwrite. Added rich-text bullet/number lists, four illustrated motifs, a unified note action row, project assignment for task creation, a scoped uploader, sticky modal close controls and consistent release metadata.


## v1.11.0 · Giữ nhịp làm việc quen thuộc

Phát triển trên v1.10.3 đã khôi phục. Giữ cấu trúc và các góc nhìn của dòng 1.x.

- Chuyển/copy task giữa dự án. Chuyển giữ ID và tệp; cập nhật nơi quản lý tệp R2/legacy trong cùng giao dịch CAS workspace, không đổi đối tượng nhị phân. Gỡ phụ thuộc Gantt ở dự án cũ khi chuyển. Copy tạo mới ID checklist, cho phép bắt đầu lại trạng thái; tệp vẫn ở task gốc.
- Lưu trữ và khôi phục task trong mục Lưu trữ; loại khỏi các góc nhìn đang làm, thống kê và nhắc hạn.
- Thẻ Kanban có tiêu đề rõ, mô tả định dạng đầy đủ trong dữ liệu và phần xem gọn trên thẻ; phân loại/từ khóa nằm dưới nội dung và checklist.
- Dùng định dạng H1/H2, đậm/nghiêng/gạch dưới/gạch ngang và danh sách trong mô tả task. Lưu bằng Markdown tương thích dữ liệu cũ, không lưu HTML tùy ý.
- Nút Thêm checklist lưu nội dung task đang chỉnh và mở tiếp form. Kéo tay nắm đổi thứ tự checklist sẽ lưu cùng các trường đang chỉnh.
- Tay nắm kéo thả task/ghi chú/checklist dùng được bằng chuột và cảm ứng; Alt + ↑/↓ là thao tác bàn phím tương ứng. Task đổi cột giữ quy tắc hoàn tất checklist hiện có. Ghi chú chuyển giữa nhóm ghim theo vị trí thả.
- Ghi chú tự lưu sau 650 ms dừng nhập ở tiêu đề, nội dung, liên kết, màu, nhãn, từ khóa, checklist và tùy chọn nhắc. Đóng bằng X/Escape sẽ lưu phần đang chờ; dữ liệu không hợp lệ giữ trong form để sửa. Nút Xong đóng sau khi lưu thành công.
- 12 họa tiết SVG bo tròn và icon ghim mềm mại, không phụ thuộc ảnh bên ngoài. Hướng dẫn viết lại ngắn gọn.
- Thanh tiến độ tải Tài nguyên chỉ xuất hiện trong lúc tải.

Kiểm tra: `npm run build && npm test`. Kiểm tra tương tác bằng `node tests/workflow111-browser.mjs` khi có Playwright/Chromium; biến PLAYWRIGHT_MODULE và CHROMIUM_PATH có thể trỏ tới runtime có sẵn.


## v1.11.1

Đếm ghi chú theo từ khóa; tinh chỉnh lịch sử 7 ngày, Nhắc tôi, Đồng bộ ngay, danh sách và gạch ngang trên mobile. Gom tùy chọn thẻ trong menu Hiển thị. Giữ thông báo đã xem và chỉ hiện lại khi có nội dung mới. Đổi tên hiển thị cột theo dự án, giữ nguyên mã trạng thái để tiến độ và checklist hoạt động đúng.


## v1.11.2 · Rà soát và dọn mã

Chuẩn hóa định dạng module workflow và helper quản lý tệp. Gom các lớp render/noteForm trùng trong workflow; bỏ lần render trung gian. Hủy listener định dạng khi đóng form; xóa mục tiêu kéo cũ khi con trỏ rời vùng hợp lệ; bỏ lưu thừa khi thả vào chính thẻ đó. Kiểm tra columnNames ở cả client và server. Các lớp giao diện 1.x khác vẫn được giữ để tránh thay đổi hành vi ngoài phạm vi rà soát này.

## v1.12.0 · Không gian làm việc liền mạch

Bổ sung mẫu task, bình luận nhanh, liên kết ghi chú với task và dự án, chọn trạng thái bằng nhãn, lịch sử ghi chú trong trình soạn thảo và thao tác nhiều task. Cải thiện vị trí checklist, trạng thái đồng bộ và hiển thị tệp.

## v1.12.1 · Gọn bộ lọc, rõ công việc

Bộ lọc bật/tắt; thao tác hàng loạt xuất hiện khi chọn task. Liên kết chỉ thao tác trong ghi chú. Bình luận rộng hơn, nút canh phải. Mặc định checklist trên Kanban; ghi nhớ góc nhìn/dự án và làm nổi tab hiện tại. Từ khóa tìm kiếm có tô sáng và nhãn nguồn.

## v1.13.0 · Một việc mỗi lúc

Màn hình tập trung gom việc đến hạn, quá hạn và ba gợi ý theo mức ưu tiên. Khi chọn một việc chỉ giữ dự án, task/checklist và ghi chú liên quan. Hiển thị ghi chú liên kết trong dự án, hỗ trợ định dạng mô tả dự án và thu gọn lựa chọn liên kết trước nút Xong.

## v1.13.1 · Gọn lựa chọn, rõ trạng thái

Bộ lọc dùng nhãn màu bo tròn; Cài đặt chia nhóm; nút thêm checklist canh phải. Dọn Thùng rác chờ đồng bộ đang chạy, chủ động thử lại bản bị chặn và trả kết quả; bảo vệ khi tài khoản đổi hoặc lưu cục bộ lỗi.

## v1.13.2 · Bảo vệ bản nháp

Giữ bản nháp không hợp lệ thay vì ghi đè khi đăng nhập lại, cung cấp bản sao JSON; phân biệt nguyên nhân báo đồng bộ và cho phép xem lịch sử máy chủ khi còn thay đổi chưa gửi. Hoàn thiện giao diện bộ lọc, tập trung và liên kết công việc.

## v1.13.3 · Khôi phục mốc đồng bộ

Phân biệt INVALID_REVISION và INVALID_WORKSPACE. Mốc phiên bản cục bộ không hợp lệ được đối chiếu/hợp nhất qua bản gốc; khi không thể hợp nhất sẽ giữ bản nháp và báo xung đột. Báo cáo đồng bộ hiển thị mã HTTP, mã lỗi và thông báo cụ thể.
