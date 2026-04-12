function renderPalas(){
  const palas=userData.palas||[];
  const partidos=userData.partidos||[];
  const el=document.getElementById('palas-list');
  if(!palas.length){el.innerHTML='<div class="empty">No tienes palas registradas. Agrega una →</div>';return;}
  el.innerHTML=palas.map(pala=>{
    const pts=partidos.filter(p=>p.palaId===pala.id);
    const wins=pts.filter(p=>p.victoria).length;
    const wr=pts.length?Math.round(wins/pts.length*100):0;
    const primero=pts.length?pts[pts.length-1].fecha:'—';
    const ultimo=pts.length?pts[0].fecha:'—';
    return `<div class="pala-card ${pala.predeterminada?'predeterminada':''}" onclick="verPala('${pala.id}')">
      <div class="pala-header">
        <div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="font-size:15px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${pala.marca} ${pala.modelo}</span>
            ${pala.predeterminada?'<span class="badge bg">Predeterminada</span>':''}
          </div>
          <div style="font-size:11px;color:var(--color-text-secondary,#888780)">${pala.forma} · ${pala.year}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:500;color:#1D9E75">${wr}%</div>
          <div style="font-size:10px;color:var(--color-text-secondary,#888780)">efect.</div>
        </div>
      </div>
      <div style="padding:0 13px 13px">
        <div class="pala-stats-row">
          <div class="pala-stat"><div class="pala-stat-val">${pts.length}</div><div class="pala-stat-lbl">Partidos</div></div>
          <div class="pala-stat"><div class="pala-stat-val" style="color:#1D9E75">${wins}</div><div class="pala-stat-lbl">Ganados</div></div>
          <div class="pala-stat"><div class="pala-stat-val" style="color:#D85A30">${pts.length-wins}</div><div class="pala-stat-lbl">Perdidos</div></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--color-text-secondary,#888780);margin-bottom:10px">
          <span>Primer uso: <strong style="color:var(--color-text-primary,#1a1a18)">${primero}</strong></span>
          <span>Último: <strong style="color:var(--color-text-primary,#1a1a18)">${ultimo}</strong></span>
        </div>
        ${PARAMS.map(p=>{const v=pala.params[p]||5,col=v>=8?'#1D9E75':v>=5?'#BA7517':'#D85A30';
          return `<div class="param-row"><div class="param-label">${p}</div><div class="param-bar"><div class="param-fill" style="width:${v*10}%;background:${col}"></div></div><div class="param-val">${v}</div></div>`;}).join('')}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
          ${pala.fechaCreacion?`<span style="font-size:10px;color:var(--color-text-secondary,#888780)">⏱ Desde ${pala.fechaCreacion}</span>`:'<span></span>'}
          <span style="font-size:11px;color:var(--bl,#378ADD);cursor:pointer;font-weight:500" onclick="event.stopPropagation();verPala('${pala.id}')">Ver historial →</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function verPala(id){
  const pala=(userData.palas||[]).find(p=>p.id===id);
  if(!pala) return;
  const pts=(userData.partidos||[]).filter(p=>p.palaId===id).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
  const palasTorneos=userData.palasTorneos||{};
  const torneos=userData.torneos||[];
  const torneosConPala=Object.entries(palasTorneos).filter(([,pid])=>pid===id).map(([tid])=>torneos.find(t=>t.id===tid)).filter(Boolean);
  const wins=pts.filter(p=>p.victoria).length;
  const wr=pts.length?Math.round(wins/pts.length*100):0;
  // Primer uso: la fecha más antigua entre partidos y torneos
  const fechasPartidos=pts.length?[pts[pts.length-1].fecha]:[];
  const fechasTorneos=torneosConPala.map(t=>t.fecha).filter(Boolean);
  const todasFechas=[...fechasPartidos,...fechasTorneos].sort();
  const primero=todasFechas.length?todasFechas[0]:'—';
  const hist=pala.historialParams||[];

  const evolucionHTML=hist.length>1?`
    <div class="card">
      <div class="card-title">Evolución de parámetros</div>
      <div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:2px">
        ${hist.map(h=>`<div style="font-size:10px;color:var(--color-text-secondary,#888780);white-space:nowrap;background:var(--color-background-secondary,#f1efe8);padding:3px 8px;border-radius:20px">${h.fecha}</div>`).join('')}
      </div>
      ${PARAMS.map(param=>{
        const vals=hist.map(h=>h.params[param]||5);
        const cambio=vals[vals.length-1]-vals[0];
        const col=cambio>0?'var(--g,#1D9E75)':cambio<0?'var(--co,#D85A30)':'var(--color-text-secondary,#888780)';
        const arrow=cambio>0?'↑':cambio<0?'↓':'—';
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="font-size:11px;color:var(--color-text-secondary,#888780);width:105px;flex-shrink:0">${param}</div>
          <div style="flex:1;display:flex;align-items:center;gap:4px">
            ${hist.map((h,i)=>{const v=h.params[param]||5;const isLast=i===hist.length-1;
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
                <div style="width:100%;height:7px;background:var(--color-background-secondary,#f1efe8);border-radius:3px;overflow:hidden">
                  <div style="width:${v*10}%;height:100%;background:${isLast?(v>=8?'#1D9E75':v>=5?'#BA7517':'#D85A30'):'#B4B2A9'};border-radius:3px"></div>
                </div>
                <div style="font-size:10px;color:${isLast?'var(--color-text-primary,#1a1a18)':'var(--color-text-secondary,#888780)'};font-weight:${isLast?'600':'400'}">${v}</div>
              </div>`;}).join('<div style="color:var(--color-border-tertiary,#e5e4df);font-size:12px;flex-shrink:0">›</div>')}
          </div>
          <div style="font-size:12px;color:${col};font-weight:600;width:24px;text-align:right;flex-shrink:0">${cambio!==0?arrow+Math.abs(cambio):arrow}</div>
        </div>`;
      }).join('')}
    </div>`:'';

  document.getElementById('pala-detalle-content').innerHTML=`
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div style="font-size:17px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${pala.marca} ${pala.modelo}</div>
          <div style="font-size:12px;color:var(--color-text-secondary,#888780);margin-top:2px">${pala.forma} · ${pala.year}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          ${pala.predeterminada
            ?'<span class="badge bg">Predeterminada</span>'
            :`<button class="btn btn-sm btn-outline" style="color:var(--color-text-primary,#1a1a18)" onclick="setPredeterminada('${pala.id}')">Marcar como predeterminada</button>`}
          <button class="btn btn-sm" style="color:var(--bl,#378ADD);border-color:rgba(55,138,221,.35);font-size:11px" onclick="editarPala('${pala.id}')">✏️ Editar params</button>
          <button class="btn btn-sm btn-danger" style="font-size:11px" onclick="eliminarPala('${pala.id}')">🗑 Eliminar</button>
        </div>
      </div>
      <div class="pala-stats-row">
        <div class="pala-stat"><div class="pala-stat-val">${pts.length}</div><div class="pala-stat-lbl">Partidos</div></div>
        <div class="pala-stat"><div class="pala-stat-val" style="color:var(--bl,#378ADD)">${torneosConPala.length}</div><div class="pala-stat-lbl">Torneos</div></div>
        <div class="pala-stat"><div class="pala-stat-val" style="color:#1D9E75">${wr}%</div><div class="pala-stat-lbl">Efectividad</div></div>
        <div class="pala-stat"><div class="pala-stat-val" style="font-size:12px">${primero}</div><div class="pala-stat-lbl">Primer uso</div></div>
      </div>
      <div class="wr-bar"><div class="wr-fill" style="width:${wr}%"></div></div>
      <div style="font-size:10px;color:var(--color-text-secondary,#888780);text-align:right;margin-top:2px">${wins} ganados · ${pts.length-wins} perdidos</div>
      ${pala.fechaCreacion?`<div style="font-size:10px;color:var(--color-text-secondary,#888780);text-align:right;margin-top:2px">📅 Desde ${pala.fechaCreacion} (${_diasDesde(pala.fechaCreacion)} días)</div>`:''}
    </div>
    ${evolucionHTML}
    <div class="card">
      <div class="card-title">Parámetros actuales</div>
      ${PARAMS.map(p=>{const v=pala.params[p]||5,col=v>=8?'#1D9E75':v>=5?'#BA7517':'#D85A30';
        return `<div class="param-row"><div class="param-label">${p}</div><div class="param-bar"><div class="param-fill" style="width:${v*10}%;background:${col}"></div></div><div class="param-val">${v}</div></div>`;}).join('')}
      ${pala.notas?`<div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-top:8px;font-style:italic">"${pala.notas}"</div>`:''}
    </div>
    <div class="card">
      <div class="card-title">Historial de partidos (${pts.length})</div>
      ${pts.length?pts.map(p=>{const score=p.sets.map(s=>`${s.a}-${s.b}`).join(', ');
        const pIdx=(userData.partidos||[]).indexOf(p);
        return `<div class="match-mini" style="cursor:pointer;transition:background .15s;border-radius:6px;margin:0 -4px;padding:2px 4px" onclick="abrirDetallePartidoPerfil(${pIdx},'${CURRENT_USER?.uid||''}')" onmouseover="this.style.background='rgba(128,128,128,0.07)'" onmouseout="this.style.background=''"  >
          <span class="badge ${p.victoria?'bg':'br'}" style="min-width:22px;text-align:center;flex-shrink:0">${p.victoria?'G':'P'}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:var(--color-text-primary,#1a1a18)">Yo / ${p.pareja} vs ${p.r1} / ${p.r2}</div>
            <div style="font-size:10px;color:var(--color-text-secondary,#888780);margin-top:1px">${p.fecha}${p.club?' · '+p.club:''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <div style="font-size:12px;font-weight:500;color:var(--color-text-secondary,#888780)">${score}</div>
            <span style="font-size:11px;color:var(--color-text-secondary,#888780);opacity:0.5">›</span>
          </div>
        </div>`;}).join(''):'<div class="empty">Sin partidos con esta pala aún</div>'}
    </div>
    <div class="card">
      <div class="card-title">Historial de torneos (${torneosConPala.length})</div>
      ${torneosConPala.length?torneosConPala.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map(t=>{
        const fmtN={americano:'Americano',todos:'Todos vs todos',grupos:'Grupos + Elim.',eliminacion:'Eliminación'};
        return `<div class="match-mini" style="cursor:pointer;transition:background .15s;border-radius:6px;margin:0 -4px;padding:2px 4px" onclick="abrirTorneoDesdePerfil('${t.id}','pala-detalle','Mis palas')" onmouseover="this.style.background='rgba(128,128,128,0.07)'" onmouseout="this.style.background=''">
          <span style="font-size:18px;flex-shrink:0">🏆</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${t.nombre}</div>
            <div style="font-size:10px;color:var(--color-text-secondary,#888780);margin-top:1px">${t.fecha||''}${t.formato?' · '+(fmtN[t.formato]||t.formato):''}</div>
          </div>
          <span style="font-size:11px;color:var(--color-text-secondary,#888780);opacity:0.5;flex-shrink:0">›</span>
        </div>`;}).join(''):'<div class="empty">Sin torneos con esta pala aún</div>'}
    </div>\``;
  goTo('pala-detalle');
  // Update topbar title with pala name
  document.getElementById('topbar-left').innerHTML=`<button class="topbar-back" onclick="goTo('palas')">← Mis palas</button><span class="topbar-section">${pala.marca} ${pala.modelo}</span>`;
}

function editarPala(id){
  const pala=(userData.palas||[]).find(p=>p.id===id);
  if(!pala) return;
  // Rellenar el modal con los valores actuales
  npMarcaElegida=pala.marca;
  npModeloElegido=pala.modelo;
  PARAMS.forEach(p=>newPalaParams[p]=pala.params?.[p]||5);
  document.getElementById('np-marca-elegida-label').textContent=pala.marca;
  document.getElementById('np-resumen-label').textContent=pala.marca+' '+pala.modelo;
  document.getElementById('np-forma').value=pala.forma||'Redonda';
  document.getElementById('np-year').value=pala.year||2025;
  const _fechaWrap=document.getElementById('np-fecha-wrap');
  if(_fechaWrap)_fechaWrap.style.display='block';
  document.getElementById('np-fecha-creacion').value=pala.fechaCreacion||new Date().toISOString().slice(0,10);
  document.getElementById('np-predeterminada').checked=!!pala.predeterminada;
  document.getElementById('np-notas').value=pala.notas||'';
  document.getElementById('np-marca-custom').value='';
  document.getElementById('np-modelo-custom').value='';
  document.getElementById('btn-marca-custom-ok').style.display='none';
  // Renderizar sliders con valores actuales
  document.getElementById('np-params').innerHTML=PARAMS.map(p=>{
    const val=pala.params?.[p]||5;
    return `<div class="param-row" style="margin-bottom:10px">
      <div class="param-label">${p}</div>
      <input type="range" min="1" max="10" value="${val}"
        oninput="document.getElementById('pl-${p.replace(/\W/g,'')}').textContent=this.value;newPalaParams['${p}']=+this.value">
      <div class="param-val" id="pl-${p.replace(/\W/g,'')}" style="min-width:18px">${val}</div>
    </div>`;
  }).join('');
  // Cambiar guardar para que actualice en vez de crear
  _editandoPalaId=id;
  const btnGuardar=document.getElementById('btn-guardar-pala');
  if(btnGuardar)btnGuardar.textContent='Actualizar pala';
  mostrarPaso('detalles');
  document.getElementById('m-pala-nueva').style.display='flex';
  document.documentElement.classList.add('modal-open');
}

async function actualizarPala(id){
  const pala=(userData.palas||[]).find(p=>p.id===id);
  if(!pala) return;
  const esPred=document.getElementById('np-predeterminada').checked;
  if(esPred) userData.palas.forEach(p=>p.predeterminada=false);
  const _fcInput=document.getElementById('np-fecha-creacion');
  if(_fcInput&&_fcInput.value)pala.fechaCreacion=_fcInput.value;
  pala.forma=document.getElementById('np-forma').value;
  pala.year=parseInt(document.getElementById('np-year').value)||pala.year;
  pala.predeterminada=esPred;
  pala.notas=document.getElementById('np-notas').value;
  // Guardar historial solo si los params cambiaron
  const oldParams=JSON.stringify(pala.params||{});
  const newParams={...newPalaParams};
  if(oldParams!==JSON.stringify(newParams)){
    if(!pala.historialParams)pala.historialParams=[];
    pala.historialParams.push({fecha:new Date().toISOString().slice(0,10),params:{...newParams}});
  }
  pala.params=newParams;
  if(esPred)selectedPalaId=id;
  await saveData();
  closeModal('m-pala-nueva');
  // Restaurar botón guardar para nuevas palas
  _editandoPalaId=null;
  const btnGuardar=document.getElementById('btn-guardar-pala');
  if(btnGuardar)btnGuardar.textContent='Guardar pala';
  verPala(id);
  toast('Pala actualizada');
}

function _diasDesde(fecha){
  if(!fecha)return 0;
  return Math.floor((new Date()-new Date(fecha))/(1000*60*60*24));
}

async function eliminarPala(id){
  const pala=(userData.palas||[]).find(p=>p.id===id);
  if(!pala)return;
  if(!confirm(`¿Eliminar la pala ${pala.marca} ${pala.modelo}? Esta acción no se puede deshacer.`))return;
  userData.palas=userData.palas.filter(p=>p.id!==id);
  if(pala.predeterminada&&userData.palas.length)userData.palas[0].predeterminada=true;
  await saveData();
  goTo('palas');renderPalas();toast('Pala eliminada');
}

async function setPredeterminada(id){
  if(!userData.palas) return;
  userData.palas.forEach(p=>p.predeterminada=false);
  const pala=userData.palas.find(p=>p.id===id);
  if(pala){pala.predeterminada=true;selectedPalaId=id;}
  await saveData();
  verPala(id);
  toast('Pala predeterminada actualizada');
}

// ===== CATÁLOGO DE PALAS 2024-2026 =====
const PALAS_CATALOGO = {
  'Bullpadel': {
    emoji:'🟢', color:'#E1F5EE',
    modelos:[
      {nombre:'Vertex 05 2026 Juan Tello',forma:'Diamante',año:2026},
      {nombre:'Vertex 05 Woman Cloud 2026',forma:'Diamante',año:2026},
      {nombre:'Vertex Advance 2026',forma:'Diamante',año:2026},
      {nombre:'Hack 04 Hybrid Cloud 2026',forma:'Diamante',año:2026},
      {nombre:'Hack 04 2024',forma:'Diamante',año:2024},
      {nombre:'Neuron 02 2026',forma:'Redonda',año:2026},
      {nombre:'Elite Woman 2026',forma:'Redonda',año:2026},
      {nombre:'Magnum 2025',forma:'Diamante',año:2025},
      {nombre:'Vertex 04 2024 Juan Tello',forma:'Diamante',año:2024},
      {nombre:'Hack 03 Comfort 2024',forma:'Diamante',año:2024},
      {nombre:'Performance Power 2024',forma:'Redonda',año:2024},
      {nombre:'Origin 2024',forma:'Redonda',año:2024},
    ]
  },
  'Nox': {
    emoji:'🔵', color:'#E6F1FB',
    modelos:[
      {nombre:'AT10 Luxury Genius 18K Alum 2026 Agustin Tapia',forma:'Lágrima',año:2026},
      {nombre:'AT10 Luxury Genius 12K Alum Xtrem 2026 Agustin Tapia',forma:'Lágrima',año:2026},
      {nombre:'AT10 Genius Attack 18K Alum 2026',forma:'Lágrima',año:2026},
      {nombre:'AT10 Genius Attack 12K Alum Xtrem 2026',forma:'Lágrima',año:2026},
      {nombre:'AT10 Pro Cup Hard 2026',forma:'Lágrima',año:2026},
      {nombre:'AT10 Pro Cup Soft 2026',forma:'Lágrima',año:2026},
      {nombre:'AT10 Genius 18K 2024',forma:'Lágrima',año:2024},
      {nombre:'AT10 Genius 12K 2024',forma:'Lágrima',año:2024},
      {nombre:'AT10 Luxury DRS 2024',forma:'Lágrima',año:2024},
      {nombre:'ML10 Pro Cup 2024',forma:'Lágrima',año:2024},
      {nombre:'ML10 Pro Cup Rough 2024',forma:'Lágrima',año:2024},
      {nombre:'EA10 Ventus Attack 12K Xtrem 2026',forma:'Redonda',año:2026},
      {nombre:'EA10 Ventus Hybrid 12K Xtrem 2026 Edu Alonso',forma:'Híbrida',año:2026},
      {nombre:'Equation Hard Advanced 2026',forma:'Redonda',año:2026},
      {nombre:'X-Zero Blue 2026',forma:'Redonda',año:2026},
      {nombre:'Tempo WPT 2024',forma:'Redonda',año:2024},
    ]
  },
  'Adidas': {
    emoji:'⚫', color:'#f1efe8',
    modelos:[
      {nombre:'Metalbone HRD+ 2026 Ale Galan',forma:'Diamante',año:2026},
      {nombre:'Metalbone 2026 Ale Galan',forma:'Diamante',año:2026},
      {nombre:'Metalbone 3.4 2025 Ale Galan',forma:'Diamante',año:2025},
      {nombre:'Metalbone Team 2026',forma:'Diamante',año:2026},
      {nombre:'Metalbone Team Light 2026',forma:'Diamante',año:2026},
      {nombre:'Metalbone 3.3 2024',forma:'Diamante',año:2024},
      {nombre:'Metalbone HRD 2024',forma:'Diamante',año:2024},
      {nombre:'RX Series 2026',forma:'Redonda',año:2026},
      {nombre:'RX Series Light 2026',forma:'Redonda',año:2026},
      {nombre:'Drive Light 2026',forma:'Lágrima',año:2026},
      {nombre:'Adipower Multiweight 2024',forma:'Diamante',año:2024},
      {nombre:'Adipower CTRL 2024',forma:'Diamante',año:2024},
    ]
  },
  'Head': {
    emoji:'🟡', color:'#FAEEDA',
    modelos:[
      {nombre:'Coello Pro 2026',forma:'Diamante',año:2026},
      {nombre:'Coello Motion 2026',forma:'Diamante',año:2026},
      {nombre:'Coello Team 2026',forma:'Diamante',año:2026},
      {nombre:'Coello Vibe 2026',forma:'Redonda',año:2026},
      {nombre:'Extreme Pro 2026',forma:'Redonda',año:2026},
      {nombre:'Speed Pro 2026',forma:'Redonda',año:2026},
      {nombre:'Speed Motion 2026',forma:'Redonda',año:2026},
      {nombre:'Flash Pro 2026',forma:'Redonda',año:2026},
      {nombre:'Delta Pro 2025',forma:'Diamante',año:2025},
      {nombre:'Delta Pro 2024',forma:'Diamante',año:2024},
      {nombre:'Zephyr Pro 2024',forma:'Redonda',año:2024},
      {nombre:'Graphene 360+ Delta 2024',forma:'Diamante',año:2024},
    ]
  },
  'Wilson': {
    emoji:'🟤', color:'#FAECE7',
    modelos:[
      {nombre:'Bela Pro V2 2024',forma:'Redonda',año:2024},
      {nombre:'Bela Elite V2 2024',forma:'Redonda',año:2024},
      {nombre:'Bela Super Power 2024',forma:'Diamante',año:2024},
      {nombre:'Carbon Force Pro 2025',forma:'Diamante',año:2025},
      {nombre:'Carbon Force 2025',forma:'Diamante',año:2025},
      {nombre:'Minion 2024',forma:'Redonda',año:2024},
      {nombre:'Tempo Pro 2025',forma:'Redonda',año:2025},
    ]
  },
  'Babolat': {
    emoji:'🟠', color:'#FAEEDA',
    modelos:[
      {nombre:'Viper 3.0 2026 Juan Lebron',forma:'Diamante',año:2026},
      {nombre:'Air Viper 2026',forma:'Diamante',año:2026},
      {nombre:'Air Veron 2026',forma:'Lágrima',año:2026},
      {nombre:'Air Vertuo 2026',forma:'Redonda',año:2026},
      {nombre:'Counter Viper 2026',forma:'Diamante',año:2026},
      {nombre:'Counter Veron 2026',forma:'Lágrima',año:2026},
      {nombre:'Counter Vertuo 2026',forma:'Redonda',año:2026},
      {nombre:'Technical Veron 3.0 2026',forma:'Lágrima',año:2026},
      {nombre:'Technical Viper 2024',forma:'Diamante',año:2024},
      {nombre:'Technical Viper Air 2024',forma:'Diamante',año:2024},
      {nombre:'Juan Lebron Signature 2024',forma:'Diamante',año:2024},
    ]
  },
  'StarVie': {
    emoji:'🔴', color:'#FAECE7',
    modelos:[
      {nombre:'Metheora Osiris 2024',forma:'Diamante',año:2024},
      {nombre:'Metheora Power 2024',forma:'Diamante',año:2024},
      {nombre:'Metheora Speed 2025',forma:'Diamante',año:2025},
      {nombre:'Titania Pro 2024',forma:'Redonda',año:2024},
      {nombre:'Titania Speed 2025',forma:'Redonda',año:2025},
      {nombre:'Aquila Carbon 2025',forma:'Lágrima',año:2025},
      {nombre:'R9.1 Carbon 2024',forma:'Diamante',año:2024},
      {nombre:'Basalto Difusor 2025',forma:'Redonda',año:2025},
      {nombre:'Brava 2025',forma:'Redonda',año:2025},
    ]
  },
  'Siux': {
    emoji:'🟣', color:'#EEEDFE',
    modelos:[
      {nombre:'Electra Pro Shadow Red 2026 Franco Stupackzuk',forma:'Diamante',año:2026},
      {nombre:'Diablo Pro Royal Blue 2026',forma:'Diamante',año:2026},
      {nombre:'Diablo Grafeno 2024',forma:'Diamante',año:2024},
      {nombre:'Diablo X 2025',forma:'Diamante',año:2025},
      {nombre:'Astra Hybrid 2026',forma:'Híbrida',año:2026},
      {nombre:'Pegasus Carbon 2025',forma:'Redonda',año:2025},
      {nombre:'Pegasus Pro 2025',forma:'Redonda',año:2025},
      {nombre:'Eclypse 2025',forma:'Diamante',año:2025},
      {nombre:'Valkiria 2026',forma:'Redonda',año:2026},
    ]
  },
  'Dunlop': {
    emoji:'🟡', color:'#FAEEDA',
    modelos:[
      {nombre:'Apex Pro 2024',forma:'Redonda',año:2024},
      {nombre:'Apex Ultra 2025',forma:'Redonda',año:2025},
      {nombre:'Blitz Elite 2024',forma:'Diamante',año:2024},
      {nombre:'Blitz Tour 2025',forma:'Diamante',año:2025},
      {nombre:'Tempo Pro 2025',forma:'Lágrima',año:2025},
    ]
  },
  'Varlion': {
    emoji:'🔵', color:'#E6F1FB',
    modelos:[
      {nombre:'LW Carbon 2024',forma:'Diamante',año:2024},
      {nombre:'LW Summum Carbon 2024',forma:'Diamante',año:2024},
      {nombre:'Avant Hex 2024',forma:'Redonda',año:2024},
      {nombre:'Bourne Summum 2025',forma:'Redonda',año:2025},
      {nombre:'Lethal Weapon 2025',forma:'Diamante',año:2025},
    ]
  },
  'Oxdog': {
    emoji:'🟠', color:'#FAEEDA',
    modelos:[
      {nombre:'Hyper Pro 2.0 2025',forma:'Lágrima',año:2025},
      {nombre:'Hyper Pro 2024',forma:'Lágrima',año:2024},
      {nombre:'Ultimate HES 2025',forma:'Diamante',año:2025},
      {nombre:'Ultralight HES 2025',forma:'Redonda',año:2025},
      {nombre:'Xsmash HES 2024',forma:'Diamante',año:2024},
      {nombre:'One HES 2024',forma:'Redonda',año:2024},
    ]
  },
  'Puma': {
    emoji:'🐾', color:'#FAECE7',
    modelos:[
      {nombre:'Nova CTG 2025',forma:'Diamante',año:2025},
      {nombre:'Viper CTG 2025',forma:'Diamante',año:2025},
      {nombre:'Soleil Court 2025',forma:'Redonda',año:2025},
      {nombre:'Cinnamon Smash 2024',forma:'Redonda',año:2024},
    ]
  },
  'Tecnifibre': {
    emoji:'⚪', color:'#E6F1FB',
    modelos:[
      {nombre:'Wall Breaker 365 2025',forma:'Diamante',año:2025},
      {nombre:'Wall Breaker 365 Dura 2024',forma:'Diamante',año:2024},
      {nombre:'Speedfire 135 2025',forma:'Redonda',año:2025},
      {nombre:'Slash 145 2024',forma:'Redonda',año:2024},
    ]
  },
  'Vibor-A': {
    emoji:'🟢', color:'#E1F5EE',
    modelos:[
      {nombre:'Tito Allemandi 2025',forma:'Diamante',año:2025},
      {nombre:'Black Mamba Carbon 2025',forma:'Diamante',año:2025},
      {nombre:'Talismán Azul 2025',forma:'Redonda',año:2025},
      {nombre:'Inti 2024',forma:'Redonda',año:2024},
    ]
  },
  'Prince': {
    emoji:'👑', color:'#FAEEDA',
    modelos:[
      {nombre:'Phantom 035 Speed 2025',forma:'Diamante',año:2025},
      {nombre:'Lightning 035P 2025',forma:'Redonda',año:2025},
      {nombre:'Racquet 035 Pro 2024',forma:'Redonda',año:2024},
    ]
  },
};
let npMarcaElegida='', npModeloElegido='', _editandoPalaId=null;

function _openPalaModal(){
  const id='m-pala-nueva';
  if(true){
    // Reset al paso 1
    npMarcaElegida=''; npModeloElegido=''; _editandoPalaId=null;
    const _fw=document.getElementById('np-fecha-wrap');if(_fw)_fw.style.display='none';
    PARAMS.forEach(p=>newPalaParams[p]=5);
    document.getElementById('np-notas').value='';
    document.getElementById('np-marca-custom').value='';
    document.getElementById('np-modelo-custom').value='';
    document.getElementById('np-predeterminada').checked=!(userData.palas||[]).length;
    // Renderizar marcas con búsqueda
    document.getElementById('np-marca-search').value='';
    _renderMarcasList('');
    document.getElementById('btn-marca-custom-ok').style.display='none';
    mostrarPaso('marca');
  }
  document.getElementById(id).style.display='flex';
  document.documentElement.classList.add('modal-open');
}

function _renderMarcasList(q){
  const marcas=Object.keys(PALAS_CATALOGO).filter(m=>!q||m.toLowerCase().includes(q.toLowerCase()));
  const el=document.getElementById('np-marcas-grid');
  if(!marcas.length){
    el.innerHTML=`<div style="text-align:center;padding:16px;font-size:13px;color:var(--color-text-secondary,#888780)">No se encontró esa marca. Escribila abajo.</div>`;
    return;
  }
  el.innerHTML=marcas.map(m=>{
    const d=PALAS_CATALOGO[m];
    return `<div onclick="seleccionarMarca('${m}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--color-background-secondary,#f1efe8);border:0.5px solid var(--color-border-tertiary,#e5e4df);border-radius:10px;cursor:pointer;transition:all .15s" onmouseover="this.style.background='rgba(29,158,117,0.12)';this.style.borderColor='#1D9E75'" onmouseout="this.style.background='var(--color-background-secondary,#f1efe8)';this.style.borderColor='var(--color-border-tertiary,#e5e4df)'">
      <span style="font-size:20px;flex-shrink:0">${d.emoji}</span>
      <span style="font-size:13px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${m}</span>
      <span style="margin-left:auto;font-size:11px;color:var(--color-text-secondary,#888780)">${d.modelos.length} modelos</span>
    </div>`;
  }).join('');
}

function mostrarPaso(paso){
  ['marca','modelo','detalles'].forEach(p=>{
    document.getElementById('np-step-'+p).style.display=paso===p?'block':'none';
  });
}

function _renderModelosList(q){
  const modelos=(PALAS_CATALOGO[npMarcaElegida]?.modelos||[]).filter(m=>!q||m.nombre.toLowerCase().includes(q.toLowerCase()));
  const el=document.getElementById('np-modelos-grid');
  if(!modelos.length){el.innerHTML=`<div style="text-align:center;padding:12px;font-size:13px;color:var(--color-text-secondary,#888780)">No encontrado. Escribilo abajo.</div>`;return;}
  el.innerHTML=modelos.map(m=>`<div onclick="seleccionarModelo('${m.nombre.replace(/'/g,"\\'")}','${m.forma}',${m.año})" style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--color-background-secondary,#f1efe8);border:0.5px solid var(--color-border-tertiary,#e5e4df);border-radius:8px;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='#1D9E75';this.style.background='rgba(29,158,117,0.12)'" onmouseout="this.style.borderColor='var(--color-border-tertiary,#e5e4df)';this.style.background='var(--color-background-secondary,#f1efe8)'">
    <div><div style="font-size:13px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${m.nombre}</div><div style="font-size:10px;color:var(--color-text-secondary,#888780);margin-top:1px">${m.forma} · ${m.año}</div></div>
    <div style="font-size:11px;color:var(--color-text-secondary,#888780)">›</div>
  </div>`).join('');
}
function seleccionarMarca(marca){
  npMarcaElegida=marca;
  document.getElementById('np-marca-elegida-label').textContent=marca;
  document.getElementById('np-modelo-search').value='';
  _renderModelosList('');
  mostrarPaso('modelo');
}

function seleccionarMarcaCustom(){
  const marca=document.getElementById('np-marca-custom').value.trim();
  if(!marca){toast('Escribe la marca');return;}
  npMarcaElegida=marca;
  document.getElementById('np-marca-elegida-label').textContent=marca;
  document.getElementById('np-modelos-grid').innerHTML='';
  mostrarPaso('modelo');
}

function onMarcaCustomInput(val){
  document.getElementById('btn-marca-custom-ok').style.display=val.trim()?'flex':'none';
}

function seleccionarModelo(nombre,forma,año){
  npModeloElegido=nombre;
  document.getElementById('np-forma').value=forma;
  document.getElementById('np-year').value=año;
  document.getElementById('np-resumen-label').textContent=npMarcaElegida+' '+nombre;
  // Params
  document.getElementById('np-params').innerHTML=PARAMS.map(p=>`
    <div class="param-row" style="margin-bottom:10px">
      <div class="param-label">${p}</div>
      <input type="range" min="1" max="10" value="5"
        oninput="document.getElementById('pl-${p.replace(/\W/g,'')}').textContent=this.value;newPalaParams['${p}']=+this.value">
      <div class="param-val" id="pl-${p.replace(/\W/g,'')}" style="min-width:18px">5</div>
    </div>`).join('');
  mostrarPaso('detalles');
}

function irADetalles(){
  const modeloCustom=document.getElementById('np-modelo-custom').value.trim();
  if(!modeloCustom){toast('Elige un modelo o escribe uno');return;}
  seleccionarModelo(modeloCustom,'Redonda',new Date().getFullYear());
}

function volverAMarca(){ mostrarPaso('marca'); }
function volverAModelo(){ mostrarPaso('modelo'); }

async function guardarPalaNueva(){if(_editandoPalaId){await actualizarPala(_editandoPalaId);return;}
  const marca=npMarcaElegida;
  const modelo=npModeloElegido||document.getElementById('np-modelo-custom').value.trim();
  if(!marca||!modelo){toast('Ingresa marca y modelo');return;}
  const esPred=document.getElementById('np-predeterminada').checked||!(userData.palas||[]).length;
  if(!userData.palas)userData.palas=[];
  if(esPred) userData.palas.forEach(p=>p.predeterminada=false);
  const _hoy=new Date().toISOString().slice(0,10);
  const nueva={id:'p'+Date.now(),marca,modelo,
    forma:document.getElementById('np-forma').value,
    year:parseInt(document.getElementById('np-year').value)||2025,
    predeterminada:esPred,
    fechaCreacion:_hoy,
    params:{...newPalaParams},
    notas:document.getElementById('np-notas').value,
    historialParams:[{fecha:new Date().toISOString().slice(0,10),params:{...newPalaParams}}]};
  userData.palas.push(nueva);
  if(esPred) selectedPalaId=nueva.id;
  await saveData();
  closeModal('m-pala-nueva');renderPalas();toast('Pala guardada');
}

// RANKING
