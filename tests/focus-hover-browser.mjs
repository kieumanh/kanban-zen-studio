// Hồi quy v1.17.6: thẻ việc ở Chế độ tập trung có hiệu ứng khi lướt chuột (nhấc nhẹ, vạch nhấn màu dự án, chữ "Tập trung →" nhích) và tôn trọng "giảm chuyển động".
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const h = await startHarness({
  seed: () => ({
    schema: 1,
    projects: [
      makeProject('p1', 'Dự án A', '#7950c8', 6),
      makeProject('p2', 'Dự án B', '#d65380', 3),
    ],
    notes: [],
  }),
});
const probe = (page) =>
  page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})),
    );
    const card =
      document.querySelectorAll('.wf-focus-card')[1] ||
      document.querySelector('.wf-focus-card');
    const css = getComputedStyle(card),
      bar = getComputedStyle(card, '::before'),
      action = getComputedStyle(card.querySelector('.focus-card-action'));
    return {
      transform: css.transform,
      shadow: css.boxShadow,
      barTransform: bar.transform,
      barColor: bar.backgroundColor,
      action: action.transform,
      transition: css.transitionDuration,
      card: card.dataset.wfFocus,
      style: card.getAttribute('style'),
    };
  });
try {
  // Máy tính có chuột: rê vào thẻ thì thẻ nhấc lên.
  {
    const { context, page } = await h.open(1440);
    await h.show(page, 'focus');
    const card = page.locator('.wf-focus-card').nth(1);
    await card.scrollIntoViewIfNeeded();
    const rest = await probe(page);
    assert.equal(rest.transform, 'none', 'thẻ lúc nghỉ không dịch chuyển');
    assert.match(
      rest.style || '',
      /--card-color:\s*#[0-9a-f]{6}/i,
      'thẻ mang màu dự án',
    );
    assert.ok(parseFloat(rest.transition) > 0, 'thẻ có thời gian chuyển động');
    await card.hover();
    await page.waitForTimeout(400);
    const hover = await probe(page);
    assert.ok(
      /matrix\(1, 0, 0, 1, 0, -4\)/.test(hover.transform),
      'rê chuột nhấc thẻ 4px: ' + hover.transform,
    );
    assert.notEqual(hover.shadow, rest.shadow, 'bóng đổ đổi khi rê chuột');
    assert.notEqual(hover.barTransform, rest.barTransform, 'vạch nhấn chạy ra');
    assert.ok(
      /matrix\(1, 0, 0, 1, 4, 0\)/.test(hover.action),
      'chữ Tập trung nhích sang phải: ' + hover.action,
    );
    await page.mouse.move(5, 5);
    await page.waitForTimeout(400);
    assert.equal(
      (await probe(page)).transform,
      'none',
      'rời chuột thì thẻ trở về',
    );
    // Dùng bàn phím cũng có hiệu ứng.
    await page.locator('.wf-focus-card').nth(1).focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(400);
    assert.ok(
      /matrix\(1, 0, 0, 1, 0, -4\)/.test((await probe(page)).transform),
      'tiêu điểm bàn phím nhấc thẻ',
    );
    await context.close();
  }
  // Giảm chuyển động: không dịch chuyển, không chuyển động.
  {
    const { context, page } = await h.open(1440);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await h.show(page, 'focus');
    const card = page.locator('.wf-focus-card').nth(1);
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.waitForTimeout(400);
    const hover = await probe(page);
    assert.equal(
      hover.transform,
      'none',
      'giảm chuyển động: thẻ không dịch chuyển',
    );
    assert.equal(hover.action, 'none', 'giảm chuyển động: chữ không nhích');
    assert.ok(
      parseFloat(hover.transition) === 0,
      'giảm chuyển động: không có thời gian chuyển động',
    );
    await context.close();
  }
  // Điện thoại cảm ứng: không có hiệu ứng "kẹt" sau khi chạm; trang không tràn ngang.
  {
    const { context, page } = await h.open(390, { touch: true });
    await h.show(page, 'focus');
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      'trang tràn ngang ở 390px',
    );
    assert.equal(
      (await probe(page)).transform,
      'none',
      'thẻ trên điện thoại lúc nghỉ',
    );
    await context.close();
  }
  console.log(
    'PASS: thẻ việc ở Chế độ tập trung có hiệu ứng rê chuột / bàn phím, tôn trọng giảm chuyển động, gọn trên điện thoại.',
  );
} finally {
  await h.close();
}
