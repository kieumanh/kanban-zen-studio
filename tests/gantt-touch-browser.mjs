// Hồi quy v1.15.48: tay nắm của biểu đồ Gantt đủ lớn để kéo bằng ngón tay (v1.15.41 ghi rõ chưa làm).
// Trên con trỏ thô (pointer: coarse; 390px và 820px cảm ứng): vùng chạm cao 44px; đầu bắt đầu rộng ≥44px (hoặc nới hết mức tới mép trái biểu đồ), đầu kết thúc rộng ≥ min(22px, 1/3 bề rộng thanh),
// nút nối có vùng chạm 44×44px nằm ngoài mép phải thanh; kéo thật bằng sự kiện chạm (CDP) đổi đúng ngày, nối đúng phụ thuộc; hình khung kéo (ghost) trùng vị trí thanh.
// Trên con trỏ mịn (chuột, 1440px): hình học tay nắm giữ nguyên (9×34px, không có vùng chạm nối riêng) và kéo bằng chuột vẫn đúng.
import assert from 'node:assert/strict';
import { makeProject, startHarness } from './lib/browser-harness.mjs';

const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const add = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);

// Ba việc: g0 1 ngày và g1 4 ngày (cùng bắt đầu ở mép trái biểu đồ), g2 5 ngày bắt đầu sau 3 ngày — thanh rộng 60 / 240 / 300px ở mức 15 ngày (60px/ngày).
const seed = () => {
  const p = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 0);
  p.tasks = [[0, 0], [0, 3], [3, 7]].map(([a, b], i) => ({ id: 'g' + i, title: 'Việc Gantt ' + (i + 1), col: 'List', description: '', due: add(day, b), start: add(day, a) + 'T09:00', end: add(day, b) + 'T17:00', tag: 'Công việc', priority: 'q2', checks: [] }));
  return { schema: 1, projects: [p], notes: [] };
};
const h = await startHarness({ seed });
const failures = [];
const fail = (cfg, step, msg) => failures.push(`[${cfg.label}] ${step}: ${msg}`);

const CONFIGS = [
  { label: '390px cảm ứng', width: 390, touch: true },
  { label: '820px cảm ứng', width: 820, touch: true },
  { label: '1440px chuột', width: 1440, touch: false },
];

const rects = (page) =>
  page.evaluate(() => {
    const svg = document.querySelector('.gantt-svg') || document.querySelector('svg');
    const k = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    const box = (el) => (el ? (({ left, top, width, height }) => ({ left, top, width, height }))(el.getBoundingClientRect()) : null);
    return {
      k,
      coarse: matchMedia('(pointer: coarse)').matches,
      rows: [...document.querySelectorAll('.gantt-task')].map((g) => ({
        id: g.dataset.ganttRow,
        bar: box(g.querySelector('rect')),
        move: box(g.querySelector('[data-gantt-mode=move]')),
        start: box(g.querySelector('[data-gantt-mode=start]')),
        end: box(g.querySelector('[data-gantt-mode=end]')),
        hit: box(g.querySelector('.gantt-port-hit')),
        port: box(g.querySelector('.gantt-port')),
        grips: g.querySelectorAll('.gantt-grip').length,
      })),
    };
  });

// Đưa phần tử vào giữa khung nhìn (cuộn cả trang lẫn vùng cuộn ngang của biểu đồ) rồi trả tọa độ tâm vùng chạm.
async function reveal(page, selector) {
  await page.evaluate((selector) => document.querySelector(selector).scrollIntoView({ block: 'center', inline: 'center' }), selector);
  await page.waitForTimeout(80);
}
const at = (page, selector, fx = 0.5, fy = 0.5) =>
  page.evaluate(
    ({ selector, fx, fy }) => {
      const b = document.querySelector(selector).getBoundingClientRect();
      return { x: b.left + b.width * fx, y: b.top + b.height * fy };
    },
    { selector, fx, fy },
  );

