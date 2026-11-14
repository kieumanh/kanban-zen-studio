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
  // Bối cảnh 11 trận Phương thần đầu (g:l1 … g:l11); g:l12 (Song thần chi chiến) và g:k (Trường Lưu) có cảnh riêng ở GOD_LINES.
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

  // Hai trận có nhiều trang và đổi nơi giữa chừng: khung vẽ riêng cho những trang ấy (trang khác để đạo diễn tự động).
  const GOD_LINES = {
    'g:k': {
      3: 'bridge/river holy +ripple +drift @.5,.78,1.4 hero:carry@.36,.9*1.2 king:carry@.64,.9*1.3 "Hai người lội xuống dòng sông thời gian, mỗi người một gánh, mang nước của hôm qua tưới cho ngày mai"',
      4: 'bridge/river holy +ripple @.5,.8,1.6 hero:fall@.4,.9*1.3 king:carry@.7,.9*1.25 "Năm thứ một trăm hiệp khách muốn vượt lên, dòng nước xô ngã, ông lão vẫn đều bước phía trước"',
      6: 'bridge/river holy +ripple +fireflies ~moon@.5,.24,70 @.5,.8,1.6 bucket@.36,.94*1.3?1 bucket@.64,.94*1.3?1 hero:zen@.26,.9*1.1 king:zen@.74,.9*1.2 "Nghìn năm đã qua, hai người đặt gánh xuống cùng một lúc, trong bốn chiếc thùng đều có một vầng trăng tròn"',
      8: 'heaven/realm night +drift ~moon@.7,.2,56 @.5,.55,1.2 thien:zen@.62,.9*1.3 king:walk@.3,.9*1.3 "Ở rìa vũ trụ Không Nguyệt đứng đợi vị Thần Vương già đang chống gậy bước ra khỏi Thần giới"',
      9: 'peaks/path night ~moon@.68,.2,58 @.5,.7,1.4 giao:carry@.36,.9*1.2 kid:carry@.6,.92*1.0 "Trên núi Tùng Hạc một lão nhân tóc trắng gánh nước lên dốc, theo sau là đứa trẻ mới lên núi, trăng rằm in xuống thùng nước của cả hai"',
      10: 'bridge/river holy +ripple +petals @.5,.62,1.1 hero:zen@.5,.9*1.3 "Thần Vương chủ Thời đứng bên dòng sông thời gian, nhớ lại một câu rất cũ: chiêu lợi hại nhất là chiêu ngươi luyện mỗi ngày"',
    },
    'g:l12': {
      8: 'heaven/realm blood +redmist ~red@.5,.24,110 @.6,.7,1.7 giao:hold@.66,.9*1.4 hero:kneel@.3,.92*1.1 ladle@.44,.95*.9?1 "Lệ Vô Khuyết nghe thấy tiếng gọi từ chiếc gáo, giọng khàn nhưng đã là của người anh: cho ta mượn cái gáo"',
      9: 'heaven/realm holy +sparks +rays ~red@.5,.2,90 @.5,.74,1.8 giao:hold@.5,.9*1.35 ladle@.36,.95*.9?1 hinh:point@.82,.9*1.3 ruler@.74,.7*.8 "Bàn tay già nua cầm lấy gáo nước, Vô Yểm mất chỗ trú và bị thước ngọc của Thiên Hình niêm dưới đáy hồ soi trời"',
      10: 'peaks/path dawn +birds ~sun@.7,.3,54 @.5,.7,1.5 giao:hold@.36,.9*1.3 pole@.66,.92*1.0?1 "Lệ Vô Khuyết không giữ ngôi, xin về cõi người, lên núi Tùng Hạc nhận lại chiếc đòn gánh của mẹ"',
      11: 'peaks/path morning +birds @.5,.7,1.4 giao:carry@.4,.9*1.2 kid:carry@.64,.92*1.0 "Lệ Vô Khuyết gánh nước cho lũ trẻ mới lên núi, chậm thôi, mỗi ngày một chuyến"',
      12: 'heaven/realm holy +petals ~moon@.5,.22,84 @.5,.55,1.2 hero:zen@.5,.9*1.2 god:stand@.2,.88*.9 god:stand@.8,.88*.9 godg:stand@.1,.86*.8 godj:stand@.9,.86*.8 "Mười một Phương thần cùng quay về phía hiệp khách, vầng trăng ở phương Hợi đổi từ đỏ sang bạc"',
    },
  };

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
    const lines = GOD_LINES[id] || {};
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

  window.zenPlates = { LINES, derive, MEET_ENV, STAR_ENV, LORD_ENV, GOD_LINES };
})();
