'use strict';
// v1.92.0 (Truyện Ký): cốt truyện giang hồ của hiệp khách đồng hành trong mục Tu vi (Điểm tích lũy).
// Khai cuộc (cấp 0, đọc trong danh sách chương) và 20 chương ở cấp 5, 10, 15 … 100. Mỗi khi vượt một mốc 5 cấp (ngay sau khi lưu công lực), bảng hội thoại tự hiện,
// kể một chặng vượt khó của nhân vật. Chương đã mở đọc lại được ở khung "Truyện ký giang hồ" trong trang Tu vi.
// Không đổi dữ liệu: dấu "đã đọc" lưu bằng dấu đã đọc của tài khoản (notification-receipts, khóa notice:story-N, dùng chung mọi thiết bị),
// kèm bản sao trên thiết bị. Chỉ tự mở khi vượt mốc ngay lúc lưu công lực: người đã ở cấp cao khi bản này ra mắt không bị dồn chương,
// các chương đã qua hiện trong danh sách với nhãn "Chưa đọc".
(function () {
  const G = () => window.zenGrowth;
  const WHO = { su: 'Sư phụ Tùng Hạc', moc: 'Tiểu Mộc', phong: 'Hàn Phong', ma: 'Tâm ma', ke: 'Truyện ký' };
  // Mỗi trang: [người nói, thế của hiệp khách trên tranh, lời]. {name} = danh hiệu hiệp khách; {y}/{Y} = chàng/nàng; {sh}/{Sh} = sư huynh/sư tỷ.
  const CHAPTERS = [
    { lv: 0, title: 'Hạt mầm dưới chân núi', pages: [
      ['ke', 'zen', 'Dưới chân núi Vân Mộng có một quán trà nhỏ. Ở đó, {name} ngày ngày gánh nước, chưa ai biết tên, cũng chưa ai đoán được con đường phía trước.'],
      ['ke', 'talk', 'Một chiều mưa, lão nhân áo xám trượt chân bên suối. {Y} buông gánh nước, chạy tới đỡ, không chút đắn đo.'],
      ['su', 'talk', 'Đôi tay này chưa biết một chiêu nào, nhưng biết dừng lại vì người khác. Ngươi có muốn học võ không?'],
      ['hero', 'martial', 'Tại hạ muốn! Xin tiền bối chỉ cho tại hạ chiêu thức lợi hại nhất.'],
      ['su', 'zen', 'Chiêu lợi hại nhất là chiêu ngươi luyện mỗi ngày. Hãy bắt đầu từ việc gánh đủ một trăm chuyến nước. Lên núi Tùng Hạc mà tìm ta.'],
    ], lesson: 'Mọi hành trình lớn đều bắt đầu bằng một việc nhỏ được làm cho trọn.' },
    { lv: 5, title: 'Trăm chuyến nước', pages: [
      ['ke', 'talk', 'Núi Tùng Hạc dốc đứng. Chuyến thứ mười, vai {name} rớm máu. Chuyến thứ hai mươi, chân run như sợi chỉ.'],
      ['moc', 'talk', 'Hì hì, {sh} gánh nước chậm hơn cả con rùa sau bếp! Chắc chưa tới chuyến năm mươi đã bỏ về rồi.'],
      ['hero', 'zen', 'Đêm ấy, tại hạ đã định xuống núi. Nhưng nhìn hai thùng nước đầy, lại nghĩ: thêm một chuyến nữa thôi.'],
      ['ke', 'martial', 'Sáng ngày thứ bảy, {y} chợt nhận ra bước chân mình đã vững, hơi thở đã đều. Gánh nước không còn nặng như trước.'],
      ['su', 'taichi', 'Võ công không nằm trong chiêu thức. Nó nằm ở chỗ ngày nào cũng gánh, kể cả ngày không muốn gánh.'],
    ], lesson: 'Đều đặn thắng hăng hái. Một việc nhỏ mỗi ngày nuôi nội lực hơn một ngày gắng sức.' },
    { lv: 10, title: 'Lá thư đầu tiên', pages: [
      ['su', 'talk', 'Mang lá thư này xuống trấn Thanh Khê, trao tận tay chưởng quầy Phúc Lai khách điếm. Ba ngày phải tới.'],
      ['ke', 'martial', 'Giữa rừng trúc, ba tên cướp chặn đường. Đao sáng loáng. Tim {name} đập như trống trận.'],
      ['hero', 'taichi', 'Tại hạ nhớ lời sư phụ: khí trầm đan điền. Tại hạ đứng yên, thở chậm, nhìn thẳng vào mắt chúng.'],
      ['ke', 'talk', 'Thấy kẻ trước mặt không run, không chạy, bọn cướp ngập ngừng rồi tự lùi vào bóng trúc.'],
      ['hero', 'zen', 'Hóa ra nỗi sợ trong đầu lớn hơn ba thanh đao ngoài đường. Bước qua được nó, tại hạ đã chạm tới Tam lưu.'],
    ], lesson: 'Khó khăn thường lớn nhất lúc chưa bắt tay vào làm. Bình tâm, rồi bước tiếp.' },
    { lv: 15, title: 'Chợ Thanh Khê', pages: [
      ['ke', 'talk', 'Trấn Thanh Khê náo nhiệt. Người nhờ khiêng hàng, kẻ rủ xem hát, quán rượu mời mọc. Ai {name} cũng gật đầu.'],
      ['hero', 'talk', 'Tới tối, tại hạ đã giúp mười người, xem ba gánh hát… và quên mất lá thư vẫn nằm trong ngực áo.'],
      ['moc', 'talk', '{Sh} ơi, chưởng quầy Phúc Lai sắp đóng cửa rồi! Lá thư mới là việc sư phụ giao mà!'],
      ['ke', 'martial', '{Y} chạy một mạch qua ba con phố, kịp trao thư khi chiếc đèn lồng cuối cùng vừa tắt.'],
      ['su', 'zen', 'Giang hồ có trăm việc gọi tên ngươi. Cao thủ là người biết việc nào trọng yếu, việc nào để sau.'],
    ], lesson: 'Không phải việc nào cũng gấp. Chọn ba việc trọng yếu nhất trước, phần còn lại sẽ biết chờ.' },
    { lv: 20, title: 'Bại dưới tay Hàn Phong', pages: [
      ['ke', 'martial', 'Ở lôi đài trong trấn, một kiếm khách áo trắng tên Hàn Phong thách đấu. Ba chiêu, kiếm của {name} đã rơi xuống cát.'],
      ['phong', 'talk', 'Kiếm pháp hoa mỹ mà chân không vững. Về luyện thêm mười năm rồi hẵng cầm kiếm.'],
      ['hero', 'zen', 'Đêm đó tại hạ không ngủ được. Xấu hổ có, tức giận có. Nhưng y nói đúng: chân tại hạ chưa vững.'],
      ['ke', 'taichi', 'Từ hôm sau, {y} quay lại tập bộ pháp cơ bản, từng bước, từng bước, như ngày đầu gánh nước.'],
      ['su', 'talk', 'Thua một trận mà thấy được chỗ yếu, ấy là thắng một bài học. Ngươi đã bước vào Nhị lưu.'],
    ], lesson: 'Thất bại là tấm gương soi chỗ cần khổ luyện. Nhìn thẳng vào nó, rồi luyện lại từ gốc.' },
    { lv: 25, title: 'Tâm ma đêm mưa', pages: [
      ['ke', 'zen', 'Đêm mưa dầm. Bàn đầy sách võ chưa đọc, kiếm chưa mài. {name} nằm nhìn mái ngói, lòng nặng trĩu.'],
      ['ma', 'talk', 'Mưa thế này ai mà luyện? Để mai đi. Mai trời tạnh, ngươi sẽ luyện gấp đôi…'],
      ['hero', 'talk', 'Tâm ma nói bằng giọng của chính tại hạ, êm như ru. Mà ngày mai của nó chưa bao giờ tới.'],
      ['ke', 'martial', '{Y} thắp một ngọn nến, tự nhủ chỉ luyện một chiêu thôi. Một chiêu thành ba, ba chiêu thành nửa canh giờ.'],
      ['su', 'zen', 'Tâm ma sợ nhất là bước đầu tiên. Đừng đánh nó cả đêm. Chỉ cần bắt đầu năm phút.'],
    ], lesson: 'Khi ngại khởi sự, hãy làm phiên bản nhỏ nhất: năm phút, một chiêu, một dòng. Đà sẽ tự đến.' },
    { lv: 30, title: 'Bến đò mùa lũ', pages: [
      ['ke', 'talk', 'Đại hội tuyển đệ tử của Thanh Vân phái chỉ mở một ngày. {name} lên đường từ sớm, lòng đầy háo hức.'],
      ['ke', 'martial', 'Tới bến đò, nước lũ dâng cao. Một làng chài bị cô lập, trẻ nhỏ khóc trên mái nhà.'],
      ['hero', 'talk', 'Tại hạ biết, nếu ở lại thì lỡ đại hội. Nhưng tiếng khóc kia không đợi được.'],
      ['ke', 'taichi', '{Y} chèo thuyền suốt đêm, đưa từng người vào bờ. Sáng ra, đại hội đã đóng cửa.'],
      ['su', 'zen', 'Ngươi lỡ một tấm thiếp mời, nhưng giữ được tấm lòng. Võ đạo trước hết là nhân đạo. Nhất lưu là đây.'],
    ], lesson: 'Có những việc không nằm trong kế hoạch nhưng nằm trong lương tâm. Nghiệp lành là công lực bền nhất.' },
    { lv: 35, title: 'Sổ sách khách điếm', pages: [
      ['ke', 'talk', 'Chưởng quầy Phúc Lai lâm bệnh, nhờ {name} trông khách điếm một tháng. Mở sổ ra, toàn nợ là nợ.'],
      ['hero', 'talk', 'Kiếm thì tại hạ biết cầm, bàn tính thì chưa. Tiền ra như nước, mà không biết chảy về đâu.'],
      ['moc', 'talk', '{Sh} cứ ghi hết vào! Mỗi đồng xuất ra, mỗi đồng thu vào. Đệ đọc, {sh} chép.'],
      ['ke', 'zen', 'Một tháng sau, sổ sách rõ ràng: bỏ món chi hoang phí, giữ món sinh lời. Khách điếm bắt đầu có lãi.'],
      ['su', 'talk', 'Ngân lượng cũng như nội lực: biết rõ nó đi đâu thì mới giữ được. Hiệp khách không khinh chuyện tiền bạc.'],
    ], lesson: 'Ghi chép thu chi đều đặn là bước đầu của sự tự chủ. Thấy rõ dòng tiền mới điều khiển được nó.' },
    { lv: 40, title: 'Tái ngộ Hàn Phong', pages: [
      ['ke', 'martial', 'Hai mươi trọng sau, {name} gặp lại Hàn Phong trên đỉnh Lạc Nhạn. Lần này kiếm của y vẫn nhanh, còn chân {y} đã vững.'],
      ['phong', 'martial', 'Ngươi không còn vung kiếm cho đẹp nữa. Ngươi đợi ta sơ hở.'],
      ['ke', 'taichi', 'Trăm chiêu trôi qua. Hàn Phong vội một nhịp, {name} khẽ gạt, kiếm của y rơi xuống cỏ.'],
      ['hero', 'talk', 'Tại hạ nhặt kiếm, hai tay trả lại: ngày ấy nhờ huynh chỉ ra chỗ yếu, tại hạ mới có hôm nay.'],
      ['phong', 'talk', 'Thắng mà không kiêu… Hàn Phong ta xin kết giao bằng hữu. Tuyệt đỉnh cao thủ, ngươi xứng đáng.'],
    ], lesson: 'Đối thủ hôm qua có thể là thầy, là bạn hôm nay. Nhân duyên tốt bắt đầu từ lòng biết ơn.' },
    { lv: 45, title: 'Kiệt sức', pages: [
      ['ke', 'martial', 'Muốn tiến nhanh, {name} luyện kiếm từ canh tư tới nửa đêm, bỏ bữa, bỏ ngủ.'],
      ['ke', 'zen', 'Ngày thứ mười, {y} ngã quỵ giữa sân tập, sốt li bì ba ngày.'],
      ['moc', 'talk', '{Sh} uống bát cháo gừng này đi. Sư phụ bảo: thân là thuyền, thuyền thủng thì chở được ai?'],
      ['hero', 'zen', 'Nằm trên giường bệnh, tại hạ mới hiểu: nghỉ ngơi không phải lười biếng. Nó là một phần của luyện công.'],
      ['su', 'taichi', 'Cung giương mãi thì gãy. Ăn đủ, ngủ đủ, vui đủ, rồi hẵng luyện. Thể lực là gốc, tinh thần là rễ.'],
    ], lesson: 'Sức bền đến từ nhịp: làm và nghỉ. Chăm thân và tâm cũng là tu luyện.' },
    { lv: 50, title: 'Bảy ngày bế quan', pages: [
      ['su', 'zen', 'Vào hang Thạch Nhũ, bảy ngày không kiếm, không sách, không người. Chỉ có ngươi và hơi thở.'],
      ['hero', 'talk', 'Ngày đầu, tại hạ đếm giọt nước rơi. Ngày thứ hai, nhớ đủ thứ chuyện cũ. Ngày thứ ba, chỉ muốn phá cửa đá mà ra.'],
      ['ke', 'zen', 'Ngày thứ năm, những ý nghĩ như mây kéo qua rồi tan. {Y} không đuổi theo chúng nữa.'],
      ['hero', 'zen', 'Ngày thứ bảy, tại hạ nghe được tiếng tim mình. Tâm lặng như mặt hồ, thấy rõ cả đáy.'],
      ['su', 'talk', 'Thắng được người là mạnh. Thắng được chính mình mới là Tiên thiên.'],
    ], lesson: 'Một khoảng lặng mỗi ngày giúp nhìn rõ điều quan trọng. Bế quan không phải trốn chạy, mà là trở về.' },
    { lv: 55, title: 'Tàng Kinh các', pages: [
      ['ke', 'talk', 'Sư phụ trao chìa khóa Tàng Kinh các. Ngàn quyển võ học xếp kín tới trần.'],
      ['hero', 'talk', 'Đọc quyển sau quên quyển trước. Tại hạ tưởng mình sáng dạ, hóa ra chỉ như chiếc giỏ đem đi múc nước.'],
      ['moc', 'talk', '{Sh} thử chép lại như hồi chép sổ khách điếm xem. Mỗi quyển một trang tâm đắc.'],
      ['ke', 'zen', '{Y} bắt đầu ghi: điều gì đáng nhớ, điều gì còn ngờ, điều gì làm được ngay. Kiến thức thôi trôi đi.'],
      ['su', 'talk', 'Đọc mà không ghi như gió qua rừng. Ghi rồi đem dùng mới thành trí tuệ của chính ngươi.'],
    ], lesson: 'Ghi lại điều học được và một việc sẽ áp dụng. Tàng thư của riêng mình quý hơn mọi bí kíp.' },
    { lv: 60, title: 'Đệ tử đầu tiên', pages: [
      ['ke', 'talk', 'Một cậu bé gánh nước ở chân núi tìm đến, xin {name} dạy võ. Ánh mắt cậu giống hệt {y} năm nào.'],
      ['hero', 'talk', 'Tại hạ dạy cậu đứng tấn, hít thở, gánh nước. Mỗi câu nói ra, tại hạ lại tự hỏi: mình đã thật hiểu chưa?'],
      ['ke', 'taichi', 'Có những chiêu {y} luyện mười năm, đến khi giảng cho trò mới thấy chỗ còn vụng.'],
      ['moc', 'talk', '{Sh} giờ thành sư phụ rồi! Mà sao {sh} còn học nhiều hơn cả đứa nhỏ kia?'],
      ['su', 'zen', 'Dạy là học hai lần. Ngươi đã truyền được đạo, ấy là Tông sư.'],
    ], lesson: 'Chia sẻ điều mình biết là cách học sâu nhất. Nâng người khác lên, chính mình cũng cao thêm.' },
    { lv: 65, title: 'Hắc Phong trại', pages: [
      ['ke', 'martial', 'Hắc Phong trại kéo về thung lũng, đòi cống nạp. Dân làng hoảng loạn, kẻ muốn bỏ chạy, người muốn đánh liều.'],
      ['hero', 'talk', 'Một mình tại hạ không giữ nổi cả thung lũng. Nhưng trăm người có kế hoạch thì khác.'],
      ['ke', 'taichi', '{Y} chia việc: người đắp lũy, người canh gác, trẻ nhỏ đưa tin. Việc nào trước, việc nào sau, vẽ rõ trên một tấm da dê.'],
      ['phong', 'martial', 'Ta lo cánh trái. Ngươi giữ cổng chính. Lần này ta không để ngươi một mình!'],
      ['ke', 'zen', 'Ba ngày sau, Hắc Phong trại rút đi mà không lấy được một hạt thóc. Trận đồ trên tấm da dê vẫn còn treo ở đình làng.'],
    ], lesson: 'Việc lớn cần trận đồ: chia nhỏ, sắp thứ tự, giao đúng người. Đồng lòng thì núi cũng dời được.' },
    { lv: 70, title: 'Ngọn lửa sau trận', pages: [
      ['ke', 'zen', 'Thắng trận, làng mở tiệc. Nhưng Tiểu Mộc trúng tên khi đưa tin, nằm thiêm thiếp bên đống lửa.'],
      ['hero', 'talk', 'Tại hạ đã vẽ trận đồ, đã chia việc, mà quên rằng đứa nhỏ nhất lại đi con đường hiểm nhất.'],
      ['moc', 'talk', '{Sh} đừng buồn… Đệ chạy nhanh nhất mà. Lần sau {sh} cho đệ đi đường vòng là được.'],
      ['ke', 'taichi', '{Y} ngồi canh suốt đêm, rồi ghi vào sổ: mỗi chiến thắng đều có người trả giá; nhớ ơn họ, và tính kỹ hơn.'],
      ['su', 'talk', 'Người đứng đầu không chỉ nghĩ cách thắng, mà nghĩ cho người đi cùng. Đại tông sư bắt đầu từ tấm lòng ấy.'],
    ], lesson: 'Thành công nào cũng có người góp sức. Biết ơn và chăm lo cho đồng đội là phẩm chất của người dẫn đường.' },
    { lv: 75, title: 'Hư danh', pages: [
      ['ke', 'talk', 'Tiếng tăm {name} lan khắp giang hồ. Thiệp mời chất cao, lời khen tụng không ngớt.'],
      ['hero', 'talk', 'Tại hạ bắt đầu thích nghe khen hơn thích luyện kiếm. Một ngày không ai nhắc tên, lòng thấy trống trải.'],
      ['ke', 'zen', 'Một lá thư từ núi Tùng Hạc gửi tới, chỉ vỏn vẹn một dòng.'],
      ['su', 'zen', 'Núi cao không tự xưng là cao. Nước sâu không tự khoe là sâu.'],
      ['hero', 'taichi', 'Tại hạ cất hết thiệp mời, sáng hôm sau lại ra sân gánh nước như thuở nào. Lòng nhẹ như mây.'],
    ], lesson: 'Lời khen là gió thoảng. Giữ việc luyện mỗi ngày, đừng để hư danh dẫn đường.' },
    { lv: 80, title: 'Thanh kiếm gỗ', pages: [
      ['ke', 'talk', 'Tin dữ: sư phụ lâm bệnh nặng. {name} phi ngựa ba ngày đêm về núi Tùng Hạc.'],
      ['su', 'zen', 'Đừng khóc. Lá rụng về cội, mây tan thành mưa. Có đến thì có đi, ấy là lẽ thường.'],
      ['ke', 'zen', 'Lão nhân trao cho {y} thanh kiếm gỗ cũ, cán mòn nhẵn vì năm tháng.'],
      ['su', 'talk', 'Ta luyện kiếm sáu mươi năm, rốt cuộc chỉ giữ thanh kiếm gỗ này. Thứ quý nhất không phải thần binh, mà là thói quen mỗi sớm cầm kiếm.'],
      ['hero', 'zen', 'Sư phụ ra đi khi tiếng chuông sớm vừa điểm. Tại hạ ra sân, cầm kiếm gỗ, luyện như mọi ngày.'],
    ], lesson: 'Mọi thứ đều vô thường. Điều ta giữ được lâu nhất là những nếp tốt đã thành chính mình.' },
    { lv: 85, title: 'Kiếm theo gió', pages: [
      ['ke', 'taichi', '{name} lên đỉnh Vân Mộng luyện kiếm giữa trời. Gió thổi về đâu, kiếm theo về đó, không cưỡng, không ép.'],
      ['hero', 'zen', 'Tại hạ chợt thấy bát mạch trong người như tám dòng suối. Dòng nào cạn, cả khu rừng đều héo.'],
      ['ke', 'talk', '{Y} bắt đầu chăm cả những mạch xưa nay bỏ quên: thăm người thân, đọc thơ, ngắm trăng, nấu một bữa cơm.'],
      ['phong', 'talk', 'Ngươi bây giờ luyện kiếm mà như đang đi dạo. Vậy mà kiếm ý lại mạnh hơn xưa.'],
      ['hero', 'taichi', 'Cân bằng không phải chia đều. Là biết mạch nào đang khát để tưới trước.'],
    ], lesson: 'Một đời người có nhiều mạch: thân, tâm, trí, duyên, nghiệp, tài… Nhìn Bát phương đồ để tưới mạch đang khát.' },
    { lv: 90, title: 'Màn sương Huyết Vụ', pages: [
      ['ke', 'zen', 'Một màn sương xám phủ khắp giang hồ. Ai hít phải đều buông kiếm, bỏ ruộng, ngồi than: làm gì cũng vô ích.'],
      ['phong', 'talk', 'Ta đã thử chém tan nó, nhưng càng chém sương càng dày. Thứ này không ở ngoài, nó ở trong lòng người.'],
      ['hero', 'talk', 'Đó là tâm ma của cả thiên hạ. Không thanh kiếm nào đánh được nó. Chỉ có từng việc nhỏ được làm xong.'],
      ['ke', 'martial', '{Y} đi từ làng này sang làng khác: cùng người gánh nước, cùng người cày một luống, cùng trẻ nhỏ tập một thế. Sương mỏng dần theo từng việc xong.'],
      ['ke', 'zen', 'Ngày sương tan, người ta tôn {name} là Võ lâm chí tôn. {Y} chỉ cười: tại hạ chỉ làm điều sư phụ dạy từ ngày đầu.'],
    ], lesson: 'Khi nản lòng lan khắp, một việc nhỏ làm xong có sức lan tỏa hơn mọi lời hô hào.' },
    { lv: 95, title: 'Đại hội võ lâm', pages: [
      ['ke', 'talk', 'Đại hội võ lâm muốn tôn {name} làm minh chủ, nắm quyền hiệu lệnh trăm môn phái.'],
      ['hero', 'talk', 'Tại hạ không cần lệnh bài. Tại hạ chỉ xin mỗi môn phái mở cửa dạy dân thường một bài công phu giản dị.'],
      ['phong', 'martial', 'Hàn Phong ta xin dạy bộ pháp. Thiên hạ ai cũng nên đứng cho vững trước đã!'],
      ['ke', 'taichi', 'Từ đó, mỗi đầu làng có một sân tập sớm. Lão nông, thợ rèn, trẻ chăn trâu cùng hít thở, cùng luyện.'],
      ['moc', 'talk', '{Sh} thành chí tôn mà còn bận hơn hồi gánh nước! Nhưng đệ thấy {sh} cười nhiều hơn.'],
    ], lesson: 'Sức mạnh thật sự là giúp người khác mạnh lên. Hãy để hành trình của mình mở lối cho người sau.' },
    { lv: 100, title: 'Trở về chân núi', pages: [
      ['ke', 'zen', 'Trăm cấp tu vi đã trọn. {name} trả lại mọi danh hiệu, khoác áo vải, xuống chân núi Vân Mộng.'],
      ['ke', 'talk', 'Quán trà năm xưa vẫn còn đó. Một đứa trẻ đang gánh nước, vai rớm máu, chân run như sợi chỉ.'],
      ['hero', 'talk', 'Ngươi có muốn học võ không? Chiêu lợi hại nhất… là chiêu ngươi luyện mỗi ngày.'],
      ['ke', 'taichi', 'Đứa trẻ ngơ ngác gật đầu. Gió núi thổi qua rừng tùng, như tiếng cười của một lão nhân áo xám.'],
      ['hero', 'zen', 'Hành trình không có điểm cuối. Đỉnh núi chỉ là chỗ để thấy con đường tiếp theo. Đa tạ các hạ đã cùng tại hạ đi trọn trăm cấp.'],
    ], lesson: 'Đi hết một con đường là lúc trở thành người dẫn đường. Hãy bắt đầu lại, cùng một người mới.' },
  ];
  const byLv = (lv) => CHAPTERS.find((c) => c.lv === lv);
  const number = (c) => (c.lv ? 'Chương ' + c.lv / 5 : 'Khai cuộc');

  // ---- Dấu đã đọc -----------------------------------------------------------------------------------------------------------
  const KEY = (lv) => 'notice:story-' + lv;
  const localKey = () => 'zen-story:' + (currentUser?.id || '');
  function local() {
    try {
      const o = JSON.parse(localStorage.getItem(localKey()) || '{}');
      return o && typeof o === 'object' ? o : {};
    } catch {
      return {};
    }
  }
  function saveLocal(o) {
    try {
      localStorage.setItem(localKey(), JSON.stringify(o));
    } catch {}
  }
  const receipts = () => (typeof readReceiptKeys !== 'undefined' && readReceiptOwner === currentUser?.id ? readReceiptKeys : new Set());
  const seen = (lv) => receipts().has(KEY(lv)) || (local().seen || []).includes(lv);
  function markSeen(lv) {
    const o = local();
    o.seen = [...new Set([...(o.seen || []), lv])];
    saveLocal(o);
    if (typeof saveReadReceipts === 'function' && currentUser) saveReadReceipts([KEY(lv)]).catch(() => {});
  }

  // ---- Trạng thái hiện tại ----------------------------------------------------------------------------------------------------
  const started = () => !!G()?.started();
  const earned = () => G().total(G().earnedScores());
  const level = () => (started() ? G().realmOf(earned()).level : -1);
  const unlocked = (c) => c.lv <= level();
  const hero = () => G().growth()?.hero || 'nam';
  const fill = (s) => {
    const nu = hero() === 'nu';
    const map = { name: G().heroName(), y: nu ? 'nàng' : 'chàng', Y: nu ? 'Nàng' : 'Chàng', sh: nu ? 'sư tỷ' : 'sư huynh', Sh: nu ? 'Sư tỷ' : 'Sư huynh' };
    return s.replace(/\{(name|y|Y|sh|Sh)\}/g, (_, k) => map[k]);
  };
  const realmName = (lv) => (lv ? G().REALMS[Math.ceil(lv / 10) - 1] : 'Vô danh tiểu tốt');

  // ---- Bảng hội thoại ---------------------------------------------------------------------------------------------------------
  let reader = null; // { el, queue: [lv…], at, page }
  function stageArt(pose) {
    return '<div class="gr-stage-bg gr-story-stage">' + zenHero.scene() + '<div class="gr-figure gr-story-figure">' + zenHero.svg(hero(), pose) + '</div></div>';
  }
  function paint() {
    const r = reader;
    if (!r) return;
    const c = byLv(r.queue[r.at]), last = r.page === c.pages.length, total = c.pages.length + 1;
    const head = r.el.querySelector('.gr-story-head');
    head.innerHTML = '<span class="eyebrow">TRUYỆN KÝ GIANG HỒ · ' + esc(number(c)).toUpperCase() + (c.lv ? ' / 20' : '') + '</span><h2 id="gr-story-title">' + esc(c.title) + '</h2><small>' + (c.lv ? 'Mở ở cấp ' + c.lv + ' · ' + esc(realmName(c.lv)) : 'Ngày bước vào giang hồ') + '</small>';
    const body = r.el.querySelector('.gr-story-body');
    if (last) {
      const g = G(), lvNow = level(), rr = g.realmOf(earned());
      body.innerHTML = '<div class="gr-story-lesson"><span class="gr-story-seal" aria-hidden="true">Ngộ</span><h3>Tâm đắc</h3><p>' + esc(c.lesson) + '</p><small>' + esc(g.heroName()) + ' hiện ở cấp ' + lvNow + ' · ' + esc(rr.name) + ' · ' + g.fmt(earned()) + ' điểm tu vi</small></div>';
    } else {
      const [who, pose, text] = c.pages[r.page];
      const speaker = who === 'hero' ? G().heroName() : WHO[who];
      let art = body.querySelector(':scope > .gr-story-art');
      if (!art) {
        body.innerHTML = '<div class="gr-story-art"></div><div class="gr-story-say"></div>';
        art = body.firstChild;
      }
      // Tranh chỉ vẽ lại khi hiệp khách đổi thế, để hoạt họa không bị ngắt giữa các trang.
      const cur = art.querySelector('svg.gr-hero');
      if (!cur || cur.dataset.pose !== pose) art.innerHTML = stageArt(pose);
      body.querySelector('.gr-story-say').innerHTML = '<p class="gr-story-who" data-who="' + who + '">' + esc(speaker) + '</p><p class="gr-story-text' + (who === 'ke' ? ' is-narration' : '') + '">' + esc(fill(text)) + '</p>';
    }
    const dots = r.el.querySelector('.gr-story-dots');
    dots.innerHTML = Array.from({ length: total }, (_, i) => '<i' + (i === r.page ? ' class="is-on"' : '') + '></i>').join('');
    dots.setAttribute('aria-label', 'Trang ' + (r.page + 1) + ' trên ' + total);
    const prev = r.el.querySelector('[data-story-prev]'), next = r.el.querySelector('[data-story-next]');
    prev.disabled = r.page === 0;
    const more = r.at < r.queue.length - 1;
    next.textContent = !last ? 'Tiếp →' : more ? 'Chương kế →' : 'Khép sách';
    next.classList.toggle('primary', last);
  }
  function close() {
    const r = reader;
    if (!r) return;
    reader = null;
    r.el.close();
    r.el.remove();
    r.then?.();
    if (view === 'growth' && !document.querySelector('dialog[open]')) render();
  }
  // Mở một hoặc nhiều chương liền nhau (khi vượt nhiều mốc cùng lúc). Chỉ mở chương đã tới cấp.
  function open(list, opt = {}) {
    const queue = [].concat(list).map(Number).filter((lv) => byLv(lv) && unlocked(byLv(lv)));
    if (!queue.length || !started()) return false;
    if (reader) close();
    const d = document.createElement('dialog');
    d.className = 'gr-story';
    d.setAttribute('aria-labelledby', 'gr-story-title');
    d.innerHTML = '<div class="gr-story-card"><header class="gr-story-head"></header><button type="button" class="icon-btn gr-story-x" data-story-close aria-label="Đóng truyện ký">×</button><div class="gr-story-body" aria-live="polite"></div>' +
      '<footer class="gr-story-foot"><button type="button" class="btn" data-story-prev>← Trước</button><span class="gr-story-dots" role="img"></span><button type="button" class="btn" data-story-next>Tiếp →</button></footer></div>';
    document.body.append(d);
    reader = { el: d, queue, at: 0, page: 0, then: opt.then };
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      close();
    });
    markSeen(queue[0]);
    paint();
    d.showModal();
    d.querySelector('[data-story-next]').focus();
    return true;
  }
  function step(dir) {
    const r = reader;
    if (!r) return;
    const c = byLv(r.queue[r.at]);
    if (dir < 0) {
      if (r.page > 0) r.page--;
    } else if (r.page < c.pages.length) r.page++;
    else if (r.at < r.queue.length - 1) {
      r.at++;
      r.page = 0;
      markSeen(r.queue[r.at]);
      r.el.querySelector('.gr-story-body').innerHTML = '';
    } else return close();
    paint();
    r.el.querySelector('[data-story-next]').focus();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-story-next],[data-story-prev],[data-story-close],[data-gr-story]');
    if (!b) return;
    if (b.hasAttribute('data-story-next')) return step(1);
    if (b.hasAttribute('data-story-prev')) return step(-1);
    if (b.hasAttribute('data-story-close')) return close();
    if (b.dataset.grStory !== undefined) open(Number(b.dataset.grStory));
  });
  document.addEventListener('keydown', (e) => {
    if (!reader || e.target.closest?.('input,textarea,select')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    }
  });

  // ---- Khi vượt mốc ---------------------------------------------------------------------------------------------------------
  // growth.js gọi sau khi lưu công lực: các mốc 5 cấp nằm trong (trước, sau] chưa đọc thì tự mở, sau lời chúc mừng một nhịp.
  function crossed(before, after) {
    if (typeof contentReadOnly !== 'undefined' && contentReadOnly) return;
    const list = CHAPTERS.filter((c) => c.lv > before && c.lv <= after && !seen(c.lv)).map((c) => c.lv);
    if (!list.length) return;
    setTimeout(() => {
      if (!reader) open(list);
    }, 900);
  }
  // ---- Khung "Truyện ký giang hồ" trong trang Tu vi ----------------------------------------------------------------------------
  function panel() {
    if (!started()) return '';
    const lv = level(), open_ = CHAPTERS.filter(unlocked), unread = open_.filter((c) => !seen(c.lv));
    const next = CHAPTERS.find((c) => !unlocked(c));
    const need = next ? Math.max(0, G().LEVEL_AT[next.lv] - earned()) : 0;
    const lead = next
      ? 'Chương kế: <strong>' + esc(number(next)) + ' · ' + esc(next.title) + '</strong> mở ở cấp ' + next.lv + ' (còn ' + G().fmt(need) + ' điểm tu vi).'
      : 'Các hạ đã mở trọn 20 chương. Đọc lại bất cứ lúc nào.';
    const item = (c) => {
      const isOpen = unlocked(c), fresh = isOpen && !seen(c.lv);
      const tag = !isOpen ? 'Mở ở cấp ' + c.lv : fresh ? 'Chưa đọc' : 'Đã đọc';
      const inner = '<span class="gr-ch-no">' + (c.lv ? c.lv / 5 : '✦') + '</span><span class="gr-ch-main"><strong>' + esc(c.title) + '</strong><small>' + (c.lv ? 'Cấp ' + c.lv + ' · ' + esc(realmName(c.lv)) : 'Khai cuộc') + '</small></span><em class="gr-ch-tag">' + tag + '</em>';
      return '<li class="gr-ch' + (isOpen ? '' : ' is-locked') + (fresh ? ' is-new' : '') + (c.lv && c.lv <= lv && lv < c.lv + 5 ? ' is-now' : '') + '">' +
        (isOpen ? '<button type="button" data-gr-story="' + c.lv + '" aria-label="Đọc ' + esc(number(c)) + ': ' + esc(c.title) + (fresh ? ' (chưa đọc)' : '') + '">' + inner + '</button>' : '<div aria-disabled="true">' + inner + '</div>') + '</li>';
    };
    return '<section class="panel gr-story-panel" aria-labelledby="gr-story-panel-title"><h2 id="gr-story-panel-title">Truyện ký giang hồ <small>' + open_.length + '/' + CHAPTERS.length + ' chương</small></h2>' +
      '<p class="help-copy">Cứ mỗi 5 cấp, hiệp khách kể thêm một chặng hành trình vượt khó. ' + lead + (unread.length ? ' Còn ' + unread.length + ' chương chưa đọc.' : '') + '</p><ol class="gr-ch-list">' + CHAPTERS.map(item).join('') + '</ol></section>';
  }

  window.zenStory = { CHAPTERS, open, crossed, panel, seen, fill, isOpen: () => !!reader };
})();
