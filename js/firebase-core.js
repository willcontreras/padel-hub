const firebaseConfig = {
  apiKey: "AIzaSyAf00Jc3GjWVk6yBtxORfRbfzT_i-_ICto",
  authDomain: "padelhub-d839d.firebaseapp.com",
  projectId: "padelhub-d839d",
  storageBucket: "padelhub-d839d.firebasestorage.app",
  messagingSenderId: "465026048231",
  appId: "1:465026048231:web:23b7dfb21e1b54ac9a4242",
  measurementId: "G-NQTVZNWWKP"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

function signInWithGoogle(){
  if(window._loginInProgress)return;
  window._loginInProgress=true;
  dbg('Iniciando login...');
  const loginTimeout=setTimeout(()=>{
    if(window._loginInProgress){dbg('Login timeout...');window._loginInProgress=false;}
  },60000);
  auth.signInWithPopup(provider).then(r=>{
    clearTimeout(loginTimeout);
    dbg('Login OK: '+r.user.email);
    window._loginInProgress=false;
  }).catch(e=>{
    clearTimeout(loginTimeout);
    window._loginInProgress=false;
    dbg('Popup: '+e.code);
    if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'){
      auth.signInWithRedirect(provider).catch(e2=>{dbg('Redirect error: '+e2.code);});
    } else if(e.code!=='auth/popup-closed-by-user'&&e.code!=='auth/cancelled-popup-request'){
      dbg('ERROR: '+e.message);
    }
  });
}

function show(id){
  const el = document.getElementById(id);
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
}
function hide(id){ document.getElementById(id).style.display='none'; }

function fbSignOut() {
  auth.signOut().then(() => {
    window.userData = { partidos:[], palas:[], torneos:[], perfil:{} };
    hide('s-app'); hide('s-rol'); show('s-login');
  });
}

// Muestra la pantalla de rol con la foto y nombre del usuario
function mostrarSeleccionRol(user) {
  const initials = (user.displayName||'U').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const avatarHTML = user.photoURL
    ? `<img src="${user.photoURL}" referrerpolicy="no-referrer" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0"/>`
    : `<div style="width:44px;height:44px;border-radius:50%;background:#E1F5EE;color:#0F6E56;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:500;flex-shrink:0">${initials}</div>`;
  document.getElementById('rol-user-info').innerHTML = `
    ${avatarHTML}
    <div>
      <div style="font-size:14px;font-weight:500">${user.displayName||'Usuario'}</div>
      <div style="font-size:12px;color:#888780;margin-top:2px">${user.email}</div>
    </div>`;
  hide('s-login'); hide('s-app'); show('s-rol');
}

async function elegirRol(rol) {
  if (!window.userData.perfil) window.userData.perfil = {};
  window.userData.perfil.rol = rol;
  // Si es la primera vez (sin apodo), pedir que complete el perfil
  if (!window.userData.perfil.apodo) {
    hide('s-rol');
    mostrarCompletarPerfil();
  } else {
    await saveData();
    hide('s-rol');
    iniciarApp();
  }
}

function mostrarCompletarPerfil() {
  // Abrir el modal de perfil en modo "primera vez" (sin botón cancelar)
  const p = window.userData.perfil || {};
  document.getElementById('m-perfil-title').textContent = 'Completa tu perfil';
  document.getElementById('btn-perfil-cancelar').style.display = 'none';
  document.getElementById('ep-apodo').value = p.apodo || '';
  document.getElementById('ep-mostrar-nombre').checked = p.mostrarNombre || false;
  document.getElementById('ep-posicion').value = p.posicion || '';
  document.getElementById('ep-categoria').value = p.categoria || '';
  document.getElementById('ep-genero').value = p.genero || '';
  document.getElementById('ep-club').value = p.club || '';
  document.getElementById('ep-desde').value = p.desde || '';
  document.getElementById('m-perfil').style.display = 'flex';
}

