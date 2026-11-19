// v2.67.0 (Tích Công): “Để sau” ở bảng vận công không còn làm mất điểm. Việc vào hàng chờ (trường tùy chọn `xpWait` trên việc), khối “Chờ vận công” ở trang
// Điểm tích lũy cho chia từng việc hoặc “Chia một lượt”; tùy chọn “Gộp cuối ngày” (data.growth.batch) cất việc vào hàng chờ ngay khi xong, không hiện bảng.
// Kiểm ở 390 (chạm) / 820 (chạm) / 1440 px × sáng, tối; Giang hồ và chỉ đọc ở 1440:
//  1. Chưa có việc chờ thì không có khối. Để sau (nút) và Esc đều cất việc vào hàng chờ, không ghi điểm, báo bằng thông báo; khối đếm đúng và hiện đủ tên việc, đại sự, nút Vận công có tên đọc.
//  2. Vận công từ khối: bảng mở đúng việc, Lưu ghi sổ cái đúng một dòng và gỡ cờ cùng lần lưu; Để sau ở bảng mở từ khối thì việc vẫn chờ, không báo lại.
//  3. Chia một lượt: bảng lần lượt cho từng việc; Esc dừng lượt, việc chưa chia vẫn chờ; tiêu điểm về khối.
//  4. Gộp cuối ngày (bật ở Cài đặt → Thông báo → Điểm tích lũy): xong việc không mở bảng, việc vào hàng chờ; tắt đi thì hỏi mỗi lần như cũ.
//  5. Cờ thừa (việc rời cột Hoàn thành, hoặc đã có điểm) không hiện. Chỉ đọc: có khối nhưng không có nút. Bố cục: không tràn ngang, nút ≥ 44 px, chữ đủ tương phản, Giang hồ đủ chữ.
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
function growthOf(points) {
  const log = [];
  points.forEach((pts, axis) => {
    for (let k = 0; k < pts; k++) {
      const p = Array(8).fill(0);
      p[axis] = 2;
      log.push({ id: 'a' + axis + 'k' + k, d: '2026-11-10', s: 'task', k: 'task:' + axis + '-' + k, n: 'Việc ' + axis + '-' + k, p });
    }
  });
  return { v: 1, hero: 'nam', name: 'Mạnh', since: '2026-11-01', log, spend: [] };
}
// Alpha 8 việc: p1t3 và p1t7 đã Done sẵn (chưa có điểm, không có cờ). Việc khác sẽ được kéo sang Done trong bài.
const seed = (extra) => () => {
  const p1 = makeProject('p1', 'Alpha', '#7950c8', 8);
  return { schema: 1, projects: [p1], notes: [], growth: { ...growthOf([2, 2, 2, 2, 2, 2, 2, 2]), ...(extra || {}) } };
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


const task = (server, id) => server.workspace.projects[0].tasks.find((t) => t.id === id);
const scored = (server, id) => server.workspace.growth.log.filter((e) => e.k === 'task:' + id);
const done = (page, id) => page.evaluate((i) => moveTask(project('p1'), project('p1').tasks.find((t) => t.id === i), 'Done'), id);
const rows = (page) =>
  page.evaluate(() => ({
    n: document.querySelector('.gr-queue-n')?.textContent ?? null,
    items: [...document.querySelectorAll('.gr-queue-list li')].map((li) => li.querySelector('strong').textContent + ' | ' + li.querySelector('small').textContent),
    labels: [...document.querySelectorAll('[data-queue-one]')].map((b) => b.getAttribute('aria-label')),
    heights: [...document.querySelectorAll('.gr-queue .btn')].map((b) => Math.round(b.getBoundingClientRect().height)),
  }));
async function openGrowth(h, width, touch, theme, style, extra) {
  const ctx = await h.open(width, { touch, now: NOW, setup: setup(theme, style), workspace: seed(extra)() });
  const errors = [];
  ctx.page.on('pageerror', (e) => errors.push(e.message));
  await h.show(ctx.page, 'growth');
  return { ...ctx, errors };
}
// Lên cấp có thể mở chương truyện ký hoặc thẻ huy hiệu phía trên bảng vận công: đóng chúng (không đụng bảng vận công và hộp Cài đặt).
async function settle(page) {
  let quiet = 0;
  for (let i = 0; i < 20 && quiet < 3; i++) {
    await wait(250);
    const open = page.locator('dialog[open]:not(#growth-award):not(#editor)');
    if (await open.count()) {
      quiet = 0;
      await page.keyboard.press('Escape');
    } else quiet++;
  }
}
const toast = (page) => page.evaluate(() => document.querySelector('#toast').textContent);

const h = await startHarness({ seed: seed() });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const { page, server, errors } = await openGrowth(h, width, touch, theme);

      // 1. Chưa có việc chờ: không có khối. Để sau (nút) cất việc vào hàng chờ.
      assert.equal(await page.locator('.gr-queue').count(), 0, 'chưa có việc chờ thì không có khối' + at);
      await done(page, 'p1t0');
      await page.waitForSelector('#growth-award[open]');
      await page.locator('#growth-award [data-gr-skip]').click();
      await until(() => task(server, 'p1t0').xpWait === true, 'cờ xpWait lên máy chủ');
      assert.equal(scored(server, 'p1t0').length, 0, 'Để sau không ghi điểm' + at);
      assert.match(await toast(page), /Đã cất “Việc số 1” vào hàng chờ vận công/, 'thông báo cất vào hàng chờ' + at);
      await page.waitForSelector('.gr-queue');
      let r = await rows(page);
      assert.equal(r.n, '1', 'khối đếm một việc' + at);
      assert.deepEqual(r.items, ['Việc số 1 | Alpha'], 'tên việc và đại sự' + at);
      assert.deepEqual(r.labels, ['Vận công: Việc số 1'], 'tên đọc của nút Vận công' + at);
      for (const v of r.heights) assert.ok(v >= 44, 'nút cao ≥ 44 px (' + v + ')' + at);
      // Esc cũng cất vào hàng chờ.
      await done(page, 'p1t1');
      await page.waitForSelector('#growth-award[open]');
      await page.keyboard.press('Escape');
      await until(() => task(server, 'p1t1').xpWait === true, 'Esc cũng cất vào hàng chờ');
      r = await rows(page);
      assert.equal(r.n, '2', 'khối đếm hai việc' + at);
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      for (const sel of ['.gr-queue-name small', '.gr-queue .help-copy', '.gr-queue-n'])
        assert.ok((await contrast(page, sel)) >= 4.5, 'chữ đủ tương phản: ' + sel + at);

      // 2. Vận công từ khối: Lưu ghi đúng một dòng và gỡ cờ.
      await page.locator('[data-queue-one="p1t0"]').click();
      await page.waitForSelector('#growth-award[open]');
      assert.match(await page.locator('#growth-award h2').textContent(), /Vận công bồi bổ/, 'bảng vận công mở' + at);
      assert.match(await page.locator('#growth-award').textContent(), /Việc số 1/, 'đúng việc' + at);
      await page.locator('#growth-award [data-gr-plus="6"]').click();
      await page.locator('#growth-award [data-gr-plus="6"]').click();
      await page.locator('#growth-award [data-gr-save]').click();
      await until(() => scored(server, 'p1t0').length === 1, 'sổ cái ghi điểm');
      assert.deepEqual(scored(server, 'p1t0')[0].p, [0, 0, 0, 0, 0, 0, 2, 0], 'điểm vào đúng ô' + at);
      await until(() => task(server, 'p1t0').xpWait === undefined, 'cờ được gỡ cùng lần lưu');
      await settle(page);
      r = await rows(page);
      assert.equal(r.n, '1', 'còn một việc chờ' + at);
      // Để sau ở bảng mở từ khối: việc vẫn chờ, không báo lại việc “đã cất”.
      await page.evaluate(() => (document.querySelector('#toast').textContent = ''));
      await page.locator('[data-queue-one="p1t1"]').click();
      await page.waitForSelector('#growth-award[open]');
      await page.locator('#growth-award [data-gr-skip]').click();
      await page.waitForSelector('#growth-award', { state: 'detached' });
      assert.equal(task(server, 'p1t1').xpWait, true, 'Để sau từ khối thì vẫn chờ' + at);
      assert.equal(scored(server, 'p1t1').length, 0, 'không ghi điểm' + at);
      assert.equal(await toast(page), '', 'không báo “đã cất” lần nữa' + at);
      assert.equal((await rows(page)).n, '1', 'vẫn một việc chờ' + at);

      // 3. Chia một lượt: hai việc chờ, lần lượt hai bảng; Esc ở bảng thứ hai dừng lượt.
      await done(page, 'p1t2');
      await page.waitForSelector('#growth-award[open]');
      await page.locator('#growth-award [data-gr-skip]').click();
      await until(() => task(server, 'p1t2').xpWait === true, 'việc thứ hai chờ');
      await settle(page);
      assert.equal((await rows(page)).n, '2', 'hai việc chờ' + at);
      await settle(page);
      await page.locator('[data-queue-all]').click();
      await page.waitForSelector('#growth-award[open]');
      assert.match(await page.locator('#growth-award').textContent(), /Việc số 2/, 'bảng đầu của lượt: việc đầu hàng chờ' + at);
      await page.locator('#growth-award [data-gr-plus="1"]').click();
      await page.locator('#growth-award [data-gr-plus="1"]').click();
      await page.locator('#growth-award [data-gr-save]').click();
      await until(() => scored(server, 'p1t1').length === 1, 'việc đầu được chia');
      await page.waitForFunction(() => document.querySelector('#growth-award[open]') && /Việc số 3/.test(document.querySelector('#growth-award').textContent));
      await settle(page);
      await page.keyboard.press('Escape');
      await page.waitForSelector('#growth-award', { state: 'detached' });
      assert.equal(task(server, 'p1t2').xpWait, true, 'Esc dừng lượt: việc chưa chia vẫn chờ' + at);
      assert.equal(scored(server, 'p1t2').length, 0, 'không ghi điểm cho việc bị dừng' + at);
      assert.equal(await page.locator('#growth-award').count(), 0, 'lượt đã dừng, không mở thêm bảng' + at);
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('gr-queue')), true, 'tiêu điểm về khối' + at);
      assert.equal((await rows(page)).n, '1', 'còn một việc chờ' + at);

      // 4. Gộp cuối ngày: bật ở Cài đặt, xong việc không mở bảng.
      await page.evaluate(() => accountPanel());
      await page.waitForSelector('.nf-blocks', { state: 'attached' });
      await page.evaluate(() => {
        [...document.querySelectorAll('details.wf-settings-group')].find((d) => d.querySelector('summary').textContent.trim() === 'Thông báo').open = true;
      });
      assert.equal(await page.locator('#nf-growth-batch').isChecked(), false, 'mặc định hỏi mỗi lần' + at);
      assert.ok(await page.locator('label:has(#nf-growth-batch)').textContent().then((t) => /Gộp cuối ngày/.test(t)), 'nhãn công tắc' + at);
      await page.locator('#nf-growth-batch').click();
      await until(() => server.workspace.growth.batch === true, 'batch lên máy chủ');
      await page.evaluate(() => document.querySelector('#editor').close());
      await done(page, 'p1t4');
      await until(() => task(server, 'p1t4').xpWait === true, 'gộp cuối ngày: việc vào hàng chờ');
      assert.equal(await page.locator('#growth-award').count(), 0, 'gộp cuối ngày: không mở bảng' + at);
      assert.equal(scored(server, 'p1t4').length, 0, 'chưa ghi điểm' + at);
      assert.match(await toast(page), /Đã ghi “Việc số 5” vào hàng chờ vận công/, 'thông báo gộp' + at);
      // Tắt thì hỏi mỗi lần như cũ.
      await page.evaluate(() => accountPanel());
      await page.waitForSelector('#nf-growth-batch', { state: 'attached' });
      await page.evaluate(() => {
        [...document.querySelectorAll('details.wf-settings-group')].find((d) => d.querySelector('summary').textContent.trim() === 'Thông báo').open = true;
      });
      await page.locator('#nf-growth-batch').click();
      await until(() => server.workspace.growth.batch === false, 'tắt batch');
      await page.evaluate(() => document.querySelector('#editor').close());
      await done(page, 'p1t5');
      await page.waitForSelector('#growth-award[open]');
      await page.locator('#growth-award [data-gr-skip]').click();

      // 5. Cờ thừa không hiện: việc rời cột Hoàn thành, và việc đã có điểm.
      await page.evaluate(() => {
        const p = project('p1');
        p.tasks.find((t) => t.id === 'p1t5').col = 'Doing';
        const t2 = p.tasks.find((t) => t.id === 'p1t2');
        data.growth.log.push({ id: 'zz', d: '2026-11-12', s: 'task', k: 'task:p1t2', n: 'x', p: [2, 0, 0, 0, 0, 0, 0, 0] });
        save();
        render();
      });
      r = await rows(page);
      assert.deepEqual(r.items, ['Việc số 5 | Alpha'], 'chỉ còn việc thật sự chờ (đã có điểm và đã rời Hoàn thành thì ẩn)' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await page.context().close();
    }
  }

  // Chỉ đọc: có khối nhưng không có nút nào.
  {
    const { page } = await openGrowth(h, 1440, false, 'light');
    await page.evaluate(() => {
      project('p1').tasks.find((t) => t.id === 'p1t3').xpWait = true;
      contentReadOnly = true;
      render();
    });
    await page.waitForSelector('.gr-queue');
    assert.equal(await page.locator('[data-queue-one], [data-queue-all]').count(), 0, 'chỉ đọc: không có nút chia');
    assert.equal((await rows(page)).n, '1', 'chỉ đọc vẫn thấy việc chờ');
    await page.context().close();
  }

  // Giang hồ ở 1440 px.
  {
    const { page } = await openGrowth(h, 1440, false, 'light', 'giangho');
    await page.evaluate(() => {
      project('p1').tasks.find((t) => t.id === 'p1t3').xpWait = true;
      render();
    });
    await page.waitForSelector('.gr-queue');
    const t = await page.evaluate(() => ({
      h2: document.querySelector('.gr-queue h2').firstChild.textContent.trim(),
      help: document.querySelector('.gr-queue .help-copy').textContent,
      all: document.querySelector('[data-queue-all]').textContent,
      one: document.querySelector('[data-queue-one]').textContent,
    }));
    assert.deepEqual(t, { h2: 'Chờ vận công', help: 'Những việc đã công thành nhưng chưa chia công lực. Điểm không mất; các hạ chia lúc nào cũng được.', all: 'Chia một lượt', one: 'Vận công' }, 'khối giữ giọng giang hồ');
    assert.equal(await page.evaluate(() => /\b(hoàn thành|dự án|báo cáo|bạn)\b/i.test(document.querySelector('.gr-queue').textContent)), false, 'khối không lẫn chữ Thiền');
    await page.context().close();
  }
} finally {
  await h.close();
}
console.log('growth queue browser ok');
