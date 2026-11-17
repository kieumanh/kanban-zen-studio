const SHELL_CACHE='zen-shell-__SHELL_VERSION__';
const SHELL_ASSETS=__SHELL_ASSETS__;
// v2.37.0 (Tải Theo Nhu Cầu): các nhóm tệp chỉ tải khi cần ({ nhóm: [đường dẫn] }). Không lưu sẵn lúc cài đặt; lưu khi trang thật sự lấy tới.
const LAZY_ASSETS=__LAZY_ASSETS__;
const base=u=>u.replace(/^\/static\//,'/').replace(/\.[0-9a-f]{16}(\.[a-z0-9]+)$/,'$1');
const LAZY_BASES=new Set(Object.values(LAZY_ASSETS).flat().map(base));
const isLazy=u=>LAZY_BASES.has(base(u));
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(SHELL_CACHE);
 try{await cache.addAll(SHELL_ASSETS.filter(url=>!isLazy(url)).map(url=>new Request(url,{cache:'reload'})));}
 catch(error){await caches.delete(SHELL_CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const olds=(await caches.keys()).filter(key=>key.startsWith('zen-shell-')&&key!==SHELL_CACHE);
 // Người đã từng mở một nhóm (bản cũ có tệp của nhóm đó) thì giữ nhóm ấy dùng được ngoại tuyến ở bản mới: chép tệp không đổi, tải lại tệp đã đổi.
 try{
  const keep=await caches.open(SHELL_CACHE),used=new Set();
  for(const key of olds)for(const request of await(await caches.open(key)).keys())used.add(base(new URL(request.url).pathname));
  for(const urls of Object.values(LAZY_ASSETS)){
   if(!urls.some(url=>used.has(base(url))))continue;
   for(const url of urls){
    if(await keep.match(url))continue;
    let response=null;
    for(const key of olds){response=await(await caches.open(key)).match(url);if(response)break;}
    if(!response){try{const fresh=await fetch(new Request(url,{cache:'reload'}));if(fresh.ok)response=fresh;}catch{}}
    if(response)await keep.put(url,response);
   }
  }
 }catch{}
 for(const key of olds)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.search||url.pathname.startsWith('/api/')||!SHELL_ASSETS.includes(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(SHELL_CACHE),hit=await cache.match(url.pathname);
  if(hit)return hit;
  const response=await fetch(request);
  // Tệp tải theo nhu cầu: lần đầu lấy được thì lưu lại để lần sau (kể cả ngoại tuyến) dùng được.
  if(response.ok&&isLazy(url.pathname)){try{await cache.put(url.pathname,response.clone());}catch{}}
  return response;
 })());
});
// v2.0.0 (Truyền Âm): lời nhắc theo phong cách của thiết bị (trang ghi vào bộ nhớ đệm 'zen-pref'); mặc định giọng thường.
// v2.49.0 (Thông Báo Có Tên): thông báo đẩy không mang nội dung, nên tại đây hỏi /api/push-summary (chỉ-đọc, theo phiên đăng nhập) để hiện tên 1–2 việc gấp nhất và số lượng.
// Thiết bị có thể tắt phần tên việc (trang ghi 'off' vào khóa /__zen-push-names của bộ nhớ đệm 'zen-pref'); hết phiên, lỗi mạng hay không có việc thì dùng câu chung như trước.
self.addEventListener('push',event=>event.waitUntil((async()=>{let style='zen',names=true;try{const c=await caches.open('zen-pref'),r=await c.match('/__zen-style');if(r)style=(await r.text()).trim();const n=await c.match('/__zen-push-names');if(n)names=(await n.text()).trim()!=='off';}catch{}const gh=style==='giangho';let title=gh?'Zen Studio · Truyền thư hôm nay':'Zen Studio · Nhắc việc hôm nay',body=gh?'Các hạ có nhiệm vụ tới kỳ trong 3 ngày, tới kỳ hôm nay hoặc đã lỡ hẹn. Mở Hoàng lịch để xem.':'Bạn có công việc đến hạn trong 3 ngày, đến hạn hôm nay hoặc đã quá hạn. Mở Lịch để xem.';if(names){try{const r=await fetch('/api/push-summary',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(6000)});if(r.ok){const s=await r.json();if(s&&s.count>0&&typeof s.title==='string'&&typeof s.body==='string'){title=s.title.slice(0,80);body=s.body.slice(0,240);}}}catch{}}return self.registration.showNotification(title,{body,tag:'zen-daily',data:{url:'https://kanban.huongthiennature.com/'}});})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{for(const w of windows)if(new URL(w.url).origin===self.location.origin)return w.focus();return clients.openWindow('https://kanban.huongthiennature.com/');}));});
