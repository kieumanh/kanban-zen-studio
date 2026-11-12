// v1.91.0 (Cơ Quan): chữ giang hồ ở Cơ quan (cài đặt), Truyền thư (chuông), Phong ấn (lưu trữ), Phế tích (thùng rác), trạng thái
// đồng bộ, thông báo nhanh và màn hình Nhập môn (đăng nhập) — phong cách Giang hồ. Kiểm ở 390 (chạm), 820 (chạm), 1440 px:
//  1. Chữ giao diện đổi đúng bảng thuật ngữ; nhóm Giao diện, Dữ liệu & đồng bộ, Cài đặt ứng dụng và nút Xóa dữ liệu giữ nguyên.
//  2. Nội dung người dùng giữ nguyên dù trùng chữ giao diện: dự án tên "Thông báo", đại sự phong ấn tên "Lưu trữ", nhiệm vụ phong ấn
//     tên "Khôi phục", mục trong Phế tích tên "Dự án", tên hiển thị trong ô nhập.
//  3. Ứng dụng vẫn chạy đúng: nhóm Phiên nhập môn luôn nằm cuối Cơ quan kể cả sau khi các nhóm nạp sau gắn vào; giải ấn đại sự, khôi
//     phục mục trong Phế tích lưu đúng; đổi về Thiền trả lại chữ cũ ngay; nhập môn gửi đúng email / mật khẩu, báo lỗi rõ ràng.
//  4. Dữ liệu trên máy chủ không chứa chữ giang hồ; không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const entry = (id, kind, name, payload) => ({ id, at: Date.now() - 1000, kind, name, payload: JSON.stringify(payload), parent: '' });
const seed = () => {
  const p1 = makeProject('p1', 'Thông báo', '#7950c8', 4);
  p1.tasks[1].archived = true;
  p1.tasks[1].title = 'Khôi phục';
  return {
    schema: 1,
    projects: [p1, { ...makeProject('p2', 'Lưu trữ', '#2e7d5b', 2), archived: true }],
    notes: [],
    trash: [entry('tr1', 'note', 'Dự án', { id: 'n9', type: 'note', title: 'Dự án', text: 'Nội dung cũ', url: '', group: '', color: '#7950c8' })],
  };
};
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const has = (txt, list, where) => list.forEach((t) => assert.ok(txt.includes(t), where + ' có “' + t + '”'));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const summaries = (page) => page.evaluate(() => [...document.querySelectorAll('#editor-body > .wf-settings-group > summary')].map((s) => s.textContent.trim()));
const closeDialogs = (page) => page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { context, page, server } = await h.open(width, { touch, now: '2026-11-12T09:00:00+07:00', setup: GH });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // Thanh trên: trạng thái đồng bộ, chuông.
    assert.match(await page.locator('#save-state').innerText(), /^Đã thông mạch lúc \d\d:\d\d$/, 'trạng thái đồng bộ' + at);
    assert.match(await page.locator('#save-state').getAttribute('aria-label'), /^Trạng thái đồng bộ: Đã thông mạch lúc /, 'nhãn đọc của trạng thái đồng bộ' + at);
    assert.match(await page.locator('#notifications-button').getAttribute('aria-label'), /^Truyền thư · \d+ nhiệm vụ cần chú ý \(\d+ lỡ hẹn\)/, 'nhãn nút chuông' + at);

    // Cơ quan.
    await page.evaluate(() => accountPanel());
    await page.waitForSelector('dialog[open] #editor-body.wf-settings');
    await page.waitForFunction(() => [...document.querySelectorAll('#editor-body > .wf-settings-group > summary')].some((s) => s.textContent.trim() === 'Dung lượng dữ liệu'), null, { timeout: 8000 });
    await page.evaluate(() => document.querySelectorAll('#editor-body details').forEach((d) => (d.open = true)));
    assert.match(await page.locator('dialog[open] h2').first().innerText(), /^Cơ quan\s*Danh tính của các hạ$/, 'tiêu đề Cơ quan' + at);
    const groups = await summaries(page);
    for (const g of ['Hành trạng', 'Danh tính & phòng vệ', 'Truyền thư', 'Chiến báo tuần', 'Chiến báo ngân khố tuần', 'Dữ liệu & đồng bộ', 'Bí kíp nhập môn', 'Cài đặt ứng dụng', 'Giao diện', 'Dung lượng dữ liệu', 'Phiên nhập môn'])
      assert.ok(groups.includes(g), 'nhóm "' + g + '": ' + groups + at);
    assert.equal(groups.at(-1), 'Phiên nhập môn', 'Phiên nhập môn nằm cuối Cơ quan: ' + groups + at);
    assert.ok(await page.locator('#editor-body > .wf-settings-group:last-of-type .settings-signout').count(), 'nhóm cuối là nhóm phiên đăng nhập' + at);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.nf-block > h4')].map((e) => e.textContent.trim())), ['Nhiệm vụ', 'Nhật khóa', 'Tu vi'], 'ba khối truyền thư' + at);
    // textContent: chữ gốc, không qua text-transform (vài nhãn được viết hoa bằng CSS ở màn hình hẹp).
    const settings = await page.evaluate(() => document.querySelector('dialog[open]').textContent.replace(/\s+/g, ' '));
    has(settings, ['Danh xưng', 'Lưu hành trạng', 'Bật truyền thư trên trình duyệt', 'Lưu lịch truyền thư', 'Xem chiến báo & PDF', 'Phát lệnh bài', 'Thu chiêu, lấy lại lần xóa', 'Mở bí kíp nhập môn', 'Hạ sơn'], 'Cơ quan' + at);
    // Giữ nguyên: nhóm Giao diện (công tắc Phong cách), Dữ liệu & đồng bộ, hành động khó hoàn tác.
    has(settings, ['Phong cách', 'Thiền', 'Giang hồ', 'Đồng bộ ngay', 'Xuất bản sao JSON', 'Xóa dữ liệu'], 'Cơ quan giữ nguyên' + at);
    assert.equal(await page.inputValue('#profile-name'), 'Kiểm tra', 'tên hiển thị trong ô nhập giữ nguyên' + at);
    assert.equal(await noOverflow(page), true, 'Cơ quan không tràn ngang' + at);
    // Đổi về Thiền khi đang mở Cơ quan: chữ trở lại ngay; bật lại Giang hồ thì đổi tiếp.
    await page.evaluate(() => window.zenTheme.setStyle('zen'));
    await page.waitForFunction(() => document.querySelector('#sign-out')?.textContent.trim() === 'Đăng xuất');
    const zen = await summaries(page);
    assert.ok(zen.includes('Hồ sơ') && zen.includes('Thông báo') && zen.at(-1) === 'Phiên đăng nhập', 'Thiền trả lại chữ cũ: ' + zen + at);
    await page.evaluate(() => window.zenTheme.setStyle('giangho'));
    await page.waitForFunction(() => document.querySelector('#sign-out')?.textContent.trim() === 'Hạ sơn');
    // Hỏi hạ sơn (không thật sự đăng xuất).
    await page.locator('#sign-out').click();
    await page.waitForFunction(() => document.querySelector('dialog[open] h2')?.textContent.trim() === 'Hạ sơn?');
    has(await page.locator('dialog[open]').innerText(), ['Các thay đổi chưa đồng bộ sẽ được gửi lên trước. Các hạ sẽ phải nhập môn lại.'], 'hỏi hạ sơn' + at);
    await closeDialogs(page);
    assert.equal(await page.evaluate(() => currentUser?.id), 'qa', 'vẫn còn trong phiên' + at);

    // Truyền thư.
    // Điện thoại: chuông nằm trong menu Tùy chọn nhanh; bấm thẳng nút như người dùng chọn mục đó.
    await page.evaluate(() => document.querySelector('#notifications-button').click());
    await page.waitForSelector('dialog[open] .notice-list');
    assert.equal((await page.locator('dialog[open] h2').first().innerText()).trim(), 'Truyền thư', 'tiêu đề Truyền thư' + at);
    assert.match(await page.locator('.notice-summary').innerText(), /^\d+ nhiệm vụ cần chú ý: \d+ lỡ hẹn\./, 'tóm tắt truyền thư' + at);
    const groupsBell = await page.evaluate(() => [...document.querySelectorAll('.notice-group')].map((e) => e.firstChild.nextSibling?.nodeValue.trim()));
    assert.ok(groupsBell.includes('Lỡ hẹn'), 'nhóm Lỡ hẹn: ' + groupsBell + at);
    const smalls = await page.evaluate(() => [...document.querySelectorAll('.notice-item[data-task] small')].map((e) => e.textContent.trim()));
    assert.ok(smalls.length && smalls.every((s) => /^Thông báo · \d\d\/\d\d\/\d{4} · lỡ hẹn \d+ ngày$/.test(s)), 'tên dự án "Thông báo" giữ nguyên, hạn đổi chữ: ' + smalls + at);
    has(await page.locator('dialog[open]').innerText(), ['Xác nhận đã đọc hết truyền thư', 'Biên niên v'], 'Truyền thư' + at);
    await closeDialogs(page);

    // Phong ấn: đại sự tên "Lưu trữ", nhiệm vụ tên "Khôi phục".
    await h.show(page, 'archive');
    let main = await page.locator('#main').innerText();
    has(main, ['PHONG ẤN', 'Đại sự tạm phong ấn', 'nhiệm vụ công thành', 'Xem đại sự', 'Giải ấn để làm tiếp', 'Nhiệm vụ đã phong ấn'], 'Phong ấn' + at);
    assert.ok((await page.locator('.archive-projects h3').first().innerText()).includes('Lưu trữ'), 'tên đại sự "Lưu trữ" giữ nguyên' + at);
    assert.equal((await page.locator('.wf-archive-row strong').first().innerText()).trim(), 'Khôi phục', 'tên nhiệm vụ "Khôi phục" giữ nguyên' + at);
    assert.equal((await page.locator('.wf-archive-row [data-wf-archive]').first().innerText()).trim(), 'Giải ấn', 'nút giải ấn nhiệm vụ' + at);
    assert.equal(await noOverflow(page), true, 'Phong ấn không tràn ngang' + at);
    await page.locator('.archive-projects [data-project-archive]').first().click();
    await page.waitForFunction(() => document.querySelector('dialog[open] h2')?.textContent.trim() === 'Giải ấn đại sự?');
    const confirm = await page.locator('dialog[open] .help-copy').first().innerText();
    assert.equal(confirm, 'Các hạ muốn giải ấn Lưu trữ để tiếp tục hành sự?', 'hỏi giải ấn, tên đại sự giữ nguyên' + at);
    await page.locator('dialog[open] .modal-foot .btn.primary').click();
    await page.waitForFunction(() => project('p2') && !project('p2').archived);
    assert.equal(await page.locator('#toast').innerText(), 'Đã giải ấn đại sự.', 'thông báo nhanh' + at);

    // Phế tích: mục tên "Dự án".
    await h.show(page, 'trash');
    main = await page.locator('#main').innerText();
    has(main, ['Phế tích tự dọn sau 30 ngày', 'Mục trong Phế tích', 'Đại sự, tàng thư và nhiệm vụ', 'Quyển · 1', 'Khôi phục', 'Dọn sạch Phế tích'], 'Phế tích' + at);
    assert.equal((await page.locator('.recycle-name h3').first().innerText()).trim(), 'Dự án', 'tên mục "Dự án" giữ nguyên' + at);
    assert.equal((await page.locator('.recycle-name > small').first().innerText()).trim(), 'Quyển', 'loại mục' + at);
    assert.equal(await noOverflow(page), true, 'Phế tích không tràn ngang' + at);
    await page.locator('[data-restore-item="tr1"]').click();
    await page.waitForFunction(() => data.notes.some((n) => n.id === 'n9'));
    assert.equal(await page.evaluate(() => data.notes.find((n) => n.id === 'n9').title), 'Dự án', 'quyển khôi phục giữ đúng tên' + at);

    // Dữ liệu trên máy chủ không chứa chữ giang hồ.
    await page.waitForFunction(() => document.querySelector('#save-state')?.dataset.sync === 'saved');
    const json = JSON.stringify(server.workspace);
    assert.doesNotMatch(json, /Phong ấn|Giải ấn|Phế tích|Truyền thư|Hành trạng|đại sự|nhiệm vụ/, 'dữ liệu lưu không bị đổi chữ' + at);
    assert.equal(server.workspace.projects.find((p) => p.id === 'p2').archived, false, 'máy chủ nhận đại sự đã giải ấn' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();

    // Nhập môn (chưa đăng nhập).
    const auth = await h.open(width, { touch, setup: GH });
    let loggedIn = false;
    const logins = [];
    await auth.page.route('**/api/me', (route) =>
      loggedIn
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'qa', name: 'Kiểm tra', email: 'qa@example.test', session_expires: Date.now() + 600000 } }) })
        : route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Chưa đăng nhập.' }) }),
    );
    await auth.page.route('**/api/login', async (route) => {
      logins.push(route.request().postDataJSON());
      if (logins.length === 1) return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Email hoặc mật khẩu chưa đúng.' }) });
      loggedIn = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await auth.page.goto(auth.page.url());
    await auth.page.waitForSelector('#auth-screen form#auth-form');
    const card = await auth.page.locator('#auth-screen').innerText();
    has(card, ['GIANG HỒ RIÊNG CỦA CÁC HẠ', 'HOAN NGHÊNH CÁC HẠ', 'Trở lại giang hồ của các hạ', 'Quên ám hiệu?', 'Giữ nhập môn 30 ngày'], 'Nhập môn' + at);
    assert.equal((await auth.page.locator('label[for=account-password]').innerText()).trim(), 'Ám hiệu (mật khẩu)', 'nhãn ô mật khẩu giữ nghĩa' + at);
    assert.equal(await auth.page.getAttribute('#auth-screen [name=password]', 'autocomplete'), 'current-password', 'trình quản lý mật khẩu vẫn nhận ô' + at);
    assert.equal((await auth.page.locator('#auth-screen [type=submit]').innerText()).trim(), 'Nhập môn', 'nút nhập môn' + at);
    assert.equal(await noOverflow(auth.page), true, 'Nhập môn không tràn ngang' + at);
    await auth.page.fill('#auth-screen [name=email]', 'qa@example.test');
    await auth.page.fill('#auth-screen [name=password]', 'Đăng nhập 12345');
    await auth.page.click('#auth-screen [type=submit]');
    await auth.page.waitForFunction(() => document.querySelector('#auth-message')?.textContent === 'Email hoặc ám hiệu chưa đúng.');
    await auth.page.click('#auth-screen [type=submit]');
    await auth.page.waitForFunction(() => !document.body.classList.contains('signed-out'), null, { timeout: 15000 });
    assert.equal(logins.length, 2, 'gửi hai lần nhập môn' + at);
    assert.deepEqual([logins[1].email, logins[1].password], ['qa@example.test', 'Đăng nhập 12345'], 'gửi đúng email và mật khẩu đã gõ' + at);
    await auth.context.close();
  }

  // Ghi danh (một khổ là đủ: cùng một màn hình).
  const reg = await h.open(390, { touch: true, setup: GH });
  await reg.page.route('**/api/me', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Chưa đăng nhập."}' }));
  await reg.page.goto(reg.page.url());
  await reg.page.waitForSelector('#auth-screen [data-auth=register]');
  await reg.page.click('#auth-screen [data-auth=register]');
  await reg.page.waitForFunction(() => document.querySelector('#auth-screen h2')?.textContent === 'Ghi danh');
  has(await reg.page.locator('#auth-screen').innerText(), ['Ám hiệu từ 10 ký tự. Đừng dùng lại ám hiệu ở nơi khác.', 'Nhập môn'], 'Ghi danh');
  assert.equal((await reg.page.locator('#auth-screen [type=submit]').innerText()).trim(), 'Ghi danh', 'nút ghi danh');
  assert.equal(await reg.page.getAttribute('#auth-screen [name=password]', 'autocomplete'), 'new-password', 'ô ám hiệu mới');
  await reg.context.close();
  console.log('giangho-settings-browser ok');
} finally {
  await h.close();
}
