// v2.51.0 (Chia Sẻ Vào App): nút Chia sẻ của điện thoại → Zen Studio → hộp “Lưu nội dung được chia sẻ” (dist/share-target.js).
// A. Bộ chuẩn hóa (hàm thuần zenShareTarget.parse): ba tham số title/text/url; Android dồn liên kết vào text; liên kết chỉ nhận http(s);
//    thiếu tiêu đề thì lấy dòng đầu / tên miền; cắt đúng giới hạn máy chủ (tiêu đề 150, nội dung 10.000, liên kết 2.000); không có gì → không mở.
// B. Giao diện ở 390 (chạm) / 820 (chạm) / 1440 px × Thiền, Giang hồ, tối: mở bằng đường dẫn chia sẻ → tham số bị xóa khỏi thanh địa chỉ, hộp hiện đúng, ô tiêu đề được focus,
//    nằm gọn trong màn hình, nút ≥ 44 px khi chạm, đổi giữa Ghi chú / Việc đổi đúng ô (liên kết ↔ dự án), chữ đủ tương phản, không tràn ngang.
// C. Lưu thành Ghi chú / thành Việc (lên máy chủ giả, đúng hình dạng máy chủ chấp nhận); Esc / × / Bỏ qua không lưu gì và tải lại không hiện lại; bản chỉ xem không lưu gì.
// D. Nội dung từ ứng dụng khác là chữ thuần: thẻ HTML / script không được chạy; tên dự án có ký tự đặc biệt được thoát ký tự.
// E. Đăng nhập chậm: nội dung được giữ lại, hộp chỉ hiện khi ứng dụng sẵn sàng; manifest có share_target; Giang hồ đổi đủ chữ của hộp và thông báo.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá hạn chờ: ' + label);
}
const seed = () => ({
  schema: 1,
  projects: [
    makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 2),
    makeProject('p2', 'Hương <b>Thiền</b> & "Nature"', '#c764a2', 2),
    makeProject('p3', 'Dự án cũ đã lưu trữ', '#888888', 1, { archived: true }),
  ],
  notes: [],
});
const STYLES = {
  zen: ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'zen')),
  giangho: ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho')),
};
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
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
const shareUrl = (page, params) => new URL(page.url()).origin + '/?' + new URLSearchParams(params);
const openShared = async (page, params) => {
  await page.goto(shareUrl(page, params));
  await page.waitForSelector('dialog.zen-share[open]', { timeout: 10000 });
};
const reopenClean = async (page) => {
  await page.goto(new URL(page.url()).origin + '/');
  await page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa' && document.documentElement.dataset.zenReady === '1');
};

