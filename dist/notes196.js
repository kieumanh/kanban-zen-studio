'use strict';
/* Unified search v1.9.8: projects, tasks, note/checklist content and account-private R2/legacy files. */
(function(){
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim();
 const search=document.querySelector('#search');if(!search)return;
 search.placeholder='Tìm mọi dự án, ghi chú, tệp…';
 search.setAttribute('aria-label','Tìm dự án, công việc, ghi chú, checklist và tệp tải lên');
 search.setAttribute('aria-expanded','false');
 search.setAttribute('aria-controls','unified-note-results');
 const panel=document.createElement('section');panel.id='unified-note-results';panel.className='unified-note-results';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','Kết quả tìm kiếm toàn không gian');
 document.querySelector('.top-actions')?.append(panel);
 let timer,serial=0,focus=false;
 function hide(){panel.hidden=true;search.setAttribute('aria-expanded','false');}
 function show(){panel.hidden=false;search.setAttribute('aria-expanded','true');}
 function addGroup(label,items,action){
  if(!items.length)return;
  const head=document.createElement('div');head.className='unified-note-heading';head.textContent=label+' ('+items.length+')';panel.append(head);
  for(const item of items){
   const btn=document.createElement('button');btn.type='button';btn.className='unified-note-hit';
   const symbol=document.createElement('span');symbol.className='zen-search-kind';symbol.textContent=item.icon;
   const body=document.createElement('span');body.className='zen-search-copy';
   const title=document.createElement('strong');title.textContent=item.title;
   const desc=document.createElement('small');desc.textContent=item.subtitle||'';
   body.append(title,desc);btn.append(symbol,body);btn.onclick=()=>{hide();action(item);};panel.append(btn);
  }
 }
 async function update(){
  const searchText=search.value.trim(),q=norm(searchText),token=++serial;
  if(!q||!currentUser){hide();return;}
  panel.replaceChildren();
  const projects=(data.projects||[]).filter(p=>norm([p.name,p.description,(p.keywords||[]).join(' '),(p.tags||[]).join(' ')].join(' ')).includes(q)).slice(0,8).map(p=>({icon:'▦',title:p.name,subtitle:'Dự án',object:p}));
  const tasks=(data.projects||[]).flatMap(p=>(p.tasks||[]).filter(t=>norm([t.title,t.description,(t.tags||[]).join(' '),(t.checks||[]).map(c=>c.text).join(' ')].join(' ')).includes(q)).map(t=>({icon:'☑',title:t.title,subtitle:p.name,object:t,project:p}))).slice(0,10);
  const notes=(data.notes||[]).filter(n=>norm([n.title,n.text,n.url,n.group,(n.keywords||[]).join(' '),(n.items||[]).map(i=>i.text).join(' ')].join(' ')).includes(q)).slice(0,12).map(n=>({icon:n.type==='todo'?'☑':'▤',title:n.title||'Ghi chú',subtitle:n.group||'Ghi chú',object:n}));
  addGroup('Dự án',projects,item=>go('projects',item.object.id));
  addGroup('Công việc',tasks,item=>{go('projects',item.project.id);taskDetail(item.project,item.object);});
  addGroup('Ghi chú và checklist',notes,item=>noteForm(item.object));
  show();
  const loading=document.createElement('p');loading.className='zen-search-pending';loading.textContent='Đang tìm tệp đã tải lên…';panel.append(loading);
  try{
   const response=await requestAPI('resources?'+new URLSearchParams({q:searchText,offset:'0',kind:'all'}));
   if(token!==serial||!focus||norm(search.value)!==q)return;
   loading.remove();
   const files=(response.files||[]).slice(0,20).map(f=>({icon:f.kind==='image'?'▧':f.kind==='audio'?'♫':f.kind==='video'?'▷':'▤',title:f.name,subtitle:f.scope.startsWith('note:')?'Tệp trong ghi chú':'Tệp trong dự án',object:f}));
   addGroup('Tệp và tài nguyên',files,item=>{
    go('resources');query=item.object.name;search.value=item.object.name;
    if(typeof resourceState!=='undefined'){resourceState.offset=0;resourceState.key='';}
    render();
   });
   if(!projects.length&&!tasks.length&&!notes.length&&!files.length){const empty=document.createElement('p');empty.className='zen-search-empty';empty.textContent='Không thấy dữ liệu phù hợp trong tài khoản.';panel.append(empty);}
  }catch(error){
   if(token!==serial||!focus)return;loading.textContent='Chưa tìm được tệp: '+error.message;
  }
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(update,230);}
 search.addEventListener('input',()=>{focus=true;schedule();});
 search.addEventListener('focus',()=>{focus=true;schedule();});
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.top-actions')){focus=false;serial++;hide();}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){focus=false;serial++;hide();}});
})();
