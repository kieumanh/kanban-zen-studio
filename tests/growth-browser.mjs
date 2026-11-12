// v1.78.0: "Điểm tích lũy". Chưa chọn nhân vật thì mọi thứ im lặng (xong việc → chúc mừng ngay, không hỏi điểm).
// Chọn nhân vật nam/nữ → trang có nhân vật, biểu đồ mạng nhện 8 chỉ số đều bằng 0, 4 tư thế.
// Hoàn thành việc → bảng cộng điểm 8 cột hiện TRƯỚC lời chúc mừng; mỗi lần + là 0,5 điểm, tối đa 2 lần; Lưu lại ghi vào sổ; Bỏ qua thì không ghi.
// Mỗi việc chỉ được hỏi điểm một lần. Kiểm tra ở 390 (chạm), 820, 1440 px: không tràn ngang, nút + đủ vùng chạm.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = (growth) => () => {
  const p = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 4);
  p.tasks[2].title = 'Gửi báo cáo tuần';
  p.tasks[2].col = 'Doing';
  p.tasks[3].title = 'Việc đã xong từ trước';
  return { schema: 1, projects: [p], notes: [], ...(growth ? { growth } : {}) };
};
const GROWTH = {
  v: 1,
  hero: 'nam',
  since: '2026-11-01',
  log: [
    { id: 'l1', d: '2026-11-02', s: 'task', k: 'task:old1', n: 'Việc cũ một', p: [2, 0, 0, 0, 0, 0, 0, 0] },
    { id: 'l2', d: '2026-11-03', s: 'task', k: 'task:old2', n: 'Việc cũ hai', p: [0, 0, 1, 0, 0, 0, 1, 0] },
  ],
};
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 60; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá thời gian chờ: ' + label);
}