function iniciarApp() {
  const user = window.CURRENT_USER;
  if (!user) return;
  const apodo = window.userData?.perfil?.apodo;
  const initials = apodo ? apodo.slice(0,2).toUpperCase() : (user.displayName||'U').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const av = document.getElementById('tb-av');
  if (user.photoURL) {
    av.innerHTML = `<img src="${user.photoURL}" referrerpolicy="no-referrer"/>`;
  } else {
    av.textContent = initials;
    av.style.cssText = 'background:#E1F5EE;color:#0F6E56;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;cursor:pointer';
  }
  _initTheme();
  hide('s-login'); hide('s-rol'); show('s-app');
  const palas=window.userData?.palas||[];
  selectedPalaId=(palas.find(p=>p.predeterminada)||palas[0])?.id||null;
  // Restaurar token de Google Calendar si existe
  if(window.userData?.gcalAccessToken) gcalToken=window.userData.gcalAccessToken;
  // Manejar callback OAuth de Google Calendar (flujo implícito — token en hash)
  if(window.location.hash.includes('access_token=')){
    manejarCallbackGCal().then(returnPage=>goTo(returnPage||'home'));
  } else {
    goToHome();
  }
}

// ===== LÓGICA DE LA APP =====
const PARAMS=['Control','Potencia','Durabilidad','Peso/balance','Maniobrabilidad','Salida de bola'];
const BAR_COLS=['#1D9E75','#378ADD','#D85A30','#BA7517','#9A3ABE','#C0497A'];
const POD=['#EF9F27','#888780','#D85A30'];
const AV_STYLES=['background:#E1F5EE;color:#0F6E56','background:#E6F1FB;color:#185FA5','background:#FAEEDA;color:#854F0B','background:#FAECE7;color:#993C1D','background:#EEEDFE;color:#3C3489'];

