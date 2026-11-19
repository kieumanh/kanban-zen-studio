'use strict';
// v2.64.0 (Báo Cáo Liên Hoàn): báo cáo đính kèm ở cuối trang Liên hoàn lệnh (dist/worklist.js): số liệu theo khoảng 7 / 14 / 30 ngày,
// biểu đồ cột “ghi vào và hoàn thành theo ngày”, thanh ngang “việc còn trong chuỗi theo dự án”, cột “tuổi của việc còn trong chuỗi”,
// kèm bảng số liệu cho trình đọc màn hình. Chỉ đọc: dữ liệu lấy từ worklist.items (ngày ghi a, ngày gỡ x) và doneAt của chính việc
// (weekly-review.js ghi khi việc sang cột Hoàn thành); không ghi thêm trường nào, không migration, không gọi máy chủ.
// Việc xong trước khi có doneAt không có ngày xong: vẫn tính vào “đã xong” chung nhưng không vào biểu đồ theo ngày (có ghi chú).
(() => {
  const PERIODS = [7, 14, 30];
  const BUCKETS = [
    { label: '0–2 ngày', min: 0, max: 2 },
    { label: '3–7 ngày', min: 3, max: 7 },
    { label: '8–14 ngày', min: 8, max: 14 },
    { label: '15 ngày trở lên', min: 15, max: Infinity },
  ];
  const PROJECT_ROWS = 8;
  let period = 14;

  const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const plus = (day, n) => new Date(Date.parse(day + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const between = (from, to) => Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000);
  // Số ngày từ a đến b, không âm; ngày hỏng coi như 0 (dữ liệu hợp lệ không bao giờ vào đây với ngày hỏng).
  const gap = (a, b) => (isDay(a) && isDay(b) ? Math.max(0, between(a, b)) : 0);
  const short = (day) => day.slice(8, 10) + '/' + day.slice(5, 7);
  const num = (n) => String(n).replace('.', ',');
  const esc_ = (s) => (typeof esc === 'function' ? esc(s) : String(s));

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
        if (!isDay(r.t.doneAt)) undated++;
        else if (inRange(r.t.doneAt)) {
          done++;
          perDay.get(r.t.doneAt).done++;
          waits.push(gap(r.e.a, r.t.doneAt));
        }
      }
      if (state === 'open') open.push({ ...r, age: gap(r.e.a, day) });
    }
    const closed = done + dropped;
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
  function dayChart(s) {
    const peak = Math.max(1, ...[...s.perDay.values()].flatMap((v) => [v.added, v.done])),
      top = niceTop(peak),
      step = s.n <= 7 ? 1 : s.n <= 14 ? 2 : 6;
    const cols = s.days
      .map((d) => {
        const v = s.perDay.get(d),
          bar = (cls, n) => (n ? '<i class="wlr-bar ' + cls + '" style="height:' + (n / top) * 100 + '%"></i>' : '');
        return '<div class="wlr-day" title="' + short(d) + ' · Ghi vào ' + v.added + ' · Đã xong ' + v.done + '">' + bar('wlr-added', v.added) + bar('wlr-done', v.done) + '</div>';
      })
      .join('');
    const labels = s.days.map((d, i) => '<span' + ((s.n - 1 - i) % step === 0 ? '>' + short(d) : ' aria-hidden="true">') + '</span>').join('');
    const mid = top % 2 === 0 ? '<span style="bottom:50%">' + top / 2 + '</span>' : '';
    return (
      '<div class="wlr-chart" style="--n:' + s.n + '"><div class="wlr-y" aria-hidden="true"><span style="bottom:100%">' + top + '</span>' + mid + '<span style="bottom:0">0</span></div>' +
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
    const dayRows = s.days.map((d) => '<tr><th scope="row">' + short(d) + '</th><td>' + s.perDay.get(d).added + '</td><td>' + s.perDay.get(d).done + '</td></tr>').join('');
    const projRows = s.projects.map((p) => '<tr><th scope="row">' + esc_(p.name) + '</th><td>' + p.n + '</td></tr>').join('') || '<tr><td colspan="2">Chuỗi đang trống.</td></tr>';
    const ageRows = BUCKETS.map((b, i) => '<tr><th scope="row">' + b.label + '</th><td>' + s.ages[i] + '</td></tr>').join('');
    return (
      '<details class="wlr-tables"><summary>Xem dạng bảng</summary>' +
      '<table><caption>Theo ngày (' + s.n + ' ngày gần nhất)</caption><thead><tr><th scope="col">Ngày</th><th scope="col">Ghi vào chuỗi</th><th scope="col">Đã xong</th></tr></thead><tbody>' + dayRows + '</tbody></table>' +
      '<table><caption>Việc còn trong chuỗi theo dự án</caption><thead><tr><th scope="col">Dự án</th><th scope="col">Số việc</th></tr></thead><tbody>' + projRows + '</tbody></table>' +
      '<table><caption>Tuổi của việc còn trong chuỗi</caption><thead><tr><th scope="col">Đã ở trong chuỗi</th><th scope="col">Số việc</th></tr></thead><tbody>' + ageRows + '</tbody></table></details>'
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
    const chips =
      '<div class="wlr-periods" role="group" aria-label="Khoảng thời gian">' +
      PERIODS.map((n) => '<button type="button" class="gr-chip wlr-chip' + (n === period ? ' is-on' : '') + '" data-wlr-period="' + n + '" aria-pressed="' + (n === period) + '">' + n + ' ngày</button>').join('') +
      '</div>';
    const span = 'trong ' + s.n + ' ngày qua';
    const quiet = s.added + s.done === 0 ? '<p class="subtext wlr-quiet">Chưa có việc nào ghi vào hay xong ' + span + '.</p>' : '';
    const oldest = s.oldest
      ? '<p class="wlr-oldest">Việc nằm lâu nhất trong chuỗi: <strong>' + esc_(s.oldest.t.title) + '</strong> · ' + (s.oldest.age ? s.oldest.age + ' ngày' : 'mới ghi hôm nay') + ' (' + esc_(s.oldest.p.name) + ').</p>'
      : '<p class="wlr-oldest">Chuỗi đang trống, không có việc nào nằm chờ.</p>';
    const note = s.undated
      ? '<p class="help-copy">Có ' + s.undated + ' việc đã xong nhưng không rõ ngày xong (hoàn thành từ trước khi ứng dụng ghi ngày xong), nên không nằm trong biểu đồ theo ngày.</p>'
      : '';
    return (
      head(chips) +
      '<ul class="wlr-kpis" aria-label="Số liệu chính">' +
      tile('Ghi vào chuỗi', s.added, span) +
      tile('Đã xong', s.done, span) +
      tile('Tỉ lệ xong', s.rate === null ? '—' : s.rate + '%', 'xong / (xong + gỡ), ' + span) +
      tile('Từ ghi đến xong', s.avgWait === null ? '—' : num(s.avgWait) + ' ngày', 'trung bình mỗi việc') +
      '</ul>' + oldest +
      '<section class="wlr-card" aria-label="Theo ngày"><h3>Ghi vào và hoàn thành theo ngày</h3><p class="wlr-legend"><span class="wlr-key wlr-key-added"></span>Ghi vào chuỗi <b>' + s.added + '</b><span class="wlr-key wlr-key-done"></span>Đã xong <b>' + s.done + '</b></p>' + quiet + dayChart(s) + note + '</section>' +
      '<div class="wlr-two"><section class="wlr-card" aria-label="Theo dự án"><h3>Việc còn trong chuỗi theo dự án</h3>' + projectRows(s) + '</section>' +
      '<section class="wlr-card" aria-label="Tuổi"><h3>Tuổi của việc còn trong chuỗi</h3>' + ageChart(s) + '</section></div>' +
      tables(s) + '</section>'
    );
  }

  document.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-wlr-period]');
    if (chip) {
      period = Number(chip.dataset.wlrPeriod) || 14;
      const old = document.querySelector('#wl-report');
      if (old) {
        old.outerHTML = panel();
        document.querySelector('[data-wlr-period="' + period + '"]')?.focus();
      }
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

  window.zenWorklistReport = { panel, stats, periods: PERIODS, buckets: BUCKETS };
})();
