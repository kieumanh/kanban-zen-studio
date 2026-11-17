// Hồi quy v2.20.1 (Chip Chuẩn): dải chip lọc nhãn ở trang Ghi chú (Tàng thư ở phong cách Giang hồ).
// Lỗi cũ: trên cảm ứng, chip cao tối thiểu 40px nhưng chữ nằm sát mép trên còn ô đếm nằm giữa nên lệch nhau, chữ chạm viền.
// Kiểm ở 390 (chạm), 820, 1440 px, phong cách Thiền và Giang hồ, sáng và tối: chữ và ô đếm cùng nằm giữa chip theo chiều dọc,
// chip nằm trọn trong dải, tiêu đề phần kế tiếp (GHIM) nằm hẳn dưới dải chip.
import assert from 'node:assert/strict';
import { defaultSeed, startHarness } from './lib/browser-harness.mjs';

const note = (id, title, keywords, extra = {}) => ({ id, type: 'text', title, text: '', color: '#ffffff', group: 'Ghi chú', keywords, created: '2026-11-10T00:00:00.000Z', ...extra });
const seed = () => ({
  ...defaultSeed(),
  notes: [note('n1', 'Kanban main verison', [], { pinned: true }), note('n2', 'Ý tưởng game', ['Game']), note('n3', 'Viết bài', ['Ý tưởng']), note('n4', 'Khác', [])],
});
const h = await startHarness({ seed });

const measure = (page) =>
  page.evaluate(() => {
    const row = document.querySelector('.note-label-filters');
    const rr = row.getBoundingClientRect();
    const chips = [...row.querySelectorAll('.note-keyword')].map((b) => {
      const q = b.getBoundingClientRect();
      const text = [...b.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      const range = document.createRange();
      range.selectNodeContents(text);
      const t = range.getBoundingClientRect(), badge = b.querySelector('.wf-keyword-count').getBoundingClientRect();
      return { label: b.textContent.trim(), mid: q.top + q.height / 2, text: t.top + t.height / 2, badge: badge.top + badge.height / 2, top: q.top, bottom: q.bottom, h: q.height, textTop: t.top, textBottom: t.bottom };
    });
    const next = row.nextElementSibling.querySelector('.zen-notes-caption') || row.nextElementSibling;
    return { chips, rowTop: rr.top, rowBottom: rr.bottom, nextTop: next.getBoundingClientRect().top, align: getComputedStyle(row.querySelector('.note-keyword')).alignItems };
  });

try {
  for (const style of ['zen', 'giangho']) {
    for (const scheme of ['light', 'dark']) {
      for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
        const tag = `[${style} ${scheme} ${width}px]`;
        const { context, page } = await h.open(width, {
          touch,
          colorScheme: scheme,
          workspace: seed(),
          setup: async ({ context }) => context.addInitScript((s) => localStorage.setItem('zen-style', s), style),
        });
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await h.show(page, 'notes');
        await page.waitForSelector('.note-label-filters .wf-keyword-count');
        const m = await measure(page);
        assert.equal(m.chips.length, 3, `${tag} đủ ba chip: Tất cả, Game, Ý tưởng`);
        assert.equal(m.align, 'center', `${tag} chip căn giữa theo chiều dọc`);
        for (const c of m.chips) {
          assert.ok(Math.abs(c.text - c.mid) <= 2.5, `${tag} chữ "${c.label}" nằm giữa chip (lệch ${Math.round(Math.abs(c.text - c.mid))}px)`);
          assert.ok(Math.abs(c.badge - c.mid) <= 2, `${tag} ô đếm của "${c.label}" nằm giữa chip (lệch ${Math.round(Math.abs(c.badge - c.mid))}px)`);
          assert.ok(Math.abs(c.text - c.badge) <= 3, `${tag} chữ và ô đếm của "${c.label}" cùng một hàng`);
          assert.ok(c.textTop - c.top >= 4 && c.bottom - c.textBottom >= 4, `${tag} chữ "${c.label}" không chạm viền chip`);
          assert.ok(c.top >= m.rowTop - 1 && c.bottom <= m.rowBottom + 1, `${tag} chip "${c.label}" nằm trọn trong dải`);
        }
        assert.ok(m.nextTop >= m.rowBottom + 8, `${tag} tiêu đề phần kế tiếp nằm hẳn dưới dải chip (cách ${Math.round(m.nextTop - m.rowBottom)}px)`);
        if (touch) assert.ok(m.chips.every((c) => c.h >= 39.5), `${tag} chip đủ cao để chạm (≥40px)`);
        assert.deepEqual(errors, [], `${tag} không lỗi trang`);
        await context.close();
      }
    }
  }
  console.log('note-chips-browser: ok');
} finally {
  await h.close();
}
