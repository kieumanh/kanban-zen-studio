// v2.55.0 (Sao Lưu Hằng Tuần): khối “Sao lưu hằng tuần” ở Cài đặt → Dữ liệu & đồng bộ (dist/backups.js).
// Máy chủ giả trả /api/backups; kiểm ở 390 (chạm), 820 (chạm), 1440 px, cả Thiền lẫn Giang hồ:
//  1. Khối nằm trong nhóm Dữ liệu & đồng bộ; chỉ hỏi máy chủ khi mở nhóm (mở Cài đặt chưa gọi); liệt kê đúng các bản (ngày theo mã bản, số dự án / việc / ghi chú, dung lượng).
//  2. Nằm gọn trong hộp thoại, không tràn ngang, nút đủ lớn để chạm; Giang hồ đổi chữ (Sao lục, Hoàn nguyên, Tự hành, Đại sự…), Thiền giữ nguyên.
//  3. “Sao lưu ngay” tạo bản thủ công và hiện lên đầu danh sách; báo trạng thái.
//  4. Khôi phục: hỏi xác nhận ngay trong dòng (Giữ nguyên thì không gọi máy chủ, không đổi dữ liệu); xác nhận thì ĐẨY thay đổi chưa đồng bộ lên máy chủ trước,
//     rồi đọc bản, rồi nhờ máy chủ lưu bản hiện tại thành “Trước khi khôi phục”, rồi mới thay dữ liệu; có thể hoàn tác; có thông báo.
//  5. Mọi lỗi đều giữ nguyên dữ liệu: bản hỏng, bản sai cấu trúc, máy chủ không lưu được bản hiện tại, dữ liệu hiện tại chưa đồng bộ được.
//  6. Xóa một bản (có xác nhận); lỗi tải danh sách có nút tải lại; kho chưa sẵn sàng thì khóa nút; chế độ chỉ xem khóa nút khôi phục.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, notes: [], projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 6), makeProject('p2', 'Hương Thiền Nature', '#c764a2', 3)] });
const olderWorkspace = () => ({ schema: 1, notes: [], projects: [makeProject('b1', 'Dự án bản cũ', '#e78c56', 2)] });
const baseItems = () => [
  { id: '2026-11-22-auto', kind: 'auto', createdAt: '2026-11-21T20:05:00.000Z', revision: 9, size: 4096, projects: 3, tasks: 23, notes: 5 },
  { id: '2026-11-18T101500-manual', kind: 'manual', createdAt: '2026-11-18T03:15:00.000Z', revision: 8, size: 1536, projects: 2, tasks: 9, notes: 0 },
  { id: '2026-11-17T083000-restore', kind: 'restore', createdAt: '2026-11-17T01:30:00.000Z', revision: 7, size: 900000, projects: 1, tasks: 4, notes: 1 },
];

// Máy chủ giả cho /api/backups: ghi lại thứ tự gọi và bản chụp dữ liệu máy chủ lúc nhận “restore”.
function fakeBackups(state) {
  const api = { log: [], items: baseItems(), snapshots: [], listFails: false, available: true, restoreFails: false, targetKind: 'ok', counter: 0 };
  api.handler = async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname.slice(5),
      send = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'backups' && req.method() === 'GET') {
      api.log.push('list');
      if (api.listFails) return send(500, { error: 'Mô phỏng lỗi danh sách' });
      return send(200, { available: api.available, auto: true, keep: { auto: 8, other: 5 }, items: api.available ? api.items : [] });
    }
    if (path === 'backups' && req.method() === 'POST') {
      const kind = req.postDataJSON().kind;
      api.log.push('make:' + kind);
      if (kind === 'restore') {
        if (api.restoreFails) return send(500, { error: 'Mô phỏng: kho sao lưu từ chối ghi' });
        api.snapshots.push(structuredClone(state.workspace));
      }
      const item = { id: '2026-11-18T1200' + String(10 + api.counter++) + '-' + kind, kind, createdAt: '2026-11-18T05:00:00.000Z', revision: 10, size: 2048, projects: 2, tasks: 9, notes: 0 };
      api.items.unshift(item);
      return send(200, { item });
    }
    const m = /^backups\/([^/]+)$/.exec(path);
    if (m && req.method() === 'GET') {
      api.log.push('get:' + m[1]);
      if (api.targetKind === 'corrupt') return send(422, { error: 'Bản sao bị hỏng, không đọc được.' });
      const data = api.targetKind === 'invalid' ? { schema: 1, projects: 'không phải danh sách', notes: [] } : olderWorkspace();
      return send(200, { id: m[1], kind: 'auto', createdAt: '2026-11-21T20:05:00.000Z', revision: 9, data });
    }
    if (m && req.method() === 'DELETE') {
      api.log.push('delete:' + m[1]);
      api.items = api.items.filter((i) => i.id !== m[1]);
      return send(200, { ok: true });
    }
    return send(404, { error: 'Không có' });
  };
  return api;
}

