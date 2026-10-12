/* guarda as imagens (cartões c-banco-modelo.webp e ícones i-empresa.webp) no aparelho: depois da 1ª vez abrem na hora e funcionam sem internet.
   Se trocar uma imagem mantendo o mesmo nome, aumente o número em CACHE (e IMGCACHE no index.html). */
const CACHE='cartoes-2';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(k=>Promise.all(k.filter(x=>x.indexOf('cartoes-')===0&&x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin||!/\/[ci]-[a-z0-9_-]+\.webp$/.test(u.pathname))return;
  e.respondWith(caches.open(CACHE).then(c=>c.match(r).then(h=>h||fetch(new Request(r,{cache:'no-cache'})).then(n=>{if(n.ok)c.put(r,n.clone());return n}))));
});
