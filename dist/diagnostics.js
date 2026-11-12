'use strict';
// v1.73.0: (1) dấu "tính năng này được mở hôm nay" ẩn danh; (2) báo cho chủ tài khoản khi email báo cáo/nhắc việc gửi lỗi.
// (1) Mỗi màn hình tối đa MỘT dấu mỗi ngày trên mỗi thiết bị, không kèm mã người dùng hay thiết bị; máy chủ chỉ ghi nhật ký (xem
// server/client-events.mjs). Cho biết tính năng nào được dùng để chọn việc nên đầu tư hay cắt gọn.
(function () {
  const KEY = 'zen-usage-day';
  function markUsed(feature) {
    if (!feature || typeof window.zenDiagnosticsSend !== 'function') return;
    let state = { day: '', sent: [] };
    try {
      state = JSON.parse(localStorage.getItem(KEY) || '') || state;
    } catch {
      /* chưa có hoặc hỏng: bắt đầu lại */
    }
    const day = today();
    if (state.day !== day || !Array.isArray(state.sent)) state = { day, sent: [] };
    if (state.sent.includes(feature)) return;
    state.sent.push(feature);
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      return; // không ghi nhớ được thì không gửi, tránh gửi lặp mỗi lần chuyển màn hình
    }
    window.zenDiagnosticsSend({ type: 'usage', feature });
  }
  // Chỉ tính khi đã đăng nhập và ứng dụng sẵn sàng (không tính màn hình đăng nhập).
  const markCurrent = () => {
    try {
      if (currentUser && document.documentElement.dataset.zenReady === '1') markUsed(view);
    } catch {
      /* không để báo cáo làm hỏng vẽ màn hình */
    }
  };
  const renderBeforeDiagnostics = render;
  render = function () {
    renderBeforeDiagnostics.apply(this, arguments);
    markCurrent();
  };
  // Lần vẽ đầu có thể xảy ra TRƯỚC khi tệp này bọc render(); đánh dấu ngay khi ứng dụng báo sẵn sàng.
  new MutationObserver(markCurrent).observe(document.documentElement, { attributes: true, attributeFilter: ['data-zen-ready'] });
  markCurrent();

  // (2) Email gửi lỗi: hiện một dòng ngay đầu Cài đặt. Không hiển thị nội dung lỗi của nhà cung cấp email.
  const CHANNEL = { email: 'email nhắc việc', weekly: 'email tổng kết tuần', finance: 'email báo cáo thu chi' };
  const dayText = (day) => String(day || '').split('-').reverse().slice(0, 2).join('/');
  const accountPanelBeforeDiagnostics = accountPanel;
  accountPanel = function () {
    accountPanelBeforeDiagnostics.apply(this, arguments);
    const issue = currentUser && currentUser.mailIssue;
    if (!issue || !CHANNEL[issue.channel]) return;
    const retry = issue.attempts < 4 ? 'Hệ thống sẽ tự thử lại.' : 'Đã thử nhiều lần nhưng chưa được; kỳ gửi tiếp theo vẫn hoạt động bình thường.';
    document
      .querySelector('#editor-body h2')
      ?.insertAdjacentHTML(
        'afterend',
        '<div class="capacity-panel mail-issue" role="status"><p><strong>Chưa gửi được ' + CHANNEL[issue.channel] + ' ngày ' + dayText(issue.day) + '.</strong> ' + retry + ' Hãy kiểm tra hộp thư rác và địa chỉ email trong hồ sơ.</p></div>',
      );
  };
})();
