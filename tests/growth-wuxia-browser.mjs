// v1.83.0 (Kiếm Ảnh): nhân vật kiếm hiệp, phông sơn thủy, đổi tư thế mượt; tên phiên bản Hán Việt trong nhật ký phiên bản.
// Kiểm ở 390 (chạm), 820, 1440 px: phông và nhân vật có đủ chi tiết, không tràn ngang; bấm tư thế không dựng lại trang,
// hình mới hiện dần và hình cũ được gỡ đi; lời thoại tự đổi mà không vẽ lại nhân vật; giảm chuyển động thì mọi thứ đứng yên.
// v1.84.0 (Giang Hồ Hành): chữ trong mục Điểm tích lũy theo giọng giang hồ Hán Việt, không còn từ cũ; họa tiết (triện son trước tiêu đề,
// nút chính màu son, cảnh giới như ấn son); giao diện tối vẫn đọc được.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const growth = (hero) => ({
  v: 1,
  hero,
  since: '2026-10-01',
  log: [{ id: 'e1', d: '2026-11-09', s: 'task', k: 'task:e1', n: 'Việc một', p: [20, 6, 8, 4, 2, 6, 10, 4] }],
});
const ws = (hero) => () => ({ schema: 1, projects: [], notes: [], growth: growth(hero) });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const figures = (page) => page.evaluate(() => [...document.querySelectorAll('#gr-figure svg')].map((s) => s.dataset.pose + (s.classList.contains('is-leave') ? ':leave' : '')));

