// v1.97.0 (Ấn Son): khoảnh khắc giang hồ (dist/giangho-fx.js).
//  1. Ấn son công thành (Giang hồ): lời chúc mang con dấu thay pháo hoa; thẻ vừa xong được đóng dấu khi không còn hộp thoại, rồi mờ đi.
//     Giảm chuyển động: dấu đứng yên. Tắt "Hiệu ứng ấn son, nén hương": không dấu, pháo hoa như cũ. Thiền: không dấu.
//  2. Nén hương bế quan: que hương cạnh đồng hồ, ngắn dần theo thời gian, đốm lửa sáng khi đang đếm, tắt khi tạm nghỉ.
//  3. Danh hiệu trên thanh bên (Giang hồ, đã có Tu vi): cảnh giới, danh xưng cấp (v2.5.0, thay "trọng"), cấp, phần trăm tới cấp kế;
//     bấm mở Tu vi. Thiền: không có.
//  4. Nghi thức Đột phá: lưu công lực mà sang cảnh giới mới thì hiện bảng nghi thức (cả Thiền), danh hiệu cập nhật; tắt thông báo
//     điểm nghiệp thì không hiện. v2.5.0: cảnh giới bắt đầu ở ải cấp 10, 20 …, trùng mốc chương truyện ký, nên đóng nghi thức thì
//     chương của ải mở tiếp.
//  5. Ấn chương: ảnh đại diện chữ viết tắt thành con dấu son vuông bo góc ở Giang hồ.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px; không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const day = (n) => new Date(Date.parse(NOW) + n * 864e5 + 7 * 3600e3).toISOString().slice(0, 10);
// v2.5.0: 15 nửa điểm = 7,5 điểm: cấp 9 (cuối Sơ nhập giang hồ). Hoàn thành một việc cộng 1 điểm → 8,5 điểm: qua ải cấp 10,
// Tam lưu cao thủ. (Thang v1.85.0 dùng 11 → 12 điểm, cấp 10 → 11.)
const growth = (extra = {}) => ({ v: 1, hero: 'nu', name: 'Lam Y', since: day(-40), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [15, 0, 0, 0, 0, 0, 0, 0] }], ...extra });
const seed = (g) => () => ({ schema: 1, notes: [], projects: [makeProject('p1', 'Alpha', '#7950c8', 8)], ...(g ? { growth: g } : {}) });
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
// Hoàn thành một nhiệm vụ chưa xong (như kéo sang cột cuối); trả về mã nhiệm vụ.
const finish = (page) =>
  page.evaluate(() => {
    const p = project('p1'), t = p.tasks.find((x) => x.col !== 'Done' && !x.archived);
    moveTask(p, t, 'Done');
    return t.id;
  });
const clearOverlay = (page) => page.evaluate(() => (typeof dismissCompletion === 'function' ? dismissCompletion() : null));
const award = async (page) => {
  await page.waitForSelector('#growth-award[open]');
  await page.mouse.move(2, 2);
  await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-save]');
  await page.mouse.move(2, 2);
};

