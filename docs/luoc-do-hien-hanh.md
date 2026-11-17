# Lược đồ cơ sở dữ liệu hiện hành

> Tệp này được **sinh tự động** bởi `node scripts/schema-doc.mjs` từ `tests/fixtures/schema-base-v1.sql` và chuỗi migration. Đừng sửa tay: `tests/schema-sync.mjs` sinh lại và so sánh.

## Quy tắc

1. **Nguồn sự thật của D1 là thư mục `migrations/`.** Các tệp trong đó đã áp dụng lên production và có dấu vết (mã băm) ở `migrations/production-receipt.json`; không sửa, không đổi tên, không xóa.
2. **`server/schema.sql`** là bản dựng sẵn toàn bộ lược đồ cho cơ sở dữ liệu mới và cho các bài kiểm tra. Nó phải luôn **giống hệt** kết quả của “lược đồ gốc + mọi migration” (kể cả thứ tự cột): `tests/schema-sync.mjs` kiểm điều này.
3. **Các tệp `server/migration-*.sql`** là lịch sử từ trước khi có thư mục `migrations/` (đều đã áp dụng lên production). Không còn dùng để triển khai, không sửa, không xóa (nhiều tài liệu và ghi chú phát hành cũ nhắc tới chúng). Hai tệp trong số đó chỉ là bản sao từng chữ của tệp trong `migrations/`.
4. **Thêm bảng hoặc cột** = tạo tệp SQL **mới** `migrations/NNNN_ten.sql` (chỉ cộng thêm: `CREATE … IF NOT EXISTS`, hoặc `ALTER TABLE … ADD COLUMN` có giá trị mặc định; không `DROP`, không đổi kiểu, không xóa dữ liệu). Sau đó: (a) cập nhật `server/schema.sql` cho khớp, cột mới nằm **cuối** bảng như `ALTER` tạo ra; (b) thêm tệp mới vào danh sách `MIGRATIONS` ở `scripts/schema-model.mjs`; (c) chạy `node scripts/schema-doc.mjs`; (d) áp dụng lên D1 bằng Wrangler hoặc Cloudflare API, cập nhật `migrations/production-receipt.json` sau khi xác nhận; (e) làm mới `docs/d1-production-snapshot.json`.
5. Lược đồ gốc (`tests/fixtures/schema-base-v1.sql`) là bản dựng lại phần có trước mọi migration; **không sửa** khi thêm bảng hay cột.

## Chuỗi migration (theo thứ tự áp dụng)

| # | Tệp | Thêm gì |
| --- | --- | --- |
| 1 | `server/migration-1.3.sql` | bảng `board_shares`, bảng `object_files`, bảng `object_parts`, cột `attachments.deleted`, chỉ mục `object_owner_scope` |
| 2 | `server/migration-1.4.sql` | bảng `notification_jobs`, bảng `notification_preferences`, bảng `report_snapshots` |
| 3 | `server/migration-1.4.1.sql` | cột `notification_jobs.html` |
| 4 | `server/migration-1.8.0.sql` | bảng `report_shares`, chỉ mục `report_shares_expiry`, chỉ mục `report_shares_owner` |
| 5 | `server/migration-note-versions.sql` | bảng `note_versions`, chỉ mục `note_versions_saved` |
| 6 | `server/migration-notification-receipts.sql` | bảng `notification_receipts` |
| 7 | `server/migration-reminder-schedule.sql` | bảng `note_reminder_schedule`, chỉ mục `note_reminder_due`, chỉ mục `notification_jobs_pending`, trigger `note_schedule_delete`, trigger `note_schedule_insert`, trigger `note_schedule_update` |
| 8 | `server/migration-weekly-day.sql` | cột `notification_preferences.weekly_day` |
| 9 | `migrations/0002_remember_device.sql` | cột `sessions.remembered`, cột `sessions.reauth_at` |
| 10 | `migrations/0001_workspace_entities.sql` | bảng `workspace_entities`, bảng `workspace_pending`, bảng `workspace_state`, bảng `workspace_transfers` |

Bản sao từng chữ: `server/migration-remember-device.sql` ≡ `migrations/0002_remember_device.sql`; `server/migration-workspace-v2.sql` ≡ `migrations/0001_workspace_entities.sql`.

## Đối chiếu với D1 production

