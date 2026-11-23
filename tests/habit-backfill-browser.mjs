// v2.84.0 (Tích Bù): Việc hằng ngày cho phép kéo về tuần trước để tích bù lượt bỏ lỡ (dist/habits.js, dist/habits.css).
//  1. Tuần hiện tại: nếu tuần trước còn thiếu lượt so với mục tiêu thì có lời mời “Tích bù” kèm số lượt thiếu; việc mới tạo trong tuần này không bị tính; đủ mục tiêu thì không hiện.
//  2. “Tích bù” sang tuần trước; tích một ngày của tuần trước được lưu lên máy chủ, chuỗi và tiến độ tuần ấy cập nhật; “Hôm nay” về lại tuần này, số lượt thiếu giảm.
//  3. Cảm ứng: vuốt ngang bảng sang phải = tuần trước, sang trái = tuần sau; vuốt dọc hoặc vuốt ngắn thì không đổi tuần.
//  4. “Để sau” ẩn lời mời cho riêng tuần này, vào lại vẫn ẩn.
//  5. 390 / 820 / 1440 px × Thiền / Giang hồ × sáng / tối: nút ≥ 44px, không tràn ngang, gợi ý vuốt chỉ hiện trên cảm ứng.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const toDate = (s) => new Date(s + 'T12:00:00Z');
const addDays = (s, n) => new Date(toDate(s).getTime() + n * 864e5).toISOString().slice(0, 10);
const mondayOf = (s) => addDays(s, -((toDate(s).getUTCDay() + 6) % 7));
const short = (s) => s.slice(8, 10) + '/' + s.slice(5, 7);
const thisMon = mondayOf(todayStr);
const lastMon = addDays(thisMon, -7);
const seed = (extra = []) => () => ({
  schema: 1,
  projects: [],
  notes: [],
  dailyHabits: [
    { id: 'a', name: 'Đi bộ', icon: '🌿', color: '#2e7d5b', createdAt: addDays(lastMon, -30), goal: 3, done: [addDays(lastMon, 1)] },
    { id: 'b', name: 'Đọc sách', icon: '📖', color: '#3a6fb0', createdAt: addDays(lastMon, -30), goal: 7, done: [] },
    ...extra,
  ],
});
const cfg = (style, theme) => ({ context }) =>
  context.addInitScript(([s, t]) => { localStorage.setItem('zen-style', s); localStorage.setItem('zen-theme', t); }, [style, theme]);
const label = (page) => page.locator('#hb-week-label').innerText();
const banner = (page) => page.locator('.hb-backfill').count();
const until = async (fn, msg) => {
  for (let i = 0; i < 80; i++) { if (await fn()) return; await new Promise((r) => setTimeout(r, 100)); }
  assert.fail('quá hạn chờ: ' + msg);
};
async function swipe(page, from, to) {
  const cdp = await page.context().newCDPSession(page);
  const pt = (p) => [{ x: Math.round(p[0]), y: Math.round(p[1]) }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from) });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt([from[0] + ((to[0] - from[0]) * i) / 6, from[1] + ((to[1] - from[1]) * i) / 6]) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
const listPoint = (page) => page.evaluate(() => { document.querySelector('.hb-row .hb-cell').scrollIntoView({ block: 'center' }); const r = document.querySelector('.hb-row .hb-cell').getBoundingClientRect(); return [innerWidth / 2, r.top + r.height / 2]; });

