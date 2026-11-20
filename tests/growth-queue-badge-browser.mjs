// v2.73.0 (Chấm Chờ): mục “Điểm tích lũy” ở thanh bên có chấm đếm số việc chờ vận công (v2.67.0), để biết còn việc chờ mà không phải mở trang.
// Chấm chỉ đọc dữ liệu có sẵn (zenQueue.waiting), không thêm trường hay bảng nào. Kiểm ở 390 / 820 (chạm) / 1440 px × sáng, tối; Giang hồ và chỉ đọc ở 1440:
//  1. Chưa có việc chờ: không có chấm, nút không có nhãn thừa. Có việc chờ: chấm đúng số, nút có nhãn đọc và title nêu số việc.
//  2. Cập nhật tức thì: thêm việc chờ thì số tăng; Vận công xong (gỡ cờ) thì số giảm; hết thì chấm biến mất cùng nhãn.
//  3. Trên 99 việc hiện “99+”. Chấm đủ tương phản, đủ lớn, không làm thanh bên tràn ngang; mục vẫn bấm được và mở trang Điểm tích lũy.
//  4. Giang hồ và chỉ đọc vẫn hiện chấm.
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
const growthOf = () => ({ v: 1, hero: 'nam', name: 'Mạnh', since: '2026-11-01', log: [], spend: [] });
const seed = () => {
  const p1 = makeProject('p1', 'Alpha', '#7950c8', 8);
  return { schema: 1, projects: [p1], notes: [], growth: growthOf() };
};
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
const contrast = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
    const rgba = (css) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const mix = (c, under) => [0, 1, 2].map((i) => c[i] * c[3] + under[i] * (1 - c[3]));
    const lum = ([r, g, b]) => [r, g, b].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.push(getComputedStyle(n).backgroundColor);
    let bg = [255, 255, 255];
    for (const css of chain.reverse()) {
      const c = rgba(css);
      if (c[3] > 0) bg = mix(c, bg);
    }
    const fg = mix(rgba(getComputedStyle(el).color), bg),
      [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);

const badge = (page) =>
  page.evaluate(() => {
    const b = document.querySelector('.sidebar [data-view="growth"]');
    const d = b && b.querySelector('.nav-queue');
    const r = d ? d.getBoundingClientRect() : null;
    return {
      n: d ? d.textContent : null,
      label: b ? b.getAttribute('aria-label') : null,
      title: b ? b.getAttribute('title') : null,
      hidden: d ? d.getAttribute('aria-hidden') : null,
      w: r ? Math.round(r.width) : 0,
      h: r ? Math.round(r.height) : 0,
      inside: r && b ? r.right <= b.getBoundingClientRect().right + 0.5 && r.left >= b.getBoundingClientRect().left : null,
    };
  });
// Cất việc vào hàng chờ trực tiếp bằng cờ xpWait (cùng dữ liệu bảng “Để sau” ghi) rồi vẽ lại.
const queue = (page, ids) =>
  page.evaluate((list) => {
    const p = project('p1');
    for (const id of list) {
      const t = p.tasks.find((x) => x.id === id);
      t.col = 'Done';
      t.xpWait = true;
    }
    save();
    render();
  }, ids);
