// v2.47.0 (Sổ Cái Giữ Mã): khi sổ cái Điểm tích lũy gần đầy (≥ 2.900 dòng) và gộp 500 dòng cũ nhất thành dòng "tổng hợp",
// mã chống cộng trùng "task:<id>" của các việc đã cộng điểm không còn bị mất (trước đây gộp xong, việc cũ làm lại được cộng điểm lần nữa).
// Kiểm ở 390 (chạm), 820, 1440 px:
//  1. Sổ 2.950 dòng việc: hoàn thành thêm một việc mới → sổ được gộp (ngắn hơn rõ rệt, dưới ngưỡng), máy chủ nhận (đúng dạng dữ liệu: k ≤ 120 ký tự).
//  2. Tổng điểm mỗi chỉ số không đổi (cộng đúng phần điểm vừa thêm); mọi mã của 500 dòng bị gộp còn nằm trong các dòng tổng hợp; dòng thường còn nguyên.
//  3. Một việc cũ đã bị gộp, đưa về Đang làm rồi xong lại: KHÔNG hỏi điểm lần nữa (hiện lời chúc mừng ngay); việc chưa từng cộng vẫn được hỏi điểm.
//  4. Gộp lần thứ hai (sổ đã có dòng tổng hợp của lần trước): đóng gói lại, mã của cả dòng tổng hợp cũ lẫn dòng việc đều còn.
//  5. Sổ đã toàn dòng tổng hợp đầy mã (không đóng gói thêm được): chỉ bỏ mã của các dòng CŨ NHẤT (gộp thành một dòng không mã), mã của các việc
//     gần đây vẫn giữ; sổ vẫn lưu được điểm mới, tổng điểm không đổi.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const N = 2950;
const LOG_LIMIT = 3000;
const task = (i) => ({ id: 'l' + i, d: '2026-10-' + String(1 + (i % 28)).padStart(2, '0'), s: 'task', k: 'task:old' + i, n: 'Việc cũ ' + i, p: [2, 0, 0, 0, 0, 0, 0, 0] });
const baseProject = () => {
  const p = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 4);
  p.tasks[2].title = 'Việc mới hoàn thành';
  p.tasks[2].col = 'Doing';
  p.tasks[3].title = 'Việc chưa từng cộng';
  p.tasks[3].col = 'Doing';
  // Việc cũ đã cộng điểm từ lâu (nằm trong 500 dòng đầu sẽ bị gộp), đang ở cột Hoàn thành.
  p.tasks.push({ id: 'old5', title: 'Việc cũ đã cộng điểm', col: 'Done', description: '', due: '2026-11-01', tag: 'Công việc', priority: 'q2', checks: [] });
  return p;
};
const withLog = (log) => () => ({ schema: 1, projects: [baseProject()], notes: [], growth: { v: 1, hero: 'nam', since: '2026-09-01', log } });
const total = (log) => log.reduce((p, e) => p.map((v, i) => v + e.p[i]), Array(8).fill(0));
// Mã chống cộng trùng còn trong sổ: dòng thường giữ nguyên “task:<id>”; dòng tổng hợp đóng gói danh sách id (bỏ tiền tố “task:”).
const keysOf = (log) => new Set(log.flatMap((e) => (e.k ? (e.s === 'archive' ? e.k.split(' ').map((id) => 'task:' + id) : [e.k]) : [])));
const uuid = (i) => 't' + String(i).padStart(35, '0');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá thời gian chờ: ' + label);
}
async function award(page, id) {
  await page.evaluate((id) => moveTask(project('p1'), project('p1').tasks.find((t) => t.id === id), 'Done'), id);
  await page.waitForSelector('#growth-award[open]');
  await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-save]');
  await page.waitForSelector('.completion-card');
  await page.evaluate(() => document.querySelector('.completion-close')?.click());
}

const normal = Array.from({ length: N }, (_, i) => task(i));
// Sổ đã có 100 dòng tổng hợp (mỗi dòng 3 mã dài 36 ký tự = 110 ký tự, không gộp thêm được) rồi tới 2.850 dòng việc có mã dài như mã thật.
const archives = Array.from({ length: 100 }, (_, i) => ({ id: 'a' + i, d: '2026-09-15', s: 'archive', n: 'Tổng hợp', k: [0, 1, 2].map((j) => uuid(100000 + i * 3 + j)).join(' '), p: [3, 0, 0, 0, 0, 0, 0, 0] }));
const second = [...archives, ...Array.from({ length: N - 100 }, (_, i) => ({ id: 'l' + i, d: '2026-10-' + String(1 + (i % 28)).padStart(2, '0'), s: 'task', k: 'task:' + uuid(i), n: 'Việc ' + i, p: [2, 0, 0, 0, 0, 0, 0, 0] }))];
// Sổ toàn dòng tổng hợp, mỗi dòng 6 mã dài 19 ký tự (đúng 119 ký tự): không đóng gói thêm được.
const idOf = (i, j) => 'z' + String(i * 6 + j).padStart(18, '0');
const fullArchive = Array.from({ length: N }, (_, i) => ({ id: 'a' + i, d: '2026-09-15', s: 'archive', n: 'Tổng hợp', k: [0, 1, 2, 3, 4, 5].map((j) => idOf(i, j)).join(' '), p: [6, 0, 0, 0, 0, 0, 0, 0] }));

