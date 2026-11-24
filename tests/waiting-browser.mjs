// v2.52.0 (Việc Chờ Người Khác): đánh dấu một việc đang chờ ai (tên người + ngày nhắc hỏi lại), dist/waiting.js.
// A. Dữ liệu: máy chủ giả dùng đúng hàm kiểm của máy chủ thật (validWorkspace) và ứng dụng dùng valid(): chấp nhận waitFor (≤ 60 ký tự) / waitUntil (ngày hợp lệ hoặc trống),
//    từ chối tên quá dài, sai kiểu, ngày sai; bản cũ không có hai trường vẫn hợp lệ.
// B. Bộ giúp (zenWaiting): việc đã xong hoặc tên trống không tính là đang chờ; câu nói về ngày hẹn (quá hẹn N ngày / hôm nay / nhắc lại dd-mm).
// C. (v2.86.0 Lặng Chờ) Không còn hiện ở đâu, ở 390 (chạm) / 820 (chạm) / 1440 px × Thiền, tối, Giang hồ:
//    1. Tổng quan không còn khối “Đang chờ”; thẻ việc không còn dòng “Đang chờ …”; chuông không còn nhắc việc đến hẹn;
//    2. không còn nút “Đã có phản hồi” / “Nhắc lại sau 3 ngày” ở đâu;
//    3. dữ liệu chờ vẫn nguyên trên máy chủ khi sửa tiêu đề rồi Lưu; chữ lạ (HTML) trong tên không được hiển thị hay chạy.
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
const vn = (n) => new Date(Date.now() + 7 * 3600000 + n * 86400000).toISOString().slice(0, 10);
const seed = () => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 6);
  // t0: đã đến hẹn (quá 2 ngày); t1: hẹn 5 ngày nữa; t2: chưa hẹn ngày; t3 (cột Xong): không tính; t4: bình thường; t5: tên chỉ có khoảng trắng.
  Object.assign(p1.tasks[0], { waitFor: 'anh Sơn', waitUntil: vn(-2) });
  Object.assign(p1.tasks[1], { waitFor: 'bên nhà in', waitUntil: vn(5) });
  Object.assign(p1.tasks[2], { waitFor: 'chị Lan' });
  Object.assign(p1.tasks[3], { waitFor: 'người đã xong', waitUntil: vn(-1) });
  Object.assign(p1.tasks[5], { waitFor: '   ' });
  return { schema: 1, projects: [p1], notes: [] };
};
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const contrast = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
    const rgba = (css) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const mix = (c, under) => [0, 1, 2].map((i) => c[i] * c[3] + under[i] * (1 - c[3]));
    const lum = ([r, g, b]) => [r, g, b].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.push(getComputedStyle(n).backgroundColor);
    let bg = [255, 255, 255];
    for (const css of chain.reverse()) {
      const c = rgba(css);
      if (c[3] > 0) bg = mix(c, bg);
    }
    const fg = mix(rgba(getComputedStyle(el).color), bg), [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);
const taskOf = (server, id) => server.workspace.projects[0].tasks.find((t) => t.id === id);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// ---- A. Kiểm dữ liệu --------------------------------------------------------------------------------------------------------------
{
  const ok = (mut) => {
    const w = seed();
    mut(w.projects[0].tasks[4]);
    return validWorkspace(w);
  };
  assert.equal(validWorkspace(seed()), true, 'dữ liệu có việc chờ hợp lệ');
  assert.equal(ok((t) => (t.waitFor = 'a'.repeat(60))), true, 'tên đúng 60 ký tự');
  assert.equal(ok((t) => (t.waitFor = 'a'.repeat(61))), false, 'tên 61 ký tự bị từ chối');
  assert.equal(ok((t) => (t.waitFor = 5)), false, 'tên sai kiểu bị từ chối');
  assert.equal(ok((t) => (t.waitUntil = '2026-13-40')), false, 'ngày sai bị từ chối');
  assert.equal(ok((t) => (t.waitUntil = 'mai')), false, 'ngày không đúng dạng bị từ chối');
  assert.equal(ok((t) => (t.waitUntil = 20261120)), false, 'ngày sai kiểu bị từ chối');
  assert.equal(ok((t) => ((t.waitFor = 'anh Sơn'), (t.waitUntil = ''))), true, 'ngày trống hợp lệ');
  const plain = seed();
  for (const t of plain.projects[0].tasks) {
    delete t.waitFor;
    delete t.waitUntil;
  }
  assert.equal(validWorkspace(plain), true, 'dữ liệu cũ không có hai trường vẫn hợp lệ');
  console.log('PASS: máy chủ kiểm waitFor / waitUntil');
}

