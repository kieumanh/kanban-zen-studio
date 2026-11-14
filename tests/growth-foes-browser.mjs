// v2.8.0 (Huyết Nguyệt Lộ): tranh động phe ác (dist/growth-foes.js) và khung "Huyết Nguyệt lộ" trong trang Tu vi.
//  1. Tranh: đủ 11 nhân vật (Giáo chủ + 10 Nguyệt Sứ), mỗi tranh là SVG có nhãn đọc (danh hiệu, tên, tà công) và có chuyển động;
//     bật giảm chuyển động thì đứng yên.
//  2. Khung đọc truyện: trang phe ác vẽ tranh của người đang nói trên cảnh Huyết Nguyệt đài; lời kể ở Huyết Nguyệt đài vẽ đối thủ
//     của chương; trang của hiệp khách vẫn vẽ hiệp khách.
//  3. Khung Huyết Nguyệt lộ (cấp 22): 10 ải đột phá và 11 đối thủ xếp theo cấp; trạng thái Đã vượt qua / Sắp đối đầu / Chưa lộ diện;
//     thanh tu luyện song hành (hiệp khách và Giáo chủ); đối thủ đã gặp bấm để đọc chương gặp.
//  Kiểm ở 390 (chạm), 820 (chạm), 1440 px; không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
// 60 nửa điểm = 30 điểm: cấp 22 (đã qua Miên Hồ ở 10, Thiên Diện ở 15, Lôi Tốc ở 20; sắp gặp Khúc U ở 25).
const seed = (half) => () => ({ schema: 1, projects: [], notes: [], growth: { v: 1, hero: 'nu', name: 'Lam Y', since: day(-40), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [half, 0, 0, 0, 0, 0, 0, 0] }] } });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const h = await startHarness({ seed: seed(60) });
try {
  // 1. Tranh.
  {
    const { context, page } = await h.open(1440, { workspace: seed(60)() });
    await h.show(page, 'growth');
    const t = await page.evaluate(() => {
      const box = document.createElement('div');
      box.innerHTML = window.zenFoe.IDS.map((id) => window.zenFoe.svg(id)).join('');
      document.body.append(box);
      const out = [...box.querySelectorAll('svg.gr-foe')].map((s) => ({
        id: s.dataset.foe, role: s.getAttribute('role'), label: s.getAttribute('aria-label'), view: s.getAttribute('viewBox'),
        moving: [...s.querySelectorAll('*')].some((el) => getComputedStyle(el).animationName !== 'none'),
      }));
      box.remove();
      return { ids: window.zenFoe.IDS, foes: window.zenTale.FOES.map((f) => f.id), out, none: window.zenFoe.svg('khong-co') };
    });
    assert.deepEqual([...t.ids].sort(), [...t.foes].sort(), 'đủ tranh cho Giáo chủ và 10 Nguyệt Sứ');
    for (const s of t.out) {
      assert.equal(s.role, 'img', 'tranh có vai trò hình: ' + s.id);
      assert.equal(s.view, '0 0 200 232', 'cùng khổ với hiệp khách: ' + s.id);
      assert.ok(s.moving, 'tranh có chuyển động: ' + s.id);
    }
    assert.match(t.out.find((s) => s.id === 'giao').label, /^Huyết Nguyệt Giáo chủ Lệ Vô Khuyết · Thôn Nguyệt Quyết/, 'nhãn đọc của Giáo chủ');
    assert.match(t.out.find((s) => s.id === 'mien').label, /^Thụy Nguyệt Sứ Miên Hồ · Mê Hồn Hương/, 'nhãn đọc của Miên Hồ');
    assert.equal(t.none, '', 'mã không có thì không vẽ');
    await context.close();
    const still = await h.open(390, { touch: true, workspace: seed(60)() });
    await still.page.emulateMedia({ reducedMotion: 'reduce' });
    await h.show(still.page, 'growth');
    const moving = await still.page.evaluate(() => [...document.querySelectorAll('.gr-route svg.gr-foe *')].filter((el) => getComputedStyle(el).animationName !== 'none').length);
    assert.equal(moving, 0, 'giảm chuyển động: tranh đứng yên');
    await still.context.close();
  }

  for (const [width, touch, style] of [
    [390, true, 'giangho'],
    [820, true, 'zen'],
    [1440, false, 'giangho'],
  ]) {
    const at = ' (' + width + 'px, ' + style + ')';
    const { context, page } = await h.open(width, { touch, workspace: seed(60)(), setup: ({ context }) => context.addInitScript((s) => localStorage.setItem('zen-style', s), style) });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await h.show(page, 'growth');
    await page.waitForSelector('.gr-route-panel');
    // 3. Khung Huyết Nguyệt lộ.
    const r = await page.evaluate(() => {
      const box = document.querySelector('.gr-route-panel');
      return {
        head: box.querySelector('h2').textContent,
        items: [...box.querySelectorAll('.gr-route > li')].map((li) => (li.classList.contains('gr-route-gate') ? 'ải ' + li.querySelector('b').textContent.replace('Ải cấp ', '') : li.dataset.foe)),
        states: Object.fromEntries([...box.querySelectorAll('.gr-route-foe')].map((li) => [li.dataset.foe, li.querySelector('.gr-route-tag').textContent])),
        current: [...box.querySelectorAll('.gr-route-foe[aria-current=step]')].map((li) => li.dataset.foe),
        rivals: [...box.querySelectorAll('.gr-rival [role=progressbar]')].map((b) => [b.getAttribute('aria-label'), b.getAttribute('aria-valuenow')]),
        art: [...box.querySelectorAll('.gr-route-foe .gr-route-art svg.gr-foe')].length,
        buttons: [...box.querySelectorAll('.gr-route-foe button[data-gr-story]')].map((b) => b.dataset.grStory),
      };
    });
    assert.match(r.head, /Đã vượt 3\/10 Nguyệt Sứ/, 'đếm Nguyệt Sứ đã vượt' + at);
    assert.deepEqual(r.items, ['ải 10', 'mien', 'dien', 'ải 20', 'loi', 'khuc', 'ải 30', 'bach', 'ải 40', 'ngoc', 'kho', 'ải 50', 'kinh', 'ải 60', 'suong', 'ải 70', 'vong', 'ải 80', 'ải 90', 'giao', 'ải 100'], 'lộ trình xếp theo cấp: ải đột phá và đối thủ' + at);
    assert.equal(r.items.filter((x) => x.startsWith('ải')).length, 10, '10 ải đột phá' + at);
    assert.equal(r.items.filter((x) => !x.startsWith('ải')).length, 11, '11 đối thủ' + at);
    assert.ok(r.items.indexOf('mien') > r.items.indexOf('ải 10') && r.items.indexOf('mien') < r.items.indexOf('ải 20'), 'Miên Hồ sau ải cấp 10' + at);
    assert.ok(r.items.indexOf('vong') < r.items.indexOf('ải 80') && r.items.indexOf('giao') > r.items.indexOf('ải 90'), 'Nguyệt Sứ dưới cấp 80, Giáo chủ cuối lộ trình' + at);
    assert.deepEqual([r.states.mien, r.states.dien, r.states.loi, r.states.khuc, r.states.bach, r.states.giao], ['Đã vượt qua', 'Đã vượt qua', 'Đã vượt qua', 'Sắp đối đầu', 'Chưa lộ diện', 'Chờ ở cấp 80'], 'trạng thái đối thủ' + at);
    assert.deepEqual(r.current, ['khuc'], 'đối thủ kế tiếp được đánh dấu' + at);
    assert.deepEqual(r.rivals, [['Lam Y: cấp 22 trên 100', '22'], ['Huyết Nguyệt Giáo chủ: cấp 77 trên 100', '77']], 'tu luyện song hành: Giáo chủ theo chương mới nhất đã mở (cấp 20 → 77)' + at);
    assert.equal(r.art, 11, 'mỗi đối thủ một tranh' + at);
    assert.deepEqual(r.buttons, ['10', '15', '20'], 'đối thủ đã gặp bấm để đọc chương' + at);
    // 2. Khung đọc: mở chương Miên Hồ.
    await page.click('.gr-route-foe[data-foe=mien] button');
    await page.waitForSelector('dialog.gr-story[open]');
    assert.equal(await page.locator('#gr-story-title').textContent(), 'Trấn ngủ say', 'mở chương gặp Miên Hồ' + at);
    const pages = [];
    for (let i = 0; i < 12; i++) {
      pages.push(await page.evaluate(() => {
        const d = document.querySelector('dialog.gr-story[open]');
        return { who: d.querySelector('.gr-story-who')?.textContent || '', cast: (d.querySelector('.gr-story-art .sc')?.dataset.who || '').split(',').filter(Boolean), lesson: !!d.querySelector('.gr-story-lesson') };
      }));
      if (pages.at(-1).lesson) break;
      await page.keyboard.press('ArrowRight');
    }
    const mien = pages.find((p) => p.who === 'Thụy Nguyệt Sứ Miên Hồ');
    // v2.17.0: tranh là một cảnh nhiều nhân vật (.sc, data-who liệt kê người có mặt) thay cho một hình đối thủ đứng riêng.
    assert.ok(mien.cast.includes('mien'), 'trang Miên Hồ nói: tranh có Miên Hồ' + at);
    assert.ok(pages.some((p) => p.who === 'Lam Y' && p.cast.includes('hero')), 'trang hiệp khách vẫn vẽ hiệp khách' + at);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
    // Khai cuộc: lời Giáo chủ có tranh Giáo chủ.
    await page.click('[data-gr-story="0"]');
    await page.waitForSelector('dialog.gr-story[open]');
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.querySelector('dialog.gr-story[open] .gr-story-art .sc')?.dataset.who.split(',').includes('giao')), true, 'lời Giáo chủ ở khai cuộc: tranh có Giáo chủ' + at);
    await page.keyboard.press('Escape');
    assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }
  console.log('growth-foes-browser ok');
} finally {
  await h.close();
}
