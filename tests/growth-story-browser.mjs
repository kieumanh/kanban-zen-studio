// v1.92.0 (Truyện Ký): cốt truyện của hiệp khách trong mục Tu vi. Khai cuộc ở cấp 0, các chương theo cấp tới 100.
// v2.6.0 (Song Nguyệt): cốt truyện mới "Hằng Nguyệt và Huyết Nguyệt" (27 chương + khai cuộc); dấu đã đọc dùng khóa notice:tale-N.
// Bài này giữ nguyên các ý kiểm của v1.92.0, chỉ đổi tên chương, số trang và khóa theo truyện mới.
// v2.11.0 (Ẩn Tình): chương 1 viết lại có 10 trang (thêm chiếc đòn gánh cũ của sư phụ); Tiểu Mộc nói ở trang 4.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px:
//  1. Vượt mốc 5 cấp khi lưu công lực thì bảng hội thoại tự hiện đúng chương; lời thoại theo hiệp khách (danh hiệu, nàng / sư tỷ);
//     lật trang bằng nút và phím mũi tên; trang cuối là Tâm đắc; Khép sách đóng bảng.
//  2. Dấu đã đọc lưu bằng dấu đã đọc của tài khoản (notice:story-N), không thêm gì vào dữ liệu; tải lại không tự hiện lại;
//     chương đã đọc trên thiết bị khác thì không tự hiện.
//  3. Khung "Truyện ký giang hồ" trong trang Tu vi: chương đã mở đọc lại được, chương chưa tới cấp bị khóa; người mới chọn hiệp khách
//     thì có sẵn Khai cuộc để đọc.
//  4. Bảng vừa màn hình, không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const project = { id: 'p1', name: 'Dự án A', description: '', color: '#7950c8', icon: '✺', columns: ['Idea', 'List', 'Doing', 'Done'], columnNames: { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang thực hiện', Done: 'Hoàn thành' }, tasks: [{ id: 'p1t0', title: 'Gửi báo cáo', col: 'Doing', description: '', due: day(3), tag: 'Công việc', priority: 'q2', checks: [] }] };
// v2.5.0 (thang mới): 4 nửa điểm = 2 điểm (cấp 4); hoàn thành một việc cộng 1 điểm → 3 điểm (cấp 6), vượt mốc chương 1 ở cấp 5.
// (Thang v1.85.0 dùng 4,5 → 5,5 điểm.)
const growth = (extra = {}) => ({ v: 1, hero: 'nu', name: 'Lam Y', since: day(-40), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [4, 0, 0, 0, 0, 0, 0, 0] }], ...extra });
const seed = (g) => () => ({ schema: 1, projects: [structuredClone(project)], notes: [], ...(g ? { growth: g } : {}) });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const story = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('dialog.gr-story[open]');
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return {
      eyebrow: d.querySelector('.gr-story-head .eyebrow').textContent, title: d.querySelector('#gr-story-title').textContent,
      who: d.querySelector('.gr-story-who')?.textContent || '', text: d.querySelector('.gr-story-text')?.textContent || '', lesson: d.querySelector('.gr-story-lesson')?.textContent || '',
      next: d.querySelector('[data-story-next]').textContent, prevOff: d.querySelector('[data-story-prev]').disabled, fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
    };
  });
async function finishTask(page) {
  await h.show(page, 'board');
  await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[0], 'Done'));
  await page.waitForSelector('#growth-award[open]');
  await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-save]');
  // Con trỏ đang nằm đúng chỗ nút "Tiếp" sắp hiện; dời đi để nút không nhấp nháy theo hiệu ứng rê chuột.
  await page.mouse.move(2, 2);
}

