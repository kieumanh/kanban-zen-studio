'use strict';
// v1.73.0: (1) dấu "tính năng này được mở hôm nay" ẩn danh; (2) báo cho chủ tài khoản khi email báo cáo/nhắc việc gửi lỗi.
// (1) Mỗi màn hình tối đa MỘT dấu mỗi ngày trên mỗi thiết bị, không kèm mã người dùng hay thiết bị; máy chủ chỉ ghi nhật ký (xem
// server/client-events.mjs). Cho biết tính năng nào được dùng để chọn việc nên đầu tư hay cắt gọn.
// v2.71.0 (Thám Báo): (a) công tắc “Chỉ số ẩn danh” ở Cài đặt → Tài khoản & bảo mật (mặc định bật, áp dụng cho thiết bị này, khóa localStorage zen-usage-off) mô tả rõ
// gửi gì và không gửi gì; (b) window.zenUsage.mark(feature) cho mã khác đánh dấu một tính năng đã dùng (cùng quy tắc: tối đa MỘT dấu mỗi tính năng mỗi ngày mỗi thiết bị,
// đếm theo thiết bị-ngày, không đếm số lần bấm). Các dấu mới: award-save / award-later (bảng vận công), growth-<tab>, open-report, quickadd.
(function () {
  const KEY = 'zen-usage-day';
  const OFF_KEY = 'zen-usage-off';
  const enabled = () => {
    try {
      return localStorage.getItem(OFF_KEY) !== '1';
    } catch {
      return true; // không đọc được thì giữ mặc định (vẫn tôn trọng Do Not Track ở error-report.js)
    }
  };
  function setEnabled(on) {
    try {
      if (on) localStorage.removeItem(OFF_KEY);
      else localStorage.setItem(OFF_KEY, '1');
    } catch {
      return false; // không lưu được lựa chọn thì không báo là đã đổi
    }
    return true;
  }
  function markUsed(feature) {
    if (!feature || typeof window.zenDiagnosticsSend !== 'function' || !enabled()) return;
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
  window.zenUsage = {
    enabled,
    setEnabled,
    // Chỉ tên dạng a-z0-9- (khớp bộ lọc ở máy chủ); đăng nhập rồi mới tính.
    mark(feature) {
      try {
        if (currentUser && /^[a-z0-9-]{1,30}$/.test(String(feature))) markUsed(String(feature));
      } catch {
        /* không để việc đo làm hỏng tính năng */
      }
    },
  };
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

  // (3) Cài đặt → Tài khoản & bảo mật: công tắc chỉ số ẩn danh (v2.71.0).
  const arrange = () => {
    const body = document.querySelector('#editor-body');
    const group = body?.querySelector('details.wf-settings-group[data-group=account]') || body?.querySelector('details.wf-settings-group[data-group=data]');
    const content = group?.querySelector(':scope > .wf-settings-content');
    if (!content || content.querySelector('[data-usage-block]')) return;
    const block = document.createElement('div');
    block.className = 'usage-block';
    block.dataset.usageBlock = '';
    block.innerHTML =
      '<h4>Chỉ số ẩn danh</h4>' +
      '<p class="help-copy">Mỗi ngày, mỗi thiết bị gửi tối đa một dấu cho mỗi màn hình hoặc tính năng đã mở (ví dụ “Điểm tích lũy”, “Thêm nhanh”) cùng số phiên bản ứng dụng. Không kèm tên, email, nội dung việc hay ghi chú, mã tài khoản hay địa chỉ IP. Dấu này chỉ để biết nên cải thiện phần nào. Áp dụng cho thiết bị này; trình duyệt bật “Do Not Track” hoặc Global Privacy Control thì không gửi.</p>' +
      '<label class="check-row"><input type="checkbox" id="usage-share"' + (enabled() ? ' checked' : '') + '><span>Chia sẻ chỉ số ẩn danh từ thiết bị này</span></label>' +
      '<p class="help-copy">Báo lỗi tự động khi một đoạn mã của ứng dụng bị lỗi là mục riêng, không nằm trong công tắc này.</p>';
    content.append(block);
  };
  const accountPanelBeforeUsage = accountPanel;
  accountPanel = function () {
    accountPanelBeforeUsage.apply(this, arguments);
    try {
      arrange();
    } catch {
      /* Cài đặt vẫn dùng được nếu khối này lỗi */
    }
  };
  document.addEventListener('change', (e) => {
    if (e.target?.id !== 'usage-share') return;
    const on = e.target.checked;
    if (!setEnabled(on)) {
      e.target.checked = enabled();
      return notify('Chưa lưu được lựa chọn. Hãy thử lại.');
    }
    notify(on ? 'Đã bật chỉ số ẩn danh trên thiết bị này.' : 'Đã tắt chỉ số ẩn danh trên thiết bị này. Thiết bị này không gửi dấu dùng nào nữa.');
  });
})();