const h = await startHarness({ seed });
try {
  // ---- B. Bộ giúp và hàm kiểm của ứng dụng ----------------------------------------------------------------------------------------
  {
    const { context, page } = await h.open(1440, { workspace: seed() });
    const r = await page.evaluate(
      ([d1, d2, d3]) => {
        const z = window.zenWaiting;
        const mk = (o) => ({ col: 'List', ...o });
        const w = seed2();
        function seed2() {
          return structuredClone(data);
        }
        const bad = (mut) => {
          const c = structuredClone(w);
          mut(c.projects[0].tasks[4]);
          return valid(c);
        };
        return {
          none: z.info(mk({})),
          blank: z.info(mk({ waitFor: '   ' })),
          done: z.info({ col: 'Done', waitFor: 'ai đó' }),
          plain: z.info(mk({ waitFor: ' anh Sơn ', waitUntil: d2 })),
          badDate: z.info(mk({ waitFor: 'x', waitUntil: 'mai' })),
          past: z.label({ who: 'x', until: d1 }),
          today: z.label({ who: 'x', until: d2 }),
          future: z.label({ who: 'x', until: d3 }),
          noDate: z.label({ who: 'x', until: '' }),
          okClient: valid(w),
          longClient: bad((t) => (t.waitFor = 'a'.repeat(61))),
          dateClient: bad((t) => (t.waitUntil = '2026-13-40')),
          typeClient: bad((t) => (t.waitFor = 7)),
        };
      },
      [vn(-2), vn(0), vn(4)],
    );
    assert.equal(r.none, null);
    assert.equal(r.blank, null, 'tên chỉ có khoảng trắng không tính');
    assert.equal(r.done, null, 'việc đã xong không tính là đang chờ');
    assert.deepEqual(r.plain, { who: 'anh Sơn', until: vn(0) });
    assert.deepEqual(r.badDate, { who: 'x', until: '' }, 'ngày sai bị bỏ, vẫn là đang chờ');
    assert.equal(r.past, 'Quá hẹn hỏi lại 2 ngày');
    assert.equal(r.today, 'Hỏi lại hôm nay');
    assert.match(r.future, /^Nhắc lại \d{2}[-/]\d{2}$/);
    assert.equal(r.noDate, '');
    assert.equal(r.okClient, true, 'ứng dụng nhận dữ liệu hợp lệ');
    assert.equal(r.longClient, false, 'ứng dụng từ chối tên quá dài');
    assert.equal(r.dateClient, false, 'ứng dụng từ chối ngày sai');
    assert.equal(r.typeClient, false, 'ứng dụng từ chối tên sai kiểu');
    await context.close();
    console.log('PASS: bộ giúp zenWaiting và valid() của ứng dụng');
  }

  // ---- C. Không còn hiện ở đâu; dữ liệu vẫn giữ (v2.86.0) ----------------------------------------------------------------------
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const [name, colorScheme, setup] of [
      ['Thiền', 'light', null],
      ['tối', 'dark', null],
      ['Giang hồ', 'light', GH],
    ]) {
      const at = ' (' + width + 'px ' + name + ')';
      const { context, page, server } = await h.open(width, { touch, workspace: seed(), colorScheme, setup });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));

      // 1. Tổng quan không còn khối “Đang chờ”; thẻ không còn dòng chờ; chuông không còn nhắc việc đến hẹn.
      await h.show(page, 'dashboard');
      assert.equal(await page.locator('.wf-wait-panel').count(), 0, 'Tổng quan không còn khối “Đang chờ”' + at);
      assert.equal(await page.locator('.wait-row, .wait-actions').count(), 0, 'không còn dòng hay nút chờ ở Tổng quan' + at);
      await h.show(page, 'projects');
      assert.equal(await page.locator('.task-card-wait').count(), 0, 'thẻ việc không còn dòng “Đang chờ …”' + at);
      const bellItems = await page.evaluate(() => {
        bell.click();
        return document.querySelectorAll('#editor-body .notice-list [data-wait-open]').length;
      });
      assert.equal(bellItems, 0, 'chuông không còn nhắc việc đến hẹn hỏi lại' + at);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 }).catch(() => {});

      // 2. Không còn nút “Đã có phản hồi” / “Nhắc lại sau 3 ngày” trên trang nào.
      assert.equal(await page.locator('[data-wait-got], [data-wait-snooze], [data-wait-open]').count(), 0, 'không còn nút chờ' + at);

      // 3. Sửa tiêu đề rồi Lưu: dữ liệu chờ vẫn nguyên trên máy chủ.
      await page.locator('[data-task="p1t0"]').first().click();
      await page.waitForSelector('dialog[open] #editor-form [name=title]');
      await page.fill('#editor-form [name=title]', 'Việc đã sửa');
      await page.click('#editor-form [type=submit]');
      await until(() => taskOf(server, 'p1t0').title === 'Việc đã sửa', 'lưu tiêu đề' + at);
      assert.equal(taskOf(server, 'p1t0').waitFor, 'anh Sơn', 'tên người đang chờ không mất khi lưu' + at);
      assert.equal(taskOf(server, 'p1t0').waitUntil, vn(-2), 'ngày hẹn không mất khi lưu' + at);
      await page.waitForFunction(() => !document.querySelector('#editor').open);
      assert.deepEqual(errors, [], 'không lỗi trang' + at + ': ' + errors);
      await context.close();
    }
  }

  // Tên người lạ (HTML) trong dữ liệu đã lưu không được hiển thị thành thẻ và không chạy mã.
  {
    const xss = seed();
    Object.assign(xss.projects[0].tasks[0], { waitFor: '<img src=x onerror="window.__xss=1">' });
    const { context, page } = await h.open(390, { touch: true, workspace: xss });
    await h.show(page, 'projects');
    await page.waitForTimeout(300);
    await h.show(page, 'dashboard');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.querySelectorAll('#main img[src="x"]').length + (window.__xss ? 1 : 0)), 0, 'chữ lạ không thành thẻ, không chạy mã');
    await context.close();
  }
  console.log('PASS: việc chờ người khác — v2.86.0: không còn hiện ở thẻ, Tổng quan, chuông; dữ liệu chờ vẫn giữ (390, 820, 1440px × Thiền, tối, Giang hồ)');
} finally {
  await h.close();
}
