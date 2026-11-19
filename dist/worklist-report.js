'use strict';
// v2.64.0 (Báo Cáo Liên Hoàn): báo cáo đính kèm ở cuối trang Liên hoàn lệnh (dist/worklist.js): số liệu theo khoảng 7 / 14 / 30 ngày,
// biểu đồ cột “ghi vào và hoàn thành theo ngày”, thanh ngang “việc còn trong chuỗi theo dự án”, cột “tuổi của việc còn trong chuỗi”,
// kèm bảng số liệu cho trình đọc màn hình. Chỉ đọc: dữ liệu lấy từ worklist.items (ngày ghi a, ngày gỡ x) và doneAt của chính việc
// (weekly-review.js ghi khi việc sang cột Hoàn thành). Báo cáo tự nó chỉ đọc; chỉ khung “Bổ sung ngày xong” (v2.65.0) mới ghi, và chỉ khi người dùng bấm Lưu.
// Việc xong trước khi có doneAt không có ngày xong: không vào biểu đồ theo ngày (có ghi chú riêng).
// v2.65.0 (Chiến Báo Hoàn Thiện): sửa hai hạn chế của v2.64.0. (1) Khoảng ngày: thêm 60 / 90 ngày và ô nhập số ngày tùy ý (1–180), lựa chọn được nhớ trên thiết bị
// (localStorage “zen-wlr-period”, chỉ là tiện ích riêng của máy, không đi lên máy chủ); khoảng dài hơn 30 ngày thì biểu đồ gộp theo tuần cho dễ đọc.
// (2) Việc xong chưa rõ ngày: ghi chú có thêm khung “Bổ sung ngày xong”, người dùng tự chọn ngày cho từng việc; chỉ khi bấm Lưu mới ghi trường tùy chọn doneAt
// (đã hợp lệ ở máy chủ), không tự đoán, không ghi hàng loạt, không đổi việc nào khác. Không migration.
(() => {
  const PERIODS = [7, 14, 30, 60, 90];
  const MIN_DAYS = 1;
  const MAX_DAYS = 180;
  const DEFAULT_DAYS = 14;
  const WEEKLY_OVER = 30; // khoảng dài hơn mức này thì gộp cột theo tuần
  const STORE_KEY = 'zen-wlr-period';
  const BUCKETS = [
    { label: '0–2 ngày', min: 0, max: 2 },
    { label: '3–7 ngày', min: 3, max: 7 },
    { label: '8–14 ngày', min: 8, max: 14 },
    { label: '15 ngày trở lên', min: 15, max: Infinity },
  ];
  const PROJECT_ROWS = 8;
  // Khoảng ngày hợp lệ: số nguyên MIN_DAYS…MAX_DAYS; không thì null. Ô nhập làm tròn, nên 7.4 → 7.
  const validDays = (v) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= MIN_DAYS && n <= MAX_DAYS ? n : null;
  };
  // Nhớ lựa chọn trên thiết bị: kho trình duyệt có thể trống hoặc ném lỗi (cửa sổ riêng tư, chặn dữ liệu) nên lúc nào cũng có đường lùi.
  function loadPeriod() {
    try {
      return validDays(localStorage.getItem(STORE_KEY)) || DEFAULT_DAYS;
    } catch {
      return DEFAULT_DAYS;
    }
  }
  function savePeriod(n) {
    try {
      localStorage.setItem(STORE_KEY, String(n));
    } catch {
      /* không nhớ được thì lần sau về mặc định, không ảnh hưởng báo cáo */
    }
  }
  let period = loadPeriod();
  const readOnly = () => typeof contentReadOnly !== 'undefined' && contentReadOnly;

  const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const plus = (day, n) => new Date(Date.parse(day + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const between = (from, to) => Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000);
  // Số ngày từ a đến b, không âm; ngày hỏng coi như 0 (dữ liệu hợp lệ không bao giờ vào đây với ngày hỏng).
  const gap = (a, b) => (isDay(a) && isDay(b) ? Math.max(0, between(a, b)) : 0);
  const short = (day) => day.slice(8, 10) + '/' + day.slice(5, 7);
  const num = (n) => String(n).replace('.', ',');
  const esc_ = (s) => (typeof esc === 'function' ? esc(s) : String(s));

  function weeks(days, perDay) {
    const out = [];
    for (let end = days.length - 1; end >= 0; end -= 7) {
      const start = Math.max(0, end - 6);
      let added = 0,
        done = 0;
      for (let i = start; i <= end; i++) {
        added += perDay.get(days[i]).added;
        done += perDay.get(days[i]).done;
      }
      out.unshift({ from: days[start], to: days[end], added, done });
    }
    return out;
  }

  // ---- Số liệu ----------------------------------------------------------------------------------------------------------------
  // Mỗi dòng của chuỗi có một trạng thái: drop (đã gỡ), done (việc ở cột Hoàn thành), open (đang trong chuỗi), gone (việc đã xóa hay đã lưu trữ: không tính là đang chờ,
  // cùng quy tắc với danh sách trong trang; lần ghi vào chuỗi trước đó vẫn tính ở “ghi vào”).
  function stats(n, rows, day) {
    const days = Array.from({ length: n }, (_, i) => plus(day, i - (n - 1))),
      from = days[0],
      inRange = (d) => isDay(d) && d >= from && d <= day;
    const perDay = new Map(days.map((d) => [d, { added: 0, done: 0 }]));
    const waits = [];
    const open = [];
    const undatedRows = [];
    let added = 0,
      done = 0,
      dropped = 0,
      undated = 0;
    for (const r of rows) {
      const state = r.e.x ? 'drop' : !r.t ? 'gone' : r.t.col === 'Done' ? 'done' : r.t.archived || (r.p && r.p.archived) ? 'gone' : 'open';
      if (inRange(r.e.a)) {
        added++;
        perDay.get(r.e.a).added++;
      }
      if (state === 'drop' && inRange(r.e.x)) dropped++;
      if (state === 'done') {
        if (!isDay(r.t.doneAt)) {
          undated++;
          undatedRows.push(r);
        } else if (inRange(r.t.doneAt)) {
          done++;
          perDay.get(r.t.doneAt).done++;
          waits.push(gap(r.e.a, r.t.doneAt));
        }
      }
      if (state === 'open') open.push({ ...r, age: gap(r.e.a, day) });
    }
    const closed = done + dropped;
    // Khoảng dài thì gộp theo tuần (từ hôm nay lùi, cột đầu có thể ngắn hơn bảy ngày) để cột không mảnh như sợi tóc; số liệu tổng vẫn tính theo ngày.
    const weekly = n > WEEKLY_OVER;
    const series = weekly ? weeks(days, perDay) : days.map((d) => ({ from: d, to: d, added: perDay.get(d).added, done: perDay.get(d).done }));
    const byProject = new Map();
    for (const r of open) {
      const g = byProject.get(r.p.id) || { name: r.p.name, color: r.p.color, n: 0 };
      g.n++;
      byProject.set(r.p.id, g);
    }
    const projects = [...byProject.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'vi'));
    const oldest = open.reduce((m, r) => (!m || r.age > m.age ? r : m), null);
    return {
      n,
      days,
      perDay,
      added,
      done,
      dropped,
      undated,
      undatedRows,
      weekly,
      series,
      rate: closed ? Math.round((done / closed) * 100) : null,
      avgWait: waits.length ? Math.round((waits.reduce((a, b) => a + b, 0) / waits.length) * 10) / 10 : null,
      projects,
      open: open.length,
      oldest,
      ages: BUCKETS.map((b) => open.filter((r) => r.age >= b.min && r.age <= b.max).length),
    };
  }
  // Mốc trên cùng của trục dọc: số nguyên đẹp, đủ chứa giá trị lớn nhất.
  const niceTop = (m) => (m <= 1 ? 1 : m <= 2 ? 2 : m <= 4 ? 4 : m <= 6 ? 6 : m <= 10 ? 10 : Math.ceil(m / 5) * 5);

  // ---- Vẽ ---------------------------------------------------------------------------------------------------------------------
  const tile = (label, value, sub) => '<li><span class="wlr-label">' + label + '</span><b>' + value + '</b><small>' + sub + '</small></li>';
  const range = (b) => (b.from === b.to ? short(b.from) : short(b.from) + '–' + short(b.to));
  function dayChart(s) {
    const peak = Math.max(1, ...s.series.flatMap((v) => [v.added, v.done])),
      top = niceTop(peak),
      count = s.series.length,
      step = s.weekly ? Math.ceil(count / 7) : s.n <= 7 ? 1 : s.n <= 14 ? 2 : 6;
    const cols = s.series
      .map((b) => {
        const bar = (cls, n) => (n ? '<i class="wlr-bar ' + cls + '" style="height:' + (n / top) * 100 + '%"></i>' : '');
        return '<div class="wlr-day" title="' + range(b) + ' · Ghi vào ' + b.added + ' · Đã xong ' + b.done + '">' + bar('wlr-added', b.added) + bar('wlr-done', b.done) + '</div>';
      })
      .join('');
    const labels = s.series.map((b, i) => '<span' + ((count - 1 - i) % step === 0 ? '>' + short(b.from) : ' aria-hidden="true">') + '</span>').join('');
    const mid = top % 2 === 0 ? '<span style="bottom:50%">' + top / 2 + '</span>' : '';
    return (
      '<div class="wlr-chart' + (s.weekly ? ' is-weekly' : '') + '" style="--n:' + count + '"><div class="wlr-y" aria-hidden="true"><span style="bottom:100%">' + top + '</span>' + mid + '<span style="bottom:0">0</span></div>' +
      '<div class="wlr-plot" role="img" aria-label="Biểu đồ cột ' + s.n + ' ngày: ghi vào ' + s.added + ', đã xong ' + s.done + '. Xem bảng số liệu bên dưới."><i class="wlr-gl" style="bottom:50%"></i><i class="wlr-gl" style="bottom:100%"></i>' + cols + '</div>' +
      '<div class="wlr-x" aria-hidden="true">' + labels + '</div></div>'
    );
  }
  function projectRows(s) {
    if (!s.projects.length) return '<p class="subtext">Chuỗi đang trống.</p>';
    const top = Math.max(...s.projects.map((p) => p.n)),
      shown = s.projects.slice(0, PROJECT_ROWS),
      rest = s.projects.slice(PROJECT_ROWS).reduce((a, p) => a + p.n, 0);
    return (
      '<ul class="wlr-rank">' +
      shown.map((p) => '<li><span class="wlr-name">' + esc_(p.name) + '</span><span class="wlr-track"><i style="width:' + (p.n / top) * 100 + '%;background:' + esc_(p.color) + '"></i></span><b>' + p.n + '</b></li>').join('') +
      (rest ? '<li class="wlr-rest"><span class="wlr-name">Còn ' + (s.projects.length - PROJECT_ROWS) + ' dự án khác</span><span></span><b>' + rest + '</b></li>' : '') +
      '</ul>'
    );
  }
  function ageChart(s) {
    const top = Math.max(1, ...s.ages);
    return (
      '<div class="wlr-ages" role="img" aria-label="Tuổi của việc còn trong chuỗi: ' + BUCKETS.map((b, i) => b.label + ' ' + s.ages[i]).join(', ') + '">' +
      BUCKETS.map((b, i) => '<div class="wlr-age" data-step="' + i + '"><b>' + s.ages[i] + '</b><span class="wlr-age-bar"><i style="height:' + (s.ages[i] / top) * 100 + '%"></i></span><small>' + b.label + '</small></div>').join('') +
      '</div>'
    );
  }
  function tables(s) {
    const dayRows = s.series.map((b) => '<tr><th scope="row">' + range(b) + '</th><td>' + b.added + '</td><td>' + b.done + '</td></tr>').join('');
    const unit = s.weekly ? 'tuần' : 'ngày';
    const projRows = s.projects.map((p) => '<tr><th scope="row">' + esc_(p.name) + '</th><td>' + p.n + '</td></tr>').join('') || '<tr><td colspan="2">Chuỗi đang trống.</td></tr>';
    const ageRows = BUCKETS.map((b, i) => '<tr><th scope="row">' + b.label + '</th><td>' + s.ages[i] + '</td></tr>').join('');
    return (
      '<details class="wlr-tables"><summary>Xem dạng bảng</summary>' +
      '<table><caption>Theo ' + unit + ' (' + s.n + ' ngày gần nhất)</caption><thead><tr><th scope="col">' + (s.weekly ? 'Tuần' : 'Ngày') + '</th><th scope="col">Ghi vào chuỗi</th><th scope="col">Đã xong</th></tr></thead><tbody>' + dayRows + '</tbody></table>' +
      '<table><caption>Việc còn trong chuỗi theo dự án</caption><thead><tr><th scope="col">Dự án</th><th scope="col">Số việc</th></tr></thead><tbody>' + projRows + '</tbody></table>' +
      '<table><caption>Tuổi của việc còn trong chuỗi</caption><thead><tr><th scope="col">Đã ở trong chuỗi</th><th scope="col">Số việc</th></tr></thead><tbody>' + ageRows + '</tbody></table></details>'
    );
  }
  // Ghi chú việc xong chưa rõ ngày + khung bổ sung ngày. Chỉ ghi khi người dùng bấm Lưu từng việc; chế độ chỉ đọc thì chỉ có ghi chú.
  let fixOpen = false;
  function undatedNote(s) {
    const text =
      '<p class="help-copy">Có ' + s.undated + ' việc đã xong nhưng không rõ ngày xong (hoàn thành từ trước khi ứng dụng ghi ngày xong), nên không nằm trong biểu đồ theo ngày.</p>';
    if (readOnly()) return text;
    const t0 = today();
    const items = s.undatedRows
      .map(
        (r) =>
          '<li class="wlr-fixrow"><span class="wlr-fixname" id="wlr-fix-' + esc_(r.t.id) + '"><span class="wlr-fixtitle">' + esc_(r.t.title) + '</span><small>' + esc_(r.p.name) + '</small></span>' +
          '<label class="wlr-custom"><span>Ngày xong</span><input type="date" data-wlr-fix-date="' + esc_(r.t.id) + '" value="' + t0 + '" max="' + t0 + '" aria-describedby="wlr-fix-' + esc_(r.t.id) + '"></label>' +
          '<button type="button" class="btn wlr-fixbtn" data-wlr-fix="' + esc_(r.t.id) + '">Lưu ngày</button></li>',
      )
      .join('');
    return (
      text +
      '<details class="wlr-fix"' + (fixOpen ? ' open' : '') + '><summary>Bổ sung ngày xong</summary>' +
      '<p class="help-copy wlr-fixhint">Chọn ngày thật sự xong rồi bấm Lưu ngày cho từng việc. Ứng dụng không tự đoán ngày.</p><ul class="wlr-fixlist">' + items + '</ul></details>'
    );
  }
  function panel() {
    const wl = window.zenWorklist;
    if (!wl) return '';
    const rows = wl.all(),
      head = (extra) => '<section class="panel wl-report" id="wl-report" aria-label="Báo cáo ' + wl.name + '"><div class="wlr-head"><h2>Báo cáo ' + wl.name + '</h2>' + extra + '</div>';
    if (!rows.length)
      return head('') + '<p class="subtext">Chưa có số liệu. Báo cáo sẽ hiện ngay khi bạn ghi việc đầu tiên vào chuỗi.</p></section>';
    const s = stats(period, rows, today());
    const custom =
      '<label class="wlr-custom"><span>Số ngày khác</span><input type="number" class="wlr-days" data-wlr-custom min="' + MIN_DAYS + '" max="' + MAX_DAYS + '" step="1" inputmode="numeric" value="' + period + '" aria-describedby="wlr-days-hint"></label>' +
      '<span class="wlr-hint" id="wlr-days-hint">Nhập số ngày từ ' + MIN_DAYS + ' đến ' + MAX_DAYS + '.</span>';
    const chips =
      '<div class="wlr-periods" role="group" aria-label="Khoảng thời gian">' +
      PERIODS.map((n) => '<button type="button" class="gr-chip wlr-chip' + (n === period ? ' is-on' : '') + '" data-wlr-period="' + n + '" aria-pressed="' + (n === period) + '">' + n + ' ngày</button>').join('') +
      custom +
      '</div>';
    const span = 'trong ' + s.n + ' ngày qua';
    const quiet = s.added + s.done === 0 ? '<p class="subtext wlr-quiet">Chưa có việc nào ghi vào hay xong ' + span + '.</p>' : '';
    const oldest = s.oldest
      ? '<p class="wlr-oldest">Việc nằm lâu nhất trong chuỗi: <strong>' + esc_(s.oldest.t.title) + '</strong> · ' + (s.oldest.age ? s.oldest.age + ' ngày' : 'mới ghi hôm nay') + ' (' + esc_(s.oldest.p.name) + ').</p>'
      : '<p class="wlr-oldest">Chuỗi đang trống, không có việc nào nằm chờ.</p>';
    const note = s.undated ? undatedNote(s) : '';
    return (
      head(chips) +
      '<ul class="wlr-kpis" aria-label="Số liệu chính">' +
      tile('Ghi vào chuỗi', s.added, span) +
      tile('Đã xong', s.done, s.undated ? span + ' · chưa tính ' + s.undated + ' việc chưa rõ ngày xong' : span) +
      tile('Tỉ lệ xong', s.rate === null ? '—' : s.rate + '%', 'xong / (xong + gỡ), ' + span) +
      tile('Từ ghi đến xong', s.avgWait === null ? '—' : num(s.avgWait) + ' ngày', 'trung bình mỗi việc') +
      '</ul>' + oldest +
      '<section class="wlr-card" aria-label="Theo ' + (s.weekly ? 'tuần' : 'ngày') + '"><h3>Ghi vào và hoàn thành theo ' + (s.weekly ? 'tuần' : 'ngày') + '</h3><p class="wlr-legend"><span class="wlr-key wlr-key-added"></span>Ghi vào chuỗi <b>' + s.added + '</b><span class="wlr-key wlr-key-done"></span>Đã xong <b>' + s.done + '</b></p>' + quiet + dayChart(s) + note + '</section>' +
      '<div class="wlr-two"><section class="wlr-card" aria-label="Theo dự án"><h3>Việc còn trong chuỗi theo dự án</h3>' + projectRows(s) + '</section>' +
      '<section class="wlr-card" aria-label="Tuổi"><h3>Tuổi của việc còn trong chuỗi</h3>' + ageChart(s) + '</section></div>' +
      tables(s) + '</section>'
    );
  }

  function repaint(focusSel) {
    const old = document.querySelector('#wl-report');
    if (!old) return;
    old.outerHTML = panel();
    const el = focusSel && document.querySelector(focusSel);
    if (!el) return;
    if (el.tagName === 'H2') el.setAttribute('tabindex', '-1'); // tiêu đề không tự nhận tiêu điểm nếu thiếu tabindex
    el.focus({ preventScroll: el.tagName === 'H2' });
  }
  function choose(n) {
    period = n;
    savePeriod(n);
    repaint(PERIODS.includes(n) ? '[data-wlr-period="' + n + '"]' : '[data-wlr-custom]');
  }
  // Bổ sung ngày xong cho một việc: chỉ ghi doneAt của đúng việc đó, ngày hợp lệ và không sau hôm nay; lưu không được thì trả lại như cũ.
  function saveFix(id) {
    const input = [...document.querySelectorAll('[data-wlr-fix-date]')].find((el) => el.dataset.wlrFixDate === id);
    const hit = window.zenWorklist && window.zenWorklist.all().find((r) => r.t && r.t.id === id);
    if (!input || !hit || hit.t.col !== 'Done' || isDay(hit.t.doneAt) || readOnly()) return;
    const day = input.value;
    if (!isDay(day) || day > today()) {
      notify('Hãy chọn một ngày không sau hôm nay.');
      input.focus();
      return;
    }
    hit.t.doneAt = day;
    if (save() === false) {
      delete hit.t.doneAt;
      notify('Chưa lưu được ngày xong. Hãy thử lại.');
      return;
    }
    fixOpen = true;
    repaint(window.zenWorklist.all().some((r) => r.t && r.t.col === 'Done' && !isDay(r.t.doneAt)) ? '.wlr-fix summary' : '#wl-report h2');
  }

  document.addEventListener('change', (e) => {
    const box = e.target.closest && e.target.closest('[data-wlr-custom]');
    if (!box) return;
    const n = validDays(box.value);
    if (n === null) {
      box.value = period; // trống hoặc ngoài 1–180: giữ khoảng đang chọn
      return;
    }
    choose(n);
  });
  document.addEventListener('toggle', (e) => {
    if (e.target.matches && e.target.matches('#wl-report details.wlr-fix')) fixOpen = e.target.open;
  }, true);
  document.addEventListener('click', (e) => {
    const fix = e.target.closest('[data-wlr-fix]');
    if (fix) {
      saveFix(fix.dataset.wlrFix);
      return;
    }
    const chip = e.target.closest('[data-wlr-period]');
    if (chip) {
      choose(validDays(chip.dataset.wlrPeriod) || DEFAULT_DAYS);
      return;
    }
    if (e.target.closest('[data-wlr-jump]')) {
      const box = document.querySelector('#wl-report');
      if (box) {
        box.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        box.querySelector('h2')?.setAttribute('tabindex', '-1');
        box.querySelector('h2')?.focus({ preventScroll: true });
      }
    }
  });

  window.zenWorklistReport = { panel, stats, periods: PERIODS, buckets: BUCKETS, limits: { min: MIN_DAYS, max: MAX_DAYS, weeklyOver: WEEKLY_OVER } };
})();
