'use strict';
const persistenceReady=import('/modules/persistence.mjs');const deltaReady=import('/modules/delta.mjs');let pendingLocalSave=Promise.resolve(),localGeneration=0;
let currentUser=null,cloudRevision=0,dirty=false,syncing=false,syncConflict=false,syncTimer;
let invalidDraftForRecovery=null;
let lastSyncFailure=null;
function offerInvalidDraftDownload(){if(!invalidDraftForRecovery)return;const message=document.querySelector("#auth-message");if(!message||document.querySelector("#recover-draft"))return;const button=document.createElement("button");button.id="recover-draft";button.type="button";button.className="btn";button.textContent="Tải bản nháp chưa đồng bộ (JSON)";button.onclick=()=>{const url=URL.createObjectURL(new Blob([invalidDraftForRecovery],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="kanban-ban-nhap-chua-dong-bo.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};message.after(button);}

const legacyData=localStorage.getItem('zen-kanban-v1');
async function requestAPI(path,method='GET',body){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),20000);
 try{
  const route=method==='GET'&&/^workspace(?:\?|$)/.test(path)?path.replace('workspace','workspace-v2'):path;const r=await fetch('/api/'+route,{method,credentials:'same-origin',signal:controller.signal,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  const result=await r.json().catch(()=>({error:'Máy chủ trả về phản hồi không hợp lệ.'}));
  if(!r.ok&&result.code==='REAUTH_REQUIRED'){await reauthenticate();return await requestAPI(path,method,body);}
  if(!r.ok)throw Object.assign(new Error(result.error||'Yêu cầu không thành công'),{status:r.status,code:result.code});
  return result;
 }catch(error){
  if(error.name==='AbortError')throw Object.assign(new Error('Kết nối quá thời gian chờ. Dữ liệu đã lưu tại thiết bị.'),{status:0});
  throw error;
 }finally{clearTimeout(timer);}
}
function authScreen(mode='login',message=''){document.body.classList.add('signed-out');document.querySelector('#auth-screen')?.remove();const screen=document.createElement('section');screen.id='auth-screen';const reset=mode==='reset',register=mode==='register',forgot=mode==='forgot',verify=mode==='verify';screen.innerHTML=`<div class="auth-story"><a class="auth-logo" href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" aria-hidden="true"><defs><linearGradient id="auth-wisdom" x1="8" y1="12" x2="56" y2="54" gradientUnits="userSpaceOnUse"><stop stop-color="#7544b8"/><stop offset=".55" stop-color="#d76aa1"/><stop offset="1" stop-color="#ef9656"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="19" fill="url(#auth-wisdom)"/><path d="M10 33s8-13 22-13 22 13 22 13-8 13-22 13S10 33 10 33Z" stroke="white" stroke-width="2.6" stroke-linejoin="round"/><circle cx="32" cy="33" r="7.5" stroke="white" stroke-width="2.5"/><circle cx="32" cy="33" r="2.6" fill="white"/><path d="m32 10 2.4 4.4L32 18l-2.4-3.6L32 10Z" fill="white"/><path d="M21 15l2 3m20-3-2 3" stroke="white" stroke-width="2" stroke-linecap="round"/></svg><span class="auth-wordmark">kanban <small>ZEN STUDIO</small></span></a><span class="eyebrow">KHÔNG GIAN LÀM VIỆC CÁ NHÂN</span><h1>Gọn công việc.<br>Rộng tâm trí.</h1><p>Từ ý tưởng đầu tiên đến công việc hoàn thành.<br>Mọi dự án của bạn, luôn ở cùng một nơi.</p><div class="auth-mini"><span>Ý tưởng</span><span>Cần làm</span><span>Đang làm</span><span>Hoàn thành ✓</span></div><small>Một sản phẩm thuộc Zen Studio</small></div><div class="auth-card"><span class="eyebrow">CHÀO MỪNG BẠN</span><h2>${register?'Tạo tài khoản':forgot?'Quên mật khẩu':reset?'Mật khẩu mới':verify?'Xác minh email':'Trở lại không gian của bạn'}</h2><p id="auth-message" role="status" tabindex="-1">${esc(message)}</p><form id="auth-form">${!reset&&!verify?field('Email','email','','email',true,254):''}${!forgot&&!verify?passwordField(register||reset):''}${mode==='login'?'<button type="button" class="text-btn auth-forgot" data-auth="forgot">Quên mật khẩu?</button>':''}${mode==='login'?'<label class="check-row"><input type="checkbox" name="rememberDevice"><span>Ghi nhớ thiết bị này trong 30 ngày</span></label>':''}${register||reset?'<p class="subtext">Mật khẩu từ 10 ký tự. Không dùng lại mật khẩu ở nơi khác.</p>':''}<button class="btn primary" type="submit">${register?'Tạo tài khoản':forgot?'Gửi liên kết khôi phục':reset?'Lưu mật khẩu':verify?'Xác minh email':'Đăng nhập'}</button></form><div class="auth-links">${mode!=='login'?'<button data-auth="login">Đăng nhập</button>':''}${!register?'<button data-auth="register">Tạo tài khoản</button>':''}</div><button id="resend-verify" class="text-btn" hidden>Gửi lại email xác minh</button><p class="auth-note">Dữ liệu riêng theo tài khoản · Đồng bộ giữa thiết bị</p></div>`;document.body.append(screen);screen.querySelectorAll('[data-auth]').forEach(b=>b.onclick=()=>authScreen(b.dataset.auth));screen.querySelector('.password-eye')?.addEventListener('click',e=>{const button=e.currentTarget,input=screen.querySelector('[name=password]'),visible=input.type==='password';input.type=visible?'text':'password';button.setAttribute('aria-pressed',String(visible));button.setAttribute('aria-label',visible?'Ẩn mật khẩu':'Hiện mật khẩu');button.innerHTML=passwordEye(visible);});$('#resend-verify').onclick=async()=>{const email=screen.querySelector('[name=email]')?.value;if(!email)return $('#auth-message').textContent='Nhập email trước khi gửi lại.';try{$('#auth-message').textContent=(await requestAPI('resend','POST',{email})).message;$('#auth-message').dataset.state='success';}catch(e){$('#auth-message').textContent=e.message;$('#auth-message').dataset.state='error';}};$('#auth-form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('[type=submit]');button.disabled=true;try{const values=Object.fromEntries(new FormData(e.target));values.rememberDevice=values.rememberDevice==='on';if(reset||verify)values.token=location.hash.split('=')[1];const result=await requestAPI(mode==='register'?'register':mode==='forgot'?'forgot':reset?'reset':verify?'verify':'login','POST',values);if(mode==='login'){await openAccount();}else if(reset||verify){history.replaceState(null,'','/');authScreen('login',result.message);}else {if(register)$('#resend-verify').hidden=false;$('#auth-message').textContent=result.message;$('#auth-message').dataset.state='success';$('#auth-message').focus();const password=screen.querySelector('[name=password]');if(password){password.value='';password.type='password';const eye=screen.querySelector('.password-eye');eye.setAttribute('aria-pressed','false');eye.setAttribute('aria-label','Hiện mật khẩu');eye.innerHTML=passwordEye();}}}catch(error){if(mode==='login'&&error.status===403&&/xác minh email/.test(error.message))$('#resend-verify').hidden=false;$('#auth-message').textContent=error.message;$('#auth-message').dataset.state='error';offerInvalidDraftDownload();}finally{button.disabled=false;}};}
function syncStatus(message,kind){
 const el=$('#save-state');if(!el)return;
 const text=String(message||'').replace(/^[●•⚠]\s*/,'');
 const state=kind||(/xung đột|từ chối|không hợp lệ|chưa lên|chưa lưu/i.test(text)?'error':/chờ kết nối|mất mạng|chờ mạng/i.test(text)?'offline':/đang đồng bộ|tiếp tục đồng bộ/i.test(text)?'pending':'saved');
 el.replaceChildren();
 const icon=document.createElement('span');icon.className='sync-icon';icon.innerHTML=state==='saved'?svgIcon('cloudCheck'):state==='pending'?'<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5"/></svg>':svgIcon('warning');
 const label=document.createElement('span');label.textContent=text;
 el.append(icon,label);
 el.setAttribute('role','status');el.dataset.sync=state;
 el.setAttribute('aria-label','Trạng thái đồng bộ: '+text);
 let last=0;try{last=Number(localStorage.getItem(KEY+'-last-sync')||0);}catch{}const when=last?' · Lần thành công gần nhất: '+new Date(last).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):' · Chưa ghi nhận lần đồng bộ thành công trên thiết bị này';
 const detail=$('#sync-last-time');if(detail)detail.textContent=last?'Lần đồng bộ thành công gần nhất: '+new Date(last).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Chưa ghi nhận lần đồng bộ thành công trên thiết bị này.';
 el.title=(state==='pending'?'Đang gửi dữ liệu lên máy chủ':state==='saved'?'Dữ liệu đã được máy chủ xác nhận':'Dữ liệu hiện vẫn được giữ trên thiết bị')+when;
}
function cacheCloud(){if(currentUser)localStorage.setItem('zen-offline-account',JSON.stringify({id:currentUser.id,email:currentUser.email,name:currentUser.name||'',session_expires:sessionDeadline||currentUser.session_expires}));const key=KEY,record={data:structuredClone(data),meta:{revision:cloudRevision,dirty,base:structuredClone(cloudBase)}};pendingLocalSave=pendingLocalSave.catch(()=>{}).then(async()=>{const store=await persistenceReady;await store.saveAccount(key,record);});pendingLocalSave.catch(()=>{syncStatus('Bộ nhớ thiết bị chưa lưu được · Hãy xuất JSON','error');notify('Không lưu được bản nháp vào bộ nhớ thiết bị. Hãy xuất JSON trước khi đóng ứng dụng.');});return pendingLocalSave;}
async function openOfflineAccount(){if(navigator.onLine)return false;try{const user=JSON.parse(localStorage.getItem('zen-offline-account')||'null');if(!user||typeof user.id!=='string'||!Number.isFinite(user.session_expires)||user.session_expires<=Date.now())return false;if(currentUser&&currentUser.id!==user.id)return false;const key='zen-account-'+user.id,record=await(await persistenceReady).loadAccount(key);if(!record)return false;const cached=record.data,meta=record.meta;if(!valid(cached)||!Number.isSafeInteger(meta.revision)||meta.revision<0)return false;currentUser=user;KEY=key;data=cached;cloudRevision=meta.revision;dirty=!!meta.dirty;cloudBase=meta.base||structuredClone(cached);syncConflict=false;syncBlocked=false;startIdleSession(user.session_expires);document.body.classList.remove('signed-out');$('#auth-screen')?.remove();active=null;query='';view='dashboard';render();renderAccountAvatar();syncStatus('Đã lưu trên máy · Chờ kết nối','offline');return true;}catch{return false;}}
async function reauthenticate(){return new Promise((resolve,reject)=>{modal('<h2>Xác nhận thao tác</h2><p>Nhập mật khẩu để tiếp tục chia sẻ hoặc xóa vĩnh viễn.</p>'+passwordField(false),async fd=>{try{await requestAPI('reauth','POST',{password:fd.get('password')});$('#editor').close();resolve();}catch(error){notify(error.message);}});$('#editor').addEventListener('close',()=>reject(Object.assign(Error('Đã hủy xác nhận.'),{status:403,code:'REAUTH_CANCELLED'})),{once:true});});}
async function openAccount(){const me=await requestAPI('me');currentUser=me.user;startIdleSession(me.user.session_expires);KEY='zen-account-'+currentUser.id;const remote=await requestAPI('workspace');cloudRevision=remote.revision;dirty=false;syncConflict=false;syncBlocked=false;const localRecord=await(await persistenceReady).loadAccount(KEY),cached=localRecord?(localRecord.raw??JSON.stringify(localRecord.data)):null,meta=localRecord?.meta||{};cloudBase=meta.dirty?meta.base||null:structuredClone(remote.data);if(meta.dirty&&cached){let pending;try{pending=JSON.parse(cached);}catch{}if(pending&&valid(pending)){data=pending;cloudRevision=meta.revision;dirty=true;}else{invalidDraftForRecovery=cached;throw Error('Bản nháp chưa đồng bộ cần được kiểm tra. Hãy tải bản sao JSON để bảo toàn dữ liệu.');}}invalidDraftForRecovery=null;if(!dirty)data=remote.data;if((data.notes||[]).some(n=>n.sketch?.startsWith('data:image/png')))dirty=true;await cacheCloud();document.body.classList.remove('signed-out');$('#auth-screen')?.remove();active=null;query='';view='dashboard';render();syncStatus(dirty?'● Đang đồng bộ…':'● Đã đồng bộ');renderAccountAvatar();if(dirty)await flushCloud();view='dashboard';active=null;query='';render();}
let syncAgain=false,invalidSyncNotified=false,syncBlocked=false;
let cloudBase=null;
async function flushCloud(manual=false){
 if(!currentUser||!dirty)return;
 if(syncConflict){syncStatus('⚠ Xung đột dữ liệu · Chưa ghi đè','error');return;}
 if(syncBlocked&&!manual){syncStatus('⚠ Chưa đồng bộ · Cần kiểm tra dữ liệu','error');return;}
 if(syncing){syncAgain=true;return;}
 if(!navigator.onLine){syncStatus('⚠ Đã lưu trên máy · Chờ kết nối','offline');return;}
 syncing=true;clearTimeout(syncTimer);
 const accountId=currentUser.id;
 let snapshot=structuredClone(data),generation=localGeneration;
 let retry=false;
 try{
  if(!Number.isSafeInteger(cloudRevision)||cloudRevision<0){
   if(typeof rebaseWorkspace!=='function'||!await rebaseWorkspace(accountId)){
    syncConflict=true;lastSyncFailure={status:409,code:'REVISION_RECOVERY_REQUIRED',message:'Mốc phiên bản trên thiết bị không hợp lệ. Cần hợp nhất bản nháp với máy chủ; chưa ghi đè dữ liệu.'};syncStatus('⚠ Cần hợp nhất phiên bản đồng bộ','error');return;
   }
   if(currentUser?.id!==accountId)return;
   snapshot=structuredClone(data);generation=localGeneration;if(!dirty){lastSyncFailure=null;return;}
  }
  await pendingLocalSave;const payload=snapshot;let movedSketch=false;
  for(const n of payload.notes||[])if(n.sketch?.startsWith('data:image/png')){const inline=n.sketch,result=await requestAPI('sketches','POST',{noteId:n.id,png:inline});n.sketch=result.url;const live=data.notes?.find(x=>x.id===n.id);if(live?.sketch===inline){live.sketch=result.url;movedSketch=true;}}
  if(movedSketch)await cacheCloud();
  const {changesBetween}=await deltaReady,changes=changesBetween(cloudBase||{schema:1,projects:[],notes:[]},payload);
  if(!valid(payload)){
   syncBlocked=true;syncStatus('⚠ Dữ liệu không hợp lệ · Chưa đồng bộ','error');
   if(!invalidSyncNotified){notify('Ghi chú hoặc dữ liệu chưa hợp lệ. Bản cục bộ được giữ nguyên.');invalidSyncNotified=true;}
   return;
  }
  syncStatus('● Đang đồng bộ…','pending');
  let response;const bytes=new TextEncoder().encode(JSON.stringify(changes)).length;if(bytes>1500000){const uploadId=crypto.randomUUID(),chunks=[];let chunk=[],size=0;for(const c of changes){const length=new TextEncoder().encode(JSON.stringify(c)).length;if(size+length>800000&&chunk.length){chunks.push(chunk);chunk=[];size=0;}chunk.push(c);size+=length;}if(chunk.length)chunks.push(chunk);for(let i=0;i<chunks.length;i++)await requestAPI('workspace-stage','POST',{uploadId,revision:cloudRevision,expected:changes.length,begin:i===0,changes:chunks[i]});response=await requestAPI('workspace-v2','POST',{uploadId,changes:[],revision:cloudRevision});}else response=await requestAPI('workspace-v2','POST',{changes,revision:cloudRevision});
  if(currentUser?.id!==accountId)return;
  if(!Number.isSafeInteger(response.revision)||response.revision<0)throw Error('Máy chủ trả về mốc phiên bản không hợp lệ. Bản nháp vẫn được giữ.');
  lastSyncFailure=null;cloudRevision=response.revision;cloudBase=payload;try{localStorage.setItem(KEY+'-last-sync',String(Date.now()));}catch{}
  dirty=localGeneration!==generation;
  cacheCloud();
  invalidSyncNotified=false;syncBlocked=false;
  syncStatus(dirty?'● Đã lưu trên máy · Tiếp tục đồng bộ':'● Đã đồng bộ',dirty?'pending':'saved');
  retry=dirty;
 }catch(error){
  if(currentUser?.id!==accountId)return;
  lastSyncFailure={status:error.status||0,code:error.code||'SYNC_REQUEST_FAILED',message:error.message||'Không thể gửi dữ liệu.'};
  if(error.status===409){
   if(typeof rebaseWorkspace==='function'&&await rebaseWorkspace(accountId)){retry=dirty;return;}
   syncConflict=true;
   syncStatus('⚠ Xung đột dữ liệu · Chưa ghi đè','error');
   notify('Có thay đổi từ thiết bị khác. Bản trên máy của bạn được giữ nguyên.');
  }else if([400,403,413,422].includes(error.status)){
   syncBlocked=true;
   syncStatus('⚠ Máy chủ từ chối dữ liệu · Chưa đồng bộ','error');
   if(!invalidSyncNotified){notify('Dữ liệu chưa được máy chủ chấp nhận. Bản nháp vẫn ở thiết bị.');invalidSyncNotified=true;}
  }else{
   retry=true;
   syncStatus('⚠ Đã lưu trên máy · Chờ kết nối','offline');
   if(error.status===401)notify('Phiên đăng nhập hết hạn. Bản nháp vẫn ở trên thiết bị.');
  }
 }finally{
  syncing=false;
  if(dirty&&!syncConflict&&!syncBlocked&&retry&&navigator.onLine&&currentUser?.id===accountId){
   clearTimeout(syncTimer);syncTimer=setTimeout(()=>flushCloud(),syncAgain?800:6000);
  }
  syncAgain=false;
 }
}
save=function(){
 if(!currentUser)return false;
 try{
  dirty=true;localGeneration++;
  cacheCloud();
  invalidSyncNotified=false;
  if(syncConflict){syncStatus('⚠ Xung đột dữ liệu · Chưa ghi đè','error');return true;}
  if(syncBlocked){syncStatus('⚠ Bản nháp đã lưu · Chưa đồng bộ','error');return true;}
  syncStatus(navigator.onLine?'● Đã lưu trên máy · Đang đồng bộ':'⚠ Đã lưu trên máy · Chờ kết nối',navigator.onLine?'pending':'offline');
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>flushCloud(),750);
  return true;
 }catch{
  syncStatus('⚠ Không thể lưu bản nháp trên máy','error');
  notify('Bộ nhớ cục bộ không thể lưu. Hãy xuất bản sao JSON.');
  return false;
 }
};
async function pollCloud(){if(pollCloud.running)return;pollCloud.running=true;try{await pollCloudOnce();}finally{pollCloud.running=false;}}
async function pollCloudOnce(){if(document.hidden||!currentUser||dirty||syncing||$('#editor').open||typeof ganttPointer!=='undefined'&&ganttPointer)return;try{const requestedOwner=currentUser.id,requestedRevision=cloudRevision;const remote=await requestAPI('workspace?revision='+requestedRevision);if(currentUser?.id!==requestedOwner||dirty||syncing||$('#editor').open||typeof ganttPointer!=='undefined'&&ganttPointer||requestedRevision!==cloudRevision)return;pollCloud.delay=remote.unchanged?Math.min((pollCloud.delay||10000)*2,120000):10000;if(!remote.unchanged&&remote.revision!==cloudRevision){data=remote.data;cloudBase=structuredClone(remote.data);cloudRevision=remote.revision;cacheCloud();render();syncStatus('● Đã cập nhật từ thiết bị khác');}}catch{pollCloud.delay=Math.min((pollCloud.delay||10000)*2,120000);syncStatus('⚠ Chờ kết nối');}}

/* Manual synchronization reports only verified server outcomes, never just local saves. */
function manualSyncSummary(outcome,{uploaded=false,downloaded=false}={}){
 const variants={
  synced:['Đồng bộ thành công',downloaded?'Đã nhận bản cập nhật mới từ máy chủ và lưu trên thiết bị.':uploaded?'Thay đổi trên thiết bị đã được máy chủ xác nhận.':'Dữ liệu trên thiết bị và máy chủ đang cùng phiên bản. Không có thay đổi mới.'],
  conflict:['Có xung đột dữ liệu','Có thay đổi từ thiết bị khác. Bản nháp trên máy vẫn được giữ nguyên; chưa ghi đè dữ liệu máy chủ.'],
  invalid:['Chưa thể đồng bộ','Dữ liệu chưa hợp lệ hoặc quá lớn nên máy chủ chưa chấp nhận. Bản nháp trên thiết bị vẫn được giữ lại.'],
  offline:['Chưa kết nối được','Không thể xác nhận dữ liệu với máy chủ. Bản nháp trên thiết bị được giữ nguyên.'],
  pending:['Còn dữ liệu đang chờ','Có thay đổi mới trong lúc gửi hoặc một yêu cầu đồng bộ đang xử lý. Chưa thể xác nhận toàn bộ dữ liệu.'],
  error:['Đồng bộ chưa thành công','Không thể xác nhận trạng thái từ máy chủ. Bản nháp trên thiết bị không bị xóa.']
 };
 const [title,detail]=variants[outcome]||variants.error;
 return {title,detail};
}
function renderManualSyncReport(outcome,options={}){
 const node=document.querySelector('#sync-report');if(!node)return;
 node.hidden=false;node.dataset.result=outcome;
 node.replaceChildren();
 const summary=manualSyncSummary(outcome,options);
 const header=document.createElement('div');header.className='sync-report-heading';
 const mark=document.createElement('span');mark.className='sync-report-mark';mark.textContent=outcome==='synced'?'✓':outcome==='pending'?'↻':'!';
 mark.setAttribute('aria-hidden','true');
 const title=document.createElement('strong');title.textContent=summary.title;header.append(mark,title);
 const desc=document.createElement('p');desc.textContent=summary.detail;
 if(outcome==='invalid'){try{const bytes=new TextEncoder().encode(JSON.stringify({data,revision:cloudRevision})).length;if(bytes>1900000)desc.textContent='Bản nháp vượt giới hạn đồng bộ ('+Math.ceil(bytes/1024)+' KB / khoảng 1.855 KB). Hãy xuất bản sao JSON trước khi điều chỉnh dữ liệu.';else if(!valid(data))desc.textContent='Bản nháp không vượt giới hạn dung lượng nhưng có dữ liệu không hợp lệ. Hãy xuất bản sao JSON để kiểm tra; dữ liệu trên thiết bị được giữ lại.';else desc.textContent='Dữ liệu đã qua kiểm tra trên thiết bị nhưng máy chủ từ chối. Hãy xuất bản sao JSON và liên hệ hỗ trợ để xác định lỗi.';}catch{}}
 node.append(header,desc);
 if(lastSyncFailure&&outcome!=='synced'){const diagnostic=document.createElement('p');diagnostic.className='sync-report-meta';diagnostic.textContent='Chi tiết: '+lastSyncFailure.message+' · HTTP '+lastSyncFailure.status+' · '+lastSyncFailure.code;node.append(diagnostic);}
 if(outcome==='conflict'){
  const action=document.createElement('button');action.type='button';action.id='merge-conflict-report';action.className='btn';
  action.textContent='Hợp nhất và đồng bộ, giữ cả hai bản';
  node.append(action);
 }
 if(outcome==='synced'&&Number.isInteger(options.revision)){
  const count=document.createElement('p');count.className='sync-report-meta';
  const projectTotal=(data.projects||[]).length;
  const taskTotal=(data.projects||[]).reduce((sum,p)=>sum+(p.tasks||[]).length,0);
  const noteTotal=(data.notes||[]).length;
  count.textContent='Phiên bản dữ liệu #'+options.revision+' · '+projectTotal+' dự án · '+taskTotal+' công việc · '+noteTotal+' ghi chú.';
  node.append(count);
 }
 const stamp=document.createElement('small');stamp.className='sync-report-timestamp';
 stamp.textContent=(outcome==='synced'?'Máy chủ xác nhận lúc ':'Kiểm tra lúc ')+new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());
 node.append(stamp);
}
async function resolveManualSyncConflict(owner){
 if(!syncConflict)return true;
 if(typeof rebaseWorkspace==='function'&&await rebaseWorkspace(owner)){syncConflict=false;return true;}
 // A manual sync keeps concurrent edits by copying the local version before retrying.
 if(typeof preserveConflictCopies==='function'){
  await preserveConflictCopies();
  return currentUser?.id===owner&&!dirty&&!syncConflict&&!syncBlocked;
 }
 return false;
}
/* Keep remote conflicts and unsent drafts intact. GET is a read-only revision check. */
async function runManualSyncReport(){
 const button=document.querySelector('#sync-now');
 if(!button||button.disabled||!currentUser)return;
 const initialUser=currentUser.id;
 button.disabled=true;button.setAttribute('aria-busy','true');button.classList.add('sync-now-working');
 const panel=document.querySelector('#sync-report');
 if(panel){
  panel.hidden=false;panel.dataset.result='pending';panel.replaceChildren();
  const heading=document.createElement('strong');heading.textContent='Đang kiểm tra máy chủ…';
  const detail=document.createElement('p');detail.textContent='Đang gửi dữ liệu chờ và xác minh phiên bản mới nhất.';
  panel.append(heading,detail);
 }
 let uploaded=false,downloaded=false;
 try{
  if(!navigator.onLine){renderManualSyncReport('offline');return;}
  if(syncConflict&&!await resolveManualSyncConflict(initialUser)){renderManualSyncReport('conflict');return;}
  if(syncing){
   const started=Date.now();
   while(syncing&&Date.now()-started<22000){
    await new Promise(resolve=>setTimeout(resolve,150));
    if(currentUser?.id!==initialUser)return;
   }
   if(syncing){renderManualSyncReport('pending');return;}
  }
  if(dirty){
   const before=cloudRevision;
   syncBlocked=false;
   await flushCloud(true);
   if(dirty&&!syncConflict&&!syncBlocked&&!syncing&&currentUser?.id===initialUser)await flushCloud(true);
   if(currentUser?.id!==initialUser)return;
   uploaded=cloudRevision>before;
   if(syncConflict&&!await resolveManualSyncConflict(initialUser)){renderManualSyncReport('conflict');return;}
   if(syncBlocked){renderManualSyncReport('invalid');return;}
   if(dirty){renderManualSyncReport(navigator.onLine?'pending':'offline');return;}
  }
  const snapshot=JSON.stringify(data),revision=cloudRevision;
  const remote=await requestAPI('workspace?revision='+encodeURIComponent(revision));
  if(currentUser?.id!==initialUser)return;
  if(dirty||syncing||snapshot!==JSON.stringify(data)){renderManualSyncReport('pending');return;}
  if(!remote.unchanged){
   if(!Number.isInteger(remote.revision)||!valid(remote.data)){
    renderManualSyncReport('error');return;
   }
   if(remote.revision!==cloudRevision){
    if(dirty||snapshot!==JSON.stringify(data)){renderManualSyncReport('pending');return;}
    data=remote.data;cloudBase=structuredClone(remote.data);cloudRevision=remote.revision;cacheCloud();render();downloaded=true;
   }
  }
  try{localStorage.setItem(KEY+'-last-sync',String(Date.now()));}catch{}
  syncStatus('● Đã đồng bộ','saved');
  renderManualSyncReport('synced',{revision:cloudRevision,uploaded,downloaded});
 }catch(error){
  if(currentUser?.id!==initialUser)return;
  renderManualSyncReport(error.status===409?'conflict':[400,413,422].includes(error.status)?'invalid':error.status===0||!navigator.onLine?'offline':'error');
 }finally{
  if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');button.classList.remove('sync-now-working');}
 }
}
function accountPanel(){if(!currentUser)return;modal(`<h2>Settings <small>Cài đặt tài khoản</small></h2><section class="profile-card"><h3>Hồ sơ cá nhân</h3><p class="help-copy">Thông tin được lưu riêng theo tài khoản của bạn.</p><img id="profile-preview" alt="Ảnh đại diện" width="72" height="72" ${currentUser.avatar?'src="'+esc(currentUser.avatar)+'"':'hidden'}><label>Tên hiển thị<input id="profile-name" maxlength="100" value="${esc(currentUser.name||'')}" autocomplete="name"></label><label>Ngày sinh<input id="profile-birthday" type="date" max="${new Date().toISOString().slice(0,10)}" value="${esc(currentUser.birthday||'')}" autocomplete="bday"></label><label>Ảnh đại diện<input id="profile-photo" type="file" accept="image/png,image/jpeg,image/webp"></label><small>PNG, JPG hoặc WebP · tối đa 5 MB · tự thu nhỏ khi lưu.</small><div class="help-actions"><button class="btn primary" type="button" id="save-profile">Lưu hồ sơ</button><button class="btn" type="button" id="remove-photo">Xóa ảnh</button></div><p id="profile-status" role="status"></p></section><h3 class="settings-section">Tài khoản & bảo mật</h3><p>${esc(currentUser.email)}</p><p class="help-copy">Đồng bộ tự động khi chỉnh sửa. Thiết bị khác nhận cập nhật sau khoảng 10 giây khi đang mở; kết nối lại sẽ gửi dữ liệu chờ.</p><h3 class="settings-section">Thông báo</h3><label class="check-row"><input id="email-reminder" type="checkbox" ${currentUser.email_reminders?'checked':''}><span>Nhận email khi có việc đến hạn hoặc quá hạn.</span></label><div class="profile-card reminder-options"><label>Giờ gửi (Việt Nam)<select id="reminder-hour">${Array.from({length:24},(_,h)=>`<option value="${h}" ${h===(currentUser.reminder_hour??8)?'selected':''}>${String(h).padStart(2,'0')}:00</option>`).join('')}</select></label><label>Tần suất<select id="reminder-days">${[1,2,3,7].map(d=>`<option value="${d}" ${d===(currentUser.reminder_days??1)?'selected':''}>${d===1?'Mỗi ngày':d===7?'Mỗi tuần':'Mỗi '+d+' ngày'}</option>`).join('')}</select></label><small>Áp dụng cho email và thông báo trình duyệt. Chu kỳ tính từ lần gửi thành công gần nhất; chỉ gửi khi có việc cần nhắc.</small><button class="btn primary" type="button" id="save-reminders">Lưu lịch thông báo</button><p id="reminder-status" role="status"></p></div><div class="help-actions"><button class="btn" type="button" id="enable-push">Bật thông báo trình duyệt</button><button class="btn" type="button" id="disable-push">Tắt thông báo thiết bị này</button><h3 class="settings-section settings-full">Dữ liệu & đồng bộ</h3><button class="btn sync-now-btn" type="button" id="sync-now" aria-controls="sync-report"><span class="sync-now-icon" aria-hidden="true">${svgIcon('sync')}</span><span>Đồng bộ ngay</span></button><p id="sync-last-time" class="subtext"></p><section id="sync-report" class="sync-report" role="status" aria-live="polite" aria-atomic="true" hidden></section>${legacyData?'<button class="btn" type="button" id="import-legacy">Nhập dữ liệu cũ trên máy</button>':''}<button class="btn" type="button" data-action="export">Xuất bản sao JSON</button><button class="btn" type="button" data-action="import">Nhập JSON</button><button class="btn" type="button" data-action="undo" ${undoData?'':'disabled'}>Hoàn tác lần xóa</button><button class="btn danger" type="button" data-action="clear">Xóa dữ liệu</button>${syncConflict?'<button class="btn" type="button" id="merge-conflict">Hợp nhất và giữ cả hai bản</button><button class="btn danger" type="button" id="resolve-cloud">Dùng bản trên máy chủ</button>':''}<button class="btn danger" type="button" id="sign-out">Đăng xuất</button></div><p class="help-copy" style="margin-top:15px">Thông báo cần được bạn cho phép. Trình duyệt có thể giới hạn thông báo khi bị đóng hoàn toàn. Email nhắc việc có thể tắt bất cứ lúc nào.</p>`,null,true);$('#editor').classList.add('account-dialog');$('#editor').addEventListener('close',()=>$('#editor').classList.remove('account-dialog'),{once:true});let profileAvatar=currentUser.avatar||'';$('#remove-photo').onclick=()=>{profileAvatar='';$('#profile-preview').hidden=true;$('#profile-photo').value='';};$('#profile-photo').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Chọn ảnh PNG, JPG, WebP dưới 5 MB.');const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');canvas.width=canvas.height=192;const ctx=canvas.getContext('2d'),size=Math.min(bitmap.width,bitmap.height);ctx.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,192,192);bitmap.close();profileAvatar=canvas.toDataURL('image/webp',.8);$('#profile-preview').src=profileAvatar;$('#profile-preview').hidden=false;}catch(error){$('#profile-status').textContent=error.message;}};$('#save-profile').onclick=async e=>{e.target.disabled=true;try{const profile=await requestAPI('profile','PUT',{name:$('#profile-name').value,birthday:$('#profile-birthday').value,avatar:profileAvatar});Object.assign(currentUser,profile);renderAccountAvatar();$('#profile-status').textContent='Đã lưu hồ sơ. Các thiết bị khác nhận thông tin khi đăng nhập lại.';}catch(error){$('#profile-status').textContent=error.message;}finally{e.target.disabled=false;}};$('#save-reminders').onclick=async e=>{e.target.disabled=true;try{const hour=Number($('#reminder-hour').value),days=Number($('#reminder-days').value);await requestAPI('preferences','PUT',{emailReminders:$('#email-reminder').checked,hour,days});Object.assign(currentUser,{reminder_hour:hour,reminder_days:days});$('#reminder-status').textContent='Đã lưu lịch thông báo.';}catch(error){$('#reminder-status').textContent=error.message;}finally{e.target.disabled=false;}};$('#email-reminder').onchange=async e=>{try{await requestAPI('preferences','PUT',{emailReminders:e.target.checked});currentUser.email_reminders=e.target.checked?1:0;notify('Đã lưu cài đặt email.');}catch(error){e.target.checked=!e.target.checked;notify(error.message);}};$('#enable-push').onclick=enablePush;$('#disable-push').onclick=async()=>{try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub){await requestAPI('push','DELETE',{endpoint:sub.endpoint});await sub.unsubscribe();}notify('Đã tắt thông báo trên thiết bị này.');}catch(e){notify(e.message);}};$('#sync-now').onclick=runManualSyncReport;const lastSync=$('#sync-last-time');if(lastSync){let time=0;try{time=Number(localStorage.getItem(KEY+'-last-sync')||0)}catch{}lastSync.textContent=time?'Lần đồng bộ thành công gần nhất: '+new Date(time).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Chưa ghi nhận lần đồng bộ thành công trên thiết bị này.';}$('#import-legacy')?.addEventListener('click',()=>modal('<h2>Nhập dữ liệu cũ?</h2><p>Thao tác thêm dự án cũ vào tài khoản này; không xóa dữ liệu đang có. Nhập nhiều lần sẽ tạo các bản sao.</p>',()=>{try{const old=JSON.parse(legacyData);if(!valid(old))throw Error('Dữ liệu cũ không hợp lệ.');for(const p of old.projects){p.id=uid();for(const t of p.tasks){t.id=uid();t.checks.forEach(c=>c.id=uid());}}if(data.projects.length+old.projects.length>100)throw Error('Vượt giới hạn 100 dự án.');data.projects.push(...old.projects);save();render();$('#editor').close();notify('Đã nhập dữ liệu cũ vào tài khoản.');}catch(e){notify(e.message);}}));$('#resolve-cloud')?.addEventListener('click',()=>modal('<h2>Dùng dữ liệu trên máy chủ?</h2><p>Bản chỉnh sửa hiện tại vẫn được lưu thành bản sao trên máy. Bạn nên xuất JSON trước khi tiếp tục. Thao tác này thay bảng đang hiển thị bằng dữ liệu máy chủ.</p>',async()=>{await(await persistenceReady).set(KEY+'-conflict-'+Date.now(),structuredClone(data));try{const remote=await requestAPI('workspace');data=remote.data;cloudBase=structuredClone(remote.data);cloudRevision=remote.revision;dirty=false;syncConflict=false;syncBlocked=false;cacheCloud();$('#editor').close();render();syncStatus('● Đã đồng bộ');}catch(e){notify('Chưa lấy được dữ liệu máy chủ. Bản chỉnh sửa của bạn vẫn được giữ.');}}));$('#sign-out').onclick=()=>modal('<h2>Đăng xuất tài khoản?</h2><p class="help-copy">Đồng bộ các thay đổi trước khi rời không gian làm việc.</p>',()=>signOutAccount(false));const logout=$('#sign-out'),section=document.createElement('section');section.className='settings-signout';section.innerHTML='<h3>Phiên đăng nhập</h3><p>'+(currentUser.remembered?'Đã ghi nhớ thiết bị trong tối đa 30 ngày. Thao tác nhạy cảm yêu cầu xác nhận mật khẩu.':'Tự khóa sau 10 phút không thao tác. Bạn có thể chọn ghi nhớ thiết bị ở lần đăng nhập tiếp theo.')+'</p>';$('#editor-body').append(section);section.append(logout);}

async function enablePush(){try{if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw Error('Trình duyệt chưa hỗ trợ Web Push. Hãy dùng email nhắc việc.');if(await Notification.requestPermission()!=='granted')throw Error('Chưa được cấp quyền thông báo.');await navigator.serviceWorker.register('/sw.js');const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub){const {key}=await requestAPI('push-key');const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/'));sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});}await requestAPI('push','POST',{endpoint:sub.endpoint});notify('Đã bật thông báo nhắc việc hằng ngày trên thiết bị này.');}catch(e){notify(e.message);}}
document.querySelectorAll('.top-actions>.avatar').forEach(b=>{b.removeAttribute('data-action');b.onclick=accountPanel;});const accountButton=document.createElement('button');accountButton.className='nav';accountButton.innerHTML=svgIcon('settings')+' Settings';accountButton.setAttribute('aria-label','Settings — Cài đặt tài khoản');accountButton.onclick=()=>{$('.sidebar').classList.remove('open');accountPanel();};document.querySelector('#settings-slot').append(accountButton);
window.addEventListener('online',()=>flushCloud());document.addEventListener('visibilitychange',()=>{if(!document.hidden){flushCloud();pollCloud();}});async function scheduleCloudPoll(){try{if(navigator.onLine&&!document.hidden){if(dirty)await flushCloud();else await pollCloud();}}finally{setTimeout(scheduleCloudPoll,dirty?10000:pollCloud.delay||10000);}}setTimeout(scheduleCloudPoll,10000);window.addEventListener('focus',()=>{if(dirty)flushCloud();else pollCloud();});
let idleTimer,activityInFlight=false,lastActivitySent=0,sessionDeadline=0;
function startIdleSession(deadline){sessionDeadline=Number(deadline)||Date.now()+600000;clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(Date.now()<sessionDeadline)startIdleSession(sessionDeadline);else signOutAccount(true);},Math.min(86400000,Math.max(0,sessionDeadline-Date.now())));}
async function touchSession(){if(!currentUser||document.hidden||activityInFlight)return;if(Date.now()>=sessionDeadline)return signOutAccount(true);if(Date.now()-lastActivitySent<30000)return;activityInFlight=true;lastActivitySent=Date.now();try{const result=await requestAPI('activity','POST',{});startIdleSession(result.expires);}catch(e){if(e.status===401)signOutAccount(true);}finally{activityInFlight=false;}}
async function signOutAccount(automatic=false){if(!currentUser)return;try{if(automatic){try{const me=await requestAPI('me');if(me.user.id===currentUser.id&&me.user.session_expires>Date.now()){startIdleSession(me.user.session_expires);return;}}catch{}}if(!automatic){await flushCloud();if(dirty){notify('Còn dữ liệu chưa đồng bộ. Hãy xuất JSON hoặc chờ đồng bộ trước khi đăng xuất.');return;}await requestAPI('logout','POST',{});}else{if(dirty)cacheCloud();requestAPI('logout','POST',{}).catch(()=>{});}clearTimeout(idleTimer);clearTimeout(syncTimer);localStorage.removeItem('zen-offline-account');currentUser=null;data={schema:1,projects:[],notes:[]};document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('#main').innerHTML='';$('#side-projects').innerHTML='';$('#tabs').innerHTML='';authScreen('login',automatic?'Đã khóa sau 10 phút không thao tác. Đăng nhập để tiếp tục; bản thay đổi chưa gửi được giữ trên thiết bị.':'Đã đăng xuất tài khoản.');}catch(e){notify(e.message);}}
for(const event of ['pointerdown','keydown','input','wheel','touchstart'])document.addEventListener(event,()=>touchSession(),{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentUser&&Date.now()>=sessionDeadline)signOutAccount(true);});
(async()=>{const shared=new URLSearchParams(location.search).get('boardshare');if(shared){try{const r=await requestAPI('shared/'+shared);data=r.data;contentReadOnly=true;document.body.classList.remove('signed-out');noteBoard='';view='notes';render();}catch(e){authScreen('login',e.message);}return;}if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});const mode=location.hash.startsWith('#reset=')?'reset':location.hash.startsWith('#verify=')?'verify':null;if(mode)return authScreen(mode);try{await openAccount();}catch(error){if(await openOfflineAccount())return;currentUser=null;authScreen('login',error.status===401?'':error.message+' · Phiên đăng nhập vẫn được giữ.');offerInvalidDraftDownload();}})();

