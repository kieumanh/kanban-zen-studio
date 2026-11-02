// Hồi quy v1.15.33: tiêu đề trang, tab dự án và thanh trên không bị bóp hay tràn ngang ở độ rộng tablet (701–1000px).
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

const project = (id, name, color, count) => ({
  id,
  name,
  description: 'Mô tả ngắn của dự án',
  color,
  icon: '✺',
  columns: ['Idea', 'List', 'Doing', 'Done'],
  columnNames: { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang thực hiện', Done: 'Hoàn thành' },
  tasks: Array.from({ length: count }, (_, i) => ({ id: id + 't' + i, title: 'Việc số ' + (i + 1), col: ['Idea', 'List', 'Doing', 'Done'][i % 4], description: '', due: '2026-11-0' + (1 + (i % 8)), tag: 'Công việc', priority: 'q2', checks: [] })),
});
const seed = { schema: 1, projects: [project('p1', 'Khóa tu mùa thu', '#7950c8', 8), project('p2', 'Hương Thiền Nature — Website', '#c764a2', 5), project('p3', 'Sổ nợ An Tâm', '#e78c56', 4)], notes: [] };
const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

async function open(width) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: 'Asia/Ho_Chi_Minh' });
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
  await page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa' && document.documentElement.dataset.zenReady === '1');
  return { context, page };
}

// Chuyển view rồi đợi tới khi tiêu đề của view đó thật sự hiện ra (không dựa vào độ trễ cố định).
async function show(page, name) {
  const ready = (name) => document.querySelector('#main h1') && view === name;
  await page.evaluate((name) => go(name, 'p1'), name);
  await page.waitForFunction(ready, name, { timeout: 10000 }).catch(async () => {
    await page.evaluate((name) => go(name, 'p1'), name);
    await page.waitForFunction(ready, name, { timeout: 10000 });
  });
}

const measure = (page) =>
  page.evaluate(() => {
    const h1 = document.querySelector('#main .board-head h1, #main .page-heading h1');
    const box = h1.getBoundingClientRect();
    const percents = [...document.querySelectorAll('#tabs .tab[data-project]:not(.pinned) > span')].map((el) => Math.round(el.getBoundingClientRect().height));
    return { w: Math.round(box.width), h: Math.round(box.height), lineHeight: parseFloat(getComputedStyle(h1).lineHeight) || 30, scrollW: document.documentElement.scrollWidth, vw: innerWidth, percents };
  });

try {
  // 701px là điểm gãy thấp nhất của thanh bên cố định; 1024px là tablet ngang.
  for (const width of [701, 820, 1000, 1024, 1440]) {
    const { context, page } = await open(width);
    await show(page, 'projects');
    const m = await measure(page);
    assert.ok(m.w >= 200, `tên dự án rộng ${m.w}px ở ${width}px, phải từ 200px`);
    assert.ok(m.h <= m.lineHeight * 2.2, `tên dự án cao ${m.h}px ở ${width}px, không được vỡ thành nhiều dòng`);
    assert.ok(m.scrollW <= m.vw, `trang tràn ngang ${m.scrollW}px trong khung ${m.vw}px ở ${width}px (bảng dự án)`);
    assert.ok(m.percents.length > 0 && m.percents.every((h) => h < 24), `phần trăm tiến độ trên tab bị bẻ dòng ở ${width}px: ${m.percents}`);
    for (const view of ['dashboard', 'timeline', 'calendar', 'gantt', 'tasks']) {
      await show(page, view);
      const v = await measure(page);
      assert.ok(v.scrollW <= v.vw, `trang tràn ngang ${v.scrollW}px trong khung ${v.vw}px ở ${width}px (${view})`);
      assert.ok(v.w >= 200, `tiêu đề của ${view} rộng ${v.w}px ở ${width}px, phải từ 200px`);
    }
    console.log('PASS tablet layout at ' + width + 'px');
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
