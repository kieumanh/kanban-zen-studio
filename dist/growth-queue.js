'use strict';
// v2.67.0 (Tích Công): hàng chờ vận công — bấm “Để sau” không còn làm mất điểm của việc.
// Dữ liệu: một trường tùy chọn ngay trên việc, `xpWait: true` (việc đã ở cột Hoàn thành, chưa chia công lực), và một cờ tùy chọn của Điểm tích lũy,
// `data.growth.batch` (true = “Gộp cuối ngày”: xong việc không hiện bảng, việc vào hàng chờ). Thiếu cờ = hỏi mỗi lần như trước. Không có bảng, cột hay biến môi trường mới.
// Hàng chờ chỉ tính những việc còn ở cột Hoàn thành, chưa lưu, chưa có dòng điểm trong sổ cái (chống cộng trùng theo mã việc vẫn như cũ); cờ thừa của việc
// đã bị đưa ra khỏi Hoàn thành hoặc đã cộng điểm rồi thì bỏ qua và không hiện. Khối “Chờ vận công” nằm ở trang Điểm tích lũy: từng việc có nút Vận công,
// và “Chia một lượt” mở lần lượt bảng vận công cho cả hàng chờ (Esc dừng lượt). Ứng dụng không tự cộng điểm: điểm chỉ vào sổ cái khi bấm Lưu công lực.
(() => {
  const SHOWN = 5;
  const G = () => window.zenGrowth;
  const readOnly = () => typeof contentReadOnly !== 'undefined' && contentReadOnly;
  const esc_ = (s) => (typeof esc === 'function' ? esc(s) : String(s));
  const grow = () => (G() && G().growth ? G().growth() : null);
  const find = (id) => {
    for (const p of data.projects) {
      const t = p.tasks.find((x) => x.id === id);
      if (t) return { t, p };
    }
    return null;
  };
  const isBatch = () => !!grow() && grow().batch === true;

  // Việc đang chờ: còn ở Hoàn thành, mang cờ xpWait, chưa có điểm, không thuộc đại sự đã lưu trữ và chưa bị lưu trữ.
  function waiting() {
    const g = grow();
    if (!g || !G().isScored) return [];
    const out = [];
    for (const p of data.projects || []) {
      if (p.archived) continue;
      for (const t of p.tasks || []) if (t.xpWait === true && t.col === 'Done' && !t.archived && !G().isScored(g, 'task:' + t.id)) out.push({ t, p });
    }
    return out;
  }

  // ---- Đưa vào / gỡ khỏi hàng chờ -----------------------------------------------------------------------------------------
  const chain = { ids: [], on: false, stop: false };
  function flag(id) {
    if (readOnly()) return false;
    return wfSave(() => {
      const f = find(id);
      if (!f) throw Error('Chưa tìm thấy việc này.');
      f.t.xpWait = true;
    });
  }
  // growth.js gọi khi bấm “Để sau” (how = 'skip'), Esc ('esc') hoặc khi một bảng khác thay chỗ ('auto').
  function defer(id, title, queued, how) {
    if (queued) {
      if (how === 'esc') chain.stop = true;
      return;
    }
    if (readOnly() || !find(id)) return;
    if (find(id).t.xpWait === true) return;
    if (flag(id)) notify('Đã cất “' + title + '” vào hàng chờ vận công. Chia lúc nào cũng được ở trang Điểm tích lũy, điểm không mất.');
  }
  // Chế độ Gộp cuối ngày: xong việc là cất thẳng vào hàng chờ, không hiện bảng. Trả true khi đã cất (không lưu được thì trả false để hiện bảng như cũ).
  function batch(task) {
    if (!isBatch() || readOnly() || !task || task.xpWait === true) return false;
    if (!flag(task.id)) return false;
    notify('Đã ghi “' + task.title + '” vào hàng chờ vận công. Chia một lượt ở trang Điểm tích lũy.');
    return true;
  }
  // Gọi bên trong wfSave khi điểm của việc được lưu: gỡ cờ cùng một lần lưu.
  function clear(key) {
    const f = find(String(key).replace(/^task:/, ''));
    if (f && f.t.xpWait !== undefined) delete f.t.xpWait;
  }

  // ---- Khối “Chờ vận công” ------------------------------------------------------------------------------------------------
  function card() {
    const list = waiting();
    if (!list.length) return '';
    const ro = readOnly();
    const rows = list
      .slice(0, SHOWN)
      .map(
        ({ t, p }) =>
          '<li><span class="gr-queue-name"><strong>' + esc_(t.title) + '</strong><small>' + esc_(p.name) + '</small></span>' +
          (ro ? '' : '<button type="button" class="btn" data-queue-one="' + esc_(t.id) + '" aria-label="Vận công: ' + esc_(t.title) + '">Vận công</button>') +
          '</li>',
      )
      .join('');
    return (
      '<section class="panel gr-queue" tabindex="-1" aria-label="Chờ vận công"><div class="gr-queue-head"><h2>Chờ vận công <span class="gr-queue-n">' + list.length + '</span></h2>' +
      (ro ? '' : '<button type="button" class="btn primary" data-queue-all>Chia một lượt</button>') + '</div>' +
      '<p class="help-copy">Những việc đã công thành nhưng chưa chia công lực. Điểm không mất; các hạ chia lúc nào cũng được.</p>' +
      '<ul class="gr-queue-list">' + rows + '</ul>' +
      (list.length > SHOWN ? '<p class="help-copy">Còn ' + (list.length - SHOWN) + ' việc nữa; “Chia một lượt” sẽ đi qua tất cả.</p>' : '') +
      '</section>'
    );
  }
  function focusCard() {
    (document.querySelector('.gr-queue') || document.querySelector('.gr-page h1'))?.focus?.();
  }
  function openFor(id) {
    const f = find(id);
    const g = grow();
    if (!f || !g || f.t.col !== 'Done' || G().isScored(g, 'task:' + id)) return next();
    G().openAward({ source: 'task', key: 'task:' + id, title: f.t.title, steps: G().TASK_STEPS, axis: f.t.axis, queued: true, then: next });
  }
  // Sau mỗi bảng: đi tiếp việc kế trong lượt (trừ khi Esc), hết lượt thì đưa tiêu điểm về khối.
  function next() {
    if (chain.on && !chain.stop && chain.ids.length) return openFor(chain.ids.shift());
    const wasChain = chain.on;
    chain.on = false;
    chain.ids = [];
    chain.stop = false;
    if (wasChain && !waiting().length) notify('Đã chia xong hàng chờ vận công.');
    focusCard();
  }
  document.addEventListener('click', (e) => {
    const one = e.target.closest && e.target.closest('[data-queue-one]');
    if (one) {
      if (readOnly()) return;
      chain.on = false;
      chain.ids = [];
      chain.stop = false;
      return openFor(one.dataset.queueOne);
    }
    if (e.target.closest && e.target.closest('[data-queue-all]')) {
      if (readOnly()) return;
      chain.ids = waiting().map((x) => x.t.id);
      chain.on = true;
      chain.stop = false;
      next();
    }
  });

  window.zenQueue = { waiting, defer, batch, clear, card, isBatch };
})();
