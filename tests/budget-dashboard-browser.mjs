// v1.69.0: Phân bổ tài nguyên — nút quay lại khi vào từng dự án (nút trên/dưới, nút Back của trình duyệt, ô chọn dự án, rời trang),
// giữ vị trí cuộn, và dashboard: dòng tiền 6 tháng, điểm nổi bật, sắp xếp, thanh lãi/lỗ, lọc thu/chi. Kiểm ở 390 (chạm) / 820 / 1440 px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const vnDate = (back) => new Date(Date.now() - back * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
let n = 0;
const e = (type, amount, category, back) => ({ id: 'e' + ++n, type, amount, category, note: '', date: vnDate(back) });
const alpha = [e('out', 20000000, 'Thiết bị', 40), e('out', 6000000, 'Nhân sự', 3), e('in', 4000000, 'Doanh thu', 3)];
const beta = [e('out', 5000000, 'Dịch vụ', 75), e('in', 15000000, 'Doanh thu', 40)];
const gamma = [e('out', 8000000, 'Quảng cáo', 250)]; // ngoài cửa sổ 6 tháng
const seed = () => ({
  schema: 1,
  projects: [
    makeProject('p1', 'Alpha lỗ nhiều', '#2e7d5b', 2, { ledger: alpha }),
    makeProject('p2', 'Beta lãi', '#7950c8', 2, { ledger: beta }),
    makeProject('p3', 'Gamma cũ', '#d65380', 2, { ledger: gamma }),
    makeProject('p4', 'Delta trống', '#3a6fb0', 2),
  ],
  notes: [],
});
// Số liệu mong đợi theo tháng, tính độc lập với giao diện.
const months = [];
{
  const now = vnDate(0);
  let y = Number(now.slice(0, 4)), m = Number(now.slice(5, 7));
  for (let i = 5; i >= 0; i--) {
    let mm = m - i, yy = y;
    while (mm < 1) { mm += 12; yy--; }
    months.push({ key: yy + '-' + String(mm).padStart(2, '0'), month: mm, out: 0, inc: 0 });
  }
  for (const x of [...alpha, ...beta, ...gamma]) {
    const r = months.find((k) => k.key === x.date.slice(0, 7));
    if (r) r[x.type === 'out' ? 'out' : 'inc'] += x.amount;
  }
}

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

    // 1. Dòng tiền 6 tháng: đủ 6 cột, tháng hiện tại ở cuối, nhãn lãi/lỗ đúng, khoản quá 6 tháng không có trong biểu đồ.
    const tr = await page.evaluate(() => ({
      labels: [...document.querySelectorAll('.bg-trend-col small')].map((x) => x.textContent),
      nets: [...document.querySelectorAll('.bg-trend-net')].map((x) => x.textContent + '|' + x.className),
      alt: document.querySelector('.bg-trend').getAttribute('aria-label'),
      now: document.querySelector('.bg-trend-col.is-now small')?.textContent,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    assert.deepEqual(tr.labels, months.map((m) => 'T' + m.month), 'sáu tháng, tháng nay ở cuối' + at);
    assert.equal(tr.now, 'T' + months[5].month, 'tháng hiện tại được nhấn' + at);
    months.forEach((m, i) => {
      const empty = !m.out && !m.inc;
      assert.ok(empty ? tr.nets[i].startsWith('·') : /^[−+0]/.test(tr.nets[i]), 'nhãn ròng tháng ' + m.month + ': ' + tr.nets[i] + at);
      if (!empty && m.inc - m.out < 0) assert.ok(tr.nets[i].includes('is-loss'), 'tháng lỗ tô màu lỗ' + at);
    });
    assert.ok(tr.alt.startsWith('Dòng tiền 6 tháng gần đây') && !tr.alt.includes('8.000.000'), 'mô tả cho trình đọc màn hình, không lẫn khoản quá 6 tháng' + at);
    assert.ok(tr.overflow <= 1, 'không tràn ngang' + at);
    const bars = await page.evaluate(() => [...document.querySelectorAll('.bg-trend-col')].map((c) => [...c.querySelectorAll('.bg-bar')].map((b) => Math.round(b.getBoundingClientRect().height))));
    const tallest = Math.max(...bars.flat());
    assert.ok(tallest > 60, 'cột cao nhất đủ cao để nhìn: ' + tallest + at);
    months.forEach((m, i) => {
      if (!m.out) assert.equal(bars[i][0], 0, 'tháng không chi: cột chi rỗng' + at);
      else assert.ok(bars[i][0] > 0, 'tháng có chi: có cột' + at);
    });

    // 2. Điểm nổi bật: dự án lỗ/lãi nhiều nhất, tháng này, dự án chưa có số liệu.
    const facts = await page.evaluate(() => [...document.querySelectorAll('.bg-insights li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()));
    assert.ok(facts.some((f) => f.startsWith('Lỗ nhiều nhất') && f.includes('Alpha lỗ nhiều') && f.includes('22.000.000 ₫')), 'lỗ nhiều nhất: ' + facts.join(' | ') + at);
    assert.ok(facts.some((f) => f.startsWith('Lãi nhiều nhất') && f.includes('Beta lãi') && f.includes('10.000.000 ₫')), 'lãi nhiều nhất' + at);
    assert.ok(facts.some((f) => f.startsWith('Tháng này') && f.includes('6.000.000 ₫') && f.includes('4.000.000 ₫')), 'tháng này' + at);
    assert.ok(facts.some((f) => f.startsWith('Chưa có số liệu') && f.includes('1 dự án')), 'dự án chưa có số liệu' + at);

    // 3. Sắp xếp: mặc định lỗ nhiều nhất; đổi được; dự án chưa có số liệu luôn cuối; nút đủ lớn.
    const order = () => page.evaluate(() => [...document.querySelectorAll('.bg-project .bg-project-name')].map((x) => x.textContent.trim()));
    assert.deepEqual(await order(), ['Alpha lỗ nhiều', 'Gamma cũ', 'Beta lãi', 'Delta trống'], 'mặc định: lỗ nhiều nhất trước' + at);
    await page.click('[data-bg-sort="gain"]');
    assert.deepEqual(await order(), ['Beta lãi', 'Gamma cũ', 'Alpha lỗ nhiều', 'Delta trống'], 'lãi nhiều nhất trước' + at);
    assert.equal(await page.getAttribute('[data-bg-sort="gain"]', 'aria-pressed'), 'true');
    assert.match(await page.locator('.bg-panel .bg-hint').first().textContent(), /lãi nhiều nhất/);
    await page.click('[data-bg-sort="spend"]');
    assert.deepEqual(await order(), ['Alpha lỗ nhiều', 'Gamma cũ', 'Beta lãi', 'Delta trống'], 'chi nhiều nhất trước' + at);
    await page.click('[data-bg-sort="loss"]');
    const seg = await page.evaluate(() => {
      const box = document.querySelector('[data-bg-sort]').closest('.bg-seg').getBoundingClientRect();
      const panel = document.querySelector('[data-bg-sort]').closest('.panel').getBoundingClientRect();
      return { small: [...document.querySelectorAll('[data-bg-sort]')].filter((b) => b.getBoundingClientRect().height < 40).length, inside: box.left >= panel.left - 1 && box.right <= panel.right + 1 };
    });
    assert.deepEqual([seg.small, seg.inside], [0, true], 'nút sắp xếp đủ lớn và nằm trong khung' + at);

    // 4. Thanh lãi/lỗ: dự án lỗ có thanh bên trái, dự án lãi có thanh bên phải; dự án chưa có số liệu không có thanh.
    const nets = await page.evaluate(() =>
      Object.fromEntries([...document.querySelectorAll('.bg-project')].map((b) => [b.querySelector('.bg-project-name').textContent.trim(), b.querySelector('.bg-net') ? [...b.querySelectorAll('.bg-net i')].map((i) => Math.round(i.getBoundingClientRect().width)) : null])),
    );
    assert.ok(nets['Alpha lỗ nhiều'][0] > 0 && nets['Alpha lỗ nhiều'][1] === 0, 'lỗ: thanh bên trái' + at);
    assert.ok(nets['Beta lãi'][1] > 0 && nets['Beta lãi'][0] === 0, 'lãi: thanh bên phải' + at);
    assert.ok(nets['Alpha lỗ nhiều'][0] > nets['Beta lãi'][1], 'thanh tỉ lệ theo mức lãi/lỗ (lỗ 22tr dài hơn lãi 10tr)' + at);
    assert.equal(nets['Delta trống'], null, 'chưa có số liệu: không có thanh' + at);

    // 5. Tâm biểu đồ tròn gọn, không tràn khỏi lỗ giữa.
    const center = await page.evaluate(() => {
      const strong = document.querySelector('.bg-donut-center strong');
      return { text: strong.textContent, fits: strong.scrollWidth <= strong.parentElement.clientWidth + 1 };
    });
    assert.match(center.text, /triệu ₫$/, 'tâm biểu đồ dùng chữ gọn: ' + center.text + at);
    assert.equal(center.fits, true, 'chữ ở tâm biểu đồ vừa lỗ giữa' + at);

    // 6. Vào dự án: có nút quay lại ở đầu (đủ lớn), tên dự án là tiêu đề, thêm đúng một mục lịch sử; giữ vị trí cuộn của tổng quan.
    await page.locator('[data-bg-open="p1"]').scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => Math.round(window.scrollY));
    assert.ok(before > 100, 'trang tổng quan đủ dài để cuộn' + at);
    await page.click('[data-bg-open="p1"]');
    await page.waitForSelector('.bg-actions');
    const inside = await page.evaluate(() => {
      const b = document.querySelector('.bg-nav [data-bg-back]').getBoundingClientRect();
      return { h: Math.round(b.height), w: Math.round(b.width), text: document.querySelector('.bg-nav [data-bg-back]').textContent.trim(), title: document.querySelector('.bg-page h1').textContent, email: !!document.querySelector('[data-bg-email]'), state: history.state?.zenBudget, scrollTop: Math.round(window.scrollY), bottom: !!document.querySelector('.bg-back-bottom'), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.ok(inside.h >= 44 && inside.w >= 44, 'nút quay lại đủ lớn để bấm: ' + inside.h + 'x' + inside.w + at);
    assert.equal(inside.text, 'Tất cả dự án', 'chữ nút quay lại' + at);
    assert.equal(inside.title, 'Alpha lỗ nhiều', 'tiêu đề là tên dự án' + at);
    assert.equal(inside.email, false, 'nút báo cáo email chỉ ở tổng quan' + at);
    assert.equal(inside.state, 1, 'đã thêm một mục lịch sử cho nút Back' + at);
    assert.ok(inside.scrollTop <= 5, 'vào dự án thì cuộn lên đầu' + at);
    assert.equal(inside.bottom, true, 'có nút quay lại ở cuối trang' + at);
    assert.ok(inside.overflow <= 1, 'chi tiết không tràn ngang' + at);

    // 7. Chi tiết: dòng tiền, hạng mục lớn nhất, lọc thu / chi.
    const det = await page.evaluate(() => ({ trend: !!document.querySelector('.bg-trend-cols'), facts: [...document.querySelectorAll('.bg-insights li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()) }));
    assert.equal(det.trend, true, 'chi tiết có dòng tiền' + at);
    assert.ok(det.facts.some((f) => f.startsWith('Hạng mục chi lớn nhất') && f.includes('Thiết bị') && f.includes('77%')), 'hạng mục chi lớn nhất 20/26 = 77%: ' + det.facts.join(' | ') + at);
    const kinds = () => page.evaluate(() => [...document.querySelectorAll('.bg-entry')].map((x) => x.classList.contains('is-out') ? 'out' : 'in'));
    assert.equal((await kinds()).length, 3);
    await page.click('[data-bg-hist="out"]');
    assert.deepEqual(await kinds(), ['out', 'out'], 'lọc Chi' + at);
    await page.click('[data-bg-hist="in"]');
    assert.deepEqual(await kinds(), ['in'], 'lọc Thu' + at);
    assert.match(await page.locator('.bg-panel h2 small').last().textContent(), /1 khoản/, 'đếm theo bộ lọc' + at);
    await page.click('[data-bg-hist="all"]');
    assert.equal((await kinds()).length, 3);
    await page.click('[data-bg-hist="in"]');
    await page.selectOption('#budget-scope', 'p2');
    await page.waitForFunction(() => document.querySelector('.bg-page h1')?.textContent === 'Beta lãi');
    assert.equal(await page.getAttribute('[data-bg-hist="all"]', 'aria-pressed'), 'true', 'đổi dự án thì bộ lọc về Tất cả' + at);
    assert.equal(await page.evaluate(() => history.state?.zenBudget), 1, 'đổi giữa các dự án không thêm mục lịch sử' + at);

    // 8. Nút quay lại ở đầu: về tổng quan, trả vị trí cuộn và tiêu điểm về dự án vừa mở.
    await page.click('.bg-nav [data-bg-back]');
    await page.waitForSelector('.bg-projects');
    const back = await page.evaluate(() => ({ y: Math.round(window.scrollY), state: history.state?.zenBudget ?? null, focus: document.activeElement?.dataset?.bgOpen || null, select: document.querySelector('#budget-scope').value }));
    assert.ok(Math.abs(back.y - before) <= 6, 'trả đúng vị trí cuộn: ' + back.y + ' ≈ ' + before + at);
    assert.equal(back.state, null, 'bỏ mục lịch sử đã thêm' + at);
    assert.equal(back.select, 'all');
    assert.equal(back.focus, 'p2', 'tiêu điểm về dự án vừa rời' + at);

    // 9. Nút Back của trình duyệt / điện thoại cũng về tổng quan, không rời ứng dụng.
    const url = page.url();
    await page.click('[data-bg-open="p1"]');
    await page.waitForSelector('.bg-actions');
    await page.goBack();
    await page.waitForSelector('.bg-projects');
    assert.equal(page.url(), url, 'vẫn ở trong ứng dụng' + at);
    assert.equal(await page.evaluate(() => document.querySelector('#budget-scope').value), 'all', 'Back về tổng quan' + at);

    // 10. Nút ở cuối trang và ô chọn "Tất cả dự án" cùng về tổng quan.
    await page.click('[data-bg-open="p1"]');
    await page.waitForSelector('.bg-actions');
    await page.click('.bg-back-bottom');
    await page.waitForSelector('.bg-projects');
    await page.click('[data-bg-open="p1"]');
    await page.waitForSelector('.bg-actions');
    await page.selectOption('#budget-scope', 'all');
    await page.waitForSelector('.bg-projects');
    assert.equal(await page.evaluate(() => history.state?.zenBudget ?? null), null, 'quay về bằng ô chọn cũng bỏ mục lịch sử' + at);

    // 11. Rời Phân bổ tài nguyên khi đang ở trong dự án: không để lại "bước chết" trong lịch sử.
    await page.click('[data-bg-open="p1"]');
    await page.waitForSelector('.bg-actions');
    await page.evaluate(() => go('dashboard'));
    await page.waitForFunction(() => !document.querySelector('.bg-page') && (history.state?.zenBudget ?? null) === null, null, { timeout: 5000 });
    // Quay lại trang Phân bổ tài nguyên: luôn bắt đầu ở tổng quan, không kẹt trong dự án lần trước.
    await h.show(page, 'budget');
    await page.waitForSelector('.bg-projects');
    assert.equal(await page.evaluate(() => document.querySelector('#budget-scope').value), 'all', 'quay lại mục này thì ở tổng quan' + at);

    // 12. Bấm lại mục "Phân bổ tài nguyên" ở menu khi đang trong dự án: về tổng quan.
    await page.click('[data-bg-open="p2"]');
    await page.waitForSelector('.bg-actions');
    await page.evaluate(() => document.querySelector('.sidebar [data-view="budget"]').click());
    await page.waitForSelector('.bg-projects');
    assert.equal(await page.evaluate(() => [document.querySelector('#budget-scope').value, history.state?.zenBudget ?? null].join()), 'all,', 'menu đưa về tổng quan và bỏ mục lịch sử' + at);
    assert.deepEqual(errors, [], 'không có lỗi script' + at);
    await context.close();
  }

  // 13. Dữ liệu trống: dự án chưa có khoản nào vẫn có nút quay lại, dòng tiền hiện lời nhắn, không lỗi.
  {
    const { context, page } = await h.open(390, { touch: true, workspace: { schema: 1, projects: [makeProject('p9', 'Dự án mới', '#2e7d5b', 1)], notes: [] } });
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await h.show(page, 'budget');
    await page.click('[data-bg-open="p9"]');
    await page.waitForSelector('.bg-actions');
    assert.match(await page.locator('.bg-grid .bg-panel').first().textContent(), /Chưa có khoản thu chi nào trong 6 tháng/);
    await page.click('.bg-nav [data-bg-back]');
    await page.waitForSelector('.bg-projects');
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('PASS: Phân bổ tài nguyên — nút quay lại (trên/dưới/Back/ô chọn/rời trang), giữ vị trí cuộn, dòng tiền 6 tháng, điểm nổi bật, sắp xếp, thanh lãi/lỗ, lọc thu/chi ở 390/820/1440px.');
} finally {
  await h.close();
}
