// v1.68.0: chia sẻ web cho báo cáo thu chi tuần. Kiểm ở 390 (chạm) / 820 / 1440 px:
// (A) trong ứng dụng: nút "Xuất link chia sẻ" (Cài đặt) và "Chia sẻ web" (bản xem trước) mở hộp chia sẻ đúng loại báo cáo,
//     mặc định có mật khẩu, gửi đúng kind=finance, hiện link vừa tạo, không tràn ngang;
// (B) trang xem công khai report.html: hiện đúng báo cáo thu chi, không lỗi script, không bật khung chi tiết công việc của báo cáo task.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { startHarness, makeProject } from './lib/browser-harness.mjs';
import worker from '../worker.mjs';
import { financeReport } from '../server/finance-report.mjs';

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const e = (id, type, amount, category) => ({ id, type, amount, category, note: '', date: today });
const seed = () => ({
  schema: 1,
  projects: [
    makeProject('p1', 'Farm Lê Lam Sơn', '#3b8b61', 2, { ledger: [e('a1', 'out', 5000000, 'Thiết bị'), e('a2', 'out', 3000000, 'Nhân sự'), e('a3', 'in', 4000000, 'Doanh thu')] }),
    makeProject('p2', 'Khóa tu mùa thu', '#8054bf', 2, { ledger: [e('b1', 'out', 2000000, 'Dịch vụ'), e('b2', 'in', 5000000, 'Doanh thu')] }),
  ],
  notes: [],
});
const report = financeReport(seed(), today, { shared: true });
assert.ok(report.hasData);

// Máy chủ thật (worker.mjs) để lấy trang report.html và script thật của trang xem công khai.
const web = createServer(async (req, res) => {
  const r = await worker.fetch(new Request('http://localhost' + req.url));
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
});
await new Promise((resolve) => web.listen(0, '127.0.0.1', resolve));

const posts = [];
const setup = async ({ page, state }) => {
  await page.route('**/api/finance-report', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(financeReport(state.workspace, today)) }));
  await page.route('**/api/report-shares', (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    posts.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', url: 'https://kanban.huongthiennature.com/report.html#' + 'f'.repeat(64), mode: 'password', created: Date.now(), expires: Date.now() + 86400000 }) });
  });
};

