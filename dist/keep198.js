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
/* Delicate illustrated themes. Art remains self-contained and privacy-safe (no network images). */
function zenPattern(id){
 const extra={creative:['#fff0e6','#b97870','#ecc2a1'],rest:['#e9e8f6','#807da8','#bbb9da'],travel:['#e5f1f3','#5f929e','#a7cfcd'],freelancer:['#eeebf5','#8573a3','#c4b6dc'],farm:['#edf3df','#668653','#c1d18c'],family:['#f8e9e2','#ae786b','#e8b6a2'],finance:['#e7f1ed','#4e8775','#b0d2bc']};const palette=ZEN_PALETTE[id]||extra[id];if(!palette)return '';
 const [paper,ink,accent]=palette;
 const line=(d,w=2,opacity=.35)=>'<path d="'+d+'" fill="none" stroke="'+ink+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+opacity+'"/>';
 const leaf=(x,y,rotate,scale=1)=>'<g transform="translate('+x+' '+y+') rotate('+rotate+') scale('+scale+')"><path d="M0 0Q44-53 101-3Q46 46 0 0Z" fill="'+accent+'" opacity=".43"/>'+line('M2 0L96 -3M35 -2L57 -22M54 -2L78 16',1.7,.43)+'</g>';
 const sparkles=Array.from({length:13},(_,i)=>{const x=(i*119+55)%668,y=(i*67+38)%390;return '<g opacity=".26"><path d="M'+x+' '+(y-5)+'v10m-5-5h10" stroke="'+ink+'" stroke-width="1.3"/><circle cx="'+x+'" cy="'+y+'" r="12" fill="none" stroke="'+ink+'" stroke-width=".6" opacity=".4"/></g>';}).join('');
 const hill='<path d="M0 312Q154 248 284 294T680 266V420H0Z" fill="'+accent+'" opacity=".28"/><path d="M0 373Q206 304 383 365T680 322V420H0Z" fill="'+ink+'" opacity=".10"/>';
 const lotus=()=>{
  const petals=Array.from({length:11},(_,i)=>'<ellipse cx="344" cy="268" rx="23" ry="92" transform="rotate('+((i-5)*17)+' 344 310)" fill="'+(i%2?accent:ink)+'" opacity="'+(i%2?'.35':'.24')+'"/>').join('');
  return '<path d="M0 349Q155 305 336 352T680 338M0 381Q145 338 340 384T680 364" fill="none" stroke="'+ink+'" stroke-width="2" opacity=".15"/>'+petals+'<ellipse cx="344" cy="331" rx="46" ry="9" fill="'+ink+'" opacity=".14"/>'+leaf(100,320,14,.75)+leaf(530,347,194,.73);
 };
 const pine=(x,y,size)=>'<g transform="translate('+x+' '+y+') scale('+size+')">'+line('M0 0V190',4,.28)+'<path d="M0 -28L-55 78H-33L-68 132H72L37 78H57Z" fill="'+accent+'" opacity=".46"/>'+line('M0 -28L-55 78H-33L-68 132H72L37 78H57',1.7,.38)+'</g>';
 const forest=hill+Array.from({length:8},(_,i)=>pine(28+i*95,145+(i%3)*17,.65+(i%3)*.13)).join('')+line('M-10 385Q180 343 333 379T710 352',2,.21);
 const leaves=line('M-24 408Q99 253 215 216T451 122T706 -8',3,.29)+leaf(50,337,-40,1.1)+leaf(118,242,38,.95)+leaf(288,188,159,.9)+leaf(465,111,-32,.96)+leaf(525,337,156,1.05)+sparkles;
 const meditation='<circle cx="358" cy="179" r="139" fill="'+accent+'" opacity=".25"/><circle cx="358" cy="179" r="113" fill="none" stroke="'+ink+'" stroke-width="1.4" opacity=".2"/><circle cx="358" cy="179" r="85" fill="none" stroke="'+ink+'" stroke-width=".8" opacity=".18"/><circle cx="358" cy="151" r="25" fill="'+ink+'" opacity=".23"/><path d="M330 194Q358 178 389 197L412 285Q358 314 306 285Z" fill="'+ink+'" opacity=".20"/><path d="M323 274Q228 289 188 353Q350 399 527 353Q468 288 389 270" fill="'+ink+'" opacity=".22"/>'+line('M52 397Q342 317 649 396',3,.26)+sparkles;
 const ripples=[60,95,134,171].map(r=>'<circle cx="368" cy="217" r="'+r+'" stroke="'+ink+'" stroke-width="1.4" fill="none" opacity="'+(.35-r/800)+'"/>').join('');
 const awareness=ripples+'<path d="M260 215Q367 122 472 215Q365 310 260 215Z" fill="'+accent+'" opacity=".26"/>'+line('M260 215Q367 122 472 215Q365 310 260 215',2,.35)+'<circle cx="368" cy="215" r="23" fill="'+ink+'" opacity=".23"/>'+sparkles;
 const yoga='<circle cx="362" cy="159" r="144" fill="'+accent+'" opacity=".27"/>'+Array.from({length:7},(_,i)=>'<ellipse cx="362" cy="312" rx="43" ry="97" transform="rotate('+((i-3)*23)+' 362 351)" fill="'+accent+'" opacity=".21"/>').join('')+line('M362 150V246M362 203L282 253M362 203L443 253M362 247L279 338M362 247L443 338',8,.32)+'<circle cx="362" cy="118" r="20" fill="'+ink+'" opacity=".24"/>'+line('M105 383Q343 332 613 383',2,.22);
 const awakening='<circle cx="470" cy="219" r="106" fill="'+accent+'" opacity=".51"/>'+Array.from({length:21},(_,i)=>{const a=i*Math.PI*2/21;return line('M'+(470+117*Math.cos(a)).toFixed(1)+' '+(219+117*Math.sin(a)).toFixed(1)+'L'+(470+184*Math.cos(a)).toFixed(1)+' '+(219+184*Math.sin(a)).toFixed(1),1.7,.27);}).join('')+hill+sparkles;
 const stream='<path d="M0 294L155 134L251 262L410 81L557 251L680 172V420H0Z" fill="'+accent+'" opacity=".24"/>'+hill+'<path d="M-25 389Q190 256 327 352T703 297" fill="none" stroke="'+ink+'" stroke-width="50" opacity=".16" stroke-linecap="round"/><path d="M-25 389Q190 256 327 352T703 297" fill="none" stroke="#fff" stroke-width="16" opacity=".39" stroke-linecap="round"/>'+leaf(43,321,11,.6)+leaf(561,321,-160,.67)+line('M120 361Q170 334 218 344M458 349Q501 359 537 335',1.6,.32);
 const creative=sparkles+line('M250 310L430 130L460 160L280 340Z M250 310L238 355L280 340 M300 350H470',5,.4);const rest=hill+'<path d="M410 70A120 120 0 1 0 530 230A103 103 0 0 1 410 70" fill="'+accent+'" opacity=".5"/>'+sparkles;const travel=hill+line('M240 300V170H430V300Z M300 170V140H370V170 M280 170V300 M390 170V300 M200 335H490',5,.4);const freelancer=sparkles+line('M220 150H460V310H220Z M190 330H490 M280 285H400 M250 190H360 M250 220H420',5,.4);const scene={leaves,forest,lotus:lotus(),meditation,awareness,yoga,awakening,stream,creative,rest,travel,freelancer}[id]||'';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 420" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="wash" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".74"/><stop offset=".55" stop-color="'+paper+'"/><stop offset="1" stop-color="'+accent+'" stop-opacity=".62"/></linearGradient><radialGradient id="light"><stop offset="0" stop-color="#ffffff" stop-opacity=".75"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="680" height="420" fill="url(#wash)"/><circle cx="115" cy="65" r="260" fill="url(#light)"/><g>'+scene+'</g><path d="M0 405Q280 395 680 404" fill="none" stroke="'+ink+'" stroke-width="1" opacity=".09"/></svg>';
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
 if(image&&/^[a-zA-Z0-9_-]{1,100}$/.test(image)){const img=document.createElement('img');img.src=fileURL(image);img.alt='Ảnh minh họa liên kết';img.loading='lazy';img.onerror=()=>{cover.innerHTML='<span class="zen-browser-illustration" aria-hidden="true"><i></i><i></i><i></i></span>';};cover.append(img);}
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
 const lines=String(text||'').split(/\r?\n/),out=[],stack=[];
 const closeOne=()=>{const item=stack.pop();if(item)out.push('</li></'+item.type+'>');};
 const closeAll=()=>{while(stack.length)closeOne();};
 for(const line of lines){
  const li=line.match(/^(\s*)([-•◦▪]|\d+\.)\s+(.*)/);
  if(li){
   const depth=Math.min(Math.floor(li[1].replace(/\t/g,'  ').length/2),stack.length),type=/\d/.test(li[2])?'ol':'ul';
   while(stack.length>depth+1)closeOne();
   if(stack.length===depth+1&&stack[depth].type!==type)closeOne();
   if(stack.length===depth){out.push('<'+type+(type==='ol'?' start="'+parseInt(li[2],10)+'"':' class="zen-list-'+(li[2]==='◦'?'circle':li[2]==='▪'?'square':'disc')+'"')+'><li>');stack.push({type});}
   else out.push('</li><li>');
   out.push(inline(li[3]));continue;
  }
  closeAll();const h=line.match(/^(#{1,3})\s+(.+)/);out.push(h?'<h'+h[1].length+'>'+inline(h[2])+'</h'+h[1].length+'>':line.trim()?'<p>'+inline(line)+'</p>':'<div class="zen-blank-line"></div>');
 }
 closeAll();return out.join('');
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
  const pinRow=document.createElement('div');
   pinRow.className='zen-editor-pin-row';
   pinRow.setAttribute('role','group');pinRow.setAttribute('aria-label','Ghim ghi chú');
   const pinHint=document.createElement('span');pinHint.className='zen-editor-pin-hint';
   pinHint.textContent=note?.pinned?'Ghi chú đã ghim':'Giữ ghi chú quan trọng ở đầu';
   const b=zenPinButton(note||{},true);
   b.textContent=note?.pinned?'Bỏ ghim':'Ghim';
   pinRow.append(pinHint,b);
   composer.insertBefore(pinRow,title);
  b.onclick=()=>{const prev=p.value;p.value=String(prev!=='true');
   if(editor.noteCommit?.()!==true){p.value=prev;return;}
   b.setAttribute('aria-pressed',p.value);b.title=p.value==='true'?'Bỏ ghim':'Ghim ghi chú';b.setAttribute('aria-label',b.title);b.textContent=p.value==='true'?'Bỏ ghim':'Ghim';pinHint.textContent=p.value==='true'?'Ghi chú đã ghim':'Giữ ghi chú quan trọng ở đầu';render();
  };
 }
 const draw=()=>zenArt(composer,composer.querySelector('[name=note-motif]')?.value||'none');
 draw();
 composer.querySelectorAll('[data-note-motif]').forEach(button=>{
  const motif=button.dataset.noteMotif,icon=button.querySelector('span');
  if(icon&&motif!=='none'){
   const svg=zenPattern(motif);
   icon.classList.add('zen-motif-thumb');
   icon.style.backgroundImage='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
   icon.textContent='';
   icon.setAttribute('aria-hidden','true');
  }
  button.addEventListener('click',()=>requestAnimationFrame(draw));
 });
 const url=composer.querySelector('[name=url]');
 if(url){
  const preview=document.createElement('div');preview.className='zen-link-live';url.closest('.note-links')?.after(preview);
  function paint(){preview.replaceChildren();const node=zenPreviewLink({url:url.value,title:title?.value||'',images:note?.images||[]});if(node){const remove=document.createElement('button');remove.type='button';remove.className='zen-link-remove';remove.textContent='×';remove.title='Gỡ liên kết khỏi ghi chú';remove.setAttribute('aria-label','Gỡ liên kết khỏi ghi chú');remove.addEventListener('click',()=>{url.value='';url.dispatchEvent(new Event('input',{bubbles:true}));url.focus();});preview.append(node,remove);}}
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
function zenPaintSidebarPins(){
 const section=document.querySelector('#side-pinned-notes');if(!section)return;
 const pinned=(data.notes||[]).filter(note=>note.pinned&&!note.deleted).slice(0,12);
 section.hidden=contentReadOnly||!pinned.length;
 if(section.hidden){section.replaceChildren();return;}
 section.innerHTML='<div class="navlabel"><span>'+svgIcon('pin')+'Ghim nhanh</span></div><div class="side-pinned-list">'+pinned.map(note=>'<button type="button" class="side-pinned-note" data-zen-note-shortcut="'+esc(note.id)+'" title="Mở ghi chú: '+esc(note.title||'Ghi chú')+'"><span class="side-pinned-mark" aria-hidden="true">'+svgIcon('notes')+'</span><span class="side-pinned-title">'+esc(note.title||'Ghi chú không tên')+'</span></button>').join('')+'</div>'+((data.notes||[]).filter(note=>note.pinned&&!note.deleted).length>12?'<button type="button" class="side-pinned-more" data-view="notes">Xem tất cả ghi chú ghim →</button>':'');
}
render=function(){zenOldRender();zenApplyNoteCards();zenPaintSidebarPins();};
document.addEventListener('click',event=>{const button=event.target.closest('[data-zen-note-shortcut]');if(!button)return;const note=data.notes?.find(item=>item.id===button.dataset.zenNoteShortcut);if(!note)return;event.preventDefault();if(document.querySelector('.nav-open'))document.body.classList.remove('nav-open');noteForm(note);});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-zen-pin]');if(!b||b.classList.contains('zen-editor-pin'))return;
 e.preventDefault();e.stopImmediatePropagation();if(contentReadOnly)return;
 const note=data.notes?.find(n=>n.id===b.dataset.zenPin);if(!note)return;
 note.pinned=!note.pinned;if(!save()){note.pinned=!note.pinned;return;}render();
},true);

