'use strict';
// v2.7.0 (Kỳ Ngộ): 22 nhân vật phụ của truyện "Hằng Nguyệt và Huyết Nguyệt", xuất hiện ngẫu nhiên ở các cấp không có chương.
// Mỗi nhân vật có 2 lần kỳ ngộ, mỗi lần một khoảng cấp [from, to]. Cấp gặp được chọn ngẫu nhiên nhưng cố định theo tài khoản
// (băm mã người dùng), nên mọi thiết bị của cùng một người thấy giống nhau, còn mỗi người một lộ trình gặp gỡ riêng.
// Vai: giúp đỡ · gây khó · ám sát · thử thách. Hai người dẫn đường cấp 95 (thiền sư Không Nguyệt, võ sư Mạc Trấn Hải) cũng ở đây.
// Trang: [người nói, cảnh, lời] như truyện chính; cảnh 'moon' = phe ác.
(function () {
  const ROLES = { giup: 'Giúp đỡ', can: 'Gây khó', amsat: 'Ám sát', thu: 'Thử thách' };
  const CAST = [
    { id: 'batu', name: 'Bà Tư', title: 'Chủ quán trà chân núi Vân Mộng', bio: 'Người cưu mang hiệp khách ở quán trà từ thuở còn nằm trong giỏ, cho gánh nước kiếm cơm. Quạt lò cả đời, không biết võ, biết người.', meets: [
      { from: 1, to: 14, kind: 'giup', title: 'Chén trà nghỉ chân', pages: [
        ['ke', 'talk', '{Name} xuống núi mua muối, ghé lại quán trà cũ. Bà Tư vẫn ngồi quạt lò, như chưa từng có ai rời đi.'],
        ['batu', 'talk', 'Ngồi xuống uống chén trà đã. Ta thấy con đi đâu cũng vội như bị ma đuổi.'],
        ['hero', 'talk', 'Con còn nhiều việc lắm, bà ơi. Gánh nước, luyện kiếm, chép kinh…'],
        ['batu', 'zen', 'Ấm trà ngon phải chờ nước sôi rồi để lắng một chút. Người cũng vậy. Uống xong rồi đi, đi sẽ nhanh hơn.'],
      ], lesson: 'Một quãng nghỉ ngắn giữa các việc giúp đầu óc tỉnh lại. Nghỉ năm phút không làm ta chậm đi.' },
      { from: 30, to: 60, kind: 'giup', title: 'Tấm biển trước quán', pages: [
        ['ke', 'talk', 'Danh tiếng {name} đã vang khắp nơi. Bà Tư treo một tấm biển trước quán: "Nơi {name} từng gánh nước".'],
        ['batu', 'talk', 'Khách đến đông lắm, ai cũng hỏi chuyện con. Ta chỉ kể: hồi ấy con làm đổ nước suốt.'],
        ['hero', 'talk', 'Bà kể vậy, người ta cười con mất.'],
        ['batu', 'zen', 'Cười thì có sao. Người ta cần biết cao thủ cũng từng đổ nước. Thế họ mới dám bắt đầu.'],
      ], lesson: 'Đừng giấu những ngày vụng về. Chúng là bằng chứng rằng ai cũng có thể bắt đầu từ con số không.' },
    ] },
    { id: 'luc', name: 'Lục Lục', title: 'Tiểu khất dưới gầm cầu Thanh Khê', bio: 'Đứa trẻ ăn mày tai thính mắt tinh, sau lập cả một mạng lưới tin tức của lũ trẻ gầm cầu.', meets: [
      { from: 3, to: 25, kind: 'giup', title: 'Nửa cái bánh, nửa cái tin', pages: [
        ['ke', 'talk', 'Dưới gầm cầu Thanh Khê có một đứa bé ăn mày tên Lục Lục. {Name} chia cho nó nửa cái bánh bao.'],
        ['luc', 'talk', 'Ăn của {y} nửa cái bánh, Lục Lục trả nửa cái tin: đêm nay có người của Huyết Nguyệt Giáo đi qua lối rừng trúc.'],
        ['ke', 'martial', 'Nhờ tin ấy, {y} kịp đổi đường, tránh được một toán phục kích.'],
      ], lesson: 'Một việc tử tế nhỏ thường quay về theo cách không ngờ. Hãy giữ quan hệ tốt với những người quanh mình.' },
      { from: 36, to: 60, kind: 'giup', title: 'Bảng tin gầm cầu', pages: [
        ['luc', 'talk', 'Giờ Lục Lục có ba mươi đứa bạn ở ba mươi gầm cầu. Nghe được gì cũng chạy về báo. Bọn này làm một tấm bảng như của Tiểu Mộc!'],
        ['ke', 'zen', 'Bảng tin của lũ trẻ có ba cột: Nghe được, Đang kiểm, Chắc chắn. Nhờ nó, {name} biết trước ba nơi Huyết Nguyệt Giáo sắp đến.'],
        ['hero', 'talk', 'Ngươi còn giỏi hơn thám báo của triều đình đấy, Lục Lục.'],
      ], lesson: 'Thông tin chỉ có ích khi được sắp xếp. Phân rõ điều mới nghe, điều đang kiểm và điều đã chắc chắn.' },
    ] },
    { id: 'cuu', name: 'Thiết Cửu', title: 'Thợ rèn trấn Thanh Khê', bio: 'Lò rèn của lão từng nguội ba ngày vì Mê Hồn Hương. Lão nợ hiệp khách một lò lửa.', meets: [
      { from: 11, to: 29, kind: 'giup', title: 'Đôi móc sắt', pages: [
        ['cuu', 'talk', 'Ngày {y} gõ chuông đánh thức cả trấn, lò rèn của ta đang nguội. Ta nợ {y} một lò lửa.'],
        ['ke', 'martial', 'Thiết Cửu rèn cho {name} một đôi móc sắt để gánh nước đỡ trượt vai. Móc nhỏ, nhưng chuyến nước nào cũng nhẹ đi một chút.'],
        ['cuu', 'zen', 'Công cụ tốt không làm thay việc của ngươi. Nó chỉ bớt cho ngươi những phiền phức không đáng có.'],
      ], lesson: 'Đầu tư một chút cho công cụ làm việc. Bớt một phiền phức nhỏ mỗi ngày, cộng lại là rất nhiều.' },
      { from: 41, to: 70, kind: 'giup', title: 'Mộc kiếm không bịt sắt', pages: [
        ['cuu', 'talk', 'Đưa Đòn Gánh đây, ta bịt sắt cho. Gỗ thế này, gặp đao của Huyết Nguyệt Giáo là gãy.'],
        ['hero', 'talk', 'Đa tạ lão. Nhưng tại hạ muốn giữ nó là gỗ. Nó gãy thì tại hạ gọt lại; mỗi lần gọt, tại hạ hiểu nó hơn.'],
        ['cuu', 'zen', 'Hừ, cứng đầu như sắt nguội. Được. Ta rèn cho ngươi con dao gọt tốt nhất trấn này vậy.'],
      ], lesson: 'Không phải nâng cấp nào cũng cần. Hãy giữ thứ đang hợp với mình, và đầu tư vào khả năng tự sửa chữa.' },
    ] },
    { id: 'diep', name: 'Diệp Thanh Đàn', title: 'Thần y du phương', bio: 'Nữ thầy thuốc đeo hòm gỗ đi khắp giang hồ, chữa bệnh không lấy tiền, chỉ bắt người ta hứa ngủ đủ giấc.', meets: [
      { from: 16, to: 44, kind: 'giup', title: 'Bắt mạch bên đường', pages: [
        ['ke', 'talk', 'Một nữ thầy thuốc đeo hòm gỗ chặn {name} giữa đường, không nói không rằng bắt lấy cổ tay {y}.'],
        ['diep', 'talk', 'Mạch nhanh, khí nổi, mắt quầng. Ngươi ngủ mấy canh mỗi đêm? Đừng nói dối, mạch không biết nói dối.'],
        ['hero', 'talk', 'Dạ… hai canh. Việc nhiều quá.'],
        ['diep', 'zen', 'Diệp Thanh Đàn ta kê cho ngươi một thang thuốc: đủ bốn canh ngủ mỗi đêm, uống liền ba mươi ngày. Không tốn một đồng.'],
      ], lesson: 'Giấc ngủ là thang thuốc rẻ nhất mà hiệu nghiệm nhất. Đừng đổi giấc ngủ lấy thêm vài việc.' },
      { from: 46, to: 80, kind: 'giup', title: 'Mười làng uống đan', pages: [
        ['diep', 'talk', 'Những người uống đan của Khô Vinh đang kiệt dần. Ta cần người khiêng thuốc tới mười làng.'],
        ['ke', 'martial', '{Name} cùng Diệp Thanh Đàn đi suốt hai tuần. Đến làng nào, bà cũng dặn một câu: ngủ đi, việc vẫn ở đó chờ.'],
        ['diep', 'zen', 'Chữa bệnh thì dễ. Chữa cái thói không cho mình nghỉ mới khó.'],
      ], lesson: 'Phục hồi cần thời gian và đều đặn, như uống thuốc theo thang. Đừng mong một đêm bù được cả tháng kiệt sức.' },
    ] },
    { id: 'yen', name: 'Phi Yến', title: 'Nữ đạo chích khinh công tuyệt đỉnh', bio: 'Trộm của người giàu chia cho người nghèo, đôi khi lỡ tay trộm cả của người nghèo.', meets: [
      { from: 8, to: 35, kind: 'can', title: 'Túi tiền biết bay', pages: [
        ['ke', 'talk', 'Giữa chợ, một bóng áo xanh lướt qua. Túi tiền mua thuốc của {name} biến mất trên mái nhà.'],
        ['yen', 'talk', 'Phi Yến ta trộm của người giàu chia cho người nghèo. Ngươi trông nghèo thật, nhưng ta lỡ tay rồi!'],
        ['ke', 'martial', '{Y} không đuổi theo trên mái, mà chạy thẳng tới xóm nghèo nhất trấn. Quả nhiên Phi Yến ở đó, đang chia tiền.'],
        ['hero', 'talk', 'Số tiền ấy để mua thuốc cho chính những người này. Cô nương cứ chia, tại hạ chỉ xin cô mua thuốc giúp.'],
      ], lesson: 'Gặp trở ngại, đừng chỉ đuổi theo nó. Hỏi xem mục tiêu thật là gì; đôi khi có cách tới đích mà không cần thắng ai.' },
      { from: 40, to: 80, kind: 'giup', title: 'Cuốn sổ trộm được', pages: [
        ['yen', 'talk', 'Ta vừa trộm được một thứ của Huyết Nguyệt Giáo: sổ ghi các nơi chúng sắp đến. Lần này ta không lỡ tay đâu.'],
        ['ke', 'zen', 'Phi Yến ném cuốn sổ cho {name} rồi biến mất trên mái ngói. Nhờ nó, ba làng kịp sơ tán trước khi Nguyệt Sứ tới.'],
        ['hero', 'talk', 'Cô nương, sao lại giúp tại hạ?'],
        ['yen', 'talk', 'Vì ngươi đã không bắt ta hôm ở chợ. Người tin ta một lần, ta trả lại bằng một cuốn sổ.'],
      ], lesson: 'Cho người khác cơ hội sửa sai có thể mở ra một đồng minh. Niềm tin trao đúng lúc là một khoản đầu tư.' },
    ] },
    { id: 'nhan', name: 'Ảnh Nhận', title: 'Sát thủ bóng đêm của Huyết Nguyệt Giáo', side: 'ac', bio: 'Lưỡi dao mỏng như lá lúa, thề mỗi người chỉ ra tay một lần.', meets: [
      { from: 12, to: 45, kind: 'amsat', title: 'Mũi dao canh ba', pages: [
        ['ke', 'moon', 'Nửa đêm, một bóng đen lẻn vào am tranh. Lưỡi dao mỏng như lá lúa, không phát ra tiếng gió.'],
        ['nhan', 'moon', 'Ảnh Nhận ta chưa từng ra tay quá một lần. Giáo chủ muốn xem ngươi có ngủ say như kẻ khác không.'],
        ['ke', 'martial', 'Nhưng {name} ngủ đúng giờ, dậy đúng giờ. Canh tư, {y} đã thức để gánh nước. Lưỡi dao chỉ đâm vào chăn trống.'],
      ], lesson: 'Nhịp sinh hoạt đều đặn là tấm khiên vô hình. Người có giờ giấc rõ ràng khó bị bất ngờ đánh gục.' },
      { from: 50, to: 79, kind: 'amsat', title: 'Lời thề bị phá', pages: [
        ['nhan', 'moon', 'Ta đã thề chỉ ra tay một lần. Nhưng ta đã thua một lần. Lần này ta phá lời thề.'],
        ['ke', 'martial', 'Ảnh Nhận lao tới giữa trận, đúng lúc {name} đang đỡ một đòn khác. Nhưng Tiểu Mộc đứng sau lưng, như mọi khi.'],
        ['moc', 'talk', 'Muốn đâm {sh} thì phải qua đệ trước! Đệ canh lưng cho {sh} bao năm rồi đấy.'],
      ], lesson: 'Không ai tự che được hết điểm mù của mình. Hãy có người cùng soát lại công việc, nhất là lúc bận rộn nhất.' },
    ] },
    { id: 'lamhat', name: 'Lam Hạt', title: 'Độc nương tử của Huyết Nguyệt Giáo', side: 'ac', bio: 'Bậc thầy độc dược, giấu độc trong những lời hứa ngọt ngào nhất.', meets: [
      { from: 22, to: 55, kind: 'amsat', title: 'Chén trà màu lam', pages: [
        ['ke', 'moon', 'Một quán trà ven đường mời {name} chén trà màu lam thơm lạ. Bà chủ quán cười rất hiền.'],
        ['lamhat', 'moon', 'Uống đi, khách quý. Trà này giúp người ta không bao giờ thấy mệt.'],
        ['hero', 'zen', 'Tại hạ nhớ lời sư phụ: thứ gì hứa "không bao giờ mệt" đều đáng ngờ. Tại hạ đổ chén trà xuống đất; cỏ héo rũ.'],
      ], lesson: 'Cẩn thận với những lời hứa quá dễ dàng. Thứ gì hứa vượt qua giới hạn của cơ thể đều có cái giá ẩn.' },
      { from: 61, to: 90, kind: 'amsat', title: 'Độc trong giếng', pages: [
        ['ke', 'moon', 'Lam Hạt thả độc vào giếng nước của võ đường. Đệ tử lần lượt ngã bệnh.'],
        ['hero', 'martial', 'Tại hạ không vội đi tìm thuốc giải. Tại hạ cho lấp giếng, gánh nước từ suối xa, rồi mới lần theo dấu độc.'],
        ['ke', 'zen', 'Chặn nguồn độc trước, chữa người sau. Ba ngày sau, Lam Hạt bị dân ba làng chặn ở cửa rừng, hũ độc vỡ tan.'],
      ], lesson: 'Khi sự cố xảy ra, hãy chặn nguồn gốc trước rồi mới xử lý hậu quả. Chữa triệu chứng mà để nguyên gốc thì việc không bao giờ hết.' },
    ] },
    { id: 'kytien', name: 'Kỳ Tiên Ông', title: 'Lão cờ thủ bên gốc tùng', bio: 'Năm xưa từng đánh cờ với Lệ Vô Khuyết. Mỗi ván cờ của lão là một bài học về chọn lựa.', meets: [
      { from: 18, to: 50, kind: 'thu', title: 'Ván cờ ba nước', pages: [
        ['kytien', 'talk', 'Ngồi xuống. Ván này ngươi chỉ được đi ba nước. Ba nước thôi, chọn cho khéo.'],
        ['hero', 'talk', 'Ba nước thì làm sao thắng được ạ?'],
        ['kytien', 'zen', 'Không cần thắng cả bàn. Chỉ cần cứu được con xe đang bị vây. Kẻ muốn ăn hết quân thì chết trước.'],
        ['ke', 'taichi', '{Name} bỏ qua những quân hấp dẫn, dùng ba nước đưa con xe ra khỏi vòng vây. Lão ông vuốt râu cười.'],
      ], lesson: 'Khi thời gian có hạn, hãy chọn vài nước đi quan trọng nhất. Ba việc trọng yếu làm xong hơn mười việc làm dở.' },
      { from: 51, to: 90, kind: 'thu', title: 'Ván cờ không có tướng', pages: [
        ['kytien', 'talk', 'Lần này bàn cờ không có quân tướng. Ngươi bảo vệ cái gì đây?'],
        ['hero', 'zen', 'Tại hạ… bảo vệ những quân tốt. Không có tướng, tốt là thứ còn lại để giữ bàn cờ.'],
        ['kytien', 'zen', 'Lệ Vô Khuyết năm xưa cũng ngồi đây. Hắn thí hết tốt của mình để đổi lấy một nước chiếu tướng. Hắn thắng ván cờ, và chẳng còn ai bên cạnh.'],
      ], lesson: 'Đừng hy sinh con người để đạt một mục tiêu. Đội ngũ là thứ còn lại sau mọi ván cờ.' },
    ] },
    { id: 'cokiem', name: 'Cô Kiếm Lãng Tử', title: 'Kiếm khách lang thang tìm đối thủ', bio: 'Đi khắp thiên hạ chỉ để tìm một người đáng rút kiếm.', meets: [
      { from: 25, to: 60, kind: 'thu', title: 'Một kiếm định hòa', pages: [
        ['cokiem', 'martial', 'Ta đi khắp thiên hạ tìm người đáng để rút kiếm. Rút kiếm đi, kẻ gánh nước.'],
        ['ke', 'martial', 'Một kiếm duy nhất. Kiếm của lãng tử dừng cách cổ {name} một sợi tóc. Đòn Gánh dừng cách ngực hắn một sợi tóc.'],
        ['cokiem', 'talk', 'Hòa. Ngươi luyện chiêu này bao lâu rồi?'],
        ['hero', 'talk', 'Mỗi ngày một trăm lần, từ ngày lên núi.'],
      ], lesson: 'Một kỹ năng được luyện đều mỗi ngày sẽ đứng vững trước cả tay lão luyện. Hãy chọn một thứ và luyện nó thật đều.' },
      { from: 61, to: 95, kind: 'giup', title: 'Lãng tử dừng chân', pages: [
        ['cokiem', 'talk', 'Ta đi cả đời tìm đối thủ, rốt cuộc chẳng có nhà. Ngươi có chỗ cho một kẻ chỉ biết rút kiếm không?'],
        ['hero', 'talk', 'Võ đường đang thiếu người dạy kiếm cho bọn trẻ. Mỗi ngày rút kiếm cho chúng xem, được chứ?'],
        ['ke', 'zen', 'Từ đó, sân võ đường có thêm một kiếm khách già. Mỗi sáng một chiêu, chưa từng nghỉ ngày nào.'],
      ], lesson: 'Năng lực mạnh nhất khi được đặt vào một mục đích. Tìm chỗ để tài năng của mình phục vụ người khác.' },
    ] },
    { id: 'vantam', name: 'Tạ Văn Tâm', title: 'Thư sinh chép sử giang hồ', bio: 'Chép chuyện giang hồ không chép trận đánh, chỉ chép những ngày luyện trước trận đánh.', meets: [
      { from: 30, to: 65, kind: 'giup', title: 'Cuốn sổ công phu', pages: [
        ['vantam', 'talk', 'Tại hạ là Tạ Văn Tâm, chuyên chép chuyện giang hồ. Xin các hạ kể từ chuyến nước đầu tiên.'],
        ['hero', 'talk', 'Có gì đáng chép đâu. Toàn chuyện gánh nước, luyện kiếm, ngủ dậy lại gánh nước.'],
        ['vantam', 'zen', 'Chính những chuyện lặp lại mới đáng chép. Người đời chỉ nhớ trận đánh, mà quên trăm ngày luyện trước trận đánh.'],
      ], lesson: 'Ghi lại những việc thường ngày. Khi nhìn lại, chính cuốn sổ đều đặn ấy cho thấy ta đã đi xa đến đâu.' },
      { from: 66, to: 98, kind: 'giup', title: 'Trang sử cho kẻ thù', pages: [
        ['vantam', 'talk', 'Tại hạ đã chép ba quyển về các hạ. Còn một quyển chưa viết được: quyển về Lệ Vô Khuyết.'],
        ['hero', 'zen', 'Viết đi. Viết cả mẹ huynh ấy, cả mùa hạn năm xưa. Người sau cần biết kẻ ác cũng từng là một đứa trẻ.'],
        ['vantam', 'talk', 'Các hạ là người đầu tiên bảo tại hạ viết cho kẻ thù một trang tử tế.'],
      ], lesson: 'Nhìn đủ mọi phía của một câu chuyện giúp ta công bằng hơn, kể cả với người đang gây khó cho mình.' },
    ] },
    { id: 'nhuy', name: 'Kim Như Ý', title: 'Chủ thương hội Như Ý', bio: 'Đọc sổ sách là biết người. Tiền của thương hội chỉ chảy về nơi ghi chép rõ ràng.', meets: [
      { from: 20, to: 55, kind: 'thu', title: 'Sổ quỹ sửa cầu', pages: [
        ['nhuy', 'talk', 'Nghe nói các hạ giữ quỹ sửa cầu? Cho Kim Như Ý ta xem sổ. Sổ của ai, ta đọc là biết người ấy.'],
        ['hero', 'talk', 'Tại hạ ghi từng đồng: ngày nào thu, ngày nào chi, mua gỗ gì.'],
        ['nhuy', 'zen', 'Sổ sạch thế này thì thương hội ta góp thêm một nửa. Tiền chỉ chảy về nơi được ghi chép rõ ràng.'],
      ], lesson: 'Theo dõi thu chi rõ ràng không chỉ để tránh thất thoát, mà còn tạo niềm tin để người khác cùng góp sức.' },
      { from: 56, to: 90, kind: 'thu', title: 'Món lời gấp mười', pages: [
        ['nhuy', 'talk', 'Huyết Nguyệt Giáo trả ta gấp mười để chở hàng cho chúng. Các hạ thấy ta có nên nhận không?'],
        ['hero', 'talk', 'Hàng của chúng là khổ đau của người khác. Lời gấp mười, nhưng lỗ cả đời.'],
        ['nhuy', 'zen', 'Ta chỉ thử các hạ thôi. Ta đã từ chối từ hôm qua, và cho hết thuyền chở gạo về trấn Thanh Khê.'],
      ], lesson: 'Cân một khoản lợi bằng cả cái giá vô hình của nó. Có những hợp đồng lời trên sổ mà lỗ trong lòng.' },
    ] },
    { id: 'ngao', name: 'Hách Liên Ngạo', title: 'Thiếu chủ Thiên Ưng Bảo', bio: 'Mười năm học với ba danh sư, kiêu ngạo đến mức không nhìn thấy đường dưới chân mình.', meets: [
      { from: 28, to: 60, kind: 'can', title: 'Cổng Thiên Ưng Bảo', pages: [
        ['ngao', 'talk', 'Một kẻ gánh nước mà dám nhận lời mời của Võ lâm minh? Hách Liên Ngạo ta có mười năm học với ba danh sư!'],
        ['ke', 'talk', 'Hắn chặn cổng, đòi {name} quỳ xuống mới cho qua. Người xem xì xào.'],
        ['hero', 'zen', 'Tại hạ đi đường vòng, xa hơn nửa canh giờ. Việc tại hạ cần làm ở bên kia núi, không phải ở cái cổng này.'],
      ], lesson: 'Không phải trận nào cũng đáng đánh. Đừng để cái tôi của người khác kéo ta lệch khỏi việc cần làm.' },
      { from: 61, to: 95, kind: 'thu', title: 'Thiếu chủ gánh nước', pages: [
        ['ngao', 'talk', 'Thiên Ưng Bảo bị Huyết Nguyệt Giáo vây ba ngày. Ba danh sư của ta đều bỏ chạy. Ta… xin các hạ giúp.'],
        ['ke', 'martial', '{Name} đến, không một lời trách. Đánh lui địch xong, {y} chỉ nhờ Hách Liên Ngạo một việc: mỗi sáng gánh nước cho bảo.'],
        ['ngao', 'talk', 'Gánh nước? Ta là thiếu chủ! … Thôi được. Một chuyến thôi đấy.'],
      ], lesson: 'Khiêm tốn bắt đầu từ việc chịu làm những điều nhỏ. Người dám bắt đầu lại từ dưới thấp sẽ đi lên vững hơn.' },
    ] },
    { id: 'tuytang', name: 'Túy Tăng', title: 'Nhà sư say bên vò rượu', bio: 'Say ba mươi năm để khỏi phải nhìn rõ. Mỗi câu đố của ông giấu một lời răn.', meets: [
      { from: 35, to: 70, kind: 'thu', title: 'Câu đố bên vò rượu', pages: [
        ['tuytang', 'talk', 'Bần tăng có một câu đố: một vò rượu, ngày uống một chén thì bao lâu hết? Đáp sai thì uống hết vò!'],
        ['hero', 'talk', 'Còn tùy vò lớn hay nhỏ, đại sư.'],
        ['tuytang', 'zen', 'Sai! Uống một chén mỗi ngày thì chẳng bao giờ hết, vì ngày nào bần tăng cũng rót thêm. Việc tốt cũng vậy: làm đều thì không cạn.'],
      ], lesson: 'Thói quen tốt không phải thứ để làm cho xong, mà là dòng chảy được bồi đắp mỗi ngày.' },
      { from: 71, to: 98, kind: 'thu', title: 'Tăng say tỉnh rượu', pages: [
        ['tuytang', 'talk', 'Bần tăng say ba mươi năm để khỏi phải nhìn rõ. Còn ngươi, ngươi dám nhìn rõ Huyết Nguyệt Giáo chủ không?'],
        ['hero', 'zen', 'Tại hạ dám. Nhìn rõ hắn cũng là nhìn rõ phần sợ hãi trong chính mình.'],
        ['ke', 'zen', 'Túy Tăng đổ vò rượu xuống suối: "Vậy bần tăng tỉnh lại một ngày, đi cùng ngươi một quãng."'],
      ], lesson: 'Né tránh vấn đề chỉ làm nó lớn lên trong im lặng. Can đảm nhìn rõ là bước đầu để giải quyết.' },
    ] },
    { id: 'daoly', name: 'Đào Lý', title: 'Cặp song sinh gánh xiếc', bio: 'Hai chị em giống nhau như hai giọt nước, nghịch như hai con sóc.', meets: [
      { from: 10, to: 40, kind: 'can', title: 'Hai cái bóng tinh nghịch', pages: [
        ['daoly', 'talk', 'Đào đây! Lý đây! Đoán xem ai đang cầm túi gạo của ngươi?'],
        ['ke', 'talk', 'Hai cô bé song sinh nhảy nhót quanh {name}, chuyền túi gạo qua lại. Đuổi đứa này, đứa kia đã chạy mất.'],
        ['hero', 'taichi', 'Tại hạ đứng yên, chỉ nhìn túi gạo. Chuyền tới lần thứ mười thì hai đứa mỏi tay, túi gạo rơi trúng lòng tại hạ.'],
      ], lesson: 'Khi bị kéo về hai phía, đừng đuổi theo từng thứ. Giữ mắt vào điều quan trọng nhất và chờ đúng lúc.' },
      { from: 41, to: 80, kind: 'giup', title: 'Gánh xiếc cứu người', pages: [
        ['daoly', 'talk', 'Năm nay Huyết Nguyệt Giáo lại bắt người trong hội đèn! Bọn ta biết lối vào gánh xiếc của Thiên Diện.'],
        ['ke', 'martial', 'Đào giả làm Lý, Lý giả làm Đào. Thiên Diện nghìn mặt mà không nhận ra ai là ai. {Name} theo hai cô bé cứu được hai mươi người.'],
      ], lesson: 'Người gây phiền hôm qua có thể là đồng minh hôm nay. Đừng đóng cửa với ai chỉ vì một lần va chạm.' },
    ] },
    { id: 'vongtinh', name: 'Vọng Tinh Bà', title: 'Bà thầy bói mù nhìn sao', bio: 'Mắt mù từ trẻ, nhưng đêm nào cũng ngồi "nhìn" sao trời.', meets: [
      { from: 40, to: 75, kind: 'giup', title: 'Vì sao bạc', pages: [
        ['vongtinh', 'zen', 'Mắt già mù rồi, nhưng già vẫn thấy sao. Trên trời có một vầng trăng đỏ đang lớn dần, và một vì sao bạc đi rất chậm.'],
        ['hero', 'talk', 'Vì sao bạc ấy là gì vậy bà?'],
        ['vongtinh', 'zen', 'Là ngươi. Đi chậm thế, nhưng chưa từng dừng. Trăng đỏ nhanh hơn, nhưng nó đang ăn chính mình.'],
      ], lesson: 'Tốc độ không quyết định tất cả. Hướng đi đúng và sự bền bỉ mới quyết định ai đến được đích.' },
      { from: 76, to: 98, kind: 'giup', title: 'Lời đoán hai vầng trăng', pages: [
        ['vongtinh', 'zen', 'Già thấy ngày hai vầng trăng cùng mọc. Một vầng sẽ sáng, một vầng sẽ đói. Ngươi chọn được ngươi là vầng nào.'],
        ['hero', 'zen', 'Nếu được chọn, tại hạ muốn làm vầng trăng in trong thùng nước. Không to, không sáng nhất, nhưng yên.'],
      ], lesson: 'Ta không chọn được mọi hoàn cảnh, nhưng chọn được mình sẽ là người thế nào trong hoàn cảnh ấy.' },
    ] },
    { id: 'hotam', name: 'Hồ Tam', title: 'Kẻ bỏ Huyết Nguyệt Giáo', bio: 'Từng phát đan cho Khô Vinh. Nay đi chuộc lỗi từng người một.', meets: [
      { from: 46, to: 75, kind: 'giup', title: 'Kẻ bỏ giáo', pages: [
        ['hotam', 'talk', 'Ta từng là thủ hạ của Khô Vinh, phát đan cho cả trăm người. Giờ ta muốn chuộc lỗi, nhưng không biết bắt đầu từ đâu.'],
        ['hero', 'talk', 'Bắt đầu từ một người. Tìm người đầu tiên ngươi phát đan, và chăm cho họ khỏe lại.'],
        ['ke', 'zen', 'Hồ Tam đi tìm từng người một. Đến người thứ mười, hắn mới ngủ được một giấc trọn đêm.'],
      ], lesson: 'Một việc lớn, kể cả sửa sai, cũng chỉ làm được từng bước. Đừng để quy mô của vấn đề làm ta không dám bắt đầu.' },
      { from: 76, to: 95, kind: 'giup', title: 'Bản đồ Huyết Nguyệt đài', pages: [
        ['hotam', 'talk', 'Ta vẽ được lối lên Huyết Nguyệt đài. Nhưng xin các hạ một điều: đừng chỉ đánh, hãy cứu những người còn bị giam.'],
        ['ke', 'zen', 'Nhờ bản đồ của Hồ Tam, {name} dẫn người phá trại giam ngoài, cứu ra ba trăm người bị Thôn Nguyệt Quyết hút dở. Lạ thay, then cổng trại đã được ai đó rút sẵn từ bên trong.'],
      ], lesson: 'Thông tin từ người trong cuộc rất quý; hãy dùng nó đúng mục đích: để giúp, không chỉ để thắng.' },
    ] },
    { id: 'trinhho', name: 'Trịnh Bá Hổ', title: 'Huyện lệnh tham lam', side: 'ac', bio: 'Đặt thuế cho cả việc gánh nước, sẵn sàng mở cổng thành để đổi lấy chức tri phủ.', meets: [
      { from: 30, to: 70, kind: 'can', title: 'Thuế gánh nước', pages: [
        ['trinhho', 'talk', 'Bản quan ra lệnh: ai gánh nước từ suối công phải nộp thuế. Một chuyến một đồng!'],
        ['ke', 'talk', 'Dân chân núi Vân Mộng kêu trời. Người nghèo nhất lại phải gánh nước nhiều nhất.'],
        ['hero', 'zen', 'Tại hạ không đánh quan. Tại hạ cùng dân đào một con mương dẫn nước về tận làng. Không ai phải gánh nữa, cũng chẳng còn gì để thu thuế.'],
      ], lesson: 'Gặp một luật lệ bất hợp lý, đôi khi giải pháp tốt nhất là đổi cách làm, để vấn đề tự biến mất.' },
      { from: 71, to: 95, kind: 'can', title: 'Cổng thành lúc nửa đêm', pages: [
        ['trinhho', 'moon', 'Huyết Nguyệt Giáo hứa cho bản quan lên chức tri phủ nếu mở cổng thành cho chúng.'],
        ['ke', 'martial', 'Đêm ấy, cổng thành mở. Nhưng ngoài cổng không phải quân Huyết Nguyệt, mà là dân chân núi cùng Lục Lục và lũ trẻ đã báo tin từ trước.'],
      ], lesson: 'Kế hoạch nào cũng cần dự phòng cho lúc người khác không giữ lời. Chuẩn bị trước giúp ta không bị động.' },
    ] },
    { id: 'moclao', name: 'Mộc Lão', title: 'Tiều phu già, cao thủ ẩn danh', bio: 'Mỗi ngày chặt một nhát rìu, ba năm hạ một cây cổ thụ.', meets: [
      { from: 50, to: 80, kind: 'thu', title: 'Một nhát rìu mỗi ngày', pages: [
        ['moclao', 'talk', 'Cây cổ thụ kia, ta chặt nó đã ba năm. Mỗi ngày một nhát.'],
        ['hero', 'talk', 'Ba năm cho một cây? Sao lão không chặt một lúc cho xong?'],
        ['moclao', 'zen', 'Vì ta còn phải đốn củi, nấu cơm, dạy cháu. Mỗi ngày một nhát không làm ta mệt. Mai nó sẽ đổ. Ngươi ở lại mà xem.'],
        ['ke', 'martial', 'Sáng hôm sau, cây đổ ầm. Mộc Lão không reo mừng, chỉ đi tìm cây khác, chặt nhát đầu tiên.'],
      ], lesson: 'Dự án lớn có thể hoàn thành bằng một phần nhỏ mỗi ngày, xen giữa mọi việc khác. Đừng đợi có một khoảng trống lớn.' },
      { from: 81, to: 98, kind: 'thu', title: 'Nhát rìu thử kiếm', pages: [
        ['moclao', 'martial', 'Đỡ một nhát rìu của lão xem nào.'],
        ['ke', 'taichi', 'Nhát rìu bổ xuống, nặng như núi đổ. {Name} không đỡ, chỉ dẫn lực rìu xuống đất. Mặt đất nứt một đường dài.'],
        ['moclao', 'zen', 'Biết tránh cái không cần đỡ. Được.'],
      ], lesson: 'Không phải việc gì cũng phải gánh lấy. Biết chuyển hướng hay từ chối đúng lúc cũng là một kỹ năng.' },
    ] },
    { id: 'tieuhuyet', name: 'Tiểu Huyết', title: 'Sát thủ nhí do Huyết Nguyệt Giáo nuôi', side: 'ac', bio: 'Đứa trẻ mồ côi được dạy rằng giết người thì sẽ không phải đói.', meets: [
      { from: 55, to: 85, kind: 'amsat', title: 'Đứa trẻ cầm dao', pages: [
        ['tieuhuyet', 'moon', 'Giáo chủ nói, giết được ngươi thì ta sẽ không phải đói nữa.'],
        ['ke', 'martial', 'Con dao nhỏ đâm tới. {Name} không tránh, chỉ nắm lấy cổ tay gầy guộc, rồi đặt vào đó một cái bánh bao còn nóng.'],
        ['hero', 'talk', 'Ăn đi đã. Đói thì không nghĩ được gì.'],
      ], lesson: 'Nhiều hành vi khó chịu xuất phát từ một nhu cầu chưa được đáp ứng. Lo nhu cầu trước, hành vi sẽ đổi theo.' },
      { from: 86, to: 99, kind: 'giup', title: 'Gánh nước cùng ông', pages: [
        ['ke', 'zen', 'Tiểu Huyết ở lại võ đường. Mỗi sáng, nó theo sư phụ Tùng Hạc, giờ đã mất võ công, xuống suối gánh nước.'],
        ['tieuhuyet', 'talk', 'Ông ơi, gánh nước mỗi ngày làm gì? Chẳng mạnh lên được bao nhiêu.'],
        ['su', 'zen', 'Không mạnh lên nhiều. Nhưng ngày nào cũng có nước. Thế là đủ cho một đứa trẻ không phải đói nữa.'],
      ], lesson: 'Giá trị của sự đều đặn nằm ở cảm giác an toàn nó tạo ra. Một nhịp sống ổn định nuôi người ta hơn một lần thành công lớn.' },
    ] },
    { id: 'bacham', name: 'Bạch Âm', title: 'Cầm nữ hồ Vọng Nguyệt', bio: 'Tiếng đàn không ru ngủ, không khích động, chỉ giữ nhịp như bước chân người gánh nước.', meets: [
      { from: 26, to: 60, kind: 'giup', title: 'Khúc đàn đáp tiếng sáo', pages: [
        ['bacham', 'talk', 'Tiếng sáo của Khúc U còn vọng trong đầu ngươi, phải không? Ngồi xuống. Ta đánh cho ngươi một khúc khác.'],
        ['ke', 'zen', 'Tiếng đàn của Bạch Âm chỉ đếm nhịp, chậm rãi như bước chân người gánh nước.'],
        ['hero', 'zen', 'Nghe đàn, tại hạ thấy mình đang đếm lại những ngày đã qua. Ngày nào cũng có một việc đã xong.'],
      ], lesson: 'Tạo cho mình một nghi thức nhỏ để lấy lại bình tĩnh: một bản nhạc, một tách trà, một trang ghi những việc đã xong.' },
      { from: 61, to: 95, kind: 'giup', title: 'Người giữ nhịp', pages: [
        ['bacham', 'talk', 'Trận này ta không cầm kiếm. Ta giữ nhịp cho mọi người.'],
        ['ke', 'martial', 'Giữa trận, tiếng đàn Bạch Âm vang lên đều đặn. Ai hoảng loạn cũng tìm lại được hơi thở. Thôn Nguyệt Quyết không hút được nỗi sợ nào.'],
      ], lesson: 'Lúc căng thẳng, một nhịp làm việc ổn định giữ cho cả nhóm khỏi hoảng loạn. Đừng xem nhẹ người giữ nhịp.' },
    ] },
    { id: 'thien', name: 'Không Nguyệt', title: 'Thiền sư xuất hồn · tinh thần 95', bio: 'Thân ngồi ở một ngôi chùa xa, hồn đi khắp nơi xem ai đang thức. Người dẫn hiệp khách lên núi tuyết bế quan.', meets: [
      { from: 51, to: 80, kind: 'giup', title: 'Ba hơi thở', pages: [
        ['thien', 'zen', 'Lão đi ngang, ghé xem thùng nước của ngươi còn yên không.'],
        ['hero', 'talk', 'Bạch đại sư, dạo này tại hạ bận quá, nhiều hôm không ngồi thiền được.'],
        ['thien', 'zen', 'Thì ngồi ba hơi thở. Ba hơi cũng là thiền. Đừng đợi có nửa canh giờ trống mới bắt đầu.'],
      ], lesson: 'Một thói quen nhỏ vẫn hơn không có thói quen nào. Rút gọn thay vì bỏ qua khi ngày quá bận.' },
      { from: 81, to: 99, kind: 'giup', title: 'Kẻ đếm những gì còn thiếu', pages: [
        ['thien', 'zen', 'Đêm qua lão đi ngang Huyết Nguyệt đài. Hắn ngồi một mình, đếm những gì còn thiếu. Lão chưa từng thấy ai cô đơn đến thế.'],
        ['hero', 'zen', 'Đại sư, có cách nào khiến huynh ấy đếm những gì đã có không?'],
        ['thien', 'talk', 'Có. Cho hắn thấy một người đếm những gì đã có. Mỗi ngày.'],
      ], lesson: 'Cách tốt nhất để thay đổi người khác là sống điều mình tin trước mặt họ, đều đặn và không phô trương.' },
    ] },
    { id: 'hai', name: 'Mạc Trấn Hải', title: 'Võ sư đảo Thiết Thạch · nội lực 95', bio: 'Lão ngư "say" ba mươi năm không thu đồ đệ. Người dẫn hiệp khách xuống biển bế quan.', meets: [
      { from: 66, to: 85, kind: 'thu', title: 'Thư từ đảo đá', pages: [
        ['ke', 'talk', 'Một con hải âu đáp xuống võ đường, chân buộc mảnh giấy nguệch ngoạc: "Sáng nay biển dữ. {Tt} có ra đứng đón sóng không đấy?"'],
        ['hero', 'talk', 'Tại hạ ra đứng đón gió núi thay sóng biển, lão ạ. Không bỏ ngày nào.'],
        ['hai', 'talk', 'Được! Không có biển thì tìm gió. Không có thời gian dài thì tìm thời gian ngắn. Đừng có tìm cớ.'],
      ], lesson: 'Khi điều kiện không lý tưởng, hãy tìm phiên bản làm được của thói quen thay vì bỏ hẳn.' },
      { from: 86, to: 99, kind: 'thu', title: 'Lão ngư lên núi', pages: [
        ['hai', 'talk', 'Lão già này lên núi một chuyến, xem {tt} có lười không. Đứng tấn cho ta xem!'],
        ['ke', 'taichi', '{Name} đứng tấn suốt một canh giờ. Lão ngư đẩy một chưởng, {y} không lùi nửa bước. Lão cười to đến mức chim bay hết khỏi rừng tùng.'],
        ['hai', 'zen', 'Ta già rồi. Tới trận cuối, chưa chắc ta còn đứng cạnh ngươi. Nhưng biển thì vẫn ở đó. Nhớ nhịp của nó.'],
      ], lesson: 'Những gì học từ người thầy ở lại với ta lâu hơn chính người thầy. Hãy biến lời dạy thành thói quen của mình.' },
    ] },
  ];
  window.zenMeet = { ROLES, CAST };
})();
