// Hồi quy v1.15.44: một thành phần trạng thái lưu / đồng bộ. Ở 390px (cảm ứng) / 820px (cảm ứng) / 1440px:
//  1. trạng thái bình thường: viên thuốc ở thanh trên "Đã đồng bộ lúc hh:mm" (có biểu tượng, nhãn đọc-được trùng chữ), không có khung lỗi, chân thanh bên không còn nhãn "Báo cáo đồng bộ" không bấm được;
//  2. hộp thoại chi tiết việc nói đúng như viên thuốc khi chưa có chỉnh sửa (không còn bộ chữ riêng "Đã tải bản đã lưu…"), cập nhật theo khi trạng thái đổi lúc đang mở; khi đã gõ thì "có thay đổi chưa lưu";
//  3. mất mạng: "Ngoại tuyến"; máy chủ lỗi khi vẫn có mạng: "Chưa kết nối được", KHÔNG gọi là ngoại tuyến; hồi phục thì về "Đã đồng bộ";
//  4. lỗi / xung đột: viên thuốc là nhãn ngắn, khung dưới thanh trên là nhãn đầy đủ cùng nút làm gì đó (không lặp một câu hai lần), nhãn không lặp "Chưa đồng bộ", nút "Thử lại" đưa trạng thái về bình thường và khung biến mất;
//  5. một bộ từ: "thiết bị" (không "máy") ở mọi nhãn; dữ liệu đã sửa vẫn nguyên sau mọi tình huống lỗi.
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { flatten, inflate } from '../dist/modules/delta.mjs';
import worker from '../worker.mjs';
import { validWorkspace } from '../server/api.mjs';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
let mode = 'ok';
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
const task = (id, title, due, extra = {}) => ({
  id,
  title,
  col: 'List',
  description: '',
  due,
  tag: 'Công việc',
  priority: '',
  labels: [],
  checks: [],
  ...extra,
});
const makeSeed = () => ({
  schema: 1,
  projects: [
    {
      id: 'p1',
      name: 'Khóa tu mùa thu',
      description: 'Mô tả ngắn của dự án',
      color: '#7950c8',
      icon: '✺',
      columns: ['Idea', 'List', 'Doing', 'Done'],
      columnNames: {
        Idea: 'Ý tưởng',
        List: 'Việc cần làm',
        Doing: 'Đang thực hiện',
        Done: 'Hoàn thành',
      },
      keywords: [],
      tasks: [
        task('t1', 'Việc quá hạn một', shift(-4)),
        task('t2', 'Việc quá hạn hai', shift(-2)),
        task('t3', 'Việc quá hạn ba', shift(-1)),
        task('t4', 'Việc đến hạn một', shift(1)),
        task('t5', 'Việc đến hạn hai', shift(3)),
        task('t6', 'Việc còn xa', shift(5)),
        task('t7', 'Việc quan trọng chưa tới hạn', shift(30), {
          priority: 'q1',
        }),
        task('t8', 'Việc đã xong quá hạn', shift(-6), { col: 'Done' }),
      ],
    },
  ],
});
async function open(width, touch = false) {
  const context = await browser.newContext({
    viewport: { width, height: width < 700 ? 844 : 900 },
    timezoneId: 'Asia/Ho_Chi_Minh',
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  });
  const page = await context.newPage();
  let workspace = makeSeed(),
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
        if (mode === 'server500')
          return route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Lỗi máy chủ' }),
          });
        if (mode === 'reject400')
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Dữ liệu bị từ chối' }),
          });
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

const info = (page) =>
  page.evaluate(() => {
    const t = (e) => (e?.textContent || '').trim().replace(/\s+/g, ' ');
    const pill = document.querySelector('#save-state');
    const bar = document.querySelector('#zen-sync-feedback');
    const line = document.querySelector('#editor[open] .zen-task-save-status');
    const btn = bar?.querySelector('button');
    const box = btn?.getBoundingClientRect();
    return {
      pill: t(pill),
      sync: pill?.dataset.sync,
      aria: (pill?.getAttribute('aria-label') || '').replace(
        /^Trạng thái đồng bộ: /,
        '',
      ),
      role: pill?.getAttribute('role'),
      icon: !!pill?.querySelector('svg')?.checkVisibility?.(),
      bar: bar ? t(bar.querySelector('span')) : null,
      barBtn: btn ? t(btn) : null,
      barBtnMin: box ? Math.round(Math.min(box.width, box.height)) : null,
      line: line ? t(line) : null,
      dirty: line?.dataset.dirty === 'true',
      sideReport: /Báo cáo đồng bộ/.test(
        document.querySelector('.sidebar')?.textContent || '',
      ),
    };
  });
