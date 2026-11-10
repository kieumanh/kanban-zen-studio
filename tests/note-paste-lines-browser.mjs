// Hồi quy v1.49.0: dán hoặc gõ nhiều dòng vào card ghi chú không làm các dòng chồng lên nhau.
// Dòng có chữ tự cao theo nội dung; dòng trống thật giữ khoảng 11px. Kiểm ở 390 (chạm), 820, 1440 px.
import assert from 'node:assert/strict';
import { makeProject, startHarness } from './lib/browser-harness.mjs';

const TEXT = 'Dòng đầu tiên của ghi chú\nDòng thứ hai có chữ dài hơn để kiểm tra việc xuống dòng khi khung hẹp lại trên điện thoại.\n\nĐoạn mới sau dòng trống\n  dòng có thụt đầu dòng';
const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Dự án A', '#7950c8', 1)], notes: [] });
const h = await startHarness({ seed });

// Đo các dòng con của ô soạn: dòng có chữ phải cao ít nhất 20px và không chồng lên dòng kế tiếp.
// Mỗi nút con cấp cao nhất của ô soạn là một dòng (phần tử hoặc chữ thuần khi gõ dòng đầu tiên).
const measure = (page) =>
  page.evaluate(() => {
    const rich = document.querySelector('#editor .zen-wysiwyg');
    const rows = [...rich.childNodes].map((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = node.nodeType === 1 ? node.getBoundingClientRect() : range.getBoundingClientRect();
      const text = node.textContent.trim();
      return { text, top: r.top, bottom: r.bottom, height: r.height, blank: !text, element: node.nodeType === 1 };
    });
    return { rows, markdown: zenRichMarkdown(rich) };
  });

// minText: số dòng có chữ tối thiểu; maxBlank: chiều cao tối đa của dòng trống (dán giữ 11px, gõ tay theo trình duyệt).
function checkRows(state, label, cfg, fail, minText, maxBlank) {
  const texts = state.rows.filter((r) => !r.blank);
  if (texts.length < minText) fail(cfg, `${label}: chỉ có ${texts.length} dòng chữ, cần ít nhất ${minText}`);
  // Dòng là phần tử phải cao theo nội dung (≥20px); chữ thuần đo bằng hộp glyph nên chỉ kiểm chồng lấn.
  for (const r of texts.filter((x) => x.element)) {
    if (r.height < 20) fail(cfg, `${label}: dòng "${r.text.slice(0, 20)}" cao ${Math.round(r.height)}px, cần ≥20px`);
  }
  for (let i = 1; i < state.rows.length; i++) {
    const prev = state.rows[i - 1], cur = state.rows[i];
    if (cur.top < prev.bottom - 1) fail(cfg, `${label}: dòng ${i + 1} chồng lên dòng ${i}`);
  }
  for (const r of state.rows.filter((x) => x.blank)) {
    if (r.height > maxBlank) fail(cfg, `${label}: dòng trống cao ${Math.round(r.height)}px, cần ≤${maxBlank}px`);
  }
}

const failures = [];
const fail = (cfg, msg) => failures.push(`[${cfg.label}] ${msg}`);
const CONFIGS = [
  { label: '390px cảm ứng', width: 390, touch: true },
  { label: '820px', width: 820, touch: false },
  { label: '1440px', width: 1440, touch: false },
];

async function run(cfg) {
  const { context, page } = await h.open(cfg.width, { touch: cfg.touch, workspace: seed() });
  await h.show(page, 'notes');
  await page.evaluate(() => noteForm());
  await page.waitForSelector('#editor .zen-wysiwyg', { state: 'attached' });
  await page.locator('#editor .zen-wysiwyg').click();

  // 1. Dán nhiều dòng (văn bản thuần).
  await page.evaluate((text) => {
    const rich = document.querySelector('#editor .zen-wysiwyg');
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    rich.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, TEXT);
  await page.waitForTimeout(120);
  const pasted = await measure(page);
  checkRows(pasted, 'dán', cfg, fail, 4, 14);
  if (!pasted.markdown.includes('Dòng đầu tiên của ghi chú\nDòng thứ hai')) fail(cfg, 'dán: thứ tự dòng bị đổi');

  // 2. Gõ tay nhiều dòng trong ô trống khác.
  await page.evaluate(() => document.querySelector('#editor .zen-wysiwyg').replaceChildren());
  await page.locator('#editor .zen-wysiwyg').click();
  await page.keyboard.type('Dòng một đã gõ');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Dòng hai đã gõ');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Dòng bốn');
  await page.waitForTimeout(120);
  checkRows(await measure(page), 'gõ', cfg, fail, 3, 30);

  await context.close();
}

try {
  for (const cfg of CONFIGS) await run(cfg);
  assert.deepEqual(failures, [], '\n' + failures.join('\n'));
  console.log('PASS note-paste-lines: dán và gõ nhiều dòng vào ghi chú không chồng dòng; dòng trống giữ khoảng 11px (390 chạm, 820, 1440px).');
} finally {
  await h.close();
}
