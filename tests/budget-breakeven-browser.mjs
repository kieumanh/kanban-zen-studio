// v1.70.0: biểu đồ hòa vốn trong Phân bổ tài nguyên — chi và thu hồi cộng dồn trên cùng một trục thời gian, kèm mốc / điểm hòa vốn.
// Kiểm ở 390 (chạm) / 820 / 1440 px: dự án đang lỗ, đã hòa vốn, hòa vốn rồi lại lỗ, hòa vốn đúng mốc, chưa có khoản nào, và toàn bộ dự án.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const vnDate = (back) => new Date(Date.now() - back * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
const vi = (s) => s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
let n = 0;
const e = (type, amount, category, back) => ({ id: 'e' + ++n, type, amount, category, note: '', date: vnDate(back) });
const money = (v) => v.toLocaleString('vi-VN') + ' ₫';
const ledgers = {
  p1: [e('out', 20000000, 'Thiết bị', 40), e('out', 6000000, 'Nhân sự', 3), e('in', 4000000, 'Doanh thu', 3)], // lỗ 22tr
  p2: [e('out', 5000000, 'Dịch vụ', 75), e('in', 15000000, 'Doanh thu', 40)], // hòa vốn từ 40 ngày trước, lãi 10tr
  p3: [e('out', 2000000, 'Thiết bị', 60), e('in', 3000000, 'Doanh thu', 50), e('out', 5000000, 'Nhân sự', 10), e('in', 4000000, 'Doanh thu', 5)], // hòa vốn đúng mốc từ 5 ngày trước
  p4: [e('out', 2000000, 'Thiết bị', 60), e('in', 3000000, 'Doanh thu', 50), e('out', 5000000, 'Nhân sự', 10)], // từng hòa vốn rồi lại lỗ 4tr
  p5: [e('out', 1000000, 'Khác', 2)], // chỉ có chi, dữ liệu mới (trục kéo dài 14 ngày)
  p6: [],
};
const seed = () => ({
  schema: 1,
  projects: [
    makeProject('p1', 'Lỗ', '#2e7d5b', 2, { ledger: ledgers.p1 }),
    makeProject('p2', 'Lãi', '#7950c8', 2, { ledger: ledgers.p2 }),
    makeProject('p3', 'Đúng mốc', '#d65380', 2, { ledger: ledgers.p3 }),
    makeProject('p4', 'Lỗ lại', '#3a6fb0', 2, { ledger: ledgers.p4 }),
    makeProject('p5', 'Mới chi', '#e78c56', 2, { ledger: ledgers.p5 }),
    makeProject('p6', 'Trống', '#8a5a14', 1),
  ],
  notes: [],
});
const sum = (list, type) => list.filter((x) => x.type === type).reduce((s, x) => s + x.amount, 0);
const all = Object.values(ledgers).flat();

