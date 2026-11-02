// Hồi quy v1.15.42: danh sách việc gọn (màn hình "Tất cả việc"). Đo ở 390px (cảm ứng) / 820px (cảm ứng) / 1180–1181px / 1440px:
//  1. mỗi hàng việc thấp: ≤150px ở 390px, 820px và 1180px (trước 309px và 114–163px; hàng có tên dài tối đa hai dòng), ≤64px ở 1181px trở lên (trước 98px), kể cả hàng có tên rất dài; không tràn ngang;
//  2. không còn nhãn "Hạn chót" lặp ở từng hàng; việc quá hạn ghi "Quá hạn" đúng một lần, cạnh tên dự án; tên dự án nằm trong ô tên việc, không còn cột Dự án;
//  3. việc đã xong nằm cuối ở thứ tự mặc định và sau khi đổi sang "Tên A–Z", "Hạn gần nhất"; việc xong gạch ngang và dùng màu chữ phụ;
//  4. ô chọn hàng có giải thích (tiêu đề, mô tả đọc được, dòng chú thích nhìn thấy được);
//  5. ngày và ưu tiên là chip: ≥44px cao khi cảm ứng, ≤36px khi chuột; nhãn đọc-được kèm giá trị hiện tại; ngày vẫn hiện đúng dd/mm/yyyy; đổi ưu tiên vẫn lưu;
//  6. lọc bằng ô tìm vẫn ẩn được hàng (hàng có thuộc tính hidden không được hiện lại bởi bố cục lưới).
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { flatten, inflate } from '../dist/modules/delta.mjs';
import worker from '../worker.mjs';
import { validWorkspace } from '../server/api.mjs';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
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
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const day = new Date().toLocaleDateString('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
});
const shift = (n) =>
  new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000)
    .toISOString()
    .slice(0, 10);
const COLS = ['Idea', 'List', 'Doing', 'Done'];
const project = (id, name, color, count, extra = {}) => ({
  ...extra,
  id,
  name,
  description: 'Mô tả ngắn của dự án',
  color,
  icon: '✺',
  columns: COLS,
  columnNames: {
    Idea: 'Ý tưởng',
    List: 'Việc cần làm',
    Doing: 'Đang thực hiện',
    Done: 'Hoàn thành',
  },
  keywords: [
    { name: 'Khẩn', color: '#b42318' },
    { name: 'Nhẹ nhàng', color: '#2e7d5b' },
  ],
  tasks: Array.from({ length: count }, (_, i) => {
    const col = COLS[i % 4];
    return {
      id: id + 't' + i,
      title:
        i === 5
          ? 'Chuẩn bị tài liệu hướng dẫn thực hành thiền cho khóa tu mùa thu tại chùa, gồm lịch trình, danh sách vật dụng và quy tắc sinh hoạt'
          : 'Việc số ' + (i + 1),
      col,
      description:
        i % 3 === 0 ? 'Mô tả ngắn của việc để thẻ có đủ nội dung.' : '',
      due: [shift(-3), shift(0), shift(2), shift(7), shift(-1)][(i * 3) % 5],
      tag: 'Công việc',
      priority: ['q1', 'q2', 'q3', 'q4', ''][i % 5],
      labels: i % 2 ? [{ name: 'Khẩn', color: '#b42318' }] : [],
      checks:
        i === 3
          ? [
              { id: id + 'c1', text: 'Bước một', done: true },
              { id: id + 'c2', text: 'Bước hai', done: false },
            ]
          : [],
    };
  }),
});
const seed = {
  schema: 1,
  projects: [
    project('p1', 'Khóa tu mùa thu', '#7950c8', 14),
    project('p2', 'Hương Thiền Nature — Website', '#c764a2', 8),
    project('p3', 'Sổ nợ An Tâm', '#e78c56', 6),
    project('p4', 'Dự án đã cất', '#44aa88', 3, { archived: true }),
  ],
  notes: [],
};

