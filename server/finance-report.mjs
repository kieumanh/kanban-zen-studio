// v1.67.0: báo cáo thu chi tài chính hằng tuần theo dự án (email + bản xem trước). Tổng hợp xác định từ sổ thu chi
// project.ledger của "Phân bổ tài nguyên"; không có suy luận ngoài và không khuyên thay người dùng.
import { reportEscape, reportBar, REPORT_STYLE, shiftDay } from './reports.mjs';

// Cài đặt nằm trong dữ liệu người dùng (workspace.financeReport): không thêm bảng hay cột nào vào cơ sở dữ liệu.
// Thiếu cài đặt = tắt; ngày 0 = Chủ nhật … 6 = Thứ bảy; giờ theo giờ Việt Nam.
export const FINANCE_DEFAULTS = { enabled: false, day: 0, hour: 9 };
export function validFinanceSettings(v) {
  if (v === undefined) return true;
  return (
    !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.keys(v).every((k) => ['enabled', 'day', 'hour'].includes(k)) &&
    typeof v.enabled === 'boolean' &&
    Number.isInteger(v.day) &&
    v.day >= 0 &&
    v.day <= 6 &&
    Number.isInteger(v.hour) &&
    v.hour >= 0 &&
    v.hour <= 23
  );
}

const financeOneLine = (s) =>
  String(s || '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
const financeGroup = (n) =>
  String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const financeMoney = (n) => (n < 0 ? '−' : '') + financeGroup(n) + ' ₫';
const financeSigned = (n) => (n > 0 ? '+' : '') + financeMoney(n);
const financeCompact = (n) =>
  Math.abs(n) >= 1e9
    ? (n < 0 ? '−' : '') +
      (Math.round((Math.abs(n) / 1e9) * 100) / 100)
        .toString()
        .replace('.', ',') +
      ' tỷ ₫'
    : financeMoney(n);
const financePercent = (x) =>
  (x >= 10 || x === 0 ? Math.round(x) : Math.round(x * 10) / 10)
    .toString()
    .replace('.', ',') + '%';
const financeDate = (d) => d.split('-').reverse().join('/');

export function financeEntries(project) {
  return (Array.isArray(project.ledger) ? project.ledger : []).filter(
    (e) =>
      e &&
      (e.type === 'in' || e.type === 'out') &&
      Number.isFinite(e.amount) &&
      e.amount > 0 &&
      typeof e.date === 'string',
  );
}
export function financeTotals(entries) {
  let out = 0,
    inc = 0;
  for (const e of entries) {
    if (e.type === 'out') out += e.amount;
    else inc += e.amount;
  }
  return {
    out,
    inc,
    net: inc - out,
    rate: out > 0 ? inc / out : null,
    count: entries.length,
  };
}
// Trạng thái chỉ mô tả số liệu, cùng quy tắc với trang Phân bổ tài nguyên (dist/budget.js).
export function financeStatus(t) {
  if (!t.count) return { key: 'none', label: 'Chưa có số liệu' };
  if (t.inc === 0) return { key: 'loss', label: 'Chưa thu hồi' };
  if (t.net > 0) return { key: 'gain', label: 'Đang lãi' };
  if (t.net < 0) return { key: 'loss', label: 'Đang lỗ' };
  return { key: 'even', label: 'Hòa vốn' };
}
const STATUS_COLORS = {
  gain: ['#1f6b4a', '#e6f6ed'],
  loss: ['#a43464', '#fdebf2'],
  even: ['#5b3587', '#f1e8f8'],
  none: ['#6a6073', '#f2eef5'],
};
const netColor = (net) =>
  net > 0 ? '#1f6b4a' : net < 0 ? '#a43464' : '#5b3587';
const PALETTE = [
  '#7950c8',
  '#d65380',
  '#e78c56',
  '#2e7d5b',
  '#3a6fb0',
  '#b0892a',
  '#8a5a14',
  '#5d8f9c',
];
const safeColor = (c, i) =>
  /^#[a-f\d]{6}$/i.test(c || '') ? c : PALETTE[i % PALETTE.length];
function financeCategories(entries, type) {
  const map = new Map();
  for (const e of entries)
    if (e.type === type) {
      const name = financeOneLine(e.category) || 'Khác';
      map.set(name, (map.get(name) || 0) + e.amount);
    }
  return [...map]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'vi'));
}

