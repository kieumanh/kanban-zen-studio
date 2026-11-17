'use strict';
// v2.50.0 (Báo Đầy Dữ Liệu): máy chủ giữ tối đa 20 MB dữ liệu đồng bộ cho mỗi tài khoản (server/workspace-store.mjs: MAX_TOTAL).
// Trước đây mức dùng chỉ nằm trong nhóm "Dung lượng dữ liệu" đang đóng ở Cài đặt, nên người dùng chỉ biết khi lưu bị từ chối.
// Nay từ 70% trở lên, đầu Cài đặt hiện một khung báo mức dùng (từ 90%: nhấn mạnh hơn) kèm việc nên làm và nút mở chi tiết.
(function () {
  const LIMIT = 20000000;
  const SOFT = 0.7;
  const HARD = 0.9;
  const size = () => new TextEncoder().encode(JSON.stringify(data)).length;
  const mb = (bytes) => (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB';
  const pad = (n) => String(n);

  function level(bytes) {
    const ratio = bytes / LIMIT;
    return ratio >= 1 ? 'full' : ratio >= HARD ? 'high' : ratio >= SOFT ? 'warn' : '';
  }
  function html(bytes, kind) {
    const percent = Math.min(100, Math.floor((bytes / LIMIT) * 100));
    const lead = kind === 'full' ? 'Dữ liệu đồng bộ đã đầy: ' + mb(bytes) + ' / 20 MB.' : 'Dữ liệu đồng bộ đã dùng ' + pad(percent) + '%: ' + mb(bytes) + ' / 20 MB.';
    const hint = kind === 'full' ? 'Thay đổi mới có thể không đồng bộ được cho tới khi bạn giải phóng chỗ.' : 'Khi đầy, thay đổi mới sẽ không đồng bộ được.';
    return (
      '<p><strong>' + lead + '</strong></p>' +
      '<p>' + hint + '</p>' +
      '<p>Nên làm: xóa hẳn các mục trong Thùng rác, bỏ ghi chú hoặc bản phác thảo lớn không còn dùng, xuất bản sao JSON để lưu riêng rồi dọn dự án cũ.</p>' +
      '<div class="help-actions"><button class="btn" type="button" data-capacity-open>Xem chi tiết dung lượng</button></div>'
    );
  }
  function show() {
    const heading = document.querySelector('#editor-body h2');
    if (!heading || document.querySelector('#editor-body .capacity-warning')) return;
    const bytes = size();
    const kind = level(bytes);
    if (!kind) return;
    const box = document.createElement('div');
    box.className = 'capacity-panel capacity-warning capacity-' + kind;
    box.setAttribute('role', 'status');
    box.dataset.level = kind;
    box.innerHTML = html(bytes, kind);
    heading.after(box);
  }
  const baseAccount = accountPanel;
  accountPanel = function () {
    baseAccount.apply(this, arguments);
    try {
      show();
    } catch {
      // Cài đặt vẫn dùng được nếu không tính được dung lượng.
    }
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('[data-capacity-open]')) return;
    const body = document.querySelector('#editor-body');
    const group = body?.querySelector('#storage-capacity')?.closest('details');
    if (!group) return;
    group.open = true;
    group.scrollIntoView({ block: 'center' });
    group.querySelector('summary')?.focus();
  });
  window.zenCapacityWarning = { level, size };
})();
