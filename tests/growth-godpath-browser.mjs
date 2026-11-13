// v2.14.0 (Thần Lộ): đường lên Thần Vương sau cấp 100 (dist/growth-gods.js, dist/growth.js, dist/growth-story.js).
// Yêu cầu của chủ dự án: sau cấp 100, mỗi cấp chỉ tích đủ điểm kinh nghiệm là chưa đủ; có thám hiểm và chiến đấu với các vị thần.
// Lên các thần cấp cần đủ điểm lĩnh ngộ quy luật tự nhiên; từ thần thường lên thần trung đẳng phải thắng 35 Thiên Cang còn lại; lên
// Thần Vương phải thắng 12 vị thần của 12 phương và ngang tài với Thần Vương sắp nhường ngôi. Thần vị chỉ kế thừa.
//  1. Luật: 8 quy luật ứng với 8 chỉ số; lĩnh ngộ = điểm đã tích lũy của chỉ số. Mốc tu vi và mức lĩnh ngộ của từng trận; các trận
//     thắng lần lượt; chiến tích không giảm khi cộng thêm điểm. realmOf(t, s) giữ cấp khi đủ điểm mà thiếu chiến tích (held);
//     realmOf(t) không truyền điểm chỉ số thì tính thuần theo điểm.
//  2. Đủ điểm mà lệch: dồn hết điểm vào một chỉ số thì vẫn ở cấp 100, trang ghi "còn thiếu chiến tích ở Thần giới".
//  3. Đang đi (9.000 điểm, Tĩnh Động mới 100): thắng 2/35; trận kế tiếp nêu rõ còn thiếu gì; chiến ký của trận đã thắng đọc được,
//     trận chưa thắng thì không; dấu đã đọc notice:god-s1.
//  4. Cộng điểm đúng chỉ số còn thiếu: thắng thêm trận, chiến ký tự mở dù chưa lên cấp; dữ liệu Tu vi không thêm khóa.
//  5. Thượng Thần (11.000 điểm, đều): thắng 35/35 và 4/12; mười hai phương đều đã thám hiểm.
//  6. Thần Vương (14.324 điểm, đều): mọi trận đã thắng; phương Hợi và ngôi chủ Thời thành ngôi của hiệp khách; đọc được Song thần
//     chi chiến (có tranh Giáo chủ) và trận kế vị.
//  7. Chưa thành Thần: khung nêu luật và lĩnh ngộ hiện có, chưa có trận nào.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px; không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const project = { id: 'p1', name: 'Dự án A', description: '', color: '#7950c8', icon: '✺', columns: ['Idea', 'List', 'Doing', 'Done'], columnNames: { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang thực hiện', Done: 'Hoàn thành' }, tasks: [{ id: 'p1t0', title: 'Ngồi thiền', col: 'Doing', description: '', due: day(3), tag: 'Công việc', priority: 'q2', checks: [] }] };
// p = số nửa điểm của tám chỉ số (Nghiệp quả, Tài lộc, Tâm cảnh, Nhân duyên, Thể lực, Trí tuệ, Sự nghiệp, Tinh thần).
const seed = (p) => () => ({ schema: 1, projects: [structuredClone(project)], notes: [], growth: { v: 1, hero: 'nu', name: 'Lam Y', since: day(-900), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p }] } });
const one = (half) => [half, 0, 0, 0, 0, 0, 0, 0];
const even = (half) => Array(8).fill(half / 8);
const WALK = [4000, 3000, 200, 2600, 2000, 2000, 2200, 2000]; // 9.000 điểm; Tâm cảnh (Tĩnh Động) mới 100
const NEAR = [4000, 3000, 298, 2600, 2000, 2000, 2200, 2000]; // Tĩnh Động 149: thiếu 1 điểm cho trận thứ ba
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const read = (page) =>
  page.evaluate(() => {
    const box = document.querySelector('.gr-gods-panel');
    box.querySelectorAll('details').forEach((d) => (d.open = true));
    const next = box.querySelector('.gr-gods-next');
    return {
      rank: document.querySelector('.gr-rank').textContent, ahead: document.querySelector('.gr-realm-ahead').textContent,
      now: [...box.querySelectorAll('.gr-gods-rank')].map((li) => [li.querySelector('strong').textContent, li.getAttribute('aria-current'), li.querySelector('.gr-gods-count')?.textContent || '']),
      rules: [...box.querySelectorAll('.gr-gods-rule')].map((x) => x.textContent),
      road: box.querySelector('.gr-gods-road .help-copy').textContent,
      next: { cls: next.className, id: next.dataset.next || '', kind: next.querySelector('em')?.textContent || '', title: next.querySelector('strong')?.textContent || '', lines: [...next.querySelectorAll('li')].map((li) => li.textContent), text: next.textContent },
      laws: [...box.querySelectorAll('.gr-gods-lawrow')].map((li) => [li.querySelector('strong').textContent, li.querySelector('small').textContent.split(' · ')[0], li.querySelector('b').textContent, li.classList.contains('is-short'), li.querySelector('[role=progressbar]').getAttribute('aria-valuenow')]),
      chart: { won: box.querySelectorAll('.gr-gods-star.is-won').length, next: box.querySelectorAll('.gr-gods-star.is-next').length, lords: box.querySelectorAll('.gr-gods-lord.is-won').length, hoi: box.querySelectorAll('.gr-gods-lord')[11].getAttribute('class'), king: box.querySelectorAll('.gr-gods-king.is-mine').length, label: box.querySelector('svg').getAttribute('aria-label') },
      summary: box.querySelectorAll('details summary')[1].textContent,
      stars: [...box.querySelectorAll('.gr-gods-stars > li')].map((li) => ({ no: li.dataset.star, tag: li.querySelector('.gr-gods-tag')?.textContent || '', need: li.querySelector('.gr-gods-need')?.textContent || '', read: li.querySelector('button[data-gr-story]')?.dataset.grStory || '' })),
      regions: [...box.querySelectorAll('.gr-gods-region')].map((li) => ({ chi: li.dataset.chi, head: li.querySelector('.gr-gods-region-head strong').textContent, need: li.querySelector('.gr-gods-region-head .gr-gods-need').textContent, tag: li.querySelector('.gr-gods-region-head .gr-gods-tag')?.textContent || '', read: li.querySelector('.gr-gods-region-head button')?.dataset.grStory || '', land: li.querySelector('.gr-gods-land')?.textContent || '', cls: li.className })),
      kings: [...box.querySelectorAll('.gr-gods-kings li')].map((li) => [li.querySelector('strong').textContent, li.classList.contains('is-mine'), li.querySelector('small').textContent]),
      inside: (() => { const r = box.getBoundingClientRect(); return [...box.querySelectorAll('li, svg, p, button')].every((el) => { const b = el.getBoundingClientRect(); return b.width === 0 || (b.left >= r.left - 1 && b.right <= r.right + 1); }); })(),
    };
  });