// Đợi tới khi máy chủ giả nhận thêm một yêu cầu tạo link (không dùng độ trễ cố định).
const afterPost = async (action) => {
  const before = posts.length;
  await action();
  for (let i = 0; i < 250 && posts.length === before; i++) await new Promise((r) => setTimeout(r, 20));
  assert.ok(posts.length > before, 'máy chủ nhận yêu cầu tạo link');
};
const h = await startHarness({ seed });
const inView = (name) => `inside viewport: ${name}`;
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ` (${width}px)`;
    const { context, page } = await h.open(width, { touch, workspace: seed(), setup });
    posts.length = 0;

    // A1. Từ Cài đặt → Báo cáo thu chi tuần → "Xuất link chia sẻ".
    await page.evaluate(() => accountPanel());
    await page.waitForSelector('#editor-body .finance-settings', { state: 'attached' });
    if (await page.evaluate(() => document.querySelector('.finance-settings-group')?.open === false)) await page.click('.finance-settings-group>summary');
    await page.waitForSelector('#share-finance-link', { state: 'visible' });
    const shareBtn = await page.evaluate(() => Math.round(document.querySelector('#share-finance-link').getBoundingClientRect().height));
    assert.ok(shareBtn >= (touch ? 44 : 36), 'nút Xuất link chia sẻ đủ cao: ' + shareBtn + at);
    await page.click('#share-finance-link');
    const dialog = page.locator('dialog.report-share-dialog');
    await dialog.waitFor({ state: 'visible' });
    assert.equal(await dialog.locator('h2').textContent(), 'Chia sẻ báo cáo thu chi tuần', 'đúng loại báo cáo' + at);
    assert.match(await dialog.getAttribute('aria-label'), /thu chi/, 'tên hộp cho trình đọc màn hình' + at);
    assert.match(await dialog.locator('.help-copy').textContent(), /số tiền/, 'cảnh báo báo cáo có số tiền' + at);
    assert.equal(await page.locator('#report-share-mode').inputValue(), 'password', 'báo cáo tiền mặc định có mật khẩu' + at);
    assert.ok(await page.locator('#share-secret-field').isVisible(), 'ô mật khẩu hiện sẵn' + at);
    const fit = await page.evaluate(() => {
      const r = document.querySelector('dialog.report-share-dialog').getBoundingClientRect();
      return { left: r.left, right: r.right, vw: innerWidth, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.ok(fit.left >= -1 && fit.right <= fit.vw + 1 && fit.overflow <= 1, inView('hộp chia sẻ') + at);

    // A2. Tạo link có mật khẩu: máy chủ nhận kind=finance, hiện link vừa tạo.
    await page.fill('input[name=password]', 'Thu-chi-2026!');
    await page.click('#create-report-link');
    await page.waitForFunction(() => document.querySelector('#report-share-result')?.hidden === false);
    assert.deepEqual(posts.at(-1), { mode: 'password', days: 1, kind: 'finance', password: 'Thu-chi-2026!' }, 'yêu cầu tạo link' + at);
    assert.match(await page.inputValue('#created-report-url'), /\/report\.html#f{64}$/, 'hiện link vừa tạo' + at);
    assert.equal(await page.inputValue('input[name=password]'), '', 'xóa mật khẩu khỏi ô sau khi tạo' + at);
    // Chuyển sang công khai thì không gửi mật khẩu, vẫn đúng loại.
    await page.selectOption('#report-share-mode', 'public');
    assert.equal(await page.locator('#share-secret-field').isHidden(), true, 'công khai thì ẩn ô mật khẩu' + at);
    await afterPost(() => page.click('#create-report-link'));
    assert.deepEqual(posts.at(-1), { mode: 'public', days: 1, kind: 'finance' }, 'link công khai' + at);
    await page.click('#close-report-share');
    await page.waitForFunction(() => !document.querySelector('dialog.report-share-dialog'));

    // A3. Từ bản xem trước: nút "Chia sẻ web".
    await page.click('#preview-finance-report');
    await page.waitForSelector('dialog.report-dialog[open] iframe:not([hidden])');
    const toolbar = await page.evaluate(() => {
      const r = document.querySelector('dialog.report-dialog').getBoundingClientRect(),
        b = document.querySelector('#share-finance-preview').getBoundingClientRect();
      return { right: r.right, vw: innerWidth, btnRight: b.right, btnLeft: b.left, dialogLeft: r.left, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.ok(toolbar.btnLeft >= toolbar.dialogLeft - 1 && toolbar.btnRight <= toolbar.right + 1 && toolbar.overflow <= 1, 'nút Chia sẻ web nằm trong thanh công cụ' + at);
    await page.click('#share-finance-preview');
    await page.locator('dialog.report-share-dialog h2').waitFor({ state: 'visible' });
    assert.equal(await page.locator('dialog.report-share-dialog h2').textContent(), 'Chia sẻ báo cáo thu chi tuần', 'chia sẻ từ bản xem trước' + at);
    await context.close();
  }

  // A4. Báo cáo tuần của công việc vẫn mở hộp chia sẻ cũ (không bị đổi sang thu chi, mặc định công khai).
  {
    const { context, page } = await h.open(1440, { workspace: seed(), setup });
    await page.evaluate(() => openReportShare());
    await page.locator('dialog.report-share-dialog h2').waitFor({ state: 'visible' });
    assert.equal(await page.locator('dialog.report-share-dialog h2').textContent(), 'Chia sẻ báo cáo tuần');
    assert.equal(await page.locator('#report-share-mode').inputValue(), 'public');
    assert.ok(!(await page.locator('dialog.report-share-dialog .help-copy').textContent()).includes('số tiền'));
    posts.length = 0;
    await page.click('#create-report-link');
    await page.waitForFunction(() => document.querySelector('#report-share-result')?.hidden === false);
    assert.deepEqual(posts.at(-1), { mode: 'public', days: 1 }, 'báo cáo task không gửi kind');
    await context.close();
  }

  // B. Trang xem công khai.
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ` (${width}px)`;
    const { context, page } = await h.open(width, { touch, workspace: seed() });
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    const view = await context.newPage();
    await view.setViewportSize({ width, height: 1000 });
    view.on('pageerror', (err) => errors.push(err.message));
    await view.route('**/api/report-share/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ locked: false, html: report.html, title: report.subject, expires: Date.now() + 3600000 }) }));
    await view.goto('http://127.0.0.1:' + web.address().port + '/report.html#' + 'a'.repeat(64));
    const frame = view.frameLocator('#shared-report');
    await frame.locator('h1').waitFor();
    const text = await frame.locator('body').innerText();
    for (const needle of ['Bức tranh thu chi', 'Farm Lê Lam Sơn', 'Khóa tu mùa thu', '10.000.000 ₫', '9.000.000 ₫', 'chỉ xem, được chia sẻ']) assert.ok(text.includes(needle), 'trang công khai thiếu: ' + needle + at);
    assert.ok(!text.includes('Cài đặt → Báo cáo thu chi tuần'), 'trang công khai không nhắc tới cài đặt của chủ báo cáo' + at);
    assert.equal(await view.locator('#share-gate').isHidden(), true, 'cổng chờ đã ẩn' + at);
    await view.locator('#share-print').waitFor({ state: 'visible', timeout: 10000 });
    assert.deepEqual(errors, [], 'không có lỗi script khi dựng báo cáo' + at);
    assert.ok((await view.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, 'không tràn ngang' + at);
    assert.ok((await frame.locator('body').evaluate((b) => b.ownerDocument.documentElement.scrollWidth - b.ownerDocument.documentElement.clientWidth)) <= 1, 'báo cáo trong khung không tràn ngang' + at);
    // Bấm các khối của báo cáo: biểu đồ cho chú thích theo dự án; KHÔNG mở khung "Chi tiết công việc" của báo cáo task.
    const circle = frame.locator('.report-donut circle[stroke-dasharray]').first();
    await circle.dispatchEvent('click');
    assert.match(await frame.locator('.report-hover-info').textContent(), /Farm|Khóa tu/, 'chạm biểu đồ hiện tên dự án' + at);
    await frame.locator('.report-sheet>table[role=presentation]').first().click();
    await frame.locator('.report-sheet>table[role=presentation] + table').first().click();
    assert.equal(await frame.locator('.report-detail').count(), 0, 'không có khung chi tiết công việc trong báo cáo thu chi' + at);
    assert.equal(await frame.locator('[role=button]').count(), 0, 'không biến khối thu chi thành nút xem việc' + at);
    assert.deepEqual(errors, [], 'không có lỗi script' + at);
    await context.close();
  }
  console.log('PASS: chia sẻ web báo cáo thu chi — hộp chia sẻ từ Cài đặt và bản xem trước, mặc định mật khẩu, gửi kind=finance, báo cáo task không đổi, trang xem công khai ở 390/820/1440px.');
} finally {
  await h.close();
  web.close();
}
