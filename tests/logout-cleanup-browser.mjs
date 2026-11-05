// v1.26.0: đăng xuất khi không còn thay đổi chưa đồng bộ thì xóa bản sao dữ liệu của tài khoản trên thiết bị
// (IndexedDB + localStorage). Khi còn thay đổi chưa gửi thì giữ lại để không mất việc. Tự khóa cũng dọn khi sạch.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Farm', '#7950c8', 2)], notes: [], dailyHabits: [] });
const h = await startHarness({ seed });
// Đếm bản ghi IndexedDB của tài khoản (bản chính và bản khôi phục).
const idbCount = (page, key) => page.evaluate((key) => new Promise((resolve, reject) => {
  const r = indexedDB.open('kanban-zen-local-v2', 1);
  r.onerror = () => reject(r.error);
  r.onsuccess = () => {
    const db = r.result, q = db.transaction('records').objectStore('records').getAllKeys();
    q.onsuccess = () => { db.close(); resolve(q.result.filter((k) => k === key || String(k).startsWith(key + '-recovery-')).length); };
    q.onerror = () => reject(q.error);
  };
}), key);
const lsKeys = (page, key) => page.evaluate((key) => [localStorage.getItem(key), localStorage.getItem(key + '-sync')].filter((v) => v !== null).length, key);
const signedOut = (page) => page.waitForSelector('#auth-screen form#auth-form', { timeout: 15000 });
try {
  // 1) Sạch: đăng xuất thủ công xóa bản sao trên thiết bị.
  {
    const { page } = await h.open(820, { workspace: seed() });
    await h.show(page, 'habits');
    const key = await page.evaluate(() => 'zen-account-' + currentUser.id);
    await page.evaluate(() => cacheCloud());
    await page.evaluate((key) => localStorage.setItem(key + '-sync', '{"dirty":false}'), key);
    assert.equal(await idbCount(page, key) >= 1, true, 'trước khi đăng xuất phải có bản sao trong IndexedDB');
    await page.route('**/api/logout', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    await page.evaluate(() => signOutAccount(false));
    await signedOut(page);
    assert.equal(await idbCount(page, key), 0, 'đăng xuất sạch: IndexedDB không còn bản ghi của tài khoản');
    assert.equal(await lsKeys(page, key), 0, 'đăng xuất sạch: localStorage không còn khóa của tài khoản');
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-offline-account')), null, 'không còn thông tin tài khoản để mở offline');
    await page.context().close();
  }

  // 2) Còn thay đổi chưa gửi: đăng xuất bị chặn và bản sao được giữ nguyên.
  {
    const { page } = await h.open(820, { workspace: seed() });
    await h.show(page, 'habits');
    const key = await page.evaluate(() => 'zen-account-' + currentUser.id);
    await page.route('**/api/workspace-v2', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"thử lỗi"}' }) : r.continue()));
    await page.evaluate(() => { data.projects[0].name = 'Đổi tên chưa gửi'; dirty = true; });
    await page.evaluate(() => cacheCloud());
    await page.evaluate(() => signOutAccount(false));
    await page.waitForTimeout(800);
    assert.equal(await page.evaluate(() => !!currentUser), true, 'còn thay đổi chưa gửi thì không đăng xuất');
    assert.ok(await idbCount(page, key) >= 1, 'còn thay đổi chưa gửi: bản sao vẫn được giữ');
    await page.context().close();
  }

  // 3) Tự khóa khi sạch: cũng dọn bản sao.
  {
    const { page } = await h.open(820, { workspace: seed() });
    await h.show(page, 'habits');
    const key = await page.evaluate(() => 'zen-account-' + currentUser.id);
    await page.evaluate(() => cacheCloud());
    await page.route('**/api/me', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"hết phiên"}' }));
    await page.route('**/api/logout', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"hết phiên"}' }));
    await page.evaluate(() => signOutAccount(true));
    await signedOut(page);
    assert.equal(await idbCount(page, key), 0, 'tự khóa khi sạch: IndexedDB không còn bản ghi của tài khoản');
    await page.context().close();
  }
  console.log('PASS đăng xuất dọn bản sao khi sạch, giữ lại khi còn thay đổi chưa gửi, tự khóa cũng dọn');
} finally {
  await h.close();
}
