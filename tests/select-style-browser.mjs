// v2.45.0 (Ô Chọn Chung Một Kiểu): mọi ô chọn (select) cùng một dáng.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px × sáng, tối, Giang hồ: duyệt các trang (Tổng quan, Dự án, Lịch, Gantt, Phân bổ tài nguyên, Hằng ngày,
// Tài nguyên, Ghi chú) và mở các hộp thoại (sửa việc, thêm việc hằng ngày, ghi chú mới, Tài khoản & Cài đặt) rồi gom MỌI ô chọn trong trang:
//  1. bo tròn 12 px, viền 1 nét liền, bỏ dáng gốc của hệ điều hành (appearance: none), có mũi tên (hình SVG nhỏ, không dùng gradient);
//  2. ô đang hiện cao ≥ 44 px; cỡ chữ 16 px ở điện thoại (tránh tự phóng to), 14 px ở máy lớn;
//  3. số kiểu khác nhau (bo góc, viền, cỡ chữ) đúng bằng một; chữ và nền ô chọn đủ tương phản (đã có a11y-contrast kiểm sâu hơn).
//  4. ô chọn nhiều dòng (multiple) hay có data-zen-native không bị ép dáng; ô ẩn bằng wf-original-select không bị đổi.
import assert from 'node:assert/strict';
import { startHarness, defaultSeed } from './lib/browser-harness.mjs';

const seed = () => {
  const s = defaultSeed();
  s.notes = [{ id: 'n1', title: 'Ý đầu tiên', text: 'Nội dung', group: '', keywords: [], createdAt: '2026-11-10T00:00:00.000Z', updatedAt: '2026-11-10T00:00:00.000Z' }];
  s.dailyHabits = [{ id: 'h1', name: 'Đi bộ', icon: '🚶', color: '#2e7d5b', createdAt: '2026-10-20', goal: 5, done: [] }];
  return s;
};
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const THEMES = [
  { name: 'sáng', colorScheme: 'light', setup: null },
  { name: 'tối', colorScheme: 'dark', setup: null },
  { name: 'Giang hồ', colorScheme: 'light', setup: GH },
];

// Gom ô chọn đang có trong trang (cả ô ẩn trong hộp thoại đóng) kèm kiểu tính toán.
const collect = () =>
  [...document.querySelectorAll('select')]
    .filter((s) => !s.multiple && !(s.size > 1) && !s.hasAttribute('data-zen-native') && !s.classList.contains('wf-original-select'))
    .map((s) => {
      const c = getComputedStyle(s);
      const r = s.getBoundingClientRect();
      return {
        key: s.id || s.name || s.getAttribute('aria-label') || s.className || 'select',
        shown: r.width > 0 && r.height > 0 && c.visibility !== 'hidden',
        height: r.height,
        radius: c.borderTopLeftRadius,
        borderWidth: c.borderTopWidth,
        borderStyle: c.borderTopStyle,
        appearance: c.appearance,
        arrow: /data:image\/svg\+xml/.test(c.backgroundImage) && !/gradient/.test(c.backgroundImage),
        size: c.fontSize,
      };
    });

