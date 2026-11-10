// Hồi quy v1.19.10: dòng checklist trong hộp công việc không tràn viền. Trước đây trên màn hình cảm ứng nút kéo ⠿ được phóng 44px bằng lề âm nên
// nền và vòng focus của nó ló ra ngoài góc bo của dòng (và đè 2px lên ô tick ở 390px); vòng focus của ô tick / thanh % / nút xóa cũng ló 1–2px.
// Kiểm ở 390 / 820 (cảm ứng) và 1440 (chuột): mọi phần tử con nằm trong dòng, nút kéo không chồng ô tick, vòng focus nằm trong dòng,
// và trên cảm ứng nút kéo vẫn đủ 44x44px thật.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Farm Gửi Yêu Thương Vào Đất', '#7950c8', 3);
  p.tasks[0].title = 'Xây dựng trang Công việc cụ thể của farm';
  p.tasks[0].col = 'Doing';
  p.tasks[0].checks = [
    {
      id: 'c1',
      text: 'Phác thảo ý tưởng hoàn thiện trên ChatGPT',
      done: false,
      pct: 0,
    },
    { id: 'c2', text: 'Thêm 1 số ảnh minh họa', done: false, pct: 40 },
    {
      id: 'c3',
      text: 'Xuất bản xem thử vào website farm',
      done: true,
      pct: 100,
    },
  ];
  return { schema: 1, projects: [p], notes: [] };
};
const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ` (${width}px)`;
    const { context, page } = await h.open(width, { touch });
    await h.show(page, 'board');
    await page.evaluate(() =>
      taskDetail(project('p1'), project('p1').tasks[0]),
    );
    await page.waitForSelector(
      '#editor-body .wf-check-sort-list .compact-check',
      { state: 'attached' },
    );
    await page
      .locator('#editor-body .wf-check-sort-list')
      .scrollIntoViewIfNeeded();

    // 1. Bố cục: mọi phần tử con nằm trong dòng; nút kéo không chồng ô tick.
    const layout = await page.evaluate(() => {
      const out = [];
      document
        .querySelectorAll('#editor-body .wf-check-sort-list .compact-check')
        .forEach((row, i) => {
          const r = row.getBoundingClientRect();
          const grip = row.querySelector('.wf-grip').getBoundingClientRect();
          const box = row
            .querySelector('input[type="checkbox"]')
            .getBoundingClientRect();
          const outside = [...row.children]
            .filter((c) => c.getBoundingClientRect().width > 0)
            .filter((c) => {
              const b = c.getBoundingClientRect();
              return (
                b.left < r.left - 0.5 ||
                b.right > r.right + 0.5 ||
                b.top < r.top - 0.5 ||
                b.bottom > r.bottom + 0.5
              );
            })
            .map(
              (c) =>
                c.className.toString().split(' ')[0] || c.tagName.toLowerCase(),
            );
          out.push({ row: i, outside, gripBoxGap: box.left - grip.right });
        });
      return out;
    });
    for (const l of layout) {
      assert.deepEqual(
        l.outside,
        [],
        `dòng ${l.row}: phần tử ló ra ngoài dòng ${l.outside}` + at,
      );
      assert.ok(
        l.gripBoxGap >= -0.5,
        `dòng ${l.row}: nút kéo đè lên ô tick ${l.gripBoxGap}px` + at,
      );
    }

    // 2. Vòng focus của từng điều khiển nằm trong dòng.
    for (const sel of [
      '.wf-grip',
      'input[type="checkbox"]',
      '.compact-check-remove',
      'textarea',
    ]) {
      const over = await page.evaluate((sel) => {
        const bad = [];
        document
          .querySelectorAll('#editor-body .wf-check-sort-list .compact-check')
          .forEach((row, i) => {
            const el = row.querySelector(sel);
            el.focus({ focusVisible: true });
            const cs = getComputedStyle(el);
            const g =
              (parseFloat(cs.outlineWidth) || 0) +
              (parseFloat(cs.outlineOffset) || 0);
            const e = el.getBoundingClientRect();
            const r = row.getBoundingClientRect();
            const sides = {
              trái: r.left - (e.left - g),
              phải: e.right + g - r.right,
              trên: r.top - (e.top - g),
              dưới: e.bottom + g - r.bottom,
            };
            const hit = Object.entries(sides).filter(([, v]) => v > 0.5);
            if (hit.length)
              bad.push(
                `dòng ${i}: ${hit.map(([k, v]) => k + ' ' + v.toFixed(1) + 'px').join(', ')}`,
              );
          });
        return bad;
      }, sel);
      assert.deepEqual(
        over,
        [],
        `vòng focus của ${sel} ló ra ngoài dòng: ${over.join('; ')}` + at,
      );
    }

    // 3. Cảm ứng: nút kéo vẫn đủ 44x44 THẬT (hộp bao của chính nút), không dựa vào lớp vô hình.
    if (touch) {
      const size = await page.evaluate(() => {
        const b = document
          .querySelector(
            '#editor-body .wf-check-sort-list .compact-check .wf-grip',
          )
          .getBoundingClientRect();
        return { w: b.width, h: b.height };
      });
      assert.ok(
        size.w >= 44 && size.h >= 44,
        'nút kéo nhỏ hơn 44px: ' + JSON.stringify(size) + at,
      );
    }

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
  console.log(
    'PASS: dòng checklist không tràn viền: phần tử con, nút kéo, vòng focus nằm trong dòng; nút kéo vẫn 44×44px thật (390/820/1440px).',
  );
} finally {
  await h.close();
}
