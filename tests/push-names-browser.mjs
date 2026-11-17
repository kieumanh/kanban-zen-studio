// v2.49.0 (Thông Báo Có Tên): công tắc “Hiện tên việc trong thông báo trình duyệt” ở Cài đặt → Thông báo, riêng từng thiết bị.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px, cả Thiền lẫn Giang hồ:
//  1. Có công tắc trong nhóm Thông báo (cạnh hai nút thông báo trình duyệt), mặc định BẬT, nằm gọn trong hộp thoại, không tràn ngang, đủ lớn để chạm.
//  2. Tắt → localStorage ghi '0' và bộ nhớ đệm 'zen-pref' của service worker ghi 'off'; bật lại → '1' và 'on'; mở lại Cài đặt vẫn đúng trạng thái.
//  3. Không thêm khối chữ mới vào nhóm (Giang hồ vẫn đúng ba khối truyền thư); lời giải thích đổi giọng Giang hồ, không còn chữ Thiền.
//  4. Tải lại trang: trạng thái tắt được chép lại vào bộ nhớ đệm (kể cả khi bộ nhớ đệm bị xóa), service worker luôn đọc đúng.
import assert from 'node:assert/strict';
import { startHarness, defaultSeed } from './lib/browser-harness.mjs';

const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const cacheValue = (page) =>
  page.evaluate(async () => {
    const c = await caches.open('zen-pref'),
      r = await c.match('/__zen-push-names');
    return r ? (await r.text()).trim() : null;
  });
async function until(fn, label) {
  for (let i = 0; i < 60; i++) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.fail('quá thời gian chờ: ' + label);
}
async function openSettings(page) {
  await page.evaluate(() => accountPanel());
  await page.waitForSelector('dialog[open] #nf-push-names', { state: 'attached', timeout: 8000 });
  await page.evaluate(() => document.querySelectorAll('#editor-body details').forEach((d) => (d.open = true)));
}

const h = await startHarness({ seed: defaultSeed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const [name, setup] of [
      ['Thiền', null],
      ['Giang hồ', GH],
    ]) {
      const at = ' (' + width + 'px, ' + name + ')';
      const { context, page } = await h.open(width, { touch, workspace: defaultSeed(), setup });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'dashboard');
      await openSettings(page);

      // 1. Có công tắc, mặc định bật, đủ lớn, nằm gọn.
      const box = await page.evaluate(() => {
        const input = document.querySelector('#nf-push-names'),
          label = input.closest('label'),
          dialog = document.querySelector('dialog[open]'),
          r = label.getBoundingClientRect();
        return { checked: input.checked, height: r.height, fits: r.left >= dialog.getBoundingClientRect().left - 1 && r.right <= dialog.getBoundingClientRect().right + 1, text: label.textContent.replace(/\s+/g, ' ').trim(), inGroup: !!input.closest('details.wf-settings-group[data-group=notify]'), scrollOk: dialog.scrollWidth <= dialog.clientWidth + 1 };
      });
      assert.equal(box.checked, true, 'mặc định bật' + at);
      assert.ok(box.inGroup, 'nằm trong nhóm Thông báo' + at);
      assert.ok(box.height >= 40 && box.fits && box.scrollOk, 'đủ lớn, nằm gọn, không tràn ngang: ' + JSON.stringify(box) + at);
      // 3. Giọng chữ.
      if (name === 'Thiền') assert.match(box.text, /^Hiện tên việc trong thông báo trình duyệt/, 'chữ Thiền' + at);
      else {
        assert.doesNotMatch(box.text, /\bviệc\b|thông báo/i, 'không còn chữ Thiền: ' + box.text + at);
        assert.match(box.text, /nhiệm vụ/, 'chữ giang hồ: ' + box.text + at);
      }
      if (name === 'Giang hồ') assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.nf-block > h4')].map((e) => e.textContent.trim())), ['Nhiệm vụ', 'Nhật khóa', 'Tu vi'], 'không thêm khối chữ mới' + at);

      // 2. Tắt / bật.
      await until(async () => (await cacheValue(page)) === 'on', 'bộ nhớ đệm ghi on lúc khởi động' + at);
      await page.locator('#nf-push-names').click({ force: false });
      assert.equal(await page.evaluate(() => localStorage.getItem('zen-push-names')), '0', 'tắt → localStorage 0' + at);
      await until(async () => (await cacheValue(page)) === 'off', 'bộ nhớ đệm ghi off' + at);
      const said = await page.locator('#nf-push-names-status').innerText();
      assert.ok(said.length > 5, 'có dòng báo trạng thái' + at);
      if (name === 'Giang hồ') assert.match(said, /^Truyền thư chỉ nêu chung, không lộ tên nhiệm vụ\.$/, 'dòng báo đổi giọng Giang hồ: ' + said + at);
      else assert.match(said, /^Thông báo chỉ nêu chung, không hiện tên việc\.$/, 'dòng báo giọng Thiền: ' + said + at);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await openSettings(page);
      assert.equal(await page.locator('#nf-push-names').isChecked(), false, 'mở lại vẫn tắt' + at);
      // 4. Bộ nhớ đệm bị xóa rồi tải lại trang: được chép lại.
      await page.evaluate(() => caches.delete('zen-pref'));
      assert.equal(await cacheValue(page), null);
      await page.reload();
      await h.show(page, 'dashboard');
      await until(async () => (await cacheValue(page)) === 'off', 'chép lại off sau khi tải lại' + at);
      await openSettings(page);
      assert.equal(await page.locator('#nf-push-names').isChecked(), false, 'sau tải lại vẫn tắt' + at);
      await page.locator('#nf-push-names').click();
      assert.equal(await page.evaluate(() => localStorage.getItem('zen-push-names')), '1', 'bật → localStorage 1' + at);
      await until(async () => (await cacheValue(page)) === 'on', 'bộ nhớ đệm ghi on' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at + ': ' + errors);
      await context.close();
    }
  }
  console.log('PASS: công tắc tên việc trong thông báo trình duyệt — mặc định bật, tắt/bật ghi cả localStorage và bộ nhớ đệm của service worker, giữ sau khi mở lại/tải lại, gọn ở 390, 820, 1440px (Thiền và Giang hồ)');
} finally {
  await h.close();
}
