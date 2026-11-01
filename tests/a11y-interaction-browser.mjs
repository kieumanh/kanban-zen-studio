// Hồi quy v1.15.41: truy cập II — vùng chạm, tiêu điểm đầu hộp thoại, tên hộp thoại, thứ tự Tab. Quét ở 390px (cảm ứng) / 820px / 1440px trên các màn hình, menu và hộp thoại chính:
//  1. vùng chạm của mọi điều khiển đang hiển thị tối thiểu 24×24px (WCAG 2.5.8); trên màn hình cảm ứng (pointer: coarse; 390px và 820px) tối thiểu 44×44px.
//     Mức 24px (không phải 44px) trên cảm ứng: nhãn từ khóa (.label-chip, .note-keyword), ô chọn / nút tròn / thanh trượt, thanh định dạng văn bản.
//     Không tính: phần tử bị vô hiệu, liên kết nằm giữa câu chữ, phần tử ẩn cho trình đọc màn hình hoặc có kích thước ≤2px (ô nhập ẩn phục vụ bộ chọn tùy biến),
//     ô chọn gốc có nhãn đủ lớn, tay nắm kéo trong biểu đồ Gantt (SVG; ngày sửa được trong biểu mẫu việc, nối phụ thuộc bằng Enter trên bàn phím);
//     đồng thời mỗi màn hình không được tràn ngang;
//  2. mở hộp thoại có ô nhập thì tiêu điểm nằm ở ô nhập đầu tiên (ô tên), không nằm ở nút Đóng;
//  3. mỗi <dialog> có tên đọc được (aria-labelledby trỏ tới tiêu đề đang hiển thị, hoặc aria-label);
//  4. thứ tự Tab trong hộp thoại: không có tabindex dương và đi theo thứ tự đọc (từ trên xuống, cùng hàng thì từ trái sang phải).
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

async function open(width, touch = false) {
  const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 }, timezoneId: 'Asia/Ho_Chi_Minh', ...(touch ? { hasTouch: true, isMobile: true } : {}) });
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

// ---- Đo vùng chạm ----
const measureTargets = (page, touch) =>
  page.evaluate((touch) => {
    const DENSE = '.label-chip,.note-keyword,.zen-format-tools *,input[type=checkbox],input[type=radio],input[type=range]';
    const sel = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=menuitem],[tabindex]:not([tabindex="-1"])';
    const describe = (el) => { const p = []; let c = el; for (let i = 0; i < 3 && c && c !== document.body; i++, c = c.parentElement) p.push(c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + ([...c.classList].slice(0, 2).map((x) => '.' + x).join(''))); return p.join(' < '); };
    const out = [];
    for (const el of document.querySelectorAll(sel)) {
      if (el.closest('[disabled],[aria-disabled="true"],[hidden],dialog:not([open]),.sr-only,[inert]') || el.matches(':disabled')) continue;
      const cs = getComputedStyle(el);
      if (!el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true }) || cs.pointerEvents === 'none') continue;
      let r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) continue;
      if (el.tagName === 'A' && cs.display === 'inline') continue;
      if (el.closest('svg.gantt-svg')) continue;
      const min = touch && !el.matches(DENSE) ? 44 : 24;
      if (el.type === 'checkbox' || el.type === 'radio') {
        const lab = el.closest('label') || (el.id && document.querySelector('label[for="' + el.id + '"]'));
        if (lab) r = lab.getBoundingClientRect();
      }
      const w = Math.round(r.width * 10) / 10, h = Math.round(r.height * 10) / 10;
      if (w >= min && h >= min) continue;
      out.push({ problems: [`vùng chạm ${w}×${h}px < ${min}px`], where: describe(el), text: (el.getAttribute('aria-label') || el.textContent || el.name || el.type || '').trim().slice(0, 30) });
    }
    return out;
  }, touch);

