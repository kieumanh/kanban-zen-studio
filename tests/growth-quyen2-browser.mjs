// Hồi quy v2.29.0 (Quyển Hai · Lò Nhà Nhóm Sẵn): làm sâu cốt truyện cấp 30–50 ngay trong năm chương (30, 35, 40, 45, 50),
// mỗi trang mới có tranh riêng; không thêm chương, không đổi cấp mở chương. Khung kiểm: tests/lib/story-volume.mjs.
//  - tình tiết mới: nỗi niềm của sư phụ ở cổng am và tấm bia không tên; thanh mộc kiếm "nhẹ quá"; nửa kho lúa cháy, bảng tre
//    học từ vạch đếm chuyến nước, mảng vá chỉ trắng của Hàn Phong, hình nộm rơm ở làng Nam; họa sư Ngọc Vô Hà và vết rạn;
//    y sư Khô Vinh, bát cháo nguội của Hàn Phong, lá thư Tô Bà Bà; áo bông trên đỉnh tuyết, ba bát cháo của Giáo chủ.
//  - nối quyển: lời "lò nhà này vẫn nhóm sẵn" (khai cuộc → cấp 45), áo bông (khai cuộc → cấp 50), ba bát cháo (cấp 5 → cấp 50),
//    cổng am (cấp 30 → cấp 45), bảng tre (cấp 5 → cấp 35), mảng vá chỉ trắng (cấp 20 → cấp 35).
import { runVolume } from './lib/story-volume.mjs';

await runVolume({
  name: 'growth-quyen2-browser',
  // 500 nửa điểm = 250 điểm: qua cấp 50, mở đủ năm chương của Quyển Hai.
  half: 500,
  pages: { 30: 16, 35: 16, 40: 14, 45: 16, 50: 14 },
  beats: [
    [30, /Ở lại, hóa ra, cũng là một cách để mất nó/],
    [30, /tấm bia gỗ không khắc tên sau gian bếp/],
    [30, /nhẹ quá! Đệ cầm thử/],
    [30, /mắt đỏ như hai hạt than/],
    [35, /nửa kho còn lại bùng lên/],
    [35, /học từ vạch đếm chuyến nước/],
    [35, /Người khâu nó không còn ở đây/],
    [35, /hình nộm rơm/],
    [35, /ai đang nhìn lên am/],
    [40, /võ sư trẻ chống thanh kiếm gãy/],
    [40, /Một nét bút lệch, cả bức bích họa/],
    [40, /Chưa hoàn hảo, nhưng đã quen/],
    [40, /nhặt từng mảnh giáp như nhặt trứng vỡ/],
    [40, /còn sống để mà sửa/],
    [45, /Ba mươi ngày ta không ngủ/],
    [45, /Phong, vào ăn cơm/],
    [45, /gói trà và lá thư chữ xiêu vẹo/],
    [45, /Lò nhà này vẫn nhóm sẵn/],
    [45, /mùi khói lò quán trà/],
    [50, /áo bông Tô Bà Bà/],
    [50, /viết chữ "thắng" lên tuyết/],
    [50, /tiếng lò nhóm lửa ở một quán trà/],
    [50, /ăn cả ba/],
  ],
  speakers: [
    [30, 'moc', 'Tiểu Mộc', /nhẹ quá/],
    [30, 'su', 'Sư phụ Tùng Hạc', /Nhẹ hay nặng là do kẻ cầm/],
    [35, 'moc', 'Tiểu Mộc', /học từ vạch đếm chuyến nước/],
    [40, 'ngoc', 'Lưu Ly Nguyệt Sứ Ngọc Vô Hà', /họa sư trong cung/],
    [40, 'hero', 'Lam Y', /còn sống để mà sửa/],
    [45, 'kho', 'Khô Nguyệt Sứ Khô Vinh', /Ba mươi ngày ta không ngủ/],
    [45, 'batu', 'Tô Bà Bà', /Lò nhà này vẫn nhóm sẵn/],
    [50, 'hero', 'Lam Y', /viết chữ/],
  ],
  echoes: [
    [
      [0, /lò nhà này vẫn nhóm sẵn/],
      [45, /Lò nhà này vẫn nhóm sẵn/],
      'lời hứa của Tô Bà Bà',
    ],
    [[0, /áo bông/], [50, /áo bông Tô Bà Bà/], 'chiếc áo bông'],
    [
      [5, /ba chiếc bát cháo loãng/],
      [50, /ăn cả ba/],
      'ba bát cháo của Giáo chủ',
    ],
    [
      [30, /đứng ở cổng am đến sáng/],
      [45, /ngồi ở cổng am năm nào/],
      'sư phụ ở cổng am',
    ],
    [
      [5, /tấm bảng tre nhỏ/],
      [35, /học từ vạch đếm chuyến nước/],
      'bảng tre của Tiểu Mộc',
    ],
    [[20, /chỉ trắng/], [35, /chỉ trắng/], 'mảng vá của Hàn Phong'],
    [
      [5, /tấm bia gỗ không khắc tên/],
      [30, /tấm bia gỗ không khắc tên/],
      'tấm bia không tên',
    ],
  ],
});
