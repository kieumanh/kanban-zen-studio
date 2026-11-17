// v2.35.0 (Thêm Nhanh): gõ một câu tự nhiên như “Gọi anh Sơn mai 9h #farm” → việc có hạn (ngày, giờ) và dự án (dist/quickadd.js).
// A. Bộ phân tích (zenQuick.parse, hàm thuần): ngày (hôm nay, mai, mốt, thứ N, chủ nhật, tuần sau, dd/mm, ngày D, N ngày nữa, cuối tuần/tháng), giờ (9h, 9h30, 3 giờ chiều, 9:30, 9pm),
//    thẻ #dự án và #từ khóa; các câu dễ nhầm (tên người Mai, hoa mai, “một”, “thứ tự”, “1/2 ngày”, “gia hạn”, “T5”) không bị hiểu sai.
// B. Giao diện ở 390 (chạm) / 820 (chạm) / 1440 px: nút “+” trên thanh trên đủ lớn, không đè ô tìm kiếm, mở hộp có ô gõ được focus; xem trước (Việc / Hạn / Dự án) đúng;
//    Enter tạo việc đúng hình dạng biểu mẫu cũ (cột “Cần làm”, hạn, giờ kết thúc), lưu lên máy chủ giả; dự án mặc định = dự án đang mở; thẻ lạ giữ nguyên chữ, có cảnh báo.
// C. Câu thiếu tên việc không tạo gì; bản chỉ xem từ chối; bảng lệnh Ctrl+K có lệnh “Thêm nhanh”; nội dung có thẻ HTML được thoát ký tự.
// D. Chữ đủ tương phản (≥ 4,5:1) ở sáng / tối / Giang hồ / tương phản cao; không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

// 17/11/2026 là Thứ ba; 10:00 giờ Việt Nam.
const NOW = '2026-11-17T03:00:00Z';
const seed = () => ({
  schema: 1,
  projects: [
    makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 2, { keywords: [{ name: 'Gấp', color: '#aa0000' }] }),
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
const settle = (page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => {}))).then(() => undefined));
const setStyle = (style) => ({ context }) => context.addInitScript((s) => localStorage.setItem('zen-style', s), style);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const taskIn = (server, pid, title) => server.workspace.projects.find((p) => p.id === pid)?.tasks.find((t) => t.title === title);
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
const overlap = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;