const h = await startHarness({ seed: seed(null) });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 1 + 5. Ấn son công thành, ấn chương.
    {
      const { context, page } = await h.open(width, { touch, now: NOW, setup: GH });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'projects', 'p1');
      let id = await finish(page);
      await page.waitForSelector('.completion-overlay.gh-sealed .gh-overlay-seal');
      const overlay = await page.evaluate(() => ({
        seal: document.querySelector('.gh-overlay-seal').textContent,
        fireworks: getComputedStyle(document.querySelector('.completion-overlay .completion-fireworks')).display,
        border: getComputedStyle(document.querySelector('.gh-overlay-seal')).borderTopColor,
      }));
      assert.equal(overlay.seal, 'Côngthành', 'lời chúc mang con dấu Công thành' + at);
      assert.equal(overlay.fireworks, 'none', 'không còn pháo hoa tím hồng' + at);
      assert.equal(overlay.border, 'rgb(184, 52, 74)', 'viền son' + at);
      await page.waitForSelector('.task-card[data-task="' + id + '"] .gh-stamp');
      await page.waitForTimeout(800); // đo sau khi dấu đã đóng xong (lúc đầu phóng to 2 lần)
      const stamp = await page.evaluate((id) => {
        const s = document.querySelector('.task-card[data-task="' + id + '"] .gh-stamp');
        const r = s.getBoundingClientRect(), c = s.closest('.task-card').getBoundingClientRect();
        return { hidden: s.getAttribute('aria-hidden'), anim: getComputedStyle(s).animationName, inside: r.right <= c.right + 6 && r.top >= c.top - 6 };
      }, id);
      assert.deepEqual(stamp, { hidden: 'true', anim: 'gh-stamp', inside: true }, 'dấu son đóng lên thẻ vừa xong' + at);
      await page.waitForFunction(() => !document.querySelector('.gh-stamp'), null, { timeout: 8000 });
      await clearOverlay(page);
      // Ấn chương.
      const avatar = await page.evaluate(() => {
        const a = [...document.querySelectorAll('.avatar:not(.has-photo)')].find((x) => x.getBoundingClientRect().width > 0);
        return a ? { radius: getComputedStyle(a).borderTopLeftRadius, border: getComputedStyle(a).borderTopColor, bg: getComputedStyle(a).backgroundColor } : null;
      });
      if (avatar) assert.deepEqual(avatar, { radius: '10px', border: 'rgb(184, 52, 74)', bg: 'rgb(251, 233, 228)' }, 'ảnh đại diện thành ấn chương' + at);
      // Giảm chuyển động: dấu đứng yên.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      id = await finish(page);
      await page.waitForSelector('.task-card[data-task="' + id + '"] .gh-stamp');
      assert.deepEqual(
        await page.evaluate((id) => {
          const s = document.querySelector('.task-card[data-task="' + id + '"] .gh-stamp');
          return [s.classList.contains('is-still'), getComputedStyle(s).animationName, document.querySelector('.completion-overlay').classList.contains('is-still')];
        }, id),
        [true, 'none', true],
        'giảm chuyển động thì dấu đứng yên' + at,
      );
      await clearOverlay(page);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      // Tắt hiệu ứng trong Cài đặt → Giao diện.
      await page.evaluate(() => accountPanel());
      await page.waitForSelector('dialog[open] #gh-fx', { state: 'attached' });
      await page.evaluate(() => document.querySelectorAll('dialog[open] details').forEach((d) => (d.open = true)));
      assert.equal(await page.locator('#gh-fx').isChecked(), true, 'mặc định bật hiệu ứng' + at);
      await page.mouse.move(2, 2);
      await page.locator('.gh-fx-row').click();
      await page.waitForFunction(() => document.documentElement.dataset.ghFx === 'off');
      assert.equal(await page.evaluate(() => localStorage.getItem('zen-gh-fx')), 'off', 'lưu lựa chọn trên thiết bị' + at);
      await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
      await page.waitForTimeout(400);
      id = await finish(page);
      await page.waitForSelector('.completion-overlay');
      await page.waitForTimeout(500);
      assert.deepEqual(
        await page.evaluate(() => [document.querySelectorAll('.gh-overlay-seal, .gh-stamp').length, getComputedStyle(document.querySelector('.completion-overlay .completion-fireworks')).display]),
        [0, 'block'],
        'tắt hiệu ứng: không dấu, pháo hoa như cũ' + at,
      );
      await clearOverlay(page);
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 2. Nén hương bế quan.
    {
      const { context, page } = await h.open(width, { touch, now: NOW, setup: GH });
      await h.show(page, 'focus');
      await page.locator('#main [data-wf-focus]').first().click();
      await page.waitForSelector('.studio-pomodoro');
      await page.evaluate(() => (document.querySelector('.studio-pomodoro').open = true));
      await page.clock.runFor(1100);
      await page.waitForSelector('.studio-pomodoro output + .gh-incense');
      const burn = () => page.evaluate(() => {
        const s = document.querySelector('.gh-incense');
        return { burn: Number(s.style.getPropertyValue('--burn')), lit: s.classList.contains('is-lit'), h: s.querySelector('.gh-incense-stick').getBoundingClientRect().height, visible: s.getBoundingClientRect().height > 40 && s.getBoundingClientRect().bottom <= document.querySelector('.studio-pomodoro [data-studio=timer]').getBoundingClientRect().top };
      });
      const start = await burn();
      assert.ok(start.burn === 0 && !start.lit && start.visible, 'nén hương nguyên, chưa cháy: ' + JSON.stringify(start) + at);
      await page.locator('.studio-pomodoro [data-studio=timer]').click();
      // Tua ngắn như các bài đồng hồ khác (tua dài làm mọi bộ hẹn giờ của ứng dụng chạy dồn, dễ vỡ trên máy CI).
      await page.clock.runFor(2100);
      await page.clock.runFor(2100);
      const lit = await burn();
      assert.ok(lit.burn > 0 && lit.burn < 0.01 && lit.lit, 'đang đếm: đốm lửa sáng, bắt đầu cháy: ' + JSON.stringify(lit) + at);
      // Tỉ lệ cháy theo thời gian còn lại: 12:30 / 25:00 → cháy một nửa, que hương ngắn đi.
      const half = await page.evaluate(() => {
        document.querySelector('.studio-pomodoro output').textContent = '12:30';
        window.zenFx.incense();
        const s = document.querySelector('.gh-incense');
        return { burn: Number(s.style.getPropertyValue('--burn')) };
      });
      assert.equal(half.burn, 0.5, 'cháy theo thời gian đã qua' + at);
      await page.waitForFunction((h0) => document.querySelector('.gh-incense-stick').getBoundingClientRect().height < h0 - 10, start.h);
      await page.locator('.studio-pomodoro [data-studio=timer]').click();
      await page.clock.runFor(2100);
      assert.equal((await burn()).lit, false, 'tạm nghỉ thì tắt đốm lửa' + at);
      await page.evaluate(() => window.zenTheme.setStyle('zen'));
      await page.clock.runFor(1100);
      assert.equal(await page.locator('.gh-incense').count(), 0, 'Thiền không có nén hương' + at);
      await context.close();
    }
    // 3 + 4. Danh hiệu, Đột phá (Giang hồ).
    {
      const { context, page } = await h.open(width, { touch, now: NOW, setup: GH, workspace: seed(growth())() });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'projects', 'p1');
      const rank = () => page.evaluate(() => {
        const r = document.querySelector('.sidebar .gh-rank');
        return r && { level: r.querySelector('b').textContent, name: r.querySelector('strong').textContent, sub: r.querySelector('small').textContent, label: r.getAttribute('aria-label') };
      });
      const r0 = await rank();
      assert.equal(r0.level, '9', 'danh hiệu: cấp' + at);
      assert.equal(r0.name, 'Sơ nhập giang hồ', 'danh hiệu: cảnh giới' + at);
      assert.equal(r0.sub, 'Khí Hải Sơ Thành · 85% tới cấp 10', 'danh hiệu: danh xưng cấp và tiến cảnh' + at);
      assert.match(r0.label, /^Tu vi: Sơ nhập giang hồ · Khí Hải Sơ Thành, cấp 9/, 'nhãn đọc' + at);
      await finish(page);
      await award(page);
      await page.waitForSelector('dialog.gr-breakthrough[open]');
      const bt = await page.evaluate(() => {
        const d = document.querySelector('dialog.gr-breakthrough[open]'), r = d.getBoundingClientRect();
        return { eyebrow: d.querySelector('.eyebrow').textContent, title: d.querySelector('h2').textContent, text: d.querySelector('.gr-bt-text').textContent, next: d.querySelector('.gr-bt-next').textContent, hero: !!d.querySelector('.gr-bt-hero svg'), fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight };
      });
      assert.equal(bt.eyebrow, 'ĐỘT PHÁ CẢNH GIỚI', 'nghi thức Đột phá' + at);
      assert.equal(bt.title, 'Tam lưu cao thủ', 'cảnh giới mới' + at);
      assert.equal(bt.text, 'Lam Y đã phá vỡ bình cảnh, bước vào cảnh giới Tam lưu cao thủ · cấp 10 · Phá Quan Nhập Lưu.', 'lời nghi thức' + at);
      assert.equal(bt.next, 'Cảnh giới kế tiếp: Nhị lưu cao thủ.', 'cảnh giới kế tiếp' + at);
      assert.ok(bt.hero && bt.fits, 'có hình hiệp khách, vừa màn hình' + at);
      assert.equal((await rank()).level, '10', 'danh hiệu cập nhật sau khi lưu công lực' + at);
      await page.locator('dialog.gr-breakthrough button').click();
      await page.waitForFunction(() => !document.querySelector('dialog.gr-breakthrough'));
      await page.waitForSelector('dialog.gr-story[open]');
      assert.equal(await page.locator('#gr-story-title').textContent(), 'Trấn ngủ say', 'đóng nghi thức thì mở chương của ải cấp 10 (v2.6.0: truyện mới)' + at);
      await page.locator('[data-story-close]').click();
      await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
      await clearOverlay(page);
      if (!touch) {
        await page.locator('.sidebar .gh-rank').click();
        await page.waitForFunction(() => view === 'growth');
      }
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 4b. Thiền: có nghi thức, không danh hiệu; tắt thông báo điểm nghiệp thì không có nghi thức.
    {
      const { context, page } = await h.open(width, { touch, now: NOW, workspace: seed(growth())() });
      await h.show(page, 'projects', 'p1');
      assert.equal(await page.locator('.gh-rank').count(), 0, 'Thiền không có danh hiệu trên thanh bên' + at);
      await finish(page);
      await award(page);
      await page.waitForSelector('dialog.gr-breakthrough[open]');
      await page.locator('dialog.gr-breakthrough button').click();
      await page.waitForFunction(() => !document.querySelector('dialog.gr-breakthrough'));
      await clearOverlay(page);
      await context.close();
      const quiet = await h.open(width, { touch, now: NOW, workspace: seed(growth({ notify: false }))() });
      await h.show(quiet.page, 'projects', 'p1');
      await finish(quiet.page);
      await award(quiet.page);
      await quiet.page.waitForTimeout(800);
      assert.equal(await quiet.page.locator('dialog.gr-breakthrough').count(), 0, 'tắt thông báo điểm nghiệp thì không có nghi thức' + at);
      await quiet.context.close();
    }
  }
  console.log('giangho-fx-browser ok');
} finally {
  await h.close();
}
