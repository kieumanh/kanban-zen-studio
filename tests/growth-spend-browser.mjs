// v1.81.0: "Sử dụng điểm" trong Điểm tích lũy. Form ghi vật phẩm đã mua / quy đổi + số điểm trừ ở từng chỉ số; điểm bị trừ khỏi biểu đồ chính,
// thanh chỉ số và ví điểm; không cho vượt số dư; cảnh giới theo điểm đã tích lũy nên không tụt. Sửa lại, hủy (hoàn điểm), khôi phục, xóa hẳn dòng đã hủy.
// Kiểm tra ở 390 (chạm), 820, 1440 px: không tràn ngang, form nằm gọn trong màn hình, nút và ô nhập đủ vùng chạm.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
// Đã tích lũy (nửa điểm → điểm): Nghiệp quả 10 · Tài lộc 6 · Tâm cảnh 4 · Sự nghiệp 8 · An vui 2 = 30 điểm (cảnh giới Trúc cơ).
const GROWTH = {
  v: 1,
  hero: 'nam',
  since: day(-40),
  log: [
    { id: 'e1', d: day(-3), s: 'task', k: 'task:e1', n: 'Việc một', p: [20, 0, 0, 0, 0, 0, 0, 0] },
    { id: 'e2', d: day(-2), s: 'task', k: 'task:e2', n: 'Việc hai', p: [0, 12, 8, 0, 0, 0, 0, 0] },
    { id: 'e3', d: day(-1), s: 'task', k: 'task:e3', n: 'Việc ba', p: [0, 0, 0, 0, 0, 0, 16, 4] },
  ],
  spend: [],
};
const withSpend = (spend, log) => () => ({ schema: 1, projects: [], notes: [], growth: { ...GROWTH, ...(log ? { log } : {}), spend } });
const seed = withSpend([]);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 60; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá thời gian chờ: ' + label);
}
const radarValues = (page) => page.evaluate(() => [...document.querySelectorAll('.gr-radar .gr-value')].map((n) => n.textContent));
const wallet = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.gr-wallet [data-wallet]')].map((n) => [n.dataset.wallet, n.querySelector('b').textContent])));
const toast = (page) => page.locator('#toast').textContent();
const axis = (page, i) => page.locator('[data-gr-spend-axis="' + i + '"]');
const axisValues = (page) => page.evaluate(() => [...document.querySelectorAll('[data-gr-spend-axis]')].map((n) => n.value));
const msg = (page) => page.locator('.gr-spend-msg').innerText();
const savedSpend = (server) => server.workspace.growth?.spend || [];

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const minBtn = touch ? 40 : 32;

    // A. Trang trước khi quy đổi: ví điểm, mục quy đổi trống, nút Sử dụng điểm đủ lớn.
    {
      const { context, page } = await h.open(width, { touch, workspace: seed() });
      await h.show(page, 'growth');
      assert.deepEqual(await wallet(page), { left: '30', earned: '30', spent: '0' }, 'ví điểm lúc đầu' + at);
      assert.equal(await page.locator('.gr-realm-name').innerText(), 'Nhị lưu cao thủ', 'đủ 30 điểm là Nhị lưu cao thủ' + at);
      assert.match(await page.locator('.gr-spend').innerText(), /Chưa có lần quy đổi nào/, 'mục quy đổi trống' + at);
      assert.ok((await page.locator('[data-gr-spend]').boundingBox()).height >= minBtn, 'nút Sử dụng điểm đủ lớn' + at);
      assert.equal(await noOverflow(page), true, 'trang không tràn ngang' + at);
      await context.close();
    }

    // B. Quy đổi mới: kiểm tra nhập sai, chia theo tỷ lệ, lưu, trừ vào biểu đồ.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: seed() });
      await h.show(page, 'growth');
      await page.click('[data-gr-spend]');
      await page.waitForSelector('#growth-spend[open]');
      assert.equal(await page.locator('.gr-spend-row').count(), 8, 'đủ 8 chỉ số để trừ' + at);
      assert.match(await page.locator('#gr-spend-title').innerText(), /Đổi bảo vật/, 'tiêu đề form' + at);
      assert.equal(await page.evaluate(() => document.activeElement?.name), 'n', 'con trỏ nằm ở ô tên vật phẩm' + at);
      assert.equal(await page.locator('.gr-spend-dlg input[name="d"]').inputValue(), await page.evaluate(() => today()), 'ngày mặc định là hôm nay' + at);

      // Nhập sai: tên rỗng, chưa có điểm, vượt số dư, bậc lẻ, ngày tương lai. Mỗi lần form vẫn mở và dữ liệu không đổi.
      await page.click('.gr-spend-dlg [type=submit]');
      assert.match(await msg(page), /vật phẩm hoặc nội dung/, 'báo thiếu tên' + at);
      await page.fill('.gr-spend-dlg input[name="n"]', 'Tai nghe mới');
      await page.click('.gr-spend-dlg [type=submit]');
      assert.match(await msg(page), /ít nhất một chỉ số/, 'báo chưa nhập điểm' + at);
      await axis(page, 0).fill('11');
      assert.equal(await page.locator('.gr-spend-row').nth(0).evaluate((n) => n.classList.contains('is-over')), true, 'ô vượt số dư được tô báo lỗi' + at);
      await page.click('.gr-spend-dlg [type=submit]');
      assert.match(await msg(page), /Nghiệp quả chỉ còn 10 điểm/, 'báo vượt số dư' + at);
      await axis(page, 0).fill('1.3');
      await page.click('.gr-spend-dlg [type=submit]');
      assert.match(await msg(page), /Nghiệp quả chưa đúng.*bậc 0,5/, 'báo bậc lẻ' + at);
      await axis(page, 0).fill('');
      await page.fill('.gr-spend-dlg input[name="d"]', day(5));
      await axis(page, 0).fill('1');
      await page.click('.gr-spend-dlg [type=submit]');
      assert.match(await msg(page), /không được ở tương lai/, 'báo ngày tương lai' + at);
      await page.fill('.gr-spend-dlg input[name="d"]', day(0));
      await axis(page, 0).fill('');
      assert.equal(await page.locator('#growth-spend[open]').count(), 1, 'form vẫn mở sau khi nhập sai' + at);
      assert.equal(savedSpend(server).length, 0, 'nhập sai thì không lưu gì' + at);

      // Chia nhanh 12 điểm theo tỷ lệ số dư (10 · 6 · 4 · 8 · 2).
      await page.fill('.gr-spend-dlg [data-gr-spend-quick]', '40');
      await page.click('[data-gr-spend-split]');
      assert.match(await msg(page), /chỉ còn 30 điểm/, 'không chia quá số dư' + at);
      await page.fill('.gr-spend-dlg [data-gr-spend-quick]', '12');
      await page.click('[data-gr-spend-split]');
      assert.deepEqual(await axisValues(page), ['4', '2.5', '1.5', '', '', '', '3', '1'], 'chia theo tỷ lệ, tổng đúng 12 điểm' + at);
      assert.match(await page.locator('.gr-spend-sum').innerText(), /Quy đổi\s*12 điểm.*sau khi trừ:\s*18/, 'dòng tổng kết' + at);
      await page.fill('.gr-spend-dlg textarea[name="note"]', 'Mua online, thưởng cho tuần làm tốt');

      // Kích thước: form nằm gọn trong màn hình, ô nhập và nút đủ lớn, không tràn ngang.
      const box = await page.locator('#growth-spend').boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 0.5, 'form nằm trong chiều ngang màn hình' + at);
      assert.equal(await noOverflow(page), true, 'mở form không tràn ngang' + at);
      assert.ok((await axis(page, 0).boundingBox()).height >= 44, 'ô nhập điểm cao ít nhất 44px' + at);
      assert.ok((await page.locator('.gr-spend-dlg [type=submit]').boundingBox()).height >= minBtn, 'nút Lưu đủ lớn' + at);
      assert.equal(await page.evaluate(() => document.querySelector('.gr-spend-dlg').scrollWidth <= document.querySelector('.gr-spend-dlg').clientWidth + 1), true, 'trong form không tràn ngang' + at);

      await page.click('.gr-spend-dlg [type=submit]');
      await page.waitForSelector('#growth-spend', { state: 'detached' });
      assert.match(await toast(page), /Đã quy đổi 12 điểm cho “Tai nghe mới”.*Tu vi hiện có: 18/, 'thông báo sau khi quy đổi' + at);
      assert.deepEqual(await radarValues(page), ['6', '3,5', '2,5', '0', '0', '0', '5', '1'], 'biểu đồ chính bị trừ đúng từng chỉ số' + at);
      assert.deepEqual(await wallet(page), { left: '18', earned: '30', spent: '12' }, 'ví điểm sau khi quy đổi' + at);
      assert.equal(await page.locator('.gr-realm-name').innerText(), 'Nhị lưu cao thủ', 'cảnh giới không tụt khi quy đổi' + at);
      const axisScores = await page.evaluate(() => [...document.querySelectorAll('.gr-axis-head b')].map((n) => n.textContent));
      assert.deepEqual(axisScores, ['6', '3,5', '2,5', '0', '0', '0', '5', '1'], 'thanh điểm từng chỉ số bị trừ' + at);
      const item = page.locator('.gr-spend-item');
      assert.equal(await item.count(), 1, 'có một dòng quy đổi' + at);
      const text = (await item.innerText()).replace(/\s+/g, ' ');
      assert.match(text, /Tai nghe mới/, 'tên vật phẩm' + at);
      assert.match(text, /trừ 12 điểm.*Mua online/, 'số điểm và ghi chú' + at);
      assert.match(text, /Tài lộc −2,5/, 'chip từng chỉ số' + at);
      await until(() => savedSpend(server).length === 1, 'lưu sổ quy đổi lên máy chủ' + at);
      const saved = savedSpend(server)[0];
      assert.deepEqual(saved.p, [8, 5, 3, 0, 0, 0, 6, 2], 'p lưu theo nửa điểm' + at);
      assert.equal(saved.n, 'Tai nghe mới');
      assert.equal(saved.note, 'Mua online, thưởng cho tuần làm tốt');
      assert.equal(saved.d, day(0));
      assert.equal(saved.x, undefined, 'chưa bị hủy');
      assert.equal(server.workspace.growth.log.length, 3, 'sổ cộng điểm giữ nguyên' + at);
      assert.equal(await noOverflow(page), true, 'trang sau khi quy đổi không tràn ngang' + at);
      await context.close();
    }

    // C. Sửa lại: dữ liệu cũ hiện sẵn, điểm của chính lần này được tính vào số dư; sửa rồi biểu đồ cập nhật; nhập sai thì không lưu.
    {
      const old = { id: 's1', d: day(-1), n: 'Tai nghe mới', note: 'Mua online', p: [8, 5, 3, 0, 0, 0, 6, 2] };
      const { context, page, server } = await h.open(width, { touch, workspace: withSpend([old])() });
      await h.show(page, 'growth');
      assert.deepEqual(await radarValues(page), ['6', '3,5', '2,5', '0', '0', '0', '5', '1'], 'dữ liệu có sẵn đã trừ điểm' + at);
      assert.ok((await page.locator('[data-gr-spend-edit]').boundingBox()).height >= minBtn, 'nút Sửa đủ lớn' + at);
      assert.ok((await page.locator('[data-gr-spend-void]').boundingBox()).height >= minBtn, 'nút Hủy quy đổi đủ lớn' + at);
      await page.click('[data-gr-spend-edit]');
      await page.waitForSelector('#growth-spend[open]');
      assert.match(await page.locator('#gr-spend-title').innerText(), /Sửa lần quy đổi/, 'tiêu đề khi sửa' + at);
      assert.equal(await page.locator('.gr-spend-dlg input[name="n"]').inputValue(), 'Tai nghe mới', 'tên có sẵn' + at);
      assert.equal(await page.locator('.gr-spend-dlg input[name="d"]').inputValue(), day(-1), 'ngày có sẵn' + at);
      assert.equal(await page.locator('.gr-spend-dlg textarea[name="note"]').inputValue(), 'Mua online', 'ghi chú có sẵn' + at);
      assert.deepEqual(await axisValues(page), ['4', '2.5', '1.5', '', '', '', '3', '1'], 'điểm đã trừ có sẵn' + at);
      assert.match(await page.locator('.gr-spend-row').nth(1).innerText(), /có 6/, 'số dư tính cả điểm của chính lần này' + at);
      await axis(page, 1).fill('7');
      await page.click('.gr-spend-dlg [type=submit]');
      assert.match(await msg(page), /Tài lộc chỉ còn 6 điểm/, 'sửa vượt số dư bị chặn' + at);
      await page.click('[data-gr-spend-close]');
      await page.waitForSelector('#growth-spend', { state: 'detached' });
      assert.deepEqual(savedSpend(server), [old], 'đóng form thì không đổi gì' + at);

      await page.click('[data-gr-spend-edit]');
      await page.waitForSelector('#growth-spend[open]');
      await page.fill('.gr-spend-dlg input[name="n"]', 'Tai nghe không dây');
      await page.fill('.gr-spend-dlg textarea[name="note"]', '');
      await axis(page, 0).fill('2');
      await page.click('.gr-spend-dlg [type=submit]');
      await page.waitForSelector('#growth-spend', { state: 'detached' });
      assert.match(await toast(page), /Đã cập nhật lần quy đổi “Tai nghe không dây”/, 'thông báo sau khi sửa' + at);
      assert.deepEqual(await radarValues(page), ['8', '3,5', '2,5', '0', '0', '0', '5', '1'], 'sửa xong biểu đồ cập nhật' + at);
      assert.equal(await page.locator('.gr-spend-item').count(), 1, 'sửa không sinh thêm dòng' + at);
      await until(() => savedSpend(server)[0]?.n === 'Tai nghe không dây', 'lưu bản sửa' + at);
      const s = savedSpend(server);
      assert.equal(s.length, 1);
      assert.equal(s[0].id, 's1', 'giữ nguyên id');
      assert.deepEqual(s[0].p, [4, 5, 3, 0, 0, 0, 6, 2]);
      assert.equal(s[0].note, undefined, 'xóa ghi chú thì bỏ trường');
      assert.equal(s[0].d, day(-1), 'giữ ngày cũ');

      // Esc đóng form mà không lưu.
      await page.click('[data-gr-spend-edit]');
      await page.waitForSelector('#growth-spend[open]');
      await page.fill('.gr-spend-dlg input[name="n"]', 'Không được lưu');
      await page.keyboard.press('Escape');
      await page.waitForSelector('#growth-spend', { state: 'detached' });
      assert.equal(savedSpend(server)[0].n, 'Tai nghe không dây', 'Esc không lưu' + at);
      await context.close();
    }

    // D. Hủy quy đổi → hoàn điểm; khôi phục khi đủ điểm, chặn khi không đủ; xóa hẳn dòng đã hủy có xác nhận.
    {
      const first = { id: 's1', d: day(-1), n: 'Tai nghe mới', p: [8, 5, 3, 0, 0, 0, 6, 2] };
      const { context, page, server } = await h.open(width, { touch, workspace: withSpend([first])() });
      await h.show(page, 'growth');
      await page.click('[data-gr-spend-void]');
      await page.waitForSelector('.gr-spend-item.is-void');
      assert.match(await toast(page), /Đã hủy quy đổi “Tai nghe mới”, hoàn lại 12 điểm/, 'thông báo hủy' + at);
      assert.deepEqual(await radarValues(page), ['10', '6', '4', '0', '0', '0', '8', '2'], 'hủy xong điểm hoàn về biểu đồ' + at);
      assert.deepEqual(await wallet(page), { left: '30', earned: '30', spent: '0' }, 'ví điểm sau khi hủy' + at);
      assert.match((await page.locator('.gr-spend-item').innerText()).replace(/\s+/g, ' '), /Đã hủy.*đã hoàn 12 điểm/, 'dòng ghi rõ đã hủy' + at);
      assert.equal(await page.locator('[data-gr-spend-edit]').count(), 0, 'dòng đã hủy không còn nút Sửa' + at);
      await until(() => savedSpend(server)[0]?.x === true, 'lưu trạng thái hủy' + at);
      assert.equal(savedSpend(server).length, 1, 'hủy không xóa dòng' + at);

      // Khôi phục khi đủ điểm.
      await page.click('[data-gr-spend-restore]');
      await page.waitForSelector('.gr-spend-item:not(.is-void)');
      assert.match(await toast(page), /Đã khôi phục quy đổi “Tai nghe mới”, trừ lại 12 điểm/, 'thông báo khôi phục' + at);
      assert.deepEqual(await radarValues(page), ['6', '3,5', '2,5', '0', '0', '0', '5', '1'], 'khôi phục xong điểm bị trừ lại' + at);
      await until(() => savedSpend(server)[0]?.x === undefined, 'lưu trạng thái khôi phục' + at);

      // Hủy, rồi dùng hết Nghiệp quả cho lần quy đổi khác → khôi phục lần đầu bị chặn vì thiếu điểm.
      await page.click('[data-gr-spend-void]');
      await page.waitForSelector('.gr-spend-item.is-void');
      await page.click('[data-gr-spend]');
      await page.waitForSelector('#growth-spend[open]');
      await page.fill('.gr-spend-dlg input[name="n"]', 'Quà tặng mình');
      await axis(page, 0).fill('10');
      await page.click('.gr-spend-dlg [type=submit]');
      await page.waitForSelector('#growth-spend', { state: 'detached' });
      assert.deepEqual(await radarValues(page), ['0', '6', '4', '0', '0', '0', '8', '2'], 'dùng hết Nghiệp quả' + at);
      assert.equal(await page.locator('.gr-spend-item').count(), 2, 'hai dòng, mới nhất ở trên' + at);
      assert.match(await page.locator('.gr-spend-item').first().innerText(), /Quà tặng mình/, 'dòng mới nhất ở đầu danh sách' + at);
      await page.click('[data-gr-spend-restore]');
      assert.match(await toast(page), /Chưa đủ điểm ở Nghiệp quả để khôi phục \(đang có 0, cần 4\)/, 'khôi phục bị chặn khi thiếu điểm' + at);
      assert.equal(await page.locator('.gr-spend-item.is-void').count(), 1, 'dòng vẫn ở trạng thái đã hủy' + at);

      // Xóa hẳn dòng đã hủy: có xác nhận, giữ lại thì không mất gì.
      await page.click('[data-gr-spend-del]');
      await page.waitForSelector('.bg-confirm');
      assert.match(await page.locator('.bg-confirm h2').innerText(), /Xóa hẳn lần quy đổi/, 'hỏi xác nhận' + at);
      await page.click('[data-gr-spend-del-no]');
      await page.waitForSelector('.bg-confirm', { state: 'hidden' });
      assert.equal(await page.locator('.gr-spend-item').count(), 2, 'giữ lại thì không mất dòng' + at);
      await page.click('[data-gr-spend-del]');
      await page.waitForSelector('.bg-confirm');
      assert.ok((await page.locator('[data-gr-spend-del-ok]').boundingBox()).height >= minBtn, 'nút xác nhận xóa đủ lớn' + at);
      await page.click('[data-gr-spend-del-ok]');
      await page.waitForSelector('.bg-confirm', { state: 'hidden' });
      assert.equal(await page.locator('.gr-spend-item').count(), 1, 'xóa hẳn dòng đã hủy' + at);
      assert.deepEqual(await radarValues(page), ['0', '6', '4', '0', '0', '0', '8', '2'], 'xóa dòng đã hủy không đổi điểm' + at);
      await until(() => savedSpend(server).length === 1 && savedSpend(server)[0].n === 'Quà tặng mình', 'lưu sau khi xóa' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      await context.close();
    }

    // E. Số dư không âm, báo cáo, hết điểm, nhiều dòng.
    {
      // Hai thiết bị cùng quy đổi lúc chưa đồng bộ có thể làm tổng quy đổi vượt điểm đã cộng: hiển thị không âm, trang không hỏng.
      const over = [
        { id: 'o1', d: day(-1), n: 'Lần một', p: [30, 0, 0, 0, 0, 0, 0, 0] },
        { id: 'o2', d: day(-1), n: 'Lần hai', p: [30, 0, 0, 0, 0, 0, 0, 0] },
      ];
      const { context, page } = await h.open(width, { touch, workspace: withSpend(over)() });
      await h.show(page, 'growth');
      assert.deepEqual(await radarValues(page), ['0', '6', '4', '0', '0', '0', '8', '2'], 'số dư không bao giờ âm' + at);
      assert.equal(await page.locator('.gr-spend-item').count(), 2);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      await context.close();
    }
    {
      // Quy đổi hết sạch: báo cáo và trang vẫn đúng; nút Sử dụng điểm báo hết điểm.
      const all = [{ id: 'a1', d: day(-1), n: 'Chuyến đi', p: [20, 12, 8, 0, 0, 0, 16, 4] }];
      const { context, page } = await h.open(width, { touch, workspace: withSpend(all)() });
      await h.show(page, 'growth');
      assert.deepEqual(await radarValues(page), Array(8).fill('0'), 'quy đổi hết thì 8 chỉ số về 0' + at);
      assert.equal(await page.locator('.gr-realm-name').innerText(), 'Nhị lưu cao thủ', 'quy đổi hết vẫn giữ cảnh giới' + at);
      assert.match(await page.locator('.gr-summary').innerText(), /đang ở 0 sau khi đổi bảo vật/, 'tóm tắt khi hết điểm' + at);
      await page.click('[data-gr-spend]');
      assert.match(await toast(page), /Chưa có điểm để quy đổi/, 'hết điểm thì không mở form' + at);
      assert.equal(await page.locator('#growth-spend').count(), 0);
      await page.click('[data-gr-report]');
      await page.waitForSelector('.gr-report');
      const tiles = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.gr-tile')].map((t) => [t.dataset.tile, t.textContent.replace(/\s+/g, ' ').trim()])));
      assert.match(tiles.total, /Tu vi hiện có.*0 điểm.*đã đổi bảo vật 30/, 'ô tổng điểm trong báo cáo' + at);
      assert.match(tiles.realm, /Nhị lưu cao thủ/, 'báo cáo giữ cảnh giới' + at);
      assert.match(await page.locator('.gr-balance').innerText(), /đã đổi hết bảo vật/, 'báo cáo giải thích điểm về 0' + at);
      assert.equal(await page.locator('[data-tip="balance"]').count(), 0, 'không gợi ý cân bằng khi điểm bằng 0' + at);
      await context.close();
    }
    {
      // Báo cáo với quy đổi một phần.
      const part = [{ id: 'p1', d: day(-1), n: 'Tai nghe', p: [8, 5, 3, 0, 0, 0, 6, 2] }];
      const { context, page } = await h.open(width, { touch, workspace: withSpend(part)() });
      await h.show(page, 'growth');
      await page.click('[data-gr-report]');
      await page.waitForSelector('.gr-report');
      const tiles = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.gr-tile')].map((t) => [t.dataset.tile, t.textContent.replace(/\s+/g, ' ').trim()])));
      assert.match(tiles.total, /Tu vi hiện có.*18 điểm.*3 lần vận công · đã đổi bảo vật 12/, 'điểm hiện có trong báo cáo' + at);
      assert.match(tiles.realm, /Nhị lưu cao thủ.*Còn 50 điểm tới Nhất lưu cao thủ/, 'cảnh giới theo điểm đã tích lũy' + at);
      assert.equal(await noOverflow(page), true, 'báo cáo không tràn ngang' + at);
      await context.close();
    }
    {
      // 12 lần quy đổi: hiện 10 dòng mới nhất, nút Xem tất cả mở đủ.
      const many = Array.from({ length: 12 }, (_, i) => ({ id: 'm' + i, d: day(-1), n: 'Món số ' + (i + 1), p: [1, 0, 0, 0, 0, 0, 0, 0] }));
      const { context, page } = await h.open(width, { touch, workspace: withSpend(many)() });
      await h.show(page, 'growth');
      assert.equal(await page.locator('.gr-spend-item').count(), 10, 'mặc định 10 dòng' + at);
      assert.match(await page.locator('.gr-spend-item').first().innerText(), /Món số 12/, 'mới nhất ở đầu' + at);
      await page.click('[data-gr-spend-more]');
      assert.equal(await page.locator('.gr-spend-item').count(), 12, 'xem tất cả' + at);
      await page.click('[data-gr-spend-more]');
      assert.equal(await page.locator('.gr-spend-item').count(), 10, 'thu gọn' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      await context.close();
    }

    // F. Đổi nhân vật không làm mất sổ quy đổi; bản chỉ xem không quy đổi được.
    {
      const keep = [{ id: 'k1', d: day(-1), n: 'Giữ lại', p: [2, 0, 0, 0, 0, 0, 0, 0] }];
      const { context, page, server } = await h.open(width, { touch, workspace: withSpend(keep)() });
      await h.show(page, 'growth');
      await page.click('[data-gr-change]');
      await page.locator('.gr-card input[value="nu"]').check({ force: true });
      await page.click('[data-gr-confirm]');
      await page.waitForSelector('#gr-radar svg.gr-radar');
      await until(() => server.workspace.growth?.hero === 'nu', 'lưu nhân vật mới' + at);
      assert.deepEqual(server.workspace.growth.spend, keep, 'đổi nhân vật vẫn giữ sổ quy đổi' + at);
      assert.equal(server.workspace.growth.log.length, 3, 'và sổ cộng điểm' + at);
      assert.deepEqual(await radarValues(page), ['9', '6', '4', '0', '0', '0', '8', '2'], 'điểm vẫn đúng sau khi đổi nhân vật' + at);

      await page.evaluate(() => {
        contentReadOnly = true;
      });
      // Bản chia sẻ đã bị chặn mọi nút; hàm mở form còn tự từ chối lần nữa.
      await page.click('[data-gr-spend]');
      assert.equal(await page.locator('#growth-spend').count(), 0, 'bản chỉ xem: bấm nút không mở form' + at);
      await page.click('[data-gr-spend-void]');
      assert.equal(savedSpend(server)[0].x, undefined, 'bản chỉ xem: bấm Hủy quy đổi không đổi gì' + at);
      await page.evaluate(() => window.zenGrowth.openSpend());
      assert.match(await toast(page), /chỉ có quyền xem/, 'bản chỉ xem không quy đổi được' + at);
      assert.equal(await page.locator('#growth-spend').count(), 0);
      await context.close();
    }

    // G. Cộng điểm khi xong việc vẫn đúng khi đã có sổ quy đổi (cộng trên số dư hiện có).
    {
      const { context, page, server } = await h.open(width, { touch, workspace: withSpend([{ id: 'g1', d: day(-1), n: 'Quà', p: [8, 0, 0, 0, 0, 0, 0, 0] }])() });
      await h.show(page, 'growth');
      await page.evaluate(() => window.zenGrowth.openAward({ source: 'task', key: 'task:zz', title: 'Việc thử', steps: 2 }));
      await page.waitForSelector('#growth-award[open]');
      assert.equal(await page.locator('.gr-col-val').first().innerText(), '6', 'bảng cộng điểm bắt đầu từ số dư hiện có' + at);
      await page.click('[data-gr-plus="0"]');
      await page.click('[data-gr-plus="1"]');
      await page.click('[data-gr-save]');
      await page.waitForSelector('#growth-award', { state: 'detached' });
      assert.deepEqual(await radarValues(page), ['6,5', '6,5', '4', '0', '0', '0', '8', '2'], 'cộng điểm trên số dư đã trừ' + at);
      await until(() => server.workspace.growth.log.length === 4, 'lưu lần cộng' + at);
      assert.equal(server.workspace.growth.spend.length, 1, 'sổ quy đổi giữ nguyên khi cộng điểm' + at);
      await context.close();
    }
  }
} finally {
  await h.close();
}
console.log('growth spend browser ok');
