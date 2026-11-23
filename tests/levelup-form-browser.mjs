// v2.79.0 (Lên Cấp): form chúc mừng lên cấp + hàng đợi thông báo mừng (dist/growth-celebrate.js).
//  1. Lên cấp thường (không đột phá): hiện form có huy hiệu cấp mới, danh xưng, cảnh giới, điểm còn thiếu tới cấp kế tiếp và cảnh giới kế tiếp,
//     thanh tiến cấp, nút × và nút "Tiếp tục tu luyện", kèm pháo hoa; vượt nhiều cấp thì ghi "VƯỢT n CẤP". Esc, × hay nút đều đóng.
//  2. Hàng đợi: nhiều thông báo cùng lúc hiện LẦN LƯỢT, cái sau chỉ hiện khi đóng cái trước: form lên cấp → chương truyện ký; đột phá cảnh giới
//     (nghi thức, cũng có pháo hoa) → chương truyện ký; lời chúc hoàn thành chưa tắt thì form chờ; hộp thoại khác đang mở thì chờ.
//  3. Giảm chuyển động: không pháo hoa, vòng sáng đứng yên. Tắt "Thông báo điểm nghiệp": không form. Bước đầu vào Sơ nhập giang hồ: không form.
// Kiểm ở 390 (chạm) / 820 (chạm) / 1440 px, Thiền và Giang hồ, sáng và tối: form vừa màn hình, không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const day = (n) =>
  new Date(Date.parse(NOW) + n * 864e5 + 7 * 3600e3).toISOString().slice(0, 10);
// half = nửa điểm đã có: 6 → 3 điểm (cấp 6); 15 → 7,5 điểm (cấp 9, sát ải đột phá cấp 10). Hoàn thành một việc và dồn 1 điểm.
const growth = (half, extra = {}) => ({
  v: 1,
  hero: 'nu',
  name: 'Lam Y',
  since: day(-40),
  log: half
    ? [
        {
          id: 'e1',
          d: day(-1),
          s: 'task',
          k: 'task:e1',
          n: 'Việc cũ',
          p: [half, 0, 0, 0, 0, 0, 0, 0],
        },
      ]
    : [],
  ...extra,
});
const seed = (g) => () => ({
  schema: 1,
  notes: [],
  projects: [makeProject('p1', 'Alpha', '#7950c8', 8)],
  growth: g,
});
const cfg =
  (style, theme) =>
  ({ context }) =>
    context.addInitScript(
      ([s, t]) => {
        localStorage.setItem('zen-style', s);
        localStorage.setItem('zen-theme', t);
      },
      [style, theme],
    );
const finish = (page) =>
  page.evaluate(() => {
    const p = project('p1'),
      t = p.tasks.find((x) => x.col !== 'Done' && !x.archived);
    moveTask(p, t, 'Done');
    return t.id;
  });
const save = async (page, plus = 2) => {
  await page.waitForSelector('#growth-award[open]');
  await page.mouse.move(2, 2);
  for (let i = 0; i < plus; i++) await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-save]');
};
const clearCard = (page) =>
  page.evaluate(() =>
    typeof dismissCompletion === 'function' ? dismissCompletion() : null,
  );
