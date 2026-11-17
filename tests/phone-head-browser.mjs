// v2.38.0 (Đầu Trang Điện Thoại Gọn): trên điện thoại, dải dự án (#tabs) và thanh Bảng / Lịch / Gantt chỉ hiện khi đang xem một dự án.
// Trước đây hai thanh này chiếm khoảng 135px trên cùng của MỌI trang (tổng đầu trang ≈ 190/844px), kể cả Tổng quan, Ghi chú, Việc hằng ngày...
// A. 390 và 360 px (chạm): ở 9 trang khác (Tổng quan, Ghi chú, Hằng ngày, Phân bổ, Tài nguyên, Chế độ tập trung, Lưu trữ, Thùng rác, Phiên bản)
//    hai thanh bị ẩn, nội dung bắt đầu ngay dưới thanh trên (≤ 64px); ở Bảng / Lịch / Gantt hai thanh hiện đủ, bấm Lịch → Gantt → Bảng đổi trang đúng.
// B. Đi từ Tổng quan vào một dự án (mục Bảng Kanban trong ngăn kéo ☰), đổi dự án ở dải dự án, rồi quay lại Tổng quan: hai thanh hiện/ẩn theo trang.
// C. 820 và 1440 px: hành vi cũ giữ nguyên (dải dự án vẫn hiện ở mọi trang; thanh Bảng / Lịch / Gantt ở menu bên).
// D. Phong cách Giang hồ và sáng/tối cùng quy tắc; không tràn ngang; ô tìm kiếm vẫn dùng được.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 8), makeProject('p2', 'Farm Yêu Thương', '#e78c56', 5), makeProject('p3', 'Hương Thiền Nature', '#c764a2', 4)], notes: [] });
const NOW = '2026-11-17T03:00:00Z';
const OTHER = ['dashboard', 'notes', 'habits', 'budget', 'resources', 'focus', 'archive', 'trash', 'versions'];
const PROJECT = ['projects', 'calendar', 'gantt'];

const read = (page) =>
  page.evaluate(() => {
    const vis = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { shown: getComputedStyle(e).display !== 'none' && r.height > 0, h: Math.round(r.height), bottom: Math.round(r.bottom) };
    };
    const main = document.querySelector('#main').getBoundingClientRect();
    return {
      view,
      tabs: vis('#tabs'),
      bar: vis('.mobile-viewbar'),
      top: vis('.topbar'),
      mainTop: Math.round(main.top),
      flag: document.body.classList.contains('zen-project-view'),
      wide: document.documentElement.scrollWidth > innerWidth,
      search: !!document.querySelector('#search')?.offsetParent,
    };
  });

const goTo = async (page, v, id = 'p1') => {
  await page.evaluate(([v, id]) => go(v, id), [v, id]);
  await page.waitForFunction((v) => view === v && !!document.querySelector('#main > *'), v);
  await page.waitForTimeout(150);
};

