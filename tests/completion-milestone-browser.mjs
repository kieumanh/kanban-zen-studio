// Hồi quy v1.45.0: lời chúc mốc lớn khi (a) việc quá hạn cuối cùng được hoàn thành, (b) mọi việc của một dự án đã xong.
// Khung rộng hơn, có icon lớn và họa tiết; thuộc một trong 30 lời chúc mới; không tràn màn hình ở 390 (chạm), 820, 1440 px.
// Khi vẫn còn việc quá hạn khác, hoàn thành một việc chỉ hiện lời chúc thường.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const seedOverdue = (extra) => () => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 3);
  p.tasks[0].title = 'Gửi báo cáo tuần';
  p.tasks[0].col = 'Doing';
  p.tasks[0].due = day(-2);
  p.tasks[1].title = 'Chuẩn bị họp';
  p.tasks[1].col = 'Doing';
  p.tasks[1].due = extra ? day(-1) : day(3);
  p.tasks[2].title = 'Việc sau';
  p.tasks[2].col = 'Doing';
  p.tasks[2].due = day(5);
  return { schema: 1, projects: [p], notes: [] };
};
const seedProject = () => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 2);
  p.tasks[0].title = 'Việc một';
  p.tasks[0].col = 'Doing';
  p.tasks[0].due = day(4);
  p.tasks[1].title = 'Việc hai';
  p.tasks[1].col = 'Doing';
  p.tasks[1].due = day(6);
  return { schema: 1, projects: [p], notes: [] };
};

const h = await startHarness({ seed: seedOverdue(false) });
const card = (page) => page.evaluate(() => {
  const c = document.querySelector('.completion-card');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return {
    milestone: c.classList.contains('is-milestone'),
    caption: c.querySelector('.completion-caption')?.textContent || '',
    text: c.querySelector('p')?.textContent || '',
    left: r.left,
    right: r.right,
    width: r.width,
    hasIcon: !!c.querySelector('.completion-icon svg'),
    iconLarge: !!c.querySelector('.completion-icon.is-large'),
    deco: !!document.querySelector('.completion-deco'),
    closeH: c.querySelector('.completion-close')?.getBoundingClientRect().height || 0,
  };
});
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';

    // A. Việc quá hạn cuối cùng được hoàn thành → lời chúc mốc "quá hạn".
    {
      const { context, page } = await h.open(width, { touch, workspace: seedOverdue(false)() });
      await h.show(page, 'board');
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[0], 'Done'));
      await page.waitForSelector('.completion-card');
      const c = await card(page);
      assert.equal(c.milestone, true, 'việc quá hạn cuối cùng → lời chúc mốc' + at);
      assert.equal(c.caption, 'QUÁ HẠN ĐÃ ĐƯỢC GỠ HẾT', 'tiêu đề mốc quá hạn' + at);
      assert.equal(c.iconLarge, true, 'icon lớn' + at);
      assert.equal(c.hasIcon, true, 'có icon' + at);
      assert.equal(c.deco, true, 'có họa tiết trang trí' + at);
      assert.ok(c.left >= 0 && c.right <= width + 0.5, 'khung lời chúc nằm trong màn hình' + at + ' ' + JSON.stringify(c));
      assert.ok(c.width <= width - 31, 'khung đủ rộng nhưng không tràn lề 16px' + at);
      assert.equal(
        await page.evaluate((text) => milestoneMessages.some((m) => m.text === text && m.kind === 'overdue'), c.text),
        true,
        'lời chúc thuộc bộ 15 câu quá hạn' + at,
      );
      if (touch) assert.ok(c.closeH >= 44, 'nút đóng đủ lớn để chạm' + at);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
        'không tràn ngang khi hiện lời chúc' + at,
      );
      await context.close();
    }

    // B. Còn một việc quá hạn khác → chỉ lời chúc thường.
    {
      const { context, page } = await h.open(width, { touch, workspace: seedOverdue(true)() });
      await h.show(page, 'board');
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[0], 'Done'));
      await page.waitForSelector('.completion-card');
      const c = await card(page);
      assert.equal(c.milestone, false, 'còn việc quá hạn khác → không phải lời chúc mốc' + at);
      assert.equal(c.iconLarge, false, 'lời chúc thường không dùng icon lớn' + at);
      await context.close();
    }

    // C. Hoàn tất mọi việc của dự án → lời chúc mốc "dự án".
    {
      const { context, page } = await h.open(width, { touch, workspace: seedProject() });
      await h.show(page, 'board');
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[0], 'Done'));
      await page.evaluate(() => dismissCompletion());
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[1], 'Done'));
      await page.waitForSelector('.completion-card');
      const c = await card(page);
      assert.equal(c.milestone, true, 'hoàn tất mọi việc dự án → lời chúc mốc' + at);
      assert.equal(c.caption, 'DỰ ÁN ĐÃ HOÀN TẤT', 'tiêu đề mốc dự án' + at);
      assert.equal(
        await page.evaluate((text) => milestoneMessages.some((m) => m.text === text && m.kind === 'project'), c.text),
        true,
        'lời chúc thuộc bộ 15 câu dự án' + at,
      );
      assert.ok(c.right <= width + 0.5 && c.left >= 0, 'khung nằm trong màn hình' + at);
      await context.close();
    }
  }
  const count = await (async () => {
    const { context, page } = await h.open(1440, { touch: false, workspace: seedOverdue(false)() });
    const n = await page.evaluate(() => milestoneMessages.length);
    await context.close();
    return n;
  })();
  assert.equal(count, 30, 'có đúng 30 lời chúc mốc');
  console.log('PASS: lời chúc mốc hiện khi gỡ hết việc quá hạn hoặc hoàn tất mọi việc của dự án; khung rộng, có icon và họa tiết; 30 câu; vừa màn hình (390 chạm, 820, 1440px).');
} finally {
  await h.close();
}
