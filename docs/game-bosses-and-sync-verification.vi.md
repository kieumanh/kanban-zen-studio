# Game Mode 0.7 — 100 bộ boss SVG và kiểm chứng hai thiết bị

## Đã triển khai

100 bộ nhân vật boss vector SVG có bộ phận chuyển động, theo ID/name của catalog. Mỗi bộ có cấu hình tạo hình, phụ kiện, hoa văn, sắc màu và nhịp chuyển động; sử dụng hệ rig/chuyển động chung để giữ phong cách và bảo trì. Đây là đồ họa vector chibi trong game, không phải 100 bộ sprite bitmap vẽ tay nhiều frame.

Tám trạng thái: idle/chờ; appear/xuất hiện; challenge/ra đề; progress/theo dõi; encourage/cổ vũ; timeout/hết giờ; celebrate/chúc mừng; ascend/thăng giới. Bộ dựng có hỗ trợ prefers-reduced-motion và thiết lập tắt chuyển động. Tạm dừng hoạt ảnh nền khi mở hộp thoại.

- Định nghĩa: dist/game/boss-definitions.mjs
- Renderer: dist/game/boss-art.mjs
- 100 tệp độc lập: dist/game/boss-art/boss-001.svg ... boss-100.svg
- Danh mục: dist/game/boss-art/manifest.json
- Build lại: node scripts/build-boss-art.mjs
- Xem: Game Mode → Bách đại thủ quan → Xem 8 hoạt ảnh.

Đã gắn boss vào cửa ải và màn hình thi. Không thêm sách/kỹ năng/vật phẩm ngoài nội dung người dùng cung cấp.

## Phát hiện và sửa đồng bộ

Three-way merge tổng quát trước đây có thể hợp nhất hai mảng giao dịch khác ID, dẫn đến cả hai giao dịch cùng tiêu từ một số dư cũ. Riêng game nay được xem là một phần dữ liệu nguyên tử khi có thay đổi cạnh tranh: không tự merge hai hành trình khác nhau. Workspace revision/CAS chỉ chốt một bản; thiết bị còn lại giữ bản nháp và chuyển sang xử lý xung đột.

Khi chọn dùng bản máy chủ, bản cục bộ được lưu trong IndexedDB với khóa recovery trước khi thay. Đây là chọn một phiên bản, không tự giữ đồng thời mọi giao dịch của hai bên. Nếu muốn gửi lại giao dịch bị bỏ, cần tạo thao tác mới từ số dư đã cập nhật.

Khóa sử dụng/trang bị tài sản khi còn offline, dirty hoặc có xung đột; cập nhật lại cửa sổ game khi poll nhận root game mới. Mua offline vẫn là bản nháp chờ hợp nhất.

## Môi trường và bằng chứng

Hai Chromium BrowserContext độc lập: desktop 1440px và mobile 390px, cookie phiên và IndexedDB riêng, dùng cùng tài khoản tổng hợp. Gọi Worker/API thật trên HTTP server local, SQLite in-memory qua adapter D1, không mock nội dung phản hồi API. Test server chuẩn hóa Origin sang hostname cấu hình để dùng API gốc trong fixture localhost; đây không phải phép thử CSRF. Không truy cập dữ liệu thật của người dùng.

tests/game-two-device.mjs kiểm tra:
1. Hai thiết bị nhận cùng tài khoản và số dư.
2. Hai bản nháp mua sách 20 điểm khi mỗi bên thấy 25 điểm, mất mạng độc lập.
3. A lên mạng ghi đúng một lần, còn 5 điểm và một tài sản.
4. B lên mạng bị chặn xung đột, server không âm điểm hoặc thêm tài sản; bản nháp B còn nguyên.
5. Chọn máy chủ rõ ràng; giữ recovery B trong IndexedDB.
6. Gửi lại gói revision cũ nhận 409, không phát sinh lần trừ/asset mới.
7. Thành quả task mới từ A đồng bộ sang B, không lặp giao dịch mua.
8. Reload B khôi phục đúng giao dịch và kho.

tests/boss-art-browser.mjs kiểm tra 100 hình khác nhau sau khi bỏ tên/ID khỏi hash; 800 tổ hợp boss/trạng thái được dựng trong browser; nút chuyển trạng thái mẫu ở boss 1,50,100; reduced motion không còn animation.

Bằng chứng máy đọc: qa/game-two-device-report.json và qa/boss-art-report.json. Chạy bằng node tests/game-two-device.mjs và node tests/boss-art-browser.mjs (cần Playwright/Chromium).

## Giới hạn được giữ rõ

Đây là xác minh bằng hai phiên thiết bị độc lập trong trình duyệt, chưa chạy trên hai máy vật lý hay APK/EXE thật. Sổ giao dịch vẫn nằm trong workspace tự quản; chưa chuyển sang server-authoritative ledger chống tự sửa dữ liệu. Không tuyên bố giao dịch offline đã được máy chủ chốt trước khi đồng bộ. Chưa triển khai Production trong lượt thay đổi này.
