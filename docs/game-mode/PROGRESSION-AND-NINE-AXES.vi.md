# Nội lực và Cửu trụ tu dưỡng — luật 0.4

> CẬP NHẬT 0.5: [Chín trục, tiêu dùng và độ khó boss](AXES-SPENDING-AND-BOSS-DIFFICULTY.vi.md) là đặc tả bổ sung hiện hành: dùng điểm khả dụng từng trục, giữ tổng nội lực xét cấp; boss khó hơn baseline 20–30%; tên mới Tu Đức. Chưa tích hợp runtime.
Ngày 31/10/2026 · Nhánh experiment/game-mode · Đặc tả, chưa tích hợp runtime.
Luật này ưu tiên hơn công thức 1.06, phần thưởng skill/vật phẩm tự tạo và gate-topup trong các tài liệu cũ.

## Nội dung do chủ nhân cung cấp
Danh sách kỹ năng, sách kỹ năng và vật phẩm chỉ do người dùng trực tiếp cung cấp qua ChatGPT. Không tự đặt tên, tạo công dụng, giá hoặc tự lấp chỗ trống.
Danh mục hiện tại để rỗng skillBookIds/itemIds. Tên skill và đồ từng đề xuất trong tài liệu 0.2/0.3 là lịch sử không còn hiệu lực; bosses.json đã gỡ những nội dung đó.
Khi nhận danh sách: chuẩn hóa ID, tên, mô tả, nhóm, điều kiện mở khóa và giá nếu đã có; giữ phần thiếu ở trạng thái bản nháp, hỏi lại khi cần, không tự phát minh. Cho người dùng xem bản chuẩn hóa trước khi nhập chính thức.
Kho chưa có nội dung hiển thị “Chờ chủ nhân bổ sung vật phẩm và bí kíp”; vượt boss vẫn ghi nhận mở kho, không tự sinh quà thay thế. Ngân lượng/linh ngọc là hệ tiền tệ đã đề xuất, chưa phải mặt hàng.

## Chín chỉ số — mô hình hoạt động tự ghi nhận
Đây là đề xuất thiết kế từ chín lĩnh vực ghi chú, không phải thang tâm lý hay sức khỏe đã được kiểm định.
| Chỉ số | Lĩnh vực | Hành vi có thể ghi nhận |
|---|---|---|
| Căn Cốt | Thể chất | Vận động, ngủ nghỉ có kế hoạch |
| Tâm Lực | Tinh thần | Thực hành chú tâm, nghỉ ngơi |
| Tài Lược | Tài chính | Ghi sổ, lập ngân sách, học quản lý tiền |
| Nhân Duyên | Quan hệ | Chăm sóc gia đình, đối thoại, cộng tác |
| Ngộ Tính | Trí tuệ | Học, đọc, nghiên cứu, luyện kỹ năng |
| Định Tâm | Cảm xúc | Nhận diện cảm xúc, viết nhật ký, phản hồi bình tĩnh |
| Gia Nghiệp | Vật chất/không gian sống | Chăm vườn, bảo dưỡng, sắp xếp đồ dùng |
| Tu Đức | Phần nghiệp báo trong ghi chú | Nhận lỗi, sửa thói quen, chịu trách nhiệm |
| Thiện Duyên | Phần phước báo trong ghi chú | Giúp người, thiện nguyện, chăm sóc cộng đồng |

Tâm Lực ghi hoạt động nuôi dưỡng tinh thần; Định Tâm ghi hoạt động nhận diện/điều hòa cảm xúc để giảm trùng. Tài Lược ghi quản trị dòng tiền; Gia Nghiệp ghi chăm sóc tài sản và môi trường sống.
Không suy ra “nghiệp xấu/phước lớn” hoặc mức giác ngộ từ điểm. Không xếp hạng đạo đức hay ép cân bằng đủ chín trục để qua boss.
Gắn mỗi task một trục chính và tùy chọn một trục phụ; checklist kế thừa hoặc đổi nhãn riêng. Không tự đoán nhãn từ nội dung nhạy cảm. Việc chưa phân loại vẫn nhận nội lực, điểm trục nằm ở nhóm chờ phân bổ.

