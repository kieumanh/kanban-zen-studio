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

  // v1.33.0: ngày "nghỉ" không làm đứt chuỗi và không được tính là đã làm.
  function streak(h) {
    const done = new Set(h.done), rest = new Set(h.rest || []);
    let d = today();
    if (!done.has(d) && !rest.has(d)) d = addDays(d, -1);
    let n = 0;
    while (done.has(d) || rest.has(d)) {
      if (done.has(d)) n++;
      d = addDays(d, -1);
    }
    return n;
  }
  const weekDone = (h) => { const s = weekStats(h, week()); return s ? s.n : 0; };
  const todayDone = () => list().filter((h) => h.done.includes(today())).length;
  // v1.22.0: mục tiêu mỗi việc = số lần trong tuần người dùng chọn (1–7). Việc cũ không có mục tiêu tính như mỗi ngày (7).
  const goalOf = (h) => (Number.isInteger(h.goal) && h.goal >= 1 && h.goal <= 7 ? h.goal : 7);
  // Thống kê một việc trong một tuần (bắt đầu từ thứ Hai `mon`): g = mục tiêu, n = số lượt tích trong tuần, tối đa g.
  // Việc tạo sau Chủ nhật của tuần đó không tính vào tuần ấy.
  function weekStats(h, mon) {
    const sun = addDays(mon, 6);
    if (h.createdAt > sun) return null;
    const g = goalOf(h);
    let n = 0;
    for (const d of h.done) if (d >= mon && d <= sun) n++;
    return { g, n: Math.min(n, g), raw: n };
  }
  // Tiến độ cộng gộp của tuần đang xem: tổng lượt tích được tính (mỗi việc tối đa đúng số lần đã chọn) / tổng mục tiêu.
  function weekProgress() {
    const mon = week();
    let tr = 0, dn = 0;
    for (const h of list()) {
      const s = weekStats(h, mon);
      if (!s) continue;
      tr += s.g;
      dn += s.n;
    }
    return { tr, dn, pct: tr ? Math.round((dn / tr) * 100) : 0 };
  }
  let mode = 'week';
  let range = 30;
  window.zenHabits = { list, today: () => today(), addDays, toDate, mondayOf, short, streak, goalOf, weekStats, SHORT, LONG, esc: (s) => esc(s) };

  iconPaths.habits = 'M4 12a8 8 0 0 1 14-5.3L20 9 M20 4v5h-5 M20 12a8 8 0 0 1-14 5.3L4 15 M4 20v-5h5 M9.5 12l2 2 3.5-4';
  const flame = '<svg class="hb-flame" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2 0 2 1 3 2 3 0-3 0-5.8 1-8.8z"/></svg>';
  const tick = '<svg class="hb-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M5.5 12.5l4.2 4.2L18.5 7.5"/></svg>';

  const reportIcon = '<svg class="hb-rp-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect class="b1" x="4" y="12" width="4" height="8" rx="1.5"/><rect class="b2" x="10" y="5" width="4" height="15" rx="1.5"/><rect class="b3" x="16" y="9" width="4" height="11" rx="1.5"/></svg>';
  const gridIcon = '<svg class="hb-rp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><path d="M14.5 17l2 2 3.5-4"/></svg>';
  function checkButton(h, d) {
    const done = h.done.includes(d),
      rested = !done && (h.rest || []).includes(d),
      i = (toDate(d).getUTCDay() + 6) % 7,
      note = (h.notes || {})[d] || '';
    return '<div class="hb-cell' + (d === today() ? ' is-today' : '') + (rested ? ' is-rest' : '') + '"><span class="hb-dayname" aria-hidden="true">' + SHORT[i] + '<small class="hb-daynum">' + short(d).slice(0, 2) + '</small></span><button type="button" class="hb-check' + (done ? ' is-done' : '') + '" role="checkbox" aria-checked="' + done + '" data-hb-toggle="' + esc(h.id) + '" data-hb-date="' + d + '"' + '' + ' aria-label="' + esc(h.name) + ' — ' + LONG[i] + ' ' + short(d) + (rested ? ' (nghỉ)' : '') + (note ? ' (có ghi chú)' : '') + '"' + (note ? ' title="' + esc(note) + '"' : '') + '>' + tick + (note ? '<i class="hb-note-dot" aria-hidden="true"></i>' : '') + '</button></div>';
  }
  // v1.22.0: liên kết dự án (hiển thị ở từng việc để biết việc này phục vụ dự án nào).
  const projectOf = (h) => (h.projectId ? (data.projects || []).find((p) => p.id === h.projectId) : null);
  function projectChip(h) {
    if (!h.projectId) return '<span class="hb-project is-empty">Chưa gắn dự án</span>';
    const p = projectOf(h);
    if (!p) return '<span class="hb-project is-missing">Dự án đã xóa</span>';
    return '<span class="hb-project" style="--pc:' + esc(p.color) + '" title="Dự án liên quan"><i aria-hidden="true"></i>' + esc(p.name) + '</span>';
  }
  const goalLabel = (g) => (g === 7 ? 'Mỗi ngày (7 lần)' : g + ' lần mỗi tuần');
  // v1.34.0: giờ nhắc riêng của việc (chỉ hiện khi đã đặt giờ).
  const remindChip = (h) => (h.remindTime ? '<span class="hb-remind">' + svgIcon('bell') + 'Nhắc ' + esc(h.remindTime) + '</span>' : '');
  function meta(h) {
    const s = streak(h);
    const g = goalOf(h);
    return '<span class="hb-streak' + (s ? ' is-on' : '') + '">' + flame + (s ? 'Chuỗi ' + s + ' ngày' : 'Chưa có chuỗi') + '</span><span class="hb-week-count">' + weekDone(h) + '/' + g + ' trong tuần</span>' + remindChip(h) + projectChip(h);
  }
  // v1.33.0: "Nghỉ hôm nay" — chỉ khi hôm nay chưa làm; bấm lại để bỏ nghỉ.
  function restButton(h) {
    if (week() !== mondayOf(today())) return '';
    const t = today(), done = h.done.includes(t), rested = (h.rest || []).includes(t);
    if (done) return '';
    return '<button type="button" class="hb-rest' + (rested ? ' is-on' : '') + '" data-hb-rest="' + esc(h.id) + '" aria-pressed="' + rested + '">' + (rested ? 'Bỏ nghỉ hôm nay' : 'Nghỉ hôm nay') + '</button>';
  }
  // v1.38.0: ghi chú cảm nhận theo ngày. Mở bằng cách giữ ô ngày (0,5 giây), chuột phải, hoặc Shift+Enter khi dùng bàn phím.
  // Để trống rồi lưu là xóa ghi chú. Không ghi chú cho ngày sau hôm nay.
  const NOTE_MAX = 140;
  const noteTip = () => '<p class="hb-note-tip">Giữ một ô ngày để ghi chú cảm nhận.</p>';
  function noteForm(h, d) {
    if (!h || !d || d > today()) return;
    const cur = (h.notes || {})[d] || '',
      i = (toDate(d).getUTCDay() + 6) % 7;
    modal('<h2>Ghi chú · ' + esc(h.name) + '</h2><p class="hb-note-date">' + LONG[i] + ' ' + short(d) + (d === today() ? ' · hôm nay' : '') + '</p><label class="field hb-note-field">Cảm nhận<textarea name="note" rows="3" maxlength="' + NOTE_MAX + '" placeholder="Một câu ngắn về việc này…">' + esc(cur) + '</textarea></label><small class="hb-note-hint">Để trống rồi lưu để xóa ghi chú. Tối đa ' + NOTE_MAX + ' ký tự.</small>', (fd) => {
      const text = String(fd.get('note') || '').trim().slice(0, NOTE_MAX);
      if (text === cur) return $('#editor').close();
      if (!wfSave(() => {
        const notes = Object.assign({}, h.notes || {});
        if (text) notes[d] = text;
        else delete notes[d];
        if (Object.keys(notes).length) h.notes = notes;
        else delete h.notes;
      })) return render();
      $('#editor').close();
      render();
      notify(text ? 'Đã lưu ghi chú.' : 'Đã xóa ghi chú.');
    });
  }
  // v1.33.0: lịch sử của một việc. v1.40.0: báo cáo riêng gồm 28 hoặc 90 ngày, tỷ lệ, chuỗi dài nhất và ghi chú.
  function history(h, days = 28) {
    if (!h) return;
    const n = days === 90 ? 90 : 28, t = today(), done = new Set(h.done), rest = new Set(h.rest || []), notes = h.notes || {};
    const cells = Array.from({ length: n }, (_, i) => addDays(t, i - (n - 1)));
    const doneCount = cells.filter((d) => done.has(d)).length, restCount = cells.filter((d) => rest.has(d) && !done.has(d)).length;
    let best = 0, run = 0;
    for (const d of cells) {
      if (done.has(d)) run += 1;
      else if (!rest.has(d)) run = 0;
      best = Math.max(best, run);
    }
    const rate = n - restCount > 0 ? Math.round((doneCount / (n - restCount)) * 100) : 0;
    const grid = cells.map((d) => '<span class="hb-hist-cell' + (done.has(d) ? ' is-done' : rest.has(d) ? ' is-rest' : '') + (d === t ? ' is-today' : '') + '" title="' + short(d) + (done.has(d) ? ' · đã làm' : rest.has(d) ? ' · nghỉ' : '') + (notes[d] ? ' · có ghi chú' : '') + '"><small>' + short(d) + '</small></span>').join('');
    const noteRows = cells.filter((d) => notes[d]).map((d) => '<li><strong>' + short(d) + '</strong> ' + esc(notes[d]) + '</li>').join('');
    const range = '<div class="hb-hist-range" role="group" aria-label="Khoảng thời gian">' + [28, 90].map((k) => '<button type="button" class="hb-hist-days' + (k === n ? ' is-on' : '') + '" data-hb-hist-days="' + k + '" data-hb-hist-id="' + esc(h.id) + '" aria-pressed="' + (k === n) + '">' + k + ' ngày</button>').join('') + '</div>';
    modal('<h2>Báo cáo: ' + esc(h.name) + '</h2>' + range + '<div class="hb-hist"><p class="hb-hist-sum">Chuỗi hiện tại <strong>' + streak(h) + ' ngày</strong> · đã làm <strong>' + doneCount + '</strong>/' + n + ' ngày' + (restCount ? ' · nghỉ <strong>' + restCount + '</strong>' : '') + '</p><p class="hb-hist-rate">Tỷ lệ <strong>' + rate + '%</strong> (không tính ngày nghỉ) · chuỗi dài nhất <strong>' + best + ' ngày</strong></p><div class="hb-hist-grid" role="img" aria-label="' + n + ' ngày gần nhất">' + grid + '</div><p class="help-copy">Ô đậm là ngày đã làm, ô nét đứt là ngày nghỉ. Ngày nghỉ không làm đứt chuỗi.</p>' + (noteRows ? '<div class="hb-hist-notes"><h3>Ghi chú trong ' + n + ' ngày</h3><ul>' + noteRows + '</ul></div>' : '') + '</div>', null, true);
  }
  // v1.34.0: nhắc riêng từng việc theo giờ Việt Nam (cùng múi giờ với ngày trong ứng dụng).
  // Việc được nhắc khi đã đến giờ, chưa làm và chưa nghỉ hôm nay. "Đã xem" tắt nhắc đến hết ngày hoặc khi đổi giờ.
  const nowHM = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const reminderKey = (h) => 'zen-habit-seen:' + (currentUser?.id || '') + ':' + h.id + ':' + today() + ':' + h.remindTime;
  let dueSig = '';
  function dueHabitReminders() {
    const t = today(), now = nowHM();
    return list().filter((h) => h.remindTime && h.remindTime <= now && !h.done.includes(t) && !(h.rest || []).includes(t) && localRead(reminderKey(h)) !== '1');
  }
  function dueBanner(due) {
    if (!due.length) return '';
    return '<section class="hb-due" role="status" aria-label="Việc đến giờ nhắc"><div class="hb-due-text"><strong>' + svgIcon('bell') + due.length + ' việc đến giờ nhắc</strong><span>' + due.map((h) => esc(h.name)).join(' · ') + '</span></div><button type="button" class="btn hb-due-dismiss" data-hb-due-dismiss>Đã xem</button></section>';
  }
  // v1.40.0: nút "Xem lịch sử" bằng chữ ở từng việc, mở báo cáo riêng của việc đó.
  const historyButton = (h) => '<button type="button" class="hb-hist-btn" data-hb-history="' + esc(h.id) + '" aria-label="Xem lịch sử: ' + esc(h.name) + '">Xem lịch sử</button>';
  // v1.39.0: tay cầm đổi thứ tự (sáu chấm), đặt cuối dòng "Nghỉ hôm nay" để không làm hẹp tên việc trên điện thoại.
  const gripIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
  const gripButton = (h) => '<button type="button" class="hb-grip" data-hb-grip="' + esc(h.id) + '" aria-label="Đổi thứ tự “' + esc(h.name) + '”: kéo, hoặc nhấn mũi tên lên xuống" title="Kéo để đổi thứ tự">' + gripIcon + '</button>';
  function row(h) {
    return '<li class="hb-row" data-hb-row="' + esc(h.id) + '" style="--hb:' + esc(h.color) + '"><div class="hb-info"><span class="hb-icon" aria-hidden="true">' + esc(h.icon || '✳') + '</span><div class="hb-text"><strong class="hb-name">' + esc(h.name) + '</strong><span class="hb-meta">' + meta(h) + '</span></div><div class="hb-actions"><button type="button" class="icon-btn hb-act" data-hb-edit="' + esc(h.id) + '" aria-label="Sửa ' + esc(h.name) + '" title="Sửa">' + svgIcon('edit') + '</button><button type="button" class="icon-btn hb-act hb-del" data-hb-delete="' + esc(h.id) + '" aria-label="Xóa ' + esc(h.name) + '" title="Xóa">' + svgIcon('trash') + '</button></div></div><div class="hb-days">' + days().map((d) => checkButton(h, d)).join('') + '</div><div class="hb-foot">' + restButton(h) + historyButton(h) + gripButton(h) + '</div></li>';
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
  // v1.24.0: tuần đang xem cho biết còn bao nhiêu lượt cần làm; tuần mới có trạng thái riêng.
  const progressNote = (p) => {
    if (!p.tr) return 'Chưa có việc nào trong tuần này';
    const tail = 'đã làm ' + p.dn + '/' + p.tr;
    if (week() !== mondayOf(today())) return tail;
    if (!p.dn) return 'Tuần mới: bắt đầu bằng 1 lượt · ' + tail;
    const left = p.tr - p.dn;
    return left > 0 ? 'Còn ' + left + ' lượt cần làm tuần này · ' + tail : 'Đã đủ mục tiêu tuần này · ' + tail;
  };
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
    return '<div class="hb-weekbar"><span class="hb-weekbar-title">Bảng tuần</span><div class="hb-week-nav" role="group" aria-label="Chọn tuần"><button type="button" class="icon-btn hb-week-btn" data-hb-week="-1" aria-label="Tuần trước">‹</button><strong class="hb-week-label" id="hb-week-label">' + short(ws) + ' – ' + short(addDays(ws, 6)) + '</strong><button type="button" class="icon-btn hb-week-btn" data-hb-week="1" aria-label="Tuần sau">›</button><button type="button" class="btn hb-now" data-hb-week="0"' + (current ? ' disabled' : '') + '>Hôm nay</button></div>' + todayChip() + '</div>';
  }
  function actions() {
    const report = mode === 'report';
    return '<div class="hb-heading-actions"><button class="btn primary hb-add" type="button" data-hb-add><span class="btn-icon">+</span> Thêm việc</button><button class="btn hb-report-btn' + (report ? ' is-active' : '') + '" type="button" data-hb-mode="' + (report ? 'week' : 'report') + '" aria-pressed="' + report + '">' + (report ? gridIcon : reportIcon) + '<span>' + (report ? 'Bảng tuần' : 'Báo cáo') + '</span></button></div>';
  }
  // v1.41.0: lời nhắc nhẹ khi hôm nay chưa tích việc nào. Chỉ ở tuần hiện tại; đóng một lần thì ẩn đến hết ngày.
  const nudgeKey = () => 'zen-habit-nudge:' + (currentUser?.id || '') + ':' + today();
  function nudgeBanner() {
    const t = today(), hs = list();
    if (!hs.length || week() !== mondayOf(t) || todayDone() > 0) return '';
    if (hs.every((h) => (h.rest || []).includes(t))) return '';
    if (localRead(nudgeKey()) === '1') return '';
    return '<section class="hb-nudge" role="status" aria-label="Gợi ý bắt đầu hôm nay"><p><strong>Hôm nay chưa có việc nào được tích.</strong><span>Bắt đầu bằng một việc nhỏ nhất.</span></p><button type="button" class="btn hb-nudge-close" data-hb-nudge-close>Đóng</button></section>';
  }
  function page() {
    renderedDay = today();
    const hs = list(),
      report = mode === 'report',
      due = dueHabitReminders();
    dueSig = due.map((h) => h.id).join();
    const body = report
      ? window.zenHabitsReport
        ? window.zenHabitsReport.html(range)
        : ''
      : '<div class="hb-overview">' + summary() + progressBlock() + '</div>' + weekBar() + (hs.length ? noteTip() + head() + '<ul class="hb-list">' + hs.map(row).join('') + '</ul>' : empty());
    return heading('', report ? 'Báo cáo việc hằng ngày' : 'Việc hằng ngày', report ? 'Biểu đồ, đánh giá và đề xuất cải thiện từ chính dữ liệu tích của bạn.' : 'Tích từng việc nhỏ mỗi ngày để nuôi dưỡng thói quen tốt.', actions()) + dueBanner(report ? [] : due) + (report ? '' : nudgeBanner()) + '<section class="panel hb-panel' + (report ? ' is-report' : '') + '" aria-label="' + (report ? 'Báo cáo việc hằng ngày' : 'Bảng việc hằng ngày') + '">' + body + '</section>';
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

  // v1.23.0: bộ chọn biểu tượng giống form dự án: gợi ý nhanh + tìm trong thư viện (icon-library.js), có nhóm và tìm kiếm.
  const ICON_RESULT_LIMIT = 180;
  const iconLibrary = () => (typeof ICON_LIBRARY !== 'undefined' ? ICON_LIBRARY : []);
  const iconCategories = () => (typeof ICON_CATEGORY_LABELS !== 'undefined' ? ICON_CATEGORY_LABELS : { all: 'Tất cả' });
  const weekdayIndex = (d) => (toDate(d).getUTCDay() + 6) % 7;
  function todayChip() {
    const t = today(), name = LONG[weekdayIndex(t)];
    return '<span class="hb-today-chip" aria-label="Hôm nay là ' + name + ' ngày ' + short(t) + '">Hôm nay · ' + name + ', ' + short(t) + '</span>';
  }
  function pickIcon(icon, closePanel) {
    const input = document.querySelector('#editor-body [name=icon]');
    if (!input) return;
    input.value = icon;
    const label = document.querySelector('#hb-icon-preview');
    if (label) label.textContent = icon;
    document.querySelectorAll('#editor-body [data-hb-icon]').forEach((b) => { const on = b.dataset.hbIcon === icon; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    if (closePanel) { const picker = document.querySelector('#hb-icon-picker'); if (picker) picker.open = false; }
    syncPreview();
    drawIconResults();
  }
  function drawIconResults() {
    const box = document.querySelector('#hb-icon-results'), count = document.querySelector('#hb-icon-count');
    if (!box || !count) return;
    const terms = (document.querySelector('#hb-icon-search')?.value || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const cat = document.querySelector('#hb-icon-cat')?.value || 'all';
    const current = document.querySelector('#editor-body [name=icon]')?.value.trim();
    const all = iconLibrary().filter((i) => (cat === 'all' || i.category === cat) && terms.every((t) => i.keywords.includes(t) || i.icon.includes(t)));
    const shown = all.slice(0, ICON_RESULT_LIMIT);
    count.textContent = all.length + ' biểu tượng' + (all.length > shown.length ? ' · hiện ' + shown.length + ' đầu, gõ để tìm thêm' : '');
    box.innerHTML = shown.map((i) => '<button type="button" class="hb-lib-btn" data-hb-lib="' + esc(i.icon) + '" title="' + esc(i.keywords) + '" aria-label="Chọn ' + esc(i.keywords) + '" aria-pressed="' + (i.icon === current) + '">' + i.icon + '</button>').join('') || '<p class="hb-icon-empty">Không tìm thấy. Thử từ tiếng Anh khác, ví dụ “leaf”, “water”, “book”.</p>';
  }
  function form(h) {
    if (!h && list().length >= MAX) return notify('Tối đa ' + MAX + ' việc hằng ngày.');
    const color = h?.color || COLORS[list().length % COLORS.length];
    const goal = h ? goalOf(h) : 7;
    const pid = h?.projectId || '';
    const options = (data.projects || []).filter((p) => !p.archived || p.id === pid);
    const projectField = '<label class="field hb-project-field">Dự án liên quan<select name="projectId"><option value="">Không gắn dự án</option>' + options.map((p) => '<option value="' + esc(p.id) + '"' + (p.id === pid ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select></label>';
    const goalField = '<div class="hb-goal" role="group" aria-labelledby="hb-goal-title"><span class="hb-goal-label" id="hb-goal-title">Số lần trong tuần</span><div class="hb-stepper"><button type="button" class="hb-step" data-hb-goal-step="-1" aria-label="Giảm số lần trong tuần">−</button><output class="hb-step-value" id="hb-goal-value" aria-live="polite">' + goalLabel(goal) + '</output><button type="button" class="hb-step" data-hb-goal-step="1" aria-label="Tăng số lần trong tuần">+</button></div><input type="hidden" name="goal" value="' + goal + '"></div>';
    // v1.34.0: "Nhắc lúc" là tùy chọn; để trống thì việc không được nhắc.
    const remindField = '<label class="field hb-remind-field">Nhắc lúc<input type="time" lang="vi-VN" name="remindTime" value="' + esc(h?.remindTime || '') + '"><small class="hb-remind-hint">Để trống nếu không cần nhắc. Khi đến giờ, việc sẽ hiện ở đầu trang này và trong chuông thông báo.</small></label>';
    const iconNow = h?.icon || '🌿';
    const iconPicker = '<div class="hb-icon-field" role="group" aria-labelledby="hb-icon-title"><span class="hb-goal-label" id="hb-icon-title">Biểu tượng</span><div class="hb-icon-picks">' + ICONS.map((i) => '<button type="button" class="hb-icon-pick' + (i === iconNow ? ' is-on' : '') + '" data-hb-icon="' + i + '" aria-label="Chọn biểu tượng ' + i + '" aria-pressed="' + (i === iconNow) + '">' + i + '</button>').join('') + '</div><details class="appearance-picker hb-icon-picker" id="hb-icon-picker"><summary><span>Thư viện biểu tượng</span><span class="appearance-value"><b id="hb-icon-preview">' + esc(iconNow) + '</b>Mở thư viện ⌄</span></summary><input type="hidden" name="icon" value="' + esc(iconNow) + '"><div class="icon-picker-panel hb-icon-panel"><div class="icon-library-tools"><input type="search" id="hb-icon-search" class="emoji-search" placeholder="Tìm: leaf, book, water…" aria-label="Tìm biểu tượng bằng tiếng Anh"><label class="hb-icon-cat">Nhóm<select id="hb-icon-cat">' + Object.entries(iconCategories()).map(([k, name]) => '<option value="' + k + '">' + name + '</option>').join('') + '</select></label></div><small class="icon-result-count" id="hb-icon-count" role="status"></small><div class="icon-library-results" id="hb-icon-results"></div></div></details></div>';
    modal('<h2>' + (h ? 'Chỉnh sửa việc hằng ngày' : 'Thêm việc hằng ngày') + '</h2><div class="hb-form"><div class="hb-preview" id="hb-preview" style="--hb:' + color + '" aria-hidden="true"><span class="hb-icon">' + esc(h?.icon || '🌿') + '</span><span class="hb-preview-name">' + (esc(h?.name) || 'Tên việc của bạn') + '</span><span class="hb-preview-check">' + tick + '</span></div>' + field('Tên việc', 'name', h?.name || '', 'text', true, 80) + goalField + projectField + remindField + iconPicker + '<fieldset class="hb-swatches"><legend>Màu dấu tích</legend>' + COLORS.map((c, i) => '<label class="hb-swatch" style="--hb:' + c + '"><input type="radio" name="color" value="' + c + '"' + (c === color ? ' checked' : '') + '><span aria-hidden="true"></span><em class="sr-only">Màu ' + (i + 1) + '</em></label>').join('') + '</fieldset>' + (h ? '<button type="button" class="text-btn danger hb-form-delete" data-hb-delete="' + esc(h.id) + '">Xóa việc này</button>' : '') + '</div>', (fd) => {
      const name = String(fd.get('name') || '').trim(), icon = String(fd.get('icon') || '').trim() || '🌿', col = String(fd.get('color') || color);
      const g = Math.min(7, Math.max(1, parseInt(fd.get('goal'), 10) || 7)), link = String(fd.get('projectId') || ''), remind = String(fd.get('remindTime') || '').trim();
      if (!name) return;
      if (remind && !/^([01]\d|2[0-3]):[0-5]\d$/.test(remind)) return notify('Giờ nhắc chưa đúng. Hãy chọn giờ theo đồng hồ 24 giờ.');
      if (wfSave(() => {
        if (h) {
          const t = find(h.id);
          if (!t) throw Error('Việc này không còn tồn tại.');
          Object.assign(t, { name, icon, color: col, goal: g });
          if (link) t.projectId = link;
          else delete t.projectId;
          if (remind) t.remindTime = remind;
          else delete t.remindTime;
        } else {
          const item = { id: uid(), name, icon, color: col, goal: g, createdAt: today(), done: [] };
          if (link) item.projectId = link;
          if (remind) item.remindTime = remind;
          data.dailyHabits = list().concat(item);
        }
      })) { $('#editor').close(); render(); notify(h ? 'Đã cập nhật việc hằng ngày.' : 'Đã thêm việc hằng ngày.'); }
    });
    document.querySelector('#hb-icon-search')?.addEventListener('input', drawIconResults);
    document.querySelector('#hb-icon-cat')?.addEventListener('change', drawIconResults);
    drawIconResults();
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
    const t = e.target.closest('[data-hb-due-dismiss],[data-hb-nudge-close],[data-hb-open],[data-hb-rest],[data-hb-history],[data-hb-hist-days],[data-hb-toggle],[data-hb-add],[data-hb-edit],[data-hb-delete],[data-hb-confirm-delete],[data-hb-cancel],[data-hb-week],[data-hb-preset],[data-hb-icon],[data-hb-mode],[data-hb-range],[data-hb-goal-step],[data-hb-lib]');
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
      if (!had && d === today()) document.querySelector('.hb-nudge')?.remove();
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
    if (t.hasAttribute('data-hb-nudge-close')) {
      localWrite(nudgeKey(), '1');
      return render();
    }
    if (t.hasAttribute('data-hb-due-dismiss')) {
      dueHabitReminders().forEach((h) => localWrite(reminderKey(h), '1'));
      refreshBell();
      return render();
    }
    if (t.dataset.hbOpen) {
      $('#editor').close();
      view = 'habits';
      mode = 'week';
      render();
      return window.scrollTo({ top: 0, left: 0 });
    }
    if (t.hasAttribute('data-hb-add')) return form();
    if (t.dataset.hbRest) {
      const h = find(t.dataset.hbRest), k = today();
      if (!h || h.done.includes(k)) return;
      const on = (h.rest || []).includes(k);
      if (!wfSave(() => { h.rest = on ? h.rest.filter((x) => x !== k) : (h.rest || []).concat(k).sort(); })) return render();
      return render();
    }
    if (t.dataset.hbHistDays) return history(find(t.dataset.hbHistId), Number(t.dataset.hbHistDays));
    if (t.dataset.hbHistory) return history(find(t.dataset.hbHistory));
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
    if (t.dataset.hbGoalStep) {
      const input = document.querySelector('#editor-body [name=goal]'), out = document.querySelector('#hb-goal-value');
      if (!input || !out) return;
      const v = Math.min(7, Math.max(1, (parseInt(input.value, 10) || 7) + Number(t.dataset.hbGoalStep)));
      input.value = String(v);
      out.textContent = goalLabel(v);
      return;
    }
    if (t.dataset.hbIcon) return pickIcon(t.dataset.hbIcon, false);
    if (t.dataset.hbLib) return pickIcon(t.dataset.hbLib, true);
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
  // v1.38.0: giữ ô để ghi chú (không tích). Sau khi mở ghi chú, lần nhả tay không kích hoạt tích ô.
  let pressTimer = 0, pressCell = null, pressAt = null, pressFired = false, swallowUntil = 0;
  const cancelPress = () => { clearTimeout(pressTimer); pressTimer = 0; pressCell = null; };
  document.addEventListener('pointerdown', (e) => {
    cancelPress();
    const cell = e.target.closest?.('[data-hb-toggle]');
    if (!cell || e.button !== 0) return;
    pressCell = cell;
    pressAt = { x: e.clientX, y: e.clientY };
    pressTimer = setTimeout(() => {
      const target = pressCell;
      cancelPress();
      if (!target) return;
      pressFired = true;
      noteForm(find(target.dataset.hbToggle), target.dataset.hbDate);
    }, 500);
  });
  document.addEventListener('pointermove', (e) => {
    if (pressCell && Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y) > 10) cancelPress();
  });
  const endPress = () => {
    cancelPress();
    if (pressFired) swallowUntil = Date.now() + 400;
    pressFired = false;
  };
  document.addEventListener('pointerup', endPress);
  document.addEventListener('pointercancel', endPress);
  document.addEventListener('click', (e) => {
    if (Date.now() >= swallowUntil) return;
    swallowUntil = 0;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  document.addEventListener('contextmenu', (e) => {
    const cell = e.target.closest?.('[data-hb-toggle]');
    if (!cell) return;
    e.preventDefault();
    cancelPress();
    noteForm(find(cell.dataset.hbToggle), cell.dataset.hbDate);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.shiftKey) return;
    const cell = e.target.closest?.('[data-hb-toggle]');
    if (!cell) return;
    e.preventDefault();
    noteForm(find(cell.dataset.hbToggle), cell.dataset.hbDate);
  });
  // v1.39.0: đổi thứ tự việc: kéo tay cầm (chuột hoặc cảm ứng), hoặc chọn tay cầm rồi nhấn mũi tên lên/xuống.
  // Thứ tự là thứ tự mảng dailyHabits, được lưu và đồng bộ cùng dữ liệu việc.
  let drag = null;
  const habitRows = () => Array.from(document.querySelectorAll('.hb-list > .hb-row'));
  function moveHabit(id, to) {
    const arr = list().slice(), from = arr.findIndex((h) => h.id === id);
    if (from < 0 || to < 0 || to >= arr.length || to === from) return false;
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    return wfSave(() => { data.dailyHabits = arr; });
  }
  document.addEventListener('keydown', (e) => {
    const grip = e.target.closest?.('[data-hb-grip]');
    if (!grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const id = grip.dataset.hbGrip, from = list().findIndex((h) => h.id === id), to = from + (e.key === 'ArrowUp' ? -1 : 1);
    if (!moveHabit(id, to)) return;
    render();
    document.querySelector('[data-hb-grip="' + CSS.escape(id) + '"]')?.focus();
    notify('Đã chuyển “' + list()[to].name + '” ' + (e.key === 'ArrowUp' ? 'lên trên' : 'xuống dưới') + '.');
  });
  document.addEventListener('pointerdown', (e) => {
    const grip = e.target.closest?.('[data-hb-grip]');
    if (!grip || e.button !== 0) return;
    const row = grip.closest('.hb-row');
    if (!row) return;
    e.preventDefault();
    grip.setPointerCapture?.(e.pointerId);
    const rect = row.getBoundingClientRect();
    drag = { id: grip.dataset.hbGrip, row, rows: habitRows(), from: habitRows().indexOf(row), to: -1, pointerId: e.pointerId, startDocY: e.clientY + window.scrollY, topDoc: rect.top + window.scrollY, h: rect.height, dy: 0, moved: false };
    drag.to = drag.from;
    row.classList.add('is-dragging');
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (e.clientY < 90) window.scrollBy(0, -14);
    else if (e.clientY > innerHeight - 90) window.scrollBy(0, 14);
    drag.dy = e.clientY + window.scrollY - drag.startDocY;
    if (!drag.moved && Math.abs(drag.dy) < 6) return;
    drag.moved = true;
    drag.row.style.transform = 'translateY(' + drag.dy + 'px)';
    const center = drag.topDoc + drag.dy + drag.h / 2;
    const others = drag.rows.filter((r) => r !== drag.row);
    drag.to = others.filter((r) => { const b = r.getBoundingClientRect(); return b.top + window.scrollY + b.height / 2 < center; }).length;
    drag.rows.forEach((r) => r.classList.toggle('is-drop', r === others[drag.to]));
  });
  const endDrag = (e) => {
    if (!drag || (e && e.pointerId !== drag.pointerId)) return;
    const d = drag;
    drag = null;
    d.row.classList.remove('is-dragging');
    d.row.style.transform = '';
    d.rows.forEach((r) => r.classList.remove('is-drop'));
    if (!d.moved || d.to === d.from) return;
    if (moveHabit(d.id, d.to)) {
      render();
      notify('Đã đổi thứ tự việc.');
    }
  };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  // v1.34.0: chuông thông báo (studio-zen.js) đọc số việc đến giờ nhắc qua zenHabits.dueReminders(), hiện như nhắc ghi chú.
  // Bấm một mục trong hộp thoại Thông báo để mở đúng trang việc hằng ngày.
  window.zenHabits.dueReminders = () => dueHabitReminders();
  const habitBellClickBefore = bell.onclick;
  bell.onclick = () => {
    habitBellClickBefore?.();
    const due = dueHabitReminders();
    document.querySelector('#editor-body .notice-list')?.insertAdjacentHTML('afterbegin', due.map((h) => '<button type="button" class="notice-item" data-hb-open="' + esc(h.id) + '"><strong>' + svgIcon('bell') + ' Đến giờ nhắc việc</strong><span>' + esc(h.name) + '</span><small>Nhắc lúc ' + esc(h.remindTime) + ' · Giờ Việt Nam</small><span class="notice-detail-link">Mở việc hằng ngày →</span></button>').join(''));
  };
  // Khi đến giờ nhắc (không đang mở biểu mẫu), trang việc hằng ngày tự hiện khung nhắc.
  setInterval(() => {
    if (!currentUser || document.hidden || view !== 'habits' || $('#editor').open) return;
    if (dueHabitReminders().map((h) => h.id).join() !== dueSig) render();
  }, 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && view === 'habits' && renderedDay && renderedDay !== today()) render();
  });
})();
