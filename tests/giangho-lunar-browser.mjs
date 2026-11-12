// v1.98.0 (Âm Lịch): ngày âm lịch Việt Nam và 24 tiết khí (dist/giangho-lunar.js), chỉ ở phong cách Giang hồ.
//  1. Thuật toán: Tết Bính Ngọ 17/02/2026, Tết Đinh Mùi 06/02/2027, tháng 2 nhuận Quý Mão 2023, tháng 6 nhuận Ất Tỵ 2025, Trung thu
//     25/09/2026; tiết Lập xuân 04/02/2026, Lập đông 07/11/2026, Đông chí 22/12/2026 (giờ Việt Nam).
//  2. Hoàng lịch: lưới tháng có ngày âm dưới ngày dương (mùng 1 ghi cả tháng), tên tiết khí vào ngày giao tiết (điện thoại: chấm son),
//     tiêu đề tháng ghi khoảng ngày âm và năm can chi; dạng danh sách ghi "âm d/m" cạnh ngày.
//  3. Tổng quan: dòng ngày âm, năm can chi, tiết khí và lời khuyên theo tiết; Giang hồ nhẹ thì bỏ lời khuyên.
//  4. Thiền: không có gì; đổi về Thiền thì gỡ sạch. Dữ liệu không đổi, không tràn ngang, không lỗi trang.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px với giờ giả 12/11/2026 (mùng 4 tháng Mười năm Bính Ngọ, tiết Lập đông).
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const seed = () => {
  const p = makeProject('p1', 'Alpha', '#7950c8', 4);
  ['2026-11-07', '2026-11-12', '2026-11-20', '2026-11-25'].forEach((d, i) => Object.assign(p.tasks[i], { col: 'List', due: d, start: '' }));
  return { schema: 1, notes: [], projects: [p] };
};
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { context, page } = await h.open(width, { touch, now: NOW, setup: GH });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const before = await page.evaluate(() => JSON.stringify(data));
    // 1. Thuật toán.
    if (width === 1440) {
      const got = await page.evaluate(() => {
        const L = window.zenLunar, f = (d) => { const l = L.lunar(d); return l.day + '/' + l.month + (l.leap ? 'n' : '') + ' ' + L.yearName(l.year); };
        return {
          tet26: f('2026-02-17'), eve26: f('2026-02-16'), tet27: f('2027-02-06'), leap23: f('2023-03-22'), after23: f('2023-04-20'), leap25: f('2025-07-25'), mid26: f('2026-09-25'), today: f('2026-11-12'),
          terms: ['2026-02-04', '2026-11-07', '2026-12-22', '2026-11-12'].map(L.termStart),
        };
      });
      assert.deepEqual(got, {
        tet26: '1/1 Bính Ngọ', eve26: '29/12 Ất Tỵ', tet27: '1/1 Đinh Mùi', leap23: '1/2n Quý Mão', after23: '1/3 Quý Mão', leap25: '1/6n Ất Tỵ', mid26: '15/8 Bính Ngọ', today: '4/10 Bính Ngọ',
        terms: ['Lập xuân', 'Lập đông', 'Đông chí', null],
      }, 'âm lịch và tiết khí đúng các mốc đã biết');
    }
    // 3. Tổng quan.
    await h.show(page, 'dashboard');
    await page.waitForSelector('.page-heading .gh-lunar-line');
    assert.equal(await page.locator('.gh-lunar-line').textContent(), 'Mùng 4 tháng Mười · năm Bính Ngọ · Tiết Lập đông: trời chuyển lạnh, các hạ giữ ấm mà luyện công.', 'dòng âm lịch ở Tổng quan' + at);
    // 2. Hoàng lịch.
    await h.show(page, 'calendar');
    const mode = await page.evaluate(() => (document.querySelector('.zen-month-agenda') ? 'list' : 'grid'));
    if (mode === 'list') await page.locator('[data-zen-cal-mode=grid]').click();
    await page.waitForSelector('.month-cell .gh-lunar');
    const cal = await page.evaluate(() => {
      const cell = (d) => [...document.querySelectorAll('.month-cell')].find((c) => (c.querySelector('time[datetime]')?.dateTime || c.querySelector('[data-zen-select-day]')?.dataset.zenSelectDay) === d);
      const info = (d) => {
        const c = cell(d), l = c.querySelector('.gh-lunar'), t = l.querySelector('.gh-term');
        const lr = l.getBoundingClientRect(), cr = c.getBoundingClientRect();
        return { text: l.firstChild.textContent + l.childNodes[1].textContent, first: l.classList.contains('is-first'), term: t ? t.textContent : null, termShown: t ? getComputedStyle(t).display !== 'none' : null, dot: l.classList.contains('has-term') ? getComputedStyle(l, '::after').content : null, inside: lr.left >= cr.left - 1 && lr.right <= cr.right + 1 };
      };
      return { head: document.querySelector('.month-controls h2 .gh-lunar-span')?.textContent, d9: info('2026-11-09'), d12: info('2026-11-12'), d7: info('2026-11-07'), cells: document.querySelectorAll('.month-cell .gh-lunar').length, all: document.querySelectorAll('.month-cell').length };
    });
    assert.equal(cal.head, 'Âm lịch 23/9 – 22/10 · năm Bính Ngọ', 'tiêu đề tháng ghi khoảng ngày âm' + at);
    assert.equal(cal.cells, cal.all, 'mọi ô ngày có ngày âm' + at);
    assert.deepEqual([cal.d9.text, cal.d9.first], ['âm lịch 1/10', true], 'mùng 1 ghi cả tháng' + at);
    assert.deepEqual([cal.d12.text, cal.d12.first, cal.d12.term], ['âm lịch 4', false, null], 'ngày thường chỉ ghi ngày âm' + at);
    assert.equal(cal.d7.term, 'Lập đông', 'ngày giao tiết có tên tiết' + at);
    if (width <= 700) assert.deepEqual([cal.d7.termShown, cal.d7.dot], [false, '""'], 'điện thoại: chấm son thay tên tiết' + at);
    else assert.equal(cal.d7.termShown, true, 'tên tiết hiện trong ô' + at);
    assert.ok(cal.d7.inside && cal.d9.inside, 'chữ âm lịch nằm gọn trong ô' + at);
    assert.ok(await noOverflow(page), 'lịch không tràn ngang' + at);
    if (width > 700) {
      await page.locator('[data-zen-cal-mode=list]').click();
      await page.waitForSelector('.zen-ma-date .gh-lunar');
      const list = await page.evaluate(() => [...document.querySelectorAll('.zen-ma-date')].map((h) => h.querySelector('time').dateTime + ' ' + h.querySelector('.gh-lunar').textContent));
      assert.ok(list.includes('2026-11-07 âm 29/9 · tiết Lập đông') && list.includes('2026-11-12 âm 4/10'), 'danh sách ghi ngày âm: ' + JSON.stringify(list) + at);
      await page.locator('[data-zen-cal-mode=grid]').click();
      await page.waitForSelector('.month-cell .gh-lunar');
    }
    // Giang hồ nhẹ: vẫn có âm lịch, Tổng quan bỏ lời khuyên.
    await page.evaluate(() => window.zenTheme.setWords(false));
    await h.show(page, 'dashboard');
    await page.waitForSelector('.gh-lunar-line');
    assert.equal(await page.locator('.gh-lunar-line').textContent(), 'Mùng 4 tháng Mười · năm Bính Ngọ · Tiết Lập đông', 'Giang hồ nhẹ bỏ lời khuyên' + at);
    await page.evaluate(() => window.zenTheme.setWords(true));
    // 4. Về Thiền: gỡ sạch.
    await h.show(page, 'calendar');
    await page.evaluate(() => window.zenTheme.setStyle('zen'));
    await page.waitForFunction(() => !document.querySelector('.gh-lunar, .gh-lunar-span'));
    await h.show(page, 'dashboard');
    assert.equal(await page.locator('.gh-lunar-line').count(), 0, 'Thiền không có dòng âm lịch' + at);
    assert.equal(await page.evaluate(() => JSON.stringify(data)), before, 'dữ liệu không đổi' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }
  console.log('giangho-lunar-browser ok');
} finally {
  await h.close();
}
