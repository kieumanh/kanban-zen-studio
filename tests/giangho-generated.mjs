// v1.86.0 (Chu Mặc): phong cách Giang hồ.
// 1. dist/giangho.css đúng là bản sinh từ CSS nguồn + scripts/giangho-skin.css; mọi bộ chọn nằm dưới :root[data-style=giangho] để phong cách Thiền
//    không đổi; màu tím thương hiệu không còn; màu mang nghĩa (xanh lá) giữ nguyên.
// 2. Họa tiết viết tay không dùng !important và không có bộ chọn thiếu tiền tố (bộ sinh từ chối).
// 3. Tệp được nạp trước studio-zen.css và có đăng ký tài sản. Phông Noto Serif tự lưu, không @import Google Fonts (v1.94.0).
// 4. theme.js: mặc định Thiền; setStyle('giangho') đặt data-style và lưu trên thiết bị; setStyle('zen') xóa cả hai.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import postcss from 'postcss';
import { generate, checkSkin } from '../scripts/generate-themes.mjs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const files = generate();
const css = read('dist/giangho.css');
assert.equal(css, files['dist/giangho.css'], 'dist/giangho.css đã cũ: chạy "node scripts/generate-themes.mjs" rồi commit');

// 1. Tiền tố và màu.
const tree = postcss.parse(css);
let rules = 0;
tree.walkRules((r) => {
  if (r.parent?.type === 'atrule' && /keyframes/.test(r.parent.name)) return;
  rules++;
  for (const sel of r.selectors) assert.ok(sel.trim().startsWith(':root[data-style=giangho]'), 'giangho.css: bộ chọn thiếu tiền tố: ' + sel);
});
assert.ok(rules > 1000, 'bộ sinh phải phát ra hàng nghìn quy tắc (sáng + tối), có ' + rules);
// v1.94.0: phông Noto Serif tự lưu (dist/fonts), không còn @import Google Fonts chặn hiển thị.
tree.walkAtRules('import', (a) => assert.fail('giangho.css không còn @import: ' + a.params));
const faces = [];
tree.walkAtRules('font-face', (a) => faces.push(Object.fromEntries(a.nodes.map((d) => [d.prop, d.value]))));
// v2.9.0 (Thư Pháp): thêm Potta One (đậm 400, Latin + tiếng Việt) cho tiêu đề: 4 mặt Noto Serif + 2 mặt Potta One.
assert.equal(faces.length, 6, 'sáu @font-face: Noto Serif (Latin + tiếng Việt, đậm 600 và 700) và Potta One (Latin + tiếng Việt, 400)');
assert.equal(faces.filter((f) => f['font-family'] === "'Potta One'").length, 2, 'hai mặt Potta One');
for (const f of faces) {
  assert.ok(["'Noto Serif'", "'Potta One'"].includes(f['font-family']), 'phông Noto Serif hoặc Potta One');
  assert.equal(f['font-display'], 'swap', 'hiện chữ ngay bằng phông dự phòng trong lúc tải');
  const file = f.src.match(/^url\('\/fonts\/((?:noto-serif|potta-one)-(latin|vietnamese)-(400|600|700)\.v1\.woff2)'\) format\('woff2'\)$/);
  assert.ok(file, 'tệp phông tự lưu: ' + f.src);
  assert.equal(file[3], f['font-weight'], 'đúng độ đậm');
  assert.ok(readFileSync(new URL('../dist/fonts/' + file[1], import.meta.url)).length > 4000, 'có tệp phông ' + file[1]);
  assert.match(f['unicode-range'], file[2] === 'vietnamese' ? /U\+1EA0-1EF9/ : /U\+0000-00FF/, 'đúng dải ký tự');
}
assert.doesNotMatch(css, /fonts\.googleapis/, 'không gọi Google Fonts');
// Phần sinh (không tính họa tiết viết tay, nơi màu dự án mặc định #7950c8 chỉ là giá trị dự phòng của màu người dùng chọn).
const mapped = css.slice(0, css.length - read('scripts/giangho-skin.css').length);
const purple = mapped.match(/#7950c8|#6e3fa0|#a8468a/i);
assert.ok(!purple, 'không còn màu tím / hồng thương hiệu trong phần sinh: ' + (purple && mapped.slice(Math.max(0, purple.index - 160), purple.index + 20)));
assert.ok(/#2e7d5b/i.test(mapped), 'màu mang nghĩa (xanh lá) giữ nguyên');
assert.match(css, /:root\[data-style=giangho\]\[data-theme=dark\]/, 'có phần cho nền tối');
assert.match(css, /--zen-primary-gradient: linear-gradient\(110deg, #a8283c/, 'nút chính màu son');

// 2. Kiểm tra họa tiết viết tay.
const skin = read('scripts/giangho-skin.css');
assert.doesNotMatch(skin.replace(/\/\*[\s\S]*?\*\//g, ''), /!important/, 'giangho-skin.css không dùng !important');
assert.ok(css.endsWith(skin), 'họa tiết viết tay được chép nguyên vào cuối giangho.css');
assert.throws(() => checkSkin(':root[data-style=giangho] .x { color: red !important; }'), /!important/, 'từ chối !important');
assert.throws(() => checkSkin('.x { color: red; }'), /tiền tố/, 'từ chối bộ chọn thiếu tiền tố');
assert.doesNotThrow(() => checkSkin(':root[data-style=giangho] .x { color: red; } @media (max-width: 700px) { :root[data-style=giangho] .y { color: blue; } }'));

// 3. Nạp và đăng ký.
const html = read('dist/index.html');
const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1]);
assert.equal(links.indexOf('/giangho.css'), links.indexOf('/studio-zen.css') - 1, 'giangho.css nạp ngay trước studio-zen.css');
assert.deepEqual(links.slice(-3), ['/studio-zen.css', '/dark.css', '/contrast.css'], 'dark.css và contrast.css vẫn nạp sau cùng');
const assets = JSON.parse(read('scripts/assets.json')).map((a) => a[0]);
assert.ok(assets.includes('/giangho.css'), '/giangho.css có trong scripts/assets.json');

// 4. theme.js trong môi trường giả lập.
function runTheme(stored = {}) {
  const attrs = {};
  const store = { ...stored };
  const root = { setAttribute: (k, v) => (attrs[k] = v), removeAttribute: (k) => delete attrs[k] };
  const ctx = {
    document: { documentElement: root, querySelector: () => null, dispatchEvent: () => {} },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] },
    CustomEvent: class {},
  };
  ctx.window = ctx;
  vm.runInNewContext(read('dist/theme.js'), ctx);
  return { attrs, store, theme: ctx.window.zenTheme };
}
{
  const t = runTheme();
  assert.equal(t.theme.state().style, 'zen', 'mặc định là phong cách Thiền');
  assert.equal(t.attrs['data-style'], undefined, 'Thiền không đặt data-style');
  t.theme.setStyle('giangho');
  assert.equal(t.attrs['data-style'], 'giangho', 'chọn Giang hồ đặt data-style');
  assert.equal(t.store['zen-style'], 'giangho', 'lưu lựa chọn trên thiết bị');
  t.theme.setStyle('zen');
  assert.equal(t.attrs['data-style'], undefined, 'về Thiền thì bỏ data-style');
  assert.equal('zen-style' in t.store, false, 'về Thiền thì xóa khóa đã lưu');
  assert.equal(t.attrs['data-theme'], 'light', 'không ảnh hưởng sáng/tối');
}
{
  const t = runTheme({ 'zen-style': 'giangho' });
  assert.equal(t.attrs['data-style'], 'giangho', 'đã lưu Giang hồ thì đặt ngay khi tải trang');
  const bad = runTheme({ 'zen-style': 'lung-tung' });
  assert.equal(bad.attrs['data-style'], undefined, 'giá trị lạ thì về Thiền');
}
console.log(`PASS: giangho.css (${rules} quy tắc) đúng bản sinh, đủ tiền tố, đổi màu thương hiệu; họa tiết không !important; nạp trước studio-zen; theme.js lưu phong cách.`);
