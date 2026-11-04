// Hồi quy v1.19.13: mọi nút thoát (×) trên website dùng cùng một kiểu như nút × của hộp công việc:
// 44×44, bo 13px, cùng màu chữ/nền/viền, dấu × (không còn chữ "Đóng"), và bấm vào là đóng đúng hộp.
// Trước đây: bảng lệnh (Ctrl+K) dùng chữ "Đóng", nút báo cáo/chia sẻ 38–52px và màu khác nhau.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Farm Gửi Yêu Thương Vào Đất', '#7950c8', 3);
  p.tasks[0].title = 'Xây dựng trang Công việc cụ thể của farm';
  p.tasks[0].col = 'Doing';
  p.tasks[0].checks = [
    { id: 'c1', text: 'Phác thảo ý tưởng', done: false, pct: 0 },
  ];
  return { schema: 1, projects: [p], notes: [] };
};

const STYLE_JS = `(el) => {
  const cs = getComputedStyle(el);
  return { w: el.offsetWidth, h: el.offsetHeight, radius: cs.borderTopLeftRadius, color: cs.color, bg: cs.backgroundColor, border: cs.borderTopColor, glyph: el.textContent.trim() };
}`;

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [1440, false],
  ]) {
    const { context, page } = await h.open(width, { touch });
    await h.show(page, 'board');

    const cases = [
      {
        name: 'Hộp công việc (chuẩn)',
        open: () =>
          page.evaluate(() =>
            taskDetail(project('p1'), project('p1').tasks[0]),
          ),
        button: '#editor .modal-close-pin',
        dialog: '#editor',
      },
      {
        name: 'Bảng lệnh "Bạn muốn làm gì?"',
        open: () => page.keyboard.press('Control+k'),
        button: '.studio-palette [data-studio=close-commands]',
        dialog: '.studio-palette',
      },
      {
        name: 'Báo cáo tuần',
        open: () => page.evaluate(() => openWeeklyReport()),
        button: '#close-weekly-report',
        dialog: '.report-dialog',
      },
      {
        name: 'Chia sẻ báo cáo',
        open: () => page.evaluate(() => openReportShare()),
        button: '.report-share-dialog .icon-btn',
        dialog: '.report-share-dialog',
      },
    ];

    let reference = null;
    for (const c of cases) {
      const at = ` — ${c.name} (${width}px${touch ? ' cảm ứng' : ''})`;
      await c.open();
      await page.waitForSelector(c.button, { state: 'visible' });
      await page.waitForTimeout(600); // chờ hoạt ảnh mở hộp xong để đo đúng kích thước
      const style = await page
        .locator(c.button)
        .first()
        .evaluate((el, js) => eval(js)(el), STYLE_JS);
      assert.equal(
        style.glyph,
        '×',
        'nút thoát phải là dấu × (không phải chữ)' + at,
      );
      assert.equal(style.w, 44, `chiều rộng ${style.w}px, cần 44px` + at);
      assert.equal(style.h, 44, `chiều cao ${style.h}px, cần 44px` + at);
      assert.equal(
        style.radius,
        '13px',
        `bo góc ${style.radius}, cần 13px` + at,
      );
      if (!reference) reference = style;
      assert.equal(style.color, reference.color, 'màu chữ khác nút chuẩn' + at);
      assert.equal(style.bg, reference.bg, 'màu nền khác nút chuẩn' + at);
      assert.equal(
        style.border,
        reference.border,
        'màu viền khác nút chuẩn' + at,
      );

      await page.locator(c.button).first().click();
      await page.waitForTimeout(300);
      // Hộp công việc có thể hiện bảng "chưa lưu" khi thoát (xem v1.19.9); khi đó chọn "Bỏ thay đổi" để đóng hộp.
      const discard = page.locator('.task-unsaved-confirm [data-task-discard]');
      if (await discard.isVisible().catch(() => false)) await discard.click();
      await page.waitForTimeout(400);
      const stillOpen = await page.evaluate((sel) => {
        const d = document.querySelector(sel);
        return !!d && (d.open === true || d.matches(':popover-open'));
      }, c.dialog);
      assert.equal(stillOpen, false, 'bấm × rồi mà hộp vẫn mở' + at);
    }
    await context.close();
  }
  console.log(
    'PASS: mọi nút × thoát đồng bộ với nút của hộp công việc (44×44, bo 13px, cùng màu, bấm là đóng) ở 390 và 1440px.',
  );
} finally {
  await h.close();
}
