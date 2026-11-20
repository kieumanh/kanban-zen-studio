// v2.74.0 (Khoản Chi Liền): lần đổi bảo vật nhớ khoản chi đã ghi ở Thu chi (trường tùy chọn lp + li trên dòng quy đổi); hủy lần quy đổi thì hỏi có xóa luôn khoản chi không.
//  1. Đổi bảo vật có số tiền: dòng quy đổi mang lp (đại sự) + li (khoản chi) đúng mã; không có số tiền thì không có hai trường này.
//  2. Hủy lần quy đổi có khoản chi còn nguyên: hộp hỏi nêu đúng số tiền + tên đại sự; “Không hủy” (và Esc) không đổi gì; “Hủy, giữ khoản chi” hoàn điểm, khoản chi còn nguyên;
//     “Hủy và xóa khoản chi” hoàn điểm và xóa đúng khoản chi ấy (khoản chi khác của đại sự không bị đụng), gỡ lp + li; thông báo nói rõ.
//  3. Không có khoản chi để hỏi (không ghi Thu chi / đã xóa tay / đại sự đã xóa): hủy ngay như cũ, không hộp hỏi.
//  4. Bố cục hộp hỏi ở 390 (chạm) / 820 (chạm) / 1440 px × sáng, tối: không tràn ngang, nút ≥ 44 px, chữ đủ tương phản; Giang hồ đủ giọng; chỉ đọc không có nút hủy.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';
import { openGrowthTab } from './lib/growth-tab.mjs';

const NOW = '2026-11-13T03:00:00Z';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá hạn chờ: ' + label);
}
const growthOf = () => ({
  v: 1,
  hero: 'nam',
  name: 'Mạnh',
  since: '2026-11-01',
  log: Array.from({ length: 8 }, (_, i) => {
    const p = Array(8).fill(0);
    p[i] = 20;
    return { id: 'a' + i, d: '2026-11-03', s: 'task', k: 'task:a' + i, n: 'Việc ' + i, p };
  }),
  spend: [],
});
const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Alpha', '#7950c8', 2), makeProject('p2', 'Beta', '#c764a2', 2, { ledger: [{ id: 'k0', type: 'out', amount: 50000, category: 'Ăn uống', note: 'Cơm trưa', date: '2026-11-10' }] })],
  notes: [],
  growth: growthOf(),
});
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




async function openSpendPage(h, width, touch, theme, style) {
  const ctx = await h.open(width, { touch, now: NOW, setup: setup(theme, style), workspace: seed() });
  const errors = [];
  ctx.page.on('pageerror', (e) => errors.push(e.message));
  await h.show(ctx.page, 'growth');
  await openGrowthTab(ctx.page, 'all');
  return { ...ctx, errors };
}
// Đổi một bảo vật (1 điểm); money = số tiền (chuỗi) hoặc '' để không ghi Thu chi.
async function exchange(page, server, name, money, proj) {
  const count = (server.workspace.growth.spend || []).length;
  await page.click('[data-gr-spend]');
  await page.waitForSelector('#growth-spend[open]');
  await page.fill('.gr-spend-dlg input[name="n"]', name);
  await page.fill('.gr-spend-dlg [data-gr-spend-quick]', '1');
  await page.click('[data-gr-spend-split]');
  if (money) {
    await page.selectOption('.gr-spend-dlg [name=mproj]', proj);
    await page.fill('.gr-spend-dlg input[name="money"]', money);
  }
  await page.click('.gr-spend-dlg [type=submit]');
  await page.waitForSelector('#growth-spend', { state: 'detached' });
  await until(() => (server.workspace.growth.spend || []).length === count + 1, 'quy đổi lên máy chủ');
  return server.workspace.growth.spend.find((e) => e.n === name);
}
const spendOf = (server, name) => server.workspace.growth.spend.find((e) => e.n === name);
const ledgerOf = (server, pid) => server.workspace.projects.find((p) => p.id === pid).ledger || [];
const toast = (page) => page.evaluate(() => document.querySelector('#toast').textContent);
const voidBtn = (page, id) => page.locator('[data-gr-spend-void="' + id + '"]');

