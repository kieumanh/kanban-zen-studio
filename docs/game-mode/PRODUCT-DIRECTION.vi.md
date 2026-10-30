# Trung Hoa Anh Hùng Truyện — Định hướng sản phẩm thử nghiệm

> CẬP NHẬT LUẬT 0.3: Vượt ải là cuộc thi hoàn thành ngẫu nhiên 1–3 task trong thời hạn người chơi được điều chỉnh. Thắng đột phá cấp và mở kho mua vật phẩm/sách, không tự nhận skill miễn phí. Quy tắc hiện hành tại [BOSS-CATALOG.vi.md](BOSS-CATALOG.vi.md), ưu tiên hơn các mô tả sơ bộ bên dưới. Chưa tích hợp runtime.
Ngày: 31/10/2026 · Nền: Kanban Zen Studio 1.15.26 · Nhánh: experiment/game-mode
Trạng thái: thiết kế sản phẩm và tiền kỳ nhân vật; chưa tích hợp trò chơi vào Kanban.

## 1. Tầm nhìn và ranh giới
Một hành trình tu dưỡng 2D, nơi thành quả đời thực nuôi lớn một hiệp khách. Người dùng làm việc như thường lệ; khi chọn “Game Mode · Nhập giang hồ” mới mở thế giới riêng. Kinh nghiệm vẫn tích lũy khi không mở game sau khi hệ thống thưởng được triển khai. Không cần mở game để nhận thưởng.
Văn phong kiếm hiệp áp dụng toàn bộ giao diện game; dữ liệu do người dùng viết giữ nguyên. Kanban thông thường giữ ngôn ngữ công việc, chỉ thêm biểu tượng nhân vật/thanh kinh nghiệm tùy chọn.
Đây là game tiến triển nhân vật kết hợp hành trình bản đồ, chưa phải game nhập vai hành động thời gian thực.

## 2. Tổng hợp đủ bốn trang ghi chép
1. Nhân vật phát triển toàn diện, tích lũy nội lực bằng progress bar; 100 cấp, yêu cầu cấp tiếp theo tăng dần.
2. Từ 6–9 phương diện phát triển: thể chất, tinh thần, tài chính, quan hệ, trí tuệ, cảm xúc, vật chất, nghiệp báo, phước báo. Chọn chín trục cho thiết kế.
3. Mười đỉnh núi, mỗi đỉnh 100 chặng. Mỗi 10 cấp có boss và thử thách có độ khó/thời hạn. Hồ sơ nhân vật, tự nhập việc tu dưỡng, hành trang, cửa tiệm, trang bị, linh thú.
4. Bản đồ đường đi có thanh tiến độ, công thức kinh nghiệm, tên gọi cấp bậc; chọn 2D theo yêu cầu cuối cùng của chủ dự án.
Phần “nghiệp báo/phước báo” chuyển thành “Tỉnh nghiệp/Thiện duyên”: ghi nhận tự quan sát và hành động thiện nguyện, không tuyên bố phần mềm đo được nghiệp hay mức giác ngộ.

## 3. Vòng lặp sản phẩm
Hoàn thành việc → ghi sự kiện thành quả → thưởng tu vi và điểm tu dưỡng → thăng cấp → nhận mốc hành trình → tự chọn nhập giang hồ → khám phá và đổi ngoại trang → trở về công việc.
Game khuyến khích hoàn thành việc có ý nghĩa, không khuyến khích chia vụn việc để cày thưởng. Không trừ kinh nghiệm khi nghỉ, không phạt chuỗi ngày đứt đoạn.

## 4. Hệ thống thưởng đề xuất, cần cân bằng bằng thử nghiệm
| Thành quả | Tu vi | Quy tắc |
|---|---:|---|
| Mục checklist | 5 | Một lần cho mỗi ID gốc |
| Task | 25 | Thưởng task độc lập, không tính lại tổng checklist |
| Dự án | 100 | Có ít nhất một task hợp lệ; tất cả task chưa xóa đều Done |
Checklist và task được thưởng riêng, hiển thị rõ nguồn; dự án là phần thưởng cột mốc. Không thưởng chỉ vì lưu trữ, xóa task, nhập JSON hoặc tải dữ liệu từ máy chủ.
Mức độ khó do người dùng chọn chỉ là nhãn ở MVP, chưa nhân thưởng để tránh khai thác. Tự nhập việc tu dưỡng tạo task thật có ID, không có nút cộng điểm tự do.

