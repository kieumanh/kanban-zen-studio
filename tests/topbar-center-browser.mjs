// Hồi quy v1.50.0: thanh trên một hàng. Từ 701px: tên mục bên trái, ô tìm kiếm đúng giữa, mọi nút gom vào một cụm bên phải.
// Điện thoại: ☰ | tìm kiếm | cụm nút, cùng một hàng, không tràn ngang. Kiểm ở 390 (chạm), 820, 1440 px.
import assert from 'node:assert/strict';
import { makeProject, startHarness } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Dự án A', '#7950c8', 2)], notes: [] });
const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ` (${width}px)`;
    const { context, page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'board');

    const m = await page.evaluate(() => {
      const header = document.querySelector('.topbar');
      const cs = getComputedStyle(header);
      const hr = header.getBoundingClientRect();
      const contentLeft = hr.left + parseFloat(cs.paddingLeft);
      const contentRight = hr.right - parseFloat(cs.paddingRight);
      const box = (sel) => {
        const el = document.querySelector(sel);
        if (!el || getComputedStyle(el).display === 'none') return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      };
      const search = box('.topbar .search');
      const actions = box('.topbar .top-actions');
      const menu = box('#menu');
      const crumb = box('.topbar .breadcrumb');
      const actionsEl = document.querySelector('.topbar .top-actions');
      const searchEl = document.querySelector('.topbar .search');
      return {
        headerH: hr.height,
        searchIsDirectChild: searchEl.parentElement === header,
        searchOutsideCluster: !actionsEl.contains(searchEl),
        clusterHasAll: ['#save-state', '#theme-toggle', '#notifications-button', '.avatar'].every((sel) => !!actionsEl.querySelector(sel)),
        searchVisible: !!search && search.width > 0,
        searchCenterDiff: search ? (search.left + search.right) / 2 - (contentLeft + contentRight) / 2 : null,
        searchWidth: search?.width ?? 0,
        clusterRightDiff: actions ? contentRight - actions.right : null,
        clusterWidth: actions?.width ?? 0,
        menuVisible: !!menu,
        menuRight: menu?.right ?? null,
        crumbRight: crumb?.right ?? null,
        searchLeft: search?.left ?? null,
        searchRight: search?.right ?? null,
        actionsLeft: actions?.left ?? null,
        rowCenters: [menu, search, actions].filter(Boolean).map((b) => (b.top + b.bottom) / 2),
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
        inputW: document.querySelector('#search').getBoundingClientRect().width,
      };
    });

    assert.equal(m.searchIsDirectChild, true, 'ô tìm kiếm là phần tử con trực tiếp của thanh trên' + at);
    assert.equal(m.searchOutsideCluster, true, 'ô tìm kiếm nằm ngoài cụm nút' + at);
    assert.equal(m.clusterHasAll, true, 'cụm nút chứa trạng thái lưu, sáng/tối, chuông và avatar' + at);
    assert.equal(m.searchVisible, true, 'ô tìm kiếm hiển thị' + at);
    assert.ok(m.pageOverflow <= 0, 'không tràn ngang: ' + m.pageOverflow + at);
    assert.ok(m.inputW >= 120, 'ô nhập tìm kiếm quá hẹp: ' + m.inputW + at);

    if (width > 700) {
      assert.equal(m.menuVisible, false, 'màn rộng: không có nút ☰' + at);
      assert.ok(Math.abs(m.searchCenterDiff) <= 2, `ô tìm kiếm lệch tâm ${m.searchCenterDiff}px` + at);
      assert.ok(Math.abs(m.clusterRightDiff) <= 1, `cụm nút không sát mép phải: ${m.clusterRightDiff}px` + at);
      assert.ok(m.crumbRight <= m.searchLeft + 1, 'tên mục không đè lên ô tìm kiếm' + at);
    } else {
      assert.equal(m.menuVisible, true, 'điện thoại: có nút ☰' + at);
      assert.ok(m.menuRight <= m.searchLeft + 0.5, 'nút ☰ nằm bên trái ô tìm kiếm' + at);
      assert.ok(m.searchRight <= m.actionsLeft + 0.5, 'cụm nút nằm bên phải ô tìm kiếm' + at);
      const spread = Math.max(...m.rowCenters) - Math.min(...m.rowCenters);
      assert.ok(spread <= 6, `ba phần không cùng một hàng (lệch ${spread.toFixed(1)}px)` + at);
      assert.ok(m.headerH <= 60, `thanh trên cao quá trên điện thoại: ${m.headerH}px` + at);
    }
    await context.close();
  }
  console.log('PASS: thanh trên một hàng: ô tìm kiếm ở giữa, các nút gom một cụm bên phải; điện thoại có ☰ | tìm kiếm | cụm nút (390/820/1440px).');
} finally {
  await h.close();
}
