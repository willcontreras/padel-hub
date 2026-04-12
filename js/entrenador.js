// ===== MÓDULO ENTRENADOR =====
const GCAL_CLIENT_ID='1025424832076-lqo53n5f5q99kjh56kq5a6j62j2c5bk4.apps.googleusercontent.com';
const GCAL_SCOPE='https://www.googleapis.com/auth/calendar.events';
let gcalToken=null;

function goToHome(){
  goTo('home');
}

async function conectarGoogleCalendar(){
  const state=Math.random().toString(36).slice(2);
  sessionStorage.setItem('gcal_state',state);
  // Si viene de una página de entrenador, volver siempre a la agenda
  const paginaActual=document.querySelector('.page.active')?.id?.replace('page-','')||'home';
  const returnPage=paginaActual.startsWith('entrenador')?'entrenador-agenda':paginaActual;
  sessionStorage.setItem('gcal_return_page', returnPage);
  const params=new URLSearchParams({
    client_id:GCAL_CLIENT_ID,
    redirect_uri:window.location.origin+window.location.pathname,
    response_type:'token',
    scope:GCAL_SCOPE,
    state,
    login_hint:CURRENT_USER?.email||''
  });
  window.location.href='https://accounts.google.com/o/oauth2/v2/auth?'+params;
}

async function manejarCallbackGCal(){
  // Flujo implícito — token viene en el hash (#access_token=...)
  const hash=new URLSearchParams(window.location.hash.slice(1));
  const token=hash.get('access_token');
  const state=hash.get('state');
  if(!token) return;
  // Limpiar URL
  window.history.replaceState({},'',window.location.pathname);
  gcalToken=token;
  // Guardar en Firestore para la sesión (sin refresh token en flujo implícito)
  if(userData){ userData.gcalAccessToken=token; await saveData(); }
  sessionStorage.removeItem('gcal_state');
  toast('Google Calendar conectado ✓');
  actualizarEstadoGCal();
  // Volver a la página donde estaba antes del redirect
  const returnPage=sessionStorage.getItem('gcal_return_page')||'home';
  sessionStorage.removeItem('gcal_return_page');
  return returnPage;
}

async function refrescarTokenGCal(){
  // Con flujo implícito no hay refresh token — redirigir a reconectar
  gcalToken=userData?.gcalAccessToken||null;
  return !!gcalToken;
}

function actualizarEstadoGCal(){
  const el=document.getElementById('gcal-status');if(!el) return;
  const ok=!!(gcalToken||userData?.gcalAccessToken);
  el.innerHTML=ok
    ?`<div class="gcal-connected"><span style="font-size:14px">📅</span> Google Calendar conectado <button onclick="desconectarGCal()" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--color-text-secondary,#888780);font-family:inherit;margin-left:auto">Desconectar</button></div>`
    :`<div class="gcal-disconnected"><span style="font-size:14px">📅</span> Google Calendar no conectado</div>`;
  const btn=document.getElementById('btn-gcal-connect');
  if(btn) btn.style.display=ok?'none':'inline-flex';
}

async function desconectarGCal(){
  gcalToken=null;
  if(userData){delete userData.gcalAccessToken;await saveData();}
  actualizarEstadoGCal();toast('Google Calendar desconectado');
}

async function crearEventoGCal(titulo,fecha,hi,hf,club,alumnoEmail=null){
  // Restaurar token si está en memoria o Firestore
  if(!gcalToken&&userData?.gcalAccessToken){ gcalToken=userData.gcalAccessToken; }
  if(!gcalToken&&userData?.gcalRefreshToken) await refrescarTokenGCal();
  if(!gcalToken){toast('Conecta Google Calendar primero');return null;}
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
  const ev={summary:titulo,location:club||'',
    start:{dateTime:`${fecha}T${hi}:00`,timeZone:tz},
    end:{dateTime:`${fecha}T${hf}:00`,timeZone:tz}};
  if(alumnoEmail) ev.attendees=[{email:alumnoEmail}];
  try{
    const resp=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events'+(alumnoEmail?'?sendUpdates=all':''),
      {method:'POST',headers:{'Authorization':'Bearer '+gcalToken,'Content-Type':'application/json'},body:JSON.stringify(ev)});
    if(resp.status===401){
      gcalToken=null;
      if(userData) delete userData.gcalAccessToken;
      toast('Token de Calendar expirado — reconecta');
      return null;
    }
    const r=await resp.json();return r.id||null;
  }catch(e){toast('Error Calendar: '+e.message);return null;}
}

let agendaSemanaOffset=0;
function getLunesDeSemana(off=0){
  const h=new Date(),d=h.getDay()||7,l=new Date(h);
  l.setDate(h.getDate()-d+1+off*7);l.setHours(0,0,0,0);return l;
}
function fechaStr(d){return d.toISOString().slice(0,10);}
function horaStr(h){return String(h).padStart(2,'0')+':00';}

async function renderAgenda(){
  actualizarEstadoGCal();
  const lunes=getLunesDeSemana(agendaSemanaOffset);
  const viernes=new Date(lunes);viernes.setDate(lunes.getDate()+6);
  document.getElementById('agenda-semana-lbl').textContent=
    `${lunes.toLocaleDateString('es-CL',{day:'numeric',month:'long'})} – ${viernes.toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})}`;
  const hoy=fechaStr(new Date());
  const ahoraH=new Date().getHours();
  const bloques=userData?.bloques||[];
  const clases=userData?.clasesEntrenador||[];
  const dias=Array.from({length:7},(_,i)=>{const d=new Date(lunes);d.setDate(lunes.getDate()+i);return d;});
  const horas=[8,9,10,11,12,13,14,15,16,17,18,19,20];
  const grid=document.getElementById('agenda-grid');
  let html=`<div style="display:flex;gap:5px"><div style="width:36px;flex-shrink:0"><div style="height:32px"></div>`;
  html+=horas.map(h=>`<div class="agenda-hora" style="height:44px">${horaStr(h)}</div>`).join('')+'</div>';
  dias.forEach(dia=>{
    const fStr=fechaStr(dia),esHoy=fStr===hoy;
    html+=`<div class="day-col"><div class="day-header ${esHoy?'hoy':''}">${dia.toLocaleDateString('es-CL',{weekday:'short',day:'numeric'})}</div>`;
    horas.forEach(h=>{
      const slotH=horaStr(h);
      const esAhora=esHoy&&h===ahoraH;
      const clase=clases.find(c=>c.fecha===fStr&&c.horaInicio===slotH&&!c.cancelada);
      const blq=bloques.find(b=>b.fecha===fStr&&b.horaInicio===slotH)||bloques.find(b=>!b.fecha&&String(b.dia)===String(dia.getDay())&&b.horaInicio===slotH);
      // Borde resaltado si es la hora actual
      const ahoraStyle=esAhora?'outline:2px solid #1D9E75;outline-offset:-1px;':'';
      if(clase){
        html+=`<div class="slot-ocupado" style="margin-bottom:3px;min-height:40px;${ahoraStyle}" onclick="abrirDetalleClase('${clase.id}')">
          <strong>${clase.alumnoNombre}</strong><div class="slot-time">${clase.horaInicio}–${clase.horaFin}</div>
          ${clase.nota?`<div style="font-size:10px">${clase.notaPublica?'📝':'🔒'}</div>`:''}
        </div>`;
      } else if(blq){
        html+=`<div class="slot-libre" style="margin-bottom:3px;min-height:40px;${ahoraStyle}" ondblclick="abrirAgendarClase('${fStr}','${slotH}','${blq.horaFin||horaStr(h+1)}','${blq.club||''}')">
          <div style="font-size:10px;font-weight:500">Disponible</div>
          <div style="font-size:9px;opacity:.7">${slotH}</div>
        </div>`;
      } else {
        html+=`<div class="slot-vacio" style="margin-bottom:3px;min-height:40px;${ahoraStyle}" ondblclick="abrirAgendarRapido('${fStr}','${slotH}')">
          <span class="slot-vacio-hora">${slotH}</span>
        </div>`;
      }
    });
    html+='</div>';
  });
  html+='</div>';
  grid.innerHTML=html;
}

