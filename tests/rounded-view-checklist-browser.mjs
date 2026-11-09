// Hồi quy v1.19.7: (1) khung "Chế độ xem" ở thanh bên bo tròn; (2) ô % cuối dòng checklist bo tròn, đủ vùng chạm và lưu được giá trị gõ vào.
// Cập nhật v1.45.1: phần (2) từng kiểm thanh tiến độ kéo thả (đã gỡ ở v1.42.0 theo yêu cầu thay bằng ô % nhỏ cuối dòng),
// nên nay kiểm đúng ô % mới thay thế. Sáng + tối, 390 / 820 / 1440px.
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

const sel = '#editor-body input[name="check-pct-1"]';

try {
  for (const scheme of ['light', 'dark']) {
    for (const width of [390, 820, 1440]) {
      const at = ` (${scheme}, ${width}px)`;
      const { context, page } = await h.open(width, {
        touch: width < 700,
        colorScheme: scheme,
      });
      await h.show(page, 'board');

      // 1. Khung "Chế độ xem" bo tròn, nút bên trong bo tròn, không tràn.
      if (width < 1000)
        await page.evaluate(() =>
          document.querySelector('.sidebar').classList.add('open'),
        );
      const view = await page.evaluate(() => {
        const g = document.querySelector('#view-group');
        const gr = g.getBoundingClientRect();
        const side = document.querySelector('.sidebar').getBoundingClientRect();
        const cs = getComputedStyle(g);
        const buttons = [...g.querySelectorAll('.view-mode')];
        return {
          radius: parseFloat(cs.borderTopLeftRadius),
          border: parseFloat(cs.borderTopWidth),
          inside: gr.left >= side.left - 1 && gr.right <= side.right + 1,
          buttonRadius: Math.min(
            ...buttons.map((b) =>
              parseFloat(getComputedStyle(b).borderTopLeftRadius),
            ),
          ),
          buttonsInside: buttons.every(
            (b) =>
              b.getBoundingClientRect().right <= gr.right + 0.5 &&
              b.getBoundingClientRect().left >= gr.left - 0.5,
          ),
          count: buttons.length,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.ok(
        view.radius >= 16,
        'khung Chế độ xem chưa bo tròn: ' + view.radius + at,
      );
      assert.ok(
        view.border >= 1,
        'khung Chế độ xem phải có viền: ' + view.border + at,
      );
      assert.ok(
        view.inside && view.buttonsInside,
        'khung hoặc nút nằm ngoài thanh bên' + at,
      );
      assert.equal(view.count, 3, 'phải có 3 chế độ xem' + at);
      assert.ok(
        view.buttonRadius >= 12,
        'nút chế độ xem chưa bo tròn: ' + view.buttonRadius + at,
      );
      assert.ok(!view.overflow, 'tràn ngang' + at);

      // 2. Ô % cuối dòng checklist (mục 2 đang 40%): là ô số có ký hiệu %, bo tròn;
      //    trên màn hình cảm ứng giữ vùng chạm 44px.
      await page.evaluate(() =>
        document.querySelector('.sidebar').classList.remove('open'),
      );
      await page.evaluate(() =>
        taskDetail(project('p1'), project('p1').tasks[0]),
      );
      await page.waitForSelector(sel, { state: 'attached' });
      await page.locator(sel).scrollIntoViewIfNeeded();
      const pct = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        const r = getComputedStyle(el);
        return {
          type: el.type,
          value: el.value,
          unit: el.nextElementSibling?.textContent?.trim() || '',
          radius: parseFloat(r.borderTopLeftRadius),
          h: el.getBoundingClientRect().height,
        };
      }, sel);
      assert.equal(pct.type, 'number', 'ô % là ô số' + at);
      assert.equal(pct.value, '40', 'ô % hiện đúng 40' + at);
      assert.equal(pct.unit, '%', 'có ký hiệu % ngay cạnh ô số' + at);
      assert.ok(pct.radius >= 6, 'ô % chưa bo tròn: ' + pct.radius + at);
      if (width < 700)
        assert.ok(
          pct.h >= 44 && pct.h <= 46,
          'vùng chạm ô % phải giữ 44px: ' + pct.h + at,
        );

      // Gõ số mới rồi bấm Lưu: giá trị được ghi vào đúng mục.
      await page.locator(sel).fill('70');
      await page.locator(sel).dispatchEvent('input');
      await page.locator(sel).dispatchEvent('change');
      await page.locator('#editor-form button[type=submit]').click();
      await page.waitForFunction(
        () => project('p1').tasks[0].checks[1].pct === 70,
        null,
        { timeout: 10000 },
      );
      assert.equal(
        await page.evaluate(() => project('p1').tasks[0].checks[1].pct),
        70,
        'giá trị gõ vào được lưu' + at,
      );

      const overflow = await page.evaluate(() => {
        const b = document.querySelector('#editor-body');
        return {
          page: document.documentElement.scrollWidth - innerWidth,
          body: b.scrollWidth - b.clientWidth,
        };
      });
      assert.ok(
        overflow.page <= 0 && overflow.body <= 1,
        'tràn ngang ' + JSON.stringify(overflow) + at,
      );
      await context.close();
    }
  }
  console.log(
    'PASS: khung Chế độ xem bo tròn; ô % cuối dòng checklist là ô số bo tròn, vùng chạm 44px khi chạm, lưu giá trị gõ vào (sáng/tối, 390/820/1440px).',
  );
} finally {
  await h.close();
}
