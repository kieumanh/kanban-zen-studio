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
  const LOG_MAX = 3000;
  const SPEND_MAX = 500;
  const TIERS = [5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120];
  // Thứ tự các chỉ số là cố định (chỉ số p[i] trong sổ cái); không đổi thứ tự sau khi đã phát hành.
  const AXES = [
    { id: 'nghiep', name: 'Nghiệp quả', sub: 'Phước đức · thiện hạnh', color: '#b0892a', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 3a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 1 0 9',
      means: 'Việc thiện, lời nói đúng, giúp người không đòi đáp, hóa giải điều chưa tròn.',
      ideas: ['Giúp ai đó một việc nhỏ', 'Giữ đúng lời đã hứa', 'Cho đi, quyên góp, làm từ thiện', 'Xin lỗi hoặc hóa giải một hiềm khích'] },
    { id: 'tai', name: 'Tài lộc', sub: 'Ngân lượng · gia sản', color: '#2e7d5b', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M14.6 9.3c-.6-.8-1.5-1.3-2.6-1.3-1.5 0-2.6.8-2.6 2 0 2.7 5.2 1.4 5.2 4.1 0 1.2-1.1 2-2.6 2-1.1 0-2.1-.5-2.7-1.4 M12 6.5V8 M12 16v1.5',
      means: 'Thu nhập, tiết kiệm, đầu tư, nợ nần và kỷ luật chi tiêu.',
      ideas: ['Ghi chép thu chi', 'Hoàn thành việc tạo ra thu nhập', 'Tiết kiệm hoặc trả bớt nợ', 'Học một kiến thức tài chính'] },
    { id: 'tam', name: 'Tâm cảnh', sub: 'Tâm pháp · an định', color: '#7950c8', icon: 'M12 21c-5-2-8-6-8-11 3 0 6 1 8 4 2-3 5-4 8-4 0 5-3 9-8 11z M12 14V6',
      means: 'Sự an định trong tâm, thiền, cảm xúc ổn, ngủ nghỉ và buông bỏ lo âu.',
      ideas: ['Ngồi thiền hoặc thở có ý thức', 'Viết nhật ký, gọi tên cảm xúc', 'Dành thời gian yên tĩnh', 'Buông một việc không cần ôm'] },
    { id: 'duyen', name: 'Nhân duyên', sub: 'Thân hữu · đồng môn', color: '#d65380', icon: 'M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z',
      means: 'Gia đình, bạn bè, đồng nghiệp, cộng đồng và sự kết nối chân thành.',
      ideas: ['Gọi hoặc nhắn hỏi thăm người thân', 'Dành thời gian trọn vẹn cho gia đình', 'Cảm ơn hoặc động viên ai đó', 'Tham gia một hoạt động cộng đồng'] },
    { id: 'than', name: 'Thể lực', sub: 'Gân cốt · khí huyết', color: '#c8553d', icon: 'M13 3 6 13h5l-1 8 8-11h-5z',
      means: 'Vận động, ăn uống, giấc ngủ và chăm sóc cơ thể.',
      ideas: ['Đi bộ, tập võ, vận động', 'Ngủ đủ và đúng giờ', 'Ăn uống lành mạnh', 'Khám sức khỏe định kỳ'] },
    { id: 'tri', name: 'Trí tuệ', sub: 'Kinh thư · kiến văn', color: '#3a6fb0', icon: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 19V5 M9 7h6',
      means: 'Học hỏi, đọc sách, kỹ năng mới và khả năng nhìn lại chính mình.',
      ideas: ['Đọc một chương sách', 'Học một khóa hoặc bài mới', 'Luyện một kỹ năng', 'Viết lại điều đã học được'] },
    { id: 'nghe', name: 'Sự nghiệp', sub: 'Đại nghiệp · sứ mệnh', color: '#2f7f9d', icon: 'M4 21V4 M4 5h12l-2 4 2 4H4',
      means: 'Tiến độ công việc chính, dự án, đóng góp chuyên môn và sứ mệnh nghề nghiệp.',
      ideas: ['Hoàn thành việc quan trọng của dự án', 'Giải quyết việc tồn đọng', 'Hoàn thiện một sản phẩm', 'Chia sẻ chuyên môn cho người khác'] },
    { id: 'vui', name: 'Tinh thần', sub: 'Tiêu dao · sáng tạo · nghỉ ngơi', color: '#e07a2e', icon: 'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M18.4 5.6l-2.1 2.1 M7.7 16.3l-2.1 2.1 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
      means: 'Niềm vui sống, sở thích, sáng tạo, nghỉ ngơi và nếp sống gọn gàng.',
      ideas: ['Làm một việc mình yêu thích', 'Sáng tạo hoặc thử điều mới', 'Dọn dẹp, sắp xếp chỗ ở', 'Nghỉ ngơi trọn vẹn, đi chơi'] },
  ];
  const HEROES = { nam: { label: 'Nam', title: 'Thiếu hiệp', desc: 'Kiếm khách áo lam' }, nu: { label: 'Nữ', title: 'Nữ hiệp', desc: 'Hồng y kiếm khách' } };
  // v2.5.0 (Thăng Thiên): thang 103 cấp, mỗi cấp một danh xưng, 11 cảnh giới (thay thang v1.85.0: 10 cảnh giới × 10 trọng).
  //  - Cảnh giới bắt đầu ở cấp 10, 20 … 90 (Sơ nhập giang hồ: cấp 1–9). Cấp 100 thành Thần (Thần cảnh); trên Thần còn 3 thần cấp,
  //    cấp 103 là Thần Vương.
  //  - Cấp 10, 20 … 90 là ải đột phá: tốn chừng ba lần cấp thường của cảnh giới trước (hai ải đầu gấp bảy).
  //  - v2.10.0 (Thiên Môn): từ cấp 91, mỗi cấp tốn gấp đôi cấp trước: 4 · 8 · 16 … 1.024 (cấp 99); cấp 100 (ải thành Thần) tốn
  //    2.048 điểm, bằng cả chín cấp trước cộng lại, là ải nặng nhất của cõi người.
  //  - Tổng tới cấp 100 = 8.180 điểm (thang v2.5.0: 8.184). Mỗi mốc đều không cao hơn thang trước nên không ai tụt cấp.
  //  - Mỗi thần cấp 2.048 điểm; cấp 103 = 14.324 điểm.
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
    'Thành Thần', 'Thượng Thần', 'Thần Quân', 'Thần Vương',
  ];
  const LEVEL_MAX = 103, GOD = 100;
  // Điểm cho mỗi cấp thường của từng cảnh giới (chỉ số = cảnh giới − 1) và cho ải đột phá ở cấp 10, 20 … 90.
  // Cảnh giới 10 (Võ lâm chí tôn): NORMAL[9] là điểm của cấp 91; từ đó mỗi cấp gấp đôi cấp trước, tới cấp 100.
  const NORMAL = [0.5, 1, 2.5, 5, 10.5, 21, 42.5, 85, 170.5, 4, 2048];
  const GATE = [3.5, 7, 9.5, 19, 33.5, 67, 129.5, 259, 513.5];
  const DOUBLE_FROM = 91;
  const isGate = (n) => n % 10 === 0 && n >= 10 && n <= GOD;
  const levelCost = (n) => (n >= DOUBLE_FROM && n <= GOD ? NORMAL[9] * 2 ** (n - DOUBLE_FROM) : isGate(n) ? GATE[n / 10 - 1] : NORMAL[Math.min(10, Math.floor(n / 10))]);
  const LEVEL_AT = [0];
  for (let n = 1; n <= LEVEL_MAX; n++) LEVEL_AT[n] = LEVEL_AT[n - 1] + levelCost(n);
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
  function validGrowth(g) {
    if (g === undefined) return true;
    if (!g || typeof g !== 'object' || Array.isArray(g)) return false;
    if (!Object.keys(g).every((k) => ['v', 'hero', 'name', 'since', 'log', 'notify', 'tips', 'spend'].includes(k))) return false;
    if (g.v !== 1 || !['nam', 'nu'].includes(g.hero) || !isDate(g.since)) return false;
    if (g.name !== undefined && (typeof g.name !== 'string' || g.name.length > 30)) return false;
    if (g.notify !== undefined && typeof g.notify !== 'boolean') return false;
    if (g.tips !== undefined && typeof g.tips !== 'boolean') return false;
    if (!Array.isArray(g.log) || g.log.length > LOG_MAX) return false;
    const points = (p) => Array.isArray(p) && p.length === 8 && p.every((x) => Number.isInteger(x) && x >= 0 && x <= 1000000) && p.some((x) => x > 0);
    const seen = new Set();
    const logOk = g.log.every(
      (e) =>
        !!e && typeof e === 'object' && !Array.isArray(e) && Object.keys(e).every((k) => ['id', 'd', 's', 'k', 'n', 'p'].includes(k)) && typeof e.id === 'string' && /^[A-Za-z0-9_-]{1,99}$/.test(e.id) &&
        !seen.has(e.id) && !!seen.add(e.id) && isDate(e.d) && ['task', 'habit', 'archive'].includes(e.s) &&
        (e.k === undefined || (typeof e.k === 'string' && e.k.length <= 120)) && (e.n === undefined || (typeof e.n === 'string' && e.n.length <= 120)) && points(e.p),
    );
    if (!logOk) return false;
    if (g.spend === undefined) return true;
    if (!Array.isArray(g.spend) || g.spend.length > SPEND_MAX) return false;
    const spent = new Set();
    return g.spend.every(
      (e) =>
        !!e && typeof e === 'object' && !Array.isArray(e) && Object.keys(e).every((k) => ['id', 'd', 'n', 'note', 'p', 'x'].includes(k)) && typeof e.id === 'string' && /^[A-Za-z0-9_-]{1,99}$/.test(e.id) &&
        !spent.has(e.id) && !!spent.add(e.id) && isDate(e.d) && typeof e.n === 'string' && e.n.length >= 1 && e.n.length <= 120 &&
        (e.note === undefined || (typeof e.note === 'string' && e.note.length <= 300)) && (e.x === undefined || e.x === true) && points(e.p),
    );
  }
  const validBeforeGrowth = valid;
  valid = function (d) {
    return validBeforeGrowth(d) && validGrowth(d.growth);
  };

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
  function realmOf(t) {
    let level = 0;
    while (level < LEVEL_MAX && t >= LEVEL_AT[level + 1]) level++;
    const ri = realmIndex(level), top = level === LEVEL_MAX, nextRealmAt = ri < REALMS.length ? LEVEL_AT[REALM_FROM[ri]] : 0;
    return {
      level, realm: ri, top, god: level >= GOD, name: ri ? REALMS[ri - 1] : NO_REALM, title: LEVEL_NAMES[level], nextTitle: top ? '' : LEVEL_NAMES[level + 1],
      need: top ? 0 : LEVEL_AT[level + 1] - t, pct: top ? 100 : Math.min(99, Math.floor(((t - LEVEL_AT[level]) / levelCost(level + 1)) * 100)),
      breakthrough: !top && realmIndex(level + 1) !== ri, next: nextRealmAt ? REALMS[ri] : '', needRealm: nextRealmAt ? nextRealmAt - t : 0,
    };
  }
  // Thông tin một cảnh giới (1–11): cấp đầu / cuối, điểm mỗi cấp thường, điểm ải đột phá vào cảnh giới, tu vi đầu / cuối.
  // v2.10.0: cảnh giới 10 có costTo (điểm của cấp 99): mỗi cấp gấp đôi cấp trước, từ cost (cấp 91) tới costTo.
  function realmInfo(i) {
    const from = REALM_FROM[i - 1], to = REALM_FROM[i] - 1;
    return { i, name: REALMS[i - 1], note: REALM_NOTE[i - 1], from, to, cost: NORMAL[i - 1], costTo: i === 10 ? levelCost(to) : 0, gate: isGate(from) ? levelCost(from) : 0, at: LEVEL_AT[from], end: LEVEL_AT[to], levels: LEVEL_NAMES.slice(from, to + 1) };
  }
  // Thang cấp: mỗi cảnh giới một dòng (dòng hiện tại được tô), kèm danh xưng từng cấp (cấp hiện tại được tô).
  function scaleTable(r) {
    const rows = REALMS.map((_, k) => {
      const x = realmInfo(k + 1);
      return '<tr' + (x.i === r.realm ? ' class="is-now" aria-current="true"' : '') + '><th scope="row">' + x.name + '</th><td>' + x.from + (x.to > x.from ? '–' + x.to : '') + '</td><td>' + fmt(x.cost) + (x.costTo ? '–<wbr>' + fmt(x.costTo) + '<small>gấp đôi mỗi cấp</small>' : '') + (x.gate ? '<small>ải ' + fmt(x.gate) + '</small>' : '') + '</td><td>' + fmt(x.at) + '–<wbr>' + fmt(x.end) + '</td></tr>';
    }).join('');
    const names = REALMS.map((_, k) => {
      const x = realmInfo(k + 1);
      return '<li class="gr-names-realm' + (x.i === r.realm ? ' is-now' : '') + '"><strong>' + x.name + '</strong><small>' + esc(x.note) + '</small><ol class="gr-names" start="' + x.from + '">' +
        x.levels.map((n, j) => { const lv = x.from + j; return '<li' + (lv === r.level ? ' class="is-now" aria-current="true"' : lv < r.level ? ' class="is-done"' : '') + (isGate(lv) ? ' data-gate' : '') + '><b>' + lv + '</b> ' + n + '</li>'; }).join('') + '</ol></li>';
    }).join('');
    return '<details class="gr-scale"><summary>Xem thang 103 cấp</summary><div class="gr-scale-wrap"><table><thead><tr><th scope="col">Cảnh giới</th><th scope="col">Cấp</th><th scope="col">Mỗi cấp</th><th scope="col">Tổng tu vi</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="help-copy">Ải đột phá là cấp đầu của mỗi cảnh giới (cấp 10, 20 … 100), tốn chừng ba lần cấp thường; số điểm của ải ghi dưới điểm mỗi cấp. Từ cấp 91, mỗi cấp tốn gấp đôi cấp trước: 4, 8, 16 … 1.024 điểm; cấp 100 tốn 2.048 điểm, bằng cả chín cấp trước cộng lại. Cấp 100 thành Thần; ba thần cấp sau dẫn tới Thần Vương.</p><ol class="gr-names-list" aria-label="Danh xưng 103 cấp">' + names + '</ol></details>';
  }
  function extremes(s) {
    const mx = Math.max(...s), mn = Math.min(...s);
    return { top: AXES[s.indexOf(mx)], low: AXES[s.indexOf(mn)], mx, mn };
  }
  const heroName = () => growth()?.name || HEROES[growth()?.hero || 'nam'].title;

  // ---- Biểu đồ mạng nhện (SVG) --------------------------------------------------------------------------------------------
  function radar(s, pending) {
    const CX = 200, CY = 192, R = 104, add = pending || Array(8).fill(0);
    const vals = s.map((v, i) => v + add[i] * STEP);
    const tier = tierOf(Math.max(...vals));
    const pt = (i, r) => {
      const a = ((-90 + i * 45) * Math.PI) / 180;
      return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
    };
    const poly = (r) => AXES.map((_, i) => pt(i, r).map((n) => n.toFixed(1)).join(',')).join(' ');
    const rings = [1, 2, 3, 4, 5].map((k) => '<polygon class="gr-ring' + (k === 5 ? ' gr-ring-outer' : '') + '" points="' + poly((R * k) / 5) + '"/>').join('');
    const spokes = AXES.map((_, i) => { const [x, y] = pt(i, R); return '<line class="gr-spoke" x1="' + CX + '" y1="' + CY + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>'; }).join('');
    const area = AXES.map((_, i) => pt(i, (R * Math.min(1, vals[i] / tier))).map((n) => n.toFixed(1)).join(',')).join(' ');
    const dots = AXES.map((a, i) => { const [x, y] = pt(i, R * Math.min(1, vals[i] / tier)); return '<circle class="gr-dot" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5.5" style="fill:' + a.color + '"/>'; }).join('');
    const labels = AXES.map((a, i) => {
      const [x, y] = pt(i, R + 22), c = Math.cos(((-90 + i * 45) * Math.PI) / 180), sn = Math.sin(((-90 + i * 45) * Math.PI) / 180);
      const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
      const dy = sn < -0.5 ? -14 : sn > 0.5 ? 6 : -6;
      return '<text class="gr-label" x="' + x.toFixed(1) + '" y="' + (y + dy).toFixed(1) + '" text-anchor="' + anchor + '">' + esc(a.name) + '</text><text class="gr-value" x="' + x.toFixed(1) + '" y="' + (y + dy + 16).toFixed(1) + '" text-anchor="' + anchor + '">' + fmt(vals[i]) + '</text>';
    }).join('');
    const label = 'Bát phương đồ 8 mạch: ' + AXES.map((a, i) => a.name + ' ' + fmt(vals[i])).join(', ') + '. Thang tối đa ' + tier + ' điểm.';
    return '<svg class="gr-radar" viewBox="0 0 400 384" role="img" aria-label="' + esc(label) + '">' + rings + spokes + '<polygon class="gr-area" points="' + area + '"/>' + dots + labels + '<text class="gr-scale" x="' + (CX + 7) + '" y="' + (CY - R - 5) + '">' + tier + '</text></svg>';
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
  function axesGuide() {
    return '<section class="panel gr-guide"><h2>Bát mạch của một đời người</h2><p class="help-copy">Mỗi mạch khởi đầu từ 0. Hoàn thành việc để dồn công lực vào mạch vừa bồi bổ. Nối 8 điểm lại thành Bát phương đồ: thấy ngay mạch nào thâm hậu, mạch nào cần khổ luyện.</p><ul class="gr-guide-list">' +
      AXES.map((a) => '<li style="--c:' + a.color + '"><span class="gr-guide-ico">' + iconSvg('gr-' + a.id, 20) + '</span><div><strong>' + a.name + '</strong> <small>' + a.sub + '</small><p>' + a.means + '</p></div></li>').join('') + '</ul></section>';
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
    const g = growth(), r = realmOf(earnedTotal());
    const chips = [{ id: 'auto', label: 'Tùy hứng' }, ...zenHero.POSES].map((p) => '<button type="button" class="gr-chip' + (poseMode === p.id ? ' is-on' : '') + '" data-gr-pose="' + p.id + '" aria-pressed="' + (poseMode === p.id) + '">' + p.label + '</button>').join('');
    return '<section class="panel gr-stage" aria-label="Hiệp khách đồng hành"><div class="gr-stage-bg">' + zenHero.scene() + '<p class="gr-bubble" id="gr-bubble" role="status">' + esc(bubbleText(poseNow, s)) + '</p><div class="gr-figure" id="gr-figure">' + zenHero.svg(g.hero, poseNow) + '</div></div>' +
      '<div class="gr-poses" role="group" aria-label="Thế võ của hiệp khách">' + chips + '</div>' +
      realmBlock(r) + '</section>';
  }
  function realmBlock(r) {
    const ahead = r.top ? 'đã đạt Thần Vương, cấp tối cao' : !r.level ? 'còn ' + fmt(r.need) + ' điểm để nhập cấp 1' : 'còn ' + fmt(r.need) + ' điểm lên cấp ' + (r.level + 1) + (r.breakthrough ? ' · ' + (r.level + 1 === GOD ? 'đột phá thành Thần' : 'đột phá ' + r.next) : '');
    const ladder = REALMS.map((name, i) => '<li class="' + (i + 1 < r.realm ? 'is-done' : i + 1 === r.realm ? 'is-now' : '') + '" title="' + name + '"></li>').join('');
    return '<div class="gr-realm"><div class="gr-realm-top"><span class="gr-realm-name">' + r.name + '</span><span class="gr-rank">' + (r.level ? levelLabel(r.level).replace(/^(.+?)\//, '<b>$1</b>/') + ' · ' + r.title : 'Chưa nhập cấp') + '</span></div>' +
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
    const s = scores(), r = realmOf(earnedTotal()), ex = extremes(s);
    const sub = (r.level ? 'Cấp ' + r.level + ' · ' : '') + r.name + ' · ' + fmt(total(s)) + ' điểm tu vi' + (spentTotal() ? ' hiện có' : '');
    const summary = total(s) === 0
      ? earnedTotal() === 0 ? 'Bát mạch đều ở 0. Hoàn thành một việc để khai mạch.' : 'Tu vi hiện có đang ở 0 sau khi đổi bảo vật. Hoàn thành việc để tu luyện tiếp.'
      : 'Sở trường: <strong>' + ex.top.name + '</strong> (' + fmt(ex.mx) + ') · Cần khổ luyện: <strong>' + ex.low.name + '</strong> (' + fmt(ex.mn) + ')';
    return '<div class="gr-page">' + heading('GIANG HỒ TU LUYỆN', 'Tu vi của ' + esc(heroName()), sub, '<div class="gr-head-actions"><button type="button" class="btn primary" data-gr-spend>Đổi bảo vật</button><button type="button" class="btn" data-gr-report>Xem báo cáo tu luyện</button><button type="button" class="btn" data-gr-change>Đổi hiệp khách</button></div>') +
      '<div class="gr-grid">' + stage(s) + '<section class="panel gr-radar-panel" aria-label="Bát phương đồ nội lực"><h2>Bát phương đồ</h2><div class="gr-radar-wrap" id="gr-radar">' + radar(s) + '</div><p class="gr-summary">' + summary + '</p>' + wallet(s) + '</section></div>' +
      (window.zenStory ? window.zenStory.panel() : '') + (window.zenAch ? window.zenAch.panel() : '') /* v1.99.0 Bảng vàng */ + axisRows(s) + history() + spendPanel() + '<section class="panel gr-how"><h2>Tâm pháp tu luyện</h2><ul class="gr-how-list"><li>Mỗi việc hoàn thành cho các hạ <strong>2 lần vận công</strong> (1 điểm). Bảng vận công hiện ra trước lời chúc mừng.</li><li>Mỗi lần bấm <strong>+</strong> dồn 0,5 điểm vào mạch đã chọn; dồn cả hai lần vào một mạch cũng được.</li><li>Mỗi việc chỉ được vận công một lần.</li><li>Bấm <strong>Đổi bảo vật</strong> để ghi lại món đã mua hoặc quy đổi; tu vi bị trừ khỏi Bát phương đồ. Ghi nhầm thì sửa hoặc hủy quy đổi để hoàn điểm. Cấp và cảnh giới tính theo tổng tu vi đã luyện nên không tụt khi đổi bảo vật.</li><li><strong>100 cấp</strong> chia 10 cảnh giới, mỗi cấp một danh xưng. Cảnh giới sau tốn chừng gấp đôi cảnh giới trước: 0,5 điểm mỗi cấp ở Sơ nhập giang hồ, 1 điểm ở Tam lưu cao thủ… 170,5 điểm ở Thiên nhân hợp nhất.</li><li>Cấp 10, 20 … 90 là <strong>ải đột phá</strong> sang cảnh giới mới, tốn chừng ba lần cấp thường.</li><li>Từ cấp 91, <strong>mỗi cấp tốn gấp đôi cấp trước</strong>: 4, 8, 16 … 1.024 điểm ở cấp 99. Cấp 100 là ải nặng nhất: 2.048 điểm, bằng cả chín cấp trước cộng lại. Đủ 8.180 điểm thì đột phá thành Thần. Trên Thần còn 3 thần cấp tới <strong>Thần Vương</strong>, mỗi thần cấp 2.048 điểm.</li></ul>' + scaleTable(r) + '</section></div>';
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
    if (commit && a.spent > 0) {
      const entry = { id: uid(), d: today(), s: a.source, k: a.key, n: String(a.title || '').slice(0, 120), p: a.add.slice() };
      if (!a.key) delete entry.k;
      if (!entry.n) delete entry.n;
      const before = realmOf(earnedTotal());
      if (!wfSave(() => { data.growth.log.push(entry); data.growth.spend ||= []; compact(); })) return notify('Chưa lưu được điểm. Hãy thử lại.');
      const after = realmOf(earnedTotal());
      crossing = [before.level, after.level];
      // Thông báo điểm nghiệp (bật mặc định, tắt ở Cài đặt → Thông báo): lên cấp, đột phá cảnh giới mới; với việc hằng ngày còn báo số điểm vừa cộng.
      if (growth()?.notify !== false) {
        const parts = [];
        if (a.source !== 'task') parts.push('Đã dồn ' + fmt(a.spent * STEP) + ' điểm công lực vào Điểm tích lũy.');
        if (after.realm !== before.realm) parts.push('Chúc mừng! ' + heroName() + ' đã đột phá, đạt cảnh giới ' + after.name + ' (cấp ' + after.level + ').');
        // v1.97.0 (Ấn Son): đột phá sang cảnh giới mới (từ Tam lưu cao thủ, cấp 10 trở lên) thì mở thêm nghi thức Đột phá
        // (giangho-fx.js); câu chúc vẫn ở thông báo. Bước vào Sơ nhập giang hồ ở điểm đầu tiên là khởi đầu, không phải đột phá.
        if (after.realm !== before.realm && after.realm >= 2 && window.zenFx?.breakthrough) breakthroughTo = after;
        else if (after.level > before.level) parts.push('Chúc mừng! ' + heroName() + ' lên cấp ' + after.level + ' · ' + after.title + ' (' + after.name + ').');
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
    // v1.92.0: vượt mốc 5 cấp thì mở chương truyện ký tương ứng (growth-story.js); v1.97.0: sau nghi thức Đột phá nếu có.
    const story = () => crossing && crossing[1] > crossing[0] && window.zenStory?.crossed(crossing[0], crossing[1]);
    if (breakthroughTo) window.zenFx.breakthrough(breakthroughTo, story);
    else story();
  }
  // Giữ sổ cái trong giới hạn: gộp các dòng cũ nhất thành một dòng "tổng hợp".
  function compact() {
    const g = data.growth;
    if (g.log.length <= LOG_MAX - 100) return;
    const old = g.log.splice(0, 500), p = Array(8).fill(0);
    old.forEach((e) => e.p.forEach((v, i) => (p[i] += v)));
    g.log.unshift({ id: 'a' + uid().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24), d: old.at(-1).d, s: 'archive', n: 'Tổng hợp ' + old.length + ' lần cộng đầu tiên', p });
  }
  function openAward(opt) {
    if (award) closeAward(false);
    const d = document.createElement('dialog');
    d.id = 'growth-award';
    d.className = 'gr-award';
    d.setAttribute('aria-labelledby', 'gr-award-title');
    d.innerHTML = '<form method="dialog" class="gr-award-form"><header><span class="eyebrow">GIANG HỒ TU LUYỆN</span><h2 id="gr-award-title">Vận công bồi bổ</h2><p class="help-copy">' + (opt.lead ? esc(opt.lead) + ' ' : opt.title ? 'Các hạ vừa hoàn thành “' + esc(opt.title) + '”. ' : '') + (opt.intro || 'Chọn mạch muốn dồn công lực.') + '</p></header>' +
      '<p class="gr-budget" aria-live="polite"></p><div class="gr-cols" role="group" aria-label="Bát mạch"></div><p class="gr-live sr-only" role="status" aria-live="polite"></p>' +
      '<footer class="gr-award-foot"><button type="button" class="btn ghost" data-gr-undo>Hoàn tác</button><span class="gr-grow"></span><button type="button" class="btn" data-gr-skip>Để sau</button><button type="button" class="btn primary" data-gr-save>Lưu công lực</button></footer></form>';
    document.body.append(d);
    award = { source: opt.source, key: opt.key, title: opt.title, steps: opt.steps, spent: 0, add: Array(8).fill(0), stack: [], last: null, el: d, then: opt.then };
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeAward(false);
    });
    paintAward();
    d.showModal();
    d.querySelector('.gr-plus')?.focus();
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
    if (!g || contentReadOnly || !task || task.col !== 'Done' || Date.now() - ctx.at > 3000 || g.log.some((e) => e.k === 'task:' + task.id)) return baseCelebrate.apply(this, args);
    openAward({ source: 'task', key: 'task:' + task.id, title: task.title, steps: TASK_STEPS, then: () => baseCelebrate.apply(window, args) });
  };
  // Việc hằng ngày vừa đủ chuỗi 7, 14, 21… ngày liền (habits.js gọi sau khi tích): hỏi điểm một lần cho mỗi việc mỗi ngày.
  function habitStreak(h, n) {
    const g = growth(), key = ('habit:' + h.id + ':' + today()).slice(0, 120);
    if (!g || contentReadOnly || g.log.some((e) => e.k === key)) return;
    setTimeout(() => {
      if (award || !growth() || growth().log.some((e) => e.k === key)) return;
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
      t, scores: s, total: tot, earned, spent: spentTotal(), mean, realm: realmOf(earned), extremes: extremes(s), balance: balanceOf(s), entries: realLog(g).length,
      week: { last: total(w.last), prev: total(w.prev), byAxis: w.last }, streak: activeStreak(g, t),
      rows: AXES.map((a, i) => ({ axis: a, score: s[i], level: levelOf(s[i], mean) })),
      weak: AXES.map((_, i) => i).sort((x, y) => s[x] - s[y] || x - y).slice(0, 3),
    };
  }
  function tipsOf(rep) {
    const tips = [];
    if (rep.earned === 0) {
      tips.push({ kind: 'start', title: 'Khởi bước từ việc nhỏ', text: 'Hoàn thành một việc bất kỳ rồi dồn 1 điểm vào mạch vừa bồi bổ. Chỉ cần vài việc là Bát phương đồ bắt đầu thành hình.', ideas: ['Ghi lại một khoản chi hôm nay (Tài lộc)', 'Nhắn hỏi thăm một người thân (Nhân duyên)', 'Đi bộ 10 phút (Thể lực)'] });
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
  function reportPage() {
    const rep = buildReport(), r = rep.realm, s = rep.scores, t = rep.t;
    const head = heading('GIANG HỒ TU LUYỆN', 'Báo cáo tu luyện', 'Cập nhật ' + t.slice(8, 10) + '/' + t.slice(5, 7) + ' · ' + esc(heroName()), '<div class="gr-head-actions"><button type="button" class="btn" data-gr-back>← Quay lại</button></div>');
    const tips = tipsOf(rep);
    if (rep.earned === 0) return '<div class="gr-page gr-report">' + head + '<section class="panel gr-empty"><h2>Chưa có điểm tu vi để luận bàn</h2><p class="help-copy">Báo cáo sẽ luận từng mạch và đưa bí kíp cải thiện sau lần vận công đầu tiên.</p></section><section class="panel gr-tips"><h2>Bí kíp nhập môn</h2><div class="gr-tip-list">' + tips.map(tipCard).join('') + '</div></section></div>';
    const tile = (id, label, value, sub) => '<div class="gr-tile" data-tile="' + id + '"><small>' + label + '</small><strong>' + value + '</strong><span>' + sub + '</span></div>';
    const tiles = '<div class="gr-tiles">' +
      tile('total', rep.spent ? 'Tu vi hiện có' : 'Tổng tu vi', fmt(rep.total) + ' điểm', rep.entries + ' lần vận công' + (rep.spent ? ' · đã đổi bảo vật ' + fmt(rep.spent) : '')) +
      tile('realm', 'Cảnh giới', r.name, r.top ? levelLabel(r.level) + ' · Thần Vương, cấp tối cao' : (r.level ? levelLabel(r.level) : 'Chưa nhập cấp') + ' · còn ' + fmt(r.need) + ' điểm lên cấp ' + (r.level + 1)) +
      tile('week', '7 ngày qua', '+' + fmt(rep.week.last) + ' điểm', '7 ngày trước đó: ' + fmt(rep.week.prev) + ' điểm') +
      tile('streak', 'Khổ luyện liền mạch', rep.streak + ' ngày', 'liên tiếp có vận công') + '</div>';
    const tier = tierOf(Math.max(...s));
    const rows = rep.rows.map((x, i) => '<li class="gr-eval-row" data-axis="' + x.axis.id + '" style="--c:' + x.axis.color + '"><span class="gr-axis-ico">' + iconSvg('gr-' + x.axis.id, 18) + '</span><div class="gr-axis-main"><div class="gr-axis-head"><strong>' + x.axis.name + '</strong><span class="gr-level is-' + x.level.id + '">' + x.level.label + '</span><b class="gr-eval-score">' + fmt(x.score) + '</b></div><div class="progress" aria-hidden="true"><span style="width:' + Math.min(100, (x.score / tier) * 100).toFixed(1) + '%"></span></div><small>' + (rep.week.byAxis[i] ? '+' + fmt(rep.week.byAxis[i]) + ' điểm trong 7 ngày qua' : 'Chưa có điểm trong 7 ngày qua') + '</small></div></li>').join('');
    const bal = !rep.total ? '<p class="gr-balance">Tu vi hiện có đang ở 0 vì đã đổi hết bảo vật. Tu luyện thêm để luận độ cân bằng.</p>' : '<p class="gr-balance">Độ cân bằng: <strong>' + rep.balance.label + '</strong> (' + rep.balance.pct + '%). ' + (rep.balance.pct >= 75 ? 'Bát mạch đang khá đều nhau.' : rep.balance.pct >= 45 ? 'Có vài mạch nhỉnh hơn hẳn các mạch còn lại.' : 'Công lực đang dồn vào vài mạch; Bát phương đồ còn lệch.') + '</p>';
    const notes = tips.filter((x) => x.kind !== 'weak'), weak = tips.filter((x) => x.kind === 'weak');
    return '<div class="gr-page gr-report">' + head + tiles +
      '<div class="gr-rep-grid"><section class="panel gr-radar-panel" aria-label="Bát phương đồ"><h2>Bát phương đồ</h2><div class="gr-radar-wrap">' + radar(s) + '</div><p class="gr-summary">Sở trường: <strong>' + rep.extremes.top.name + '</strong> (' + fmt(rep.extremes.mx) + ') · Cần khổ luyện: <strong>' + rep.extremes.low.name + '</strong> (' + fmt(rep.extremes.mn) + ')</p></section>' +
      '<section class="panel gr-eval"><h2>Luận từng mạch</h2>' + bal + '<ul class="gr-eval-list">' + rows + '</ul></section></div>' +
      '<section class="panel gr-tips"><h2>Bí kíp cải thiện</h2><div class="gr-tip-list">' + notes.map(tipCard).join('') + '</div><h3 class="gr-tips-sub">Mạch nên khổ luyện trước</h3><div class="gr-tip-list">' + weak.map(tipCard).join('') + '</div><p class="help-copy">Bí kíp dựa trên điểm các hạ tự cộng nên chỉ mang tính gợi ý.</p></section></div>';
  }
  // Cho các phần sau (đủ 7 ngày tích lũy, báo cáo) dùng chung.
  function openReport() {
    changing = false;
    reporting = true;
    go('growth');
  }
  window.zenGrowth = { AXES, started, scores, earnedScores, spentScores, total, realmOf, realmInfo, levelLabel, REALMS, REALM_FROM, LEVEL_NAMES, LEVEL_AT, LEVEL_MAX, GOD, extremes, fmt, openAward, growth, STEP, iconSvg, habitStreak, buildReport, tipsOf, openReport, heroName, openSpend };

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
  function openSpend(id) {
    if (contentReadOnly) return notify('Bản chia sẻ chỉ có quyền xem.');
    const g = growth();
    if (!g) return;
    const old = id ? (g.spend || []).find((e) => e.id === id && !e.x) : null;
    if (id && !old) return;
    if (!old && (g.spend || []).length >= SPEND_MAX) return notify('Sổ quy đổi đã đầy (' + SPEND_MAX + ' lần). Hãy xóa hẳn bớt các lần đã hủy.');
    const avail = balancesHalf(old?.id);
    if (!old && !avail.some((v) => v > 0)) return notify('Chưa có điểm để quy đổi. Hoàn thành việc để tu luyện trước.');
    closeSpend();
    if (award) closeAward(false);
    const d = document.createElement('dialog');
    d.id = 'growth-spend';
    d.className = 'gr-award gr-spend-dlg';
    d.setAttribute('aria-labelledby', 'gr-spend-title');
    const rows = AXES.map((a, i) => '<li class="gr-spend-row" style="--c:' + a.color + '"><span class="gr-axis-ico">' + iconSvg('gr-' + a.id, 18) + '</span><div class="gr-axis-main"><div class="gr-axis-head"><strong>' + a.name + '</strong><small class="gr-spend-left"></small></div><div class="progress" aria-hidden="true"><span></span></div></div>' +
      '<input type="number" inputmode="decimal" min="0" max="' + avail[i] * STEP + '" step="0.5" data-gr-spend-axis="' + i + '" placeholder="0" aria-label="Điểm trừ ở ' + a.name + ', đang có ' + fmt(avail[i] * STEP) + '" value="' + (old && old.p[i] ? old.p[i] * STEP : '') + '"></li>').join('');
    d.innerHTML = '<form class="gr-award-form gr-spend-form" novalidate><header><span class="eyebrow">GIANG HỒ TU LUYỆN</span><h2 id="gr-spend-title">' + (old ? 'Sửa lần quy đổi' : 'Đổi bảo vật') + '</h2><p class="help-copy">Ghi lại bảo vật các hạ đã mua hoặc quy đổi. Tu vi sẽ bị trừ khỏi các mạch đã chọn và Bát phương đồ co lại tương ứng.</p></header>' +
      '<div class="gr-spend-fields"><label class="field gr-spend-name">Bảo vật / nội dung quy đổi<input type="text" name="n" maxlength="120" autocomplete="off" placeholder="Ví dụ: tai nghe mới, bữa tối ngoài, một ngày nghỉ" value="' + esc(old?.n || '') + '"></label>' +
      '<label class="field">Ngày quy đổi<input type="date" name="d" max="' + today() + '" value="' + esc(old?.d || today()) + '"></label>' +
      '<label class="field gr-spend-note">Ghi chú (không bắt buộc)<textarea name="note" rows="2" maxlength="300" placeholder="Nơi mua, giá tiền, lý do thưởng cho bản thân…">' + esc(old?.note || '') + '</textarea></label></div>' +
      '<section class="gr-spend-split" aria-labelledby="gr-spend-split-title"><h3 id="gr-spend-split-title">Trừ tu vi ở từng mạch</h3>' +
      '<div class="gr-spend-quick"><label class="field">Tổng điểm cần chia<input type="number" inputmode="decimal" min="0" step="0.5" data-gr-spend-quick placeholder="0"></label><button type="button" class="btn" data-gr-spend-split>Chia theo tỷ lệ</button></div><p class="help-copy gr-spend-hint">Chia nhanh theo tỷ lệ tu vi đang có ở từng mạch; sau đó vẫn chỉnh được từng ô.</p>' +
      '<ul class="gr-spend-rows">' + rows + '</ul><p class="gr-spend-sum" aria-live="polite"></p></section>' +
      '<p class="gr-spend-msg" role="alert"></p><footer class="gr-award-foot"><button type="button" class="btn" data-gr-spend-close>Đóng</button><span class="gr-grow"></span><button type="submit" class="btn primary">' + (old ? 'Lưu thay đổi' : 'Ghi vào sổ bảo vật') + '</button></footer></form>';
    document.body.append(d);
    const form = d.querySelector('form');
    spendDlg = { el: d, form, id: old?.id || '', avail, rows: [...d.querySelectorAll('.gr-spend-row')], inputs: [...d.querySelectorAll('[data-gr-spend-axis]')], sum: d.querySelector('.gr-spend-sum'), msg: d.querySelector('.gr-spend-msg') };
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
    form.elements.n.focus();
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
    notify(editing ? 'Đã cập nhật lần quy đổi “' + name + '” (' + points + ' điểm).' : 'Đã quy đổi ' + points + ' điểm cho “' + name + '”. Tu vi hiện có: ' + fmt(total(scores())) + '.');
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
    if (t.hasAttribute('data-gr-skip')) return closeAward(false);
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
})();
