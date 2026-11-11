// v1.67.0: cài đặt báo cáo email thu chi hằng tuần (Cài đặt → "Báo cáo thu chi tuần") và bản xem trước giống email.
// Kiểm ở 390 (chạm), 820, 1440 px: có phần cài đặt ở cả hai cách mở Cài đặt, mặc định tắt, bật/tắt + chọn ngày giờ lưu và đồng bộ,
// tải lại vẫn giữ, xem trước đúng nội dung, nút mở từ trang Phân bổ tài nguyên, không tràn ngang, vùng chạm đủ lớn.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';
import { financeReport } from '../server/finance-report.mjs';

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const e = (id, type, amount, category, date = today) => ({ id, type, amount, category, note: '', date });
const seed = () => ({
  schema: 1,
  projects: [
    makeProject('p1', 'Farm Lê Lam Sơn', '#2e7d5b', 2, { ledger: [e('a1', 'out', 5000000, 'Thiết bị'), e('a2', 'out', 3000000, 'Nhân sự'), e('a3', 'out', 2000000, 'Quảng cáo'), e('a4', 'in', 4000000, 'Doanh thu')] }),
    makeProject('p2', 'Khóa tu mùa thu', '#7950c8', 2, { ledger: [e('b1', 'out', 2000000, 'Dịch vụ'), e('b2', 'in', 5000000, 'Doanh thu')] }),
  ],
  notes: [],
});
// Xem trước dùng đúng hàm của máy chủ trên dữ liệu hiện có của phiên kiểm tra.
const setup = async ({ page, state }) => {
  await page.route('**/api/finance-report', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(financeReport(state.workspace, today)) }));
};

