// Hồi quy v1.19.0 (cập nhật v1.50.0): checklist không còn nút lên/xuống (chỉ kéo thả); mỗi mục vẫn lưu % ngầm;
// tick = 100%, bỏ tick = 0%; % được lưu; tiến độ việc = trung bình các mục; tiến độ dự án = trung bình các việc.
// v1.50.0: không còn hiện % trên checklist, nên các khẳng định dùng thanh % được thay bằng kiểm tra dữ liệu và tick (390/820/1440px).
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 3);
  p.tasks[0].title = 'Chuẩn bị khóa tu';
  p.tasks[0].col = 'Doing';
  p.tasks[0].checks = [
    { id: 'c1', text: 'Liên hệ địa điểm', done: true },
    { id: 'c2', text: 'Soạn chương trình', done: false, pct: 40 },
    { id: 'c3', text: 'In tài liệu', done: false, pct: 0 },
    { id: 'c4', text: 'Kiểm tra lần cuối', done: false, pct: 60 },
  ];
  return { schema: 1, projects: [p], notes: [] };
};
const h = await startHarness({ seed });
const pctValues = (page) =>
  page.evaluate(() => [...document.querySelectorAll('#editor-body .compact-check input[name^="check-pct-"]')].map((r) => Number(r.value)));
try {
  for (const width of [390, 820, 1440]) {
    const at = ` (${width}px)`;

    // A. Chi tiết việc: không còn nút lên/xuống; mỗi mục có tay kéo, nút ×; % ẩn nhưng đúng với dữ liệu.
    {
      const { context, page } = await h.open(width, { touch: width < 700 });
      await h.show(page, 'board');
      await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[0]));
      await page.waitForSelector('#editor-body .compact-check input[name="check-pct-3"]', { state: 'attached' });

      assert.equal(await page.locator('#editor-body .zen-check-move').count(), 0, 'không còn nút lên/xuống' + at);
      assert.equal(await page.locator('#editor-body .compact-check .wf-grip').count(), 4, 'mỗi mục còn tay kéo' + at);
      assert.equal(await page.locator('#editor-body .compact-check .compact-check-remove').count(), 4, 'mỗi mục còn nút ×' + at);
      assert.deepEqual(await pctValues(page), [100, 40, 0, 60], 'giá trị % trong dữ liệu đúng' + at);
      assert.equal(
        await page.evaluate(() =>
          [...document.querySelectorAll('#editor-body .zen-ck-pct')].filter((el) => el.getBoundingClientRect().width > 0).length,
        ),
        0,
        'không hiện ô % nào' + at,
      );

      // Tick mục 3 (→100), bỏ tick (→0), tick lại (→100).
      const box3 = page.locator('#editor-body .compact-check').nth(2).locator('input[name^="check-done-"]');
      await box3.check();
      assert.equal(await page.locator('#editor-body input[name="check-pct-2"]').inputValue(), '100', 'tick làm % lên 100' + at);
      await box3.uncheck();
      assert.equal(await page.locator('#editor-body input[name="check-pct-2"]').inputValue(), '0', 'bỏ tick đưa % về 0' + at);
      await box3.check();

      await page.locator('#editor-form button[type=submit]').click();
      await page.waitForFunction(() => project('p1').tasks[0].checks[2].done === true);
      const saved = await page.evaluate(() => project('p1').tasks[0].checks.map((c) => ({ done: !!c.done, pct: checkPct(c) })));
      assert.deepEqual(saved.map((c) => c.pct), [100, 40, 100, 60], 'đã lưu % từng mục (mục 2 và 4 không đổi)' + at);
      assert.equal(saved[2].done, true, 'mục 3 đã tick và được lưu' + at);

      // Công thức: việc = trung bình các mục; dự án = trung bình các việc chưa lưu trữ.
      const formula = await page.evaluate(() => {
        const t = project('p1').tasks[0];
        const live = project('p1').tasks.filter((x) => !x.archived);
        return {
          task: taskPct(t),
          taskExpect: Math.round((100 + 40 + 100 + 60) / 4),
          project: progress(project('p1').tasks).pct,
          projectExpect: Math.round(live.map(taskPct).reduce((a, b) => a + b, 0) / live.length),
          emptyOpen: progress([{ col: 'Doing', checks: [], archived: false }]).pct,
          emptyDone: progress([{ col: 'Done', checks: [], archived: false }]).pct,
          archivedTotal: progress([{ col: 'Done', checks: [], archived: true }]).total,
        };
      });
      assert.equal(formula.task, formula.taskExpect, 'tiến độ việc là trung bình các mục' + at);
      assert.equal(formula.project, formula.projectExpect, 'tiến độ dự án là trung bình các việc' + at);
      assert.equal(formula.emptyOpen, 0, 'việc không có mục, chưa xong: 0%' + at);
      assert.equal(formula.emptyDone, 100, 'việc không có mục, đã xong: 100%' + at);
      assert.equal(formula.archivedTotal, 0, 'việc đã lưu trữ không được tính' + at);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
        'chi tiết việc không tràn ngang' + at,
      );
      await context.close();
    }

    // B. Chế độ tập trung: không còn nút lên/xuống; tick mục vẫn đưa % về 100 và được lưu.
    {
      const { context, page } = await h.open(width, { touch: width < 700 });
      await h.show(page, 'projects');
      await page.evaluate(() => {
        _WF.focus = { p: 'p1', t: 'p1t0' };
        go('focus');
      });
      await page.locator('[data-fe-edit]').click();
      await page.waitForSelector('.zen-fe-form');
      assert.equal(await page.locator('[data-fe-move]').count(), 0, 'Chế độ tập trung: không còn nút lên/xuống' + at);
      assert.equal(await page.locator('[data-fe-pct]').count(), 4, 'Chế độ tập trung: dữ liệu % vẫn có cho mỗi mục' + at);
      await page.locator('[data-fe-toggle]').nth(2).check();
      await page.waitForFunction(
        () => project('p1').tasks[0].checks[2].done === true && checkPct(project('p1').tasks[0].checks[2]) === 100,
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
        'Chế độ tập trung không tràn ngang' + at,
      );
      await context.close();
    }
  }
  console.log(
    'PASS: checklist không còn ↑/↓ và không hiện %; mỗi mục vẫn giữ % ngầm, tick = 100%, được lưu; tiến độ việc và dự án là trung bình (390/820/1440px).',
  );
} finally {
  await h.close();
}
