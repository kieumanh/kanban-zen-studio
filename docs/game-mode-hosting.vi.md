# Website Game Mode riêng

- Nhánh triển khai: experiment/game-mode.
- Tên miền: https://kanban.gamemode.huongthiennature.com
- Worker giao diện: kanban-zen-gamemode.
- Cấu hình: wrangler.gamemode.jsonc; entrypoint worker-gamemode.mjs.
- Backend qua service binding BACKEND: kanban-zen-studio.

Giao diện được build độc lập từ nhánh Game Mode, không deploy lại Worker Production chính. Dùng chung tài khoản, dự án, tài nguyên và dữ liệu đồng bộ Kanban hiện có. Thao tác trên dữ liệu tài khoản ở bản này sẽ được đồng bộ với các thiết bị/website Kanban khác; đây không phải bản sao cơ sở dữ liệu để thử dữ liệu phá hủy.

API proxy chỉ gọi service cố định, kiểm tra Origin của tên miền Game Mode và đổi Origin ở yêu cầu nội bộ về backend đã cấu hình. Không mở CORS tùy ý. Cookie đăng nhập giữ host-only, Secure và HttpOnly. Không sao chép secret email/push vào Worker mới; backend xử lý email như trước. Liên kết xác minh/khôi phục trong email vẫn dẫn tới website Kanban chính vì dùng chung hệ tài khoản.

Workflow deploy-gamemode.yml chỉ chạy trên experiment/game-mode, có kiểm tra Worker/domain đích trước khi deploy. Không đổi wrangler.jsonc hoặc workflow production.

Chạy: node scripts/build-gamemode.mjs, sau đó wrangler deploy --config wrangler.gamemode.jsonc. Kiểm tra proxy: node tests/gamemode-host.mjs.
