// Hồi quy v1.16.0: chế độ tối và tương phản cao đạt cùng chuẩn với chế độ sáng (xem tests/a11y-contrast-browser.mjs, v1.15.40).
// Quét mọi chữ đang hiển thị ở 390/820/1440px trên các màn hình, hộp thoại và menu chính, trong ba chế độ do hệ điều hành yêu cầu:
// tối (prefers-color-scheme: dark), tối + tương phản cao, sáng + tương phản cao. Tiêu chuẩn: cỡ chữ >= 12px; tương phản chữ/nền >= 4,5:1
// (3:1 cho chữ lớn và ký hiệu một ký tự); placeholder >= 4,5:1; viền ô nhập >= 3:1. Quét bảng lệnh sau khi hộp thoại đã hiện đủ (không còn mờ dần).
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { flatten, inflate } from '../dist/modules/delta.mjs';
import worker from '../worker.mjs';
import { validWorkspace } from '../server/api.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = createServer(async (req, res) => {
  try {
    const r = await worker.fetch(new Request('http://localhost' + req.url));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.writeHead(500);
    res.end(e.message);
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });

const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const shift = (n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const COLS = ['Idea', 'List', 'Doing', 'Done'];
const project = (id, name, color, count, extra = {}) => ({
  ...extra,
  id,
  name,
  description: 'Mô tả ngắn của dự án',
  color,
  icon: '✺',
  columns: COLS,
  columnNames: { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang thực hiện', Done: 'Hoàn thành' },
  keywords: [{ name: 'Khẩn', color: '#b42318' }, { name: 'Nhẹ nhàng', color: '#2e7d5b' }],
  tasks: Array.from({ length: count }, (_, i) => {
    const col = COLS[i % 4];
    return {
      id: id + 't' + i,
      title: 'Việc số ' + (i + 1),
      col,
      description: i % 3 === 0 ? 'Mô tả ngắn của việc để thẻ có đủ nội dung.' : '',
      due: [shift(-3), shift(0), shift(2), shift(7)][i % 4],
      tag: 'Công việc',
      priority: ['q1', 'q2', 'q3', 'q4', ''][i % 5],
      labels: i % 2 ? [{ name: 'Khẩn', color: '#b42318' }] : [],
      checks: i === 3 ? [{ id: id + 'c1', text: 'Bước một', done: true }, { id: id + 'c2', text: 'Bước hai', done: false }] : [],
    };
  }),
});
const seed = { schema: 1, projects: [project('p1', 'Khóa tu mùa thu', '#7950c8', 14), project('p2', 'Hương Thiền Nature — Website', '#c764a2', 8), project('p3', 'Sổ nợ An Tâm', '#e78c56', 6), project('p4', 'Dự án đã cất', '#44aa88', 3, { archived: true })], notes: [] };

async function open(width, touch = false, mode = {}) {
  const context = await browser.newContext({ ...mode, viewport: { width, height: width < 700 ? 844 : 900 }, timezoneId: 'Asia/Ho_Chi_Minh', ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  const page = await context.newPage();
  let workspace = structuredClone(seed),
    revision = 1;
  await context.addInitScript(({ day }) => {
    const prev = new Date(Date.parse(day + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
    for (const d of [day, prev]) for (let i = 0; i < 4; i++) localStorage.setItem('zen-welcome:qa:' + d + ':' + i, 'seen');
  }, { day });
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname.slice(5);
    let result = {};
    if (path === 'me') result = { user: { id: 'qa', name: 'Kiểm tra', email: 'qa@example.test', session_expires: Date.now() + 600000 } };
    else if (path === 'workspace' || path === 'workspace-v2') {
      if (req.method() === 'PUT' || req.method() === 'POST') {
        const b = req.postDataJSON();
        if (b.changes) {
          const entries = flatten(workspace);
          for (const c of b.changes) {
            if (c.value === null) delete entries[c.key];
            else entries[c.key] = c.value;
          }
          b.data = inflate(entries);
        }
        if (!validWorkspace(b.data)) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Invalid workspace' }) });
        workspace = b.data;
        result = { revision: ++revision };
      } else result = { data: workspace, revision };
    } else if (path === 'notification-receipts') result = req.method() === 'PUT' ? { ok: true } : { keys: [] };
    else if (path === 'activity') result = { expires: Date.now() + 600000 };
    else if (path === 'resources') result = { files: [], total: 0, used: 0, offset: 0 };
    else if (path === 'assets') result = { files: [], used: 0, quota: 1000000000 };
    else if (path === 'files') result = { files: [] };
    else if (path === 'report-shares') result = { shares: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
  });
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.goto('http://127.0.0.1:' + server.address().port);
  await page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa');
  return { context, page };
}

async function show(page, name) {
  const ready = (name) => document.querySelector('#main h1') && view === name;
  await page.evaluate((name) => go(name, 'p1'), name);
  await page.waitForFunction(ready, name, { timeout: 10000 }).catch(async () => {
    await page.evaluate((name) => go(name, 'p1'), name);
    await page.waitForFunction(ready, name, { timeout: 10000 });
  });
  await page.waitForTimeout(250);
}

// Đo trong trang. Trả về danh sách vi phạm (chưa gom nhóm).
const measure = (page) =>
  page.evaluate(() => {
    const parse = (s) => {
      let m = s.match(/rgba?\(([^)]+)\)/);
      if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; }
      m = s.match(/color\(srgb ([^)]+)\)/);
      if (m) { const p = m[1].split(/[ /]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p[3] === undefined ? 1 : p[3] }; }
      return { r: 0, g: 0, b: 0, a: 0 };
    };
    const over = (top, bot) => {
      const a = top.a + bot.a * (1 - top.a);
      if (!a) return { r: 0, g: 0, b: 0, a: 0 };
      return { r: (top.r * top.a + bot.r * bot.a * (1 - top.a)) / a, g: (top.g * top.a + bot.g * bot.a * (1 - top.a)) / a, b: (top.b * top.a + bot.b * bot.a * (1 - top.a)) / a, a };
    };
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
    const gradientStops = (img) => [...img.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])).filter((c) => c.a > 0);
    const describe = (el) => { const p = []; let c = el; for (let i = 0; i < 3 && c && c !== document.body; i++, c = c.parentElement) p.push(c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + ([...c.classList][0] ? '.' + [...c.classList].slice(0, 2).join('.') : '')); return p.join(' < '); };
    // Nền thực tế phía sau phần tử: trả về danh sách nền khả dĩ (một nền, hoặc nhiều nền nếu có gradient).
    const backgrounds = (el) => {
      let op = 1, layers = [], cur = el, stops = null;
      while (cur && cur !== document.documentElement) {
        const c = getComputedStyle(cur);
        op *= Number(c.opacity);
        const bg = parse(c.backgroundColor);
        if (c.backgroundImage && c.backgroundImage !== 'none') { const s = gradientStops(c.backgroundImage); if (s.length) { stops = s; break; } }
        if (bg.a > 0) layers.push(bg);
        if (bg.a >= 1) break;
        cur = cur.parentElement;
      }
      let base = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
      return { op, list: stops ? stops.map((s) => over(s, base)) : [base], gradient: !!stops };
    };
    const out = [];
    const visible = (el, cs) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const skip = (el) => el.closest('[disabled],[aria-disabled="true"],.project-icon,.task-project-choice-icon,.sr-only,[hidden]');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const n = walker.currentNode, text = n.textContent.replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const el = n.parentElement;
      if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION', 'TEXTAREA'].includes(el.tagName) || seen.has(el)) continue;
      const cs = getComputedStyle(el);
      if (!visible(el, cs) || skip(el)) continue;
      seen.add(el);
      const { op, list, gradient } = backgrounds(el);
      if (op < 0.05) continue;
      const fg0 = parse(cs.color), fs = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
      const symbol = !/[A-Za-zÀ-ỹ0-9]/.test(text);
      const large = fs >= 24 || (fs >= 18.66 && bold);
      const need = large || symbol ? 3 : 4.5;
      let worst = Infinity;
      for (const bg of list) worst = Math.min(worst, ratio(over({ ...fg0, a: fg0.a * op }, bg), bg));
      worst = Math.round(worst * 100) / 100;
      const problems = [];
      if (!symbol && fs < 12) problems.push('cỡ chữ ' + Math.round(fs * 10) / 10 + 'px < 12px');
      if (worst < need) problems.push('tương phản ' + worst + ' < ' + need + (gradient ? ' (gradient)' : ''));
      if (problems.length) out.push({ problems, text: text.slice(0, 40), where: describe(el), fg: cs.color, op: Math.round(op * 100) / 100, fs });
    }
    // Chữ gợi ý (placeholder) của ô nhập.
    for (const el of document.querySelectorAll('input[placeholder],textarea[placeholder]')) {
      const cs = getComputedStyle(el);
      if (!visible(el, cs) || skip(el)) continue;
      const ph = getComputedStyle(el, '::placeholder'), { op, list } = backgrounds(el);
      let worst = Infinity; const fg = parse(ph.color);
      for (const bg of list) worst = Math.min(worst, ratio(over({ ...fg, a: fg.a * op }, bg), bg));
      worst = Math.round(worst * 100) / 100;
      if (worst < 4.5) out.push({ problems: ['placeholder tương phản ' + worst + ' < 4.5'], text: el.getAttribute('placeholder').slice(0, 40), where: describe(el), fg: ph.color, op, fs: parseFloat(cs.fontSize) });
    }
    // Viền ô nhập.
    for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),select,textarea')) {
      const cs = getComputedStyle(el);
      if (!visible(el, cs) || skip(el) || parseFloat(cs.borderTopWidth) < 1 || cs.borderTopStyle === 'none') continue;
      const { list } = backgrounds(el);
      const border = parse(cs.borderTopColor), worst = Math.round(Math.min(...list.map((bg) => ratio(over(border, bg), bg))) * 100) / 100;
      if (worst < 3) out.push({ problems: ['viền ô nhập ' + worst + ' < 3'], text: (el.name || el.id || el.type || el.tagName) + '', where: describe(el), fg: cs.borderTopColor, op: 1, fs: parseFloat(cs.fontSize) });
    }
    return out;
  });

