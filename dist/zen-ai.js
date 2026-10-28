// Zen AI Secretary: private, opt-in and non-intrusive. Speech is browser TTS (no paid API).
(()=>{
'use strict';
const api='/api/zen-ai/', mascot='/zen-robot-girl.webp';
const root=document.createElement('section');
root.id='zen-ai-root';
root.innerHTML='<button type="button" id="zen-ai-toggle" title="Zen AI Secretary" aria-label="Mở thư ký Zen AI" aria-expanded="false"><img src="'+mascot+'" width="30" height="30" alt=""><span>Zen AI</span><i id="zen-ai-dot" aria-hidden="true"></i></button><div id="zen-ai-scrim" hidden></div><aside id="zen-ai-drawer" role="dialog" aria-modal="true" aria-label="Thư ký Zen AI" hidden><header class="zen-ai-head"><img src="'+mascot+'" width="58" height="58" alt="Cô gái robot Zen AI năng động, vui tươi"><div><b>Zen AI Secretary</b><small>Trợ lý cá nhân · Free</small></div><button type="button" id="zen-ai-close" aria-label="Đóng thư ký">×</button></header><div class="zen-ai-body"><div id="zen-ai-message" role="status">Mở thư ký để xem tình hình công việc.</div><div id="zen-ai-content"></div></div><footer class="zen-ai-foot"><span>🌿 Nhẹ nhàng, đúng việc, đúng lúc.</span><button type="button" id="zen-ai-refresh">↻ Làm mới</button></footer></aside>';
(document.querySelector('.top-actions')||document.body).append(root);
const q=(s)=>root.querySelector(s), drawer=q('#zen-ai-drawer'), toggle=q('#zen-ai-toggle');
let current=null, spoken=false;
const escapeHtml=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notify=(s)=>{q('#zen-ai-message').textContent=s;};
async function request(path,method='GET',data){
 const r=await fetch(api+path,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(data||{})})});
 const payload=await r.json().catch(()=>({error:'Không đọc được dữ liệu.'}));
 if(!r.ok)throw Error(payload.error||'Không thể kết nối thư ký.');
 return payload;
}
function open(v){
 drawer.hidden=!v;q('#zen-ai-scrim').hidden=!v;toggle.setAttribute('aria-expanded',String(v));
 if(v){q('#zen-ai-close').focus();load();}else{window.speechSynthesis?.cancel();spoken=false;toggle.focus();}
}
toggle.addEventListener('click',()=>open(drawer.hidden));
q('#zen-ai-close').addEventListener('click',()=>open(false));
q('#zen-ai-scrim').addEventListener('click',()=>open(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer.hidden)open(false);});
q('#zen-ai-refresh').addEventListener('click',load);
async function load(){
 notify('Đang xem tình hình công việc…');
 try{current=await request('status');render(current);}
 catch(e){current=null;notify(e.message);q('#zen-ai-content').replaceChildren();}
}
function voiceAvailable(){
 if(!('speechSynthesis' in window))return false;
 return window.speechSynthesis.getVoices().some(v=>/^vi([-_]|$)/i.test(v.lang));
}
function voiceButton(){
 if(!('speechSynthesis' in window))return '<p class="zen-ai-help">Trình duyệt chưa hỗ trợ đọc văn bản.</p>';
 const supported=voiceAvailable();
 return '<button type="button" id="zen-ai-speak" class="zen-ai-secondary" '+(supported?'':'disabled')+' aria-label="Đọc báo cáo tiếng Việt">🔊 Đọc tiếng Việt</button>'+(supported?'':'<p class="zen-ai-help">Chưa tìm thấy giọng Việt trên thiết bị. Hãy cài giọng vi-VN trong hệ điều hành hoặc thử trình duyệt khác.</p>');
}
function speak(){
 if(!voiceAvailable()){notify('Chưa có giọng tiếng Việt trên thiết bị.');return;}
 window.speechSynthesis.cancel();
 const voices=window.speechSynthesis.getVoices(),vi=voices.find(v=>/^vi[-_]VN$/i.test(v.lang))||voices.find(v=>/^vi/i.test(v.lang));
 const r=current?.report, rules=current?.liveRules;
 const content=(r?.summary||rules?.summary||'')+'. '+(r?.proposals||rules?.proposals||[]).slice(0,3).map(p=>p.title+'. '+p.detail).join('. ');
 const u=new SpeechSynthesisUtterance(content.slice(0,1600));u.lang='vi-VN';u.voice=vi;u.rate=0.92;u.pitch=1;u.volume=1;
 window.speechSynthesis.speak(u);spoken=true;
}
function proposalMarkup(p,reportId,feedback){
 const prev=feedback.find(f=>f.proposal_id===p.id)?.decision;
 return '<article class="zen-ai-proposal"><div class="zen-ai-proposal-top"><span>'+escapeHtml(p.project)+'</span><strong>'+(p.rank<=2?'Ưu tiên cao':'Đề xuất')+'</strong></div><h4>'+escapeHtml(p.title)+'</h4><p>'+escapeHtml(p.detail)+'</p><small>'+escapeHtml(p.action)+'</small>'+(reportId?'<div class="zen-ai-actions"><button type="button" data-zen-vote="accepted" data-report="'+escapeHtml(reportId)+'" data-proposal="'+escapeHtml(p.id)+'" '+(prev?'disabled':'')+'>'+(prev==='accepted'?'✓ Đã ghi nhận':'✓ Ghi nhận')+'</button><button type="button" data-zen-vote="dismissed" data-report="'+escapeHtml(reportId)+'" data-proposal="'+escapeHtml(p.id)+'" '+(prev?'disabled':'')+'>'+(prev==='dismissed'?'Đã bỏ qua':'Bỏ qua')+'</button></div>':'')+'</article>';
}
function render(state){
 if(!state.available){notify('Thư ký đã có chủ sở hữu.');return;}
 if(!state.active){
  notify('Chưa kích hoạt cho tài khoản này.');
  q('#zen-ai-content').innerHTML='<div class="zen-ai-welcome"><p>Xin chào! Mình có thể nhìn lại tiến độ vào <b>08:00 và 20:00</b>, đưa ra gợi ý và nhắc bạn việc quan trọng.</p><p>Chỉ một tài khoản có thể kích hoạt. Mọi thay đổi task đều cần bạn tự xác nhận; mình không tự sửa dữ liệu.</p><button type="button" id="zen-ai-activate" class="zen-ai-primary">🌱 Kích hoạt miễn phí</button></div>';
  q('#zen-ai-activate').onclick=async()=>{try{await request('activate','POST',{});load();}catch(e){notify(e.message);}};
  return;
 }
 const r=state.report,rules=state.liveRules,proposals=r?.proposals?.length?r.proposals:(rules?.proposals||[]);
 const summary=r?.summary||rules?.summary||'Hãy thêm vài công việc để thư ký có dữ liệu phân tích.';
 const mode=r?(r.status==='ai'?'Đã phân tích với Workers AI':'Phân tích quy tắc'):'Xem nhanh theo quy tắc';
 const date=r?r.local_day+' · '+(r.slot===8?'08:00':'20:00'):'Chờ báo cáo theo lịch';
 const feedback=state.feedback||[];
 notify('Đã cập nhật · '+mode);
 q('#zen-ai-dot').style.display=proposals.some(x=>x.rank<=2)?'block':'none';
 q('#zen-ai-content').innerHTML='<div class="zen-ai-status"><b>'+escapeHtml(mode)+'</b><small>'+escapeHtml(date)+'</small></div><p class="zen-ai-summary">'+escapeHtml(summary)+'</p>'+voiceButton()+'<div class="zen-ai-budget">AI dành riêng cho bạn · Đã dự phòng '+Number(state.reserved||0).toLocaleString('vi-VN')+' / '+Number(state.limit||5000).toLocaleString('vi-VN')+' Neurons hôm nay (ước tính nội bộ)</div><h3>Gợi ý tiếp theo</h3>'+(proposals.length?proposals.map(p=>proposalMarkup(p,r?.id,feedback)).join(''):'<p class="zen-ai-empty">Chưa có cảnh báo quan trọng. Hãy tiếp tục nhịp làm việc của bạn. 🌱</p>')+'<p class="zen-ai-help">Thư ký chỉ đề xuất. Bấm “Ghi nhận” không sửa task hoặc deadline. Dữ liệu AI có thể chưa chính xác; hãy kiểm tra trước khi thực hiện.</p>';
 q('#zen-ai-speak')?.addEventListener('click',speak);
 q('#zen-ai-content').querySelectorAll('[data-zen-vote]').forEach(btn=>btn.addEventListener('click',async()=>{
  btn.disabled=true;
  try{await request('feedback','POST',{reportId:btn.dataset.report,proposalId:btn.dataset.proposal,decision:btn.dataset.zenVote});notify('Đã lưu phản hồi, chưa thay đổi công việc.');load();}
  catch(e){btn.disabled=false;notify(e.message);}
 }));
}
if('speechSynthesis' in window){window.speechSynthesis.addEventListener?.('voiceschanged',()=>{if(current?.active&&!drawer.hidden)render(current);});}
window.addEventListener('focus',()=>{if(!drawer.hidden)load();});
})();