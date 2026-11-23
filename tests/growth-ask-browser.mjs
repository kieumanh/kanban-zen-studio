// v2.83.0 (Hỏi Bà Chủ): bấm “Hỏi bà chủ” ở Tàng Bảo Các mở hộp thông tin giá trị món vật phẩm (dist/growth-store.js, dist/growth.css).
//  1. Mở hộp: tiêu đề “Hỏi bà chủ · tên món”, tiêu điểm vào tiêu đề, lời bà chủ, bảng “Giá trị món này”: không niêm yết giá, mạch hợp kèm tu vi đang có,
//     tu vi tổng, số lần đã đổi, trung bình / thấp nhất / cao nhất và ba lần gần nhất lấy từ sổ bảo vật; chưa đổi lần nào thì nói rõ, không dựng số.
//  2. Loại trong món (Claude Pro) đi theo tên ở tiêu đề; hỏi không ghi gì vào sổ (không đổi dữ liệu).
//  3. Đóng bằng nút Đóng, phím Esc hoặc bấm ra ngoài: tiêu điểm về đúng nút Hỏi bà chủ, thẻ vẫn được đánh dấu; “Quy đổi món này” mở bảng quy đổi với tên món điền sẵn.
//  4. 390 / 820 / 1440 px × Thiền / Giang hồ × sáng / tối: hộp nằm trọn màn hình, nút ≥ 44px và thấy được, chữ đủ tương phản, không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';
import { openGrowthTab } from './lib/growth-tab.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const dmy = (iso) => iso.split('-').reverse().join('/');
// Nửa điểm → điểm: tổng đã cộng 1.460; các lần đã đổi (HIST) trừ 100 nên còn 1.360, Thân thể 260→185, Tâm cảnh 80→65.
const RICH = [240, 600, 160, 90, 520, 820, 300, 190];
const HIST = [
  { id: 's1', d: day(-30), n: 'Nhà trọ một đêm', p: [0, 0, 0, 0, 40, 0, 0, 0] }, // 20 điểm
  { id: 's2', d: day(-10), n: 'Nhà trọ hai đêm', p: [0, 0, 30, 0, 50, 0, 0, 0] }, // 40 điểm
  { id: 's3', d: day(-3), n: 'Nhà trọ cuối tuần', p: [0, 0, 0, 0, 60, 20, 0, 0] }, // 40 điểm
  { id: 's4', d: day(-2), n: 'Nhà trọ đã hủy', p: [0, 0, 0, 0, 200, 0, 0, 0], x: true }, // hủy: không tính
];
const world = (spend = []) => () => ({
  schema: 1,
  projects: [],
  notes: [],
  growth: { v: 1, hero: 'nu', name: 'Lam Y', since: day(-200), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: RICH }], spend },
});
const setStyle = (style, theme) => ({ context }) =>
  context.addInitScript(([s, t]) => { localStorage.setItem('zen-style', s); localStorage.setItem('zen-theme', t); }, [style, theme]);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const text = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ').trim();
const ask = async (page, id) => {
  await page.click('[data-gr-shop-ask="' + id + '"]');
  await page.waitForSelector('#gr-store-ask[open]');
};
const closed = (page) => page.waitForSelector('#gr-store-ask', { state: 'detached' });
const focusIs = (page, id) => page.evaluate((i) => document.activeElement?.dataset.grShopAsk === i, id);
const fm = (page, n) => page.evaluate((v) => zenGrowth.fmt(v), n);
// Tỷ lệ tương phản WCAG của chữ trên nền thực (cộng dồn nền các lớp cha); null nếu không có phần tử.
const contrast = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
    const rgba = (css) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const mix = (c, under) => [0, 1, 2].map((i) => c[i] * c[3] + under[i] * (1 - c[3]));
    const lum = ([r, g, b]) => [r, g, b].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.push(getComputedStyle(n).backgroundColor);
    let bg = [255, 255, 255];
    for (const css of chain.reverse()) {
      const c = rgba(css);
      if (c[3] > 0) bg = mix(c, bg);
    }
    const fg = mix(rgba(getComputedStyle(el).color), bg), [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);

