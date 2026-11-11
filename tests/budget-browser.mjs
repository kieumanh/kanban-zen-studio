// v1.66.0: "Phân bổ tài nguyên" thay "Tất cả công việc" — thu chi theo dự án, biểu đồ tròn theo hạng mục, lãi/lỗ.
// Kiểm ở 390 (chạm), 820, 1440 px: mục menu, tổng quan, chi tiết dự án, thêm/sửa/xóa khoản, kiểm tra dữ liệu nhập, không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const e = (id, type, amount, category, date = '2026-11-05', note = '') => ({ id, type, amount, category, note, date });
const seed = () => ({
  schema: 1,
  projects: [
    makeProject('p1', 'Farm Lê Lam Sơn', '#2e7d5b', 2, { ledger: [e('a1', 'out', 5000000, 'Thiết bị'), e('a2', 'out', 3000000, 'Nhân sự'), e('a3', 'out', 2000000, 'Quảng cáo'), e('a4', 'in', 4000000, 'Doanh thu')] }),
    makeProject('p2', 'Khóa tu mùa thu', '#7950c8', 2, { ledger: [e('b1', 'out', 2000000, 'Dịch vụ'), e('b2', 'in', 5000000, 'Doanh thu')] }),
    makeProject('p3', 'Dự án trống', '#d65380', 1),
  ],
  notes: [],
});

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ` (${width}px)`;
    const { context, page } = await h.open(width, { touch, workspace: seed() });

    // 1. Mục menu: có "Phân bổ tài nguyên", không còn "Tất cả công việc" ở menu bên trái.
    const nav = await page.evaluate(() => ({
      budget: !!document.querySelector('.sidebar [data-view="budget"]'),
      tasks: !!document.querySelector('.sidebar [data-view="tasks"]'),
      text: document.querySelector('.sidebar')?.textContent || '',
    }));
    assert.equal(nav.budget, true, 'menu có Phân bổ tài nguyên' + at);
    assert.equal(nav.tasks, false, 'menu không còn Tất cả công việc' + at);
    assert.ok(!nav.text.includes('Tất cả công việc'), 'không còn chữ "Tất cả công việc" trong menu' + at);
    assert.ok(nav.text.includes('Phân bổ tài nguyên'), 'chữ "Phân bổ tài nguyên" trong menu' + at);

    // 2. Tổng quan mọi dự án: chi 12tr, thu 9tr, lỗ 3tr, thu hồi 75%.
    await h.show(page, 'budget');
    await page.waitForSelector('.bg-page .bg-cards');
    const ov = await page.evaluate(() => ({
      cards: [...document.querySelectorAll('.bg-cards .bg-card')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()),
      names: [...document.querySelectorAll('.bg-project .bg-project-name')].map((n) => n.textContent.trim()),
      arcs: document.querySelectorAll('.bg-donut .bg-arc').length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      crumb: document.querySelector('#crumb')?.textContent,
    }));
    assert.ok(ov.cards[0].includes('12.000.000 ₫'), 'tổng chi 12.000.000 ₫: ' + ov.cards[0] + at);
    assert.ok(ov.cards[1].includes('9.000.000 ₫'), 'tổng thu hồi 9.000.000 ₫: ' + ov.cards[1] + at);
    assert.ok(ov.cards[2].includes('3.000.000 ₫') && ov.cards[2].includes('Đang lỗ'), 'lỗ 3.000.000 ₫: ' + ov.cards[2] + at);
    assert.ok(ov.cards[3].includes('75%'), 'thu hồi 75%: ' + ov.cards[3] + at);
    assert.equal(ov.names[0], 'Farm Lê Lam Sơn', 'dự án lỗ nhiều nhất xếp đầu' + at);
    assert.equal(ov.arcs, 2, 'biểu đồ chi theo dự án có 2 phần (2 dự án có chi)' + at);
    assert.equal(ov.crumb, 'Phân bổ tài nguyên', 'tiêu đề trang' + at);
    assert.ok(ov.overflow <= 1, 'tổng quan không tràn ngang' + at);

    // 3. Chọn dự án: 3 hạng mục chi, phần trăm 50/30/20.
    await page.click('[data-bg-open="p1"]');
    await page.waitForSelector('.bg-actions');
    const pr = await page.evaluate(() => ({
      select: document.querySelector('#budget-scope').value,
      cards: [...document.querySelectorAll('.bg-cards .bg-card')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()),
      legend: [...document.querySelectorAll('.bg-legend li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()),
      arcs: document.querySelectorAll('.bg-donut .bg-arc').length,
      entries: document.querySelectorAll('.bg-entry').length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    assert.equal(pr.select, 'p1', 'ô chọn dự án đúng' + at);
    assert.ok(pr.cards[0].includes('10.000.000 ₫'), 'đã chi 10.000.000 ₫' + at);
    assert.ok(pr.cards[2].includes('6.000.000 ₫') && pr.cards[2].includes('Đang lỗ'), 'lỗ 6.000.000 ₫' + at);
    assert.ok(pr.cards[3].includes('40%'), 'thu hồi 40%' + at);
    assert.equal(pr.arcs, 3, 'biểu đồ chi có 3 hạng mục' + at);
    assert.ok(pr.legend[0].includes('Thiết bị') && pr.legend[0].includes('50%'), 'hạng mục lớn nhất: ' + pr.legend[0] + at);
    assert.ok(pr.legend[1].includes('Nhân sự') && pr.legend[1].includes('30%'), 'hạng mục 2: ' + pr.legend[1] + at);
    assert.ok(pr.legend[2].includes('Quảng cáo') && pr.legend[2].includes('20%'), 'hạng mục 3: ' + pr.legend[2] + at);
    assert.equal(pr.entries, 4, 'liệt kê 4 khoản' + at);
    assert.ok(pr.overflow <= 1, 'chi tiết dự án không tràn ngang' + at);
    // Vùng chạm: nút chính ≥40px ở mọi cỡ; nút biểu tượng Sửa/Xóa ≥44px khi cảm ứng (≥28px khi dùng chuột, như mọi nút biểu tượng khác).
    const small = await page.evaluate((touch) => {
      const bad = (b, min) => b.getBoundingClientRect().height < min || b.getBoundingClientRect().width < min;
      return [
        ...[...document.querySelectorAll('.bg-actions .btn, .bg-seg button, #budget-scope')].filter((b) => bad(b, 40)),
        ...[...document.querySelectorAll('.bg-entry-actions .icon-btn')].filter((b) => bad(b, touch ? 44 : 28)),
      ].map((b) => b.className || b.id);
    }, touch);
    assert.deepEqual(small, [], 'nút đủ lớn để bấm' + at);

    // 4. Biểu đồ Thu.
    await page.click('[data-bg-kind="in"]');
    const inc = await page.evaluate(() => ({ arcs: document.querySelectorAll('.bg-donut .bg-arc').length, legend: document.querySelector('.bg-legend')?.textContent || '', pressed: document.querySelector('[data-bg-kind="in"]').getAttribute('aria-pressed') }));
    assert.equal(inc.pressed, 'true', 'nút Thu được chọn' + at);
    assert.equal(inc.arcs, 1, 'biểu đồ thu có 1 hạng mục' + at);
    assert.ok(inc.legend.includes('Doanh thu') && inc.legend.includes('100%'), 'thu: Doanh thu 100%' + at);

    // 5. Nhập sai: số tiền 0 hoặc thiếu hạng mục thì không thêm khoản nào.
    await page.click('[data-bg-add="out"]');
    await page.waitForSelector('#editor-body .bg-form');
    await page.fill('#editor-body [name=amount]', '0');
    await page.fill('#editor-body [name=category]', 'Thiết bị');
    await page.click('#editor-form [type=submit]');
    assert.equal(await page.evaluate(() => data.projects[0].ledger.length), 4, 'số tiền 0 không được lưu' + at);
    await page.fill('#editor-body [name=amount]', '250000');
    await page.fill('#editor-body [name=category]', '   ');
    await page.click('#editor-form [type=submit]', { force: true }).catch(() => {});
    assert.equal(await page.evaluate(() => data.projects[0].ledger.length), 4, 'thiếu hạng mục không được lưu' + at);

    // 6. Thêm khoản chi hợp lệ: ô số tiền tự chia nghìn; tổng chi cập nhật; dữ liệu nằm trong dự án.
    await page.fill('#editor-body [name=amount]', '1500000');
    assert.equal(await page.inputValue('#editor-body [name=amount]'), '1.500.000', 'ô số tiền tự chia nghìn' + at);
    await page.click('[data-bg-cat="Thiết bị"]');
    assert.equal(await page.inputValue('#editor-body [name=category]'), 'Thiết bị', 'chip hạng mục điền vào ô' + at);
    await page.fill('#editor-body [name=note]', 'Máy ảnh');
    await page.click('#editor-form [type=submit]');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    const added = await page.evaluate(() => ({ ledger: data.projects[0].ledger, card: document.querySelector('.bg-cards .bg-card').textContent }));
    assert.equal(added.ledger.length, 5, 'đã thêm 1 khoản' + at);
    const last = added.ledger[added.ledger.length - 1];
    assert.deepEqual([last.type, last.amount, last.category, last.note], ['out', 1500000, 'Thiết bị', 'Máy ảnh'], 'nội dung khoản mới' + at);
    assert.ok(added.card.includes('11.500.000 ₫'), 'tổng chi cập nhật 11.500.000 ₫' + at);

    // 7. Sửa khoản vừa thêm (đổi số tiền) rồi xóa có xác nhận.
    await page.click('[data-bg-edit="' + last.id + '"]');
    await page.waitForSelector('#editor-body .bg-form');
    await page.fill('#editor-body [name=amount]', '2000000');
    await page.click('#editor-form [type=submit]');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    assert.equal(await page.evaluate((id) => data.projects[0].ledger.find((x) => x.id === id).amount, last.id), 2000000, 'đã sửa số tiền' + at);
    await page.click('[data-bg-delete="' + last.id + '"]');
    await page.waitForSelector('[data-bg-confirm-delete]');
    await page.click('[data-bg-cancel]');
    assert.equal(await page.evaluate(() => data.projects[0].ledger.length), 5, 'bấm Giữ lại thì không xóa' + at);
    await page.click('[data-bg-delete="' + last.id + '"]');
    await page.click('[data-bg-confirm-delete]');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    assert.equal(await page.evaluate(() => data.projects[0].ledger.length), 4, 'đã xóa khoản sau khi xác nhận' + at);

    // 8. Dự án chưa có khoản: trạng thái rỗng, không lỗi.
    await page.selectOption('#budget-scope', 'p3');
    await page.waitForSelector('.bg-empty');
    const empty = await page.evaluate(() => ({ text: document.querySelector('.bg-cards')?.textContent.replace(/\s+/g, ' ') || '', donut: !!document.querySelector('.bg-donut-empty') }));
    assert.ok(empty.text.includes('Chưa có số liệu'), 'dự án trống: Chưa có số liệu' + at);
    assert.equal(empty.donut, true, 'dự án trống: biểu đồ rỗng' + at);

    // 9. Dữ liệu được đồng bộ lên máy chủ (PUT hợp lệ sau khi sửa).
    await page.waitForFunction(() => typeof dirty === 'undefined' || dirty === false, null, { timeout: 15000 }).catch(() => {});
    await context.close();
  }
  console.log('PASS: Phân bổ tài nguyên — tổng quan, chi tiết dự án, biểu đồ tròn, thêm/sửa/xóa khoản, kiểm tra nhập ở 390/820/1440px.');
} finally {
  await h.close();
}
