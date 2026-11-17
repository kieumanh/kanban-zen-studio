// v2.50.0 (Báo Đầy Dữ Liệu): từ 70% giới hạn 20 MB dữ liệu đồng bộ, đầu Cài đặt hiện khung báo mức dùng.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px, cả Thiền lẫn Giang hồ (dữ liệu được độn thêm trong bộ nhớ, không lưu):
//  1. Dưới 70% (kể cả 69%): không có khung. Từ 70%: có khung mức “warn” ghi đúng phần trăm và MB; từ 90%: mức “high”; từ 100%: mức “full” (“đã đầy”).
//  2. Khung nằm ngay dưới tiêu đề, gọn trong hộp thoại, không tràn ngang; nút “Xem chi tiết dung lượng” đủ lớn (chạm ≥ 44 px, chuột ≥ 36 px) và mở đúng nhóm “Dung lượng dữ liệu”.
//  3. Chữ đủ tương phản (≥ 4.5:1) ở giao diện sáng, tối và Giang hồ; vạch màu mức cao khác mức thường.
//  4. Giang hồ: chữ đổi giọng, không còn từ Thiền (đồng bộ, Thùng rác, dự án, ghi chú).
//  5. Không lưu gì: đóng, bớt dữ liệu, mở lại Cài đặt thì khung biến mất.
import assert from 'node:assert/strict';
import { startHarness, defaultSeed } from './lib/browser-harness.mjs';

const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const THEMES = [
  { name: 'sáng', colorScheme: 'light', setup: null },
  { name: 'tối', colorScheme: 'dark', setup: null },
  { name: 'Giang hồ', colorScheme: 'light', setup: GH },
];
const LIMIT = 20000000;

// Độn dữ liệu trong bộ nhớ cho đúng tỷ lệ (không gọi save).
const padTo = (page, ratio) =>
  page.evaluate((target) => {
    data.notes = data.notes.filter((n) => n.id !== 'pad-big');
    const base = window.zenCapacityWarning.size();
    const need = Math.max(0, Math.round(target) - base - 200);
    data.notes.push({ id: 'pad-big', title: 'Độn', text: 'x'.repeat(need), group: '', keywords: [], createdAt: '2026-11-10T00:00:00.000Z', updatedAt: '2026-11-10T00:00:00.000Z' });
    return window.zenCapacityWarning.size();
  }, ratio * LIMIT);
async function open(page) {
  await page.evaluate(() => accountPanel());
  await page.waitForSelector('dialog[open] #editor-body');
  await page.waitForSelector('dialog[open] #storage-capacity', { state: 'attached', timeout: 8000 });
}
async function close(page) {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
}
const info = (page) =>
  page.evaluate(() => {
    const box = document.querySelector('#editor-body .capacity-warning');
    if (!box) return null;
    const dialog = document.querySelector('dialog[open]').getBoundingClientRect(),
      r = box.getBoundingClientRect(),
      heading = document.querySelector('#editor-body h2'),
      button = box.querySelector('[data-capacity-open]').getBoundingClientRect();
    const lum = (c) => {
      const [R, G, B] = c.match(/[\d.]+/g).slice(0, 3).map((v) => {
        v = Number(v) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    };
    const backdrop = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba?\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)|transparent/.test(c)) return c;
      }
      return 'rgb(255,255,255)';
    };
    const text = box.querySelector('p'),
      a = lum(getComputedStyle(text).color),
      b = lum(backdrop(text));
    return {
      level: box.dataset.level,
      role: box.getAttribute('role'),
      lead: box.querySelector('strong').textContent,
      text: box.textContent.replace(/\s+/g, ' ').trim(),
      fits: r.left >= dialog.left - 1 && r.right <= dialog.right + 1,
      belowHeading: heading.nextElementSibling === box,
      buttonHeight: button.height,
      contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      accent: getComputedStyle(box).borderLeftColor,
      noOverflow: document.querySelector('dialog[open]').scrollWidth <= document.querySelector('dialog[open]').clientWidth + 1,
    };
  });

