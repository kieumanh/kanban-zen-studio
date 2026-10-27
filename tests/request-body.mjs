import assert from 'node:assert/strict';
import {body} from '../server/api.mjs';
const request = value => new Request('https://kanban.huongthiennature.com/api/preferences', {method:'PUT',body:JSON.stringify(value)});
for(const value of [null, [], [1], true, 3, 'text']) {
  await assert.rejects(body(request(value)), error => error.status === 400);
}
assert.deepEqual(await body(request({weeklyDay:0,weeklyReports:false})),{weeklyDay:0,weeklyReports:false});
await assert.rejects(body(new Request('https://example.test',{method:'POST',body:'{broken'})),e=>e.status===400);
await assert.rejects(body(new Request('https://example.test',{method:'POST',body:'x'.repeat(2000001)})),e=>e.status===413);
console.log('PASS: null, arrays, primitives, invalid JSON and oversized requests are rejected before handlers run.');
