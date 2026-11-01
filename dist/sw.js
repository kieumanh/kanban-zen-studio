const SHELL_CACHE='zen-shell-__SHELL_VERSION__';
const SHELL_ASSETS=__SHELL_ASSETS__;
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(SHELL_CACHE);
 try{await cache.addAll(SHELL_ASSETS.map(url=>new Request(url,{cache:'reload'})));}
 catch(error){await caches.delete(SHELL_CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('zen-shell-')&&key!==SHELL_CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.search||url.pathname.startsWith('/api/')||!SHELL_ASSETS.includes(url.pathname))return;
 event.respondWith((async()=>{const cache=await caches.open(SHELL_CACHE);return await cache.match(url.pathname)||fetch(request);})());
});
self.addEventListener('push',event=>event.waitUntil(self.registration.showNotification('Zen Studio · Nhắc việc hôm nay',{body:'Bạn có công việc đến hạn trong 3 ngày, đến hạn hôm nay hoặc đã quá hạn. Mở Lịch để xem.',tag:'zen-daily',data:{url:'https://kanban.huongthiennature.com/'}})));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{for(const w of windows)if(new URL(w.url).origin===self.location.origin)return w.focus();return clients.openWindow('https://kanban.huongthiennature.com/');}));});
