// v2.79.0 (Lên Cấp): các thông báo mừng hiện LẦN LƯỢT (dist/growth-celebrate.js). Sau khi lưu công lực, lời chúc hoàn thành chưa tắt và form lên cấp
// (nếu lên cấp) hiện trước; chương truyện ký / nghi thức đột phá chỉ hiện sau khi các thông báo đó đóng. Bài kiểm đang đợi một chương truyện dùng hàm này
// để tắt lời chúc hoàn thành và đóng form lên cấp như một người dùng bấm ×.
export async function closeCelebrations(page, { wait = 2500 } = {}) {
  await page.evaluate(() =>
    typeof dismissCompletion === 'function' ? dismissCompletion() : null,
  );
  const form = page.locator('dialog.gr-levelup[open]');
  try {
    await form.waitFor({ timeout: wait });
  } catch {
    return false;
  }
  await form.locator('.gr-lu-x').click();
  await page.waitForFunction(
    () => !document.querySelector('dialog.gr-levelup'),
  );
  return true;
}
