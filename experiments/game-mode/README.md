# Game Mode — tiền kỳ thử nghiệm

Nền Kanban Zen Studio v1.15.26. Nhánh này chưa tích hợp gameplay hay thay đổi dữ liệu production.

- Thiết kế: ../../docs/game-mode/PRODUCT-DIRECTION.vi.md
- Chạy kiểm tra mô hình cân bằng: `node experiments/game-mode/progression.test.mjs`
- `progression.mjs` là mô hình thuần, chưa nối hook hoàn tất công việc và chưa lưu XP.
- Không deploy nhánh này với cấu hình production hiện có. Không workflow_dispatch triển khai production.
- Concept nhân vật được trình bày trong cuộc trao đổi thiết kế; chưa có sprite atlas hoặc animation runtime trong repo.

Mốc kế tiếp: dựng nhân vật có animation thử nghiệm, rồi triển khai sổ thưởng idempotent và một đỉnh Thanh Trúc với cấu hình preview riêng.
