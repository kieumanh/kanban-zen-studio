// Hồi quy v1.15.36: đầu trang dự án gọn. Một nút chính "Thêm việc"; Ghim / Lưu trữ / Tệp / Sửa dự án nằm trong menu "Tùy chọn"; "x/y việc xong" là số chính; thẻ đầu tiên hiện trong màn hình đầu ở 390px.
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

const geometry = (page) =>
  page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY), left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) };
    };
    const card = document.querySelector('#main .task-card');
    return {
      vw: innerWidth,
      vh: innerHeight,
      scrollW: document.documentElement.scrollWidth,
      cardTop: card ? box(card).top : null,
      titleBottom: card?.querySelector('h3') ? box(card.querySelector('h3')).bottom : null,
      dueBottom: card?.querySelector('.task-card-decision') ? box(card.querySelector('.task-card-decision')).bottom : null,
      primary: [...document.querySelectorAll('#main .board-head .btn.primary')].map((b) => b.textContent.trim()),
      headVisible: [...document.querySelectorAll('#main .board-head button, #main .board-head summary')].filter((b) => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden' && !b.closest('details:not([open]) > :not(summary)')).map((b) => b.textContent.trim().replace(/\s+/g, ' ')),
      summary: document.querySelector('#main .board-summary')?.innerText.replace(/\s+/g, ' ').trim() || '',
      strong: document.querySelector('#main .board-summary strong')?.textContent.trim() || '',
    };
  });

