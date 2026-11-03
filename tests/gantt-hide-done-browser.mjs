// Hồi quy v1.19.6: chế độ Gantt không hiển thị việc đã hoàn thành (cột Hoàn thành).
//  1. Một dự án: nhãn bên trái, thanh trên biểu đồ và danh sách "Chưa đặt lịch" đều không có việc đã xong; đếm "Công việc · N" đúng số việc còn lại;
//  2. dòng "Đã ẩn K việc hoàn thành" đúng số; tóm tắt tiến độ dự án vẫn tính trên TOÀN BỘ việc (không đổi vì ẩn);
//  3. đưa một việc sang Hoàn thành thì biến mất khỏi Gantt, kéo lại sang Đang thực hiện thì hiện lại; dữ liệu việc không đổi ngoài cột;
//  4. liên kết phụ thuộc có đầu mút là việc đã xong không bị mất khỏi dữ liệu, chỉ không vẽ;
//  5. chế độ "Tất cả dự án" cũng ẩn; khi mọi việc đã xong thì không lỗi, không tràn ngang;
//  6. 390 / 820 / 1440px: không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const day = new Date().toLocaleDateString('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
});
const add = (d, n) =>
  new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000)
    .toISOString()
    .slice(0, 10);
const sched = (id, title, col, a, b) => ({
  id,
  title,
  col,
  description: '',
  due: add(day, b),
  start: add(day, a) + 'T09:00',
  end: add(day, b) + 'T17:00',
  tag: 'Công việc',
  priority: 'q2',
  checks: [],
});

const seed = () => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 0);
  p1.tasks = [
    sched('a1', 'Việc đang làm A', 'Doing', 0, 2),
    sched('a2', 'Việc cần làm B', 'List', 1, 3),
    sched('a3', 'Việc đã xong C', 'Done', 0, 1),
    sched('a4', 'Việc đã xong D', 'Done', 2, 4),
    {
      id: 'a5',
      title: 'Việc xong chưa xếp lịch E',
      col: 'Done',
      description: '',
      due: '',
      tag: 'Công việc',
      priority: 'q2',
      checks: [],
    },
    {
      id: 'a6',
      title: 'Việc chưa xếp lịch F',
      col: 'List',
      description: '',
      due: '',
      tag: 'Công việc',
      priority: 'q2',
      checks: [],
    },
  ];
  p1.dependencies = [
    { from: 'a3', to: 'a1' },
    { from: 'a1', to: 'a2' },
  ];
  const p2 = makeProject('p2', 'Dự án hai', '#c764a2', 0);
  p2.tasks = [
    sched('b1', 'Việc dự án hai đang làm', 'Doing', 0, 1),
    sched('b2', 'Việc dự án hai đã xong', 'Done', 0, 1),
  ];
  return { schema: 1, projects: [p1, p2], notes: [] };
};

