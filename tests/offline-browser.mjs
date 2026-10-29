import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import worker from '../worker-api.mjs';
import {readFileSync,existsSync} from 'node:fs';
const ASSETS={async fetch(request){const path=new URL(request.url).pathname;const file=new URL('../public/'+(path==='/'?'index.html':path.slice(1)),import.meta.url);if(!existsSync(file))return new Response('Not found',{status:404});const type=path==='/'?'text/html':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.webmanifest')?'application/manifest+json':path.endsWith('.svg')?'image/svg+xml':'application/json';return new Response(readFileSync(file),{headers:{'Content-Type':type}});}};
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=createServer(async(req,res)=>{const r=await worker.fetch(new Request('http://localhost'+req.url),{ASSETS});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext();const page=await context.newPage();
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin);await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await page.evaluate(()=>{currentUser={id:'offline-test',email:'offline@example.test',session_expires:Date.now()+600000};KEY='zen-account-offline-test';data={schema:1,projects:[],notes:[]};cloudRevision=2;dirty=true;cloudBase=structuredClone(data);cacheCloud();});
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>currentUser?.id==='offline-test');
 assert.equal(await page.evaluate(()=>document.body.classList.contains('signed-out')),false);
 assert.equal(await page.evaluate(()=>dirty),true);
 assert.equal(await page.evaluate(async()=>{try{await fetch('/api/me');return false;}catch{return true;}}),true,'API must never be cached');
 assert.equal(await page.evaluate(async()=>{const r=await fetch('/manifest.webmanifest');return (await r.json()).display;}),'standalone');
 assert.equal(await page.evaluate(async()=>{const names=await caches.keys();const c=await caches.open(names.find(x=>x.startsWith('zen-shell-')));return (await c.keys()).some(r=>new URL(r.url).pathname.startsWith('/api/'));}),false);
 await page.evaluate(()=>{const u=JSON.parse(localStorage.getItem('zen-offline-account'));u.session_expires=1;localStorage.setItem('zen-offline-account',JSON.stringify(u));});
 await page.reload();await page.waitForSelector('#auth-screen');
 assert.equal(await page.evaluate(()=>currentUser),null,'Expired sessions remain locked offline');
 await context.close();console.log('PASS: offline shell, manifest, cached draft, API isolation and expired-session lock.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
