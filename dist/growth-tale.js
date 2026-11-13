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
//  - Sau cấp 95: sự thật. Giáo chủ làm mọi việc ác chỉ để gom đủ nội lực mở cánh cửa 99 → 100, và có giao ước với Vô Yểm Tà Thần:
//    làm đủ nghiệp ác thì được kế thừa thần vị Huyết Nguyệt Thần.
//  - Cấp 99: đại chiến Vân Mộng; hai bên soi vào nhau mà cùng phá cửa lên cấp 100. Hiệp khách nhận ngôi Hằng Nguyệt Thần,
//    Giáo chủ thành Huyết Nguyệt Thần: mở ra Song thần chi chiến (3 thần cấp tới Thần Vương, viết tiếp ở bản sau).
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
    { id: 'giao', name: 'Lệ Vô Khuyết', title: 'Huyết Nguyệt Giáo chủ', vice: 'Lòng tham không đáy: muốn mọi thứ tròn đầy ngay lập tức', art: 'Thôn Nguyệt Quyết · Huyết Nguyệt Trảm · Huyết Nguyệt Thôn Thiên', color: '#b3263b', lv: [75, 80, 84, 88, 90, 95, 99, 100] },
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
      ['ke', 'talk', 'Tin {name} làm Giáo chủ bị thương lan khắp giang hồ. Lần đầu tiên sau ba mươi năm, các môn phái cùng kéo về chân núi Vân Mộng.'],
      ['phong', 'martial', 'Ta đã nói rồi: ta không phục. Nhưng kiếm của ta, từ nay đứng sau lưng ngươi.'],
      ['suong', 'talk', 'Ngươi dạy ta rằng không cần một mình. Lần này, Lãnh Tịch ta mang mười hai đệ tử đến, để không ai phải một mình.'],
      ['ke', 'moon', 'Huyết Nguyệt Giáo vây núi. Giáo chủ ngồi trên kiệu đỏ, tay không động, mà nghìn người ngã quỵ vì Thôn Nguyệt Quyết.'],
      ['ke', 'taichi', '{Name} bước lên đầu trận. Nội lực như biển, tâm như tuyết đỉnh. Đòn Gánh vạch một vòng tròn: nghìn người được che chở trong ánh trăng bạc.'],
      ['ke', 'zen', 'Đêm ấy, {name} phá ải cấp chín mươi, bước vào Võ lâm chí tôn. Trên kiệu đỏ, Giáo chủ vẫn ở cấp chín mươi chín, như đã ở đó hai mươi năm.'],
    ], lesson: 'Khi ta kiên trì đủ lâu, người khác sẽ tự tìm đến đứng cùng. Hãy để việc làm của mình nói thay lời kêu gọi.' },

    { lv: 93, title: 'Hồn du về Lệ thôn', lead: 99, pages: [
      ['thien', 'zen', 'Ngươi muốn biết vì sao hắn gom khổ đau? Nắm tay lão. Lão sẽ đưa hồn ngươi về năm mươi năm trước.'],
      ['ke', 'zen', 'Một làng nhỏ tên Lệ thôn, mùa hạn thứ ba. Ruộng nứt nẻ. Một người đàn bà gầy guộc ngày ngày gánh nước từ con suối cạn về tưới mấy luống mạ.'],
      ['ke', 'talk', 'Một cậu bé lon ton theo sau, ôm cái gáo nhỏ. Mẹ cậu cười: "Một gáo thôi con. Mỗi ngày một gáo, ruộng sẽ xanh."'],
      ['ke', 'moon', 'Ruộng không xanh. Mùa đông năm ấy, người mẹ ngã xuống bên đòn gánh. Cậu bé ngồi cạnh mẹ ba ngày, dưới vầng trăng đỏ như máu.'],
      ['than', 'moon', 'Chăm chỉ là lời dối trá của kẻ yếu. Lớn lên, hãy tìm ta. Ta sẽ cho ngươi thứ mạnh hơn cả trời.'],
      ['hero', 'zen', 'Tại hạ hiểu rồi. Huynh ấy không ghét gánh nước. Huynh ấy ghét cái ngày gánh nước không cứu được mẹ mình.'],
      ['thien', 'talk', 'Hãy nhớ điều ngươi vừa thấy. Đến lúc cuối cùng, thứ cứu được hắn sẽ không phải là kiếm.'],
    ], lesson: 'Đằng sau mỗi thói quen xấu thường là một vết thương cũ. Hiểu gốc rễ, ta mới chữa được tận gốc, cho người và cho chính mình.' },

    { lv: 95, title: 'Hai vị chín mươi lăm', foe: 'giao', lead: 99, pages: [
      ['ke', 'moon', 'Giáo chủ dẫn quân đánh Tuyết Phong. Lần này hắn không chờ {name} tới nữa.'],
      ['hai', 'martial', 'Lão già này còn chút nội lực, đủ chặn ba nghìn tên!'],
      ['ke', 'martial', 'Mạc Trấn Hải vung quyền, núi tuyết rung chuyển. Hồn Không Nguyệt tỏa ra như ánh trăng phủ cả ngọn núi; ai đứng trong ánh trăng ấy, Thôn Nguyệt Quyết không chạm tới được.'],
      ['ke', 'taichi', 'Một võ sư nội lực chín mươi lăm, một thiền sư tinh thần chín mươi lăm, và {name} đứng giữa. Ba người, một trận, giữ trọn Tuyết Phong.'],
      ['giao', 'moon', 'Hai lão già và một kẻ gánh nước. Được. Ta chờ ở cửa chín mươi chín. Ở đó, không ai giúp được ngươi.'],
      ['ke', 'zen', 'Đêm ấy, {name} vượt cấp chín mươi lăm: Siêu Phàm Nhập Thánh. Trong giấc mơ, {y} thấy vầng trăng đỏ mở ra như một con mắt.'],
    ], lesson: 'Người dẫn đường giỏi không đi thay ta, mà giữ cho ta chỗ đứng để tự bước. Hãy biết ơn họ bằng cách đi tiếp.' },

    { lv: 96, title: 'Sự thật dưới trăng máu', foe: 'vong', lead: 99, pages: [
      ['ke', 'zen', 'Vô Vọng, kẻ tưởng đã chết, tìm đến võ đường trong hình hài một lão già. Hắn quỳ trước {name}: "Ta sẽ nói hết, trước khi quá muộn."'],
      ['vong', 'moon', 'Hai mươi năm trước, Giáo chủ chạm cấp chín mươi chín. Từ đó, hắn không tiến thêm nửa bước. Cánh cửa từ chín mươi chín lên một trăm không mở cho kẻ lòng còn khuyết.'],
      ['vong', 'moon', 'Rồi trăng máu cất tiếng. Đó là Vô Yểm Tà Thần, vị thần không bao giờ no. Thần hứa: gom đủ nội lực, làm đủ vạn nghiệp ác, thần vị sẽ trao cho hắn.'],
      ['ke', 'moon', 'Trấn ngủ say, đèn nghìn mặt, viên đan không ngủ, nước đen tuyệt vọng… Mỗi việc của Thập Nguyệt Sứ đều là một lần gặt khổ đau dâng cho trăng máu.'],
      ['hero', 'zen', 'Vậy mọi việc ác ấy… chỉ để mở một cánh cửa?'],
      ['vong', 'moon', 'Để thành thần trước khi già chết. Tà thần cần một thân xác ngồi lên thần vị. Hắn cần một thần vị để không bao giờ phải chậm nữa.'],
      ['than', 'moon', 'Ngươi cũng muốn lên trăm, phải không? Đến đây. Ngôi thứ hai còn trống.'],
      ['hero', 'martial', 'Không. Tại hạ sẽ lên trăm bằng chuyến nước của mình, hoặc không lên.'],
    ], lesson: 'Đường tắt nào cũng có giá phải trả, và người trả thường không chỉ là ta. Hãy hỏi kỹ: thứ mình đổi lấy thành công là gì?' },

    { lv: 98, title: 'Đêm trước đại chiến', lead: 99, pages: [
      ['ke', 'zen', 'Đêm trước trận cuối, võ đường dưới chân núi sáng đèn. Không ai luyện kiếm. Mọi người ngồi gói bánh, vá áo, kể chuyện.'],
      ['moc', 'talk', '{Sh} ơi, đệ ghi xong rồi. Cột "Đã xong" trên bảng tre có hai nghìn bảy trăm việc. Từ trăm chuyến nước, tới trấn Thanh Khê, tới hôm nay.'],
      ['su', 'zen', 'Mai ngươi đánh với sư huynh. Đừng đánh để giết nó. Hãy đánh để nó nhìn thấy điều nó chưa từng thấy.'],
      ['hero', 'talk', 'Thấy gì ạ, sư phụ?'],
      ['su', 'zen', 'Thấy rằng gánh nước chưa từng vô ích. Mẹ nó không thua. Bà chỉ chưa kịp đi hết đường.'],
      ['ke', 'moon', 'Trên đỉnh Vân Mộng, Giáo chủ ngồi một mình dưới trăng đỏ. Lần đầu sau năm mươi năm, hắn không vận công, chỉ nhìn xuống chân núi, nơi có một ngọn đèn.'],
      ['ke', 'zen', '{Name} ra suối, gánh chuyến nước cuối cùng của cấp chín mươi tám. Trăng rằm in xuống thùng nước, tròn và yên.'],
    ], lesson: 'Trước một thử thách lớn, hãy nhìn lại cột "đã xong" của mình. Ta không bước vào trận cuối với hai bàn tay trắng.' },

    { lv: 99, title: 'Đại chiến Vân Mộng', foe: 'giao', lead: 99, pages: [
      ['ke', 'moon', 'Đêm rằm. Hai vầng trăng hiện trên đỉnh Vân Mộng: một bạc như nước, một đỏ như máu. Hai người cùng cấp chín mươi chín đứng đối diện nhau.'],
      ['giao', 'moon', 'Tiểu {sd}, ba mươi năm ta nhảy từng bước ba bậc một. Ngươi bò từng chuyến nước. Rốt cuộc chúng ta đứng cùng một chỗ. Ngươi không thấy nực cười sao?'],
      ['hero', 'talk', 'Không nực cười. Huynh đã chạy rất xa để khỏi phải nhìn lại ngày ở Lệ thôn. Tại hạ đến để gánh nốt đoạn đường mẹ huynh chưa đi hết.'],
      ['ke', 'martial', 'Huyết Nguyệt Thôn Thiên! Cả bầu trời đỏ rực bị hút về một điểm. Vạn Nhật Nhất Kiếm! Mười nghìn ngày gánh nước dồn vào một nhát mộc kiếm.'],
      ['ke', 'zen', 'Hai chiêu chạm nhau. Không nổ, không vỡ. Như hai vầng trăng soi vào nhau trên mặt nước. Trong kiếm của {name}, Giáo chủ thấy bóng một người đàn bà gánh nước.'],
      ['giao', 'moon', 'Mẹ…'],
      ['ke', 'zen', 'Lần đầu tiên sau năm mươi năm, Lệ Vô Khuyết đứng yên. Và trong khoảnh khắc đứng yên ấy, lòng hắn không còn khuyết.'],
      ['ke', 'taichi', 'Cánh cửa chín mươi chín mở ra cho cả hai. {Name} bước qua vì đã đi trọn từng bước. Giáo chủ bước qua vì, trong một khắc, hắn đã đủ.'],
      ['than', 'moon', 'Ngươi là của ta, Lệ Vô Khuyết! Giao ước đã trọn!'],
    ], lesson: 'Đối thủ lớn nhất cũng có thể là tấm gương soi rõ nhất. Đi đến cùng con đường của mình, có khi ta giúp được cả người đứng phía bên kia.' },

    { lv: 100, title: 'Song nguyệt', foe: 'giao', lead: 100, pages: [
      ['ke', 'zen', 'Khi bụi tan, trên trời có hai vầng trăng. {Name} đứng trên đỉnh núi, quanh thân là ánh bạc dịu như nước trong thùng.'],
      ['thien', 'zen', 'Ngôi Hằng Nguyệt Thần đã trống từ thuở hồng hoang. Nó chỉ nhận người đi lên từng bước, không đi tắt bước nào. Chúc mừng ngươi.'],
      ['ke', 'moon', 'Phía chân trời bên kia, Lệ Vô Khuyết ngồi trên ngai đỏ của Huyết Nguyệt Thần. Nhưng trong mắt hắn còn một tia sáng bạc chưa tắt.'],
      ['giao', 'moon', 'Hằng Nguyệt Thần… tiểu {sd}. Tà thần đang nuốt ta từ bên trong. Nếu muốn cứu ta, hãy đến mà đánh. Nếu không, hãy đến mà giết.'],
      ['su', 'talk', 'Đi đi. Lần này, gánh cả nó về.'],
      ['ke', 'zen', 'Song thần chi chiến bắt đầu. Trên Thần còn ba cấp nữa mới tới Thần Vương. Và {name} biết: đường lên đó cũng chỉ đi được bằng từng chuyến nước.'],
    ], lesson: 'Đích đến này là khởi đầu của một hành trình khác. Thành công thật sự là vẫn giữ được thói quen tốt đã đưa mình đến đây.' },
  ];
  window.zenTale = { WHO, FOES, CHAPTERS };
})();
