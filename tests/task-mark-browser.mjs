// v2.85.0 (Dấu Rõ): hộp sửa việc (dist/waiting.js, dist/studio-zen.css).
//  1. Đã gỡ khối “Đang chờ người khác” (Giang hồ: “Đang đợi hồi âm”) khỏi hộp sửa việc, ở mọi khổ và cả bốn kiểu giao diện; không còn ô waitFor / waitUntil.
//  2. Dữ liệu cũ không mất: việc đang có dấu chờ vẫn giữ tên và ngày hẹn sau khi sửa tiêu đề rồi Lưu, thẻ việc vẫn hiện dòng “Đang chờ …”.
//  3. “Trạng thái” là một dải bốn ô nằm trên một hàng; mỗi ô cao ≥ 44px, chữ không bị cắt; đúng một ô được chọn (aria-pressed) và đó là cột của việc;
//     ô đang chọn có chữ trắng trên nền tô đậm đạt ≥ 4,5:1, ô khác đạt ≥ 4,5:1 trên nền dải; không tràn ngang.
//  4. Chạm một ô khác chuyển việc sang cột đó trên máy chủ.
//  Kiểm ở 390 / 820 / 1440 px × Thiền / Giang hồ × sáng / tối.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const vn = (n) => new Date(Date.now() + 7 * 3600000 + n * 86400000).toISOString().slice(0, 10);
const seed = () => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 4);
  Object.assign(p1.tasks[0], { waitFor: 'anh Sơn', waitUntil: vn(1), col: 'List' });
  Object.assign(p1.tasks[1], { col: 'Doing' });
  Object.assign(p1.tasks[2], { col: 'Idea' });
  return { schema: 1, projects: [p1], notes: [] };
};
const setStyle = (style, theme) => ({ context }) =>
  context.addInitScript(([s, t]) => { localStorage.setItem('zen-style', s); localStorage.setItem('zen-theme', t); }, [style, theme]);
const STYLES = [['zen', 'light'], ['giangho', 'light'], ['giangho', 'dark'], ['zen', 'dark']];
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const openTask = async (page, i) => {
  await page.evaluate((k) => { const p = project('p1'); taskDetail(p, p.tasks[k]); }, i);
  await page.waitForSelector('#editor[open] #editor-form');
  await page.waitForTimeout(250);
};
const taskOf = (server, i) => server.workspace.projects[0].tasks[i];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá hạn chờ: ' + label);
}
// Tỷ lệ tương phản WCAG giữa chữ và nền hiệu lực (có pha alpha của tổ tiên).
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
    const fg = mix(rgba(getComputedStyle(el).color), bg), [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);

