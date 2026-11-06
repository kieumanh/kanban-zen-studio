// v1.22.0: Việc hằng ngày — liên kết dự án, mục tiêu số lần trong tuần (1–7) và cộng gộp tiến độ theo mục tiêu.
// Kiểm tra: biểu mẫu có bộ chọn mục tiêu (mặc định mỗi ngày) và danh sách dự án; lưu mục tiêu + dự án lên máy chủ giả;
// dòng việc hiện chip dự án; tiến độ tuần cộng gộp và giới hạn ở mục tiêu (5 lượt với mục tiêu 3 chỉ tính 3);
// mọi ngày trong tuần, kể cả T7 và CN, đều tích được; biểu mẫu không tràn ngang và nút ≥44px ở 390/820/1440px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const back = (n) => new Date(new Date(day + 'T12:00:00Z').getTime() - n * 864e5).toISOString().slice(0, 10);
const dow = (new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7; // 0 = thứ Hai
const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Farm', '#7950c8', 2), makeProject('p2', 'Website', '#3a6fb0', 1)],
  notes: [],
  dailyHabits: [{ id: 'a', name: 'Tưới cây', icon: '🌿', color: '#7950c8', createdAt: back(20), done: [] }],
});
// Năm lượt trong tuần hiện tại (Thứ Hai → Thứ Sáu), việc mục tiêu 3 lần/tuần.
const weekDone = [0, 1, 2, 3, 4].map((i) => back(dow - i)).sort();
const capSeed = () => ({
  ...seed(),
  dailyHabits: [
    { id: 'a', name: 'Tưới cây', icon: '🌿', color: '#7950c8', createdAt: back(20), done: [] },
    { id: 'g3', name: 'Đọc sách', icon: '📖', color: '#2e7d5b', createdAt: back(20), done: weekDone, goal: 3 },
  ],
});
const habitsOnServer = (server) => server.workspace.dailyHabits || [];
async function waitServer(page, server, test, what) {
  for (let i = 0; i < 40 && !test(habitsOnServer(server)); i++) await page.waitForTimeout(250);
  assert.ok(test(habitsOnServer(server)), 'máy chủ chưa nhận: ' + what);
}
const h = await startHarness({ seed });
const wait = (page, ms = 500) => page.waitForTimeout(ms);
try {
  // 1) Biểu mẫu mới: mặc định mỗi ngày (7 lần), giảm còn 3 lần mỗi tuần, gắn dự án Website, lưu lên máy chủ.
  {
    const { page, server } = await h.open(1440);
    await h.show(page, 'habits');
    await page.click('[data-hb-add]');
    await page.waitForSelector('#editor[open] [name=name]');
    assert.equal(await page.textContent('#hb-goal-value'), 'Mỗi ngày (7 lần)', 'mặc định là mỗi ngày (7 lần)');
    const options = await page.locator('#editor [name=projectId] option').allTextContents();
    assert.deepEqual(options, ['Không gắn dự án', 'Farm', 'Website'], 'danh sách dự án có đủ dự án đang mở');
    for (let i = 0; i < 4; i++) await page.click('#editor [data-hb-goal-step="-1"]');
    assert.equal(await page.textContent('#hb-goal-value'), '3 lần mỗi tuần', 'bước giảm 7 → 3');
    assert.equal(await page.inputValue('#editor [name=goal]'), '3');
    await page.fill('#editor [name=name]', 'Viết nhật ký');
    await page.selectOption('#editor [name=projectId]', 'p2');
    await page.click('#editor-form [type=submit]');
    await waitServer(page, server, (l) => l.some((x) => x.name === 'Viết nhật ký' && x.goal === 3 && x.projectId === 'p2'), 'việc có mục tiêu 3 và dự án Website');
    await page.waitForFunction(() => document.querySelectorAll('[data-hb-row]').length === 2);
    const chip = await page.locator('[data-hb-row]', { hasText: 'Viết nhật ký' }).locator('.hb-project').innerText();
    assert.equal(chip.trim(), 'Website', 'dòng việc hiện chip dự án liên quan');
    // Mọi ngày trong tuần đều tích được, không ô nào bị khóa (kể cả T7, CN).
    const cells = await page.evaluate(() => [...document.querySelectorAll('[data-hb-row]')].map((r) => ({ total: r.querySelectorAll('[data-hb-toggle]').length, disabled: r.querySelectorAll('[data-hb-toggle][disabled]').length })));
    assert.ok(cells.every((c) => c.total === 7 && c.disabled === 0), 'mọi ngày T2–CN đều tích được: ' + JSON.stringify(cells));
    await page.context().close();
  }

  // 2) Cộng gộp theo mục tiêu: việc mục tiêu 7 chưa tích (0/7) + việc mục tiêu 3 có 5 lượt (chỉ tính 3) → 3/10 = 30%.
  {
    const { page, server } = await h.open(1440, { workspace: capSeed() });
    await h.show(page, 'habits');
    assert.equal(await page.textContent('#hb-progress-pct'), '30%', 'năm lượt với mục tiêu 3 chỉ cộng 3');
    assert.match(await page.textContent('#hb-progress-note'), /đã làm 3\/10/, 'ghi chú hiện 3/10 lượt theo mục tiêu');
    const weekCount = await page.locator('[data-hb-row]', { hasText: 'Đọc sách' }).locator('.hb-week-count').innerText();
    assert.match(weekCount.trim(), /^3\/3/, 'dòng việc hiện 3/3 trong tuần, không phải 5/3');

    // Chỉnh sửa: biểu mẫu nạp đúng mục tiêu hiện tại (3 lần mỗi tuần) và dự án trống.
    await page.click('[data-hb-row="g3"] [data-hb-edit="g3"]');
    await page.waitForSelector('#editor[open] [name=name]');
    assert.equal(await page.textContent('#hb-goal-value'), '3 lần mỗi tuần', 'biểu mẫu sửa nạp đúng mục tiêu');
    assert.equal(await page.inputValue('#editor [name=projectId]'), '', 'việc chưa gắn dự án thì chọn "Không gắn dự án"');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    await page.context().close();
  }

  // 3) Bố cục biểu mẫu ở 390/820/1440px: không tràn ngang, dialog nằm trong khung nhìn, nút tăng/giảm ≥44px.
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const { page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'habits');
    await page.click('[data-hb-add]');
    await page.waitForSelector('#editor[open] [name=name]');
    await wait(page, 600);
    const m = await page.evaluate(() => {
      const box = document.querySelector('#editor').getBoundingClientRect();
      const steps = [...document.querySelectorAll('#editor .hb-step')].map((b) => Math.min(b.offsetWidth, b.offsetHeight));
      return { overflow: document.documentElement.scrollWidth > innerWidth, inside: box.left >= -0.5 && box.right <= innerWidth + 0.5, steps };
    });
    const at = ' (' + width + 'px)';
    assert.equal(m.overflow, false, 'không tràn ngang' + at);
    assert.equal(m.inside, true, 'biểu mẫu nằm trong khung nhìn' + at);
    assert.ok(m.steps.length === 2 && m.steps.every((s) => s >= 44), 'nút tăng/giảm ≥44px' + at + ': ' + m.steps);
    await page.context().close();
  }
  console.log('PASS habit goal and project');
} finally {
  await h.close();
}
