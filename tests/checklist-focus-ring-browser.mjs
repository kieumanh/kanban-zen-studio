// Hồi quy v2.20.2 (Chuẩn Ô Nhập): ô "Thêm mục mới" của checklist (Giang hồ: "Thêm chiêu mới") là MỘT thanh bo tròn duy nhất.
// Lỗi cũ: bấm vào ô nhập thì vòng focus vẽ quanh riêng ô chữ nên hiện thành khung chữ nhật nằm lọt trong thanh bo tròn;
// ở Chế độ tập trung → Sửa còn lồng thêm một ô viền bo 12px bên trong thanh.
// Kiểm cả hai nơi dùng (hộp thoại công việc #editor và form sửa trong Chế độ tập trung), phong cách Thiền và Giang hồ,
// sáng / tối / tương phản cao, ở 390 (chạm), 820 và 1440 px:
//  - ô chữ không viền, nền trong suốt và KHÔNG tự vẽ vòng focus;
//  - vòng focus thuộc về cả thanh: nét liền ≥2px, thanh bo tròn hết cỡ (bán kính ≥ nửa chiều cao), đủ tương phản ≥3:1 với nền thanh và nền bên ngoài;
//  - rời ô thì vòng tắt; chế độ màu bắt buộc (forced-colors) vẫn thấy vòng;
//  - nút "+ Thêm" nằm gọn trong thanh, cách đều mép trên và dưới.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Farm Gửi Yêu Thương Vào Đất', '#7950c8', 3);
  p.tasks[0].title = 'Xây dựng trang Công việc cụ thể của farm';
  p.tasks[0].description = 'Soạn nội dung.';
  p.tasks[0].col = 'Doing';
  p.tasks[0].checks = [
    { id: 'c1', text: 'Phác thảo ý tưởng', done: false, pct: 0 },
    { id: 'c2', text: 'Dựng khung trang', done: true, pct: 100 },
  ];
  return { schema: 1, projects: [p], notes: [] };
};
const h = await startHarness({ seed });

// Mọi phép đo chạy trong trang: nhận bộ chọn của thanh và của ô chữ.
const measure = (page, sel) =>
  page.evaluate(({ wrapSel, taSel }) => {
    const wrap = document.querySelector(wrapSel);
    const ta = document.querySelector(taSel);
    const btn = wrap.querySelector('button');
    const parse = (c) => {
      const m = c.match(/[\d.]+/g).map(Number);
      return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 };
    };
    const over = (top, under) => ({
      r: top.r * top.a + under.r * (1 - top.a),
      g: top.g * top.a + under.g * (1 - top.a),
      b: top.b * top.a + under.b * (1 - top.a),
      a: 1,
    });
    // Nền thật của một phần tử: xếp chồng các nền trong suốt của tổ tiên lên nền trang.
    const effective = (el) => {
      const chain = [];
      for (let n = el; n; n = n.parentElement) chain.push(parse(getComputedStyle(n).backgroundColor));
      let acc = { r: 255, g: 255, b: 255, a: 1 };
      for (const c of chain.reverse()) if (c.a > 0) acc = over(c, acc);
      return acc;
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const w = getComputedStyle(wrap);
    const t = getComputedStyle(ta);
    const wr = wrap.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    const tr = ta.getBoundingClientRect();
    const ring = parse(w.outlineColor);
    const inside = effective(wrap);
    const outside = effective(wrap.parentElement);
    return {
      focused: document.activeElement === ta,
      taOutline: t.outlineStyle,
      taBorder: t.borderTopWidth,
      taBg: parse(t.backgroundColor).a,
      wrapOutline: w.outlineStyle,
      wrapOutlineW: parseFloat(w.outlineWidth) || 0,
      wrapRadius: parseFloat(w.borderTopLeftRadius) || 0,
      wrapH: wr.height,
      wrapW: wr.width,
      ringAlpha: ring.a,
      ringInside: ratio(ring, inside),
      ringOutside: ratio(ring, outside),
      btnTop: br.top - wr.top,
      btnBottom: wr.bottom - br.bottom,
      btnInside: br.left >= wr.left - 0.5 && br.right <= wr.right + 0.5,
      textInset: tr.left - wr.left,
      pageOverflow: document.documentElement.scrollWidth - innerWidth,
    };
  }, sel);

