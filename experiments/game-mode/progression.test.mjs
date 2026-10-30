import assert from 'node:assert/strict';
import {xpToNext,progression,axisAllocation} from './progression.mjs';
assert.equal(progression(0).level,1);
let total=0;
for(let level=1;level<100;level++){
  const need=xpToNext(level);
  assert.equal(progression(total).level,level);
  assert.equal(progression(total+need-1).level,level);
  total+=need;
  assert.equal(progression(total).level,level+1);
}
assert.equal(total,265963);
assert.equal(progression(total+17).overflow,17);
assert.equal(progression(total).percent,100);
for(const xp of [0,5,25,100,101]){
  const result=axisAllocation(xp,'can-cot','tam-luc');
  assert.equal(Object.values(result).reduce((a,b)=>a+b,0),xp);
}
for(const value of [-1,NaN,1.5,Infinity]) assert.throws(()=>progression(value));
assert.throws(()=>xpToNext(101));
assert.throws(()=>axisAllocation(5,'can-cot','can-cot'));
console.log('Game balance boundaries and conserved axis allocations passed.');