const h = await startHarness({ seed });
try {
  let total = 0;
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of THEMES) {
      const at = ' (' + width + 'px, ' + theme.name + ')';
      const { context, page } = await h.open(width, { touch, workspace: seed(), colorScheme: theme.colorScheme, setup: theme.setup });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const found = new Map();
      const gather = async (where) => {
        for (const s of await page.evaluate(collect)) {
          const prev = found.get(s.key);
          if (!prev || (s.shown && !prev.shown)) found.set(s.key, { ...s, where });
        }
      };
      const closeDialog = async () => {
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      };
      for (const v of ['dashboard', 'projects', 'calendar', 'gantt', 'budget', 'habits', 'resources', 'notes']) {
        await h.show(page, v);
        await gather(v);
      }
      // Hộp thoại: sửa việc, việc mới, thêm việc hằng ngày, ghi chú mới, Tài khoản & Cài đặt.
      await h.show(page, 'projects');
      await page.locator('[data-task]').first().click();
      await page.waitForSelector('dialog[open]');
      await gather('sửa việc');
      await closeDialog();
      await h.show(page, 'habits');
      await page.locator('[data-hb-add]').first().click();
      await page.waitForSelector('dialog[open]');
      await gather('thêm việc hằng ngày');
      await closeDialog();
      await h.show(page, 'notes');
      await page.locator('[data-note-new]').first().click();
      await page.waitForSelector('dialog[open]');
      await gather('ghi chú mới');
      await closeDialog();
      await page.evaluate(() => accountPanel());
      await page.waitForSelector('dialog[open]');
      await gather('Tài khoản');
      await closeDialog();

      const list = [...found.values()];
      assert.ok(list.length >= 12, 'gom đủ nhiều ô chọn (' + list.length + ': ' + list.map((s) => s.key) + ')' + at);
      total += list.length;
      const bad = (test) => list.filter((s) => !test(s)).map((s) => s.key + '@' + s.where + ' ' + JSON.stringify(s));
      assert.deepEqual(bad((s) => s.radius === '12px'), [], 'bo tròn 12 px' + at);
      assert.deepEqual(bad((s) => s.borderWidth === '1px' && s.borderStyle === 'solid'), [], 'viền 1 nét liền' + at);
      assert.deepEqual(bad((s) => s.appearance === 'none'), [], 'bỏ dáng gốc của hệ điều hành' + at);
      assert.deepEqual(bad((s) => s.arrow), [], 'có mũi tên SVG, không gradient' + at);
      assert.deepEqual(bad((s) => !s.shown || s.height >= 43.5), [], 'ô đang hiện cao ≥ 44 px' + at);
      // Cỡ chữ chỉ có nghĩa với ô đang hiện (ô ẩn bằng display: none, như ô “Kiểu danh sách” trong thanh định dạng, chỉ thừa hưởng cỡ chữ của khung chứa).
      assert.deepEqual(bad((s) => !s.shown || s.size === (width <= 700 ? '16px' : '14px')), [], 'cỡ chữ ' + (width <= 700 ? '16' : '14') + ' px' + at);
      assert.equal(new Set(list.map((s) => [s.radius, s.borderWidth, s.borderStyle].join('|'))).size, 1, 'chỉ một kiểu bo góc và viền' + at);
      assert.equal(new Set(list.filter((s) => s.shown).map((s) => s.size)).size, 1, 'chỉ một cỡ chữ' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at + ': ' + errors);
      await context.close();
    }
  }
  console.log('PASS: mọi ô chọn cùng một dáng (bo 12 px, viền 1 nét, mũi tên SVG, ≥ 44 px, cỡ chữ theo thiết bị) — 390, 820, 1440px × sáng, tối, Giang hồ, ' + total + ' lượt kiểm');

  // Chỗ không bị ép dáng: ô chọn nhiều dòng, ô data-zen-native, ô ẩn của bộ chọn tùy biến.
  const { context, page } = await h.open(1440, { workspace: seed() });
  const kept = await page.evaluate(() => {
    const make = (attrs) => {
      const s = document.createElement('select');
      s.innerHTML = '<option>Một</option><option>Hai</option>';
      for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
      document.body.append(s);
      const c = getComputedStyle(s);
      const out = { radius: c.borderTopLeftRadius, arrow: /data:image\/svg\+xml/.test(c.backgroundImage) && !/gradient/.test(c.backgroundImage) };
      s.remove();
      return out;
    };
    return { multiple: make({ multiple: '' }), size: make({ size: '4' }), native: make({ 'data-zen-native': '' }), plain: make({}) };
  });
  assert.equal(kept.plain.radius, '12px', 'ô chọn thường được đổi dáng');
  for (const k of ['multiple', 'size', 'native']) assert.ok(kept[k].radius !== '12px' && !kept[k].arrow, 'ô ' + k + ' giữ dáng riêng: ' + JSON.stringify(kept[k]));
  await context.close();
  console.log('PASS: ô chọn nhiều dòng, size > 1 và data-zen-native giữ dáng riêng');
} finally {
  await h.close();
}
