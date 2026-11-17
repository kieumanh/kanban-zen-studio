// v2.54.0 (Ôn Tuần): nhìn lại một tuần và chọn tối đa 3 việc cho tuần tới, dist/weekly-review.js.
// A. Dữ liệu: máy chủ giả dùng đúng hàm kiểm của máy chủ thật (validWorkspace): doneAt hợp lệ được nhận, sai ngày / sai kiểu bị từ chối, bản cũ không có doneAt vẫn hợp lệ,
//    ghi chú có weekPicks vẫn hợp lệ; ứng dụng dùng valid() cho cùng kết luận.
// B. Ghi ngày hoàn thành: chuyển một việc sang cột Hoàn thành ghi doneAt = hôm nay (giờ Việt Nam) và lên máy chủ; đưa ra khỏi cột Hoàn thành thì bỏ doneAt; việc đã xong từ trước
//    không bị ghi; khi cả khối dữ liệu bị thay (đồng bộ / khôi phục) thì việc đang ở cột Hoàn thành không bị ghi nhầm là xong hôm nay.
// C. Giao diện ở 390 (chạm) / 820 (chạm) / 1440 px × Thiền, tối, Giang hồ, giờ giả: thứ Sáu 20/11/2026 (giờ Việt Nam):
//    1. lệnh “Ôn tuần” trong bảng lệnh và lời mời ở Tổng quan (thứ Bảy, Chủ nhật, thứ Hai) mở hộp thoại; thứ Sáu thì chưa có lời mời;
//    2. hộp thoại: tuần 09/11 – 15/11; mục Đã xong (có việc đã lưu trữ, không có việc ngoài tuần / không có ngày); Chưa xong (quá hạn / đang làm / hạn trong tuần, cắt 8 + “và N việc nữa”);
//       Việc hằng ngày (n/mục tiêu); Thu chi (Thu, Chi, Dư/Hụt); chuyển “Tuần trước”; thứ Hai mặc định là tuần vừa qua;
//    3. chọn việc: tối đa 3 (ô còn lại bị khóa), bỏ chọn mở khóa, “Lưu lựa chọn” tạo đúng một ghi chú wk-<thứ Hai tuần tới> dạng checklist + weekPicks, lên máy chủ; mở lại thấy ô đã chọn;
//       lưu lần hai sửa chính ghi chú đó (giữ mục đã tích), không nhân đôi; chưa chọn gì thì báo lỗi, không lưu;
//    4. Tổng quan thứ Hai: khối “Việc trọng tâm tuần này” hiện các việc đã chọn, đánh dấu việc đã xong, bấm mở đúng việc; lời mời biến mất khi đã chọn;
//    5. chữ đủ tương phản, không tràn ngang, nút chạm ≥ 44 px, Giang hồ không còn chữ Thiền trong các phần mới, tên việc / dự án (chữ người dùng) giữ nguyên;
//       bản chỉ xem không mở được Ôn tuần và không có khối nào ở Tổng quan; không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';
import { validWorkspace } from '../server/api.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá hạn chờ: ' + label);
}
// Thứ Sáu 20/11/2026, 10:00 giờ Việt Nam. Tuần ôn: thứ Hai 16/11 – Chủ nhật 22/11. Tuần tới: 16/11 – 22/11.
const FRI = '2026-11-13T03:00:00Z';
const SAT = '2026-11-14T03:00:00Z';
const MON = '2026-11-16T03:00:00Z';
const seed = () => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 16);
  const set = (i, o) => Object.assign(p1.tasks[i], o);
  // Đã xong trong tuần (doneAt 17/11 và 18/11 — cái sau đã lưu trữ), đã xong tuần trước, đã xong chưa có ngày.
  set(0, { title: 'Gửi báo giá', col: 'Done', due: '2026-11-10', doneAt: '2026-11-10' });
  set(1, { title: 'Dọn kho cũ', col: 'Done', due: '2026-11-03', doneAt: '2026-11-11', archived: true });
  set(2, { title: 'Việc xong tuần trước', col: 'Done', due: '2026-11-02', doneAt: '2026-11-05' });
  set(3, { title: 'Việc xong từ trước khi có ngày', col: 'Done', due: '2026-10-29' });
  // Chưa xong: quá hạn 2 ngày, đang làm không hạn, hạn cuối tuần, hạn xa (không vào “Chưa xong”, vẫn để chọn).
  set(4, { title: 'Chốt thực đơn', col: 'List', due: '2026-11-11' });
  set(5, { title: 'Soạn lịch khóa tu', col: 'Doing', due: '' });
  set(6, { title: 'Đặt xe đưa đón', col: 'List', due: '2026-11-15' });
  set(7, { title: 'Lên kế hoạch quý sau', col: 'List', due: '2026-12-30' });
  // Tám việc quá hạn để thử cắt danh sách: tổng “Chưa xong” = 3 (trên, trừ hạn xa) + 8 = 11.
  for (let i = 8; i < 16; i++) set(i, { title: 'Việc tồn ' + (i - 7), col: 'List', due: '2026-11-12' });
  p1.ledger = [
    { id: 'l1', type: 'in', amount: 3000000, category: 'Khóa tu', note: '', date: '2026-11-10' },
    { id: 'l2', type: 'out', amount: 1250000, category: 'Thuê chỗ', note: '', date: '2026-11-12' },
    { id: 'l3', type: 'out', amount: 999999, category: 'Tuần khác', note: '', date: '2026-11-03' },
  ];
  const p2 = makeProject('p2', 'Hương Thiền Nature — Website', '#c764a2', 2);
  Object.assign(p2.tasks[0], { title: 'Sửa trang chủ', col: 'List', due: '2026-12-05' });
  Object.assign(p2.tasks[1], { title: 'Hoàn tất bên p2', col: 'Done', doneAt: '2026-11-09' });
  return {
    schema: 1,
    projects: [p1, p2],
    notes: [],
    dailyHabits: [
      { id: 'h1', name: 'Thiền 10 phút', icon: '🧘', color: '#7950c8', createdAt: '2026-10-01', goal: 5, done: ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-05'] },
      { id: 'h2', name: 'Đọc vài trang sách', icon: '📖', color: '#2e7d5b', createdAt: '2026-10-01', done: ['2026-11-10'] },
      { id: 'h3', name: 'Tập muộn', icon: '🚶', color: '#3a6fb0', createdAt: '2026-11-30', done: [] },
    ],
  };
};
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const contrast = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
    const rgba = (css) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const mix = (c, under) => [0, 1, 2].map((i) => c[i] * c[3] + under[i] * (1 - c[3]));
    const lum = ([r, g, b]) => [r, g, b].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.push(getComputedStyle(n).backgroundColor);
    let bg = [255, 255, 255];
    for (const css of chain.reverse()) {
      const c = rgba(css);
      if (c[3] > 0) bg = mix(c, bg);
    }
    const fg = mix(rgba(getComputedStyle(el).color), bg), [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const taskOf = (server, id) => server.workspace.projects.flatMap((p) => p.tasks).find((t) => t.id === id);
const noteOf = (server, id) => (server.workspace.notes || []).find((n) => n.id === id);
const text = (page, sel) => page.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, ' ').trim() ?? null, sel);

