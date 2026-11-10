// Hồi quy v1.17.1: giao diện thông báo gọn và dễ quét ở 390/820/1440px, sáng và tối.
// Hộp thoại Thông báo gom theo nhóm có số lượng, mỗi việc một hàng, nhóm dài thu gọn 5 hàng + "Hiện thêm"; hộp "Công việc cần chú ý" và thanh nhắc hạn có mức độ màu.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 12)],
  notes: [],
});
const h = await startHarness({ seed });

const lum = ([r, g, b]) => {
  const f = (v) =>
    (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

try {
  for (const [width, scheme] of [
    [390, 'light'],
    [820, 'light'],
    [1440, 'light'],
    [390, 'dark'],
    [1440, 'dark'],
  ]) {
    const { context, page } = await h.open(width, {
      touch: width < 700,
      colorScheme: scheme,
    });
    const at = ` (${width}px ${scheme})`;
    // 8 việc quá hạn (1–2 ngày trước), 3 việc đến hạn (hôm nay → 2 ngày nữa), 1 việc quan trọng chưa tới hạn.
    await page.evaluate(() => {
      const shift = (n) =>
        new Date(Date.parse(today() + 'T00:00:00Z') + n * 86400000)
          .toISOString()
          .slice(0, 10);
      const tasks = project('p1').tasks;
      tasks.forEach((t, i) => {
        t.col = 'List';
        t.important = false;
        t.due = i < 8 ? shift(-1 - (i % 2)) : i < 11 ? shift(i - 8) : shift(20);
      });
      tasks[11].important = true;
      render();
      refreshBell();
    });

    // 1. Hộp thoại Thông báo.
    // v1.56.0: chuông nằm trong dropdown "Tùy chọn nhanh", mở dropdown trước khi bấm chuông.
    if (await page.locator('#top-tools-panel').isHidden()) await page.click('#top-tools-trigger');
    await page.locator('#notifications-button').click();
    await page.waitForSelector('#editor[open] .notice-group');
    const dlg = await page.evaluate(() => {
      // Nhóm "Khác" (phiên bản mới...) tùy trạng thái bản phát hành nên không đưa vào so sánh.
      const groups = [...document.querySelectorAll('#editor .notice-group')]
        .filter((g) => g.dataset.kind !== 'other')
        .map((g) => ({
          kind: g.dataset.kind,
          count: Number(g.querySelector('small').textContent),
        }));
      const rows = [
        ...document.querySelectorAll('#editor .notice-item[data-task]'),
      ];
      const visible = rows.filter((r) => r.getBoundingClientRect().height > 0);
      const editor = document.querySelector('#editor');
      return {
        groups,
        rows: rows.length,
        visibleLate: visible.filter((r) => r.dataset.kind === 'late').length,
        more: [...document.querySelectorAll('#editor .notice-more')].map(
          (b) => b.textContent,
        ),
        rel: rows.slice(0, 3).map((r) => r.querySelector('small').textContent),
        stats: [...document.querySelectorAll('#editor .notice-stats span')].map(
          (s) => s.textContent.trim(),
        ),
        summary: document
          .querySelector('#editor .notice-summary')
          ?.textContent.trim(),
        overflow: editor.scrollWidth > editor.clientWidth + 1,
        clipped: [
          ...document.querySelectorAll('#editor .notice-item:not([hidden])'),
        ].some((r) => r.scrollWidth > r.clientWidth + 1),
        title: [
          ...document.querySelectorAll(
            '#editor .notice-item[data-task] .notice-title',
          ),
        ].every((t) => t.textContent.trim().length > 0),
        chevron: getComputedStyle(
          document.querySelector('#editor .notice-item[data-task]'),
          '::after',
        ).content,
      };
    });
    assert.deepEqual(
      dlg.groups,
      [
        { kind: 'late', count: 8 },
        { kind: 'soon', count: 3 },
        { kind: 'important', count: 1 },
      ],
      'nhóm và số lượng' + at + JSON.stringify(dlg.groups),
    );
    assert.equal(dlg.visibleLate, 5, 'nhóm dài chỉ hiện 5 hàng' + at);
    assert.deepEqual(dlg.more, ['Hiện thêm 3 việc'], 'nút hiện thêm' + at);
    assert.ok(
      dlg.rel.every((t) => /quá hạn \d+ ngày/.test(t)),
      'thiếu "quá hạn N ngày"' + at + JSON.stringify(dlg.rel),
    );
    assert.deepEqual(
      dlg.stats,
      ['8 quá hạn', '3 sắp đến hạn', '1 quan trọng'],
      'thẻ thống kê' + at,
    );
    assert.ok(
      dlg.summary.startsWith(
        '11 việc cần chú ý: 8 quá hạn · 3 đến hạn trong 3 ngày.',
      ),
      'dòng tóm tắt giữ nguyên' + at + dlg.summary,
    );
    assert.ok(
      !dlg.overflow && !dlg.clipped && dlg.title,
      'tràn hoặc cắt chữ' + at,
    );
    assert.equal(dlg.rows, 12, 'đủ 12 hàng trong DOM' + at);
    // Độ tương phản chữ chính của các thành phần mới (≥ 4.5:1) trên nền thực tế.
    const colors = await page.evaluate(() => {
      const parse = (c) =>
        c
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number);
      const bg = (el) => {
        for (let n = el; n; n = n.parentElement) {
          const c = getComputedStyle(n).backgroundColor;
          const m = c.match(/[\d.]+/g);
          if (m && (m.length < 4 || Number(m[3]) > 0.9)) return parse(c);
        }
        return [255, 255, 255];
      };
      return [
        '#editor .notice-stats [data-kind=late]',
        '#editor .notice-stats [data-kind=soon]',
        '#editor .notice-stats [data-kind=important]',
        '#editor .notice-group',
        '#editor .notice-item[data-task] small',
        '#editor .notice-item[data-task] .notice-title',
        '#editor .notice-more',
      ]
        .map(
          (sel) =>
            document.querySelector(sel) && {
              sel,
              fg: parse(getComputedStyle(document.querySelector(sel)).color),
              bg: bg(document.querySelector(sel)),
            },
        )
        .filter(Boolean);
    });
    for (const c of colors)
      assert.ok(
        ratio(c.fg, c.bg) >= 4.5,
        `tương phản ${c.sel} ${ratio(c.fg, c.bg).toFixed(2)}` + at,
      );
    // "Hiện thêm" mở hết các hàng còn lại.
    await page.locator('#editor .notice-more').click();
    assert.equal(
      await page
        .locator('#editor .notice-item[data-kind=late]:visible')
        .count(),
      8,
      'hiện thêm' + at,
    );
    assert.equal(await page.locator('#editor .notice-more').count(), 0);
    // Bấm một hàng vẫn mở đúng việc (và đánh dấu việc đó đã xem: các số bên dưới giảm 1).
    await page.locator('#editor .notice-item[data-task]').first().click();
    await page.waitForSelector('#editor[open] #editor-form');
    await page.evaluate(() => document.querySelector('#editor').close());

    // 2. Hộp "Công việc cần chú ý".
    await page.evaluate(() => openDueWork());
    const due = await page.evaluate(() => ({
      tabs: [...document.querySelectorAll('.due-work-tabs .btn')].map((b) =>
        b.textContent.trim(),
      ),
      tone: document.querySelector('.due-work-list')?.dataset.tone,
      rows: document.querySelectorAll('.due-work-list .work-task-row').length,
    }));
    assert.deepEqual(
      due.tabs,
      ['Quá hạn · 7', 'Sắp đến hạn · 3'],
      'thẻ chuyển nhóm' + at,
    );
    assert.equal(due.tone, 'late');
    assert.equal(due.rows, 7);
    await page.locator('.due-work-tabs [data-due-list=soon]').click();
    assert.equal(
      await page.locator('.due-work-list').getAttribute('data-tone'),
      'soon',
      'đổi nhóm giữ mức độ màu' + at,
    );
    await page.evaluate(() => document.querySelector('#editor').close());

    // 3. Thanh nhắc hạn có mức độ màu và vẫn giữ nguyên câu chữ.
    const strip = await page.evaluate(() => ({
      tone: document.querySelector('#due-alert-strip')?.dataset.tone,
      text: document
        .querySelector('#due-alert-strip strong')
        ?.textContent.trim(),
    }));
    assert.equal(strip.tone, 'late', 'mức độ thanh nhắc' + at);
    assert.match(
      strip.text,
      /^\d+ việc quá hạn · 3 việc đến hạn trong 3 ngày$/,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      'trang tràn ngang' + at,
    );
    await context.close();
  }
  console.log(
    'PASS: thông báo gom nhóm, hàng gọn, thu gọn 5 hàng, thanh nhắc và hộp cần chú ý có mức độ (390/820/1440px, sáng/tối).',
  );
} finally {
  await h.close();
}
