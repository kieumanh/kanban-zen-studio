# Bách Đại Thủ Quan — Trung Hoa Anh Hùng Truyện

> LUẬT HIỆN HÀNH 0.4: Xem [Nội lực và Cửu trụ tu dưỡng](PROGRESSION-AND-NINE-AXES.vi.md). Kỹ năng/vật phẩm chỉ do người dùng cung cấp, danh mục để trống; không tự thưởng skill/đồ đã đề xuất. Đủ nội lực là điều kiện bắt buộc lên cấp; boss không cộng bù điểm. Nội dung cũ mâu thuẫn với luật 0.4 không còn áp dụng.
Phiên bản thiết kế 0.3 · Nền Kanban Zen Studio 1.15.26
Nhánh experiment/game-mode · Đặc tả, chưa tích hợp runtime.

## Luật vượt cấp hiện hành — cuộc thi hoàn thành công việc
Cập nhật theo yêu cầu chủ dự án ngày 31/10/2026. Luật này thay thế toàn bộ đề xuất chiến đấu theo lượt, HP, sát thương và kỹ năng đánh boss trước đây.

### Vòng thi
1. Đạt mốc cấp 10,20,...,100 của mỗi đỉnh: boss tương ứng xuất hiện như thủ quan và người ra đề.
2. Người chơi chọn “Ứng chiến”. Hệ thống bốc ngẫu nhiên 1–3 task hợp lệ, hiển thị đầy đủ tên, dự án, checklist và thời lượng ước tính.
3. Đưa ra thời hạn gợi ý. Người chơi được chỉnh thời gian cho hợp lý trước khi xác nhận bắt đầu; đây là thi đua tự nguyện với chính mình.
4. Trong hạn, hoàn thành toàn bộ task đã chốt. Mỗi task chỉ tính xong khi ở Done và toàn bộ checklist trong phạm vi đề thi hoàn tất.
5. Hoàn thành đúng hạn: xác nhận vượt ải, đột phá cấp, nhận ngân lượng và mở quyền vào kho của cửa ải để mua vật phẩm hoặc sách kỹ năng.
6. Hết hạn mà chưa hoàn tất: chưa vượt ải; giữ dữ liệu việc đã làm, tu vi và vật phẩm. Có thể lập thử thách mới với thời gian phù hợp hơn.

### Chọn ngẫu nhiên nhưng khả thi
- Chỉ task đang hoạt động, chưa Done, chưa lưu trữ/thùng rác; loại demo, mẫu, task đang thuộc vòng thi khác và task phụ thuộc chưa được giải quyết.
- Cho chọn phạm vi tất cả dự án hoặc một số dự án trước khi bốc thăm. Không thay đổi tên/nội dung task.
- Với N task hợp lệ, bốc K đều trong 1..min(3,N), rồi lấy mẫu không hoàn lại. Nếu N=0, hướng dẫn chọn/tạo việc thật; chưa bắt đầu đồng hồ và chưa cho qua ải.
- Tránh chọn hai task có quan hệ phụ thuộc với nhau trong cùng đề thi để tránh ước lượng sai; nếu lọc không còn đủ K, giảm K và thông báo.
- Trước khi bắt đầu có thể đổi đề hoặc thay task không khả thi, hiển thị rõ lựa chọn. Không tự thêm việc vào Kanban.
- Sau khi bắt đầu chốt ID task, checklist và deadline trong snapshot. Xóa/lưu trữ task không được tính hoàn thành; không âm thầm thay task mới.

### Thời hạn và điều chỉnh
- Gợi ý thời lượng = tổng ước tính phần việc còn lại ×1,25, làm tròn lên phút. Nếu thiếu ước tính, hỏi người chơi nhập thay vì đoán từ số checklist.
- Có thể nhập phút/giờ/ngày hoặc chọn ngày giờ kết thúc, hiển thị giờ địa phương và đồng hồ đếm ngược.
- Deadline chỉ được lập khi bấm “Khai cuộc”, không chạy trong lúc xem đề.
- Trong vòng thi vẫn cho “Điều chỉnh thời hạn”: hiển thị hạn cũ/mới, xác nhận và lưu lịch sử; không trừ thưởng vì điều chỉnh. Thay đổi được xác nhận khi vòng thi còn hoạt động, không hồi tố sửa vòng đã hết hạn thành thắng.
- Thời gian trôi theo đồng hồ thực, đóng ứng dụng không dừng đồng hồ. Không có giới hạn bí mật hoặc yêu cầu duy trì ứng dụng mở.
- Rời vòng thi bằng “Dừng thử thách” không sửa task. Khi bắt đầu lại tạo attempt mới, chỉ chọn task chưa hoàn tất.