// ---- A. Kiểm dữ liệu --------------------------------------------------------------------------------------------------------------
{
  const ok = (mut) => {
    const w = seed();
    mut(w.projects[0].tasks[4]);
    return validWorkspace(w);
  };
  assert.equal(validWorkspace(seed()), true, 'dữ liệu có doneAt hợp lệ');
  assert.equal(ok((t) => (t.doneAt = '2026-11-11')), true, 'doneAt hợp lệ');
  assert.equal(ok((t) => (t.doneAt = '2026-13-40')), false, 'ngày sai bị từ chối');
  assert.equal(ok((t) => (t.doneAt = 'hôm qua')), false, 'ngày không đúng dạng bị từ chối');
  assert.equal(ok((t) => (t.doneAt = 20261118)), false, 'ngày sai kiểu bị từ chối');
  const plain = seed();
  for (const p of plain.projects) for (const t of p.tasks) delete t.doneAt;
  assert.equal(validWorkspace(plain), true, 'dữ liệu cũ không có doneAt vẫn hợp lệ');
  const withNote = seed();
  withNote.notes.push({ id: 'wk-2026-11-16', type: 'todo', title: 'Việc trọng tâm tuần 16/11 – 22/11', text: '', url: '', group: '', color: '#7950c8', items: [{ text: 'Gửi báo giá', done: false }], weekPicks: [{ p: 'p1', t: 'p1t0' }], weekOf: '2026-11-16' });
  assert.equal(validWorkspace(withNote), true, 'ghi chú việc tuần hợp lệ');
  console.log('PASS: máy chủ kiểm doneAt và ghi chú việc tuần');
}

