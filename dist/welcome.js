'use strict';
Object.assign(iconPaths,{pin:'M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6 M12 15v6',plus:'M12 5v14 M5 12h14',check:'m5 12 4 4L19 6',leaf:'M20 4C5 2 2 10 6 16s15 3 14-12Z M6 18 16 8'});
const APP_VERSION='__APP_VERSION__';
const RELEASES=[]; // v2.37.0: nội dung nằm ở releases.js, tải khi cần (window.zenLazy.load('releases')).
let latestVersion=APP_VERSION;
function localRead(k){try{return localStorage.getItem(k);}catch{return null;}}
function localWrite(k,v){try{localStorage.setItem(k,v);}catch{}}
// Read receipts belong to the signed-in account, independently of workspace revisions.
let readReceiptOwner=null,readReceiptKeys=new Set(),readReceiptLoaded=false,readReceiptRequest=null,readReceiptTime=0;
function noticeReceipt(t){return 'notice:'+encodeURIComponent(noticeSignature(t));}
async function loadReadReceipts(force=false){
 const owner=currentUser?.id;if(!owner)return false;
 if(readReceiptOwner!==owner){readReceiptOwner=owner;readReceiptKeys=new Set();readReceiptLoaded=false;readReceiptRequest=null;readReceiptTime=0;}
 if(readReceiptRequest)return readReceiptRequest;
 if(readReceiptLoaded&&!force&&Date.now()-readReceiptTime<10000)return true;
 const pending=(async()=>{try{const result=await requestAPI('notification-receipts');if(currentUser?.id!==owner||readReceiptOwner!==owner)return false;if(!Array.isArray(result.keys))throw Error('Invalid receipts');readReceiptKeys=new Set(result.keys.filter(k=>typeof k==='string'));readReceiptLoaded=true;readReceiptTime=Date.now();refreshBell();if(readReceiptKeys.has(welcomeReceipt(welcomeSlot())))document.querySelector('.welcome-dialog:not([data-manual])')?.close();return true;}catch{return false;}})();
 readReceiptRequest=pending;try{return await pending;}finally{if(readReceiptRequest===pending)readReceiptRequest=null;}
}
async function saveReadReceipts(keys){
 const owner=currentUser?.id;if(!owner)throw Error('Vui lòng đăng nhập.');
 for(let i=0;i<keys.length;i+=200)await requestAPI('notification-receipts','PUT',{keys:keys.slice(i,i+200)});
 if(currentUser?.id!==owner)throw Error('Tài khoản đã thay đổi.');
 if(readReceiptOwner!==owner){readReceiptOwner=owner;readReceiptKeys=new Set();readReceiptLoaded=false;}
 keys.forEach(key=>readReceiptKeys.add(key));refreshBell();
}
function releaseKey(){return 'zen-release-seen:'+currentUser?.id;}
function releaseUnread(){return !!currentUser&&!(readReceiptOwner===currentUser.id&&readReceiptKeys.has('release:'+latestVersion))&&localRead(releaseKey())!==latestVersion;}
const oldBellRefresh=refreshBell;refreshBell=function(){oldBellRefresh();if(releaseUnread()){const count=taskNotices().length+fileAlerts.length+1;bell.innerHTML=svgIcon('bell')+'<span class="notification-count">'+(count>99?'99+':count)+'</span>';bell.setAttribute('aria-label','Thông báo · '+count+' mục, có phiên bản mới');}};
const oldBellClick=bell.onclick;bell.onclick=()=>{oldBellClick();const list=$('#editor-body .notice-list');if(!releaseUnread())return;list.insertAdjacentHTML('afterbegin',`<article class="notice-item release-notice"><strong>${releaseUnread()?'Mới · ':''}Phiên bản ${esc(latestVersion)}</strong><span>${latestVersion===APP_VERSION?esc(RELEASES[0]?.text||'Có phiên bản mới. Bấm Xem chi tiết để đọc.'):'Có bản cập nhật mới. Tải lại trang để nhận tính năng mới nhất.'}</span><div class="release-actions"><button class="btn" type="button" id="release-read">${svgIcon('notes')}Xem chi tiết</button>${latestVersion!==APP_VERSION?'<button class="btn" id="release-reload" type="button">Tải lại trang</button>':''}</div></article>`);$('#release-read').onclick=async e=>{e.currentTarget.disabled=true;try{await saveReadReceipts(['release:'+latestVersion]);localWrite(releaseKey(),latestVersion);refreshBell();$('#editor').close();go('versions');}catch{notify('Chưa lưu được trạng thái đã đọc. Hãy thử lại.');e.target.closest('button').disabled=false;}};if($('#release-reload'))$('#release-reload').onclick=()=>location.reload();/* v2.37.0: nội dung phiên bản nằm trong releases.js (tải theo nhu cầu): chuông chỉ nạp khi người dùng mở nó */if(latestVersion===APP_VERSION&&!RELEASES.length)window.zenLazy?.load('releases').then(()=>{const span=$('#editor-body .release-notice span');if(span&&RELEASES[0]?.text)span.textContent=RELEASES[0].text;},()=>{});};
// v2.37.0: RELEASES nằm ở releases.js (nạp khi cần). Chưa có thì nạp rồi vẽ lại trang Phiên bản; lỗi mạng thì cho thử lại.
function releasesPending(){/* render() gốc gọi versions() cho mọi trang không có hàm riêng (rồi trang đó vẽ đè lên): chỉ nạp khi thật sự đang ở trang Phiên bản */if(view!=='versions')return '';window.zenLazy?.load('releases').then(()=>{if(view==='versions')render();},()=>{});return '<p class="subtext" role="status">Đang tải nhật ký phát triển…</p>';}
const releaseBullets=r=>Array.isArray(r.items)&&r.items.length?r.items:String(r.text||'').split(/(?<=[.!?])\s+/).filter(Boolean);
versions=()=>heading('NHẬT KÝ PHÁT TRIỂN','Phiên bản '+APP_VERSION,'Mỗi phiên bản một khung, kèm từ khóa hạng mục đã cải thiện')+(RELEASES.length?'':releasesPending())+'<section class="release-log" aria-label="Nhật ký phiên bản">'+RELEASES.map(r=>`<article class="release-card"><header><span class="release-ver">v${esc(r.version)}${r.name?' · '+esc(r.name):''}</span><h4>${esc(r.title)}</h4></header>${(r.tags||[]).length?`<div class="release-tags" aria-label="Từ khóa">${r.tags.map(t=>`<span class="release-tag">${esc(t)}</span>`).join('')}</div>`:''}<ul>${releaseBullets(r).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></article>`).join('')+'</section>';
async function checkRelease(){if(!currentUser||document.hidden||!navigator.onLine)return;try{const r=await fetch('/health',{cache:'no-store'});if(r.ok){const body=await r.json();if(/^\d+\.\d+\.\d+$/.test(body.version)){latestVersion=body.version;refreshBell();}}}catch{}}
let wisdomCache=null,teacherCache=null,welcomeLoading=false,welcomeSession=new Set();
function welcomeDay(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function wisdomIndex(day,count){return Math.floor((Date.parse(day+'T00:00:00Z')-Date.parse('2026-10-24T00:00:00Z'))/86400000+count*1000)%count;}
// v1.16.5: dấu "đã đọc" của lời chào riêng cho từng buổi (ngày + buổi 0-3); trước đây chỉ một dấu 'welcome' vĩnh viễn nên bấm đọc một lần là các buổi sau không bao giờ hiện lại.
function welcomeReceipt(time){return 'welcome:'+time.day+':'+time.slot;}
function welcomeSlot(now=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now),v=Object.fromEntries(parts.map(p=>[p.type,p.value])),hour=Number(v.hour),slot=hour<5?3:hour<11?0:hour<14?1:hour<18?2:3,calendarDay=v.year+'-'+v.month+'-'+v.day,day=hour<5?new Date(Date.parse(calendarDay+'T00:00:00Z')-86400000).toISOString().slice(0,10):calendarDay;return {day,slot,label:['Buổi sáng','Buổi trưa','Buổi chiều','Buổi tối'][slot],serial:Math.floor(Date.parse(day+'T00:00:00Z')/86400000)*4+slot};}
// Pure selection functions are embedded into welcome.js at build-authoring time.
// Every excerpt occurs exactly once in a complete cycle, including authors
// without a profile. Entries for each author are spread across the cycle.
function welcomeAllowed(entry) {
  return !/marcus\s+aurelius|stoic|khắc\s*kỷ|khac\s*ky|epictetus|seneca/i.test([entry.author,entry.name,entry.id,entry.school,entry.theme,entry.source].filter(Boolean).join(' '));
}
function welcomeProfile(author, profiles) {
  return profiles.filter(p => welcomeAllowed(p) && (author === p.name || author.startsWith(p.name + ' ·')))
    .sort((a,b) => b.name.length - a.name.length)[0];
}
function welcomeHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function welcomeDeck(quotes, profiles) {
  const groups = new Map();
  for (const quote of quotes) {
    if (!welcomeAllowed(quote) || typeof quote.vi !== 'string' || !quote.vi.trim()) continue;
    const profile = welcomeProfile(quote.author, profiles);
    const key = profile?.id || quote.author;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({quote,profile});
  }
  const deck = [];
  for (const [key, entries] of groups) {
    entries.sort((a,b) => welcomeHash(a.quote.id || a.quote.vi) - welcomeHash(b.quote.id || b.quote.vi)
      || a.quote.vi.localeCompare(b.quote.vi));
    entries.forEach((entry,i) => deck.push({...entry, position:(i+0.5)/entries.length,key}));
  }
  return deck.sort((a,b) => a.position - b.position || a.key.localeCompare(b.key));
}
let welcomeDeckCache=null,welcomeDeckQuotes=null,welcomeDeckProfiles=null;
function welcomeSelection(time) {
  const profiles=teacherCache?.profiles||[];
  if(welcomeDeckQuotes!==wisdomCache||welcomeDeckProfiles!==profiles){
    welcomeDeckCache=welcomeDeck(wisdomCache,profiles);
    welcomeDeckQuotes=wisdomCache;welcomeDeckProfiles=profiles;
  }
  if(!welcomeDeckCache.length)return {};
  const epoch=Math.floor(Date.parse('2026-10-24T00:00:00Z')/86400000)*4;
  const index=((time.serial-epoch)%welcomeDeckCache.length+welcomeDeckCache.length)%welcomeDeckCache.length;
  return welcomeDeckCache[index];
}