Công thức đề xuất: XP cần từ cấp L lên L+1 = ceil(50 × 1.06^(L−1)), L=1..99.
Tổng XP để đạt cấp 100 xấp xỉ 266.000; đây là tham số ban đầu, khá dài nếu chỉ nhận khoảng 200 XP/ngày. Cần đo mức hoàn thành thực tế trước khi khóa cân bằng; tuyệt đối không quảng bá thời gian đạt cấp như cam kết.
Mỗi đỉnh có cấp địa phương 1–100. Cấp toàn hành trình = (đỉnh−1)×100+cấp địa phương. Đạt cấp 100 rồi hoàn tất cửa ải đỉnh sẽ mở đỉnh mới ở cấp 1, không xóa tổng thành tựu. XP dư được giữ trong kho tu vi và chuyển tiếp khi mở đỉnh.
Bản đồ dùng chặng tu luyện 1–100; tách tiến độ cấp khỏi tiến độ vượt ải, tránh đồng nhất hai đại lượng.

## 5. Cảnh giới và mười đỉnh núi
Tham khảo nhịp thập cấp của Đấu La Đại Lục: Hồn Sĩ, Hồn Sư, Đại Hồn Sư, Hồn Tôn, Hồn Tông, Hồn Vương, Hồn Đế, Hồn Thánh, Hồn Đấu La, Phong Hào Đấu La; cấp 100 là mốc vượt giới. Đây là tham chiếu cấu trúc, không sao chép thế giới hoặc nhân vật.
Nguồn tham khảo: https://game.xiaomi.com/viewpoint/1359077112_1631949949024_9
Tên cảnh giới riêng dùng trong sản phẩm:
| Cấp | Danh hiệu |
|---|---|
| 1–10 | Sơ Nhập Giang Hồ |
| 11–20 | Luyện Thể Hiệp Sinh |
| 21–30 | Dưỡng Khí Hiệp Sĩ |
| 31–40 | Tụ Khí Kiếm Khách |
| 41–50 | Ngưng Tâm Cao Thủ |
| 51–60 | Thông Mạch Danh Hiệp |
| 61–70 | Hợp Nhất Tông Sư |
| 71–80 | Phá Cảnh Đại Tông Sư |
| 81–90 | Vấn Đạo Chân Nhân |
| 91–99 | Đăng Phong Chí Tôn |
| 100 | Nhất Đỉnh Viên Thành |
Đây là danh hiệu theo dải cấp; từng cấp vẫn có số hiển thị riêng, tránh 1.000 tên khó nhớ.

Mười đỉnh đề xuất: Thanh Trúc, Bích Khê, Vân Tùng, Minh Nguyệt, Xích Hà, Bạch Vân, Thiên Sơn, Huyền Không, Vô Cực, Quy Nguyên.
Mỗi đỉnh có phối cảnh, trang phục, linh thú và chương truyện riêng; chỉ sản xuất Thanh Trúc trước.
Cửa ải mỗi 10 cấp: Trì Hoãn, Phân Tâm, Nóng Vội, Ôm Đồm, So Sánh, Cầu Toàn, Nản Chí, Chấp Niệm, Tự Mãn, Vọng Cầu. Đây là hình tượng hài hước cho thói quen, không gắn nhãn đạo đức cho người chơi.
MVP: boss là thử thách hoàn thành nhóm việc đã chọn, tối đa ba mục; chưa có chiến đấu điều khiển. Thời hạn tự nguyện 1/3/7 ngày, có gia hạn hoặc nghỉ; hết hạn chỉ đặt lại thử thách, giữ thành quả và XP.