export function financeReport(workspace, day, { shared = false } = {}) {
  const from = shiftDay(day, -6),
    prevFrom = shiftDay(day, -13),
    prevTo = shiftDay(day, -7),
    inWindow = (e, a, b) => e.date >= a && e.date <= b;
  const all = [],
    week = [],
    prev = [];
  const projects = (workspace.projects || [])
    .filter((p) => !p.archived)
    .map((p, i) => {
      const entries = financeEntries(p),
        t = financeTotals(entries),
        w = entries.filter((e) => inWindow(e, from, day));
      all.push(...entries);
      week.push(...w);
      prev.push(...entries.filter((e) => inWindow(e, prevFrom, prevTo)));
      return {
        id: p.id,
        name: financeOneLine(p.name),
        color: safeColor(p.color, i),
        ...t,
        status: financeStatus(t),
        week: financeTotals(w),
        categories: financeCategories(entries, 'out')
          .slice(0, 3)
          .map((c) => ({ ...c, pct: t.out ? (c.value / t.out) * 100 : 0 })),
      };
    });
  // Dự án lỗ nhiều nhất lên đầu; dự án chưa có số liệu xuống cuối.
  const withData = projects
    .filter((p) => p.count)
    .sort((a, b) => a.net - b.net || a.name.localeCompare(b.name, 'vi'));
  const without = projects.filter((p) => !p.count);
  const total = financeTotals(all),
    weekTotal = financeTotals(week),
    prevTotal = financeTotals(prev);
  const summary = {
    from,
    to: day,
    hasData: total.count > 0,
    total,
    status: financeStatus(total),
    week: weekTotal,
    prevWeek: prevTotal,
    projects: withData,
    empty: without.map((p) => p.name),
  };
  const lines = [
    `BỨC TRANH THU CHI · ${from} → ${day}`,
    `${withData.length} dự án có số liệu · ${total.count} khoản thu chi`,
    `Đã chi: ${financeMoney(total.out)} · Đã thu hồi: ${financeMoney(total.inc)} · Lãi/Lỗ: ${financeSigned(total.net)}${total.rate === null ? '' : ' · Thu hồi: ' + financePercent(total.rate * 100)}`,
    `Tuần này: chi ${financeMoney(weekTotal.out)} · thu ${financeMoney(weekTotal.inc)} · ròng ${financeSigned(weekTotal.net)} (tuần trước: chi ${financeMoney(prevTotal.out)} · thu ${financeMoney(prevTotal.inc)})`,
    '',
  ];
  for (const p of withData) {
    lines.push(
      `◆ ${p.name} · ${p.status.label}`,
      `Đã chi ${financeMoney(p.out)} · Đã thu hồi ${financeMoney(p.inc)} · Lãi/Lỗ ${financeSigned(p.net)}${p.rate === null ? '' : ' · Thu hồi ' + financePercent(p.rate * 100)}`,
      `Tuần này: chi ${financeMoney(p.week.out)} · thu ${financeMoney(p.week.inc)}`,
    );
    if (p.categories.length)
      lines.push(
        'Hạng mục chi lớn nhất: ' +
          p.categories
            .map((c) => `${c.name} ${financePercent(c.pct)}`)
            .join(' · '),
      );
    lines.push('');
  }
  if (without.length)
    lines.push('Chưa có số liệu: ' + without.map((p) => p.name).join(', '), '');
  lines.push(
    'Báo cáo chỉ tổng hợp số liệu bạn đã nhập trong Phân bổ tài nguyên; việc tiếp tục hay tạm dừng dự án vẫn do bạn quyết định.',
  );
  const report = {
    subject: 'Tổng kết tuần · Thu chi dự án · ' + day,
    text: lines.join('\n'),
    summary,
    hasData: summary.hasData,
  };
  report.html = financeReportHTML(report, shared);
  return report;
}

