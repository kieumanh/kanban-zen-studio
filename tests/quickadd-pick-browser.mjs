// v2.82.0 (Thêm Nhanh): hộp “Thêm nhanh” có hàng chọn dự án một chạm, gợi ý ngày giờ và nút “Thêm & ghi tiếp”.
//  1. Hàng chọn dự án: mỗi dự án đang dùng một ô (không có dự án đã lưu trữ), dự án đang mở được chọn sẵn, chỉ ô chọn nằm trong thứ tự Tab;
//     chạm ô khác thì dòng “Dự án” của phần xem trước đổi theo và việc mới rơi vào dự án đó; phím mũi tên đổi ô chọn.
//  2. Thứ tự ưu tiên: #thẻ trong câu thắng ô chọn; chạm ô chọn thì #thẻ bị gỡ khỏi câu, để điều nhìn thấy khớp điều sẽ xảy ra.
//  3. Gợi ý ngày giờ (Hôm nay / Mai / Mốt / 9h): chèn đúng cụm bộ phân tích hiểu, không chèn trùng.
//  4. “Thêm & ghi tiếp” (và Ctrl+Enter): tạo việc, giữ hộp mở, xóa ô gõ, focus lại; câu rỗng không tạo gì.
//  5. Chỉ có một dự án: không hiện hàng chọn.
//  6. Giao diện 390 / 820 / 1440 px, Thiền / Giang hồ, sáng / tối: mọi nút chạm cao ≥ 44px, hộp nằm trọn trong màn hình, không tràn ngang;
//     Giang hồ đọc “Đại sự” và “Ghi tiếp”.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-17T03:00:00Z'; // thứ ba 17/11/2026, 10:00 giờ Việt Nam
const seed = () => ({
  schema: 1,
  projects: [
    makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 2),
    makeProject('p2', 'Hương Thiền Nature — Website', '#c764a2', 2),
    makeProject('p3', 'Farm Yêu Thương', '#e78c56', 2),
    makeProject('p4', 'Sổ nợ An Tâm', '#3a8f6b', 2),
    makeProject('p5', 'Farm cũ đã lưu trữ', '#888888', 1, { archived: true }),
  ],
  notes: [],
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 80; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá hạn chờ: ' + label);
}
const taskIn = (server, pid, title) => server.workspace.projects.find((p) => p.id === pid)?.tasks.find((t) => t.title === title);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const cfg = (style, theme) => ({ context }) =>
  context.addInitScript(
    ([s, t]) => {
      localStorage.setItem('zen-style', s);
      localStorage.setItem('zen-theme', t);
    },
    [style, theme],
  );
const chips = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#qa-picker .qa-chip')].map((c) => ({ id: c.dataset.id, on: c.getAttribute('aria-checked') === 'true', tab: c.tabIndex, name: c.textContent.trim() })),
  );
const openDialog = async (page) => {
  await page.click('#quick-add-btn');
  await page.waitForSelector('#editor[open] #qa-line');
};