## 6. Chín phương diện tu dưỡng
| Nhãn đời thường | Danh xưng game | Ví dụ |
|---|---|---|
| Thể chất | Căn Cốt | Đi bộ, yoga |
| Tinh thần | Tâm Lực | Nghỉ ngơi, thiền |
| Tài chính | Tài Lược | Lập ngân sách |
| Quan hệ | Nhân Duyên | Dành thời gian cho gia đình |
| Trí tuệ | Ngộ Tính | Học kỹ năng |
| Cảm xúc | Định Tâm | Viết nhật ký |
| Vật chất | Gia Nghiệp | Dọn không gian sống |
| Nghiệp báo | Tỉnh Nghiệp | Nhận lỗi, sửa thói quen |
| Phước báo | Thiện Duyên | Giúp người, phụng sự |
Người dùng chọn một trục chính và tối đa một trục phụ. Điểm phân bổ tổng bằng XP nhận được, không nhân đôi; mặc định 100% trục chính, có trục phụ thì 70/30. Tất cả là chỉ số hoạt động tự ghi nhận, không đo sức khỏe, tài sản hay phẩm hạnh thực tế. Cho phép ẩn từng trục.

## 7. Giao diện và văn phong
Màn hình: Sơn môn (tổng quan), Hiệp khách phổ (hồ sơ), Sơn hà đồ (bản đồ), Tu luyện lục (nhiệm vụ), Hành trang, Bách bảo các, Linh thú uyển, Thiết lập.
Từ vựng: task → nhiệm vụ; checklist → bước tu luyện; dự án → đại sự; XP → tu vi; level → tầng tu luyện; đồng bộ → Hợp nhất hành trình; offline → Ẩn tu ngoại tuyến; xung đột → Hai bản hành trình cần phân định; trở lại → Trở về thư phòng.
Thông báo mẫu: “Đại sự đã thành, tu vi tăng tiến!”; “Hiệp khách tạm nghỉ, giang hồ vẫn đợi.”
Giữ thông báo lỗi dễ hiểu, có câu giải thích hiện đại khi cần. Không dịch tên task, tên người, file hay địa chỉ kỹ thuật.
Desktop có bản đồ và hồ sơ song song; mobile một vùng chính và thanh điều hướng dưới; nút ít nhất 44px, không dùng hover làm thao tác duy nhất. Có giảm chuyển động, tắt âm, tương phản và điều khiển bàn phím.

## 8. Định hướng nhân vật và animation
Hai hình tượng nam/nữ trưởng thành phong cách chibi đầu lớn, thân nhỏ, đường nét tròn, nét 2D sạch, trang phục kiếm hiệp nguyên bản.
Nam: thanh ngọc/xanh trúc, tóc búi, đai vải, kiếm có vỏ. Nữ: tử đinh hương/hồng sen, tóc búi đôi hoặc nửa búi, kiếm có vỏ. Hai lựa chọn có năng lực và XP ngang nhau, đổi ngoại hình không mất tiến trình.
Bộ trạng thái: đứng thở, chớp mắt, đi, chắp tay chào, đọc sách, ngồi thiền, vui chiến thắng, ngạc nhiên, mệt và nghỉ, thăng cấp.
Giai đoạn hiện tại tạo concept đa cảm xúc; concept sheet không được gọi là sprite animation đã chạy.
Production cần tách lớp tóc/thân/tay/áo/vũ khí, pivot nhất quán, hoặc sprite atlas có cell đồng nhất. Idle 4–6 frame, walk 8 frame, salute 6 frame, celebration 8 frame; 8–12 fps cho sprite. Bản thử nghiệm có thể dùng 2–3 loop nhỏ, sau đó bổ sung bộ đầy đủ.
Linh thú đầu tiên: tiểu hồ ly hoặc trúc miêu, ngoại trang không tăng lợi thế công việc. Cửa tiệm chỉ dùng ngân lượng kiếm trong game, MVP không thanh toán.

## 9. Rà soát kiến trúc từ mã đính kèm
package.json xác nhận 1.15.26. dist/app.js chứa data.projects, task.col, task.checks[].done, save(), progress() và taskPct(). dist/experience.js đang mở rộng UX, tên file không có nghĩa đã có hệ thống kinh nghiệm.
dist/modules/delta.mjs flatten/inflate tách root, project, task, note, trash, template; server/workspace-store.mjs xử lý revision, staging và commit. Không gắn game vào root blob rồi mặc định sẽ an toàn khi đồng bộ nhiều máy.
scripts/build.mjs nhúng asset từ scripts/assets.json vào Worker và tạo static output; thêm module game phải cập nhật manifest/build/cache, tải lười phần cảnh/nhân vật.
.github/workflows/build-worker.yml tự deploy khi push main; nhánh experiment/game-mode chỉ thêm tài liệu/thử nghiệm, không chạy deploy production. Không chạy workflow_dispatch trên nhánh này.

