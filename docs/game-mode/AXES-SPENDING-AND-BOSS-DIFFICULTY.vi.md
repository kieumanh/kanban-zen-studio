# Cửu trụ: tiêu dùng, tài sản và độ khó vượt cấp — luật 0.5
Ngày 31/10/2026 · Nhánh experiment/game-mode · Đặc tả chưa tích hợp runtime.
Ưu tiên hơn các mô tả mâu thuẫn ở luật 0.4 và catalog boss.

## 1. Chín phương diện
Đổi “Tỉnh Nghiệp” thành “Tu Đức”: ghi nhận tự nhìn lại, giữ lời, nhận trách nhiệm và sửa thói quen, không chấm điểm đạo đức.
Chín tên hiện hành: Căn Cốt, Tâm Lực, Tài Lược, Nhân Duyên, Ngộ Tính, Định Tâm, Gia Nghiệp, Tu Đức, Thiện Duyên.
Giữ tách biệt Tâm Lực (nuôi dưỡng tinh thần), Định Tâm (nhận diện/điều hòa cảm xúc), Tu Đức (tự điều chỉnh hành vi), Thiện Duyên (hành động giúp người).
Không suy đoán chỉ số từ nội dung task. Người dùng chọn chính/phụ, có giải thích ngắn và ví dụ. Cho ẩn trục chưa muốn dùng; không bắt đủ chín trục để vượt ải.

## 2. Ba đại lượng phải hiển thị riêng
- Tổng nội lực tích lũy P: từ thành quả hợp lệ, dùng xét cấp, không giảm vì tiêu dùng.
- Điểm trục tích lũy E_i: lịch sử hoạt động của trục, không giảm vì tiêu dùng.
- Điểm trục khả dụng B_i = E_i + hoàn trả hợp lệ − điểm đã tiêu dùng − điều chỉnh giảm hợp lệ. Đây là số dư thực tế để dùng, không âm.
Cấp trục nếu bổ sung sau này phải dựa trên E_i; không dùng B_i để làm tụt cấp khi mua đồ. Không phát minh ngưỡng cấp trục mới.
Tổng số dư khả dụng=sum(B_i); không gọi đây là nội lực xét cấp. Phân bổ 70/30 chính/phụ tiếp tục bảo toàn điểm; điểm chưa phân loại U vẫn cộng nội lực nhưng chưa tiêu dùng đến khi phân bổ.
Điều chỉnh sai thành quả khác tiêu dùng. Nếu undo làm E giảm nhưng điểm đã tiêu, giữ B=0 và ghi khoản bù nội bộ để lần kiếm mới bù trước, không để B âm hoặc âm thầm xóa tài sản. UI phải giải thích điều chỉnh; cần cơ chế quản lý dữ liệu sai riêng.

## 3. Thanh tiến độ và bố cục
Đầu hồ sơ: cấp, thanh tổng nội lực e/R(L), phần trăm, điểm còn thiếu, trạng thái cửa boss và điểm dư. Dùng công thức hiện hành, chưa tự thay dãy nhân đôi.
Bên dưới: lưới 9 thẻ (desktop 3 cột, tablet 2, mobile 1), mỗi thẻ có:
Tên + chú giải; số dư khả dụng nổi bật; tổng từng tích lũy ở dòng phụ; nút “Tiêu dùng”; nút lịch sử.
Thanh phụ biểu thị số dư/tổng từng tích lũy: B_i/E_i ×100%, nhãn “Điểm còn dùng được”. Khi E_i=0 hiển thị 0/0 và 0%, tránh chia 0. Thanh này có thể giảm theo chi tiêu, không phải tiến độ cấp.
Nếu thêm thanh cấp riêng cho từng trục thì phải tách rõ “Tu luyện” và “Khả dụng”, không dùng một thanh mang hai nghĩa.
Sau cộng điểm: thanh tổng tăng và chỉ các trục có nhận điểm tăng; hiển thị “+25 nội lực · Ngộ Tính +17,5 · Tâm Lực +7,5”. Có giảm chuyển động, nhãn số thay cho chỉ phân biệt bằng màu.
Không so sánh chuẩn hóa chín trục để đánh giá con người; biểu đồ chỉ giúp tự xem xu hướng. Báo cáo tuần gợi ý từ dữ liệu hoạt động, không chẩn đoán sức khỏe hay phẩm chất.

