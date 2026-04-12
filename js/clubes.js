// ===== CLUBES =====
async function cargarClubes(){
  try{
    const snap=await db.collection('config').doc('clubes').get();
    return snap.exists?(snap.data().lista||[]):[];
  }catch(e){ return []; }
}
async function guardarClubes(lista){
  await db.collection('config').doc('clubes').set({lista});
}

async function renderAdminClubes(){
  const el=document.getElementById('admin-clubes-list');
  if(!el) return;
  const clubes=await cargarClubes();
  if(!clubes.length){ el.innerHTML='<div class="empty">No hay clubes. Agrega el primero →</div>'; return; }
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
          </div>
          ${c.web?`<a href="${c.web}" target="_blank" style="font-size:11px;color:#378ADD;display:block;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.web}</a>`:''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-sm btn-outline" style="color:var(--color-text-primary,#1a1a18);font-size:11px" onclick="abrirEditarClub(${i})">Editar</button>
          <button class="btn btn-sm" style="background:#FAECE7;color:#993C1D;border-color:#f0c4b0;font-size:11px" onclick="eliminarClub(${i})">Eliminar</button>
        </div>
      </div>
    </div>`).join('');
}

function ncCampos(){ return ['nc-nombre','nc-ciudad','nc-canchas','nc-direccion','nc-web','nc-instagram','nc-telefono','nc-email','nc-notas']; }

function abrirNuevoClub(){
  document.getElementById('nc-title').textContent='Agregar club';
  document.getElementById('nc-idx').value='';
  ncCampos().forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('nc-mapa-preview').style.display='none';
  document.getElementById('m-nuevo-club').style.display='flex';
}

async function abrirEditarClub(idx){
  const clubes=await cargarClubes();
  const c=clubes[idx];
  document.getElementById('nc-title').textContent='Editar club';
  document.getElementById('nc-idx').value=idx;
  document.getElementById('nc-nombre').value=c.nombre||'';
  document.getElementById('nc-ciudad').value=c.ciudad||'';
  document.getElementById('nc-canchas').value=c.canchas||'';
  document.getElementById('nc-direccion').value=c.direccion||'';
  document.getElementById('nc-web').value=c.web||'';
  document.getElementById('nc-instagram').value=c.instagram||'';
  document.getElementById('nc-telefono').value=c.telefono||'';
  document.getElementById('nc-email').value=c.email||'';
  document.getElementById('nc-notas').value=c.notas||'';
  if(c.direccion) previewMapa();
  else document.getElementById('nc-mapa-preview').style.display='none';
  document.getElementById('m-nuevo-club').style.display='flex';
}

let mapaTimer=null;
function previewMapa(){
  const dir=document.getElementById('nc-direccion').value.trim();
  const preview=document.getElementById('nc-mapa-preview');
  const iframe=document.getElementById('nc-mapa-iframe');
  if(!dir){ preview.style.display='none'; return; }
  clearTimeout(mapaTimer);
  mapaTimer=setTimeout(()=>{
    const q=encodeURIComponent(dir);
    iframe.src=`https://maps.google.com/maps?q=${q}&output=embed&z=15`;
    preview.style.display='block';
  },800);
}

async function guardarNuevoClub(){
  const nombre=document.getElementById('nc-nombre').value.trim();
  if(!nombre){toast('El nombre del club es obligatorio');return;}
  const club={
    nombre,
    ciudad:document.getElementById('nc-ciudad').value.trim(),
    canchas:parseInt(document.getElementById('nc-canchas').value)||null,
    direccion:document.getElementById('nc-direccion').value.trim(),
    web:document.getElementById('nc-web').value.trim(),
    instagram:document.getElementById('nc-instagram').value.trim().replace(/^@/,''),
    telefono:document.getElementById('nc-telefono').value.trim(),
    email:document.getElementById('nc-email').value.trim(),
    notas:document.getElementById('nc-notas').value.trim(),
  };
  // Limpiar campos null/vacíos
  Object.keys(club).forEach(k=>{ if(!club[k]) delete club[k]; });
  const idxStr=document.getElementById('nc-idx').value;
  const clubes=await cargarClubes();
  if(idxStr!==''){
    clubes[parseInt(idxStr)]=club;
  } else {
    if(clubes.find(c=>c.nombre.toLowerCase()===nombre.toLowerCase())){toast('Ese club ya existe');return;}
    clubes.push(club);
  }
  clubes.sort((a,b)=>a.nombre.localeCompare(b.nombre));
  await guardarClubes(clubes);
  closeModal('m-nuevo-club');
  toast(idxStr!==''?'Club actualizado':'Club guardado');
  refreshClubesVistas();
}

