'use strict';
// v1.67.0: báo cáo thu chi tài chính hằng tuần qua email. Cài đặt (bật/tắt, ngày, giờ) nằm trong Cài đặt, ngay dưới "Tổng kết tuần",
// cùng kiểu với email tổng kết công việc. Cài đặt lưu trong dữ liệu người dùng (data.financeReport) và đồng bộ như mọi dữ liệu khác;
// máy chủ gửi theo lịch (server/notifications.mjs) và chỉ gửi khi đã có ít nhất một khoản thu chi.
(function () {
  const DAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const DEFAULTS = { enabled: false, day: 0, hour: 9 };
  let openNext = false;

  // Cùng quy tắc với máy chủ (server/finance-report.mjs validFinanceSettings).
  function validFinanceSettings(v) {
    if (v === undefined) return true;
    return (
      !!v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      Object.keys(v).every((k) => ['enabled', 'day', 'hour'].includes(k)) &&
      typeof v.enabled === 'boolean' &&
      Number.isInteger(v.day) &&
      v.day >= 0 &&
      v.day <= 6 &&
      Number.isInteger(v.hour) &&
      v.hour >= 0 &&
      v.hour <= 23
    );
  }
  const validBeforeFinance = valid;
  valid = function (d) {
    return validBeforeFinance(d) && validFinanceSettings(d.financeReport);
  };

  const current = () => ({ ...DEFAULTS, ...(validFinanceSettings(data.financeReport) ? data.financeReport || {} : {}) });
  const hourText = (h) => String(h).padStart(2, '0') + ':00';

  function sectionHTML() {
    const s = current();
    return (
      '<section class="profile-card finance-settings">' +
      '<p class="subtext">Tổng chi, tổng thu hồi và lãi/lỗ của từng dự án. Email chỉ được gửi khi đã có ít nhất một khoản thu chi trong Phân bổ tài nguyên.</p>' +
      '<div class="report-setting-controls">' +
      '<label class="settings-toggle"><input id="finance-report-enabled" type="checkbox"' + (s.enabled ? ' checked' : '') + '><span>Email báo cáo thu chi hằng tuần</span></label>' +
      '<label class="report-hour">Ngày gửi<select id="finance-report-day" aria-label="Ngày gửi báo cáo thu chi">' +
      DAYS.map((label, day) => '<option value="' + day + '"' + (day === s.day ? ' selected' : '') + '>' + label + '</option>').join('') +
      '</select></label>' +
      '<label class="report-hour">Giờ gửi<select id="finance-report-hour" aria-label="Giờ gửi báo cáo thu chi, giờ Việt Nam">' +
      Array.from({ length: 24 }, (_, h) => '<option value="' + h + '"' + (h === s.hour ? ' selected' : '') + '>' + hourText(h) + '</option>').join('') +
      '</select></label>' +
      '</div>' +
      '<div class="help-actions"><button type="button" class="btn primary" id="save-finance-settings">Lưu</button><button type="button" class="btn" id="preview-finance-report">Xem báo cáo & PDF</button></div>' +
      '<p id="finance-settings-status" role="status"></p>' +
      '</section>'
    );
  }

  // Chèn ngay dưới "Tổng kết tuần", ở cả hai dạng hộp Cài đặt (nhóm thu gọn hoặc danh sách phẳng).
  function inject() {
    const body = document.querySelector('#editor-body');
    if (!body || !currentUser || body.querySelector('.finance-settings')) return;
    const weekly = body.querySelector('.weekly-settings');
    if (!weekly) return;
    const template = document.createElement('template');
    template.innerHTML = sectionHTML();
    const section = template.content.firstElementChild;
    const group = weekly.closest('details.wf-settings-group');
    if (group) {
      const next = document.createElement('details');
      next.className = 'wf-settings-group finance-settings-group';
      const summary = document.createElement('summary');
      summary.textContent = 'Báo cáo thu chi tuần';
      const content = document.createElement('div');
      content.className = 'wf-settings-content';
      content.append(section);
      next.append(summary, content);
      group.after(next);
      if (openNext) next.open = true;
    } else {
      const heading = document.createElement('h3');
      heading.className = 'settings-section settings-full';
      heading.textContent = 'Báo cáo thu chi tuần';
      weekly.after(heading, section);
    }
    if (openNext) {
      openNext = false;
      section.scrollIntoView?.({ block: 'center' });
    }
  }
  const editorBody = document.querySelector('#editor-body');
  if (editorBody) new MutationObserver(inject).observe(editorBody, { childList: true, subtree: true });

  const status = (text) => {
    const el = document.querySelector('#finance-settings-status');
    if (el) el.textContent = text;
  };
  function saveSettings(button) {
    const next = {
      enabled: document.querySelector('#finance-report-enabled').checked,
      day: Number(document.querySelector('#finance-report-day').value),
      hour: Number(document.querySelector('#finance-report-hour').value),
    };
    button.disabled = true;
    try {
      if (!wfSave(() => { data.financeReport = next; })) return status('Chưa lưu được cài đặt. Hãy thử lại.');
      status(next.enabled ? 'Đã lưu. Báo cáo được gửi vào ' + DAYS[next.day] + ' lúc ' + hourText(next.hour) + ' (giờ Việt Nam), khi đã có khoản thu chi.' : 'Đã lưu. Đã tắt email báo cáo thu chi.');
    } finally {
      button.disabled = false;
    }
  }

  function openFinanceReport() {
    if (document.querySelector('.report-dialog')) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'report-dialog';
    // Chỉ có một hộp báo cáo mở tại một thời điểm, nên dùng chung id nút đóng để giữ đúng kiểu nút × của báo cáo tuần (kể cả giao diện tối).
    dialog.setAttribute('aria-label', 'Xem trước báo cáo thu chi tuần');
    dialog.innerHTML =
      '<div class="report-dialog-toolbar"><div><strong>Báo cáo thu chi tuần</strong><small>Bản xem trước giống nội dung email</small></div><div>' +
      '<button type="button" class="btn" id="print-finance-report" disabled>' + svgIcon('download') + 'In / Lưu PDF</button>' +
      '<button type="button" class="icon-btn" id="close-weekly-report" aria-label="Đóng báo cáo">×</button></div></div>' +
      '<p class="report-print-hint">Để xuất PDF: chọn “Lưu dưới dạng PDF” trong hộp thoại in.</p>' +
      '<p id="finance-preview-status" role="status">Đang chuẩn bị báo cáo…</p>' +
      '<iframe title="Báo cáo thu chi tuần" id="finance-report-frame" sandbox="allow-same-origin allow-modals" hidden></iframe>';
    document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.querySelector('#close-weekly-report').onclick = () => dialog.close();
    dialog.showModal();
    requestAPI('finance-report')
      .then((report) => {
        if (!dialog.isConnected) return;
        const frame = dialog.querySelector('iframe');
        frame.onload = () => {
          dialog.querySelector('#finance-preview-status').hidden = true;
          dialog.querySelector('#print-finance-report').disabled = false;
        };
        frame.srcdoc = report.html;
        frame.hidden = false;
        dialog.querySelector('#print-finance-report').onclick = () => {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        };
      })
      .catch((err) => {
        if (dialog.isConnected) dialog.querySelector('#finance-preview-status').textContent = err.message;
      });
  }

  document.addEventListener('click', (event) => {
    const save = event.target.closest('#save-finance-settings');
    if (save) return saveSettings(save);
    if (event.target.closest('#preview-finance-report')) return openFinanceReport();
    // Từ trang Phân bổ tài nguyên: mở Cài đặt và mở sẵn phần báo cáo thu chi.
    if (event.target.closest('[data-bg-email]')) {
      openNext = true;
      accountPanel();
    }
  });
})();
