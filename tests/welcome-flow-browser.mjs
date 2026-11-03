// v1.19.1: lời chào "Chào mừng bạn trở lại" phải tự bật đúng 4 buổi trong ngày, mỗi buổi một câu khác nhau,
// kể cả khi vào trang lúc tab đang ẩn, máy chủ dấu đã đọc chậm/lỗi, hoặc kho câu tải chậm.
// Dùng đồng hồ giả của Playwright (giờ Việt Nam: sáng 05–11, trưa 11–14, chiều 14–18, tối 18–05) và KHÔNG đánh dấu sẵn "đã thấy".
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const MORNING = '2026-11-03T02:10:00Z'; // 09:10 giờ Việt Nam
const h = await startHarness();
const waitDialog = (page, ms) =>
  page.waitForSelector('.welcome-dialog[open]', { timeout: ms }).then(
    () => true,
    () => false,
  );
const label = (page) => page.evaluate(() => document.querySelector('.welcome-dialog .eyebrow')?.textContent.split(' · ')[0] ?? null);
const quote = (page) => page.evaluate(() => document.querySelector('.welcome-dialog blockquote')?.textContent ?? null);
const closeDialog = async (page) => {
  await page.evaluate(() => document.querySelector('.welcome-dialog .welcome-close')?.click());
  await page.waitForSelector('.welcome-dialog', { state: 'detached' });
  await page.waitForTimeout(150);
};
const open = (width, options = {}) => h.open(width, { welcome: true, now: MORNING, ...options });

try {
  // 1. Vào trang tự nhiên lúc 09:10: lời chào buổi sáng tự hiện, không cần chạm gì.
  {
    const { context, page } = await open(1440);
    assert.ok(await waitDialog(page, 8000), 'Vào trang buổi sáng mà lời chào không tự hiện');
    assert.equal(await label(page), 'Buổi sáng');
    await context.close();
  }

  // 2. Một lần mở trang, đi qua đủ 4 buổi rồi sang sáng hôm sau: mỗi buổi hiện đúng một lần, mỗi lần một câu khác; cùng buổi thì không hiện lại.
  {
    const { context, page } = await open(1440);
    const seen = [];
    for (const [minutes, expected] of [
      [0, 'Buổi sáng'], // 09:10
      [180, 'Buổi trưa'], // 12:10
      [180, 'Buổi chiều'], // 15:10
      [240, 'Buổi tối'], // 19:10
      [600, 'Buổi sáng'], // 05:10 hôm sau
    ]) {
      if (minutes) await page.clock.fastForward(minutes * 60000);
      assert.ok(await waitDialog(page, 8000), 'Không hiện lời chào ' + expected);
      assert.equal(await label(page), expected);
      seen.push(await quote(page));
      await closeDialog(page);
    }
    assert.equal(new Set(seen).size, 5, 'Mỗi buổi phải là một câu khác nhau, nhận được: ' + JSON.stringify(seen.map((q) => q.slice(0, 30))));
    await page.clock.fastForward(3 * 60 * 60000); // 08:10, vẫn là buổi sáng đã chào
    assert.equal(await waitDialog(page, 2500), false, 'Cùng một buổi mà lời chào hiện lại');
    await context.close();
  }

  // 3. Mở trang khi tab đang ẩn (liên kết mở nền, tab khôi phục): hiện lên ngay khi tab hiện lại, không đợi nhịp 60 giây.
  {
    const { context, page } = await open(1440, {
      setup: async ({ context }) => {
        await context.addInitScript(() => {
          window.__hidden = true;
          Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => window.__hidden });
        });
      },
    });
    assert.equal(await waitDialog(page, 2500), false, 'Tab đang ẩn mà lời chào vẫn hiện');
    await page.evaluate(() => {
      window.__hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.ok(await waitDialog(page, 5000), 'Tab hiện lại mà lời chào không hiện ngay');
    await context.close();
  }

  // 4. Trang đang mở xuyên qua mốc 11:00: lời chào buổi trưa hiện đúng lúc sang buổi, không đợi nhịp 60 giây.
  {
    const { context, page } = await open(1440, { now: '2026-11-03T03:59:30Z' }); // 10:59:30
    assert.ok(await waitDialog(page, 8000));
    assert.equal(await label(page), 'Buổi sáng');
    await closeDialog(page);
    await page.clock.runFor(32000); // → khoảng 11:00:03
    assert.ok(await waitDialog(page, 3000), 'Qua 11:00 mà lời chào buổi trưa không hiện đúng lúc');
    assert.equal(await label(page), 'Buổi trưa');
    await context.close();
  }

  // 5. Máy chủ dấu đã đọc báo lỗi hoặc không trả lời: vẫn chào (không im lặng cả ngày).
  for (const mode of ['fail', 'hang']) {
    const { context, page } = await open(1440, { receiptsMode: mode });
    if (mode === 'hang') await page.clock.runFor(7000);
    assert.ok(await waitDialog(page, 8000), 'Dấu đã đọc (' + mode + ') làm lời chào không hiện');
    assert.equal(await label(page), 'Buổi sáng');
    await context.close();
  }

  // 6. Kho câu tải treo ở lần đầu: không kẹt mãi, thử lại và hiện.
  {
    const { context, page } = await open(1440, {
      setup: async ({ context }) => {
        await context.addInitScript(() => {
          const real = window.fetch.bind(window);
          let calls = 0;
          window.fetch = (input, init) => {
            const url = typeof input === 'string' ? input : input.url;
            if (/\/wisdom\.json$/.test(url) && ++calls === 1)
              return new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
            return real(input, init);
          };
        });
      },
    });
    assert.equal(await waitDialog(page, 2000), false, 'Kho câu đang treo mà đã có lời chào?');
    await page.clock.runFor(16000);
    assert.ok(await waitDialog(page, 6000), 'Kho câu treo ở lần đầu làm lời chào kẹt mãi');
    await context.close();
  }

  // 7. Đã đọc ở thiết bị khác (máy chủ có dấu của buổi này): không hiện lại, nhưng sang buổi sau vẫn hiện.
  {
    const { context, page } = await open(1440, { receiptsSeed: ['welcome:2026-11-03:0'] });
    assert.equal(await waitDialog(page, 3000), false, 'Đã đọc buổi sáng ở nơi khác mà vẫn hiện lại');
    await page.clock.fastForward(3 * 60 * 60000); // 12:10
    assert.ok(await waitDialog(page, 8000), 'Sang buổi trưa mà lời chào không hiện');
    assert.equal(await label(page), 'Buổi trưa');
    await context.close();
  }

  // 8. Điện thoại 390px: lời chào tự hiện và nằm gọn trong màn hình.
  {
    const { context, page } = await open(390, { touch: true });
    assert.ok(await waitDialog(page, 8000), 'Điện thoại: lời chào không tự hiện');
    const box = await page.locator('.welcome-dialog').boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390 + 1, 'Lời chào tràn ngang trên 390px: ' + JSON.stringify(box));
    await context.close();
  }

  console.log('PASS: lời chào tự bật đúng 4 buổi, mỗi buổi một câu khác; chịu được tab ẩn, dấu đã đọc lỗi/chậm và kho câu tải treo.');
} finally {
  await h.close();
}
