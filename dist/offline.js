'use strict';
const offlineMergeReady=import('/modules/merge.mjs');
let conflictReview=null;
rebaseWorkspace=async function(owner){
 const generation=localGeneration;
 try{
  const remote=await requestAPI('workspace');
  if(currentUser?.id!==owner||generation!==localGeneration||!cloudBase)return false;
  const {mergeThreeWay}=await offlineMergeReady;
  if(currentUser?.id!==owner||generation!==localGeneration)return false;
  const result=mergeThreeWay(cloudBase,data,remote.data);
  if(result.conflicts.length){conflictReview={owner,generation,base:structuredClone(cloudBase),local:structuredClone(data),remote,conflicts:result.conflicts};return false;}
  if(!valid(result.value))return false;
  data=result.value;cloudRevision=remote.revision;cloudBase=structuredClone(remote.data);dirty=JSON.stringify(data)!==JSON.stringify(remote.data);syncConflict=false;await cacheCloud();
  return true;
 }catch{return false;}
};
function reviewSyncConflict(){
 if(!conflictReview||currentUser?.id!==conflictReview.owner)return notify('Bấm Đồng bộ ngay để kiểm tra phiên bản mới nhất.');
 const review=conflictReview;
 const show=value=>value===undefined?'(Đã xóa)':typeof value==='string'?value:JSON.stringify(value,null,2);
 const title=path=>path.map(p=>typeof p==='object'?'#'+p.id:p).join(' › ');
 modal('<h2>Phát hiện thay đổi từ nhiều thiết bị</h2><p>Chọn giá trị cho những nội dung khác nhau. Các thay đổi độc lập được giữ từ cả hai bản.</p><p>Bản thiết bị này · Máy chủ #'+review.remote.revision+' (có thể gồm nhiều thiết bị).</p><div class="help-actions"><button type="button" class="btn" id="prefer-local">Ưu tiên thiết bị này</button><button type="button" class="btn" id="prefer-remote">Ưu tiên bản máy chủ</button></div>'+review.conflicts.map((c,i)=>'<section class="panel"><strong>'+esc(title(c.path))+'</strong><label class="check-row"><input type="radio" name="conflict-'+i+'" value="local" required><span>Thiết bị này</span></label><pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto">'+esc(show(c.local))+'</pre><label class="check-row"><input type="radio" name="conflict-'+i+'" value="remote" required><span>Máy chủ</span></label><pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto">'+esc(show(c.remote))+'</pre></section>').join(''),async fd=>{
  if(currentUser?.id!==review.owner||localGeneration!==review.generation)return notify('Có chỉnh sửa mới. Đóng hộp thoại và Đồng bộ ngay để đối chiếu lại.');
  const decisions=Object.fromEntries(review.conflicts.map((c,i)=>[c.key,fd.get('conflict-'+i)]));
  if(Object.values(decisions).some(v=>!['local','remote'].includes(v)))return;
  const result=(await offlineMergeReady).mergeThreeWay(review.base,review.local,review.remote.data,decisions);
  if(result.conflicts.length||!valid(result.value))return notify('Bản hợp nhất cần được kiểm tra. Dữ liệu gốc vẫn được giữ.');
  const store=await persistenceReady;
  await store.set(KEY+'-recovery-'+Date.now(),{data:review.local,remote:review.remote,meta:{dirty:true,base:review.base}});
  if(currentUser?.id!==review.owner||localGeneration!==review.generation)return notify('Có chỉnh sửa mới; bản sao đã lưu, chưa áp dụng lựa chọn.');
  data=result.value;cloudBase=structuredClone(review.remote.data);cloudRevision=review.remote.revision;dirty=true;localGeneration++;syncConflict=false;syncBlocked=false;
  await cacheCloud();conflictReview=null;$('#editor').close();render();await flushCloud(true);
 });
 for(const [id,value]of [['prefer-local','local'],['prefer-remote','remote']])$('#'+id).onclick=()=>{for(const input of $('#editor').querySelectorAll('input[type=radio]'))input.checked=input.value===value;};
}
const oldManualReport=renderManualSyncReport;
renderManualSyncReport=function(outcome,options){oldManualReport(outcome,options);if(outcome==='conflict'&&conflictReview){const button=document.createElement('button');button.type='button';button.className='btn primary';button.textContent='Xem và hợp nhất từng thay đổi';button.onclick=reviewSyncConflict;$('#sync-report')?.prepend(button);}};