const h = await startHarness({ seed });
const openSettings = async (page) => {
  await page.evaluate(() => accountPanel());
  await page.waitForSelector('#editor-body .finance-settings', { state: 'attached' });
};
const openGroup = async (page) => {
  const open = await page.evaluate(() => document.querySelector('.finance-settings-group')?.open);
  if (open === false) await page.click('.finance-settings-group>summary');
  await page.waitForSelector('#finance-report-enabled', { state: 'visible' });
};
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ` (${width}px)`;
    const { context, page, server } = await h.open(width, { touch, workspace: seed(), setup });

    // 1. Phần cài đặt nằm trong nhóm riêng ngay dưới "Tổng kết tuần"; mặc định tắt.
    await openSettings(page);
    const groups = await page.evaluate(() => [...document.querySelectorAll('#editor-body details.wf-settings-group>summary')].map((s) => s.textContent));
    const week = groups.indexOf('Tổng kết tuần');
    assert.ok(week >= 0 && groups[week + 1] === 'Báo cáo thu chi tuần', 'nhóm "Báo cáo thu chi tuần" nằm ngay dưới "Tổng kết tuần": ' + groups.join(' | ') + at);
    await openGroup(page);
    const initial = await page.evaluate(() => ({
      on: document.querySelector('#finance-report-enabled').checked,
      day: document.querySelector('#finance-report-day').value,
      hour: document.querySelector('#finance-report-hour').value,
      dayLabel: document.querySelector('#finance-report-day').selectedOptions[0].textContent,
      stored: data.financeReport,
      help: document.querySelector('.finance-settings .subtext').textContent,
    }));
    assert.equal(initial.on, false, 'mặc định tắt' + at);
    assert.deepEqual([initial.day, initial.hour, initial.dayLabel], ['0', '9', 'Chủ nhật'], 'mặc định Chủ nhật 09:00' + at);
    assert.equal(initial.stored, undefined, 'chưa lưu gì vào dữ liệu khi chỉ mở Cài đặt' + at);
    assert.ok(initial.help.includes('ít nhất một khoản thu chi'), 'giải thích khi nào email được gửi' + at);

    // 2. Bố cục: không tràn ngang; vùng chạm đủ lớn khi cảm ứng.
    const layout = await page.evaluate(() => {
      const dialog = document.querySelector('#editor').getBoundingClientRect();
      const box = (sel) => {
        const r = document.querySelector(sel).getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), left: r.left, right: r.right };
      };
      return { dialog, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, day: box('#finance-report-day'), hour: box('#finance-report-hour'), save: box('#save-finance-settings'), preview: box('#preview-finance-report') };
    });
    assert.ok(layout.overflow <= 1, 'không tràn ngang' + at);
    for (const [name, b] of Object.entries({ day: layout.day, hour: layout.hour, save: layout.save, preview: layout.preview })) {
      assert.ok(b.left >= layout.dialog.left - 1 && b.right <= layout.dialog.right + 1, name + ' nằm trong hộp Cài đặt' + at);
      assert.ok(b.h >= (touch ? 44 : 36), name + ' đủ cao để bấm: ' + b.h + at);
    }

    // 3. Bật, chọn Thứ tư 20:00, lưu: dữ liệu cục bộ và máy chủ nhận đúng; thông báo nêu đúng ngày giờ.
    await page.check('#finance-report-enabled');
    await page.selectOption('#finance-report-day', '3');
    await page.selectOption('#finance-report-hour', '20');
    await page.click('#save-finance-settings');
    await page.waitForFunction(() => /Thứ tư lúc 20:00/.test(document.querySelector('#finance-settings-status').textContent));
    assert.deepEqual(await page.evaluate(() => data.financeReport), { enabled: true, day: 3, hour: 20 }, 'lưu cục bộ' + at);
    await page.waitForFunction(() => typeof dirty === 'undefined' || dirty === false, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    assert.deepEqual(server.workspace.financeReport, { enabled: true, day: 3, hour: 20 }, 'máy chủ nhận cài đặt (qua kiểm tra thật của máy chủ)' + at);
    assert.equal(server.workspace.projects[0].ledger.length, 4, 'dữ liệu thu chi nguyên vẹn' + at);

    // 4. Tải lại vẫn giữ.
    await page.reload();
    await page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa' && document.documentElement.dataset.zenReady === '1');
    await openSettings(page);
    await openGroup(page);
    assert.deepEqual(
      await page.evaluate(() => [document.querySelector('#finance-report-enabled').checked, document.querySelector('#finance-report-day').value, document.querySelector('#finance-report-hour').value]),
      [true, '3', '20'],
      'sau khi tải lại vẫn giữ cài đặt' + at,
    );

    // 5. Xem trước giống email: có tổng, từng dự án; hộp vừa màn hình; đóng được.
    await page.click('#preview-finance-report');
    await page.waitForSelector('dialog.report-dialog[open] iframe:not([hidden])');
    const frame = page.frameLocator('dialog.report-dialog iframe');
    await frame.locator('h1').waitFor();
    const preview = await frame.locator('body').innerText();
    for (const needle of ['Bức tranh thu chi', '12.000.000 ₫', '9.000.000 ₫', 'Farm Lê Lam Sơn', 'Khóa tu mùa thu', 'Đang lỗ', 'Đang lãi']) assert.ok(preview.includes(needle), 'bản xem trước thiếu: ' + needle + at);
    const dlg = await page.evaluate(() => {
      const r = document.querySelector('dialog.report-dialog').getBoundingClientRect();
      return { left: r.left, right: r.right, vw: innerWidth, printEnabled: !document.querySelector('#print-finance-report').disabled, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.ok(dlg.left >= -1 && dlg.right <= dlg.vw + 1 && dlg.overflow <= 1, 'hộp xem trước vừa màn hình' + at);
    assert.equal(dlg.printEnabled, true, 'nút In / Lưu PDF dùng được' + at);
    await page.click('dialog.report-dialog #close-weekly-report');
    await page.waitForFunction(() => !document.querySelector('dialog.report-dialog'));

    // 6. Tắt rồi lưu: máy chủ nhận đã tắt, ngày giờ vẫn giữ.
    await page.uncheck('#finance-report-enabled');
    await page.click('#save-finance-settings');
    await page.waitForFunction(() => /Đã tắt email báo cáo thu chi/.test(document.querySelector('#finance-settings-status').textContent));
    await page.waitForTimeout(1500);
    assert.deepEqual(server.workspace.financeReport, { enabled: false, day: 3, hour: 20 }, 'tắt được và nhớ ngày giờ' + at);
    await page.evaluate(() => document.querySelector('#editor').close());

    // 7. Từ trang Phân bổ tài nguyên: nút "Báo cáo email hằng tuần" mở Cài đặt, nhóm báo cáo thu chi mở sẵn.
    await h.show(page, 'budget');
    const btn = await page.evaluate(() => {
      const b = document.querySelector('[data-bg-email]').getBoundingClientRect();
      return { h: Math.round(b.height), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.ok(btn.h >= 44 && btn.overflow <= 1, 'nút đủ lớn, trang không tràn' + at);
    await page.click('[data-bg-email]');
    await page.waitForSelector('.finance-settings-group[open]');
    assert.equal(await page.evaluate(() => document.querySelector('#finance-report-day').value), '3');
    await context.close();
  }

  // 8. Cách mở Cài đặt bằng ảnh đại diện (hộp dạng danh sách phẳng) cũng có phần này.
  {
    const { context, page } = await h.open(1440, { workspace: seed(), setup });
    await page.evaluate(() => document.querySelector('.top-actions>.avatar').click());
    await page.waitForSelector('#editor-body .finance-settings', { state: 'attached' });
    assert.ok(await page.locator('#finance-report-enabled').isVisible(), 'hộp mở bằng ảnh đại diện cũng có cài đặt thu chi');
    await page.check('#finance-report-enabled');
    await page.click('#save-finance-settings');
    await page.waitForFunction(() => data.financeReport?.enabled === true);
    await context.close();
  }

  // 9. Cài đặt trong bộ nhớ bị sai (lỗi hoặc sửa tay) không làm hỏng giao diện: hiện mặc định tắt, lưu lại ghi đè bằng giá trị hợp lệ.
  {
    const { context, page } = await h.open(1440, { workspace: seed(), setup });
    await page.evaluate(() => {
      data.financeReport = { enabled: 'yes', day: 9, hour: 99 };
    });
    await openSettings(page);
    await openGroup(page);
    assert.equal(await page.evaluate(() => document.querySelector('#finance-report-enabled').checked), false, 'cài đặt sai quay về mặc định tắt');
    await page.check('#finance-report-enabled');
    await page.click('#save-finance-settings');
    await page.waitForFunction(() => data.financeReport?.enabled === true && data.financeReport.day === 0 && data.financeReport.hour === 9);
    await context.close();
  }
  console.log('PASS: báo cáo email thu chi — cài đặt bật/tắt + ngày giờ, lưu và đồng bộ, xem trước, nút từ Phân bổ tài nguyên ở 390/820/1440px.');
} finally {
  await h.close();
}
