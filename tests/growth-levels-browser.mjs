// v2.5.0 (Thăng Thiên): thang 103 cấp, mỗi cấp một danh xưng, 11 cảnh giới. Thay yêu cầu của v1.85.0 (10 cảnh giới × 10 trọng,
// 10.230 điểm tới cấp 100) theo yêu cầu mới của chủ dự án:
//  - mỗi cấp một tên; cấp 100 thành Thần, trên Thần thêm 3 cấp tới Thần Vương (cấp 103);
//  - vượt một đại cấp (9 → 10, 19 → 20 … 99 → 100) khó hơn mức thường: ải đột phá tốn ≥ 3 lần cấp thường của cảnh giới trước;
//  - giảm 20% điểm cần tích lũy: cấp 100 = 8.184 điểm (80% của 10.230), không mốc nào cao hơn thang cũ nên không ai tụt cấp.
// v2.10.0 (Thiên Môn), theo yêu cầu mới của chủ dự án: từ cấp 90 trở đi, cấp sau khó gấp đôi cấp trước; ải cấp 100 khó nhất.
//  - cấp 91 tốn 4 điểm, rồi 8, 16 … 1.024 (cấp 99), cấp 100 tốn 2.048 điểm (bằng cả chín cấp trước cộng lại);
//  - tổng tới cấp 100 = 8.180 điểm (không cao hơn 8.184 của v2.5.0), vẫn đi hết trong 3–4 năm; không mốc nào cao hơn thang v2.5.0.
// Kiểm ở 390 (chạm), 820, 1440 px: cách tính cấp, khối cấp trên trang (ấn cảnh giới, "Cấp n/100 · danh xưng", thanh tiến, thang
// 11 cảnh giới), bảng thang và danh xưng 103 cấp, báo cáo, thông báo lên cấp / đột phá, nghi thức thành Thần, không tràn ngang.
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
const REALMS = ['Sơ nhập giang hồ', 'Tam lưu cao thủ', 'Nhị lưu cao thủ', 'Nhất lưu cao thủ', 'Tuyệt đỉnh cao thủ', 'Tiên thiên cao thủ', 'Tông sư', 'Đại tông sư', 'Thiên nhân hợp nhất', 'Võ lâm chí tôn', 'Thần cảnh'];
// Hoàn thành việc p1t0 rồi dồn 1 điểm (2 lần vận công) vào mạch đầu.
async function award(page) {
  await h.show(page, 'board');
  await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[0], 'Done'));
  await page.waitForSelector('#growth-award[open]');
  await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-save]');
  await page.waitForSelector('.completion-card');
  await wait(300);
}