function toggleTheme(){
  const html=document.documentElement;
  const current=html.getAttribute('data-theme')||'auto';
  // auto->light->dark->auto
  const next=current==='auto'?'light':current==='light'?'dark':'auto';
  html.setAttribute('data-theme',next);
  localStorage.setItem('pp-theme',next);
  const btn=document.getElementById('tb-theme-btn');
  const icon=document.getElementById('tb-theme-icon');
  const lbl=document.getElementById('tb-theme-label');
  if(!btn)return;
  if(next==='light'){icon.textContent='☀️';lbl.textContent='Claro';}
  else if(next==='dark'){icon.textContent='🌙';lbl.textContent='Oscuro';}
  else{icon.textContent='🔆';lbl.textContent='Auto';}
}
function _initTheme(){
  const saved=localStorage.getItem('pp-theme')||'auto';
  document.documentElement.setAttribute('data-theme',saved);
  setTimeout(()=>{
    const icon=document.getElementById('tb-theme-icon');
    const lbl=document.getElementById('tb-theme-label');
    if(!icon)return;
    if(saved==='light'){icon.textContent='☀️';lbl.textContent='Claro';}
    else if(saved==='dark'){icon.textContent='🌙';lbl.textContent='Oscuro';}
    else{icon.textContent='🔆';lbl.textContent='Auto';}
  },100);
}
function _getDarkColors(){const d=window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches;return{green:d?'#1a3028':'#E1F5EE',amber:d?'#2e2010':'#FAEEDA',lime:d?'#1e2a10':'#C0DD97',purple:d?'#1e1c30':'#EEEDFE',txt:d?'var(--text,#e8e6e0)':'#1a1a18'};}
const MENU_ITEMS_BASE=[
  {id:'partidos', icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>`, label:'Nuevo partido', color:'#E1F5EE'},
  {id:'historial', icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`, label:'Historial',    color:'#E6F1FB'},
  {id:'torneo',   icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M12 17v4"/><path d="M8 21h8"/><path d="M6 5h12v7a6 6 0 0 1-12 0V5z"/></svg>`, label:'Torneos',       color:'#FAEEDA'},
  {id:'jugadores',icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, label:'Jugadores',     color:'#FAECE7'},
  {id:'clubes',   icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>`, label:'Clubes',        color:'#f5f5f3'},
  {id:'palas',    icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#BA7517" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 10c0 2.76 1.68 5.12 4.1 6.32L3 21h4l2-3h6l2 3h4l-3.1-4.68C20.32 15.12 22 12.76 22 10c0-3.52-4.48-8-10-8z"/></svg>`, label:'Mis palas',     color:'#EEEDFE'},
  {id:'ranking',  icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`, label:'Ranking',       color:'#f5f5f3'},
  {id:'stats',    icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#BA7517" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`, label:'Estadísticas',  color:'#f5f5f3'},
  {id:'perfil',   icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#BA7517" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`, label:'Mi perfil',     color:'#f5f5f3'},
];
const MENU_ITEM_ADMIN={id:'admin', icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#534AB7" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`, label:'Administración', color:'#f5f5f3'};

function isAdmin(){ return !!(userData?.perfil?.admin); }
function getMenuItems(){ return isAdmin()?[...MENU_ITEMS_BASE,MENU_ITEM_ADMIN]:MENU_ITEMS_BASE; }

window.userData = window.userData || { partidos:[], palas:[], torneos:[], perfil:{} };
window.saveData = window.saveData || (() => Promise.resolve());
window.CURRENT_USER = window.CURRENT_USER || null;
window.ADMIN_UID = window.ADMIN_UID || null;

let newPalaParams={}, selFmtVal='americano', setsCount=1, selScoringVal='games', selVisibilidadVal='privado', curPagosTorneoId=null;
let navStack=[];
let curTorneoIdx=-1, notaMode='publica';
let curResultadoPartidoId=null, curResultadoTorneoId=null;
let filterCat='all', filterPos='all';
let allUsers=[];
let selectedPalaId=null;



// NAV
function goTo(page){
  // Track navigation stack (max 5 levels, exclude perfil from stack to avoid loops)
  const currentPage=document.querySelector('.page.active')?.id?.replace('page-','');
  if(currentPage&&currentPage!==page&&currentPage!=='perfil'){
    navStack.push(currentPage);
    if(navStack.length>5)navStack.shift();
  }
  document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
  document.getElementById('page-'+page)?.classList.add('active');
  const labels={partidos:'Nuevo partido',historial:'Historial',torneo:'Torneos',palas:'Mis palas',ranking:'Ranking',stats:'Estadísticas',jugadores:'Jugadores',perfil:'Mi perfil','pala-detalle':'Detalle de pala',admin:'Administración',clubes:'Clubes','entrenador-agenda':'Mi agenda','entrenador-alumnos':'Mis alumnos','entrenador-reporte':'Reporte mensual','entrenador-clases':'Clases','entrenador-academias':'Academias'};
  const tl=document.getElementById('topbar-left');
  const tbMode=document.getElementById('tb-mode');
  if(page==='home'||(page==='entrenador-agenda'&&userData?.perfil?.rol==='entrenador')){
    navStack=[];
    const apodo=userData?.perfil?.apodo||CURRENT_USER?.displayName?.split(' ')[0]||'';
    tl.innerHTML=`<div style="display:flex;flex-direction:column;gap:1px"><span style="font-size:15px;color:#888780;font-weight:400">Hola, <strong style="color:var(--color-text-primary,#1a1a18)">${apodo}</strong> 👋</span><div style="display:flex;align-items:center;gap:5px"><span class="topbar-logo">🎾 Pádel Hub</span><span style="font-size:9px;font-weight:600;color:var(--color-text-secondary,#888780);background:var(--color-background-secondary,#f1efe8);border:0.5px solid var(--color-border-tertiary,#e5e4df);border-radius:4px;padding:1px 5px;letter-spacing:.3px">v1.44</span></div></div>`;
    tbMode.style.display='flex';
    actualizarBadgeModo();
  } else {
    const backLabels={palas:'Mis palas','entrenador-clases':'Clases',torneo:'Torneos',jugadores:'Jugadores',ranking:'Ranking',stats:'Estadísticas',historial:'Historial',partidos:'Partidos',perfil:'Perfil',home:'Inicio'};
    let backTo, backLabel;
    if(page==='pala-detalle'){backTo='palas';backLabel='Mis palas';}
    else if(['entrenador-agenda','entrenador-alumnos','entrenador-reporte'].includes(page)){backTo='entrenador-clases';backLabel='Clases';}
    else if(page==='perfil'&&navStack.length>0){
      backTo=navStack[navStack.length-1];
      backLabel=backLabels[backTo]||'Atrás';
    }
    else{backTo='home';backLabel='Inicio';}
    tl.innerHTML=`<button class="topbar-back" onclick="navBack('${backTo}')">← ${backLabel}</button><span class="topbar-section">${labels[page]||''}</span>`;
    tbMode.style.display='none';
  }
  document.getElementById('home-fab').classList.toggle('visible', page!=='home'&&page!=='pagos-torneo'&&page!=='torneos-publicos'&&page!=='torneo-publico-detalle');
  ({home:renderHome,'entrenador-agenda':renderAgenda,'entrenador-alumnos':renderAlumnos,'entrenador-reporte':()=>{document.getElementById('reporte-mes').value=new Date().toISOString().slice(0,7);renderReporte();},'entrenador-clases':()=>{},'entrenador-academias':renderAcademias,historial:()=>renderHistorial('all'),palas:renderPalas,torneo:renderTorneo,'pagos-torneo':renderPagosTorneo,'torneos-publicos':renderTorneosPublicos,'torneo-publico-detalle':renderTorneoPublicoDetalle,stats:renderStats,partidos:initSets,ranking:renderRankingPage,jugadores:renderJugadores,perfil:()=>renderPerfil(null),admin:renderAdmin,clubes:renderClubesPublico})[page]?.();
}
function navBack(page){
  // Pop the stack when going back
  if(navStack.length>0&&navStack[navStack.length-1]===page)navStack.pop();
  goTo(page);
}

// INICIO
function renderHome(){
  const rol=userData?.perfil?.rol||'jugador';
  if(rol==='entrenador'){ renderMenuEntrenador(); return; }
  const u=CURRENT_USER, ud=userData, ps=ud.partidos||[];
  const wins=ps.filter(p=>p.victoria).length;
  const losses=ps.length-wins;
  const wr=ps.length?Math.round(wins/ps.length*100):0;
  const perfil=ud.perfil||{};
  const apodo=_fmtApodo(perfil.apodo||u?.displayName||'Jugador');

  // Racha actual
  let rachaActual=0, rachaMax=0, cur=0;
  [...ps].reverse().forEach((p,i)=>{
    if(p.victoria){ cur++; if(i===0||rachaActual===0) rachaActual=cur; rachaMax=Math.max(rachaMax,cur); }
    else{ if(rachaActual===0) rachaActual=0; cur=0; }
  });
  // Recalcular racha actual desde el más reciente
  rachaActual=0;
  for(let i=0;i<ps.length;i++){ if(ps[i].victoria) rachaActual++; else break; }

  // Último partido
  const ult=ps[0];
  const ultScore=ult?ult.sets.map(s=>`${s.a}-${s.b}`).join(', '):'—';
  const ultDias=ult?Math.floor((Date.now()-new Date(ult.fecha))/(1000*60*60*24)):null;
  const ultDiasStr=ultDias===null?'—':ultDias===0?'hoy':ultDias===1?'ayer':`hace ${ultDias} días`;

  // Avatar
  const initials=apodo.slice(0,2).toUpperCase();
  const avatarHTML=u?.photoURL
    ?`<img src="${u.photoURL}" referrerpolicy="no-referrer"/>`
    :`<span style="font-size:17px;font-weight:500">${initials}</span>`;

  // Años jugando
  const años=perfil.desde?Math.floor((Date.now()-new Date(perfil.desde))/(1000*60*60*24*365)):null;
  const desdeStr=años!==null?(años===0?'Este año':años===1?'1 año':`${años} años`):'';

  document.getElementById('home-dashboard').innerHTML=`
    <!-- Perfil -->
    <div class="dash-perfil">
      <div class="dash-av" style="${u?.photoURL?'':`background:#E1F5EE;color:#0F6E56`}">${avatarHTML}</div>
      <div class="dash-pinfo">
        <div class="dash-pname">${apodo}</div>
        <div class="dash-badges">
          ${perfil.categoria?`<span class="dash-badge db-cat">${perfil.categoria}</span>`:''}
          ${perfil.posicion?`<span class="dash-badge db-pos">${perfil.posicion}</span>`:''}
          ${perfil.club?`<span class="dash-badge db-club">📍 ${perfil.club}</span>`:''}
          ${desdeStr?`<span class="dash-badge db-desde">${desdeStr} jugando</span>`:''}
        </div>
      </div>
      <button class="dash-edit" onclick="goTo('perfil')">Editar</button>
    </div>

    <!-- Stats principales -->
    <div class="dash-stats">
      <div class="ds"><div class="ds-val">${ps.length}</div><div class="ds-lbl">Partidos</div></div>
      <div class="ds"><div class="ds-val" style="color:#1D9E75">${wins}</div><div class="ds-lbl">Ganados</div></div>
      <div class="ds"><div class="ds-val" style="color:#D85A30">${losses}</div><div class="ds-lbl">Perdidos</div></div>
      <div class="ds"><div class="ds-val" style="color:#BA7517">${wr}%</div><div class="ds-lbl">Efect.</div></div>
    </div>

    <!-- Racha + último partido -->
    <div class="dash-row2">
      <div class="dash-mini">
        <div class="dm-lbl">Racha actual</div>
        <div class="dm-val" style="color:${rachaActual>0?'#1D9E75':'#D85A30'}">${rachaActual>0?`${rachaActual} victoria${rachaActual>1?'s':''}`:'Sin racha'}</div>
        <div class="dm-sub">Máxima: ${rachaMax} partido${rachaMax!==1?'s':''}</div>
      </div>
      <div class="dash-mini">
        <div class="dm-lbl">Último partido</div>
        <div class="dm-val">${ult?`<span class="${ult.victoria?'':''}">` + ultScore + '</span>':'Sin partidos'}</div>
        <div class="dm-sub">${ultDiasStr}${ult?.club?' · '+ult.club:''}</div>
        ${ps.length?`<div class="dm-bar"><div class="dm-fill" style="width:${wr}%"></div></div>`:''}
      </div>
    </div>`;

  // Menú agrupado
  const isDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches;
  const C=_getDarkColors();
  const TXT=C.txt;
  const grupos=[
    {lbl:'Mis acciones', items:[
      {id:'partidos',icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>`,label:'Nuevo partido',color:C.green},
      {id:'torneo',  icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M12 17v4"/><path d="M8 21h8"/><path d="M6 5h12v7a6 6 0 0 1-12 0V5z"/></svg>`,label:'Torneos',      color:C.green},
      {id:'historial',icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`,label:'Historial',   color:C.green},
    ]},
    {lbl:'Comunidad', items:[
      {id:'jugadores',icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,label:'Jugadores',   color:C.amber},
      {id:'clubes',   icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>`,label:'Clubes',      color:C.amber},
      {id:'ranking',  icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,label:'Ranking',     color:C.amber},
      {id:'torneos-publicos',icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,label:'Torneos públicos',color:C.amber},
    ]},
    {lbl:'Métricas', items:[
      {id:'stats',icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#BA7517" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,label:'Mis estadísticas',color:C.lime},
      {id:'palas',icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#BA7517" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 10c0 2.76 1.68 5.12 4.1 6.32L3 21h4l2-3h6l2 3h4l-3.1-4.68C20.32 15.12 22 12.76 22 10c0-3.52-4.48-8-10-8z"/></svg>`,label:'Mis palas',       color:C.lime},
      {id:'perfil',icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#BA7517" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,label:'Mi perfil',      color:C.lime},
    ]},
    ...(isAdmin()?[{lbl:'Administración', divider:true, items:[
      {id:'admin',icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#534AB7" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,label:'Administración',color:C.purple},
    ]}]:[]),
  ];

  // Colores de acento por grupo
  const dotColors={
    'Mis acciones':'#1D9E75',
    'Comunidad':'#378ADD',
    'Métricas':'#BA7517',
    'Administración':'#534AB7',
  };
  const groupIds={'Mis acciones':'acciones','Comunidad':'comunidad','Métricas':'metricas','Administración':'admin'};
  document.getElementById('menu-grid').innerHTML=grupos.map(g=>`
    <div class="menu-section" data-group="${groupIds[g.lbl]||''}">
      <div class="menu-group-hdr">
        <div class="menu-group-dot" style="background:${dotColors[g.lbl]||'#888780'}"></div>
        <span class="menu-group-lbl">${g.lbl}</span>
      </div>
      <div class="menu-grid-group ${g.items.length===1?'cols-1':g.items.length===2?'cols-2':''}">
        ${g.items.map(item=>`
          <div class="menu-item" onclick="goTo('${item.id}')">
            <span class="menu-icon">${item.icon}</span>
            <div class="menu-label">${item.label}</div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

