// v2.34.0 (Tàng Bảo Các): kho vật phẩm trong trang Tu vi (dist/growth-store.js). Sáu món (Nhà trọ, Sơn trang, Bí kíp tu luyện đổi lẻ, Rương bí kíp đổi sỉ,
// Thiên Lý Nhãn = camera, Quân sư & tướng lĩnh AI với ba loại Gemini Pro / ChatGPT Plus / Claude Pro), bà chủ Liễu Linh Lung tư vấn theo điểm đang có,
// bấm Quy đổi mở bảng nhập tay đủ tám mạch. KHÔNG có giá định sẵn: người chơi tự trừ bao nhiêu tùy cảm nhận, điểm ít hay nhiều đều đổi được.
// Kiểm tra ở 390 (chạm), 820, 1440 px, hai kiểu giao diện, sáng/tối/tương phản cao, giảm chuyển động.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';
import { openGrowthTab } from './lib/growth-tab.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
// Nửa điểm → điểm: Đạo tâm 120 · Tài lộc 300 · Tâm cảnh 80 · Nhân duyên 45 · Thân thể 260 · Trí tuệ 410 · Sự nghiệp 150 · Gia đạo 95 = 1.460 điểm.
const RICH = [240, 600, 160, 90, 520, 820, 300, 190];
const THIN = [1, 0, 0, 0, 0, 0, 0, 0]; // đúng 0,5 điểm ở Đạo tâm
const AXES = ['Đạo tâm', 'Tài lộc', 'Tâm cảnh', 'Nhân duyên', 'Thân thể', 'Trí tuệ', 'Sự nghiệp', 'Gia đạo'];
const withGrowth = (p, spend = []) => () => ({
  schema: 1,
  projects: [],
  notes: [],
  growth: { v: 1, hero: 'nu', name: 'Lam Y', since: day(-200), log: p.some((v) => v) ? [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p }] : [], spend },
});
const rich = withGrowth(RICH);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 80; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá thời gian chờ: ' + label);
}
const toast = (page) => page.locator('#toast').textContent();
const savedSpend = (server) => server.workspace.growth?.spend || [];
const radarValues = (page) => page.evaluate(() => [...document.querySelectorAll('.gr-radar .gr-value')].map((n) => n.textContent));
const axis = (page, i) => page.locator('[data-gr-spend-axis="' + i + '"]');
const text = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ').trim();
const item = (page, id) => page.locator('.gr-store-item[data-item="' + id + '"]');
// Chờ mọi hiệu ứng chuyển màu (CSS transition) đang chạy xong để đọc màu cuối cùng; hoạt họa lặp vô hạn của tranh không tính.
const settle = (page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => {}))).then(() => undefined));
const setStyle = (style) => ({ context }) => context.addInitScript((s) => localStorage.setItem('zen-style', s), style);
async function openBuy(page, id) {
  await page.click('[data-gr-shop-buy="' + id + '"]');
  await page.waitForSelector('#growth-spend[open]');
}
// v2.83.0: “Hỏi bà chủ” mở hộp thông tin giá trị món (hộp modal); lời tư vấn trên trang vẫn đổi theo như trước.
async function openAsk(page, id) {
  await page.click('[data-gr-shop-ask="' + id + '"]');
  await page.waitForSelector('#gr-store-ask[open]');
}
async function closeAsk(page) {
  await page.keyboard.press('Escape');
  await page.waitForSelector('#gr-store-ask', { state: 'detached' });
}
async function closeDialog(page) {
  await page.click('[data-gr-spend-close]');
  await page.waitForSelector('#growth-spend', { state: 'detached' });
}
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