const h = await startHarness({ seed: withLog(normal) });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';

    // 1–3. Sổ 2.950 dòng việc.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: withLog(normal)() });
      const before = total(normal);
      await h.show(page, 'projects', 'p1');
      await award(page, 'p1t2');
      await until(() => server.workspace.growth.log.length < N, 'sổ được gộp và lưu lên máy chủ' + at);
      const log = server.workspace.growth.log;
      assert.ok(log.length <= N - 300, 'sổ ngắn đi rõ rệt (' + N + ' → ' + log.length + ')' + at);
      assert.ok(log.length <= LOG_LIMIT - 400, 'dưới ngưỡng gộp lần sau' + at);
      assert.ok(log.some((e) => e.s === 'archive') && log.every((e) => !e.k || e.k.length <= 120), 'có dòng tổng hợp, mọi k ≤ 120 ký tự' + at);
      // Tổng điểm: sổ cũ + 1 lần cộng 0,5 điểm (1 nửa điểm) ở Đạo tâm.
      assert.deepEqual(total(log), before.map((v, i) => v + (i === 0 ? 1 : 0)), 'tổng điểm mỗi chỉ số không đổi' + at);
      const kept = keysOf(log);
      for (let i = 0; i < 500; i++) assert.ok(kept.has('task:old' + i), 'mã task:old' + i + ' còn trong sổ' + at);
      assert.ok(kept.has('task:p1t2'), 'mã của việc vừa cộng còn trong sổ' + at);
      assert.equal(log.filter((e) => e.s === 'task').length, log.length - log.filter((e) => e.s === 'archive').length, 'chỉ còn dòng việc thường và dòng tổng hợp' + at);
      // 3. Việc cũ đã bị gộp: làm lại không được cộng điểm nữa; việc chưa từng cộng vẫn được hỏi.
      await page.evaluate(() => {
        const t = project('p1').tasks.find((x) => x.id === 'old5');
        t.col = 'Doing';
        save();
        render();
      });
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks.find((t) => t.id === 'old5'), 'Done'));
      await page.waitForSelector('.completion-card');
      assert.equal(await page.locator('#growth-award').count(), 0, 'việc cũ đã bị gộp không hỏi điểm lần nữa' + at);
      await page.evaluate(() => document.querySelector('.completion-close')?.click());
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks.find((t) => t.id === 'p1t3'), 'Done'));
      await page.waitForSelector('#growth-award[open]');
      assert.equal(await page.locator('#growth-award').count(), 1, 'việc chưa từng cộng vẫn hỏi điểm' + at);
      await context.close();
    }

    // 4. Gộp lần hai: 100 dòng tổng hợp cũ + 400 dòng việc đầu tiên được đóng gói lại, không mất mã nào.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: withLog(second)() });
      const before = total(second);
      await h.show(page, 'projects', 'p1');
      await award(page, 'p1t2');
      await until(() => server.workspace.growth.log.length < N, 'gộp lần hai được lưu lên máy chủ' + at);
      const log = server.workspace.growth.log;
      assert.ok(log.length <= N - 200, 'sổ ngắn đi (' + N + ' → ' + log.length + ')' + at);
      assert.deepEqual(total(log), before.map((v, i) => v + (i === 0 ? 1 : 0)), 'tổng điểm không đổi sau gộp lần hai' + at);
      const kept = keysOf(log);
      for (let i = 0; i < 300; i++) assert.ok(kept.has('task:' + uuid(100000 + i)), 'mã trong dòng tổng hợp cũ vẫn còn (' + i + ')' + at);
      for (let i = 0; i < 400; i++) assert.ok(kept.has('task:' + uuid(i)), 'mã của 400 dòng việc bị gộp vẫn còn (' + i + ')' + at);
      assert.ok(log.every((e) => !e.k || e.k.length <= 120), 'mọi k ≤ 120 ký tự' + at);
      await context.close();
    }

    // 5. Sổ toàn dòng tổng hợp đầy mã: bỏ mã của dòng cũ nhất, giữ mã của dòng gần đây; vẫn lưu được.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: withLog(fullArchive)() });
      const before = total(fullArchive);
      await h.show(page, 'projects', 'p1');
      await award(page, 'p1t2');
      await until(() => server.workspace.growth.log.length < N, 'sổ đầy mã vẫn lưu được' + at);
      const log = server.workspace.growth.log;
      assert.ok(log.length <= N - 200, 'sổ ngắn đi (' + N + ' → ' + log.length + ')' + at);
      assert.deepEqual(total(log), before.map((v, i) => v + (i === 0 ? 1 : 0)), 'tổng điểm không đổi khi gộp bớt dòng cũ nhất' + at);
      assert.equal(log[0].k, undefined, 'dòng tổng hợp đầu tiên không còn mã' + at);
      const kept = keysOf(log);
      for (let i = 300; i < 500; i++) for (let j = 0; j < 6; j++) assert.ok(kept.has('task:' + idOf(i, j)), 'mã của dòng gần đây vẫn còn (' + i + ')' + at);
      await context.close();
    }
  }
  console.log('PASS: gộp sổ cái giữ mã chống cộng trùng (kể cả gộp lần hai), tổng điểm không đổi, việc cũ không được cộng lại; sổ đầy mã chỉ bỏ mã dòng cũ nhất và vẫn lưu được (390, 820, 1440px)');
} finally {
  await h.close();
}
