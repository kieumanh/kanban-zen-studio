// v1.36.0: thanh chuyển chế độ (Bảng Kanban / Lịch / Gantt) dính trên đầu khi cuộn trên điện thoại phải có nền đặc,
// không để nội dung của các thẻ việc hằng ngày lộ qua bên dưới; cả chế độ sáng và chế độ tối. Kiểm tra ở 390 (chạm).
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const addD = (n) =>
  new Date(Date.parse(todayStr + 'T12:00:00Z') + n * 864e5)
    .toISOString()
    .slice(0, 10);
const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Gia đình', '#b8467f', 2)],
  notes: [],
  dailyHabits: [
    {
      id: 'a',
      name: 'Lấy củ + Xả + Gừng + Nghệ',
      icon: '🌿',
      color: '#2e7d5b',
      createdAt: addD(-20),
      goal: 7,
      done: [addD(-1)],
      projectId: 'p1',
    },
    { id: 'b', name: 'Làm vườn', icon: '🌿', color: '#3a6fb0', createdAt: addD(-20), goal: 6, done: [] },
    { id: 'c', name: 'Đọc sách', icon: '📖', color: '#b5552a', createdAt: addD(-20), goal: 5, done: [], rest: [todayStr] },
  ],
});
const h = await startHarness({ seed });
try {
  const { page } = await h.open(390, { touch: true, workspace: seed() });
  await h.show(page, 'habits');
  await page.waitForSelector('[data-hb-row="a"]');
  await page.evaluate(() => window.scrollTo(0, 620));
  await page.waitForTimeout(300);

  const check = async (mode) => {
    const r = await page.evaluate(() => {
      const bar = document.querySelector('.mobile-viewbar');
      const bb = bar.getBoundingClientRect();
      const hit = document.elementFromPoint(bb.left + 20, bb.top + bb.height / 2);
      return {
        bg: getComputedStyle(bar).backgroundColor,
        insideBar: !!hit && bar.contains(hit),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    // rgb(r, g, b) là đặc; rgba(r, g, b, a) chỉ đặc khi a = 1.
    const parts = (r.bg.match(/[\d.]+/g) || []).map(Number);
    const alpha = parts.length === 4 ? parts[3] : 1;
    assert.equal(alpha, 1, 'nền thanh dính phải đặc (' + mode + '), đang ' + r.bg);
    assert.equal(r.insideBar, true, 'điểm chạm trên thanh dính thuộc chính thanh (' + mode + ')');
    assert.equal(r.overflow, false, 'không tràn ngang (' + mode + ')');
  };

  await check('chế độ sáng');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(200);
  await check('chế độ tối');
  console.log('PASS thanh chuyển chế độ dính có nền đặc (390 chạm, sáng và tối)');
} finally {
  await h.close();
}