function selGcalOpcion(val, el){
  document.querySelectorAll('#gcal-opciones .gcal-opt').forEach(d=>{
    d.style.borderColor='#e5e4df';
    d.style.background='#fff';
    const dot=d.querySelector('div');
    if(dot){dot.style.background='#e5e4df';dot.innerHTML='';}
  });
  if(el){
    el.style.borderColor='#1D9E75';
    el.style.background='#f0fdf8';
    const dot=el.querySelector('div');
    if(dot){dot.style.background='#1D9E75';dot.innerHTML='<div style="width:6px;height:6px;border-radius:50%;background:var(--color-background-primary,#fff)"></div>';}
  }
  const inp=document.getElementById('gcal-opcion-val');
  if(inp) inp.value=val;
}

function toggleRecurrente(){
  const inp=document.getElementById('bloque-recurrente');
  const track=document.getElementById('bloque-rec-track');
  const thumb=document.getElementById('bloque-rec-thumb');
  const activo=inp.value!=='true';
  inp.value=activo?'true':'false';
  track.style.background=activo?'#1D9E75':'#d3d1c7';
  thumb.style.left=activo?'18px':'2px';
}

function toggleRecurrenteEdit(){
  const inp=document.getElementById('eb-recurrente');
  const track=document.getElementById('eb-rec-track');
  const thumb=document.getElementById('eb-rec-thumb');
  const activo=inp.value!=='true';
  inp.value=activo?'true':'false';
  track.style.background=activo?'#1D9E75':'#d3d1c7';
  thumb.style.left=activo?'18px':'2px';
}

