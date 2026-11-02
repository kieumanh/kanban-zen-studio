// Hồi quy v1.15.53: khu vực xóa việc / xóa dự án có biểu tượng, tiêu đề, mô tả hậu quả, nút viền (không khối đỏ đặc) đủ lớn,
// vừa khung ở 390/820/1440 px, tương phản >= 4,5:1; bấm vẫn mở xác nhận và xóa đúng.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 6), makeProject('p2', 'Dự án phụ', '#c764a2', 2)], notes: [] });
const h = await startHarness({ seed });

const zoneInfo = (page) =>
  page.evaluate(() => {
    const parse = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const contrast = (a, b) => {
      const [x, y] = [lum(parse(a)), lum(parse(b))].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    const zones = [...document.querySelectorAll('#editor .zen-danger-zone')];
    const zone = zones[0];
    if (!zone) return { count: 0 };
    const button = zone.querySelector('[data-action^=delete-]');
    const zr = zone.getBoundingClientRect();
    const br = button.getBoundingClientRect();
    const bs = getComputedStyle(button);
    const note = zone.querySelector('.zen-danger-text span');
    return {
      count: zones.length,
      icon: !!zone.querySelector('.zen-danger-icon svg'),
      iconHidden: zone.querySelector('.zen-danger-icon').getAttribute('aria-hidden'),
      buttonSvg: !!button.querySelector('svg'),
      title: zone.querySelector('.zen-danger-text strong').textContent,
      note: note.textContent,
      noteSize: parseFloat(getComputedStyle(note).fontSize),
      buttonText: button.textContent.trim(),
      action: button.dataset.action,
      h: Math.round(br.height),
      w: Math.round(br.width),
      zoneW: Math.round(zr.width),
      inside: br.left >= zr.left && br.right <= zr.right + 0.5,
      solidBg: bs.backgroundColor,
      contrast: contrast(bs.color, bs.backgroundColor),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dialogOverflow: document.querySelector('#editor').scrollWidth - document.querySelector('#editor').clientWidth,
    };
  });

const check = (label, kind, m, touch, width, expectedAction, expectedButton) => {
  assert.equal(m.count, 1, `${label} ${kind}: phải có đúng một vùng xóa`);
  assert.ok(m.icon && m.buttonSvg, `${label} ${kind}: vùng xóa và nút phải có biểu tượng`);
  assert.equal(m.iconHidden, 'true', `${label} ${kind}: biểu tượng trang trí phải ẩn với trình đọc màn hình`);
  assert.match(m.note, /30 ngày/, `${label} ${kind}: phải nói rõ hậu quả (Thùng rác, 30 ngày)`);
  assert.ok(m.noteSize >= 12, `${label} ${kind}: mô tả cỡ chữ >= 12px`);
  assert.equal(m.action, expectedAction, `${label} ${kind}: nút giữ nguyên data-action`);
  assert.equal(m.buttonText, expectedButton, `${label} ${kind}: nút giữ nguyên chữ`);
  assert.ok(m.h >= 44, `${label} ${kind}: nút cao >= 44px (nhận được ${m.h})`);
  assert.ok(m.inside, `${label} ${kind}: nút không tràn khỏi vùng xóa`);
  assert.ok(m.contrast >= 4.5, `${label} ${kind}: chữ nút tương phản >= 4,5 (nhận được ${m.contrast.toFixed(2)})`);
  assert.notEqual(m.solidBg, 'rgb(214, 83, 128)', `${label} ${kind}: nút không phải khối hồng đặc`);
  assert.ok(m.overflow <= 0 && m.dialogOverflow <= 0, `${label} ${kind}: không tràn ngang (${m.overflow}/${m.dialogOverflow})`);
  if (width <= 520) assert.ok(m.w >= m.zoneW - 48, `${label} ${kind}: điện thoại — nút rộng hết hàng (${m.w}/${m.zoneW})`);
};

try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const label = width + 'px' + (touch ? ' cảm ứng' : '');
    const { context, page } = await h.open(width, { touch });
    await h.show(page, 'projects');
    await page.waitForSelector('#main .task-card');

    // Việc
    await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[0]));
    await page.waitForSelector('#editor .zen-danger-zone');
    check(label, 'việc', await zoneInfo(page), touch, width, 'delete-task', 'Xóa công việc');
    await page.locator('#editor [data-action="delete-task"]').click();
    await page.waitForFunction(() => /^Xóa/.test(document.querySelector('#editor h2')?.textContent || ''));
    await page.locator('#editor-form button[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    assert.ok(!(await page.evaluate(() => project('p1').tasks.some((t) => t.id === 'p1t0'))), `${label}: việc phải bị xóa sau khi xác nhận`);

    // Dự án (nút xóa của ứng dụng luôn xóa dự án đang mở, nên mở biểu mẫu của chính dự án đó)
    await page.evaluate(() => projectForm(project('p1')));
    await page.waitForSelector('#editor .zen-danger-zone');
    check(label, 'dự án', await zoneInfo(page), touch, width, 'delete-project', 'Xóa dự án này');
    await page.locator('#editor [data-action=delete-project]').click();
    await page.waitForFunction(() => /^Xóa/.test(document.querySelector('#editor h2')?.textContent || ''));
    await page.locator('#editor-form button[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    assert.ok(!(await page.evaluate(() => data.projects.some((p) => p.id === 'p1'))), `${label}: dự án phải bị xóa sau khi xác nhận`);

    // Việc mới / dự án mới không có vùng xóa.
    await page.evaluate(() => go('projects', 'p2'));
    await page.waitForFunction(() => view === 'projects' && project()?.id === 'p2');
    await page.evaluate(() => taskForm(project('p2')));
    await page.waitForSelector('#editor-form [name=title]');
    assert.equal(await page.locator('#editor .zen-danger-zone').count(), 0, `${label}: việc mới không có vùng xóa`);
    await page.evaluate(() => document.querySelector('#editor').close());
    await page.evaluate(() => projectForm());
    await page.waitForSelector('#editor-form [name=name]');
    assert.equal(await page.locator('#editor .zen-danger-zone').count(), 0, `${label}: dự án mới không có vùng xóa`);

    await context.close();
    console.log(`  đạt ${label}`);
  }
  console.log('PASS: vùng xóa việc/dự án có biểu tượng, lời giải thích, nút viền đủ lớn, vừa khung; xác nhận và xóa vẫn đúng.');
} finally {
  await h.close();
}
