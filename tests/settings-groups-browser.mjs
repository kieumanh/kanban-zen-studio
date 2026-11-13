// v2.4.0 (Kiên Cố): mã ứng dụng tìm nhóm Cài đặt và tiêu đề Checklist theo mã / lớp, không theo chữ hiển thị.
//  1. Mỗi nhóm Cài đặt mang data-group (profile, account, notify, weekly, data, help, session) theo đúng thứ tự cũ; tiêu đề
//     nhóm vẫn như cũ. Khối thông báo (Công việc · Việc hằng ngày · Điểm tích lũy) nằm trong nhóm notify.
//  2. Đổi chữ tiêu đề mục (như một lớp chuyển ngữ hay bản dịch) không làm sai nhóm: tiêu đề h3 mang data-section.
//  3. Chi tiết nhiệm vụ: tiêu đề Checklist mang lớp task-check-heading nên thanh tiến độ trực tiếp vẫn được gắn, tiêu đề cũ và dòng nhắc
//     thừa vẫn được gỡ.
//  4. Kiểm tĩnh: mọi chỗ còn so chữ "Checklist" / "Thông báo" đều chỉ là đường lùi sau lối tìm theo lớp / mã.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px; Thiền và Giang hồ.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

// 4. Kiểm tĩnh.
const src = (f) => readFileSync(new URL('../dist/' + f, import.meta.url), 'utf8');
for (const [file, re] of [
  ['taskux.js', /textContent===?'Checklist'/g],
  ['workflow111.js', /textContent===?["']Checklist["']/g],
  ['growth-notify.js', /textContent\.trim\(\) === 'Thông báo'/g],
]) {
  const s = src(file);
  for (const m of s.matchAll(re)) assert.match(s.slice(Math.max(0, m.index - 220), m.index), /(task-check-heading|data-group=notify)[^;]*\|\|/, 'so chữ chỉ là đường lùi: ' + file);
}
assert.doesNotMatch(src('workflow111.js'), /textContent==='Phiên đăng nhập'/, 'không tìm nhóm Phiên đăng nhập theo chữ');
for (const key of ['account', 'notify', 'data']) assert.match(src('account.js'), new RegExp('class="settings-section[^"]*" data-section="' + key + '"'), 'account.js: data-section ' + key);
assert.match(src('projectux.js'), /data-section="weekly"/, 'projectux.js: data-section weekly');

const seed = () => ({ schema: 1, notes: [], projects: [makeProject('p1', 'Alpha', '#7950c8', 4)] });
const h = await startHarness({ seed });
try {
  for (const [width, touch, style] of [
    [390, true, 'zen'],
    [820, true, 'giangho'],
    [1440, false, 'zen'],
    [1440, false, 'giangho'],
  ]) {
    const at = ' (' + width + 'px, ' + style + ')';
    const { context, page } = await h.open(width, { touch, setup: ({ context }) => context.addInitScript((s) => localStorage.setItem('zen-style', s), style) });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await h.show(page, 'dashboard');
    // 1 + 2.
    const groups = async () => {
      await page.evaluate(() => accountPanel());
      await page.waitForSelector('dialog[open] .wf-settings-group[data-group=notify] .nf-blocks', { state: 'attached' });
      const out = await page.evaluate(() => [...document.querySelectorAll('#editor-body > .wf-settings-group')].map((g) => g.dataset.group || '(' + g.className + ')'));
      await page.evaluate(() => document.querySelector('dialog[open]').close());
      await page.waitForTimeout(350);
      return out;
    };
    const keys = (await groups()).filter((k) => !k.startsWith('('));
    assert.deepEqual(keys, ['profile', 'account', 'notify', 'weekly', 'data', 'help', 'session'], 'nhóm Cài đặt đúng mã và thứ tự' + at);
    const titles = await page.evaluate(() => {
      accountPanel();
      const t = Object.fromEntries([...document.querySelectorAll('#editor-body > .wf-settings-group[data-group]')].map((g) => [g.dataset.group, g.querySelector('summary').textContent.trim()]));
      document.querySelector('dialog[open]').close();
      return t;
    });
    if (style === 'zen') assert.deepEqual([titles.notify, titles.weekly, titles.data, titles.session], ['Thông báo', 'Tổng kết tuần', 'Dữ liệu & đồng bộ', 'Phiên đăng nhập'], 'tiêu đề nhóm như cũ' + at);
    await page.waitForTimeout(350);
    // Đổi chữ tiêu đề mục trước khi gom nhóm: vẫn đúng nhóm nhờ data-section.
    const renamed = await page.evaluate(() => {
      // Đổi chữ mọi tiêu đề mục ngay trong HTML của khung Cài đặt (trước bước gom nhóm của workflow111.js).
      const orig = window.modal;
      window.modal = function (html, ...rest) {
        return orig.call(this, String(html).replace(/(<h3 class="settings-section[^"]*" data-section="[a-z]+">)[^<]*/g, '$1Mục đổi chữ'), ...rest);
      };
      try {
        accountPanel();
      } finally {
        window.modal = orig;
      }
      const out = [...document.querySelectorAll('#editor-body > .wf-settings-group[data-group]')].map((g) => g.dataset.group);
      const notify = !!document.querySelector('#editor-body .wf-settings-group[data-group=notify] .nf-blocks');
      document.querySelector('dialog[open]').close();
      return { out, notify };
    });
    assert.deepEqual(renamed.out, keys, 'đổi chữ tiêu đề vẫn đúng nhóm' + at);
    assert.ok(renamed.notify, 'khối thông báo vẫn vào đúng nhóm' + at);
    await page.waitForTimeout(350);
    // 3. Chi tiết nhiệm vụ.
    await h.show(page, 'projects', 'p1');
    await page.evaluate(() => document.querySelector('.task-card')?.click());
    await page.waitForSelector('dialog[open] .task-live-progress', { state: 'attached' });
    const detail = await page.evaluate(() => {
      const body = document.querySelector('#editor-body');
      // Tiêu đề Checklist cũ (task-check-heading) được thay bằng danh sách sắp xếp của workflow111.js: tìm theo lớp nên vẫn gỡ đúng.
      return { live: !!body.querySelector('.task-live-progress'), oldHeading: body.querySelectorAll(':scope > h3.task-check-heading').length, hint: body.querySelectorAll(':scope > .task-edit-hint').length };
    });
    assert.deepEqual(detail, { live: true, oldHeading: 0, hint: 0 }, 'chi tiết nhiệm vụ: thanh tiến độ trực tiếp, gỡ tiêu đề cũ và dòng nhắc thừa' + at);
    await page.evaluate(() => document.querySelector('dialog[open]').close());
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }
  console.log('settings-groups-browser ok');
} finally {
  await h.close();
}