function passwordEye(visible=false){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'+(visible?'<path d="m3 3 18 18"/>':'')+'</svg>';}
function passwordField(isNew){return '<label class="field" for="account-password">Mật khẩu</label><div class="password-wrap"><input id="account-password" name="password" type="password" minlength="'+(isNew?'10':'1')+'" maxlength="128" autocomplete="'+(isNew?'new-password':'current-password')+'" required><button type="button" class="password-eye" aria-label="Hiện mật khẩu" aria-pressed="false" aria-controls="account-password">'+passwordEye()+'</button></div>';}

function renderAccountAvatar(){const name=currentUser?.name?.trim()||currentUser?.email||'Bạn',initials=currentUser?.name?.trim()?name.split(/\s+/).filter(Boolean).map(w=>Array.from(w)[0]).filter((_,i,a)=>i===0||i===a.length-1).join('').toUpperCase():name.slice(0,2).toUpperCase();document.querySelectorAll('.avatar').forEach(el=>{el.textContent=initials;el.title='Tài khoản · '+name;if(el.tagName==='BUTTON')el.setAttribute('aria-label','Mở cài đặt tài khoản của '+name);el.classList.remove('has-photo');if(currentUser?.avatar){const img=document.createElement('img');img.alt='';img.src=currentUser.avatar;img.onerror=()=>{el.textContent=initials;el.classList.remove('has-photo');};el.textContent='';el.append(img);el.classList.add('has-photo');}});}