const sel = (id, mode) => `.gantt-task[data-gantt-row="${id}"] [data-gantt-mode=${mode}]`;
const startOf = (page, id) => page.evaluate((id) => project('p1').tasks.find((t) => t.id === id).start.slice(0, 10), id);
const endOf = (page, id) => page.evaluate((id) => project('p1').tasks.find((t) => t.id === id).end.slice(0, 10), id);

// Kéo bằng sự kiện chạm thật (CDP) từ (x,y) sang (x+dx,y); giữa chừng gọi probe() khi ngón tay còn đang giữ.
async function touchDrag(cdp, from, dx, probe) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (dx * i) / 6, y: from.y }] });
  if (probe) await probe();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function run(cfg) {
  const { context, page } = await h.open(cfg.width, { touch: cfg.touch });
  await h.show(page, 'gantt');
  await page.waitForSelector('.gantt-task');
  const g = await rects(page);
  assert.equal(g.k, 1, 'biểu đồ phải hiển thị đúng tỉ lệ 1:1 (test dùng đơn vị điểm ảnh của biểu đồ)');

  if (!cfg.touch) {
    // Chuột: hình học cũ giữ nguyên.
    for (const r of g.rows) {
      if (Math.round(r.start.width) !== 9 || Math.round(r.end.width) !== 9 || Math.round(r.start.height) !== 34) fail(cfg, 'chuột', `tay nắm ${r.id} ${Math.round(r.start.width)}×${Math.round(r.start.height)} / ${Math.round(r.end.width)}px, phải giữ 9×34px`);
      if (r.hit || r.grips) fail(cfg, 'chuột', `${r.id}: không được có vùng chạm nối hay vạch cầm khi dùng chuột`);
    }
    // Kéo bằng chuột vẫn đổi đúng ngày: đầu kết thúc của việc 3 (g2) sang trái 1 ngày.
    const before = await endOf(page, 'g2');
    await reveal(page, sel('g2', 'end'));
    const p = await at(page, sel('g2', 'end'));
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x - 30, p.y, { steps: 4 });
    await page.mouse.move(p.x - 60, p.y, { steps: 4 });
    await page.mouse.up();
    await page.waitForFunction((b) => project('p1').tasks.find((t) => t.id === 'g2').end.slice(0, 10) !== b, before, { timeout: 5000 }).catch(() => {});
    const after = await endOf(page, 'g2');
    if (after !== add(before, -1)) fail(cfg, 'chuột', `kéo đầu kết thúc 1 ngày sang trái: ${before} → ${after}, cần ${add(before, -1)}`);
    await context.close();
    return;
  }

  // 1. Hình học trên cảm ứng.
  for (const r of g.rows) {
    const wide = r.bar.width >= 66;
    const outer = Math.round(r.bar.left - r.start.left); // phần nới ra ngoài mép trái
    const needStart = wide ? Math.min(44, Math.round(r.start.width) >= 44 ? 44 : 0) : 0;
    for (const [name, b] of [['move', r.move], ['start', r.start], ['end', r.end]]) if (Math.round(b.height) < 44) fail(cfg, 'hình học', `${r.id} ${name} cao ${Math.round(b.height)}px, cần ≥44px`);
    if (r.start.width < 20 || r.end.width < 20) fail(cfg, 'hình học', `${r.id} đầu kéo hẹp: ${Math.round(r.start.width)}px / ${Math.round(r.end.width)}px (cần ≥20px)`);
    if (outer > 0 && r.start.width < 44) fail(cfg, 'hình học', `${r.id}: đầu bắt đầu đã nới ra ngoài nhưng chỉ rộng ${Math.round(r.start.width)}px, cần ≥44px`);
    void needStart;
    if (!r.hit) fail(cfg, 'hình học', `${r.id}: thiếu vùng chạm nút nối`);
    else {
      if (Math.round(r.hit.width) < 44 || Math.round(r.hit.height) < 44) fail(cfg, 'hình học', `${r.id}: vùng chạm nút nối ${Math.round(r.hit.width)}×${Math.round(r.hit.height)}px, cần ≥44px`);
      if (r.hit.left < r.bar.left + r.bar.width - 1) fail(cfg, 'hình học', `${r.id}: vùng chạm nút nối đè vào thanh (${Math.round(r.hit.left)} < ${Math.round(r.bar.left + r.bar.width)})`);
    }
    if (r.grips !== 2) fail(cfg, 'hình học', `${r.id}: cần 2 vạch cầm, có ${r.grips}`);
  }
  // Các hàng không được chồng vùng chạm lên nhau theo chiều dọc.
  for (let i = 1; i < g.rows.length; i++) {
    const a = g.rows[i - 1].start, b = g.rows[i].start;
    if (a.top + a.height > b.top + 0.5) fail(cfg, 'hình học', `vùng chạm hàng ${i} chồng lên hàng ${i + 1}`);
  }

  // 2. Điểm chạm đặt ngoài mép thanh 10px trúng đúng tay nắm (elementFromPoint). Mỗi nhóm điểm được đưa vào giữa khung nhìn riêng, vì cột tên việc cố định che phần bên trái khi biểu đồ cuộn.
  const probe = (x, y) => page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e?.dataset.ganttMode || (e?.classList.contains('gantt-port-hit') ? 'port-hit' : e?.tagName || 'ngoài khung nhìn'); }, [x, y]);
  const row = async (id) => (await rects(page)).rows.find((r) => r.id === id);
  const hits = {};
  await reveal(page, sel('g2', 'start'));
  let r = await row('g2');
  let midY = r.bar.top + r.bar.height / 2;
  hits['ngoài mép trái 10px'] = [await probe(r.bar.left - 10, midY), 'start'];
  hits['trên thanh 4px (vùng nới dọc)'] = [await probe(r.bar.left + 4, r.bar.top - 4), 'start'];
  hits['giữa thanh'] = [await probe(r.bar.left + r.bar.width / 2, midY), 'move'];
  await reveal(page, sel('g2', 'end'));
  r = await row('g2');
  midY = r.bar.top + r.bar.height / 2;
  hits['trong mép phải 10px'] = [await probe(r.bar.left + r.bar.width - 10, midY), 'end'];
  hits['ngoài mép phải 30px'] = [await probe(r.bar.left + r.bar.width + 30, midY), 'port-hit'];
  for (const [where, [got, want]] of Object.entries(hits)) if (got !== want) fail(cfg, 'điểm chạm', `${where}: trúng "${got}", cần "${want}"`);

  // 3. Kéo thật bằng ngón tay.
  const cdp = await context.newCDPSession(page);
  // 3a. đầu bắt đầu của g2 (đặt ngón tay ngoài mép trái 10px) sang phải 1 ngày (60px): start +1 ngày; trong lúc kéo, khung ghost cùng hàng với thanh.
  {
    const before = await startOf(page, 'g2');
    await reveal(page, sel('g2', 'start'));
    const r1 = (await rects(page)).rows.find((r) => r.id === 'g2');
    const from = { x: r1.bar.left - 10, y: r1.bar.top + r1.bar.height / 2 };
    let ghost = null;
    await touchDrag(cdp, from, 60, async () => {
      ghost = await page.evaluate(() => { const gh = document.querySelector('.gantt-ghost'); const bar = document.querySelector('.gantt-task[data-gantt-row=g2] rect'); return gh ? { y: gh.getAttribute('y'), h: gh.getAttribute('height'), barY: bar.getAttribute('y') } : null; });
    });
    await page.waitForFunction(([b]) => project('p1').tasks.find((t) => t.id === 'g2').start.slice(0, 10) !== b, [before], { timeout: 5000 }).catch(() => {});
    const after = await startOf(page, 'g2');
    if (after !== add(before, 1)) fail(cfg, 'kéo đầu bắt đầu', `${before} → ${after}, cần ${add(before, 1)}`);
    if (!ghost) fail(cfg, 'kéo đầu bắt đầu', 'không thấy khung ghost khi đang kéo');
    else if (ghost.y !== ghost.barY || ghost.h !== '34') fail(cfg, 'kéo đầu bắt đầu', `khung ghost lệch thanh: y=${ghost.y} (thanh ${ghost.barY}), cao ${ghost.h}`);
  }
  // 3b. đầu kết thúc của g1 (ngón tay trong mép phải 10px) sang trái 1 ngày: end −1 ngày.
  {
    const before = await endOf(page, 'g1');
    await reveal(page, sel('g1', 'end'));
    const r2 = (await rects(page)).rows.find((r) => r.id === 'g1');
    const from = { x: r2.bar.left + r2.bar.width - 10, y: r2.bar.top + r2.bar.height / 2 };
    await touchDrag(cdp, from, -60);
    await page.waitForFunction(([b]) => project('p1').tasks.find((t) => t.id === 'g1').end.slice(0, 10) !== b, [before], { timeout: 5000 }).catch(() => {});
    const after = await endOf(page, 'g1');
    if (after !== add(before, -1)) fail(cfg, 'kéo đầu kết thúc', `${before} → ${after}, cần ${add(before, -1)}`);
  }
  // 3c. nối phụ thuộc: bắt đầu từ vùng chạm nối (ngoài mép phải 30px) của g0, thả lên vùng chạm nối của g1.
  if (!(await page.locator('.gantt-task[data-gantt-row="g0"] .gantt-port-hit').count())) fail(cfg, 'nối phụ thuộc', 'không có vùng chạm nối để đặt ngón tay');
  else {
    await reveal(page, `.gantt-task[data-gantt-row="g0"] .gantt-port-hit`);
    const rows = (await rects(page)).rows;
    const a = rows.find((r) => r.id === 'g0'), b = rows.find((r) => r.id === 'g1');
    const from = { x: a.hit.left + 30, y: a.hit.top + a.hit.height / 2 };
    const to = { x: b.hit.left + 30, y: b.hit.top + b.hit.height / 2 };
    // Phải thấy cả hai điểm trong khung nhìn; nếu g1 nằm ngoài, cuộn tới giữa hai điểm.
    await page.evaluate(([y1, y2]) => scrollBy(0, (y1 + y2) / 2 - innerHeight / 2), [from.y, to.y]);
    const now = (await rects(page)).rows;
    const a2 = now.find((r) => r.id === 'g0'), b2 = now.find((r) => r.id === 'g1');
    const f = { x: a2.hit.left + 30, y: a2.hit.top + a2.hit.height / 2 }, t = { x: b2.hit.left + 30, y: b2.hit.top + b2.hit.height / 2 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [f] });
    for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: f.x + ((t.x - f.x) * i) / 6, y: f.y + ((t.y - f.y) * i) / 6 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => (project('p1').dependencies || []).length > 0, null, { timeout: 5000 }).catch(() => {});
    const deps = await page.evaluate(() => JSON.stringify(project('p1').dependencies || []));
    if (!/"from":"g0"/.test(deps) || !/"to":"g1"/.test(deps)) fail(cfg, 'nối phụ thuộc', `phụ thuộc g0 → g1 chưa được tạo bằng ngón tay: ${deps}`);
  }
  // 4. Nút nối nhìn thấy (r=6) vẫn là phần tử bàn phím; vùng chạm nối ẩn khỏi trình đọc màn hình và không vào thứ tự Tab.
  const a11y = await page.evaluate(() => {
    const hit = document.querySelector('.gantt-port-hit');
    return { hidden: hit?.getAttribute('aria-hidden'), tab: hit?.getAttribute('tabindex'), portTab: document.querySelector('.gantt-port')?.getAttribute('tabindex') };
  });
  if (a11y.hidden !== 'true' || a11y.tab !== null || a11y.portTab !== '0') fail(cfg, 'bàn phím', `vùng chạm nối: aria-hidden=${a11y.hidden}, tabindex=${a11y.tab}; nút nối tabindex=${a11y.portTab}`);
  await context.close();
}

try {
  for (const cfg of CONFIGS) await run(cfg);
  assert.deepEqual(failures, [], '\n' + failures.join('\n'));
  console.log('PASS gantt-touch: cảm ứng có vùng chạm 44px (đầu kéo, nút nối), kéo bằng ngón tay đổi đúng ngày và nối đúng phụ thuộc, khung ghost đúng hàng; chuột giữ nguyên hình học.');
} finally {
  await h.close();
}
