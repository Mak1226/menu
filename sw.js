const CACHE="mess-menu-v2";
const ASSETS=["./","./index.html","./styles.css","./app.js","./data/menu.json","./data/choicePairs.json","./manifest.webmanifest"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>{
  if(new URL(e.request.url).pathname.endsWith("/data/menu.json")){
    e.respondWith(fetch(e.request,{cache:"no-store"}).catch(()=>caches.match(e.request))); return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
