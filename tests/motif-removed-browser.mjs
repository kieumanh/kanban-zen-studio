// Hồi quy v1.15.50: dự án và việc không còn lựa chọn họa tiết, không còn vẽ họa tiết lên thẻ/trang (đọc rối mắt),
// nhưng họa tiết đã lưu của người dùng KHÔNG bị mất hay bị ghi đè khi lưu lại. Họa tiết của ghi chú không đổi.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 8, { motif: 'forest' });
  p1.tasks[0].motif = 'lotus';
  const p2 = makeProject('p2', 'Hương Thiền Nature — Website', '#c764a2', 4, { motif: 'lotus' });
  return { schema: 1, projects: [p1, p2], notes: [] };
};
const h = await startHarness({ seed });

// Mọi nơi có thể còn vẽ họa tiết: thuộc tính data-zen-art khác 'none', biến --zen-art, hoặc ảnh nền url(...).
const artIn = (page, selector) =>
  page.evaluate((selector) => {
    const bad = [];
    for (const el of document.querySelectorAll(selector)) {
      const art = el.dataset.zenArt;
      const css = getComputedStyle(el);
      if ((art && art !== 'none') || el.style.getPropertyValue('--zen-art') || /url\(/.test(css.backgroundImage)) bad.push((el.className || el.id) + ' art=' + art + ' bg=' + css.backgroundImage.slice(0, 40));
    }
    return { count: document.querySelectorAll(selector).length, bad };
  }, selector);

const dialogText = (page) => page.evaluate(() => document.querySelector('#editor').textContent);
const saved = (page) =>
  page.evaluate(() => ({
    projectMotif: data.projects.find((p) => p.id === 'p1').motif,
    otherProjectMotif: data.projects.find((p) => p.id === 'p2').motif,
    taskMotif: data.projects.find((p) => p.id === 'p1').tasks[0].motif,
  }));

try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const label = width + 'px' + (touch ? ' cảm ứng' : '');
    const { context, page } = await h.open(width, { touch });

    // 1. Bảng Kanban của dự án có họa tiết 'forest', việc có họa tiết 'lotus': không vẽ gì.
    await h.show(page, 'projects');
    await page.waitForSelector('#main .task-card');
    const main = await artIn(page, '#main');
    assert.deepEqual(main.bad, [], `${label}: trang dự án không được vẽ họa tiết: ${main.bad}`);
    const cards = await artIn(page, '#main .task-card');
    assert.ok(cards.count >= 4, `${label}: phải có thẻ việc để kiểm tra`);
    assert.deepEqual(cards.bad, [], `${label}: thẻ việc không được vẽ họa tiết: ${cards.bad}`);

    // 2. Tổng quan: thẻ dự án không vẽ họa tiết.
    await h.show(page, 'dashboard');
    await page.waitForSelector('#main .project-card');
    const projects = await artIn(page, '#main .project-card');
    assert.ok(projects.count >= 2, `${label}: phải có thẻ dự án để kiểm tra`);
    assert.deepEqual(projects.bad, [], `${label}: thẻ dự án không được vẽ họa tiết: ${projects.bad}`);

    // 3. Chi tiết việc có họa tiết 'lotus': không có lựa chọn, không có chữ "Họa tiết"; lưu lại vẫn giữ 'lotus'.
    await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[0]));
    await page.waitForSelector('#editor-form [name=title]');
    assert.equal(await page.locator('#editor .task-motif-picker, #editor [data-task-motif]').count(), 0, `${label}: chi tiết việc không được còn lựa chọn họa tiết`);
    assert.doesNotMatch(await dialogText(page), /Họa tiết/, `${label}: chi tiết việc không được nhắc tới "Họa tiết"`);
    assert.equal(await page.locator('#editor-form input[type=hidden][name=motif]').inputValue(), 'lotus', `${label}: họa tiết đã lưu của việc phải được giữ trong biểu mẫu`);
    await page.locator('#editor-form [name=title]').fill('Việc đã đổi tên ' + label);
    await page.locator('#editor-form button[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    let s = await saved(page);
    assert.equal(s.taskMotif, 'lotus', `${label}: lưu chi tiết việc không được làm mất họa tiết đã lưu (nhận được ${s.taskMotif})`);

    // 4. Sửa dự án có họa tiết 'forest': không có lựa chọn, không có chữ "Họa tiết"; lưu lại vẫn giữ 'forest'.
    await page.evaluate(() => projectForm(project('p1')));
    await page.waitForSelector('#editor-form [name=name]');
    assert.equal(await page.locator('#editor .project-motif-picker, #editor [data-project-motif]').count(), 0, `${label}: biểu mẫu dự án không được còn lựa chọn họa tiết`);
    assert.doesNotMatch(await dialogText(page), /Họa tiết/, `${label}: biểu mẫu dự án không được nhắc tới "Họa tiết"`);
    assert.equal(await page.locator('#editor-form input[type=hidden][name=project-motif]').inputValue(), 'forest', `${label}: họa tiết đã lưu của dự án phải được giữ trong biểu mẫu`);
    await page.locator('#editor-form [name=name]').fill('Khóa tu mùa thu ' + label);
    await page.locator('#editor-form button[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    s = await saved(page);
    assert.equal(s.projectMotif, 'forest', `${label}: lưu dự án không được làm mất họa tiết đã lưu (nhận được ${s.projectMotif})`);
    assert.equal(s.otherProjectMotif, 'lotus', `${label}: dự án khác không bị đụng tới`);

    // 5. Thêm việc mới và dự án mới: không có lựa chọn; bản ghi mới không mang họa tiết.
    await page.evaluate(() => taskForm(project('p1')));
    await page.waitForSelector('#editor-form [name=title]');
    assert.equal(await page.locator('#editor .task-motif-picker, #editor [data-task-motif]').count(), 0, `${label}: biểu mẫu thêm việc không được còn lựa chọn họa tiết`);
    await page.locator('#editor-form [name=title]').fill('Việc mới ' + label);
    await page.locator('#editor-form button[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    const created = await page.evaluate(() => project('p1').tasks.find((t) => t.title.startsWith('Việc mới')));
    assert.ok(created, `${label}: việc mới phải được tạo`);
    assert.ok(!created.motif || created.motif === 'none', `${label}: việc mới không được tự mang họa tiết của dự án (nhận được ${created.motif})`);

    await page.evaluate(() => projectForm());
    await page.waitForSelector('#editor-form [name=name]');
    assert.equal(await page.locator('#editor .project-motif-picker, #editor [data-project-motif]').count(), 0, `${label}: biểu mẫu dự án mới không được còn lựa chọn họa tiết`);
    await page.locator('#editor-form [name=name]').fill('Dự án mới ' + label);
    await page.locator('#editor-form button[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    const fresh = await page.evaluate(() => data.projects.find((p) => p.name.startsWith('Dự án mới')));
    assert.ok(fresh, `${label}: dự án mới phải được tạo`);
    assert.ok(!fresh.motif || fresh.motif === 'none', `${label}: dự án mới không mang họa tiết (nhận được ${fresh.motif})`);

    // 6. Phạm vi: ghi chú vẫn có lựa chọn họa tiết riêng (không thuộc yêu cầu gỡ).
    await h.show(page, 'notes');
    await page.evaluate(() => noteForm());
    await page.waitForSelector('#editor .note-motif-picker');
    assert.ok(await page.locator('#editor .note-motif-picker').count(), `${label}: ghi chú vẫn phải có lựa chọn họa tiết`);
    await page.evaluate(() => document.querySelector('#editor').close());

    await context.close();
    console.log(`  đạt ${label}`);
  }
  console.log('PASS: dự án và việc không còn chọn/vẽ họa tiết; họa tiết đã lưu được giữ nguyên khi lưu lại; ghi chú không đổi.');
} finally {
  await h.close();
}