const dialog = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('dialog.gr-story[open]'), b = d.getBoundingClientRect();
    return { god: d.classList.contains('is-god'), eyebrow: d.querySelector('.eyebrow').textContent, title: d.querySelector('#gr-story-title').textContent, sub: d.querySelector('.gr-story-head small').textContent, who: d.querySelector('.gr-story-who')?.textContent || '', text: d.querySelector('.gr-story-text')?.textContent || '', lesson: d.querySelector('.gr-story-lesson p')?.textContent || '', foe: d.querySelector('.gr-story-foe svg')?.dataset.foe || '', dots: d.querySelector('.gr-story-dots').getAttribute('aria-label'), fits: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight };
  });

const h = await startHarness({ seed: seed(WALK) });
try {
  // 1. Luật.
  {
    const { context, page } = await h.open(1440, { workspace: seed(WALK)() });
    await h.show(page, 'growth');
    const m = await page.evaluate(() => {
      const g = window.zenGods, G = window.zenGrowth, ev = (t) => Array(8).fill(t / 8), one = (t) => [t, 0, 0, 0, 0, 0, 0, 0];
      const texts = [...g.STARS.slice(0, 35).flatMap((s) => [s.scene, s.say, s.win, s.lose]), ...g.LORDS.slice(0, 11).flatMap((l) => [l.scene, l.say, l.win, l.lose, l.land])];
      // Cộng thêm điểm thì chiến tích không bao giờ giảm.
      let seedN = 7, mono = true;
      const rnd = () => (seedN = (seedN * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 300 && mono; i++) {
        const s = Array.from({ length: 8 }, () => Math.round(rnd() * 4000) / 2), a = g.progress(s.reduce((x, y) => x + y, 0), s);
        const s2 = s.map((v) => v + Math.round(rnd() * 400) / 2), b = g.progress(s2.reduce((x, y) => x + y, 0), s2);
        mono = b.stars >= a.stars && b.lords >= a.lords && (b.king || !a.king);
      }
      const low = ev(14324);
      low[5] = 1199.5;
      const held = G.realmOf(14324, one(14324));
      return {
        laws: g.LAWS.map((l) => l.name + '=' + G.AXES[l.i].name), lawText: g.LAWS.every((l) => l.gist && l.lesson),
        starLaw: g.STARS.slice(0, 35).every((s) => s.law === s.i % 8), starNeed: [0, 7, 8, 15, 16, 23, 24, 31, 32, 34].map((i) => g.STARS[i].need),
        lordLaws: g.LORDS.map((l) => l.laws.length), lordNeed: g.LORDS.map((l) => l.need), kingNeed: g.KING_NEED, rivals: g.RIVALS,
        texts: texts.every((x) => typeof x === 'string' && x.length > 10 && x.length <= 240), unique: new Set(texts).size === texts.length,
        at: [g.starAt(1), g.starAt(3), g.starAt(35), g.lordAt(1), g.lordAt(5), g.lordAt(12), g.kingAt()], level: [G.LEVEL_AT[100], G.LEVEL_AT[101], G.LEVEL_AT[102], G.LEVEL_AT[103]],
        rising: Array.from({ length: 34 }, (_, i) => g.starAt(i + 2) > g.starAt(i + 1)).every(Boolean) && Array.from({ length: 11 }, (_, i) => g.lordAt(i + 2) > g.lordAt(i + 1)).every(Boolean),
        cases: [g.progress(8180, ev(8180)), g.progress(8239, ev(8239)), g.progress(14324, one(14324)), g.progress(10228, ev(10228)), g.progress(12276, ev(12276)), g.progress(14324, ev(14324)), g.progress(14324, low), g.progress(20000, [5000, 5000, 100, 5000, 1000, 1000, 1900, 1000])].map((p) => [p.stars, p.lords, p.king]),
        caps: [g.cap(8180, ev(8180)), g.cap(14324, one(14324)), g.cap(10228, ev(10228)), g.cap(12276, ev(12276)), g.cap(14324, ev(14324)), g.cap(14324, low)],
        held: [held.level, held.held, held.need, held.pct, held.top, held.title], pure: [G.realmOf(14324).level, G.realmOf(14324).held], even: [G.realmOf(14324, ev(14324)).level, G.realmOf(14324, ev(14324)).top], below: [G.realmOf(8179.5, one(8179.5)).level, G.realmOf(9000, one(9000)).held],
        won: g.wonIds(10400, ev(10400)).length + ':' + g.wonIds(10400, ev(10400)).slice(-2).join(','), wonAll: g.wonIds(14324, ev(14324)).length,
        mono, bad: [g.entry('g:s36'), g.entry('g:s0'), g.entry('g:l13'), g.entry('g:x')].every((x) => x === null), locked: [g.entry('g:s3').ok, g.entry('g:l12').ok, g.entry('g:k').ok, g.entry('g:s2').ok],
      };
    });
    assert.deepEqual(m.laws, ['Nhân Quả=Nghiệp quả', 'Lưu Thông=Tài lộc', 'Tĩnh Động=Tâm cảnh', 'Tương Sinh=Nhân duyên', 'Sinh Trưởng=Thể lực', 'Minh Lý=Trí tuệ', 'Tích Lũy=Sự nghiệp', 'Âm Dương=Tinh thần'], 'tám quy luật ứng với tám chỉ số');
    assert.ok(m.lawText && m.texts && m.unique, 'quy luật và mọi trận đều có lời riêng, mỗi đoạn ≤ 240 ký tự');
    assert.equal(m.rivals, 35, 'ba mươi lăm Thiên Cang còn lại');
    assert.ok(m.starLaw, 'Thiên Cang thứ k hỏi quy luật theo vòng tám');
    assert.deepEqual(m.starNeed, [150, 150, 250, 250, 350, 350, 450, 450, 550, 550], 'mức lĩnh ngộ của Thiên Cang tăng theo tốp tám vị');
    assert.deepEqual(m.lordLaws, [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 8], 'mỗi Phương thần hỏi hai quy luật; phương Hợi hỏi cả tám');
    assert.deepEqual(m.lordNeed, [625, 650, 675, 700, 725, 750, 775, 800, 825, 850, 875, 900], 'mức lĩnh ngộ của mười hai phương');
    assert.equal(m.kingNeed, 1200, 'ngang tài Thần Vương: cả tám quy luật từ 1.200');
    assert.deepEqual(m.level, [8180, 10228, 12276, 14324], 'mốc điểm các thần cấp');
    assert.deepEqual(m.at, [8239, 8356, 10228, 10399, 11081.5, 12276, 14324], 'mốc tu vi của các trận: trận cuối mỗi chặng trùng mốc cấp');
    assert.ok(m.rising, 'mốc tu vi tăng dần');
    assert.deepEqual(m.cases, [[0, 0, false], [1, 0, false], [1, 0, false], [35, 0, false], [35, 12, false], [35, 12, true], [35, 12, false], [2, 0, false]], 'chiến tích theo tu vi và lĩnh ngộ; trận phải thắng lần lượt');
    assert.deepEqual(m.caps, [100, 100, 101, 102, 103, 102], 'thần cấp cao nhất mà chiến tích cho phép');
    assert.deepEqual(m.held, [100, true, 0, 100, false, 'Thành Thần'], 'đủ điểm mà lệch: giữ ở cấp 100');
    assert.deepEqual(m.pure, [103, false], 'realmOf(t) không truyền điểm chỉ số: tính thuần theo điểm');
    assert.deepEqual(m.even, [103, true], 'đủ điểm và đều: Thần Vương');
    assert.deepEqual(m.below, [99, false], 'dưới cấp 100 và chưa đủ điểm cấp 101: không bị giữ');
    assert.equal(m.won, '36:g:s35,g:l1', 'danh sách trận đã thắng theo thứ tự');
    assert.equal(m.wonAll, 48, '35 Thiên Cang + 12 Phương thần + Thần Vương');
    assert.ok(m.mono, 'cộng thêm điểm thì chiến tích không giảm');
    assert.ok(m.bad, 'mã trận không có thì không có chiến ký');
    assert.deepEqual(m.locked, [false, false, false, true], 'chỉ trận đã thắng mới đọc được');
    await context.close();
  }

  for (const [width, touch, style] of [
    [390, true, 'giangho'],
    [820, true, 'zen'],
    [1440, false, 'giangho'],
  ]) {
    const at = ' (' + width + 'px, ' + style + ')';
    const setup = ({ context }) => context.addInitScript((s) => localStorage.setItem('zen-style', s), style);
    const open = async (p, extra = {}) => {
      const o = await h.open(width, { touch, workspace: seed(p)(), setup, ...extra });
      o.errors = [];
      o.page.on('pageerror', (e) => o.errors.push(e.message));
      return o;
    };
    // 7. Chưa thành Thần (30 điểm).
    {
      const { context, page, errors } = await open(one(60));
      await h.show(page, 'growth');
      const r = await read(page);
      assert.match(r.road, /^Từ cấp 100, đủ điểm tu vi chưa đủ để lên cấp\. Mỗi thần cấp còn cần lĩnh ngộ quy luật tự nhiên và thắng các vị thần đang giữ ngôi/, 'lời dẫn đường lên Thần Vương' + at);
      assert.match(r.next.cls, /is-locked/, 'chưa có trận nào' + at);
      assert.equal(r.next.text, 'Thành Thần ở cấp 100 thì trận đầu tiên mở: Minh Báo tinh quân, phương Tý.', 'trận đầu tiên chờ ở cấp 100' + at);
      assert.deepEqual(r.rules, ['Đủ 10.228 điểm tu vi và thắng cả 35 Thiên Cang còn lại.', 'Đủ 12.276 điểm tu vi và thắng 12 Phương thần.', 'Đủ 14.324 điểm tu vi, lĩnh ngộ cả tám quy luật từ 1.200, và ngang tài với Trường Lưu Thần Vương.'], 'điều kiện lên từng thần cấp' + at);
      assert.deepEqual(r.laws.map((x) => x.slice(0, 3)), [['Nhân Quả', 'Nghiệp quả', '30'], ['Lưu Thông', 'Tài lộc', '0'], ['Tĩnh Động', 'Tâm cảnh', '0'], ['Tương Sinh', 'Nhân duyên', '0'], ['Sinh Trưởng', 'Thể lực', '0'], ['Minh Lý', 'Trí tuệ', '0'], ['Tích Lũy', 'Sự nghiệp', '0'], ['Âm Dương', 'Tinh thần', '0']], 'lĩnh ngộ hiện có của tám quy luật' + at);
      assert.ok(r.stars.every((s) => !s.read && s.tag !== 'Đã thắng' && s.tag !== 'Trận kế tiếp'), 'chưa có chiến tích' + at);
      assert.equal(r.stars[0].need, 'Quy luật Nhân Quả · cần 150', 'mỗi Thiên Cang ghi quy luật và mức cần' + at);
      assert.equal(r.regions[4].need, 'Quy luật Lưu Thông, Tương Sinh · cần 725', 'mỗi phương ghi hai quy luật và mức cần' + at);
      assert.equal(r.regions[11].need, 'Cả tám quy luật · cần 900', 'phương Hợi cần cả tám quy luật' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 2. Đủ điểm cấp 101 mà dồn vào một chỉ số.
    {
      const { context, page, errors } = await open(one(20456));
      await h.show(page, 'growth');
      const r = await read(page);
      assert.equal(r.rank, 'Cấp 100/100 · Thành Thần', 'vẫn ở cấp 100' + at);
      assert.equal(r.ahead, '10.228 điểm tu vi · đã đủ điểm lên cấp 101 · còn thiếu chiến tích ở Thần giới', 'trang nói rõ vì sao chưa lên cấp' + at);
      assert.deepEqual(r.now.map((x) => x[1]), ['step', null, null, null], 'bậc hiện tại: Thiên Cang tinh quân' + at);
      assert.equal(r.now[1][2], 'Đã thắng 1/35', 'mới thắng được một trận' + at);
      assert.deepEqual([r.next.id, r.next.title], ['g:s2', 'Trận kế tiếp: Thông Bảo tinh quân · phương Tý'], 'trận kế tiếp' + at);
      assert.deepEqual(r.next.lines, ['Tu vi 8.297,5 điểm · đã đủ', 'Lĩnh ngộ Lưu Thông 150 · đang có 0 · còn thiếu 150'], 'thiếu lĩnh ngộ chứ không thiếu điểm' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 3. Đang đi: 9.000 điểm, Tĩnh Động mới 100.
    {
      const { context, page, server, errors } = await open(WALK);
      await h.show(page, 'growth');
      const r = await read(page);
      assert.equal(r.ahead, '9.000 điểm tu vi · còn 1.228 điểm lên cấp 101', 'chưa đủ điểm thì vẫn đếm điểm' + at);
      assert.deepEqual(r.now.map((x) => x[2]), ['', 'Đã thắng 2/35', 'Đã thắng 0/12', 'Chưa giao đấu'], 'chiến tích trên thứ bậc' + at);
      assert.deepEqual([r.next.id, r.next.kind, r.next.title], ['g:s3', 'Tinh đấu 3/35', 'Trận kế tiếp: Tịch Chiếu tinh quân · phương Tý'], 'trận kế tiếp' + at);
      assert.deepEqual(r.next.lines, ['Tu vi 8.356 điểm · đã đủ', 'Lĩnh ngộ Tĩnh Động 150 · đang có 100 · còn thiếu 50'], 'trận kế tiếp nêu rõ còn thiếu gì' + at);
      assert.deepEqual(r.laws.filter((x) => x[3]).map((x) => x[0]), ['Tĩnh Động'], 'quy luật còn thiếu được đánh dấu' + at);
      assert.deepEqual(r.laws.map((x) => x[2]), ['2.000', '1.500', '100', '1.300', '1.000', '1.000', '1.100', '1.000'], 'lĩnh ngộ = điểm đã tích lũy của từng chỉ số' + at);
      assert.deepEqual([r.laws[0][4], r.laws[2][4], r.laws[4][4]], ['100', '8', '83'], 'thanh lĩnh ngộ so với mức 1.200' + at);
      assert.deepEqual([r.chart.won, r.chart.next, r.chart.lords], [2, 1, 0], 'Thiên đồ: hai sao đã thắng, một sao kế tiếp' + at);
      assert.match(r.chart.label, /Đã thắng 2 trên 35 Thiên Cang và 0 trên 12 Phương thần\.$/, 'nhãn đọc của Thiên đồ' + at);
      assert.equal(r.summary, 'Thám hiểm mười hai phương · thắng 2/35 Thiên Cang, 0/12 Phương thần', 'tóm tắt thám hiểm' + at);
      assert.deepEqual(r.stars.slice(0, 4).map((s) => [s.tag, s.read]), [['Đã thắng', 'g:s1'], ['Đã thắng', 'g:s2'], ['Trận kế tiếp', ''], ['', '']], 'trạng thái từng trận' + at);
      assert.equal(r.stars[35].tag, 'Ngôi của Lam Y', 'ngôi Hằng Nguyệt không phải đối thủ' + at);
      assert.ok(r.regions.every((x) => !x.land), 'chưa phương nào thám hiểm xong' + at);
      assert.ok(r.inside, 'mọi phần nằm trong khung' + at);
      // Chiến ký của trận đã thắng.
      await page.click('[data-gr-story="g:s1"]');
      await page.waitForSelector('dialog.gr-story[open]');
      let d = await dialog(page);
      assert.deepEqual([d.god, d.eyebrow, d.title, d.sub], [true, 'THẦN GIỚI · TINH ĐẤU 1 / 35', 'Đấu Minh Báo tinh quân', 'Phương Tý · quy luật Nhân Quả'], 'đầu chiến ký' + at);
      assert.deepEqual([d.who, d.dots], ['Truyện ký', 'Trang 1 trên 5'], 'trang đầu là lời kể' + at);
      assert.ok(d.fits, 'bảng vừa màn hình' + at);
      await page.keyboard.press('ArrowRight');
      d = await dialog(page);
      assert.equal(d.who, 'Minh Báo tinh quân', 'vị thần tự nói' + at);
      assert.match(d.text, /^Tân thần muốn thách ta thì trả lời đi/, 'lời thách' + at);
      await page.keyboard.press('ArrowRight');
      assert.match((await dialog(page)).text, /^Lam Y không kể được hết, vì chính nàng cũng không nhớ/, 'lời kể điền danh hiệu và xưng hô' + at);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      assert.match((await dialog(page)).lesson, /^Quy luật Nhân Quả\. Việc tốt nhỏ làm hôm nay là hạt giống của ngày sau\./, 'Tâm đắc theo quy luật' + at);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
      await page.waitForFunction(() => readReceiptKeys.has('notice:god-s1'));
      assert.ok(server.receipts.includes('notice:god-s1'), 'dấu đã đọc chiến ký: ' + server.receipts + at);
      assert.equal(await page.evaluate(() => window.zenStory.open('g:s3')), false, 'trận chưa thắng thì chưa có chiến ký' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 4. Cộng 1 điểm Tâm cảnh: Tĩnh Động 149 → 150. Quy luật còn thiếu vừa đủ nên thắng liền từ trận 3 tới trận 10 (trận 11 cần
    //    Tĩnh Động 250); chiến ký của trận đầu tiên trong chuỗi tự mở dù chưa lên cấp, các trận sau đọc trong khung.
    {
      const { context, page, server, errors } = await open(NEAR);
      await h.show(page, 'board');
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[0], 'Done'));
      await page.waitForSelector('#growth-award[open]');
      await page.click('[data-gr-plus="2"]');
      await page.click('[data-gr-plus="2"]');
      await page.click('[data-gr-save]');
      await page.mouse.move(2, 2);
      await page.waitForSelector('dialog.gr-story[open]', { timeout: 5000 });
      const d = await dialog(page);
      assert.deepEqual([d.god, d.eyebrow, d.title], [true, 'THẦN GIỚI · TINH ĐẤU 3 / 35', 'Đấu Tịch Chiếu tinh quân'], 'thắng thêm trận thì chiến ký tự mở' + at);
      assert.equal(await page.locator('dialog.gr-breakthrough').count(), 0, 'không lên cấp nên không có nghi thức Đột phá' + at);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
      await page.waitForFunction(() => readReceiptKeys.has('notice:god-s3'));
      assert.deepEqual(Object.keys(server.workspace.growth).sort(), ['hero', 'log', 'name', 'since', 'spend', 'v'], 'dữ liệu Tu vi không thêm khóa mới' + at);
      await h.show(page, 'growth');
      const r = await read(page);
      assert.equal(r.now[1][2], 'Đã thắng 10/35', 'chiến tích tăng' + at);
      assert.equal(r.next.id, 'g:s11', 'trận kế tiếp là trận cần thêm lĩnh ngộ' + at);
      assert.deepEqual(r.next.lines, ['Tu vi 8.824 điểm · đã đủ', 'Lĩnh ngộ Tĩnh Động 250 · đang có 150 · còn thiếu 100'], 'trận kế tiếp nêu mức mới' + at);
      assert.deepEqual(r.stars.slice(2, 10).map((x) => x.read), ['g:s3', 'g:s4', 'g:s5', 'g:s6', 'g:s7', 'g:s8', 'g:s9', 'g:s10'], 'các trận trong chuỗi đều có chiến ký' + at);
      assert.match(r.regions[0].land, /^Đã thám hiểm: hồ nước đen dưới đáy đêm/, 'thắng đủ ba Thiên Cang của phương Tý: thám hiểm xong' + at);
      assert.match(r.regions[0].cls, /is-explored/, 'phương Tý được đánh dấu' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 5. Thượng Thần: 11.000 điểm chia đều.
    {
      const { context, page, errors } = await open(even(22000));
      await h.show(page, 'growth');
      const r = await read(page);
      assert.equal(r.rank, 'Thần cấp 1/3 · Thượng Thần', 'đã lên Thượng Thần' + at);
      assert.deepEqual(r.now.map((x) => x[1]), [null, 'step', null, null], 'bậc hiện tại' + at);
      assert.deepEqual([r.now[1][2], r.now[2][2]], ['Đã thắng 35/35', 'Đã thắng 4/12'], 'chiến tích' + at);
      assert.deepEqual([r.next.id, r.next.kind, r.next.title], ['g:l5', 'Phương đấu 5/12', 'Trận kế tiếp: Vân Vũ phương thần · phương Thìn'], 'trận kế tiếp là một Phương thần' + at);
      assert.deepEqual(r.next.lines, ['Tu vi 11.081,5 điểm · còn thiếu 81,5', 'Lĩnh ngộ Lưu Thông 725 · đang có 1.375 · đã đủ', 'Lĩnh ngộ Tương Sinh 725 · đang có 1.375 · đã đủ'], 'thiếu điểm chứ không thiếu lĩnh ngộ' + at);
      assert.deepEqual([r.chart.won, r.chart.next, r.chart.lords], [35, 0, 4], 'Thiên đồ' + at);
      assert.deepEqual(r.regions.slice(0, 6).map((x) => [x.tag, x.read]), [['Đã thắng', 'g:l1'], ['Đã thắng', 'g:l2'], ['Đã thắng', 'g:l3'], ['Đã thắng', 'g:l4'], ['Trận kế tiếp', ''], ['', '']], 'trạng thái mười hai phương' + at);
      assert.ok(r.regions.every((x) => x.land), 'mười hai phương đều đã thám hiểm' + at);
      assert.equal(r.regions[11].head, 'Phương Hợi · Huyết Nguyệt phương thần', 'phương Hợi còn là Huyết Nguyệt' + at);
      await page.click('[data-gr-story="g:s35"]');
      await page.waitForSelector('dialog.gr-story[open]');
      for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
      assert.match((await dialog(page)).text, /Lam Y thành Thượng Thần, đứng đầu Thiên Cang/, 'trận thứ 35 khép bằng việc thành Thượng Thần' + at);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
      await page.click('[data-gr-story="g:l1"]');
      await page.waitForSelector('dialog.gr-story[open]');
      const d = await dialog(page);
      assert.deepEqual([d.eyebrow, d.title, d.sub], ['THẦN GIỚI · PHƯƠNG ĐẤU 1 / 12', 'Đấu Huyền Minh phương thần', 'Phương Tý · quy luật Tĩnh Động và Âm Dương'], 'chiến ký một Phương thần' + at);
      await page.keyboard.press('Escape');
      assert.ok(r.inside, 'mọi phần nằm trong khung' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 6. Thần Vương: 14.324 điểm chia đều.
    {
      const { context, page, errors } = await open(even(28648));
      await h.show(page, 'growth');
      const r = await read(page);
      assert.equal(r.rank, 'Thần cấp 3/3 · Thần Vương', 'Thần Vương' + at);
      assert.deepEqual(r.now.map((x) => x[2]), ['', 'Đã thắng 35/35', 'Đã thắng 12/12', 'Đã ngang tài'], 'mọi trận đã thắng' + at);
      assert.match(r.next.cls, /is-done/, 'không còn trận nào' + at);
      assert.deepEqual([r.chart.won, r.chart.lords, r.chart.king], [35, 11, 1], 'Thiên đồ: ngôi chủ Thời sáng lên' + at);
      assert.match(r.chart.hoi, /is-mine/, 'phương Hợi thành ngôi của hiệp khách' + at);
      assert.deepEqual([r.regions[11].head, r.regions[11].read], ['Phương Hợi · Ngôi của Lam Y', 'g:l12'], 'phương Hợi sau Song thần chi chiến' + at);
      assert.deepEqual(r.kings.filter((k) => k[1]).map((k) => k[0]), ['Trường Lưu Thần Vương'], 'kế thừa ngôi của Trường Lưu' + at);
      assert.match(r.kings[1][2], /Ngôi này nay của Lam Y; Trường Lưu đã đi ngao du vũ trụ\./, 'vị cũ đi ngao du vũ trụ' + at);
      await page.click('[data-gr-story="g:l12"]');
      await page.waitForSelector('dialog.gr-story[open]');
      let d = await dialog(page);
      assert.deepEqual([d.eyebrow, d.title, d.sub, d.foe], ['THẦN GIỚI · PHƯƠNG ĐẤU 12 / 12', 'Song thần chi chiến', 'Phương Hợi · cả tám quy luật', 'giao'], 'Song thần chi chiến có tranh Giáo chủ' + at);
      await page.keyboard.press('ArrowRight');
      assert.equal((await dialog(page)).who, 'Vô Yểm Tà Thần', 'Tà thần nói qua thân Giáo chủ' + at);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
      assert.equal(await page.evaluate(() => window.zenStory.open('g:k')), true, 'mở được trận kế vị' + at);
      d = await dialog(page);
      assert.deepEqual([d.eyebrow, d.title, d.sub], ['THẦN GIỚI · TRẬN KẾ VỊ', 'Ngang dòng thời gian', 'Trường Lưu Thần Vương · chủ Thời'], 'trận kế vị' + at);
      await page.keyboard.press('ArrowRight');
      assert.equal((await dialog(page)).who, 'Trường Lưu Thần Vương', 'Thần Vương tự nói' + at);
      assert.ok(d.fits, 'bảng vừa màn hình' + at);
      await page.keyboard.press('Escape');
      assert.ok(r.inside, 'mọi phần nằm trong khung' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }
  console.log('growth-godpath-browser ok');
} finally {
  await h.close();
}
