'use strict';
// v2.68.0 (Phân Đường): trang Tu vi chia thành các tab con thay vì một trang dài.
//   Hôm nay (hàng chờ vận công, hiệp khách, Bát phương đồ, Tâm pháp) · Bát phương (Bảng vàng, các mạch, lịch sử) · Truyện ký · Thần giới · Tàng Bảo Các · Tất cả (đúng trang dài như trước v2.68.0,
// cho ai quen cuộn một mạch; không có dòng hướng dẫn mở khóa).
// Mở khóa dần: Thần giới chỉ hiện từ cấp 80 (trước đó là một dòng “còn N cấp tới Thần giới” ở tab Hôm nay); Tàng Bảo Các hiện khi đã có điểm tu vi đầu tiên
// (tiệm không niêm yết giá nên chưa có “món rẻ nhất” để so). Mở khóa chỉ để hiển thị: không đổi dữ liệu, không lưu gì lên máy chủ. Tab đang xem được nhớ ở thiết bị này
// (localStorage, có try/catch); tab chưa mở khóa hay giá trị lạ thì về Hôm nay. growth.js đánh dấu các khối bằng <!--gr-tab:tên-->; thiếu tệp này thì growth.js bỏ dấu và hiện đủ như cũ.
(() => {
  const KEY = 'zen-gr-tab';
  const GODS_FROM = 80;
  const TABS = [
    ['today', 'Hôm nay'],
    ['octa', 'Bát phương'],
    ['story', 'Truyện ký'],
    ['gods', 'Thần giới'],
    ['store', 'Tàng Bảo Các'],
    ['all', 'Tất cả'],
  ];
  const ids = TABS.map((t) => t[0]);
  let tab = (() => {
    try {
      const v = localStorage.getItem(KEY);
      return ids.includes(v) ? v : 'today';
    } catch {
      return 'today';
    }
  })();
  let last = { level: 0, earned: 0 };
  const open = (info) => ({ today: true, octa: true, story: true, gods: (info.level || 0) >= GODS_FROM, store: (info.earned || 0) > 0, all: true });
  const current = (info) => (open(info)[tab] ? tab : 'today');

  function arrange(html, info) {
    last = info || last;
    const parts = html.split(/<!--gr-tab:(\w+)-->/);
    const head = parts[0];
    const sec = {};
    for (let i = 1; i < parts.length; i += 2) sec[parts[i]] = (sec[parts[i]] || '') + parts[i + 1];
    const ok = open(last);
    const cur = current(last);
    const hints = [];
    if (!ok.gods) hints.push('Thần giới mở khi các hạ đạt cấp ' + GODS_FROM + (last.level ? ' (còn ' + Math.max(0, GODS_FROM - last.level) + ' cấp)' : '') + '.');
    if (!ok.store) hints.push('Tàng Bảo Các mở khi các hạ có điểm tu vi đầu tiên.');
    const lock = hints.length ? '<p class="help-copy gr-tab-lock">' + hints.join(' ') + '</p>' : '';
    const body = { today: (sec.today || '') + lock + (sec.how || ''), octa: sec.octa || '', story: sec.story || '', gods: sec.gods || '', store: sec.store || '', all: (sec.today || '') + (sec.story || '') + (sec.gods || '') + (sec.octa || '') + (sec.store || '') + (sec.how || '') };
    const shown = TABS.filter((t) => ok[t[0]]);
    const bar =
      '<div class="gr-tabs" role="tablist" aria-label="Các mục của Tu vi">' +
      shown
        .map(([id, name]) => '<button type="button" role="tab" class="gr-tab" id="gr-tab-' + id + '" data-gr-tab="' + id + '" aria-selected="' + (id === cur) + '" aria-controls="gr-tabpanel" tabindex="' + (id === cur ? '0' : '-1') + '">' + name + '</button>')
        .join('') +
      '</div>';
    return head + bar + '<div class="gr-tabpanel" id="gr-tabpanel" role="tabpanel" aria-labelledby="gr-tab-' + cur + '">' + body[cur] + '</div>' + (sec.end || '</div>');
  }
  function go(id, opt) {
    if (!ids.includes(id)) return false;
    tab = id;
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // Nhớ tab chỉ là tiện ích: không lưu được thì vẫn đổi tab bình thường.
    }
    if (typeof render === 'function') render();
    if (!opt || opt.focus !== false) document.getElementById('gr-tab-' + current(last))?.focus();
    return true;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-gr-tab]');
    if (b) go(b.dataset.grTab);
  });
  document.addEventListener('keydown', (e) => {
    const b = e.target.closest && e.target.closest('[role=tab][data-gr-tab]');
    if (!b || e.altKey || e.ctrlKey || e.metaKey) return;
    const list = TABS.map((t) => t[0]).filter((id) => open(last)[id]);
    const i = list.indexOf(b.dataset.grTab);
    const to = e.key === 'ArrowRight' ? list[(i + 1) % list.length] : e.key === 'ArrowLeft' ? list[(i - 1 + list.length) % list.length] : e.key === 'Home' ? list[0] : e.key === 'End' ? list.at(-1) : null;
    if (!to) return;
    e.preventDefault();
    go(to);
  });
  // Trang vẽ lại (đồng bộ dữ liệu, lưu điểm…) làm mất tiêu điểm đang đặt trên một tab: trả tiêu điểm về đúng tab ấy để người dùng bàn phím không bị đẩy ra đầu trang.
  const baseRender = render;
  render = function () {
    const id = document.activeElement?.dataset?.grTab ? document.activeElement.id : '';
    const out = baseRender.apply(this, arguments);
    if (id && (!document.activeElement || document.activeElement === document.body)) document.getElementById(id)?.focus({ preventScroll: true });
    return out;
  };
  window.zenTabs = { arrange, go, current: () => current(last), open: () => open(last), TABS, GODS_FROM };
})();
