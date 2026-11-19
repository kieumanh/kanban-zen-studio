'use strict';
// v1.78.0: "Điểm tích lũy" — 8 chỉ số quan trọng của một đời người, cộng dần khi hoàn thành việc.
// Dữ liệu: data.growth = {v:1, hero:'nam'|'nu', name?, since, log:[{id,d,s,k?,n?,p:[8 số nguyên]}]} (cùng quy tắc với server/growth.mjs).
// p tính theo nửa điểm; điểm từng chỉ số = tổng p của sổ cái / 2. Sổ cái chỉ-thêm nên hai thiết bị cùng cộng điểm vẫn gộp được theo id.
// v1.81.0: data.growth.spend = [{id, d, n, note?, p:[8 số nguyên], x?:true}] — sổ quy đổi. Điểm hiện có của từng chỉ số = đã cộng − đã quy đổi (không âm);
// cảnh giới tính theo tổng điểm đã tích lũy nên không tụt khi quy đổi. Sửa/hủy/khôi phục chỉ đổi đúng dòng quy đổi đó.
// Chưa chọn nhân vật (chưa có data.growth) thì mọi thứ ở đây im lặng: không hỏi điểm khi xong việc.
(function () {
  const STEP = 0.5; // mỗi lần bấm + cộng 0,5 điểm
  const TASK_STEPS = 2; // mỗi việc hoàn thành được 2 lần cộng (1 điểm) để phân bổ
  const HABIT_STEPS = 6; // một việc hằng ngày đủ 7 ngày liền được 6 lần cộng (3 điểm)
  const { LOG_MAX, SPEND_MAX } = window.zenGrowthValid.limits; // cùng giới hạn với bộ kiểm ở lazy.js
  const TIERS = [5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120];
  // Thứ tự các chỉ số là cố định (chỉ số p[i] trong sổ cái); không đổi thứ tự sau khi đã phát hành.
  // v2.59.0 (Bát Phương Mới): tám phương diện vun bồi cuộc sống — Tài lộc, Tâm cảnh, Nhân duyên, Thân thể, Trí tuệ, Sự nghiệp, Đạo tâm, Gia đạo.
  // Sổ cái KHÔNG đổi: các ô p[1…6] giữ nguyên ý nghĩa (Thể lực → Thân thể chỉ đổi tên); ô p[0] (trước là Nghiệp quả) nay là Đạo tâm
  // (tu tập, từ bi, thiện hạnh — gần nghĩa nhất) và ô p[7] (trước là Tinh thần) nay là Gia đạo. Nghiệp quả được nâng lên làm nguyên lý bao trùm cả
  // tám phương (KARMA bên dưới): việc làm ở phương nào cũng là hạt giống, quả trổ về chính phương ấy.
  // no = số thứ tự hiển thị ở Hướng dẫn tám phương (theo thứ tự chuẩn Tài lộc → Gia đạo); khác với chỉ số ô trong sổ cái.
  const AXES = [
    { id: 'dao', no: 7, name: 'Đạo tâm', sub: 'Tu tập · đạo hạnh', color: '#b0892a', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 3a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 1 0 9',
      means: 'Chánh niệm, từ bi, giới hạnh và tinh tấn: thiện hạnh, lời nói đúng, giúp người không đòi đáp, hóa giải điều chưa tròn.',
      ideas: ['Ngồi thiền hoặc niệm một khắc', 'Giúp ai đó một việc nhỏ, không đòi đáp', 'Giữ đúng lời đã hứa', 'Xin lỗi hoặc hóa giải một hiềm khích'] },
    { id: 'tai', no: 1, name: 'Tài lộc', sub: 'Tài chính · vật chất', color: '#2e7d5b', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M14.6 9.3c-.6-.8-1.5-1.3-2.6-1.3-1.5 0-2.6.8-2.6 2 0 2.7 5.2 1.4 5.2 4.1 0 1.2-1.1 2-2.6 2-1.1 0-2.1-.5-2.7-1.4 M12 6.5V8 M12 16v1.5',
      means: 'Tạo lập, quản lý và tích lũy tài sản: thu nhập, tiết kiệm, đầu tư, nợ nần và kỷ luật chi tiêu.',
      ideas: ['Ghi chép thu chi', 'Hoàn thành việc tạo ra thu nhập', 'Tiết kiệm hoặc trả bớt nợ', 'Học một kiến thức tài chính'] },
    { id: 'tam', no: 2, name: 'Tâm cảnh', sub: 'Cảm xúc · nội tâm', color: '#7950c8', icon: 'M12 21c-5-2-8-6-8-11 3 0 6 1 8 4 2-3 5-4 8-4 0 5-3 9-8 11z M12 14V6',
      means: 'An ổn, cân bằng và làm chủ cảm xúc: tâm yên, ngủ nghỉ ngon, buông bỏ lo âu, giữ niềm vui sống.',
      ideas: ['Thở có ý thức khi bực bội', 'Viết nhật ký, gọi tên cảm xúc', 'Dành thời gian yên tĩnh', 'Buông một việc không cần ôm'] },
    { id: 'duyen', no: 3, name: 'Nhân duyên', sub: 'Quan hệ · kết nối', color: '#d65380', icon: 'M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z',
      means: 'Bạn bè, tình cảm, đồng nghiệp, cộng đồng và hợp tác: sự kết nối chân thành.',
      ideas: ['Nhắn hỏi thăm một người bạn', 'Cảm ơn hoặc động viên ai đó', 'Tham gia một hoạt động cộng đồng', 'Cùng người khác làm xong một việc chung'] },
    { id: 'than', no: 4, name: 'Thân thể', sub: 'Sức khỏe · sinh lực', color: '#c8553d', icon: 'M13 3 6 13h5l-1 8 8-11h-5z',
      means: 'Thể chất, dinh dưỡng, vận động và nghỉ ngơi: chăm sóc cơ thể, giấc ngủ, ăn uống.',
      ideas: ['Đi bộ, tập võ, vận động', 'Ngủ đủ và đúng giờ', 'Ăn uống lành mạnh', 'Khám sức khỏe định kỳ'] },
    { id: 'tri', no: 5, name: 'Trí tuệ', sub: 'Tri thức · nhận thức', color: '#3a6fb0', icon: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 19V5 M9 7h6',
      means: 'Học hỏi, tư duy, hiểu biết và sáng suốt: đọc sách, kỹ năng mới, sáng tạo và khả năng nhìn lại chính mình.',
      ideas: ['Đọc một chương sách', 'Học một khóa hoặc bài mới', 'Luyện một kỹ năng', 'Viết lại điều đã học được'] },
    { id: 'nghe', no: 6, name: 'Sự nghiệp', sub: 'Công việc · cống hiến', color: '#2f7f9d', icon: 'M4 21V4 M4 5h12l-2 4 2 4H4',
      means: 'Năng lực tạo giá trị và phụng sự: tiến độ công việc chính, dự án, đóng góp chuyên môn và sứ mệnh nghề nghiệp.',
      ideas: ['Hoàn thành việc quan trọng của dự án', 'Giải quyết việc tồn đọng', 'Hoàn thiện một sản phẩm', 'Chia sẻ chuyên môn cho người khác'] },
    { id: 'gia', no: 8, name: 'Gia đạo', sub: 'Gia đình · hòa hợp', color: '#e07a2e', icon: 'M3 11 12 4l9 7 M5 10v10h14V10 M10 20v-6h4v6',
      means: 'Hiếu kính, chăm sóc và vun bồi tình thân: cha mẹ, vợ chồng, con cái, tổ ấm gọn gàng và hòa thuận.',
      ideas: ['Gọi hoặc về thăm cha mẹ, người thân', 'Dành thời gian trọn vẹn cho gia đình', 'Dọn dẹp, sắp xếp tổ ấm', 'Nấu một bữa cho cả nhà'] },
  ];
  // Nghiệp quả: nguyên lý bao trùm tám phương (không phải một phương riêng). Dùng ở Hướng dẫn tám phương và (từ v2.62.0) ở Nhân quả.
  const KARMA = { name: 'Nghiệp quả', sub: 'Nhân quả · gieo gặt', means: 'Mọi việc làm ở bất kỳ phương nào, kể cả việc giúp người, đều là hạt giống; quả trổ về chính phương ấy trong đời mình. Làm điều lành cho người là cách bồi đắp chính mình.' };
  const HEROES = { nam: { label: 'Nam', title: 'Thiếu hiệp', desc: 'Kiếm khách áo lam' }, nu: { label: 'Nữ', title: 'Nữ hiệp', desc: 'Hồng y kiếm khách' } };
  // v2.5.0 (Thăng Thiên): thang 103 cấp, mỗi cấp một danh xưng, 11 cảnh giới (thay thang v1.85.0: 10 cảnh giới × 10 trọng).
  //  - Cảnh giới bắt đầu ở cấp 10, 20 … 90 (Sơ nhập giang hồ: cấp 1–9). Cấp 100 thành Thần (Thần cảnh); trên Thần còn 3 thần cấp,
  //    cấp 103 là Thần Vương.
  //  - Cấp 10, 20 … 90 là ải đột phá: tốn chừng ba lần cấp thường của cảnh giới trước (hai ải đầu gấp bảy).
  //  - v2.10.0 (Thiên Môn): từ cấp 91, mỗi cấp tốn gấp đôi cấp trước; cấp 100 (ải thành Thần) là ải nặng nhất của cõi người.
  //  - v2.33.0 (Tam Niên Thành Thần): nhịp chuẩn 5,6 điểm mỗi ngày (chừng 5–6 việc). Cấp 1–90 giữ nguyên: 4.088 điểm = hai năm.
  //    Cấp 91–100 hạ từ 4 · 8 … 1.024 · 2.048 xuống 2 · 4 · 8 … 512 · 1.024 (tổng 2.046 điểm = một năm), nên cấp 100 = 6.134 điểm
  //    (thang v2.10.0: 8.180). Mỗi mốc đều không cao hơn thang trước nên không ai tụt cấp.
  //  - Mỗi thần cấp vẫn 2.048 điểm; cấp 103 = 12.278 điểm.
  //  - Tính theo tổng điểm đã tu luyện (không trừ phần đổi bảo vật) nên cấp không bao giờ tụt.
  const REALMS = ['Sơ nhập giang hồ', 'Tam lưu cao thủ', 'Nhị lưu cao thủ', 'Nhất lưu cao thủ', 'Tuyệt đỉnh cao thủ', 'Tiên thiên cao thủ', 'Tông sư', 'Đại tông sư', 'Thiên nhân hợp nhất', 'Võ lâm chí tôn', 'Thần cảnh'];
  const REALM_FROM = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 104]; // cấp đầu của mỗi cảnh giới (phần tử cuối: chặn trên)
  const REALM_NOTE = ['Luyện thân, mở mạch', 'Bước chân giang hồ', 'Rèn chiêu luyện thức', 'Thành danh một phương', 'Vượt giới hạn bản thân', 'Phản bổn hoàn nguyên', 'Khai tông, truyền nghề', 'Ngộ đạo, hóa phồn thành giản', 'Hòa cùng trời đất', 'Đỉnh cao nhân gian', 'Thành Thần, hướng tới Thần Vương'];
  const NO_REALM = 'Vô danh tiểu tốt';
  // Danh xưng từng cấp (chỉ số = cấp; 0 = chưa nhập cấp).
  const LEVEL_NAMES = ['',
    'Sơ Tâm Khởi Bước', 'Thổ Nạp Điều Tức', 'Trát Mã Định Thân', 'Luyện Cân Thư Mạch', 'Đoán Cốt Thành Hình', 'Khai Mạch Thông Lạc', 'Dẫn Khí Nhập Thể', 'Tụ Khí Đan Điền', 'Khí Hải Sơ Thành',
    'Phá Quan Nhập Lưu', 'Hành Cước Tứ Phương', 'Khinh Thân Như Yến', 'Thiết Thủ Khai Bia', 'Quyền Xuất Như Phong', 'Bộ Pháp Sơ Thành', 'Nội Tức Tuần Hoàn', 'Kiếm Ý Manh Nha', 'Độc Hành Thiên Lý', 'Tam Lưu Viên Mãn',
    'Khí Quán Tứ Chi', 'Thảo Thượng Phi Hành', 'Chưởng Phong Sơ Hiện', 'Kiếm Hoa Lục Đóa', 'Nhãn Quan Lục Lộ', 'Nhĩ Thính Bát Phương', 'Ngự Phong Hành Bộ', 'Cương Nhu Tương Tế', 'Nội Lực Thâm Hậu', 'Nhị Lưu Viên Mãn',
    'Chân Khí Hộ Thể', 'Đạp Tuyết Vô Ngân', 'Phi Hoa Trích Diệp', 'Cách Không Điểm Huyệt', 'Kiếm Tùy Tâm Chuyển', 'Thân Như Bàn Thạch', 'Nhất Kích Tất Trúng', 'Khí Trầm Như Hải', 'Uy Chấn Nhất Phương', 'Nhất Lưu Viên Mãn',
    'Phá Kính Đăng Phong', 'Lăng Không Hư Độ', 'Kiếm Khí Tung Hoành', 'Chưởng Lực Khai Sơn', 'Hóa Phồn Vi Giản', 'Thính Phong Biện Khí', 'Bách Độc Bất Xâm', 'Tâm Như Chỉ Thủy', 'Khí Tráng Sơn Hà', 'Tuyệt Đỉnh Viên Mãn',
    'Phản Bổn Hoàn Nguyên', 'Tiên Thiên Chân Khí', 'Nhâm Đốc Quán Thông', 'Sinh Tử Huyền Quan', 'Khí Hóa Cương Phong', 'Thần Quang Nội Liễm', 'Ngự Khí Thành Kiếm', 'Linh Đài Thanh Minh', 'Kim Cương Bất Hoại', 'Tiên Thiên Viên Mãn',
    'Khai Tông Lập Phái', 'Vô Chiêu Thắng Hữu Chiêu', 'Ý Đáo Khí Đáo', 'Thảo Mộc Giai Binh', 'Hóa Kình Vô Hình', 'Truyền Đăng Tục Diệm', 'Tâm Kiếm Hợp Nhất', 'Vạn Pháp Quy Tông', 'Uy Trấn Bát Hoang', 'Tông Sư Viên Mãn',
    'Đại Đạo Sơ Khuy', 'Bộ Bộ Sinh Liên', 'Kiếm Ý Thông Thiên', 'Nhất Khí Hóa Vạn', 'Thôi Sơn Điền Hải', 'Thiên Lý Truyền Âm', 'Tâm Thông Vạn Vật', 'Đại Âm Hi Thanh', 'Đại Xảo Nhược Chuyết', 'Đại Tông Sư Viên Mãn',
    'Thiên Nhân Giao Cảm', 'Nhật Nguyệt Đồng Huy', 'Phong Vân Biến Sắc', 'Tinh Di Đẩu Chuyển', 'Ngũ Khí Triều Nguyên', 'Tam Hoa Tụ Đỉnh', 'Thần Du Thái Hư', 'Vạn Tượng Quy Nhất', 'Thiên Tâm Ngã Tâm', 'Thiên Nhân Viên Mãn',
    'Đăng Phong Tạo Cực', 'Lôi Đình Vạn Quân', 'Càn Khôn Tại Thủ', 'Vạn Kiếm Triều Tông', 'Độc Bộ Thiên Hạ', 'Siêu Phàm Nhập Thánh', 'Bất Diệt Kim Thân', 'Xuyên Phá Hư Không', 'Bán Bộ Thành Thần', 'Nhân Gian Cực Cảnh',
    'Thành Thần', 'Thượng Thần', 'Phương Thần', 'Thần Vương', // v2.13.0 (Thần Giới): cấp 102 là Phương Thần (trước: Thần Quân), khớp thứ bậc Thần giới
  ];
  const LEVEL_MAX = 103, GOD = 100;
  // Điểm cho mỗi cấp thường của từng cảnh giới (chỉ số = cảnh giới − 1) và cho ải đột phá ở cấp 10, 20 … 90.
  // Cảnh giới 10 (Võ lâm chí tôn): NORMAL[9] là điểm của cấp 91; từ đó mỗi cấp gấp đôi cấp trước, tới cấp 100.
  const NORMAL = [0.5, 1, 2.5, 5, 10.5, 21, 42.5, 85, 170.5, 2, 2048];
  const GATE = [3.5, 7, 9.5, 19, 33.5, 67, 129.5, 259, 513.5];
  const DOUBLE_FROM = 91;
  const PACE = 5.6; // điểm mỗi ngày dùng làm chuẩn dựng thang: 90 cấp đầu = 730 ngày, cấp 91–100 = 365 ngày
  const isGate = (n) => n % 10 === 0 && n >= 10 && n <= GOD;
  const levelCost = (n) => (n >= DOUBLE_FROM && n <= GOD ? NORMAL[9] * 2 ** (n - DOUBLE_FROM) : isGate(n) ? GATE[n / 10 - 1] : NORMAL[Math.min(10, Math.floor(n / 10))]);
  const LEVEL_AT = [0];
  for (let n = 1; n <= LEVEL_MAX; n++) LEVEL_AT[n] = LEVEL_AT[n - 1] + levelCost(n);
  // v2.12.0 (Thiên Môn Ký): tu vi cần cho một vị trí trên thang, kể cả cấp lẻ. 97.5 = nửa đường từ cấp 97 lên cấp 98
  // (chương truyện giữa cấp, dist/growth-story.js).
  const tuviAt = (lv) => {
    const f = Math.min(LEVEL_MAX, Math.floor(lv));
    return f >= LEVEL_MAX || lv === f ? LEVEL_AT[f] : LEVEL_AT[f] + (lv - f) * levelCost(f + 1);
  };
  // "Cấp 37/100"; trên Thần: "Thần cấp 1/3".
  const levelLabel = (lv) => (lv > GOD ? 'Thần cấp ' + (lv - GOD) + '/3' : 'Cấp ' + lv + '/100');
  const SOURCE_LABEL = { task: 'Hoàn thành nhiệm vụ', habit: 'Khổ luyện đủ 7 ngày', archive: 'Tổng hợp công phu cũ' };
  Object.assign(iconPaths, { growth: 'M8 3h8l5 5v8l-5 5H8l-5-5V8z M12 8l3 4-3 4-3-4z' });
  AXES.forEach((a) => (iconPaths['gr-' + a.id] = a.icon));

  // ---- Kiểm tra dữ liệu (cùng quy tắc với server/growth.mjs validGrowth) -------------------------------------------------
  const isDate = (s) => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
  };
  // v2.37.0: bộ kiểm dữ liệu data.growth (và bản bọc valid) nằm ở dist/lazy.js, đặt sẵn từ lúc mở trang dù growth.js chưa nạp; dùng lại ở đây.
  const validGrowth = window.zenGrowthValid;

  // ---- Mô hình ------------------------------------------------------------------------------------------------------------
  const growth = () => (data.growth && validGrowth(data.growth) ? data.growth : null);
  const started = () => !!growth();
  const thousands = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fmt = (n) => {
    const [i, d] = String(Math.round(n * 2) / 2).split('.');
    return thousands(i) + (d ? ',' + d : '');
  };
  const tierOf = (mx) => TIERS.find((t) => mx <= t) || Math.ceil(mx / 1000) * 1000;
  // Điểm đã tích lũy (cộng dồn từ sổ cái), điểm đã quy đổi (các lần chưa hủy) và điểm hiện có = đã cộng − đã quy đổi, không âm.
  function earnedScores() {
    const s = Array(8).fill(0), g = growth();
    if (g) for (const e of g.log) for (let i = 0; i < 8; i++) s[i] += e.p[i];
    return s.map((v) => v * STEP);
  }
  const activeSpend = (g) => (g && g.spend ? g.spend.filter((e) => !e.x) : []);
  function spentScores() {
    const s = Array(8).fill(0);
    for (const e of activeSpend(growth())) for (let i = 0; i < 8; i++) s[i] += e.p[i];
    return s.map((v) => v * STEP);
  }
  function scores() {
    const earned = earnedScores(), spent = spentScores();
    return earned.map((v, i) => Math.max(0, v - spent[i]));
  }
  const total = (s) => s.reduce((a, b) => a + b, 0);
  const earnedTotal = () => total(earnedScores());
  const spentTotal = () => total(spentScores());
  const realmIndex = (lv) => (lv ? REALM_FROM.findIndex((_, i) => lv < REALM_FROM[i + 1]) + 1 : 0); // 0 = chưa nhập cấp
  // Cấp, cảnh giới và danh xưng của tổng điểm t. need/pct: tới cấp kế tiếp; next/needRealm: tới cảnh giới kế tiếp;
  // breakthrough: cấp kế tiếp là ải đột phá (sang cảnh giới mới).
  // v2.14.0 (Thần Lộ): thần cấp 101–103 còn cần chiến tích ở Thần giới (dist/growth-gods.js, zenGods.cap), tính từ điểm tám chỉ
  // số đã tích lũy s. Truyền s thì áp dụng (cấp của người dùng hiện tại: myRealm()); không truyền thì tính thuần theo điểm (bảng
  // thang, mốc). held = đã đủ điểm lên cấp kế nhưng còn thiếu chiến tích.
  function realmOf(t, s) {
    let level = 0, held = false;
    while (level < LEVEL_MAX && t >= LEVEL_AT[level + 1]) level++;
    if (s && level > GOD && window.zenGods?.cap) {
      const cap = Math.max(GOD, window.zenGods.cap(t, s));
      if (cap < level) (level = cap), (held = true);
    }
    const ri = realmIndex(level), top = level === LEVEL_MAX, nextRealmAt = ri < REALMS.length ? LEVEL_AT[REALM_FROM[ri]] : 0;
    return {
      level, realm: ri, top, held, god: level >= GOD, name: ri ? REALMS[ri - 1] : NO_REALM, title: LEVEL_NAMES[level], nextTitle: top ? '' : LEVEL_NAMES[level + 1],
      need: top || held ? 0 : LEVEL_AT[level + 1] - t, pct: top || held ? 100 : Math.min(99, Math.floor(((t - LEVEL_AT[level]) / levelCost(level + 1)) * 100)),
      breakthrough: !top && realmIndex(level + 1) !== ri, next: nextRealmAt ? REALMS[ri] : '', needRealm: nextRealmAt ? nextRealmAt - t : 0,
    };
  }
  // Cấp của người dùng hiện tại, có tính chiến tích Thần giới.
  const myRealm = () => realmOf(earnedTotal(), earnedScores());
  // Thông tin một cảnh giới (1–11): cấp đầu / cuối, điểm mỗi cấp thường, điểm ải đột phá vào cảnh giới, tu vi đầu / cuối.
  // v2.10.0: cảnh giới 10 có costTo (điểm của cấp 99): mỗi cấp gấp đôi cấp trước, từ cost (cấp 91) tới costTo.
  function realmInfo(i) {
    const from = REALM_FROM[i - 1], to = REALM_FROM[i] - 1;
    return { i, name: REALMS[i - 1], note: REALM_NOTE[i - 1], from, to, cost: NORMAL[i - 1], costTo: i === 10 ? levelCost(to) : 0, gate: isGate(from) ? levelCost(from) : 0, at: LEVEL_AT[from], end: LEVEL_AT[to], levels: LEVEL_NAMES.slice(from, to + 1) };
  }
  // Lời nêu cách tính từ cấp 91 và nhịp chuẩn của thang (dùng ở bảng thang và Tâm pháp tu luyện); con số lấy từ thang nên không lỗi thời.
  const doublingText = () => [0, 1, 2].map((k) => fmt(NORMAL[9] * 2 ** k)).join(', ') + ' … ' + fmt(levelCost(GOD - 1));
  const paceText = () => 'khoảng ' + String(PACE).replace('.', ',') + ' điểm mỗi ngày (chừng 5–6 việc): hai năm đi hết 90 cấp đầu, thêm một năm thì thành Thần ở cấp ' + GOD;
  // Thang cấp: mỗi cảnh giới một dòng (dòng hiện tại được tô), kèm danh xưng từng cấp (cấp hiện tại được tô).
  function scaleTable(r) {
    const rows = REALMS.map((_, k) => {
      const x = realmInfo(k + 1);
      return '<tr' + (x.i === r.realm ? ' class="is-now" aria-current="true"' : '') + '><th scope="row">' + x.name + '</th><td>' + x.from + (x.to > x.from ? '–' + x.to : '') + '</td><td>' + fmt(x.cost) + (x.costTo ? '–<wbr>' + fmt(x.costTo) + '<small>gấp đôi mỗi cấp</small>' : '') + (x.gate ? '<small>ải ' + fmt(x.gate) + '</small>' : '') + '</td><td>' + fmt(x.at) + '–<wbr>' + fmt(x.end) + '</td></tr>';
    }).join('');
    const names = REALMS.map((_, k) => {
      const x = realmInfo(k + 1);
      return '<li class="gr-names-realm' + (x.i === r.realm ? ' is-now' : '') + '"><strong>' + x.name + '</strong><small>' + esc(x.note) + '</small><ol class="gr-names" start="' + x.from + '">' +
        x.levels.map((n, j) => { const lv = x.from + j; return '<li class="' + (lv === r.level ? 'is-now' : lv < r.level ? 'is-done' : 'is-locked') + '"' + (lv === r.level ? ' aria-current="true"' : '') + (isGate(lv) ? ' data-gate' : '') + '>' + (window.zenEmblem ? '<span class="gr-names-zem" data-zem="' + lv + '"></span>' : '') + '<b>' + lv + '</b> ' + n + '</li>'; }).join('') + '</ol></li>';
    }).join('');
    return '<details class="gr-scale"><summary>Xem thang 103 cấp</summary><div class="gr-scale-wrap"><table><thead><tr><th scope="col">Cảnh giới</th><th scope="col">Cấp</th><th scope="col">Mỗi cấp</th><th scope="col">Tổng tu vi</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="help-copy">Ải đột phá là cấp đầu của mỗi cảnh giới (cấp 10, 20 … 100), tốn chừng ba lần cấp thường; số điểm của ải ghi dưới điểm mỗi cấp. Từ cấp 91, mỗi cấp tốn gấp đôi cấp trước: ' + doublingText() + ' điểm; cấp 100 tốn ' + fmt(levelCost(GOD)) + ' điểm, gần bằng cả chín cấp trước cộng lại. Cấp 100 thành Thần; ba thần cấp sau dẫn tới Thần Vương, mỗi thần cấp ' + fmt(NORMAL[10]) + ' điểm.</p><p class="help-copy gr-pace">Thang dựng theo nhịp ' + paceText() + '.</p>' + (window.zenEmblem ? '<p class="help-copy">Mỗi cấp một huy hiệu riêng: khung dày dần theo cảnh giới, ngọc trên vành sáng thêm theo từng cấp. Huy hiệu chưa đạt còn mờ.</p>' : '') + '<ol class="gr-names-list" aria-label="Danh xưng 103 cấp">' + names + '</ol></details>';
  }
  function extremes(s) {
    const mx = Math.max(...s), mn = Math.min(...s);
    return { top: AXES[s.indexOf(mx)], low: AXES[s.indexOf(mn)], mx, mn };
  }
  const heroName = () => growth()?.name || HEROES[growth()?.hero || 'nam'].title;

  // ---- Biểu đồ mạng nhện (SVG) --------------------------------------------------------------------------------------------
  // v2.23.0 (Liên Mạch): Bát phương đồ là một mạng lưới liên kết năng lực thay cho tám chấm rời.
  //  - Thang tự co giãn: vòng ngoài là số tròn gần nhất trên điểm cao nhất (2, 4, 6, 8, 10, 20 …), không còn nhảy gấp đôi như bậc cũ.
  //  - Bán kính theo căn bậc hai (diện tích tỉ lệ với điểm) và có lõi ở giữa (điểm 0), nên mạch yếu vẫn tách khỏi tâm, thấy được toàn cảnh.
  //    Vòng giữa ghi rõ một phần tư thang để người xem đọc đúng thang không đều.
  //  - Tám chấm nối vòng quanh bằng dải đổi màu giữa hai mạch kề nhau; bên trong là các đường nối chéo giữa mọi cặp mạch,
  //    đậm và dày theo mạch yếu hơn của cặp (hai mạch cùng mạnh thì liên kết mạnh), mạch 0 điểm thì không có đường nối.
  let radarSeq = 0;
  const radarTop = (mx) => {
    if (!(mx > 2)) return 2;
    const p = 10 ** Math.floor(Math.log10(mx));
    return [1, 2, 4, 6, 8, 10].find((n) => n * p >= mx - 1e-9) * p;
  };
  function radar(s, pending, ghost) {
    const CX = 200, CY = 192, R = 112, R0 = 16, add = pending || Array(8).fill(0), id = 'gr-rd' + ++radarSeq;
    const vals = s.map((v, i) => v + add[i] * STEP);
    const top = radarTop(Math.max(...vals, ...(ghost || [])));
    const rad = (v) => R0 + (R - R0) * Math.sqrt(Math.max(0, Math.min(1, v / top)));
    const ang = (i) => ((-90 + i * 45) * Math.PI) / 180;
    const pt = (i, r) => [CX + r * Math.cos(ang(i)), CY + r * Math.sin(ang(i))];
    const f = (n) => n.toFixed(1);
    const poly = (r) => AXES.map((_, i) => pt(i, r).map(f).join(',')).join(' ');
    const rings = '<polygon class="gr-ring gr-ring-core" points="' + poly(R0) + '"/>' + [1, 2, 3, 4].map((k) => '<polygon class="gr-ring' + (k === 4 ? ' gr-ring-outer' : '') + '" points="' + poly(R0 + ((R - R0) * k) / 4) + '"/>').join('');
    const spokes = AXES.map((_, i) => { const [a, b] = pt(i, R0), [x, y] = pt(i, R); return '<line class="gr-spoke" x1="' + f(a) + '" y1="' + f(b) + '" x2="' + f(x) + '" y2="' + f(y) + '"/>'; }).join('');
    const P = vals.map((v, i) => pt(i, rad(v)));
    const web = [];
    for (let i = 0; i < 8; i++) {
      for (let j = i + 2; j < 8; j++) {
        if (i === 0 && j === 7) continue;
        const w = Math.sqrt(Math.min(vals[i], vals[j]) / top);
        if (!(w > 0)) continue;
        web.push('<line class="gr-web" data-pair="' + i + '-' + j + '" x1="' + f(P[i][0]) + '" y1="' + f(P[i][1]) + '" x2="' + f(P[j][0]) + '" y2="' + f(P[j][1]) + '" style="stroke-opacity:' + (0.1 + 0.34 * w).toFixed(2) + ';stroke-width:' + (0.8 + 1.8 * w).toFixed(2) + '"/>');
      }
    }
    const grads = AXES.map((a, i) => { const j = (i + 1) % 8; return '<linearGradient id="' + id + '-' + i + '" gradientUnits="userSpaceOnUse" x1="' + f(P[i][0]) + '" y1="' + f(P[i][1]) + '" x2="' + f(P[j][0]) + '" y2="' + f(P[j][1]) + '"><stop offset="0" stop-color="' + a.color + '"/><stop offset="1" stop-color="' + AXES[j].color + '"/></linearGradient>'; }).join('');
    const links = AXES.map((_, i) => { const j = (i + 1) % 8; return '<line class="gr-link" data-pair="' + i + '-' + j + '" x1="' + f(P[i][0]) + '" y1="' + f(P[i][1]) + '" x2="' + f(P[j][0]) + '" y2="' + f(P[j][1]) + '" stroke="url(#' + id + '-' + i + ')"/>'; }).join('');
    const area = P.map((q) => q.map(f).join(',')).join(' ');
    // v2.60.0: ghost = điểm tám phương ở mốc so sánh, vẽ nét đứt đè lên để thấy phương nào nở ra, phương nào co lại.
    const ghostPoly = ghost ? '<polygon class="gr-ghost" points="' + ghost.map((v, i) => pt(i, rad(v)).map(f).join(',')).join(' ') + '"/>' : '';
    const dots = AXES.map((a, i) => '<circle class="gr-halo" cx="' + f(P[i][0]) + '" cy="' + f(P[i][1]) + '" r="11" style="fill:' + a.color + '"/><circle class="gr-dot" cx="' + f(P[i][0]) + '" cy="' + f(P[i][1]) + '" r="6.5" style="fill:' + a.color + '"/>').join('');
    const labels = AXES.map((a, i) => {
      const [x, y] = pt(i, R + 22), c = Math.cos(ang(i)), sn = Math.sin(ang(i));
      const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
      const dy = sn < -0.5 ? -14 : sn > 0.5 ? 6 : -6;
      return '<text class="gr-label" x="' + f(x) + '" y="' + f(y + dy) + '" text-anchor="' + anchor + '">' + esc(a.name) + '</text><text class="gr-value" x="' + f(x) + '" y="' + f(y + dy + 16) + '" text-anchor="' + anchor + '">' + fmt(vals[i]) + '</text>';
    }).join('');
    // Số của vòng nằm giữa hai nan Đạo tâm và Tài lộc để không đè lên chấm.
    const ringVal = (k, v) => { const r = R0 + ((R - R0) * k) / 4, a = (-67.5 * Math.PI) / 180; return '<text class="gr-ring-val" x="' + f(CX + r * Math.cos(a)) + '" y="' + f(CY + r * Math.sin(a) + 4) + '" text-anchor="middle">' + fmt(v) + '</text>'; };
    const label = 'Bát phương đồ 8 mạch: ' + AXES.map((a, i) => a.name + ' ' + fmt(vals[i])).join(', ') + '. Thang tối đa ' + fmt(top) + ' điểm. Tám mạch nối thành mạng lưới, hai mạch cùng mạnh thì đường nối đậm.' + (ghost ? ' Nét đứt là mốc so sánh: ' + AXES.map((a, i) => a.name + ' ' + fmt(ghost[i])).join(', ') + '.' : '');
    return '<svg class="gr-radar" viewBox="0 0 400 384" role="img" aria-label="' + esc(label) + '"><defs>' + grads + '</defs>' + rings + spokes + '<g class="gr-webs">' + web.join('') + '</g><polygon class="gr-area" points="' + area + '"/>' + ghostPoly + '<g class="gr-links">' + links + '</g><circle class="gr-hub" cx="' + CX + '" cy="' + CY + '" r="3"/>' + dots + labels + ringVal(2, top / 4) + ringVal(4, top) + '</svg>';
  }

  // ---- Trang Điểm tích lũy ------------------------------------------------------------------------------------------------
  let pickHero = 'nam';
  let changing = false;
  let reporting = false; // đang xem báo cáo tiến độ
  let poseMode = 'auto'; // 'auto' hoặc một tư thế cố định
  let poseNow = 'talk';
  let poseTimer = 0;
  let msgIndex = 0;

  const iconSvg = (name, size) => '<svg class="gr-ico" viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + iconPaths[name] + '"/></svg>';

  function pickPanel() {
    const cur = growth();
    const cards = Object.entries(HEROES).map(([id, h]) =>
      '<label class="gr-card' + (pickHero === id ? ' is-on' : '') + '"><input type="radio" name="gr-hero" value="' + id + '"' + (pickHero === id ? ' checked' : '') + ' aria-label="Hiệp khách ' + h.label.toLowerCase() + ': ' + h.title + '"><span class="gr-card-art">' + zenHero.svg(id, 'talk') + '</span><strong>' + h.title + '</strong><small>' + h.desc + '</small></label>').join('');
    return '<section class="panel gr-start" aria-labelledby="gr-pick-title"><h2 id="gr-pick-title">' + (cur ? 'Đổi hiệp khách đồng hành' : 'Chọn hiệp khách đồng hành') + '</h2>' +
      '<p class="help-copy">Hiệp khách sẽ cùng các hạ hành tẩu giang hồ; mỗi việc hoàn thành là thêm một phần công lực. Đổi hiệp khách không làm mất tu vi đã luyện.</p>' +
      '<div class="gr-pick" role="radiogroup" aria-label="Chọn hiệp khách">' + cards + '</div>' +
      '<label class="field gr-name">Danh hiệu giang hồ (không bắt buộc)<input type="text" maxlength="30" data-gr-name placeholder="' + HEROES[pickHero].title + '" value="' + esc(cur?.name || '') + '"></label>' +
      '<div class="gr-start-actions"><button type="button" class="btn primary" data-gr-confirm>' + (cur ? 'Lưu hiệp khách' : 'Bước vào giang hồ') + '</button>' + (cur ? '<button type="button" class="btn" data-gr-cancel>Hủy</button>' : '') + '</div></section>' + axesGuide();
  }
  // v2.59.0: "Tám phương diện vun bồi cuộc sống" — mỗi phương một thẻ có số thứ tự, tên, nhãn phụ và lời mô tả; Nghiệp quả đứng trên cả tám phương.
  function axesGuide() {
    return '<section class="panel gr-guide"><h2>Tám phương diện vun bồi cuộc sống</h2><p class="help-copy">Mỗi phương khởi đầu từ 0. Hoàn thành việc để dồn công lực vào phương vừa bồi bổ. Nối 8 điểm lại thành Bát phương đồ: thấy ngay phương nào thâm hậu, phương nào cần khổ luyện.</p>' +
      '<p class="gr-karma"><strong>' + KARMA.name + '</strong> <small>' + KARMA.sub + '</small> <span>' + KARMA.means + '</span></p><ol class="gr-guide-list">' +
      AXES.slice().sort((x, y) => x.no - y.no).map((a) => '<li style="--c:' + a.color + '"><span class="gr-guide-ico">' + iconSvg('gr-' + a.id, 20) + '</span><div><strong><span class="gr-guide-no" aria-hidden="true">' + a.no + '.</span> ' + a.name + '</strong> <small>' + a.sub + '</small><p>' + a.means + '</p></div></li>').join('') + '</ol></section>';
  }
  function bubbleText(pose, s) {
    const t = earnedTotal(), ex = extremes(s);
    const lines = {
      talk: [t === 0 ? 'Hoàn thành một việc là có phần công lực đầu tiên!' : ex.low.name + ' đang yếu nhất, một việc nhỏ cũng đủ bồi bổ.', t === 0 ? 'Tại hạ xin ra mắt, nguyện cùng các hạ hành tẩu giang hồ.' : ex.top.name + ' là sở trường của các hạ lúc này!', 'Tích tiểu thành đại, mỗi việc xong là một bước tới cảnh giới mới.'],
      martial: ['Kiếm xuất như long! Một nhát, một việc.', 'Luyện kiếm trăm lần, ra tay một lần là xong việc!'],
      taichi: ['Dĩ nhu khắc cương, chậm mà chắc.', 'Khí trầm đan điền, tay mềm, tâm vững.'],
      zen: ['Tĩnh tâm vận khí… hít vào… thở ra.', 'Tọa thiền một khắc cũng là tu luyện.'],
    };
    const list = lines[pose] || lines.talk;
    return list[msgIndex % list.length];
  }
  function stage(s) {
    const g = growth(), r = myRealm();
    const chips = [{ id: 'auto', label: 'Tùy hứng' }, ...zenHero.POSES].map((p) => '<button type="button" class="gr-chip' + (poseMode === p.id ? ' is-on' : '') + '" data-gr-pose="' + p.id + '" aria-pressed="' + (poseMode === p.id) + '">' + p.label + '</button>').join('');
    return '<section class="panel gr-stage" aria-label="Hiệp khách đồng hành"><div class="gr-stage-bg">' + zenHero.scene() + '<p class="gr-bubble" id="gr-bubble" role="status">' + esc(bubbleText(poseNow, s)) + '</p><div class="gr-figure" id="gr-figure">' + zenHero.svg(g.hero, poseNow) + '</div></div>' +
      '<div class="gr-poses" role="group" aria-label="Thế võ của hiệp khách">' + chips + '</div>' +
      realmBlock(r) + '</section>';
  }
  function realmBlock(r) {
    const ahead = r.top ? 'đã đạt Thần Vương, cấp tối cao' : r.held ? 'đã đủ điểm lên cấp ' + (r.level + 1) + ' · còn thiếu chiến tích ở Thần giới' : !r.level ? 'còn ' + fmt(r.need) + ' điểm để nhập cấp 1' : 'còn ' + fmt(r.need) + ' điểm lên cấp ' + (r.level + 1) + (r.breakthrough ? ' · ' + (r.level + 1 === GOD ? 'đột phá thành Thần' : 'đột phá ' + r.next) : '');
    const ladder = REALMS.map((name, i) => '<li class="' + (i + 1 < r.realm ? 'is-done' : i + 1 === r.realm ? 'is-now' : '') + '" title="' + name + '"></li>').join('');
    // v2.32.0 (Huy Hiệu Bách Cấp): huy hiệu riêng của cấp hiện tại nằm bên trái khối cảnh giới; chưa nhập cấp thì để một ô trống nét đứt.
    const Z = window.zenEmblem;
    const badge = !Z ? '' : r.level ? '<span class="gr-emblem" data-level="' + r.level + '" role="img" aria-label="' + esc(Z.label(r.level, r.title)) + '">' + Z.html(r.level) + '</span>' : '<span class="gr-emblem is-empty" aria-hidden="true"></span>';
    return '<div class="gr-realm' + (badge ? ' has-emblem' : '') + '">' + badge + '<div class="gr-realm-top"><span class="gr-realm-name">' + r.name + '</span><span class="gr-rank">' + (r.level ? levelLabel(r.level).replace(/^(.+?)\//, '<b>$1</b>/') + ' · ' + r.title : 'Chưa nhập cấp') + '</span></div>' +
      '<small class="gr-realm-ahead">' + fmt(earnedTotal()) + ' điểm tu vi · ' + ahead + '</small>' +
      '<div class="progress" role="progressbar" aria-label="' + (r.top ? 'Đã đạt cấp ' + LEVEL_MAX : 'Tiến tới cấp ' + (r.level + 1)) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + r.pct + '"><span style="width:' + r.pct + '%"></span></div>' +
      '<ol class="gr-ladder" role="img" aria-label="Cảnh giới ' + r.realm + ' trên ' + REALMS.length + '">' + ladder + '</ol></div>';
  }
  function axisRows(s) {
    const tier = tierOf(Math.max(...s));
    return '<section class="panel gr-axes"><h2>Bát mạch tu vi <small>Thang 0–' + tier + '</small></h2><ul class="gr-axis-list">' +
      AXES.map((a, i) => '<li style="--c:' + a.color + '"><span class="gr-axis-ico">' + iconSvg('gr-' + a.id, 18) + '</span><div class="gr-axis-main"><div class="gr-axis-head"><strong>' + a.name + '</strong><b>' + fmt(s[i]) + '</b></div><div class="progress" aria-hidden="true"><span style="width:' + Math.min(100, (s[i] / tier) * 100).toFixed(1) + '%"></span></div><small>' + a.sub + '</small></div></li>').join('') + '</ul></section>';
  }
  function history() {
    const g = growth(), rows = [...g.log].reverse().slice(0, 12);
    const short = (d) => d.slice(8, 10) + '/' + d.slice(5, 7);
    if (!rows.length) return '<section class="panel gr-history"><h2>Công phu lục</h2><p class="help-copy">Chưa có lần vận công nào. Hoàn thành một việc, bảng vận công sẽ hiện ra trước lời chúc mừng.</p></section>';
    return '<section class="panel gr-history"><h2>Công phu lục <small>12 lần gần nhất</small></h2><ul class="gr-history-list">' + rows.map((e) =>
      '<li><div><strong>' + esc(e.n || SOURCE_LABEL[e.s]) + '</strong><small>' + short(e.d) + ' · ' + SOURCE_LABEL[e.s] + '</small></div><span class="gr-chips">' + e.p.map((v, i) => (v ? '<i style="--c:' + AXES[i].color + '">' + AXES[i].name + ' +' + fmt(v * STEP) + '</i>' : '')).join('') + '</span></li>').join('') + '</ul></section>';
  }
  const dateShort = (d) => d.slice(8, 10) + '/' + d.slice(5, 7) + (d.slice(0, 4) === today().slice(0, 4) ? '' : '/' + d.slice(0, 4));
  function wallet(s) {
    const cell = (id, label, v) => '<div data-wallet="' + id + '"><small>' + label + '</small><b>' + fmt(v) + '</b></div>';
    return '<div class="gr-wallet" role="group" aria-label="Tu vi hiện có, đã tu luyện và đã đổi bảo vật">' + cell('left', 'Tu vi hiện có', total(s)) + cell('earned', 'Đã tu luyện', earnedTotal()) + cell('spent', 'Đã đổi bảo vật', spentTotal()) + '</div>';
  }
  const spendPoints = (e) => e.p.reduce((a, b) => a + b, 0) * STEP;
  const spendChips = (e) => '<span class="gr-chips">' + e.p.map((v, i) => (v ? '<i style="--c:' + AXES[i].color + '">' + AXES[i].name + ' −' + fmt(v * STEP) + '</i>' : '')).join('') + '</span>';
  let spendAll = false;
  function spendPanel() {
    const g = growth(), list = [...(g.spend || [])].reverse(), rows = spendAll ? list : list.slice(0, 10);
    const head = '<h2>Sổ bảo vật <small>' + (list.length ? list.length + ' lần' : 'chưa có lần nào') + '</small></h2>';
    if (!list.length) return '<section class="panel gr-spend" aria-label="Sổ bảo vật">' + head + '<p class="help-copy">Chưa có lần quy đổi nào. Bấm “Đổi bảo vật” để ghi lại món đã mua hoặc quy đổi bằng tu vi; điểm sẽ được trừ khỏi Bát phương đồ.</p></section>';
    const item = (e) => '<li class="gr-spend-item' + (e.x ? ' is-void' : '') + '" data-spend="' + esc(e.id) + '"><div class="gr-spend-main"><div class="gr-spend-title"><strong>' + esc(e.n) + '</strong>' + (e.x ? '<em class="gr-void-tag">Đã hủy</em>' : '') + '</div><small>' + dateShort(e.d) + ' · ' + (e.x ? 'đã hoàn ' : 'trừ ') + fmt(spendPoints(e)) + ' điểm' + (e.note ? ' · ' + esc(e.note) : '') + '</small></div>' + spendChips(e) +
      '<div class="gr-spend-act">' + (e.x
        ? '<button type="button" class="btn" data-gr-spend-restore="' + esc(e.id) + '">Khôi phục</button><button type="button" class="btn" data-gr-spend-del="' + esc(e.id) + '">Xóa hẳn</button>'
        : '<button type="button" class="btn" data-gr-spend-edit="' + esc(e.id) + '">Sửa</button><button type="button" class="btn" data-gr-spend-void="' + esc(e.id) + '">Hủy quy đổi</button>') + '</div></li>';
    return '<section class="panel gr-spend" aria-label="Sổ bảo vật">' + head + '<p class="help-copy">Ghi nhầm? Bấm Sửa để chỉnh lại, hoặc Hủy quy đổi để hoàn tu vi về Bát phương đồ (có thể khôi phục).</p><ul class="gr-spend-list">' + rows.map(item).join('') + '</ul>' +
      (list.length > 10 ? '<button type="button" class="btn" data-gr-spend-more aria-expanded="' + spendAll + '">' + (spendAll ? 'Thu gọn' : 'Xem tất cả ' + list.length + ' lần') + '</button>' : '') + '</section>';
  }
  function page() {
    const g = growth();
    const intro = 'Hoàn thành việc để bồi bổ bát mạch của đời người. Mỗi lần vận công được 0,5 điểm.';
    if (!g) return '<div class="gr-page">' + heading('GIANG HỒ TU LUYỆN', 'Hành tẩu giang hồ', intro) + pickPanel() + '</div>';
    if (changing) return '<div class="gr-page">' + heading('GIANG HỒ TU LUYỆN', 'Hành tẩu giang hồ', intro) + pickPanel() + '</div>';
    if (reporting) return reportPage();
    const s = scores(), r = myRealm(), ex = extremes(s);
    const sub = (r.level ? 'Cấp ' + r.level + ' · ' : '') + r.name + ' · ' + fmt(total(s)) + ' điểm tu vi' + (spentTotal() ? ' hiện có' : '');
    const summary = total(s) === 0
      ? earnedTotal() === 0 ? 'Bát mạch đều ở 0. Hoàn thành một việc để khai mạch.' : 'Tu vi hiện có đang ở 0 sau khi đổi bảo vật. Hoàn thành việc để tu luyện tiếp.'
      : 'Sở trường: <strong>' + ex.top.name + '</strong> (' + fmt(ex.mx) + ') · Cần khổ luyện: <strong>' + ex.low.name + '</strong> (' + fmt(ex.mn) + ')';
    return '<div class="gr-page">' + heading('GIANG HỒ TU LUYỆN', 'Tu vi của ' + esc(heroName()), sub, '<div class="gr-head-actions"><button type="button" class="btn primary" data-gr-spend>Đổi bảo vật</button><button type="button" class="btn" data-gr-report>Xem báo cáo tu luyện</button><button type="button" class="btn" data-gr-change>Đổi hiệp khách</button></div>') +
      (window.zenQueue ? window.zenQueue.card() : '') + '<div class="gr-grid">' + stage(s) + '<section class="panel gr-radar-panel" aria-label="Bát phương đồ nội lực"><h2>Bát phương đồ</h2><div class="gr-radar-wrap" id="gr-radar">' + radar(s) + '</div><p class="gr-summary">' + summary + '</p>' + wallet(s) + (window.zenStore ? '<p class="gr-store-go"><button type="button" class="btn" data-gr-store-go>Ghé Tàng Bảo Các</button></p>' : '') + '</section></div>' +
      (window.zenStory ? window.zenStory.panel() : '') + (window.zenGods ? window.zenGods.panel() : '') /* v2.13.0 Thần giới */ + (window.zenAch ? window.zenAch.panel() : '') /* v1.99.0 Bảng vàng */ + axisRows(s) + history() + (window.zenStore ? window.zenStore.panel() : '') /* v2.34.0 Tàng Bảo Các */ + spendPanel() + '<section class="panel gr-how"><h2>Tâm pháp tu luyện</h2><ul class="gr-how-list"><li>Mỗi việc hoàn thành cho các hạ <strong>2 lần vận công</strong> (1 điểm). Bảng vận công hiện ra trước lời chúc mừng.</li><li>Mỗi lần bấm <strong>+</strong> dồn 0,5 điểm vào mạch đã chọn; dồn cả hai lần vào một mạch cũng được.</li><li>Mỗi việc chỉ được vận công một lần.</li><li>Bấm <strong>Đổi bảo vật</strong> để ghi lại món đã mua hoặc quy đổi; tu vi bị trừ khỏi Bát phương đồ. Ghi nhầm thì sửa hoặc hủy quy đổi để hoàn điểm. Cấp và cảnh giới tính theo tổng tu vi đã luyện nên không tụt khi đổi bảo vật.</li><li><strong>100 cấp</strong> chia 10 cảnh giới, mỗi cấp một danh xưng. Cảnh giới sau tốn chừng gấp đôi cảnh giới trước: 0,5 điểm mỗi cấp ở Sơ nhập giang hồ, 1 điểm ở Tam lưu cao thủ… 170,5 điểm ở Thiên nhân hợp nhất.</li><li>Cấp 10, 20 … 90 là <strong>ải đột phá</strong> sang cảnh giới mới, tốn chừng ba lần cấp thường.</li><li><strong>Nhịp chuẩn</strong> của thang: ' + paceText() + '.</li><li>Từ cấp 91, <strong>mỗi cấp tốn gấp đôi cấp trước</strong>: ' + doublingText() + ' điểm ở cấp 99. Cấp 100 là ải nặng nhất: ' + fmt(levelCost(GOD)) + ' điểm, gần bằng cả chín cấp trước cộng lại. Đủ ' + fmt(LEVEL_AT[GOD]) + ' điểm thì đột phá thành Thần. Trên Thần còn 3 thần cấp tới <strong>Thần Vương</strong>, mỗi thần cấp ' + fmt(NORMAL[10]) + ' điểm.</li><li>Từ cấp 100, <strong>đủ điểm chưa đủ để lên cấp</strong>: còn phải lĩnh ngộ tám quy luật tự nhiên (điểm đã tích lũy của tám chỉ số) và thắng các vị thần đang giữ ngôi. Xem khung Thần giới.</li></ul>' + scaleTable(r) + '</section></div>';
  }

  // ---- Hoạt họa nhân vật --------------------------------------------------------------------------------------------------
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // v1.83.0: chỉ vẽ lại nhân vật khi đổi tư thế hoặc đổi nhân vật (hoạt họa đang chạy không bị ngắt mỗi lần đổi lời thoại);
  // hình mới hiện dần đè lên hình cũ đang mờ đi. Hình mới đứng trước trong DOM nên '#gr-figure svg.gr-hero' luôn là hình hiện tại.
  function paintFigure() {
    const g = growth(), fig = document.querySelector('#gr-figure');
    if (!g || !fig || view !== 'growth') return;
    const cur = fig.querySelector('svg.gr-hero:not(.is-leave)');
    if (!cur || cur.dataset.pose !== poseNow || cur.dataset.hero !== g.hero) {
      const tpl = document.createElement('template');
      tpl.innerHTML = zenHero.svg(g.hero, poseNow);
      const next = tpl.content.firstElementChild;
      fig.querySelectorAll('svg.is-leave').forEach((n) => n.remove());
      if (cur && !reduced()) {
        next.classList.add('is-enter');
        cur.classList.add('is-leave');
        cur.setAttribute('aria-hidden', 'true');
        cur.removeAttribute('role');
        setTimeout(() => cur.remove(), 450);
      } else if (cur) cur.remove();
      fig.prepend(next);
    }
    const bubble = document.querySelector('#gr-bubble');
    const text = bubbleText(poseNow, scores());
    if (bubble && bubble.textContent !== text) {
      bubble.textContent = text;
      if (!reduced()) {
        bubble.classList.remove('is-new');
        void bubble.offsetWidth;
        bubble.classList.add('is-new');
      }
    }
  }
  function stopTimer() {
    clearTimeout(poseTimer);
    poseTimer = 0;
  }
  function tick() {
    poseTimer = 0;
    if (view !== 'growth' || !growth() || changing || reporting) return;
    if (!document.hidden && !document.querySelector('dialog[open]')) {
      msgIndex++;
      if (poseMode === 'auto' && !reduced()) {
        const ids = zenHero.POSES.map((p) => p.id);
        if (msgIndex % 2 === 0) poseNow = ids[(ids.indexOf(poseNow) + 1) % ids.length];
      }
      paintFigure();
    }
    poseTimer = setTimeout(tick, 4500);
  }
  function startTimer() {
    if (poseTimer || !growth() || changing || reporting) return;
    poseTimer = setTimeout(tick, 4500);
  }

  // v2.22.0 (Sinh Khí): mắt và đầu hiệp khách nhìn theo con trỏ (chuột, bút; không áp cho cảm ứng); chạm vào nhân vật thì nhảy chào.
  // Mã chỉ đặt hai biến CSS --gr-gx, --gr-gy (từ −1 đến 1) trên khung #gr-figure, mọi chuyển động nằm trong growth.css.
  // Giảm chuyển động thì không làm gì cả.
  let lookRaf = 0, lookX = 0, lookY = 0;
  const lookSet = (nx, ny) => {
    const fig = document.querySelector('#gr-figure');
    if (!fig) return;
    fig.style.setProperty('--gr-gx', nx.toFixed(3));
    fig.style.setProperty('--gr-gy', ny.toFixed(3));
  };
  document.addEventListener('pointermove', (e) => {
    if (view !== 'growth' || e.pointerType === 'touch' || reduced()) return;
    lookX = e.clientX;
    lookY = e.clientY;
    if (lookRaf) return;
    lookRaf = requestAnimationFrame(() => {
      lookRaf = 0;
      const fig = document.querySelector('#gr-figure');
      if (!fig) return;
      const r = fig.getBoundingClientRect(), clamp = (v) => Math.max(-1, Math.min(1, v));
      lookSet(clamp((lookX - (r.left + r.width / 2)) / Math.max(160, r.width)), clamp((lookY - (r.top + r.height * 0.36)) / Math.max(160, r.height)));
    });
  }, { passive: true });
  // Con trỏ rời cửa sổ hoặc cửa sổ mất tiêu điểm: mắt trở về giữa.
  document.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget) lookSet(0, 0);
  });
  window.addEventListener('blur', () => lookSet(0, 0));
  document.addEventListener('click', (e) => {
    const fig = e.target.closest?.('#gr-figure');
    if (!fig || reduced() || fig.classList.contains('is-hop')) return;
    fig.classList.add('is-hop');
    const done = (ev) => {
      if (ev && ev.target !== fig) return;
      fig.classList.remove('is-hop');
      fig.removeEventListener('animationend', done);
    };
    fig.addEventListener('animationend', done);
    setTimeout(done, 1100);
  });

  // ---- Điều hướng ---------------------------------------------------------------------------------------------------------
  function addNav() {
    const anchor = document.querySelector('.sidebar [data-view="budget"]');
    let b = document.querySelector('.sidebar [data-view="growth"]');
    if (!b) {
      b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav';
      b.dataset.view = 'growth';
      b.innerHTML = '<span>' + svgIcon('growth') + '</span>Điểm tích lũy';
    }
    if (anchor && anchor.previousElementSibling !== b) anchor.before(b);
    b.classList.toggle('active', view === 'growth');
  }
  const baseRender = render;
  render = function () {
    baseRender();
    addNav();
    if (view !== 'growth') {
      stopTimer();
      changing = false;
      reporting = false;
      return;
    }
    if (reporting) stopTimer();
    if (growth() && !document.querySelector('#gr-figure')) poseNow = poseMode === 'auto' ? 'talk' : poseMode;
    $('#crumb').textContent = 'Điểm tích lũy';
    $('#main').innerHTML = page();
    startTimer();
  };

  // ---- Bảng cộng điểm khi hoàn thành việc ---------------------------------------------------------------------------------
  let award = null;
  function awardColumns() {
    const s = scores();
    const tier = tierOf(Math.max(...s.map((v, i) => v + award.add[i] * STEP), 1));
    return AXES.map((a, i) => {
      const cur = s[i], extra = award.add[i] * STEP;
      return '<div class="gr-col" style="--c:' + a.color + '"><span class="gr-col-val">' + fmt(cur + extra) + (extra ? '<em>+' + fmt(extra) + '</em>' : '') + '</span>' +
        '<div class="gr-bar" aria-hidden="true"><i class="gr-bar-now" style="height:' + ((cur / tier) * 100).toFixed(1) + '%"></i><i class="gr-bar-add" style="height:' + ((extra / tier) * 100).toFixed(1) + '%;bottom:' + ((cur / tier) * 100).toFixed(1) + '%"></i></div>' +
        '<button type="button" class="gr-plus" data-gr-plus="' + i + '" aria-label="Dồn 0,5 điểm vào ' + a.name + '"' + (award.spent >= award.steps ? ' disabled' : '') + '>' + iconSvg('gr-' + a.id, 18) + '<b aria-hidden="true">+</b></button>' +
        '<span class="gr-col-name">' + a.name + '</span></div>';
    }).join('');
  }
  function paintAward() {
    if (!award) return;
    const left = award.steps - award.spent;
    award.el.querySelector('.gr-cols').innerHTML = awardColumns();
    award.el.querySelector('.gr-budget').innerHTML = left ? 'Còn <b>' + left + '</b> lần vận công · mỗi lần +' + fmt(STEP) + ' điểm' : 'Đã dồn đủ <b>' + fmt(award.steps * STEP) + '</b> điểm. Bấm Lưu công lực để ghi nhận.';
    award.el.querySelector('[data-gr-save]').disabled = award.spent === 0;
    award.el.querySelector('[data-gr-undo]').disabled = award.spent === 0;
    const live = award.el.querySelector('.gr-live');
    live.textContent = award.last == null ? '' : AXES[award.last].name + ': ' + fmt(scores()[award.last] + award.add[award.last] * STEP) + ' điểm';
  }
  function closeAward(commit) {
    const a = award;
    if (!a) return;
    let toastText = '';
    let crossing = null;
    let breakthroughTo = null;
    let emblemTo = null;
    if (commit && a.spent > 0) {
      const entry = { id: uid(), d: today(), s: a.source, k: a.key, n: String(a.title || '').slice(0, 120), p: a.add.slice() };
      if (!a.key) delete entry.k;
      if (!entry.n) delete entry.n;
      const t0 = earnedTotal(), s0 = earnedScores(), before = realmOf(t0, s0);
      if (!wfSave(() => { data.growth.log.push(entry); data.growth.spend ||= []; compact(); if (a.source === 'task') window.zenQueue?.clear(a.key); })) return notify('Chưa lưu được điểm. Hãy thử lại.');
      const t1 = earnedTotal(), s1 = earnedScores(), after = realmOf(t1, s1);
      crossing = [before.level, after.level, t0, t1, s0, s1];
      // Thông báo điểm nghiệp (bật mặc định, tắt ở Cài đặt → Thông báo): lên cấp, đột phá cảnh giới mới; với việc hằng ngày còn báo số điểm vừa cộng.
      if (growth()?.notify !== false) {
        const parts = [];
        if (a.source !== 'task') parts.push('Đã dồn ' + fmt(a.spent * STEP) + ' điểm công lực vào Điểm tích lũy.');
        if (after.realm !== before.realm) parts.push('Chúc mừng! ' + heroName() + ' đã đột phá, đạt cảnh giới ' + after.name + ' (cấp ' + after.level + ').');
        // v1.97.0 (Ấn Son): đột phá sang cảnh giới mới (từ Tam lưu cao thủ, cấp 10 trở lên) thì mở thêm nghi thức Đột phá
        // (giangho-fx.js); câu chúc vẫn ở thông báo. Bước vào Sơ nhập giang hồ ở điểm đầu tiên là khởi đầu, không phải đột phá.
        if (after.realm !== before.realm && after.realm >= 2 && window.zenFx?.breakthrough) breakthroughTo = after;
        else if (after.level > before.level) {
          parts.push('Chúc mừng! ' + heroName() + ' lên cấp ' + after.level + ' · ' + after.title + ' (' + after.name + ').');
          // v2.32.0 (Huy Hiệu Bách Cấp): lên cấp thường thì hiện thẻ huy hiệu mới của cấp vừa đạt (đột phá đã có huy hiệu trong nghi thức).
          emblemTo = [after.level, after.title, after.level - before.level > 1 ? 'vượt ' + (after.level - before.level) + ' cấp' : ''];
        }
        toastText = parts.join(' ');
      }
    }
    award = null;
    a.el.close();
    a.el.remove();
    if (view === 'growth') render();
    if (typeof a.then === 'function') a.then();
    if (toastText) notify(toastText);
    window.zenFx?.rank();
    if (emblemTo) emblemWhenFree(...emblemTo);
    // v1.92.0: vượt mốc 5 cấp thì mở chương truyện ký tương ứng (growth-story.js); v1.97.0: sau nghi thức Đột phá nếu có.
    // v2.12.0: chương giữa cấp mở theo tu vi, nên báo cả khi chưa lên cấp.
    const story = () => crossing && crossing[3] > crossing[2] && window.zenStory?.crossed(...crossing);
    if (breakthroughTo) window.zenFx.breakthrough(breakthroughTo, story);
    else story();
  }
  // v2.32.0: thẻ huy hiệu mới chỉ hiện khi người dùng nhìn thấy được (chờ hộp thoại như chương truyện đóng, tối đa ~24 giây).
  function emblemWhenFree(level, title, more, tries = 0) {
    if (!window.zenEmblem?.pop) return;
    if (tries < 60 && document.querySelector('dialog[open]')) return setTimeout(() => emblemWhenFree(level, title, more, tries + 1), 400);
    window.zenEmblem.pop(level, title, more);
  }
  // Giữ sổ cái trong giới hạn: gộp các dòng cũ nhất thành các dòng "tổng hợp" (v2.47.0: vẫn giữ mã của việc đã cộng điểm).
  // Mã chống cộng trùng của việc ("task:<id>") của các dòng bị gộp được đóng gói vào trường k của dòng tổng hợp dưới dạng danh sách id cách nhau
  // bằng dấu cách (bỏ tiền tố "task:" cho gọn), mỗi dòng ≤ 120 ký tự, đúng giới hạn sẵn có của k nên không đổi dạng dữ liệu. Điểm của từng dòng
  // gộp được cộng đúng vào dòng tổng hợp chứa mã của nó nên tổng điểm mỗi chỉ số không đổi. Việc cũ làm lại sẽ không được cộng điểm lần nữa.
  // Nếu sau khi đóng gói sổ vẫn quá dài, gộp bớt các dòng tổng hợp CŨ NHẤT thành một dòng không mã (bỏ mã của việc xưa nhất trước): ưu tiên luôn
  // lưu được điểm mới, còn mã của các việc gần đây vẫn giữ.
  const KEY_MAX = 120;
  const TASK_ID = /^[A-Za-z0-9_-]{1,100}$/;
  const archivedIds = (e) => (e.k ? e.k.split(' ').filter(Boolean) : []);
  const isScored = (g, key) => g.log.some((e) => e.k === key || (e.s === 'archive' && key.startsWith('task:') && archivedIds(e).includes(key.slice(5))));
  function compact() {
    const g = data.growth;
    if (g.log.length <= LOG_MAX - 100) return;
    const old = g.log.splice(0, 500);
    const sum = (list) => {
      const p = Array(8).fill(0);
      list.forEach((e) => e.p.forEach((v, i) => (p[i] += v)));
      return p;
    };
    const makeEntry = (list, ids) => {
      const entry = { id: 'a' + uid().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24), d: list.at(-1).d, s: 'archive', n: 'Tổng hợp ' + list.length + ' lần cộng', p: sum(list) };
      if (ids.length) entry.k = ids.join(' ');
      return entry;
    };
    const packed = [];
    let list = [], ids = [], used = 0;
    const flush = () => {
      if (list.length) packed.push({ list, entry: makeEntry(list, ids) });
      list = [];
      ids = [];
      used = 0;
    };
    for (const e of old) {
      const own = (e.s === 'archive' ? archivedIds(e) : e.k && e.k.startsWith('task:') ? [e.k.slice(5)] : []).filter((id) => TASK_ID.test(id));
      const need = own.reduce((n, id) => n + id.length + 1, 0);
      if (list.length && used + need > KEY_MAX + 1) flush();
      list.push(e);
      ids.push(...own);
      used += need;
    }
    flush();
    // Quá dài: gộp các dòng tổng hợp cũ nhất (đầu danh sách) thành một dòng không mã, vừa đủ để sổ còn chỗ lưu điểm mới.
    const over = g.log.length + packed.length - (LOG_MAX - 300);
    if (over > 0) {
      const head = packed.splice(0, Math.min(over + 1, packed.length));
      packed.unshift({ entry: makeEntry(head.flatMap((x) => x.list), []) });
    }
    g.log.unshift(...packed.map((x) => x.entry));
  }
  // v2.67.0 (Tích Công): bấm Để sau (hoặc Esc) ở bảng của một việc thì việc không mất điểm: vào hàng chờ vận công (growth-queue.js).
  function deferAward(how) {
    if (award && award.source === 'task' && award.key) window.zenQueue?.defer(award.key.slice(5), award.title, award.queued, how);
  }
  function openAward(opt) {
    if (award) {
      deferAward('auto');
      closeAward(false);
    }
    // v2.66.0 (Gieo Nhân): việc đã gieo nhân cho một phương thì công lực dồn sẵn vào phương ấy; người dùng chỉ cần bấm Lưu (hoặc Hoàn tác để dồn chỗ khác).
    const pre = opt.axis ? AXES.findIndex((x) => x.id === opt.axis) : -1;
    const d = document.createElement('dialog');
    d.id = 'growth-award';
    d.className = 'gr-award';
    d.setAttribute('aria-labelledby', 'gr-award-title');
    d.innerHTML = '<form method="dialog" class="gr-award-form"><header><span class="eyebrow">GIANG HỒ TU LUYỆN</span><h2 id="gr-award-title">Vận công bồi bổ</h2><p class="help-copy">' + (opt.lead ? esc(opt.lead) + ' ' : opt.title ? 'Các hạ vừa hoàn thành “' + esc(opt.title) + '”. ' : '') + (opt.intro || 'Chọn mạch muốn dồn công lực.') + '</p>' + (pre >= 0 ? '<p class="help-copy gr-sown">Nhiệm vụ này đã gieo nhân cho <strong>' + AXES[pre].name + '</strong>, nên công lực đã dồn sẵn vào phương ấy. Bấm Lưu công lực để ghi nhận, hoặc bấm Hoàn tác hai lần để dồn sang phương khác.</p>' : '') + '</header>' +
      '<p class="gr-budget" aria-live="polite"></p><div class="gr-cols" role="group" aria-label="Bát mạch"></div><p class="gr-live sr-only" role="status" aria-live="polite"></p>' +
      '<footer class="gr-award-foot"><button type="button" class="btn ghost" data-gr-undo>Hoàn tác</button><span class="gr-grow"></span><button type="button" class="btn" data-gr-skip>Để sau</button><button type="button" class="btn primary" data-gr-save>Lưu công lực</button></footer></form>';
    document.body.append(d);
    award = { source: opt.source, key: opt.key, title: opt.title, steps: opt.steps, spent: 0, add: Array(8).fill(0), stack: [], last: null, el: d, then: opt.then, queued: !!opt.queued };
    if (pre >= 0) {
      award.add[pre] = opt.steps;
      award.spent = opt.steps;
      award.stack = Array(opt.steps).fill(pre);
      award.last = pre;
    }
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      deferAward('esc');
      closeAward(false);
    });
    paintAward();
    d.showModal();
    (pre >= 0 ? d.querySelector('[data-gr-save]') : d.querySelector('.gr-plus'))?.focus(); // đã dồn sẵn thì các nút + đã khóa, tiêu điểm vào nút Lưu
  }

  // Việc vừa hoàn thành: completionKindFor() luôn được gọi ngay trước celebrateCompletion() nên dùng nó để biết đó là việc nào.
  let lastDone = null;
  const baseKind = completionKindFor;
  completionKindFor = function (p, t) {
    lastDone = t ? { id: t.id, title: t.title, at: Date.now() } : null;
    return baseKind.apply(this, arguments);
  };
  const baseCelebrate = celebrateCompletion;
  celebrateCompletion = function (kind = 'check') {
    const ctx = lastDone;
    lastDone = null;
    const args = arguments;
    const task = ctx && kind !== 'check' ? data.projects.flatMap((p) => p.tasks).find((t) => t.id === ctx.id) : null;
    const g = growth();
    if (!g || contentReadOnly || !task || task.col !== 'Done' || Date.now() - ctx.at > 3000 || isScored(g, 'task:' + task.id)) return baseCelebrate.apply(this, args);
    if (window.zenQueue?.batch(task)) return baseCelebrate.apply(this, args);
    openAward({ source: 'task', key: 'task:' + task.id, title: task.title, steps: TASK_STEPS, axis: task.axis, then: () => baseCelebrate.apply(window, args) });
  };
  // Việc hằng ngày vừa đủ chuỗi 7, 14, 21… ngày liền (habits.js gọi sau khi tích): hỏi điểm một lần cho mỗi việc mỗi ngày.
  function habitStreak(h, n) {
    const g = growth(), key = ('habit:' + h.id + ':' + today()).slice(0, 120);
    if (!g || contentReadOnly || isScored(g, key)) return;
    setTimeout(() => {
      if (award || !growth() || isScored(growth(), key)) return;
      openAward({ source: 'habit', key, title: h.name + ' · ' + n + ' ngày liền', lead: 'Hảo công phu! “' + h.name + '” đã khổ luyện đủ ' + n + ' ngày liền.', steps: HABIT_STEPS });
    }, 600);
  }

  // ---- Báo cáo tiến độ ----------------------------------------------------------------------------------------------------
  const DAY_MS = 864e5;
  const dayShift = (d, n) => new Date(new Date(d + 'T12:00:00Z').getTime() + n * DAY_MS).toISOString().slice(0, 10);
  const daysAgo = (t, d) => Math.round((new Date(t + 'T12:00:00Z') - new Date(d + 'T12:00:00Z')) / DAY_MS);
  const fmt1 = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
  const realLog = (g) => g.log.filter((e) => e.s !== 'archive');
  function windowSums(g, t) {
    const last = Array(8).fill(0), prev = Array(8).fill(0);
    for (const e of realLog(g)) {
      const ago = daysAgo(t, e.d), bucket = ago >= 0 && ago < 7 ? last : ago >= 7 && ago < 14 ? prev : null;
      if (bucket) e.p.forEach((v, i) => (bucket[i] += v * STEP));
    }
    return { last, prev };
  }
  // Số ngày liên tiếp (tính tới hôm nay, hoặc hôm qua nếu hôm nay chưa có) có ít nhất một lần cộng điểm.
  function activeStreak(g, t) {
    const days = new Set(realLog(g).map((e) => e.d));
    let d = days.has(t) ? t : dayShift(t, -1), n = 0;
    while (days.has(d)) {
      n++;
      d = dayShift(d, -1);
    }
    return n;
  }
  function levelOf(v, mean) {
    if (v <= 0) return { id: 'none', label: 'Chưa khai mạch' };
    if (v >= mean * 1.25) return { id: 'high', label: 'Thâm hậu' };
    if (v >= mean * 0.75) return { id: 'mid', label: 'Vững vàng' };
    return { id: 'low', label: 'Cần khổ luyện' };
  }
  // Độ cân bằng 0–100: 100 khi 8 chỉ số bằng nhau; càng lệch càng thấp (độ lệch chuẩn so với trung bình).
  function balanceOf(s) {
    const mean = total(s) / 8;
    if (!mean) return { pct: 0, label: '' };
    const sd = Math.sqrt(s.reduce((a, v) => a + (v - mean) ** 2, 0) / 8), pct = Math.max(0, Math.round((1 - sd / mean) * 100));
    return { pct, label: pct >= 75 ? 'Âm dương điều hòa' : pct >= 45 ? 'Hơi thiên lệch' : 'Thiên lệch rõ' };
  }
  function buildReport(t) {
    t = t || today();
    const g = growth(), s = scores(), tot = total(s), mean = tot / 8, w = windowSums(g, t), earned = earnedTotal();
    return {
      t, scores: s, total: tot, earned, spent: spentTotal(), mean, realm: realmOf(earned, earnedScores()), extremes: extremes(s), balance: balanceOf(s), entries: realLog(g).length,
      week: { last: total(w.last), prev: total(w.prev), byAxis: w.last }, streak: activeStreak(g, t),
      rows: AXES.map((a, i) => ({ axis: a, score: s[i], level: levelOf(s[i], mean) })),
      weak: AXES.map((_, i) => i).sort((x, y) => s[x] - s[y] || x - y).slice(0, 3),
    };
  }
  function tipsOf(rep) {
    const tips = [];
    if (rep.earned === 0) {
      tips.push({ kind: 'start', title: 'Khởi bước từ việc nhỏ', text: 'Hoàn thành một việc bất kỳ rồi dồn 1 điểm vào mạch vừa bồi bổ. Chỉ cần vài việc là Bát phương đồ bắt đầu thành hình.', ideas: ['Ghi lại một khoản chi hôm nay (Tài lộc)', 'Nhắn hỏi thăm một người thân (Nhân duyên)', 'Đi bộ 10 phút (Thân thể)'] });
      return tips;
    }
    const { last, prev } = rep.week;
    if (last === 0) tips.push({ kind: 'trend', title: 'Tuần này chưa vận công', text: '7 ngày qua chưa có lần vận công nào' + (prev ? ' (7 ngày trước: ' + fmt(prev) + ' điểm)' : '') + '. Chọn việc nhỏ nhất và hoàn thành nó để giữ đà.' });
    else if (last > prev) tips.push({ kind: 'trend', title: 'Công lực đang tăng', text: '7 ngày qua các hạ luyện được ' + fmt(last) + ' điểm, nhiều hơn 7 ngày trước (' + fmt(prev) + ' điểm). Hãy giữ nhịp này.' });
    else if (last < prev) tips.push({ kind: 'trend', title: 'Công lực chững lại', text: '7 ngày qua các hạ luyện được ' + fmt(last) + ' điểm, ít hơn 7 ngày trước (' + fmt(prev) + ' điểm). Một việc nhỏ mỗi ngày là đủ để lấy lại nhịp.' });
    else tips.push({ kind: 'trend', title: 'Công lực đều đặn', text: '7 ngày qua các hạ luyện được ' + fmt(last) + ' điểm, bằng 7 ngày trước.' });
    const ex = rep.extremes;
    if (rep.total > 0 && rep.balance.pct < 45) tips.push({ kind: 'balance', title: 'Điều hòa âm dương', text: 'Công lực đang dồn vào ' + ex.top.name + ' (' + fmt(ex.mx) + ') trong khi ' + ex.low.name + ' mới ' + fmt(ex.mn) + '. Trong 3 việc kế tiếp, thử dành ít nhất 1 lần vận công cho ' + ex.low.name + '.' });
    if (rep.realm.next && rep.realm.needRealm <= 5) tips.push({ kind: 'realm', title: 'Sắp đột phá cảnh giới', text: 'Còn ' + fmt(rep.realm.needRealm) + ' điểm nữa là tới ' + rep.realm.next + '.' });
    rep.weak.forEach((i) => {
      const a = AXES[i], v = rep.scores[i];
      tips.push({ kind: 'weak', axis: a.id, color: a.color, title: 'Bồi bổ ' + a.name, text: a.means + ' Hiện ' + fmt(v) + ' điểm' + (v < rep.mean ? ', thấp hơn mức trung bình ' + fmt1(rep.mean) + '.' : '.'), ideas: a.ideas.slice(0, 3) });
    });
    return tips;
  }
  function tipCard(t) {
    return '<article class="gr-tip" data-tip="' + t.kind + '"' + (t.axis ? ' data-axis="' + t.axis + '" style="--c:' + t.color + '"' : '') + '><h3>' + esc(t.title) + '</h3><p>' + esc(t.text) + '</p>' +
      (t.ideas ? '<ul>' + t.ideas.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') + '</article>';
  }
  // ---- Lịch sử biến chuyển Bát phương đồ (v2.60.0) ------------------------------------------------------------------------
  // Xem Bát phương đồ nay so với hôm qua / 1 tháng trước / 3 tháng trước: mỗi phương tăng hay giảm bao nhiêu, nhờ việc nào (các lần vận công
  // trong sổ cái) và vì đâu (các lần đổi bảo vật chưa hủy). Chỉ đọc sổ cái, không ghi gì.
  const HIST = [{ id: 0, label: 'Hôm nay', days: 1 }, { id: 1, label: '1 tháng trước', days: 30 }, { id: 3, label: '3 tháng trước', days: 90 }];
  let histSel = 1;
  // Điểm từng phương hết ngày d: các lần cộng có ngày ≤ d trừ các lần quy đổi (chưa hủy) có ngày ≤ d, không âm (cùng cách tính với scores()).
  function scoresAt(g, d) {
    const a = Array(8).fill(0), sp = Array(8).fill(0);
    for (const e of g.log) if (e.d <= d) e.p.forEach((v, i) => (a[i] += v));
    for (const e of activeSpend(g)) if (e.d <= d) e.p.forEach((v, i) => (sp[i] += v));
    return a.map((v, i) => Math.max(0, v - sp[i]) * STEP);
  }
  // Các việc làm điểm từng phương tăng (lần vận công) và giảm (lần đổi bảo vật) trong khoảng (from, to], nhiều điểm nhất lên trước.
  function movesBetween(g, from, to) {
    const up = AXES.map(() => []), down = AXES.map(() => []);
    const by = (x, y) => y.pts - x.pts || (x.d < y.d ? 1 : x.d > y.d ? -1 : 0);
    for (const e of g.log) if (e.d > from && e.d <= to) e.p.forEach((v, i) => v && up[i].push({ n: e.n || SOURCE_LABEL[e.s], pts: v * STEP, d: e.d }));
    for (const e of activeSpend(g)) if (e.d > from && e.d <= to) e.p.forEach((v, i) => v && down[i].push({ n: e.n, pts: v * STEP, d: e.d }));
    return { up: up.map((l) => l.sort(by)), down: down.map((l) => l.sort(by)) };
  }
  const signed = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v));
  const dayLabel = (d, t) => d.slice(8, 10) + '/' + d.slice(5, 7) + (d.slice(0, 4) === t.slice(0, 4) ? '' : '/' + d.slice(0, 4));
  function historyPanel(t) {
    const g = growth(), now = scores(), h = HIST.find((x) => x.id === histSel) || HIST[1], from = dayShift(t, -h.days);
    const then = scoresAt(g, from), mv = movesBetween(g, from, t), dm = now.map((v, i) => v - then[i]);
    const tabs = '<div class="gr-hist-tabs" role="group" aria-label="Chọn mốc so sánh">' + HIST.map((x) => '<button type="button" class="gr-chip' + (x.id === h.id ? ' is-on' : '') + '" data-gr-hist="' + x.id + '" aria-pressed="' + (x.id === h.id) + '">' + x.label + '</button>').join('') + '</div>';
    const rise = dm.filter((v) => v > 0).length, fall = dm.filter((v) => v < 0).length, net = total(now) - total(then);
    const best = dm.indexOf(Math.max(...dm)), still = AXES.filter((_, i) => dm[i] === 0).map((a) => a.name);
    const quiet = !mv.up.some((l) => l.length) && !mv.down.some((l) => l.length);
    const sum = quiet
      ? 'Từ ' + dayLabel(from, t) + ' đến nay chưa có lần vận công hay đổi bảo vật nào, Bát phương đồ đứng yên.'
      : 'Từ ' + dayLabel(from, t) + ' đến nay, tu vi hiện có <strong>' + signed(net) + '</strong> điểm: ' + rise + ' phương tăng, ' + fall + ' phương giảm' +
        (dm[best] > 0 ? '. Tiến nhiều nhất: <strong>' + AXES[best].name + '</strong> (' + signed(dm[best]) + ')' : '') + (still.length && still.length < 8 ? '. Đứng yên: ' + still.join(', ') : '') + '.';
    const none = total(then) === 0 ? '<p class="help-copy gr-hist-note">Ở mốc này chưa có điểm nào: mọi điểm hiện có là tích lũy từ đó đến nay.</p>' : '';
    const list = (arr, sign) => arr.slice(0, 2).map((x) => esc(x.n) + ' ' + sign + fmt(x.pts)).join('; ') + (arr.length > 2 ? '; và ' + (arr.length - 2) + ' việc khác' : '');
    const rows = AXES.map((a, i) => {
      const d = dm[i], cls = d > 0 ? 'up' : d < 0 ? 'down' : 'flat', up = mv.up[i], down = mv.down[i];
      const why = [up.length ? '<span class="gr-why-up">Tăng nhờ: ' + list(up, '+') + '</span>' : '', down.length ? '<span class="gr-why-down">Giảm vì đổi: ' + list(down, '−') + '</span>' : ''].filter(Boolean).join(' ') || '<span class="gr-why-none">Không có biến động</span>';
      return '<li class="gr-hist-row is-' + cls + '" data-axis="' + a.id + '" style="--c:' + a.color + '"><span class="gr-axis-ico">' + iconSvg('gr-' + a.id, 18) + '</span><div class="gr-hist-main"><div class="gr-axis-head"><strong>' + a.name + '</strong><span class="gr-hist-nums"><span class="gr-hist-then">' + fmt(then[i]) + '</span> → <b>' + fmt(now[i]) + '</b></span><em class="gr-delta">' + (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '■ ') + signed(d) + '</em></div><small>' + why + '</small></div></li>';
    }).join('');
    return '<section class="panel gr-hist" aria-label="Lịch sử biến chuyển Bát phương đồ"><h2>Lịch sử biến chuyển Bát phương đồ</h2>' + tabs +
      '<div class="gr-hist-grid"><div class="gr-hist-radar"><div class="gr-radar-wrap">' + radar(now, null, then) + '</div><p class="gr-legend"><span class="gr-key-now"></span>Hôm nay <span class="gr-key-then"></span>Ngày ' + dayLabel(from, t) + '</p></div>' +
      '<div class="gr-hist-body"><p class="gr-hist-sum" role="status">' + sum + '</p>' + none + '<ul class="gr-hist-list">' + rows + '</ul></div></div>' +
      '<p class="help-copy">Mốc so sánh là điểm cuối ngày được chọn. Tăng tính theo các lần vận công trong sổ; giảm tính theo các lần đổi bảo vật chưa hủy.</p></section>';
  }
  // ---- Sở trường và khiếm khuyết (v2.61.0) ---------------------------------------------------------------------------------
  // Dựa trên mức trung bình của tám phương (cùng ngưỡng với “Luận từng mạch”): sở trường = từ 1,25 lần trung bình trở lên; khiếm khuyết = dưới 0,75 lần
  // hoặc chưa khai mạch (0 điểm). Mỗi khiếm khuyết có mục tiêu gần (số điểm để thoát vùng cần khổ luyện, quy ra số việc, mỗi việc 1 điểm), vài việc gợi ý
  // của chính phương đó, và cách mượn sức sở trường mạnh nhất (LEVER) để kéo phương yếu lên. Chỉ đọc điểm, không ghi gì.
  const LEVER = {
    dao: 'Lấy sự tĩnh và lòng từ bi làm nền: trước khi làm việc ở phương yếu, hít thở một lúc và phát nguyện việc ấy giúp ích cho ai đó, rồi mới bắt đầu.',
    tai: 'Dùng nguồn lực dư: dành một khoản nhỏ có chủ đích (khóa học, dụng cụ, buổi tập, món quà cho người thân) để nuôi phương yếu.',
    tam: 'Dùng sự an định: đặt cho phương yếu một khung giờ yên tĩnh cố định mỗi ngày, làm chậm và đều, không ép mình.',
    duyen: 'Rủ người cùng làm: tìm một người bạn đồng hành cho việc ở phương yếu, có người nhắc nhau sẽ bền hơn.',
    than: 'Dùng sinh lực: tranh thủ lúc khỏe nhất trong ngày để làm việc ở phương yếu, nhất là việc cần kiên trì.',
    tri: 'Dùng khả năng học: tìm hiểu một bài, một cuốn sách hay một người thầy về phương yếu, rồi viết lại điều đã học.',
    nghe: 'Dùng kỷ luật công việc: biến phương yếu thành một việc nhỏ có hạn chót trong danh sách, hoàn thành như một nhiệm vụ.',
    gia: 'Dùng sự gắn bó: lồng việc ở phương yếu vào sinh hoạt gia đình (đi dạo cùng nhà, bữa cơm chung, cùng nhau học một điều).',
  };
  const SW_WEAK_MAX = 4, SW_STRONG_MAX = 3;
  const lever = (id, to) => LEVER[id].replace(/phương yếu/g, to); // câu LEVER nói về “phương yếu”: thay bằng tên phương đang nói tới
  function strengthsOf(rep) {
    const s = rep.scores, mean = rep.mean, idx = AXES.map((_, i) => i);
    const high = idx.filter((i) => levelOf(s[i], mean).id === 'high').sort((x, y) => s[y] - s[x] || x - y);
    const low = idx.filter((i) => ['low', 'none'].includes(levelOf(s[i], mean).id)).sort((x, y) => s[x] - s[y] || x - y);
    return { high, low };
  }
  // Điểm cần thêm để phương i lên tới ba phần tư mức trung bình (ngưỡng thoát “Cần khổ luyện”), làm tròn lên bội của 0,5; tối thiểu 0,5.
  const gapTo = (v, mean) => Math.max(STEP, Math.ceil((mean * 0.75 - v) / STEP - 1e-9) * STEP);
  function strengthPanel(rep) {
    if (!rep.total) return '';
    const s = rep.scores, mean = rep.mean, { high, low } = strengthsOf(rep), lead = high.length ? AXES[high[0]] : null; // lead: sở trường mạnh nhất
    const head = (a, note) => '<h4><span class="gr-axis-ico">' + iconSvg('gr-' + a.id, 18) + '</span>' + a.name + '<small>' + note + '</small></h4>';
    const card = (i, kind, body) => '<article class="gr-sw-card is-' + kind + '" data-axis="' + AXES[i].id + '" style="--c:' + AXES[i].color + '">' + body + '</article>';
    const strong = high.slice(0, SW_STRONG_MAX).map((i) => card(i, 'strong', head(AXES[i], fmt(s[i]) + ' điểm · gấp ' + fmt1(s[i] / mean) + ' lần trung bình') + '<p>' + esc(AXES[i].means) + '</p><p class="gr-sw-use"><strong>Phát huy:</strong> ' + esc(lever(AXES[i].id, 'các phương còn yếu')) + '</p>')).join('');
    const weak = low.slice(0, SW_WEAK_MAX).map((i) => {
      const a = AXES[i], need = gapTo(s[i], mean), n = Math.ceil(need - 1e-9);
      return card(i, 'weak', head(a, fmt(s[i]) + ' điểm · ' + (s[i] ? 'bằng ' + Math.round((s[i] / mean) * 100) + '% trung bình' : 'chưa khai mạch')) +
        '<p class="gr-sw-goal"><strong>Mục tiêu gần:</strong> thêm ' + fmt(need) + ' điểm (khoảng ' + (n <= 1 ? 'một' : n) + ' việc) để thoát vùng cần khổ luyện.</p><ul>' + a.ideas.slice(0, 2).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
        (lead ? '<p class="gr-sw-use"><strong>Mượn sức ' + lead.name + ':</strong> ' + esc(lever(lead.id, a.name)) + '</p>' : ''));
    }).join('');
    const rest = low.length > SW_WEAK_MAX ? '<p class="help-copy">Còn ' + (low.length - SW_WEAK_MAX) + ' phương dưới mức nữa: ' + low.slice(SW_WEAK_MAX).map((i) => AXES[i].name).join(', ') + '.</p>' : '';
    const even = !high.length && !low.length;
    return '<section class="panel gr-sw" aria-label="Sở trường và khiếm khuyết"><h2>Sở trường và khiếm khuyết</h2><p class="help-copy">Mức trung bình hiện tại là ' + fmt1(mean) + ' điểm mỗi phương. Sở trường là phương từ 1,25 lần trung bình trở lên; khiếm khuyết là phương dưới 0,75 lần hoặc chưa khai mạch.</p>' +
      (even ? '<p class="gr-sw-even">Tám phương đang khá đều: chưa có sở trường vượt trội hay khiếm khuyết rõ rệt. Cứ giữ nhịp, hoặc chọn một phương để nâng lên.</p>'
        : '<div class="gr-sw-grid"><div class="gr-sw-col" data-col="strong"><h3>Sở trường <small>' + high.length + ' phương</small></h3>' + (strong || '<p class="help-copy">Chưa phương nào vượt trội.</p>') + '</div>' +
          '<div class="gr-sw-col" data-col="weak"><h3>Khiếm khuyết <small>' + low.length + ' phương</small></h3>' + (weak || '<p class="help-copy">Chưa có khiếm khuyết rõ: không phương nào dưới ba phần tư mức trung bình.</p>') + rest + '</div></div>') + '</section>';
  }
  // ---- Gợi ý tu luyện theo phương yếu nhất, theo nhân quả (v2.62.0) --------------------------------------------------------
  // Lấy phương thấp nhất (đồng điểm: theo thứ tự ô cố định) rồi áp dụng Nghiệp quả (KARMA): việc làm ở phương nào là hạt giống, quả trổ về chính phương ấy.
  // Mỗi phương có hai việc gieo cho mình, hai việc gieo cho người và một câu nói quả trở về mình ra sao: giúp người ở đúng phương mình yếu cũng chính là bồi
  // bổ cho mình. Chỉ đọc điểm và sổ, không ghi gì.
  const KARMA_PLAN = {
    dao: { self: ['Ngồi thiền hoặc niệm một khắc mỗi sáng', 'Giữ đúng một lời đã hứa hôm nay'], give: ['Làm một việc thiện nhỏ mà không để ai biết', 'Xin lỗi hoặc hóa giải một hiềm khích với người khác'], fruit: 'Người gieo thiện hạnh thì lòng tự nhẹ, giới hạnh tự vững: việc lành cho người là hạt giống của chính đạo tâm mình.' },
    tai: { self: ['Ghi chép thu chi hôm nay', 'Tiết kiệm hoặc trả bớt một khoản nợ nhỏ'], give: ['Giúp người quen một việc mưu sinh: giới thiệu việc, chỉ cách làm', 'Trả công sòng phẳng, đúng hẹn cho người làm việc cho mình'], fruit: 'Giúp người có kế sinh nhai thì tiếng tốt và cơ hội quay về; sòng phẳng với người thì chữ tín nuôi chính tài lộc của mình.' },
    tam: { self: ['Thở có ý thức ba hơi khi bực bội', 'Viết ba dòng gọi tên cảm xúc hôm nay'], give: ['Lắng nghe một người nói hết lời mà không ngắt', 'Nói một lời trấn an với người đang lo lắng'], fruit: 'An ủi người thì lòng mình cũng dịu; kiên nhẫn lắng nghe là luyện chính tâm cảnh của mình.' },
    duyen: { self: ['Nhắn hỏi thăm một người bạn lâu chưa nói chuyện', 'Cảm ơn ai đó đã giúp mình'], give: ['Giới thiệu hai người có thể giúp nhau', 'Có mặt bên một người đang cần người ở cạnh'], fruit: 'Mở lối cho người thì mạng lưới thân hữu của mình rộng ra; ai gieo tình thì gặt tình.' },
    than: { self: ['Đi bộ hoặc vận động mười lăm phút', 'Ngủ đúng giờ tối nay'], give: ['Rủ người thân hoặc bạn cùng đi bộ', 'Nấu hoặc chia sẻ một món ăn lành mạnh cho người khác'], fruit: 'Rủ người cùng tập thì thói quen của mình bền hơn; chăm cho người ăn lành ngủ tốt cũng là học cách chăm thân mình.' },
    tri: { self: ['Đọc một chương sách', 'Viết lại một điều đã học hôm nay'], give: ['Chỉ cho người khác một điều mình biết', 'Chia sẻ một tài liệu hay cho người đang cần'], fruit: 'Dạy người là cách học sâu nhất: điều chia sẻ ra được hiểu rõ thêm, trí tuệ của mình dày lên.' },
    nghe: { self: ['Hoàn thành một việc quan trọng của dự án', 'Giải quyết một việc tồn đọng'], give: ['Chia sẻ chuyên môn cho một đồng nghiệp trẻ', 'Giúp đồng nghiệp gỡ vướng một việc của họ'], fruit: 'Giúp người làm tốt việc của họ thì đội nhóm mạnh lên, uy tín và cơ hội về với sự nghiệp của mình.' },
    gia: { self: ['Gọi hoặc về thăm cha mẹ, người thân', 'Dọn dẹp một góc nhà cho gọn gàng'], give: ['Phụ giúp người nhà một việc mà không đợi nhờ', 'Nấu một bữa cho cả nhà'], fruit: 'Gieo hiếu và sự chăm sóc trong nhà thì tổ ấm hòa thuận, và tổ ấm ấy lại là nơi nâng đỡ chính mình.' },
  };
  // Phương thấp nhất (đồng điểm: ô đứng trước), các phương thấp ngang nó, và cả tám phương có bằng nhau không.
  function weakestOf(s) {
    let w = 0;
    s.forEach((v, i) => { if (v < s[w]) w = i; });
    return { w, tied: s.map((_, i) => i).filter((i) => i !== w && s[i] === s[w]), even: Math.max(...s) === Math.min(...s) };
  }
  // Ngày gần nhất (không muộn hơn t) phương i được cộng điểm; '' nếu chưa lần nào.
  function lastTrained(g, i, t) {
    let d = '';
    for (const e of g.log) if (e.p[i] > 0 && e.d <= t && e.d > d) d = e.d;
    return d;
  }
  function cultivatePanel(rep, t) {
    if (!rep.total) return '';
    const g = growth(), s = rep.scores, { w, tied, even } = weakestOf(s), a = AXES[w], plan = KARMA_PLAN[a.id], last = lastTrained(g, w, t);
    const lead = even
      ? 'Tám phương đang ngang nhau (' + fmt(s[0]) + ' điểm mỗi phương). Gợi ý bắt đầu từ <strong>' + a.name + '</strong>; các hạ cũng có thể chọn phương khác tùy ý.'
      : 'Phương yếu nhất hiện nay là <strong>' + a.name + '</strong> (' + fmt(s[w]) + ' điểm, thấp nhất trong tám phương; mức trung bình ' + fmt1(rep.mean) + ').' + (tied.length ? ' ' + tied.map((i) => AXES[i].name).join(', ') + ' cũng thấp ngang.' : '');
    const when = last ? 'Lần gần nhất bồi bổ phương này: ' + dayLabel(last, t) + (daysAgo(t, last) ? ' (' + daysAgo(t, last) + ' ngày trước).' : ' (hôm nay).') : 'Phương này chưa từng được bồi bổ.';
    // v2.66.0 (Gieo Nhân): mỗi gợi ý Nhân có nút “Gieo nhân” (growth-sow.js) tạo việc mang sẵn phương này.
    const sow = window.zenSow;
    const list = (arr, kind) => '<ul>' + arr.map((x) => '<li><span class="gr-sow-text">' + esc(x) + '</span>' + (sow ? sow.button(a.id, kind, x) : '') + '</li>').join('') + '</ul>';
    return '<section class="panel gr-cult" aria-label="Gợi ý tu luyện theo phương yếu nhất" data-axis="' + a.id + '" style="--c:' + a.color + '"><h2>Gợi ý tu luyện theo phương yếu nhất</h2>' +
      '<p class="gr-cult-lead">' + lead + '</p><p class="gr-cult-when">' + when + '</p>' +
      '<p class="gr-karma gr-cult-karma"><strong>' + KARMA.name + '</strong> <small>' + KARMA.sub + '</small> <span>' + KARMA.means + '</span></p>' +
      '<ol class="gr-cult-steps">' +
      '<li data-step="self"><small>Nhân · cho mình</small><h3>Gieo cho chính mình</h3>' + list(plan.self, 'self') + '</li>' +
      '<li data-step="give"><small>Nhân · cho người</small><h3>Gieo cho người</h3>' + list(plan.give, 'give') + '</li>' +
      '<li data-step="fruit"><small>Quả · về mình</small><h3>Quả trổ về ' + a.name + '</h3><p>' + esc(plan.fruit) + '</p></li></ol>' +
      (sow ? sow.summary() : '') +
      '<p class="help-copy">Làm xong một việc, hoàn thành nó trong ứng dụng rồi dồn điểm vào ' + a.name + ' ở bảng vận công để Bát phương đồ ghi nhận. Việc giúp người cũng tính cho phương ấy: gieo ở đâu, quả về đó.</p></section>';
  }
  function reportPage() {
    const rep = buildReport(), r = rep.realm, s = rep.scores, t = rep.t;
    const head = heading('GIANG HỒ TU LUYỆN', 'Báo cáo tu luyện', 'Cập nhật ' + t.slice(8, 10) + '/' + t.slice(5, 7) + ' · ' + esc(heroName()), '<div class="gr-head-actions"><button type="button" class="btn" data-gr-back>← Quay lại</button></div>');
    const tips = tipsOf(rep);
    if (rep.earned === 0) return '<div class="gr-page gr-report">' + head + '<section class="panel gr-empty"><h2>Chưa có điểm tu vi để luận bàn</h2><p class="help-copy">Báo cáo sẽ luận từng mạch và đưa bí kíp cải thiện sau lần vận công đầu tiên.</p></section><section class="panel gr-tips"><h2>Bí kíp nhập môn</h2><div class="gr-tip-list">' + tips.map(tipCard).join('') + '</div></section></div>';
    const tile = (id, label, value, sub) => '<div class="gr-tile" data-tile="' + id + '"><small>' + label + '</small><strong>' + value + '</strong><span>' + sub + '</span></div>';
    const tiles = '<div class="gr-tiles">' +
      tile('total', rep.spent ? 'Tu vi hiện có' : 'Tổng tu vi', fmt(rep.total) + ' điểm', rep.entries + ' lần vận công' + (rep.spent ? ' · đã đổi bảo vật ' + fmt(rep.spent) : '')) +
      tile('realm', 'Cảnh giới', r.name, r.top ? levelLabel(r.level) + ' · Thần Vương, cấp tối cao' : r.held ? levelLabel(r.level) + ' · đủ điểm, còn thiếu chiến tích ở Thần giới' : (r.level ? levelLabel(r.level) : 'Chưa nhập cấp') + ' · còn ' + fmt(r.need) + ' điểm lên cấp ' + (r.level + 1)) +
      tile('week', '7 ngày qua', '+' + fmt(rep.week.last) + ' điểm', '7 ngày trước đó: ' + fmt(rep.week.prev) + ' điểm') +
      tile('streak', 'Khổ luyện liền mạch', rep.streak + ' ngày', 'liên tiếp có vận công') + '</div>';
    const tier = tierOf(Math.max(...s));
    const rows = rep.rows.map((x, i) => '<li class="gr-eval-row" data-axis="' + x.axis.id + '" style="--c:' + x.axis.color + '"><span class="gr-axis-ico">' + iconSvg('gr-' + x.axis.id, 18) + '</span><div class="gr-axis-main"><div class="gr-axis-head"><strong>' + x.axis.name + '</strong><span class="gr-level is-' + x.level.id + '">' + x.level.label + '</span><b class="gr-eval-score">' + fmt(x.score) + '</b></div><div class="progress" aria-hidden="true"><span style="width:' + Math.min(100, (x.score / tier) * 100).toFixed(1) + '%"></span></div><small>' + (rep.week.byAxis[i] ? '+' + fmt(rep.week.byAxis[i]) + ' điểm trong 7 ngày qua' : 'Chưa có điểm trong 7 ngày qua') + '</small></div></li>').join('');
    const bal = !rep.total ? '<p class="gr-balance">Tu vi hiện có đang ở 0 vì đã đổi hết bảo vật. Tu luyện thêm để luận độ cân bằng.</p>' : '<p class="gr-balance">Độ cân bằng: <strong>' + rep.balance.label + '</strong> (' + rep.balance.pct + '%). ' + (rep.balance.pct >= 75 ? 'Bát mạch đang khá đều nhau.' : rep.balance.pct >= 45 ? 'Có vài mạch nhỉnh hơn hẳn các mạch còn lại.' : 'Công lực đang dồn vào vài mạch; Bát phương đồ còn lệch.') + '</p>';
    const notes = tips.filter((x) => x.kind !== 'weak'), weak = tips.filter((x) => x.kind === 'weak');
    return '<div class="gr-page gr-report">' + head + tiles +
      '<div class="gr-rep-grid"><section class="panel gr-radar-panel" aria-label="Bát phương đồ"><h2>Bát phương đồ</h2><div class="gr-radar-wrap">' + radar(s) + '</div><p class="gr-summary">Sở trường: <strong>' + rep.extremes.top.name + '</strong> (' + fmt(rep.extremes.mx) + ') · Cần khổ luyện: <strong>' + rep.extremes.low.name + '</strong> (' + fmt(rep.extremes.mn) + ')</p></section>' +
      '<section class="panel gr-eval"><h2>Luận từng mạch</h2>' + bal + '<ul class="gr-eval-list">' + rows + '</ul></section></div>' + historyPanel(t) + strengthPanel(rep) + cultivatePanel(rep, t) +
      '<section class="panel gr-tips"><h2>Bí kíp cải thiện</h2><div class="gr-tip-list">' + notes.map(tipCard).join('') + '</div><h3 class="gr-tips-sub">Mạch nên khổ luyện trước</h3><div class="gr-tip-list">' + weak.map(tipCard).join('') + '</div><p class="help-copy">Bí kíp dựa trên điểm các hạ tự cộng nên chỉ mang tính gợi ý.</p></section></div>';
  }
  // Cho các phần sau (đủ 7 ngày tích lũy, báo cáo) dùng chung.
  function openReport() {
    changing = false;
    reporting = true;
    go('growth');
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-gr-hist]');
    if (!b || !reporting || view !== 'growth') return;
    histSel = +b.dataset.grHist;
    render();
    document.querySelector('[data-gr-hist="' + histSel + '"]')?.focus({ preventScroll: true });
  });
  window.zenGrowth = { TASK_STEPS, isScored, AXES, started, scores, earnedScores, spentScores, total, realmOf, myRealm, realmInfo, levelLabel, tuviAt, REALMS, REALM_FROM, LEVEL_NAMES, LEVEL_AT, LEVEL_MAX, GOD, extremes, fmt, openAward, growth, STEP, iconSvg, habitStreak, buildReport, tipsOf, openReport, heroName, openSpend };

  // ---- Sử dụng điểm (v1.81.0) ---------------------------------------------------------------------------------------------
  // Form ghi vật phẩm đã mua / quy đổi và số điểm trừ ở từng chỉ số. Mỗi lần quy đổi là một dòng trong data.growth.spend;
  // nhập sai thì Sửa (chỉnh lại tên, ngày, ghi chú, điểm), Hủy quy đổi (hoàn điểm, giữ dòng để Khôi phục) hoặc Xóa hẳn dòng đã hủy.
  let spendDlg = null;
  // Số dư từng chỉ số (nửa điểm), không kể lần quy đổi skipId (đang sửa); không âm.
  function balancesHalf(skipId) {
    const g = growth(), out = Array(8).fill(0);
    for (const e of g.log) e.p.forEach((v, i) => (out[i] += v));
    for (const e of activeSpend(g)) if (e.id !== skipId) e.p.forEach((v, i) => (out[i] -= v));
    return out.map((v) => Math.max(0, v));
  }
  const toHalf = (txt) => {
    const t = String(txt).trim().replace(',', '.');
    if (t === '') return 0;
    const n = Number(t);
    return Number.isFinite(n) ? n * 2 : NaN;
  };
  const isHalfInt = (h) => Number.isFinite(h) && h >= 0 && Math.abs(h - Math.round(h)) < 1e-9;
  // Chia `want` nửa điểm cho 8 chỉ số theo tỷ lệ số dư (phần dư chia cho chỉ số lẻ lớn nhất trước), không vượt số dư từng chỉ số.
  function splitShare(avail, want) {
    const sum = avail.reduce((a, b) => a + b, 0);
    if (!sum || want <= 0) return Array(8).fill(0);
    want = Math.min(want, sum);
    const raw = avail.map((a) => (a * want) / sum), out = raw.map(Math.floor);
    let rest = want - out.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => {
      if (rest > 0 && out[i] < avail[i]) {
        out[i]++;
        rest--;
      }
    });
    return out;
  }
  function closeSpend() {
    if (!spendDlg) return;
    const d = spendDlg.el;
    spendDlg = null;
    if (d.open) d.close();
    d.remove();
  }
  function readSpend() {
    const p = [], bad = [];
    spendDlg.inputs.forEach((inp, i) => {
      const h = toHalf(inp.value);
      if (isHalfInt(h)) p.push(Math.round(h));
      else {
        p.push(0);
        bad.push(i);
      }
    });
    return { p, bad };
  }
  function paintSpend() {
    const sd = spendDlg;
    if (!sd) return;
    const { p, bad } = readSpend();
    sd.rows.forEach((row, i) => {
      const left = sd.avail[i] - p[i], off = bad.includes(i) || left < 0;
      row.classList.toggle('is-over', off);
      row.querySelector('.gr-spend-left').textContent = bad.includes(i) ? 'chưa đúng' : left < 0 ? 'vượt số dư ' + fmt(sd.avail[i] * STEP) : 'có ' + fmt(sd.avail[i] * STEP) + (p[i] ? ' → còn ' + fmt(left * STEP) : '');
      row.querySelector('.progress span').style.width = (sd.avail[i] ? Math.max(0, left) / sd.avail[i] * 100 : 0).toFixed(1) + '%';
    });
    const sum = p.reduce((a, b) => a + b, 0), have = sd.avail.reduce((a, b) => a + b, 0);
    sd.sum.innerHTML = 'Quy đổi <b>' + fmt(sum * STEP) + '</b> điểm · Tu vi hiện có sau khi trừ: <b>' + fmt(Math.max(0, have - sum) * STEP) + '</b>';
    sd.msg.textContent = '';
  }
  // opts (chỉ khi mở từ Tàng Bảo Các, dist/growth-store.js): { name, fit, strip, eyebrow, title, owner } — tên món điền sẵn, lời bà chủ
  // dưới tiêu đề, mạch hợp món được đánh dấu. Mọi mạch vẫn nhập tay tự do, không có giá định sẵn.
  function openSpend(id, opts) {
    if (contentReadOnly) return notify('Bản chia sẻ chỉ có quyền xem.');
    const g = growth();
    if (!g) return;
    const old = id ? (g.spend || []).find((e) => e.id === id && !e.x) : null;
    if (id && !old) return;
    const pre = !old && opts && typeof opts === 'object' ? opts : null, fit = pre && Array.isArray(pre.fit) ? pre.fit : [];
    if (!old && (g.spend || []).length >= SPEND_MAX) return notify('Sổ quy đổi đã đầy (' + SPEND_MAX + ' lần). Hãy xóa hẳn bớt các lần đã hủy.');
    const avail = balancesHalf(old?.id);
    if (!old && !avail.some((v) => v > 0)) return notify('Chưa có điểm để quy đổi. Hoàn thành việc để tu luyện trước.');
    closeSpend();
    if (award) closeAward(false);
    const d = document.createElement('dialog');
    d.id = 'growth-spend';
    d.className = 'gr-award gr-spend-dlg';
    d.setAttribute('aria-labelledby', 'gr-spend-title');
    const rows = AXES.map((a, i) => '<li class="gr-spend-row' + (fit.includes(i) ? ' is-fit' : '') + '" style="--c:' + a.color + '"><span class="gr-axis-ico">' + iconSvg('gr-' + a.id, 18) + '</span><div class="gr-axis-main"><div class="gr-axis-head"><strong>' + a.name + '</strong>' + (fit.includes(i) ? '<em class="gr-fit-tag">hợp món này</em>' : '') + '<small class="gr-spend-left"></small></div><div class="progress" aria-hidden="true"><span></span></div></div>' +
      '<input type="number" inputmode="decimal" min="0" max="' + avail[i] * STEP + '" step="0.5" data-gr-spend-axis="' + i + '" placeholder="0" aria-label="Điểm trừ ở ' + a.name + ', đang có ' + fmt(avail[i] * STEP) + '" value="' + (old && old.p[i] ? old.p[i] * STEP : '') + '"></li>').join('');
    d.innerHTML = '<form class="gr-award-form gr-spend-form" novalidate><header><span class="eyebrow">' + esc(pre?.eyebrow || 'GIANG HỒ TU LUYỆN') + '</span><h2 id="gr-spend-title">' + (old ? 'Sửa lần quy đổi' : pre?.title ? esc(pre.title) : 'Đổi bảo vật') + '</h2><p class="help-copy">' + (pre ? 'Không có giá định sẵn: các hạ tự nhập số điểm thấy xứng đáng ở từng mạch, ít hay nhiều đều được, mạch nào cũng trả được. Bát phương đồ co lại tương ứng.' : 'Ghi lại bảo vật các hạ đã mua hoặc quy đổi. Tu vi sẽ bị trừ khỏi các mạch đã chọn và Bát phương đồ co lại tương ứng.') + '</p>' + (pre && typeof pre.strip === 'string' ? pre.strip : '') + '</header>' +
      '<div class="gr-spend-fields"><label class="field gr-spend-name">Bảo vật / nội dung quy đổi<input type="text" name="n" maxlength="120" autocomplete="off" placeholder="Ví dụ: tai nghe mới, bữa tối ngoài, một ngày nghỉ" value="' + esc(old?.n || pre?.name || '') + '"></label>' +
      '<label class="field">Ngày quy đổi<input type="date" name="d" max="' + today() + '" value="' + esc(old?.d || today()) + '"></label>' +
      '<label class="field gr-spend-note">Ghi chú (không bắt buộc)<textarea name="note" rows="2" maxlength="300" placeholder="Nơi mua, giá tiền, lý do thưởng cho bản thân…">' + esc(old?.note || '') + '</textarea></label></div>' +
      '<section class="gr-spend-split" aria-labelledby="gr-spend-split-title"><h3 id="gr-spend-split-title">Trừ tu vi ở từng mạch</h3>' +
      '<div class="gr-spend-quick"><label class="field">Tổng điểm cần chia<input type="number" inputmode="decimal" min="0" step="0.5" data-gr-spend-quick placeholder="0"></label><button type="button" class="btn" data-gr-spend-split>Chia theo tỷ lệ</button></div><p class="help-copy gr-spend-hint">Chia nhanh theo tỷ lệ tu vi đang có ở từng mạch; sau đó vẫn chỉnh được từng ô.</p>' +
      '<ul class="gr-spend-rows">' + rows + '</ul><p class="gr-spend-sum" aria-live="polite"></p></section>' +
      '<p class="gr-spend-msg" role="alert"></p><footer class="gr-award-foot"><button type="button" class="btn" data-gr-spend-close>Đóng</button><span class="gr-grow"></span><button type="submit" class="btn primary">' + (old ? 'Lưu thay đổi' : 'Ghi vào sổ bảo vật') + '</button></footer></form>';
    document.body.append(d);
    const form = d.querySelector('form');
    spendDlg = { el: d, form, id: old?.id || '', owner: pre && typeof pre.owner === 'string' ? pre.owner : '', avail, rows: [...d.querySelectorAll('.gr-spend-row')], inputs: [...d.querySelectorAll('[data-gr-spend-axis]')], sum: d.querySelector('.gr-spend-sum'), msg: d.querySelector('.gr-spend-msg') };
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeSpend();
    });
    form.addEventListener('input', paintSpend);
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches?.('[data-gr-spend-quick]')) {
        e.preventDefault();
        splitSpend();
      }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveSpend();
    });
    paintSpend();
    d.showModal();
    // Từ Tàng Bảo Các: đưa tiêu điểm lên tiêu đề (không bật bàn phím, không cuộn mất lời bà chủ); Tab đi tiếp tới ô tên rồi tám mạch.
    if (pre) {
      const h = d.querySelector('#gr-spend-title');
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    } else form.elements.n.focus();
  }
  function splitSpend() {
    const sd = spendDlg;
    if (!sd) return;
    const want = toHalf(sd.el.querySelector('[data-gr-spend-quick]').value), have = sd.avail.reduce((a, b) => a + b, 0);
    const warn = (t) => {
      paintSpend();
      sd.msg.textContent = t;
    };
    if (!isHalfInt(want) || want <= 0) return warn('Hãy nhập tổng điểm quy đổi (bậc 0,5), rồi bấm Chia theo tỷ lệ.');
    if (want > have) return warn('Các hạ chỉ còn ' + fmt(have * STEP) + ' điểm để quy đổi.');
    const out = splitShare(sd.avail, Math.round(want));
    sd.inputs.forEach((inp, i) => (inp.value = out[i] ? String(out[i] / 2) : ''));
    paintSpend();
  }
  function saveSpend() {
    const sd = spendDlg;
    if (!sd) return;
    const f = sd.form, name = f.elements.n.value.trim(), note = f.elements.note.value.trim(), day = f.elements.d.value;
    const fail = (text, el) => {
      sd.msg.textContent = text;
      (el || f.elements.n).focus();
    };
    if (!name) return fail('Hãy ghi vật phẩm hoặc nội dung đã quy đổi.');
    if (name.length > 120) return fail('Tên vật phẩm tối đa 120 ký tự.');
    if (!isDate(day)) return fail('Hãy chọn ngày quy đổi.', f.elements.d);
    if (day > today()) return fail('Ngày quy đổi không được ở tương lai.', f.elements.d);
    if (note.length > 300) return fail('Ghi chú tối đa 300 ký tự.', f.elements.note);
    const { p, bad } = readSpend();
    if (bad.length) return fail('Điểm ở ' + AXES[bad[0]].name + ' chưa đúng. Hãy nhập số từ 0 trở lên, theo bậc 0,5.', sd.inputs[bad[0]]);
    const avail = balancesHalf(sd.id || undefined), over = p.findIndex((v, i) => v > avail[i]);
    if (over >= 0) return fail(AXES[over].name + ' chỉ còn ' + fmt(avail[over] * STEP) + ' điểm, chưa đủ để trừ ' + fmt(p[over] * STEP) + '.', sd.inputs[over]);
    const first = p.findIndex((v) => v > 0);
    if (first < 0) return fail('Hãy nhập số điểm quy đổi ở ít nhất một chỉ số.', sd.inputs[0]);
    const editing = !!sd.id;
    const ok = wfSave(() => {
      const g = data.growth;
      g.spend ||= [];
      if (editing) {
        const e = g.spend.find((x) => x.id === sd.id);
        if (!e || e.x) throw Error('Lần quy đổi này không còn để sửa.');
        e.n = name;
        e.d = day;
        e.p = p;
        if (note) e.note = note;
        else delete e.note;
      } else {
        const e = { id: uid(), d: day, n: name, p };
        if (note) e.note = note;
        g.spend.push(e);
      }
    });
    if (!ok) return;
    closeSpend();
    if (view === 'growth') render();
    const points = fmt(p.reduce((a, b) => a + b, 0) * STEP);
    notify(editing ? 'Đã cập nhật lần quy đổi “' + name + '” (' + points + ' điểm).' : sd.owner ? 'Chưởng quỹ ' + sd.owner + ' nhận ' + points + ' điểm, giao “' + name + '”. Tu vi hiện có: ' + fmt(total(scores())) + '.' : 'Đã quy đổi ' + points + ' điểm cho “' + name + '”. Tu vi hiện có: ' + fmt(total(scores())) + '.');
  }
  const spendById = (id) => (growth()?.spend || []).find((e) => e.id === id);
  function voidSpend(id) {
    const e = spendById(id);
    if (!e || e.x || contentReadOnly) return contentReadOnly ? notify('Bản chia sẻ chỉ có quyền xem.') : undefined;
    const name = e.n, points = fmt(spendPoints(e));
    if (!wfSave(() => { data.growth.spend.find((x) => x.id === id).x = true; })) return;
    if (view === 'growth') render();
    notify('Đã hủy quy đổi “' + name + '”, hoàn lại ' + points + ' điểm vào Bát phương đồ.');
  }
  function restoreSpend(id) {
    const e = spendById(id);
    if (!e || !e.x || contentReadOnly) return contentReadOnly ? notify('Bản chia sẻ chỉ có quyền xem.') : undefined;
    const bal = balancesHalf(), short = e.p.findIndex((v, i) => v > bal[i]);
    if (short >= 0) return notify('Chưa đủ điểm ở ' + AXES[short].name + ' để khôi phục (đang có ' + fmt(bal[short] * STEP) + ', cần ' + fmt(e.p[short] * STEP) + ').');
    const name = e.n, points = fmt(spendPoints(e));
    if (!wfSave(() => { delete data.growth.spend.find((x) => x.id === id).x; })) return;
    if (view === 'growth') render();
    notify('Đã khôi phục quy đổi “' + name + '”, trừ lại ' + points + ' điểm.');
  }
  function askDeleteSpend(id) {
    const e = spendById(id);
    if (!e || !e.x || contentReadOnly) return contentReadOnly ? notify('Bản chia sẻ chỉ có quyền xem.') : undefined;
    modal('<div class="bg-confirm"><h2>Xóa hẳn lần quy đổi?</h2><p>“' + esc(e.n) + '” đã được hủy và hoàn điểm, nên điểm hiện có không đổi. Dòng này sẽ bị xóa khỏi sổ quy đổi và không hoàn tác được.</p><div class="bg-confirm-actions"><button type="button" class="btn" data-gr-spend-del-no>Giữ lại</button><button type="button" class="btn bg-confirm-delete" data-gr-spend-del-ok="' + esc(e.id) + '">Xóa hẳn</button></div></div>', null, true);
    const eyebrow = document.querySelector('#modal-eyebrow');
    if (eyebrow) eyebrow.textContent = 'GIANG HỒ TU LUYỆN';
    document.querySelector('[data-gr-spend-del-no]')?.focus();
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest?.('[data-gr-spend],[data-gr-spend-edit],[data-gr-spend-void],[data-gr-spend-restore],[data-gr-spend-del],[data-gr-spend-del-ok],[data-gr-spend-del-no],[data-gr-spend-more],[data-gr-spend-split],[data-gr-spend-close]');
    if (!t) return;
    const d = t.dataset;
    if (d.grSpend !== undefined) return openSpend();
    if (d.grSpendEdit) return openSpend(d.grSpendEdit);
    if (d.grSpendVoid) return voidSpend(d.grSpendVoid);
    if (d.grSpendRestore) return restoreSpend(d.grSpendRestore);
    if (d.grSpendDel) return askDeleteSpend(d.grSpendDel);
    if (d.grSpendDelNo !== undefined) return $('#editor').close();
    if (d.grSpendDelOk) {
      const id = d.grSpendDelOk;
      if (!wfSave(() => { data.growth.spend = data.growth.spend.filter((x) => x.id !== id); })) return;
      $('#editor').close();
      if (view === 'growth') render();
      return notify('Đã xóa lần quy đổi đã hủy.');
    }
    if (d.grSpendMore !== undefined) {
      spendAll = !spendAll;
      return render();
    }
    if (d.grSpendSplit !== undefined) return splitSpend();
    if (d.grSpendClose !== undefined) closeSpend();
  });

  // ---- Thao tác -----------------------------------------------------------------------------------------------------------
  document.addEventListener('change', (e) => {
    const r = e.target.closest?.('[name="gr-hero"]');
    if (!r) return;
    pickHero = r.value;
    document.querySelectorAll('.gr-card').forEach((c) => c.classList.toggle('is-on', c.querySelector('input').checked));
    const n = document.querySelector('[data-gr-name]');
    if (n) n.placeholder = HEROES[pickHero].title;
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest?.('[data-gr-plus],[data-gr-undo],[data-gr-skip],[data-gr-save],[data-gr-confirm],[data-gr-cancel],[data-gr-change],[data-gr-pose],[data-gr-report],[data-gr-back]');
    if (!t) return;
    if (t.dataset.grPlus !== undefined) {
      if (!award || award.spent >= award.steps) return;
      const i = Number(t.dataset.grPlus);
      award.add[i]++;
      award.spent++;
      award.stack.push(i);
      award.last = i;
      paintAward();
      const next = award.el.querySelector('[data-gr-plus="' + i + '"]');
      if (next && !next.disabled) next.focus();
      else award.el.querySelector('[data-gr-save]')?.focus();
      return;
    }
    if (t.hasAttribute('data-gr-undo')) {
      if (!award || !award.stack.length) return;
      award.add[award.stack.pop()]--;
      award.spent--;
      award.last = award.stack.length ? award.stack.at(-1) : null;
      return paintAward();
    }
    if (t.hasAttribute('data-gr-skip')) {
      deferAward('skip');
      return closeAward(false);
    }
    if (t.hasAttribute('data-gr-save')) return closeAward(true);
    if (t.hasAttribute('data-gr-report') || t.hasAttribute('data-gr-back')) {
      reporting = t.hasAttribute('data-gr-report');
      stopTimer();
      render();
      return window.scrollTo({ top: 0, left: 0 });
    }
    if (t.hasAttribute('data-gr-change')) {
      pickHero = growth()?.hero || 'nam';
      changing = true;
      stopTimer();
      return render();
    }
    if (t.hasAttribute('data-gr-cancel')) {
      changing = false;
      return render();
    }
    if (t.hasAttribute('data-gr-confirm')) {
      if (contentReadOnly) return notify('Bản chia sẻ chỉ có quyền xem.');
      const name = (document.querySelector('[data-gr-name]')?.value || '').trim().slice(0, 30);
      const ok = wfSave(() => {
        const cur = data.growth;
        data.growth = { v: 1, hero: pickHero, since: cur?.since || today(), log: cur?.log || [], spend: cur?.spend || [] };
        if (name) data.growth.name = name;
        if (cur?.notify !== undefined) data.growth.notify = cur.notify;
        if (cur?.tips !== undefined) data.growth.tips = cur.tips;
      });
      if (!ok) return notify('Chưa lưu được. Hãy thử lại.');
      changing = false;
      poseNow = 'talk';
      render();
      return;
    }
    if (t.dataset.grPose) {
      poseMode = t.dataset.grPose;
      if (poseMode !== 'auto') poseNow = poseMode;
      msgIndex++;
      // v1.83.0: không dựng lại cả trang — chỉ đổi nút đang chọn và chuyển tư thế mượt.
      if (!document.querySelector('#gr-figure')) return render();
      document.querySelectorAll('.gr-chip[data-gr-pose]').forEach((b) => {
        const on = b.dataset.grPose === poseMode;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      paintFigure();
    }
  });
  // v2.32.0: huy hiệu của danh sách 103 cấp chỉ dựng khi mở thang (103 hình mất vài chục mili giây, người không mở thì khỏi tốn).
  document.addEventListener(
    'toggle',
    (e) => {
      const d = e.target;
      if (!window.zenEmblem || !d?.classList?.contains('gr-scale') || !d.open) return;
      d.querySelectorAll('.gr-names-zem:empty').forEach((el) => (el.innerHTML = window.zenEmblem.html(+el.dataset.zem)));
    },
    true,
  );
})();
