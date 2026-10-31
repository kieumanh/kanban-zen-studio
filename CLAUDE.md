# CLAUDE.md: Kanban Zen Studio

Tệp này là hướng dẫn làm việc cho Claude (và cho bất kỳ ai) trong repo này. Đọc hết trước khi sửa bất cứ thứ gì.

## Làm việc cùng Mạnh

Mạnh là nhà thiết kế giải pháp, không chuyên về code: Mạnh định hướng, Claude viết và kiểm tra code.

- Trả lời bằng tiếng Việt đơn giản, tránh thuật ngữ khi chưa giải thích.
- Việc không nhỏ: trình kế hoạch trước, chờ Mạnh duyệt rồi mới sửa.
- Điều cần Mạnh quyết thì đưa thành lựa chọn rõ ràng, kèm một khuyến nghị.
- Kết thúc mỗi phiên bằng: đã làm gì, đã kiểm tra gì, còn chờ Mạnh điều gì.

## 6 nguyên tắc bất biến

1. Không làm mất hay đổi dữ liệu người dùng; không migration phá hủy.
2. Không sửa `migrations/` đã áp dụng hoặc `production-receipt.json`; schema mới là file SQL mới, chờ Mạnh xác nhận.
3. Không deploy, không đụng secrets; biến môi trường mới phải có mặc định an toàn.
4. Không sửa test chỉ để cho xanh.
5. Mỗi phiên bản chỉ một nhóm việc, có số phiên bản và ghi chú phát hành riêng.
6. Giao diện tiếng Việt thống nhất, tối giản, bo tròn, kiểm tra ở 390/820/1440px.

Các mục dưới đây giải thích cách áp dụng, không thay thế 6 nguyên tắc trên.

## Quy trình một phiên bản

1. Xác định đúng **một** nhóm việc. Yêu cầu có nhiều nhóm thì đề xuất tách thành nhiều phiên bản.
2. Trình kế hoạch, chờ duyệt.
3. Làm trên nhánh riêng, mở Pull Request vào `main`. Không push thẳng vào `main`.
4. Chạy đủ bộ kiểm tra (mục "Lệnh thường dùng") và báo kết quả thật.
5. Nâng số phiên bản trong `package.json` và `package-lock.json`, viết ghi chú `docs/release-notes/<số phiên bản>.md`.
6. Mạnh là người xem xét và bấm merge.

## Lệnh thường dùng

Cần Node 24 (test dùng `node:sqlite`).

| Việc | Lệnh |
| --- | --- |
| Cài công cụ | `npm ci` |
| Lint | `npm run lint` |
| Kiểm tra định dạng | `npm run format:check` |
| Build Worker | `node scripts/build.mjs` |
| Chạy toàn bộ test | `npm test` |

Test giao diện (`tests/*-browser.mjs`) cần Playwright, không nằm trong `package.json`:
`npm install --no-save --package-lock=false playwright`, rồi `npx playwright install chromium`.
Sau đó chạy `node tests/workflow111-browser.mjs`, `node tests/report-layout-browser.mjs`, `node tests/offline-browser.mjs`.
Có thể đặt `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`; `QA_WIDTHS=390,820,1440` chọn độ rộng. Ảnh chụp lưu ở `qa/`.

Test giao diện của Game Mode (`game-mode-browser.mjs`, `game-two-device.mjs`, `boss-art-browser.mjs`) hiện chỉ chạy trong `game-mode.yml` trên nhánh `experiment/game-mode`; chúng **không** nằm trong 3 check bắt buộc của Pull Request. Đổi giao diện hoặc logic game thì chạy tay theo cùng cách cài Playwright ở trên.

## Bản đồ thư mục

