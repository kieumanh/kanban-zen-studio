// v1.93.0 (Lộ Trình): dòng thời gian trong trang Tu vi — các chặng (mỗi chặng kết thúc bằng một chương truyện ký) xếp theo cảnh
// giới, khối "đang ở đây" cho biết hiệp khách ở chặng nào, đã qua mấy cấp, còn bao nhiêu điểm tới chương kế.
// v2.5.0 (Thăng Thiên): thang mới 11 cảnh giới (cảnh giới bắt đầu ở ải cấp 10, 20 …; cấp 100–103 là Thần cảnh), điểm giảm 20%;
// đầu mỗi cảnh giới nêu cấp, ải đột phá, điểm mỗi cấp và tu vi. Chương được xếp vào cảnh giới chứa cấp của chương.
// v2.6.0 (Song Nguyệt): cốt truyện mới 27 chương (cấp 80+ dày hơn: cách 2–3 cấp); tên chương và khóa đã đọc notice:tale-N.
// v2.12.0 (Thiên Môn Ký): chặng 90–100 viết chi tiết thành 18 chương, tổng 38 chương (38 chặng); 7 chương mở giữa cấp.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px với cấp 22, cấp 0, cấp 100 và cấp 103: chữ trong khối "đang ở đây", thanh tiến trình chặng,
// trạng thái từng cảnh giới, vạch 5 cấp của từng chặng, chặng đã qua đọc được chương, dấu đã đọc từ máy chủ, không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
// half = số nửa điểm đã tích lũy.
// v2.14.0 (Thần Lộ): thần cấp 101–103 cần đủ lĩnh ngộ cả tám chỉ số, nên mốc 14.328 điểm gieo đều tám chỉ số (half ≥ 28.656).
const seed = (half) => () => ({ schema: 1, projects: [], notes: [], growth: { v: 1, hero: 'nam', since: day(-40), log: half ? [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: half >= 28656 ? Array(8).fill(half / 8) : [half, 0, 0, 0, 0, 0, 0, 0] }] : [] } });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const read = (page) =>
  page.evaluate(() => {
    const now = document.querySelector('.gr-path-now'), bar = now.querySelector('[role=progressbar]');
    return {
      where: now.querySelector('p').textContent, sub: now.querySelector('small').textContent, bar: [bar.getAttribute('aria-label'), bar.getAttribute('aria-valuenow')],
      head: document.querySelector('.gr-path-panel h2').textContent,
      realms: [...document.querySelectorAll('.gr-path-realm')].map((li) => [li.className.replace('gr-path-realm ', ''), li.querySelector('.gr-path-node').textContent, li.querySelector('.gr-path-head em').textContent, li.getAttribute('aria-current')]),
      heads: [...document.querySelectorAll('.gr-path-head small')].map((e) => e.textContent),
      stages: [...document.querySelectorAll('.gr-path .gr-ch')].map((li) => ({
        title: li.querySelector('strong').textContent, sub: li.querySelector('small').textContent, tag: li.querySelector('.gr-ch-tag').textContent,
        on: li.querySelectorAll('.gr-segs i.on').length, button: !!li.querySelector('button'), here: !!li.querySelector('.gr-here'), current: li.getAttribute('aria-current'),
      })),
    };
  });

