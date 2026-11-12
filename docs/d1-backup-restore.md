# Sao lưu và khôi phục dữ liệu (D1)

Tài liệu cho **chủ hệ thống**. Chưa từng diễn tập khôi phục trên dữ liệu thật; hãy đọc kỹ rồi tập trước trên một bản sao khi có thời gian.

## Hiện trạng đã kiểm tra (2026-11-12)

- Cơ sở dữ liệu `kanban-zen-studio` (id `d8ebf96e-eb66-4e8b-9668-a3d6da1ec455`) dùng lõi lưu trữ `production` (29 bảng). Lõi này hỗ trợ **Time Travel**: khôi phục về **bất kỳ phút nào** trong vòng **30 ngày** (gói Workers Paid) hoặc **7 ngày** (gói Free). Tài liệu Cloudflare: https://developers.cloudflare.com/d1/reference/time-travel/
- Time Travel luôn bật, không tốn thêm phí, không cần tạo bản sao lưu thủ công.
- Giới hạn: tối đa 10 lần khôi phục / 10 phút / cơ sở dữ liệu.
- Chưa biết tài khoản đang ở gói nào; xem ở Cloudflare Dashboard > Billing để biết cửa sổ 30 hay 7 ngày.

## Điều Time Travel KHÔNG che

- **Tệp đính kèm trong R2 (`kanban-zen-files`)** không nằm trong Time Travel. Nếu khôi phục D1 về trước thời điểm có tệp mới, các tệp đó vẫn còn trong R2 nhưng không còn dòng nào trỏ tới; ngược lại tệp bị xóa khỏi R2 không tự quay lại. Hiện chưa có quy trình sao lưu R2.
- Quá 30 (hoặc 7) ngày thì không quay lại được. Muốn giữ lâu hơn phải tự xuất (xem "Xuất bản sao dài hạn").
- Khôi phục **ghi đè tại chỗ** cơ sở dữ liệu đang chạy: mọi thay đổi của người dùng sau thời điểm đích sẽ mất. Truy vấn đang chạy bị hủy.

## Việc cần làm cần có token của chủ tài khoản

Claude/CI **không** giữ và **không** được đụng token Cloudflare cá nhân. Các lệnh dưới đây chạy trên máy của chủ, sau khi `wrangler login` (hoặc đặt `CLOUDFLARE_API_TOKEN` có quyền D1 Edit). Cần Wrangler 3.4 trở lên.

### 1. Xem trạng thái hiện tại và lấy "dấu mốc" (bookmark)

```sh
npx wrangler d1 info kanban-zen-studio
npx wrangler d1 time-travel info kanban-zen-studio
```

Lệnh thứ hai in bookmark hiện tại. **Ghi lại nó trước mọi thao tác nguy hiểm** (trước khi chạy migration tay, trước khi khôi phục).

### 2. Xem bookmark của một thời điểm trong quá khứ

```sh
npx wrangler d1 time-travel info kanban-zen-studio --timestamp="2026-11-12T08:00:00+07:00"
```

Cùng một mốc giờ luôn cho cùng một bookmark. Nhớ ghi giờ kèm múi giờ (Việt Nam là +07:00).

### 3. Khôi phục (phá hủy dữ liệu sau mốc, nhưng hoàn tác được)

```sh
npx wrangler d1 time-travel restore kanban-zen-studio --timestamp="2026-11-12T08:00:00+07:00"
```

Lệnh trả về **bookmark trước khi khôi phục**. Hãy chép lại: đó là cách hoàn tác.

### 4. Hoàn tác một lần khôi phục

```sh
npx wrangler d1 time-travel restore kanban-zen-studio --bookmark=BOOKMARK_TRUOC_KHI_KHOI_PHUC
```

Khôi phục không xóa các bookmark cũ, nên có thể thử nhiều mốc.

## Khi nào dùng

| Tình huống | Hành động |
|---|---|
| Phát hành bản mới gây lỗi giao diện/chức năng, dữ liệu vẫn đúng | **Không** khôi phục D1. Rollback Worker theo `docs/production-deployment.md` (mục Recovery). |
| Dữ liệu bị xóa/sửa sai (do lỗi mã hoặc thao tác tay) | Xác định giờ ngay trước sự cố, đọc bookmark ở bước 2, đối chiếu, rồi mới khôi phục (bước 3). |
| Cần xem dữ liệu cũ mà không mất dữ liệu hiện tại | Chưa làm được trực tiếp (Time Travel chưa hỗ trợ nhân bản). Xuất bản sao hiện tại trước (bên dưới), rồi mới khôi phục. |

Thứ tự an toàn khi khôi phục: (1) ghi bookmark hiện tại, (2) xuất bản sao hiện tại, (3) khôi phục, (4) mở ứng dụng kiểm tra số dự án/việc, (5) báo người dùng các thay đổi sau mốc đã mất.

## Xuất bản sao dài hạn (tùy chọn)

```sh
npx wrangler d1 export kanban-zen-studio --remote --output=kanban-YYYY-MM-DD.sql
```

Tệp `.sql` chứa **dữ liệu người dùng và băm mật khẩu**: cất ở nơi riêng tư, không đưa lên GitHub, không gửi qua chat. Cloudflare có hướng dẫn xuất định kỳ sang R2 bằng Workflows (https://developers.cloudflare.com/workflows/examples/backup-d1/) nếu cần giữ quá 30 ngày; chưa được thiết lập ở dự án này vì cần token và tài nguyên mới.

## Việc còn thiếu (ghi nhận, chưa làm)

1. Diễn tập khôi phục và ghi lại thời gian thực tế.
2. Sao lưu R2.
3. Quy trình báo người dùng sau khi khôi phục.
