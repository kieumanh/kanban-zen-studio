// Hồi quy v1.15.38: Thẻ gọn mặc định bật trên điện thoại (≤700px) khi người dùng chưa chọn, tắt ở màn hình rộng; lựa chọn của người dùng luôn được giữ; mặc định không ghi gì vào bộ nhớ thiết bị.
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

const reload = async (page) => {
  await page.reload();
  await page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa');
};

const state = (page) =>
  page.evaluate(() => {
    const card = (id) => document.querySelector(`#main .task-card[data-task="${id}"]`);
    const height = (id) => (card(id) ? Math.round(card(id).getBoundingClientRect().height) : null);
    const firstColumn = [...document.querySelector('#main .column').querySelectorAll('.task-card')];
    return {
      compact: document.querySelector('#main .board')?.classList.contains('studio-compact') === true,
      checked: document.querySelector('#main [data-studio=compact]')?.checked,
      saved: localStorage.getItem('zen-compact'),
      plain: height('p1t0'),
      withChecks: height('p1t4'),
      checksShown: !!card('p1t4')?.querySelector('.card-checks')?.getClientRects().length,
      descriptionShown: [...document.querySelectorAll('#main .wf-card-description')].some((el) => el.getClientRects().length > 0),
      column: Math.round(document.querySelector('#main .column').getBoundingClientRect().height),
      cards: firstColumn.length,
      vh: innerHeight,
      scrollW: document.documentElement.scrollWidth,
      vw: innerWidth,
    };
  });

const ready = async (page) => {
  await show(page, 'projects');
  await page.waitForSelector('#main .task-card');
};

const setCompactFromMenu = async (page) => {
  await page.locator('#main .wf-display-options > summary').click();
  await page.locator('#main [data-studio=compact]').click();
};

try {
  // 1. Mặc định theo độ rộng khi chưa từng chọn; mặc định không ghi gì vào bộ nhớ thiết bị.
  const results = {};
  for (const [label, width, touch] of [['390px cảm ứng', 390, true], ['390px chuột', 390, false], ['700px', 700, false], ['701px', 701, false], ['820px', 820, false], ['1440px', 1440, false]]) {
    const { context, page } = await open(width, touch);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await ready(page);
    const st = await state(page);
    const phone = width <= 700;
    assert.equal(st.compact, phone, `Thẻ gọn mặc định phải ${phone ? 'bật' : 'tắt'} ở ${label}, nhận được ${st.compact}`);
    assert.equal(st.checked, phone, `ô Thẻ gọn trong Hiển thị phải phản ánh mặc định ở ${label}`);
    assert.equal(st.saved, null, `mặc định không được ghi vào bộ nhớ thiết bị (${label}), nhận được "${st.saved}"`);
    assert.equal(st.checksShown, !phone, `checklist trên thẻ phải ${phone ? 'ẩn (thẻ gọn)' : 'hiện'} ở ${label}`);
    assert.ok(st.scrollW <= st.vw, `trang tràn ngang ${st.scrollW}px trong khung ${st.vw}px ở ${label}`);
    results[label] = st;
    await context.close();
  }

  // 2. Điện thoại: thẻ có checklist thấp hơn hẳn và cả cột ngắn đi so với thẻ đầy đủ (thẻ không có checklist/mô tả/bước tiếp theo gần như không đổi).
  {
    const { context, page } = await open(390, true);
    await page.setViewportSize({ width: 390, height: 844 });
    await ready(page);
    const compact = await state(page);
    await setCompactFromMenu(page);
    await page.waitForFunction(() => !document.querySelector('#main .board')?.classList.contains('studio-compact'));
    const full = await state(page);
    assert.ok(full.withChecks - compact.withChecks >= 100, `thẻ có checklist: gọn ${compact.withChecks}px so với đầy đủ ${full.withChecks}px, phải thấp hơn ít nhất 100px`);
    assert.ok(full.column - compact.column >= 100, `cột đầu tiên: gọn ${compact.column}px so với đầy đủ ${full.column}px, phải ngắn hơn ít nhất 100px`);
    assert.ok(compact.plain <= full.plain, `thẻ không có checklist ở chế độ gọn (${compact.plain}px) không được cao hơn thẻ đầy đủ (${full.plain}px)`);
    console.log('INFO 390 cảm ứng: thẻ gọn ' + compact.plain + 'px / có checklist ' + compact.withChecks + 'px; thẻ đầy đủ ' + full.plain + 'px / có checklist ' + full.withChecks + 'px; cột đầu tiên (' + compact.cards + ' thẻ) ' + compact.column + 'px (gọn) so với ' + full.column + 'px (đầy đủ)');
    // 3. Lựa chọn của người dùng được giữ: tắt Thẻ gọn rồi tải lại, vẫn tắt.
    assert.equal(full.saved, 'false', 'tắt Thẻ gọn phải được nhớ');
    await reload(page);
    await ready(page);
    const afterReload = await state(page);
    assert.equal(afterReload.compact, false, 'sau khi tải lại, lựa chọn "Thẻ đầy đủ" phải được giữ trên điện thoại');
    assert.equal(afterReload.saved, 'false');
    await context.close();
  }

  // 4. Màn hình rộng: bật Thẻ gọn rồi tải lại, vẫn bật.
  {
    const { context, page } = await open(820);
    await ready(page);
    await setCompactFromMenu(page);
    await page.waitForFunction(() => document.querySelector('#main .board')?.classList.contains('studio-compact'));
    await reload(page);
    await ready(page);
    const st = await state(page);
    assert.equal(st.compact, true, 'sau khi tải lại, Thẻ gọn đã bật phải được giữ ở màn hình rộng');
    assert.equal(st.saved, 'true');
    await context.close();
  }

  // 5. Chưa chọn thì mặc định đi theo độ rộng: thu hẹp cửa sổ xuống điện thoại thì Thẻ gọn bật, mở rộng lại thì tắt.
  {
    const { context, page } = await open(820);
    await ready(page);
    assert.equal((await state(page)).compact, false, '820px chưa chọn: Thẻ gọn phải tắt');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => render());
    await page.waitForFunction(() => document.querySelector('#main .board')?.classList.contains('studio-compact'));
    assert.equal((await state(page)).saved, null, 'đổi độ rộng không được ghi lựa chọn vào bộ nhớ');
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.evaluate(() => render());
    await page.waitForFunction(() => !document.querySelector('#main .board')?.classList.contains('studio-compact'));
    await context.close();
  }

  // 6. Lệnh nhanh "Thẻ gọn / đầy đủ" đảo đúng trạng thái hiện tại (mặc định bật trên điện thoại thì lần đầu là tắt).
  {
    const { context, page } = await open(390, true);
    await page.setViewportSize({ width: 390, height: 844 });
    await ready(page);
    assert.equal((await state(page)).compact, true);
    await page.keyboard.press('Control+k');
    await page.waitForFunction(() => document.querySelector('.studio-palette')?.open === true);
    await page.locator('.studio-palette input').fill('Thẻ gọn');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.querySelector('#main .board')?.classList.contains('studio-compact'));
    assert.equal((await state(page)).saved, 'false', 'lệnh nhanh phải ghi lựa chọn "đầy đủ"');
    await context.close();
  }
  console.log('PASS compact default: điện thoại bật, màn hình rộng tắt, lựa chọn được giữ, mặc định không ghi bộ nhớ, đổi độ rộng đi theo mặc định, lệnh nhanh đảo đúng');
} finally {
  await browser.close();
  server.close();
}
