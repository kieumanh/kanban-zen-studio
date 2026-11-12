// v1.85.0 (Bách Cấp): 100 cấp, 10 cảnh giới × 10 trọng. Cảnh giới sau tốn gấp đôi cảnh giới trước: 1, 2, 4 … 512 điểm cho mỗi cấp,
// cộng dồn tới cấp 100 là 10.230 điểm. Cấp tính theo tổng điểm đã tu luyện nên không tụt khi đổi bảo vật.
// Kiểm ở 390 (chạm), 820, 1440 px: cách tính cấp, khối cấp trên trang (ấn cảnh giới, "Cấp n/100 · Đệ … trọng", thanh tiến, thang 10 cảnh giới),
// bảng thang 100 cấp, báo cáo, thông báo lên cấp / đột phá khi hoàn thành việc, không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
// half = số nửa điểm đã tích lũy (sổ cái lưu nửa điểm).
const growth = (half, extra = {}) => ({ v: 1, hero: 'nam', since: day(-40), log: half ? [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [half, 0, 0, 0, 0, 0, 0, 0] }] : [], ...extra });
const seed = (g) => () => ({
  schema: 1,
  projects: [{ id: 'p1', name: 'Dự án A', description: '', color: '#7950c8', icon: '✺', columns: ['Idea', 'List', 'Doing', 'Done'], columnNames: { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang thực hiện', Done: 'Hoàn thành' }, tasks: [{ id: 'p1t0', title: 'Gửi báo cáo', col: 'Doing', description: '', due: day(3), tag: 'Công việc', priority: 'q2', checks: [] }] }],
  notes: [],
  growth: g,
});
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const h = await startHarness({ seed: seed(growth(60)) });
try {
  // 1. Cách tính cấp (một lần, không phụ thuộc kích thước màn hình).
  {
    const { context, page } = await h.open(1440, { workspace: seed(growth(60))() });
    await h.show(page, 'growth');
    const m = await page.evaluate(() => {
      const g = window.zenGrowth, r = (t) => { const x = g.realmOf(t); return [x.level, x.realm, x.name, x.tier]; };
      return {
        len: g.LEVEL_AT.length, at: [1, 10, 11, 20, 21, 30, 50, 90, 91, 100].map((n) => g.LEVEL_AT[n]), realms: g.REALMS,
        r0: r(0), r05: r(0.5), r1: r(1), r10: r(10), r115: r(11.5), r12: r(12), r30: r(30), r10229: r(10229.5), r10230: r(10230), rBig: r(1e7),
        need: [g.realmOf(30).need, g.realmOf(30).needRealm, g.realmOf(30).next, g.realmOf(30).breakthrough, g.realmOf(34).breakthrough],
        top: [g.realmOf(10230).top, g.realmOf(10230).need, g.realmOf(10230).pct, g.realmOf(10230).next],
        pct: [g.realmOf(6.5).pct, g.realmOf(32).pct, g.realmOf(33.5).pct],
      };
    });
    assert.equal(m.len, 101, 'đủ mốc cho cấp 0–100');
    assert.deepEqual(m.at, [1, 10, 12, 30, 34, 70, 310, 5110, 5622, 10230], 'mốc cộng dồn: mỗi cảnh giới gấp đôi, cấp 100 = 10.230 điểm');
    assert.deepEqual(m.realms, ['Sơ nhập giang hồ', 'Tam lưu cao thủ', 'Nhị lưu cao thủ', 'Nhất lưu cao thủ', 'Tuyệt đỉnh cao thủ', 'Tiên thiên cao thủ', 'Tông sư', 'Đại tông sư', 'Thiên nhân hợp nhất', 'Võ lâm chí tôn'], '10 cảnh giới theo thứ tự');
    assert.deepEqual(m.r0, [0, 0, 'Vô danh tiểu tốt', ''], '0 điểm: chưa nhập cấp');
    assert.deepEqual(m.r05, [0, 0, 'Vô danh tiểu tốt', ''], '0,5 điểm vẫn chưa đủ cấp 1');
    assert.deepEqual(m.r1, [1, 1, 'Sơ nhập giang hồ', 'Đệ nhất trọng'], '1 điểm: cấp 1');
    assert.deepEqual(m.r10, [10, 1, 'Sơ nhập giang hồ', 'Đệ thập trọng'], '10 điểm: cấp 10');
    assert.deepEqual(m.r115, [10, 1, 'Sơ nhập giang hồ', 'Đệ thập trọng'], '11,5 điểm: chưa đủ cấp 11 (cần 2 điểm)');
    assert.deepEqual(m.r12, [11, 2, 'Tam lưu cao thủ', 'Đệ nhất trọng'], '12 điểm: cấp 11, cảnh giới thứ hai');
    assert.deepEqual(m.r30, [20, 2, 'Tam lưu cao thủ', 'Đệ thập trọng'], '30 điểm: cấp 20');
    assert.deepEqual(m.r10229, [99, 10, 'Võ lâm chí tôn', 'Đệ cửu trọng'], 'thiếu nửa điểm: cấp 99');
    assert.deepEqual(m.r10230, [100, 10, 'Võ lâm chí tôn', 'Đệ thập trọng'], '10.230 điểm: cấp 100');
    assert.deepEqual(m.rBig, [100, 10, 'Võ lâm chí tôn', 'Đệ thập trọng'], 'không vượt quá cấp 100');
    assert.deepEqual(m.need, [4, 4, 'Nhị lưu cao thủ', true, false], 'cấp 20: còn 4 điểm lên cấp 21 và đột phá Nhị lưu cao thủ; cấp 21 lên cấp 22 không đột phá');
    assert.deepEqual(m.top, [true, 0, 100, ''], 'cấp 100 là cấp tối cao');
    assert.deepEqual(m.pct, [50, 50, 87], 'phần trăm tới cấp kế tiếp (6,5 → 50%; 32 → 2/4; 33,5 → 3,5/4)');
    await context.close();
  }

  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 2. Khối cấp trên trang và bảng thang 100 cấp (30 điểm = cấp 20).
    {
      const { context, page } = await h.open(width, { touch, workspace: seed(growth(60))() });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'growth');
      const b = await page.evaluate(() => {
        const bar = document.querySelector('.gr-realm [role=progressbar]'), lad = document.querySelector('.gr-ladder');
        return {
          name: document.querySelector('.gr-realm-name').textContent, rank: document.querySelector('.gr-rank').textContent, ahead: document.querySelector('.gr-realm-ahead').textContent,
          bar: [bar.getAttribute('aria-label'), bar.getAttribute('aria-valuenow')], ladder: [lad.getAttribute('aria-label'), [...lad.children].map((li) => li.className || '-')],
          sub: document.querySelector('#main').innerText,
        };
      });
      assert.equal(b.name, 'Tam lưu cao thủ', 'ấn cảnh giới' + at);
      assert.equal(b.rank, 'Cấp 20/100 · Đệ thập trọng', 'cấp và trọng' + at);
      assert.equal(b.ahead, '30 điểm tu vi · còn 4 điểm lên cấp 21 · đột phá Nhị lưu cao thủ', 'còn bao nhiêu điểm' + at);
      assert.deepEqual(b.bar, ['Tiến tới cấp 21', '0'], 'thanh tiến tới cấp kế tiếp' + at);
      assert.deepEqual(b.ladder, ['Cảnh giới 2 trên 10', ['is-done', 'is-now', '-', '-', '-', '-', '-', '-', '-', '-']], 'thang 10 cảnh giới' + at);
      assert.match(b.sub, /Cấp 20 · Tam lưu cao thủ · 30 điểm tu vi/, 'dòng phụ dưới tiêu đề' + at);
      // Bảng thang 100 cấp: đóng sẵn, mở ra thấy 10 dòng, dòng hiện tại được tô.
      assert.equal(await page.locator('.gr-scale table').isVisible(), false, 'bảng thang đóng sẵn' + at);
      const sum = await page.locator('.gr-scale>summary').boundingBox();
      assert.ok(sum.height >= 36, 'nút mở bảng đủ cao' + at);
      await page.click('.gr-scale>summary');
      const t = await page.evaluate(() => ({
        rows: [...document.querySelectorAll('.gr-scale tbody tr')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
        now: document.querySelector('.gr-scale tr[aria-current=true] th').textContent,
        fits: (() => { const w = document.querySelector('.gr-scale-wrap'); return w.scrollWidth <= w.clientWidth + 1; })(),
      }));
      assert.equal(t.rows.length, 10, 'bảng có 10 cảnh giới' + at);
      assert.equal(t.rows[0], 'Sơ nhập giang hồ1–1011–10', 'dòng đầu' + at);
      assert.equal(t.rows[1], 'Tam lưu cao thủ11–20212–30', 'dòng hai' + at);
      assert.equal(t.rows[9], 'Võ lâm chí tôn91–1005125.622–10.230', 'dòng cuối' + at);
      assert.equal(t.now, 'Tam lưu cao thủ', 'tô dòng cảnh giới hiện tại' + at);
      assert.equal(t.fits, true, 'bảng vừa khung, không phải cuộn ngang' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      // Báo cáo: ô cảnh giới có cấp.
      await page.click('[data-gr-report]');
      await page.waitForSelector('.gr-report');
      const tile = await page.locator('.gr-tile[data-tile=realm]').innerText();
      assert.match(tile.replace(/\s+/g, ' '), /Tam lưu cao thủ Cấp 20\/100 · còn 4 điểm lên cấp 21/, 'báo cáo có cấp' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 3. Cấp 100 và 0 điểm.
    for (const [half, rank, ahead] of [
      [20460, 'Cấp 100/100 · Đệ thập trọng', '10.230 điểm tu vi · đã đạt cấp tối cao'],
      [0, 'Chưa nhập cấp', '0 điểm tu vi · còn 1 điểm để nhập cấp 1'],
    ]) {
      const { context, page } = await h.open(width, { touch, workspace: seed(growth(half))() });
      await h.show(page, 'growth');
      assert.equal(await page.locator('.gr-rank').textContent(), rank, 'dòng cấp' + at);
      assert.equal(await page.locator('.gr-realm-ahead').textContent(), ahead, 'dòng điểm' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      await context.close();
    }
    // 4. Hoàn thành việc: lên cấp thì báo "lên cấp"; không lên cấp thì không báo; đổi bảo vật không làm tụt cấp.
    for (const [half, expect] of [
      [19, /Chúc mừng! Thiếu hiệp lên cấp 10 · Sơ nhập giang hồ, đệ thập trọng\./], // 9,5 → 10,5 điểm
      [20, null], // 10 → 11 điểm: vẫn cấp 10 (cấp 11 cần 12 điểm)
    ]) {
      const { context, page } = await h.open(width, { touch, workspace: seed(growth(half))() });
      await h.show(page, 'board');
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[0], 'Done'));
      await page.waitForSelector('#growth-award[open]');
      await page.click('[data-gr-plus="0"]');
      await page.click('[data-gr-plus="0"]');
      await page.click('[data-gr-save]');
      await page.waitForSelector('.completion-card');
      await wait(300);
      const toast = (await page.locator('#toast').textContent()) || '';
      if (expect) assert.match(toast, expect, 'báo lên cấp' + at);
      else assert.doesNotMatch(toast, /lên cấp|đột phá/, 'không lên cấp thì không báo' + at);
      await context.close();
    }
    {
      const spend = [{ id: 's1', d: day(-1), n: 'Ấm trà', p: [40, 0, 0, 0, 0, 0, 0, 0] }];
      const { context, page } = await h.open(width, { touch, workspace: seed(growth(60, { spend }))() });
      await h.show(page, 'growth');
      assert.equal(await page.locator('.gr-rank').textContent(), 'Cấp 20/100 · Đệ thập trọng', 'đổi bảo vật không làm tụt cấp' + at);
      assert.match(await page.locator('[data-wallet=left]').innerText(), /10/, 'tu vi hiện có vẫn trừ phần đã đổi' + at);
      await context.close();
    }
  }
  console.log('growth-levels-browser ok');
} finally {
  await h.close();
}
