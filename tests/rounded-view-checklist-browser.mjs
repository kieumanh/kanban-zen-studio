// Hồi quy v1.19.7: (1) khung "Chế độ xem" ở thanh bên bo tròn; (2) thanh tiến độ từng mục checklist mỏng, không nằm trong khung viền,
// đầu tô luôn bo tròn và hình vẽ KHÔNG đổi khi kéo. Sáng + tối, 390 / 820 / 1440px.
// Nguyên nhân cũ của (2): quy tắc ".task-fields input" (độ ưu tiên cao hơn) ghi đè kiểu thanh nên thanh nằm trong khung 12px, phần tô dày và vuông góc.
// Rãnh nằm trong shadow DOM của trình duyệt nên đo bằng điểm ảnh thật (chụp vùng thanh rồi đếm điểm ảnh cùng màu theo cột).
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';
import { decodePng, colorRun } from './lib/png.mjs';

const seed = () => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 3);
  p.tasks[0].title = 'Chuẩn bị khóa tu';
  p.tasks[0].col = 'Doing';
  p.tasks[0].checks = [
    { id: 'c1', text: 'Liên hệ địa điểm', done: true },
    { id: 'c2', text: 'Soạn chương trình', done: false, pct: 40 },
    { id: 'c3', text: 'In tài liệu', done: false, pct: 0 },
  ];
  return { schema: 1, projects: [p], notes: [] };
};
const h = await startHarness({ seed });

const FILL = [121, 80, 200];
const REST = { light: [230, 220, 239], dark: [35, 29, 40] };
const sel = '#editor-body input[name="check-pct-1"]';

const state = (page) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const r = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    return {
      x: b.x,
      y: b.y,
      w: b.width,
      h: b.height,
      pad: r.padding,
      borderW: r.borderTopWidth,
      bg: r.backgroundImage,
      p: el.style.getPropertyValue('--p'),
      pn: el.style.getPropertyValue('--pn'),
      value: el.value,
    };
  }, sel);

// Đo hình vẽ: độ dày phần tô (ở khoảng 15% chiều rộng, luôn nằm trong phần tô khi giá trị ≥ 40) và độ dày rãnh còn lại (ở 95%), cùng số điểm ảnh tô ở cột ngoài cùng bên trái.
async function paint(page, scheme, expectFill) {
  const s = await state(page);
  const png = await page.screenshot({
    clip: { x: s.x, y: s.y, width: s.w, height: s.h },
  });
  const img = decodePng(png);
  const col = (f) => Math.round(f * (img.width - 1));
  return {
    s,
    fill: expectFill ? colorRun(img, col(0.15), FILL) : null,
    rest: colorRun(img, col(0.95), REST[scheme]),
    leftEdge: colorRun(img, 1, FILL),
    leftMid: colorRun(img, col(0.15), FILL),
  };
}

