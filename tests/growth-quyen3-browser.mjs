// Hồi quy v2.30.0 (Quyển Ba · Chiếc Bánh Nguội): làm sâu cốt truyện cấp 55–75 ngay trong năm chương (55, 60, 65, 70, 75),
// mỗi trang mới có tranh riêng; không thêm chương, không đổi cấp mở chương. Khung kiểm: tests/lib/story-volume.mjs.
//  - tình tiết mới: Tiểu Mộc "đếm chỗ nứt trên mái am" và tấm gương soi chiếc giỏ tre; Tiểu Nha qua cầu không còn nhắm mắt;
//    sư phụ đứng trong bóng cây; võ đường mười lăm đệ tử, bánh bao cho Lão Quy, người em gái của Lãnh Tịch;
//    chiếc áo đi biển cỡ trẻ con và ngọn đèn canh đêm của lão ngư, lá thư chữ ngay ngắn; sư phụ hẹn "ba ngày", ánh mắt lạ
//    của Hàn Phong, "Ta về đúng hạn"; Lão Quy rụt đầu, dải tua ba nút, nét khắc con thuyền trên mắt xích.
//  - hạt giống cho Quyển Bốn: "Tiểu Mộc" từ mùa băng tan không ăn bánh bao, viết chữ ngay ngắn, bị Lão Quy tránh;
//    áo trẻ con và thuyền khắc dẫn tới Mạc Vọng.
//  - nối quyển: con rùa sau bếp (cấp 5 → 60 → 75), bánh bao (cấp 5 → 70), "ba ngày"/"đúng hạn" (cấp 10 → 70),
//    Tiểu Nha (cấp 15 → 55), chiếc giỏ (khai cuộc → 55), tua ba nút (cấp 35 → 75), và các lời vạch trần ở cấp 91.
import { runVolume } from './lib/story-volume.mjs';

await runVolume({
  name: 'growth-quyen3-browser',
  // 2900 nửa điểm = 1450 điểm: qua cấp 75 (1441 điểm), mở đủ năm chương của Quyển Ba.
  half: 2900,
  pages: { 55: 15, 60: 15, 65: 12, 70: 16, 75: 13 },
  beats: [
    [55, /đếm hết chỗ nứt trên mái am/],
    [55, /chiếc giỏ tre bên cửa quán trà/],
    [55, /cầu bây giờ chắc lắm/],
    [55, /Chiều ấy ta đứng trong bóng cây/],
    [60, /con rùa già sau bếp mà cậu gọi là Lão Quy/],
    [60, /Lão Quy ơi, phần của mày đây/],
    [60, /Nó gõ cửa suốt một đêm tuyết/],
    [60, /Giữ cho đệ cái bánh bao nhé/],
    [60, /thôi khỏi, đệ no rồi/],
    [65, /chiếc áo đi biển cỡ trẻ con/],
    [65, /ngọn đèn ở bến sáng suốt đêm/],
    [65, /chữ xưa nay xiêu như cua bò/],
    [70, /Ba ngày sẽ về/],
    [70, /Hàn Phong đứng sát cánh trái/],
    [70, /kẻ vừa tự mình nhảy xuống vực/],
    [70, /Ta về đúng hạn/],
    [70, /mệt đến quên cả bánh bao/],
    [75, /Lão Quy sợ lửa thật/],
    [75, /Ba nút: còn nợ, sẽ trả/],
    [75, /hình một con thuyền nhỏ, buồm lệch về một phía/],
  ],
  speakers: [
    [55, 'moc', 'Tiểu Mộc', /đếm hết chỗ nứt trên mái am/],
    [55, 'su', 'Sư phụ Tùng Hạc', /Chiều ấy ta đứng trong bóng cây/],
    [60, 'moc', 'Tiểu Mộc', /Lão Quy ơi/],
    [60, 'suong', 'Sương Nguyệt Sứ Lãnh Tịch', /Nó gõ cửa suốt một đêm tuyết/],
    [60, 'moc', 'Tiểu Mộc', /thôi khỏi, đệ no rồi/],
    [70, 'hero', 'Lam Y', /Hàn Phong đứng sát cánh trái/],
    [75, 'hero', 'Lam Y', /Ba nút: còn nợ, sẽ trả/],
  ],
  echoes: [
    [
      [5, /con rùa sau bếp/],
      [60, /con rùa già sau bếp mà cậu gọi là Lão Quy/],
      'con rùa sau bếp được đặt tên',
    ],
    [[60, /Lão Quy/], [75, /Lão Quy sợ lửa thật/], 'Lão Quy rụt đầu'],
    [
      [5, /không bao giờ để phí/],
      [60, /bài "đừng phí"/],
      'Tiểu Mộc không để phí bánh bao',
    ],
    [
      [5, /bánh bao/],
      [70, /mệt đến quên cả bánh bao/],
      'bánh bao bị bỏ quên',
    ],
    [[10, /tới đúng hạn/], [70, /Ta về đúng hạn/], '"ba ngày" và "đúng hạn"'],
    [
      [15, /lần đầu tiên không nhắm/],
      [55, /con đi không nhắm mắt nữa/],
      'Tiểu Nha qua cầu',
    ],
    [
      [0, /đặt một chiếc giỏ trước cửa/],
      [55, /chiếc giỏ tre bên cửa quán trà/],
      'chiếc giỏ của đứa bé',
    ],
    [
      [35, /ba nút là còn nợ, sẽ trả/],
      [75, /Ba nút: còn nợ, sẽ trả/],
      'tua kiếm ba nút',
    ],
    [
      [60, /Ba hôm sau cậu mới về/],
      [91, /từ mùa băng tan/],
      'Tiểu Mộc bị thay từ mùa băng tan',
    ],
    [
      [70, /Đệ dựng lại bảng rồi/],
      [91, /Người dựng lại tấm bảng sau đêm nguyệt thực là hắn/],
      'tấm bảng dựng lại',
    ],
    [
      [75, /chuyến nước thứ mười nghìn/],
      [91, /Người đếm chuyến nước thứ mười nghìn cũng là hắn/],
      'chuyến nước thứ mười nghìn',
    ],
    [
      [75, /lệch khỏi tim đúng một đốt ngón tay/],
      [91, /đúng một đốt ngón tay/],
      'nhát kiếm lệch một đốt ngón tay',
    ],
  ],
});