async function open(width, touch = false) {
  const context = await browser.newContext({
    viewport: { width, height: width < 700 ? 844 : 900 },
    timezoneId: 'Asia/Ho_Chi_Minh',
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  });
  const page = await context.newPage();
  let workspace = structuredClone(seed),
    revision = 1;
  await context.addInitScript(
    ({ day }) => {
      const prev = new Date(Date.parse(day + 'T00:00:00Z') - 86400000)
        .toISOString()
        .slice(0, 10);
      for (const d of [day, prev])
        for (let i = 0; i < 4; i++)
          localStorage.setItem('zen-welcome:qa:' + d + ':' + i, 'seen');
    },
    { day },
  );
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname.slice(5);
    let result = {};
    if (path === 'me')
      result = {
        user: {
          id: 'qa',
          name: 'Kiểm tra',
          email: 'qa@example.test',
          session_expires: Date.now() + 600000,
        },
      };
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
        if (!validWorkspace(b.data))
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid workspace' }),
          });
        workspace = b.data;
        result = { revision: ++revision };
      } else result = { data: workspace, revision };
    } else if (path === 'notification-receipts')
      result = req.method() === 'PUT' ? { ok: true } : { keys: [] };
    else if (path === 'activity') result = { expires: Date.now() + 600000 };
    else if (path === 'resources')
      result = { files: [], total: 0, used: 0, offset: 0 };
    else if (path === 'assets')
      result = { files: [], used: 0, quota: 1000000000 };
    else if (path === 'files') result = { files: [] };
    else if (path === 'report-shares') result = { shares: [] };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
    });
  });
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.goto('http://127.0.0.1:' + server.address().port);
  await page.waitForFunction(
    () => typeof _WF !== 'undefined' && currentUser?.id === 'qa' && document.documentElement.dataset.zenReady === '1',
  );
  return { context, page };
}

async function show(page, name) {
  const ready = (name) => document.querySelector('#main h1') && view === name;
  await page.evaluate((name) => go(name, 'p1'), name);
  await page
    .waitForFunction(ready, name, { timeout: 10000 })
    .catch(async () => {
      await page.evaluate((name) => go(name, 'p1'), name);
      await page.waitForFunction(ready, name, { timeout: 10000 });
    });
  await page.waitForTimeout(250);
}

const rowsInfo = (page) =>
  page.evaluate(() => {
    const rows = [
      ...document.querySelectorAll('#main .task-table tbody tr[data-task]'),
    ].filter((r) => r.checkVisibility());
    return rows.map((r) => ({
      id: r.dataset.task,
      h: Math.round(r.getBoundingClientRect().height),
      col: r.querySelector('.status')?.textContent.trim(),
      done: r.querySelector('.status')?.textContent.trim() === 'Hoàn thành',
      late: r.classList.contains('zen-row-overdue'),
      title:
        (
          r.querySelector('.zen-row-title') || r.querySelector('td.task-name')
        )?.textContent.trim() ?? '',
    }));
  });

const configs = [
  { w: 390, touch: true, maxRow: 150 },
  { w: 820, touch: true, maxRow: 150 },
  { w: 1180, touch: false, maxRow: 150 },
  { w: 1181, touch: false, maxRow: 64 },
  { w: 1440, touch: false, maxRow: 64 },
];
const problems = [];
const fail = (cfg, msg) =>
  problems.push(`${cfg.w}px${cfg.touch ? ' cảm ứng' : ''}: ${msg}`);

