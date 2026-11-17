'use strict';
const navigationBaseRender=render;
const navigationBaseGantt=ganttPage;
const navigationViews=new Set(['calendar','gantt']);
const navigationViewNames={calendar:'Lịch',gantt:'Gantt'};
function navigationScopeMarkup(){
 const selected=filterProject||'';
 return '<div class="workspace-scope"><label for="navigation-scope"><span>Phạm vi dự án</span><select id="navigation-scope" aria-label="Phạm vi dự án"><option value="" '+(!selected?'selected':'')+'>Tất cả dự án</option>'+visibleProjects().map(p=>'<option value="'+esc(p.id)+'" '+(selected===p.id?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></label></div>';
}
ganttPage=function(){
 if(view!=='gantt'||filterProject)return navigationBaseGantt();
 const previous=active,projects=visibleProjects();
 if(!projects.length)return navigationBaseGantt();
 const output=projects.map((p,index)=>{
  active=p.id;
  const title=heading('TIẾN TRÌNH DỰ ÁN','Gantt',esc(p.name));
  return navigationBaseGantt().replace(title,'<section class="scope-gantt-project" aria-label="Gantt · '+esc(p.name)+'"><h2>'+esc(p.name)+'</h2>')
   .replaceAll('id="gantt-live"','id="gantt-live-'+index+'"')
   .replaceAll('id="gantt-arrow"','id="gantt-arrow-'+index+'"')
   .replaceAll('#gantt-arrow','#gantt-arrow-'+index);
 }).join('');
 active=previous;
 return '<div class="scope-gantt-all">'+output+'</div>';
};
function decorateNavigationScope(){
 if(!navigationViews.has(view))return;
 const scope=filterProject&&project(filterProject)?project(filterProject).name:'Tất cả dự án';
 $('#crumb').textContent=navigationViewNames[view]+' · '+scope;
 const headingNode=$('#main .page-heading');
 if(headingNode){
  headingNode.querySelector('h1')?.setAttribute('data-navigation-view-title',navigationViewNames[view]);
  if(!$('#main #navigation-scope'))headingNode.insertAdjacentHTML('afterend',navigationScopeMarkup());
  return;
 }
 if(view==='gantt'&&!$('#main #navigation-scope'))$('#main').insertAdjacentHTML('afterbegin',navigationScopeMarkup());
}
render=function(){navigationBaseRender();decorateNavigationScope();};
document.addEventListener('change',event=>{
 if(event.target.id!=='navigation-scope')return;
 filterProject=event.target.value;
 active=filterProject||null;
 if(view==='gantt'){
  ganttStart='';
  if(!active)active=visibleProjects()[0]?.id||null;
 }
 render();
});

// v1.25.0: nhóm menu bên trái. Chỉ sắp xếp lại các nút sẵn có (giữ nguyên data-view, không tạo mục mới).
// v2.40.0 (Menu Gọn): mục ít dùng nằm trong nhóm "Kho" thu gọn: Tài nguyên, Lưu trữ, Thùng rác, Phiên bản (trước đó "Thêm" chỉ có Lưu trữ
// và Thùng rác, còn Tài nguyên và Phiên bản đứng riêng). Menu chính còn 8 mục; nhóm tự mở khi đang ở một trong bốn trang đó.
const NAV_MORE_VIEWS=['resources','archive','trash','versions'];
function navGroupLabel(key,text){const el=document.createElement('div');el.className='navlabel nav-group-label';el.dataset.navLabel=key;el.textContent=text;return el;}
function arrangeNavGroups(){
 const nav=document.querySelector('.sidebar nav');
 if(!nav)return;
 const place=(key,text,anchor)=>{if(anchor&&!nav.querySelector(':scope>[data-nav-label='+key+']'))anchor.before(navGroupLabel(key,text));};
 place('work','Làm việc',nav.querySelector(':scope>[data-view=dashboard]'));
 place('ideas','Ý tưởng',nav.querySelector(':scope>[data-view=notes]'));
 const buttons=NAV_MORE_VIEWS.map(v=>document.querySelector('.sidebar [data-view='+v+']')).filter(Boolean);
 let more=nav.querySelector(':scope>details.nav-more');
 if(!more&&buttons.length){
  more=document.createElement('details');
  more.className='nav-more';
  more.innerHTML='<summary class="nav-more-summary">Kho</summary>';
  nav.append(more);
 }
 if(!more)return;
 if(buttons.some((b,i)=>more.children[i+1]!==b))for(const b of buttons)more.append(b);
 if(NAV_MORE_VIEWS.includes(view))more.open=true;
}
const navGroupsBeforeRender=render;
render=function(){navGroupsBeforeRender();arrangeNavGroups();};