### Xác định thắng và tiến cấp
- Phải hoàn tất tất cả task đã chọn tại hoặc trước deadline (completedAt <= deadline); không cần mở Game Mode vào đúng thời điểm đó.
- Tiến độ trận = số task hoàn tất / tổng task, checklist là tiến độ phụ trong từng task. Boss chuyển biểu cảm theo tiến độ, animation chỉ minh họa kết quả công việc.
- Khi đến mốc L, đủ XP để đạt L là điều kiện mở ải. Thắng boss mở đột phá lên L+1 kể cả chưa đủ XP tự nhiên cho L+1: cấp mới tối thiểu L+1, sổ tu vi cộng bù đúng phần thiếu tới ngưỡng L+1 bằng một sự kiện gate-topup duy nhất. Nếu đã đủ XP không cộng bù. Đây là thưởng cột mốc, không phải nguồn cày lặp.
- XP dư được giữ và áp dụng đến cửa ải chưa vượt tiếp theo; không tự bỏ qua boss. Tại cấp 100 thắng trấn đỉnh mở đỉnh kế tiếp cấp 1; boss cuối đỉnh 10 mở kết thúc chương chính.
- Hoàn thành từng task vẫn nhận XP công việc theo sổ thưởng thông thường. Thua không thu hồi XP task hợp lệ. Nếu mở lại task trước khi chốt thắng, task đó chưa đạt; sau khi chốt thắng không thưởng cửa ải lần hai.
- Checklist mới thêm sau khai cuộc không tăng phạm vi đề thi, nhưng task Done vẫn phải hợp lệ theo quy tắc Kanban. Cần cảnh báo người dùng khi sửa phạm vi việc; không dùng xóa checklist trong snapshot để tự đạt điều kiện.

### Kho vật phẩm và bí kíp
- Thắng mở quyền vào kho theo cửa ải đã vượt, quyền này giữ lại về sau; không ép mua ngay hoặc đếm ngược mua hàng.
- Ngân lượng = 50×đỉnh +25×số cửa. Linh ngọc =1, riêng trấn đỉnh =3; giữ huy hiệu, ấn và áo choàng đã thiết kế.
- Skill trong danh mục boss là sách được mở bán, không tự động học miễn phí khi thắng. Người chơi mua sách rồi chọn “Lĩnh ngộ”, sau đó trang bị nếu muốn.
- Giá đề xuất: sách boss thường =50% ngân lượng boss (làm tròn lên), sách trấn đỉnh =75%. Vật phẩm ngoại trang, phụ kiện và hiệu ứng hiển thị có giá niêm yết. Chưa có thanh toán tiền thật.
- Kỹ năng giai đoạn này là sưu tầm, hiệu ứng và danh hiệu tu luyện; không thay thế hoàn thành task, không tự đánh dấu Done hoặc làm sai dữ liệu công việc. Chỉ số chiến đấu trong JSON cũ không còn áp dụng.
- Phần thưởng vượt ải và sách mỗi cửa có ID cố định; mua sách sở hữu rồi không trừ tiền lại. Mua hàng trừ tiền và cấp vật phẩm trong cùng transaction.

### Đồng bộ và tính đúng đắn
Một vòng thi hoạt động/tài khoản. Trạng thái: draft → active → pending_validation → won hoặc expired; active có thể chuyển cancelled. Hết hạn nhưng có log hoàn thành offline trong hạn thì chờ xác minh trước khi kết luận cuối.
Lưu challenge ID, boss ID, seed chọn task, snapshot nguồn, startAt, deadline, lịch sử điều chỉnh, completedAt, ruleVersion và revision. Server xác thực trạng thái công việc, cấp thưởng/mở kho/cộng bù cấp một lần trong transaction. Khóa UNIQUE(user,boss,rewardKind); không tin cờ thắng từ client.
Offline lưu task và event trong transaction cục bộ; hiển thị “Kết quả chờ hợp nhất”. Không thể chứng minh tuyệt đối thời điểm hoàn thành offline bằng đồng hồ máy: đây là công cụ tự quản, chấp nhận dấu thời gian cục bộ có đối chiếu đồng hồ server gần nhất; lệch bất thường yêu cầu người dùng rà soát, không tự kết luận gian lận. Không quảng bá cơ chế chống gian lận tuyệt đối.
Xung đột hai máy: CAS vòng thi; chọn phiên bản hợp lệ trước khi chốt. Retry không cộng thưởng, ngân lượng hoặc gate-topup hai lần. Không xóa công việc vì thua.

