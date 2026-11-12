// v1.73.0: báo lỗi script + dấu dùng tính năng (ẩn danh) và thông báo email gửi lỗi trong Cài đặt.
// Trình duyệt tự động (navigator.webdriver) bị tắt báo cáo để kiểm thử khác không phát sinh yêu cầu lạ, nên bài này gỡ cờ đó bằng init script.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const h = await startHarness();
const humanBrowser = ({ gpc = false, dnt = false } = {}) => async ({ context, page, state }) => {
  state.events = [];
  await context.addInitScript(({ gpc, dnt }) => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    if (gpc) Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true });
    if (dnt) Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
  }, { gpc, dnt });
  await page.route('**/api/client-event', (route) => {
    state.events.push(route.request().postDataJSON());
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
};
const settle = (page) => page.waitForTimeout(400);
try {
  // ---- dấu dùng tính năng ----
  {
    const { page, context, server } = await h.open(1440, { setup: humanBrowser() });
    await settle(page);
    const usage = () => server.events.filter((e) => e.type === 'usage').map((e) => e.feature);
    assert.deepEqual(usage(), ['dashboard'], 'mở ứng dụng: một dấu cho màn hình Tổng quan, thấy ' + JSON.stringify(usage()));
    assert.deepEqual(Object.keys(server.events[0]).sort(), ['feature', 'type', 'version'], 'dấu dùng chỉ gồm loại, tính năng, phiên bản; không mã người dùng');
    assert.match(server.events[0].version, /^\d+\.\d+\.\d+$/);
    await h.show(page, 'projects');
    await settle(page);
    await h.show(page, 'dashboard');
    await h.show(page, 'projects');
    await settle(page);
    assert.deepEqual(usage(), ['dashboard', 'projects'], 'mỗi màn hình một dấu mỗi ngày, thấy ' + JSON.stringify(usage()));
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.zenReady === '1');
    await settle(page);
    assert.deepEqual(usage(), ['dashboard', 'projects'], 'tải lại cùng ngày không gửi lại');
    // Sang ngày khác thì gửi lại.
    await page.evaluate(() => localStorage.setItem('zen-usage-day', JSON.stringify({ day: '2000-01-01', sent: ['dashboard', 'projects'] })));
    await h.show(page, 'projects');
    await settle(page);
    assert.equal(usage().filter((f) => f === 'projects').length, 2, 'sang ngày mới thì gửi lại');

    // ---- lỗi script ----
    const before = server.events.length;
    await page.evaluate(() => {
      for (let i = 0; i < 3; i++) setTimeout(function boom() { throw new Error('Thử lỗi một'); }, 0); // cùng chỗ, cùng nội dung -> gộp
      Promise.reject(new Error('Thử từ chối'));
      window.dispatchEvent(new ErrorEvent('error', { message: 'ResizeObserver loop completed with undelivered notifications.' }));
      window.dispatchEvent(new ErrorEvent('error', { message: 'tập lệnh lạ', filename: 'https://evil.example/x.js', lineno: 1, colno: 1 }));
      window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }));
    });
    await settle(page);
    const errors = server.events.slice(before).filter((e) => e.type !== 'usage');
    assert.equal(errors.length, 2, 'chỉ 2 lỗi thật (lỗi lặp được gộp, lỗi tiện ích/ngoài/ResizeObserver bị bỏ), thấy ' + JSON.stringify(errors.map((e) => e.message)));
    const thrown = errors.find((e) => e.type === 'error'), rejected = errors.find((e) => e.type === 'rejection');
    assert.match(thrown.message, /Thử lỗi một/); // trình duyệt thêm tiền tố "Uncaught Error: "
    assert.equal(rejected.message, 'Thử từ chối');
    assert.equal(thrown.view, 'projects', 'kèm màn hình đang mở');
    assert.ok(!('user' in thrown) && !('email' in thrown), 'không kèm thông tin người dùng');
    // Tối đa 5 lỗi khác nhau mỗi lần mở trang.
    await page.evaluate(() => { for (let i = 0; i < 10; i++) window.dispatchEvent(new ErrorEvent('error', { message: 'lỗi khác nhau ' + i, filename: location.origin + '/app.js', lineno: i + 1, colno: 1 })); });
    await settle(page);
    assert.equal(server.events.slice(before).filter((e) => e.type !== 'usage').length, 5, 'tổng cộng tối đa 5 lỗi mỗi lần mở trang');
    await context.close();
  }

  // ---- tôn trọng riêng tư: Global Privacy Control / Do Not Track / trình duyệt tự động ----
  for (const [name, setup] of [['Global Privacy Control', humanBrowser({ gpc: true })], ['Do Not Track', humanBrowser({ dnt: true })]]) {
    const { page, context, server } = await h.open(1440, { setup });
    await h.show(page, 'projects');
    await page.evaluate(() => { setTimeout(() => { throw new Error('không được gửi'); }, 0); });
    await settle(page);
    assert.equal(server.events.length, 0, name + ': không gửi bất cứ gì, thấy ' + JSON.stringify(server.events));
    await context.close();
  }
  {
    const { page, context } = await h.open(1440, {
      setup: async ({ page: p, state }) => { state.events = []; await p.route('**/api/client-event', (r) => { state.events.push(1); r.fulfill({ status: 200, body: '{}' }); }); },
    });
    await h.show(page, 'projects');
    await settle(page);
    assert.equal(await page.evaluate(() => navigator.webdriver), true);
    await context.close();
  }

  // ---- thông báo email gửi lỗi trong Cài đặt ----
  for (const [width, touch] of [[390, true], [820, true], [1440, false]]) {
    const { page, context } = await h.open(width, { touch });
    const panel = async (issue) => {
      await page.evaluate((issue) => { currentUser.mailIssue = issue; accountPanel(); }, issue);
      return page.evaluate(() => {
        const n = document.querySelector('#editor-body .mail-issue');
        if (!n) return null;
        const b = n.getBoundingClientRect();
        return { text: n.textContent, role: n.getAttribute('role'), left: b.left, right: b.right, vw: innerWidth, afterHeading: n.previousElementSibling?.tagName === 'H2', overflow: document.documentElement.scrollWidth - innerWidth };
      });
    };
    assert.equal(await panel(undefined), null, width + 'px: không có lỗi thì không có thông báo');
    await page.evaluate(() => document.querySelector('#editor').close());
    let n = await panel({ channel: 'weekly', day: '2026-11-11', attempts: 2 });
    assert.ok(n, width + 'px: có thông báo');
    assert.match(n.text, /Chưa gửi được email tổng kết tuần ngày 11\/11/);
    assert.match(n.text, /tự thử lại/);
    assert.equal(n.role, 'status');
    assert.ok(n.afterHeading, 'thông báo nằm ngay dưới tiêu đề Cài đặt');
    assert.ok(n.left >= 0 && n.right <= n.vw + 0.5 && n.overflow <= 0, width + 'px: thông báo không tràn ngang');
    await page.evaluate(() => document.querySelector('#editor').close());
    n = await panel({ channel: 'finance', day: '2026-11-10', attempts: 4 });
    assert.match(n.text, /email báo cáo thu chi ngày 10\/11/);
    assert.match(n.text, /Đã thử nhiều lần/);
    assert.ok(!/tự thử lại/.test(n.text));
    await page.evaluate(() => document.querySelector('#editor').close());
    assert.equal(await panel({ channel: 'lạ', day: '2026-11-10', attempts: 1 }), null, 'kênh lạ không hiện');
    await context.close();
  }
  console.log('PASS: báo lỗi/dấu dùng ẩn danh (gộp lặp, tối đa 5, tôn trọng GPC/DNT/tự động) và thông báo email lỗi ở 390/820/1440px');
} finally {
  await h.close();
}
