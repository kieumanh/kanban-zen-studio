// Hồi quy v1.18.1: nút đóng (×) ở các hộp thoại có chuyển động (bật vào khi mở, xoay + phóng nhẹ khi rê chuột / tiêu điểm bàn phím, co lại khi nhấn), vẫn bấm đóng được, đủ vùng chạm, và tôn trọng "giảm chuyển động".
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const h = await startHarness({
  seed: () => ({
    schema: 1,
    projects: [makeProject('p1', 'Dự án A', '#7950c8', 3)],
    notes: [],
  }),
});
const settle = (page) =>
  page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})),
    ),
  );
const probe = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const css = getComputedStyle(el);
    const m = new DOMMatrix(
      css.transform === 'none' ? undefined : css.transform,
    );
    const box = el.getBoundingClientRect();
    return {
      none: css.transform === 'none',
      a: m.a,
      b: m.b,
      scale: Math.hypot(m.a, m.b),
      transition: css.transitionDuration,
      property: css.transitionProperty,
      w: box.width,
      h: box.height,
    };
  }, selector);
const popping = (page, selector) =>
  page.evaluate(
    (sel) =>
      document
        .querySelector(sel)
        .getAnimations()
        .some((a) => a.animationName === 'zen-close-pop'),
    selector,
  );
const openEditor = async (page) => {
  await page.evaluate(() => taskForm(project('p1'), null));
  await page.waitForSelector('#editor[open] .modal-close-pin');
};
try {
  for (const width of [390, 820, 1440]) {
    const { context, page } = await h.open(width, { touch: width < 700 });
    await openEditor(page);
    const sel = '#editor .modal-close-pin';
    assert.equal(
      await popping(page, sel),
      true,
      `${width}px: nút × bật vào khi mở hộp thoại`,
    );
    await settle(page);
    const rest = await probe(page, sel);
    assert.ok(
      rest.none,
      `${width}px: lúc nghỉ không xoay: ${rest.a},${rest.b}`,
    );
    assert.ok(
      parseFloat(rest.transition) > 0 && /transform/.test(rest.property),
      `${width}px: nút × có chuyển động`,
    );
    assert.ok(
      rest.w >= 38 && rest.h >= 38,
      `${width}px: nút × đủ lớn (${rest.w}x${rest.h})`,
    );
    await page.focus(sel);
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(450);
    const focus = await probe(page, sel);
    assert.ok(
      Math.abs(focus.a) < 0.01 && focus.b > 1.05 && focus.scale > 1.05,
      `${width}px: tiêu điểm bàn phím xoay + phóng (${focus.a},${focus.b})`,
    );
    if (width === 1440) {
      await page.locator('#editor-body input[name=title]').focus();
      await page.waitForTimeout(450);
      await page.hover(sel);
      await page.waitForTimeout(450);
      const hover = await probe(page, sel);
      assert.ok(
        hover.b > 1.05 && Math.abs(hover.a) < 0.01,
        `rê chuột xoay 90° (${hover.a},${hover.b})`,
      );
      await page.mouse.down();
      await page.waitForTimeout(250);
      const press = await probe(page, sel);
      assert.ok(
        press.scale < 1 && press.scale > 0.8,
        `nhấn thì co lại (${press.scale})`,
      );
      await page.mouse.up();
    } else {
      await page.click(sel);
    }
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    await context.close();
  }
  // Hộp thoại lời chào (nút .welcome-close) và nút đóng menu có cùng chuyển động.
  {
    const { context, page } = await h.open(1440);
    await page.evaluate(() => {
      const d = document.createElement('dialog');
      d.className = 'welcome-dialog';
      d.innerHTML =
        '<button type="button" class="welcome-close" aria-label="Đóng lời chào">×</button><div class="welcome-content"><h2>Xin chào</h2></div>';
      document.body.append(d);
      d.showModal();
    });
    assert.equal(
      await popping(page, '.welcome-close'),
      true,
      'nút × lời chào bật vào',
    );
    await settle(page);
    await page.hover('.welcome-close');
    await page.waitForTimeout(450);
    const hover = await probe(page, '.welcome-close');
    assert.ok(hover.b > 1.05, `nút × lời chào xoay khi rê chuột (${hover.b})`);
    const menu = await probe(page, '.mobile-menu-close');
    assert.ok(
      parseFloat(menu.transition) > 0 && /transform/.test(menu.property),
      'nút đóng menu có chuyển động',
    );
    await context.close();
  }
  // Giảm chuyển động: không bật vào, không xoay, không chuyển động.
  {
    const { context, page } = await h.open(1440);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openEditor(page);
    const sel = '#editor .modal-close-pin';
    assert.equal(
      await popping(page, sel),
      false,
      'giảm chuyển động: nút × không bật vào',
    );
    await page.hover(sel);
    await page.waitForTimeout(450);
    const hover = await probe(page, sel);
    assert.ok(hover.none, 'giảm chuyển động: nút × không xoay khi rê chuột');
    assert.equal(
      parseFloat(hover.transition),
      0,
      'giảm chuyển động: không có thời gian chuyển động',
    );
    await page.click(sel);
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    await context.close();
  }
  console.log(
    'PASS: nút đóng hộp thoại có chuyển động (bật vào, xoay khi rê/tiêu điểm, co khi nhấn), vẫn đóng được, tôn trọng giảm chuyển động.',
  );
} finally {
  await h.close();
}