const waitSync = (page, state, timeout = 9000) =>
  page
    .waitForFunction(
      (s) => document.querySelector('#save-state')?.dataset.sync === s,
      state,
      { timeout },
    )
    .catch(() => {});
const edit = (page, i, text) =>
  page.evaluate(
    ([i, text]) => {
      project('p1').tasks[i].description = text;
      save();
    },
    [i, text],
  );

const problems = [];
const fail = (cfg, step, msg) =>
  problems.push(`${cfg.w}px${cfg.touch ? ' cảm ứng' : ''} · ${step}: ${msg}`);
const FULL_SAVED = /^Đã đồng bộ lúc \d\d:\d\d$/;

for (const cfg of [
  { w: 390, touch: true },
  { w: 820, touch: true },
  { w: 1440, touch: false },
]) {
  mode = 'ok';
  const { context, page } = await open(cfg.w, cfg.touch);
  await show(page, 'projects');
  await waitSync(page, 'saved');

  // 1. trạng thái bình thường
  // v1.56.0: viên thuốc nằm trong dropdown "Tùy chọn nhanh"; mở dropdown để kiểm tra biểu tượng hiện, rồi đóng.
  await page.click('#top-tools-trigger');
  let c = await info(page);
  await page.keyboard.press('Escape');
  if (!FULL_SAVED.test(c.pill) || c.aria !== c.pill || c.sync !== 'saved')
    fail(
      cfg,
      'bình thường',
      `viên thuốc "${c.pill}" / nhãn "${c.aria}" / ${c.sync}`,
    );
  if (!c.icon || c.role !== 'status')
    fail(
      cfg,
      'bình thường',
      `viên thuốc cần biểu tượng hiện và role=status (${c.icon}, ${c.role})`,
    );
  if (c.bar !== null)
    fail(cfg, 'bình thường', `không được có khung lỗi, thấy "${c.bar}"`);
  if (c.sideReport)
    fail(
      cfg,
      'bình thường',
      'chân thanh bên còn nhãn "Báo cáo đồng bộ" không bấm được',
    );

  // 2. hộp thoại việc: cùng chữ với viên thuốc, cập nhật theo, rồi "có thay đổi chưa lưu"
  await page.locator('#main .task-card').first().click();
  await page.waitForSelector('#editor[open] .zen-task-save-status', {
    timeout: 8000,
  });
  await page.waitForTimeout(300);
  c = await info(page);
  if (c.line !== c.aria || /Đã tải bản đã lưu/.test(c.line || ''))
    fail(
      cfg,
      'hộp thoại',
      `chưa gõ: dòng trạng thái "${c.line}" phải trùng viên thuốc "${c.aria}"`,
    );
  await context.setOffline(true);
  await edit(page, 1, 'sửa khi mất mạng');
  await page.waitForTimeout(500);
  c = await info(page);
  if (
    c.sync !== 'offline' ||
    c.pill !== 'Ngoại tuyến' ||
    c.aria !== 'Ngoại tuyến · Bạn vẫn có thể chỉnh sửa'
  )
    fail(
      cfg,
      'mất mạng',
      `viên thuốc "${c.pill}" / nhãn "${c.aria}" / ${c.sync}`,
    );
  if (c.line !== c.aria)
    fail(
      cfg,
      'mất mạng',
      `dòng trong hộp thoại phải đổi theo ("${c.line}" ≠ "${c.aria}")`,
    );
  if (c.bar !== null)
    fail(cfg, 'mất mạng', `ngoại tuyến không dựng khung lỗi, thấy "${c.bar}"`);
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await waitSync(page, 'saved');
  c = await info(page);
  if (!FULL_SAVED.test(c.aria) || c.line !== c.aria)
    fail(
      cfg,
      'có mạng lại',
      `viên thuốc "${c.aria}" / dòng hộp thoại "${c.line}"`,
    );
  await page.locator('#editor [name=title]').first().fill('Tên việc sửa dở');
  await page.waitForTimeout(200);
  c = await info(page);
  if (!/chưa lưu/.test(c.line || '') || !c.dirty)
    fail(
      cfg,
      'hộp thoại',
      `đã gõ: phải báo có thay đổi chưa lưu, thấy "${c.line}"`,
    );
  if (!FULL_SAVED.test(c.aria))
    fail(
      cfg,
      'hộp thoại',
      `viên thuốc vẫn nói về dữ liệu đã đồng bộ, thấy "${c.aria}"`,
    );
  await page.evaluate(() => document.querySelector('#editor').close());
  await page.waitForTimeout(200);

  // 3. máy chủ lỗi khi vẫn có mạng: không được gọi là ngoại tuyến
  mode = 'server500';
  await edit(page, 2, 'sửa khi máy chủ lỗi');
  await waitSync(page, 'offline');
  c = await info(page);
  if (
    c.pill !== 'Chưa kết nối được' ||
    c.aria !== 'Chưa kết nối được máy chủ · Đã lưu trên thiết bị'
  )
    fail(
      cfg,
      'máy chủ lỗi',
      `viên thuốc "${c.pill}" / nhãn "${c.aria}" (vẫn có mạng, không được ghi ngoại tuyến)`,
    );
  if (/Ngoại tuyến/.test(c.pill + c.aria))
    fail(cfg, 'máy chủ lỗi', 'còn gọi là ngoại tuyến');
  mode = 'ok';
  await page.evaluate(() => flushCloud(true));
  await waitSync(page, 'saved');
  c = await info(page);
  if (!FULL_SAVED.test(c.aria))
    fail(cfg, 'máy chủ hồi phục', `thấy "${c.aria}"`);

  // 4. bị máy chủ từ chối: nhãn ngắn ở viên thuốc, nhãn đầy đủ + nút ở khung, nhãn không lặp, Thử lại hồi phục
  mode = 'reject400';
  await edit(page, 3, 'sửa khi bị từ chối');
  await waitSync(page, 'error');
  await page
    .waitForSelector('#zen-sync-feedback', { timeout: 5000 })
    .catch(() => {});
  c = await info(page);
  if (c.sync !== 'error' || c.pill !== 'Chưa đồng bộ được')
    fail(cfg, 'bị từ chối', `viên thuốc "${c.pill}" / ${c.sync}`);
  if (
    c.bar !== 'Chưa đồng bộ được · Máy chủ từ chối dữ liệu' ||
    c.aria !== c.bar
  )
    fail(cfg, 'bị từ chối', `khung lỗi "${c.bar}" / nhãn đọc-được "${c.aria}"`);
  if ((c.bar || '').match(/Chưa đồng bộ/g)?.length !== 1)
    fail(cfg, 'bị từ chối', `nhãn lặp chữ "Chưa đồng bộ": "${c.bar}"`);
  if (c.pill === c.bar)
    fail(cfg, 'bị từ chối', 'viên thuốc và khung lỗi lặp cùng một câu');
  if (c.barBtn !== 'Thử lại')
    fail(cfg, 'bị từ chối', `nút ở khung lỗi: "${c.barBtn}"`);
  if (c.barBtnMin < (cfg.touch ? 44 : 24))
    fail(cfg, 'bị từ chối', `nút "Thử lại" nhỏ ${c.barBtnMin}px`);
  mode = 'ok';
  await page.locator('#zen-sync-feedback button').click();
  await waitSync(page, 'saved');
  await page.waitForTimeout(200);
  c = await info(page);
  if (!FULL_SAVED.test(c.aria) || c.bar !== null)
    fail(
      cfg,
      'Thử lại',
      `phải về bình thường và hết khung lỗi: "${c.aria}" / khung "${c.bar}"`,
    );

  // 5. đối chiếu từng thông điệp của account.js với nhãn chuẩn
  const labels = [
    [
      '⚠ Xung đột dữ liệu · Chưa ghi đè',
      'error',
      'Xung đột',
      'Xung đột · Xem và chọn bản cần giữ',
      'Xem các bản dữ liệu',
    ],
    [
      '⚠ Cần hợp nhất phiên bản đồng bộ',
      'error',
      'Xung đột',
      'Xung đột · Xem và chọn bản cần giữ',
      'Xem các bản dữ liệu',
    ],
    [
      '⚠ Dữ liệu không hợp lệ · Chưa đồng bộ',
      'error',
      'Chưa đồng bộ được',
      'Chưa đồng bộ được · Dữ liệu không hợp lệ',
      'Thử lại',
    ],
    [
      '⚠ Máy chủ từ chối dữ liệu · Chưa đồng bộ',
      'error',
      'Chưa đồng bộ được',
      'Chưa đồng bộ được · Máy chủ từ chối dữ liệu',
      'Thử lại',
    ],
    [
      '⚠ Chưa đồng bộ · Cần kiểm tra dữ liệu',
      'error',
      'Chưa đồng bộ được',
      'Chưa đồng bộ được · Cần kiểm tra dữ liệu',
      'Thử lại',
    ],
    [
      '⚠ Bản nháp đã lưu · Chưa đồng bộ',
      'error',
      'Chưa đồng bộ được',
      'Chưa đồng bộ được · Bản nháp đã lưu trên thiết bị',
      'Thử lại',
    ],
    [
      '⚠ Không thể lưu bản nháp trên máy',
      'error',
      'Không lưu được',
      'Không lưu được trên thiết bị',
      'Thử lại',
    ],
    [
      '● Đã lưu trên máy · Tiếp tục đồng bộ',
      'pending',
      'Chờ đồng bộ',
      'Đã lưu trên thiết bị · Chờ đồng bộ',
      null,
    ],
    [
      '● Đã lưu trên máy · Đang đồng bộ',
      'pending',
      'Đang đồng bộ…',
      'Đang đồng bộ…',
      null,
    ],
    ['● Đang đồng bộ…', 'pending', 'Đang đồng bộ…', 'Đang đồng bộ…', null],
  ];
  for (const [raw, kind, short, full, button] of labels) {
    await page.evaluate(([raw, kind]) => syncStatus(raw, kind), [raw, kind]);
    c = await info(page);
    const tag = `"${raw}"`;
    if (c.pill !== short || c.aria !== full || c.sync !== kind)
      fail(
        cfg,
        'nhãn chuẩn',
        `${tag} → viên thuốc "${c.pill}" / nhãn "${c.aria}" / ${c.sync}; cần "${short}" / "${full}" / ${kind}`,
      );
    if (kind === 'error') {
      if (c.bar !== full || c.barBtn !== button)
        fail(
          cfg,
          'nhãn chuẩn',
          `${tag} → khung "${c.bar}" / nút "${c.barBtn}"; cần "${full}" / "${button}"`,
        );
    } else if (c.bar !== null)
      fail(
        cfg,
        'nhãn chuẩn',
        `${tag} → không được có khung lỗi, thấy "${c.bar}"`,
      );
    if (/trên máy/.test(c.pill + c.aria + (c.bar || '')))
      fail(cfg, 'nhãn chuẩn', `${tag} → còn chữ "trên máy" thay vì "thiết bị"`);
    if ((c.aria.match(/Chưa đồng bộ/g) || []).length > 1)
      fail(cfg, 'nhãn chuẩn', `${tag} → nhãn lặp "Chưa đồng bộ": "${c.aria}"`);
  }
  // nút của khung xung đột mở hộp thoại Cài đặt, nơi có báo cáo đồng bộ
  await page.evaluate(() =>
    syncStatus('⚠ Xung đột dữ liệu · Chưa ghi đè', 'error'),
  );
  await page.locator('#zen-sync-feedback button').click();
  await page
    .waitForSelector('#editor[open] #sync-report', { timeout: 5000 })
    .catch(() => {});
  const panel = await page.evaluate(() => ({
    open: !!document.querySelector('#editor[open] #sync-report'),
  }));
  if (!panel.open)
    fail(
      cfg,
      'xung đột',
      'nút "Xem các bản dữ liệu" phải mở Cài đặt có báo cáo đồng bộ',
    );
  await page.evaluate(() => syncStatus('● Đã đồng bộ', 'saved'));
  const last = await page.evaluate(
    () => document.querySelector('#sync-last-time')?.textContent.trim() || '',
  );
  if (!/^Lần đồng bộ thành công gần nhất: /.test(last))
    fail(
      cfg,
      'báo cáo đồng bộ',
      `dòng "lần đồng bộ gần nhất" trong Cài đặt: "${last}"`,
    );
  await page.evaluate(() => document.querySelector('#editor').close());
  await page.evaluate(() => syncStatus('● Đã đồng bộ', 'saved'));
  c = await info(page);
  if (!FULL_SAVED.test(c.aria) || c.bar !== null)
    fail(cfg, 'cuối', `phải về bình thường: "${c.aria}" / khung "${c.bar}"`);

  // dữ liệu người dùng vẫn nguyên sau mọi tình huống lỗi
  const kept = await page.evaluate(() =>
    project('p1')
      .tasks.slice(1, 4)
      .map((t) => t.description),
  );
  if (
    kept.join('|') !== 'sửa khi mất mạng|sửa khi máy chủ lỗi|sửa khi bị từ chối'
  )
    fail(cfg, 'dữ liệu', `chỉnh sửa bị mất hoặc đổi: ${JSON.stringify(kept)}`);

  console.log(
    `${problems.some((p) => p.startsWith(cfg.w + 'px')) ? 'FAIL' : 'PASS'} trạng thái lưu ở ${cfg.w}px${cfg.touch ? ' cảm ứng' : ''}`,
  );
  await context.close();
}
await browser.close();
server.close();
if (problems.length) {
  console.error('\nTrạng thái lưu chưa đạt:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log(
  '\nPASS một thành phần trạng thái lưu: cùng bộ chữ ở viên thuốc, khung lỗi và hộp thoại việc; không lặp, không gọi nhầm ngoại tuyến',
);