const h = await startHarness({ seed });
try {
  // Luồng đầy đủ + bố cục ở ba cỡ × sáng, tối.
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const { page, server, errors } = await openSpendPage(h, width, touch, theme);

      // 1. Có số tiền: lp + li đúng mã. Không có số tiền: không có hai trường.
      const a = await exchange(page, server, 'Tai nghe mới', '1.250.000', 'p2');
      const led = ledgerOf(server, 'p2').find((x) => x.note === 'Đổi bảo vật: Tai nghe mới');
      assert.ok(led, 'khoản chi đã ghi' + at);
      assert.deepEqual([a.lp, a.li], ['p2', led.id], 'dòng quy đổi nhớ đại sự và khoản chi' + at);
      const b = await exchange(page, server, 'Bữa tối ngoài', '', null);
      assert.equal(b.lp, undefined, 'không có số tiền: không có lp' + at);
      assert.equal(b.li, undefined, 'không có số tiền: không có li' + at);

      // 3a. Không ghi Thu chi: hủy ngay, không hộp hỏi.
      await voidBtn(page, b.id).click();
      await until(() => spendOf(server, 'Bữa tối ngoài').x === true, 'hủy ngay lên máy chủ');
      assert.equal(await page.locator('#editor[open] [data-gr-spend-void-ok]').count(), 0, 'không có khoản chi: không hộp hỏi' + at);

      // 2. Có khoản chi còn nguyên: hộp hỏi.
      await voidBtn(page, a.id).click();
      await page.waitForSelector('#editor[open] [data-gr-spend-void-ok]');
      const dlg = await page.evaluate(() => ({
        text: document.querySelector('#editor .bg-confirm').textContent.replace(/\s+/g, ' '),
        buttons: [...document.querySelectorAll('#editor .bg-confirm-actions .btn')].map((x) => x.textContent.trim()),
        heights: [...document.querySelectorAll('#editor .bg-confirm-actions .btn')].map((x) => Math.round(x.getBoundingClientRect().height)),
        focus: document.activeElement?.textContent.trim(),
      }));
      assert.match(dlg.text, /Tai nghe mới/, 'hộp hỏi nêu tên bảo vật' + at);
      assert.match(dlg.text, /1\.250\.000 ₫/, 'hộp hỏi nêu đúng số tiền' + at);
      assert.match(dlg.text, /Beta/, 'hộp hỏi nêu đại sự' + at);
      assert.deepEqual(dlg.buttons, ['Không hủy', 'Hủy, giữ khoản chi', 'Hủy và xóa khoản chi'], 'ba nút' + at);
      assert.equal(dlg.focus, 'Không hủy', 'tiêu điểm vào lựa chọn an toàn' + at);
      for (const v of dlg.heights) assert.ok(v >= 44, 'nút cao ≥ 44 px (' + v + ')' + at);
      assert.ok(await noOverflow(page), 'hộp hỏi không tràn ngang' + at);
      assert.ok(await page.evaluate(() => [...document.querySelectorAll('#editor .bg-confirm-actions .btn')].every((x) => x.getBoundingClientRect().right <= innerWidth + 0.5 && x.getBoundingClientRect().left >= -0.5)), 'nút nằm trong màn hình' + at);
      assert.ok((await contrast(page, '#editor .bg-confirm p')) >= 4.5, 'chữ hộp hỏi đủ tương phản' + at);

      // “Không hủy” và Esc: không đổi gì.
      await page.click('[data-gr-spend-void-no]');
      await page.waitForSelector('#editor[open] [data-gr-spend-void-ok]', { state: 'detached' });
      assert.equal(spendOf(server, 'Tai nghe mới').x, undefined, 'Không hủy: chưa hủy' + at);
      assert.equal(ledgerOf(server, 'p2').length, 2, 'Không hủy: khoản chi còn' + at);
      await voidBtn(page, a.id).click();
      await page.waitForSelector('#editor[open] [data-gr-spend-void-ok]');
      await page.keyboard.press('Escape');
      await page.waitForSelector('#editor[open] [data-gr-spend-void-ok]', { state: 'detached' });
      assert.equal(spendOf(server, 'Tai nghe mới').x, undefined, 'Esc: chưa hủy' + at);

      // “Hủy, giữ khoản chi”: hoàn điểm, khoản chi còn nguyên và vẫn nối.
      await voidBtn(page, a.id).click();
      await page.waitForSelector('#editor[open] [data-gr-spend-void-ok]');
      await page.click('[data-gr-spend-void-ok]:has-text("Hủy, giữ khoản chi")');
      await until(() => spendOf(server, 'Tai nghe mới').x === true, 'hủy giữ khoản chi');
      assert.equal(ledgerOf(server, 'p2').length, 2, 'giữ khoản chi: còn nguyên' + at);
      assert.deepEqual([spendOf(server, 'Tai nghe mới').lp, spendOf(server, 'Tai nghe mới').li], ['p2', led.id], 'giữ khoản chi: vẫn nối' + at);
      assert.doesNotMatch(await toast(page), /Đã xóa khoản chi/, 'thông báo không nói đã xóa' + at);

      // Khôi phục rồi hủy lại: “Hủy và xóa khoản chi” xóa đúng khoản chi, giữ khoản khác.
      await page.locator('[data-gr-spend-restore="' + a.id + '"]').click();
      await until(() => spendOf(server, 'Tai nghe mới').x === undefined, 'khôi phục');
      await voidBtn(page, a.id).click();
      await page.waitForSelector('#editor[open] [data-gr-spend-void-ok]');
      await page.click('[data-gr-spend-void-ok]:has-text("Hủy và xóa khoản chi")');
      await until(() => spendOf(server, 'Tai nghe mới').x === true && ledgerOf(server, 'p2').length === 1, 'hủy và xóa khoản chi');
      assert.deepEqual(ledgerOf(server, 'p2').map((x) => x.id), ['k0'], 'chỉ xóa đúng khoản chi của lần quy đổi' + at);
      assert.equal(spendOf(server, 'Tai nghe mới').lp, undefined, 'gỡ lp' + at);
      assert.equal(spendOf(server, 'Tai nghe mới').li, undefined, 'gỡ li' + at);
      assert.match(await toast(page), /Đã xóa khoản chi đã ghi ở Thu chi/, 'thông báo đã xóa khoản chi' + at);
      assert.equal(await page.locator('#editor[open]').count(), 0, 'hộp hỏi đã đóng' + at);

      // 3b. Khôi phục rồi hủy lại khi khoản chi đã mất: hủy ngay.
      await page.locator('[data-gr-spend-restore="' + a.id + '"]').click();
      await until(() => spendOf(server, 'Tai nghe mới').x === undefined, 'khôi phục lần hai');
      await voidBtn(page, a.id).click();
      await until(() => spendOf(server, 'Tai nghe mới').x === true, 'hủy ngay khi khoản chi đã mất');
      assert.equal(await page.locator('#editor[open] [data-gr-spend-void-ok]').count(), 0, 'khoản chi đã mất: không hộp hỏi' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await page.context().close();
    }
  }

  // 3c. Khoản chi bị xóa tay ở Thu chi: hủy ngay, không hộp hỏi. Đại sự bị xóa cũng vậy.
  {
    const { page, server } = await openSpendPage(h, 1440, false, 'light');
    const a = await exchange(page, server, 'Sách mới', '200000', 'p1');
    await page.evaluate(() => {
      const p = project('p1');
      p.ledger = p.ledger.filter((x) => !/Sách mới/.test(x.note));
      save();
    });
    await voidBtn(page, a.id).click();
    await until(() => spendOf(server, 'Sách mới').x === true, 'hủy sau khi xóa tay khoản chi');
    assert.equal(await page.locator('#editor[open] [data-gr-spend-void-ok]').count(), 0, 'xóa tay: không hộp hỏi');
    const c = await exchange(page, server, 'Bút mới', '30000', 'p2');
    await page.evaluate(() => {
      data.projects = data.projects.filter((p) => p.id !== 'p2');
      save();
    });
    await voidBtn(page, c.id).click();
    await until(() => spendOf(server, 'Bút mới').x === true, 'hủy sau khi đại sự bị xóa');
    assert.equal(await page.locator('#editor[open] [data-gr-spend-void-ok]').count(), 0, 'đại sự đã xóa: không hộp hỏi');
    await page.context().close();
  }

  // Lỗi lưu: hủy và xóa khoản chi hoàn lại cả hai (không mất khoản chi mà vẫn chưa hủy).
  {
    const { page, server } = await openSpendPage(h, 1440, false, 'light');
    const a = await exchange(page, server, 'Tai nghe hai', '90000', 'p2');
    await voidBtn(page, a.id).click();
    await page.waitForSelector('#editor[open] [data-gr-spend-void-ok]');
    await page.route('**/api/**', (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
    await page.click('[data-gr-spend-void-ok]:has-text("Hủy và xóa khoản chi")');
    await wait(1200);
    assert.equal(spendOf(server, 'Tai nghe hai').x, undefined, 'lưu lỗi: chưa hủy trên máy chủ');
    assert.equal(ledgerOf(server, 'p2').length, 2, 'lưu lỗi: khoản chi còn trên máy chủ');
    await page.context().close();
  }

  // Giang hồ ở 1440 px: hộp hỏi không lẫn chữ Thiền.
  {
    const { page, server } = await openSpendPage(h, 1440, false, 'light', 'giangho');
    const a = await exchange(page, server, 'Tai nghe ba', '70000', 'p2');
    await voidBtn(page, a.id).click();
    await page.waitForSelector('#editor[open] [data-gr-spend-void-ok]');
    const t = await page.evaluate(() => document.querySelector('#editor .bg-confirm').textContent);
    assert.equal(/\b(hoàn thành|dự án|báo cáo|bạn|việc)\b/i.test(t), false, 'hộp hỏi không lẫn chữ Thiền');
    await page.context().close();
  }
} finally {
  await h.close();
}
console.log('growth void ledger browser ok');
