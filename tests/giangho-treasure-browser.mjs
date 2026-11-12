// v1.90.0 (Tàng Bảo): chữ giang hồ ở Tàng thư (ghi chú), Ngân khố (phân bổ tài nguyên) và Bảo khố (tài nguyên) — phong cách Giang hồ.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px:
//  1. Chữ giao diện đổi đúng bảng thuật ngữ: quyển, chiêu, xuất ngân / thu ngân, hồi vốn, đồ hòa vốn, ngân lưu, cất vào bảo khố…
//  2. Nội dung người dùng giữ nguyên dù trùng chữ giao diện: ghi chú tên "Ghim ghi chú", nhóm "Tất cả", hạng mục "Thiết bị",
//     ghi chú khoản chi "Đã chi", dự án "Chi theo dự án".
//  3. Ứng dụng vẫn chạy đúng: bấm gợi ý hạng mục chép đúng chữ gốc vào ô; ghi một khoản xuất ngân lưu loại "out" và hạng mục gốc;
//     dữ liệu trên máy chủ không chứa chữ giang hồ.
//  4. Không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const vnDate = (back) => new Date(Date.now() - back * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
let n = 0;
const e = (type, amount, category, back, note = '') => ({ id: 'e' + ++n, type, amount, category, note, date: vnDate(back) });
const seed = () => ({
  schema: 1,
  projects: [
    makeProject('p1', 'Chi theo dự án', '#2e7d5b', 2, { ledger: [e('out', 20000000, 'Thiết bị', 40, 'Đã chi'), e('in', 4000000, 'Doanh thu', 3)] }),
    makeProject('p2', 'Beta', '#7950c8', 2, { ledger: [e('in', 15000000, 'Doanh thu', 40)] }),
  ],
  notes: [
    { id: 'n1', type: 'note', title: 'Ghim ghi chú', text: 'Các bước cần làm', url: '', group: 'Tất cả', color: '#7950c8' },
    { id: 'n2', type: 'note', title: 'Ý tưởng', text: 'Ngắn', url: '', group: 'Nhóm A', color: '#e78c56' },
  ],
});
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const has = (txt, list, where) => list.forEach((t) => assert.ok(txt.includes(t), where + ' có “' + t + '”'));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { context, page, server } = await h.open(width, { touch, now: '2026-11-12T09:00:00+07:00', setup: GH });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // Tàng thư.
    await h.show(page, 'notes');
    const cards = await page.evaluate(() => [...document.querySelectorAll('.keep-card')].map((c) => ({ title: c.querySelector('h3')?.textContent.trim(), group: c.querySelector(':scope > small')?.textContent.trim(), body: c.querySelector('.zen-formatted')?.textContent.trim(), pin: c.querySelector('.zen-card-pin')?.getAttribute('title') })));
    const first = cards.find((c) => c.title === 'Ghim ghi chú');
    assert.ok(first, 'tên quyển "Ghim ghi chú" giữ nguyên: ' + JSON.stringify(cards) + at);
    assert.equal(first.body, 'Các bước cần làm', 'nội dung quyển giữ nguyên' + at);
    assert.equal(first.pin, 'Ghim quyển', 'nút ghim đổi chữ' + at);
    assert.equal(await noOverflow(page), true, 'tàng thư không tràn ngang' + at);
    await page.evaluate(() => document.querySelector('[data-note-new]').click());
    await page.waitForSelector('dialog[open] .note-composer');
    await page.evaluate(() => document.querySelectorAll('dialog[open] details').forEach((d) => (d.open = true)));
    const composer = await page.locator('dialog[open]').innerText();
    has(composer, ['CHÉP QUYỂN MỚI', 'Ghim quyển', 'Nhãn quyển', 'Nhắc tại hạ', 'Liên kết với đại sự', '✦ Họa tiết quyển'], 'soạn quyển' + at);
    assert.ok(composer.includes('Chi theo dự án'), 'tên dự án để liên kết giữ nguyên' + at);
    await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
    // Ngân khố.
    await h.show(page, 'budget');
    let main = await page.locator('#main').innerText();
    has(main, ['Ngân lượng theo đại sự', 'Đã xuất ngân', 'Đã thu ngân', 'Hồi vốn', 'Đồ hòa vốn', 'Xuất ngân cộng dồn', 'Ngân lưu theo tháng', 'Xuất ngân theo đại sự', 'Tình trạng từng đại sự'], 'Ngân khố' + at);
    const names = await page.evaluate(() => [...document.querySelectorAll('.bg-project-name')].map((e) => e.textContent.trim()));
    assert.ok(names.includes('Chi theo dự án'), 'tên dự án giữ nguyên: ' + names + at);
    assert.equal(await noOverflow(page), true, 'ngân khố không tràn ngang' + at);
    await page.locator('.bg-project', { hasText: 'Chi theo dự án' }).first().click();
    await page.waitForSelector('.bg-actions');
    main = await page.locator('#main').innerText();
    has(main, ['+ Xuất ngân', '+ Thu ngân', 'Hạng mục xuất ngân lớn nhất', 'Quay lại mọi đại sự'], 'Ngân khố từng đại sự' + at);
    const entries = await page.evaluate(() => [...document.querySelectorAll('.bg-entry-main')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
    assert.ok(entries.some((t) => t.includes('Thiết bị') && t.includes('Đã chi')), 'hạng mục và ghi chú khoản giữ nguyên: ' + entries + at);
    // Ghi khoản xuất ngân bằng gợi ý hạng mục.
    await page.locator('.bg-actions .btn.primary').click();
    await page.waitForSelector('dialog[open] .bg-form');
    const form = await page.locator('dialog[open]').innerText();
    has(form, ['Thêm khoản xuất ngân', 'Xuất ngân · đầu tư', 'Thu ngân · hồi vốn', 'Số ngân lượng (₫)'], 'biểu mẫu khoản' + at);
    await page.fill('dialog[open] .bg-form input[name=amount]', '1500000');
    await page.locator('dialog[open] .bg-cat-chip', { hasText: 'Quảng cáo' }).click();
    assert.equal(await page.inputValue('dialog[open] .bg-form input[name=category]'), 'Quảng cáo', 'gợi ý hạng mục chép đúng chữ gốc' + at);
    await page.locator('dialog[open] .modal-foot .btn.primary').click();
    await page.waitForFunction(() => !document.querySelector('dialog[open] .bg-form'));
    const ledger = await page.evaluate(() => project('p1').ledger.map((x) => [x.type, x.amount, x.category]));
    assert.ok(ledger.some(([t, a, c]) => t === 'out' && a === 1500000 && c === 'Quảng cáo'), 'khoản mới lưu đúng: ' + JSON.stringify(ledger) + at);
    // Bảo khố.
    await h.show(page, 'resources');
    main = await page.locator('#main').innerText();
    has(main, ['Bảo khố', 'Cất vào bảo khố', 'Gồm Phế tích và tệp đang tải · Chỉ các hạ xem được'], 'Bảo khố' + at);
    // Dữ liệu không chứa chữ giang hồ.
    const json = JSON.stringify(server.workspace);
    assert.doesNotMatch(json, /xuất ngân|thu ngân|quyển|đại sự|Bảo khố/i, 'dữ liệu lưu không bị đổi chữ' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }
  console.log('giangho-treasure-browser ok');
} finally {
  await h.close();
}
