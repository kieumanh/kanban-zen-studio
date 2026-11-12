// v1.99.0 (Bảng Vàng): thành tựu trong trang Tu vi (dist/giangho-ach.js), tính từ dữ liệu sẵn có, dấu đã báo bằng biên nhận.
//  1. Bảng vàng: đủ 18 danh hiệu theo nhóm; đạt / chưa đạt đúng theo dữ liệu (nhiệm vụ công thành, chuỗi Nhật khóa có ngày nghỉ, đại sự
//     viên mãn, hồi vốn, Tàng thư, cảnh giới, chương Truyện ký đã đọc); chưa đạt có thanh tiến độ và số "23/25".
//  2. Lần đầu: ghi notice:ach-init cùng các danh hiệu đang đạt, không thông báo dồn dập. Đạt thêm danh hiệu thì thông báo một lần và
//     ghi biên nhận; thiết bị khác đã báo thì không báo lại; danh hiệu đạt ở nơi khác mà chưa báo thì báo khi mở.
//  3. Chưa bắt đầu Tu vi: không có bảng, không ghi biên nhận. Dữ liệu Tu vi không thêm khóa. Không tràn ngang, không lỗi trang.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const day = (n) => new Date(Date.parse(NOW) + n * 864e5 + 7 * 3600e3).toISOString().slice(0, 10);
const growth = { v: 1, hero: 'nam', name: 'Lâm Phong', since: day(-60), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [22, 0, 0, 0, 0, 0, 0, 0] }] };
const seed = (withGrowth = true) => () => {
  const a = makeProject('p1', 'Alpha', '#7950c8', 30);
  a.tasks.forEach((t, i) => (t.col = i < 20 ? 'Done' : 'List'));
  const b = makeProject('p2', 'Beta', '#2e7d5b', 3, { ledger: [{ id: 'l1', type: 'out', amount: 1000000, category: 'Thiết bị', note: '', date: day(-20) }, { id: 'l2', type: 'in', amount: 1200000, category: 'Doanh thu', note: '', date: day(-3) }] });
  b.tasks.forEach((t) => (t.col = 'Done'));
  // Chuỗi 7 ngày làm (có 1 ngày nghỉ xen giữa, không làm đứt chuỗi) → đạt "Thất nhật khổ luyện", chưa tới 30.
  const done = [-8, -7, -6, -5, -3, -2, -1].map(day);
  return {
    schema: 1,
    projects: [a, b],
    notes: Array.from({ length: 10 }, (_, i) => ({ id: 'n' + i, type: 'note', title: 'Quyển ' + i, text: '', url: '', group: '', color: '#7950c8' })),
    dailyHabits: [{ id: 'h1', name: 'Đi bộ', icon: '🚶', color: '#2e7d5b', createdAt: day(-30), goal: 7, done, rest: [day(-4)] }],
    ...(withGrowth ? { growth: structuredClone(growth) } : {}),
  };
};
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const panel = (page) =>
  page.evaluate(() => {
    const box = document.querySelector('.gr-ach-panel');
    if (!box) return null;
    const item = (id) => {
      const li = box.querySelector('[data-ach="' + id + '"]');
      return { done: li.classList.contains('is-done'), state: li.querySelector('.gr-ach-state').textContent, now: li.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow') ?? null };
    };
    return {
      count: box.querySelector('.gr-ach-head b').textContent,
      groups: [...box.querySelectorAll('.gr-ach-group')].map((g) => g.textContent),
      items: box.querySelectorAll('.gr-ach').length,
      done: [...box.querySelectorAll('.gr-ach.is-done')].map((li) => li.dataset.ach),
      task25: item('task-25'),
      habit30: item('habit-30'),
      story5: item('story-5'),
    };
  });
const DONE = ['task-1', 'habit-7', 'project-1', 'fund-1', 'note-10'];

const h = await startHarness({ seed: seed() });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 1 + 2. Lần đầu.
    {
      const { context, page, server } = await h.open(width, { touch, now: NOW });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'growth');
      await page.waitForSelector('.gr-ach-panel');
      let p = await panel(page);
      assert.equal(p.items, 18, '18 danh hiệu' + at);
      assert.deepEqual(p.groups, ['Công thành', 'Khổ luyện', 'Đại sự', 'Ngân khố', 'Tàng thư', 'Tu vi', 'Truyện ký'], 'các nhóm' + at);
      assert.deepEqual(p.done, DONE, 'đạt đúng theo dữ liệu' + at);
      assert.equal(p.count, '5/18', 'đếm danh hiệu đã đạt' + at);
      assert.deepEqual(p.task25, { done: false, state: '23/25', now: '23' }, 'tiến độ danh hiệu chưa đạt' + at);
      assert.deepEqual(p.habit30, { done: false, state: '7/30', now: '7' }, 'chuỗi dài nhất 7 ngày (ngày nghỉ không đứt chuỗi)' + at);
      await page.waitForFunction(() => readReceiptKeys.has('notice:ach-init'));
      assert.deepEqual(server.receipts.filter((k) => k.startsWith('notice:ach-')).sort(), ['notice:ach-init', ...DONE.map((id) => 'notice:ach-' + id)].sort(), 'lần đầu ghi init và các danh hiệu đang đạt' + at);
      assert.doesNotMatch((await page.locator('#toast').textContent()) || '', /Bảng vàng/, 'lần đầu không thông báo dồn dập' + at);
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      // Đạt thêm "Tiểu thành" (25 nhiệm vụ).
      await page.evaluate(() => {
        project('p1').tasks.filter((t) => t.col !== 'Done').slice(0, 2).forEach((t) => (t.col = 'Done'));
        render();
      });
      await page.waitForFunction(() => /Bảng vàng · Tiểu thành/.test(document.querySelector('#toast')?.textContent || ''));
      assert.equal(await page.locator('#toast').textContent(), 'Bảng vàng · Tiểu thành: Công thành 25 nhiệm vụ.', 'thông báo danh hiệu mới' + at);
      await page.waitForFunction(() => readReceiptKeys.has('notice:ach-task-25'));
      assert.ok(server.receipts.includes('notice:ach-task-25'), 'ghi biên nhận danh hiệu mới' + at);
      p = await panel(page);
      assert.equal(p.count, '6/18', 'Bảng vàng cập nhật' + at);
      const n = server.receipts.length;
      await page.evaluate(() => render());
      await page.waitForTimeout(300);
      assert.equal(server.receipts.length, n, 'không ghi lại khi không có gì mới' + at);
      assert.deepEqual(Object.keys(server.workspace.growth).sort(), ['hero', 'log', 'name', 'since', 'v'], 'dữ liệu Tu vi không thêm khóa' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 2b. Thiết bị khác: đã báo thì thôi; danh hiệu đạt nơi khác mà chưa báo thì báo khi mở. Truyện ký đọc 5 chương.
    {
      const seen = ['notice:ach-init', 'notice:ach-task-1', 'notice:ach-habit-7', 'notice:ach-project-1', 'notice:ach-fund-1'];
      const stories = [5, 10, 15, 20, 25].map((n) => 'notice:story-' + n);
      const { context, page, server } = await h.open(width, { touch, now: NOW, receiptsSeed: [...seen, ...stories] });
      await h.show(page, 'growth');
      await page.waitForFunction(() => /Bảng vàng/.test(document.querySelector('#toast')?.textContent || ''));
      assert.equal(await page.locator('#toast').textContent(), 'Bảng vàng: đạt 2 danh hiệu mới — Tàng thư sơ khai, Nghe kể giang hồ.', 'báo gộp các danh hiệu chưa báo' + at);
      await page.waitForFunction(() => readReceiptKeys.has('notice:ach-story-5'));
      assert.deepEqual(server.receipts.filter((k) => k.startsWith('notice:ach-')).sort(), ['notice:ach-note-10', 'notice:ach-story-5'], 'chỉ ghi các danh hiệu mới' + at);
      assert.deepEqual((await panel(page)).story5, { done: true, state: 'Đã đạt', now: null }, 'đọc 5 chương Truyện ký' + at);
      await context.close();
    }
    // 3. Chưa bắt đầu Tu vi.
    {
      const { context, page, server } = await h.open(width, { touch, now: NOW, workspace: seed(false)() });
      await h.show(page, 'growth');
      await page.waitForTimeout(600);
      assert.equal(await page.locator('.gr-ach-panel').count(), 0, 'chưa bắt đầu Tu vi thì không có Bảng vàng' + at);
      assert.equal(server.receipts.filter((k) => k.startsWith('notice:ach-')).length, 0, 'không ghi biên nhận' + at);
      await context.close();
    }
  }
  console.log('growth-ach-browser ok');
} finally {
  await h.close();
}
