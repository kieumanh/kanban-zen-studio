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

  iconPaths.habits = 'M4 12a8 8 0 0 1 14-5.3L20 9 M20 4v5h-5 M20 12a8 8 0 0 1-14 5.3L4 15 M4 20v-5h5 M9.5 12l2 2 3.5-4';
  const flame = '<svg class="hb-flame" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2 0 2 1 3 2 3 0-3 0-5.8 1-8.8z"/></svg>';
  const tick = '<svg class="hb-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M5.5 12.5l4.2 4.2L18.5 7.5"/></svg>';

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
    return '<div class="hb-summary' + (all ? ' is-complete' : '') + '" id="hb-summary">' + ring(done, total) + '<div><strong id="hb-summary-count">' + done + '/' + total + '</strong><span>việc hôm nay</span></div><p class="hb-cheer" id="hb-cheer" role="status">' + (all ? 'Hôm nay bạn đã hoàn thành tất cả. Nhẹ nhõm thật.' : '') + '</p></div>';
  }
  function head() {
    const labels = days().map((d, i) => '<span class="' + (d === today() ? 'is-today' : '') + '"><b>' + SHORT[i] + '</b><small>' + short(d).slice(0, 2) + '</small></span>').join('');
    return '<div class="hb-head" aria-hidden="true"><span></span><div class="hb-days">' + labels + '</div></div>';
  }
  function empty() {
    return '<div class="hb-empty"><span class="hb-empty-mark" aria-hidden="true">🌱</span><h2>Chưa có việc hằng ngày nào</h2><p class="subtext">Bắt đầu bằng một việc thật nhỏ. Bạn có thể chọn gợi ý bên dưới hoặc tự thêm.</p><div class="hb-presets">' + PRESETS.map(([i, n]) => '<button type="button" class="hb-preset" data-hb-preset="' + esc(n) + '"><span aria-hidden="true">' + i + '</span>' + esc(n) + '</button>').join('') + '</div></div>';
  }
  function page() {
    renderedDay = today();
    const hs = list(),
      ws = week(),
      current = ws === mondayOf(today());
    return heading('MỖI NGÀY MỘT BƯỚC NHỎ', 'Việc hằng ngày', 'Tích từng việc nhỏ mỗi ngày để nuôi dưỡng thói quen tốt.', '<button class="btn primary" type="button" data-hb-add><span class="btn-icon">+</span> Thêm việc</button>') +
      '<section class="panel hb-panel" aria-label="Bảng việc hằng ngày"><div class="hb-toolbar">' + summary() + '<div class="hb-week-nav" role="group" aria-label="Chọn tuần"><button type="button" class="icon-btn hb-week-btn" data-hb-week="-1" aria-label="Tuần trước">‹</button><strong class="hb-week-label" id="hb-week-label">' + short(ws) + ' – ' + short(addDays(ws, 6)) + '</strong><button type="button" class="icon-btn hb-week-btn" data-hb-week="1" aria-label="Tuần sau">›</button><button type="button" class="btn hb-now" data-hb-week="0"' + (current ? ' disabled' : '') + '>Hôm nay</button></div></div>' +
      (hs.length ? head() + '<ul class="hb-list">' + hs.map(row).join('') + '</ul>' : empty()) + '</section>';
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
    if (anchor && !document.querySelector('.sidebar [data-view="habits"]')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav';
      b.dataset.view = 'habits';
      b.innerHTML = '<span>' + svgIcon('habits') + '</span>Việc hằng ngày';
      anchor.after(b);
    }
    document.querySelector('.sidebar [data-view="habits"]')?.classList.toggle('active', view === 'habits');
  }
  const baseRender = render;
  render = function () {
    baseRender();
    addNav();
    if (view !== 'habits') return;
    $('#crumb').textContent = 'Việc hằng ngày';
    $('#main').innerHTML = page();
  };

  function form(h) {
    if (!h && list().length >= MAX) return notify('Tối đa ' + MAX + ' việc hằng ngày.');
    const color = h?.color || COLORS[list().length % COLORS.length];
    modal('<h2>' + (h ? 'Chỉnh sửa việc hằng ngày' : 'Thêm việc hằng ngày') + '</h2>' + field('Tên việc', 'name', h?.name || '', 'text', true, 80) + field('Biểu tượng (1 ký tự)', 'icon', h?.icon || '🌿', 'text', true, 8) + '<div class="hb-icon-picks" role="group" aria-label="Gợi ý biểu tượng">' + ICONS.map((i) => '<button type="button" class="hb-icon-pick" data-hb-icon="' + i + '" aria-label="Chọn biểu tượng ' + i + '">' + i + '</button>').join('') + '</div><fieldset class="hb-swatches"><legend>Màu dấu tích</legend>' + COLORS.map((c, i) => '<label class="hb-swatch" style="--hb:' + c + '"><input type="radio" name="color" value="' + c + '"' + (c === color ? ' checked' : '') + '><span aria-hidden="true"></span><em class="sr-only">Màu ' + (i + 1) + '</em></label>').join('') + '</fieldset>' + (h ? '<button type="button" class="text-btn danger" data-hb-delete="' + esc(h.id) + '">Xóa việc này</button>' : ''), (fd) => {
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
    const t = e.target.closest('[data-hb-toggle],[data-hb-add],[data-hb-edit],[data-hb-delete],[data-hb-confirm-delete],[data-hb-cancel],[data-hb-week],[data-hb-preset],[data-hb-icon]');
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
      if (input) { input.value = t.dataset.hbIcon; input.focus(); }
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && view === 'habits' && renderedDay && renderedDay !== today()) render();
  });
})();
