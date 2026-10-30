const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const copy=value=>value===undefined?undefined:structuredClone(value);
const objects=v=>v&&typeof v==='object'&&!Array.isArray(v);
const records=v=>Array.isArray(v)&&v.every(x=>objects(x)&&typeof x.id==='string');
/** Three-way merge; decisions apply only at actual conflicts. Missing values mean deletion. */
export function mergeThreeWay(base,local,remote,decisions={}){
 const conflicts=[];
 function pick(b,l,r,path){
  if(equal(l,r)||equal(b,r))return copy(l);
  if(equal(b,l))return copy(r);
  const conflict=()=>{const key=JSON.stringify(path);if(decisions[key]==='local')return copy(l);if(decisions[key]==='remote')return copy(r);conflicts.push({key,path,base:copy(b),local:copy(l),remote:copy(r)});return copy(l);};
  if([b,l,r].every(records)){
   const bm=new Map(b.map(x=>[x.id,x])),lm=new Map(l.map(x=>[x.id,x])),rm=new Map(r.map(x=>[x.id,x]));
   const values=new Map();for(const id of new Set([...bm.keys(),...lm.keys(),...rm.keys()])){const value=pick(bm.get(id),lm.get(id),rm.get(id),[...path,{id}]);if(value!==undefined)values.set(id,value);}
   const ids=new Set(values.keys()),common=b.map(x=>x.id).filter(id=>ids.has(id)&&lm.has(id)&&rm.has(id));
   const order=list=>list.map(x=>x.id).filter(id=>common.includes(id));
   const bo=common,lo=order(l),ro=order(r);
   let chosen=l;
   if(!equal(lo,ro)&&!equal(lo,bo)&&!equal(ro,bo)){
    const key=JSON.stringify([...path,'$order']);
    if(!decisions[key])conflicts.push({key,path:[...path,'$order'],base:bo,local:lo,remote:ro});
    if(decisions[key]==='remote')chosen=r;
   }else if(equal(lo,bo))chosen=r;
   const ordering=[...chosen.map(x=>x.id),...l.map(x=>x.id),...r.map(x=>x.id)];
   return [...new Set(ordering)].filter(id=>ids.has(id)).map(id=>values.get(id));
  }
  if([b,l,r].every(objects)){
   const result={};for(const key of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){const value=pick(b[key],l[key],r[key],[...path,key]);if(value!==undefined)result[key]=value;}return result;
  }
  return conflict();
 }
 return {value:pick(base,local,remote,[]),conflicts};
}