### Nghiệm thu
Ngẫu nhiên 1–3 task duy nhất và đúng phạm vi; N=0/1/2; loại task bị khóa phụ thuộc; thời hạn chưa chạy trong draft; sửa hạn active có lịch sử; task hoàn tất đúng deadline được tính; hết hạn không thắng hồi tố; hoàn tất offline trong hạn chờ xác minh; đóng/mở app giữ deadline; xóa task không thắng; snapshot checklist không bị lách bằng xóa; mở lại task trước khi thắng; đồng bộ trùng và hai tài khoản; đủ XP/thiếu XP đều chỉ đột phá một lần; mua sách trùng không trừ tiền; kho đã mở giữ quyền truy cập.

## Mỹ thuật và 100 thủ quan
Giữ tên, tạo hình và thứ tự 100 boss bên dưới. Cột cơ chế là ý tưởng biểu cảm/animation theo chủ đề, không còn là điều kiện thắng. Cột skill là sách mở bán sau khi vượt cửa. Mỗi boss vẫn có tạo hình chibi, báo khai cuộc, chờ đợi, cổ vũ, ghi nhận tiến độ và chúc mừng khi vượt ải.

## Danh mục 100 boss
Cột cấp ghi “địa phương / toàn hành trình”. Mỗi dòng ghi kỹ năng riêng và ngân lượng; tất cả kèm huy hiệu và linh ngọc theo quy tắc trên.

### 1. Thanh Trúc — Sơ cấp

| # | Cấp | Boss và tạo hình | Cơ chế cần hóa giải | Skill mở khóa | Ngân lượng |
|---|---|---|---|---|---:|
| 1 | 10 / 10 | **Trúc Diệp Tiểu Yêu** — Mầm trúc tròn, lá che một mắt | Báo trước một đòn lá, chặn đúng lượt | Trúc Diệp Thủ | 75 |
| 2 | 20 / 20 | **Đoản Vĩ Sơn Thử** — Chuột núi ôm hạt dẻ, đuôi ngắn | Giấu hạt hồi máu; đánh túi hạt trước | Điểm Huyệt Chỉ | 100 |
| 3 | 30 / 30 | **Thanh Đằng Mộc Ngẫu** — Rối gỗ quấn dây leo, chân ngắn | Trói chân hai lượt; thanh tẩy rồi xuất chiêu | Giải Đằng Quyết | 125 |
| 4 | 40 / 40 | **Cổ Chung Thiềm** — Có chũm chọe nhỏ trên lưng | Tiếng chuông làm gián đoạn; giữ thế thủ khi chuông sáng | Tĩnh Tâm Quyết | 150 |
| 5 | 50 / 50 | **Hắc Vũ Nha Tướng** — Quạ áo choàng, lông như bút mực | Bay né kiếm; dùng chiêu chính xác khi hạ cánh | Phi Diệp Tiêu | 175 |
| 6 | 60 / 60 | **Thạch Bì Sơn Trư** — Lợn rừng giáp đá, nanh tù | Giáp cứng khi đứng; dụ húc rồi phá giáp | Phá Thạch Kình | 200 |
| 7 | 70 / 70 | **Mê Tung Hồ** — Cáo đội nón lá, ba đuôi khói | Một bóng thật có chuông; đánh đúng bóng để dừng phân thân | Minh Mục Thuật | 225 |
| 8 | 80 / 80 | **Phong Linh Hạc** — Hạc nhỏ đeo dải lụa xanh | Tích gió ba lượt; làm gián đoạn trước cơn lốc | Định Phong Bộ | 250 |
| 9 | 90 / 90 | **Trúc Lâm Kiếm Khách** — Hiệp khách gấu trúc cầm kiếm gỗ | Phản kích đòn liên tiếp; xen kẽ công và thủ | Hồi Phong Kiếm | 275 |
| 10 | 100 / 100 | **Thanh Trúc Sơn Quân** — Hổ ngọc mang giáp trúc | Hai pha lá chắn và hổ kích; phối hợp phá giáp với thủ | Thanh Trúc Hộ Thể | 300 |

### 2. Bích Khê — Sơ cấp

