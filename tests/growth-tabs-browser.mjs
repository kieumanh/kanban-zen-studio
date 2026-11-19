// v2.68.0 (Phân Đường): trang Tu vi chia tab con (Hôm nay · Bát phương · Truyện ký · Thần giới · Tàng Bảo Các), mở khóa dần Thần giới (từ cấp 80) và Tàng Bảo Các (khi đã có điểm đầu tiên).
// Kiểm ở 390 (chạm) / 820 (chạm) / 1440 px × sáng, tối; Giang hồ ở 1440:
//  1. Mặc định ở Hôm nay: chỉ khối của tab ấy; thanh tab đúng ARIA (tablist, tab, tabpanel, aria-selected, chỉ một tab tabindex 0); mỗi tab chỉ hiện khối của mình.
//  2. Bàn phím: Mũi tên trái / phải, Home, End đổi tab và giữ tiêu điểm; nhớ tab qua tải lại; giá trị lạ hay kho trình duyệt bị chặn thì về Hôm nay.
//  3. Mở khóa dần: người mới (cấp thấp, chưa có điểm) không có tab Thần giới / Tàng Bảo Các và có dòng hướng dẫn; có điểm đầu tiên thì có Tàng Bảo Các; từ cấp 80 có Thần giới; tab đã nhớ mà chưa mở khóa thì về Hôm nay.
//  4. Nút “Ghé Tàng Bảo Các” ở Hôm nay chuyển sang tab Tàng Bảo Các, cuộn và đưa tiêu điểm vào tiêu đề tiệm. Hàng chờ vận công chỉ nằm ở Hôm nay.
//  5. Bố cục: không tràn ngang ở 390 px, tab cao ≥ 44 px, chữ đủ tương phản, Giang hồ giữ đủ tên tab.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá hạn chờ: ' + label);
}
// level: 'new' = chưa có điểm nào; 'low' = vài điểm (cấp thấp); 'high' = rất nhiều điểm (cấp ≥ 80).
function growthOf(level) {
  const log = [];
  if (level === 'low') for (let i = 0; i < 6; i++) log.push({ id: 'a' + i, d: '2026-11-10', s: 'task', k: 'task:t' + i, n: 'Việc ' + i, p: [2, 0, 0, 0, 0, 0, 0, 0] });
  if (level === 'high') for (let i = 0; i < 8; i++) log.push({ id: 'h' + i, d: '2026-11-10', s: 'task', k: 'task:h' + i, n: 'Việc ' + i, p: Array(8).fill(0).map((_, j) => (j === i ? 30000 : 0)) });
  return { v: 1, hero: 'nam', name: 'Mạnh', since: '2026-11-01', log, spend: [] };
}
const seed = (level) => () => ({ schema: 1, projects: [makeProject('p1', 'Alpha', '#7950c8', 4)], notes: [], growth: growthOf(level) });
const setup =
  (theme, style, store) =>
  ({ context }) =>
    context.addInitScript(
      ([t, s, st]) => {
        localStorage.setItem('zen-theme', t);
        if (s) localStorage.setItem('zen-style', s);
        if (st === 'blocked') {
          // Chỉ chặn khóa của tab (chặn cả kho thì chính bộ khung kiểm thử cũng không chạy được): đủ để thử đường lỗi của ứng dụng.
          const get = Storage.prototype.getItem;
          const set = Storage.prototype.setItem;
          Storage.prototype.getItem = function (k) {
            if (k === 'zen-gr-tab') throw new Error('blocked');
            return get.call(this, k);
          };
          Storage.prototype.setItem = function (k, v) {
            if (k === 'zen-gr-tab') throw new Error('blocked');
            return set.call(this, k, v);
          };
        } else if (st) localStorage.setItem('zen-gr-tab', st);
      },
      [theme, style, store || null],
    );
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
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



async function openAt(h, width, touch, level, theme = 'light', style, store) {
  const ctx = await h.open(width, { touch, now: NOW, setup: setup(theme, style, store), workspace: seed(level)() });
  const errors = [];
  ctx.page.on('pageerror', (e) => errors.push(e.message));
  await h.show(ctx.page, 'growth');
  await ctx.page.waitForSelector('.gr-tabs');
  return { ...ctx, errors };
}
const tabs = (page) =>
  page.evaluate(() => ({
    names: [...document.querySelectorAll('.gr-tab')].map((b) => b.textContent),
    selected: [...document.querySelectorAll('.gr-tab[aria-selected=true]')].map((b) => b.textContent),
    zero: document.querySelectorAll('.gr-tab[tabindex="0"]').length,
    heights: [...document.querySelectorAll('.gr-tab')].map((b) => Math.round(b.getBoundingClientRect().height)),
    labelled: document.querySelector('#gr-tabpanel')?.getAttribute('aria-labelledby'),
    selectedId: document.querySelector('.gr-tab[aria-selected=true]')?.id,
    controls: [...document.querySelectorAll('.gr-tab')].every((b) => b.getAttribute('aria-controls') === 'gr-tabpanel'),
    lists: document.querySelectorAll('.gr-page [role=tablist]').length,
    panels: document.querySelectorAll('.gr-page [role=tabpanel]').length,
    focus: document.activeElement?.id || '',
  }));
