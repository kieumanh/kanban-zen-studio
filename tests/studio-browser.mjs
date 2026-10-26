import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {default as worker} from '../worker.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=new URL('../',import.meta.url).pathname;
const server=createServer(async(req,res)=>{try{const response=await worker.fetch(new Request('http://localhost'+req.url));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end(e.message);}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer'],headless:true});
const day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}),baseTask=(id,title)=>({id,title,col:'List',due:day,description:'Nội dung thử nghiệm bố cục và đồng bộ.',tag:'Thiết kế',priority:'q2',checks:[{id:id+'c',text:'Bước kiểm tra đầu tiên',done:false}]}),seed={schema:1,projects:[{id:'p1',name:'Dự án kiểm tra',description:'',color:'#7950c8',icon:'✺',columns:['Idea','List','Doing','Done'],tasks:[baseTask('t1','Công việc đầu tiên'),baseTask('t2','Công việc thứ hai')]}],notes:[{id:'n1',title:'Tài liệu liên quan',text:'Nội dung ghi chú kiểm thử',group:'',url:'',color:'#7950c8',type:'note'}]};
mkdirSync(root+'qa',{recursive:true});let reports=[];
try{
for(const [width,height] of [[390,844],[820,1180],[1440,1000]]){
 const context=await browser.newContext({viewport:{width,height},timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage(),errors=[];let workspace=structuredClone(seed),revision=1;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname.slice(5);let result={};if(path==='me')result={user:{id:'qa',email:'qa@example.test',name:'Kiểm tra',session_expires:Date.now()+600000}};else if(path==='workspace'){if(req.method()==='PUT'){const v=req.postDataJSON();workspace=v.data;revision++;result={revision};}else result={data:workspace,revision};}else if(path==='resources')result={files:[],total:0,used:0,offset:0};else if(path==='assets')result={files:[],used:0,quota:1000000000};else if(path==='activity')result={expires:Date.now()+600000};else if(path==='preferences')result={};else if(path==='note-history')result={versions:[]};else if(path==='report-shares')result={shares:[]};else if(path==='notifications')result={notifications:[]};else if(path==='latest')result={version:'2.0.0'};else if(path==='files')result={files:[]};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});});
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await context.addInitScript(({day})=>{for(let i=0;i<4;i++)localStorage.setItem('zen-welcome:qa:'+day+':'+i,'seen');},{day});await page.goto(url);await page.waitForSelector('.studio-next',{timeout:10000});
 assert.deepEqual(errors,[],`startup ${width}`);
 await page.screenshot({path:root+`qa/dashboard-${width}.png`,fullPage:true});
 await page.locator('[data-studio="choose-focus"]').click();await page.locator('input[name=focus]').first().check();await page.locator('#editor-form button[type=submit]').click();await page.waitForTimeout(50);
 await page.evaluate(()=>{const p=project('p1');taskDetail(p,p.tasks[0]);});
 await page.locator('#editor [name=description]').fill('Nội dung đã chỉnh và cần giữ khi mở tập trung.');await page.locator('[name=due]').fill('2026-12-01');await page.locator('[name=end]').fill('2026-11-28T17:00');await page.locator('[name=comment]').fill('Ghi chú nội bộ thử nghiệm');await page.locator('[name=noteIds]').selectOption('n1');
 await page.locator('[data-studio=comment]').click();await page.waitForTimeout(50);
 assert.equal(await page.locator('.studio-comments').textContent().then(t=>t.includes('Ghi chú nội bộ thử nghiệm')),true);
 const saved=await page.evaluate(()=>project('p1').tasks[0]);assert.equal(saved.due,'2026-12-01');assert.equal(saved.end,'2026-11-28T17:00');assert.ok(saved.history.some(h=>h.label==='Hạn hoàn thành'));assert.ok(saved.noteIds.includes('n1'));
 await page.locator('[name=title]').fill('Tên task đã chỉnh');await page.locator('[data-studio=focus-from-editor]').click();await page.waitForTimeout(60);assert.equal(await page.locator('.studio-focus h2').textContent(),'Tên task đã chỉnh');assert.equal(await page.evaluate(()=>!!Studio.focus),true);
 await page.locator('[data-studio-focus-check]').first().check();assert.equal(await page.evaluate(()=>project('p1').tasks[0].checks[0].done),true);
 await page.locator('.modal-close-pin').click();await page.waitForTimeout(50);
 await page.evaluate(()=>{go('tasks');});await page.locator('[data-studio-pick]').first().check();
 await page.locator('[data-studio=bulk]').click();await page.locator('[name=col]').selectOption('Doing');await page.locator('#editor-form button[type=submit]').click();
 await page.evaluate(()=>{go('calendar','p1');});await page.locator('[data-studio=today]').click();await page.screenshot({path:root+`qa/calendar-${width}.png`,fullPage:true});
 await page.evaluate(()=>{taskDetail(project('p1'),project('p1').tasks[1]);});await page.screenshot({path:root+`qa/task-${width}.png`,fullPage:false});
 assert.equal(await page.locator('#editor').evaluate(el=>el.scrollWidth<=el.clientWidth+2),true,`dialog fits ${width}`);
 await page.locator('[data-studio=template-task]').click();await page.locator('[name=name]').fill('Mẫu task kiểm thử');await page.locator('#editor-form button[type=submit]').click();await page.locator('[data-studio-use-template]').click();await page.locator('[name=name]').fill('Task từ mẫu');await page.locator('#editor-form button[type=submit]').click();
 assert.equal(await page.evaluate(()=>project('p1').tasks.length),3);assert.equal(await page.evaluate(()=>new Set(project('p1').tasks.flatMap(t=>[t.id,...t.checks.map(c=>c.id)])).size),6);
 await page.locator('.modal-close-pin').click();await page.waitForTimeout(50);await page.evaluate(()=>{go('dashboard');});
 await page.locator('[data-studio=review]').click();await page.locator('[name=wins]').fill('Đã hoàn thành kiểm thử');await page.locator('#editor-form button[type=submit]').click();assert.equal(await page.evaluate(()=>data.studio.reviews.length),1);
 await page.evaluate(()=>go('gantt','p1'));assert.equal(await page.locator('.studio-gantt-mobile').isVisible(),width<=900);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false,`page fits ${width}`);
 await page.locator('#search').fill('ghi chú');await page.waitForTimeout(400);assert.equal(await page.locator('.studio-search').isVisible(),true);assert.ok(await page.locator('mark').count()>0);

 await page.locator('#search').fill('');await page.evaluate(()=>{Studio.globalSearch=false;go('notes');noteForm(data.notes[0]);});await page.waitForTimeout(100);
 await page.locator('#studio-note-project').selectOption('p1');await page.locator('[data-studio=note-to-task]').click();await page.locator('[name=title]').fill('Task tạo từ ghi chú');await page.locator('#editor-form button[type=submit]').click();
 assert.equal(await page.evaluate(()=>project('p1').tasks.at(-1).noteIds[0]),'n1');assert.equal(await page.evaluate(()=>data.notes[0].projectId),'p1');
 await page.locator('.modal-close-pin').click();await page.waitForTimeout(30);await page.evaluate(()=>{go('tasks');});await page.locator('[data-studio=save-filter]').click();await page.locator('[name=name]').fill('Bộ lọc của tôi');await page.locator('#editor-form button[type=submit]').click();assert.equal(await page.locator('#studio-filter option').count(),2);
 await page.evaluate(()=>{const t=project('p1').tasks[0];t.col='Doing';t.recurrence='daily';studioSnapshot();t.col='Done';t.checks.forEach(c=>c.done=true);save();});const generated=await page.evaluate(()=>project('p1').tasks.filter(t=>t.id.startsWith('repeat-')));assert.equal(generated.length,1);assert.equal(generated[0].checks[0].done,false);await page.evaluate(()=>save());assert.equal(await page.evaluate(()=>project('p1').tasks.filter(t=>t.id.startsWith('repeat-')).length),1);
 await page.evaluate(()=>accountPanel());assert.equal(await page.locator('.studio-setting-group').count(),4);assert.equal(await page.locator('#studio-notifications #weekly-report-enabled').count(),1);assert.equal(await page.locator('#studio-data #sync-now').count(),1);assert.equal(await page.locator('#studio-session #sign-out').count(),1);
 await page.screenshot({path:root+`qa/settings-${width}.png`,fullPage:false});await page.keyboard.press('Escape');
 assert.deepEqual(errors,[],`interaction ${width}`);reports.push({width,height,flows:'dashboard, task save/comment/history, related notes, focus, checklist, bulk, calendar, template, weekly review, Gantt, search',errors});await context.close();
}
console.log('PASS: responsive browser flows',JSON.stringify(reports));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
