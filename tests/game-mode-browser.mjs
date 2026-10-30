import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import worker from '../worker.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=createServer(async(req,res)=>{try{const r=await worker.fetch(new Request('http://localhost'+req.url));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}catch(e){res.writeHead(500);res.end(e.message);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});mkdirSync('qa',{recursive:true});
try{for(const width of [390,820,1440]){
 const context=await browser.newContext({viewport:{width,height:960}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/game-preview.html');await page.locator('#g-form [name=name]').fill('Thanh Tâm');await page.locator('#g-form form button').last().click();
 await page.screenshot({path:'qa/game-home-'+width+'.png'});
 await page.locator('[data-tab=tasks]').first().click();await page.locator('[data-g=meta][data-id=seed]').click();await page.locator('#g-form [name=primary]').selectOption('4');await page.locator('#g-form [name=minutes]').fill('60');await page.locator('#g-form form button').last().click();
 await page.locator('[data-g=demo-done][data-id=seed]').click();await page.locator('[data-tab=axes]').first().click();assert.equal(await page.locator('.g-grid>.g-card').count(),9);
 await page.locator('[data-g=spend][data-axis="4"]').click();await page.locator('#g-form [name=kind]').selectOption('book');await page.locator('#g-form [name=amount]').fill('10');await page.locator('#g-form [name=name]').fill('Sách người dùng cung cấp');await page.locator('#g-form [name=note]').fill('Ghi nhận học tập');await page.locator('#g-form form button').last().click();
 await page.locator('[data-tab=inventory]').first().click();await page.getByText('Sách người dùng cung cấp ×1',{exact:true}).waitFor();assert.equal(await page.locator('[data-g=asset]').count(),1);
 await page.locator('[data-tab=story]').first().click();assert.equal(await page.locator('.g-content>.g-card').count(),10);await page.locator('[data-tab=map]').first().click();assert.equal(await page.locator('[data-g=boss]').count(),100);
 assert.equal(await page.evaluate(()=>document.querySelector('#zen-game').scrollWidth>document.querySelector('#zen-game').clientWidth+2),false);await page.screenshot({path:'qa/game-mode-'+width+'.png'});
 await page.reload();await page.locator('[data-tab=inventory]').first().click();await page.getByText('Sách người dùng cung cấp ×1',{exact:true}).waitFor();assert.deepEqual(errors,[]);await context.close();console.log('PASS Game Mode UI at '+width+'px');
}}finally{await browser.close();await new Promise(r=>server.close(r));}