const offlineFilesReady=import('/modules/offline-files.mjs');
let fileQueueRunning=false;
async function drainOfflineFiles(){
 if(fileQueueRunning||!currentUser||!navigator.onLine||dirty||syncConflict)return;
 fileQueueRunning=true;const owner=currentUser.id;
 try{
  const store=await offlineFilesReady;
  for(const record of await store.list(owner)){
   if(currentUser?.id!==owner||dirty||!navigator.onLine)break;
   if(record.status==='uploaded'||record.retryAfter>Date.now())continue;
   try{
    if(!await store.verify(record))throw Error('Tệp cục bộ không còn nguyên vẹn. Chưa gửi lên máy chủ.');
    if(record.serverId){const existing=await requestAPI('assets?scope='+encodeURIComponent(record.scope));if(existing.files.some(f=>f.id===record.serverId)){record.status='uploaded';record.error='';await store.put(record);continue;}}
    if(currentUser?.id!==owner)break;
    if(!record.serverId){const result=await requestAPI('assets/start','POST',{name:record.name,size:record.size,mime:record.mime,scope:record.scope});record.serverId=result.id;record.chunk=result.chunk;await store.put(record);}
    if(!Number.isSafeInteger(record.chunk)||record.chunk<=0)throw Error('Kích thước tải tệp không hợp lệ.');
    let part=0;
    for(let offset=0;offset<record.size;offset+=record.chunk){
     if(currentUser?.id!==owner)throw Error('Tài khoản đã thay đổi.');
     const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
     try{const response=await fetch('/api/assets/'+encodeURIComponent(record.serverId)+'/part?n='+(++part),{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/octet-stream'},body:record.blob.slice(offset,offset+record.chunk),signal:controller.signal});if(!response.ok)throw Object.assign(Error((await response.json()).error||'Chưa tải được tệp.'),{status:response.status});}finally{clearTimeout(timer);}
    }
    if(currentUser?.id!==owner)throw Error('Tài khoản đã thay đổi.');
    await requestAPI('assets/'+record.serverId+'/complete','POST',{});
    record.status='uploaded';record.error='';await store.put(record);
   }catch(error){
    // Expired upload slots can restart; network errors retain the same remote ID.
    if(error.status===404||error.status===410){record.serverId=null;record.chunk=null;}
    record.error=error.message;record.attempts=(record.attempts||0)+1;record.retryAfter=Date.now()+Math.min(600000,2000*2**Math.min(record.attempts,8));await store.put(record);break;
   }
  }
 }finally{fileQueueRunning=false;}
}
function openOfflineFiles(scope=''){
 if(!currentUser)return;const owner=currentUser.id;
 const options=[...data.projects.map(p=>({value:'project:'+p.id,label:p.name})),...(data.notes||[]).map(n=>({value:'note:'+n.id,label:n.title||'Ghi chú'}))];
 modal('<h2>Tệp trên thiết bị</h2><p>Lưu tệp trước, tự tải lên khi dữ liệu dự án đã đồng bộ. Tối đa 25 MB/tệp và 250 MB trên thiết bị.</p><label>Lưu trong<select id="offline-file-scope">'+options.map(o=>'<option value="'+esc(o.value)+'" '+(o.value===scope?'selected':'')+'>'+esc(o.label)+'</option>').join('')+'</select></label><input id="offline-file-picker" type="file" multiple><p id="offline-file-status" role="status"></p><div id="offline-file-list"></div>',null,true);
 const refresh=async()=>{const files=await(await offlineFilesReady).list(owner);if(currentUser?.id!==owner||!$('#offline-file-list'))return;$('#offline-file-list').replaceChildren();for(const f of files){const row=document.createElement('div');row.className='trash-row';const name=document.createElement('span');name.textContent=f.name+' · '+(f.status==='uploaded'?'Có trên máy và cloud':'Đang chờ đồng bộ')+(f.error?' · '+f.error:'');const open=document.createElement('button');open.type='button';open.className='btn';open.textContent='Mở bản trên máy';open.onclick=()=>{const url=URL.createObjectURL(f.blob),a=document.createElement('a');a.href=url;a.download=f.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);};row.append(name,open);$('#offline-file-list').append(row);}};
 $('#offline-file-picker').onchange=async e=>{const picker=e.target;picker.disabled=true;try{const target=$('#offline-file-scope').value;if(!options.some(o=>o.value===target))throw Error('Hãy chọn dự án hoặc ghi chú.');for(const file of picker.files)await(await offlineFilesReady).enqueue(owner,target,file);$('#offline-file-status').textContent='Đã lưu tệp hoàn chỉnh trên thiết bị.';navigator.storage?.persist?.().catch(()=>{});await refresh();await drainOfflineFiles();await refresh();}catch(error){if($('#offline-file-status'))$('#offline-file-status').textContent=error.message;}finally{picker.disabled=false;}};refresh();
}
const offlineAssetPanel=assetPanel;
assetPanel=async function(scope,...rest){if(!navigator.onLine)return openOfflineFiles(scope);return offlineAssetPanel(scope,...rest);};
const offlineResourceUploader=openResourceUploader;
openResourceUploader=function(){if(!navigator.onLine)return openOfflineFiles();return offlineResourceUploader();};
const offlineAccountPanel=accountPanel;
accountPanel=function(){offlineAccountPanel();if(!currentUser)return;const row=document.createElement('section');row.className='profile-card';row.innerHTML='<h3>Làm việc ngoại tuyến</h3><button type="button" class="btn" id="local-files-open">Tệp trên thiết bị</button><button type="button" class="btn" id="local-unlock-setup">Đặt mật khẩu mở khóa offline</button><p class="help-copy">Mật khẩu offline chỉ mở dữ liệu đã lưu trên thiết bị; đồng bộ vẫn cần phiên đăng nhập máy chủ hợp lệ.</p>';$('#editor-body').append(row);$('#local-files-open').onclick=()=>openOfflineFiles();$('#local-unlock-setup').onclick=setupLocalUnlock;};
// Rebind the settings controls that originally captured the previous function.
for(const button of document.querySelectorAll('#settings-slot button,.top-actions>.avatar'))button.onclick=accountPanel;
window.addEventListener('online',()=>{setTimeout(drainOfflineFiles,1500);});
setInterval(()=>{if(!document.hidden)drainOfflineFiles().catch(()=>{});},15000);

async function localPasswordHash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new Uint8Array(salt),iterations:310000,hash:'SHA-256'},key,256)));}
async function setupLocalUnlock(){
 if(!currentUser)return;const owner=currentUser.id;
 modal('<h2>Mở khóa khi không có mạng</h2><p>Đặt mật khẩu riêng từ 10 ký tự. Dùng khóa màn hình của hệ điều hành để bảo vệ thiết bị; dữ liệu ứng dụng hiện chưa mã hóa toàn bộ.</p><label>Mật khẩu offline<input type="password" name="localPassword" minlength="10" required autocomplete="new-password"></label><label>Nhập lại<input type="password" name="confirmPassword" minlength="10" required autocomplete="new-password"></label>',async fd=>{
  const password=fd.get('localPassword');if(password!==fd.get('confirmPassword'))return notify('Hai mật khẩu chưa khớp.');if(password.length<10)return;
  const salt=Array.from(crypto.getRandomValues(new Uint8Array(16))),hash=await localPasswordHash(password,salt);
  if(currentUser?.id!==owner)return;
  await(await persistenceReady).set('unlock:'+owner,{salt,hash,failures:0,retryAfter:0});await cacheCloud();$('#editor').close();notify('Đã đặt mật khẩu mở khóa offline trên thiết bị này.');
 });
}
const authScreenBeforeOffline=authScreen;
authScreen=function(...args){authScreenBeforeOffline(...args);let cached;try{cached=JSON.parse(localStorage.getItem('zen-offline-account')||'null');}catch{}if(!cached)return;const button=document.createElement('button');button.type='button';button.className='btn';button.textContent='Mở dữ liệu trên thiết bị';button.onclick=()=>openOfflineAccount(true);document.querySelector('.auth-card')?.append(button);};
openOfflineAccount=async function(explicit=false){
 if(navigator.onLine&&!explicit)return false;
 try{
  const user=JSON.parse(localStorage.getItem('zen-offline-account')||'null');if(!user||typeof user.id!=='string')return false;
  const store=await persistenceReady,unlock=await store.get('unlock:'+user.id);
  if(!unlock){if(explicit)notify('Hãy đăng nhập online và đặt mật khẩu offline trong Settings trước.');return false;}
  currentUser=null;
  authScreen('login','Mở dữ liệu cục bộ bằng mật khẩu offline.');
  modal('<h2>Mở khóa dữ liệu trên thiết bị</h2><p>'+esc(user.email||'')+'</p><label>Mật khẩu offline<input type="password" name="unlockPassword" required autocomplete="current-password"></label>',async fd=>{
   const fresh=await store.get('unlock:'+user.id);if(!fresh)return;
   if(fresh.retryAfter>Date.now())return notify('Vui lòng chờ trước khi thử lại.');
   const hash=await localPasswordHash(fd.get('unlockPassword'),fresh.salt);
   if(hash.length!==fresh.hash.length||hash.some((n,i)=>n!==fresh.hash[i])){fresh.failures=(fresh.failures||0)+1;fresh.retryAfter=Date.now()+Math.min(600000,1000*2**Math.min(10,fresh.failures));await store.set('unlock:'+user.id,fresh);return notify('Mật khẩu chưa đúng.');}
   const key='zen-account-'+user.id,record=await store.loadAccount(key);if(!record||!valid(record.data))return notify('Chưa có dữ liệu cục bộ hợp lệ.');
   fresh.failures=0;fresh.retryAfter=0;await store.set('unlock:'+user.id,fresh);
   currentUser=user;KEY=key;data=record.data;cloudRevision=record.meta.revision;dirty=!!record.meta.dirty;cloudBase=record.meta.base||structuredClone(data);syncConflict=false;syncBlocked=false;localOnlyUnlocked=true;
   document.body.classList.remove('signed-out');$('#auth-screen')?.remove();$('#editor').close();active=null;query='';view='dashboard';render();renderAccountAvatar();startIdleSession(Date.now()+600000);syncStatus('Đã mở dữ liệu trên máy · Đồng bộ cần phiên hợp lệ','offline');
  });return true;
 }catch{return false;}
};
let localOnlyUnlocked=false;
const touchBeforeLocal=touchSession;
touchSession=async function(){if(localOnlyUnlocked){if(Date.now()>=sessionDeadline)return signOutAccount(true);startIdleSession(Date.now()+600000);return;}return touchBeforeLocal();};
const signOutBeforeLocal=signOutAccount;
signOutAccount=async function(automatic=false){if(automatic&&localOnlyUnlocked){await cacheCloud();clearTimeout(idleTimer);clearTimeout(syncTimer);currentUser=null;localOnlyUnlocked=false;data={schema:1,projects:[],notes:[]};document.querySelectorAll('dialog[open]').forEach(d=>d.close());for(const id of ['main','side-projects','tabs'])$('#'+id).replaceChildren();authScreen('login','Dữ liệu cục bộ đã khóa.');return;}return signOutBeforeLocal(automatic);};
const openAccountBeforeLocal=openAccount;
openAccount=async function(){await openAccountBeforeLocal();localOnlyUnlocked=false;};

