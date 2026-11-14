'use strict';
// v2.17.0 (Họa Cảnh): khung hình của từng trang truyện ký. Mỗi dòng là MỘT bức tranh cho MỘT trang (xem cú pháp ở growth-scene.js).
// Khóa: 't<cấp>' cho chương (t0 = khai cuộc), 'm:<mã>' cho kỳ ngộ, 'g:<mã>' cho chiến ký; trang nào không có dòng riêng thì derive() dựng từ ngữ cảnh.
(function () {
  const LINES = {
    // ---- Khai cuộc: Trăng trong thùng nước ------------------------------------------------------------------------------------
    t0: [
      'valley/tea dawn +birds +steam @.6,.62,1 hero:carry@.36*1.1 batu:stand@.8 "Rạng đông, hiệp khách gánh nước từ suối về quán trà dưới chân núi Vân Mộng"',
      'valley/tea morning - @.62,.76,1.45 batu:talk@.68*1.1 hero:stand@.38*1.1 basket@.52,.9*1.1?1 "Bà Tư kể chuyện chiếc giỏ đặt trước cửa quán năm đói"',
      'valley/stream night +fireflies ~moon@.3,.2,60 @.62,.84,2 hero:stand@.44,.9*1.3 bucket@.66,.94*1.5?1 "Trăng rằm in xuống thùng nước, nước yên thì trăng tròn"',
      'valley/stream morning +leaves ~sun@.78,.2,54 @.5,.7,1.25 su:fall@.58,.8*1.1 hero:strike@.36*1.1 pole@.18,.9*.7 "Lão nhân áo xám trượt chân bên suối, hiệp khách buông đòn gánh lao tới đỡ"',
      'valley/stream morning - @.5,.72,1.5 su:talk@.58*1.2 hero:bow@.4*1.2 "Sư phụ hỏi: ngươi có muốn học võ không?"',
      'valley/tea day +dust @.66,.68,1.25 hero:martial@.42*1.2 su:talk@.62*1.1 batu:stand@.84 "Hiệp khách xin học chiêu lợi hại nhất để bảo vệ người trong quán"',
      'peaks/path dawn +birds @.58,.62,1.2 su:point@.6,.8*.85 hero:stand@.34*1.1 pole@.18,.9*.8?1 "Lên núi Tùng Hạc tìm ta, nhớ mang theo đòn gánh"',
      'valley/tea night +fireflies ~red@.74,.2,66 @.45,.78,1.5 ladle@.3,.92*1.3?1 su:stand@.64*1.1 "Mắt lão dừng lại ở cái gáo sứt quai, vầng trăng nhuốm đỏ trong một khắc"',
      'altar blood +redmist ~red@.5,.24,110 @.5,.6,1.1 giao:stand@.5,.7*1.1 "Ba nghìn dặm xa, trên Huyết Nguyệt đài, người áo trắng đeo mặt nạ trăng khuyết mở mắt"',
      'altar blood +redthread ~crescent@.5,.3,80 @.5,.5,1.7 giao:cast@.5,.68*1.15 "Cấp bảy mươi, vẫn còn khuyết. Trăng của ta phải tròn"',
    ],
    // ---- 5: Trăm chuyến nước --------------------------------------------------------------------------------------------------
    t5: [
      'peaks/path morning +birds ~sun@.76,.2,54 @.4,.72,1.3 hero:carry@.36,.84*1.15 pole@.62,.9*.8?1 "Núi Tùng Hạc dốc đứng, vai rớm máu, đòn gánh gãy làm đôi"',
      'interior/am lamp +dust @.5,.6,1.1 su:point@.55*1.1 hero:stand@.34*1.1 pole@.5,.3*1.1?1 "Sư phụ với tay lên xà nhà lấy xuống chiếc đòn gánh cũ có vết khấc"',
      'interior/am lamp - @.62,.66,1.6 pole@.4,.7*1.3?1 su:talk@.64*1.2 "Mượn tạm. Của người gánh nước giỏi nhất ta từng biết"',
      'peaks/am day +leaves @.5,.64,1.2 moc:talk@.64*1.15 hero:carry@.34*1.1 "Tiểu Mộc trêu: gánh nước chậm hơn con rùa sau bếp"',
      'peaks/am night +fireflies ~moon@.74,.2,58 @.4,.72,1.55 bucket@.38,.92*1.2 hero:sit@.58,.88*1.15 "Đêm ấy định bỏ về, nhìn hai thùng nước đầy lại thêm một chuyến nữa"',
      'peaks/path dawn +birds ~sun@.72,.38,58 @.5,.68,1.3 hero:carry@.46,.83*1.2 pole@.76,.8*.7?1 "Sáng ngày thứ bảy, bước chân đã vững, hơi thở đã đều"',
      'peaks/am morning +leaves @.55,.66,1.2 su:taichi@.6*1.1 hero:taichi@.36*1.1 "Võ công nằm ở chỗ ngày nào cũng gánh, kể cả ngày không muốn gánh"',
      'peaks/am day +petals @.5,.64,1.25 moc:talk@.62*1.15 su:stand@.4*1.1 "Tiểu Mộc hỏi sao không dạy kiếm pháp cho nhanh, dưới trấn đồn Huyết Nguyệt Giáo dạy cao thủ trong một đêm"',
      'peaks/am dusk +birds @.5,.64,1.4 su:zen@.58*1.2 hero:stand@.4*1.1 "Thứ gì đến trong một đêm sẽ đòi lại gấp mười"',
      'altar blood +redmist +redthread ~red@.5,.24,110 @.5,.7,1.5 giao:cast@.5,.68*1.15 dan:kneel@.34,.7*1.1 dan:kneel@.66,.72*1.1 "Giáo chủ đặt tay lên đỉnh đầu một võ sư bị bắt, nội lực ba mươi năm chảy sang hắn"',
    ],
    // ---- 10: Trấn ngủ say -----------------------------------------------------------------------------------------------------
    t10: [
      'peaks/am morning +birds ~sun@.78,.22,54 @.5,.64,1.3 su:talk@.62*1.1 hero:stand@.38*1.1 letter@.5,.86*.7 "Sư phụ giao thư: trao tận tay chưởng quầy Phúc Lai khách điếm, ba ngày phải tới"',
      'town/street mist +drift @.5,.66,1.1 dan:lie@.3,.86 dan2:lie@.5,.9 kid:lie@.64,.92 hero:walk@.76*1.1 "Trấn Thanh Khê lặng như tờ: người bán bánh gục bên lò, thợ rèn ngủ trên đe, lò đã nguội ba hôm"',
      'town/roofs night +fireflies ~moon@.72,.18,60 @.5,.7,1.3 mien:sit@.5,.82*1.2 fan@.64,.5*.6 "Trên mái ngói, nữ nhân đeo mặt nạ hồ ly phe phẩy quạt tím, mỗi nhịp quạt một làn hương ngọt lịm"',
      'town/roofs night - @.5,.7,1.7 mien:talk@.5,.82*1.35 "Ngủ thêm chút nữa đi, khách lạ. Việc hôm nay để mai làm cũng được mà"',
      'town/street night +dust @.5,.64,1.2 mien:stand@.7,.5 dan2:lie@.3,.88 hero:stand@.46*1.1 "Thụy Nguyệt Sứ Miên Hồ: nơi nàng đi qua, người ta cứ hẹn sang ngày mai, mãi mãi"',
      'town/street night +dust @.5,.7,1.6 hero:stagger@.5*1.3 "Mí mắt nặng như chì. Vậy thì chỉ làm một việc thật nhỏ thôi"',
      'valley/stream dawn +birds @.5,.74,1.5 hero:hold@.5*1.3 ladle@.62,.84*.9 "Múc một gáo nước suối dội lên đầu, đếm hơi thở: một, hai, ba. Bước một bước, rồi thêm một bước"',
      'town/street night +dust @.5,.64,1.2 hero:martial@.36*1.15 mien:fall@.68,.52*1.1 "Mê Hồn Hương của ta chưa từng thất bại!"',
      'town/street night - @.5,.64,1.5 hero:martial@.44*1.3 mien:stand@.7,.54 "Tại hạ làm trước, tỉnh sau"',
      'town/gate dawn +birds @.5,.62,1.1 bell@.5,.62*.9 hero:taichi@.4*1.15 dan:walk@.7 dan2:stand@.78 "Hiệp khách gõ chiếc chuông đồng đầu trấn, từng người tỉnh giấc"',
      'town/roofs dawn +birds ~sun@.3,.5,60 @.5,.7,1.5 mien:sit@.52,.82*1.25 "Kẻ đầu tiên tỉnh được sau ngần ấy năm. Giáo chủ đã dặn: gặp kẻ như thế thì chỉ cần nhớ mặt"',
      'town/street blood +redthread +redmist ~red@.72,.2,90 @.5,.4,1.15 "Ba ngày ngủ say của cả trấn thành một dòng khí đỏ chảy về Huyết Nguyệt đài, Giáo chủ chạm cấp bảy mươi ba"',
    ],
    // ---- 15: Hội đèn nghìn mặt ------------------------------------------------------------------------------------------------
    t15: [
      'town/square night +sparks ~moon@.72,.16,60 @.5,.6,1.05 hero:talk@.4*1.1 dan:walk@.62 dan2:stand@.2 "Rằm tháng Giêng, chợ Thanh Khê mở hội đèn, dân trấn góp tiền nhờ hiệp khách giữ quỹ sửa cầu gỗ"',
      'town/square night - @.64,.62,1.35 dien:talk@.62*1.2 dan2:stand@.44 dan:stand@.82 "Giữa hội có gánh xiếc lạ, gã chủ gánh mỗi lần quay đầu lại mang một khuôn mặt khác"',
      'town/square night +sparks @.5,.52,1.3 dien:point@.5*1.25 lamp@.64,.46*.9?1 lamp@.34,.5*.7 "Lại đây! Ở đây có cả nghìn điều thú vị. Ngươi nhìn đèn này chưa? Còn đèn kia? Kia nữa!"',
      'town/square night - @.5,.6,1.1 dan:walk@.3 dan2:walk@.42 dan:walk@.58 dan2:walk@.72 hero:stand@.5,.94*1.2 "Mỗi ngọn đèn hắn chỉ vào lại mở ra một ảo cảnh, thanh niên theo ánh đèn mất hút vào bóng đêm"',
      'town/square night - @.5,.68,1.4 hero:stagger@.46*1.25 lanterns@.5,.3*1.1 "Đèn nào cũng đẹp, chỗ nào cũng muốn xem. Đến khi giật mình, túi quỹ sửa cầu đã nhẹ bẫng"',
      'peaks/am night +fireflies ~moon@.74,.2,60 @.5,.64,1.3 su:zen@.6*1.1 "Khi mắt bị kéo về trăm phía, hãy nhìn một điểm. Một điểm thôi, rồi thở"',
      'bridge/bridge night +fireflies @.5,.62,1.35 hero:zen@.28,.66*1.2 dan:walk@.7,.6 "Nhắm mắt, chỉ giữ trong đầu cây cầu gỗ cần sửa; ảo cảnh nhòe dần, tiếng chân kẻ trộm hiện rõ"',
      'town/square night - @.6,.62,1.3 dien:stand@.66*1.2 hero:martial@.36*1.15 "Kẻ chỉ nhìn một điểm thì nghìn mặt của ta vô dụng. Lần sau gặp lại, ngươi sẽ không nhận ra ta đâu"',
      'town/square dawn +birds @.5,.62,1.2 hero:stand@.5*1.15 dan:sit@.3,.9 dan2:sit@.7,.92 "Thiên Diện biến mất, thanh niên tỉnh lại không nhớ mình đã bỏ dở bao nhiêu việc"',
      'altar blood +redthread ~red@.5,.24,100 @.5,.4,1.4 lanterns@.5,.22*.8 giao:cast@.5,.68*1.1 "Những canh giờ bị đèn nghìn mặt cuốn đi đều chảy về trăng máu, Giáo chủ chạm cấp bảy mươi lăm"',
    ],
    // ---- 20: Cầu Lạc Nhạn -----------------------------------------------------------------------------------------------------
    t20: [
      'bridge/bridge mist +drift ~sun@.74,.24,54 @.5,.58,1.15 hero:walk@.3,.65*1.1 phong:stand@.66*1.15 "Hộ tống thuốc lên núi, hiệp khách gặp kiếm khách áo đen trên cầu Lạc Nhạn"',
      'bridge/bridge mist - @.56,.58,1.35 phong:strike@.6*1.2 hero:stand@.32*1.1 "Gánh nước mà cũng đòi hành hiệp? Ta xuất được mười chiêu một hơi. Tránh đường!"',
      'bridge/bridge storm +rain +lightning @.5,.58,1.15 loi:strike@.44*1.2 phong:fall@.7,.54*1.15 "Một bóng người lao qua cầu như sét, Hàn Phong chỉ đỡ ba chiêu rồi văng vào thành cầu"',
      'bridge/bridge storm +rain +lightning @.55,.56,1.4 loi:martial@.6*1.3 hero:stand@.3*1.1 sabers@.78,.3*.6 "Tật Nguyệt Sứ Lôi Tốc ta một hơi xuất ba mươi đao. Kẻ chậm chỉ đáng làm bậc thềm cho kẻ nhanh"',
      'bridge/bridge night +rain @.5,.58,1.5 hero:taichi@.42*1.35 "Đao nhanh đến mức không nhìn kịp. Vậy thì không nhìn nữa, đứng yên, khí trầm đan điền, chờ"',
      'bridge/bridge night +rain @.5,.58,1.45 hero:taichi@.4*1.35 loi:strike@.64*1.25 sabers@.5,.3*.5 "Ba mươi đao chém tới, hiệp khách nghiêng người, lùi nửa bước, xoay vai. Đao nào cũng sượt qua"',
      'bridge/bridge night +rain @.55,.6,1.45 loi:stagger@.6*1.25 hero:strike@.38*1.3 "Đến đao thứ ba mươi mốt Lôi Tốc thở dốc, cán đòn gánh gõ đúng cổ tay hắn. Một thanh đao rơi xuống vực"',
      'bridge/bridge dawn +drift ~sun@.6,.3,56 @.5,.58,1.3 phong:stand@.36*1.2 hero:stand@.62*1.15 "Ngươi thắng bằng cách đứng yên? Ta không phục. Nhưng ta sẽ nhớ cái tên ấy"',
      'bridge/bridge dawn - @.7,.6,1.6 sabers@.7,.6*.9^-20 hero:stand@.4*1.2 "Hàn Phong đi rồi, thanh đao cắm trên ván cầu cũng biến mất, kẻ mê tốc độ đã nhặt đi món binh khí nhanh nhất giang hồ"',
      'altar blood +redmist ~red@.5,.24,100 @.5,.6,1.3 giao:stand@.5,.68*1.15 "Giáo chủ không giận, chỉ mỉm cười dưới mặt nạ: Kẻ biết chậm… hiếm lắm. Cứ để nó lớn"',
    ],
    // ---- 25: Tiếng sáo đêm mưa ------------------------------------------------------------------------------------------------
    t25: [
      'temple night +rain ~moon@.72,.18,58 @.5,.64,1.15 hero:stand@.36*1.15 dan:sit@.56,.9 dan2:sit@.64,.92 kid:sit@.6,.94 fire@.6,.88*.5 "Đêm mưa canh giữ miếu hoang cho đoàn người chạy nạn, từ xa vọng lại tiếng sáo xương lạnh như nước giếng"',
      'temple storm +rain +lightning @.72,.7,1.3 khuc:stand@.76,.82*1.2 flute@.66,.5*.4 "Âm Nguyệt Sứ Khúc U không đánh ai, chỉ thổi cho ngươi nghe điều ngươi vẫn thì thầm với chính mình"',
      'void/abyss void +redthread @.5,.7,1.35 ma:stand@.66,.86*1.4 hero:kneel@.32,.88*1.15 "Ngươi chỉ là kẻ gánh nước. Hàn Phong nhanh hơn, Tiểu Mộc lanh lợi hơn, đến cha mẹ mình là ai ngươi còn chẳng biết"',
      'temple night +rain @.4,.72,1.4 hero:kneel@.34*1.3 pole@.2,.9*.8 dan:sit@.66,.92 dan2:sit@.78,.94 "Tay buông đòn gánh, đoàn người sau lưng bắt đầu run rẩy vì người canh giữ họ đang run"',
      'peaks/am night +fireflies ~moon@.74,.2,58 @.55,.64,1.3 su:zen@.6*1.15 "Tâm ma không giết người bằng kiếm. Nó giết bằng cách bắt ngươi quên những gì ngươi đã làm được"',
      'temple night +rain @.4,.68,1.4 hero:talk@.4*1.3 board@.7,.74*.8?4 "Vậy tại hạ đếm: một trăm chuyến nước, một trấn được đánh thức, một túi quỹ giữ lại, một cây cầu không sập"',
      'temple storm +rain +lightning @.66,.7,1.4 khuc:stagger@.7,.84*1.25 flute@.7,.5*.5?1 hero:strike@.4*1.2 "Mỗi điều kể ra là một nốt lệch trong khúc sáo, đến điều thứ mười ống sáo xương nứt toác"',
      'temple storm +rain @.8,.7,1.5 khuc:stand@.82,.84*1.25 "Nhưng trong ngươi còn một chỗ trống chưa đếm được. Ngày nào ngươi nhìn vào đó, ta sẽ lại thổi"',
      'altar blood +redmist ~red@.5,.24,100 @.5,.6,1.5 giao:zen@.5,.68*1.2 "Giáo chủ nghe tin, lặng đi một lúc: hắn chưa từng đếm những gì mình đã có, chỉ đếm những gì còn thiếu"',
    ],
    // ---- 30: Đại sư huynh -----------------------------------------------------------------------------------------------------
    t30: [
      'interior/am lamp +dust @.55,.7,1.5 su:stand@.7*1.15 hero:stand@.34*1.15 moonmask@.81,.775*.5_ "Sau đêm mưa, sư phụ gọi lên am, trên bàn là chiếc mặt nạ trăng khuyết bằng bạc đã xỉn màu"',
      'interior/am lamp - @.6,.66,1.4 su:zen@.64*1.2 hero:stand@.36*1.1 "Hơn hai mươi năm trước ta mang về một đứa trẻ sống sót sau nạn đói, thông minh nhất đời ta"',
      'interior/am lamp - @.6,.66,1.5 su:talk@.64*1.2 "Nó tên Lệ Vô Khuyết, đại sư huynh của ngươi. Chỉ có một việc nó không chịu làm: gánh nước"',
      'interior/am lamp - @.4,.66,1.5 hero:talk@.36*1.25 su:stand@.68*1.1 "Vì sao ạ? Gánh nước đâu có gì khó"',
      'field/dry blood +ash ~red@.7,.2,90 @.5,.7,1.2 me:carry@.44,.84*1.1 "Mẹ nó gánh nước tưới ruộng suốt mùa hạn, ngày nào cũng gánh, rồi vẫn chết đói"',
      'altar blood +redmist ~red@.5,.24,110 @.5,.6,1.2 giao:cast@.5,.68*1.1 "Một đêm trăng máu nó lấy trộm Thôn Nguyệt Quyết rồi bỏ đi, nay là Huyết Nguyệt Giáo chủ"',
      'interior/am lamp - @.4,.66,1.4 hero:talk@.34*1.2 su:stand@.68*1.15 "Sư phụ gặp huynh ấy ở đâu ạ?"',
      'interior/am lamp - @.6,.66,1.7 su:zen@.64*1.3 "Ở một nơi ta đến muộn ba ngày"',
      'peaks/am dawn +leaves ~sun@.72,.4,56 @.5,.7,1.4 su:hold@.58*1.2 sword@.5,.86*.8 "Sáng hôm sau lão gọt chiếc đòn gánh thành thanh mộc kiếm, giữ nguyên vết khấc ở đầu: Kiếm này tên Đòn Gánh"',
      'peaks/am dusk +birds @.6,.66,1.3 crow@.7,.62*.8 letter@.64,.82*.8?1 su:stand@.4*1.1 hero:stand@.54*1.1 "Chiều ấy một con quạ đen đậu trước am, chân buộc phong thư viền đỏ"',
      'altar blood +redmist ~red@.5,.24,100 @.5,.5,1.7 giao:stand@.5,.68*1.2 letter@.38,.905*.7^-5 "Cứ gánh đi. Ta ở trên đỉnh, chờ xem ngươi gánh được bao xa"',
    ],
    // ---- 35: Ba làng một đêm --------------------------------------------------------------------------------------------------
    t35: [
      'village/fire night +embers ~moon@.74,.18,60 @.5,.5,1.05 smoke@.2,.88*.8 smoke@.52,.9 smoke@.84,.88*.8 hero:stand@.5,.94*1.2 "Cùng một đêm ba ngọn khói báo động bốc lên: làng Đông cháy kho lúa, làng Tây vỡ đê, làng Nam có người bị bắt"',
      'village/fire night +embers @.5,.6,1.3 bach:cast@.62*1.3 "Thiên Thủ Nguyệt Sứ Bách Tý có chín món binh khí, tay nào cũng bận. Ngươi chỉ có hai tay, cứu nổi nơi nào?"',
      'village/fire night +embers @.3,.7,1.2 hero:walk@.3*1.15 "Lao sang làng Đông, quay về làng Tây, rồi chạy tiếp sang làng Nam, nơi nào cũng chỉ cứu được một nửa"',
      'valley/dojo dawn +birds @.5,.72,1.3 moc:talk@.6*1.15 hero:stand@.36*1.1 board@.76,.78*.9?3 "Tiểu Mộc dựng tấm bảng tre ba cột: Chưa làm, Đang làm, Đã xong. Mình phải chọn trước, rồi nhờ người"',
      'valley/dojo dawn - @.7,.68,1.9 board@.62,.78*1.3?3 hero:point@.34*1.1 "Đê vỡ thì cả làng Tây chết đuối: việc ấy trọng yếu nhất. Kho lúa giao dân làng Đông, làng Nam nhờ Hàn Phong"',
      'bridge/bridge dusk +birds @.5,.58,1.4 phong:talk@.6*1.2 tassel@.5,.4*.4 hero:stand@.36*1.1 "Tua kiếm thắt một nút là hết nợ, ba nút là còn nợ, sẽ trả. Đi đi, làng Nam để ta"',
      'village/dyke dawn +birds @.5,.7,1.2 hero:martial@.34*1.2 dan:carry@.2 dan:carry@.5,.9 bach:stagger@.88,.84*.75 "Không còn chạy khắp nơi, dồn toàn lực đắp đê. Xong đê mới sang làng Đông"',
      'village/camp dusk @.5,.66,1.3 bach:stand@.6*1.3 "Ta có chín tay mà thua kẻ chỉ làm một việc một lúc? Cũng được. Đêm nay ta chỉ cần cả núi nhìn xuống ba đám khói"',
      'interior/am night +dust @.5,.72,1.2 hero:stand@.36*1.15 chair@.82,.9*.8^-75_ shards@.6,.92*.8_ basket@.16,.91*.8^70_ "Về tới am cửa mở toang, rương bị lục tung, xà nhà bị cạy từng thanh nhưng không mất gì"',
      'peaks/am night +fireflies ~moon@.72,.2,58 @.5,.66,1.3 su:talk@.6*1.2 hero:stand@.4*1.15 sword@.54,.86*.7 "Chúng tìm chiếc đòn gánh cũ trên xà nhà. Giờ nó nằm trên lưng ngươi rồi. Giữ cho kỹ"',
      'village/camp blood +redmist ~red@.7,.2,90 @.5,.4,1.1 smoke@.2,.92*.6 smoke@.82,.92*.6 "Nỗi hoảng loạn một đêm của ba nghìn người chảy về Huyết Nguyệt đài, Giáo chủ chạm cấp tám mươi ba"',
    ],
    // ---- 40: Áo giáp lưu ly ---------------------------------------------------------------------------------------------------
    t40: [
      'arena/plaza day +birds @.5,.62,1.05 ngoc:stand@.6*1.2 dan:stand@.2 dan:stand@.86 "Ở kinh thành, một kẻ khoác giáp lưu ly trong suốt thách đấu khắp các võ đường, không thanh kiếm nào để lại nổi một vết xước"',
      'arena/plaza day +dust @.62,.64,1.45 ngoc:talk@.62*1.3 hero:stand@.36*1.15 "Ta không ra tay khi chưa hoàn hảo, chuẩn bị mười năm cho một trận. Còn ngươi, mộc kiếm sứt mẻ thế kia?"',
      'arena/plaza day - @.4,.7,1.9 sword@.36,.82*.7 hero:talk@.52*1.3 "Đúng là sứt mẻ. Mỗi vết sứt là một lần tại hạ đánh trật. Nhưng tại hạ vẫn đánh tiếp"',
      'arena/plaza day +dust @.5,.64,1.3 hero:strike@.38*1.3 ngoc:stand@.6*1.3 dan:stand@.16 dan:stand@.88 "Chém, kiếm bật ra. Chém nữa, lại bật. Người xem cười ồ, nhưng mũi kiếm lần nào cũng trúng đúng một điểm trên vai giáp"',
      'arena/plaza day - @.6,.62,1.4 ngoc:cast@.64*1.35 "Vô ích! Một trăm nhát vụng về không bằng một nhát hoàn hảo"',
      'arena/plaza day +sparks @.55,.62,1.5 hero:strike@.4*1.35 ngoc:fall@.66*1.3 shards@.62,.78*.8 "Nhát thứ một trăm lẻ một, một tiếng tách rất khẽ. Vết rạn lan ra như mạng nhện, giáp lưu ly vỡ vụn như sương sớm"',
      'arena/plaza day +sparks @.5,.7,1.7 shards@.5,.84*1.1 hero:zen@.5*1.3 "Một nhát hoàn hảo, không ai chờ nổi. Một trăm nhát chưa hoàn hảo, làm được ngay hôm nay"',
      'arena/plaza dusk @.64,.72,1.8 ngoc:kneel@.6*1.3 shards@.5,.86*.8 "Không thể… Giáo chủ nói chỉ thứ không tì vết mới đáng tồn tại"',
      'altar blood +redmist ~red@.5,.24,100 @.5,.6,1.4 giao:hold@.5,.68*1.2 shards@.56,.56*.5 "Giáo chủ nhìn mảnh giáp vỡ rất lâu rồi bóp nát: Khuyết thì vứt"',
    ],
    // ---- 45: Viên đan không ngủ -----------------------------------------------------------------------------------------------
    t45: [
      'peaks/path morning +birds ~sun@.76,.2,54 @.5,.66,1.1 dan:stand@.2,.9 dan2:stand@.3,.9 dan:stand@.4,.88 dan2:stand@.52,.86 hero:talk@.74,.74*1.15 "Danh tiếng lan khắp giang hồ, người cần giúp xếp hàng dài trước cổng núi, hiệp khách nhận hết, ngày làm đêm cũng làm"',
      'peaks/am dusk @.62,.68,1.5 kho:talk@.64*1.2 pill@.5,.78*.8 hero:stand@.36*1.15 "Một lão thầy thuốc gầy như que củi dâng viên đan đỏ: Uống vào khỏi cần ngủ, làm được gấp ba"',
      'peaks/am dusk - @.4,.68,1.5 phong:talk@.36*1.25 pill@.6,.76*.7 "Gấp ba ư? Cho ta ba viên. Ta không có thì giờ để thua một kẻ gánh nước"',
      'valley/dojo night +dust ~moon@.74,.2,56 @.5,.68,1.2 hero:strike@.34*1.2 dan:fall@.64*1.1 dan:fall@.76 "Ba ngày không ngủ đánh lui ba toán cướp, bảy ngày chữa đê dựng trường, đến ngày thứ mười tay cầm kiếm run lẩy bẩy"',
      'peaks/am night ~moon@.74,.2,56 @.66,.7,1.4 kho:cast@.66*1.25 "Ta chẳng cần đánh ai. Ta chỉ giúp các ngươi tự vắt cạn mình. Cây càng tươi, lúc khô càng nhanh"',
      'valley/dojo morning +leaves @.5,.72,1.5 hero:fall@.5*1.3 "Ngày thứ mười một ngã quỵ giữa sân, nội lực tích cóp bao năm rò ra như nước khỏi thùng thủng"',
      'interior/am morning +dust @.5,.7,1.3 hero:lie@.46,.92*1.2 moc:talk@.66*1.2 "Tiểu Mộc: Mà không nghỉ thì đệ trói vào giường thật đấy! Sư phụ dặn: ngủ cũng là luyện công"',
      'peaks/am dusk +birds @.5,.66,1.4 su:zen@.6*1.2 hero:sit@.38,.88*1.1 "Cung căng mãi thì gãy. Đêm nay ngươi ngủ, mai ngươi ngủ. Việc thiên hạ không chạy mất đâu"',
      'peaks/am morning +birds +petals @.5,.66,1.3 kho:stagger@.66*1.25 hero:taichi@.38*1.25 pill@.5,.84*.5 "Ba ngày nghỉ nội lực lại đầy. Lần này Khô Vinh tới, hiệp khách trả lại viên đan, hóa giải Khô Mộc Chưởng bằng một hơi thở dài"',
      'bridge/bridge dusk @.6,.6,1.6 phong:stand@.5*1.3 pill@.62,.5*.5 "Chỉ có Hàn Phong không trả đan, hắn lặng lẽ cất hai viên còn lại vào ngực áo, mắt thâm quầng mà sáng rực"',
      'village/camp blood +redmist +redthread ~red@.7,.2,90 @.5,.6,1.1 dan:kneel@.3,.9 dan:kneel@.5,.92 dan:kneel@.7,.9 "Hàng trăm người đã nuốt đan của Khô Vinh, sức lực đốt cạn chảy về Huyết Nguyệt đài, Giáo chủ chạm cấp tám mươi bảy"',
    ],
    // ---- 50: Trăng không trên đỉnh tuyết --------------------------------------------------------------------------------------
    t50: [
      'peaks/snow snowy +snow ~moon@.3,.22,68 @.5,.62,1.1 hero:walk@.3,.83*1.1 "Sư phụ gửi lên Tuyết Phong bế quan, trên đỉnh không có ai, chỉ có một am tranh và một chiếc bồ đoàn cũ"',
      'peaks/snow snowy +snow @.4,.62,1.3 hero:sit@.42,.84*1.15 thien:float@.66,.72*1.2 "Đêm thứ ba, một vị sư già bước ra từ ánh trăng, thân mờ như khói, chân không chạm tuyết"',
      'peaks/snow snowy +snow @.55,.62,1.45 thien:zen@.6*1.3 hero:sit@.34,.86*1.1 "Đừng sợ, thân lão đang ngồi ở một nơi rất xa. Lão là Không Nguyệt, đi khắp nơi bằng hồn, xem ai đang thức"',
      'peaks/snow snowy +snow @.4,.64,1.5 hero:talk@.36*1.3 thien:stand@.66*1.2 "Tại hạ muốn mạnh hơn để thắng Huyết Nguyệt Giáo chủ, xin đại sư dạy võ công"',
      'peaks/snow snowy +snow @.55,.6,1.6 thien:zen@.6*1.35 "Lão không có võ công, chỉ có một câu hỏi: ngươi luyện để thắng hắn, hay để giữ yên thùng nước của mình?"',
      'peaks/snow snowy +snow @.5,.7,1.5 hero:sit@.5,.86*1.35 "Bảy mươi bảy ngày ngồi giữa tuyết, ban đầu nghĩ về Giáo chủ, rồi chỉ còn hơi thở, rồi chỉ còn tuyết rơi"',
      'peaks/snow dawn +snow ~sun@.7,.4,52 @.5,.7,1.4 hero:taichi@.5,.84*1.35 "Sáng ngày thứ bảy mươi tám nội lực tự xoay như dòng suối đầu nguồn: phản bổn hoàn nguyên, cảnh giới Tiên thiên"',
      'peaks/snow snowy +snow @.5,.5,1.4 thien:talk@.6,.78*1.3 hero:stand@.36*1.15 "Hắn muốn trăng của mình tròn, ngươi chỉ cần nước của mình yên. Trăng không ở trong tay ai cả"',
      'peaks/snow snowy +snow +dust ~pale@.3,.22,68 @.5,.5,1.3 thien:float@.62,.7*1.2 "Vị sư tan vào ánh trăng, nhưng mỗi lần ông cất lời chỉ dạy vầng trăng lại mờ đi một chút, như có ai đang trả giá"',
      'altar blood +redmist ~red@.5,.24,120 @.5,.6,1.2 giao:cast@.5,.68*1.2 dan:kneel@.3,.78 dan2:kneel@.7,.8 "Cùng đêm ấy Giáo chủ phá ải cấp chín mươi, bước vào Võ lâm chí tôn, nuốt nội lực của cả một môn phái"',
    ],
    // ---- 55: Tấm gương đồng ---------------------------------------------------------------------------------------------------
    t55: [
      'valley/dojo morning +birds ~sun@.76,.2,54 @.5,.7,1.2 phong:stand@.62*1.2 hero:stand@.36*1.15 dan:stand@.86 "Hàn Phong vừa phá ải Tiên thiên trước hiệp khách một tháng, giang hồ bàn tán kiếm khách áo đen đã vượt xa kẻ gánh nước"',
      'valley/dojo day - @.7,.62,1.5 kinh:talk@.7*1.25 mirror@.5,.58*.7 "Kính Nguyệt Sứ Ảnh Song xin chỉ cho ngươi thấy: ngươi luôn kém người khác một bước"',
      'field/green day +leaves +sparks @.5,.66,1.3 hero:martial@.34*1.2 hero:martial@.62*1.2 mirror@.5,.3*.5 "Từ tấm gương đồng một hiệp khách khác bước ra, đánh y hệt từng chiêu, bên cạnh bóng Hàn Phong cười nhạo"',
      'interior/am day - @.5,.68,1.4 hero:zen@.34*1.25 phong:stand@.72*1.1 mirror@.52,.42*.8_ "Càng nhìn người trong gương, càng đánh như người trong gương. Càng nhìn Hàn Phong, càng muốn vội"',
      'valley/dojo dusk +dust @.5,.5,1.6 mirror@.5,.46*1.2 moonmask@.5,.46*.7 "Trong một chớp mắt người trong gương đeo mặt nạ trăng khuyết, chớp mắt lần nữa đã biến mất, ngay Ảnh Song cũng sững người"',
      'peaks/path day +birds @.6,.68,1.4 phong:talk@.64*1.25 hero:stand@.34*1.1 "Ngươi nhìn ta làm gì? Ta có đi đường của ngươi đâu. Nhìn hôm qua của ngươi ấy!"',
      'peaks/path morning +birds @.5,.7,1.3 hero:carry@.38,.84*1.15 "Thôi nhìn gương, nhớ lại mình ngày đầu: chuyến nước thứ mười, vai rớm máu. Nay vai đã chai, kiếm đã vững. Thế là đủ"',
      'town/square day +sparks @.5,.7,1.5 hero:kneel@.44*1.3 kid:fall@.56,.88 kinh:stand@.76*1.2 "Rồi làm điều tấm gương không bắt chước được: cúi xuống đỡ một đứa trẻ vấp ngã giữa trận"',
      'valley/dojo dusk - @.5,.5,1.7 mirror@.5,.5*1.1?1 kinh:stagger@.7,.82*1.2 "Gương của ta chỉ sao lại cú đánh, không sao lại được lòng tốt"',
      'valley/dojo dusk +birds @.46,.7,1.6 phong:stand@.46*1.3 mirror@.3,.88*.8?1 "Trận tan, chỉ còn Hàn Phong đứng trước mảnh gương vỡ rất lâu, trong gương hắn thấy mình đi sau đúng một bước"',
      'town/street blood +redthread ~red@.72,.2,90 @.5,.4,1.2 mirror@.7,.4*.6?1 "Những ai bị Ảnh Song bắt soi gương, ghen tị mà bỏ dở việc mình, đều thành thức ăn cho trăng máu"',
    ],
    // ---- 60: Võ đường giữa băng -----------------------------------------------------------------------------------------------
    t60: [
      'valley/dojo snow +snow ~sun@.7,.2,42 @.5,.68,1.2 hero:talk@.36*1.15 moc:stand@.62*1.1 board@.8,.76*.9?4 dan:martial@.86 "Mở một võ đường nhỏ dưới chân núi Vân Mộng, Tiểu Mộc làm đại đệ tử, ngày ngày treo bảng tre ba cột trước cổng"',
      'valley/dojo snowy +snow ~pale@.3,.22,60 @.5,.66,1.2 suong:stand@.5,.8*1.25 ice@.22,.88*1.3 ice@.8,.9*1.5?3 "Mùa đông Sương Nguyệt Sứ Lãnh Tịch tới, nàng không nói một lời, băng mọc lên giữa sân chia võ đường thành từng ô cô lập"',
      'valley/dojo snowy +snow @.5,.7,1.6 suong:cast@.5,.84*1.35 ice@.32,.9*1.3 ice@.72,.9*1.4?2 "Ai cũng một mình mà mạnh. Cần gì người khác? Nhờ vả là yếu đuối"',
      'valley/dojo snowy +snow @.5,.74,1.5 hero:strike@.44,.88*1.3 ice@.64,.9*1.5?2 ice@.2,.9*1.2 "Đập băng một mình suốt một đêm, đập được một thước băng mọc lại hai thước, hơi lạnh ngấm dần vào xương"',
      'valley/dojo snowy +snow @.55,.72,1.5 moc:talk@.66*1.25 hero:kneel@.36*1.2 ice@.86,.9*1.3?2 ice@.14,.9*1.1 "Sư huynh luôn bảo đệ biết nhờ người. Sao giờ lại không nhờ ai?"',
      'valley/dojo dawn +snow ~sun@.7,.4,48 @.5,.7,1.15 dan:taichi@.18 dan2:taichi@.34 hero:taichi@.5*1.2 dan:taichi@.66 dan2:taichi@.82 ice@.26,.88*.9 ice@.42,.88*.9 ice@.58,.88*.9 ice@.74,.88*.9 "Sững người rồi gọi lớn, từng đệ tử trong từng ô băng gọi đáp lại, họ đếm nhịp cùng vận công vào một điểm"',
      'valley/dojo dawn +snow +sparks @.5,.72,1.4 hero:martial@.4*1.3 suong:fall@.66*1.25 ice@.84,.9*1.2?2 ice@.1,.9 "Mười lăm luồng nội lực nhỏ hợp thành một dòng, băng nứt toác, Lãnh Tịch bị đẩy lùi ba trượng"',
      'valley/dojo morning +snow @.62,.7,1.6 suong:stand@.62*1.35 hero:stand@.36*1.15 ice@.92,.9*.8 "Ta đã một mình suốt hai mươi năm. Thì ra… có thể không phải thế"',
      'peaks/path morning +birds +snow @.5,.7,1.2 moc:walk@.4,.84*1.15 hai:stand@.9 "Băng tan, Tiểu Mộc xuống núi chặt tre làm bảng mới, ba hôm sau mới về, cười hì hì như mọi khi"',
      'altar blood +redmist ~red@.5,.24,100 @.5,.6,1.2 giao:stand@.5,.68*1.2 "Giáo chủ chẳng bao giờ nhờ ai, hắn chỉ lấy. Cấp chín mươi ba"',
    ],
    // ---- 65: Lão ngư trên đảo đá ----------------------------------------------------------------------------------------------
    t65: [
      'shore/rocks dawn +birds ~sun@.3,.36,56 @.5,.6,1.05 hero:walk@.3,.84*1.1 "Nghe lời Không Nguyệt ra biển tìm một người, trên đảo Thiết Thạch chỉ có một lão ngư phủ say khướt ngồi vá lưới"',
      'shore/hut day +birds @.6,.64,1.35 hai:talk@.66*1.25 hero:stand@.36*1.1 net@.5,.4*.5 "Ta là Mạc Trấn Hải, ba mươi năm không thu đồ đệ. Đứa cuối cùng ta dạy, biển chỉ trả về một nửa. Ra kia đứng đón sóng!"',
      'shore/rocks storm +rain @.5,.74,1.3 hero:fall@.4,.86*1.25 hai:sit@.78,.84*1.1 "Con sóng đầu tiên quật ngã sấp, con sóng thứ hai lôi ra xa, lão ngư không thèm nhìn, vẫn uống rượu"',
      'shore/rocks storm +rain @.5,.7,1.45 hai:point@.62*1.3 hero:martial@.36*1.2 "Ngươi chống lại sóng thì sóng thắng. Biển không bao giờ mệt. Học cách thở cùng nó!"',
      'shore/rocks morning +birds @.5,.7,1.4 hero:taichi@.36,.86*1.3 "Ba tháng đứng trước biển học được nhịp của sóng: dồn tới, rút về, dồn tới, nội lực cũng dồn và rút theo"',
      'shore/hut dusk +birds @.52,.62,1.7 net@.5,.55*1.3?1 hai:sit@.7,.84*1.15 "Tấm lưới lão vá mỗi chiều có một nút thắt vụng về của trẻ con, lão vá mọi chỗ rách, trừ chỗ ấy"',
      'shore/rocks day +sparks @.5,.6,1.1 hai:strike@.62*1.35 hero:stand@.34*1.1 "Một sáng lão ngư vung một quyền ra khơi, mặt biển rẽ đôi trăm trượng"',
      'shore/rocks dusk +birds @.5,.7,1.4 hai:zen@.62*1.3 hero:stand@.36*1.15 "Mạnh không phải đánh mạnh. Mạnh là ngày nào cũng ra đứng trước biển, kể cả ngày biển dữ nhất"',
      'altar blood +redmist ~red@.5,.24,100 @.5,.6,1.3 giao:zen@.5,.68*1.2 "Giáo chủ cảm thấy ở phương nam có một nguồn nội lực đang lớn dần, đều như thủy triều. Hắn nheo mắt"',
    ],
    // ---- 70: Nguyệt thực ------------------------------------------------------------------------------------------------------
    t70: [
      'valley/dojo eclipse +dust @.5,.66,1.15 vong:walk@.54,.84*1.3 chain@.4,.9*.7 hero:stand@.2*1.1 "Đêm nguyệt thực trời tối như mực, cổng võ đường cài then từ bên trong bỗng mở toang, gã khổng lồ kéo xích sắt đen bước vào"',
      'valley/dojo eclipse - @.62,.66,1.6 vong:stand@.64*1.4 hero:stand@.34*1.15 "Thực Nguyệt Sứ Vô Vọng, đứng đầu Thập Nguyệt Sứ. Ta đến để cho ngươi biết: mọi cố gắng đều vô nghĩa"',
      'valley/dojo eclipse +redmist @.5,.8,1.3 dan:sit@.2,.92 dan2:sit@.35,.94 moc:sit@.5,.94 dan:sit@.68,.92 vong:cast@.7,.74*1.3 "Hắc Thủy tràn lên, ai bị chạm vào đều buông binh khí ngồi thụp xuống thì thầm: Làm gì cũng thế thôi"',
      'valley/dojo eclipse +sparks @.5,.7,1.3 hero:strike@.34*1.25 vong:martial@.64*1.4 "Lao lên ba mươi chiêu, năm mươi chiêu, gọi lớn: Hàn Phong, giữ cánh trái! Sau lưng có tiếng kiếm rời vỏ"',
      'valley/dojo eclipse - @.46,.7,1.6 hero:stagger@.4*1.3 phong:strike@.6*1.3 "Mũi kiếm ấy không đâm về phía Vô Vọng, nó xuyên qua vai hiệp khách từ phía sau"',
      'valley/dojo eclipse - @.62,.66,1.6 phong:stand@.62*1.3 sabers@.8,.5*.4 hero:hurt@.3,.84*1.2 "Ta đã chán nhìn lưng ngươi. Từ nay hãy gọi ta là Nguyệt Sứ thứ mười một"',
      'valley/dojo eclipse +embers +ash @.5,.62,1.2 fire@.3,.84*1.1 fire@.7,.84*1.2 board@.5,.78*.8?3 "Võ đường cháy rụi, tấm bảng tre ba cột gãy làm đôi. Mai ngươi sẽ tự bỏ cuộc, ta không cần giết"',
      'interior/am night +dust @.5,.7,1.4 hero:lie@.5,.92*1.2 "Bảy ngày nằm im, vết kiếm trên vai không đau bằng câu hỏi: trăm chuyến nước, nghìn ngày luyện kiếm, một người bạn… rốt cuộc để làm gì?"',
      'valley/dojo dawn +birds ~sun@.7,.4,52 @.5,.74,1.5 moc:talk@.5*1.25 board@.7,.78*1.1?5 "Đệ dựng lại bảng rồi, cột Đã xong vẫn còn nguyên. Lửa không đốt được, kẻ phản bội cũng không lấy đi được"',
      'valley/dojo blood +redmist +redthread ~red@.7,.2,90 @.5,.5,1.1 "Nỗi tuyệt vọng của cả võ đường cuộn về Huyết Nguyệt đài như một dòng sông đen, Giáo chủ chạm cấp chín mươi lăm"',
      'altar blood +redmist ~red@.5,.24,100 @.5,.55,1.6 giao:zen@.5,.68*1.2 "Nó sẽ đứng dậy, ta biết. Ta cũng từng nằm bảy ngày như thế, bên cạnh mẹ ta"',
    ],
    // ---- 75: Chuyến nước thứ mười nghìn ---------------------------------------------------------------------------------------
    t75: [
      'valley/stream dawn +birds ~sun@.7,.4,52 @.5,.7,1.3 hero:carry@.4,.86*1.2 "Sáng ngày thứ tám đứng dậy, vai còn quấn băng, xuống suối gánh nước, chỉ vì đó là việc nhỏ nhất có thể làm"',
      'valley/stream morning +leaves @.5,.72,1.35 moc:talk@.6*1.25 hero:stand@.36*1.15 bucket@.2,.92*.9 "Đệ đếm rồi: đây là chuyến nước thứ mười nghìn kể từ ngày lên núi. Mười nghìn lần, không lần nào giống lần nào, mà lần nào cũng xong"',
      'valley/dojo day +ash @.5,.82,1.7 hero:zen@.42,.9*1.3 tassel@.62,.9*.6 "Trong đống tro võ đường nhặt được dải tua kiếm của Hàn Phong thắt đúng ba nút, vết kiếm trên vai lệch khỏi tim đúng một đốt ngón tay"',
      'valley/dojo eclipse +redmist ~crescent@.3,.2,60 @.5,.74,1.2 vong:stand@.64,.82*1.4 hero:stand@.34*1.2 "Đêm trăng non, Vô Vọng trở lại, Hắc Thủy dâng lên, nhưng lần này hiệp khách đứng giữa nước đen mà chân không run"',
      'valley/dojo eclipse - @.62,.7,1.5 vong:cast@.66*1.4 "Sao ngươi còn đứng được? Ta đã cho ngươi thấy cố gắng là vô nghĩa! Đến bạn ngươi cũng bỏ ngươi rồi!"',
      'valley/dojo eclipse - @.42,.72,1.5 hero:martial@.36*1.35 "Có thể vô nghĩa với ngươi. Với tại hạ, chuyến nước hôm nay đã xong. Thế là đủ để làm thêm chuyến nữa"',
      'valley/stream night +ripple ~crescent@.3,.2,60 @.5,.8,1.5 hero:taichi@.4,.88*1.3 sword@.62,.9*.6 "Mộc kiếm vạch một vòng tròn trên mặt nước. Thủy Trung Nguyệt: Hắc Thủy lặng xuống, soi bóng vầng trăng non, xích sắt gãy làm ba"',
      'valley/dojo eclipse +redmist @.5,.72,1.5 vong:kneel@.5*1.4 giao:stand@.7,.62*1.2 "Từ bóng tối một bàn tay áo trắng đặt lên đỉnh đầu hắn, nội lực cả đời của thuộc hạ mạnh nhất bị hút cạn trong một hơi"',
      'valley/dojo eclipse - @.7,.62,1.6 giao:cast@.7*1.35 "Kẻ thua thì không còn dùng được. Hẹn ngươi ở cấp tám mươi, lúc ấy ta sẽ đích thân đến"',
      'valley/dojo dawn +drift @.5,.76,1.6 vong:lie@.5,.9*1.3 hero:kneel@.34*1.2 "Giáo chủ biến mất, Vô Vọng thều thào: Hắn không dừng ở chín mươi chín đâu. Còn thứ đứng sau lưng hắn… nó chẳng cần hắn thắng"',
    ],
    // ---- 80: Lần đầu giao thủ -------------------------------------------------------------------------------------------------
    t80: [
      'peaks/summit blood +redmist ~red@.5,.24,100 @.5,.6,1.2 giao:stand@.7,.7*1.25 hero:stand@.3*1.15 "Đêm rằm trên đỉnh Vân Mộng trăng nhuốm đỏ, Giáo chủ đứng trên ngọn tùng, áo trắng không vướng hạt bụi"',
      'peaks/summit blood +redmist @.64,.62,1.5 giao:talk@.66*1.35 "Ta là Lệ Vô Khuyết, đại sư huynh của ngươi. Ta đã chờ ngươi gánh nước suốt tám mươi cấp"',
      'peaks/summit blood +sparks @.5,.66,1.4 giao:strike@.5,.8*1.35 hero:fall@.36*1.2 sword@.3,.4*.5^20 slash@.5,.55*1.5^-18 "Huyết Nguyệt Trảm rơi xuống như một mảnh trăng vỡ, hiệp khách đỡ bằng Đòn Gánh, mộc kiếm rạn, cánh tay tê dại"',
      'peaks/summit blood +redmist +sparks @.5,.7,1.4 hero:kneel@.36*1.3 giao:cast@.62*1.35 slash@.5,.5*1.3^10 "Mười chiêu sau đã quỳ gối, mỗi lần chạm tay Thôn Nguyệt Quyết rút đi một phần nội lực"',
      'peaks/summit blood +redmist @.5,.66,1.4 su:martial@.5*1.3 giao:strike@.72*1.25 hero:kneel@.24,.84 slash@.6,.55*1.3^-10?1 "Đủ rồi, Vô Khuyết! Muốn chạm vào nó, bước qua xác ta trước"',
      'peaks/summit blood +sparks +dust @.5,.66,1.5 su:strike@.44*1.3 giao:strike@.62*1.3 slash@.53,.56*1.2?1 "Một chưởng của thầy, một chưởng của trò cũ, khi bụi tan sư phụ vẫn đứng nhưng nội lực sáu mươi năm đã tán đi như khói"',
      'peaks/summit blood +redmist @.64,.64,1.5 giao:talk@.64*1.35 su:stagger@.36*1.2 "Người vẫn ngu ngốc như xưa, vì một kẻ gánh nước mà bỏ cả đời tu vi. Người đã kể cho nó nghe về ba ngày ấy chưa?"',
      'peaks/summit blood +redmist @.6,.7,1.7 giao:back@.7*1.35 "Tùng Hạc lặng im, Giáo chủ quay lưng bỏ đi, dưới tay áo trắng những ngón tay hắn đang run"',
      'interior/am lamp +dust @.5,.7,1.4 su:sit@.6,.9*1.25 hero:sit@.36,.9*1.15 "Ta mất nội lực nhưng vẫn gánh được nước. Còn nó có hai tay mà chưa từng gánh được gì cho ai. Về ba ngày ấy… đợi ta đủ can đảm đã"',
    ],
    // ---- 82: Mười tháng trên núi tuyết ----------------------------------------------------------------------------------------
    t82: [
      'peaks/snow snowy +snow ~pale@.3,.22,68 @.5,.62,1.2 thien:stand@.62,.8*1.25 hero:stand@.34*1.1 "Đưa đứa trẻ lên Tuyết Phong. Lần này không phải bảy mươi bảy ngày"',
      'peaks/snow snowy +snow @.6,.62,1.5 thien:talk@.62*1.3 hero:sit@.36,.86*1.15 "Ngươi thua vì nhìn tay hắn, tay hắn nhanh hơn. Lần này hãy học nhìn tâm hắn"',
      'town/street blood +redmist +redthread +dust @.5,.64,1.15 thien:float@.38,.7*1.1 hero:float@.54,.7*1.1 dan:lie@.7,.9 "Mỗi đêm hồn Không Nguyệt dẫn hồn hiệp khách rời thân, đi qua trấn ngủ say, ba làng cháy, võ đường đổ nát"',
      'void/abyss void +redthread ~red@.72,.18,40 @.5,.55,1.1 hero:float@.4,.78*1.2 "Thấy những sợi chỉ đỏ nối từ từng người khổ đau về một phương, mọi sợi chỉ đều dẫn về Huyết Nguyệt đài"',
      'void/abyss void +redthread ~red@.72,.18,40 @.55,.5,1.15 thien:float@.62,.74*1.2 "Hắn không gom vàng, không gom đất, hắn gom khổ đau của người khác. Ngươi phải tự đến mà nhìn"',
      'peaks/snow snowy +snow @.5,.7,2 hero:zen@.5,.84*1.5 thread@.5,.62*.6 "Đêm cuối cúi nhìn xuống ngực mình và lạnh người: ở đó cũng có một sợi chỉ đỏ, mảnh hơn mọi sợi khác"',
      'peaks/snow dawn +snow ~sun@.7,.4,50 @.5,.62,1.15 hero:walk@.4,.84*1.2 "Mười tháng sau xuống núi, mắt vẫn vậy nhưng nhìn một người là thấy được nỗi sợ người ấy đang giấu"',
      'altar blood +redmist ~red@.5,.24,120 @.5,.6,1.2 giao:cast@.5,.68*1.2 "Cùng mùa ấy Giáo chủ bế quan trên Huyết Nguyệt đài, nuốt nội lực của ba môn phái, cấp chín mươi tám"',
    ],
    // ---- 84: Thanh Khê không ngủ ----------------------------------------------------------------------------------------------
    t84: [
      'village/camp blood +redmist ~red@.7,.2,90 @.5,.62,1.1 "Huyết Nguyệt Giáo kéo quân về trấn Thanh Khê, nơi từng đánh thức cả trấn, Giáo chủ muốn nuốt trọn nó trong một đêm"',
      'town/gate night +sparks ~moon@.72,.16,56 @.5,.64,1.3 dan:martial@.28*1.1 dan2:talk@.42 hero:stand@.58*1.15 dan:stand@.76 "Chúng ta không biết võ, nhưng hiệp khách từng gõ chuông cho cả trấn tỉnh dậy. Đêm nay cả trấn thức cùng!"',
      'town/street night +sparks @.5,.64,1.15 tho:martial@.2*1.1 dan2:walk@.4 kid:stand@.56 moc:point@.7*1.15 board@.86,.7*.7?3 "Thợ rèn đúc giáo, bà bán bánh nấu cơm, trẻ con giữ đuốc, Tiểu Mộc chia việc trên bảng tre"',
      'town/gate night +embers @.5,.7,1.4 moc:talk@.4*1.2 hero:stand@.58*1.15 su:stand@.74*1.1 "Kế giữ trấn chỉ ba người biết, vậy mà quân Huyết Nguyệt đánh thẳng vào cửa bắc, chỗ cố ý bỏ ngỏ, lại mang sẵn ván bắc qua hào"',
      'town/gate blood +redmist @.5,.6,1.4 giao:stand@.5,.7*1.35 "Một đám phàm nhân thì làm được gì? Thôn Nguyệt Quyết chỉ cần một hơi là hút sạch"',
      'town/gate blood +redmist +sparks @.5,.66,1.3 hero:martial@.4*1.3 giao:strike@.64*1.3 dan:martial@.2 dan2:martial@.84 "Không ai sợ, không ai bỏ cuộc, không có nỗi sợ để hút Thôn Nguyệt Quyết chỉ hút được gió"',
      'town/gate dawn +birds ~sun@.3,.5,54 @.5,.62,1.3 giao:back@.7*1.25 hero:stand@.36*1.15 "Trời rạng đông Giáo chủ rút lui, hắn không thua nhưng cũng chẳng thắng, đó là lần đầu tiên kể từ ngày hắn rời núi"',
      'town/gate dawn - @.6,.62,1.6 giao:talk@.66*1.35 "Thứ ngươi có ta không hút được. Thú vị thật. Mà này, ngươi nên đếm lại người nhà mình đi"',
      'town/street dawn +drift @.5,.66,1.6 hero:zen@.5*1.3 dan:stand@.2 dan2:stand@.34 moc:stand@.68 dan:stand@.82 "Có người trong chúng ta đã nói ra kế giữ trấn, nhìn quanh những gương mặt thân quen và lần đầu tiên không muốn nghĩ tiếp"',
    ],
    // ---- 86: Đáy biển không trăng ---------------------------------------------------------------------------------------------
    t86: [
      'shore/rocks day +birds @.5,.62,1.2 hai:talk@.6*1.25 hero:stand@.36*1.15 "Đánh với kẻ hút nội lực mà đem nội lực ra đọ thì khác gì đổ nước vào thùng thủng. Theo ta xuống biển"',
      'shore/deep deep +bubbles @.5,.62,1.1 hai:point@.34*1.25 hero:sit@.64,.86*1.2 "Dưới đáy biển sâu trăm trượng, nơi trăng không soi tới, có một hang đá, mỗi ngày chỉ ngoi lên thở một lần"',
      'shore/deep deep +bubbles @.5,.7,1.4 hai:martial@.64*1.3 hero:zen@.38*1.2 "Dưới này không ai thấy ngươi luyện, không ai khen. Chỉ có ngươi với ngươi. Luyện được thế mới là luyện thật"',
      'shore/deep deep +bubbles @.5,.7,1.4 hero:taichi@.5*1.4 "Chín tháng học cách giữ nội lực như biển giữ nước: không giữ chặt mà để nó tuần hoàn, rút đi một gáo triều lại dâng một gáo"',
      'shore/hut dusk +birds @.55,.64,1.5 hai:sit@.64,.84*1.2 hero:sit@.4,.86*1.1 net@.5,.4*.4 "Đứa học trò cuối của ta là con trai ta, Mạc Vọng. Một cơn bão lấy hết bạn thuyền của nó, nó bơi về hỏi: Cố gắng để làm gì, cha?"',
      'shore/hut dusk - @.45,.66,1.6 hero:zen@.4*1.3 chain@.7,.6*.5 "Nhớ lại gã khổng lồ kéo xích đen, kẻ muốn cả thiên hạ tin mọi cố gắng đều vô nghĩa. Vô Vọng… chính là con của lão ngư"',
      'shore/deep deep +bubbles +sparks @.5,.7,1.5 hai:strike@.64*1.35 hero:stagger@.4*1.3 "Ngày cuối lão ngư tung một quyền chín mươi lăm cấp vào ngực, lực quyền tan vào người như sóng tan vào biển"',
      'shore/rocks dawn +birds ~sun@.3,.4,56 @.5,.64,1.5 hai:talk@.62*1.3 hero:stand@.36*1.2 "Giờ hắn có hút, ngươi cũng chẳng cạn. Ta dạy để lần sau gặp nó, ngươi đừng buông cho nó chìm"',
      'altar blood +redmist ~red@.5,.24,130 @.5,.5,1.5 giao:stand@.5,.7*1.3 gate@.5,.56*.5?9 "Cùng lúc ấy Giáo chủ chạm cấp chín mươi chín, rồi đứng yên trước một cánh cửa không chịu mở"',
    ],
    // ---- 88: Vết nứt trên mặt nạ ----------------------------------------------------------------------------------------------
    t88: [
      'bridge/river dusk +drift ~sun@.3,.5,66 @.5,.66,1.15 boat@.3,.8*.9 hero:stand@.3,.82*1.1 giao:float@.68,.7*1.2 "Lần giao thủ thứ ba giữa sông Lạc Nhạn, Giáo chủ đứng trên mặt nước, hiệp khách đứng trên một con thuyền nhỏ"',
      'bridge/river dusk +drift @.62,.7,1.5 giao:talk@.66,.7*1.35 hero:stand@.3,.82*1.15 boat@.3,.82*.9 "Ngươi đã khác. Thôn Nguyệt Quyết hút vào ngươi như hút vào biển. Nhưng biển cũng có đáy"',
      'bridge/river night +sparks +ripple ~moon@.72,.2,60 @.5,.7,1.3 hero:strike@.38,.82*1.25 giao:strike@.62,.7*1.3 boat@.38,.82*.9 "Trăm chiêu qua lại, Huyết Nguyệt Trảm chém vỡ mũi thuyền, Đòn Gánh đâm thẳng vào giữa vầng trăng khuyết bạc"',
      'bridge/river night +sparks @.55,.62,1.9 moonmask@.58,.62*.9?1 "Một tiếng tách. Mặt nạ nứt một đường. Phía sau là gương mặt già nua đến kinh người: da khô như vỏ cây, mắt trũng như giếng cạn"',
      'bridge/river night +ripple @.4,.7,1.4 hero:talk@.34,.82*1.25 giao:stagger@.66,.7*1.3 boat@.34,.82*.9 "Đại sư huynh… huynh đâu hơn tại hạ bao nhiêu tuổi. Sao lại già đến thế?"',
      'bridge/river night +ripple +redmist @.64,.66,1.7 giao:talk@.66,.7*1.4 "Mỗi phần nội lực hút được đều phải trả bằng một phần thọ mệnh. Ta không có thời gian, ta chưa bao giờ có"',
      'bridge/river night +ripple @.6,.58,2 sword@.5,.62*.9^-18 "Mắt hắn dừng ở đầu mộc kiếm, nơi có vết khấc nhỏ như móng tay, lần đầu tiên Giáo chủ lùi một bước mà không phải vì trúng đòn"',
      'bridge/river mist +drift @.62,.68,1.5 giao:talk@.66,.7*1.3 hero:stand@.3,.82*1.1 "Thanh gỗ ấy ai đưa cho ngươi? Về hỏi sư phụ đi. Hỏi luôn ba ngày ấy người ở đâu lúc mẹ ta nằm bên bờ ruộng"',
      'peaks/am night +fireflies ~moon@.74,.2,56 @.5,.64,1.3 hero:stand@.34*1.15 su:sit@.64,.9*1.2 "Hắn lùi vào sương. Đêm ấy leo lên am, sư phụ ngồi chờ sẵn như đã chờ câu hỏi này suốt hai mươi năm"',
      'field/dry dusk +dust @.5,.72,1.3 su:walk@.42,.84*1.15 batu:stand@.7,.84*0.9 "Năm ấy ta ngang qua Lệ thôn, lưng đeo bầu nước, vội tới một hội kiếm. Một người đàn bà gầy xin ta dừng lại. Ta bảo: Xong việc ta sẽ quay lại"',
      'interior/am lamp +dust @.55,.7,1.5 su:sit@.62,.9*1.3 pole@.4,.86*1.1?1 "Chiếc đòn gánh ấy là của bà. Ta dạy các ngươi biết dừng lại vì người khác bởi chính ta đã không dừng. Ngươi có quyền khinh ta"',
      'interior/am lamp - @.5,.7,1.4 hero:zen@.38,.9*1.25 su:sit@.66,.9*1.15 "Tại hạ không khinh. Nhưng đêm ấy không ngủ: người dạy mình điều đúng lại từng làm sai chính điều ấy"',
    ],
    // ---- 90: Võ lâm hội tụ ----------------------------------------------------------------------------------------------------
    t90: [
      'arena/field dawn +drift ~sun@.5,.4,56 @.5,.64,1.05 hero:stand@.5*1.15 dan:stand@.16 dan2:stand@.28 dan:stand@.72 dan2:stand@.84 "Tin hiệp khách làm Giáo chủ bị thương lan khắp giang hồ, lần đầu sau hai mươi năm các môn phái cùng kéo về chân núi Vân Mộng"',
      'arena/field morning +drift @.4,.66,1.45 suong:talk@.4*1.3 dan:stand@.16 dan2:stand@.22 dan:stand@.66 "Ngươi dạy ta không cần một mình. Lần này Lãnh Tịch ta bỏ Huyết Nguyệt Giáo, mang mười hai đệ tử đến, để không ai phải một mình"',
      'village/camp blood +redmist ~red@.7,.2,90 @.5,.66,1.1 palanquin@.5,.86*.9 giao:sit@.5,.8*1 dan:kneel@.2,.92 dan:kneel@.8,.92 "Huyết Nguyệt Giáo vây núi, Giáo chủ ngồi trên kiệu đỏ tay không động mà nghìn người ngã quỵ vì Thôn Nguyệt Quyết"',
      'arena/field blood +redmist @.7,.66,1.5 phong:talk@.7*1.3 banner@.9,.84*.6 "Nguyệt Sứ thứ mười một, Hàn Phong, phụng mệnh Giáo chủ. Ra đây. Món nợ cầu Lạc Nhạn hôm nay tính cho xong"',
      'arena/field blood +sparks @.5,.7,1.4 hero:strike@.38*1.25 phong:strike@.62*1.3 "Hai người giao đấu giữa hai trận tuyến, kiếm Hàn Phong nhanh gấp ba ngày trước, nhưng tóc hắn đã điểm bạc"',
      'arena/field dawn +drift ~sun@.5,.4,56 @.5,.64,1.4 hero:taichi@.4*1.35 dan:stand@.16 dan2:stand@.84 "Hiệp khách không trả đòn hiểm nào, Đòn Gánh vạch một vòng tròn: nghìn người phía sau được che trong ánh trăng bạc"',
      'arena/field dawn - @.5,.7,1.9 phong:stand@.58*1.4 hero:stand@.42*1.4 "Mũi kiếm Hàn Phong dừng sát cổ, hắn ghé tai nói rất khẽ: Canh ba. Cầu Lạc Nhạn. Đi một mình"',
      'peaks/snow snowy +snow ~pale@.3,.22,64 @.5,.66,1.3 hero:sit@.5,.86*1.3 tassel@.62,.86*.5 "Đêm ấy phá ải cấp chín mươi, bước vào Võ lâm chí tôn, nhìn dải tua kiếm ba nút trong tay, không biết nên tin điều gì"',
    ],
    // ---- 91: Mặt thứ một nghìn lẻ một -----------------------------------------------------------------------------------------
    t91: [
      'bridge/bridge night +drift ~moon@.74,.2,58 @.5,.58,1.3 phong:sit@.58,.58*1.25 hero:stand@.34,.62*1.15 "Canh ba cầu Lạc Nhạn, Hàn Phong ngồi trên thành cầu cởi áo viền đỏ, trên ngực có một ấn trăng khuyết đỏ như than"',
      'bridge/bridge night - @.58,.56,1.6 phong:talk@.6,.6*1.3 "Nhát kiếm ở võ đường là kế của sư phụ ngươi và ta: phải có người vào được Huyết Nguyệt đài. Ta đâm lệch khỏi tim ngươi đúng một đốt ngón tay"',
      'bridge/bridge night +redthread @.5,.56,1.5 phong:talk@.58,.6*1.3 hero:stand@.36,.62*1.2 "Ai vào giáo cũng bị đóng ấn này. Giáo chủ chết thì kẻ mang ấn chết theo: ba nghìn giáo chúng, mười Nguyệt Sứ, và ta. Ngươi không được giết hắn"',
      'bridge/bridge night - @.5,.58,1.4 phong:martial@.58,.6*1.3 hero:stand@.34,.62*1.15 "Trong võ đường của ngươi có kẻ không phải người của ngươi, kế giữ Thanh Khê là hắn báo. Đêm nay hắn nhận lệnh giết ngươi"',
      'interior/am night +dust @.5,.7,1.35 su:lie@.7,.92*1.2 moc:stand@.4*.95 pill@.6,.92*.5 "Lao về võ đường, mọi vò nước đã bị bỏ thuốc mê, bên giường sư phụ một bóng người nhỏ bé cầm dao găm đứng im rất lâu: đó là Tiểu Mộc"',
      'interior/am night - @.4,.66,1.9 dien:stand@.4*1.3 "Con dao rơi xuống đất, Tiểu Mộc đưa tay lên mặt lột ra một lớp da mỏng: gương mặt không có nét gì để nhớ của Huyễn Nguyệt Sứ Thiên Diện"',
      'valley/dojo night +fireflies @.5,.7,1.5 dien:talk@.42*1.3 hero:stand@.68*1.15 "Ta thế chỗ thằng bé từ mùa băng tan. Ta đọc sổ của nó để đếm tiếp từng chuyến nước cho giống. Đếm mãi, ta lại muốn biết con số kế tiếp"',
      'peaks/path night +fireflies @.4,.7,1.6 dien:kneel@.4*1.3 "Ta đã mang nghìn khuôn mặt, chỉ có vai này, kẻ tin vào từng chuyến nước, ta đóng lâu đến mức tin thật. Giết ta đi, hoặc cho ta giữ khuôn mặt này thêm một ngày"',
      'valley/dojo dawn - @.5,.7,1.4 hero:zen@.6*1.3 board@.3,.78*1.1?5 "Người dựng lại tấm bảng sau đêm nguyệt thực là hắn, người đếm chuyến nước thứ mười nghìn cũng là hắn. Chỉ hỏi điều còn quan trọng: Tiểu Mộc thật ở đâu?"',
      'altar/cell lamp @.5,.64,1.2 dien:talk@.62*1.3 hero:stand@.36*1.15 "Trong ngục đá dưới Huyết Nguyệt đài. Nó còn sống, Giáo chủ giữ lại vì nó là đứa duy nhất trong ngục không sợ hắn. Ta biết đường, ta sẽ dẫn"',
    ],
    // ---- 92: Ngục dưới trăng --------------------------------------------------------------------------------------------------
    t92: [
      'altar blood +redmist ~red@.5,.24,100 @.5,.64,1.2 giao:stand@.5,.7*1.2 quan:kneel@.3,.74 quan:kneel@.7,.76 hero:bow@.36,.94*.8 phong:bow@.46,.94*.8 "Thiên Diện mang gương mặt Giáo chủ đi thẳng qua ba lớp cổng, lính gác quỳ rạp, hiệp khách và Hàn Phong cúi đầu theo sau như hai tên hầu"',
      'altar/cell lamp @.5,.64,1.5 hero:stand@.46*1.2 "Ngục đá sâu chín tầng. Ở tầng cuối, trên vách có ba cột vạch bằng đá nhọn: Chưa làm, Đang làm, Đã xong. Cột cuối kín đặc những vạch"',
      'altar/cell lamp - @.55,.68,1.5 moc:talk@.58*1.2 hero:stand@.34*1.15 "Sư huynh đến rồi à? Đệ biết sẽ đến nên chỉ lo phần của đệ thôi: mỗi ngày đào một thìa đất. Đường hầm còn thiếu ba thước nữa"',
      'altar/cell lamp +dust @.5,.7,1.15 moc:stand@.5*1.05 dan:sit@.14,.9 dan2:sit@.26,.92 dan:sit@.74,.9 dan2:sit@.86,.92 "Tiểu Mộc đã cao hơn một cái đầu, gầy rộc, vẫn cười hì hì, quanh cậu là hai trăm tù nhân, mỗi người một việc ghi trên vách"',
      'altar/cell lamp - @.5,.7,1.5 moc:talk@.5*1.3 "Trong này ai tuyệt vọng thì chết trước, nên đệ chia việc. Có việc để làm xong mỗi ngày thì người ta còn muốn sống tới ngày mai"',
      'altar/tunnel lamp +dust @.5,.7,1.15 hero:kneel@.34,.9*1.2 moc:kneel@.5,.9*1.1 phong:kneel@.66,.9*1.2 "Ba người cùng đào nốt ba thước cuối, Thiên Diện đứng chắn cửa ngục, lần lượt mang mặt từng viên quản ngục để đuổi lính tuần đi nơi khác"',
      'altar/chamber lamp @.5,.64,1.05 hero:stand@.3*1.1 phong:stand@.46*1.1 "Cuối tầng chín còn một gian thạch thất khóa kín, bên trong có mười chiếc ghế đá khắc tên mười Nguyệt Sứ, và chiếc thứ mười một"',
      'altar/chamber lamp - @.5,.7,1.9 chair@.5,.82*1.4?3 hero:kneel@.34*1.2 "Tên khắc trên ghế là của hiệp khách, nét khắc đã mòn rêu phủ kín: chiếc ghế được tạc từ rất lâu, trước cả ngày lên núi gánh nước"',
      'altar/chamber lamp - @.5,.7,1.5 hero:zen@.46*1.3 chair@.7,.86*.9?2 "Có kẻ đã chờ tại hạ từ khi tại hạ chưa biết cầm kiếm. Người ta không tạc ghế cho kẻ mình định giết"',
      'altar/tunnel night +fireflies @.5,.7,1.15 dan:walk@.3,.9 dan2:walk@.42,.9 moc:walk@.56,.9 dien:stand@.72,.9*1.1 "Hai trăm người chui qua đường hầm ra tới bờ sông trước khi trăng lặn, Tiểu Mộc ngoái nhìn kẻ từng mang gương mặt mình: Ngươi đếm thay ta à? Đếm có đúng không đấy?"',
    ],
    // ---- 93: Hồn du về Lệ thôn ------------------------------------------------------------------------------------------------
    t93: [
      'peaks/snow snowy +snow +dust ~pale@.3,.22,68 @.5,.64,1.3 thien:float@.4,.74*1.25 hero:float@.62,.74*1.2 "Ngươi muốn biết vì sao hắn gom khổ đau? Nắm tay lão, lão sẽ đưa hồn ngươi về Lệ thôn, mùa hạn năm ấy"',
      'field/dry blood +dust ~red@.7,.2,90 @.5,.7,1.15 me:carry@.4,.84*1.1 hero:float@.7,.74*1.1 "Ruộng nứt nẻ, một người đàn bà gầy guộc ngày ngày gánh nước từ con suối cạn về tưới mấy luống mạ, trên vai là chiếc đòn gánh có vết khấc"',
      'field/dry dusk +dust @.5,.72,1.5 me:talk@.46*1.25 be:stand@.64*1.1 "Một gáo thôi con. Mỗi ngày một gáo, ruộng sẽ xanh"',
      'field/dry dawn +dust @.5,.76,1.5 be:walk@.4,.86*1.1 basket@.7,.9*1.1?0 "Cậu bé lên mười lon ton theo sau ôm cái gáo gỗ nhỏ, một sáng bên bờ suối cạn có tiếng khóc: người chạy hạn bỏ lại một chiếc giỏ có đứa bé còn đỏ hỏn"',
      'field/dry day +dust @.5,.76,1.4 me:hold@.5*1.2 basket@.7,.9*.8?1 "Người đàn bà bế đứa bé về, từ hôm ấy bát cháo loãng chia làm ba, rồi phần của bà nhỏ dần, bà sai con trai lên trấn xin gạo"',
      'field/dry day +dust @.5,.7,1.3 su:walk@.6,.84*1.1 me:point@.34*1.15 hero:float@.78,.74 "Ngày thứ nhất, một kiếm khách trẻ áo xám đi ngang lưng đeo bầu nước, bà xin chàng dừng lại. Chàng hứa xong việc sẽ quay về"',
      'valley/tea dawn +dust @.5,.7,1.5 me:hold@.4*1.2 batu:stand@.66*.95 basket@.52,.9*1?1 ladle@.52,.84*.5 "Ngày thứ hai bà đặt đứa bé vào giỏ, lót thêm cái gáo gỗ của con trai, gửi theo một gánh hàng trà xuôi về phương nam"',
      'field/dry dusk +dust ~red@.7,.2,80 @.5,.7,1.5 hero:float@.3,.74*1.15 ladle@.62,.9*1.1?1 "Cái gáo sứt quai bên hông, chiếc giỏ trước cửa quán trà… đứa bé ấy là tại hạ. Bà đã nhịn phần cháo của mình để tại hạ được sống"',
      'field/dry blood +ash ~red@.7,.2,90 @.5,.72,1.5 me:lie@.4,.9*1.1 be:sit@.52,.92*.9 pole@.3,.9*.8?1 "Ngày thứ ba người mẹ ngã xuống bên đòn gánh, cậu bé về tới nơi với nửa bao gạo, ngồi cạnh mẹ dưới vầng trăng đỏ như máu"',
      'field/dry blood +redthread ~red@.7,.2,100 @.5,.5,1.4 ma:float@.7,.54*1.3 be:sit@.36,.9*.9 "Chăm chỉ là lời dối trá của kẻ yếu, bé con ạ. Mẹ ngươi gánh nước cả đời, và ruộng có xanh đâu? Lớn lên, hãy tìm ta"',
      'field/dry blood +redthread ~red@.7,.2,100 @.5,.3,1.3 hero:float@.4,.7*1.15 "Trên trời Lệ thôn những đám mây mưa đang bị hút về phía vầng trăng đỏ, từng đám một. Mùa hạn ấy không phải của trời"',
      'field/dry dawn +dust @.5,.7,1.4 thien:float@.62,.76*1.25 hero:float@.38,.76*1.2 "Ruộng không xanh nhưng có một đứa trẻ đã sống. Hắn chưa từng biết điều đó"',
    ],
    // ---- 94: Gánh nước cho mẹ ta ----------------------------------------------------------------------------------------------
    t94: [
      'peaks/snow snowy +snow @.5,.62,1.2 hero:stand@.4*1.15 moc:stand@.56*1.1 "Tỉnh dậy trên Tuyết Phong thì nghe tin dữ: Giáo chủ đã đích thân tới am Tùng Hạc trong đêm và mang sư phụ đi, ba nghìn quân Huyết Nguyệt tiến về Vân Mộng"',
      'valley/dojo dusk +drift @.5,.7,1.4 dan:stand@.18 dan2:stand@.28 suong:stand@.7*1.2 hero:stand@.5*1.2 board@.86,.76*.8?4 "Các chưởng môn đòi ở lại giữ núi. Một người đổi lấy cả ngọn núi, ai cũng thấy phép tính ấy. Nhìn tấm bảng tre rất lâu"',
      'valley/dojo dusk - @.5,.7,1.6 hero:talk@.5*1.3 board@.7,.78*1.1?3 "Giữ núi là việc giao được. Tiểu Mộc chia việc, Lãnh Tịch giữ đèo, Hàn Phong báo đường tiến quân. Còn việc kia không ai làm thay tại hạ được"',
      'arena/field night +fireflies ~moon@.5,.2,60 @.5,.62,1.3 dien:stand@.5,.7*1.3 quan:stand@.2 quan:stand@.34 quan:stand@.68 quan:stand@.82 "Vậy đêm nay ta mang mặt ngươi đứng trên tường lũy. Quân Huyết Nguyệt thấy ngươi còn đó thì chưa dám đánh. Khuôn mặt này ta sẽ không làm xấu"',
      'field/dry blood +ash ~red@.7,.2,100 @.5,.7,1.15 su:carry@.5,.84*1.15 "Lệ thôn chỉ còn nền nhà và ruộng nứt, dưới trăng đỏ sư phụ Tùng Hạc không còn chút nội lực đang gánh nước từ con suối cạn lên ruộng, vai ông đã bật máu"',
      'field/dry blood +ash @.6,.62,1.5 giao:talk@.7*1.4 su:carry@.34,.86*1.1 "Người dạy ta gánh nước. Vậy gánh đi, gánh tới khi ruộng mẹ ta xanh. Ba ngày người nợ bà, hôm nay trả bằng ba vạn chuyến"',
      'field/dry night +dust ~moon@.7,.2,60 @.5,.74,1.2 su:carry@.34,.86*1.15 hero:carry@.52,.86*1.15 giao:stand@.82,.72*1.2 "Không rút kiếm, nhặt đôi thùng thứ hai bước xuống suối rồi đi bên cạnh sư phụ. Một chuyến, mười chuyến, trăm chuyến, Giáo chủ đứng nhìn suốt đêm"',
      'field/dry blood +ash @.5,.7,1.5 hero:talk@.4*1.3 giao:stand@.66*1.3 ladle@.52,.9*1.1?1 "Đại sư huynh. Bên bờ suối này năm ấy có một chiếc giỏ, mẹ huynh chia cháo cho đứa bé trong giỏ rồi gửi nó theo gánh hàng trà. Đây là cái gáo bà lót trong giỏ"',
      'field/dry blood +ash @.5,.8,1.4 giao:kneel@.62,.86*1.3 ladle@.46,.9*1.2?1 moonmask@.54,.92*.55^40 "Giáo chủ nhìn cái gáo sứt quai, chính tay hắn đã làm sứt nó năm lên tám. Chiếc mặt nạ trăng khuyết rơi xuống đất: Mẹ… đã cứu được một người sao?"',
      'field/dry void +redthread ~eye@.7,.2,70 @.5,.5,1.4 giao:stagger@.6*1.4 flute@.3,.4*.8 "Đúng lúc ấy một tiếng sáo xương cất lên từ bóng tối, lưng Giáo chủ cứng lại, đôi mắt thành hai vầng trăng đỏ, giọng nói không còn là của hắn"',
      'field/dry void +redthread @.62,.5,1.8 ma:cast@.64,.7*1.45 "Đủ rồi, Vô Khuyết. Ngươi đã làm xong phần việc của ngươi. Từ đây thân xác này để ta dùng"',
      'field/dry blood +ash @.6,.62,1.6 giao:hurt@.62*1.35 hero:stand@.3*1.15 su:stagger@.16*1.1 "Chạy đi… tiểu đệ… Mang sư phụ… chạy đi!"',
    ],
    // ---- 95: Hai vị chín mươi lăm ---------------------------------------------------------------------------------------------
    t95: [
      'peaks/snow snowy +snow ~pale@.3,.22,68 @.5,.62,1.1 giao:walk@.7,.82*1.3 "Kẻ mang thân xác Giáo chủ không về Huyết Nguyệt đài, nó đi thẳng lên Tuyết Phong, nơi hiệp khách đưa sư phụ về dưỡng thương, một mình, không cần quân nữa"',
      'peaks/snow snowy +snow @.5,.66,1.35 hai:martial@.64*1.3 hero:stand@.38*1.15 su:sit@.2,.88*1.1 "Lão già này còn chút nội lực đủ chặn nó một canh giờ! Đưa sư phụ ngươi xuống núi!"',
      'peaks/snow snowy +snow +sparks @.5,.64,1.15 hai:strike@.34*1.35 thien:float@.62,.66*1.4 ma:cast@.8,.76*1.3 "Một võ sư nội lực chín mươi lăm, một thiền sư tinh thần chín mươi lăm, núi tuyết rung chuyển, hồn Không Nguyệt tỏa ra như ánh trăng phủ kín ngọn núi"',
      'peaks/snow void +snow ~eye@.3,.2,70 @.5,.7,1.3 vong:stagger@.3,.86*1.25 ma:point@.7*1.4 "Giữa trận một lão già lưng còng lê bước lên dốc: Vô Vọng, kẻ đã bị hút cạn nội lực, hắn đến để nói điều hắn biết. Con mắt đỏ quay về phía hắn trước tiên"',
      'peaks/snow void +snow +redthread ~eye@.3,.2,80 @.5,.5,1.4 ma:cast@.6,.7*1.5 "Kẻ biết chuyện thì không nên còn lưỡi. Huyết Nguyệt Thôn Thiên!"',
      'peaks/snow void +snow +redthread +sparks @.5,.66,1.4 hai:martial@.5*1.35 vong:kneel@.36,.86*1.2 ma:cast@.76*1.4 "Cả bầu trời bị hút về một điểm, Mạc Trấn Hải bước vào giữa điểm ấy chắn trước đứa con trai, đứng như đứng trước biển: dồn tới, rút về, dồn tới"',
      'peaks/snow void +snow @.46,.7,1.6 hai:zen@.5*1.4 vong:kneel@.34,.88*1.2 "Vọng à. Ngày ấy con hỏi cố gắng để làm gì, cha vụng không biết trả lời. Giờ thì con nhìn đi"',
      'peaks/snow dawn +snow ~sun@.5,.5,50 @.5,.7,1.4 hai:stand@.52*1.4 hero:kneel@.3,.88*1.2 su:sit@.74,.88 "Một canh giờ, đủ để mọi người xuống núi. Khi cơn hút tan lão ngư vẫn đứng, hai chân cắm vào đá, mặt hướng ra biển, không còn thở nữa"',
      'peaks/snow snowy +snow +dust ~pale@.3,.22,68 @.5,.64,1.5 vong:kneel@.4,.88*1.3 hai:stand@.58*1.35 "Cha… Hóa ra vẫn còn một việc đáng làm"',
      'peaks/snow void +snow ~eye@.3,.2,90 @.5,.62,1.35 hero:sit@.5,.84*1.3 "Trăng trên Tuyết Phong mờ hẳn vì Không Nguyệt đã che núi quá lâu, đêm ấy giữa tang tóc hiệp khách vượt cấp chín mươi lăm, Siêu Phàm Nhập Thánh"',
    ],
    // ---- 96: Sự thật dưới trăng máu -------------------------------------------------------------------------------------------
    t96: [
      'shore/hut dusk +birds ~sun@.72,.34,56 @.5,.7,1.35 vong:sit@.4,.88*1.25 net@.64,.84*1.05?1 "Chiều trên đảo Thiết Thạch, Vô Vọng ngồi vá tấm lưới của cha, vá cả cái nút vụng về năm xưa"',
      'shore/rocks blood +redmist ~red@.74,.2,92 @.55,.5,1.35 vong:talk@.3,.86*1.3 "Trăng máu nhô khỏi mặt biển, Vô Vọng kể về thứ trú trong nó: một vị thần không bao giờ no"',
      'heaven/stairs holy +rays @.5,.52,1.1 gate@.5,.54*.8?0 hero:walk@.5,.98*.8 "Cánh cửa trên chín mươi chín bậc thang chỉ mở cho kẻ đi lên từng bước, lòng không khuyết"',
      'shore/hut night +fireflies ~moon@.24,.2,46 @.5,.7,1.7 hero:zen@.38,.88*1.35 vong:sit@.66,.88*1.15 "Hiệp khách ngồi im bên lão ngư trong đêm, hỏi một câu rất nhỏ: nó nuôi huynh ấy hai mươi năm để làm gì"',
      'altar/chamber lamp +dust @.5,.72,1.05 chair@.5,.97*1.5?0 "Mười chiếc ghế đá trong thạch thất và chiếc thứ mười một còn trống, tạc cho kẻ sẽ mở cửa thay Tà thần"',
      'field/dry blood +ash ~red@.7,.2,90 @.5,.82,1.7 pole@.5,.9*1.5?1 "Trên ruộng nứt dưới trăng máu, chiếc đòn gánh của người mẹ nằm lại, thứ duy nhất Tà thần sợ"',
      'shore/rocks night +redthread ~red@.7,.22,84 @.45,.72,1.7 hero:hurt@.4,.88*1.4 "Sợi chỉ đỏ trên ngực siết lại: nỗi không biết mình từ đâu tới và món nợ với người đã chết vì mình"',
      'peaks/summit blood +redmist ~red@.5,.3,130 @.5,.45,1.25 ma:cast@.62,.66*1.6 "Vầng trăng đỏ lên cao như một con mắt, Tà thần thì thầm: mỗi chuyến nước của ngươi là một bậc thang của ta"',
      'valley/stream dawn +birds ~sun@.75,.3,50 @.5,.72,1.5 bucket@.3,.92*1.4 bucket@.42,.96*1.2 hero:sit@.68,.86*1.25 "Sáng hôm sau bên bờ suối, đôi thùng nằm im, lần đầu tiên hiệp khách không xuống gánh nước"',
      'valley/dojo morning @.5,.72,1.5 moc:talk@.4,.9*1.3 board@.72,.8*1.1?5 "Tiểu Mộc chỉ vào dòng trên cùng của tấm bảng tre: làm những việc này để đi tới đâu"',
    ],
    // ---- 97: Sứ giả áo bạc ----------------------------------------------------------------------------------------------------
    t97: [
      'peaks/snow night +snow @.5,.7,1.25 hinh:walk@.5,.88*1.4 ruler@.3,.7*.7 "Đêm không trăng, người áo bạc cầm thước ngọc bước xuống từ khoảng trời trống, tuyết không lún dưới chân"',
      'heaven/realm holy +rays @.5,.52,1.0 hinh:talk@.5,.9*1.25 "Thiên Hình kể về Thần giới: ba mươi sáu Thiên Cang, mười hai Phương thần, năm Thần Vương, không thừa một ngôi, không thiếu một ngôi"',
      'void/abyss void +redthread +sparks @.5,.6,1.1 ma:fall@.5,.68*1.4 "Vô Yểm nuốt đồng liêu để ép Thần giới mở thêm ngôi, rồi bị đày, rơi từ trời xuống cõi người"',
      'peaks/summit eclipse ~eclipse@.72,.2,60 @.5,.55,1.1 gate@.62,.82*.75?0 hinh:zen@.28,.9*1.2 "Thước ngọc chỉ về Thiên Môn trên đỉnh trời: tới kỳ nguyệt thực cánh cửa sẽ bị niêm lại vĩnh viễn"',
      'peaks/snow night +snow @.5,.72,1.55 hero:martial@.34,.9*1.3 hinh:talk@.66,.9*1.35 "Hiệp khách đứng thẳng trước sứ giả áo bạc, chất vấn: các vị bỏ cả một cõi người cho nó ăn để Thần giới được yên sao"',
      'peaks/summit night ~moon@.66,.2,52 @.5,.5,1.2 hinh:point@.32,.9*1.35 "Thiên Hình chỉ lên vầng trăng: phép có khe hở, nhưng nguyệt thực chỉ còn cách ba mùa trăng"',
      'peaks/snow holy +rays @.5,.66,1.5 thien:bow@.34,.9*1.35 hinh:point@.7,.9*1.35 ruler@.52,.7*.8 "Thước ngọc chỉ về Không Nguyệt, vị sư già cúi đầu: ông là Hằng Nguyệt tinh quân của Thần giới"',
      'peaks/snow dusk +snow @.45,.7,1.8 thien:talk@.62,.9*1.4 hero:stand@.3,.9*1.25 "Không Nguyệt dặn riêng hiệp khách: sợi chỉ trên ngực không cắt bằng kiếm được, nó buộc bằng gì thì gỡ bằng thứ ấy"',
      'peaks/summit blood +redmist ~eye@.62,.28,120 @.5,.55,1.1 hero:stand@.3,.88*1.2 "Hai bóng áo bạc đã khuất, nơi chân trời vầng trăng đỏ mở to như con mắt vừa nghe hết mọi chuyện, và nó cười"',
    ],
    // ---- 97.5: Mười một chiếc ghế ---------------------------------------------------------------------------------------------
    't97.5': [
      'altar/chamber lamp +dust @.5,.7,1.1 hero:stand@.5,.9*1.1 "Gian thạch thất dưới Huyết Nguyệt đài đã bỏ hoang, hiệp khách đứng trước mười chiếc ghế đá"',
      'valley/tea day +leaves @.5,.72,1.0 mien:lie@.2,.86*1.0 loi:walk@.5,.88*1.0 bach:stand@.8,.86*1.1 "Ba người cũ mỗi người một nơi: Miên Hồ ngủ dưới gốc đa, Lôi Tốc chạy quanh bãi trống, Bách Tý ôm chín món binh khí không dám đặt xuống"',
      'temple morning +petals @.5,.72,1.5 ngoc:talk@.5,.9*1.3 shards@.72,.92*.9 "Ngọc Vô Hà mặc tấm giáp lưu ly vá từ những mảnh vỡ, xấu lắm nhưng mặc được, ấn trên ngực nàng mờ dần"',
      'temple morning +petals @.5,.64,1.9 hero:zen@.34,.92*1.35 ngoc:stand@.68,.92*1.3 thread@.5,.58*1.0?1 "Hiệp khách nhìn bằng con mắt học trên Tuyết Phong: sợi chỉ đỏ của nàng buộc vào nỗi sợ không hoàn hảo, nàng hết sợ thì chỉ tự tuột"',
      'bridge/river dusk +birds @.5,.62,1.5 phong:talk@.5,.62*1.3 "Hàn Phong tựa lan can cầu lúc chiều tà, nhận ra ấn chỉ buộc mình vào cái thói muốn nhanh hơn người khác"',
      'temple dawn +birds @.5,.66,1.0 bell@.14,.82*1.0 mien:stand@.22,.92*1.05 loi:zen@.42,.92*1.05 bach:hold@.6,.92*1.05 kho:sit@.78,.92*1.0 kinh:bow@.9,.92*1.05 "Buổi sớm ở sân chùa, từng người cũ làm việc ngược với thói của mình: gõ chuông, đứng yên, đặt bớt binh khí, ngủ một giấc, úp gương"',
      'altar blood +redmist ~red@.5,.22,100 @.5,.6,1.2 khuc:float@.55,.7*1.4 flute@.55,.44*.9 hero:stand@.2,.86*1.05 "Trên Huyết Nguyệt đài ống sáo xương tự thổi giữa tà áo choàng trống rỗng, Khúc U chưa bao giờ là người"',
      'void/abyss void +redthread @.5,.55,1.3 ma:cast@.5,.74*1.6 flute@.28,.5*.7?1 "Giọng Tà thần vọng ra từ ống sáo: một đốt ngón tay của nó thổi bên tai Vô Khuyết suốt hai mươi năm"',
      'valley/dojo dusk +fireflies @.5,.72,1.1 board@.5,.72*1.2?1 hero:point@.5,.9*1.15 mien:sit@.16,.92 loi:sit@.27,.92 kho:sit@.38,.92 bach:sit@.64,.92 ngoc:sit@.76,.92 suong:sit@.87,.92 "Chín người từng là kẻ thù ngồi quanh tấm bảng tre, hiệp khách ghi lên dòng đầu việc khó nhất: gỡ sợi chỉ của chính mình"',
    ],
    // ---- 98: Trăng không lặn --------------------------------------------------------------------------------------------------
    t98: [
      'field/dry blood +redmist +dust ~red@.5,.26,130 @.5,.6,1.1 dan:kneel@.72,.9*1.0 "Vầng trăng đỏ treo mãi giữa trời, ngày không tới, ruộng khô, lúa lép, mây mưa bị hút về phía tây"',
      'field/dry blood +redthread ~eye@.5,.26,150 @.5,.58,1.1 hero:stand@.5,.86*1.15 "Tà thần thì thầm từ vầng trăng: ngươi sẽ tự mở cửa cho ta vì ngươi không chịu nổi cảnh chúng đói"',
      'village/dyke dawn +birds @.5,.7,1.1 hero:point@.3,.92*1.1 moc:talk@.5,.92*1.1 board@.7,.78*1.0?0 phong:carry@.84,.92 "Sáng sớm bên con đê làng, hiệp khách chia mương: Tiểu Mộc dựng bảng tre, Hàn Phong, Lãnh Tịch và các Nguyệt Sứ cũ mỗi người nhận một đoạn"',
      'field/chain dusk +dust ~red@.8,.18,80 @.5,.7,1.0 "Mười vạn người xếp hàng dài từ sông lên ruộng, chuyền tay nhau từng thùng nước dưới vầng trăng đỏ"',
      'field/chain blood +dust ~red@.78,.2,86 @.5,.78,1.7 dan:talk@.46,.92*1.45 bucket@.7,.96*1.2 "Một người dân mệt lả buông thùng nước than: tưới thế này thì tới bao giờ, trăng kia đâu có mệt"',
      'field/dry dusk +dust ~red@.74,.22,80 @.5,.72,1.5 hero:carry@.5,.9*1.3 "Hiệp khách gánh nước ra thửa ruộng không chịu xanh, đúng chỗ người mẹ năm xưa từng đứng"',
      'village/camp night +fireflies @.5,.7,1.5 moc:talk@.36,.9*1.3 board@.68,.78*1.15?3 "Tiểu Mộc ghi lại bảng: không phải ruộng xanh mà là hôm nay chuyền đủ ba nghìn thùng, việc làm xong được"',
      'village/dyke dawn +birds @.5,.62,1.2 board@.5,.82*1.4?9 dan:carry@.2,.9 dan2:carry@.8,.9 "Ngày thứ bốn mươi ruộng vẫn nứt, nhưng cột Đã xong trên bảng tre đã đầy ắp và chưa ai bỏ hàng"',
    ],
    // ---- 98.3: Ruộng không xanh -----------------------------------------------------------------------------------------------
    't98.3': [
      'field/dry blood +dust ~red@.5,.2,100 @.5,.7,1.2 dan:back@.2,.9 dan2:back@.34,.9 dan:back@.46,.9 "Tháng thứ ba, hàng người chuyền nước thưa dần dưới trăng đỏ, người bỏ hàng ngày một nhiều"',
      'village/dyke blood +dust ~red@.7,.2,80 @.5,.78,1.7 phong:fall@.5,.9*1.4 hero:stand@.2,.92*1.1 "Hàn Phong gục giữa mương, tóc bạc trắng chỉ sau một đêm, mười năm nội lực vay của Giáo chủ đã tới hạn đòi"',
      'village/dyke blood +dust @.5,.76,1.8 phong:sit@.4,.9*1.4 bucket@.66,.94*1.5 "Hàn Phong ngồi tựa bờ mương, từ chối đỡ, chìa tay đòi cái thùng: ta chuyền được"',
      'field/dry dawn +dust ~sun@.8,.28,50 @.5,.7,1.1 su:carry@.34,.9*1.1 "Sư phụ Tùng Hạc gánh riêng đôi thùng nước tới thửa ruộng xa nhất, nơi chưa ai kịp tới"',
      'field/dry dusk +dust ~red@.78,.22,80 @.5,.74,1.8 su:talk@.62,.9*1.4 hero:stand@.28,.92*1.2 "Sư phụ dặn dò hiệp khách bên bờ ruộng xa: năm ấy ta đến muộn ba ngày, lần này ta muốn đến trước"',
      'field/dry dusk +dust ~sun@.8,.34,56 @.5,.8,1.7 su:sit@.5,.88*1.4 pole@.5,.96*.9?1 "Chiều muộn sư phụ ngồi tựa bờ ruộng xa, đôi thùng đã cạn, đòn gánh đặt ngang gối, ông đi nhẹ như người chợp mắt sau buổi làm xong"',
      'field/dry blood +redmist +redthread ~red@.5,.2,150 @.5,.7,1.3 hero:kneel@.4,.9*1.4 su:lie@.62,.92*1.2 "Trăng đỏ sáng rực hơn bao giờ hết, chờ một dòng tuyệt vọng thật lớn, hiệp khách quỳ bên thầy mà không khóc được"',
      'field/dry dawn +birds ~sun@.6,.3,50 @.5,.8,2.2 sprout@.5,.9*1.5 moc:kneel@.3,.92*1.2 "Sáng ra giữa kẽ đất nứt, nơi thùng nước cuối cùng của sư phụ đổ xuống, mọc lên một ngọn mạ xanh"',
    ],
    // ---- 98.7: Mầm xanh dưới trăng đỏ -----------------------------------------------------------------------------------------
    't98.7': [
      'field/dry day +birds @.5,.74,1.3 sprout@.5,.9*.9 kid:stand@.36,.92*.95 kid:sit@.62,.92*.9 batu:carry@.82,.92 "Người đã bỏ hàng kéo về quanh ngọn mạ duy nhất, Bà Tư gánh trà ra tận ruộng, lũ trẻ gọi ngọn mạ là Thầy"',
      'field/green morning +birds ~sun@.78,.25,56 @.5,.65,1.0 dan:carry@.2,.92 dan2:carry@.4,.9 dan:carry@.72,.92 "Cả cánh đồng dưới chân Vân Mộng lên màu xanh, nước người mang tới đã nhiều hơn nước vầng trăng kịp hút"',
      'field/green blood +redthread ~eye@.5,.24,160 @.5,.36,1.45 hero:stand@.5,.92*1.0 "Dòng khí đỏ chảy về vầng trăng máu mỏng dần rồi đứt hẳn, con mắt đỏ lần đầu lộ vẻ đói"',
      'void/field void +redthread @.5,.26,2.0 "Con mắt đỏ quay xuống thì thầm: ngươi muốn gặp sư huynh ngươi không? Nhìn đi"',
      'void/field void +ash @.5,.7,1.3 be:sit@.4,.9*.9 me:lie@.6,.92*1.1 "Trong con ngươi đỏ hiện ra thửa ruộng nứt vô tận, giữa ruộng một cậu bé lên mười ngồi bó gối bên người mẹ đã lạnh"',
      'void/field void +redthread @.5,.62,1.6 ma:talk@.7,.78*1.5 be:sit@.3,.9*1.0 "Giọng Tà thần mặc cả: mở cửa ngay đêm nay, nó sẽ thả cậu bé ra, một cánh cửa đổi một người anh"',
      'void/field holy +drift @.5,.74,1.8 be:stand@.5,.9*1.3 sprout@.7,.92*.7 "Cậu bé ngẩng lên, thấy ruộng xanh của họ qua con ngươi, thì thào: đừng mở, ruộng xanh thật phải không"',
      'field/green night +fireflies ~red@.72,.2,80 @.5,.72,1.55 hero:stand@.5,.92*1.35 sprout@.76,.9*.8 "Giữa ruộng xanh dưới trăng đỏ, hiệp khách nói nhỏ mà chắc: tại hạ sẽ vào tận trong đó mà gánh huynh ra"',
    ],
    // ---- 99: Đại chiến Vân Mộng -----------------------------------------------------------------------------------------------
    t99: [
      'peaks/summit night +drift ~moon@.3,.2,58 ~red@.7,.22,84 @.5,.45,1.15 gate@.5,.78*.8?0 "Đêm rằm hai vầng trăng hiện trên đỉnh Vân Mộng, một bạc như nước một đỏ như máu, giữa hai vầng trăng Thiên Môn mười ổ khóa mờ dần hiện ra"',
      'peaks/summit blood +redmist ~red@.5,.24,120 @.5,.55,1.3 gate@.5,.74*.9?0 giao:stand@.7,.9*1.5 hero:stand@.28,.9*1.2 "Trước Thiên Môn Giáo chủ mang giọng Tà thần ra lệnh: mở ra, hoặc nhìn ta giết từng đứa ngươi thương"',
      'peaks/summit storm +redmist +lightning +sparks ~red@.5,.2,100 @.5,.55,1.2 hero:strike@.34,.9*1.4 giao:cast@.7,.9*1.45 slash@.52,.55*1.6^-14 slash@.5,.62*1.3^170?1 "Hai chiêu thức va nhau: Huyết Nguyệt Thôn Thiên hút cả bầu trời, Vạn Nhật Nhất Kiếm dồn bao ngày gánh nước vào một nhát mộc kiếm"',
      'peaks/summit blood +embers @.5,.78,1.9 hero:martial@.36,.92*1.5 giao:martial@.64,.92*1.55 slash@.5,.6*1.3^8?1 "Ba trăm chiêu qua đi, hiệp khách thắng thế mà không ra đòn kết liễu được vì mỗi vết thương trên thân xác kia là vết thương của sư huynh"',
      'peaks/summit blood +redmist @.5,.8,2.0 hero:zen@.5,.9*1.5 "Giữa trận, hiệp khách tra kiếm vào bao ngồi thiền như Không Nguyệt dạy trên núi tuyết, để hồn rời thân"',
      'peaks/summit blood +embers @.5,.7,1.15 hero:zen@.5,.9*1.1 moc:martial@.36,.9*1.05 phong:martial@.64,.9*1.05 suong:stand@.22,.9 mien:stand@.78,.9 loi:stand@.1,.92 bach:stand@.9,.92 "Tiểu Mộc, Hàn Phong, Lãnh Tịch và các Nguyệt Sứ cũ dựng vòng người che quanh thân hiệp khách đang ngồi bất động như tượng"',
      'peaks/summit night +drift ~red@.5,.2,100 @.5,.72,1.3 dien:martial@.5,.9*1.4 hero:stand@.1,.92*.8 hero:stand@.22,.9*.85 hero:stand@.34,.92*.9 hero:stand@.66,.92*.9 hero:stand@.78,.9*.85 hero:stand@.9,.92*.8 "Thiên Diện thi triển nghìn mặt, mười hai bóng hiệp khách đứng khắp đỉnh núi để con mắt đỏ không phân được thật giả"',
      'void/field void +ash @.5,.74,1.2 hero:walk@.3,.88*1.0 be:sit@.74,.9*.8 "Bên trong con mắt đỏ hiệp khách bước tay không giữa thửa ruộng nứt vô tận, tiến về phía cậu bé đang ngồi bó gối"',
      'peaks/summit night +rays @.5,.52,1.3 gate@.5,.8*1.0?0 "Mười ổ khóa trên Thiên Môn cùng rung lên một tiếng, cánh cổng không chờ kẻ thắng trận mà chờ kẻ dám đi tới tận cùng"',
    ],
    // ---- 99.2: Trong lòng trăng máu -------------------------------------------------------------------------------------------
    't99.2': [
      'void/field void @.5,.78,1.6 hero:sit@.42,.9*1.2 be:sit@.62,.9*1.0 "Trong thửa ruộng không có ngày đêm, hiệp khách ngồi xuống cạnh cậu bé, không nói gì, như hai đứa trẻ bên bờ suối cạn"',
      'void/field void +ash @.5,.74,1.8 be:talk@.62,.9*1.2 me:lie@.82,.94*.9 "Cậu bé hỏi: ngươi là ai, ở đây không ai tới cả, chỉ có mẹ, ta và tiếng nói trên kia"',
      'field/dry dusk +dust @.5,.76,1.7 basket@.3,.9*1.1?1 me:hold@.6,.9*1.1 "Hiệp khách kể lại chiếc giỏ bên bờ suối cạn, người mẹ nuôi đứa bé ba ngày bằng phần cháo của mình, bà không thua mùa hạn mà đã cứu được một người"',
      'void/field holy +drift @.5,.72,2.0 be:stand@.5,.9*1.5 "Cậu bé ngẩng lên, trong một nhịp thở thửa ruộng như sắp có gió, rồi gương mặt cậu méo đi"',
      'void/field void +redthread @.5,.7,1.8 be:stagger@.4,.9*1.4 hero:kneel@.72,.9*1.1 "Cậu bé ôm đầu thét lên: vậy là mẹ chết đói vì ngươi"',
      'void/field void +redthread ~eye@.5,.3,230 @.5,.3,1.6 hero:kneel@.3,.92*.7 "Con mắt đỏ khổng lồ cười: ta để dành chuyện ấy, con dao tốt nhất phải dùng sau cùng"',
      'void/field void +redthread +sparks @.5,.5,1.4 be:cast@.5,.84*1.5 hero:fall@.8,.5*1.2 "Cậu bé đứng dậy, tự tay nắm lấy vầng trăng đỏ, Vô Khuyết và Tà thần hòa làm một, hồn hiệp khách bị hất văng khỏi con mắt"',
      'peaks/summit blood +redmist @.5,.8,1.8 hero:hurt@.5,.9*1.45 chain@.5,.72*1.1 "Trên đỉnh núi hiệp khách mở mắt hộc máu, sợi chỉ đỏ trên ngực đã thành một sợi xích"',
      'peaks/summit dawn +drift ~sun@.5,.4,60 @.5,.7,1.5 hero:sit@.5,.9*1.4 "Bình minh trên đỉnh Vân Mộng, hiệp khách ngồi một mình nhìn thẳng vào điều mình đã tránh suốt từ đêm ở Lệ thôn"',
    ],
    // ---- 99.4: Mười ổ khóa ----------------------------------------------------------------------------------------------------
    't99.4': [
      'peaks/summit dusk +drift @.5,.5,1.8 gate@.5,.88*1.15?0 hero:stand@.2,.94*.8 "Tà thần rút về trời tây, trên Thiên Môn mười ổ khóa mang hình mười thứ quen thuộc: cây quạt, chiếc đèn, thanh đao, ống sáo"',
      'temple night +fireflies @.5,.7,1.3 hero:sit@.34,.9*1.2 dien:talk@.66,.9*1.3 lamp@.5,.8*1.0 "Thiên Diện bắt hiệp khách ngồi nhìn một ngọn đèn suốt đêm, các Nguyệt Sứ cũ lần lượt nhận dạy từng ổ khóa"',
      'temple dawn +birds @.5,.7,1.6 loi:talk@.66,.9*1.35 hero:zen@.34,.9*1.3 "Lôi Tốc bắt hiệp khách đứng yên một nén nhang, người từng nhanh nhất giờ dạy cách chậm"',
      'temple day +leaves @.5,.7,1.0 bach:hold@.14,.92*1.0 board@.28,.8*.8?8 ngoc:stand@.46,.92*1.0 kho:sit@.62,.92 kinh:strike@.84,.92 mirror@.76,.86*.8?1 "Sân luyện công: Bách Tý bắt gạch bảy việc trên bảng, Ngọc Vô Hà bắt mặc giáp vá ra trận, Khô Vinh canh giấc ngủ, Ảnh Song đập nốt mảnh gương cuối"',
      'peaks/snow dusk +snow @.5,.72,1.7 suong:talk@.66,.9*1.35 hero:stand@.34,.9*1.25 "Lãnh Tịch nhắc hiệp khách: ngươi định gánh hắn ra một mình, ngày trước ta cũng nghĩ một mình ta là đủ"',
      'peaks/summit dawn +dust @.5,.5,1.7 gate@.5,.9*1.2?8 "Tám ổ khóa lần lượt rơi khỏi Thiên Môn, ổ thứ chín mang hình ống sáo xương vẫn còn sáng: tự nghi ngờ"',
      'void/abyss void +redthread @.5,.62,1.15 flute@.64,.46*1.1 hero:kneel@.32,.88*1.25 "Tiếng sáo thì thầm tên từng người đã chết: bà, sư phụ, lão ngư, ngươi mang lại được gì cho những người thương ngươi"',
      'temple night +rain @.5,.74,1.4 statue@.7,.9*.9 hero:sit@.34,.92*1.3 board@.12,.8*.7?9 "Trong ngôi miếu đêm mưa hiệp khách ngồi với tấm bảng tre: lần này không đếm được, những cái tên ấy không nằm ở cột Đã xong"',
      'peaks/summit night ~eclipse@.3,.2,66 @.5,.5,1.2 gate@.5,.88*1.1?8 "Ổ khóa thứ chín vẫn không rơi, trên trời tây vầng trăng bạc đã bị một cái bóng đen gặm vào mép, nguyệt thực còn cách bảy đêm"',
    ],
    // ---- 99.6: Món nợ một gáo nước --------------------------------------------------------------------------------------------
    't99.6': [
      'valley/tea dusk +steam +birds @.5,.7,1.1 hero:walk@.2,.92*1.1 batu:sit@.7,.9*1.1 "Bảy đêm trước nguyệt thực hiệp khách một mình về quán trà dưới chân Vân Mộng, Bà Tư vẫn ngồi quạt lò như chưa từng có ai rời đi"',
      'valley/tea lamp +steam @.5,.7,1.7 batu:talk@.36,.9*1.35 basket@.7,.92*1.2?1 "Bà Tư kể lại lời dặn của người đàn bà năm xưa khi dúi chiếc giỏ vào tay bà: cho nó uống nước mỗi ngày"',
      'valley/tea lamp @.5,.76,2.4 hero:sit@.34,.92*1.3 teapot@.62,.94*1.0 bowl@.52,.95*.9 "Hiệp khách cúi đầu bên bàn trà nói khẽ: bà ấy mất vì con, bà ạ"',
      'valley/tea lamp +steam @.5,.7,1.3 batu:point@.62,.9*1.4 hero:sit@.3,.92*1.25 "Bà Tư gõ nhẹ xuống bàn: bà ấy mất vì hạn, còn chia cháo là việc bà ấy chọn, nợ kiểu ấy không trả ngược, chỉ trả tiếp cho người sau"',
      'valley/stream morning +birds ~sun@.7,.25,50 @.5,.72,1.5 hero:carry@.4,.9*1.35 bucket@.7,.94*1.5 "Sáng hôm sau bên suối hiệp khách gánh nước và chợt hiểu mỗi chuyến nước gánh cho người khác hóa ra là trả cho bà mà không biết"',
      'peaks/am dawn +drift ~sun@.5,.34,60 @.5,.7,1.35 hero:taichi@.5,.9*1.4 "Trên triền núi lúc bình minh hiệp khách tập thái cực, thôi cãi lại tiếng sáo vì cả hai câu đều thật"',
      'peaks/summit dawn +petals ~sun@.5,.3,70 @.5,.6,1.5 thread@.5,.6*1.3?1 gate@.5,.9*.7?9 hero:stand@.5,.94*1.2 "Sợi xích đỏ tuột xuống như sợi chỉ mục vì chỗ trống nay đã có tên có mặt người, trên Thiên Môn ổ khóa thứ chín rơi xuống"',
      'shore/rocks dusk +birds @.5,.7,1.5 vong:talk@.66,.88*1.3 hero:stand@.32,.88*1.25 "Vô Vọng bên bờ đá nói với hiệp khách: khóa cuối là tuyệt vọng, ta không dạy được, chìa của nó nằm trong tay kẻ đang ngồi giữa ruộng nứt"',
      'altar blood +embers +redmist ~red@.5,.24,130 @.5,.5,1.3 ma:cast@.5,.72*1.6 "Từ Huyết Nguyệt đài Tà thần giận dữ tuyên bố đêm nguyệt thực sẽ đốt ba nghìn mạng mang ấn làm củi"',
    ],
    // ---- 99.8: Nguyệt thực ----------------------------------------------------------------------------------------------------
    't99.8': [
      'peaks/summit eclipse ~eclipse@.5,.2,80 @.5,.4,1.3 gate@.64,.88*.9?9 hinh:stand@.3,.92*1.4 ruler@.22,.66*.8 "Đêm nguyệt thực, cái bóng đen nuốt dần vầng trăng bạc, Thiên Hình đứng bên Thiên Môn giơ cao thước ngọc"',
      'arena/field eclipse +redmist +embers @.5,.7,1.0 moc:stand@.5,.92*1.3 smoke@.2,.86*.8 smoke@.8,.86*.8 "Dưới chân núi ba nghìn giáo chúng mang ấn bốc khói đỏ, Tiểu Mộc đứng sẵn với ba nghìn tấm thẻ tre"',
      'arena/field eclipse +redmist @.5,.78,1.6 moc:talk@.5,.92*1.5 bell@.76,.82*.9 "Tiểu Mộc hô to giữa trận: mỗi người một việc ngược với thói của mình, ai hay để mai thì gõ chuông, ai hay ôm việc thì đặt bớt xuống"',
      'arena/field eclipse +redmist @.5,.72,1.2 phong:stand@.2,.92*1.3 drum@.3,.88*1.0 dien:walk@.6,.92*1.2 "Hàn Phong tóc bạc đứng giữ nhịp trống thật chậm, Thiên Diện chạy khắp trận mang gương mặt người thân gọi từng người dậy, khói đỏ thưa dần"',
      'valley/stream eclipse +fireflies @.5,.72,1.2 hero:carry@.62,.9*1.3 moc:stand@.46,.9 phong:stand@.36,.9 suong:stand@.26,.9 mien:stand@.16,.9 "Hiệp khách gánh đôi thùng nước múc từ con suối Lệ thôn đã chảy lại, bạn bè đứng sau đặt tay lên vai"',
      'void/field void +ash @.5,.74,1.5 hero:talk@.34,.9*1.25 be:stand@.66,.9*1.1 ladle@.5,.94*.9?1 "Trong con mắt đỏ lần thứ hai hiệp khách nói với cậu bé: ta không xin huynh tha, ta mang nước tới"',
      'void/field holy +drift @.5,.85,2.2 be:stand@.5,.9*1.4 ladle@.42,.92*1.1?1 "Cậu bé cầm lấy chiếc gáo sứt quai, múc đầy rồi lần đầu tiên trong đời tưới xuống thửa ruộng của mẹ"',
      'void/field holy +bubbles @.5,.88,2.6 be:kneel@.5,.92*1.5 me:lie@.78,.94*1.1 "Cậu bé quỳ bên mẹ thì thầm: mẹ ơi, con tưới rồi này"',
      'peaks/summit eclipse +rays +sparks @.5,.5,1.3 gate@.5,.9*1.0?10 ma:fall@.2,.4*1.4 "Đất nứt khép lại, Tà thần bị hất văng khỏi thân xác Vô Khuyết, trên Thiên Môn ổ khóa thứ mười rơi xuống"',
    ],
    // ---- 100: Song nguyệt -----------------------------------------------------------------------------------------------------
    t100: [
      'peaks/summit eclipse +rays ~crescent@.22,.2,58 @.5,.45,1.2 gate@.5,.9*1.1?12 "Thiên Môn mở toang, ánh sáng tràn xuống đỉnh Vân Mộng đúng lúc bóng đen sắp che kín vầng trăng, Tà thần chỉ còn là một vành trăng khuyết đói khát lao về phía cánh cửa"',
      'peaks/summit holy +rays +sparks @.5,.78,1.8 giao:cast@.5,.9*1.5 "Giáo chủ dang tay thi triển Thôn Nguyệt Quyết lần cuối, dùng nó để giữ chứ không để lấy"',
      'peaks/summit holy +sparks +redthread @.5,.74,1.6 giao:hold@.42,.92*1.5 ma:float@.6,.5*1.3 "Vô Khuyết hút trọn Tà thần vào thân xác già nua của mình và ghì chặt, cửa mở cho cả hai nhưng hắn không bước"',
      'heaven/stairs holy +rays @.5,.6,1.3 hinh:point@.3,.9*1.4 gate@.5,.56*.7?12 "Thiên Hình đứng bên Thiên Môn đã mở toang, chỉ lối cho người kế thừa Hằng Nguyệt bước qua, kẻ ở lại sẽ chết cùng Tà thần trước bình minh"',
      'peaks/summit holy +sparks @.5,.74,1.5 hero:martial@.34,.92*1.45 giao:kneel@.62,.92*1.35 "Hiệp khách không bước qua cửa mà quay lại bên Giáo chủ đang quỵ gối: sư phụ dặn tại hạ gánh cả huynh ấy về"',
      'peaks/summit holy +rays +petals @.5,.5,1.2 gate@.5,.9*1.2?12 hero:walk@.5,.9*.8 giao:lie@.5,.78*.7 "Hiệp khách xốc sư huynh lên vai như một gánh nước, bước qua ánh sáng của Thiên Môn"',
      'heaven/realm holy +rays +petals ~moon@.8,.2,50 @.5,.6,1.3 thien:zen@.34,.9*1.4 hero:bow@.66,.9*1.3 "Trong Thần giới Không Nguyệt trao lại ngôi Hằng Nguyệt tinh cho hiệp khách rồi đi ngao du vũ trụ"',
      'heaven/realm holy +redmist ~red@.5,.24,110 @.5,.35,1.2 "Giữa mười hai phương của Thần giới một vầng trăng đỏ mọc lên: ngôi Phương thần bỏ trống đã nhận ra chủ cũ"',
      'heaven/stairs void +redthread @.5,.74,1.7 giao:hurt@.5,.9*1.5 hero:stand@.2,.94*1.1 "Vô Khuyết nửa người đỏ ngầu thì thào: nó đang nuốt ta từ bên trong, muốn cứu ta hãy đánh lên tới chỗ ta ngồi"',
      'heaven/realm holy +rays @.5,.5,1.0 hinh:talk@.2,.9*1.3 hero:stand@.5,.9*1.25 god:stand@.64,.86*.7 god:stand@.72,.86*.7 god:stand@.8,.86*.7 god:stand@.88,.86*.7 god:stand@.96,.86*.7 "Thiên Hình chỉ cho hiệp khách chặng đường lên: phải thắng cả ba mươi lăm Thiên Cang mới được thách một Phương thần"',
      'heaven/stairs dawn +petals @.5,.64,1.15 hero:carry@.5,.95*1.0 "Hiệp khách bước lên bậc thềm Thần giới mang theo đôi thùng nước, đường lên Thần Vương cũng chỉ đi được bằng từng chuyến nước"',
    ],
    // ---- Kỳ ngộ (v2.18.0): mỗi trang một khung riêng, khóa 'm:<mã>-<lần gặp>' --------------------------------------------------
    'm:batu-1': [
      'valley/tea morning +steam +birds @.55,.66,1.05 hero:walk@.24,.84*1.1 batu:talk@.76,.84*1.15 teapot@.56,.9*1 "Hiệp khách xuống núi mua muối, quán trà cũ vẫn nghi ngút khói, Bà Tư ngồi quạt lò như chưa từng có ai rời đi"',
      'valley/tea morning +steam @.64,.74,1.62 batu:talk@.73,.88*1.31 hero:stand@.38,.88*1.15 teapot@.5,.9*1.1 bowl@.4,.93*1 "Bà Tư rót trà, nhìn hiệp khách bằng ánh mắt hiền: con đi đâu cũng vội như bị ma đuổi"',
      'valley/tea morning +steam @.36,.74,1.62 hero:talk@.29,.88*1.31 batu:stand@.66,.88*1.1 bucket@.14,.92*1?1 pole@.2,.88*.8^-10 "Hiệp khách đứng giữa sân, kể một tràng việc phải làm: gánh nước, luyện kiếm, chép kinh"',
      'valley/tea day +steam @.55,.78,1.68 batu:zen@.63,.87*1.33 hero:sit@.34,.87*1.25 teapot@.46,.93*1.1 bowl@.38,.94*.9 "Hai người ngồi bên ấm trà, nước vừa sôi để lắng, hiệp khách lần đầu thấy mình chậm lại"',
    ],
    'm:batu-2': [
      'valley/tea dusk +steam +fireflies ~sun@.8,.36,15.2 @.5,.64,1.05 batu:talk@.66,.84*1.15 hero:stand@.3,.84*1.1 banner@.44,.82*.9 "Hoàng hôn xuống quán trà, một tấm biển mới treo trước cửa: Nơi hiệp khách từng gánh nước"',
      'valley/tea dusk +steam @.64,.72,1.6 batu:talk@.73,.89*1.31 dan:sit@.44,.89*1.0 dan2:sit@.32,.89*0.95 banner@.82,.84*.8 "Khách ngồi quanh nghe Bà Tư kể: hồi ấy con làm đổ nước suốt"',
      'valley/tea dusk +steam @.34,.72,1.62 hero:talk@.28,.9*1.31 dan:stand@.61,.9*1.0 dan2:stand@.72,.9*0.95 "Hiệp khách đỏ mặt, đứng ngượng giữa những tiếng cười của khách quán"',
      'valley/tea dusk +fireflies ~sun@.8,.36,15.2 @.58,.78,1.68 batu:zen@.65,.87*1.33 hero:stand@.37,.87*1.2 bucket@.46,.93*1.2?1 "Bà Tư vỗ vai hiệp khách, chỉ chiếc thùng đổ nước cũ treo trên tường: ai cũng từng đổ nước, thế họ mới dám bắt đầu"',
    ],
    'm:luc-1': [
      'bridge/bridge dusk +birds @.5,.7,1.1 hero:stand@.34,.59*1.15 luc:sit@.7,.6*1.0 basket@.82,.9*.8 "Dưới gầm cầu Thanh Khê, hiệp khách chia nửa cái bánh bao cho đứa bé ăn mày tên Lục Lục"',
      'bridge/bridge dusk +birds @.66,.78,1.65 luc:talk@.72,.63*1.33 hero:kneel@.39,.64*1.2 "Lục Lục thì thầm: đêm nay người của Huyết Nguyệt Giáo đi qua lối rừng trúc"',
      'peaks/path night +dust ~moon@.3,.2,13.2 @.5,.7,1.25 hero:martial@.4,.79*1.2 dan:back@.79,.6*0.9 dan2:back@.88,.57*0.85 "Nhờ tin của Lục Lục, hiệp khách đổi đường, tránh được toán phục kích trong rừng"',
    ],
    'm:luc-2': [
      'bridge/bridge night +fireflies ~moon@.3,.2,13.2 @.5,.7,1.15 luc:talk@.5,.56*1.2 kid:sit@.31,.6*0.95 kid:sit@.71,.61*0.95 dan:sit@.83,.61*0.9 "Dưới gầm cầu, Lục Lục và ba mươi đứa bạn họp nhau bên bảng tin tự làm"',
      'bridge/bridge night +fireflies @.5,.6,1.5 board@.5,.5*1.5 hero:zen@.29,.63*1.15 luc:stand@.69,.63*1.1 "Bảng tin ba cột: Nghe được, Đang kiểm, Chắc chắn, hiệp khách đọc từng dòng"',
      'bridge/bridge night ~moon@.3,.2,13.2 @.4,.72,1.55 hero:talk@.31,.64*1.3 luc:talk@.64,.65*1.2 kid:stand@.77,.66*0.9 "Hiệp khách khen Lục Lục: ngươi còn giỏi hơn thám báo của triều đình"',
    ],
    'm:cuu-1': [
      'town/street dusk +embers @.6,.7,1.15 cuu:talk@.64,.86*1.25 hero:stand@.33,.86*1.15 fire@.82,.9*.8 "Lò rèn của Thiết Cửu đỏ lửa trở lại, ông nhớ ơn người từng gõ chuông đánh thức cả trấn"',
      'town/street dusk +embers +sparks @.66,.72,1.62 cuu:martial@.76,.91*1.31 sabers@.5,.7*.5 fire@.84,.9*.9 "Thiết Cửu quai búa trên đe, rèn đôi móc sắt nhỏ để gánh nước đỡ trượt vai"',
      'town/street dusk +embers @.5,.72,1.65 cuu:zen@.63,.91*1.31 hero:stand@.35,.91*1.2 bucket@.5,.93*1.1?1 fire@.84,.9*.85 "Công cụ tốt không làm thay việc của ngươi, nó chỉ bớt những phiền phức không đáng có"',
    ],
    'm:cuu-2': [
      'town/street day +sparks @.55,.7,1.3 cuu:talk@.71,.86*1.3 hero:stand@.33,.86*1.2 pole@.5,.86*.9^-8 fire@.84,.9*.8 "Thiết Cửu đòi bịt sắt cho Đòn Gánh, bảo gỗ thế này gặp đao Huyết Nguyệt Giáo là gãy"',
      'town/street day @.36,.74,1.62 hero:talk@.29,.9*1.31 pole@.62,.84*1?1 cuu:stand@.66,.9*1.2 "Hiệp khách xin giữ Đòn Gánh là gỗ, gãy thì gọt lại, mỗi lần gọt lại hiểu nó hơn"',
      'town/street day +sparks @.62,.76,1.65 cuu:zen@.7,.89*1.31 hero:stand@.37,.89*1.2 fire@.86,.9*.9 "Thiết Cửu cười gằn rồi rèn cho hiệp khách con dao gọt tốt nhất trấn"',
    ],
    'm:diep-1': [
      'peaks/path morning +leaves @.5,.7,1.15 diep:talk@.69,.63*1.2 hero:stand@.34,.81*1.15 basket@.84,.88*.7 "Một nữ thầy thuốc đeo hòm gỗ chặn hiệp khách giữa đường núi, bắt lấy cổ tay"',
      'peaks/path morning +leaves @.62,.76,1.65 diep:point@.68,.7*1.33 hero:stand@.37,.86*1.2 "Mạch nhanh, khí nổi, mắt quầng: ngươi ngủ mấy canh mỗi đêm?"',
      'peaks/path morning +leaves @.38,.76,1.62 hero:hurt@.3,.84*1.3 diep:stand@.63,.67*1.2 "Hiệp khách gãi đầu thú nhận: dạ hai canh, việc nhiều quá"',
      'interior/am lamp +steam @.55,.74,1.65 diep:zen@.65,.94*1.31 hero:sit@.34,.94*1.2 teapot@.46,.92*1.1 "Diệp Thanh Đàn kê một thang thuốc: đủ bốn canh ngủ mỗi đêm, uống liền ba mươi ngày"',
    ],
    'm:diep-2': [
      'village/camp day +steam @.6,.7,1.15 diep:talk@.68,.85*1.2 dan:lie@.33,.85*0.95 dan2:lie@.22,.85*0.9 kid:sit@.84,.85*0.85 "Những người uống đan của Khô Vinh đang kiệt dần, Diệp Thanh Đàn cần người khiêng thuốc tới mười làng"',
      'peaks/path dusk +dust @.5,.72,1.3 hero:carry@.35,.81*1.2 diep:walk@.63,.67*1.15 basket@.82,.86*.8 "Hiệp khách cùng Diệp Thanh Đàn đi suốt hai tuần, vai nặng thuốc, chân đầy bụi"',
      'village/camp dusk +steam @.62,.76,1.65 diep:zen@.67,.89*1.31 dan:sit@.37,.89*1.1 bowl@.44,.93*.9 "Đến làng nào bà cũng dặn một câu: ngủ đi, việc vẫn ở đó chờ"',
    ],
    'm:yen-1': [
      'town/roofs night +birds ~moon@.7,.22,14.7 @.5,.6,1.1 yen:float@.7,.5*1.1 hero:stand@.28,.82*1.1 dan:back@.13,.82*0.8 "Giữa chợ đêm, một bóng áo xanh lướt qua mái ngói, túi tiền mua thuốc biến mất"',
      'town/roofs night @.66,.5,1.62 yen:talk@.68,.52*1.31 tiles@.7,.62*1.2 "Phi Yến đứng trên mái nhà cười: ta lỡ tay rồi, ngươi trông nghèo thật"',
      'town/street dusk +dust @.5,.7,1.3 hero:walk@.31,.86*1.2 dan:sit@.6,.86*1.0 dan2:sit@.73,.86*0.95 kid:sit@.84,.86*0.85 "Hiệp khách không đuổi trên mái mà chạy thẳng tới xóm nghèo nhất trấn, nơi Phi Yến đang chia tiền"',
      'town/street dusk @.36,.74,1.62 hero:talk@.29,.9*1.31 yen:stand@.64,.9*1.25 dan:sit@.79,.9*0.85 "Hiệp khách xin cô cứ chia, chỉ nhờ mua thuốc cho chính những người này"',
    ],
    'm:yen-2': [
      'town/roofs dusk +birds ~sun@.3,.4,16.2 @.58,.52,1.4 yen:talk@.62,.5*1.3 tiles@.5,.6*1.2 letter@.34,.5*.6 "Phi Yến ngồi trên mái, vẫy cuốn sổ trộm được từ Huyết Nguyệt Giáo"',
      'town/roofs dusk +birds @.5,.54,1.5 yen:float@.74,.46*1.2< letter@.4,.62*.9^20 hero:stand@.31,.82*1.1 "Cô ném cuốn sổ rồi biến mất trên mái ngói, ba làng kịp sơ tán trước khi Nguyệt Sứ tới"',
      'town/street dusk @.36,.74,1.62 hero:talk@.29,.9*1.31 letter@.6,.86*.7 "Hiệp khách hỏi vọng lên mái: cô nương, sao lại giúp tại hạ?"',
      'town/roofs dusk +birds ~sun@.3,.4,16.2 @.66,.5,1.65 yen:talk@.66,.5*1.31 tiles@.6,.62*1.2 "Vì ngươi đã không bắt ta hôm ở chợ: người tin ta một lần, ta trả bằng một cuốn sổ"',
    ],
    'm:nhan-1': [
      'interior/am night ~moon@.3,.2,13.7 @.5,.7,1.1 hero:lie@.3,.9*1.1 nhan:stand@.7,.9*1.15 "Nửa đêm, một bóng đen lẻn vào am tranh, lưỡi dao mỏng như lá lúa"',
      'interior/am night +dust @.66,.72,1.65 nhan:strike@.72,.95*1.33 sabers@.4,.7*.4 "Ảnh Nhận chưa từng ra tay quá một lần, hắn muốn xem hiệp khách có ngủ say như kẻ khác"',
      'valley/stream dawn +birds @.5,.78,1.4 hero:carry@.35,.86*1.2 bucket@.2,.92*1.1?1 "Canh tư, hiệp khách đã thức dậy gánh nước, lưỡi dao chỉ đâm vào chăn trống"',
    ],
    'm:nhan-2': [
      'bridge/bridge night +drift ~red@.7,.2,18.7 @.5,.66,1.3 nhan:cast@.69,.63*1.3 hero:martial@.35,.62*1.2 slash@.5,.6*1.2?2 "Giữa trận, Ảnh Nhận phá lời thề, lao tới lúc hiệp khách đang đỡ một đòn khác"',
      'bridge/bridge night +drift ~red@.7,.2,18.7 @.5,.7,1.6 hero:martial@.33,.67*1.2 nhan:strike@.61,.65*1.3 moc:martial@.8,.68*1.1 "Tiểu Mộc đứng chắn sau lưng như mọi khi"',
      'bridge/bridge night @.66,.76,1.62 moc:martial@.69,.62*1.31 nhan:back@.43,.63*1.2 hero:stand@.94,.65*1.0 "Muốn đâm sư huynh thì phải qua đệ trước, đệ canh lưng bao năm rồi đấy"',
    ],
    'm:lamhat-1': [
      'interior/am lamp +steam @.5,.7,1.1 lamhat:stand@.7,.9*1.2 hero:sit@.3,.9*1.15 teapot@.5,.92*1 bowl@.4,.94*.9 "Quán trà ven đường mời hiệp khách chén trà màu lam thơm lạ, bà chủ quán cười rất hiền"',
      'interior/am lamp +steam @.66,.74,1.65 lamhat:talk@.72,.94*1.33 bowl@.44,.9*1.2 "Uống đi khách quý, trà này giúp người ta không bao giờ thấy mệt"',
      'valley/stream day +leaves @.5,.8,1.65 hero:zen@.32,.86*1.25 bowl@.52,.94*1 sprout@.66,.92*.4 "Hiệp khách nhớ lời sư phụ, thứ gì hứa không bao giờ mệt đều đáng ngờ, đổ chén trà xuống đất, cỏ héo rũ"',
    ],
    'm:lamhat-2': [
      'village/camp night +fireflies ~moon@.7,.2,14.2 @.5,.66,1.2 lamhat:cast@.73,.85*1.2 dan:lie@.21,.85*1.0 dan2:lie@.35,.85*0.95 kid:lie@.46,.85*0.9 "Lam Hạt thả độc vào giếng, đệ tử võ đường lần lượt ngã bệnh"',
      'village/dyke morning +leaves @.5,.72,1.3 hero:martial@.35,.86*1.2 dan:carry@.61,.86*1.0 dan2:carry@.75,.86*0.95 bucket@.86,.92*1?1 "Hiệp khách cho lấp giếng, gánh nước từ suối xa cho cả võ đường"',
      'valley/stream morning +birds @.55,.74,1.5 lamhat:fall@.62,.87*1.2 dan:martial@.34,.87*1.05 dan2:martial@.82,.87*1.0 shards@.48,.94*1 "Ba ngày sau, Lam Hạt bị dân ba làng chặn ở cửa rừng, hũ độc vỡ tan"',
    ],
    'm:kytien-1': [
      'peaks/path day +leaves +birds @.5,.7,1.15 kytien:sit@.68,.64*1.2 hero:sit@.31,.82*1.15 goboard@.5,.9*1?6 "Kỳ Tiên Ông bày bàn cờ giữa đường núi: ván này chỉ được đi ba nước"',
      'peaks/path day @.38,.78,1.64 hero:talk@.3,.83*1.31 goboard@.62,.88*1.1?6 kytien:stand@.72,.62*1.1 "Hiệp khách hỏi: ba nước thì làm sao thắng được ạ?"',
      'peaks/path day +leaves @.66,.78,1.66 kytien:zen@.68,.7*1.33 goboard@.38,.88*1.1?3 "Không cần thắng cả bàn, chỉ cần cứu được con xe đang bị vây"',
      'peaks/path dusk +birds @.5,.78,1.62 hero:taichi@.41,.81*1.25 goboard@.62,.88*1.1?6 kytien:stand@.78,.62*1.15 "Hiệp khách bỏ qua những quân hấp dẫn, ba nước đưa con xe ra khỏi vòng vây, lão ông vuốt râu cười"',
    ],
    'm:kytien-2': [
      'peaks/am dawn +drift @.5,.7,1.2 kytien:sit@.67,.82*1.2 hero:sit@.31,.82*1.15 goboard@.5,.9*1?2 "Bàn cờ lần này không có quân tướng, kỳ ông hỏi hiệp khách bảo vệ cái gì"',
      'peaks/am dawn @.4,.78,1.65 hero:zen@.29,.84*1.3 goboard@.62,.88*1.1?2 "Không có tướng, tốt là thứ còn lại để giữ bàn cờ"',
      'peaks/am dawn +drift @.66,.78,1.66 kytien:zen@.7,.84*1.33 goboard@.4,.88*1.1?0 hero:sit@.3,.84*.9 "Lệ Vô Khuyết năm xưa cũng ngồi đây, thí hết tốt để đổi một nước chiếu tướng, thắng ván cờ và chẳng còn ai bên cạnh"',
    ],
    'm:cokiem-1': [
      'bridge/river day +leaves @.5,.7,1.2 cokiem:martial@.71,.85*1.25 hero:stand@.31,.85*1.15 "Cô Kiếm Lãng Tử chặn hiệp khách bên sông: rút kiếm đi, kẻ gánh nước"',
      'bridge/river day +leaves @.5,.7,1.5 cokiem:strike@.61,.88*1.3 hero:strike@.41,.88*1.3 pole@.5,.74*.5^-80 "Một kiếm duy nhất, kiếm dừng cách cổ một sợi tóc, Đòn Gánh dừng cách ngực một sợi tóc"',
      'bridge/river dusk +leaves @.64,.76,1.65 cokiem:talk@.71,.88*1.33 hero:stand@.36,.88*1.2 "Hòa, ngươi luyện chiêu này bao lâu rồi?"',
      'bridge/river dusk @.38,.76,1.65 hero:talk@.3,.88*1.31 cokiem:stand@.66,.88*1.2 pole@.16,.88*.8^-10 "Mỗi ngày một trăm lần, từ ngày lên núi"',
    ],
    'm:cokiem-2': [
      'valley/tea dusk +birds @.5,.7,1.15 cokiem:stand@.68,.85*1.2 hero:stand@.32,.85*1.15 "Lãng tử đứng bên quán trà cuối ngày, đi cả đời tìm đối thủ mà chẳng có nhà"',
      'valley/tea dusk @.38,.76,1.62 hero:point@.3,.87*1.3 cokiem:stand@.67,.87*1.2 kid:stand@.81,.87*0.8 "Hiệp khách mời ông dạy kiếm cho bọn trẻ ở võ đường"',
      'town/square morning +birds @.5,.7,1.2 cokiem:martial@.5,.86*1.3 kid:sit@.21,.86*0.9 kid:sit@.33,.86*0.85 kid:sit@.77,.86*0.9 kid:sit@.89,.86*0.85 "Từ đó sân võ đường có thêm một kiếm khách già, mỗi sáng một chiêu, chưa từng nghỉ ngày nào"',
    ],
    'm:vantam-1': [
      'interior/am lamp +dust @.5,.68,1.15 vantam:sit@.68,.9*1.2 hero:sit@.31,.9*1.15 letter@.5,.5*1 "Tạ Văn Tâm, người chép chuyện giang hồ, xin hiệp khách kể từ chuyến nước đầu tiên"',
      'interior/am lamp @.38,.76,1.64 hero:talk@.3,.93*1.3 vantam:stand@.67,.93*1.15 "Có gì đáng chép đâu, toàn chuyện gánh nước, luyện kiếm, ngủ dậy lại gánh nước"',
      'interior/am lamp +dust @.64,.76,1.66 vantam:zen@.69,.93*1.33 letter@.38,.5*.9 "Chính những chuyện lặp lại mới đáng chép, người đời chỉ nhớ trận đánh mà quên trăm ngày luyện trước trận đánh"',
    ],
    'm:vantam-2': [
      'temple day +petals @.5,.68,1.15 vantam:stand@.68,.86*1.2 hero:stand@.31,.86*1.15 letter@.5,.5*.9 "Tạ Văn Tâm đã chép ba quyển về hiệp khách, còn một quyển chưa viết được: quyển về Lệ Vô Khuyết"',
      'temple day +petals @.38,.76,1.65 hero:zen@.28,.9*1.3 vantam:stand@.68,.9*1.15 "Viết đi, viết cả mẹ huynh ấy, cả mùa hạn năm xưa: kẻ ác cũng từng là một đứa trẻ"',
      'temple dusk +petals +birds @.62,.76,1.66 vantam:bow@.67,.9*1.31 letter@.36,.5*.9 "Hiệp khách là người đầu tiên bảo ông viết cho kẻ thù một trang tử tế"',
    ],
    'm:nhuy-1': [
      'town/square day +birds @.5,.7,1.15 nhuy:talk@.69,.86*1.2 hero:stand@.32,.86*1.15 letter@.5,.8*.9 "Kim Như Ý nghe nói hiệp khách giữ quỹ sửa cầu, đòi xem sổ"',
      'town/square day @.38,.76,1.64 hero:talk@.3,.89*1.3 letter@.6,.84*.8 nhuy:stand@.68,.89*1.15 "Hiệp khách ghi từng đồng: ngày nào thu, ngày nào chi, mua gỗ gì"',
      'town/square day +birds @.64,.76,1.66 nhuy:zen@.69,.89*1.31 letter@.38,.84*.8 "Sổ sạch thế này thì thương hội góp thêm một nửa: tiền chỉ chảy về nơi được ghi chép rõ ràng"',
    ],
    'm:nhuy-2': [
      'town/square dusk +birds @.5,.7,1.2 nhuy:talk@.69,.86*1.2 hero:stand@.33,.86*1.15 boat@.9,.9*.5 "Kim Như Ý hỏi có nên nhận món lời gấp mười của Huyết Nguyệt Giáo chở hàng cho chúng"',
      'town/square dusk @.38,.76,1.65 hero:talk@.3,.89*1.31 nhuy:stand@.68,.89*1.15 "Hàng của chúng là khổ đau của người khác, lời gấp mười nhưng lỗ cả đời"',
      'bridge/river dawn +birds ~sun@.3,.4,15.2 @.5,.7,1.2 nhuy:stand@.31,.85*1.2 hero:stand@.21,.85*1.1 boat@.64,.88*1.1 boat@.84,.9*.9 "Thương hội đã từ chối từ hôm qua, cho hết thuyền chở gạo về trấn Thanh Khê"',
    ],
    'm:ngao-1': [
      'town/gate day +birds @.5,.7,1.15 ngao:talk@.62,.86*1.25 hero:stand@.29,.86*1.15 banner@.86,.9*1 "Hách Liên Ngạo chặn cổng Thiên Ưng Bảo, khoe mười năm học với ba danh sư"',
      'town/gate day +birds @.6,.72,1.5 ngao:point@.62,.89*1.3 hero:stand@.36,.89*1.15 dan:stand@.84,.89*0.9 dan2:stand@.92,.89*0.85 banner@.12,.9*.9 "Hắn đòi hiệp khách quỳ xuống mới cho qua, người xem xì xào"',
      'peaks/path morning +leaves @.5,.7,1.3 hero:walk@.4,.79*1.2 "Hiệp khách không cãi, đi đường vòng xa hơn nửa canh giờ, việc cần làm ở bên kia núi"',
    ],
    'm:ngao-2': [
      'town/gate dusk +embers +sparks @.5,.66,1.15 ngao:kneel@.69,.86*1.2 banner@.86,.9*1 dan:hurt@.21,.86*0.95 dan2:lie@.31,.86*0.9 "Thiên Ưng Bảo bị Huyết Nguyệt Giáo vây ba ngày, ba danh sư bỏ chạy, Hách Liên Ngạo xin giúp"',
      'town/gate night +dust +sparks @.5,.7,1.3 hero:martial@.37,.86*1.25 dan:back@.69,.86*1.0 dan2:back@.82,.86*0.95 slash@.52,.66*1.2?1 "Hiệp khách đến, không một lời trách, đánh lui địch ngoài cổng bảo"',
      'town/gate morning +birds @.5,.74,1.5 ngao:carry@.35,.88*1.2 bucket@.62,.92*1.1?1 hero:stand@.69,.88*1.1 "Việc duy nhất hiệp khách nhờ: mỗi sáng thiếu chủ gánh nước cho bảo, một chuyến thôi đấy"',
    ],
    'm:tuytang-1': [
      'temple dusk +leaves +birds @.5,.68,1.15 tuytang:talk@.68,.86*1.2 hero:stand@.31,.86*1.15 bowl@.5,.92*1 "Túy Tăng chống vò rượu bên chùa, ra một câu đố: một chén mỗi ngày thì bao lâu hết vò?"',
      'temple dusk +leaves @.38,.76,1.64 hero:talk@.3,.89*1.3 tuytang:stand@.68,.89*1.2 "Hiệp khách đáp: còn tùy vò lớn hay nhỏ, đại sư"',
      'temple dusk +leaves +birds @.64,.76,1.66 tuytang:zen@.68,.9*1.33 bowl@.4,.92*1 "Sai! Ngày nào bần tăng cũng rót thêm nên chẳng bao giờ hết, việc tốt làm đều thì không cạn"',
    ],
    'm:tuytang-2': [
      'temple dawn +birds @.5,.68,1.15 tuytang:sit@.68,.86*1.2 hero:stand@.31,.86*1.15 bowl@.52,.93*1 "Bình minh ở chùa, Túy Tăng say ba mươi năm để khỏi phải nhìn rõ"',
      'temple dawn @.38,.76,1.64 hero:zen@.3,.89*1.3 tuytang:stand@.68,.89*1.2 "Hiệp khách dám nhìn rõ Giáo chủ, vì nhìn rõ hắn cũng là nhìn rõ phần sợ hãi trong chính mình"',
      'valley/stream morning +leaves +birds @.5,.78,1.5 tuytang:stand@.59,.86*1.25 shards@.48,.94*1.1 hero:walk@.28,.86*1.15 "Túy Tăng đổ vò rượu xuống suối rồi tỉnh táo đi cùng một quãng"',
    ],
    'm:daoly-1': [
      'town/square dusk +petals @.5,.66,1.15 dao:float@.69,.86*1.0 ly:float@.31,.86*1.0 basket@.5,.5*.7 hero:stand@.5,.86*1.15 "Hai cô bé song sinh Đào và Lý nhảy quanh hiệp khách, chuyền túi gạo qua lại"',
      'town/square dusk +petals @.5,.7,1.3 dao:walk@.29,.86*1.0 ly:walk@.73,.86*1.0 basket@.5,.6*.8^30 hero:stand@.5,.86*1.2 lanterns@.5,.26*1?5 "Đuổi đứa này thì đứa kia đã chạy mất, túi gạo bay từ tay bên này sang bên kia"',
      'town/square night +fireflies @.5,.76,1.5 hero:taichi@.5,.87*1.3 dao:fall@.31,.87*1.0 ly:fall@.71,.87*1.0 basket@.5,.5*.8 "Hiệp khách đứng yên, chuyền tới lần thứ mười hai đứa mỏi tay, túi gạo rơi trúng lòng"',
    ],
    'm:daoly-2': [
      'town/square night +fireflies @.5,.6,1.15 dao:talk@.31,.87*1.1 ly:talk@.69,.87*1.1 lanterns@.5,.24*1.1?8 hero:stand@.5,.87*1.15 "Đào và Lý biết lối vào gánh xiếc của Thiên Diện, nơi Huyết Nguyệt Giáo giấu người bắt trong hội đèn"',
      'town/square night +sparks @.5,.7,1.3 dao:strike@.31,.86*1.1 ly:strike@.71,.86*1.1 dien:stagger@.5,.86*1.2 hero:martial@.16,.86*1.1 "Đào giả làm Lý, Lý giả làm Đào, Thiên Diện nghìn mặt mà không nhận ra ai là ai"',
    ],
    'm:vongtinh-1': [
      'peaks/am night +drift ~moon@.25,.2,13.7 @.5,.66,1.2 vongtinh:zen@.69,.82*1.2 hero:sit@.31,.82*1.15 "Bà lão mù ngồi nhìn trời đêm, thấy trăng đỏ đang lớn dần và một vì sao bạc đi rất chậm"',
      'peaks/am night +drift ~red@.7,.2,18.7 @.4,.64,1.45 hero:talk@.27,.86*1.3 vongtinh:sit@.57,.86*1.15 "Hiệp khách ngước nhìn vầng trăng đỏ đang lớn dần, hỏi bà vì sao bạc ấy là gì"',
      'peaks/am night +drift @.62,.76,1.66 vongtinh:zen@.68,.85*1.33 hero:talk@.35,.85*1.2 "Vì sao bạc ấy là ngươi, trăng đỏ nhanh hơn nhưng nó đang ăn chính mình"',
    ],
    'm:vongtinh-2': [
      'peaks/summit night +drift ~moon@.3,.2,13.2 ~red@.7,.22,17.2 @.5,.5,1.2 vongtinh:zen@.5,.78*1.25 hero:stand@.31,.78*1.1 "Trên đỉnh núi, bà thấy ngày hai vầng trăng cùng mọc: một vầng sẽ sáng, một vầng sẽ đói"',
      'peaks/summit night +drift ~moon@.3,.2,13.2 @.4,.76,1.66 hero:zen@.31,.83*1.31 bucket@.66,.93*1.2?1 "Hiệp khách muốn làm vầng trăng in trong thùng nước: không to, không sáng nhất, nhưng yên"',
    ],
    'm:hotam-1': [
      'peaks/path night +drift ~moon@.7,.2,13.7 @.5,.7,1.15 hotam:kneel@.69,.63*1.15 hero:stand@.31,.82*1.15 "Hồ Tam, cựu thủ hạ của Khô Vinh, quỳ bên đường muốn chuộc lỗi mà không biết bắt đầu từ đâu"',
      'peaks/path night +drift @.38,.76,1.65 hero:point@.3,.84*1.3 hotam:kneel@.66,.66*1.2 "Bắt đầu từ một người, tìm người đầu tiên ngươi phát đan và chăm họ khỏe lại"',
      'village/camp morning +steam +birds @.55,.74,1.4 hotam:carry@.37,.86*1.2 dan:sit@.67,.86*1.05 pill@.5,.76*.4 kid:sit@.81,.86*0.85 "Hồ Tam đi tìm từng người một, đến người thứ mười mới ngủ được một giấc trọn đêm"',
    ],
    'm:hotam-2': [
      'interior/am lamp +dust @.5,.68,1.15 hotam:talk@.68,.9*1.2 hero:stand@.31,.9*1.15 letter@.5,.62*1.2 "Hồ Tam trải bản đồ lối lên Huyết Nguyệt đài, xin hiệp khách đừng chỉ đánh mà hãy cứu người còn bị giam"',
      'peaks/path night +dust ~moon@.7,.2,13.7 ~red@.5,.2,16.2 @.5,.7,1.3 hero:walk@.31,.83*1.2 hotam:point@.5,.74*1.15 dan:walk@.69,.64*1.0 dan2:walk@.79,.6*0.95 gate@.9,.84*.8 "Hiệp khách dẫn người phá trại giam ngoài Huyết Nguyệt đài, cứu ba trăm người bị Thôn Nguyệt Quyết hút dở"',
    ],
    'm:trinhho-1': [
      'town/gate day @.5,.7,1.15 trinhho:talk@.66,.86*1.25 palanquin@.88,.9*.8 dan:stand@.21,.86*0.95 dan2:stand@.31,.86*0.9 "Quan Trịnh Bá Hổ ra lệnh: ai gánh nước từ suối công phải nộp thuế, một chuyến một đồng"',
      'village/camp day +dust @.5,.72,1.3 dan:carry@.31,.86*1.05 dan2:carry@.46,.86*1.0 kid:carry@.61,.86*0.9 bucket@.8,.92*1.1?1 "Dân chân núi kêu trời, người nghèo nhất lại phải gánh nước nhiều nhất"',
      'village/dyke morning +leaves @.5,.76,1.5 hero:martial@.31,.86*1.2 dan:martial@.52,.86*1.0 dan2:martial@.65,.86*1.0 kid:stand@.8,.86*0.85 pole@.14,.9*1?1 "Hiệp khách không đánh quan mà cùng dân đào con mương dẫn nước về tận làng"',
    ],
    'm:trinhho-2': [
      'town/gate night +fireflies ~moon@.3,.2,13.7 @.5,.66,1.15 trinhho:stand@.69,.86*1.25 gate@.5,.84*1.1 "Huyết Nguyệt Giáo hứa cho quan lên chức tri phủ nếu mở cổng thành cho chúng"',
      'town/gate night +fireflies +sparks @.5,.7,1.2 hero:martial@.5,.86*1.2 luc:stand@.31,.86*0.9 kid:stand@.21,.86*0.85 dan:stand@.69,.86*1.0 dan2:stand@.81,.86*0.95 torch@.62,.9*1.1 "Đêm ấy cổng thành mở, nhưng ngoài cổng là dân chân núi cùng Lục Lục và lũ trẻ đã báo tin từ trước"',
    ],
    'm:moclao-1': [
      'peaks/path morning +leaves +birds @.5,.7,1.15 moclao:martial@.69,.63*1.25 hero:stand@.31,.82*1.15 statue@.88,.8*.6 "Mộc Lão chặt một cây cổ thụ đã ba năm, mỗi ngày một nhát"',
      'peaks/path morning +leaves @.38,.76,1.64 hero:talk@.3,.84*1.3 moclao:stand@.68,.65*1.2 "Hiệp khách thắc mắc: ba năm cho một cây, sao lão không chặt một lúc cho xong?"',
      'peaks/path dusk +leaves @.64,.76,1.66 moclao:zen@.69,.7*1.33 hero:sit@.36,.87*1.1 "Vì ta còn phải đốn củi, nấu cơm, dạy cháu, mỗi ngày một nhát không làm ta mệt, mai nó sẽ đổ"',
      'peaks/path morning +leaves +dust @.5,.7,1.3 moclao:walk@.63,.67*1.2 hero:stand@.31,.83*1.15 tiles@.4,.9*.6^70 "Sáng hôm sau cây đổ ầm, Mộc Lão không reo mừng, chỉ đi tìm cây khác chặt nhát đầu tiên"',
    ],
    'm:moclao-2': [
      'peaks/path dusk +leaves @.5,.68,1.2 moclao:martial@.69,.63*1.3 hero:stand@.31,.83*1.15 "Mộc Lão bảo hiệp khách đỡ một nhát rìu của lão"',
      'peaks/path dusk +dust @.5,.72,1.5 moclao:strike@.65,.69*1.31 hero:taichi@.37,.83*1.3 slash@.5,.7*1.2?0 "Nhát rìu bổ xuống nặng như núi đổ, hiệp khách không đỡ, chỉ dẫn lực rìu xuống đất, mặt đất nứt một đường dài"',
      'peaks/path dusk +leaves @.64,.78,1.65 moclao:zen@.69,.69*1.33 hero:stand@.36,.85*1.2 "Biết tránh cái không cần đỡ, được"',
    ],
    'm:tieuhuyet-1': [
      'village/camp night +fireflies ~moon@.7,.2,14.2 @.5,.7,1.15 tieuhuyet:stand@.69,.85*1.0 hero:stand@.31,.85*1.15 "Giữa đêm, Tiểu Huyết nhỏ gầy cầm dao đứng chắn đường hiệp khách"',
      'village/camp night +fireflies @.66,.8,1.68 tieuhuyet:talk@.72,.87*1.36 sabers@.36,.8*.3 "Giáo chủ nói giết được ngươi thì ta sẽ không phải đói nữa"',
      'village/camp night +fireflies +steam @.5,.8,1.68 hero:kneel@.35,.87*1.3 tieuhuyet:stand@.68,.87*1.2 bowl@.52,.84*.6 "Hiệp khách nắm lấy cổ tay gầy guộc, đặt vào đó một cái bánh bao còn nóng: ăn đi đã, đói thì không nghĩ được gì"',
    ],
    'm:tieuhuyet-2': [
      'valley/stream morning +birds @.5,.78,1.3 su:carry@.4,.86*1.2 tieuhuyet:carry@.61,.86*1.0 bucket@.2,.92*1?1 bucket@.8,.92*.9?1 "Tiểu Huyết ở lại võ đường, mỗi sáng theo sư phụ đã mất võ công xuống suối gánh nước"',
      'valley/stream morning +leaves @.62,.76,1.65 tieuhuyet:talk@.68,.89*1.34 su:stand@.37,.89*1.2 pole@.84,.86*.8^-8 "Ông ơi, gánh nước mỗi ngày làm gì, chẳng mạnh lên được bao nhiêu"',
      'valley/stream dawn +birds ~sun@.78,.3,15.2 @.4,.78,1.65 su:zen@.32,.88*1.31 tieuhuyet:stand@.64,.88*1.2 bucket@.54,.93*1.1?1 "Không mạnh lên nhiều, nhưng ngày nào cũng có nước, thế là đủ cho một đứa trẻ không phải đói nữa"',
    ],
    'm:bacham-1': [
      'shore/rocks night +fireflies +ripple ~moon@.7,.2,15.2 @.5,.68,1.15 bacham:sit@.69,.83*1.2 drum@.82,.9*.6 hero:sit@.31,.84*1.15 "Bạch Âm ngồi bên mặt nước đêm, gọi hiệp khách nghe một khúc đàn khác với tiếng sáo của Khúc U"',
      'shore/rocks night +ripple @.64,.78,1.65 bacham:zen@.69,.85*1.33 drum@.82,.88*.7 "Tiếng đàn chỉ đếm nhịp, chậm rãi như bước chân người gánh nước"',
      'shore/rocks night +fireflies ~moon@.7,.2,15.2 @.36,.78,1.66 hero:zen@.29,.87*1.31 "Nghe đàn, hiệp khách thấy mình đang đếm lại những ngày đã qua, ngày nào cũng có một việc đã xong"',
    ],
    'm:bacham-2': [
      'shore/rocks dusk +birds +ripple @.5,.68,1.15 bacham:stand@.69,.83*1.2 drum@.84,.9*.6 hero:martial@.31,.84*1.15 "Trận này Bạch Âm không cầm kiếm, bà giữ nhịp cho mọi người"',
      'shore/rocks dusk +ripple +sparks @.5,.7,1.35 bacham:cast@.5,.85*1.2 hero:martial@.27,.85*1.2 dan:martial@.73,.84*1.05 dan2:martial@.84,.84*1.0 drum@.5,.9*.55 "Tiếng đàn vang đều giữa trận, ai hoảng loạn cũng tìm lại được hơi thở, Thôn Nguyệt Quyết không hút được nỗi sợ nào"',
    ],
    'm:thien-1': [
      'temple dawn +birds @.5,.68,1.15 thien:zen@.69,.86*1.2 hero:stand@.31,.86*1.15 bucket@.5,.92*1?1 "Thiền sư Không Nguyệt đi ngang võ đường, ghé xem thùng nước của hiệp khách còn yên không"',
      'temple dawn @.38,.76,1.64 hero:talk@.3,.89*1.3 thien:stand@.68,.89*1.2 "Dạo này tại hạ bận quá, nhiều hôm không ngồi thiền được"',
      'temple dawn +birds @.64,.78,1.66 thien:zen@.68,.89*1.33 hero:zen@.36,.89*1.2 "Thì ngồi ba hơi thở, ba hơi cũng là thiền, đừng đợi có nửa canh giờ trống mới bắt đầu"',
    ],
    'm:thien-2': [
      'peaks/snow night +snow ~moon@.7,.2,13.7 @.5,.68,1.2 thien:zen@.67,.81*1.25 hero:sit@.31,.81*1.15 "Đêm tuyết, thiền sư kể đã đi ngang Huyết Nguyệt đài, thấy hắn ngồi một mình đếm những gì còn thiếu"',
      'peaks/snow night +snow @.4,.78,1.66 hero:zen@.31,.84*1.31 thien:stand@.71,.84*1.2 "Hiệp khách hỏi có cách nào khiến huynh ấy đếm những gì đã có không"',
      'peaks/snow night +snow ~moon@.7,.2,13.7 @.62,.78,1.66 thien:talk@.67,.84*1.33 hero:stand@.35,.84*1.2 "Có, cho hắn thấy một người đếm những gì đã có, mỗi ngày"',
    ],
    'm:hai-1': [
      'shore/hut dusk +birds @.5,.66,1.15 hai:talk@.83,.83*1.0 net@.84,.86*.8 letter@.5,.34*.6 "Một con hải âu đáp xuống võ đường, chân buộc mảnh giấy nguệch ngoạc từ lão ngư ngoài đảo đá"',
      'peaks/summit morning +drift +birds @.4,.74,1.5 hero:stand@.36,.82*1.3 letter@.62,.88*.7 "Hiệp khách đứng đón gió núi thay sóng biển, không bỏ ngày nào"',
      'shore/hut dusk +birds +ripple @.62,.74,1.65 hai:talk@.68,.87*1.34 net@.84,.86*.9 "Được, không có biển thì tìm gió, không có thời gian dài thì tìm thời gian ngắn, đừng có tìm cớ"',
    ],
    'm:hai-2': [
      'peaks/path day +leaves +birds @.5,.7,1.15 hai:talk@.69,.63*1.25 hero:stand@.31,.82*1.15 net@.88,.88*.7 "Lão ngư lên núi một chuyến, xem hiệp khách có lười không"',
      'peaks/path day +dust @.5,.72,1.5 hero:taichi@.35,.84*1.3 hai:strike@.61,.7*1.3 slash@.48,.7*1.2?1 "Hiệp khách đứng tấn suốt một canh giờ, lão đẩy một chưởng mà không lùi nửa bước"',
      'peaks/path dusk +leaves +birds @.64,.76,1.66 hai:zen@.69,.7*1.33 hero:stand@.36,.87*1.2 "Ta già rồi, tới trận cuối chưa chắc còn đứng cạnh ngươi, nhưng biển thì vẫn ở đó, nhớ nhịp của nó"',
    ],
    // ---- Chiến ký (v2.19.0): 35 trận Thiên Cang, khóa 'g:s<k>' -------------------------------------------------------------------
    'g:s1': [
      'interior/am lamp +dust @.5,.6,1.1 god:stand@.7,.9*1.2 hero:stand@.3,.9*1.1 letter@.12,.5*1 letter@.2,.62*.8 letter@.88,.46*1 letter@.8,.6*.9 "Điện Minh Báo chất sổ sách cao tới mái, mỗi cuốn ghi nhân quả của một người phàm"',
      'interior/am lamp +dust @.64,.7,1.55 god:talk@.71,.95*1.3 letter@.36,.84*.7 "Minh Báo hỏi: trong sổ của ngươi việc nào ngươi làm mà không mong ai biết?"',
      'interior/am lamp +dust @.5,.68,1.4 hero:taichi@.35,.93*1.25 god:point@.65,.93*1.2 letter@.5,.84*.9 "Hiệp khách không kể hết vì chính mình cũng không nhớ, Minh Báo lật sổ, những dòng ấy dài hơn mọi dòng khác"',
      'interior/am lamp +dust @.64,.72,1.55 god:talk@.71,.94*1.3 hero:bow@.36,.94*1.1 "Kẻ không nhớ việc tốt mình đã làm thì ta không còn gì để hỏi, ngươi thắng"',
    ],
    'g:s2': [
      'bridge/river dawn +sparks ~sun@.7,.3,56 @.5,.64,1.1 godb:stand@.7,.84*1.2 hero:stand@.3,.84*1.1 bowl@.5,.9*.9 "Kho Thông Bảo không có cửa, vàng bạc các cõi chảy qua như một dòng sông"',
      'bridge/river dawn +sparks @.64,.72,1.55 godb:talk@.71,.88*1.3 bowl@.36,.86*1 pill@.28,.7*.4 "Thông Bảo đưa một kho báu: giữ được nó nguyên vẹn một ngày thì thắng"',
      'bridge/river day +sparks @.5,.7,1.3 hero:walk@.35,.85*1.2 dan:stand@.58,.85*1 dan2:stand@.69,.85*1 kid:stand@.81,.85*.9 bowl@.5,.9*1 "Hiệp khách mở kho, chia cho từng người đi qua đúng phần họ cần"',
      'bridge/river dusk +sparks ~sun@.3,.4,56 @.64,.72,1.55 godb:talk@.71,.88*1.3 hero:stand@.38,.88*1.1 bowl@.46,.88*1 "Cuối ngày kho vẫn đầy: thứ cho đi đã quay về theo lối khác, qua đi"',
    ],
    'g:s3': [
      'shore/rocks night +fireflies +ripple ~moon@.3,.2,60 @.5,.66,1.1 godb:sit@.66,.83*1.2 hero:stand@.22,.84*1.1 "Cõi mộng là một mặt hồ, Tịch Chiếu tinh quân ngồi giữa hồ, quanh người là giấc ngủ của muôn loài"',
      'shore/rocks night +ripple +fireflies @.64,.74,1.5 godb:talk@.71,.85*1.3 "Đánh thức ta mà không làm gợn mặt hồ, một gợn sóng thôi là vạn giấc mơ vỡ"',
      'shore/rocks night +fireflies +ripple ~moon@.3,.2,60 @.4,.74,1.4 hero:zen@.3,.85*1.2 godb:sit@.64,.83*1.1 "Hiệp khách ngồi xuống bờ, thở và chờ, ba ngày sau Tịch Chiếu tự mở mắt"',
      'shore/rocks dawn +ripple +birds @.64,.74,1.5 godb:talk@.71,.85*1.3 hero:zen@.36,.86*1.15 "Ngươi không đánh vậy mà ta thua, trăng trong thùng nước của ngươi tròn thật"',
    ],
    'g:s4': [
      'heaven/realm dusk +redthread @.5,.62,1.1 godr:stand@.7,.84*1.2 hero:stand@.3,.84*1.1 thread@.5,.5*1.2 "Kết Duyên tinh quân se những sợi tơ nối người với người, trên tay bà hàng vạn sợi không sợi nào rối"',
      'heaven/realm dusk +redthread @.64,.72,1.55 godr:talk@.71,.88*1.3 thread@.4,.7*1 "Cắt một sợi bất kỳ trong tay ta, cắt được mà không ai đau thì ta nhận thua"',
      'heaven/realm dusk +redthread +petals @.5,.7,1.4 hero:point@.37,.86*1.25 thread@.5,.62*1.3 batu:stand@.76,.9*.5 "Hiệp khách không cắt, lần theo từng sợi của chính mình: Bà Tư, sư phụ, Tiểu Mộc, Hàn Phong, rồi buộc thêm một sợi mới vào tay bà"',
      'heaven/realm dusk +redthread +petals @.6,.72,1.5 hero:bow@.3,.9*1.1 godr:talk@.71,.88*1.3 thread@.34,.58*1.2 "Kẻ đến để nối thì ta đánh sao được, sợi này ta giữ cho ngươi"',
    ],
    'g:s5': [
      'field/green dawn +petals @.5,.66,1.1 godj:stand@.7,.9*1.2 hero:stand@.3,.9*1.1 sprout@.5,.9*.6 "Cõi linh thú đang cuối đông, Xuân Sinh tinh quân canh một hạt mầm chưa chịu nứt vỏ"',
      'field/green dawn @.64,.74,1.5 godj:talk@.71,.92*1.3 sprout@.36,.9*.6 "Làm cho nó mọc ngay bây giờ, thần lực của ngươi dư sức mà"',
      'field/green day +rain @.5,.76,1.5 hero:kneel@.41,.91*1.25 bucket@.26,.92*1?1 sprout@.6,.92*.7 "Hiệp khách không truyền chút thần lực nào, chỉ tưới nước, che gió và đợi đủ một mùa"',
      'field/green dusk +petals ~sun@.7,.4,56 @.64,.74,1.55 godj:talk@.71,.93*1.3 sprout@.36,.9*1 "Bao tân thần đã ép nó lớn rồi làm nó chết, ngươi biết đợi, thắng rồi đấy"',
    ],
    'g:s6': [
      'interior/am lamp +dust @.5,.6,1.1 godg:stand@.68,.9*1.2 hero:stand@.3,.9*1.1 letter@.14,.5*1 letter@.86,.5*1 letter@.2,.64*.8 "Thư khố Thần giới có mười vạn kệ sách, Động Vi tinh quân đọc cùng lúc bảy cuốn bằng bảy con mắt"',
      'interior/am lamp +dust @.64,.7,1.55 godg:talk@.71,.95*1.3 letter@.34,.84*.8 "Trong mười vạn cuốn có một cuốn chép sai một chữ, tìm ra trước khi trăng lặn"',
      'interior/am lamp +dust @.5,.68,1.4 hero:point@.37,.93*1.25 godg:stand@.65,.93*1.2 letter@.52,.5*1.1^8 "Hiệp khách không lật cuốn nào, chỉ hỏi: cuốn nào tiền bối chưa từng mở lại?"',
      'interior/am lamp +dust @.64,.72,1.55 godg:talk@.71,.94*1.3 letter@.34,.82*.9 "Hỏi đúng một câu hơn đọc vạn trang, ta chịu"',
    ],
    'g:s7': [
      'peaks/path day +dust +birds @.5,.7,1.1 godg:stand@.68,.64*1.2 hero:stand@.3,.82*1.1 tiles@.8,.8*1 "Trường thành biên giới dài không thấy cuối, Tích Vi tinh quân mỗi ngày chỉ đặt một viên đá"',
      'peaks/path day +dust @.64,.72,1.5 godg:talk@.71,.69*1.3 tiles@.3,.86*1 "Xây cho ta một dặm thành trong một đêm, không được thì về"',
      'peaks/path dusk +dust @.5,.74,1.5 hero:kneel@.39,.82*1.25 tiles@.58,.9*1 godg:stand@.78,.62*1.1 "Hiệp khách đặt một viên đá cho thật khít, rồi nói sáng mai sẽ đặt viên nữa"',
      'peaks/path dusk +birds @.5,.7,1.4 godg:sit@.58,.71*1.2 hero:sit@.31,.85*1.15 teapot@.44,.9*1 bowl@.38,.93*.9 "Kẻ nào hứa xong trong một đêm ta đều đuổi, ngươi thì ở lại uống trà"',
    ],
    'g:s8': [
      'peaks/summit dusk +drift ~sun@.28,.38,60 ~moon@.74,.26,50 @.5,.6,1.1 god:stand@.7,.8*1.2 hero:stand@.3,.8*1.1 "Thái Hòa tinh quân đứng trên cán cân của ngày và đêm, lệch một ly một cõi sẽ không có bình minh"',
      'peaks/summit dusk +drift @.64,.72,1.5 god:talk@.71,.83*1.3 "Đấu với ta không nghỉ, tới khi một bên gục, ngươi dám không?"',
      'peaks/summit day +drift +dust @.5,.7,1.4 hero:sit@.35,.82*1.25 bowl@.5,.92*1 god:stagger@.71,.82*1.2 "Tới giờ Ngọ, hiệp khách tra kiếm, ngồi ăn cơm nắm rồi ngủ một giấc, Thái Hòa thì đã kiệt sức từ canh ba"',
      'peaks/summit dusk +drift ~sun@.28,.38,60 @.64,.72,1.5 god:talk@.71,.83*1.3 hero:bow@.36,.83*1.1 "Ta giữ nhịp ngày đêm cho thiên hạ mà quên nhịp của mình, bài học này ta nhận"',
    ],
    'g:s9': [
      'bridge/bridge holy +petals @.5,.6,1.1 god:stand@.7,.6*1.2 hero:stand@.3,.6*1.1 "Chính Quả tinh quân đưa những linh hồn đã trọn hạnh qua cầu, hôm nay cầu vắng"',
      'bridge/bridge holy +petals @.64,.7,1.5 god:talk@.71,.64*1.3 "Kể tên một người nhờ ngươi mà đi trọn đường, chỉ một người thôi"',
      'bridge/bridge holy +petals +fireflies @.5,.68,1.35 hero:talk@.33,.62*1.2 su:stand@.88,.74*.6 "Hiệp khách định kể về mình rồi dừng, kể về một lão sư gánh nước tới thửa ruộng xa nhất, bên kia cầu có bóng người áo xám khẽ gật đầu"',
      'bridge/bridge holy +petals @.64,.72,1.55 god:talk@.71,.64*1.3 hero:bow@.36,.65*1.1 "Ông ấy qua cầu này năm ngoái và có nhắc tên ngươi, qua đi"',
    ],
    'g:s10': [
      'bridge/river dawn +sparks ~sun@.3,.3,50 @.5,.62,1.1 godb:stand@.7,.84*1.2 hero:stand@.3,.84*1.1 ladle@.84,.9*.9 "Những dòng sông sao chảy về mọi cõi, Lưu Kim tinh quân canh ở đầu nguồn, tay cầm chiếc gáo bạc"',
      'bridge/river dawn +sparks @.64,.72,1.5 godb:talk@.71,.87*1.3 ladle@.36,.86*1 "Sông này sắp cạn một nhánh, ngươi lấy sao ở đâu bù vào?"',
      'bridge/river day +ripple +sparks @.5,.72,1.4 hero:martial@.37,.85*1.2 pole@.6,.9*.9^-60 godb:stand@.76,.85*1.1 "Hiệp khách tháo bớt nước ở nhánh đang tràn dẫn sang nhánh cạn, không thêm ngôi sao nào mà cả hai nhánh cùng sáng"',
      'bridge/river dusk +sparks ~sun@.3,.4,50 @.64,.72,1.55 godb:talk@.71,.88*1.3 "Kẻ khác đòi ta xin thêm sao, ngươi chỉ xếp lại dòng, giỏi"',
    ],
    'g:s11': [
      'shore/rocks storm +rain +lightning @.5,.6,1.1 godb:stand@.7,.83*1.2 hero:stand@.3,.84*1.1 "Biển giữa các cõi đang bão, An Lan tinh quân đứng trên đầu sóng áo không ướt"',
      'shore/rocks storm +rain @.64,.7,1.5 godb:talk@.71,.87*1.3 "Dẹp cơn bão này, bằng sức, bằng phép, tùy ngươi"',
      'shore/rocks storm +rain +ripple @.5,.72,1.45 hero:taichi@.37,.86*1.25 boat@.76,.88*1 godb:stand@.88,.85*1 "Hiệp khách nhớ lời lão ngư, thở cùng sóng, dồn tới rút về, bão không tan nhưng thuyền các cõi đi được"',
      'shore/rocks dusk +ripple +birds @.64,.74,1.55 godb:talk@.71,.85*1.3 hero:bow@.36,.87*1.1 "Bão không phải thứ để dẹp, ai dạy ngươi điều đó hẳn là người hiểu biển"',
    ],
    'g:s12': [
      'arena/field day +birds @.5,.64,1.05 godr:stand@.5,.85*1.2 dan:stand@.14,.85*1 dan:stand@.26,.85*1 dan:stand@.74,.85*1 dan:stand@.86,.85*1 hero:stand@.5,.9*1 "Đội tiên phong của Đồng Tâm tinh quân có trăm thiên binh, trăm năm nay chưa mất một ai"',
      'arena/field day @.64,.72,1.5 godr:talk@.71,.88*1.3 "Một mình ngươi phá vòng vây của trăm người ta, phá được thì thắng"',
      'arena/field day +dust @.5,.74,1.4 hero:stand@.37,.86*1.2 dan:hurt@.52,.86*1.05 dan:stand@.69,.86*1 dan2:stand@.82,.86*1 banner@.14,.88*.7 "Hiệp khách không phá, tìm người lính yếu nhất trong vòng vây và đứng che cho anh ta"',
      'arena/field dusk +birds @.64,.72,1.5 godr:talk@.71,.88*1.3 dan:stand@.38,.88*1 dan2:stand@.28,.88*.95 "Trận của ta dựng để không bỏ ai lại, ngươi vào trận mà cũng không bỏ ai, coi như người nhà"',
    ],
    'g:s13': [
      'peaks/snow day +snow @.5,.64,1.1 godj:stand@.7,.81*1.2 hero:stand@.3,.81*1.1 "Kiện Hành tinh quân tuần quanh cõi băng mỗi ngày một vòng, ba nghìn năm không nghỉ"',
      'peaks/snow day +snow @.64,.72,1.5 godj:talk@.71,.84*1.3 "Chạy với ta mười vòng, về trước thì thắng"',
      'peaks/snow day +snow +drift @.5,.74,1.4 hero:carry@.41,.82*1.25 godj:stagger@.63,.82*1.15 "Tới vòng thứ mười Kiện Hành khuỵu gối, hiệp khách cõng ông về đích"',
      'peaks/snow dusk +snow @.64,.74,1.5 godj:sit@.69,.83*1.25 hero:stand@.36,.83*1.15 "Ba nghìn năm ta không nghỉ và tưởng thế là khỏe, hôm nay ta xin nghỉ một ngày"',
    ],
    'g:s14': [
      'heaven/realm storm +lightning @.5,.5,1.1 godg:stand@.7,.83*1.2 hero:stand@.3,.83*1.1 ruler@.84,.74*.8 "Giữa trời có một vết nứt lạ, Cách Vật tinh quân đã đo nó bằng bảy mươi hai loại thước"',
      'heaven/realm storm +lightning @.64,.66,1.5 godg:talk@.71,.89*1.3 ruler@.34,.74*.8 "Nói cho ta biết vết nứt này từ đâu ra, sai thì về"',
      'heaven/realm night +drift +spiral @.5,.68,1.4 hero:sit@.35,.87*1.25 eye@.62,.3*.7 godg:sit@.71,.87*1.1 "Hiệp khách thú thật là không biết, xin ở lại xem ba hôm, ngày thứ ba thấy vết nứt khép lại lúc không ai nhìn"',
      'heaven/realm dawn +rays @.64,.72,1.55 godg:talk@.71,.88*1.3 hero:bow@.36,.88*1.1 ruler@.4,.86*.7^30 "Bảy mươi hai cây thước không bằng một câu ta chưa biết, ngươi được"',
    ],
    'g:s15': [
      'peaks/path morning +dust @.5,.7,1.1 godg:stand@.68,.64*1.2 hero:stand@.3,.82*1.1 tiles@.86,.8*1 "Khai Sơn tinh quân đục đường qua dãy núi giữa hai thế giới, tay ông chỉ có một cây đục"',
      'peaks/path morning +dust @.64,.72,1.5 godg:talk@.71,.69*1.3 "Núi này dày vạn dặm, ngươi tính mấy đời thì thông?"',
      'peaks/path dusk +dust +sparks @.5,.74,1.45 hero:strike@.35,.82*1.25 sword@.5,.7*.6 godg:stand@.69,.65*1.2 "Hiệp khách cầm búa đục nhát đầu tiên rồi hỏi mượn chỗ ngủ"',
      'peaks/path dawn +dust +birds ~sun@.7,.36,56 @.5,.74,1.5 hero:strike@.35,.83*1.25 godg:strike@.61,.69*1.2 "Sáng hôm sau hai người đục chung, kẻ ngồi tính thì bỏ đi trước bữa trưa, kẻ đục thì ở lại"',
    ],
    'g:s16': [
      'field/dry dusk +embers +ash ~sun@.5,.4,100 @.5,.62,1.1 god:stand@.7,.84*1.2 hero:stand@.3,.84*1.1 "Ở cõi lửa ngày nóng chảy đá đêm lạnh nứt sắt, Trú Dạ tinh quân canh đúng lằn ranh giữa hai thứ"',
      'field/dry dusk +embers @.64,.72,1.5 god:talk@.71,.87*1.3 "Đứng trên lằn ranh này cùng ta một ngày một đêm, nghiêng hẳn về bên nào cũng chết"',
      'field/dry night +embers +ash @.5,.74,1.45 hero:taichi@.37,.85*1.25 god:taichi@.63,.85*1.2 fire@.12,.9*.8 "Hiệp khách mỗi canh giờ đổi chân trụ, lúc nghiêng sang nóng, lúc nghiêng sang lạnh, không đứng im nên không ngã"',
      'field/dry dawn +ash ~sun@.7,.36,70 @.64,.72,1.55 god:talk@.71,.88*1.3 "Cân bằng không phải là đứng im ở giữa, ít kẻ hiểu ra trước khi cháy"',
    ],
    'g:s17': [
      'village/dyke morning +birds @.5,.66,1.1 god:carry@.7,.85*1.2 hero:stand@.3,.85*1.1 pole@.86,.82*1 "Hồi Hướng tinh quân gánh công đức trả về nơi đã gieo, đôi quang gánh của bà trông quen lạ lùng"',
      'village/dyke morning +birds @.64,.72,1.5 god:talk@.71,.88*1.3 pole@.34,.84*1^-8 "Gánh này nặng bằng mọi việc tốt ngươi từng làm, nhấc lên rồi mang trả cho đúng người"',
      'field/green dusk +petals ~sun@.7,.4,56 @.5,.76,1.45 hero:carry@.35,.91*1.25 statue@.7,.9*.6 bucket@.84,.92*.9?1 "Hiệp khách nhấc gánh đi thẳng về cõi người, tới nấm mộ bên thửa ruộng xanh ở Lệ thôn, đặt xuống, gánh nhẹ bẫng"',
      'village/dyke dusk +birds @.64,.74,1.55 god:talk@.71,.88*1.3 hero:bow@.36,.88*1.1 "Đa phần mang về cho mình, ngươi biết gánh ấy của ai, ta không hỏi nữa"',
    ],
    'g:s18': [
      'field/dry day +drift @.5,.58,1.1 godb:stand@.7,.86*1.2 hero:stand@.3,.86*1.1 "Tán Tụ tinh quân chăn những đàn mây, dưới kia có mười cõi đang hạn"',
      'field/dry day +drift @.64,.68,1.5 godb:talk@.71,.89*1.3 "Ta chỉ còn một đám mây, cõi nào cũng xin, ngươi cho ai?"',
      'field/dry day +drift +rain @.5,.62,1.4 hero:cast@.41,.87*1.25 godb:point@.69,.87*1.2 "Hiệp khách xé đám mây làm mười, thả ở mười đầu nguồn, không cõi nào no nước nhưng không cõi nào chết khát"',
      'field/green dusk +rain +petals @.64,.72,1.55 godb:talk@.71,.94*1.3 hero:stand@.36,.94*1.15 "Kẻ từng sống qua một mùa hạn mới chia như thế, mây này từ nay ngươi chăn cùng ta"',
    ],
    'g:s19': [
      'shore/rocks mist +ripple @.5,.62,1.1 godb:stand@.7,.83*1.2 hero:stand@.3,.84*1.1 "Hồ soi trời phẳng như gương, Chỉ Thủy tinh quân bảo ai nhìn xuống cũng chỉ thấy điều mình sợ nhất"',
      'shore/rocks mist +ripple @.64,.72,1.5 godb:talk@.71,.86*1.3 "Nhìn xuống đủ một nén nhang mà mặt hồ không gợn thì ngươi thắng"',
      'shore/rocks mist +ripple @.4,.76,1.4 hero:bow@.36,.85*1.25 bowl@.6,.92*1 "Dưới hồ là người đàn bà chia bát cháo làm ba, hiệp khách nhìn không quay đi, chỉ cúi đầu chào"',
      'shore/rocks dawn +ripple +birds @.64,.74,1.55 godb:talk@.71,.85*1.3 hero:zen@.36,.87*1.15 "Ngươi không hết sợ, ngươi chỉ thôi chạy, thế là đủ cho hồ này"',
    ],
    'g:s20': [
      'temple night +fireflies ~moon@.7,.2,54 @.5,.62,1.1 godr:stand@.7,.86*1.2 hero:stand@.3,.86*1.1 bell@.14,.5*1 "Tri Âm tinh quân nghe được tiếng kêu cứu từ mọi cõi, tai bà chưa có một ngày yên"',
      'temple night +fireflies @.64,.72,1.5 godr:talk@.71,.89*1.3 "Lúc này có vạn tiếng gọi, ngươi cứu được mấy?"',
      'valley/stream night +fireflies ~moon@.3,.2,50 @.5,.78,1.5 hero:kneel@.41,.86*1.25 basket@.62,.92*1.1 kid:lie@.64,.9*.5 "Hiệp khách chọn một tiếng nhỏ nhất: một đứa trẻ khóc trong giỏ bên bờ suối cạn, cứu xong mới quay lại nhận tiếng tiếp theo"',
      'temple dawn +birds @.64,.72,1.55 godr:talk@.71,.9*1.3 hero:stand@.36,.9*1.15 "Ta nghe vạn tiếng nên chẳng cứu trọn ai, ngươi dạy lại ta cách bắt đầu"',
    ],
    'g:s21': [
      'village/camp dusk +steam @.5,.66,1.1 godj:stand@.7,.85*1.2 hero:stand@.3,.85*1.1 dan:lie@.14,.9*.9 dan2:sit@.86,.9*.9 "Sau mỗi trận thần binh bị thương đều về chỗ Dưỡng Chính tinh quân, hôm nay ông chỉ chờ một người"',
      'village/camp dusk +steam @.64,.72,1.5 godj:talk@.71,.88*1.3 "Ngươi thắng hai mươi trận liền và giấu ta ba vết thương, cởi áo ra"',
      'village/camp night +steam +fireflies @.5,.76,1.45 hero:lie@.35,.86*1.2 godj:kneel@.61,.86*1.2 bowl@.8,.92*.9 "Hiệp khách định chối rồi ngồi xuống để ông băng bó, ngủ một mạch hai ngày"',
      'village/camp dawn +steam +birds @.64,.74,1.55 godj:talk@.71,.88*1.3 hero:sit@.28,.9*1.1 "Biết dừng để chữa cũng là một loại võ công, trận này ngươi thắng chính mình"',
    ],
    'g:s22': [
      'bridge/river mist +drift @.5,.64,1.1 godg:stand@.7,.84*1.2 hero:stand@.3,.84*1.1 boat@.84,.9*.9 "Vấn Tân tinh quân đứng ở bến đò giữa các thế giới, hôm nay sương dày chính ông cũng không thấy bờ"',
      'bridge/river mist @.64,.72,1.5 godg:talk@.71,.87*1.3 "Đưa ta sang bờ bên kia, không la bàn, không sao trời"',
      'bridge/river mist +ripple @.5,.76,1.4 hero:walk@.31,.85*1.2 boat@.6,.9*1.2 sprout@.46,.9*.3 "Hiệp khách thả một chiếc lá xuống nước, xem nó trôi, rồi chèo ngược dòng lá"',
      'bridge/river dawn +ripple +birds @.64,.74,1.55 godg:talk@.71,.87*1.3 boat@.34,.9*1 "Không biết đường thì hỏi dòng nước, câu ấy đáng khắc lên bến này"',
    ],
    'g:s23': [
      'town/gate night +fireflies @.5,.62,1.1 godg:stand@.68,.86*1.2 hero:stand@.3,.86*1.1 lamp@.2,.64*1.2 "Ở cửa Thần giới có một ngọn đèn chưa từng tắt, Trì Hằng tinh quân châm dầu cho nó chín nghìn năm"',
      'town/gate night +fireflies @.64,.72,1.5 godg:talk@.71,.89*1.3 lamp@.3,.64*1.4 "Thổi tắt nó đi, thần lực của ngươi thừa sức"',
      'town/gate night +fireflies @.5,.72,1.45 hero:hold@.41,.88*1.25 bucket@.3,.92*1?1 lamp@.62,.6*1.4 godg:sit@.8,.88*1 "Hiệp khách lắc đầu, cầm bình dầu châm thay ông một đêm rồi một đêm nữa"',
      'town/gate dawn +birds @.64,.74,1.55 godg:talk@.71,.89*1.3 lamp@.3,.7*1.2 "Kẻ muốn thắng ta thì thổi, kẻ hiểu ta thì châm dầu, ngọn đèn này nhận ra ngươi"',
    ],
    'g:s24': [
      'peaks/summit night +drift ~moon@.3,.22,60 @.5,.58,1.1 god:stand@.7,.81*1.2 hero:stand@.3,.81*1.1 "Trương Thỉ tinh quân giương cây cung dài bằng cả dải ngân hà, mũi tên của ông chưa từng trượt"',
      'peaks/summit night +drift @.64,.7,1.5 god:talk@.71,.84*1.3 "Bắn trúng ngôi sao kia trước ta"',
      'peaks/summit night +sparks @.5,.7,1.4 hero:hold@.37,.82*1.25 god:strike@.69,.82*1.2 slash@.56,.4*1.2?1 "Hiệp khách giương cung rồi hạ xuống để dây chùng hẳn mới kéo lại, Trương Thỉ bắn vội, dây cung đứt phựt"',
      'peaks/summit dawn +drift @.64,.72,1.55 god:talk@.71,.84*1.3 hero:stand@.36,.84*1.15 "Dây không được chùng thì sẽ đứt, ta quên mất điều chính mình dạy cho tân binh"',
    ],
    'g:s25': [
      'field/dry deep +fireflies @.5,.66,1.1 god:stand@.7,.84*1.2 hero:stand@.3,.84*1.1 sprout@.5,.9*.6 "Dưới cõi âm có một vườn hạt giống lành, Thiện Căn tinh quân canh chúng qua mùa đông dài nhất"',
      'field/dry deep +fireflies @.64,.72,1.5 god:talk@.71,.87*1.3 sprout@.34,.9*.7 "Trong vạn hạt này có một hạt mang tên kẻ thù của ngươi, nhổ đi hay để lại?"',
      'field/dry deep +fireflies +petals @.5,.78,1.5 hero:kneel@.41,.85*1.25 sprout@.62,.92*.9 bucket@.8,.92*.9?1 "Hiệp khách tìm ra hạt mang tên Lệ Vô Khuyết, nhỏ lép nhưng đã nứt một đường xanh, vun thêm đất cho nó"',
      'field/dry dawn +birds +petals @.64,.74,1.55 god:talk@.71,.87*1.3 ladle@.34,.9*.9?1 "Hạt ấy nứt từ đêm có người đưa cho nó một gáo nước, ngươi biết là ai mà"',
    ],
    'g:s26': [
      'village/camp day +dust @.5,.66,1.1 godb:stand@.7,.85*1.2 hero:stand@.3,.85*1.1 basket@.14,.88*1 basket@.24,.9*.8 "Tiết Độ tinh quân giữ kho lương của ba mươi sáu Thiên Cang, sổ của ông không lệch một hạt"',
      'village/camp day @.64,.72,1.5 godb:talk@.71,.88*1.3 basket@.34,.88*1 "Kho chỉ đủ ăn nửa năm, chiến sự còn một năm, tính đi"',
      'village/camp day +dust @.5,.74,1.4 hero:point@.35,.86*1.25 basket@.52,.9*1 basket@.64,.9*1 basket@.76,.9*1 godb:stand@.88,.86*1 "Hiệp khách chia kho làm ba: phần ăn, phần gieo, phần đổi với cõi bên"',
      'field/green dusk +birds @.64,.74,1.55 godb:talk@.71,.93*1.3 sprout@.34,.92*.7 "Kẻ giữ của thì đếm, kẻ hiểu của thì gieo, sổ này từ nay có thêm cột của ngươi"',
    ],
    'g:s27': [
      'peaks/summit storm +leaves +dust @.5,.56,1.1 godb:sit@.5,.81*1.2 hero:stand@.26,.81*1.1 "Định Phong tinh quân ngồi trong mắt bão, quanh ông gió xé nát cả đá"',
      'peaks/summit storm +leaves @.64,.68,1.5 godb:talk@.71,.85*1.3 "Vào đây ngồi với ta, tâm ngươi động một niệm là gió cuốn đi"',
      'peaks/summit storm +leaves +dust @.5,.7,1.45 hero:zen@.41,.83*1.25 flute@.76,.5*.8^20 godb:sit@.69,.83*1.1 "Gió mang tới tiếng sáo xương năm nào, hiệp khách nghe, nhận ra, rồi để nó thổi qua, vạt áo không lay"',
      'peaks/summit dawn +drift @.64,.72,1.55 godb:talk@.71,.84*1.3 hero:zen@.36,.84*1.15 "Ngươi nghe thấy mà không đi theo, bão nào rồi cũng chỉ đến thế thôi"',
    ],
    'g:s28': [
      'town/street morning +birds @.5,.66,1.1 hero:walk@.3,.86*1.1 dan:stand@.5,.86*1 dan2:walk@.62,.86*1 kid:stand@.74,.86*.9 godr:stand@.85,.86*1 "Hiệp khách tìm Hòa Quang tinh quân khắp Thần giới không thấy, vị thần này sống lẫn giữa cõi người"',
      'town/street morning +birds @.64,.72,1.5 godr:talk@.71,.89*1.3 "Tìm ra ta giữa một phiên chợ nghìn người, thần lực không giúp được ngươi đâu"',
      'town/street day +steam @.5,.74,1.4 hero:martial@.35,.86*1.2 teapot@.52,.9*1 dan:sit@.66,.9*1 "Hiệp khách ngồi xuống quán trà đầu chợ giúp bà chủ quạt lò"',
      'town/street dusk +birds @.64,.74,1.55 godr:talk@.71,.89*1.3 hero:sit@.28,.9*1.1 teapot@.46,.9*1 "Tới chiều bà cụ bán trà mỉm cười, bà chính là Hòa Quang, muốn tìm ta phải chịu ngồi xuống với người"',
    ],
    'g:s29': [
      'field/green dusk +leaves ~sun@.7,.34,54 @.5,.6,1.1 godj:stand@.7,.9*1.2 hero:stand@.3,.9*1.1 statue@.5,.8*1 "Cây nối các cõi cao không thấy ngọn, Cố Bản tinh quân chỉ chăm phần rễ nơi không ai nhìn"',
      'field/green dusk +leaves @.64,.72,1.5 godj:talk@.71,.93*1.3 "Cành trên kia đang héo, ngươi chữa ở đâu?"',
      'field/green day +leaves +dust @.5,.78,1.5 hero:kneel@.41,.91*1.25 tiles@.62,.92*.9 godj:stand@.78,.91*1.1 "Hiệp khách không leo lên ngọn, xuống tận rễ gỡ một tảng đá đang chèn"',
      'field/green dawn +leaves +birds @.64,.74,1.55 godj:talk@.71,.93*1.3 sprout@.34,.92*.9 "Một tuần sau cành trên cao tự xanh lại, ai cũng trèo lên chỗ thấy được, ngươi xuống chỗ ta, hiếm đấy"',
    ],
    'g:s30': [
      'temple holy +rays @.5,.6,1.1 godg:stand@.5,.86*1.2 hero:stand@.22,.86*1.1 mirror@.84,.8*1.2 "Minh Kính tinh quân có tấm gương soi ra chân tướng sau mọi lớp mặt nạ, ông bảo hiệp khách đứng vào"',
      'temple holy +rays @.64,.7,1.5 godg:talk@.71,.9*1.3 mirror@.3,.78*1.2 "Xem thử dưới danh hiệu thần của ngươi là ai"',
      'temple holy +rays @.5,.7,1.4 hero:bow@.41,.88*1.25 mirror@.66,.7*1.5 bucket@.84,.92*.9?1 "Trong gương không có vị thần nào, chỉ có một kẻ gánh nước vai chai tay cầm cái gáo sứt quai, hiệp khách gật đầu chào người ấy"',
      'temple holy +rays +petals @.64,.72,1.55 godg:talk@.71,.9*1.3 mirror@.3,.76*1 "Kẻ nhìn gương này thường đập nó, ngươi lại chào, ta không còn gì để soi"',
    ],
    'g:s31': [
      'arena/field day +dust +birds @.5,.64,1.05 godg:stand@.7,.85*1.2 hero:stand@.3,.85*1.1 tiles@.9,.8*1.1 dan:stand@.12,.9*.9 dan2:strike@.2,.9*.9 "Trường thành ngăn hư không là công trình lớn nhất Thần giới, Đại Thành tinh quân thống lĩnh mười vạn thợ"',
      'arena/field day +dust @.64,.72,1.5 godg:talk@.71,.88*1.3 tiles@.3,.88*1 "Một đoạn thành vừa sụp, lỗi của ai ngươi tìm ra thì thắng"',
      'arena/field day +dust @.5,.7,1.4 hero:point@.35,.87*1.25 board@.6,.76*1.4 tiles@.82,.9*1 dan:strike@.88,.87*.9 "Hiệp khách không tìm lỗi, dựng một tấm bảng ba cột trước đoạn thành sụp"',
      'arena/field dusk +birds @.64,.72,1.55 godg:talk@.71,.89*1.3 board@.3,.76*1 "Ta mất nghìn năm tìm kẻ có lỗi, ngươi mất ba ngày để xây xong, tấm bảng ấy cho ta xin"',
    ],
    'g:s32': [
      'peaks/summit day +drift +birds @.5,.56,1.1 god:lie@.66,.81*1.3 hero:stand@.28,.81*1.1 sword@.86,.7*1 "Tiêu Dao tinh quân nằm vắt chân trên một đám mây, nón che mặt, thanh kiếm cắm dưới gốc đào"',
      'peaks/summit day +drift @.64,.68,1.5 god:lie@.71,.85*1.3 "Đánh với ta thì chán lắm, hay là ngủ thi? Ai mở mắt trước thì thua"',
      'peaks/summit day +drift +birds @.5,.7,1.45 hero:lie@.37,.83*1.25 god:lie@.69,.83*1.2 "Hiệp khách nằm xuống thật và ngủ ngon lành, việc hôm nay đã xong cả rồi"',
      'peaks/summit dusk +drift +birds @.64,.72,1.55 god:sit@.71,.84*1.3 hero:lie@.36,.84*1.1 "Chỉ kẻ làm xong việc mới ngủ được như thế, ta giả vờ nhàn, ngươi nhàn thật"',
    ],
    'g:s33': [
      'heaven/stairs holy +rays @.5,.6,1.1 hinh:sit@.7,.84*1.2 hero:stand@.3,.84*1.1 ruler@.84,.72*1 "Thiên Hình tinh quân đợi sẵn, thước ngọc đặt ngang gối, ông là kẻ từng định niêm Thiên Môn"',
      'heaven/stairs holy +rays @.64,.7,1.5 hinh:talk@.71,.88*1.3 ruler@.32,.74*1 "Ngươi mang một tà thần vào Thần giới, phép ghi rõ tội ấy, biện bạch đi"',
      'heaven/stairs holy +rays @.5,.72,1.4 hero:kneel@.35,.85*1.25 ruler@.62,.72*1.1 hinh:point@.73,.85*1.2 "Hiệp khách không biện bạch, nhận tội rồi kể mình đã làm gì mỗi ngày từ hôm ấy để sửa, thước ngọc đo từng việc rồi hạ xuống"',
      'heaven/stairs holy +petals +rays @.64,.72,1.55 hinh:talk@.71,.88*1.3 hero:bow@.36,.88*1.1 "Phép phạt kẻ chối không phạt kẻ đang trả, ngôi thứ ba mươi ba không cản ngươi nữa"',
    ],
    'g:s34': [
      'field/green blood +redmist ~red@.6,.2,100 @.5,.6,1.1 godb:stand@.7,.9*1.2 hero:stand@.3,.9*1.1 "Phương Hợi là đất của Huyết Nguyệt, Phong Đăng tinh quân coi mùa màng ở đây và mùa nào cũng bị thu sạch về trăng đỏ"',
      'field/green blood +redmist @.64,.7,1.5 godb:talk@.71,.94*1.3 basket@.3,.9*.8 "Chủ phương lệnh cho ta chặn ngươi, ta không muốn nhưng kho của ta trống, ta lấy gì mà cãi lệnh?"',
      'field/green day +petals @.5,.76,1.45 hero:kneel@.37,.91*1.25 basket@.54,.9*1 godb:kneel@.69,.91*1.2 sprout@.84,.92*.8 "Hiệp khách mở túi chia nửa phần lương vào kho Phong Đăng rồi cùng ông gieo lại một vụ"',
      'field/green dawn +birds ~sun@.7,.4,56 @.64,.74,1.55 godb:talk@.71,.93*1.3 sprout@.34,.92*.9 "Nó lấy của ta nghìn mùa, ngươi cho ta một vụ, ta biết mình nên đứng về bên nào"',
    ],
    'g:s35': [
      'altar blood +embers ~red@.5,.24,120 @.5,.56,1.1 godb:stand@.5,.7*1.35 hero:stand@.3,.71*1.1 dan:stand@.13,.71*.9 dan2:stand@.87,.71*.9 "Vô Ba tinh quân, mạnh nhất Thiên Cang, đứng chắn trước điện Huyết Nguyệt, ba mươi tư vị kia đều đã tới xem"',
      'altar blood +embers @.64,.64,1.5 godb:talk@.71,.74*1.35 "Tâm ta như mặt nước không gợn, ngươi làm nó gợn được một lần, ngôi đầu Thiên Cang là của ngươi"',
      'altar blood +embers +sparks @.5,.66,1.4 hero:martial@.35,.75*1.25 godb:strike@.65,.75*1.3 slash@.5,.6*1.3?1 "Trăm chiêu không ăn thua, hiệp khách dừng tay hỏi khẽ: nước không gợn là vì yên hay vì đã đóng băng?"',
      'altar blood +embers @.64,.66,1.55 godb:talk@.71,.75*1.35 hero:stand@.36,.75*1.15 "Ta lặng vì sợ kẻ ngồi trong điện kia đâu phải vì yên, ngươi nhìn ra được, đi đi Thượng Thần"',
      'heaven/realm holy +rays +sparks ~moon@.5,.2,80 @.5,.5,1.1 hero:zen@.5,.83*1.3 god:stand@.17,.83*.9 godb:stand@.26,.83*.9 godg:stand@.74,.83*.9 godj:stand@.83,.83*.9 "Ba mươi lăm ngôi sao cùng sáng, hiệp khách thành Thượng Thần đứng đầu Thiên Cang, đủ tư cách gõ cửa mười hai phương"',
    ],
    // ---- Chiến ký: 11 Phương thần, khóa 'g:l<k>' ----------------------------------------------------------------------------------
    'g:l1': [
      'shore/deep night +bubbles @.5,.62,1.1 godb:sit@.7,.84*1.2 hero:stand@.3,.84*1.1 "Phương Tý là đêm sâu nhất của Thần giới, Huyền Minh phương thần ngồi dưới đáy một hồ nước đen, nơi không có một tiếng động"',
      'shore/deep night +bubbles @.64,.72,1.5 godb:talk@.71,.87*1.3 "Thượng Thần muốn lên ngôi cao thì xuống đây, ở lại với ta qua một đêm dài bằng trăm năm, không làm gì cả"',
      'shore/deep deep +bubbles @.4,.76,1.4 hero:zen@.32,.85*1.25 godb:sit@.64,.85*1.15 "Hiệp khách từng ngồi chín tháng dưới đáy biển không trăng, ngồi thở để đêm tự trôi"',
      'shore/deep dawn +bubbles +birds ~sun@.7,.3,50 @.5,.7,1.4 hero:stand@.35,.86*1.25 fire@.64,.9*.9 godb:stand@.76,.86*1.2 "Gần sáng hiệp khách đứng dậy nhóm bếp: đêm là để nghỉ, không phải để trốn, kẻ biết ngồi và biết dậy, phương Tý mở đường"',
      'peaks/path dawn +birds ~sun@.7,.3,54 @.5,.7,1.2 hero:walk@.4,.79*1.2 gate@.84,.82*.8 "Phương Tý mở đường, còn mười một phương nữa, và phương cuối cùng là phương Hợi"',
    ],
    'g:l2': [
      'peaks/path dusk +dust @.5,.66,1.1 godg:carry@.68,.64*1.3 hero:stand@.3,.82*1.1 statue@.84,.8*.8 "Hậu Tải phương thần là một bà lão lưng còng, cõng cả phương Sửu trên vai, bà chưa từng đặt nó xuống"',
      'peaks/path dusk +dust @.64,.72,1.5 godg:talk@.71,.69*1.3 "Cõng thay ta một ngày, chỉ một ngày thôi, xem vai ngươi có chở nổi không"',
      'peaks/path dusk +dust @.5,.74,1.4 hero:carry@.39,.8*1.3 basket@.54,.88*1 basket@.66,.9*1 godg:stand@.8,.6*1.1 "Hiệp khách ghé vai, chia gánh nặng làm trăm chuyến nhỏ, đi từng chuyến, nghỉ giữa các chuyến"',
      'peaks/path dawn +dust +birds @.64,.74,1.55 godg:talk@.71,.69*1.3 hero:stand@.36,.86*1.15 "Ta cõng một hơi suốt vạn năm nên lưng mới còng, ngươi dạy bà lão này cách đặt gánh xuống mà không làm rơi"',
      'peaks/path dawn +birds @.5,.7,1.2 hero:walk@.4,.79*1.2 gate@.84,.82*.8 "Phương Sửu mở đường, còn mười phương nữa, và phương cuối cùng là phương Hợi"',
    ],
    'g:l3': [
      'peaks/am dawn +birds ~sun@.5,.36,60 @.5,.62,1.1 godr:stand@.7,.82*1.2 hero:stand@.3,.82*1.1 "Phương Dần luôn là rạng đông, Khai Dương phương thần trẻ như thiếu niên, ngày nào cũng bắt đầu một việc mới và chưa việc nào xong"',
      'peaks/am dawn +birds @.64,.72,1.5 godr:talk@.71,.85*1.3 "Đua với ta xem ai khởi sự được nhiều hơn trước khi mặt trời lên!"',
      'peaks/am dawn +leaves @.5,.74,1.4 godr:walk@.69,.82*1.2 hero:taichi@.35,.82*1.25 board@.16,.8*1 "Khai Dương mở trăm việc, hiệp khách chỉ mở một, hiểu cho rõ nó cần gì và làm xong trước bình minh"',
      'peaks/am morning +birds ~sun@.5,.3,60 @.64,.72,1.55 godr:talk@.71,.86*1.3 hero:stand@.36,.86*1.15 "Ta giỏi bắt đầu tới mức quên cả kết thúc, một việc xong của ngươi sáng hơn trăm việc dở của ta"',
      'peaks/path morning +birds @.5,.7,1.2 hero:walk@.4,.79*1.2 gate@.84,.82*.8 "Phương Dần mở đường, còn chín phương nữa, và phương cuối cùng là phương Hợi"',
    ],
    'g:l4': [
      'valley/stream morning +leaves +fireflies @.5,.62,1.1 godj:stand@.7,.85*1.3 hero:stand@.3,.85*1.1 "Phương Mão là một cánh rừng, Thanh Mộc phương thần chính là cây lớn nhất, rễ nối với mọi cây khác"',
      'valley/stream morning +leaves @.64,.72,1.5 godj:talk@.71,.88*1.3 "Chặt được ta thì ngươi qua, nhưng coi chừng: ta ngã thì cả rừng ngã"',
      'valley/stream day +leaves +fireflies @.5,.76,1.45 hero:kneel@.37,.86*1.25 sprout@.54,.92*.8 bucket@.2,.92*1?1 godj:stand@.76,.86*1.2 "Hiệp khách bỏ kiếm đi một vòng quanh rừng tưới cho những cây non còi cọc, cây lớn tự nghiêng cành mở lối cho nắng"',
      'valley/stream dusk +fireflies +leaves @.64,.74,1.55 godj:talk@.71,.88*1.3 hero:stand@.36,.88*1.15 "Ngươi không thắng ta, ngươi làm cho cả rừng thắng, ở phương này thế mới gọi là thắng"',
      'peaks/path dusk +leaves @.5,.7,1.2 hero:walk@.4,.79*1.2 gate@.84,.82*.8 "Phương Mão mở đường, còn tám phương nữa, và phương cuối cùng là phương Hợi"',
    ],
    'g:l5': [
      'peaks/summit storm +rain +drift @.5,.56,1.1 godb:stand@.7,.81*1.2 hero:stand@.3,.81*1.1 bucket@.2,.9*1.2?1 bucket@.1,.92*1?1 "Vân Vũ phương thần cưỡi rồng mây nắm hết mưa của Thần giới, ông nhìn đôi thùng gỗ của hiệp khách rất lâu"',
      'peaks/summit storm +rain @.64,.68,1.5 godb:talk@.71,.85*1.3 "Nghe nói ngươi từng tưới xanh một cánh đồng dưới trăng đỏ mà không xin ta giọt mưa nào, kể ta nghe"',
      'peaks/summit day +rain +drift @.5,.72,1.4 hero:point@.35,.81*1.25 pole@.58,.88*1 godb:stand@.71,.81*1.2 dan:carry@.84,.81*.8 "Hiệp khách chỉ cho ông thấy mưa của ông rơi đều nhưng không ai dẫn nó tới ruộng xa, hai người cùng đào mương"',
      'peaks/summit dusk +rain +petals @.64,.72,1.55 godb:talk@.71,.84*1.3 hero:stand@.36,.84*1.15 "Mưa của trời cần mương của người, ta làm thần mưa bấy lâu mà giờ mới biết, phương Thìn nợ ngươi một mùa"',
      'peaks/path dusk +drift @.5,.7,1.2 hero:walk@.4,.79*1.2 gate@.84,.82*.8 "Phương Thìn mở đường, còn bảy phương nữa, và phương cuối cùng là phương Hợi"',
    ],
    'g:l6': [
      'field/dry dusk +embers +ash ~sun@.5,.4,110 @.5,.62,1.1 godr:stand@.7,.84*1.2 hero:stand@.3,.84*1.1 fire@.16,.9*.9 "Phương Tỵ rực lửa, Xích Diễm phương thần cháy sáng nhất Thần giới và quanh ông toàn tro của những việc cháy quá nhanh"',
      'field/dry dusk +embers @.64,.72,1.5 godr:talk@.71,.87*1.3 fire@.3,.88*.9 "Nhiệt tâm của ngươi đâu? Đốt hết mình trong một trận cho ta xem!"',
      'field/dry night +embers +ash @.5,.76,1.45 hero:kneel@.37,.85*1.25 fire@.54,.9*.7 bowl@.7,.92*1 godr:stagger@.82,.85*1.15 "Hiệp khách nhóm một bếp than nhỏ, ủ tro giữ lửa qua đêm"',
      'field/dry dawn +ash ~sun@.7,.36,70 @.64,.74,1.55 godr:talk@.71,.87*1.3 fire@.34,.9*.6 "Lửa của Xích Diễm đã tàn, bếp than vẫn đỏ đủ nấu cơm cho cả phương, lửa của ngươi bền hơn"',
      'peaks/path dawn +ash @.5,.7,1.2 hero:walk@.4,.79*1.2 gate@.84,.82*.8 "Phương Tỵ mở đường, còn sáu phương nữa, và phương cuối cùng là phương Hợi"',
    ],
    'g:l7': [
      'town/square day +rays ~sun@.5,.12,80 @.5,.62,1.1 godg:stand@.5,.86*1.3 hero:stand@.26,.86*1.1 "Phương Ngọ không có bóng, dưới ánh Chính Dương phương thần mọi việc đã làm đều hiện rõ kể cả việc muốn giấu"',
      'town/square day +rays @.64,.72,1.5 godg:talk@.71,.89*1.3 "Đứng giữa trưa của ta, kể ra một việc ngươi làm sai mà chưa ai biết"',
      'town/square day +rays @.4,.76,1.4 hero:bow@.34,.86*1.25 su:stand@.84,.8*.5 "Hiệp khách kể đêm ở trấn Thanh Khê từng nghi cả sư phụ là kẻ phản bội mà chưa bao giờ xin lỗi, quay về phía cõi người cúi đầu"',
      'town/square day +rays +petals @.64,.74,1.55 godg:talk@.71,.89*1.3 hero:stand@.36,.89*1.15 "Kẻ không có bóng là kẻ không giấu gì, giữa trưa này ngươi đứng thẳng được"',
      'peaks/path day +rays @.5,.7,1.2 hero:walk@.4,.79*1.2 gate@.84,.82*.8 "Phương Ngọ mở đường, còn năm phương nữa, và phương cuối cùng là phương Hợi"',
    ],
    'g:l8': [
      'field/green dusk +birds ~sun@.78,.34,60 @.5,.62,1.1 godj:stand@.7,.9*1.3 hero:stand@.3,.9*1.1 basket@.14,.9*1 basket@.24,.92*.9 "Phương Mùi lúa chín quanh năm, Phong Nhiêu phương thần béo tốt hiền lành và đang lo: kho đầy mà dân các cõi vẫn đói"',
      'field/green dusk +birds @.64,.72,1.5 godj:talk@.71,.93*1.3 basket@.34,.9*1 "Ta có thừa họ vẫn thiếu, giải được thì ngươi thắng, ta còn phải cảm ơn"',
      'field/green day +dust @.5,.74,1.4 hero:point@.35,.91*1.25 board@.62,.74*1.2 palanquin@.86,.9*.7 godj:stand@.76,.91*1.2 "Hiệp khách lần theo đường thóc, nó nằm chết trong kho vì không ai chở, dựng một tấm bảng chia chuyến, ngày nào cũng có xe đi"',
      'field/green dusk +birds ~sun@.78,.34,60 @.64,.74,1.55 godj:talk@.71,.93*1.3 hero:stand@.36,.93*1.15 "Thóc trong kho chưa phải là cơm, ngươi biến thứ ta có thành thứ họ cần, thua kiểu này ta vui lắm"',
      'peaks/path dusk +birds @.5,.7,1.2 hero:walk@.4,.79*1.2 gate@.84,.82*.8 "Phương Mùi mở đường, còn bốn phương nữa, và phương cuối cùng là phương Hợi"',
    ],
    'g:l9': [
      'arena/plaza morning +sparks @.5,.62,1.1 godg:strike@.7,.85*1.2 hero:stand@.3,.85*1.1 "Kim Cương phương thần cứng như sắt, mỗi ngày tập đúng một vạn nhát kiếm không thiếu một nhát, đã vạn năm"',
      'arena/plaza morning +sparks @.64,.72,1.5 godg:talk@.71,.88*1.3 sword@.34,.8*.9 "Kỷ luật của ngươi tới đâu? Tập với ta, sai một nhát là thua"',
      'arena/plaza day +dust +birds @.5,.72,1.4 hero:hold@.37,.86*1.25 crow@.5,.5*.6 godg:strike@.73,.86*1.2 "Nhát thứ chín nghìn một con chim non rơi khỏi tổ giữa sân, hiệp khách bỏ dở, đỡ nó lên cành rồi mới quay lại tập nốt"',
      'arena/plaza dusk +birds @.64,.74,1.55 godg:talk@.71,.88*1.3 hero:stand@.36,.88*1.15 "Ta giữ một vạn nhát mà quên giữ vì cái gì, ngươi lỡ một nhát mà đúng cả bài, kỷ luật của ngươi có tim"',
      'peaks/path dusk +birds @.5,.7,1.2 hero:walk@.4,.79*1.2 gate@.84,.82*.8 "Phương Thân mở đường, còn ba phương nữa, và phương cuối cùng là phương Hợi"',
    ],
    'g:l10': [
      'field/green dusk +leaves ~sun@.7,.36,60 @.5,.62,1.1 godr:stand@.7,.9*1.2 hero:stand@.3,.9*1.1 basket@.16,.9*1 "Phương Dậu là buổi chiều thu, Thu Liễm phương thần đang gặt và dạy rằng biết đủ là mùa gặt cuối cùng"',
      'field/green dusk +leaves @.64,.72,1.5 godr:talk@.71,.93*1.3 "Ngươi đã thắng chín phương, tới đây thì dừng đi, hay ngươi cũng tham như kẻ ngồi ở phương Hợi?"',
      'field/green dusk +leaves +petals @.4,.76,1.4 hero:zen@.32,.91*1.25 basket@.6,.9*1.1 godr:stand@.72,.91*1.2 "Hiệp khách nghĩ rất lâu, đặt xuống mọi chiến tích chỉ giữ một câu dặn: gánh cả nó về"',
      'field/green dusk +leaves ~sun@.7,.36,60 @.64,.74,1.55 godr:talk@.71,.93*1.3 hero:bow@.36,.93*1.1 "Tham là muốn thêm cho mình, ngươi muốn bớt cho người, câu trả lời ấy qua được mùa thu của ta"',
      'peaks/path dusk +leaves @.5,.7,1.2 hero:walk@.4,.79*1.2 gate@.84,.82*.8 "Phương Dậu mở đường, còn hai phương nữa, và phương cuối cùng là phương Hợi"',
    ],
    'g:l11': [
      'peaks/summit blood +redmist ~red@.6,.2,100 @.5,.58,1.1 god:stand@.7,.81*1.3 hero:stand@.3,.81*1.1 "Trấn Thủ phương thần canh biên giới các cõi, mình đầy sẹo, sau lưng ông là phương Hợi nơi trăng đỏ đã nuốt mất nửa bầu trời"',
      'peaks/summit blood +redmist @.64,.68,1.5 god:talk@.71,.85*1.3 "Ta chặn ngươi không vì ghét, qua ta rồi là không còn ai đỡ cho ngươi nữa"',
      'peaks/summit dusk +redmist +drift @.5,.7,1.35 hero:point@.35,.81*1.25 god:walk@.61,.81*1.25 godb:stand@.78,.81*.9 godr:stand@.88,.81*.9 dan:stand@.86,.81*.8 "Hiệp khách không vượt qua ông mà mời ông cùng đi, sau lưng hai người Thiên Cang và Phương thần lặng lẽ xếp hàng"',
      'peaks/summit dusk +redmist +drift @.64,.72,1.55 god:talk@.71,.84*1.3 hero:stand@.36,.84*1.15 "Vạn năm ta canh một mình ở biên giới hóa ra có thể đi cùng, ta thua và ta theo"',
      'peaks/path blood +redmist ~red@.7,.2,80 @.5,.7,1.2 hero:walk@.4,.79*1.2 god:walk@.56,.7*1.3 gate@.86,.82*.8 "Phương Tuất mở đường, còn một phương nữa, và phương cuối cùng là phương Hợi"',
    ],
    // ---- Chiến ký: Song thần chi chiến và Ngang dòng thời gian (trước đây một phần nằm ở GOD_LINES) ------------------------------
    'g:l12': [
      'altar blood +redmist +redthread ~red@.5,.24,120 @.5,.52,1.15 giao:sit@.5,.69*1.35 chair@.5,.9*1.5 hero:stand@.21,.69*1.1 ma:stand@.81,.69*1.1 "Điện Huyết Nguyệt ở phương Hợi, trên ngai là thân xác Lệ Vô Khuyết tóc trắng xóa đôi mắt là hai vầng trăng đỏ, Vô Yểm đã nuốt gần hết"',
      'altar blood +redmist +embers ~red@.6,.2,110 @.64,.66,1.55 ma:talk@.71,.75*1.35 giao:sit@.3,.9*1 "Vô Yểm cười: ngươi mang ta vào đây trả ta ngôi cũ, giờ Trường Lưu sắp gác ngôi và trong mười hai phương chỉ còn ta đủ sức kế thừa"',
      'altar blood +redmist +spiral ~red@.5,.24,120 @.5,.64,1.4 hero:hurt@.31,.74*1.25 ma:cast@.69,.74*1.35 "Huyết Nguyệt Thôn Thiên lần này ở tầm Phương thần hút cả ánh sáng của ba mươi sáu ngôi sao, thần lực của hiệp khách bị rút đi"',
      'altar blood +redmist @.38,.7,1.5 hero:zen@.3,.74*1.3 ma:stand@.71,.74*1.2 "Nó hút nội lực thì tại hạ thua, nhưng tám quy luật không phải thứ hút được: không ai lấy trộm được điều kẻ khác đã tự hiểu ra"',
      'altar blood +redmist +sparks +rays ~red@.5,.24,120 @.5,.6,1.3 hero:taichi@.35,.73*1.3 ma:cast@.69,.73*1.3 thread@.5,.56*1.2 eye@.5,.3*.6 "Nhân Quả, Lưu Thông, Tĩnh Động, Tương Sinh: mỗi đòn nó đánh dội lại chính nó, thần lực bị hút chảy một vòng rồi trở về, tâm hiệp khách không gợn"',
      'altar blood +redmist +sparks ~red@.5,.24,120 @.5,.64,1.4 hero:strike@.35,.74*1.3 ma:stagger@.69,.74*1.3 slash@.5,.6*1.4?2 "Sinh Trưởng, Minh Lý, Tích Lũy, Âm Dương: vết thương lành theo nhịp của nó, hiệp khách thấy rõ chỗ khuyết trong lòng kẻ không bao giờ no"',
      'altar blood +redmist @.5,.76,1.5 hero:kneel@.33,.71*1.3 ladle@.5,.94*1.2?1 giao:sit@.69,.71*1.25 chair@.7,.9*1.3 "Hiệp khách dừng tay thật, giữa trận đặt xuống trước ngai một cái gáo gỗ sứt quai đầy nước"',
      'altar blood +redmist +embers @.38,.7,1.55 hero:talk@.3,.75*1.3 giao:sit@.67,.75*1.2 ladle@.54,.92*.9?1 "Đại sư huynh, ruộng của mẹ đã xanh tới tận bờ, chỉ còn thiếu người tưới, về thôi"',
      'heaven/realm blood +redmist ~red@.5,.24,110 @.6,.7,1.7 giao:hold@.66,.9*1.4 hero:kneel@.3,.92*1.1 ladle@.44,.95*.9?1 "Lệ Vô Khuyết nghe thấy tiếng gọi từ chiếc gáo, giọng khàn nhưng đã là của người anh: cho ta mượn cái gáo"',
      'heaven/realm holy +sparks +rays ~red@.5,.2,90 @.5,.74,1.8 giao:hold@.5,.9*1.35 ladle@.36,.95*.9?1 hinh:point@.82,.9*1.3 ruler@.74,.7*.8 "Bàn tay già nua cầm lấy gáo nước, Vô Yểm mất chỗ trú và bị thước ngọc của Thiên Hình niêm dưới đáy hồ soi trời"',
      'peaks/path dawn +birds ~sun@.7,.3,54 @.5,.7,1.5 giao:hold@.36,.9*1.3 pole@.66,.92*1.0?1 "Lệ Vô Khuyết không giữ ngôi, xin về cõi người, lên núi Tùng Hạc nhận lại chiếc đòn gánh của mẹ"',
      'peaks/path morning +birds @.5,.7,1.4 giao:carry@.4,.9*1.2 kid:carry@.64,.92*1.0 "Lệ Vô Khuyết gánh nước cho lũ trẻ mới lên núi, chậm thôi, mỗi ngày một chuyến"',
      'heaven/realm holy +petals ~moon@.5,.22,84 @.5,.55,1.2 hero:zen@.5,.9*1.2 god:stand@.2,.88*.9 god:stand@.8,.88*.9 godg:stand@.1,.86*.8 godj:stand@.9,.86*.8 "Mười một Phương thần cùng quay về phía hiệp khách, vầng trăng ở phương Hợi đổi từ đỏ sang bạc"',
    ],
    'g:k': [
      'bridge/river holy +ripple +drift @.5,.6,1.1 king:sit@.7,.84*1.3 pole@.8,.7*1.4^-25 hero:stand@.28,.84*1.1 "Điện của Trường Lưu Thần Vương là một dòng sông, thời gian của mọi thế giới chảy qua đây, ông lão ngồi câu bên bờ, cần câu không có lưỡi"',
      'bridge/river holy +ripple @.64,.7,1.55 king:talk@.71,.89*1.35 pole@.36,.8*1.2^-20 "Ta giữ dòng này từ trước khi có ngôi sao đầu tiên, ta muốn đi xem nó chảy về đâu, nhưng ngôi này không bỏ trống được"',
      'bridge/river holy +ripple +drift @.64,.72,1.55 king:zen@.71,.88*1.35 hero:stand@.36,.88*1.15 "Kẻ thắng được ta sẽ muốn bắt dòng sông chảy theo ý mình, kẻ thua ta thì bị nó cuốn, ta cần một người đi ngang ta, không hơn, không kém"',
      'bridge/river holy +ripple +drift @.5,.78,1.4 hero:carry@.36,.9*1.2 king:carry@.64,.9*1.3 "Hai người lội xuống dòng sông thời gian, mỗi người một gánh, mang nước của hôm qua tưới cho ngày mai"',
      'bridge/river holy +ripple @.5,.8,1.6 hero:fall@.4,.9*1.3 king:carry@.7,.9*1.25 "Năm thứ một trăm hiệp khách muốn vượt lên, dòng nước xô ngã, ông lão vẫn đều bước phía trước"',
      'bridge/river holy +ripple @.5,.8,1.55 hero:zen@.5,.85*1.3 bucket@.3,.94*1.2?1 "Hiệp khách thôi nhìn lưng ông ấy, thôi đếm năm, chỉ còn bước này rồi bước này, một chuyến rồi một chuyến nữa"',
      'bridge/river holy +ripple +fireflies ~moon@.5,.24,70 @.5,.8,1.6 bucket@.36,.94*1.3?1 bucket@.64,.94*1.3?1 hero:zen@.26,.9*1.1 king:zen@.74,.9*1.2 "Nghìn năm đã qua, hai người đặt gánh xuống cùng một lúc, trong bốn chiếc thùng đều có một vầng trăng tròn"',
      'bridge/river holy +ripple +petals @.64,.74,1.55 king:talk@.71,.87*1.35 hero:bow@.36,.87*1.15 "Ngang nhau, vạn năm ta mới gặp một kẻ không cố thắng thời gian cũng không chịu thua nó, ngôi chủ Thời là của ngươi"',
      'heaven/realm night +drift ~moon@.7,.2,56 @.5,.55,1.2 thien:zen@.62,.9*1.3 king:walk@.3,.9*1.3 "Ở rìa vũ trụ Không Nguyệt đứng đợi vị Thần Vương già đang chống gậy bước ra khỏi Thần giới"',
      'peaks/path night ~moon@.68,.2,58 @.5,.7,1.4 giao:carry@.36,.9*1.2 kid:carry@.6,.92*1.0 "Trên núi Tùng Hạc một lão nhân tóc trắng gánh nước lên dốc, theo sau là đứa trẻ mới lên núi, trăng rằm in xuống thùng nước của cả hai"',
      'bridge/river holy +ripple +petals @.5,.62,1.1 hero:zen@.5,.9*1.3 "Thần Vương chủ Thời đứng bên dòng sông thời gian, nhớ lại một câu rất cũ: chiêu lợi hại nhất là chiêu ngươi luyện mỗi ngày"',
    ],
  };

  // ===========================================================================================================================
  // DỰNG TỰ ĐỘNG cho trang chưa có khung riêng: kỳ ngộ ('m:<mã>-<lần>') và chiến ký ('g:s<k>', 'g:l<j>', 'g:k').
  // Mỗi kỳ ngộ / trận đấu có MỘT bối cảnh riêng (nơi chốn, giờ, khí trời) theo nhân vật; từng trang đổi góc máy theo người đang nói:
  //   lời kể        → toàn cảnh, xen cảnh vừa;
  //   hiệp khách nói → cận bên trái, người kia nửa khuất ở mép phải;
  //   người kia nói → cận bên phải, hiệp khách quay lưng nhỏ ở mép trái;
  //   thế 'moon'     → trăng nhuốm đỏ, kẻ ác đứng lớn;  'martial' → hai bên đối mặt, bụi bay;  'taichi' → hiệp khách giữa khung.
  // Nhờ vậy không trang nào phải vẽ lại cùng một hình hiệp khách đứng giữa nền chung. Tranh vẽ tay từng trang cho các mục này
  // (như LINES ở trên) có thể bổ sung dần mà không phải đổi gì ở chỗ khác.
  // ===========================================================================================================================
  const Z = window.zenScene;
  const hashOf = Z.kit.hash;
  const r2 = (v) => Math.round(v * 100) / 100;

  // Bối cảnh mỗi kỳ ngộ (hai lần gặp: [lần 1, lần 2]). Dạng: 'bộ[/biến thể] giờ +hiệu-ứng ~thiên-thể | vật đặt giữa hai người'.
  const MEET_ENV = {
    batu: ['valley/tea morning +steam +birds', 'valley/tea dusk +steam +fireflies ~sun@.8,.36,56'],
    luc: ['bridge/bridge dusk +birds', 'bridge/bridge night +fireflies ~moon@.3,.2,48'],
    cuu: ['town/street dusk +embers | fire@.82,.9*.8', 'town/street day +sparks | fire@.82,.9*.8'],
    diep: ['peaks/path morning +leaves', 'village/camp day +steam'],
    yen: ['town/roofs night +birds ~moon@.7,.22,54', 'town/roofs dusk +birds ~sun@.3,.4,60'],
    nhan: ['town/street night +rain ~moon@.3,.2,50', 'bridge/bridge night +drift ~red@.7,.2,70'],
    lamhat: ['interior/am lamp +steam', 'village/camp dusk +drift | bucket@.52,.94*1.2'],
    kytien: ['peaks/path day +leaves +birds', 'peaks/am dawn +drift'],
    cokiem: ['bridge/river day +leaves', 'valley/tea dusk +birds'],
    vantam: ['interior/am lamp +dust', 'temple day +petals'],
    nhuy: ['town/square day +birds', 'town/square dusk +birds'],
    ngao: ['town/gate day +birds | banner@.86,.9*1', 'valley/stream morning +leaves'],
    tuytang: ['temple dusk +leaves +birds', 'temple dawn +birds'],
    daoly: ['town/square dusk +petals | lanterns@.5,.26*1?5', 'town/square night +fireflies | lanterns@.5,.24*1.1?8'],
    vongtinh: ['peaks/am night +drift ~moon@.25,.2,50', 'peaks/summit night +drift ~moon@.3,.2,48 ~red@.7,.22,64'],
    hotam: ['peaks/path night +drift ~moon@.7,.2,50', 'interior/am lamp +dust'],
    trinhho: ['town/gate day | palanquin@.86,.92*.9', 'town/gate night +fireflies ~moon@.3,.2,50'],
    moclao: ['peaks/path morning +leaves +birds', 'peaks/path dusk +leaves'],
    tieuhuyet: ['village/camp night +fireflies ~moon@.7,.2,52', 'valley/stream morning +birds'],
    bacham: ['shore/rocks night +fireflies +ripple ~moon@.7,.2,56', 'shore/rocks dusk +birds +ripple'],
    thien: ['temple dawn +birds', 'peaks/snow night +snow ~moon@.7,.2,50'],
    hai: ['shore/hut dusk +birds | net@.84,.86*.8', 'peaks/snow day +snow'],
  };
  // Hai nhân vật đi cặp.
  const PAIRS = { daoly: ['dao', 'ly'] };

  // Bối cảnh 35 trận Thiên Cang (g:s1 … g:s35), theo cảnh mở đầu của từng vị.
  const STAR_ENV = [
    'interior/am lamp +dust', // 1 Minh Báo: sổ nhân quả chất tới mái
    'bridge/river dawn +sparks ~sun@.7,.3,56', // 2 Thông Bảo: vàng bạc chảy như sông
    'shore/rocks night +fireflies +ripple ~moon@.3,.2,60', // 3 Tịch Chiếu: cõi mộng là mặt hồ
    'heaven/realm dusk +redthread', // 4 Kết Duyên: sợi tơ nối người với người
    'field/green dawn +petals', // 5 Xuân Sinh: hạt mầm cuối đông
    'interior/am lamp +dust', // 6 Động Vi: thư khố mười vạn kệ
    'peaks/path day +dust +birds', // 7 Tích Vi: trường thành biên giới
    'peaks/summit dusk +drift ~sun@.28,.38,60 ~moon@.74,.26,50', // 8 Thái Hòa: cán cân ngày đêm
    'bridge/bridge holy +petals', // 9 Chính Quả: cầu vắng
    'bridge/river dawn +sparks ~sun@.3,.3,50', // 10 Lưu Kim: đầu nguồn sông sao
    'shore/rocks storm +rain +lightning', // 11 An Lan: biển giữa các cõi đang bão
    'arena/field day +birds', // 12 Đồng Tâm: trăm thiên binh
    'peaks/snow day +snow', // 13 Kiện Hành: cõi băng
    'heaven/realm storm +lightning', // 14 Cách Vật: vết nứt giữa trời
    'peaks/path morning +dust', // 15 Khai Sơn: đục đường qua núi
    'field/dry dusk +embers +ash ~sun@.5,.4,100', // 16 Trú Dạ: cõi lửa
    'village/dyke morning +birds', // 17 Hồi Hướng: đôi quang gánh
    'field/dry day +drift', // 18 Tán Tụ: chăn mây cho mười cõi đang hạn
    'shore/rocks mist +ripple', // 19 Chỉ Thủy: hồ soi trời
    'temple night +fireflies ~moon@.7,.2,54', // 20 Tri Âm: nghe tiếng kêu từ mọi cõi
    'village/camp dusk +steam', // 21 Dưỡng Chính: nơi chữa thương
    'bridge/river mist +drift', // 22 Vấn Tân: bến đò sương dày
    'town/gate night +fireflies | lamp@.2,.64*1.2', // 23 Trì Hằng: ngọn đèn chưa từng tắt
    'peaks/summit night +drift ~moon@.3,.22,60', // 24 Trương Thỉ: cung dài bằng dải ngân hà
    'field/dry deep +fireflies', // 25 Thiện Căn: vườn hạt giống dưới cõi âm
    'village/camp day +dust', // 26 Tiết Độ: kho lương
    'peaks/summit storm +leaves +dust', // 27 Định Phong: mắt bão
    'town/street morning +birds', // 28 Hòa Quang: sống lẫn giữa cõi người
    'field/green dusk +leaves ~sun@.7,.34,54', // 29 Cố Bản: chăm phần rễ
    'temple holy +rays | mirror@.84,.8*1.2', // 30 Minh Kính: tấm gương soi chân tướng
    'arena/field day +dust +birds', // 31 Đại Thành: trường thành ngăn hư không
    'peaks/summit day +drift +birds', // 32 Tiêu Dao: nằm trên đám mây
    'heaven/stairs holy +rays', // 33 Thiên Hình: thước ngọc đặt ngang gối
    'field/green blood +redmist ~red@.6,.2,100', // 34 Phong Đăng: mùa màng ở phương Hợi
    'altar blood +embers ~red@.5,.24,120', // 35 Vô Ba: chắn trước điện Huyết Nguyệt
  ];
  // Bối cảnh 11 trận Phương thần đầu (g:l1 … g:l11); mọi trang chiến ký nay có khung vẽ tay riêng ở LINES, phần dựng tự động này chỉ là dự phòng cho trang mới thêm.
  const LORD_ENV = [
    'shore/deep night +bubbles', // Tý: dưới đáy hồ nước đen
    'peaks/path dusk +dust', // Sửu: bà lão cõng cả phương
    'peaks/am dawn +birds ~sun@.5,.36,60', // Dần: rạng đông
    'valley/stream morning +leaves +fireflies', // Mão: cánh rừng
    'peaks/summit storm +rain +drift', // Thìn: rồng mây, mưa
    'field/dry dusk +embers +ash ~sun@.5,.4,110', // Tỵ: lửa
    'town/square day +rays ~sun@.5,.12,80', // Ngọ: giữa trưa không bóng
    'field/green dusk +birds ~sun@.78,.34,60', // Mùi: lúa chín quanh năm
    'arena/plaza morning +sparks', // Thân: vạn nhát kiếm mỗi ngày
    'field/green dusk +leaves ~sun@.7,.36,60', // Dậu: buổi chiều thu
    'peaks/summit blood +redmist ~red@.6,.2,100', // Tuất: biên giới, sau lưng là phương Hợi
  ];
  // Màu áo thần theo quy luật (Nhân Quả, Lưu Thông, Tĩnh Động, Tương Sinh, Sinh Trưởng, Minh Lý, Tích Lũy, Âm Dương) và theo phương.
  const STAR_LOOK = ['god', 'godb', 'godb', 'godr', 'godj', 'godg', 'godg', 'god'];
  const LORD_LOOK = ['godb', 'godg', 'godr', 'godj', 'godb', 'godr', 'godg', 'godj', 'godg', 'godr', 'god'];

  // ---- Đạo diễn tự động -------------------------------------------------------------------------------------------------------
  const envOf = (spec) => {
    const [e, props] = String(spec).split('|').map((x) => x.trim());
    const t = e.split(/\s+/), env = { s: t[0], t: t[1], fx: [], b: [], props: props || '' };
    for (const x of t.slice(2)) (x[0] === '+' ? env.fx : env.b).push(x);
    return env;
  };
  const envFromShot = (sh) => sh.s + (sh.v ? '/' + sh.v : '') + ' ' + sh.t + ' ' + sh.fx.map((x) => '+' + x).join(' ') + ' ' + (sh.b || []).map((b) => '~' + b[0] + '@' + b[1] + ',' + b[2] + ',' + b[3]).join(' ');
  const KEEP_RED = ['+dust', '+ash', '+embers', '+drift', '+sparks'];
  const envStr = (e, moon, extra) => {
    if (moon) return [e.s, 'blood', '+redmist', ...e.fx.filter((x) => KEEP_RED.includes(x)), '~red@.7,.2,86'].join(' ');
    const fx = e.fx.slice();
    if (extra && !fx.includes(extra)) fx.push(extra);
    return [e.s, e.t, ...(fx.length ? fx : ['-']), ...e.b].join(' ');
  };
  const BAD = new Set(['nhan', 'lamhat', 'tieuhuyet', 'trinhho', 'ma', 'giao']);

  // Một khung hình cho một trang: E bối cảnh, A người đứng bên phải (cặp), who người nói, pose thế của trang, i số trang.
  function frame(E, A0, who, pose, i, seed, o) {
    o = o || {};
    let A = A0.slice();
    if (who === 'than' || who === 'trang') A = ['ma'];
    else if (who !== 'ke' && who !== 'hero' && !A.includes(who) && Z.CAST.has(who)) A = [who];
    A = A.map((a) => (Z.CAST.has(a) ? a : 'dan'));
    const j = (hashOf(seed + ':' + i) % 997) / 997 - 0.5;
    const jx = j * 0.06, jz = j * 0.18;
    const moon = pose === 'moon', bad = A.some((a) => BAD.has(a));
    const big = o.big || 1;
    const P = (id, p, x, s) => id + ':' + p + '@' + r2(x) + '*' + r2(s);
    const right = (p, x, s) => A.map((a, n) => P(a, p, x + n * 0.1, (n ? s * 0.92 : s) * big)).join(' ');
    let cam, figs, extra = '';
    if (pose === 'taichi') {
      cam = [0.5 + jx, 0.72, 1.4 + jz];
      figs = [P('hero', 'taichi', 0.44, 1.3), right(o.bow ? 'bow' : 'stand', 0.82, 0.95)];
    } else if (pose === 'martial') {
      cam = [0.5 + jx, 0.74, 1.3 + jz];
      figs = [P('hero', 'martial', 0.38, 1.25), right(bad ? 'strike' : 'stand', 0.68, 1.2)];
      extra = '+dust';
    } else if (moon) {
      cam = [0.56 + jx, 0.6, 1.2 + jz];
      figs = [P('hero', 'stand', 0.26, 1.0), right(bad ? 'cast' : 'stand', 0.7, 1.4)];
    } else if (who === 'hero') {
      cam = [0.4 + jx, 0.68, 1.55 + jz];
      figs = [P('hero', pose === 'zen' ? 'zen' : 'talk', 0.32, 1.25), right('stand', 0.72, 0.98)];
    } else if (who === 'ke') {
      if (i % 2 === 0) {
        cam = [0.5 + jx, 0.6, 1.0 + jz * 0.5];
        figs = [P('hero', 'stand', 0.33, 1.1), right('stand', 0.68, 1.1)];
      } else {
        cam = [0.5 + jx, 0.68, 1.3 + jz];
        figs = [P('hero', pose === 'zen' ? 'zen' : 'talk', 0.4, 1.2), right('stand', 0.62, 1.15)];
      }
    } else {
      cam = [0.6 - jx, 0.68, 1.55 + jz];
      figs = [P('hero', 'stand', 0.27, 0.98), right(o.bow ? 'bow' : pose === 'zen' ? 'zen' : 'talk', 0.66, 1.25)];
    }
    return [envStr(E, moon, extra), '@' + cam.map(r2).join(','), figs.join(' '), moon ? '' : E.props].filter(Boolean).join(' ');
  }

  function plan(id, entry, prev) {
    const kind = id[0] === 'm' ? 'meet' : id[0] === 'g' ? 'god' : 'tale';
    let E, A = ['dan'];
    const o = {};
    if (kind === 'meet') {
      const cast = entry.meet?.cast?.id || id.slice(2).replace(/-\d+$/, '');
      const list = MEET_ENV[cast] || MEET_ENV.batu;
      E = envOf(list[Math.max(0, (entry.meet?.k || 1) - 1)] || list[0]);
      A = PAIRS[cast] || [cast];
    } else if (kind === 'god') {
      const m = /^g:([slk])(\d*)$/.exec(id) || [];
      const Zg = window.zenGods;
      const n = Number(m[2]) || 0;
      if (m[1] === 's') {
        E = envOf(STAR_ENV[n - 1] || STAR_ENV[0]);
        A = [STAR_LOOK[Zg?.STARS?.[n - 1]?.law ?? n % 8] || 'god'];
      } else if (m[1] === 'l' && n < 12) {
        E = envOf(LORD_ENV[n - 1] || LORD_ENV[0]);
        A = [LORD_LOOK[n - 1] || 'god'];
      } else if (m[1] === 'l') {
        E = envOf('heaven/realm blood +redmist ~red@.5,.24,110');
        A = ['giao'];
      } else {
        E = envOf('bridge/river holy +ripple +drift');
        A = ['king'];
      }
      o.big = 1.1;
    } else {
      E = envOf(prev ? envFromShot(prev) : 'valley/tea day');
    }
    const lines = {};
    return entry.pages.map(([who, pose], i) => {
      const bow = kind === 'god' && who !== 'ke' && who !== 'hero' && i === 3;
      return Z.parse(lines[i] || frame(E, A, who === 'god' || who === 'king' ? A[0] : who, pose, i, id, { ...o, bow }), null);
    });
  }

  const PLANS = new Map();
  function derive(id, i, entry, prev) {
    if (!entry || !entry.pages || !entry.pages.length) return null;
    let hit = PLANS.get(id);
    if (!hit || hit.n !== entry.pages.length) {
      hit = { n: entry.pages.length, shots: plan(id, entry, prev) };
      PLANS.set(id, hit);
    }
    return hit.shots[Math.min(i, hit.shots.length - 1)] || null;
  }

  window.zenPlates = { LINES, derive, MEET_ENV, STAR_ENV, LORD_ENV };
})();
