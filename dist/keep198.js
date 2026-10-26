'use strict';
/* Keep-inspired note interactions, released as v1.9.8. */
const ZEN_PALETTE={
 leaves:['#e8f1dc','#72a77e','#bed0a1'],
 forest:['#e6eee0','#648b74','#a8c6a6'],
 lotus:['#f8e7ea','#bb7eac','#e7b9ce'],
 meditation:['#e8e4f7','#8e80bd','#c3b4df'],
 awareness:['#f5eadb','#b99761','#e7ca91'],
 yoga:['#e8e8f7','#8785bb','#b8b3dc'],
 awakening:['#fff0d9','#dba36a','#efc681'],
 stream:['#e0f0eb','#74a8b6','#add5c8']
};
function zenPattern(id){
 const p=ZEN_PALETTE[id];if(!p)return '';
 const bg=p[0],ink=p[1],soft=p[2];
 const leaf='<path d="M8 325Q80 180 230 125Q390 56 688 0" fill="none" stroke="'+ink+'" stroke-width="9" opacity=".30"/><path d="M55 265Q145 170 240 219Q187 317 55 265Z M200 154Q280 60 385 112Q320 210 200 154Z M395 100Q493 20 572 75Q533 155 395 100Z M325 335Q420 230 535 280Q460 370 325 335Z" fill="'+soft+'" opacity=".60"/>';
 const trees=Array.from({length:7},(_,i)=>'<g transform="translate('+(i*104-10)+' '+(i%2*30)+')"><path d="M46 385V202" stroke="'+ink+'" stroke-width="7" opacity=".30"/><path d="M-10 223Q-24 92 46 89Q113 84 113 218Q60 250-10 223Z" fill="'+soft+'" opacity=".64"/></g>').join('');
 const petals=Array.from({length:9},(_,i)=>'<ellipse cx="340" cy="280" rx="34" ry="100" transform="rotate('+((i-4)*19)+' 340 330)" fill="'+(i%2?soft:ink)+'" opacity=".45"/>').join('');
 const star=Array.from({length:16},(_,i)=>{const x=(i*89+43)%680,y=(i*47+22)%420;return '<path d="M'+x+' '+(y-7)+'V'+(y+7)+'M'+(x-7)+' '+y+'H'+(x+7)+'" stroke="'+ink+'" stroke-width="2" opacity=".32"/>';}).join('');
 const scenes={
 leaves:leaf,
 forest:'<path d="M0 335Q180 230 360 300T680 240V420H0Z" fill="'+soft+'" opacity=".50"/>'+trees,
 lotus:'<path d="M0 360Q170 309 350 358T680 355M0 387Q140 328 340 380T680 382" stroke="'+ink+'" stroke-width="4" opacity=".23" fill="none"/>'+petals,
 meditation:'<circle cx="340" cy="167" r="124" fill="'+soft+'" opacity=".54"/><circle cx="340" cy="165" r="26" fill="'+ink+'" opacity=".47"/><path d="M310 202Q343 194 375 211L393 284Q330 306 284 277Z" fill="'+ink+'" opacity=".42"/><path d="M303 269Q236 296 189 330Q345 405 496 329Q429 289 369 264" fill="'+ink+'" opacity=".34"/><path d="M60 385Q330 275 620 380" stroke="'+soft+'" stroke-width="32" opacity=".62" fill="none"/>',
 awareness:'<circle cx="340" cy="204" r="143" fill="'+soft+'" opacity=".43"/><circle cx="340" cy="204" r="112" fill="none" stroke="'+ink+'" stroke-width="5" opacity=".26"/><circle cx="340" cy="204" r="77" fill="none" stroke="'+ink+'" stroke-width="4" opacity=".24"/><path d="M235 204Q340 92 448 204Q340 315 235 204Z" fill="'+ink+'" opacity=".21"/><circle cx="340" cy="204" r="30" fill="'+ink+'" opacity=".43"/>'+star,
 yoga:'<circle cx="340" cy="166" r="127" fill="'+soft+'" opacity=".45"/><path d="M340 126V233M340 183L269 237M340 183L412 237M340 233L279 313M340 233L410 311" stroke="'+ink+'" stroke-width="18" stroke-linecap="round" opacity=".44"/><circle cx="340" cy="96" r="26" fill="'+ink+'" opacity=".43"/><path d="M30 364Q320 255 655 357" stroke="'+soft+'" stroke-width="30" opacity=".54" fill="none"/>',
 awakening:'<circle cx="441" cy="219" r="113" fill="'+soft+'" opacity=".75"/>'+Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return '<path d="M'+(441+123*Math.cos(a))+' '+(219+123*Math.sin(a))+'L'+(441+184*Math.cos(a))+' '+(219+184*Math.sin(a))+'" stroke="'+ink+'" stroke-width="5" opacity=".35"/>';}).join('')+'<path d="M0 345Q165 248 330 328T680 288V420H0Z" fill="'+ink+'" opacity=".19"/>',
 stream:'<path d="M0 310L142 150L255 290L398 91L560 282L680 230V420H0Z" fill="'+soft+'" opacity=".55"/><path d="M-20 374Q173 270 307 353T700 310" stroke="'+ink+'" stroke-width="48" opacity=".30" fill="none"/><path d="M-20 374Q173 270 307 353T700 310" stroke="white" stroke-width="10" opacity=".35" fill="none"/>'
 };
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 420" preserveAspectRatio="xMidYMid slice"><rect width="680" height="420" fill="'+bg+'"/><circle cx="70" cy="44" r="214" fill="white" opacity=".43"/>'+scenes[id]+'</svg>';
}
function zenArt(element,motif){
 if(!element)return;const svg=zenPattern(motif);
 element.dataset.zenArt=svg?motif:'none';
 if(svg)element.style.setProperty('--zen-art','url("data:image/svg+xml,'+encodeURIComponent(svg)+'")');
 else element.style.removeProperty('--zen-art');
 element.querySelector(':scope > .note-ornament')?.remove();
}
function zenURL(s){try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u:null;}catch{return null;}}
function zenPreviewLink(n){
 const url=zenURL(n.url);if(!url)return null;
 const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.className='zen-link-card';
 const cover=document.createElement('div');cover.className='zen-link-cover';
 const image=(n.images||[])[0];
 if(image&&/^[a-zA-Z0-9_-]{1,100}$/.test(image)){const img=document.createElement('img');img.src=fileURL(image);img.alt='Ảnh minh họa liên kết';img.loading='lazy';cover.append(img);}
 else{cover.innerHTML='<span class="zen-browser-illustration" aria-hidden="true"><i></i><i></i><i></i></span>';}
 const info=document.createElement('div');info.className='zen-link-info';
 const name=document.createElement('strong');name.textContent=n.title||url.hostname;
 const domain=document.createElement('small');domain.textContent=url.hostname;
 info.append(name,domain);link.append(cover,info);return link;
}
function zenPinButton(n,inEditor){
 const b=document.createElement('button');b.type='button';b.className=inEditor?'zen-editor-pin':'zen-card-pin';
 b.dataset.zenPin=n.id||'';b.setAttribute('aria-pressed',String(!!n.pinned));b.title=n.pinned?'Bỏ ghim':'Ghim ghi chú';
 b.setAttribute('aria-label',b.title);b.textContent=n.pinned?'▣':'♧';return b;
}
function zenApplyNoteCards(){
 if(view!=='notes')return;const grid=document.querySelector('#main .keep-grid');if(!grid)return;
 const cards=[...grid.querySelectorAll(':scope > .keep-card[data-note-id]')];
 for(const card of cards){
  const note=data.notes?.find(n=>n.id===card.dataset.noteId);if(!note)continue;
  if(!contentReadOnly)card.prepend(zenPinButton(note,false));
  zenArt(card,noteMotif(note));
  if(note.url){
   const old=[...card.querySelectorAll('a[target="_blank"]')].filter(x=>x.href===zenURL(note.url)?.href);
   old.forEach(x=>x.hidden=true);
   const tile=zenPreviewLink(note),actions=card.querySelector('.keep-actions');
   if(tile){if(actions)actions.before(tile);else card.append(tile);}
  }
  if(note.type==='todo'&&note.images?.length){
   const block=document.createElement('div');block.className='note-inline-images';
   for(const id of note.images.slice(0,12)){if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))continue;const img=document.createElement('img');img.src=fileURL(id);img.alt='Ảnh trong checklist';img.loading='lazy';block.append(img);}
   const actions=card.querySelector('.keep-actions');if(actions)actions.before(block);else card.append(block);
  }
 }
 const pinned=cards.filter(c=>data.notes?.find(n=>n.id===c.dataset.noteId)?.pinned);
 if(!pinned.length)return;
 const others=cards.filter(c=>!pinned.includes(c));grid.classList.add('zen-notes-grouped');
 function section(name,items){if(!items.length)return;const wrap=document.createElement('section');wrap.className='zen-notes-section';const title=document.createElement('h2');title.className='zen-notes-caption';title.textContent=name;const cardsGrid=document.createElement('div');cardsGrid.className='zen-notes-grid';items.forEach(c=>cardsGrid.append(c));wrap.append(title,cardsGrid);grid.append(wrap);}
 section('GHIM',pinned);section('GHI CHÚ KHÁC',others);
}
function zenFormattedHTML(text){
 function inline(s){return esc(s).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/__([^_\n]+)__/g,'<u>$1</u>').replace(/~~([^~\n]+)~~/g,'<s>$1</s>').replace(/(^|[^\*])\*([^*\n]+)\*(?!\*)/g,'$1<em>$2</em>');}
 return String(text||'').split(/\r?\n/).map(line=>{const h=line.match(/^(#{1,3})\s+(.+)/);if(h)return '<h'+h[1].length+'>'+inline(h[2])+'</h'+h[1].length+'>';return line.trim()?'<p>'+inline(line)+'</p>':'<div class="zen-blank-line"></div>';}).join('');
}
const zenOldContent=noteContent;
noteContent=function(n){
 let html=zenOldContent(n);if(['todo','table','color'].includes(n.type))return html;
 const old='<p>'+esc(n.text).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')+'</p>';
 if(html.includes(old))html=html.replace(old,'<div class="zen-formatted">'+zenFormattedHTML(n.text)+'</div>');
 return html;
};
const zenOldExtra=noteExtraValues;
noteExtraValues=function(form,n){
 const obj=zenOldExtra(form,n);if(obj===false)return false;
 const p=form.querySelector('[name=zen-pinned]');
 return {...obj,pinned:p?p.value==='true':!!n?.pinned};
};
const zenOldForm=noteForm;
noteForm=function(note){
 zenOldForm(note);if(contentReadOnly)return;
 const editor=document.querySelector('#editor.keep-editor'),composer=editor?.querySelector('.note-composer');if(!composer)return;
 const title=composer.querySelector('[name=title]'),text=composer.querySelector('textarea[name=text]');
 if(title){
  const p=document.createElement('input');p.type='hidden';p.name='zen-pinned';p.value=String(!!note?.pinned);title.after(p);
  const b=zenPinButton(note||{},true);title.after(b);
  b.onclick=()=>{const prev=p.value;p.value=String(prev!=='true');
   if(editor.noteCommit?.()!==true){p.value=prev;return;}
   b.setAttribute('aria-pressed',p.value);b.title=p.value==='true'?'Bỏ ghim':'Ghim ghi chú';b.setAttribute('aria-label',b.title);b.textContent=p.value==='true'?'▣':'♧';render();
  };
 }
 const draw=()=>zenArt(composer,composer.querySelector('[name=note-motif]')?.value||'none');
 draw();composer.querySelectorAll('[data-note-motif]').forEach(b=>b.addEventListener('click',()=>requestAnimationFrame(draw)));
 const url=composer.querySelector('[name=url]');
 if(url){
  const preview=document.createElement('div');preview.className='zen-link-live';url.closest('.note-links')?.after(preview);
  function paint(){preview.replaceChildren();const node=zenPreviewLink({url:url.value,title:title?.value||'',images:note?.images||[]});if(node)preview.append(node);}
  url.addEventListener('input',paint);title?.addEventListener('input',paint);paint();
 }
 if(text){
  const tools=document.createElement('div');tools.className='zen-format-tools';tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Định dạng văn bản ghi chú');
  for(const [label,cmd,title] of [['H1','h1','Tiêu đề lớn'],['H2','h2','Tiêu đề vừa'],['Aa','plain','Văn bản thường'],['B','bold','In đậm'],['I','italic','In nghiêng'],['U','underline','Gạch dưới'],['S̶','strike','Gạch ngang']]){
   const b=document.createElement('button');b.type='button';b.dataset.zenFormat=cmd;b.title=title;b.setAttribute('aria-label',title);b.textContent=label;tools.append(b);
  }
  const help=document.createElement('small');help.className='zen-format-help';help.textContent='Chọn một đoạn để định dạng. Xem trước ngay bên dưới.';
  const preview=document.createElement('div');preview.className='zen-format-preview';
  text.before(tools);text.after(help,preview);
  function paint(){preview.innerHTML=zenFormattedHTML(text.value);}text.addEventListener('input',paint);paint();
  tools.addEventListener('click',event=>{
   const btn=event.target.closest('[data-zen-format]');if(!btn)return;
   const action=btn.dataset.zenFormat,start=text.selectionStart,end=text.selectionEnd,selected=text.value.slice(start,end);
   const pairs={bold:'**',italic:'*',underline:'__',strike:'~~'};let replace=selected||'Nội dung';
   if(pairs[action])replace=pairs[action]+replace+pairs[action];
   else if(action==='h1'||action==='h2')replace=(start&&text.value[start-1]!=='\n'?'\n':'')+(action==='h1'?'# ':'## ')+replace;
   else if(action==='plain')replace=replace.replace(/^#{1,3}\s+/,'').replace(/\*\*|__|~~|\*/g,'');
   text.focus();text.setRangeText(replace,start,end,'select');text.dispatchEvent(new Event('input',{bubbles:true}));
  });
 }
};
const zenOldRender=render;
render=function(){zenOldRender();zenApplyNoteCards();};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-zen-pin]');if(!b||b.classList.contains('zen-editor-pin'))return;
 e.preventDefault();e.stopImmediatePropagation();if(contentReadOnly)return;
 const note=data.notes?.find(n=>n.id===b.dataset.zenPin);if(!note)return;
 note.pinned=!note.pinned;if(!save()){note.pinned=!note.pinned;return;}render();
},true);