const h = await startHarness({ seed });
const read = (page, scope) =>
  page.evaluate((scope) => {
    const root = document.querySelector(scope);
    const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
    return {
      labels: [...root.querySelectorAll('.gantt-labels button[data-task]')].map(
        (b) => b.dataset.task,
      ),
      bars: [...root.querySelectorAll('.gantt-task')].map(
        (g) => g.dataset.ganttRow,
      ),
      idle: [
        ...root.querySelectorAll('.gantt-unscheduled .gantt-unscheduled-title'),
      ].map((b) => b.dataset.task),
      count: text(root.querySelector('.gantt-labels strong')),
      note: root.querySelector('.gantt-done-note')
        ? text(root.querySelector('.gantt-done-note'))
        : null,
      summary: root.querySelector('.project-view-summary')
        ? text(root.querySelector('.project-view-summary'))
        : '',
      edges: root.querySelectorAll('.gantt-edge').length,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  }, scope);

try {
  for (const width of [390, 820, 1440]) {
    const { context, page } = await h.open(width, { touch: width < 1000 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const at = ` (${width}px)`;

    // 1-2. Một dự án.
    await h.show(page, 'gantt', 'p1');
    await page.waitForSelector('.gantt-svg');
    let r = await read(page, '#main');
    assert.deepEqual(
      r.labels.sort(),
      ['a1', 'a2'],
      'nhãn Gantt phải chỉ còn việc chưa xong' + at,
    );
    assert.deepEqual(
      r.bars.sort(),
      ['a1', 'a2'],
      'thanh Gantt phải chỉ còn việc chưa xong' + at,
    );
    assert.deepEqual(
      r.idle,
      ['a6'],
      'danh sách chưa đặt lịch không được có việc đã xong' + at,
    );
    assert.match(r.count, /Công việc · 2$/, r.count + at);
    assert.match(
      r.note ?? '',
      /Đã ẩn 3 việc hoàn thành/,
      'dòng báo số việc đã ẩn' + at,
    );
    assert.match(
      r.summary,
      /3\/6 việc hoàn thành/,
      'tóm tắt tiến độ phải tính trên toàn bộ việc: ' + r.summary + at,
    );
    assert.equal(r.edges, 1, 'chỉ vẽ liên kết giữa hai việc đang hiện' + at);
    assert.ok(!r.overflow, 'tràn ngang' + at);

    // 3. Đưa B sang Hoàn thành: biến mất; kéo lại sang Đang thực hiện: hiện lại, dữ liệu khác không đổi.
    const before = await page.evaluate(() =>
      JSON.stringify(project('p1').tasks.find((t) => t.id === 'a2')),
    );
    await page.evaluate(() => {
      const p = project('p1');
      moveTask(
        p,
        p.tasks.find((t) => t.id === 'a2'),
        'Done',
      );
      render();
    });
    r = await read(page, '#main');
    assert.deepEqual(
      r.labels,
      ['a1'],
      'việc vừa xong phải biến mất khỏi Gantt' + at,
    );
    assert.match(r.note ?? '', /Đã ẩn 4 việc hoàn thành/, at);
    await page.evaluate(() => {
      const p = project('p1');
      moveTask(
        p,
        p.tasks.find((t) => t.id === 'a2'),
        'List',
      );
      render();
    });
    r = await read(page, '#main');
    assert.deepEqual(
      r.labels.sort(),
      ['a1', 'a2'],
      'đưa về chưa xong phải hiện lại' + at,
    );
    const after = await page.evaluate(() =>
      JSON.stringify(project('p1').tasks.find((t) => t.id === 'a2')),
    );
    assert.equal(
      after,
      before,
      'đổi cột qua lại không được làm đổi dữ liệu việc' + at,
    );

    // 4. Liên kết a3 → a1 (a3 đã xong) còn nguyên trong dữ liệu sau khi vẽ và lưu.
    await page.evaluate(() => save());
    const deps = await page.evaluate(() =>
      JSON.stringify(project('p1').dependencies),
    );
    assert.equal(
      deps,
      JSON.stringify([
        { from: 'a3', to: 'a1' },
        { from: 'a1', to: 'a2' },
      ]),
      'liên kết có đầu mút đã xong không được mất khỏi dữ liệu' + at,
    );

    // 5. Tất cả dự án.
    await page.evaluate(() => go('gantt', ''));
    await page.waitForSelector('.scope-gantt-all .gantt-svg');
    const all = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          '.scope-gantt-all .gantt-labels button[data-task]',
        ),
      ]
        .map((b) => b.dataset.task)
        .sort(),
    );
    assert.deepEqual(
      all,
      ['a1', 'a2', 'b1'],
      'chế độ Tất cả dự án cũng phải ẩn việc đã xong' + at,
    );

    // Mọi việc đều xong: không lỗi, không tràn ngang.
    await page.evaluate(() => {
      for (const p of data.projects)
        for (const t of p.tasks) moveTask(p, t, 'Done');
      render();
    });
    const none = await page.evaluate(() => ({
      labels: document.querySelectorAll('.gantt-labels button[data-task]')
        .length,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.equal(
      none.labels,
      0,
      'mọi việc đã xong thì Gantt không còn dòng việc' + at,
    );
    assert.ok(!none.overflow, 'tràn ngang khi mọi việc đã xong' + at);
    assert.deepEqual(errors, [], 'lỗi trang: ' + errors.join('; ') + at);
    await context.close();
  }
  console.log(
    'PASS: Gantt ẩn việc đã hoàn thành, tóm tắt tiến độ giữ nguyên, liên kết không mất, hiện lại khi đưa về chưa xong (390/820/1440px).',
  );
} finally {
  await h.close();
}
