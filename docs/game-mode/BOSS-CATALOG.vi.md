# Bách Đại Thủ Quan — Trung Hoa Anh Hùng Truyện
Phiên bản thiết kế 0.2 · 31/10/2026 · Nền Kanban Zen Studio 1.15.26
Nhánh: experiment/game-mode. Đây là đặc tả nội dung và dữ liệu, chưa có combat runtime.

## Quyết định sản phẩm cập nhật
Yêu cầu mới thay thế mô hình boss chỉ là nhóm task ở mục 5 của PRODUCT-DIRECTION.vi.md: boss nay là trận chiến 2D theo lượt có lựa chọn kỹ năng. Hoàn thành công việc tạo tu vi; vượt cửa ải cần chiến thắng trận đấu. Hai điều kiện bổ sung cho nhau.
100 boss = 10 đỉnh × 10 cửa ải, xuất hiện ở cấp địa phương 10,20,...,100. Cấp toàn hành trình lần lượt 10,20,...,1000. Đỉnh 2 cấp 10 tương ứng toàn hành trình cấp 110, không phải boss thứ hai ở cấp 20.

## Mở ải và đột phá
Đạt cấp 10 mở boss 001, vẫn được tích lũy tu vi nhưng chưa lên cấp 11 trước khi thắng. Quy tắc tương tự tại 20,30,...,90. Thắng không tự tặng đủ XP lên cấp tiếp; chỉ tháo khóa, cấp thực tế tính từ tu vi hiện có. Tu vi dư tự áp dụng đến cửa ải chưa thắng kế tiếp; không bỏ qua boss.
Cấp 100 cần thắng boss trấn đỉnh để mở đỉnh kế tiếp ở cấp 1. Boss 100 tại Quy Nguyên trao kết thúc chương chính và chế độ tái đấu; chưa tự mở đỉnh 11.
Không bắt buộc mở game mỗi ngày. Người chỉ dùng Kanban tiếp tục làm việc và tích tu vi bình thường, có thể để cửa ải chờ.
UI tách ba dòng: “Cấp hiện tại”, “Tu vi tích trữ”, “Cửa ải đang chờ”. Không hiển thị một thanh XP vượt 100%.
Chưa thắng: không mất tu vi, không mất cấp, không mất đồ. Thử lại miễn phí. Thưởng và skill chỉ khi chiến thắng lần đầu; tái đấu luyện tập không tạo tiền hay XP.

## Luật chiến đấu đề xuất
- Trận đấu theo lượt, không có đồng hồ ép bấm. Mục tiêu 2–4 phút ở boss đầu, 4–7 phút ở boss cao; cần kiểm chứng qua playtest.
- Mỗi lượt chọn công thường, thủ, một trong ba kỹ năng chủ động, hoặc khôi phục nội lực. Công thường hồi 1 nội lực; thủ giảm 40% sát thương lượt đó và hồi 2; khôi phục hồi 4 nhưng không giảm sát thương. Nội lực tối đa 10, bắt đầu 6. Thủ không cộng dồn với hộ thể: lấy mức giảm cao hơn.
- Hồi chiêu giảm sau mỗi vòng gồm lượt người chơi và lượt boss; chiêu vừa dùng giữ nguyên số hồi chiêu ghi trong bảng tới đầu vòng sau. Không giảm lượt debuff ngay khi vừa áp dụng.
- Có 1 ô nội công bị động, 3 ô chủ động. Đổi bộ chiêu miễn phí ngoài trận. Tất cả kỹ năng đầu trận và hướng dẫn cơ chế cần thiết luôn có từ bộ cơ bản; skill thưởng không phải chìa khóa duy nhất để thắng chính boss trao nó.
- Bộ cơ bản: kiếm thường, thủ, khôi phục lực; Thanh Tâm (xóa 1 debuff, tốn 2, hồi 3), Phá Thế (90% công lực, giảm giáp 30% hai lượt, tốn 2, hồi 3), Đoạn Chiêu (70% công lực, ngắt tụ lực, tốn 3, hồi 4). Đánh dấu/chọn bộ phận/phù quang là tương tác riêng của trận, không cần mua skill.
- HP cơ sở nhân vật = 100 + 8 × (cấp địa phương−1); công lực A = 12 + 2 × (cấp địa phương−1). Thang tham chiếu theo địa phương giúp đỉnh sau không tạo số phình vô hạn. Đỉnh cao tăng độ phức tạp chiến thuật, không tăng HP gấp bội.
- HP boss = round(A × [5 + 0.6×đỉnh + 0.4×số cửa trong đỉnh]); boss trấn đỉnh nhân 1.2. Sát thương boss thường = 8% HP cơ sở nhân vật; chiêu nặng = 20%, báo trước 1 lượt. Giáp cơ bản 10%, giảm giáp áp dụng theo tỷ lệ, không cho sát thương âm. Đây là số cân bằng khởi điểm, chưa xác nhận nhịp trận.
- Kỹ năng nhân theo A, không nhân theo HP boss. Mỗi hiệu ứng có biểu tượng và diễn giải. Chỉ tối đa ba debuff khác loại đồng thời; cùng loại làm mới thời gian, không chồng vô hạn.
- Giai đoạn boss định nghĩa trong dữ liệu là ngân sách sản xuất; chuyển pha tại các phần HP bằng nhau. Tên/chiêu của từng pha sẽ mở rộng khi dựng từng trận. Không coi catalog là encounter script hoàn chỉnh.
- Thắng khi các pha đều kết thúc với HP boss bằng 0 và nhân vật còn HP. Nếu hai bên cùng gục, tính chưa vượt ải, cho thử lại. Không dùng phần trăm may rủi bí mật để quyết định thắng.
- Thua có giải thích cơ chế chưa xử lý và gợi ý bộ chiêu; sau ba lần thua gợi ý bật Trợ chiến (HP boss ×0.8, sát thương boss ×0.8, có báo đòn đầy đủ). Thắng trợ chiến vẫn nhận đầy đủ thưởng; tùy chọn có thể bật sớm trong thiết lập.
- Offline cho đánh và lưu trận chờ xác nhận; thưởng chính thức chỉ chốt sau đồng bộ. Không mở UI game thì boss không tự chiến đấu.

