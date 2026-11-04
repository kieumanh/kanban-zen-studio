'use strict';
// v1.20.0: "Việc hằng ngày" — bảng theo dõi thói quen theo tuần, nằm dưới mục "Tất cả công việc".
// Dữ liệu: data.dailyHabits = [{id,name,icon,color,createdAt,done:['YYYY-MM-DD',...]}], mỗi việc là một bản ghi riêng khi đồng bộ.
(function () {
  const COLORS = ['#7950c8', '#b8467f', '#b5552a', '#2e7d5b', '#3a6fb0', '#8a5a14'];
  const ICONS = ['🌿', '🧘', '💧', '🚶', '📖', '🌙', '☀️', '✍️'];
  const SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const LONG = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
  const PRESETS = [['🧘', 'Thiền 10 phút'], ['💧', 'Uống đủ nước'], ['🚶', 'Đi bộ nhẹ'], ['📖', 'Đọc vài trang sách'], ['🌙', 'Ngủ trước 23 giờ']];
  const MAX = 60;
  const RING = 2 * Math.PI * 22;
  const DAY = 864e5;
  let weekStartDate = '';
  let renderedDay = '';

  const toDate = (s) => new Date(s + 'T12:00:00Z');
  const addDays = (s, n) => new Date(toDate(s).getTime() + n * DAY).toISOString().slice(0, 10);
  const mondayOf = (s) => addDays(s, -((toDate(s).getUTCDay() + 6) % 7));
  const short = (s) => s.slice(8, 10) + '/' + s.slice(5, 7);
  const list = () => (Array.isArray(data.dailyHabits) ? data.dailyHabits : []);
  const find = (id) => list().find((h) => h.id === id);
  const week = () => weekStartDate || mondayOf(today());
  const days = () => Array.from({ length: 7 }, (_, i) => addDays(week(), i));

  function streak(h) {
    const done = new Set(h.done);
    let d = today();
    if (!done.has(d)) d = addDays(d, -1);
    let n = 0;
    while (done.has(d)) {
      n++;
      d = addDays(d, -1);
    }
    return n;
  }
  const weekDone = (h) => days().filter((d) => h.done.includes(d)).length;
  const todayDone = () => list().filter((h) => h.done.includes(today())).length;
  // Một ngày được tính cho một việc khi đã tới ngày và (việc đã tạo từ ngày đó hoặc người dùng tích bổ sung).
  const tracked = (h, d) => d <= today() && (d >= h.createdAt || h.done.includes(d));
  // v1.21.0: tiến độ cộng gộp của tuần đang xem = số lượt đã tích / số lượt cần tích (mọi việc, các ngày đã tới).
  function weekProgress() {
    let tr = 0, dn = 0;
    for (const h of list()) for (const d of days()) if (tracked(h, d)) { tr++; if (h.done.includes(d)) dn++; }
    return { tr, dn, pct: tr ? Math.round((dn / tr) * 100) : 0 };
  }
  let mode = 'week';
  let range = 30;
  window.zenHabits = { list, today: () => today(), addDays, toDate, mondayOf, short, streak, tracked, SHORT, LONG, esc: (s) => esc(s) };

  iconPaths.habits = 'M4 12a8 8 0 0 1 14-5.3L20 9 M20 4v5h-5 M20 12a8 8 0 0 1-14 5.3L4 15 M4 20v-5h5 M9.5 12l2 2 3.5-4';
  const flame = '<svg class="hb-flame" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2 0 2 1 3 2 3 0-3 0-5.8 1-8.8z"/></svg>';
  const tick = '<svg class="hb-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M5.5 12.5l4.2 4.2L18.5 7.5"/></svg>';

  const reportIcon = '<svg class="hb-rp-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect class="b1" x="4" y="12" width="4" height="8" rx="1.5"/><rect class="b2" x="10" y="5" width="4" height="15" rx="1.5"/><rect class="b3" x="16" y="9" width="4" height="11" rx="1.5"/></svg>';
  const gridIcon = '<svg class="hb-rp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><path d="M14.5 17l2 2 3.5-4"/></svg>';
  function checkButton(h, d) {
    const done = h.done.includes(d),
      future = d > today(),
      i = (toDate(d).getUTCDay() + 6) % 7;
    return '<div class="hb-cell' + (d === today() ? ' is-today' : '') + '"><span class="hb-dayname" aria-hidden="true">' + SHORT[i] + '</span><button type="button" class="hb-check' + (done ? ' is-done' : '') + '" role="checkbox" aria-checked="' + done + '" data-hb-toggle="' + esc(h.id) + '" data-hb-date="' + d + '"' + (future ? ' disabled' : '') + ' aria-label="' + esc(h.name) + ' — ' + LONG[i] + ' ' + short(d) + (future ? ' (chưa đến ngày)' : '') + '">' + tick + '</button></div>';
  }
  function meta(h) {
    const s = streak(h);
    return '<span class="hb-streak' + (s ? ' is-on' : '') + '">' + flame + (s ? 'Chuỗi ' + s + ' ngày' : 'Chưa có chuỗi') + '</span><span class="hb-week-count">' + weekDone(h) + '/7 trong tuần</span>';
  }
  function row(h) {
    return '<li class="hb-row" data-hb-row="' + esc(h.id) + '" style="--hb:' + esc(h.color) + '"><div class="hb-info"><span class="hb-icon" aria-hidden="true">' + esc(h.icon || '✳') + '</span><div class="hb-text"><strong class="hb-name">' + esc(h.name) + '</strong><span class="hb-meta">' + meta(h) + '</span></div><div class="hb-actions"><button type="button" class="icon-btn hb-act" data-hb-edit="' + esc(h.id) + '" aria-label="Sửa ' + esc(h.name) + '" title="Sửa">' + svgIcon('edit') + '</button><button type="button" class="icon-btn hb-act hb-del" data-hb-delete="' + esc(h.id) + '" aria-label="Xóa ' + esc(h.name) + '" title="Xóa">' + svgIcon('trash') + '</button></div></div><div class="hb-days">' + days().map((d) => checkButton(h, d)).join('') + '</div></li>';
  }
  function ring(done, total) {
    const pct = total ? done / total : 0;
    return '<svg class="hb-ring" viewBox="0 0 56 56" aria-hidden="true"><circle class="hb-ring-bg" cx="28" cy="28" r="22"/><circle class="hb-ring-fg" cx="28" cy="28" r="22" stroke-dasharray="' + RING.toFixed(2) + '" stroke-dashoffset="' + (RING * (1 - pct)).toFixed(2) + '"/></svg>';
  }
  function summary() {
    const total = list().length,
      done = todayDone(),
      all = total > 0 && done === total;
    return '<div class="hb-summary' + (all ? ' is-complete' : '') + '" id="hb-summary"><span class="hb-ring-wrap">' + ring(done, total) + '<svg class="hb-ring-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M6 12.5l4 4L18 8"/></svg></span><div class="hb-summary-text"><strong id="hb-summary-count">' + done + '/' + total + '</strong><span>việc hôm nay</span></div><span class="hb-done-pill" id="hb-done-pill"' + (all ? '' : ' hidden') + '>Hoàn thành hôm nay</span><p class="hb-cheer" id="hb-cheer" role="status">' + (all ? 'Hôm nay bạn đã hoàn thành tất cả. Nhẹ nhõm thật.' : '') + '</p></div>';
  }
  function progressBlock() {
    const p = weekProgress(),
      current = week() === mondayOf(today());
    return '<div class="hb-progress' + (p.pct === 100 && p.tr ? ' is-full' : '') + '" id="hb-progress"><div class="hb-progress-head"><span id="hb-progress-title">' + (current ? 'Tiến độ tuần này' : 'Tiến độ tuần ' + short(week()) + ' – ' + short(addDays(week(), 6))) + '</span><strong id="hb-progress-pct">' + p.pct + '%</strong></div><div class="hb-bar" id="hb-bar" role="progressbar" aria-label="Tiến độ cộng gộp của tất cả việc trong tuần" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p.pct + '"><span style="width:' + p.pct + '%"></span></div><small id="hb-progress-note">' + progressNote(p) + '</small></div>';
  }
  const progressNote = (p) => (p.tr ? p.dn + '/' + p.tr + ' lượt đã tích, cộng gộp mọi việc' : 'Chưa có ngày nào để tính trong tuần này');
  function head() {
    const labels = days().map((d, i) => '<span class="' + (d === today() ? 'is-today' : '') + '"><b>' + SHORT[i] + '</b><small>' + short(d).slice(0, 2) + '</small></span>').join('');
    return '<div class="hb-head" aria-hidden="true"><span></span><div class="hb-days">' + labels + '</div></div>';
  }
  function empty() {
    return '<div class="hb-empty"><span class="hb-empty-mark" aria-hidden="true">🌱</span><h2>Chưa có việc hằng ngày nào</h2><p class="subtext">Bắt đầu bằng một việc thật nhỏ. Bạn có thể chọn gợi ý bên dưới hoặc tự thêm.</p><div class="hb-presets">' + PRESETS.map(([i, n]) => '<button type="button" class="hb-preset" data-hb-preset="' + esc(n) + '"><span aria-hidden="true">' + i + '</span>' + esc(n) + '</button>').join('') + '</div></div>';
  }
  function weekBar() {
    const ws = week(),
      current = ws === mondayOf(today());
    return '<div class="hb-weekbar"><span class="hb-weekbar-title">Bảng tuần</span><div class="hb-week-nav" role="group" aria-label="Chọn tuần"><button type="button" class="icon-btn hb-week-btn" data-hb-week="-1" aria-label="Tuần trước">‹</button><strong class="hb-week-label" id="hb-week-label">' + short(ws) + ' – ' + short(addDays(ws, 6)) + '</strong><button type="button" class="icon-btn hb-week-btn" data-hb-week="1" aria-label="Tuần sau">›</button><button type="button" class="btn hb-now" data-hb-week="0"' + (current ? ' disabled' : '') + '>Hôm nay</button></div></div>';
  }
  function actions() {
    const report = mode === 'report';
    return '<div class="hb-heading-actions"><button class="btn primary hb-add" type="button" data-hb-add><span class="btn-icon">+</span> Thêm việc</button><button class="btn hb-report-btn' + (report ? ' is-active' : '') + '" type="button" data-hb-mode="' + (report ? 'week' : 'report') + '" aria-pressed="' + report + '">' + (report ? gridIcon : reportIcon) + '<span>' + (report ? 'Bảng tuần' : 'Báo cáo') + '</span></button></div>';
  }
  function page() {
    renderedDay = today();
    const hs = list(),
      report = mode === 'report';
    const body = report
      ? window.zenHabitsReport
        ? window.zenHabitsReport.html(range)
        : ''
      : '<div class="hb-overview">' + summary() + progressBlock() + '</div>' + weekBar() + (hs.length ? head() + '<ul class="hb-list">' + hs.map(row).join('') + '</ul>' : empty());
    return heading('MỖI NGÀY MỘT BƯỚC NHỎ', report ? 'Báo cáo việc hằng ngày' : 'Việc hằng ngày', report ? 'Biểu đồ, đánh giá và đề xuất cải thiện từ chính dữ liệu tích của bạn.' : 'Tích từng việc nhỏ mỗi ngày để nuôi dưỡng thói quen tốt.', actions()) + '<section class="panel hb-panel' + (report ? ' is-report' : '') + '" aria-label="' + (report ? 'Báo cáo việc hằng ngày' : 'Bảng việc hằng ngày') + '">' + body + '</section>';
  }

  function paintStats(celebrate) {
    const total = list().length,
      done = todayDone(),
      all = total > 0 && done === total,
      box = document.querySelector('#hb-summary');
    if (!box) return;
    box.classList.toggle('is-complete', all);
    box.querySelector('.hb-ring-fg')?.setAttribute('stroke-dashoffset', (RING * (1 - (total ? done / total : 0))).toFixed(2));
    document.querySelector('#hb-summary-count').textContent = done + '/' + total;
    document.querySelector('#hb-cheer').textContent = all ? 'Hôm nay bạn đã hoàn thành tất cả. Nhẹ nhõm thật.' : '';
    document.querySelector('#hb-done-pill').hidden = !all;
    const p = weekProgress(),
      box2 = document.querySelector('#hb-progress');
    if (box2) {
      box2.classList.toggle('is-full', p.pct === 100 && p.tr > 0);
      document.querySelector('#hb-progress-pct').textContent = p.pct + '%';
      document.querySelector('#hb-bar span').style.width = p.pct + '%';
      document.querySelector('#hb-bar').setAttribute('aria-valuenow', String(p.pct));
      document.querySelector('#hb-progress-note').textContent = progressNote(p);
    }
    if (celebrate && all) {
      box.classList.remove('hb-celebrate');
      void box.offsetWidth;
      box.classList.add('hb-celebrate');
    }
    list().forEach((h) => {
      const m = document.querySelector('[data-hb-row="' + CSS.escape(h.id) + '"] .hb-meta');
      if (m) m.innerHTML = meta(h);
    });
  }

  function addNav() {
    const anchor = document.querySelector('.sidebar [data-view="tasks"]');
    let b = document.querySelector('.sidebar [data-view="habits"]');
    if (!b) {
      b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav';
      b.dataset.view = 'habits';
      b.innerHTML = '<span>' + svgIcon('habits') + '</span>Việc hằng ngày';
    }
    // v1.21.1: luôn đặt ngay dưới "Tất cả công việc", bất kể mục "Chế độ tập trung" được chèn lúc nào.
    if (anchor && anchor.nextElementSibling !== b) anchor.after(b);
    b.classList.toggle('active', view === 'habits');
  }
  const baseRender = render;
  render = function () {
    baseRender();
    addNav();
    if (view !== 'habits') {
      mode = 'week';
      return;
    }
    $('#crumb').textContent = 'Việc hằng ngày';
    $('#main').innerHTML = page();
  };

  function form(h) {
    if (!h && list().length >= MAX) return notify('Tối đa ' + MAX + ' việc hằng ngày.');
    const color = h?.color || COLORS[list().length % COLORS.length];
    modal('<h2>' + (h ? 'Chỉnh sửa việc hằng ngày' : 'Thêm việc hằng ngày') + '</h2><div class="hb-form"><div class="hb-preview" id="hb-preview" style="--hb:' + color + '" aria-hidden="true"><span class="hb-icon">' + esc(h?.icon || '🌿') + '</span><span class="hb-preview-name">' + (esc(h?.name) || 'Tên việc của bạn') + '</span><span class="hb-preview-check">' + tick + '</span></div>' + field('Tên việc', 'name', h?.name || '', 'text', true, 80) + '<div class="hb-icon-field">' + field('Biểu tượng (1 ký tự)', 'icon', h?.icon || '🌿', 'text', true, 8) + '<div class="hb-icon-picks" role="group" aria-label="Gợi ý biểu tượng">' + ICONS.map((i) => '<button type="button" class="hb-icon-pick" data-hb-icon="' + i + '" aria-label="Chọn biểu tượng ' + i + '">' + i + '</button>').join('') + '</div></div><fieldset class="hb-swatches"><legend>Màu dấu tích</legend>' + COLORS.map((c, i) => '<label class="hb-swatch" style="--hb:' + c + '"><input type="radio" name="color" value="' + c + '"' + (c === color ? ' checked' : '') + '><span aria-hidden="true"></span><em class="sr-only">Màu ' + (i + 1) + '</em></label>').join('') + '</fieldset>' + (h ? '<button type="button" class="text-btn danger hb-form-delete" data-hb-delete="' + esc(h.id) + '">Xóa việc này</button>' : '') + '</div>', (fd) => {
      const name = String(fd.get('name') || '').trim(), icon = String(fd.get('icon') || '').trim() || '🌿', col = String(fd.get('color') || color);
      if (!name) return;
      if (wfSave(() => {
        if (h) { const t = find(h.id); if (!t) throw Error('Việc này không còn tồn tại.'); Object.assign(t, { name, icon, color: col }); }
        else { data.dailyHabits = list().concat({ id: uid(), name, icon, color: col, createdAt: today(), done: [] }); }
      })) { $('#editor').close(); render(); notify(h ? 'Đã cập nhật việc hằng ngày.' : 'Đã thêm việc hằng ngày.'); }
    });
    const eyebrow = document.querySelector('#modal-eyebrow');
    if (eyebrow) eyebrow.textContent = 'VIỆC HẰNG NGÀY';
    document.querySelector('#editor-body [name=name]')?.focus();
  }
  function confirmDelete(id) {
    const h = find(id);
    if (!h) return;
    modal('<div class="hb-confirm"><h2>Xóa việc hằng ngày?</h2><p>“' + esc(h.name) + '” và ' + h.done.length + ' lần đã tích sẽ bị xóa vĩnh viễn. Thao tác này không hoàn tác được.</p><div class="hb-confirm-actions"><button type="button" class="btn" data-hb-cancel>Giữ lại</button><button type="button" class="btn hb-confirm-delete" data-hb-confirm-delete="' + esc(h.id) + '">Xóa việc này</button></div></div>', null, true);
    const eyebrow = document.querySelector('#modal-eyebrow');
    if (eyebrow) eyebrow.textContent = 'VIỆC HẰNG NGÀY';
    document.querySelector('[data-hb-cancel]')?.focus();
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-hb-toggle],[data-hb-add],[data-hb-edit],[data-hb-delete],[data-hb-confirm-delete],[data-hb-cancel],[data-hb-week],[data-hb-preset],[data-hb-icon],[data-hb-mode],[data-hb-range]');
    if (!t) return;
    if (t.dataset.hbToggle) {
      const h = find(t.dataset.hbToggle), d = t.dataset.hbDate;
      if (!h || d > today()) return;
      const had = h.done.includes(d);
      if (!wfSave(() => { h.done = had ? h.done.filter((x) => x !== d) : h.done.concat(d).sort(); })) return render();
      t.classList.toggle('is-done', !had);
      t.setAttribute('aria-checked', String(!had));
      if (!had) {
        t.classList.remove('hb-pop');
        void t.offsetWidth;
        t.classList.add('hb-pop');
        t.addEventListener('animationend', () => t.classList.remove('hb-pop'), { once: true });
      }
      return paintStats(!had && d === today());
    }
    if (t.dataset.hbMode) {
      mode = t.dataset.hbMode === 'report' ? 'report' : 'week';
      render();
      return window.scrollTo({ top: 0, left: 0 });
    }
    if (t.dataset.hbRange) {
      range = [7, 30, 90].includes(Number(t.dataset.hbRange)) ? Number(t.dataset.hbRange) : 30;
      return render();
    }
    if (t.hasAttribute('data-hb-add')) return form();
    if (t.dataset.hbEdit) return form(find(t.dataset.hbEdit));
    if (t.dataset.hbDelete) return confirmDelete(t.dataset.hbDelete);
    if (t.hasAttribute('data-hb-cancel')) return $('#editor').close();
    if (t.dataset.hbConfirmDelete) {
      const id = t.dataset.hbConfirmDelete;
      if (wfSave(() => { data.dailyHabits = list().filter((h) => h.id !== id); })) { $('#editor').close(); render(); notify('Đã xóa việc hằng ngày.'); }
      return;
    }
    if (t.dataset.hbWeek !== undefined) {
      const n = Number(t.dataset.hbWeek);
      weekStartDate = n === 0 ? '' : addDays(week(), n * 7);
      return render();
    }
    if (t.dataset.hbPreset) {
      if (list().length >= MAX) return notify('Tối đa ' + MAX + ' việc hằng ngày.');
      const [icon, name] = PRESETS.find(([, n]) => n === t.dataset.hbPreset) || [];
      if (name && wfSave(() => { data.dailyHabits = list().concat({ id: uid(), name, icon, color: COLORS[list().length % COLORS.length], createdAt: today(), done: [] }); })) { render(); notify('Đã thêm “' + name + '”.'); }
      return;
    }
    if (t.dataset.hbIcon) {
      const input = document.querySelector('#editor-body [name=icon]');
      if (input) { input.value = t.dataset.hbIcon; input.focus(); syncPreview(); }
    }
  });
  function syncPreview() {
    const box = document.querySelector('#hb-preview'),
      body = document.querySelector('#editor-body');
    if (!box || !body) return;
    const color = body.querySelector('[name=color]:checked')?.value;
    if (color) box.style.setProperty('--hb', color);
    box.querySelector('.hb-icon').textContent = body.querySelector('[name=icon]')?.value.trim() || '🌿';
    box.querySelector('.hb-preview-name').textContent = body.querySelector('[name=name]')?.value.trim() || 'Tên việc của bạn';
  }
  document.addEventListener('input', (e) => { if (e.target.closest('#editor-body .hb-form')) syncPreview(); });
  document.addEventListener('change', (e) => { if (e.target.closest('#editor-body .hb-form')) syncPreview(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && view === 'habits' && renderedDay && renderedDay !== today()) render();
  });
})();