// Mỗi dòng: [câu gõ, tên việc, ngày, giờ, tên dự án hoặc '', từ khóa].
const FARM = 'Farm Yêu Thương';
const CASES = [
  // Ví dụ của yêu cầu
  ['Gọi anh Sơn mai 9h #farm', 'Gọi anh Sơn', '2026-11-18', '09:00', FARM],
  ['gọi anh Sơn ngày mai 9h30 #farm', 'gọi anh Sơn', '2026-11-18', '09:30', FARM],
  ['#farm tưới cây', 'tưới cây', '', '', FARM],
  // Ngày
  ['Họp nhóm thứ 6 tuần sau 14h', 'Họp nhóm', '2026-11-27', '14:00', ''],
  ['Họp thứ 2 tuần này', 'Họp', '2026-11-16', '', ''],
  ['Họp thứ 3', 'Họp', '2026-11-24', '', ''],
  ['thứ tư họp', 'họp', '2026-11-18', '', ''],
  ['Họp chủ nhật', 'Họp', '2026-11-22', '', ''],
  ['họp t6', 'họp', '2026-11-20', '', ''],
  ['ngày mốt đi khám', 'đi khám', '2026-11-19', '', ''],
  ['mốt đi khám', 'đi khám', '2026-11-19', '', ''],
  ['Việc ngày 20', 'Việc', '2026-11-20', '', ''],
  ['Việc ngày 17', 'Việc', '2026-11-17', '', ''],
  ['Việc ngày 5', 'Việc', '2026-12-05', '', ''],
  ['Đi chơi 25/12', 'Đi chơi', '2026-12-25', '', ''],
  ['Đi chơi 5/11', 'Đi chơi', '2027-11-05', '', ''],
  ['Đi chơi 20/11/2027', 'Đi chơi', '2027-11-20', '', ''],
  ['Học bài 3 ngày nữa', 'Học bài', '2026-11-20', '', ''],
  ['Nộp sau 2 tuần', 'Nộp', '2026-12-01', '', ''],
  ['cuối tuần dọn nhà', 'dọn nhà', '2026-11-21', '', ''],
  ['cuối tháng chốt sổ', 'chốt sổ', '2026-11-30', '', ''],
  ['Họp 9 giờ rưỡi hôm nay', 'Họp', '2026-11-17', '09:30', ''],
  // Giờ và buổi
  ['Họp 15h', 'Họp', '2026-11-17', '15:00', ''],
  ['Họp 8h', 'Họp', '2026-11-18', '08:00', ''], // 8h đã qua: ngày mai
  ['Gửi báo cáo 3h chiều mai', 'Gửi báo cáo', '2026-11-18', '15:00', ''],
  ['Gửi báo cáo chiều mai 3h', 'Gửi báo cáo', '2026-11-18', '15:00', ''],
  ['Dọn nhà 8h tối thứ 7', 'Dọn nhà', '2026-11-21', '20:00', ''],
  ['Hôm nay chạy bộ 6h sáng', 'chạy bộ', '2026-11-17', '06:00', ''],
  ['Họp 14:30 thứ 5 tuần này', 'Họp', '2026-11-19', '14:30', ''],
  ['9pm xem phim', 'xem phim', '2026-11-17', '21:00', ''],
  ['Gọi anh Sơn lúc 9 giờ 30 mai', 'Gọi anh Sơn', '2026-11-18', '09:30', ''],
  ['Lúc 9h gọi anh Sơn', 'gọi anh Sơn', '2026-11-18', '09:00', ''],
  ['Nộp báo cáo trước thứ 6', 'Nộp báo cáo', '2026-11-20', '', ''],
  ['Nộp báo cáo, hạn 20/11', 'Nộp báo cáo', '2026-11-20', '', ''],
  ['sáng nay gọi khách 10h', 'gọi khách', '2026-11-17', '10:00', ''],
  // “Ăn tối”, “Ăn trưa” là tên việc: buổi chỉ dùng để suy ra giờ
  ['Ăn tối 7h', 'Ăn tối', '2026-11-17', '19:00', ''],
  ['Ăn tối mai 7h', 'Ăn tối', '2026-11-18', '19:00', ''],
  ['Ăn trưa 12h30 mai', 'Ăn trưa', '2026-11-18', '12:30', ''],
  // Có buổi nhưng không có giờ: giữ nguyên cụm để không mất chữ
  ['Gọi chị Mai chiều nay', 'Gọi chị Mai chiều nay', '2026-11-17', '', ''],
  ['Ăn tối mai', 'Ăn tối mai', '2026-11-18', '', ''],
  ['tối nay đá bóng', 'tối nay đá bóng', '2026-11-17', '', ''],
  // Câu dễ nhầm: không được hiểu thành ngày giờ
  ['Gọi chị Mai mai 8h', 'Gọi chị Mai', '2026-11-18', '08:00', ''],
  ['hoa mai vàng mai', 'hoa mai vàng', '2026-11-18', '', ''],
  ['Mai họp lúc 14h', 'Mai họp', '2026-11-17', '14:00', ''],
  ['Thứ tự ưu tiên bài viết', 'Thứ tự ưu tiên bài viết', '', '', ''],
  ['họp T5 sprint', 'họp T5 sprint', '', '', ''],
  ['một việc', 'một việc', '', '', ''],
  ['Làm 1/2 ngày', 'Làm 1/2 ngày', '', '', ''],
  ['đọc 2/3 chương', 'đọc 2/3 chương', '', '', ''],
  ['Gia hạn hợp đồng 20/11', 'Gia hạn hợp đồng', '2026-11-20', '', ''],
  // Thẻ dự án / từ khóa
  ['Nộp bài #huong', 'Nộp bài', '', '', 'Hương Thiền Nature — Website'],
  ['Nộp bài #thu', 'Nộp bài', '', '', 'Khóa tu mùa thu'],
  ['Nộp bài #so', 'Nộp bài', '', '', 'Sổ nợ An Tâm'],
  ['Nộp bài #farm_yeu_thuong', 'Nộp bài', '', '', FARM],
  ['Nộp bài #gap #khoa', 'Nộp bài', '', '', 'Khóa tu mùa thu', 'Gấp'],
  ['Tưới cây #khongco', 'Tưới cây #khongco', '', '', ''],
  ['#gap gấp #farm', '#gap gấp', '', '', FARM],
  ['mai', '', '2026-11-18', '', ''],
  ['#farm', '', '', '', FARM],
];

