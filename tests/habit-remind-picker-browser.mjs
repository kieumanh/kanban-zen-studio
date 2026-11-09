// Hồi quy v1.43.0: "Nhắc lúc" trong biểu mẫu việc hằng ngày dùng nút gợi ý nhanh và hai ô giờ/phút thay cho ô giờ
// gốc của trình duyệt. Kiểm: không còn ô giờ gốc; nút gợi ý đặt đúng giờ; ô giờ/phút đặt đúng giờ; "Không nhắc" xóa giờ;
// lưu đúng; vùng chạm 44px khi cảm ứng; không tràn ngang ở 390 (chạm), 820, 1440px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Farm', '#7950c8', 2)],
  notes: [],
  dailyHabits: [
    { id: 'e', name: 'Đọc sách', icon: '📖', color: '#7950c8', createdAt: todayStr, done: [], remindTime: '07:30' },
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
    await page.waitForSelector('[data-hb-row="e"]');
    await page.click('[data-hb-edit="e"]');
    await page.waitForSelector('#editor[open] #hb-time-h');

    assert.equal(
      await page.locator('#editor-body input[type=time]').count(),
      0,
      'không còn ô giờ gốc của trình duyệt' + at,
    );
    const hidden = () => page.locator('#editor-body input[name=remindTime]').inputValue();
    assert.equal(await hidden(), '07:30', 'giờ hiện có được nạp vào biểu mẫu' + at);
    assert.equal(
      await page.locator('#editor-body #hb-time-h').inputValue(),
      '07',
      'ô giờ hiển thị đúng giờ hiện có' + at,
    );
    assert.equal(
      await page.locator('#editor-body #hb-time-m').inputValue(),
      '30',
      'ô phút hiển thị đúng phút hiện có' + at,
    );

    // Nút gợi ý 21:00: đặt giá trị, đổi trạng thái nút và dòng trạng thái.
    await page.click('#editor-body [data-hb-time="21:00"]');
    assert.equal(await hidden(), '21:00', 'nút gợi ý đặt đúng giờ' + at);
    assert.equal(await page.locator('#editor-body #hb-time-h').inputValue(), '21', 'ô giờ theo nút gợi ý' + at);
    assert.equal(await page.locator('#editor-body #hb-time-m').inputValue(), '00', 'ô phút theo nút gợi ý' + at);
    assert.equal(
      await page.locator('#editor-body [data-hb-time="21:00"]').getAttribute('aria-pressed'),
      'true',
      'nút được chọn báo aria-pressed' + at,
    );
    assert.match(
      await page.locator('#hb-time-status').innerText(),
      /21:00/,
      'dòng trạng thái nói đúng giờ nhắc' + at,
    );

    // Ô giờ: chọn 08 giữ phút 00.
    await page.selectOption('#editor-body #hb-time-h', '08');
    assert.equal(await hidden(), '08:00', 'chọn giờ trong ô giờ' + at);

    // Ô phút: chọn 45.
    await page.selectOption('#editor-body #hb-time-m', '45');
    assert.equal(await hidden(), '08:45', 'chọn phút trong ô phút' + at);

    // Layout: vùng chạm và không tràn ngang.
    const m = await page.evaluate(() => {
      const box = (sel) => {
        const r = document.querySelector(sel)?.getBoundingClientRect();
        return r ? { h: r.height, right: r.right } : null;
      };
      const chips = [...document.querySelectorAll('#editor-body .hb-time-chip')].map((c) => c.getBoundingClientRect().height);
      return {
        chipH: Math.min(...chips),
        selH: Math.min(box('#hb-time-h').h, box('#hb-time-m').h),
        maxRight: Math.max(...[...document.querySelectorAll('#editor-body .hb-time-chip, #editor-body .hb-time-sel select')].map((c) => c.getBoundingClientRect().right)),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    const minTouch = touch ? 44 : 32;
    assert.ok(m.chipH >= minTouch - 0.5, 'nút gợi ý đủ cao để chạm' + at + ' ' + m.chipH);
    assert.ok(m.selH >= minTouch - 0.5, 'ô giờ/phút đủ cao để chạm' + at + ' ' + m.selH);
    assert.ok(m.maxRight <= width, 'nút/ô giờ không vượt khung màn hình' + at);
    assert.ok(m.overflow <= 0, 'không tràn ngang' + at);

    // "Không nhắc" xóa giờ nhắc; lưu xong việc không còn giờ nhắc.
    await page.click('#editor-body [data-hb-time=""]');
    assert.equal(await hidden(), '', '"Không nhắc" xóa giờ' + at);
    assert.match(await page.locator('#hb-time-status').innerText(), /Không nhắc/, 'trạng thái báo không nhắc' + at);

    // Đặt lại 06:15 rồi lưu.
    await page.selectOption('#editor-body #hb-time-h', '06');
    await page.selectOption('#editor-body #hb-time-m', '15');
    await page.click('#editor-form [type=submit]');
    await page.waitForFunction(() => window.zenHabits.list().find((x) => x.id === 'e')?.remindTime === '06:15');
    assert.equal(
      await page.evaluate(() => window.zenHabits.list().find((x) => x.id === 'e').remindTime),
      '06:15',
      'giờ nhắc đã lưu' + at,
    );
    await page.context().close();
  }
  console.log('PASS: "Nhắc lúc" dùng nút gợi ý và ô giờ/phút; "Không nhắc" xóa giờ; lưu đúng; vùng chạm đủ; không tràn ngang (390 chạm, 820, 1440px).');
} finally {
  await h.close();
}
