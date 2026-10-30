import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { renderBoss, STATES } from '../dist/game/boss-art.mjs';
const root = new URL('../dist/game/boss-art/', import.meta.url);
mkdirSync(root, { recursive: true });
const bosses = JSON.parse(
  readFileSync(new URL('../dist/game/bosses.json', import.meta.url), 'utf8'),
).bosses;
for (const b of bosses)
  writeFileSync(
    new URL(b.id + '.svg', root),
    renderBoss(Number(b.id.slice(-3)), 'idle'),
  );
writeFileSync(
  new URL('manifest.json', root),
  JSON.stringify(
    {
      version: 1,
      format: 'animated-svg-rig',
      states: STATES,
      bosses: bosses.map((b) => ({
        id: b.id,
        name: b.name,
        url: '/game/boss-art/' + b.id + '.svg',
        states: STATES,
      })),
    },
    null,
    2,
  ),
);
console.log(
  'Generated 100 independent SVG boss rigs × ' + STATES.length + ' states.',
);
