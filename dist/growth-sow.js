'use strict';
// v2.66.0 (Gieo Nhân): khép vòng Nghiệp quả — từ gợi ý “Nhân” ở trang Báo cáo tu luyện thành một việc thật mang sẵn phương đích.
// Dữ liệu: một trường tùy chọn ngay trên việc, `axis` (mã phương: dao, tai, tam, duyen, than, tri, nghe, gia; cùng mã với AXES trong growth.js).
// Không có `axis` là việc thường như trước nên dữ liệu cũ không đổi; không thêm bảng, cột hay biến môi trường (máy chủ chỉ kiểm mã hợp lệ).
// Hiện ở: nút “Gieo nhân” cạnh từng gợi ý Nhân (cultivatePanel trong growth.js), hộp “Gieo nhân” để chọn tên / đại sự / kỳ hạn, chip “Nhân · <phương>” trên thẻ việc,
// khối “Hạt giống đã gieo” ở trang báo cáo (đã gieo · đang chờ · đã thành quả, kèm lối mở việc và nút bỏ gắn phương). Khi việc ấy hoàn thành, bảng vận công
// của growth.js điền sẵn công lực vào đúng phương; người dùng chỉ cần bấm Lưu. Ứng dụng không tự tạo việc và không tự cộng điểm: mọi thứ bắt đầu từ một cú bấm.
(() => {
  const TITLE_MAX = 200;
  const TASK_MAX = 2000;
  const SHOWN = 5;
  const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s;
  const readOnly = () => typeof contentReadOnly !== 'undefined' && contentReadOnly;
  const axes = () => (window.zenGrowth && window.zenGrowth.AXES) || [];
  const axisById = (id) => axes().find((a) => a.id === id) || null;
  const esc_ = (s) => (typeof esc === 'function' ? esc(s) : String(s));

  // ---- Đọc hạt giống ------------------------------------------------------------------------------------------------------
  // Mọi việc mang phương hợp lệ. Đang chờ = chưa xong, không lưu trữ (cả việc lẫn đại sự); thành quả = đã ở cột Hoàn thành.
  function seeds() {
    const out = [];
    for (const p of (typeof data !== 'undefined' && data && data.projects) || [])
      for (const t of p.tasks || []) {
        const a = axisById(t.axis);
        if (!a) continue;
        const done = t.col === 'Done';
        out.push({ t, p, a, done, waiting: !done && !t.archived && !p.archived });
      }
    return out;
  }
  function summary() {
    const all = seeds();
    if (!all.length) return '';
    const waiting = all.filter((s) => s.waiting),
      done = all.filter((s) => s.done).length,
      ro = readOnly();
    const rows = waiting
      .slice(0, SHOWN)
      .map(
        (s) =>
          '<li><button type="button" class="work-task-row" data-task="' + esc_(s.t.id) + '" data-pid="' + esc_(s.p.id) + '"><strong>' + esc_(s.t.title) + '</strong><small>' + esc_(s.a.name) + ' · ' + esc_(s.p.name) + '</small></button>' +
          (ro ? '' : '<button type="button" class="text-btn" data-sow-drop="' + esc_(s.p.id) + '|' + esc_(s.t.id) + '">Bỏ gắn phương</button>') +
          '</li>',
      )
      .join('');
    return (
      '<section class="gr-sow-sum" tabindex="-1" aria-label="Hạt giống đã gieo"><p>Hạt giống đã gieo: <b>' + all.length + '</b> · đang chờ <b>' + waiting.length + '</b> · đã thành quả <b>' + done + '</b></p>' +
      (rows ? '<ul class="gr-sow-list">' + rows + '</ul>' : '') +
      (waiting.length > SHOWN ? '<p class="help-copy">Còn ' + (waiting.length - SHOWN) + ' hạt giống đang chờ nữa; mở từng đại sự để xem.</p>' : '') +
      '</section>'
    );
  }
  // Nút cạnh một gợi ý. Chỉ đọc thì không có nút (không gieo được).
  function button(axisId, kind, text) {
    if (readOnly() || !axisById(axisId)) return '';
    return '<button type="button" class="btn gr-sow-btn" data-sow-axis="' + esc_(axisId) + '" data-sow-text="' + esc_(text) + '" aria-label="Gieo nhân: ' + esc_(text) + '">Gieo nhân</button>';
  }

  // ---- Hộp “Gieo nhân” ------------------------------------------------------------------------------------------------------
  let dialog = null;
  function closeDialog() {
    if (!dialog) return;
    const d = dialog;
    dialog = null;
    if (d.open) d.close();
    d.remove();
  }
  function open(axisId, text, opener) {
    const a = axisById(axisId);
    if (!a) return;
    if (readOnly()) return notify('Bản chia sẻ chỉ có quyền xem, không gieo nhân được.');
    const list = (typeof visibleProjects === 'function' ? visibleProjects() : data.projects.filter((p) => !p.archived)).filter((p) => !p.archived && p.tasks.length < TASK_MAX);
    if (!list.length) return notify('Chưa có đại sự nào còn chỗ. Hãy tạo đại sự trước rồi gieo nhân.');
    closeDialog();
    const pick = list.find((p) => p.id === (typeof active === 'string' ? active : '')) || list[0];
    const d = document.createElement('dialog');
    d.className = 'gr-sow';
    d.setAttribute('aria-labelledby', 'gr-sow-title');
    d.innerHTML =
      '<form class="gr-sow-form" novalidate style="--c:' + esc_(a.color) + '"><header><span class="eyebrow">GIEO NHÂN</span><h2 id="gr-sow-title">Gieo nhân cho ' + esc_(a.name) + '</h2>' +
      '<p class="help-copy">Hạt giống này thành một nhiệm vụ mang sẵn phương <strong>' + esc_(a.name) + '</strong>. Khi công thành, công lực đã dồn sẵn vào phương ấy; các hạ chỉ cần bấm Lưu công lực.</p></header>' +
      '<label class="field">Tên nhiệm vụ<input name="title" maxlength="' + TITLE_MAX + '" autocomplete="off" required></label>' +
      '<label class="field">Gieo vào đại sự<select name="project">' + list.map((p) => '<option value="' + esc_(p.id) + '"' + (p === pick ? ' selected' : '') + '>' + esc_(p.name) + '</option>').join('') + '</select></label>' +
      '<label class="field">Kỳ hạn (tùy chọn)<input name="due" type="date"></label>' +
      '<p class="gr-sow-err" role="alert" hidden></p>' +
      '<footer class="gr-award-foot"><span class="gr-grow"></span><button type="button" class="btn ghost" data-sow-cancel>Thôi</button><button type="submit" class="btn primary">Gieo nhân</button></footer></form>';
    document.body.append(d);
    dialog = d;
    d.querySelector('[name=title]').value = text;
    d._opener = opener || null;
    d._axis = axisId;
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeDialog();
      opener && opener.isConnected && opener.focus();
    });
    d.showModal();
    const input = d.querySelector('[name=title]');
    input.focus();
    input.select();
  }
  function fail(d, message, field) {
    const box = d.querySelector('.gr-sow-err');
    box.textContent = message;
    box.hidden = false;
    d.querySelector(field)?.focus();
  }
  // Tạo việc đúng hình dạng của “Thêm nhanh” (quickadd.js), thêm trường axis. Lưu không được thì gỡ ra như cũ.
  function create(d) {
    const form = d.querySelector('form');
    const f = form.elements; // form.title là thuộc tính của phần tử, nên lấy ô nhập qua elements
    const title = String(f.title.value || '').replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX),
      due = String(f.due.value || ''),
      a = axisById(d._axis),
      p = data.projects.find((x) => x.id === f.project.value);
    if (!title) return fail(d, 'Hãy gõ tên nhiệm vụ.', '[name=title]');
    if (due && !isDay(due)) return fail(d, 'Kỳ hạn chưa hợp lệ.', '[name=due]');
    if (!a || !p || p.archived) return fail(d, 'Chưa tìm thấy đại sự này. Hãy chọn đại sự khác.', '[name=project]');
    if (p.tasks.length >= TASK_MAX) return fail(d, 'Đại sự này đã đủ ' + TASK_MAX + ' nhiệm vụ.', '[name=project]');
    const motif = typeof NOTE_MOTIFS === 'undefined' ? 'none' : Object.hasOwn(NOTE_MOTIFS, p.motif) ? p.motif : 'none';
    const task = {
      id: uid(),
      start: '',
      end: '',
      priority: '',
      labels: [],
      title,
      description: '',
      col: p.columns.includes('List') ? 'List' : p.columns[0],
      due,
      tag: '',
      motif,
      checks: [],
      axis: a.id,
    };
    p.tasks.push(task);
    if (save() === false) {
      p.tasks.pop();
      return fail(d, 'Chưa lưu được nhiệm vụ mới. Hãy thử lại.', '[name=title]');
    }
    const opener = d._opener;
    closeDialog();
    notify('Đã gieo nhân “' + title + '” vào ' + p.name + '. Khi công thành, công lực dồn sẵn vào ' + a.name + '.');
    render();
    // Vẽ lại trang xong thì nút cũ không còn: đưa tiêu điểm về nút gieo cùng gợi ý (nếu còn) hoặc khối hạt giống.
    const again = opener && [...document.querySelectorAll('.gr-sow-btn')].find((b) => b.dataset.sowText === opener.dataset.sowText && b.dataset.sowAxis === opener.dataset.sowAxis);
    (again || document.querySelector('.gr-sow-sum'))?.focus?.();
  }
  // Bỏ gắn phương: việc trở lại việc thường (chỉ xóa trường axis của đúng việc đó).
  function drop(pid, tid) {
    if (readOnly()) return;
    const t = project(pid)?.tasks.find((x) => x.id === tid);
    if (!t || t.axis === undefined) return;
    const was = t.axis;
    delete t.axis;
    if (save() === false) {
      t.axis = was;
      return notify('Chưa lưu được. Hãy thử lại.');
    }
    render();
  }

  document.addEventListener('click', (e) => {
    const sow = e.target.closest('[data-sow-axis]');
    if (sow) return open(sow.dataset.sowAxis, sow.dataset.sowText || '', sow);
    const cancel = e.target.closest('[data-sow-cancel]');
    if (cancel) {
      const opener = dialog && dialog._opener;
      closeDialog();
      return opener && opener.isConnected && opener.focus();
    }
    const dropper = e.target.closest('[data-sow-drop]');
    if (dropper) {
      const [pid, tid] = dropper.dataset.sowDrop.split('|');
      drop(pid, tid);
    }
  });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest && e.target.closest('form.gr-sow-form');
    if (!form || !dialog) return;
    e.preventDefault();
    create(dialog);
  });

  // ---- Chip trên thẻ việc ------------------------------------------------------------------------------------------------------
  const baseCard = taskCard;
  taskCard = function (t) {
    const html = baseCard.apply(this, arguments);
    const a = t && t.col !== 'Done' ? axisById(t.axis) : null;
    if (!a || !html) return html;
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const card = template.content.firstElementChild;
    if (!card) return html;
    const chip =
      '<div class="task-card-sow" style="--c:' + esc_(a.color) + '" title="Hạt giống nhân quả: khi công thành, công lực dồn sẵn vào ' + esc_(a.name) + '"><i aria-hidden="true"></i>Nhân · ' + esc_(a.name) + '</div>';
    const anchor = card.querySelector('.task-card-decision') || card.querySelector('h3');
    if (anchor) anchor.insertAdjacentHTML('beforebegin', chip);
    else card.insertAdjacentHTML('beforeend', chip);
    return card.outerHTML;
  };

  window.zenSow = { seeds, summary, button, open, drop };
})();