const until = async (fn, label, tries = 80) => {
  for (let i = 0; i < tries; i++) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.fail('quá thời gian chờ: ' + label);
};
const block = (page) => page.locator('#zen-backups');
const rows = (page) => page.evaluate(() => [...document.querySelectorAll('#zen-backups .zen-backup-row')].map((r) => ({ id: r.dataset.backup, kind: r.dataset.kind, title: r.querySelector('strong').textContent.trim(), meta: r.querySelector('small').textContent.trim() })));
const statusIs = (page, re, label) => until(async () => re.test((await status(page)).trim()), label + ': ' + re);
const status = (page) => page.locator('#zen-backups .zen-backups-status').innerText();
async function openSettings(page) {
  await page.evaluate(() => accountPanel());
  await page.waitForSelector('dialog[open] #zen-backups', { state: 'attached', timeout: 8000 });
}
async function openData(page) {
  await page.locator('#editor-body details[data-group=data] > summary').click();
  await page.waitForFunction(() => document.querySelector('#editor-body details[data-group=data]').open);
}

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const style of ['zen', 'giangho']) {
      const gh = style === 'giangho';
      const at = ' (' + width + 'px, ' + (gh ? 'Giang hồ' : 'Thiền') + ')';
      const full = (width === 1440 && !gh) || (width === 390 && gh); // luồng đầy đủ chạy ở hai biến thể; các biến thể khác kiểm bố cục và chữ
      let api;
      const { context, page, server } = await h.open(width, {
        touch,
        workspace: seed(),
        setup: async ({ context, page, state }) => {
          await context.addInitScript((s) => localStorage.setItem('zen-style', s), style);
          api = fakeBackups(state);
          await page.route('**/api/backups**', (route) => api.handler(route));
        },
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'dashboard');

      // 1. Khối có trong nhóm Dữ liệu & đồng bộ; chưa gọi máy chủ khi mới mở Cài đặt.
      await openSettings(page);
      assert.equal(await page.evaluate(() => !!document.querySelector('#editor-body details[data-group=data] > .wf-settings-content > #zen-backups')), true, 'khối nằm trong nhóm Dữ liệu & đồng bộ' + at);
      await new Promise((r) => setTimeout(r, 400));
      assert.deepEqual(api.log, [], 'mở Cài đặt chưa hỏi máy chủ về sao lưu' + at);
      await openData(page);
      await until(async () => (await rows(page)).length === 3, 'danh sách hiện đủ 3 bản' + at);
      assert.deepEqual(api.log, ['list'], 'mở nhóm Dữ liệu mới hỏi một lần' + at);
      const list = await rows(page);
      assert.deepEqual(list.map((r) => r.id), ['2026-11-22-auto', '2026-11-18T101500-manual', '2026-11-17T083000-restore'], 'đúng thứ tự máy chủ trả về' + at);
      if (gh) await page.waitForFunction(() => document.querySelector('#zen-backups .zen-backup-main strong')?.textContent.startsWith('Tự hành'), null, { timeout: 8000 });
      const shown = await rows(page);
      const kinds = gh ? ['Tự hành', 'Tự tay', 'Trước lúc hoàn nguyên'] : ['Tự động', 'Thủ công', 'Trước khi khôi phục'];
      assert.deepEqual(shown.map((r) => r.title), [kinds[0] + ' · 22/11/2026', kinds[1] + ' · 18/11/2026 10:15', kinds[2] + ' · 17/11/2026 08:30'], 'nhãn bản: loại + ngày giờ theo mã bản' + at);
      assert.deepEqual(
        shown.map((r) => r.meta),
        gh ? ['3 đại sự · 23 nhiệm vụ · 5 quyển · 4 KB', '2 đại sự · 9 nhiệm vụ · 0 quyển · 2 KB', '1 đại sự · 4 nhiệm vụ · 1 quyển · 879 KB'] : ['3 dự án · 23 việc · 5 ghi chú · 4 KB', '2 dự án · 9 việc · 0 ghi chú · 2 KB', '1 dự án · 4 việc · 1 ghi chú · 879 KB'],
        'số lượng và dung lượng' + at,
      );

      // 2. Bố cục và chữ.
      if (gh) await page.waitForFunction(() => document.querySelector('#zen-backups h4')?.textContent === 'Sao lục hằng tuần' && /bản sao lục/.test(document.querySelector('#zen-backups')?.innerText || ''), null, { timeout: 8000 });
      const layout = await page.evaluate(() => {
        const dialog = document.querySelector('dialog[open]'),
          box = document.querySelector('#zen-backups'),
          d = dialog.getBoundingClientRect(),
          buttons = [...box.querySelectorAll('button')].map((b) => ({ text: b.textContent.trim(), h: b.offsetHeight, ok: b.getBoundingClientRect().left >= d.left - 1 && b.getBoundingClientRect().right <= d.right + 1 })),
          rowsFit = [...box.querySelectorAll('.zen-backup-row')].every((r) => r.getBoundingClientRect().right <= d.right + 1 && r.getBoundingClientRect().left >= d.left - 1);
        return { buttons, rowsFit, scrollOk: dialog.scrollWidth <= dialog.clientWidth + 1, title: box.querySelector('h4').textContent.trim(), text: box.innerText };
      });
      assert.ok(layout.rowsFit && layout.scrollOk, 'không tràn ngang' + at);
      assert.ok(layout.buttons.length >= 8 && layout.buttons.every((b) => b.h >= 40 && b.ok), 'nút đủ lớn, nằm gọn: ' + JSON.stringify(layout.buttons) + at);
      if (gh) {
        assert.equal(layout.title, 'Sao lục hằng tuần', 'tiêu đề Giang hồ' + at);
        assert.deepEqual(layout.buttons.slice(0, 2).map((b) => b.text), ['Sao lục ngay', 'Duyệt lại danh sách'], 'nút đầu Giang hồ' + at);
        assert.deepEqual(layout.buttons.slice(2, 4).map((b) => b.text), ['Hoàn nguyên', 'Xóa'], 'nút từng dòng Giang hồ' + at);
        assert.doesNotMatch(layout.text, /sao lưu|khôi phục|dự án|ghi chú|đồng bộ/i, 'không còn chữ Thiền: ' + layout.text + at);
        assert.match(layout.text, /Giữ 8 bản tự hành gần nhất; bản tự tay và bản “Trước lúc hoàn nguyên” giữ 5 bản mỗi loại\./, 'câu giữ bản Giang hồ' + at);
      } else {
        assert.equal(layout.title, 'Sao lưu hằng tuần', 'tiêu đề Thiền' + at);
        assert.deepEqual(layout.buttons.slice(0, 4).map((b) => b.text), ['Sao lưu ngay', 'Tải lại danh sách', 'Khôi phục', 'Xóa'], 'nút Thiền' + at);
        assert.match(layout.text, /Giữ 8 bản tự động gần nhất; bản thủ công và bản “Trước khi khôi phục” giữ 5 bản mỗi loại\./, 'câu giữ bản Thiền' + at);
      }

      if (full) {
        // 3. Sao lưu ngay.
        await block(page).getByRole('button', { name: gh ? 'Sao lục ngay' : 'Sao lưu ngay' }).click();
        await until(async () => (await rows(page)).length === 4, 'bản mới hiện lên danh sách' + at);
        assert.equal((await rows(page))[0].kind, 'manual', 'bản mới là bản thủ công, ở đầu danh sách' + at);
        assert.deepEqual(api.log, ['list', 'make:manual', 'list'], 'tạo rồi tải lại danh sách' + at);
        await statusIs(page, gh ? /^Đã sao lục: Tự tay · 18\/11\/2026 12:00\.$/ : /^Đã sao lưu: Thủ công · 18\/11\/2026 12:00\.$/, 'báo đã sao lưu' + at);
        api.log.length = 0;

        // 4a. Khôi phục rồi đổi ý: không gọi máy chủ, không đổi dữ liệu.
        const before = await page.evaluate(() => JSON.stringify(data));
        await page.locator('#zen-backups [data-backup="2026-11-22-auto"] [data-zen-backup=restore]').click();
        const ask = page.locator('#zen-backups [data-backup="2026-11-22-auto"] .zen-backup-ask');
        await ask.waitFor();
        assert.match(await ask.innerText(), gh ? /Hoàn nguyên dữ liệu về bản 22\/11\/2026\? Dữ liệu hiện tại sẽ được cất thành bản “Trước lúc hoàn nguyên”\./ : /Khôi phục dữ liệu về bản 22\/11\/2026\? Dữ liệu hiện tại sẽ được lưu thành bản “Trước khi khôi phục”\./, 'câu xác nhận' + at);
        assert.equal(await page.evaluate(() => document.activeElement?.dataset?.zenBackup), 'restore-yes', 'tiêu điểm chuyển vào nút xác nhận' + at);
        await ask.getByRole('button', { name: 'Giữ nguyên' }).click();
        await ask.waitFor({ state: 'detached' });
        assert.equal(await page.evaluate(() => document.activeElement?.dataset?.zenBackup), 'restore', 'đổi ý: tiêu điểm về nút Khôi phục của dòng' + at);
        assert.deepEqual(api.log, [], 'đổi ý không gọi máy chủ' + at);
        assert.equal(await page.evaluate(() => JSON.stringify(data)), before, 'đổi ý không đổi dữ liệu' + at);

        // 5. Các lỗi đều giữ nguyên dữ liệu.
        const attempt = async (id) => {
          await page.locator('#zen-backups [data-backup="' + id + '"] [data-zen-backup=restore]').click();
          await page.locator('#zen-backups [data-zen-backup=restore-yes]').click();
        };
        // 5a. Bản hỏng.
        api.targetKind = 'corrupt';
        await attempt('2026-11-22-auto');
        await until(async () => /hỏng/.test(await status(page)), 'báo bản hỏng' + at);
        assert.deepEqual(api.log, ['get:2026-11-22-auto'], 'bản hỏng: chưa lưu bản “trước khi khôi phục”' + at);
        assert.equal(await page.evaluate(() => JSON.stringify(data)), before, 'bản hỏng: dữ liệu giữ nguyên' + at);
        // 5b. Sai cấu trúc.
        api.log.length = 0;
        api.targetKind = 'invalid';
        await attempt('2026-11-22-auto');
        await until(async () => /không hợp lệ/.test(await status(page)), 'báo bản không hợp lệ' + at);
        assert.deepEqual(api.log, ['get:2026-11-22-auto'], 'bản sai cấu trúc: không lưu bản hiện tại, không thay' + at);
        assert.equal(await page.evaluate(() => JSON.stringify(data)), before, 'bản sai cấu trúc: dữ liệu giữ nguyên' + at);
        // 5c. Máy chủ không lưu được bản hiện tại → không thay dữ liệu.
        api.log.length = 0;
        api.targetKind = 'ok';
        api.restoreFails = true;
        await attempt('2026-11-22-auto');
        await until(async () => /Chưa lưu được bản hiện tại/.test(await status(page)), 'báo chưa lưu được bản hiện tại' + at);
        assert.deepEqual(api.log, ['get:2026-11-22-auto', 'make:restore'], 'thử lưu bản hiện tại rồi dừng' + at);
        assert.equal(await page.evaluate(() => JSON.stringify(data)), before, 'không lưu được bản hiện tại: dữ liệu giữ nguyên' + at);
        assert.equal(await page.evaluate(() => undoData), null, 'chưa đổi gì nên chưa có gì để hoàn tác' + at);
        api.restoreFails = false;
        // 5d. Dữ liệu hiện tại không đồng bộ được (máy chủ từ chối) → dừng, không gọi gì.
        api.log.length = 0;
        await page.evaluate(() => {
          data.projects[0].tasks[0].title = 'Sửa chưa đồng bộ';
          save();
        });
        server.mode = 'reject400';
        await attempt('2026-11-22-auto');
        await until(async () => /chưa đồng bộ xong/.test(await status(page)) || /chưa thông mạch xong/.test(await status(page)), 'báo chưa đồng bộ xong' + at, 120);
        assert.deepEqual(api.log, [], 'chưa đồng bộ được: không gọi máy chủ sao lưu' + at);
        assert.equal(await page.evaluate(() => data.projects[0].tasks[0].title), 'Sửa chưa đồng bộ', 'chưa đồng bộ được: dữ liệu giữ nguyên' + at);
        server.mode = 'ok';
        await page.evaluate(() => {
          syncBlocked = false;
        });
        await page.evaluate(() => flushCloud(true));
        await until(async () => !(await page.evaluate(() => dirty)), 'đồng bộ lại xong' + at, 120);
        assert.equal(server.workspace.projects[0].tasks[0].title, 'Sửa chưa đồng bộ', 'máy chủ có bản sửa' + at);

        // 4b. Khôi phục thật: thay đổi chưa đồng bộ được đẩy lên TRƯỚC khi lưu bản hiện tại.
        api.log.length = 0;
        api.snapshots.length = 0;
        await page.evaluate(() => {
          data.projects[0].tasks[0].title = 'Sửa ngay trước khi khôi phục';
          save();
        });
        await attempt('2026-11-22-auto');
        await until(async () => (await page.evaluate(() => data.projects.map((p) => p.id).join(','))) === 'b1', 'dữ liệu được thay bằng bản cũ' + at, 150);
        assert.deepEqual(api.log, ['get:2026-11-22-auto', 'make:restore'], 'đọc bản rồi lưu bản hiện tại' + at);
        assert.equal(api.snapshots.length, 1);
        assert.equal(api.snapshots[0].projects[0].tasks[0].title, 'Sửa ngay trước khi khôi phục', 'lúc máy chủ lưu bản “trước khi khôi phục”, thay đổi chưa đồng bộ đã lên đủ' + at);
        assert.equal(await page.evaluate(() => JSON.parse(undoData).projects[0].tasks[0].title), 'Sửa ngay trước khi khôi phục', 'có thể hoàn tác (undoData giữ dữ liệu trước đó)' + at);
        await until(async () => server.workspace.projects.map((p) => p.id).join(',') === 'b1', 'máy chủ nhận dữ liệu đã khôi phục' + at, 150);
        assert.equal(await page.evaluate(() => !!document.querySelector('dialog[open]')), false, 'hộp thoại Cài đặt đã đóng' + at);
        await page.waitForFunction(() => view === 'dashboard');
        const toastRe = gh ? /^Đã hoàn nguyên dữ liệu về bản 22\/11\/2026\. Dữ liệu trước đó nằm trong mục “Trước lúc hoàn nguyên”\.$/ : /^Đã khôi phục dữ liệu về bản 22\/11\/2026\. Dữ liệu trước đó nằm trong mục “Trước khi khôi phục”\.$/;
        await until(async () => toastRe.test((await page.locator('#toast').innerText()).trim()), 'thông báo đã khôi phục: ' + (await page.locator('#toast').innerText()) + at);

        // 6. Xóa một bản (có xác nhận).
        api.log.length = 0;
        await openSettings(page);
        await openData(page);
        await until(async () => (await rows(page)).length >= 3, 'danh sách tải lại' + at);
        const count = (await rows(page)).length;
        await page.locator('#zen-backups [data-backup="2026-11-17T083000-restore"] [data-zen-backup=delete]').click();
        const confirmText = await page.locator('#zen-backups [data-backup="2026-11-17T083000-restore"] .zen-backup-ask').innerText();
        assert.match(confirmText, gh ? /Hủy bản sao lục 17\/11\/2026 08:30\? Không hoàn lại được\./ : /Xóa bản sao 17\/11\/2026 08:30\? Không hoàn lại được\./, 'câu xác nhận xóa' + at);
        await page.locator('#zen-backups [data-zen-backup=delete-yes]').click();
        await until(async () => (await rows(page)).length === count - 1, 'dòng đã xóa biến mất' + at);
        assert.ok(api.log.includes('delete:2026-11-17T083000-restore'), 'gọi xóa đúng bản' + at);
        await statusIs(page, gh ? /^Đã hủy bản sao lục\.$/ : /^Đã xóa bản sao\.$/, 'báo đã xóa' + at);

        // Lỗi tải danh sách → có nút tải lại.
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('dialog[open]'));
        api.listFails = true;
        await openSettings(page);
        await openData(page);
        await until(async () => /Chưa (tải|duyệt) được danh sách/.test(await block(page).innerText()), 'báo lỗi tải danh sách' + at);
        assert.match(await block(page).innerText(), gh ? /Chưa duyệt được danh sách: Mô phỏng lỗi danh sách/ : /Chưa tải được danh sách: Mô phỏng lỗi danh sách/, 'nêu lý do' + at);
        api.listFails = false;
        await block(page).getByRole('button', { name: gh ? 'Duyệt lại danh sách' : 'Tải lại danh sách' }).click();
        await until(async () => (await rows(page)).length >= 3, 'tải lại được' + at);

        // Kho chưa sẵn sàng → khóa nút Sao lưu ngay.
        api.available = false;
        await block(page).getByRole('button', { name: gh ? 'Duyệt lại danh sách' : 'Tải lại danh sách' }).click();
        await until(async () => await page.locator('#zen-backups [data-zen-backup=make]').isDisabled(), 'kho chưa sẵn sàng: khóa nút' + at);
        assert.match(await block(page).locator('.zen-backups-intro').innerText(), gh ? /Kho sao lục trên máy chủ chưa sẵn sàng/ : /Kho sao lưu trên máy chủ chưa sẵn sàng/, 'nói rõ kho chưa sẵn sàng' + at);
        api.available = true;

        // Chế độ chỉ xem: khóa nút khôi phục.
        await block(page).getByRole('button', { name: gh ? 'Duyệt lại danh sách' : 'Tải lại danh sách' }).click();
        await until(async () => (await rows(page)).length >= 3, 'danh sách lại hiện' + at);
        await page.evaluate(() => {
          contentReadOnly = true;
          return zenBackups.refresh();
        });
        await until(async () => await page.locator('#zen-backups [data-zen-backup=restore]').first().isDisabled(), 'chỉ xem: khóa khôi phục' + at);
        assert.equal(await page.locator('#zen-backups [data-zen-backup=make]').isDisabled(), true, 'chỉ xem: khóa sao lưu ngay' + at);
        await page.evaluate(() => {
          contentReadOnly = false;
        });
      }
      assert.deepEqual(errors, [], 'không có lỗi trang' + at);
      await context.close();
    }
  }
  console.log('PASS: sao lưu hằng tuần — danh sách, sao lưu ngay, khôi phục an toàn, xóa, lỗi (390/820/1440, Thiền và Giang hồ)');
} finally {
  await h.close();
}
