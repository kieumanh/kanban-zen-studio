// Hồi quy v1.16.5: lời chào "Chào mừng bạn trở lại" phải hiện lại ở mỗi buổi trong ngày (4 buổi).
// Trước đây bấm "đã đọc" một lần lưu dấu 'welcome' vĩnh viễn trên máy chủ → mọi buổi sau không bao giờ hiện nữa.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const h = await startHarness();
try {
  const { page } = await h.open(1440);
  // Máy chủ giả có nhớ dấu đã đọc; bắt đầu với dấu cũ 'welcome' của người đã từng bấm đọc trước v1.16.5.
  const receipts = new Set(['welcome']);
  const puts = [];
  await page.route('**/api/notification-receipts', async (route) => {
    const req = route.request();
    if (req.method() === 'PUT') {
      const keys = req.postDataJSON().keys;
      puts.push(...keys);
      keys.forEach((k) => receipts.add(k));
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"ok":true}',
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ keys: [...receipts] }),
    });
  });
  // Trả máy về trạng thái "chưa thấy lời chào của buổi này".
  const reset = () =>
    page.evaluate(() => {
      for (const k of Object.keys(localStorage))
        if (k.startsWith('zen-welcome:')) localStorage.removeItem(k);
      welcomeSession.clear();
      document.querySelectorAll('.welcome-dialog').forEach((d) => d.remove());
    });
  const dialogShown = async () => {
    // dailyWelcome bỏ qua nếu một lần gọi khác (do bộ hẹn giờ của chính trang) đang chạy; đợi nó xong rồi mới gọi để kết quả không phụ thuộc tốc độ máy.
    await page.waitForFunction(() => !welcomeLoading);
    await page.evaluate(async () => {
      await loadReadReceipts(true);
      await dailyWelcome();
    });
    await page.waitForFunction(() => !welcomeLoading);
    return page.locator('.welcome-dialog[open]').count();
  };

  // 1. Dấu 'welcome' cũ không được chặn lời chào của buổi hiện tại.
  await reset();
  assert.equal(
    await dialogShown(),
    1,
    "Dấu 'welcome' vĩnh viễn đang chặn lời chào của buổi hiện tại",
  );
  const eyebrow = await page.locator('.welcome-dialog .eyebrow').innerText();
  assert.match(eyebrow, /MỘT KHOẢNH KHẮC CHO BẠN/);

  // 2. Bấm đã đọc → lưu dấu riêng của đúng ngày + buổi, và lời chào đóng.
  const slot = await page.evaluate(() => welcomeSlot());
  await page.locator('#welcome-read').click();
  await page.waitForSelector('.welcome-dialog', { state: 'detached' });
  assert.deepEqual(puts, ['welcome:' + slot.day + ':' + slot.slot]);

  // 3. Cùng buổi đó, dù xóa dấu trên máy, lời chào không hiện lại (đã đọc trên máy chủ).
  await reset();
  assert.equal(
    await dialogShown(),
    0,
    'Đã đọc rồi mà lời chào buổi này vẫn hiện lại',
  );

  // 4. Mỗi buổi tiếp theo trong ngày đều hiện lại lời chào của buổi đó.
  const seen = [];
  for (let i = 1; i < 4; i++) {
    await page.evaluate(
      ([i, day, slot]) => {
        const real = window.__realSlot || (window.__realSlot = welcomeSlot);
        welcomeSlot = (now) => ({ ...real(now), day, slot: (slot + i) % 4 });
      },
      [i, slot.day, slot.slot],
    );
    await reset();
    assert.equal(
      await dialogShown(),
      1,
      'Buổi kế tiếp thứ ' + i + ' không hiện lời chào',
    );
    await page.locator('#welcome-read').click();
    await page.waitForSelector('.welcome-dialog', { state: 'detached' });
    seen.push((slot.slot + i) % 4);
  }
  assert.equal(
    new Set([slot.slot, ...seen]).size,
    4,
    'Phải đủ 4 buổi khác nhau',
  );
  console.log(
    'PASS: lời chào hiện lại ở cả 4 buổi trong ngày; dấu đã đọc theo từng buổi.',
  );
} finally {
  await h.close();
}
