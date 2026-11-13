// v2.12.0 (Thiên Môn Ký): chương giữa cấp của Truyện ký. Cấp 98–100 kéo dài nhiều tháng (thang gấp đôi, v2.10.0) nên chặng 97–100
// có 7 chương mở giữa chừng một cấp. Cấp lẻ = cấp + phần đã đi của đường lên cấp kế tiếp: 97,5 là nửa đường từ cấp 97 lên 98.
//  1. Mốc tu vi của chương giữa cấp: tuviAt(97.5) = 4.852; tuviAt(99.2) = 6.541,6; cấp nguyên trùng LEVEL_AT.
//  2. Cộng điểm qua mốc 4.852 mà chưa lên cấp: chương "Mười một chiếc ghế" tự mở; dấu đã đọc notice:tale-97.5; không có nghi thức
//     Đột phá; dữ liệu Tu vi không thêm khóa nào.
//  3. Lộ trình tu luyện: chặng có cấp lẻ ghi "cấp 97–97,5", "cấp 97,5–98", bốn vạch theo phần tu vi đã đi; khối "đang ở đây" ghi
//     "đã đi N% chặng"; chương chưa tới ghi "Mở ở cấp 99,6".
//  4. Bảng vàng đếm cả chương giữa cấp đã đọc.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px; bảng vừa màn hình, không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const project = { id: 'p1', name: 'Dự án A', description: '', color: '#7950c8', icon: '✺', columns: ['Idea', 'List', 'Doing', 'Done'], columnNames: { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang thực hiện', Done: 'Hoàn thành' }, tasks: [{ id: 'p1t0', title: 'Gửi báo cáo', col: 'Doing', description: '', due: day(3), tag: 'Công việc', priority: 'q2', checks: [] }] };
// half = số nửa điểm. 9702 nửa điểm = 4.851 điểm: cấp 97 (4.596), còn 1 điểm tới mốc 97,5 (4.852).
const growth = (half) => ({ v: 1, hero: 'nu', name: 'Lam Y', since: day(-400), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [half, 0, 0, 0, 0, 0, 0, 0] }] });
const seed = (half) => () => ({ schema: 1, projects: [structuredClone(project)], notes: [], growth: growth(half) });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const stages = (page) =>
  page.evaluate(() => {
    const now = document.querySelector('.gr-path-now'), bar = now.querySelector('[role=progressbar]');
    return {
      where: now.querySelector('p').textContent, sub: now.querySelector('small').textContent, bar: [bar.getAttribute('aria-label'), bar.getAttribute('aria-valuenow')],
      list: [...document.querySelectorAll('.gr-path .gr-ch')].map((li) => ({
        title: li.querySelector('strong').textContent, sub: li.querySelector('small').textContent, tag: li.querySelector('.gr-ch-tag').textContent,
        segs: li.querySelectorAll('.gr-segs i').length, on: li.querySelectorAll('.gr-segs i.on').length, button: !!li.querySelector('button'), here: !!li.querySelector('.gr-here'),
      })),
    };
  });
async function finishTask(page) {
  await h.show(page, 'board');
  await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[0], 'Done'));
  await page.waitForSelector('#growth-award[open]');
  await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-save]');
  await page.mouse.move(2, 2);
}

