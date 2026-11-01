// Hồi quy v1.15.39: từ ngữ giao diện tiếng Việt thống nhất. Quét chữ hiển thị (kể cả phần đang thu gọn trong hướng dẫn) và các thuộc tính đọc được
// (aria-label, title, placeholder, alt) trên mọi màn hình, hộp thoại và thông báo, ở 390/820/1440px; không được còn "Timeline", "Calendar", "task",
// "Done"... lẫn trong câu tiếng Việt. Dữ liệu mẫu của test cố ý không chứa các từ này, nên mọi lần khớp đều là chữ của giao diện.
// Không quét màn hình "Nhật ký phát triển" (versions): đó là lịch sử các bản đã phát hành, giữ nguyên chữ gốc.
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

// Từ không được xuất hiện trong chữ giao diện. "Kanban", "Gantt", "checklist", "JSON" là tên phương pháp / loại tệp nên giữ.
const FORBIDDEN = /\b(task|tasks|Task|Tasks|Timeline|Calendar|Dashboard|Settings|Done|Doing|Idea|List|WIP|Copy)\b/;

const project = (id, name, color, count, extra = {}) => ({
  ...extra,
  id,
  name,
  description: 'Mô tả ngắn của dự án',
  color,
  icon: '✺',
  columns: ['Idea', 'List', 'Doing', 'Done'],
  columnNames: { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang thực hiện', Done: 'Hoàn thành' },
  tasks: Array.from({ length: count }, (_, i) => ({ id: id + 't' + i, title: 'Việc số ' + (i + 1), col: ['Idea', 'List', 'Doing', 'Done'][i % 4], description: '', due: '2026-11-0' + (1 + (i % 8)), tag: 'Công việc', priority: 'q2', checks: id === 'p1' && i === 3 ? [{ id: 'c1', text: 'Bước một', done: true }, { id: 'c2', text: 'Bước hai', done: false }] : [] })),
});
const seed = { schema: 1, projects: [project('p1', 'Khóa tu mùa thu', '#7950c8', 14), project('p2', 'Hương Thiền Nature — Website', '#c764a2', 5), project('p3', 'Sổ nợ An Tâm', '#e78c56', 4), project('p4', 'Dự án đã cất', '#44aa88', 3, { archived: true })], notes: [] };
const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

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

// Chuyển view rồi đợi tới khi tiêu đề của view đó thật sự hiện ra (không dựa vào độ trễ cố định).
async function show(page, name) {
  const ready = (name) => document.querySelector('#main h1') && view === name;
  await page.evaluate((name) => go(name, 'p1'), name);
  await page.waitForFunction(ready, name, { timeout: 10000 }).catch(async () => {
    await page.evaluate((name) => go(name, 'p1'), name);
    await page.waitForFunction(ready, name, { timeout: 10000 });
  });
}

// Lấy mọi chữ giao diện: nút văn bản, thuộc tính đọc được, kể cả phần ẩn (hướng dẫn thu gọn, thanh chỉ hiện ở độ rộng khác).
const collect = (page) =>
  page.evaluate(() => {
    const out = [];
    const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA', 'INPUT']);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode,
        el = node.parentElement,
        text = node.textContent.replace(/\s+/g, ' ').trim();
      if (!text || !el || SKIP.has(el.tagName)) continue;
      out.push({ kind: 'chữ', text, where: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).slice(0, 2).join('.') : '') });
    }
    for (const el of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]'))
      for (const a of ['aria-label', 'title', 'placeholder', 'alt']) {
        const v = el.getAttribute(a);
        if (v) out.push({ kind: a, text: v, where: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).slice(0, 2).join('.') : '') });
      }
    return out;
  });

const hits = new Map();
let scanned = 0;
async function scan(page, label) {
  const items = await collect(page);
  scanned += items.length;
  for (const it of items) {
    if (!FORBIDDEN.test(it.text)) continue;
    const key = it.kind + '|' + it.text;
    if (!hits.has(key)) hits.set(key, { ...it, labels: new Set() });
    hits.get(key).labels.add(label);
  }
}