Ảnh chụp ngày 2026-11-18 (`docs/d1-production-snapshot.json`, truy vấn chỉ-đọc, không đọc dữ liệu người dùng): 24 bảng ứng dụng, 13 chỉ mục, 3 trigger, **khớp từng cột (kiểu, bắt buộc, mặc định, khóa chính, thứ tự)** với `server/schema.sql`. Phát hiện duy nhất khi đối chiếu: cột `weekly_day` của `notification_preferences` nằm cuối bảng trên D1 (do `ALTER`), còn `schema.sql` cũ đặt giữa bảng; đã sửa `schema.sql` cho giống D1 (chỉ ảnh hưởng cơ sở dữ liệu mới, không đụng D1).

Trên D1 còn có các bảng **ngoài ứng dụng** (không do mã của kho này tạo hay dùng; không được xóa hay sửa từ kho này):

- `d1_migrations`: Bảng hệ thống của Wrangler/D1 ghi các migration đã áp dụng.
- `zen_ai_budget`: Không có trong mã của kho này (không tệp SQL, không câu lệnh nào dùng).
- `zen_ai_feedback`: Không có trong mã của kho này.
- `zen_ai_owner`: Không có trong mã của kho này.
- `zen_ai_reports`: Không có trong mã của kho này.

## Bảng

### `attachments` — nguồn: gốc

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | không | — | có (1) | gốc |
| `user_id` | TEXT | có | — |  | gốc |
| `project_id` | TEXT | có | — |  | gốc |
| `task_id` | TEXT | có | `''` |  | gốc |
| `name` | TEXT | có | — |  | gốc |
| `content` | TEXT | có | — |  | gốc |
| `size` | INTEGER | có | — |  | gốc |
| `created` | INTEGER | có | — |  | gốc |
| `deleted` | INTEGER | có | `0` |  | `server/migration-1.3.sql` |

khóa ngoại `user_id→users.id CASCADE`.

### `board_shares` — nguồn: `server/migration-1.3.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `token_hash` | TEXT | không | — | có (1) | `server/migration-1.3.sql` |
| `user_id` | TEXT | có | — |  | `server/migration-1.3.sql` |
| `data` | TEXT | có | — |  | `server/migration-1.3.sql` |
| `expires` | INTEGER | có | — |  | `server/migration-1.3.sql` |

khóa ngoại `user_id→users.id CASCADE`.

### `deliveries` — nguồn: gốc

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | có | — | có (1) | gốc |
| `day` | TEXT | có | — | có (2) | gốc |
| `channel` | TEXT | có | — | có (3) | gốc |
| `status` | TEXT | có | — |  | gốc |

### `note_reminder_schedule` — nguồn: `server/migration-reminder-schedule.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | có | — | có (1) | `server/migration-reminder-schedule.sql` |
| `note_id` | TEXT | có | — | có (2) | `server/migration-reminder-schedule.sql` |
| `fire_at` | INTEGER | có | — |  | `server/migration-reminder-schedule.sql` |
| `expires` | INTEGER | có | — |  | `server/migration-reminder-schedule.sql` |
| `schedule_key` | TEXT | có | — |  | `server/migration-reminder-schedule.sql` |
| `payload` | TEXT | có | — |  | `server/migration-reminder-schedule.sql` |
| `queued` | INTEGER | có | `0` |  | `server/migration-reminder-schedule.sql` |

### `note_versions` — nguồn: `server/migration-note-versions.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | có | — | có (1) | `server/migration-note-versions.sql` |
| `note_id` | TEXT | có | — | có (2) | `server/migration-note-versions.sql` |
| `revision` | INTEGER | có | — | có (3) | `server/migration-note-versions.sql` |
| `saved` | INTEGER | có | — |  | `server/migration-note-versions.sql` |
| `data` | TEXT | có | — |  | `server/migration-note-versions.sql` |

### `notification_jobs` — nguồn: `server/migration-1.4.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | có | — | có (1) | `server/migration-1.4.sql` |
| `day` | TEXT | có | — | có (2) | `server/migration-1.4.sql` |
| `channel` | TEXT | có | — | có (3) | `server/migration-1.4.sql` |
| `subject` | TEXT | có | — |  | `server/migration-1.4.sql` |
| `body` | TEXT | có | — |  | `server/migration-1.4.sql` |
| `snapshot` | TEXT | có | `''` |  | `server/migration-1.4.sql` |
| `status` | TEXT | có | `'pending'` |  | `server/migration-1.4.sql` |
| `lease_until` | INTEGER | có | `0` |  | `server/migration-1.4.sql` |
| `attempts` | INTEGER | có | `0` |  | `server/migration-1.4.sql` |
| `last_error` | TEXT | có | `''` |  | `server/migration-1.4.sql` |
| `html` | TEXT | có | `''` |  | `server/migration-1.4.1.sql` |

