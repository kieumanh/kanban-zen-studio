import assert from 'node:assert/strict';
import {purgeStorage} from '../server/storage.mjs';
const writes=[];
const data={schema:1,projects:[],notes:[],trash:[
{id:'bad-task',kind:'task',at:1,payload:'{"id":"task"}',parent:''},
{id:'bad-note',kind:'note',at:1,payload:'null',parent:''}
]};
const DB={prepare(text){let values=[];return {bind(...args){values=args;return this;},async all(){return {results:text.includes('json_array_length')?[{user_id:'owner',revision:4,data:JSON.stringify(data)}]:[]};},async run(){writes.push({text,values});return {meta:{changes:1}};}};}};
await purgeStorage({DB});
const update=writes.find(x=>x.text.startsWith('UPDATE workspaces'));
assert.ok(update,'Cleanup continues after malformed historical trash');
assert.deepEqual(JSON.parse(update.values[0]).trash,[]);
assert.equal(update.values[1],'owner');
assert.equal(update.values[2],4,'Cleanup preserves revision guard');
assert.equal(writes.some(x=>x.text.startsWith('UPDATE object_files')),false);
console.log('PASS: malformed historical trash cannot stop cleanup or touch unrelated files.');
