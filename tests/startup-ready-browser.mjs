// Hồi quy v1.16.1: ứng dụng báo "đã khởi động xong" (html[data-zen-ready=1]) chỉ sau khi dữ liệu đã tải và màn hình chính đã vẽ.
// Trước đây `currentUser` có giá trị sớm (ngay khi /me trả lời) trong lúc workspace còn đang tải, nên mọi thao tác ngay sau mốc đó
// (ví dụ mở màn hình đăng nhập) bị bước hoàn tất khởi động xóa mất — nguồn của các lần đỏ ngẫu nhiên ở các test trình duyệt.
// Ở đây workspace bị làm chậm 700ms để khoảng "đã có người dùng nhưng chưa xong" đủ rộng và ổn định.
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';

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

const workspace = {
  schema: 1,
  projects: [
    {
      id: 'p1',
      name: 'Khóa tu mùa thu',
      description: '',
      color: '#7950c8',
      icon: '✺',
      columns: ['Idea', 'List', 'Doing', 'Done'],
      tasks: [
        {
          id: 't1',
          title: 'Việc một',
          col: 'List',
          description: '',
          due: '',
          tag: 'Công việc',
          priority: 'q2',
          checks: [],
        },
      ],
    },
  ],
  notes: [],
};

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: 'Asia/Ho_Chi_Minh',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const day = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
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
    const path = new URL(route.request().url()).pathname.slice(5);
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
      if (route.request().method() === 'GET')
        await new Promise((r) => setTimeout(r, 700));
      result = { data: workspace, revision: 1 };
    } else if (path === 'notification-receipts') result = { keys: [] };
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

  // 1. Mốc cũ: đã có người dùng nhưng dữ liệu còn đang tải → chưa được báo "xong".
  await page.waitForFunction(
    () => typeof _WF !== 'undefined' && currentUser?.id === 'qa',
  );
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.zenReady),
    undefined,
    'chưa tải xong dữ liệu thì chưa được báo sẵn sàng',
  );
  assert.equal(
    await page.evaluate(() => document.body.classList.contains('signed-out')),
    true,
    'màn hình vẫn là lớp đăng nhập khi chưa xong',
  );

  // 2. Mốc mới: báo xong thì màn hình chính đã vẽ và lớp đăng nhập đã gỡ.
  await page.waitForFunction(
    () => document.documentElement.dataset.zenReady === '1',
    null,
    { timeout: 8000 },
  );
  const state = await page.evaluate(() => ({
    signedOut: document.body.classList.contains('signed-out'),
    authScreen: !!document.querySelector('#auth-screen'),
    view,
    hasMain: !!document.querySelector('#main h1'),
    projects: data.projects.length,
  }));
  assert.deepEqual(state, {
    signedOut: false,
    authScreen: false,
    view: 'dashboard',
    hasMain: true,
    projects: 1,
  });

  // 3. Mở màn hình đăng nhập ngay sau khi báo xong thì giữ nguyên (không bị bước khởi động xóa), và cờ được gỡ khi đăng xuất.
  await page.evaluate(() => authScreen());
  await page.waitForTimeout(400);
  assert.equal(
    await page.locator('#auth-screen [data-auth=forgot]').isVisible(),
    true,
  );
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.zenReady),
    undefined,
    'màn hình đăng nhập gỡ cờ sẵn sàng',
  );
  assert.deepEqual(errors, []);
  await context.close();
  console.log('startup-ready-browser: OK');
} finally {
  await browser.close();
  server.close();
}
