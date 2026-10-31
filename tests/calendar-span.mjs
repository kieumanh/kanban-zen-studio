import vm from 'node:vm';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {webcrypto} from 'node:crypto';
const nodes=new Map();function node(key=''){if(nodes.has(key))return nodes.get(key);const e={innerHTML:'',textContent:'',value:'',style:{},dataset:{},children:[],classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){},removeAttribute(){},addEventListener(){},append(){},prepend(){},insertBefore(){},insertAdjacentHTML(){},scrollIntoView(){},querySelector(s){return node(key+' '+s)},querySelectorAll(){return []},getContext(){return {lineWidth:0,clearRect(){},drawImage(){}}},close(){},showModal(){this.open=true},focus(){}};nodes.set(key,e);return e;}
const context=vm.createContext({console,crypto:webcrypto,structuredClone,globalThis:{crypto:webcrypto},localStorage:{getItem(){return null},setItem(){}},document:{querySelector:node,querySelectorAll(){return []},addEventListener(){},createElement:node,body:node('body')},window:{addEventListener(){},matchMedia(){return {matches:false}}},MutationObserver:class{observe(){}},setTimeout(){},clearTimeout(){},URL,Blob,Date,Image:class{},navigator:{onLine:true}});
for(const file of ['app.js','workspace.js','content.js'])vm.runInContext(readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'),context,{filename:file});
vm.runInContext("data=sample();let currentUser=null;function requestAPI(){};function setInterval(){};",context);
vm.runInContext(readFileSync(new URL('../dist/ux.js',import.meta.url),'utf8'),context,{filename:'ux.js'});
// Tháng 10/2026: lưới 28/9 → 1/11, hai hàng cuối là tuần 19–25/10 và tuần 26/10–1/11.
vm.runInContext("calendarMonth=9;calendarYear=2026;scheduleEvents=function(){const project={id:'p1',name:'P',color:'#7950c8'},ev=(id,title,start,end,kind='task')=>({id,title,col:'Doing',project,checks:[],eventKind:kind,eventStart:start,eventEnd:end});return [ev('long','Dự án dài','2026-10-21','2026-10-30'),ev('mid','Giữa tuần','2026-10-29T22:49','2026-10-31T22:49'),ev('one','Một ngày','2026-10-28T09:00','2026-10-28T09:30'),ev('due','Chỉ hạn','2026-10-28','2026-10-28','deadline')];};",context);
const html=vm.runInContext('workCalendar()',context);
const bars=[...html.matchAll(/<button type="button" class="month-bar([^"]*)" data-task="([^"]+)"[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/button>/g)].map(m=>({classes:m[1],id:m[2],style:m[3],body:m[4]}));
const events=[...html.matchAll(/<button class="month-event[^"]*" data-task="([^"]+)"/g)].map(m=>m[1]);
const count=id=>bars.filter(b=>b.id===id).length;
assert.equal(count('long'),2,'task dài qua hai tuần là đúng hai thanh, mỗi tuần một thanh');
assert.equal(count('mid'),1,'task trong một tuần là một thanh duy nhất');
assert.equal(count('one')+count('due'),0,'task một ngày và task chỉ có hạn không thành thanh');
assert.deepEqual(events.filter(id=>id==='long'||id==='mid'),[],'task nhiều ngày không còn lặp thẻ ở từng ngày');
assert.equal(events.filter(id=>id==='one').length,1,'task một ngày vẫn là một thẻ');
assert.equal(events.filter(id=>id==='due').length,1,'hạn hoàn thành vẫn là một thẻ');
const [first,second]=bars.filter(b=>b.id==='long');
assert.ok(first.style.includes('--span:5')&&first.classes.includes('bar-open-right')&&!first.classes.includes('bar-open-left'),'thanh tuần đầu nối tiếp sang tuần sau');
assert.ok(second.style.includes('--span:5')&&second.classes.includes('bar-open-left')&&!second.classes.includes('bar-open-right'),'thanh tuần sau nối tiếp từ tuần trước');
const mid=bars.find(b=>b.id==='mid');
assert.ok(mid.style.includes('--span:3')&&!/bar-open/.test(mid.classes),'thanh 29–31/10 chiếm ba ô ngày');
assert.ok(second.style.includes('--lane:0')&&mid.style.includes('--lane:1'),'hai thanh chồng nhau được xếp vào hai làn khác nhau');
assert.match(mid.body,/22:49[\s\S]*Giữa tuần[\s\S]*→ 22:49/,'giờ bắt đầu ở đầu thanh, giờ kết thúc ở cuối thanh');
assert.equal((html.match(/--lanes:2/g)||[]).length,7,'tuần cuối có hai làn ở cả bảy ô để các ô cùng chiều cao');
assert.equal((html.match(/--lanes:1/g)||[]).length,7,'tuần trước có một làn ở cả bảy ô');
assert.equal((html.match(/role="gridcell"/g)||[]).length,35);
console.log('PASS: multi-day tasks render as one continuous bar per week with lanes, open ends across weeks, and single-day cards unchanged.');
