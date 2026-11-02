// Hồi quy v1.15.46: một sự cố đồng bộ chỉ còn hai chỗ nói (viên thuốc + khung báo lỗi có dòng trấn an), không còn thông báo nổi nói lại cùng chuyện;
// dòng tự lưu của trình soạn ghi chú dùng một bộ chữ ("thiết bị", không "máy"); không còn chữ "trên máy" trong các màn hình chính.
import assert from 'node:assert/strict';
import { defaultSeed, startHarness } from './lib/browser-harness.mjs';

const seed = () => ({
  ...defaultSeed(),
  notes: ['n1', 'n2'].map((id, i) => ({ id, title: 'Ghi chú ' + (i + 1), text: 'Một ý tưởng cần được giữ lại', group: 'Vườn', url: '', type: 'note', color: '#7950c8', motif: 'forest' })),
});
const h = await startHarness({ seed });
const failures = [];
const fail = (cfg, step, msg) => failures.push(`[${cfg.label}] ${step}: ${msg}`);

const CONFIGS = [
  { label: '390px cảm ứng', width: 390, touch: true },
  { label: '820px cảm ứng', width: 820, touch: true },
  { label: '1440px', width: 1440, touch: false },
];

// Ghi lại mọi lần gọi notify() (thông báo nổi) và bắt rebaseWorkspace để dựng được nhánh xung đột thật của account.js.
const instrument = (page) =>
  page.evaluate(() => {
    window.__toasts = [];
    const original = notify;
    notify = (text) => {
      window.__toasts.push(String(text));
      original(text);
    };
    window.rebaseWorkspace = async () => false;
  });

const snapshot = (page) =>
  page.evaluate(() => {
    const bar = document.querySelector('#zen-sync-feedback');
    const note = bar?.querySelector('small');
    const btn = bar?.querySelector('button');
    return {
      toasts: window.__toasts,
      toastShown: document.querySelector('#toast')?.classList.contains('show') === true,
      aria: document.querySelector('#save-state')?.getAttribute('aria-label') || '',
      bar: bar?.querySelector('span')?.textContent.trim() || null,
      note: note?.textContent.trim() || null,
      noteSize: note ? parseFloat(getComputedStyle(note).fontSize) : null,
      noteVisible: !!note?.getClientRects().length,
      btn: btn?.textContent.trim() || null,
    };
  });

async function scenario(cfg, kind) {
  const { context, page, server } = await h.open(cfg.width, { touch: cfg.touch });
  await h.show(page, 'projects');
  await instrument(page);
  if (kind === 'invalid') {
    await page.evaluate(() => {
      const done = project('p1').tasks.find((t) => t.col === 'Done');
      done.checks = [{ id: 'cx', text: 'chưa xong', done: false }];
      save();
    });
  } else {
    server.mode = kind;
    await page.evaluate(() => {
      project('p1').tasks[0].title = 'Đổi tên để lưu';
      save();
    });
  }
  const wanted = { reject400: /Máy chủ từ chối/, invalid: /Dữ liệu không hợp lệ/, conflict409: /Xung đột/ }[kind];
  await page.waitForFunction((src) => new RegExp(src).test(document.querySelector('#zen-sync-feedback')?.textContent || ''), wanted.source, { timeout: 15000 });
  await page.waitForTimeout(600); // đủ để một thông báo nổi (nếu còn) kịp xuất hiện
  const st = await snapshot(page);
  const kept = await page.evaluate(() => data.projects.length);
  if (st.toasts.length || st.toastShown) fail(cfg, kind, `còn thông báo nổi trùng sự cố: ${JSON.stringify(st.toasts)}`);
  if (!st.aria.includes(st.bar || '#')) fail(cfg, kind, `viên thuốc "${st.aria}" và khung "${st.bar}" không nói cùng một chuyện`);
  if (!st.note) fail(cfg, kind, 'khung báo lỗi phải có dòng trấn an');
  else {
    const expect = kind === 'conflict409' ? /được giữ nguyên/ : /Bản nháp vẫn ở thiết bị/;
    if (!expect.test(st.note)) fail(cfg, kind, `dòng trấn an "${st.note}" không đúng`);
    if (!st.noteVisible) fail(cfg, kind, 'dòng trấn an phải nhìn thấy được');
    if (st.noteSize < 12) fail(cfg, kind, `dòng trấn an ${st.noteSize}px, phải ≥12px`);
    if (/trên máy/.test(st.note)) fail(cfg, kind, 'dòng trấn an còn chữ "trên máy"');
  }
  const wantBtn = kind === 'conflict409' ? 'Xem các bản dữ liệu' : 'Thử lại';
  if (st.btn !== wantBtn) fail(cfg, kind, `nút ở khung báo lỗi "${st.btn}", cần "${wantBtn}"`);
  if (kept < 1) fail(cfg, kind, 'dữ liệu trong bộ nhớ bị mất');
  // Chỉnh sửa của người dùng vẫn còn nguyên trong ứng dụng (không bị đồng bộ lỗi làm mất hay đổi).
  const edited = await page.evaluate(() => (project('p1').tasks[0].title === 'Đổi tên để lưu' ? 'edited' : project('p1').tasks[0].title));
  if (kind !== 'invalid' && edited !== 'edited') fail(cfg, kind, `chỉnh sửa của người dùng bị mất hoặc đổi: "${edited}"`);
  await context.close();
}

