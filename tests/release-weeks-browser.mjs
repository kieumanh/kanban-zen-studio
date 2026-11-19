// v2.72.0 (Tuần Mới): nhật ký phát triển gộp theo tuần (dist/release-weeks.js). Trang Phiên bản có hai cách xem: “Theo tuần” (mặc định; khung “Tuần này có gì mới”,
// “Tuần trước”, “Tuần dd/mm – dd/mm”, mỗi khung liệt kê các phiên bản của tuần và từ khóa gộp) và “Từng phiên bản” (đúng như trước). Mỗi phiên bản có trường `date`.
//  1. Dữ liệu giả: gom đúng tuần (thứ Hai – Chủ nhật), thứ tự mới nhất trước, nhãn Tuần này / Tuần trước / khoảng ngày, từ khóa gộp không trùng, 6 tuần đầu + nút “Xem thêm”,
//     phiên bản không ngày vào khung “Trước đó”.
//  2. Dữ liệu thật: 40 phiên bản mới nhất đều có ngày hợp lệ; cộng các dòng ở mọi tuần đúng bằng số phiên bản (không sót, không trùng).
//  3. Chuyển cách xem: nhớ ở thiết bị (zen-versions-mode), nút bấm ≥ 44 px, trạng thái aria-pressed; “Từng phiên bản” hiện đủ khung như trước.
//  4. 390 / 820 / 1440 px × sáng, tối: không tràn ngang, chữ đủ tương phản; Giang hồ giữ tiêu đề “Biên niên”.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-18T09:00:00+07:00';
const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Alpha', '#7950c8', 2)], notes: [] });
const setup =
  (theme, style) =>
  ({ context }) =>
    context.addInitScript(
      ([t, s]) => {
        localStorage.setItem('zen-theme', t);
        if (s) localStorage.setItem('zen-style', s);
      },
      [theme, style],
    );
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const FAKE = [
  { version: '9.9.5', date: '2026-11-18', name: 'Năm', title: 'Tiêu đề năm', tags: ['Tu luyện', 'Cài đặt'], items: ['a'] },
  { version: '9.9.4', date: '2026-11-17', name: 'Bốn', title: 'Tiêu đề bốn', tags: ['Cài đặt', 'Thu chi'], items: ['b'] },
  { version: '9.9.3', date: '2026-11-12', title: 'Tiêu đề ba', tags: ['Lịch'], items: ['c'] },
  { version: '9.9.2', date: '2026-11-02', title: 'Tiêu đề hai', tags: ['Lịch'], items: ['d'] },
  ...['2026-10-26', '2026-10-19', '2026-10-12', '2026-10-05', '2026-09-28', '2026-09-21'].map((d, i) => ({ version: '9.8.' + i, date: d, title: 'Cũ ' + i, tags: ['Cũ'], items: ['e'] })),
  { version: '1.0.0', title: 'Chưa ghi ngày', tags: ['Đầu'], items: ['f'] },
  { version: '1.0.1', date: 'không phải ngày', title: 'Ngày hỏng', tags: ['Đầu'], items: ['g'] },
];
async function openVersions(h, width, touch, theme, style) {
  const ctx = await h.open(width, { touch, now: NOW, setup: setup(theme, style), workspace: seed() });
  const errors = [];
  ctx.page.on('pageerror', (e) => errors.push(e.message));
  await h.show(ctx.page, 'versions');
  await ctx.page.waitForSelector('.release-log .release-card');
  return { ...ctx, errors };
}
const cards = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.release-log > .release-card')].map((c) => ({
      label: c.querySelector('.release-ver')?.textContent.trim(),
      sub: c.querySelector('h4')?.textContent.trim(),
      tags: [...c.querySelectorAll('.release-tag')].map((t) => t.textContent.trim()),
      items: [...c.querySelectorAll('li')].map((li) => li.textContent.trim()),
    })),
  );
