// v1.21.0: Việc hằng ngày — tổng quan đánh dấu hoàn thành, thanh tiến độ cộng gộp, nút Báo cáo (bên phải nút Thêm việc),
// báo cáo (chỉ số, biểu đồ, đánh giá, đề xuất), biểu mẫu thêm việc gọn và không tràn viền ở 390/820/1440px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const back = (n) => new Date(new Date(day + 'T12:00:00Z').getTime() - n * 864e5).toISOString().slice(0, 10);
const dow = (new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7; // 0 = thứ Hai
const habit = (id, name, color, age, doneAges) => ({ id, name, icon: '🌿', color, createdAt: back(age), done: doneAges.map(back).sort() });
const base = () => ({ schema: 1, projects: [makeProject('p1', 'Farm', '#7950c8', 2)], notes: [] });
const one = () => ({ ...base(), dailyHabits: [habit('a', 'Tưới cây', '#7950c8', 0, [])] });
const strong = () => ({
  ...base(),
  dailyHabits: [
    habit('s1', 'Thiền', '#7950c8', 40, Array.from({ length: 41 }, (_, i) => i)),
    habit('s2', 'Uống nước', '#3a6fb0', 40, Array.from({ length: 41 }, (_, i) => i).filter((i) => i % 10 !== 0)),
  ],
});
const weak = () => ({
  ...base(),
  dailyHabits: [
    habit('w1', 'Thiền', '#7950c8', 40, Array.from({ length: 41 }, (_, i) => i).filter((i) => i % 5 === 1)),
    habit('w2', 'Đi bộ', '#2e7d5b', 40, Array.from({ length: 41 }, (_, i) => i).filter((i) => i >= 34 && i % 2 === 0)),
  ],
});
const h = await startHarness({ seed: one });
const wait = (page, ms = 500) => page.waitForTimeout(ms);
try {
  // 1) Tổng quan: tích hôm nay → đánh dấu hoàn thành; tích ngày khác → thanh cộng gộp đổi theo.
  {
    const { page, server } = await h.open(1440, { workspace: one() });
    await h.show(page, 'habits');
    const s0 = await page.evaluate(() => ({ count: document.querySelector('#hb-summary-count').textContent, pill: !document.querySelector('#hb-done-pill').hidden, pct: document.querySelector('#hb-progress-pct').textContent, bar: document.querySelector('#hb-bar').getAttribute('aria-valuenow') }));
    assert.deepEqual(s0, { count: '0/1', pill: false, pct: '0%', bar: '0' });
    await page.click(`[data-hb-date="${day}"]`);
    await wait(page, 700);
    const s1 = await page.evaluate(() => ({
      count: document.querySelector('#hb-summary-count').textContent,
      pill: !document.querySelector('#hb-done-pill').hidden,
      pillText: document.querySelector('#hb-done-pill').textContent,
      complete: document.querySelector('#hb-summary').classList.contains('is-complete'),
      check: getComputedStyle(document.querySelector('.hb-ring-check')).opacity,
      stroke: getComputedStyle(document.querySelector('.hb-ring-fg')).stroke,
      cheer: document.querySelector('#hb-cheer').textContent,
      pct: document.querySelector('#hb-progress-pct').textContent,
      width: document.querySelector('#hb-bar span').style.width,
      full: document.querySelector('#hb-progress').classList.contains('is-full'),
      note: document.querySelector('#hb-progress-note').textContent,
    }));
    assert.equal(s1.count, '1/1');
    assert.equal(s1.pill, true, 'phải hiện nhãn Hoàn thành hôm nay');
    assert.equal(s1.pillText, 'Hoàn thành hôm nay');
    assert.equal(s1.complete, true);
    assert.equal(s1.check, '1', 'dấu tích giữa vòng phải hiện');
    assert.equal(s1.stroke, 'rgb(46, 125, 91)', 'vòng đổi sang xanh khi hoàn thành');
    assert.match(s1.cheer, /hoàn thành tất cả/);
    // v1.22.0: tiến độ tính theo mục tiêu tuần (mặc định 7 lần/tuần). Một việc mục tiêu 7, tích 1 lần → 1/7.
    assert.equal(s1.full, false, 'chưa đạt mục tiêu tuần thì thanh chưa đầy');
    assert.equal(s1.pct, '14%', 'một việc mục tiêu 7 lần/tuần, tích 1 lần → 14%');
    assert.equal(s1.width, '14%');
    // Bỏ tích: mọi thứ phải quay lại.
    await page.click(`[data-hb-date="${day}"]`);
    await wait(page, 400);
    assert.equal(await page.evaluate(() => document.querySelector('#hb-done-pill').hidden), true, 'bỏ tích thì nhãn ẩn');
    assert.equal(await page.locator('#hb-progress-pct').innerText(), '0%');
    await page.context().close();
  }
  // 1b) Tiến độ cộng gộp nhiều việc: tích một ngày đã qua cũng làm thanh tăng; còn đúng khi máy chủ từ chối lưu.
  if (dow > 0) {
    const ws = { ...base(), dailyHabits: [habit('a', 'A', '#7950c8', 6, []), habit('b', 'B', '#3a6fb0', 6, [])] };
    const { page, server } = await h.open(1440, { workspace: ws });
    server.mode = 'reject400';
    await h.show(page, 'habits');
    // v1.22.0: hai việc, mỗi việc mục tiêu 7 lần/tuần → tổng 14 lượt; tích 1 lần → 1/14.
    await page.click(`[data-hb-row="a"] [data-hb-date="${back(1)}"]`);
    await wait(page, 500);
    const pct = await page.evaluate(() => Number(document.querySelector('#hb-progress-pct').textContent.replace('%', '')));
    assert.equal(pct, Math.round((1 / 14) * 100), 'thanh cộng gộp phải đổi ngay khi tích một ngày đã qua, kể cả khi chưa đồng bộ được');
    assert.equal(await page.locator('#hb-summary-count').innerText(), '0/2', 'hôm nay vẫn 0/2');
    await page.click(`[data-hb-row="a"] [data-hb-date="${day}"]`);
    await page.click(`[data-hb-row="b"] [data-hb-date="${day}"]`);
    await wait(page, 600);
    assert.equal(await page.locator('#hb-summary-count').innerText(), '2/2');
    assert.equal(await page.evaluate(() => !document.querySelector('#hb-done-pill').hidden), true, 'đủ việc hôm nay: vẫn đánh dấu hoàn thành dù máy chủ từ chối');
    await page.context().close();
  }

  // 2) Nút Báo cáo nằm bên phải nút Thêm việc, có icon + animation.
  {
    const { page } = await h.open(1440, { workspace: strong() });
    await h.show(page, 'habits');
    const pos = await page.evaluate(() => {
      const add = document.querySelector('[data-hb-add]').getBoundingClientRect(), rp = document.querySelector('[data-hb-mode=report]').getBoundingClientRect();
      const icon = document.querySelector('[data-hb-mode=report] .hb-rp-icon');
      return { rightOfAdd: rp.left >= add.right - 1, sameRow: Math.abs(rp.top - add.top) < 6, h: rp.height, hasIcon: !!icon && icon.querySelectorAll('rect').length === 3, anim: getComputedStyle(icon.querySelector('rect')).animationName, label: document.querySelector('[data-hb-mode=report]').innerText.trim() };
    });
    assert.ok(pos.rightOfAdd && pos.sameRow, 'Báo cáo phải nằm bên phải nút Thêm việc, cùng hàng');
    assert.ok(pos.h >= 44);
    assert.equal(pos.label, 'Báo cáo');
    assert.ok(pos.hasIcon, 'nút Báo cáo có icon biểu đồ');
    assert.equal(pos.anim, 'hbBarsIn', 'icon có animation');

    await page.click('[data-hb-mode=report]');
    await page.waitForSelector('[data-hb-report]');
    assert.equal(await page.locator('#main h1').innerText(), 'Báo cáo việc hằng ngày');
    assert.equal(await page.locator('[data-hb-mode=week]').innerText(), 'Bảng tuần', 'nút đổi thành Bảng tuần');
    assert.equal(await page.locator('.hb-kpi').count(), 4);
    assert.equal(await page.locator('.hb-trend .hb-line').count(), 1, 'biểu đồ đường');
    assert.equal(await page.locator('.hb-hbars li').count(), 2, 'thanh theo từng việc');
    assert.equal(await page.locator('.hb-wd-col').count(), 7, 'cột theo thứ trong tuần');
    const cells = await page.locator('.hb-heat .hb-cell-h:not(.is-future)').count();
    assert.equal(cells, 12 * 7 + dow + 1, 'bản đồ nhiệt có đủ ô đến hôm nay');
    assert.ok((await page.locator('.hb-assess .hb-level').innerText()).length > 2, 'có xếp loại');
    assert.ok((await page.locator('.hb-assess .hb-tips li').count()) >= 3, 'có ít nhất 3 đề xuất');
    assert.match(await page.locator('.hb-assess-sum').innerText(), /Trong 30 ngày qua bạn hoàn thành \d+%/);
    // Đổi khoảng thời gian.
    await page.click('[data-hb-range="7"]');
    await page.waitForFunction(() => document.querySelector('[data-hb-range="7"]').getAttribute('aria-checked') === 'true');
    assert.match(await page.locator('.hb-assess-sum').innerText(), /Trong 7 ngày qua/);
    await page.click('[data-hb-range="90"]');
    await page.waitForFunction(() => /Trong 90 ngày/.test(document.querySelector('.hb-assess-sum').textContent));
    // Hiệu ứng vẽ đường kết thúc.
    await wait(page, 1500);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.hb-line')).strokeDashoffset), '0px', 'đường biểu đồ vẽ xong');
    // Quay lại bảng tuần.
    await page.click('[data-hb-mode=week]');
    await page.waitForSelector('.hb-list');
    assert.equal(await page.locator('#main h1').innerText(), 'Việc hằng ngày');
    // Rời trang rồi vào lại: mở ở bảng tuần.
    await page.click('[data-hb-mode=report]');
    await page.waitForSelector('[data-hb-report]');
    await h.show(page, 'tasks');
    await h.show(page, 'habits');
    assert.equal(await page.locator('.hb-list').count(), 1, 'vào lại mở ở bảng tuần');
    await page.context().close();
  }

  // 3) Đánh giá theo dữ liệu: người đều đặn khác người yếu.
  {
    const a = await h.open(1440, { workspace: strong() });
    const hi = await a.page.evaluate(() => { const r = window.zenHabitsReport, x = r.analyze(r.stats(30)); return { level: x.level.key, tips: x.tips.join(' | '), find: x.findings.map((f) => f.text).join(' | ') }; });
    assert.ok(['excellent', 'good'].includes(hi.level), 'người đều đặn phải xếp tốt trở lên: ' + hi.level);
    assert.match(hi.tips, /nâng nhẹ thử thách|Mỗi cuối tuần/, 'người đều đặn được gợi ý nâng thử thách');
    await a.context.close();
    const b = await h.open(1440, { workspace: weak() });
    const lo = await b.page.evaluate(() => { const r = window.zenHabitsReport, x = r.analyze(r.stats(30)); return { level: x.level.key, tips: x.tips.join(' | '), find: x.findings.map((f) => f.text).join(' | ') }; });
    assert.ok(['low', 'forming'].includes(lo.level), 'người yếu phải xếp thấp hơn: ' + lo.level);
    assert.match(lo.tips, /Thu nhỏ|Chọn một việc dễ nhất|không bỏ hai ngày/, 'có đề xuất giảm tải');
    assert.match(lo.find, /chưa được tích|thấp nhất/, 'chỉ ra điểm yếu');
    await b.context.close();
    // Chưa có dữ liệu: nhận xét trung thực, không bịa.
    const c = await h.open(1440, { workspace: one() });
    const none = await c.page.evaluate(() => { const r = window.zenHabitsReport, x = r.analyze(r.stats(30)); return x.level.key + '|' + x.summary; });
    assert.match(none, /^empty\|Chưa có lượt tích nào/);
    await h.show(c.page, 'habits');
    await c.page.click('[data-hb-mode=report]');
    await c.page.waitForSelector('[data-hb-report]');
    assert.match(await c.page.locator('.hb-assess-sum').innerText(), /Chưa có lượt tích nào/);
    await c.context.close();
    const d = await h.open(1440, { workspace: base() });
    await h.show(d.page, 'habits');
    await d.page.click('[data-hb-mode=report]');
    await d.page.waitForSelector('.hb-empty');
    assert.match(await d.page.locator('.hb-empty h2').innerText(), /Chưa có dữ liệu để báo cáo/);
    await d.context.close();
  }

  // 4) Bố cục + biểu mẫu không tràn viền ở 390/820/1440px.
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const at = ` (${width}px)`;
    const { page, context } = await h.open(width, { touch, workspace: strong() });
    await h.show(page, 'habits');
    await wait(page, 300);
    const week = await page.evaluate(() => {
      const panel = document.querySelector('.hb-panel').getBoundingClientRect();
      const bad = [...document.querySelectorAll('.hb-panel *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > panel.right + 0.5 || r.left < panel.left - 0.5); }).length;
      const small = [...document.querySelectorAll('.hb-heading-actions .btn, .hb-check, .hb-act, .hb-week-btn')].filter((el) => { const r = el.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5; }).length;
      const a = document.querySelector('[data-hb-add]').getBoundingClientRect(), r = document.querySelector('[data-hb-mode=report]').getBoundingClientRect();
      return { bad, small, overflow: document.documentElement.scrollWidth > innerWidth, sideBySide: Math.abs(a.top - r.top) < 6 && r.left >= a.right - 1 };
    });
    assert.equal(week.bad, 0, 'phần tử tràn khỏi khung' + at);
    assert.equal(week.small, 0, 'nút nhỏ hơn 44px' + at);
    assert.ok(!week.overflow, 'tràn ngang' + at);
    assert.ok(week.sideBySide, 'hai nút Thêm việc / Báo cáo phải cạnh nhau, Báo cáo bên phải' + at);
    await page.click('[data-hb-mode=report]');
    await page.waitForSelector('[data-hb-report]');
    await wait(page, 1400);
    const rep = await page.evaluate(() => {
      const panel = document.querySelector('.hb-panel').getBoundingClientRect();
      const bad = [...document.querySelectorAll('.hb-report *')].filter((el) => { if (el.closest('svg')) return false; const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > panel.right + 0.5 || r.left < panel.left - 0.5); }).length;
      const svg = document.querySelector('.hb-trend').getBoundingClientRect();
      return { bad, overflow: document.documentElement.scrollWidth > innerWidth, svgInside: svg.right <= panel.right + 0.5 && svg.left >= panel.left - 0.5, small: [...document.querySelectorAll('.hb-seg-btn')].filter((b) => b.getBoundingClientRect().height < 39.5).length };
    });
    assert.equal(rep.bad, 0, 'báo cáo có phần tử tràn khung' + at);
    assert.ok(rep.svgInside && !rep.overflow, 'biểu đồ tràn' + at);
    assert.equal(rep.small, 0, 'nút chọn khoảng thời gian quá thấp' + at);
    await page.click('[data-hb-mode=week]');
    await page.click('[data-hb-add]');
    await page.waitForSelector('#editor[open] .hb-form');
    await wait(page, 400);
    const form = await page.evaluate(() => {
      const dlg = document.querySelector('#editor').getBoundingClientRect();
      const bad = [...document.querySelectorAll('#editor-body .hb-form *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > dlg.right - 8 || r.left < dlg.left + 8); }).length;
      const body = document.querySelector('#editor-body');
      return { bad, scrollX: body.scrollWidth > body.clientWidth + 1, preview: !!document.querySelector('#hb-preview .hb-icon') };
    });
    assert.equal(form.bad, 0, 'biểu mẫu thêm việc có phần tử sát/tràn viền hộp thoại' + at);
    assert.ok(!form.scrollX, 'biểu mẫu cuộn ngang' + at);
    assert.ok(form.preview, 'có khung xem trước' + at);
    // Xem trước đổi theo tên, biểu tượng, màu.
    await page.fill('#editor [name=name]', 'Đọc sách');
    await page.click('#editor [data-hb-icon="📖"]');
    await page.check('#editor .hb-swatch:nth-of-type(2) input');
    const prev = await page.evaluate(() => ({ name: document.querySelector('.hb-preview-name').textContent, icon: document.querySelector('#hb-preview .hb-icon').textContent, hb: document.querySelector('#hb-preview').style.getPropertyValue('--hb') }));
    assert.deepEqual(prev, { name: 'Đọc sách', icon: '📖', hb: '#b8467f' }, 'xem trước đổi theo biểu mẫu' + at);
    await context.close();
  }

  // 5) Giảm chuyển động: biểu đồ hiện ngay, không animation.
  {
    const { page, context } = await h.open(1440, { workspace: strong() });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await h.show(page, 'habits');
    await page.click('[data-hb-mode=report]');
    await page.waitForSelector('[data-hb-report]');
    const m = await page.evaluate(() => ({ line: getComputedStyle(document.querySelector('.hb-line')).strokeDashoffset, anim: getComputedStyle(document.querySelector('.hb-hbar-track span')).animationName, icon: getComputedStyle(document.querySelector('[data-hb-mode=week] .hb-rp-icon')).animationName }));
    assert.equal(m.line, '0px');
    assert.equal(m.anim, 'none');
    await context.close();
  }
  console.log('PASS daily habits report');
} finally {
  await h.close();
}