const h = await startHarness({ seed });
try {
  // ---- A. Bộ phân tích ----
  {
    const { context, page } = await h.open(1440, { now: NOW });
    await page.waitForSelector('#quick-add-btn');
    const rows = await page.evaluate(
      ([cases]) => {
        const projects = data.projects.filter((p) => !p.archived);
        const ctx = { today: '2026-11-17', minutes: 600, projects, activeId: 'p1' };
        return cases.map((c) => {
          const r = zenQuick.parse(c[0], ctx);
          return [c[0], r.title, r.date, r.time, r.project?.name || '', r.labels.map((l) => l.name).join(',')];
        });
      },
      [CASES],
    );
    CASES.forEach((c, i) => {
      assert.deepEqual(rows[i], [c[0], c[1], c[2], c[3], c[4], c[5] || ''], 'phân tích “' + c[0] + '”');
    });
    // Chỉ có giờ: còn kịp thì hôm nay, quá giờ thì ngày mai.
    const late = await page.evaluate(() => {
      const projects = data.projects;
      return [zenQuick.parse('Họp 9h', { today: '2026-11-17', minutes: 23 * 60, projects }), zenQuick.parse('Họp 23h30', { today: '2026-11-17', minutes: 600, projects })].map((r) => [r.date, r.time]);
    });
    assert.deepEqual(late, [['2026-11-18', '09:00'], ['2026-11-17', '23:30']], 'giờ chỉ có giờ: hôm nay nếu còn kịp, không thì ngày mai');
    // Dự án lưu trữ không được đưa vào danh sách chọn; thẻ khớp nhiều dự án như nhau → chọn dự án đang mở, không có thì dự án đầu tiên.
    const picked = await page.evaluate(() => {
      const open = data.projects.filter((p) => !p.archived);
      const ctx = (extra) => ({ today: '2026-11-17', minutes: 600, projects: open, ...extra });
      return [zenQuick.parse('x #farm', ctx()).project?.id, zenQuick.parse('x #th', ctx({ activeId: 'p3' })).project?.id, zenQuick.parse('x #th', ctx()).project?.id];
    });
    assert.deepEqual(picked, ['p3', 'p3', 'p1'], 'thẻ chung chọn dự án đang mở; không có dự án đang mở thì dự án đầu tiên');
    await context.close();
  }

  // ---- B. Giao diện và tạo việc ở ba độ rộng ----
  for (const [width, touch] of [[390, true], [820, true], [1440, false]]) {
    const at = ' (' + width + 'px)';
    const { context, page, server } = await h.open(width, { touch, now: NOW });
    await page.waitForSelector('#quick-add-btn');
    // B1. Nút “+”: đủ lớn, nằm trong màn hình, không đè ô tìm kiếm hay cụm nút.
    const g = await page.evaluate(() => {
      const r = (el) => {
        const b = el.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height };
      };
      return {
        btn: r(document.querySelector('#quick-add-btn')),
        search: r(document.querySelector('.topbar .search')),
        tools: r(document.querySelector('#top-tools-trigger')),
        label: document.querySelector('#quick-add-btn').getAttribute('aria-label'),
        vw: innerWidth,
      };
    });
    const min = touch ? 40 : 28; // cùng cỡ với các nút khác trên thanh trên (30px khi dùng chuột)
    assert.ok(g.btn.width >= min && g.btn.height >= min, 'nút thêm nhanh đủ lớn (≥ ' + min + 'px), thấy ' + Math.round(g.btn.width) + '×' + Math.round(g.btn.height) + at);
    assert.ok(g.btn.left >= 0 && g.btn.right <= g.vw, 'nút nằm trong màn hình' + at);
    assert.ok(!overlap(g.btn, g.search) && !overlap(g.btn, g.tools), 'nút không đè ô tìm kiếm hay nút công cụ' + at);
    assert.match(g.label, /Thêm nhanh/, 'nút có nhãn đọc được' + at);
    assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);

    // B2. Mở hộp: ô gõ được focus; xem trước theo câu đang gõ.
    await page.click('#quick-add-btn');
    await page.waitForSelector('#editor[open] #qa-line');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'qa-line', 'ô gõ được focus ngay' + at);
    assert.match(await page.locator('#qa-preview').innerText(), /Gõ tên việc/, 'chưa gõ: có lời hướng dẫn' + at);
    await page.fill('#qa-line', 'Gọi anh Sơn mai 9h #farm');
    const preview = await page.locator('#qa-preview').innerText();
    assert.match(preview, /Việc\s*Gọi anh Sơn/, 'xem trước: tên việc' + at);
    assert.match(preview, /Hạn\s*Ngày mai 18\/11 · 09:00/, 'xem trước: hạn' + at);
    assert.match(preview, /Dự án\s*Farm Yêu Thương/, 'xem trước: dự án' + at);
    const box = await page.evaluate(() => {
      const d = document.querySelector('#editor').getBoundingClientRect();
      return { left: d.left, right: d.right, top: d.top, bottom: d.bottom, vw: innerWidth, vh: innerHeight };
    });
    assert.ok(box.left >= 0 && box.right <= box.vw && box.top >= 0 && box.bottom <= box.vh, 'hộp thoại nằm trọn trong màn hình' + at);
    assert.equal(await noOverflow(page), true, 'hộp thoại không gây tràn ngang' + at);

    // B3. Enter tạo việc đúng hình dạng biểu mẫu cũ, lưu lên máy chủ giả.
    await page.press('#qa-line', 'Enter');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    const made = await page.evaluate(() => data.projects.find((p) => p.id === 'p3').tasks.find((t) => t.title === 'Gọi anh Sơn'));
    assert.ok(made, 'việc được thêm vào dự án Farm' + at);
    assert.equal(made.due, '2026-11-18', 'hạn = ngày mai' + at);
    assert.equal(made.end, '2026-11-18T09:00', 'giờ kết thúc 09:00' + at);
    assert.equal(made.start, '', 'không đặt giờ bắt đầu' + at);
    assert.equal(made.col, 'List', 'vào cột Cần làm' + at);
    assert.deepEqual([made.description, made.tag, made.priority, made.checks.length, made.labels.length], ['', '', '', 0, 0], 'các trường còn lại như biểu mẫu cũ' + at);
    assert.ok(typeof made.id === 'string' && made.id.length > 6, 'có mã việc' + at);
    const toast = await page.locator('#toast').textContent();
    assert.match(toast, /Đã thêm “Gọi anh Sơn”/, 'thông báo nêu tên việc' + at);
    assert.match(toast, /Ngày mai 18\/11 · 09:00/, 'thông báo nêu hạn' + at);
    assert.match(toast, /Farm Yêu Thương/, 'thông báo nêu dự án' + at);
    await until(() => taskIn(server, 'p3', 'Gọi anh Sơn'), 'việc mới lên máy chủ' + at);
    const onServer = taskIn(server, 'p3', 'Gọi anh Sơn');
    assert.equal(onServer.end, '2026-11-18T09:00', 'máy chủ nhận đúng hạn' + at);
    assert.equal(await page.evaluate(() => data.projects.find((p) => p.id === 'p5').tasks.length), 1, 'dự án lưu trữ không bị thêm việc' + at);

    // B4. Đang mở một dự án thì câu không có thẻ vào dự án đó; từ trang Tổng quan thì vào dự án đầu tiên.
    await h.show(page, 'projects', 'p4');
    await page.click('#quick-add-btn');
    await page.waitForSelector('#qa-line');
    await page.fill('#qa-line', 'Họp thứ 6 #gap');
    assert.match(await page.locator('#qa-preview').innerText(), /Dự án\s*Sổ nợ An Tâm/, 'xem trước: dự án đang mở' + at);
    assert.match(await page.locator('#qa-preview').innerText(), /Không có dự án “gap”/, 'xem trước: cảnh báo thẻ lạ' + at);
    await page.press('#qa-line', 'Enter');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    const inP4 = await page.evaluate(() => data.projects.find((p) => p.id === 'p4').tasks.find((t) => t.title.startsWith('Họp')));
    assert.ok(inP4, 'câu không có #dự án vào dự án đang mở' + at);
    assert.equal(inP4.title, 'Họp #gap', 'thẻ không khớp giữ nguyên trong tên việc' + at);
    assert.equal(inP4.due, '2026-11-20', 'thứ 6 = 20/11' + at);
    assert.equal(inP4.end, '', 'không có giờ thì không đặt giờ kết thúc' + at);
    await page.evaluate(() => go('dashboard'));
    await page.waitForSelector('#main h1');
    assert.equal(await page.evaluate(() => active), null, 'Tổng quan không có dự án đang mở' + at);
    await page.click('#quick-add-btn');
    await page.waitForSelector('#qa-line');
    await page.fill('#qa-line', 'Việc từ tổng quan');
    await page.press('#qa-line', 'Enter');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    assert.ok(await page.evaluate(() => data.projects.find((p) => p.id === 'p1').tasks.some((t) => t.title === 'Việc từ tổng quan' && t.due === '')), 'từ Tổng quan: vào dự án đầu tiên, không hạn' + at);

    // B5. Thẻ từ khóa của dự án thành nhãn.
    await page.click('#quick-add-btn');
    await page.waitForSelector('#qa-line');
    await page.fill('#qa-line', 'Nộp bài #gap #khoa');
    assert.match(await page.locator('#qa-preview').innerText(), /Từ khóa\s*Gấp/, 'xem trước: từ khóa' + at);
    await page.press('#qa-line', 'Enter');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    const labelled = await page.evaluate(() => data.projects.find((p) => p.id === 'p1').tasks.find((t) => t.title === 'Nộp bài'));
    assert.deepEqual(labelled?.labels, [{ name: 'Gấp', color: '#aa0000' }], 'nhãn Gấp có đúng màu' + at);

    // B6. Câu không có tên việc: không tạo gì, hộp vẫn mở, có thông báo.
    const before = await page.evaluate(() => data.projects.reduce((n, p) => n + p.tasks.length, 0));
    await page.click('#quick-add-btn');
    await page.waitForSelector('#qa-line');
    await page.fill('#qa-line', 'mai 9h');
    assert.match(await page.locator('#qa-preview').innerText(), /Chưa có tên việc/, 'xem trước báo thiếu tên việc' + at);
    await page.press('#qa-line', 'Enter');
    assert.match(await page.locator('#toast').textContent(), /Hãy gõ tên việc/, 'thông báo thiếu tên việc' + at);
    assert.equal(await page.evaluate(() => document.querySelector('#editor').open), true, 'hộp vẫn mở để gõ tiếp' + at);
    assert.equal(await page.evaluate(() => data.projects.reduce((n, p) => n + p.tasks.length, 0)), before, 'không tạo việc rỗng' + at);

    // B7. Nội dung có thẻ HTML được thoát ký tự; Esc đóng hộp.
    await page.fill('#qa-line', '<b>đậm</b> <img src=x onerror=alert(1)> #farm');
    assert.equal(await page.locator('#qa-preview b, #qa-preview img').count(), 0, 'xem trước không sinh phần tử từ chữ gõ vào' + at);
    assert.match(await page.locator('#qa-preview').innerText(), /<b>đậm<\/b>/, 'xem trước hiện nguyên chữ' + at);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    await context.close();
  }

  // ---- C. Bản chỉ xem, bảng lệnh ----
  {
    const { context, page } = await h.open(1440, { now: NOW });
    await page.waitForSelector('#quick-add-btn');
    // C1. Bảng lệnh Ctrl+K có lệnh “Thêm nhanh” và mở đúng hộp.
    await page.keyboard.press('Control+k');
    await page.waitForSelector('.studio-palette[open]');
    await page.fill('.studio-palette input', 'thêm nhanh');
    assert.match(await page.locator('.studio-palette [role=option]').first().innerText(), /Thêm nhanh bằng một câu/, 'bảng lệnh có lệnh Thêm nhanh');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#editor[open] #qa-line');
    assert.equal(await page.evaluate(() => document.querySelector('.studio-palette').open), false, 'bảng lệnh đã đóng');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    // C2. Bản chỉ xem: không mở hộp, create từ chối.
    const total = () => page.evaluate(() => data.projects.reduce((n, p) => n + p.tasks.length, 0));
    const n0 = await total();
    const res = await page.evaluate(() => {
      contentReadOnly = true;
      const created = zenQuick.create('Việc không được tạo mai 9h');
      zenQuick.open();
      return { created, open: document.querySelector('#editor').open };
    });
    assert.equal(res.created.ok, false, 'bản chỉ xem: create từ chối');
    assert.equal(res.open, false, 'bản chỉ xem: không mở hộp');
    assert.match(await page.locator('#toast').textContent(), /chỉ xem/, 'bản chỉ xem: có thông báo');
    assert.equal(await total(), n0, 'bản chỉ xem: không thêm việc');
    await context.close();
  }

  // ---- D. Tương phản và giao diện ----
  for (const [width, style, opts] of [
    [390, 'zen', {}],
    [820, 'zen', { colorScheme: 'dark' }],
    [1440, 'giangho', {}],
    [1440, 'giangho', { colorScheme: 'dark' }],
    [1440, 'zen', { contrast: 'more' }],
  ]) {
    const at = ' (' + width + 'px ' + style + ' ' + (opts.colorScheme || opts.contrast || 'sáng') + ')';
    const { context, page } = await h.open(width, { touch: width < 700, now: NOW, setup: setStyle(style), ...opts });
    await page.waitForSelector('#quick-add-btn');
    await page.click('#quick-add-btn');
    await page.waitForSelector('#qa-line');
    await page.fill('#qa-line', 'Tưới cây mai 9h #khongco');
    await settle(page);
    for (const s of ['.qa-row dt', '.qa-row dd', '.qa-warn', '.qa-hint', '#qa-line', '#editor-body h2']) {
      const c = await contrast(page, s);
      assert.ok(c !== null, 'có phần tử ' + s + at);
      assert.ok(c >= 4.5, 'chữ ' + s + ' đủ tương phản (' + c.toFixed(2) + ')' + at);
    }
    if (style === 'giangho') {
      // Giọng giang hồ (từ v2.36.0): nút, tiêu đề, nhãn, ba dòng xem trước và lời hướng dẫn không còn giọng Thiền.
      await page.waitForFunction(() => document.querySelector('#editor-body h2')?.textContent === 'Ghi nhanh');
      assert.equal(await page.getAttribute('#quick-add-btn', 'aria-label'), 'Ghi nhanh một nhiệm vụ bằng một câu', 'nút trên thanh trên' + at);
      assert.deepEqual(await page.locator('.qa-row dt').allInnerTexts(), ['Nhiệm vụ', 'Kỳ hạn', 'Đại sự'], 'nhãn ba dòng xem trước' + at);
      assert.match(await page.locator('#editor-body .field').first().innerText(), /^Truyền một câu/, 'nhãn ô gõ' + at);
      await page.fill('#qa-line', '');
      await page.waitForFunction(() => /nhiệm vụ.*đại sự/.test(document.querySelector('.qa-empty')?.textContent || ''));
    }
    await page.fill('#qa-line', '');
    await settle(page);
    const c = await contrast(page, '.qa-empty');
    assert.ok(c >= 4.5, 'lời hướng dẫn đủ tương phản (' + c?.toFixed(2) + ')' + at);
    assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
    // Nút “+” trên thanh trên cũng đủ tương phản với nền thanh.
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    const b = await contrast(page, '#quick-add-btn');
    assert.ok(b >= 3, 'biểu tượng + đủ tương phản (' + b?.toFixed(2) + ')' + at);
    await context.close();
  }
  console.log('quickadd browser ok');
} finally {
  await h.close();
}
