import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
mkdirSync(new URL('../qa/',import.meta.url),{recursive:true});
import worker from '../worker.mjs';
import {weeklyReport} from '../server/reports.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const task={id:'t',title:'Một công việc cần xem chi tiết',description:'Nội dung dài '.repeat(50),due:'2026-10-01',col:'List',checks:[]};
const report=weeklyReport({projects:[{id:'p',name:'Dự án',tasks:[task],columns:['Idea','List','Doing','Done']}]},'2026-10-29');
const server=createServer(async(req,res)=>{const r=await worker.fetch(new Request('http://localhost'+req.url));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu']});
try{for(const width of [390,820,1440]){const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/report-share/**',r=>r.fulfill({json:{html:report.html,expires:Date.now()+3600000,title:'Báo cáo'}}));await page.goto('http://127.0.0.1:'+server.address().port+'/report.html#'+'a'.repeat(64));const frame=page.frameLocator('#shared-report');await frame.locator('.report-distribution tr[role=button]').last().click();const panel=frame.locator('.report-detail');await panel.waitFor({state:'visible'});assert.equal(await panel.evaluate(el=>getComputedStyle(el).position),'relative');assert.equal(await panel.evaluate(el=>el.getBoundingClientRect().right<=document.documentElement.clientWidth),true);await panel.locator('.report-task-pick').first().click();assert.equal(await panel.locator('.report-task-detail h3').textContent(),task.title);await page.screenshot({path:new URL('../qa/report-layout-'+width+'.png',import.meta.url).pathname});assert.deepEqual(errors,[]);await page.close();console.log('PASS report layout '+width);}
 const page=await browser.newPage({viewport:{width:794,height:1123}});
 const long=weeklyReport({projects:Array.from({length:14},(_,i)=>({id:'long'+i,name:('Dự án tiếng Việt dài '+i+' ').repeat(12),tasks:[{...task,id:'longtask'+i,title:('Công việc có tên dài cần xuống dòng '+i+' ').repeat(18)}],columns:['Idea','List','Doing','Done']}))},'2026-10-29');
 await page.setContent(long.html);await page.emulateMedia({media:'print'});
 assert.equal(await page.locator('.report-sheet').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
 for(const el of await page.locator('.report-suggestion-item,.report-suggestion-next,.report-project-summary,.report-rhythm-step').all())assert.equal(await el.evaluate(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1),true,'Long Vietnamese text remains inside report blocks');
 const pdf=await page.pdf({path:new URL('../qa/report-long-a4.pdf',import.meta.url).pathname,format:'A4',printBackground:true,preferCSSPageSize:true});assert.ok(pdf.length>10000);await page.close();console.log('PASS long multi-project A4 PDF and print overflow checks');
 }finally{await browser.close();server.close();}