const h = await startHarness({ seed: seed(60) });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 1. 30 điểm = cấp 22 (Nhị lưu cao thủ · Chưởng Phong Sơ Hiện): chặng 5 (cấp 21–25), chương 5 mở ở cấp 25 (36,5 điểm).
    {
      const { context, page } = await h.open(width, { touch, workspace: seed(60)(), receiptsSeed: ['notice:tale-5'] });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'growth');
      // Dấu đã đọc của tài khoản tải xong thì khung vẽ lại: chương 1 thành "Đã đọc".
      await page.waitForFunction(() => document.querySelector('.gr-path .gr-ch .gr-ch-tag')?.textContent === 'Đã đọc');
      const r = await read(page);
      assert.equal(r.where, 'Thiếu hiệp đang ở chặng 5/38 · tiến về “Tiếng sáo đêm mưa”', 'đang ở chặng nào' + at);
      assert.equal(r.sub, 'Cấp 22 · Nhị lưu cao thủ · Chưởng Phong Sơ Hiện · đã qua 2/5 cấp của chặng · còn 6,5 điểm tới chương 5', 'chi tiết vị trí' + at);
      assert.deepEqual(r.bar, ['Tiến trình chặng 5 (cấp 21–25)', '48'], 'thanh tiến trình chặng tính theo điểm (24 → 30 → 36,5)' + at);
      assert.match(r.head, /^Lộ trình tu luyện\s*Chặng 5\/38 · 5\/39 chương$/, 'tiêu đề khung' + at);
      assert.equal(r.realms.length, 11, '11 cảnh giới' + at);
      assert.deepEqual(r.realms.slice(0, 4), [['is-done', '✓', 'Đã qua', null], ['is-done', '✓', 'Đã qua', null], ['is-now', '3', 'Đang tu luyện', 'true'], ['is-todo', '4', 'Chưa tới', null]], 'trạng thái cảnh giới' + at);
      assert.equal(r.heads[0], 'Cấp 1–9 · 0,5 điểm mỗi cấp · tu vi 0,5–4,5', 'cảnh giới 1: không có ải' + at);
      assert.equal(r.heads[2], 'Cấp 20–29 · ải đột phá 7 · 2,5 điểm mỗi cấp · tu vi 24–46,5', 'cảnh giới 3: cấp, ải, điểm mỗi cấp, tu vi' + at);
      // v2.10.0 (Thiên Môn): từ cấp 91 mỗi cấp gấp đôi cấp trước; ải cấp 100 = 2.048 điểm.
      assert.equal(r.heads[9], 'Cấp 90–99 · ải đột phá 513,5 · mỗi cấp gấp đôi cấp trước, 4 → 1.024 điểm · tu vi 4.088–6.132', 'Võ lâm chí tôn' + at);
      assert.equal(r.heads[10], 'Cấp 100–103 · ải đột phá 2.048 · 2.048 điểm mỗi cấp · tu vi 8.180–14.324', 'Thần cảnh' + at);
      assert.equal(r.stages.length, 38, '38 chặng' + at);
      assert.deepEqual(r.stages.map((s) => s.on), [5, 5, 5, 5, 2, ...Array(33).fill(0)], 'vạch cấp của từng chặng' + at);
      assert.deepEqual(r.stages.slice(0, 6).map((s) => s.button), [true, true, true, true, false, false], 'chặng đã qua đọc được chương' + at);
      assert.deepEqual(r.stages.slice(0, 6).map((s) => s.tag), ['Đã đọc', 'Chưa đọc', 'Chưa đọc', 'Chưa đọc', 'Mở ở cấp 25', 'Mở ở cấp 30'], 'nhãn từng chặng' + at);
      assert.deepEqual([r.stages[4].title, r.stages[4].sub, r.stages[4].here, r.stages[4].current], ['Tiếng sáo đêm mưa', 'Chặng 5 · cấp 21–25', true, 'step'], 'chặng hiện tại có "Đang ở đây"' + at);
      assert.equal(r.stages.filter((s) => s.here).length, 1, 'chỉ một chặng hiện tại' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      // Chặng đã qua: bấm để đọc chương.
      await page.click('.gr-path [data-gr-story="15"]');
      await page.waitForSelector('dialog.gr-story[open]');
      assert.equal(await page.locator('#gr-story-title').textContent(), 'Hội đèn nghìn mặt', 'mở đúng chương của chặng 3' + at);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
      await page.waitForFunction(() => [...document.querySelectorAll('.gr-path .gr-ch')][2]?.querySelector('.gr-ch-tag').textContent === 'Đã đọc');
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 2. Cấp 0, cấp 100 (thành Thần, đang tu luyện Thần cảnh) và cấp 103 (Thần Vương).
    for (const [half, where, sub, realms] of [
      [0, 'Thiếu hiệp đang ở chặng 1/38 · tiến về “Trăm chuyến nước”', 'Chưa nhập cấp · đã qua 0/5 cấp của chặng · còn 2,5 điểm tới chương 1', ['is-now', ...Array(10).fill('is-todo')]],
      [16368, 'Thiếu hiệp đã đi trọn 38 chặng, cấp 100 · Thần cảnh', 'Hành trình trọn vẹn. Đỉnh núi chỉ là chỗ để thấy con đường tiếp theo.', [...Array(10).fill('is-done'), 'is-now']],
      [28656, 'Thiếu hiệp đã đi trọn 38 chặng, cấp 103 · Thần cảnh', 'Hành trình trọn vẹn. Đỉnh núi chỉ là chỗ để thấy con đường tiếp theo.', Array(11).fill('is-done')],
    ]) {
      const { context, page } = await h.open(width, { touch, workspace: seed(half)() });
      await h.show(page, 'growth');
      const r = await read(page);
      assert.equal(r.where, where, 'đang ở đâu (' + half / 2 + ' điểm)' + at);
      assert.equal(r.sub, sub, 'chi tiết (' + half / 2 + ' điểm)' + at);
      assert.deepEqual(r.realms.map((x) => x[0]), realms, 'trạng thái cảnh giới (' + half / 2 + ' điểm)' + at);
      assert.equal(r.stages.filter((s) => s.here).length, half ? 0 : 1, 'chặng hiện tại (' + half / 2 + ' điểm)' + at);
      if (half) assert.equal(r.bar[1], '100', 'cấp 100: thanh đầy' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang (' + half / 2 + ' điểm)' + at);
      await context.close();
    }
  }
  console.log('growth-path-browser ok');
} finally {
  await h.close();
}
