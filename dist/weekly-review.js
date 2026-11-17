'use strict';
// v2.54.0 (Ôn Tuần): nhìn lại một tuần (việc đã xong, việc chưa xong, việc hằng ngày, thu chi) rồi chọn tối đa 3 việc cho tuần tới.
// Dữ liệu: không đổi lược đồ. (1) Việc vừa chuyển sang cột Hoàn thành được ghi thêm trường tùy chọn doneAt (YYYY-MM-DD); rời cột Hoàn thành thì bỏ trường này.
// Việc xong trước khi có tính năng này không có ngày nên không vào mục “Đã xong”. (2) Lựa chọn lưu thành một ghi chú dạng checklist, id cố định “wk-<thứ Hai của tuần>”,
// kèm trường weekPicks (id dự án + id việc) để Tổng quan hiện đúng việc; ghi chú vẫn mở và sửa được như mọi ghi chú.
// Hiện ở: bảng lệnh (“Ôn tuần”), Tổng quan (lời mời cuối tuần + khối “Việc trọng tâm tuần này”).
(() => {
  const PICK_MAX = 3;
  const LIST_MAX = 8;
  const CANDIDATE_MAX = 15;
  const NOTE_PREFIX = 'wk-';
  const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const plus = (day, n) => new Date(Date.parse(day + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const weekday = (day) => new Date(day + 'T12:00:00Z').getUTCDay();
  const mondayOf = (day) => plus(day, -((weekday(day) + 6) % 7));
  const short = (day) => day.slice(8, 10) + '/' + day.slice(5, 7);
  const daysBetween = (from, to) => Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000);
  const money = (n) => Math.round(n).toLocaleString('vi-VN') + ' ₫';
  const readOnly = () => typeof contentReadOnly !== 'undefined' && contentReadOnly;
  const noteId = (mon) => NOTE_PREFIX + mon;

  // ---- Ghi ngày hoàn thành ---------------------------------------------------------------------------------------------------
  // `known`: id việc → đang ở cột Hoàn thành hay không, tính ở lần vẽ / lưu trước. Khi dữ liệu bị thay cả khối (đồng bộ, khôi phục) thì
  // chỉ ghi nhớ lại, không ghi ngày, để việc đã xong ở máy khác không bị ghi nhầm là xong hôm nay.
  let known = new Map();
  let lastData = null;
  function track(stamp) {
    if (typeof data === 'undefined' || !data || !Array.isArray(data.projects)) return;
    if (data !== lastData) {
      lastData = data;
      known = new Map();
      stamp = false;
    }
    const next = new Map();
    for (const p of data.projects)
      for (const t of p.tasks || []) {
        const now = t.col === 'Done';
        if (stamp) {
          if (now && known.get(t.id) === false) t.doneAt = today();
          else if (!now && t.doneAt !== undefined) delete t.doneAt;
        }
        next.set(t.id, now);
      }
    known = next;
  }
  const baseSave = save;
  save = function () {
    try {
      track(true);
    } catch {
      /* việc ghi ngày không được làm hỏng việc lưu */
    }
    return baseSave.apply(this, arguments);
  };

  // ---- Số liệu một tuần ------------------------------------------------------------------------------------------------------
  function gather(mon) {
    const sun = plus(mon, 6);
    const rows = [];
    for (const p of data.projects || []) for (const t of p.tasks || []) rows.push({ t, p });
    const byTitle = (a, b) => a.t.title.localeCompare(b.t.title, 'vi');
    const done = rows
      .filter(({ t }) => t.col === 'Done' && isDay(t.doneAt) && t.doneAt >= mon && t.doneAt <= sun)
      .sort((a, b) => a.t.doneAt.localeCompare(b.t.doneAt) || byTitle(a, b));
    const open = rows.filter(({ t, p }) => !t.archived && !p.archived && t.col !== 'Done');
    const rank = (x) => (x.t.due && x.t.due < today() ? 0 : x.t.due ? 1 : 2);
    const unfinished = open
      .filter(({ t }) => (t.due && t.due <= sun) || t.col === 'Doing')
      .sort((a, b) => rank(a) - rank(b) || (a.t.due || '9999').localeCompare(b.t.due || '9999') || byTitle(a, b));
    // Việc để chọn cho tuần tới: đang làm và có hạn gần xếp trước.
    const order = (x) => (x.t.col === 'Doing' ? 0 : 1);
    const candidates = open
      .slice()
      .sort((a, b) => order(a) - order(b) || (a.t.due || '9999').localeCompare(b.t.due || '9999') || byTitle(a, b));
    const habits = [];
    let planned = 0;
    let achieved = 0;
    for (const h of window.zenHabits?.list?.() || []) {
      const s = window.zenHabits.weekStats(h, mon);
      if (!s) continue;
      habits.push({ h, g: s.g, n: s.n });
      planned += s.g;
      achieved += s.n;
    }
    let incoming = 0;
    let outgoing = 0;
    let entries = 0;
    for (const p of data.projects || []) {
      if (p.archived) continue;
      for (const e of Array.isArray(p.ledger) ? p.ledger : []) {
        if (!isDay(e.date) || e.date < mon || e.date > sun || !Number.isFinite(e.amount)) continue;
        entries++;
        if (e.type === 'in') incoming += e.amount;
        else if (e.type === 'out') outgoing += e.amount;
      }
    }
    return { mon, sun, done, unfinished, candidates, habits, planned, achieved, money: { incoming, outgoing, entries } };
  }

  // ---- Ghi chú “việc tuần” ---------------------------------------------------------------------------------------------------
  const picksNote = (mon) => (data.notes || []).find((n) => n.id === noteId(mon));
  function findTask(pid, tid) {
    const p = (data.projects || []).find((x) => x.id === pid);
    const t = p?.tasks?.find((x) => x.id === tid);
    return t ? { p, t } : null;
  }
  const picksOf = (note) =>
    (Array.isArray(note?.weekPicks) ? note.weekPicks : [])
      .filter((x) => x && typeof x.p === 'string' && typeof x.t === 'string')
      .slice(0, PICK_MAX);

  function savePicks(mon, picks) {
    if (readOnly()) return 'Bản chỉ xem không lưu được.';
    if (!picks.length) return 'Hãy chọn ít nhất một việc.';
    const rows = picks.map(([pid, tid]) => ({ pid, tid, hit: findTask(pid, tid) })).filter((x) => x.hit);
    if (!rows.length) return 'Các việc đã chọn không còn nữa. Hãy chọn lại.';
    data.notes ||= [];
    const id = noteId(mon);
    const old = data.notes.find((n) => n.id === id);
    if (!old && data.notes.length >= 500) return 'Tối đa 500 ghi chú. Hãy xóa bớt một ghi chú rồi lưu lại.';
    const keep = new Map((old?.items || []).map((i) => [i.text, i.done]));
    const items = rows.map(({ hit }) => {
      const text = hit.t.title.slice(0, 300);
      return { text, done: keep.get(text) === true };
    });
    const weekPicks = rows.map(({ pid, tid }) => ({ p: pid, t: tid }));
    const title = 'Việc trọng tâm tuần ' + short(mon) + ' – ' + short(plus(mon, 6));
    const snapshot = old ? structuredClone(old) : null;
    if (old) Object.assign(old, { type: 'todo', title, items, weekPicks });
    else data.notes.push({ id, type: 'todo', title, text: '', url: '', group: '', color: '#7950c8', items, weekPicks, weekOf: mon });
    if (save() === false) {
      if (old) Object.assign(old, snapshot);
      else data.notes = data.notes.filter((n) => n.id !== id);
      return 'Chưa lưu được. Hãy thử lại.';
    }
    return '';
  }

  // ---- Hộp thoại -------------------------------------------------------------------------------------------------------------
  let dialog = null;
  let reviewMon = '';
  const thisMonday = () => mondayOf(today());
  // Thứ Hai: tuần vừa qua mới là tuần cần ôn; các ngày khác ôn tuần đang chạy.
  const defaultMonday = () => (weekday(today()) === 1 ? plus(thisMonday(), -7) : thisMonday());

  function dueLabel(t) {
    if (!t.due) return t.col === 'Doing' ? 'Đang làm' : '';
    const gap = daysBetween(t.due, today());
    if (gap > 0) return 'Quá hạn ' + gap + ' ngày';
    return 'Hạn ' + short(t.due);
  }
  const proj = (x) => '<span class="zen-review-proj">' + esc(x.p.name) + '</span>';
  const sub = (x) => proj(x) + (dueLabel(x.t) ? ' · <span class="zen-review-when">' + esc(dueLabel(x.t)) + '</span>' : '');
  const listHTML = (rows, empty, tail) =>
    rows.length
      ? '<ul class="zen-review-list">' +
        rows
          .slice(0, LIST_MAX)
          .map((x) => '<li><strong>' + esc(x.t.title) + '</strong><small>' + (tail ? tail(x) : sub(x)) + '</small></li>')
          .join('') +
        '</ul>' +
        (rows.length > LIST_MAX ? '<p class="zen-review-more">và ' + (rows.length - LIST_MAX) + ' việc nữa</p>' : '')
      : '<p class="zen-review-empty">' + empty + '</p>';

  function bodyHTML(week) {
    const next = plus(week.mon, 7);
    const existing = picksOf(picksNote(next)).map((x) => x.p + '|' + x.t);
    const m = week.money;
    const pct = week.planned ? Math.round((week.achieved / week.planned) * 100) : 0;
    return (
      '<section class="zen-review-sec" data-review-sec="done"><h3>Đã xong <small>' + week.done.length + ' việc</small></h3>' +
      listHTML(week.done, 'Chưa có việc nào được ghi nhận hoàn thành trong tuần này. Ôn tuần chỉ nhận việc xong từ khi tính năng này bắt đầu ghi ngày hoàn thành.', (x) => proj(x) + ' · ' + esc(short(x.t.doneAt))) +
      '</section>' +
      '<section class="zen-review-sec" data-review-sec="open"><h3>Chưa xong <small>' + week.unfinished.length + ' việc</small></h3>' +
      listHTML(week.unfinished, 'Không còn việc nào dở dang đến hết tuần này.') +
      '</section>' +
      '<section class="zen-review-sec" data-review-sec="habits"><h3>Việc hằng ngày' + (week.planned ? ' <small>' + week.achieved + '/' + week.planned + ' lượt · ' + pct + '%</small>' : '') + '</h3>' +
      (week.habits.length
        ? '<ul class="zen-review-list">' +
          week.habits
            .map(({ h, g, n }) => '<li><strong>' + esc(h.icon || '') + ' ' + esc(h.name) + '</strong><small>' + n + '/' + g + ' lần</small></li>')
            .join('') +
          '</ul>'
        : '<p class="zen-review-empty">Chưa có việc hằng ngày nào trong tuần này.</p>') +
      '</section>' +
      '<section class="zen-review-sec" data-review-sec="money"><h3>Thu chi</h3>' +
      (m.entries
        ? '<p class="zen-review-money"><span>Thu <b>' + money(m.incoming) + '</b></span><span>Chi <b>' + money(m.outgoing) + '</b></span><span>' +
          (m.incoming >= m.outgoing ? 'Dư ' : 'Hụt ') + '<b>' + money(Math.abs(m.incoming - m.outgoing)) + '</b></span></p>'
        : '<p class="zen-review-empty">Tuần này chưa ghi khoản thu chi nào.</p>') +
      '</section>' +
      '<section class="zen-review-sec zen-review-picks" data-review-sec="picks"><h3>Chọn việc cho tuần ' + short(next) + ' – ' + short(plus(next, 6)) + '</h3>' +
      '<p class="zen-review-hint">Tối đa ' + PICK_MAX + ' việc. Danh sách được lưu thành một ghi chú để bạn tích dần.</p>' +
      (week.candidates.length
        ? '<div class="zen-review-choices">' +
          week.candidates
            .slice(0, CANDIDATE_MAX)
            .map((x) => {
              const value = x.p.id + '|' + x.t.id;
              return '<label class="zen-review-pick"><input type="checkbox" name="pick" value="' + esc(value) + '"' + (existing.includes(value) ? ' checked' : '') + '><span><strong>' + esc(x.t.title) + '</strong><small>' + sub(x) + '</small></span></label>';
            })
            .join('') +
          '</div>'
        : '<p class="zen-review-empty">Không còn việc nào đang mở để chọn.</p>') +
      '<p class="zen-review-count" role="status"></p></section>'
    );
  }

  function pickedValues() {
    return [...dialog.querySelectorAll('input[name=pick]:checked')].map((i) => i.value.split('|'));
  }
  function syncCount() {
    const checked = dialog.querySelectorAll('input[name=pick]:checked').length;
    dialog.querySelectorAll('input[name=pick]').forEach((i) => (i.disabled = !i.checked && checked >= PICK_MAX));
    const out = dialog.querySelector('.zen-review-count');
    if (out) out.textContent = 'Đã chọn ' + checked + '/' + PICK_MAX;
  }
  function paint() {
    const week = gather(reviewMon);
    const current = thisMonday();
    dialog.querySelector('.zen-review-lead').textContent = 'Tuần ' + short(week.mon) + ' – ' + short(week.sun) + '/' + week.sun.slice(0, 4);
    dialog.querySelectorAll('[data-review-week]').forEach((b) => {
      const on = (b.dataset.reviewWeek === 'prev' ? plus(current, -7) : current) === reviewMon;
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('active', on);
    });
    dialog.querySelector('.zen-review-body').innerHTML = bodyHTML(week);
    dialog.querySelector('.zen-review-status').textContent = '';
    syncCount();
  }
  function open() {
    if (readOnly()) return notify('Bản chỉ xem không dùng được Ôn tuần.');
    if (typeof data === 'undefined' || !data?.projects) return;
    if (document.querySelector('#editor')?.open) return notify('Hãy đóng hộp thoại đang mở trước khi ôn tuần.');
    dialog?.remove();
    reviewMon = defaultMonday();
    dialog = document.createElement('dialog');
    dialog.className = 'zen-review';
    dialog.setAttribute('aria-labelledby', 'zen-review-title');
    dialog.innerHTML =
      '<header><h2 id="zen-review-title">Ôn tuần</h2><button type="button" class="icon-btn exit-x" data-review-close aria-label="Đóng Ôn tuần" title="Đóng">×</button></header>' +
      '<div class="zen-review-weeks" role="group" aria-label="Chọn tuần cần ôn"><button type="button" class="btn" data-review-week="prev" aria-pressed="false">Tuần trước</button><button type="button" class="btn" data-review-week="this" aria-pressed="false">Tuần này</button></div>' +
      '<p class="zen-review-lead"></p>' +
      '<div class="zen-review-body"></div>' +
      '<p class="zen-review-status" role="status"></p>' +
      '<div class="zen-review-actions"><button type="button" class="btn primary" data-review-save>Lưu lựa chọn</button><button type="button" class="btn" data-review-close>Đóng</button></div>';
    dialog.addEventListener('click', (e) => {
      const week = e.target.closest('[data-review-week]');
      if (week) {
        reviewMon = week.dataset.reviewWeek === 'prev' ? plus(thisMonday(), -7) : thisMonday();
        return paint();
      }
      if (e.target.closest('[data-review-save]')) {
        const status = dialog.querySelector('.zen-review-status');
        const next = plus(reviewMon, 7);
        const message = savePicks(next, pickedValues());
        if (message) return (status.textContent = message);
        const count = pickedValues().length;
        dialog.close();
        try {
          render();
        } catch {
          /* việc vẽ lại không được làm hỏng bước lưu */
        }
        return notify('Đã lưu ' + count + ' việc cho tuần ' + short(next) + ' vào Ghi chú.');
      }
      if (e.target.closest('[data-review-close]') || e.target === dialog) dialog.close();
    });
    dialog.addEventListener('change', (e) => {
      if (e.target.name === 'pick') syncCount();
    });
    dialog.addEventListener('close', () => {
      dialog?.remove();
      dialog = null;
    });
    document.body.append(dialog);
    paint();
    dialog.showModal();
    dialog.querySelector('.zen-review-weeks .active, [data-review-close]')?.focus();
  }

  // ---- Tổng quan -------------------------------------------------------------------------------------------------------------
  // Lời mời: thứ Bảy, Chủ nhật, thứ Hai nếu chưa chọn việc cho tuần tới. Khối “Việc trọng tâm”: các việc đã chọn cho tuần đang chạy.
  function promptTarget() {
    const day = weekday(today());
    if (day === 1) return thisMonday();
    if (day === 6 || day === 0) return plus(thisMonday(), 7);
    return '';
  }
  function focusRows() {
    const note = picksNote(thisMonday());
    if (!note) return [];
    const picks = picksOf(note);
    return picks
      .map((x, i) => {
        const hit = findTask(x.p, x.t);
        if (!hit) return null;
        const mark = note.items?.[i];
        return { ...hit, done: hit.t.col === 'Done' || (mark?.done === true && mark.text === hit.t.title.slice(0, 300)) };
      })
      .filter(Boolean);
  }
  function paintPanels() {
    document.querySelectorAll('#main .wf-review-panel').forEach((el) => el.remove());
    if (view !== 'dashboard' || readOnly()) return;
    const panels = [];
    const rows = focusRows();
    if (rows.length) {
      const finished = rows.filter((r) => r.done).length;
      const section = document.createElement('section');
      section.className = 'panel wf-review-panel wf-review-focus';
      section.setAttribute('aria-label', 'Việc trọng tâm tuần này');
      section.innerHTML =
        '<h2>Việc trọng tâm tuần này <small>' + finished + '/' + rows.length + ' xong</small></h2>' +
        rows
          .map((r) => '<button type="button" class="work-task-row review-focus-row' + (r.done ? ' is-done' : '') + '" data-task="' + esc(r.t.id) + '" data-pid="' + esc(r.p.id) + '"><strong>' + esc(r.t.title) + '</strong><small>' + (r.done ? 'Đã xong' : sub(r)) + '</small></button>')
          .join('');
      panels.push(section);
    }
    const target = promptTarget();
    if (target && !picksNote(target)) {
      const section = document.createElement('section');
      section.className = 'panel wf-review-panel wf-review-invite';
      section.setAttribute('aria-label', 'Mời ôn tuần');
      section.innerHTML =
        '<h2>Ôn tuần</h2><p>Sắp sang tuần mới. Dành vài phút nhìn lại tuần qua và chọn tối đa ' + PICK_MAX + ' việc cho tuần tới.</p><button type="button" class="btn primary" data-review-open>Bắt đầu ôn tuần</button>';
      panels.push(section);
    }
    if (!panels.length) return;
    const anchor = document.querySelector('#main .wf-wait-panel') || document.querySelector('#main .wf-today-plan');
    if (anchor) anchor.after(...panels);
    else document.querySelector('#main')?.append(...panels);
  }
  const baseRender = render;
  render = function () {
    const out = baseRender.apply(this, arguments);
    try {
      // Chỉ ghi nhớ lại khi cả khối dữ liệu đã bị thay; vẽ lại giữa chừng không được “nuốt” một lần chuyển cột chưa lưu.
      if (typeof data !== 'undefined' && data !== lastData) track(false);
      paintPanels();
    } catch {
      /* các khối này không được làm hỏng việc vẽ lại trang */
    }
    return out;
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-review-open]')) {
      e.preventDefault();
      open();
    }
  });

  window.zenWeeklyReview = { open, gather, mondayOf, defaultMonday, noteId, picksOf, savePicks };
})();
