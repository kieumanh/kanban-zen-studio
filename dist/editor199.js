'use strict';
/* v1.9.9 — In-place rich-text editing. Existing note.text remains portable Markdown. */
// v1.44.0: ch\u1eef ng\u01b0\u1eddi d\u00f9ng g\u00f5 m\u00e0 tr\u00f9ng k\u00fd hi\u1ec7u \u0111\u1ecbnh d\u1ea1ng (v\u00ed d\u1ee5 "5 * 3", "__init__", "# ti\u00eau \u0111\u1ec1", "- vi\u1ec7c") \u0111\u01b0\u1ee3c
// escape b\u1eb1ng d\u1ea5u \ \u0111\u1ec3 khi m\u1edf l\u1ea1i kh\u00f4ng bi\u1ebfn th\u00e0nh in nghi\u00eang, g\u1ea1ch ch\u00e2n, ti\u00eau \u0111\u1ec1 hay danh s\u00e1ch. zenFormattedHTML b\u1ecf d\u1ea5u \ khi hi\u1ec3n th\u1ecb.
function zenEscapeText(s){
 return s.replace(/\\(?=[\\*_~#\-.\u2022\u25e6\u25aa])/g,'\\\\').replace(/\*/g,'\\*').replace(/~~/g,'\\~\\~').replace(/__/g,'\\_\\_');
}
function zenLineSafe(s){
 return s.replace(/^#(?=#{0,2}\s)/,'\\#').replace(/^([-\u2022\u25e6\u25aa])(?=\s)/,'\\$1').replace(/^(\d+)\.(?=\s)/,'$1\\.');
}
// v1.44.0: gi\u1eef kho\u1ea3ng tr\u1eafng \u0111\u1ea7u/cu\u1ed1i ngo\u00e0i d\u1ea5u \u0111\u1ecbnh d\u1ea1ng, \u0111\u1ec3 "**ch\u1eef **" th\u00e0nh "**ch\u1eef** " v\u00e0 in \u0111\u1eadm v\u1eabn \u0111\u00fang khi m\u1edf l\u1ea1i.
function zenWrapMark(out,mark){
 const m=out.match(/^(\s*)([\s\S]*?)(\s*)$/);
 return m[2]?m[1]+mark+m[2]+mark+m[3]:out;
}
function zenRichMarkdown(root){
 function convert(node){
  if(node.nodeType===3)return zenEscapeText((node.nodeValue||'').replace(/\u00a0/g,' '));
  if(node.nodeType!==1)return '';
  const tag=node.tagName.toLowerCase();
  if(tag==='br')return '\n';
  let out=Array.from(node.childNodes||[]).map(convert).join('');
  if(['strong','b'].includes(tag))return zenWrapMark(out,'**');
  if(['em','i'].includes(tag))return zenWrapMark(out,'*');
  if(tag==='u')return zenWrapMark(out,'__');
  if(['s','strike','del'].includes(tag))return zenWrapMark(out,'~~');
  if(tag==='span'){
   const style=node.getAttribute('style')||'';
   if(/font-weight:\s*(bold|[6-9]00)/i.test(style))out=zenWrapMark(out,'**');
   if(/font-style:\s*italic/i.test(style))out=zenWrapMark(out,'*');
   if(/text-decoration[^:]*:\s*[^;]*underline/i.test(style))out=zenWrapMark(out,'__');
   if(/text-decoration[^:]*:\s*[^;]*line-through/i.test(style))out=zenWrapMark(out,'~~');
  }
  if(/^h[1-3]$/.test(tag))return '#'.repeat(Number(tag[1]))+' '+out.trimEnd()+'\n';
  if(tag==='li'){const parent=node.parentElement;const ordered=parent?.tagName==='OL';const i=parent?Array.from(parent.children).indexOf(node)+Number(parent.getAttribute('start')||1):1;const marker=parent?.classList?.contains('zen-list-circle')?'◦ ':parent?.classList?.contains('zen-list-square')?'▪ ':'- ';let depth=0;for(let p=parent?.parentElement;p&&p!==root;p=p.parentElement)if(p.tagName==='LI')depth++;const own=Array.from(node.childNodes).filter(n=>!['UL','OL'].includes(n.nodeName)).map(convert).join('').trimEnd();const nested=Array.from(node.children).filter(n=>['UL','OL'].includes(n.tagName)).map(convert).join('');return '  '.repeat(depth)+(ordered?i+'. ':marker)+own+'\n'+nested;}
  if(['p','div','blockquote'].includes(tag))return zenLineSafe(out.replace(/\n+$/,''))+'\n';
  return out;
 }
 // v1.44.0: chữ gõ trực tiếp ở gốc (không nằm trong đoạn) cũng được escape khi đứng đầu dòng.
 let atLineStart=true;
 const parts=Array.from(root.childNodes||[]).map(node=>{
  const isBlock=node.nodeType===1&&['p','div','blockquote','h1','h2','h3','ul','ol'].includes(node.tagName.toLowerCase());
  let out=convert(node);
  const isBreak=node.nodeType===1&&node.tagName.toLowerCase()==='br';
  if(atLineStart&&!isBlock&&!isBreak)out=zenLineSafe(out);
  atLineStart=isBlock?true:/\n$/.test(out)||(out===''&&atLineStart);
  return out;
 });
 return parts.join('').replace(/\r/g,'').replace(/\n{4,}/g,'\n\n\n').replace(/\n+$/,'');
}
function zenApplyFormatting(rich,command){
 rich.focus();
 let success=false;
 const commands={bold:'bold',italic:'italic',underline:'underline',strike:'strikeThrough',h1:'formatBlock',h2:'formatBlock',plain:'formatBlock',bullets:'insertUnorderedList',circle:'insertUnorderedList',square:'insertUnorderedList',numbers:'insertOrderedList'};
 const action=commands[command];if(!action)return false;
 if(typeof document.execCommand==='function'){
  try{success=document.execCommand(action,false,command==='h1'?'h1':command==='h2'?'h2':command==='plain'?'p':undefined);}catch{}
 }
 if(!success&&['bold','italic','underline','strike'].includes(command)){
  const tag={bold:'strong',italic:'em',underline:'u',strike:'s'}[command];
  const sel=window.getSelection();
  if(sel?.rangeCount&&rich.contains(sel.anchorNode)&&rich.contains(sel.focusNode)){
   const range=sel.getRangeAt(0);
   if(!range.collapsed){
    const wrapper=document.createElement(tag);
    wrapper.append(range.extractContents());range.insertNode(wrapper);
    sel.removeAllRanges();const next=document.createRange();next.selectNodeContents(wrapper);sel.addRange(next);
    success=true;
   }
  }
 }
 if(success&&['bullets','circle','square'].includes(command)){
  const selection=window.getSelection(),node=selection?.anchorNode;const list=(node?.nodeType===1?node:node?.parentElement)?.closest('ul');
  if(list&&rich.contains(list))list.className='zen-list-'+({bullets:'disc',circle:'circle',square:'square'}[command]);
 }
 return success;
}
const zenNoteFormBeforeWysiwyg=noteForm;
noteForm=function(n){
 zenNoteFormBeforeWysiwyg(n);
 if(contentReadOnly)return;
 const editor=document.querySelector('#editor.keep-editor');
 const composer=editor?.querySelector('.note-composer');
 const source=composer?.querySelector('textarea[name=text]');
 if(!source)return;
 const legacyToolbar=composer.querySelector('.zen-format-tools');
 const legacyPreview=composer.querySelector('.zen-format-preview');
 const legacyHelp=composer.querySelector('.zen-format-help');
 legacyPreview?.remove();legacyHelp?.remove();
 // A new toolbar avoids the old textarea-oriented button handlers.
 const toolbar=document.createElement('div');toolbar.className='zen-format-tools zen-wysiwyg-toolbar';
 toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Định dạng trực tiếp nội dung');
 const commands=[['H1','h1','Tiêu đề lớn'],['H2','h2','Tiêu đề vừa'],['Aa','plain','Văn bản thường'],['B','bold','In đậm'],['I','italic','In nghiêng'],['U','underline','Gạch dưới'],['<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 7h14M7 17h10M6 12h12"/></svg>','strike','Gạch ngang']];
 for(const [label,action,tip] of commands){
  const button=document.createElement('button');button.type='button';button.dataset.zenFormat=action;
  button.setAttribute('aria-label',tip);button.title=tip;if(action==='strike')button.innerHTML=label;else button.textContent=label;
  // Preserve the text selection when clicking a formatting action.
  button.addEventListener('mousedown',event=>event.preventDefault());
  toolbar.append(button);
 }
 const listPicker=document.createElement('select');listPicker.className='zen-list-picker';listPicker.setAttribute('aria-label','Kiểu danh sách');
 listPicker.innerHTML='<option value="">Danh sách…</option><option value="bullets">• Chấm tròn</option><option value="numbers">1. Đánh số</option><option value="circle">◦ Vòng tròn</option><option value="square">▪ Hình vuông</option>';
 let savedListRange=null;
 const rememberListRange=()=>{const selection=window.getSelection();if(selection?.rangeCount&&rich.contains(selection.anchorNode)&&rich.contains(selection.focusNode))savedListRange=selection.getRangeAt(0).cloneRange();};
 listPicker.addEventListener('pointerdown',rememberListRange);listPicker.addEventListener('focus',rememberListRange);
 toolbar.append(listPicker);
 legacyToolbar?.replaceWith(toolbar);
 const rich=document.createElement('div');rich.className='zen-wysiwyg';
 rich.contentEditable='true';rich.setAttribute('role','textbox');rich.setAttribute('aria-multiline','true');
 rich.setAttribute('aria-label','Nội dung ghi chú được định dạng trực tiếp');
 rich.dataset.placeholder='Viết ghi chú tại đây…';
 rich.innerHTML=zenFormattedHTML(source.value);
 source.classList.add('zen-source-textarea');source.setAttribute('aria-hidden','true');source.tabIndex=-1;
 // The current note-type dropdown still controls text vs checklist.
 source.after(rich);
 const type=composer.querySelector('[name=note-kind]');
 const toggle=()=>{rich.hidden=!!source.hidden||(type&&type.value==='todo');toolbar.hidden=rich.hidden;};
 type?.addEventListener('change',()=>queueMicrotask(toggle));toggle();
 let debounce=0,pending=false;
 function syncText(){source.value=zenRichMarkdown(rich);}
 function commit(){
  if(typeof _WF!=='undefined'&&_WF.note?.id===editor.dataset.noteId)return;
  if(!pending||!editor.open)return;
  syncText();
  if(source.value.length>10000){notify('Nội dung ghi chú tối đa 10.000 ký tự.');return;}
  if(editor.noteCommit?.()===true){pending=false;const indicator=editor.querySelector('.zen-rich-save-state');if(indicator)indicator.textContent='Đã lưu trên thiết bị · Tự đồng bộ';render();}
 }
 function queue(){
  pending=true;syncText();clearTimeout(debounce);debounce=setTimeout(commit,900);
  const indicator=editor.querySelector('.zen-rich-save-state');if(indicator)indicator.textContent='Đang lưu bản nháp…';
 }
 const notice=document.createElement('small');notice.className='zen-rich-save-state';notice.setAttribute('role','status');
 notice.textContent='Định dạng hiển thị trực tiếp · tự lưu nội dung.';
 rich.after(notice);
 rich.addEventListener('input',queue);
 rich.addEventListener('blur',()=>{if(pending){clearTimeout(debounce);commit();}});
 rich.addEventListener('paste',event=>{
  const text=event.clipboardData?.getData('text/plain');
  if(text===undefined)return;
  event.preventDefault();
  // Plain-text paste prevents injected HTML and unwanted remote image requests.
  if(typeof document.execCommand==='function')document.execCommand('insertText',false,text);
  else{
   const sel=window.getSelection();
   if(sel?.rangeCount){const range=sel.getRangeAt(0);range.deleteContents();range.insertNode(document.createTextNode(text));}
   queue();
  }
 });
 toolbar.addEventListener('click',e=>{
  const button=e.target.closest('[data-zen-format]');if(!button)return;
  const was=zenRichMarkdown(rich);
  if(zenApplyFormatting(rich,button.dataset.zenFormat)){
   if(zenRichMarkdown(rich)!==was)queue();
  }
 });
 listPicker.addEventListener('change',()=>{
  const action=listPicker.value;if(!action)return;
  if(savedListRange){rich.focus();const selection=window.getSelection();selection.removeAllRanges();selection.addRange(savedListRange);savedListRange=null;}
  const was=zenRichMarkdown(rich);
  if(zenApplyFormatting(rich,action)&&zenRichMarkdown(rich)!==was)queue();
  listPicker.value='';
 });
 zenListMenu(listPicker,rich);
 const title=composer.querySelector('input[name=title]');
 title?.addEventListener('input',()=>{
  pending=true;clearTimeout(debounce);debounce=setTimeout(commit,900);
 });
 editor.addEventListener('close',()=>{
  clearTimeout(debounce);
  // Preserve typed content when closing while the debounce was pending.
  if(pending&&!(typeof _WF!=='undefined'&&_WF.note?.id===editor.dataset.noteId)){syncText();if(source.value.length<=10000)editor.noteCommit?.();}
 },{once:true});
};

// Shared shortcuts for notes, tasks and projects.
document.addEventListener?.('keydown',event=>{
 const rich=event.target.closest?.('.zen-wysiwyg');if(!rich||event.isComposing)return;
 const selection=window.getSelection(),node=selection?.anchorNode;
 const element=node?.nodeType===1?node:node?.parentElement;
 let action='';
 if((event.ctrlKey||event.metaKey)&&!event.altKey){action={b:'bold',i:'italic',u:'underline'}[event.key.toLowerCase()]||'';}
 else if(event.key==='Tab'&&element?.closest('li'))action=event.shiftKey?'outdent':'indent';
 else if(event.key===' '&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&selection?.isCollapsed){
  const block=element?.closest('p,div,li'),marker=block?.textContent||'';
  const expected=marker==='*'||marker==='-'?'bullets':/^\d+\.$/.test(marker)?'numbers':'';
  const atEnd=node?.nodeType===3?selection.anchorOffset===node.nodeValue.length:selection.anchorOffset===node?.childNodes?.length;
  if(expected&&block&&rich.contains(block)&&atEnd){
   event.preventDefault();const range=document.createRange();range.selectNodeContents(block);range.deleteContents();const caret=document.createRange();caret.selectNodeContents(block);caret.collapse(true);selection.removeAllRanges();selection.addRange(caret);document.execCommand(expected==='numbers'?'insertOrderedList':'insertUnorderedList',false);rich.dispatchEvent(new Event('input',{bubbles:true}));return;
  }
 }
 if(!action)return;event.preventDefault();
 if(action==='indent'||action==='outdent')document.execCommand(action,false);else zenApplyFormatting(rich,action);
 rich.dispatchEvent(new Event('input',{bubbles:true}));
});

// The same accessible list menu is used by note, task and project editors.
function zenListMenu(select,rich){
 const details=document.createElement('details');details.className='zen-list-menu';
 const summary=document.createElement('summary');summary.textContent='☷ Danh sách';summary.setAttribute('aria-label','Chọn kiểu danh sách');
 const menu=document.createElement('div');menu.className='zen-list-menu-options';menu.setAttribute('aria-label','Kiểu danh sách');
 let saved=null;
 const remember=()=>{const selection=window.getSelection();if(selection?.rangeCount&&rich.contains(selection.anchorNode))saved=selection.getRangeAt(0).cloneRange();};
 summary.addEventListener('pointerdown',remember);summary.addEventListener('focus',remember);
 for(const [value,label] of [['bullets','● Chấm tròn'],['numbers','1. Đánh số'],['circle','○ Vòng tròn'],['square','▪ Hình vuông'],['indent','→ Danh sách con'],['outdent','← Giảm cấp']]){
  const button=document.createElement('button');button.type='button';button.textContent=label;
  button.addEventListener('mousedown',e=>e.preventDefault());
  button.addEventListener('click',()=>{if(saved){rich.focus();const selection=window.getSelection();selection.removeAllRanges();selection.addRange(saved);}if(value==='indent'||value==='outdent'){document.execCommand(value,false);rich.dispatchEvent(new Event('input',{bubbles:true}));}else{select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}details.open=false;});menu.append(button);
 }
 details.append(summary,menu);select.hidden=true;select.after(details);
 const controller=new AbortController();
 details.addEventListener('keydown',event=>{const buttons=[...menu.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();details.open=false;summary.focus();}else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();details.open=true;const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();}});
 document.addEventListener('pointerdown',event=>{if(!details.contains(event.target))details.open=false;},{signal:controller.signal});
 document.querySelector('#editor')?.addEventListener('close',()=>controller.abort(),{once:true});
}