async function eliminarClub(idx){
  const clubes=await cargarClubes();
  const c=clubes[idx];
  if(!confirm(`¿Eliminar "${c.nombre}"?`)) return;
  clubes.splice(idx,1);
  await guardarClubes(clubes);
  toast('Club eliminado');
  refreshClubesVistas();
}

function refreshClubesVistas(){
  // Refrescar la vista que esté activa
  if(document.getElementById('page-clubes')?.classList.contains('active')) renderClubesPublico();
  if(document.getElementById('page-admin')?.classList.contains('active')) renderAdminJugadores();
}

async function marcarClubFavorito(nombre, btn){
  if(!userData.perfil) userData.perfil={};
  userData.perfil.club=nombre;
  await saveData();
  btn.textContent='✅ Club favorito guardado';
  btn.style.background='#0F6E56';
  setTimeout(()=>{ btn.textContent='⭐ Marcar como mi club favorito'; btn.style.background=''; },2500);
  toast(`${nombre} marcado como tu club favorito`);
  renderHome();
}

// ===== SELECTOR DE CLUB EN PARTIDOS =====
async function renderClubSelector(){
  const clubes=await cargarClubes();
  const actual=document.getElementById('p-club').value;
  const dd=document.getElementById('p-club-dropdown');
  const opciones=[
    ...clubes.map(c=>`<div style="display:flex;align-items:center;padding:9px 12px;border-bottom:0.5px solid #f1efe8;gap:8px" onmouseover="this.style.background='#f1efe8'" onmouseout="this.style.background=''">
      <div style="flex:1;cursor:pointer" onclick="seleccionarClub('${c.nombre.replace(/'/g,"\\'")}')">
        <div style="font-size:13px;color:var(--color-text-primary,#1a1a18);font-weight:500">${c.nombre}</div>
        <div style="font-size:10px;color:var(--color-text-secondary,#888780);margin-top:1px">${[c.ciudad,c.canchas?c.canchas+' canchas':null].filter(Boolean).join(' · ')||''}</div>
      </div>
      ${c.direccion||c.telefono||c.web?`<button onclick="event.stopPropagation();verDetalleClub('${c.nombre.replace(/'/g,"\\'")}')" style="background:none;border:none;font-size:13px;cursor:pointer;padding:2px 4px" title="Ver detalle">ℹ️</button>`:''}
    </div>`),
    `<div style="padding:8px 12px;border-top:0.5px solid #e5e4df">
      <div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-bottom:6px">¿No está el club?</div>
      <input type="text" id="p-club-custom" placeholder="Escribe el nombre..." style="font-size:14px;border:0.5px solid var(--color-border-secondary,#d3d1c7);border-radius:6px;padding:7px 10px" onkeydown="if(event.key==='Enter')seleccionarClub(this.value)"/>
      <button class="btn btn-sm btn-p" style="margin-top:6px;width:100%" onclick="seleccionarClub(document.getElementById('p-club-custom').value)">Usar este club</button>
    </div>`
  ];
  dd.innerHTML=opciones.length>1?opciones.join(''):'<div style="padding:12px;font-size:12px;color:var(--color-text-secondary,#888780);text-align:center">No hay clubes configurados aún</div>';
  dd.style.display='block';
  if(actual) document.getElementById('p-club-label').textContent=actual;
}

const ASPECTOS=[
  {id:'estacionamiento',icon:'🅿️',label:'Estacionamiento'},
  {id:'camarines',icon:'🚿',label:'Baños / camarines'},
  {id:'comercio',icon:'🍔',label:'Comercio'},
  {id:'canchas',icon:'🎾',label:'Estado canchas'},
  {id:'atencion',icon:'👋',label:'Atención'},
];

// Normaliza nombre a clave Firestore segura
function clubKey(nombre){ return nombre.toLowerCase().replace(/[^a-z0-9]/g,'_').slice(0,50); }

async function cargarComentariosClub(nombre){
  try{
    const snap=await db.collection('clubes').doc(clubKey(nombre)).collection('comentarios')
      .orderBy('fecha','desc').limit(30).get();
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){ return []; }
}

async function verDetalleClub(nombre){
  const clubes=await cargarClubes();
  const c=clubes.find(x=>x.nombre===nombre);
  if(!c) return;
  try{ document.getElementById('p-club-dropdown').style.display='none'; }catch(e){}

  // Crear modal
  const bg=document.createElement('div');
  bg.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;z-index:300';
  const inner=document.createElement('div');
  inner.style.cssText='background:var(--color-background-primary,#fff);border-radius:18px 18px 0 0;padding:0;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;display:flex;flex-direction:column';
  inner.onclick=e=>e.stopPropagation();
  bg.onclick=()=>bg.remove();
  bg.appendChild(inner);
  document.body.appendChild(bg);

  // Estado del formulario de evaluación
  const ratingsState={};

  function renderModal(){
    const q=encodeURIComponent(c.direccion||c.nombre+(c.ciudad?' '+c.ciudad:''));
    const mapaHTML=c.direccion?`<div style="border-radius:0;overflow:hidden;margin-bottom:0;border-bottom:0.5px solid var(--color-border-tertiary,#e5e4df)">
      <iframe src="https://maps.google.com/maps?q=${q}&output=embed&z=15" width="100%" height="160" style="border:none;display:block" loading="lazy"></iframe>
    </div>`:'';
    inner.innerHTML=`
      <div style="padding:20px 18px 0">
        <div style="width:36px;height:4px;border-radius:2px;background:var(--color-border-secondary,#d3d1c7);margin:0 auto 14px"></div>
        <div style="font-size:17px;font-weight:500;color:var(--color-text-primary,#1a1a18);margin-bottom:10px">🏟️ ${c.nombre}</div>
      </div>
      ${mapaHTML}
      <div style="padding:14px 18px">
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
          ${c.ciudad?`<div style="font-size:13px;color:var(--color-text-primary,#1a1a18)">📍 ${c.ciudad}${c.direccion?', '+c.direccion:''}</div>`:''}
          ${c.canchas?`<div style="font-size:13px;color:var(--color-text-primary,#1a1a18)">🎾 ${c.canchas} canchas</div>`:''}
          ${c.telefono?`<a href="tel:${c.telefono}" style="font-size:13px;color:#378ADD;text-decoration:none">📞 ${c.telefono}</a>`:''}
          ${c.email?`<a href="mailto:${c.email}" style="font-size:13px;color:#378ADD;text-decoration:none">✉️ ${c.email}</a>`:''}
          ${c.instagram?`<a href="https://instagram.com/${c.instagram}" target="_blank" style="font-size:13px;color:#C13584;text-decoration:none">📸 @${c.instagram}</a>`:''}
          ${c.web?`<a href="${c.web}" target="_blank" style="font-size:13px;color:#378ADD;text-decoration:none">🌐 ${c.web}</a>`:''}
          ${c.notas?`<div style="font-size:11px;color:var(--color-text-secondary,#888780);font-style:italic">"${c.notas}"</div>`:''}
        </div>
        <button onclick="marcarClubFavorito('${c.nombre.replace(/'/g,"\\'")}',this)" style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:9px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:0.5px solid var(--color-border-secondary,#d3d1c7);background:var(--color-background-primary,#fff);color:var(--color-text-primary,#1a1a18);font-family:inherit;margin-bottom:16px">⭐ Marcar como mi club favorito</button>

        <!-- RESUMEN DE EVALUACIONES -->
        <div id="detalle-resumen-${clubKey(nombre)}" style="margin-bottom:16px">
          <div style="font-size:11px;color:var(--color-text-secondary,#888780);text-align:center;padding:8px">Cargando evaluaciones...</div>
        </div>

        <!-- FORMULARIO COMENTARIO -->
        <div style="border:0.5px solid var(--color-border-tertiary,#e5e4df);border-radius:12px;padding:14px;margin-bottom:16px;background:var(--color-background-secondary,#f1efe8)">
          <div style="font-size:13px;font-weight:500;color:var(--color-text-primary,#1a1a18);margin-bottom:10px">Agregar comentario</div>
          <textarea id="comentario-texto-${clubKey(nombre)}" rows="3" placeholder="Contá tu experiencia en este club..." style="width:100%;border:0.5px solid var(--color-border-secondary,#d3d1c7);border-radius:8px;padding:9px 10px;font-size:14px;font-family:inherit;resize:none;color:var(--color-text-primary,#1a1a18);background:var(--color-background-primary,#fff);margin-bottom:10px"></textarea>
          <div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-bottom:8px">Evaluaciones — todas opcionales</div>
          ${ASPECTOS.map(a=>`
            <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:0.5px solid var(--color-border-tertiary,#e5e4df)">
              <div style="font-size:12px;color:var(--color-text-primary,#1a1a18);display:flex;align-items:center;gap:6px"><span style="font-size:13px">${a.icon}</span>${a.label}</div>
              <div style="display:flex;align-items:center;gap:4px" id="stars-${a.id}-${clubKey(nombre)}">
                ${[1,2,3,4,5].map(n=>`<div onclick="setRating('${a.id}','${clubKey(nombre)}',${n})" style="width:24px;height:24px;border-radius:5px;border:0.5px solid var(--color-border-secondary,#d3d1c7);background:var(--color-background-secondary,#f1efe8);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;font-weight:500;color:var(--color-text-secondary,#888780);transition:all .1s" data-val="${n}">${n}</div>`).join('')}
                <div onclick="setRating('${a.id}','${clubKey(nombre)}',0)" style="font-size:10px;color:var(--color-text-secondary,#888780);cursor:pointer;padding:2px 6px;border-radius:4px;border:0.5px solid var(--color-border-tertiary,#e5e4df);margin-left:2px">—</div>
              </div>
            </div>`).join('')}
          <button onclick="publicarComentario('${c.nombre.replace(/'/g,"\\'")}','${clubKey(nombre)}')" style="display:block;width:100%;padding:10px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:#1D9E75;color:#fff;font-family:inherit;margin-top:12px">Publicar comentario</button>
        </div>

        <!-- LISTA DE COMENTARIOS -->
        <div id="detalle-comentarios-${clubKey(nombre)}">
          <div style="font-size:11px;color:var(--color-text-secondary,#888780);text-align:center;padding:8px">Cargando comentarios...</div>
        </div>

        <button onclick="this.closest('[style*=fixed]').remove()" style="display:block;width:100%;background:none;border:none;font-size:12px;color:var(--color-text-secondary,#888780);cursor:pointer;font-family:inherit;padding:12px;margin-top:4px">Cerrar</button>
      </div>`;
    // Cargar comentarios y resumen async
    cargarYMostrarComentarios(nombre, clubKey(nombre));
  }

  renderModal();
}

function setRating(aspectoId, ckey, val){
  const container=document.getElementById(`stars-${aspectoId}-${ckey}`);
  if(!container) return;
  // Guardar en estado global keyed por ckey
  if(!window._ratingsState) window._ratingsState={};
  if(!window._ratingsState[ckey]) window._ratingsState[ckey]={};
  window._ratingsState[ckey][aspectoId]=val;
  // Actualizar visual
  container.querySelectorAll('[data-val]').forEach(el=>{
    const n=parseInt(el.getAttribute('data-val'));
    if(val>0&&n<=val){
      el.style.background='#FAEEDA'; el.style.borderColor='#FAC775'; el.style.color='#854F0B';
    } else {
      el.style.background='#f1efe8'; el.style.borderColor='#d3d1c7'; el.style.color='#888780';
    }
  });
}

async function publicarComentario(nombre, ckey){
  const texto=document.getElementById(`comentario-texto-${ckey}`)?.value.trim()||'';
  const ratings=(window._ratingsState||{})[ckey]||{};
  const tieneRatings=Object.values(ratings).some(v=>v>0);
  if(!texto&&!tieneRatings){ toast('Escribe un comentario o evalúa al menos un aspecto'); return; }
  const apodo=userData?.perfil?.apodo||CURRENT_USER?.displayName||'Anónimo';
  const uid=CURRENT_USER?.uid;
  const comentario={
    uid, apodo,
    texto,
    fecha: new Date().toISOString(),
    ratings: tieneRatings?Object.fromEntries(Object.entries(ratings).filter(([,v])=>v>0)):{}
  };
  try{
    await db.collection('clubes').doc(ckey).collection('comentarios').add(comentario);
    // Reset form
    const ta=document.getElementById(`comentario-texto-${ckey}`);
    if(ta) ta.value='';
    if(window._ratingsState) window._ratingsState[ckey]={};
    ASPECTOS.forEach(a=>setRating(a.id,ckey,0));
    toast('Comentario publicado');
    cargarYMostrarComentarios(nombre, ckey);
  }catch(e){ toast('Error al publicar: '+e.message); console.error(e); }
}

async function cargarYMostrarComentarios(nombre, ckey){
  const comentarios=await cargarComentariosClub(nombre);

  // Resumen de evaluaciones
  const resumenEl=document.getElementById(`detalle-resumen-${ckey}`);
  if(resumenEl){
    const conRatings=comentarios.filter(c=>c.ratings&&Object.keys(c.ratings).length>0);
    if(conRatings.length===0){
      resumenEl.innerHTML='';
    } else {
      // Calcular promedios
      const sumas={}, counts={};
      conRatings.forEach(c=>{ Object.entries(c.ratings).forEach(([k,v])=>{ sumas[k]=(sumas[k]||0)+v; counts[k]=(counts[k]||0)+1; }); });
      const prom=Object.fromEntries(Object.keys(sumas).map(k=>[k,sumas[k]/counts[k]]));
      const promVals=Object.values(prom);
      const promGeneral=promVals.length?Math.round((promVals.reduce((a,b)=>a+b,0)/promVals.length)*10)/10:null;
      resumenEl.innerHTML=`
        <div style="background:var(--color-background-secondary,#f1efe8);border-radius:10px;padding:12px;margin-bottom:0">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
            <div style="background:var(--color-background-primary,#fff);border-radius:8px;padding:8px;text-align:center">
              <div style="font-size:20px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${promGeneral||'—'}</div>
              <div style="font-size:10px;color:var(--color-text-secondary,#888780)">Promedio general</div>
            </div>
            <div style="background:var(--color-background-primary,#fff);border-radius:8px;padding:8px;text-align:center">
              <div style="font-size:20px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${comentarios.length}</div>
              <div style="font-size:10px;color:var(--color-text-secondary,#888780)">Comentarios</div>
            </div>
          </div>
          ${ASPECTOS.filter(a=>prom[a.id]).map(a=>`
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:12px;width:24px;text-align:center">${a.icon}</span>
              <span style="font-size:11px;color:var(--color-text-secondary,#888780);flex:1">${a.label}</span>
              <div style="flex:2;height:5px;background:var(--color-border-secondary,#d3d1c7);border-radius:3px;overflow:hidden">
                <div style="width:${Math.round(prom[a.id]/5*100)}%;height:100%;background:#1D9E75;border-radius:3px"></div>
              </div>
              <span style="font-size:11px;font-weight:500;color:var(--color-text-primary,#1a1a18);min-width:24px;text-align:right">${Math.round(prom[a.id]*10)/10}</span>
            </div>`).join('')}
        </div>`;
    }
  }

  // Lista de comentarios
  const listEl=document.getElementById(`detalle-comentarios-${ckey}`);
  if(!listEl) return;
  if(!comentarios.length){ listEl.innerHTML='<div style="font-size:12px;color:var(--color-text-secondary,#888780);text-align:center;padding:12px">Sin comentarios aún. ¡Sé el primero!</div>'; return; }
  const AV=['background:#E1F5EE;color:#0F6E56','background:#E6F1FB;color:#185FA5','background:#FAEEDA;color:#854F0B','background:#FAECE7;color:#993C1D','background:#EEEDFE;color:#3C3489'];
  listEl.innerHTML=`<div style="font-size:13px;font-weight:500;color:var(--color-text-primary,#1a1a18);margin-bottom:8px">Comentarios (${comentarios.length})</div>`+
  comentarios.map((com,i)=>{
    const iniciales=(com.apodo||'?').slice(0,2).toUpperCase();
    const dias=Math.floor((Date.now()-new Date(com.fecha))/(1000*60*60*24));
    const cuandoStr=dias===0?'hoy':dias===1?'ayer':`hace ${dias} días`;
    const chips=ASPECTOS.filter(a=>com.ratings?.[a.id]).map(a=>{
      const v=com.ratings[a.id];
      const dots=[1,2,3,4,5].map(n=>`<div style="width:5px;height:5px;border-radius:50%;background:${n<=v?'#639922':'#D3D1C7'}"></div>`).join('');
      return `<div style="display:inline-flex;align-items:center;gap:3px;background:#EAF3DE;color:#3B6D11;font-size:10px;padding:2px 7px;border-radius:20px;font-weight:500">${a.icon} <div style="display:flex;gap:1px">${dots}</div></div>`;
    }).join('');
    return `<div style="padding:10px 0;border-bottom:0.5px solid var(--color-border-tertiary,#e5e4df)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <div style="width:26px;height:26px;border-radius:50%;${AV[i%5]};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;flex-shrink:0">${iniciales}</div>
        <span style="font-size:12px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${com.apodo||'Anónimo'}</span>
        <span style="font-size:10px;color:var(--color-text-secondary,#888780);margin-left:auto">${cuandoStr}</span>
      </div>
      ${com.texto?`<div style="font-size:12px;color:var(--color-text-primary,#1a1a18);line-height:1.5;margin-bottom:5px">${com.texto}</div>`:''}
      ${chips?`<div style="display:flex;gap:5px;flex-wrap:wrap">${chips}</div>`:''}
    </div>`;
  }).join('');
}

function seleccionarClub(nombre){
  nombre=(nombre||'').trim();
  if(!nombre) return;
  document.getElementById('p-club').value=nombre;
  document.getElementById('p-club-label').textContent=nombre;
  document.getElementById('p-club-label').style.color='#1a1a18';
  document.getElementById('p-club-dropdown').style.display='none';
}

function toggleClubDropdown(){
  const dd=document.getElementById('p-club-dropdown');
  if(dd.style.display==='none'||!dd.style.display){ renderClubSelector(); }
  else{ dd.style.display='none'; }
}

// Cerrar dropdown de club al hacer click fuera
document.addEventListener('click',e=>{
  const sel=document.getElementById('p-club-selector');
  const dd=document.getElementById('p-club-dropdown');
  if(sel&&dd&&!sel.contains(e.target)&&!dd.contains(e.target)) dd.style.display='none';
});

// MODO (Jugador / Entrenador)
