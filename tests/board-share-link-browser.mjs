// v1.28.0: liên kết chia sẻ bảng đưa token vào phần neo (#boardshare=). Trang đọc token, mở bản chỉ xem,
// rồi xóa token khỏi thanh địa chỉ. Liên kết cũ dạng ?boardshare= vẫn mở được. Kiểm tra ở 390/820/1440px.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const TOKEN_NEW = 'a'.repeat(64);
const TOKEN_OLD = 'b'.repeat(64);
const h = await startHarness();
try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const at = ' (' + width + 'px)';
    for (const [label, makeUrl, token] of [
      ['phần neo', (base, t) => base + '/#boardshare=' + t, TOKEN_NEW],
      ['liên kết cũ', (base, t) => base + '/?boardshare=' + t, TOKEN_OLD],
    ]) {
      const { page } = await h.open(width, { touch });
      const requested = [];
      await page.route('**/api/shared/*', (route) => {
        requested.push(new URL(route.request().url()).pathname);
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { schema: 1, projects: [], notes: [] } }) });
      });
      const base = new URL(page.url()).origin;
      await page.goto('about:blank'); // để trình duyệt tải lại trang khi chỉ đổi phần neo
      const sent = page.waitForRequest((r) => r.url().includes('/api/shared/'), { timeout: 15000 }); // đăng ký trước khi tải trang
      await page.goto(makeUrl(base, token));
      await sent; // chờ trang gửi yêu cầu đọc bảng
      await page.waitForFunction(() => document.body.classList.contains('signed-out') === false, null, { timeout: 15000 });
      assert.deepEqual(requested, ['/api/shared/' + token], 'yêu cầu đúng liên kết (' + label + ')' + at);
      assert.equal(await page.evaluate(() => location.hash), '', 'token được xóa khỏi thanh địa chỉ (' + label + ')' + at);
      assert.equal(await page.evaluate(() => location.search), '', 'không còn tham số truy vấn (' + label + ')' + at);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'không tràn ngang (' + label + ')' + at);
      await page.context().close();
    }
  }
  console.log('PASS liên kết chia sẻ: token trong phần neo được đọc và xóa khỏi thanh địa chỉ; liên kết cũ vẫn mở');
} finally {
  await h.close();
}