for (const cfg of configs) {
  const { context, page } = await open(cfg.w, cfg.touch);
  await show(page, 'tasks');
  const rows = await rowsInfo(page);
  if (rows.length < 20) fail(cfg, `chỉ thấy ${rows.length} hàng việc, cần ≥20`);

  // 1. chiều cao hàng, tràn ngang
  const tall = rows.filter((r) => r.h > cfg.maxRow);
  if (tall.length)
    fail(
      cfg,
      `${tall.length}/${rows.length} hàng cao hơn ${cfg.maxRow}px (cao nhất ${Math.max(...rows.map((r) => r.h))}px: ${tall[0].title.slice(0, 30)})`,
    );
  const over = await page.evaluate(
    () => document.documentElement.scrollWidth - innerWidth,
  );
  if (over > 0) fail(cfg, `trang tràn ngang ${over}px`);

  // 2. nhãn, tên dự án, cột
  const text = await page.evaluate(() => {
    const body = document.querySelector('#main .task-table tbody');
    const visible = (el) =>
      el.checkVisibility({
        contentVisibilityAuto: true,
        visibilityProperty: true,
      });
    const rows = [...body.querySelectorAll('tr[data-task]')].filter(visible);
    return {
      dueLabels: [...body.querySelectorAll('.zen-due-label')].filter(visible)
        .length,
      repeated: [...body.querySelectorAll('*')].filter(
        (e) =>
          visible(e) &&
          e.children.length === 0 &&
          /^Hạn chót$/.test(e.textContent.trim()),
      ).length,
      lateTags: rows.map((r) => r.querySelectorAll('.zen-row-late').length),
      lateRows: rows.map((r) => r.classList.contains('zen-row-overdue')),
      noProject: rows.filter(
        (r) =>
          !r
            .querySelector('td.task-name .zen-row-project-name')
            ?.textContent.trim(),
      ).length,
      projectCells: body.querySelectorAll('td[data-label="Dự án"]').length,
      headers: [...document.querySelectorAll('#main .task-table th')]
        .filter(visible)
        .map((e) => e.textContent.trim()),
      sample: rows
        .slice(0, 3)
        .map((r) => [
          r.querySelector('.zen-row-project-name')?.textContent.trim(),
          r.querySelector('.zen-row-title')?.textContent.trim(),
        ]),
    };
  });
  if (text.dueLabels || text.repeated)
    fail(
      cfg,
      `còn ${text.dueLabels + text.repeated} nhãn "Hạn chót" lặp ở các hàng`,
    );
  if (text.lateTags.some((n, i) => n !== (text.lateRows[i] ? 1 : 0)))
    fail(
      cfg,
      'mỗi hàng quá hạn phải có đúng một "Quá hạn", hàng còn lại không có',
    );
  if (!text.lateRows.some(Boolean))
    fail(cfg, 'dữ liệu mẫu không có việc quá hạn để kiểm tra');
  if (text.noProject)
    fail(cfg, `${text.noProject} hàng thiếu tên dự án trong ô tên việc`);
  if (text.projectCells) fail(cfg, 'còn cột "Dự án" riêng');
  if (
    cfg.w >= 1181 &&
    (text.headers.includes('DỰ ÁN') ||
      !text.headers.includes('TIẾN ĐỘ') ||
      text.headers.includes('CHECKLIST'))
  )
    fail(cfg, `tiêu đề cột sai: ${text.headers.join(' | ')}`);

  // 3. việc xong xuống cuối, ở cả ba kiểu sắp xếp
  if (!rows.some((r) => r.done) || !rows.some((r) => !r.done))
    fail(cfg, 'dữ liệu mẫu cần cả việc xong và chưa xong');
  const doneLast = (list) => {
    const first = list.findIndex((r) => r.done);
    return first < 0 || list.slice(first).every((r) => r.done);
  };
  await page.evaluate(() => {
    document.querySelector('.wf-filter-panel').open = true;
  });
  for (const mode of ['default', 'title', 'due']) {
    await page.evaluate((mode) => {
      const s = document.querySelector('.wf-sort');
      s.value = mode;
      s.onchange({ target: s });
    }, mode);
    const list = await rowsInfo(page);
    if (!doneLast(list))
      fail(
        cfg,
        `kiểu sắp xếp "${mode}": còn việc chưa xong nằm sau việc đã xong`,
      );
  }
  const doneStyle = await page.evaluate(() => {
    const t = document.querySelector('#main .zen-row-done .zen-row-title');
    if (!t) return null;
    const cs = getComputedStyle(t);
    return { line: cs.textDecorationLine, opacity: cs.opacity };
  });
  if (
    !doneStyle ||
    !doneStyle.line.includes('line-through') ||
    doneStyle.opacity !== '1'
  )
    fail(
      cfg,
      `việc xong phải gạch ngang và không làm mờ bằng opacity (${JSON.stringify(doneStyle)})`,
    );

  // 4. giải thích ô chọn
  const select = await page.evaluate(() => {
    const cb = document.querySelector(
      '#main .task-table tbody tr[data-task] input[type=checkbox]',
    );
    const hint = document.getElementById(
      cb?.getAttribute('aria-describedby') || '',
    );
    const visible = hint?.checkVisibility();
    return {
      title: cb?.title,
      label: cb?.getAttribute('aria-label'),
      hint: hint?.textContent.trim(),
      visible,
      size: hint && parseFloat(getComputedStyle(hint).fontSize),
    };
  });
  if (!select.title || !select.hint || !select.visible || select.size < 12)
    fail(cfg, `ô chọn thiếu giải thích: ${JSON.stringify(select)}`);
  if (select.label && !/^Chọn /.test(select.label))
    fail(cfg, 'nhãn ô chọn phải bắt đầu bằng "Chọn "');

  // 5. chip ngày / ưu tiên
  const chips = await page.evaluate(() => {
    const row = document.querySelector(
      '#main .task-table tbody tr[data-task]:not([hidden])',
    );
    const due = row.querySelector('.zen-due-trigger'),
      pri = row.querySelector('.zen-priority-picker>summary');
    const box = (e) => {
      const r = e.getBoundingClientRect();
      return [Math.round(r.width), Math.round(r.height)];
    };
    return {
      due: box(due),
      pri: box(pri),
      dueText: due.textContent.trim(),
      dueLabel: due.getAttribute('aria-label'),
      priLabel: pri.getAttribute('aria-label'),
      priText: row.querySelector('.zen-priority-current').textContent.trim(),
    };
  });
  if (
    !/^\d{2}\/\d{2}\/\d{4}$/.test(chips.dueText) ||
    !chips.dueLabel.includes(chips.dueText)
  )
    fail(cfg, `chip ngày sai: ${JSON.stringify(chips)}`);
  if (!chips.priLabel.includes(chips.priText))
    fail(cfg, `nhãn ưu tiên thiếu giá trị hiện tại: ${JSON.stringify(chips)}`);
  for (const [name, [w, h]] of [
    ['ngày', chips.due],
    ['ưu tiên', chips.pri],
  ]) {
    if (cfg.touch ? h < 44 : h > 36 || h < 24)
      fail(
        cfg,
        `chip ${name} cao ${h}px (${cfg.touch ? 'cần ≥44px khi cảm ứng' : 'cần 24–36px khi chuột'})`,
      );
    if (w < 80) fail(cfg, `chip ${name} rộng ${w}px, quá hẹp`);
  }

  // đổi ưu tiên bằng chip vẫn lưu
  const target = await page.evaluate(() => {
    const r = document.querySelector(
      '#main .task-table tbody tr[data-task]:not([hidden])',
    );
    return { id: r.dataset.task, pid: r.dataset.pid };
  });
  await page
    .locator(
      `#main .task-table tr[data-task="${target.id}"][data-pid="${target.pid}"] .zen-priority-picker>summary`,
    )
    .click();
  await page
    .locator(
      `#main .task-table tr[data-task="${target.id}"][data-pid="${target.pid}"] [data-zen-priority-option="q3"]`,
    )
    .click();
  await page.waitForTimeout(300);
  const saved = await page.evaluate(
    ({ id, pid }) => project(pid).tasks.find((t) => t.id === id).priority,
    target,
  );
  if (saved !== 'q3')
    fail(cfg, `đổi ưu tiên bằng chip không lưu (được ${saved})`);

  // 6. lọc bằng ô tìm vẫn ẩn được hàng
  await page.evaluate(() => {
    document.querySelector('.wf-filter-panel').open = true;
  });
  await page.locator('.wf-filter-body input[type=search]').fill('Việc số 3');
  await page.waitForTimeout(200);
  const filtered = await page.evaluate(() => {
    const all = [
      ...document.querySelectorAll('#main .task-table tbody tr[data-task]'),
    ];
    return {
      total: all.length,
      shown: all.filter((r) => r.checkVisibility()).length,
      hiddenButVisible: all.filter(
        (r) => r.hidden && getComputedStyle(r).display !== 'none',
      ).length,
    };
  });
  if (!filtered.shown || filtered.shown >= filtered.total)
    fail(cfg, `ô tìm không thu hẹp danh sách (${JSON.stringify(filtered)})`);
  if (filtered.hiddenButVisible)
    fail(cfg, `${filtered.hiddenButVisible} hàng có hidden vẫn hiện ra`);

  console.log(
    `${problems.some((p) => p.startsWith(cfg.w + 'px')) ? 'FAIL' : 'PASS'} danh sách việc ở ${cfg.w}px${cfg.touch ? ' cảm ứng' : ''}: ${rows.length} hàng, cao ${Math.min(...rows.map((r) => r.h))}–${Math.max(...rows.map((r) => r.h))}px`,
  );
  await context.close();
}
await browser.close();
server.close();
if (problems.length) {
  console.error('\nDanh sách việc chưa đạt:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log(
  '\nPASS danh sách việc gọn: hàng thấp, một nhãn quá hạn, việc xong xuống cuối, ô chọn có giải thích, chip ngày và ưu tiên, lọc vẫn ẩn hàng',
);
