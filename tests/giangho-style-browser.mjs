// v1.86.0 (Chu Mặc): công tắc Phong cách trong Cài đặt → Giao diện (Thiền / Giang hồ) và họa tiết Giang hồ cho toàn ứng dụng.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px: mặc định là Thiền; chọn Giang hồ thì đổi ngay (son, giấy dó, chữ có chân), lưu trên thiết bị và giữ sau
// khi tải lại (đặt trước khi vẽ, không chớp); bảng lệnh cũng đổi được; về Thiền thì trả lại như cũ; nền tối và tương phản cao vẫn đúng;
// các màn hình chính không tràn ngang, không lỗi trang. Dữ liệu không đổi. (Chữ giang hồ từ v1.87.0: xem tests/giangho-lex-browser.mjs.)
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const VIEWS = ['dashboard', 'projects', 'calendar', 'focus', 'habits', 'growth', 'notes', 'budget', 'resources'];
const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const lum = ([r, g, b]) => {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const look = (page) =>
  page.evaluate(() => {
    const btn = document.querySelector('#main .btn.primary, #main button.primary') || document.querySelector('.btn.primary');
    return {
      style: document.documentElement.dataset.style || '',
      body: getComputedStyle(document.body).backgroundColor,
      bodyImage: getComputedStyle(document.body).backgroundImage,
      primary: btn ? getComputedStyle(btn).backgroundImage : '',
      h1Font: getComputedStyle(document.querySelector('#main h1')).fontFamily,
      h1Color: getComputedStyle(document.querySelector('#main h1')).color,
      stored: localStorage.getItem('zen-style'),
    };
  });
const openAppearance = async (page) => {
  await page.evaluate(() => {
    accountPanel();
    document.querySelectorAll('#editor details').forEach((d) => (d.open = true));
  });
  await page.waitForSelector('input[name=zen-style]', { state: 'attached' });
};
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const h = await startHarness();
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 1. Mặc định Thiền; Cài đặt có nhóm Phong cách hai lựa chọn.
    {
      const record = ({ context }) => context.addInitScript(() => document.addEventListener('DOMContentLoaded', () => (window.__styleAtDcl = document.documentElement.dataset.style || '')));
      const { context, page } = await h.open(width, { touch, setup: record });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'dashboard');
      const zen = await look(page);
      assert.equal(zen.style, '', 'mặc định không có data-style' + at);
      assert.doesNotMatch(zen.h1Font, /Noto Serif/, 'Thiền giữ phông cũ' + at);
      await openAppearance(page);
      const group = await page.evaluate(() => {
        const set = document.querySelector('input[name=zen-style]').closest('fieldset');
        return { legend: set.querySelector('legend').textContent, options: [...set.querySelectorAll('label')].map((l) => [l.querySelector('input').value, l.querySelector('strong').textContent, l.querySelector('input').checked]) };
      });
      assert.deepEqual(group, { legend: 'Phong cách', options: [['zen', 'Thiền', true], ['giangho', 'Giang hồ', false]] }, 'nhóm Phong cách' + at);
      const box = await page.locator('input[name=zen-style][value=giangho]').evaluate((i) => i.closest('label').getBoundingClientRect().height);
      assert.ok(box >= 40, 'lựa chọn đủ cao để chạm' + at);
      // 2. Chọn Giang hồ: đổi ngay, lưu trên thiết bị.
      await page.locator('input[name=zen-style][value=giangho]').evaluate((i) => i.closest('label').click());
      await page.waitForFunction(() => document.documentElement.dataset.style === 'giangho');
      await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
      await h.show(page, 'dashboard');
      const gh = await look(page);
      assert.equal(gh.stored, 'giangho', 'lưu lựa chọn trên thiết bị' + at);
      assert.match(gh.primary, /rgb\(168, 40, 60\)/, 'nút chính màu son' + at);
      assert.notEqual(gh.body, zen.body, 'nền trang đổi' + at);
      const [r, , b] = rgb(gh.body);
      assert.ok(r > b, 'nền giấy dó ngả ấm: ' + gh.body + at);
      assert.match(gh.h1Font, /Noto Serif/, 'tiêu đề chữ có chân' + at);
      assert.match(gh.bodyImage, /data:image\/svg\+xml/, 'có họa tiết núi mực trên nền' + at);
      assert.ok(ratio(gh.h1Color, gh.body) >= 4.5, 'tiêu đề đủ tương phản' + at);
      // 3. Tải lại: phong cách có ngay từ đầu (không chớp), Cài đặt nhớ lựa chọn.
      await page.reload();
      await page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa' && document.documentElement.dataset.zenReady === '1');
      assert.equal(await page.evaluate(() => window.__styleAtDcl), 'giangho', 'đặt phong cách trước khi trang hiện' + at);
      await openAppearance(page);
      assert.equal(await page.locator('input[name=zen-style][value=giangho]').isChecked(), true, 'Cài đặt nhớ Giang hồ' + at);
      // 4. Về Thiền: trả lại như cũ.
      await page.locator('input[name=zen-style][value=zen]').evaluate((i) => i.closest('label').click());
      await page.waitForFunction(() => !document.documentElement.dataset.style);
      await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
      await h.show(page, 'dashboard');
      const back = await look(page);
      assert.equal(back.stored, null, 'xóa lựa chọn đã lưu' + at);
      assert.equal(back.body, zen.body, 'nền trở lại như cũ' + at);
      assert.equal(back.primary, zen.primary, 'nút chính trở lại như cũ' + at);
      // 5. Bảng lệnh: "Phong cách Giang hồ".
      await page.keyboard.press('Control+k');
      await page.waitForFunction(() => document.querySelector('.studio-palette')?.open === true);
      await page.keyboard.type('Phong cách Giang');
      await page.waitForFunction(() => [...document.querySelectorAll('.studio-palette [role=option]')].some((o) => o.textContent.includes('Phong cách Giang hồ')));
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.documentElement.dataset.style === 'giangho');
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 6. Các màn hình chính ở Giang hồ: không tràn ngang, không lỗi; nội dung chữ giữ nguyên.
    {
      const gh = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
      // Lời chào theo giờ trong ngày (sáng/trưa/chiều/tối); giờ sáng cố định để kiểm "các hạ" không phụ thuộc giờ chạy thử
      // (CI chạy vào buổi chiều giờ Việt Nam sẽ ra "Nắng chiều còn dài…", không có chữ "các hạ").
      const { context, page } = await h.open(width, { touch, now: '2026-11-12T09:00:00+07:00', setup: gh });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      for (const v of VIEWS) {
        await h.show(page, v);
        assert.equal(await noOverflow(page), true, 'không tràn ngang: ' + v + at);
      }
      await h.show(page, 'dashboard');
      // v1.86.0 chỉ đổi màu nên tiêu đề còn "Chào…"; từ v1.87.0 bộ chuyển ngữ đổi sang lời chào giang hồ.
      assert.match(await page.locator('#main h1').innerText(), /các hạ/, 'tiêu đề theo giọng giang hồ (v1.87.0)' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 7. Nền tối + Giang hồ; tương phản cao + Giang hồ.
    {
      const gh = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
      const dark = await h.open(width, { touch, colorScheme: 'dark', setup: gh });
      await h.show(dark.page, 'dashboard');
      const d = await look(dark.page);
      assert.equal(await dark.page.evaluate(() => document.documentElement.dataset.theme), 'dark');
      assert.ok(lum(rgb(d.body)) < 0.05, 'nền tối: ' + d.body + at);
      const [r, , b] = rgb(d.body);
      assert.ok(r >= b, 'nền tối ngả ấm (mực), không ngả tím: ' + d.body + at);
      assert.ok(ratio(d.h1Color, d.body) >= 4.5, 'tiêu đề đủ tương phản trên nền tối' + at);
      await dark.context.close();
      const hc = await h.open(width, { touch, contrast: 'more', setup: gh });
      await h.show(hc.page, 'dashboard');
      const c = await look(hc.page);
      assert.equal(await hc.page.evaluate(() => document.documentElement.dataset.contrast), 'high');
      assert.equal(c.bodyImage, 'none', 'tương phản cao: bỏ họa tiết nền' + at);
      assert.ok(ratio(c.h1Color, c.body) >= 7, 'tương phản cao vẫn thắng màu Giang hồ' + at);
      await hc.context.close();
    }
  }
  console.log('giangho-style-browser ok');
} finally {
  await h.close();
}
