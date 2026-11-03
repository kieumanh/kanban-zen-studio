// Hồi quy v1.15.35: thẻ Kanban gọn. Nút chuyển nhanh là mũi tên nhỏ cạnh hạn (không còn một hàng riêng ở mọi thẻ), việc chưa có checklist không hiện thanh tiến độ trống, thẻ đầu tiên thấp hơn nhiều so với 289px của v1.15.34.
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
  tasks: Array.from({ length: count }, (_, i) => ({ id: id + 't' + i, title: 'Việc số ' + (i + 1), col: ['Idea', 'List', 'Doing', 'Done'][i % 4], description: '', due: '2026-11-0' + (1 + (i % 8)), tag: 'Công việc', priority: 'q2', checks: id === 'p1' && i === 4 ? [{ id: 'c1', text: 'Bước một', done: true }, { id: 'c2', text: 'Bước hai', done: false }] : [] })),
});
const seed = { schema: 1, projects: [project('p1', 'Khóa tu mùa thu', '#7950c8', 14), project('p2', 'Hương Thiền Nature — Website', '#c764a2', 5), project('p3', 'Sổ nợ An Tâm', '#e78c56', 4), project('p4', 'Dự án đã cất', '#4a8', 3, { archived: true })], notes: [] };
const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

async function open(width, touch = false) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, timezoneId: 'Asia/Ho_Chi_Minh', ...(touch ? { hasTouch: true, isMobile: true } : {}) });
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

// Từ v1.15.38 Thẻ gọn mặc định bật trên điện thoại; test này đo thẻ đầy đủ nên chọn "Thẻ đầy đủ" rõ ràng trước (mặc định được kiểm ở compact-default-browser).
const fullCards = (page) =>
  page.evaluate(() => {
    localStorage.setItem('zen-compact', 'false');
    render();
  });

const cards = (page) =>
  page.evaluate(() => {
    const rect = (el) => {
      const b = el.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height) };
    };
    return [...document.querySelectorAll('#main .task-card')].slice(0, 14).map((card) => {
      const next = card.querySelector('.task-next');
      const meta = card.querySelector('.progress-meta');
      const bar = card.querySelector('.progress');
      return {
        id: card.dataset.task,
        h: rect(card).h,
        hasNext: !!next,
        nextSize: next ? rect(next) : null,
        nextInDecision: !!next?.closest('.task-card-decision'),
        nextName: next?.getAttribute('aria-label') || '',
        nextVisibleText: next ? next.innerText.trim() : '',
        metaShown: !!meta && meta.getClientRects().length > 0,
        barShown: !!bar && bar.getClientRects().length > 0,
        metaText: meta?.textContent.trim() || '',
        pin: !!card.querySelector('.zen-task-pin'),
        grip: !!card.querySelector('.wf-grip'),
      };
    });
  });