## 10. Dữ liệu và tính đúng đắn
Đề xuất bảng riêng: game_profiles(user_id, appearance, mountain, preferences, version);
game_events(user_id,event_id,source_kind,source_id,source_generation,rule_version,xp,axis_split,created_at,server_at,status);
game_inventory(user_id,item_id,quantity); game_challenges(user_id,challenge_id,state,version).
UNIQUE(user_id,source_kind,source_id,source_generation,reward_kind) ở sổ thưởng, event_id duy nhất khi gửi lại. Máy chủ tự tính XP, không nhận XP client tự khai. Không dùng device_id làm khóa thưởng vì cùng task ở hai thiết bị phải hợp nhất.
Mỗi giao dịch hoàn tất thực sự ở server ghi thưởng cùng transaction dữ liệu nguồn hoặc transactional outbox; tổng XP/cache suy ra từ ledger. Các hook task/checklist phải gom về cùng một đường xử lý; không suy thưởng từ DOM hay lời chúc pháo hoa.
Offline lưu event và nguồn thay đổi cùng transaction IndexedDB, retry có idempotency; XP tạm có nhãn “Chờ hợp nhất”. Đồng bộ thành công mới chốt.
Xung đột việc xử lý trước: không cấp thưởng cho trạng thái bị từ chối. Hai máy hoàn tất cùng ID chỉ một thưởng. Hai việc khác ID đều được giữ nếu hợp lệ.
Undo một lần hoàn tất chưa đồng bộ hủy event chờ; undo thành quả đã chốt tạo reversal liên kết, không xóa ledger. Làm lại khôi phục phần thưởng gốc, không cộng thêm. Quy tắc tránh thông báo phạt người dùng: gọi là điều chỉnh sổ tu vi.
Xóa/lưu trữ không thưởng; task mẫu/demo không thưởng; import và baseline lần đầu không thưởng hồi tố. Thưởng mốc dự án đòi hỏi chuyển trạng thái do hoàn tất task thật, không do xóa task còn dang dở.
Bản sao task là nguồn mới, nhưng không thưởng những phần có sẵn trạng thái Done khi sao chép; chỉ lần hoàn tất mới sau baseline được tính. Dự án mở lại không nhận mốc dự án lần hai.
Cần kiểm tra giới hạn dung lượng, phân trang ledger, phân quyền theo tài khoản; đăng xuất không để lộ hồ sơ người trước.

## 11. Lộ trình và tiêu chí nghiệm thu
P0 — hiện tại: nhánh độc lập, tài liệu sản phẩm, concept nam/nữ và spec animation.
P1 — vertical slice: chọn nhân vật, ghi thưởng task/checklist/dự án chính xác, XP bar cả hai chế độ, cấp 1–100, Thanh Trúc, offline và ledger; chưa shop/boss phức tạp.
P2: chín trục, bản đồ, cửa ải thập cấp, hành trang và shop ngoại trang.
P3: linh thú, đỉnh tiếp theo, truyện và âm thanh; đo phản hồi trước khi sản xuất đủ 10 đỉnh.
Nghiệm thu P1: mở/tắt game không cản Kanban; hoàn tất qua Kanban/list/calendar/focus cùng kết quả; tick lặp không tăng XP; import không thưởng; hai thiết bị cùng ID không trùng; offline/retry/reload không mất thưởng; lỗi quota không mất việc; chuyển tài khoản cách ly; level boundary 1/10/99/100 và XP dư chính xác; bàn phím và giảm chuyển động hoạt động.
Đo trong thử nghiệm tự nguyện: người dùng có quay lại làm việc, tỷ lệ đóng game để tiếp tục việc, số thưởng trùng (mục tiêu 0), lỗi đồng bộ và mức gây phân tâm. Không đặt thời gian chơi dài làm KPI chính.

## 12. Quyết định PM
Bắt đầu bằng game 2D nhẹ và một đỉnh có chiều sâu. Giá trị cốt lõi là biến tiến bộ thật thành hành trình đáng nhớ. Một checklist rửa bát cũng có thể luyện tâm; chưa cần triệu hồi thiên lôi để mở cửa tiệm.
