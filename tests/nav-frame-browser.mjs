// Hồi quy v1.15.34: khung điều hướng (thanh trên + tab dự án) đứng yên khi cuộn từ 701px, chuyển màn hình không đẩy khung khỏi tầm nhìn, đường dẫn không trống.
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

const project = (id, name, color, count, extra = {}) => ({
  ...extra,
  id,
  name,
  description: 'Mô tả ngắn của dự án',
  color,
  icon: '✺',
  columns: ['Idea', 'List', 'Doing', 'Done'],
  columnNames: { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang thực hiện', Done: 'Hoàn thành' },
  tasks: Array.from({ length: count }, (_, i) => ({ id: id + 't' + i, title: 'Việc số ' + (i + 1), col: ['Idea', 'List', 'Doing', 'Done'][i % 4], description: '', due: '2026-11-0' + (1 + (i % 8)), tag: 'Công việc', priority: 'q2', checks: [] })),
});
const seed = { schema: 1, projects: [project('p1', 'Khóa tu mùa thu', '#7950c8', 14), project('p2', 'Hương Thiền Nature — Website', '#c764a2', 5), project('p3', 'Sổ nợ An Tâm', '#e78c56', 4), project('p4', 'Dự án đã cất', '#4a8', 3, { archived: true })], notes: [] };
const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

async function open(width) {
  const context = await browser.newContext({ viewport: { width, height: 700 }, timezoneId: 'Asia/Ho_Chi_Minh' });
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

const frame = (page) =>
  page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), height: Math.round(r.height), position: getComputedStyle(el).position };
    };
    return {
      scrollY: Math.round(scrollY),
      maxScroll: document.documentElement.scrollHeight - innerHeight,
      vh: innerHeight,
      topbar: box('.topbar'),
      tabs: box('#tabs'),
      search: box('#search'),
      crumb: document.querySelector('#crumb')?.textContent.trim(),
      scrollPaddingTop: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
      sideProjectsShown: !!document.querySelector('.sidebar > .side-projects')?.getClientRects().length,
    };
  });

try {
  // Từ 701px: thanh trên và dải tab dự án dính ở đầu màn hình; 1024px là tablet ngang.
  for (const width of [701, 820, 1000, 1024, 1440]) {
    const { context, page } = await open(width);
    for (const name of ['dashboard', 'projects', 'calendar', 'tasks', 'archive', 'trash']) {
      const at = `${width}px, màn hình ${name}`;
      // Đang cuộn xuống giữa trang rồi mới chuyển màn hình (trước đây trang bị đẩy xuống 162px và khung biến mất).
      await page.evaluate(() => scrollTo(0, 400));
      await show(page, name);
      let f = await frame(page);
      assert.equal(f.scrollY, 0, `sau khi chuyển tới ${at} trang phải ở đầu, đang cuộn ${f.scrollY}px`);
      assert.ok(f.topbar.top === 0 && f.tabs.top === f.topbar.bottom, `khung điều hướng lệch sau khi chuyển tới ${at}: thanh trên ${f.topbar.top}, tab ${f.tabs.top}`);
      assert.ok(f.crumb, `đường dẫn trống ở ${at}`);
      assert.equal(f.sideProjectsShown, false, `danh sách dự án ở thanh bên phải ẩn từ 701px (${at})`);
      // Cuộn hết cỡ: thanh trên, ô tìm kiếm và dải tab vẫn nằm trong tầm nhìn.
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      f = await frame(page);
      assert.ok(f.maxScroll > 100 ? f.scrollY > 100 : true, `không cuộn được ở ${at}`);
      assert.equal(f.topbar.position, 'sticky', `thanh trên không dính ở ${at}`);
      assert.equal(f.tabs.position, 'sticky', `dải tab dự án không dính ở ${at}`);
      assert.equal(f.topbar.top, 0, `thanh trên rời khỏi đầu màn hình khi cuộn ở ${at}: ${f.topbar.top}`);
      assert.equal(f.tabs.top, f.topbar.bottom, `dải tab không dính ngay dưới thanh trên ở ${at}: ${f.tabs.top} so với ${f.topbar.bottom}`);
      assert.ok(f.search.top >= 0 && f.search.bottom <= f.topbar.bottom, `ô tìm kiếm ra khỏi tầm nhìn khi cuộn ở ${at}`);
      assert.ok(f.scrollPaddingTop >= f.tabs.bottom, `scroll-padding-top ${f.scrollPaddingTop}px nhỏ hơn khung dính ${f.tabs.bottom}px (${at}): ô đang lấy nét có thể bị khung che`);
    }
    console.log('PASS nav frame at ' + width + 'px');
    await context.close();
  }

  // Điện thoại (≤700px): thanh trên dính sẵn; chuyển màn hình cũng về đầu trang; danh sách dự án nằm trong ngăn kéo.
  {
    const { context, page } = await open(390);
    await page.evaluate(() => scrollTo(0, 400));
    await show(page, 'projects');
    const f = await frame(page);
    assert.equal(f.scrollY, 0, `ở 390px sau khi chuyển màn hình trang phải ở đầu, đang cuộn ${f.scrollY}px`);
    await page.evaluate(() => scrollTo(0, 600));
    const g = await frame(page);
    assert.ok(g.topbar.position === 'sticky' && g.topbar.top === 0, 'thanh trên ở 390px phải dính ở đầu màn hình');
    // v1.15.35: phần tử được cuộn tới (kéo thả, Tab, scrollIntoView) không được nằm dưới thanh trên + dải chế độ xem dính.
    const chrome = await page.evaluate(() => ({
      bottom: Math.round(document.querySelector('.mobile-viewbar').getBoundingClientRect().bottom),
      padding: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
    }));
    assert.ok(chrome.padding >= chrome.bottom, `scroll-padding-top ở 390px (${chrome.padding}px) phải không nhỏ hơn khung dính (${chrome.bottom}px)`);
    await page.locator('#menu').click();
    await page.waitForSelector('.sidebar.open');
    const names = await page.locator('.sidebar.open .side-project').allInnerTexts();
    assert.ok(names.length === 3 && names.some((n) => n.includes('Khóa tu mùa thu')), `ngăn kéo ở 390px phải liệt kê ba dự án đang dùng, nhận được: ${names}`);
    assert.ok(await page.locator('.sidebar.open .side-projects').isVisible(), 'danh sách dự án trong ngăn kéo ở 390px bị ẩn');
    console.log('PASS nav frame at 390px');
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