function abrirMisBloques(){
  const bloques=userData?.bloques||[];
  if(!bloques.length){
    toast('No tienes bloques configurados. Usa + Bloque para agregar.');
    return;
  }
  const DIAS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const DIAS_FULL=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  // Agrupar por (dia + recurrente + fecha + club)
  const grupos={};
  bloques.forEach(b=>{
    const key=b.fecha?`fecha_${b.fecha}_${b.club||''}`:`rec_${b.dia}_${b.club||''}_${b.recurrente}`;
    if(!grupos[key]) grupos[key]={
      key, dia:b.dia, fecha:b.fecha||null,
      club:b.club||'', recurrente:b.recurrente,
      horas:[], ids:[]
    };
    grupos[key].horas.push(b.horaInicio);
    grupos[key].ids.push(b.id);
  });
  const lista=Object.values(grupos).sort((a,b)=>{
    if(a.fecha&&b.fecha) return a.fecha.localeCompare(b.fecha);
    if(a.fecha) return -1; if(b.fecha) return 1;
    return a.dia-b.dia;
  });
  const bg=document.createElement('div');
  bg.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;z-index:300';
  bg.onclick=()=>bg.remove();
  bg.innerHTML=`<div style="background:var(--bg,#fff);border-radius:18px 18px 0 0;padding:0 0 28px;width:100%;max-width:520px;max-height:85vh;overflow-y:auto" onclick="event.stopPropagation()">
    <div style="padding:16px 18px 0">
      <div style="width:36px;height:4px;border-radius:2px;background:var(--color-border-secondary,#d3d1c7);margin:0 auto 14px"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="font-size:16px;font-weight:500;color:var(--text,#1a1a18)">Mis bloques</div>
        <button onclick="this.closest('[style*=fixed]').remove();abrirNuevoBloque()" style="background:#1D9E75;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">+ Nuevo</button>
      </div>
    </div>
    ${lista.map(g=>{
      const horasOrdenadas=g.horas.sort();
      const inicio=horasOrdenadas[0];
      const ultimaH=parseInt(horasOrdenadas[horasOrdenadas.length-1].split(':')[0]);
      const fin=horaStr(ultimaH+1);
      const titulo=g.fecha
        ?new Date(g.fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})
        :`${DIAS_FULL[g.dia]}${g.recurrente?' (semanal)':' (una vez)'}`;
      const subtitulo=`${inicio} – ${fin}${g.club?' · '+g.club:''}`;
      return `<div style="display:flex;align-items:center;gap:10px;padding:11px 18px;border-bottom:0.5px solid rgba(0,0,0,.08)">
        <div style="width:38px;height:38px;border-radius:10px;background:#EAF3DE;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#3B6D11;flex-shrink:0">${g.fecha?new Date(g.fecha+'T12:00:00').getDate():DIAS[g.dia]}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;color:var(--text,#1a1a18)">${titulo}</div>
          <div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-top:2px">${subtitulo} · ${g.horas.length} hora${g.horas.length!==1?'s':''}</div>
        </div>
        <button onclick="event.stopPropagation();this.closest('[style*=fixed]').remove();abrirEditarBloqueGrupo('${g.key}')" style="background:none;border:0.5px solid var(--color-border-secondary,#d3d1c7);border-radius:7px;padding:5px 10px;font-size:11px;color:var(--text,#1a1a18);cursor:pointer;font-family:inherit">Editar</button>
      </div>`;
    }).join('')}
    <button onclick="this.closest('[style*=fixed]').remove()" style="display:block;width:100%;background:none;border:none;font-size:12px;color:var(--color-text-secondary,#888780);cursor:pointer;font-family:inherit;padding:14px">Cerrar</button>
  </div>`;
  document.body.appendChild(bg);
}

function abrirEditarBloqueGrupo(key){
  const bloques=userData?.bloques||[];
  const grupo=bloques.filter(b=>{
    const k=b.fecha?`fecha_${b.fecha}_${b.club||''}`:`rec_${b.dia}_${b.club||''}_${b.recurrente}`;
    return k===key;
  });
  if(!grupo.length) return;
  const g=grupo[0];
  const horasOrdenadas=grupo.map(b=>b.horaInicio).sort();
  const inicio=horasOrdenadas[0];
  const ultimaH=parseInt(horasOrdenadas[horasOrdenadas.length-1].split(':')[0]);
  const fin=horaStr(ultimaH+1);
  document.getElementById('eb-id-base').value=key;
  document.getElementById('eb-dia').value=g.dia;
  document.getElementById('eb-inicio').value=inicio;
  document.getElementById('eb-fin').value=fin;
  document.getElementById('eb-club').value=g.club||'';
  // Set toggle
  const rec=!!(g.recurrente);
  document.getElementById('eb-recurrente').value=rec?'true':'false';
  document.getElementById('eb-rec-track').style.background=rec?'#1D9E75':'#d3d1c7';
  document.getElementById('eb-rec-thumb').style.left=rec?'18px':'2px';
  document.getElementById('m-editar-bloque').style.display='flex';
}

async function guardarBloqueEditado(){
  const key=document.getElementById('eb-id-base').value;
  const ini=document.getElementById('eb-inicio').value;
  const fin=document.getElementById('eb-fin').value;
  if(!ini||!fin){toast('Ingresa hora inicio y fin');return;}
  const hIni=parseInt(ini.split(':')[0]);
  const hFin=parseInt(fin.split(':')[0]);
  if(hFin<=hIni){toast('La hora de fin debe ser posterior a la de inicio');return;}
  const dia=parseInt(document.getElementById('eb-dia').value);
  const club=document.getElementById('eb-club').value.trim();
  const recurrente=document.getElementById('eb-recurrente').value==='true';
  // Detectar slots del grupo con clases agendadas
  const bloquesGrupo=(userData.bloques||[]).filter(b=>{
    const k=b.fecha?`fecha_${b.fecha}_${b.club||''}`:`rec_${b.dia}_${b.club||''}_${b.recurrente}`;
    return k===key;
  });
  const clasesAfectadas=_clasesEnBloques(bloquesGrupo);
  if(clasesAfectadas.length){
    _mostrarConflictoClases(clasesAfectadas,'editar',()=>_aplicarEdicionBloque(key,hIni,hFin,dia,club,recurrente,true),()=>_aplicarEdicionBloque(key,hIni,hFin,dia,club,recurrente,false));
    return;
  }
  await _aplicarEdicionBloque(key,hIni,hFin,dia,club,recurrente,false);
}

async function _aplicarEdicionBloque(key,hIni,hFin,dia,club,recurrente,mantenerClases){
  // Eliminar bloques del grupo (nunca toca las clases)
  userData.bloques=(userData.bloques||[]).filter(b=>{
    const k=b.fecha?`fecha_${b.fecha}_${b.club||''}`:`rec_${b.dia}_${b.club||''}_${b.recurrente}`;
    if(k!==key) return true;
    // Si mantenerClases, conservar los slots que tienen clase agendada
    if(mantenerClases){
      const tieneClase=(userData.clasesEntrenador||[]).some(c=>!c.cancelada&&c.horaInicio===b.horaInicio&&(b.fecha?c.fecha===b.fecha:c.fecha&&new Date(c.fecha+'T12:00:00').getDay()===b.dia));
      return tieneClase;
    }
    return false;
  });
  // Agregar nuevos bloques
  const baseId='b'+Date.now();
  for(let h=hIni;h<hFin;h++){
    userData.bloques.push({id:baseId+'_'+h,dia,horaInicio:horaStr(h),horaFin:horaStr(h+1),club,recurrente});
  }
  await saveData();
  closeModal('m-editar-bloque');
  renderAgenda();
  toast(`Bloque actualizado (${hFin-hIni} hora${hFin-hIni!==1?'s':''})`);
}

async function eliminarBloqueGrupo(){
  const key=document.getElementById('eb-id-base').value;
  const bloquesGrupo=(userData.bloques||[]).filter(b=>{
    const k=b.fecha?`fecha_${b.fecha}_${b.club||''}`:`rec_${b.dia}_${b.club||''}_${b.recurrente}`;
    return k===key;
  });
  const clasesAfectadas=_clasesEnBloques(bloquesGrupo);
  if(clasesAfectadas.length){
    _mostrarConflictoClases(clasesAfectadas,'eliminar',()=>_aplicarEliminacionBloque(key,true),()=>_aplicarEliminacionBloque(key,false));
    return;
  }
  if(!confirm('¿Eliminar este bloque horario?')) return;
  await _aplicarEliminacionBloque(key,false);
}

async function _aplicarEliminacionBloque(key,mantenerClases){
  userData.bloques=(userData.bloques||[]).filter(b=>{
    const k=b.fecha?`fecha_${b.fecha}_${b.club||''}`:`rec_${b.dia}_${b.club||''}_${b.recurrente}`;
    if(k!==key) return true;
    if(mantenerClases){
      return (userData.clasesEntrenador||[]).some(c=>!c.cancelada&&c.horaInicio===b.horaInicio&&(b.fecha?c.fecha===b.fecha:c.fecha&&new Date(c.fecha+'T12:00:00').getDay()===b.dia));
    }
    return false;
  });
  await saveData();
  closeModal('m-editar-bloque');
  renderAgenda();
  toast('Bloque eliminado');
}

// Detecta clases agendadas dentro de un grupo de bloques
function _clasesEnBloques(bloques){
  const clases=userData?.clasesEntrenador||[];
  return clases.filter(c=>{
    if(c.cancelada) return false;
    return bloques.some(b=>c.horaInicio===b.horaInicio&&(b.fecha?c.fecha===b.fecha:new Date(c.fecha+'T12:00:00').getDay()===b.dia));
  });
}

// Muestra panel de conflicto con opciones
function _mostrarConflictoClases(clases,accion,cbSoloVacios,cbTodos){
  const bg=document.createElement('div');
  bg.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:400;padding:20px';
  bg.innerHTML=`<div style="background:var(--bg,#fff);border-radius:16px;padding:20px;width:100%;max-width:400px" onclick="event.stopPropagation()">
    <div style="font-size:16px;font-weight:500;color:var(--text,#1a1a18);margin-bottom:8px">⚠️ Hay clases agendadas</div>
    <div style="font-size:13px;color:var(--color-text-secondary,#888780);margin-bottom:14px;line-height:1.5">${clases.length} slot${clases.length!==1?'s tienen':'tiene'} clase${clases.length!==1?'s':''} agendada${clases.length!==1?'s':''} (${clases.map(c=>c.horaInicio).join(', ')}). ¿Qué querés hacer?</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button onclick="this.closest('[style*=fixed]').remove();(${cbSoloVacios.toString()})()" style="background:#E1F5EE;color:#0F6E56;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;text-align:left">
        ✅ ${accion==='eliminar'?'Eliminar':'Editar'} solo los slots vacíos<br><span style="font-size:11px;font-weight:400;opacity:.7">Las clases agendadas se mantienen individualmente</span>
      </button>
      <button onclick="this.closest('[style*=fixed]').remove();(${cbTodos.toString()})()" style="background:#FAEEDA;color:#854F0B;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;text-align:left">
        ⚡ ${accion==='eliminar'?'Eliminar':'Editar'} todos los slots<br><span style="font-size:11px;font-weight:400;opacity:.7">Las clases siguen existiendo pero sin bloque de disponibilidad</span>
      </button>
      <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;font-size:12px;color:var(--color-text-secondary,#888780);cursor:pointer;font-family:inherit;padding:8px">Cancelar</button>
    </div>
  </div>`;
  bg.onclick=()=>bg.remove();
  document.body.appendChild(bg);
}

function semanaAnterior(){agendaSemanaOffset--;renderAgenda();}
function semanaSiguiente(){agendaSemanaOffset++;renderAgenda();}

function abrirNuevoBloque(){
  ['bloque-fecha','bloque-club'].forEach(id=>document.getElementById(id).value='');
  // Reset toggle
  document.getElementById('bloque-recurrente').value='false';
  document.getElementById('bloque-rec-track').style.background='#d3d1c7';
  document.getElementById('bloque-rec-thumb').style.left='2px';
  document.getElementById('m-bloque').style.display='flex';
}

async function guardarBloque(){
  const ini=document.getElementById('bloque-inicio').value;
  const fin=document.getElementById('bloque-fin').value;
  if(!ini||!fin){toast('Ingresa hora inicio y fin');return;}
  const hIni=parseInt(ini.split(':')[0]);
  const hFin=parseInt(fin.split(':')[0]);
  if(hFin<=hIni){toast('La hora de fin debe ser posterior a la de inicio');return;}
  if(!userData.bloques) userData.bloques=[];
  const dia=parseInt(document.getElementById('bloque-dia').value);
  const club=document.getElementById('bloque-club').value.trim();
  const recurrente=document.getElementById('bloque-recurrente').value==='true';
  const fecha=document.getElementById('bloque-fecha').value;
  // Detectar duplicados — horas que ya tienen bloque para ese día
  const duplicados=[];
  for(let h=hIni;h<hFin;h++){
    const slotH=horaStr(h);
    const existe=userData.bloques.find(b=>
      b.horaInicio===slotH&&(
        (fecha&&b.fecha===fecha)||
        (!fecha&&!b.fecha&&String(b.dia)===String(dia)&&b.recurrente===recurrente)
      )
    );
    if(existe) duplicados.push(slotH);
  }
  if(duplicados.length){
    const horas=duplicados.length>3?`${duplicados.slice(0,3).join(', ')} y ${duplicados.length-3} más`:duplicados.join(', ');
    if(!confirm(`Ya existen bloques en: ${horas}. ¿Sobreescribir?`)) return;
    // Eliminar los duplicados
    userData.bloques=userData.bloques.filter(b=>{
      if(b.horaInicio<ini||b.horaInicio>=fin) return true;
      if(fecha) return b.fecha!==fecha;
      return !(b.dia===dia&&b.recurrente===recurrente&&!b.fecha);
    });
  }
  const baseId='b'+Date.now();
  for(let h=hIni;h<hFin;h++){
    const b={id:baseId+'_'+h,dia,horaInicio:horaStr(h),horaFin:horaStr(h+1),club,recurrente};
    if(fecha) b.fecha=fecha;
    userData.bloques.push(b);
  }
  await saveData();
  closeModal('m-bloque');
  renderAgenda();
  toast(`Bloque guardado (${hFin-hIni} hora${hFin-hIni!==1?'s':''})`);
}

function abrirAgendarClase(fecha,hi,hf,club){
  document.getElementById('clase-bloque-info').textContent=`${fecha}  ${hi} – ${hf}${club?' · '+club:''}`;
  document.getElementById('m-clase-title').textContent='Agendar clase';
  limpiarAlumnoClase();
  document.getElementById('clase-nota').value='';
  document.getElementById('clase-nota-publica').checked=false;
  selGcalOpcion('solo', document.querySelector('#gcal-opciones [data-val="solo"]'));
  const m=document.getElementById('m-clase');
  Object.assign(m.dataset,{fecha,horaInicio:hi,horaFin:hf,club,alumnoEmail:''});
  m.style.display='flex';
}

function abrirAgendarRapido(fecha,hora){
  const h=parseInt(hora.split(':')[0]);
  abrirAgendarClase(fecha,hora,horaStr(h+1),'');
}

async function buscarAlumnoClase(q){
  const res=document.getElementById('clase-alumno-resultados');
  if(!q||q.length<2){res.style.display='none';return;}
  if(!allUsers.length){
    try{const snap=await db.collection('users').get();allUsers=snap.docs.map(d=>({uid:d.id,...d.data()}));}catch(e){}
  }
  const f=allUsers.filter(u=>(u.perfil?.apodo||u.email||'').toLowerCase().includes(q.toLowerCase())).slice(0,6);
  res.innerHTML=f.length?f.map(u=>`
    <div onclick="seleccionarAlumnoClase('${u.uid}','${(u.perfil?.apodo||u.email).replace(/'/g,"\\'")}','${u.email||''}')"
      style="padding:9px 12px;cursor:pointer;font-size:13px;color:var(--color-text-primary,#1a1a18);border-bottom:0.5px solid #f1efe8;display:flex;align-items:center;gap:8px"
      onmouseover="this.style.background='#f1efe8'" onmouseout="this.style.background=''">
      <div style="width:26px;height:26px;border-radius:50%;background:#E1F5EE;color:#0F6E56;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;flex-shrink:0">${(u.perfil?.apodo||'?').slice(0,2).toUpperCase()}</div>
      <div><div style="font-weight:500">${u.perfil?.apodo||u.email}</div><div style="font-size:10px;color:var(--color-text-secondary,#888780)">${u.perfil?.categoria||''} ${u.perfil?.posicion||''}</div></div>
    </div>`).join('')
    :`<div style="padding:9px 12px;font-size:12px;color:var(--color-text-secondary,#888780)">No encontrado — se usará "${q}"</div>`;
  res.style.display='block';
}

function seleccionarAlumnoClase(uid,nombre,email){
  document.getElementById('clase-alumno-uid').value=uid;
  document.getElementById('clase-alumno-nombre').value=nombre;
  document.getElementById('clase-alumno-search').value='';
  document.getElementById('clase-alumno-resultados').style.display='none';
  document.getElementById('clase-alumno-chip').textContent=nombre;
  document.getElementById('clase-alumno-seleccionado').style.display='flex';
  document.getElementById('clase-alumno-search').style.display='none';
  document.getElementById('m-clase').dataset.alumnoEmail=email;
}

function limpiarAlumnoClase(){
  document.getElementById('clase-alumno-uid').value='';
  document.getElementById('clase-alumno-nombre').value='';
  document.getElementById('clase-alumno-seleccionado').style.display='none';
  document.getElementById('clase-alumno-search').style.display='';
  document.getElementById('clase-alumno-search').value='';
  document.getElementById('clase-alumno-resultados').style.display='none';
}

async function guardarClase(){
  const m=document.getElementById('m-clase');
  const nombre=document.getElementById('clase-alumno-nombre').value||document.getElementById('clase-alumno-search').value.trim();
  if(!nombre){toast('Ingresa el nombre del alumno');return;}
  const uid=document.getElementById('clase-alumno-uid').value||null;
  const {fecha,horaInicio,club}=m.dataset;
  const durMin=parseInt(document.getElementById('clase-duracion').value);
  const [hh,mm]=horaInicio.split(':').map(Number);
  const ft=hh*60+mm+durMin;
  const horaFin=`${String(Math.floor(ft/60)).padStart(2,'0')}:${String(ft%60).padStart(2,'0')}`;
  const nota=document.getElementById('clase-nota').value.trim();
  const notaPublica=document.getElementById('clase-nota-publica').checked;
  const gcalOp=document.getElementById('gcal-opcion-val')?.value||'no';
  if(!userData.clasesEntrenador) userData.clasesEntrenador=[];
  const clase={id:'c'+Date.now(),fecha,horaInicio,horaFin,club,alumnoNombre:nombre,alumnoUid:uid,nota,notaPublica,cancelada:false,creadaEn:new Date().toISOString()};
  if(gcalOp!=='no'){
    const ae=gcalOp==='invitar'?(m.dataset.alumnoEmail||null):null;
    const evId=await crearEventoGCal(`Clase de pádel — ${nombre}`,fecha,horaInicio,horaFin,club,ae);
    if(evId) clase.gcalEventId=evId;
  }
  userData.clasesEntrenador.push(clase);
  if(uid){
    try{await db.collection('users').doc(uid).collection('notificaciones').add({
      tipo:'clase_agendada',entrenadorNombre:userData?.perfil?.apodo||CURRENT_USER?.displayName||'Entrenador',
      entrenadorUid:CURRENT_USER?.uid,fecha,horaInicio,horaFin,club,leida:false,creadaEn:new Date().toISOString()
    });}catch(e){}
  }
  await saveData();closeModal('m-clase');renderAgenda();toast('Clase agendada');
}

function abrirDetalleClase(id){
  const c=(userData?.clasesEntrenador||[]).find(x=>x.id===id);if(!c) return;
  document.getElementById('dc-clase-id').value=id;
  document.getElementById('dc-title').textContent=`Clase — ${c.alumnoNombre}`;
  document.getElementById('dc-info').textContent=`${c.fecha}  ${c.horaInicio}–${c.horaFin}${c.club?' · '+c.club:''}`;
  document.getElementById('dc-nota').value=c.nota||'';
  document.getElementById('dc-nota-publica').checked=!!c.notaPublica;
  // Estado Google Calendar
  const gcalEl=document.getElementById('dc-gcal-status');
  if(c.gcalEventId){
    gcalEl.style.background='#E1F5EE';
    gcalEl.innerHTML=`<span style="font-size:13px">📅</span><span style="color:#0F6E56;flex:1">Sincronizado con Google Calendar</span>`;
  } else {
    gcalEl.style.background='#f1efe8';
    gcalEl.innerHTML=`<span style="font-size:13px">📅</span><span style="color:var(--color-text-secondary,#888780);flex:1">No sincronizado</span>
      <button onclick="sincronizarClaseGCal('${id}')" style="background:#1D9E75;color:#fff;border:none;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;flex-shrink:0">Sincronizar</button>`;
  }
  document.getElementById('m-detalle-clase').style.display='flex';
}

async function sincronizarClaseGCal(id){
  const c=(userData?.clasesEntrenador||[]).find(x=>x.id===id);
  if(!c) return;
  const btn=document.querySelector('#dc-gcal-status button');
  if(btn){ btn.textContent='Sincronizando...'; btn.disabled=true; }
  const evId=await crearEventoGCal(`Clase de pádel — ${c.alumnoNombre}`,c.fecha,c.horaInicio,c.horaFin,c.club||'',null);
  if(evId){
    c.gcalEventId=evId;
    await saveData();
    // Actualizar UI del status
    const gcalEl=document.getElementById('dc-gcal-status');
    gcalEl.style.background='#E1F5EE';
    gcalEl.innerHTML=`<span style="font-size:13px">📅</span><span style="color:#0F6E56;flex:1">Sincronizado con Google Calendar</span>`;
    toast('Clase sincronizada con Google Calendar');
    renderAgenda();
  } else if(btn){
    btn.textContent='Sincronizar';
    btn.disabled=false;
  }
}

async function guardarNotaClase(){
  const id=document.getElementById('dc-clase-id').value;
  const c=(userData?.clasesEntrenador||[]).find(x=>x.id===id);if(!c) return;
  c.nota=document.getElementById('dc-nota').value.trim();
  c.notaPublica=document.getElementById('dc-nota-publica').checked;
  await saveData();closeModal('m-detalle-clase');renderAgenda();toast('Nota guardada');
}

async function eliminarEventoGCal(eventId){
  if(!eventId) return;
  if(!gcalToken&&userData?.gcalAccessToken){ gcalToken=userData.gcalAccessToken; }
  if(!gcalToken&&userData?.gcalRefreshToken) await refrescarTokenGCal();
  if(!gcalToken) return;
  try{
    const resp=await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,{
      method:'DELETE',
      headers:{'Authorization':'Bearer '+gcalToken}
    });
    if(resp.status===401){
      gcalToken=null;
      if(userData) delete userData.gcalAccessToken;
      toast('Token de Calendar expirado — reconecta');
    }
  }catch(e){ console.error('Error eliminando evento GCal:',e); }
}

