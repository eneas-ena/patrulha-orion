// Fliperama Vidas — ligação com o Supabase (ranking online, jogadores e administrador)
(function(){
'use strict';
const NUVEM_VERSAO='1.5.1';
// ---- Projeto principal do Supabase (já preenchido) ----
const SUPABASE_URL='https://ghjbljypxksubmcsvaig.supabase.co';
const SUPABASE_KEY='sb_publishable_qXCYqg1WdmelY9D1mptZXg_U8NdoKby';
const ADMIN_EMAIL='eneaspr@gmail.com';

const ls={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const ss={get(k){try{return JSON.parse(sessionStorage.getItem(k))}catch(e){return null}},set(k,v){try{sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{sessionStorage.removeItem(k)}catch(e){}}};
const fmt=n=>Math.round(+n||0).toLocaleString('pt-BR');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function rpc(fn,args,token){
  const h={'apikey':SUPABASE_KEY,'Content-Type':'application/json'};if(token)h.Authorization='Bearer '+token;
  let r;try{r=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:h,body:JSON.stringify(args||{})})}catch(e){throw new Error('Sem conexão com a internet')}
  const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch(e){d=t}
  if(!r.ok){if(r.status===401)throw new Error('Sessão expirada: entre de novo');throw new Error((d&&(d.message||d.msg))||('Erro '+r.status))}
  return d}
async function adminLogin(email,senha){
  let r;try{r=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password:senha})})}catch(e){throw new Error('Sem conexão com a internet')}
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(/invalid login/i.test(d.error_description||d.msg||'')?'E-mail ou senha incorretos':(d.error_description||d.msg||'E-mail ou senha incorretos'));
  const s={token:d.access_token,ate:Date.now()+((d.expires_in||3600)-60)*1000,email:(d.user&&d.user.email)||email};ss.set('fliper-admin',s);try{localStorage.setItem('fliper-adm','1')}catch(e){}window.dispatchEvent(new CustomEvent('nuvem-admin',{detail:true}));return s}
function adminSess(){const s=ss.get('fliper-admin');return s&&s.ate>Date.now()?s:null}

// ---- Jogador ----
const jogador=()=>ls.get('fliper-jogador',null);
async function entrar(iniciais,pin){const d=await rpc('pinball_entrar',{p_iniciais:iniciais,p_pin:pin});if(!d||!d.ok)throw new Error((d&&d.erro)||'Não foi possível entrar');
  const j={i:d.iniciais,n:d.nome,p:pin};ls.set('fliper-jogador',j);return j}
function sair(){ls.del('fliper-jogador')}

// ---- Fila de partidas (envia quando houver internet) ----
async function enviarFila(){const f=ls.get('fliper-fila',[]);if(!f.length)return null;let ult=null;const resto=[];
  for(const x of f){try{const d=await rpc('pinball_registrar_partida',x);ult=d;
      if(!d.ok&&/poucos segundos/.test(d.erro||'')){resto.push(x)}}catch(e){resto.push(x);break}}
  ls.set('fliper-fila',resto);return ult}
async function registrar(p){const j=jogador();if(!j)return{ok:false,erro:'sem jogador'};
  const x={p_iniciais:j.i,p_pin:j.p,p_mesa:p.mesa,p_modo:p.modo,p_pontos:Math.round(p.pontos),p_patente:p.patente|0,p_missoes:p.missoes|0,p_duracao:p.duracao|0,p_versao:p.versao||null};
  const f=ls.get('fliper-fila',[]);f.push(x);ls.set('fliper-fila',f.slice(-30));
  try{const d=await enviarFila();if(ls.get('fliper-fila',[]).some(y=>y.p_pontos===x.p_pontos&&y.p_mesa===x.p_mesa&&y.p_iniciais===x.p_iniciais))return{ok:false,fila:true};return d||{ok:false,fila:true}}catch(e){return{ok:false,erro:e.message,fila:true}}}
