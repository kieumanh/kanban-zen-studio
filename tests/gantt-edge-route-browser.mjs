// Hồi quy v1.48.0: đường nối Gantt là đường vuông góc có góc bo tròn (không còn đường cong Bézier).
// Tay nắm giữa đường kéo được bằng chuột, bằng ngón tay (vùng chạm ≥44px) hoặc bàn phím; độ lệch lưu theo ngày
// nên giữ nguyên khi đổi khoảng xem. Kiểm ở 390 (chạm), 820 (chạm), 1440 px (chuột).
import assert from 'node:assert/strict';
import { makeProject, startHarness } from './lib/browser-harness.mjs';

const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const add = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);

// A (ngày 0–2) → B (ngày 4–6): đường thuận. C (ngày 1–3) → B: đường ngược, đi vòng qua khoảng trống giữa hai hàng.
const seed = () => {
  const p = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 0);
  const task = (id, a, b) => ({
    id,
    title: 'Việc ' + id,
    col: 'List',
    description: '',
    due: add(day, b),
    start: add(day, a) + 'T09:00',
    end: add(day, b) + 'T17:00',
    tag: 'Công việc',
    priority: 'q2',
    checks: [],
  });
  p.tasks = [task('A', 0, 2), task('B', 4, 6), task('C', 1, 3)];
  p.dependencies = [
    { from: 'A', to: 'B' },
    { from: 'C', to: 'B' },
  ];
  return { schema: 1, projects: [p], notes: [] };
};

const h = await startHarness({ seed });
const failures = [];
const fail = (cfg, msg) => failures.push(`[${cfg.label}] ${msg}`);

const CONFIGS = [
  { label: '390px cảm ứng', width: 390, touch: true },
  { label: '820px cảm ứng', width: 820, touch: true },
  { label: '1440px chuột', width: 1440, touch: false },
];

const bendOf = (page, i) => page.evaluate((i) => project('p1').dependencies[i].bend ?? 0, i);
const handleState = (page, i) =>
  page.evaluate((i) => {
    const el = document.querySelector(`.gantt-bend[data-gantt-bend="${i}"]`);
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, cx: Number(el.getAttribute('cx')) };
  }, i);

async function run(cfg) {
  const { context, page } = await h.open(cfg.width, { touch: cfg.touch, workspace: seed() });
  await h.show(page, 'gantt');
  await page.waitForSelector('.gantt-bend');

  // 1. Hình học: hai tay nắm, đường không dùng Bézier, có góc bo, vùng chạm đủ rộng, không tràn ngang.
  const info = await page.evaluate(() => {
    const svg = document.querySelector('.gantt-svg');
    return {
      coarse: matchMedia('(pointer: coarse)').matches,
      k: svg.getBoundingClientRect().width / svg.viewBox.baseVal.width,
      handles: document.querySelectorAll('.gantt-bend').length,
      routes: [...document.querySelectorAll('.gantt-edge')].map((e) => e.getAttribute('d')),
      hits: [...document.querySelectorAll('.gantt-bend-hit')].map((c) => c.getBoundingClientRect().width),
      fits: document.documentElement.scrollWidth <= innerWidth,
    };
  });
  if (Math.abs(info.k - 1) > 0.01) fail(cfg, `biểu đồ không đúng tỉ lệ 1:1 (k=${info.k.toFixed(3)})`);
  if (info.handles !== 2) fail(cfg, `có ${info.handles} tay nắm, cần 2`);
  info.routes.forEach((d, i) => {
    if (/C/.test(d)) fail(cfg, `đường nối ${i + 1} còn đường cong Bézier: ${d}`);
    if (!/ Q/.test(d)) fail(cfg, `đường nối ${i + 1} không có góc bo`);
  });
  const minHit = info.coarse ? 44 : 28;
  info.hits.forEach((w, i) => {
    if (Math.round(w) < minHit) fail(cfg, `vùng kéo tay nắm ${i + 1} rộng ${Math.round(w)}px, cần ≥${minHit}px`);
  });
  if (!info.fits) fail(cfg, 'trang bị tràn ngang');

  // 2. Kéo bằng chuột tay nắm của đường thuận (A → B) sang trái 30px: mặc định 213,5; giới hạn 195–232 → lệch −0,25 ngày.
  await page.evaluate(() => document.querySelector('.gantt-bend[data-gantt-bend="0"]').scrollIntoView({ block: 'center', inline: 'center' }));
  const before = await handleState(page, 0);
  await page.mouse.move(before.x, before.y);
  await page.mouse.down();
  await page.mouse.move(before.x - 15, before.y, { steps: 3 });
  await page.mouse.move(before.x - 30, before.y, { steps: 4 });
  await page.mouse.up();
  await page.waitForFunction(() => (project('p1').dependencies[0].bend ?? 0) !== 0, null, { timeout: 5000 }).catch(() => {});
  const bend0 = await bendOf(page, 0);
  if (bend0 !== -0.25) fail(cfg, `kéo đường thuận sang trái 30px: lệch ${bend0} ngày, cần -0.25`);
  const after0 = await handleState(page, 0);
  if (Math.abs(after0.cx - 198.5) > 0.6) fail(cfg, `tay nắm đường thuận ở x=${after0.cx}, cần 198.5`);

  // 3. Bàn phím: tay nắm đường ngược (C → B) nhận tiêu điểm, mũi tên phải lệch +0,5 ngày, tiêu điểm vẫn ở tay nắm.
  await page.locator('.gantt-bend[data-gantt-bend="1"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => (project('p1').dependencies[1].bend ?? 0) === 0.5, null, { timeout: 5000 }).catch(() => {});
  const bend1 = await bendOf(page, 1);
  if (bend1 !== 0.5) fail(cfg, `mũi tên phải: lệch ${bend1} ngày, cần 0.5`);
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-gantt-bend'));
  if (focused !== '1') fail(cfg, `sau khi đổi, tiêu điểm ở ${focused}, cần 1`);
  const after1 = await handleState(page, 1);
  if (Math.abs(after1.cx - 291) > 0.6) fail(cfg, `tay nắm đường ngược ở x=${after1.cx}, cần 291`);

  // 4. Đổi khoảng xem sang 7 ngày (100px/ngày): độ lệch vẫn là 0,25 ngày nên tay nắm đường thuận ở x = 328,5.
  await page.selectOption('#gantt-range', '7');
  await page.waitForFunction(() => document.querySelector('.gantt-svg')?.dataset.dayPx === '100', null, { timeout: 5000 }).catch(() => {});
  const wide = await handleState(page, 0);
  if (Math.abs(wide.cx - 328.5) > 0.6) fail(cfg, `đổi sang 7 ngày: tay nắm đường thuận ở x=${wide.cx}, cần 328.5 (lệch lưu theo ngày)`);

  await context.close();
}

try {
  for (const cfg of CONFIGS) await run(cfg);
  assert.deepEqual(failures, [], '\n' + failures.join('\n'));
  console.log(
    'PASS gantt-edge-route: đường nối bo góc không dùng Bézier; tay nắm kéo bằng chuột, ngón tay và bàn phím; độ lệch lưu theo ngày và giữ nguyên khi đổi khoảng xem (390 chạm, 820 chạm, 1440px).',
  );
} finally {
  await h.close();
}
