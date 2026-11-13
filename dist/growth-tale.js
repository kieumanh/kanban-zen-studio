'use strict';
// v2.6.0 (Song Nguyệt): cốt truyện mới của Tu vi: "Hằng Nguyệt và Huyết Nguyệt".
// Lấy cảm hứng cấu trúc từ truyện tu luyện vượt cấp (đối thủ mạnh dần, phản diện tu luyện song hành, thần vị ở cấp 100);
// mọi tên người, tên môn phái, võ công và lời văn đều là sáng tác riêng của Kanban Zen Studio.
//
// Mạch truyện:
//  - Hiệp khách (danh hiệu người dùng) gánh nước dưới chân núi Vân Mộng, theo sư phụ Tùng Hạc. Thánh vật là mộc kiếm "Đòn Gánh".
//  - Phản diện: Huyết Nguyệt Giáo chủ Lệ Vô Khuyết, đại sư huynh năm xưa, ghét sự chậm rãi vì mẹ mình gánh nước tưới ruộng
//    suốt mùa hạn mà vẫn chết đói. Hắn hút nội lực, thời gian, hy vọng của người khác (Thôn Nguyệt Quyết) và tu luyện song hành:
//    luôn đi trước hiệp khách, rồi kẹt ở cấp 99 trước một cánh cửa không chịu mở.
//  - Thập Nguyệt Sứ: 10 thuộc hạ, mỗi kẻ là hiện thân của một thói xấu trong làm việc (trì hoãn, phân tâm, nóng vội, tự nghi ngờ,
//    ôm đồm, cầu toàn, kiệt sức, so sánh, cô lập, tuyệt vọng). Hiệp khách đối đầu từng kẻ dưới cấp 80; mỗi trận là một bài học.
//  - Từ cấp 80: giao thủ trực tiếp với Giáo chủ. Thiền sư Không Nguyệt (tinh thần 95, xuất hồn) dẫn lên núi tuyết bế quan;
//    võ sư Mạc Trấn Hải (nội lực 95) dẫn xuống biển bế quan.
//  v2.11.0 (Ẩn Tình): viết lại cấp 0–88, gieo các tình tiết bất ngờ (xem docs/release-notes/2.11.0.md):
//  - hiệp khách là đứa trẻ trong giỏ trước quán trà, chỉ có cái gáo gỗ sứt quai; chiếc đòn gánh đen sư phụ cho mượn (sau gọt thành
//    mộc kiếm Đòn Gánh) là của mẹ Lệ Vô Khuyết; sư phụ từng đi ngang Lệ thôn mà không dừng lại, quay lại muộn ba ngày (lộ ở cấp 88);
//  - Hàn Phong "phản bội" ở cấp 70 (tua kiếm ba nút: còn nợ, sẽ trả); từ cấp 60, "Tiểu Mộc" có điều lạ (con rùa sau bếp rụt cổ);
//    kế giữ trấn Thanh Khê bị lộ (cấp 84); Vô Vọng là Mạc Vọng, con trai Mạc Trấn Hải (cấp 86);
//  - sợi chỉ đỏ buộc vào chính ngực hiệp khách (cấp 82); Miên Hồ được dặn "đừng giết, chỉ nhớ mặt" (cấp 10).
//  - Sau cấp 95: sự thật. Vô Yểm Tà Thần là một Phương thần bị đày, không tự mở được cánh cửa 99 → 100 (Thiên Môn). Nó nuôi
//    Giáo chủ và mười Nguyệt Sứ làm đá mài, để hiệp khách mở cửa thay nó rồi bước theo qua sợi chỉ đỏ trên ngực hiệp khách.
//  - v2.12.0 (Thiên Môn Ký): chặng 90–100 viết chi tiết, 18 chương. Chương có cấp lẻ (97.5, 98.3 … 99.8) mở giữa chừng một cấp:
//    phần thập phân là phần đã đi của đường lên cấp kế tiếp (cấp 98–100 kéo dài nhiều tháng).
//    90 Hàn Phong hẹn canh ba · 91 Thiên Diện lộ mặt (Tiểu Mộc giả) · 92 cứu Tiểu Mộc thật, chiếc ghế thứ mười một · 93 Lệ thôn:
//    hiệp khách là đứa trẻ trong giỏ · 94 gánh nước cùng sư phụ, Tà thần chiếm xác Giáo chủ · 95 Mạc Trấn Hải chết đứng ·
//    96 sự thật · 97 Thiên Hình: Thiên Môn sẽ bị niêm ở kỳ nguyệt thực; Không Nguyệt là Hằng Nguyệt tinh quân · 97.5 ấn buộc
//    vào thói xấu · 98 trăng không lặn · 98.3 sư phụ mất, ngọn mạ đầu tiên · 98.7 đồng xanh · 99 đại chiến, hồn vào mắt đỏ ·
//    99.2 "mẹ chết vì ngươi" · 99.4 mười ổ khóa · 99.6 món nợ một gáo nước · 99.8 nguyệt thực, một gáo nước · 100 cả hai qua
//    cửa; hiệp khách kế thừa ngôi Hằng Nguyệt (Thiên Cang), Tà thần trong thân Giáo chủ đòi lại ngôi Phương thần: Song thần chi chiến.
//
// Mỗi chương: { lv, title, foe?, lead, pages: [[người nói, cảnh, lời]…], lesson }.
//  - lead = cấp của Huyết Nguyệt Giáo chủ lúc ấy (tu luyện song hành).
//  - cảnh = thế của hiệp khách trên tranh (talk, martial, taichi, zen); 'moon' = cảnh Huyết Nguyệt đài, không có hiệp khách.
//  - Chỗ thay: {name} danh hiệu; {y}/{Y} chàng/nàng; {sh}/{Sh} sư huynh/sư tỷ (Tiểu Mộc gọi); {sd}/{Sd} sư đệ/sư muội
//    (Giáo chủ gọi); {tt}/{Tt} tiểu tử/nha đầu (lão Trấn Hải gọi).
(function () {
  const WHO = {
    ke: 'Truyện ký',
    su: 'Sư phụ Tùng Hạc',
    moc: 'Tiểu Mộc',
    phong: 'Hàn Phong',
    ma: 'Tâm ma',
    dan: 'Người trấn Thanh Khê',
    thien: 'Thiền sư Không Nguyệt',
    hai: 'Võ sư Mạc Trấn Hải',
    giao: 'Giáo chủ Lệ Vô Khuyết',
    than: 'Vô Yểm Tà Thần',
    // v2.12.0 (Thiên Môn Ký): người nói của chặng 90–100.
    trang: 'Tiếng nói trong trăng máu',
    me: 'Thủy Nương, mẹ của Lệ Vô Khuyết',
    be: 'Cậu bé Lệ Vô Khuyết',
    batu: 'Bà Tư',
    hinh: 'Thiên Hình tinh quân',
    mien: 'Thụy Nguyệt Sứ Miên Hồ',
    dien: 'Huyễn Nguyệt Sứ Thiên Diện',
    loi: 'Tật Nguyệt Sứ Lôi Tốc',
    khuc: 'Âm Nguyệt Sứ Khúc U',
    bach: 'Thiên Thủ Nguyệt Sứ Bách Tý',
    ngoc: 'Lưu Ly Nguyệt Sứ Ngọc Vô Hà',
    kho: 'Khô Nguyệt Sứ Khô Vinh',
    kinh: 'Kính Nguyệt Sứ Ảnh Song',
    suong: 'Sương Nguyệt Sứ Lãnh Tịch',
    vong: 'Thực Nguyệt Sứ Vô Vọng',
  };
  // Phe ác: Giáo chủ và Thập Nguyệt Sứ (thứ tự gặp). vice = thói xấu kẻ ấy đại diện; art = võ công; lv = cấp của hiệp khách khi giao đấu.
  const FOES = [
    { id: 'giao', name: 'Lệ Vô Khuyết', title: 'Huyết Nguyệt Giáo chủ', vice: 'Lòng tham không đáy: muốn mọi thứ tròn đầy ngay lập tức', art: 'Thôn Nguyệt Quyết · Huyết Nguyệt Trảm · Huyết Nguyệt Thôn Thiên', color: '#b3263b', lv: [75, 80, 84, 88, 90, 94, 95, 99, 100] },
    { id: 'mien', name: 'Miên Hồ', title: 'Thụy Nguyệt Sứ', vice: 'Trì hoãn', art: 'Mê Hồn Hương · Trường Miên Phiến', color: '#8e6bbf', lv: [10] },
    { id: 'dien', name: 'Thiên Diện', title: 'Huyễn Nguyệt Sứ', vice: 'Phân tâm', art: 'Thiên Diện Huyễn Đăng', color: '#d0892c', lv: [15] },
    { id: 'loi', name: 'Lôi Tốc', title: 'Tật Nguyệt Sứ', vice: 'Nóng vội', art: 'Lôi Quang Song Đao', color: '#3b7dd8', lv: [20] },
    { id: 'khuc', name: 'Khúc U', title: 'Âm Nguyệt Sứ', vice: 'Tự nghi ngờ', art: 'Cốt Địch Ma Âm', color: '#4f8a83', lv: [25] },
    { id: 'bach', name: 'Bách Tý', title: 'Thiên Thủ Nguyệt Sứ', vice: 'Ôm đồm', art: 'Cửu Binh Liên Hoàn', color: '#9a5b2e', lv: [35] },
    { id: 'ngoc', name: 'Ngọc Vô Hà', title: 'Lưu Ly Nguyệt Sứ', vice: 'Cầu toàn', art: 'Lưu Ly Giáp · Băng Tâm Châm', color: '#5aa6b8', lv: [40] },
    { id: 'kho', name: 'Khô Vinh', title: 'Khô Nguyệt Sứ', vice: 'Kiệt sức', art: 'Khô Mộc Chưởng · Bất Miên Đan', color: '#7d7a3a', lv: [45] },
    { id: 'kinh', name: 'Ảnh Song', title: 'Kính Nguyệt Sứ', vice: 'So sánh', art: 'Đồng Kính Phục Ảnh', color: '#a08a4a', lv: [55] },
    { id: 'suong', name: 'Lãnh Tịch', title: 'Sương Nguyệt Sứ', vice: 'Cô lập', art: 'Băng Phong Vạn Lý', color: '#6f8fb3', lv: [60, 90] },
    { id: 'vong', name: 'Vô Vọng', title: 'Thực Nguyệt Sứ', vice: 'Tuyệt vọng, bỏ cuộc', art: 'Hắc Thủy · Thực Nguyệt Xích', color: '#3d3550', lv: [70, 75, 96] },
  ];
  const CHAPTERS = [
    { lv: 0, title: 'Trăng trong thùng nước', lead: 70, pages: [
      ['ke', 'zen', 'Dưới chân núi Vân Mộng có một quán trà nhỏ. Ở đó, {name} ngày ngày gánh nước từ suối về, chưa ai biết tên, cũng chưa ai đoán được con đường phía trước.'],
      ['ke', 'talk', '{Y} không biết cha mẹ mình là ai. Bà Tư chủ quán kể: năm đói, có người đặt một chiếc giỏ trước cửa. Trong giỏ là một đứa bé, và một cái gáo gỗ sứt quai.'],
      ['ke', 'talk', 'Một tối, trăng rằm in xuống thùng nước. {Y} đứng nhìn rất lâu: nước động thì trăng vỡ, nước yên thì trăng tròn.'],
      ['ke', 'martial', 'Bên suối, một lão nhân áo xám trượt chân. {Y} buông đòn gánh, lao tới đỡ, chẳng tiếc hai thùng nước vừa đầy.'],
      ['su', 'talk', 'Đôi tay này chưa biết một chiêu nào, nhưng biết dừng lại vì người khác. Ít ai làm được thế. Ngươi có muốn học võ không?'],
      ['hero', 'martial', 'Tại hạ muốn! Xin tiền bối dạy tại hạ chiêu lợi hại nhất, để không ai bắt nạt được người trong quán nữa.'],
      ['su', 'zen', 'Chiêu lợi hại nhất là chiêu ngươi luyện mỗi ngày. Lên núi Tùng Hạc tìm ta. Nhớ mang theo đòn gánh.'],
      ['ke', 'zen', 'Trước khi đi, mắt lão dừng lại ở cái gáo sứt quai bên hông {y}, lâu hơn một nhịp. Đêm ấy, vầng trăng bỗng nhuốm đỏ trong một khắc. Lão khẽ thở dài: "Nó lại bắt đầu rồi."'],
      ['ke', 'moon', 'Cách đó ba nghìn dặm, trên Huyết Nguyệt đài, một người áo trắng đeo mặt nạ trăng khuyết mở mắt. Giang hồ gọi hắn là Huyết Nguyệt Giáo chủ.'],
      ['giao', 'moon', 'Cấp bảy mươi. Vẫn còn khuyết. Trăng của ta phải tròn.'],
    ], lesson: 'Mọi hành trình lớn bắt đầu bằng một việc nhỏ được làm cho trọn. Đừng chờ thấy hết con đường mới bước.' },

    { lv: 5, title: 'Trăm chuyến nước', lead: 71, pages: [
      ['ke', 'talk', 'Núi Tùng Hạc dốc đứng. Chuyến thứ mười, vai {name} rớm máu. Chuyến thứ hai mươi, chiếc đòn gánh mang từ quán trà gãy làm đôi.'],
      ['ke', 'talk', 'Sư phụ với tay lên xà nhà, lấy xuống một chiếc đòn gánh cũ. Gỗ đã lên nước đen bóng, một đầu có vết khấc nhỏ như móng tay.'],
      ['su', 'talk', 'Mượn tạm. Của người gánh nước giỏi nhất ta từng biết. Đừng làm gãy.'],
      ['moc', 'talk', 'Hì hì, {sh} gánh nước chậm hơn cả con rùa sau bếp! Đệ cá là chưa tới chuyến năm mươi {sh} đã xuống núi rồi.'],
      ['hero', 'zen', 'Đêm ấy tại hạ đã định bỏ về. Nhưng nhìn hai thùng nước đầy, lại tự nhủ: thêm một chuyến nữa thôi. Chỉ một chuyến.'],
      ['ke', 'martial', 'Sáng ngày thứ bảy, {y} chợt thấy bước chân đã vững, hơi thở đã đều. Gánh nước không còn nặng như trước.'],
      ['su', 'taichi', 'Võ công không nằm trong chiêu thức. Nó nằm ở chỗ ngày nào cũng gánh, kể cả ngày không muốn gánh.'],
      ['moc', 'talk', 'Sư phụ ơi, sao không dạy {sh} kiếm pháp cho nhanh? Dưới trấn người ta đồn Huyết Nguyệt Giáo dạy thành cao thủ chỉ trong một đêm!'],
      ['su', 'zen', 'Thứ gì đến trong một đêm sẽ đòi lại gấp mười. Ta từng thấy đứa trẻ thông minh nhất đời mình đi con đường ấy.'],
      ['ke', 'moon', 'Trên Huyết Nguyệt đài, Giáo chủ đặt tay lên đỉnh đầu một võ sư bị bắt. Nội lực ba mươi năm của người ấy chảy sang hắn trong một hơi. Cấp bảy mươi mốt.'],
    ], lesson: 'Đều đặn thắng hăng hái. Một việc nhỏ mỗi ngày nuôi nội lực hơn một ngày gắng sức rồi bỏ dở.' },

    { lv: 10, title: 'Trấn ngủ say', foe: 'mien', lead: 73, pages: [
      ['su', 'talk', 'Mang lá thư này xuống trấn Thanh Khê, trao tận tay chưởng quầy Phúc Lai khách điếm. Ba ngày phải tới.'],
      ['ke', 'talk', 'Trấn Thanh Khê lặng như tờ. Người bán bánh gục bên lò, thợ rèn ngủ trên đe, trẻ con ngủ giữa đường. Lò đã nguội ba hôm.'],
      ['ke', 'moon', 'Trên mái ngói, một nữ nhân đeo mặt nạ hồ ly phe phẩy quạt tím. Mỗi nhịp quạt, một làn hương ngọt lịm tỏa xuống.'],
      ['mien', 'moon', 'Ngủ thêm chút nữa đi, khách lạ. Việc hôm nay để mai làm cũng được mà. Mai làm, chắc chắn sẽ tốt hơn.'],
      ['ke', 'zen', 'Đó là Thụy Nguyệt Sứ Miên Hồ, sứ giả thứ nhất của Huyết Nguyệt Giáo. Nơi nàng đi qua, người ta cứ hẹn sang ngày mai, mãi mãi.'],
      ['hero', 'zen', 'Mí mắt tại hạ nặng như chì. Không đánh nổi, cũng không nghĩ nổi. Vậy thì… chỉ làm một việc thật nhỏ thôi.'],
      ['ke', 'martial', '{Y} múc một gáo nước suối dội lên đầu, rồi đếm hơi thở như lúc gánh nước: một, hai, ba. Bước một bước. Rồi thêm một bước.'],
      ['mien', 'moon', 'Ngươi… sao không ngủ? Mê Hồn Hương của ta chưa từng thất bại!'],
      ['hero', 'martial', 'Vì tại hạ không đợi tỉnh hẳn mới làm. Tại hạ làm trước, tỉnh sau.'],
      ['ke', 'taichi', '{Y} gõ chiếc chuông đồng đầu trấn. Từng người tỉnh giấc. Lạ thay, Miên Hồ không bỏ chạy. Nàng ngồi trên mái ngói, chống cằm nhìn {y} rất lâu.'],
      ['mien', 'moon', 'Kẻ đầu tiên tỉnh được sau ngần ấy năm. Giáo chủ đã dặn: gặp kẻ như thế thì đừng giết. Chỉ cần nhớ mặt.'],
      ['ke', 'moon', 'Nàng cười khanh khách rồi tan vào sương. Ba ngày ngủ say của cả trấn đã thành một dòng khí đỏ chảy về Huyết Nguyệt đài. Giáo chủ chạm cấp bảy mươi ba.'],
    ], lesson: 'Đừng đợi có hứng mới bắt đầu. Khi uể oải, hãy làm một việc nhỏ trong hai phút: hành động đến trước, tinh thần theo sau.' },

    { lv: 15, title: 'Hội đèn nghìn mặt', foe: 'dien', lead: 75, pages: [
      ['ke', 'talk', 'Rằm tháng Giêng, chợ Thanh Khê mở hội đèn. Dân trấn góp tiền, nhờ {name} giữ quỹ sửa cây cầu gỗ sắp sập.'],
      ['ke', 'moon', 'Giữa hội có một gánh xiếc lạ. Gã chủ gánh mỗi lần quay đầu lại mang một khuôn mặt khác: lúc ông lão, lúc thiếu nữ, lúc chính người đang nhìn hắn.'],
      ['dien', 'moon', 'Lại đây, lại đây! Ở đây có cả nghìn điều thú vị. Ngươi nhìn đèn này chưa? Còn đèn kia? Kia nữa!'],
      ['ke', 'talk', 'Mỗi ngọn đèn hắn chỉ vào lại mở ra một ảo cảnh. Đám thanh niên trong trấn đi theo ánh đèn, quên cả việc đang làm, rồi mất hút vào bóng đêm.'],
      ['hero', 'talk', 'Tại hạ cũng thấy chân mình bước theo. Đèn nào cũng đẹp, chỗ nào cũng muốn xem. Đến khi giật mình, túi quỹ sửa cầu đã nhẹ bẫng.'],
      ['su', 'zen', '(Lời sư phụ vọng lại) Khi mắt bị kéo về trăm phía, hãy nhìn một điểm. Một điểm thôi, rồi thở.'],
      ['ke', 'martial', '{Y} nhắm mắt, chỉ giữ trong đầu một hình ảnh: cây cầu gỗ cần sửa. Ảo cảnh nhòe dần. Tiếng chân kẻ trộm túi quỹ hiện ra rõ mồn một.'],
      ['dien', 'moon', 'Thú vị! Kẻ chỉ nhìn một điểm thì nghìn mặt của ta vô dụng. Nhưng ta thích nhất những khuôn mặt được người khác tin. Lần sau gặp lại, ngươi sẽ không nhận ra ta đâu.'],
      ['ke', 'zen', 'Huyễn Nguyệt Sứ Thiên Diện biến mất. Khuôn mặt cuối cùng hắn mang, trong một chớp mắt, là mặt của chính {name}. Đám thanh niên tỉnh lại giữa bãi tha ma, không nhớ mình đã bỏ dở bao nhiêu việc.'],
      ['ke', 'moon', 'Những canh giờ bị đèn nghìn mặt cuốn đi đều chảy về trăng máu. Giáo chủ nuốt trọn. Cấp bảy mươi lăm.'],
    ], lesson: 'Phân tâm lấy đi thời gian một cách êm ái nhất. Chọn một việc, nhìn vào nó, làm xong rồi mới ngẩng lên.' },

    { lv: 20, title: 'Cầu Lạc Nhạn', foe: 'loi', lead: 77, pages: [
      ['ke', 'talk', 'Trên đường hộ tống thuốc lên núi, {name} gặp một kiếm khách áo đen trên cầu Lạc Nhạn. Hắn tên Hàn Phong, kiếm nhanh như chớp, miệng nhanh hơn kiếm.'],
      ['phong', 'martial', 'Gánh nước mà cũng đòi hành hiệp? Ta luyện kiếm ba năm đã xuất được mười chiêu một hơi. Tránh đường!'],
      ['ke', 'martial', 'Chưa dứt lời, một bóng người lao qua cầu như sét. Hai thanh đao lóe sáng. Hàn Phong chỉ kịp đỡ ba chiêu rồi văng vào thành cầu.'],
      ['loi', 'moon', 'Chậm! Quá chậm! Tật Nguyệt Sứ Lôi Tốc ta, một hơi xuất ba mươi đao. Kẻ chậm chỉ đáng làm bậc thềm cho kẻ nhanh.'],
      ['hero', 'taichi', 'Đao hắn nhanh đến mức tại hạ không nhìn kịp. Vậy thì không nhìn nữa. Tại hạ đứng yên, khí trầm đan điền, chờ.'],
      ['ke', 'taichi', 'Ba mươi đao chém tới. {Y} chỉ nghiêng người, lùi nửa bước, xoay vai. Đao nào cũng sượt qua. Kẻ vội thì hụt hơi; người chậm thì còn sức.'],
      ['ke', 'martial', 'Đến đao thứ ba mươi mốt, Lôi Tốc thở dốc, chân loạng choạng. Cán đòn gánh của {name} gõ đúng cổ tay hắn. Một thanh đao rơi xuống vực, thanh kia cắm phập vào ván cầu.'],
      ['phong', 'talk', 'Ngươi… thắng bằng cách đứng yên? Ta không phục. Nhưng ta sẽ nhớ cái tên {name}.'],
      ['ke', 'talk', 'Hàn Phong đi rồi, {y} mới nhận ra thanh đao cắm trên ván cầu cũng biến mất. Kẻ mê tốc độ đã nhặt đi món binh khí nhanh nhất giang hồ.'],
      ['ke', 'moon', 'Tin Lôi Tốc bại trận bay về Huyết Nguyệt đài. Giáo chủ không giận, chỉ mỉm cười dưới mặt nạ: "Kẻ biết chậm… hiếm lắm. Cứ để nó lớn." Cấp bảy mươi bảy.'],
    ], lesson: 'Nhanh mà rối thì sớm kiệt. Chậm lại một nhịp để làm cho đúng, thường lại về đích trước.' },

    { lv: 25, title: 'Tiếng sáo đêm mưa', foe: 'khuc', lead: 79, pages: [
      ['ke', 'zen', 'Đêm mưa, {name} canh giữ ngôi miếu hoang cho đoàn người chạy nạn. Từ xa vọng lại một tiếng sáo xương, lạnh như nước giếng.'],
      ['khuc', 'moon', 'Âm Nguyệt Sứ Khúc U ta không đánh ai cả. Ta chỉ thổi cho ngươi nghe điều ngươi vẫn thì thầm với chính mình.'],
      ['ma', 'zen', 'Ngươi chỉ là kẻ gánh nước. Hàn Phong nhanh hơn, Tiểu Mộc lanh lợi hơn. Đến cha mẹ mình là ai ngươi còn chẳng biết. Ngươi tưởng mình bảo vệ được ai?'],
      ['hero', 'zen', 'Câu cuối đâm trúng chỗ tại hạ chưa từng kể với ai. Tay tại hạ buông đòn gánh. Đoàn người sau lưng bắt đầu run rẩy, vì người canh giữ họ đang run.'],
      ['su', 'zen', '(Lời sư phụ vọng lại) Tâm ma không giết người bằng kiếm. Nó giết bằng cách bắt ngươi quên những gì ngươi đã làm được.'],
      ['hero', 'talk', 'Vậy tại hạ đếm. Một trăm chuyến nước. Một trấn được đánh thức. Một túi quỹ giữ lại. Một cây cầu không sập. Đó đâu phải là không có gì.'],
      ['ke', 'martial', 'Mỗi điều {y} kể ra là một nốt lệch trong khúc sáo. Đến điều thứ mười, ống sáo xương nứt toác. Khúc U lùi vào màn mưa.'],
      ['khuc', 'moon', 'Giỏi lắm. Nhưng trong ngươi còn một chỗ trống chưa đếm được. Ngày nào ngươi nhìn vào đó, ta sẽ lại thổi. Giáo chủ cũng nghe ta thổi mỗi đêm đấy.'],
      ['ke', 'moon', 'Giáo chủ nghe tin, lặng đi một lúc. Hắn chưa từng đếm những gì mình đã có, chỉ đếm những gì còn thiếu. Cấp bảy mươi chín.'],
    ], lesson: 'Khi nghi ngờ bản thân, hãy đọc lại những việc đã xong. Ghi chép tiến độ không để khoe, mà để có chỗ tựa trong đêm mưa.' },

    { lv: 30, title: 'Đại sư huynh', lead: 81, pages: [
      ['ke', 'talk', 'Sau đêm mưa, sư phụ Tùng Hạc gọi {name} lên am. Trên bàn là một chiếc mặt nạ trăng khuyết bằng bạc đã xỉn màu.'],
      ['su', 'zen', 'Hơn hai mươi năm trước, ta mang về một đứa trẻ sống sót sau nạn đói. Nó thông minh nhất đời ta: một năm học hết kiếm pháp người khác học mười năm.'],
      ['su', 'talk', 'Nó tên Lệ Vô Khuyết, đại sư huynh của ngươi. Chỉ có một việc nó không chịu làm: gánh nước.'],
      ['hero', 'talk', 'Vì sao ạ? Gánh nước đâu có gì khó.'],
      ['su', 'zen', 'Vì mẹ nó đã gánh nước tưới ruộng suốt mùa hạn, ngày nào cũng gánh, rồi vẫn chết đói. Nó tin rằng chăm chỉ mỗi ngày là vô ích.'],
      ['su', 'talk', 'Một đêm trăng máu, nó lấy trộm Thôn Nguyệt Quyết, bộ tà công hút nội lực người khác, rồi bỏ đi. Nay nó là Huyết Nguyệt Giáo chủ.'],
      ['hero', 'talk', 'Sư phụ gặp huynh ấy ở đâu ạ?'],
      ['su', 'zen', 'Ở một nơi ta đến muộn ba ngày.'],
      ['ke', 'martial', 'Lão không nói thêm. Sáng hôm sau, lão gọt chiếc đòn gánh đen bóng thành một thanh mộc kiếm, giữ nguyên vết khấc ở đầu: "Kiếm này tên Đòn Gánh. Người chủ cũ sẽ muốn nó được dùng tiếp."'],
      ['ke', 'moon', 'Chiều ấy, một con quạ đen đậu trước am, chân buộc phong thư viền đỏ.'],
      ['giao', 'moon', 'Tiểu {sd}, nghe nói ngươi cũng gánh nước. Cứ gánh đi. Ta ở trên đỉnh, chờ xem ngươi gánh được bao xa.'],
    ], lesson: 'Cùng một việc, có người thấy là gánh nặng, có người thấy là nền móng. Cách ta kể về công sức của mình sẽ quyết định ta trở thành ai.' },

    { lv: 35, title: 'Ba làng một đêm', foe: 'bach', lead: 83, pages: [
      ['ke', 'talk', 'Cùng một đêm, ba ngọn khói báo động bốc lên: làng Đông cháy kho lúa, làng Tây vỡ đê, làng Nam có người bị bắt.'],
      ['bach', 'moon', 'Thiên Thủ Nguyệt Sứ Bách Tý ta có chín món binh khí, tay nào cũng bận. Ngươi chỉ có hai tay, cứu nổi nơi nào?'],
      ['hero', 'martial', 'Tại hạ lao sang làng Đông, quay về làng Tây, rồi chạy tiếp sang làng Nam. Chạy khắp nơi, nơi nào cũng chỉ cứu được một nửa.'],
      ['moc', 'talk', '{Sh} ơi, dừng lại! Đệ dựng tấm bảng tre ba cột: Chưa làm, Đang làm, Đã xong. Mình phải chọn trước, rồi nhờ người!'],
      ['ke', 'zen', '{Name} nhìn tấm bảng. Đê vỡ thì cả làng Tây chết đuối: việc ấy trọng yếu nhất. Kho lúa giao dân làng Đông tự dập. Làng Nam nhờ Hàn Phong.'],
      ['phong', 'martial', 'Coi như ta trả món nợ cầu Lạc Nhạn. Nhớ ám hiệu này: tua kiếm thắt một nút là hết nợ, ba nút là còn nợ, sẽ trả. Đi đi, làng Nam để ta.'],
      ['ke', 'martial', 'Không còn chạy khắp nơi, {y} dồn toàn lực đắp đê. Xong đê mới sang làng Đông. Chín món binh khí của Bách Tý quờ quạng giữa ba nơi, chẳng nơi nào trúng.'],
      ['bach', 'moon', 'Ta có chín tay, mà thua kẻ chỉ làm một việc một lúc? Cũng được. Đêm nay ta chỉ cần cả núi nhìn xuống ba đám khói.'],
      ['ke', 'zen', 'Về tới am, {name} thấy cửa mở toang. Rương của sư phụ bị lục tung, xà nhà bị cạy từng thanh, nhưng không mất gì. Kẻ lạ đã tìm một thứ không còn ở đó.'],
      ['su', 'talk', 'Chúng tìm chiếc đòn gánh cũ trên xà nhà. Giờ nó nằm trên lưng ngươi rồi. Giữ cho kỹ. Có kẻ sợ thanh gỗ ấy hơn sợ mọi thanh kiếm.'],
      ['ke', 'moon', 'Ba làng được cứu. Nhưng nỗi hoảng loạn một đêm của ba nghìn người vẫn chảy về Huyết Nguyệt đài. Giáo chủ chạm cấp tám mươi ba.'],
    ], lesson: 'Ôm mọi việc cùng lúc thì việc nào cũng dở dang. Chọn việc trọng yếu nhất, giao bớt cho người khác, và để bảng việc nhớ thay cho mình.' },

    { lv: 40, title: 'Áo giáp lưu ly', foe: 'ngoc', lead: 85, pages: [
      ['ke', 'talk', 'Ở kinh thành, một kẻ khoác giáp lưu ly trong suốt thách đấu khắp các võ đường. Không thanh kiếm nào để lại nổi một vết xước.'],
      ['ngoc', 'moon', 'Lưu Ly Nguyệt Sứ Ngọc Vô Hà ta không ra tay khi chưa hoàn hảo. Ta chuẩn bị mười năm cho một trận. Còn ngươi, mộc kiếm sứt mẻ thế kia?'],
      ['hero', 'talk', 'Đúng là sứt mẻ. Mỗi vết sứt là một lần tại hạ đánh trật. Nhưng tại hạ vẫn đánh tiếp.'],
      ['ke', 'martial', '{Y} chém, kiếm bật ra. Chém nữa, lại bật. Người xem cười ồ. Nhưng mũi mộc kiếm lần nào cũng trúng đúng một điểm trên vai giáp.'],
      ['ngoc', 'moon', 'Vô ích! Một trăm nhát vụng về không bằng một nhát hoàn hảo.'],
      ['ke', 'martial', 'Nhát thứ một trăm lẻ một, một tiếng "tách" rất khẽ. Vết rạn lan ra như mạng nhện. Giáp lưu ly vỡ vụn như sương sớm.'],
      ['hero', 'zen', 'Một nhát hoàn hảo, không ai chờ nổi. Một trăm nhát chưa hoàn hảo, làm được ngay hôm nay.'],
      ['ngoc', 'moon', 'Không thể… Giáo chủ nói chỉ thứ không tì vết mới đáng tồn tại…'],
      ['ke', 'moon', 'Trên Huyết Nguyệt đài, Giáo chủ nhìn mảnh giáp vỡ rất lâu. Rồi hắn bóp nát nó: "Khuyết thì vứt." Ngay đêm ấy, Ngọc Vô Hà bị đuổi khỏi giáo, tay ôm một bọc mảnh vỡ. Cấp tám mươi lăm.'],
    ], lesson: 'Cầu toàn là cách trì hoãn khéo nhất. Làm xong một bản chưa đẹp rồi sửa dần; đều tay lặp lại sẽ phá được cả giáp lưu ly.' },

    { lv: 45, title: 'Viên đan không ngủ', foe: 'kho', lead: 87, pages: [
      ['ke', 'talk', 'Danh tiếng {name} lan khắp giang hồ. Người cần giúp xếp hàng dài trước cổng núi. {Y} nhận hết, ngày làm, đêm cũng làm.'],
      ['kho', 'moon', 'Một lão thầy thuốc gầy như que củi dâng viên đan đỏ: "Uống vào khỏi cần ngủ, làm được gấp ba. Người tài như các hạ, ngủ là phí của trời."'],
      ['phong', 'talk', 'Gấp ba ư? Cho ta ba viên. Ta không có thì giờ để thua một kẻ gánh nước.'],
      ['ke', 'martial', 'Ba ngày không ngủ, {y} đánh lui ba toán cướp. Bảy ngày, chữa đê, dựng trường. Đến ngày thứ mười, tay cầm kiếm run lẩy bẩy.'],
      ['kho', 'moon', 'Khô Nguyệt Sứ Khô Vinh ta chẳng cần đánh ai. Ta chỉ giúp các ngươi tự vắt cạn mình. Cây càng tươi, lúc khô càng nhanh.'],
      ['ke', 'zen', 'Ngày thứ mười một, {name} ngã quỵ giữa sân. Nội lực tích cóp bao năm rò ra như nước khỏi thùng thủng.'],
      ['moc', 'talk', '{Sh} mà không nghỉ thì đệ trói {sh} vào giường thật đấy! Sư phụ dặn: ngủ cũng là luyện công.'],
      ['su', 'zen', 'Cung căng mãi thì gãy. Đêm nay ngươi ngủ, mai ngươi ngủ. Việc thiên hạ không chạy mất đâu.'],
      ['ke', 'taichi', 'Ba ngày nghỉ, nội lực lại đầy. Lần này Khô Vinh tới, {y} chỉ cười, trả lại viên đan, rồi hóa giải Khô Mộc Chưởng bằng một hơi thở dài.'],
      ['ke', 'talk', 'Chỉ có Hàn Phong không trả đan. Hắn lặng lẽ cất hai viên còn lại vào ngực áo, mắt thâm quầng mà sáng rực.'],
      ['ke', 'moon', 'Hàng trăm người khác đã nuốt đan của Khô Vinh. Sức lực họ đốt cạn chảy về Huyết Nguyệt đài. Giáo chủ chạm cấp tám mươi bảy.'],
    ], lesson: 'Nghỉ ngơi là một phần của tu luyện. Làm đến kiệt sức không phải chăm chỉ, mà là vay sức của ngày mai với lãi rất cao.' },

    { lv: 50, title: 'Trăng không trên đỉnh tuyết', lead: 90, pages: [
      ['ke', 'zen', 'Sư phụ gửi {name} lên Tuyết Phong bế quan. Trên đỉnh không có ai, chỉ có một am tranh và một chiếc bồ đoàn cũ.'],
      ['ke', 'talk', 'Đêm thứ ba, một vị sư già bước ra từ ánh trăng. Thân ông mờ như khói, chân không chạm tuyết.'],
      ['thien', 'zen', 'Đừng sợ. Thân lão đang ngồi ở một nơi rất xa. Lão là Không Nguyệt. Lão đi khắp nơi bằng hồn, xem ai đang thức. Lão tìm một người như thế đã lâu lắm rồi.'],
      ['hero', 'talk', 'Bạch đại sư, tại hạ muốn mạnh hơn để thắng Huyết Nguyệt Giáo chủ. Xin đại sư dạy tại hạ võ công.'],
      ['thien', 'zen', 'Lão không có võ công. Lão chỉ có một câu hỏi: ngươi luyện để thắng hắn, hay để giữ yên thùng nước của mình?'],
      ['ke', 'zen', 'Bảy mươi bảy ngày, {y} ngồi giữa tuyết. Ban đầu nghĩ về Giáo chủ, về chiến thắng. Rồi chỉ còn hơi thở. Rồi chỉ còn tuyết rơi.'],
      ['ke', 'taichi', 'Sáng ngày thứ bảy mươi tám, nội lực trong người {name} tự xoay như dòng suối đầu nguồn. Phản bổn hoàn nguyên: cảnh giới Tiên thiên.'],
      ['thien', 'talk', 'Hắn muốn trăng của mình tròn. Ngươi chỉ cần nước của mình yên. Trăng không ở trong tay ai cả.'],
      ['ke', 'zen', 'Vị sư tan vào ánh trăng. Lạ một điều: mỗi lần ông cất lời chỉ dạy, vầng trăng trên đỉnh tuyết lại mờ đi một chút, như có ai đang trả giá cho từng câu nói.'],
      ['ke', 'moon', 'Cùng đêm ấy, Giáo chủ phá ải cấp chín mươi, bước vào Võ lâm chí tôn. Hắn nuốt nội lực của cả một môn phái để mở cánh cửa ấy.'],
    ], lesson: 'Thỉnh thoảng hãy rời xa mọi việc để nhìn lại mục đích. Một khoảng lặng có chủ đích giúp ta đi xa hơn trăm ngày cắm đầu chạy.' },

    { lv: 55, title: 'Tấm gương đồng', foe: 'kinh', lead: 91, pages: [
      ['ke', 'talk', 'Hàn Phong vừa phá ải Tiên thiên trước {name} một tháng. Giang hồ bàn tán: kiếm khách áo đen đã vượt xa kẻ gánh nước.'],
      ['kinh', 'moon', 'Kính Nguyệt Sứ Ảnh Song ta xin chỉ cho ngươi thấy: ngươi luôn kém người khác một bước.'],
      ['ke', 'martial', 'Từ tấm gương đồng, một {name} khác bước ra, đánh y hệt từng chiêu. {Y} nhanh, nó nhanh. {Y} mạnh, nó mạnh. Bên cạnh, bóng Hàn Phong cười nhạo.'],
      ['hero', 'zen', 'Càng nhìn người trong gương, tại hạ càng đánh như người trong gương. Càng nhìn Hàn Phong, tại hạ càng muốn vội.'],
      ['ke', 'moon', 'Rồi trong một chớp mắt, {name} trong gương đeo một chiếc mặt nạ trăng khuyết. {Y} chớp mắt, chiếc mặt nạ đã biến mất. Ảnh Song cũng sững người: gương của hắn chưa từng tự vẽ thêm thứ gì.'],
      ['phong', 'talk', 'Ngươi nhìn ta làm gì? Ta có đi đường của ngươi đâu. Nhìn hôm qua của ngươi ấy!'],
      ['ke', 'taichi', '{Y} thôi nhìn gương. Nhớ lại mình ngày đầu: chuyến nước thứ mười, vai rớm máu. Nay vai đã chai, kiếm đã vững. Thế là đủ.'],
      ['ke', 'martial', 'Rồi {y} làm điều tấm gương không bắt chước được: cúi xuống đỡ một đứa trẻ vấp ngã giữa trận. Bóng trong gương đứng sững, không biết đỡ ai.'],
      ['kinh', 'moon', 'Gương của ta chỉ sao lại cú đánh. Không sao lại được… lòng tốt.'],
      ['ke', 'talk', 'Trận tan, chỉ còn Hàn Phong đứng trước mảnh gương vỡ rất lâu. Trong mảnh gương ấy, hắn thấy mình đi sau {name} đúng một bước, dù ngoài đời hắn đang đi trước.'],
      ['ke', 'moon', 'Những ai bị Ảnh Song bắt soi gương, ghen tị mà bỏ dở việc mình, đều thành thức ăn cho trăng máu. Giáo chủ chạm cấp chín mươi mốt.'],
    ], lesson: 'So với người khác chỉ thấy mình thiếu. So với chính mình hôm qua mới thấy mình đã đi được bao xa.' },

    { lv: 60, title: 'Võ đường giữa băng', foe: 'suong', lead: 93, pages: [
      ['ke', 'talk', '{Name} mở một võ đường nhỏ dưới chân núi Vân Mộng. Tiểu Mộc làm đại đệ tử, ngày ngày treo bảng tre ba cột trước cổng.'],
      ['ke', 'moon', 'Mùa đông, Sương Nguyệt Sứ Lãnh Tịch tới. Nàng không nói một lời. Băng mọc lên giữa sân, chia võ đường thành từng ô cô lập.'],
      ['suong', 'moon', 'Ai cũng một mình mà mạnh. Cần gì người khác? Nhờ vả là yếu đuối.'],
      ['hero', 'martial', 'Tại hạ đập băng một mình suốt một đêm. Đập được một thước, băng mọc lại hai thước. Hơi lạnh ngấm dần vào xương.'],
      ['moc', 'talk', '{Sh} ơi! {Sh} luôn bảo đệ biết nhờ người. Sao giờ {sh} lại không nhờ ai?'],
      ['ke', 'taichi', '{Y} sững người, rồi gọi lớn. Từng đệ tử trong từng ô băng gọi đáp lại. Họ đếm nhịp, cùng vận công vào một điểm.'],
      ['ke', 'martial', 'Mười lăm luồng nội lực nhỏ hợp thành một dòng. Băng nứt toác. Lãnh Tịch bị đẩy lùi ba trượng, đôi mắt lạnh lần đầu ngỡ ngàng.'],
      ['suong', 'moon', 'Ta đã một mình suốt hai mươi năm. Thì ra… có thể không phải thế.'],
      ['ke', 'talk', 'Băng tan, Tiểu Mộc xuống núi chặt tre làm bảng mới. Ba hôm sau cậu mới về, cười hì hì như mọi khi. Chỉ có con rùa sau bếp rụt cổ lại khi cậu đi ngang.'],
      ['ke', 'moon', 'Giáo chủ chẳng bao giờ nhờ ai. Hắn chỉ lấy. Cấp chín mươi ba.'],
    ], lesson: 'Một mình thì đi nhanh, cùng nhau mới đi xa. Biết nhờ giúp đúng lúc là bản lĩnh, không phải yếu đuối.' },

    { lv: 65, title: 'Lão ngư trên đảo đá', lead: 94, pages: [
      ['ke', 'talk', 'Nghe lời Không Nguyệt, {name} ra biển tìm một người. Trên đảo Thiết Thạch chỉ có một lão ngư phủ say khướt ngồi vá lưới.'],
      ['hai', 'talk', 'Hừ, lại một {tt} muốn học võ! Ta là Mạc Trấn Hải, ba mươi năm không thu đồ đệ. Đứa cuối cùng ta dạy, biển chỉ trả về có một nửa. Ra kia đứng đón sóng!'],
      ['ke', 'martial', 'Con sóng đầu tiên quật {name} ngã sấp. Con sóng thứ hai lôi {y} ra xa. Lão ngư không thèm nhìn, vẫn uống rượu.'],
      ['hai', 'talk', 'Ngươi chống lại sóng thì sóng thắng. Biển không bao giờ mệt. Học cách thở cùng nó!'],
      ['ke', 'taichi', 'Ba tháng đứng trước biển, {y} học được nhịp của sóng: dồn tới, rút về, dồn tới. Nội lực trong người cũng dồn và rút theo.'],
      ['ke', 'talk', 'Tấm lưới lão vá mỗi chiều có một nút thắt vụng về của trẻ con. Lão vá mọi chỗ rách, trừ chỗ ấy.'],
      ['ke', 'martial', 'Một sáng, lão ngư đứng dậy, vung một quyền ra khơi. Mặt biển rẽ đôi trăm trượng. Nội lực của lão đã tới cấp chín mươi lăm; lão chưa từng say thật.'],
      ['hai', 'zen', 'Mạnh không phải đánh mạnh. Mạnh là ngày nào cũng ra đứng trước biển, kể cả ngày biển dữ nhất.'],
      ['ke', 'moon', 'Trên Huyết Nguyệt đài, Giáo chủ cảm thấy ở phương nam có một nguồn nội lực đang lớn dần, đều như thủy triều. Hắn nheo mắt. Cấp chín mươi tư.'],
    ], lesson: 'Đừng chống lại những gì mình không đổi được. Học lấy nhịp của nó rồi lặp lại đều đặn; sức bền đến từ nhịp, không đến từ gắng gượng.' },

    { lv: 70, title: 'Nguyệt thực', foe: 'vong', lead: 95, pages: [
      ['ke', 'moon', 'Đêm nguyệt thực, trời tối như mực. Cổng võ đường vốn cài then từ bên trong bỗng mở toang. Một gã khổng lồ kéo xích sắt đen bước vào. Mỗi bước chân, nước đen rỉ ra từ mặt đất.'],
      ['vong', 'moon', 'Thực Nguyệt Sứ Vô Vọng, đứng đầu Thập Nguyệt Sứ. Chín đứa kia thua ngươi. Ta đến để cho ngươi biết: mọi cố gắng đều vô nghĩa.'],
      ['ke', 'zen', 'Hắc Thủy tràn lên. Ai bị nó chạm vào đều buông binh khí, ngồi thụp xuống, thì thầm: "Làm gì cũng thế thôi."'],
      ['hero', 'martial', 'Tại hạ lao lên. Ba mươi chiêu, năm mươi chiêu. Tại hạ gọi lớn: "Hàn Phong, giữ cánh trái!" Sau lưng có tiếng kiếm rời vỏ.'],
      ['ke', 'martial', 'Mũi kiếm ấy không đâm về phía Vô Vọng. Nó xuyên qua vai {name} từ phía sau. Hàn Phong đứng đó, áo đen đã viền đỏ, bên hông giắt thanh đao của Lôi Tốc.'],
      ['phong', 'moon', 'Ta đã chán nhìn lưng ngươi. Giáo chủ cho ta mười năm nội lực chỉ trong một đêm. Từ nay hãy gọi ta là Nguyệt Sứ thứ mười một.'],
      ['ke', 'zen', 'Võ đường cháy rụi. Tấm bảng tre ba cột gãy làm đôi. Vô Vọng bỏ đi, để lại một câu: "Mai ngươi sẽ tự bỏ cuộc. Ta không cần giết."'],
      ['hero', 'zen', 'Bảy ngày, tại hạ nằm im. Vết kiếm trên vai không đau bằng câu hỏi: trăm chuyến nước, nghìn ngày luyện kiếm, một người bạn… rốt cuộc để làm gì?'],
      ['moc', 'talk', 'Đệ dựng lại bảng rồi. Cột "Đã xong" vẫn còn nguyên. Bao nhiêu việc {sh} đã làm vẫn ở đó. Lửa không đốt được. Kẻ phản bội cũng không lấy đi được.'],
      ['ke', 'moon', 'Nỗi tuyệt vọng của cả võ đường cuộn về Huyết Nguyệt đài như một dòng sông đen. Giáo chủ chạm cấp chín mươi lăm.'],
      ['giao', 'moon', 'Nó sẽ đứng dậy. Ta biết. Ta cũng từng nằm bảy ngày như thế, bên cạnh mẹ ta.'],
    ], lesson: 'Thất bại và phản bội không xóa đi những gì đã làm. Khi gục ngã, đừng hỏi "để làm gì"; hãy hỏi "việc nhỏ nhất mình làm được ngay lúc này là gì".' },

    { lv: 75, title: 'Chuyến nước thứ mười nghìn', foe: 'vong', lead: 96, pages: [
      ['ke', 'talk', 'Sáng ngày thứ tám, {name} đứng dậy, vai còn quấn băng, xuống suối gánh nước. Không phải để luyện công. Chỉ vì đó là việc nhỏ nhất có thể làm.'],
      ['moc', 'talk', 'Đệ đếm rồi: đây là chuyến nước thứ mười nghìn kể từ ngày {sh} lên núi. Mười nghìn lần, không lần nào giống lần nào, mà lần nào cũng xong.'],
      ['ke', 'zen', 'Trong đống tro võ đường, {y} nhặt được dải tua kiếm của Hàn Phong, thắt đúng ba nút. Vết kiếm trên vai cũng lạ: lệch khỏi tim đúng một đốt ngón tay. Kiếm của Hàn Phong chưa từng lệch.'],
      ['ke', 'moon', 'Đêm trăng non, Vô Vọng trở lại. Hắc Thủy dâng lên. Nhưng lần này {name} đứng giữa nước đen mà chân không run.'],
      ['vong', 'moon', 'Sao ngươi còn đứng được? Ta đã cho ngươi thấy cố gắng là vô nghĩa! Đến bạn ngươi cũng bỏ ngươi rồi!'],
      ['hero', 'martial', 'Có thể vô nghĩa với ngươi. Với tại hạ, chuyến nước hôm nay đã xong. Thế là đủ để làm thêm chuyến nữa.'],
      ['ke', 'taichi', 'Mộc kiếm Đòn Gánh vạch một vòng tròn trên mặt nước. Thủy Trung Nguyệt: Hắc Thủy lặng xuống, soi bóng vầng trăng non. Xích sắt của Vô Vọng gãy làm ba.'],
      ['ke', 'moon', 'Vô Vọng quỳ xuống. Từ bóng tối, một bàn tay áo trắng đặt lên đỉnh đầu hắn. Nội lực cả đời của thuộc hạ mạnh nhất bị hút cạn trong một hơi.'],
      ['giao', 'moon', 'Kẻ thua thì không còn dùng được. Tiểu {sd}, hẹn ngươi ở cấp tám mươi. Lúc ấy, ta sẽ đích thân đến.'],
      ['ke', 'zen', 'Giáo chủ biến mất. Vô Vọng thều thào trước khi lịm đi: "Hắn… không dừng ở chín mươi chín đâu. Còn thứ đứng sau lưng hắn… nó chẳng cần hắn thắng…"'],
    ], lesson: 'Sức mạnh thật không đến từ một ngày bùng nổ, mà từ việc cứ làm tiếp sau mỗi lần ngã. Chuyến nước thứ mười nghìn cũng chỉ là một chuyến.' },

    { lv: 80, title: 'Lần đầu giao thủ', foe: 'giao', lead: 97, pages: [
      ['ke', 'moon', 'Đêm rằm, trên đỉnh Vân Mộng, trăng nhuốm đỏ. Huyết Nguyệt Giáo chủ đứng trên ngọn tùng, áo trắng không vướng hạt bụi.'],
      ['giao', 'moon', 'Tiểu {sd}. Ta là Lệ Vô Khuyết, đại sư huynh của ngươi. Ta đã chờ ngươi gánh nước suốt tám mươi cấp. Cho ta xem ngươi gánh được những gì.'],
      ['ke', 'martial', 'Huyết Nguyệt Trảm rơi xuống như một mảnh trăng vỡ. {Name} đỡ bằng Đòn Gánh. Mộc kiếm rạn, cánh tay tê dại tới tận vai.'],
      ['ke', 'martial', 'Mười chiêu sau, {y} đã quỳ gối. Mỗi lần chạm tay, Thôn Nguyệt Quyết lại rút đi một phần nội lực. Giáo chủ cấp chín mươi bảy; {y} mới tám mươi.'],
      ['su', 'martial', 'Đủ rồi, Vô Khuyết! Muốn chạm vào nó, bước qua xác ta trước.'],
      ['ke', 'zen', 'Một chưởng của thầy, một chưởng của trò cũ. Khi bụi tan, sư phụ Tùng Hạc vẫn đứng, nhưng nội lực sáu mươi năm đã tán đi như khói.'],
      ['giao', 'moon', 'Sư phụ… người vẫn ngu ngốc như xưa. Vì một kẻ gánh nước mà bỏ cả đời tu vi. Người đã kể cho nó nghe về ba ngày ấy chưa?'],
      ['ke', 'moon', 'Tùng Hạc lặng im. Giáo chủ quay lưng bỏ đi. Không ai thấy, dưới tay áo trắng, những ngón tay hắn đang run.'],
      ['su', 'talk', 'Ta mất nội lực, nhưng vẫn gánh được nước. Còn nó, nó có hai tay mà chưa từng gánh được gì cho ai. Về ba ngày ấy… đợi ta đủ can đảm đã.'],
    ], lesson: 'Có những trận ta chưa đủ sức thắng. Thua để biết mình còn thiếu gì, rồi trở về luyện tiếp; người dạy ta đã trả giá để ta còn cơ hội ấy.' },

    { lv: 82, title: 'Mười tháng trên núi tuyết', lead: 98, pages: [
      ['thien', 'zen', 'Đưa đứa trẻ lên Tuyết Phong. Lần này không phải bảy mươi bảy ngày.'],
      ['thien', 'talk', 'Ngươi thua vì nhìn tay hắn. Tay hắn nhanh hơn. Lần này, hãy học nhìn tâm hắn.'],
      ['ke', 'taichi', 'Mỗi đêm, hồn Không Nguyệt dẫn hồn {name} rời thân, đi qua những nơi Huyết Nguyệt Giáo từng qua: trấn ngủ say, ba làng cháy, võ đường đổ nát.'],
      ['hero', 'zen', 'Tại hạ thấy những sợi chỉ đỏ nối từ từng người khổ đau về một phương. Mọi sợi chỉ đều dẫn về Huyết Nguyệt đài.'],
      ['thien', 'talk', 'Hắn không gom vàng, không gom đất. Hắn gom khổ đau của người khác. Vì sao, lão chưa được phép nói. Ngươi phải tự đến mà nhìn.'],
      ['ke', 'zen', 'Đêm cuối, {y} cúi nhìn xuống ngực mình và lạnh người: ở đó cũng có một sợi chỉ đỏ, mảnh hơn mọi sợi khác, buộc từ bao giờ không rõ. Không Nguyệt cũng nhìn thấy. Ông không nói gì.'],
      ['ke', 'zen', 'Mười tháng sau, {y} xuống núi. Mắt vẫn vậy, nhưng nhìn một người là thấy được nỗi sợ người ấy đang giấu, kể cả nỗi sợ của chính mình.'],
      ['ke', 'moon', 'Cùng mùa ấy, Giáo chủ bế quan trên Huyết Nguyệt đài, nuốt nội lực của ba môn phái. Cấp chín mươi tám. Cánh cửa phía trước vẫn đóng im lìm.'],
    ], lesson: 'Muốn giải một bài toán khó, đừng chỉ nhìn bề mặt. Hãy hiểu điều gì đang thật sự vận hành bên dưới.' },

    { lv: 84, title: 'Thanh Khê không ngủ', foe: 'giao', lead: 98, pages: [
      ['ke', 'moon', 'Huyết Nguyệt Giáo kéo quân về trấn Thanh Khê, nơi {name} từng đánh thức cả trấn. Giáo chủ muốn nuốt trọn nó trong một đêm.'],
      ['dan', 'talk', 'Chúng ta không biết võ. Nhưng {name} từng gõ chuông cho cả trấn tỉnh dậy. Đêm nay, cả trấn thức cùng {y}!'],
      ['ke', 'martial', 'Thợ rèn đúc giáo, bà bán bánh nấu cơm, trẻ con giữ đuốc. Tiểu Mộc chia việc trên bảng tre. Mỗi người làm đúng một việc nhỏ.'],
      ['ke', 'talk', 'Kế giữ trấn chỉ ba người biết: {name}, sư phụ và Tiểu Mộc. Vậy mà quân Huyết Nguyệt đánh thẳng vào cửa bắc, chỗ cố ý bỏ ngỏ làm bẫy, lại mang sẵn ván bắc qua hào.'],
      ['giao', 'moon', 'Một đám phàm nhân thì làm được gì? Thôn Nguyệt Quyết chỉ cần một hơi là hút sạch.'],
      ['ke', 'martial', 'Nhưng không ai sợ, không ai bỏ cuộc. Không có nỗi sợ để hút, Thôn Nguyệt Quyết chỉ hút được gió. Lần giao thủ thứ hai, {name} cầm cự trọn một canh giờ.'],
      ['ke', 'zen', 'Trời rạng đông, Giáo chủ rút lui. Hắn không thua, nhưng cũng chẳng thắng. Đó là lần đầu tiên kể từ ngày hắn rời núi.'],
      ['giao', 'moon', 'Thứ ngươi có… ta không hút được. Thú vị thật, tiểu {sd}. Mà này, ngươi nên đếm lại người nhà mình đi.'],
      ['hero', 'zen', 'Có người trong chúng ta đã nói ra kế giữ trấn. Tại hạ nhìn quanh những gương mặt thân quen, và lần đầu tiên không muốn nghĩ tiếp.'],
    ], lesson: 'Một tập thể mà mỗi người làm tròn một việc nhỏ sẽ mạnh hơn mọi cá nhân xuất chúng. Hãy chia việc rõ ràng để ai cũng biết mình góp phần ở đâu.' },

    { lv: 86, title: 'Đáy biển không trăng', lead: 99, pages: [
      ['hai', 'talk', '{Tt}! Đánh với kẻ hút nội lực mà đem nội lực ra đọ thì khác gì đổ nước vào thùng thủng. Theo ta xuống biển.'],
      ['ke', 'zen', 'Dưới đáy biển sâu trăm trượng, nơi trăng không soi tới, có một hang đá. Mạc Trấn Hải để {name} ngồi đó, mỗi ngày chỉ ngoi lên thở một lần.'],
      ['hai', 'martial', 'Dưới này không ai thấy ngươi luyện, không ai khen. Chỉ có ngươi với ngươi. Luyện được thế mới là luyện thật.'],
      ['ke', 'taichi', 'Chín tháng, {y} học cách giữ nội lực như biển giữ nước: không giữ chặt, mà để nó tuần hoàn. Rút đi một gáo, triều lại dâng một gáo.'],
      ['hai', 'talk', 'Đứa học trò cuối của ta là con trai ta, Mạc Vọng. Một cơn bão lấy hết bạn thuyền của nó. Nó bơi về, hỏi ta: "Cố gắng để làm gì, cha?" Rồi nó đi theo trăng máu.'],
      ['hero', 'zen', 'Tại hạ nhớ lại gã khổng lồ kéo xích đen, kẻ muốn cả thiên hạ tin rằng mọi cố gắng đều vô nghĩa. Thực Nguyệt Sứ Vô Vọng… chính là con của lão ngư.'],
      ['ke', 'martial', 'Ngày cuối, lão ngư tung một quyền chín mươi lăm cấp vào ngực {name}. Lực quyền tan vào người {y} như sóng tan vào biển.'],
      ['hai', 'talk', 'Được rồi! Giờ hắn có hút, ngươi cũng chẳng cạn. Ta dạy ngươi không phải để thắng con ta. Ta dạy để lần sau gặp nó, ngươi đừng buông cho nó chìm.'],
      ['ke', 'moon', 'Cùng lúc ấy, Giáo chủ chạm cấp chín mươi chín. Rồi đứng yên trước một cánh cửa không chịu mở.'],
    ], lesson: 'Những tiến bộ lớn nhất thường diễn ra lúc không ai nhìn thấy. Hãy tiếp tục cả khi không ai khen, vì đó mới là luyện thật.' },

    { lv: 88, title: 'Vết nứt trên mặt nạ', foe: 'giao', lead: 99, pages: [
      ['ke', 'zen', 'Lần giao thủ thứ ba diễn ra giữa sông Lạc Nhạn. Giáo chủ đứng trên mặt nước, {name} đứng trên một con thuyền nhỏ.'],
      ['giao', 'moon', 'Ngươi đã khác. Thôn Nguyệt Quyết hút vào ngươi như hút vào biển. Nhưng biển cũng có đáy, tiểu {sd}.'],
      ['ke', 'martial', 'Trăm chiêu qua lại. Huyết Nguyệt Trảm chém vỡ mũi thuyền. Đòn Gánh đâm thẳng vào giữa vầng trăng khuyết bạc.'],
      ['ke', 'moon', 'Một tiếng "tách". Mặt nạ nứt một đường. Phía sau là một gương mặt già nua đến kinh người: da khô như vỏ cây, mắt trũng như giếng cạn.'],
      ['hero', 'talk', 'Đại sư huynh… huynh đâu hơn tại hạ bao nhiêu tuổi. Sao lại già đến thế?'],
      ['giao', 'moon', 'Mỗi phần nội lực hút được đều phải trả bằng một phần thọ mệnh. Ta không có thời gian, tiểu {sd}. Ta chưa bao giờ có.'],
      ['ke', 'moon', 'Rồi mắt hắn dừng ở đầu mộc kiếm, nơi có vết khấc nhỏ như móng tay. Lần đầu tiên, Huyết Nguyệt Giáo chủ lùi một bước mà không phải vì trúng đòn.'],
      ['giao', 'moon', 'Thanh gỗ ấy… ai đưa cho ngươi? Về hỏi sư phụ đi. Hỏi luôn xem ba ngày ấy người ở đâu, lúc mẹ ta nằm bên bờ ruộng.'],
      ['ke', 'zen', 'Hắn lùi vào sương. Đêm ấy {name} leo lên am. Sư phụ ngồi chờ sẵn, như đã chờ câu hỏi này suốt hai mươi năm.'],
      ['su', 'zen', 'Năm ấy ta ngang qua Lệ thôn, lưng đeo bầu nước, vội tới một hội kiếm. Một người đàn bà gầy xin ta dừng lại. Ta bảo: "Xong việc ta sẽ quay lại." Ta quay lại muộn ba ngày.'],
      ['su', 'talk', 'Chiếc đòn gánh ấy là của bà. Ta dạy các ngươi biết dừng lại vì người khác, bởi chính ta đã không dừng. Ngươi có quyền khinh ta.'],
      ['hero', 'zen', 'Tại hạ không khinh. Nhưng đêm ấy tại hạ không ngủ: người dạy mình điều đúng lại từng làm sai chính điều ấy. Còn kẻ thù mạnh nhất giang hồ thì đang chạy đua với tuổi già của hắn.'],
    ], lesson: 'Người vội vã nhất thường là người sợ hãi nhất, và việc "để sau" có khi không còn sau nữa. Hiểu nỗi sợ và món nợ phía sau một hành động giúp ta đối đầu mà không thù hận.' },

    { lv: 90, title: 'Võ lâm hội tụ', foe: 'giao', lead: 99, pages: [
      ['ke', 'talk', 'Tin {name} làm Giáo chủ bị thương lan khắp giang hồ. Lần đầu tiên sau hai mươi năm, các môn phái cùng kéo về chân núi Vân Mộng.'],
      ['suong', 'talk', 'Ngươi dạy ta rằng không cần một mình. Lần này, Lãnh Tịch ta bỏ Huyết Nguyệt Giáo, mang mười hai đệ tử đến, để không ai phải một mình.'],
      ['ke', 'moon', 'Huyết Nguyệt Giáo vây núi. Giáo chủ ngồi trên kiệu đỏ, tay không động, mà nghìn người ngã quỵ vì Thôn Nguyệt Quyết. Dẫn đầu tiền quân là một kiếm khách áo đen viền đỏ.'],
      ['phong', 'moon', 'Nguyệt Sứ thứ mười một, Hàn Phong, phụng mệnh Giáo chủ. {Name}, ra đây. Món nợ cầu Lạc Nhạn, hôm nay tính cho xong.'],
      ['ke', 'martial', 'Hai người giao đấu giữa hai trận tuyến. Kiếm Hàn Phong nhanh gấp ba ngày trước, nhưng tóc hắn đã điểm bạc: mười năm nội lực vay trong một đêm đang đòi lãi.'],
      ['ke', 'taichi', '{Name} không trả đòn hiểm nào. Nội lực như biển, tâm như tuyết đỉnh. Đòn Gánh vạch một vòng tròn: nghìn người phía sau được che trong ánh trăng bạc.'],
      ['ke', 'moon', 'Mũi kiếm Hàn Phong dừng sát cổ {name}. Hắn ghé tai, nói rất khẽ: "Canh ba. Cầu Lạc Nhạn. Đi một mình." Rồi hắn thu kiếm, hô quân lui ba dặm.'],
      ['ke', 'zen', 'Đêm ấy, {name} phá ải cấp chín mươi, bước vào Võ lâm chí tôn. Trên kiệu đỏ, Giáo chủ vẫn ở cấp chín mươi chín. Còn {y} nhìn dải tua kiếm ba nút trong tay, không biết nên tin điều gì.'],
    ], lesson: 'Khi ta kiên trì đủ lâu, người khác sẽ tự tìm đến đứng cùng. Hãy để việc làm nói thay lời kêu gọi, và đừng vội kết luận về một người khi chưa nghe hết.' },

    { lv: 91, title: 'Mặt thứ một nghìn lẻ một', foe: 'dien', lead: 99, pages: [
      ['ke', 'zen', 'Canh ba, cầu Lạc Nhạn. Hàn Phong ngồi trên thành cầu, cởi áo viền đỏ. Trên ngực hắn có một ấn trăng khuyết đỏ như than.'],
      ['phong', 'talk', 'Nhát kiếm ở võ đường là kế của sư phụ ngươi và ta: phải có người vào được Huyết Nguyệt đài. Ta đâm lệch khỏi tim ngươi đúng một đốt ngón tay. Ba nút: còn nợ, sẽ trả.'],
      ['phong', 'talk', 'Ai vào giáo cũng bị đóng ấn này. Giáo chủ chết thì kẻ mang ấn chết theo: ba nghìn giáo chúng, mười Nguyệt Sứ, và ta. Ngươi không được giết hắn.'],
      ['phong', 'martial', 'Còn một việc. Trong võ đường của ngươi có kẻ không phải người của ngươi. Hắn ở đó từ mùa băng tan. Kế giữ Thanh Khê là hắn báo. Đêm nay hắn nhận lệnh giết ngươi.'],
      ['ke', 'moon', '{Name} lao về võ đường. Mọi vò nước đã bị bỏ thuốc mê. Bên giường sư phụ, một bóng người nhỏ bé cầm dao găm đứng im rất lâu. Đó là Tiểu Mộc.'],
      ['ke', 'moon', 'Con dao rơi xuống đất. "Tiểu Mộc" đưa tay lên mặt, lột ra một lớp da mỏng. Bên dưới là gương mặt không có nét gì để nhớ của Huyễn Nguyệt Sứ Thiên Diện.'],
      ['dien', 'moon', 'Ta thế chỗ thằng bé từ mùa băng tan. Ta đọc sổ của nó để đếm tiếp từng chuyến nước cho giống. Đếm mãi, ta lại muốn biết con số kế tiếp.'],
      ['dien', 'moon', 'Ta đã mang nghìn khuôn mặt. Chỉ có vai này, kẻ tin vào từng chuyến nước, ta đóng lâu đến mức tin thật. Giết ta đi. Hoặc cho ta giữ khuôn mặt này thêm một ngày.'],
      ['hero', 'zen', 'Người dựng lại tấm bảng sau đêm nguyệt thực là hắn. Người đếm chuyến nước thứ mười nghìn cũng là hắn. Tại hạ chỉ hỏi điều còn quan trọng: Tiểu Mộc thật đang ở đâu?'],
      ['dien', 'moon', 'Trong ngục đá dưới Huyết Nguyệt đài. Nó còn sống. Giáo chủ giữ lại vì nó là đứa duy nhất trong ngục không sợ hắn. Ta biết đường. Ta sẽ dẫn.'],
    ], lesson: 'Vai ta đóng mỗi ngày rồi sẽ thành con người ta. Hãy chọn thói quen như chọn người mình muốn trở thành: lặp lại đủ lâu thì giả cũng hóa thật.' },

    { lv: 92, title: 'Ngục dưới trăng', lead: 99, pages: [
      ['ke', 'moon', 'Thiên Diện mang gương mặt Huyết Nguyệt Giáo chủ, đi thẳng qua ba lớp cổng. Lính gác quỳ rạp. {Name} và Hàn Phong cúi đầu theo sau như hai tên hầu.'],
      ['ke', 'zen', 'Ngục đá sâu chín tầng. Ở tầng cuối, {name} sững lại: trên vách có ba cột vạch bằng đá nhọn. Chưa làm. Đang làm. Đã xong. Cột cuối kín đặc những vạch.'],
      ['moc', 'talk', '{Sh} đến rồi à? Đệ biết {sh} sẽ đến, nên đệ chỉ lo phần của đệ thôi: mỗi ngày đào một thìa đất. Đường hầm còn thiếu ba thước nữa.'],
      ['ke', 'talk', 'Tiểu Mộc thật đã cao hơn một cái đầu, gầy rộc, nhưng vẫn cười hì hì. Quanh cậu là hai trăm tù nhân, mỗi người một việc ghi trên vách: người đào, người chuyển đất, người canh, người kể chuyện.'],
      ['moc', 'talk', 'Trong này ai tuyệt vọng thì chết trước. Nên đệ chia việc. Có việc để làm xong mỗi ngày thì người ta còn muốn sống tới ngày mai.'],
      ['ke', 'martial', 'Ba người cùng đào nốt ba thước cuối. Thiên Diện đứng chắn cửa ngục, lần lượt mang mặt từng viên quản ngục để đuổi lính tuần đi nơi khác.'],
      ['ke', 'moon', 'Cuối tầng chín còn một gian thạch thất khóa kín. Bên trong có mười chiếc ghế đá khắc tên mười Nguyệt Sứ, và chiếc thứ mười một. Hàn Phong tưởng ghế ấy dành cho mình.'],
      ['ke', 'moon', 'Nhưng tên khắc trên ghế là {name}. Nét khắc đã mòn, rêu phủ kín: chiếc ghế được tạc từ rất lâu, trước cả ngày {y} lên núi gánh nước.'],
      ['hero', 'zen', 'Có kẻ đã chờ tại hạ từ khi tại hạ chưa biết cầm kiếm. Không phải chờ để giết. Người ta không tạc ghế cho kẻ mình định giết.'],
      ['ke', 'zen', 'Hai trăm người chui qua đường hầm ra tới bờ sông trước khi trăng lặn. Tiểu Mộc đi sau cùng, ngoái nhìn kẻ từng mang gương mặt mình: "Ngươi đếm thay ta à? Đếm có đúng không đấy?"'],
    ], lesson: 'Khi việc quá lớn và chưa thấy ngày ra, hãy chia nó thành phần nhỏ làm được hôm nay, cho mình và cho cả nhóm. Có việc để làm xong mỗi ngày là có lý do để tiếp tục.' },

    { lv: 93, title: 'Hồn du về Lệ thôn', lead: 99, pages: [
      ['thien', 'zen', 'Ngươi muốn biết vì sao hắn gom khổ đau, và vì sao có kẻ tạc ghế chờ ngươi? Nắm tay lão. Lão sẽ đưa hồn ngươi về Lệ thôn, mùa hạn năm ấy.'],
      ['ke', 'zen', 'Ruộng nứt nẻ. Một người đàn bà gầy guộc ngày ngày gánh nước từ con suối cạn về tưới mấy luống mạ. Trên vai bà là chiếc đòn gánh có vết khấc nhỏ như móng tay.'],
      ['me', 'talk', 'Một gáo thôi con. Mỗi ngày một gáo, ruộng sẽ xanh.'],
      ['ke', 'talk', 'Cậu bé lên mười lon ton theo sau, ôm cái gáo gỗ nhỏ. Một sáng, bên bờ suối cạn có tiếng khóc: người chạy hạn bỏ lại một chiếc giỏ, trong giỏ là một đứa bé còn đỏ hỏn.'],
      ['ke', 'zen', 'Người đàn bà bế đứa bé về. Từ hôm ấy, bát cháo loãng chia làm ba, rồi phần của bà nhỏ dần. Bà sai con trai lên trấn xin gạo. Cậu đi ba ngày.'],
      ['ke', 'talk', 'Ngày thứ nhất, một kiếm khách trẻ áo xám đi ngang, lưng đeo bầu nước. Bà xin chàng dừng lại. Chàng hứa xong việc sẽ quay về. {Name} nhận ra dáng người ấy: sư phụ Tùng Hạc.'],
      ['ke', 'zen', 'Ngày thứ hai, bà đặt đứa bé vào giỏ, lót thêm cái gáo gỗ của con trai, gửi theo một gánh hàng trà xuôi về phương nam. Người bán trà còn trẻ, nhưng {name} nhận ra giọng nói ấy: Bà Tư.'],
      ['hero', 'zen', 'Cái gáo sứt quai bên hông tại hạ. Chiếc giỏ trước cửa quán trà. Đứa bé ấy… là tại hạ. Bà đã nhịn phần cháo của mình để tại hạ được sống.'],
      ['ke', 'moon', 'Ngày thứ ba, người mẹ ngã xuống bên đòn gánh. Cậu bé về tới nơi với nửa bao gạo, ngồi cạnh mẹ dưới vầng trăng đỏ như máu. Không ai kể cho cậu nghe về chiếc giỏ.'],
      ['trang', 'moon', 'Chăm chỉ là lời dối trá của kẻ yếu, bé con ạ. Mẹ ngươi gánh nước cả đời, và ruộng có xanh đâu? Lớn lên, hãy tìm ta.'],
      ['ke', 'moon', '{Name} ngẩng lên. Trên trời Lệ thôn, những đám mây mưa đang bị hút về phía vầng trăng đỏ, từng đám một. Mùa hạn ấy không phải của trời.'],
      ['thien', 'talk', 'Ruộng không xanh, nhưng có một đứa trẻ đã sống. Hắn chưa từng biết điều đó. Kẻ thì thầm bên tai hắn bao năm sẽ không bao giờ để hắn biết.'],
    ], lesson: 'Công sức ta bỏ ra có thể nở hoa ở nơi ta không bao giờ nhìn thấy. Đừng đo việc mình làm chỉ bằng kết quả trước mắt.' },

    { lv: 94, title: 'Gánh nước cho mẹ ta', foe: 'giao', lead: 99, pages: [
      ['ke', 'moon', '{Name} tỉnh dậy trên Tuyết Phong thì nghe tin dữ: Giáo chủ đã đích thân tới am Tùng Hạc trong đêm và mang sư phụ đi. Cùng lúc, ba nghìn quân Huyết Nguyệt tiến về Vân Mộng.'],
      ['ke', 'talk', 'Các chưởng môn đòi {y} ở lại giữ núi. Một người đổi lấy cả ngọn núi, ai cũng thấy phép tính ấy. {Y} nhìn tấm bảng tre rất lâu.'],
      ['hero', 'talk', 'Giữ núi là việc giao được. Tiểu Mộc chia việc, Lãnh Tịch giữ đèo, Hàn Phong báo đường tiến quân. Còn việc kia thì không ai làm thay tại hạ được.'],
      ['dien', 'talk', 'Vậy đêm nay ta mang mặt ngươi đứng trên tường lũy. Quân Huyết Nguyệt thấy ngươi còn đó thì chưa dám đánh. Đi đi. Khuôn mặt này, ta sẽ không làm xấu.'],
      ['ke', 'moon', 'Lệ thôn chỉ còn nền nhà và ruộng nứt. Dưới trăng đỏ, sư phụ Tùng Hạc, không còn chút nội lực, đang gánh nước từ con suối cạn lên ruộng. Vai ông đã bật máu.'],
      ['giao', 'moon', 'Người dạy ta gánh nước. Vậy gánh đi. Gánh tới khi ruộng mẹ ta xanh. Ba ngày người nợ bà, hôm nay trả bằng ba vạn chuyến.'],
      ['ke', 'taichi', '{Name} không rút kiếm. {Y} nhặt đôi thùng thứ hai, bước xuống suối, rồi đi bên cạnh sư phụ. Một chuyến. Mười chuyến. Trăm chuyến. Giáo chủ đứng nhìn suốt đêm.'],
      ['hero', 'talk', 'Đại sư huynh. Bên bờ suối này, năm ấy, có một chiếc giỏ. Mẹ huynh chia cháo cho đứa bé trong giỏ, rồi gửi nó theo gánh hàng trà. Đây là cái gáo bà lót trong giỏ.'],
      ['ke', 'moon', 'Giáo chủ nhìn cái gáo sứt quai. Chính tay hắn đã làm sứt nó năm lên tám. Chiếc mặt nạ trăng khuyết rơi xuống đất. "Mẹ… đã cứu được một người sao?"'],
      ['ke', 'moon', 'Đúng lúc ấy, một tiếng sáo xương cất lên từ bóng tối. Lưng Giáo chủ cứng lại. Khi hắn ngẩng đầu, đôi mắt đã thành hai vầng trăng đỏ, và giọng nói không còn là của hắn.'],
      ['trang', 'moon', 'Đủ rồi, Vô Khuyết. Ngươi đã làm xong phần việc của ngươi. Từ đây, thân xác này để ta dùng.'],
      ['giao', 'moon', 'Chạy đi… tiểu {sd}… Mang sư phụ… chạy đi!'],
    ], lesson: 'Có việc phải giao cho người khác thì mới đến được việc chỉ mình làm nổi. Hãy phân biệt hai loại việc ấy, và tự mình có mặt ở nơi không ai thay được.' },

    { lv: 95, title: 'Hai vị chín mươi lăm', foe: 'giao', lead: 99, pages: [
      ['ke', 'moon', 'Kẻ mang thân xác Giáo chủ không về Huyết Nguyệt đài. Nó đi thẳng lên Tuyết Phong, nơi {name} đưa sư phụ về dưỡng thương. Nó đi một mình. Nó không cần quân nữa.'],
      ['hai', 'martial', 'Lão già này còn chút nội lực, đủ chặn nó một canh giờ! {Tt}, đưa sư phụ ngươi xuống núi!'],
      ['ke', 'martial', 'Một võ sư nội lực chín mươi lăm, một thiền sư tinh thần chín mươi lăm. Mạc Trấn Hải vung quyền, núi tuyết rung chuyển. Hồn Không Nguyệt tỏa ra như ánh trăng phủ kín ngọn núi.'],
      ['ke', 'moon', 'Giữa trận, một lão già lưng còng lê bước lên dốc: Vô Vọng, kẻ đã bị hút cạn nội lực. Hắn đến để nói điều hắn biết. Con mắt đỏ quay về phía hắn trước tiên.'],
      ['trang', 'moon', 'Kẻ biết chuyện thì không nên còn lưỡi. Huyết Nguyệt Thôn Thiên!'],
      ['ke', 'martial', 'Cả bầu trời bị hút về một điểm. Mạc Trấn Hải bước vào giữa điểm ấy, chắn trước đứa con trai. Lão đứng như đứng trước biển: dồn tới, rút về, dồn tới.'],
      ['hai', 'talk', 'Vọng à. Ngày ấy con hỏi cố gắng để làm gì. Cha vụng, không biết trả lời. Giờ thì con nhìn đi.'],
      ['ke', 'zen', 'Một canh giờ. Đủ để mọi người xuống núi. Khi cơn hút tan, lão ngư vẫn đứng, hai chân cắm vào đá, mặt hướng ra biển. Lão không còn thở nữa.'],
      ['vong', 'talk', 'Cha… Hóa ra vẫn còn một việc đáng làm.'],
      ['ke', 'zen', 'Trăng trên Tuyết Phong mờ hẳn: Không Nguyệt đã che núi quá lâu. Đêm ấy, giữa tang tóc, {name} vượt cấp chín mươi lăm, Siêu Phàm Nhập Thánh. Trong mơ, con mắt đỏ nhìn thẳng vào {y}: "Cuối cùng ngươi cũng đủ lớn."'],
    ], lesson: 'Người dẫn đường giỏi không đi thay ta, mà giữ cho ta chỗ đứng để tự bước. Hãy biết ơn họ bằng cách đi tiếp, và trả lời câu hỏi "để làm gì" bằng chính việc mình làm.' },

    { lv: 96, title: 'Sự thật dưới trăng máu', foe: 'vong', lead: 99, pages: [
      ['ke', 'zen', 'Sau tang lễ trên đảo Thiết Thạch, Vô Vọng ngồi vá tấm lưới của cha, vá cả cái nút vụng về năm xưa. Rồi hắn kể.'],
      ['vong', 'moon', 'Thứ trong trăng máu tên là Vô Yểm Tà Thần, vị thần không bao giờ no. Nó từng có thần vị trên trời rồi bị đày xuống. Nó muốn quay về, nhưng tự nó không mở được cánh cửa.'],
      ['vong', 'moon', 'Cánh cửa từ chín mươi chín lên một trăm chỉ mở cho kẻ đi lên từng bước, lòng không khuyết. Giáo chủ sẽ không bao giờ mở được. Tà thần biết thế ngay từ đầu.'],
      ['hero', 'zen', 'Vậy nó nuôi huynh ấy hai mươi năm để làm gì?'],
      ['vong', 'moon', 'Để mài ngươi. Mười Nguyệt Sứ là mười phiến đá mài. Mỗi lần ngươi thắng chúng ta, nó mừng hơn cả khi chúng ta thắng. Chiếc ghế thứ mười một tạc cho ngươi: kẻ sẽ mở cửa thay nó.'],
      ['vong', 'moon', 'Nó chỉ sợ một thứ: chiếc đòn gánh của người mẹ. Nó sai người lục tìm suốt hai mươi năm, giấu cả Giáo chủ. Thanh gỗ ấy là bằng chứng rằng bà đã không thua.'],
      ['ke', 'moon', 'Sợi chỉ đỏ trên ngực {name} siết lại. Nó được buộc từ đêm ở Lệ thôn, vào đúng chỗ trống {y} chưa từng lấp: nỗi không biết mình từ đâu tới, và món nợ với một người đã chết vì mình.'],
      ['than', 'moon', 'Cứ gánh nước đi, đứa trẻ trong giỏ. Mỗi chuyến của ngươi là một bậc thang của ta. Ngày ngươi qua cửa, ta bước theo. Còn nếu ngươi dừng, ta ăn dần thế gian này bằng thân xác sư huynh ngươi.'],
      ['hero', 'zen', 'Điều tại hạ tin nhất, mỗi ngày một chuyến, hóa ra đang xây thang cho kẻ thù. Sáng hôm sau, lần đầu tiên kể từ ngày lên núi, tại hạ không xuống suối.'],
      ['moc', 'talk', '{Sh} nghỉ gánh thì nó thắng kiểu khác thôi. Bảng của mình chưa bao giờ sai vì làm đều. Mình chỉ cần sửa lại dòng trên cùng: làm những việc này để đi tới đâu.'],
    ], lesson: 'Thói quen tốt cũng cần biết mình đang phục vụ điều gì. Đừng chỉ hỏi "hôm nay làm được bao nhiêu"; thỉnh thoảng hãy hỏi "những việc này đang đưa mình tới đâu".' },

    { lv: 97, title: 'Sứ giả áo bạc', lead: 99, pages: [
      ['ke', 'zen', 'Đêm ấy không có trăng. Một người áo bạc bước xuống từ khoảng trời trống, tay cầm thước ngọc. Tuyết không lún dưới chân, cỏ không rạp dưới gót: ông không thuộc về cõi này.'],
      ['hinh', 'talk', 'Ta là Thiên Hình, một trong ba mươi sáu Thiên Cang tinh, giữ phép cho Thần giới. Trên chúng ta có mười hai Phương thần và năm Thần Vương. Không thừa một ngôi, không thiếu một ngôi.'],
      ['hinh', 'talk', 'Vô Yểm từng là một Phương thần. Nó nuốt đồng liêu để ép Thần giới mở thêm ngôi Thần Vương thứ sáu. Thần vị không mở thêm được, chỉ kế thừa. Nó bị đày xuống cõi này.'],
      ['hinh', 'zen', 'Năm Thần Vương đã phán: tới kỳ nguyệt thực, Thiên Môn của cõi người sẽ bị niêm lại vĩnh viễn. Không ai từ đây lên được nữa. Còn nó thì ở lại với các ngươi.'],
      ['hero', 'martial', 'Các vị bỏ cả một cõi người cho nó ăn, để Thần giới được yên?'],
      ['hinh', 'talk', 'Phép là phép. Nhưng phép có một khe hở: trước nguyệt thực, nếu có người phàm tự mở Thiên Môn mà không mang nó theo, cửa sẽ không bị niêm. Nguyệt thực còn cách ba mùa trăng.'],
      ['ke', 'zen', 'Thước ngọc chỉ về phía Không Nguyệt. Vị sư già cúi đầu. Ông không phải người: ông là Hằng Nguyệt tinh quân, một trong ba mươi sáu Thiên Cang, đã giúp người phàm quá số lần phép cho.'],
      ['thien', 'talk', 'Lão giữ ngôi này lâu lắm rồi, chỉ mong tìm được người kế thừa để đi ngao du vũ trụ. Nhớ lấy: sợi chỉ trên ngực ngươi không cắt bằng kiếm được. Nó buộc bằng gì thì gỡ bằng thứ ấy.'],
      ['ke', 'moon', 'Thiên Hình mang Không Nguyệt đi. Phía chân trời, vầng trăng đỏ mở to như một con mắt vừa nghe hết mọi chuyện. Và nó cười.'],
    ], lesson: 'Hạn chót và luật lệ không phải kẻ thù. Hãy hỏi cho rõ điều kiện, rồi tìm lối đi nằm trong chính điều kiện ấy thay vì than nó bất công.' },

    { lv: 97.5, title: 'Mười một chiếc ghế', lead: 99, pages: [
      ['ke', 'talk', '{Name} trở lại gian thạch thất dưới Huyết Nguyệt đài, giờ đã bỏ hoang. Mười chiếc ghế đá. {Y} quyết định đi tìm từng người từng ngồi trên đó.'],
      ['ke', 'talk', 'Miên Hồ đang ngủ dưới gốc đa. Lôi Tốc chạy quanh một bãi đất trống. Bách Tý ôm chín món binh khí mà không dám đặt món nào xuống. Trên ngực ai cũng có ấn trăng khuyết.'],
      ['ngoc', 'talk', 'Ta vá lại giáp lưu ly từ những mảnh vỡ. Xấu lắm. Nhưng mặc được. Lạ thay, từ hôm mặc tấm giáp vá này, ấn trên ngực ta mờ dần.'],
      ['hero', 'zen', 'Tại hạ nhìn bằng con mắt học trên Tuyết Phong. Sợi chỉ đỏ của nàng không buộc vào Giáo chủ. Nó buộc vào nỗi sợ không hoàn hảo. Nàng hết sợ, sợi chỉ tự tuột.'],
      ['phong', 'talk', 'Vậy ấn này không buộc mạng ta vào hắn. Nó buộc ta vào cái thói muốn nhanh hơn người khác. Bấy nhiêu năm, ta bị lừa bởi chính mình.'],
      ['ke', 'martial', 'Từng người một. Miên Hồ dậy gõ chuông trấn mỗi sớm. Lôi Tốc tập đứng yên một nén nhang. Bách Tý đặt xuống tám món, giữ một. Khô Vinh ngủ trọn một đêm. Ảnh Song úp tấm gương xuống bàn.'],
      ['ke', 'moon', 'Chỉ một kẻ không tới: Khúc U. Khi {name} tìm thấy hắn trên Huyết Nguyệt đài, ống sáo xương đang tự thổi. Dưới áo choàng không có ai cả. Hắn chưa bao giờ là người.'],
      ['than', 'moon', 'Một đốt ngón tay của ta thôi. Ta để nó thổi bên tai Vô Khuyết mỗi đêm suốt hai mươi năm. Ngươi gỡ được chín sợi chỉ của chúng. Còn sợi trên ngực ngươi, ngươi gỡ nổi không?'],
      ['hero', 'zen', 'Chín người từng là kẻ thù giờ ngồi quanh tấm bảng tre. Tại hạ ghi lên dòng đầu tiên việc khó nhất: gỡ sợi chỉ của chính mình, trước nguyệt thực.'],
    ], lesson: 'Mỗi thói xấu là một sợi dây ta tự buộc vào mình. Không ai cắt giúp được; nhưng đổi một hành động nhỏ mỗi ngày thì nút thắt tự lỏng dần.' },

    { lv: 98, title: 'Trăng không lặn', lead: 99, pages: [
      ['ke', 'moon', 'Vầng trăng đỏ thôi không lặn nữa. Ngày không tới. Lúa trổ bông lép, giếng cạn dần, mây mưa bị hút về trời tây. Tà thần đang làm lại mùa hạn Lệ thôn, lần này cho cả thiên hạ.'],
      ['than', 'moon', 'Ta không cần đánh ngươi. Ngươi sẽ tự mở cửa cho ta, vì ngươi không chịu nổi cảnh chúng đói. Người đàn bà nuôi ngươi ba ngày cũng đã không chịu nổi.'],
      ['ke', 'talk', '{Name} không lên đỉnh quyết chiến. {Y} xuống ruộng. Tiểu Mộc dựng bảng tre ở từng làng. Hàn Phong, Lãnh Tịch, chín Nguyệt Sứ cũ, mỗi người nhận một con mương.'],
      ['ke', 'martial', 'Mười vạn người xếp thành hàng từ sông lên ruộng, chuyền tay nhau từng thùng nước. Ban ngày tưới được một sào, đêm trăng đỏ hút khô một sào.'],
      ['dan', 'talk', 'Tưới thế này thì tới bao giờ? Trăng kia đâu có mệt! Hay là để {name} mở cái cửa ấy cho xong, sống được ngày nào hay ngày ấy!'],
      ['hero', 'zen', 'Tại hạ không trách họ. Tại hạ đang đứng đúng chỗ bà đã đứng: gánh nước vào một thửa ruộng không chịu xanh, trong khi có kẻ thì thầm rằng mọi thứ là vô ích.'],
      ['moc', 'talk', 'Đệ không ghi "ruộng xanh" lên bảng nữa. Việc ấy mình không quyết được. Đệ ghi: hôm nay chuyền đủ ba nghìn thùng. Việc ấy thì làm xong được.'],
      ['ke', 'zen', 'Ngày thứ bốn mươi, ruộng vẫn nứt. Nhưng cột "Đã xong" ở mỗi làng đã dài quá tầm tay với, và chưa ai bỏ hàng.'],
    ], lesson: 'Khi kết quả chưa nằm trong tay mình, hãy đặt mục tiêu vào phần mình quyết được: số việc làm xong hôm nay. Tiến độ đo bằng hành động thì không ai lấy mất được.' },

    { lv: 98.3, title: 'Ruộng không xanh', lead: 99, pages: [
      ['ke', 'moon', 'Tháng thứ ba. Người bỏ hàng ngày một nhiều. Kẻ thì thầm trong trăng không cần nói dối: nó chỉ đọc to con số. Chín mươi ngày, mười vạn người, không một ngọn mạ.'],
      ['ke', 'talk', 'Hàn Phong gục xuống giữa mương. Tóc hắn bạc trắng chỉ sau một đêm: mười năm nội lực vay của Giáo chủ đã tới hạn đòi, đúng lúc mọi người cần hắn nhất.'],
      ['phong', 'talk', 'Đi nhanh mười năm, rồi trả lại hai mươi. Tính ra ta còn chậm hơn ngươi, đồ gánh nước. Đừng đỡ ta. Đưa ta cái thùng. Ta chuyền được.'],
      ['ke', 'zen', 'Sư phụ Tùng Hạc ngày nào cũng ra ruộng, dù tay đã run. Ông không chuyền theo hàng. Ông gánh riêng, tới đúng thửa ruộng xa nhất, nơi chưa ai kịp tới.'],
      ['su', 'talk', 'Năm ấy ta đến muộn ba ngày. Lần này ta muốn đến trước. Đừng cản ta, {name}. Còn Vô Khuyết… nếu được, hãy gánh cả nó về.'],
      ['ke', 'zen', 'Chiều hôm ấy, người ta thấy ông ngồi tựa bờ ruộng xa, đôi thùng đã cạn, đòn gánh đặt ngang gối. Ông đi nhẹ như người chợp mắt sau một buổi làm xong việc.'],
      ['ke', 'moon', 'Đêm ấy trăng đỏ sáng rực hơn bao giờ hết, chờ một dòng tuyệt vọng thật lớn. {Name} quỳ bên thầy, không khóc được. Sợi chỉ trên ngực {y} siết tới tận tim.'],
      ['ke', 'taichi', 'Sáng ra, Tiểu Mộc là người thấy trước. Chỗ thùng nước cuối cùng của sư phụ đổ xuống, giữa kẽ đất nứt, có một ngọn mạ. Chỉ một ngọn. Xanh.'],
    ], lesson: 'Phần lớn nỗ lực đều có một quãng dài chưa thấy gì. Người bỏ cuộc thường bỏ ngay trước khi mầm đầu tiên nhú lên. Hãy làm cho xong phần của hôm nay.' },

    { lv: 98.7, title: 'Mầm xanh dưới trăng đỏ', lead: 99, pages: [
      ['ke', 'talk', 'Tin về một ngọn mạ chạy dọc mười vạn người nhanh hơn ngựa. Người đã bỏ hàng quay lại. Bà Tư gánh trà ra tận ruộng. Lũ trẻ đặt tên cho ngọn mạ là "Thầy".'],
      ['ke', 'martial', 'Mười ngày sau là một vạt. Một tháng sau, cả cánh đồng dưới chân Vân Mộng lên màu. Nước do người mang tới đã nhiều hơn nước vầng trăng kịp hút.'],
      ['ke', 'moon', 'Dòng khí đỏ chảy về trăng máu mỏng dần rồi đứt hẳn. Không còn tuyệt vọng để ăn, con mắt đỏ lần đầu lộ vẻ đói. Nó đổi cách.'],
      ['than', 'moon', 'Ngươi muốn gặp sư huynh ngươi không? Nhìn đi.'],
      ['ke', 'moon', 'Trong con ngươi đỏ hiện ra một thửa ruộng nứt vô tận. Giữa ruộng, một cậu bé lên mười ngồi bó gối bên người mẹ đã lạnh. Lệ Vô Khuyết vẫn ở trong thân xác ấy, bị nhốt lại đúng cái đêm năm xưa.'],
      ['than', 'moon', 'Mở cửa ngay đêm nay, ta thả nó ra. Một cánh cửa đổi một người anh. Ngươi nợ mẹ nó một mạng, nhớ không?'],
      ['be', 'moon', 'Đừng… mở… tiểu {sd}. Ta thấy ruộng… của các ngươi rồi. Xanh thật… phải không?'],
      ['hero', 'martial', 'Xanh thật, đại sư huynh. Tại hạ sẽ không mở cửa cho nó. Tại hạ sẽ vào tận trong đó mà gánh huynh ra.'],
    ], lesson: 'Một kết quả nhỏ nhìn thấy được đáng giá hơn mười lời động viên. Hãy tìm và chỉ cho cả nhóm thấy ngọn mạ đầu tiên; nó kéo người ta quay lại hàng.' },

    { lv: 99, title: 'Đại chiến Vân Mộng', foe: 'giao', lead: 99, pages: [
      ['ke', 'moon', 'Đêm rằm. Hai vầng trăng hiện trên đỉnh Vân Mộng: một bạc như nước, một đỏ như máu. Giữa hai vầng trăng, một cánh cổng đá mờ dần hiện ra, trên có mười ổ khóa: Thiên Môn.'],
      ['than', 'moon', 'Chín mươi chín cấp. Ngươi đã tới đúng nơi ta cần ngươi tới. Giờ thì mở ra, hoặc nhìn ta dùng thân xác này giết từng đứa ngươi thương.'],
      ['ke', 'martial', 'Huyết Nguyệt Thôn Thiên! Cả bầu trời đỏ rực bị hút về một điểm. Vạn Nhật Nhất Kiếm! Bao nhiêu ngày gánh nước dồn vào một nhát mộc kiếm.'],
      ['ke', 'martial', 'Ba trăm chiêu. {Name} thắng thế mà không thể ra đòn kết liễu: mỗi vết thương trên thân xác kia là một vết thương của sư huynh. Tà thần biết thế, nên nó chẳng thèm đỡ.'],
      ['hero', 'zen', 'Đánh thế này thì thua. Tại hạ tra kiếm vào bao, ngồi xuống giữa trận, làm điều Không Nguyệt dạy trên núi tuyết: để hồn rời thân, bước thẳng vào con mắt đỏ.'],
      ['ke', 'moon', 'Thân {name} ngồi im như tượng trên đỉnh núi. Tiểu Mộc, Hàn Phong, Lãnh Tịch và chín Nguyệt Sứ cũ lập tức dựng vòng người che quanh. Không ai phải bảo ai.'],
      ['dien', 'martial', 'Nó sẽ tìm cái thân đang ngồi này trước. Vậy đêm nay trên đỉnh núi sẽ có mười hai {name}. Để xem con mắt ấy nhận ra kẻ nào là thật.'],
      ['ke', 'moon', 'Bên trong con mắt là thửa ruộng nứt vô tận dưới trăng đỏ. {Name} bước đi giữa ruộng, tay không, tiến về phía cậu bé đang ngồi bó gối.'],
      ['ke', 'zen', 'Phía sau {y}, mười ổ khóa trên cổng đá cùng rung lên một tiếng. Thiên Môn không chờ kẻ thắng trận. Nó chờ kẻ dám đi tới tận cùng.'],
    ], lesson: 'Có những vấn đề không giải được bằng cách đánh mạnh hơn. Khi mọi đòn đều làm tổn thương thứ mình muốn giữ, hãy đổi cách tiếp cận và đi vào gốc của vấn đề.' },

    { lv: 99.2, title: 'Trong lòng trăng máu', foe: 'giao', lead: 99, pages: [
      ['ke', 'moon', 'Trong thửa ruộng không có ngày đêm. {Name} ngồi xuống cạnh cậu bé. Không nói gì. Chỉ ngồi, như hai đứa trẻ bên bờ suối cạn.'],
      ['be', 'moon', 'Ngươi là ai? Ở đây không ai tới cả. Chỉ có mẹ, ta, và tiếng nói trên kia.'],
      ['hero', 'talk', 'Ta là đứa bé trong chiếc giỏ bên bờ suối. Mẹ huynh nuôi ta ba ngày bằng phần cháo của bà. Bà không thua mùa hạn. Bà đã cứu được ta.'],
      ['ke', 'moon', 'Cậu bé ngẩng lên. Trong một nhịp thở, thửa ruộng như sắp có gió. Rồi gương mặt cậu méo đi.'],
      ['be', 'moon', 'Phần cháo của mẹ…? Vậy là mẹ chết đói vì ngươi. Không có ngươi, mẹ đã chờ được ta mang gạo về. Mẹ chết… vì ngươi!'],
      ['than', 'moon', 'Ngươi tưởng ta giấu chuyện ấy vì sợ nó có hy vọng sao? Ta để dành, đứa trẻ trong giỏ ạ. Con dao tốt nhất phải dùng sau cùng.'],
      ['ke', 'moon', 'Cậu bé đứng dậy, và lần này tự tay nắm lấy vầng trăng đỏ. Không còn bị ép. Lệ Vô Khuyết và Tà thần hòa làm một. Một cú đánh hất hồn {name} văng khỏi con mắt.'],
      ['ke', 'zen', 'Trên đỉnh núi, {y} mở mắt, hộc máu. Sợi chỉ đỏ trên ngực đã thành một sợi xích. Sự thật {y} tin sẽ cứu được người, lại vừa trao cho kẻ thù một đồng minh tự nguyện.'],
      ['hero', 'zen', 'Huynh ấy nói đúng một nửa. Bà mất vì tại hạ. Câu ấy, tại hạ đã tránh nhìn thẳng suốt từ đêm ở Lệ thôn.'],
    ], lesson: 'Nói ra sự thật chưa chắc được đón nhận ngay, và ta không điều khiển được cách người khác nghe nó. Phần của ta là nói cho trung thực, rồi nhận lấy phần trách nhiệm thuộc về mình.' },

    { lv: 99.4, title: 'Mười ổ khóa', lead: 99, pages: [
      ['ke', 'zen', 'Tà thần rút về trời tây dưỡng sức chờ nguyệt thực. Trên Thiên Môn, mười ổ khóa mang hình mười thứ quen thuộc: cây quạt, chiếc đèn, thanh đao, ống sáo… Mười thói xấu, lần này nằm trong chính {name}.'],
      ['ke', 'talk', 'Mỗi Nguyệt Sứ cũ nhận dạy một khóa, vì không ai hiểu một thói xấu bằng kẻ từng sống trong nó. Miên Hồ bắt {y} làm ngay việc đang né. Thiên Diện bắt {y} ngồi nhìn một ngọn đèn suốt đêm.'],
      ['loi', 'talk', 'Ngươi muốn gỡ sợi xích trong một ngày cho kịp nguyệt thực chứ gì? Đó là ta ngày xưa đấy. Đứng yên. Một nén nhang. Rồi hãy nói chuyện tiếp.'],
      ['ke', 'martial', 'Bách Tý bắt {y} gạch bớt bảy trong tám việc trên bảng. Ngọc Vô Hà bắt {y} mặc tấm giáp vá ra trận. Khô Vinh canh cho {y} ngủ. Ảnh Song đập nốt mảnh gương cuối cùng.'],
      ['suong', 'talk', 'Còn khóa của ta. Ngươi vào con mắt ấy một mình. Ngươi định gánh hắn ra một mình. Ngày trước ta cũng nghĩ một mình ta là đủ.'],
      ['ke', 'zen', 'Tám ổ khóa lần lượt rơi. Ổ thứ chín mang hình ống sáo xương: tự nghi ngờ. Không ai dạy được khóa ấy, vì kẻ giữ nó chưa bao giờ là người.'],
      ['ma', 'zen', 'Bà chết vì ngươi. Sư phụ ngươi chết trên ruộng vì ngươi. Lão ngư chết đứng vì ngươi. Ngươi gánh nước cả đời, và xem ngươi đã mang lại gì cho những người thương ngươi.'],
      ['hero', 'zen', 'Trong ngôi miếu đêm mưa năm nào, tại hạ thắng tiếng sáo bằng cách đếm việc đã làm. Lần này không đếm được. Những cái tên ấy không nằm ở cột "Đã xong".'],
      ['ke', 'moon', 'Ổ khóa thứ chín không rơi. Trên trời tây, vầng trăng bạc đã bắt đầu bị một cái bóng đen gặm vào mép. Nguyệt thực còn cách bảy đêm.'],
    ], lesson: 'Người hiểu rõ một thói xấu nhất là người từng mắc nó. Hãy học từ những lần mình và người khác vấp ngã, và đừng ngại nhờ họ chỉ ra chỗ mình đang lặp lại.' },

    { lv: 99.6, title: 'Món nợ một gáo nước', lead: 99, pages: [
      ['ke', 'zen', 'Bảy đêm trước nguyệt thực, {name} rời đỉnh núi, một mình về quán trà dưới chân Vân Mộng. Bà Tư vẫn ngồi quạt lò, như chưa từng có ai rời đi.'],
      ['batu', 'talk', 'Người đàn bà ấy dúi chiếc giỏ vào tay ta. Không dặn ta nuôi con cho giỏi, cũng chẳng bắt nó mang ơn. Bà chỉ nói một câu: "Cho nó uống nước mỗi ngày."'],
      ['hero', 'talk', 'Bà ấy mất vì con, bà ạ.'],
      ['batu', 'talk', 'Bà ấy mất vì hạn. Còn chia cháo cho con là việc bà ấy chọn. Con định giành luôn cả việc người ta đã chọn hay sao? Nợ kiểu ấy không trả ngược lại được, chỉ trả tiếp cho người sau.'],
      ['hero', 'zen', 'Tại hạ chợt hiểu vì sao từ bé đã không chịu nổi cảnh thùng nước của ai đó vơi. Mỗi chuyến nước tại hạ gánh cho người khác, hóa ra là đang trả cho bà mà không biết.'],
      ['ke', 'taichi', '{Y} thôi cãi lại tiếng sáo. Phải, bà mất vì đã chia phần cháo ấy. Và đứa trẻ được chia cháo đã gánh mười nghìn chuyến nước cho thiên hạ. Cả hai câu đều thật.'],
      ['ke', 'zen', 'Sợi xích đỏ không đứt. Nó chỉ không còn chỗ để móc: chỗ trống ấy nay đã có tên, có mặt người, có một câu dặn. Sợi xích tuột xuống như sợi chỉ mục. Trên đỉnh núi, ổ khóa thứ chín rơi.'],
      ['vong', 'talk', 'Còn khóa cuối, khóa của ta: tuyệt vọng. Ta không dạy ngươi được. Ngươi chưa từng tuyệt vọng thật. Chìa của nó nằm trong tay kẻ đang ngồi giữa ruộng nứt kia.'],
      ['than', 'moon', 'Hai mươi năm xây thang, và nó tự tháo khỏi chân ta? Được. Không đi nhờ được thì ta phá cửa. Đêm nguyệt thực, ta đốt ba nghìn mạng mang ấn làm củi!'],
    ], lesson: 'Mặc cảm chỉ giữ ta đứng yên; lòng biết ơn thì đẩy ta đi tiếp. Món nợ với người đã giúp mình không trả ngược lại được: hãy trả bằng cách giúp người đến sau.' },

    { lv: 99.8, title: 'Nguyệt thực', foe: 'giao', lead: 99, pages: [
      ['ke', 'moon', 'Đêm nguyệt thực. Cái bóng đen nuốt dần vầng trăng bạc. Thiên Hình đứng sẵn bên Thiên Môn, thước ngọc giơ cao: bóng che kín trăng thì cửa niêm vĩnh viễn.'],
      ['ke', 'moon', 'Dưới chân núi, ba nghìn giáo chúng mang ấn bắt đầu bốc khói đỏ. Tà thần đang đốt họ lấy sức phá cửa. Tiểu Mộc đã chờ sẵn với ba nghìn tấm thẻ tre.'],
      ['moc', 'talk', 'Mỗi người một việc ngược với thói của mình, làm ngay bây giờ! Ai hay để mai thì gõ chuông. Ai hay ôm việc thì đặt bớt xuống. Xong một việc, ấn mờ một phần. Nhanh lên!'],
      ['ke', 'martial', 'Hàn Phong tóc bạc đứng giữ nhịp trống, thật chậm. Thiên Diện chạy khắp trận, mỗi lúc mang một gương mặt người thân của ai đó để gọi họ dậy. Khói đỏ thưa dần.'],
      ['ke', 'zen', '{Name} không mang kiếm. {Y} gánh đôi thùng nước múc từ con suối Lệ thôn, nay đã chảy lại, đi vào con mắt đỏ lần thứ hai. Lần này, tất cả cùng đặt tay lên vai {y}.'],
      ['hero', 'talk', 'Đại sư huynh. Huynh nói đúng: bà mất vì chia cháo cho ta. Ta không xin huynh tha. Ta mang nước tới. Bà dặn huynh mỗi ngày một gáo. Huynh chưa múc gáo nào.'],
      ['ke', 'moon', 'Cậu bé nhìn cái gáo sứt quai rất lâu. Vầng trăng đỏ rít lên. Cậu cầm lấy gáo, múc đầy, và lần đầu tiên trong đời tưới xuống thửa ruộng của mẹ. Một gáo.'],
      ['be', 'moon', 'Mẹ ơi. Con tưới rồi này.'],
      ['ke', 'moon', 'Dưới gáo nước ấy, đất nứt khép lại một đường. Lòng Lệ Vô Khuyết không còn khuyết, và kẻ sống nhờ chỗ khuyết mất chỗ trú: Tà thần bị hất văng khỏi thân xác hắn. Trên đỉnh núi, ổ khóa thứ mười rơi xuống.'],
    ], lesson: 'Thay đổi lớn nhất cũng bắt đầu bằng một lần làm thật: một gáo nước, một việc nhỏ. Đừng đợi được tha thứ hay thật sẵn sàng; hãy bắt đầu từ việc nhỏ đã bị bỏ dở lâu nhất.' },

    { lv: 100, title: 'Song nguyệt', foe: 'giao', lead: 100, pages: [
      ['ke', 'moon', 'Thiên Môn mở. Ánh sáng tràn xuống đỉnh Vân Mộng đúng lúc bóng đen sắp che kín trăng. Tà thần, giờ chỉ còn là một vành trăng khuyết đói khát, lao về phía cánh cửa.'],
      ['giao', 'moon', 'Thôn Nguyệt Quyết… cả đời ta dùng nó để lấy của người. Lần cuối này, cho ta dùng để giữ. Đi đi, tiểu {sd}. Ta ghì nó ở đây.'],
      ['ke', 'martial', 'Lệ Vô Khuyết hút trọn Tà thần vào thân xác già nua của mình và ghì chặt lấy. Thọ mệnh hắn chỉ còn tính bằng hơi thở. Cửa mở cho cả hai, nhưng hắn không bước.'],
      ['hinh', 'talk', 'Người kế thừa Hằng Nguyệt, bước qua đi. Kẻ kia ở lại thì chết cùng nó trước bình minh. Cõi người yên, Thần giới yên. Phép chỉ cần có thế.'],
      ['hero', 'martial', 'Sư phụ dặn tại hạ: gánh cả huynh ấy về. Tại hạ đã gánh nước cho cả thiên hạ. Không lý gì bỏ lại đúng một người.'],
      ['ke', 'taichi', '{Name} xốc sư huynh lên vai như một gánh nước, bước qua Thiên Môn. Cánh cửa chín mươi chín mở ra cho cả hai: một người vì đã đi trọn từng bước, một người vì trong một khắc đã đủ đầy.'],
      ['thien', 'zen', 'Hằng Nguyệt tinh, ngôi thứ ba mươi sáu của Thiên Cang, từ nay là của ngươi. Thần vị không mở thêm, chỉ truyền lại. Lão đi ngao du vũ trụ đây. Giữ nó như giữ thùng nước yên.'],
      ['ke', 'moon', 'Nhưng vào tới Thần giới, Tà thần không cần trốn nữa. Từ bên trong Lệ Vô Khuyết, nó đòi lại ngôi Phương thần bỏ trống của mình, và ngôi ấy nhận ra chủ cũ. Một vầng trăng đỏ mọc giữa mười hai phương.'],
      ['giao', 'moon', 'Tiểu {sd}… nó đang nuốt ta từ bên trong. Muốn cứu ta, hãy đánh lên tới chỗ ta ngồi. Nếu không kịp… thì hãy đến mà giết.'],
      ['hinh', 'talk', 'Phương thần chỉ bị phế khi thua kẻ thách đấu đủ tư cách. Muốn thách một Phương thần, ngươi phải thắng cả ba mươi lăm Thiên Cang còn lại. Chính ngươi mang nó vào. Chính ngươi phải kéo nó xuống.'],
      ['ke', 'zen', 'Song thần chi chiến bắt đầu. Trên Thần còn ba cấp nữa mới tới Thần Vương. Và {name} biết: đường lên đó cũng chỉ đi được bằng từng chuyến nước.'],
    ], lesson: 'Đích đến này là khởi đầu của một hành trình khác, và lựa chọn nào cũng kèm trách nhiệm. Thành công thật sự là vẫn giữ được thói quen tốt đã đưa mình đến đây.' },
  ];
  window.zenTale = { WHO, FOES, CHAPTERS };
})();
