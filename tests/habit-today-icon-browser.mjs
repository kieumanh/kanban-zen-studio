// v1.23.0: Việc hằng ngày — nhận biết hôm nay rõ hơn, biểu mẫu căn lề đều, bộ chọn biểu tượng có thư viện (copy từ form dự án),
// và việc chưa gắn dự án có nhãn rõ ràng. Kiểm tra ở 390/820/1440px: đầu bảng và chip "Hôm nay" đúng thứ/ngày; các trường
// trong biểu mẫu cùng chiều rộng; tìm và chọn biểu tượng từ thư viện rồi lưu lên máy chủ giả; gợi ý nhanh vẫn chạy;
// nút biểu tượng ≥44px; không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const back = (n) => new Date(new Date(day + 'T12:00:00Z').getTime() - n * 864e5).toISOString().slice(0, 10);
const dow = (new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7; // 0 = thứ Hai
const LONG = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
const dd = day.slice(8, 10) + '/' + day.slice(5, 7);
const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Farm', '#7950c8', 2)],
  notes: [],
  dailyHabits: [
    { id: 'a', name: 'Tưới cây', icon: '🌿', color: '#2e7d5b', createdAt: back(20), done: [], projectId: 'p1' },
    { id: 'b', name: 'Đọc sách', icon: '📖', color: '#3a6fb0', createdAt: back(20), done: [], goal: 3 },
  ],
});
const habitsOnServer = (server) => server.workspace.dailyHabits || [];
async function waitServer(page, server, test, what) {
  for (let i = 0; i < 40 && !test(habitsOnServer(server)); i++) await page.waitForTimeout(250);
  assert.ok(test(habitsOnServer(server)), 'máy chủ chưa nhận: ' + what);
}
const h = await startHarness({ seed });
try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const at = ' (' + width + 'px)';
    const { page, server } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'habits');
    await page.waitForTimeout(400);

    // 1) Hôm nay: đúng một cột được đánh dấu; chip nêu đúng thứ và ngày.
    const today = await page.evaluate(() => ({
      marked: document.querySelectorAll('.hb-head .hb-days .is-today').length,
      headerVisible: !!document.querySelector('.hb-head .hb-days .is-today') && document.querySelector('.hb-head .hb-days .is-today').offsetParent !== null,
      headerText: (document.querySelector('.hb-head .hb-days .is-today')?.textContent || '').trim(),
      chip: document.querySelector('.hb-today-chip')?.textContent.trim() || '',
      cells: document.querySelectorAll('.hb-cell.is-today').length,
    }));
    assert.equal(today.marked, 1, 'đúng một cột hôm nay được đánh dấu' + at);
    assert.equal(today.chip, 'Hôm nay · ' + LONG[dow] + ', ' + dd, 'chip nêu đúng thứ và ngày' + at);
    if (today.headerVisible) assert.ok(today.headerText.includes(dd.slice(0, 2)), 'tiêu đề cột hôm nay có số ngày' + at);
    assert.equal(today.cells, 2, 'mỗi việc đều có ô hôm nay được tô nhẹ' + at);

    // 2) Việc chưa gắn dự án có nhãn mờ; việc có dự án hiện tên dự án.
    const chips = await page.evaluate(() => ({
      empty: document.querySelector('[data-hb-row="b"] .hb-project.is-empty')?.textContent.trim() || '',
      linked: document.querySelector('[data-hb-row="a"] .hb-project')?.textContent.trim() || '',
    }));
    assert.equal(chips.empty, 'Chưa gắn dự án', 'việc chưa gắn dự án có nhãn rõ ràng' + at);
    assert.equal(chips.linked, 'Farm', 'việc có dự án hiện tên dự án' + at);

    // 3) Biểu mẫu: các trường cùng chiều rộng (căn lề đều).
    await page.click('[data-hb-add]');
    await page.waitForSelector('#editor[open] [name=name]');
    await page.waitForTimeout(500);
    const widths = await page.evaluate(() => ['#editor-body input[name=name]', '#editor-body .hb-stepper', '#editor-body .hb-project-field select', '#editor-body .hb-icon-picker summary'].map((sel) => {
      const el = document.querySelector(sel);
      return el ? Math.round(el.getBoundingClientRect().width) : -1;
    }));
    assert.ok(widths.every((w) => w > 0), 'có đủ các trường trong biểu mẫu' + at + ': ' + widths);
    assert.ok(Math.max(...widths) - Math.min(...widths) <= 2, 'các trường có cùng chiều rộng' + at + ': ' + widths);

    // 4) Bộ chọn biểu tượng: mở, tìm trong thư viện, chọn, đóng; gợi ý nhanh vẫn hoạt động.
    await page.click('#hb-icon-picker summary');
    await page.fill('#hb-icon-search', 'book');
    await page.waitForTimeout(200);
    const found = await page.evaluate(() => ({
      count: document.querySelector('#hb-icon-count').textContent,
      has: !!document.querySelector('[data-hb-lib="📖"]'),
      min: Math.min(...[...document.querySelectorAll('.hb-lib-btn')].slice(0, 12).map((b) => Math.min(b.offsetWidth, b.offsetHeight))),
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.ok(found.has, 'tìm “book” phải thấy 📖 trong thư viện' + at);
    assert.match(found.count, /biểu tượng/, 'có số kết quả' + at);
    assert.ok(found.min >= 44, 'nút biểu tượng ≥44px' + at + ': ' + found.min);
    assert.equal(found.overflow, false, 'bộ chọn đang mở không tràn ngang' + at);

    await page.click('[data-hb-lib="📖"]');
    const picked = await page.evaluate(() => ({
      value: document.querySelector('#editor-body [name=icon]').value,
      label: document.querySelector('#hb-icon-preview').textContent,
      open: document.querySelector('#hb-icon-picker').open,
    }));
    assert.equal(picked.value, '📖', 'chọn từ thư viện ghi vào trường biểu tượng' + at);
    assert.equal(picked.label, '📖', 'nhãn tóm tắt hiện biểu tượng đã chọn' + at);
    assert.equal(picked.open, false, 'chọn xong thì đóng bộ chọn' + at);

    await page.click('#hb-icon-picker summary');
    await page.click('[data-hb-icon="💧"]');
    assert.equal(await page.inputValue('#editor-body [name=icon]'), '💧', 'gợi ý nhanh vẫn ghi biểu tượng' + at);

    // 5) Chọn 📖 từ thư viện (bộ chọn vẫn mở sau gợi ý nhanh), rồi lưu lên máy chủ giả.
    await page.click('[data-hb-lib="📖"]');
    await page.fill('#editor [name=name]', 'Viết nhật ký');
    await page.click('#editor-form [type=submit]');
    await waitServer(page, server, (l) => l.some((x) => x.name === 'Viết nhật ký' && x.icon === '📖'), 'biểu tượng 📖 từ thư viện');

    // 6) Biểu mẫu mở không tràn và nằm trong khung nhìn.
    await page.click('[data-hb-add]');
    await page.waitForSelector('#editor[open] [name=name]');
    await page.waitForTimeout(400);
    const layout = await page.evaluate(() => {
      const box = document.querySelector('#editor').getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth, inside: box.left >= -0.5 && box.right <= innerWidth + 0.5 };
    });
    assert.equal(layout.overflow, false, 'biểu mẫu không tràn ngang' + at);
    assert.equal(layout.inside, true, 'biểu mẫu nằm trong khung nhìn' + at);
    await page.context().close();
  }
  console.log('PASS habit today marker, aligned form, library icons');
} finally {
  await h.close();
}
