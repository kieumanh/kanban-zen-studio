// v2.69.0 (Tâm Nguyện): mục tiêu cân bằng riêng cho tám phương (data.growth.goal, mảng 8 số 1–5) thay cho “ai cũng muốn tám phương ngang nhau”.
// Kiểm ở 390 (chạm) / 820 (chạm) / 1440 px × sáng, tối; Giang hồ và chỉ đọc ở 1440:
//  1. Chưa đặt: khối Tâm nguyện cân bằng (tám ô đều “Cân bằng · 3”), gợi ý chọn đúng phương điểm thấp nhất như trước (Gia đạo), “Đặt lại” bị khóa.
//  2. Đặt Tài lộc 5 rồi Gia đạo 1: lưu lên máy chủ đúng mảng, thông báo, tiêu điểm ở ô vừa đổi; gợi ý đổi theo độ hụt so với mục tiêu (Gia đạo → Tài lộc); đặt lại thì trở về cân bằng; đặt cả tám về 3 thì không lưu goal.
//  3. Hai phương hụt ngang nhau thì chọn phương lâu chưa được bồi bổ hơn (hai chiều ngày).
//  4. Nút “Gợi ý khác” xoay giữa hai cặp gợi ý (cặp đầu là gợi ý có sẵn), nút Gieo nhân theo cặp đang hiện, vòng lại cặp đầu.
//  5. Chỉ đọc: ô chọn bị khóa, không có nút đặt lại. Bố cục: không tràn ngang, ô chọn ≥ 44 px, chữ đủ tương phản, Giang hồ giữ giọng.
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
// pts[i] = điểm của phương i (thứ tự AXES: dao, tai, tam, duyen, than, tri, nghe, gia); days[i] = ngày vận công gần nhất của phương i.
function growthOf(pts, days, goal) {
  const log = pts.map((v, i) => ({ id: 'a' + i, d: (days && days[i]) || '2026-11-10', s: 'task', k: 'task:t' + i, n: 'Việc ' + i, p: Array(8).fill(0).map((_, j) => (j === i ? v * 2 : 0)) }));
  const g = { v: 1, hero: 'nam', name: 'Mạnh', since: '2026-11-01', log, spend: [] };
  if (goal) g.goal = goal;
  return g;
}
const EVEN = [4, 4, 4, 4, 4, 4, 4, 1];
const seed = (pts, days, goal) => () => ({ schema: 1, projects: [makeProject('p1', 'Alpha', '#7950c8', 4)], notes: [], growth: growthOf(pts, days, goal) });
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
async function openReport(h, width, touch, theme, style, ws) {
  const ctx = await h.open(width, { touch, now: NOW, setup: setup(theme, style), workspace: ws });
  const errors = [];
  ctx.page.on('pageerror', (e) => errors.push(e.message));
  await h.show(ctx.page, 'growth');
  await ctx.page.click('[data-gr-report]');
  await ctx.page.waitForSelector('.gr-cult');
  return { ...ctx, errors };
}
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



const lead = (page) => page.locator('.gr-cult-lead').innerText().then((t) => t.replace(/\s+/g, ' ').trim());
const axisOf = (page) => page.evaluate(() => document.querySelector('.gr-cult').dataset.axis);
const lines = (page, kind) => page.evaluate((k) => [...document.querySelectorAll('.gr-cult-steps > li[data-step="' + k + '"] li .gr-sow-text')].map((x) => x.textContent), kind);
const values = (page) => page.evaluate(() => [...document.querySelectorAll('[data-goal-axis]')].map((s) => s.value));
const pick = (page, i, v) => page.selectOption('[data-goal-axis="' + i + '"]', String(v));
const SELF = ['Gọi hoặc về thăm cha mẹ, người thân', 'Dọn dẹp một góc nhà cho gọn gàng'];
const GIVE = ['Phụ giúp người nhà một việc mà không đợi nhờ', 'Nấu một bữa cho cả nhà'];
const SELF2 = ['Cùng cả nhà ăn một bữa, tắt tivi và điện thoại', 'Sắp lại một ngăn đồ chung cho dễ tìm'];
const GIVE2 = ['Hỏi người nhà hôm nay có việc gì mình có thể đỡ một tay', 'Nói một lời cảm ơn với người vẫn lặng lẽ lo việc nhà'];