## Skill và phần thưởng
100 tên kỹ năng là 100 biến thể thuộc 10 nhóm cơ chế. Công dụng định lượng theo nhóm được lưu trong JSON; ngoại hình, hoạt ảnh và tên riêng theo đỉnh. Biến thể không cộng dồn, không tăng sát thương tuyến tính theo số boss đã giết; tránh 100 skill khiến người dùng quá tải.
Ngân lượng = 50×đỉnh + 25×cửa. Linh ngọc = 1 mỗi boss thường, 3 mỗi trấn đỉnh. Mỗi boss có huy hiệu riêng; boss trấn đỉnh thêm ấn và áo choàng đỉnh.
Tổng lần đầu toàn bộ 100 boss: 41.250 ngân lượng, 120 linh ngọc, 100 biến thể skill, 100 huy hiệu; 10 ấn và 10 áo choàng. Tất cả mua bằng tiền trong game, chưa có thanh toán.
Không thưởng XP từ trận boss để tránh vòng lặp cày game thay cho công việc. Thắng trận vừa mở cửa tiến cấp vừa mở skill và rương thưởng.
Nhận skill nghĩa là mở khóa, không tự đổi bộ chiêu đang trang bị. Có nút “Thử chiêu” trong sân tập.

## Mỹ thuật chung
Boss gốc phong cách kiếm hiệp chibi, hình khối tròn, dễ đọc ở mobile, không máu me. Sơ cấp 1–2 màu chính và silhouette đơn giản; trung cấp thêm trang phục/vũ khí; cao cấp thêm vòng ấn và chuyển pha; đỉnh cấp hoành tráng bằng bố cục, không nhấp nháy dồn dập.
Mỗi boss cần concept front/3⁄4, palette, silhouette, biểu cảm; animation idle, báo đòn, công thường, tuyệt chiêu, trúng đòn, choáng, thua, chuyển pha. Boss thua tan thành mây hoặc cúi chào. Có bản giảm chuyển động. Catalog này mô tả tạo hình, chưa phải 100 bộ ảnh/sprite đã sản xuất.

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

## Độ sâu sản xuất và nghiệm thu
Danh sách 100 boss là phạm vi nội dung dài hạn. Dựng trước boss 001, 005, 010 để kiểm chứng học cơ chế, gián đoạn và trận trấn đỉnh; sau đó hoàn thành 10 boss Thanh Trúc trước khi mở rộng.
Dữ liệu hiện gồm tên, tạo hình, luật cơ chế bằng văn bản, skill và thưởng. Bước triển khai cần schema encounter: trigger, target, cooldown, duration, telegraph, phase transition, win condition; không thực thi câu văn tự do trong JSON.

Lưu riêng gate_clear(user,boss,rule_version), battle_attempt(id,user,boss,seed,state_version,actions), reward_grant(user,boss,reward_kind).
Máy chủ kiểm tra mở ải, bộ chiêu sở hữu và diễn tiến trận. Cấp thưởng, mở skill và đánh dấu qua ải trong một transaction, khóa UNIQUE theo user+boss+reward_kind. Không tin biến victory từ client. Hai máy thắng cùng boss chỉ nhận một lần; replay offline cần bộ luật có version và log hành động để xác thực.
Sau khi bắt đầu trận, khóa phiên bản luật và seed. Reload phục hồi lượt cuối, không reset ngẫu nhiên để cày kết quả. Log có giới hạn và checkpoint, không ghi vô tận. Trận không cập nhật đồng thời từ hai máy: dùng battle version/CAS; cho chọn phiên tiếp tục khi xung đột.
Checkpoint boss nhiều pha chỉ áp dụng boss 097 và 100 trong bản đầu: lưu sau pha đã vượt, quay lại phục hồi HP/nội lực đầu pha theo snapshot cố định. Không mang phần thưởng checkpoint sang tái đấu.
Kiểm tra: mốc 9→10→11; 99→100→đỉnh mới; XP dư nhiều cửa; thua/thoát/reload; skill chưa sở hữu; thắng offline rồi đồng bộ hai máy; undo task làm thay đổi XP; đổi account; nhận thưởng trùng; khóa luật khi cập nhật; trợ chiến có thưởng bình đẳng. Nếu điều chỉnh XP làm tụt mốc, không xóa thành tích boss đã chốt nhưng áp dụng yêu cầu XP hiện tại cho tiến cấp; không cấp thưởng boss lại.

## Trích thoại
Trúc Diệp Tiểu Yêu: “Đợi chút! Ta còn chưa buộc xong dây giày... à, ta có chân đâu?”
Bạch Vân Kiếm Tôn: “Một chiêu dùng mãi, kiếm cũng ngáp.”
Quy Nguyên Chân Long: “Ngươi đã vượt trăm cửa. Giờ nhớ trở về làm nốt việc đang dang dở.”
