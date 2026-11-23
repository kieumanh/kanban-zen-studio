// v2.75.0 (Theo Chân): tab Tu vi và công tắc “Chỉ số ẩn danh” đi theo tài khoản (data.prefs = { tab?, usage? }), không chỉ nhớ theo từng thiết bị.
//  1. Chưa đụng tới thì không ghi gì: mở trang, chuyển trang không thêm khóa prefs vào dữ liệu.
//  2. Đổi tab ở thiết bị A: lưu dồn (bấm liên tiếp chỉ giữ tab cuối) lên tài khoản; thiết bị B (không có gì trong localStorage) mở Tu vi thì vào đúng tab đó; có cả hai thì theo tài khoản; tab đã đóng (Thần thông khi chưa đủ cấp) thì về Hôm nay.
//  3. Công tắc chỉ số ẩn danh: tắt ở thiết bị A thì lưu ngay lên tài khoản (usage:false); thiết bị B (localStorage trống) thấy công tắc tắt và không gửi dấu nào; bật ở tài khoản thì gửi dù thiết bị từng tắt.
//  4. Chưa có prefs thì giữ cách cũ (lựa chọn riêng của thiết bị: localStorage zen-gr-tab, zen-usage-off) và dữ liệu cũ không bị thêm khóa.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';
import { openGrowthTab } from './lib/growth-tab.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label, tries = 100) {
  for (let i = 0; i < tries; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá hạn chờ: ' + label);
}
const growthOf = () => ({
  v: 1,
  hero: 'nam',
  name: 'Mạnh',
  since: '2026-11-01',
  log: Array.from({ length: 8 }, (_, i) => ({ id: 'a' + i, d: '2026-11-10', s: 'task', k: 'task:a' + i, n: 'Việc ' + i, p: Array(8).fill(0).map((_, j) => (j === i ? 2 : 0)) })),
  spend: [],
});
const seed = (prefs) => ({ schema: 1, projects: [makeProject('p1', 'Alpha', '#7950c8', 6)], notes: [], growth: growthOf(), ...(prefs ? { prefs } : {}) });
const human =
  (local = {}) =>
  async ({ context, page, state }) => {
    state.events = [];
    await context.addInitScript((local) => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      localStorage.setItem('zen-theme', 'light');
      for (const [k, v] of Object.entries(local)) localStorage.setItem(k, v);
    }, local);
    await page.route('**/api/client-event', (route) => {
      state.events.push(route.request().postDataJSON());
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
  };
const usage = (server) => server.events.filter((e) => e.type === 'usage').map((e) => e.feature);
const settle = (page) => page.waitForTimeout(400);
const selectedTab = (page) => page.evaluate(() => document.querySelector('.gr-tab[aria-selected=true]')?.dataset.grTab);
const openSettings = async (page) => {
  await page.evaluate(() => accountPanel());
  await page.waitForSelector('[data-usage-block]', { state: 'attached' });
  await page.evaluate(() => {
    const g = document.querySelector('details.wf-settings-group[data-group=account]');
    if (g) g.open = true;
  });
};
const click = (page, id) => page.locator('#gr-tab-' + id).dispatchEvent('click');

const h = await startHarness({ seed });
try {
  // 1 + 2. Tab Tu vi.
  {
    const A = await h.open(1440, { now: NOW, setup: human(), workspace: seed() });
    await h.show(A.page, 'growth');
    await A.page.waitForSelector('.gr-page');
    await settle(A.page);
    assert.equal(A.server.workspace.prefs, undefined, 'chưa đổi gì thì không có prefs trên tài khoản');
    await h.show(A.page, 'projects');
    await h.show(A.page, 'growth');
    await settle(A.page);
    assert.equal(A.server.workspace.prefs, undefined, 'chuyển trang cũng không thêm prefs');

    // Bấm liên tiếp: chỉ tab cuối được lưu.
    await click(A.page, 'octa');
    await click(A.page, 'story');
    await click(A.page, 'all');
    assert.equal(await selectedTab(A.page), 'all', 'tab đổi ngay trên màn hình');
    assert.equal(await A.page.evaluate(() => localStorage.getItem('zen-gr-tab')), 'all', 'vẫn nhớ theo thiết bị');
    await until(() => A.server.workspace.prefs?.tab === 'all', 'tab lưu lên tài khoản', 40);
    assert.deepEqual(A.server.workspace.prefs, { tab: 'all' }, 'chỉ có khóa tab');
    await click(A.page, 'octa');
    await A.page.evaluate(() => window.zenPrefs.flush());
    await until(() => A.server.workspace.prefs?.tab === 'octa', 'lưu ngay khi rời trang (flush)', 40);
    await A.context.close();

    // Thiết bị B: localStorage trống, tài khoản nhớ tab.
    const B = await h.open(1440, { now: NOW, setup: human(), workspace: seed({ tab: 'story' }) });
    await h.show(B.page, 'growth');
    await B.page.waitForSelector('.gr-tabs');
    assert.equal(await selectedTab(B.page), 'story', 'thiết bị mới vào đúng tab của tài khoản');
    await B.context.close();

    // Có cả hai: tài khoản thắng. Không có prefs: lựa chọn của thiết bị như cũ.
    const C = await h.open(1440, { now: NOW, setup: human({ 'zen-gr-tab': 'all' }), workspace: seed({ tab: 'octa' }) });
    await h.show(C.page, 'growth');
    await C.page.waitForSelector('.gr-tabs');
    assert.equal(await selectedTab(C.page), 'octa', 'có cả hai thì theo tài khoản');
    await C.context.close();
    const D = await h.open(1440, { now: NOW, setup: human({ 'zen-gr-tab': 'all' }), workspace: seed() });
    await h.show(D.page, 'growth');
    await D.page.waitForSelector('.gr-tabs');
    assert.equal(await selectedTab(D.page), 'all', 'chưa có prefs thì giữ lựa chọn của thiết bị');
    await D.context.close();

    // Tab đã đóng (Thần thông chưa mở) thì về Hôm nay, không lỗi.
    const E = await h.open(1440, { now: NOW, setup: human(), workspace: seed({ tab: 'gods' }) });
    const errors = [];
    E.page.on('pageerror', (e) => errors.push(e.message));
    await h.show(E.page, 'growth');
    await E.page.waitForSelector('.gr-tabs');
    assert.equal(await selectedTab(E.page), 'today', 'tab chưa mở thì về Hôm nay');
    assert.deepEqual(errors, [], 'không lỗi trang');
    await E.context.close();
  }

  // 3 + 4. Công tắc chỉ số ẩn danh.
  {
    const A = await h.open(1440, { now: NOW, setup: human(), workspace: seed() });
    await settle(A.page);
    assert.equal(A.server.workspace.prefs, undefined, 'chưa đụng công tắc thì không có prefs');
    await openSettings(A.page);
    assert.equal(await A.page.locator('#usage-share').isChecked(), true, 'mặc định bật');
    await A.page.locator('#usage-share').click();
    await until(() => A.server.workspace.prefs?.usage === false, 'tắt lưu ngay lên tài khoản', 30);
    assert.deepEqual(A.server.workspace.prefs, { usage: false }, 'chỉ có khóa usage');
    assert.equal(await A.page.evaluate(() => localStorage.getItem('zen-usage-off')), '1', 'vẫn nhớ theo thiết bị');
    await A.page.locator('#usage-share').click();
    await until(() => A.server.workspace.prefs?.usage === true, 'bật lại lưu lên tài khoản', 30);
    await A.context.close();

    // Thiết bị B: tài khoản đã tắt, localStorage trống → công tắc tắt, không gửi dấu nào.
    const B = await h.open(1440, { now: NOW, setup: human(), workspace: seed({ usage: false }) });
    await settle(B.page);
    assert.deepEqual(usage(B.server), [], 'tài khoản đã tắt thì thiết bị mới không gửi dấu nào');
    await h.show(B.page, 'projects');
    await B.page.evaluate(() => window.zenUsage.mark('quickadd'));
    await settle(B.page);
    assert.deepEqual(usage(B.server), [], 'đánh dấu tính năng cũng không gửi');
    await openSettings(B.page);
    assert.equal(await B.page.locator('#usage-share').isChecked(), false, 'công tắc hiện tắt theo tài khoản');
    await B.context.close();

    // Tài khoản bật, thiết bị từng tắt: theo tài khoản.
    const C = await h.open(1440, { now: NOW, setup: human({ 'zen-usage-off': '1' }), workspace: seed({ usage: true }) });
    await settle(C.page);
    assert.ok(usage(C.server).includes('dashboard'), 'tài khoản bật thì gửi dù thiết bị từng tắt');
    await C.context.close();

    // Không có prefs: giữ cách cũ (theo thiết bị).
    const D = await h.open(1440, { now: NOW, setup: human({ 'zen-usage-off': '1' }), workspace: seed() });
    await settle(D.page);
    assert.deepEqual(usage(D.server), [], 'chưa có prefs thì thiết bị đã tắt vẫn không gửi');
    await D.context.close();
  }
  console.log('account-prefs-browser: OK');
} finally {
  await h.close();
}