const h = await startHarness({ seed });
try {
  // 1–3. Ở mọi khổ và kiểu giao diện.
  for (const [w, touch] of [[390, true], [820, true], [1440, false]]) {
    for (const [style, theme] of STYLES) {
      const at = ` (${w}px, ${style}, ${theme})`;
      const { context, page, server } = await h.open(w, { touch, workspace: seed(), setup: setStyle(style, theme) });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'board', 'p1');
      await openTask(page, 0);

      // 1. Không còn khối chờ người khác trong hộp sửa việc.
      const gone = await page.evaluate(() => ({
        section: !!document.querySelector('#editor-form .zen-wait'),
        input: !!document.querySelector('#editor-form [name=waitFor], #editor-form [name=waitUntil]'),
        heading: [...document.querySelectorAll('#editor-body h3')].some((h) => /Đang chờ người khác|Đang đợi hồi âm/.test(h.textContent)),
      }));
      assert.deepEqual(gone, { section: false, input: false, heading: false }, 'hộp sửa việc không còn khối chờ người khác' + at);

      // 3. Dải trạng thái.
      const m = await page.evaluate(() => {
        const track = document.querySelector('#editor-body .wf-state-choices');
        if (!track) return null;
        const btns = [...track.querySelectorAll('.wf-state-choice')];
        const tr = track.getBoundingClientRect(), ed = document.querySelector('#editor').getBoundingClientRect();
        return {
          count: btns.length,
          rows: new Set(btns.map((b) => Math.round(b.getBoundingClientRect().top))).size,
          heights: btns.map((b) => Math.round(b.getBoundingClientRect().height)),
          // Đo chữ nhãn (Range), không đo scrollWidth: dấu ✓ của ô đang chọn là ::after nhô ra 5px ở góc,
          // nên scrollWidth tính cả dấu trang trí và báo sai là “chữ bị cắt”.
          clipped: btns.filter((b) => {
            const cs = getComputedStyle(b), br = b.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(b);
            const tx = range.getBoundingClientRect();
            const left = br.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
            const right = br.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
            return tx.left < left - 0.5 || tx.right > right + 0.5 || b.scrollHeight > b.clientHeight + 1;
          }).map((b) => b.textContent.trim()),
          pressed: btns.map((b) => b.getAttribute('aria-pressed') === 'true'),
          labels: btns.map((b) => b.textContent.trim()),
          trackInside: tr.left >= ed.left && tr.right <= ed.right,
          index: btns.findIndex((b) => b.getAttribute('aria-pressed') === 'true'),
        };
      });
      assert.ok(m, 'có dải trạng thái trong hộp sửa việc' + at);
      assert.equal(m.count, 4, 'bốn ô trạng thái' + at);
      assert.equal(m.rows, 1, 'bốn ô nằm trên một hàng: ' + JSON.stringify(m) + at);
      assert.ok(m.heights.every((x) => x >= 44), 'mỗi ô cao ít nhất 44px: ' + m.heights.join(',') + at);
      assert.deepEqual(m.clipped, [], 'chữ trong ô không bị cắt' + at);
      assert.equal(m.pressed.filter(Boolean).length, 1, 'đúng một ô được chọn' + at);
      assert.equal(m.index, 1, 'ô chọn là cột của việc (Việc cần làm)' + at);
      assert.equal(m.trackInside, true, 'dải nằm trọn trong hộp sửa việc' + at);
      const sel = '#editor-body .wf-state-choice[aria-pressed="true"]';
      const other = '#editor-body .wf-state-choice[aria-pressed="false"]';
      const cs = await contrast(page, sel);
      assert.ok(cs >= 4.5, `chữ ô đang chọn đạt 4,5:1 (${cs.toFixed(2)})` + at);
      const co = await contrast(page, other);
      assert.ok(co >= 4.5, `chữ ô khác đạt 4,5:1 (${co.toFixed(2)})` + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);

      // 2. Lưu sửa tiêu đề: dấu chờ giữ nguyên, thẻ vẫn hiện.
      await page.fill('#editor-form [name=title]', 'Việc đã sửa');
      await page.click('#editor-form [type=submit]');
      await until(() => taskOf(server, 0).title === 'Việc đã sửa', 'lưu tiêu đề' + at);
      assert.equal(taskOf(server, 0).waitFor, 'anh Sơn', 'tên người đang chờ không mất khi lưu' + at);
      assert.equal(taskOf(server, 0).waitUntil, vn(1), 'ngày hẹn không mất khi lưu' + at);
      await page.waitForFunction(() => !document.querySelector('#editor').open);
      // Thẻ việc nằm ở màn “Dự án” (màn Bảng chỉ vẽ việc có hạn trong ngày, các việc này không có hạn).
      await h.show(page, 'projects');
      assert.match(await page.locator('[data-task="p1t0"] .task-card-wait').first().innerText({ timeout: 3000 }), /anh Sơn/, 'thẻ việc vẫn hiện dòng đang chờ' + at);

      // 4. Chạm một ô khác chuyển cột trên máy chủ.
      await openTask(page, 0);
      const target = await page.evaluate(() => {
        const b = document.querySelector('#editor-body .wf-state-choice[aria-pressed="false"][data-state-index="3"]');
        return b ? b.textContent.trim() : null;
      });
      assert.ok(target, 'có ô “Hoàn thành” để chạm' + at);
      await page.click('#editor-body .wf-state-choice[aria-pressed="false"][data-state-index="3"]');
      await until(() => taskOf(server, 0).col === 'Done', 'chạm ô đổi cột trên máy chủ' + at);
      await page.waitForFunction(() => !document.querySelector('#editor').open);
      assert.equal(taskOf(server, 0).waitFor, 'anh Sơn', 'đổi cột không làm mất dấu chờ' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }
  console.log('PASS: hộp sửa việc không còn khối chờ người khác (dữ liệu giữ nguyên); trạng thái là dải một hàng, ô ≥ 44px, tương phản ≥ 4,5:1; 390/820/1440px, Thiền/Giang hồ, sáng/tối.');
} finally {
  await h.close();
}
