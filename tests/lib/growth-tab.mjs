// v2.68.0 (Phân Đường): trang Tu vi chia tab con. Bài nào kiểm khối nằm ở tab khác Hôm nay thì mở đúng tab trước khi kiểm
// (today · octa · story · gods · store · all). Các bài cũ kiểm khối ở nhiều tab dùng 'all' (Tất cả = đúng trang dài như trước v2.68.0, điều kiện kiểm giữ nguyên). Chưa bắt đầu Tu vi (chưa có thanh tab) thì không làm gì.
export async function openGrowthTab(page, id) {
  await page.waitForSelector('.gr-page');
  if (!(await page.locator('.gr-tabs').count()) || !(await page.locator('#gr-tab-' + id).count())) return;
  if ((await page.locator('#gr-tab-' + id).getAttribute('aria-selected')) === 'true') return;
  await page.locator('#gr-tab-' + id).dispatchEvent('click'); // gửi thẳng sự kiện bấm: hộp truyện ký có thể đang phủ phía trên sau khi lên cấp
  await page.waitForSelector('#gr-tab-' + id + '[aria-selected=true]');
}
