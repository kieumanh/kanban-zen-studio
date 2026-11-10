// Hồi quy v1.17.0, cập nhật v1.56.0: nút chuyển sáng / tối nằm trong dropdown "Tùy chọn nhanh",
// cùng với Đồng bộ và Thông báo, ở 390/820/1440px. Nút mở dropdown nằm trên thanh công cụ.
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
    const trigger = page.locator('#top-tools-trigger');
    const panel = page.locator('#top-tools-panel');
    const openPanel = async () => {
      if (await panel.isHidden()) await trigger.click();
      await panel.waitFor({ state: 'visible' });
    };

    // 1. Có đúng một nút chuyển, nằm trong dropdown cùng Đồng bộ và Thông báo; nút mở có tên đọc được.
    assert.equal(await toggle.count(), 1, 'số nút chuyển giao diện' + at);
    assert.equal(
      await page.evaluate(() => {
        const box = document.querySelector('#top-tools-panel');
        return ['#theme-toggle', '#notifications-button', '#save-state'].every(
          (sel) => box.contains(document.querySelector(sel)),
        );
      }),
      true,
      'nút chuyển, chuông và đồng bộ phải nằm trong dropdown' + at,
    );
    assert.equal(
      await trigger.getAttribute('aria-label'),
      'Tùy chọn nhanh',
      'nút mở dropdown có tên' + at,
    );
    assert.equal(await panel.isHidden(), true, 'dropdown đóng lúc đầu' + at);
    await openPanel();
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

    // 2. Nút đủ lớn để bấm (44px khi cảm ứng), nằm gọn trong dropdown, dropdown không tràn ngang trang.
    const geo = await page.evaluate(() => {
      const r = (sel) => {
        const b = document.querySelector(sel)?.getBoundingClientRect();
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
        panel: r('#top-tools-panel'),
        vw: innerWidth,
        scrollW: document.documentElement.scrollWidth,
      };
    });
    const minSize = width < 700 ? 44 : 36;
    assert.ok(
      geo.toggle.w >= minSize && geo.toggle.h >= minSize,
      'nút quá nhỏ' + at + JSON.stringify(geo.toggle),
    );
    assert.ok(
      geo.toggle.l >= geo.panel.l && geo.toggle.r <= geo.panel.r,
      'nút tràn ra ngoài dropdown' + at,
    );
    assert.ok(
      geo.panel.l >= 0 && geo.panel.r <= geo.vw && geo.scrollW <= geo.vw,
      'dropdown tràn ngang' + at,
    );

    // 3. Bấm: sang tối, đổi biểu tượng + nhãn, lưu lựa chọn; dropdown vẫn mở để xem tiếp.
    await toggle.click();
    assert.equal(await theme(), 'dark', 'bấm lần 1' + at);
    assert.equal(
      await panel.isVisible(),
      true,
      'dropdown phải vẫn mở sau khi đổi giao diện' + at,
    );
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

    // 5. Escape đóng dropdown và trả tiêu điểm về nút mở.
    await page.keyboard.press('Escape');
    assert.equal(await panel.isHidden(), true, 'Escape phải đóng dropdown' + at);
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      'top-tools-trigger',
      'tiêu điểm phải trả về nút mở' + at,
    );

    // 6. Lựa chọn giữ nguyên sau khi tải lại.
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

    // 7. Bàn phím: Enter mở dropdown, Enter trên nút chuyển đổi được giao diện.
    await trigger.focus();
    await page.keyboard.press('Enter');
    await panel.waitFor({ state: 'visible' });
    await toggle.focus();
    await page.keyboard.press('Enter');
    assert.equal(await theme(), 'light', 'bàn phím' + at);
    await context.close();
  }
  console.log(
    'PASS: nút chuyển sáng / tối nằm trong dropdown Tùy chọn nhanh cùng Đồng bộ và Thông báo (390/820/1440px).',
  );
} finally {
  await h.close();
}
