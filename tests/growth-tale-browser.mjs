// v2.6.0 (Song Nguyệt): cốt truyện "Hằng Nguyệt và Huyết Nguyệt" (dist/growth-tale.js) trong Truyện ký của Tu vi.
//  1. Dữ liệu (kiểm một lần):
//     - khai cuộc + 27 chương, cấp tăng dần tới 100;
//     - người nói và cảnh hợp lệ, chỗ thay chỉ dùng các khóa đã biết, mỗi trang ≤ 240 ký tự;
//     - đủ 10 Thập Nguyệt Sứ, đều giao đấu dưới cấp 80;
//     - Giáo chủ xuất hiện ở mọi chương (trang Huyết Nguyệt đài), giao thủ trực tiếp từ cấp 80;
//     - cấp Giáo chủ (tu luyện song hành) không giảm, kẹt ở 99 rồi lên 100 cùng hiệp khách;
//     - thiền sư Không Nguyệt dẫn lên núi, võ sư Mạc Trấn Hải dẫn xuống biển, cả hai 95;
//     - sự thật (Vô Yểm Tà Thần, cánh cửa 99 → 100, thần vị) chỉ lộ sau cấp 95;
//     - đại chiến ở 99, Song thần ở 100;
//     - không dùng tên nhân vật / môn phái của truyện tham khảo.
//     - v2.11.0 (Ẩn Tình): cấp 0–88 viết lại, gieo tình tiết bất ngờ: đứa trẻ trong giỏ và cái gáo sứt quai (khai cuộc); chiếc đòn
//       gánh cũ có vết khấc (cấp 5) thành mộc kiếm Đòn Gánh (cấp 30) và là của mẹ Lệ Vô Khuyết (cấp 88); Hàn Phong trở mặt ở cấp 70,
//       để lại tua kiếm ba nút (cấp 75, ám hiệu đặt ở cấp 35); "Tiểu Mộc" có điều lạ từ cấp 60; kế giữ trấn bị lộ (cấp 84);
//       sợi chỉ đỏ trên ngực hiệp khách (cấp 82); Vô Vọng là con Mạc Trấn Hải (cấp 86); ba ngày đến muộn của sư phụ (cấp 30, 80, 88).
//  2. Khung đọc (390 chạm, 820 chạm, 1440): trang phe ác hiện cảnh Huyết Nguyệt đài (không vẽ hiệp khách), tên phe ác màu riêng;
//     chỗ thay theo nữ hiệp (sư muội, nha đầu); Tâm đắc nêu cấp Giáo chủ lúc ấy; bảng vừa màn hình.
//  3. Dấu đã đọc dùng khóa mới notice:tale-N: đã đọc truyện cũ (notice:story-N) thì chương mới vẫn là "Chưa đọc" và vẫn tự mở khi
//     vượt mốc. Bảng vàng vẫn giữ danh hiệu đọc truyện đã đạt nhờ truyện cũ.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const project = { id: 'p1', name: 'Dự án A', description: '', color: '#7950c8', icon: '✺', columns: ['Idea', 'List', 'Doing', 'Done'], columnNames: { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang thực hiện', Done: 'Hoàn thành' }, tasks: [{ id: 'p1t0', title: 'Gửi báo cáo', col: 'Doing', description: '', due: day(3), tag: 'Công việc', priority: 'q2', checks: [] }] };
// half = số nửa điểm. 14 nửa điểm = 7 điểm (cấp 9); hoàn thành một việc cộng 1 điểm → 8 điểm, qua ải cấp 10: chương "Trấn ngủ say".
const growth = (half, extra = {}) => ({ v: 1, hero: 'nu', name: 'Lam Y', since: day(-40), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [half, 0, 0, 0, 0, 0, 0, 0] }], ...extra });
const seed = (g) => () => ({ schema: 1, projects: [structuredClone(project)], notes: [], growth: g });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const reader = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('dialog.gr-story[open]');
    if (!d) return null;
    const r = d.getBoundingClientRect(), who = d.querySelector('.gr-story-who');
    return {
      title: d.querySelector('#gr-story-title').textContent, who: who?.textContent || '', side: who?.dataset.side || '', text: d.querySelector('.gr-story-text')?.textContent || '',
      moon: !!d.querySelector('.gr-story-stage.is-moon'), hero: !!d.querySelector('.gr-story-art svg.gr-hero'), lesson: d.querySelector('.gr-story-lesson')?.textContent || '',
      rival: d.querySelector('.gr-story-rival')?.textContent || '', fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
    };
  });