const h = await startHarness({ seed: rich });
try {
  // A. Danh mục: sáu món đúng tên, đúng loại; mạch hợp nằm trong tám mạch; không có số nào trong lời giới thiệu món (không niêm yết giá).
  {
    const { context, page } = await h.open(1440, { workspace: rich() });
    await h.show(page, 'growth');
    await openGrowthTab(page, 'all');
    const info = await page.evaluate(() => ({
      ids: zenStore.ITEMS.map((i) => i.id),
      names: zenStore.ITEMS.map((i) => i.name),
      tags: zenStore.ITEMS.map((i) => i.tag),
      picks: Object.fromEntries(zenStore.ITEMS.filter((i) => i.pick).map((i) => [i.id, i.pick.map((p) => p.label)])),
      fits: zenStore.ITEMS.map((i) => zenStore.fitOf(i)),
      says: zenStore.ITEMS.flatMap((i) => (i.pick || [null]).map((p) => { zenStore.sel.pick[i.id] = p ? p.id : undefined; return zenStore.advise(i, [1, 1, 1, 1, 1, 1, 1, 1]).item; })),
      owner: zenStore.OWNER,
    }));
    // v2.89.0: thêm Vạn Thư Ngọc Hạp (USB chứa dữ liệu) ở cuối; đây là thay đổi có chủ đích của danh mục, không phải sửa test cho xanh.
    assert.deepEqual(info.ids, ['tro', 'son', 'kip', 'ruong', 'nhan', 'ai', 'usb'], 'bảy món theo thứ tự');
    assert.deepEqual(info.names, ['Nhà trọ', 'Sơn trang', 'Bí kíp tu luyện', 'Rương bí kíp', 'Thiên Lý Nhãn', 'Quân sư & tướng lĩnh AI', 'Vạn Thư Ngọc Hạp']);
    assert.deepEqual(info.tags, ['Nghỉ chân', 'Ẩn cư', 'Đổi lẻ · 1 quyển', 'Đổi sỉ · 100 quyển', 'Mắt thần truyền thông', 'Trợ thủ AI', 'USB chứa dữ liệu'], 'Bí kíp đổi lẻ, Rương bí kíp đổi sỉ, camera là Mắt thần truyền thông, USB chứa dữ liệu');
    assert.deepEqual(info.picks, { kip: ['Tinh thần', 'Vật chất'], ruong: ['Tinh thần', 'Vật chất'], ai: ['Gemini Pro', 'ChatGPT Plus', 'Claude Pro'] }, 'bí kíp có hai loại, AI có đúng ba loại');
    for (const f of info.fits) assert.ok(f.length >= 1 && f.every((i) => Number.isInteger(i) && i >= 0 && i <= 7), 'mạch hợp nằm trong tám mạch: ' + f);
    for (const s of info.says) assert.ok(s && !/\d/.test(s), 'lời giới thiệu món không có giá/số: ' + s);
    assert.deepEqual(info.owner, { name: 'Liễu Linh Lung', title: 'Chưởng quỹ Tàng Bảo Các' });
    await context.close();
  }

  // B. Bộ máy tư vấn của bà chủ: theo điểm đang có (0 điểm, rất ít, dồi dào), chỉ nói mạch nào dồi dào / hợp món, không báo giá.
  {
    const { context, page } = await h.open(1440, { workspace: rich() });
    await h.show(page, 'growth');
    await openGrowthTab(page, 'all');
    const bal = [120, 300, 80, 45, 260, 410, 150, 95], zero = [0, 0, 0, 0, 0, 0, 0, 0];
    const a = await page.evaluate(([bal, zero]) => {
      const it = (id) => zenStore.ITEMS.find((x) => x.id === id);
      zenStore.sel.pick = {};
      return {
        zero: zenStore.advise(null, zero),
        thin: zenStore.advise(null, [0.5, 0, 0, 0, 0, 0, 0, 0]),
        rich: zenStore.advise(null, bal),
        troRich: zenStore.advise(it('tro'), bal),
        troEmpty: zenStore.advise(it('tro'), [0, 0, 0, 0, 0, 0, 0, 5]),
        troZero: zenStore.advise(it('tro'), zero),
        hintRich: zenStore.hintOf(it('nhan'), bal),
        hintEmpty: zenStore.hintOf(it('tro'), [0, 0, 0, 0, 0, 0, 0, 5]),
        hintZero: zenStore.hintOf(it('tro'), zero),
      };
    }, [bal, zero]);
    assert.match(a.zero.hello, /chưa có tu vi để quy đổi/, '0 điểm: bà chủ mời quay lại');
    assert.match(a.thin.hello, /còn mỏng, mới 0,5 điểm.*không niêm yết giá/, 'rất ít điểm: vẫn đổi được');
    assert.equal(a.rich.hello, 'Tu vi các hạ đang có 1.460 điểm; dồi dào nhất là Trí tuệ (410), kế đó Tài lộc (300).', 'nhiều điểm: nêu hai mạch dồi dào nhất');
    assert.deepEqual(a.rich.rich, [5, 1]);
    assert.match(a.rich.item, /^Chọn một món rồi bấm “Hỏi bà chủ”/, 'chưa chọn món thì mời chọn');
    for (const k of ['zero', 'thin', 'rich', 'troRich']) assert.equal(a[k].close, 'Giá do các hạ tự định theo cảm nhận của mình; tám mạch nào cũng trả được, nhiều hay ít đều tùy tâm.', 'câu chốt: giá do người chơi tự định');
    assert.equal(a.troRich.fit, 'Món này hợp mạch Thân thể, Tâm cảnh. Đang có Thân thể (260), Tâm cảnh (80): lấy từ đó thì thuận nhất.');
    assert.deepEqual(a.troRich.fitAxes, [4, 2]);
    assert.match(a.troEmpty.fit, /các mạch ấy đang trống\. Lấy từ Gia đạo cũng được\./, 'mạch hợp đang trống thì gợi ý mạch khác');
    assert.equal(a.troZero.fit, 'Món này hợp mạch Thân thể, Tâm cảnh.');
    assert.equal(a.hintRich, 'Nên lấy từ Sự nghiệp 150, Tài lộc 300, Nhân duyên 45.');
    assert.match(a.hintEmpty, /^Mạch hợp \(Thân thể, Tâm cảnh\) đang trống/);
    assert.equal(a.hintZero, 'Chưa có tu vi để quy đổi.');
    await context.close();
  }

  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const minBtn = touch ? 40 : 32;

    // C. Khung Tàng Bảo Các trên trang: tranh quầy hàng có bà chủ, sáu thẻ, nút đủ lớn, không tràn ngang; nút "Ghé Tàng Bảo Các" ở ví điểm.
    {
      const { context, page } = await h.open(width, { touch, workspace: rich() });
      await h.show(page, 'growth');
      await openGrowthTab(page, 'all');
      assert.equal(await page.locator('#gr-store').count(), 1, 'có đúng một khung Tàng Bảo Các' + at);
      assert.match(await text(page.locator('#gr-store-title')), /^Tàng Bảo Các kho vật phẩm$/);
      assert.match(await text(page.locator('.gr-store > .help-copy')), /Tiệm không niêm yết giá.*có bao nhiêu điểm cũng đổi được/, 'lời dẫn nói rõ không có giá định sẵn' + at);
      const scene = page.locator('.gr-store .gr-st-scene');
      assert.equal(await scene.getAttribute('role'), 'img');
      assert.match(await scene.getAttribute('aria-label'), /Tàng Bảo Các: quầy hàng/);
      assert.equal(await page.locator('.gr-st-scene .gr-st-owner').count(), 1, 'tranh có bà chủ' + at);
      const sb = await scene.boundingBox();
      assert.ok(sb.width >= (touch ? 300 : 420), 'tranh đủ lớn' + at);
      assert.ok(Math.abs(sb.width / sb.height - 420 / 260) < 0.05, 'tranh giữ tỷ lệ 420:260' + at);
      assert.equal(await page.locator('.gr-store-talk .gr-store-face svg.gr-st-face').count(), 1, 'chân dung bà chủ cạnh lời tư vấn' + at);
      assert.equal(await page.locator('.gr-store-say').getAttribute('role'), 'status');
      assert.match(await text(page.locator('.gr-store-say')), /Tu vi các hạ đang có 1\.460 điểm; dồi dào nhất là Trí tuệ \(410\), kế đó Tài lộc \(300\)\..*Giá do các hạ tự định/, 'lời chào theo điểm hiện có' + at);
      assert.equal(await page.locator('.gr-store-bars li').count(), 8, 'tám thanh điểm' + at);
      assert.equal(await page.locator('.gr-store-item').count(), 7, 'bảy món' + at);
      for (const id of ['tro', 'son', 'kip', 'ruong', 'nhan', 'ai', 'usb']) {
        const it = item(page, id);
        assert.equal(await it.locator('.gr-store-pic svg.gr-st-pic').count(), 1, 'hình món ' + id + at);
        assert.equal(await it.locator('.gr-store-pay i').count(), 8, 'món ' + id + ' trả được bằng cả tám mạch' + at);
        assert.match(await it.locator('.gr-store-pay').getAttribute('aria-label'), /Trả được bằng cả tám mạch: Đạo tâm, .*Gia đạo/);
        for (const sel of ['[data-gr-shop-ask]', '[data-gr-shop-buy]']) {
          const b = await it.locator(sel).boundingBox();
          assert.ok(b.height >= minBtn && b.width >= (touch ? 80 : 60), 'nút ' + sel + ' của ' + id + ' đủ lớn' + at);
        }
      }
      assert.match(await text(item(page, 'nhan')), /Thiên Lý Nhãn.*Mắt thần truyền thông.*Camera/, 'camera đặt tên Thiên Lý Nhãn' + at);
      assert.match(await text(item(page, 'ai')), /Gemini Pro.*ChatGPT Plus.*Claude Pro/, 'ba loại AI' + at);
      const lefts = await page.evaluate(() => [...new Set([...document.querySelectorAll('.gr-store-item')].map((n) => Math.round(n.getBoundingClientRect().left)))]);
      if (width === 390) assert.equal(lefts.length, 1, 'điện thoại: một cột' + at);
      if (width === 1440) assert.equal(lefts.length, 2, 'màn rộng: hai cột' + at);
      assert.equal(await page.evaluate(() => { const p = document.querySelector('#gr-store'); return p.scrollWidth <= p.clientWidth + 1; }), true, 'khung không tràn ngang' + at);
      assert.equal(await noOverflow(page), true, 'trang không tràn ngang' + at);
      assert.ok((await page.locator('[data-gr-store-go]').boundingBox()).height >= minBtn, 'nút Ghé Tàng Bảo Các đủ lớn' + at);
      await page.click('[data-gr-store-go]');
      await until(() => page.evaluate(() => document.activeElement?.id === 'gr-store-title' && Math.abs(document.querySelector('#gr-store').getBoundingClientRect().top) < 200), 'nút Ghé Tàng Bảo Các cuộn tới khung và đưa con trỏ vào tiêu đề' + at);
      await context.close();
    }

    // D. Hỏi bà chủ: lời tư vấn đổi theo món, đánh dấu thẻ và các mạch hợp; con trỏ không bị mất khỏi nút.
    {
      const { context, page } = await h.open(width, { touch, workspace: rich() });
      await h.show(page, 'growth');
      await openGrowthTab(page, 'all');
      await openAsk(page, 'tro');
      await closeAsk(page);
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.grShopAsk), 'tro', 'đóng hộp thì con trỏ về nút Hỏi bà chủ' + at);
      assert.match(await text(page.locator('.gr-store-say')), /Nhà trọ lo chỗ nằm yên cho thân và chỗ nghỉ cho tâm.*Món này hợp mạch Thân thể, Tâm cảnh\. Đang có Thân thể \(260\), Tâm cảnh \(80\): lấy từ đó thì thuận nhất\./, 'tư vấn Nhà trọ' + at);
      assert.equal(await page.locator('.gr-store-item.is-asked').count(), 1);
      assert.equal(await item(page, 'tro').evaluate((n) => n.classList.contains('is-asked')), true, 'thẻ được hỏi được đánh dấu' + at);
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.gr-store-bars li.is-fit span')].map((n) => n.textContent)), ['Tâm cảnh', 'Thân thể'], 'đánh dấu hai mạch hợp' + at);
      await settle(page);
      const [bd1, bd2] = await page.evaluate(() => ['tro', 'son'].map((id) => getComputedStyle(document.querySelector('.gr-store-item[data-item="' + id + '"]')).borderTopColor));
      assert.notEqual(bd1, bd2, 'thẻ được hỏi có viền khác' + at);
      await openAsk(page, 'ai');
      await closeAsk(page);
      assert.match(await text(page.locator('.gr-store-say')), /Quân sư AI bày mưu, tướng lĩnh AI xông pha.*hợp mạch Trí tuệ, Sự nghiệp/, 'tư vấn Quân sư AI' + at);
      assert.equal(await page.locator('.gr-store-item.is-asked').count(), 1, 'chỉ một thẻ được đánh dấu' + at);
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.gr-store-bars li.is-fit span')].map((n) => n.textContent)), ['Trí tuệ', 'Sự nghiệp']);
      await openAsk(page, 'ruong');
      await closeAsk(page);
      assert.match(await text(page.locator('.gr-store-say')), /Bí kíp tinh thần nuôi trí.*Đổi sỉ thì lấy cả rương trăm quyển/, 'Rương bí kíp: lời của loại tinh thần + đổi sỉ' + at);
      assert.equal(await noOverflow(page), true, 'hỏi bà chủ không làm tràn ngang' + at);
      await context.close();
    }

    // E. Các loại trong món: bí kíp tinh thần / vật chất, rương sỉ, ba quân sư AI. Đổi loại thì tên điền sẵn đổi theo; bàn phím chọn được.
    {
      const { context, page } = await h.open(width, { touch, workspace: rich() });
      await h.show(page, 'growth');
      await openGrowthTab(page, 'all');
      const checked = (id) => page.evaluate((i) => document.querySelector('.gr-store-item[data-item="' + i + '"] input:checked')?.value, id);
      assert.deepEqual([await checked('kip'), await checked('ruong'), await checked('ai')], ['tt', 'tt', 'gemini'], 'loại mặc định' + at);
      assert.equal(await text(item(page, 'kip').locator('.gr-store-hint')), 'Nên lấy từ Trí tuệ 410, Đạo tâm 120.', 'bí kíp tinh thần hợp Trí tuệ, Đạo tâm' + at);
      await item(page, 'kip').locator('.gr-store-chip', { hasText: 'Vật chất' }).click();
      assert.equal(await checked('kip'), 'vc');
      assert.equal(await checked('ruong'), 'tt', 'đổi loại ở món này không đổi món kia' + at);
      assert.equal(await text(item(page, 'kip').locator('.gr-store-hint')), 'Nên lấy từ Trí tuệ 410, Tài lộc 300.', 'bí kíp vật chất hợp Trí tuệ, Tài lộc' + at);
      assert.equal(await page.evaluate(() => document.activeElement?.matches('.gr-store-item[data-item="kip"] input:checked')), true, 'con trỏ ở lựa chọn mới' + at);
      const names = {};
      for (const [id, label, pickId] of [['kip', 'Vật chất', 'vc'], ['ruong', 'Vật chất', 'vc'], ['ai', 'ChatGPT Plus', 'chatgpt']]) {
        if (id !== 'kip') await item(page, id).locator('.gr-store-chip', { hasText: label }).click();
        assert.equal(await checked(id), pickId);
        await openBuy(page, id);
        names[id] = await page.locator('.gr-spend-dlg input[name="n"]').inputValue();
        await closeDialog(page);
      }
      assert.deepEqual(names, { kip: 'Bí kíp tu luyện · vật chất (1 quyển)', ruong: 'Rương bí kíp · vật chất (100 quyển)', ai: 'Quân sư AI · ChatGPT Plus' }, 'tên điền sẵn theo loại đã chọn' + at);
      await item(page, 'ai').locator('.gr-store-chip', { hasText: 'Claude Pro' }).click();
      await openBuy(page, 'ai');
      assert.equal(await page.locator('.gr-spend-dlg input[name="n"]').inputValue(), 'Quân sư AI · Claude Pro');
      await closeDialog(page);
      await item(page, 'ai').locator('.gr-store-chip', { hasText: 'Gemini Pro' }).click();
      await openBuy(page, 'ai');
      assert.equal(await page.locator('.gr-spend-dlg input[name="n"]').inputValue(), 'Quân sư AI · Gemini Pro');
      await closeDialog(page);
      // Bàn phím: mũi tên đổi loại trong nhóm radio, con trỏ ở lại lựa chọn mới.
      await page.locator('.gr-store-item[data-item="ai"] input:checked').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await checked('ai'), 'chatgpt', 'mũi tên phải chọn loại kế' + at);
      assert.equal(await page.evaluate(() => document.activeElement?.value), 'chatgpt', 'con trỏ theo lựa chọn' + at);
      assert.equal(await page.locator('.gr-store-pick legend').first().innerText(), 'Chọn loại');
      assert.equal(await item(page, 'ai').locator('.gr-store-pick legend').innerText(), 'Chọn quân sư');
      await context.close();
    }

    // F. Bấm Quy đổi: bảng nhập tay đủ tám mạch, tên món điền sẵn, lời bà chủ, mạch hợp đánh dấu; mọi ô tự do (không giá định sẵn).
    {
      const { context, page, server } = await h.open(width, { touch, workspace: rich() });
      await h.show(page, 'growth');
      await openGrowthTab(page, 'all');
      assert.equal(await page.locator('[data-gr-spend]').count(), 1, 'nút Sử dụng điểm cũ vẫn còn' + at);
      await openBuy(page, 'tro');
      assert.equal(await page.locator('.gr-spend-dlg header .eyebrow').innerText(), 'TÀNG BẢO CÁC');
      assert.equal(await page.locator('#gr-spend-title').innerText(), 'Bảng quy đổi · Nhà trọ');
      assert.match(await text(page.locator('.gr-spend-dlg header .help-copy')), /Không có giá định sẵn.*ít hay nhiều đều được, mạch nào cũng trả được/);
      assert.match(await text(page.locator('.gr-store-strip')), /^Liễu Linh Lung Nhà trọ lo chỗ nằm yên.*Món này hợp mạch Thân thể, Tâm cảnh\..*Giá do các hạ tự định/, 'lời bà chủ trong bảng quy đổi' + at);
      assert.equal(await page.locator('.gr-store-strip svg.gr-st-face').count(), 1);
      assert.equal(await page.locator('.gr-spend-dlg input[name="n"]').inputValue(), 'Nhà trọ', 'tên điền sẵn' + at);
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'gr-spend-title', 'con trỏ ở tiêu đề: không bật bàn phím, không cuộn mất lời bà chủ' + at);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.name), 'n', 'Tab đi tới ô tên' + at);
      assert.equal(await page.locator('.gr-spend-row').count(), 8, 'đủ tám mạch để trừ' + at);
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.gr-spend-row.is-fit .gr-axis-head strong')].map((n) => n.textContent)), ['Tâm cảnh', 'Thân thể'], 'hai mạch hợp được đánh dấu' + at);
      assert.equal(await page.locator('.gr-fit-tag').first().innerText(), 'hợp món này');
      const state = await page.evaluate(() => [...document.querySelectorAll('[data-gr-spend-axis]')].map((n) => ({ v: n.value, max: n.max, dis: n.disabled, ro: n.readOnly })));
      assert.deepEqual(state.map((s) => s.v), ['', '', '', '', '', '', '', ''], 'không điền sẵn số điểm nào' + at);
      assert.deepEqual(state.map((s) => s.max), ['120', '300', '80', '45', '260', '410', '150', '95'], 'mỗi mạch trừ được tối đa bằng số dư' + at);
      assert.ok(state.every((s) => !s.dis && !s.ro), 'cả tám ô đều nhập tay được' + at);
      assert.match(await page.locator('[data-gr-spend-axis="0"]').getAttribute('aria-label'), /^Điểm trừ ở Đạo tâm, đang có 120$/);
      const box = await page.locator('#growth-spend').boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 0.5 && box.y >= 0, 'bảng nằm trong màn hình' + at);
      assert.equal(await noOverflow(page), true, 'mở bảng không tràn ngang' + at);
      assert.equal(await page.evaluate(() => document.querySelector('.gr-spend-dlg').scrollWidth <= document.querySelector('.gr-spend-dlg').clientWidth + 1), true, 'trong bảng không tràn ngang' + at);
      assert.equal(await page.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map((n) => n.id); return ids.length === new Set(ids).size; }), true, 'không trùng id khi bảng mở' + at);
      await page.keyboard.press('Escape');
      await page.waitForSelector('#growth-spend', { state: 'detached' });
      assert.equal(savedSpend(server).length, 0, 'đóng bảng bằng Esc thì không ghi gì' + at);
      await context.close();
    }

    // G. Tự quy đổi bằng tay: trả một món bằng cả tám mạch, mỗi mạch một số tùy ý; ghi vào sổ, trừ biểu đồ, thẻ hiện số lần đã đổi.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: rich() });
      await h.show(page, 'growth');
      await openGrowthTab(page, 'all');
      assert.deepEqual(await radarValues(page), ['120', '300', '80', '45', '260', '410', '150', '95'], 'điểm ban đầu' + at);
      await openBuy(page, 'son');
      for (let i = 0; i < 8; i++) await axis(page, i).fill(String(i + 1));
      assert.match(await text(page.locator('.gr-spend-sum')), /Quy đổi 36 điểm.*sau khi trừ: 1\.424/, 'dòng tổng kết' + at);
      await page.click('.gr-spend-dlg [type=submit]');
      await page.waitForSelector('#growth-spend', { state: 'detached' });
      assert.equal(await toast(page), 'Chưởng quỹ Liễu Linh Lung nhận 36 điểm, giao “Sơn trang”. Tu vi hiện có: 1.424.', 'thông báo của chưởng quỹ' + at);
      assert.deepEqual(await radarValues(page), ['119', '298', '77', '41', '255', '404', '143', '87'], 'cả tám mạch đều bị trừ đúng số đã nhập' + at);
      await until(() => savedSpend(server).length === 1, 'lưu sổ quy đổi' + at);
      const e = savedSpend(server)[0];
      assert.deepEqual(e.p, [2, 4, 6, 8, 10, 12, 14, 16], 'lưu theo nửa điểm, đúng số người chơi nhập' + at);
      assert.equal(e.n, 'Sơn trang');
      assert.equal(e.d, day(0));
      assert.equal(e.x, undefined);
      assert.equal(e.note, undefined, 'không ghi chú thì không có khóa note' + at);
      assert.deepEqual(Object.keys(server.workspace.growth).sort(), ['hero', 'log', 'name', 'since', 'spend', 'v'], 'không thêm khóa mới vào dữ liệu tu vi' + at);
      assert.equal(server.workspace.growth.log.length, 1, 'sổ cộng điểm giữ nguyên' + at);
      assert.equal(await text(item(page, 'son').locator('.gr-store-used')), 'Đã đổi 1 lần · 36 điểm', 'thẻ hiện số lần đã đổi' + at);
      assert.equal(await item(page, 'tro').locator('.gr-store-used').count(), 0, 'món chưa đổi thì không có dòng đã đổi' + at);
      assert.match(await text(page.locator('.gr-store-say')), /Tu vi các hạ đang có 1\.424 điểm; dồi dào nhất là Trí tuệ \(404\), kế đó Tài lộc \(298\)\./, 'lời chào cập nhật theo điểm còn lại' + at);
      assert.match(await text(item(page, 'son').locator('.gr-store-hint')), /^Nên lấy từ Tâm cảnh 77, Gia đạo 87, Nhân duyên 41\.$/, 'gợi ý cập nhật theo điểm còn lại' + at);
      assert.match(await text(page.locator('.gr-spend')), /Sơn trang/, 'dòng nằm trong sổ quy đổi chung' + at);
      // Đổi tiếp một món khác, tự sửa tên và ghi chú theo ý mình.
      await openBuy(page, 'tro');
      await page.fill('.gr-spend-dlg input[name="n"]', 'Nhà trọ Hải Âu · hai đêm');
      await page.fill('.gr-spend-dlg textarea[name="note"]', 'Nghỉ chân giữa chặng');
      await axis(page, 4).fill('2.5');
      await page.click('.gr-spend-dlg [type=submit]');
      await page.waitForSelector('#growth-spend', { state: 'detached' });
      await until(() => savedSpend(server).length === 2, 'lưu lần quy đổi thứ hai' + at);
      assert.equal(savedSpend(server)[1].n, 'Nhà trọ Hải Âu · hai đêm', 'tên do người chơi sửa được giữ nguyên' + at);
      assert.deepEqual(savedSpend(server)[1].p, [0, 0, 0, 0, 5, 0, 0, 0]);
      assert.equal(savedSpend(server)[1].note, 'Nghỉ chân giữa chặng');
      assert.equal(await text(item(page, 'tro').locator('.gr-store-used')), 'Đã đổi 1 lần · 2,5 điểm', 'tên bắt đầu bằng tên món vẫn tính vào món' + at);
      assert.equal(await noOverflow(page), true, 'sau khi quy đổi không tràn ngang' + at);
      await context.close();
    }

    // H. Ít điểm vẫn đổi được; hết điểm thì báo rõ, không trừ âm; không đổi quá số dư của từng mạch.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: withGrowth(THIN)() });
      await h.show(page, 'growth');
      await openGrowthTab(page, 'all');
      assert.match(await text(page.locator('.gr-store-say')), /Tu vi các hạ còn mỏng, mới 0,5 điểm\. Mỏng cũng không sao: đổi ít vẫn được/, 'ít điểm: lời bà chủ' + at);
      assert.equal(await text(item(page, 'tro').locator('.gr-store-hint')), 'Mạch hợp (Thân thể, Tâm cảnh) đang trống; lấy từ mạch khác cũng được.', 'mạch hợp trống thì gợi ý' + at);
      assert.equal(await page.locator('[data-gr-shop-buy="tro"]').isDisabled(), false, 'nút Quy đổi không bị khóa khi điểm ít' + at);
      await openBuy(page, 'tro');
      assert.equal(await axis(page, 0).getAttribute('max'), '0.5');
      assert.equal(await axis(page, 1).getAttribute('max'), '0', 'mạch hết điểm không trừ được' + at);
      await axis(page, 0).fill('1');
      await page.click('.gr-spend-dlg [type=submit]');
      assert.match(await page.locator('.gr-spend-msg').innerText(), /Đạo tâm chỉ còn 0,5 điểm, chưa đủ để trừ 1\./, 'không trừ quá số dư' + at);
      assert.equal(savedSpend(server).length, 0);
      await axis(page, 0).fill('0.5');
      await page.click('.gr-spend-dlg [type=submit]');
      await page.waitForSelector('#growth-spend', { state: 'detached' });
      assert.equal(await toast(page), 'Chưởng quỹ Liễu Linh Lung nhận 0,5 điểm, giao “Nhà trọ”. Tu vi hiện có: 0.', 'đổi 0,5 điểm được' + at);
      await until(() => savedSpend(server).length === 1, 'lưu lần đổi 0,5 điểm' + at);
      assert.deepEqual(savedSpend(server)[0].p, [1, 0, 0, 0, 0, 0, 0, 0]);
      assert.match(await text(page.locator('.gr-store-say')), /Các hạ chưa có tu vi để quy đổi/, 'hết điểm: bà chủ mời quay lại' + at);
      assert.equal(await text(item(page, 'son').locator('.gr-store-hint')), 'Chưa có tu vi để quy đổi.');
      await page.click('[data-gr-shop-buy="son"]');
      assert.match(await toast(page), /Chưa có điểm để quy đổi/, 'hết điểm: báo rõ' + at);
      assert.equal(await page.locator('#growth-spend').count(), 0, 'hết điểm: không mở bảng' + at);
      assert.equal(await noOverflow(page), true);
      await context.close();
    }

    // I. Nhiều điểm: trừ số lớn tùy ý ở nhiều mạch, kể cả hết sạch một mạch.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: rich() });
      await h.show(page, 'growth');
      await openGrowthTab(page, 'all');
      await openBuy(page, 'nhan');
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.gr-spend-row.is-fit .gr-axis-head strong')].map((n) => n.textContent)), ['Tài lộc', 'Nhân duyên', 'Sự nghiệp'], 'Thiên Lý Nhãn hợp Tài lộc, Nhân duyên, Sự nghiệp' + at);
      assert.equal(await page.locator('.gr-spend-dlg input[name="n"]').inputValue(), 'Thiên Lý Nhãn (camera)');
      await axis(page, 5).fill('410');
      await axis(page, 1).fill('300');
      await page.click('.gr-spend-dlg [type=submit]');
      await page.waitForSelector('#growth-spend', { state: 'detached' });
      await until(() => savedSpend(server).length === 1, 'lưu lần đổi lớn' + at);
      assert.deepEqual(savedSpend(server)[0].p, [0, 600, 0, 0, 0, 820, 0, 0]);
      assert.deepEqual(await radarValues(page), ['120', '0', '80', '45', '260', '0', '150', '95'], 'hết sạch hai mạch được' + at);
      assert.equal(await text(item(page, 'nhan').locator('.gr-store-used')), 'Đã đổi 1 lần · 710 điểm');
      await context.close();
    }

    // J. Số lần đã đổi chỉ tính các lần chưa hủy, tên bắt đầu bằng tên món; hủy một lần thì thẻ cập nhật.
    {
      const spend = [
        { id: 's1', d: day(-3), n: 'Nhà trọ', p: [0, 0, 0, 0, 6, 0, 0, 0] },
        { id: 's2', d: day(-2), n: 'nhà trọ Hải Âu', p: [2, 0, 0, 0, 0, 0, 0, 0] },
        { id: 's3', d: day(-2), n: 'Nhà trọ', p: [0, 0, 0, 0, 40, 0, 0, 0], x: true },
        { id: 's4', d: day(-1), n: 'Quà sinh nhật', p: [0, 0, 0, 0, 0, 0, 0, 10] },
      ];
      const { context, page, server } = await h.open(width, { touch, workspace: withGrowth(RICH, spend)() });
      await h.show(page, 'growth');
      await openGrowthTab(page, 'all');
      assert.equal(await text(item(page, 'tro').locator('.gr-store-used')), 'Đã đổi 2 lần · 4 điểm', 'không tính lần đã hủy và món khác' + at);
      assert.equal(await item(page, 'son').locator('.gr-store-used').count(), 0);
      await page.click('[data-gr-spend-void="s1"]');
      await until(() => server.workspace.growth.spend.find((x) => x.id === 's1')?.x === true, 'hủy một lần quy đổi' + at);
      assert.equal(await text(item(page, 'tro').locator('.gr-store-used')), 'Đã đổi 1 lần · 1 điểm', 'hủy xong thẻ cập nhật' + at);
      await context.close();
    }

    // K. Bản chỉ xem: mọi nút bị chặn như phần còn lại của ứng dụng; hàm Quy đổi còn tự từ chối lần nữa và không ghi gì.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: rich() });
      await h.show(page, 'growth');
      await openGrowthTab(page, 'all');
      await page.evaluate(() => {
        contentReadOnly = true;
      });
      await page.click('[data-gr-shop-buy="tro"]');
      assert.equal(await page.locator('#growth-spend').count(), 0, 'bản chỉ xem: bấm Quy đổi không mở bảng' + at);
      await page.evaluate(() => zenStore.buy('tro'));
      assert.match(await toast(page), /chỉ có quyền xem/, 'bản chỉ xem không quy đổi được' + at);
      assert.equal(await page.locator('#growth-spend').count(), 0);
      assert.equal(savedSpend(server).length, 0);
      await context.close();
    }
  }

  // L. Hình trình bày: giảm chuyển động, màu cố định khi ép màu, không có SMIL.
  {
    const moving = (page) => page.evaluate(() => [...document.querySelectorAll('.gr-store *')].filter((el) => getComputedStyle(el).animationName !== 'none').length);
    const calm = await h.open(390, { touch: true, reducedMotion: 'reduce', workspace: rich() });
    await h.show(calm.page, 'growth');
    await openGrowthTab(calm.page, 'all');
    assert.equal(await moving(calm.page), 0, 'giảm chuyển động: tranh đứng yên');
    assert.equal(await calm.page.locator('.gr-st-scene animate, .gr-st-scene animateTransform, .gr-st-scene animateMotion, .gr-st-scene set').count(), 0, 'không dùng SMIL');
    await calm.context.close();
    const live = await h.open(1440, { workspace: rich() });
    await h.show(live.page, 'growth');
    await openGrowthTab(live.page, 'all');
    assert.ok((await moving(live.page)) >= 4, 'bình thường: đèn lồng, hơi trà, quạt, mắt chớp có chuyển động nhẹ');
    await live.context.close();
    const forced = await h.open(1440, { forcedColors: 'active', workspace: rich() });
    await h.show(forced.page, 'growth');
    await openGrowthTab(forced.page, 'all');
    assert.equal(await forced.page.evaluate(() => getComputedStyle(document.querySelector('.gr-st-scene')).forcedColorAdjust), 'none', 'ép màu: tranh giữ màu riêng');
    assert.equal(await forced.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await forced.context.close();
  }

  // M. Sáng/tối, hai kiểu giao diện, tương phản cao: chữ đủ tương phản, không tràn ngang, hộp thoại gọn.
  for (const [width, style, opts] of [
    [390, 'zen', {}],
    [820, 'zen', { colorScheme: 'dark' }],
    [1440, 'giangho', {}],
    [1440, 'giangho', { colorScheme: 'dark' }],
    [1440, 'zen', { contrast: 'more' }],
  ]) {
    const at = ' (' + width + 'px ' + style + ' ' + (opts.colorScheme || opts.contrast || 'sáng') + ')';
    const { context, page } = await h.open(width, { touch: width < 700, workspace: rich(), setup: setStyle(style), ...opts });
    await h.show(page, 'growth');
    await openGrowthTab(page, 'all');
    await openAsk(page, 'tro');
    await closeAsk(page);
    await settle(page);
    const sels = ['.gr-store-blurb', '.gr-store-hint', '.gr-store-say p', '.gr-store-close', '.gr-store-bars li span', '.gr-store-bars li em', '.gr-store-tag', '.gr-store-owner small', '.gr-store-name h3', '.gr-store-item .btn:not(.primary)', '.gr-store-chip:has(input:not(:checked)) span', '.gr-store-chip:has(input:checked) span'];
    for (const s of sels) {
      const c = await contrast(page, s);
      assert.ok(c !== null, 'có phần tử ' + s + at);
      assert.ok(c >= 4.5, 'chữ ' + s + ' đủ tương phản (' + c.toFixed(2) + ')' + at);
    }
    assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
    await openBuy(page, 'tro');
    await settle(page);
    for (const s of ['.gr-store-strip p', '.gr-store-strip strong', '.gr-fit-tag', '.gr-spend-dlg .help-copy']) {
      const c = await contrast(page, s);
      assert.ok(c !== null && c >= 4.5, 'chữ trong bảng ' + s + ' đủ tương phản (' + (c && c.toFixed(2)) + ')' + at);
    }
    assert.equal(await noOverflow(page), true, 'mở bảng không tràn ngang' + at);
    await context.close();
  }
} finally {
  await h.close();
}
console.log('growth store browser ok');
