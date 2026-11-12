// v1.79.0: (1) một việc hằng ngày đủ chuỗi 7 ngày liền (14, 21… cũng vậy) → bảng cộng điểm 6 lần (3 điểm) hiện ra, mỗi mốc chỉ hỏi một lần;
// (2) trang "Báo cáo tiến độ": đánh giá 8 chỉ số, mạnh/yếu, cân bằng, xu hướng 7 ngày, đề xuất cải thiện theo chỉ số thấp nhất.
// Kiểm tra ở 390 (chạm), 820, 1440 px: không tràn ngang, nút đủ vùng chạm.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => day(a + i));
const habit = (over = {}) => ({ id: 'h1', name: 'Thiền 10 phút', icon: '🧘', color: '#7950c8', createdAt: day(-40), goal: 7, done: range(-6, -1), ...over });
const GROWTH = { v: 1, hero: 'nam', since: day(-40), log: [] };
const seedHabit = (growth, habits) => () => ({ schema: 1, projects: [], notes: [], dailyHabits: habits || [habit()], ...(growth ? { growth } : {}) });
const entry = (id, ago, p, n) => ({ id, d: day(-ago), s: 'task', k: 'task:' + id, n, p });
const REPORT_GROWTH = {
  v: 1,
  hero: 'nu',
  since: day(-40),
  log: [
    entry('e1', 0, [2, 0, 0, 0, 0, 0, 0, 0], 'Việc một'),
    entry('e2', 2, [0, 0, 0, 0, 0, 0, 5, 0], 'Việc hai'),
    entry('e3', 5, [1, 0, 0, 0, 0, 0, 0, 1], 'Việc ba'),
    entry('e4', 9, [0, 0, 0, 0, 2, 0, 0, 0], 'Việc bốn'),
    entry('e5', 30, [0, 0, 2, 0, 0, 0, 0, 0], 'Việc năm'),
  ],
};
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 60; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá thời gian chờ: ' + label);
}
const tickToday = async (page, id = 'h1') => {
  const cell = '[data-hb-row="' + id + '"] [data-hb-toggle][data-hb-date="' + day(0) + '"]';
  await page.locator(cell).scrollIntoViewIfNeeded();
  await page.click(cell);
};