| # | Cấp | Boss và tạo hình | Cơ chế cần hóa giải | Skill mở khóa | Ngân lượng |
|---|---|---|---|---|---:|
| 11 | 10 / 110 | **Ngọc Bào Thủy Quái** — Bọt nước tròn có mắt ngọc | Bọt vỡ hồi sinh một lần; giữ chiêu kết liễu | Ngọc Tuyền Chỉ | 125 |
| 12 | 20 / 120 | **Hà Sa Giải Tướng** — Cua giáp cát có càng lệch | Càng lớn chặn trước mặt; chờ đổi thế để đánh | Lưu Thủy Bộ | 150 |
| 13 | 30 / 130 | **Bích Lân Ngư Vệ** — Cá giáp xanh cầm thương sen | Khiên vảy giảm kiếm; dùng đòn phá thế | Xuyên Lân Thức | 175 |
| 14 | 40 / 140 | **Thủy Tiên Đăng Yêu** — Đèn sen nổi có tua nước | Đèn tích sáng hồi máu; dập sáng bằng gián đoạn | Tắt Sóng Quyết | 200 |
| 15 | 50 / 150 | **Hàn Vụ Thủy Xà** — Rắn sương cuộn thành bánh tròn | Sương làm giảm chính xác; giải sương trước khi tấn công | Thanh Vụ Chú | 225 |
| 16 | 60 / 160 | **Song Kiều Thủy Lại** — Cặp rái cá mặc áo lính | Một con hồi máu một con đánh; ưu tiên con mang bình | Song Lưu Trảm | 250 |
| 17 | 70 / 170 | **Trầm Chu Mộc Linh** — Thuyền gỗ nhỏ có mặt và mái chèo | Dâng nước tăng sát thương; đánh mái chèo để hạ thủy triều | Trấn Ba Chưởng | 275 |
| 18 | 80 / 180 | **Bạch Lãng Kiếm Ngư** — Cá kiếm trắng có khăn đỏ | Đâm theo nhịp hai nhanh một chậm; phòng thủ ở nhịp chậm | Bạch Lãng Kiếm | 300 |
| 19 | 90 / 190 | **Bích Khê Giao Nữ** — Giao nhân chibi ôm đàn nước | Tiếng đàn khiến ngủ; giữ một lượt thanh tẩy | Tỉnh Mộng Âm | 325 |
| 20 | 100 / 200 | **Bích Khê Giao Vương** — Giao long xanh, sừng tròn như ngọc | Ba đợt triều lên; phá ngọc triều rồi đánh thân chính | Giao Long Xuất Thủy | 350 |

### 3. Vân Tùng — Trung cấp

| # | Cấp | Boss và tạo hình | Cơ chế cần hóa giải | Skill mở khóa | Ngân lượng |
|---|---|---|---|---|---:|
| 21 | 10 / 210 | **Tùng Quả Sơn Tinh** — Quả thông có giáp vảy gỗ | Khép vảy khi thủ; đánh ở lượt mở nón | Tùng Châm Quyết | 175 |
| 22 | 20 / 220 | **Hôi Bào Mi Hầu** — Khỉ áo xám mang gậy ngắn | Trộm một đơn vị nội lực; đánh dấu để đòi lại | Truy Ảnh Bộ | 200 |
| 23 | 30 / 230 | **Vân Ti Bạch Chu** — Nhện bông trắng có tám chân tròn | Tơ chắn hai ô kỹ năng; gỡ tơ theo thứ tự | Đoạn Ti Kiếm | 225 |
| 24 | 40 / 240 | **Cổ Mộc Dược Ông** — Ông cây râu rễ mang hồ lô | Hạt giống mọc thành bình thuốc; dọn mầm trước pha hồi | Khô Mộc Hồi Xuân | 250 |
| 25 | 50 / 250 | **Ngân Vĩ Điêu** — Chồn bạc cầm quạt lá thông | Né rồi phản đòn mạnh; dùng đòn nhử tốn ít lực | Hư Thực Thủ | 275 |
| 26 | 60 / 260 | **Mặc Diện Sơn Tiêu** — Yêu núi mặt nạ mực, thân mềm | Đổi mặt nạ công và thủ; quan sát biểu tượng mặt nạ | Quan Tượng Pháp | 300 |
| 27 | 70 / 270 | **Tùng Phong Đạo Sĩ** — Đạo sĩ rối gỗ cưỡi mây | Luân phiên gió và độc; đổi kỹ năng giải tương ứng | Tùng Phong Tịnh Khí | 325 |
| 28 | 80 / 280 | **Bạch Vân Kiếm Hồn** — Hồn kiếm trắng quấn mây | Bắt chước chiêu vừa dùng; tránh lặp cùng kỹ năng | Biến Chiêu Quyết | 350 |
| 29 | 90 / 290 | **Thiên Chi Mộc Vệ** — Vệ binh cây mang khiên tổ chim | Ba rễ nối giáp; cắt hai rễ rồi phá lõi | Đoạn Căn Kình | 375 |
| 30 | 100 / 300 | **Vân Tùng Lão Tổ** — Cổ thụ chibi đội tán thông | Ba pha mầm, rễ, tán; giữ nội lực cho pha cuối | Vạn Tùng Kiếm Trận | 400 |

### 4. Minh Nguyệt — Trung cấp