const openNav = (page) => page.evaluate(() => document.querySelector('.sidebar').classList.add('open'));

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const ctx = await h.open(width, { touch, now: NOW, setup: setup(theme), workspace: seed() });
      const { page } = ctx;
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'growth');
      await page.waitForSelector('.sidebar [data-view="growth"]', { state: 'attached' });
      await openNav(page);

      // 1. Chưa có việc chờ: không chấm, không nhãn thừa.
      let b = await badge(page);
      assert.equal(b.n, null, 'chưa có việc chờ thì không có chấm' + at);
      assert.equal(b.label, null, 'không có nhãn thừa' + at);

      await queue(page, ['p1t0', 'p1t1']);
      b = await badge(page);
      assert.equal(b.n, '2', 'chấm đếm hai việc chờ' + at);
      assert.equal(b.label, 'Điểm tích lũy, 2 việc chờ vận công', 'nhãn đọc nêu số việc' + at);
      assert.equal(b.title, b.label, 'title trùng nhãn' + at);
      assert.equal(b.hidden, 'true', 'chấm ẩn khỏi trình đọc (đã có nhãn trên nút)' + at);
      assert.ok(b.w >= 20 && b.h >= 20, 'chấm đủ lớn (' + b.w + '×' + b.h + ')' + at);
      assert.ok(b.inside, 'chấm nằm trong nút' + at);
      assert.ok((await contrast(page, '.sidebar [data-view="growth"] .nav-queue')) >= 4.5, 'chấm đủ tương phản' + at);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'không tràn ngang' + at);

      // 2. Cập nhật: thêm một việc thì số tăng; gỡ cờ thì số giảm; hết thì chấm và nhãn biến mất.
      await queue(page, ['p1t2']);
      assert.equal((await badge(page)).n, '3', 'thêm việc chờ thì số tăng' + at);
      await page.evaluate(() => {
        const p = project('p1');
        p.tasks.find((x) => x.id === 'p1t0').xpWait = undefined;
        delete p.tasks.find((x) => x.id === 'p1t0').xpWait;
        save();
        render();
      });
      assert.equal((await badge(page)).n, '2', 'gỡ cờ thì số giảm' + at);
      // Việc đã có điểm trong sổ cái không tính (cờ thừa).
      await page.evaluate(() => {
        data.growth.log.push({ id: 'z1', d: '2026-11-10', s: 'task', k: 'task:p1t1', n: 'Việc số 2', p: [0, 0, 0, 0, 0, 0, 2, 0] });
        save();
        render();
      });
      assert.equal((await badge(page)).n, '1', 'việc đã có điểm không tính' + at);
      await page.evaluate(() => {
        const p = project('p1');
        delete p.tasks.find((x) => x.id === 'p1t2').xpWait;
        save();
        render();
      });
      b = await badge(page);
      assert.equal(b.n, null, 'hết việc chờ thì chấm biến mất' + at);
      assert.equal(b.label, null, 'nhãn do chấm đặt cũng gỡ' + at);
      assert.equal(b.title, null, 'title do chấm đặt cũng gỡ' + at);

      // 3. Trên 99 việc hiện “99+”.
      if (width === 1440 && theme === 'light') {
        await page.evaluate(() => {
          const p = project('p1');
          for (let i = 0; i < 120; i++) p.tasks.push({ id: 'bulk' + i, title: 'Việc dư ' + i, col: 'Done', xpWait: true, description: '', due: '2026-11-01', priority: 'q2', tag: 'Công việc', checks: [] });
          save();
          render();
        });
        b = await badge(page);
        assert.equal(b.n, '99+', 'trên 99 việc hiện 99+' + at);
        assert.equal(b.label, 'Điểm tích lũy, 120 việc chờ vận công', 'nhãn vẫn nêu số thật' + at);
        assert.ok(b.inside && b.w <= 40, 'chấm 99+ vẫn gọn trong nút' + at);
      }

      // Mục vẫn bấm được và mở trang Điểm tích lũy.
      await queue(page, ['p1t3']);
      await page.locator('.sidebar [data-view="growth"]').click();
      await page.waitForSelector('.gr-queue');
      assert.equal(await page.locator('.gr-queue-n').textContent(), (await badge(page)).n === '99+' ? '121' : '1', 'chấm và khối Chờ vận công cùng số' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await page.context().close();
    }
  }

  // 4. Giang hồ và chỉ đọc ở 1440 px.
  for (const mode of ['giangho', 'readonly']) {
    const at = ' (1440px, ' + mode + ')';
    const ctx = await h.open(1440, { touch: false, now: NOW, setup: mode === 'giangho' ? setup('light', 'giangho') : setup('light'), workspace: seed() });
    const { page } = ctx;
    await h.show(page, 'growth');
    await page.waitForSelector('.sidebar [data-view="growth"]', { state: 'attached' });
    await queue(page, ['p1t0', 'p1t1', 'p1t2']);
    if (mode === 'readonly') {
      await page.evaluate(() => {
        contentReadOnly = true;
        render();
      });
    }
    const b = await badge(page);
    assert.equal(b.n, '3', 'chấm hiện' + at);
    assert.ok((await contrast(page, '.sidebar [data-view="growth"] .nav-queue')) >= 4.5, 'chấm đủ tương phản' + at);
    await page.context().close();
  }
  console.log('growth-queue-badge-browser: OK');
} finally {
  await h.close();
}