function financeBadge(status) {
  const [color, background] = STATUS_COLORS[status.key];
  return `<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:${background};color:${color};font-size:12px;font-weight:bold">${reportEscape(status.label)}</span>`;
}
function financeStat(label, value, color) {
  return `<td width="50%" style="padding:12px 14px;border:1px solid #eee8f3;border-radius:10px;background:#faf8fc;vertical-align:top"><span style="display:block;font-size:12px;color:#74677e">${label}</span><strong style="display:block;margin-top:3px;font-size:17px;line-height:1.35;color:${color};overflow-wrap:anywhere">${reportEscape(value)}</strong></td>`;
}
export function financeReportHTML(report, shared = false) {
  const s = report.summary,
    head = `<p style="font-size:11px;letter-spacing:2px;color:#887491;margin:0 0 10px">ZEN STUDIO · NHÌN LẠI MỖI TUẦN</p><h1 style="font-size:27px;line-height:1.35;margin:0 0 8px">Bức tranh thu chi</h1><p style="font-size:13px;color:#74677e;margin:0 0 24px">${reportEscape(financeDate(s.from))} → ${reportEscape(financeDate(s.to))}</p>`,
    foot = shared
      ? `<p style="margin-top:28px;padding-top:16px;border-top:1px solid #e7e1ec;font-size:12px;color:#74677e">Báo cáo chỉ xem, được chia sẻ từ Kanban Zen Studio. Số liệu giữ nguyên tại thời điểm tạo link.</p>`
      : `<p style="margin-top:28px;padding-top:16px;border-top:1px solid #e7e1ec;font-size:12px;color:#74677e">Mở <a href="https://kanban.huongthiennature.com/">Kanban Zen Studio</a> để xem chi tiết và ghi thêm khoản thu chi. Đổi ngày giờ hoặc tắt email trong Cài đặt → Báo cáo thu chi tuần.</p>`,
    wrap = (inner) =>
      `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${reportEscape(report.subject)}</title><style>${REPORT_STYLE}</style></head><body><main class="report-sheet" data-report-kind="finance" style="max-width:680px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e7e1ec">${inner}</main></body></html>`;
  if (!s.hasData)
    return wrap(
      head +
        `<p class="report-body-copy">Chưa có khoản thu chi nào. Mở mục <strong>Phân bổ tài nguyên</strong> để ghi khoản chi hoặc khoản thu đầu tiên của từng dự án; email chỉ được gửi khi đã có số liệu.</p>` +
        foot,
    );
  const t = s.total,
    rate = t.rate === null ? 0 : Math.min(100, Math.round(t.rate * 100)),
    spent = s.projects.filter((p) => p.out > 0);
  let offset = 0;
  const rings = spent
    .map((p) => {
      const fraction = p.out / t.out,
        circle = `<circle cx="110" cy="110" r="80" fill="none" stroke="${p.color}" stroke-width="24" pathLength="100" stroke-dasharray="${fraction * 100} ${100 - fraction * 100}" stroke-dashoffset="${-offset}" transform="rotate(-90 110 110)"/>`;
      offset += fraction * 100;
      return circle;
    })
    .join('');
  const donut = spent.length
    ? `<div class="report-donut" style="text-align:center;break-inside:avoid"><svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220" role="img" aria-label="Chi theo dự án, tổng ${reportEscape(financeMoney(t.out))}"><circle cx="110" cy="110" r="80" fill="none" stroke="#eeeaf2" stroke-width="24"/>${rings}<text x="110" y="108" text-anchor="middle" fill="#352d40" font-size="${financeCompact(t.out).length > 11 ? 17 : 20}" font-weight="700">${reportEscape(financeCompact(t.out))}</text><text x="110" y="132" text-anchor="middle" fill="#74677e" font-size="13">tổng chi</text></svg></div>`
    : '';
  const distribution = spent
    .map((p) => {
      const pct = Math.round((p.out / t.out) * 1000) / 10;
      return `<tr class="report-status-main"><td width="58%" style="font-size:13px;padding:9px 14px 4px;border-radius:10px 0 0 0;background:#faf8fc;border-top:1px solid #eee8f3;border-left:1px solid #eee8f3"><span style="color:${p.color}">●</span> <strong>${reportEscape(p.name)}</strong></td><td align="right" style="font-size:13px;padding:9px 14px 4px;border-radius:0 10px 0 0;background:#faf8fc;border-top:1px solid #eee8f3;border-right:1px solid #eee8f3"><strong>${reportEscape(financeMoney(p.out))}</strong> <span style="color:#756580">·</span> <strong>${financePercent(pct)}</strong></td></tr><tr class="report-status-bar"><td colspan="2" style="padding:0 14px 8px;border-radius:0 0 10px 10px;background:#faf8fc;border:1px solid #eee8f3;border-top:0">${reportBar(Math.round(pct), p.color, true)}</td></tr>`;
    })
    .join('');
  const projects = s.projects
    .map((p) => {
      const pRate =
          p.rate === null ? 0 : Math.min(100, Math.round(p.rate * 100)),
        cats = p.categories.length
          ? `<p class="report-project-delta">Hạng mục chi lớn nhất: ${p.categories.map((c) => reportEscape(c.name) + ' ' + financePercent(c.pct)).join(' · ')}</p>`
          : '';
      return `<h2 class="report-project-title" style="--report-accent:${p.color};font-size:18px;margin:26px 0 6px;padding:12px 14px;border-left:3px solid ${p.color};break-after:avoid">${reportEscape(p.name)}</h2><table role="presentation" width="100%" class="report-project-progress"><tr><td style="font-size:13px;color:#6a6073">${financeBadge(p.status)} Thu hồi vốn</td><td align="right" style="font-size:18px;font-weight:bold;color:${netColor(p.net)}">${p.rate === null ? '—' : financePercent(p.rate * 100)}</td></tr></table>${reportBar(pRate, p.net >= 0 ? '#3b8b61' : p.color)}<table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="border-collapse:separate"><tr>${financeStat('Đã chi', financeMoney(p.out), '#a43464')}${financeStat('Đã thu hồi', financeMoney(p.inc), '#1f6b4a')}</tr><tr>${financeStat('Lãi / lỗ', financeSigned(p.net), netColor(p.net))}${financeStat('Tuần này', 'chi ' + financeMoney(p.week.out) + ' · thu ' + financeMoney(p.week.inc), '#352d40')}</tr></table>${cats}`;
    })
    .join('');
  const note = s.empty.length
    ? `<p class="report-project-summary">Chưa có số liệu: ${s.empty.map(reportEscape).join(', ')}</p>`
    : '';
  return wrap(
    head +
      `<table role="presentation" width="100%"><tr><td><strong style="font-size:30px;color:${netColor(t.net)}">${reportEscape(financeSigned(t.net))}</strong><br><span style="font-size:12px;color:#74677e">Lãi / lỗ toàn bộ dự án · ${financeBadge(s.status)}</span></td><td align="right" style="font-size:14px">${s.projects.length} dự án<br>${t.count} khoản</td></tr></table>${reportBar(rate, '#3b8b61')}<table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="border-collapse:separate"><tr>${financeStat('Đã chi', financeMoney(t.out), '#a43464')}${financeStat('Đã thu hồi', financeMoney(t.inc), '#1f6b4a')}</tr><tr>${financeStat('Tuần này', 'chi ' + financeMoney(s.week.out) + ' · thu ' + financeMoney(s.week.inc), '#352d40')}${financeStat('Tuần trước', 'chi ' + financeMoney(s.prevWeek.out) + ' · thu ' + financeMoney(s.prevWeek.inc), '#352d40')}</tr></table>` +
      (spent.length
        ? `<h2 style="font-size:17px;margin:24px 0 10px">Chi theo dự án</h2>${donut}<table class="report-distribution" cellpadding="0" cellspacing="0" aria-label="Chi theo dự án">${distribution}</table>`
        : '') +
      `<h2 style="font-size:17px;margin:24px 0 4px">Từng dự án</h2><p class="report-body-copy" style="color:#74677e;font-size:12px">Dự án lỗ nhiều nhất xếp đầu.</p>${projects}${note}<p class="report-rhythm-footnote">Báo cáo chỉ tổng hợp số liệu bạn đã nhập trong Phân bổ tài nguyên; việc tiếp tục hay tạm dừng dự án vẫn do bạn quyết định.</p>` +
      foot,
  );
}