const h = await startHarness({ seed: ws('nam') });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 1. Phông sơn thủy và chi tiết nhân vật nam.
    {
      const { context, page } = await h.open(width, { touch, workspace: ws('nam')(), now: NOW });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'growth');
      await page.waitForSelector('#gr-figure svg.gr-hero');
      const s = await page.evaluate(() => ({
        scene: !!document.querySelector('.gr-stage-bg > svg.gr-scene[aria-hidden="true"]'),
        parts: ['gr-sc-far', 'gr-sc-mid', 'gr-sc-pine', 'gr-sc-cloud', 'gr-sc-petal'].filter((c) => document.querySelector('.gr-scene .' + c)),
        hero: ['gr-backsword', 'gr-ribbon', 'gr-tail', 'gr-fan', 'gr-pendant'].filter((c) => document.querySelector('#gr-figure .' + c)),
        bubbleTop: getComputedStyle(document.querySelector('#gr-bubble')).zIndex,
        figRect: document.querySelector('#gr-figure').getBoundingClientRect().width,
        stageRect: document.querySelector('.gr-stage-bg').getBoundingClientRect().width,
      }));
      assert.equal(s.scene, true, 'có phông sơn thủy, ẩn với trình đọc màn hình' + at);
      assert.deepEqual(s.parts, ['gr-sc-far', 'gr-sc-mid', 'gr-sc-pine', 'gr-sc-cloud', 'gr-sc-petal'], 'phông có núi xa, núi gần, cành tùng, mây, cánh đào' + at);
      assert.deepEqual(s.hero, ['gr-backsword', 'gr-ribbon', 'gr-tail', 'gr-fan', 'gr-pendant'], 'thiếu hiệp có kiếm sau lưng, dải lụa, đuôi tóc, quạt, ngọc bội' + at);
      assert.ok(s.figRect < s.stageRect, 'nhân vật nằm gọn trong sân khấu' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);

      // 2. Bấm tư thế: không dựng lại trang, hình mới hiện dần, hình cũ mờ rồi được gỡ.
      await page.evaluate(() => (document.querySelector('#gr-bubble').dataset.keep = '1'));
      await page.click('[data-gr-pose="martial"]');
      assert.deepEqual(await figures(page), ['martial', 'talk:leave'], 'hình mới đứng trước, hình cũ đang mờ đi' + at);
      assert.equal(await page.locator('#gr-figure svg.is-leave[aria-hidden="true"]').count(), 1, 'hình cũ ẩn với trình đọc màn hình' + at);
      assert.equal(await page.evaluate(() => document.querySelector('#gr-bubble').dataset.keep), '1', 'không dựng lại cả trang khi đổi tư thế' + at);
      assert.equal(await page.getAttribute('[data-gr-pose="martial"]', 'aria-pressed'), 'true', 'nút tư thế được chọn' + at);
      assert.equal(await page.getAttribute('[data-gr-pose="auto"]', 'aria-pressed'), 'false', 'bỏ chọn Tự động' + at);
      await page.waitForFunction(() => document.querySelectorAll('#gr-figure svg').length === 1, null, { timeout: 3000 });
      assert.deepEqual(await figures(page), ['martial'], 'hình cũ đã được gỡ' + at);
      assert.equal(await page.locator('#gr-figure .gr-slash').count(), 2, 'luyện kiếm có vệt kiếm khí' + at);
      assert.equal(await page.locator('#gr-figure .gr-cut .gr-blade').count(), 1, 'kiếm cầm trên tay' + at);
      await page.click('[data-gr-pose="taichi"]');
      await page.waitForFunction(() => document.querySelectorAll('#gr-figure svg').length === 1, null, { timeout: 3000 });
      assert.equal(await page.locator('#gr-figure .gr-taiji').count(), 1, 'thái cực có đồ âm dương' + at);
      await page.click('[data-gr-pose="zen"]');
      await page.waitForFunction(() => document.querySelectorAll('#gr-figure svg').length === 1, null, { timeout: 3000 });
      assert.equal(await page.locator('#gr-figure .gr-mote').count(), 6, 'tọa thiền có hạt sáng bay lên' + at);

      // 3. Chế độ tự động: lời thoại đổi theo nhịp mà không vẽ lại nhân vật khi tư thế giữ nguyên.
      await page.click('[data-gr-pose="auto"]');
      await page.waitForFunction(() => document.querySelectorAll('#gr-figure svg').length === 1, null, { timeout: 3000 });
      const before = await page.evaluate(() => { const s = document.querySelector('#gr-figure svg'); s.dataset.mark = 'x'; return { pose: s.dataset.pose, text: document.querySelector('#gr-bubble').textContent }; });
      await page.clock.runFor(4700);
      const after = await page.evaluate(() => { const s = document.querySelector('#gr-figure svg:not(.is-leave)'); return { pose: s.dataset.pose, mark: s.dataset.mark || '', text: document.querySelector('#gr-bubble').textContent }; });
      if (after.pose === before.pose) assert.equal(after.mark, 'x', 'giữ nguyên tư thế thì không vẽ lại nhân vật' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang sau khi đổi tư thế' + at);
      assert.deepEqual(errors, [], 'không có lỗi trang' + at);
      await context.close();
    }

    // 4. Nữ hiệp: trâm bộ dao, lụa khoác, kiếm bên hông; luyện kiếm thì kiếm rời hông lên tay.
    {
      const { context, page } = await h.open(width, { touch, workspace: ws('nu')(), now: NOW });
      await h.show(page, 'growth');
      await page.waitForSelector('#gr-figure svg.gr-hero[data-hero="nu"]');
      const parts = await page.evaluate(() => ['gr-bodao', 'gr-scarf', 'gr-hipsword', 'gr-sash'].filter((c) => document.querySelector('#gr-figure .' + c)));
      assert.deepEqual(parts, ['gr-bodao', 'gr-scarf', 'gr-hipsword', 'gr-sash'], 'nữ hiệp có trâm bộ dao, lụa khoác, kiếm bên hông, dải thắt lưng' + at);
      await page.click('[data-gr-pose="martial"]');
      await page.waitForFunction(() => document.querySelectorAll('#gr-figure svg').length === 1, null, { timeout: 3000 });
      assert.equal(await page.locator('#gr-figure .gr-hipsword').count(), 0, 'luyện kiếm thì kiếm không còn ở hông' + at);
      assert.equal(await page.locator('#gr-figure .gr-cut .gr-blade').count(), 1, 'nữ hiệp cầm kiếm' + at);
      await context.close();
    }

    // 5. Giảm chuyển động: nhân vật và phông đứng yên, đổi tư thế không có hiệu ứng mờ.
    {
      const { context, page } = await h.open(width, { touch, workspace: ws('nam')(), now: NOW });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await h.show(page, 'growth');
      await page.waitForSelector('#gr-figure svg.gr-hero');
      await page.click('[data-gr-pose="martial"]');
      assert.deepEqual(await figures(page), ['martial'], 'không có hình cũ mờ dần khi giảm chuyển động' + at);
      const moving = await page.evaluate(() => [...document.querySelectorAll('#gr-figure svg, #gr-figure svg *, .gr-scene *')].map((n) => getComputedStyle(n).animationName).filter((n) => n && n !== 'none'));
      assert.deepEqual(moving, [], 'không còn hoạt họa' + at);
      await context.close();
    }

    // 7. v1.84.0: ngôn ngữ giang hồ và họa tiết. Trang chính, báo cáo, bảng vận công, hộp đổi bảo vật không còn từ ngữ cũ.
    {
      const { context, page } = await h.open(width, { touch, workspace: ws('nu')(), now: NOW });
      await h.show(page, 'growth');
      await page.waitForSelector('#gr-figure svg.gr-hero');
      const OLD = /Nhân vật|Biểu đồ|Sử dụng điểm|Điểm hiện có|Phàm nhân|Trúc cơ|Cách tích điểm|Lịch sử cộng điểm|Điểm từng chỉ số|Tự động|Cười nói|Tập võ|Đi quyền|Ngồi thiền|Tiên tử/;
      const pageText = await page.locator('#main').innerText();
      assert.doesNotMatch(pageText, OLD, 'trang không còn từ ngữ cũ' + at);
      for (const t of ['GIANG HỒ TU LUYỆN', 'Tu vi của Nữ hiệp', 'Bát phương đồ', 'Bát mạch tu vi', 'Công phu lục', 'Tâm pháp tu luyện', 'Đổi bảo vật', 'Đổi hiệp khách', 'Tam lưu cao thủ'])
        assert.ok(pageText.includes(t), 'có chữ “' + t + '”' + at);
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.gr-chip')].map((n) => n.textContent)), ['Tùy hứng', 'Đàm tiếu', 'Luyện kiếm', 'Thái cực', 'Tọa thiền'], 'thế võ Hán Việt' + at);
      const look = await page.evaluate(() => ({
        seal: getComputedStyle(document.querySelector('.gr-axes > h2'), '::before').backgroundColor,
        primary: getComputedStyle(document.querySelector('[data-gr-spend]')).backgroundImage,
        realm: getComputedStyle(document.querySelector('.gr-realm-name')).backgroundColor,
        eyebrow: getComputedStyle(document.querySelector('.gr-page .eyebrow')).color,
      }));
      assert.equal(look.seal, 'rgb(184, 52, 74)', 'triện son trước tiêu đề' + at);
      assert.match(look.primary, /rgb\(194, 65, 63\)/, 'nút chính màu son' + at);
      assert.equal(look.realm, 'rgb(184, 52, 74)', 'cảnh giới như ấn son' + at);
      assert.equal(look.eyebrow, 'rgb(163, 44, 64)', 'nhãn đầu trang màu son' + at);
      await page.click('[data-gr-report]');
      await page.waitForSelector('.gr-report');
      const rep = await page.locator('#main').innerText();
      assert.doesNotMatch(rep, OLD, 'báo cáo không còn từ ngữ cũ' + at);
      assert.ok(rep.includes('Báo cáo tu luyện') && rep.includes('Luận từng mạch') && rep.includes('Bí kíp cải thiện'), 'báo cáo theo giọng giang hồ' + at);
      await page.click('[data-gr-back]');
      await page.click('[data-gr-spend]');
      await page.waitForSelector('#growth-spend[open]');
      const sp = await page.locator('#growth-spend').innerText();
      assert.doesNotMatch(sp, OLD, 'hộp đổi bảo vật không còn từ ngữ cũ' + at);
      assert.ok(sp.includes('Đổi bảo vật') && sp.includes('Trừ tu vi ở từng mạch'), 'hộp đổi bảo vật đúng chữ' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      await page.keyboard.press('Escape');
      await page.evaluate(() => window.zenGrowth.openAward({ source: 'task', key: 'task:x', title: 'Viết báo cáo', steps: 2 }));
      await page.waitForSelector('#growth-award[open]');
      const aw = await page.locator('#growth-award').innerText();
      assert.ok(aw.includes('Vận công bồi bổ') && aw.includes('Các hạ vừa hoàn thành') && aw.includes('Lưu công lực'), 'bảng vận công theo giọng giang hồ' + at);
      await context.close();
    }
    // 7b. Giao diện tối: chữ nhãn và cảnh giới vẫn đọc được trên nền tối.
    {
      const { context, page } = await h.open(width, { touch, workspace: ws('nam')(), now: NOW, colorScheme: 'dark' });
      await h.show(page, 'growth');
      await page.waitForSelector('#gr-figure svg.gr-hero');
      const c = await page.evaluate(() => {
        const lum = (s) => { const [r, g, b] = s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
        const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const b = getComputedStyle(n).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; } return 'rgb(0, 0, 0)'; };
        const eb = document.querySelector('.gr-page .eyebrow'), rn = document.querySelector('.gr-realm-name');
        return { theme: document.documentElement.dataset.theme, eyebrow: ratio(getComputedStyle(eb).color, bgOf(eb)), realm: ratio(getComputedStyle(rn).color, getComputedStyle(rn).backgroundColor) };
      });
      assert.equal(c.theme, 'dark');
      assert.ok(c.eyebrow >= 4.5, 'nhãn đầu trang đủ tương phản trên nền tối: ' + c.eyebrow.toFixed(2) + at);
      assert.ok(c.realm >= 4.5, 'chữ cảnh giới đủ tương phản: ' + c.realm.toFixed(2) + at);
      await context.close();
    }

    // 6. Nhật ký phiên bản: số phiên bản kèm tên Hán Việt.
    {
      const { context, page } = await h.open(width, { touch, workspace: ws('nam')() });
      await h.show(page, 'versions');
      await page.waitForSelector('.release-log .release-card');
      const ver = await page.evaluate(() => [...document.querySelectorAll('.release-log .release-ver')].map((n) => n.textContent.trim()));
      assert.ok(ver.includes('v1.83.0 · Kiếm Ảnh'), 'bản 1.83.0 có tên Kiếm Ảnh' + at);
      assert.ok(ver.includes('v1.84.0 · Giang Hồ Hành'), 'bản 1.84.0 có tên Giang Hồ Hành' + at);
      assert.ok(ver.includes('v1.82.0'), 'bản cũ giữ nguyên số phiên bản' + at);
      assert.equal(await noOverflow(page), true, 'nhật ký không tràn ngang' + at);
      await context.close();
    }
  }
  console.log('growth-wuxia-browser ok');
} finally {
  await h.close();
}
