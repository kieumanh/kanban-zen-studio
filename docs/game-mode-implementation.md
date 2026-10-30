# Game Mode 0.6 — Ghi chú triển khai

Luật hiện hành: cấp 100 phong Thần sau khi thắng thử thách trấn đỉnh. Mỗi đỉnh kế tiếp tăng chi phí cấp ×2, dãy trong đỉnh vẫn nhân đôi từng cấp. Tổng tu vi dùng BigInt; tiêu dùng điểm trục không làm giảm cấp. Bản cân bằng này giữ yêu cầu gốc và cực khó ở các cấp cao, chưa thay bằng nhân đôi theo nhóm.

Mười chương dùng mô-típ tu luyện thăng giới nguyên bản, không dùng nhân vật hay thế giới truyện Đấu La. Nội dung truyện trong `dist/game/story.mjs`.

Runtime và bản chơi thử: xem `experiments/game-mode/README.md`. Đây là bản thử nghiệm có thể thao tác, không phải xác nhận sẵn sàng production. Kiểm tra cuối cần browser UI, đồng bộ hai tài khoản/thiết bị thực và rà soát riêng giao dịch game trong root workspace.
