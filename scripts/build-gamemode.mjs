import './build.mjs';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('../public/', import.meta.url).pathname;
function visit(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    if (e.isDirectory()) visit(path);
    else if (/\.(html|js|mjs|json|webmanifest)$/.test(path)) {
      let text = readFileSync(path, 'utf8');
      text = text.replaceAll(
        'https://kanban.huongthiennature.com',
        'https://kanban.gamemode.huongthiennature.com',
      );
      writeFileSync(path, text);
    }
  }
}
visit(root);
console.log(
  'Game Mode assets prepared for dedicated hostname; production worker/config unchanged.',
);
