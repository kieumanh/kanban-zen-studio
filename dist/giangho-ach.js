'use strict';
// v1.99.0 (Bảng Vàng): thành tựu giang hồ trong trang Tu vi. Tính hoàn toàn từ dữ liệu sẵn có (nhiệm vụ công thành, chuỗi Nhật khóa,
// đại sự viên mãn, Ngân khố hồi vốn, Tàng thư, cảnh giới Tu vi, chương Truyện ký đã đọc) — KHÔNG thêm khóa nào vào dữ liệu: data.growth
// được kiểm khóa ở cả máy khách lẫn máy chủ, thêm khóa sẽ làm bản cũ còn trong bộ nhớ đệm từ chối dữ liệu.
// Dấu "đã báo" lưu bằng biên nhận đã đọc của tài khoản (notice:ach-<mã>), như Truyện ký và Biên niên:
//  - Lần đầu (chưa có notice:ach-init): đánh dấu mọi thành tựu đang đạt là đã báo, không thông báo dồn dập cho người dùng cũ.
//  - Sau đó: thành tựu mới đạt mà chưa báo thì thông báo một lần (gộp nếu nhiều), ghi biên nhận để thiết bị khác không báo lại.
// Chỉ chạy khi đã bắt đầu Tu vi và đã biết biên nhận; chế độ chỉ đọc (trang chia sẻ) không ghi gì.
(() => {
  const G = () => window.zenGrowth;
  const started = () => !!G()?.started?.();
  const KEY = (id) => 'notice:ach-' + id;
  const INIT = 'notice:ach-init';
  const receiptsReady = () => typeof readReceiptLoaded !== 'undefined' && readReceiptLoaded && typeof currentUser !== 'undefined' && currentUser && readReceiptOwner === currentUser.id;
  const receipts = () => (receiptsReady() ? readReceiptKeys : new Set());
  const addDay = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);

  // ---- Số liệu từ dữ liệu sẵn có ---------------------------------------------------------------------------------------------
  const projects = () => (typeof data !== 'undefined' && Array.isArray(data.projects) ? data.projects : []);
  const tasksDone = () => projects().reduce((n, p) => n + (p.tasks || []).filter((t) => t.col === 'Done').length, 0);
  const projectsComplete = () =>
    projects().filter((p) => {
      const live = (p.tasks || []).filter((t) => !t.archived);
      return live.length >= 3 && live.every((t) => t.col === 'Done');
    }).length;
  const fundBack = () =>
    projects().some((p) => {
      const l = Array.isArray(p.ledger) ? p.ledger : [];
      const out = l.filter((e) => e.type === 'out').reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const back = l.filter((e) => e.type === 'in').reduce((s, e) => s + (Number(e.amount) || 0), 0);
      return out > 0 && back >= out;
    })
      ? 1
      : 0;
  // Chuỗi dài nhất từng có của một việc hằng ngày: ngày nghỉ không làm đứt chuỗi và không được tính (như habits.js).
  function bestStreak(h) {
    const done = new Set(h.done || []),
      days = [...new Set([...(h.done || []), ...(h.rest || [])])].sort();
    let best = 0,
      run = 0,
      prev = null;
    for (const d of days) {
      run = prev && addDay(prev, 1) === d ? run : 0;
      if (done.has(d)) run++;
      best = Math.max(best, run);
      prev = d;
    }
    return best;
  }
  const habitStreak = () => (typeof data !== 'undefined' && Array.isArray(data.dailyHabits) ? data.dailyHabits.reduce((m, h) => Math.max(m, bestStreak(h)), 0) : 0);
  const notes = () => (typeof data !== 'undefined' && Array.isArray(data.notes) ? data.notes.length : 0);
  const realm = () => (started() ? G().realmOf(G().total(G().earnedScores())).realm : 0);
  // v2.6.0: truyện mới đánh dấu bằng notice:tale-N; danh hiệu đã đạt nhờ truyện cũ (notice:story-N) vẫn giữ.
  const chapters = () => {
    const keys = [...receipts()];
    return Math.max(keys.filter((k) => /^notice:story-([1-9]\d*)$/.test(k)).length, keys.filter((k) => /^notice:tale-([1-9]\d*)$/.test(k)).length);
  };

  // [mã, tên, mô tả, nhóm, số liệu, mốc]. v2.5.0: thêm realm-11 (Thành Thần); v2.7.0: thêm meet-22 (Tứ hải giai huynh đệ).
  const LIST = [
    ['task-1', 'Xuất chiêu đầu tiên', 'Công thành nhiệm vụ đầu tiên.', 'Công thành', tasksDone, 1],
    ['task-25', 'Tiểu thành', 'Công thành 25 nhiệm vụ.', 'Công thành', tasksDone, 25],
    ['task-100', 'Bách chiến bách thắng', 'Công thành 100 nhiệm vụ.', 'Công thành', tasksDone, 100],
    ['task-500', 'Thiên chiêu vạn thức', 'Công thành 500 nhiệm vụ.', 'Công thành', tasksDone, 500],
    ['habit-7', 'Thất nhật khổ luyện', 'Giữ một Nhật khóa 7 ngày liền.', 'Khổ luyện', habitStreak, 7],
    ['habit-30', 'Tam thập nhật bất đoạn', 'Giữ một Nhật khóa 30 ngày liền.', 'Khổ luyện', habitStreak, 30],
    ['habit-100', 'Bách nhật trúc cơ', 'Giữ một Nhật khóa 100 ngày liền.', 'Khổ luyện', habitStreak, 100],
    ['project-1', 'Đại sự viên mãn', 'Một đại sự (từ 3 nhiệm vụ) công thành trọn vẹn.', 'Đại sự', projectsComplete, 1],
    ['project-5', 'Ngũ đại công thành', 'Năm đại sự công thành trọn vẹn.', 'Đại sự', projectsComplete, 5],
    ['fund-1', 'Hồi vốn đầu tiên', 'Một đại sự thu về ít nhất bằng số đã xuất ngân.', 'Ngân khố', fundBack, 1],
    ['note-10', 'Tàng thư sơ khai', 'Chép 10 quyển trong Tàng thư.', 'Tàng thư', notes, 10],
    ['note-50', 'Tàng thư các chủ', 'Chép 50 quyển trong Tàng thư.', 'Tàng thư', notes, 50],
    ['realm-2', 'Tam lưu cao thủ', 'Đột phá tới cảnh giới Tam lưu cao thủ.', 'Tu vi', realm, 2],
    ['realm-4', 'Nhất lưu cao thủ', 'Đột phá tới cảnh giới Nhất lưu cao thủ.', 'Tu vi', realm, 4],
    ['realm-7', 'Tông sư', 'Đột phá tới cảnh giới Tông sư.', 'Tu vi', realm, 7],
    ['realm-10', 'Võ lâm chí tôn', 'Đột phá tới cảnh giới Võ lâm chí tôn, đỉnh cao nhân gian.', 'Tu vi', realm, 10],
    ['realm-11', 'Thành Thần', 'Phá ải cấp 100, bước vào Thần cảnh.', 'Tu vi', realm, 11],
    ['story-5', 'Nghe kể giang hồ', 'Đọc 5 chương Truyện ký.', 'Truyện ký', chapters, 5],
    ['story-20', 'Thông tỏ truyện ký', 'Đọc 20 chương Truyện ký.', 'Truyện ký', chapters, 20],
    ['meet-22', 'Tứ hải giai huynh đệ', 'Gặp đủ 22 nhân vật kỳ ngộ.', 'Truyện ký', () => window.zenStory?.metCount?.() || 0, 22],
  ];
  function evaluate() {
    const cache = new Map();
    return LIST.map(([id, name, desc, group, fn, goal]) => {
      if (!cache.has(fn)) cache.set(fn, fn());
      const value = cache.get(fn);
      return { id, name, desc, group, goal, value: Math.min(value, goal), done: value >= goal };
    });
  }

  // ---- Bảng vàng trong trang Tu vi -------------------------------------------------------------------------------------------
  const esc_ = (s) => (typeof esc === 'function' ? esc(s) : String(s));
  const SEAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M8.5 13.8 7 21l5-2.6 5 2.6-1.5-7.2"/><path d="m12 6 .9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1L9 8.2l2.1-.3z"/></svg>';
  function panel() {
    if (!started()) return '';
    const list = evaluate(),
      got = list.filter((a) => a.done).length;
    const groups = [...new Set(list.map((a) => a.group))];
    return (
      '<section class="panel gr-ach-panel" aria-labelledby="gr-ach-title"><div class="gr-ach-head"><h2 id="gr-ach-title">Bảng vàng</h2><p class="subtext">Đã đạt <b>' +
      got +
      '/' +
      list.length +
      '</b> danh hiệu. Tính từ việc các hạ đã làm, không cần ghi thêm gì.</p></div>' +
      groups
        .map(
          (g) =>
            '<h3 class="gr-ach-group">' +
            esc_(g) +
            '</h3><ul class="gr-ach-list">' +
            list
              .filter((a) => a.group === g)
              .map(
                (a) =>
                  '<li class="gr-ach' +
                  (a.done ? ' is-done' : '') +
                  '" data-ach="' +
                  a.id +
                  '"><span class="gr-ach-seal">' +
                  SEAL +
                  '</span><span class="gr-ach-body"><strong>' +
                  esc_(a.name) +
                  '</strong><small>' +
                  esc_(a.desc) +
                  '</small>' +
                  (a.done
                    ? '<em class="gr-ach-state">Đã đạt</em>'
                    : '<span class="gr-ach-bar" role="progressbar" aria-label="Tiến độ ' +
                      esc_(a.name) +
                      '" aria-valuemin="0" aria-valuemax="' +
                      a.goal +
                      '" aria-valuenow="' +
                      a.value +
                      '"><i style="width:' +
                      Math.round((a.value / a.goal) * 100) +
                      '%"></i></span><em class="gr-ach-state">' +
                      a.value +
                      '/' +
                      a.goal +
                      '</em>') +
                  '</span></li>',
              )
              .join('') +
            '</ul>',
        )
        .join('') +
      '</section>'
    );
  }

  // ---- Báo thành tựu mới -----------------------------------------------------------------------------------------------------
  let lastSig = '',
    loading = null;
  function check() {
    if (!started() || (typeof contentReadOnly !== 'undefined' && contentReadOnly) || typeof saveReadReceipts !== 'function') return;
    if (!receiptsReady()) {
      const owner = currentUser?.id;
      if (owner && typeof loadReadReceipts === 'function' && loading !== owner) {
        loading = owner;
        loadReadReceipts().then(() => currentUser?.id === owner && check());
      }
      return;
    }
    const list = evaluate(),
      done = list.filter((a) => a.done);
    const sig = currentUser.id + ':' + done.map((a) => a.id).join(',');
    if (sig === lastSig) return;
    lastSig = sig;
    const seen = receipts();
    if (!seen.has(INIT)) {
      saveReadReceipts([INIT, ...done.map((a) => KEY(a.id))]).catch(() => {});
      return;
    }
    const fresh = done.filter((a) => !seen.has(KEY(a.id)));
    if (!fresh.length) return;
    saveReadReceipts(fresh.map((a) => KEY(a.id))).catch(() => {});
    if (typeof notify === 'function')
      notify(fresh.length === 1 ? 'Bảng vàng · ' + fresh[0].name + ': ' + fresh[0].desc : 'Bảng vàng: đạt ' + fresh.length + ' danh hiệu mới — ' + fresh.map((a) => a.name).join(', ') + '.');
    const box = document.querySelector('.gr-ach-panel');
    if (box && typeof view !== 'undefined' && view === 'growth') box.outerHTML = panel();
  }
  if (typeof render === 'function') {
    const before = render;
    render = function (...args) {
      const out = before.apply(this, args);
      queueMicrotask(check);
      return out;
    };
  }

  window.zenAch = { LIST, evaluate, panel, check, bestStreak };
})();