// Cache individual cloud files only after the user explicitly requests an offline copy.
new MutationObserver(()=>{
 for(const link of document.querySelectorAll('#asset-list a[href^="/api/assets/"],#main .resource-card a[href^="/api/assets/"]')){
  if(link.dataset.offlineAction)continue;link.dataset.offlineAction='1';
  const url=new URL(link.href),id=url.pathname.split('/').pop();if(!/^[a-f0-9-]+$/.test(id))continue;
  const button=document.createElement('button');button.type='button';button.className='btn';button.textContent='Lưu trên thiết bị';
  button.onclick=async()=>{const owner=currentUser?.id;if(!owner)return;button.disabled=true;try{
   const metadata=await requestAPI('resources?search='+encodeURIComponent(link.textContent.trim()));
   const f=metadata.files?.find(f=>f.id===id);if(!f||f.size>25000000)throw Error('Chưa tìm được thông tin tệp hoặc tệp vượt 25 MB.');
   const response=await fetch(url.pathname,{credentials:'same-origin'});if(!response.ok)throw Error('Chưa tải được tệp.');
   const blob=await response.blob();if(blob.size!==f.size)throw Error('Dung lượng tệp tải về chưa đúng.');if(currentUser?.id!==owner)throw Error('Tài khoản đã thay đổi.');
   const store=await offlineFilesReady,record=await store.enqueue(owner,f.scope,new File([blob],f.name,{type:f.mime}));record.status='uploaded';record.serverId=id;await store.put(record);button.textContent='Đã có trên thiết bị';
  }catch(error){notify(error.message);button.disabled=false;}};
  link.parentElement.append(button);
 }
}).observe(document.body,{childList:true,subtree:true});

// Manual retries must present competing field values before applying a preference.
resolveManualSyncConflict=async function(owner){if(!syncConflict)return true;return await rebaseWorkspace(owner);};

let lastConflictPrompt='';
function promptConflictWhenIdle(){
 if(!syncConflict||!conflictReview||document.hidden||$('#editor').open)return;
 const stamp=conflictReview.owner+':'+conflictReview.generation+':'+conflictReview.remote.revision;
 if(stamp===lastConflictPrompt)return;
 lastConflictPrompt=stamp;reviewSyncConflict();
}
const syncStatusBeforeConflictPrompt=syncStatus;
syncStatus=function(...args){syncStatusBeforeConflictPrompt(...args);setTimeout(promptConflictWhenIdle,0);};
$('#editor').addEventListener('close',()=>setTimeout(promptConflictWhenIdle,0));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)promptConflictWhenIdle();});