## Hai sổ điểm, một nguồn thành quả
Nội lực P là tổng điểm thành quả hợp lệ, quyết định cấp chung. Điểm A1..A9 phản ánh nội dung hoạt động, không lấy cộng thêm vào P lần nữa.
Thưởng hiện tại tiếp tục là tham số dự kiến: checklist 5, task 25, mốc dự án 100. Không thay đổi ngầm khi đổi công thức lên cấp.
Một trục nhận 100%; hai trục nhận 70/30. Để không sai số, dùng đơn vị nội bộ bằng 1/100 điểm: thưởng 5 → 500 đơn vị, chia 350 và 150, hiển thị 3,5/1,5. Điểm chưa gắn nhãn giữ trong U, luôn P = sum(A1..A9)+U.
Đổi nhãn chỉ chuyển phân bổ, không sinh thưởng. Thưởng task và checklist là hai loại sự kiện đã quy định, không cộng checklist lần thứ hai khi task Done. Tổng phân bổ mốc dự án theo nhãn người dùng chọn, không tự nhân tổng XP các task.
Vòng thi dùng chính các sự kiện task đã thưởng, không thưởng lại nội lực vì cùng task vừa giúp thắng boss. Boss mở khóa mốc và kho, không tạo điểm bù cấp. Mọi điều chỉnh điểm có lịch sử.

## Cấp tăng theo dãy nhân đôi đúng yêu cầu
Nhân vật bắt đầu cấp 1 với 0 điểm. Chi phí từ cấp L lên L+1:
R(L) = B × 2^(L−1), L =1..99.
B=1 cho đúng dãy 1;2;4;8;16;32;64... Các ví dụ sau dùng B=1.
Ngưỡng tổng để đạt cấp L:
T(L) = B × (2^(L−1)−1).
T(1)=0; T(2)=1; T(3)=3; T(4)=7. Phân biệt chi phí của một lần lên cấp với tổng tích lũy.
| Lên cấp | Chi phí riêng | Tổng sau khi đạt cấp mới |
|---|---:|---:|
| 1→2 | 1 | 1 |
| 2→3 | 2 | 3 |
| 3→4 | 4 | 7 |
| 4→5 | 8 | 15 |
| 5→6 | 16 | 31 |
| 6→7 | 32 | 63 |
| 7→8 | 64 | 127 |
| 8→9 | 128 | 255 |
| 9→10 | 256 | 511 |
| 10→11 | 512 | 1.023 |
| 19→20 | 262.144 | 524.287 |
| 29→30 | 268.435.456 | 536.870.911 |
| 49→50 | 281.474.976.710.656 | 562.949.953.421.311 |
| 99→100 | 316.912.650.057.057.350.374.175.801.344 | 633.825.300.114.114.700.748.351.602.687 |

Điều kiện nhân đôi toàn bộ 100 cấp gây tăng cực lớn. Với giả định đều đặn 200 điểm/ngày, cấp 20 khoảng 2.622 ngày, cấp 30 khoảng 7.354 năm (365 ngày/năm). B=100 chỉ làm các mốc này khó hơn 100 lần; không giải quyết vấn đề tăng quá nhanh. Khi giữ thưởng 5/25/100, các cấp đầu có thể nhảy nhiều cấp trong một lần thưởng.
Không tự đổi yêu cầu thành công thức mềm hơn. Đề xuất để người dùng cân nhắc: giữ nhân đôi từng cấp cho mô hình nguyên bản; hoặc nhân đôi theo mỗi nhóm 10 cấp, R(L)=B×2^floor((L−1)/10), có thể bổ sung hệ số tăng nhẹ trong nhóm nếu được yêu cầu. Phương án thứ hai là thay đổi luật, chưa được áp dụng.
Nếu muốn giữ nhân đôi từng cấp mà còn khả thi, cần cả kinh tế phần thưởng tăng tương ứng về sau; phải cân bằng riêng, không tự tạo kỹ năng/vật phẩm tăng thưởng để chữa công thức.