const form = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('dialog.gr-levelup[open]');
    if (!d) return null;
    const r = d.getBoundingClientRect(),
      x = d.querySelector('.gr-lu-x').getBoundingClientRect(),
      go = d.querySelector('.gr-lu-go').getBoundingClientRect(),
      bar = d.querySelector('[role="progressbar"]');
    return {
      eyebrow: d.querySelector('.eyebrow').textContent,
      title: d.querySelector('#gr-lu-title').textContent,
      text: d.querySelector('#gr-lu-text').textContent,
      facts: [...d.querySelectorAll('.gr-lu-facts > div')].map((f) => [
        f.querySelector('dt').textContent,
        f.querySelector('dd').textContent,
      ]),
      emblem: d.querySelector('.gr-lu-emblem .zem')?.dataset.emblem || null,
      bar: bar && [
        bar.getAttribute('aria-valuenow'),
        d.querySelector('.gr-lu-pct').textContent,
      ],
      sparks: d.querySelectorAll('.gr-fw-spark').length,
      still: d.classList.contains('is-still'),
      ringAnim: getComputedStyle(d.querySelector('.gr-lu-ring')).animationName,
      fits:
        r.left >= 0 &&
        r.right <= innerWidth &&
        r.top >= 0 &&
        r.bottom <= innerHeight,
      xOk:
        x.width >= 40 && x.height >= 40 && x.right <= r.right && x.top >= r.top,
      goOk:
        go.height >= 44 &&
        go.left >= r.left &&
        go.right <= r.right &&
        go.bottom <= r.bottom,
      focus: document.activeElement === d.querySelector('.gr-lu-go'),
      hidden: d.querySelector('.gr-fw')?.getAttribute('aria-hidden') || null,
      pointer: d.querySelector('.gr-fw')
        ? getComputedStyle(d.querySelector('.gr-fw')).pointerEvents
        : null,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
const ids = (page) =>
  page.evaluate(() => (window.zenCelebrate ? zenCelebrate.ids() : null));

const h = await startHarness({ seed: seed(growth(6)) });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const style of ['zen', 'giangho']) {
      for (const theme of ['light', 'dark']) {
        const at = ` (${width}px, ${style === 'zen' ? 'Thiền' : 'Giang hồ'}, ${theme === 'dark' ? 'tối' : 'sáng'})`;
        // 1 + 2. Lên cấp thường: form, rồi chương truyện ký chờ sau khi đóng.
        {
          const { context, page } = await h.open(width, {
            touch,
            now: NOW,
            workspace: seed(growth(6))(),
            setup: cfg(style, theme),
          });
          const errors = [];
          page.on('pageerror', (e) => errors.push(e.message));
          await h.show(page, 'projects', 'p1');
          await finish(page);
          await save(page);
          await clearCard(page);
          await page.waitForSelector('dialog.gr-levelup[open]', {
            timeout: 15000,
          });
          await page.waitForTimeout(500);
          const f = await form(page);
          assert.equal(f.eyebrow, 'VƯỢT 2 CẤP', 'vượt hai cấp' + at);
          assert.equal(
            f.title,
            'Cấp 8 · Tụ Khí Đan Điền',
            'cấp và danh xưng' + at,
          );
          assert.equal(
            f.text,
            'Chúc mừng! Lam Y đã vượt 2 cấp, từ cấp 6 lên cấp 8.',
            'lời chúc' + at,
          );
          assert.deepEqual(
            f.facts,
            [
              ['Cảnh giới', 'Sơ nhập giang hồ'],
              ['Danh xưng', 'Tụ Khí Đan Điền'],
              ['Cấp kế tiếp', 'Cấp 9 · Khí Hải Sơ Thành · còn 0,5 điểm'],
              ['Cảnh giới kế tiếp', 'Tam lưu cao thủ · còn 4 điểm'],
            ],
            'thông tin chi tiết của cấp' + at,
          );
          assert.equal(f.emblem, '8', 'huy hiệu của cấp mới' + at);
          assert.deepEqual(f.bar, ['0', '0% tới cấp 9'], 'thanh tiến cấp' + at);
          assert.ok(
            f.sparks >= 100 && f.hidden === 'true' && f.pointer === 'none',
            'có pháo hoa, trang trí, không bắt chuột: ' + f.sparks + at,
          );
          assert.ok(
            !f.still && f.ringAnim !== 'none',
            'vòng sáng chuyển động' + at,
          );
          assert.ok(
            f.fits && f.xOk && f.goOk && f.focus && !f.overflow,
            'form vừa màn hình, nút × và nút chính bấm được, tiêu điểm ở nút chính' +
              at +
              JSON.stringify(f),
          );
          // Hàng đợi: chương truyện ký chưa hiện khi form còn mở.
          assert.deepEqual(
            await ids(page),
            ['level-up', 'story'],
            'hàng đợi: form rồi chương truyện' + at,
          );
          await page.waitForTimeout(1500);
          assert.equal(
            await page.locator('dialog.gr-story').count(),
            0,
            'form còn mở thì chương truyện chưa hiện' + at,
          );
          assert.equal(
            await page.locator('dialog.gr-levelup[open]').count(),
            1,
            'chỉ một thông báo mừng' + at,
          );
          // Bấm × thì chương truyện hiện.
          await page.locator('dialog.gr-levelup .gr-lu-x').click();
          await page.waitForFunction(
            () => !document.querySelector('dialog.gr-levelup'),
          );
          await page.waitForSelector('dialog.gr-story[open]', {
            timeout: 10000,
          });
          assert.deepEqual(
            await ids(page),
            ['story'],
            'chương truyện đang mở' + at,
          );
          await page.locator('[data-story-close]').click();
          await page.waitForFunction(
            () =>
              !document.querySelector('dialog.gr-story') &&
              zenCelebrate.pending() === 0,
            null,
            { timeout: 8000 },
          );
          assert.deepEqual(errors, [], 'không lỗi trang' + at);
          await context.close();
        }
        // 2b. Đột phá cảnh giới: nghi thức có pháo hoa, chương truyện chờ sau nghi thức.
        {
          const { context, page } = await h.open(width, {
            touch,
            now: NOW,
            workspace: seed(growth(15))(),
            setup: cfg(style, theme),
          });
          const errors = [];
          page.on('pageerror', (e) => errors.push(e.message));
          await h.show(page, 'projects', 'p1');
          await finish(page);
          await save(page);
          await clearCard(page);
          await page.waitForSelector('dialog.gr-breakthrough[open]', {
            timeout: 15000,
          });
          await page.waitForTimeout(400);
          const bt = await page.evaluate(() => ({
            sparks: document.querySelectorAll(
              'dialog.gr-breakthrough .gr-fw-spark',
            ).length,
            levelup: document.querySelectorAll('dialog.gr-levelup').length,
            ids: zenCelebrate.ids(),
            story: document.querySelectorAll('dialog.gr-story').length,
          }));
          assert.ok(bt.sparks >= 100, 'nghi thức đột phá có pháo hoa' + at);
          assert.equal(
            bt.levelup,
            0,
            'đột phá đã là form chúc mừng, không thêm form lên cấp' + at,
          );
          assert.deepEqual(
            bt.ids,
            ['breakthrough', 'story'],
            'hàng đợi: nghi thức rồi chương truyện' + at,
          );
          assert.equal(
            bt.story,
            0,
            'nghi thức còn mở thì chương truyện chưa hiện' + at,
          );
          await page.locator('dialog.gr-breakthrough button').click();
          await page.waitForSelector('dialog.gr-story[open]', {
            timeout: 10000,
          });
          await page.locator('[data-story-close]').click();
          await page.waitForFunction(
            () =>
              !document.querySelector('dialog.gr-story') &&
              zenCelebrate.pending() === 0,
            null,
            { timeout: 8000 },
          );
          assert.deepEqual(errors, [], 'không lỗi trang (đột phá)' + at);
          await context.close();
        }
      }
    }
  }

  // 2c. Hàng đợi chạy lần lượt (ba thông báo giả): cái sau chỉ mở khi cái trước gọi done.
  {
    const { context, page } = await h.open(1440, {
      touch: false,
      now: NOW,
      workspace: seed(growth(6))(),
    });
    await h.show(page, 'growth');
    await page.waitForFunction(() => window.zenCelebrate);
    const r = await page.evaluate(async () => {
      const log = [],
        wait = (ms) => new Promise((ok) => setTimeout(ok, ms)),
        dones = {},
        closed = {};
      const mk = (id) => ({
        id,
        open: (done) => (
          log.push('mở ' + id),
          (dones[id] = () => {
            if (!closed[id]) log.push('xong ' + id);
            closed[id] = true;
            done(); // vẫn gọi lại done() mỗi lần: hàng đợi phải tự chặn lần gọi thừa
          })
        ),
      });
      zenCelebrate.enqueue(mk('a'));
      zenCelebrate.enqueue(mk('b'));
      zenCelebrate.enqueue(mk('c'));
      await wait(900);
      const s1 = {
        log: log.slice(),
        pending: zenCelebrate.pending(),
        ids: zenCelebrate.ids(),
      };
      dones.a();
      dones.a(); // gọi hai lần vẫn chỉ tính một
      await wait(900);
      const s2 = { log: log.slice(), pending: zenCelebrate.pending() };
      dones.b();
      await wait(900);
      dones.c();
      await wait(500);
      return {
        s1,
        s2,
        end: { log: log.slice(), pending: zenCelebrate.pending() },
      };
    });
    assert.deepEqual(
      r.s1,
      { log: ['mở a'], pending: 3, ids: ['a', 'b', 'c'] },
      'chỉ mở thông báo đầu, hai cái còn lại chờ',
    );
    assert.deepEqual(
      r.s2,
      { log: ['mở a', 'xong a', 'mở b'], pending: 2 },
      'đóng a thì b mới mở, c vẫn chờ',
    );
    assert.deepEqual(
      r.end,
      {
        log: ['mở a', 'xong a', 'mở b', 'xong b', 'mở c', 'xong c'],
        pending: 0,
      },
      'lần lượt a, b, c',
    );
    // Hộp thoại khác đang mở thì chờ.
    await page.evaluate(() => {
      window.__opened = 0;
      zenCelebrate.enqueue({
        id: 'w',
        open: (done) => (window.__opened++, done()),
      });
    });
    await page.evaluate(() => {
      const d = document.createElement('dialog');
      d.id = 'blocker';
      document.body.append(d);
      d.showModal();
    });
    await page.evaluate(() =>
      zenCelebrate.enqueue({
        id: 'late',
        open: (done) => {
          window.__late = true;
          done();
        },
      }),
    );
    await page.waitForTimeout(1300);
    assert.equal(
      await page.evaluate(() => window.__late || false),
      false,
      'hộp thoại khác còn mở thì thông báo mừng chờ',
    );
    await page.evaluate(() => document.querySelector('#blocker').close());
    await page.waitForFunction(() => window.__late === true, null, {
      timeout: 5000,
    });
    await context.close();
  }

  // 3a. Lời chúc hoàn thành chưa tắt thì form chờ; bấm × của lời chúc thì form hiện.
  {
    const { context, page } = await h.open(1440, {
      touch: false,
      now: NOW,
      workspace: seed(growth(6))(),
    });
    await h.show(page, 'projects', 'p1');
    await finish(page);
    await save(page);
    await page.waitForSelector('.completion-overlay');
    await page.waitForTimeout(1500);
    assert.equal(
      await page.locator('dialog.gr-levelup').count(),
      0,
      'lời chúc hoàn thành còn đó thì form chờ',
    );
    assert.deepEqual(
      await ids(page),
      ['level-up', 'story'],
      'form đang chờ trong hàng đợi',
    );
    await page.locator('.completion-close').click();
    await page.waitForSelector('dialog.gr-levelup[open]', { timeout: 5000 });
    await context.close();
  }

  // 3b. Esc đóng form; giảm chuyển động: không pháo hoa, vòng sáng đứng yên.
  {
    const { context, page } = await h.open(390, {
      touch: true,
      now: NOW,
      workspace: seed(growth(6))(),
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await h.show(page, 'projects', 'p1');
    await finish(page);
    await save(page);
    await clearCard(page);
    await page.waitForSelector('dialog.gr-levelup[open]', { timeout: 15000 });
    await page.waitForTimeout(300);
    const f = await form(page);
    assert.ok(
      f.still && f.sparks === 0 && f.ringAnim === 'none',
      'giảm chuyển động: không pháo hoa, vòng sáng đứng yên: ' +
        JSON.stringify([f.still, f.sparks, f.ringAnim]),
    );
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => !document.querySelector('dialog.gr-levelup'),
    );
    await page.waitForSelector('dialog.gr-story[open]', { timeout: 10000 });
    await context.close();
  }

  // 3c. Tắt "Thông báo điểm nghiệp": không form. Bước đầu vào Sơ nhập giang hồ: không form.
  {
    const quiet = await h.open(1440, {
      touch: false,
      now: NOW,
      workspace: seed(growth(6, { notify: false }))(),
    });
    await h.show(quiet.page, 'projects', 'p1');
    await finish(quiet.page);
    await save(quiet.page);
    await clearCard(quiet.page);
    await quiet.page.waitForFunction(
      () => !document.querySelector('#growth-award'),
    );
    await quiet.page.waitForTimeout(1500);
    assert.equal(
      await quiet.page.locator('dialog.gr-levelup').count(),
      0,
      'tắt thông báo điểm nghiệp thì không có form lên cấp',
    );
    await quiet.context.close();
    const first = await h.open(1440, {
      touch: false,
      now: NOW,
      workspace: seed(growth(0, { log: [] }))(),
    });
    await h.show(first.page, 'projects', 'p1');
    await finish(first.page);
    await save(first.page, 1);
    await clearCard(first.page);
    await first.page.waitForFunction(
      () => !document.querySelector('#growth-award'),
    );
    await first.page.waitForTimeout(1500);
    assert.equal(
      await first.page.locator('dialog.gr-levelup').count(),
      0,
      'bước đầu vào Sơ nhập giang hồ không phải lên cấp, không có form',
    );
    await first.context.close();
  }
  console.log(
    'PASS: form chúc mừng lên cấp có pháo hoa và hàng đợi thông báo lần lượt (390/820/1440px, Thiền/Giang hồ, sáng/tối).',
  );
} finally {
  await h.close();
}
