'use strict';
// v1.80.0: gom các loại thông báo về MỘT nhóm "Thông báo" trong Cài đặt (một cột, xếp dọc): Công việc · Việc hằng ngày · Điểm tích lũy.
// - Công việc: giữ nguyên email nhắc việc và lịch gửi; hai nút thông báo trình duyệt được chuyển về đây.
// - Việc hằng ngày: hai công tắc (nhắc đến giờ từng việc; nhắc nhẹ khi hôm nay chưa tích việc nào), lưu trên thiết bị này, thiếu = bật như trước.
// - Điểm tích lũy: "thông báo điểm nghiệp" (data.growth.notify: báo khi cộng điểm / lên cấp / lên cảnh giới) và "gợi ý cải thiện hằng tuần"
//   (data.growth.tips: mỗi tuần một gợi ý trong chuông thông báo). Cả hai thiếu = bật; chỉ có khi đã chọn nhân vật.
// Tệp này nạp sau studio-zen.js vì studio-zen.js ghi đè hẳn refreshBell.
(function () {
  const uid = () => currentUser?.id || '';
  const on = (key) => !!window.zenGrowth?.started() && window.zenGrowth.growth()[key] !== false;
  const monday = () => window.zenHabits.mondayOf(today());
  // Gợi ý hằng tuần: 'dot' = chấm cạnh chuông đã được xem (mở chuông), 'done' = đã bấm vào gợi ý (hết tuần này thì mới có gợi ý mới).
  const tipKey = (kind) => 'zen-growth-tip-' + kind + ':' + uid() + ':' + monday();
  const tipPending = () => !!currentUser && on('tips') && localRead(tipKey('done')) !== '1';
  const lower = (x) => x.charAt(0).toLocaleLowerCase('vi') + x.slice(1);
  function tipSummary() {
    const tips = window.zenGrowth.tipsOf(window.zenGrowth.buildReport());
    const trend = tips.find((t) => t.kind === 'trend' || t.kind === 'start'), weak = tips.find((t) => t.kind === 'weak');
    return [trend?.title, weak ? weak.title.replace('Bồi bổ ', 'Nên bồi bổ ') + ': ' + lower(weak.ideas[0]) : ''].filter(Boolean).join(' · ') + '.';
  }

  // ---- Chuông thông báo ---------------------------------------------------------------------------------------------------
  const baseRefresh = refreshBell;
  refreshBell = function () {
    baseRefresh.apply(this, arguments);
    if (!tipPending() || localRead(tipKey('dot')) === '1') return;
    if (!bell.querySelector('.notification-extra')) bell.insertAdjacentHTML('beforeend', '<span class="notification-extra" aria-hidden="true"></span>');
    bell.setAttribute('aria-label', (bell.getAttribute('aria-label') || 'Thông báo') + '; ngoài ra có gợi ý cải thiện tuần này');
  };
  const baseBellClick = bell.onclick;
  bell.onclick = () => {
    baseBellClick?.();
    if (!tipPending()) return;
    document.querySelector('#editor-body .notice-list')?.insertAdjacentHTML('afterbegin', '<button type="button" class="notice-item" data-gr-tip-open><strong>' + svgIcon('growth') + ' Gợi ý cải thiện tuần này</strong><span>' + esc(tipSummary()) + '</span><small>Bấm để xem báo cáo tu luyện</small></button>');
    localWrite(tipKey('dot'), '1');
    refreshBell();
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('[data-gr-tip-open]')) return;
    localWrite(tipKey('done'), '1');
    $('#editor').close();
    refreshBell();
    window.zenGrowth.openReport();
  });

  // ---- Cài đặt → Thông báo ------------------------------------------------------------------------------------------------
  const check = (id, checked, text, disabled) => '<label class="check-row"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '><span>' + text + '</span></label>';
  function block(id, title, intro) {
    const s = document.createElement('section');
    s.className = 'nf-block';
    s.dataset.nf = id;
    s.innerHTML = '<h4>' + title + '</h4>' + (intro ? '<p class="help-copy">' + intro + '</p>' : '');
    return s;
  }
  const status = (el, text) => {
    const p = el.closest('.nf-block')?.querySelector('.nf-status');
    if (p) p.textContent = text;
  };
  function arrange() {
    const body = document.querySelector('#editor-body');
    const group = [...(body?.querySelectorAll('details.wf-settings-group') || [])].find((d) => d.querySelector(':scope > summary')?.textContent.trim() === 'Thông báo');
    const content = group?.querySelector(':scope > .wf-settings-content');
    if (!content || content.querySelector('.nf-blocks') || !window.zenGrowth || !window.zenHabits) return;
    const wrap = document.createElement('div');
    wrap.className = 'nf-blocks';

    // 1. Công việc: nội dung có sẵn + hai nút thông báo trình duyệt.
    const task = block('task', 'Công việc');
    [...content.childNodes].forEach((n) => task.append(n));
    const enable = body.querySelector('#enable-push'), disable = body.querySelector('#disable-push');
    if (enable || disable) {
      const push = document.createElement('div');
      push.className = 'nf-push';
      push.innerHTML = '<small>Thông báo trình duyệt (chỉ thiết bị này)</small>';
      const row = document.createElement('div');
      row.className = 'nf-push-row';
      [enable, disable].filter(Boolean).forEach((b) => row.append(b));
      push.append(row);
      task.append(push);
    }

    // 2. Việc hằng ngày.
    const habit = block('habit', 'Việc hằng ngày', 'Áp dụng cho thiết bị này. Giờ nhắc riêng của từng việc đặt khi thêm hoặc chỉnh sửa việc.');
    habit.insertAdjacentHTML('beforeend', check('nf-habit-due', window.zenHabits.notifyOn('due'), 'Nhắc đến giờ của từng việc (khung nhắc ở trang Việc hằng ngày và chấm trên chuông).') + check('nf-habit-nudge', window.zenHabits.notifyOn('nudge'), 'Nhắc nhẹ khi hôm nay chưa tích việc nào.') + '<p class="nf-status" role="status"></p>');

    // 3. Điểm tích lũy.
    const gr = block('growth', 'Điểm tích lũy');
    if (window.zenGrowth.started()) {
      const g = window.zenGrowth.growth(), ro = typeof contentReadOnly !== 'undefined' && contentReadOnly;
      gr.insertAdjacentHTML('beforeend', '<p class="help-copy">Đồng bộ theo tài khoản, áp dụng cho mọi thiết bị.</p>' +
        check('nf-growth-notify', g.notify !== false, 'Thông báo điểm nghiệp: báo số điểm vừa cộng, khi hiệp khách lên cấp và khi đột phá cảnh giới mới.', ro) +
        check('nf-growth-tips', g.tips !== false, 'Gợi ý cải thiện hằng tuần: mỗi tuần một bí kíp trong chuông thông báo, dựa trên mạch đang yếu nhất.', ro) + '<p class="nf-status" role="status"></p>');
    } else {
      gr.insertAdjacentHTML('beforeend', '<p class="help-copy">Chọn hiệp khách ở mục Điểm tích lũy để bật thông báo điểm nghiệp và gợi ý cải thiện hằng tuần.</p><div><button type="button" class="btn" data-nf-open-growth>Mở Điểm tích lũy</button></div>');
    }
    wrap.append(task, habit, gr);
    content.append(wrap);
  }
  const baseAccount = accountPanel;
  accountPanel = function () {
    baseAccount.apply(this, arguments);
    try {
      arrange();
    } catch {
      // Cài đặt vẫn dùng được nếu việc xếp lại nhóm Thông báo gặp lỗi.
    }
  };

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!el?.id) return;
    if (el.id === 'nf-habit-due' || el.id === 'nf-habit-nudge') {
      localWrite(window.zenHabits.notifyKey(el.id === 'nf-habit-due' ? 'due' : 'nudge'), el.checked ? '1' : '0');
      refreshBell();
      status(el, el.checked ? 'Đã bật.' : 'Đã tắt trên thiết bị này.');
    } else if (el.id === 'nf-growth-notify' || el.id === 'nf-growth-tips') {
      const key = el.id === 'nf-growth-notify' ? 'notify' : 'tips';
      if (!wfSave(() => { data.growth[key] = el.checked; })) {
        el.checked = !el.checked;
        return status(el, 'Chưa lưu được. Hãy thử lại.');
      }
      refreshBell();
      status(el, el.checked ? 'Đã bật.' : 'Đã tắt.');
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('[data-nf-open-growth]')) return;
    $('#editor').close();
    go('growth');
  });
  refreshBell();
})();
