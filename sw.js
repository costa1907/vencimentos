/* sw.js — deixa o app rápido e funcionando sem internet:
   1) o próprio app (index.html) abre na hora do aparelho e é conferido/atualizado em segundo plano;
   2) imagens dos cartões (c-*.webp) e dos ícones (i-*.webp) ficam guardadas;
   3) fontes do Google ficam guardadas.
   Se trocar uma imagem mantendo o mesmo nome, aumente o número em IMG (e IMGCACHE no index.html). */
const IMG='cartoes-13', APP='app-1', FONT='fontes-1';
const INDEX=new URL('index.html',self.registration.scope).href;
/* se a internet estiver ruim, espera no máximo isto pela rede antes de usar o que está guardado */
const ESPERA=4000;
const comLimite=(p,ms)=>new Promise((ok,no)=>{const t=setTimeout(()=>no(new Error('demorou')),ms);p.then(v=>{clearTimeout(t);ok(v)},e=>{clearTimeout(t);no(e)})});
/* tela amigável (no lugar do erro do Safari) para quando nunca abriu antes e está sem sinal */
const semSinal=()=>new Response('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>Sobrou!</title><style>html,body{margin:0;height:100%;background:#0a0c13;color:#e9ecf5;font:16px -apple-system,system-ui,sans-serif}body{display:grid;place-items:center;text-align:center;padding:24px}h1{font-size:34px;margin:0 0 6px}h1 b{color:#3fd96b}p{margin:6px 0 22px;color:#9aa3b8;line-height:1.4}button{height:48px;padding:0 26px;border:0;border-radius:16px;background:#3fd96b;color:#06210f;font:700 16px inherit;font-family:inherit}</style></head><body><div><h1>Sobrou<b>!</b></h1><p>Sem sinal agora.<br>Assim que a internet voltar, o app abre.</p><button onclick="location.reload()">Tentar de novo</button></div><script>addEventListener("online",function(){location.reload()});setTimeout(function(){location.reload()},8000)</script></body></html>',{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});

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
      if(fresh||!h)return comLimite(net(),fresh&&h?ESPERA:8000).catch(()=>h||semSinal());
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
