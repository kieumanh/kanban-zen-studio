// Hồi quy v1.15.45: Thẻ gọn ẩn checklist trên thẻ, nên ô "Hiện checklist trên thẻ" phải phản ánh đúng (không đánh dấu, khóa, có chú thích)
// và không làm mất lựa chọn đã lưu của người dùng; khi Thẻ gọn tắt, ô trở lại đúng lựa chọn đã lưu.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const h = await startHarness();

const ready = async (page) => {
  await h.show(page, 'projects');
  await page.waitForSelector('#main .task-card[data-task=p1t4]');
};

const read = (page) =>
  page.evaluate(() => {
    const input = document.querySelector('#main [data-kanban-option=checks]');
    const hint = document.querySelector('#main .wf-option-hint');
    const card = document.querySelector('#main .task-card[data-task=p1t4]');
    const described = input?.getAttribute('aria-describedby');
    return {
      compact: document.querySelector('#main .board')?.classList.contains('studio-compact') === true,
      checked: input?.checked,
      disabled: input?.disabled,
      hint: hint?.textContent || null,
      hintLinked: !!described && document.getElementById(described) === hint,
      hintSize: hint ? parseFloat(getComputedStyle(hint).fontSize) : null,
      checksShown: !!card?.querySelector('.card-checks')?.getClientRects().length,
      storedChecks: localStorage.getItem('kanban-checks'),
      storedCompact: localStorage.getItem('zen-compact'),
    };
  });

// Menu Hiển thị có thể còn mở sau lần vẽ lại trước, nên chỉ bấm tiêu đề khi menu đang đóng.
const openMenu = async (page) => {
  if (!(await page.locator('#main .wf-display-options').evaluate((el) => el.open))) await page.locator('#main .wf-display-options > summary').click();
};
const toggleCompact = async (page) => {
  await openMenu(page);
  await page.locator('#main [data-studio=compact]').click();
};

try {
  // 1. Điện thoại, chưa chọn gì: Thẻ gọn mặc định bật, ô checklist không đánh dấu và khóa, có chú thích nối bằng aria-describedby, lựa chọn đã lưu không bị đụng tới.
  {
    const { context, page } = await h.open(390, { touch: true });
    await ready(page);
    const st = await read(page);
    assert.equal(st.compact, true, 'điện thoại: Thẻ gọn mặc định phải bật');
    assert.equal(st.checksShown, false, 'điện thoại: checklist trên thẻ phải ẩn');
    assert.equal(st.checked, false, 'điện thoại: ô "Hiện checklist trên thẻ" không được đánh dấu khi checklist đang ẩn');
    assert.equal(st.disabled, true, 'điện thoại: ô phải bị khóa khi Thẻ gọn đang ẩn checklist');
    assert.match(st.hint || '', /Thẻ gọn/, 'phải có chú thích nói rõ vì sao ô bị khóa');
    assert.equal(st.hintLinked, true, 'chú thích phải nối với ô bằng aria-describedby');
    assert.ok(st.hintSize >= 12, `chú thích phải ≥12px, nhận được ${st.hintSize}px`);
    assert.equal(st.storedChecks, null, 'không được ghi đè lựa chọn đã lưu "kanban-checks"');

    // 2. Tắt Thẻ gọn: ô mở khóa, đánh dấu lại, chú thích biến mất, checklist hiện; lựa chọn đã lưu vẫn chưa có.
    await toggleCompact(page);
    await page.waitForFunction(() => !document.querySelector('#main .board')?.classList.contains('studio-compact'));
    const full = await read(page);
    assert.equal(full.disabled, false, 'tắt Thẻ gọn: ô phải mở khóa');
    assert.equal(full.checked, true, 'tắt Thẻ gọn: ô phải đánh dấu lại (mặc định hiện checklist)');
    assert.equal(full.hint, null, 'tắt Thẻ gọn: chú thích phải biến mất');
    assert.equal(full.checksShown, true, 'tắt Thẻ gọn: checklist trên thẻ phải hiện');
    assert.equal(full.storedChecks, null);
    await context.close();
  }

  // 3. Người dùng đã chọn ẩn checklist: bật/tắt Thẻ gọn không được làm đổi lựa chọn đó.
  {
    const { context, page } = await h.open(1440);
    await page.evaluate(() => localStorage.setItem('kanban-checks', 'off'));
    await page.reload();
    await page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa');
    await ready(page);
    let st = await read(page);
    assert.equal(st.compact, false);
    assert.equal(st.checked, false, 'đã chọn ẩn: ô không được đánh dấu');
    assert.equal(st.disabled, false, 'Thẻ gọn tắt: ô phải dùng được');
    await toggleCompact(page);
    await page.waitForFunction(() => document.querySelector('#main .board')?.classList.contains('studio-compact'));
    st = await read(page);
    assert.equal(st.disabled, true, 'Thẻ gọn bật: ô bị khóa');
    assert.equal(st.checked, false);
    assert.equal(st.storedChecks, 'off', 'lựa chọn "ẩn" đã lưu phải được giữ nguyên khi bật Thẻ gọn');
    await toggleCompact(page);
    await page.waitForFunction(() => !document.querySelector('#main .board')?.classList.contains('studio-compact'));
    st = await read(page);
    assert.equal(st.disabled, false);
    assert.equal(st.checked, false, 'sau khi tắt Thẻ gọn, lựa chọn "ẩn" đã lưu phải vẫn còn');
    assert.equal(st.storedChecks, 'off');
    assert.equal(st.checksShown, false);
    await context.close();
  }

  // 4. Màn hình rộng, đang hiện checklist: bật Thẻ gọn thì ô khóa và bỏ dấu; lựa chọn "hiện" không bị mất khi tắt lại; ô khóa không đổi được bằng cú bấm.
  {
    const { context, page } = await h.open(820);
    await ready(page);
    let st = await read(page);
    assert.equal(st.checked, true);
    assert.equal(st.checksShown, true);
    await toggleCompact(page);
    await page.waitForFunction(() => document.querySelector('#main .board')?.classList.contains('studio-compact'));
    st = await read(page);
    assert.equal(st.disabled, true);
    assert.equal(st.checked, false);
    assert.equal(st.checksShown, false);
    assert.match(st.hint || '', /Thẻ gọn/);
    await openMenu(page);
    await page.locator('#main [data-kanban-option=checks]').click({ force: true, timeout: 2000 }).catch(() => {});
    st = await read(page);
    assert.equal(st.storedChecks, null, 'bấm vào ô đang khóa không được đổi lựa chọn đã lưu');
    await toggleCompact(page);
    await page.waitForFunction(() => !document.querySelector('#main .board')?.classList.contains('studio-compact'));
    st = await read(page);
    assert.equal(st.checked, true, 'tắt Thẻ gọn: lựa chọn "hiện" phải trở lại');
    assert.equal(st.checksShown, true);
    await context.close();
  }
  console.log('PASS compact-checks: ô "Hiện checklist trên thẻ" khóa, bỏ dấu và có chú thích khi Thẻ gọn bật; lựa chọn đã lưu được giữ nguyên.');
} finally {
  await h.close();
}