const h = await startHarness({ seed });
try {
  // ---- B. Ghi ngày hoàn thành ----------------------------------------------------------------------------------------------------
  {
    const { context, page, server } = await h.open(1440, { workspace: seed(), now: FRI });
    await h.show(page, 'projects');
    const r = await page.evaluate(() => {
      const p = project('p1');
      const out = {};
      out.clientOk = valid(structuredClone(data));
      // 1. Chuyển sang Hoàn thành: ghi ngày. 2. Đưa ra: bỏ ngày. 3. Việc đã xong từ trước: không bị đụng.
      const t = p.tasks.find((x) => x.id === 'p1t4');
      moveTask(p, t, 'Done');
      out.stamped = t.doneAt;
      moveTask(p, t, 'Doing');
      out.cleared = 'doneAt' in t;
      moveTask(p, t, 'Done');
      out.again = t.doneAt;
      out.untouched = project('p1').tasks.find((x) => x.id === 'p1t3').doneAt ?? null;
      out.kept = project('p1').tasks.find((x) => x.id === 'p1t0').doneAt;
      // 4. Thay cả khối dữ liệu (như đồng bộ từ máy khác): việc mới thấy ở cột Hoàn thành không bị ghi là hôm nay.
      const copy = structuredClone(data);
      copy.projects[0].tasks.find((x) => x.id === 'p1t6').col = 'Done';
      data = copy;
      render();
      save();
      out.replaced = data.projects[0].tasks.find((x) => x.id === 'p1t6').doneAt ?? null;
      // 5. Việc làm tiếp sau khi thay khối vẫn ghi bình thường.
      const q = data.projects[0];
      moveTask(q, q.tasks.find((x) => x.id === 'p1t7'), 'Done');
      out.afterReplace = q.tasks.find((x) => x.id === 'p1t7').doneAt;
      return out;
    });
    assert.equal(r.clientOk, true, 'ứng dụng nhận dữ liệu có doneAt');
    assert.equal(r.stamped, '2026-11-13', 'xong thì ghi ngày hôm nay theo giờ Việt Nam');
    assert.equal(r.cleared, false, 'đưa ra khỏi cột Hoàn thành thì bỏ ngày');
    assert.equal(r.again, '2026-11-13', 'xong lại thì ghi lại');
    assert.equal(r.untouched, null, 'việc đã xong từ trước không bị ghi ngày');
    assert.equal(r.kept, '2026-11-10', 'ngày đã có được giữ');
    assert.equal(r.replaced, null, 'thay cả khối dữ liệu không ghi nhầm ngày');
    assert.equal(r.afterReplace, '2026-11-13', 'sau khi thay khối, việc mới xong vẫn được ghi ngày');
    await until(() => taskOf(server, 'p1t4')?.doneAt === '2026-11-13' && taskOf(server, 'p1t7')?.doneAt === '2026-11-13', 'doneAt lên máy chủ');
    assert.equal(taskOf(server, 'p1t3').doneAt, undefined, 'máy chủ không có ngày cho việc cũ');
    await context.close();
    console.log('PASS: ghi ngày hoàn thành (xong, bỏ ra, xong lại, thay cả khối dữ liệu)');
  }

  // ---- C. Giao diện ---------------------------------------------------------------------------------------------------------------
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const [name, colorScheme, setup] of [
      ['Thiền', 'light', null],
      ['tối', 'dark', null],
      ['Giang hồ', 'light', GH],
    ]) {
      const giang = name === 'Giang hồ';
      const at = ' (' + width + 'px ' + name + ')';
      const { context, page, server } = await h.open(width, { touch, workspace: seed(), colorScheme, setup, now: FRI });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'dashboard');
      await page.waitForSelector('#main');

      // 1. Thứ Sáu chưa có lời mời; mở bằng bảng lệnh.
      assert.equal(await page.locator('.wf-review-invite').count(), 0, 'thứ Sáu chưa có lời mời' + at);
      await page.keyboard.press('Control+k');
      await page.waitForSelector('.studio-palette[open]');
      await page.keyboard.type(giang ? 'kiểm điểm' : 'ôn tuần');
      await page.waitForFunction(() => [...document.querySelectorAll('.studio-palette [role=option] span')].some((s) => /^(Ôn tuần|Kiểm điểm tuần)$/.test(s.textContent)));
      assert.equal(await page.locator('.studio-palette [role=option] span').first().textContent(), giang ? 'Kiểm điểm tuần' : 'Ôn tuần', 'lệnh trong bảng lệnh' + at);
      await page.keyboard.press('Enter');
      await page.waitForSelector('dialog.zen-review[open]');
      assert.equal(await page.locator('.studio-palette[open]').count(), 0, 'bảng lệnh đã đóng' + at);

      // 2. Nội dung các mục.
      const dlg = await page.evaluate(() => {
        const d = document.querySelector('dialog.zen-review');
        const sec = (k) => d.querySelector('[data-review-sec=' + k + ']');
        const rect = d.getBoundingClientRect();
        return {
          title: d.querySelector('h2').textContent,
          lead: d.querySelector('.zen-review-lead').textContent,
          pressed: [...d.querySelectorAll('[data-review-week]')].map((b) => [b.textContent, b.getAttribute('aria-pressed')]),
          doneHead: sec('done').querySelector('h3').innerText.replace(/\s+/g, ' ').trim(),
          done: [...sec('done').querySelectorAll('li')].map((li) => li.querySelector('strong').textContent),
          openHead: sec('open').querySelector('h3').innerText.replace(/\s+/g, ' ').trim(),
          open: [...sec('open').querySelectorAll('li')].map((li) => [li.querySelector('strong').textContent, li.querySelector('small').innerText.replace(/\s+/g, ' ').trim()]),
          more: sec('open').querySelector('.zen-review-more')?.textContent || '',
          habitsHead: sec('habits').querySelector('h3').innerText.replace(/\s+/g, ' ').trim(),
          habits: [...sec('habits').querySelectorAll('li')].map((li) => li.innerText.replace(/\s+/g, ' ').trim()),
          moneyHead: sec('money').querySelector('h3').innerText.trim(),
          money: sec('money').innerText.replace(/\s+/g, ' ').trim(),
          picksHead: sec('picks').querySelector('h3').innerText.trim(),
          picks: d.querySelectorAll('input[name=pick]').length,
          checked: d.querySelectorAll('input[name=pick]:checked').length,
          count: d.querySelector('.zen-review-count').textContent,
          inside: rect.left >= -0.5 && rect.right <= innerWidth + 0.5,
        };
      });
      assert.equal(dlg.title, giang ? 'Kiểm điểm tuần' : 'Ôn tuần', 'tiêu đề' + at);
      assert.match(dlg.lead, /^Tuần 09\/11 – 15\/11\/2026$/, 'tuần ôn là tuần đang chạy' + at);
      assert.deepEqual(dlg.pressed, [['Tuần trước', 'false'], ['Tuần này', 'true']], 'đang chọn tuần này' + at);
      assert.equal(dlg.doneHead, giang ? 'Công thành 3 nhiệm vụ' : 'Đã xong 3 việc', 'tiêu đề Đã xong' + at);
      assert.deepEqual(dlg.done, ['Hoàn tất bên p2', 'Gửi báo giá', 'Dọn kho cũ'], 'đã xong trong tuần theo ngày (kể cả đã lưu trữ), không có việc ngoài tuần hay không có ngày' + at);
      assert.equal(dlg.openHead, giang ? 'Chưa thành 11 nhiệm vụ' : 'Chưa xong 11 việc', 'tiêu đề Chưa xong' + at);
      assert.equal(dlg.open.length, 8, 'danh sách chưa xong cắt ở 8' + at);
      assert.equal(dlg.more, giang ? 'và 3 nhiệm vụ nữa' : 'và 3 việc nữa', 'phần còn lại' + at);
      assert.ok(dlg.open.every(([title]) => title !== 'Lên kế hoạch quý sau'), 'việc hạn xa không vào Chưa xong' + at);
      const overdue = dlg.open.find(([title]) => title === 'Chốt thực đơn');
      assert.ok(overdue, 'có việc quá hạn' + at);
      assert.match(overdue[1], giang ? /Lỡ hẹn 2 ngày$/ : /Quá hạn 2 ngày$/, 'quá hạn 2 ngày' + at);
      assert.deepEqual(dlg.open.slice(0, 2).map((x) => x[1].includes(giang ? 'Lỡ hẹn' : 'Quá hạn')), [true, true], 'việc quá hạn xếp trước' + at);
      assert.match(dlg.habitsHead, giang ? /^Nhật khóa 4\/12 lần luyện · 33%$/ : /^Việc hằng ngày 4\/12 lượt · 33%$/, 'thói quen: tổng lượt (việc tạo sau tuần không tính)' + at);
      assert.deepEqual(dlg.habits.length, 2, 'hai việc hằng ngày (việc tạo sau tuần bị bỏ)' + at);
      assert.match(dlg.habits[0], giang ? /Thiền 10 phút 3\/5 lần luyện$/ : /Thiền 10 phút 3\/5 lần$/, 'mục tiêu 5, làm 3' + at);
      assert.match(dlg.habits[1], giang ? /Đọc vài trang sách 1\/7 lần luyện$/ : /Đọc vài trang sách 1\/7 lần$/, 'không mục tiêu tính 7' + at);
      assert.equal(dlg.moneyHead, giang ? 'Ngân khố' : 'Thu chi', 'tiêu đề thu chi' + at);
      assert.match(dlg.money, giang ? /Thu ngân 3\.000\.000 ₫ Xuất ngân 1\.250\.000 ₫ Thặng dư 1\.750\.000 ₫/ : /Thu 3\.000\.000 ₫ Chi 1\.250\.000 ₫ Dư 1\.750\.000 ₫/, 'thu chi trong tuần (khoản tuần khác không tính)' + at);
      assert.match(dlg.picksHead, giang ? /^Chọn nhiệm vụ cho tuần 16\/11 – 22\/11$/ : /^Chọn việc cho tuần 16\/11 – 22\/11$/, 'tiêu đề chọn việc tuần tới' + at);
      assert.equal(dlg.picks, 13, 'mọi việc đang mở đều để chọn (dưới mức 15)' + at);
      assert.equal(dlg.checked, 0);
      assert.equal(dlg.count, 'Đã chọn 0/3');
      assert.equal(dlg.inside, true, 'hộp thoại nằm gọn trong màn hình' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      for (const s of ['.zen-review h2', '.zen-review-lead', '.zen-review-sec h3', '.zen-review-sec h3 small', '.zen-review-list li strong', '.zen-review-list small', '.zen-review-pick small', '.zen-review-hint', '.zen-review-count', '.zen-review-money', '.zen-review-weeks .active', '.zen-review-actions .btn:not(.primary)']) {
        const c = await contrast(page, s);
        assert.ok(c !== null && c >= 4.5, 'chữ ' + s + ' đủ tương phản (' + c?.toFixed(2) + ')' + at);
      }
      const targets = await page.evaluate(() => [...document.querySelectorAll('.zen-review .btn, .zen-review .exit-x, .zen-review-pick')].map((e) => e.offsetHeight));
      if (touch) assert.ok(targets.every((n) => n >= 43), 'nút và dòng chọn ≥ 44 px khi chạm (' + targets + ')' + at);
      // Chữ người dùng (tên việc, dự án) giữ nguyên; chữ Thiền không còn khi ở Giang hồ.
      const words = await page.evaluate(() => document.querySelector('dialog.zen-review').innerText);
      assert.ok(words.includes('Gửi báo giá') && words.includes('Khóa tu mùa thu'), 'tên việc và dự án giữ nguyên' + at);
      if (giang) assert.doesNotMatch(words.replace(/Khóa tu mùa thu|Hương Thiền Nature — Website/g, ''), /(Ôn tuần|Đã xong|Chưa xong|Việc hằng ngày|Thu chi|Quá hạn|\d+ việc\b|Lưu lựa chọn)/, 'không còn chữ Thiền trong hộp thoại' + at);

      // 3. Chọn tối đa 3 việc.
      const pick = (id) => page.locator('dialog.zen-review input[name=pick][value="' + id + '"]');
      await pick('p1|p1t4').check();
      await pick('p1|p1t5').check();
      await pick('p2|p2t0').check();
      assert.equal(await text(page, '.zen-review-count'), 'Đã chọn 3/3', 'đủ 3' + at);
      assert.equal(await page.locator('dialog.zen-review input[name=pick]:not(:checked):not(:disabled)').count(), 0, 'đủ 3 thì ô còn lại bị khóa' + at);
      await pick('p1|p1t5').uncheck();
      assert.equal(await page.locator('dialog.zen-review input[name=pick]:disabled').count(), 0, 'bỏ một ô thì mở khóa' + at);
      await pick('p1|p1t6').check();
      // Chưa chọn gì thì báo lỗi, không lưu: thử ở một lần mở khác bên dưới. Ở đây lưu 3 việc.
      await page.locator('dialog.zen-review [data-review-save]').click();
      await page.waitForFunction(() => !document.querySelector('dialog.zen-review[open]'));
      await until(() => noteOf(server, 'wk-2026-11-16'), 'ghi chú việc tuần lên máy chủ' + at);
      const note = noteOf(server, 'wk-2026-11-16');
      assert.equal(note.type, 'todo', 'ghi chú dạng checklist' + at);
      assert.equal(note.title, 'Việc trọng tâm tuần 16/11 – 22/11', 'tiêu đề ghi chú' + at);
      assert.deepEqual(note.items, [{ text: 'Chốt thực đơn', done: false }, { text: 'Đặt xe đưa đón', done: false }, { text: 'Sửa trang chủ', done: false }], 'ba mục theo thứ tự danh sách' + at);
      assert.equal(note.weekPicks.length, 3, 'ba việc được nhớ' + at);
      assert.equal(note.weekOf, '2026-11-16');
      assert.equal(server.workspace.notes.filter((n) => n.id === 'wk-2026-11-16').length, 1, 'đúng một ghi chú' + at);
      assert.equal(validWorkspace(server.workspace), true, 'dữ liệu lưu lên máy chủ hợp lệ' + at);
      await until(() => page.evaluate(() => /Đã (lưu|cất) 3 /.test(document.querySelector('#toast').textContent)), 'thông báo đã lưu' + at);
      assert.match(await text(page, '#toast'), giang ? /^Đã cất 3 nhiệm vụ cho tuần 16\/11 vào Tàng thư\.$/ : /^Đã lưu 3 việc cho tuần 16\/11 vào Ghi chú\.$/, 'thông báo' + at);

      // Mở lại: ô đã chọn được đánh dấu; sửa lựa chọn rồi lưu lần hai: sửa chính ghi chú, giữ mục đã tích.
      await page.evaluate(() => {
        const n = data.notes.find((x) => x.id === 'wk-2026-11-16');
        n.items[0].done = true;
        save();
      });
      await page.evaluate(() => window.zenWeeklyReview.open());
      await page.waitForSelector('dialog.zen-review[open]');
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('dialog.zen-review input[name=pick]:checked')].map((i) => i.value)), ['p1|p1t4', 'p1|p1t6', 'p2|p2t0'], 'mở lại thấy ô đã chọn' + at);
      await pick('p2|p2t0').uncheck();
      await pick('p1|p1t7').check();
      await page.locator('dialog.zen-review [data-review-save]').click();
      await page.waitForFunction(() => !document.querySelector('dialog.zen-review[open]'));
      await until(() => noteOf(server, 'wk-2026-11-16')?.items.some((i) => i.text === 'Lên kế hoạch quý sau'), 'lưu lần hai' + at);
      const again = noteOf(server, 'wk-2026-11-16');
      assert.equal(server.workspace.notes.filter((n) => n.id === 'wk-2026-11-16').length, 1, 'không nhân đôi ghi chú' + at);
      assert.deepEqual(again.items, [{ text: 'Chốt thực đơn', done: true }, { text: 'Đặt xe đưa đón', done: false }, { text: 'Lên kế hoạch quý sau', done: false }], 'giữ mục đã tích, thay mục đã đổi' + at);

      // Chưa chọn gì: báo lỗi, không đổi gì.
      await page.evaluate(() => window.zenWeeklyReview.open());
      await page.waitForSelector('dialog.zen-review[open]');
      for (const v of await page.evaluate(() => [...document.querySelectorAll('dialog.zen-review input[name=pick]:checked')].map((i) => i.value))) await pick(v).uncheck();
      await page.locator('dialog.zen-review [data-review-save]').click();
      assert.equal(await text(page, '.zen-review-status'), giang ? 'Hãy chọn ít nhất một nhiệm vụ.' : 'Hãy chọn ít nhất một việc.', 'chưa chọn thì báo lỗi' + at);
      assert.equal(await page.locator('dialog.zen-review[open]').count(), 1, 'hộp thoại vẫn mở' + at);
      assert.equal(noteOf(server, 'wk-2026-11-16').items.length, 3, 'ghi chú không đổi' + at);

      // Chuyển tuần.
      await page.locator('dialog.zen-review [data-review-week=prev]').click();
      const prev = await page.evaluate(() => ({
        lead: document.querySelector('.zen-review-lead').textContent,
        done: [...document.querySelectorAll('[data-review-sec=done] li strong')].map((e) => e.textContent),
        picks: document.querySelector('[data-review-sec=picks] h3').textContent,
        pressed: [...document.querySelectorAll('[data-review-week]')].map((b) => b.getAttribute('aria-pressed')),
      }));
      assert.equal(prev.lead, 'Tuần 02/11 – 08/11/2026', 'tuần trước' + at);
      assert.deepEqual(prev.done, ['Việc xong tuần trước'], 'việc xong tuần trước' + at);
      assert.match(prev.picks, /16\/11 – 22\/11$|09\/11 – 15\/11$/, 'tuần tới của tuần trước là tuần này' + at);
      assert.match(prev.picks, /09\/11 – 15\/11$/, 'chọn việc cho tuần 16/11' + at);
      assert.deepEqual(prev.pressed, ['true', 'false'], 'nút tuần trước được chọn' + at);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog.zen-review[open]'));

      // 4. Tổng quan thứ Hai: khối “Việc trọng tâm tuần này”, không còn lời mời (đã chọn xong).
      await page.close();
      const mon = await h.open(width, { touch, workspace: server.workspace, colorScheme, setup, now: MON });
      const monErrors = [];
      mon.page.on('pageerror', (e) => monErrors.push(e.message));
      await mon.page.evaluate(() => {
        const t = data.projects[0].tasks.find((x) => x.id === 'p1t4');
        t.col = 'Done';
        save();
      });
      await h.show(mon.page, 'dashboard');
      await mon.page.waitForSelector('.wf-review-focus');
      const focus = await mon.page.evaluate(() => {
        const el = document.querySelector('.wf-review-focus');
        const r = el.getBoundingClientRect();
        return {
          head: el.querySelector('h2').innerText.replace(/\s+/g, ' ').trim(),
          rows: [...el.querySelectorAll('.review-focus-row')].map((b) => [b.querySelector('strong').textContent, b.querySelector('small').innerText.replace(/\s+/g, ' ').trim(), b.classList.contains('is-done'), b.dataset.task]),
          invite: document.querySelectorAll('.wf-review-invite').length,
          inside: r.left >= 0 && r.right <= innerWidth + 0.5,
        };
      });
      assert.equal(focus.head, giang ? 'Nhiệm vụ trọng tâm tuần này 1/3 công thành' : 'Việc trọng tâm tuần này 1/3 xong', 'tiêu đề khối trọng tâm' + at);
      assert.deepEqual(focus.rows.map((r) => r[0]), ['Chốt thực đơn', 'Đặt xe đưa đón', 'Lên kế hoạch quý sau'], 'ba việc trọng tâm' + at);
      assert.deepEqual(focus.rows.map((r) => r[2]), [true, false, false], 'việc đã xong được đánh dấu' + at);
      assert.equal(focus.rows[0][1], giang ? 'Công thành' : 'Đã xong', 'nhãn đã xong' + at);
      assert.equal(focus.invite, 0, 'đã chọn rồi thì không còn lời mời' + at);
      assert.equal(focus.inside, true, 'khối nằm gọn trong màn hình' + at);
      for (const s of ['.wf-review-focus h2', '.wf-review-focus h2 small', '.wf-review-focus .review-focus-row strong', '.wf-review-focus .review-focus-row small']) {
        const c = await contrast(mon.page, s);
        assert.ok(c !== null && c >= 4.5, 'chữ ' + s + ' đủ tương phản (' + c?.toFixed(2) + ')' + at);
      }
      await mon.page.locator('.review-focus-row[data-task="p1t6"]').click();
      await mon.page.waitForSelector('#editor[open]');
      assert.equal(await mon.page.evaluate(() => document.querySelector('#editor-body [name=title]')?.value ?? document.querySelector('#editor-body h2')?.textContent), 'Đặt xe đưa đón', 'bấm mở đúng việc' + at);
      await mon.page.keyboard.press('Escape');
      await mon.page.waitForFunction(() => !document.querySelector('#editor[open]'));
      assert.equal(await noOverflow(mon.page), true, 'Tổng quan không tràn ngang' + at);

      // Thứ Hai mặc định ôn tuần vừa qua (09/11 – 15/11), tuần tới là tuần 16/11.
      await mon.page.evaluate(() => window.zenWeeklyReview.open());
      await mon.page.waitForSelector('dialog.zen-review[open]');
      assert.equal(await text(mon.page, '.zen-review-lead'), 'Tuần 09/11 – 15/11/2026', 'thứ Hai ôn tuần vừa qua' + at);
      assert.deepEqual(await mon.page.evaluate(() => [...document.querySelectorAll('[data-review-week]')].map((b) => b.getAttribute('aria-pressed'))), ['true', 'false'], 'thứ Hai chọn sẵn Tuần trước' + at);
      await mon.page.keyboard.press('Escape');
      await mon.page.waitForFunction(() => !document.querySelector('dialog.zen-review[open]'));
      assert.deepEqual(monErrors, [], 'không lỗi trang (thứ Hai)' + at + ': ' + monErrors);
      await mon.context.close();
      assert.deepEqual(errors, [], 'không lỗi trang' + at + ': ' + errors);
      await context.close();
    }
  }

  // ---- D. Lời mời cuối tuần, bản chỉ xem ---------------------------------------------------------------------------------------------
  {
    const { context, page, server } = await h.open(820, { touch: true, workspace: seed(), now: SAT });
    await h.show(page, 'dashboard');
    await page.waitForSelector('.wf-review-invite');
    assert.equal(await text(page, '.wf-review-invite h2'), 'Ôn tuần', 'thứ Bảy có lời mời');
    assert.equal(await page.locator('.wf-review-focus').count(), 0, 'chưa chọn thì chưa có khối trọng tâm');
    await page.locator('.wf-review-invite [data-review-open]').click();
    await page.waitForSelector('dialog.zen-review[open]');
    assert.equal(await text(page, '.zen-review-lead'), 'Tuần 09/11 – 15/11/2026', 'thứ Bảy ôn tuần đang chạy');
    await page.locator('dialog.zen-review input[name=pick]').first().check();
    await page.locator('dialog.zen-review [data-review-save]').click();
    await page.waitForFunction(() => !document.querySelector('dialog.zen-review[open]'));
    await until(() => noteOf(server, 'wk-2026-11-16'), 'ghi chú tuần tới');
    await page.waitForFunction(() => !document.querySelector('.wf-review-invite'));
    assert.equal(await page.locator('.wf-review-invite').count(), 0, 'đã chọn thì hết lời mời');
    await page.evaluate(() => {
      contentReadOnly = true;
      render();
    });
    assert.equal(await page.locator('.wf-review-panel').count(), 0, 'bản chỉ xem không có khối nào');
    await page.evaluate(() => window.zenWeeklyReview.open());
    assert.equal(await page.locator('dialog.zen-review').count(), 0, 'bản chỉ xem không mở được Ôn tuần');
    await context.close();
    console.log('PASS: lời mời cuối tuần, chọn từ lời mời, bản chỉ xem');
  }

  // ---- E. Ghi chú đã đủ 500: báo lỗi, không mất dữ liệu --------------------------------------------------------------------------------
  {
    const w = seed();
    w.notes = Array.from({ length: 500 }, (_, i) => ({ id: 'n' + i, type: 'note', title: 'Ghi chú ' + i, text: '', url: '', group: '', color: '#7950c8' }));
    const { context, page, server } = await h.open(1440, { workspace: w, now: FRI });
    await h.show(page, 'dashboard');
    await page.evaluate(() => window.zenWeeklyReview.open());
    await page.waitForSelector('dialog.zen-review[open]');
    await page.locator('dialog.zen-review input[name=pick]').first().check();
    await page.locator('dialog.zen-review [data-review-save]').click();
    assert.match(await text(page, '.zen-review-status'), /Tối đa 500 ghi chú/, 'đủ 500 ghi chú thì báo');
    assert.equal(await page.evaluate(() => data.notes.length), 500, 'không thêm ghi chú');
    assert.equal(server.workspace.notes.length, 500);
    await context.close();
    console.log('PASS: ghi chú đã đủ 500');
  }
  console.log('PASS: Ôn tuần — 390, 820, 1440px × Thiền, tối, Giang hồ (doneAt, nội dung các mục, chọn 3 việc, lưu / sửa ghi chú, khối trọng tâm, lời mời, chỉ xem)');
} finally {
  await h.close();
}
