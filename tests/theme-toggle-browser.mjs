// Hồi quy v1.17.0: nút chuyển nhanh sáng / tối nằm ngay cạnh biểu tượng thông báo ở 390/820/1440px.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const h = await startHarness();
try {
  for (const width of [390, 820, 1440]) {
    const { context, page } = await h.open(width, {
      touch: width < 700,
      colorScheme: 'light',
    });
    const at = ` (${width}px)`;
    const theme = () =>
      page.evaluate(() => document.documentElement.dataset.theme);
    const toggle = page.locator('#theme-toggle');

    // 1. Có đúng một nút, đứng ngay trước chuông thông báo, đủ lớn để bấm, có tên đọc được.
    assert.equal(await toggle.count(), 1, 'số nút chuyển giao diện' + at);
    assert.equal(
      await page.evaluate(
        () => document.querySelector('#theme-toggle').nextElementSibling?.id,
      ),
      'notifications-button',
      'nút phải cạnh chuông' + at,
    );
    assert.equal(await theme(), 'light');
    assert.equal(
      await toggle.getAttribute('aria-label'),
      'Chuyển sang giao diện tối',
    );
    assert.equal(
      await page.locator('#theme-toggle .ui-icon').count(),
      1,
      'biểu tượng' + at,
    );
    const iconLight = await page.locator('#theme-toggle .ui-icon').innerHTML();

    // 2. Không chồng lấn với ô tìm kiếm / chuông, không tràn ngang trang.
    const geo = await page.evaluate(() => {
      const r = (sel) => {
        const e = document.querySelector(sel);
        const b = e && e.getBoundingClientRect();
        return (
          b && {
            l: b.left,
            r: b.right,
            t: b.top,
            b: b.bottom,
            w: b.width,
            h: b.height,
          }
        );
      };
      return {
        toggle: r('#theme-toggle'),
        bell: r('#notifications-button'),
        search: r('.top-actions .search'),
        vw: innerWidth,
        scrollW: document.documentElement.scrollWidth,
      };
    });
    assert.ok(
      geo.toggle.w >= 36 && geo.toggle.h >= 36,
      'nút quá nhỏ' + at + JSON.stringify(geo.toggle),
    );
    assert.ok(geo.toggle.r <= geo.bell.l + 1, 'nút chồng lên chuông' + at);
    assert.ok(
      geo.search.r <= geo.toggle.l + 1,
      'nút chồng lên ô tìm kiếm' + at,
    );
    assert.ok(geo.bell.r <= geo.vw && geo.scrollW <= geo.vw, 'tràn ngang' + at);

    // 3. Bấm: sang tối, đổi biểu tượng + nhãn, lưu lựa chọn; bấm lại: về sáng.
    await toggle.click();
    assert.equal(await theme(), 'dark', 'bấm lần 1' + at);
    assert.equal(
      await toggle.getAttribute('aria-label'),
      'Chuyển sang giao diện sáng',
    );
    assert.notEqual(
      await page.locator('#theme-toggle .ui-icon').innerHTML(),
      iconLight,
      'biểu tượng không đổi' + at,
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem('zen-theme')),
      'dark',
    );
    // 4. Đổi từ nơi khác (Cài đặt / hệ thống) cũng cập nhật nút.
    await page.evaluate(() => window.zenTheme.setTheme('light'));
    assert.equal(
      await toggle.getAttribute('aria-label'),
      'Chuyển sang giao diện tối',
      'nút không theo đổi từ nơi khác' + at,
    );
    await toggle.click();
    assert.equal(await theme(), 'dark');
    await page.reload();
    await page.waitForFunction(
      () =>
        currentUser?.id === 'qa' &&
        document.documentElement.dataset.zenReady === '1',
    );
    assert.equal(
      await theme(),
      'dark',
      'lựa chọn phải giữ sau khi tải lại' + at,
    );
    assert.equal(
      await page.locator('#theme-toggle').getAttribute('aria-label'),
      'Chuyển sang giao diện sáng',
    );
    // 5. Bàn phím: Enter đổi được.
    await page.locator('#theme-toggle').focus();
    await page.keyboard.press('Enter');
    assert.equal(await theme(), 'light', 'bàn phím' + at);
    await context.close();
  }
  console.log(
    'PASS: nút chuyển sáng / tối cạnh chuông thông báo (390/820/1440px).',
  );
} finally {
  await h.close();
}
