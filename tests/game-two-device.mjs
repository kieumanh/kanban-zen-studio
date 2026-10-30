import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {api,passwordHash} from '../server/api.mjs';
import worker from '../worker.mjs';
import * as C from '../dist/game/core.mjs';
import {changesBetween} from '../dist/modules/delta.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8'));
class Statement{constructor(text){this.text=text;}bind(...values){this.values=values;return this;}async first(){return sql.prepare(this.text).get(...this.values)||null;}async run(){return {meta:sql.prepare(this.text).run(...this.values)};}async all(){return {results:sql.prepare(this.text).all(...this.values)};}}
const DB={prepare:text=>new Statement(text),async batch(statements){sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(/\bRETURNING\b/i.test(s.text)?await s.all():await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}},env={DB};
const password='Synthetic game sync test 2026';sql.prepare('INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,0)').run('game-owner','game-owner@example.test',await passwordHash(password));
async function req(path,method='GET',data,cookie=''){return api(new Request('https://kanban.huongthiennature.com/api/'+path,{method,headers:{Origin:'https://kanban.huongthiennature.com','Content-Type':'application/json',Cookie:cookie,'CF-Connecting-IP':'192.0.2.8'},body:data?JSON.stringify(data):undefined}),env);}
const login=async()=>{const r=await req('login','POST',{email:'game-owner@example.test',password,rememberDevice:true});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0].split('=')[1];};
const tokenA=await login(),tokenB=await login(),cookie='zen_session='+tokenA;
const initial=await(await req('workspace-v2','GET',null,cookie)).json();
let w={schema:1,projects:[{id:'p',name:'Synthetic',description:'',color:'#7950c8',icon:'x',columns:['Idea','List','Doing','Done'],tasks:[{id:'t',title:'Hoàn thành việc thử',description:'',tag:'',due:'',col:'List',checks:[]}]}],notes:[]};
w.game=C.create(w);w.game=C.apply(w.game,{id:'setup',type:'meta',payload:{taskId:'t',primary:4,secondary:null,minutes:30}},w);w.game.profile={name:'Hai thiết bị',appearance:'male',started:true};w.projects[0].tasks[0].col='Done';w.game=C.observe(w.game,w);assert.equal(C.accounting(w.game).balance[4],2500n); // task 25 + project milestone 100, project defaults unclassified
const seed=await req('workspace-v2','POST',{revision:initial.revision,changes:changesBetween(initial.data,w)},cookie);assert.equal(seed.status,200,await seed.clone().text());
let queue=Promise.resolve();
const server=createServer((req0,res)=>{queue=queue.then(async()=>{try{const chunks=[];for await(const chunk of req0)chunks.push(chunk);const url='https://kanban.huongthiennature.com'+req0.url,headers=new Headers(req0.headers);if(headers.has('Origin'))headers.set('Origin','https://kanban.huongthiennature.com');headers.set('CF-Connecting-IP','192.0.2.8');const r=await worker.fetch(new Request(url,{method:req0.method,headers,body:['GET','HEAD'].includes(req0.method)?undefined:Buffer.concat(chunks)}),env);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}catch(e){res.writeHead(500);res.end(e.message);}});});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report={environment:'Two isolated Chromium contexts, desktop + mobile; actual Worker API; SQLite D1 adapter; synthetic account only',checks:[]};
const check=(name)=>{report.checks.push({name,result:'pass'});console.log('PASS '+name);};
try{
 const contexts=[await browser.newContext({viewport:{width:1440,height:1000}}),await browser.newContext({viewport:{width:390,height:900},isMobile:true})];
 for(let i=0;i<2;i++)await contexts[i].addCookies([{name:'zen_session',value:[tokenA,tokenB][i],url:origin,httpOnly:true,secure:false}]);
 const [a,b]=await Promise.all(contexts.map(c=>c.newPage()));
 for(const page of [a,b]){await page.addLocatorHandler(page.locator('.welcome-dialog[open]'),async()=>{await page.locator('.welcome-close').click();});await page.goto(origin);await page.waitForFunction(()=>typeof currentUser!=='undefined'&&currentUser?.id==='game-owner'&&typeof data!=='undefined'&&data.game);await page.waitForFunction(()=>!document.body.classList.contains('signed-out'));if(!await page.locator('#g-entry').isVisible())await page.locator('#menu').click();await page.locator('#g-entry').click();await page.locator('[data-tab=axes]').first().click();}
 check('Both independent devices load same account, initial 25 Ngộ Tính and 125 total cultivation');
 for(const ctx of contexts)await ctx.setOffline(true);
 async function spend(page,note){await page.locator('[data-g=spend][data-axis="4"]').click();await page.locator('#g-form [name=kind]').selectOption('book');await page.locator('#g-form [name=amount]').fill('20');await page.locator('#g-form [name=name]').fill('Sách người dùng '+note);await page.locator('#g-form [name=note]').fill(note);await page.locator('#g-form form button').last().click();await page.waitForFunction(()=>data.game.transactions.length===1);await page.evaluate(()=>pendingLocalSave);}
 await spend(a,'Thiết bị A');await spend(b,'Thiết bị B');
 for(const page of [a,b])assert.equal(await page.evaluate(()=>data.game.transactions.length),1);
 check('Two offline devices each preserve independent purchase draft and asset');
 await contexts[0].setOffline(false);await a.evaluate(()=>flushCloud(true));await a.waitForFunction(()=>!dirty&&!syncing);check('Device A reconnects and commits once');
 const confirmed=await(await req('workspace-v2','GET',null,cookie)).json();assert.equal(confirmed.data.game.transactions.length,1);assert.equal(C.accounting(confirmed.data.game).balance[4],500n);assert.equal(confirmed.data.game.assets.length,1);
 await contexts[1].setOffline(false);await b.evaluate(()=>flushCloud(true));await b.waitForFunction(()=>syncConflict===true);
 const conflict=await(await req('workspace-v2','GET',null,cookie)).json();assert.equal(conflict.data.game.transactions.length,1);assert.equal(C.accounting(conflict.data.game).balance[4],500n);assert.equal(await b.evaluate(()=>data.game.transactions[0].note),'Thiết bị B');
 check('Concurrent purchase is blocked as conflict: no negative balance, no second committed asset, local draft retained');
 await b.evaluate(()=>{document.querySelector('#zen-game').close();accountPanel();});await b.locator('#resolve-cloud').evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await b.locator('#resolve-cloud').click();await b.locator('#editor-form button[type=submit]').click();await b.waitForFunction(()=>!syncConflict&&!dirty);
 assert.equal(await b.evaluate(()=>data.game.transactions[0].note),'Thiết bị A');
 const backups=await b.evaluate(async()=>{const m=await persistenceReady;const keys=await new Promise((resolve,reject)=>{const r=indexedDB.open('kanban-zen-local-v2');r.onsuccess=()=>{const q=r.result.transaction('records').objectStore('records').getAllKeys();q.onsuccess=()=>resolve(q.result);q.onerror=reject;};});return keys.filter(k=>String(k).includes('-conflict-'));});assert.ok(backups.length>0);
 check('Explicit server-version resolution converges and preserves losing draft in IndexedDB recovery');
 const state=await(await req('workspace-v2','GET',null,cookie)).json();const retry=await req('workspace-v2','POST',{revision:state.revision-1,changes:changesBetween(initial.data,w)},cookie);assert.equal(retry.status,409);
 assert.equal((await(await req('workspace-v2','GET',null,cookie)).json()).data.game.transactions.length,1);check('Stale network replay returns 409 without duplicate debit or asset');
 // Clean device B receives a new completed task and its reward from device A.
 await a.evaluate(()=>{const p=data.projects[0];p.tasks.push({id:'t2',title:'Việc mới',description:'',tag:'',due:'',col:'List',checks:[]});save();data.game.taskMeta.t2={primary:4,secondary:null,minutes:10};p.tasks.at(-1).col='Done';save();});await a.evaluate(()=>flushCloud(true));await a.waitForFunction(()=>!dirty&&!syncing);
 await b.evaluate(()=>pollCloud());await b.waitForFunction(()=>data.projects[0].tasks.length===2);assert.equal(await b.evaluate(()=>data.game.transactions.length),1);assert.equal(await b.evaluate(()=>data.game.rewards['t:t2'].active),true);check('Completed-task reward syncs without replaying spending');
 await b.reload();await b.waitForFunction(()=>currentUser?.id==='game-owner'&&data.game.transactions.length===1);check('Reload restores committed inventory and ledger from account storage');
 mkdirSync('qa',{recursive:true});writeFileSync('qa/game-two-device-report.json',JSON.stringify(report,null,2));await Promise.all(contexts.map(c=>c.close()));
}finally{await browser.close();await new Promise(r=>server.close(r));sql.close();}
