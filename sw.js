const C='skmcis-study-v4-4-1-core5-prescriber-20260807';
const SHELL=["./","./index.html","./styles.css?v=4.3.1","./app.js?v=4.3.1","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET') return;
 const u=new URL(e.request.url);
 const path=u.pathname;
 const networkFirst =
   path.endsWith('/') ||
   path.endsWith('/index.html') ||
   path.endsWith('/app.js') ||
   path.endsWith('/styles.css') ||
   path.endsWith('/gold-chapters/gold-index.json') ||
   path.endsWith('/data/master-index.json') ||
   path.endsWith('/data/prescriber-core-v1.json');
 if(networkFirst){
   e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{
     if(r && r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));}
     return r;
   }).catch(()=>caches.match(e.request)));
   return;
 }
 e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{
   if(r && r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));}
   return r;
 })));
});