// Nội dung hiển thị không còn "trên máy" (nghĩa "trên thiết bị") ở các màn hình chính; "máy chủ" và "máy tính" là từ khác và được phép.
const OLD_WORD = /trên máy(?! chủ| tính)/i;

async function wording(cfg) {
  const { context, page } = await h.open(cfg.width, { touch: cfg.touch });
  for (const view of ['dashboard', 'projects', 'tasks', 'calendar', 'gantt', 'notes', 'resources', 'archive', 'trash', 'focus', 'versions']) {
    await h.show(page, view).catch(() => {});
    const text = await page.evaluate(() => document.body.innerText);
    const hit = text.match(OLD_WORD);
    if (hit) fail(cfg, 'chữ', `màn hình "${view}" còn "${text.slice(Math.max(0, hit.index - 30), hit.index + 40).replace(/\n/g, ' ')}"`);
  }
  // Dòng tự lưu của trình soạn ghi chú.
  await h.show(page, 'notes');
  await page.evaluate(() => noteForm(data.notes[0]));
  await page.locator('[name=title]').fill('Tự lưu tiêu đề');
  await page.locator('.zen-wysiwyg').fill('Nội dung tự lưu');
  await page.waitForFunction(() => /Đã lưu/.test(document.querySelector('#editor .zen-rich-save-state')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
  const line = await page.evaluate(() => document.querySelector('#editor .zen-rich-save-state')?.textContent.trim() || '');
  if (line !== 'Đã lưu trên thiết bị · Tự đồng bộ') fail(cfg, 'tự lưu ghi chú', `dòng trạng thái là "${line}"`);
  const dialogText = await page.evaluate(() => document.querySelector('#editor')?.innerText || '');
  if (OLD_WORD.test(dialogText)) fail(cfg, 'tự lưu ghi chú', 'hộp thoại ghi chú còn "trên máy"');
  await context.close();
}

try {
  for (const cfg of CONFIGS) {
    for (const kind of ['reject400', 'invalid', 'conflict409']) await scenario(cfg, kind);
    await wording(cfg);
  }
  assert.deepEqual(failures, [], '\n' + failures.join('\n'));
  console.log('PASS sync-alerts: sự cố đồng bộ không còn thông báo nổi trùng (400, dữ liệu không hợp lệ, xung đột), khung báo lỗi có dòng trấn an; dòng tự lưu ghi chú và các màn hình chính dùng "thiết bị".');
} finally {
  await h.close();
}
