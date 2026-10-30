import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const server=createServer((req,res)=>{
 if(req.url.startsWith('/api/')){res.writeHead(401,{'Content-Type':'application/json'});res.end('{"error":"Test session expired"}');return;}
 const path=new URL(req.url,'http://localhost').pathname;
 const file=new URL('../public/'+(path==='/'?'index.html':path.slice(1)),import.meta.url);
 if(!existsSync(file)){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':path==='/'?'text/html':/\.m?js$/.test(path)?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.svg')?'image/svg+xml':path.endsWith('.ogg')?'audio/ogg':'application/json'});res.end(readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage','--disable-crash-reporter']});
const context=await browser.newContext(),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('#auth-screen');
 await page.evaluate(async()=>{
  currentUser={id:'offline-test',email:'offline@example.test',session_expires:Date.now()+600000};KEY='zen-account-offline-test';
  data={schema:1,projects:[{id:'p1',name:'Offline project',description:'',icon:'',columns:['Idea','List','Doing','Done'],color:'#7544b8',tasks:Array.from({length:100},(_,i)=>({id:'t'+i,title:'Offline task '+i,description:'',col:'Idea',tag:'',due:'',checks:[],labels:[],created:Date.now()}))}],notes:[]};
  if(!valid(data))throw Error('Invalid test fixture');
  cloudRevision=2;dirty=true;cloudBase=structuredClone(data);await cacheCloud();
  const salt=Array.from(crypto.getRandomValues(new Uint8Array(16))),hash=await localPasswordHash('offline-password',salt);
  await(await persistenceReady).set('unlock:'+currentUser.id,{salt,hash,failures:0,retryAfter:0});
 });
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForSelector('#auth-screen');
 await context.setOffline(true);await page.reload();await page.waitForSelector('input[name=unlockPassword]');
 await page.fill('input[name=unlockPassword]','wrong');await page.locator('#editor-form button[type=submit]').click();
 assert.equal(await page.evaluate(()=>currentUser),null);
 await page.evaluate(async()=>{const store=await persistenceReady;const u=await store.get('unlock:offline-test');u.retryAfter=0;await store.set('unlock:offline-test',u);});
 await page.fill('input[name=unlockPassword]','offline-password');await page.locator('#editor-form button[type=submit]').click();
 await page.waitForFunction(()=>currentUser?.id==='offline-test');
 assert.equal(await page.evaluate(()=>data.projects[0].tasks.length),100);
 assert.equal(await page.evaluate(()=>dirty),true);
 assert.equal(await page.evaluate(()=>localStorage.getItem(KEY)),null);
 await page.evaluate(async()=>{data.projects[0].tasks[0].title='Edited offline';save();await pendingLocalSave;});
 await page.reload();await page.waitForSelector('input[name=unlockPassword]');await page.fill('input[name=unlockPassword]','offline-password');await page.locator('#editor-form button[type=submit]').click();await page.waitForFunction(()=>currentUser?.id==='offline-test');
 assert.equal(await page.evaluate(()=>data.projects[0].tasks[0].title),'Edited offline');
 const files=await page.evaluate(async()=>{const store=await offlineFilesReady,file=new File(['offline document'],'garden.txt',{type:'text/plain'});await Promise.all([store.enqueue(currentUser.id,'project:p1',file),store.enqueue(currentUser.id,'project:p1',file)]);const records=await store.list(currentUser.id);return {count:records.length,text:await records[0].blob.text(),valid:await store.verify(records[0]),other:(await store.list('another-account')).length};});
 assert.deepEqual(files,{count:1,text:'offline document',valid:true,other:0});
 await page.reload();await page.waitForSelector('input[name=unlockPassword]');
 assert.equal(await page.evaluate(async()=>(await(await offlineFilesReady).list('offline-test')).length),1);
 assert.deepEqual(errors,[]);
 console.log('PASS: offline shell, password lock/rejection, 100 tasks, repeated reload, persistent offline edit, durable binary, duplicate prevention and account isolation.');
}finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