const h = await startHarness({ seed: seedHabit(GROWTH) });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';

    // A. Chuỗi 6 → 7 ngày: bảng cộng điểm 6 lần hiện ra; cộng, lưu; mỗi mốc chỉ hỏi một lần.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: seedHabit(GROWTH)() });
      await h.show(page, 'habits');
      await page.waitForSelector('[data-hb-row="h1"]');
      await tickToday(page);
      await page.waitForSelector('#growth-award[open]');
      const info = await page.evaluate(() => {
        const d = document.querySelector('#growth-award');
        return { head: d.querySelector('header').textContent.replace(/\s+/g, ' '), budget: d.querySelector('.gr-budget').textContent, cols: d.querySelectorAll('.gr-col').length, plus: Math.min(...[...d.querySelectorAll('.gr-plus')].map((b) => b.getBoundingClientRect().height)) };
      });
      assert.match(info.head, /Thiền 10 phút/, 'nhắc tên việc hằng ngày' + at);
      assert.match(info.head, /7 ngày/, 'nhắc đủ 7 ngày' + at);
      assert.match(info.budget, /Còn 6 lần vận công/, 'đủ 7 ngày được 6 lần cộng (3 điểm)' + at);
      assert.equal(info.cols, 8, '8 cột chỉ số' + at);
      assert.ok(info.plus >= (touch ? 44 : 36), 'nút + đủ cao' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      for (let i = 0; i < 4; i++) await page.click('[data-gr-plus="2"]'); // Tâm cảnh +2
      await page.click('[data-gr-plus="3"]'); // Nhân duyên +0,5
      await page.click('[data-gr-plus="4"]'); // Thể lực +0,5
      assert.equal(await page.locator('[data-gr-save]').isDisabled(), false);
      await page.click('[data-gr-save]');
      await page.waitForFunction(() => !document.querySelector('#growth-award'));
      await until(() => server.workspace.growth.log.length === 1, 'lưu điểm lên máy chủ' + at);
      const saved = server.workspace.growth.log[0];
      assert.equal(saved.s, 'habit', 'nguồn là việc hằng ngày' + at);
      assert.equal(saved.k, 'habit:h1:' + day(0), 'khóa theo việc và ngày' + at);
      assert.deepEqual(saved.p, [0, 0, 4, 1, 1, 0, 0, 0], 'ghi đúng nửa điểm' + at);
      assert.match(await page.locator('#toast').innerText(), /Đã dồn 3 điểm/, 'có thông báo đã cộng điểm' + at);
      // Bỏ tích rồi tích lại ngay trong ngày: không hỏi lần hai.
      await tickToday(page);
      await wait(200);
      await tickToday(page);
      await wait(900);
      assert.equal(await page.locator('#growth-award').count(), 0, 'cùng một mốc không hỏi lại' + at);
      assert.equal(await page.evaluate(() => data.growth.log.length), 1);
      await context.close();
    }

    // B. Không đủ mốc 7: chuỗi 3 → 4 không hỏi; chuỗi 13 → 14 có hỏi; ngày nghỉ không làm đứt chuỗi.
    {
      const { context, page } = await h.open(width, { touch, workspace: seedHabit(GROWTH, [habit({ done: range(-3, -1) })])() });
      await h.show(page, 'habits');
      await page.waitForSelector('[data-hb-row="h1"]');
      await tickToday(page);
      await wait(1000);
      assert.equal(await page.locator('#growth-award').count(), 0, 'chuỗi 4 ngày chưa đủ mốc' + at);
      await context.close();
    }
    {
      const { context, page } = await h.open(width, { touch, workspace: seedHabit(GROWTH, [habit({ done: range(-13, -1) })])() });
      await h.show(page, 'habits');
      await page.waitForSelector('[data-hb-row="h1"]');
      await tickToday(page);
      await page.waitForSelector('#growth-award[open]');
      assert.match(await page.locator('#growth-award header').innerText(), /14 ngày/, 'mốc 14 ngày cũng được thưởng' + at);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#growth-award'));
      assert.equal(await page.evaluate(() => data.growth.log.length), 0, 'Esc = bỏ qua, không ghi điểm' + at);
      await context.close();
    }
    {
      const { context, page } = await h.open(width, { touch, workspace: seedHabit(GROWTH, [habit({ done: range(-7, -2), rest: [day(-1)] })])() });
      await h.show(page, 'habits');
      await page.waitForSelector('[data-hb-row="h1"]');
      await tickToday(page);
      await page.waitForSelector('#growth-award[open]');
      await context.close();
    }

    // C. Chưa chọn nhân vật: đủ 7 ngày vẫn im lặng.
    {
      const { context, page } = await h.open(width, { touch, workspace: seedHabit(null)() });
      await h.show(page, 'habits');
      await page.waitForSelector('[data-hb-row="h1"]');
      await tickToday(page);
      await wait(1000);
      assert.equal(await page.locator('#growth-award').count(), 0, 'chưa chọn nhân vật thì không hỏi điểm' + at);
      await context.close();
    }

    // D. Báo cáo tiến độ với dữ liệu mẫu.
    {
      const { context, page } = await h.open(width, { touch, workspace: seedHabit(REPORT_GROWTH, [])() });
      await h.show(page, 'growth');
      assert.ok((await page.locator('[data-gr-report]').boundingBox()).height >= (touch ? 40 : 32), 'nút Xem báo cáo đủ lớn' + at);
      await page.click('[data-gr-report]');
      await page.waitForSelector('.gr-report');
      assert.match(await page.locator('#main h1').innerText(), /Báo cáo tu luyện/, 'tiêu đề báo cáo' + at);
      const tiles = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.gr-tile')].map((t) => [t.dataset.tile, t.textContent.replace(/\s+/g, ' ').trim()])));
      assert.match(tiles.total, /6,5 điểm/, 'tổng 6,5 điểm' + at);
      assert.match(tiles.realm, /Sơ nhập giang hồ.*Cấp 6\/100/, 'cảnh giới và cấp (6,5 điểm = cấp 6)' + at);
      assert.match(tiles.week, /\+4,5 điểm/, '7 ngày qua cộng 4,5 điểm' + at);
      assert.match(tiles.week, /1 điểm/, 'so với 7 ngày trước 1 điểm' + at);
      assert.match(tiles.streak, /1 ngày/, 'chuỗi ngày có cộng điểm' + at);
      const rows = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.gr-eval-row')].map((r) => [r.dataset.axis, { level: r.querySelector('.gr-level').textContent.trim(), score: r.querySelector('.gr-eval-score').textContent.trim() }])));
      assert.equal(Object.keys(rows).length, 8, 'đánh giá đủ 8 chỉ số' + at);
      assert.deepEqual(rows.nghe, { level: 'Thâm hậu', score: '2,5' }, 'Sự nghiệp mạnh' + at);
      assert.deepEqual(rows.nghiep, { level: 'Thâm hậu', score: '1,5' });
      assert.deepEqual(rows.tam, { level: 'Vững vàng', score: '1' });
      assert.deepEqual(rows.than, { level: 'Vững vàng', score: '1' });
      assert.deepEqual(rows.vui, { level: 'Cần khổ luyện', score: '0,5' });
      assert.deepEqual(rows.tai, { level: 'Chưa khai mạch', score: '0' });
      assert.match(await page.locator('.gr-balance').innerText(), /Thiên lệch rõ/, 'đánh giá cân bằng' + at);
      const tips = await page.evaluate(() => [...document.querySelectorAll('[data-tip="weak"]')].map((t) => ({ axis: t.dataset.axis, ideas: t.querySelectorAll('li').length, title: t.querySelector('h3').textContent.trim() })));
      assert.deepEqual(tips.map((t) => t.axis), ['tai', 'duyen', 'tri'], 'đề xuất cho 3 chỉ số thấp nhất (đồng điểm xếp theo thứ tự cố định)' + at);
      assert.ok(tips.every((t) => t.ideas >= 2 && /^Bồi bổ /.test(t.title)), 'mỗi đề xuất có ít nhất 2 việc gợi ý' + at);
      assert.ok((await page.locator('[data-tip="trend"]').count()) === 1, 'có nhận xét về xu hướng' + at);
      assert.match(await page.locator('[data-tip="trend"]').innerText(), /nhiều hơn/, '7 ngày qua nhiều hơn 7 ngày trước' + at);
      assert.equal(await noOverflow(page), true, 'báo cáo không tràn ngang' + at);
      await page.click('[data-gr-back]');
      await page.waitForSelector('#gr-radar');
      assert.equal(await page.locator('.gr-report').count(), 0, 'quay lại trang điểm' + at);
      await context.close();
    }

    // E. Báo cáo khi chưa có điểm: nói rõ chưa đủ dữ liệu và gợi ý bắt đầu.
    {
      const { context, page } = await h.open(width, { touch, workspace: seedHabit(GROWTH, [])() });
      await h.show(page, 'growth');
      await page.click('[data-gr-report]');
      await page.waitForSelector('.gr-report');
      assert.match(await page.locator('.gr-empty').innerText(), /Chưa có điểm/, 'trạng thái trống' + at);
      assert.equal(await page.locator('.gr-eval-row').count(), 0, 'không đánh giá khi chưa có điểm' + at);
      assert.ok((await page.locator('[data-tip="start"]').count()) === 1, 'có gợi ý bắt đầu' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      await context.close();
    }
  }
  console.log('growth-report-browser ok');
} finally {
  await h.close();
}