const MODES = [
  { label: 'tối', colorScheme: 'dark' },
  { label: 'tối + tương phản cao', colorScheme: 'dark', contrast: 'more' },
  { label: 'sáng + tương phản cao', colorScheme: 'light', contrast: 'more' },
];
const groups = new Map();
async function scan(page, label) {
  for (const r of await measure(page)) {
    const key = label.split(' ')[0] + '|' + r.problems.join(';') + '|' + r.where + '|' + r.fg + '|' + r.op;
    if (!groups.has(key)) groups.set(key, { ...r, n: 0, labels: new Set(), samples: [] });
    const g = groups.get(key);
    g.n++;
    g.labels.add(label);
    if (g.samples.length < 2 && !g.samples.includes(r.text)) g.samples.push(r.text);
  }
}

try {
  for (const mode of MODES) for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const { context, page } = await open(width, touch, { colorScheme: mode.colorScheme, ...(mode.contrast ? { contrast: mode.contrast } : {}) });
    await page.waitForFunction((m) => document.documentElement.dataset.theme === m, mode.colorScheme);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.contrast || ''), mode.contrast ? 'high' : '', `[${mode.label}] thuộc tính data-contrast phải khớp yêu cầu của hệ điều hành`);
    const tag = (s) => '[' + mode.label + '] ' + width + 'px ' + s;
    const closeDialogs = async () => {
      await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
    };
    for (const v of ['dashboard', 'projects', 'tasks', 'timeline', 'calendar', 'gantt', 'notes', 'resources', 'archive', 'trash', 'focus']) {
      await show(page, v);
      await scan(page, tag(v));
    }
    await show(page, 'projects');
    await page.locator('.wf-display-options>summary').click();
    await scan(page, tag('menu Hiển thị'));
    await page.evaluate(() => document.querySelector('.wf-display-options').removeAttribute('open'));
    await page.locator('.wf-project-menu>summary').click();
    await scan(page, tag('menu Tùy chọn'));
    await page.evaluate(() => document.querySelector('.wf-project-menu').removeAttribute('open'));
    const dialogs = {
      'thêm việc': () => page.evaluate(() => taskForm(project('p1'))),
      'dự án mới': () => page.evaluate(() => projectForm()),
      'sửa dự án': () => page.evaluate(() => projectForm(project('p1'))),
      'chi tiết việc': () => page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[3])),
      'hướng dẫn': () => page.evaluate(() => document.querySelector('[data-action=help]')?.click()),
      'tài khoản': () => page.evaluate(() => accountPanel()),
      chuông: () => page.evaluate(() => document.querySelector('#notifications-button')?.click()),
      'ghi chú mới': () => page.evaluate(() => document.querySelector('[data-note-new]')?.click()),
    };
    for (const [name, openDialog] of Object.entries(dialogs)) {
      if (name === 'ghi chú mới') await show(page, 'notes');
      await openDialog();
      await page.waitForTimeout(350);
      assert.ok(await page.evaluate(() => !!document.querySelector('dialog[open]')), `hộp thoại "${name}" không mở được ở ${width}px, nên không có gì để quét`);
      await scan(page, tag('hộp thoại ' + name));
      await closeDialogs();
    }
    await page.keyboard.press('Control+k');
    await page.waitForFunction(() => document.querySelector('.studio-palette')?.open === true);
    await page.waitForTimeout(500);
    await scan(page, tag('bảng lệnh'));
    await page.keyboard.press('Escape');
    await context.close();
    console.log('PASS đã quét [' + mode.label + '] ' + width + 'px');
  }
  const rows = [...groups.values()].sort((a, b) => b.n - a.n);
  const report = rows.map((r) => `  n=${r.n} ${r.problems.join('; ')} | ${r.where} | màu ${r.fg}${r.op < 1 ? ' độ mờ ' + r.op : ''} | ${JSON.stringify(r.samples)} | ${[...r.labels].slice(0, 3).join(', ')}`);
  if (process.env.A11Y_REPORT) console.log(report.join('\n'));
  assert.equal(rows.length, 0, `còn ${rows.length} nhóm chữ / viền chưa đạt (${rows.reduce((s, r) => s + r.n, 0)} phần tử):\n` + report.slice(0, 60).join('\n'));
  console.log('PASS chế độ tối và tương phản cao: chữ ≥12px, tương phản ≥4,5:1 (3:1 cho chữ lớn và ký hiệu), viền ô nhập ≥3:1');
} finally {
  await browser.close();
  server.close();
}
