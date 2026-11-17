// v2.36.0 (Thống Nhất Tên Gọi): mỗi trang chỉ có MỘT tên, giống hệt ở menu bên, tiêu đề trang (h1) và đường dẫn trên cùng.
// A. Tĩnh: không dòng nhãn nhỏ (tham số đầu của heading(...)) nào chỉ gồm chữ không dấu viết hoa — hết “RESOURCE VIEWS”.
// B. Ở 390 (chạm) / 820 (chạm) / 1440 px: Phân bổ tài nguyên, Chế độ tập trung, Tài nguyên, Lưu trữ, Thùng rác, Việc hằng ngày, Ghi chú, Lịch, Gantt:
//    tên menu = h1 = đường dẫn (Lịch, Gantt có thêm “ · tên dự án”); dòng nhãn nhỏ không lặp tên trang, không có tiếng Anh; h1 không bị cắt, không tràn ngang.
//    Phân bổ của một dự án giữ h1 là tên dự án (dòng nhỏ “PHÂN BỔ TÀI NGUYÊN”).
// C. Phong cách Giang hồ: tên giang hồ ở menu = h1 = đường dẫn (Ngân khố, Bế quan, Bảo khố, Phong ấn, Phế tích) và không còn chữ tiếng Anh.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 6), makeProject('p2', 'Farm Yêu Thương', '#e78c56', 3), makeProject('p3', 'Dự án đã cất', '#888888', 1, { archived: true })],
  notes: [],
});
const NOW = '2026-11-17T03:00:00Z';