const h = await startHarness({ seed });
try {
  // A + B. Điện thoại -----------------------------------------------------------------------------------------------------------------
  for (const [width, height] of [[390, 844], [360, 740]]) {
    const at = ' ở ' + width + ' px';
    const { context, page } = await h.open(width, { touch: true, height, now: NOW });
    try {
      for (const v of OTHER) {
        await goTo(page, v);
        await page.waitForTimeout(120);
        const r = await read(page);
        assert.equal(r.tabs.shown, false, 'dải dự án ẩn ở ' + v + at);
        assert.equal(r.bar.shown, false, 'thanh Bảng / Lịch / Gantt ẩn ở ' + v + at);
        assert.equal(r.flag, false, 'không có lớp zen-project-view ở ' + v + at);
        assert.ok(r.mainTop <= 64, 'nội dung bắt đầu ngay dưới thanh trên (' + r.mainTop + 'px) ở ' + v + at);
        assert.equal(r.wide, false, 'không tràn ngang ở ' + v + at);
      }
      for (const v of PROJECT) {
        await goTo(page, v);
        await page.waitForTimeout(120);
        const r = await read(page);
        assert.equal(r.tabs.shown && r.tabs.h >= 40, true, 'dải dự án hiện ở ' + v + at);
        assert.equal(r.bar.shown && r.bar.h >= 36, true, 'thanh Bảng / Lịch / Gantt hiện ở ' + v + at);
        assert.equal(r.flag, true, 'có lớp zen-project-view ở ' + v + at);
        assert.ok(r.mainTop > 150, 'nội dung nằm dưới hai thanh (' + r.mainTop + 'px) ở ' + v + at);
        assert.equal(r.wide, false, 'không tràn ngang ở ' + v + at);
      }
      // Bấm trên thanh chế độ xem: Lịch → Gantt → Bảng.
      await goTo(page, 'projects');
      for (const [label, view] of [['Lịch', 'calendar'], ['Gantt', 'gantt'], ['Bảng Kanban', 'projects']]) {
        await page.click('.mobile-viewbar .view-mode[data-view="' + view + '"]');
        await page.waitForFunction((v) => view === v && document.querySelector('#main h1'), view);
        const r = await read(page);
        assert.equal(r.bar.shown && r.tabs.shown, true, 'hai thanh còn hiện sau khi bấm ' + label + at);
      }
      // B. Từ Tổng quan vào dự án rồi quay lại.
      await goTo(page, 'dashboard');
      assert.equal((await read(page)).tabs.shown, false, 'Tổng quan: không có dải dự án' + at);
      // Ngăn kéo điện thoại không liệt kê dự án (v1.19.15); từ Tổng quan, mục Bảng Kanban trong ngăn kéo đưa vào dự án, rồi chọn dự án ở dải dự án.
      await page.click('#menu');
      await page.waitForSelector('.sidebar.open');
      await page.click('.sidebar.open .view-options .view-mode[data-view="projects"]');
      await page.waitForFunction(() => view === 'projects' && document.querySelector('#main h1'));
      let r = await read(page);
      assert.equal(r.tabs.shown && r.bar.shown, true, 'vào dự án: hai thanh hiện' + at);
      await page.click('#tabs [data-project="p2"]');
      await page.waitForFunction(() => project()?.id === 'p2' && document.querySelector('#main h1'));
      assert.equal(await page.evaluate(() => document.querySelector('#tabs .tab.active')?.textContent.includes('Farm')), true, 'dải dự án đánh dấu đúng dự án' + at);
      r = await read(page);
      assert.equal(r.tabs.shown && r.bar.shown, true, 'đổi dự án: hai thanh vẫn hiện' + at);
      await page.click('#menu');
      await page.waitForSelector('.sidebar.open');
      await page.click('.sidebar.open .nav[data-view="dashboard"]');
      await page.waitForFunction(() => view === 'dashboard');
      r = await read(page);
      assert.equal(r.tabs.shown || r.bar.shown, false, 'về Tổng quan bằng menu: hai thanh ẩn' + at);
      assert.equal(r.search, true, 'ô tìm kiếm vẫn có' + at);
      // Tìm kiếm vẫn dùng được khi hai thanh ẩn.
      await page.fill('#search', 'Việc số 1');
      await page.waitForTimeout(300);
      assert.ok((await page.locator('#main').innerText()).includes('Việc số 1'), 'tìm kiếm cho kết quả' + at);
    } finally {
      await context.close();
    }
  }

  // C. Máy tính bảng và máy tính: giữ nguyên -------------------------------------------------------------------------------------------
  for (const [width, touch] of [[820, true], [1440, false]]) {
    const at = ' ở ' + width + ' px';
    const { context, page } = await h.open(width, { touch, now: NOW });
    try {
      for (const v of ['dashboard', 'notes', 'habits', 'projects', 'calendar']) {
        await goTo(page, v);
        const r = await read(page);
        assert.equal(r.tabs.shown, true, 'dải dự án vẫn hiện ở ' + v + at);
        assert.equal(r.bar.shown, false, 'thanh chế độ xem dành cho điện thoại không hiện ' + v + at);
        assert.equal(r.wide, false, 'không tràn ngang ' + v + at);
      }
    } finally {
      await context.close();
    }
  }

  // D. Giang hồ và giao diện tối ----------------------------------------------------------------------------------------------------------
  for (const [name, opts, setup] of [
    ['Giang hồ', {}, ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'))],
    ['tối', { colorScheme: 'dark' }, null],
  ]) {
    const at = ' ở 390 px (' + name + ')';
    const { context, page } = await h.open(390, { touch: true, now: NOW, ...opts, ...(setup ? { setup } : {}) });
    try {
      for (const v of ['dashboard', 'notes', 'budget']) {
        await goTo(page, v);
        await page.waitForTimeout(150);
        const r = await read(page);
        assert.equal(r.tabs.shown || r.bar.shown, false, 'hai thanh ẩn ở ' + v + at);
        assert.ok(r.mainTop <= 64, 'nội dung dưới thanh trên (' + r.mainTop + 'px) ở ' + v + at);
        assert.equal(r.wide, false, 'không tràn ngang ' + v + at);
      }
      await goTo(page, 'calendar');
      const r = await read(page);
      assert.equal(r.tabs.shown && r.bar.shown, true, 'Lịch: hai thanh hiện' + at);
    } finally {
      await context.close();
    }
  }
  console.log('phone-head ok');
} finally {
  await h.close();
}