const h = await startHarness({ seed: seed(growth()) });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { context, page, server } = await h.open(width, { touch, workspace: seed(growth())() });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // 1. Vượt cấp 5 → chương 1 tự hiện.
    await finishTask(page);
    await page.waitForSelector('dialog.gr-story[open]', { timeout: 5000 });
    let s = await story(page);
    assert.equal(s.eyebrow, 'TRUYỆN KÝ GIANG HỒ · CHƯƠNG 1 / 27', 'đúng chương' + at);
    assert.equal(s.title, 'Trăm chuyến nước', 'tên chương' + at);
    assert.equal(s.who, 'Truyện ký', 'trang đầu là lời kể' + at);
    assert.match(s.text, /vai Lam Y rớm máu/, 'lời kể dùng danh hiệu hiệp khách' + at);
    assert.equal(s.prevOff, true, 'trang đầu không lùi được' + at);
    assert.equal(s.fits, true, 'bảng nằm gọn trong màn hình' + at);
    assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
    await page.click('[data-story-next]');
    s = await story(page);
    assert.equal(s.who, 'Truyện ký', 'trang 2: lời kể về chiếc đòn gánh cũ' + at);
    assert.match(s.text, /chiếc đòn gánh cũ/, 'trang 2: sư phụ lấy chiếc đòn gánh cũ trên xà nhà' + at);
    await page.click('[data-story-next]');
    await page.click('[data-story-next]');
    s = await story(page);
    assert.equal(s.who, 'Tiểu Mộc', 'trang 4: Tiểu Mộc nói' + at);
    assert.match(s.text, /^Hì hì, sư tỷ gánh nước/, 'nữ hiệp được gọi là sư tỷ' + at);
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight'); // chương 1 có 10 trang
    s = await story(page);
    assert.match(s.lesson, /Tâm đắc.*Đều đặn thắng hăng hái/, 'trang cuối là Tâm đắc' + at);
    assert.match(s.lesson, /Lam Y hiện ở cấp 6 · Sơ nhập giang hồ · 3 điểm tu vi/, 'Tâm đắc nêu cấp hiện tại' + at);
    assert.equal(s.next, 'Khép sách', 'nút cuối là Khép sách' + at);
    await page.keyboard.press('ArrowLeft');
    s = await story(page);
    assert.equal(s.who, 'Truyện ký', 'lùi một trang về lời kể Huyết Nguyệt đài' + at);
    await page.keyboard.press('ArrowRight');
    await page.click('[data-story-next]');
    await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
    // 2. Dấu đã đọc: notice:tale-5 trên máy chủ; dữ liệu Tu vi không thêm khóa nào.
    await wait(200);
    assert.ok(server.receipts.includes('notice:tale-5'), 'lưu dấu đã đọc chương 1: ' + server.receipts + at);
    assert.deepEqual(Object.keys(server.workspace.growth).sort(), ['hero', 'log', 'name', 'since', 'spend', 'v'], 'dữ liệu Tu vi không thêm khóa mới' + at);
    // 3. Khung Truyện ký trong trang Tu vi.
    await h.show(page, 'growth');
    const list = await page.evaluate(() => [...document.querySelectorAll('.gr-ch')].map((li) => [li.querySelector('strong').textContent, li.querySelector('.gr-ch-tag').textContent, !!li.querySelector('button')]));
    assert.equal(list.length, 28, 'Khai cuộc + 27 chương' + at);
    assert.deepEqual(list[0], ['Trăng trong thùng nước', 'Chưa đọc', true], 'Khai cuộc đọc được, chưa đọc' + at);
    assert.deepEqual(list[1], ['Trăm chuyến nước', 'Đã đọc', true], 'chương 1 đã đọc' + at);
    assert.deepEqual(list[2], ['Trấn ngủ say', 'Mở ở cấp 10', false], 'chương 2 còn khóa' + at);
    assert.deepEqual(list[27], ['Song nguyệt', 'Mở ở cấp 100', false], 'chương cuối ở cấp 100' + at);
    assert.match(await page.locator('.gr-story-panel .help-copy').innerText(), /Chương kế: Chương 2 · Trấn ngủ say mở ở cấp 10 \(còn 5 điểm tu vi\)\./, 'nêu chương kế và số điểm còn thiếu' + at);
    assert.equal(await noOverflow(page), true, 'trang Tu vi không tràn ngang' + at);
    await page.click('[data-gr-story="0"]');
    await page.waitForSelector('dialog.gr-story[open]');
    s = await story(page);
    assert.equal(s.eyebrow, 'TRUYỆN KÝ GIANG HỒ · KHAI CUỘC', 'mở lại Khai cuộc' + at);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
    await wait(200);
    assert.ok(server.receipts.includes('notice:tale-0'), 'đọc Khai cuộc cũng lưu dấu' + at);
    // Tải lại: không tự hiện chương đã đọc.
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.zenReady === '1');
    await wait(1500);
    assert.equal(await story(page), null, 'tải lại không tự hiện truyện' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }

  // 4. Chương đã đọc trên thiết bị khác thì không tự hiện lại.
  {
    const { context, page } = await h.open(390, { touch: true, workspace: seed(growth())(), receiptsSeed: ['notice:tale-5'] });
    await finishTask(page);
    await page.waitForSelector('.completion-card');
    await wait(1500);
    assert.equal(await story(page), null, 'chương đã đọc ở thiết bị khác không hiện lại');
    await context.close();
  }
  // 5. Người mới: chọn hiệp khách thì Khai cuộc có sẵn trong danh sách (chưa đọc); lời thoại cho thiếu hiệp dùng "chàng", "sư huynh".
  {
    const { context, page } = await h.open(820, { touch: true, workspace: seed(null)() });
    await h.show(page, 'growth');
    await page.click('[data-gr-confirm]');
    await page.waitForSelector('.gr-story-panel');
    await wait(600);
    assert.equal(await story(page), null, 'chọn hiệp khách không bật hộp thoại (chương đầu ở cấp 5)');
    assert.equal(await page.locator('.gr-ch.is-new').count(), 1, 'chỉ Khai cuộc đang chờ đọc');
    await page.click('[data-gr-story="0"]');
    await page.waitForSelector('dialog.gr-story[open]');
    const s = await story(page);
    assert.equal(s.title, 'Trăng trong thùng nước', 'người mới đọc được Khai cuộc');
    assert.match(s.text, /Thiếu hiệp ngày ngày gánh nước/, 'chưa đặt danh hiệu thì gọi là Thiếu hiệp');
    assert.equal(await page.evaluate(() => window.zenStory.fill('{Y} và {sh}')), 'Chàng và sư huynh', 'đại từ cho thiếu hiệp');
    await context.close();
  }
  console.log('growth-story-browser ok');
} finally {
  await h.close();
}