const h = await startHarness({ seed });
try {
  // 1–5. Hành vi, ở khổ điện thoại (chạm) và máy tính.
  for (const [width, touch] of [
    [390, true],
    [1440, false],
  ]) {
    const at = ` (${width}px)`;
    const { context, page, server } = await h.open(width, { touch, now: NOW });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.waitForSelector('#quick-add-btn');
    await openDialog(page);

    // 1a. Một ô cho mỗi dự án đang dùng, dự án đang mở được chọn sẵn.
    let c = await chips(page);
    assert.deepEqual(
      c.map((x) => x.id),
      ['p1', 'p2', 'p3', 'p4'],
      'đủ ô cho dự án đang dùng, không có dự án đã lưu trữ' + at,
    );
    assert.deepEqual(c.map((x) => x.on), [true, false, false, false], 'dự án đang mở được chọn sẵn' + at);
    assert.deepEqual(c.map((x) => x.tab), [0, -1, -1, -1], 'chỉ ô đang chọn nằm trong thứ tự Tab' + at);
    assert.equal(await page.locator('#qa-picker').getAttribute('role'), 'radiogroup', 'hàng chọn là nhóm radio' + at);
    await page.fill('#qa-line', 'Gửi báo giá');
    assert.match(await page.locator('#qa-preview').innerText(), /Dự án\s*Khóa tu mùa thu/, 'xem trước theo dự án đang chọn' + at);

    // 1b. Chạm ô khác: xem trước đổi, ô nhập giữ focus, việc rơi đúng dự án.
    await page.click('#qa-picker .qa-chip[data-id="p4"]');
    c = await chips(page);
    assert.deepEqual(c.map((x) => x.on), [false, false, false, true], 'chạm ô thì ô đó được chọn' + at);
    assert.match(await page.locator('#qa-preview').innerText(), /Dự án\s*Sổ nợ An Tâm/, 'xem trước đổi theo ô chọn' + at);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'qa-line', 'ô gõ giữ focus để gõ tiếp' + at);
    assert.equal(await page.inputValue('#qa-line'), 'Gửi báo giá', 'chạm ô không đụng vào câu đang gõ' + at);
    await page.press('#qa-line', 'Enter');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    await until(() => taskIn(server, 'p4', 'Gửi báo giá'), 'việc vào dự án đã chọn' + at);
    assert.equal(taskIn(server, 'p1', 'Gửi báo giá'), undefined, 'không rơi vào dự án đang mở' + at);

    // 1c. Phím mũi tên đổi ô chọn.
    await openDialog(page);
    await page.focus('#qa-picker .qa-chip[aria-checked="true"]');
    await page.keyboard.press('ArrowRight');
    c = await chips(page);
    assert.equal(c.findIndex((x) => x.on), 1, 'mũi tên phải chọn ô kế tiếp' + at);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    c = await chips(page);
    assert.equal(c.findIndex((x) => x.on), c.length - 1, 'mũi tên trái ở ô đầu vòng về ô cuối' + at);

    // 2. #thẻ thắng ô chọn; chạm ô chọn gỡ #thẻ.
    await page.fill('#qa-line', 'Tưới cây #farm');
    c = await chips(page);
    assert.equal(c.find((x) => x.on)?.id, 'p3', '#farm làm ô Farm sáng lên' + at);
    assert.match(await page.locator('#qa-preview').innerText(), /Dự án\s*Farm Yêu Thương/, '#thẻ thắng ô chọn trong xem trước' + at);
    await page.click('#qa-picker .qa-chip[data-id="p2"]');
    assert.equal((await page.inputValue('#qa-line')).trim(), 'Tưới cây', 'chạm ô gỡ #thẻ khỏi câu' + at);
    assert.match(await page.locator('#qa-preview').innerText(), /Dự án\s*Hương Thiền Nature/, 'sau khi gỡ thẻ, ô chọn quyết định' + at);
    await page.press('#qa-line', 'Enter');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    await until(() => taskIn(server, 'p2', 'Tưới cây'), 'việc vào dự án vừa chạm' + at);

    // 3. Gợi ý ngày giờ.
    await openDialog(page);
    await page.fill('#qa-line', 'Gọi anh Sơn');
    await page.click('.qa-quick-btn[data-ins="mai"]');
    assert.equal(await page.inputValue('#qa-line'), 'Gọi anh Sơn mai ', 'chạm “Mai” chèn đúng cụm' + at);
    await page.click('.qa-quick-btn[data-ins="mai"]');
    assert.equal(await page.inputValue('#qa-line'), 'Gọi anh Sơn mai ', 'chạm lại không chèn trùng' + at);
    await page.click('.qa-quick-btn[data-ins="9h"]');
    const pv = await page.locator('#qa-preview').innerText();
    assert.match(pv, /Việc\s*Gọi anh Sơn\s/, 'tên việc không dính cụm ngày giờ' + at);
    assert.match(pv, /Hạn\s*Ngày mai 18\/11 · 09:00/, 'gợi ý được hiểu thành hạn' + at);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'qa-line', 'chạm gợi ý giữ focus ở ô gõ' + at);

    // 4. “Thêm & ghi tiếp”: tạo việc, giữ hộp mở, xóa ô gõ.
    await page.click('#qa-again');
    await until(() => taskIn(server, 'p1', 'Gọi anh Sơn'), 'việc đầu lên máy chủ' + at);
    assert.equal(await page.evaluate(() => document.querySelector('#editor').open), true, 'hộp vẫn mở sau “ghi tiếp”' + at);
    assert.equal(await page.inputValue('#qa-line'), '', 'ô gõ được xóa để ghi việc kế' + at);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'qa-line', 'ô gõ được focus lại' + at);
    assert.match(await page.locator('#qa-preview').innerText(), /Gõ tên việc/, 'xem trước về trạng thái chờ' + at);
    assert.equal(taskIn(server, 'p1', 'Gọi anh Sơn').due, '2026-11-18', 'việc đầu có hạn' + at);
    await page.click('#qa-again'); // câu rỗng
    await wait(200);
    const before = await page.evaluate(() => data.projects.find((p) => p.id === 'p1').tasks.length);
    await page.fill('#qa-line', 'Việc kế tiếp');
    await page.press('#qa-line', 'Control+Enter');
    await until(() => taskIn(server, 'p1', 'Việc kế tiếp'), 'Ctrl+Enter cũng ghi tiếp' + at);
    assert.equal(await page.evaluate(() => data.projects.find((p) => p.id === 'p1').tasks.length), before + 1, 'câu rỗng không tạo việc, câu có chữ tạo đúng một việc' + at);
    assert.equal(await page.evaluate(() => document.querySelector('#editor').open), true, 'hộp vẫn mở sau Ctrl+Enter' + at);
    await page.press('#qa-line', 'Escape');
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }

  // 5. Chỉ có một dự án: không hiện hàng chọn.
  {
    const one = () => ({ schema: 1, projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 2)], notes: [] });
    const { context, page } = await h.open(390, { touch: true, now: NOW, workspace: one() });
    await page.waitForSelector('#quick-add-btn');
    await openDialog(page);
    assert.equal(await page.locator('#qa-picker').count(), 0, 'một dự án thì không cần hàng chọn');
    await page.fill('#qa-line', 'Chỉ một dự án');
    assert.match(await page.locator('#qa-preview').innerText(), /Dự án\s*Khóa tu mùa thu/, 'vẫn xem trước dự án duy nhất');
    await context.close();
  }

  // 6. Giao diện: kích thước chạm, nằm trọn màn hình, Giang hồ đổi chữ.
  for (const w of [390, 820, 1440]) {
    for (const [style, theme] of [
      ['zen', 'light'],
      ['giangho', 'light'],
      ['giangho', 'dark'],
      ['zen', 'dark'],
    ]) {
      const at = ` (${w}px, ${style}, ${theme})`;
      const { context, page } = await h.open(w, { touch: w < 1000, now: NOW, setup: cfg(style, theme) });
      await page.waitForSelector('#quick-add-btn');
      await openDialog(page);
      await page.fill('#qa-line', 'Gọi anh Sơn mai 9h');
      const m = await page.evaluate(() => {
        const d = document.querySelector('#editor').getBoundingClientRect();
        const small = [...document.querySelectorAll('.qa-chip, .qa-quick-btn, .qa-again')].filter((e) => e.getBoundingClientRect().height < 44).length;
        const txt = (sel) => document.querySelector(sel)?.textContent.trim();
        const pk = document.querySelector('#qa-picker').getBoundingClientRect();
        const chipsOut = [...document.querySelectorAll('.qa-chip')].filter((e) => {
          const r = e.getBoundingClientRect();
          return r.right > d.right + 1 && getComputedStyle(document.querySelector('#qa-picker')).overflowX !== 'auto';
        }).length;
        return {
          inside: d.left >= 0 && d.right <= innerWidth && d.top >= 0 && d.bottom <= innerHeight,
          small,
          label: txt('.qa-label'),
          again: txt('#qa-again'),
          pickerInside: pk.left >= d.left - 1 && pk.right <= d.right + 1,
          chipsOut,
        };
      });
      assert.equal(m.inside, true, 'hộp nằm trọn trong màn hình' + at);
      assert.equal(m.small, 0, 'mọi nút chạm cao ít nhất 44px' + at);
      assert.equal(m.pickerInside, true, 'hàng chọn không vượt khỏi hộp' + at);
      assert.equal(m.chipsOut, 0, 'ô chọn không bị cắt ngoài vùng cuộn' + at);
      assert.equal(m.label, style === 'giangho' ? 'Đại sự' : 'Dự án', 'nhãn hàng chọn đúng chủ đề' + at);
      assert.equal(m.again, style === 'giangho' ? 'Ghi tiếp' : 'Thêm & ghi tiếp', 'nút ghi tiếp đúng chủ đề' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      await context.close();
    }
  }

  console.log('PASS: Thêm nhanh có hàng chọn dự án một chạm, gợi ý ngày giờ và “Thêm & ghi tiếp” (390/820/1440px, Thiền/Giang hồ, sáng/tối).');
} finally {
  await h.close();
}
