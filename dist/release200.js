'use strict';
// Three-way merge: independent edits merge; competing edits require explicit recovery.
function mergeWorkspaceValue(base,local,remote){
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(equal(local,remote)||equal(base,remote))return structuredClone(local);
 if(equal(base,local))return structuredClone(remote);
 if([base,local,remote].every(v=>Array.isArray(v)&&v.every(x=>x&&typeof x.id==='string'))){
  const ids=new Set([...local,...remote].map(x=>x.id));const result=[];
  for(const id of ids){const b=base.find(x=>x.id===id),l=local.find(x=>x.id===id),r=remote.find(x=>x.id===id);const v=mergeWorkspaceValue(b,l,r);if(v!==undefined)result.push(v);}return result;
 }
 if([base,local,remote].every(v=>v&&typeof v==='object'&&!Array.isArray(v))){
  const out={};for(const k of new Set([...Object.keys(local),...Object.keys(remote)])){const v=mergeWorkspaceValue(base[k],local[k],remote[k]);if(v!==undefined)out[k]=v;}return out;
 }
 throw Error('Chỉnh sửa cùng nội dung');
}
async function rebaseWorkspace(owner){
 try{
  const remote=await requestAPI('workspace');if(currentUser?.id!==owner)return false;
  const merged=JSON.stringify(data)===JSON.stringify(remote.data)?structuredClone(data):cloudBase?mergeWorkspaceValue(cloudBase,data,remote.data):null;
  if(!merged||!valid(merged))return false;
  data=merged;cloudRevision=remote.revision;cloudBase=structuredClone(remote.data);dirty=JSON.stringify(data)!==JSON.stringify(remote.data);syncConflict=false;cacheCloud();
  if(!dirty)syncStatus('Đã đồng bộ','saved');return true;
 }catch{return false;}
}
async function preserveConflictCopies(){
 if(!currentUser||syncing)return;const owner=currentUser.id;
 const button=document.querySelector('#merge-conflict,#merge-conflict-report');if(button)button.disabled=true;
 try{
  const remote=await requestAPI('workspace');if(currentUser?.id!==owner)return;
  const local=structuredClone(data),merged=structuredClone(remote.data);await(await persistenceReady).set(KEY+'-conflict-'+Date.now(),local);
  merged.notes||=[];
  // Missing/different local records are recovered as copies; server deletions are not reversed silently.
  for(const p of local.projects){const rp=merged.projects.find(x=>x.id===p.id);if(JSON.stringify(p)===JSON.stringify(rp))continue;const copy=structuredClone(p);copy.id=uid();copy.name=(copy.name+' · Bản thiết bị').slice(0,100);const ids=new Map();for(const t of copy.tasks){const old=t.id;t.id=uid();ids.set(old,t.id);for(const c of t.checks)c.id=uid();}for(const e of copy.dependencies||[]){e.from=ids.get(e.from);e.to=ids.get(e.to);}merged.projects.push(copy);}
  const remap=new Map();for(const n of local.notes||[]){const rn=merged.notes.find(x=>x.id===n.id);if(JSON.stringify(n)!==JSON.stringify(rn))remap.set(n.id,uid());}
  for(const n of local.notes||[])if(remap.has(n.id)){const copy=structuredClone(n);copy.id=remap.get(n.id);copy.title=(copy.title+' · Bản thiết bị').slice(0,150);for(const k of ['boardId','from','to'])if(remap.has(copy[k]))copy[k]=remap.get(copy[k]);merged.notes.push(copy);}
  if(!valid(merged)||new TextEncoder().encode(JSON.stringify(merged)).length>20000000)throw Error('Bản hợp nhất vượt giới hạn. Hãy xuất JSON và xử lý từng dự án; các bản gốc vẫn được giữ.');
  data=merged;cloudBase=structuredClone(remote.data);cloudRevision=remote.revision;dirty=true;syncConflict=false;syncBlocked=false;cacheCloud();await flushCloud(true);
  if(dirty||syncConflict)throw Error('Còn dữ liệu chờ. Bản hợp nhất đã lưu trên thiết bị để tiếp tục.');
  render();accountPanel();renderManualSyncReport('synced',{revision:cloudRevision,uploaded:true});notify('Đã hợp nhất. Các nội dung khác nhau được giữ thành bản sao để bạn đối chiếu.');
 }catch(e){notify(e.message);}finally{if(button?.isConnected)button.disabled=false;}
}
document.addEventListener('click',e=>{if(e.target.closest('#merge-conflict,#merge-conflict-report'))preserveConflictCopies();});
const historyNoteForm=noteForm;
noteForm=function(n){
 historyNoteForm(n);if(contentReadOnly)return;
 const editor=$('#editor'),composer=editor.querySelector('.note-composer');if(!composer)return;
 const row=document.createElement('div');row.className='note-unified-options';
 const toolbar=composer.querySelector('.note-toolbar'),motif=composer.querySelector('.note-motif-picker');
 if(toolbar){toolbar.before(row);const reminder=composer.querySelector('.note-reminder-options');if(reminder)row.append(reminder);if(motif)row.append(motif);for(const node of [...toolbar.children])row.append(node);toolbar.remove();}
 const kind=composer.querySelector('.note-type-field'),color=composer.querySelector('.note-wheel-picker');if(kind)row.prepend(kind);if(color)row.append(color);
 const history=document.createElement('button');history.type='button';history.className='btn note-history-button';history.textContent='↶ Lịch sử 7 ngày';row.append(history);
 const group=row.querySelector('.note-group'),upload=row.querySelector('label.btn'),saveButton=row.querySelector('#note-save');const footer=document.createElement('div');footer.className='note-editor-actions';row.after(footer);for(const node of [kind,group,color,row.querySelector('.note-reminder-options'),motif,upload])if(node)row.append(node);if(history)footer.append(history);if(saveButton)footer.append(saveButton);
 history.onclick=async()=>{
  editor.querySelector('.zen-wysiwyg')?.dispatchEvent(new Event('blur'));
  const noteId=editor.dataset.noteId;
  if((typeof _WF!=='undefined'&&_WF.note?.pending)||!data.notes?.some(n=>n.id===noteId)){if(editor.noteCommit?.()!==true)return;}
  const id=editor.dataset.noteId;history.disabled=true;
  const owner=currentUser?.id;
  try{
   await flushCloud(true);
   const hasUnsyncedChanges=dirty||syncConflict||syncing;
   const response=await requestAPI('note-history?id='+encodeURIComponent(id));if(owner!==currentUser?.id)return;
   composer.querySelector('.note-history-inline')?.remove();const d=document.createElement('section');d.className='note-history-inline';
   d.innerHTML='<header><h2>Phiên bản ghi chú · 7 ngày</h2><button type="button" class="icon-btn exit-x" aria-label="Đóng lịch sử" title="Đóng">×</button></header><p>Khôi phục tạo một lần lưu mới; phiên bản hiện tại vẫn được giữ trong lịch sử. Lịch sử bắt đầu từ bản cập nhật này.</p><div class="note-history-list"></div>';
   d.querySelector('header button').onclick=()=>d.remove();
   if(hasUnsyncedChanges){const warning=document.createElement('p');warning.className='subtext';warning.textContent='Đây là lịch sử trên máy chủ. Bản nháp hiện tại chưa đồng bộ; hãy đồng bộ trước khi khôi phục.';d.querySelector('header').after(warning);}
   const list=d.querySelector('.note-history-list');
   if(!response.versions.length)list.textContent='Chưa có phiên bản cũ. Mỗi lần lưu thay đổi được máy chủ chấp nhận sẽ giữ lại bản trước đó.';
   for(const version of response.versions){const item=document.createElement('section');item.className='history-version';const h=document.createElement('h3');h.textContent=new Date(version.saved).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})+' · #'+version.revision;const preview=document.createElement('pre');preview.textContent=version.data.title+'\n\n'+version.data.text+(version.data.type==='todo'?'\n'+(version.data.items||[]).map(x=>(x.done?'☑ ':'☐ ')+x.text).join('\n'):'');const restore=document.createElement('button');restore.type='button';restore.className='btn';restore.textContent='Khôi phục phiên bản này';restore.disabled=hasUnsyncedChanges;restore.onclick=()=>{if(owner!==currentUser?.id)return;if(dirty||syncing||syncConflict||(typeof _WF!=='undefined'&&_WF.note?.pending)){notify('Hãy đồng bộ bản nháp trước khi khôi phục.');return;}d.remove();editor.close();const target=data.notes?.find(x=>x.id===id);if(!target)return;const before=structuredClone(target);Object.keys(target).forEach(k=>delete target[k]);Object.assign(target,structuredClone(version.data),{id});if(!save()){Object.keys(target).forEach(k=>delete target[k]);Object.assign(target,before);return;}render();noteForm(target);notify('Đã khôi phục · đang đồng bộ và lưu lịch sử.');};item.append(h,preview,restore);list.append(item);}
   composer.append(d);d.scrollIntoView({block:'nearest'});
  }catch(e){notify(e.message);}finally{history.disabled=false;}
 };
};
const globalTasksPage=tasksPage;
tasksPage=function(){return '<div class="all-tasks-create"><button type="button" class="btn primary" data-global-task>+ Công việc mới</button></div>'+globalTasksPage();};
document.addEventListener('click',e=>{if(!e.target.closest('[data-global-task]'))return;const p=data.projects.find(x=>x.id===filterProject)||data.projects.find(x=>!x.archived);if(!p)return notify('Tạo dự án trước khi thêm công việc.');taskForm(p,null);});
// Keep the task draft intact when changing its assigned project.
document.addEventListener('change',e=>{if(e.target.name!=='projectId')return;const p=project(e.target.value),form=e.target.form;if(!p||!form)return;const col=form.querySelector('[name=col]');col.replaceChildren(...p.columns.map(c=>{const o=document.createElement('option');o.textContent=c;o.value=c;return o;}));col.value=p.columns.includes('List')?'List':p.columns[0];form.querySelectorAll('[name=project-keyword]').forEach(x=>{x.checked=false;x.disabled=true;});});
// Acknowledged status has a distinct green icon, independent of the wording.
const releaseSyncStatus=syncStatus;
syncStatus=function(message,kind){releaseSyncStatus(message,kind);const el=$('#save-state');if(el?.dataset.sync==='saved'){el.firstElementChild.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 18a5 5 0 1 1 0-10 6 6 0 0 1 11-1 4.5 4.5 0 0 1 0 9"/><path d="m8 15 3 3 6-6"/></svg>';}};

document.addEventListener('click',e=>{const choice=e.target.closest('[data-project-option]');const active=e.target.closest('.task-project-picker');document.querySelectorAll('.task-project-picker[open]').forEach(picker=>{if(picker!==active)picker.open=false;});if(!choice)return;const picker=choice.closest('.task-project-picker'),input=picker?.querySelector('[name=projectId]'),summary=picker?.querySelector('summary');if(!picker||!input||!summary)return;input.value=choice.dataset.projectOption;const icon=summary.querySelector('.task-project-current-icon'),name=summary.querySelector('.task-project-current-name');if(icon){icon.textContent=choice.dataset.projectIcon||'';icon.style.setProperty('--project-choice-color',choice.dataset.projectColor||'#7950c8');}if(name)name.textContent=choice.dataset.projectName||'';picker.querySelectorAll('[data-project-option]').forEach(option=>option.setAttribute('aria-pressed',String(option===choice)));picker.open=false;input.dispatchEvent(new Event('change',{bubbles:true}));});
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const picker=e.target.closest('.task-project-picker[open]');if(picker){picker.open=false;picker.querySelector('summary')?.focus();}});
