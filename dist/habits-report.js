'use strict';
// v1.21.0: báo cáo Việc hằng ngày — chỉ số, biểu đồ (SVG/HTML thuần), đánh giá và đề xuất cải thiện tính từ dữ liệu tích.
(function () {
  const Z = () => window.zenHabits;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const e = (s) => Z().esc(s);
  const dowOf = (d) => (Z().toDate(d).getUTCDay() + 6) % 7;

  function span(n, back) {
    const end = Z().addDays(Z().today(), -(back || 0));
    return Array.from({ length: n }, (_, i) => Z().addDays(end, -(n - 1 - i)));
  }
  function dayStat(hs, d) {
    let tr = 0, dn = 0;
    for (const h of hs) if (d >= h.createdAt) { tr++; if (h.done.includes(d)) dn++; }
    return { d, tr, dn, rate: tr ? dn / tr : null };
  }
  // v1.22.0: tỷ lệ theo mục tiêu tuần, cùng quy tắc với thanh tiến độ: mỗi việc đóng góp tối đa `goal` lượt mỗi tuần.
  // Biểu đồ theo ngày (perDay) vẫn dùng dayStat để thể hiện nhịp từng ngày.
  function weeksOf(days) {
    return [...new Set(days.map((d) => Z().mondayOf(d)))].sort();
  }
  function weekly(hs, days) {
    const weeks = weeksOf(days);
    const perHabit = hs.map((h) => {
      let tr = 0, dn = 0;
      for (const mon of weeks) {
        const sun = Z().addDays(mon, 6);
        if (h.createdAt > sun) continue;
        const g = Z().goalOf(h);
        const n = h.done.filter((d) => d >= mon && d <= sun).length;
        tr += g;
        dn += Math.min(n, g);
      }
      return { h, tr, dn, rate: tr ? dn / tr : null };
    });
    const tr = perHabit.reduce((s, x) => s + x.tr, 0), dn = perHabit.reduce((s, x) => s + x.dn, 0);
    return { tr, dn, rate: tr ? dn / tr : null, perHabit };
  }
  function period(hs, days) {
    const perDay = days.map((d) => dayStat(hs, d));
    const wk = weekly(hs, days);
    return { perDay, tr: wk.tr, dn: wk.dn, rate: wk.rate, perHabit: wk.perHabit };
  }
  function longest(h) {
    let best = 0, run = 0, prev = null;
    for (const d of [...h.done].sort()) {
      run = prev && Z().addDays(prev, 1) === d ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    }
    return best;
  }
  function idle(h) {
    const last = [...h.done].sort().pop();
    if (!last) return null;
    return Math.round((Z().toDate(Z().today()) - Z().toDate(last)) / 864e5);
  }
  function stats(n) {
    const hs = Z().list(), days = span(n), cur = period(hs, days), prev = period(hs, span(n, n));
    const perHabit = cur.perHabit.map((x) => ({ ...x, streak: Z().streak(x.h), best: longest(x.h), idle: idle(x.h) }));
    const wd = Array.from({ length: 7 }, () => ({ tr: 0, dn: 0 }));
    for (const p of cur.perDay) { const i = dowOf(p.d); wd[i].tr += p.tr; wd[i].dn += p.dn; }
    return { n, hs, days, cur, prev, perHabit, wd, allDone: hs.reduce((s, h) => s + h.done.length, 0) };
  }

  // ---- Đánh giá và đề xuất (quy tắc rõ ràng, giọng nâng đỡ) ----
  function analyze(s) {
    const rate = s.cur.rate, r = rate === null ? 0 : Math.round(rate * 100);
    const out = { level: null, summary: '', findings: [], tips: [] };
    if (!s.hs.length || s.cur.tr === 0 || s.allDone === 0) {
      out.level = { key: 'empty', label: 'Chưa đủ dữ liệu' };
      out.summary = !s.hs.length ? 'Bạn chưa có việc hằng ngày nào.' : 'Chưa có lượt tích nào để đánh giá.';
      out.tips.push(!s.hs.length ? 'Thêm một việc thật nhỏ (ví dụ 2 phút mỗi ngày) rồi quay lại xem báo cáo sau vài ngày.' : 'Hãy tích vài ngày liên tiếp, báo cáo sẽ hiện nhận xét và đề xuất phù hợp với bạn.');
      return out;
    }
    out.level = r >= 85 ? { key: 'excellent', label: 'Xuất sắc' } : r >= 70 ? { key: 'good', label: 'Tốt' } : r >= 50 ? { key: 'forming', label: 'Đang hình thành' } : { key: 'low', label: 'Cần nâng đỡ' };
    out.summary = 'Trong ' + s.n + ' ngày qua bạn hoàn thành ' + r + '% (' + s.cur.dn + '/' + s.cur.tr + ' lượt theo mục tiêu tuần).';
    if (s.prev.tr > 0) {
      const delta = r - Math.round(s.prev.rate * 100);
      if (delta >= 5) out.findings.push({ tone: 'good', text: 'Tăng ' + delta + ' điểm phần trăm so với ' + s.n + ' ngày trước đó. Bạn đang đi đúng hướng.' });
      else if (delta <= -5) out.findings.push({ tone: 'warn', text: 'Giảm ' + Math.abs(delta) + ' điểm phần trăm so với ' + s.n + ' ngày trước đó.' });
      else out.findings.push({ tone: 'info', text: 'Nhịp độ ổn định so với ' + s.n + ' ngày trước đó.' });
    }
    const rated = s.perHabit.filter((x) => x.tr >= 3).sort((a, b) => b.rate - a.rate);
    const strong = rated[0], weak = rated[rated.length - 1];
    if (strong) out.findings.push({ tone: 'good', text: '“' + strong.h.name + '” là việc bạn giữ tốt nhất (' + Math.round(strong.rate * 100) + '%).' });
    if (weak && strong && weak !== strong && strong.rate - weak.rate >= 0.15) out.findings.push({ tone: 'warn', text: '“' + weak.h.name + '” còn thấp nhất (' + Math.round(weak.rate * 100) + '%).' });
    const wdRated = s.wd.map((x, i) => ({ i, tr: x.tr, rate: x.tr ? x.dn / x.tr : null })).filter((x) => x.tr >= 3);
    wdRated.sort((a, b) => a.rate - b.rate);
    const worstDay = wdRated[0], bestDay = wdRated[wdRated.length - 1];
    if (worstDay && bestDay && bestDay.rate - worstDay.rate >= 0.2) {
      out.findings.push({ tone: 'info', text: Z().LONG[bestDay.i] + ' là ngày bạn làm tốt nhất (' + Math.round(bestDay.rate * 100) + '%), ' + Z().LONG[worstDay.i] + ' dễ bỏ lỡ nhất (' + Math.round(worstDay.rate * 100) + '%).' });
    }
    const topStreak = [...s.perHabit].sort((a, b) => b.streak - a.streak)[0];
    if (topStreak && topStreak.streak >= 7) out.findings.push({ tone: 'good', text: 'Chuỗi ' + topStreak.streak + ' ngày liên tiếp của “' + topStreak.h.name + '” rất đáng quý.' });
    const stale = s.perHabit.filter((x) => x.idle !== null && x.idle >= 3 && x.tr > 0).sort((a, b) => b.idle - a.idle)[0];
    if (stale) out.findings.push({ tone: 'warn', text: '“' + stale.h.name + '” đã ' + stale.idle + ' ngày chưa được tích.' });

    // Đề xuất cải thiện.
    if (weak && strong && weak !== strong && strong.rate - weak.rate >= 0.15) {
      out.tips.push('Thu nhỏ “' + weak.h.name + '” thành phiên bản 2 phút để dễ bắt đầu, rồi tăng dần khi đã đều.');
      out.tips.push('Gắn “' + weak.h.name + '” ngay sau “' + strong.h.name + '”, vì bạn đã giữ “' + strong.h.name + '” rất ổn định.');
    }
    if (worstDay && bestDay && bestDay.rate - worstDay.rate >= 0.2) out.tips.push('Chuẩn bị trước cho ' + Z().LONG[worstDay.i] + ': đặt nhắc, hoặc tạm giảm bớt việc vào ngày này.');
    if (s.hs.length >= 7 && r < 60) out.tips.push('Bạn đang theo dõi ' + s.hs.length + ' việc. Thử giữ 3–5 việc cốt lõi trong vài tuần, vững rồi hãy thêm.');
    if (stale) out.tips.push('Áp dụng quy tắc “không bỏ hai ngày liên tiếp”: hôm nay chỉ cần tích bản nhỏ nhất của “' + stale.h.name + '”.');
    if (r >= 85) out.tips.push('Bạn đã rất đều. Có thể nâng nhẹ thử thách: tăng thời lượng khoảng 10% hoặc thêm một việc nhỏ mới.');
    else if (r < 50) out.tips.push('Chọn một việc dễ nhất và chỉ tập trung vào nó trong 7 ngày tới, rồi mở rộng dần.');
    for (const g of ['Mỗi cuối tuần xem lại báo cáo này 2 phút, chọn một điều nhỏ để điều chỉnh cho tuần sau.', 'Ghi lại một dòng lý do bạn duy trì được, để dùng làm điểm tựa khi chững lại.', 'Đặt mỗi việc vào một khung giờ cố định trong ngày để nó thành nhịp quen thuộc.']) if (out.tips.length < 3) out.tips.push(g);
    out.tips = out.tips.slice(0, 5);
    return out;
  }

  // ---- Biểu đồ ----
  function trend(s) {
    const W = 640, H = 200, L = 36, R = 10, T = 12, B = 26, w = W - L - R, h = H - T - B, n = s.days.length;
    const x = (i) => L + (n === 1 ? w / 2 : (i * w) / (n - 1)), y = (r) => T + (1 - r) * h;
    const segs = [];
    let cur = [];
    s.cur.perDay.forEach((p, i) => { if (p.rate === null) { if (cur.length) segs.push(cur); cur = []; } else cur.push([x(i), y(p.rate)]); });
    if (cur.length) segs.push(cur);
    if (!segs.length) return '<p class="subtext">Chưa đủ dữ liệu để vẽ biểu đồ.</p>';
    const line = segs.map((g) => 'M' + g.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L')).join(' ');
    const area = segs.map((g) => 'M' + g[0][0].toFixed(1) + ' ' + (T + h) + ' L' + g.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' L' + g[g.length - 1][0].toFixed(1) + ' ' + (T + h) + ' Z').join(' ');
    const grid = [0, 0.5, 1].map((v) => '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="hb-grid-line"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="hb-axis">' + v * 100 + '%</text>').join('');
    const labels = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '" class="hb-axis">' + Z().short(s.days[i]) + '</text>').join('');
    const last = segs[segs.length - 1].slice(-1)[0];
    const hover = s.cur.perDay.map((p, i) => '<rect x="' + (x(i) - w / n / 2).toFixed(1) + '" y="' + T + '" width="' + (w / n).toFixed(1) + '" height="' + h + '" fill="transparent"><title>' + Z().short(p.d) + ': ' + (p.tr ? Math.round(p.rate * 100) + '% (' + p.dn + '/' + p.tr + ')' : 'chưa có việc') + '</title></rect>').join('');
    return '<svg class="hb-trend" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Biểu đồ đường: tỷ lệ hoàn thành mỗi ngày trong ' + n + ' ngày qua, hiện tại ' + Math.round((s.cur.perDay.filter((p) => p.rate !== null).slice(-1)[0] || { rate: 0 }).rate * 100) + '%"><defs><linearGradient id="hb-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--brand-purple);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--brand-purple);stop-opacity:0"/></linearGradient></defs>' + grid + '<path d="' + area + '" fill="url(#hb-grad)" class="hb-area"/><path d="' + line + '" class="hb-line" pathLength="1" fill="none"/><circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4.5" class="hb-dot"/>' + labels + hover + '</svg>';
  }
  function habitBars(s) {
    return '<ul class="hb-hbars">' + s.perHabit.map((x, i) => '<li style="--hb:' + e(x.h.color) + ';--i:' + i + '"><div class="hb-hbar-head"><span class="hb-hbar-name"><span aria-hidden="true">' + e(x.h.icon || '✳') + '</span>' + e(x.h.name) + '</span><strong>' + (x.tr ? Math.round(x.rate * 100) + '%' : '—') + '</strong></div><div class="hb-hbar-track" role="img" aria-label="' + e(x.h.name) + ': ' + (x.tr ? x.dn + '/' + x.tr + ' lượt' : 'chưa có dữ liệu') + '"><span style="width:' + (x.tr ? Math.round(x.rate * 100) : 0) + '%"></span></div><small>' + x.dn + '/' + x.tr + ' lượt · chuỗi ' + x.streak + ' · dài nhất ' + x.best + '</small></li>').join('') + '</ul>';
  }
  function weekdays(s) {
    const rates = s.wd.map((x) => (x.tr ? x.dn / x.tr : null)), valid = rates.filter((v) => v !== null);
    const max = Math.max(...valid), min = Math.min(...valid);
    return '<div class="hb-wd" role="img" aria-label="Tỷ lệ hoàn thành theo thứ trong tuần">' + rates.map((v, i) => '<div class="hb-wd-col' + (v !== null && valid.length > 1 && v === max ? ' is-best' : '') + (v !== null && valid.length > 1 && v === min && min !== max ? ' is-worst' : '') + '" style="--i:' + i + '"><span class="hb-wd-val">' + (v === null ? '—' : Math.round(v * 100) + '%') + '</span><div class="hb-wd-bar"><span style="height:' + (v === null ? 0 : Math.round(v * 100)) + '%"></span></div><b>' + Z().SHORT[i] + '</b></div>').join('') + '</div>';
  }
  function heat(hs) {
    const t = Z().today(), start = Z().addDays(Z().mondayOf(t), -12 * 7), cells = [];
    for (let c = 0; c < 13; c++) for (let r = 0; r < 7; r++) {
      const d = Z().addDays(start, c * 7 + r);
      if (d > t) { cells.push('<i class="hb-cell-h is-future" aria-hidden="true"></i>'); continue; }
      const p = dayStat(hs, d), lv = p.tr === 0 ? 0 : p.rate === 1 ? 4 : p.rate >= 0.67 ? 3 : p.rate >= 0.34 ? 2 : p.rate > 0 ? 1 : 0;
      cells.push('<i class="hb-cell-h lv' + lv + (p.tr === 0 ? ' is-none' : '') + '" style="--c:' + c + '" title="' + Z().short(d) + ': ' + (p.tr ? Math.round(p.rate * 100) + '% (' + p.dn + '/' + p.tr + ')' : 'chưa có việc') + '"></i>');
    }
    return '<div class="hb-heat-wrap"><div class="hb-heat-days" aria-hidden="true">' + Z().SHORT.map((x, i) => '<span>' + (i % 2 === 0 ? x : '') + '</span>').join('') + '</div><div class="hb-heat" role="img" aria-label="Bản đồ nhiệt 13 tuần gần nhất: màu càng đậm càng hoàn thành nhiều">' + cells.join('') + '</div></div><div class="hb-legend" aria-hidden="true"><span>Ít</span><i class="hb-cell-h lv0"></i><i class="hb-cell-h lv1"></i><i class="hb-cell-h lv2"></i><i class="hb-cell-h lv3"></i><i class="hb-cell-h lv4"></i><span>Nhiều</span></div>';
  }
  function kpis(s) {
    const r = s.cur.rate === null ? null : Math.round(s.cur.rate * 100);
    let delta = '';
    if (r !== null && s.prev.tr > 0) {
      const d = r - Math.round(s.prev.rate * 100);
      delta = '<span class="hb-delta ' + (d > 0 ? 'up' : d < 0 ? 'down' : 'flat') + '">' + (d > 0 ? '▲ +' + d : d < 0 ? '▼ ' + d : '＝ 0') + ' điểm</span>';
    }
    const cur = [...s.perHabit].sort((a, b) => b.streak - a.streak)[0], best = [...s.perHabit].sort((a, b) => b.best - a.best)[0];
    const card = (label, value, sub, i) => '<div class="hb-kpi" style="--i:' + i + '"><span>' + label + '</span><strong>' + value + '</strong><small>' + sub + '</small></div>';
    return '<div class="hb-kpis">' + card('Tỷ lệ hoàn thành', r === null ? '—' : r + '%', delta || 'Chưa có kỳ trước để so sánh', 0) + card('Lượt đã tích', s.cur.dn + '/' + s.cur.tr, 'trong ' + s.n + ' ngày qua', 1) + card('Chuỗi hiện tại', (cur ? cur.streak : 0) + ' ngày', cur && cur.streak ? e(cur.h.name) : 'Hãy tích hôm nay để bắt đầu', 2) + card('Chuỗi dài nhất', (best ? best.best : 0) + ' ngày', best && best.best ? e(best.h.name) : 'Chưa có chuỗi', 3) + '</div>';
  }
  function assess(s) {
    const a = analyze(s);
    return '<section class="hb-card hb-assess is-' + a.level.key + '" aria-labelledby="hb-assess-title"><div class="hb-assess-head"><span class="hb-level" data-level="' + a.level.key + '">' + a.level.label + '</span><h3 id="hb-assess-title">Đánh giá</h3></div><p class="hb-assess-sum">' + e(a.summary) + '</p>' + (a.findings.length ? '<ul class="hb-findings">' + a.findings.map((f) => '<li class="' + f.tone + '"><span aria-hidden="true">' + (f.tone === 'good' ? '✓' : f.tone === 'warn' ? '!' : 'i') + '</span>' + e(f.text) + '</li>').join('') + '</ul>' : '') + '<h4 class="hb-tips-title">Đề xuất cải thiện</h4><ol class="hb-tips">' + a.tips.map((t) => '<li>' + e(t) + '</li>').join('') + '</ol><p class="hb-assess-note">Nhận xét tự động, tính từ dữ liệu tích của bạn.</p></section>';
  }
  function html(range) {
    const hs = Z().list();
    if (!hs.length) return '<div class="hb-empty"><span class="hb-empty-mark" aria-hidden="true">📊</span><h2>Chưa có dữ liệu để báo cáo</h2><p class="subtext">Hãy thêm vài việc hằng ngày và tích trong vài ngày, báo cáo sẽ xuất hiện ở đây.</p></div>';
    const s = stats(range), t = Z().today(), from = s.days[0];
    const seg = [7, 30, 90].map((n) => '<button type="button" role="radio" class="hb-seg-btn' + (n === range ? ' is-on' : '') + '" aria-checked="' + (n === range) + '" data-hb-range="' + n + '">' + n + ' ngày</button>').join('');
    return '<div class="hb-report" data-hb-report><div class="hb-report-bar"><div class="hb-seg" role="radiogroup" aria-label="Khoảng thời gian báo cáo">' + seg + '</div><span class="hb-report-note">Từ ' + Z().short(from) + ' đến ' + Z().short(t) + '</span></div>' + kpis(s) + assess(s) +
      '<section class="hb-card"><h3>Xu hướng hoàn thành mỗi ngày</h3>' + trend(s) + '</section>' +
      '<div class="hb-two"><section class="hb-card"><h3>Theo từng việc</h3>' + habitBars(s) + '</section><section class="hb-card"><h3>Theo thứ trong tuần</h3>' + weekdays(s) + '</section></div>' +
      '<section class="hb-card"><h3>Bản đồ nhiệt 13 tuần</h3>' + heat(hs) + '</section></div>';
  }
  window.zenHabitsReport = { html, stats, analyze };
})();
