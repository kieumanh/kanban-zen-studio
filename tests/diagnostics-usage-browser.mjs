// v2.71.0 (Thám Báo): chỉ số dùng ẩn danh có công tắc tắt và vài dấu đo mới.
//  1. Cài đặt → Tài khoản & bảo mật có khối “Chỉ số ẩn danh” (mặc định bật), mô tả rõ gửi gì và không gửi gì; tắt thì không còn dấu dùng nào được gửi
//     (kể cả sau khi tải lại), bật lại thì gửi lại; lựa chọn chỉ nằm ở thiết bị (localStorage zen-usage-off), không gửi lên máy chủ.
//  2. Dấu mới (mỗi tính năng tối đa một dấu mỗi ngày mỗi thiết bị): award-save / award-later ở bảng vận công (Để sau, Lưu; không đếm lần bảng bị thay chỗ),
//     growth-<tab> khi mở tab Tu vi, open-report, quickadd; mọi dấu chỉ gồm {type, feature, version}, không mã người dùng hay nội dung việc.
//  3. Giữ nguyên quy tắc cũ: Do Not Track / Global Privacy Control thì không gửi gì, kể cả dấu mới.
//  4. Khối trong Cài đặt: ô chọn ≥ 44 px, không tràn ngang, chữ đủ tương phản ở 390 / 820 / 1440 px × sáng, tối; Giang hồ không lẫn chữ Thiền.
// Trình duyệt tự động bị tắt báo cáo (navigator.webdriver) nên bài này gỡ cờ đó như diagnostics-browser.mjs.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';
import { openGrowthTab } from './lib/growth-tab.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 100; i++) {
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
const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Alpha', '#7950c8', 6)], notes: [], growth: growthOf() });
const human =
  ({ dnt = false, theme = 'light', style } = {}) =>
  async ({ context, page, state }) => {
    state.events = [];
    await context.addInitScript(
      ({ dnt, theme, style }) => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        if (dnt) Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
        localStorage.setItem('zen-theme', theme);
        if (style) localStorage.setItem('zen-style', style);
      },
      { dnt, theme, style },
    );
    await page.route('**/api/client-event', (route) => {
      state.events.push(route.request().postDataJSON());
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
  };
const usage = (server) => server.events.filter((e) => e.type === 'usage').map((e) => e.feature);
const settle = (page) => page.waitForTimeout(400);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const openSettings = async (page) => {
  await page.evaluate(() => accountPanel());
  await page.waitForSelector('[data-usage-block]', { state: 'attached' });
  await page.evaluate(() => {
    const g = document.querySelector('details.wf-settings-group[data-group=account]');
    if (g) g.open = true;
  });
};
const task = (server, id) => server.workspace.projects[0].tasks.find((t) => t.id === id);
const done = (page, id) => page.evaluate((i) => moveTask(project('p1'), project('p1').tasks.find((t) => t.id === i), 'Done'), id);
const contrast = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cx = Object.assign(document.createElement('canvas'), {
      width: 1,
      height: 1,
    }).getContext('2d', { willReadFrequently: true });
    const rgba = (css) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const mix = (c, under) =>
      [0, 1, 2].map((i) => c[i] * c[3] + under[i] * (1 - c[3]));
    const lum = ([r, g, b]) =>
      [r, g, b]
        .map((v) =>
          (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
        )
        .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const chain = [];
    for (let n = el; n; n = n.parentElement)
      chain.push(getComputedStyle(n).backgroundColor);
    let bg = [255, 255, 255];
    for (const css of chain.reverse()) {
      const c = rgba(css);
      if (c[3] > 0) bg = mix(c, bg);
    }
    const fg = mix(rgba(getComputedStyle(el).color), bg),
      [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);



const h = await startHarness({ seed });
try {
  // 1. Công tắc: mặc định bật, tắt thì không gửi, nhớ qua tải lại, bật lại thì gửi lại.
  {
    const { page, context, server } = await h.open(1440, { now: NOW, setup: human(), workspace: seed() });
    await settle(page);
    assert.deepEqual(usage(server), ['dashboard'], 'mặc định có gửi dấu cho màn hình đầu');
    await openSettings(page);
    assert.equal(await page.locator('#usage-share').isChecked(), true, 'mặc định bật');
    const text = await page.locator('[data-usage-block]').innerText();
    assert.match(text, /Không kèm tên, email, nội dung việc hay ghi chú, mã tài khoản hay địa chỉ IP/, 'nói rõ không gửi gì');
    assert.match(text, /tối đa một dấu cho mỗi màn hình hoặc tính năng/, 'nói rõ gửi gì');
    assert.match(text, /Do Not Track/, 'nhắc tôn trọng Do Not Track');
    assert.equal(await page.locator('[data-usage-block] [data-group], [data-usage-block] a').count(), 0, 'khối không có liên kết ngoài');
    await page.locator('#usage-share').click();
    assert.match(await page.locator('#toast').textContent(), /Đã tắt chỉ số ẩn danh trên thiết bị này/, 'thông báo tắt');
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-usage-off')), '1', 'lưu ở thiết bị');
    await page.evaluate(() => {
      localStorage.removeItem('zen-usage-day');
      document.querySelector('#editor').close();
    });
    const before = server.events.length;
    await h.show(page, 'projects');
    await page.evaluate(() => window.zenUsage.mark('quickadd'));
    await settle(page);
    assert.equal(server.events.length, before, 'tắt rồi thì không gửi dấu nào');
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.zenReady === '1');
    await h.show(page, 'projects');
    await settle(page);
    assert.equal(server.events.length, before, 'tải lại vẫn tắt');
    await openSettings(page);
    assert.equal(await page.locator('#usage-share').isChecked(), false, 'công tắc nhớ trạng thái tắt');
    await page.locator('#usage-share').click();
    assert.match(await page.locator('#toast').textContent(), /Đã bật chỉ số ẩn danh/, 'thông báo bật');
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-usage-off')), null, 'bật lại thì bỏ khóa');
    await page.evaluate(() => document.querySelector('#editor').close());
    await h.show(page, 'dashboard');
    await settle(page);
    assert.ok(server.events.length > before, 'bật lại thì gửi lại');
    assert.equal(server.workspace.usageOff, undefined, 'lựa chọn không lên máy chủ');
    await context.close();
  }

  // 2. Dấu mới.
  {
    const { page, context, server } = await h.open(1440, { now: NOW, setup: human(), workspace: seed() });
    await h.show(page, 'growth');
    await openGrowthTab(page, 'story');
    await openGrowthTab(page, 'octa');
    await page.click('[data-gr-report]');
    await page.waitForSelector('.gr-cult');
    // Bảng vận công: Để sau rồi Lưu.
    await done(page, 'p1t0');
    await page.waitForSelector('#growth-award[open]');
    await page.locator('#growth-award [data-gr-skip]').click();
    await until(() => task(server, 'p1t0').xpWait === true, 'cờ xpWait');
    await done(page, 'p1t1');
    await page.waitForSelector('#growth-award[open]');
    await page.locator('#growth-award [data-gr-plus="6"]').click();
    await page.locator('#growth-award [data-gr-save]').click();
    await until(() => server.workspace.growth.log.some((e) => e.k === 'task:p1t1'), 'điểm lên máy chủ');
    // Thêm nhanh.
    await page.evaluate(() => window.zenQuick.create('Gọi anh Sơn #alpha'));
    await settle(page);
    const got = usage(server);
    for (const f of ['growth', 'growth-story', 'growth-octa', 'open-report', 'award-later', 'award-save', 'quickadd'])
      if (f !== 'growth') assert.ok(got.includes(f), 'có dấu ' + f + ', thấy ' + JSON.stringify(got));
    assert.equal(new Set(got).size, got.length, 'mỗi tính năng tối đa một dấu mỗi ngày, thấy ' + JSON.stringify(got));
    for (const e of server.events.filter((x) => x.type === 'usage')) assert.deepEqual(Object.keys(e).sort(), ['feature', 'type', 'version'], 'dấu chỉ gồm loại, tính năng, phiên bản');
    assert.equal(JSON.stringify(server.events).includes('Gọi anh Sơn'), false, 'không gửi nội dung việc');
    // Bấm lại không gửi thêm (cùng ngày).
    const n = server.events.length;
    await openGrowthTab(page, 'story');
    await page.evaluate(() => window.zenQuick.create('Việc nữa #alpha'));
    await settle(page);
    assert.equal(server.events.length, n, 'cùng ngày không gửi lại');
    // Tên lạ bị bỏ ở phía trình duyệt.
    await page.evaluate(() => window.zenUsage.mark('Tên có Dấu & ký tự!'));
    await settle(page);
    assert.equal(server.events.length, n, 'tên sai dạng không gửi');
    await context.close();
  }

  // 3. Do Not Track: không gửi gì, kể cả dấu mới.
  {
    const { page, context, server } = await h.open(1440, { now: NOW, setup: human({ dnt: true }), workspace: seed() });
    await h.show(page, 'growth');
    await page.evaluate(() => window.zenUsage.mark('quickadd'));
    await settle(page);
    assert.equal(server.events.length, 0, 'Do Not Track: không gửi gì');
    await context.close();
  }

  // 4. Bố cục khối trong Cài đặt.
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const { page, context } = await h.open(width, { touch, now: NOW, setup: human({ theme }), workspace: seed() });
      await openSettings(page);
      await page.locator('[data-usage-block]').scrollIntoViewIfNeeded();
      const row = await page.evaluate(() => Math.round(document.querySelector('[data-usage-block] .check-row').getBoundingClientRect().height));
      assert.ok(row >= 44, 'hàng công tắc cao ≥ 44 px (' + row + ')' + at);
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      for (const sel of ['[data-usage-block] h4', '[data-usage-block] .help-copy', '[data-usage-block] .check-row span'])
        assert.ok((await contrast(page, sel)) >= 4.5, 'chữ đủ tương phản: ' + sel + at);
      await context.close();
    }
  }
  // Giang hồ ở 1440 px.
  {
    const { page, context } = await h.open(1440, { now: NOW, setup: human({ style: 'giangho' }), workspace: seed() });
    await openSettings(page);
    const t = await page.locator('[data-usage-block]').innerText();
    assert.equal(/\b(hoàn thành|dự án|báo cáo|bạn)\b/i.test(t), false, 'không lẫn chữ Thiền: ' + t);
    await context.close();
  }
} finally {
  await h.close();
}
console.log('diagnostics usage browser ok');
