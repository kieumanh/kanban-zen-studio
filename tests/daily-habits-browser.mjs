// v1.20.0: "Việc hằng ngày" — bảng thói quen theo tuần dưới mục "Tất cả công việc".
// Kiểm tra: vị trí trong menu, thêm/sửa/xóa (xóa có xác nhận, có thể giữ lại), dấu tích có hiệu ứng và đồng bộ màu,
// chuỗi ngày + vòng tiến độ, chuyển tuần, lưu lên máy chủ giả (qua flatten/inflate/validWorkspace thật) và còn nguyên sau khi tải lại,
// không tràn ngang và nút ≥44px ở 390/820/1440px, tôn trọng giảm chuyển động.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const back = (n) => new Date(new Date(day + 'T12:00:00Z').getTime() - n * 864e5).toISOString().slice(0, 10);
const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Farm', '#7950c8', 2)],
  notes: [],
});
const h = await startHarness({ seed });
const settle = (page, ms = 450) => page.waitForTimeout(ms);
const habitsOnServer = (server) => server.workspace.dailyHabits || [];
async function waitServer(page, server, test, what) {
  for (let i = 0; i < 40 && !test(habitsOnServer(server)); i++) await page.waitForTimeout(250);
  assert.ok(test(habitsOnServer(server)), 'máy chủ chưa nhận: ' + what);
}
try {
  // 1) Menu: nằm ngay dưới "Tất cả công việc"; trống thì có gợi ý.
  {
    const { page, server } = await h.open(1440);
    const order = await page.evaluate(() => [...document.querySelectorAll('.sidebar nav [data-view], .sidebar .nav[data-view]')].map((b) => b.dataset.view));
    const i = order.indexOf('tasks');
    assert.equal(order[i + 1], 'habits', 'mục Việc hằng ngày phải nằm ngay dưới Tất cả công việc: ' + order.join(','));
    assert.equal((await page.locator('.sidebar [data-view=habits]').innerText()).trim(), 'Việc hằng ngày');
    await page.click('.sidebar [data-view=habits]');
    await page.waitForFunction(() => view === 'habits' && document.querySelector('#main h1')?.textContent === 'Việc hằng ngày');
    assert.equal(await page.locator('.sidebar [data-view=habits].active').count(), 1, 'mục menu phải sáng khi đang mở');
    assert.equal(await page.locator('.hb-preset').count(), 5, 'trạng thái trống phải có 5 gợi ý');

    // Thêm bằng gợi ý.
    await page.click('[data-hb-preset="Thiền 10 phút"]');
    await page.waitForSelector('.hb-row');
    await waitServer(page, server, (l) => l.length === 1 && l[0].name === 'Thiền 10 phút' && l[0].done.length === 0 && l[0].createdAt === day, 'việc từ gợi ý');

    // 2) Thêm bằng biểu mẫu, chọn màu.
    await page.click('[data-hb-add]');
    await page.waitForSelector('#editor[open] [name=name]');
    await page.fill('#editor [name=name]', 'Uống đủ nước');
    await page.click('#editor [data-hb-icon="💧"]');
    await page.check('#editor .hb-swatch:nth-of-type(5) input');
    await page.click('#editor-form [type=submit]');
    await page.waitForFunction(() => document.querySelectorAll('.hb-row').length === 2);
    const created = await page.evaluate(() => data.dailyHabits.map((x) => ({ n: x.name, i: x.icon, c: x.color })));
    assert.deepEqual(created[1], { n: 'Uống đủ nước', i: '💧', c: '#3a6fb0' }, 'việc mới lưu đúng tên, biểu tượng, màu');
    await waitServer(page, server, (l) => l.length === 2, 'việc thứ hai');

    // 3) Sửa.
    await page.click('[data-hb-edit]:nth-of-type(1) >> nth=1');
    await page.waitForSelector('#editor[open] [name=name]');
    assert.equal(await page.inputValue('#editor [name=name]'), 'Uống đủ nước', 'biểu mẫu sửa nạp đúng tên');
    await page.fill('#editor [name=name]', 'Uống 2 lít nước');
    await page.click('#editor-form [type=submit]');
    await page.waitForFunction(() => document.querySelectorAll('.hb-name')[1]?.textContent === 'Uống 2 lít nước');
    await waitServer(page, server, (l) => l[1]?.name === 'Uống 2 lít nước', 'tên đã sửa');

    // 4) Tích: hiệu ứng, màu, vòng tiến độ, chuỗi.
    const today = page.locator(`[data-hb-row] [data-hb-date="${day}"]`).first();
    assert.equal(await today.getAttribute('aria-checked'), 'false');
    await today.click();
    const popped = await page.evaluate((d) => {
      const b = document.querySelector(`[data-hb-row] [data-hb-date="${d}"]`);
      const s = getComputedStyle(b);
      return { cls: b.classList.contains('is-done'), anim: s.animationName, aria: b.getAttribute('aria-checked') };
    }, day);
    assert.equal(popped.cls, true, 'ô vừa tích phải có is-done');
    assert.equal(popped.aria, 'true');
    assert.equal(popped.anim, 'hbPop', 'ô vừa tích phải chạy hiệu ứng nảy nhẹ');
    await settle(page, 600);
    const done = await page.evaluate((d) => {
      const b = document.querySelector(`[data-hb-row] [data-hb-date="${d}"]`);
      const row = b.closest('.hb-row');
      const path = b.querySelector('path');
      return {
        bg: getComputedStyle(b).backgroundColor,
        hb: getComputedStyle(row).getPropertyValue('--hb').trim(),
        dash: getComputedStyle(path).strokeDashoffset,
        anim: getComputedStyle(b).animationName,
        count: document.querySelector('#hb-summary-count').textContent,
        streak: row.querySelector('.hb-streak').textContent.trim(),
        week: row.querySelector('.hb-week-count').textContent.trim(),
        ring: document.querySelector('.hb-ring-fg').getAttribute('stroke-dashoffset'),
      };
    }, day);
    assert.equal(done.bg, 'rgb(121, 80, 200)', 'màu nền dấu tích đồng bộ màu của việc (#7950c8)');
    assert.equal(done.hb.toLowerCase(), '#7950c8');
    assert.equal(done.dash, '0px', 'nét tích phải vẽ xong');
    assert.equal(done.anim, 'none', 'hiệu ứng nảy phải tự kết thúc');
    assert.equal(done.count, '1/2');
    assert.match(done.streak, /Chuỗi 1 ngày/);
    assert.match(done.week, /^1\/7/);
    assert.ok(Math.abs(Number(done.ring) - Math.PI * 22) < 0.5, 'vòng tiến độ phải đầy một nửa: ' + done.ring);
    // Ngày quá khứ: tích được; ngày tương lai: không tích được.
    const ws = await page.evaluate(() => document.querySelector('#hb-week-label').textContent);
    const future = page.locator('[data-hb-row] [data-hb-toggle][disabled]');
    const futureCount = await future.count();
    const dow = (new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7;
    assert.equal(futureCount, (6 - dow) * 2, 'các ô sau hôm nay phải bị khóa (' + ws + ')');
    if (dow > 0) {
      await page.click(`[data-hb-row] [data-hb-date="${back(1)}"] >> nth=0`);
      await page.waitForFunction(() => document.querySelector('.hb-row .hb-streak').textContent.includes('2 ngày'));
    }
    await waitServer(page, server, (l) => l[0].done.includes(day), 'dấu tích hôm nay');

    // Tích lần nữa để hoàn thành cả hai: lời chúc + vòng đổi màu.
    await page.click(`.hb-row:nth-child(2) [data-hb-date="${day}"]`);
    await page.waitForFunction(() => document.querySelector('#hb-summary').classList.contains('is-complete'));
    assert.match(await page.locator('#hb-cheer').innerText(), /hoàn thành tất cả/);
    // Bỏ tích.
    await page.click(`.hb-row:nth-child(2) [data-hb-date="${day}"]`);
    await page.waitForFunction(() => !document.querySelector('#hb-summary').classList.contains('is-complete'));
    assert.equal(await page.locator('#hb-cheer').innerText(), '', 'lời chúc phải biến mất khi bỏ tích');
    await waitServer(page, server, (l) => !l[1].done.includes(day), 'bỏ tích');

    // 5) Chuyển tuần.
    const label = await page.locator('#hb-week-label').innerText();
    await page.click('[data-hb-week="-1"]');
    await page.waitForFunction((l) => document.querySelector('#hb-week-label').textContent !== l, label);
    assert.equal(await page.locator('[data-hb-toggle][disabled]').count(), 0, 'tuần trước không có ô bị khóa');
    assert.equal(await page.locator('.hb-now').isDisabled(), false);
    await page.click('[data-hb-week="0"]');
    await page.waitForFunction((l) => document.querySelector('#hb-week-label').textContent === l, label);

    // 6) Tải lại: dữ liệu còn nguyên (qua máy chủ giả).
    await page.reload();
    await page.waitForFunction(() => typeof _WF !== 'undefined' && document.documentElement.dataset.zenReady === '1');
    const after = await page.evaluate(() => data.dailyHabits.map((x) => ({ n: x.name, d: x.done.length })));
    assert.deepEqual(after[0], { n: 'Thiền 10 phút', d: dow > 0 ? 2 : 1 }, 'dữ liệu tích còn sau khi tải lại');

    // 7) Xóa: "Giữ lại" thì còn, "Xóa" thì mất; có xác nhận.
    await h.show(page, 'habits');
    await page.click('.hb-row:nth-child(2) [data-hb-delete]');
    await page.waitForSelector('#editor[open] .hb-confirm');
    assert.match(await page.locator('.hb-confirm p').innerText(), /Uống 2 lít nước/);
    await page.click('[data-hb-cancel]');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    assert.equal(await page.locator('.hb-row').count(), 2, 'Giữ lại thì không mất việc');
    await page.click('.hb-row:nth-child(2) [data-hb-delete]');
    await page.click('[data-hb-confirm-delete]');
    await page.waitForFunction(() => document.querySelectorAll('.hb-row').length === 1);
    await waitServer(page, server, (l) => l.length === 1 && l[0].name === 'Thiền 10 phút', 'xóa việc');
    // Bản ghi con "habit:" biến mất khỏi máy chủ nhưng việc còn lại giữ nguyên lịch sử tích.
    assert.ok(habitsOnServer(server)[0].done.includes(day), 'xóa một việc không làm mất lịch sử việc khác');
    await page.context().close();
  }

  // 8) Bố cục + cỡ nút ở 390/820/1440px, và giảm chuyển động.
  const withHabits = () => ({
    ...seed(),
    dailyHabits: [
      { id: 'a1', name: 'Một việc có tên khá dài để kiểm tra việc xuống dòng gọn gàng', icon: '🌿', color: '#2e7d5b', createdAt: back(5), done: [back(0), back(1)] },
      { id: 'a2', name: 'Đi bộ', icon: '🚶', color: '#b8467f', createdAt: back(5), done: [] },
    ],
  });
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const at = ` (${width}px)`;
    const { page, context } = await h.open(width, { touch, workspace: withHabits() });
    await h.show(page, 'habits');
    await settle(page, 300);
    const m = await page.evaluate(() => {
      const small = [...document.querySelectorAll('.hb-check, .hb-act, .hb-week-btn, .hb-now')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width < 43.5 || r.height < 43.5;
      }).length;
      const rowBox = document.querySelector('.hb-row').getBoundingClientRect();
      const panel = document.querySelector('.hb-panel').getBoundingClientRect();
      return { small, overflow: document.documentElement.scrollWidth > innerWidth, rowInside: rowBox.left >= panel.left && rowBox.right <= panel.right + 0.5, rows: document.querySelectorAll('.hb-row').length };
    });
    assert.equal(m.rows, 2, 'đủ hai hàng' + at);
    assert.equal(m.small, 0, 'có nút nhỏ hơn 44px' + at);
    assert.ok(!m.overflow, 'tràn ngang' + at);
    assert.ok(m.rowInside, 'hàng tràn khỏi khung' + at);
    if (width === 390) {
      await page.click('#menu');
      await settle(page, 500);
      assert.ok(await page.locator('.sidebar.open [data-view=habits]').isVisible(), 'mục menu hiện trong ngăn kéo điện thoại');
      await page.click('.sidebar.open [data-view=tasks]');
      await page.waitForFunction(() => view === 'tasks');
      await page.click('#menu');
      await settle(page, 500);
      await page.click('.sidebar.open [data-view=habits]');
      await page.waitForFunction(() => view === 'habits');
      assert.ok(!(await page.locator('.sidebar.open').count()), 'menu đóng sau khi chọn');
    }
    if (width === 1440) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.click(`.hb-row:nth-child(2) [data-hb-date="${day}"]`);
      const anim = await page.evaluate((d) => getComputedStyle(document.querySelector(`.hb-row:nth-child(2) [data-hb-date="${d}"]`)).animationName, day);
      assert.equal(anim, 'none', 'giảm chuyển động: không chạy hiệu ứng nảy');
    }
    await context.close();
  }

  // 9) Dữ liệu sai không được ghi lên máy chủ.
  {
    const { page } = await h.open(1440, { workspace: withHabits() });
    const ok = await page.evaluate(() => {
      const bad = structuredClone(data);
      bad.dailyHabits[0].color = 'đỏ';
      const dup = structuredClone(data);
      dup.dailyHabits[0].done = ['2026-01-01', '2026-01-01'];
      return [valid(structuredClone(data)), valid(bad), valid(dup)];
    });
    assert.deepEqual(ok, [true, false, false], 'kiểm tra hợp lệ phải từ chối màu sai và ngày trùng');
  }
  console.log('PASS daily habits');
} finally {
  await h.close();
}