const h = await startHarness({ seed: seed(9702) });
try {
  // 1. Mốc tu vi.
  {
    const { context, page } = await h.open(1440, { workspace: seed(9702)() });
    await h.show(page, 'growth');
    const m = await page.evaluate(() => {
      const g = window.zenGrowth;
      return { at: [97, 97.5, 98, 98.3, 98.7, 99, 99.2, 99.4, 99.6, 99.8, 100, 103, 104].map((x) => +g.tuviAt(x).toFixed(2)), whole: [0, 1, 10, 90, 100, 103].every((n) => g.tuviAt(n) === g.LEVEL_AT[n]), mid: window.zenTale.CHAPTERS.map((c) => c.lv).filter((x) => !Number.isInteger(x)) };
    });
    assert.deepEqual(m.at, [4596, 4852, 5108, 5415.2, 5824.8, 6132, 6541.6, 6951.2, 7360.8, 7770.4, 8180, 14324, 14324], 'mốc tu vi của cấp lẻ: phần thập phân nhân với điểm của cấp kế tiếp');
    assert.equal(m.whole, true, 'cấp nguyên trùng LEVEL_AT');
    assert.deepEqual(m.mid, [97.5, 98.3, 98.7, 99.2, 99.4, 99.6, 99.8], 'bảy chương giữa cấp');
    await context.close();
  }

  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 2. Qua mốc 97,5 mà chưa lên cấp.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: seed(9702)() });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await finishTask(page);
      await page.waitForSelector('dialog.gr-story[open]', { timeout: 5000 });
      assert.equal(await page.locator('dialog.gr-breakthrough').count(), 0, 'chưa lên cấp: không có nghi thức Đột phá' + at);
      const r = await page.evaluate(() => {
        const d = document.querySelector('dialog.gr-story[open]'), b = d.getBoundingClientRect();
        return { eyebrow: d.querySelector('.gr-story-head .eyebrow').textContent, title: d.querySelector('#gr-story-title').textContent, fits: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight, level: window.zenGrowth.realmOf(4852).level };
      });
      assert.equal(r.eyebrow, 'TRUYỆN KÝ GIANG HỒ · CHƯƠNG 29 / 38', 'chương giữa cấp tự mở' + at);
      assert.equal(r.title, 'Mười một chiếc ghế', 'đúng chương của mốc 97,5' + at);
      assert.equal(r.level, 97, 'vẫn ở cấp 97' + at);
      assert.ok(r.fits, 'bảng vừa màn hình' + at);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
      await page.waitForFunction(() => readReceiptKeys.has('notice:tale-97.5'));
      assert.ok(server.receipts.includes('notice:tale-97.5'), 'dấu đã đọc của chương giữa cấp: ' + server.receipts + at);
      assert.deepEqual(Object.keys(server.workspace.growth).sort(), ['hero', 'log', 'name', 'since', 'spend', 'v'], 'dữ liệu Tu vi không thêm khóa mới' + at);
      // 3. Lộ trình: 4.852 điểm, vừa tới mốc 97,5; chặng kế là 97,5 → 98 (chương 30, mở ở 5.108).
      await h.show(page, 'growth');
      const s = await stages(page);
      assert.equal(s.where, 'Lam Y đang ở chặng 30/38 · tiến về “Trăng không lặn”', 'đang ở chặng nào' + at);
      assert.match(s.sub, /^Cấp 97 · Võ lâm chí tôn · .+ · đã đi 0% chặng · còn 256 điểm tới chương 30$/, 'chi tiết vị trí: ' + s.sub + at);
      assert.deepEqual(s.bar, ['Tiến trình chặng 30 (cấp 97,5–98)', '0'], 'thanh tiến trình chặng' + at);
      const [c28, c29, c30, c31] = [27, 28, 29, 30].map((i) => s.list[i]); // danh sách chặng không gồm Khai cuộc
      assert.deepEqual([c28.title, c28.sub, c28.segs, c28.on], ['Sứ giả áo bạc', 'Chặng 28 · cấp 97', 1, 1], 'chặng nguyên cấp: mỗi cấp một vạch' + at);
      assert.deepEqual([c29.title, c29.sub, c29.tag, c29.segs, c29.on, c29.button], ['Mười một chiếc ghế', 'Chặng 29 · cấp 97–97,5', 'Đã đọc', 4, 4, true], 'chặng tới cấp lẻ: bốn vạch, đã qua' + at);
      assert.deepEqual([c30.title, c30.sub, c30.tag, c30.segs, c30.on, c30.here, c30.button], ['Trăng không lặn', 'Chặng 30 · cấp 97,5–98', 'Mở ở cấp 98', 4, 0, true, false], 'chặng đang đi' + at);
      assert.deepEqual([c31.title, c31.sub, c31.tag], ['Ruộng không xanh', 'Chặng 31 · cấp 98–98,3', 'Mở ở cấp 98,3'], 'chặng kế ghi cấp lẻ' + at);
      assert.equal(s.list.filter((x) => x.here).length, 1, 'chỉ một chặng hiện tại' + at);
      assert.match(await page.locator('.gr-path-panel .help-copy').first().textContent(), /cấp 99,4 là khi đã đi được 40% đường từ cấp 99 lên cấp 100/, 'lời giải thích cấp lẻ' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 3 + 4. 7.200 điểm: giữa 99,4 (6.951,2) và 99,6 (7.360,8), đã đi 60% chặng → 2/4 vạch; còn 160,8 điểm, làm tròn lên bước 0,5 là 161; Bảng vàng đếm chương giữa cấp.
    {
      const { context, page } = await h.open(width, { touch, workspace: seed(14400)(), receiptsSeed: ['notice:tale-97.5', 'notice:tale-98.3', 'notice:tale-98.7', 'notice:tale-99.2', 'notice:tale-99.4'] });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // Bảng vàng chỉ đếm khi dấu đã đọc của tài khoản đã tải xong.
      await page.waitForFunction(() => typeof readReceiptLoaded !== 'undefined' && readReceiptLoaded);
      await h.show(page, 'growth');
      const s = await stages(page);
      assert.equal(s.where, 'Lam Y đang ở chặng 36/38 · tiến về “Món nợ một gáo nước”', 'đang ở chặng nào' + at);
      assert.match(s.sub, /đã đi 60% chặng · còn 161 điểm tới chương 36$/, 'phần đã đi của chặng: ' + s.sub + at);
      assert.deepEqual(s.bar, ['Tiến trình chặng 36 (cấp 99,4–99,6)', '60'], 'thanh tiến trình chặng' + at);
      const c35 = s.list[34], c36 = s.list[35], c37 = s.list[36], c38 = s.list[37];
      assert.deepEqual([c35.title, c35.sub, c35.tag, c35.on], ['Mười ổ khóa', 'Chặng 35 · cấp 99,2–99,4', 'Đã đọc', 4], 'chương giữa cấp đã đọc theo dấu máy chủ' + at);
      assert.deepEqual([c36.sub, c36.tag, c36.segs, c36.on, c36.here], ['Chặng 36 · cấp 99,4–99,6', 'Mở ở cấp 99,6', 4, 2, true], 'đã đi 60%: hai trên bốn vạch' + at);
      assert.deepEqual([c37.title, c37.tag, c37.on], ['Nguyệt thực', 'Mở ở cấp 99,8', 0], 'chương sau còn khóa' + at);
      assert.deepEqual([c38.title, c38.sub, c38.tag], ['Song nguyệt', 'Chặng 38 · cấp 99,8–100', 'Mở ở cấp 100'], 'chương cuối' + at);
      assert.equal(await page.locator('[data-gr-story="99.6"]').count(), 0, 'chương chưa tới mốc bị khóa' + at);
      assert.equal(await page.locator('.gr-ach[data-ach="story-5"] .gr-ach-state').textContent(), 'Đã đạt', 'Bảng vàng đếm chương giữa cấp đã đọc' + at);
      // Mở đọc lại chương giữa cấp.
      await page.click('[data-gr-story="99.4"]');
      await page.waitForSelector('dialog.gr-story[open]');
      assert.equal(await page.locator('#gr-story-title').textContent(), 'Mười ổ khóa', 'đọc lại chương giữa cấp' + at);
      await page.keyboard.press('Escape');
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }
  console.log('growth-midchapter-browser ok');
} finally {
  await h.close();
}