| # | Cấp | Boss và tạo hình | Cơ chế cần hóa giải | Skill mở khóa | Ngân lượng |
|---|---|---|---|---|---:|
| 31 | 10 / 310 | **Nguyệt Quang Thố** — Thỏ ngọc ôm chày tròn | Tích trăng hồi giáp; ngắt lúc giơ chày | Nguyệt Nha Trảm | 225 |
| 32 | 20 / 320 | **Ngân Hồ Đăng Sứ** — Cáo bạc cầm đèn trăng | Đèn soi làm lộ điểm yếu cả hai bên; thủ lúc bị soi | Ngân Quang Thuẫn | 250 |
| 33 | 30 / 330 | **Ảnh Diện Miêu** — Mèo đeo mặt nạ bán nguyệt | Bóng che máu thật; đánh dấu đúng thân | Chiếu Ảnh Thuật | 275 |
| 34 | 40 / 340 | **Tàn Nguyệt Song Đao** — Kiếm khách sóc dùng song đao cong | Hai đòn ngắn rồi nghỉ; phản kích trong khoảng nghỉ | Tàn Nguyệt Liên Hoàn | 300 |
| 35 | 50 / 350 | **Mộng Điệp Tiên** — Bướm lụa tím có trượng hoa | Mộng đổi vị trí nút; lựa chọn bằng nhãn rõ ràng, không đổi UI thật | Định Mộng Quyết | 325 |
| 36 | 60 / 360 | **Tinh Sa Cầm Sư** — Nhạc sư hươu cầm đàn sao | Hợp âm tích ba nốt; gián đoạn nốt cuối | Tinh Sa Tịnh Âm | 350 |
| 37 | 70 / 370 | **Nguyệt Thực Lang** — Sói tròn với bờm vòng nguyệt thực | Tối dần làm mạnh cắn; thắp ba phù quang trong trận | Phá Ám Chưởng | 375 |
| 38 | 80 / 380 | **Kính Hồ Kiếm Ảnh** — Hiệp khách phản chiếu trong gương nước | Gương phản sát thương; thủ để gương mờ rồi đánh | Kính Tâm Minh | 400 |
| 39 | 90 / 390 | **Vọng Nguyệt Tế Sư** — Tế sư cú mèo mang vòng bạc | Đổi ba ấn trăng; giải ấn trước khi đánh trúng tâm | Tam Nguyệt Ấn | 425 |
| 40 | 100 / 400 | **Minh Nguyệt Cung Chủ** — Nữ kiếm sư thỏ ngọc, áo ánh trăng | Bốn tuần trăng đổi thế; chọn chiêu theo pha hiển thị | Minh Nguyệt Vô Trần | 450 |

### 5. Xích Hà — Trung cấp

| # | Cấp | Boss và tạo hình | Cơ chế cần hóa giải | Skill mở khóa | Ngân lượng |
|---|---|---|---|---|---:|
| 41 | 10 / 410 | **Hỏa Tinh Tiểu Quỷ** — Cục than cam má phồng | Giận tăng khi bị đánh liên tục; nghỉ thủ để hạ nhiệt | Hỏa Tinh Chưởng | 275 |
| 42 | 20 / 420 | **Xích Giáp Hạt** — Bọ cạp giáp gốm đỏ, đuôi tù | Đuôi tích độc lửa; phá giáp đuôi trước | Xích Sa Giải Độc | 300 |
| 43 | 30 / 430 | **Dung Nham Quy** — Rùa nham thạch đeo ấm trà | Mai nóng phản sát thương; làm nguội bằng thủ | Huyền Quy Tức | 325 |
| 44 | 40 / 440 | **Hồng Liên Hỏa Đồng** — Đồng tử lửa ngồi sen đỏ | Sen nở hồi sinh; phong ấn nụ rồi kết thúc | Hồng Liên Phong Ấn | 350 |
| 45 | 50 / 450 | **Lưu Hỏa Ưng** — Đại bàng nhỏ có cánh than hồng | Lượn hai lượt rồi bổ; đặt thế phản công trước khi đáp | Liệt Phong Phản Kích | 375 |
| 46 | 60 / 460 | **Xích Hà Đao Khách** — Đao khách tê tê mặc giáp đỏ | Nạp đao bỏ phòng ngự; đánh mạnh trước khi thế đầy | Xích Hà Nhất Đao | 400 |
| 47 | 70 / 470 | **Cửu Đăng Hỏa Sứ** — Linh thể cầm vòng chín đèn | Ba cụm đèn buff luân phiên; tắt cụm đang hoạt động | Cửu Đăng Tịnh Hỏa | 425 |
| 48 | 80 / 480 | **Hỏa Vân Kỳ Lân** — Kỳ lân con bờm mây đỏ | Lửa lan thành hai làn; dựng hộ thể để chặn làn thứ hai | Kỳ Lân Hộ Mạch | 450 |
| 49 | 90 / 490 | **Phần Thiên Lô Chủ** — Thợ rèn gấu ôm lò tròn | Lò quá nhiệt theo mỗi chiêu lớn; xen chiêu nhẹ | Luyện Hỏa Quy Nguyên | 475 |
| 50 | 100 / 500 | **Xích Hà Viêm Quân** — Phượng hoàng chibi áo giáp bình minh | Ba lần đổi lửa; giữ phong ấn cho pha tái sinh | Phượng Vũ Cửu Thiên | 500 |

