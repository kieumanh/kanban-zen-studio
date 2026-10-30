# Trung Hoa Anh Hùng Truyện — Game Mode 0.7

Nền Kanban Zen Studio 1.15.26, nhánh `experiment/game-mode`. Không triển khai production.

## Chạy thử

```sh
npm ci
npm run build
python3 -m http.server 8080 --directory public
```

Mở `http://localhost:8080/game-preview.html` để dùng bản minh họa độc lập. Dữ liệu này chỉ lưu trong phiên tab trình duyệt, không cần đăng nhập và không ghi vào tài khoản thật.

Để dùng với tài khoản Kanban trên môi trường Worker thử nghiệm đã cấu hình riêng: đăng nhập, chọn **Game Mode · Nhập giang hồ**. Lần đầu tạo baseline, không cộng hồi tố dữ liệu cũ. Không deploy với tên Worker/database production.

## Có thể thao tác

- Đặt tên, chọn nam/nữ; hoạt ảnh CSS nhẹ trên bộ tạo hình nhân vật, sáu tư thế có sẵn. Chưa phải bộ sprite đi lại nhiều frame.
- Mười chương truyện nguyên bản, 100 cửa boss từ catalog; mốc 100 phong Thần, chuyển đỉnh mới với chi phí cấp gấp đôi đỉnh trước.
- Nội lực nhân đôi từng cấp đúng yêu cầu, số nguyên BigInt; chín trục, phân bổ 70/30, progress bar, điều chỉnh sau undo, không thưởng lặp.
- Task/dự án có cấu hình trục, thời lượng; bốc đề ngẫu nhiên, giới hạn thời gian theo mật độ +20–30%, đổi hạn có lịch sử, luyện tập, thắng/thua và kho mở theo cửa.
- Tiêu dùng có ghi chú, số dư trước/sau, tài sản tự nhập, danh mục JSON do người dùng cung cấp, mua sách/vật phẩm, lĩnh ngộ khi có công dụng do người dùng ghi, trang bị một bí kíp, hoàn tác chưa sử dụng.
- Nhật ký, tổng kết 7 ngày, bế quan, giảm chuyển động, âm báo chủ động, ẩn trục, xuất JSON và tra bảng 100 cấp.
- Game nằm trong root workspace, dùng sẵn IndexedDB và đồng bộ revision của Kanban. Dữ liệu game có validation phía server, chưa có ledger máy chủ chống tự sửa điểm. Xung đột root game dùng cơ chế xung đột workspace; không quảng bá tự merge hai giao dịch chi trùng một cách bảo đảm.

## Còn giới hạn

Đã có 100 boss SVG riêng với tám trạng thái mỗi bộ, dùng bộ rig chuyển động chung. Xem docs/game-bosses-and-sync-verification.vi.md. Bản đồ dùng giao diện thẻ, chưa phải cảnh tự do điều khiển. Không tự sinh kỹ năng/vật phẩm/linh thú. Vòng thi và XP là dữ liệu tự quản; chưa xác thực timestamp offline bằng máy chủ. Đã xác minh hai BrowserContext desktop/mobile với Worker API và SQLite kiểm thử; chưa thử trên hai máy vật lý trước production.

`progression.mjs` trong thư mục experiments là thí nghiệm cân bằng cũ, **không được runtime sử dụng**. Mã hiện hành ở `dist/game/core.mjs`.

## Kiểm tra

```sh
npm run lint
npm run format:check
npm run build
npm test
node tests/game-mode.mjs
node tests/game-mode-browser.mjs
```

Browser test dùng Playwright/Chromium. Workflow `game-mode.yml` chỉ kiểm tra, không deploy, không cần Cloudflare secrets.