try {
  for (const scheme of ['light', 'dark']) {
    for (const width of [390, 820, 1440]) {
      const at = ` (${scheme}, ${width}px)`;
      const { context, page } = await h.open(width, {
        touch: width < 700,
        colorScheme: scheme,
      });
      await h.show(page, 'board');

      // 1. Khung "Chế độ xem" bo tròn, nút bên trong bo tròn, không tràn.
      if (width < 1000)
        await page.evaluate(() =>
          document.querySelector('.sidebar').classList.add('open'),
        );
      const view = await page.evaluate(() => {
        const g = document.querySelector('#view-group');
        const gr = g.getBoundingClientRect();
        const side = document.querySelector('.sidebar').getBoundingClientRect();
        const cs = getComputedStyle(g);
        const buttons = [...g.querySelectorAll('.view-mode')];
        return {
          radius: parseFloat(cs.borderTopLeftRadius),
          border: parseFloat(cs.borderTopWidth),
          inside: gr.left >= side.left - 1 && gr.right <= side.right + 1,
          buttonRadius: Math.min(
            ...buttons.map((b) =>
              parseFloat(getComputedStyle(b).borderTopLeftRadius),
            ),
          ),
          buttonsInside: buttons.every(
            (b) =>
              b.getBoundingClientRect().right <= gr.right + 0.5 &&
              b.getBoundingClientRect().left >= gr.left - 0.5,
          ),
          count: buttons.length,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.ok(
        view.radius >= 16,
        'khung Chế độ xem chưa bo tròn: ' + view.radius + at,
      );
      assert.ok(
        view.border >= 1,
        'khung Chế độ xem phải có viền: ' + view.border + at,
      );
      assert.ok(
        view.inside && view.buttonsInside,
        'khung hoặc nút nằm ngoài thanh bên' + at,
      );
      assert.equal(view.count, 3, 'phải có 3 chế độ xem' + at);
      assert.ok(
        view.buttonRadius >= 12,
        'nút chế độ xem chưa bo tròn: ' + view.buttonRadius + at,
      );
      assert.ok(!view.overflow, 'tràn ngang' + at);

      // 2. Thanh tiến độ checklist (mục 2 đang ở 40%): mỏng, không khung, đầu trái bo tròn.
      await page.evaluate(() =>
        document.querySelector('.sidebar').classList.remove('open'),
      );
      await page.evaluate(() =>
        taskDetail(project('p1'), project('p1').tasks[0]),
      );
      await page.waitForSelector(sel, { state: 'attached' });
      await page.locator(sel).scrollIntoViewIfNeeded();
      const before = await paint(page, scheme, true);
      assert.ok(
        before.s.h >= 44 && before.s.h <= 46,
        'vùng chạm thanh % phải giữ 44px: ' + before.s.h + at,
      );
      assert.equal(
        before.s.pad,
        '0px',
        'thanh % không được còn đệm của ô nhập (khung): ' + before.s.pad + at,
      );
      assert.equal(
        before.s.borderW,
        '0px',
        'thanh % không được còn viền khung' + at,
      );
      assert.equal(before.s.bg, 'none', 'nền khung của thanh % phải bỏ' + at);
      assert.equal(before.s.pn, '0.4', 'đầu tô phải theo % hiện tại' + at);
      assert.ok(
        before.fill >= 4 && before.fill <= 8,
        'phần tô phải mỏng (4–8px), đo được ' + before.fill + at,
      );
      assert.ok(
        before.rest >= 4 && before.rest <= 8,
        'rãnh còn lại phải mỏng (4–8px), đo được ' + before.rest + at,
      );
      assert.ok(
        before.leftEdge < before.leftMid,
        `đầu trái phải bo tròn: cột ngoài cùng ${before.leftEdge}px < giữa ${before.leftMid}px` +
          at,
      );

      // Kéo thật bằng chuột từ 40% sang khoảng 70%: hình vẽ không đổi, đầu tô vẫn theo núm.
      const s0 = before.s;
      await page.mouse.move(s0.x + 9 + (s0.w - 18) * 0.4, s0.y + s0.h / 2);
      await page.mouse.down();
      const states = [];
      for (const f of [0.55, 0.7]) {
        await page.mouse.move(s0.x + 9 + (s0.w - 18) * f, s0.y + s0.h / 2, {
          steps: 4,
        });
        states.push(await paint(page, scheme, true));
      }
      await page.mouse.up();
      states.push(await paint(page, scheme, true));
      for (const m of states) {
        assert.equal(m.fill, before.fill, 'độ dày phần tô đổi khi kéo' + at);
        assert.equal(m.rest, before.rest, 'độ dày rãnh đổi khi kéo' + at);
        assert.equal(
          m.leftEdge,
          before.leftEdge,
          'đầu trái đổi hình khi kéo' + at,
        );
        assert.equal(m.s.pad, before.s.pad, 'đệm đổi khi kéo' + at);
        assert.equal(m.s.borderW, before.s.borderW, 'viền đổi khi kéo' + at);
        assert.equal(
          Number(m.s.pn),
          Number(m.s.value) / 100,
          `--pn phải bằng giá trị (${m.s.value}) / 100, được ${m.s.pn}` + at,
        );
        assert.equal(m.s.p, m.s.value + '%', '--p phải bằng giá trị' + at);
      }
      assert.ok(
        Number(states.at(-1).s.value) >= 65,
        'kéo chuột phải đổi giá trị, được ' + states.at(-1).s.value + at,
      );

      // Bàn phím: End về 100%, Home về 0%; hình vẽ rãnh vẫn giữ (ở 0% chỉ đo rãnh, vì phần tô nằm dưới núm).
      await page.locator(sel).focus();
      await page.keyboard.press('End');
      const end = await paint(page, scheme, true);
      assert.equal(end.s.value, '100', at);
      assert.equal(end.s.pn, '1', at);
      assert.equal(end.fill, before.fill, 'độ dày phần tô đổi ở 100%' + at);
      await page.keyboard.press('Home');
      const home = await paint(page, scheme, false);
      assert.equal(home.s.value, '0', at);
      assert.equal(home.s.pn, '0', at);
      assert.equal(home.rest, before.rest, 'độ dày rãnh đổi ở 0%' + at);

      const overflow = await page.evaluate(() => {
        const b = document.querySelector('#editor-body');
        return {
          page: document.documentElement.scrollWidth - innerWidth,
          body: b.scrollWidth - b.clientWidth,
        };
      });
      assert.ok(
        overflow.page <= 0 && overflow.body <= 1,
        'tràn ngang ' + JSON.stringify(overflow) + at,
      );
      await context.close();
    }
  }
  console.log(
    'PASS: khung Chế độ xem bo tròn; thanh tiến độ checklist mỏng, không khung, bo tròn và giữ nguyên hình khi kéo (sáng/tối, 390/820/1440px).',
  );
} finally {
  await h.close();
}
