// v1.22.1: đăng nhập không bắt gõ lại — email đã dùng được nhớ trên thiết bị (không lưu mật khẩu) và
// "Ghi nhớ thiết bị này trong 30 ngày" mặc định được tích, nên phiên không hết sau 10 phút.
// Kiểm tra ở 390/820/1440px: checkbox tích sẵn, email nhớ sau khi đăng nhập và còn sau khi tải lại,
// không lưu mật khẩu, người dùng vẫn bỏ tích được, và màn hình đăng nhập không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const EMAIL = 'qa@example.test';
const PASSWORD = 'Mật khẩu thử 12345';
const h = await startHarness();
try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const at = ' (' + width + 'px)';
    const { page } = await h.open(width, { touch });
    let loggedIn = false;
    const logins = [];
    await page.route('**/api/me', (route) =>
      loggedIn
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'qa', name: 'Kiểm tra', email: EMAIL, session_expires: Date.now() + 600000 } }) })
        : route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Chưa đăng nhập.' }) }),
    );
    await page.route('**/api/login', async (route) => {
      logins.push(route.request().postDataJSON());
      loggedIn = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    // 1) Lần đầu: màn hình đăng nhập, checkbox ghi nhớ thiết bị đã tích sẵn, chưa có email đã nhớ.
    await page.goto(page.url());
    await page.waitForSelector('#auth-screen form#auth-form');
    assert.equal(await page.isChecked('#auth-screen [name=rememberDevice]'), true, 'ghi nhớ thiết bị phải tích sẵn' + at);
    assert.equal(await page.inputValue('#auth-screen [name=email]'), '', 'lần đầu chưa có email nhớ' + at);

    // 2) Đăng nhập: gửi rememberDevice=true, và ghi nhớ email (không ghi mật khẩu).
    await page.fill('#auth-screen [name=email]', EMAIL);
    await page.fill('#auth-screen [name=password]', PASSWORD);
    await page.click('#auth-screen [type=submit]');
    await page.waitForFunction(() => document.body.classList.contains('signed-out') === false, null, { timeout: 15000 });
    assert.equal(logins.length, 1, 'phải gửi đúng một yêu cầu đăng nhập' + at);
    assert.equal(logins[0].rememberDevice, true, 'yêu cầu đăng nhập phải mang rememberDevice=true' + at);
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-last-email')), EMAIL, 'email phải được nhớ sau khi đăng nhập' + at);
    const stored = await page.evaluate(() => JSON.stringify(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
    assert.ok(!stored.includes(PASSWORD), 'không được lưu mật khẩu trong bộ nhớ thiết bị' + at);

    // 3) Đăng xuất (phiên hết): tải lại màn hình đăng nhập, email đã nhớ hiện sẵn và checkbox vẫn tích.
    loggedIn = false;
    await page.goto(page.url());
    await page.waitForSelector('#auth-screen form#auth-form');
    assert.equal(await page.inputValue('#auth-screen [name=email]'), EMAIL, 'email đã nhớ phải hiện sẵn sau khi tải lại' + at);
    assert.equal(await page.isChecked('#auth-screen [name=rememberDevice]'), true, 'checkbox vẫn tích' + at);

    // 4) Người dùng bỏ tích: yêu cầu gửi rememberDevice=false (lựa chọn vẫn được tôn trọng).
    await page.uncheck('#auth-screen [name=rememberDevice]');
    await page.fill('#auth-screen [name=password]', PASSWORD);
    await page.click('#auth-screen [type=submit]');
    await page.waitForFunction(() => document.body.classList.contains('signed-out') === false, null, { timeout: 15000 });
    assert.equal(logins[1].rememberDevice, false, 'bỏ tích thì rememberDevice=false' + at);

    // 5) Bố cục: màn hình đăng nhập không tràn ngang.
    loggedIn = false;
    await page.goto(page.url());
    await page.waitForSelector('#auth-screen form#auth-form');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, 'màn hình đăng nhập không được tràn ngang' + at);
    await page.context().close();
  }
  console.log('PASS login remembers account and device');
} finally {
  await h.close();
}
