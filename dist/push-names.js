'use strict';
// v2.49.0 (Thông Báo Có Tên): thông báo đẩy nay hiện tên 1–2 việc gấp nhất kèm số lượng (service worker hỏi /api/push-summary).
// Tên việc có thể hiện trên màn hình khóa nên mỗi thiết bị có một công tắc ở Cài đặt → Thông báo (mặc định bật). Lưu ở localStorage của
// thiết bị và chép sang bộ nhớ đệm 'zen-pref' (khóa /__zen-push-names) vì service worker không đọc được localStorage.
(function () {
  const KEY = 'zen-push-names';
  const isOn = () => localRead(KEY) !== '0';
  let mirrored = '';
  function mirror() {
    const value = isOn() ? 'on' : 'off';
    if (value === mirrored || typeof caches === 'undefined') return;
    mirrored = value;
    caches
      .open('zen-pref')
      .then((c) => c.put('/__zen-push-names', new Response(value, { headers: { 'Content-Type': 'text/plain' } })))
      .catch(() => {
        mirrored = '';
      });
  }
  mirror();

  function addToggle() {
    const body = document.querySelector('#editor-body');
    if (!body || body.querySelector('#nf-push-names')) return;
    const group = body.querySelector('details.wf-settings-group[data-group=notify] > .wf-settings-content');
    if (!group) return;
    // Đặt cạnh hai nút thông báo trình duyệt (khối "Công việc") nếu Cài đặt đã được xếp nhóm; chưa xếp thì để ở cuối nhóm, việc xếp nhóm sau đó sẽ gom vào cùng khối.
    const target = group.querySelector('.nf-push') || group.querySelector('.nf-block[data-nf=task]') || group;
    target.insertAdjacentHTML(
      'beforeend',
      '<label class="check-row"><input type="checkbox" id="nf-push-names"' +
        (isOn() ? ' checked' : '') +
        '><span>Hiện tên việc trong thông báo trình duyệt (áp dụng cho thiết bị này; có thể hiện trên màn hình khóa).</span></label><small id="nf-push-names-status" role="status"></small>',
    );
  }
  const baseAccount = accountPanel;
  accountPanel = function () {
    baseAccount.apply(this, arguments);
    try {
      addToggle();
    } catch {
      // Cài đặt vẫn dùng được nếu không thêm được công tắc.
    }
  };
  document.addEventListener('change', (e) => {
    if (e.target?.id !== 'nf-push-names') return;
    localWrite(KEY, e.target.checked ? '1' : '0');
    mirror();
    const status = document.getElementById('nf-push-names-status');
    if (status) status.textContent = e.target.checked ? 'Thông báo sẽ nêu tên việc gấp nhất.' : 'Thông báo chỉ nêu chung, không hiện tên việc.';
  });
  window.zenPushNames = { isOn, mirror };
})();
