# Hướng dẫn bật bảo vệ nhánh `main`

Mục tiêu: không ai (kể cả Claude hay chính bạn lúc vội) đưa code vào `main` mà chưa qua Pull Request và chưa có 3 check xanh. Vì `main` tự deploy production, đây là lớp an toàn quan trọng nhất của dự án.

Hướng dẫn dành cho người không chuyên code. Tên nút của GitHub giữ tiếng Anh, đặt trong ngoặc kép để bạn tìm đúng.

## 0. Kiểm tra gói GitHub trước

Repo `kieumanh/kanban-zen-studio` đang **private**. Theo tài liệu GitHub, cả "branch protection rule" lẫn "ruleset" chỉ dùng được trên repo private khi tài khoản có gói **Pro, Team hoặc Enterprise Cloud**. Gói **Free** chỉ bật được trên repo public.

Cách xem gói: GitHub → ảnh đại diện → "Settings" → "Billing and plans".

- Gói Pro trở lên: làm tiếp từ bước 1.
- Gói Free, có ba hướng:
  - Nâng lên gói Pro (hướng khuyên dùng, repo vẫn private).
  - Chuyển repo sang public. Không khuyên dùng: mã nguồn, cấu hình Cloudflare và lịch sử commit sẽ công khai.
  - Giữ Free: 3 check vẫn chạy và hiện đỏ/xanh trên mỗi PR, nhưng GitHub không chặn được ai bấm merge. Chỉ nên là giải pháp tạm; mọi người phải tự giữ kỷ luật không merge khi check đỏ.

## 1. Đưa file của P0-1 lên GitHub

1. Tạo nhánh mới, ví dụ `p0-1-ha-tang-pr`, và đưa các file của bản 1.17.1 vào nhánh đó.
2. Mở Pull Request vào `main`.
3. Chờ khoảng vài phút. Ở cuối trang PR phải hiện 3 check:
   - **Kiểm tra mã nguồn**
   - **Giao diện 390-820-1440px**
   - **Chốt chặn migration**
4. Cả 3 xanh thì bấm merge.

Lưu ý: bản 1.17.1 đổi `package.json`, nên khi merge, quy trình "Verify and deploy Kanban Production" sẽ tự chạy và deploy một bản **không đổi tính năng**, chỉ đổi số phiên bản. Đây là điều bạn đã chọn; hãy xem lần chạy đó xanh ở thẻ "Actions".

Ba check chỉ hiện trong ô tìm kiếm của luật (bước 2) sau khi workflow đã chạy ít nhất một lần, nên **phải làm bước 1 trước bước 2**.

## 2. Tạo luật bảo vệ `main`

Vào repo → "Settings" → "Rules" → "Rulesets" → "New ruleset" → "New branch ruleset".

| Ô | Chọn |
| --- | --- |
| "Ruleset Name" | `Bảo vệ main` |
| "Enforcement status" | **Active** |
| "Bypass list" | Để trống (xem mục 4 nếu cần sửa khẩn cấp) |
| "Target branches" | "Add target" → "Include default branch" |

Trong phần "Rules", tick các mục sau:

1. **"Restrict deletions"**: không ai xóa được `main`.
2. **"Block force pushes"**: không ai ghi đè lịch sử `main`.
3. **"Require a pull request before merging"**: mọi thay đổi phải qua PR.
   - "Required approvals": đặt **0**. Dự án chỉ có mình bạn; nếu đặt 1, chính bạn cũng không tự duyệt PR của mình được.
4. **"Require status checks to pass"**:
   - Tick "Require branches to be up to date before merging" (khuyên dùng; nếu thấy phiền thì bỏ tick).
   - Bấm "Add checks", tìm và thêm đủ **cả 3**: `Kiểm tra mã nguồn`, `Giao diện 390-820-1440px`, `Chốt chặn migration`.
   - Không thêm check có tên `build`: đó là của quy trình deploy, chỉ chạy sau khi đã vào `main`.

Cuối trang bấm "Create".

Cả 3 check đều chạy độc lập và không phụ thuộc nhau. Đây là cố ý: theo tài liệu GitHub, check bắt buộc bị "skipped" vẫn được tính là đạt, nên nếu check này chờ check kia thì có thể vô tình lọt.

## 3. Thử xem luật có hoạt động không

1. Tạo một nhánh thử, sửa một dòng trong `docs/`, mở PR vào `main`. Nút merge phải bị khóa cho đến khi cả 3 check xanh.
2. Thử push thẳng vào `main` từ máy: GitHub phải từ chối.
3. Muốn thấy chốt chặn migration hoạt động: trong nhánh thử, sửa một chữ trong `migrations/0001_workspace_entities.sql`. Check "Chốt chặn migration" phải đỏ. Sau đó **đóng PR và xóa nhánh thử**, không merge.

## 4. Khi có sự cố

- **Check đỏ vì lỗi thật**: sửa mã trong nhánh rồi push lại; check chạy lại tự động. Không sửa test chỉ để cho xanh.
- **Check đỏ vì chính workflow hỏng** (ví dụ hết hạn GitHub Actions hay lỗi cài trình duyệt): bấm "Re-run" trước. Nếu vẫn kẹt và việc thật sự khẩn, vào "Settings" → "Rules" → "Rulesets" → "Bảo vệ main" → chuyển "Enforcement status" sang **Disabled**, merge, rồi **bật lại Active ngay**. Ghi lại lý do trong PR.
- **Check "Chốt chặn migration" hiện cảnh báo vàng**: PR có thêm file SQL mới hoặc đổi `production-receipt.json`. Chỉ merge khi bạn đã xác nhận schema đó và đã biết migration được áp dụng thế nào.

## 5. Việc cần xử lý riêng

Workflow `.github/workflows/notes-196.yml` tự `git push` khi `scripts/release-notes-196.mjs` đổi. Khi `main` được bảo vệ, lệnh đó sẽ bị từ chối. Đây là workflow cũ của bản 1.9.6; nên có một phiên riêng để quyết định xóa hay vô hiệu hóa nó. Bản 1.17.1 không động tới file này.

## Nguồn

- [About protected branches (GitHub Docs)](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [About rulesets (GitHub Docs)](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [Available rules for rulesets (GitHub Docs)](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