### 6. Bạch Vân — Cao cấp

| # | Cấp | Boss và tạo hình | Cơ chế cần hóa giải | Skill mở khóa | Ngân lượng |
|---|---|---|---|---|---:|
| 51 | 10 / 510 | **Vân Đoàn Ngủ Gật** — Mây tròn đội mũ ngủ | Ngủ tích giáp rồi tỉnh đánh lớn; đánh thức đúng nhịp | Tỉnh Vân Chỉ | 325 |
| 52 | 20 / 520 | **Phi Vũ Thiên Cẩu** — Chó mây mang cánh lông trắng | Đánh dấu rồi lao; dùng né lượt kế tiếp | Phi Vân Bộ | 350 |
| 53 | 30 / 530 | **Bạch Bào Phù Sư** — Chồn trắng mang túi phù | Phù im lặng khóa chiêu; thanh tẩy trước chuỗi công | Giải Phù Chân Ngôn | 375 |
| 54 | 40 / 540 | **Lưu Vân Khôi Lỗi** — Rối lụa khớp tròn lơ lửng | Năm sợi điều khiển; chọn sợi đang sáng để gián đoạn | Tiệt Vân Thủ | 400 |
| 55 | 50 / 550 | **Tán Vũ Hoa Linh** — Linh hoa mang ô trong suốt | Mưa hồi boss hoặc hồi ta theo mặt ô; xoay ô đúng lượt | Cam Lộ Quyết | 425 |
| 56 | 60 / 560 | **Bạch Hạc Song Sứ** — Hai hạc áo trắng đen | Một giữ công một giữ thủ; đổi mục tiêu theo dấu ấn | Lưỡng Nghi Bộ | 450 |
| 57 | 70 / 570 | **Thiên Phong Chấp Sự** — Dê núi đeo chuông gió | Gió đổi hồi chiêu; tính lại thứ tự ba chiêu | Thuận Phong Kiếm | 475 |
| 58 | 80 / 580 | **Vân Hải Cự Kình** — Cá voi mây mắt hiền có giáp | Nổi ba điểm lõi; chọn lõi theo tín hiệu trước lượt | Vân Hải Hồi Nguyên | 500 |
| 59 | 90 / 590 | **Bạch Vân Kiếm Tôn** — Kiếm sư cáo mặc áo mây | Học ba chiêu gần nhất; đổi nhịp khi kiếm ý đầy | Vô Định Kiếm Ý | 525 |
| 60 | 100 / 600 | **Bạch Vân Thiên Quân** — Thần tướng chim hạc cưỡi đài mây | Ba tầng mây giáp; công, giải, thủ theo tầng | Bạch Vân Thiên Trận | 550 |

### 7. Thiên Sơn — Cao cấp

| # | Cấp | Boss và tạo hình | Cơ chế cần hóa giải | Skill mở khóa | Ngân lượng |
|---|---|---|---|---|---:|
| 61 | 10 / 610 | **Tuyết Cầu Sơn Yêu** — Cầu tuyết quấn khăn đỏ | Lăn tăng kích thước; phá đà trước khi thành đại cầu | Toái Tuyết Chưởng | 375 |
| 62 | 20 / 620 | **Băng Nha Sơn Miêu** — Linh miêu giáp băng răng ngắn | Băng tích làm chậm hồi chiêu; giải ở hai cộng dồn | Ôn Mạch Quyết | 400 |
| 63 | 30 / 630 | **Hàn Ngọc Băng Chu** — Nhện ngọc chân như giọt băng | Tơ đông hai kỹ năng; phá kén ưu tiên chiêu giải | Phá Băng Chỉ | 425 |
| 64 | 40 / 640 | **Tuyết Liên Thủ Vệ** — Người tuyết ôm khiên sen | Khiên sen hấp thu đòn lớn; dùng đòn nhỏ phá cánh | Tuyết Liên Hộ Tâm | 450 |
| 65 | 50 / 650 | **Bạch Giác Sơn Dương** — Dê núi sừng ngọc cuộn tròn | Húc theo ba nhịp; né nhịp cuối để làm choáng | Đạp Tuyết Vô Ngân | 475 |
| 66 | 60 / 660 | **Hàn Phong Đao Sứ** — Đao khách cáo tuyết quấn khăn | Gió lạnh phản nội lực đã dùng; tích lực rồi phản | Hàn Phong Nghịch Chuyển | 500 |
| 67 | 70 / 670 | **Băng Kính Linh** — Tinh thể gương hình chim cánh cụt | Đổi yếu điểm theo chiêu trước; luân phiên hai hệ | Băng Tâm Chiếu Ảnh | 525 |
| 68 | 80 / 680 | **Thiên Sơn Tuyết Viên** — Vượn tuyết tròn đeo chuông cổ | Gầm gây run; thủ vững rồi phá thế mất thăng bằng | Bất Động Sơn Thức | 550 |
| 69 | 90 / 690 | **Cửu Phong Kiếm Sứ** — Kiếm khách đeo chín phiến băng | Chín phiến thành ba cụm; phá đúng thứ tự hiển thị | Cửu Phong Quy Nhất | 575 |
| 70 | 100 / 700 | **Thiên Sơn Băng Hậu** — Nữ vương tuyết áo choàng sen băng | Bão, băng kính, băng tâm; giữ chiêu ôn mạch cho cuối | Thiên Sơn Tịnh Tuyết | 600 |

