// Hồi quy v2.31.0 (Quyển Bốn · Mắt Xích Cuối): làm sâu cốt truyện cấp 80–95 ngay trong mười chương (80, 82, 84, 86, 88, 90, 91, 92,
// 94, 95), mỗi trang mới có tranh riêng; không thêm chương, không đổi cấp mở chương, các chương cấp 96–100 giữ nguyên.
// Khung kiểm: tests/lib/story-volume.mjs.
//  - tình tiết mới: bàn tay ngả vàng của Giáo chủ và ánh mắt người cha của sư phụ; Tiểu Mộc "tự giữ mình lại"; bông tuyết tan
//    và sợi chỉ chớ vội cắt; con mắt nhìn thấy nỗi sợ (Tiểu Mộc, Giáo chủ, Hàn Phong); bảng phân việc khựng ở cổng bắc, nồi cháo
//    của bà bán bánh, đội tiên phong chậm một nhịp; tiếng gọi "Vọng…" trong bão, chiếc áo trẻ con, nét khắc con thuyền buồm lệch;
//    những vạch năm gạch một sau mặt nạ; bàn tay nắm lại của sư phụ; cánh cửa của Lãnh Tịch; chiếc bánh bao ấm trước canh ba.
//  - trả hạt giống của Quyển Ba: nỗi sợ thật của kẻ đóng vai, lá thư ngay ngắn, con rùa Lão Quy, bánh bao không có độc;
//    Tiểu Mộc thật hỏi thăm Lão Quy; áo trẻ con và thuyền khắc của lão ngư tới cấp 95; vạch trên mặt nạ được giải ở cấp 94.
import { runVolume } from './lib/story-volume.mjs';

await runVolume({
  name: 'growth-quyen4-browser',
  // 8500 nửa điểm = 4250 điểm: qua cấp 95 (4212 điểm), mở đủ mười chương của Quyển Bốn.
  half: 8500,
  pages: {
    80: 13,
    82: 11,
    84: 12,
    86: 12,
    88: 15,
    90: 11,
    91: 13,
    92: 11,
    94: 13,
    95: 12,
  },
  beats: [
    [80, /ngả vàng như giấy cũ/],
    [80, /bước ra một bước, rồi tự giữ mình lại/],
    [80, /đứa con đi lạc quá xa để còn gọi về/],
    [80, /tay run bần bật/],
    [82, /ngồi nhìn một bông tuyết rơi vào lòng bàn tay/],
    [82, /Chớ vội cắt/],
    [82, /nỗi sợ của kẻ sắp bị đuổi đi/],
    [84, /giọng cậu khựng lại một nhịp rất ngắn/],
    [84, /Lò nhà tôi nguội ba hôm năm xưa/],
    [84, /chú áo đen kia cố tình đi chậm/],
    [86, /Vọng… Vọng…/],
    [86, /áo nó mặc ngày đầu ra khơi/],
    [86, /Buồm lệch vì nó tin gió/],
    [88, /mặt trong tấm mặt nạ khắc chi chít những vạch nhỏ/],
    [88, /sợ chết khi cánh cửa phía trước vẫn chưa mở/],
    [88, /Nó chỉ nằm yên/],
    [90, /Nặng chỉ là cái ý nghĩ rằng nhờ vả là yếu đuối/],
    [90, /sợ mình đâm quá nhẹ/],
    [90, /Vậy mang theo\. Ấm tay/],
    [91, /đã gán nó nhầm người/],
    [91, /lá thư gửi ra đảo, ta lại viết ngay ngắn/],
    [91, /đầu tiên ta cho đi mà không có độc/],
    [92, /Lão Quy còn sống không/],
    [94, /Chưa một đêm nào đủ/],
    [95, /góc chiếc áo đi biển cỡ trẻ con/],
    [95, /buồm vẫn lệch, nhưng con thấy nhà rồi/],
  ],
  speakers: [
    [82, 'thien', 'Thiền sư Không Nguyệt', /Chớ vội cắt/],
    [84, 'dan', 'Trấn dân Thanh Khê', /Lò nhà tôi nguội ba hôm/],
    [86, 'hai', 'Võ sư Mạc Trấn Hải', /áo nó mặc ngày đầu ra khơi/],
    [
      90,
      'suong',
      'Sương Nguyệt Sứ Lãnh Tịch',
      /cánh cửa mở từ bên trong nhẹ hơn/,
    ],
    [91, 'dien', 'Huyễn Nguyệt Sứ Thiên Diện', /lá thư gửi ra đảo/],
    [92, 'moc', 'Tiểu Mộc', /Lão Quy còn sống không/],
    [95, 'vong', 'Thực Nguyệt Sứ Vô Vọng', /buồm vẫn lệch/],
  ],
  echoes: [
    [
      [65, /xiêu như cua bò/],
      [91, /xiêu như cua bò/],
      'chữ của Tiểu Mộc và lá thư ngay ngắn',
    ],
    [
      [60, /Lão Quy/],
      [91, /Con rùa sau bếp chưa từng tin ta/],
      'con rùa không tin kẻ đóng vai',
    ],
    [
      [75, /Lão Quy sợ lửa thật/],
      [92, /mặt lạ là nó rụt đầu liền/],
      'Lão Quy rụt đầu trước mặt lạ',
    ],
    [
      [90, /bánh bao còn ấm/],
      [91, /cái bánh bao ta nhét vào tay ngươi đêm ấy/],
      'chiếc bánh bao trước canh ba',
    ],
    [
      [82, /nỗi sợ rất nặng/],
      [91, /nỗi sợ nặng như đá/],
      'nỗi sợ thật của kẻ đóng vai',
    ],
    [
      [82, /nhìn một người là thấy được nỗi sợ/],
      [88, /thấy nỗi sợ của hắn/],
      'con mắt học trên Tuyết Phong nhìn Giáo chủ',
    ],
    [
      [82, /nhìn một người là thấy được nỗi sợ/],
      [90, /nỗi sợ của Hàn Phong/],
      'con mắt học trên Tuyết Phong nhìn Hàn Phong',
    ],
    [
      [65, /chiếc áo đi biển cỡ trẻ con/],
      [86, /áo nó mặc ngày đầu ra khơi/],
      'chiếc áo của con trai lão ngư',
    ],
    [
      [86, /áo nó mặc ngày đầu ra khơi/],
      [95, /góc chiếc áo đi biển cỡ trẻ con/],
      'góc áo trong ngực lão ngư',
    ],
    [
      [75, /con thuyền nhỏ, buồm lệch về một phía/],
      [86, /Buồm lệch vì nó tin gió/],
      'con thuyền khắc trên mắt xích',
    ],
    [
      [86, /Buồm lệch vì nó tin gió/],
      [95, /buồm vẫn lệch/],
      'Vô Vọng nhìn lại con thuyền',
    ],
    [
      [88, /năm gạch một/],
      [94, /nhóm năm gạch một/],
      'những vạch trong mặt nạ Giáo chủ',
    ],
    [[70, /Ba ngày sẽ về/], [88, /ba ngày ấy sẽ nhỏ đi/], '"ba ngày" của sư phụ'],
    [
      [60, /gõ cửa suốt một đêm tuyết/],
      [90, /gõ cửa suốt một đêm/],
      'người em gái của Lãnh Tịch',
    ],
    [
      [10, /Lò đã nguội ba hôm/],
      [84, /Lò nhà tôi nguội ba hôm/],
      'lò của trấn Thanh Khê',
    ],
  ],
});