// A. Tĩnh ---------------------------------------------------------------------------------------------------------------------------------
{
  const ascii = /^[A-Z0-9 ,.\-·/&]+$/; // chỉ chữ không dấu viết hoa
  const found = [];
  for (const f of readdirSync(new URL('../dist/', import.meta.url)).filter((n) => n.endsWith('.js'))) {
    const src = readFileSync(new URL('../dist/' + f, import.meta.url), 'utf8');
    for (const m of src.matchAll(/\bheading\(\s*'([^']*)'/g)) if (m[1] && ascii.test(m[1])) found.push(f + ': ' + m[1]);
  }
  assert.deepEqual(found, [], 'dòng nhãn nhỏ trên tiêu đề không được là chữ không dấu (tiếng Anh): ' + found.join(' | '));
  // Nhật ký phát hành (welcome.js / releases.js) được phép kể lại chuyện đã bỏ chữ này; mọi tệp giao diện khác thì không.
  for (const f of readdirSync(new URL('../dist/', import.meta.url)).filter((n) => /\.(js|html)$/.test(n) && !/^(welcome|releases)\.js$/.test(n))) {
    assert.ok(!/RESOURCE VIEWS/.test(readFileSync(new URL('../dist/' + f, import.meta.url), 'utf8')), 'không còn “RESOURCE VIEWS” trong ' + f);
  }
}

// Các trang cần thống nhất: [view, tên chuẩn, có hậu tố “ · dự án” trên đường dẫn?]
const PAGES = [
  ['budget', 'Phân bổ tài nguyên', false],
  ['focus', 'Chế độ tập trung', false],
  ['resources', 'Tài nguyên', false],
  ['archive', 'Lưu trữ', false],
  ['trash', 'Thùng rác', false],
  ['habits', 'Việc hằng ngày', false],
  ['notes', 'Ghi chú', false],
  ['calendar', 'Lịch', true],
  ['gantt', 'Gantt', true],
];
const GIANGHO = { budget: 'Ngân khố', focus: 'Bế quan', resources: 'Bảo khố', archive: 'Phong ấn', trash: 'Phế tích', habits: 'Nhật khóa', notes: 'Tàng thư', calendar: 'Hoàng lịch', gantt: 'Trận đồ' };
const OLD = ['Đầu tư theo dự án', 'Chọn điều cần tập trung', 'Dự án tạm cất lại', 'Dự án đã lưu trữ', 'RESOURCE VIEWS', 'MỘT VIỆC MỖI LÚC', 'KHO LƯU TRỮ'];

const read = (page, view) =>
  page.evaluate((v) => {
    const btn = document.querySelector('.sidebar [data-view="' + v + '"]');
    const nameBox = btn?.querySelector('.gh-nav-name');
    let menu = '';
    if (nameBox) menu = nameBox.textContent.trim();
    else if (btn) {
      const c = btn.cloneNode(true);
      c.querySelectorAll('span:first-child, svg, small, .gh-nav-plain').forEach((n) => n.remove());
      menu = c.textContent.replace(/\s+/g, ' ').trim();
    }
    const h1 = document.querySelector('#main h1');
    const eyebrow = document.querySelector('#main .page-heading .eyebrow')?.textContent.trim() || '';
    return {
      menu,
      h1: h1 ? (h1.firstChild?.nodeValue || h1.textContent).replace(/\s+/g, ' ').trim() : '',
      crumb: document.querySelector('#crumb').textContent.trim(),
      eyebrow,
      cut: h1 ? h1.scrollWidth > h1.clientWidth + 1 : true,
      wide: document.documentElement.scrollWidth > innerWidth,
      text: document.querySelector('#main').innerText,
    };
  }, view);

const h = await startHarness({ seed });
try {
  // B. Phong cách mặc định -------------------------------------------------------------------------------------------------------------
  for (const [width, touch] of [[390, true], [820, true], [1440, false]]) {
    const at = ' ở ' + width + ' px';
    const { context, page } = await h.open(width, { touch, now: NOW });
    try {
      for (const [view, name, withProject] of PAGES) {
        await h.show(page, view);
        await page.waitForTimeout(150);
        const r = await read(page, view);
        assert.equal(r.menu, name, 'tên menu ' + view + at);
        assert.equal(r.h1, name, 'tiêu đề trang = tên menu: ' + view + at);
        assert.ok(withProject ? r.crumb === name || r.crumb.startsWith(name + ' · ') : r.crumb === name, 'đường dẫn bắt đầu bằng tên trang: ' + view + ' → “' + r.crumb + '”' + at);
        if (r.eyebrow) {
          assert.notEqual(r.eyebrow.toLowerCase(), name.toLowerCase(), 'dòng nhãn không lặp tên trang ' + view + at);
          assert.ok(!/^[A-Z0-9 ]+$/.test(r.eyebrow), 'dòng nhãn có dấu tiếng Việt, không phải tiếng Anh: “' + r.eyebrow + '” ' + view + at);
        }
        for (const bad of OLD) assert.ok(!r.text.includes(bad), 'không còn cách gọi cũ “' + bad + '” ở ' + view + at);
        assert.equal(r.cut, false, 'tiêu đề không bị cắt ' + view + at);
        assert.equal(r.wide, false, 'không tràn ngang ' + view + at);
      }
      // Dòng nhãn nhỏ cụ thể (giữ ý nghĩa mô tả, không còn là một cái tên thứ hai).
      const eyebrows = {};
      for (const view of ['budget', 'focus', 'resources', 'archive']) {
        await h.show(page, view);
        eyebrows[view] = (await read(page, view)).eyebrow;
      }
      assert.deepEqual(eyebrows, { budget: 'ĐẦU TƯ THEO DỰ ÁN', focus: 'CHỌN ĐIỀU CẦN TẬP TRUNG', resources: 'TỆP ĐÍNH KÈM', archive: 'DỰ ÁN TẠM CẤT LẠI' }, 'dòng nhãn nhỏ' + at);
      // Chế độ tập trung vẫn nói rõ “một việc mỗi lúc” ở dòng mô tả.
      await h.show(page, 'focus');
      assert.match((await read(page, 'focus')).text, /Làm trọn một việc mỗi lúc/, 'mô tả Chế độ tập trung' + at);
      // Phân bổ của một dự án: h1 là tên dự án, dòng nhỏ là tên trang.
      await h.show(page, 'budget');
      await page.click('.bg-project[data-bg-open="p1"]');
      await page.waitForFunction(() => document.querySelector('.bg-page h1')?.textContent === 'Khóa tu mùa thu');
      const detail = await read(page, 'budget');
      assert.equal(detail.eyebrow, 'PHÂN BỔ TÀI NGUYÊN', 'dòng nhỏ của trang một dự án' + at);
      assert.equal(detail.crumb, 'Phân bổ tài nguyên', 'đường dẫn của trang một dự án' + at);
    } finally {
      await context.close();
    }
  }

  // C. Phong cách Giang hồ -------------------------------------------------------------------------------------------------------------
  for (const [width, touch] of [[390, true], [1440, false]]) {
    const at = ' ở ' + width + ' px (Giang hồ)';
    const { context, page } = await h.open(width, { touch, now: NOW, setup: ({ context: c }) => c.addInitScript(() => localStorage.setItem('zen-style', 'giangho')) });
    try {
      await page.waitForFunction(() => document.documentElement.dataset.style === 'giangho');
      for (const [view, , withProject] of PAGES) {
        await h.show(page, view);
        await page.waitForTimeout(250);
        const r = await read(page, view);
        const name = GIANGHO[view];
        assert.equal(r.menu, name, 'tên giang hồ ở menu ' + view + at);
        assert.equal(r.h1, name, 'tiêu đề trang = tên menu ' + view + at);
        assert.ok(withProject ? r.crumb === name || r.crumb.startsWith(name + ' · ') : r.crumb === name, 'đường dẫn ' + view + ' → “' + r.crumb + '”' + at);
        assert.ok(!/RESOURCE|VIEWS/.test(r.text), 'không còn tiếng Anh ở ' + view + at);
        assert.equal(r.wide, false, 'không tràn ngang ' + view + at);
      }
    } finally {
      await context.close();
    }
  }
  console.log('naming ok');
} finally {
  await h.close();
}