const h = await startHarness({ seed: seed(EVEN) });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const { page, server, errors } = await openReport(h, width, touch, theme, undefined, seed(EVEN)());

      // 1. Chưa đặt: cân bằng.
      assert.deepEqual(await values(page), Array(8).fill('3'), 'tám ô đều Cân bằng' + at);
      assert.equal((await page.locator('.gr-goal-state').textContent()).trim(), 'Đang cân bằng: tám phương ngang nhau.', 'trạng thái cân bằng' + at);
      assert.equal(await page.locator('[data-goal-reset]').isDisabled(), true, 'Đặt lại bị khóa khi chưa đặt' + at);
      assert.equal(await axisOf(page), 'gia', 'cân bằng: phương điểm thấp nhất (Gia đạo)' + at);
      assert.doesNotMatch(await lead(page), /Theo tâm nguyện/, 'lời dẫn cũ khi cân bằng' + at);
      const hs = await page.evaluate(() => [...document.querySelectorAll('[data-goal-axis]'), ...document.querySelectorAll('.gr-goal .btn')].map((x) => Math.round(x.getBoundingClientRect().height)));
      for (const v of hs) assert.ok(v >= 44, 'ô chọn và nút cao ≥ 44 px (' + v + ')' + at);
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      for (const sel of ['.gr-goal-name small', '.gr-goal-state', '.gr-goal .help-copy'])
        assert.ok((await contrast(page, sel)) >= 4.5, 'chữ đủ tương phản: ' + sel + at);

      // 2. Đặt Tài lộc 5 (Gia đạo vẫn hụt nhiều nhất), rồi Gia đạo 1 (Tài lộc hụt nhiều nhất).
      await pick(page, 1, 5);
      await until(() => JSON.stringify(server.workspace.growth.goal) === JSON.stringify([3, 5, 3, 3, 3, 3, 3, 3]), 'goal lên máy chủ');
      assert.match(await page.locator('#toast').textContent(), /Đã ghi tâm nguyện: Tài lộc · Hết lòng\./, 'thông báo ghi tâm nguyện' + at);
      assert.equal(await page.evaluate(() => document.activeElement?.dataset?.goalAxis), '1', 'tiêu điểm ở ô vừa đổi' + at);
      assert.equal(await axisOf(page), 'gia', 'Tài lộc 5 nhưng Gia đạo vẫn hụt nhiều hơn' + at);
      assert.match(await lead(page), /^Theo tâm nguyện của các hạ, phương cần bồi bổ nhất lúc này là Gia đạo/, 'lời dẫn theo tâm nguyện' + at);
      assert.equal((await page.locator('.gr-goal-state').textContent()).trim(), 'Đang theo tâm nguyện của các hạ.', 'trạng thái theo tâm nguyện' + at);
      await pick(page, 7, 1);
      await until(() => JSON.stringify(server.workspace.growth.goal) === JSON.stringify([3, 5, 3, 3, 3, 3, 3, 1]), 'goal lần hai lên máy chủ');
      assert.equal(await axisOf(page), 'tai', 'Gia đạo Nhẹ: phương cần bồi bổ nhất là Tài lộc' + at);
      assert.match(await lead(page), /Tài lộc \(hiện 4 điểm, tâm nguyện ứng khoảng 6 điểm\)/, 'số điểm hiện có và ứng với tâm nguyện' + at);
      assert.deepEqual(server.workspace.growth.log.length, 8, 'điểm đã có không đổi' + at);
      // Đặt lại.
      await page.locator('[data-goal-reset]').click();
      await until(() => server.workspace.growth.goal === undefined, 'đặt lại xóa goal');
      assert.deepEqual(await values(page), Array(8).fill('3'), 'về cân bằng' + at);
      assert.equal(await axisOf(page), 'gia', 'về phương điểm thấp nhất' + at);
      // Đặt cả tám về 3 thì không lưu goal.
      await pick(page, 1, 5);
      await until(() => !!server.workspace.growth.goal, 'đặt lại tâm nguyện');
      await pick(page, 1, 3);
      await until(() => server.workspace.growth.goal === undefined, 'về 3 hết thì bỏ goal');
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await page.context().close();
    }
  }

  // 3. Hai phương hụt ngang: chọn phương lâu chưa bồi bổ. Tâm cảnh (ô 2) và Thân thể (ô 4) cùng mức 4.
  {
    const goal = [3, 3, 4, 3, 4, 3, 3, 3];
    const evenAll = Array(8).fill(4);
    const older = (i, other) => Array(8).fill('2026-11-05').map((d, k) => (k === i ? '2026-11-01' : k === other ? '2026-11-10' : d));
    const a = await openReport(h, 1440, false, 'light', undefined, seed(evenAll, older(4, 2), goal)());
    assert.equal(await axisOf(a.page), 'than', 'Thân thể lâu chưa bồi bổ hơn thì được chọn');
    assert.match(await lead(a.page), /Tâm cảnh cũng hụt ngang; chọn phương lâu chưa được bồi bổ hơn\./, 'lời dẫn nêu phương hụt ngang');
    await a.page.context().close();
    const b = await openReport(h, 1440, false, 'light', undefined, seed(evenAll, older(2, 4), goal)());
    assert.equal(await axisOf(b.page), 'tam', 'đổi ngày thì Tâm cảnh được chọn');
    assert.match(await lead(b.page), /Thân thể cũng hụt ngang/, 'lời dẫn nêu Thân thể');
    await b.page.context().close();
  }

  // 4. Gợi ý khác.
  {
    const { page } = await openReport(h, 820, true, 'light', undefined, seed(EVEN)());
    assert.deepEqual([await lines(page, 'self'), await lines(page, 'give')], [SELF, GIVE], 'cặp đầu là gợi ý có sẵn');
    await page.click('[data-goal-next]');
    assert.deepEqual([await lines(page, 'self'), await lines(page, 'give')], [SELF2, GIVE2], 'cặp hai khác hoàn toàn cặp đầu');
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-goal-next')), true, 'tiêu điểm ở nút Gợi ý khác');
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.gr-cult .gr-sow-btn')].map((b) => b.getAttribute('aria-label'))), [...SELF2, ...GIVE2].map((t) => 'Gieo nhân: ' + t), 'nút Gieo nhân theo cặp đang hiện');
    await page.click('[data-goal-next]');
    assert.deepEqual([await lines(page, 'self'), await lines(page, 'give')], [SELF, GIVE], 'bấm lần nữa thì vòng lại cặp đầu');
    await page.context().close();
  }

  // 5. Chỉ đọc.
  {
    const { page } = await openReport(h, 1440, false, 'light', undefined, seed(EVEN, undefined, [3, 5, 3, 3, 3, 3, 3, 1])());
    await page.evaluate(() => {
      contentReadOnly = true;
      render();
    });
    await page.waitForSelector('.gr-goal');
    assert.equal(await page.locator('[data-goal-axis]:not([disabled])').count(), 0, 'chỉ đọc: ô chọn bị khóa');
    assert.equal(await page.locator('[data-goal-reset]').count(), 0, 'chỉ đọc: không có nút đặt lại');
    assert.equal(await axisOf(page), 'tai', 'chỉ đọc vẫn thấy gợi ý theo tâm nguyện đã có');
    await page.context().close();
  }

  // 6. Giang hồ ở 1440 px.
  {
    const { page } = await openReport(h, 1440, false, 'light', 'giangho', seed(EVEN, undefined, [3, 5, 3, 3, 3, 3, 3, 1])());
    const t = await page.evaluate(() => ({
      h2: document.querySelector('.gr-goal h2').textContent,
      help: document.querySelector('.gr-goal .help-copy').textContent,
      state: document.querySelector('.gr-goal-state').textContent,
      options: [...document.querySelector('[data-goal-axis]').options].map((o) => o.textContent),
    }));
    assert.equal(t.h2, 'Tâm nguyện', 'tên khối');
    assert.equal(t.state, 'Đang theo tâm nguyện của các hạ.', 'trạng thái giữ giọng');
    assert.deepEqual(t.options, ['Nhẹ · 1', 'Vừa · 2', 'Cân bằng · 3', 'Chú trọng · 4', 'Hết lòng · 5'], 'năm mức');
    assert.equal(/\b(hoàn thành|dự án|báo cáo|bạn)\b/i.test(t.help + t.state), false, 'không lẫn chữ Thiền');
    await page.context().close();
  }
} finally {
  await h.close();
}
console.log('growth goal browser ok');
