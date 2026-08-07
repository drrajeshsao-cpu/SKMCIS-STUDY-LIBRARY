const C='skmcis-study-v4-3-ebook-reader-20260807';
const AS=["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./data/master-index.json","./gold-chapters/gold-index.json","./data/sciatica.json","./data/cervical-radiculopathy.json","./data/mechanical-low-back-pain.json","./data/lumbar-disc-herniation-radiculopathy.json","./data/lumbar-spinal-stenosis-neurogenic-claudication.json"];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(AS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 const networkFirst=u.pathname.endsWith('/gold-chapters/gold-index.json')||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/app.js')||u.pathname.endsWith('/styles.css');
 if(networkFirst){e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)));return}
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{let cp=resp.clone();caches.open(C).then(c=>c.put(e.request,cp));return resp}).catch(()=>caches.match('./index.html'))));
});