try {
  for (const width of [390, 701, 820, 1024, 1440]) {
    const touch = width === 390;
    const { context, page } = await open(width, touch);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await show(page, 'projects');
    await page.waitForSelector('#main .task-card');
    const g = await geometry(page);
    // 1. Một nút chính; các nút phụ không còn nằm ngang hàng với nó.
    assert.deepEqual(g.primary, ['Thêm việc'], `đầu trang chỉ được có một nút chính "Thêm việc" ở ${width}px, nhận được ${JSON.stringify(g.primary)}`);
    for (const hidden of ['Ghim', 'Lưu trữ', 'Tệp', 'Sửa dự án'])
      assert.ok(!g.headVisible.includes(hidden), `"${hidden}" phải nằm trong menu Tùy chọn, không hiện sẵn ở đầu trang (${width}px)`);
    assert.ok(g.headVisible.includes('Tùy chọn') && g.headVisible.includes('Hiển thị'), `thiếu menu Tùy chọn hoặc Hiển thị ở ${width}px: ${g.headVisible}`);
    assert.ok(g.headVisible.length <= 3, `đầu trang còn ${g.headVisible.length} nút hiện sẵn (${g.headVisible.join(', ')}) ở ${width}px, tối đa 3`);
    // 2. Khối tiến độ: "x/y việc xong" là số chính, bỏ chữ "task Done" và "đơn vị hoàn thành".
    assert.match(g.strong, /^\d+\/\d+$/, `số chính phải dạng "x/y", nhận được "${g.strong}" ở ${width}px`);
    assert.equal(g.strong, '3/14', `dự án mẫu có 3 trong 14 việc ở cột Hoàn thành (${width}px)`);
    assert.match(g.summary, /3\/14 việc xong/, `khối tiến độ phải ghi "3/14 việc xong": ${g.summary}`);
    // Dữ liệu mẫu: 3/14 việc xong; một việc có 2 mục checklist (1 xong) nên tính cả mục là 4/16 đơn vị = 25%.
    assert.match(g.summary, /25% tiến độ · tính cả mục checklist \(4\/16\)/, `khối tiến độ phải ghi phần trăm tính cả checklist: ${g.summary}`);
    assert.doesNotMatch(g.summary, /task Done|đơn vị hoàn thành|Mỗi task/, `khối tiến độ còn chữ cũ: ${g.summary}`);
    assert.equal(await page.locator('#main .board-summary [role=progressbar]').getAttribute('aria-valuenow'), '25', 'thanh tiến độ phải có aria-valuenow=25');
    // 3. Thẻ đầu tiên hiện trọn phần chính (tên việc và hàng hạn) trong màn hình đầu. Trước đây ở 390px thẻ bắt đầu ở 816px trên màn hình cao 844px (chỉ lộ 28px).
    assert.ok(g.cardTop !== null && g.dueBottom !== null && g.dueBottom <= g.vh, `hàng hạn của thẻ đầu tiên ở ${g.dueBottom}px, phải nằm trong màn hình đầu (cao ${g.vh}px) ở ${width}px`);
    const cardLimit = width <= 701 ? 700 : 620;
    assert.ok(g.cardTop <= cardLimit, `thẻ đầu tiên bắt đầu ở ${g.cardTop}px, phải từ ${cardLimit}px trở lên ở ${width}px`);
    assert.ok(g.scrollW <= g.vw, `trang tràn ngang ${g.scrollW}px trong khung ${g.vw}px ở ${width}px`);
    // 4. Hai nút phụ cũ vẫn bấm được ngay (chưa vào menu): Thẻ gọn, Giới hạn WIP, Lệnh nhanh.
    for (const name of ['compact', 'wip', 'commands'])
      assert.ok(await page.locator('[data-studio=' + name + ']').isVisible(), `nút [data-studio=${name}] phải còn hiện ở ${width}px`);

    // 5. Menu Tùy chọn: mở, bốn mục đủ lớn để bấm, nằm trong khung nhìn, không làm trang tràn.
    const menu = page.locator('#main .wf-project-menu');
    await menu.locator('summary').click();
    assert.equal(await menu.evaluate((el) => el.open), true, 'bấm Tùy chọn phải mở menu');
    const items = await menu.locator('.wf-project-menu-list button').evaluateAll((list) => list.map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), r: Math.round(r.right) }; }));
    assert.deepEqual(items.map((i) => i.t), ['Ghim', 'Lưu trữ', 'Tệp', 'Sửa dự án'], `mục trong menu Tùy chọn: ${JSON.stringify(items)}`);
    for (const i of items) {
      assert.ok(i.h >= (touch ? 44 : 36), `mục "${i.t}" cao ${i.h}px ở ${width}px, phải từ ${touch ? 44 : 36}px`);
      assert.ok(i.l >= 0 && i.r <= g.vw, `mục "${i.t}" nằm ngoài màn hình (${i.l}..${i.r}) ở ${width}px`);
    }
    assert.ok((await geometry(page)).scrollW <= g.vw, `mở menu làm trang tràn ngang ở ${width}px`);
    await assertInside(page, '#main .wf-project-menu-list', '#main .wf-project-menu-list button', `menu Tùy chọn (${width}px)`);
    // 6. Ghim qua menu: dữ liệu đổi, menu tự đóng, mục đổi thành "Bỏ ghim".
    await menu.locator('[data-project-pin]').click();
    await page.waitForFunction(() => project('p1').pinned === true);
    assert.equal(await page.locator('#main .wf-project-menu').evaluate((el) => el.open), false, 'chọn một mục xong menu phải đóng');
    await page.locator('#main .wf-project-menu summary').click();
    assert.match(await page.locator('#main .wf-project-menu [data-project-pin]').innerText(), /Bỏ ghim/, 'mục ghim phải đổi thành "Bỏ ghim"');
    // 7. Esc đóng menu và trả tiêu điểm về nút Tùy chọn.
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#main .wf-project-menu').evaluate((el) => el.open), false, 'Esc phải đóng menu');
    assert.equal(await page.evaluate(() => document.activeElement?.closest('.wf-project-menu > summary') !== null), true, 'sau Esc tiêu điểm phải về nút Tùy chọn');
    // 8. Bấm ra ngoài đóng menu; mở Hiển thị thì đóng Tùy chọn (không chồng hai bảng).
    await page.locator('#main .wf-project-menu summary').click();
    await page.locator('#main .board-head h1').click();
    assert.equal(await page.locator('#main .wf-project-menu').evaluate((el) => el.open), false, 'bấm ra ngoài phải đóng menu');
    await page.locator('#main .wf-project-menu summary').click();
    await page.locator('#main .wf-display-options > summary').click();
    assert.equal(await page.locator('#main .wf-project-menu').evaluate((el) => el.open), false, 'mở Hiển thị phải đóng Tùy chọn');
    const options = await page.locator('#main .kanban-options').evaluate((el) => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right) }; });
    assert.ok(options.l >= 0 && options.r <= g.vw, `bảng Hiển thị nằm ngoài màn hình (${options.l}..${options.r}) ở ${width}px`);
    assert.ok((await geometry(page)).scrollW <= g.vw, `mở Hiển thị làm trang tràn ngang ở ${width}px`);
    await assertInside(page, '#main .kanban-options', '#main .kanban-options input', `bảng Hiển thị (${width}px)`);
    await page.locator('#main .wf-display-options > summary').click();
    // 9. "Sửa dự án" vẫn mở biểu mẫu sửa dự án.
    await page.locator('#main .wf-project-menu summary').click();
    await page.locator('#main .wf-project-menu [data-action=edit-project]').click();
    await page.waitForFunction(() => document.querySelector('#editor')?.open && document.querySelector('#editor [name=name]'));
    assert.equal(await page.locator('#editor [name=name]').inputValue(), 'Khóa tu mùa thu', 'biểu mẫu sửa dự án phải mở đúng dự án');
    console.log('PASS project header at ' + width + 'px: thẻ đầu bắt đầu ở ' + g.cardTop + 'px, hàng hạn ở ' + g.dueBottom + 'px, nút hiện sẵn: ' + g.headVisible.join(' / ') + ', tiến độ: ' + g.strong);
    await context.close();
  }

  // Dự án chưa có việc nào: không hiện "0/0".
  {
    const { context, page } = await open(390);
    await page.evaluate(() => { project('p3').tasks = []; });
    await page.evaluate(() => go('projects', 'p3'));
    await page.waitForFunction(() => view === 'projects' && document.querySelector('#main .board-summary strong'));
    const empty = await page.locator('#main .board-summary').innerText();
    assert.doesNotMatch(empty, /0\/0/, `dự án rỗng không được hiện "0/0": ${empty}`);
    assert.match(empty, /Chưa có việc nào/, `dự án rỗng phải ghi "Chưa có việc nào": ${empty}`);
    console.log('PASS project header with no tasks');
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
