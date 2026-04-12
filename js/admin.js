// ===== ADMINISTRACIÓN =====
function renderAdmin(){
  if(!isAdmin()){ document.getElementById('admin-players-list').innerHTML='<div class="empty">No tienes permisos de administrador</div>'; return; }
  allUsers=[];
  renderAdminJugadores();
}

// Clubes públicos — vista para todos los usuarios
async function renderClubesPublico(){
  const el=document.getElementById('clubes-publico-list');
  if(!el) return;
  el.innerHTML='<div class="empty">Cargando clubes...</div>';
  const clubes=await cargarClubes();
  if(!clubes.length){
    el.innerHTML='<div class="empty">No hay clubes registrados aún.<br>Sé el primero en agregar uno →</div>';
    return;
  }
  el.innerHTML=clubes.map((c,i)=>`
    <div class="card" style="margin-bottom:8px">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <div style="font-size:24px;flex-shrink:0">🏟️</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${c.nombre}</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
            ${c.ciudad?`<span style="font-size:11px;color:var(--color-text-secondary,#888780)">📍 ${c.ciudad}</span>`:''}
            ${c.canchas?`<span style="font-size:11px;color:var(--color-text-secondary,#888780)">🎾 ${c.canchas} canchas</span>`:''}
            ${c.telefono?`<span style="font-size:11px;color:var(--color-text-secondary,#888780)">📞 ${c.telefono}</span>`:''}
            ${c.instagram?`<a href="https://instagram.com/${c.instagram}" target="_blank" style="font-size:11px;color:#C13584;text-decoration:none">📸 @${c.instagram}</a>`:''}
          </div>
          ${c.web?`<a href="${c.web}" target="_blank" style="font-size:11px;color:#378ADD;display:block;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.web}</a>`:''}
          ${c.notas?`<div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-top:4px;font-style:italic">"${c.notas}"</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;align-items:flex-end">
          ${c.direccion||c.telefono||c.web||c.instagram?`<button class="btn btn-sm btn-outline" style="color:var(--color-text-primary,#1a1a18);font-size:11px" onclick="verDetalleClub('${c.nombre.replace(/'/g,"\\'")}')">Ver detalle</button>`:''}
          ${isAdmin()?`<button class="btn btn-sm btn-outline" style="color:var(--color-text-primary,#1a1a18);font-size:11px" onclick="abrirEditarClub(${i})">Editar</button>
          <button class="btn btn-sm" style="background:#FAECE7;color:#993C1D;border-color:#f0c4b0;font-size:11px" onclick="eliminarClub(${i})">Eliminar</button>`:''}
        </div>
      </div>
    </div>`).join('');
}

async function renderAdminJugadores(){
  const el=document.getElementById('admin-players-list');
  if(!el) return;
  el.innerHTML='<div class="empty">Cargando...</div>';
  try{
    const snap=await db.collection('users').get();
    allUsers=snap.docs.map(d=>({uid:d.id,...d.data()}));
  }catch(e){console.error(e);}
  const search=(document.getElementById('admin-player-search')?.value||'').toLowerCase();
  let players=[...allUsers];
  if(search) players=players.filter(p=>(p.perfil?.apodo||p.email||'').toLowerCase().includes(search));
  el.innerHTML=players.length?players.map((p,i)=>{
    const apodo=_fmtApodo(p.perfil?.apodo||p.email?.split('@')[0]||'Sin apodo');
    const isMe=p.uid===CURRENT_USER?.uid;
    const perfil=p.perfil||{};
    const ps=p.partidos||[];
    return `<div class="card" style="margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="av" style="${['background:#E1F5EE;color:#0F6E56','background:#E6F1FB;color:#185FA5','background:#FAEEDA;color:#854F0B','background:#FAECE7;color:#993C1D','background:#EEEDFE;color:#3C3489'][i%5]}">${apodo.slice(0,2).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${apodo}${isMe?' <span class="badge bg" style="font-size:9px">Yo</span>':''}</div>
          <div style="font-size:10px;color:var(--color-text-secondary,#888780);margin-top:1px">${[perfil.categoria,perfil.posicion,perfil.club].filter(Boolean).join(' · ')||'Sin datos'} · ${ps.length} partidos</div>
          <div style="display:flex;gap:4px;margin-top:3px;flex-wrap:wrap">
            ${perfil.admin?'<span class="badge bb" style="font-size:9px">Admin</span>':''}
            ${perfil.rol?`<span class="badge ba" style="font-size:9px">${perfil.rol}</span>`:''}
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" style="color:var(--color-text-primary,#1a1a18);font-size:11px" onclick="abrirEditarJugadorAdmin('${p.uid}')">Editar</button>
          ${!isMe?`<button class="btn btn-sm" style="background:#FAECE7;color:#993C1D;border-color:#f0c4b0;font-size:11px" onclick="eliminarJugadorAdmin('${p.uid}','${apodo}')">Eliminar</button>`:''}
        </div>
      </div>
    </div>`;
  }).join(''):'<div class="empty">No se encontraron jugadores</div>';
}

function abrirEditarJugadorAdmin(uid){
  const p=allUsers.find(x=>x.uid===uid);
  if(!p) return;
  const perfil=p.perfil||{};
  document.getElementById('aj-uid').value=uid;
  document.getElementById('aj-apodo').value=perfil.apodo||'';
  document.getElementById('aj-categoria').value=perfil.categoria||'';
  document.getElementById('aj-posicion').value=perfil.posicion||'';
  document.getElementById('aj-genero').value=perfil.genero||'';
  document.getElementById('aj-club').value=perfil.club||'';
  document.getElementById('aj-rol').value=perfil.rol||'jugador';
  document.getElementById('aj-admin').checked=!!(perfil.admin);
  document.getElementById('m-admin-jugador').style.display='flex';
}

async function guardarJugadorAdmin(){
  const uid=document.getElementById('aj-uid').value;
  const ref=db.collection('users').doc(uid);
  const snap=await ref.get();
  if(!snap.exists){toast('Usuario no encontrado');return;}
  const data=snap.data();
  data.perfil={
    ...(data.perfil||{}),
    apodo:_fmtApodo(document.getElementById('aj-apodo').value.trim().split(/\s+/).slice(0,2).join(' ')),
    categoria:document.getElementById('aj-categoria').value,
    posicion:document.getElementById('aj-posicion').value,
    genero:document.getElementById('aj-genero').value,
    club:document.getElementById('aj-club').value.trim(),
    rol:document.getElementById('aj-rol').value,
    admin:document.getElementById('aj-admin').checked,
  };
  await ref.set(data);
  closeModal('m-admin-jugador');
  toast('Jugador actualizado');
  renderAdminJugadores();
}

async function eliminarJugadorAdmin(uid, apodo){
  if(!confirm(`¿Eliminar a "${apodo}" y todos sus datos? Esta acción no se puede deshacer.`)) return;
  try{
    await db.collection('users').doc(uid).delete();
    allUsers=allUsers.filter(p=>p.uid!==uid);
    toast('Jugador eliminado');
    renderAdminJugadores();
  }catch(e){ toast('Error al eliminar'); console.error(e); }
}

