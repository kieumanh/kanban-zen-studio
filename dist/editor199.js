'use strict';
/* v1.9.9 — In-place rich-text editing. Existing note.text remains portable Markdown. */
function zenRichMarkdown(root){
 function convert(node){
  if(node.nodeType===3)return (node.nodeValue||'').replace(/\u00a0/g,' ');
  if(node.nodeType!==1)return '';
  const tag=node.tagName.toLowerCase();
  if(tag==='br')return '\n';
  let out=Array.from(node.childNodes||[]).map(convert).join('');
  if(['strong','b'].includes(tag))return out.trim()?'**'+out+'**':out;
  if(['em','i'].includes(tag))return out.trim()?'*'+out+'*':out;
  if(tag==='u')return out.trim()?'__'+out+'__':out;
  if(['s','strike','del'].includes(tag))return out.trim()?'~~'+out+'~~':out;
  if(tag==='span'){
   const style=node.getAttribute('style')||'';
   if(/font-weight:\s*(bold|[6-9]00)/i.test(style))out='**'+out+'**';
   if(/font-style:\s*italic/i.test(style))out='*'+out+'*';
   if(/text-decoration[^:]*:\s*[^;]*underline/i.test(style))out='__'+out+'__';
   if(/text-decoration[^:]*:\s*[^;]*line-through/i.test(style))out='~~'+out+'~~';
  }
  if(/^h[1-3]$/.test(tag))return '#'.repeat(Number(tag[1]))+' '+out.trimEnd()+'\n';
  if(tag==='li'){const parent=node.parentElement;const ordered=parent?.tagName==='OL';const i=parent?Array.from(parent.children).indexOf(node)+Number(parent.getAttribute('start')||1):1;const marker=parent?.classList?.contains('zen-list-circle')?'◦ ':parent?.classList?.contains('zen-list-square')?'▪ ':'- ';return (ordered?i+'. ':marker)+out.trimEnd()+'\n';}
  if(['p','div','blockquote'].includes(tag))return out.replace(/\n+$/,'')+'\n';
  return out;
 }
 return Array.from(root.childNodes||[]).map(convert).join('').replace(/\r/g,'').replace(/\n{4,}/g,'\n\n\n').replace(/\n+$/,'');
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
  button.setAttribute('aria-label',tip);button.title=tip;
  if(action==='strike')button.innerHTML=label;else button.textContent=label;
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
 const title=composer.querySelector('input[name=title]');
 title?.addEventListener('input',()=>{
  pending=true;clearTimeout(debounce);debounce=setTimeout(commit,900);
 });
 editor.addEventListener('close',()=>{
  clearTimeout(debounce);
  // Preserve typed content when closing while the debounce was pending.
  if(pending){syncText();if(source.value.length<=10000)editor.noteCommit?.();}
 },{once:true});
};
