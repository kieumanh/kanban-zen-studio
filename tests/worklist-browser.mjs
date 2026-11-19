// v2.63.0 (Liên Hoàn Lệnh): chuỗi việc ưu tiên xuyên dự án (dist/worklist.js, server/worklist.mjs).
// Kiểm ở 390 (chạm) / 820 (chạm) / 1440 px × sáng, tối; Giang hồ ở 1440:
//  1. Mục “Liên hoàn lệnh” nằm trong nhóm Chế độ xem (thanh bên) và trên thanh chế độ xem điện thoại; bấm vào mở trang; không còn chữ Worklist / focus / keywords.
//  2. Chuỗi trống: lời hướng dẫn + khung ghi thêm việc. Chuỗi có việc: đúng thứ tự người dùng xếp, nhiều dự án xen nhau; ẩn việc đã xong / lưu trữ / đã xóa / đã gỡ / dòng trùng.
//  3. Sắc hiệu: chip màu dự án, Khẩn cấp, Trọng yếu theo mức ưu tiên sẵn có; sợi dây nối các việc (không có ở việc cuối); thẻ bo tròn; chữ đủ tương phản; nút chạm ≥ 44 px; không tràn ngang.
//  4. Thao tác (lưu lên máy chủ): đưa lên / xuống / lên đầu, gỡ khỏi chuỗi (giữ dòng, thêm ngày gỡ), ghi thêm từ khung tìm việc (nối vào cuối), Bế quan mở đúng việc.
//  5. Nút trong chi tiết việc nằm ngay cạnh nút “Chế độ tập trung”: ghi vào / gỡ khỏi; việc đã xong không có nút.
//  6. Việc xong tự biến khỏi chuỗi nhưng dòng vẫn còn (không mất dữ liệu); đưa lại về cột khác thì hiện lại đúng chỗ cũ; sang ngày khác chuỗi vẫn y nguyên.
//  7. Đủ 100 việc thì không ghi thêm và có thông báo; bản chỉ xem không có nút sửa thứ tự.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';
import { validWorkspace } from '../server/api.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá hạn chờ: ' + label);
}
const NOW = '2026-11-12T09:00:00+07:00';
const TODAY = '2026-11-12';
const seed = (withList = true) => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 6);
  const p2 = makeProject('p2', 'Hương Thiền Nature — Website', '#c764a2', 4);
  const p3 = makeProject('p3', 'Sổ nợ An Tâm', '#e78c56', 3);
  // Mức ưu tiên: p2t0 khẩn cấp, p1t1 quan trọng + khẩn cấp, p3t1 không cái nào, p2t2 quan trọng, p1t4 chưa phân loại.
  p2.tasks[0].priority = 'q3';
  p1.tasks[1].priority = 'q1';
  p3.tasks[1].priority = 'q4';
  p2.tasks[2].priority = 'q2';
  delete p1.tasks[4].priority;
  p3.tasks[2].archived = true;
  const worklist = {
    v: 1,
    items: [
      { t: 'p2t0', a: '2026-11-10' },
      { t: 'p1t1', a: '2026-11-10' },
      { t: 'p3t1', a: '2026-11-11' },
      { t: 'p1t3', a: '2026-11-09' }, // đã xong → ẩn
      { t: 'p3t2', a: '2026-11-09' }, // lưu trữ → ẩn
      { t: 'khong-con-viec-nay', a: '2026-11-09' }, // đã xóa → ẩn
      { t: 'p2t0', a: '2026-11-12' }, // trùng → ẩn
      { t: 'p2t1', a: '2026-11-09', x: '2026-11-11' }, // đã gỡ → ẩn
      { t: 'p2t2', a: '2026-11-11' },
      { t: 'p1t4', a: '2026-11-11' },
    ],
  };
  return {
    schema: 1,
    projects: [p1, p2, p3],
    notes: [],
    ...(withList ? { worklist } : {}),
  };
};
const VISIBLE = ['p2t0', 'p1t1', 'p3t1', 'p2t2', 'p1t4'];
const setup =
  (theme, style) =>
  ({ context }) =>
    context.addInitScript(
      ([t, s]) => {
        localStorage.setItem('zen-theme', t);
        if (s) localStorage.setItem('zen-style', s);
      },
      [theme, style],
    );
