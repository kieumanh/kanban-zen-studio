// Hồi quy v1.50.0: checklist không hiện % nữa. Bỏ ô số và chữ % ở từng mục, bỏ con số % ở tóm tắt tiến độ;
// nội dung chiếm phần lớn dòng. Tiêu đề và tóm tắt vẫn có số mục đã xong (x/y). Phần trăm vẫn được giữ trong dữ liệu:
// lưu hộp chi tiết không làm mất % đã có, tick vẫn đưa mục về 100%. Kiểm ở 390 (cảm ứng), 820, 1440 px.
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
  ];
  return { schema: 1, projects: [p], notes: [] };
};
const h = await startHarness({ seed });
try {
  for (const width of [390, 820, 1440]) {
    const at = ` (${width}px)`;
    const { context, page } = await h.open(width, { touch: width < 700 });
    await h.show(page, 'board');
    await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[0]));
    await page.waitForSelector('#editor-body .wf-check-sort-list .compact-check', { state: 'attached' });

    // A. Không còn ô % hay chữ % ở từng dòng; nội dung chiếm phần lớn chiều rộng dòng.
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('#editor-body .wf-check-sort-list .compact-check')].map((row) => {
        const r = row.getBoundingClientRect();
        const ta = row.querySelector('textarea').getBoundingClientRect();
        const visiblePct = [...row.querySelectorAll('.zen-ck-pct, .zen-ck-num, .zen-ck-pct-unit')].filter(
          (el) => el.getBoundingClientRect().width > 0,
        ).length;
        return { visiblePct, textW: ta.width };
      }),
    );
    assert.equal(rows.length, 3, 'có 3 dòng checklist' + at);
    // Ô nội dung đủ rộng để đọc: điện thoại giữ tay kéo và nút × 44px nên chữ còn ≥150px; màn rộng ≥300px.
    const minText = width < 700 ? 150 : 300;
    rows.forEach((row, i) => {
      assert.equal(row.visiblePct, 0, `dòng ${i + 1}: không còn ô % hay chữ %` + at);
      assert.ok(row.textW >= minText, `dòng ${i + 1}: ô nội dung chỉ rộng ${Math.round(row.textW)}px, cần ≥${minText}px` + at);
    });

    // Tiêu đề và tóm tắt: giữ số mục đã xong, không có %.
    const heading = await page.evaluate(
      () => [...document.querySelectorAll('#editor-body h3')].find((el) => el.textContent.startsWith('Checklist'))?.textContent || '',
    );
    assert.ok(!heading.includes('%'), 'tiêu đề checklist không có %: ' + heading + at);
    const summary = await page.evaluate(() => document.querySelector('#editor-body .task-live-progress')?.textContent || '');
    assert.ok(summary.includes('1/3 mục đã hoàn thành'), 'tóm tắt vẫn có số mục đã xong: ' + summary + at);
    assert.ok(!summary.includes('%'), 'tóm tắt tiến độ không có %' + at);

    // B. Lưu không làm mất % đã có (mục 2 vẫn 40); tick mục 3 đưa về 100.
    await page.locator('#editor-body .wf-check-sort-list .compact-check').nth(2).locator('input[name^="check-done-"]').check();
    await page.locator('#editor-form button[type=submit]').click();
    await page.waitForFunction(() => project('p1').tasks[0].checks[2].done === true, null, { timeout: 5000 });
    const saved = await page.evaluate(() => project('p1').tasks[0].checks.map((c) => checkPct(c)));
    assert.deepEqual(saved, [100, 40, 100], 'lưu giữ % đã có; tick đưa mục về 100' + at);

    // C. Chế độ tập trung: không hiện ô % ở dòng nào.
    await page.evaluate(() => {
      _WF.focus = { p: 'p1', t: 'p1t0' };
      go('focus');
    });
    await page.locator('[data-fe-edit]').click();
    await page.waitForSelector('.zen-fe-form');
    const focusVisible = await page.evaluate(
      () => [...document.querySelectorAll('.zen-fe-form [data-fe-pct]')].filter((el) => el.getBoundingClientRect().width > 0).length,
    );
    assert.equal(focusVisible, 0, 'Chế độ tập trung: không hiện ô %' + at);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'không tràn ngang' + at);
    await context.close();
  }
  console.log('PASS: checklist không hiện % (ô số và chữ %); nội dung chiếm trọn dòng; tóm tắt vẫn có x/y; % đã có được giữ khi lưu (390/820/1440px).');
} finally {
  await h.close();
}