### 8. Huyền Không — Cao cấp

| # | Cấp | Boss và tạo hình | Cơ chế cần hóa giải | Skill mở khóa | Ngân lượng |
|---|---|---|---|---|---:|
| 71 | 10 / 710 | **Hư Không Đăng Linh** — Đèn lồng tím có tai thỏ | Ẩn một lượt sau khi phát sáng; đánh dấu trước khi ẩn | Dẫn Hồn Đăng | 425 |
| 72 | 20 / 720 | **Tử Vụ Dạ Bức** — Dơi tím choàng khăn tròn | Sóng âm đảo thứ tự hành động có báo trước | Định Âm Quyết | 450 |
| 73 | 30 / 730 | **Tinh Bàn Cơ Ngẫu** — Rối đồng ôm la bàn sao | Xoay ba cung buff; khóa cung trước khi kích hoạt | Định Tinh Chỉ | 475 |
| 74 | 40 / 740 | **Huyền Môn Thủ Sứ** — Rùa cửa đá mang hai chìa | Cổng công và thủ đổi chỗ; đọc biểu tượng để chọn chiêu | Khai Huyền Quyết | 500 |
| 75 | 50 / 750 | **Toái Ảnh Vũ Cơ** — Vũ công hươu đeo dải sao | Bốn ảnh chia sẻ giáp; phá ảnh mang nơ sáng | Toái Ảnh Liên Hoa | 525 |
| 76 | 60 / 760 | **Dạ Không Cầm Ma** — Cú đêm mang đàn tím | Nốt trầm khóa hồi phục, nốt cao khóa công; giải đúng nốt | Tĩnh Dạ Hồi Âm | 550 |
| 77 | 70 / 770 | **Phù Không Cự Tượng** — Voi đá nhỏ nổi trên đảo bay | Mỗi đòn đẩy cân bằng; giữ thanh cân bằng giữa khoảng an toàn | Trấn Không Kình | 575 |
| 78 | 80 / 780 | **Huyền Tinh Kiếm Khôi** — Khôi giáp sao có kiếm lơ lửng | Hấp thu hệ công lặp lại; đổi chiêu trước ba tầng | Tinh Kiếm Biến Thức | 600 |
| 79 | 90 / 790 | **Vô Thanh Hành Giả** — Hiệp khách mèo áo đen điểm sao | Không có âm báo; đọc vệt sáng và nhật ký đòn | Thính Tâm Minh Giác | 625 |
| 80 | 100 / 800 | **Huyền Không Đạo Chủ** — Đạo sư trên vòng thiên thể tím | Ba cổng đổi luật lượt; chọn ấn giữ một luật ổn định | Huyền Không Quy Tâm | 650 |

### 9. Vô Cực — Thượng cấp