const useFake = (page) =>
  page.evaluate((list) => {
    RELEASES.length = 0;
    RELEASES.push(...list.map((r) => ({ ...r })));
    render();
  }, FAKE);
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
  // 1. Dữ liệu giả.
  {
    const { page, errors } = await openVersions(h, 1440, false, 'light');
    await useFake(page);
    await page.waitForSelector('.release-week');
    assert.equal(await page.locator('[data-rw-mode="week"]').getAttribute('aria-pressed'), 'true', 'mặc định xem theo tuần');
    let c = await cards(page);
    assert.equal(c.length, 6, 'sáu tuần đầu');
    assert.deepEqual(c[0], { label: 'Tuần này có gì mới', sub: '2 phiên bản · 16/11 – 22/11', tags: ['Tu luyện', 'Cài đặt', 'Thu chi'], items: ['v9.9.5 · Năm — Tiêu đề năm', 'v9.9.4 · Bốn — Tiêu đề bốn'] }, 'khung tuần này');
    assert.deepEqual([c[1].label, c[1].sub, c[1].items], ['Tuần trước', '1 phiên bản · 09/11 – 15/11', ['v9.9.3 — Tiêu đề ba']], 'khung tuần trước');
    assert.deepEqual([c[2].label, c[2].sub], ['Tuần 02/11 – 08/11', '1 phiên bản · 02/11 – 08/11'], 'nhãn khoảng ngày');
    assert.equal(await page.locator('[data-rw-more]').innerText(), 'Xem thêm tuần cũ (3 tuần nữa)', 'nút xem thêm');
    assert.equal(await page.locator('.release-card', { hasText: 'Trước đó' }).count(), 0, 'khung Trước đó chỉ hiện khi đã xem hết các tuần');
    await page.click('[data-rw-more]');
    c = await cards(page);
    assert.equal(c.length, 10, 'chín tuần + khung Trước đó');
    assert.equal(await page.locator('[data-rw-more]').count(), 0, 'hết tuần thì hết nút');
    assert.deepEqual([c[9].label, c[9].sub, c[9].items], ['Trước đó', '2 phiên bản chưa ghi ngày', ['v1.0.0 — Chưa ghi ngày', 'v1.0.1 — Ngày hỏng']], 'phiên bản không ngày (hoặc ngày hỏng) vào Trước đó');
    assert.deepEqual(errors, [], 'không lỗi trang');
    // 3. Chuyển cách xem.
    await page.click('[data-rw-mode="each"]');
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-versions-mode')), 'each', 'nhớ cách xem');
    assert.equal(await page.evaluate(() => document.querySelectorAll('.release-log > .release-card').length), FAKE.length, 'Từng phiên bản: mỗi phiên bản một khung');
    assert.equal(await page.locator('[data-rw-mode="each"]').getAttribute('aria-pressed'), 'true', 'nút đang chọn');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset?.rwMode), 'each', 'tiêu điểm ở nút vừa bấm');
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.zenReady === '1');
    await h.show(page, 'versions');
    await page.waitForSelector('.release-log .release-card');
    assert.equal(await page.locator('[data-rw-mode="each"]').getAttribute('aria-pressed'), 'true', 'tải lại vẫn ở Từng phiên bản');
    assert.match(await page.locator('.release-log .release-card').first().innerText(), /^v\d+\.\d+\.\d+/, 'khung đầu là phiên bản');
    await page.click('[data-rw-mode="week"]');
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-versions-mode')), null, 'về theo tuần thì bỏ khóa');
    // 2. Dữ liệu thật.
    await page.waitForSelector('.release-week');
    const real = await page.evaluate(() => ({
      recent: RELEASES.slice(0, 40).every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date)),
      total: RELEASES.length,
    }));
    assert.equal(real.recent, true, '40 phiên bản mới nhất đều có ngày');
    for (let i = 0; i < 60 && (await page.locator('[data-rw-more]').count()); i++) await page.click('[data-rw-more]');
    const lines = await page.evaluate(() => document.querySelectorAll('.release-week li').length);
    assert.equal(lines, real.total, 'cộng các dòng ở mọi tuần đúng bằng số phiên bản');
    await page.context().close();
  }
  // 4. Bố cục.
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const { page, errors } = await openVersions(h, width, touch, theme);
      await useFake(page);
      await page.waitForSelector('.release-week');
      const hs = await page.evaluate(() => [...document.querySelectorAll('.rw-modes .btn, [data-rw-more]')].map((b) => Math.round(b.getBoundingClientRect().height)));
      for (const v of hs) assert.ok(v >= 44, 'nút cao ≥ 44 px (' + v + ')' + at);
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      for (const sel of ['.release-week li', '.release-week h4', '.rw-modes .btn'])
        assert.ok((await contrast(page, sel)) >= 4.5, 'chữ đủ tương phản: ' + sel + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await page.context().close();
    }
  }
  // Giang hồ ở 1440 px.
  {
    const { page } = await openVersions(h, 1440, false, 'light', 'giangho');
    assert.match(await page.locator('#main h1').innerText(), /^Biên niên v\d+\.\d+\.\d+/, 'tiêu đề Biên niên');
    assert.ok(await noOverflow(page), 'Giang hồ không tràn ngang');
    await page.context().close();
  }
} finally {
  await h.close();
}
console.log('release weeks browser ok');
