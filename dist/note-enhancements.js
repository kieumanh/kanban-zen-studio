'use strict';
/* v1.9.6 — Keep checklist autosave, live progress and lightweight note motifs.
   Reuses the existing validated note commit and account-scoped sync. */
const NOTE_MOTIFS=Object.freeze({
  none:{label:'Không họa tiết',icon:'◯'},
  leaves:{label:'Lá xanh',icon:'🍃'},
  forest:{label:'Cây cỏ',icon:'🌿'},
  lotus:{label:'Hoa sen',icon:'🪷'},
  meditation:{label:'Thiền định',icon:'🧘'},
  awareness:{label:'Tỉnh thức',icon:'✨'},
  yoga:{label:'Yoga',icon:'☯'},
  awakening:{label:'Khai sáng',icon:'☀'},
  stream:{label:'Dòng suối',icon:'💧'},
  creative:{label:'Sáng tạo',icon:'🎨'},rest:{label:'Nghỉ ngơi',icon:'🌙'},travel:{label:'Du lịch',icon:'🧳'},freelancer:{label:'Freelancer',icon:'💻'},
  farm:{label:'Nông trại',icon:'🌾'},family:{label:'Gia đình',icon:'🏡'},finance:{label:'Tài chính',icon:'📈'}
});
function noteMotif(n){return typeof n?.motif==='string'&&Object.hasOwn(NOTE_MOTIFS,n.motif)?n.motif:'none';}
function noteChecklistStats(n){
  const items=Array.isArray(n?.items)?n.items:[];
  const done=items.filter(item=>item.done).length;
  return {total:items.length,done,pct:items.length?Math.round(100*done/items.length):0};
}
function noteProgressMarkup(n){
  if(n.type!=='todo')return '';
  const s=noteChecklistStats(n);
  return '<div class="note-progress" aria-label="Tiến độ checklist"><div class="note-progress-heading"><span>'+s.done+'/'+s.total+' mục hoàn thành</span><strong>'+s.pct+'%</strong></div><div class="note-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+s.pct+'" aria-label="Tiến độ checklist"><span style="width:'+s.pct+'%"></span></div></div>';
}
const noteContentBeforeProgress=noteContent;
noteContent=function(n){
  return noteProgressMarkup(n)+noteContentBeforeProgress(n);
};
const noteExtraValuesBeforeMotifs=noteExtraValues;
noteExtraValues=function(form,n){
  const extra=noteExtraValuesBeforeMotifs(form,n);
  if(extra===false)return false;
  const input=form.querySelector('[name=note-motif]');
  const motif=input?input.value:noteMotif(n);
  if(!Object.hasOwn(NOTE_MOTIFS,motif)){notify('Họa tiết không hợp lệ.');return false;}
  return {...extra,motif};
};
function noteDecorateCards(){
  document.querySelectorAll('.keep-card[data-note-id],.content-card[data-card]').forEach(card=>{
    const id=card.dataset.noteId||card.dataset.card;
    const n=data.notes?.find(item=>item.id===id);
    if(!n)return;
    const motif=noteMotif(n);
    card.dataset.motif=motif;
    card.querySelector(':scope > .note-ornament')?.remove();
    if(motif==='none')return;
    const ornament=document.createElement('span');
    ornament.className='note-ornament';
    ornament.setAttribute('aria-hidden','true');
    ornament.textContent=NOTE_MOTIFS[motif].icon;
    card.prepend(ornament);
  });
}
const renderBeforeNoteEnhancements=render;
render=function(){
  renderBeforeNoteEnhancements();
  if(view==='notes')noteDecorateCards();
};
function noteEditorStats(section){
  const rows=[...section.querySelectorAll('.note-item-row')].filter(row=>!row.hidden&&!row.querySelector('[data-note-item-remove]')?.checked&&row.querySelector('[data-note-item-text]')?.value.trim());
  const total=rows.length,done=rows.filter(row=>row.querySelector('[data-note-item-done]')?.checked).length;
  return {total,done,pct:total?Math.round(100*done/total):0};
}
function paintNoteEditorProgress(section){
  const bar=section.querySelector('.note-progress-editor');
  if(!bar)return;
  const {total,done,pct}=noteEditorStats(section);
  bar.querySelector('.note-progress-heading span').textContent=done+'/'+total+' mục hoàn thành';
  bar.querySelector('.note-progress-heading strong').textContent=pct+'%';
  bar.querySelector('[role=progressbar]').setAttribute('aria-valuenow',String(pct));
  bar.querySelector('.note-progress-track span').style.width=pct+'%';
}
function noteCreateChecklistRow(text){
  const row=document.createElement('div');
  row.className='note-item-row';
  row.innerHTML='<input type="checkbox" data-note-item-done aria-label="Đánh dấu hoàn thành"><textarea rows="1" data-note-item-text maxlength="300" aria-label="Nội dung mục checklist"></textarea><input type="checkbox" data-note-item-remove hidden><button type="button" data-note-item-hide aria-label="Xóa mục checklist">×</button>';
  row.querySelector('textarea').value=text;
  return row;
}
const noteFormBeforeEnhancements=noteForm;
noteForm=function(n){
  noteFormBeforeEnhancements(n);
  if(contentReadOnly)return;
  const editor=document.querySelector('#editor.keep-editor');
  const composer=editor?.querySelector('.note-composer');
  if(!composer)return;
  const checklist=composer.querySelector('.note-check-editor');
  const selected=noteMotif(n);
  const motifPicker=document.createElement('details');
  motifPicker.className='note-motif-picker';
  motifPicker.innerHTML='<summary><span>✦ Họa tiết ghi chú</span><span class="note-motif-current">'+NOTE_MOTIFS[selected].icon+' '+NOTE_MOTIFS[selected].label+'</span></summary><p>Chọn họa tiết trang trí tinh tế cho thẻ ghi chú.</p><div class="note-motif-options" role="group" aria-label="Chọn họa tiết">'+Object.entries(NOTE_MOTIFS).map(([id,item])=>'<button type="button" class="note-motif-option" data-note-motif="'+id+'" aria-pressed="'+(id===selected)+'" title="'+item.label+'"><span aria-hidden="true">'+item.icon+'</span><small>'+item.label+'</small></button>').join('')+'</div><input type="hidden" name="note-motif" value="'+selected+'">';
  (composer.querySelector('.note-quick-options')||composer.querySelector('.note-toolbar'))?.after(motifPicker);
  let autoBusy=false;
  const saveInline=()=>{
    if(autoBusy||!editor.open||typeof editor.noteCommit!=='function')return false;
    autoBusy=true;
    let success=false;
    try{
      success=editor.noteCommit()===true;
      if(success)render();
      const status=composer.querySelector('.note-inline-save-status');
      if(status)status.textContent=success?'Đã lưu trên thiết bị · Tự đồng bộ':'Hãy kiểm tra nội dung trước khi lưu.';
    }finally{autoBusy=false;}
    return success;
  };
  motifPicker.querySelectorAll('[data-note-motif]').forEach(button=>{
    button.onclick=()=>{
      const input=motifPicker.querySelector('[name=note-motif]'),before=input.value;
      input.value=button.dataset.noteMotif;
      motifPicker.querySelectorAll('[data-note-motif]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      motifPicker.querySelector('.note-motif-current').textContent=NOTE_MOTIFS[input.value].icon+' '+NOTE_MOTIFS[input.value].label;
      if(!saveInline())input.value=before;
    };
  });
  if(!checklist)return;
  const oldEntry=checklist.querySelector('[name=note-extra-items]');
  oldEntry?.closest('label')?.remove();
  const title=checklist.querySelector('h3');
  const progress=document.createElement('div');
  progress.className='note-progress note-progress-editor';
  progress.innerHTML='<div class="note-progress-heading"><span>0/0 mục hoàn thành</span><strong>0%</strong></div><div class="note-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Tiến độ checklist"><span style="width:0%"></span></div>';
  title?.after(progress);
  const add=document.createElement('div');
  add.className='note-check-add';
  add.innerHTML='<label for="note-check-draft">Thêm mục checklist</label><div><input type="text" id="note-check-draft" maxlength="300" placeholder="Việc nhỏ tiếp theo…" autocomplete="off"><button type="button" class="btn primary" data-note-add-item>＋ Thêm mục</button></div><small class="note-inline-save-status" role="status">Mục checklist được lưu tự động khi thêm hoặc thay đổi.</small>';
  checklist.append(add);
  const draft=add.querySelector('input'),button=add.querySelector('[data-note-add-item]');
  const insert=()=>{
    const text=draft.value.trim();
    if(!text){draft.focus();return;}
    if(noteEditorStats(checklist).total>=200){notify('Tối đa 200 mục checklist.');return;}
    const row=noteCreateChecklistRow(text);
    checklist.insertBefore(row,add);
    paintNoteEditorProgress(checklist);
    if(saveInline()){draft.value='';draft.focus();}else{row.remove();paintNoteEditorProgress(checklist);}
  };
  button.onclick=insert;
  draft.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();insert();}});
  checklist.addEventListener('change',e=>{
    if(e.target.matches('[data-note-item-done],[data-note-item-text]')){
      paintNoteEditorProgress(checklist);
      saveInline();
    }
  });
  checklist.addEventListener('input',e=>{
    if(e.target.matches('[data-note-item-text]'))paintNoteEditorProgress(checklist);
  });
  // The existing delete handler runs on document; persist its updated hidden row afterward.
  const onDelete=e=>{
    if(!e.target.closest('[data-note-item-hide]')||!editor.open||!checklist.isConnected)return;
    queueMicrotask(()=>{if(!editor.open)return;paintNoteEditorProgress(checklist);saveInline();});
  };
  document.addEventListener('click',onDelete);
  editor.addEventListener('close',()=>document.removeEventListener('click',onDelete),{once:true});
  paintNoteEditorProgress(checklist);
};