| # | Cấp | Boss và tạo hình | Cơ chế cần hóa giải | Skill mở khóa | Ngân lượng |
|---|---|---|---|---|---:|
| 81 | 10 / 810 | **Âm Dương Song Ngư** — Đôi cá ngọc trắng đen | Hai thanh sinh lực cân bằng; lệch quá xa sẽ hồi | Âm Dương Điều Tức | 475 |
| 82 | 20 / 820 | **Ngũ Hành Linh Sứ** — Tê tê mang năm phiến màu | Chuyển hệ theo vòng rõ ràng; chọn khắc hệ đang hiện | Ngũ Hành Chuyển Hóa | 500 |
| 83 | 30 / 830 | **Luân Chuyển Cơ Quan** — Bánh xe gỗ có mặt cười | Ba bánh răng tăng tốc; khóa từng bánh bằng nhịp công thủ | Luân Chuyển Bộ | 525 |
| 84 | 40 / 840 | **Thái Hư Kính Chủ** — Hồ ly mang gương hai mặt | Một mặt sao chép chiêu một mặt chép buff; đổi kế hoạch | Thái Hư Phản Chiếu | 550 |
| 85 | 50 / 850 | **Càn Khôn Kỳ Sĩ** — Gấu nhỏ đánh cờ trên mây | Đặt ba quân trận; phá liên kết trước khi thành hàng | Phá Cục Chân Quyết | 575 |
| 86 | 60 / 860 | **Nhật Nguyệt Song Tôn** — Hai kiếm sư chim vàng và bạc | Hai pha đổi ngày đêm; tích nội lực trong đêm | Nhật Nguyệt Đồng Huy | 600 |
| 87 | 70 / 870 | **Vạn Tượng Linh Quân** — Kỳ lân mang mặt nạ bốn mùa | Bốn hình thái có quy luật; dùng bộ chiêu cân bằng | Vạn Tượng Hợp Nhất | 625 |
| 88 | 80 / 880 | **Vô Tướng Kiếm Hồn** — Hồn kiếm lụa đổi hình thú | Sao chép phong cách người chơi; dùng chiêu dự bị để phá | Vô Tướng Kiếm Tâm | 650 |
| 89 | 90 / 890 | **Thái Cực Thủ Quan** — Lão gấu trúc áo đạo hai màu | Mượn lực đòn lớn; dùng nhu công và phản đúng nhịp | Thái Cực Nhu Kình | 675 |
| 90 | 100 / 900 | **Vô Cực Thiên Tôn** — Linh long trắng đen cuộn vòng | Hợp nhất cân bằng, chuyển hệ và phản chiếu qua ba pha | Vô Cực Quy Nhất | 700 |

### 10. Quy Nguyên — Đỉnh cấp

| # | Cấp | Boss và tạo hình | Cơ chế cần hóa giải | Skill mở khóa | Ngân lượng |
|---|---|---|---|---|---:|
| 91 | 10 / 910 | **Cựu Ảnh Đồng Hành** — Bóng nhân vật cấp đầu cầm kiếm gỗ | Dùng lại bài học boss đầu, có nhịp biến đổi | Sơ Tâm Bất Diệt | 525 |
| 92 | 20 / 920 | **Vạn Niệm Thư Linh** — Sách tròn bay có trang mây | Ba trang gây phân tâm; chọn trang nhiệm vụ chính | Nhất Niệm Chuyên Tâm | 550 |
| 93 | 30 / 930 | **Trường Hà Thủ Hộ** — Rồng sông quấn đồng hồ nước | Dòng thời gian đổi hồi chiêu; dự trù hai lượt | Trường Hà Định Lưu | 575 |
| 94 | 40 / 940 | **Tứ Tượng Trấn Sơn** — Bốn tượng thú ngọc trên một đài | Bốn hộ vệ chia vai; phá hồi phục trước khi phá giáp | Tứ Tượng Hộ Nguyên | 600 |
| 95 | 50 / 950 | **Thiên Cơ Kỳ Chủ** — Cú bạc chơi cờ thiên thể | Báo trước hai chuỗi rồi đổi một nhịp; giữ chiêu dự phòng | Thiên Cơ Ứng Biến | 625 |
| 96 | 60 / 960 | **Vô Tận Huyễn Long** — Long lụa nhiều vòng mây | Ảo ảnh tái sinh nếu lõi còn; đánh dấu rồi phong lõi | Chân Long Phá Huyễn | 650 |
| 97 | 70 / 970 | **Cửu Đỉnh Linh Vệ** — Tượng tròn mang chín ấn núi | Ba cụm ấn tái hiện chín đỉnh; vượt từng cụm không cần đánh lại | Cửu Đỉnh Liên Tâm | 675 |
| 98 | 80 / 980 | **Vô Danh Kiếm Thánh** — Kiếm sư già áo vải, kiếm trúc | Không có yếu điểm hệ; thắng bằng quản lý lực và phản đòn | Vô Danh Nhất Kiếm | 700 |
| 99 | 90 / 990 | **Vọng Ngã Thiên Ảnh** — Bản sao phát sáng của chính hiệp khách | Sao chép bộ chiêu đã chọn; đọc đòn và đổi chiến thuật | Minh Tâm Kiến Tính | 725 |
| 100 | 100 / 1000 | **Quy Nguyên Chân Long** — Rồng ngọc tròn ôm mười viên minh châu | Năm pha tổng kết; giữ checkpoint mỗi pha, thắng bằng phối hợp | Vạn Pháp Quy Nguyên | 750 |


## Triển khai trước
Dựng vòng thi task cho boss 001 trước, kiểm chứng snapshot, deadline, offline và thưởng; sau đó mở rộng đủ 10 cửa Thanh Trúc. Catalog không đồng nghĩa đã có đủ sprite hay mã chạy.
