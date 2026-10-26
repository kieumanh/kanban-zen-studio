'use strict';
(function(){
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
 const search=document.querySelector('#search');
 if(!search)return;
 search.placeholder='Tìm dự án, công việc, ghi chú…';
 search.setAttribute('aria-label','Tìm dự án, công việc và ghi chú');
 const panel=document.createElement('section');panel.id='unified-note-results';panel.className='unified-note-results';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','Kết quả tìm kiếm ghi chú');
 document.querySelector('.top-actions')?.append(panel);
 function update(){
  const q=normalize(search.value.trim());if(!q){panel.hidden=true;return}
  const notes=(data.notes||[]).filter(n=>normalize([n.title,n.text,n.group,(n.keywords||[]).join(' '),(n.items||[]).map(i=>i.text).join(' ')].join(' ')).includes(q)).slice(0,12);
  panel.replaceChildren();if(!notes.length){panel.hidden=true;return}
  const header=document.createElement('div');header.className='unified-note-heading';header.textContent='Ghi chú phù hợp ('+notes.length+')';panel.append(header);
  for(const n of notes){const b=document.createElement('button');b.type='button';b.className='unified-note-hit';b.textContent='📝 '+(n.title||'Ghi chú')+' · '+(n.group||'Ghi chú');b.onclick=()=>{panel.hidden=true;noteForm(n)};panel.append(b)}
  panel.hidden=false;
 }
 search.addEventListener('input',update);search.addEventListener('focus',update);
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.top-actions'))panel.hidden=true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')panel.hidden=true});
})();