## Progress bar và khóa boss
Ở cấp hiện tại L, điểm tích trong cấp e=max(0,P−T(L)); thanh =min(100,100×e/R(L)).
Hiển thị L, e/R(L) và phần trăm; khi bị khóa boss hiển thị riêng nội lực dự trữ vượt ngưỡng, không để thanh vượt 100%.
Ví dụ cấp 7 có ngưỡng tổng 63, cần 64 để lên 8. Tổng P=103 cho 40/64 =62,5%; tổng 127 đủ lên 8 nếu không có khóa cửa.
Ở cấp 10, tổng 511 là vừa đạt 10; thanh cấp 10 bằng 0/512. Boss có thể xuất hiện và chuẩn bị đề, nhưng vòng thi chính thức chỉ bắt đầu khi thanh đủ 512/512, tức P>=1.023. Cần cả đủ nội lực và thắng vòng thi để lên 11.
Ở cấp 20 tương tự: đủ điểm tới ngưỡng 21 và thắng boss 20. Thắng boss không tự bù điểm còn thiếu; bỏ hoàn toàn gate-topup của luật 0.3.
Sau khi thắng, giữ điểm dư và tự xét tới khóa kế tiếp. Thua giữ nguyên P; vòng thi mới có thể tạo thêm XP qua task mới nhưng không thưởng lại task cũ.
Cấp 100 là trần đỉnh. Điểm thêm ghi riêng kho dự trữ; tiến độ cửa đỉnh hiển thị trạng thái thay cho thanh chia 0. Chiến thắng boss100 mở đỉnh mới. Đề xuất mỗi đỉnh mới dùng lại chi phí địa phương và giữ ledger thành tựu toàn hành trình; cần cân bằng sau khi chốt đường cong, chưa mặc định chi phí tăng 2^100 tiếp.
Người dùng chỉ dùng Kanban vẫn tích P; không mở game thì cấp có thể dừng tại khóa nhưng không mất thành quả.

## Dữ liệu số lớn và kiểm tra
Dãy nhân đôi vượt Number.MAX_SAFE_INTEGER sau cấp 54 về ngưỡng tổng. Lưu điểm bằng số nguyên đơn vị 1/100 dưới dạng chuỗi thập phân, xử lý BigInt phía JavaScript và phép toán số nguyên phù hợp ở server; không dùng REAL hoặc SQLite INTEGER cho toàn miền 100 cấp.
JSON truyền chuỗi, không serialize BigInt trực tiếp. Phần trăm tính bằng chia nguyên theo basis point trước khi chuyển sang Number để vẽ thanh.
Kiểm tra T(L+1)−T(L)=R(L), T1=0, mốc 10/20/99/100, điểm thiếu một đơn vị, XP dư, khóa boss, không gate-topup, phân bổ bảo toàn, đổi nhãn, duplicate event và đồng bộ hai máy.
progression.mjs cũ vẫn là thí nghiệm 1.06, không phải implementation của luật 0.4; không được dùng nó để quảng bá đã tích hợp dãy nhân đôi.

## Thứ tự xây dựng đề xuất
1. Chốt đường cong cấp: nhân đôi từng cấp hay từng nhóm. Đây là quyết định cần làm rõ trước triển khai kinh tế 100 cấp.
2. Sổ thưởng chống trùng + phân bổ chín trục + thanh nội lực có khóa boss.
3. Vòng thi 1–3 task và deadline chỉnh được.
4. Kho trống chờ danh sách người dùng, luồng nhập danh mục qua ChatGPT.
5. Nhân vật/animation và 10 boss đầu; mở rộng nội dung sau khi đo nhịp sử dụng.
