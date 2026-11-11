// v1.71.0: chuyển màn hình với ~1.000 việc không được dựng lại bộ định dạng ngày cho từng việc.
// Đo bằng SỐ LẦN GỌI (xác định, không phụ thuộc máy chậm/nhanh), không đo mili giây.
// Trước v1.71.0: today() gọi Date#toLocaleDateString cho từng việc -> hàng nghìn lần mỗi lần chuyển màn hình.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, projects: Array.from({ length: 25 }, (_, i) => makeProject('p' + (i + 1), 'Dự án ' + (i + 1), '#7950c8', 40)), notes: [] });
const h = await startHarness({ seed });
try {
  for (const [width, touch] of [[390, true], [820, true], [1440, false]]) {
    const { page, context } = await h.open(width, { touch });
    await page.waitForSelector('#main *');
    await page.evaluate(() => {
      window.__locale = 0;
      for (const k of ['toLocaleDateString', 'toLocaleString', 'toLocaleTimeString']) {
        const original = Date.prototype[k];
        Date.prototype[k] = function (...a) { window.__locale++; return original.apply(this, a); };
      }
    });
    // Đúng giá trị: kết quả phải GIỐNG HỆT cách viết cũ (toLocaleDateString) trên chính trình duyệt này.
    const values = await page.evaluate(() => ({
      label: dateLabel('2026-11-05'),
      oldLabel: new Date('2026-11-05T12:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      none: dateLabel(''),
      today: today(),
      oldToday: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }),
    }));
    assert.equal(values.label, values.oldLabel, width + 'px: dateLabel giống cách viết cũ');
    assert.match(values.label, /^05\D11$/);
    assert.equal(values.none, 'Không thời hạn');
    assert.equal(values.today, values.oldToday, width + 'px: today() giống cách viết cũ');
    // today() phải theo giờ Việt Nam và đọc lại giờ hiện tại ở MỖI lần gọi (không giữ giá trị đã tính).
    // 2026-11-11 23:30 UTC = 2026-11-12 06:30 giờ VN (khác ngày so với UTC); 2026-11-12 20:00 UTC = 2026-11-13 03:00 giờ VN.
    const days = await page.evaluate(() => {
      const Real = Date, out = [];
      for (const iso of ['2026-11-11T23:30:00Z', '2026-11-12T20:00:00Z']) {
        const t = Real.parse(iso);
        globalThis.Date = class extends Real { constructor(...a) { a.length ? super(...a) : super(t); } static now() { return t; } };
        out.push(today());
      }
      globalThis.Date = Real;
      return out;
    });
    assert.deepEqual(days, ['2026-11-12', '2026-11-13'], width + 'px: today() theo giờ Việt Nam và đọc lại giờ mỗi lần gọi');

    await page.evaluate(() => { window.__locale = 0; });
    for (const v of ['dashboard', 'projects', 'calendar', 'gantt', 'dashboard', 'focus', 'dashboard']) {
      await h.show(page, v);
      await page.waitForTimeout(150);
    }
    const calls = await page.evaluate(() => window.__locale);
    // 7 lần chuyển x 1.000 việc: bản cũ > 3.000 lần. Ngưỡng 300 chừa chỗ cho nhãn ngày hiển thị (không phải theo từng việc).
    assert.ok(calls < 300, width + 'px: ' + calls + ' lần gọi toLocale*String khi chuyển màn hình (phải < 300)');
    console.log(width + 'px ok · toLocale*String: ' + calls);
    await context.close();
  }
  console.log('PASS: chuyển màn hình không dựng lại bộ định dạng ngày theo từng việc');
} finally {
  await h.close();
}