const h = await startHarness();
try {
  // 1–3. Hành vi, ở khổ điện thoại (chạm) và máy tính.
  for (const [width, touch] of [[390, true], [1440, false]]) {
    const at = ' (' + width + 'px)';
    {
      const { context, page, server } = await h.open(width, { touch, workspace: world(HIST)() });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'growth');
      await openGrowthTab(page, 'all');
      await ask(page, 'tro');
      assert.equal(await text(page.locator('#gr-ask-title')), 'Hỏi bà chủ · Nhà trọ', 'tiêu đề hộp' + at);
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'gr-ask-title', 'tiêu điểm vào tiêu đề hộp' + at);
      const body = await text(page.locator('#gr-store-ask'));
      assert.match(body, /Liễu Linh Lung/, 'lời bà chủ có mặt' + at);
      assert.match(body, /Giá niêm yết Không niêm yết, các hạ tự định theo cảm nhận/, 'không niêm yết giá' + at);
      assert.match(body, /Mạch hợp Thân thể 185 Tâm cảnh 65/, 'mạch hợp kèm tu vi đang có' + at);
      assert.match(body, /Tu vi đang có 1\.360 điểm ở tám mạch/, 'tu vi tổng' + at);
      assert.match(body, new RegExp('Đã quy đổi 3 lần · ' + (await fm(page, 100)) + ' điểm'), 'ba lần chưa hủy, lần đã hủy không tính' + at);
      assert.match(body, new RegExp('Trung bình ' + (await fm(page, Math.round((100 / 3) * 10) / 10)) + ' điểm \\(từ 20 đến 40\\)'), 'trung bình, thấp nhất, cao nhất' + at);
      assert.deepEqual(
        await page.evaluate(() => [...document.querySelectorAll('.gr-ask-hist li')].map((li) => [...li.children].map((c) => c.textContent.trim()).join(' '))),
        [dmy(day(-3)) + ' 40 điểm', dmy(day(-10)) + ' 40 điểm', dmy(day(-30)) + ' 20 điểm'],
        'ba lần gần nhất, mới trước cũ sau' + at,
      );
      assert.equal(await page.locator('.gr-store-item.is-asked[data-item="tro"]').count(), 1, 'thẻ được hỏi được đánh dấu' + at);
      // 3a. Esc đóng, tiêu điểm về nút Hỏi bà chủ.
      await page.keyboard.press('Escape');
      await closed(page);
      assert.equal(await focusIs(page, 'tro'), true, 'Esc: tiêu điểm về nút Hỏi bà chủ' + at);
      // 3b. Nút Đóng.
      await ask(page, 'tro');
      await page.click('[data-gr-ask-close]');
      await closed(page);
      assert.equal(await focusIs(page, 'tro'), true, 'nút Đóng: tiêu điểm về nút Hỏi bà chủ' + at);
      // 3c. Bấm ra ngoài hộp.
      await ask(page, 'tro');
      await page.evaluate(() => document.querySelector('#gr-store-ask').dispatchEvent(new MouseEvent('click', { bubbles: true })));
      await closed(page);
      // 2. Loại Claude Pro đi theo tên; hỏi không ghi gì vào sổ.
      await page.check('.gr-store-item[data-item="ai"] input[value="claude"]');
      await ask(page, 'ai');
      assert.equal(await text(page.locator('#gr-ask-title')), 'Hỏi bà chủ · Quân sư AI · Claude Pro', 'tên loại đi theo tiêu đề' + at);
      assert.match(await text(page.locator('#gr-store-ask')), /Đã quy đổi Chưa đổi lần nào/, 'chưa đổi lần nào thì nói rõ' + at);
      assert.equal(await page.locator('.gr-ask-hist').count(), 0, 'chưa đổi thì không dựng lịch sử' + at);
      assert.equal(await page.getByText('Mỗi lần', { exact: true }).count(), 0, 'chưa đổi thì không có dòng trung bình' + at);
      // 3d. Quy đổi món này → bảng quy đổi với tên món điền sẵn.
      await page.click('[data-gr-ask-buy]');
      await page.waitForSelector('#growth-spend[open]');
      assert.equal(await page.locator('#gr-store-ask').count(), 0, 'hộp thông tin đã đóng khi sang bảng quy đổi' + at);
      assert.equal(await page.inputValue('#growth-spend [name=n]'), 'Quân sư AI · Claude Pro', 'tên món điền sẵn' + at);
      assert.deepEqual(server.workspace.growth.spend, HIST, 'hỏi bà chủ không ghi gì vào sổ bảo vật' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }

  // 4. Giao diện.
  for (const w of [390, 820, 1440]) {
    for (const [style, theme] of [['zen', 'light'], ['giangho', 'light'], ['giangho', 'dark'], ['zen', 'dark']]) {
      const at = ` (${w}px, ${style}, ${theme})`;
      const { context, page } = await h.open(w, { touch: w < 1000, workspace: world(HIST)(), setup: setStyle(style, theme) });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'growth');
      await openGrowthTab(page, 'all');
      await ask(page, 'son');
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const d = document.querySelector('#gr-store-ask'), r = d.getBoundingClientRect();
        const btns = [...d.querySelectorAll('.gr-award-foot .btn')].map((b) => {
          const q = b.getBoundingClientRect();
          return { h: q.height, top: q.top, bottom: q.bottom, left: q.left, right: q.right };
        });
        return { inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, btns, vh: innerHeight, vw: innerWidth, scrollX: d.scrollWidth > d.clientWidth + 1 };
      });
      assert.equal(m.inside, true, 'hộp nằm trọn trong màn hình' + at);
      assert.equal(m.scrollX, false, 'hộp không tràn ngang' + at);
      assert.equal(m.btns.length, 2, 'hai nút Đóng / Quy đổi' + at);
      for (const b of m.btns) {
        assert.ok(b.h >= 44, 'nút cao ít nhất 44px' + at);
        assert.ok(b.top >= 0 && b.bottom <= m.vh && b.left >= 0 && b.right <= m.vw, 'nút nằm trong màn hình, thấy được ngay (không phải cuộn)' + at);
      }
      for (const sel of ['#gr-ask-title', '.gr-ask-top p', '.gr-ask-row dt', '.gr-ask-row dd', '.gr-ask-axes li', '.gr-ask-note', '.gr-ask-worth h3']) {
        const c = await contrast(page, sel);
        assert.ok(c !== null, 'có phần tử ' + sel + at);
        assert.ok(c >= 4.5, `chữ ${sel} đủ tương phản (${c.toFixed(2)})` + at);
      }
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }
  console.log('PASS: Hỏi bà chủ mở hộp giá trị món (mạch hợp, tu vi, lịch sử quy đổi), đóng đúng tiêu điểm, sang bảng quy đổi; 390/820/1440px, Thiền/Giang hồ, sáng/tối.');
} finally {
  await h.close();
}