async function cancelarClase(){
  const id=document.getElementById('dc-clase-id').value;
  if(!confirm('¿Cancelar esta clase?')) return;
  const c=(userData?.clasesEntrenador||[]).find(x=>x.id===id);
  if(!c) return;
  // Eliminar del calendario si existe el evento
  if(c.gcalEventId){
    await eliminarEventoGCal(c.gcalEventId);
    delete c.gcalEventId;
  }
  c.cancelada=true;
  await saveData();
  closeModal('m-detalle-clase');
  renderAgenda();
  toast('Clase cancelada');
}

function renderAlumnos(){
  const clases=(userData?.clasesEntrenador||[]).filter(c=>!c.cancelada);
  const mapa={};
  clases.forEach(c=>{const k=c.alumnoUid||c.alumnoNombre;if(!mapa[k])mapa[k]={uid:c.alumnoUid,nombre:c.alumnoNombre,clases:[]};mapa[k].clases.push(c);});
  const alumnos=Object.values(mapa).sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const el=document.getElementById('alumnos-list');
  if(!alumnos.length){el.innerHTML='<div class="empty">Sin alumnos aún.</div>';return;}
  const AV=['background:#E1F5EE;color:#0F6E56','background:#E6F1FB;color:#185FA5','background:#FAEEDA;color:#854F0B','background:#FAECE7;color:#993C1D','background:#EEEDFE;color:#3C3489'];
  el.innerHTML=alumnos.map((a,i)=>{
    const ult=a.clases.sort((x,y)=>y.fecha.localeCompare(x.fecha))[0];
    const nPub=a.clases.filter(c=>c.nota&&c.notaPublica).length;
    const nPriv=a.clases.filter(c=>c.nota&&!c.notaPublica).length;
    return `<div class="alumno-card" onclick="abrirDetalleAlumno('${(a.uid||a.nombre).replace(/'/g,"\\'")}')">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;border-radius:50%;${AV[i%5]};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;flex-shrink:0">${a.nombre.slice(0,2).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${a.nombre}</div>
          <div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-top:2px">${a.clases.length} clase${a.clases.length!==1?'s':''} · última: ${ult.fecha}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end">
          ${nPub?`<span class="nota-pub">📝 ${nPub} pública${nPub!==1?'s':''}</span>`:''}
          ${nPriv?`<span class="nota-priv">🔒 ${nPriv} privada${nPriv!==1?'s':''}</span>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function abrirDetalleAlumno(key){
  const clases=(userData?.clasesEntrenador||[]).filter(c=>!c.cancelada&&(c.alumnoUid===key||c.alumnoNombre===key)).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!clases.length) return;
  const nombre=clases[0].alumnoNombre;
  document.getElementById('da-content').innerHTML=`
    <div style="width:36px;height:4px;border-radius:2px;background:var(--color-border-secondary,#d3d1c7);margin:0 auto 14px"></div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <div style="width:44px;height:44px;border-radius:50%;background:#E1F5EE;color:#0F6E56;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:500">${nombre.slice(0,2).toUpperCase()}</div>
      <div><div style="font-size:15px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${nombre}</div><div style="font-size:12px;color:var(--color-text-secondary,#888780)">${clases.length} clases</div></div>
    </div>
    ${clases.map(c=>`
      <div style="padding:9px 0;border-bottom:0.5px solid #e5e4df">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
          <span style="font-size:12px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${c.fecha} · ${c.horaInicio}–${c.horaFin}</span>
          <button onclick="abrirDetalleClase('${c.id}');closeModal('m-detalle-alumno')" style="background:none;border:none;font-size:11px;color:#378ADD;cursor:pointer;font-family:inherit">Editar</button>
        </div>
        ${c.club?`<div style="font-size:11px;color:var(--color-text-secondary,#888780)">${c.club}</div>`:''}
        ${c.nota?`<div style="font-size:11px;margin-top:4px;padding:5px 8px;border-radius:6px;${c.notaPublica?'background:#E1F5EE;color:#0F6E56':'background:#FAEEDA;color:#854F0B'}">${c.notaPublica?'📝':'🔒'} ${c.nota}</div>`:'<div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-top:2px;font-style:italic">Sin nota</div>'}
      </div>`).join('')}
    <button onclick="closeModal('m-detalle-alumno')" style="display:block;width:100%;background:none;border:none;font-size:12px;color:var(--color-text-secondary,#888780);cursor:pointer;font-family:inherit;padding:12px;margin-top:4px">Cerrar</button>`;
  document.getElementById('m-detalle-alumno').style.display='flex';
}

function renderReporte(){
  const mes=document.getElementById('reporte-mes')?.value;if(!mes) return;
  const clases=(userData?.clasesEntrenador||[]).filter(c=>!c.cancelada&&c.fecha.startsWith(mes));
  const alumnos=new Set(clases.map(c=>c.alumnoUid||c.alumnoNombre)).size;
  const horas=clases.reduce((acc,c)=>{const[h1,m1]=c.horaInicio.split(':').map(Number),[h2,m2]=c.horaFin.split(':').map(Number);return acc+(h2*60+m2-h1*60-m1)/60;},0);
  document.getElementById('reporte-stats').innerHTML=`
    <div style="background:var(--color-background-secondary,#f1efe8);border-radius:10px;padding:9px;text-align:center"><div style="font-size:20px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${clases.length}</div><div style="font-size:10px;color:var(--color-text-secondary,#888780)">Clases</div></div>
    <div style="background:var(--color-background-secondary,#f1efe8);border-radius:10px;padding:9px;text-align:center"><div style="font-size:20px;font-weight:500;color:#1D9E75">${alumnos}</div><div style="font-size:10px;color:var(--color-text-secondary,#888780)">Alumnos</div></div>
    <div style="background:var(--color-background-secondary,#f1efe8);border-radius:10px;padding:9px;text-align:center"><div style="font-size:20px;font-weight:500;color:#378ADD">${Math.round(horas*10)/10}h</div><div style="font-size:10px;color:var(--color-text-secondary,#888780)">Horas</div></div>`;
  const nombresA=[...new Set(clases.map(c=>c.alumnoNombre))];
  const clubes=[...new Set(clases.map(c=>c.club).filter(Boolean))];
  const dias=[...new Set(clases.map(c=>new Date(c.fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long'})))];
  const fe=document.getElementById('reporte-filtros');
  const fa=fe.dataset.filtro||'todos',ft=fe.dataset.tipo||'todos';
  fe.innerHTML=
    `<div class="chip" onclick="setFiltroReporte('todos','',this)" style="background:${fa==='todos'?'#1D9E75':'#f1efe8'};color:${fa==='todos'?'#fff':'#888780'}">Todos</div>`+
    nombresA.map(n=>`<div class="chip" onclick="setFiltroReporte('alumno','${n}',this)" style="background:${fa===n?'#1D9E75':'#f1efe8'};color:${fa===n?'#fff':'#888780'}">${n}</div>`).join('')+
    clubes.map(cl=>`<div class="chip" onclick="setFiltroReporte('club','${cl}',this)" style="background:${fa===cl?'#1D9E75':'#f1efe8'};color:${fa===cl?'#fff':'#888780'}">${cl}</div>`).join('')+
    dias.map(d=>`<div class="chip" onclick="setFiltroReporte('dia','${d}',this)" style="background:${fa===d?'#1D9E75':'#f1efe8'};color:${fa===d?'#fff':'#888780'}">${d}</div>`).join('');
  let lista=clases;
  if(fa!=='todos'){
    if(ft==='alumno') lista=clases.filter(c=>c.alumnoNombre===fa);
    else if(ft==='club') lista=clases.filter(c=>c.club===fa);
    else if(ft==='dia') lista=clases.filter(c=>new Date(c.fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long'})===fa);
  }
  lista=lista.sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.horaInicio.localeCompare(b.horaInicio));
  const liEl=document.getElementById('reporte-lista');
  if(!lista.length){liEl.innerHTML='<div class="empty">Sin clases para este período</div>';return;}
  liEl.innerHTML=`<div class="card">`+lista.map(c=>`
    <div class="reporte-clase">
      <div class="reporte-time">${c.fecha.slice(5)}<br/>${c.horaInicio}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${c.alumnoNombre}</div>
        <div style="font-size:10px;color:var(--color-text-secondary,#888780)">${[c.club,c.horaInicio+'-'+c.horaFin].filter(Boolean).join(' · ')}</div>
        ${c.nota?`<div style="font-size:11px;margin-top:3px;padding:4px 7px;border-radius:5px;${c.notaPublica?'background:#E1F5EE;color:#0F6E56':'background:#FAEEDA;color:#854F0B'}">${c.notaPublica?'📝':'🔒'} ${c.nota}</div>`:''}
      </div>
    </div>`).join('')+'</div>';
}

function setFiltroReporte(tipo,valor,el){
  const fe=document.getElementById('reporte-filtros');
  fe.dataset.tipo=tipo;fe.dataset.filtro=valor||'todos';
  fe.querySelectorAll('.chip').forEach(c=>{c.style.background='#f1efe8';c.style.color='#888780';});
  el.style.background='#1D9E75';el.style.color='#fff';
  renderReporte();
}

function renderMenuEntrenador(){
  const u=CURRENT_USER;
  const perfil=userData?.perfil||{};
  const apodo=perfil.apodo||u?.displayName||'Entrenador';
  const initials=apodo.slice(0,2).toUpperCase();
  const avatarHTML=u?.photoURL
    ?`<img src="${u.photoURL}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
    :initials;

  // Stats
  const clases=userData?.clasesEntrenador||[];
  const hoy=new Date().toISOString().slice(0,10);
  const mesActual=hoy.slice(0,7);
  const inicioSemana=(()=>{const d=new Date();d.setDate(d.getDate()-(d.getDay()||7)+1);return d.toISOString().slice(0,10);})();
  const clasesHoy=clases.filter(c=>!c.cancelada&&c.fecha===hoy).length;
  const alumnos=new Set(clases.filter(c=>!c.cancelada).map(c=>c.alumnoUid||c.alumnoNombre)).size;
  const horasMes=clases.filter(c=>!c.cancelada&&c.fecha.startsWith(mesActual)).reduce((acc,c)=>{
    const[h1,m1]=c.horaInicio.split(':').map(Number),[h2,m2]=c.horaFin.split(':').map(Number);
    return acc+(h2*60+m2-h1*60-m1)/60;
  },0);
  const clasesSemana=clases.filter(c=>!c.cancelada&&c.fecha>=inicioSemana&&c.fecha<=hoy).length;

  // Próximas clases hoy
  const proximas=clases.filter(c=>!c.cancelada&&c.fecha===hoy).sort((a,b)=>a.horaInicio.localeCompare(b.horaInicio)).slice(0,4);
  const AV=['background:#E6F1FB;color:#185FA5','background:#E1F5EE;color:#0F6E56','background:#FAEEDA;color:#854F0B','background:#FAECE7;color:#993C1D','background:#EEEDFE;color:#3C3489'];
  const clasesHTML=proximas.length
    ?proximas.map((c,i)=>`
      <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:0.5px solid #f1efe8">
        <div style="width:24px;height:24px;border-radius:50%;${AV[i%5]};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:500;flex-shrink:0">${(c.alumnoNombre||'?').slice(0,2).toUpperCase()}</div>
        <div style="font-size:10px;color:var(--color-text-secondary,#888780);min-width:54px;flex-shrink:0">${c.horaInicio}–${c.horaFin}</div>
        <div style="font-size:12px;font-weight:500;color:var(--color-text-primary,#1a1a18);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.alumnoNombre}</div>
        ${c.club?`<div style="font-size:10px;color:var(--color-text-secondary,#888780);flex-shrink:0">${c.club}</div>`:''}
        <div style="width:6px;height:6px;border-radius:50%;background:${c.gcalEventId?'#1D9E75':'#d3d1c7'};flex-shrink:0" title="${c.gcalEventId?'En Google Calendar':'Sin Calendar'}"></div>
      </div>`).join('')
    :`<div style="font-size:12px;color:var(--color-text-secondary,#888780);text-align:center;padding:12px 0">Sin clases agendadas para hoy</div>`;

  // Próximo slot libre
  const bloques=userData?.bloques||[];
  const ahora=new Date();
  const horaAhora=`${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
  const bloquesHoy=bloques.filter(b=>(b.fecha===hoy||(b.recurrente&&String(b.dia)===String(ahora.getDay())))).sort((a,b)=>a.horaInicio.localeCompare(b.horaInicio));
  const slotLibre=bloquesHoy.find(b=>b.horaInicio>horaAhora&&!clases.find(c=>!c.cancelada&&c.fecha===hoy&&c.horaInicio===b.horaInicio));

  // Estado Calendar
  const calConectado=!!(gcalToken||userData?.gcalAccessToken);

  document.getElementById('home-dashboard').innerHTML=`
    <!-- Perfil entrenador -->
    <div class="dash-perfil">
      <div class="dash-av" style="background:#E6F1FB;color:#185FA5">${avatarHTML}</div>
      <div class="dash-pinfo">
        <div class="dash-pname">${apodo}</div>
        <div class="dash-badges">
          <span class="dash-badge" style="background:#E6F1FB;color:#185FA5">Entrenador</span>
          ${perfil.club?`<span class="dash-badge db-club">📍 ${perfil.club}</span>`:''}
          <span class="dash-badge" style="${calConectado?'background:#E1F5EE;color:#0F6E56':'background:var(--color-background-secondary,#f1efe8);color:var(--color-text-secondary,#888780)'}">${calConectado?'📅 Calendar conectado':'📅 Sin Calendar'}</span>
        </div>
      </div>
      <button class="dash-edit" onclick="goTo('perfil')">Editar</button>
    </div>

    <!-- Stats -->
    <div class="dash-stats">
      <div class="ds"><div class="ds-val">${clasesHoy}</div><div class="ds-lbl">Hoy</div></div>
      <div class="ds"><div class="ds-val" style="color:#378ADD">${alumnos}</div><div class="ds-lbl">Alumnos</div></div>
      <div class="ds"><div class="ds-val" style="color:#1D9E75">${Math.round(horasMes*10)/10}h</div><div class="ds-lbl">Este mes</div></div>
      <div class="ds"><div class="ds-val" style="color:#BA7517">${(userData?.academias||[]).length}</div><div class="ds-lbl">Academias</div></div>
    </div>

    <!-- Próximas clases hoy -->
    <div style="background:var(--color-background-primary,#fff);border:0.5px solid var(--color-border-tertiary,#e5e4df);border-radius:10px;padding:9px 11px;margin-bottom:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:10px;font-weight:500;color:var(--color-text-secondary,#888780);text-transform:uppercase;letter-spacing:.4px">Clases de hoy</span>
        <span onclick="goTo('entrenador-agenda')" style="font-size:11px;color:#378ADD;cursor:pointer">Ver agenda →</span>
      </div>
      ${clasesHTML}
    </div>

    <!-- Mini cards -->
    <div class="dash-row2">
      <div class="dash-mini">
        <div class="dm-lbl">Próximo slot libre</div>
        <div class="dm-val">${slotLibre?slotLibre.horaInicio+' – '+slotLibre.horaFin:'Sin bloques hoy'}</div>
        <div class="dm-sub">${slotLibre&&slotLibre.club?slotLibre.club:'hoy'}</div>
      </div>
      <div class="dash-mini">
        <div class="dm-lbl">Alumnos activos</div>
        <div class="dm-val">${alumnos} alumnos</div>
        <div class="dm-sub">${clasesSemana} clase${clasesSemana!==1?'s':''} esta semana</div>
        ${alumnos?`<div class="dm-bar"><div class="dm-fill" style="width:${Math.min(100,Math.round(clasesSemana/Math.max(alumnos,1)*100))}%;background:#378ADD"></div></div>`:''}
      </div>
    </div>`;

  // Academias count
  const academias=(userData?.academias||[]).length;

  // Menú — dos tarjetas principales + secundarias
  document.getElementById('menu-grid').innerHTML=`
    <div class="menu-group-lbl">Mis secciones</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px">

      <div onclick="goTo('entrenador-clases')" style="background:#E6F1FB;border:0.5px solid #B5D4F4;border-radius:14px;padding:16px 12px;cursor:pointer;transition:all .15s" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
        <span style="font-size:30px;margin-bottom:8px;display:block">🎾</span>
        <div style="font-size:14px;font-weight:500;color:#0C447C;margin-bottom:3px">Clases</div>
        <div style="font-size:11px;color:#185FA5;line-height:1.4;margin-bottom:8px">Agenda, alumnos y reportes individuales</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <span style="font-size:9px;background:#B5D4F4;color:#0C447C;padding:2px 6px;border-radius:20px;font-weight:500">Agenda</span>
          <span style="font-size:9px;background:#B5D4F4;color:#0C447C;padding:2px 6px;border-radius:20px;font-weight:500">Alumnos</span>
          <span style="font-size:9px;background:#B5D4F4;color:#0C447C;padding:2px 6px;border-radius:20px;font-weight:500">Reporte</span>
        </div>
      </div>

      <div onclick="goTo('entrenador-academias')" style="background:#FAEEDA;border:0.5px solid #FAC775;border-radius:14px;padding:16px 12px;cursor:pointer;transition:all .15s" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
        <span style="font-size:30px;margin-bottom:8px;display:block">🏫</span>
        <div style="font-size:14px;font-weight:500;color:#633806;margin-bottom:3px">Academias</div>
        <div style="font-size:11px;color:#854F0B;line-height:1.4;margin-bottom:8px">Grupos, entrenadores y clases colectivas</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <span style="font-size:9px;background:#FAC775;color:#633806;padding:2px 6px;border-radius:20px;font-weight:500">Grupos</span>
          <span style="font-size:9px;background:#FAC775;color:#633806;padding:2px 6px;border-radius:20px;font-weight:500">Clases</span>
          ${academias?`<span style="font-size:9px;background:#FAC775;color:#633806;padding:2px 6px;border-radius:20px;font-weight:500">${academias} academia${academias!==1?'s':''}</span>`:''}
        </div>
      </div>

    </div>
    <div class="menu-group-lbl" style="margin-top:8px">Personal</div>
    <div class="menu-grid-group">
      <div class="menu-item" onclick="goTo('perfil')" style="background:#C0DD97"><span class="menu-icon">👤</span><div class="menu-label">Mi perfil</div></div>
      <div class="menu-item" onclick="goTo('clubes')" style="background:#C0DD97"><span class="menu-icon">🏟️</span><div class="menu-label">Clubes</div></div>
      ${isAdmin()?`<div class="menu-item" onclick="goTo('admin')" style="background:#EEEDFE"><span class="menu-icon">⚙️</span><div class="menu-label">Administración</div></div>`:'<div style="background:var(--color-background-secondary,#f1efe8);border-radius:10px"></div>'}
    </div>`;
}

// ===== FIN MÓDULO ENTRENADOR =====

// ===== ACADEMIAS (stub inicial) =====
function renderAcademias(){
  const el=document.getElementById('academias-list');
  if(!el) return;
  const academias=userData?.academias||[];
  if(!academias.length){
    el.innerHTML=`<div style="text-align:center;padding:40px 20px">
      <div style="font-size:40px;margin-bottom:12px">🏫</div>
      <div style="font-size:14px;font-weight:500;color:var(--color-text-primary,#1a1a18);margin-bottom:6px">Sin academias aún</div>
      <div style="font-size:12px;color:var(--color-text-secondary,#888780);margin-bottom:16px;line-height:1.5">Crea tu primera academia para gestionar grupos de alumnos y clases colectivas</div>
      <button class="btn btn-p" onclick="abrirNuevaAcademia()">+ Crear academia</button>
    </div>`;
    return;
  }
  el.innerHTML=academias.map((a,i)=>`
    <div class="card" style="margin-bottom:8px;cursor:pointer" onclick="goTo('entrenador-academia-'+a.id)">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:44px;height:44px;border-radius:10px;background:#FAEEDA;color:#854F0B;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${a.emoji||'🏫'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${a.nombre}</div>
          <div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-top:2px">${(a.grupos||[]).length} grupo${(a.grupos||[]).length!==1?'s':''} · ${(a.entrenadores||[]).length+1} entrenador${(a.entrenadores||[]).length!==0?'es':''}</div>
        </div>
        <span style="color:var(--color-text-secondary,#888780)">›</span>
      </div>
    </div>`).join('');
}

function abrirNuevaAcademia(){
  toast('Módulo de academias — próximamente');
}


// ===== INIT AUTH (al final de todo, cuando todas las funciones están definidas) =====
(function(){
  const ua=navigator.userAgent||'';
  const isInApp=/FBAN|FBAV|Instagram|WhatsApp|Line\/|Twitter|Snapchat/i.test(ua)||((/iPhone|iPad/i.test(ua))&&!/Safari/i.test(ua)&&!/CriOS/i.test(ua));
  if(isInApp){const w=document.getElementById('inapp-warning');if(w)w.style.display='block';}
})();

// ── Log de diagnóstico persistente en Firestore ─────────────────────────────
// Sobrevive recargas de página — clave para depurar Safari iOS
const _logRef = db.collection('_authlog').doc('latest');
function logAuth(msg) {
  const ts = new Date().toISOString().slice(11,23);
  const ua = navigator.userAgent.slice(0,80);
  dbg(msg);
  _logRef.set({
    entries: firebase.firestore.FieldValue.arrayUnion('['+ts+'] '+msg),
    ua: ua,
    url: location.href,
    updatedAt: new Date().toISOString()
  }, {merge: true}).catch(()=>{});
}
// Botón para ver el log guardado en Firestore
window._verLog = async function() {
  const snap = await _logRef.get();
  if (snap.exists) {
    const d = snap.data();
    const msg = 'LOG GUARDADO:\n\n' + (d.entries||[]).slice(-20).join('\n') + '\n\nUA: ' + d.ua;
    alert(msg);
  } else {
    alert('No hay log guardado aún.');
  }
};
// ─────────────────────────────────────────────────────────────────────────────

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(()=>{
  logAuth('setPersistence OK — iniciando getRedirectResult');
  auth.getRedirectResult().then(r=>{
    if(r&&r.user){
      logAuth('getRedirectResult OK: '+r.user.email);
    } else {
      logAuth('getRedirectResult: sin usuario (code=null)');
    }
  }).catch(e=>{
    logAuth('getRedirectResult ERROR: '+e.code+' / '+e.message);
  });
  auth.onAuthStateChanged(async user=>{
    if(user){
      logAuth('onAuthStateChanged: usuario='+user.email);
      window.CURRENT_USER=user;
      const ref=db.collection('users').doc(user.uid);
      const snap=await ref.get();
      const defaults={partidos:[],palas:[],torneos:[],perfil:{}};
      window.userData=snap.exists?{...defaults,...snap.data()}:defaults;
      if(!snap.exists)await ref.set(window.userData);
      window.saveData=()=>db.collection('users').doc(user.uid).set(window.userData);
      window.ADMIN_UID=window.ADMIN_UID||user.uid;
      logAuth('cargando app...');
      mostrarSeleccionRol(user);
    }else{
      logAuth('onAuthStateChanged: sin usuario — mostrando login');
      hide('s-app');hide('s-rol');show('s-login');
    }
  });
}).catch(e=>{
  logAuth('setPersistence ERROR: '+e.message);
  console.error('Persistence error:',e);
});