const has = (page, sel) => page.evaluate((s) => !!document.querySelector('#gr-tabpanel ' + s), sel);
const click = (page, name) => page.locator('.gr-tab', { hasText: name }).first().click();
const SEC = { today: '.gr-grid', how: '.gr-how', octa: '.gr-axes', history: '.gr-history', story: '.gr-path-panel', gods: '.gr-gods-panel', store: '#gr-store' };

const h = await startHarness({ seed: seed('low') });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const { page, errors } = await openAt(h, width, touch, 'low', theme);

      // 1. Mặc định Hôm nay; ARIA; mỗi tab chỉ hiện khối của mình.
      let t = await tabs(page);
      assert.deepEqual(t.names, ['Hôm nay', 'Bát phương', 'Truyện ký', 'Tàng Bảo Các', 'Tất cả'], 'cấp thấp có điểm: năm tab, chưa có Thần giới' + at);
      assert.deepEqual(t.selected, ['Hôm nay'], 'mặc định ở Hôm nay' + at);
      assert.equal(t.zero, 1, 'chỉ một tab tabindex 0' + at);
      assert.deepEqual([t.lists, t.panels, t.controls, t.labelled === t.selectedId], [1, 1, true, true], 'ARIA: một tablist, một tabpanel, aria-controls, aria-labelledby' + at);
      for (const v of t.heights) assert.ok(v >= 44, 'tab cao ≥ 44 px (' + v + ')' + at);
      assert.ok(await has(page, SEC.today) && (await has(page, SEC.how)), 'Hôm nay có Bát phương đồ và Tâm pháp' + at);
      for (const k of ['octa', 'history', 'story', 'gods', 'store']) assert.equal(await has(page, SEC[k]), false, 'Hôm nay không có khối ' + k + at);
      assert.match(await page.locator('.gr-tab-lock').textContent(), /Thần giới mở khi các hạ đạt cấp 80/, 'dòng hướng dẫn mở khóa Thần giới' + at);
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);

      await click(page, 'Bát phương');
      t = await tabs(page);
      assert.deepEqual([t.selected, t.focus], [['Bát phương'], 'gr-tab-octa'], 'đổi sang Bát phương, tiêu điểm ở tab' + at);
      assert.ok((await has(page, SEC.octa)) && (await has(page, SEC.history)), 'Bát phương có các mạch và lịch sử' + at);
      assert.equal(await has(page, SEC.today), false, 'Bát phương không có khối Hôm nay' + at);
      await click(page, 'Truyện ký');
      assert.ok(await has(page, SEC.story), 'Truyện ký có lộ trình' + at);
      await click(page, 'Tàng Bảo Các');
      assert.ok((await has(page, SEC.store)) && (await has(page, '.gr-spend')), 'Tàng Bảo Các có tiệm và sổ bảo vật' + at);
      for (const sel of ['.gr-tab', '.gr-tab[aria-selected=true]', '.gr-tab-lock']) {
        await click(page, 'Hôm nay');
        assert.ok((await contrast(page, sel)) >= 4.5, 'chữ đủ tương phản: ' + sel + at);
      }

      // Tất cả = đúng trang dài như trước: đủ các khối, không có dòng hướng dẫn mở khóa.
      await click(page, 'Tất cả');
      for (const k of ['today', 'how', 'octa', 'history', 'story', 'gods', 'store']) assert.ok(await has(page, SEC[k]), 'Tất cả có khối ' + k + at);
      assert.ok(await has(page, '.gr-spend'), 'Tất cả có sổ bảo vật' + at);
      assert.equal(await page.locator('.gr-tab-lock').count(), 0, 'Tất cả không có dòng hướng dẫn' + at);
      assert.ok(await noOverflow(page), 'Tất cả không tràn ngang' + at);

      // 2. Bàn phím: mũi tên, Home, End; tiêu điểm đi theo.
      await click(page, 'Hôm nay');
      await page.keyboard.press('ArrowRight');
      t = await tabs(page);
      assert.deepEqual([t.selected, t.focus], [['Bát phương'], 'gr-tab-octa'], 'Mũi tên phải' + at);
      await page.keyboard.press('End');
      t = await tabs(page);
      assert.deepEqual([t.selected, t.focus], [['Tất cả'], 'gr-tab-all'], 'End' + at);
      await page.keyboard.press('ArrowRight');
      assert.deepEqual((await tabs(page)).selected, ['Hôm nay'], 'Mũi tên phải ở cuối vòng về đầu' + at);
      await page.keyboard.press('ArrowLeft');
      assert.deepEqual((await tabs(page)).selected, ['Tất cả'], 'Mũi tên trái ở đầu vòng về cuối' + at);
      await page.keyboard.press('Home');
      assert.deepEqual((await tabs(page)).selected, ['Hôm nay'], 'Home' + at);
      // Vẽ lại trang (đồng bộ, lưu điểm…) không làm mất tiêu điểm đang ở tab.
      await page.focus('#gr-tab-octa');
      await page.evaluate(() => render());
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'gr-tab-octa', 'vẽ lại trang giữ tiêu điểm ở tab' + at);

      // 4. Ghé Tàng Bảo Các.
      await page.locator('[data-gr-store-go]').click();
      await page.waitForSelector('#gr-store');
      t = await tabs(page);
      assert.deepEqual(t.selected, ['Tàng Bảo Các'], 'nút Ghé Tàng Bảo Các chuyển sang tab tiệm' + at);
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'gr-store-title', 'tiêu điểm vào tiêu đề tiệm' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await page.context().close();
    }
  }

  // 2b. Nhớ tab qua tải lại; giá trị lạ; kho bị chặn.
  {
    const { page } = await openAt(h, 1440, false, 'low');
    await click(page, 'Truyện ký');
    await page.reload();
    await h.show(page, 'growth');
    await page.waitForSelector('.gr-tabs');
    assert.deepEqual((await tabs(page)).selected, ['Truyện ký'], 'nhớ tab qua tải lại');
    await page.context().close();
    for (const [label, val, want] of [['giá trị lạ', 'abc', 'Hôm nay'], ['tab đã nhớ nhưng chưa mở khóa', 'gods', 'Hôm nay'], ['tab hợp lệ', 'octa', 'Bát phương']]) {
      const c = await openAt(h, 1440, false, 'low', 'light', undefined, val);
      assert.deepEqual((await tabs(c.page)).selected, [want], label);
      await c.page.context().close();
    }
    const b = await openAt(h, 1440, false, 'low', 'light', undefined, 'blocked');
    assert.deepEqual((await tabs(b.page)).selected, ['Hôm nay'], 'kho bị chặn: vẫn ở Hôm nay');
    await click(b.page, 'Bát phương');
    assert.deepEqual((await tabs(b.page)).selected, ['Bát phương'], 'kho bị chặn: vẫn đổi tab được');
    assert.deepEqual(b.errors, [], 'kho bị chặn: không lỗi trang');
    await b.page.context().close();
  }

  // 3. Mở khóa dần.
  {
    const n = await openAt(h, 1440, false, 'new');
    let t = await tabs(n.page);
    assert.deepEqual(t.names, ['Hôm nay', 'Bát phương', 'Truyện ký', 'Tất cả'], 'chưa có điểm: chưa có Tàng Bảo Các và Thần giới');
    assert.match(await n.page.locator('.gr-tab-lock').textContent(), /Tàng Bảo Các mở khi các hạ có điểm tu vi đầu tiên/, 'dòng hướng dẫn Tàng Bảo Các');
    await n.page.context().close();
    const hi = await openAt(h, 1440, false, 'high');
    t = await tabs(hi.page);
    assert.deepEqual(t.names, ['Hôm nay', 'Bát phương', 'Truyện ký', 'Thần giới', 'Tàng Bảo Các', 'Tất cả'], 'cấp ≥ 80: đủ sáu tab');
    assert.equal(await hi.page.locator('.gr-tab-lock').count(), 0, 'đủ mở khóa thì không còn dòng hướng dẫn');
    await click(hi.page, 'Thần giới');
    assert.ok(await has(hi.page, SEC.gods), 'Thần giới có khối Thần giới');
    assert.equal(await has(hi.page, SEC.store), false, 'Thần giới không có tiệm');
    assert.deepEqual(hi.errors, [], 'không lỗi trang');
    await hi.page.context().close();
  }

  // 4b. Hàng chờ vận công chỉ nằm ở Hôm nay.
  {
    const { page } = await openAt(h, 1440, false, 'low');
    await page.evaluate(() => {
      const t = project('p1').tasks.find((x) => x.col === 'Done');
      t.xpWait = true;
      render();
    });
    await page.waitForSelector('.gr-queue');
    await click(page, 'Bát phương');
    assert.equal(await page.locator('.gr-queue').count(), 0, 'Bát phương không có hàng chờ');
    await click(page, 'Hôm nay');
    assert.equal(await page.locator('.gr-queue').count(), 1, 'Hôm nay có hàng chờ');
    await page.context().close();
  }

  // 5. Giang hồ ở 1440 px.
  {
    const { page } = await openAt(h, 1440, false, 'low', 'light', 'giangho');
    const t = await tabs(page);
    assert.deepEqual(t.names, ['Hôm nay', 'Bát phương', 'Truyện ký', 'Tàng Bảo Các', 'Tất cả'], 'Giang hồ giữ đủ tên tab');
    assert.equal(await page.evaluate(() => /\b(hoàn thành|dự án|báo cáo|bạn)\b/i.test(document.querySelector('.gr-tabs').textContent + document.querySelector('.gr-tab-lock').textContent)), false, 'không lẫn chữ Thiền');
    await page.context().close();
  }
} finally {
  await h.close();
}
console.log('growth tabs browser ok');
