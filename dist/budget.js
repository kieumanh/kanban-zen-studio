'use strict';
// v1.70.0: biểu đồ hòa vốn — thu hồi và chi cộng dồn theo thời gian trên cùng một biểu đồ, kèm mốc hòa vốn.
// v1.69.0: nút quay lại khi vào từng dự án (kể cả nút Back của điện thoại), biểu đồ dòng tiền 6 tháng, thanh lãi/lỗ từng dự án, điểm nổi bật, sắp xếp và lọc.
// v1.66.0: "Phân bổ tài nguyên" — theo dõi tiền đầu tư (chi) và tiền thu hồi (thu) của từng dự án để biết dự án đang lãi hay lỗ.
// Dữ liệu: project.ledger = [{id, type:'in'|'out', amount (đồng, số nguyên > 0), category, note, date:'YYYY-MM-DD'}] nằm ngay trong bản ghi dự án,
// nên đồng bộ và gộp ba chiều theo id của từng khoản (hai thiết bị cùng thêm khoản mới vào một dự án vẫn gộp được).
(function () {
  const MAX_ENTRIES = 5000;
  const MAX_AMOUNT = 1e12;
  const PAGE = 20;
  const CATS = {
    out: ['Nhân sự', 'Thiết bị', 'Nguyên vật liệu', 'Quảng cáo', 'Dịch vụ', 'Vận hành', 'Khác'],
    in: ['Doanh thu', 'Hoàn vốn', 'Khác'],
  };
  const BACK_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const PALETTE = ['#7950c8', '#d65380', '#e78c56', '#2e7d5b', '#3a6fb0', '#b0892a', '#8a5a14', '#5d8f9c'];
  const NAMES = { out: 'Chi', in: 'Thu' };
  let scope = 'all';
  let chartKind = 'out';
  let shown = PAGE;
  let sortKey = 'loss';
  let histKind = 'all';
  let overviewScroll = 0;
  let pushed = false;
  let ignorePop = false;
  const SORTS = {
    loss: { label: 'Lỗ nhiều nhất', hint: 'Xếp từ dự án lỗ nhiều nhất lên trước.', cmp: (a, b) => a.t.net - b.t.net || b.t.out - a.t.out },
    gain: { label: 'Lãi nhiều nhất', hint: 'Xếp từ dự án lãi nhiều nhất lên trước.', cmp: (a, b) => b.t.net - a.t.net || b.t.inc - a.t.inc },
    spend: { label: 'Chi nhiều nhất', hint: 'Xếp từ dự án đã chi nhiều nhất lên trước.', cmp: (a, b) => b.t.out - a.t.out || a.t.net - b.t.net },
  };

  Object.assign(iconPaths, { budget: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z M3 7l2-3h11l1 3 M16 13.5h2' });

  // ---- Kiểm tra dữ liệu (cùng quy tắc với máy chủ: server/api.mjs validLedger) ----------------------------------------
  function validLedger(l) {
    if (l === undefined) return true;
    if (!Array.isArray(l) || l.length > MAX_ENTRIES) return false;
    const ids = new Set();
    return l.every(
      (e) =>
        e &&
        typeof e.id === 'string' &&
        /^[A-Za-z0-9_-]{1,99}$/.test(e.id) &&
        !ids.has(e.id) &&
        !!ids.add(e.id) &&
        (e.type === 'in' || e.type === 'out') &&
        Number.isInteger(e.amount) &&
        e.amount > 0 &&
        e.amount <= MAX_AMOUNT &&
        typeof e.category === 'string' &&
        e.category.length <= 40 &&
        typeof e.note === 'string' &&
        e.note.length <= 200 &&
        typeof e.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
        validDate(e.date),
    );
  }
  const validBeforeBudget = valid;
  valid = function (d) {
    return validBeforeBudget(d) && d.projects.every((p) => validLedger(p.ledger));
  };

  // ---- Số liệu -----------------------------------------------------------------------------------------------------
  const entriesOf = (p) => (Array.isArray(p.ledger) ? p.ledger : []);
  const projectsList = () => (typeof visibleProjects === 'function' ? visibleProjects() : data.projects);
  const money = (n) => Math.round(n).toLocaleString('vi-VN') + ' ₫';
  const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + money(Math.abs(n));
  const compact = (n) => {
    const a = Math.abs(n), sign = n < 0 ? '−' : '';
    if (a >= 1e9) return sign + (a / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ ₫';
    return sign + money(a);
  };
  const dateVi = (s) => s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
  function totals(entries) {
    let out = 0, inc = 0;
    for (const e of entries) {
      if (e.type === 'out') out += e.amount;
      else inc += e.amount;
    }
    return { out, inc, net: inc - out, rate: out > 0 ? inc / out : null, count: entries.length };
  }
  // Trạng thái chỉ mô tả số liệu (không khuyên thay người dùng): chưa có số liệu / chưa thu hồi / đang lỗ / hòa vốn / đang lãi.
  function status(t) {
    if (!t.count) return { key: 'none', label: 'Chưa có số liệu' };
    if (t.inc === 0) return { key: 'loss', label: 'Chưa thu hồi' };
    if (t.net > 0) return { key: 'gain', label: 'Đang lãi' };
    if (t.net < 0) return { key: 'loss', label: 'Đang lỗ' };
    return { key: 'even', label: 'Hòa vốn' };
  }
  function byCategory(entries, type) {
    const map = new Map();
    for (const e of entries) if (e.type === type) map.set(e.category || 'Khác', (map.get(e.category || 'Khác') || 0) + e.amount);
    return [...map].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'vi'));
  }
  const pct = (v, total) => (total > 0 ? (v / total) * 100 : 0);
  const pctText = (x) => (x >= 10 || x === 0 ? Math.round(x) : Math.round(x * 10) / 10).toString().replace('.', ',') + '%';
  // Chữ gọn cho chỗ hẹp (nhãn dưới cột, tâm biểu đồ tròn): 104 triệu, −48,5 tr, +12 tỷ.
  const num1 = (x) => x.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  const short = (n) => {
    const a = Math.abs(n), sign = n < 0 ? '−' : n > 0 ? '+' : '';
    if (a >= 1e9) return sign + num1(a / 1e9) + ' tỷ';
    if (a >= 1e6) return sign + num1(a / 1e6) + ' tr';
    if (a >= 1e3) return sign + Math.round(a / 1e3).toLocaleString('vi-VN') + 'k';
    return sign + a;
  };
  const centerText = (n) => (n >= 1e9 ? num1(n / 1e9) + ' tỷ ₫' : n >= 1e6 ? num1(n / 1e6) + ' triệu ₫' : money(n));
  // Sáu tháng gần nhất (tính theo giờ Việt Nam), tháng hiện tại ở cuối.
  function monthSeries(entries, count = 6) {
    const now = today();
    const y = Number(now.slice(0, 4)), m = Number(now.slice(5, 7));
    const rows = [];
    for (let i = count - 1; i >= 0; i--) {
      let mm = m - i, yy = y;
      while (mm < 1) {
        mm += 12;
        yy--;
      }
      rows.push({ key: yy + '-' + String(mm).padStart(2, '0'), month: mm, year: yy, out: 0, inc: 0 });
    }
    const map = new Map(rows.map((r) => [r.key, r]));
    for (const e of entries) {
      const r = map.get(e.date.slice(0, 7));
      if (!r) continue;
      if (e.type === 'out') r.out += e.amount;
      else r.inc += e.amount;
    }
    return rows.map((r) => ({ ...r, net: r.inc - r.out }));
  }
  const select = () => {
    const list = projectsList();
    if (scope !== 'all' && !list.some((p) => p.id === scope)) scope = 'all';
    return scope === 'all' ? null : list.find((p) => p.id === scope);
  };

  // ---- Biểu đồ tròn --------------------------------------------------------------------------------------------------
  function donut(items, total, label) {
    if (!items.length || total <= 0) return '<div class="bg-donut-empty" role="img" aria-label="Chưa có số liệu để vẽ biểu đồ">Chưa có số liệu</div>';
    const R = 40, C = 2 * Math.PI * R;
    let acc = 0;
    const arcs = items
      .map((it, i) => {
        const len = (it.value / total) * C;
        const dash = items.length === 1 ? C : Math.max(len - 1.2, 0.01);
        const html = '<circle class="bg-arc" cx="60" cy="60" r="' + R + '" fill="none" stroke="' + PALETTE[i % PALETTE.length] + '" stroke-width="20" stroke-dasharray="' + dash.toFixed(2) + ' ' + (C - dash).toFixed(2) + '" stroke-dashoffset="' + (-acc).toFixed(2) + '" transform="rotate(-90 60 60)"/>';
        acc += len;
        return html;
      })
      .join('');
    const alt = label + ': ' + items.map((it) => it.name + ' ' + pctText(pct(it.value, total))).join(', ');
    return '<svg class="bg-donut" viewBox="0 0 120 120" role="img" aria-label="' + esc(alt) + '"><circle cx="60" cy="60" r="' + R + '" fill="none" stroke="currentColor" stroke-opacity=".08" stroke-width="20"/>' + arcs + '</svg>';
  }
  function legend(items, total) {
    return '<ul class="bg-legend">' + items.map((it, i) => '<li><i class="bg-swatch" style="--bg-color:' + PALETTE[i % PALETTE.length] + '" aria-hidden="true"></i><span class="bg-legend-name">' + esc(it.name) + '</span><span class="bg-legend-val">' + money(it.value) + '</span><span class="bg-legend-pct">' + pctText(pct(it.value, total)) + '</span></li>').join('') + '</ul>';
  }
  function chartBlock(entries, kind, title) {
    const items = byCategory(entries, kind), total = items.reduce((s, x) => s + x.value, 0);
    return '<div class="bg-chart-body"><div class="bg-donut-wrap">' + donut(items, total, title) + '<div class="bg-donut-center"><small>' + (kind === 'out' ? 'Tổng chi' : 'Tổng thu') + '</small><strong>' + centerText(total) + '</strong></div></div>' + (items.length ? legend(items, total) : '<p class="bg-empty-note">Chưa có khoản ' + (kind === 'out' ? 'chi' : 'thu') + ' nào.</p>') + '</div>';
  }

  // ---- Dòng tiền theo tháng và điểm nổi bật (chỉ mô tả số liệu đã nhập) -------------------------------------------------------
  function trend(entries) {
    const rows = monthSeries(entries);
    if (!rows.some((r) => r.out || r.inc)) return '<p class="bg-empty-note">Chưa có khoản thu chi nào trong 6 tháng gần đây.</p>';
    const max = Math.max(...rows.flatMap((r) => [r.out, r.inc]));
    const h = (v) => (v > 0 ? Math.max(3, (v / max) * 100).toFixed(1) : '0');
    const alt = 'Dòng tiền 6 tháng gần đây: ' + rows.map((r) => 'tháng ' + r.month + '/' + r.year + ' chi ' + money(r.out) + ', thu ' + money(r.inc) + ', ' + (r.net < 0 ? 'lỗ ' : r.net > 0 ? 'lãi ' : 'hòa ') + money(Math.abs(r.net))).join('; ');
    const cols = rows
      .map((r, i) => {
        const empty = !r.out && !r.inc;
        return '<div class="bg-trend-col' + (i === rows.length - 1 ? ' is-now' : '') + '"><span class="bg-trend-bars"><i class="bg-bar is-out" style="height:' + h(r.out) + '%"></i><i class="bg-bar is-in" style="height:' + h(r.inc) + '%"></i></span><small>T' + r.month + '</small><b class="bg-trend-net ' + (empty ? 'is-none' : r.net > 0 ? 'is-gain' : r.net < 0 ? 'is-loss' : 'is-even') + '">' + (empty ? '·' : r.net === 0 ? '0' : short(r.net)) + '</b></div>';
      })
      .join('');
    const span = String(rows[0].month).padStart(2, '0') + '/' + rows[0].year + ' → ' + String(rows[5].month).padStart(2, '0') + '/' + rows[5].year;
    return '<div class="bg-trend" role="img" aria-label="' + esc(alt) + '"><div class="bg-trend-cols" aria-hidden="true">' + cols + '</div><div class="bg-trend-key" aria-hidden="true"><span><i class="bg-swatch is-out"></i>Chi</span><span><i class="bg-swatch is-in"></i>Thu</span><span class="bg-trend-note">Dòng dưới: lãi/lỗ ròng · ' + span + '</span></div></div>';
  }
  function insights(items) {
    const list = items.filter(Boolean);
    return list.length ? '<ul class="bg-insights" aria-label="Điểm nổi bật">' + list.map((i) => '<li><span>' + i.label + '</span><b' + (i.tone ? ' class="is-' + i.tone + '"' : '') + '>' + i.value + '</b>' + (i.sub ? '<small>' + i.sub + '</small>' : '') + '</li>').join('') + '</ul>' : '';
  }
  const thisMonth = (entries) => {
    const r = monthSeries(entries, 1)[0];
    if (!r.out && !r.inc) return { label: 'Tháng này', value: 'Chưa có khoản nào' };
    return { label: 'Tháng này', value: (r.net > 0 ? 'Lãi ' : r.net < 0 ? 'Lỗ ' : 'Hòa vốn') + (r.net ? money(Math.abs(r.net)) : ''), sub: 'Chi ' + money(r.out) + ' · Thu ' + money(r.inc), tone: r.net > 0 ? 'gain' : r.net < 0 ? 'loss' : '' };
  };

  // ---- Biểu đồ hòa vốn: tiền chi và tiền thu hồi cộng dồn theo ngày trên cùng một trục -----------------------------------------
  const dayNum = (s) => Math.floor(Date.parse(s + 'T00:00:00Z') / 86400000);
  const dayStr = (d) => new Date(d * 86400000).toISOString().slice(0, 10);
  function breakEven(entries) {
    if (!entries.length) return '<p class="bg-empty-note">Chưa có khoản thu chi nào để vẽ biểu đồ hòa vốn.</p>';
    const list = entries.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const endD = Math.max(dayNum(today()), dayNum(list[list.length - 1].date));
    let startD = dayNum(list[0].date);
    if (endD - startD < 14) startD = endD - 14; // ít ngày quá thì kéo dài trục để các bước không dồn thành một vạch
    const span = endD - startD;
    let out = 0, inc = 0, since = null;
    const pts = [{ d: startD, out: 0, inc: 0 }];
    for (let i = 0; i < list.length; ) {
      const date = list[i].date;
      while (i < list.length && list[i].date === date) {
        if (list[i].type === 'out') out += list[i].amount;
        else inc += list[i].amount;
        i++;
      }
      pts.push({ d: dayNum(date), out, inc });
      // "Hòa vốn từ" = ngày bắt đầu chuỗi liên tục thu hồi ≥ chi cho tới hiện tại (chi thêm làm tụt lại thì tính lại).
      if (out > 0 && inc >= out) {
        if (!since) since = { date, d: dayNum(date), inc };
      } else since = null;
    }
    pts.push({ d: endD, out, inc });
    // Trần trục dọc làm tròn lên số "đẹp" (1,2 / 1,5 / 2 / 2,5 / 3 / 4 / 5 / 6 / 8 / 10 × lũy thừa 10) để nhãn 0 – giữa – trên dễ đọc.
    const raw = Math.max(out, inc) * 1.04, mag = Math.pow(10, Math.floor(Math.log10(raw))), nrm = raw / mag;
    const max = ([1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((n) => nrm <= n) || 10) * mag;
    const X = (d) => ((d - startD) / span) * 100;
    const Y = (v) => 100 - (v / max) * 100;
    const f = (n) => n.toFixed(2);
    const step = (key) => {
      let d = 'M' + f(X(pts[0].d)) + ' ' + f(Y(pts[0][key]));
      for (let k = 1; k < pts.length; k++) d += ' H' + f(X(pts[k].d)) + ' V' + f(Y(pts[k][key]));
      return d;
    };
    const area = (key) => step(key) + ' V100 H' + f(X(pts[0].d)) + ' Z';
    const loss = inc < out;
    const status = loss
      ? 'Còn thiếu ' + money(out - inc) + ' để hòa vốn · đã thu hồi ' + pctText((inc / out) * 100) + ' số đã chi'
      : 'Đã hòa vốn từ ' + dateVi(since.date) + (inc > out ? ' · đang lãi ' + money(inc - out) : ' · đúng mốc hòa vốn');
    const alt = 'Biểu đồ hòa vốn từ ' + dateVi(dayStr(startD)) + ' đến ' + dateVi(dayStr(endD)) + ': đã chi ' + money(out) + ', đã thu hồi ' + money(inc) + '. ' + status + '.';
    const svg =
      '<svg class="bg-be-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      [0, 50, 100].map((y) => '<line class="bg-be-grid" x1="0" x2="100" y1="' + y + '" y2="' + y + '" vector-effect="non-scaling-stroke"/>').join('') +
      '<path class="bg-be-fill is-in" d="' + area('inc') + '"/>' +
      (loss ? '<line class="bg-be-goal" x1="0" x2="100" y1="' + f(Y(out)) + '" y2="' + f(Y(out)) + '" vector-effect="non-scaling-stroke"/>' : '') +
      '<path class="bg-be-line is-out" d="' + step('out') + '" vector-effect="non-scaling-stroke"/><path class="bg-be-line is-in" d="' + step('inc') + '" vector-effect="non-scaling-stroke"/></svg>';
    const mark = since ? '<i class="bg-be-dot" style="left:' + f(X(since.d)) + '%;top:' + f(Y(since.inc)) + '%" aria-hidden="true"></i>' : '';
    return (
      '<div class="bg-be" role="img" aria-label="' + esc(alt) + '"><div class="bg-be-plot" aria-hidden="true">' + svg + mark + '<span class="bg-be-ylab is-top">' + short(max).replace(/^\+/, '') + '</span><span class="bg-be-ylab is-mid">' + short(max / 2).replace(/^\+/, '') + '</span></div>' +
      '<div class="bg-be-x" aria-hidden="true"><span>' + dateVi(dayStr(startD)) + '</span><span>' + dateVi(dayStr(endD)) + '</span></div>' +
      '<div class="bg-trend-key" aria-hidden="true"><span><i class="bg-swatch is-out"></i>Chi cộng dồn</span><span><i class="bg-swatch is-in"></i>Thu hồi cộng dồn</span>' + (loss ? '<span><i class="bg-be-key-goal"></i>Mốc hòa vốn</span>' : '<span><i class="bg-be-key-dot"></i>Điểm hòa vốn</span>') + '</div>' +
      '<p class="bg-be-status ' + (loss ? 'is-loss' : 'is-gain') + '">' + status + '</p></div>'
    );
  }

  // ---- Giao diện -------------------------------------------------------------------------------------------------------
  function cards(t) {
    const st = status(t);
    return '<div class="bg-cards"><div class="bg-card"><small>Đã chi</small><strong class="bg-out">' + compact(t.out) + '</strong></div><div class="bg-card"><small>Đã thu hồi</small><strong class="bg-in">' + compact(t.inc) + '</strong></div><div class="bg-card bg-card-net is-' + st.key + '"><small>Lãi / lỗ</small><strong>' + (t.count ? compact(t.net).replace(/^(?=\d)/, t.net > 0 ? '+' : '') : '—') + '</strong><span class="bg-badge is-' + st.key + '">' + st.label + '</span></div><div class="bg-card"><small>Thu hồi vốn</small><strong>' + (t.rate === null ? '—' : pctText(t.rate * 100)) + '</strong></div></div>';
  }
  function recoveryBar(t) {
    if (t.rate === null) return '';
    const w = Math.min(100, t.rate * 100);
    return '<div class="bg-recovery" role="img" aria-label="Đã thu hồi ' + pctText(t.rate * 100) + ' số tiền đã chi"><div class="bg-recovery-track"><span style="width:' + w.toFixed(1) + '%"></span></div><small>' + (t.net >= 0 ? 'Đã thu hồi đủ vốn' : 'Còn thiếu ' + money(-t.net) + ' để hòa vốn') + '</small></div>';
  }
  function scopeSelect() {
    const list = projectsList();
    return '<label class="bg-scope"><span>Phạm vi dự án</span><select id="budget-scope" aria-label="Chọn dự án để xem phân bổ tài nguyên"><option value="all"' + (scope === 'all' ? ' selected' : '') + '>Tất cả dự án</option>' + list.map((p) => '<option value="' + esc(p.id) + '"' + (scope === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select></label>';
  }
  function overview() {
    const list = projectsList();
    const rows = list.map((p) => ({ p, t: totals(entriesOf(p)) }));
    const all = totals(rows.flatMap((r) => entriesOf(r.p)));
    if (!list.length) return '<section class="panel bg-empty"><h2>Chưa có dự án</h2><p>Tạo một dự án để bắt đầu ghi chi và thu hồi.</p></section>';
    const spent = rows.filter((r) => r.t.out > 0).map((r) => ({ name: r.p.name, value: r.t.out })).sort((a, b) => b.value - a.value);
    const spentTotal = spent.reduce((s, x) => s + x.value, 0);
    // Dự án chưa có số liệu luôn xếp cuối để không chen giữa các dự án có lãi/lỗ thật.
    const ranked = rows.slice().sort((a, b) => !a.t.count - !b.t.count || SORTS[sortKey].cmp(a, b));
    const withData = rows.filter((r) => r.t.count);
    const worst = withData.filter((r) => r.t.net < 0).sort(SORTS.loss.cmp)[0];
    const best = withData.filter((r) => r.t.net > 0).sort(SORTS.gain.cmp)[0];
    const none = rows.length - withData.length;
    const maxAbs = Math.max(0, ...withData.map((r) => Math.abs(r.t.net)));
    const half = (net, sign) => (maxAbs > 0 && net * sign > 0 ? Math.max(4, (Math.abs(net) / maxAbs) * 100).toFixed(1) : '0');
    const facts = insights([
      worst && { label: 'Lỗ nhiều nhất', value: esc(worst.p.name), sub: money(Math.abs(worst.t.net)), tone: 'loss' },
      best && { label: 'Lãi nhiều nhất', value: esc(best.p.name), sub: money(best.t.net), tone: 'gain' },
      thisMonth(rows.flatMap((r) => entriesOf(r.p))),
      none ? { label: 'Chưa có số liệu', value: none + ' dự án', sub: 'Chọn dự án để ghi khoản đầu tiên' } : null,
    ]);
    return (
      cards(all) +
      recoveryBar(all) +
      facts +
      '<section class="panel bg-panel"><h2>Biểu đồ hòa vốn <small>tất cả dự án</small></h2>' + breakEven(rows.flatMap((r) => entriesOf(r.p))) + '</section>' +
      '<div class="bg-grid"><section class="panel bg-panel"><h2>Dòng tiền theo tháng</h2>' + trend(rows.flatMap((r) => entriesOf(r.p))) + '</section>' +
      '<section class="panel bg-panel"><h2>Chi theo dự án</h2><div class="bg-chart-body"><div class="bg-donut-wrap">' + donut(spent, spentTotal, 'Chi theo dự án') + '<div class="bg-donut-center"><small>Tổng chi</small><strong>' + centerText(spentTotal) + '</strong></div></div>' + (spent.length ? legend(spent, spentTotal) : '<p class="bg-empty-note">Chưa có khoản chi nào ở dự án nào.</p>') + '</div></section></div>' +
      '<section class="panel bg-panel"><div class="bg-chart-head"><h2>Tình trạng từng dự án</h2><div class="bg-seg" role="group" aria-label="Sắp xếp dự án">' + Object.entries(SORTS).map(([key, v]) => '<button type="button" data-bg-sort="' + key + '" aria-pressed="' + (sortKey === key) + '">' + v.label + '</button>').join('') + '</div></div><p class="bg-hint">' + SORTS[sortKey].hint + ' Chọn một dự án để ghi thu, chi và xem chi tiết.</p><ul class="bg-projects">' +
      ranked
        .map(({ p, t }) => {
          const st = status(t);
          return '<li><button type="button" class="bg-project" data-bg-open="' + esc(p.id) + '" style="--bg-proj:' + esc(p.color) + '"><span class="bg-project-name"><i class="bg-dot" aria-hidden="true"></i>' + esc(p.name) + '</span><span class="bg-badge is-' + st.key + '">' + st.label + '</span><span class="bg-project-line"><span>Chi ' + compact(t.out) + '</span><span>Thu ' + compact(t.inc) + '</span>' + (t.rate === null ? '' : '<span>Thu hồi ' + pctText(t.rate * 100) + '</span>') + '<b class="is-' + st.key + '">' + (t.count ? compact(t.net).replace(/^(?=\d)/, t.net > 0 ? '+' : '') : '—') + '</b></span>' + (t.count ? '<span class="bg-net" aria-hidden="true"><span class="bg-net-neg"><i style="width:' + half(t.net, -1) + '%"></i></span><span class="bg-net-pos"><i style="width:' + half(t.net, 1) + '%"></i></span></span>' : '') + '</button></li>';
        })
        .join('') +
      '</ul></section>'
    );
  }
  function history(p) {
    const every = entriesOf(p).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const list = histKind === 'all' ? every : every.filter((e) => e.type === histKind);
    const filter = '<div class="bg-seg" role="group" aria-label="Lọc khoản thu chi">' + [['all', 'Tất cả'], ['out', 'Chi'], ['in', 'Thu']].map(([k, l]) => '<button type="button" data-bg-hist="' + k + '" aria-pressed="' + (histKind === k) + '">' + l + '</button>').join('') + '</div>';
    if (!every.length) return '<section class="panel bg-empty"><h2>Chưa có khoản nào</h2><p>Bấm “+ Chi” khi bỏ tiền vào dự án, “+ Thu” khi thu hồi được tiền.</p></section>';
    const ro = contentReadOnly ? ' disabled' : '';
    const rows = list
      .slice(0, shown)
      .map(
        (e) =>
          '<li class="bg-entry is-' + e.type + '"><span class="bg-entry-kind" aria-label="' + (e.type === 'out' ? 'Khoản chi' : 'Khoản thu') + '">' + NAMES[e.type] + '</span><span class="bg-entry-main"><b>' + esc(e.category || 'Khác') + '</b><small>' + dateVi(e.date) + (e.note ? ' · ' + esc(e.note) : '') + '</small></span><strong class="bg-entry-amount">' + (e.type === 'out' ? '−' : '+') + money(e.amount) + '</strong><span class="bg-entry-actions"><button type="button" class="icon-btn" data-bg-edit="' + esc(e.id) + '" aria-label="Sửa khoản ' + esc(e.category) + ' ' + money(e.amount) + '"' + ro + '>' + svgIcon('edit') + '</button><button type="button" class="icon-btn" data-bg-delete="' + esc(e.id) + '" aria-label="Xóa khoản ' + esc(e.category) + ' ' + money(e.amount) + '"' + ro + '>' + svgIcon('trash') + '</button></span></li>',
      )
      .join('');
    return '<section class="panel bg-panel"><div class="bg-chart-head"><h2>Các khoản gần đây <small>' + list.length + ' khoản</small></h2>' + filter + '</div>' + (list.length ? '<ul class="bg-entries">' + rows + '</ul>' : '<p class="bg-empty-note">Chưa có khoản ' + (histKind === 'out' ? 'chi' : 'thu') + ' nào.</p>') + (list.length > shown ? '<button type="button" class="btn bg-more" data-bg-more>Xem thêm (' + (list.length - shown) + ')</button>' : '') + '</section>';
  }
  function detail(p) {
    const entries = entriesOf(p), t = totals(entries), topOut = byCategory(entries, 'out')[0];
    const ro = contentReadOnly ? ' disabled' : '';
    return (
      '<div class="bg-actions"><button type="button" class="btn primary bg-add-out" data-bg-add="out"' + ro + '>+ Chi</button><button type="button" class="btn bg-add-in" data-bg-add="in"' + ro + '>+ Thu</button></div>' +
      cards(t) +
      recoveryBar(t) +
      insights([
        topOut && { label: 'Hạng mục chi lớn nhất', value: esc(topOut.name), sub: money(topOut.value) + ' · ' + pctText(pct(topOut.value, t.out)) + ' tổng chi' },
        thisMonth(entries),
        t.count ? { label: 'Khoản gần nhất', value: dateVi(entries.map((e) => e.date).sort().at(-1)), sub: t.count + ' khoản tất cả' } : null,
      ]) +
      '<section class="panel bg-panel"><h2>Biểu đồ hòa vốn <small>thu và chi cộng dồn</small></h2>' + breakEven(entries) + '</section>' +
      '<div class="bg-grid"><section class="panel bg-panel"><h2>Dòng tiền theo tháng</h2>' + trend(entries) + '</section>' +
      '<section class="panel bg-panel"><div class="bg-chart-head"><h2>Theo hạng mục</h2><div class="bg-seg" role="group" aria-label="Loại biểu đồ"><button type="button" data-bg-kind="out" aria-pressed="' + (chartKind === 'out') + '">Chi</button><button type="button" data-bg-kind="in" aria-pressed="' + (chartKind === 'in') + '">Thu</button></div></div>' + chartBlock(entries, chartKind, (chartKind === 'out' ? 'Chi' : 'Thu') + ' theo hạng mục') + '</section></div>' +
      history(p) +
      '<button type="button" class="btn bg-back bg-back-bottom" data-bg-back>' + BACK_ICON + 'Quay lại tất cả dự án</button>'
    );
  }
  function page() {
    const p = select();
    const intro = p ? 'Ghi khoản chi (đầu tư) và khoản thu (thu hồi) của dự án này.' : 'Ghi chi và thu hồi cho từng dự án để biết nên tiếp tục hay tạm dừng.';
    const back = p ? '<nav class="bg-nav" aria-label="Điều hướng Phân bổ tài nguyên"><button type="button" class="btn bg-back" data-bg-back aria-label="Quay lại tất cả dự án">' + BACK_ICON + 'Tất cả dự án</button></nav>' : '';
    return '<div class="bg-page">' + back + heading('PHÂN BỔ TÀI NGUYÊN', p ? esc(p.name) : 'Đầu tư theo dự án', intro, p ? '' : '<button type="button" class="btn bg-email-btn" data-bg-email>Báo cáo email hằng tuần</button>') + (contentReadOnly ? '<p class="bg-hint">Bản chia sẻ chỉ có quyền xem: không thêm hoặc sửa được khoản nào.</p>' : '') + scopeSelect() + (p ? detail(p) : overview()) + '</div>';
  }

  // ---- Điều hướng ------------------------------------------------------------------------------------------------------
  function addNav() {
    const nav = document.querySelector('.sidebar [data-view="budget"]');
    if (nav) nav.classList.toggle('active', view === 'budget');
  }
  const baseRender = render;
  render = function () {
    baseRender();
    addNav();
    if (view !== 'budget') {
      // Rời trang khi đang ở trong một dự án: bỏ mục lịch sử đã thêm để nút Back không còn "bước chết".
      if (pushed) {
        pushed = false;
        ignorePop = true;
        setTimeout(() => (ignorePop = false), 800);
        try {
          window.history.back();
        } catch {}
        restoreScrollMode();
      }
      // Quay lại mục này từ nơi khác thì luôn bắt đầu ở tổng quan.
      scope = 'all';
      shown = PAGE;
      histKind = 'all';
      return;
    }
    $('#crumb').textContent = 'Phân bổ tài nguyên';
    $('#main').innerHTML = page();
  };

  // ---- Biểu mẫu thu / chi ----------------------------------------------------------------------------------------------
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const grouped = (s) => digits(s).replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  function categoryChips(p, type) {
    const used = byCategory(entriesOf(p), type).map((x) => x.name);
    const list = [...new Set([...used, ...CATS[type]])].slice(0, 8);
    return list.map((c) => '<button type="button" class="bg-cat-chip" data-bg-cat="' + esc(c) + '">' + esc(c) + '</button>').join('');
  }
  function openForm(type, entryId) {
    const p = select();
    if (!p || contentReadOnly) return;
    const entry = entryId ? entriesOf(p).find((e) => e.id === entryId) : null;
    if (entryId && !entry) return;
    type = entry ? entry.type : type;
    modal(
      '<h2 id="bg-form-title">' + (entry ? 'Sửa khoản ' + (type === 'out' ? 'chi' : 'thu') : 'Thêm khoản ' + (type === 'out' ? 'chi' : 'thu')) + '</h2><p class="bg-form-project"><i class="bg-dot" style="--bg-proj:' + esc(p.color) + '" aria-hidden="true"></i>' + esc(p.name) + '</p>' +
        '<div class="bg-form"><fieldset class="bg-type"><legend>Loại khoản</legend><label class="bg-type-opt is-out"><input type="radio" name="type" value="out"' + (type === 'out' ? ' checked' : '') + '><span>Chi · đầu tư</span></label><label class="bg-type-opt is-in"><input type="radio" name="type" value="in"' + (type === 'in' ? ' checked' : '') + '><span>Thu · thu hồi</span></label></fieldset>' +
        '<label class="field">Số tiền (₫)<input name="amount" inputmode="numeric" autocomplete="off" required placeholder="0" value="' + (entry ? grouped(String(entry.amount)) : '') + '" aria-describedby="bg-amount-hint"></label><small id="bg-amount-hint" class="bg-hint" role="status"></small>' +
        '<label class="field">Hạng mục<input name="category" maxlength="40" required autocomplete="off" placeholder="Ví dụ: Thiết bị" value="' + esc(entry ? entry.category : '') + '"></label><div class="bg-cat-chips" id="bg-cat-chips" role="group" aria-label="Gợi ý hạng mục">' + categoryChips(p, type) + '</div>' +
        '<label class="field">Ngày<input type="date" name="date" required value="' + esc(entry ? entry.date : today()) + '"></label>' +
        '<label class="field">Ghi chú<input name="note" maxlength="200" autocomplete="off" placeholder="Không bắt buộc" value="' + esc(entry ? entry.note : '') + '"></label></div>',
      (fd) => {
        const kind = fd.get('type') === 'in' ? 'in' : 'out';
        const amount = parseInt(digits(fd.get('amount')) || '0', 10);
        const category = String(fd.get('category') || '').trim().slice(0, 40);
        const date = String(fd.get('date') || '');
        const note = String(fd.get('note') || '').trim().slice(0, 200);
        if (!(amount > 0)) return notify('Số tiền cần là số lớn hơn 0.');
        if (amount > MAX_AMOUNT) return notify('Số tiền quá lớn.');
        if (!category) return notify('Hãy nhập hạng mục.');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !validDate(date)) return notify('Ngày chưa đúng.');
        const ok = wfSave(() => {
          const target = project(p.id);
          if (!target) throw Error('Dự án không còn tồn tại.');
          const list = Array.isArray(target.ledger) ? target.ledger.slice() : [];
          if (entry) {
            const i = list.findIndex((e) => e.id === entry.id);
            if (i < 0) throw Error('Khoản này không còn tồn tại.');
            list[i] = { id: entry.id, type: kind, amount, category, note, date };
          } else {
            if (list.length >= MAX_ENTRIES) throw Error('Dự án đã đủ ' + MAX_ENTRIES + ' khoản. Hãy xóa bớt khoản cũ.');
            list.push({ id: uid(), type: kind, amount, category, note, date });
          }
          target.ledger = list;
        });
        if (!ok) return;
        chartKind = kind;
        $('#editor').close();
        render();
        notify(entry ? 'Đã cập nhật khoản.' : kind === 'out' ? 'Đã ghi khoản chi.' : 'Đã ghi khoản thu.');
      },
    );
    const eyebrow = document.querySelector('#modal-eyebrow');
    if (eyebrow) eyebrow.textContent = 'PHÂN BỔ TÀI NGUYÊN';
    const form = document.querySelector('#editor-body .bg-form');
    const amountInput = form.querySelector('[name=amount]');
    const hint = document.querySelector('#bg-amount-hint');
    const paintHint = () => {
      const n = parseInt(digits(amountInput.value) || '0', 10);
      hint.textContent = n > 0 ? '= ' + money(n) : '';
    };
    amountInput.addEventListener('input', () => {
      const pos = amountInput.value;
      amountInput.value = grouped(pos);
      paintHint();
    });
    form.querySelectorAll('[name=type]').forEach((r) =>
      r.addEventListener('change', () => {
        document.querySelector('#bg-cat-chips').innerHTML = categoryChips(p, r.value);
        document.querySelector('#bg-form-title').textContent = (entry ? 'Sửa khoản ' : 'Thêm khoản ') + (r.value === 'out' ? 'chi' : 'thu');
      }),
    );
    paintHint();
    (entry ? form.querySelector('[name=amount]') : amountInput).focus();
  }
  function confirmDelete(id) {
    const p = select();
    const e = p && entriesOf(p).find((x) => x.id === id);
    if (!e) return;
    modal(
      '<div class="bg-confirm"><h2>Xóa khoản ' + (e.type === 'out' ? 'chi' : 'thu') + '?</h2><p>' + esc(e.category) + ' · ' + money(e.amount) + ' · ' + dateVi(e.date) + ' sẽ bị xóa vĩnh viễn khỏi “' + esc(p.name) + '”. Thao tác này không hoàn tác được.</p><div class="bg-confirm-actions"><button type="button" class="btn" data-bg-cancel>Giữ lại</button><button type="button" class="btn bg-confirm-delete" data-bg-confirm-delete="' + esc(e.id) + '">Xóa khoản</button></div></div>',
      null,
      true,
    );
    const eyebrow = document.querySelector('#modal-eyebrow');
    if (eyebrow) eyebrow.textContent = 'PHÂN BỔ TÀI NGUYÊN';
    document.querySelector('[data-bg-cancel]')?.focus();
  }

  // ---- Vào / ra từng dự án: nút quay lại, nút Back của điện thoại, giữ vị trí cuộn ------------------------------------------
  function openProject(id) {
    if (scope === 'all') {
      overviewScroll = window.scrollY;
      try {
        // Tự giữ vị trí cuộn của tổng quan; không để trình duyệt cuộn lại lúc quay về (dễ nhảy sai vị trí).
        window.history.scrollRestoration = 'manual';
        window.history.pushState({ zenBudget: 1 }, '');
        pushed = true;
      } catch {}
    }
    scope = id;
    shown = PAGE;
    histKind = 'all';
    render();
    window.scrollTo({ top: 0, left: 0 });
  }
  const restoreScrollMode = () => setTimeout(() => {
    try {
      if (!pushed) window.history.scrollRestoration = 'auto';
    } catch {}
  }, 1200);
  function showOverview() {
    restoreScrollMode();
    const from = scope;
    scope = 'all';
    shown = PAGE;
    render();
    window.scrollTo({ top: overviewScroll, left: 0 });
    // Trả tiêu điểm về đúng dự án vừa rời để người dùng bàn phím / đọc màn hình không phải tìm lại.
    [...document.querySelectorAll('.bg-project[data-bg-open]')].find((b) => b.dataset.bgOpen === from)?.focus({ preventScroll: true });
  }
  function backToOverview() {
    if (!pushed) return showOverview();
    pushed = false;
    ignorePop = true;
    setTimeout(() => (ignorePop = false), 800);
    try {
      window.history.back();
    } catch {}
    showOverview();
  }
  window.addEventListener('popstate', () => {
    if (ignorePop) return (ignorePop = false);
    if (!pushed) return;
    pushed = false;
    if (view === 'budget' && scope !== 'all') showOverview();
  });

  document.addEventListener('click', (event) => {
    // Bấm lại mục "Phân bổ tài nguyên" ở menu khi đang trong một dự án: về tổng quan.
    if (event.target.closest('[data-view="budget"]') && view === 'budget' && scope !== 'all') return backToOverview();
    const t = event.target.closest('[data-bg-back],[data-bg-sort],[data-bg-hist],[data-bg-add],[data-bg-edit],[data-bg-delete],[data-bg-confirm-delete],[data-bg-cancel],[data-bg-kind],[data-bg-more],[data-bg-open],[data-bg-cat]');
    if (!t) return;
    if (t.dataset.bgBack !== undefined) return backToOverview();
    if (t.dataset.bgSort) {
      sortKey = SORTS[t.dataset.bgSort] ? t.dataset.bgSort : 'loss';
      return render();
    }
    if (t.dataset.bgHist) {
      histKind = ['out', 'in'].includes(t.dataset.bgHist) ? t.dataset.bgHist : 'all';
      shown = PAGE;
      return render();
    }
    if (t.dataset.bgAdd) return openForm(t.dataset.bgAdd);
    if (t.dataset.bgEdit) return openForm(null, t.dataset.bgEdit);
    if (t.dataset.bgDelete) return confirmDelete(t.dataset.bgDelete);
    if (t.dataset.bgCancel !== undefined) return $('#editor').close();
    if (t.dataset.bgConfirmDelete) {
      const p = select();
      if (!p) return;
      const id = t.dataset.bgConfirmDelete;
      const ok = wfSave(() => {
        const target = project(p.id);
        if (!target) throw Error('Dự án không còn tồn tại.');
        target.ledger = entriesOf(target).filter((e) => e.id !== id);
      });
      if (!ok) return;
      $('#editor').close();
      render();
      return notify('Đã xóa khoản.');
    }
    if (t.dataset.bgKind) {
      chartKind = t.dataset.bgKind === 'in' ? 'in' : 'out';
      return render();
    }
    if (t.dataset.bgMore !== undefined) {
      shown += PAGE;
      return render();
    }
    if (t.dataset.bgOpen) return openProject(t.dataset.bgOpen);
    if (t.dataset.bgCat) {
      const input = document.querySelector('#editor-body [name=category]');
      if (input) {
        input.value = t.dataset.bgCat;
        input.focus();
      }
    }
  });
  document.addEventListener('change', (event) => {
    if (event.target.id !== 'budget-scope') return;
    const next = event.target.value || 'all';
    if (next === 'all') backToOverview();
    else if (scope === 'all') openProject(next);
    else {
      scope = next;
      shown = PAGE;
      histKind = 'all';
      render();
      window.scrollTo({ top: 0, left: 0 });
    }
    document.querySelector('#budget-scope')?.focus({ preventScroll: true });
  });
})();
