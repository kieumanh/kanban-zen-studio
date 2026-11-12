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
  for (const [k, v] of Object.entries(GROUPS)) add(k, { to: v, in: '.work-legend, .stat-label, .wf-today-plan h2, .dashboard-plan-part h3, .wf-focus-group > h2' });

  // ---- v1.89.0 (Nhật Khóa): Hoàng lịch, Bế quan, Nhật khóa ------------------------------------------------------------------
  const HB_LEVEL = { 'Xuất sắc': 'Thâm hậu', 'Tốt': 'Vững vàng', 'Đang hình thành': 'Đang thành hình', 'Cần nâng đỡ': 'Cần khổ luyện' };
  for (const [k, v] of Object.entries(HB_LEVEL)) add(k, { to: v, in: '.hb-level' });
  for (const [k, v] of Object.entries({
    // Hoàng lịch
    'Danh sách': { to: 'Liệt kê', in: '.zen-cal-mode' },
    'Hạn': { to: 'Kỳ hạn', in: '.zen-event-kind' },
    'Chạm vào công việc để xem chi tiết. Công việc chưa đặt ngày nằm ở mục Chưa lên lịch bên dưới.': 'Chạm vào nhiệm vụ để xem tường tận. Nhiệm vụ chưa định ngày nằm ở mục Chưa định ngày bên dưới.',
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
  ];
  // Nội dung người dùng và vùng không đổi chữ.
  const SKIP = [
    'script', 'style', 'textarea', 'input', '[contenteditable]', '.gh-nav', '.gr-page', '.gr-award',
    // Nội dung người dùng: dự án, tab dự án, việc đã ghim, ghi chú nhanh, kết quả bảng lệnh
    '.side-project', '#side-projects', '#side-pinned-tasks', '.tabs', '.tab', '.sidebar-note', '.studio-palette [role=listbox]',
    // Tên cột (người dùng đặt), trạng thái theo cột, ô chọn cột / dự án
    '.wf-column-name', '.studio-column-tabs', '.wf-state-choices', 'select[name=col]', 'select[name=project]', '.task-project-picker summary', '.task-project-choice-copy strong',
    // Tên và mô tả việc, dự án, từ khóa, nhãn
    '.task-card h3', '.task-name', '.work-task-row strong', '.project-card h3', '.project-card > p', '.tag', '.wf-card-keywords > :not(.matrix-chip)', '.wf-comment', '.wf-comment-text', '.task-next-step > :not(span:first-child)', '.dashboard-progress-row strong', '.gantt-labels li', '.gantt-bar-label', '.project-note-picker label',
    // Nhật khóa, Bế quan, Hoàng lịch: tên việc / môn, tên dự án, ghi chú cảm nhận
    '.hb-name', '.hb-text > strong', '.hb-suggest', '.hb-hbars li > span', '.hb-hist-notes', '.wf-focus-card strong', '.wf-focus-card > small', '.wf-focus-task-heading h1', '.wf-focus-header h2', '.wf-focus-note-options button', '.zen-ma-body strong', '.zen-agenda-task strong', '.zen-agenda-task span:first-of-type',
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
  function lookup(core, el) {
    const hit = PHRASES.get(core);
    if (hit !== undefined) {
      const out = pick(hit, core, el);
      if (out != null) return out;
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
    if (!el || (el.tagName === 'OPTION' && !el.hasAttribute('value')) || el.matches(DIRECT_SKIP)) return;
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
