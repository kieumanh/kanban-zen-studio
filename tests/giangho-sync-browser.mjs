// v2.0.0 (Truyền Âm): phong cách đi theo tài khoản (data.style) và lời nhắc đẩy theo phong cách của thiết bị.
//  1. Người dùng cũ (dữ liệu chưa có style, máy đang Giang hồ): không ghi gì, không bị đổi phong cách.
//  2. Chọn Giang hồ trong Cài đặt: data.style = 'giangho' lên máy chủ; thiết bị khác mở ra tự sang Giang hồ.
//  3. Tắt Lời lẽ giang hồ: 'giangho-nhe'; thiết bị khác mở ra là Giang hồ nhẹ. Về Thiền: 'zen'; thiết bị đang Giang hồ mở ra về Thiền.
//  4. Nhận dữ liệu mới từ thiết bị khác khi đang mở (dựng lại trang) cũng áp phong cách; áp theo tài khoản không ghi ngược lên máy chủ.
//  5. Bộ nhớ đệm 'zen-pref' giữ phong cách của thiết bị cho thông báo đẩy. Cài đặt có dòng giải thích.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px; không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, notes: [], projects: [makeProject('p1', 'Alpha', '#7950c8', 4)] });
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const until = async (fn, label) => {
  for (let i = 0; i < 100; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.fail(label);
};
const look = (page) => page.evaluate(() => [document.documentElement.dataset.style || 'zen', document.documentElement.dataset.ghWords || 'on', localStorage.getItem('zen-style'), localStorage.getItem('zen-gh-words')]);
const pref = (page) => page.evaluate(async () => (await (await caches.open('zen-pref')).match('/__zen-style'))?.text());
const settings = async (page) => {
  await page.evaluate(() => accountPanel());
  await page.waitForSelector('dialog[open] input[name=zen-style]', { state: 'attached' });
  await page.evaluate(() => document.querySelectorAll('dialog[open] details').forEach((d) => (d.open = true)));
  await page.mouse.move(2, 2);
};

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 1. Người dùng cũ.
    {
      const { context, page, server } = await h.open(width, { touch, setup: GH });
      await h.show(page, 'dashboard');
      await page.waitForTimeout(800);
      assert.deepEqual((await look(page)).slice(0, 2), ['giangho', 'on'], 'giữ Giang hồ trên máy' + at);
      assert.equal(server.workspace.style, undefined, 'không tự ghi phong cách' + at);
      assert.equal(await pref(page), 'giangho', 'bộ nhớ đệm cho thông báo đẩy' + at);
      await context.close();
    }
    // 2. Chọn Giang hồ ở thiết bị A.
    const a = await h.open(width, { touch });
    const errors = [];
    a.page.on('pageerror', (e) => errors.push(e.message));
    await h.show(a.page, 'dashboard');
    await settings(a.page);
    assert.match(await a.page.locator('.gh-style-sync').textContent(), /^Phong cách đi theo tài khoản/, 'dòng giải thích trong Cài đặt' + at);
    await a.page.locator('input[name=zen-style][value=giangho]').evaluate((i) => i.closest('label').click());
    await until(() => a.server.workspace.style === 'giangho', 'lưu style giangho lên máy chủ' + at);
    assert.equal(await a.page.locator('.gh-style-sync').textContent(), 'Phong cách đi theo danh tính: đổi ở đây thì các thiết bị khác cũng đổi theo khi mở. Thư nhắc kỳ hạn và chiến báo tuần dùng giọng giang hồ khi chọn Giang hồ.', 'dòng giải thích giọng giang hồ' + at);
    assert.equal(await pref(a.page), 'giangho', 'bộ nhớ đệm đổi theo' + at);
    // Thiết bị B (máy đang Thiền) mở ra.
    let b = await h.open(width, { touch, workspace: structuredClone(a.server.workspace) });
    await h.show(b.page, 'dashboard');
    await b.page.waitForFunction(() => document.documentElement.dataset.style === 'giangho' && document.querySelector('.gh-nav'));
    assert.deepEqual(await look(b.page), ['giangho', 'on', 'giangho', null], 'thiết bị khác tự sang Giang hồ' + at);
    const revision = b.server.revision;
    await b.page.waitForTimeout(600);
    assert.equal(b.server.revision, revision, 'áp theo tài khoản không ghi ngược lên máy chủ' + at);
    await b.context.close();
    // 3. Giang hồ nhẹ.
    await a.page.locator('.gh-words-row').click();
    await until(() => a.server.workspace.style === 'giangho-nhe', 'lưu giangho-nhe' + at);
    assert.equal(await pref(a.page), 'giangho-nhe', 'bộ nhớ đệm Giang hồ nhẹ' + at);
    b = await h.open(width, { touch, workspace: structuredClone(a.server.workspace) });
    await h.show(b.page, 'dashboard');
    await b.page.waitForFunction(() => document.documentElement.dataset.ghWords === 'off');
    assert.deepEqual(await look(b.page), ['giangho', 'off', 'giangho', 'off'], 'thiết bị khác là Giang hồ nhẹ' + at);
    // 4. Đang mở mà nhận dữ liệu mới: A về Thiền, B dựng lại theo dữ liệu mới.
    await a.page.locator('input[name=zen-style][value=zen]').evaluate((i) => i.closest('label').click());
    await until(() => a.server.workspace.style === 'zen', 'lưu zen' + at);
    await b.page.evaluate((style) => {
      data.style = style;
      render();
    }, a.server.workspace.style);
    await b.page.waitForFunction(() => !document.documentElement.dataset.style);
    assert.deepEqual((await look(b.page)).slice(0, 3), ['zen', 'on', null], 'đang mở cũng về Thiền theo tài khoản' + at);
    await b.context.close();
    // Thiết bị đang Giang hồ mở ra với tài khoản đã chọn Thiền.
    const c = await h.open(width, { touch, setup: GH, workspace: structuredClone(a.server.workspace) });
    await h.show(c.page, 'dashboard');
    await c.page.waitForFunction(() => !document.documentElement.dataset.style);
    assert.equal(await pref(c.page), 'zen', 'bộ nhớ đệm về Thiền' + at);
    await c.context.close();
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await a.context.close();
  }
  console.log('giangho-sync-browser ok');
} finally {
  await h.close();
}
