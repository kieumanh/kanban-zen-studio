// v2.51.0 (Chia Sẻ Vào App): service worker với đường dẫn chia sẻ ("/?title=…&text=…&url=…").
// A. Ngoại tuyến: mở đường dẫn chia sẻ vẫn ra vỏ ứng dụng đã lưu (trước đây có tham số là bỏ qua bộ nhớ đệm và báo lỗi mạng), nội dung chia sẻ vẫn hiện trong hộp.
// B. Đường dẫn chia sẻ không bao giờ bị lưu vào bộ nhớ đệm (nội dung của người dùng không nằm lại trong cache), và API vẫn không được lưu.
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import worker from '../worker-api.mjs';

const ASSETS = {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    const file = new URL('../public/' + (path === '/' ? 'index.html' : path.slice(1)), import.meta.url);
    if (!existsSync(file)) return new Response('missing', { status: 404 });
    const type = path === '/' ? 'text/html' : /\.m?js$/.test(path) ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.webmanifest') ? 'application/manifest+json' : path.endsWith('.svg') ? 'image/svg+xml' : 'application/json';
    return new Response(readFileSync(file), { headers: { 'content-type': type } });
  },
};
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = createServer(async (req, res) => {
  const r = await worker.fetch(new Request('http://localhost' + req.url), { ASSETS });
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const origin = 'http://127.0.0.1:' + server.address().port;
  await page.goto(origin);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  // Có một tài khoản đã đăng nhập sẵn trong bộ nhớ (như bài kiểm thử ngoại tuyến).
  await page.evaluate(async () => {
    currentUser = { id: 'offline-test', email: 'offline@example.test', session_expires: Date.now() + 600000 };
    KEY = 'zen-account-offline-test';
    data = { schema: 1, projects: [], notes: [] };
    cloudRevision = 2;
    dirty = true;
    cloudBase = structuredClone(data);
    await cacheCloud();
  });
  await context.setOffline(true);
  const params = new URLSearchParams({ title: 'Bài ngoại tuyến', text: 'Đọc sau', url: 'https://example.com/off' });
  await page.goto(origin + '/?' + params);
  await page.waitForSelector('dialog.zen-share[open]', { timeout: 15000 });
  assert.equal(await page.inputValue('.zen-share [name=title]'), 'Bài ngoại tuyến', 'ngoại tuyến vẫn hiện nội dung chia sẻ');
  assert.equal(await page.inputValue('.zen-share [name=url]'), 'https://example.com/off');
  assert.equal(await page.evaluate(() => location.search), '', 'tham số bị xóa khỏi thanh địa chỉ');
  // Lưu ngoại tuyến: ghi chú nằm trong bộ nhớ chờ đồng bộ.
  await page.click('[data-zen-share-save]');
  await page.waitForFunction(() => !document.querySelector('dialog.zen-share'));
  assert.equal(await page.evaluate(() => data.notes.some((n) => n.title === 'Bài ngoại tuyến' && n.url === 'https://example.com/off')), true, 'lưu được khi ngoại tuyến');
  assert.equal(await page.evaluate(() => dirty), true, 'đánh dấu chờ đồng bộ');
  await context.setOffline(false);
  // Bộ nhớ đệm không giữ đường dẫn chia sẻ.
  const cached = await page.evaluate(async () => {
    const out = [];
    for (const name of await caches.keys()) for (const r of await (await caches.open(name)).keys()) out.push(new URL(r.url).pathname + new URL(r.url).search);
    return out;
  });
  assert.equal(cached.some((u) => u.includes('?') || u.includes('title=')), false, 'cache không có đường dẫn có tham số: ' + cached.filter((u) => u.includes('?')));
  assert.equal(cached.some((u) => u.startsWith('/api/')), false, 'API không bị lưu vào cache');
  await context.close();
  console.log('PASS: service worker — ngoại tuyến vẫn mở được nội dung chia sẻ, không lưu đường dẫn chia sẻ vào cache');
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
