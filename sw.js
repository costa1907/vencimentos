/* sw.js — deixa o app rápido e funcionando sem internet:
   1) o próprio app (index.html) abre na hora do aparelho e é conferido/atualizado em segundo plano;
   2) imagens dos cartões (c-*.webp) e dos ícones (i-*.webp) ficam guardadas;
   3) fontes do Google ficam guardadas.
   Se trocar uma imagem mantendo o mesmo nome, aumente o número em IMG (e IMGCACHE no index.html). */
const IMG='cartoes-12', APP='app-1', FONT='fontes-1';
const INDEX=new URL('index.html',self.registration.scope).href;

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(APP).then(c=>c.add(new Request(INDEX,{cache:'reload'}))).catch(()=>{}));
});
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(k=>Promise.all(k.filter(x=>(x.indexOf('cartoes-')===0&&x!==IMG)||(x.indexOf('app-')===0&&x!==APP)||(x.indexOf('fontes-')===0&&x!==FONT)).map(x=>caches.delete(x)))).then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;

  /* o app: abre o que está guardado e, em paralelo, busca a versão nova para a próxima vez.
     Com ?u= ou ?c= (atualização/limpeza feitas pelo próprio app) vai direto à internet. */
  if(r.mode==='navigate'&&u.origin===location.origin&&u.href.indexOf(self.registration.scope)===0&&/(\/|index\.html)$/.test(u.pathname)){
    const fresh=u.searchParams.has('u')||u.searchParams.has('c');
    const net=()=>fetch(new Request(INDEX,{cache:'no-cache'})).then(n=>{
      if(n.ok){const k=n.clone();caches.open(APP).then(c=>c.put(INDEX,k))}
      return n});
    /* em segundo plano: só baixa o index.html inteiro se o v.txt (minúsculo) mostrar versão diferente da guardada */
    const VER=new URL('v.txt',self.registration.scope).href;
    const soft=()=>fetch(VER+'?t='+Date.now(),{cache:'no-store'}).then(v=>v.ok?v.text():Promise.reject()).then(t=>caches.open(APP).then(c=>c.match(VER).then(o=>o?o.text():'').then(old=>{
      if(old.trim()===t.trim())return;
      return net().then(()=>c.put(VER,new Response(t)))}))).catch(()=>net().catch(()=>{}));
    e.respondWith(caches.open(APP).then(c=>c.match(INDEX)).then(h=>{
      if(fresh||!h)return net().catch(()=>h||Response.error());
      e.waitUntil(soft());
      return h;
    }));
    return;
  }

  /* fontes do Google */
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(FONT).then(c=>c.match(r).then(h=>{
      const net=fetch(r).then(n=>{if(n.ok||n.type==='opaque')c.put(r,n.clone());return n}).catch(()=>h);
      return h||net;
    })));
    return;
  }

  /* imagens dos cartões e ícones */
  if(u.origin===location.origin&&/\/[ci]-[a-z0-9_-]+\.webp$/.test(u.pathname)){
    e.respondWith(caches.open(IMG).then(c=>c.match(r).then(h=>h||fetch(new Request(r,{cache:'no-cache'})).then(n=>{if(n.ok)c.put(r,n.clone());return n}))));
  }
});
