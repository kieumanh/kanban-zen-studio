// v1.80.0: Cài đặt → Thông báo gom MỘT nhóm, một cột, xếp dọc: Công việc · Việc hằng ngày · Điểm tích lũy.
// Công tắc việc hằng ngày (nhắc đến giờ, nhắc nhẹ) lưu trên thiết bị; công tắc điểm nghiệp / gợi ý hằng tuần lưu theo tài khoản.
// Gợi ý cải thiện hằng tuần hiện trong chuông: chấm một lần, mục giữ đến khi bấm; bật/tắt có hiệu lực ngay.
// Kiểm tra ở 390 (chạm), 820, 1440 px: không tràn ngang, ô chọn đủ vùng chạm.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const entry = (id, ago, p, n) => ({ id, d: day(-ago), s: 'task', k: 'task:' + id, n, p });
const LOG = [
  entry('e1', 0, [2, 0, 0, 0, 0, 0, 0, 0], 'Việc một'),
  entry('e2', 2, [0, 0, 0, 0, 0, 0, 5, 0], 'Việc hai'),
  entry('e3', 5, [1, 0, 0, 0, 0, 0, 0, 1], 'Việc ba'),
  entry('e4', 9, [0, 0, 0, 0, 2, 0, 0, 0], 'Việc bốn'),
  entry('e5', 30, [0, 0, 2, 0, 0, 0, 0, 0], 'Việc năm'),
];
const growth = (over = {}) => ({ v: 1, hero: 'nam', since: day(-40), log: LOG, ...over });
const habit = (over = {}) => ({ id: 'h1', name: 'Đọc sách', icon: '📖', color: '#3a6fb0', createdAt: day(-20), goal: 7, done: [], remindTime: '00:00', ...over });
const seed = (g, habits = []) => () => ({
  schema: 1,
  projects: [{ id: 'p1', name: 'Dự án A', description: '', color: '#7950c8', icon: '✺', columns: ['Idea', 'List', 'Doing', 'Done'], columnNames: { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang thực hiện', Done: 'Hoàn thành' }, tasks: [{ id: 'p1t0', title: 'Gửi báo cáo', col: 'Doing', description: '', due: day(3), tag: 'Công việc', priority: 'q2', checks: [] }] }],
  notes: [],
  dailyHabits: habits,
  ...(g ? { growth: g } : {}),
});
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 60; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá thời gian chờ: ' + label);
}
const openSettings = async (page) => {
  await page.evaluate(() => accountPanel());
  await page.waitForSelector('.nf-blocks', { state: 'attached' });
  await page.evaluate(() => {
    [...document.querySelectorAll('details.wf-settings-group')].find((d) => d.querySelector('summary').textContent.trim() === 'Thông báo').open = true;
  });
};
const openBell = (page) => page.evaluate(() => document.querySelector('#notifications-button').click());
const closeDialog = (page) => page.evaluate(() => document.querySelector('#editor').close());
const bellLabel = (page) => page.evaluate(() => document.querySelector('#notifications-button').getAttribute('aria-label'));
const ready = (page) => page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa' && document.documentElement.dataset.zenReady === '1');

const h = await startHarness({ seed: seed(null) });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';

    // 1. Một nhóm "Thông báo", một cột, đúng thứ tự; nút thông báo trình duyệt chuyển về đây; chưa chọn nhân vật thì có lối vào Điểm tích lũy.
    {
      const { context, page } = await h.open(width, { touch, workspace: seed(null, [habit()])() });
      await h.show(page, 'board');
      await openSettings(page);
      const info = await page.evaluate(() => {
        const blocks = [...document.querySelectorAll('.nf-block')];
        const rects = blocks.map((b) => b.getBoundingClientRect());
        const group = document.querySelector('.nf-blocks').closest('details');
        const titleOf = (el) => el?.closest('details')?.querySelector('summary')?.textContent.trim();
        return {
          order: blocks.map((b) => b.dataset.nf),
          titles: blocks.map((b) => b.querySelector('h4').textContent),
          sameLeft: rects.every((r) => Math.abs(r.left - rects[0].left) < 1.5),
          sameWidth: rects.every((r) => Math.abs(r.width - rects[0].width) < 1.5),
          stacked: rects.every((r, i) => i === 0 || r.top >= rects[i - 1].bottom - 0.5),
          groups: [...document.querySelectorAll('details.wf-settings-group')].filter((d) => d.querySelector('.nf-blocks')).length,
          emailIn: titleOf(document.querySelector('#email-reminder')),
          hourIn: titleOf(document.querySelector('#reminder-hour')),
          enableIn: titleOf(document.querySelector('#enable-push')),
          disableIn: titleOf(document.querySelector('#disable-push')),
          enableBlock: document.querySelector('#enable-push')?.closest('.nf-block')?.dataset.nf,
          emailBlock: document.querySelector('#email-reminder')?.closest('.nf-block')?.dataset.nf,
          habitChecks: ['#nf-habit-due', '#nf-habit-nudge'].map((s) => ({ on: document.querySelector(s)?.checked, h: Math.round(document.querySelector(s)?.closest('label').getBoundingClientRect().height) })),
          growthIdle: !!document.querySelector('.nf-block[data-nf="growth"] [data-nf-open-growth]'),
          growthChecks: document.querySelectorAll('#nf-growth-notify,#nf-growth-tips').length,
          open: group.open,
        };
      });
      assert.deepEqual(info.order, ['task', 'habit', 'growth'], 'ba loại thông báo theo thứ tự' + at);
      assert.deepEqual(info.titles, ['Công việc', 'Việc hằng ngày', 'Điểm tích lũy'], 'tiêu đề từng loại' + at);
      assert.equal(info.groups, 1, 'chỉ một nhóm chứa thông báo' + at);
      assert.ok(info.sameLeft && info.sameWidth && info.stacked, 'một cột, xếp dọc' + at + ' ' + JSON.stringify(info));
      assert.equal(info.emailIn, 'Thông báo', 'email nhắc việc nằm trong nhóm Thông báo' + at);
      assert.equal(info.hourIn, 'Thông báo');
      assert.equal(info.enableIn, 'Thông báo', 'nút bật thông báo trình duyệt nằm trong nhóm Thông báo' + at);
      assert.equal(info.disableIn, 'Thông báo');
      assert.equal(info.enableBlock, 'task', 'nút thông báo trình duyệt thuộc loại Công việc' + at);
      assert.equal(info.emailBlock, 'task');
      assert.deepEqual(info.habitChecks.map((c) => c.on), [true, true], 'hai công tắc việc hằng ngày bật sẵn' + at);
      assert.ok(info.habitChecks.every((c) => c.h >= (touch ? 44 : 36)), 'hàng công tắc đủ vùng chạm' + at + ' ' + JSON.stringify(info.habitChecks));
      assert.equal(info.growthIdle, true, 'chưa chọn nhân vật: có nút mở Điểm tích lũy' + at);
      assert.equal(info.growthChecks, 0, 'chưa chọn nhân vật: chưa có công tắc điểm' + at);
      assert.equal(await noOverflow(page), true, 'Cài đặt không tràn ngang' + at);
      await page.click('[data-nf-open-growth]');
      await page.waitForFunction(() => view === 'growth' && !document.querySelector('#editor').open);
      await context.close();
    }

    // 2. Công tắc việc hằng ngày: tắt "nhắc đến giờ" và "nhắc nhẹ" có hiệu lực ngay; lưu trên thiết bị.
    {
      const { context, page } = await h.open(width, { touch, workspace: seed(null, [habit()])() });
      await h.show(page, 'habits');
      await page.waitForSelector('[data-hb-row="h1"]');
      assert.equal(await page.locator('.hb-due').count(), 1, 'mặc định có khung nhắc đến giờ' + at);
      assert.equal(await page.locator('.hb-nudge').count(), 1, 'mặc định có lời nhắc nhẹ' + at);
      await openSettings(page);
      await page.locator('#nf-habit-due').uncheck();
      assert.equal(await page.evaluate(() => localStorage.getItem('zen-habit-notify:qa:due')), '0', 'lưu trên thiết bị' + at);
      assert.match(await page.locator('.nf-block[data-nf="habit"] .nf-status').innerText(), /Đã tắt/, 'báo kết quả' + at);
      assert.equal(await page.evaluate(() => zenHabits.dueReminders().length), 0, 'tắt rồi thì không còn việc đến giờ nhắc' + at);
      await page.locator('#nf-habit-nudge').uncheck();
      await closeDialog(page);
      await h.show(page, 'focus');
      await h.show(page, 'habits');
      await page.waitForSelector('[data-hb-row="h1"]');
      assert.equal(await page.locator('.hb-due').count(), 0, 'khung nhắc đến giờ đã tắt' + at);
      assert.equal(await page.locator('.hb-nudge').count(), 0, 'lời nhắc nhẹ đã tắt' + at);
      await openSettings(page);
      assert.equal(await page.locator('#nf-habit-due').isChecked(), false, 'mở lại vẫn thấy đã tắt' + at);
      await page.locator('#nf-habit-due').check();
      await page.locator('#nf-habit-nudge').check();
      await closeDialog(page);
      await h.show(page, 'focus');
      await h.show(page, 'habits');
      await page.waitForSelector('[data-hb-row="h1"]');
      assert.equal(await page.locator('.hb-due').count(), 1, 'bật lại thì khung nhắc về' + at);
      assert.equal(await page.locator('.hb-nudge').count(), 1, 'bật lại thì lời nhắc nhẹ về' + at);
      await context.close();
    }

    // 3. Công tắc điểm nghiệp / gợi ý: lưu theo tài khoản (lên máy chủ) và còn nguyên sau khi tải lại.
    {
      const { context, page, server } = await h.open(width, { touch, workspace: seed(growth())() });
      await h.show(page, 'board');
      await openSettings(page);
      assert.equal(await page.locator('#nf-growth-notify').isChecked(), true, 'điểm nghiệp bật sẵn' + at);
      assert.equal(await page.locator('#nf-growth-tips').isChecked(), true, 'gợi ý bật sẵn' + at);
      await page.locator('#nf-growth-notify').uncheck();
      await until(() => server.workspace.growth?.notify === false, 'lưu notify=false lên máy chủ' + at);
      await page.locator('#nf-growth-tips').uncheck();
      await until(() => server.workspace.growth?.tips === false, 'lưu tips=false lên máy chủ' + at);
      assert.equal(server.workspace.growth.log.length, LOG.length, 'đổi công tắc không đụng tới sổ điểm' + at);
      await page.reload();
      await ready(page);
      await openSettings(page);
      assert.equal(await page.locator('#nf-growth-notify').isChecked(), false, 'còn tắt sau khi tải lại' + at);
      assert.equal(await page.locator('#nf-growth-tips').isChecked(), false);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      await context.close();
    }

    // 4. Gợi ý cải thiện hằng tuần trong chuông.
    {
      const { context, page } = await h.open(width, { touch, workspace: seed(growth())() });
      await h.show(page, 'board');
      assert.match(await bellLabel(page), /gợi ý cải thiện tuần này/, 'chuông báo có gợi ý mới' + at);
      await openBell(page);
      await page.waitForSelector('[data-gr-tip-open]');
      const text = (await page.locator('[data-gr-tip-open]').innerText()).replace(/\s+/g, ' ');
      assert.match(text, /Gợi ý cải thiện tuần này/, 'tiêu đề gợi ý' + at);
      assert.match(text, /Công lực đang tăng · Nên bồi bổ Tài lộc: ghi chép thu chi\./, 'nội dung lấy từ báo cáo tiến độ' + at);
      assert.equal(await noOverflow(page), true, 'hộp thông báo không tràn ngang' + at);
      await closeDialog(page);
      assert.doesNotMatch(await bellLabel(page), /gợi ý cải thiện tuần này/, 'mở chuông một lần thì hết chấm' + at);
      await openBell(page);
      await page.waitForSelector('[data-gr-tip-open]');
      assert.equal(await page.locator('[data-gr-tip-open]').count(), 1, 'mục vẫn còn đến khi bấm vào' + at);
      await page.click('[data-gr-tip-open]');
      await page.waitForSelector('.gr-report');
      assert.equal(await page.evaluate(() => document.querySelector('#editor').open), false, 'bấm vào gợi ý thì đóng hộp thoại và mở báo cáo' + at);
      await openBell(page);
      await page.waitForSelector('#editor-body');
      assert.equal(await page.locator('[data-gr-tip-open]').count(), 0, 'đã bấm thì tuần này không hiện lại' + at);
      await context.close();
    }
    {
      const { context, page } = await h.open(width, { touch, workspace: seed(growth({ tips: false }))() });
      await h.show(page, 'board');
      assert.doesNotMatch(await bellLabel(page), /gợi ý cải thiện tuần này/, 'tắt gợi ý thì chuông không báo' + at);
      await openBell(page);
      await page.waitForSelector('#editor-body');
      assert.equal(await page.locator('[data-gr-tip-open]').count(), 0, 'tắt gợi ý thì không có mục' + at);
      await context.close();
    }
    {
      const { context, page } = await h.open(width, { touch, workspace: seed(null)() });
      await h.show(page, 'board');
      assert.doesNotMatch(await bellLabel(page), /gợi ý cải thiện tuần này/, 'chưa chọn nhân vật thì không có gợi ý' + at);
      await context.close();
    }

    // 5. Thông báo điểm nghiệp: lên cảnh giới mới thì báo; tắt thì im.
    // v2.5.0: 7,5 điểm (cấp 9) + 1 điểm = 8,5 điểm, qua ải cấp 10, bước vào cảnh giới Tam lưu cao thủ (thang v1.85.0: 11 → 12 điểm).
    for (const [notify, expectToast] of [[undefined, true], [false, false]]) {
      const g = growth({ log: [entry('big', 1, [15, 0, 0, 0, 0, 0, 0, 0], 'Việc lớn')], ...(notify === false ? { notify: false } : {}) });
      const { context, page } = await h.open(width, { touch, workspace: seed(g)() });
      await h.show(page, 'board');
      await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[0], 'Done'));
      await page.waitForSelector('#growth-award[open]');
      await page.click('[data-gr-plus="0"]');
      await page.click('[data-gr-plus="0"]');
      await page.click('[data-gr-save]');
      await page.waitForSelector('.completion-card');
      await wait(300);
      const toast = await page.locator('#toast').textContent();
      if (expectToast) assert.match(toast, /đã đột phá, đạt cảnh giới Tam lưu cao thủ/, 'lên cảnh giới thì báo' + at);
      else assert.doesNotMatch(toast, /đột phá|lên cấp/, 'tắt thông báo điểm nghiệp thì không báo' + at);
      assert.equal(await page.evaluate(() => data.growth.log.length), 2, 'điểm vẫn được ghi dù tắt thông báo' + at);
      await context.close();
    }
  }
  console.log('growth-notify-browser ok');
} finally {
  await h.close();
}