async function finishTask(page) {
  await h.show(page, 'board');
  await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[0], 'Done'));
  await page.waitForSelector('#growth-award[open]');
  await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-save]');
  await page.mouse.move(2, 2);
}

const h = await startHarness({ seed: seed(growth(14)) });
try {
  // 1. Dữ liệu.
  {
    const { context, page } = await h.open(1440, { workspace: seed(growth(14))() });
    await h.show(page, 'growth');
    const t = await page.evaluate(() => window.zenTale);
    const C = t.CHAPTERS;
    const lv = C.map((c) => c.lv);
    assert.equal(C.length, 28, 'khai cuộc + 27 chương');
    assert.equal(lv[0], 0, 'khai cuộc ở cấp 0');
    assert.equal(lv.at(-1), 100, 'chương cuối ở cấp 100');
    assert.ok(lv.every((x, i) => !i || x > lv[i - 1]), 'cấp tăng dần');
    const POSES = ['talk', 'martial', 'taichi', 'zen', 'moon'];
    for (const c of C) {
      assert.ok(c.title && c.lesson && c.pages.length >= 6, 'chương đủ tên, Tâm đắc, ≥ 6 trang: ' + c.title);
      for (const [who, pose, text] of c.pages) {
        assert.ok(who === 'hero' || t.WHO[who], 'người nói hợp lệ: ' + who + ' (' + c.title + ')');
        assert.ok(POSES.includes(pose), 'cảnh hợp lệ: ' + pose + ' (' + c.title + ')');
        assert.ok(text.length <= 240, 'trang không quá dài (' + text.length + '): ' + text.slice(0, 40));
        for (const m of text.matchAll(/\{(\w+)\}/g)) assert.ok(['name', 'Name', 'y', 'Y', 'sh', 'Sh', 'sd', 'Sd', 'tt', 'Tt'].includes(m[1]), 'chỗ thay hợp lệ: ' + m[0]);
      }
      assert.ok(c.pages.some(([who, pose]) => pose === 'moon' || who === 'giao'), 'Giáo chủ / Huyết Nguyệt đài có mặt trong chương ' + c.title);
    }
    const lieutenants = t.FOES.filter((f) => f.id !== 'giao');
    assert.equal(lieutenants.length, 10, 'Thập Nguyệt Sứ đủ 10');
    assert.equal(new Set(lieutenants.map((f) => f.vice)).size, 10, 'mỗi Nguyệt Sứ một thói xấu riêng');
    for (const f of lieutenants) assert.ok(C.some((c) => c.foe === f.id && c.lv < 80), f.title + ' ' + f.name + ' giao đấu dưới cấp 80');
    assert.ok(C.filter((c) => c.foe === 'giao').every((c) => c.lv >= 80), 'giao thủ trực tiếp với Giáo chủ từ cấp 80');
    assert.ok(C.filter((c) => c.foe === 'giao').length >= 5, 'nhiều trận với Giáo chủ từ cấp 80');
    const lead = C.map((c) => c.lead);
    assert.ok(lead.every((x, i) => !i || x >= lead[i - 1]), 'Giáo chủ tu luyện song hành: cấp không giảm');
    assert.ok(C.every((c) => c.lead >= c.lv), 'Giáo chủ luôn đi trước hoặc ngang hiệp khách');
    assert.deepEqual([C.find((c) => c.lv === 99).lead, C.find((c) => c.lv === 100).lead], [99, 100], 'kẹt ở 99, lên 100 cùng hiệp khách');
    const said = (id, max = 100, min = 0) => C.filter((c) => c.lv >= min && c.lv <= max && c.pages.some(([who]) => who === id)).map((c) => c.lv);
    assert.ok(said('thien').length >= 3 && said('hai').length >= 2, 'thiền sư và võ sư xuất hiện nhiều lần');
    const all = (c) => c.pages.map((p) => p[2]).join(' ');
    assert.ok(C.some((c) => /Tuyết Phong/.test(all(c)) && c.pages.some(([w]) => w === 'thien')), 'thiền sư dẫn lên núi bế quan');
    assert.ok(C.some((c) => /biển/.test(all(c)) && c.pages.some(([w]) => w === 'hai')), 'võ sư dẫn xuống biển bế quan');
    assert.ok(C.some((c) => /chín mươi lăm/.test(all(c)) && c.pages.some(([w]) => w === 'hai')), 'võ sư nội lực 95');
    assert.ok(C.some((c) => /tinh thần chín mươi lăm/.test(all(c))), 'thiền sư tinh thần 95');
    const reveal = C.filter((c) => /Vô Yểm Tà Thần/.test(all(c)) && /thần vị/.test(all(c)));
    assert.ok(reveal.length && reveal.every((c) => c.lv > 95), 'sự thật về giao ước với tà thần chỉ lộ sau cấp 95');
    assert.ok(C.filter((c) => /cánh cửa/i.test(all(c)) && /chín mươi chín/.test(all(c))).some((c) => c.lv > 95), 'cánh cửa 99 → 100');
    assert.match(all(C.find((c) => c.lv === 99)), /Cánh cửa chín mươi chín mở ra cho cả hai/, 'đại chiến ở 99, cả hai cùng qua cửa');
    assert.match(all(C.find((c) => c.lv === 100)), /Song thần chi chiến/, 'cấp 100 mở Song thần chi chiến');
    const text = JSON.stringify(t);
    for (const bad of ['Đường Tam', 'Đấu La', 'Võ Hồn', 'Hồn Sư', 'Hạo Thiên', 'Bỉ Bỉ Đông', 'Sử Lai Khắc', 'Tiểu Vũ', 'Hải Thần', 'Tu La']) assert.ok(!text.includes(bad), 'không dùng tên của truyện tham khảo: ' + bad);
    // v2.11.0 (Ẩn Tình): các tình tiết gieo ở cấp 0–88.
    const at = (lv) => all(C.find((c) => c.lv === lv));
    assert.match(at(0), /một đứa bé, và một cái gáo gỗ sứt quai/, 'khai cuộc: đứa trẻ trong giỏ và cái gáo sứt quai');
    assert.match(at(5), /chiếc đòn gánh cũ.*vết khấc/, 'cấp 5: chiếc đòn gánh cũ có vết khấc');
    assert.match(at(30), /gọt chiếc đòn gánh đen bóng thành một thanh mộc kiếm, giữ nguyên vết khấc/, 'cấp 30: mộc kiếm Đòn Gánh gọt từ chiếc đòn gánh cũ');
    assert.match(at(30), /Ở một nơi ta đến muộn ba ngày/, 'cấp 30: sư phụ đến muộn ba ngày');
    assert.match(at(35), /ba nút là còn nợ/, 'cấp 35: ám hiệu tua kiếm');
    assert.match(at(60), /con rùa sau bếp rụt cổ/, 'cấp 60: Tiểu Mộc về muộn, con rùa rụt cổ');
    assert.match(at(70), /Nguyệt Sứ thứ mười một/, 'cấp 70: Hàn Phong trở mặt');
    assert.match(at(75), /thắt đúng ba nút/, 'cấp 75: tua kiếm ba nút');
    assert.match(at(82), /ở đó cũng có một sợi chỉ đỏ/, 'cấp 82: sợi chỉ đỏ trên ngực hiệp khách');
    assert.match(at(84), /Kế giữ trấn chỉ ba người biết/, 'cấp 84: kế giữ trấn bị lộ');
    assert.match(at(86), /con trai ta, Mạc Vọng/, 'cấp 86: Vô Vọng là con Mạc Trấn Hải');
    assert.match(at(88), /Chiếc đòn gánh ấy là của bà/, 'cấp 88: chiếc đòn gánh của mẹ Lệ Vô Khuyết');
    assert.match(at(88), /Ta quay lại muộn ba ngày/, 'cấp 88: lời thú nhận của sư phụ');
    assert.ok(C.filter((c) => c.lv < 90).every((c) => !/đứa trẻ trong giỏ.*là ngươi|là tại hạ/.test(all(c))), 'thân thế hiệp khách chưa lộ trước cấp 90');
    await context.close();
  }

  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 2 + 3. Người đã đọc 5 chương truyện cũ (notice:story-5 … 25): qua ải cấp 10 thì chương mới "Trấn ngủ say" vẫn tự mở.
    const { context, page, server } = await h.open(width, { touch, workspace: seed(growth(14))(), receiptsSeed: ['notice:story-0', 'notice:story-5', 'notice:story-10', 'notice:story-15', 'notice:story-20', 'notice:story-25'] });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await finishTask(page);
    // Đột phá Tam lưu cao thủ: nghi thức trước, rồi chương truyện.
    await page.waitForSelector('dialog.gr-breakthrough[open]');
    await page.locator('dialog.gr-breakthrough button').click();
    await page.waitForSelector('dialog.gr-story[open]', { timeout: 5000 });
    let r = await reader(page);
    assert.equal(r.title, 'Trấn ngủ say', 'chương mới tự mở dù đã đọc truyện cũ' + at);
    assert.ok(r.fits, 'bảng vừa màn hình' + at);
    const seen = [];
    for (let i = 0; i < 20 && !r.lesson; i++) {
      seen.push(r);
      await page.keyboard.press('ArrowRight');
      r = await reader(page);
    }
    const mien = seen.find((x) => x.who === 'Thụy Nguyệt Sứ Miên Hồ');
    assert.ok(mien && mien.moon && !mien.hero && mien.side === 'ac', 'trang phe ác: cảnh Huyết Nguyệt đài, không vẽ hiệp khách, tên màu riêng' + at);
    const heroPage = seen.find((x) => x.who === 'Lam Y');
    assert.ok(heroPage && heroPage.hero && !heroPage.moon, 'trang của hiệp khách vẫn vẽ hiệp khách' + at);
    assert.ok(seen.every((x) => x.fits), 'mọi trang vừa màn hình' + at);
    assert.ok(seen.every((x) => !/\{\w+\}/.test(x.text)), 'không còn chỗ thay chưa điền' + at);
    assert.match(r.lesson, /Đừng đợi có hứng mới bắt đầu/, 'Tâm đắc của chương' + at);
    assert.equal(r.rival, 'Huyết Nguyệt Giáo chủ lúc ấy: cấp 73', 'Tâm đắc nêu cấp Giáo chủ lúc ấy' + at);
    assert.equal(await page.evaluate(() => window.zenStory.fill('{sd} · {Tt} · {Name}')), 'sư muội · Nha đầu · Lam Y', 'chỗ thay theo nữ hiệp' + at);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
    await page.waitForFunction(() => readReceiptKeys.has('notice:tale-10'));
    assert.ok(server.receipts.includes('notice:tale-10') && !server.receipts.includes('notice:tale-5'), 'dấu đã đọc dùng khóa mới' + at);
    // Lộ trình: chương mới ở cấp đã qua là "Chưa đọc"; Bảng vàng giữ danh hiệu đọc 5 chương nhờ truyện cũ.
    await h.show(page, 'growth');
    const list = await page.evaluate(() => [...document.querySelectorAll('.gr-ch')].slice(0, 4).map((li) => [li.querySelector('strong').textContent, li.querySelector('.gr-ch-tag').textContent]));
    assert.deepEqual(list, [['Trăng trong thùng nước', 'Chưa đọc'], ['Trăm chuyến nước', 'Chưa đọc'], ['Trấn ngủ say', 'Đã đọc'], ['Hội đèn nghìn mặt', 'Mở ở cấp 15']], 'chương mới theo khóa mới' + at);
    assert.equal(await page.locator('.gr-ach[data-ach="story-5"] .gr-ach-state').textContent(), 'Đã đạt', 'Bảng vàng giữ danh hiệu đọc truyện đã đạt' + at);
    // Mở chương 100 không được khi chưa tới cấp; mở lại chương đã qua có cảnh Huyết Nguyệt đài ở trang đầu nếu là trang phe ác.
    assert.equal(await page.locator('[data-gr-story="100"]').count(), 0, 'chương chưa tới cấp bị khóa' + at);
    await page.click('[data-gr-story="0"]');
    await page.waitForSelector('dialog.gr-story[open]');
    r = await reader(page);
    assert.equal(r.title, 'Trăng trong thùng nước', 'mở lại khai cuộc' + at);
    assert.match(r.text, /Lam Y ngày ngày gánh nước/, 'lời kể dùng danh hiệu' + at);
    await page.keyboard.press('Escape');
    assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }
  console.log('growth-tale-browser ok');
} finally {
  await h.close();
}
