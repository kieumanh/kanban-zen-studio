// Hồi quy v1.16.2: biểu đồ Gantt và vòng "Bức tranh công việc" dùng thuộc tính SVG viết cứng màu sáng; ở chế độ tối phải đổi sang nền tối,
// nhãn ngày sáng, đường kẻ tối; ở chế độ sáng giữ nguyên như cũ. Kiểm tra màu tô thực tế của từng phần tử, ở 390/1440px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const seed = () => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 6);
  p1.tasks.forEach((t, i) => {
    t.start = day(i - 2);
    t.end = day(i + 3);
  });
  return { schema: 1, projects: [p1], notes: [] };
};
const h = await startHarness({ seed });

const lumOf = (c) => {
  const m = (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]);
};
const paint = (page, selector, prop) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s))[p], [selector, prop]);

try {
  for (const [width, touch] of [[390, true], [1440, false]]) {
    for (const [mode, scheme, contrast] of [['sáng', 'light'], ['tối', 'dark'], ['tối + tương phản cao', 'dark', 'more']]) {
      const label = `${mode} ${width}px`;
      const { context, page } = await h.open(width, { touch, colorScheme: scheme, ...(contrast ? { contrast } : {}) });
      await h.show(page, 'gantt');
      await page.waitForSelector('.gantt-svg .gantt-day');
      const dark = scheme === 'dark';
      const dayFill = lumOf(await paint(page, '.gantt-svg .gantt-day:not(.gantt-day-off)', 'fill'));
      const offFill = lumOf(await paint(page, '.gantt-svg .gantt-day-off', 'fill'));
      const dateFill = lumOf(await paint(page, '.gantt-svg > text', 'fill'));
      const dowFill = lumOf(await paint(page, '.gantt-svg .gantt-dow', 'fill'));
      const colLine = lumOf(await paint(page, '.gantt-svg .gantt-col-line', 'stroke'));
      const rowLine = lumOf(await paint(page, '.gantt-svg .gantt-row-line', 'stroke'));
      if (dark) {
        assert.ok(dayFill < 0.05 && offFill < 0.05, `${label}: ô ngày phải tối (nhận ${dayFill.toFixed(3)}/${offFill.toFixed(3)})`);
        assert.ok(dateFill > 0.6, `${label}: nhãn ngày phải sáng (nhận ${dateFill.toFixed(3)})`);
        assert.ok(dowFill > 0.35, `${label}: nhãn thứ phải sáng (nhận ${dowFill.toFixed(3)})`);
        assert.ok(colLine < 0.08 && rowLine < 0.08, `${label}: đường kẻ phải tối (nhận ${colLine.toFixed(3)}/${rowLine.toFixed(3)})`);
        // Chữ nhãn ngày so với nền ô: >= 4,5:1
        const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        assert.ok(ratio(dateFill, dayFill) >= 4.5, `${label}: nhãn ngày tương phản >= 4,5`);
        assert.ok(ratio(dowFill, offFill) >= 4.5, `${label}: nhãn thứ tương phản >= 4,5`);
      } else {
        assert.ok(dayFill > 0.9 && offFill > 0.8, `${label}: chế độ sáng giữ ô ngày sáng (nhận ${dayFill.toFixed(3)}/${offFill.toFixed(3)})`);
        assert.ok(dateFill < 0.05, `${label}: chế độ sáng giữ nhãn ngày tối`);
      }
      // Vòng "Bức tranh công việc" ở Tổng quan.
      await h.show(page, 'dashboard');
      await page.waitForSelector('.work-chart-track');
      const track = lumOf(await paint(page, '.work-chart-track', 'stroke'));
      assert.ok(dark ? track < 0.05 : track > 0.8, `${label}: vòng nền ${dark ? 'tối' : 'sáng'} (nhận ${track.toFixed(3)})`);
      await context.close();
    }
    console.log(`  đạt ${width}px`);
  }
  console.log('PASS: Gantt và vòng Bức tranh công việc đúng màu ở chế độ sáng, tối và tối + tương phản cao.');
} finally {
  await h.close();
}
