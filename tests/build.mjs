import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {stripModuleSyntax, validateAssets} from '../scripts/build-utils.mjs';
const source = `import {something} from './module.mjs';
export const message = 'export function is user content';
export async function work() { return message; }
// export const example is documentation.
`;
const result = stripModuleSyntax(source);
assert.ok(result.includes("'export function is user content'"));
assert.ok(result.includes('// export const example is documentation.'));
new Script(result);
const assets = JSON.parse(readFileSync(new URL('../scripts/assets.json', import.meta.url)));
validateAssets(assets);
assert.throws(() => validateAssets([assets[0], assets[0]]), /Duplicate/);
assert.throws(() => validateAssets([['/escape','../private','text/plain']]), /inside dist/);
const routes = new Set(assets.map(([route]) => route));
for (const [,file,type] of assets.filter(x=>x[2].startsWith('text/html'))) {
  const html = readFileSync(new URL('../dist/'+file, import.meta.url),'utf8');
  for (const match of html.matchAll(/(?:src|href)="(\/[^"#?]+)(?:[?#][^"]*)?"/g)) {
    assert.ok(routes.has(match[1]) || match[1] === '/og-kanban.png', 'Unserved HTML dependency: '+match[1]);
  }
}
console.log('PASS: module bundling preserves content, asset routes are unique and page dependencies are served.');
