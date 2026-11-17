// v1.72.0: Tổng quan theo ngữ cảnh. Nhóm rỗng không chiếm chỗ; đầu trang điện thoại gọn. Kiểm ở 390 (chạm) / 820 (chạm) / 1440px.
// A. Hôm nay rỗng + có việc quá hạn: thẻ quá hạn đứng trước thẻ đang thực hiện; phần rỗng không có nút.
// B. Hôm nay CÓ việc: khối "Hôm nay làm gì" liệt kê việc và có nút xem.
// v2.41.0 (Hôm Nay Làm Gì): "Cần làm hôm nay" không còn là dòng thu gọn ở cuối mà là khối riêng "Hôm nay làm gì" đứng đầu (xem tests/today-first-browser.mjs);
// ở đây A và B chỉ đổi phần nói về dòng thu gọn, mọi khẳng định còn lại (nút/phần rỗng, đầu trang điện thoại, bộ lọc, không tràn ngang) giữ nguyên.
// C. Điện thoại: đầu trang (lời chào + nút) thấp hơn 100px, bỏ dòng mô tả; tên dự án trong thẻ không bẻ dòng.
// D. Nút "Mở danh sách quá hạn" vẫn mở đúng danh sách; không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const todayVN = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const seedWith = (withToday) => () => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu rất dài hạn với một cái tên thật là dài dòng', '#7950c8', 6);
  const p2 = makeProject('p2', 'Hương Thiền Nature — Website', '#c764a2', 4);
  // Bỏ hết hạn "hôm nay" ngẫu nhiên: mọi việc của seed đều ở 01–08/11 (quá hạn); thêm đúng một việc hạn hôm nay nếu cần.
  if (withToday) p2.tasks.push({ id: 'p2today', title: 'Việc hạn hôm nay', col: 'List', description: '', due: todayVN, tag: 'Công việc', priority: 'q2', checks: [] });
  return { schema: 1, projects: [p1, p2], notes: [] };
};

const h = await startHarness({ seed: seedWith(false) });
const h2 = await startHarness({ seed: seedWith(true) });
const fail = (w, m) => assert.fail(w + 'px: ' + m);
try {
  for (const [width, touch] of [[390, true], [820, true], [1440, false]]) {
    // ---- A: hôm nay rỗng ----
    {
      const { page, context } = await h.open(width, { touch });
      await page.waitForSelector('.wf-today-plan article');
      const r = await page.evaluate(() => {
        const plan = document.querySelector('.wf-today-plan');
        const arts = [...plan.querySelectorAll(':scope > article')].map((a) => ({ title: a.querySelector('h2').firstChild.textContent.trim(), top: a.getBoundingClientRect().top, left: a.getBoundingClientRect().left, w: a.getBoundingClientRect().width, h: a.getBoundingClientRect().height, empty: a.classList.contains('plan-empty-today') }));
        const parts = [...plan.querySelectorAll('.dashboard-plan-part')].map((d) => ({ title: d.querySelector('h3').firstChild.textContent.trim(), n: d.querySelector('h3 small').textContent, buttons: [...d.querySelectorAll('[data-dashboard-filter]')].map((b) => b.dataset.dashboardFilter), note: d.querySelector(':scope > p.subtext')?.textContent || '' }));
        return { cls: plan.className, arts, parts, planW: plan.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth - innerWidth };
      });
      const late = r.arts.find((a) => a.title.startsWith('Quá hạn')), doing = r.arts.find((a) => a.title === 'Đang thực hiện');
      assert.equal(r.arts.length, 2, width + 'px: khối ưu tiên chỉ còn hai thẻ (Quá hạn, Đang thực hiện)');
      assert.ok(!r.arts.some((a) => a.empty) && !r.cls.includes('has-empty-today'), width + 'px: không còn dòng hôm nay thu gọn ở cuối');
      assert.ok(late.top <= doing.top, width + 'px: thẻ quá hạn lên đầu');
      const upcoming = r.parts.find((p) => p.title.startsWith('Sắp đến hạn'));
      assert.equal(upcoming.n, '0');
      assert.deepEqual(upcoming.buttons, [], width + 'px: phần sắp đến hạn rỗng không có nút mở danh sách');
      assert.equal(upcoming.note, 'Không có việc sắp đến hạn.');
      const overdue = r.parts.find((p) => p.title === 'Quá hạn');
      assert.deepEqual(overdue.buttons, ['overdue'], width + 'px: phần quá hạn còn nút');
      assert.ok(r.overflow <= 0, width + 'px: tràn ngang ' + r.overflow);
      // ---- D: nút mở danh sách quá hạn vẫn hoạt động ----
      await page.click('[data-dashboard-filter="overdue"]');
      await page.waitForFunction(() => view === 'tasks');
      const filtered = await page.evaluate(() => ({ view, filter: dashboardDueFilter }));
      assert.equal(filtered.filter, 'overdue', width + 'px: bộ lọc quá hạn');
      // ---- C: điện thoại ----
      await page.evaluate(() => go('dashboard'));
      await page.waitForSelector('.page-heading.dashboard-heading');
      const m = await page.evaluate(() => {
        const hd = document.querySelector('.page-heading.dashboard-heading');
        const vis = (s) => { const e = hd.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; };
        const names = [...document.querySelectorAll('.dashboard-projects .project-card h3')].map((e) => ({ h: e.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(e).lineHeight) || 24 }));
        return { headH: hd.getBoundingClientRect().height, eyebrow: vis('.eyebrow'), sub: vis('.subtext'), names };
      });
      if (width <= 700) {
        assert.ok(m.headH <= 100, width + 'px: đầu trang phải ≤100px, thấy ' + Math.round(m.headH));
        assert.ok(!m.eyebrow && !m.sub, width + 'px: bỏ dòng nhãn và mô tả trên điện thoại');
        for (const n of m.names) assert.ok(n.h <= n.lh * 1.6, width + 'px: tên dự án không bẻ dòng (cao ' + Math.round(n.h) + ')');
      } else {
        assert.ok(m.sub, width + 'px: máy tính vẫn có dòng mô tả');
      }
      console.log(width + 'px A/C/D ok · đầu trang ' + Math.round(m.headH) + 'px');
      await context.close();
    }
    // ---- B: hôm nay có việc ----
    {
      const { page, context } = await h2.open(width, { touch });
      await page.waitForSelector('.wf-today-plan article');
      const r = await page.evaluate(() => {
        const plan = document.querySelector('.wf-today-plan');
        const today = document.querySelector('.wf-today-now');
        return { cls: plan.className, empty: today.classList.contains('is-empty'), text: today.textContent, button: !!today.querySelector('[data-dashboard-filter="today"]'), count: today.querySelector('h2 small').textContent, overflow: document.documentElement.scrollWidth - innerWidth };
      });
      assert.ok(!r.empty && !r.cls.includes('has-empty-today'), width + 'px: có việc hôm nay thì khối hôm nay không ở trạng thái trống');
      assert.ok(r.text.includes('Việc hạn hôm nay'), width + 'px: thẻ hôm nay liệt kê việc');
      assert.ok(r.button, width + 'px: thẻ hôm nay có nút xem việc hôm nay');
      assert.equal(r.count, '1 việc');
      assert.ok(r.overflow <= 0, width + 'px: tràn ngang');
      await context.close();
    }
  }
  console.log('PASS: Tổng quan theo ngữ cảnh — nhóm rỗng thu gọn, đầu trang điện thoại gọn, nút/bộ lọc còn hoạt động');
} finally {
  await h.close();
  await h2.close();
}