- `dist/`: giao diện chạy trên trình duyệt (HTML, CSS, JS). Sửa giao diện ở đây. `dist/game/` là giao diện Game Mode.
- `server/`: backend Cloudflare Worker (`api.mjs` và các module; `game-validation.mjs` kiểm tra dữ liệu Game Mode). `server/schema.sql` là schema cho database mới; các `server/migration-*.sql` là lịch sử cũ.
- `migrations/`: migration D1 có phiên bản (`0001`, `0002`...) và `production-receipt.json`.
- `scripts/`: build, kiểm tra production, dữ liệu trích dẫn.
- `tests/`: test. Tệp `*-browser.mjs` chạy bằng Playwright.
- `docs/`: tài liệu vận hành, các bản review và hướng sản phẩm Game Mode (`docs/game-mode/`).
- `experiments/game-mode/`: mã thử nghiệm và danh sách boss của Game Mode.
- `.github/workflows/`: `pull-request.yml` (kiểm tra Pull Request), `build-worker.yml` (kiểm tra rồi deploy production khi vào `main`), `game-mode.yml` (kiểm tra nhánh `experiment/game-mode`), `export-source.yml`, `notes-196.yml` (cũ).
- `wrangler.jsonc`: cấu hình Cloudflare (D1, R2, cron, tên miền `kanban.huongthiennature.com`).
- Tệp **sinh ra khi build**, đã nằm trong `.gitignore`, không sửa tay: `public/`, `worker.mjs`, `worker-api.mjs`. Thư mục `qa/` cũng do test giao diện tạo ra; hai file báo cáo `.json` trong đó đã được git theo dõi từ trước, đừng sửa tay.

## Dữ liệu và migration

- Chỉ thêm, không phá: không `DROP`, `TRUNCATE`, xóa dòng hàng loạt, hay đổi kiểu cột làm mất dữ liệu. Thêm cột phải có giá trị mặc định.
- Không sửa, đổi tên, xóa file đã có trong `migrations/`. Không sửa `production-receipt.json`.
- Cần đổi schema: tạo file SQL mới với số tiếp theo (ví dụ `0003_ten_ngan.sql`), mô tả tác động, rồi **dừng chờ Mạnh xác nhận**.
- Không chạy migration lên production, không dùng Cloudflare API để ghi dữ liệu.
- Pull Request tự động bị chặn nếu sửa hoặc xóa file migration cũ; thêm file SQL mới hoặc đổi receipt chỉ bị cảnh báo để Mạnh xác nhận.

## Deploy và bí mật

- Merge vào `main` tự động deploy production nếu thay đổi chạm các đường dẫn: `dist/`, `server/`, `scripts/`, `tests/`, `wrangler.jsonc`, `package.json`, `.github/workflows/build-worker.yml`. Vì vậy đổi số phiên bản cũng kích hoạt deploy.
- Claude không chạy `wrangler deploy`, không chạy workflow deploy, không merge thay Mạnh.
- Không đọc, ghi, in ra, hay đưa vào chat và file các secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_D1_API_TOKEN`, `RESEND_API_KEY`, `VAPID_PRIVATE`.
- Biến môi trường mới phải có mặc định an toàn: code chạy đúng khi biến chưa được đặt, và tính năng mới tắt theo mặc định.

## Test

- Test đỏ: tìm nguyên nhân trong mã. Chỉ sửa test khi yêu cầu thật sự đổi hành vi, và nói rõ lý do trong kế hoạch.
- Không xóa test, không `skip`, không nới lỏng điều kiện kiểm tra để cho xanh.
- Việc chạm vào giao diện: chạy test giao diện và xem ảnh ở 390, 820, 1440px.

## Giao diện

Tiếng Việt thống nhất, tối giản, bo tròn. Không thêm chữ tiếng Anh vào giao diện trừ tên riêng. Kiểm tra bố cục ở 390 (điện thoại), 820 (máy tính bảng), 1440px (máy tính).

## Pull Request

- Một PR là một phiên bản và một nhóm việc. Đặt tên nhánh theo mã Backlog hoặc số phiên bản, ví dụ `p0-1-ha-tang-pr`.
- Mô tả PR bằng tiếng Việt: đổi gì, đã kiểm tra gì, cần Mạnh xác nhận gì.
- Ba check bắt buộc: **Kiểm tra mã nguồn**, **Giao diện 390-820-1440px**, **Chốt chặn migration** (xem `.github/workflows/pull-request.yml` và `docs/bao-ve-nhanh-main.md`).

## Việc tồn đọng đã biết (chưa xử lý, mỗi việc cần phiên riêng)

- `.github/workflows/notes-196.yml` tự `git push`; sẽ xung đột khi `main` được bảo vệ.
- `README.md` vẫn ghi tiêu đề v1.13.3.
- `docs/production-deployment.md` nhắc bước "synchronize generated Worker" không còn trong workflow.
