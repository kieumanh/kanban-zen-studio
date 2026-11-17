'use strict';
// v2.51.0 (Chia Sẻ Vào App): từ nút Chia sẻ của điện thoại (Android, ứng dụng đã cài) chọn Zen Studio để lưu nhanh một đoạn chữ hay liên kết
// thành Ghi chú hoặc Việc. Manifest khai báo share_target (GET về "/", các tham số title, text, url).
// Nội dung chia sẻ là dữ liệu từ ứng dụng khác nên luôn xem là chữ thuần: chỉ đưa vào ô nhập (giá trị), không bao giờ chèn HTML; liên kết chỉ nhận http(s).
(function () {
  const PENDING = 'zen-share-pending';
  const LIMITS = { title: 150, text: 10000, url: 2000, taskTitle: 200, taskText: 5000 };
  const clip = (s, n) => String(s || '').replace(/\r\n?/g, '\n').trim().slice(0, n);
  const isHttp = (s) => /^https?:\/\/\S+$/i.test(String(s || '').trim());

  // Chuẩn hóa ba tham số: Android thường dồn liên kết vào "text" và để "url" trống.
  function normalize(raw) {
    let title = clip(raw.title, LIMITS.title),
      text = clip(raw.text, LIMITS.text),
      url = isHttp(raw.url) ? String(raw.url).trim() : '';
    if (!url) {
      const only = text.match(/^(https?:\/\/\S+)$/i);
      const found = text.match(/https?:\/\/[^\s<>"']+/i);
      if (only) {
        url = only[1];
        text = '';
      } else if (found) url = found[0];
    }
    if (!title) {
      const first = text.split('\n').find((l) => l.trim() && !isHttp(l.trim())) || '';
      title = first.trim().slice(0, 60);
      if (!title && url) {
        try {
          title = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          title = '';
        }
      }
    }
    return { title: title || 'Nội dung được chia sẻ', text, url: url.slice(0, LIMITS.url) };
  }
  function parse(search) {
    const q = new URLSearchParams(search || '');
    const raw = { title: q.get('title'), text: q.get('text'), url: q.get('url') };
    if (!raw.title && !raw.text && !raw.url) return null;
    return normalize(raw);
  }

  // Ghi nhớ rồi xóa tham số khỏi thanh địa chỉ ngay: tải lại trang không hiện lại, nội dung không nằm lại trong lịch sử.
  function capture() {
    let found = null;
    try {
      found = parse(location.search);
    } catch {
      return;
    }
    if (!found) return;
    try {
      sessionStorage.setItem(PENDING, JSON.stringify(found));
    } catch {
      /* không ghi nhớ được: vẫn hiện hộp ngay nếu app sẵn sàng */
    }
    pending = found;
    try {
      history.replaceState(null, '', location.pathname + location.hash);
    } catch {
      /* bỏ qua */
    }
  }
  let pending = null;
  const stored = () => {
    if (pending) return pending;
    try {
      return JSON.parse(sessionStorage.getItem(PENDING) || 'null');
    } catch {
      return null;
    }
  };
  const clear = () => {
    pending = null;
    try {
      sessionStorage.removeItem(PENDING);
    } catch {
      /* bỏ qua */
    }
  };

  // ---- Hộp thoại ------------------------------------------------------------------------------------------------------------
  let dialog;
  const activeProjects = () => (data.projects || []).filter((p) => !p.archived);
  function build(share) {
    dialog?.remove();
    dialog = document.createElement('dialog');
    dialog.className = 'zen-share';
    dialog.setAttribute('aria-labelledby', 'zen-share-title');
    const projects = activeProjects();
    dialog.innerHTML =
      '<header><h2 id="zen-share-title">Lưu nội dung được chia sẻ</h2><button type="button" class="icon-btn exit-x" data-zen-share-close aria-label="Bỏ qua nội dung được chia sẻ" title="Bỏ qua">×</button></header>' +
      '<p class="zen-share-lead">Chọn nơi lưu nội dung vừa chia sẻ vào Zen Studio.</p>' +
      '<form method="dialog" class="zen-share-form" novalidate>' +
      '<fieldset class="zen-share-kind"><legend>Lưu thành</legend><label><input type="radio" name="kind" value="note" checked> <span>Ghi chú</span></label><label><input type="radio" name="kind" value="task"' + (projects.length ? '' : ' disabled') + '> <span>Việc</span></label></fieldset>' +
      '<label>Tiêu đề<input name="title" maxlength="150" autocomplete="off"></label>' +
      '<label>Nội dung<textarea name="text" rows="5" maxlength="10000"></textarea></label>' +
      '<label data-share-url>Liên kết<input name="url" type="url" inputmode="url" maxlength="2000" autocomplete="off"></label>' +
      '<label data-share-project hidden>Dự án<select name="project">' + projects.map((p) => '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>').join('') + '</select></label>' +
      '<p class="zen-share-status" role="status"></p>' +
      '<div class="zen-share-actions"><button type="button" class="btn primary" data-zen-share-save>Lưu</button><button type="button" class="btn" data-zen-share-close>Bỏ qua</button></div>' +
      '</form>';
    const form = dialog.querySelector('form');
    form.elements.title.value = share.title;
    form.elements.text.value = share.text;
    form.elements.url.value = share.url;
    form.addEventListener('change', (e) => {
      if (e.target.name !== 'kind') return;
      const task = form.elements.kind.value === 'task';
      dialog.querySelector('[data-share-url]').hidden = task;
      dialog.querySelector('[data-share-project]').hidden = !task;
    });
    dialog.addEventListener('click', (e) => {
      if (e.target.closest('[data-zen-share-save]')) commit(form);
      else if (e.target.closest('[data-zen-share-close]') || e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      clear();
      dialog.remove();
      dialog = null;
    });
    document.body.append(dialog);
    return form;
  }
  const say = (form, text) => (form.closest('dialog').querySelector('.zen-share-status').textContent = text);

  function commit(form) {
    if (typeof contentReadOnly !== 'undefined' && contentReadOnly) return say(form, 'Bản chỉ xem không lưu được.');
    const kind = form.elements.kind.value;
    const title = clip(form.elements.title.value, 1000);
    const text = clip(form.elements.text.value, 20000);
    const url = String(form.elements.url.value || '').trim();
    if (!title) return say(form, 'Hãy nhập tiêu đề.');
    if (kind === 'note') {
      if (url && !isHttp(url)) return say(form, 'Liên kết cần bắt đầu bằng https:// hoặc http://');
      if (title.length > LIMITS.title || text.length > LIMITS.text) return say(form, 'Nội dung quá dài: ghi chú tối đa 150 ký tự tiêu đề và 10.000 ký tự nội dung.');
      data.notes ||= [];
      if (data.notes.length >= 500) return say(form, 'Tối đa 500 ghi chú.');
      const note = { id: uid(), type: 'note', title, text, url, group: '', color: '#7950c8' };
      data.notes.push(note);
      if (save() === false) {
        data.notes = data.notes.filter((n) => n.id !== note.id);
        return say(form, 'Chưa lưu được ghi chú. Hãy thử lại.');
      }
      done('Đã lưu vào Ghi chú: ' + title.slice(0, 40));
    } else {
      const p = activeProjects().find((x) => x.id === form.elements.project.value);
      if (!p) return say(form, 'Hãy chọn một dự án.');
      if (p.tasks.length >= 2000) return say(form, 'Dự án này đã đủ 2.000 việc.');
      if (title.length > LIMITS.taskTitle) return say(form, 'Tiêu đề việc tối đa 200 ký tự.');
      const description = [text, url].filter(Boolean).join('\n');
      if (description.length > LIMITS.taskText) return say(form, 'Mô tả việc tối đa 5.000 ký tự.');
      const col = p.columns.includes('List') ? 'List' : p.columns[0];
      const motif = typeof NOTE_MOTIFS === 'undefined' ? 'none' : Object.hasOwn(NOTE_MOTIFS, p.motif) ? p.motif : 'none';
      const task = { id: uid(), start: '', end: '', priority: '', labels: [], title, description, col, due: '', tag: '', motif, checks: [] };
      p.tasks.push(task);
      if (save() === false) {
        p.tasks.pop();
        return say(form, 'Chưa lưu được việc. Hãy thử lại.');
      }
      done('Đã thêm việc “' + title.slice(0, 40) + '” vào ' + p.name);
    }
  }
  function done(message) {
    clear();
    dialog.close();
    try {
      render();
    } catch {
      /* việc vẽ lại không được làm hỏng bước lưu */
    }
    notify(message);
  }

  // ---- Khi nào hiện ---------------------------------------------------------------------------------------------------------
  const ready = () => typeof currentUser !== 'undefined' && currentUser && document.documentElement.dataset.zenReady === '1' && !document.querySelector('dialog[open]');
  let timer = 0;
  function tryOpen() {
    const share = stored();
    if (!share || dialog) return;
    if (!ready()) return;
    clearInterval(timer);
    timer = 0;
    const form = build(share);
    dialog.showModal();
    form.elements.title.focus();
    form.elements.title.select();
  }
  function arm() {
    if (!stored() || timer) return;
    tryOpen();
    if (!stored() || dialog) return;
    let waited = 0;
    timer = setInterval(() => {
      waited += 500;
      tryOpen();
      if (!stored() || dialog || waited > 600000) {
        clearInterval(timer);
        timer = 0;
      }
    }, 500);
  }

  capture();
  arm();
  window.zenShareTarget = { parse, normalize, open: (share) => { pending = normalize(share || {}); arm(); } };
})();
