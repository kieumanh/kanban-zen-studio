'use strict';
// v1.98.0 (Âm Lịch): ngày âm lịch Việt Nam và 24 tiết khí, tính hoàn toàn trên máy (không gọi máy chủ, không thêm dữ liệu).
// Thuật toán âm lịch của Hồ Ngọc Đức (múi giờ +7, ngày Sóc và trung khí theo Jean Meeus) — cùng cách các lịch Việt thường dùng:
// Tết Bính Ngọ 17/02/2026, tháng 6 nhuận năm Ất Tỵ 2025, tháng 2 nhuận năm Quý Mão 2023.
// Hiển thị (chỉ khi phong cách Giang hồ):
//  - Hoàng lịch, lưới tháng: số ngày âm dưới ngày dương (ngày mùng 1 ghi cả tháng, tháng nhuận có "n"), tên tiết khí vào ngày giao tiết;
//    tiêu đề tháng ghi khoảng ngày âm và năm can chi; dạng danh sách ghi ngày âm cạnh ngày dương.
//  - Tổng quan: dòng "Mùng 4 tháng Mười · năm Bính Ngọ · Tiết Lập đông" kèm lời khuyên theo tiết (khi bật lời lẽ giang hồ).
(() => {
  const root = document.documentElement;
  const gh = () => root.dataset.style === 'giangho';
  const TZ = 7;
  const INT = Math.floor,
    PI = Math.PI;

  // ---- Thuật toán ------------------------------------------------------------------------------------------------------------
  function jdFromDate(dd, mm, yy) {
    const a = INT((14 - mm) / 12),
      y = yy + 4800 - a,
      m = mm + 12 * a - 3;
    let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    return jd;
  }
  function newMoon(k) {
    const T = k / 1236.85,
      T2 = T * T,
      T3 = T2 * T,
      dr = PI / 180;
    let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    const deltat = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return jd1 + C1 - deltat;
  }
  // Kinh độ mặt trời (radian, 0…2π) tại thời điểm jdn (ngày Julius).
  function sunLongitude(jdn) {
    const T = (jdn - 2451545.0) / 36525,
      T2 = T * T,
      dr = PI / 180;
    const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
    let L = (L0 + DL) * dr;
    L -= PI * 2 * INT(L / (PI * 2));
    return L;
  }
  const newMoonDay = (k) => INT(newMoon(k) + 0.5 + TZ / 24);
  // Kinh độ mặt trời lúc 0 giờ (giờ Việt Nam) của ngày jd, chia thành 12 cung (trung khí) hoặc 24 tiết.
  const sector12 = (jd) => INT((sunLongitude(jd - 0.5 - TZ / 24) / PI) * 6);
  const sector24 = (jd) => INT((sunLongitude(jd - 0.5 - TZ / 24) / PI) * 12);
  function lunarMonth11(yy) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = INT(off / 29.530588853);
    const nm = newMoonDay(k);
    return sector12(nm) >= 9 ? newMoonDay(k - 1) : nm;
  }
  function leapMonthOffset(a11) {
    const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last = 0,
      i = 1,
      arc = sector12(newMoonDay(k + i));
    do {
      last = arc;
      i++;
      arc = sector12(newMoonDay(k + i));
    } while (arc !== last && i < 14);
    return i - 1;
  }
  const memo = new Map();
  // 'YYYY-MM-DD' → { day, month, year, leap, jd }
  function lunar(iso) {
    if (memo.has(iso)) return memo.get(iso);
    const [yy, mm, dd] = iso.split('-').map(Number);
    const dayNumber = jdFromDate(dd, mm, yy);
    const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = newMoonDay(k + 1);
    if (monthStart > dayNumber) monthStart = newMoonDay(k);
    let a11 = lunarMonth11(yy),
      b11 = a11,
      year;
    if (a11 >= monthStart) {
      year = yy;
      a11 = lunarMonth11(yy - 1);
    } else {
      year = yy + 1;
      b11 = lunarMonth11(yy + 1);
    }
    const day = dayNumber - monthStart + 1;
    const diff = INT((monthStart - a11) / 29);
    let leap = false,
      month = diff + 11;
    if (b11 - a11 > 365) {
      const leapDiff = leapMonthOffset(a11);
      if (diff >= leapDiff) {
        month = diff + 10;
        if (diff === leapDiff) leap = true;
      }
    }
    if (month > 12) month -= 12;
    if (month >= 11 && diff < 4) year -= 1;
    const out = { day, month, year, leap, jd: dayNumber };
    if (memo.size > 2000) memo.clear();
    memo.set(iso, out);
    return out;
  }

  // ---- Tên gọi ---------------------------------------------------------------------------------------------------------------
  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const MONTHS = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười một', 'Chạp'];
  // 24 tiết khí theo kinh độ mặt trời, bắt đầu từ 0° (Xuân phân), mỗi tiết 15°.
  const TERMS = ['Xuân phân', 'Thanh minh', 'Cốc vũ', 'Lập hạ', 'Tiểu mãn', 'Mang chủng', 'Hạ chí', 'Tiểu thử', 'Đại thử', 'Lập thu', 'Xử thử', 'Bạch lộ', 'Thu phân', 'Hàn lộ', 'Sương giáng', 'Lập đông', 'Tiểu tuyết', 'Đại tuyết', 'Đông chí', 'Tiểu hàn', 'Đại hàn', 'Lập xuân', 'Vũ thủy', 'Kinh trập'];
  const ADVICE = [
    'ngày đêm cân bằng, các hạ giữ tâm quân bình mà hành sự.',
    'trời trong gió mát, hợp lúc dọn lòng, sửa soạn lại đại sự.',
    'mưa xuân nuôi lúa, công phu nhỏ mỗi ngày nuôi nội lực.',
    'hạ vừa sang, nắng lên dần, các hạ nhớ uống đủ nước.',
    'lúa ngậm sữa, việc đã gieo bắt đầu kết hạt.',
    'mùa gieo gặt bận rộn, nhiệm vụ trọng yếu làm trước.',
    'ngày dài nhất năm, đừng quên nghỉ tay dưỡng sức.',
    'nóng nhẹ đã tới, luyện công lúc sáng sớm cho mát.',
    'nóng gắt nhất năm, giữ bình tâm, chớ nóng vội.',
    'thu đã lập, gió dịu dần, hợp lúc nhìn lại nửa năm.',
    'hết nắng gắt, tinh thần sảng khoái, đẩy nhanh đại sự.',
    'sương trắng đọng cành, sáng sớm se lạnh, giữ ấm cổ họng.',
    'ngày đêm lại cân bằng, hợp lúc soát lại tiến cảnh.',
    'sương lạnh xuống, ra ngoài sớm nhớ mặc ấm.',
    'cuối thu rồi, gom việc dang dở cho gọn.',
    'trời chuyển lạnh, các hạ giữ ấm mà luyện công.',
    'hơi lạnh dày thêm, bế quan luyện công là hợp thời.',
    'rét đậm, giữ sức làm gốc, việc lớn chia nhỏ mà làm.',
    'đêm dài nhất năm, từ nay dương khí trở lại.',
    'rét nhẹ đầu năm, chuẩn bị hành trang cho chặng mới.',
    'rét nhất năm, thu xếp đại sự trước Tết.',
    'xuân vừa lập, vạn vật đâm chồi, hợp lúc khởi đại sự mới.',
    'mưa xuân lất phất, ươm mầm kế sách cho năm mới.',
    'sấm xuân đánh thức muôn loài, các hạ cũng nên ra tay.',
  ];
  const yearName = (y) => CAN[(y + 6) % 10] + ' ' + CHI[(y + 8) % 12];
  const dayName = (l) => (l.day <= 10 ? 'Mùng ' + l.day : 'Ngày ' + l.day);
  const monthName = (l) => 'tháng ' + MONTHS[l.month - 1] + (l.leap ? ' nhuận' : '');
  const short = (l) => l.day + '/' + l.month + (l.leap ? 'n' : '');
  // Tiết khí bắt đầu trong ngày iso (kinh độ mặt trời vượt một bội số 15° giữa 0 giờ hôm nay và 0 giờ hôm sau), hoặc null.
  function termStart(iso) {
    const jd = lunar(iso).jd;
    const a = sector24(jd),
      b = sector24(jd + 1);
    return a === b ? null : TERMS[b];
  }
  // Tiết khí đang ở (đã bắt đầu muộn nhất là trong ngày iso).
  function termOf(iso) {
    const i = sector24(lunar(iso).jd + 1);
    return { name: TERMS[i], advice: ADVICE[i] };
  }

  // ---- Hiển thị --------------------------------------------------------------------------------------------------------------
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const todayIso = () => (typeof today === 'function' ? today() : iso(new Date()));
  function calendar(main) {
    main.querySelectorAll('.month-cell').forEach((cell) => {
      if (cell.querySelector('.gh-lunar')) return;
      const day = cell.querySelector('time[datetime]')?.dateTime || cell.querySelector('[data-zen-select-day]')?.dataset.zenSelectDay;
      if (!day || !/^\d{4}-\d\d-\d\d$/.test(day)) return;
      const l = lunar(day),
        term = termStart(day);
      const mark = document.createElement('small');
      mark.className = 'gh-lunar' + (l.day === 1 ? ' is-first' : '') + (term ? ' has-term' : '');
      mark.innerHTML = '<span class="sr-only">âm lịch </span>' + (l.day === 1 ? short(l) : l.day);
      if (term) {
        const t = document.createElement('span');
        t.className = 'gh-term';
        t.textContent = term;
        mark.append(t);
        mark.title = 'Tiết ' + term;
      }
      const anchor = cell.querySelector('[data-zen-select-day]') || cell.querySelector('time[datetime]');
      anchor.after(mark);
    });
    const head = main.querySelector('.month-controls h2');
    const m = /Tháng (\d+), (\d{4})/.exec(head?.textContent || '');
    if (head && m && !head.querySelector('.gh-lunar-span')) {
      const y = Number(m[2]),
        mo = Number(m[1]),
        last = new Date(y, mo, 0).getDate();
      const a = lunar(y + '-' + String(mo).padStart(2, '0') + '-01'),
        b = lunar(y + '-' + String(mo).padStart(2, '0') + '-' + last);
      const span = document.createElement('small');
      span.className = 'gh-lunar-span';
      span.textContent = 'Âm lịch ' + short(a) + ' – ' + short(b) + (a.year === b.year ? ' · năm ' + yearName(b.year) : ' · ' + yearName(a.year) + ' → ' + yearName(b.year));
      head.append(span);
    }
    main.querySelectorAll('.zen-ma-date time[datetime]').forEach((t) => {
      if (t.parentElement.querySelector('.gh-lunar')) return;
      const l = lunar(t.dateTime),
        term = termStart(t.dateTime);
      const mark = document.createElement('small');
      mark.className = 'gh-lunar';
      mark.textContent = 'âm ' + short(l) + (term ? ' · tiết ' + term : '');
      t.after(mark);
    });
  }
  function dashboard(main) {
    const head = main.querySelector('.page-heading');
    if (!head || head.querySelector('.gh-lunar-line')) return;
    const day = todayIso(),
      l = lunar(day),
      t = termOf(day);
    const words = window.zenGiangHo?.active?.();
    const line = document.createElement('p');
    line.className = 'gh-lunar-line';
    line.innerHTML = '<b></b><span></span>';
    line.querySelector('b').textContent = dayName(l) + ' ' + monthName(l) + ' · năm ' + yearName(l.year);
    line.querySelector('span').textContent = ' · Tiết ' + t.name + (words ? ': ' + t.advice : '');
    const copy = head.querySelector(':scope > div');
    (copy?.querySelector('.subtext') ? copy : head).append(line);
  }
  function paint() {
    const main = document.querySelector('#main');
    if (!main) return;
    if (!gh()) {
      main.querySelectorAll('.gh-lunar, .gh-lunar-span, .gh-lunar-line').forEach((e) => e.remove());
      return;
    }
    if (typeof view === 'undefined') return;
    if (view === 'calendar') calendar(main);
    else if (view === 'dashboard') dashboard(main);
  }
  if (typeof render === 'function') {
    const before = render;
    render = function (...args) {
      const out = before.apply(this, args);
      paint();
      return out;
    };
  }
  document.addEventListener('zen-theme', () => (typeof render === 'function' && typeof view !== 'undefined' && (view === 'calendar' || view === 'dashboard') ? render() : paint()));

  window.zenLunar = { lunar, termStart, termOf, yearName, dayName, monthName, short, TERMS };
})();