const groups = new Map();
const addGroup = (r, label) => {
  const key = r.problems.join(';') + '|' + r.where;
  if (!groups.has(key)) groups.set(key, { ...r, n: 0, labels: new Set(), samples: [] });
  const g = groups.get(key);
  g.n++;
  g.labels.add(label);
  if (g.samples.length < 2 && !g.samples.includes(r.text)) g.samples.push(r.text);
};
async function scanTargets(page, label, touch) {
  for (const r of await measureTargets(page, touch)) addGroup(r, label);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) addGroup({ problems: ['trang tràn ngang ' + overflow + 'px'], where: 'document', text: '' }, label);
}

// ---- Đo hộp thoại: tiêu điểm đầu, tên đọc được, thứ tự Tab ----
const measureDialog = (page, expectField, touch) =>
  page.evaluate(({ expectField, touch }) => {
    const out = [];
    const d = document.querySelector('dialog[open]');
    if (!d) return [{ problems: ['không có hộp thoại đang mở'], where: 'dialog', text: '' }];
    const describe = (el) => { const p = []; let c = el; for (let i = 0; i < 3 && c && c !== document.body; i++, c = c.parentElement) p.push(c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + ([...c.classList].slice(0, 2).map((x) => '.' + x).join(''))); return p.join(' < '); };
    const visible = (el) => { const r = el.getBoundingClientRect(); return el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true }) && r.width > 2 && r.height > 2 && !el.closest('[hidden]'); };
    const active = document.activeElement;
    const textLike = [...d.querySelectorAll('input,textarea')].filter((e) => visible(e) && !e.disabled && !e.readOnly && !['checkbox', 'radio', 'file', 'button', 'submit', 'hidden', 'color', 'range', 'date', 'datetime-local', 'time'].includes(e.type));
    const first = textLike[0];
    // 2. tiêu điểm đầu
    if (!d.contains(active) || active === d) out.push({ problems: ['tiêu điểm không nằm trong hộp thoại'], where: describe(active || document.body), text: '' });
    else if (expectField === 'field') {
      if (!first) out.push({ problems: ['hộp thoại cần ô tên nhưng không thấy ô nhập'], where: describe(d), text: '' });
      else if (active !== first) out.push({ problems: ['tiêu điểm đầu không ở ô tên'], where: 'đang ở ' + describe(active), text: (active.getAttribute('aria-label') || active.textContent || '').trim().slice(0, 20) });
    } else if (expectField === 'inside-not-close') {
      if (active.matches('[data-action="close-modal"],.modal-close-pin,.icon-btn')) out.push({ problems: ['tiêu điểm đầu rơi vào nút Đóng'], where: describe(active), text: '' });
    }
    // 3. tên hộp thoại
    const ids = (d.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    const named = ids.some((id) => { const e = document.getElementById(id); return e && visible(e) && e.textContent.trim(); }) || (d.getAttribute('aria-label') || '').trim();
    if (!named) out.push({ problems: ['hộp thoại không có tên đọc được (aria-labelledby / aria-label)'], where: describe(d), text: '' });
    // 4. thứ tự Tab
    const tabbables = [...d.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex]')].filter((e) => !e.disabled && e.tabIndex >= 0 && visible(e));
    for (const e of tabbables) if (Number(e.getAttribute('tabindex')) > 0) out.push({ problems: ['tabindex dương'], where: describe(e), text: '' });
    let scrolled = d; while (scrolled) { scrolled.scrollTop = 0; scrolled = scrolled.parentElement; }
    for (const e of d.querySelectorAll('*')) if (e.scrollTop) e.scrollTop = 0;
    const flow = tabbables.filter((e) => !e.closest('.modal-head,.modal-foot'));
    for (let i = 1; i < flow.length; i++) {
      const a = flow[i - 1].getBoundingClientRect(), b = flow[i].getBoundingClientRect();
      const sameRow = Math.abs(a.top - b.top) < 12 || (b.top < a.bottom && b.bottom > a.top);
      if (sameRow ? b.left < a.left - 4 : b.top < a.top - 4) out.push({ problems: ['thứ tự Tab ngược chiều đọc'], where: describe(flow[i - 1]) + '  →  ' + describe(flow[i]), text: (flow[i].getAttribute('aria-label') || flow[i].textContent || flow[i].name || '').trim().slice(0, 24) });
    }
    return out;
  }, { expectField, touch });