async function progresso(){const j=jogador();let d=null;if(j){try{d=await rpc('pinball_progresso',{p_iniciais:j.i,p_pin:j.p});if(!d||!d.ok)d=null}catch(e){d=null}}
  window.dispatchEvent(new CustomEvent('nuvem-progresso',{detail:d}));return d}
const ranking=(mesa,modo,lim)=>rpc('pinball_ranking',{p_mesa:mesa,p_modo:modo||'classico',p_limite:lim||10});
window.addEventListener('online',()=>{enviarFila().catch(()=>{})});

// ---- Estilo comum ----
const css=`.nv-box{display:grid;gap:6px;border-top:1px solid var(--line);padding-top:8px;text-align:left}
.nv-h{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin:0;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.nv-list{margin:0;padding:0;list-style:none;display:grid;gap:3px;font-variant-numeric:tabular-nums;max-height:34vh;overflow:auto}
.nv-list li{display:grid;grid-template-columns:3ch 4ch minmax(0,1fr) auto;gap:8px;font-size:13.5px}
.nv-list li span:nth-child(3){color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nv-list li.me{color:var(--accent);font-weight:600}
.nv-msg{margin:0;font-size:13px;color:var(--muted)}.nv-ok{color:var(--accent)}
.nv-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.nv-in{font:600 15px var(--body);color:var(--fg);background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:7px 9px;min-width:0}
.nv-in:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.nv-tab[aria-pressed="true"]{border-color:var(--accent);color:var(--accent)}
.nv-modal{position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.55);display:grid;place-items:center;padding:16px}
.nv-sheet{background:var(--panel);color:var(--fg);border:1px solid var(--line);border-radius:10px;padding:16px;width:min(640px,100%);max-height:calc(100vh - 32px);overflow:auto;display:grid;gap:12px;box-sizing:border-box}
.nv-sheet h2{margin:0;font:400 18px var(--display)}
.nv-table{width:100%;border-collapse:collapse;font-size:13.5px;font-variant-numeric:tabular-nums}
.nv-table th,.nv-table td{text-align:left;padding:5px 6px;border-bottom:1px solid var(--line)}.nv-table th{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.nv-scroll{overflow-x:auto}.nv-warn{border-color:#d33!important;color:#d33!important}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

function listHTML(rows,meIni){if(!rows||!rows.length)return'';return rows.map(r=>`<li class="${r.iniciais===meIni?'me':''}"><span>${r.posicao}º</span><span>${esc(r.iniciais)}</span><span>${esc(r.nome)}</span><span>${fmt(r.pontos)}</span></li>`).join('')}

// ================= Mesa (dentro do jogo) =================
function initMesa(){
  const O=window.__orion;if(!O||!document.getElementById('card'))return;const g=O.g;
  const K=(typeof KEY!=='undefined')?KEY:'orion';const MESA={orion:'orion',apoc:'apocalipse'}[K]||K;
  const modoKey=K+'-modo';
  const modoAtual=()=>{try{return localStorage.getItem(modoKey)==='treino'?'treino':'classico'}catch(e){return'classico'}};
  const box=document.createElement('div');box.className='nv-box';box.id='nvBox';
  box.innerHTML='<p class="nv-h"><span>Ranking online · <span id="nvModo"></span></span><span id="nvQuem"></span></p><ol class="nv-list" id="nvList"></ol><p class="nv-msg" id="nvMsg"></p><div id="nvJogM"></div>';
  document.getElementById('card').insertBefore(box,document.getElementById('start'));
  const quem=()=>{const j=jogador();document.getElementById('nvQuem').textContent=j?`Jogador: ${j.i}`:'';jogUI()};
  function jogUI(){const el=document.getElementById('nvJogM'),j=jogador();
    if(j){el.innerHTML=`<p class="nv-row nv-msg">Jogando como <b>${esc(j.n)}</b> (${esc(j.i)}) <button id="nvSairM">Trocar jogador</button><button id="nvAdmM">Administrador</button></p>`;
      document.getElementById('nvSairM').onclick=()=>{sair();quem();document.getElementById('nvMsg').textContent='Entre com outras iniciais para aparecer no ranking.'}}
    else{el.innerHTML=`<form id="nvEntM" class="nv-row"><input id="nvIniM" class="nv-in" maxlength="3" size="4" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABC" aria-label="Iniciais">
      <input id="nvPinM" class="nv-in" type="password" inputmode="numeric" maxlength="6" size="7" autocomplete="off" placeholder="PIN" aria-label="PIN de 6 números"><button type="submit">Entrar</button><button type="button" id="nvAdmM">Administrador</button></form>`;
      document.getElementById('nvEntM').onsubmit=async e=>{e.preventDefault();const m=document.getElementById('nvMsg');m.textContent='Conferindo…';
        try{const jj=await entrar(document.getElementById('nvIniM').value.trim().toUpperCase(),document.getElementById('nvPinM').value.trim());document.activeElement&&document.activeElement.blur();mostrar(modoAtual(),`<span class="nv-ok">Bem-vindo, ${esc(jj.n)}! Suas partidas vão para o ranking.</span>`)}catch(er){m.textContent=er.message}}}
    document.getElementById('nvAdmM').onclick=()=>{document.activeElement&&document.activeElement.blur();openAdmin()}}
  async function mostrar(modo,aviso){document.getElementById('nvModo').textContent=modo==='treino'?'Treino':'Clássico';quem();
    const msg=document.getElementById('nvMsg');if(aviso!==undefined){msg.innerHTML=aviso}
    try{const rows=await ranking(MESA,modo,10);const j=jogador();document.getElementById('nvList').innerHTML=listHTML(rows,j&&j.i);
      if(!rows.length&&aviso===undefined)msg.textContent='Ninguém no ranking ainda. Seja o primeiro!';
      else if(aviso===undefined)msg.textContent=jogador()?'':'Entre com suas iniciais e PIN para aparecer aqui.'}
    catch(e){if(aviso===undefined)msg.textContent='Ranking online indisponível: '+e.message}}
  const ng=window.newGame;window.newGame=function(){const r=ng.apply(this,arguments);g.t0=g.t;return r};
  const go=window.gameOver;window.gameOver=function(){const r=go.apply(this,arguments);const modo=g.easy?'treino':'classico';const j=jogador();
    if(j&&g.score>0){mostrar(modo,'Enviando para o ranking online…');
      registrar({mesa:MESA,modo,pontos:g.score,patente:g.rank,missoes:g.done||0,duracao:g.t-(g.t0||0),versao:(typeof VERSAO!=='undefined'?VERSAO:'')}).then(d=>{
        const m=d&&d.ok?(d.recorde_pessoal?'<span class="nv-ok">Partida enviada. Recorde pessoal!</span>':'<span class="nv-ok">Partida enviada ao ranking.</span>'):(d&&d.fila?'Sem internet agora: a partida será enviada depois.':'Não enviada: '+esc(d&&d.erro));
        mostrar(modo,m)})}
    else mostrar(modo);return r};
  // iniciais do ranking local já preenchidas com as do jogador
  const ini=document.getElementById('ini');if(ini){const sv=window.saveInitials;new MutationObserver(()=>{const j=jogador();if(j&&!document.getElementById('iniForm').hidden&&!ini.value)ini.value=j.i}).observe(document.getElementById('iniForm'),{attributes:true})}
  mostrar(modoAtual());enviarFila().catch(()=>{});
}

// ================= Menu =================
function initMenu(){
  const root=document.getElementById('nuvem');if(!root)return;
  root.innerHTML=`<section class="nv-panel" aria-labelledby="nvJogT"><h2 id="nvJogT" class="nv-title">Jogador</h2><div id="nvJog"></div></section>
  <section class="nv-panel" aria-labelledby="nvRankT"><h2 id="nvRankT" class="nv-title">Ranking online</h2>
   <div class="nv-row"><button class="nv-tab" data-mesa="arca" aria-pressed="false">Arca</button><button class="nv-tab" data-mesa="davi" aria-pressed="false">Davi</button><button class="nv-tab" data-mesa="jerico" aria-pressed="false">Jericó</button><button class="nv-tab" data-mesa="apocalipse" aria-pressed="false">Apocalipse</button><button class="nv-tab" data-mesa="orion" aria-pressed="true">Patrulha Órion</button>
   <button class="nv-tab" data-modo="classico" aria-pressed="true">Clássico</button><button class="nv-tab" data-modo="treino" aria-pressed="false">Treino</button></div>
   <ol class="nv-list" id="nvMList"></ol><p class="nv-msg" id="nvMMsg"></p></section>
  <p class="nv-row"><button id="nvAdmBtn">Área do administrador</button><span class="nv-msg" id="nvFila"></span></p>`;
  let mesa='orion',modo='classico';
  function jogUI(){const j=jogador(),el=document.getElementById('nvJog');
    if(j){el.innerHTML=`<p class="nv-row"><span>Jogando como <b>${esc(j.n)}</b> (${esc(j.i)})</span><button id="nvSair">Sair</button></p><p class="nv-msg">Suas partidas vão para o ranking online.</p>`;
      document.getElementById('nvSair').onclick=()=>{sair();jogUI();rankUI();progresso()}}
    else{el.innerHTML=`<form id="nvEnt" class="nv-row"><label class="nv-msg" for="nvIni">Iniciais</label><input id="nvIni" class="nv-in" maxlength="3" size="4" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABC">
      <label class="nv-msg" for="nvPin">PIN</label><input id="nvPin" class="nv-in" type="password" inputmode="numeric" maxlength="6" size="7" autocomplete="off" placeholder="6 números"><button type="submit">Entrar</button></form><p class="nv-msg" id="nvEntMsg">Sem entrar, você joga normalmente, mas não aparece no ranking online.</p>`;
      document.getElementById('nvEnt').onsubmit=async e=>{e.preventDefault();const m=document.getElementById('nvEntMsg');m.textContent='Conferindo…';
        try{await entrar(document.getElementById('nvIni').value.trim().toUpperCase(),document.getElementById('nvPin').value.trim());jogUI();rankUI();progresso()}catch(er){m.textContent=er.message}}}}
  async function rankUI(){root.querySelectorAll('[data-mesa]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mesa===mesa));root.querySelectorAll('[data-modo]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.modo===modo));
    const m=document.getElementById('nvMMsg');m.textContent='Carregando…';
    try{const rows=await ranking(mesa,modo,10);const j=jogador();document.getElementById('nvMList').innerHTML=listHTML(rows,j&&j.i);m.textContent=rows.length?'':'Ninguém no ranking ainda.'}
    catch(e){document.getElementById('nvMList').innerHTML='';m.textContent='Ranking indisponível: '+e.message}}
  root.querySelectorAll('[data-mesa]').forEach(b=>b.onclick=()=>{mesa=b.dataset.mesa;rankUI()});root.querySelectorAll('[data-modo]').forEach(b=>b.onclick=()=>{modo=b.dataset.modo;rankUI()});
  document.getElementById('nvAdmBtn').onclick=openAdmin;
  jogUI();rankUI();progresso();
  enviarFila().then(()=>{const n=ls.get('fliper-fila',[]).length;document.getElementById('nvFila').textContent=n?`${n} partida(s) aguardando envio`:''}).catch(()=>{});
}

// ---- Painel do administrador ----
function openAdmin(){
  const md=document.createElement('div');md.className='nv-modal';md.innerHTML='<div class="nv-sheet" role="dialog" aria-modal="true" aria-labelledby="nvAdmT"></div>';document.body.appendChild(md);
  const sh=md.firstChild;const close=()=>md.remove();md.addEventListener('click',e=>{if(e.target===md)close()});
  document.addEventListener('keydown',function k(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',k)}});
  function loginUI(msg){sh.innerHTML=`<h2 id="nvAdmT">Área do administrador</h2><form id="nvAL" style="display:grid;gap:8px"><label class="nv-msg" for="nvAE">E-mail</label><input id="nvAE" class="nv-in" type="email" autocomplete="username" value="${ADMIN_EMAIL}">
    <label class="nv-msg" for="nvAS">Senha</label><input id="nvAS" class="nv-in" type="password" autocomplete="current-password"><div class="nv-row"><button type="submit">Entrar</button><button type="button" id="nvAX">Fechar</button></div></form><p class="nv-msg" id="nvAM">${esc(msg||'Use o mesmo login dos seus outros apps.')}</p>`;
    document.getElementById('nvAX').onclick=close;setTimeout(()=>document.getElementById('nvAS').focus(),50);
    document.getElementById('nvAL').onsubmit=async e=>{e.preventDefault();document.getElementById('nvAM').textContent='Entrando…';
      try{await adminLogin(document.getElementById('nvAE').value.trim(),document.getElementById('nvAS').value);painel()}catch(er){document.getElementById('nvAM').textContent=er.message}}}
  async function painel(aviso){const s=adminSess();if(!s)return loginUI();
    sh.innerHTML=`<h2 id="nvAdmT">Jogadores</h2>
    <form id="nvAF" style="display:grid;gap:8px"><div class="nv-row"><label class="nv-msg" for="nvFI">Iniciais</label><input id="nvFI" class="nv-in" maxlength="3" size="4" autocapitalize="characters" autocomplete="off" placeholder="ABC">
      <label class="nv-msg" for="nvFN">Nome</label><input id="nvFN" class="nv-in" maxlength="60" style="flex:1;min-width:120px" placeholder="Nome da pessoa"></div>
      <div class="nv-row"><label class="nv-msg" for="nvFP">PIN</label><input id="nvFP" class="nv-in" inputmode="numeric" maxlength="6" size="7" autocomplete="off" placeholder="6 números">
      <label class="nv-msg"><input type="checkbox" id="nvFA" checked> Ativo</label><button type="submit">Salvar jogador</button><button type="button" id="nvFC">Limpar</button></div>
      <p class="nv-msg">Para alterar alguém, toque em Editar. Com o PIN em branco, o PIN atual é mantido.</p></form>
    <p class="nv-msg" id="nvPM">${aviso||'Carregando…'}</p><div class="nv-scroll"><table class="nv-table"><thead><tr><th>Ini.</th><th>Nome</th><th>Partidas</th><th>Órion</th><th>Apocalipse</th><th>Mesas</th><th></th></tr></thead><tbody id="nvTB"></tbody></table></div>
    <div class="nv-row"><button id="nvZT">Zerar todas as partidas</button><button id="nvSairA">Sair do administrador</button><button id="nvFX">Fechar</button></div>`;
    const F={i:document.getElementById('nvFI'),n:document.getElementById('nvFN'),p:document.getElementById('nvFP'),a:document.getElementById('nvFA')};
    document.getElementById('nvFX').onclick=close;document.getElementById('nvSairA').onclick=()=>{ss.del('fliper-admin');try{localStorage.removeItem('fliper-adm')}catch(e){}window.dispatchEvent(new CustomEvent('nuvem-admin',{detail:false}));loginUI('Você saiu.')};
    document.getElementById('nvFC').onclick=()=>{F.i.value='';F.n.value='';F.p.value='';F.a.checked=true;F.i.readOnly=false};
    const confirma=(btn,txt,fn)=>{btn.onclick=()=>{if(btn.dataset.c){fn()}else{btn.dataset.c='1';btn.classList.add('nv-warn');const o=btn.textContent;btn.textContent=txt;setTimeout(()=>{delete btn.dataset.c;btn.classList.remove('nv-warn');btn.textContent=o},3500)}}};
    const call=async(fn,args,ok)=>{try{const d=await rpc(fn,args,s.token);if(d&&d.ok===false)throw new Error(d.erro);painel(ok)}catch(e){if(/expirada/.test(e.message)){ss.del('fliper-admin');loginUI(e.message)}else document.getElementById('nvPM').textContent=e.message}};
    confirma(document.getElementById('nvZT'),'Confirmar: zerar tudo',()=>call('pinball_admin_zerar',{p_iniciais:null},'Todas as partidas foram apagadas.'));
    document.getElementById('nvAF').onsubmit=e=>{e.preventDefault();const i=F.i.value.trim().toUpperCase();
      if(!/^[A-Z]{3}$/.test(i)){document.getElementById('nvPM').textContent='Use exatamente 3 letras, sem acento.';return}
      if(!F.n.value.trim()){document.getElementById('nvPM').textContent='Informe o nome.';return}
      if(F.p.value&&!/^\d{6}$/.test(F.p.value)){document.getElementById('nvPM').textContent='O PIN precisa ter 6 números.';return}
      call('pinball_admin_salvar_jogador',{p_iniciais:i,p_nome:F.n.value.trim(),p_pin:F.p.value||null,p_ativo:F.a.checked},`Jogador ${i} salvo.`)};
    try{const rows=await rpc('pinball_admin_listar',{},s.token);let libs=[];try{libs=await rpc('pinball_admin_liberacoes',{},s.token)||[]}catch(e){}
      const libDe=i=>{const x=libs.find(l=>l.iniciais===i);return x?x.mesas:[]};const tb=document.getElementById('nvTB');document.getElementById('nvPM').textContent=aviso||(rows.length?`${rows.length} jogador(es).`:'Nenhum jogador ainda. Cadastre o primeiro acima.');
      tb.innerHTML=rows.map(r=>`<tr><td><b>${esc(r.iniciais)}</b></td><td>${esc(r.nome)}${r.ativo?'':' <span class="nv-msg">(inativo)</span>'}</td><td>${r.partidas}</td><td>${r.melhor_orion?fmt(r.melhor_orion):'–'}</td><td>${r.melhor_apocalipse?fmt(r.melhor_apocalipse):'–'}</td><td>${libDe(r.iniciais).length>=5?'<button data-tl="'+esc(r.iniciais)+'">Tirar liberação</button>':'<button data-lb="'+esc(r.iniciais)+'">Liberar todas</button>'}</td>
        <td class="nv-row"><button data-ed="${esc(r.iniciais)}">Editar</button><button data-zr="${esc(r.iniciais)}">Zerar</button><button data-ex="${esc(r.iniciais)}">Excluir</button></td></tr>`).join('');
      tb.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.iniciais===b.dataset.ed);F.i.value=r.iniciais;F.i.readOnly=true;F.n.value=r.nome;F.p.value='';F.a.checked=r.ativo;F.n.focus()});
      tb.querySelectorAll('[data-lb]').forEach(b=>b.onclick=()=>call('pinball_admin_liberar',{p_iniciais:b.dataset.lb,p_mesa:'todas',p_liberar:true},`Todas as mesas liberadas para ${b.dataset.lb}.`));
      tb.querySelectorAll('[data-tl]').forEach(b=>b.onclick=()=>call('pinball_admin_liberar',{p_iniciais:b.dataset.tl,p_mesa:'todas',p_liberar:false},`Liberação manual retirada de ${b.dataset.tl}. As mesas abertas pelo jogo continuam abertas.`));
      tb.querySelectorAll('[data-zr]').forEach(b=>confirma(b,'Confirmar',()=>call('pinball_admin_zerar',{p_iniciais:b.dataset.zr},`Partidas de ${b.dataset.zr} apagadas.`)));
      tb.querySelectorAll('[data-ex]').forEach(b=>confirma(b,'Confirmar',()=>call('pinball_admin_excluir',{p_iniciais:b.dataset.ex},`Jogador ${b.dataset.ex} excluído.`)))}
    catch(e){if(/expirada/.test(e.message)){ss.del('fliper-admin');loginUI(e.message)}else document.getElementById('nvPM').textContent=e.message}}
  adminSess()?painel():loginUI();
}

window.nuvem={versao:NUVEM_VERSAO,jogador,entrar,sair,ranking,registrar,enviarFila,progresso};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{initMenu();initMesa()});else{initMenu();initMesa()}
})();
