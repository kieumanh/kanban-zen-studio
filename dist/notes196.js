'use strict';
/* v1.9.9 — unobtrusive, anchored, cross-workspace search. */
(function(){
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim();
 const search=document.querySelector('#search');if(!search)return;
 search.placeholder='Tìm dự án, ghi chú, tệp…';
 search.setAttribute('aria-label','Tìm dự án, công việc, ghi chú, checklist và tên tệp');
 search.setAttribute('aria-controls','unified-note-results');
 search.setAttribute('aria-expanded','false');
 const panel=document.createElement('section');panel.id='unified-note-results';
 panel.className='unified-note-results zen-search-popover';
 panel.hidden=true;panel.setAttribute('role','region');
 panel.setAttribute('aria-label','Kết quả tìm kiếm');
 document.body.append(panel);
 let token=0,timer,opened=false;
 function place(){
  const rect=search.closest('.search')?.getBoundingClientRect()||search.getBoundingClientRect();
  const width=Math.min(440,Math.max(290,window.innerWidth-24));
  const left=Math.max(12,Math.min(window.innerWidth-width-12,rect.right-width));
  const top=Math.min(window.innerHeight-190,rect.bottom+10);
  panel.style.left=left+'px';panel.style.top=Math.max(12,top)+'px';panel.style.width=width+'px';
 }
 function close(){opened=false;panel.hidden=true;search.setAttribute('aria-expanded','false');token++;}
 function open(){opened=true;place();panel.hidden=false;search.setAttribute('aria-expanded','true');}
 function header(q){const h=document.createElement('div');h.className='zen-search-header';
  const title=document.createElement('div');const strong=document.createElement('strong');strong.textContent='Kết quả tìm kiếm';
  const small=document.createElement('small');small.textContent='“'+q.slice(0,70)+'” · Dữ liệu trong tài khoản';
  title.append(strong,small);
  const x=document.createElement('button');x.className='zen-search-close';x.type='button';x.textContent='×';x.setAttribute('aria-label','Đóng kết quả tìm kiếm');x.onclick=close;
  h.append(title,x);panel.append(h);
 }
 function group(label,icon,items,onSelect){
  if(!items.length)return;
  const section=document.createElement('div');section.className='zen-search-group';
  const h=document.createElement('h3');h.className='zen-search-group-label';h.textContent=label;
  const count=document.createElement('span');count.textContent=String(items.length);h.append(count);section.append(h);
  for(const item of items){
   const button=document.createElement('button');button.type='button';button.className='unified-note-hit';
   const badge=document.createElement('span');badge.className='zen-search-kind';badge.textContent=item.icon||icon;badge.setAttribute('aria-hidden','true');
   const body=document.createElement('span');body.className='zen-search-copy';
   const title=document.createElement('strong');title.textContent=item.title||'Không có tiêu đề';
   const sub=document.createElement('small');sub.textContent=item.subtitle||label;
   body.append(title,sub);button.append(badge,body);
   button.onclick=()=>{close();onSelect(item);};section.append(button);
  }
  panel.append(section);
 }
 function noResults(){const p=document.createElement('p');p.className='zen-search-empty';p.textContent='Không tìm thấy mục phù hợp. Bạn có thể thử từ khóa ngắn hơn.';panel.append(p);}
 async function find(){
  const q=search.value.trim(),needle=norm(q),seq=++token;
  if(!needle||!currentUser){close();return;}
  panel.replaceChildren();header(q);open();
  const projects=(data.projects||[]).filter(p=>norm([p.name,p.description,p.keywords?.join(' '),p.tags?.join(' ')].join(' ')).includes(needle)).slice(0,3).map(p=>({title:p.name,subtitle:'Dự án',object:p}));
  const tasks=(data.projects||[]).flatMap(p=>(p.tasks||[]).filter(t=>norm([t.title,t.description,t.tags?.join(' '),(t.checks||[]).map(c=>c.text).join(' ')].join(' ')).map(t=>({title:t.title,subtitle:p.name,object:t,project:p}))).slice(0,4);
  const notes=(data.notes||[]).filter(n=>norm([n.title,n.text,n.url,n.group,n.keywords?.join(' '),(n.items||[]).map(i=>i.text).join(' ')].join(' ')).includes(needle)).slice(0,5).map(n=>({title:n.title||'Ghi chú',subtitle:n.type==='todo'?'Checklist':n.group||'Ghi chú',object:n}));
  group('Dự án','▦',projects,item=>go('projects',item.object.id));
  group('Công việc','☑',tasks,item=>{go('projects',item.project.id);taskDetail(item.project,item.object);});
  group('Ghi chú & checklist','▤',notes,item=>noteForm(item.object));
  const loading=document.createElement('div');loading.className='zen-search-loading';
  loading.textContent='Đang kiểm tra tên tệp trong Tài nguyên…';panel.append(loading);
  try{
   const response=await requestAPI('resources?'+new URLSearchParams({q,offset:'0',kind:'all'}));
   if(seq!==token||!opened||norm(search.value.trim())!==needle)return;
   loading.remove();
   const files=(response.files||[]).slice(0,6).map(f=>({
    icon:f.kind==='image'?'▧':f.kind==='audio'?'♫':f.kind==='video'?'▷':'◫',
    title:f.name,subtitle:f.scope.startsWith('note:')?'Tệp trong ghi chú':'Tệp trong dự án',object:f
   }));
   group('Tệp & hình ảnh','◫',files,item=>{
     go('resources');
     if(typeof resourceState!=='undefined'){
       resourceState.search=item.object.name;resourceState.offset=0;resourceState.key='';
       if(typeof loadResources==='function')loadResources(true);
     }
   });
   if(!projects.length&&!tasks.length&&!notes.length&&!files.length)noResults();
  }catch(err){
   if(seq!==token||!opened)return;
   loading.textContent='Không thể tải danh sách tệp. Kết quả ghi chú và dự án vẫn có thể sử dụng.';
  }
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(find,220);}
 search.addEventListener('input',schedule);
 search.addEventListener('focus',()=>{if(search.value.trim())schedule();});
 document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&!search.closest('.search')?.contains(e.target))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){e.stopPropagation();close();}});
 window.addEventListener('resize',()=>{if(opened)place();});
 window.addEventListener('scroll',()=>{if(opened)place();},true);
})();