try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const { context, page } = await open(width, touch);
    const tag = (s) => width + 'px ' + s;
    const closeDialogs = async () => {
      await page.evaluate(() => {
        for (const d of document.querySelectorAll('dialog[open]')) d.close();
      });
    };

    // 1. Mọi màn hình chính (trừ nhật ký phát triển, xem ghi chú đầu tệp).
    for (const v of ['dashboard', 'projects', 'tasks', 'timeline', 'calendar', 'gantt', 'notes', 'resources', 'archive', 'trash', 'focus']) {
      await show(page, v);
      await scan(page, tag('màn hình ' + v));
    }

    // 2. Tên các chế độ xem phải là tiếng Việt, cùng một bộ tên ở thanh bên, thanh chế độ xem trên điện thoại, tiêu đề và đường dẫn.
    await show(page, 'projects');
    const names = await page.evaluate(() => ({
      sidebar: [...document.querySelectorAll('.sidebar .view-options .view-mode')].map((b) => b.textContent.trim()),
      phone: [...document.querySelectorAll('.mobile-viewbar .view-mode')].map((b) => b.textContent.trim()),
    }));
    const expected = ['Bảng Kanban', 'Dòng thời gian', 'Lịch', 'Gantt'];
    assert.deepEqual(names.sidebar, expected, `tên chế độ xem ở thanh bên (${width}px): ${JSON.stringify(names.sidebar)}`);
    assert.deepEqual(names.phone, expected, `tên chế độ xem ở thanh trên điện thoại (${width}px): ${JSON.stringify(names.phone)}`);
    await show(page, 'timeline');
    const timelineHead = await page.evaluate(() => ({ h1: document.querySelector('#main h1').textContent.trim(), crumb: document.querySelector('#crumb').textContent.trim() }));
    assert.equal(timelineHead.h1, 'Dòng thời gian', `tiêu đề màn Dòng thời gian (${width}px): ${timelineHead.h1}`);
    assert.ok(timelineHead.crumb.startsWith('Dòng thời gian'), `đường dẫn màn Dòng thời gian (${width}px): ${timelineHead.crumb}`);
    await show(page, 'calendar');
    const calendarHead = await page.evaluate(() => ({ h1: document.querySelector('#main h1').textContent.trim(), crumb: document.querySelector('#crumb').textContent.trim() }));
    assert.equal(calendarHead.h1, 'Lịch', `tiêu đề màn Lịch (${width}px): ${calendarHead.h1}`);
    assert.ok(calendarHead.crumb.startsWith('Lịch'), `đường dẫn màn Lịch (${width}px): ${calendarHead.crumb}`);

    // 3. Thanh chế độ xem trên điện thoại: nhãn dài hơn nhưng vẫn một dòng, thanh chỉ cao thêm vài px (khung dính phía trên và scroll-padding phụ thuộc chiều cao này).
    if (width < 700) {
      const bar = await page.evaluate(() => {
        const bar = document.querySelector('.mobile-viewbar');
        return {
          h: Math.round(bar.getBoundingClientRect().height),
          labels: [...bar.querySelectorAll('.view-mode')].map((b) => {
            const s = b.querySelector('span'), r = s.getBoundingClientRect();
            return { t: s.textContent.trim(), h: Math.round(r.height), clipped: s.scrollWidth > s.clientWidth + 1 || b.scrollWidth > b.clientWidth + 1 };
          }),
        };
      });
      assert.ok(bar.h <= 56, `thanh chế độ xem trên điện thoại cao ${bar.h}px (tối đa 56px)`);
      for (const l of bar.labels) {
        assert.ok(l.h <= 16, `nhãn "${l.t}" xuống dòng (cao ${l.h}px)`);
        assert.ok(!l.clipped, `nhãn "${l.t}" bị cắt`);
      }
    }

    // 4. Tên cột trong nhãn đọc-được (aria-label) dùng tên hiển thị, không dùng khóa Idea/List/Doing/Done.
    await show(page, 'projects');
    const addLabels = await page.evaluate(() => [...document.querySelectorAll('[data-action=new-task][aria-label]')].map((b) => b.getAttribute('aria-label')));
    assert.deepEqual(addLabels.slice(0, 4), ['Thêm việc vào cột Ý tưởng', 'Thêm việc vào cột Việc cần làm', 'Thêm việc vào cột Đang thực hiện', 'Thêm việc vào cột Hoàn thành'], `nhãn nút thêm việc: ${JSON.stringify(addLabels)}`);
    await scan(page, tag('bảng dự án'));

    // 5. Hộp thoại.
    const dialogs = {
      'thêm việc': () => page.evaluate(() => taskForm(project('p1'))),
      'dự án mới': () => page.evaluate(() => projectForm()),
      'sửa dự án': () => page.evaluate(() => projectForm(project('p1'))),
      'chi tiết việc': () => page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[3])),
      'hướng dẫn': () => page.evaluate(() => document.querySelector('[data-action=help]')?.click()),
      'tài khoản': () => page.evaluate(() => accountPanel()),
      chuông: () => page.evaluate(() => document.querySelector('#bell')?.click()),
    };
    for (const [name, openDialog] of Object.entries(dialogs)) {
      await openDialog();
      await page.waitForFunction(() => document.querySelector('dialog[open]') || document.querySelector('#bell-panel:not([hidden])') || document.querySelector('.bell-panel'), null, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(250);
      await scan(page, tag('hộp thoại ' + name));
      await closeDialogs();
    }

    // 6. Hộp thoại sao chép việc sang dự án khác, và thông báo lưu trữ / khôi phục.
    await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[3]));
    await page.waitForSelector('[data-wf-transfer=copy]');
    const copyLabel = await page.locator('[data-wf-transfer=copy]').first().innerText();
    assert.equal(copyLabel.trim(), 'Sao chép sang dự án', `nút sao chép: "${copyLabel}"`);
    await page.evaluate(() => document.querySelector('[data-wf-transfer=copy]').click());
    await page.waitForTimeout(300);
    await scan(page, tag('hộp thoại sao chép'));
    await closeDialogs();
    await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[3]));
    await page.waitForTimeout(250);
    const archiveLabel = await page.evaluate(() => [...document.querySelectorAll('dialog[open] button')].map((b) => b.textContent.trim()).find((t) => /^Lưu trữ/.test(t)) || '');
    assert.equal(archiveLabel, 'Lưu trữ việc', `nút lưu trữ việc: "${archiveLabel}"`);
    await page.evaluate(() => [...document.querySelectorAll('dialog[open] button')].find((b) => b.textContent.trim() === 'Lưu trữ việc').click());
    await page.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('lưu trữ'), null, { timeout: 5000 });
    const toast = await page.locator('#toast').innerText();
    assert.equal(toast.trim(), 'Đã lưu trữ việc.', `thông báo lưu trữ: "${toast}"`);
    await scan(page, tag('thông báo lưu trữ'));
    await closeDialogs();
    await show(page, 'archive');
    await scan(page, tag('màn hình lưu trữ có việc'));

    // 6b. Ô "Cột" của biểu mẫu việc hiện tên hiển thị (không phải khóa Idea/List/Doing/Done) nhưng vẫn lưu đúng khóa của cột.
    await show(page, 'projects');
    await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[0]));
    await page.waitForSelector('dialog[open] select[name=col]', { state: 'attached' });
    const statusOptions = await page.evaluate(() => [...document.querySelector('dialog[open] select[name=col]').options].map((o) => [o.value, o.textContent.trim()]));
    assert.deepEqual(statusOptions, [['Idea', 'Ý tưởng'], ['List', 'Việc cần làm'], ['Doing', 'Đang thực hiện'], ['Done', 'Hoàn thành']], `các lựa chọn của ô Cột: ${JSON.stringify(statusOptions)}`);
    await page.evaluate(() => {
      const select = document.querySelector('dialog[open] select[name=col]');
      select.value = [...select.options].find((o) => o.textContent.trim() === 'Đang thực hiện').value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.evaluate(() => document.querySelector('#editor-form').requestSubmit());
    await page.waitForFunction(() => project('p1').tasks[0].col === 'Doing', null, { timeout: 5000 });
    await closeDialogs();

    // 7. Menu Hiển thị, giới hạn việc mỗi cột (nhãn, biểu mẫu, huy hiệu, thông báo), bảng lệnh.
    await show(page, 'projects');
    await page.locator('.wf-display-options>summary').click();
    await scan(page, tag('menu Hiển thị'));
    const wipRow = await page.locator('.wf-display-options [data-studio=wip]').innerText();
    assert.equal(wipRow.trim(), 'Giới hạn việc mỗi cột', `mục giới hạn trong menu Hiển thị: "${wipRow}"`);
    await page.locator('.wf-display-options [data-studio=wip]').click();
    await page.waitForSelector('dialog[open] input[name=limit0]');
    await scan(page, tag('biểu mẫu giới hạn'));
    const wipTitle = await page.locator('dialog[open] h2').first().innerText();
    assert.equal(wipTitle.trim(), 'Giới hạn việc mỗi cột', `tiêu đề biểu mẫu giới hạn: "${wipTitle}"`);
    await page.fill('dialog[open] input[name=limit0]', '1');
    await page.evaluate(() => document.querySelector('#editor-form').requestSubmit());
    await page.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('giới hạn'), null, { timeout: 5000 });
    assert.equal((await page.locator('#toast').innerText()).trim(), 'Đã lưu giới hạn việc mỗi cột.');
    await page.waitForSelector('.studio-wip[title^="Giới hạn việc mỗi cột: 1"]');
    await scan(page, tag('huy hiệu giới hạn'));
    await page.keyboard.press('Control+k');
    await page.waitForFunction(() => document.querySelector('.studio-palette')?.open === true);
    await scan(page, tag('bảng lệnh'));
    await page.keyboard.press('Escape');

    await context.close();
    console.log('PASS ngôn ngữ ở ' + width + 'px: ' + scanned + ' đoạn chữ và thuộc tính đã quét');
    scanned = 0;
  }

  const rows = [...hits.values()].map((r) => `[${r.kind}] "${r.text.slice(0, 120)}" @${r.where} <- ${[...r.labels].slice(0, 3).join('; ')}`);
  assert.equal(rows.length, 0, `còn ${rows.length} chữ giao diện lẫn từ tiếng Anh:\n  ` + rows.join('\n  '));
  console.log('PASS ngôn ngữ: không còn Timeline / Calendar / task / Done / WIP / Copy lẫn trong chữ giao diện');
} finally {
  await browser.close();
  server.close();
}
