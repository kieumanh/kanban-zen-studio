// Hồi quy v1.15.37 (cập nhật v1.15.38: Thẻ gọn mặc định bật trên điện thoại): Thẻ gọn, Giới hạn WIP và Lệnh nhanh nằm trong menu "Hiển thị" (không còn thanh công cụ riêng dưới khối tiến độ); các nút vẫn hoạt động như cũ, menu nằm trong vùng nội dung và không bị che.
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
  await page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa');
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

// Bảng mở ra phải nằm trong vùng nội dung (#main), không đè lên thanh bên, và mọi điểm bấm trong bảng đúng là phần tử của bảng (không bị lớp khác che).
async function assertInside(page, panelSelector, itemSelector, label) {
  const r = await page.evaluate(
    ({ panelSelector, itemSelector }) => {
      const main = document.querySelector('#main').getBoundingClientRect(), panel = document.querySelector(panelSelector).getBoundingClientRect();
      const covered = [...document.querySelectorAll(itemSelector)].filter((el) => {
        const b = el.getBoundingClientRect(), hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return !(hit && (hit === el || el.contains(hit) || hit.contains(el)));
      }).map((el) => el.textContent.trim() || el.name || el.tagName);
      return { mainLeft: Math.round(main.left), mainRight: Math.round(main.right), left: Math.round(panel.left), right: Math.round(panel.right), covered };
    },
    { panelSelector, itemSelector },
  );
  assert.ok(r.left >= r.mainLeft - 1 && r.right <= r.mainRight + 1, `${label} nằm ngoài vùng nội dung: ${r.left}..${r.right} so với ${r.mainLeft}..${r.mainRight}`);
  assert.deepEqual(r.covered, [], `${label} có mục bị lớp khác che: ${r.covered}`);
}

const cardGeometry = (page) =>
  page.evaluate(() => {
    const card = document.querySelector('#main .task-card'), due = card?.querySelector('.task-card-decision');
    const top = (el) => (el ? Math.round(el.getBoundingClientRect().top + scrollY) : null);
    return { vw: innerWidth, vh: innerHeight, scrollW: document.documentElement.scrollWidth, cardTop: top(card), dueBottom: due ? Math.round(due.getBoundingClientRect().bottom + scrollY) : null };
  });

const openMenu = async (page) => {
  await page.locator('#main .wf-display-options > summary').click();
  await page.waitForFunction(() => document.querySelector('#main .wf-display-options')?.open === true);
};

