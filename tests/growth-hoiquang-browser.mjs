// v2.70.0 (Hồi Quang): nối hai mảng đang tách rời.
//  A. Ôn tuần có khối “Bát phương” (chỉ đọc sổ cái): phương tăng nhiều nhất trong tuần, phương bị bỏ quên (không được cộng điểm tuần ấy, điểm thấp nhất), hai gợi ý Nhân kèm
//     nút Gieo nhân tạo việc mang sẵn phương ấy; đổi sang “Tuần trước” thì đổi số liệu; người chưa có Điểm tích lũy không thấy khối này.
//  B. Hộp “Đổi bảo vật” có ô tùy chọn “Ghi vào Thu chi”: nhập số tiền thì ghi luôn một khoản chi (hạng mục Bảo vật) vào đại sự đã chọn trong cùng lần lưu; bỏ trống thì không ghi;
//     số sai thì báo và không lưu gì; sửa một lần quy đổi cũ thì không có ô này; đại sự đã lưu trữ không có trong danh sách.
// Kiểm ở 390 (chạm) / 820 (chạm) / 1440 px × sáng, tối; Giang hồ ở 1440. Giờ giả: thứ Sáu 13/11/2026 (giờ Việt Nam), tuần ôn 09/11 – 15/11, tuần trước 02/11 – 08/11.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';
import { openGrowthTab } from './lib/growth-tab.mjs';

