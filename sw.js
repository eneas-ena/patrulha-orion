// Patrulha Órion — service worker (versão m1.1.0-o0.11.0+n1.1.0-a1.3.0+n1.1.0)
// Rede primeiro: com internet, sempre pega a versão nova; sem internet, usa a cópia guardada.
const CACHE='orion-m1.1.0-o0.11.0+n1.1.0-a1.3.0+n1.1.0';
const FILES=['./','./index.html','./orion.html','./apocalipse.html','./mesa-orion.jpg','./nuvem.js','./mesa-apocalipse.jpg','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  const fonte=u.host==='fonts.googleapis.com'||u.host==='fonts.gstatic.com';
  if(u.origin!==location.origin&&!fonte)return; // Supabase e outros serviços passam direto
  if(fonte){e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));return res})));return}
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r).then(m=>m||caches.match('./index.html'))))});
