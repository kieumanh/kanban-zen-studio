import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const html=readFileSync('public/index.html','utf8'),worker=readFileSync('worker-api.mjs','utf8');
assert.ok(!worker.includes('\nconst files='),'Production Worker excludes static payload');
for(const m of html.matchAll(/(?:src|href)="(\/static\/[^"]+)"/g)){assert.ok(existsSync('public'+m[1]));assert.match(m[1],/\.[a-f0-9]{16}\.(js|css)$/);}
assert.match(html,/src="\/static\/app\.[a-f0-9]+\.js"/);
const sw=readFileSync('public/sw.js','utf8');assert.ok(!sw.includes('__SHELL_'));assert.ok(sw.includes('/static/app.'));
assert.match(readFileSync('public/_headers','utf8'),/max-age=31536000, immutable/);
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));assert.deepEqual(config.assets.run_worker_first,['/api/*','/health']);assert.equal(config.main,'worker-api.mjs');
console.log('PASS: production static asset directory, fingerprint paths, shell inventory, API routing and cache policy.');