try {
  for (const width of [390, 820, 1440]) {
    const { context, page } = await open(width);
    await fullCards(page);
    await show(page, 'projects');
    await page.waitForSelector('#main .task-card');
    const overflow = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, vw: innerWidth }));
    assert.ok(overflow.scrollW <= overflow.vw, `trang tràn ngang ${overflow.scrollW}px trong khung ${overflow.vw}px ở ${width}px (bảng Kanban)`);
    const list = await cards(page);
    const plain = list.find((c) => c.id === 'p1t0'); // Ý tưởng, chưa có checklist
    const withChecks = list.find((c) => c.id === 'p1t4'); // Ý tưởng, 1/2 mục checklist
    const last = list.find((c) => c.id === 'p1t3'); // Hoàn thành: không có cột kế tiếp
    assert.ok(plain && withChecks && last, `không thấy thẻ mẫu ở ${width}px`);
    // Chiều cao: v1.15.34 cao 289px (820/1440px) và 304px (390px) cho thẻ như thẻ p1t0.
    assert.ok(plain.h <= 190, `thẻ chưa có checklist cao ${plain.h}px ở ${width}px, phải từ 190px trở xuống`);
    assert.ok(withChecks.h > plain.h, `thẻ có checklist (${withChecks.h}px) phải cao hơn thẻ không có (${plain.h}px) vì còn hiện tiến độ`);
    // Việc chưa có checklist: không hiện "0%" và thanh tiến độ trống.
    assert.ok(!plain.metaShown && !plain.barShown, `thẻ chưa có checklist vẫn hiện tiến độ trống ở ${width}px`);
    assert.ok(withChecks.metaShown && withChecks.barShown, `thẻ có checklist phải hiện tiến độ ở ${width}px`);
    assert.match(withChecks.metaText, /1\/2 mục checklist/, `tiến độ checklist sai ở ${width}px: ${withChecks.metaText}`);
    // Nút chuyển nhanh: mũi tên nhỏ cạnh hạn, có tên truy cập đầy đủ.
    assert.ok(plain.hasNext && plain.nextInDecision, `nút chuyển nhanh phải nằm ở hàng hạn của thẻ (${width}px)`);
    assert.ok(plain.nextSize.w >= 24 && plain.nextSize.w <= 48 && plain.nextSize.h >= 24 && plain.nextSize.h <= 48, `nút chuyển nhanh ${plain.nextSize.w}x${plain.nextSize.h}px ở ${width}px, phải từ 24 đến 48px`);
    assert.match(plain.nextName, /^Chuyển sang .+/, `nút chuyển nhanh thiếu tên truy cập: "${plain.nextName}"`);
    assert.equal(plain.nextVisibleText, '→', `nút chuyển nhanh chỉ hiện mũi tên, nhận được "${plain.nextVisibleText}"`);
    // v1.18.4: thẻ công việc không còn nút ghim (đổi có chủ đích; kiểm riêng ở tests/kanban-pin-removed-browser.mjs).
    assert.ok(!plain.pin && plain.grip, `thẻ phải có tay kéo và không còn nút ghim ở ${width}px`);
    assert.equal(last.hasNext, false, 'thẻ ở cột cuối không được có nút chuyển nhanh');

    // "Thẻ gọn" làm thẻ thấp hơn thẻ thường.
    const before = (await cards(page)).find((c) => c.id === 'p1t8')?.h;
    await page.locator('#main .wf-display-options > summary').click();
    await page.locator('[data-studio=compact]').click();
    await page.waitForFunction(() => document.querySelector('.board')?.classList.contains('studio-compact'));
    const after = (await cards(page)).find((c) => c.id === 'p1t8')?.h;
    assert.ok(before && after && after < before, `Thẻ gọn phải thấp hơn thẻ thường (${after}px so với ${before}px) ở ${width}px`);
    await page.locator('#main .wf-display-options > summary').click();
    await page.locator('[data-studio=compact]').click();
    await page.waitForFunction(() => !document.querySelector('.board')?.classList.contains('studio-compact'));

    // Bấm mũi tên: việc chuyển sang cột kế tiếp.
    await page.locator('[data-task=p1t0] .task-next').click();
    await page.waitForFunction(() => data.projects[0].tasks.find((t) => t.id === 'p1t0').col === 'List');
    console.log('PASS kanban card at ' + width + 'px: ' + plain.h + 'px (thẻ có checklist ' + withChecks.h + 'px, Thẻ gọn ' + after + 'px so với ' + before + 'px)');
    await context.close();
  }

  // Màn hình cảm ứng: mũi tên đủ lớn để chạm (44px).
  {
    const { context, page } = await open(390, true);
    await fullCards(page);
    await show(page, 'projects');
    await page.waitForSelector('#main .task-card');
    const plain = (await cards(page)).find((c) => c.id === 'p1t0');
    assert.ok(plain.nextSize.w >= 44 && plain.nextSize.h >= 44, `ở màn hình cảm ứng nút chuyển nhanh ${plain.nextSize.w}x${plain.nextSize.h}px, phải từ 44px`);
    assert.ok(plain.h <= 240, `ở màn hình cảm ứng thẻ chưa có checklist cao ${plain.h}px, phải từ 240px trở xuống`);
    console.log('PASS kanban card on touch at 390px: ' + plain.h + 'px');
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
