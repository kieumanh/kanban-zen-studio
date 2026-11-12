'use strict';
// v1.87.0 (Nhập Môn): bộ chuyển ngữ Giang hồ. Chỉ chạy khi <html data-style="giangho"> (Cài đặt → Giao diện → Phong cách).
// Đổi CHỮ GIAO DIỆN theo bảng thuật ngữ đã duyệt (claude/thuat-ngu-giang-ho): tên mục thanh bên hai dòng (tên giang hồ + nghĩa thường),
// thanh trên, tiêu đề trang, bảng lệnh. Không đụng nội dung của người dùng: ô nhập, vùng soạn thảo, tên dự án / việc / ghi chú… (SKIP),
// và chỉ đổi khi cả chuỗi khớp nguyên văn (hoặc khớp một mẫu có phần thay đổi). Về phong cách Thiền thì trả lại đúng chữ cũ.
// Nạp sau cùng: bộ quan sát được tạo sau các bộ quan sát của ứng dụng nên luôn chạy sau chúng trong cùng một lượt.
(() => {
  const root = document.documentElement;
  const active = () => root.dataset.style === 'giangho';

  // ---- Bảng chữ ------------------------------------------------------------------------------------------------------------
  // Tên mục: [tên giang hồ, dòng nghĩa thường] — dùng cho nút thanh bên / nút chế độ xem (hai dòng) và cho chữ một dòng ở thanh trên, tiêu đề.
  const NAV = {
    'Tổng quan': ['Tổng đàn', 'Tổng quan'],
    'Bảng Kanban': ['Bảng cáo thị', 'Bảng Kanban'],
    'Lịch': ['Hoàng lịch', 'Lịch'],
    'Gantt': ['Trận đồ', 'Gantt'],
    'Điểm tích lũy': ['Tu vi', 'Điểm tích lũy'],
    'Phân bổ tài nguyên': ['Ngân khố', 'Phân bổ tài nguyên'],
    'Việc hằng ngày': ['Nhật khóa', 'Việc hằng ngày'],
    'Chế độ tập trung': ['Bế quan', 'Tập trung'],
    'Ghi chú': ['Tàng thư', 'Ghi chú'],
    'Tài nguyên': ['Bảo khố', 'Tài nguyên'],
    'Lưu trữ': ['Phong ấn', 'Lưu trữ'],
    'Thùng rác': ['Phế tích', 'Thùng rác'],
    'Phiên bản': ['Biên niên', 'Phiên bản'],
    'Cài đặt': ['Cơ quan', 'Cài đặt'],
  };
  const NAV_SEL = '.sidebar .nav, .view-mode';
  const FRAME = '.sidebar, .topbar, #crumb, .page-heading, .studio-palette';
  const HEAD = '.page-heading';
  const greeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'Bình minh đã lên, hôm nay các hạ hành hiệp nơi đâu?';
    if (h >= 11 && h < 13) return 'Chính ngọ rồi, các hạ nghỉ tay dưỡng sức chốc lát.';
    if (h >= 13 && h < 18) return 'Nắng chiều còn dài, thêm một nhiệm vụ nữa thôi.';
    return 'Trăng đã lên, các hạ nghỉ ngơi dưỡng sức.';
  };
  const releaseName = (v) => {
    try {
      // RELEASES (welcome.js) là hằng toàn cục; bản đang chạy ghi '__APP_VERSION__' trước khi dựng.
      const list = typeof RELEASES !== 'undefined' ? RELEASES : [];
      const hit = list.find((r) => r.version === v) || (v === (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '') ? list[0] : null);
      return hit && hit.name ? ' · ' + hit.name : '';
    } catch {
      return '';
    }
  };
  // Cụm từ khớp nguyên văn. Giá trị: chữ mới | hàm | { to, in } (in = chỉ đổi khi nằm trong vùng này, cho các chữ ngắn dễ trùng nội dung).
  const PHRASES = new Map(
    Object.entries({
      // Thanh bên
      'KHÔNG GIAN CỦA BẠN': 'GIANG HỒ CỦA CÁC HẠ',
      'Làm việc': { to: 'Hành sự', in: '.nav-group-label' },
      'Ý tưởng': { to: 'Kho tàng', in: '.nav-group-label' },
      'Chế độ xem': { to: 'Thế trận', in: '.view-group-label' },
      'DỰ ÁN': { to: 'ĐẠI SỰ', in: '.sidebar' },
      'Hướng dẫn': { to: 'Bí kíp nhập môn', in: '.sidebar' },
      'Chế độ xem công việc': 'Thế trận nhiệm vụ',
      'Việc đã ghim': 'Nhiệm vụ đã ghim',
      'Ghi chú truy cập nhanh': 'Tàng thư mở nhanh',
      'Thêm dự án': 'Khởi đại sự',
      'Cài đặt tài khoản': 'Cơ quan · cài đặt tài khoản',
      // Thanh trên
      'Tìm công việc…': 'Truy tìm nhiệm vụ…',
      'Tìm dự án, công việc, ghi chú, checklist và tên tệp': 'Truy tìm đại sự, nhiệm vụ, tàng thư, chiêu thức và tên tệp',
      'Về bảng tổng quan': 'Về Tổng đàn',
      'Thông báo': { to: 'Truyền thư', in: '.topbar' },
      'Bảng dự án': { to: 'Bảng đại sự', in: '#crumb' },
      'Kết quả tìm kiếm': { to: 'Kết quả truy tìm', in: '#crumb' },
      // Tiêu đề trang
      'MỖI NGÀY, MỘT BƯỚC TIẾN': 'MỖI NGÀY, MỘT TẦNG CÔNG LỰC',
      'Chào một ngày đầy cảm hứng': { to: greeting, in: HEAD },
      'Mọi dự án, mọi ý tưởng. Cùng nhau, từng bước thành hình.': 'Mọi đại sự, mọi kế sách. Từng bước một, công thành danh toại.',
      'Tạo dự án': { to: 'Khởi đại sự', in: HEAD },
      'LỊCH CÔNG VIỆC': 'HOÀNG LỊCH NHIỆM VỤ',
      'TIẾN TRÌNH DỰ ÁN': 'TRẬN ĐỒ ĐẠI SỰ',
      'MỘT VIỆC MỖI LÚC': 'NHẤT TÂM BẤT LOẠN',
      'Chọn điều cần tập trung': 'Chọn nhiệm vụ để bế quan',
      'Gợi ý theo mức độ quan trọng và hạn công việc. Bạn chủ động chọn việc phù hợp.': 'Gợi ý theo cấp bách và kỳ hạn. Các hạ tự chọn nhiệm vụ hợp ý.',
      'Tích từng việc nhỏ mỗi ngày để nuôi dưỡng thói quen tốt.': 'Mỗi ngày một môn công phu nhỏ, lâu ngày thành nội lực.',
      'Thêm việc': { to: 'Thêm nhật khóa', in: '.hb-heading-actions' },
      'Báo cáo': { to: 'Chiến báo', in: HEAD },
      'KHÔNG GIAN Ý TƯỞNG': 'TÀNG THƯ CÁC',
      'Ghi nhanh, checklist và lời nhắc trong cùng một nơi.': 'Chép nhanh, chiêu thức và lời nhắc, cất chung một nơi.',
      '+ Ghi chú mới': { to: '+ Chép quyển mới', in: HEAD },
      'PHÂN BỔ TÀI NGUYÊN': 'NGÂN KHỐ',
      'Đầu tư theo dự án': { to: 'Ngân lượng theo đại sự', in: HEAD },
      'Ghi chi và thu hồi cho từng dự án để biết nên tiếp tục hay tạm dừng.': 'Ghi xuất ngân và thu ngân cho từng đại sự để biết nên tiến hay lui.',
      'Báo cáo email hằng tuần': { to: 'Chiến báo email hằng tuần', in: HEAD },
      'RESOURCE VIEWS': 'BẢO KHỐ',
      'Tất cả tệp trong dự án và ghi chú của bạn.': 'Mọi tệp trong đại sự và tàng thư của các hạ.',
      'Tải tệp lên': { to: 'Cất vào bảo khố', in: HEAD },
      'KHO LƯU TRỮ': 'PHONG ẤN',
      'Dự án tạm cất lại': { to: 'Đại sự tạm phong ấn', in: HEAD },
      'Giữ nguyên trạng thái, checklist và tệp. Khôi phục để tiếp tục; dự án lưu trữ không được nhắc hạn.': 'Giữ nguyên trạng thái, chiêu thức và tệp. Giải ấn để làm tiếp; đại sự đang phong ấn không bị nhắc kỳ hạn.',
      'KHÔI PHỤC HOẶC DỌN DẸP': 'NHẶT LẠI HOẶC DỌN SẠCH',
      'Dọn sạch Thùng rác': { to: 'Dọn sạch Phế tích', in: HEAD },
      'NHẬT KÝ PHÁT TRIỂN': 'BIÊN NIÊN',
      'Mỗi phiên bản một khung, kèm từ khóa hạng mục đã cải thiện': 'Mỗi phiên bản một trang sử, kèm từ khóa những gì đã luyện thêm',
      // Bảng lệnh (Ctrl/⌘ K)
      'Bạn muốn làm gì?': 'Các hạ muốn thi triển chiêu gì?',
      'Tìm lệnh, dự án hoặc công việc': 'Truy tìm khẩu quyết, đại sự hoặc nhiệm vụ',
      'Tìm lệnh, dự án, công việc…': 'Truy tìm khẩu quyết, đại sự, nhiệm vụ…',
      'Đóng thanh lệnh': 'Đóng bảng khẩu quyết',
      'Kết quả lệnh': 'Khẩu quyết tìm được',
    }),
  );
  // Tên mục một dòng ở đường dẫn trên cùng và tiêu đề trang (Ghi chú → Tàng thư…), chỉ khi đang ở đúng màn hình đó: tên dự án của
  // người dùng cũng hiện ở hai chỗ này (một dự án tên "Ghi chú" phải giữ nguyên).
  const VIEW_OF = { 'Tổng quan': 'dashboard', 'Lịch': 'calendar', 'Gantt': 'gantt', 'Điểm tích lũy': 'growth', 'Phân bổ tài nguyên': 'budget', 'Việc hằng ngày': 'habits', 'Chế độ tập trung': 'focus', 'Ghi chú': 'notes', 'Tài nguyên': 'resources', 'Lưu trữ': 'archive', 'Thùng rác': 'trash', 'Phiên bản': 'versions' };
  const currentView = () => (typeof view !== 'undefined' ? view : '');
  for (const [plain, v] of Object.entries(VIEW_OF)) if (!PHRASES.has(plain)) PHRASES.set(plain, { to: NAV[plain][0], in: '#crumb, ' + HEAD + ' h1', when: () => currentView() === v });
  // Mẫu có phần thay đổi: [biểu thức, chữ mới hoặc hàm, vùng (tùy chọn), chữ bắt buộc có (lọc nhanh trước khi thử biểu thức)].
  const bell = (s) =>
    'Truyền thư' +
    s
      .slice('Thông báo'.length)
      .replace(' việc cần chú ý', ' nhiệm vụ cần chú ý')
      .replace(/ quá hạn/g, ' lỡ hẹn')
      .replace(/sắp đến hạn/g, 'sắp tới kỳ')
      .replace(/đến hạn hôm nay/g, 'tới kỳ hôm nay')
      .replace(/phiên bản mới/g, 'biên niên mới');
  const PATTERNS = [
    [/^Thông báo · .+$/, bell, '.topbar', 'Thông báo · '],
    [/^(Lịch|Gantt) · (.+)$/, (s, a, b) => (currentView() === VIEW_OF[a] ? NAV[a][0] + ' · ' + b : s), '#crumb', ' · '],
    [/^Phiên bản (\d+\.\d+\.\d+)$/, (s, v) => 'Biên niên v' + v + releaseName(v), HEAD, 'Phiên bản '],
  ];
  // Nội dung người dùng và vùng không đổi chữ.
  const SKIP =
    'script, style, textarea, input, select, option, [contenteditable], .gh-nav, .side-project, #side-projects, #side-pinned-tasks, .tabs, .tab, .sidebar-note, .gr-page, .gr-award, .studio-palette [role=listbox]';
  const ATTRS = ['aria-label', 'title', 'placeholder'];
  const ATTR_SEL = ATTRS.map((a) => '[' + a + ']').join(',');

  // ---- Đổi chữ -------------------------------------------------------------------------------------------------------------
  const textOrig = new WeakMap(); // Text → chữ gốc
  const textMine = new WeakMap(); // Text → chữ bộ chuyển ngữ đã đặt
  const attrOrig = new WeakMap(); // Element → { thuộc tính: { orig, out } }
  function lookup(core, el) {
    const hit = PHRASES.get(core);
    if (hit !== undefined) {
      if (typeof hit === 'string') return hit;
      if (typeof hit === 'function') return hit(core);
      if ((hit.in && !el.closest(hit.in)) || (hit.when && !hit.when())) return null;
      return typeof hit.to === 'function' ? hit.to(core) : hit.to;
    }
    for (const [re, to, scope, quick] of PATTERNS) {
      if ((quick && !core.includes(quick)) || !re.test(core) || (scope && !el.closest(scope))) continue;
      return core.replace(re, to);
    }
    return null;
  }
  function convert(value, el) {
    const core = value.trim();
    if (!core || core.length > 200) return null;
    const out = lookup(core, el);
    if (out == null || out === core || el.closest(SKIP)) return null;
    return value.replace(core, () => out);
  }
  function doText(node) {
    const el = node.parentElement;
    if (!el) return;
    const cur = node.nodeValue;
    if (textMine.get(node) === cur) return;
    const out = convert(cur, el);
    if (out == null) return;
    textOrig.set(node, cur);
    textMine.set(node, out);
    node.nodeValue = out;
  }
  function doAttrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      const rec = attrOrig.get(el) || {};
      if (rec[a] && rec[a].out === v) continue;
      // Thuộc tính của ô nhập (placeholder, nhãn) là chữ giao diện nên được đổi; chỉ bỏ qua vùng nội dung người dùng.
      const host = el.matches('input, textarea, select') ? el.parentElement || el : el;
      const out = convert(v, host);
      if (out == null) continue;
      rec[a] = { orig: v, out };
      attrOrig.set(el, rec);
      el.setAttribute(a, out);
    }
  }
  // Nút thanh bên / chế độ xem: tên giang hồ ở dòng chính, nghĩa thường ở dòng nhỏ bên dưới.
  function doNav(btn) {
    if (btn.querySelector('.gh-nav') || btn.closest(SKIP)) return;
    let label = [...btn.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim());
    let host = null;
    if (!label) {
      host = [...btn.children].reverse().find((c) => c.tagName === 'SPAN' && c.childNodes.length === 1 && c.firstChild.nodeType === 3 && c.textContent.trim());
      label = host?.firstChild;
    }
    const plain = label?.nodeValue.trim();
    const names = plain && NAV[plain];
    if (!names) return;
    // Thẻ riêng (gh-nav) để không dính quy tắc .nav>span (cỡ chữ biểu tượng) hay .nav b (huy hiệu đếm) của ứng dụng.
    const box = document.createElement('gh-nav');
    box.className = 'gh-nav';
    box.dataset.ghText = label.nodeValue;
    const main = document.createElement('gh-name');
    main.className = 'gh-nav-name';
    main.textContent = names[0];
    const small = document.createElement('gh-plain');
    small.className = 'gh-nav-plain';
    small.textContent = names[1];
    box.append(main, small);
    label.replaceWith(box);
  }
  function scan(node) {
    if (node.nodeType === 3) return doText(node);
    if (node.nodeType !== 1) return;
    if (node.matches(NAV_SEL)) doNav(node);
    node.querySelectorAll(NAV_SEL).forEach(doNav);
    const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let t = walk.nextNode(); t; t = walk.nextNode()) doText(t);
    if (node.matches(ATTR_SEL)) doAttrs(node);
    node.querySelectorAll(ATTR_SEL).forEach(doAttrs);
  }
  function restore() {
    document.querySelectorAll('.gh-nav').forEach((box) => box.replaceWith(document.createTextNode(box.dataset.ghText)));
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let t = walk.nextNode(); t; t = walk.nextNode()) {
      if (textOrig.has(t) && textMine.get(t) === t.nodeValue) t.nodeValue = textOrig.get(t);
      textOrig.delete(t);
      textMine.delete(t);
    }
    document.querySelectorAll(ATTR_SEL).forEach((el) => {
      const rec = attrOrig.get(el);
      if (!rec) return;
      for (const a in rec) if (el.getAttribute(a) === rec[a].out) el.setAttribute(a, rec[a].orig);
      attrOrig.delete(el);
    });
  }

  // ---- Bật / tắt theo phong cách -------------------------------------------------------------------------------------------
  let observer = null;
  function onMutations(list) {
    for (const m of list) {
      if (m.type === 'childList') {
        // Ứng dụng có thể đặt lại chữ bên trong một nút mục (innerHTML): dựng lại nhãn hai dòng cho chính nút đó.
        const nav = m.target.nodeType === 1 && m.target.closest(NAV_SEL);
        if (nav) doNav(nav);
        m.addedNodes.forEach(scan);
      }
      else if (m.type === 'characterData') {
        const nav = m.target.parentElement?.closest(NAV_SEL);
        if (nav && !m.target.parentElement.closest('.gh-nav')) doNav(nav);
        else doText(m.target);
      }
      else if (m.type === 'attributes') doAttrs(m.target);
    }
    observer.takeRecords(); // bỏ các thay đổi do chính bộ chuyển ngữ vừa làm
  }
  function sync() {
    if (active() && !observer && document.body) {
      scan(document.body);
      observer = new MutationObserver(onMutations);
      observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    } else if (!active() && observer) {
      observer.disconnect();
      observer = null;
      restore();
    }
  }
  document.addEventListener('zen-theme', sync);
  sync();
  window.zenGiangHo = { active, convert: (s, el = document.body) => convert(s, el), rescan: () => active() && scan(document.body), NAV, PHRASES, PATTERNS };
})();