## 4. Độ khó boss mỗi 10 cấp
Boss là cuộc thi hoàn thành đủ lượng task đạt chuẩn trong hạn. “Khó hơn 20–30%” được định nghĩa là mật độ khối lượng công việc/thời gian, không phải tăng cả khối lượng và siết thời gian cùng lúc.
Mỗi đỉnh có 10 bậc tại 10,20,...,100. Hệ số thách thức r(k)=0,20+0,10×(k−1)/9 với k=1..10: 20%;21,1%;22,2%;23,3%;24,4%;25,6%;26,7%;27,8%;28,9%;30%.
Đây là độ khó tương đối với nhịp bình thường hiện tại. Không hứa mỗi boss tuyệt đối khó hơn boss cũ nếu người dùng đổi thời lượng/phạm vi việc.

Baseline: người dùng xác nhận khối lượng phút ước tính thường hoàn tất trong một khoảng thời gian đã chọn. Khi có dữ liệu, gợi ý trung vị của 10 phiên hoàn thành gần nhất có ghi thời gian thực và cùng ngữ cảnh, loại phiên đã hủy; chưa đủ dữ liệu thì dùng khai báo, không suy ra từ việc ứng dụng đang mở. Giải thích rõ baseline là ước lượng, không đo năng suất tuyệt đối.
Cho baseline W0 trong thời lượng T0, chọn một cách:
A. Giữ T0: khối lượng mục tiêu W*=W0×(1+r).
B. Giữ W0: thời hạn T*=T0/(1+r).
Ví dụ W0=100 phút công việc trong T0=120 phút: +25% nghĩa là W*=125 phút trong 120 phút; hoặc giữ 100 phút công việc và hạn còn 96 phút. Không đồng thời dùng 125 phút công việc và 96 phút thời hạn.
Task đạt chuẩn: chưa Done, không demo/lưu trữ/thùng rác, chưa thuộc vòng khác, phụ thuộc đã giải quyết, có tiêu chí hoàn thành và ước tính được người dùng xác nhận. Snapshot ghi ID và checklist bắt buộc.
Bốc ngẫu nhiên từ các tổ hợp phù hợp với W*, hiển thị số lượng N và tổng khối lượng. Luật “chỉ 1–3 task” cũ trở thành mặc định gợi ý; nếu mục tiêu cần hơn 3 task, cho đề xuất N lớn hơn và xác nhận trước khai cuộc. Không buộc chia việc thành task nhỏ để đủ số lượng.
Nếu chỉ dựa số task đồng đều có thể dùng N≈N0×(1+r), nhưng làm tròn có thể khiến vượt 30%; phải hiển thị hệ số thực tế, không gắn nhãn sai. Ưu tiên khối lượng ước tính, đồng thời vẫn yêu cầu hoàn tất đủ N task.
Đề đạt chuẩn có (sum(estimate)/deadlineDuration)/(W0/T0) trong [1,20;1,30]. Nếu tập task rời rạc không tạo được đề phù hợp, cho đổi phạm vi hoặc điều chỉnh thời hạn, không lén bốc việc dễ hơn hay tự nâng độ khó.
Trước khai cuộc luôn cho chỉnh hạn và xem độ khó tính lại. Trong trận có thể điều chỉnh, lưu lịch sử. Muốn tính vượt ải chuẩn thì hạn mới vẫn đáp ứng [1,20;1,30]. Nếu người dùng cần nới hơn mức chuẩn, vẫn giữ công việc và chuyển vòng thành “Luyện tập”; không giả báo thắng boss chuẩn. Có thể lập vòng chuẩn mới sau.
Thắng: đủ nội lực, hoàn tất tất cả N task/checklist snapshot trong hạn, không có tiêu chí còn thiếu. XP dư giữ lại; boss không bù điểm. Thua vẫn giữ XP việc thật.
Không ép task tự khai có cùng độ khó thực; đây là thách thức tự quản, không phải chứng nhận năng suất.

## 5. Luồng Tiêu dùng
Bấm nút trên trục → form → xem số dư trước/sau → xác nhận → ghi sổ, trừ điểm, tạo tài sản nếu có.
Form:
- Trục nguồn (điền sẵn); loại: hoạt động/chi tiêu khác, mua vật phẩm, mua sách kỹ năng.
- Số điểm muốn dùng (>0, tối đa hai số thập phân).
- Ghi chú dùng cho việc gì (bắt buộc); thời điểm (mặc định hiện tại).
- Với vật phẩm/sách: tên bắt buộc do người dùng nhập hoặc chọn từ danh mục do họ cung cấp, mô tả tùy chọn, số lượng nguyên dương, đơn giá hoặc tổng giá rõ ràng.
- Tệp minh chứng tùy chọn, không bắt phải cung cấp thông tin riêng tư.
Mỗi giao dịch MVP dùng một trục; chưa tự quy đổi hoặc rút từ trục khác. Không tự đổi tiền đời thực sang điểm. Ghi khoản mua đời thực vào đây là nhật ký tự khai, không đồng nghĩa hệ thống thực hiện thanh toán.

