// v2.66.0 (Gieo Nhân): khép vòng Nghiệp quả. Gợi ý “Nhân” ở trang Báo cáo tu luyện có nút “Gieo nhân” tạo một việc thật mang sẵn phương (trường tùy chọn `axis`);
// việc ấy hiện chip “Nhân · <phương>” trên thẻ; khi hoàn thành, bảng vận công điền sẵn công lực vào đúng phương, người dùng chỉ bấm Lưu.
// Kiểm ở 390 (chạm) / 820 (chạm) / 1440 px × sáng, tối; Giang hồ ở 1440:
//  1. Bốn nút “Gieo nhân” (hai gợi ý cho mình, hai cho người), cao ≥ 44 px, có tên đọc đủ; khối “Hạt giống đã gieo” đếm đúng đã gieo / đang chờ / đã thành quả và liệt kê việc đang chờ.
//  2. Hộp gieo: điền sẵn tên gợi ý, đại sự mặc định, không có đại sự đã lưu trữ; tên trống thì báo lỗi và không ghi; Esc đóng mà không tạo gì; gieo thật thì chỉ thêm đúng một việc (có axis, ở cột “Việc cần làm”, kỳ hạn đã chọn), không đổi gì khác.
//  3. Chip trên thẻ việc đang chờ; việc đã xong không có chip. Bỏ gắn phương chỉ xóa axis của đúng việc.
//  4. Hoàn thành việc đã gieo: bảng vận công dồn sẵn 2 lần vào đúng phương, nút + khóa, tiêu điểm ở nút Lưu; Lưu ghi sổ cái đúng ô phương; Hoàn tác trả lại để dồn phương khác; việc thường không dồn sẵn.
//  5. Chỉ đọc: không có nút gieo, không có nút bỏ gắn phương. Bố cục: không tràn ngang, hộp nằm trong màn hình, chữ đủ tương phản, Giang hồ đủ chữ.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá hạn chờ: ' + label);
}
// Mỗi phương cho số điểm; Gia đạo (ô cuối) thấp nhất duy nhất nên gợi ý nói về Gia đạo.
function growthOf(points) {
  const log = [];
  points.forEach((pts, axis) => {
    for (let k = 0; k < pts; k++) {
      const p = Array(8).fill(0);
      p[axis] = 2;
      log.push({ id: 'a' + axis + 'k' + k, d: '2026-11-10', s: 'task', k: 'task:' + axis + '-' + k, n: 'Việc ' + axis + '-' + k, p });
    }
  });
  return { v: 1, hero: 'nam', name: 'Mạnh', since: '2026-11-01', log, spend: [] };
}
// p1 “Alpha” (6 việc): p1t1 (List) gieo Gia đạo = đang chờ; p1t3 (Done) gieo Tài lộc = thành quả; p1t2 (Doing) việc thường.
// p2 “Beta” (4 việc): p2t0 (Idea) gieo Thân thể = đang chờ. p3 “Gamma” đã lưu trữ: p3t0 gieo Trí tuệ (đã gieo nhưng không còn chờ).
const seed = () => {
  const p1 = makeProject('p1', 'Alpha', '#7950c8', 6);
  const p2 = makeProject('p2', 'Beta', '#2e7d5b', 4);
  const p3 = { ...makeProject('p3', 'Gamma', '#e78c56', 2), archived: true };
  p1.tasks[1].axis = 'gia';
  p1.tasks[3].axis = 'tai';
  p2.tasks[0].axis = 'than';
  p3.tasks[0].axis = 'tri';
  return { schema: 1, projects: [p1, p2, p3], notes: [], growth: growthOf([3, 3, 3, 3, 3, 3, 3, 1]) };
};
const setup =
  (theme, style) =>
  ({ context }) =>
    context.addInitScript(
      ([t, s]) => {
        localStorage.setItem('zen-theme', t);
        if (s) localStorage.setItem('zen-style', s);
      },
      [theme, style],
    );
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
async function openReport(h, width, touch, theme, style) {
  const ctx = await h.open(width, { touch, now: NOW, setup: setup(theme, style), workspace: seed() });
  const errors = [];
  ctx.page.on('pageerror', (e) => errors.push(e.message));
  await h.show(ctx.page, 'growth');
  await ctx.page.click('[data-gr-report]');
  await ctx.page.waitForSelector('.gr-cult');
  return { ...ctx, errors };
}
const sums = (page) => page.evaluate(() => document.querySelector('.gr-sow-sum')?.querySelector('p').textContent.replace(/\s+/g, ' ').trim());
const taskOf = (server, pid, title) => server.workspace.projects.find((p) => p.id === pid).tasks.find((t) => t.title === title);
const contrast = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cx = Object.assign(document.createElement('canvas'), {
      width: 1,
      height: 1,
    }).getContext('2d', { willReadFrequently: true });
    const rgba = (css) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const mix = (c, under) =>
      [0, 1, 2].map((i) => c[i] * c[3] + under[i] * (1 - c[3]));
    const lum = ([r, g, b]) =>
      [r, g, b]
        .map((v) =>
          (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
        )
        .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const chain = [];
    for (let n = el; n; n = n.parentElement)
      chain.push(getComputedStyle(n).backgroundColor);
    let bg = [255, 255, 255];
    for (const css of chain.reverse()) {
      const c = rgba(css);
      if (c[3] > 0) bg = mix(c, bg);
    }
    const fg = mix(rgba(getComputedStyle(el).color), bg),
      [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);

const SELF = ['Gọi hoặc về thăm cha mẹ, người thân', 'Dọn dẹp một góc nhà cho gọn gàng'];
const GIVE = ['Phụ giúp người nhà một việc mà không đợi nhờ', 'Nấu một bữa cho cả nhà'];

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const { page, server, errors } = await openReport(h, width, touch, theme);
      const before = JSON.stringify(server.workspace.projects);

      // 1. Nút Gieo nhân và khối hạt giống.
      const btns = await page.evaluate(() => ({
        self: [...document.querySelectorAll('.gr-cult-steps > li[data-step="self"] li .gr-sow-text')].map((x) => x.textContent),
        give: [...document.querySelectorAll('.gr-cult-steps > li[data-step="give"] li .gr-sow-text')].map((x) => x.textContent),
        fruit: document.querySelectorAll('.gr-cult-steps > li[data-step="fruit"] .gr-sow-btn').length,
        all: [...document.querySelectorAll('.gr-cult .gr-sow-btn')].map((b) => ({ text: b.textContent, label: b.getAttribute('aria-label'), h: Math.round(b.getBoundingClientRect().height) })),
      }));
      assert.deepEqual(btns.self, SELF, 'hai gợi ý cho mình' + at);
      assert.deepEqual(btns.give, GIVE, 'hai gợi ý cho người' + at);
      assert.equal(btns.fruit, 0, 'phần Quả không có nút gieo' + at);
      assert.equal(btns.all.length, 4, 'bốn nút Gieo nhân' + at);
      [...SELF, ...GIVE].forEach((t, i) => {
        assert.equal(btns.all[i].text, 'Gieo nhân', 'chữ trên nút' + at);
        assert.equal(btns.all[i].label, 'Gieo nhân: ' + t, 'tên đọc của nút' + at);
        assert.ok(btns.all[i].h >= 44, 'nút cao ≥ 44 px (' + btns.all[i].h + ')' + at);
      });
      assert.equal(await sums(page), 'Hạt giống đã gieo: 4 · đang chờ 2 · đã thành quả 1', 'đếm hạt giống: Gamma lưu trữ đã gieo nhưng không còn chờ' + at);
      const rows = await page.evaluate(() => [...document.querySelectorAll('.gr-sow-list li')].map((li) => ({ name: li.querySelector('strong').textContent, sub: li.querySelector('small').textContent, drop: !!li.querySelector('[data-sow-drop]') })));
      assert.deepEqual(
        rows,
        [
          { name: 'Việc số 2', sub: 'Gia đạo · Alpha', drop: true },
          { name: 'Việc số 1', sub: 'Thân thể · Beta', drop: true },
        ],
        'danh sách hạt giống đang chờ theo thứ tự đại sự' + at,
      );
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      assert.ok((await contrast(page, '.gr-sow-sum p')) >= 4.5, 'chữ khối hạt giống đủ tương phản' + at);

      // 2. Hộp gieo.
      await page.locator('.gr-cult .gr-sow-btn').first().click();
      await page.waitForSelector('dialog.gr-sow[open]');
      const dlg = await page.evaluate(() => {
        const d = document.querySelector('dialog.gr-sow'),
          r = d.getBoundingClientRect(),
          f = d.querySelector('form');
        return {
          head: d.querySelector('h2').textContent,
          title: f.elements.title.value,
          project: f.elements.project.value,
          options: [...f.elements.project.options].map((o) => o.textContent),
          due: f.elements.due.value,
          focus: document.activeElement?.name,
          inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
          radius: getComputedStyle(f.elements.title).borderRadius,
          h: [f.elements.title, f.elements.project, f.elements.due, ...d.querySelectorAll('button')].map((x) => Math.round(x.getBoundingClientRect().height)),
        };
      });
      assert.equal(dlg.head, 'Gieo nhân cho Gia đạo', 'tiêu đề hộp' + at);
      assert.equal(dlg.title, SELF[0], 'tên điền sẵn theo gợi ý' + at);
      assert.equal(dlg.project, 'p1', 'đại sự mặc định là đại sự đầu' + at);
      assert.deepEqual(dlg.options, ['Alpha', 'Beta'], 'không có đại sự đã lưu trữ' + at);
      assert.equal(dlg.due, '', 'kỳ hạn tùy chọn, để trống' + at);
      assert.equal(dlg.focus, 'title', 'tiêu điểm vào ô tên' + at);
      assert.ok(dlg.inside, 'hộp nằm trong màn hình' + at);
      assert.equal(dlg.radius, '12px', 'ô nhập bo tròn' + at);
      for (const v of dlg.h) assert.ok(v >= 44, 'ô và nút cao ≥ 44 px (' + v + ')' + at);
      assert.ok((await contrast(page, 'dialog.gr-sow .help-copy')) >= 4.5, 'lời dẫn trong hộp đủ tương phản' + at);
      assert.ok(await noOverflow(page), 'hộp không gây tràn ngang' + at);

      // Tên trống: báo lỗi, không ghi.
      await page.locator('dialog.gr-sow [name=title]').fill('   ');
      await page.locator('dialog.gr-sow button[type=submit]').click();
      assert.equal(await page.locator('dialog.gr-sow .gr-sow-err').textContent(), 'Hãy gõ tên nhiệm vụ.', 'báo lỗi tên trống' + at);
      assert.equal(await page.locator('dialog.gr-sow .gr-sow-err').isVisible(), true, 'lỗi hiện ra' + at);
      await wait(300);
      assert.equal(JSON.stringify(server.workspace.projects), before, 'tên trống không ghi gì' + at);
      // Esc: đóng, không tạo, tiêu điểm về nút cũ.
      await page.keyboard.press('Escape');
      await until(async () => (await page.locator('dialog.gr-sow').count()) === 0, 'hộp đóng khi nhấn Esc');
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.sowText), SELF[0], 'tiêu điểm về nút đã mở hộp' + at);
      await wait(300);
      assert.equal(JSON.stringify(server.workspace.projects), before, 'Esc không tạo gì' + at);

      // Gieo thật: vào đại sự Beta, có kỳ hạn.
      await page.locator('.gr-cult .gr-sow-btn').first().click();
      await page.waitForSelector('dialog.gr-sow[open]');
      await page.locator('dialog.gr-sow [name=title]').fill('  Gọi về   thăm mẹ ');
      await page.locator('dialog.gr-sow [name=project]').selectOption('p2');
      await page.locator('dialog.gr-sow [name=due]').fill('2026-11-15');
      await page.locator('dialog.gr-sow button[type=submit]').click();
      await until(async () => !!taskOf(server, 'p2', 'Gọi về thăm mẹ'), 'việc mới lên máy chủ');
      const sown = taskOf(server, 'p2', 'Gọi về thăm mẹ');
      assert.deepEqual(
        { axis: sown.axis, col: sown.col, due: sown.due, checks: sown.checks, description: sown.description, labels: sown.labels },
        { axis: 'gia', col: 'List', due: '2026-11-15', checks: [], description: '', labels: [] },
        'việc mới mang sẵn phương Gia đạo, ở cột Việc cần làm, đúng kỳ hạn' + at,
      );
      const rest = JSON.parse(JSON.stringify(server.workspace.projects));
      rest[1].tasks = rest[1].tasks.filter((t) => t.id !== sown.id);
      assert.deepEqual(rest, JSON.parse(before), 'chỉ thêm đúng một việc, không đổi gì khác' + at);
      assert.equal(await page.locator('dialog.gr-sow').count(), 0, 'hộp đóng sau khi gieo' + at);
      assert.equal(await sums(page), 'Hạt giống đã gieo: 5 · đang chờ 3 · đã thành quả 1', 'khối hạt giống cập nhật ngay' + at);
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('gr-sow-btn') && document.activeElement.dataset.sowText), SELF[0], 'tiêu điểm về nút gieo cùng gợi ý' + at);

      // 3. Chip trên thẻ việc.
      await h.show(page, 'projects', 'p2');
      const chip = (title) => page.locator('.task-card', { hasText: title }).locator('.task-card-sow');
      await page.waitForSelector('.task-card-sow');
      assert.equal(await chip('Gọi về thăm mẹ').textContent(), 'Nhân · Gia đạo', 'chip trên việc mới gieo' + at);
      assert.equal(await chip('Việc số 1').textContent(), 'Nhân · Thân thể', 'chip trên việc đã gieo Thân thể' + at);
      assert.ok((await contrast(page, '.task-card-sow')) >= 4.5, 'chữ chip đủ tương phản' + at);
      await h.show(page, 'projects', 'p1');
      await page.waitForSelector('.task-card');
      assert.equal(await page.locator('.task-card-sow').count(), 1, 'Alpha: chỉ việc chờ có chip (việc đã xong thì không)' + at);
      assert.equal(await page.locator('.task-card', { hasText: 'Việc số 2' }).locator('.task-card-sow').textContent(), 'Nhân · Gia đạo', 'chip việc số 2' + at);
      assert.ok(await noOverflow(page), 'thẻ có chip không tràn ngang' + at);

      // 4. Bỏ gắn phương chỉ xóa axis của đúng việc.
      await h.show(page, 'growth');
      await page.click('[data-gr-report]');
      await page.waitForSelector('.gr-sow-list');
      const keep = JSON.parse(JSON.stringify(server.workspace.projects));
      await page.locator('.gr-sow-list li').first().locator('[data-sow-drop]').click();
      await until(async () => server.workspace.projects[0].tasks[1].axis === undefined, 'axis đã bị xóa trên máy chủ');
      keep[0].tasks[1] = { ...keep[0].tasks[1] };
      delete keep[0].tasks[1].axis;
      assert.deepEqual(server.workspace.projects, keep, 'chỉ axis của việc số 2 bị xóa' + at);
      assert.equal(await sums(page), 'Hạt giống đã gieo: 4 · đang chờ 2 · đã thành quả 1', 'khối hạt giống sau khi bỏ gắn' + at);

      // 5. Hoàn thành việc đã gieo: công lực dồn sẵn.
      await page.evaluate(() => moveTask(project('p2'), project('p2').tasks.find((t) => t.title === 'Gọi về thăm mẹ'), 'Done'));
      await page.waitForSelector('#growth-award[open]');
      const aw = await page.evaluate(() => {
        const d = document.querySelector('#growth-award');
        return {
          sown: d.querySelector('.gr-sown')?.textContent.replace(/\s+/g, ' ').trim(),
          budget: d.querySelector('.gr-budget').textContent.replace(/\s+/g, ' ').trim(),
          enabled: d.querySelectorAll('.gr-plus:not([disabled])').length,
          last: d.querySelector('.gr-col:last-child .gr-col-val').textContent.replace(/\s+/g, ''),
          save: !d.querySelector('[data-gr-save]').disabled,
          undo: !d.querySelector('[data-gr-undo]').disabled,
          focus: document.activeElement?.hasAttribute('data-gr-save'),
          inside: (() => { const r = d.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })(),
        };
      });
      assert.match(aw.sown, /Gia đạo/, 'lời nhắc nêu phương đã gieo' + at);
      assert.match(aw.budget, /Đã dồn đủ 1 điểm/, 'đã dồn đủ sẵn' + at);
      assert.equal(aw.enabled, 0, 'các nút + đã khóa' + at);
      assert.equal(aw.last, '2+1', 'cột Gia đạo: đang có 1 điểm, cộng sẵn thêm 1 điểm' + at);
      assert.deepEqual([aw.save, aw.undo, aw.focus, aw.inside], [true, true, true, true], 'nút Lưu bật và có tiêu điểm, Hoàn tác bật, hộp trong màn hình' + at);
      await page.locator('#growth-award [data-gr-save]').click();
      await until(() => server.workspace.growth.log.some((e) => e.k === 'task:' + sown.id), 'sổ cái ghi điểm');
      const entry = server.workspace.growth.log.find((e) => e.k === 'task:' + sown.id);
      assert.deepEqual(entry.p, [0, 0, 0, 0, 0, 0, 0, 2], 'công lực vào đúng ô Gia đạo (p[7]), 1 điểm = 2 nửa điểm' + at);
      assert.equal(await page.locator('#growth-award').count(), 0, 'bảng đóng sau khi Lưu' + at);

      // Hoàn tác để dồn phương khác (việc Thân thể).
      await page.evaluate(() => moveTask(project('p2'), project('p2').tasks.find((t) => t.id === 'p2t0'), 'Done'));
      await page.waitForSelector('#growth-award[open]');
      assert.match(await page.locator('#growth-award .gr-sown').textContent(), /Thân thể/, 'việc Thân thể dồn sẵn vào Thân thể' + at);
      await page.locator('#growth-award [data-gr-undo]').click();
      assert.match(await page.locator('#growth-award .gr-budget').textContent(), /Còn\s*1\s*lần vận công/, 'Hoàn tác một lần trả lại một lần' + at);
      await page.locator('#growth-award [data-gr-undo]').click();
      assert.match(await page.locator('#growth-award .gr-budget').textContent(), /Còn\s*2\s*lần vận công/, 'Hoàn tác hai lần trả lại đủ hai lần' + at);
      assert.equal(await page.locator('#growth-award .gr-plus:not([disabled])').count(), 8, 'các nút + mở lại' + at);
      await page.locator('#growth-award [data-gr-plus="5"]').click();
      await page.locator('#growth-award [data-gr-plus="5"]').click();
      await page.locator('#growth-award [data-gr-save]').click();
      await until(() => server.workspace.growth.log.some((e) => e.k === 'task:p2t0'), 'sổ cái ghi điểm Trí tuệ');
      assert.deepEqual(server.workspace.growth.log.find((e) => e.k === 'task:p2t0').p, [0, 0, 0, 0, 0, 2, 0, 0], 'dồn sang Trí tuệ (p[5]) sau khi Hoàn tác' + at);

      // Việc thường: không dồn sẵn.
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks.find((t) => t.id === 'p1t2'), 'Done'));
      await page.waitForSelector('#growth-award[open]');
      assert.equal(await page.locator('#growth-award .gr-sown').count(), 0, 'việc thường không có lời nhắc dồn sẵn' + at);
      assert.match(await page.locator('#growth-award .gr-budget').textContent(), /Còn\s*2\s*lần vận công/, 'việc thường còn đủ hai lần' + at);
      await page.locator('#growth-award [data-gr-skip]').click();
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await page.context().close();
    }
  }

  // 6. Chỉ đọc: không có nút gieo, không có nút bỏ gắn phương; vẫn thấy khối hạt giống.
  {
    const { page } = await openReport(h, 1440, false, 'light');
    await page.evaluate(() => {
      contentReadOnly = true;
      render();
    });
    await page.waitForSelector('.gr-sow-sum');
    assert.equal(await page.locator('.gr-sow-btn').count(), 0, 'chỉ đọc: không có nút gieo');
    assert.equal(await page.locator('[data-sow-drop]').count(), 0, 'chỉ đọc: không có nút bỏ gắn phương');
    assert.equal(await sums(page), 'Hạt giống đã gieo: 4 · đang chờ 2 · đã thành quả 1', 'chỉ đọc vẫn xem được số hạt giống');
    await page.context().close();
  }

  // 7. Giang hồ ở 1440 px.
  {
    const { page } = await openReport(h, 1440, false, 'light', 'giangho');
    await page.locator('.gr-cult .gr-sow-btn').nth(2).click();
    await page.waitForSelector('dialog.gr-sow[open]');
    const t = await page.evaluate(() => ({
      head: document.querySelector('dialog.gr-sow h2').textContent,
      eyebrow: document.querySelector('dialog.gr-sow .eyebrow').textContent,
      labels: [...document.querySelectorAll('dialog.gr-sow .field')].map((l) => l.firstChild.textContent),
      title: document.querySelector('dialog.gr-sow [name=title]').value,
      buttons: [...document.querySelectorAll('dialog.gr-sow footer button')].map((b) => b.textContent),
    }));
    assert.deepEqual(
      t,
      { head: 'Gieo nhân cho Gia đạo', eyebrow: 'GIEO NHÂN', labels: ['Tên nhiệm vụ', 'Gieo vào đại sự', 'Kỳ hạn (tùy chọn)'], title: GIVE[0], buttons: ['Thôi', 'Gieo nhân'] },
      'hộp gieo giữ nguyên giọng giang hồ',
    );
    await page.keyboard.press('Escape');
    await h.show(page, 'projects', 'p2');
    await page.waitForSelector('.task-card-sow');
    await until(async () => (await page.locator('.task-card-sow').first().textContent()) === 'Nhân · Thân thể', 'chip ở kiểu Giang hồ');
    await page.context().close();
  }
} finally {
  await h.close();
}
console.log('growth sow browser ok');
