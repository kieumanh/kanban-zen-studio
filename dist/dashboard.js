'use strict';
let dashboardDueFilter='';
const dashboardRecentKey=()=>`zen-recent-projects:${currentUser?.id||'local'}`;
function dashboardRecentIds(){try{return JSON.parse(localStorage.getItem(dashboardRecentKey())||'[]').filter(x=>typeof x==='string');}catch{return [];}}
function rememberDashboardProject(){if(!['projects','calendar','gantt'].includes(view)||!active)return;const ids=dashboardRecentIds().filter(id=>id!==active);ids.unshift(active);try{localStorage.setItem(dashboardRecentKey(),JSON.stringify(ids.slice(0,12)));}catch{}}
function dashboardDeadline(t){return t.end?.slice(0,10)||t.due||'';}
function dashboardDateMatches(t,key){const due=dashboardDeadline(t),day=today(),open=t.col!=='Done';if(key==='today')return open&&(due===day||!!t.start&&t.start.slice(0,10)<=day&&(!t.end||t.end.slice(0,10)>=day));if(key==='overdue')return open&&!!due&&due<day;if(key==='upcoming'){const end=new Date(day+'T12:00:00');end.setDate(end.getDate()+7);return open&&!!due&&due>day&&due<=end.toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});}if(key==='doing')return t.col==='Doing';if(key==='attention')return dashboardDateMatches(t,'overdue')||dashboardDateMatches(t,'upcoming');return true;}
const dashboardFoundBefore=found;
found=function(t){return dashboardFoundBefore(t)&&(!(view==='tasks'&&dashboardDueFilter)||dashboardDateMatches(t,dashboardDueFilter));};
const dashboardTasksPageBefore=tasksPage;
tasksPage=function(){const html=dashboardTasksPageBefore();const options=[['','Tất cả thời hạn'],['today','Cần làm hôm nay'],['overdue','Quá hạn'],['upcoming','Sắp đến hạn · 7 ngày'],['doing','Đang thực hiện']];return html.replace('<div class="filter-row">','<div class="filter-row"><label class="dashboard-due-filter">Thời hạn<select id="dashboard-due-filter">'+options.map(([value,label])=>'<option value="'+value+'" '+(dashboardDueFilter===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label>');};
const dashboardDeadlineCopy='Ngày kết thúc đồng thời là hạn hoàn thành.';
const dashboardBaseTaskForm=taskForm;
taskForm=function(p,t,col='List'){
 dashboardBaseTaskForm(p,t,col);
 const body=$('#editor-body'),form=$('#editor-form');
 if(!body.querySelector('[name=title]'))return;
 const quick=false,titleField=body.querySelector('[name=title]')?.closest('.field');
 const intro=body.querySelector('.form-intro');
 if(quick&&titleField){
  if(intro)intro.textContent='Bắt đầu bằng tên việc. Bạn có thể bổ sung thông tin sau.';
  const options=document.createElement('details');options.className='task-create-options';options.innerHTML='<summary>Thông tin khác (không bắt buộc)</summary><div class="task-create-option-fields"></div>';
  const holder=options.querySelector('.task-create-option-fields');
  const sections=[...body.querySelectorAll(':scope>.zen-task-section')],titleSection=sections.find(section=>section.contains(titleField));
  if(titleSection){if(intro){intro.remove();titleSection.before(intro);}titleField.after(options);for(const section of sections){if(section===titleSection){for(const node of [...section.children])if(node!==titleField&&node!==options&&node.tagName!=='H3')holder.append(node);}else holder.append(section);}}
  else{let titleRoot=titleField;while(titleRoot.parentElement&&titleRoot.parentElement!==body)titleRoot=titleRoot.parentElement;[...body.children].forEach(node=>{if(node!==body.querySelector('h2')&&node!==intro&&node!==titleRoot)holder.append(node);});titleRoot.after(options);}
  if(view==='gantt')options.open=true;
 }
 const dateFields=body.querySelector('.schedule-date-fields');
 if(dateFields&&!dateFields.nextElementSibling?.classList.contains('task-date-rule'))dateFields.insertAdjacentHTML('afterend','<p class="help-copy task-date-rule">'+dashboardDeadlineCopy+'</p>');
 body.dataset.taskFormSnapshot=JSON.stringify([...new FormData(form).entries()]);
 body.classList.toggle('task-create-quick',quick);
 const dialog=$('#editor');dialog.dataset.taskForm='1';dialog.dataset.taskFormSnapshot=body.dataset.taskFormSnapshot;dialog.dataset.taskFormDiscard='';
};
// v1.19.14: chốt lại mốc "chưa đổi gì" sau khi toàn bộ form (kể cả checklist) đã dựng xong, để mở rồi bấm × không báo sai là có thay đổi.
function refreshTaskFormSnapshot(){const dialog=$('#editor'),body=$('#editor-body'),form=$('#editor-form');if(!dialog?.dataset.taskForm||!form||!body)return;const snapshot=JSON.stringify([...new FormData(form).entries()]);body.dataset.taskFormSnapshot=snapshot;dialog.dataset.taskFormSnapshot=snapshot;}
function taskFormDirty(){const dialog=$('#editor'),form=$('#editor-form');if(!dialog.dataset.taskForm||!form)return false;return JSON.stringify([...new FormData(form).entries()])!==dialog.dataset.taskFormSnapshot;}
function showTaskClosePrompt(){const body=$('#editor-body');let prompt=body.querySelector('.task-unsaved-confirm');if(prompt)return;body.insertAdjacentHTML('afterbegin','<aside class="task-unsaved-confirm" role="alertdialog" aria-label="Thay đổi chưa lưu"><strong>Bạn có thay đổi chưa lưu.</strong><span>Lưu, tiếp tục chỉnh sửa hoặc bỏ các thay đổi này.</span><div><button type="button" class="btn primary" data-task-save>Lưu</button><button type="button" class="btn" data-task-keep-editing>Tiếp tục chỉnh sửa</button><button type="button" class="btn danger" data-task-discard>Bỏ thay đổi</button></div></aside>');
 // v1.19.9: bảng nằm sticky ngay dưới tiêu đề của hộp thoại nên hiện đúng khung nhìn đang đọc (không ở đầu nội dung đã cuộn qua). Không kéo khung nhìn đi chỗ khác khi hiện.
 const dialog=$('#editor'),head=dialog.querySelector('.modal-head'),notice=body.querySelector('.task-unsaved-confirm');if(head&&notice)notice.style.setProperty('top',(head.getBoundingClientRect().bottom-dialog.getBoundingClientRect().top-dialog.clientTop+8)+'px','important');body.querySelector('[data-task-keep-editing]').focus({preventScroll:true});}
document.addEventListener('click',event=>{
 const close=event.target.closest('[data-action="close-modal"]');
 if(close&&taskFormDirty()&&!$('#editor').dataset.taskFormDiscard){event.preventDefault();event.stopImmediatePropagation();showTaskClosePrompt();return;}
 if(event.target.closest('[data-task-save]')){event.preventDefault();$('#editor-body .task-unsaved-confirm')?.remove();const form=$('#editor-form');if(form)form.requestSubmit();return;}
 if(event.target.closest('[data-task-keep-editing]')){$('#editor-body .task-unsaved-confirm')?.remove();return;}
 if(event.target.closest('[data-task-discard]')){$('#editor').dataset.taskFormDiscard='1';$('#editor').close();return;}
 const filter=event.target.closest('[data-dashboard-filter]');
 if(filter){event.preventDefault();dashboardDueFilter=filter.dataset.dashboardFilter;filterProject='';filterStatus='';filterPriority='';view='tasks';active=null;query='';$('#search').value='';render();}
},true);
document.addEventListener('change',event=>{if(event.target.id==='dashboard-due-filter'){dashboardDueFilter=event.target.value;render();}});
$('#editor').addEventListener('cancel',event=>{if(taskFormDirty()){event.preventDefault();showTaskClosePrompt();}});
$('#editor').addEventListener('close',()=>{$('#editor').dataset.taskForm='';$('#editor').dataset.taskFormDiscard='';$('#editor-body').classList.remove('task-create-quick');});
const dashboardTaskDetailBefore=taskDetail;
taskDetail=function(p,t){dashboardTaskDetailBefore(p,t);const state=$('#task-state');if(state){state.setAttribute('aria-label','Chuyển trạng thái công việc');state.title='Chọn trạng thái công việc';const label=document.createElement('label');label.className='task-state-control';label.innerHTML='<span>Trạng thái</span>';state.before(label);label.append(state);}};
const dashboardTaskCardBefore=taskCard;
taskCard=function(t,p){
 const template=document.createElement('template');template.innerHTML=dashboardTaskCardBefore(t,p).trim();
 const card=template.content.firstElementChild;if(!card)return '';
 card.classList.add('wf-task-card');
 if(globalThis.matchMedia?.('(max-width:700px)').matches){card.draggable=false;card.querySelectorAll('[data-wf-sort]').forEach(handle=>handle.draggable=false);}
 const pct=taskPct(t),checked=t.checks.filter(c=>c.done).length,total=t.checks.length,deadline=dashboardDeadline(t);
 const keywords=card.querySelector('.wf-card-keywords');
 if(keywords){const labels=[...keywords.querySelectorAll('.label-chip')];labels.slice(2).forEach(label=>label.remove());if(labels.length>2){const more=document.createElement('span');more.className='label-chip label-overflow';more.textContent='+'+(labels.length-2);keywords.append(more);}}
 card.querySelector('.wf-card-description')?.remove();
 const title=card.querySelector('h3');if(title){const due=document.createElement('div');due.className='task-card-decision';due.innerHTML=deadline?'<span class="task-card-deadline '+(deadline<today()&&t.col!=='Done'?'is-overdue':'')+'">'+(deadline<today()&&t.col!=='Done'?'Quá hạn · ':'Hạn · ')+esc(dateLabel(deadline))+'</span>':'<span class="task-card-deadline is-empty">Chưa đặt hạn</span>';title.after(due);}
 const next=t.checks.find(c=>!c.done);if(next){const step=document.createElement('p');step.className='task-next-step';step.innerHTML='<span>Bước tiếp theo</span>'+esc(next.text);title?.after(step);}
 const meta=card.querySelector('.progress-meta');if(meta){meta.classList.add('task-card-progress-meta');meta.innerHTML='<span>'+(total?checked+'/'+total+' mục checklist':'Chưa có checklist')+'</span><strong>'+pct+'%</strong>';}
 const progressBar=card.querySelector('[role="progressbar"]');if(progressBar){progressBar.setAttribute('aria-label',total?'Tiến độ checklist':'Tiến độ công việc');progressBar.setAttribute('title',total?checked+' trên '+total+' mục checklist đã hoàn thành':'Chưa có checklist; tiến độ dựa trên trạng thái công việc');}
 const nextColumn=p.columns[p.columns.indexOf(t.col)+1];if(nextColumn){const nextName=columnDisplayName(p,nextColumn);(card.querySelector('.task-card-decision')||card.querySelector('.wf-card-head'))?.insertAdjacentHTML('beforeend','<button type="button" class="btn task-next" data-next-task="'+esc(t.id)+'" data-next-project="'+esc(p.id)+'" aria-label="Chuyển sang '+esc(nextName)+'" title="Chuyển sang '+esc(nextName)+'">→</button>');}
 if(!total)card.classList.add('task-card-no-checks');
 const footer=card.querySelector('.task-footer');if(footer)footer.remove();
 return card.outerHTML;
};
function dashboardProjectMarkup(){
 const ids=dashboardRecentIds(),projects=visibleProjects().slice().sort((a,b)=>{const pin=Number(!!b.pinned)-Number(!!a.pinned);if(pin)return pin;const ai=ids.indexOf(a.id),bi=ids.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi);}).slice(0,4);
 return '<section class="dashboard-projects"><div class="section-head"><h2>Dự án đang làm hoặc vừa mở</h2><button type="button" class="text-btn" data-view="projects">Tất cả dự án →</button></div><div class="project-grid">'+(projects.map(projectCard).join('')||'<p class="empty">Chưa có dự án. Bắt đầu với nút “Tạo dự án”.</p>')+'</div></section>';
}
dashboard=function(){
 const tasks=allTasks(),done=tasks.filter(t=>t.col==='Done').length,doing=tasks.filter(t=>t.col==='Doing').length,pr=progress(tasks),projects=visibleProjects();
 const recent=dashboardProjectMarkup();
 const rows=projects.slice().sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)).slice(0,5).map(p=>{const x=progress(p.tasks);return '<button type="button" class="dashboard-progress-row" data-project="'+esc(p.id)+'"><span><strong>'+esc(p.name)+'</strong><b>'+x.pct+'%</b></span>'+bar(x.pct,p.color)+'<small>'+x.done+'/'+x.total+' đơn vị hoàn thành</small></button>';}).join('');
 return healthPanel()+heading('MỖI NGÀY, MỘT BƯỚC TIẾN','Chào một ngày đầy cảm hứng <span class="orange">✳</span>','Mọi dự án, mọi ý tưởng. Cùng nhau, từng bước thành hình.',`<button class="btn primary" data-action="new-project"><span class="btn-icon">+</span> Tạo dự án</button>`)+recent+
  '<section class="stats" aria-label="Thống kê công việc">'+stat('Tổng dự án',projects.length,'Những dự án đang hoạt động','▤')+stat('Đang thực hiện',doing,'Tập trung vào việc đang làm','◴')+stat('Đã hoàn thành',done,'Mỗi việc xong, một niềm vui','✓')+stat('Tiến độ tổng thể',pr.pct+'%','Việc và mục checklist, tính theo từng đơn vị','↗')+'</section>'+
  '<section class="dashboard-overview"><div class="dashboard-overview-chart">'+workChart()+'</div><section class="panel dashboard-progress"><div class="section-head"><h2>Tiến độ theo dự án</h2><button type="button" class="text-btn" data-stat-detail="progress">Xem tổng hợp →</button></div><div class="dashboard-progress-list">'+(rows||'<p class="empty">Chưa có dữ liệu dự án.</p>')+'</div><details class="progress-explanation"><summary>Cách tính tiến độ</summary><p>Mỗi công việc và mỗi mục checklist được tính là một đơn vị ngang nhau. Tiến độ công việc dựa trên checklist; nếu chưa có checklist, dựa trên trạng thái hoàn thành.</p></details></section></section>';
};
const dashboardRenderBefore=render;
render=function(){rememberDashboardProject();dashboardRenderBefore();if(view==='dashboard'){
 const main=$('#main'),plan=main.querySelector('.wf-today-plan'),headingNode=main.querySelector('.page-heading');
 if(plan&&headingNode)headingNode.after(plan);
 main.querySelector('.version-preview')?.remove();
 }};
function refreshDashboardPlan(){
 const section=$('.wf-today-plan');if(!section)return;
 const tasks=allTasks().filter(t=>t.col!=='Done'&&!t.archived),day=today(),soonEnd=new Date(day+'T12:00:00');soonEnd.setDate(soonEnd.getDate()+7);const end=soonEnd.toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
 const todayTasks=tasks.filter(t=>dashboardDateMatches(t,'today'));
 const late=tasks.filter(t=>dashboardDateMatches(t,'overdue')).sort((a,b)=>dashboardDeadline(a).localeCompare(dashboardDeadline(b)));
 const upcoming=tasks.filter(t=>dashboardDateMatches(t,'upcoming')).sort((a,b)=>dashboardDeadline(a).localeCompare(dashboardDeadline(b)));
 const doing=tasks.filter(t=>t.col==='Doing');
 const lists=[
  {title:'Cần làm hôm nay',items:todayTasks,filter:'today',button:'Xem việc hôm nay'},
  {title:'Quá hạn & sắp đến hạn',items:[...late,...upcoming],parts:[['Quá hạn',late],['Sắp đến hạn · 7 ngày',upcoming]],filter:'attention',button:'Xem danh sách'},
  {title:'Đang thực hiện',items:doing,filter:'doing',button:'Xem việc đang làm'}
 ];
 section.setAttribute('aria-label','Việc cần ưu tiên');
 section.innerHTML=lists.map(group=>'<article class="panel"><h2>'+group.title+' <small>'+group.items.length+' việc</small></h2>'+(group.parts?group.parts.map(([title,items])=>'<div class="dashboard-plan-part"><h3>'+title+' <small>'+items.length+'</small></h3>'+(workTaskList(items,3)||'<p class="subtext">Không có công việc cần chú ý.</p>')+'<button type="button" class="text-btn" data-dashboard-filter="'+(title==='Quá hạn'?'overdue':'upcoming')+'">Mở danh sách '+title.toLocaleLowerCase('vi')+' →</button></div>').join(''):((workTaskList(group.items,4)||'<p class="subtext">Không có công việc trong nhóm này.</p>')+'<button type="button" class="text-btn" data-dashboard-filter="'+group.filter+'">'+group.button+' →</button>'))+'</article>').join('');
}
const dashboardPlanRenderBefore=render;
render=function(){dashboardPlanRenderBefore();if(view==='dashboard')refreshDashboardPlan();};