const h = await startHarness({ seed: seed() });
try {
  // 1–4. Hành vi ở điện thoại (cảm ứng).
  {
    const at = ' (390px)';
    const { context, page, server } = await h.open(390, { touch: true, workspace: seed()() });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await h.show(page, 'habits');
    await page.waitForSelector('[data-hb-row="a"]');
    assert.equal(await banner(page), 1, 'tuần trước còn thiếu lượt: có lời mời' + at);
    assert.match(await page.locator('.hb-backfill strong').innerText(), /Tuần trước còn thiếu 9 lượt/, '(3-1) + (7-0) = 9 lượt thiếu' + at);
    assert.equal(await page.locator('.hb-swipe-tip').isVisible(), true, 'cảm ứng: có gợi ý vuốt' + at);

    // 2. Tích bù.
    await page.click('.hb-backfill [data-hb-week="-1"]');
    await until(async () => (await label(page)) === short(lastMon) + ' – ' + short(addDays(lastMon, 6)), 'sang tuần trước');
    assert.equal(await banner(page), 0, 'ở tuần trước không có lời mời' + at);
    const d = addDays(lastMon, 3);
    const cell = '[data-hb-row="b"] [data-hb-toggle][data-hb-date="' + d + '"]';
    await page.locator(cell).scrollIntoViewIfNeeded();
    await page.click(cell);
    await until(() => server.workspace.dailyHabits.find((x) => x.id === 'b').done.includes(d), 'tích bù lưu lên máy chủ');
    assert.equal(await page.locator(cell).getAttribute('aria-checked'), 'true', 'ô đã tích' + at);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('.hb-now');
    await until(async () => (await label(page)) === short(thisMon) + ' – ' + short(addDays(thisMon, 6)), 'về tuần này');
    assert.match(await page.locator('.hb-backfill strong').innerText(), /thiếu 8 lượt/, 'tích bù xong số lượt thiếu giảm còn 8' + at);

    // 3. Vuốt.
    const [cx, cy] = await listPoint(page);
    await swipe(page, [cx - 60, cy], [cx + 120, cy]);
    await until(async () => (await label(page)) === short(lastMon) + ' – ' + short(addDays(lastMon, 6)), 'vuốt phải = tuần trước');
    await swipe(page, [cx + 80, cy], [cx - 100, cy]);
    await until(async () => (await label(page)) === short(thisMon) + ' – ' + short(addDays(thisMon, 6)), 'vuốt trái = tuần sau');
    await swipe(page, [cx, cy], [cx + 120, cy + 140]);
    await page.waitForTimeout(250);
    assert.equal(await label(page), short(thisMon) + ' – ' + short(addDays(thisMon, 6)), 'vuốt chéo gần dọc không đổi tuần' + at);
    await swipe(page, [cx, cy], [cx + 30, cy]);
    await page.waitForTimeout(250);
    assert.equal(await label(page), short(thisMon) + ' – ' + short(addDays(thisMon, 6)), 'vuốt ngắn không đổi tuần' + at);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'không tràn ngang' + at);

    // 4. Để sau.
    await page.click('[data-hb-backfill-close]');
    await until(async () => (await banner(page)) === 0, 'ẩn lời mời');
    await h.show(page, 'focus');
    await h.show(page, 'habits');
    await page.waitForSelector('[data-hb-row="a"]');
    assert.equal(await banner(page), 0, 'đóng rồi vào lại vẫn ẩn' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }

  // 1b. Không có lượt thiếu / việc mới tạo tuần này thì không hiện.
  {
    const done = () => ({ ...seed()(), dailyHabits: [{ id: 'a', name: 'Đi bộ', icon: '🌿', color: '#2e7d5b', createdAt: addDays(lastMon, -30), goal: 2, done: [addDays(lastMon, 0), addDays(lastMon, 2)] }, { id: 'n', name: 'Mới', icon: '🌙', color: '#7950c8', createdAt: thisMon, goal: 7, done: [] }] });
    const { context, page } = await h.open(390, { touch: true, workspace: done() });
    await h.show(page, 'habits');
    await page.waitForSelector('[data-hb-row="a"]');
    assert.equal(await banner(page), 0, 'đủ mục tiêu tuần trước và việc mới tạo tuần này: không có lời mời');
    await context.close();
  }

  // 5. Giao diện.
  for (const [w, touch] of [[390, true], [820, false], [1440, false]]) {
    for (const [style, theme] of [['zen', 'light'], ['giangho', 'light'], ['giangho', 'dark'], ['zen', 'dark']]) {
      const at = ` (${w}px, ${style}, ${theme})`;
      const { context, page } = await h.open(w, { touch, workspace: seed()(), setup: cfg(style, theme) });
      await h.show(page, 'habits');
      await page.waitForSelector('.hb-backfill');
      const m = await page.evaluate(() => {
        const b = document.querySelector('.hb-backfill'), r = b.getBoundingClientRect();
        return {
          btns: [...b.querySelectorAll('.btn')].map((x) => { const q = x.getBoundingClientRect(); return { h: q.height, l: q.left, r: q.right }; }),
          inside: r.left >= 0 && r.right <= innerWidth,
          tip: getComputedStyle(document.querySelector('.hb-swipe-tip')).display,
          ov: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(m.btns.length, 2, 'hai nút Tích bù / Để sau' + at);
      for (const b of m.btns) assert.ok(b.h >= 44 && b.l >= 0 && b.r <= w, 'nút ≥ 44px và nằm trong màn hình' + at);
      assert.equal(m.inside, true, 'lời mời nằm trong màn hình' + at);
      assert.equal(m.tip !== 'none', touch, 'gợi ý vuốt chỉ hiện trên cảm ứng' + at);
      assert.equal(m.ov, false, 'không tràn ngang' + at);
      await context.close();
    }
  }
  console.log('PASS: tích bù tuần trước (lời mời, tích bù lưu được, vuốt đổi tuần, Để sau); 390/820/1440px, Thiền/Giang hồ, sáng/tối.');
} finally {
  await h.close();
}
