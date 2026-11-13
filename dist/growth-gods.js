// v2.13.0 (Thần Giới): thế giới của các vị thần phía sau Thiên Môn (cánh cửa cấp 99 → 100), theo yêu cầu của chủ dự án:
//  - 5 Thần Vương đứng đầu, quản mọi sự vụ của Thần giới;
//  - 12 Phương thần (thần cao đẳng) chủ quản 12 phương, mỗi phương mang tên một địa chi;
//  - 36 Thiên Cang tinh là chủ lực chiến đấu, bảo vệ Thần giới và các thế giới khác; mỗi phương có 3 vị;
//  - thần vị không mở thêm, chỉ kế thừa từ vị sắp gác ngôi hoặc đi ngao du vũ trụ.
// Nối với Truyện ký (dist/growth-tale.js, chương 97 và 100): hiệp khách kế thừa ngôi Hằng Nguyệt, ngôi thứ 36 của Thiên Cang, thuộc
// phương Hợi; ngôi Phương thần phương Hợi bỏ trống từ khi Vô Yểm bị đày, tới khi nó đòi lại trong thân Lệ Vô Khuyết (Huyết Nguyệt).
// Tên các vị thần và phương là sáng tác riêng của ứng dụng.
// v2.14.0 (Thần Lộ): đường lên Thần Vương. Từ cấp 100, đủ điểm tu vi chưa đủ để lên cấp:
//  - lĩnh ngộ tám quy luật tự nhiên (mỗi quy luật ứng với một chỉ số của Tu vi; lĩnh ngộ = điểm đã tích lũy của chỉ số ấy);
//  - cấp 101 (Thượng Thần): thắng lần lượt 35 Thiên Cang còn lại; cấp 102 (Phương Thần): thắng 12 Phương thần, vị cuối là Huyết
//    Nguyệt ở phương Hợi; cấp 103 (Thần Vương): ngang tài với Trường Lưu Thần Vương, vị sắp gác ngôi;
//  - mỗi trận cần một mốc tu vi và một mức lĩnh ngộ; thắng thì có chiến ký để đọc, thắng đủ một phương là thám hiểm xong phương ấy.
// Chiến tích suy ra từ tổng tu vi và điểm tám chỉ số đã tích lũy (không giảm, không đổi khi sổ cái gộp dòng cũ), nên không lưu thêm
// gì vào tài khoản; dấu đã đọc chiến ký dùng khóa notice:god-<mã>.
(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const G = () => window.zenGrowth;

  // Năm Thần Vương: [mã, tên, chủ, việc coi sóc]. Trường Lưu sắp gác ngôi để đi ngao du vũ trụ.
  const KINGS = [
    ['so', 'Thái Sơ', 'Sinh', 'Khai sinh các cõi, định ngôi cho thần mới.'],
    ['luu', 'Trường Lưu', 'Thời', 'Giữ dòng thời gian của mọi thế giới.', 'Sắp gác ngôi để đi ngao du vũ trụ.'],
    ['tuong', 'Vạn Tượng', 'Giới', 'Coi ranh giới và những cánh cửa giữa các thế giới, kể cả Thiên Môn.'],
    ['luat', 'Minh Luật', 'Luật', 'Giữ thần luật, xét xử thần phạm lỗi.'],
    ['nguyen', 'Quy Nguyên', 'Tịch', 'Đưa những gì đã trọn vẹn trở về nguồn.'],
  ].map(([id, name, rule, duty, note]) => ({ id, name, title: name + ' Thần Vương', rule, duty, note: note || '' }));

  // Mười hai Phương thần: [địa chi, tên, điều chủ quản].
  const LORDS = [
    ['Tý', 'Huyền Minh', 'đêm sâu và nước lặng'],
    ['Sửu', 'Hậu Tải', 'đất dày chở muôn vật'],
    ['Dần', 'Khai Dương', 'rạng đông và mọi khởi đầu'],
    ['Mão', 'Thanh Mộc', 'mùa xuân và sự lớn lên'],
    ['Thìn', 'Vân Vũ', 'mây mưa điều hòa'],
    ['Tỵ', 'Xích Diễm', 'lửa và lòng nhiệt thành'],
    ['Ngọ', 'Chính Dương', 'giữa trưa và sự minh bạch'],
    ['Mùi', 'Phong Nhiêu', 'mùa màng no đủ'],
    ['Thân', 'Kim Cương', 'kỷ luật và sự bền vững'],
    ['Dậu', 'Thu Liễm', 'thu hoạch và biết đủ'],
    ['Tuất', 'Trấn Thủ', 'biên giới giữa các cõi'],
    ['Hợi', 'Huyết Nguyệt', 'đêm tàn trước rạng đông'],
  ].map(([chi, name, domain], i) => ({ i, chi, name, title: name + ' phương thần', domain }));
  const VACANT = 11; // phương Hợi: ngôi bỏ trống cho tới khi hiệp khách thành Thần (chương 100)

  // Ba mươi sáu Thiên Cang tinh, theo thứ tự ngôi; mỗi phương ba vị: [tên, việc trấn giữ].
  const STARS = [
    ['Minh Báo', 'Ghi sổ nhân quả của cõi người.'],
    ['Thông Bảo', 'Giữ cho của cải các cõi chảy mà không tràn.'],
    ['Tịch Chiếu', 'Canh cõi mộng, giữ giấc ngủ của muôn loài.'],
    ['Kết Duyên', 'Giữ những mối dây giữa người với người.'],
    ['Xuân Sinh', 'Chăm mầm sống ở cõi linh thú.'],
    ['Động Vi', 'Giữ thư khố của Thần giới.'],
    ['Tích Vi', 'Đắp trường thành biên giới, mỗi ngày một viên đá.'],
    ['Thái Hòa', 'Giữ nhịp ngày và đêm.'],
    ['Chính Quả', 'Hộ tống những linh hồn đã trọn hạnh.'],
    ['Lưu Kim', 'Canh những dòng sông sao.'],
    ['An Lan', 'Dẹp sóng ở biển giữa các cõi.'],
    ['Đồng Tâm', 'Dẫn đội tiên phong, chưa từng bỏ lại ai.'],
    ['Kiện Hành', 'Tuần tra không nghỉ quanh cõi băng.'],
    ['Cách Vật', 'Tìm nguyên do của mọi dị tượng.'],
    ['Khai Sơn', 'Mở đường qua những dãy núi giữa các thế giới.'],
    ['Trú Dạ', 'Canh ranh giới sáng tối ở cõi lửa.'],
    ['Hồi Hướng', 'Đem công đức trả về nơi đã gieo.'],
    ['Tán Tụ', 'Gom mây, thả mưa cho những cõi khô hạn.'],
    ['Chỉ Thủy', 'Giữ mặt hồ soi trời của Thần giới.'],
    ['Tri Âm', 'Nghe tiếng kêu cứu từ mọi cõi.'],
    ['Dưỡng Chính', 'Chữa lành cho thần và người sau mỗi trận chiến.'],
    ['Vấn Tân', 'Dẫn đường cho kẻ lạc giữa các thế giới.'],
    ['Trì Hằng', 'Giữ ngọn đèn chưa từng tắt ở cửa Thần giới.'],
    ['Trương Thỉ', 'Xạ thủ số một, biết lúc căng và lúc chùng dây cung.'],
    ['Thiện Căn', 'Canh những hạt giống lành ở cõi âm.'],
    ['Tiết Độ', 'Giữ kho lương của ba mươi sáu Thiên Cang.'],
    ['Định Phong', 'Đứng giữa bão mà vạt áo không lay.'],
    ['Hòa Quang', 'Sống lẫn giữa cõi người để che chở.'],
    ['Cố Bản', 'Giữ gốc rễ của cây nối các cõi.'],
    ['Minh Kính', 'Soi ra chân tướng sau mọi lớp mặt nạ.'],
    ['Đại Thành', 'Thống lĩnh trường thành ngăn hư không.'],
    ['Tiêu Dao', 'Kiếm khách lang thang, thắng trận rồi ngủ ba ngày.'],
    ['Thiên Hình', 'Giữ phép cho Thần giới, tay cầm thước ngọc.'],
    ['Phong Đăng', 'Coi mùa màng của những cõi vừa qua hạn.'],
    ['Vô Ba', 'Mạnh nhất Thiên Cang, tâm như mặt nước không gợn.'],
    ['Hằng Nguyệt', 'Giữ vầng trăng yên của cõi người.'],
  ].map(([name, duty], i) => ({ i, no: i + 1, name, title: name + ' tinh quân', duty, lord: Math.floor(i / 3) }));
  const SEAT = 35; // ngôi Hằng Nguyệt: ngôi hiệp khách kế thừa ở cấp 100

  // Thứ bậc thần vị theo cấp: 100 Thiên Cang tinh quân → 101 Thượng Thần → 102 Phương Thần → 103 Thần Vương.
  const RANKS = [
    { lv: 100, name: 'Thiên Cang tinh quân', note: 'Kế thừa ngôi Hằng Nguyệt, ngôi thứ 36 của Thiên Cang.' },
    { lv: 101, name: 'Thượng Thần', note: 'Đứng đầu Thiên Cang, đủ tư cách thách đấu Phương thần.' },
    { lv: 102, name: 'Phương Thần', note: 'Kế thừa một trong mười hai phương.' },
    { lv: 103, name: 'Thần Vương', note: 'Kế thừa ngôi của một Thần Vương gác ngôi.' },
  ];

  // ---- v2.14.0 (Thần Lộ): tám quy luật tự nhiên, mỗi quy luật ứng với một chỉ số của Tu vi (cùng thứ tự zenGrowth.AXES) -------------
  // Lĩnh ngộ một quy luật = điểm đã tích lũy của chỉ số ấy (không trừ phần đã phân bổ), nên không bao giờ giảm.
  const LAWS = [
    ['Nhân Quả', 'Gieo gì gặt nấy; việc nhỏ hôm nay là quả của ngày sau.', 'Việc tốt nhỏ làm hôm nay là hạt giống của ngày sau. Giữ một lời hứa, giúp một người, rồi quên đi; sổ vẫn ghi.'],
    ['Lưu Thông', 'Của cải như nước: có vào có ra thì trong, ứ lại thì đục.', 'Tiền bạc và nguồn lực cần được xếp dòng, không chỉ được giữ. Biết thu, biết chi, và gieo lại một phần.'],
    ['Tĩnh Động', 'Nước yên thì trăng tròn; tâm lặng mới thấy rõ.', 'Tâm lặng thì nhìn rõ. Dành mỗi ngày một quãng yên, để việc khó tự hiện ra lối đi.'],
    ['Tương Sinh', 'Không gì đứng một mình; người nương người mà lớn.', 'Không ai lớn lên một mình. Một cuộc gọi hỏi thăm, một lời cảm ơn cũng là tu luyện.'],
    ['Sinh Trưởng', 'Thân có mùa của nó: dưỡng đủ thì lớn, ép quá thì gãy.', 'Thân thể có mùa của nó. Ngủ đủ, vận động đều, đừng ép mình lớn nhanh hơn sức.'],
    ['Minh Lý', 'Hiểu đúng một việc thì trăm việc sáng theo.', 'Hỏi đúng câu hỏi quý hơn biết nhiều câu trả lời. Dám nói "chưa biết", rồi quan sát cho kỹ.'],
    ['Tích Lũy', 'Nước chảy đá mòn; lượng đủ thì chất đổi.', 'Việc lớn là nhiều việc nhỏ xếp khít nhau. Hãy đặt cho xong viên đá của hôm nay.'],
    ['Âm Dương', 'Có căng có chùng, có làm có nghỉ, đời mới bền.', 'Có căng phải có chùng. Nghỉ ngơi và niềm vui không phải phần thưởng, mà là một nửa của nhịp làm việc.'],
  ].map(([name, gist, lesson], i) => ({ i, name, gist, lesson }));

  // Tinh đấu: mỗi Thiên Cang ra một đề trong chính việc mình trấn giữ. [cảnh, lời thách, cách hiệp khách thắng, lời nhận thua].
  const STAR_DUEL = [
    ['Điện Minh Báo chất sổ sách cao tới mái. Mỗi cuốn ghi nhân quả của một người phàm.', 'Tân thần muốn thách ta thì trả lời đi: trong sổ của ngươi, việc nào ngươi làm mà không mong ai biết?', '{Name} không kể được hết, vì chính {y} cũng không nhớ. Minh Báo lật sổ: những dòng ấy dài hơn mọi dòng khác.', 'Kẻ không nhớ việc tốt mình đã làm thì ta không còn gì để hỏi. Ngươi thắng.'],
    ['Kho Thông Bảo không có cửa. Vàng bạc các cõi chảy qua như một dòng sông, không dừng lại ở đâu.', 'Ta cho ngươi một kho báu. Giữ được nó nguyên vẹn một ngày thì thắng.', '{Name} mở kho, chia cho từng người đi qua đúng phần họ cần. Cuối ngày kho vẫn đầy: thứ cho đi đã quay về theo lối khác.', 'Ai cũng cố giữ. Chỉ kẻ dám để nó chảy mới giữ được. Qua đi.'],
    ['Cõi mộng là một mặt hồ. Tịch Chiếu tinh quân ngồi giữa hồ, quanh người là giấc ngủ của muôn loài.', 'Đánh thức ta mà không làm gợn mặt hồ. Một gợn sóng thôi là vạn giấc mơ vỡ.', '{Name} ngồi xuống bờ, thở, và chờ. Ba ngày sau, Tịch Chiếu tự mở mắt: lâu lắm rồi mới có người chịu ngồi yên cùng ông.', 'Ngươi không đánh, vậy mà ta thua. Trăng trong thùng nước của ngươi tròn thật.'],
    ['Kết Duyên tinh quân se những sợi tơ nối người với người. Trên tay bà là hàng vạn sợi, không sợi nào rối.', 'Cắt một sợi bất kỳ trong tay ta. Cắt được mà không ai đau, ta nhận thua.', '{Name} không cắt. {Y} lần theo từng sợi của chính mình: Bà Tư, sư phụ, Tiểu Mộc, Hàn Phong… rồi buộc thêm một sợi mới vào tay bà.', 'Kẻ đến để nối thì ta đánh sao được. Sợi này ta giữ cho ngươi.'],
    ['Cõi linh thú đang cuối đông. Xuân Sinh tinh quân canh một hạt mầm chưa chịu nứt vỏ.', 'Làm cho nó mọc ngay bây giờ. Thần lực của ngươi dư sức mà.', '{Name} không truyền một chút thần lực nào. {Y} tưới nước, che gió, rồi đợi đủ một mùa. Hạt mầm nứt vỏ đúng ngày của nó.', 'Bao tân thần đã ép nó lớn rồi làm nó chết. Ngươi biết đợi. Thắng rồi đấy.'],
    ['Thư khố Thần giới có mười vạn kệ sách. Động Vi tinh quân đọc cùng lúc bảy cuốn bằng bảy con mắt.', 'Trong mười vạn cuốn có một cuốn chép sai một chữ. Tìm ra trước khi trăng lặn.', '{Name} không lật cuốn nào. {Y} hỏi: "Cuốn nào tiền bối chưa từng mở lại?" Động Vi sững người, rồi tự tay rút nó ra.', 'Hỏi đúng một câu hơn đọc vạn trang. Ta chịu.'],
    ['Trường thành biên giới dài không thấy cuối. Tích Vi tinh quân mỗi ngày chỉ đặt một viên đá.', 'Xây cho ta một dặm thành trong một đêm. Không được thì về.', '{Name} đặt một viên đá cho thật khít, rồi nói sáng mai sẽ đặt viên nữa. Tích Vi bật cười: đó chính là cách ông xây cả vạn dặm.', 'Kẻ nào hứa xong trong một đêm, ta đều đuổi. Ngươi thì ở lại uống trà.'],
    ['Thái Hòa tinh quân đứng trên cán cân của ngày và đêm. Lệch một ly, một cõi sẽ không có bình minh.', 'Đấu với ta không nghỉ, tới khi một bên gục. Ngươi dám không?', 'Tới giờ Ngọ, {name} tra kiếm, ngồi xuống ăn cơm nắm rồi ngủ một giấc. Tỉnh dậy đánh tiếp. Thái Hòa thì đã kiệt sức từ canh ba.', 'Ta giữ nhịp ngày đêm cho thiên hạ mà quên nhịp của mình. Bài học này ta nhận.'],
    ['Chính Quả tinh quân đưa những linh hồn đã trọn hạnh qua cầu. Hôm nay cầu vắng.', 'Kể tên một người nhờ ngươi mà đi trọn đường. Chỉ một người thôi.', '{Name} định kể về mình, rồi dừng lại. {Y} kể về một lão sư gánh nước tới thửa ruộng xa nhất. Bên kia cầu, có bóng người áo xám khẽ gật đầu.', 'Ông ấy qua cầu này năm ngoái, và có nhắc tên ngươi. Qua đi.'],
    ['Những dòng sông sao chảy về mọi cõi. Lưu Kim tinh quân canh ở đầu nguồn, tay cầm một chiếc gáo bạc.', 'Sông này sắp cạn một nhánh. Ngươi lấy sao ở đâu bù vào?', '{Name} tháo bớt nước ở nhánh đang tràn, dẫn sang nhánh cạn. Không thêm một ngôi sao nào, cả hai nhánh cùng sáng.', 'Kẻ khác đòi ta xin thêm sao. Ngươi chỉ xếp lại dòng. Giỏi.'],
    ['Biển giữa các cõi đang bão. An Lan tinh quân đứng trên đầu sóng, áo không ướt.', 'Dẹp cơn bão này. Bằng sức, bằng phép, tùy ngươi.', '{Name} nhớ lời lão ngư trên đảo đá: đừng chống lại sóng. {Y} thở cùng nó, dồn tới, rút về. Bão không tan, nhưng thuyền các cõi đi qua được.', 'Bão không phải thứ để dẹp. Ai dạy ngươi điều đó, hẳn là người hiểu biển.'],
    ['Đội tiên phong của Đồng Tâm tinh quân có trăm thiên binh. Trăm năm nay chưa mất một ai.', 'Một mình ngươi phá vòng vây của trăm người ta. Phá được thì thắng.', '{Name} không phá. {Y} tìm người lính yếu nhất trong vòng vây và đứng che cho anh ta. Trăm người tự mở vòng.', 'Trận của ta dựng để không bỏ ai lại. Ngươi vào trận mà cũng không bỏ ai. Coi như người nhà.'],
    ['Kiện Hành tinh quân tuần quanh cõi băng mỗi ngày một vòng, đã ba nghìn năm không nghỉ.', 'Chạy với ta mười vòng. Về trước thì thắng.', '{Name} chạy chậm hơn hẳn, dừng ăn, dừng ngủ. Tới vòng thứ mười, Kiện Hành khuỵu gối. {Y} cõng ông về đích.', 'Ba nghìn năm ta không nghỉ, và ta tưởng thế là khỏe. Hôm nay ta xin nghỉ một ngày.'],
    ['Giữa trời có một vết nứt lạ. Cách Vật tinh quân đã đo nó bằng bảy mươi hai loại thước.', 'Nói cho ta biết vết nứt này từ đâu ra. Sai thì về.', '{Name} thú thật là không biết, rồi xin ở lại xem ba hôm. Ngày thứ ba, {y} thấy nó khép lại lúc không ai nhìn: vết nứt là hơi thở của trời.', 'Bảy mươi hai cây thước không bằng một câu "ta chưa biết". Ngươi được.'],
    ['Khai Sơn tinh quân đục đường qua dãy núi giữa hai thế giới. Tay ông chỉ có một cây đục.', 'Núi này dày vạn dặm. Ngươi tính mấy đời thì thông?', '{Name} không tính. {Y} cầm búa đục nhát đầu tiên, rồi hỏi mượn chỗ ngủ. Sáng hôm sau, hai người đục chung.', 'Kẻ ngồi tính thì bỏ đi trước bữa trưa. Kẻ đục thì ở lại. Đường này có tên ngươi.'],
    ['Ở cõi lửa, ngày nóng chảy đá, đêm lạnh nứt sắt. Trú Dạ tinh quân canh đúng lằn ranh giữa hai thứ.', 'Đứng trên lằn ranh này cùng ta một ngày một đêm. Nghiêng hẳn về bên nào cũng chết.', '{Name} đứng, và mỗi canh giờ lại đổi chân trụ: lúc nghiêng sang nóng, lúc nghiêng sang lạnh. Không đứng im, nên không ngã.', 'Cân bằng không phải là đứng im ở giữa. Ít kẻ hiểu ra trước khi cháy.'],
    ['Hồi Hướng tinh quân gánh công đức trả về nơi đã gieo. Đôi quang gánh của bà trông quen lạ lùng.', 'Gánh này nặng bằng mọi việc tốt ngươi từng làm. Nhấc lên rồi mang trả cho đúng người.', '{Name} nhấc gánh, đi thẳng về cõi người, tới một nấm mộ bên thửa ruộng xanh ở Lệ thôn. Đặt xuống. Gánh nhẹ bẫng.', 'Đa phần mang về cho mình. Ngươi biết gánh ấy của ai. Ta không hỏi nữa.'],
    ['Tán Tụ tinh quân chăn những đàn mây. Dưới kia có mười cõi đang hạn.', 'Ta chỉ còn một đám mây. Cõi nào cũng xin. Ngươi cho ai?', '{Name} xin đám mây, xé nhỏ làm mười, thả ở mười đầu nguồn. Không cõi nào no nước, nhưng không cõi nào chết khát, và suối bắt đầu tự chảy.', 'Kẻ từng sống qua một mùa hạn mới chia như thế. Mây này từ nay ngươi chăn cùng ta.'],
    ['Hồ soi trời phẳng như gương. Chỉ Thủy tinh quân bảo: ai nhìn xuống cũng chỉ thấy điều mình sợ nhất.', 'Nhìn xuống đủ một nén nhang mà mặt hồ không gợn, ngươi thắng.', 'Dưới hồ là người đàn bà chia bát cháo làm ba. {Name} nhìn, không quay đi, chỉ cúi đầu chào. Mặt hồ phẳng lặng.', 'Ngươi không hết sợ. Ngươi chỉ thôi chạy. Thế là đủ cho hồ này.'],
    ['Tri Âm tinh quân nghe được tiếng kêu cứu từ mọi cõi. Tai bà chưa có một ngày yên.', 'Lúc này có vạn tiếng gọi. Ngươi cứu được mấy?', '{Name} lắng nghe, rồi chỉ chọn một tiếng nhỏ nhất: một đứa trẻ khóc trong giỏ bên bờ suối cạn. Cứu xong, {y} quay lại nhận tiếng thứ hai.', 'Ta nghe vạn tiếng nên chẳng cứu trọn ai. Ngươi dạy lại ta cách bắt đầu.'],
    ['Sau mỗi trận, thần binh bị thương đều về chỗ Dưỡng Chính tinh quân. Hôm nay ông chỉ chờ một người.', 'Ngươi thắng hai mươi trận liền, và giấu ta ba vết thương. Cởi áo ra.', '{Name} định chối, rồi ngồi xuống để ông băng bó, và ngủ một mạch hai ngày. Đó là trận duy nhất {y} thắng bằng cách chịu nằm yên.', 'Biết dừng để chữa cũng là một loại võ công. Trận này ngươi thắng chính mình, ta chỉ đứng xem.'],
    ['Vấn Tân tinh quân đứng ở bến đò giữa các thế giới, chỉ đường cho kẻ lạc. Hôm nay sương dày, chính ông cũng không thấy bờ.', 'Đưa ta sang bờ bên kia. Không la bàn, không sao trời.', '{Name} thả một chiếc lá xuống nước, xem nó trôi, rồi chèo ngược dòng lá. Bến bên kia hiện ra trong sương.', 'Không biết đường thì hỏi dòng nước. Câu ấy đáng khắc lên bến này.'],
    ['Ở cửa Thần giới có một ngọn đèn chưa từng tắt. Trì Hằng tinh quân châm dầu cho nó mỗi đêm, đã chín nghìn năm.', 'Thổi tắt nó đi. Thần lực của ngươi thừa sức.', '{Name} lắc đầu, cầm bình dầu châm thay ông một đêm. Rồi một đêm nữa. Trì Hằng được ngủ lần đầu sau chín nghìn năm.', 'Kẻ muốn thắng ta thì thổi. Kẻ hiểu ta thì châm dầu. Ngọn đèn này nhận ra ngươi.'],
    ['Trương Thỉ tinh quân giương cây cung dài bằng cả dải ngân hà. Mũi tên của ông chưa từng trượt.', 'Bắn trúng ngôi sao kia trước ta.', '{Name} giương cung, rồi hạ xuống, để dây chùng hẳn mới kéo lại. Trương Thỉ bắn vội; dây cung căng suốt nghìn năm đứt phựt.', 'Dây không được chùng thì sẽ đứt. Ta quên mất điều chính mình dạy cho tân binh.'],
    ['Dưới cõi âm có một vườn hạt giống lành. Thiện Căn tinh quân canh chúng qua mùa đông dài nhất.', 'Trong vạn hạt này có một hạt mang tên kẻ thù của ngươi. Nhổ đi hay để lại?', '{Name} tìm ra hạt mang tên Lệ Vô Khuyết. Nó nhỏ, lép, nhưng đã nứt một đường xanh. {Y} vun thêm đất cho nó.', 'Hạt ấy nứt từ đêm có người đưa cho nó một gáo nước. Ngươi biết là ai mà.'],
    ['Tiết Độ tinh quân giữ kho lương của ba mươi sáu Thiên Cang. Sổ của ông không lệch một hạt.', 'Kho chỉ đủ ăn nửa năm. Chiến sự còn một năm. Tính đi.', '{Name} chia kho làm ba: phần ăn, phần gieo, phần đổi với cõi bên. Nửa năm sau, kho đầy hơn lúc đầu.', 'Kẻ giữ của thì đếm. Kẻ hiểu của thì gieo. Sổ này từ nay có thêm cột của ngươi.'],
    ['Định Phong tinh quân ngồi trong mắt bão. Quanh ông, gió xé nát cả đá.', 'Vào đây ngồi với ta. Tâm ngươi động một niệm là gió cuốn đi.', 'Gió mang tới tiếng sáo xương năm nào. {Name} nghe, nhận ra, rồi để nó thổi qua. Vạt áo {y} không lay.', 'Ngươi nghe thấy mà không đi theo. Bão nào rồi cũng chỉ đến thế thôi.'],
    ['{Name} tìm Hòa Quang tinh quân khắp Thần giới không thấy. Vị thần này sống lẫn giữa cõi người.', 'Tìm ra ta giữa một phiên chợ nghìn người. Thần lực không giúp được ngươi đâu.', '{Name} ngồi xuống quán trà đầu chợ, giúp bà chủ quạt lò. Tới chiều, bà cụ bán trà mỉm cười: bà chính là Hòa Quang.', 'Muốn tìm ta thì phải chịu ngồi xuống với người. Ngươi quen việc ấy từ bé rồi.'],
    ['Cây nối các cõi cao không thấy ngọn. Cố Bản tinh quân chỉ chăm phần rễ, nơi không ai nhìn.', 'Cành trên kia đang héo. Ngươi chữa ở đâu?', '{Name} không leo lên ngọn. {Y} xuống tận rễ, gỡ một tảng đá đang chèn. Một tuần sau, cành trên cao tự xanh lại.', 'Ai cũng trèo lên chỗ thấy được. Ngươi xuống chỗ ta. Hiếm đấy.'],
    ['Minh Kính tinh quân có tấm gương soi ra chân tướng sau mọi lớp mặt nạ. Ông bảo {name} đứng vào.', 'Xem thử dưới danh hiệu thần của ngươi là ai.', 'Trong gương không có vị thần nào. Chỉ có một kẻ gánh nước, vai chai, tay cầm cái gáo sứt quai. {Name} gật đầu chào người ấy.', 'Kẻ nhìn gương này thường đập nó. Ngươi lại chào. Ta không còn gì để soi.'],
    ['Trường thành ngăn hư không là công trình lớn nhất Thần giới. Đại Thành tinh quân thống lĩnh mười vạn thợ.', 'Một đoạn thành vừa sụp. Lỗi của ai, ngươi tìm ra thì thắng.', '{Name} không tìm lỗi. {Y} dựng một tấm bảng ba cột trước đoạn thành sụp. Ba ngày sau nó được xây lại, chắc hơn cũ.', 'Ta mất nghìn năm tìm kẻ có lỗi. Ngươi mất ba ngày để xây xong. Tấm bảng ấy, cho ta xin.'],
    ['Tiêu Dao tinh quân nằm vắt chân trên một đám mây, nón che mặt. Thanh kiếm của ông cắm dưới gốc đào.', 'Đánh với ta thì chán lắm. Hay là ngủ thi? Ai mở mắt trước thì thua.', '{Name} nằm xuống thật, và ngủ ngon lành: việc hôm nay đã xong cả rồi. Tiêu Dao hé mắt nhìn trộm trước, đành nhận thua.', 'Chỉ kẻ làm xong việc mới ngủ được như thế. Ta giả vờ nhàn, còn ngươi nhàn thật.'],
    ['Thiên Hình tinh quân đợi sẵn, thước ngọc đặt ngang gối. Ông là kẻ từng định niêm Thiên Môn.', 'Ngươi mang một tà thần vào Thần giới. Phép ghi rõ tội ấy. Biện bạch đi.', '{Name} không biện bạch. {Y} nhận tội, rồi kể mình đã làm gì mỗi ngày từ hôm ấy để sửa. Thước ngọc đo từng việc, rồi hạ xuống.', 'Phép phạt kẻ chối, không phạt kẻ đang trả. Ngôi thứ ba mươi ba không cản ngươi nữa.'],
    ['Phương Hợi là đất của Huyết Nguyệt. Phong Đăng tinh quân coi mùa màng ở đây, và mùa nào cũng bị thu sạch về trăng đỏ.', 'Chủ phương lệnh cho ta chặn ngươi. Ta không muốn. Nhưng kho của ta trống, ta lấy gì mà cãi lệnh?', '{Name} mở túi, chia nửa phần lương của mình vào kho Phong Đăng, rồi cùng ông gieo lại một vụ. Lúa lên, ông mở đường.', 'Nó lấy của ta nghìn mùa. Ngươi cho ta một vụ. Ta biết mình nên đứng về bên nào.'],
    ['Vô Ba tinh quân, mạnh nhất Thiên Cang, đứng chắn trước điện Huyết Nguyệt. Ba mươi tư vị kia đều đã tới xem.', 'Tâm ta như mặt nước không gợn. Ngươi làm nó gợn được một lần, ngôi đầu Thiên Cang là của ngươi.', 'Trăm chiêu không ăn thua. {Name} dừng tay, hỏi khẽ: "Nước không gợn, là vì yên hay vì đã đóng băng?" Mặt nước trong mắt Vô Ba rạn một đường.', 'Ta lặng vì sợ kẻ ngồi trong điện kia, đâu phải vì yên. Ngươi nhìn ra được. Đi đi, Thượng Thần.'],
  ];

  // Mười một Phương thần đầu: [hai quy luật, cảnh, lời thách, cách thắng, lời nhận thua, câu du ký khi thám hiểm xong phương].
  const LORD_DUEL = [
    [[2, 7], 'Phương Tý là đêm sâu nhất của Thần giới. Huyền Minh phương thần ngồi dưới đáy một hồ nước đen, nơi không có lấy một tiếng động.', 'Thượng Thần muốn lên ngôi cao thì xuống đây. Ở lại với ta qua một đêm dài bằng trăm năm, không làm gì cả.', '{Name} từng ngồi chín tháng dưới đáy biển không trăng. {Y} ngồi, thở, để đêm tự trôi. Gần sáng, {y} đứng dậy nhóm bếp: đêm là để nghỉ, không phải để ở lại mãi.', 'Kẻ sợ đêm thì bỏ chạy, kẻ mê đêm thì chìm. Ngươi biết ngồi và biết dậy. Phương Tý mở đường.', 'hồ nước đen dưới đáy đêm, nơi mọi tiếng động đều được nghỉ'],
    [[6, 4], 'Hậu Tải phương thần là một bà lão lưng còng, cõng cả phương Sửu trên vai. Bà chưa từng đặt nó xuống.', 'Cõng thay ta một ngày. Chỉ một ngày thôi, xem vai ngươi có chở nổi không.', '{Name} ghé vai. Nặng hơn mọi gánh nước {y} từng mang. {Y} chia nó làm trăm chuyến nhỏ, đi từng chuyến, nghỉ giữa các chuyến. Hết ngày, không sót một tấc đất.', 'Ta cõng một hơi suốt vạn năm nên lưng mới còng. Ngươi dạy bà lão này cách đặt gánh xuống mà không làm rơi.', 'cánh đồng đất dày, nơi mỗi bước chân đều được nâng đỡ'],
    [[4, 5], 'Phương Dần luôn là rạng đông. Khai Dương phương thần trẻ như thiếu niên, ngày nào cũng bắt đầu một việc mới, và chưa việc nào xong.', 'Đua với ta xem ai khởi sự được nhiều hơn trước khi mặt trời lên!', 'Khai Dương mở trăm việc. {Name} chỉ mở một, hiểu cho rõ nó cần gì, rồi làm xong trước bình minh. Mặt trời lên, chỉ có một việc để soi.', 'Ta giỏi bắt đầu tới mức quên cả kết thúc. Một việc xong của ngươi sáng hơn trăm việc dở của ta.', 'bờ rạng đông, nơi ngày nào cũng là ngày đầu tiên'],
    [[3, 4], 'Phương Mão là một cánh rừng. Thanh Mộc phương thần chính là cây lớn nhất, rễ nối với mọi cây khác.', 'Chặt được ta thì ngươi qua. Nhưng coi chừng: ta ngã thì cả rừng ngã.', '{Name} bỏ kiếm, đi một vòng quanh rừng, tưới cho những cây non còi cọc dưới bóng ông. Rừng dày lên. Cây lớn tự nghiêng cành, mở lối.', 'Ngươi không thắng ta. Ngươi làm cho cả rừng thắng. Ở phương này, thế mới gọi là thắng.', 'cánh rừng mà rễ mọi cây nắm lấy nhau'],
    [[1, 3], 'Vân Vũ phương thần cưỡi rồng mây, nắm hết mưa của Thần giới. Ông nhìn đôi thùng gỗ của {name} rất lâu.', 'Nghe nói ngươi từng tưới xanh một cánh đồng dưới trăng đỏ mà không xin ta giọt mưa nào. Kể ta nghe.', '{Name} kể về mười vạn người chuyền nước. Rồi {y} chỉ cho ông thấy: mưa của ông rơi đều, nhưng không ai dẫn nó tới ruộng xa. Hai người đào chung một con mương.', 'Mưa của trời cần mương của người. Ta làm thần mưa bấy lâu mà giờ mới biết. Phương Thìn nợ ngươi một mùa.', 'biển mây và những con mương dẫn mưa'],
    [[6, 7], 'Phương Tỵ rực lửa. Xích Diễm phương thần cháy sáng nhất Thần giới, và quanh ông toàn tro của những việc cháy quá nhanh.', 'Nhiệt tâm của ngươi đâu? Đốt hết mình trong một trận cho ta xem!', '{Name} nhóm một bếp than nhỏ, ủ tro giữ lửa qua đêm. Sáng ra, lửa của Xích Diễm đã tàn; bếp than vẫn đỏ, đủ nấu cơm cho cả phương.', 'Ta cháy to để người ta nhìn. Ngươi cháy nhỏ để người ta ấm. Lửa của ngươi bền hơn.', 'núi lửa và những bếp than ủ qua đêm'],
    [[0, 5], 'Phương Ngọ không có bóng. Dưới ánh Chính Dương phương thần, mọi việc đã làm đều hiện rõ, kể cả việc muốn giấu.', 'Đứng giữa trưa của ta. Kể ra một việc ngươi làm sai mà chưa ai biết.', '{Name} kể: đêm ở trấn Thanh Khê, {y} từng nghi cả sư phụ là kẻ phản bội, và chưa bao giờ xin lỗi. {Y} quay về phía cõi người, cúi đầu thật lâu.', 'Kẻ không có bóng là kẻ không giấu gì. Giữa trưa này, ngươi đứng thẳng được.', 'cánh đồng giữa trưa không có bóng'],
    [[1, 6], 'Phương Mùi lúa chín quanh năm. Phong Nhiêu phương thần béo tốt, hiền lành, và đang lo: kho đầy mà dân các cõi vẫn đói.', 'Ta có thừa, họ vẫn thiếu. Giải được thì ngươi thắng, ta còn phải cảm ơn.', '{Name} lần theo đường thóc: nó nằm chết trong kho vì không ai chở. {Y} dựng một tấm bảng, chia chuyến, ngày nào cũng có xe đi. Kho vơi, người no.', 'Thóc trong kho chưa phải là cơm. Ngươi biến thứ ta có thành thứ họ cần. Thua kiểu này ta vui lắm.', 'những kho thóc và con đường chở thóc'],
    [[0, 2], 'Kim Cương phương thần cứng như sắt, mỗi ngày tập đúng một vạn nhát kiếm, không thiếu một nhát, đã vạn năm.', 'Kỷ luật của ngươi tới đâu? Tập với ta. Sai một nhát là thua.', 'Nhát thứ chín nghìn, một con chim non rơi khỏi tổ ngay giữa sân. {Name} bỏ dở, đỡ nó lên cành, rồi mới quay lại tập nốt. Lỡ một nhịp, nhưng tâm không loạn.', 'Ta giữ một vạn nhát mà quên mất giữ vì cái gì. Ngươi lỡ một nhát mà đúng cả bài. Kỷ luật của ngươi có tim.', 'thao trường của một vạn nhát kiếm'],
    [[1, 7], 'Phương Dậu là buổi chiều thu. Thu Liễm phương thần đang gặt, và dạy rằng biết đủ là mùa gặt cuối cùng.', 'Ngươi đã thắng chín phương. Tới đây thì dừng đi. Đủ rồi. Hay ngươi cũng tham như kẻ ngồi ở phương Hợi?', '{Name} nghĩ rất lâu. Rồi {y} đặt xuống mọi chiến tích, chỉ giữ một câu dặn: gánh cả nó về. "Tại hạ không lên để có thêm. Tại hạ lên để đưa một người về."', 'Tham là muốn thêm cho mình. Ngươi muốn bớt cho người. Câu trả lời ấy qua được mùa thu của ta.', 'cánh đồng chiều thu vừa gặt'],
    [[0, 3], 'Trấn Thủ phương thần canh biên giới các cõi, mình đầy sẹo. Sau lưng ông là phương Hợi, nơi trăng đỏ đã nuốt mất nửa bầu trời.', 'Ta chặn ngươi không vì ghét. Qua ta rồi là không còn ai đỡ cho ngươi nữa.', '{Name} không vượt qua ông. {Y} mời ông cùng đi. Sau lưng hai người, ba mươi lăm Thiên Cang và mười Phương thần lặng lẽ xếp hàng.', 'Vạn năm ta canh một mình ở biên giới. Hóa ra có thể đi cùng. Ta thua, và ta theo.', 'trường thành cuối cùng trước hư không'],
  ];
  const HOI_NOTE = 'điện Huyết Nguyệt, nơi trăng đỏ đã đổi sang bạc';

  // Trận thứ mười hai: Song thần chi chiến ở phương Hợi. [người nói, thế, lời]; 'than' = Vô Yểm, 'giao' = Lệ Vô Khuyết.
  const BLOOD_DUEL = {
    title: 'Song thần chi chiến',
    pages: [
      ['ke', 'moon', 'Điện Huyết Nguyệt ở phương Hợi. Trên ngai là thân xác Lệ Vô Khuyết, tóc trắng xóa, đôi mắt là hai vầng trăng đỏ. Vô Yểm đã nuốt gần hết người anh bên trong.'],
      ['than', 'moon', 'Ngươi mang ta vào đây, trả ta ngôi cũ. Giờ Trường Lưu sắp gác ngôi, và trong mười hai phương chỉ còn ta đủ sức kế thừa. Ta phải cảm ơn ngươi, đứa trẻ trong giỏ.'],
      ['ke', 'martial', 'Huyết Nguyệt Thôn Thiên, lần này ở tầm một Phương thần: nó hút cả ánh sáng của ba mươi sáu ngôi sao. Thần lực của {name} bị rút đi như nước khỏi thùng thủng.'],
      ['hero', 'zen', 'Nó hút nội lực thì tại hạ thua. Nhưng tám quy luật không phải thứ hút được. Không ai lấy trộm được điều kẻ khác đã tự hiểu ra.'],
      ['ke', 'taichi', 'Nhân Quả: mỗi đòn nó đánh dội lại chính nó. Lưu Thông: thần lực bị hút chảy một vòng rồi trở về. Tĩnh Động: tâm {y} không gợn. Tương Sinh: sau lưng {y} là cả Thần giới.'],
      ['ke', 'martial', 'Sinh Trưởng: vết thương lành theo nhịp của nó. Minh Lý: {y} thấy rõ chỗ khuyết trong lòng kẻ không bao giờ no. Tích Lũy: mười nghìn chuyến nước dồn vào một nhát. Âm Dương: {y} biết lúc nào nên dừng tay.'],
      ['ke', 'zen', 'Và {name} dừng tay thật. Giữa trận, {y} đặt xuống trước ngai một cái gáo gỗ sứt quai, đầy nước.'],
      ['hero', 'talk', 'Đại sư huynh. Ruộng của mẹ đã xanh tới tận bờ. Chỉ còn thiếu người tưới. Về thôi.'],
      ['giao', 'moon', 'Tiểu {sd}… ta nghe thấy rồi. Cho ta… mượn cái gáo.'],
      ['ke', 'moon', 'Bàn tay già nua cầm lấy gáo nước. Kẻ sống nhờ chỗ khuyết lại một lần nữa mất chỗ trú, và lần này không còn cánh cửa nào để lách qua. Thước ngọc của Thiên Hình hạ xuống: Vô Yểm bị niêm dưới đáy hồ soi trời.'],
      ['ke', 'zen', 'Lệ Vô Khuyết không giữ ngôi. Hắn chưa đi trọn từng bước, và hắn biết thế. Hắn xin về cõi người, lên núi Tùng Hạc, nhận lại chiếc đòn gánh của mẹ.'],
      ['giao', 'talk', 'Ta sẽ gánh nước cho lũ trẻ mới lên núi. Chậm thôi. Mỗi ngày một chuyến. Lần này ta học lại từ đầu.'],
      ['ke', 'zen', 'Ngôi phương Hợi không còn chủ. Mười một Phương thần cùng quay về phía {name}: thần vị không mở thêm, chỉ truyền lại. Vầng trăng ở phương Hợi đổi từ đỏ sang bạc.'],
    ],
    lesson: 'Sức mạnh có thể bị lấy mất; điều đã hiểu ra thì không. Hãy nuôi đủ cả tám mặt của đời mình, để không chỗ khuyết nào thành tay nắm cho kẻ khác.',
  };

  // Trận cuối: ngang tài với Trường Lưu Thần Vương, vị sắp gác ngôi. 'king' = Trường Lưu.
  const KING_DUEL = {
    title: 'Ngang dòng thời gian',
    pages: [
      ['ke', 'zen', 'Điện của Trường Lưu Thần Vương là một dòng sông. Thời gian của mọi thế giới chảy qua đây. Ông lão ngồi câu bên bờ, cần câu không có lưỡi.'],
      ['king', 'talk', 'Ta giữ dòng này từ trước khi có ngôi sao đầu tiên. Ta muốn đi xem nó chảy về đâu. Nhưng ngôi này không bỏ trống được, và ta không trao nó cho kẻ thắng ta.'],
      ['king', 'zen', 'Kẻ thắng được ta sẽ muốn bắt dòng sông chảy theo ý mình. Kẻ thua ta thì bị nó cuốn. Ta cần một người đi ngang ta. Không hơn, không kém.'],
      ['ke', 'martial', 'Trận đấu không có chiêu thức. Hai người lội xuống sông, mỗi người một gánh, mang nước của hôm qua tưới cho ngày mai. Một ngày ở đây dài bằng nghìn năm.'],
      ['ke', 'martial', 'Năm thứ một trăm, {name} muốn vượt lên, và dòng nước xô {y} ngã. Năm thứ ba trăm, {y} mỏi, tụt lại, suýt bị cuốn trôi.'],
      ['hero', 'zen', 'Tại hạ thôi nhìn lưng ông ấy. Thôi đếm năm. Chỉ còn bước này, rồi bước này. Một chuyến. Rồi một chuyến nữa.'],
      ['ke', 'taichi', 'Khi {y} ngẩng lên, nghìn năm đã qua. Hai người đặt gánh xuống cùng một lúc, ở cùng một chỗ. Nước trong bốn chiếc thùng đều phẳng lặng, và trong mỗi thùng có một vầng trăng tròn.'],
      ['king', 'talk', 'Ngang nhau. Vạn năm ta mới gặp một kẻ không cố thắng thời gian, cũng không chịu thua nó. Ngôi chủ Thời là của ngươi. Giữ nó như ngươi giữ thùng nước.'],
      ['ke', 'zen', 'Trường Lưu chống gậy bước ra khỏi Thần giới. Ở rìa vũ trụ, một vị sư già đứng đợi ông, mỉm cười: Không Nguyệt đã giữ chỗ.'],
      ['ke', 'talk', 'Dưới cõi người, trên núi Tùng Hạc, một lão nhân tóc trắng gánh nước lên dốc. Theo sau là một đứa trẻ mới lên núi, nước đổ tung tóe. Trăng rằm in xuống thùng nước của cả hai.'],
      ['ke', 'zen', '{Name}, Thần Vương chủ Thời, nhìn xuống và nhớ lại một câu rất cũ: chiêu lợi hại nhất là chiêu ngươi luyện mỗi ngày.'],
    ],
    lesson: 'Không ai thắng được thời gian, và cũng không cần thua nó. Hãy đi ngang với nó: mỗi ngày một việc nhỏ làm cho trọn. Đó là cảnh giới cao nhất, và ai cũng bắt đầu được từ hôm nay.',
  };

  // Gắn đề đấu vào từng vị. Thiên Cang thứ k (1–35): quy luật theo vòng tám, mức lĩnh ngộ tăng dần theo tốp tám vị.
  const STAR_NEED = [150, 250, 350, 450, 550], KING_NEED = 1200, RIVALS = 35;
  STARS.forEach((s) => {
    if (s.i >= RIVALS) return;
    const [scene, say, win, lose] = STAR_DUEL[s.i];
    Object.assign(s, { law: s.i % 8, need: STAR_NEED[Math.floor(s.i / 8)], scene, say, win, lose });
  });
  LORDS.forEach((l) => {
    const d = LORD_DUEL[l.i];
    if (d) Object.assign(l, { laws: d[0], need: 600 + 25 * (l.i + 1), scene: d[1], say: d[2], win: d[3], lose: d[4], land: d[5] });
    else Object.assign(l, { laws: LAWS.map((x) => x.i), need: 900, land: HOI_NOTE });
  });
  const RETIRING = KINGS[1]; // Trường Lưu, chủ Thời

  // ---- Chiến tích (suy ra từ tu vi và điểm tám chỉ số đã tích lũy; không lưu thêm gì vào tài khoản) ---------------------------------
  // Mốc tu vi: Thiên Cang thứ k ở k/35 đường từ cấp 100 lên 101; Phương thần thứ j ở j/12 đường từ cấp 101 lên 102; Thần Vương ở
  // mốc cấp 103. Điểm cộng theo bước 0,5 nên mốc lẻ làm tròn lên bước 0,5.
  const half = (x) => Math.ceil(x * 2 - 1e-9) / 2;
  const AT = (lv) => G().LEVEL_AT[lv];
  const starAt = (k) => half(AT(100) + (k * (AT(101) - AT(100))) / RIVALS);
  const lordAt = (j) => half(AT(101) + (j * (AT(102) - AT(101))) / LORDS.length);
  const kingAt = () => AT(103);
  // Các trận phải thắng lần lượt: t = tổng tu vi, s = điểm tám chỉ số đã tích lũy.
  function progress(t, s) {
    let stars = 0, lords = 0;
    while (stars < RIVALS && t >= starAt(stars + 1) && s[STARS[stars].law] >= STARS[stars].need) stars++;
    if (stars === RIVALS) while (lords < LORDS.length && t >= lordAt(lords + 1) && LORDS[lords].laws.every((a) => s[a] >= LORDS[lords].need)) lords++;
    const king = lords === LORDS.length && t >= kingAt() && s.every((v) => v >= KING_NEED);
    return { stars, lords, king };
  }
  // Thần cấp cao nhất mà chiến tích cho phép (zenGrowth.realmOf dùng để giữ cấp khi đủ điểm mà chưa đủ trận).
  function cap(t, s) {
    const p = progress(t, s);
    return p.king ? 103 : p.lords === LORDS.length ? 102 : p.stars === RIVALS ? 101 : 100;
  }
  const wonIds = (t, s) => {
    const p = progress(t, s);
    return [...Array.from({ length: p.stars }, (_, i) => 'g:s' + (i + 1)), ...Array.from({ length: p.lords }, (_, i) => 'g:l' + (i + 1)), ...(p.king ? ['g:k'] : [])];
  };
  // Trận kế tiếp và những gì còn thiếu.
  function nextOf(t, s, p) {
    if (p.king) return null;
    const mk = (kind, id, title, where, at, laws, need) => ({ kind, id, title, where, at, shortT: Math.max(0, half(at - t)), need, laws: laws.map((a) => ({ law: LAWS[a], have: s[a], short: Math.max(0, half(need - s[a])) })) });
    if (p.stars < RIVALS) {
      const x = STARS[p.stars];
      return mk('star', 'g:s' + x.no, x.title, 'phương ' + LORDS[x.lord].chi, starAt(x.no), [x.law], x.need);
    }
    if (p.lords < LORDS.length) {
      const l = LORDS[p.lords];
      return mk('lord', 'g:l' + (l.i + 1), l.title, 'phương ' + l.chi, lordAt(l.i + 1), l.laws, l.need);
    }
    return mk('king', 'g:k', RETIRING.title, 'chủ ' + RETIRING.rule, kingAt(), LAWS.map((x) => x.i), KING_NEED);
  }

  const total = () => G().total(G().earnedScores());
  const level = () => (G()?.started() ? G().realmOf(total(), G().earnedScores()).level : -1);
  const mine = () => (G()?.started() && total() >= AT(G().GOD) ? progress(total(), G().earnedScores()) : { stars: 0, lords: 0, king: false });

  // ---- Chiến ký: một trận đã thắng, đọc trong bảng hội thoại của Truyện ký (dist/growth-story.js) -----------------------------------
  // Mã: 'g:s<k>' Thiên Cang thứ k (1–35), 'g:l<j>' Phương thần thứ j (1–12), 'g:k' Thần Vương. ok = đã thắng (mới đọc được).
  function entry(id) {
    if (!G()?.started()) return null;
    const p = mine(), m = /^g:([sl])(\d+)$/.exec(String(id));
    if (id === 'g:k') return { id, god: true, ok: p.king, title: KING_DUEL.title, eyebrow: 'THẦN GIỚI · TRẬN KẾ VỊ', sub: RETIRING.title + ' · chủ ' + RETIRING.rule, pages: KING_DUEL.pages, lesson: KING_DUEL.lesson, speakers: { king: RETIRING.title } };
    if (!m) return null;
    const n = Number(m[2]);
    if (m[1] === 's') {
      const x = STARS[n - 1];
      if (!x || n > RIVALS) return null;
      const law = LAWS[x.law], pages = [['ke', 'zen', x.scene], ['god', 'talk', x.say], ['ke', 'taichi', x.win], ['god', 'talk', x.lose]];
      if (n === RIVALS) pages.push(['ke', 'zen', 'Ba mươi lăm ngôi sao cùng sáng. {Name} thành Thượng Thần, đứng đầu Thiên Cang, đủ tư cách gõ cửa mười hai phương.']);
      return { id, god: true, ok: p.stars >= n, title: 'Đấu ' + x.title, eyebrow: 'THẦN GIỚI · TINH ĐẤU ' + n + ' / ' + RIVALS, sub: 'Phương ' + LORDS[x.lord].chi + ' · quy luật ' + law.name, pages, lesson: 'Quy luật ' + law.name + '. ' + law.lesson, speakers: { god: x.title } };
    }
    const l = LORDS[n - 1];
    if (!l) return null;
    const eyebrow = 'THẦN GIỚI · PHƯƠNG ĐẤU ' + n + ' / ' + LORDS.length;
    if (!l.scene) return { id, god: true, ok: p.lords >= n, foe: 'giao', title: BLOOD_DUEL.title, eyebrow, sub: 'Phương ' + l.chi + ' · cả tám quy luật', pages: BLOOD_DUEL.pages, lesson: BLOOD_DUEL.lesson, speakers: {} };
    const [a, b] = l.laws.map((i) => LAWS[i]);
    const pages = [['ke', 'zen', l.scene], ['god', 'talk', l.say], ['ke', 'taichi', l.win], ['god', 'talk', l.lose], ['ke', 'zen', 'Phương ' + l.chi + ' mở đường. Còn ' + (LORDS.length - n) + ' phương nữa, và phương cuối cùng là phương Hợi.']];
    return { id, god: true, ok: p.lords >= n, title: 'Đấu ' + l.title, eyebrow, sub: 'Phương ' + l.chi + ' · quy luật ' + a.name + ' và ' + b.name, pages, lesson: 'Hai quy luật đi cùng nhau. ' + a.name + ': ' + a.gist + ' ' + b.name + ': ' + b.gist, speakers: { god: l.title } };
  }

  // ---- Thiên đồ: 5 Thần Vương ở giữa, 12 Phương thần vòng trong, 36 Thiên Cang tinh vòng ngoài -----------------------------------
  // Phương Tý ở trên cùng (chính Bắc), đi theo chiều kim đồng hồ. p = chiến tích: sao và phương đã thắng tô vàng.
  function chart(god, p = { stars: 0, lords: 0, king: false }) {
    const C = 180, at = (r, deg) => [(C + r * Math.cos(((deg - 90) * Math.PI) / 180)).toFixed(1), (C + r * Math.sin(((deg - 90) * Math.PI) / 180)).toFixed(1)];
    const spokes = LORDS.map((_, i) => {
      const [x1, y1] = at(62, i * 30 + 15), [x2, y2] = at(160, i * 30 + 15);
      return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
    }).join('');
    const stars = STARS.map((s) => {
      const [x, y] = at(148, s.lord * 30 + ((s.i % 3) - 1) * 9.5), me = s.i === SEAT;
      const cls = me ? ' is-seat' + (god ? ' is-mine' : '') : s.i < p.stars ? ' is-won' : god && s.i === p.stars ? ' is-next' : '';
      return '<circle class="gr-gods-star' + cls + ' gr-gods-t' + (s.i % 4) + '" cx="' + x + '" cy="' + y + '" r="' + (me ? 6.5 : 4.2) + '"/>';
    }).join('');
    const lords = LORDS.map((l) => {
      const [x, y] = at(104, l.i * 30), hoi = l.i === VACANT;
      const cls = hoi ? (p.lords === LORDS.length ? ' is-mine' : god ? ' is-blood' : ' is-vacant') : l.i < p.lords ? ' is-won' : '';
      return '<g class="gr-gods-lord' + cls + '"><circle cx="' + x + '" cy="' + y + '" r="15"/><text x="' + x + '" y="' + (Number(y) + 3.6) + '" text-anchor="middle">' + l.chi + '</text></g>';
    }).join('');
    const kings = KINGS.map((k, i) => {
      const [x, y] = at(34, i * 72);
      return '<circle class="gr-gods-king' + (p.king && k === RETIRING ? ' is-mine' : '') + '" cx="' + x + '" cy="' + y + '" r="9.5"/>';
    }).join('');
    const label = 'Thiên đồ Thần giới: 5 Thần Vương ở giữa, 12 Phương thần ở vòng trong theo mười hai địa chi, 36 Thiên Cang tinh ở vòng ngoài, mỗi phương ba vị.' +
      (god ? ' Ngôi Hằng Nguyệt ở phương Hợi đang sáng: ngôi của hiệp khách. Đã thắng ' + p.stars + ' trên ' + RIVALS + ' Thiên Cang và ' + p.lords + ' trên ' + LORDS.length + ' Phương thần.' : ' Ngôi Hằng Nguyệt ở phương Hợi đang chờ người kế thừa.');
    return '<svg class="gr-gods-chart" viewBox="0 0 360 360" role="img" aria-label="' + label + '">' +
      '<circle class="gr-gods-ring" cx="180" cy="180" r="148"/><circle class="gr-gods-ring" cx="180" cy="180" r="104"/><circle class="gr-gods-ring is-core" cx="180" cy="180" r="56"/>' +
      '<g class="gr-gods-spokes">' + spokes + '</g>' + stars + lords +
      '<polygon class="gr-gods-penta" points="' + KINGS.map((_, i) => at(34, i * 72).join(',')).join(' ') + '"/>' + kings + '</svg>';
  }

  // ---- Đường lên Thần Vương: lĩnh ngộ tám quy luật và trận kế tiếp ------------------------------------------------------------------
  function roadBlock(g, god, p, nx, s) {
    const fmt = g.fmt, lacking = new Set((nx?.laws || []).filter((x) => x.short > 0).map((x) => x.law.i));
    const laws = LAWS.map((law) => {
      const v = s[law.i], pct = Math.max(0, Math.min(100, Math.round((v / KING_NEED) * 100)));
      return '<li class="gr-gods-lawrow' + (lacking.has(law.i) ? ' is-short' : '') + '" data-law="' + law.i + '"><span><strong>' + law.name + '</strong><small>' + esc(g.AXES[law.i].name) + ' · ' + esc(law.gist) + '</small></span><b>' + fmt(v) + '</b>' +
        '<div class="progress" role="progressbar" aria-label="Lĩnh ngộ ' + law.name + ': ' + fmt(v) + ' trên ' + fmt(KING_NEED) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div></li>';
    }).join('');
    let next;
    if (!god) next = '<p class="gr-gods-next is-locked">Thành Thần ở cấp ' + g.GOD + ' thì trận đầu tiên mở: ' + esc(STARS[0].title) + ', phương ' + LORDS[0].chi + '.</p>';
    else if (!nx) next = '<p class="gr-gods-next is-done">Đã kế thừa ngôi chủ ' + RETIRING.rule + '. Không còn trận nào phía trước; chỉ còn những chuyến nước mỗi ngày.</p>';
    else {
      const kind = nx.kind === 'star' ? 'Tinh đấu ' + (p.stars + 1) + '/' + RIVALS : nx.kind === 'lord' ? 'Phương đấu ' + (p.lords + 1) + '/' + LORDS.length : 'Trận kế vị';
      const tuvi = '<li' + (nx.shortT ? ' class="is-short"' : '') + '>Tu vi ' + fmt(nx.at) + ' điểm' + (nx.shortT ? ' · còn thiếu ' + fmt(nx.shortT) : ' · đã đủ') + '</li>';
      const all = nx.laws.length === LAWS.length, short = nx.laws.filter((x) => x.short > 0);
      const lawLines = all
        ? '<li' + (short.length ? ' class="is-short"' : '') + '>Lĩnh ngộ cả tám quy luật từ ' + fmt(nx.need) + (short.length ? ' · còn thiếu: ' + short.map((x) => x.law.name + ' ' + fmt(x.short)).join(', ') : ' · đã đủ') + '</li>'
        : nx.laws.map((x) => '<li' + (x.short ? ' class="is-short"' : '') + '>Lĩnh ngộ ' + x.law.name + ' ' + fmt(nx.need) + ' · đang có ' + fmt(x.have) + (x.short ? ' · còn thiếu ' + fmt(x.short) : ' · đã đủ') + '</li>').join('');
      next = '<div class="gr-gods-next" data-next="' + nx.id + '"><em>' + kind + '</em><strong>Trận kế tiếp: ' + esc(nx.title) + ' · ' + nx.where + '</strong><ul>' + tuvi + lawLines + '</ul></div>';
    }
    return '<div class="gr-gods-road"><h3>Đường lên Thần Vương</h3>' +
      '<p class="help-copy">Từ cấp ' + g.GOD + ', đủ điểm tu vi chưa đủ để lên cấp. Mỗi thần cấp còn cần lĩnh ngộ quy luật tự nhiên và thắng các vị thần đang giữ ngôi, lần lượt qua mười hai phương. Lĩnh ngộ một quy luật là số điểm đã tích lũy của chỉ số ứng với nó, nên muốn lên cao phải nuôi đủ cả tám mặt.</p>' +
      next + '<ul class="gr-gods-laws" aria-label="Lĩnh ngộ tám quy luật tự nhiên">' + laws + '</ul></div>';
  }

  function panel() {
    const g = G();
    if (!g?.started()) return '';
    const s = g.earnedScores(), t = g.total(s), lv = level(), god = lv >= g.GOD, name = esc(g.heroName()), fmt = g.fmt;
    const p = god ? progress(t, s) : { stars: 0, lords: 0, king: false }, nx = god ? nextOf(t, s, p) : null, mineHoi = p.lords === LORDS.length;
    const state = god ? 'Ngôi Hằng Nguyệt · phương Hợi' : 'Mở ở cấp ' + g.GOD;
    const lead = god
      ? name + ' đã qua Thiên Môn và kế thừa ngôi Hằng Nguyệt, ngôi thứ 36 của Thiên Cang, thuộc phương Hợi. Phía trên là mười hai Phương thần và năm Thần Vương.'
      : 'Phía sau Thiên Môn, cánh cửa từ cấp 99 lên cấp 100, là Thần giới. Thành Thần ở cấp ' + g.GOD + ', ' + name + ' sẽ kế thừa một ngôi trong ba mươi sáu Thiên Cang.';
    const tiers = [
      ['5', 'Thần Vương', 'Đứng đầu Thần giới, cùng quyết mọi sự vụ.'],
      ['12', 'Phương thần', 'Thần cao đẳng, mỗi vị chủ quản một phương.'],
      ['36', 'Thiên Cang tinh', 'Chủ lực chiến đấu, bảo vệ Thần giới và các thế giới khác.'],
    ].map(([n, tt, d]) => '<li><b>' + n + '</b><span><strong>' + tt + '</strong><small>' + d + '</small></span></li>').join('');
    // Điều kiện lên từng thần cấp (v2.14.0) và chiến tích hiện có.
    const rule = {
      101: ['Đủ ' + fmt(AT(101)) + ' điểm tu vi và thắng cả ' + RIVALS + ' Thiên Cang còn lại.', 'Đã thắng ' + p.stars + '/' + RIVALS],
      102: ['Đủ ' + fmt(AT(102)) + ' điểm tu vi và thắng ' + LORDS.length + ' Phương thần.', 'Đã thắng ' + p.lords + '/' + LORDS.length],
      103: ['Đủ ' + fmt(AT(103)) + ' điểm tu vi, lĩnh ngộ cả tám quy luật từ ' + fmt(KING_NEED) + ', và ngang tài với ' + RETIRING.title + '.', p.king ? 'Đã ngang tài' : 'Chưa giao đấu'],
    };
    const ranks = RANKS.map((r) => {
      const cls = lv > r.lv ? ' is-done' : lv === r.lv ? ' is-now' : '', c = rule[r.lv];
      return '<li class="gr-gods-rank' + cls + '"' + (lv === r.lv ? ' aria-current="step"' : '') + '><b>Cấp ' + r.lv + '</b><span><strong>' + r.name + '</strong><small>' + r.note + '</small>' + (c ? '<small class="gr-gods-rule">' + c[0] + '</small><small class="gr-gods-count">' + c[1] + '</small>' : '') + '</span></li>';
    }).join('');
    const kings = KINGS.map((k) => {
      const now = p.king && k === RETIRING;
      return '<li' + (now ? ' class="is-mine"' : '') + '><strong>' + esc(k.title) + '</strong><em>Chủ ' + k.rule + '</em><small>' + esc(k.duty) + (now ? ' Ngôi này nay của ' + name + '; Trường Lưu đã đi ngao du vũ trụ.' : k.note ? ' ' + esc(k.note) : '') + '</small></li>';
    }).join('');
    const read = (id, label) => '<button type="button" class="gr-gods-read" data-gr-story="' + id + '" aria-label="Đọc chiến ký: ' + esc(label) + '">Chiến ký</button>';
    const regions = LORDS.map((l) => {
      const hoi = l.i === VACANT, vacant = hoi && !god, won = l.i < p.lords, isNext = god && nx?.kind === 'lord' && p.lords === l.i;
      const head = vacant ? 'Ngôi bỏ trống' : hoi && mineHoi ? 'Ngôi của ' + name : esc(l.title);
      const sub = vacant ? 'Chủ cũ bị đày vì nuốt đồng liêu; chưa ai kế thừa.' : hoi ? (mineHoi ? 'Kế thừa sau Song thần chi chiến.' : 'Vô Yểm đòi lại ngôi cũ trong thân Lệ Vô Khuyết.') : 'Chủ quản ' + esc(l.domain) + '.';
      const rivals = STARS.filter((x) => x.lord === l.i && x.i < RIVALS), explored = god && rivals.every((x) => x.i < p.stars);
      const lordNeed = hoi ? 'Cả tám quy luật · cần ' + fmt(l.need) : 'Quy luật ' + l.laws.map((a) => LAWS[a].name).join(', ') + ' · cần ' + fmt(l.need);
      const lordTag = won ? '<em class="gr-gods-tag is-won">Đã thắng</em>' + read('g:l' + (l.i + 1), l.title) : isNext ? '<em class="gr-gods-tag is-next">Trận kế tiếp</em>' : '';
      const stars = STARS.filter((x) => x.lord === l.i).map((x) => {
        const mineSeat = x.i === SEAT, sw = x.i < p.stars, sn = god && nx?.kind === 'star' && p.stars === x.i;
        const tag = mineSeat ? '<em class="gr-gods-tag">' + (god ? 'Ngôi của ' + name : 'Chờ người kế thừa') + '</em>' : sw ? '<em class="gr-gods-tag is-won">Đã thắng</em>' + read('g:s' + x.no, x.title) : sn ? '<em class="gr-gods-tag is-next">Trận kế tiếp</em>' : '';
        const need = mineSeat ? '' : '<small class="gr-gods-need">Quy luật ' + LAWS[x.law].name + ' · cần ' + fmt(x.need) + '</small>';
        return '<li class="' + (mineSeat ? 'is-seat' : sw ? 'is-won' : sn ? 'is-next' : '') + '" data-star="' + x.no + '"><b>' + x.no + '</b><span><strong>' + esc(x.title) + '</strong><small>' + esc(x.duty) + '</small>' + need + '</span>' + (tag ? '<span class="gr-gods-act">' + tag + '</span>' : '') + '</li>';
      }).join('');
      return '<li class="gr-gods-region' + (hoi ? (mineHoi ? ' is-mine' : god ? ' is-blood' : ' is-vacant') : '') + (explored ? ' is-explored' : '') + '" data-chi="' + l.chi + '"><div class="gr-gods-region-head"><i aria-hidden="true">' + l.chi + '</i><span><strong>Phương ' + l.chi + ' · ' + head + '</strong><small>' + sub + '</small>' +
        '<small class="gr-gods-need">' + lordNeed + '</small>' + (explored ? '<small class="gr-gods-land">Đã thám hiểm: ' + esc(l.land) + '.</small>' : '') + '</span>' + (lordTag ? '<span class="gr-gods-act">' + lordTag + '</span>' : '') + '</div><ol class="gr-gods-stars" start="' + (l.i * 3 + 1) + '">' + stars + '</ol></li>';
    }).join('');
    return '<section class="panel gr-gods-panel" aria-labelledby="gr-gods-title"><h2 id="gr-gods-title">Thần giới <small>' + state + '</small></h2>' +
      '<p class="help-copy">' + lead + '</p>' +
      '<div class="gr-gods-top">' + chart(god, p) + '<ul class="gr-gods-tiers">' + tiers + '</ul></div>' +
      '<p class="gr-gods-law"><strong>Thần vị không mở thêm, chỉ kế thừa.</strong> Thần giới luôn có đúng 5 Thần Vương, 12 Phương thần và 36 Thiên Cang tinh. Muốn có ngôi, phải được một vị sắp gác ngôi hoặc sắp đi ngao du vũ trụ truyền lại.</p>' +
      '<ol class="gr-gods-ranks" aria-label="Thứ bậc thần vị theo cấp">' + ranks + '</ol>' + roadBlock(g, god, p, nx, s) +
      '<details class="gr-gods-more"><summary>Năm Thần Vương</summary><ul class="gr-gods-kings">' + kings + '</ul></details>' +
      '<details class="gr-gods-more"' + (god ? ' open' : '') + '><summary>Thám hiểm mười hai phương' + (god ? ' · thắng ' + p.stars + '/' + RIVALS + ' Thiên Cang, ' + p.lords + '/' + LORDS.length + ' Phương thần' : ' và ba mươi sáu Thiên Cang tinh') + '</summary>' +
      '<p class="help-copy gr-gods-hint">Mỗi trận thắng thắp sáng một ngôi sao trên Thiên đồ. Thắng đủ các Thiên Cang của một phương là thám hiểm xong phương ấy. Trận đã thắng có chiến ký để đọc lại.</p><ol class="gr-gods-regions">' + regions + '</ol></details></section>';
  }

  window.zenGods = { KINGS, LORDS, STARS, LAWS, RANKS, SEAT, VACANT, RIVALS, KING_NEED, starAt, lordAt, kingAt, progress, cap, wonIds, nextOf, mine, entry, chart, panel };
})();
