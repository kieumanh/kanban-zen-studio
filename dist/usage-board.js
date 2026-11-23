'use strict';
// v2.76.0 (Bảng Thám Báo): chỉ số dùng ẩn danh (v2.71.0) xem ngay trong Cài đặt → Tài khoản & bảo mật, khỏi mở Cloudflare Workers Logs.
// Chỉ CHỦ triển khai thấy khối này: máy chủ trả 404 cho người khác (server/usage-stats.mjs) nên khối không hiện và không báo lỗi gì.
// Số liệu là số thiết bị-ngày đã mở từng màn hình hoặc tính năng (mỗi thiết bị tối đa một dấu mỗi ngày), không có người dùng hay nội dung.
(() => {
  const LABELS = {
    dashboard: 'Tổng quan',
    projects: 'Bảng dự án',
    calendar: 'Lịch',
    tasks: 'Kết quả tìm kiếm',
    versions: 'Phiên bản',
    notes: 'Ghi chú',
    habits: 'Thói quen hằng ngày',
    focus: 'Chế độ tập trung',
    worklist: 'Liên hoàn lệnh',
    budget: 'Phân bổ tài nguyên',
    growth: 'Điểm tích lũy',
    'growth-today': 'Điểm tích lũy · Hôm nay',
    'growth-octa': 'Điểm tích lũy · Bát phương',
    'growth-story': 'Điểm tích lũy · Truyện ký',
    'growth-gods': 'Điểm tích lũy · Thần giới',
    'growth-store': 'Điểm tích lũy · Tàng Bảo Các',
    'growth-all': 'Điểm tích lũy · Tất cả',
    'award-save': 'Bảng vận công · Lưu',
    'award-later': 'Bảng vận công · Để sau',
    'open-report': 'Mở báo cáo',
    quickadd: 'Thêm nhanh',
  };
  const label = (id) => LABELS[id] || id;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const nf = (n) => Number(n).toLocaleString('vi-VN');
  const dm = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
  let denied = false;
  let days = 7;

  function table(rows, key, head) {
    const max = Math.max(1, ...rows.map((r) => r.count));
    if (!rows.length) return '<p class="help-copy">Chưa có dấu nào trong khoảng này.</p>';
    return (
      '<table class="ub-table"><thead><tr><th scope="col">' + head + '</th><th scope="col" class="ub-n">Lượt</th></tr></thead><tbody>' +
      rows
        .map((r) => '<tr><th scope="row">' + esc(key === 'feature' ? label(r.feature) : r[key]) + '<span class="ub-bar" aria-hidden="true" style="width:' + Math.max(2, Math.round((r.count / max) * 100)) + '%"></span></th><td class="ub-n">' + nf(r.count) + '</td></tr>')
        .join('') +
      '</tbody></table>'
    );
  }

  function paint(box, s) {
    box.querySelector('[data-ub-sum]').textContent = s.total ? 'Tổng ' + nf(s.total) + ' lượt từ ' + dm(s.from) + ' đến ' + dm(s.to) + '.' : 'Chưa có dấu nào từ ' + dm(s.from) + ' đến ' + dm(s.to) + '.';
    box.querySelector('[data-ub-body]').innerHTML =
      '<h5>Theo tính năng</h5>' + table(s.features, 'feature', 'Tính năng') +
      '<h5>Theo phiên bản</h5>' + table(s.versions, 'version', 'Phiên bản') +
      '<h5>Theo ngày</h5>' + table(s.daily.map((d) => ({ day: dm(d.day), count: d.count })).reverse(), 'day', 'Ngày');
    for (const b of box.querySelectorAll('[data-ub-days]')) b.setAttribute('aria-pressed', String(Number(b.dataset.ubDays) === s.days));
  }

  // Lấy số liệu; trả về null nếu không phải chủ hoặc chưa tải được (không hiện gì để người khác không thấy dấu vết của bảng này).
  async function fetchStats() {
    try {
      const r = await fetch('/api/usage-stats?days=' + days, { credentials: 'same-origin', cache: 'no-store' });
      if (r.status === 404) denied = true;
      if (!r.ok) return null;
      const data = await r.json();
      return data && Array.isArray(data.features) && Array.isArray(data.versions) && Array.isArray(data.daily) ? data : null;
    } catch {
      return null;
    }
  }
  async function reload(box) {
    box.setAttribute('aria-busy', 'true');
    const data = await fetchStats();
    if (data) paint(box, data);
    else box.querySelector('[data-ub-sum]').textContent = 'Chưa tải được số liệu. Hãy thử lại sau.';
    box.removeAttribute('aria-busy');
  }

  let pending = false;
  const arrange = async () => {
    if (denied || pending || typeof currentUser === 'undefined' || !currentUser) return;
    const find = () => {
      const body = document.querySelector('#editor-body');
      const group = body?.querySelector('details.wf-settings-group[data-group=account]') || body?.querySelector('details.wf-settings-group[data-group=data]');
      return group?.querySelector(':scope > .wf-settings-content');
    };
    if (!find() || find().querySelector('[data-usage-board]')) return;
    pending = true;
    try {
      const data = await fetchStats();
      const content = find();
      if (!data || !content || content.querySelector('[data-usage-board]')) return; // không phải chủ, hoặc Cài đặt đã đóng trong lúc chờ
      const box = document.createElement('div');
      box.className = 'usage-block usage-board';
      box.dataset.usageBoard = '';
      box.innerHTML =
        '<h4>Bảng Thám Báo</h4>' +
        '<p class="help-copy">Số thiết bị đã mở từng màn hình hoặc tính năng mỗi ngày, từ các dấu ẩn danh. Không có tên người dùng hay nội dung; chỉ chủ triển khai thấy bảng này.</p>' +
        '<div class="ub-range" role="group" aria-label="Khoảng thời gian"><button type="button" class="btn" data-ub-days="7" aria-pressed="true">7 ngày</button><button type="button" class="btn" data-ub-days="30" aria-pressed="false">30 ngày</button></div>' +
        '<p class="help-copy" data-ub-sum aria-live="polite"></p><div data-ub-body></div>';
      content.append(box);
      paint(box, data);
    } finally {
      pending = false;
    }
  };
  const accountPanelBeforeBoard = accountPanel;
  accountPanel = function () {
    accountPanelBeforeBoard.apply(this, arguments);
    try {
      arrange().catch(() => {});
    } catch {
      /* Cài đặt vẫn dùng được nếu bảng này lỗi */
    }
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-ub-days]');
    if (!b) return;
    days = Number(b.dataset.ubDays) === 30 ? 30 : 7;
    const box = b.closest('[data-usage-board]');
    if (box) reload(box);
  });
})();