async function scanDialog(page, label, expectField, touch) {
  for (const r of await measureDialog(page, expectField, touch)) addGroup(r, label);
}

try {
  for (const [width, touch] of [[390, true], [820, false], [820, true], [1440, false]]) {
    const { context, page } = await open(width, touch);
    const tag = (s) => width + 'px' + (touch ? ' cảm ứng ' : ' ') + s;
    const closeDialogs = async () => {
      await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
    };
    for (const v of ['dashboard', 'projects', 'tasks', 'timeline', 'calendar', 'gantt', 'notes', 'resources', 'archive', 'trash', 'focus']) {
      await show(page, v);
      await scanTargets(page, tag(v), touch);
    }
    await show(page, 'projects');
    await page.locator('.wf-display-options>summary').click();
    await scanTargets(page, tag('menu Hiển thị'), touch);
    await page.evaluate(() => document.querySelector('.wf-display-options').removeAttribute('open'));
    await page.locator('.wf-project-menu>summary').click();
    await scanTargets(page, tag('menu Tùy chọn'), touch);
    await page.evaluate(() => document.querySelector('.wf-project-menu').removeAttribute('open'));
    // expectField: 'field' = phải rơi vào ô tên; 'inside-not-close' = trong hộp thoại, không ở nút Đóng; '' = chỉ kiểm tên và thứ tự Tab.
    const dialogs = {
      'thêm việc': [() => page.evaluate(() => taskForm(project('p1'))), 'field'],
      'dự án mới': [() => page.evaluate(() => projectForm()), 'field'],
      'sửa dự án': [() => page.evaluate(() => projectForm(project('p1'))), touch ? 'inside-not-close' : 'field'],
      'chi tiết việc': [() => page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[3])), touch ? 'inside-not-close' : 'field'],
      'hướng dẫn': [() => page.evaluate(() => document.querySelector('[data-action=help]')?.click()), ''],
      'tài khoản': [() => page.evaluate(() => accountPanel()), ''],
      chuông: [() => page.evaluate(() => document.querySelector('#notifications-button')?.click()), ''],
      'ghi chú mới': [() => page.evaluate(() => document.querySelector('[data-note-new]')?.click()), ''],
    };
    for (const [name, [openDialog, expectField]] of Object.entries(dialogs)) {
      if (name === 'ghi chú mới') await show(page, 'notes');
      await openDialog();
      await page.waitForTimeout(450);
      assert.ok(await page.evaluate(() => !!document.querySelector('dialog[open]')), `hộp thoại "${name}" không mở được ở ${width}px, nên không có gì để quét`);
      await scanTargets(page, tag('hộp thoại ' + name), touch);
      await scanDialog(page, tag('hộp thoại ' + name), expectField, touch);
      await closeDialogs();
    }
    await context.close();
    console.log('PASS đã quét ' + width + 'px' + (touch ? ' cảm ứng' : ''));
  }
  const rows = [...groups.values()].sort((a, b) => b.n - a.n);
  const report = rows.map((r) => `  n=${r.n} ${r.problems.join('; ')} | ${r.where} | ${JSON.stringify(r.samples)} | ${[...r.labels].slice(0, 3).join(', ')}`);
  if (process.env.A11Y_REPORT) console.log(report.join('\n'));
  assert.equal(rows.length, 0, `còn ${rows.length} nhóm chưa đạt (${rows.reduce((s, r) => s + r.n, 0)} phần tử):\n` + report.slice(0, 60).join('\n'));
  console.log('PASS truy cập II: vùng chạm ≥24px (≥44px khi cảm ứng), tiêu điểm đầu ở ô tên, hộp thoại có tên, thứ tự Tab theo chiều đọc');
} finally {
  await browser.close();
  server.close();
}
