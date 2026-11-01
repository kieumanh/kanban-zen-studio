'use strict';
const navigationBaseRender=render;
const navigationBaseGantt=ganttPage;
const navigationViews=new Set(['timeline','calendar','gantt']);
const navigationViewNames={timeline:'Dòng thời gian',calendar:'Lịch',gantt:'Gantt'};
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
