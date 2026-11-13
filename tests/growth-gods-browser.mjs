// v2.13.0 (Thần Giới): thế giới các vị thần phía sau Thiên Môn (dist/growth-gods.js) và khung "Thần giới" trong trang Tu vi.
// Yêu cầu của chủ dự án: 5 Thần Vương đứng đầu quản mọi sự vụ; 12 thần cao đẳng chủ quản 12 phương; 36 Thiên Cang tinh là chủ lực
// chiến đấu, bảo vệ Thần giới và các thế giới khác; thần vị không mở thêm, chỉ kế thừa từ vị sắp gác ngôi hoặc đi ngao du vũ trụ.
//  1. Dữ liệu: đúng 5 / 12 / 36 vị, tên không trùng; 12 phương theo mười hai địa chi; mỗi phương 3 Thiên Cang; ngôi Hằng Nguyệt là
//     ngôi thứ 36, thuộc phương Hợi; Thiên Hình (sứ giả ở chương 97) có trong 36 vị; một Thần Vương sắp gác ngôi đi ngao du vũ trụ;
//     danh xưng cấp 100–103 khớp thứ bậc (Thành Thần, Thượng Thần, Phương Thần, Thần Vương).
//  2. Khung Thần giới khi chưa thành Thần (cấp 22): ghi "Mở ở cấp 100"; Thiên đồ vẽ đủ 5 + 12 + 36; phương Hợi là ngôi bỏ trống,
//     ngôi Hằng Nguyệt "Chờ người kế thừa"; không bậc nào là bậc hiện tại.
//  3. Khi đã thành Thần (cấp 100): ghi "Ngôi Hằng Nguyệt · phương Hợi"; ngôi Hằng Nguyệt là "Ngôi của <danh hiệu>"; phương Hợi là
//     Huyết Nguyệt; bậc hiện tại là Thiên Cang tinh quân.
//  4. Giảm chuyển động: sao không nhấp nháy. Chưa chọn hiệp khách: không có khung.
// Kiểm ở 390 (chạm), 820 (chạm, tối), 1440 px; không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
// half = số nửa điểm: 60 → 30 điểm (cấp 22); 16360 → 8.180 điểm (cấp 100).
const seed = (half) => () => ({ schema: 1, projects: [], notes: [], growth: { v: 1, hero: 'nu', name: 'Lam Y', since: day(-40), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [half, 0, 0, 0, 0, 0, 0, 0] }] } });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const read = (page) =>
  page.evaluate(() => {
    const box = document.querySelector('.gr-gods-panel');
    if (!box) return null;
    box.querySelectorAll('details').forEach((d) => (d.open = true));
    const svg = box.querySelector('svg.gr-gods-chart');
    return {
      head: box.querySelector('h2').textContent, lead: box.querySelector('.help-copy').textContent, law: box.querySelector('.gr-gods-law').textContent,
      label: svg.getAttribute('aria-label'), role: svg.getAttribute('role'),
      kings: svg.querySelectorAll('.gr-gods-king').length, lords: [...svg.querySelectorAll('.gr-gods-lord text')].map((t) => t.textContent), stars: svg.querySelectorAll('.gr-gods-star').length,
      hoi: svg.querySelectorAll('.gr-gods-lord')[11].getAttribute('class'), seat: svg.querySelector('.gr-gods-star.is-seat').getAttribute('class'), seats: svg.querySelectorAll('.gr-gods-star.is-seat').length,
      twinkle: [...svg.querySelectorAll('.gr-gods-star')].filter((el) => getComputedStyle(el).animationName !== 'none').length,
      tiers: [...box.querySelectorAll('.gr-gods-tiers li')].map((li) => li.querySelector('b').textContent + ' ' + li.querySelector('strong').textContent),
      ranks: [...box.querySelectorAll('.gr-gods-rank')].map((li) => [li.querySelector('b').textContent, li.querySelector('strong').textContent, li.getAttribute('aria-current')]),
      kingList: [...box.querySelectorAll('.gr-gods-kings li')].map((li) => li.querySelector('strong').textContent + ' · ' + li.querySelector('em').textContent),
      retire: [...box.querySelectorAll('.gr-gods-kings li')].filter((li) => /ngao du vũ trụ/.test(li.textContent)).length,
      regions: [...box.querySelectorAll('.gr-gods-region')].map((li) => ({ chi: li.dataset.chi, head: li.querySelector('.gr-gods-region-head strong').textContent, sub: li.querySelector('.gr-gods-region-head small').textContent, stars: [...li.querySelectorAll('.gr-gods-stars > li')].map((s) => s.querySelector('b').textContent + ' ' + s.querySelector('strong').textContent), tag: li.querySelector('.gr-gods-tag')?.textContent || '' })),
      inside: (() => { const r = box.getBoundingClientRect(); return [...box.querySelectorAll('li, svg, p')].every((el) => { const b = el.getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1; }); })(),
    };
  });