// Thông tin đọc từ biểu đồ đang hiện.
const read = (page) =>
  page.evaluate(() => {
    const root = document.querySelector('.bg-be');
    if (!root) return { empty: document.querySelector('.bg-be-panel, .bg-panel .bg-empty-note')?.textContent || '' };
    const plot = root.querySelector('.bg-be-plot').getBoundingClientRect();
    const last = (sel) => {
      const d = root.querySelector(sel).getAttribute('d');
      return { d, y: Number(d.match(/V(-?[\d.]+)(?=[^V]*$)/)[1]) };
    };
    const dot = root.querySelector('.bg-be-dot');
    return {
      alt: root.getAttribute('aria-label'),
      status: root.querySelector('.bg-be-status').textContent,
      tone: root.querySelector('.bg-be-status').className,
      x: [...root.querySelectorAll('.bg-be-x span')].map((s) => s.textContent),
      ylab: [...root.querySelectorAll('.bg-be-ylab')].map((s) => s.textContent),
      out: last('.bg-be-line.is-out'),
      inc: last('.bg-be-line.is-in'),
      goal: !!root.querySelector('.bg-be-goal'),
      fills: root.querySelectorAll('.bg-be-fill').length,
      dot: dot ? { left: parseFloat(dot.style.left), top: parseFloat(dot.style.top) } : null,
      plot: { w: Math.round(plot.width), h: Math.round(plot.height) },
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      key: root.querySelector('.bg-trend-key').textContent,
    };
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
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await h.show(page, 'budget');
    await page.waitForSelector('.bg-page .bg-cards');

    // 1. Toàn bộ dự án: một biểu đồ chung, đang lỗ, có mốc hòa vốn.
    const ov = await read(page);
    const outAll = sum(all, 'out'), incAll = sum(all, 'in');
    assert.equal(ov.status, 'Còn thiếu ' + money(outAll - incAll) + ' để hòa vốn · đã thu hồi ' + Math.round((incAll / outAll) * 100) + '% số đã chi', 'tổng quan: ' + ov.status + at);
    assert.ok(ov.alt.startsWith('Biểu đồ hòa vốn từ ') && ov.alt.includes(money(outAll)) && ov.alt.includes(money(incAll)), 'mô tả cho trình đọc màn hình' + at);
    assert.equal(ov.goal, true, 'đang lỗ: có đường mốc hòa vốn' + at);
    assert.equal(ov.dot, null, 'đang lỗ: chưa có điểm hòa vốn' + at);
    assert.ok(ov.tone.includes('is-loss'));
    assert.ok(ov.key.includes('Chi cộng dồn') && ov.key.includes('Thu hồi cộng dồn') && ov.key.includes('Mốc hòa vốn'), 'chú giải' + at);
    assert.equal(ov.x[1], vi(vnDate(0)), 'trục thời gian kết thúc hôm nay' + at);
    assert.equal(ov.x[0], vi(vnDate(75)), 'trục bắt đầu từ khoản đầu tiên (75 ngày trước)' + at);
    assert.equal(ov.ylab.length, 2, 'có nhãn mốc trên trục dọc' + at);
    assert.ok(ov.inc.y > ov.out.y, 'đường thu hồi thấp hơn đường chi khi đang lỗ' + at);
    assert.ok(ov.plot.h >= 200 && ov.plot.w >= (width === 390 ? 250 : 500), 'biểu đồ đủ lớn: ' + ov.plot.w + 'x' + ov.plot.h + at);
    assert.ok(ov.overflow <= 1, 'không tràn ngang' + at);
    // Thứ tự trên trang: hòa vốn nằm ngay dưới điểm nổi bật, trước dòng tiền theo tháng.
    const order = await page.evaluate(() => [...document.querySelectorAll('.bg-page > .panel h2, .bg-page .bg-grid h2')].map((x) => x.firstChild.textContent.trim()));
    assert.equal(order[0], 'Biểu đồ hòa vốn', 'hòa vốn là biểu đồ đầu tiên: ' + order.join(' | ') + at);

    // 2. Từng dự án.
    const open = async (id) => {
      await page.selectOption('#budget-scope', id);
      await page.waitForFunction((x) => document.querySelector('#budget-scope').value === x, id);
      return read(page);
    };
    const loss = await open('p1');
    assert.equal(loss.status, 'Còn thiếu ' + money(22000000) + ' để hòa vốn · đã thu hồi 15% số đã chi', 'lỗ: ' + loss.status + at);
    assert.equal(loss.goal, true);
    assert.equal(loss.dot, null);
    assert.equal(loss.x[0], vi(vnDate(40)), 'trục bắt đầu từ khoản đầu tiên' + at);

    const gain = await open('p2');
    assert.equal(gain.status, 'Đã hòa vốn từ ' + vi(vnDate(40)) + ' · đang lãi ' + money(10000000), 'lãi: ' + gain.status + at);
    assert.ok(gain.tone.includes('is-gain') && gain.goal === false, 'đã hòa vốn: không còn đường mốc' + at);
    assert.ok(gain.dot && gain.dot.left > 0 && gain.dot.left < 100 && gain.dot.top > 0 && gain.dot.top < 100, 'điểm hòa vốn nằm trong khung: ' + JSON.stringify(gain.dot) + at);
    assert.ok(gain.inc.y < gain.out.y, 'đường thu hồi cao hơn đường chi khi lãi' + at);
    assert.ok(gain.key.includes('Điểm hòa vốn') && !gain.key.includes('Mốc hòa vốn'), 'chú giải khi đã hòa vốn' + at);
    // Điểm hòa vốn nằm đúng ngày: 40 ngày trước trên trục 75 → 35 / 75 ≈ 46,7%.
    assert.ok(Math.abs(gain.dot.left - (35 / 75) * 100) < 1.5, 'điểm hòa vốn đúng vị trí ngày: ' + gain.dot.left + at);

    const exact = await open('p3');
    assert.equal(exact.status, 'Đã hòa vốn từ ' + vi(vnDate(5)) + ' · đúng mốc hòa vốn', 'đúng mốc, tính lại sau lần lỗ giữa chừng: ' + exact.status + at);
    assert.ok(exact.dot, at);

    const relapse = await open('p4');
    assert.equal(relapse.status, 'Còn thiếu ' + money(4000000) + ' để hòa vốn · đã thu hồi 43% số đã chi', 'từng hòa vốn rồi lại lỗ: ' + relapse.status + at);
    assert.equal(relapse.dot, null, 'lại lỗ thì bỏ điểm hòa vốn cũ' + at);

    const fresh = await open('p5');
    assert.equal(fresh.x[0], vi(vnDate(14)), 'dữ liệu mới: trục kéo dài tối thiểu 14 ngày' + at);
    assert.match(fresh.status, /^Còn thiếu 1\.000\.000 ₫ .* đã thu hồi 0%/, fresh.status + at);
    assert.equal(fresh.ylab.length, 2);

    const none = await open('p6');
    assert.match(none.empty, /Chưa có khoản thu chi nào để vẽ biểu đồ hòa vốn/, 'dự án trống: lời nhắn thay biểu đồ' + at);

    // 3. Thêm khoản thu hồi cho dự án lỗ: biểu đồ cập nhật ngay (không phải tải lại).
    await open('p1');
    await page.click('[data-bg-add="in"]');
    await page.waitForSelector('#editor-body .bg-form');
    await page.fill('#editor-body [name=amount]', '23000000');
    await page.fill('#editor-body [name=category]', 'Hoàn vốn');
    await page.click('#editor-form [type=submit]');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    const healed = await read(page);
    assert.equal(healed.status, 'Đã hòa vốn từ ' + vi(vnDate(0)) + ' · đang lãi ' + money(1000000), 'thu hồi 4tr + 23tr = 27tr so với chi 26tr: ' + healed.status + at);
    assert.equal(healed.goal, false);
    assert.ok(healed.dot, 'có điểm hòa vốn ngay sau khi thêm' + at);
    assert.deepEqual(errors, [], 'không có lỗi script' + at);
    await context.close();
  }
  console.log('PASS: biểu đồ hòa vốn — chi và thu hồi cộng dồn trên một biểu đồ, mốc / điểm hòa vốn, các trường hợp lỗ, lãi, đúng mốc, lỗ lại, dữ liệu mới, trống, cập nhật ngay ở 390/820/1440px.');
} finally {
  await h.close();
}