// Kiểm một thanh đang được chọn (focus) rồi rời ra.
const check = async (page, sel, tag) => {
  await page.locator(sel.wrapSel).scrollIntoViewIfNeeded();
  await page.locator(sel.taSel).focus();
  await page.waitForTimeout(120);
  const on = await measure(page, sel);
  assert.ok(on.focused, `${tag} ô nhập phải nhận focus`);
  assert.equal(on.taOutline, 'none', `${tag} ô chữ không tự vẽ vòng focus (khung chữ nhật)`);
  assert.equal(on.taBorder, '0px', `${tag} ô chữ không viền riêng (không lồng khung trong thanh)`);
  assert.equal(on.taBg, 0, `${tag} nền ô chữ trong suốt`);
  assert.equal(on.wrapOutline, 'solid', `${tag} vòng focus thuộc về cả thanh`);
  assert.ok(on.wrapOutlineW >= 2, `${tag} vòng focus dày ≥2px (${on.wrapOutlineW})`);
  assert.ok(on.wrapRadius >= on.wrapH / 2, `${tag} thanh bo tròn hết cỡ nên vòng focus là hình viên thuốc (bo ${on.wrapRadius}, cao ${Math.round(on.wrapH)})`);
  assert.ok(on.ringAlpha > 0.9, `${tag} vòng focus không trong suốt`);
  if (!tag.includes('màu bắt buộc')) {
    assert.ok(on.ringInside >= 3, `${tag} vòng focus tương phản ≥3:1 với nền thanh (${on.ringInside.toFixed(2)})`);
    assert.ok(on.ringOutside >= 3, `${tag} vòng focus tương phản ≥3:1 với nền bên ngoài (${on.ringOutside.toFixed(2)})`);
  }
  assert.ok(on.btnInside, `${tag} nút + Thêm nằm gọn trong thanh`);
  assert.ok(Math.abs(on.btnTop - on.btnBottom) <= 1.5, `${tag} nút cách đều mép trên và dưới (${on.btnTop.toFixed(1)} / ${on.btnBottom.toFixed(1)})`);
  assert.ok(on.textInset >= 14, `${tag} chữ cách mép thanh ≥14px (${on.textInset.toFixed(1)})`);
  assert.ok(on.pageOverflow <= 0, `${tag} trang không tràn ngang`);
  await page.locator(sel.taSel).blur();
  await page.waitForTimeout(80);
  const off = await measure(page, sel);
  assert.equal(off.wrapOutline, 'none', `${tag} rời ô nhập thì vòng focus tắt`);
};

const EDITOR = { wrapSel: '#editor-body .zen-check-add', taSel: '#editor-body .zen-check-add textarea' };
const FOCUS = { wrapSel: '.zen-fe-form .zen-check-add', taSel: '.zen-fe-form [data-fe-new]' };

const openEditor = async (page) => {
  await h.show(page, 'board');
  await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[0]));
  await page.waitForSelector(EDITOR.wrapSel, { state: 'attached' });
};
const openFocus = async (page) => {
  await h.show(page, 'projects');
  await page.evaluate(() => {
    _WF.focus = { p: 'p1', t: 'p1t0' };
    go('focus');
  });
  await page.locator('[data-fe-edit]').click();
  await page.waitForSelector(FOCUS.wrapSel, { state: 'attached' });
  await page.waitForTimeout(250);
};

const MODES = [
  { label: 'sáng', colorScheme: 'light' },
  { label: 'tối', colorScheme: 'dark' },
  { label: 'sáng + tương phản cao', colorScheme: 'light', contrast: 'more' },
  { label: 'tối + tương phản cao', colorScheme: 'dark', contrast: 'more' },
];
const SIZES = [
  [390, true],
  [820, false],
  [1440, false],
];

try {
  for (const style of ['zen', 'giangho']) {
    const setup = async ({ context }) => context.addInitScript((s) => localStorage.setItem('zen-style', s), style);
    for (const mode of MODES) {
      // Đủ ba cỡ ở chế độ sáng và tối; tương phản cao chỉ cần một cỡ vì bố cục không đổi.
      const sizes = mode.contrast ? [SIZES[0]] : SIZES;
      for (const [width, touch] of sizes) {
        const tag = `[${style} ${mode.label} ${width}px]`;
        const { context, page } = await h.open(width, { touch, colorScheme: mode.colorScheme, ...(mode.contrast ? { contrast: mode.contrast } : {}), setup });
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await openEditor(page);
        await check(page, EDITOR, `${tag} hộp thoại công việc`);
        // Gõ nhiều dòng: thanh cao lên mà vẫn là một thanh có vòng focus liền.
        await page.locator(EDITOR.taSel).focus();
        await page.keyboard.type('Dòng một');
        await page.keyboard.press('Shift+Enter');
        await page.keyboard.type('Dòng hai');
        await page.waitForTimeout(120);
        const tall = await measure(page, EDITOR);
        assert.equal(tall.taOutline, 'none', `${tag} gõ nhiều dòng: ô chữ vẫn không tự vẽ vòng focus`);
        assert.equal(tall.wrapOutline, 'solid', `${tag} gõ nhiều dòng: vòng focus vẫn thuộc về cả thanh`);
        await context.close();

        const second = await h.open(width, { touch, colorScheme: mode.colorScheme, ...(mode.contrast ? { contrast: mode.contrast } : {}), setup });
        second.page.on('pageerror', (e) => errors.push(String(e)));
        await openFocus(second.page);
        await check(second.page, FOCUS, `${tag} Chế độ tập trung`);
        assert.deepEqual(errors, [], `${tag} không lỗi trang`);
        await second.context.close();
      }
    }
  }

  // Chế độ màu bắt buộc (Windows High Contrast): đường viền và đổ bóng bị bỏ, nên vòng focus phải là outline và vẫn hiện.
  for (const style of ['zen', 'giangho']) {
    const setup = async ({ context }) => context.addInitScript((s) => localStorage.setItem('zen-style', s), style);
    const { context, page } = await h.open(390, { touch: true, forcedColors: 'active', setup });
    await openEditor(page);
    await check(page, EDITOR, `[${style} màu bắt buộc 390px] hộp thoại công việc`);
    await context.close();
  }
  console.log('checklist-focus-ring-browser: ok');
} finally {
  await h.close();
}
