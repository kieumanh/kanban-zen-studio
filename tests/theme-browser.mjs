// Hồi quy v1.16.0: chế độ tối và tương phản cao — theo hệ điều hành mặc định, chọn tay trong Cài đặt và bảng lệnh, nhớ sau khi tải lại,
// không đổi dữ liệu làm việc; ở 390/820/1440px.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const h = await startHarness();
const attrs = (page) =>
  page.evaluate(() => ({
    theme: document.documentElement.dataset.theme || '',
    contrast: document.documentElement.dataset.contrast || '',
    scheme: getComputedStyle(document.documentElement).colorScheme,
    bg: getComputedStyle(document.body).backgroundColor,
    meta: document.querySelector('meta[name=theme-color]')?.content,
    stored: [localStorage.getItem('zen-theme'), localStorage.getItem('zen-contrast')],
  }));
const luminance = (css) => {
  const [r, g, b] = (css.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const reopen = async (page) => {
  await page.reload();
  await page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa');
};

try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const label = width + 'px' + (touch ? ' cảm ứng' : '');

    // 1. Mặc định theo hệ điều hành: sáng.
    let { context, page } = await h.open(width, { touch, colorScheme: 'light' });
    let a = await attrs(page);
    assert.equal(a.theme, 'light', `${label}: hệ điều hành sáng -> giao diện sáng`);
    assert.equal(a.contrast, '', `${label}: không tự bật tương phản cao`);
    assert.ok(luminance(a.bg) > 0.8, `${label}: nền sáng (${a.bg})`);
    const workspaceBefore = await page.evaluate(() => JSON.stringify(data));

    // 2. Hệ điều hành đổi sang tối khi đang mở: theo ngay, không cần tải lại.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    a = await attrs(page);
    assert.ok(luminance(a.bg) < 0.05, `${label}: nền tối (${a.bg})`);
    assert.equal(a.scheme, 'dark', `${label}: color-scheme: dark cho ô nhập và thanh cuộn`);
    assert.equal(a.meta, '#151219', `${label}: theme-color đổi theo`);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');

    // 3. Chọn tay trong Cài đặt: Tối thắng hệ điều hành sáng, nhớ sau khi tải lại.
    await page.evaluate(() => accountPanel());
    await page.waitForSelector('#editor .settings-theme');
    assert.equal(await page.locator('#editor .settings-theme input[name=zen-theme]:checked').inputValue(), 'system', `${label}: mặc định "Theo hệ thống"`);
    await page.locator('#editor .settings-theme input[name=zen-theme][value=dark]').check();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    a = await attrs(page);
    assert.deepEqual(a.stored, ['dark', null], `${label}: lưu lựa chọn trên thiết bị`);
    assert.ok(luminance(a.bg) < 0.05, `${label}: nền tối sau khi chọn Tối`);
    const size = await page.locator('#editor .zen-theme-choice').first().boundingBox();
    assert.ok(size.height >= 44, `${label}: ô chọn cao >= 44px (nhận được ${size.height})`);
    await page.evaluate(() => document.querySelector('#editor').close());
    await reopen(page);
    assert.equal((await attrs(page)).theme, 'dark', `${label}: tải lại vẫn tối`);
    // Dữ liệu làm việc không đổi.
    assert.equal(await page.evaluate(() => JSON.stringify(data)), workspaceBefore, `${label}: đổi giao diện không được đụng dữ liệu làm việc`);

    // 4. Quay lại "Theo hệ thống": xóa lựa chọn đã lưu.
    await page.evaluate(() => accountPanel());
    await page.waitForSelector('#editor .settings-theme');
    assert.equal(await page.locator('#editor .settings-theme input[name=zen-theme]:checked').inputValue(), 'dark', `${label}: Cài đặt hiện lựa chọn đã lưu`);
    await page.locator('#editor .settings-theme input[name=zen-theme][value=system]').check();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    assert.deepEqual((await attrs(page)).stored, [null, null], `${label}: Theo hệ thống xóa lựa chọn đã lưu`);

    // 5. Tương phản cao chọn tay; "Thường" thắng yêu cầu của hệ điều hành.
    await page.locator('#editor .settings-theme input[name=zen-contrast][value=high]').check();
    await page.waitForFunction(() => document.documentElement.dataset.contrast === 'high');
    assert.deepEqual((await attrs(page)).stored, [null, 'high'], `${label}: lưu tương phản cao`);
    await page.locator('#editor .settings-theme input[name=zen-contrast][value=normal]').check();
    await page.waitForFunction(() => !document.documentElement.dataset.contrast);
    await page.evaluate(() => document.querySelector('#editor').close());

    // 6. Bảng lệnh (Ctrl+K): "Giao diện tối".
    await page.keyboard.press('Control+k');
    await page.waitForFunction(() => document.querySelector('.studio-palette')?.open === true);
    await page.locator('.studio-palette input').fill('giao diện tối');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await page.keyboard.press('Control+k');
    await page.waitForFunction(() => document.querySelector('.studio-palette')?.open === true);
    await page.locator('.studio-palette input').fill('tương phản cao');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.documentElement.dataset.contrast === 'high');
    await context.close();

    // 7. Hệ điều hành yêu cầu tương phản cao: tự bật; không lưu gì.
    ({ context, page } = await h.open(width, { touch, colorScheme: 'dark', contrast: 'more' }));
    a = await attrs(page);
    assert.equal(a.theme, 'dark', `${label}: tối theo hệ điều hành`);
    assert.equal(a.contrast, 'high', `${label}: tương phản cao theo hệ điều hành`);
    assert.deepEqual(a.stored, [null, null], `${label}: theo hệ thống thì không ghi gì vào bộ nhớ`);
    // Tương phản cao: chữ chính gần trắng trên nền gần đen.
    const colors = await page.evaluate(() => ({ text: getComputedStyle(document.querySelector('.sidebar .nav.active, .sidebar .nav')).color, bg: getComputedStyle(document.body).backgroundColor }));
    assert.ok(luminance(colors.text) > 0.7 && luminance(colors.bg) < 0.02, `${label}: tương phản cao tối: chữ ${colors.text} trên nền ${colors.bg}`);
    await context.close();

    console.log(`  đạt ${label}`);
  }
  console.log('PASS: chế độ tối và tương phản cao theo hệ điều hành, chọn tay trong Cài đặt/bảng lệnh, nhớ sau tải lại, không đụng dữ liệu.');
} finally {
  await h.close();
}
