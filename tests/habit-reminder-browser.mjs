// v1.34.0: giờ nhắc riêng cho từng việc hằng ngày: khung "đến giờ nhắc" ở đầu trang, chuông thông báo,
// dấu nhắc trên từng việc, và đặt/xóa giờ nhắc trong biểu mẫu. Kiểm tra ở 390 (chạm), 820, 1440px; không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

// Ngày và giờ theo múi giờ Việt Nam, đúng với cách ứng dụng tính "hôm nay" và giờ nhắc.
const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const nowHM = new Date().toLocaleTimeString('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
// "23:59" chỉ đến giờ đúng trong phút cuối ngày; khi đó việc đó cũng được nhắc.
const lastMinute = nowHM >= '23:59';
const addD = (n) =>
  new Date(Date.parse(todayStr + 'T12:00:00Z') + n * 864e5)
    .toISOString()
    .slice(0, 10);
const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Farm', '#7950c8', 2)],
  notes: [],
  dailyHabits: [
    {
      // Đã đến giờ, chưa làm, chưa nghỉ: phải được nhắc.
      id: 'a',
      name: 'Thiền 10 phút',
      icon: '🧘',
      color: '#7950c8',
      createdAt: addD(-20),
      goal: 7,
      done: [],
      remindTime: '00:00',
    },
    {
      // Đã làm hôm nay: không nhắc.
      id: 'b',
      name: 'Uống đủ nước',
      icon: '💧',
      color: '#3a6fb0',
      createdAt: addD(-20),
      goal: 7,
      done: [todayStr],
      remindTime: '00:00',
    },
    {
      // Nghỉ hôm nay: không nhắc.
      id: 'c',
      name: 'Đi bộ nhẹ',
      icon: '🚶',
      color: '#2e7d5b',
      createdAt: addD(-20),
      goal: 7,
      done: [],
      rest: [todayStr],
      remindTime: '00:00',
    },
    {
      // Chưa đến giờ (trừ phút cuối ngày): không nhắc.
      id: 'd',
      name: 'Đọc vài trang sách',
      icon: '📖',
      color: '#b5552a',
      createdAt: addD(-20),
      goal: 7,
      done: [],
      remindTime: '23:59',
    },
  ],
});
const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'habits');
    await page.waitForSelector('[data-hb-row="a"]');

    // Khung đến giờ nhắc: chỉ liệt kê việc đã đến giờ, chưa làm, chưa nghỉ.
    const banner = page.locator('.hb-due');
    assert.equal(await banner.count(), 1, 'có khung đến giờ nhắc' + at);
    const bannerText = await banner.innerText();
    const expected = lastMinute ? 2 : 1;
    assert.match(
      bannerText,
      new RegExp(expected + ' việc đến giờ nhắc'),
      'đếm đúng số việc đến giờ' + at,
    );
    assert.ok(bannerText.includes('Thiền 10 phút'), 'việc chưa làm đã đến giờ được nhắc' + at);
    assert.ok(!bannerText.includes('Uống đủ nước'), 'việc đã làm hôm nay không được nhắc' + at);
    assert.ok(!bannerText.includes('Đi bộ nhẹ'), 'việc nghỉ hôm nay không được nhắc' + at);
    assert.equal(
      bannerText.includes('Đọc vài trang sách'),
      lastMinute,
      'việc chưa đến giờ không được nhắc' + at,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      'khung nhắc không làm tràn ngang' + at,
    );
    if (touch) {
      const box = await page.locator('[data-hb-due-dismiss]').boundingBox();
      assert.ok(box && box.height >= 44, 'nút "Đã xem" đủ lớn để chạm' + at);
    }

    // Mỗi việc có giờ nhắc đều hiện dấu nhắc trên dòng của nó.
    assert.equal(await page.locator('.hb-remind').count(), 4, 'mọi việc có giờ nhắc đều có dấu nhắc' + at);
    assert.match(
      await page.locator('[data-hb-row="a"] .hb-remind').innerText(),
      /Nhắc 00:00/,
      'dấu nhắc hiện đúng giờ' + at,
    );

    // Chuông: việc đến giờ nhắc hiện bằng chấm, được nêu trong nhãn chuông và dòng tóm tắt; không cộng vào số việc quá hạn.
    const bellCount = () =>
      page.evaluate(
        () => Number(document.querySelector('#notifications-button .notification-count')?.textContent) || 0,
      );
    const bellLabel = () => page.getAttribute('#notifications-button', 'aria-label');
    const before = await bellCount();
    assert.match(
      await bellLabel(),
      new RegExp(expected + ' việc đến giờ nhắc'),
      'nhãn chuông nêu việc đến giờ nhắc' + at,
    );
    // v1.56.0: chuông nằm trong dropdown "Tùy chọn nhanh", mở dropdown trước khi bấm chuông.
    if (await page.locator('#top-tools-panel').isHidden()) await page.click('#top-tools-trigger');
    await page.click('#notifications-button');
    await page.waitForSelector('#editor[open] [data-hb-open="a"]');
    assert.match(
      await page.locator('[data-hb-open="a"]').innerText(),
      /Thiền 10 phút/,
      'mục chuông nêu đúng việc' + at,
    );
    assert.match(
      await page.locator('#editor .notice-summary').innerText(),
      new RegExp(expected + ' việc đến giờ nhắc'),
      'dòng tóm tắt nêu việc đến giờ nhắc' + at,
    );
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#editor').open);

    // "Đã xem": gỡ khung và gỡ việc khỏi nhãn chuông; số việc quá hạn không đổi.
    await page.click('[data-hb-due-dismiss]');
    await page.waitForFunction(() => !document.querySelector('.hb-due'));
    assert.doesNotMatch(await bellLabel(), /việc đến giờ nhắc/, 'đã xem gỡ việc khỏi nhãn chuông' + at);
    assert.equal(await bellCount(), before, 'nhắc việc không cộng vào số việc quá hạn trên chuông' + at);
    await h.show(page, 'habits');
    await page.waitForSelector('[data-hb-row="a"]');
    assert.equal(await page.locator('.hb-due').count(), 0, 'đã xem thì không nhắc lại trong ngày' + at);

    // Biểu mẫu: đặt giờ nhắc cho việc chưa có, rồi xóa giờ nhắc của việc đang có.
    await page.click('[data-hb-edit="d"]');
    // v1.43.0: giờ nhắc chọn bằng hai ô giờ/phút (bước 5 phút) hoặc nút gợi ý; "Không nhắc" xóa giờ.
    await page.waitForSelector('#editor[open] #hb-time-h');
    await page.selectOption('#editor-body #hb-time-h', '23');
    await page.selectOption('#editor-body #hb-time-m', '55');
    await page.click('#editor-form [type=submit]');
    await page.waitForFunction(() => window.zenHabits.list().find((x) => x.id === 'd')?.remindTime === '23:55');
    assert.match(
      await page.locator('[data-hb-row="d"] .hb-remind').innerText(),
      /Nhắc 23:55/,
      'lưu giờ nhắc từ biểu mẫu' + at,
    );

    await page.click('[data-hb-edit="a"]');
    await page.waitForSelector('#editor[open] #hb-time-h');
    await page.click('#editor-body [data-hb-time=""]');
    await page.click('#editor-form [type=submit]');
    await page.waitForFunction(() => window.zenHabits.list().find((x) => x.id === 'a')?.remindTime === undefined);
    assert.equal(await page.locator('[data-hb-row="a"] .hb-remind').count(), 0, 'để trống thì xóa giờ nhắc' + at);
    assert.equal(
      await page.evaluate(() => window.zenHabits.list().find((x) => x.id === 'a').remindTime),
      undefined,
      'việc không còn trường giờ nhắc' + at,
    );
    await page.context().close();
  }
  console.log('PASS giờ nhắc riêng cho từng việc (390/820/1440px)');
} finally {
  await h.close();
}