const h = await startHarness({ seed });
try {
  // ---- A. Bộ chuẩn hóa ------------------------------------------------------------------------------------------------------
  {
    const { context, page } = await h.open(1440, { workspace: seed() });
    const r = await page.evaluate(() => {
      const z = window.zenShareTarget;
      return {
        full: z.parse('?title=A&text=B&url=' + encodeURIComponent('https://x.test/p?q=1')),
        linkInText: z.parse('?title=Bài+hay&text=' + encodeURIComponent('Đọc kỹ đoạn này\nhttps://example.com/bai?x=1')),
        onlyLink: z.parse('?text=' + encodeURIComponent('https://www.example.com/a')),
        noTitle: z.parse('?text=' + encodeURIComponent('Gọi lại anh Sơn\nvà hỏi giá')),
        badScheme: z.parse('?title=T&url=' + encodeURIComponent('javascript:alert(1)')),
        badSchemeInText: z.parse('?title=T&text=' + encodeURIComponent('data:text/html,<b>x</b> javascript:alert(1)')),
        empty: z.parse(''),
        unrelated: z.parse('?foo=1&bar=2'),
        long: z.parse('?title=' + 'a'.repeat(400) + '&text=' + 'b'.repeat(30000) + '&url=' + encodeURIComponent('https://x.test/' + 'c'.repeat(3000))),
        crlf: z.parse('?title=T&text=' + encodeURIComponent('một\r\nhai\rba')),
        urlOnly: z.parse('?url=' + encodeURIComponent('https://www.news.test/tin-tuc')),
      };
    });
    assert.deepEqual(r.full, { title: 'A', text: 'B', url: 'https://x.test/p?q=1' }, 'đủ ba tham số');
    assert.equal(r.linkInText.title, 'Bài hay');
    assert.equal(r.linkInText.url, 'https://example.com/bai?x=1', 'liên kết nằm trong text được tách ra');
    assert.match(r.linkInText.text, /^Đọc kỹ đoạn này/, 'text giữ nguyên chữ');
    assert.deepEqual(r.onlyLink, { title: 'example.com', text: '', url: 'https://www.example.com/a' }, 'chỉ có liên kết: text trống, tiêu đề là tên miền');
    assert.equal(r.noTitle.title, 'Gọi lại anh Sơn', 'thiếu tiêu đề thì lấy dòng đầu');
    assert.equal(r.badScheme.url, '', 'javascript: không được nhận làm liên kết');
    assert.equal(r.badSchemeInText.url, '', 'data:/javascript: trong text không thành liên kết');
    assert.equal(r.empty, null, 'không có gì thì không mở hộp');
    assert.equal(r.unrelated, null, 'tham số không liên quan thì không mở hộp');
    assert.equal(r.long.title.length, 150, 'tiêu đề cắt ở 150');
    assert.equal(r.long.text.length, 10000, 'nội dung cắt ở 10.000');
    assert.equal(r.long.url.length <= 2000, true, 'liên kết cắt ở 2.000');
    assert.equal(r.crlf.text, 'một\nhai\nba', 'xuống dòng được thống nhất');
    assert.deepEqual(r.urlOnly, { title: 'news.test', text: '', url: 'https://www.news.test/tin-tuc' });
    await context.close();
    console.log('PASS: bộ chuẩn hóa nội dung chia sẻ');
  }

  // ---- B/C. Giao diện, lưu, bỏ qua ---------------------------------------------------------------------------------------------
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const [style, colorScheme] of [
      ['zen', 'light'],
      ['zen', 'dark'],
      ['giangho', 'light'],
    ]) {
      const giang = style === 'giangho';
      const at = ' (' + width + 'px ' + style + ' ' + colorScheme + ')';
      const { context, page, server } = await h.open(width, { touch, workspace: seed(), colorScheme, setup: STYLES[style] });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));

      // Mở bằng đường dẫn chia sẻ: liên kết nằm trong text (kiểu Android).
      await openShared(page, { title: 'Bài hay', text: 'Đọc kỹ đoạn này\nhttps://example.com/bai?x=1' });
      assert.equal(await page.evaluate(() => location.search), '', 'tham số bị xóa khỏi thanh địa chỉ' + at);
      const f = await page.evaluate(() => {
        const d = document.querySelector('dialog.zen-share');
        const form = d.querySelector('form');
        const r = d.getBoundingClientRect();
        return {
          title: form.elements.title.value,
          text: form.elements.text.value,
          url: form.elements.url.value,
          kind: form.elements.kind.value,
          focus: document.activeElement?.name,
          urlShown: !d.querySelector('[data-share-url]').hidden,
          projectShown: !d.querySelector('[data-share-project]').hidden,
          options: [...form.elements.project.options].map((o) => o.textContent),
          rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
          vw: innerWidth,
          vh: innerHeight,
          buttons: [...d.querySelectorAll('.zen-share-actions .btn')].map((b) => b.getBoundingClientRect().height),
          heading: d.querySelector('h2').textContent,
          legend: d.querySelector('legend').textContent,
          kinds: [...d.querySelectorAll('.zen-share-kind span')].map((s) => s.textContent),
        };
      });
      assert.equal(f.title, 'Bài hay', 'tiêu đề điền sẵn' + at);
      assert.match(f.text, /^Đọc kỹ đoạn này/, 'nội dung điền sẵn' + at);
      assert.equal(f.url, 'https://example.com/bai?x=1', 'liên kết điền sẵn' + at);
      assert.equal(f.kind, 'note', 'mặc định lưu thành ghi chú' + at);
      assert.equal(f.focus, 'title', 'ô tiêu đề được focus' + at);
      assert.equal(f.urlShown && !f.projectShown, true, 'ghi chú: có ô liên kết, không có ô dự án' + at);
      assert.equal(f.options.length, 2, 'chỉ liệt kê dự án đang dùng, không có dự án đã lưu trữ' + at);
      assert.ok(f.rect.left >= 0 && f.rect.right <= f.vw + 0.5 && f.rect.top >= 0 && f.rect.bottom <= f.vh + 0.5, 'hộp nằm gọn trong màn hình ' + JSON.stringify(f.rect) + at);
      if (touch) assert.ok(f.buttons.every((x) => x >= 43.5), 'nút ≥ 44 px khi chạm ' + f.buttons + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      assert.equal(f.heading, giang ? 'Cất nội dung được truyền tới' : 'Lưu nội dung được chia sẻ', 'tiêu đề hộp' + at);
      assert.equal(f.legend, giang ? 'Cất thành' : 'Lưu thành', 'nhãn chọn nơi lưu' + at);
      assert.deepEqual(f.kinds, giang ? ['Quyển', 'Nhiệm vụ'] : ['Ghi chú', 'Việc'], 'hai lựa chọn' + at);
      for (const s of ['.zen-share h2', '.zen-share-lead', '.zen-share legend', '.zen-share-kind span', '.zen-share-form label', '.zen-share-actions .btn:not(.primary)']) {
        const c = await contrast(page, s);
        assert.ok(c !== null && c >= 4.5, 'chữ ' + s + ' đủ tương phản (' + c?.toFixed(2) + ')' + at);
      }

      // Đổi sang “Việc”: ẩn liên kết, hiện dự án (cũng đủ lớn khi chạm).
      await page.locator('.zen-share-kind label').nth(1).click();
      const sw = await page.evaluate(() => {
        const d = document.querySelector('dialog.zen-share');
        const sel = d.querySelector('select[name=project]');
        return { urlShown: !d.querySelector('[data-share-url]').hidden, projectShown: !d.querySelector('[data-share-project]').hidden, selectHeight: sel.getBoundingClientRect().height, label: d.querySelector('[data-share-project]').firstChild.textContent.trim() };
      });
      assert.equal(sw.urlShown, false, 'việc: ẩn ô liên kết' + at);
      assert.equal(sw.projectShown, true, 'việc: hiện ô dự án' + at);
      if (touch) assert.ok(sw.selectHeight >= 43.5, 'ô chọn dự án ≥ 44 px' + at);
      if (giang) await until(() => page.evaluate(() => document.querySelector('[data-share-project]').firstChild.textContent.trim() === 'Đại sự'), 'nhãn Đại sự' + at);
      assert.equal(await page.evaluate(() => document.querySelector('[data-share-project]').firstChild.textContent.trim()), giang ? 'Đại sự' : 'Dự án', 'nhãn dự án' + at);
      await page.locator('.zen-share-kind label').nth(0).click();

      // Lưu thành ghi chú.
      await page.click('[data-zen-share-save]');
      await page.waitForFunction(() => !document.querySelector('dialog.zen-share'));
      await until(() => server.workspace.notes.some((n) => n.title === 'Bài hay'), 'ghi chú lên máy chủ' + at);
      const note = server.workspace.notes.find((n) => n.title === 'Bài hay');
      assert.equal(note.type, 'note', 'loại ghi chú' + at);
      assert.equal(note.url, 'https://example.com/bai?x=1', 'liên kết lưu đúng' + at);
      assert.match(note.text, /^Đọc kỹ đoạn này/, 'nội dung lưu đúng' + at);
      assert.match(note.color, /^#[0-9a-f]{6}$/i, 'màu hợp lệ' + at);
      assert.ok(note.id && note.group === '', 'có mã, nhóm trống' + at);
      await until(() => page.evaluate(() => /Bài hay/.test(document.querySelector('#toast')?.textContent || '')), 'thông báo đã lưu' + at);
      if (giang) await until(() => page.evaluate(() => /^Đã cất vào Tàng thư: Bài hay/.test(document.querySelector('#toast').textContent)), 'thông báo giang hồ' + at);
      assert.match(await page.textContent('#toast'), giang ? /^Đã cất vào Tàng thư: Bài hay/ : /^Đã lưu vào Ghi chú: Bài hay/, 'thông báo' + at);

      // Tải lại: không hiện lại.
      await reopenClean(page);
      assert.equal(await page.locator('dialog.zen-share').count(), 0, 'tải lại không hiện lại hộp' + at);
      assert.equal(await page.evaluate(() => sessionStorage.getItem('zen-share-pending')), null, 'đã xóa nội dung chờ' + at);

      // Lưu thành việc: tiêu đề tự lấy từ dòng đầu của text.
      await openShared(page, { text: 'Gọi lại cho anh Sơn', url: 'https://example.com/x' });
      assert.equal(await page.inputValue('.zen-share [name=title]'), 'Gọi lại cho anh Sơn', 'tiêu đề lấy từ text' + at);
      await page.locator('.zen-share-kind label').nth(1).click();
      await page.selectOption('.zen-share [name=project]', 'p2');
      await page.click('[data-zen-share-save]');
      await page.waitForFunction(() => !document.querySelector('dialog.zen-share'));
      await until(() => server.workspace.projects.find((p) => p.id === 'p2').tasks.some((t) => t.title === 'Gọi lại cho anh Sơn'), 'việc lên máy chủ' + at);
      const task = server.workspace.projects.find((p) => p.id === 'p2').tasks.find((t) => t.title === 'Gọi lại cho anh Sơn');
      assert.equal(task.description, 'Gọi lại cho anh Sơn\nhttps://example.com/x', 'mô tả gồm nội dung và liên kết' + at);
      assert.equal(task.col, 'List', 'vào cột Cần làm' + at);
      assert.equal(task.due, '', 'chưa có hạn' + at);
      assert.ok(Array.isArray(task.checks) && Array.isArray(task.labels), 'đúng hình dạng việc' + at);
      assert.equal(server.workspace.projects.find((p) => p.id === 'p1').tasks.length, 2, 'dự án khác không bị đổi' + at);
      const expectedToast = giang ? 'Đã thêm nhiệm vụ “Gọi lại cho anh Sơn” vào ' : 'Đã thêm việc “Gọi lại cho anh Sơn” vào ';
      await until(() => page.evaluate((t) => document.querySelector('#toast').textContent.startsWith(t), expectedToast), 'thông báo thêm việc' + at);

      // Bỏ qua bằng Esc, nút ×, nút Bỏ qua và bấm nền: không lưu gì, tải lại không hiện lại.
      const before = JSON.stringify(server.workspace);
      for (const how of ['esc', 'x', 'skip']) {
        await openShared(page, { title: 'Bỏ qua ' + how, text: 'không lưu' });
        if (how === 'esc') await page.keyboard.press('Escape');
        else if (how === 'x') await page.click('.zen-share [data-zen-share-close].exit-x');
        else await page.click('.zen-share-actions [data-zen-share-close]');
        await page.waitForFunction(() => !document.querySelector('dialog.zen-share'));
        await reopenClean(page);
        assert.equal(await page.locator('dialog.zen-share').count(), 0, 'đóng bằng ' + how + ' rồi không hiện lại' + at);
      }
      assert.equal(JSON.stringify(server.workspace), before, 'bỏ qua thì không lưu gì' + at);

      // Thiếu tiêu đề: báo lỗi, không lưu, hộp vẫn mở.
      await openShared(page, { title: 'Tạm', text: 'x' });
      await page.fill('.zen-share [name=title]', '   ');
      await page.click('[data-zen-share-save]');
      assert.equal(await page.locator('dialog.zen-share[open]').count(), 1, 'hộp vẫn mở khi thiếu tiêu đề' + at);
      await until(() => page.evaluate(() => /tiêu đề/.test(document.querySelector('.zen-share-status').textContent)), 'báo thiếu tiêu đề' + at);
      if (giang) assert.equal(await page.textContent('.zen-share-status'), 'Hãy ghi tiêu đề.', 'lời báo giọng giang hồ' + at);
      // Liên kết sai giao thức bị từ chối khi lưu ghi chú.
      await page.fill('.zen-share [name=title]', 'Tạm');
      await page.fill('.zen-share [name=url]', 'javascript:alert(1)');
      await page.click('[data-zen-share-save]');
      await until(() => page.evaluate(() => /https:\/\//.test(document.querySelector('.zen-share-status').textContent)), 'báo liên kết sai' + at);
      assert.equal(server.workspace.notes.some((n) => n.title === 'Tạm'), false, 'không lưu liên kết sai' + at);
      // Bản chỉ xem từ chối.
      await page.fill('.zen-share [name=url]', '');
      await page.evaluate(() => {
        contentReadOnly = true;
      });
      // (Ứng dụng đã chặn mọi nút bấm ở bản chỉ xem; hộp này còn tự từ chối thêm một lớp nữa.)
      await page.click('[data-zen-share-save]');
      await wait(400);
      assert.equal(await page.evaluate(() => data.notes.some((n) => n.title === 'Tạm')), false, 'bản chỉ xem không lưu vào bộ nhớ' + at);
      assert.equal(server.workspace.notes.some((n) => n.title === 'Tạm'), false, 'bản chỉ xem không lưu lên máy chủ' + at);
      assert.equal(await page.locator('dialog.zen-share[open]').count(), 1, 'hộp vẫn mở ở bản chỉ xem' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at + ': ' + errors);
      await context.close();
    }
  }
  console.log('PASS: hộp lưu nội dung được chia sẻ — 390, 820, 1440px × Thiền, tối, Giang hồ (mở, điền sẵn, lưu ghi chú / việc, bỏ qua, báo lỗi, bản chỉ xem)');

  // ---- D. Chữ thuần ----------------------------------------------------------------------------------------------------------
  {
    const { context, page, server } = await h.open(1440, { workspace: seed() });
    const evil = '<img src=x onerror="window.__xss=1"> <script>window.__xss=2</script>';
    await openShared(page, { title: evil, text: evil + '\nhttps://example.com/ok' });
    const inside = await page.evaluate(() => ({
      nodes: document.querySelectorAll('dialog.zen-share img, dialog.zen-share script, dialog.zen-share b').length,
      xss: window.__xss,
      title: document.querySelector('.zen-share [name=title]').value,
      projects: [...document.querySelectorAll('.zen-share [name=project] option')].map((o) => o.textContent),
      selectHtmlHasTag: /<b>/.test(document.querySelector('.zen-share [name=project]').innerHTML),
    }));
    assert.equal(inside.nodes, 0, 'chữ lạ không thành phần tử');
    assert.equal(inside.xss, undefined, 'mã lạ không chạy');
    assert.equal(inside.title, evil.slice(0, 150), 'tiêu đề giữ nguyên chữ (cắt ở 150)');
    assert.deepEqual(inside.projects, ['Khóa tu mùa thu', 'Hương <b>Thiền</b> & "Nature"'], 'tên dự án là chữ thuần');
    assert.equal(inside.selectHtmlHasTag, false, 'tên dự án được thoát ký tự trong mã nguồn');
    await page.fill('.zen-share [name=title]', 'An toàn');
    await page.click('[data-zen-share-save]');
    await page.waitForFunction(() => !document.querySelector('dialog.zen-share'));
    await until(() => server.workspace.notes.some((n) => n.title === 'An toàn'), 'lưu ghi chú an toàn');
    const saved = server.workspace.notes.find((n) => n.title === 'An toàn');
    assert.ok(saved.text.includes('<img src=x'), 'nội dung được giữ nguyên dạng chữ');
    await h.show(page, 'notes');
    assert.equal(await page.evaluate(() => document.querySelectorAll('#main img[src="x"]').length), 0, 'trang ghi chú không dựng ảnh từ chữ lạ');
    assert.equal(await page.evaluate(() => window.__xss), undefined, 'mã lạ không chạy ở trang ghi chú');
    await context.close();
    console.log('PASS: nội dung chia sẻ là chữ thuần (không chạy mã, tên dự án được thoát ký tự)');
  }

  // ---- E. Giới hạn, đăng nhập chậm, manifest ------------------------------------------------------------------------------------
  {
    const { context, page, server } = await h.open(1440, { workspace: seed() });
    // Đăng nhập chậm: nội dung được giữ, hộp chỉ hiện khi ứng dụng sẵn sàng.
    server.meDelay = 1800;
    await page.goto(shareUrl(page, { title: 'Chờ đăng nhập', text: 'nội dung' }), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => sessionStorage.getItem('zen-share-pending') !== null);
    assert.equal(await page.evaluate(() => location.search), '', 'tham số đã xóa dù chưa đăng nhập xong');
    assert.equal(await page.locator('dialog.zen-share').count(), 0, 'chưa sẵn sàng thì chưa hiện hộp');
    await page.waitForSelector('dialog.zen-share[open]', { timeout: 10000 });
    assert.equal(await page.inputValue('.zen-share [name=title]'), 'Chờ đăng nhập', 'nội dung còn nguyên sau khi đăng nhập xong');
    server.meDelay = 0;
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.zen-share'));

    // Lời chào định kỳ không được chồng lên hộp chia sẻ; hộp đóng rồi thì chào bình thường.
    await openShared(page, { title: 'Chào sau', text: 'x' });
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) if (k.startsWith('zen-welcome:')) localStorage.removeItem(k);
    });
    await page.evaluate(() => dailyWelcome());
    await wait(900);
    assert.equal(await page.locator('.welcome-dialog').count(), 0, 'lời chào không chồng lên hộp chia sẻ');
    assert.equal(await page.locator('dialog.zen-share[open]').count(), 1, 'hộp chia sẻ vẫn là hộp đang mở');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.zen-share'));
    await page.evaluate(() => dailyWelcome());
    await page.waitForSelector('.welcome-dialog[open]', { timeout: 10000 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.welcome-dialog[open]'));

    // Nội dung quá dài: tự cắt ở giới hạn nên lưu được; việc thì báo mô tả quá dài.
    // (Chia sẻ qua đường dẫn nên phần chữ quá lớn có thể bị máy chủ từ chối từ trước khi tới ứng dụng; 12.000 ký tự vẫn đi qua được.)
    await openShared(page, { title: 'Dài', text: 'b'.repeat(12000) });
    assert.equal(await page.evaluate(() => document.querySelector('.zen-share [name=text]').value.length), 10000, 'cắt ở 10.000 ký tự');
    await page.click('[data-zen-share-save]');
    await page.waitForFunction(() => !document.querySelector('dialog.zen-share'));
    await until(() => server.workspace.notes.some((n) => n.title === 'Dài'), 'ghi chú dài lên máy chủ');
    await openShared(page, { title: 'Dài việc', text: 'b'.repeat(6000) });
    await page.locator('.zen-share-kind label').nth(1).click();
    await page.click('[data-zen-share-save]');
    await until(() => page.evaluate(() => /5\.000/.test(document.querySelector('.zen-share-status').textContent)), 'báo mô tả việc quá dài');
    assert.equal(await page.locator('dialog.zen-share[open]').count(), 1, 'hộp vẫn mở để rút gọn');
    await page.keyboard.press('Escape');

    // Không mở khi không có gì để lưu / tham số không liên quan.
    await page.goto(new URL(page.url()).origin + '/?foo=1&utm_source=x');
    await page.waitForFunction(() => document.documentElement.dataset.zenReady === '1');
    await wait(400);
    assert.equal(await page.locator('dialog.zen-share').count(), 0, 'tham số không liên quan không mở hộp');

    // Manifest khai báo share_target.
    const manifest = await page.evaluate(() => fetch('/manifest.webmanifest').then((r) => r.json()));
    assert.deepEqual(manifest.share_target, { action: '/', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } }, 'manifest có share_target');
    await context.close();
    console.log('PASS: giới hạn độ dài, đăng nhập chậm, tham số không liên quan, manifest');
  }
} finally {
  await h.close();
}