const h = await startHarness({ seed: seed(growth(60)) });
try {
  // 1. Cách tính cấp (một lần, không phụ thuộc kích thước màn hình).
  {
    const { context, page } = await h.open(1440, { workspace: seed(growth(60))() });
    await h.show(page, 'growth');
    const m = await page.evaluate(() => {
      const g = window.zenGrowth, r = (t) => { const x = g.realmOf(t); return [x.level, x.realm, x.name, x.title]; };
      const cost = (n) => g.LEVEL_AT[n] - g.LEVEL_AT[n - 1];
      const old = [0];
      for (let n = 1; n <= 100; n++) old[n] = old[n - 1] + 2 ** Math.floor((n - 1) / 10); // thang v1.85.0
      // Thang v2.5.0: cấp thường theo cảnh giới, ải ở cấp 10, 20 … 100, thần cấp 2.048.
      const N25 = [0.5, 1, 2.5, 5, 10.5, 21, 42.5, 85, 170.5, 341, 2048], G25 = [3.5, 7, 9.5, 19, 33.5, 67, 129.5, 259, 513.5, 1027], v25 = [0];
      for (let n = 1; n <= 103; n++) v25[n] = v25[n - 1] + (n % 10 === 0 && n <= 100 ? G25[n / 10 - 1] : N25[Math.min(10, Math.floor(n / 10))]);
      return {
        len: g.LEVEL_AT.length, at: [1, 9, 10, 11, 19, 20, 30, 90, 99, 100, 101, 103].map((n) => g.LEVEL_AT[n]), realms: g.REALMS,
        names: { len: g.LEVEL_NAMES.length, unique: new Set(g.LEVEL_NAMES.slice(1)).size, empty: g.LEVEL_NAMES.slice(1).filter((x) => !x).length, god: g.LEVEL_NAMES.slice(100) },
        demoted: Array.from({ length: 100 }, (_, i) => i + 1).filter((n) => g.LEVEL_AT[n] > old[n]),
        demoted25: Array.from({ length: 103 }, (_, i) => i + 1).filter((n) => g.LEVEL_AT[n] > v25[n]),
        same25: Array.from({ length: 90 }, (_, i) => i + 1).every((n) => g.LEVEL_AT[n] === v25[n]),
        gates: Array.from({ length: 9 }, (_, i) => (i + 1) * 10).map((n) => +(cost(n) / cost(n - 1)).toFixed(2)),
        normal: Array.from({ length: 9 }, (_, i) => i * 10 + 5).map(cost),
        doubling: Array.from({ length: 10 }, (_, i) => 91 + i).map(cost),
        hardest: Math.max(...Array.from({ length: 100 }, (_, i) => cost(i + 1))) === cost(100) && Array.from({ length: 99 }, (_, i) => cost(i + 1)).every((c) => c < cost(100)),
        god: [101, 102, 103].map(cost),
        r0: r(0), r05: r(0.5), r75: r(7.5), r8: r(8), r30: r(30), r99: r(8179.5), r100: r(8180), r103: r(14324), rBig: r(1e7),
        need: [g.realmOf(17).need, g.realmOf(17).needRealm, g.realmOf(17).next, g.realmOf(17).breakthrough, g.realmOf(24).breakthrough],
        god100: [g.realmOf(8180).god, g.realmOf(8179.5).god, g.realmOf(8180).top],
        top: [g.realmOf(14324).top, g.realmOf(14324).need, g.realmOf(14324).pct, g.realmOf(14324).next],
        pct: [g.realmOf(5.5).pct, g.realmOf(30).pct, g.realmOf(17 + 3.5).pct],
        label: [g.levelLabel(37), g.levelLabel(100), g.levelLabel(102)],
      };
    });
    assert.equal(m.len, 104, 'đủ mốc cho cấp 0–103');
    assert.deepEqual(m.at, [0.5, 4.5, 8, 9, 17, 24, 56, 4088, 6132, 8180, 10228, 14324], 'mốc cộng dồn: cấp 100 = 8.180 điểm, cấp 103 = 14.324 điểm');
    assert.ok(m.at[9] <= 10230 * 0.8, 'cấp 100 không vượt mức đã giảm 20% so với thang cũ (10.230)');
    assert.deepEqual(m.demoted, [], 'không mốc nào cao hơn thang cũ: không ai tụt cấp');
    assert.deepEqual(m.demoted25, [], 'không mốc nào cao hơn thang v2.5.0: không ai tụt cấp');
    assert.equal(m.same25, true, 'cấp 1–90 giữ nguyên thang v2.5.0');
    assert.ok(m.gates.every((x) => x >= 3), 'ải đột phá (cấp 10, 20 … 90) tốn ≥ 3 lần cấp thường trước nó: ' + m.gates.join(', '));
    assert.deepEqual(m.normal, [0.5, 1, 2.5, 5, 10.5, 21, 42.5, 85, 170.5], 'điểm mỗi cấp thường theo cảnh giới (1–9)');
    assert.deepEqual(m.doubling, [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048], 'từ cấp 91, mỗi cấp gấp đôi cấp trước; cấp 100 = 2.048');
    assert.equal(m.doubling[9], m.doubling.slice(0, 9).reduce((a, b) => a + b, 0) + 4, 'cấp 100 bằng cả chín cấp trước cộng lại (cộng 4)');
    assert.equal(m.hardest, true, 'ải cấp 100 là cấp tốn nhiều điểm nhất của cõi người');
    assert.deepEqual(m.god, [2048, 2048, 2048], 'mỗi thần cấp 2.048 điểm');
    assert.deepEqual(m.realms, REALMS, '11 cảnh giới theo thứ tự');
    assert.deepEqual(m.names, { len: 104, unique: 103, empty: 0, god: ['Thành Thần', 'Thượng Thần', 'Thần Quân', 'Thần Vương'] }, 'mỗi cấp một danh xưng riêng; cấp 100–103 tới Thần Vương');
    assert.deepEqual(m.r0, [0, 0, 'Vô danh tiểu tốt', ''], '0 điểm: chưa nhập cấp');
    assert.deepEqual(m.r05, [1, 1, 'Sơ nhập giang hồ', 'Sơ Tâm Khởi Bước'], '0,5 điểm: cấp 1');
    assert.deepEqual(m.r75, [9, 1, 'Sơ nhập giang hồ', 'Khí Hải Sơ Thành'], '7,5 điểm: chưa qua ải cấp 10');
    assert.deepEqual(m.r8, [10, 2, 'Tam lưu cao thủ', 'Phá Quan Nhập Lưu'], '8 điểm: qua ải, cấp 10 mở cảnh giới thứ hai');
    assert.deepEqual(m.r30, [22, 3, 'Nhị lưu cao thủ', 'Chưởng Phong Sơ Hiện'], '30 điểm: cấp 22');
    assert.deepEqual(m.r99, [99, 10, 'Võ lâm chí tôn', 'Nhân Gian Cực Cảnh'], 'thiếu nửa điểm: cấp 99');
    assert.deepEqual(m.r100, [100, 11, 'Thần cảnh', 'Thành Thần'], '8.180 điểm: cấp 100, thành Thần');
    assert.deepEqual(m.r103, [103, 11, 'Thần cảnh', 'Thần Vương'], '14.324 điểm: cấp 103, Thần Vương');
    assert.deepEqual(m.rBig, [103, 11, 'Thần cảnh', 'Thần Vương'], 'không vượt quá cấp 103');
    assert.deepEqual(m.need, [7, 7, 'Nhị lưu cao thủ', true, false], 'cấp 19: còn 7 điểm qua ải cấp 20 (Nhị lưu cao thủ); cấp 20 lên 21 không đột phá');
    assert.deepEqual(m.god100, [true, false, false], 'cấp 100 là Thần nhưng chưa phải cấp tối cao');
    assert.deepEqual(m.top, [true, 0, 100, ''], 'cấp 103 là cấp tối cao');
    assert.deepEqual(m.pct, [28, 40, 50], 'phần trăm tới cấp kế tiếp (5,5 → 1/3,5; 30 → 1/2,5; 20,5 → 3,5/7)');
    assert.deepEqual(m.label, ['Cấp 37/100', 'Cấp 100/100', 'Thần cấp 2/3'], 'nhãn cấp');
    await context.close();
  }

  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 2. Khối cấp trên trang, bảng thang và danh xưng 103 cấp (30 điểm = cấp 22).
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
      assert.equal(b.name, 'Nhị lưu cao thủ', 'ấn cảnh giới' + at);
      assert.equal(b.rank, 'Cấp 22/100 · Chưởng Phong Sơ Hiện', 'cấp và danh xưng' + at);
      assert.equal(b.ahead, '30 điểm tu vi · còn 1,5 điểm lên cấp 23', 'còn bao nhiêu điểm' + at);
      assert.deepEqual(b.bar, ['Tiến tới cấp 23', '40'], 'thanh tiến tới cấp kế tiếp' + at);
      assert.deepEqual(b.ladder, ['Cảnh giới 3 trên 11', ['is-done', 'is-done', 'is-now', ...Array(8).fill('-')]], 'thang 11 cảnh giới' + at);
      assert.match(b.sub, /Cấp 22 · Nhị lưu cao thủ · 30 điểm tu vi/, 'dòng phụ dưới tiêu đề' + at);
      assert.match(b.sub, /Cấp 10, 20 … 90 là ải đột phá/, 'Tâm pháp tu luyện nêu ải đột phá' + at);
      assert.match(b.sub, /Từ cấp 91, mỗi cấp tốn gấp đôi cấp trước: 4, 8, 16 … 1\.024 điểm ở cấp 99\. Cấp 100 là ải nặng nhất: 2\.048 điểm/, 'Tâm pháp tu luyện nêu thang gấp đôi' + at);
      // Bảng thang: đóng sẵn, mở ra thấy 11 dòng (ải đột phá ghi dưới điểm mỗi cấp), dòng hiện tại được tô; danh xưng 103 cấp.
      assert.equal(await page.locator('details.gr-scale table').isVisible(), false, 'bảng thang đóng sẵn' + at);
      const sum = await page.locator('details.gr-scale>summary').boundingBox();
      assert.ok(sum.height >= 36, 'nút mở bảng đủ cao' + at);
      assert.equal(await page.locator('details.gr-scale>summary').textContent(), 'Xem thang 103 cấp', 'nhãn nút mở bảng' + at);
      await page.click('details.gr-scale>summary');
      const t = await page.evaluate(() => ({
        rows: [...document.querySelectorAll('details.gr-scale tbody tr')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
        now: document.querySelector('details.gr-scale tr[aria-current=true] th').textContent,
        fits: (() => { const w = document.querySelector('.gr-scale-wrap'); return w.scrollWidth <= w.clientWidth + 1; })(),
        names: [...document.querySelectorAll('.gr-names li')].map((li) => li.textContent),
        current: [...document.querySelectorAll('.gr-names li[aria-current=true]')].map((li) => li.textContent),
        done: document.querySelectorAll('.gr-names li.is-done').length,
        gates: [...document.querySelectorAll('.gr-names li[data-gate] b')].map((b) => +b.textContent),
        realmNow: document.querySelector('.gr-names-realm.is-now > strong').textContent,
      }));
      assert.equal(t.rows.length, 11, 'bảng có 11 cảnh giới' + at);
      assert.equal(t.rows[0], 'Sơ nhập giang hồ1–90,50,5–4,5', 'dòng đầu' + at);
      assert.equal(t.rows[1], 'Tam lưu cao thủ10–191ải 3,58–17', 'dòng hai: ải đột phá cấp 10' + at);
      assert.equal(t.rows[9], 'Võ lâm chí tôn90–994–1.024gấp đôi mỗi cấpải 513,54.088–6.132', 'dòng Võ lâm chí tôn: gấp đôi mỗi cấp' + at);
      assert.equal(t.rows[10], 'Thần cảnh100–1032.048ải 2.0488.180–14.324', 'dòng Thần cảnh' + at);
      assert.equal(t.now, 'Nhị lưu cao thủ', 'tô dòng cảnh giới hiện tại' + at);
      assert.equal(t.fits, true, 'bảng vừa khung, không phải cuộn ngang' + at);
      assert.equal(t.names.length, 103, 'đủ danh xưng 103 cấp' + at);
      assert.deepEqual([t.names[0], t.names[9], t.names[99], t.names[102]], ['1 Sơ Tâm Khởi Bước', '10 Phá Quan Nhập Lưu', '100 Thành Thần', '103 Thần Vương'], 'danh xưng theo cấp' + at);
      assert.deepEqual(t.current, ['22 Chưởng Phong Sơ Hiện'], 'tô cấp hiện tại' + at);
      assert.equal(t.done, 21, 'các cấp đã qua' + at);
      assert.deepEqual(t.gates, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 'đánh dấu ải đột phá' + at);
      assert.equal(t.realmNow, 'Nhị lưu cao thủ', 'tô cảnh giới hiện tại trong danh xưng' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      // Báo cáo: ô cảnh giới có cấp.
      await page.click('[data-gr-report]');
      await page.waitForSelector('.gr-report');
      const tile = await page.locator('.gr-tile[data-tile=realm]').innerText();
      assert.match(tile.replace(/\s+/g, ' '), /Nhị lưu cao thủ Cấp 22\/100 · còn 1,5 điểm lên cấp 23/, 'báo cáo có cấp' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 3. Trước ải, cấp 100, thần cấp, cấp 103 và 0 điểm.
    for (const [half, rank, ahead] of [
      [34, 'Cấp 19/100 · Tam Lưu Viên Mãn', '17 điểm tu vi · còn 7 điểm lên cấp 20 · đột phá Nhị lưu cao thủ'],
      [8184, 'Cấp 91/100 · Lôi Đình Vạn Quân', '4.092 điểm tu vi · còn 8 điểm lên cấp 92'],
      [12264, 'Cấp 99/100 · Nhân Gian Cực Cảnh', '6.132 điểm tu vi · còn 2.048 điểm lên cấp 100 · đột phá thành Thần'],
      [16359, 'Cấp 99/100 · Nhân Gian Cực Cảnh', '8.179,5 điểm tu vi · còn 0,5 điểm lên cấp 100 · đột phá thành Thần'],
      [16360, 'Cấp 100/100 · Thành Thần', '8.180 điểm tu vi · còn 2.048 điểm lên cấp 101'],
      [20456, 'Thần cấp 1/3 · Thượng Thần', '10.228 điểm tu vi · còn 2.048 điểm lên cấp 102'],
      [28648, 'Thần cấp 3/3 · Thần Vương', '14.324 điểm tu vi · đã đạt Thần Vương, cấp tối cao'],
      [0, 'Chưa nhập cấp', '0 điểm tu vi · còn 0,5 điểm để nhập cấp 1'],
    ]) {
      const { context, page } = await h.open(width, { touch, workspace: seed(growth(half))() });
      await h.show(page, 'growth');
      assert.equal(await page.locator('.gr-rank').textContent(), rank, 'dòng cấp' + at);
      assert.equal(await page.locator('.gr-realm-ahead').textContent(), ahead, 'dòng điểm' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      await context.close();
    }
    // 4. Hoàn thành việc: lên cấp thì báo "lên cấp"; không lên cấp thì không báo; qua ải thì báo đột phá.
    for (const [half, expect] of [
      [6, /Chúc mừng! Thiếu hiệp lên cấp 8 · Tụ Khí Đan Điền \(Sơ nhập giang hồ\)\./], // 3 → 4 điểm
      [10, null], // 5 → 6 điểm: vẫn cấp 9 (ải cấp 10 cần 8 điểm)
      [14, /Chúc mừng! Thiếu hiệp đã đột phá, đạt cảnh giới Tam lưu cao thủ \(cấp 10\)\./], // 7 → 8 điểm
    ]) {
      const { context, page } = await h.open(width, { touch, workspace: seed(growth(half))() });
      await award(page);
      const toast = (await page.locator('#toast').textContent()) || '';
      if (expect) assert.match(toast, expect, 'báo lên cấp / đột phá' + at);
      else assert.doesNotMatch(toast, /lên cấp|đột phá/, 'không lên cấp thì không báo' + at);
      await context.close();
    }
    // 5. Qua ải cấp 100: nghi thức thành Thần.
    {
      const { context, page } = await h.open(width, { touch, workspace: seed(growth(16358))() }); // 8.179 → 8.180 điểm
      await award(page);
      await page.waitForSelector('dialog.gr-breakthrough[open]');
      const bt = await page.evaluate(() => {
        const d = document.querySelector('dialog.gr-breakthrough');
        return [d.querySelector('.eyebrow').textContent, d.querySelector('h2').textContent, d.querySelector('.gr-bt-text').textContent, d.querySelector('.gr-bt-next').textContent];
      });
      assert.deepEqual(bt, ['ĐỘT PHÁ THÀNH THẦN', 'Thần cảnh', 'Thiếu hiệp đã phá vỡ cánh cửa cuối cùng của nhân gian, thành Thần · cấp 100 · Thành Thần.', 'Trên Thần còn ba thần cấp, đỉnh cuối là Thần Vương.'], 'nghi thức thành Thần' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      await context.close();
    }
    {
      const spend = [{ id: 's1', d: day(-1), n: 'Ấm trà', p: [40, 0, 0, 0, 0, 0, 0, 0] }];
      const { context, page } = await h.open(width, { touch, workspace: seed(growth(60, { spend }))() });
      await h.show(page, 'growth');
      assert.equal(await page.locator('.gr-rank').textContent(), 'Cấp 22/100 · Chưởng Phong Sơ Hiện', 'đổi bảo vật không làm tụt cấp' + at);
      assert.match(await page.locator('[data-wallet=left]').innerText(), /10/, 'tu vi hiện có vẫn trừ phần đã đổi' + at);
      await context.close();
    }
  }
  console.log('growth-levels-browser ok');
} finally {
  await h.close();
}
