// v2.7.0 (Kỳ Ngộ): 22 nhân vật phụ xuất hiện ngẫu nhiên ở các cấp không có chương (dist/growth-meet.js + growth-story.js).
//  1. Dữ liệu (kiểm một lần):
//     - 22 nhân vật, mỗi người 2 kỳ ngộ; khoảng cấp hợp lệ, lần 1 trước lần 2;
//     - đủ bốn vai: giúp đỡ, gây khó, ám sát, thử thách;
//     - có thiền sư Không Nguyệt (tinh thần 95) và võ sư Mạc Trấn Hải (nội lực 95);
//     - người nói, cảnh, chỗ thay hợp lệ; trang ≤ 240 ký tự.
//  2. Lịch gặp:
//     - đủ 44 kỳ ngộ, mỗi kỳ ngộ một cấp riêng, không trùng cấp có chương, nằm trong khoảng của nó;
//     - cố định theo tài khoản (tải lại vẫn vậy), khác nhau giữa các tài khoản.
//  3. Vượt cấp có kỳ ngộ thì bảng đọc tự mở kỳ ngộ ấy:
//     - nhãn "KỲ NGỘ GIANG HỒ · vai", tên và danh xưng nhân vật, Tâm đắc;
//     - dấu đã đọc notice:meet-<nhân vật>-<lần>, không thêm khóa vào dữ liệu Tu vi.
//  4. Khung "Giang hồ kỳ ngộ":
//     - đếm người đã gặp; thẻ người đã gặp đọc lại được; thẻ người chưa gặp ghi cấp sẽ xuất hiện; nêu kỳ ngộ kế tiếp.
//     - Bảng vàng có danh hiệu "Tứ hải giai huynh đệ".
//  Kiểm ở 390 (chạm), 820 (chạm), 1440 px; không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const project = { id: 'p1', name: 'Dự án A', description: '', color: '#7950c8', icon: '✺', columns: ['Idea', 'List', 'Doing', 'Done'], columnNames: { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang thực hiện', Done: 'Hoàn thành' }, tasks: [{ id: 'p1t0', title: 'Gửi báo cáo', col: 'Doing', description: '', due: day(3), tag: 'Công việc', priority: 'q2', checks: [] }] };
const growth = (half) => ({ v: 1, hero: 'nam', since: day(-40), log: half ? [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [half, 0, 0, 0, 0, 0, 0, 0] }] : [] });
const seed = (half) => () => ({ schema: 1, projects: [structuredClone(project)], notes: [], growth: growth(half) });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const h = await startHarness({ seed: seed(20) });
try {
  // 1 + 2. Dữ liệu và lịch gặp.
  let plan, LEVEL_AT;
  {
    const { context, page } = await h.open(1440, { workspace: seed(20)() });
    await h.show(page, 'growth');
    const d = await page.evaluate(() => ({
      cast: window.zenMeet.CAST, roles: window.zenMeet.ROLES, who: window.zenTale.WHO, chapters: window.zenTale.CHAPTERS.map((c) => c.lv),
      plan: window.zenStory.schedule().map((m) => ({ id: m.id, lv: m.lv, from: m.meet.from, to: m.meet.to })),
      other: window.zenStory.schedule('nguoi-khac').map((m) => m.id + '@' + m.lv),
      LEVEL_AT: window.zenGrowth.LEVEL_AT,
    }));
    ({ plan, LEVEL_AT } = d);
    assert.equal(d.cast.length, 22, '22 nhân vật phụ');
    assert.ok(d.cast.every((c) => c.meets.length === 2 && c.meets[0].to < c.meets[1].from && c.meets.every((m) => m.from >= 1 && m.to <= 99 && m.from <= m.to)), 'mỗi người 2 kỳ ngộ, khoảng cấp hợp lệ, lần 1 trước lần 2');
    assert.deepEqual([...new Set(d.cast.flatMap((c) => c.meets.map((m) => m.kind)))].sort(), ['amsat', 'can', 'giup', 'thu'], 'đủ bốn vai');
    assert.deepEqual(Object.values(d.roles), ['Giúp đỡ', 'Gây khó', 'Ám sát', 'Thử thách'], 'tên vai');
    assert.match(d.cast.find((c) => c.id === 'thien').title, /tinh thần 95/, 'thiền sư Không Nguyệt tinh thần 95');
    assert.match(d.cast.find((c) => c.id === 'hai').title, /nội lực 95/, 'võ sư Mạc Trấn Hải nội lực 95');
    assert.equal(new Set(d.cast.map((c) => c.id)).size, 22, 'mã nhân vật không trùng');
    for (const c of d.cast)
      for (const m of c.meets) {
        assert.ok(m.title && m.lesson && m.pages.length >= 2, 'kỳ ngộ đủ tên, trang, Tâm đắc: ' + c.name);
        for (const [who, pose, text] of m.pages) {
          assert.ok(who === 'hero' || d.who[who] || d.cast.some((x) => x.id === who), 'người nói hợp lệ: ' + who);
          assert.ok(['talk', 'martial', 'taichi', 'zen', 'moon'].includes(pose), 'cảnh hợp lệ: ' + pose);
          assert.ok(text.length <= 240, 'trang không quá dài');
          for (const x of text.matchAll(/\{(\w+)\}/g)) assert.ok(['name', 'Name', 'y', 'Y', 'sh', 'Sh', 'sd', 'Sd', 'tt', 'Tt'].includes(x[1]), 'chỗ thay hợp lệ: ' + x[0]);
        }
      }
    assert.equal(plan.length, 44, 'đủ 44 kỳ ngộ trong lịch');
    assert.equal(new Set(plan.map((m) => m.lv)).size, 44, 'mỗi kỳ ngộ một cấp riêng');
    assert.ok(plan.every((m) => !d.chapters.includes(m.lv) && m.lv >= m.from && m.lv <= m.to), 'không trùng cấp có chương, nằm trong khoảng');
    assert.notDeepEqual(plan.map((m) => m.id + '@' + m.lv), d.other, 'mỗi tài khoản một lịch gặp riêng');
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.zenReady === '1');
    assert.deepEqual(await page.evaluate(() => window.zenStory.schedule().map((m) => ({ id: m.id, lv: m.lv, from: m.meet.from, to: m.meet.to }))), plan, 'tải lại vẫn cùng lịch gặp');
    await context.close();
  }
  // Kỳ ngộ đầu tiên ở cấp 11–19 (mỗi cấp 1 điểm): bắt đầu đúng ở cấp trước đó, cộng 1 điểm là vượt đúng một cấp.
  const target = plan.find((m) => m.lv >= 11 && m.lv <= 19);
  assert.ok(target, 'có kỳ ngộ ở cấp 11–19');
  const half = LEVEL_AT[target.lv - 1] * 2;

  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { context, page, server } = await h.open(width, { touch, workspace: seed(half)() });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // 3. Vượt cấp có kỳ ngộ.
    await h.show(page, 'board');
    await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[0], 'Done'));
    await page.waitForSelector('#growth-award[open]');
    await page.click('[data-gr-plus="0"]');
    await page.click('[data-gr-plus="0"]');
    await page.click('[data-gr-save]');
    await page.mouse.move(2, 2);
    await page.waitForSelector('dialog.gr-story[open]', { timeout: 5000 });
    const head = await page.evaluate(() => {
      const d = document.querySelector('dialog.gr-story[open]'), r = d.getBoundingClientRect();
      return { eyebrow: d.querySelector('.eyebrow').textContent, title: d.querySelector('#gr-story-title').textContent, sub: d.querySelector('.gr-story-head small').textContent, meet: d.classList.contains('is-meet'), fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight };
    });
    const info = await page.evaluate((id) => {
      const m = window.zenStory.schedule().find((x) => x.id === id);
      return { title: m.meet.title, name: m.cast.name, castTitle: m.cast.title, role: window.zenMeet.ROLES[m.meet.kind], lesson: m.meet.lesson, pages: m.meet.pages.length };
    }, target.id);
    assert.deepEqual(head, { eyebrow: 'KỲ NGỘ GIANG HỒ · ' + info.role.toUpperCase(), title: info.title, sub: info.name + ' · ' + info.castTitle + ' · cấp ' + target.lv, meet: true, fits: true }, 'bảng đọc kỳ ngộ' + at);
    for (let i = 0; i < info.pages; i++) await page.keyboard.press('ArrowRight');
    assert.match(await page.locator('.gr-story-lesson').innerText(), new RegExp(info.lesson.slice(0, 20)), 'Tâm đắc của kỳ ngộ' + at);
    assert.equal(await page.locator('[data-story-next]').textContent(), 'Khép sách', 'chỉ một kỳ ngộ' + at);
    await page.click('[data-story-next]');
    await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
    const key = 'notice:meet-' + target.id.slice(2);
    await page.waitForFunction((k) => readReceiptKeys.has(k), key);
    assert.ok(server.receipts.includes(key), 'dấu đã đọc kỳ ngộ' + at);
    assert.deepEqual(Object.keys(server.workspace.growth).sort(), ['hero', 'log', 'since', 'spend', 'v'], 'không thêm khóa vào dữ liệu Tu vi' + at);
    // 4. Khung Giang hồ kỳ ngộ.
    await h.show(page, 'growth');
    await page.waitForSelector('.gr-meet-panel');
    const p = await page.evaluate((id) => {
      const box = document.querySelector('.gr-meet-panel');
      return {
        head: box.querySelector('h2').textContent, help: box.querySelector('.help-copy').textContent,
        met: [...box.querySelectorAll('.gr-meet.is-met')].map((li) => li.dataset.cast), locked: box.querySelectorAll('.gr-meet.is-locked').length,
        lockedText: box.querySelector('.gr-meet.is-locked small')?.textContent || '',
        button: !!box.querySelector('[data-gr-story="' + id + '"]'),
        face: (() => { const f = box.querySelector('.gr-meet.is-met .gr-meet-face'); return f ? f.getBoundingClientRect().width : 0; })(),
      };
    }, target.id);
    const metIds = [...new Set(plan.filter((m) => m.lv <= target.lv).map((m) => m.id.slice(2).split('-')[0]))];
    const metCount = metIds.length, done = plan.filter((m) => m.lv <= target.lv).length;
    assert.match(p.head, new RegExp('Đã gặp ' + metCount + '/22 nhân vật · ' + done + '/44 kỳ ngộ'), 'đếm người đã gặp' + at);
    assert.deepEqual(p.met.sort(), metIds.sort(), 'thẻ người đã gặp' + at);
    assert.equal(p.locked, 22 - metCount, 'thẻ người chưa gặp' + at);
    assert.match(p.lockedText, /^Xuất hiện ở cấp \d+$/, 'thẻ chưa gặp ghi cấp sẽ xuất hiện' + at);
    const next = plan.find((m) => m.lv > target.lv);
    assert.match(p.help, new RegExp('Kỳ ngộ kế tiếp ở cấp ' + next.lv), 'nêu kỳ ngộ kế tiếp' + at);
    assert.ok(p.button && p.face >= 40, 'thẻ người đã gặp đọc lại được' + at);
    await page.click('.gr-meet-panel [data-gr-story="' + target.id + '"]');
    await page.waitForSelector('dialog.gr-story[open]');
    assert.equal(await page.locator('#gr-story-title').textContent(), info.title, 'đọc lại kỳ ngộ' + at);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
    assert.equal(await page.locator('.gr-ach[data-ach="meet-22"] .gr-ach-state').textContent(), metCount + '/22', 'Bảng vàng: Tứ hải giai huynh đệ' + at);
    assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }
  console.log('growth-meet-browser ok');
} finally {
  await h.close();
}