const h = await startHarness({ seed: seed() });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';

    // 1. Chưa chọn nhân vật: xong việc → lời chúc mừng ngay, không có bảng cộng điểm.
    {
      const { context, page } = await h.open(width, { touch, workspace: seed()() });
      await h.show(page, 'board');
      assert.equal(await page.locator('.sidebar [data-view="growth"]').count(), 1, 'có mục Điểm tích lũy trong menu' + at);
      const order = await page.evaluate(() => {
        const nav = [...document.querySelectorAll('.sidebar .nav[data-view]')].map((b) => b.dataset.view);
        return nav.indexOf('growth') + 1 === nav.indexOf('budget');
      });
      assert.equal(order, true, 'mục Điểm tích lũy nằm ngay trên Phân bổ tài nguyên' + at);
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[2], 'Done'));
      await page.waitForSelector('.completion-card');
      assert.equal(await page.locator('#growth-award').count(), 0, 'chưa chọn nhân vật thì không hỏi điểm' + at);
      assert.equal(await page.evaluate(() => data.growth === undefined), true, 'không tự sinh dữ liệu điểm' + at);
      await context.close();
    }

    // 2. Trang chọn nhân vật → bắt đầu hành trình.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: seed()() });
      await h.show(page, 'growth');
      assert.equal(await page.locator('.gr-card').count(), 2, 'có hai nhân vật để chọn' + at);
      assert.equal(await page.locator('.gr-card svg.gr-hero').count(), 2, 'nhân vật vẽ bằng SVG' + at);
      assert.equal(await noOverflow(page), true, 'trang chọn nhân vật không tràn ngang' + at);
      assert.equal(await page.locator('.gr-guide-list li').count(), 8, 'giới thiệu đủ 8 chỉ số' + at);
      await page.locator('.gr-card input[value="nu"]').check({ force: true });
      await page.fill('[data-gr-name]', 'Tiểu Liên');
      await page.click('[data-gr-confirm]');
      await page.waitForSelector('#gr-radar svg.gr-radar');
      const state = await page.evaluate(() => ({
        hero: document.querySelector('#gr-figure svg.gr-hero').dataset.hero,
        labels: [...document.querySelectorAll('.gr-radar .gr-label')].map((n) => n.textContent),
        values: [...document.querySelectorAll('.gr-radar .gr-value')].map((n) => n.textContent),
        h1: document.querySelector('#main h1').textContent,
        chips: [...document.querySelectorAll('.gr-chip')].map((n) => n.textContent),
        realm: document.querySelector('.gr-realm-name').textContent,
      }));
      assert.equal(state.hero, 'nu', 'đã chọn nhân vật nữ' + at);
      assert.deepEqual(state.labels, ['Nghiệp quả', 'Tài lộc', 'Tâm cảnh', 'Nhân duyên', 'Thể lực', 'Trí tuệ', 'Sự nghiệp', 'An vui'], 'đủ 8 chỉ số theo thứ tự' + at);
      assert.deepEqual(state.values, Array(8).fill('0'), 'cả 8 chỉ số bắt đầu bằng 0' + at);
      assert.match(state.h1, /Tiểu Liên/, 'tên nhân vật hiện ở tiêu đề' + at);
      assert.deepEqual(state.chips, ['Tự động', 'Cười nói', 'Tập võ', 'Đi quyền', 'Ngồi thiền'], 'có bốn tư thế và chế độ tự động' + at);
      assert.equal(state.realm, 'Phàm nhân', 'bắt đầu ở cảnh giới đầu' + at);
      assert.equal(await noOverflow(page), true, 'trang điểm không tràn ngang' + at);
      // Chuyển tư thế: nhân vật đổi theo.
      for (const [label, pose] of [['Tập võ', 'martial'], ['Đi quyền', 'taichi'], ['Ngồi thiền', 'zen'], ['Cười nói', 'talk']]) {
        await page.click('.gr-chip:has-text("' + label + '")');
        await page.waitForSelector('#gr-figure svg.gr-hero[data-pose="' + pose + '"]');
      }
      // Đã lưu lên máy chủ.
      await until(() => server.workspace.growth?.hero === 'nu', 'lưu nhân vật lên máy chủ' + at);
      assert.equal(server.workspace.growth.name, 'Tiểu Liên');
      assert.deepEqual(server.workspace.growth.log, [], 'sổ điểm trống lúc bắt đầu' + at);
      // Đổi nhân vật không mất điểm: chọn lại nam.
      await page.click('[data-gr-change]');
      await page.locator('.gr-card input[value="nam"]').check({ force: true });
      await page.click('[data-gr-confirm]');
      await page.waitForSelector('#gr-figure svg.gr-hero[data-hero="nam"]');
      await context.close();
    }

    // 3. Hoàn thành việc → bảng 8 cột hiện trước lời chúc mừng; cộng, hoàn tác, lưu.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: seed(GROWTH)() });
      await h.show(page, 'board');
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[2], 'Done'));
      await page.waitForSelector('#growth-award[open]');
      assert.equal(await page.locator('.completion-card').count(), 0, 'lời chúc mừng chưa hiện khi bảng điểm còn mở' + at);
      const info = await page.evaluate(() => {
        const d = document.querySelector('#growth-award'), r = d.getBoundingClientRect();
        return {
          cols: d.querySelectorAll('.gr-col').length,
          plus: [...d.querySelectorAll('.gr-plus')].map((b) => Math.round(b.getBoundingClientRect().height)),
          plusW: [...d.querySelectorAll('.gr-plus')].map((b) => Math.round(b.getBoundingClientRect().width)),
          icons: d.querySelectorAll('.gr-plus svg').length,
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          budget: d.querySelector('.gr-budget').textContent,
          saveDisabled: d.querySelector('[data-gr-save]').disabled,
          intro: d.querySelector('.help-copy').textContent,
          modal: d.matches(':modal'),
        };
      });
      assert.equal(info.cols, 8, '8 cột chỉ số' + at);
      assert.equal(info.icons, 8, 'mỗi nút + kèm icon' + at);
      assert.ok(Math.min(...info.plus) >= (touch ? 44 : 36), 'nút + đủ cao' + at + ' ' + info.plus);
      assert.ok(Math.min(...info.plusW) >= (touch ? 36 : 36), 'nút + đủ rộng' + at + ' ' + info.plusW);
      assert.ok(info.left >= -0.5 && info.right <= width + 0.5 && info.top >= -0.5 && info.bottom <= (touch ? 844 : 900) + 0.5, 'bảng nằm trong màn hình' + at + ' ' + JSON.stringify(info));
      assert.match(info.budget, /Còn 2 lần cộng/, 'mỗi việc được 2 lần cộng' + at);
      assert.equal(info.saveDisabled, true, 'chưa cộng thì chưa Lưu được' + at);
      assert.match(info.intro, /Gửi báo cáo tuần/, 'nhắc tên việc vừa xong' + at);
      assert.equal(info.modal, true, 'bảng là hộp thoại modal' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang khi hiện bảng điểm' + at);
      // Cộng Nghiệp quả (cột 0) một lần: 2 → 2,5.
      await page.click('[data-gr-plus="0"]');
      assert.equal((await page.locator('#growth-award .gr-col').nth(0).locator('.gr-col-val').innerText()).replace(/\s+/g, ''), '1,5+0,5', 'cột Nghiệp quả hiện điểm mới và phần cộng thêm' + at);
      await page.click('[data-gr-undo]');
      assert.match(await page.locator('.gr-budget').innerText(), /Còn 2 lần cộng/, 'hoàn tác trả lại lần cộng' + at);
      // Cộng 1 vào Nghiệp quả và 1 vào An vui → hết lần, các nút + khác bị khóa.
      await page.click('[data-gr-plus="0"]');
      await page.click('[data-gr-plus="7"]');
      assert.match(await page.locator('.gr-budget').innerText(), /Đã chia đủ 1 điểm/, 'hết 2 lần cộng' + at);
      assert.equal(await page.locator('#growth-award .gr-plus:not([disabled])').count(), 0, 'hết lần thì khóa các nút +' + at);
      assert.equal(await page.locator('[data-gr-save]').isDisabled(), false, 'đã cộng thì được Lưu' + at);
      await page.click('[data-gr-save]');
      await page.waitForSelector('.completion-card');
      assert.equal(await page.locator('#growth-award').count(), 0, 'bảng đóng sau khi lưu, lời chúc mừng hiện ra' + at);
      await until(() => server.workspace.growth.log.length === 3, 'lưu lần cộng lên máy chủ' + at);
      const added = server.workspace.growth.log[2];
      assert.deepEqual(added.p, [1, 0, 0, 0, 0, 0, 0, 1], 'sổ ghi đúng nửa điểm từng chỉ số' + at);
      assert.equal(added.s, 'task');
      assert.equal(added.k, 'task:p1t2', 'khóa chống cộng trùng theo mã việc' + at);
      assert.equal(added.n, 'Gửi báo cáo tuần');
      assert.match(added.d, /^\d{4}-\d{2}-\d{2}$/);
      // Trang điểm: Nghiệp quả 1 + 0,5 = 1,5; Tâm cảnh 0,5; Sự nghiệp 0,5; An vui 0,5.
      await page.evaluate(() => document.querySelector('.completion-close')?.click());
      await h.show(page, 'growth');
      const vals = await page.evaluate(() => [...document.querySelectorAll('.gr-radar .gr-value')].map((n) => n.textContent));
      assert.deepEqual(vals, ['1,5', '0', '0,5', '0', '0', '0', '0,5', '0,5'], 'biểu đồ cộng đúng điểm' + at);
      assert.match(await page.locator('.gr-summary').innerText(), /Mạnh nhất:\s*Nghiệp quả.*Cần bồi bổ nhất:\s*Tài lộc/, 'tóm tắt mạnh yếu' + at);
      assert.equal(await page.locator('.gr-history-list li').count(), 3, 'lịch sử có 3 lần cộng' + at);
      assert.equal(await noOverflow(page), true, 'trang điểm không tràn ngang' + at);
      // Việc đã được cộng điểm thì không hỏi lần nữa: đưa về Đang làm rồi hoàn thành lại.
      await h.show(page, 'board');
      await page.evaluate(() => {
        moveTask(project('p1'), project('p1').tasks[2], 'Doing');
        document.querySelectorAll('.completion-card').forEach((c) => c.remove());
        moveTask(project('p1'), project('p1').tasks[2], 'Done');
      });
      await page.waitForSelector('.completion-card');
      assert.equal(await page.locator('#growth-award').count(), 0, 'mỗi việc chỉ hỏi điểm một lần' + at);
      await context.close();
    }

    // 4. Bỏ qua: không ghi gì, vẫn có lời chúc mừng; phím Esc cũng như Bỏ qua.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: seed(GROWTH)() });
      await h.show(page, 'board');
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[2], 'Done'));
      await page.waitForSelector('#growth-award[open]');
      await page.click('[data-gr-plus="3"]');
      await page.click('[data-gr-skip]');
      await page.waitForSelector('.completion-card');
      assert.equal(await page.evaluate(() => data.growth.log.length), 2, 'bỏ qua thì không ghi điểm' + at);
      assert.equal(await page.locator('#growth-award').count(), 0);
      await wait(300);
      assert.equal(server.workspace.growth.log.length, 2, 'máy chủ cũng không đổi' + at);
      await context.close();
    }
    {
      const { context, page } = await h.open(width, { touch, workspace: seed(GROWTH)() });
      await h.show(page, 'board');
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[2], 'Done'));
      await page.waitForSelector('#growth-award[open]');
      await page.keyboard.press('Escape');
      await page.waitForSelector('.completion-card');
      assert.equal(await page.evaluate(() => data.growth.log.length), 2, 'Esc = bỏ qua, không ghi điểm' + at);
      await context.close();
    }

    // 5. Việc đã Hoàn thành từ trước (kéo về Done lần nữa không phải lần chuyển mới) và đổi việc khác cột không hỏi điểm.
    {
      const { context, page } = await h.open(width, { touch, workspace: seed(GROWTH)() });
      await h.show(page, 'board');
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[3], 'Done'));
      await wait(500);
      assert.equal(await page.locator('#growth-award').count(), 0, 'việc đã ở Hoàn thành thì không hỏi điểm' + at);
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[1], 'Doing'));
      await wait(300);
      assert.equal(await page.locator('#growth-award').count(), 0, 'chuyển sang cột khác không hỏi điểm' + at);
      await context.close();
    }

    // 6. Giảm chuyển động: hoạt họa nhân vật dừng, không tự đổi tư thế.
    {
      const { context, page } = await h.open(width, { touch, workspace: seed(GROWTH)() });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await h.show(page, 'growth');
      await page.waitForSelector('#gr-figure svg.gr-hero');
      const names = await page.evaluate(() => [...document.querySelectorAll('#gr-figure svg *')].map((n) => getComputedStyle(n).animationName).filter((n) => n && n !== 'none'));
      assert.deepEqual(names, [], 'giảm chuyển động thì không còn hoạt họa' + at);
      await context.close();
    }
  }
  console.log('growth-browser ok');
} finally {
  await h.close();
}