const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const order = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.wl-item')].map((li) => li.dataset.wlItem),
  );
const serverOrder = (h) => h.workspace.worklist.items.map((e) => e.t);
const contrast = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cx = Object.assign(document.createElement('canvas'), {
      width: 1,
      height: 1,
    }).getContext('2d', { willReadFrequently: true });
    const rgba = (css) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const mix = (c, under) =>
      [0, 1, 2].map((i) => c[i] * c[3] + under[i] * (1 - c[3]));
    const lum = ([r, g, b]) =>
      [r, g, b]
        .map((v) =>
          (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
        )
        .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const chain = [];
    for (let n = el; n; n = n.parentElement)
      chain.push(getComputedStyle(n).backgroundColor);
    let bg = [255, 255, 255];
    for (const css of chain.reverse()) {
      const c = rgba(css);
      if (c[3] > 0) bg = mix(c, bg);
    }
    const fg = mix(rgba(getComputedStyle(el).color), bg),
      [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);
async function openNav(page) {
  if (
    !(await page
      .locator('.sidebar .view-options [data-view=worklist]')
      .isVisible())
  )
    await page.click('#menu');
}

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';

      // 1 + 2. Chuỗi trống, rồi mục trong menu.
      {
        const { context, page } = await h.open(width, {
          touch,
          now: NOW,
          setup: setup(theme),
          workspace: seed(false),
        });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await h.show(page, 'projects', 'p1');
        const entry = await page.evaluate(() => ({
          side: !!document.querySelector(
            '.sidebar .view-options [data-view=worklist]',
          ),
          sideText: document
            .querySelector('.sidebar .view-options [data-view=worklist]')
            ?.textContent.trim(),
          bar: !!document.querySelector('.mobile-viewbar [data-view=worklist]'),
          barText: document
            .querySelector('.mobile-viewbar [data-view=worklist]')
            ?.textContent.trim(),
          four: document.querySelectorAll('.mobile-viewbar .view-mode').length,
          group: document.querySelectorAll('.sidebar .view-options .view-mode')
            .length,
        }));
        assert.ok(
          entry.side && entry.bar,
          'có mục Liên hoàn lệnh ở thanh bên và thanh điện thoại' + at,
        );
        assert.equal(entry.sideText, 'Liên hoàn lệnh', 'tên ở thanh bên' + at);
        assert.equal(
          entry.barText,
          'Liên hoàn',
          'tên gọn ở thanh điện thoại' + at,
        );
        assert.equal(entry.four, 4, 'thanh chế độ xem có bốn nút' + at);
        assert.equal(entry.group, 4, 'nhóm Chế độ xem có bốn nút' + at);
        if (width <= 700) {
          const boxes = await page.evaluate(() =>
            [...document.querySelectorAll('.mobile-viewbar .view-mode')].map(
              (b) => {
                const r = b.getBoundingClientRect();
                return [r.left, r.right, r.height];
              },
            ),
          );
          assert.ok(
            boxes.every(([l, r, ht]) => l >= 0 && r <= width && ht >= 44),
            'bốn nút nằm gọn trong màn hình, cao ≥ 44 px ' +
              JSON.stringify(boxes) +
              at,
          );
          await page.click('.mobile-viewbar [data-view=worklist]');
        } else {
          await openNav(page);
          await page.click('.sidebar .view-options [data-view=worklist]');
        }
        await page.waitForFunction(
          () => view === 'worklist' && document.querySelector('#main h1'),
        );
        const empty = await page.evaluate(() => ({
          h1: document.querySelector('#main h1').textContent,
          crumb: document.querySelector('#crumb').textContent,
          pressed: [...document.querySelectorAll('[data-view=worklist]')].map(
            (b) => b.getAttribute('aria-pressed'),
          ),
          emptyText: document.querySelector('.wl-empty')?.textContent,
          items: document.querySelectorAll('.wl-item').length,
          picker: !!document.querySelector('.wl-picker summary'),
          text: document.querySelector('#main').textContent,
        }));
        assert.equal(empty.h1, 'Liên hoàn lệnh', 'tiêu đề trang' + at);
        assert.equal(empty.crumb, 'Liên hoàn lệnh', 'đường dẫn trên cùng' + at);
        assert.ok(
          empty.pressed.every((p) => p === 'true'),
          'nút chế độ xem được đánh dấu đang mở' + at,
        );
        assert.match(
          empty.emptyText,
          /Chuỗi còn trống/,
          'chuỗi trống có lời hướng dẫn' + at,
        );
        assert.match(
          empty.emptyText,
          /Chế độ tập trung/,
          'hướng dẫn nhắc nút cạnh Chế độ tập trung' + at,
        );
        assert.equal(empty.items, 0, 'chưa có việc nào' + at);
        assert.ok(empty.picker, 'có khung ghi thêm việc' + at);
        for (const en of ['Worklist', 'worklist', 'focus', 'keyword'])
          assert.ok(
            !empty.text.includes(en),
            'không còn chữ tiếng Anh ' + en + at,
          );
        assert.ok(await noOverflow(page), 'chuỗi trống không tràn ngang' + at);
        assert.deepEqual(errors, [], 'không lỗi trang' + at);
        await context.close();
      }

      // 2 + 3. Chuỗi có việc: thứ tự, ẩn đúng, sắc hiệu, dây nối, bo tròn, tương phản.
      {
        const { context, page } = await h.open(width, {
          touch,
          now: NOW,
          setup: setup(theme),
          workspace: seed(),
        });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await h.show(page, 'worklist');
        await page.waitForSelector('.wl-item');
        assert.deepEqual(
          await order(page),
          VISIBLE,
          'đúng thứ tự người dùng xếp, ẩn việc xong / lưu trữ / đã xóa / đã gỡ / trùng' +
            at,
        );
        const r = await page.evaluate(() => {
          const li = (id) =>
            document.querySelector('[data-wl-item="' + id + '"]');
          const chips = (id) =>
            [...li(id).querySelectorAll('.wl-chip')].map((c) =>
              c.textContent.trim(),
            );
          const items = [...document.querySelectorAll('.wl-item')];
          const pseudo = (el) => getComputedStyle(el, '::before');
          const stat = [...document.querySelectorAll('.wl-sum li')].map((x) =>
            x.textContent.replace(/\s+/g, ' ').trim(),
          );
          return {
            nums: items.map((x) => x.querySelector('.wl-node').textContent),
            projectChips: items.map((x) =>
              x.querySelector('.wl-chip-project').textContent.trim(),
            ),
            projectVars: items.map((x) => x.style.getPropertyValue('--pc')),
            p2t0: chips('p2t0'),
            p1t1: chips('p1t1'),
            p3t1: chips('p3t1'),
            p2t2: chips('p2t2'),
            p1t4: chips('p1t4'),
            stat,
            lineWidth: items.map((x) => parseFloat(pseudo(x).width)),
            lineShown: items.map((x) => pseudo(x).display !== 'none'),
            radius: [...document.querySelectorAll('.wl-card, .wl-sum li')].map(
              (c) => parseFloat(getComputedStyle(c).borderTopLeftRadius),
            ),
            focusBtns: [...document.querySelectorAll('.wl-focus')].map((b) => [
              b.textContent.trim(),
              b.getBoundingClientRect().height,
            ]),
            tools: [...document.querySelectorAll('.wl-icon-btn, .wl-drop')].map(
              (b) => {
                const q = b.getBoundingClientRect();
                return [q.width, q.height];
              },
            ),
            firstDisabled: [
              ...document
                .querySelector('[data-wl-item="p2t0"]')
                .querySelectorAll('.wl-icon-btn'),
            ].map((b) => b.disabled),
            lastDisabled: [
              ...document
                .querySelector('[data-wl-item="p1t4"]')
                .querySelectorAll('.wl-icon-btn'),
            ].map((b) => b.disabled),
            legend: document
              .querySelector('.wl-legend')
              .textContent.replace(/\s+/g, ' ')
              .trim(),
            text: document.querySelector('#main').textContent,
          };
        });
        assert.deepEqual(
          r.nums,
          ['1', '2', '3', '4', '5'],
          'số thứ tự trên sợi dây' + at,
        );
        assert.deepEqual(
          r.projectChips,
          [
            'Hương Thiền Nature — Website',
            'Khóa tu mùa thu',
            'Sổ nợ An Tâm',
            'Hương Thiền Nature — Website',
            'Khóa tu mùa thu',
          ],
          'chip tên dự án, nhiều dự án xen nhau' + at,
        );
        assert.deepEqual(
          r.projectVars,
          ['#c764a2', '#7950c8', '#e78c56', '#c764a2', '#7950c8'],
          'màu dự án' + at,
        );
        assert.deepEqual(r.p2t0.slice(1, 2), ['Khẩn cấp'], 'q3: khẩn cấp' + at);
        assert.ok(!r.p2t0.includes('Trọng yếu'), 'q3: không trọng yếu' + at);
        assert.deepEqual(
          r.p1t1.slice(1, 3),
          ['Khẩn cấp', 'Trọng yếu'],
          'q1: khẩn cấp và trọng yếu' + at,
        );
        assert.deepEqual(r.p3t1.slice(1, 2), ['Thường'], 'q4: thường' + at);
        assert.deepEqual(
          r.p2t2.slice(1, 2),
          ['Trọng yếu'],
          'q2: trọng yếu' + at,
        );
        assert.deepEqual(
          r.p1t4.slice(1, 2),
          ['Chưa phân loại'],
          'chưa phân loại' + at,
        );
        assert.ok(
          r.p2t0.some((c) => /^Quá hạn · /.test(c)),
          'việc quá hạn có chip Quá hạn' + at,
        );
        assert.deepEqual(
          r.stat,
          ['5 việc trong chuỗi', '2 khẩn cấp', '5 quá hạn', '3 dự án'],
          'tóm tắt chuỗi' + at,
        );
        assert.deepEqual(
          r.lineShown,
          [true, true, true, true, false],
          'sợi dây nối các việc, việc cuối không có dây thừa' + at,
        );
        assert.ok(
          r.lineWidth.slice(0, 4).every((w) => w === 2),
          'dây dày 2 px' + at,
        );
        assert.ok(
          r.radius.every((x) => x >= 12),
          'thẻ bo tròn ' + r.radius + at,
        );
        assert.ok(
          r.focusBtns.every(([t, ht]) => t === 'Bế quan' && ht >= 44),
          'nút Bế quan cao ≥ 44 px' + at,
        );
        assert.ok(
          r.tools.every(([w, ht]) => ht >= 44 && w >= 44),
          'nút đổi thứ tự / gỡ ≥ 44 px ' + JSON.stringify(r.tools) + at,
        );
        assert.deepEqual(
          r.firstDisabled,
          [true, true, false],
          'việc đầu không lên được' + at,
        );
        assert.deepEqual(
          r.lastDisabled,
          [false, false, true],
          'việc cuối không xuống được' + at,
        );
        assert.match(
          r.legend,
          /Sắc hiệu.*Màu dự án.*Khẩn cấp.*Trọng yếu/,
          'chú thích sắc hiệu' + at,
        );
        for (const en of ['Worklist', 'worklist', 'focus', 'keyword'])
          assert.ok(!r.text.includes(en), 'không còn chữ tiếng Anh ' + en + at);
        for (const sel of [
          '.wl-chip-urgent',
          '.wl-chip-key',
          '.wl-chip-calm',
          '.wl-chip-late',
          '.wl-chip-project',
          '.wl-title',
          '.wl-meta',
          '.wl-sum span',
          '.wl-key',
        ]) {
          const c = await contrast(page, sel);
          assert.ok(
            c !== null && c >= 4.5,
            'chữ ' + sel + ' đủ tương phản (' + c + ')' + at,
          );
        }
        assert.ok(await noOverflow(page), 'không tràn ngang' + at);
        assert.deepEqual(errors, [], 'không lỗi trang' + at);
        await context.close();
      }
    }

    // 4. Thao tác lưu lên máy chủ (sáng).
    {
      const at = ' (' + width + 'px)';
      const { context, page, server } = await h.open(width, {
        touch,
        now: NOW,
        setup: setup('light'),
        workspace: seed(),
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'worklist');
      await page.waitForSelector('.wl-item');
      const before = structuredClone(server.workspace.worklist);

      await page.click('[data-wl-down="p2t0"]');
      await until(
        () =>
          serverOrder(server).indexOf('p1t1') <
          serverOrder(server).indexOf('p2t0'),
        'xuống một bậc được lưu',
      );
      assert.deepEqual(
        await order(page),
        ['p1t1', 'p2t0', 'p3t1', 'p2t2', 'p1t4'],
        'xuống một bậc' + at,
      );
      await page.click('[data-wl-up="p2t2"]');
      assert.deepEqual(
        await order(page),
        ['p1t1', 'p2t0', 'p2t2', 'p3t1', 'p1t4'],
        'lên một bậc' + at,
      );
      await page.click('[data-wl-top="p1t4"]');
      assert.deepEqual(
        await order(page),
        ['p1t4', 'p1t1', 'p2t0', 'p2t2', 'p3t1'],
        'đưa lên đầu' + at,
      );
      assert.equal(
        await page.evaluate(
          () =>
            document.activeElement?.closest('[data-wl-item]')?.dataset.wlItem,
        ),
        'p1t4',
        'tiêu điểm bàn phím ở lại với việc vừa đổi chỗ' + at,
      );
      await until(
        () =>
          JSON.stringify([
            ...new Set(
              serverOrder(server).filter((t) =>
                ['p1t4', 'p1t1', 'p2t0', 'p2t2', 'p3t1'].includes(t),
              ),
            ),
          ]) === JSON.stringify(['p1t4', 'p1t1', 'p2t0', 'p2t2', 'p3t1']),
        'thứ tự mới lên máy chủ',
      );
      assert.deepEqual(
        server.workspace.worklist.items.map((e) => e.t).sort(),
        before.items.map((e) => e.t).sort(),
        'đổi thứ tự không làm mất hay thêm dòng nào' + at,
      );
      for (const e of before.items)
        assert.deepEqual(
          server.workspace.worklist.items.find(
            (x) => x.t === e.t && x.a === e.a && x.x === e.x,
          ) || null,
          e,
          'dòng ' + e.t + ' giữ nguyên nội dung' + at,
        );

      await page.reload();
      await page.waitForFunction(
        () =>
          typeof _WF !== 'undefined' &&
          document.documentElement.dataset.zenReady === '1',
      );
      await h.show(page, 'worklist');
      assert.deepEqual(
        await order(page),
        ['p1t4', 'p1t1', 'p2t0', 'p2t2', 'p3t1'],
        'tải lại vẫn đúng thứ tự đã xếp' + at,
      );

      // Gỡ khỏi chuỗi: dòng giữ lại, thêm ngày gỡ.
      await page.click('[data-wl-drop="p2t0"]');
      assert.deepEqual(
        await order(page),
        ['p1t4', 'p1t1', 'p2t2', 'p3t1'],
        'gỡ khỏi chuỗi' + at,
      );
      await until(
        () =>
          server.workspace.worklist.items.some(
            (e) => e.t === 'p2t0' && e.x === TODAY,
          ),
        'ngày gỡ lên máy chủ',
      );
      assert.ok(
        server.workspace.worklist.items.some(
          (e) => e.t === 'p2t0' && e.a === '2026-11-10' && e.x === TODAY,
        ),
        'dòng bị gỡ giữ ngày ghi và thêm ngày gỡ' + at,
      );
      assert.equal(
        await page
          .locator('.wl-sum li')
          .first()
          .textContent()
          .then((t) => t.replace(/\s+/g, ' ').trim()),
        '4 việc trong chuỗi',
        'tóm tắt cập nhật' + at,
      );

      // Ghi thêm từ khung tìm việc.
      await page.click('.wl-picker summary');
      await page.fill('[data-wl-search]', 'Hương Thiền');
      const hits = await page.$$eval('.wl-pick', (els) =>
        els.map((e) => e.dataset.wlAdd),
      );
      assert.ok(
        hits.length > 0 && hits.every((id) => id.startsWith('p2')),
        'tìm theo tên dự án chỉ ra việc của dự án đó' + at,
      );
      assert.ok(
        !hits.includes('p2t2') && !hits.includes('p2t3'),
        'việc đã trong chuỗi / đã xong không nằm trong danh sách ghi thêm' + at,
      );
      assert.ok(hits.includes('p2t0'), 'việc vừa gỡ ghi lại được' + at);
      await page.fill('[data-wl-search]', 'khong-co-viec-nao-ten-nhu-the');
      assert.match(
        await page.locator('.wl-pick-empty').textContent(),
        /Không có việc nào khớp/,
        'không khớp thì báo rõ' + at,
      );
      await page.fill('[data-wl-search]', '');
      await page.click('[data-wl-add="p2t0"]');
      assert.deepEqual(
        await order(page),
        ['p1t4', 'p1t1', 'p2t2', 'p3t1', 'p2t0'],
        'việc ghi thêm nối vào cuối chuỗi' + at,
      );
      assert.ok(
        await page.locator('.wl-picker').evaluate((d) => d.open),
        'khung ghi thêm vẫn mở để ghi tiếp' + at,
      );
      await until(
        () =>
          server.workspace.worklist.items.filter((e) => e.t === 'p2t0' && !e.x)
            .length === 1,
        'dòng mới lên máy chủ',
      );
      const added = server.workspace.worklist.items.filter(
        (e) => e.t === 'p2t0' && !e.x,
      )[0];
      assert.equal(added.a, TODAY, 'ngày ghi là hôm nay' + at);
      assert.deepEqual(
        Object.keys(added).sort(),
        ['a', 't'],
        'dòng mới chỉ có việc và ngày' + at,
      );

      // Bế quan mở đúng việc.
      await page.click('[data-wl-focus="p3t1"]');
      await page.waitForFunction(
        () =>
          view === 'focus' && document.querySelector('.wf-focus-workspace h1'),
      );
      assert.equal(
        await page.locator('.wf-focus-workspace h1').textContent(),
        'Việc số 2',
        'Bế quan mở đúng việc (p3t1)' + at,
      );
      assert.equal(
        await page.evaluate(() => `${_WF.focus.p}/${_WF.focus.t}`),
        'p3/p3t1',
        'đúng dự án và việc' + at,
      );
      assert.ok(await noOverflow(page), 'Bế quan không tràn ngang' + at);

      // Mở việc từ tiêu đề.
      await h.show(page, 'worklist');
      await page.click('[data-wl-item="p1t4"] .wl-title');
      await page.waitForSelector('#editor[open] .wl-add-shortcut');
      assert.equal(
        await page
          .locator('#editor-body input[name=title], #editor-body [name=title]')
          .first()
          .inputValue(),
        'Việc số 5',
        'bấm tên việc mở đúng chi tiết' + at,
      );
      await page.keyboard.press('Escape');
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }

    // 5. Nút trong chi tiết việc, cạnh nút Chế độ tập trung.
    {
      const at = ' (' + width + 'px)';
      const { context, page, server } = await h.open(width, {
        touch,
        now: NOW,
        setup: setup('light'),
        workspace: seed(false),
      });
      await h.show(page, 'projects', 'p1');
      await page.evaluate(() => {
        const p = project('p1');
        taskDetail(
          p,
          p.tasks.find((t) => t.id === 'p1t2'),
        );
      });
      await page.waitForSelector('#editor[open] .wl-add-shortcut');
      const adj = await page.evaluate(() => {
        const b = document.querySelector('.wl-add-shortcut'),
          f = document.querySelector('.task-focus-shortcut');
        const rb = b.getBoundingClientRect(),
          rf = f.getBoundingClientRect();
        return {
          next: b.nextElementSibling === f,
          onRight: rb.right <= rf.left + 1,
          sameRow: Math.abs(rb.top - rf.top) < 6,
          h: rb.height,
          w: rb.width,
          pressed: b.getAttribute('aria-pressed'),
          label: b.getAttribute('aria-label'),
          text: b.textContent.trim(),
          within: rb.left >= 0 && rf.right <= innerWidth,
        };
      });
      assert.ok(
        adj.next && adj.onRight && adj.sameRow,
        'nút nằm ngay cạnh nút Chế độ tập trung, cùng hàng' + at,
      );
      assert.ok(adj.within, 'hai nút nằm gọn trong màn hình' + at);
      assert.ok(adj.h >= 40, 'nút cao ≥ 40 px' + at);
      assert.equal(adj.pressed, 'false', 'chưa ghi: aria-pressed=false' + at);
      assert.match(
        adj.label,
        /Ghi việc này vào Liên hoàn lệnh/,
        'nhãn đọc màn hình nói rõ việc sẽ làm' + at,
      );
      if (width > 600)
        assert.match(adj.text, /Liên hoàn lệnh/, 'màn rộng hiện chữ' + at);
      await page.click('.wl-add-shortcut');
      await until(
        () =>
          server.workspace.worklist?.items.some(
            (e) => e.t === 'p1t2' && !e.x && e.a === TODAY,
          ),
        'ghi vào chuỗi lên máy chủ',
      );
      assert.equal(
        await page.locator('.wl-add-shortcut').getAttribute('aria-pressed'),
        'true',
        'đã ghi: aria-pressed=true' + at,
      );
      assert.match(
        await page.locator('.wl-add-shortcut').getAttribute('aria-label'),
        /Gỡ việc này khỏi/,
        'nhãn đổi thành gỡ' + at,
      );
      assert.deepEqual(
        await page.evaluate(() => zenWorklist.rows().map((r) => r.t.id)),
        ['p1t2'],
        'có trong chuỗi' + at,
      );
      await page.click('.wl-add-shortcut');
      await until(
        () =>
          server.workspace.worklist.items.some(
            (e) => e.t === 'p1t2' && e.x === TODAY,
          ),
        'gỡ khỏi chuỗi lên máy chủ',
      );
      assert.equal(
        await page.locator('.wl-add-shortcut').getAttribute('aria-pressed'),
        'false',
        'gỡ xong: aria-pressed=false' + at,
      );
      await page.keyboard.press('Escape');
      // Việc đã xong không có nút.
      await page.evaluate(() => {
        const p = project('p1');
        taskDetail(
          p,
          p.tasks.find((t) => t.id === 'p1t3'),
        );
      });
      await page.waitForSelector('#editor[open] .task-focus-shortcut');
      assert.equal(
        await page.locator('.wl-add-shortcut').count(),
        0,
        'việc đã xong không có nút ghi vào chuỗi' + at,
      );
      await context.close();
    }

    // 6. Việc xong tự biến, dòng còn nguyên; việc mở lại hiện đúng chỗ cũ; sang ngày khác chuỗi y nguyên.
    {
      const at = ' (' + width + 'px)';
      const { context, page, server } = await h.open(width, {
        touch,
        now: NOW,
        setup: setup('light'),
        workspace: seed(),
      });
      await h.show(page, 'worklist');
      await page.waitForSelector('.wl-item');
      const rowsBefore = await page.evaluate(() =>
        JSON.stringify(data.worklist),
      );
      await page.evaluate(() => {
        const t = project('p1').tasks.find((x) => x.id === 'p1t1');
        t.col = 'Done';
        t.doneAt = today();
        save();
        render();
      });
      assert.deepEqual(
        await order(page),
        ['p2t0', 'p3t1', 'p2t2', 'p1t4'],
        'việc xong tự biến khỏi chuỗi' + at,
      );
      assert.equal(
        await page.evaluate(() => JSON.stringify(data.worklist)),
        rowsBefore,
        'việc xong không làm đổi chuỗi: không mất dòng nào' + at,
      );
      await page.evaluate(() => {
        const t = project('p1').tasks.find((x) => x.id === 'p1t1');
        t.col = 'Doing';
        delete t.doneAt;
        save();
        render();
      });
      assert.deepEqual(
        await order(page),
        VISIBLE,
        'đưa lại về cột khác thì hiện lại đúng chỗ cũ' + at,
      );
      // Sang ngày hôm sau: không có gì tự mất.
      await page.clock.setFixedTime(new Date('2026-11-13T09:00:00+07:00'));
      await page.evaluate(() => render());
      assert.deepEqual(
        await order(page),
        VISIBLE,
        'sang ngày khác chuỗi vẫn y nguyên thứ tự' + at,
      );
      assert.ok(
        server.workspace.worklist.items.length >= 10,
        'máy chủ vẫn giữ đủ các dòng' + at,
      );
      await context.close();
    }
  }

  // 7. Giới hạn 100 việc.
  {
    const big = makeProject('p9', 'Dự án lớn', '#3a6fb0', 101);
    for (const t of big.tasks) {
      t.col = 'List';
      t.priority = 'q2';
    }
    const ws = {
      schema: 1,
      projects: [big],
      notes: [],
      worklist: {
        v: 1,
        items: big.tasks
          .slice(0, 100)
          .map((t) => ({ t: t.id, a: '2026-11-10' })),
      },
    };
    assert.ok(validWorkspace(ws), 'bộ dữ liệu 100 việc trong chuỗi hợp lệ');
    const { context, page, server } = await h.open(1440, {
      now: NOW,
      setup: setup('light'),
      workspace: ws,
    });
    await h.show(page, 'worklist');
    await page.waitForSelector('.wl-item');
    assert.equal(
      await page.locator('.wl-item').count(),
      100,
      'hiện đủ 100 việc',
    );
    const added = await page.evaluate(() => zenWorklist.add('p9t100'));
    assert.equal(added, false, 'đủ 100 việc thì không ghi thêm');
    assert.match(
      await page.locator('#toast').textContent(),
      /tối đa 100 việc/,
      'có thông báo giới hạn',
    );
    assert.equal(
      server.workspace.worklist.items.length,
      100,
      'máy chủ không nhận thêm dòng',
    );
    await page.evaluate(() => zenWorklist.drop('p9t0'));
    assert.equal(
      await page.evaluate(() => zenWorklist.add('p9t100')),
      true,
      'gỡ bớt một việc thì ghi thêm được',
    );
    await context.close();
  }

  // Bảng lệnh (Ctrl+K): lệnh “Mở Liên hoàn lệnh” mở đúng trang.
  {
    const { context, page } = await h.open(1440, {
      now: NOW,
      setup: setup('light'),
      workspace: seed(),
    });
    await h.show(page, 'dashboard');
    await page.keyboard.press('Control+k');
    await page.waitForSelector('dialog.studio-palette[open] input');
    await page.fill('dialog.studio-palette input', 'Liên hoàn');
    const labels = await page.$$eval(
      'dialog.studio-palette [role=option] span',
      (els) => els.map((e) => e.textContent),
    );
    assert.equal(
      labels[0],
      'Mở Liên hoàn lệnh',
      'bảng lệnh có lệnh Mở Liên hoàn lệnh',
    );
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () =>
        view === 'worklist' &&
        document.querySelector('#main h1')?.textContent === 'Liên hoàn lệnh',
    );
    assert.deepEqual(
      await order(page),
      VISIBLE,
      'lệnh mở đúng trang với đúng chuỗi',
    );
    await context.close();
  }

  // Giang hồ: tên Hán Việt giữ nguyên, không lẫn chữ Anh.
  {
    const { context, page } = await h.open(1440, {
      now: NOW,
      setup: setup('light', 'giangho'),
      workspace: seed(),
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await h.show(page, 'worklist');
    await page.waitForSelector('.wl-item');
    await page.waitForFunction(
      () => document.documentElement.dataset.style === 'giangho',
    );
    const g = await page.evaluate(() => ({
      h1: document.querySelector('#main h1').textContent,
      text: document.querySelector('#main').textContent,
      sidebar: document
        .querySelector('.sidebar .view-options [data-view=worklist]')
        .textContent.replace(/\s+/g, ' ')
        .trim(),
    }));
    assert.match(g.h1, /Liên hoàn lệnh/, 'Giang hồ: tiêu đề giữ tên Hán Việt');
    assert.match(
      g.sidebar,
      /Liên hoàn lệnh/,
      'Giang hồ: mục thanh bên giữ tên Hán Việt',
    );
    for (const en of ['Worklist', 'worklist', 'focus', 'keyword'])
      assert.ok(!g.text.includes(en), 'Giang hồ: không có chữ ' + en);
    assert.ok(await noOverflow(page), 'Giang hồ: không tràn ngang');
    assert.deepEqual(errors, [], 'Giang hồ: không lỗi trang');
    await context.close();
  }
} finally {
  await h.close();
}
console.log('worklist browser ok');