const h = await startHarness({ seed: defaultSeed });
try {
  let checks = 0;
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of THEMES) {
      const at = ' (' + width + 'px, ' + theme.name + ')';
      const { context, page } = await h.open(width, { touch, workspace: defaultSeed(), colorScheme: theme.colorScheme, setup: theme.setup });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'dashboard');
      const accents = {};

      // 1. Các mức.
      for (const [ratio, level, percent] of [
        [0.3, '', 0],
        [0.69, '', 0],
        [0.705, 'warn', 70],
        [0.855, 'warn', 85],
        [0.905, 'high', 90],
        [0.995, 'high', 99],
        [1.02, 'full', 100],
      ]) {
        const bytes = await padTo(page, ratio);
        await open(page);
        const got = await info(page);
        checks++;
        if (!level) {
          assert.equal(got, null, 'dưới 70% không có khung (' + ratio + ')' + at);
        } else {
          assert.ok(got, 'có khung ở ' + ratio + at);
          assert.equal(got.level, level, 'mức ' + level + ' ở ' + ratio + at);
          assert.equal(got.role, 'status', 'role=status' + at);
          assert.ok(got.belowHeading && got.fits && got.noOverflow, 'nằm ngay dưới tiêu đề, gọn trong hộp thoại: ' + JSON.stringify(got) + at);
          assert.ok(got.buttonHeight >= (touch ? 43.5 : 36), 'nút đủ lớn (chạm ≥ 44 px, chuột ≥ 36 px): ' + got.buttonHeight + at);
          assert.ok(got.contrast >= 4.5, 'chữ đủ tương phản: ' + got.contrast.toFixed(2) + ' ở ' + ratio + at);
          const mb = (bytes / 1048576).toFixed(1).replace('.', ',');
          if (theme.name === 'Giang hồ') {
            assert.match(got.lead, level === 'full' ? /^Dữ liệu thông mạch đã đầy: / : new RegExp('^Dữ liệu thông mạch đã dùng ' + percent + '%: '), 'lead Giang hồ: ' + got.lead + at);
            assert.doesNotMatch(got.text, /đồng bộ|Thùng rác|dự án|ghi chú|bản phác thảo/, 'không còn chữ Thiền: ' + got.text + at);
            assert.match(got.text, /thông mạch/, 'có chữ giang hồ' + at);
          } else {
            assert.match(got.lead, level === 'full' ? /^Dữ liệu đồng bộ đã đầy: / : new RegExp('^Dữ liệu đồng bộ đã dùng ' + percent + '%: '), 'lead Thiền: ' + got.lead + at);
          }
          assert.ok(got.lead.includes(mb + ' MB'), 'ghi đúng MB (' + mb + '): ' + got.lead + at);
          accents[level] = got.accent;
        }
        await close(page);
      }
      assert.notEqual(accents.warn, accents.high, 'vạch màu mức cao khác mức thường' + at);
      assert.equal(accents.high, accents.full, 'mức cao và đầy cùng vạch màu' + at);

      // 2. Nút mở đúng nhóm Dung lượng dữ liệu.
      await padTo(page, 0.8);
      await open(page);
      const closedBefore = await page.evaluate(() => !document.querySelector('#storage-capacity').closest('details').open);
      assert.ok(closedBefore, 'nhóm dung lượng đóng sẵn' + at);
      await page.locator('[data-capacity-open]').click();
      assert.ok(await page.evaluate(() => document.querySelector('#storage-capacity').closest('details').open), 'bấm nút thì mở nhóm Dung lượng dữ liệu' + at);
      await close(page);

      // 5. Bớt dữ liệu → khung biến mất; không có gì được lưu.
      await padTo(page, 0.2);
      await open(page);
      assert.equal(await info(page), null, 'bớt dữ liệu thì hết khung' + at);
      await close(page);
      assert.deepEqual(errors, [], 'không lỗi trang' + at + ': ' + errors);
      await context.close();
    }
  }
  console.log('PASS: khung báo mức dùng dữ liệu — không có dưới 70%, mức thường/cao/đầy đúng phần trăm và MB, gọn, đủ tương phản, nút mở nhóm dung lượng, Giang hồ đổi giọng (390, 820, 1440px × sáng, tối, Giang hồ, ' + checks + ' lượt)');
} finally {
  await h.close();
}
