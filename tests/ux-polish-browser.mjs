// v1.24.0: cải thiện UX theo đánh giá — ô ngày có số và chấm hôm nay trên điện thoại; ghi chú tiến độ còn bao nhiêu lượt
// và trạng thái tuần mới; nhãn "Máy cá nhân" ở đăng nhập; "Đăng xuất mọi thiết bị" có xác nhận.
// Kiểm tra ở 390/820/1440px, không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const dow = (new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7; // 0 = thứ Hai
const addDays = (d, n) => new Date(new Date(d + 'T12:00:00Z').getTime() + n * 864e5).toISOString().slice(0, 10);
const monday = addDays(day, -dow);
const back = (n) => addDays(day, -n);
const dd = day.slice(8, 10);
const seed = (done = []) => () => ({
  schema: 1,
  projects: [makeProject('p1', 'Farm', '#7950c8', 2)],
  notes: [],
  dailyHabits: [{ id: 'g3', name: 'Đọc sách', icon: '📖', color: '#2e7d5b', createdAt: back(20), done, goal: 3, projectId: 'p1' }],
});
const h = await startHarness({ seed: seed() });
try {
  // 1) Ô ngày trên điện thoại: có số ngày, hôm nay có chấm tím; màn rộng ẩn các chi tiết này.
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const at = ' (' + width + 'px)';
    const { page } = await h.open(width, { touch, workspace: seed()() });
    await h.show(page, 'habits');
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const today = document.querySelector('[data-hb-row] .hb-cell.is-today');
      const dayname = today?.querySelector('.hb-dayname');
      const num = today?.querySelector('.hb-daynum');
      return {
        num: num?.textContent || '',
        numVisible: !!num && num.offsetParent !== null,
        dotShown: !!dayname && getComputedStyle(dayname, '::after').display === 'block',
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.equal(m.num, dd, 'ô hôm nay hiện số ngày' + at);
    assert.equal(m.overflow, false, 'không tràn ngang' + at);
    if (width <= 1100) {
      assert.equal(m.numVisible, true, 'điện thoại/máy bảng hiện số ngày trong ô' + at);
      assert.equal(m.dotShown, true, 'ô hôm nay có chấm tím' + at);
    } else {
      assert.equal(m.numVisible, false, 'máy tính dùng đầu bảng, không lặp số ngày trong ô' + at);
    }
    await page.context().close();
  }

  // 2) Ghi chú tiến độ: tuần có việc thì nói còn bao nhiêu lượt; tuần chưa có lượt nào thì báo tuần mới.
  {
    const { page } = await h.open(1440, { workspace: seed([monday, addDays(monday, 1)])() });
    await h.show(page, 'habits');
    assert.equal(await page.textContent('#hb-progress-note'), 'Còn 1 lượt cần làm tuần này · 2/3 lượt theo mục tiêu, cộng gộp mọi việc', 'ghi chú nêu còn 1 lượt');
    await page.context().close();
  }
  {
    const { page } = await h.open(390, { touch: true, workspace: seed()() });
    await h.show(page, 'habits');
    assert.equal(await page.textContent('#hb-progress-note'), 'Tuần mới: bắt đầu bằng 1 lượt · 0/3 lượt theo mục tiêu, cộng gộp mọi việc', 'tuần mới có trạng thái riêng');
    await page.context().close();
  }

  // 3) Đăng nhập: lựa chọn "Máy cá nhân" (tích sẵn) và giải thích khi bỏ chọn cho máy dùng chung.
  {
    const { page } = await h.open(390, { touch: true });
    await page.route('**/api/me', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Chưa đăng nhập.' }) }));
    await page.goto(page.url());
    await page.waitForSelector('#auth-screen form#auth-form');
    const row = (await page.locator('#auth-screen .check-row').innerText()).replace(/\s+/g, ' ');
    assert.match(row, /Máy cá nhân/, 'nhãn "Máy cá nhân"');
    assert.match(row, /máy dùng chung/, 'có giải thích khi bỏ chọn');
    assert.equal(await page.isChecked('#auth-screen [name=rememberDevice]'), true, 'vẫn tích sẵn như v1.22.1');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'màn đăng nhập không tràn ngang');
    await page.context().close();
  }

  // 4) Cài đặt: "Đăng xuất mọi thiết bị" hỏi xác nhận, gọi đúng yêu cầu, rồi về màn đăng nhập.
  {
    const { page } = await h.open(820, { workspace: seed()() });
    await h.show(page, 'habits');
    let calls = 0;
    await page.route('**/api/logout-all', (route) => { calls++; route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
    await page.evaluate(() => accountPanel());
    await page.waitForSelector('#sign-out-all');
    await page.click('#sign-out-all');
    await page.waitForSelector('#editor[open]');
    assert.match(await page.textContent('#editor'), /Đăng xuất mọi thiết bị\?/, 'có hộp xác nhận');
    assert.equal(calls, 0, 'chưa gọi máy chủ trước khi xác nhận');
    await page.click('#editor-form [type=submit]');
    await page.waitForFunction(() => document.querySelector('#auth-screen form#auth-form'), null, { timeout: 15000 });
    assert.equal(calls, 1, 'đúng một yêu cầu đăng xuất mọi thiết bị');
    assert.match(await page.textContent('#auth-message'), /Đã đăng xuất mọi thiết bị/, 'thông báo sau khi đăng xuất');
    await page.context().close();
  }
  console.log('PASS UX polish: ô ngày trên điện thoại, ghi chú tiến độ, nhãn đăng nhập, đăng xuất mọi thiết bị');
} finally {
  await h.close();
}
