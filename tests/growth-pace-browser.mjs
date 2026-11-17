// v2.33.0 (Tam Niên Thành Thần), theo yêu cầu của chủ dự án: sửa công thức điểm tích lũy để hai năm đi hết 90 cấp đầu, phần còn
// lại tới Thành Thần (cấp 91–100) đi hết trong một năm.
//  - nhịp chuẩn 5,6 điểm mỗi ngày (chừng 5–6 việc): cấp 90 = 4.088 điểm = 730 ngày; cấp 91–100 = 2.046 điểm = 365 ngày;
//  - cấp 1–90 giữ nguyên thang v2.5.0; cấp 91–100 tốn 2, 4, 8 … 512, 1.024 điểm (mỗi cấp gấp đôi cấp trước), cấp 100 = 6.134 điểm;
//  - thần cấp vẫn 2.048 điểm mỗi cấp, nên cấp 103 = 12.278 điểm;
//  - không mốc nào cao hơn thang v2.10.0 (8.180 điểm tới cấp 100) nên không ai tụt cấp: kiểm trên lưới điểm dày từng nửa điểm;
//  - trang Tu vi, bảng thang và Lộ trình nêu đúng cách tính mới; 390/820/1440 px, không tràn ngang, không lỗi trang.
// Thang cũ dựng lại độc lập trong bài (không đọc từ trang) để so; chỉ mốc điểm ở đây là hằng số của yêu cầu mới.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
// half = số nửa điểm đã tích lũy (sổ cái lưu nửa điểm), dồn vào một chỉ số (đủ cho các cấp dưới 101).
const growth = (half) => ({ v: 1, hero: 'nam', since: day(-40), log: half ? [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [half, 0, 0, 0, 0, 0, 0, 0] }] : [] });
const seed = (g) => () => ({ schema: 1, projects: [], notes: [], growth: g });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const h = await startHarness({ seed: seed(growth(60)) });
try {
  // 1. Thang điểm (một lần, không phụ thuộc kích thước màn hình).
  {
    const { context, page } = await h.open(1440, { workspace: seed(growth(60))() });
    await h.show(page, 'growth');
    const m = await page.evaluate(() => {
      const g = window.zenGrowth, A = g.LEVEL_AT, cost = (n) => A[n] - A[n - 1];
      // Thang v2.10.0 dựng lại từ đầu: cấp 91 = 4 điểm rồi gấp đôi tới cấp 100; ải cấp 10 … 90; thần cấp 2.048.
      const N = [0.5, 1, 2.5, 5, 10.5, 21, 42.5, 85, 170.5, 4, 2048], G = [3.5, 7, 9.5, 19, 33.5, 67, 129.5, 259, 513.5];
      const old = [0];
      for (let n = 1; n <= 103; n++) old[n] = old[n - 1] + (n >= 91 && n <= 100 ? 4 * 2 ** (n - 91) : n % 10 === 0 && n <= 100 ? G[n / 10 - 1] : N[Math.min(10, Math.floor(n / 10))]);
      const oldLevel = (t) => {
        let l = 0;
        while (l < 103 && t >= old[l + 1]) l++;
        return l;
      };
      let drops = 0, lifts = 0, firstLift = null, lastLift = null;
      for (let t = 0; t <= 16000; t += 0.5) {
        const a = g.realmOf(t).level, b = oldLevel(t);
        if (a < b) drops++;
        if (a > b) {
          lifts++;
          if (firstLift === null) firstLift = t;
          lastLift = t;
        }
      }
      const round2 = (x) => Math.round(x * 100) / 100;
      return {
        len: A.length, at: [80, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103].map((n) => A[n]), cost: Array.from({ length: 10 }, (_, i) => cost(91 + i)), god: [101, 102, 103].map(cost),
        same: Array.from({ length: 90 }, (_, i) => i + 1).every((n) => A[n] === old[n]), above: Array.from({ length: 104 }, (_, i) => i).filter((n) => A[n] > old[n]),
        days: { l80: round2(A[80] / 5.6), l90: round2(A[90] / 5.6), tail: round2((A[100] - A[90]) / 5.6), l100: round2(A[100] / 5.6) },
        hardest: Array.from({ length: 99 }, (_, i) => cost(i + 1)).every((c) => c < cost(100)), drops, lifts, firstLift, lastLift,
        samples: [4091, 4092, 4300, 5109, 5110, 6133, 6134, 8180, 8182, 10228, 10230].map((t) => [t, oldLevel(t), g.realmOf(t).level]),
        need: [g.realmOf(4088).need, g.realmOf(6132).need, g.realmOf(6134).need, g.realmOf(6134).god], info: [g.realmInfo(10).cost, g.realmInfo(10).costTo, g.realmInfo(10).gate, g.realmInfo(11).gate],
        pageLevel: g.levelLabel(100),
      };
    });
    assert.equal(m.len, 104, 'đủ mốc cho cấp 0–103');
    assert.deepEqual(m.at, [2040, 4088, 4090, 4094, 4102, 4118, 4150, 4214, 4342, 4598, 5110, 6134, 8182, 10230, 12278], 'mốc cộng dồn: cấp 90 = 4.088, cấp 100 = 6.134, cấp 103 = 12.278 điểm');
    assert.deepEqual(m.cost, [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024], 'từ cấp 91, mỗi cấp gấp đôi cấp trước: 2, 4, 8 … 512, 1.024');
    assert.deepEqual(m.god, [2048, 2048, 2048], 'mỗi thần cấp vẫn 2.048 điểm');
    assert.equal(m.hardest, true, 'ải cấp 100 vẫn là cấp tốn nhiều điểm nhất của cõi người');
    assert.equal(m.same, true, 'cấp 1–90 giữ nguyên thang cũ');
    assert.deepEqual(m.above, [], 'không mốc nào cao hơn thang v2.10.0');
    // Nhịp chuẩn 5,6 điểm mỗi ngày: năm đầu tới cấp 80, hai năm tới cấp 90, ba năm thành Thần.
    assert.deepEqual(m.days, { l80: 364.29, l90: 730, tail: 365.36, l100: 1095.36 }, 'số ngày ở nhịp 5,6 điểm mỗi ngày');
    assert.ok(m.days.l90 <= 730 && m.days.l90 >= 700, 'hai năm đi hết 90 cấp đầu: ' + m.days.l90 + ' ngày');
    assert.ok(m.days.tail <= 366 && m.days.tail >= 330, 'một năm đi hết cấp 91–100: ' + m.days.tail + ' ngày');
    // Không ai tụt cấp; có người được lên cấp (mốc thấp hơn).
    assert.equal(m.drops, 0, 'không điểm nào ứng với cấp thấp hơn thang cũ');
    assert.ok(m.lifts > 0, 'có khoảng điểm được lên cấp so với thang cũ');
    assert.equal(m.firstLift, 4090, 'người được lên cấp sớm nhất: 4.090 điểm (cũ cấp 90, nay cấp 91)');
    assert.equal(m.lastLift, 14323.5, 'khoảng được lên cấp kết thúc ở 14.324 điểm, mốc cũ của Thần Vương (từ đó hai thang cùng cấp 103)');
    assert.deepEqual(
      m.samples,
      [
        [4091, 90, 91],
        [4092, 91, 91],
        [4300, 95, 96],
        [5109, 98, 98],
        [5110, 98, 99],
        [6133, 99, 99],
        [6134, 99, 100],
        [8180, 100, 100],
        [8182, 100, 101],
        [10228, 101, 101],
        [10230, 101, 102],
      ],
      'điểm mẫu: [điểm, cấp thang cũ, cấp thang mới]',
    );
    assert.deepEqual(m.need, [2, 2, 2048, true], 'còn 2 điểm lên cấp 91; còn 2 điểm thành Thần; vừa thành Thần còn 2.048 lên cấp 101');
    assert.deepEqual(m.info, [2, 512, 513.5, 1024], 'thông tin cảnh giới: cấp 91 = 2, cấp 99 = 512, ải cấp 90 = 513,5, ải cấp 100 = 1.024');
    assert.equal(m.pageLevel, 'Cấp 100/100');
    await context.close();
  }

  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 2. Trang Tu vi nêu đúng cách tính mới: 5.000 điểm = cấp 98 (thang cũ: cấp 97).
    {
      const { context, page } = await h.open(width, { touch, workspace: seed(growth(10000))() });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'growth');
      assert.equal(await page.locator('.gr-rank').textContent(), 'Cấp 98/100 · Bán Bộ Thành Thần', 'cấp ở 5.000 điểm' + at);
      assert.equal(await page.locator('.gr-realm-ahead').textContent(), '5.000 điểm tu vi · còn 110 điểm lên cấp 99', 'còn bao nhiêu điểm' + at);
      const main = await page.evaluate(() => document.querySelector('#main').innerText.replace(/\s+/g, ' '));
      assert.match(main, /Nhịp chuẩn của thang: khoảng 5,6 điểm mỗi ngày \(chừng 5–6 việc\): hai năm đi hết 90 cấp đầu, thêm một năm thì thành Thần ở cấp 100\./, 'Tâm pháp nêu nhịp chuẩn' + at);
      assert.match(main, /Từ cấp 91, mỗi cấp tốn gấp đôi cấp trước: 2, 4, 8 … 512 điểm ở cấp 99\. Cấp 100 là ải nặng nhất: 1\.024 điểm, gần bằng cả chín cấp trước cộng lại\. Đủ 6\.134 điểm thì đột phá thành Thần\. Trên Thần còn 3 thần cấp tới Thần Vương, mỗi thần cấp 2\.048 điểm\./, 'Tâm pháp nêu thang mới' + at);
      assert.doesNotMatch(main, /8\.180|14\.324|4, 8, 16|2\.048 điểm, bằng cả chín/, 'không còn con số của thang cũ' + at);
      await page.click('details.gr-scale>summary');
      const t = await page.evaluate(() => ({
        rows: [...document.querySelectorAll('details.gr-scale tbody tr')].slice(9).map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
        help: [...document.querySelectorAll('details.gr-scale > .help-copy')].map((p) => p.textContent.replace(/\s+/g, ' ').trim()),
        pace: document.querySelector('details.gr-scale .gr-pace')?.textContent || '',
        fits: (() => {
          const w = document.querySelector('.gr-scale-wrap');
          return w.scrollWidth <= w.clientWidth + 1;
        })(),
      }));
      assert.deepEqual(t.rows, ['Võ lâm chí tôn90–992–512gấp đôi mỗi cấpải 513,54.088–5.110', 'Thần cảnh100–1032.048ải 1.0246.134–12.278'], 'hai dòng cuối của bảng thang' + at);
      assert.match(t.help[0], /Từ cấp 91, mỗi cấp tốn gấp đôi cấp trước: 2, 4, 8 … 512 điểm; cấp 100 tốn 1\.024 điểm, gần bằng cả chín cấp trước cộng lại\. Cấp 100 thành Thần; ba thần cấp sau dẫn tới Thần Vương, mỗi thần cấp 2\.048 điểm\./, 'lời giải thích bảng thang' + at);
      assert.equal(t.pace, 'Thang dựng theo nhịp khoảng 5,6 điểm mỗi ngày (chừng 5–6 việc): hai năm đi hết 90 cấp đầu, thêm một năm thì thành Thần ở cấp 100.', 'nhịp chuẩn dưới bảng thang' + at);
      assert.equal(t.fits, true, 'bảng thang vừa khung' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 3. Các mốc quanh cấp 90, cấp 100: ghi đúng số điểm còn thiếu.
    for (const [half, rank, ahead] of [
      [8176, 'Cấp 90/100 · Đăng Phong Tạo Cực', '4.088 điểm tu vi · còn 2 điểm lên cấp 91'],
      [8180, 'Cấp 91/100 · Lôi Đình Vạn Quân', '4.090 điểm tu vi · còn 4 điểm lên cấp 92'],
      [12266, 'Cấp 99/100 · Nhân Gian Cực Cảnh', '6.133 điểm tu vi · còn 1 điểm lên cấp 100 · đột phá thành Thần'],
      [12268, 'Cấp 100/100 · Thành Thần', '6.134 điểm tu vi · còn 2.048 điểm lên cấp 101'],
      [16360, 'Cấp 100/100 · Thành Thần', '8.180 điểm tu vi · còn 2 điểm lên cấp 101'],
    ]) {
      const { context, page } = await h.open(width, { touch, workspace: seed(growth(half))() });
      await h.show(page, 'growth');
      assert.equal(await page.locator('.gr-rank').textContent(), rank, 'dòng cấp ' + half / 2 + ' điểm' + at);
      assert.equal(await page.locator('.gr-realm-ahead').textContent(), ahead, 'dòng điểm ' + half / 2 + ' điểm' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      await context.close();
    }
  }
  console.log('growth-pace-browser ok');
} finally {
  await h.close();
}