### `notification_preferences` — nguồn: `server/migration-1.4.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | không | — | có (1) | `server/migration-1.4.sql` |
| `weekly_reports` | INTEGER | có | `0` |  | `server/migration-1.4.sql` |
| `weekly_hour` | INTEGER | có | `8` |  | `server/migration-1.4.sql` |
| `repeat_alerts` | INTEGER | có | `1` |  | `server/migration-1.4.sql` |
| `weekly_day` | INTEGER | có | `0` |  | `server/migration-weekly-day.sql` |

khóa ngoại `user_id→users.id CASCADE`; ràng buộc `CHECK(weekly_day BETWEEN 0 AND 6)`.

### `notification_receipts` — nguồn: `server/migration-notification-receipts.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | có | — | có (1) | `server/migration-notification-receipts.sql` |
| `receipt_key` | TEXT | có | — | có (2) | `server/migration-notification-receipts.sql` |
| `read_at` | INTEGER | có | — |  | `server/migration-notification-receipts.sql` |

khóa ngoại `user_id→users.id CASCADE`.

### `object_files` — nguồn: `server/migration-1.3.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | không | — | có (1) | `server/migration-1.3.sql` |
| `user_id` | TEXT | có | — |  | `server/migration-1.3.sql` |
| `object_key` | TEXT | có | — |  | `server/migration-1.3.sql` |
| `upload_id` | TEXT | có | — |  | `server/migration-1.3.sql` |
| `name` | TEXT | có | — |  | `server/migration-1.3.sql` |
| `mime` | TEXT | có | — |  | `server/migration-1.3.sql` |
| `size` | INTEGER | có | — |  | `server/migration-1.3.sql` |
| `scope` | TEXT | có | — |  | `server/migration-1.3.sql` |
| `state` | TEXT | có | — |  | `server/migration-1.3.sql` |
| `created` | INTEGER | có | — |  | `server/migration-1.3.sql` |
| `deleted` | INTEGER | có | `0` |  | `server/migration-1.3.sql` |

khóa ngoại `user_id→users.id CASCADE`.

### `object_parts` — nguồn: `server/migration-1.3.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `file_id` | TEXT | có | — | có (1) | `server/migration-1.3.sql` |
| `part` | INTEGER | có | — | có (2) | `server/migration-1.3.sql` |
| `etag` | TEXT | có | — |  | `server/migration-1.3.sql` |

### `profiles` — nguồn: gốc

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | không | — | có (1) | gốc |
| `name` | TEXT | có | `''` |  | gốc |
| `birthday` | TEXT | có | `''` |  | gốc |
| `avatar` | TEXT | có | `''` |  | gốc |

khóa ngoại `user_id→users.id CASCADE`.

### `rate_limits` — nguồn: gốc

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `key` | TEXT | không | — | có (1) | gốc |
| `count` | INTEGER | có | — |  | gốc |
| `expires` | INTEGER | có | — |  | gốc |

### `reminder_settings` — nguồn: gốc

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | không | — | có (1) | gốc |
| `hour` | INTEGER | có | `8` |  | gốc |
| `interval_days` | INTEGER | có | `1` |  | gốc |

khóa ngoại `user_id→users.id CASCADE`.

### `report_shares` — nguồn: `server/migration-1.8.0.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | không | — | có (1) | `server/migration-1.8.0.sql` |
| `token_hash` | TEXT | có | — |  | `server/migration-1.8.0.sql` |
| `user_id` | TEXT | có | — |  | `server/migration-1.8.0.sql` |
| `title` | TEXT | có | — |  | `server/migration-1.8.0.sql` |
| `html` | TEXT | có | — |  | `server/migration-1.8.0.sql` |
| `password_hash` | TEXT | có | `''` |  | `server/migration-1.8.0.sql` |
| `created` | INTEGER | có | — |  | `server/migration-1.8.0.sql` |
| `expires` | INTEGER | có | — |  | `server/migration-1.8.0.sql` |

khóa ngoại `user_id→users.id CASCADE`.

### `report_snapshots` — nguồn: `server/migration-1.4.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | có | — | có (1) | `server/migration-1.4.sql` |
| `day` | TEXT | có | — | có (2) | `server/migration-1.4.sql` |
| `data` | TEXT | có | — |  | `server/migration-1.4.sql` |

### `sessions` — nguồn: gốc

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `token_hash` | TEXT | không | — | có (1) | gốc |
| `user_id` | TEXT | có | — |  | gốc |
| `expires` | INTEGER | có | — |  | gốc |
| `remembered` | INTEGER | có | `0` |  | `migrations/0002_remember_device.sql` |
| `reauth_at` | INTEGER | có | `0` |  | `migrations/0002_remember_device.sql` |

