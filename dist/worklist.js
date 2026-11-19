'use strict';
// v2.63.0 (Liên Hoàn Lệnh): chuỗi việc ưu tiên xuyên dự án. Người dùng ghi những việc cần làm sớm từ BẤT KỲ dự án nào vào một chuỗi
// duy nhất, theo thứ tự do chính người dùng xếp (không theo thời gian, không theo dự án). Việc xong thì tự rời chuỗi; chưa xong thì ở
// nguyên chỗ cũ qua các ngày; chỉ mất khi xong việc hoặc khi người dùng gỡ khỏi chuỗi.
// Dữ liệu: workspace.worklist = { v: 1, items: [{ t: id việc, a: 'YYYY-MM-DD', x?: 'YYYY-MM-DD' }] } (xem server/worklist.mjs).
// Không có khóa này là chuỗi trống; dữ liệu cũ không bị đổi. Việc xong KHÔNG bị sửa dòng nào: giao diện ẩn việc ở cột Hoàn thành,
// còn ngày xong là doneAt của chính việc (weekly-review.js ghi). Việc đưa lại về cột khác thì hiện lại đúng chỗ cũ trong chuỗi.
// Hiện ở: nút “Liên hoàn lệnh” cạnh nút “Chế độ tập trung” trong chi tiết việc, mục “Liên hoàn lệnh” ở nhóm Chế độ xem (thanh bên và thanh
// điện thoại), bảng lệnh. Màu: màu dự án + chip Khẩn cấp / Trọng yếu lấy từ mức ưu tiên sẵn có của việc (không thêm trường mới).
(() => {
  const NAME = 'Liên hoàn lệnh';
  const MAX_ACTIVE = 100;
  const MAX_ALL = 1000;
  const PICK_MAX = 40;
  const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s;
  const readOnly = () => typeof contentReadOnly !== 'undefined' && contentReadOnly;

  // ---- Kiểm tra dữ liệu (cùng luật với server/worklist.mjs) --------------------------------------------------------------------
  function validWorklist(w) {
    if (w === undefined) return true;
    if (!w || typeof w !== 'object' || Array.isArray(w)) return false;
    if (!Object.keys(w).every((k) => k === 'v' || k === 'items')) return false;
    if (w.v !== 1 || !Array.isArray(w.items) || w.items.length > MAX_ALL) return false;
    return w.items.every(
      (e) =>
        !!e &&
        typeof e === 'object' &&
        !Array.isArray(e) &&
        Object.keys(e).every((k) => k === 't' || k === 'a' || k === 'x') &&
        typeof e.t === 'string' &&
        /^[A-Za-z0-9_-]{1,99}$/.test(e.t) &&
        isDay(e.a) &&
        (e.x === undefined || isDay(e.x)),
    );
  }
  const validBefore = valid;
  valid = function (d) {
    return validBefore.apply(this, arguments) && validWorklist(d && d.worklist);
  };

  // ---- Đọc chuỗi -------------------------------------------------------------------------------------------------------------
  const raw = () => (data && data.worklist && Array.isArray(data.worklist.items) ? data.worklist.items : []);
  function index() {
    const by = new Map();
    for (const p of data.projects) for (const t of p.tasks || []) by.set(t.id, { t, p });
    return by;
  }
  // Các việc đang nằm trong chuỗi theo đúng thứ tự người dùng xếp: bỏ dòng đã gỡ, dòng trùng, việc đã xóa / lưu trữ / đã xong.
  function rows() {
    const by = index(),
      seen = new Set(),
      out = [];
    for (const e of raw()) {
      if (e.x || seen.has(e.t)) continue;
      seen.add(e.t);
      const hit = by.get(e.t);
      if (!hit || hit.t.archived || hit.p.archived || hit.t.col === 'Done') continue;
      out.push({ e, t: hit.t, p: hit.p });
    }
    return out;
  }
  const has = (id) => rows().some((r) => r.t.id === id);

  // ---- Ghi chuỗi (lưu không được thì trả lại như cũ) ----------------------------------------------------------------------------
  function mutate(change) {
    if (readOnly()) return false;
    const before = data.worklist === undefined ? undefined : structuredClone(data.worklist);
    if (!data.worklist) data.worklist = { v: 1, items: [] };
    if (change(data.worklist) === false || save() === false) {
      if (before === undefined) delete data.worklist;
      else data.worklist = before;
      return false;
    }
    return true;
  }
  // Đủ chỗ thì thôi; đầy thì bỏ các dòng cũ nhất không còn ý nghĩa (đã gỡ, việc đã xong / đã xóa) cho tới khi còn chỗ.
  function makeRoom(w) {
    if (w.items.length < MAX_ALL) return true;
    const by = index();
    const dead = (e) => !!e.x || !by.get(e.t) || by.get(e.t).t.col === 'Done' || by.get(e.t).t.archived;
    while (w.items.length >= MAX_ALL) {
      const i = w.items.findIndex(dead);
      if (i < 0) return false;
      w.items.splice(i, 1);
    }
    return true;
  }
  function add(id) {
    const hit = index().get(id);
    if (!hit || hit.t.col === 'Done' || hit.t.archived || hit.p.archived) return false;
    if (has(id)) return true;
    if (rows().length >= MAX_ACTIVE) {
      notify(NAME + ' chứa tối đa ' + MAX_ACTIVE + ' việc. Hãy gỡ bớt việc đã qua trước khi ghi thêm.');
      return false;
    }
    return mutate((w) => {
      if (!makeRoom(w)) return false;
      w.items.push({ t: id, a: today() });
    });
  }
  function drop(id) {
    return mutate((w) => {
      let n = 0;
      for (const e of w.items) if (e.t === id && !e.x) (e.x = today()), n++;
      return n > 0;
    });
  }
  // Đổi chỗ với việc kề bên trong chuỗi đang thấy (dir = -1 lên, +1 xuống), hoặc đưa lên đầu (dir = 'top').
  function move(id, dir) {
    const list = rows(),
      at = list.findIndex((r) => r.t.id === id);
    if (at < 0) return false;
    return mutate((w) => {
      const i = w.items.indexOf(list[at].e);
      if (i < 0) return false;
      if (dir === 'top') {
        if (at === 0) return false;
        w.items.splice(i, 1);
        w.items.splice(w.items.indexOf(list[0].e), 0, list[at].e);
        return true;
      }
      const other = list[at + dir];
      if (!other) return false;
      const j = w.items.indexOf(other.e);
      [w.items[i], w.items[j]] = [w.items[j], w.items[i]];
    });
  }

  // ---- Màu và chip -----------------------------------------------------------------------------------------------------------
  // Mức ưu tiên sẵn có (ma trận Eisenhower): q1 quan trọng + khẩn cấp, q2 quan trọng, q3 khẩn cấp, q4 không cái nào.
  const URGENT = { q1: true, q3: true };
  const KEY = { q1: true, q2: true };
  function tags(t, p) {
    const out = ['<span class="wl-chip wl-chip-project" style="--pc:' + esc(p.color) + '">' + esc(p.name) + '</span>'];
    if (URGENT[t.priority]) out.push('<span class="wl-chip wl-chip-urgent">Khẩn cấp</span>');
    if (KEY[t.priority]) out.push('<span class="wl-chip wl-chip-key">Trọng yếu</span>');
    if (!URGENT[t.priority] && !KEY[t.priority]) out.push('<span class="wl-chip wl-chip-calm">' + (t.priority === 'q4' ? 'Thường' : 'Chưa phân loại') + '</span>');
    if (t.due) {
      const late = t.due < today();
      out.push('<span class="wl-chip ' + (late ? 'wl-chip-late' : 'wl-chip-due') + '">' + (late ? 'Quá hạn · ' : 'Hạn ') + esc(dateLabel(t.due)) + '</span>');
    }
    return out.join('');
  }

  // ---- Trang Liên hoàn lệnh --------------------------------------------------------------------------------------------------
  let pickOpen = false;
  let pickQuery = '';
  const rank = { q1: 0, q2: 1, q3: 2, q4: 3 };
  function candidates(query) {
    const q = query.trim().toLocaleLowerCase('vi'),
      inside = new Set(rows().map((r) => r.t.id));
    return allTasks()
      .filter((t) => t.col !== 'Done' && !inside.has(t.id) && (!q || (t.title + ' ' + t.project.name).toLocaleLowerCase('vi').includes(q)))
      .sort((a, b) => (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4) || (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title, 'vi'));
  }
  function pickList(query) {
    const all = candidates(query),
      shown = all.slice(0, PICK_MAX);
    if (!shown.length) return '<li class="wl-pick-empty">' + (query.trim() ? 'Không có việc nào khớp.' : 'Mọi việc chưa xong đều đã nằm trong chuỗi.') + '</li>';
    return (
      shown
        .map(
          (t) =>
            '<li><button type="button" class="wl-pick" data-wl-add="' + esc(t.id) + '"><span class="wl-pick-main"><strong>' + esc(t.title) + '</strong><span class="wl-tags">' + tags(t, t.project) + '</span></span><span class="wl-plus" aria-hidden="true">＋</span><span class="sr-only">Ghi vào ' + NAME.toLocaleLowerCase('vi') + '</span></button></li>',
        )
        .join('') + (all.length > shown.length ? '<li class="wl-pick-empty">Còn ' + (all.length - shown.length) + ' việc nữa. Gõ tên để thu hẹp.</li>' : '')
    );
  }
  function item(r, i, n) {
    const { t, p } = r,
      pct = taskPct(t),
      ro = readOnly(),
      steps = t.checks.length ? ' · ' + t.checks.filter((c) => c.done).length + '/' + t.checks.length + ' mục' : '';
    const tool = (attr, label, glyph, off) => '<button type="button" class="btn wl-icon-btn" ' + attr + '="' + esc(t.id) + '" aria-label="' + label + ': ' + esc(t.title) + '" title="' + label + '"' + (off ? ' disabled' : '') + '>' + glyph + '</button>';
    return (
      '<li class="wl-item" data-wl-item="' + esc(t.id) + '" style="--pc:' + esc(p.color) + '"><span class="wl-node" aria-hidden="true">' + (i + 1) + '</span><article class="wl-card"><div class="wl-tags">' + tags(t, p) + '</div>' +
      '<button type="button" class="wl-title" data-task="' + esc(t.id) + '" data-pid="' + esc(p.id) + '">' + esc(t.title) + '</button>' +
      '<div class="wl-meta">' + pct + '% hoàn thành' + steps + '</div>' + bar(pct, p.color) +
      '<div class="wl-actions"><button type="button" class="btn primary wl-focus" data-wl-focus="' + esc(t.id) + '" aria-label="Bế quan, tập trung làm: ' + esc(t.title) + '">' + svgIcon('leaf') + '<span>Bế quan</span></button>' +
      '<span class="wl-move" role="group" aria-label="Đổi thứ tự">' + tool('data-wl-top', 'Đưa lên đầu chuỗi', '⤒', ro || i === 0) + tool('data-wl-up', 'Đưa lên một bậc', '↑', ro || i === 0) + tool('data-wl-down', 'Đưa xuống một bậc', '↓', ro || i === n - 1) + '</span>' +
      '<button type="button" class="btn ghost wl-drop" data-wl-drop="' + esc(t.id) + '"' + (ro ? ' disabled' : '') + ' aria-label="Gỡ khỏi chuỗi: ' + esc(t.title) + '">Gỡ khỏi chuỗi</button></div></article></li>'
    );
  }
  function page() {
    const list = rows(),
      day = today(),
      urgent = list.filter((r) => URGENT[r.t.priority]).length,
      late = list.filter((r) => r.t.due && r.t.due < day).length,
      projects = new Set(list.map((r) => r.p.id)).size;
    const stat = (n, label) => '<li><b>' + n + '</b> <span>' + label + '</span></li>';
    const body = list.length
      ? '<ol class="wl-chain" aria-label="' + NAME + '">' + list.map((r, i) => item(r, i, list.length)).join('') + '</ol>'
      : '<div class="panel wl-empty"><h2>Chuỗi còn trống</h2><p class="subtext">Mở một việc bất kỳ rồi bấm “' + NAME + '” cạnh nút “Chế độ tập trung”, hoặc chọn việc ở khung bên dưới. Việc nào xong sẽ tự rời chuỗi.</p></div>';
    return (
      heading('CHUỖI VIỆC XUYÊN DỰ ÁN', NAME, 'Những việc cần làm sớm, xếp theo thứ tự bạn chọn, không phân biệt dự án. Xong việc thì tự rời chuỗi; chưa xong thì ở nguyên chỗ cũ cho tới khi bạn gỡ.') +
      '<ul class="wl-sum" aria-label="Tóm tắt chuỗi">' + stat(list.length, 'việc trong chuỗi') + stat(urgent, 'khẩn cấp') + stat(late, 'quá hạn') + stat(projects, 'dự án') + '</ul>' +
      '<p class="wl-legend" aria-label="Sắc hiệu"><span class="wl-key">Sắc hiệu</span><span class="wl-chip wl-chip-project" style="--pc:#7950c8">Màu dự án</span><span class="wl-chip wl-chip-urgent">Khẩn cấp</span><span class="wl-chip wl-chip-key">Trọng yếu</span></p>' +
      body +
      '<details class="panel wl-picker"' + (pickOpen ? ' open' : '') + '><summary>Ghi thêm việc vào chuỗi</summary><label class="field"><span>Tìm việc theo tên hoặc dự án</span><input type="search" data-wl-search value="' + esc(pickQuery) + '" autocomplete="off"></label><ul class="wl-pick-list">' + pickList(pickQuery) + '</ul></details>'
    );
  }
  function paint() {
    if (view !== 'worklist') return;
    const crumb = document.querySelector('#crumb');
    if (crumb) crumb.textContent = NAME;
    document.querySelector('#main').innerHTML = page();
  }
  const renderBefore = render;
  render = function () {
    renderBefore.apply(this, arguments);
    paint();
  };

  // ---- Nút trong chi tiết việc, cạnh nút “Chế độ tập trung” --------------------------------------------------------------------
  function paintToggle(button, on) {
    button.classList.toggle('is-on', on);
    button.setAttribute('aria-pressed', String(on));
    button.title = on ? 'Gỡ việc này khỏi ' + NAME : 'Ghi việc này vào ' + NAME + ' để làm sớm';
    button.setAttribute('aria-label', button.title);
    button.innerHTML = svgIcon('worklist') + '<span>' + NAME + '</span>' + (on ? '<b class="wl-tick" aria-hidden="true">✓</b>' : '');
  }
  const detailBefore = taskDetail;
  taskDetail = function (p, t) {
    detailBefore.apply(this, arguments);
    if (!t || t.col === 'Done') return;
    const focus = document.querySelector('#editor-body .task-focus-shortcut');
    if (!focus || document.querySelector('#editor-body .wl-add-shortcut')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn wl-add-shortcut';
    paintToggle(button, has(t.id));
    if (readOnly()) button.disabled = true;
    button.onclick = () => {
      const was = has(t.id);
      if (!(was ? drop(t.id) : add(t.id))) return;
      paintToggle(button, !was);
      render();
      notify(was ? 'Đã gỡ khỏi ' + NAME + '.' : 'Đã ghi vào ' + NAME + ', vị trí ' + rows().length + '.');
    };
    focus.before(button);
  };

  // ---- Thao tác trên trang ---------------------------------------------------------------------------------------------------
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-wl-focus],[data-wl-drop],[data-wl-up],[data-wl-down],[data-wl-top],[data-wl-add]');
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.wlFocus !== undefined) {
      const hit = index().get(d.wlFocus);
      if (!hit) return;
      _WF.focus = { p: hit.p.id, t: hit.t.id };
      return go('focus');
    }
    if (d.wlAdd !== undefined) {
      const searchHadFocus = document.activeElement?.matches?.('[data-wl-search]');
      if (add(d.wlAdd)) {
        pickOpen = true;
        render();
        notify('Đã ghi vào ' + NAME + ', vị trí ' + rows().length + '.');
        if (searchHadFocus) document.querySelector('[data-wl-search]')?.focus();
      }
      return;
    }
    if (d.wlDrop !== undefined) {
      if (drop(d.wlDrop)) {
        render();
        notify('Đã gỡ khỏi ' + NAME + '.');
      }
      return;
    }
    const id = d.wlUp ?? d.wlDown ?? d.wlTop;
    if (move(id, d.wlTop !== undefined ? 'top' : d.wlUp !== undefined ? -1 : 1)) {
      render();
      // Giữ tiêu điểm bàn phím trên cùng nút vừa bấm (nút ở vị trí mới).
      const key = d.wlTop !== undefined ? 'data-wl-top' : d.wlUp !== undefined ? 'data-wl-up' : 'data-wl-down';
      const again = document.querySelector('[' + key + '="' + CSS.escape(id) + '"]:not([disabled])') || document.querySelector('[data-wl-item="' + CSS.escape(id) + '"] .wl-focus');
      again?.focus();
    }
  });
  document.addEventListener('input', (e) => {
    if (!e.target.matches?.('[data-wl-search]')) return;
    pickQuery = e.target.value;
    const ul = document.querySelector('.wl-pick-list');
    if (ul) ul.innerHTML = pickList(pickQuery);
  });
  document.addEventListener('toggle', (e) => {
    if (e.target.matches?.('.wl-picker')) pickOpen = e.target.open;
  }, true);

  // ---- Mục trong nhóm Chế độ xem (thanh bên + thanh điện thoại) -------------------------------------------------------------------
  iconPaths.worklist = 'M6 4v16 M6 6h.01 M6 12h.01 M6 18h.01 M10 6h10 M10 12h10 M10 18h6';
  function mount(box, label) {
    if (!box || box.querySelector('[data-view="worklist"]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'view-mode';
    button.dataset.view = 'worklist';
    button.setAttribute('aria-pressed', String(view === 'worklist'));
    button.title = NAME + ': chuỗi việc ưu tiên xuyên mọi dự án';
    button.innerHTML = svgIcon('worklist') + '<span>' + label + '</span>';
    box.append(button);
  }
  mount(document.querySelector('.view-options'), NAME);
  const bar4 = document.querySelector('.mobile-viewbar');
  if (bar4) {
    mount(bar4, 'Liên hoàn');
    bar4.classList.add('wl-four');
  }

  window.zenWorklist = { rows, has, add, drop, move, valid: validWorklist, name: NAME };
})();