const NOW = '2026-11-13T03:00:00Z';
const TODAY = '2026-11-13';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá hạn chờ: ' + label);
}
// Nửa điểm: Đạo 10 (5 điểm), Tâm 8, Duyên 6, Thân 12, Nghệ 4, Gia 2 (1 điểm) từ trước; tuần này Tài +6 và +2 (4 điểm), Trí +2 (1 điểm).
const LOG = [
  { id: 'a0', d: '2026-11-03', s: 'task', k: 'task:a0', n: 'Việc đạo', p: [10, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'a1', d: '2026-10-20', s: 'task', k: 'task:a1', n: 'Việc tâm', p: [0, 0, 8, 0, 0, 0, 0, 0] },
  { id: 'a2', d: '2026-10-20', s: 'task', k: 'task:a2', n: 'Việc duyên', p: [0, 0, 0, 6, 0, 0, 0, 0] },
  { id: 'a3', d: '2026-10-20', s: 'task', k: 'task:a3', n: 'Việc thân', p: [0, 0, 0, 0, 12, 0, 0, 0] },
  { id: 'a4', d: '2026-10-20', s: 'task', k: 'task:a4', n: 'Việc nghệ', p: [0, 0, 0, 0, 0, 0, 4, 0] },
  { id: 'a5', d: '2026-10-20', s: 'task', k: 'task:a5', n: 'Việc gia', p: [0, 0, 0, 0, 0, 0, 0, 2] },
  { id: 'e1', d: '2026-11-10', s: 'task', k: 'task:e1', n: 'Việc tài', p: [0, 6, 0, 0, 0, 2, 0, 0] },
  { id: 'e2', d: '2026-11-11', s: 'task', k: 'task:e2', n: 'Việc tài hai', p: [0, 2, 0, 0, 0, 0, 0, 0] },
];
const growthOf = () => ({ v: 1, hero: 'nam', name: 'Mạnh', since: '2026-10-01', log: LOG.map((e) => ({ ...e, p: [...e.p] })), spend: [] });
const projects = () => {
  const p1 = makeProject('p1', 'Alpha', '#7950c8', 3);
  const p2 = makeProject('p2', 'Beta', '#2e7d5b', 2);
  const p3 = makeProject('p3', 'Cũ', '#b0892a', 1);
  p3.archived = true;
  return [p1, p2, p3];
};
const seed = () => ({ schema: 1, projects: projects(), notes: [], growth: growthOf() });
const seedNoGrowth = () => ({ schema: 1, projects: projects(), notes: [] });
const setup =
  (theme, style) =>
  ({ context }) =>
    context.addInitScript(
      ([t, s]) => {
        localStorage.setItem('zen-theme', t);
        if (s) localStorage.setItem('zen-style', s);
      },
      [theme, style],
    );
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const SELF = 'Gọi hoặc về thăm cha mẹ, người thân';
const GIVE = 'Phụ giúp người nhà một việc mà không đợi nhờ';
const contrast = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cx = Object.assign(document.createElement('canvas'), {
      width: 1,
      height: 1,
    }).getContext('2d', { willReadFrequently: true });
    const rgba = (css) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const mix = (c, under) =>
      [0, 1, 2].map((i) => c[i] * c[3] + under[i] * (1 - c[3]));
    const lum = ([r, g, b]) =>
      [r, g, b]
        .map((v) =>
          (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
        )
        .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const chain = [];
    for (let n = el; n; n = n.parentElement)
      chain.push(getComputedStyle(n).backgroundColor);
    let bg = [255, 255, 255];
    for (const css of chain.reverse()) {
      const c = rgba(css);
      if (c[3] > 0) bg = mix(c, bg);
    }
    const fg = mix(rgba(getComputedStyle(el).color), bg),
      [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);



const names = (page) => page.evaluate(() => window.zenGrowth.AXES.map((a) => a.name));
async function openReview(h, width, touch, theme, style, ws) {
  const ctx = await h.open(width, { touch, now: NOW, setup: setup(theme, style), workspace: ws });
  const errors = [];
  ctx.page.on('pageerror', (e) => errors.push(e.message));
  await ctx.page.waitForFunction(() => window.zenWeeklyReview && window.zenGrowth && !window.zenGrowth.stub, null, { timeout: 15000 }).catch(() => {});
  await ctx.page.evaluate(() => window.zenWeeklyReview.open());
  await ctx.page.waitForSelector('dialog.zen-review[open]');
  return { ...ctx, errors };
}
const octa = (page) =>
  page.evaluate(() => {
    const s = document.querySelector('.zen-review [data-review-sec="octa"]');
    if (!s) return null;
    return {
      up: s.querySelector('.zen-review-octa-up')?.textContent.replace(/\s+/g, ' ').trim(),
      lost: s.querySelector('.zen-review-octa-lost')?.textContent.replace(/\s+/g, ' ').trim(),
      seeds: [...s.querySelectorAll('.zen-review-seeds li span')].map((x) => x.textContent),
      buttons: [...s.querySelectorAll('[data-sow-axis]')].map((b) => b.dataset.sowAxis),
    };
  });
async function openSpend(h, width, touch, theme, style, ws) {
  const ctx = await h.open(width, { touch, now: NOW, setup: setup(theme, style), workspace: ws });
  const errors = [];
  ctx.page.on('pageerror', (e) => errors.push(e.message));
  await h.show(ctx.page, 'growth');
  await openGrowthTab(ctx.page, 'all');
  await ctx.page.click('[data-gr-spend]');
  await ctx.page.waitForSelector('#growth-spend[open]');
  return { ...ctx, errors };
}

const h = await startHarness({ seed });
try {
  // Bố cục ở ba cỡ × sáng, tối.
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const a = await openReview(h, width, touch, theme, undefined, seed());
      const AX = await names(a.page);
      const o = await octa(a.page);
      assert.ok(o, 'Ôn tuần có khối Bát phương' + at);
      assert.equal(o.up, 'Tăng nhiều nhất: ' + AX[1] + ' (+4 điểm).', 'phương tăng nhiều nhất' + at);
      assert.equal(o.lost, 'Bị bỏ quên: ' + AX[7] + ' (không được bồi bổ tuần này, đang 1 điểm).', 'phương bị bỏ quên là phương điểm thấp nhất trong số không được cộng' + at);
      assert.deepEqual(o.seeds, [SELF, GIVE], 'hai gợi ý Nhân của phương bị bỏ quên' + at);
      assert.deepEqual(o.buttons, ['gia', 'gia'], 'nút Gieo nhân mang đúng phương' + at);
      const hs = await a.page.evaluate(() => [...document.querySelectorAll('.zen-review-seeds .btn')].map((b) => Math.round(b.getBoundingClientRect().height)));
      for (const v of hs) assert.ok(v >= 44, 'nút Gieo nhân cao ≥ 44 px (' + v + ')' + at);
      assert.ok(await noOverflow(a.page), 'Ôn tuần không tràn ngang' + at);
      for (const sel of ['.zen-review-octa p', '.zen-review-octa .zen-review-hint', '.zen-review-seeds li span'])
        assert.ok((await contrast(a.page, sel)) >= 4.5, 'chữ đủ tương phản: ' + sel + at);
      assert.deepEqual(a.errors, [], 'không lỗi trang' + at);
      await a.page.context().close();

      const b = await openSpend(h, width, touch, theme, undefined, seed());
      assert.equal(await b.page.locator('.gr-spend-money').count(), 1, 'hộp quy đổi có ô Thu chi' + at);
      assert.deepEqual(await b.page.evaluate(() => [...document.querySelectorAll('[name=mproj] option')].map((x) => x.textContent)), ['Alpha', 'Beta'], 'đại sự đã lưu trữ không có trong danh sách' + at);
      const fh = await b.page.evaluate(() => [...document.querySelectorAll('.gr-spend-money input, .gr-spend-money select')].map((x) => Math.round(x.getBoundingClientRect().height)));
      for (const v of fh) assert.ok(v >= 44, 'ô Thu chi cao ≥ 44 px (' + v + ')' + at);
      assert.ok(await noOverflow(b.page), 'hộp quy đổi không tràn ngang' + at);
      assert.ok((await contrast(b.page, '.gr-spend-money .help-copy')) >= 4.5, 'chữ hướng dẫn đủ tương phản' + at);
      assert.deepEqual(b.errors, [], 'không lỗi trang (quy đổi)' + at);
      await b.page.context().close();
    }
  }

  // A. Số liệu theo tuần và Gieo nhân.
  {
    const { page, server } = await openReview(h, 1440, false, 'light', undefined, seed());
    const AX = await names(page);
    await page.click('[data-review-week="prev"]');
    const o = await octa(page);
    assert.equal(o.up, 'Tăng nhiều nhất: ' + AX[0] + ' (+5 điểm).', 'tuần trước: Đạo tăng nhiều nhất');
    assert.match(o.lost, /^Bị bỏ quên: /, 'tuần trước vẫn có phương bị bỏ quên');
    await page.click('[data-review-week="this"]');
    // Gieo nhân từ Ôn tuần: tạo đúng một việc mang phương gia ở đại sự đang chọn.
    const before = server.workspace.projects.flatMap((p) => p.tasks).length;
    await page.locator('.zen-review-seeds [data-sow-axis]').first().click();
    await page.waitForSelector('dialog.gr-sow[open]');
    assert.equal(await page.locator('dialog.gr-sow [name=title]').inputValue(), SELF, 'hộp Gieo nhân điền sẵn gợi ý');
    await page.click('dialog.gr-sow [type=submit]');
    await until(() => server.workspace.projects.flatMap((p) => p.tasks).filter((t) => t.axis === 'gia').length === 1, 'việc gieo lên máy chủ');
    assert.equal(server.workspace.projects.flatMap((p) => p.tasks).length, before + 1, 'chỉ thêm một việc');
    assert.equal(server.workspace.projects.flatMap((p) => p.tasks).find((t) => t.axis === 'gia').title, SELF, 'đúng tên việc');
    assert.equal(server.workspace.growth.log.length, LOG.length, 'chưa cộng điểm nào');
    await page.context().close();
  }
  // Không có Điểm tích lũy thì không có khối.
  {
    const { page } = await openReview(h, 1440, false, 'light', undefined, seedNoGrowth());
    assert.equal(await octa(page), null, 'chưa có Điểm tích lũy: không có khối Bát phương');
    await page.context().close();
  }

  // B. Ghi khoản chi vào Thu chi.
  {
    const { page, server } = await openSpend(h, 1440, false, 'light', undefined, seed());
    await page.fill('.gr-spend-dlg input[name="n"]', 'Tai nghe mới');
    await page.fill('.gr-spend-dlg [data-gr-spend-quick]', '2');
    await page.click('[data-gr-spend-split]');
    // Số sai: báo lỗi, không lưu gì.
    await page.fill('.gr-spend-dlg input[name="money"]', 'abc');
    await page.click('.gr-spend-dlg [type=submit]');
    assert.match(await page.locator('.gr-spend-msg').innerText(), /Số tiền chưa đúng/, 'số tiền sai bị báo');
    assert.equal(await page.evaluate(() => document.activeElement?.name), 'money', 'tiêu điểm về ô số tiền');
    assert.equal((server.workspace.growth.spend || []).length, 0, 'số sai: chưa ghi sổ bảo vật');
    // Chọn Beta, nhập có dấu chấm ngăn cách.
    await page.selectOption('.gr-spend-dlg [name=mproj]', 'p2');
    await page.fill('.gr-spend-dlg input[name="money"]', '1.250.000');
    await page.click('.gr-spend-dlg [type=submit]');
    await page.waitForSelector('#growth-spend', { state: 'detached' });
    await until(() => (server.workspace.growth.spend || []).length === 1, 'quy đổi lên máy chủ');
    const beta = () => server.workspace.projects.find((p) => p.id === 'p2');
    await until(() => (beta().ledger || []).length === 1, 'khoản chi lên máy chủ');
    const e = beta().ledger[0];
    assert.deepEqual({ type: e.type, amount: e.amount, category: e.category, note: e.note, date: e.date }, { type: 'out', amount: 1250000, category: 'Bảo vật', note: 'Đổi bảo vật: Tai nghe mới', date: TODAY }, 'khoản chi đúng hình dạng Thu chi');
    assert.equal((server.workspace.projects.find((p) => p.id === 'p1').ledger || []).length, 0, 'đại sự khác không bị ghi');
    assert.match(await page.locator('#toast').textContent(), /Đã ghi khoản chi 1\.250\.000 ₫ vào Beta\./, 'thông báo khoản chi');
    // Bỏ trống: không ghi.
    await page.click('[data-gr-spend]');
    await page.waitForSelector('#growth-spend[open]');
    await page.fill('.gr-spend-dlg input[name="n"]', 'Bữa tối ngoài');
    await page.fill('.gr-spend-dlg [data-gr-spend-quick]', '1');
    await page.click('[data-gr-spend-split]');
    await page.click('.gr-spend-dlg [type=submit]');
    await page.waitForSelector('#growth-spend', { state: 'detached' });
    await until(() => (server.workspace.growth.spend || []).length === 2, 'quy đổi thứ hai lên máy chủ');
    assert.equal((beta().ledger || []).length, 1, 'bỏ trống số tiền: không ghi thêm khoản chi');
    // Sửa một lần quy đổi cũ: không có ô Thu chi.
    await page.click('[data-gr-spend-edit]');
    await page.waitForSelector('#growth-spend[open]');
    assert.equal(await page.locator('.gr-spend-money').count(), 0, 'sửa lần quy đổi: không có ô Thu chi');
    await page.context().close();
  }

  // Giang hồ ở 1440 px.
  {
    const { page } = await openReview(h, 1440, false, 'light', 'giangho', seed());
    const t = await page.evaluate(() => document.querySelector('.zen-review [data-review-sec="octa"]').textContent);
    assert.equal(/\b(hoàn thành|dự án|báo cáo|bạn)\b/i.test(t), false, 'khối Bát phương không lẫn chữ Thiền');
    await page.context().close();
    const b = await openSpend(h, 1440, false, 'light', 'giangho', seed());
    const m = await b.page.evaluate(() => document.querySelector('.gr-spend-money').textContent);
    assert.equal(/\b(hoàn thành|dự án|báo cáo|bạn)\b/i.test(m), false, 'ô Thu chi không lẫn chữ Thiền');
    await b.page.context().close();
  }
} finally {
  await h.close();
}
console.log('growth hoi quang browser ok');