### `subscriptions` — nguồn: gốc

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `endpoint` | TEXT | không | — | có (1) | gốc |
| `user_id` | TEXT | có | — |  | gốc |

### `tokens` — nguồn: gốc

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `token_hash` | TEXT | không | — | có (1) | gốc |
| `user_id` | TEXT | có | — |  | gốc |
| `kind` | TEXT | có | — |  | gốc |
| `expires` | INTEGER | có | — |  | gốc |

### `users` — nguồn: gốc

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | không | — | có (1) | gốc |
| `email` | TEXT | có | — |  | gốc |
| `password_hash` | TEXT | có | — |  | gốc |
| `verified` | INTEGER | không | `0` |  | gốc |
| `email_reminders` | INTEGER | không | `0` |  | gốc |
| `created` | INTEGER | có | — |  | gốc |

### `workspace_entities` — nguồn: `migrations/0001_workspace_entities.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | có | — | có (1) | `migrations/0001_workspace_entities.sql` |
| `entity_key` | TEXT | có | — | có (2) | `migrations/0001_workspace_entities.sql` |
| `data` | TEXT | có | — |  | `migrations/0001_workspace_entities.sql` |

### `workspace_pending` — nguồn: `migrations/0001_workspace_entities.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | có | — | có (1) | `migrations/0001_workspace_entities.sql` |
| `upload_id` | TEXT | có | — | có (2) | `migrations/0001_workspace_entities.sql` |
| `entity_key` | TEXT | có | — | có (3) | `migrations/0001_workspace_entities.sql` |
| `data` | TEXT | có | — |  | `migrations/0001_workspace_entities.sql` |

### `workspace_state` — nguồn: `migrations/0001_workspace_entities.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | không | — | có (1) | `migrations/0001_workspace_entities.sql` |
| `revision` | INTEGER | có | — |  | `migrations/0001_workspace_entities.sql` |
| `nonce` | TEXT | có | — |  | `migrations/0001_workspace_entities.sql` |
| `total_bytes` | INTEGER | có | `0` |  | `migrations/0001_workspace_entities.sql` |

### `workspace_transfers` — nguồn: `migrations/0001_workspace_entities.sql`

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | không | — | có (1) | `migrations/0001_workspace_entities.sql` |
| `upload_id` | TEXT | có | — |  | `migrations/0001_workspace_entities.sql` |
| `revision` | INTEGER | có | — |  | `migrations/0001_workspace_entities.sql` |
| `expected` | INTEGER | có | — |  | `migrations/0001_workspace_entities.sql` |
| `expires` | INTEGER | có | — |  | `migrations/0001_workspace_entities.sql` |

### `workspaces` — nguồn: gốc

| Cột | Kiểu | Bắt buộc | Mặc định | Khóa chính | Nguồn |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | không | — | có (1) | gốc |
| `data` | TEXT | có | — |  | gốc |
| `revision` | INTEGER | không | `0` |  | gốc |

## Chỉ mục

| Chỉ mục | Bảng | Nguồn |
| --- | --- | --- |
| `attachments_owner` | `attachments` | gốc |
| `note_reminder_due` | `note_reminder_schedule` | `server/migration-reminder-schedule.sql` |
| `note_versions_saved` | `note_versions` | `server/migration-note-versions.sql` |
| `notification_jobs_pending` | `notification_jobs` | `server/migration-reminder-schedule.sql` |
| `object_owner_scope` | `object_files` | `server/migration-1.3.sql` |
| `rate_limits_expires` | `rate_limits` | gốc |
| `report_shares_expiry` | `report_shares` | `server/migration-1.8.0.sql` |
| `report_shares_owner` | `report_shares` | `server/migration-1.8.0.sql` |
| `sessions_expires` | `sessions` | gốc |
| `sessions_user` | `sessions` | gốc |
| `subscriptions_user` | `subscriptions` | gốc |
| `tokens_expires` | `tokens` | gốc |
| `tokens_user_kind` | `tokens` | gốc |

## Trigger

| Trigger | Bảng | Nguồn | Việc làm |
| --- | --- | --- | --- |
| `note_schedule_delete` | `workspaces` | `server/migration-reminder-schedule.sql` | Xóa lịch nhắc khi xóa không gian làm việc |
| `note_schedule_insert` | `workspaces` | `server/migration-reminder-schedule.sql` | Dựng lại lịch nhắc ghi chú khi thêm dữ liệu không gian làm việc |
| `note_schedule_update` | `workspaces` | `server/migration-reminder-schedule.sql` | Dựng lại lịch nhắc ghi chú khi dữ liệu thay đổi |
