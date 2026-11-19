'use strict';
// v1.87.0 (Nhập Môn): bộ chuyển ngữ Giang hồ. Chỉ chạy khi <html data-style="giangho"> (Cài đặt → Giao diện → Phong cách)
// và không chọn Giang hồ nhẹ (v1.96.0: data-gh-words="off" giữ họa tiết, chữ quen thuộc).
// Đổi CHỮ GIAO DIỆN theo bảng thuật ngữ đã duyệt (claude/thuat-ngu-giang-ho): tên mục thanh bên hai dòng (tên giang hồ + nghĩa thường),
// thanh trên, tiêu đề trang, bảng lệnh. Không đụng nội dung của người dùng: ô nhập, vùng soạn thảo, tên dự án / việc / ghi chú… (SKIP),
// và chỉ đổi khi cả chuỗi khớp nguyên văn (hoặc khớp một mẫu có phần thay đổi). Về phong cách Thiền thì trả lại đúng chữ cũ.
// Nạp sau cùng: bộ quan sát được tạo sau các bộ quan sát của ứng dụng nên luôn chạy sau chúng trong cùng một lượt.
(() => {
  const root = document.documentElement;
  const active = () => root.dataset.style === 'giangho' && root.dataset.ghWords !== 'off';

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
    'Liên hoàn lệnh': ['Liên hoàn lệnh', 'Việc ưu tiên'],
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
      'Thêm nhanh một việc bằng câu tự nhiên': 'Ghi nhanh một nhiệm vụ bằng một câu',
      'Thêm nhanh: gõ “Gọi anh Sơn mai 9h #farm”': 'Ghi nhanh: gõ “Gọi anh Sơn mai 9h #farm”',
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
      'CHỌN ĐIỀU CẦN TẬP TRUNG': 'CHỌN NHIỆM VỤ ĐỂ BẾ QUAN',
      'Làm trọn một việc mỗi lúc. Gợi ý theo mức độ quan trọng và hạn công việc. Bạn chủ động chọn việc phù hợp.': 'Nhất tâm một nhiệm vụ mỗi lúc. Gợi ý theo cấp bách và kỳ hạn. Các hạ tự chọn nhiệm vụ hợp ý.',
      'Tích từng việc nhỏ mỗi ngày để nuôi dưỡng thói quen tốt.': 'Mỗi ngày một môn công phu nhỏ, lâu ngày thành nội lực.',
      'Thêm việc': { to: 'Thêm nhật khóa', in: '.hb-heading-actions' },
      'Báo cáo': { to: 'Chiến báo', in: HEAD },
      'KHÔNG GIAN Ý TƯỞNG': 'TÀNG THƯ CÁC',
      'Ghi nhanh, checklist và lời nhắc trong cùng một nơi.': 'Chép nhanh, chiêu thức và lời nhắc, cất chung một nơi.',
      '+ Ghi chú mới': { to: '+ Chép quyển mới', in: HEAD },
      'PHÂN BỔ TÀI NGUYÊN': 'NGÂN KHỐ',
      'ĐẦU TƯ THEO DỰ ÁN': 'NGÂN LƯỢNG THEO ĐẠI SỰ',
      'Ghi chi và thu hồi cho từng dự án để biết nên tiếp tục hay tạm dừng.': 'Ghi xuất ngân và thu ngân cho từng đại sự để biết nên tiến hay lui.',
      'Báo cáo email hằng tuần': { to: 'Chiến báo email hằng tuần', in: HEAD },
      'TỆP ĐÍNH KÈM': 'BẢO KHỐ',
      'Tất cả tệp trong dự án và ghi chú của bạn.': 'Mọi tệp trong đại sự và tàng thư của các hạ.',
      'Tải tệp lên': { to: 'Cất vào bảo khố', in: HEAD },
      'DỰ ÁN TẠM CẤT LẠI': 'ĐẠI SỰ TẠM PHONG ẤN',
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
  // ---- v1.88.0 (Hành Sự): Tổng đàn, bảng Đại sự (Bảng cáo thị), Trận đồ, biểu mẫu nhiệm vụ và đại sự -------------------------------
  // Chữ ngắn dễ trùng nội dung người dùng (Quá hạn, Hoàn thành, Ghim, Hủy…) chỉ đổi trong đúng vùng của nó.
  const MAIN = '#main, dialog';
  const add = (key, value) => {
    const prev = PHRASES.get(key);
    PHRASES.set(key, prev === undefined ? value : [].concat(prev, value));
  };
  const PRIORITY = { 'Quan trọng, khẩn cấp': 'Trọng yếu, hỏa tốc', 'Quan trọng, không khẩn cấp': 'Trọng yếu, thong thả', 'Không quan trọng, khẩn cấp': 'Hỏa tốc, thứ yếu', 'Không quan trọng, không khẩn cấp': 'Thứ yếu, thong thả', 'Chưa phân loại': 'Chưa định cấp' };
  for (const [k, v] of Object.entries(PRIORITY)) add(k, { to: v, in: MAIN });
  const GROUPS = { 'Đã hoàn thành': 'Công thành', 'Quá hạn': 'Lỡ hẹn', 'Đang xây dựng': 'Đang hành sự', 'Chưa làm': 'Chưa xuất chiêu', 'Đang thực hiện': 'Đang hành sự' };
  for (const [k, v] of Object.entries({
    // Tổng đàn
    'Xem việc quá hạn': 'Xem nhiệm vụ lỡ hẹn',
    'Cần làm hôm nay': 'Nhiệm vụ hôm nay',
    // v2.41.0 (Hôm Nay Làm Gì): khối đầu trang Tổng quan
    'Hôm nay làm gì': 'Hôm nay hành sự gì',
    'Nên làm trước': 'Nên ra tay trước',
    'Xem việc hôm nay →': 'Xem nhiệm vụ hôm nay →',
    'Xem tất cả việc hôm nay →': 'Xem mọi nhiệm vụ hôm nay →',
    'Bạn đang rảnh tay. Thêm một việc nhỏ cho hôm nay nhé.': 'Các hạ đang rảnh tay. Thêm một nhiệm vụ nhỏ cho hôm nay nhé.',
    'Hôm nay chưa có việc nào đến hạn.': 'Hôm nay chưa có nhiệm vụ nào tới kỳ.',
    'Quá hạn & sắp đến hạn': 'Lỡ hẹn & sắp tới kỳ',
    'Mở danh sách quá hạn →': 'Mở danh sách lỡ hẹn →',
    'Không có việc sắp đến hạn.': 'Không có nhiệm vụ sắp tới kỳ.',
    'Xem việc đang làm →': 'Xem nhiệm vụ đang hành sự →',
    'Dự án đang làm hoặc vừa mở': 'Đại sự đang hành hoặc vừa mở',
    'Tất cả dự án →': 'Mọi đại sự →',
    'Đang phát triển': { to: 'Đang tu luyện', in: '.project-card .pill' },
    'Tiến độ dự án': { to: 'Tiến cảnh đại sự', in: MAIN },
    'Tổng dự án': 'Tổng đại sự',
    'Những dự án đang hoạt động': 'Những đại sự đang vận hành',
    'Xem chi tiết →': 'Xem tường tận →',
    'Tập trung vào việc đang làm': 'Dồn tâm vào nhiệm vụ đang hành',
    'Mỗi việc xong, một niềm vui': 'Mỗi nhiệm vụ công thành, thêm một phần công lực',
    'Tiến độ tổng thể': 'Tiến cảnh tổng thể',
    'Việc và mục checklist, tính theo từng đơn vị': 'Nhiệm vụ và chiêu thức, tính theo từng đơn vị',
    'Bức tranh công việc': 'Toàn cảnh giang hồ',
    'Tổng công việc': 'Tổng nhiệm vụ',
    'Rê chuột hoặc chạm vào từng màu để xem công việc.': 'Rê chuột hoặc chạm vào từng màu để xem nhiệm vụ.',
    'Mỗi việc thuộc một nhóm. Việc trễ hạn được đưa vào nhóm đỏ cho đến khi hoàn tất.': 'Mỗi nhiệm vụ thuộc một nhóm. Nhiệm vụ lỡ hẹn nằm ở nhóm đỏ cho tới khi công thành.',
    'Tiến độ theo dự án': 'Tiến cảnh từng đại sự',
    'Xem tổng hợp →': 'Xem toàn cục →',
    'Cách tính tiến độ': 'Cách tính tiến cảnh',
    'Mỗi công việc và mỗi mục checklist được tính là một đơn vị ngang nhau. Tiến độ công việc dựa trên checklist; nếu chưa có checklist, dựa trên trạng thái hoàn thành.': 'Mỗi nhiệm vụ và mỗi chiêu được tính là một đơn vị ngang nhau. Tiến cảnh nhiệm vụ dựa trên chiêu thức; nếu chưa có chiêu thức, dựa trên trạng thái công thành.',
    'Việc cần ưu tiên': 'Nhiệm vụ cần ưu tiên',
    'Tiến độ': { to: 'Tiến cảnh', in: MAIN },
    'Thống kê công việc': 'Thống kê nhiệm vụ',
    'Phân bố công việc': 'Phân bố nhiệm vụ',
    // Bảng cáo thị (bảng của một đại sự)
    'Hiển thị': { to: 'Bố cục', in: '.wf-display-options > summary' },
    'Thanh tiến độ': 'Thanh tiến cảnh',
    'Hiện checklist trên thẻ': 'Hiện chiêu thức trên thẻ',
    'Giới hạn việc mỗi cột': 'Giới hạn nhiệm vụ mỗi cột',
    'Lệnh nhanh': { to: 'Khẩu quyết', in: MAIN },
    // Hộp “Thêm nhanh” (v2.35.0)
    'Thêm nhanh': { to: 'Ghi nhanh', in: 'dialog h2' },
    'Gõ một câu': { to: 'Truyền một câu', in: 'dialog .field' },
    'Gõ tên việc, thêm ngày giờ và #tên dự án. Mình sẽ tách giúp.': { to: 'Gõ tên nhiệm vụ, thêm ngày giờ và #tên đại sự. Để tại hạ tách giúp.', in: '.qa-preview' },
    'Việc': { to: 'Nhiệm vụ', in: '.qa-preview dt' },
    'Hạn': { to: 'Kỳ hạn', in: '.qa-preview dt' },
    'Dự án': { to: 'Đại sự', in: '.qa-preview dt' },
    'Từ khóa': { to: 'Nhãn', in: '.qa-preview dt' },
    'Chưa có tên việc': { to: 'Chưa có tên nhiệm vụ', in: '.qa-preview' },
    'Chưa đặt hạn': { to: 'Chưa định kỳ hạn', in: '.qa-preview' },
    'Chưa có dự án': { to: 'Chưa có đại sự', in: '.qa-preview' },
    'Hiểu: hôm nay · mai · mốt · thứ 6 · thứ 6 tuần sau · 20/11 · ngày 20 · 9h · 9h30 · 3 giờ chiều · #tên dự án': { to: 'Hiểu: hôm nay · mai · mốt · thứ 6 · thứ 6 tuần sau · 20/11 · ngày 20 · 9h · 9h30 · 3 giờ chiều · #tên đại sự', in: '.qa-hint' },
    'Lưu trữ': { to: 'Phong ấn', in: '.wf-project-menu' },
    'Sửa dự án': 'Sửa đại sự',
    'Thêm việc': { to: 'Thêm nhiệm vụ', in: '.board-tools' },
    'việc xong': { to: 'nhiệm vụ công thành', in: '.board-summary' },
    'Chưa có checklist': 'Chưa có chiêu thức',
    'Bước tiếp theo': 'Chiêu kế tiếp',
    '+ Thêm công việc': '+ Thêm nhiệm vụ',
    'Công cụ bảng': 'Công cụ bảng cáo thị',
    'Chưa đặt giới hạn việc mỗi cột': 'Chưa đặt giới hạn nhiệm vụ mỗi cột',
    'Ghim công việc': 'Ghim nhiệm vụ',
    'Tiến độ công việc': 'Tiến cảnh nhiệm vụ',
    'Chưa có checklist; tiến độ dựa trên trạng thái công việc': 'Chưa có chiêu thức; tiến cảnh dựa trên trạng thái nhiệm vụ',
    'Tiến độ checklist': 'Tiến cảnh chiêu thức',
    // Trận đồ
    'Phạm vi dự án': 'Phạm vi đại sự',
    'Tất cả dự án': 'Mọi đại sự',
    'Mỗi công việc và mỗi mục checklist là một đơn vị.': 'Mỗi nhiệm vụ và mỗi chiêu là một đơn vị.',
    'Khoảng xem': 'Tầm nhìn',
    'Chọn một ngày trống để tạo công việc ngay tại đó. Kéo thanh hoặc hai mép để đổi lịch; nối các chấm để tạo phụ thuộc. Esc hủy thao tác.': 'Chọn một ngày trống để tạo nhiệm vụ ngay tại đó. Kéo thanh hoặc hai mép để đổi ngày; nối các chấm để buộc thứ tự. Esc hủy thao tác.',
    'VIỆC CẦN XẾP LỊCH': 'NHIỆM VỤ CẦN ĐỊNH NGÀY',
    'Chưa đặt lịch': 'Chưa định ngày',
    'Chọn “Lên lịch hôm nay” để thêm nhanh, hoặc mở việc để đặt khoảng ngày khác.': 'Chọn “Định ngày hôm nay” để thêm nhanh, hoặc mở nhiệm vụ để đặt khoảng ngày khác.',
    'Lên lịch hôm nay': 'Định ngày hôm nay',
    'Không còn việc chưa lên lịch': 'Không còn nhiệm vụ chưa định ngày',
    'Mọi công việc trong dự án đã có ngày thực hiện.': 'Mọi nhiệm vụ trong đại sự đã có ngày hành sự.',
    // Biểu mẫu nhiệm vụ
    'KHÔNG GIAN LÀM VIỆC': 'GIANG HỒ HÀNH SỰ',
    'Công việc mới': 'Nhiệm vụ mới',
    'Chi tiết công việc': 'Chi tiết nhiệm vụ',
    'Tên công việc': 'Tên nhiệm vụ',
    'Đặt tên rõ ràng, chọn lịch và chia nhỏ các bước thực hiện.': 'Đặt tên rõ ràng, định ngày và chia nhỏ thành từng chiêu.',
    'Mức độ': { to: 'Cấp bách', in: 'dialog' },
    'Nhãn công việc': 'Nhãn nhiệm vụ',
    'Lịch & thời hạn': 'Ngày giờ & kỳ hạn',
    'Ngày kết thúc đồng thời là hạn hoàn thành. Giờ Việt Nam.': 'Ngày kết thúc cũng là kỳ hạn công thành. Giờ Việt Nam.',
    'Checklist': { to: 'Chiêu thức', in: 'dialog h3' },
    'Checklist (mỗi dòng một mục)': 'Chiêu thức (mỗi dòng một chiêu)',
    'Gán dự án': 'Gán đại sự',
    'Hủy': { to: 'Thôi', in: '.modal-foot' },
    'Đóng': 'Lui',
    'Mô tả công việc': 'Mô tả nhiệm vụ',
    'Phác thảo ý tưởng\nHoàn thiện nội dung\nKiểm tra và xuất bản': 'Phác thảo kế sách\nHoàn thiện nội dung\nKiểm tra rồi công bố',
    'Chọn dự án': 'Chọn đại sự',
    'Chế độ tập trung': { to: 'Bế quan', in: '.task-focus-shortcut' },
    'Chuyển dự án': 'Dời sang đại sự khác',
    'Sao chép sang dự án': 'Sao chép sang đại sự',
    'Lưu trữ việc': 'Phong ấn nhiệm vụ',
    'Lưu làm mẫu': 'Lưu làm khuôn',
    'Thêm mục mới': 'Thêm chiêu mới',
    'Enter để thêm · Shift + Enter để thêm nhiều mục': 'Enter để thêm · Shift + Enter để thêm nhiều chiêu',
    'Bình luận': { to: 'Luận bàn', in: '.wf-comments' },
    'Viết bình luận': 'Viết lời luận bàn',
    '+ Thêm bình luận': '+ Thêm lời luận bàn',
    'Xóa công việc này': 'Xóa nhiệm vụ này',
    'Chuyển vào Thùng rác, khôi phục được trong 30 ngày.': 'Chuyển vào Phế tích, khôi phục được trong 30 ngày.',
    'Xóa công việc': 'Xóa nhiệm vụ',
    'Ghim công việc này lên menu bên trái': 'Ghim nhiệm vụ này lên thanh bên',
    'Mở chế độ tập trung': 'Mở Bế quan',
    'Mở chế độ tập trung để làm riêng việc này': 'Bế quan để chuyên tâm nhiệm vụ này',
    'Chuyển trạng thái công việc': 'Chuyển trạng thái nhiệm vụ',
    'Bỏ mục': 'Bỏ chiêu',
    'Thêm việc cần làm…': 'Thêm chiêu cần luyện…',
    // Biểu mẫu đại sự
    'Chỉnh sửa dự án': 'Chỉnh sửa đại sự',
    'Một dự án mới bắt đầu': 'Một đại sự mới khởi đầu',
    'Tên dự án': 'Tên đại sự',
    'Màu dự án': 'Màu đại sự',
    'Ghi chú liên kết': 'Tàng thư liên kết',
    'Chưa có ghi chú liên kết. Chọn ghi chú có sẵn ở bên dưới để thêm vào dự án.': 'Chưa có quyển nào liên kết. Chọn quyển có sẵn bên dưới để thêm vào đại sự.',
    'Liên kết ghi chú có sẵn': 'Liên kết quyển có sẵn',
    'Bạn chưa có ghi chú. Hãy tạo ghi chú trước khi liên kết.': 'Các hạ chưa có quyển nào. Hãy chép quyển trước khi liên kết.',
    'Từ khóa dự án': 'Từ khóa đại sự',
    'Tạo tối đa 5 từ khóa để dùng lại trong các công việc. Mỗi từ khóa có màu riêng.': 'Tạo tối đa 5 từ khóa để dùng lại trong các nhiệm vụ. Mỗi từ khóa có màu riêng.',
    'Xóa dự án này': 'Xóa đại sự này',
    'Dự án và các việc bên trong chuyển vào Thùng rác, khôi phục được trong 30 ngày.': 'Đại sự và các nhiệm vụ bên trong chuyển vào Phế tích, khôi phục được trong 30 ngày.',
    'Tìm ghi chú để liên kết': 'Truy tìm quyển để liên kết',
    'Tìm ghi chú theo tiêu đề…': 'Truy tìm quyển theo tiêu đề…',
  }))
    add(k, v);
  for (const [k, v] of Object.entries(GROUPS)) add(k, { to: v, in: '.work-legend, .stat-label, .wf-today-plan h2, .wf-today-now h2, .dashboard-plan-part h3, .wf-focus-group > h2' });

  // ---- v1.89.0 (Nhật Khóa): Hoàng lịch, Bế quan, Nhật khóa ------------------------------------------------------------------
  const HB_LEVEL = { 'Xuất sắc': 'Thâm hậu', 'Tốt': 'Vững vàng', 'Đang hình thành': 'Đang thành hình', 'Cần nâng đỡ': 'Cần khổ luyện' };
  for (const [k, v] of Object.entries(HB_LEVEL)) add(k, { to: v, in: '.hb-level' });
  for (const [k, v] of Object.entries({
    // Hoàng lịch
    'Danh sách': { to: 'Liệt kê', in: '.zen-cal-mode' },
    'Hạn': { to: 'Kỳ hạn', in: '.zen-event-kind' },
    'Chạm vào công việc để xem chi tiết. Công việc chưa đặt ngày nằm ở mục Chưa lên lịch bên dưới.': 'Chạm vào nhiệm vụ để xem tường tận. Nhiệm vụ chưa định ngày nằm ở mục Chưa định ngày bên dưới.',
    'Chạm vào một ngày để xem việc của ngày đó. Việc chưa đặt ngày nằm ở mục Chưa lên lịch bên dưới.': 'Chạm vào một ngày để xem nhiệm vụ của ngày đó. Nhiệm vụ chưa định ngày nằm ở mục Chưa định ngày bên dưới.',
    'Chưa lên lịch': { to: 'Chưa định ngày', in: '.zen-unscheduled' },
    'Mọi công việc đã có lịch hoặc hạn.': 'Mọi nhiệm vụ đã có ngày hoặc kỳ hạn.',
    'Kiểu hiển thị lịch': 'Kiểu hiển thị Hoàng lịch',
    'Chưa có công việc trong ngày này.': 'Chưa có nhiệm vụ trong ngày này.',
    // Bế quan
    'Gợi ý 3 việc quan trọng': '3 nhiệm vụ trọng yếu',
    'Đến hạn hôm nay': { to: 'Tới kỳ hôm nay', in: '.wf-focus-group' },
    'Tập trung →': 'Bế quan →',
    'Không có công việc trong nhóm này.': 'Không có nhiệm vụ trong nhóm này.',
    'DỰ ÁN ĐANG LÀM': 'ĐẠI SỰ ĐANG HÀNH',
    'Thoát tập trung': 'Xuất quan',
    'Thoát chế độ tập trung': 'Xuất quan',
    'Đồng hồ tập trung · tùy chọn': 'Nén hương bế quan · tùy chọn',
    '25 phút tập trung, rồi chủ động nghỉ 5 phút.': '25 phút nhập định, rồi chủ động nghỉ 5 phút.',
    'Bắt đầu': { to: 'Nhập định', in: '.studio-pomodoro' },
    'Bắt đầu lại': { to: 'Nhập định lại', in: '.studio-pomodoro' },
    'Tạm dừng': { to: 'Tạm nghỉ', in: '.studio-pomodoro' },
    'Đã hoàn tất phiên tập trung. Hãy nghỉ ngơi một chút.': 'Đã viên mãn một nén hương bế quan. Hãy nghỉ ngơi chốc lát.',
    'ĐANG TẬP TRUNG': 'ĐANG BẾ QUAN',
    'Checklist': { to: 'Chiêu thức', in: '.wf-focus-checklist-heading' },
    'Chỉnh sửa công việc': 'Chỉnh sửa nhiệm vụ',
    'Ghi chú liên quan': 'Tàng thư liên quan',
    'Ghi chú': { to: 'Tàng thư', in: '.zen-focus-notes h2' },
    'Chưa có ghi chú liên kết. Bạn có thể tạo ghi chú và liên kết với công việc này.': 'Chưa có quyển nào liên kết. Các hạ có thể chép quyển mới và liên kết với nhiệm vụ này.',
    'Quản lý ghi chú liên kết': 'Quản lý quyển liên kết',
    '+ Viết ghi chú': '+ Chép quyển',
    'Tìm ghi chú': 'Truy tìm quyển',
    'Nhập tên ghi chú…': 'Nhập tên quyển…',
    'Kết thúc phiên tập trung?': 'Xuất quan?',
    'Bạn đã hoàn thành được một phần công việc. Hãy chọn tiếp tục ở lại hoặc kết thúc phiên này.': 'Các hạ đã luyện được một phần nhiệm vụ. Hãy chọn ở lại bế quan hoặc xuất quan.',
    'Ở lại': { to: 'Ở lại bế quan', in: '.zen-focus-exit-actions' },
    'Thoát': { to: 'Xuất quan', in: '.zen-focus-exit-actions' },
    // Nhật khóa
    'Hôm nay chưa có việc nào được tích.': 'Hôm nay chưa luyện môn nhật khóa nào.',
    'Bắt đầu bằng một việc nhỏ nhất.': 'Khởi đầu bằng môn nhỏ nhất.',
    'việc hôm nay': { to: 'nhật khóa hôm nay', in: '.hb-summary' },
    'Hoàn thành hôm nay': 'Công thành hôm nay',
    'Hôm nay bạn đã hoàn thành tất cả. Nhẹ nhõm thật.': 'Hôm nay các hạ đã luyện đủ mọi môn. Thân tâm nhẹ nhõm.',
    'Tiến độ tuần này': 'Tiến cảnh tuần này',
    'Tiến độ tuần': 'Tiến cảnh tuần',
    'Chưa có việc nào trong tuần này': 'Chưa có môn nhật khóa nào trong tuần này',
    'Bảng tuần': 'Bảng luyện tuần',
    'Giữ một ô ngày để ghi chú cảm nhận.': 'Giữ một ô ngày để ghi lại tâm đắc.',
    'Chưa có chuỗi': 'Chưa có chuỗi khổ luyện',
    'Chưa gắn dự án': 'Chưa gắn đại sự',
    'Dự án đã xóa': 'Đại sự đã xóa',
    'Dự án liên quan': 'Đại sự liên quan',
    'Nghỉ hôm nay': 'Hưu tức hôm nay',
    'Bỏ nghỉ hôm nay': 'Thôi hưu tức hôm nay',
    'Xem lịch sử': { to: 'Xem công phu', in: '.hb-row, .hb-page, #main' },
    'Gợi ý bắt đầu hôm nay': 'Gợi ý khởi đầu hôm nay',
    'Bảng việc hằng ngày': 'Bảng nhật khóa',
    'Tiến độ cộng gộp của tất cả việc trong tuần': 'Tiến cảnh cộng gộp của mọi môn nhật khóa trong tuần',
    'Chưa có việc hằng ngày nào': 'Chưa có môn nhật khóa nào',
    'Bắt đầu bằng một việc thật nhỏ. Bạn có thể chọn gợi ý bên dưới hoặc tự thêm.': 'Khởi đầu bằng một môn thật nhỏ. Các hạ có thể chọn gợi ý bên dưới hoặc tự thêm.',
    'VIỆC HẰNG NGÀY': 'NHẬT KHÓA',
    'Thêm việc hằng ngày': 'Thêm nhật khóa',
    'Chỉnh sửa việc hằng ngày': 'Chỉnh sửa nhật khóa',
    'Tên việc của bạn': 'Tên môn nhật khóa',
    'Tên việc': { to: 'Tên môn', in: '.hb-form' },
    'Số lần trong tuần': 'Số buổi luyện mỗi tuần',
    'Mỗi ngày (7 lần)': 'Mỗi ngày (7 buổi)',
    'Không gắn dự án': 'Không gắn đại sự',
    'Không nhắc việc này. Chọn giờ để bật nhắc.': 'Không nhắc môn này. Chọn giờ để bật truyền thư.',
    'Xóa việc này': 'Xóa môn này',
    'Giảm số lần trong tuần': 'Giảm số buổi mỗi tuần',
    'Tăng số lần trong tuần': 'Tăng số buổi mỗi tuần',
    'Cảm nhận': { to: 'Tâm đắc', in: 'dialog' },
    'Một câu ngắn về việc này…': 'Một câu ngắn về buổi luyện này…',
    'Đã lưu ghi chú.': 'Đã ghi tâm đắc vào sổ.',
    'Đã xóa ghi chú.': 'Đã xóa tâm đắc.',
    'Đã cập nhật việc hằng ngày.': 'Đã cập nhật nhật khóa.',
    'Đã thêm việc hằng ngày.': 'Đã thêm nhật khóa.',
    'Đã xóa việc hằng ngày.': 'Đã xóa nhật khóa.',
    'Đã đổi thứ tự việc.': 'Đã đổi thứ tự nhật khóa.',
    'Xóa việc hằng ngày?': 'Xóa nhật khóa?',
    'Mở việc hằng ngày →': 'Mở Nhật khóa →',
    'Đến giờ nhắc việc': 'Truyền thư: tới giờ luyện',
    // Chiến báo nhật khóa
    'Báo cáo việc hằng ngày': 'Chiến báo nhật khóa',
    'Biểu đồ, đánh giá và đề xuất cải thiện từ chính dữ liệu tích của bạn.': 'Biểu đồ, luận bàn và bí kíp cải thiện từ chính công phu của các hạ.',
    'Tỷ lệ hoàn thành': 'Tỷ lệ công thành',
    'Lượt đã tích': 'Lượt đã luyện',
    'Chuỗi hiện tại': 'Chuỗi khổ luyện hiện tại',
    'Chuỗi dài nhất': 'Chuỗi khổ luyện dài nhất',
    'Đánh giá': { to: 'Luận bàn', in: '.hb-assess-head' },
    'Đề xuất cải thiện': 'Bí kíp cải thiện',
    'Nhận xét tự động, tính từ dữ liệu tích của bạn.': 'Lời luận tự động, tính từ công phu của các hạ.',
    'Xu hướng hoàn thành mỗi ngày': 'Xu hướng công thành mỗi ngày',
    'Theo từng việc': 'Theo từng môn',
    'Khoảng thời gian báo cáo': 'Khoảng thời gian chiến báo',
    'Tỷ lệ hoàn thành theo thứ trong tuần': 'Tỷ lệ công thành theo thứ trong tuần',
    'Bản đồ nhiệt 13 tuần gần nhất: màu càng đậm càng hoàn thành nhiều': 'Bản đồ nhiệt 13 tuần gần nhất: màu càng đậm càng công thành nhiều',
    'Bạn chưa có việc hằng ngày nào.': 'Các hạ chưa có môn nhật khóa nào.',
    'Chưa có lượt tích nào để đánh giá.': 'Chưa có buổi luyện nào để luận bàn.',
    'Thêm một việc thật nhỏ (ví dụ 2 phút mỗi ngày) rồi quay lại xem báo cáo sau vài ngày.': 'Thêm một môn thật nhỏ (ví dụ 2 phút mỗi ngày) rồi quay lại xem chiến báo sau vài ngày.',
    'Hãy tích vài ngày liên tiếp, báo cáo sẽ hiện nhận xét và đề xuất phù hợp với bạn.': 'Hãy luyện vài ngày liên tiếp, chiến báo sẽ hiện lời luận và bí kíp hợp với các hạ.',
    'Bạn đã rất đều. Có thể nâng nhẹ thử thách: tăng thời lượng khoảng 10% hoặc thêm một việc nhỏ mới.': 'Các hạ đã luyện rất đều. Có thể nâng nhẹ thử thách: tăng thời lượng khoảng 10% hoặc thêm một môn nhỏ mới.',
    'Chọn một việc dễ nhất và chỉ tập trung vào nó trong 7 ngày tới, rồi mở rộng dần.': 'Chọn một môn dễ nhất và chỉ chuyên tâm vào nó trong 7 ngày tới, rồi mở rộng dần.',
    'Mỗi cuối tuần xem lại báo cáo này 2 phút, chọn một điều nhỏ để điều chỉnh cho tuần sau.': 'Mỗi cuối tuần xem lại chiến báo này 2 phút, chọn một điều nhỏ để điều chỉnh cho tuần sau.',
    'Ghi lại một dòng lý do bạn duy trì được, để dùng làm điểm tựa khi chững lại.': 'Ghi lại một dòng lý do các hạ giữ được nhịp, làm điểm tựa khi chững lại.',
    'Đặt mỗi việc vào một khung giờ cố định trong ngày để nó thành nhịp quen thuộc.': 'Đặt mỗi môn vào một khung giờ cố định trong ngày để thành nếp.',
    'Hãy tích hôm nay để bắt đầu': 'Hãy luyện hôm nay để khởi đầu',
    'Chưa có dữ liệu để báo cáo': 'Chưa có công phu để làm chiến báo',
    'Hãy thêm vài việc hằng ngày và tích trong vài ngày, báo cáo sẽ xuất hiện ở đây.': 'Hãy thêm vài môn nhật khóa và luyện trong vài ngày, chiến báo sẽ hiện ở đây.',
  }))
    add(k, v);

  // ---- v1.90.0 (Tàng Bảo): Tàng thư, Ngân khố, Bảo khố ------------------------------------------------------------------------
  for (const [k, v] of Object.entries({
    // Tàng thư
    'Ghim ghi chú': 'Ghim quyển',
    'GHI CHÚ MỚI': 'CHÉP QUYỂN MỚI',
    'CHỈNH SỬA GHI CHÚ': 'CHỈNH SỬA QUYỂN',
    'Đưa lên đầu danh sách Ghi chú': 'Đưa lên đầu Tàng thư',
    'Ghim nhanh ở menu': 'Ghim nhanh ở thanh bên',
    'Truy cập từ menu · tối đa 3 ghi chú': 'Mở từ thanh bên · tối đa 3 quyển',
    'Các bước cần làm': 'Các chiêu cần luyện',
    'Thêm mục checklist': 'Thêm chiêu',
    '＋ Thêm mục': '＋ Thêm chiêu',
    'Mục checklist được lưu tự động khi thêm hoặc thay đổi.': 'Chiêu được lưu tự động khi thêm hoặc thay đổi.',
    'Checklist': { to: 'Chiêu thức', in: '.note-type-field' },
    'Nhãn ghi chú': 'Nhãn quyển',
    'Nhắc tôi': 'Nhắc tại hạ',
    'Bật lịch nhắc cho ghi chú': 'Bật truyền thư nhắc cho quyển này',
    'Gửi email nhắc ghi chú này': 'Gửi email nhắc quyển này',
    'Hệ thống kiểm tra mỗi 5 phút. Bỏ chọn bật lịch nhắc hoặc hoàn tất checklist để ngừng nhắc.': 'Hệ thống kiểm tra mỗi 5 phút. Bỏ chọn truyền thư nhắc hoặc công thành chiêu thức để ngừng nhắc.',
    '✦ Họa tiết ghi chú': '✦ Họa tiết quyển',
    'Chọn họa tiết trang trí tinh tế cho thẻ ghi chú.': 'Chọn họa tiết trang trí tinh tế cho thẻ quyển.',
    'Liên kết với dự án': 'Liên kết với đại sự',
    'Chưa liên kết. Chọn dự án để ghi chú xuất hiện tại dự án đó.': 'Chưa liên kết. Chọn đại sự để quyển xuất hiện tại đại sự đó.',
    'Vị trí ghim ghi chú': 'Vị trí ghim quyển',
    'Ghim nhanh ghi chú': 'Ghim nhanh quyển',
    'Nội dung ghi chú': 'Nội dung quyển',
    'Viết ghi chú…': 'Chép vào quyển…',
    'Nội dung ghi chú được định dạng trực tiếp': 'Nội dung quyển được định dạng trực tiếp',
    'Việc nhỏ tiếp theo…': 'Chiêu nhỏ tiếp theo…',
    'Tùy chọn ghi chú': 'Tùy chọn quyển',
    'Tìm dự án để liên kết': 'Truy tìm đại sự để liên kết',
    'Tìm dự án…': 'Truy tìm đại sự…',
    // Ngân khố
    'Đã chi': { to: 'Đã xuất ngân', in: '.bg-card' },
    'Đã thu hồi': { to: 'Đã thu ngân', in: '.bg-card' },
    'Thu hồi vốn': { to: 'Hồi vốn', in: '.bg-card' },
    'Chi nhiều nhất': 'Xuất ngân nhiều nhất',
    'Lãi nhiều nhất': 'Lời nhiều nhất',
    'Biểu đồ hòa vốn': 'Đồ hòa vốn',
    'tất cả dự án': { to: 'mọi đại sự', in: '.bg-panel' },
    'Chi cộng dồn': 'Xuất ngân cộng dồn',
    'Thu hồi cộng dồn': 'Thu ngân cộng dồn',
    'Dòng tiền theo tháng': 'Ngân lưu theo tháng',
    'Chi': { to: 'Xuất ngân', in: '.bg-trend-key' },
    'Thu': { to: 'Thu ngân', in: '.bg-trend-key' },
    'Chi theo dự án': 'Xuất ngân theo đại sự',
    'Tổng chi': 'Tổng xuất ngân',
    'Tình trạng từng dự án': 'Tình trạng từng đại sự',
    'Chọn dự án để xem phân bổ tài nguyên': 'Chọn đại sự để xem Ngân khố',
    'Sắp xếp dự án': 'Sắp xếp đại sự',
    'Ghi khoản chi (đầu tư) và khoản thu (thu hồi) của dự án này.': 'Ghi khoản xuất ngân (đầu tư) và thu ngân (hồi vốn) của đại sự này.',
    '+ Chi': '+ Xuất ngân',
    '+ Thu': '+ Thu ngân',
    'Hạng mục chi lớn nhất': 'Hạng mục xuất ngân lớn nhất',
    'thu và chi cộng dồn': 'thu ngân và xuất ngân cộng dồn',
    'Quay lại tất cả dự án': 'Quay lại mọi đại sự',
    'Điều hướng Phân bổ tài nguyên': 'Điều hướng Ngân khố',
    'Điều hướng nhanh': 'Lối đi nhanh',
    'Lọc khoản thu chi': 'Lọc khoản thu ngân, xuất ngân',
    'Khoản thu': 'Khoản thu ngân',
    'Khoản chi': 'Khoản xuất ngân',
    'Thêm khoản chi': 'Thêm khoản xuất ngân',
    'Thêm khoản thu': 'Thêm khoản thu ngân',
    'Sửa khoản chi': 'Sửa khoản xuất ngân',
    'Sửa khoản thu': 'Sửa khoản thu ngân',
    'Chi · đầu tư': 'Xuất ngân · đầu tư',
    'Thu · thu hồi': 'Thu ngân · hồi vốn',
    'Số tiền (₫)': 'Số ngân lượng (₫)',
    // Bảo khố
    'Gồm Thùng rác và tệp đang tải · Chỉ bạn xem được': 'Gồm Phế tích và tệp đang tải · Chỉ các hạ xem được',
    'Chưa có tệp phù hợp. Chọn “Tải tệp lên” để lưu ngay tại đây, hoặc thêm tệp trong dự án và ghi chú.': 'Chưa có tệp phù hợp. Chọn “Cất vào bảo khố” để lưu ngay tại đây, hoặc thêm tệp trong đại sự và tàng thư.',
    'Chưa có khoản thu chi nào trong 6 tháng gần đây.': 'Chưa có khoản thu ngân, xuất ngân nào trong 6 tháng gần đây.',
    'Chưa có khoản thu chi nào để vẽ biểu đồ hòa vốn.': 'Chưa có khoản thu ngân, xuất ngân nào để vẽ đồ hòa vốn.',
    'Đã thu hồi đủ vốn': 'Đã thu ngân đủ vốn',
    'Chưa có dự án': { to: 'Chưa có đại sự', in: MAIN },
    'Tạo một dự án để bắt đầu ghi chi và thu hồi.': 'Khởi một đại sự để bắt đầu ghi xuất ngân và thu ngân.',
    'Chọn dự án để ghi khoản đầu tiên': 'Chọn đại sự để ghi khoản đầu tiên',
    'Chưa có khoản chi nào ở dự án nào.': 'Chưa có khoản xuất ngân nào ở đại sự nào.',
    'Bấm “+ Chi” khi bỏ tiền vào dự án, “+ Thu” khi thu hồi được tiền.': 'Bấm “+ Xuất ngân” khi bỏ tiền vào đại sự, “+ Thu ngân” khi thu hồi được tiền.',
    'Đã ghi khoản chi.': 'Đã ghi khoản xuất ngân.',
    'Đã ghi khoản thu.': 'Đã ghi khoản thu ngân.',
    'Viết ghi chú tại đây…': 'Chép vào quyển tại đây…',
    'Nội dung ghi chú tối đa 10.000 ký tự.': 'Nội dung quyển tối đa 10.000 ký tự.',
    'GHI CHÚ KHÁC': 'QUYỂN KHÁC',
    'Ưu tiên ở đầu danh sách Ghi chú': 'Ưu tiên ở đầu Tàng thư',
    'Bỏ ghim ghi chú': 'Bỏ ghim quyển',
    'Menu truy cập nhanh chỉ ghim tối đa 3 ghi chú.': 'Thanh bên chỉ ghim nhanh tối đa 3 quyển.',
    'Gỡ liên kết khỏi ghi chú': 'Gỡ liên kết khỏi quyển',
    'Định dạng văn bản ghi chú': 'Định dạng văn bản quyển',
    'Ghi chú ghim nhanh': 'Quyển ghim nhanh',
    'Ghi chú không tên': 'Quyển không tên',
    'Tất cả ghi chú': 'Mọi quyển',
    'Đã bỏ ghi chú khỏi menu truy cập nhanh.': 'Đã bỏ quyển khỏi thanh bên.',
    'Chọn ngày và giờ nhắc ghi chú.': 'Chọn ngày và giờ nhắc quyển này.',
    'Chưa có ghi chú phù hợp.': 'Chưa có quyển phù hợp.',
    'Nhắc ghi chú': 'Nhắc quyển',
    'Ghi chú đã đặt lịch': 'Quyển đã hẹn nhắc',
  }))
    add(k, v);

  // ---- v1.91.0 (Cơ Quan): Cơ quan (cài đặt), nhập môn, truyền thư, Phong ấn, Phế tích, trạng thái đồng bộ, thông báo nhanh ----------
  // Giữ nguyên theo bảng thuật ngữ: nhóm Giao diện (để luôn tìm được công tắc Phong cách), Dữ liệu & đồng bộ, Cài đặt ứng dụng,
  // các nút Xóa / Xóa dữ liệu / Xóa vĩnh viễn, và mọi câu đòi nhập lại mật khẩu.
  const SETTINGS = '.wf-settings';
  const NOTE = '#toast, [role=status]';
  const AUTH = '#auth-screen';
  const SYNC = '#save-state, #zen-sync-feedback';
  for (const [k, v] of [
    // Cơ quan: tiêu đề và tên nhóm
    ['Cài đặt', { to: 'Cơ quan', in: 'h2:has(~ .wf-settings-group)' }],
    ['Tài khoản của bạn', { to: 'Danh tính của các hạ', in: 'h2:has(~ .wf-settings-group)' }],
    ['Hồ sơ', { to: 'Hành trạng', in: SETTINGS + ' summary' }],
    ['Tài khoản & bảo mật', { to: 'Danh tính & phòng vệ', in: SETTINGS }],
    ['Thông báo', { to: 'Truyền thư', in: SETTINGS + ' summary, h2:has(~ .notice-list)' }],
    ['Tổng kết tuần', { to: 'Chiến báo tuần', in: SETTINGS + ' summary' }],
    ['Hướng dẫn', { to: 'Bí kíp nhập môn', in: SETTINGS + ' summary' }],
    ['Phiên đăng nhập', { to: 'Phiên nhập môn', in: SETTINGS }],
    // Truyền thư trong Cơ quan: ba khối Nhiệm vụ · Nhật khóa · Tu vi
    ['Công việc', { to: 'Nhiệm vụ', in: '.nf-block > h4' }],
    ['Việc hằng ngày', { to: 'Nhật khóa', in: '.nf-block > h4' }],
    ['Điểm tích lũy', { to: 'Tu vi', in: '.nf-block > h4' }],
    // Hành trạng
    ['Hồ sơ cá nhân', { to: 'Hành trạng cá nhân', in: SETTINGS }],
    ['Tên hiển thị', { to: 'Danh xưng', in: SETTINGS }],
    ['Ảnh đại diện', { to: 'Chân dung', in: SETTINGS }],
    ['Xóa ảnh', { to: 'Xóa chân dung', in: SETTINGS }],
    // Phiên nhập môn
    ['Đăng xuất', { to: 'Hạ sơn', in: '.settings-signout' }],
    // Truyền thư (hộp thoại chuông)
    ['Quá hạn', { to: 'Lỡ hẹn', in: '.notice-group' }],
    ['Sắp đến hạn', { to: 'Sắp tới kỳ', in: '.notice-group' }],
    ['Quan trọng', { to: 'Trọng yếu', in: '.notice-group, .notice-tag' }],
    ['quá hạn', { to: 'lỡ hẹn', in: '.notice-stats' }],
    ['sắp đến hạn', { to: 'sắp tới kỳ', in: '.notice-stats' }],
    ['quan trọng', { to: 'trọng yếu', in: '.notice-stats' }],
    ['Xem chi tiết', { to: 'Xem tường tận', in: '.release-actions' }],
    ['Đến giờ nhắc việc', { to: 'Tới giờ luyện nhật khóa', in: '.notice-item' }],
    ['Đến lúc hỏi lại', { to: 'Tới lúc hỏi lại', in: '.notice-item' }],
    // Phong ấn
    ['Xem dự án', { to: 'Xem đại sự', in: '.archive-projects' }],
    ['Khôi phục', { to: 'Giải ấn', in: '.wf-archive-row, [data-project-archive]' }],
    ['Khôi phục', { to: 'Hoàn nguyên', in: '.zen-backup-actions' }],
    ['Lưu trữ', { to: 'Phong ấn', in: '[data-project-archive]' }],
    ['Dọn sạch Thùng rác', { to: 'Dọn sạch Phế tích', in: 'dialog' }],
    // Phế tích: loại mục trên thẻ
    ['Công việc', { to: 'Nhiệm vụ', in: '.recycle-name > small:first-child' }],
    ['Ghi chú', { to: 'Quyển', in: '.recycle-name > small:first-child' }],
    ['Dự án', { to: 'Đại sự', in: '.recycle-name > small:first-child' }],
    ['Mục checklist', { to: 'Chiêu', in: '.recycle-name > small:first-child' }],
    // Trạng thái đồng bộ (viên trạng thái ở thanh trên, khung báo lỗi bên dưới)
    ['Ngoại tuyến', { to: 'Ẩn cư', in: SYNC }],
    ['Chưa kết nối được', { to: 'Chưa thông mạch được', in: SYNC }],
    ['Chưa đồng bộ được', { to: 'Chưa thông mạch được', in: SYNC }],
    // Nhập môn (màn hình đăng nhập)
    ['Ý tưởng', { to: 'Kế sách', in: '.auth-mini' }],
    ['Đang làm', { to: 'Đang hành', in: '.auth-mini' }],
    ['Hoàn thành ✓', { to: 'Công thành ✓', in: '.auth-mini' }],
    ['Mật khẩu', { to: 'Ám hiệu (mật khẩu)', in: AUTH }],
    ['Đăng nhập', { to: 'Nhập môn', in: AUTH }],
    ['Tạo tài khoản', { to: 'Ghi danh', in: AUTH }],
    ['Quên mật khẩu', { to: 'Quên ám hiệu', in: AUTH }],
    ['Mật khẩu mới', { to: 'Ám hiệu mới', in: AUTH }],
    ['Lưu mật khẩu', { to: 'Lưu ám hiệu', in: AUTH }],
    ['Gửi liên kết khôi phục', { to: 'Gửi thư lấy lại ám hiệu', in: AUTH }],
    ['Hiện mật khẩu', { to: 'Hiện ám hiệu (mật khẩu)', in: AUTH }],
    ['Ẩn mật khẩu', { to: 'Ẩn ám hiệu (mật khẩu)', in: AUTH }],
    // Thông báo nhanh và dòng trạng thái: "Đã lưu" → "Đã ghi vào sổ"
    ['Đã lưu.', { to: 'Đã ghi vào sổ.', in: NOTE }],
  ])
    add(k, v);
  for (const [k, v] of Object.entries({
    // Cơ quan
    'Thông tin được lưu riêng theo tài khoản của bạn.': 'Thông tin cất riêng theo danh tính của các hạ.',
    'Lưu hồ sơ': 'Lưu hành trạng',
    'Đồng bộ tự động khi chỉnh sửa. Thiết bị khác nhận cập nhật sau khoảng 10 giây khi đang mở; kết nối lại sẽ gửi dữ liệu chờ.': 'Tự đồng bộ khi chỉnh sửa. Thiết bị khác nhận tin sau khoảng 10 giây khi đang mở; thông mạch lại sẽ gửi dữ liệu còn chờ.',
    'Email hằng ngày: nhắc trước hạn 3 ngày, đến hạn hôm nay và quá hạn.': 'Email hằng ngày: nhắc trước kỳ hạn 3 ngày, tới kỳ hôm nay và lỡ hẹn.',
    'Hằng ngày khi còn việc cần nhắc': 'Hằng ngày khi còn nhiệm vụ cần nhắc',
    'Giờ Việt Nam. Email liệt kê tên công việc, dự án và hạn hoàn thành. Dự án đã lưu trữ không được nhắc.': 'Giờ Việt Nam. Email liệt kê tên nhiệm vụ, đại sự và kỳ hạn công thành. Đại sự đã phong ấn không bị nhắc.',
    'Lưu lịch thông báo': 'Lưu lịch truyền thư',
    'Nhắc hạn trong ứng dụng': 'Nhắc kỳ hạn trong ứng dụng',
    'Hiện thanh nhắc việc quá hạn ở đầu trang và báo thêm khi có việc mới đến hạn.': 'Hiện thanh nhắc nhiệm vụ lỡ hẹn ở đầu trang và báo thêm khi có nhiệm vụ mới tới kỳ.',
    'Thông báo trình duyệt (chỉ thiết bị này)': 'Truyền thư trên trình duyệt (chỉ thiết bị này)',
    'Bật thông báo trình duyệt': 'Bật truyền thư trên trình duyệt',
    'Tắt thông báo thiết bị này': 'Tắt truyền thư trên thiết bị này',
    // v2.49.0: công tắc tên việc trong thông báo trình duyệt (push-names.js) và hai dòng báo trạng thái.
    'Hiện tên việc trong thông báo trình duyệt (áp dụng cho thiết bị này; có thể hiện trên màn hình khóa).': 'Hiện tên nhiệm vụ trong truyền thư trên trình duyệt (chỉ thiết bị này; có thể hiện ngay trên màn hình khóa).',
    'Thông báo sẽ nêu tên việc gấp nhất.': 'Truyền thư sẽ nêu tên nhiệm vụ gấp nhất.',
    'Thông báo chỉ nêu chung, không hiện tên việc.': 'Truyền thư chỉ nêu chung, không lộ tên nhiệm vụ.',
    // v2.50.0: khung báo đầy dữ liệu ở đầu Cài đặt (capacity-warning.js); hai câu có số nằm ở bảng quy tắc bên dưới.
    'Khi đầy, thay đổi mới sẽ không đồng bộ được.': 'Khi đầy, thay đổi mới sẽ không thông mạch được.',
    'Thay đổi mới có thể không đồng bộ được cho tới khi bạn giải phóng chỗ.': 'Thay đổi mới có thể không thông mạch được cho tới khi các hạ giải phóng chỗ.',
    'Nên làm: xóa hẳn các mục trong Thùng rác, bỏ ghi chú hoặc bản phác thảo lớn không còn dùng, xuất bản sao JSON để lưu riêng rồi dọn dự án cũ.': 'Nên làm: xóa hẳn các mục trong Phế tích, bỏ quyển hoặc họa đồ lớn không còn dùng, xuất bản sao JSON cất riêng rồi dọn đại sự cũ.',
    'Xem chi tiết dung lượng': 'Xem tường tận dung lượng',
    // v2.51.0 (Chia Sẻ Vào App): hộp lưu nội dung được chia sẻ từ điện thoại (share-target.js).
    'Lưu nội dung được chia sẻ': 'Cất nội dung được truyền tới',
    'Bỏ qua nội dung được chia sẻ': 'Bỏ qua nội dung được truyền tới',
    'Chọn nơi lưu nội dung vừa chia sẻ vào Zen Studio.': 'Chọn nơi cất nội dung vừa truyền vào Zen Studio.',
    'Lưu thành': 'Cất thành',
    'Ghi chú': { to: 'Quyển', in: '.zen-share-kind span' },
    'Việc': { to: 'Nhiệm vụ', in: '.zen-share-kind span' },
    'Hãy nhập tiêu đề.': 'Hãy ghi tiêu đề.',
    'Bản chỉ xem không lưu được.': 'Bản chỉ xem không cất được.',
    'Dự án': { to: 'Đại sự', in: '.zen-share [data-share-project]' },
    // v2.55.0 (Sao Lưu Hằng Tuần): khối sao lục ở Cài đặt → Dữ liệu & đồng bộ (backups.js).
    'Sao lưu hằng tuần': 'Sao lục hằng tuần',
    'Sao lưu ngay': 'Sao lục ngay',
    'Tải lại danh sách': 'Duyệt lại danh sách',
    'Khôi phục bản này': 'Hoàn nguyên bản này',
    'Xóa bản sao': 'Hủy bản sao lục',
    'Đang tải danh sách…': 'Đang duyệt danh sách…',
    'Kho sao lưu trên máy chủ chưa sẵn sàng nên chưa lưu hay khôi phục được lúc này.': 'Kho sao lục trên máy chủ chưa sẵn sàng nên chưa cất hay hoàn nguyên được lúc này.',
    'Mỗi Chủ nhật, hệ thống tự lưu một bản dữ liệu của bạn lên máy chủ và bỏ qua tuần bạn không đổi gì.': 'Mỗi Chủ nhật, hệ thống tự cất một bản dữ liệu của các hạ lên máy chủ và bỏ qua tuần các hạ không đổi gì.',
    'Sao lưu tự động đang tắt; bạn vẫn sao lưu và khôi phục thủ công được.': 'Sao lục tự hành đang tắt; các hạ vẫn sao lục và hoàn nguyên tự tay được.',
    'Có thể khôi phục về một ngày bất kỳ; dữ liệu hiện tại luôn được lưu thành bản “Trước khi khôi phục” nên vẫn quay lại được. Tệp đính kèm không nằm trong bản sao lưu.': 'Có thể hoàn nguyên về một ngày bất kỳ; dữ liệu hiện tại luôn được cất thành bản “Trước lúc hoàn nguyên” nên vẫn quay lại được. Tệp đính kèm không nằm trong bản sao lục.',
    'Chưa có bản sao lưu nào. Bản đầu tiên sẽ được lưu vào Chủ nhật tới, hoặc bấm “Sao lưu ngay”.': 'Chưa có bản sao lục nào. Bản đầu tiên sẽ được cất vào Chủ nhật tới, hoặc bấm “Sao lục ngay”.',
    // v2.54.0 (Ôn Tuần): hộp thoại ôn tuần, lời mời và khối “Việc trọng tâm” ở Tổng quan, lệnh trong bảng lệnh (weekly-review.js).
    'Ôn tuần': 'Kiểm điểm tuần',
    'Đóng Ôn tuần': 'Đóng Kiểm điểm tuần',
    'Chọn tuần cần ôn': 'Chọn tuần cần kiểm điểm',
    'Bắt đầu ôn tuần': 'Bắt đầu kiểm điểm tuần',
    'Chọn 3 việc cho tuần tới': 'Chọn 3 nhiệm vụ cho tuần tới',
    'Việc trọng tâm tuần này': 'Nhiệm vụ trọng tâm tuần này',
    'Lưu lựa chọn': 'Cất lựa chọn',
    'Đã xong': [
      { to: 'Công thành', in: '.zen-review h3' },
      { to: 'Công thành', in: '.review-focus-row small' },
    ],
    'Chưa xong': { to: 'Chưa thành', in: '.zen-review h3' },
    'Việc hằng ngày': { to: 'Nhật khóa', in: '.zen-review h3' },
    'Thu chi': { to: 'Ngân khố', in: '.zen-review h3' },
    'Đang làm': { to: 'Đang hành sự', in: '.zen-review-when' },
    'Thu': { to: 'Thu ngân', in: '.zen-review-money' },
    'Chi': { to: 'Xuất ngân', in: '.zen-review-money' },
    'Dư': { to: 'Thặng dư', in: '.zen-review-money' },
    'Hụt': { to: 'Thâm hụt', in: '.zen-review-money' },
    'Sắp sang tuần mới. Dành vài phút nhìn lại tuần qua và chọn tối đa 3 việc cho tuần tới.': 'Sắp sang tuần mới. Dành vài phút nhìn lại tuần qua và chọn tối đa 3 nhiệm vụ cho tuần tới.',
    'Chưa có việc nào được ghi nhận hoàn thành trong tuần này. Ôn tuần chỉ nhận việc xong từ khi tính năng này bắt đầu ghi ngày hoàn thành.': 'Chưa có nhiệm vụ nào được ghi nhận công thành trong tuần này. Kiểm điểm tuần chỉ nhận nhiệm vụ công thành từ khi bí kíp này bắt đầu ghi ngày.',
    'Không còn việc nào dở dang đến hết tuần này.': 'Không còn nhiệm vụ nào dở dang đến hết tuần này.',
    'Chưa có việc hằng ngày nào trong tuần này.': 'Chưa có môn nhật khóa nào trong tuần này.',
    'Tuần này chưa ghi khoản thu chi nào.': 'Tuần này chưa ghi khoản ngân khố nào.',
    'Không còn việc nào đang mở để chọn.': 'Không còn nhiệm vụ nào đang mở để chọn.',
    'Tối đa 3 việc. Danh sách được lưu thành một ghi chú để bạn tích dần.': 'Tối đa 3 nhiệm vụ. Danh sách được cất thành một quyển trong Tàng thư để các hạ đánh dấu dần.',
    'Bản chỉ xem không dùng được Ôn tuần.': 'Bản chỉ xem không dùng được Kiểm điểm tuần.',
    'Hãy đóng hộp thoại đang mở trước khi ôn tuần.': 'Hãy đóng hộp thoại đang mở trước khi kiểm điểm tuần.',
    'Hãy chọn ít nhất một việc.': 'Hãy chọn ít nhất một nhiệm vụ.',
    'Các việc đã chọn không còn nữa. Hãy chọn lại.': 'Các nhiệm vụ đã chọn không còn nữa. Hãy chọn lại.',
    'Tối đa 500 ghi chú. Hãy xóa bớt một ghi chú rồi lưu lại.': 'Tối đa 500 quyển. Hãy xóa bớt một quyển rồi cất lại.',
    'Chưa lưu được. Hãy thử lại.': 'Chưa cất được. Hãy thử lại.',
    // v2.52.0 (Việc Chờ Người Khác): trình sửa việc, thẻ việc, khối Tổng quan, chuông (waiting.js).
    'Đang chờ người khác': 'Đang đợi hồi âm',
    'Đang chờ ai': 'Đang đợi ai hồi âm',
    'Nhắc hỏi lại vào ngày': 'Hẹn ngày hỏi lại',
    'Chọn nhanh ngày nhắc': 'Chọn nhanh ngày hẹn',
    'Để trống tên nếu không chờ ai. Đến ngày hẹn, việc hiện ở chuông và Tổng quan để bạn hỏi lại.': 'Để trống tên nếu không đợi ai. Đến ngày hẹn, nhiệm vụ hiện ở Truyền thư và Tổng đàn để các hạ hỏi lại.',
    'Đang chờ': [
      { to: 'Đang đợi hồi âm', in: '.wf-wait-panel h2' },
      { to: 'Đang đợi', in: '.wait-label' },
    ],
    'Đã có phản hồi': 'Đã có hồi âm',
    'Đã ghi nhận phản hồi, việc không còn ở mục Đang chờ.': 'Đã ghi nhận hồi âm, nhiệm vụ không còn ở mục Đang đợi.',
    'Chưa lưu được ghi chú. Hãy thử lại.': 'Chưa cất được quyển. Hãy thử lại.',
    'Chưa lưu được việc. Hãy thử lại.': 'Chưa cất được nhiệm vụ. Hãy thử lại.',
    'Nội dung quá dài: ghi chú tối đa 150 ký tự tiêu đề và 10.000 ký tự nội dung.': 'Nội dung quá dài: quyển tối đa 150 ký tự tiêu đề và 10.000 ký tự nội dung.',
    'Mô tả việc tối đa 5.000 ký tự.': 'Mô tả nhiệm vụ tối đa 5.000 ký tự.',
    'Tiêu đề việc tối đa 200 ký tự.': 'Tiêu đề nhiệm vụ tối đa 200 ký tự.',
    'Dự án này đã đủ 2.000 việc.': 'Đại sự này đã đủ 2.000 nhiệm vụ.',
    'Hãy chọn một dự án.': 'Hãy chọn một đại sự.',
    'Áp dụng cho thiết bị này. Giờ nhắc riêng của từng việc đặt khi thêm hoặc chỉnh sửa việc.': 'Áp dụng cho thiết bị này. Giờ nhắc riêng của từng môn đặt khi thêm hoặc chỉnh sửa môn.',
    'Nhắc đến giờ của từng việc (khung nhắc ở trang Việc hằng ngày và chấm trên chuông).': 'Nhắc khi tới giờ luyện từng môn (khung nhắc ở trang Nhật khóa và chấm trên chuông truyền thư).',
    'Nhắc nhẹ khi hôm nay chưa tích việc nào.': 'Nhắc nhẹ khi hôm nay chưa luyện môn nào.',
    'Chọn hiệp khách ở mục Điểm tích lũy để bật thông báo điểm nghiệp và gợi ý cải thiện hằng tuần.': 'Chọn hiệp khách ở mục Tu vi để bật truyền thư điểm nghiệp và gợi ý cải thiện hằng tuần.',
    'Mở Điểm tích lũy': 'Mở Tu vi',
    'Gộp cuối ngày: xong việc không hiện bảng vận công, việc vào hàng chờ để chia một lượt ở trang Điểm tích lũy.': 'Gộp cuối ngày: công thành không mở bảng vận công, nhiệm vụ vào hàng chờ để chia một lượt ở mục Tu vi.',
    'Đã bật gộp cuối ngày.': 'Đã bật gộp cuối ngày.',
    'Đã trở lại hỏi từng việc.': 'Đã trở lại hỏi từng nhiệm vụ.',
    'Tiến độ dự án và những việc nên ưu tiên cho tuần tới.': 'Tiến cảnh đại sự và những nhiệm vụ nên ưu tiên cho tuần tới.',
    'Email tổng kết hằng tuần': 'Email chiến báo hằng tuần',
    'Xem báo cáo & PDF': 'Xem chiến báo & PDF',
    'Xuất link chia sẻ': 'Phát lệnh bài',
    'Báo cáo thu chi tuần': 'Chiến báo ngân khố tuần',
    'Tổng chi, tổng thu hồi và lãi/lỗ của từng dự án. Email chỉ được gửi khi đã có ít nhất một khoản thu chi trong Phân bổ tài nguyên.': 'Tổng xuất ngân, tổng thu ngân và lãi/lỗ của từng đại sự. Email chỉ được gửi khi đã có ít nhất một khoản thu chi trong Ngân khố.',
    'Email báo cáo thu chi hằng tuần': 'Email chiến báo ngân khố hằng tuần',
    'Ngày gửi tổng kết': 'Ngày gửi chiến báo tuần',
    'Giờ gửi tổng kết, giờ Việt Nam': 'Giờ gửi chiến báo tuần, giờ Việt Nam',
    'Ngày gửi báo cáo thu chi': 'Ngày gửi chiến báo ngân khố',
    'Giờ gửi báo cáo thu chi, giờ Việt Nam': 'Giờ gửi chiến báo ngân khố, giờ Việt Nam',
    'Chưa ghi nhận lần đồng bộ thành công trên thiết bị này.': 'Thiết bị này chưa ghi nhận lần thông mạch thành công nào.',
    'Hoàn tác lần xóa': 'Thu chiêu, lấy lại lần xóa',
    'Thông báo cần được bạn cho phép. Trình duyệt có thể giới hạn thông báo khi bị đóng hoàn toàn. Email nhắc việc có thể tắt bất cứ lúc nào.': 'Truyền thư cần các hạ cho phép. Trình duyệt có thể hạn chế truyền thư khi bị đóng hẳn. Email nhắc nhiệm vụ có thể tắt bất cứ lúc nào.',
    'Hướng dẫn sử dụng': 'Mở bí kíp nhập môn',
    'Tự khóa sau 10 phút không thao tác. Bạn có thể chọn ghi nhớ thiết bị ở lần đăng nhập tiếp theo.': 'Tự khóa sau 10 phút không thao tác. Các hạ có thể chọn ghi nhớ thiết bị ở lần nhập môn tiếp theo.',
    'Đăng xuất tài khoản?': 'Hạ sơn?',
    'Đồng bộ các thay đổi trước khi rời không gian làm việc.': 'Các thay đổi chưa đồng bộ sẽ được gửi lên trước. Các hạ sẽ phải nhập môn lại.',
    // Truyền thư
    'Công việc đang hoạt động · đến hạn trong 3 ngày · tệp mới từ thiết bị khác.': 'Nhiệm vụ đang vận hành · tới kỳ trong 3 ngày · tệp mới từ thiết bị khác.',
    'Xác nhận đã đọc tất cả': 'Xác nhận đã đọc hết truyền thư',
    'Bạn đã xem hết thông báo': 'Các hạ đã đọc hết truyền thư',
    'Việc mới đến hạn sẽ hiện ở đây.': 'Nhiệm vụ mới tới kỳ sẽ hiện ở đây.',
    'Chưa có thông báo.': 'Chưa có truyền thư.',
    'Đã xem thông báo tệp': 'Đã xem truyền thư về tệp',
    'Bấm để xem báo cáo tu luyện': 'Bấm để xem chiến báo tu luyện',
    'Mở việc hằng ngày →': 'Mở Nhật khóa →',
    'Có bản cập nhật mới. Tải lại trang để nhận tính năng mới nhất.': 'Có biên niên mới. Tải lại trang để nhận bí kíp mới nhất.',
    // Phong ấn
    'Khôi phục để làm tiếp': 'Giải ấn để làm tiếp',
    'Chưa có dự án lưu trữ.': 'Chưa có đại sự nào bị phong ấn.',
    'Công việc đã lưu trữ': 'Nhiệm vụ đã phong ấn',
    'Việc giữ nguyên dữ liệu và được tạm ẩn khỏi các góc nhìn đang làm.': 'Nhiệm vụ giữ nguyên dữ liệu, tạm ẩn khỏi các thế trận đang hành.',
    'Lưu trữ dự án?': 'Phong ấn đại sự?',
    'sẽ được chuyển vào Lưu trữ. Trạng thái, checklist và tệp được giữ nguyên để khôi phục sau. Dự án sẽ ngừng nhắc hạn.': 'sẽ được phong ấn. Trạng thái, chiêu thức và tệp được giữ nguyên để giải ấn sau. Đại sự sẽ ngừng nhắc kỳ hạn.',
    'Khôi phục dự án?': 'Giải ấn đại sự?',
    'Bạn có chắc muốn khôi phục': 'Các hạ muốn giải ấn',
    'để tiếp tục làm việc?': 'để tiếp tục hành sự?',
    'Lưu trữ đã chọn': 'Phong ấn đã chọn',
    'Chọn để chuyển trạng thái hoặc lưu trữ nhiều việc cùng lúc': 'Chọn để chuyển trạng thái hoặc phong ấn nhiều nhiệm vụ cùng lúc',
    'Ô vuông: chọn nhiều việc để đổi trạng thái hoặc lưu trữ.': 'Ô vuông: chọn nhiều nhiệm vụ để đổi trạng thái hoặc phong ấn.',
    // Phế tích
    'Tự dọn sau 30 ngày. Xóa vĩnh viễn sẽ không thể khôi phục.': 'Phế tích tự dọn sau 30 ngày. Xóa vĩnh viễn sẽ không thể khôi phục.',
    'Mục trong Thùng rác': 'Mục trong Phế tích',
    'Dự án, ghi chú và công việc': 'Đại sự, tàng thư và nhiệm vụ',
    'Kiểu xem Thùng rác': 'Kiểu xem Phế tích',
    'Không có dữ liệu trong nhóm này.': 'Nhóm này trống trơn.',
    'Dọn sạch Thùng rác?': 'Dọn sạch Phế tích?',
    'Thao tác này không thể hoàn tác. Các mục đã chọn sẽ không còn trong Thùng rác.': 'Thao tác này không thể hoàn tác. Các mục đã chọn sẽ không còn trong Phế tích.',
    'Chuyển tệp vào Thùng rác?': 'Chuyển tệp vào Phế tích?',
    'Bạn có thể khôi phục lần xóa gần nhất trong Settings. Nên xuất bản sao trước khi xóa dữ liệu quan trọng.': 'Các hạ có thể thu chiêu, lấy lại lần xóa gần nhất trong Cơ quan. Nên xuất bản sao trước khi xóa dữ liệu quan trọng.',
    // Trạng thái đồng bộ
    'Chưa kết nối được máy chủ · Đã lưu trên thiết bị': 'Chưa thông mạch với máy chủ · Đã lưu trên thiết bị',
    'Bản nháp vẫn ở thiết bị, chưa mất dữ liệu.': 'Bản nháp vẫn ở thiết bị, dữ liệu vẹn toàn.',
    'Bản trên thiết bị của bạn được giữ nguyên, chưa bị ghi đè.': 'Bản trên thiết bị của các hạ được giữ nguyên, chưa bị ghi đè.',
    // Nhập môn
    'KHÔNG GIAN LÀM VIỆC CÁ NHÂN': 'GIANG HỒ RIÊNG CỦA CÁC HẠ',
    'Gọn công việc.': 'Gọn nhiệm vụ.',
    'Từ ý tưởng đầu tiên đến công việc hoàn thành.': 'Từ kế sách đầu tiên đến nhiệm vụ công thành.',
    'Mọi dự án của bạn, luôn ở cùng một nơi.': 'Mọi đại sự của các hạ, quy về một mối.',
    'CHÀO MỪNG BẠN': 'HOAN NGHÊNH CÁC HẠ',
    'Trở lại không gian của bạn': 'Trở lại giang hồ của các hạ',
    'Quên mật khẩu?': 'Quên ám hiệu?',
    'Giữ đăng nhập 30 ngày trên máy này. Bỏ chọn nếu đây là máy dùng chung.': 'Giữ nhập môn 30 ngày trên máy này. Bỏ chọn nếu đây là máy dùng chung.',
    'Mật khẩu từ 10 ký tự. Không dùng lại mật khẩu ở nơi khác.': 'Ám hiệu từ 10 ký tự. Đừng dùng lại ám hiệu ở nơi khác.',
    'Dữ liệu riêng theo tài khoản · Đồng bộ giữa thiết bị': 'Dữ liệu riêng theo danh tính · Đồng bộ giữa thiết bị',
    'Email hoặc mật khẩu chưa đúng.': 'Email hoặc ám hiệu chưa đúng.',
    'Email đã được xác minh. Bạn có thể đăng nhập.': 'Email đã được xác minh. Các hạ có thể nhập môn.',
    'Vui lòng xác minh email trước khi đăng nhập. Bạn có thể gửi lại email xác minh.': 'Hãy xác minh email trước khi nhập môn. Các hạ có thể gửi lại email xác minh.',
    'Đã đặt lại mật khẩu. Vui lòng đăng nhập.': 'Đã đặt lại ám hiệu. Mời các hạ nhập môn.',
    'Phiên đăng nhập đã hết hạn.': 'Phiên nhập môn đã hết hạn.',
    'Vui lòng đăng nhập.': 'Mời các hạ nhập môn.',
    'Yêu cầu đăng ký đã được tiếp nhận. Hãy kiểm tra hộp thư đến và Thư rác để tìm email “Xác minh email Zen Studio”, rồi mở liên kết và bấm “Xác minh email” để hoàn tất. Nếu email đã có tài khoản, hãy đăng nhập hoặc dùng Quên mật khẩu.': 'Đơn ghi danh đã được tiếp nhận. Hãy kiểm tra hộp thư đến và Thư rác để tìm email “Xác minh email Zen Studio”, rồi mở liên kết và bấm “Xác minh email” để hoàn tất. Nếu email đã có danh tính, hãy nhập môn hoặc dùng Quên ám hiệu.',
  }))
    add(k, v);
  // Thông báo nhanh (góc màn hình) và dòng trạng thái: giọng giang hồ nhưng vẫn nói rõ chuyện gì và cách sửa.
  for (const [k, v] of Object.entries({
    'Đã lưu công việc': 'Đã ghi nhiệm vụ vào sổ.',
    'Đã lưu dự án.': 'Đã ghi đại sự vào sổ.',
    'Đã lưu dự án. Một ý tưởng đang lớn lên!': 'Đã ghi đại sự vào sổ. Một kế sách đang thành hình!',
    'Đã lưu cài đặt email.': 'Đã ghi cài đặt email vào sổ.',
    'Đã lưu tùy chọn nhắc hạn.': 'Đã ghi tùy chọn nhắc kỳ hạn vào sổ.',
    'Đã lưu giới hạn việc mỗi cột.': 'Đã ghi giới hạn nhiệm vụ mỗi cột vào sổ.',
    'Đã lưu trữ dự án.': 'Đã phong ấn đại sự.',
    'Đã khôi phục dự án.': 'Đã giải ấn đại sự.',
    'Đã lưu trữ các công việc đã chọn.': 'Đã phong ấn các nhiệm vụ đã chọn.',
    'Đã chuyển trạng thái các công việc đã chọn.': 'Đã chuyển trạng thái các nhiệm vụ đã chọn.',
    'Đã xóa. Có thể hoàn tác trong Settings.': 'Đã xóa. Có thể thu chiêu trong Cơ quan.',
    'Đã khôi phục dữ liệu trước lần xóa gần nhất.': 'Đã thu chiêu, lấy lại dữ liệu trước lần xóa gần nhất.',
    'Đã chuyển tệp vào Thùng rác.': 'Đã chuyển tệp vào Phế tích.',
    'Thùng rác đang trống.': 'Phế tích trống trơn.',
    'Đã đổi thứ tự việc.': 'Đã đổi thứ tự nhật khóa.',
    'Đã liên kết ghi chú.': 'Đã liên kết quyển.',
    'Đã liên kết ghi chú với công việc.': 'Đã liên kết quyển với nhiệm vụ.',
    'Đã bỏ liên kết; ghi chú vẫn được giữ.': 'Đã bỏ liên kết; quyển vẫn được giữ.',
    'Đã bỏ liên kết. Ghi chú vẫn được giữ.': 'Đã bỏ liên kết. Quyển vẫn được giữ.',
    'Đã hoàn tất phiên tập trung. Hãy nghỉ ngơi một chút.': 'Đã xuất quan. Các hạ nghỉ ngơi dưỡng sức chốc lát.',
    'Đã hoàn tác lịch.': 'Đã thu chiêu, trả lại ngày cũ.',
    'Đã cập nhật lịch công việc.': 'Đã cập nhật ngày giờ nhiệm vụ.',
    'Đã bật thông báo nhắc việc hằng ngày trên thiết bị này.': 'Đã bật truyền thư nhắc nhật khóa trên thiết bị này.',
    'Đã tắt thông báo trên thiết bị này.': 'Đã tắt truyền thư trên thiết bị này.',
    'Đã tắt email tổng kết.': 'Đã tắt email chiến báo tuần.',
    'Đã hợp nhất. Các nội dung khác nhau được giữ thành bản sao để bạn đối chiếu.': 'Đã hợp nhất. Các nội dung khác nhau được giữ thành bản sao để các hạ đối chiếu.',
    'Phiên đăng nhập hết hạn. Bản nháp vẫn ở trên thiết bị.': 'Phiên nhập môn hết hạn. Bản nháp vẫn ở trên thiết bị.',
    'Còn dữ liệu chưa đồng bộ. Hãy xuất JSON hoặc chờ đồng bộ trước khi đăng xuất.': 'Còn dữ liệu chưa đồng bộ. Hãy xuất JSON hoặc chờ đồng bộ trước khi hạ sơn.',
    'Chưa lưu được. Hãy thử lại.': 'Chưa ghi vào sổ được. Hãy thử lại.',
    'Chưa lưu được thay đổi.': 'Chưa ghi được thay đổi vào sổ.',
    'Chưa lưu được xác nhận. Kiểm tra kết nối rồi thử lại.': 'Chưa ghi được xác nhận. Kiểm tra thông mạch rồi thử lại.',
    'Chưa lưu được trạng thái đã đọc. Hãy thử lại.': 'Chưa ghi được dấu đã đọc truyền thư. Hãy thử lại.',
    'Chưa lấy được dữ liệu máy chủ. Bản chỉnh sửa của bạn vẫn được giữ.': 'Chưa lấy được dữ liệu máy chủ. Bản chỉnh sửa của các hạ vẫn được giữ.',
    'Hãy kiểm tra nội dung trước khi lưu.': 'Các hạ xem lại nội dung rồi hãy lưu.',
    'Tên công việc không được để trống.': 'Tên nhiệm vụ không được để trống.',
    'Tạo dự án trước khi thêm công việc.': 'Khởi đại sự trước khi thêm nhiệm vụ.',
    'Việc này đã tồn tại.': 'Nhiệm vụ này đã có.',
    'Dự án đã tồn tại.': 'Đại sự này đã có.',
    'Ghi chú đã tồn tại.': 'Quyển này đã có.',
    'Tối đa 100 dự án.': 'Tối đa 100 đại sự.',
    'Tối đa 100 dự án. Hãy xuất bản sao và lưu trữ các dự án cũ.': 'Tối đa 100 đại sự. Hãy xuất bản sao và phong ấn các đại sự cũ.',
    'Tối đa 2.000 việc mỗi dự án.': 'Tối đa 2.000 nhiệm vụ mỗi đại sự.',
    'Tối đa 20 cột mỗi dự án.': 'Tối đa 20 cột mỗi đại sự.',
    'Tối đa 200 mục checklist.': 'Tối đa 200 chiêu.',
    'Tối đa 200 mục checklist mỗi việc.': 'Tối đa 200 chiêu mỗi nhiệm vụ.',
    'Tối đa 200 mục checklist, mỗi mục tối đa 300 ký tự.': 'Tối đa 200 chiêu, mỗi chiêu tối đa 300 ký tự.',
    'Tối đa 500 ghi chú.': 'Tối đa 500 quyển.',
    'Nội dung checklist không được để trống.': 'Nội dung chiêu không được để trống.',
    'Nội dung mục không được để trống. Dùng nút × để xóa mục.': 'Nội dung chiêu không được để trống. Dùng nút × để bỏ chiêu.',
    'Mỗi công việc tối đa 20 từ khóa.': 'Mỗi nhiệm vụ tối đa 20 từ khóa.',
    'Tối đa 5 từ khóa dự án. Hãy bỏ các từ khóa không cần thiết.': 'Tối đa 5 từ khóa đại sự. Hãy bỏ các từ khóa không cần thiết.',
    'Kiểm tra tên và khoảng thời gian công việc.': 'Kiểm tra tên và khoảng thời gian nhiệm vụ.',
    'Công việc đã thay đổi hoặc bị xóa trên thiết bị khác. Hãy mở lại dự án.': 'Nhiệm vụ đã thay đổi hoặc bị xóa trên thiết bị khác. Hãy mở lại đại sự.',
    'Một dự án không có trạng thái này. Hãy chọn lại các công việc phù hợp.': 'Một đại sự không có trạng thái này. Hãy chọn lại các nhiệm vụ phù hợp.',
    'Ghi chú đã bị xóa trên thiết bị khác. Nội dung đang nhập được giữ để bạn sao chép.': 'Quyển đã bị xóa trên thiết bị khác. Nội dung đang nhập được giữ để các hạ sao chép.',
    'Ghi chú đang được sửa cùng lúc trên thiết bị khác. Hãy giữ nội dung đang nhập trước khi mở lại.': 'Quyển đang được sửa cùng lúc trên thiết bị khác. Hãy giữ nội dung đang nhập trước khi mở lại.',
    'Cần đồng bộ dự án trước khi gửi tệp.': 'Cần đồng bộ đại sự trước khi gửi tệp.',
    'Hãy tạo ít nhất một dự án hoặc ghi chú trước khi tải tệp.': 'Hãy khởi ít nhất một đại sự hoặc chép một quyển trước khi cất tệp.',
    'Lịch đã thay đổi tiếp; hãy mở công việc để kiểm tra.': 'Ngày giờ đã thay đổi tiếp; hãy mở nhiệm vụ để kiểm tra.',
    'Lịch vừa thay đổi trên thiết bị khác. Hãy kéo lại.': 'Ngày giờ vừa thay đổi trên thiết bị khác. Hãy kéo lại.',
    'Chưa có điểm để quy đổi. Hoàn thành việc để tu luyện trước.': 'Chưa có điểm để quy đổi. Hoàn thành nhiệm vụ để tu luyện trước.',
    'Đang ngoại tuyến. Kết nối mạng rồi thử lại; Thùng rác chưa bị xóa.': 'Đang ẩn cư. Thông mạch rồi thử lại; Phế tích chưa bị xóa.',
    'Đang ngoại tuyến. Dữ liệu trên thiết bị vẫn được giữ.': 'Đang ẩn cư. Dữ liệu trên thiết bị vẫn vẹn toàn.',
    'Dữ liệu có xung đột. Mở Cài đặt → Dữ liệu để xử lý trước khi dọn rác.': 'Dữ liệu có xung đột. Mở Cơ quan → Dữ liệu để xử lý trước khi dọn Phế tích.',
    'Chưa đồng bộ được dữ liệu. Mở Cài đặt → Đồng bộ ngay để xem chi tiết.': 'Chưa thông mạch được. Mở Cơ quan → Đồng bộ ngay để xem tường tận.',
    'Chưa gửi được thay đổi. Bản trên thiết bị đã lưu; kết nối lại để hoàn tất đồng bộ.': 'Chưa gửi được thay đổi. Bản trên thiết bị đã lưu; thông mạch lại để hoàn tất đồng bộ.',
    'Có thay đổi chưa lưu · Chọn Lưu để xác nhận.': 'Có thay đổi chưa ghi vào sổ · Chọn Lưu để xác nhận.',
    'Công việc mới chưa được lưu.': 'Nhiệm vụ mới chưa được ghi vào sổ.',
  }))
    add(k, { to: v, in: NOTE });
  // ---- v1.95.0 (Bổ Khuyết): chỗ còn sót sau đánh giá v1.91.0 và trang Bí kíp nhập môn ------------------------------------------
  const HELP = 'dialog';
  for (const [k, v] of [
    ['dự án', { to: 'đại sự', in: '.home-project-total' }],
    ['Tổng quan', { to: 'Tổng đàn', in: '.tab-home' }],
    // v2.39.0 (Thanh Dưới Điện Thoại): nhãn năm ô của thanh dưới đáy; cùng tên giang hồ với menu bên.
    ['Tổng quan', { to: 'Tổng đàn', in: '.zbb-label' }],
    ['Bảng', { to: 'Cáo thị', in: '.zbb-label' }],
    ['Thêm', { to: 'Ghi nhanh', in: '.zbb-label' }],
    ['Hằng ngày', { to: 'Nhật khóa', in: '.zbb-label' }],
    ['Ghi chú', { to: 'Tàng thư', in: '.zbb-label' }],
    ['Kho', { to: 'Hậu viện', in: '.nav-more-summary' }],
    // v2.44.0 (Trang Trống Có Hồn): nút hành động chính trong khối trang trống (dist/empty-states.js).
    ['Chưa có dự án. Bắt đầu với nút “Tạo dự án”.', { to: 'Chưa có đại sự. Bắt đầu với nút “Khởi đại sự”.', in: MAIN }],
    ['Tạo dự án', { to: 'Khởi đại sự', in: '.zen-empty-action' }],
    ['Ghi chú mới', { to: 'Chép quyển mới', in: '.zen-empty-action' }],
    ['Xem dự án', { to: 'Xem đại sự', in: '.zen-empty-action' }],
    ['Tải tệp lên', { to: 'Cất vào bảo khố', in: '.zen-empty-action' }],
    // v2.46.0 (Bảng Phím Tắt): hộp thoại phím tắt (dist/shortcuts.js).
    ['Phím tắt', { to: 'Khẩu quyết phím', in: '.zen-shortcuts' }],
    ['Chung', { to: 'Thông dụng', in: '.zen-shortcuts' }],
    ['Tạo mới', { to: 'Khởi tạo', in: '.zen-shortcuts' }],
    ['Tab dự án', { to: 'Thẻ đại sự', in: '.zen-shortcuts' }],
    ['Gantt', { to: 'Trận đồ', in: '.zen-shortcuts' }],
    ['Mở bảng lệnh: tìm dự án, việc, trang, cài đặt', { to: 'Mở bảng lệnh: truy tìm đại sự, nhiệm vụ, trang, cơ quan', in: '.zen-shortcuts' }],
    ['Mở bảng phím tắt này', { to: 'Mở bảng khẩu quyết phím này', in: '.zen-shortcuts' }],
    ['Tạo việc mới (khi đang mở một dự án) hoặc tạo dự án (khi chưa mở dự án)', { to: 'Khởi nhiệm vụ mới (khi đang xem một đại sự) hoặc khởi đại sự (khi chưa xem đại sự nào)', in: '.zen-shortcuts' }],
    ['Dời tab dự án đang chọn sang trái hoặc phải (khi đã đặt tiêu điểm vào tab)', { to: 'Dời thẻ đại sự đang chọn sang trái hoặc phải (khi đã trỏ vào thẻ)', in: '.zen-shortcuts' }],
    ['Uốn đường nối đang chọn sang trái hoặc phải (khi đã đặt tiêu điểm vào điểm uốn)', { to: 'Uốn đường nối đang chọn sang trái hoặc phải (khi đã trỏ vào điểm uốn)', in: '.zen-shortcuts' }],
    ['Công việc cần chú ý', { to: 'Nhiệm vụ cần chú ý', in: 'h2:has(~ .due-work-tabs)' }],
    ['Đăng xuất', { to: 'Hạ sơn', in: '#editor-form:has([data-confirm=signout]) .modal-foot' }],
    ['Tổng kết tuần', { to: 'Chiến báo tuần', in: '.report-dialog-toolbar' }],
  ])
    add(k, v);
  for (const [k, v] of Object.entries({
    'Đang ẩn vì Thẻ gọn. Tắt Thẻ gọn để hiện checklist.': 'Đang ẩn vì Thẻ gọn. Tắt Thẻ gọn để hiện chiêu thức.',
    'Các dự án': 'Các đại sự',
    'Thêm tab dự án': 'Thêm tab đại sự',
    'Ý tưởng, Công việc, Gia đình…': 'Kế sách, Nhiệm vụ, Gia đình…',
    'Emoji Unicode · Hình hiển thị theo thiết bị của bạn.': 'Emoji Unicode · Hình hiển thị theo thiết bị của các hạ.',
    'Bản xem trước giống nội dung email': 'Bản xem trước giống thư gửi qua email',
    'Chia sẻ web': { to: 'Phát lệnh bài', in: '.report-dialog-toolbar' },
    'Đóng báo cáo': 'Đóng chiến báo',
    'Xem trước tổng kết tuần': 'Xem trước chiến báo tuần',
    // v2.0.0 (Truyền Âm)
    'Phong cách đi theo tài khoản: đổi ở đây thì các thiết bị khác cũng đổi theo khi mở. Email nhắc hạn và chiến báo tuần dùng giọng giang hồ khi chọn Giang hồ.':
      'Phong cách đi theo danh tính: đổi ở đây thì các thiết bị khác cũng đổi theo khi mở. Thư nhắc kỳ hạn và chiến báo tuần dùng giọng giang hồ khi chọn Giang hồ.',
    // Bí kíp nhập môn (Cài đặt → Hướng dẫn sử dụng)
    'Mỗi việc rõ hơn, mỗi ngày nhẹ hơn': { to: 'Mỗi nhiệm vụ rõ hơn, mỗi ngày nhẹ hơn', in: HELP },
    'Ghi lại điều cần nhớ. Chọn điều cần làm. Dành chỗ cho sự tập trung.': 'Chép lại điều cần nhớ. Chọn nhiệm vụ cần làm. Dành chỗ cho bế quan.',
    'Bắt đầu từ một việc nhỏ': { to: 'Khởi đầu từ một nhiệm vụ nhỏ', in: HELP },
    'Chọn một dự án, nhìn việc đang làm và bước tiếp theo. Tiến độ là lời nhắc để điều chỉnh nhịp, không phải thước đo sự bận rộn.': 'Chọn một đại sự, xem nhiệm vụ đang hành và chiêu kế tiếp. Tiến cảnh là lời nhắc để điều chỉnh nhịp, không phải thước đo sự bận rộn.',
    'Sắp xếp theo cách của bạn': { to: 'Bày trận theo ý các hạ', in: HELP },
    'Kéo tay nắm để đổi thứ tự việc, checklist và ghi chú. Điện thoại dùng cùng tay nắm; bàn phím dùng Alt + ↑/↓. Kéo việc sang cột khác để đổi trạng thái.': 'Kéo tay nắm để đổi thứ tự nhiệm vụ, chiêu thức và quyển. Điện thoại dùng cùng tay nắm; bàn phím dùng Alt + ↑/↓. Kéo nhiệm vụ sang cột khác để đổi trạng thái.',
    'Viết rõ, làm gọn': { to: 'Viết rõ, ra chiêu gọn', in: HELP },
    'Tên việc nói lên kết quả cần đạt. Dùng định dạng trong mô tả để chia ý; checklist giữ từng bước cụ thể. Nút Thêm lưu nội dung đang chỉnh và mở tiếp danh sách.': 'Tên nhiệm vụ nói lên kết quả cần đạt. Dùng định dạng trong mô tả để chia ý; chiêu thức giữ từng bước cụ thể. Nút Thêm lưu nội dung đang chỉnh và mở tiếp danh sách.',
    'Ghi lại khi ý tưởng đến': { to: 'Chép ngay khi kế sách đến', in: HELP },
    'Ghi chú tự lưu sau khi dừng gõ một nhịp, kể cả tiêu đề, liên kết và checklist. Xem trạng thái lưu trong khung. Ghim điều cần nhớ, kéo thả để sắp xếp; chọn Xong khi muốn đóng.': 'Quyển tự ghi vào sổ sau khi dừng gõ một nhịp, kể cả tiêu đề, liên kết và chiêu thức. Xem trạng thái lưu trong khung. Ghim điều cần nhớ, kéo thả để sắp xếp; chọn Xong khi muốn đóng.',
    'Giữ lại, rồi nhẹ nhàng bước tiếp': { to: 'Phong ấn, rồi nhẹ nhàng bước tiếp', in: HELP },
    'Lưu trữ dự án hoặc việc để tạm ẩn và có thể mở lại. Chuyển khi đổi dự án; Sao chép khi muốn tạo việc tương tự. Thùng rác giữ mục đã xóa 30 ngày.': 'Phong ấn đại sự hoặc nhiệm vụ để tạm ẩn, giải ấn khi cần. Dời sang đại sự khác khi đổi chỗ; Sao chép khi muốn tạo nhiệm vụ tương tự. Phế tích giữ mục đã xóa 30 ngày.',
    'Để công việc được tiếp nối': { to: 'Để nhiệm vụ được tiếp nối', in: HELP },
    'Biểu tượng đồng bộ cho biết bản trên thiết bị đã gửi lên hay đang chờ. Khi mất mạng, tiếp tục ghi chép; nếu báo lỗi, giữ bản nháp và mở Cài đặt để kiểm tra. Xuất JSON định kỳ cho những điều quan trọng.': 'Biểu tượng đồng bộ cho biết bản trên thiết bị đã thông mạch hay đang chờ. Khi ẩn cư (mất mạng), cứ tiếp tục ghi chép; nếu báo lỗi, giữ bản nháp và mở Cơ quan để kiểm tra. Xuất JSON định kỳ cho những điều quan trọng.',
  }))
    add(k, v);
  const money = (s) => s.replace(/đã chi/g, 'đã xuất ngân').replace(/đã thu hồi/g, 'đã thu ngân').replace(/ chi /g, ' xuất ').replace(/số đã chi/g, 'số đã xuất ngân');

  // Mẫu có phần thay đổi: [biểu thức, chữ mới hoặc hàm, vùng (tùy chọn), chữ bắt buộc có (lọc nhanh trước khi thử biểu thức)].
  // Câu tóm tắt của chuông (nhãn nút ở thanh trên, dòng đầu hộp thoại Truyền thư): đổi từng cụm, giữ nguyên các con số.
  // v2.55.0 (Sao Lưu Hằng Tuần): câu trạng thái của khối sao lục ghép từ nhiều đoạn (kể cả lời máy chủ), nên đổi từng từ.
  const backupWords = (s) =>
    s
      .replaceAll('Trước khi khôi phục', 'Trước lúc hoàn nguyên')
      .replaceAll('bản sao lưu', 'bản sao lục')
      .replaceAll('sao lưu', 'sao lục')
      .replaceAll('Sao lưu', 'Sao lục')
      .replaceAll('khôi phục', 'hoàn nguyên')
      .replaceAll('Khôi phục', 'Hoàn nguyên')
      .replaceAll('đồng bộ', 'thông mạch')
      .replaceAll('Hãy thông mạch', 'Hãy thông mạch')
      .replaceAll('dự án', 'đại sự')
      .replaceAll('bản sao ', 'bản sao lục ')
      .replaceAll('Đã xóa bản sao.', 'Đã hủy bản sao lục.')
      .replaceAll('Thủ công', 'Tự tay')
      .replaceAll('Tự động', 'Tự hành');
  const noticeWords = (s) =>
    s
      .replace(/([Kk])hông có việc quá hạn hay đến hạn/g, '$1hông có nhiệm vụ lỡ hẹn hay tới kỳ')
      .replace(/(\d+) việc cần chú ý/g, '$1 nhiệm vụ cần chú ý')
      .replace(/Còn (\d+) việc quan trọng chưa tới hạn/g, 'Còn $1 nhiệm vụ trọng yếu chưa tới kỳ')
      .replace(/ quá hạn/g, ' lỡ hẹn')
      .replace(/ đến hạn trong 3 ngày/g, ' tới kỳ trong 3 ngày')
      .replace(/sắp đến hạn/g, 'sắp tới kỳ')
      .replace(/đến hạn hôm nay/g, 'tới kỳ hôm nay')
      .replace(/phiên bản mới/g, 'biên niên mới')
      .replace(/(\d+) nhắc ghi chú/g, '$1 nhắc quyển')
      .replace(/(\d+) việc đến giờ nhắc/g, '$1 môn nhật khóa tới giờ luyện');
  const bell = (s) => 'Truyền thư' + noticeWords(s.slice('Thông báo'.length));
  // Trạng thái đồng bộ: "đồng bộ thành công" = thông mạch, "ngoại tuyến" = ẩn cư.
  const SYNC_WORDS = {
    'Ngoại tuyến · Bạn vẫn có thể chỉnh sửa': 'Ẩn cư · Các hạ vẫn chỉnh sửa được, sẽ đồng bộ khi thông mạch.',
    'Chưa kết nối được máy chủ · Đã lưu trên thiết bị': 'Chưa thông mạch với máy chủ · Đã lưu trên thiết bị',
    'Dữ liệu đã được máy chủ xác nhận': 'Đã thông mạch, dữ liệu vẹn toàn',
    'Chưa ghi nhận lần đồng bộ thành công trên thiết bị này': 'Thiết bị này chưa ghi nhận lần thông mạch thành công nào',
  };
  const syncWords = (s) => SYNC_WORDS[s] || s.replace(/^Đã đồng bộ lúc/, 'Đã thông mạch lúc').replace(/^Chưa đồng bộ được/, 'Chưa thông mạch được');
  // ---- v2.63.1 (Liên Hoàn Lệnh): trang chuỗi việc ưu tiên xuyên dự án (worklist.js) --------------------------------------------------------
  // Chữ dài, chỉ có ở trang này: đổi nguyên câu. Chữ ngắn dễ trùng nội dung người dùng (Khẩn cấp, Thường…): chỉ đổi trong đúng vùng của nó.
  for (const [plain, gh] of Object.entries({
    'CHUỖI VIỆC XUYÊN DỰ ÁN': 'CHUỖI NHIỆM VỤ XUYÊN ĐẠI SỰ',
    'Những việc cần làm sớm, xếp theo thứ tự bạn chọn, không phân biệt dự án. Xong việc thì tự rời chuỗi; chưa xong thì ở nguyên chỗ cũ cho tới khi bạn gỡ.':
      'Những nhiệm vụ cần xuất chiêu sớm, xếp theo thứ tự các hạ định, bất kể đại sự nào. Nhiệm vụ công thành thì tự rời chuỗi; chưa xong thì ở yên chỗ cũ cho tới khi các hạ gỡ.',
    'Mở một việc bất kỳ rồi bấm “Liên hoàn lệnh” cạnh nút “Chế độ tập trung”, hoặc chọn việc ở khung bên dưới. Việc nào xong sẽ tự rời chuỗi.':
      'Mở một nhiệm vụ bất kỳ rồi bấm “Liên hoàn lệnh” cạnh nút “Bế quan”, hoặc chọn nhiệm vụ ở khung bên dưới. Nhiệm vụ nào công thành sẽ tự rời chuỗi.',
    'Ghi thêm việc vào chuỗi': 'Ghi thêm nhiệm vụ vào chuỗi',
    'Tìm việc theo tên hoặc dự án': 'Tìm nhiệm vụ theo tên hoặc đại sự',
    'Mọi việc chưa xong đều đã nằm trong chuỗi.': 'Mọi nhiệm vụ chưa thành đều đã nằm trong chuỗi.',
    'Không có việc nào khớp.': 'Không có nhiệm vụ nào khớp.',
    'Gỡ việc này khỏi Liên hoàn lệnh': 'Gỡ nhiệm vụ này khỏi Liên hoàn lệnh',
    'Ghi việc này vào Liên hoàn lệnh để làm sớm': 'Ghi nhiệm vụ này vào Liên hoàn lệnh để xuất chiêu sớm',
    'Liên hoàn lệnh: chuỗi việc ưu tiên xuyên mọi dự án': 'Liên hoàn lệnh: chuỗi nhiệm vụ ưu tiên xuyên mọi đại sự',
  }))
    add(plain, gh);
  for (const [plain, to, scope] of [
    ['việc trong chuỗi', 'nhiệm vụ trong chuỗi', '.wl-sum'],
    ['khẩn cấp', 'hỏa tốc', '.wl-sum'],
    ['quá hạn', 'lỡ hẹn', '.wl-sum'],
    ['dự án', 'đại sự', '.wl-sum'],
    ['Màu dự án', 'Màu đại sự', '.wl-legend'],
    ['Khẩn cấp', 'Hỏa tốc', '.wl-chip-urgent'],
    ['Chưa phân loại', 'Chưa định cấp', '.wl-chip-calm'],
    ['Thường', 'Thứ yếu', '.wl-chip-calm'],
  ])
    add(plain, { to, in: scope });
  // ---- v2.64.0 (Báo Cáo Liên Hoàn): báo cáo đính kèm cuối trang chuỗi (worklist-report.js) ---------------------------------------------------
  for (const [plain, gh] of Object.entries({
    'Báo cáo Liên hoàn lệnh': 'Chiến báo Liên hoàn lệnh',
    'Chuỗi đang trống, không có việc nào nằm chờ.': 'Chuỗi đang trống, không có nhiệm vụ nào nằm chờ.',
    'Chưa có số liệu. Báo cáo sẽ hiện ngay khi bạn ghi việc đầu tiên vào chuỗi.': 'Chưa có số liệu. Chiến báo sẽ hiện ngay khi các hạ ghi nhiệm vụ đầu tiên vào chuỗi.',
    'Ghi vào và hoàn thành theo ngày': 'Ghi vào và công thành theo ngày',
    'Việc còn trong chuỗi theo dự án': 'Nhiệm vụ còn trong chuỗi theo đại sự',
    'Tuổi của việc còn trong chuỗi': 'Tuổi của nhiệm vụ còn trong chuỗi',
    'Việc nằm lâu nhất trong chuỗi:': 'Nhiệm vụ nằm lâu nhất trong chuỗi:',
  }))
    add(plain, gh);
  for (const [plain, to, scope] of [
    ['Xem báo cáo', 'Xem chiến báo', '.wl-jump'],
    ['Theo dự án', 'Theo đại sự', '.wlr-card'],
    ['Đã xong', 'Công thành', '.wlr-label, .wlr-legend, .wlr-tables th'],
    ['Tỉ lệ xong', 'Tỉ lệ công thành', '.wlr-label'],
    ['Từ ghi đến xong', 'Từ ghi đến công thành', '.wlr-label'],
    ['trung bình mỗi việc', 'trung bình mỗi nhiệm vụ', '.wlr-kpis small'],
    ['Dự án', 'Đại sự', '.wlr-tables th'],
    ['Số việc', 'Số nhiệm vụ', '.wlr-tables th'],
  ])
    add(plain, { to, in: scope });
  // ---- v2.65.0 (Chiến Báo Hoàn Thiện): biểu đồ theo tuần, khung bổ sung ngày xong ----------------------------------------------------------
  for (const [plain, gh] of Object.entries({
    'Ghi vào và hoàn thành theo tuần': 'Ghi vào và công thành theo tuần',
    'Bổ sung ngày xong': 'Bổ sung ngày công thành',
    'Chọn ngày thật sự xong rồi bấm Lưu ngày cho từng việc. Ứng dụng không tự đoán ngày.': 'Chọn ngày công thành thật sự rồi bấm Ghi ngày cho từng nhiệm vụ. Hệ thống không tự đoán ngày.',
    'Chưa lưu được ngày xong. Hãy thử lại.': 'Chưa ghi được ngày công thành. Hãy thử lại.',
  }))
    add(plain, gh);
  for (const [plain, to, scope] of [
    ['Lưu ngày', 'Ghi ngày', '.wlr-fixbtn'],
    ['Ngày xong', 'Ngày công thành', '.wlr-custom'],
  ])
    add(plain, { to, in: scope });
  const PATTERNS = [
    [/^Thông báo · .+$/, bell, '.topbar', 'Thông báo · '],
    [/^(Lịch|Gantt) · (.+)$/, (s, a, b) => (currentView() === VIEW_OF[a] ? NAV[a][0] + ' · ' + b : s), '#crumb', ' · '],
    [/^Phiên bản (\d+\.\d+\.\d+)$/, (s, v) => 'Biên niên v' + v + releaseName(v), HEAD, 'Phiên bản '],
    // v1.88.0
    [/^(\d+) việc quá hạn · (\d+) việc đến hạn trong (\d+) ngày$/, '$1 nhiệm vụ lỡ hẹn · $2 nhiệm vụ tới kỳ trong $3 ngày', MAIN, 'việc quá hạn'],
    [/^(\d+) (việc|công việc)$/, '$1 nhiệm vụ', MAIN, 'việc'],
    [/^Sắp đến hạn · (\d+) ngày$/, 'Sắp tới kỳ · $1 ngày', MAIN, 'Sắp đến hạn'],
    [/^☑ (\d+)\/(\d+) công việc$/, '☑ $1/$2 nhiệm vụ', MAIN, 'công việc'],
    [/^(\d+) đang làm ↗$/, '$1 đang hành sự ↗', MAIN, 'đang làm'],
    [/^(\d+)\/(\d+) đơn vị hoàn thành$/, '$1/$2 đơn vị công thành', MAIN, 'đơn vị'],
    [/^(\d+)\/(\d+) việc hoàn thành$/, '$1/$2 nhiệm vụ công thành', MAIN, 'việc hoàn thành'],
    [/^(\d+)\/(\d+) mục checklist$/, '$1/$2 chiêu', MAIN, 'checklist'],
    [/^(\d+)\/(\d+) mục đã hoàn thành$/, '$1/$2 chiêu đã công thành', MAIN, 'mục đã'],
    [/^(\d+) trên (\d+) mục checklist đã hoàn thành$/, '$1 trên $2 chiêu đã công thành', MAIN, 'checklist'],
    [/^(\d+)% tiến độ · trung bình các việc$/, '$1% tiến cảnh · trung bình các nhiệm vụ', MAIN, 'tiến độ'],
    [/^Quá hạn · (\d\d-\d\d)$/, 'Lỡ hẹn · $1', MAIN, 'Quá hạn · '],
    [/^Hạn · (\d\d-\d\d)$/, 'Kỳ hạn · $1', MAIN, 'Hạn · '],
    [/^(.+) · (\d+)% · Hạn (\d\d-\d\d)$/, '$1 · $2% · Kỳ hạn $3', '.work-task-row', ' · Hạn '],
    [/^Thêm việc vào cột (.+)$/, 'Thêm nhiệm vụ vào cột $1', MAIN, 'Thêm việc vào cột'],
    [/^Tổng dự án: (\d+)\. Xem chi tiết$/, 'Tổng đại sự: $1. Xem tường tận', MAIN, 'Tổng dự án'],
    [/^Đang thực hiện: (\d+)\. Xem chi tiết$/, 'Đang hành sự: $1. Xem tường tận', MAIN, 'Đang thực hiện:'],
    [/^Đã hoàn thành: (\d+)\. Xem chi tiết$/, 'Công thành: $1. Xem tường tận', MAIN, 'Đã hoàn thành:'],
    [/^Tiến độ tổng thể: (\d+)%\. Xem chi tiết$/, 'Tiến cảnh tổng thể: $1%. Xem tường tận', MAIN, 'Tiến độ tổng thể:'],
    [/^(Đã hoàn thành|Quá hạn|Đang xây dựng|Chưa làm): (\d+) việc, (\d+)%$/, (s, g, n, pct) => GROUPS[g] + ': ' + n + ' nhiệm vụ, ' + pct + '%', MAIN, ' việc, '],
    [/^Đã ẩn (\d+) việc hoàn thành khỏi biểu đồ\.$/, 'Đã ẩn $1 nhiệm vụ công thành khỏi trận đồ.', MAIN, 'Đã ẩn'],
    [/^Công việc · (\d+)$/, 'Nhiệm vụ · $1', '.gantt-labels', 'Công việc · '],
    [/^Tạo công việc ngày (\d\d-\d\d)$/, 'Tạo nhiệm vụ ngày $1', MAIN, 'Tạo công việc ngày'],
    [/^Hoàn thành mục (\d+)$/, 'Công thành chiêu $1', MAIN, 'Hoàn thành mục'],
    [/^Nội dung mục (\d+)$/, 'Nội dung chiêu $1', MAIN, 'Nội dung mục'],
    [/^Bỏ mục (\d+)$/, 'Bỏ chiêu $1', MAIN, 'Bỏ mục'],
    // v1.89.0
    [/^Lịch tháng (\d+\/\d+)( dạng danh sách)?$/, 'Hoàng lịch tháng $1$2', MAIN, 'Lịch tháng'],
    [/^Lịch ngày (.+)$/, 'Sự vụ trong ngày $1', '.zen-day-agenda', 'Lịch ngày'],
    [/^(\d+)% hoàn thành · Đổi lịch trong chi tiết$/, '$1% công thành · Đổi ngày trong chi tiết', MAIN, 'Đổi lịch'],
    [/^(\d+)% hoàn thành$/, '$1% công thành', MAIN, '% hoàn thành'],
    [/^(.+) · Hạn (\d\d-\d\d)$/, '$1 · Kỳ hạn $2', '.wf-focus-task-meta', ' · Hạn '],
    [/^(\d+)\/(\d+) mục hoàn thành$/, '$1/$2 chiêu công thành', MAIN, 'mục hoàn thành'],
    [/^Còn (\d+) lượt cần làm tuần này · đã làm (\d+)\/(\d+)$/, 'Còn $1 lượt cần luyện tuần này · đã luyện $2/$3', MAIN, 'lượt cần làm'],
    [/^Đã đủ mục tiêu tuần này · đã làm (\d+)\/(\d+)$/, 'Đã đủ chỉ tiêu tuần này · đã luyện $1/$2', MAIN, 'Đã đủ mục tiêu'],
    [/^Tuần mới: bắt đầu bằng 1 lượt · (.+)$/, (s, rest) => 'Tuần mới: khởi đầu bằng 1 lượt · ' + rest.replace('đã làm', 'đã luyện'), MAIN, 'Tuần mới'],
    [/^Chuỗi (\d+) ngày$/, 'Khổ luyện liền $1 ngày', MAIN, 'Chuỗi '],
    [/^(\d+) lần mỗi tuần$/, '$1 buổi mỗi tuần', MAIN, 'lần mỗi tuần'],
    [/^Sẽ nhắc lúc (.+) \(giờ Việt Nam\)\.$/, 'Sẽ truyền thư lúc $1 (giờ Việt Nam).', MAIN, 'Sẽ nhắc lúc'],
    [/^Để trống rồi lưu để xóa ghi chú\. Tối đa (\d+) ký tự\.$/, 'Để trống rồi lưu để xóa tâm đắc. Tối đa $1 ký tự.', MAIN, 'Để trống'],
    [/^Trong (\d+) ngày qua bạn hoàn thành (\d+)% \((\d+)\/(\d+) lượt theo mục tiêu tuần\)\.$/, 'Trong $1 ngày qua các hạ công thành $2% ($3/$4 lượt theo chỉ tiêu tuần).', MAIN, 'ngày qua bạn'],
    [/^(Tăng|Giảm) (\d+) điểm phần trăm so với (\d+) ngày trước đó\.( Bạn đang đi đúng hướng\.)?$/, (s, d, n, m, ok) => d + ' ' + n + ' điểm phần trăm so với ' + m + ' ngày trước đó.' + (ok ? ' Các hạ đang đi đúng đường.' : ''), MAIN, 'điểm phần trăm'],
    [/^Nhịp độ ổn định so với (\d+) ngày trước đó\.$/, 'Nhịp luyện ổn định so với $1 ngày trước đó.', MAIN, 'Nhịp độ'],
    [/^“(.+)” là việc bạn giữ tốt nhất \((\d+)%\)\.$/, '“$1” là môn các hạ giữ vững nhất ($2%).', MAIN, 'giữ tốt nhất'],
    [/^“(.+)” còn thấp nhất \((\d+)%\)\.$/, '“$1” còn yếu nhất ($2%).', MAIN, 'còn thấp nhất'],
    [/^(.+) là ngày bạn làm tốt nhất \((\d+)%\), (.+) dễ bỏ lỡ nhất \((\d+)%\)\.$/, '$1 là ngày các hạ luyện tốt nhất ($2%), $3 dễ lơi nhất ($4%).', MAIN, 'làm tốt nhất'],
    [/^Chuỗi (\d+) ngày liên tiếp của “(.+)” rất đáng quý\.$/, 'Khổ luyện liền $1 ngày môn “$2”, thật đáng quý.', MAIN, 'liên tiếp của'],
    [/^“(.+)” đã (\d+) ngày chưa được tích\.$/, '“$1” đã $2 ngày chưa luyện.', MAIN, 'chưa được tích'],
    [/^Thu nhỏ “(.+)” thành phiên bản 2 phút để dễ bắt đầu, rồi tăng dần khi đã đều\.$/, 'Thu nhỏ “$1” thành bản 2 phút để dễ khởi luyện, rồi tăng dần khi đã đều.', MAIN, 'Thu nhỏ'],
    [/^Chuẩn bị trước cho (.+): đặt nhắc, hoặc tạm giảm bớt việc vào ngày này\.$/, 'Chuẩn bị trước cho $1: đặt truyền thư, hoặc tạm bớt môn vào ngày này.', MAIN, 'Chuẩn bị trước'],
    [/^Bạn đang theo dõi (\d+) việc\. Thử giữ 3–5 việc cốt lõi trong vài tuần, vững rồi hãy thêm\.$/, 'Các hạ đang luyện $1 môn. Thử giữ 3–5 môn cốt lõi trong vài tuần, vững rồi hãy thêm.', MAIN, 'đang theo dõi'],
    [/^Áp dụng quy tắc “không bỏ hai ngày liên tiếp”: hôm nay chỉ cần tích bản nhỏ nhất của “(.+)”\.$/, 'Giữ tâm pháp “không bỏ hai ngày liên tiếp”: hôm nay chỉ cần luyện bản nhỏ nhất của “$1”.', MAIN, 'không bỏ hai ngày'],
    [/^Biểu đồ đường: tỷ lệ hoàn thành mỗi ngày trong (\d+) ngày qua, hiện tại (\d+)%$/, 'Biểu đồ đường: tỷ lệ công thành mỗi ngày trong $1 ngày qua, hiện tại $2%', MAIN, 'Biểu đồ đường'],
    [/^(\d\d\/\d\d): chưa có việc$/, '$1: chưa luyện môn nào', MAIN, 'chưa có việc'],
    // v1.90.0
    [/^Sửa ghi chú (.+)$/, 'Sửa quyển $1', MAIN, 'Sửa ghi chú'],
    [/^Xếp từ dự án (lỗ nhiều nhất|lãi nhiều nhất|đã chi nhiều nhất) lên trước\. Chọn một dự án để ghi thu, chi và xem chi tiết\.$/, (s, k) => 'Xếp từ đại sự ' + ({ 'lỗ nhiều nhất': 'lỗ nhiều nhất', 'lãi nhiều nhất': 'lời nhiều nhất', 'đã chi nhiều nhất': 'xuất ngân nhiều nhất' })[k] + ' lên trước. Chọn một đại sự để ghi thu ngân, xuất ngân và xem tường tận.', MAIN, 'Xếp từ dự án'],
    [/^Xóa ghi chú (.+)$/, 'Xóa quyển $1', MAIN, 'Xóa ghi chú'],
    [/^Còn thiếu (.+) để hòa vốn · đã thu hồi (\d+)% số đã chi$/, 'Còn thiếu $1 để hòa vốn · đã thu ngân $2% số đã xuất ngân', MAIN, 'để hòa vốn'],
    [/^Đã thu hồi (\d+)% số tiền đã chi$/, 'Đã thu ngân $1% số đã xuất ngân', MAIN, 'Đã thu hồi'],
    [/^Chi (.+) · Thu (.+)$/, 'Xuất $1 · Thu $2', MAIN, ' · Thu '],
    [/^Chi (\S.*₫)$/, 'Xuất $1', '.bg-project-line', 'Chi '],
    [/^Thu hồi (\d+)%$/, 'Hồi vốn $1%', MAIN, 'Thu hồi '],
    [/^(.+) · (\d+)% tổng chi$/, '$1 · $2% tổng xuất ngân', MAIN, 'tổng chi'],
    [/^Biểu đồ hòa vốn (.+)$/, (s, rest) => 'Đồ hòa vốn ' + money(rest), MAIN, 'Biểu đồ hòa vốn'],
    [/^Dòng tiền 6 tháng gần đây: (.+)$/, (s, rest) => 'Ngân lưu 6 tháng gần đây: ' + rest.replace(/ chi /g, ' xuất ngân ').replace(/ thu /g, ' thu ngân '), MAIN, 'Dòng tiền'],
    [/^Chi theo dự án: (.+)$/, 'Xuất ngân theo đại sự: $1', MAIN, 'Chi theo dự án:'],
    [/^Chi theo hạng mục: (.+)$/, 'Xuất ngân theo hạng mục: $1', MAIN, 'Chi theo hạng mục:'],
    // v1.91.0
    [/^(?:\d+ việc cần chú ý: |Không có việc quá hạn hay đến hạn\.).*$/, (s) => noticeWords(s), '.notice-summary', 'việc'],
    [/^(Mới · )?Phiên bản (\d+\.\d+\.\d+)$/, (s, fresh, v) => (fresh || '') + 'Biên niên v' + v + releaseName(v), '.notice-item', 'Phiên bản '],
    [/^(.+) · (\d\d\/\d\d\/\d{4}) · quá hạn (\d+) ngày$/, '$1 · $2 · lỡ hẹn $3 ngày', '.notice-item small', ' · quá hạn '],
    [/^Hiện thêm (\d+) việc$/, 'Hiện thêm $1 nhiệm vụ', '.notice-more', 'Hiện thêm'],
    [/^(\d+)\/(\d+) việc hoàn thành · (\d+)% tiến độ$/, '$1/$2 nhiệm vụ công thành · $3% tiến cảnh', '.archive-projects', 'việc hoàn thành'],
    [/^(\d+) công việc · Lưu trữ$/, '$1 nhiệm vụ · Phong ấn', MAIN, ' · Lưu trữ'],
    [/^(Công việc|Ghi chú|Dự án|Mục checklist) · (\d+)$/, (s, k, n) => ({ 'Công việc': 'Nhiệm vụ', 'Ghi chú': 'Quyển', 'Dự án': 'Đại sự', 'Mục checklist': 'Chiêu' })[k] + ' · ' + n, '.recycle-filters', ' · '],
    [/^Quá hẹn hỏi lại (\d+) ngày$/, 'Lỡ hẹn hỏi lại $1 ngày', '.wait-when', 'Quá hẹn hỏi lại '],
    [/^Nhắc lại (\d{2}[-/]\d{2})$/, 'Hẹn hỏi lại $1', '.wait-when', 'Nhắc lại '],
    [/^Nhắc lại sau (\d+) ngày$/, 'Hẹn lại sau $1 ngày', '.wait-actions', 'Nhắc lại sau '],
    [/^Sẽ nhắc lại sau (\d+) ngày\.$/, 'Sẽ hẹn lại sau $1 ngày.', '#toast, .toast, [role=status]', 'Sẽ nhắc lại sau '],
    // v2.55.0 (Sao Lưu Hằng Tuần)
    [/^(Tự động|Thủ công|Trước khi khôi phục) · (\d{2}\/\d{2}\/\d{4}(?: \d{2}:\d{2})?)$/, (s, k, when) => ({ 'Tự động': 'Tự hành', 'Thủ công': 'Tự tay', 'Trước khi khôi phục': 'Trước lúc hoàn nguyên' })[k] + ' · ' + when, '.zen-backup-main', ' · '],
    [/^(\d+) dự án · (\d+) việc · (\d+) ghi chú · (.+)$/, '$1 đại sự · $2 nhiệm vụ · $3 quyển · $4', '.zen-backup-main', ' ghi chú · '],
    [/^Giữ (\d+) bản tự động gần nhất; bản thủ công và bản “Trước khi khôi phục” giữ (\d+) bản mỗi loại\.$/, 'Giữ $1 bản tự hành gần nhất; bản tự tay và bản “Trước lúc hoàn nguyên” giữ $2 bản mỗi loại.', MAIN, 'bản tự động gần nhất'],
    [/^Khôi phục dữ liệu về bản (.+)\? Dữ liệu hiện tại sẽ được lưu thành bản “Trước khi khôi phục”\.$/, 'Hoàn nguyên dữ liệu về bản $1? Dữ liệu hiện tại sẽ được cất thành bản “Trước lúc hoàn nguyên”.', '.zen-backup-ask', 'Khôi phục dữ liệu về bản'],
    [/^Xóa bản sao (.+)\? Không hoàn lại được\.$/, 'Hủy bản sao lục $1? Không hoàn lại được.', '.zen-backup-ask', 'Xóa bản sao '],
    [/^Chưa tải được danh sách: (.+)$/, (s) => 'Chưa duyệt được danh sách: ' + backupWords(s.slice('Chưa tải được danh sách: '.length)), MAIN, 'Chưa tải được danh sách'],
    [/^Đã khôi phục dữ liệu về bản (.+)\. Dữ liệu trước đó nằm trong mục “Trước khi khôi phục”\.$/, 'Đã hoàn nguyên dữ liệu về bản $1. Dữ liệu trước đó nằm trong mục “Trước lúc hoàn nguyên”.', '#toast, .toast, [role=status]', 'Đã khôi phục dữ liệu về bản '],
    ...['sao lưu', 'bản sao', 'khôi phục'].map((quick) => [/^.+$/, (s) => backupWords(s), '.zen-backups-status', quick]),
    [/^Khôi phục về (.+)$/, (s, label) => 'Hoàn nguyên về ' + backupWords(label), '.zen-backup-actions', 'Khôi phục về '],
    [/^Xóa bản sao (.+)$/, (s, label) => 'Hủy bản sao lục ' + backupWords(label), '.zen-backup-actions', 'Xóa bản sao '],
    // v2.54.0 (Ôn Tuần)
    [/^(\d+) việc$/, '$1 nhiệm vụ', '.zen-review h3 small', 'việc'],
    [/^(\d+)\/(\d+) lượt · (\d+)%$/, '$1/$2 lần luyện · $3%', '.zen-review h3 small', 'lượt'],
    [/^(\d+)\/(\d+) lần$/, '$1/$2 lần luyện', '.zen-review-list small', ' lần'],
    [/^và (\d+) việc nữa$/, 'và $1 nhiệm vụ nữa', '.zen-review-more', 'việc nữa'],
    [/^Chọn việc cho tuần (.+)$/, 'Chọn nhiệm vụ cho tuần $1', '.zen-review h3', 'Chọn việc'],
    [/^Quá hạn (\d+) ngày$/, 'Lỡ hẹn $1 ngày', '.zen-review-when', 'Quá hạn'],
    [/^Hạn (\d{2}\/\d{2})$/, 'Kỳ hạn $1', '.zen-review-when', 'Hạn '],
    [/^(\d+)\/(\d+) xong$/, '$1/$2 công thành', '.wf-review-panel h2 small', ' xong'],
    [/^Đã lưu (\d+) việc cho tuần (.+) vào Ghi chú\.$/, 'Đã cất $1 nhiệm vụ cho tuần $2 vào Tàng thư.', '#toast, .toast, [role=status]', 'Đã lưu '],
    [/^Đã lưu vào Ghi chú: (.+)$/, 'Đã cất vào Tàng thư: $1', '#toast, .toast, [role=status]', 'Đã lưu vào Ghi chú: '],
    [/^Đã thêm việc “(.+)” vào (.+)$/, 'Đã thêm nhiệm vụ “$1” vào $2', '#toast, .toast, [role=status]', 'Đã thêm việc “'],
    [/^Dữ liệu đồng bộ đã dùng (\d+)%: (.+) \/ 20 MB\.$/, 'Dữ liệu thông mạch đã dùng $1%: $2 / 20 MB.', '.capacity-warning strong', 'Dữ liệu đồng bộ đã dùng'],
    [/^Dữ liệu đồng bộ đã đầy: (.+) \/ 20 MB\.$/, 'Dữ liệu thông mạch đã đầy: $1 / 20 MB.', '.capacity-warning strong', 'Dữ liệu đồng bộ đã đầy'],
    [/^Xóa (công việc|dự án|ghi chú)\?$/, (s, k) => 'Xóa ' + ({ 'công việc': 'nhiệm vụ', 'dự án': 'đại sự', 'ghi chú': 'quyển' })[k] + '?', 'dialog h2', 'Xóa '],
    [/^Đã đồng bộ lúc (\d\d:\d\d)$/, 'Đã thông mạch lúc $1', SYNC, 'Đã đồng bộ lúc'],
    [/^Chưa đồng bộ được · (.+)$/, 'Chưa thông mạch được · $1', SYNC, 'Chưa đồng bộ được · '],
    [/^Trạng thái đồng bộ: (.+)$/, (s, rest) => 'Trạng thái đồng bộ: ' + syncWords(rest), SYNC, 'Trạng thái đồng bộ: '],
    [/^(Đang gửi dữ liệu lên máy chủ|Dữ liệu đã được máy chủ xác nhận|Dữ liệu hiện vẫn được giữ trên thiết bị) · (.+)$/, (s, a, b) => syncWords(a) + ' · ' + syncWords(b), SYNC, ' · '],
    [/^Lần đồng bộ thành công gần nhất: (.+)$/, 'Lần thông mạch gần nhất: $1', '#sync-last-time', 'Lần đồng bộ thành công'],
    [/^Tài khoản · (.+)$/, 'Danh tính · $1', '.topbar, .sidebar', 'Tài khoản · '],
    [/^Mở cài đặt tài khoản của (.+)$/, 'Mở Cơ quan của $1', '.topbar', 'Mở cài đặt tài khoản của '],
    [/^Đã tải lên (\d+) tệp vào Tài nguyên\.$/, 'Đã cất $1 tệp vào Bảo khố.', NOTE, 'Đã tải lên'],
    [/^Đã bật email nhắc hằng ngày và tổng kết Chủ nhật lúc (.+)$/, 'Đã bật email nhắc hằng ngày và chiến báo Chủ nhật lúc $1', NOTE, 'tổng kết Chủ nhật'],
    [/^Tổng kết được gửi vào (.+)$/, 'Chiến báo được gửi vào $1', NOTE, 'Tổng kết được gửi'],
    // v1.95.0
    [/^(Quá hạn|Sắp đến hạn) · (\d+)$/, (s, k, n) => (k === 'Quá hạn' ? 'Lỡ hẹn' : 'Sắp tới kỳ') + ' · ' + n, '.due-work-tabs', ' · '],
    [/^Mở dự án (.+)$/, 'Mở đại sự $1', MAIN, 'Mở dự án '],
    [/^(\d+) dự án$/, '$1 đại sự', MAIN, ' dự án'],
    [/^Hoàn thành (.+)$/, 'Công thành chiêu $1', '.card-check-control', 'Hoàn thành '],
    [/^(\d{4}-\d\d-\d\d), (\d+) công việc$/, '$1, $2 nhiệm vụ', MAIN, ' công việc'],
    [/^(\d+) dự án đang chạy · Về tổng quan$/, '$1 đại sự đang vận hành · Về Tổng đàn', '.tab-home', 'dự án đang chạy'],
    // v2.63.1 (Liên Hoàn Lệnh)
    [/^(\d+)% hoàn thành( · \d+\/\d+ mục)?$/, (s, a, b) => a + '% công thành' + (b || ''), '.wl-meta', '% hoàn thành'],
    [/^Hạn (.+)$/, 'Kỳ hạn $1', '.wl-chip', 'Hạn '],
    [/^Quá hạn · (.+)$/, 'Lỡ hẹn · $1', '.wl-chip', 'Quá hạn · '],
    [/^Bế quan, tập trung làm: (.+)$/, 'Bế quan chuyên tâm: $1', '.wl-focus', 'Bế quan, tập trung làm: '],
    [/^Còn (\d+) việc nữa\. Gõ tên để thu hẹp\.$/, 'Còn $1 nhiệm vụ nữa. Gõ tên để thu hẹp.', '.wl-pick-empty', 'việc nữa'],
    [/^Liên hoàn lệnh chứa tối đa (\d+) việc\. Hãy gỡ bớt việc đã qua trước khi ghi thêm\.$/, 'Liên hoàn lệnh chứa tối đa $1 nhiệm vụ. Hãy gỡ bớt nhiệm vụ đã qua trước khi ghi thêm.', NOTE, 'chứa tối đa'],
    // v2.64.0 (Báo Cáo Liên Hoàn)
    [/^Chưa có việc nào ghi vào hay xong trong (\d+) ngày qua\.$/, 'Chưa có nhiệm vụ nào ghi vào hay công thành trong $1 ngày qua.', '.wlr-quiet', 'Chưa có việc nào'],
    [/^xong \/ \(xong \+ gỡ\), trong (\d+) ngày qua$/, 'công thành / (công thành + gỡ), trong $1 ngày qua', '.wlr-kpis small', 'xong / ('],
    [/^Có (\d+) việc đã xong nhưng không rõ ngày xong \(hoàn thành từ trước khi ứng dụng ghi ngày xong\), nên không nằm trong biểu đồ theo ngày\.$/, 'Có $1 nhiệm vụ đã công thành nhưng không rõ ngày công thành (công thành từ trước khi ứng dụng ghi ngày), nên không nằm trong biểu đồ theo ngày.', '.wlr-card .help-copy', 'không rõ ngày xong'],
    [/^Còn (\d+) dự án khác$/, 'Còn $1 đại sự khác', '.wlr-rank', ' dự án khác'],
    [/^Tuổi của việc còn trong chuỗi: (.+)$/, 'Tuổi của nhiệm vụ còn trong chuỗi: $1', '.wlr-ages', 'Tuổi của việc'],
    [/^Biểu đồ cột (\d+) ngày: ghi vào (\d+), đã xong (\d+)\. Xem bảng số liệu bên dưới\.$/, 'Biểu đồ cột $1 ngày: ghi vào $2, công thành $3. Xem bảng số liệu bên dưới.', '.wlr-plot', 'Biểu đồ cột'],
    [/^(\d{2}\/\d{2}(?:–\d{2}\/\d{2})?) · Ghi vào (\d+) · Đã xong (\d+)$/, '$1 · Ghi vào $2 · Công thành $3', '.wlr-day', ' · Đã xong'],
    // v2.65.0 (Chiến Báo Hoàn Thiện)
    [/^(trong \d+ ngày qua) · chưa tính (\d+) việc chưa rõ ngày xong$/, '$1 · chưa tính $2 nhiệm vụ chưa rõ ngày công thành', '.wlr-kpis small', ' · chưa tính'],
  ];
  // Nội dung người dùng và vùng không đổi chữ.
  const SKIP = [
    'script', 'style', 'textarea', 'input', '[contenteditable]', '.gh-nav', '.gr-page', '.gr-award', 'dialog.gr-story',
    // v1.96.0: Bảng chú giải và bong bóng nghĩa thường cố ý ghi cả hai nghĩa
    '.gh-glossary', '.gh-tip-bubble',
    // v1.97.0: danh hiệu, con dấu, nghi thức Đột phá đã viết sẵn giọng giang hồ (giangho-fx.js)
    '.gh-rank', '.gh-stamp', '.gh-overlay-seal', 'dialog.gr-breakthrough',
    // v1.98.0: ngày âm, tiết khí (giangho-lunar.js)
    '.gh-lunar', '.gh-lunar-span', '.gh-lunar-line',
    // Nội dung người dùng: dự án, tab dự án, việc đã ghim, ghi chú nhanh, kết quả bảng lệnh
    '.side-project', '#side-projects', '#side-pinned-tasks', '.tab:not(.tab-home)', '.sidebar-note', '.studio-palette [role=listbox]',
    // Tên cột (người dùng đặt), trạng thái theo cột, ô chọn cột / dự án
    '.wf-column-name', '.studio-column-tabs', '.wf-state-choices', 'select[name=col]', 'select[name=project]', '.task-project-picker summary', '.task-project-choice-copy strong',
    // Tên và mô tả việc, dự án, từ khóa, nhãn
    '.task-card h3', '.task-name', '.work-task-row strong', '.project-card h3', '.project-card > p', '.tag', '.wait-who', '.zen-review-list strong', '.zen-review-pick strong', '.zen-review-proj', '.wf-card-keywords > :not(.matrix-chip)', '.wf-comment', '.wf-comment-text', '.task-next-step > :not(span:first-child)', '.dashboard-progress-row strong', '.gantt-labels li', '.gantt-bar-label', '.project-note-picker label',
    // Nhật khóa, Bế quan, Hoàng lịch: tên việc / môn, tên dự án, ghi chú cảm nhận
    // Tàng thư, Ngân khố, Bảo khố: tiêu đề / nội dung / nhóm quyển, đại sự để liên kết, hạng mục và ghi chú khoản thu chi, gợi ý hạng mục
    // (bấm gợi ý là chép chữ vào ô nhập nên phải giữ nguyên), tên tệp
    '.keep-card h3', '.keep-card > small', '.keep-card .zen-formatted', '.note-label-filters', '.wf-project-choices', '.bg-project-name', '.bg-entry-main', '.bg-cat-chip', '.resource-card', '.resource-name', '.file-name',
    '.hb-name', '.hb-text > strong', '.hb-suggest', '.hb-hbars li > span', '.hb-hist-notes', '.wf-focus-card strong', '.wf-focus-card > small', '.wf-focus-task-heading h1', '.wf-focus-header h2', '.wf-focus-note-options button', '.zen-ma-body strong', '.zen-agenda-task strong', '.zen-agenda-task span:first-of-type',
    // Phong ấn, Phế tích, Truyền thư: tên đại sự / nhiệm vụ / mục đã xóa, tên người nhận trong hộp xác nhận, tiêu đề việc trong chuông
    '.archive-projects h3', '.wf-archive-row .text-btn', '.recycle-name h3', '.recycle-select', '.help-copy:has(~ .purge-warning)', 'dialog .help-copy > strong', '.notice-item:not(.release-notice) > span:not(.notice-tag):not(.notice-detail-link)',
    // Dòng trạng thái trong hộp thoại nhiệm vụ: ứng dụng tự đặt lại chữ mỗi khi hộp thoại đổi (studio-zen.js mirror), không đổi để khỏi giằng co.
    '.zen-task-save-status',
    // v2.63.1: Liên hoàn lệnh — tên việc, tên dự án (nhãn màu, danh sách ghi thêm) là nội dung người dùng.
    '.wl-title', '.wl-card .wl-chip-project', '.wl-pick strong', '.wl-pick .wl-chip-project',
    // v2.64.0: báo cáo — tên dự án (thanh xếp hạng, bảng), tên việc nằm lâu nhất.
    '.wlr-name', '.wlr-oldest strong', '.wlr-tables tbody th',
  ].join(', ');
  // Phần tử mà chữ NẰM TRỰC TIẾP bên trong là nội dung người dùng (phần tử con như nhãn "Hạn", mức cấp bách vẫn được đổi).
  const DIRECT_SKIP = 'button.month-event';
  const ATTRS = ['aria-label', 'title', 'placeholder'];
  const ATTR_SEL = ATTRS.map((a) => '[' + a + ']').join(',');

  // ---- Đổi chữ -------------------------------------------------------------------------------------------------------------
  const textOrig = new WeakMap(); // Text → chữ gốc
  const textMine = new WeakMap(); // Text → chữ bộ chuyển ngữ đã đặt
  const attrOrig = new WeakMap(); // Element → { thuộc tính: { orig, out } }
  function pick(hit, core, el) {
    if (typeof hit === 'string') return hit;
    if (typeof hit === 'function') return hit(core);
    if (Array.isArray(hit)) {
      for (const h of hit) {
        const out = pick(h, core, el);
        if (out != null) return out;
      }
      return null;
    }
    if ((hit.in && !el.closest(hit.in)) || (hit.when && !hit.when())) return null;
    return typeof hit.to === 'function' ? hit.to(core) : hit.to;
  }
  // v1.94.0 (Khinh Công): nhớ các chuỗi chắc chắn không đổi ở bất kỳ vùng nào (không phải cụm từ, không khớp mẫu nào) để lần dựng
  // sau khỏi dò lại gần trăm mẫu cho cùng một tên việc, tên dự án… Đếm việc đã làm trong stats để test giữ được mức này.
  const MISS = new Set();
  const stats = { batches: 0, roots: 0, texts: 0, attrs: 0, misses: 0, ms: 0 };
  function lookup(core, el) {
    if (MISS.has(core)) {
      stats.misses++;
      return null;
    }
    const hit = PHRASES.get(core);
    let candidate = hit !== undefined;
    if (candidate) {
      const out = pick(hit, core, el);
      if (out != null) return out;
    }
    for (const [re, to, scope, quick] of PATTERNS) {
      if ((quick && !core.includes(quick)) || !re.test(core)) continue;
      candidate = true;
      if (scope && !el.closest(scope)) continue;
      return core.replace(re, to);
    }
    if (!candidate) {
      if (MISS.size > 20000) MISS.clear();
      MISS.add(core);
    }
    return null;
  }
  // v1.94.0: phần tử có nằm trong vùng SKIP không — nhớ theo từng phần tử trong một lượt quét (anh em dùng chung tổ tiên), mỗi phần tử
  // chỉ khớp bộ chọn SKIP một lần thay vì dò cả chuỗi tổ tiên cho mỗi chữ. Bộ nhớ làm mới mỗi lượt vì trang đổi giữa các lượt.
  let skipMemo = new WeakMap();
  function inSkip(el) {
    if (!el || el === document.body || el === root) return false;
    let v = skipMemo.get(el);
    if (v === undefined) {
      v = el.matches(SKIP) || inSkip(el.parentElement);
      skipMemo.set(el, v);
    }
    return v;
  }
  function convert(value, el) {
    const core = value.trim();
    // v1.91.0: 200 → 400 ký tự cho các câu dài của Cơ quan, Nhập môn (lời nhắn sau khi ghi danh) và tóm tắt Truyền thư.
    if (!core || core.length > 400) return null;
    const out = lookup(core, el);
    if (out == null || out === core || inSkip(el)) return null;
    return value.replace(core, () => out);
  }
  // v1.96.0 (Chú Giải): nghĩa thường. Chữ ngắn được đổi trong tiêu đề, nút, nhãn… thì phần tử đó mang title "Nghĩa thường: <chữ cũ>"
  // (rê chuột trên máy tính; trình đọc màn hình đọc thành mô tả) và data-gh-tip (giangho-guide.js: nhấn giữ trên màn hình chạm).
  // Không đè title sẵn có của ứng dụng; bỏ qua nút thanh bên (đã có dòng nghĩa thường) và khi chữ mới đã chứa chữ cũ.
  const TIP_SEL = 'h1, h2, h3, h4, legend, summary, button, a, label, th, [role=tab], .btn, .eyebrow, .nav-group-label, .view-group-label';
  const tipMine = new WeakMap(); // Element → title bộ chuyển ngữ đã đặt
  function tip(el, core, out) {
    if (core.length > 36 || out.toLocaleLowerCase('vi').includes(core.toLocaleLowerCase('vi'))) return;
    const host = el.closest(TIP_SEL);
    if (!host || host.closest(NAV_SEL) || host.textContent.length > 80) return;
    const cur = host.getAttribute('title');
    if (cur != null && tipMine.get(host) !== cur) return;
    const t = 'Nghĩa thường: ' + core;
    if (cur === t) return;
    tipMine.set(host, t);
    host.setAttribute('title', t);
    host.setAttribute('data-gh-tip', core);
  }
  // v2.1.0 (Danh Trận): tên cột mặc định theo giang hồ, tùy chọn (Cài đặt → Giao diện, data-gh-columns="on", mặc định tắt). Chỉ đổi
  // chữ hiển thị khi tên cột trùng đúng tên mặc định; tên cột là dữ liệu nên đổi tên cột vẫn đọc từ dữ liệu, không ghi gì.
  const COLS = { 'Ý tưởng': 'Kế sách', 'Việc cần làm': 'Chờ xuất chiêu', 'Đang thực hiện': 'Đang hành sự', 'Hoàn thành': 'Công thành' };
  const COL_TEXT = '.wf-column-name, .studio-column-tabs button, .wf-state-choice, .zen-state-select-secondary option';
  const COL_ATTR = '.column-title .icon-btn, .task-next';
  const columnsOn = () => root.dataset.ghColumns === 'on';
  const colText = (s) => {
    const m = /^(Ý tưởng|Việc cần làm|Đang thực hiện|Hoàn thành)( · \d+)?$/.exec(s);
    return m ? COLS[m[1]] + (m[2] || '') : null;
  };
  const colAttr = (s) => {
    const m = /^(.* (?:cột|sang) )(Ý tưởng|Việc cần làm|Đang thực hiện|Hoàn thành)$/.exec(s);
    return m ? m[1] + COLS[m[2]] : null;
  };
  function doText(node) {
    stats.texts++;
    const el = node.parentElement;
    if (!el || (el.tagName === 'OPTION' && !el.hasAttribute('value')) || el.matches(DIRECT_SKIP)) return;
    const cur = node.nodeValue;
    if (textMine.get(node) === cur) return;
    let out = convert(cur, el);
    if (columnsOn() && el.closest(COL_TEXT)) {
      const c = colText(cur.trim());
      if (c) out = cur.replace(cur.trim(), () => c);
    }
    if (out == null) return;
    textOrig.set(node, cur);
    textMine.set(node, out);
    node.nodeValue = out;
    tip(el, cur.trim(), out.trim());
  }
  function doAttrs(el) {
    stats.attrs++;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v || (a === 'title' && tipMine.get(el) === v)) continue;
      const rec = attrOrig.get(el) || {};
      if (rec[a] && rec[a].out === v) continue;
      // Thuộc tính của ô nhập (placeholder, nhãn) là chữ giao diện nên được đổi; chỉ bỏ qua vùng nội dung người dùng.
      const host = el.matches('input, textarea, select') ? el.parentElement || el : el;
      let out = convert(v, host);
      if (columnsOn() && el.matches(COL_ATTR)) out = colAttr(out ?? v) ?? out;
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
  // v1.94.0: một lượt duyệt cho cả chữ, thuộc tính và nút mục (trước đây ba lượt: hai querySelectorAll và một TreeWalker).
  const isNav = (el) => (el.classList.contains('nav') || el.classList.contains('view-mode')) && el.matches(NAV_SEL);
  const hasAttrs = (el) => el.hasAttribute('aria-label') || el.hasAttribute('title') || el.hasAttribute('placeholder');
  function visit(el) {
    if (isNav(el)) doNav(el);
    if (hasAttrs(el)) doAttrs(el);
  }
  function scan(node) {
    stats.roots++;
    if (node.nodeType === 3) return doText(node);
    if (node.nodeType !== 1) return;
    visit(node);
    const walk = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (n.nodeType === 3) doText(n);
      else visit(n);
    }
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
    document.querySelectorAll('[data-gh-tip]').forEach((el) => {
      if (el.getAttribute('title') === tipMine.get(el)) el.removeAttribute('title');
      el.removeAttribute('data-gh-tip');
      tipMine.delete(el);
    });
  }

  // ---- Bật / tắt theo phong cách -------------------------------------------------------------------------------------------
  let observer = null;
  // v1.91.0: chốt an toàn. Nếu một đoạn mã của ứng dụng cứ thấy chữ khác là đặt lại (bộ quan sát giằng co với bộ chuyển ngữ), vòng
  // vi tác vụ không bao giờ nhường cho setTimeout; quá 200 lượt liền thì ngừng đổi chữ tới tác vụ kế tiếp để trang không bị treo.
  let burst = 0;
  function onMutations(list) {
    if (++burst === 1) setTimeout(() => (burst = 0));
    if (burst > 200) {
      observer.takeRecords();
      return;
    }
    stats.batches++;
    const t0 = performance.now();
    skipMemo = new WeakMap();
    // v1.94.0: gom mọi nút vừa thêm trong lượt rồi chỉ quét các gốc: một lần dựng bảng sinh hàng nghìn bản ghi, cây con thêm chồng lên
    // nhau nên trước đây cùng một phần trang bị quét lại ~4 lần. Nút đã rời trang và nút nằm trong một nút khác cùng lượt được bỏ qua.
    const added = new Set();
    for (const m of list) {
      if (m.type === 'childList') {
        // Ứng dụng có thể đặt lại chữ bên trong một nút mục (innerHTML): dựng lại nhãn hai dòng cho chính nút đó.
        const nav = m.target.nodeType === 1 && m.target.closest(NAV_SEL);
        if (nav) doNav(nav);
        for (const n of m.addedNodes) added.add(n);
      }
      else if (m.type === 'characterData') {
        if (!m.target.isConnected) continue;
        const nav = m.target.parentElement?.closest(NAV_SEL);
        if (nav && !m.target.parentElement.closest('.gh-nav')) doNav(nav);
        else doText(m.target);
      }
      else if (m.type === 'attributes') doAttrs(m.target);
    }
    for (const n of added) {
      if (!n.isConnected) continue;
      let p = n.parentNode;
      while (p && p !== document.body && !added.has(p)) p = p.parentNode;
      if (!p || p === document.body) scan(n);
    }
    observer.takeRecords(); // bỏ các thay đổi do chính bộ chuyển ngữ vừa làm
    stats.ms += performance.now() - t0;
  }
  let columnsWas = columnsOn();
  function sync() {
    // v2.1.0: bật / tắt tên cột giang hồ khi đang Giang hồ thì trả chữ gốc rồi quét lại cả trang.
    if (active() && observer && columnsWas !== columnsOn()) {
      observer.disconnect();
      observer = null;
      restore();
    }
    columnsWas = columnsOn();
    if (active() && !observer && document.body) {
      skipMemo = new WeakMap();
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
  // v1.96.0 (Chú Giải): Khẩu quyết hai chiều. Bảng lệnh (studio-zen.js) hỏi tên giang hồ của một lệnh: trả [tên giang hồ, nghĩa thường]
  // hoặc null. Chỉ dùng cho lệnh của ứng dụng, không cho tên việc do người dùng đặt.
  const COMMANDS = {
    'Tạo công việc mới': 'Khởi nhiệm vụ mới',
    'Thêm nhanh bằng một câu': 'Ghi nhanh bằng một câu',
    'Tìm kiếm toàn bộ nội dung': 'Truy tìm khắp giang hồ',
    'Xem phím tắt': 'Xem khẩu quyết phím',
    'Ôn tuần': 'Kiểm điểm tuần',
  };
  const command = (label) => {
    if (COMMANDS[label]) return [COMMANDS[label], label];
    if (NAV[label]) return [NAV[label][0], label];
    if (label.startsWith('Dự án · ')) return ['Đại sự · ' + label.slice(8), 'Dự án'];
    return null;
  };
  window.zenGiangHo = { active, convert: (s, el = document.body) => convert(s, el), rescan: () => active() && ((skipMemo = new WeakMap()), scan(document.body)), command, NAV, PHRASES, PATTERNS, stats };
})();