const h = await startHarness({ seed: seed(60) });
try {
  // 1. Dữ liệu.
  {
    const { context, page } = await h.open(1440, { workspace: seed(60)() });
    await h.show(page, 'growth');
    const d = await page.evaluate(() => ({ g: window.zenGods, names: window.zenGrowth.LEVEL_NAMES.slice(100), said: window.zenTale.CHAPTERS.find((c) => c.lv === 97).pages.map((p) => p[2]).join(' ') }));
    const { KINGS, LORDS, STARS, RANKS, SEAT, VACANT } = d.g;
    assert.deepEqual([KINGS.length, LORDS.length, STARS.length], [5, 12, 36], '5 Thần Vương, 12 Phương thần, 36 Thiên Cang tinh');
    assert.equal(new Set([...KINGS, ...LORDS, ...STARS].map((x) => x.name)).size, 53, 'tên 53 vị không trùng nhau');
    assert.deepEqual(LORDS.map((l) => l.chi), ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'], '12 phương theo mười hai địa chi');
    assert.ok(KINGS.every((k) => k.rule && k.duty) && LORDS.every((l) => l.domain) && STARS.every((s) => s.duty), 'vị nào cũng có việc coi sóc');
    for (const l of LORDS) assert.equal(STARS.filter((s) => s.lord === l.i).length, 3, 'phương ' + l.chi + ' có 3 Thiên Cang');
    assert.deepEqual([STARS[SEAT].name, STARS[SEAT].no, LORDS[STARS[SEAT].lord].chi], ['Hằng Nguyệt', 36, 'Hợi'], 'ngôi Hằng Nguyệt là ngôi thứ 36, thuộc phương Hợi');
    assert.deepEqual([VACANT, LORDS[VACANT].chi, LORDS[VACANT].name], [11, 'Hợi', 'Huyết Nguyệt'], 'phương Hợi: ngôi bị đòi lại');
    assert.ok(STARS.some((s) => s.name === 'Thiên Hình'), 'Thiên Hình (chương 97) là một trong 36 Thiên Cang');
    assert.match(d.said, /Thiên Hình, một trong ba mươi sáu Thiên Cang tinh/, 'khớp với lời Thiên Hình trong truyện');
    assert.equal(KINGS.filter((k) => /ngao du vũ trụ/.test(k.note)).length, 1, 'một Thần Vương sắp gác ngôi đi ngao du vũ trụ');
    assert.deepEqual(RANKS.map((r) => [r.lv, r.name]), [[100, 'Thiên Cang tinh quân'], [101, 'Thượng Thần'], [102, 'Phương Thần'], [103, 'Thần Vương']], 'thứ bậc thần vị theo cấp');
    assert.deepEqual(d.names, ['Thành Thần', 'Thượng Thần', 'Phương Thần', 'Thần Vương'], 'danh xưng cấp 100–103 khớp thứ bậc');
    await context.close();
    // Chưa chọn hiệp khách: không có khung.
    const fresh = await h.open(390, { touch: true, workspace: { schema: 1, projects: [], notes: [] } });
    await h.show(fresh.page, 'growth');
    assert.equal(await fresh.page.locator('.gr-gods-panel').count(), 0, 'chưa chọn hiệp khách thì chưa có khung Thần giới');
    await fresh.context.close();
  }

  for (const [width, touch, style, theme] of [
    [390, true, 'giangho', 'light'],
    [820, true, 'zen', 'dark'],
    [1440, false, 'giangho', 'light'],
  ]) {
    const at = ' (' + width + 'px, ' + style + ', ' + theme + ')';
    const setup = ({ context }) => context.addInitScript((s) => localStorage.setItem('zen-style', s), style);
    // 2. Chưa thành Thần.
    {
      const { context, page } = await h.open(width, { touch, colorScheme: theme, workspace: seed(60)(), setup });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'growth');
      const r = await read(page);
      assert.match(r.head, /^Thần giới\s*Mở ở cấp 100$/, 'tiêu đề khi chưa thành Thần' + at);
      assert.match(r.lead, /Phía sau Thiên Môn.*Lam Y sẽ kế thừa một ngôi trong ba mươi sáu Thiên Cang/, 'lời dẫn' + at);
      assert.match(r.law, /^Thần vị không mở thêm, chỉ kế thừa\. Thần giới luôn có đúng 5 Thần Vương, 12 Phương thần và 36 Thiên Cang tinh\..*sắp gác ngôi hoặc sắp đi ngao du vũ trụ truyền lại\.$/, 'luật thần vị' + at);
      assert.equal(r.role, 'img', 'Thiên đồ là hình có nhãn đọc' + at);
      assert.match(r.label, /5 Thần Vương ở giữa, 12 Phương thần.*36 Thiên Cang tinh.*đang chờ người kế thừa/, 'nhãn đọc của Thiên đồ' + at);
      assert.deepEqual([r.kings, r.lords.length, r.stars, r.seats], [5, 12, 36, 1], 'Thiên đồ vẽ đủ 5 + 12 + 36, một ngôi Hằng Nguyệt' + at);
      assert.deepEqual(r.lords, ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'], 'mười hai địa chi trên Thiên đồ' + at);
      assert.match(r.hoi, /is-vacant/, 'phương Hợi: ngôi bỏ trống' + at);
      assert.doesNotMatch(r.seat, /is-mine/, 'ngôi Hằng Nguyệt chưa có chủ mới' + at);
      assert.ok(r.twinkle > 0, 'sao nhấp nháy' + at);
      assert.deepEqual(r.tiers, ['5 Thần Vương', '12 Phương thần', '36 Thiên Cang tinh'], 'ba tầng thần vị' + at);
      assert.deepEqual(r.ranks, [['Cấp 100', 'Thiên Cang tinh quân', null], ['Cấp 101', 'Thượng Thần', null], ['Cấp 102', 'Phương Thần', null], ['Cấp 103', 'Thần Vương', null]], 'thứ bậc theo cấp, chưa có bậc hiện tại' + at);
      assert.deepEqual(r.kingList, ['Thái Sơ Thần Vương · Chủ Sinh', 'Trường Lưu Thần Vương · Chủ Thời', 'Vạn Tượng Thần Vương · Chủ Giới', 'Minh Luật Thần Vương · Chủ Luật', 'Quy Nguyên Thần Vương · Chủ Tịch'], 'năm Thần Vương' + at);
      assert.equal(r.retire, 1, 'một vị sắp gác ngôi' + at);
      assert.equal(r.regions.length, 12, 'mười hai phương' + at);
      assert.ok(r.regions.every((x) => x.stars.length === 3), 'mỗi phương ba Thiên Cang' + at);
      assert.deepEqual(r.regions[0], { chi: 'Tý', head: 'Phương Tý · Huyền Minh phương thần', sub: 'Chủ quản đêm sâu và nước lặng.', stars: ['1 Minh Báo tinh quân', '2 Thông Bảo tinh quân', '3 Tịch Chiếu tinh quân'], tag: '' }, 'phương Tý' + at);
      assert.deepEqual(r.regions[11], { chi: 'Hợi', head: 'Phương Hợi · Ngôi bỏ trống', sub: 'Chủ cũ bị đày vì nuốt đồng liêu; chưa ai kế thừa.', stars: ['34 Phong Đăng tinh quân', '35 Vô Ba tinh quân', '36 Hằng Nguyệt tinh quân'], tag: 'Chờ người kế thừa' }, 'phương Hợi khi chưa thành Thần' + at);
      assert.ok(r.inside, 'mọi phần nằm trong khung' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 3 + 4. Đã thành Thần; giảm chuyển động.
    {
      const { context, page } = await h.open(width, { touch, colorScheme: theme, workspace: seed(16360)(), setup });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
      await h.show(page, 'growth');
      const r = await read(page);
      assert.match(r.head, /^Thần giới\s*Ngôi Hằng Nguyệt · phương Hợi$/, 'tiêu đề khi đã thành Thần' + at);
      assert.match(r.lead, /^Lam Y đã qua Thiên Môn và kế thừa ngôi Hằng Nguyệt, ngôi thứ 36 của Thiên Cang, thuộc phương Hợi\./, 'lời dẫn' + at);
      assert.match(r.label, /Ngôi Hằng Nguyệt ở phương Hợi đang sáng/, 'nhãn đọc của Thiên đồ' + at);
      assert.match(r.hoi, /is-blood/, 'phương Hợi: Huyết Nguyệt' + at);
      assert.match(r.seat, /is-mine/, 'ngôi Hằng Nguyệt sáng lên' + at);
      assert.equal(r.twinkle, 0, 'giảm chuyển động: sao đứng yên' + at);
      assert.deepEqual(r.ranks.map((x) => x[2]), ['step', null, null, null], 'bậc hiện tại: Thiên Cang tinh quân' + at);
      assert.deepEqual(r.regions[11], { chi: 'Hợi', head: 'Phương Hợi · Huyết Nguyệt phương thần', sub: 'Vô Yểm đòi lại ngôi cũ trong thân Lệ Vô Khuyết.', stars: ['34 Phong Đăng tinh quân', '35 Vô Ba tinh quân', '36 Hằng Nguyệt tinh quân'], tag: 'Ngôi của Lam Y' }, 'phương Hợi khi đã thành Thần' + at);
      assert.ok(r.inside, 'mọi phần nằm trong khung' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }
  console.log('growth-gods-browser ok');
} finally {
  await h.close();
}
