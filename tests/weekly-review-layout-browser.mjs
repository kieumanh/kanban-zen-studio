// v2.88.0 (Kiểm Điểm Gọn): hộp Kiểm điểm tuần dễ quét hơn, không đổi dữ liệu hay chữ.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px × Thiền, Giang hồ:
// 1. mỗi việc trong danh sách: tên nằm trên, dòng thông tin nằm dưới (không còn lúc cùng hàng lúc xuống dòng);
// 2. số đếm nằm bên phải tiêu đề mục (nhãn);
// 3. ô chọn việc: tên và dòng thông tin là hai dòng riêng, không còn dấu “·” lẻ trên một dòng;
// 4. nút Lưu / Đóng luôn thấy được khi cuộn tới đáy hộp;
// 5. từ 820 px: Đã xong | Chưa xong nằm cạnh nhau, ô chọn việc hai cột; dưới 820 px xếp dọc; không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

// Thứ Sáu 13/11/2026, 10:00 giờ Việt Nam: hộp mở tuần 09/11 – 15/11 (tuần vừa qua mặc định chỉ vào thứ Hai).
const FRI = '2026-11-13T03:00:00Z';
const seed = () => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 16);
  const set = (i, o) => Object.assign(p1.tasks[i], o);
  set(0, { title: 'Gửi báo giá cho đối tác rất dài để xem cách xuống dòng', col: 'Done', due: '2026-11-10', doneAt: '2026-11-10' });
  set(1, { title: 'Dọn kho', col: 'Done', due: '2026-11-03', doneAt: '2026-11-11' });
  set(4, { title: 'Chốt thực đơn', col: 'List', due: '2026-11-11' });
  set(5, { title: 'Viết bài blog', col: 'Doing', due: '2026-11-18' });
  set(6, { title: 'Thiết kế sơ đồ farm', col: 'List', due: '2026-11-25' });
  return { schema: 1, projects: [p1], notes: [], dailyHabits: [] };
};
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const h = await startHarness();
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const giang of [false, true]) {
      const at = ' (' + width + 'px, ' + (giang ? 'Giang hồ' : 'Thiền') + ')';
      const setup = giang ? ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho')) : undefined;
      const { context, page } = await h.open(width, { touch, workspace: seed(), setup, now: FRI });
      await h.show(page, 'dashboard');
      await page.keyboard.press('Control+k');
      await page.waitForSelector('.studio-palette[open]');
      await page.keyboard.type(giang ? 'kiểm điểm' : 'ôn tuần');
      await page.waitForFunction(() => [...document.querySelectorAll('.studio-palette [role=option] span')].some((s) => /^(Ôn tuần|Kiểm điểm tuần)$/.test(s.textContent)));
      await page.keyboard.press('Enter');
      await page.waitForSelector('dialog.zen-review[open]');
      await page.waitForTimeout(300);

      const m = await page.evaluate(() => {
        const d = document.querySelector('dialog.zen-review');
        const r = d.getBoundingClientRect();
        const box = (el) => el.getBoundingClientRect();
        const sec = (k) => d.querySelector('[data-review-sec=' + k + ']');
        const lis = [...d.querySelectorAll('.zen-review-list li')];
        const stacked = lis.every((li) => {
          const s = li.querySelector('strong');
          const sm = li.querySelector('small');
          return !sm || box(sm).top >= box(s).bottom - 1;
        });
        const pills = [...d.querySelectorAll('.zen-review-sec h3 small')].map((s) => {
          const h3 = s.parentElement;
          return { right: Math.abs(box(s).right - box(h3).right) <= 2, h: Math.round(box(s).height) };
        });
        const picks = [...d.querySelectorAll('.zen-review-pick > span')];
        const pickShape = picks.every((sp) => [...sp.children].every((c) => c.tagName === 'STRONG' || c.tagName === 'SMALL'));
        const dotAlone = [...d.querySelectorAll('.zen-review-pick small')].some((sm) => sm.textContent.trim() === '·');
        const done = sec('done') && box(sec('done'));
        const open = sec('open') && box(sec('open'));
        const sideBySide = !!(done && open && Math.abs(done.top - open.top) < 2 && open.left > done.left + 10);
        const pickCols = picks.length >= 2 ? Math.round(box(picks[0].parentElement.parentElement).width) : 0;
        const twoColPicks = d.querySelectorAll('.zen-review-pick').length >= 2 && box(d.querySelectorAll('.zen-review-pick')[1]).left > box(d.querySelectorAll('.zen-review-pick')[0]).right - 2;
        return { dlgW: Math.round(r.width), stacked, pills, pickShape, dotAlone, sideBySide, twoColPicks, pickCols, hasDone: !!done, hasOpen: !!open };
      });

      assert.equal(m.stacked, true, 'tên việc nằm trên, dòng thông tin nằm dưới' + at);
      assert.ok(m.pills.length >= 2, 'có nhãn số đếm ở Đã xong và Chưa xong' + at);
      assert.ok(m.pills.every((p) => p.right && p.h <= 26), 'nhãn số đếm nằm bên phải tiêu đề, cao gọn' + at);
      assert.equal(m.pickShape, true, 'ô chọn việc chỉ có tên và dòng thông tin (không lọt dấu · ra ngoài)' + at);
      assert.equal(m.dotAlone, false, 'không có dấu · đứng riêng trong ô chọn việc' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);

      if (width >= 820) {
        assert.ok(m.dlgW > 560, 'hộp rộng hơn ở màn từ 820 px' + at);
        assert.equal(m.sideBySide, true, 'Đã xong và Chưa xong cạnh nhau' + at);
        assert.equal(m.twoColPicks, true, 'ô chọn việc xếp hai cột' + at);
      } else {
        assert.equal(m.sideBySide, false, 'dưới 820 px các mục xếp dọc' + at);
        assert.equal(m.twoColPicks, false, 'dưới 820 px ô chọn việc một cột' + at);
      }

      // Nút Lưu / Đóng phải thấy được khi cuộn tới đáy hộp.
      const save = await page.evaluate(() => {
        const d = document.querySelector('dialog.zen-review');
        d.scrollTop = d.scrollHeight;
        return new Promise((resolve) =>
          requestAnimationFrame(() => {
            const dr = d.getBoundingClientRect();
            const b = d.querySelector('[data-review-save]').getBoundingClientRect();
            const c = d.querySelector('.zen-review-actions [data-review-close]').getBoundingClientRect();
            resolve({ saveIn: b.top >= dr.top && b.bottom <= dr.bottom + 1, closeIn: c.top >= dr.top && c.bottom <= dr.bottom + 1, height: Math.round(b.height) });
          }),
        );
      });
      assert.equal(save.saveIn, true, 'nút Lưu luôn thấy khi cuộn tới đáy' + at);
      assert.equal(save.closeIn, true, 'nút Đóng luôn thấy khi cuộn tới đáy' + at);
      assert.ok(save.height >= (touch ? 44 : 36), 'nút Lưu đủ vùng chạm' + at);

      await context.close();
    }
  }
  console.log('weekly-review-layout-browser ok');
} finally {
  await h.close();
}