Giảm điểm: d=min(số yêu cầu,B_i). Với chi tiêu khác vượt số dư, hiện “Chỉ còn B_i điểm; dùng toàn bộ và dừng ở 0?” để xác nhận trước khi ghi; không âm thầm cắt và lưu ghi chú như đã chi đủ.
Với mua vật phẩm/sách không đủ điểm: chặn mua, không tạo tài sản đủ giá khi chưa trả đủ; cho sửa số lượng/giá bằng thao tác có chủ ý. Không tự áp giá hoặc tự bổ sung tên.
Đúng bằng số dư: trừ hết về 0. Khi B_i=0 nút bị vô hiệu hóa và có lời giải thích. Không tự giảm theo thời gian; “trừ dần” là qua từng giao dịch được xác nhận.
Không tự suy vật phẩm từ văn bản ghi chú tự do; tạo tài sản khi loại giao dịch đã chọn là mua vật phẩm/sách.

## 6. Kho tài sản nhân vật
Bản ghi tài sản: ID, owner, tên nguyên văn, loại item/skill-book, mô tả do người dùng cung cấp, số lượng, trục chi, tổng điểm chi, purchaseTransactionId, ngày tạo, nguồn ChatGPT/nhập tay.
Sách mới ở trạng thái “Đã sở hữu”; không tự sinh công dụng hoặc đánh dấu đã học. Chỉ có “Lĩnh ngộ” khi người dùng đã cung cấp quy tắc kỹ năng tương ứng.
MVP tạo một lô tài sản cho mỗi giao dịch, tránh gộp hai món cùng tên nhưng khác bản chất. Có thể nhóm hiển thị nhưng truy ngược được từng lô.
Giao dịch trừ điểm và tạo tài sản là nguyên tử. Lỗi tạo kho phải rollback điểm. Double click/retry/two-device không trừ hoặc sinh đồ hai lần.
Hủy giao dịch dùng reversal có liên kết: hoàn đúng điểm đã trừ và thu hồi đúng lô tài sản nếu chưa sử dụng. Tài sản đã sử dụng/đã lĩnh ngộ cần luồng hoàn tác phụ thuộc rõ ràng, không hoàn điểm tự động rồi vẫn giữ lợi ích.
Giữ ngân lượng/linh ngọc cũ như đề xuất lịch sử; MVP hiện ưu tiên chi điểm từng trục theo yêu cầu mới, chưa thu đồng thời cả điểm trục và ngân lượng.

## 7. Sổ giao dịch và đồng bộ
Ledger sự kiện earn, spend, refund, allocation-transfer, correction, với idempotencyKey, user, axis, số điểm integer/100 dạng chuỗi, nguồn, timestamp, ghi chú và revision.
Chi server kiểm tra B_i trong transaction rồi trừ và cấp asset; CAS/khóa bảo vệ hai giao dịch đồng thời không vượt số dư. Không tin số dư client gửi.
Offline cho ghi bản nháp tiêu dùng, hiển thị số dư dự kiến; tài sản ở trạng thái chờ xác nhận, không dùng/mua bán tiếp trước commit. Khi hai máy cùng chi vượt số dư, giữ giao dịch đã chốt và yêu cầu sửa bản nháp còn lại, không cho âm hoặc hủy thành quả công việc.
Chỉ correction có thể làm thay đổi tổng nội lực; spend/refund tài sản không thay đổi cấp. Quyền truy cập kho đã mở qua boss giữ lại.
Điểm BigInt/chuỗi theo luật0.4, không dùng số thực để trừ tiền hoặc điểm.

## 8. Các kiểm tra bắt buộc khi triển khai
Tổng/thanh trục cộng đúng 70/30; spend không giảm cấp; 0/0; chi đúng số dư; yêu cầu vượt số dư; mua thiếu điểm; số âm, NaN, sai số; ghi chú/tên trống; quantity sai; tạo asset thất bại rollback; trùng submit; hai máy chi cùng lúc; offline draft; hoàn tác có tài sản đã dùng; boss100 và mốc10; độ khó sau chỉnh hạn; không đủ task đạt chuẩn; khác nhau giữa draft, luyện tập và cửa ải chuẩn.
