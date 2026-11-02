// Hồi quy v1.16.0: dist/dark.css và dist/contrast.css đúng là sản phẩm của scripts/generate-themes.mjs từ CSS nguồn hiện tại
// (không ai sửa tay, và nguồn đổi thì phải sinh lại), mọi quy tắc đều nằm dưới tiền tố chủ đề, và có đăng ký trong index/assets.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate } from '../scripts/generate-themes.mjs';

const { stats, ...files } = generate();
for (const [file, body] of Object.entries(files)) {
  assert.equal(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), body, `${file} đã cũ: chạy "node scripts/generate-themes.mjs" rồi commit`);
}
const dark = readFileSync(new URL('../dist/dark.css', import.meta.url), 'utf8');
const contrast = readFileSync(new URL('../dist/contrast.css', import.meta.url), 'utf8');
const selectors = (css) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim()).filter((s) => !s.startsWith('@'));
for (const s of selectors(dark)) for (const part of s.split(',')) assert.ok(part.trim().startsWith(':root[data-theme=dark]'), `dark.css: bộ chọn không có tiền tố chủ đề: ${part.trim()}`);
for (const s of selectors(contrast)) for (const part of s.split(',')) assert.ok(/^:root\[data-(contrast=high|theme=dark\]\[data-contrast=high)/.test(part.trim()), `contrast.css: bộ chọn không có tiền tố: ${part.trim()}`);
assert.ok(stats.dark[0] > 300 && stats.hcLight[0] > 300, 'bộ sinh phải phát ra hàng trăm quy tắc');

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1]);
assert.deepEqual(links.slice(-3), ['/studio-zen.css', '/dark.css', '/contrast.css'], 'dark.css và contrast.css phải nạp sau cùng, sau studio-zen.css');
assert.ok(html.indexOf('<script src="/theme.js"></script>') > 0 && html.indexOf('<script src="/theme.js"></script>') < html.indexOf('href="/style.css"'), 'theme.js phải chạy đồng bộ trong <head>, trước CSS (không chớp sáng-tối)');
const assets = JSON.parse(readFileSync(new URL('../scripts/assets.json', import.meta.url), 'utf8')).map((a) => a[0]);
for (const url of ['/theme.js', '/dark.css', '/contrast.css']) assert.ok(assets.includes(url), `${url} chưa có trong scripts/assets.json`);
console.log(`PASS: dark.css (${stats.dark[0]} quy tắc) và contrast.css đúng bản sinh từ CSS nguồn; tiền tố chủ đề; thứ tự nạp; đăng ký tài sản.`);