// v1.19.1: tải kho câu có giới hạn thời gian (trước đây một yêu cầu treo làm lời chào kẹt mãi) và thử lại sau 5/10/15 giây khi lỗi mạng.
async function welcomeFetchJson(url,ms=8000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw Error(url);return await r.json();}finally{clearTimeout(t);}}
const welcomeRetries=new Map();
function welcomeRetryLater(key){const n=(welcomeRetries.get(key)||0)+1;welcomeRetries.set(key,n);if(n<=3)setTimeout(dailyWelcome,5000*n);}
// Mốc đổi buổi theo giờ Việt Nam (UTC+7, không có giờ mùa hè): 05:00, 11:00, 14:00, 18:00. Trả về số mili giây tới mốc kế tiếp.
function welcomeNextBoundary(now=Date.now()){const day=86400000,t=(((now+7*3600000)%day)+day)%day,marks=[5,11,14,18].map(h=>h*3600000),next=marks.find(m=>m>t);return (next===undefined?marks[0]+day:next)-t;}
function scheduleWelcomeBoundary(){setTimeout(()=>{dailyWelcome();scheduleWelcomeBoundary();},welcomeNextBoundary()+1500);}
async function dailyWelcome(force=false){
 // v2.51.0: đang mở hộp lưu nội dung được chia sẻ thì chưa chào (lần quay lại sau sẽ chào); lời chào không được chồng lên hộp đó.
 if(!currentUser||document.hidden||welcomeLoading||$('#editor').open||document.querySelector('.welcome-dialog, dialog.zen-share'))return;
 const owner=currentUser.id,time=welcomeSlot(),key='zen-welcome:'+owner+':'+time.day+':'+time.slot;
 if(!force&&(localRead(key)||welcomeSession.has(key)))return;
 welcomeLoading=true;
 try{
  // v1.19.1: dấu đã đọc của máy chủ chỉ để không hiện trùng giữa các thiết bị. Máy chủ chậm hoặc lỗi thì vẫn chào (dấu trên máy này chặn lặp lại), không để lời chào im lặng.
  await Promise.race([loadReadReceipts(),new Promise(r=>setTimeout(r,6000))]);
  if(!force&&readReceiptOwner===owner&&readReceiptKeys.has(welcomeReceipt(time)))return;
  if(!wisdomCache)wisdomCache=(await welcomeFetchJson('/wisdom.json')).filter(q=>typeof q.vi==='string'&&q.vi.trim());
  if(!teacherCache){try{teacherCache=await welcomeFetchJson('/teachers.json');}catch{}}
  if(currentUser?.id!==owner||$('#editor').open||document.querySelector('dialog.zen-share'))return;
  const {quote:q,profile}=welcomeSelection(time);if(!q)return;
  const d=document.createElement('dialog');d.className='welcome-dialog';if(force)d.dataset.manual='true';d.setAttribute('aria-labelledby','welcome-title');
  d.innerHTML=`<button type="button" class="welcome-close" aria-label="Đóng lời chào" title="Đóng">×</button><div class="welcome-content"><header class="welcome-heading"><span class="welcome-lotus" aria-hidden="true">❀</span><p class="eyebrow">${esc(time.label)} · MỘT KHOẢNH KHẮC CHO BẠN</p><h2 id="welcome-title">Chào mừng bạn trở lại</h2><p class="welcome-intro">Dừng một nhịp, rồi bắt đầu điều có ý nghĩa.</p></header><blockquote lang="vi">${esc(q.vi)}</blockquote><div class="wisdom-teacher">${profile?.image?'<img src="'+esc(profile.image)+'" alt="'+esc(profile.imageAlt||profile.name)+'" width="48" height="48">':''}<span><strong>${esc(profile?.name||q.author)}</strong><small>${esc(profile?.theme||q.attribution||'Một điều để chiêm nghiệm')}</small></span></div><details class="welcome-sources"><summary>Nguồn & thông tin trích dẫn</summary><p class="wisdom-kind">${esc(q.translationNote||'Bản dịch tiếng Việt · tham khảo')}</p><p class="wisdom-author">${esc(q.attribution||q.author)}</p><a href="${esc(q.url)}" target="_blank" rel="noopener noreferrer">${esc(q.source)} ↗</a>${q.contextUrl?'<a href="'+esc(q.contextUrl)+'" target="_blank" rel="noopener noreferrer">Giải nghĩa trích đoạn ↗</a>':''}${profile?.imageSource?'<a href="'+esc(profile.imageSource)+'" target="_blank" rel="noopener noreferrer">Nguồn ảnh chân dung ↗</a>':''}<details class="wisdom-directory"><summary>Thư viện · ${wisdomCache.filter(q=>q.kind!=='reflection').length} trích đoạn có nguồn</summary><p>Bản dịch nghĩa mang tính tham khảo. Lời biên soạn của Zen Studio được ghi riêng, không phải phát ngôn của vị thầy.</p>${(teacherCache?.profiles||[]).filter(welcomeAllowed).map(p=>'<a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.name)+' · '+esc(p.theme)+'</a>').join('')}</details></details><footer class="welcome-actions"><button type="button" class="btn primary" id="welcome-read">${svgIcon('check')}Đã đọc · Bắt đầu làm việc</button><small>Không tự hiện lại trên các thiết bị của bạn. Có thể mở lại từ Thông báo.</small><p id="welcome-read-status" role="status" hidden></p></footer></div>`;
  document.body.append(d);d.addEventListener('close',()=>d.remove());d.querySelector('.welcome-close').onclick=()=>d.close();
  const portrait=d.querySelector('.wisdom-teacher img');portrait?.addEventListener('error',()=>portrait.remove(),{once:true});
  d.querySelector('#welcome-read').onclick=async e=>{const button=e.currentTarget,status=d.querySelector('#welcome-read-status');button.disabled=true;try{await saveReadReceipts([welcomeReceipt(time)]);d.close();}catch{status.hidden=false;status.textContent='Chưa lưu được xác nhận. Kiểm tra kết nối rồi thử lại.';button.disabled=false;}};
  d.showModal();d.scrollTop=0;welcomeSession.add(key);localWrite(key,'seen');
 }catch{welcomeRetryLater(key);}finally{welcomeLoading=false;}
}
const beforeWelcomeRender=render;render=function(){beforeWelcomeRender();if(currentUser)loadReadReceipts();setTimeout(dailyWelcome,700);};
setInterval(checkRelease,300000);setInterval(dailyWelcome,60000);window.addEventListener('focus',()=>{checkRelease();dailyWelcome();});setTimeout(dailyWelcome,1000);refreshBell();
// v1.19.1: chào ngay khi tab hiện lại, khi có mạng lại, khi quay lại từ bộ nhớ đệm trang, và đúng lúc sang buổi mới (không đợi nhịp 60 giây).
document.addEventListener('visibilitychange',()=>{if(!document.hidden){checkRelease();dailyWelcome();}});window.addEventListener('online',()=>dailyWelcome());window.addEventListener('pageshow',e=>{if(e.persisted)dailyWelcome();});scheduleWelcomeBoundary();
function noticeSignature(t){return [t.id,t.notice,t.due||'',t.title,t.important].join('|');}
function seenNotices(){let local=[];try{local=JSON.parse(localRead('zen-notices:'+currentUser?.id)||'[]');}catch{}return [...new Set([...local,...[...(readReceiptOwner===currentUser?.id?readReceiptKeys:[])].filter(k=>k.startsWith('notice:')).map(k=>{try{return decodeURIComponent(k.slice(7));}catch{return '';}})])];}
async function markNoticesRead(){await saveReadReceipts(['release:'+latestVersion,...taskNotices().map(noticeReceipt)]);localWrite('zen-notices:'+currentUser?.id,JSON.stringify(taskNotices().map(noticeSignature)));fileAlerts=[];localWrite(releaseKey(),latestVersion);refreshBell();}
refreshBell=function(){const seen=new Set(seenNotices()),count=taskNotices().filter(t=>!seen.has(noticeSignature(t))).length+fileAlerts.length+(releaseUnread()?1:0);bell.innerHTML=svgIcon('bell')+(count?'<span class="notification-count">'+(count>99?'99+':count)+'</span>':'');bell.setAttribute('aria-label','Thông báo · '+count+' chưa xem');};
const beforeReadBell=bell.onclick;bell.onclick=()=>{beforeReadBell();const b=$('#clear-file-alerts');b.textContent='Xác nhận đã đọc tất cả';const tools=document.createElement('div');tools.className='notice-read-toolbar';$('#editor-body .notice-list').before(tools);tools.append(b);b.onclick=async()=>{b.disabled=true;try{await markNoticesRead();$('#editor').close();}catch{b.disabled=false;notify('Chưa lưu được xác nhận. Kiểm tra kết nối rồi thử lại.');}};const open=document.createElement('button');open.type='button';open.className='btn welcome-reopen';open.textContent='❀ Một điều để chiêm nghiệm';open.onclick=()=>{$('#editor').close();dailyWelcome(true);};$('#editor-body').append(open);const seen=new Set(seenNotices());document.querySelectorAll('.notice-list [data-task]').forEach(el=>{const t=taskNotices().find(t=>t.id===el.dataset.task&&t.project.id===el.dataset.pid);if(t&&seen.has(noticeSignature(t)))el.closest('.notice-item')?.remove();});};
const beforeNextCard=taskCard;taskCard=function(t,p){const html=beforeNextCard(t,p),next=p.columns[p.columns.indexOf(t.col)+1];return next?html.replace('</article>',`<button type="button" class="btn task-next" data-next-task="${esc(t.id)}" data-next-project="${esc(p.id)}">${svgIcon('check')}Chuyển sang ${esc(next)} →</button></article>`):html;};
document.addEventListener('click',e=>{const b=e.target.closest('[data-next-task]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const p=project(b.dataset.nextProject),t=p?.tasks.find(t=>t.id===b.dataset.nextTask);if(!t)return;const next=p.columns[p.columns.indexOf(t.col)+1];if(!next)return;t.col=next;if(next==='Done'){t.checks.forEach(c=>c.done=true);celebrateCompletion(completionKindFor(p,t));}save();render();},true);
refreshBell();

// Opening a task notice marks only that notice as seen, then opens its task editor.
document.addEventListener('click',e=>{const target=e.target.closest('.notice-list [data-task]');if(!target)return;const notice=taskNotices().find(t=>t.id===target.dataset.task&&t.project.id===target.dataset.pid);if(notice){const seen=new Set(seenNotices());seen.add(noticeSignature(notice));saveReadReceipts([noticeReceipt(notice)]).catch(()=>{});localWrite('zen-notices:'+currentUser?.id,JSON.stringify([...seen]));refreshBell();}},true);



setInterval(()=>{if(currentUser&&!document.hidden)loadReadReceipts();},10000);
window.addEventListener('focus',()=>loadReadReceipts(true));