try {
  for (const width of [390, 701, 820, 1024, 1440]) {
    const touch = width === 390;
    const { context, page } = await open(width, touch);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await show(page, 'projects');
    await page.waitForSelector('#main .task-card');
    const g = await cardGeometry(page);
    // 1. Không còn thanh công cụ riêng; ba mục không hiện sẵn.
    assert.equal(await page.locator('.studio-board-tools').count(), 0, `không còn thanh công cụ riêng dưới khối tiến độ (${width}px)`);
    for (const name of ['compact', 'wip', 'commands'])
      assert.equal(await page.locator('[data-studio=' + name + ']').isVisible(), false, `[data-studio=${name}] phải nằm trong menu Hiển thị (${width}px)`);
    // 2. Thẻ đầu tiên hiện trọn phần chính trong màn hình đầu và nằm cao hơn v1.15.36 (390px: 659px; 820px: 607px; 1440px: 556px).
    const limit = { 390: 660, 701: 630, 820: 570, 1024: 520, 1440: 520 }[width];
    assert.ok(g.dueBottom !== null && g.dueBottom <= g.vh, `hàng hạn của thẻ đầu tiên ở ${g.dueBottom}px, phải nằm trong màn hình đầu (cao ${g.vh}px) ở ${width}px`);
    assert.ok(g.cardTop <= limit, `thẻ đầu tiên bắt đầu ở ${g.cardTop}px, phải từ ${limit}px trở lên ở ${width}px`);

    // 3. Mở Hiển thị: đủ năm mục, đủ lớn để bấm, nằm trong vùng nội dung, không bị che, không làm trang tràn ngang.
    await openMenu(page);
    const rows = await page.locator('#main .kanban-options').evaluate((panel) =>
      [...panel.querySelectorAll('label, .wf-display-actions .btn')].map((el) => {
        const r = el.getBoundingClientRect();
        return { t: el.textContent.replace(/\s+/g, ' ').replace(/Ctrl \/ ⌘ K/, '').trim(), h: Math.round(r.height) };
      }),
    );
    assert.deepEqual(rows.map((r) => r.t), ['Thanh tiến độ', 'Hiện checklist trên thẻ', 'Thẻ gọn', 'Giới hạn WIP', 'Lệnh nhanh'], `các mục trong Hiển thị (${width}px): ${JSON.stringify(rows)}`);
    for (const r of rows.slice(2)) assert.ok(r.h >= (touch ? 44 : 30), `mục "${r.t}" cao ${r.h}px ở ${width}px, phải từ ${touch ? 44 : 30}px`);
    await assertInside(page, '#main .kanban-options', '#main .kanban-options input, #main .kanban-options .btn', `bảng Hiển thị (${width}px)`);
    assert.ok((await cardGeometry(page)).scrollW <= g.vw, `mở Hiển thị làm trang tràn ngang ở ${width}px`);
    assert.equal(await page.locator('#main .kanban-options kbd').isVisible(), width > 700, `gợi ý phím Ctrl / ⌘ K phải ${width > 700 ? 'hiện' : 'ẩn'} ở ${width}px`);

    // 4. Thẻ gọn: bật/tắt đúng, nhớ lựa chọn, ô đánh dấu phản ánh trạng thái sau khi bảng vẽ lại. Từ v1.15.38 mặc định bật trên điện thoại (≤700px), tắt ở màn hình rộng.
    const phone = width <= 700;
    const compactBox = page.locator('#main [data-studio=compact]');
    assert.equal(await compactBox.isChecked(), phone, `Thẻ gọn mặc định phải ${phone ? 'bật' : 'tắt'} (${width}px)`);
    await compactBox.click();
    await page.waitForFunction((on) => document.querySelector('#main .board')?.classList.contains('studio-compact') === on, !phone);
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-compact')), String(!phone), 'lựa chọn Thẻ gọn phải được nhớ trên thiết bị');
    await openMenu(page);
    assert.equal(await page.locator('#main [data-studio=compact]').isChecked(), !phone, 'ô Thẻ gọn phải phản ánh lựa chọn vừa đổi');
    await page.locator('#main [data-studio=compact]').click();
    await page.waitForFunction((on) => document.querySelector('#main .board')?.classList.contains('studio-compact') === on, phone);

    // 5. Giới hạn WIP: mở biểu mẫu, lưu, huy hiệu cột đổi thành "x/1".
    await openMenu(page);
    await page.locator('#main [data-studio=wip]').click();
    await page.waitForFunction(() => document.querySelector('#editor')?.open && document.querySelector('#editor [name=limit1]'));
    await page.locator('#editor [name=limit1]').fill('1');
    await page.locator('#editor-form button[type=submit]').click();
    await page.waitForFunction(() => project('p1').wipLimits?.List === 1);
    await page.waitForFunction(() => /^\d+\/1$/.test(document.querySelector('#main .column[data-column=List] .studio-wip')?.textContent.trim() || ''));

    // 6. Lệnh nhanh: mở được từ menu và từ Ctrl/⌘ K, Esc đóng.
    await openMenu(page);
    await page.locator('#main [data-studio=commands]').click();
    await page.waitForFunction(() => document.querySelector('.studio-palette')?.open === true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('.studio-palette')?.open === false);
    await page.keyboard.press('Control+k');
    await page.waitForFunction(() => document.querySelector('.studio-palette')?.open === true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('.studio-palette')?.open === false);
    console.log('PASS display menu at ' + width + 'px: thẻ đầu bắt đầu ở ' + g.cardTop + 'px, hàng hạn ở ' + g.dueBottom + 'px, năm mục trong Hiển thị');
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
