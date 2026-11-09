// Hồi quy v1.44.0: nội dung gõ trong ô mô tả việc (rich text) không bị biến thành định dạng khi lưu và mở lại.
// "5 * 3 * 2" không thành chữ nghiêng; "__init__" không thành gạch chân; "# tiêu đề", "- việc", "1. năm" gõ như chữ thường
// chứ không thành tiêu đề hay danh sách; "**chữ **" (in đậm kèm khoảng trắng) vẫn in đậm đúng. Kiểm ở 390, 820, 1440 px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 2);
  p.tasks[0].title = 'Chuẩn bị khóa tu';
  p.tasks[0].col = 'Doing';
  p.tasks[0].description = '';
  return { schema: 1, projects: [p], notes: [] };
};
const h = await startHarness({ seed });
try {
  for (const width of [390, 820, 1440]) {
    const at = ` (${width}px)`;
    const { context, page } = await h.open(width, { touch: width < 700 });
    await h.show(page, 'board');
    await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[0]));
    const rich = page.locator('#editor-body .wf-task-description');
    await rich.waitFor({ state: 'attached' });

    // Gõ từng dòng như người dùng: dòng 1 có ký tự định dạng, dòng 2-4 là chữ thường trông giống định dạng.
    await rich.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('5 * 3 * 2 và __init__ và ~~x~~');
    await page.keyboard.press('Enter');
    await page.keyboard.type('# không phải tiêu đề');
    await page.keyboard.press('Enter');
    // "1. " (có khoảng trắng) là phím tắt tạo danh sách có chủ ý; chữ "1.năm" không có khoảng trắng nên là chữ thường.
    await page.keyboard.type('1.năm 2024');
    await page.waitForTimeout(150);

    await page.locator('#editor-form button[type=submit]').click();
    await page.waitForFunction(() => typeof project('p1').tasks[0].description === 'string' && project('p1').tasks[0].description.length > 0);

    // Mở lại việc: không có tiêu đề, danh sách hay chữ nghiêng/gạch chân xuất hiện ngoài ý muốn.
    await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[0]));
    await page.waitForSelector('#editor-body .wf-task-description');
    const shown = await page.evaluate(() => {
      const el = document.querySelector('#editor-body .wf-task-description');
      return {
        text: el.textContent,
        headings: el.querySelectorAll('h1,h2,h3').length,
        lists: el.querySelectorAll('ul,ol').length,
        em: el.querySelectorAll('em').length,
        u: el.querySelectorAll('u').length,
        s: el.querySelectorAll('s').length,
      };
    });
    assert.ok(shown.text.includes('5 * 3 * 2'), 'chữ có dấu * giữ nguyên' + at + ': ' + shown.text);
    assert.ok(shown.text.includes('__init__'), 'chữ có __ giữ nguyên' + at);
    assert.ok(shown.text.includes('~~x~~'), 'chữ có ~~ giữ nguyên' + at);
    assert.ok(shown.text.includes('# không phải tiêu đề'), 'dòng bắt đầu bằng # vẫn là chữ' + at);
    assert.ok(shown.text.includes('1.năm 2024'), 'dòng bắt đầu bằng số. vẫn là chữ' + at);
    assert.equal(shown.headings, 0, 'không có tiêu đề ngoài ý muốn' + at);
    assert.equal(shown.lists, 0, 'không có danh sách ngoài ý muốn' + at);
    assert.equal(shown.em, 0, 'không có chữ nghiêng ngoài ý muốn' + at);
    assert.equal(shown.u, 0, 'không có gạch chân ngoài ý muốn' + at);
    assert.equal(shown.s, 0, 'không có gạch ngang ngoài ý muốn' + at);

    // Định dạng thật vẫn hoạt động: in đậm kèm khoảng trắng ở cuối được giữ đúng.
    const md = await page.evaluate(() => {
      const d = document.createElement('div');
      d.innerHTML = '<p>xin <strong>chào </strong>bạn</p>';
      const out = zenRichMarkdown(d);
      const back = document.createElement('div');
      back.innerHTML = zenFormattedHTML(out);
      return { out, strong: back.querySelectorAll('strong').length, text: back.textContent };
    });
    assert.equal(md.strong, 1, 'in đậm có khoảng trắng vẫn hiển thị đậm' + at + ' ' + md.out);
    assert.equal(md.text, 'xin chào bạn', 'chữ không đổi sau khi định dạng' + at);

    await context.close();
  }
  console.log('PASS: chữ gõ có ký hiệu định dạng (*, __, ~~, #, 1.) được giữ nguyên khi lưu và mở lại; in đậm có khoảng trắng vẫn đúng (390/820/1440px).');
} finally {
  await h.close();
}
