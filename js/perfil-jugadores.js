function actualizarBadgeModo(){
  const rol=userData?.perfil?.rol||'jugador';
  const esJugador=rol==='jugador';
  const badge=document.getElementById('tb-mode-badge');
  const icon=document.getElementById('tb-mode-icon');
  const label=document.getElementById('tb-mode-label');
  if(!badge) return;
  icon.textContent=esJugador?'🏃':'📋';
  label.textContent=esJugador?'Jugador':'Entrenador';
  badge.style.background=esJugador?'#E1F5EE':'#E6F1FB';
  badge.style.borderColor=esJugador?'#9FE1CB':'#90BEF0';
  badge.querySelector('span:last-child').style.color=esJugador?'#0F6E56':'#185FA5';
  badge.querySelectorAll('span').forEach(s=>{if(s.id!=='tb-mode-icon')s.style.color=esJugador?'#0F6E56':'#185FA5';});
  // Marcar activo en el modal
  const jBtn=document.getElementById('modo-jugador-btn');
  const eBtn=document.getElementById('modo-entrenador-btn');
  if(jBtn) jBtn.style.borderColor=esJugador?'#1D9E75':'#e5e4df';
  if(jBtn) jBtn.style.background=esJugador?'#E1F5EE':'#f1efe8';
  if(eBtn) eBtn.style.borderColor='#e5e4df';
}
function abrirCambioModo(){
  actualizarBadgeModo();
  document.getElementById('m-modo').style.display='flex';
}
function cerrarCambioModo(){
  document.getElementById('m-modo').style.display='none';
}
async function cambiarModo(rol){
  if(!userData.perfil) userData.perfil={};
  userData.perfil.rol=rol;
  await saveData();
  cerrarCambioModo();
  actualizarBadgeModo();
  toast('Modo actualizado');
  goToHome();
}

// PERFIL
async function renderPerfil(uid){
  const isOwn=!uid||uid===CURRENT_USER?.uid;
  if(isOwn){
    const u=CURRENT_USER, ud=userData, ps=ud.partidos||[];
    const perfil=ud.perfil||{};
    const wins=ps.filter(x=>x.victoria).length, wr=ps.length?Math.round(wins/ps.length*100):0;
    const años=perfil.desde?Math.floor((Date.now()-new Date(perfil.desde))/(1000*60*60*24*365)):null;
    const apodo=_fmtApodo(perfil.apodo||u?.displayName||'Mi perfil');
    const initials=apodo.slice(0,2).toUpperCase();
    const avatarHTML=u?.photoURL?`<img src="${u.photoURL}" referrerpolicy="no-referrer"/>`:`<span style="${AV_STYLES[0]};font-size:24px">${initials}</span>`;

    // Torneos donde el usuario está vinculado
    const myUid=u?.uid;
    const allTorneos=ud.torneos||[];
    const torneosPerfil=allTorneos.filter(t=>{
      const uids=Object.values(t.equipoUids||{}).flat();
      return uids.includes(myUid);
    });
    const torneosPG=torneosPerfil.reduce((a,t)=>{
      const equipoUids=t.equipoUids||{};
      const pNames=Object.entries(equipoUids).filter(([k,v])=>(v||[]).includes(myUid)).map(([k])=>k);
      let won=false;
      (t.playoffs||[]).filter(m=>m.jugado&&m.id==='pf_1').forEach(m=>{
        const winner=m.ganadorA?m.eq1:m.eq2;
        if(pNames.includes(winner)) won=true;
      });
      return a+(won?1:0);
    },0);

    function _posBadgeOwn(pos){
      if(!pos)return '';
      const n=parseInt(pos);
      if(n===1)return `<span style="font-size:26px;line-height:1">🏆</span><span style="font-size:13px;font-weight:800;color:#C9960C;margin-left:3px">1°</span>`;
      if(n===2)return `<span style="font-size:26px;line-height:1">🥈</span><span style="font-size:13px;font-weight:700;color:#8A8A8A;margin-left:3px">2°</span>`;
      if(n===3)return `<span style="font-size:26px;line-height:1">🥉</span><span style="font-size:13px;font-weight:700;color:#A0522D;margin-left:3px">3°</span>`;
      if(n<=6) return `<span style="font-size:24px;line-height:1">🏅</span><span style="font-size:13px;font-weight:700;color:var(--bl,#378ADD);margin-left:3px">${n}°</span>`;
      return `<span style="font-size:22px;line-height:1">🎾</span><span style="font-size:11px;color:var(--color-text-secondary,#888780);margin-left:3px">${n}°</span>`;
    }

    const torneosHTML=torneosPerfil.length===0
      ? '<div class="empty" style="padding:16px 0">Sin torneos registrados</div>'
      : torneosPerfil.map(t=>{
          const equipoUids=t.equipoUids||{};
          const parejaNames=Object.entries(equipoUids).filter(([k,v])=>(v||[]).includes(myUid)).map(([k])=>k);
          const parejaLabel=parejaNames.map(_apodoCorto).join(', ')||'—';
          const partJugados=t.partidos.filter(p=>p.jugado&&parejaNames.some(n=>p.eq1===n||p.eq2===n));
          const pg=partJugados.filter(p=>parejaNames.some(n=>(p.eq1===n&&p.ganadorA)||(p.eq2===n&&!p.ganadorA))).length;
          const pp=partJugados.length-pg;
          const _posMap={pf_1:['1°','2°'],pf_2:['3°','4°'],pf_3:['5°','6°'],pf_4:['7°','8°']};
          let finPos=null;
          (t.playoffs||[]).filter(m=>m.jugado&&m.eq1&&m.eq2&&_posMap[m.id]).forEach(m=>{
            const[wL,lL]=_posMap[m.id];
            const winner=m.ganadorA?m.eq1:m.eq2,loser=m.ganadorA?m.eq2:m.eq1;
            if(parejaNames.includes(winner))finPos=wL;
            if(parejaNames.includes(loser))finPos=lL;
          });
          return `<div style="padding:10px 0;border-bottom:0.5px solid var(--color-border-tertiary,#e5e4df);display:flex;align-items:center;gap:10px;cursor:pointer"
            onclick="abrirTorneoDesdePerfil('${t.id}')"
            onmouseover="this.style.background='var(--color-background-secondary,#f1efe8)';this.style.borderRadius='8px';this.style.margin='0 -4px';this.style.padding='10px 4px'"
            onmouseout="this.style.background='';this.style.borderRadius='';this.style.margin='';this.style.padding='10px 0'">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                <span style="font-size:13px;font-weight:500;color:var(--color-text-primary,#1a1a18);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.nombre||'Torneo'}</span>
              </div>
              <div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-bottom:3px">🎾 ${parejaLabel}</div>
              <div style="display:flex;gap:8px;font-size:11px;align-items:center;flex-wrap:wrap">
                ${t.fecha?`<span style="color:var(--color-text-secondary,#888780)">${t.fecha}</span>`:''}
                ${partJugados.length?`<span style="color:var(--g,#1D9E75);font-weight:600">${pg}G</span><span style="color:var(--co,#D85A30);font-weight:600">${pp}P</span><span style="color:var(--color-text-secondary,#888780)">${partJugados.length} partidos</span>`:'<span style="color:var(--color-text-secondary,#888780)">Sin partidos jugados</span>'}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
              ${finPos?`<div style="display:flex;align-items:center;gap:2px">${_posBadgeOwn(finPos)}</div>`:''}
              <span style="font-size:14px;color:var(--color-text-secondary,#888780)">›</span>
            </div>
          </div>`;
        }).join('');

    document.getElementById('perfil-content').innerHTML=`
      <div class="profile-hero">
        <div class="profile-av">${avatarHTML}</div>
        <div class="profile-name">${apodo}</div>
        ${perfil.mostrarNombre&&u?.displayName?`<div style="font-size:11px;color:#888780;margin-bottom:6px">${u.displayName}</div>`:''}
        <div class="profile-badges">
          ${perfil.categoria?`<span class="badge bb">${perfil.categoria}</span>`:''}
          ${perfil.posicion?`<span class="badge bg">${perfil.posicion}</span>`:''}
          ${perfil.genero?`<span class="badge" style="background:#f1efe8;color:#888780">${perfil.genero}</span>`:''}
        </div>
        ${perfil.club?`<div style="font-size:12px;color:#888780;margin-top:4px">📍 ${perfil.club}</div>`:''}
        <button class="btn btn-sm" style="margin-top:12px" onclick="abrirEditarPerfil()">Editar perfil</button>
        <button class="btn btn-sm btn-danger" style="margin-top:8px;margin-left:8px" onclick="fbSignOut()">Cerrar sesión</button>
      </div>
      <div class="info-grid">
        <div class="info-item"><div class="info-lbl">Partidos</div><div class="info-val">${ps.length} / ${wins}</div><div style="font-size:10px;color:var(--color-text-secondary,#888780);margin-top:2px">jugados / ganados</div></div>
        <div class="info-item"><div class="info-lbl">Efectividad</div><div class="info-val" style="color:var(--g)">${wr}%</div></div>
        <div class="info-item"><div class="info-lbl">Torneos</div><div class="info-val">${torneosPerfil.length} / ${torneosPG}</div><div style="font-size:10px;color:var(--color-text-secondary,#888780);margin-top:2px">jugados / ganados</div></div>
        <div class="info-item"><div class="info-lbl">Años jugando</div><div class="info-val">${años!==null?años+' años':'—'}</div></div>
      </div>
      ${ps.length?`<div class="card"><div class="card-title">Últimos partidos</div>${ps.slice(0,3).map(x=>matchHTML(x,true)).join('')}</div>`:''}
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="card-title" style="margin-bottom:0">Historial de torneos</div>
          <span style="font-size:10px;color:var(--color-text-secondary,#888780)">${torneosPerfil.length} total</span>
        </div>
        ${torneosHTML}
      </div>
      ${(ud.palas||[]).length?`<div class="card"><div class="card-title">Palas</div>${ud.palas.map(p=>{const nPart=(ud.partidos||[]).filter(x=>x.palaId===p.id).length;const nTorn=Object.values(ud.palasTorneos||{}).filter(pid=>pid===p.id).length;return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:0.5px solid #e5e4df"><span style="font-size:12px;font-weight:500">${p.marca} ${p.modelo}</span><div style="display:flex;gap:5px">${nPart?`<span class="badge bg">${nPart} part.</span>`:''} ${nTorn?`<span class="badge" style="background:rgba(55,138,221,0.15);color:var(--bl,#378ADD)">${nTorn} torn.</span>`:''} ${!nPart&&!nTorn?`<span class="badge bg">0 part.</span>`:''}</div></div>`;}).join('')}</div>`:''}
      <div class="card"><div class="card-title">Atributos</div><div id="panel-atributos-container"></div></div>
    `;
  renderPanelAtributos(CURRENT_USER.uid, perfil.categoria||'');
  } else {
    let p=allUsers.find(x=>x.uid===uid);
    if(!p){
      // Not in cache — fetch directly from Firestore
      document.getElementById('perfil-content').innerHTML='<div class="empty">Cargando perfil...</div>';
      try{
        const snap=await db.collection('users').doc(uid).get();
        if(snap.exists){
          p={uid:snap.id,...snap.data()};
          // Add to cache so future lookups are instant
          if(!allUsers.find(x=>x.uid===uid)) allUsers.push(p);
        }
      }catch(e){console.error(e);}
      if(!p){document.getElementById('perfil-content').innerHTML='<div class="empty">Jugador no encontrado</div>';return;}
    }
    const psAll=p.partidos||[];
    const wins=psAll.filter(x=>x.victoria).length, wr=psAll.length?Math.round(wins/psAll.length*100):0;
    const perfil=p.perfil||{};
    const años=perfil.desde?Math.floor((Date.now()-new Date(perfil.desde))/(1000*60*60*24*365)):null;
    const apodo=_fmtApodo(perfil.apodo||(p.email?.split('@')[0])||'Jugador');
    const initials=apodo.slice(0,2).toUpperCase();
    const avStyle=AV_STYLES[allUsers.indexOf(p)%AV_STYLES.length]||AV_STYLES[0];
    const avatarHTML=p.photoURL?`<img src="${p.photoURL}" referrerpolicy="no-referrer"/>`:`<span style="${avStyle};font-size:24px;width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center">${initials}</span>`;

    // Find tournaments where this player is linked via equipoUids
    const allTorneos=userData.torneos||[];
    const torneosPerfil=allTorneos.filter(t=>{
      const uids=Object.values(t.equipoUids||{}).flat();
      return uids.includes(uid);
    });


    // ── Match history: all matches, public note visible, private note hidden
    // torneosPG = torneos where player finished 1st place
    const torneosPG=torneosPerfil.reduce((a,t)=>{
      const equipoUids=t.equipoUids||{};
      const pNames=Object.entries(equipoUids).filter(([k,v])=>(v||[]).includes(uid)).map(([k])=>k);
      const _posMap={pf_1:['1°','2°'],pf_2:['3°','4°'],pf_3:['5°','6°'],pf_4:['7°','8°']};
      let won=false;
      (t.playoffs||[]).filter(m=>m.jugado&&m.id==='pf_1').forEach(m=>{
        const winner=m.ganadorA?m.eq1:m.eq2;
        if(pNames.includes(winner)) won=true;
      });
      return a+(won?1:0);
    },0);
    // partidos ganados en torneos (para referencia)
    const partidosGanadosTorneos=torneosPerfil.reduce((a,t)=>{
      const equipoUids=t.equipoUids||{};
      const pNames=Object.entries(equipoUids).filter(([k,v])=>(v||[]).includes(uid)).map(([k])=>k);
      const pj=t.partidos.filter(p=>p.jugado&&pNames.some(n=>p.eq1===n||p.eq2===n));
      return a+pj.filter(p=>pNames.some(n=>(p.eq1===n&&p.ganadorA)||(p.eq2===n&&!p.ganadorA))).length;
    },0);

    const matchesHTML=psAll.length===0
      ? '<div class="empty" style="padding:16px 0">Sin partidos registrados</div>'
      : psAll.map((m,mi)=>{
          const score=m.sets.map(s=>`${s.a}-${s.b}`).join(', ');
          const nota=m.nota&&!m.notaPrivada?`<div style="font-size:10px;color:var(--color-text-secondary,#888780);margin-top:2px;font-style:italic">"${m.nota}"</div>`:'';
          return `<div class="match-item" style="cursor:pointer;transition:background .15s;border-radius:6px;margin:0 -4px;padding:2px 4px" onclick="abrirDetallePartidoPerfil(${mi},'${uid}')"
            onmouseover="this.style.background='var(--color-background-secondary,#f1efe8)'"
            onmouseout="this.style.background=''">
            <span class="badge ${m.victoria?'bg':'br'}" style="min-width:24px;text-align:center;flex-shrink:0">${m.victoria?'G':'P'}</span>
            <div class="match-info">
              <div class="match-teams">${apodo} / ${m.pareja} vs ${m.r1} / ${m.r2}</div>
              <div class="match-meta"><span>${m.fecha||''}</span>${m.club?`<span style="color:var(--bl)">${m.club}</span>`:''}</div>
              ${nota}
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <div class="match-score">${score}</div>
              <span style="font-size:11px;color:var(--color-text-secondary,#888780);flex-shrink:0">›</span>
            </div>
          </div>`;
        }).join('');

    // Build tournaments HTML
    const torneosHTML=torneosPerfil.length===0
      ? '<div class="empty" style="padding:16px 0">Sin torneos registrados</div>'
      : torneosPerfil.map(t=>{
          const equipoUids=t.equipoUids||{};
          const parejaNames=Object.entries(equipoUids)
            .filter(([k,v])=>(v||[]).includes(uid))
            .map(([k])=>k);
          const parejaLabel=parejaNames.map(_apodoCorto).join(', ')||'—';
          const partJugados=t.partidos.filter(p=>p.jugado&&parejaNames.some(n=>p.eq1===n||p.eq2===n));
          const pg=partJugados.filter(p=>parejaNames.some(n=>(p.eq1===n&&p.ganadorA)||(p.eq2===n&&!p.ganadorA))).length;
          const pp=partJugados.length-pg;
          const _posMap={pf_1:['1°','2°'],pf_2:['3°','4°'],pf_3:['5°','6°'],pf_4:['7°','8°']};
          let finPos=null;
          (t.playoffs||[]).filter(m=>m.jugado&&m.eq1&&m.eq2&&_posMap[m.id]).forEach(m=>{
            const[wL,lL]=_posMap[m.id];
            const winner=m.ganadorA?m.eq1:m.eq2,loser=m.ganadorA?m.eq2:m.eq1;
            if(parejaNames.includes(winner))finPos=wL;
            if(parejaNames.includes(loser))finPos=lL;
          });
          function _posBadge(pos){
            if(!pos)return '';
            const n=parseInt(pos);
            if(n===1)return `<span style="font-size:26px;line-height:1">🏆</span><span style="font-size:13px;font-weight:800;color:#C9960C;margin-left:3px">1°</span>`;
            if(n===2)return `<span style="font-size:26px;line-height:1">🥈</span><span style="font-size:13px;font-weight:700;color:#8A8A8A;margin-left:3px">2°</span>`;
            if(n===3)return `<span style="font-size:26px;line-height:1">🥉</span><span style="font-size:13px;font-weight:700;color:#A0522D;margin-left:3px">3°</span>`;
            if(n<=6) return `<span style="font-size:24px;line-height:1">🏅</span><span style="font-size:13px;font-weight:700;color:var(--bl,#378ADD);margin-left:3px">${n}°</span>`;
            return `<span style="font-size:22px;line-height:1">🎾</span><span style="font-size:11px;color:var(--color-text-secondary,#888780);margin-left:3px">${n}°</span>`;
          }
          // Can the viewer access this torneo? Either it's in their own userData, or it's public
          const esPropio=userData.torneos?.some(x=>x.id===t.id);
          const esPublico=t.publico;
          const clickable=esPropio||esPublico;
          const badge=esPublico
            ?`<span style="font-size:9px;background:#E1F5EE;color:#0F6E56;padding:2px 6px;border-radius:20px;font-weight:500">Público</span>`
            :`<span style="font-size:9px;background:#f1efe8;color:#888780;padding:2px 6px;border-radius:20px;font-weight:500">Privado</span>`;
          return `<div style="padding:10px 0;border-bottom:0.5px solid var(--color-border-tertiary,#e5e4df);display:flex;align-items:center;gap:10px;${clickable?'cursor:pointer;':''}"
            ${clickable?`onclick="abrirTorneoDesdePerfil('${t.id}')"`:''}
            ${clickable?`onmouseover="this.style.background='var(--color-background-secondary,#f1efe8)';this.style.borderRadius='8px';this.style.margin='0 -4px';this.style.padding='10px 4px'"`:''} 
            ${clickable?`onmouseout="this.style.background='';this.style.borderRadius='';this.style.margin='';this.style.padding='10px 0'"`:''}>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                <span style="font-size:13px;font-weight:500;color:var(--color-text-primary,#1a1a18);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.nombre||'Torneo'}</span>
                ${badge}
              </div>
              <div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-bottom:3px">🎾 ${parejaLabel}</div>
              <div style="display:flex;gap:8px;font-size:11px;align-items:center;flex-wrap:wrap">
                ${t.fecha?`<span style="color:var(--color-text-secondary,#888780)">${t.fecha}</span>`:''}
                ${partJugados.length?`<span style="color:var(--g,#1D9E75);font-weight:600">${pg}G</span><span style="color:var(--co,#D85A30);font-weight:600">${pp}P</span><span style="color:var(--color-text-secondary,#888780)">${partJugados.length} partidos</span>`:'<span style="color:var(--color-text-secondary,#888780)">Sin partidos jugados</span>'}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
              ${finPos?`<div style="display:flex;align-items:center;gap:2px">${_posBadge(finPos)}</div>`:''}
              ${clickable?`<span style="font-size:14px;color:var(--color-text-secondary,#888780)">›</span>`:''}
            </div>
          </div>`;
        }).join('');

    document.getElementById('perfil-content').innerHTML=`
      <div class="profile-hero">
        <div class="profile-av">${avatarHTML}</div>
        <div class="profile-name">${apodo}</div>
        ${perfil.mostrarNombre&&p.displayName?`<div style="font-size:11px;color:#888780;margin-bottom:6px">${p.displayName}</div>`:''}
        <div class="profile-badges">
          ${perfil.categoria?`<span class="badge bb">${perfil.categoria}</span>`:''}
          ${perfil.posicion?`<span class="badge bg">${perfil.posicion}</span>`:''}
          ${perfil.genero?`<span class="badge" style="background:#f1efe8;color:#888780">${perfil.genero}</span>`:''}
        </div>
        ${perfil.club?`<div style="font-size:12px;color:#888780;margin-top:4px">📍 ${perfil.club}</div>`:''}
      </div>
      <div class="info-grid">
        <div class="info-item"><div class="info-lbl">Partidos</div><div class="info-val">${psAll.length} / ${wins}</div><div style="font-size:10px;color:var(--color-text-secondary,#888780);margin-top:2px">jugados / ganados</div></div>
        <div class="info-item"><div class="info-lbl">Efectividad</div><div class="info-val" style="color:var(--g)">${wr}%</div></div>
        <div class="info-item"><div class="info-lbl">Torneos</div><div class="info-val">${torneosPerfil.length} / ${torneosPG}</div><div style="font-size:10px;color:var(--color-text-secondary,#888780);margin-top:2px">jugados / ganados</div></div>
        <div class="info-item"><div class="info-lbl">Años jugando</div><div class="info-val">${años!==null?años+' años':'—'}</div></div>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="card-title" style="margin-bottom:0">Historial de partidos</div>
          <span style="font-size:10px;color:var(--color-text-secondary,#888780)">${psAll.length} total</span>
        </div>
        ${matchesHTML}
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="card-title" style="margin-bottom:0">Historial de torneos</div>
          <span style="font-size:10px;color:var(--color-text-secondary,#888780)">${torneosPerfil.length} total</span>
        </div>
        ${torneosHTML}
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="card-title" style="margin-bottom:0">Atributos</div>
          ${_puedeValorar(uid)?`<button class="btn btn-sm" onclick="abrirValoracion('${uid}')">Valorar</button>`:''}
        </div>
        <div id="panel-atributos-container"></div>
      </div>
    `;
  renderPanelAtributos(uid, perfil.categoria||'');

  }
}

// ── Ver detalle de partido desde perfil público ──
function abrirDetallePartidoPerfil(idx, uid){
  const u=allUsers.find(x=>x.uid===uid);
  if(!u) return;
  const m=(u.partidos||[])[idx];
  if(!m) return;
  const score=m.sets.map(s=>`${s.a}-${s.b}`).join(' / ');
  const apodo=u.perfil?.apodo||(u.email?.split('@')[0])||'Jugador';
  const nota=m.nota&&!m.notaPrivada?`<div style="margin-top:10px;padding:10px 12px;background:var(--color-background-secondary,#f1efe8);border-radius:8px;font-size:12px;font-style:italic;color:var(--color-text-secondary,#888780)">"${m.nota}"</div>`:'';
  // Build modal
  const existing=document.getElementById('m-detalle-partido-perfil');
  if(existing) existing.remove();
  const modal=document.createElement('div');
  modal.id='m-detalle-partido-perfil';
  modal.className='modal-bg';
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.innerHTML=`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <span class="badge ${m.victoria?'bg':'br'}" style="font-size:13px;padding:4px 10px">${m.victoria?'Victoria':'Derrota'}</span>
        <div class="modal-title" style="margin-bottom:0;flex:1">${m.fecha||'Sin fecha'}</div>
      </div>
      <div style="background:var(--color-background-secondary,#f1efe8);border-radius:12px;padding:14px;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin-bottom:10px">
          <div style="text-align:center">
            <div style="font-size:13px;font-weight:600;color:var(--color-text-primary,#1a1a18)">${apodo}</div>
            <div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-top:2px">${m.pareja}</div>
          </div>
          <div style="font-size:11px;font-weight:700;color:var(--am,#BA7517);text-align:center">VS</div>
          <div style="text-align:center">
            <div style="font-size:13px;font-weight:600;color:var(--color-text-primary,#1a1a18)">${m.r1}</div>
            <div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-top:2px">${m.r2}</div>
          </div>
        </div>
        <div style="text-align:center;font-size:22px;font-weight:700;color:var(--color-text-primary,#1a1a18);letter-spacing:2px">${score}</div>
      </div>
      ${m.club?`<div style="font-size:12px;color:var(--color-text-secondary,#888780);margin-bottom:6px">📍 ${m.club}${m.pista?' · Pista '+m.pista:''}</div>`:''}
      ${nota}
      <button onclick="document.getElementById('m-detalle-partido-perfil').remove()" style="margin-top:14px;width:100%;padding:11px;border:0.5px solid var(--color-border-tertiary,#e5e4df);border-radius:10px;background:none;font-size:13px;font-family:inherit;cursor:pointer;color:var(--color-text-secondary,#888780)">Cerrar</button>
    </div>`;
  document.body.appendChild(modal);
}

// ── Abrir torneo desde perfil público ──
async function abrirTorneoDesdePerfil(tid, returnPage, returnLabel){
  // Check if it's in viewer's own torneos first
  const propio=userData.torneos?.findIndex(x=>x.id===tid);
  if(propio!==-1&&propio!==undefined){
    goTo('torneo');
    setTimeout(()=>{
      curTorneoIdx=propio;
      renderTorneo();
      // Override topbar back button if we came from somewhere specific
      if(returnPage){
        const topbarLeft=document.getElementById('topbar-left');
        if(topbarLeft){
          topbarLeft.innerHTML=`<button class="topbar-back" onclick="goTo('${returnPage}')">← ${returnLabel||'Volver'}</button><span class="topbar-section">Torneos</span>`;
        }
      }
      setTimeout(()=>document.querySelector('[onclick*="switchTorneo('+propio+')"]')?.scrollIntoView({behavior:'smooth',block:'center'}),200);
    },50);
    return;
  }
  // Otherwise try to open as public torneo
  // Find in cache or fetch
  let t=_torneosPublicosCache?.find(x=>x.id===tid);
  if(!t){
    // Load from Firestore by scanning users (same as renderTorneosPublicos)
    try{
      const snap=await db.collection('users').get();
      snap.forEach(doc=>{
        const data=doc.data();
        (data.torneos||[]).filter(tt=>tt.publico&&tt.id===tid).forEach(tt=>{
          t={...tt,_ownerName:data.perfil?.apodo||'Usuario'};
        });
      });
    }catch(e){toast('Error al cargar torneo');return;}
  }
  if(!t){toast('Torneo no disponible');return;}
  document.getElementById('torneo-pub-titulo').textContent=t.nombre;
  const el=document.getElementById('torneo-pub-detalle-content');
  const meta=[];if(t._ownerName)meta.push('Por '+t._ownerName);if(t.fecha)meta.push(t.fecha);if(t.club)meta.push(t.club);
  let html=`<div style="font-size:12px;color:var(--color-text-secondary,#888780);margin-bottom:14px;display:flex;flex-wrap:wrap;gap:6px">${meta.map(m=>`<span>${m}</span>`).join('<span style="opacity:.4">·</span>')}</div>`;
  html+=_renderTorneoDetalle(t,false);
  el.innerHTML=html;
  goTo('torneo-publico-detalle');
}

function abrirEditarPerfil(){
  const p=userData.perfil||{};
  document.getElementById('m-perfil-title').textContent='Editar perfil';
  document.getElementById('btn-perfil-cancelar').style.display='';
  document.getElementById('ep-apodo').value=p.apodo||'';
  document.getElementById('ep-mostrar-nombre').checked=p.mostrarNombre||false;
  document.getElementById('ep-posicion').value=p.posicion||'';
  document.getElementById('ep-categoria').value=p.categoria||'';
  document.getElementById('ep-genero').value=p.genero||'';
  document.getElementById('ep-club').value=p.club||'';
  document.getElementById('ep-desde').value=p.desde||'';
  openModal('m-perfil');
}
async function guardarPerfil(){
  const _rawApodo=document.getElementById('ep-apodo').value.trim();
  if(!_rawApodo){toast('El apodo es obligatorio');return;}
  // Max 2 words, capitalize first letter of each word
  const apodo=_fmtApodo(_rawApodo.split(/\s+/).slice(0,2).join(' '));
  const rolAnterior=userData.perfil?.rol;
  userData.perfil={
    apodo,
    mostrarNombre:document.getElementById('ep-mostrar-nombre').checked,
    posicion:document.getElementById('ep-posicion').value,
    categoria:document.getElementById('ep-categoria').value,
    genero:document.getElementById('ep-genero').value,
    club:document.getElementById('ep-club').value,
    desde:document.getElementById('ep-desde').value,
    rol:rolAnterior||'jugador',
  };
  await saveData();
  closeModal('m-perfil');
  // Si venía del flujo de primera vez, iniciar la app
  if(document.getElementById('s-app').style.display==='none'||document.getElementById('s-app').style.display===''){
    iniciarApp();
  } else {
    renderPerfil(null);renderHome();
  }
  toast('Perfil actualizado');
}

// Helper: nombre visible de un usuario (apodo si tiene, fallback a email parcial)
function nombreVisible(u, isCurrentUser){
  if(isCurrentUser){
    const ap=window.userData?.perfil?.apodo;
    return _fmtApodo(ap || CURRENT_USER?.displayName || 'Yo');
  }
  return _fmtApodo((u?.perfil?.apodo) || (u?.email?.split('@')[0]) || 'Jugador');
}

// Capitalize first letter of each word: "PATIPERRO TAPIA" -> "Patiperro Tapia"
function _fmtApodo(s){
  if(!s) return s;
  return s.replace(/\S+/g, w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase());
}
// Short version for tournament cards: "Patiperro Tapia" -> "Patiperro T."
// Also handles pairs: "Patiperro Tapia - Ricardo Lopez" -> "Patiperro T. - Ricardo L."
function _apodoCorto(s){
  if(!s) return s;
  const fmt=_fmtApodo(s);
  const sep=fmt.includes(' - ')?' - ':fmt.includes(' / ')?' / ':null;
  const parts=sep?fmt.split(sep):[fmt];
  return parts.map(part=>{
    const words=part.trim().split(/\s+/);
    if(words.length===1) return words[0]; // single word, keep as is
    return words[0]+' '+words.slice(1).map(w=>w.charAt(0).toUpperCase()+'.').join(' ');
  }).join(sep||'');
}

// JUGADORES — carga todos los usuarios desde Firestore
async function renderJugadores(){
  // Cargar usuarios si no están en caché
  if(!allUsers.length){
    document.getElementById('players-list').innerHTML='<div class="empty">Cargando jugadores...</div>';
    try {
      const snap = await db.collection('users').get();
      allUsers = snap.docs.map(d=>({uid:d.id,...d.data()}));
    } catch(e){ console.error(e); }
  }
  const search=(document.getElementById('player-search')?.value||'').toLowerCase();
  const cats=['1ra','2da','3ra','4ta','5ta','6ta'];
  document.getElementById('filter-chips').innerHTML=
    `<div class="chip ${filterCat==='all'?'active':''}" onclick="setFilterCat('all')">Todas</div>`+
    cats.map(c=>`<div class="chip ${filterCat===c?'active':''}" onclick="setFilterCat('${c}')">${c}</div>`).join('')+
    `<div class="chip ${filterPos==='Drive'?'active':''}" onclick="setFilterPos('Drive')">Drive</div>`+
    `<div class="chip ${filterPos==='Revés'?'active':''}" onclick="setFilterPos('Revés')">Revés</div>`;

  let players=[...allUsers];
  const nombre=p=>(p?.perfil?.apodo||p?.email?.split('@')[0]||'').toLowerCase();
  const club=p=>((p.perfil||{}).club||'').toLowerCase();
  if(search) players=players.filter(p=>nombre(p).includes(search)||club(p).includes(search));
  if(filterCat!=='all') players=players.filter(p=>(p.perfil||{}).categoria===filterCat);
  if(filterPos!=='all') players=players.filter(p=>(p.perfil||{}).posicion===filterPos);

  document.getElementById('players-list').innerHTML=players.length?players.map((p,i)=>{
    const ps=p.partidos||[], wins=ps.filter(x=>x.victoria).length;
    const wr=ps.length?Math.round(wins/ps.length*100):0;
    const isMe=p.uid===CURRENT_USER?.uid;
    const nombre=nombreVisible(p, isMe);
    const initials=nombre.slice(0,2).toUpperCase();
    const avStyle=AV_STYLES[i%AV_STYLES.length];
    const perfil=p.perfil||{};
    return `<div class="player-card" onclick="verJugador('${p.uid}')">
      <div class="av" style="${avStyle}">${initials}</div>
      <div class="player-info">
        <div class="player-name">${nombre}${isMe?' <span class="badge bg" style="font-size:9px">Yo</span>':''}</div>
        <div class="player-meta">${[perfil.categoria,perfil.posicion,perfil.club].filter(Boolean).join(' · ')||'Sin datos de perfil'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:16px;font-weight:500;color:var(--g)">${wr}%</div>
        <div style="font-size:10px;color:var(--color-text-secondary,#888780)">${ps.length} part.</div>
      </div>
    </div>`;
  }).join(''):'<div class="empty">No se encontraron jugadores</div>';
}
function setFilterCat(v){filterCat=v;renderJugadores();}
function setFilterPos(v){filterPos=filterPos===v?'all':v;renderJugadores();}
function verJugador(uid){
  goTo('perfil');
  setTimeout(async()=>{
    await renderPerfil(uid);
    const u=allUsers.find(x=>x.uid===uid);
    const nombre=_fmtApodo(u?.perfil?.apodo||(u?.email?.split('@')[0])||'Jugador');
    const sec=document.querySelector('.topbar-section');
    if(sec) sec.textContent=nombre;
  },50);
}

// PARTIDOS
function matchHTML(p,isOwner){
  const score=p.sets.map(s=>`${s.a}-${s.b}`).join(', ');
  const nota=p.nota?(p.notaPrivada?(isOwner?`<div style="font-size:10px;color:var(--am);margin-top:2px;font-style:italic">🔒 "${p.nota}"</div>`:''):`<div style="font-size:10px;color:var(--color-text-secondary,#888780);margin-top:2px;font-style:italic">"${p.nota}"</div>`):'';
  return `<div class="match-item">
    <span class="badge ${p.victoria?'bg':'br'}" style="min-width:24px;text-align:center;flex-shrink:0">${p.victoria?'G':'P'}</span>
    <div class="match-info">
      <div class="match-teams">Yo / ${p.pareja} vs ${p.r1} / ${p.r2}</div>
      <div class="match-meta"><span>${p.fecha}</span>${p.club?`<span style="color:var(--bl)">${p.club}</span>`:''}</div>
      ${nota}
    </div>
    <div class="match-score">${score}</div>
  </div>`;
}
function setNotaMode(m){
  notaMode=m;
  document.getElementById('btn-pub').className=m==='publica'?'active-pub':'';
  document.getElementById('btn-priv').className=m==='privada'?'active-priv':'';
  document.getElementById('nota-hint').textContent=m==='publica'?'Visible para todos':'Solo tú puedes ver esta nota';
}
function initSets(){
  setsCount=1; notaMode='publica';
  document.getElementById('sets-container').innerHTML='';
  addSet(); addSet();
  document.getElementById('p-fecha').value=new Date().toISOString().slice(0,10);
  document.getElementById('p-yo').value=userData?.perfil?.apodo||CURRENT_USER?.displayName||'';
  ['p-pareja','p-r1','p-r2','p-pista','p-notas'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  // Reset club selector
  const clubInput=document.getElementById('p-club');
  const clubLabel=document.getElementById('p-club-label');
  if(clubInput) clubInput.value='';
  if(clubLabel){clubLabel.textContent='Seleccionar club...';clubLabel.style.color='#888780';}
  const clubDd=document.getElementById('p-club-dropdown');
  if(clubDd) clubDd.style.display='none';;
  setNotaMode('publica');
  // Seleccionar pala predeterminada
  const palas=userData.palas||[];
  const pred=palas.find(p=>p.predeterminada)||palas[0];
  selectedPalaId=pred?.id||null;
  renderPalaSelector();
}

function addSet(){
  const c=document.getElementById('sets-container'),n=setsCount++;
  const row=document.createElement('div');row.className='form-row3';
  row.innerHTML=`<div class="fg"><label class="lbl">Set ${n} — Yo</label><input type="number" id="s${n}a" min="0" max="7" placeholder="6" inputmode="numeric"/></div>
    <div style="display:flex;align-items:flex-end;padding-bottom:6px;justify-content:center;font-size:16px;font-weight:500;color:#888780">—</div>
    <div class="fg"><label class="lbl">Set ${n} — Rival</label><input type="number" id="s${n}b" min="0" max="7" placeholder="4" inputmode="numeric"/></div>`;
  c.appendChild(row);
}
function renderPalaSelector(){
  const palas=userData.palas||[];
  const container=document.getElementById('pala-selector-container');
  if(!container) return;
  if(!palas.length){
    container.innerHTML=`<div style="font-size:12px;color:#888780;padding:8px 0;margin-bottom:8px">No tienes palas registradas. <span style="color:#1D9E75;cursor:pointer;font-weight:500" onclick="goTo('palas')">Agrega una →</span></div>`;
    return;
  }
  container.innerHTML=`<div class="pala-selector">`+palas.map(p=>{
    const isSelected=p.id===selectedPalaId;
    const pts=(userData.partidos||[]).filter(x=>x.palaId===p.id);
    const wr=pts.length?Math.round(pts.filter(x=>x.victoria).length/pts.length*100):0;
    return `<div class="pala-option ${isSelected?'selected':''}" onclick="selectPala('${p.id}')">
      <div style="font-size:22px;flex-shrink:0">🏓</div>
      <div style="flex:1;min-width:0">
        <div class="pala-option-name">${p.marca} ${p.modelo}${p.predeterminada?' <span class="badge bg" style="font-size:9px">Predeterminada</span>':''}</div>
        <div class="pala-option-meta">${p.forma} · ${p.year} · ${pts.length} partidos · ${wr}% efect.</div>
      </div>
      <div class="radio-circle ${isSelected?'checked':''}"></div>
    </div>`;
  }).join('')+`</div>`;
}
function selectPala(id){ selectedPalaId=id; renderPalaSelector(); }

async function guardarPartido(){
  const sets=[];
  for(let i=1;i<setsCount;i++){const a=parseInt(document.getElementById('s'+i+'a')?.value),b=parseInt(document.getElementById('s'+i+'b')?.value);if(!isNaN(a)&&!isNaN(b))sets.push({a,b});}
  if(!sets.length){toast('Ingresa al menos un set');return;}
  const sA=sets.filter(s=>s.a>s.b).length;
  if(!userData.partidos)userData.partidos=[];
  userData.partidos.unshift({id:Date.now(),fecha:document.getElementById('p-fecha').value,club:document.getElementById('p-club').value||'',pista:document.getElementById('p-pista').value||'',pareja:document.getElementById('p-pareja').value||'Sin pareja',r1:document.getElementById('p-r1').value||'Rival 1',r2:document.getElementById('p-r2').value||'Rival 2',sets,victoria:sA>(sets.length-sA),nota:document.getElementById('p-notas').value,notaPrivada:notaMode==='privada',palaId:selectedPalaId||null});
  await saveData();
  toast(sA>(sets.length-sA)?'¡Partido ganado!':'Partido registrado');
  goTo('home');
}

// HISTORIAL
function renderHistorial(f){
  let ps=userData.partidos||[];
  if(f==='won')ps=ps.filter(p=>p.victoria);
  if(f==='lost')ps=ps.filter(p=>!p.victoria);
  const palas=userData.palas||[];
  document.getElementById('hist-list').innerHTML=ps.map(p=>{
    const score=p.sets.map(s=>`${s.a}-${s.b}`).join(', ');
    const pala=palas.find(x=>x.id===p.palaId);
    const nota=p.nota?(p.notaPrivada?`<div style="font-size:10px;color:#BA7517;margin-top:2px;font-style:italic">🔒 "${p.nota}"</div>`:`<div style="font-size:10px;color:#888780;margin-top:2px;font-style:italic">"${p.nota}"</div>`):'';
    const pId=p.id||ps.indexOf(p);
    const palaBtn=palas.length
      ?`<button onclick="abrirAsignarPala(${pId})" style="background:none;border:0.5px solid var(--color-border-tertiary,#e5e4df);border-radius:6px;padding:2px 7px;font-size:10px;color:${pala?'var(--bl,#378ADD)':'var(--color-text-secondary,#888780)'};cursor:pointer;font-family:inherit;white-space:nowrap">${pala?'🏓 '+_apodoCorto(pala.marca+' '+pala.modelo):'+ Pala'}</button>`
      :'';
    return `<div class="match-item">
      <span class="badge ${p.victoria?'bg':'br'}" style="min-width:24px;text-align:center;flex-shrink:0">${p.victoria?'G':'P'}</span>
      <div class="match-info">
        <div class="match-teams" style="color:var(--color-text-primary,#1a1a18)">Yo / ${p.pareja} vs ${p.r1} / ${p.r2}</div>
        <div class="match-meta"><span>${p.fecha}</span>${p.club?`<span style="color:var(--bl,#378ADD)">${p.club}</span>`:''}
        ${palaBtn}</div>
        ${nota}
      </div>
      <div class="match-score">${score}</div>
    </div>`;
  }).join('')||'<div class="empty">Sin partidos registrados</div>';
}
function abrirAsignarPala(partidoId){
  const palas=userData.palas||[];
  if(!palas.length){toast('No tenés palas registradas');return;}
  const partidos=userData.partidos||[];
  const p=partidos.find(x=>x.id===partidoId)||partidos[partidoId];
  if(!p)return;
  const sheet=document.createElement('div');
  sheet.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;display:flex;align-items:flex-end;justify-content:center';
  sheet.onclick=e=>{if(e.target===sheet)sheet.remove();};
  sheet.innerHTML=`<div style="background:var(--color-background-primary,#fff);border-radius:18px 18px 0 0;padding:20px 18px 32px;width:100%;max-width:600px;box-sizing:border-box">
    <div style="width:36px;height:4px;border-radius:2px;background:var(--color-border-secondary,#d3d1c7);margin:0 auto 16px"></div>
    <div style="font-size:15px;font-weight:600;color:var(--color-text-primary,#1a1a18);margin-bottom:4px">¿Con qué pala jugaste?</div>
    <div style="font-size:12px;color:var(--color-text-secondary,#888780);margin-bottom:14px">${p.fecha} · Yo / ${p.pareja}</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
      ${palas.map(pal=>`
        <div onclick="asignarPalaPartido(${partidoId},'${pal.id}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:0.5px solid ${p.palaId===pal.id?'var(--g,#1D9E75)':'var(--color-border-tertiary,#e5e4df)'};border-radius:10px;cursor:pointer;background:${p.palaId===pal.id?'var(--gl,#E1F5EE)':'var(--color-background-secondary,#f1efe8)'}">
          <span style="font-size:20px">🏓</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${pal.marca} ${pal.modelo}</div>
            <div style="font-size:10px;color:var(--color-text-secondary,#888780)">${pal.forma} · ${pal.year}</div>
          </div>
          ${p.palaId===pal.id?'<span style="color:var(--g,#1D9E75);font-weight:700">✓</span>':''}
        </div>`).join('')}
      ${p.palaId?`<div onclick="asignarPalaPartido(${partidoId},null)" style="text-align:center;padding:8px;font-size:12px;color:var(--color-text-secondary,#888780);cursor:pointer">Sin pala asignada</div>`:''}
    </div>
  </div>`;
  document.body.appendChild(sheet);
  _asignarPalaSheet=sheet;
}
let _asignarPalaSheet=null;
async function asignarPalaPartido(partidoId,palaId){
  const p=(userData.partidos||[]).find(x=>x.id===partidoId);
  if(!p)return;
  p.palaId=palaId;
  await saveData();
  if(_asignarPalaSheet)_asignarPalaSheet.remove();
  renderHistorial();
  toast(palaId?'Pala asignada':'Pala removida');
}
function filterH(f,el){document.querySelectorAll('#hist-tabs .tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');renderHistorial(f);}

// PALAS

// ══════════════════════════════════════════════
// PANEL DE ATRIBUTOS — v1.45
// ══════════════════════════════════════════════

const VAL_CATS = [
  { key:'defensa', label:'Defensa',     peso:0.20, attrs:['Derecha de fondo','Revés de fondo','Resto','Transición','Consistencia'] },
  { key:'globo',   label:'Globo',       peso:0.20, attrs:['Altura','Profundidad','Decisión táctica'] },
  { key:'volea',   label:'Volea',       peso:0.20, attrs:['Derecha','Revés','Presión','Contención','Bloqueo'] },
  { key:'aereo',   label:'Juego aéreo', peso:0.15, attrs:['Bandeja','Víbora','Rulo / Gancho'] },
  { key:'fisico',  label:'Físico',      peso:0.10, attrs:['Movilidad-Estabilidad','Habilidades básicas','Coordinación','Velocidad','Resistencia'] },
  { key:'mental',  label:'Mentalidad',  peso:0.10, attrs:['Concentración','Puntos clave','Compañerismo','Confianza'] },
  { key:'smash',   label:'Smash',       peso:0.05, attrs:['Efectividad','X3'] },
];

// uid del jugador que se está valorando actualmente
let _valorandoUid = null;

// Calcula el score de una categoría (promedio de sus atributos)
function _calcCatScore(catData) {
  if(!catData) return null;
  const vals = Object.values(catData).filter(v => typeof v === 'number');
  if(!vals.length) return null;
  return Math.round(vals.reduce((a,b) => a+b, 0) / vals.length);
}

// Calcula el rating general ponderado a partir de los scores por categoría
function _calcRating(scores) {
  let total = 0, pesoTotal = 0;
  VAL_CATS.forEach(cat => {
    const s = scores[cat.key];
    if(s !== null && s !== undefined) { total += s * cat.peso; pesoTotal += cat.peso; }
  });
  if(!pesoTotal) return null;
  return Math.round(total / pesoTotal);
}

// Calcula subcategoría Pareto 80/20:
// 40% inferior = Baja, 20% central = Firme, 40% superior = Alta
function _calcSubcat(miRating, ratings) {
  if(!ratings.length) return 'Firme';
  const sorted = [...ratings].sort((a,b) => a-b);
  const n = sorted.length;
  const p40 = sorted[Math.floor(n * 0.4)] ?? sorted[n-1];
  const p60 = sorted[Math.floor(n * 0.6)] ?? sorted[n-1];
  if(miRating > p60) return 'Alta';
  if(miRating < p40) return 'Baja';
  return 'Firme';
}

// Agrega promedio de valoraciones recibidas por el jugador
async function _getValoraciones(uid) {
  try {
    const snap = await db.collection('valoraciones').doc(uid).collection('ratings').get();
    if(snap.empty) return null;
    const ratings = snap.docs.map(d => d.data());
    return ratings;
  } catch(e) { console.error(e); return null; }
}

// Promedia todas las valoraciones de una lista para obtener scores por categoría
function _promediarValoraciones(ratings) {
  if(!ratings.length) return null;
  const result = {};
  VAL_CATS.forEach(cat => {
    const catScores = ratings.map(r => {
      const catData = r[cat.key];
      return _calcCatScore(catData);
    }).filter(s => s !== null);
    result[cat.key] = catScores.length ? Math.round(catScores.reduce((a,b)=>a+b,0)/catScores.length) : null;
    // Promediar subatributos también
    result[cat.key+'_attrs'] = cat.attrs.map((_, i) => {
      const vals = ratings.map(r => r[cat.key]?.[i]).filter(v => typeof v === 'number');
      return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 50;
    });
    result[cat.key+'_magia'] = undefined;
  });
  // Magia
  const magiaVals = ratings.map(r => r['magia']?.[0]).filter(v => typeof v === 'number');
  result['magia'] = magiaVals.length ? Math.round(magiaVals.reduce((a,b)=>a+b,0)/magiaVals.length) : null;
  return result;
}

function _gaugeColor(score) {
  if(score >= 75) return '#1D9E75';
  if(score >= 55) return '#BA7517';
  return '#D85A30';
}

function _subcatColor(subcat) {
  if(subcat==='Alta') return '#1D9E75';
  if(subcat==='Baja') return '#D85A30';
  return '#BA7517';
}

// Renderiza el panel de atributos dentro del perfil
async function renderPanelAtributos(uid, categoriaJugador) {
  const containerId = 'panel-atributos-container';
  const el = document.getElementById(containerId);
  if(!el) return;

  el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--color-text-secondary,#888780);font-size:13px">Cargando atributos...</div>';

  const todasLasValoraciones = await _getValoraciones(uid);
  if(!todasLasValoraciones || !todasLasValoraciones.length) {
    el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--color-text-secondary,#888780);font-size:13px">Sin valoraciones aún</div>';
    return;
  }

  // Separar por categoría del evaluador
  const mismaCat = todasLasValoraciones.filter(r => r.categoriaevaluador === categoriaJugador);
  const otrasCats = todasLasValoraciones.filter(r => r.categoriaevaluador !== categoriaJugador);

  const scores = _promediarValoraciones(mismaCat.length ? mismaCat : todasLasValoraciones);
  const rating = _calcRating(scores);

  // Calcular subcategoría comparando con todos los jugadores de la misma categoría
  const catRatings = allUsers
    .filter(u => u.uid !== uid && (u.perfil?.categoria || '') === categoriaJugador && u.ratingGeneral)
    .map(u => u.ratingGeneral);
  if(rating) catRatings.push(rating);
  const subcat = rating ? _calcSubcat(rating, catRatings) : null;

  // Render principal
  // Obtener posición del jugador desde allUsers o userData
  const jugadorData = allUsers.find(x => x.uid === uid);
  const posicion = jugadorData?.perfil?.posicion || (uid === CURRENT_USER?.uid ? userData?.perfil?.posicion : '') || '';

  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div>
        <div style="font-size:36px;font-weight:500;color:var(--color-text-primary,#1a1a18);line-height:1">${rating ?? '—'}</div>
        <div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-top:2px">Rating general</div>
        ${subcat ? `<div style="font-size:12px;font-weight:500;color:${_subcatColor(subcat)};margin-top:2px">${categoriaJugador} ${subcat}${posicion?' · '+posicion:''}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:var(--color-text-secondary,#888780);margin-bottom:6px">
          ${mismaCat.length} valorac. de ${categoriaJugador}<br>
          ${otrasCats.length ? `${otrasCats.length} de otras categorías` : ''}
        </div>
        <button onclick="generarScoutingCard('${uid}')" style="font-size:11px;background:none;border:0.5px solid var(--color-border-tertiary,#e5e4df);border-radius:8px;padding:4px 10px;cursor:pointer;color:var(--color-text-secondary,#888780);font-family:inherit">Compartir imagen</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px">`;

  VAL_CATS.forEach(cat => {
    const s = scores[cat.key] ?? '—';
    const attrs = scores[cat.key+'_attrs'] || cat.attrs.map(()=>50);
    const color = typeof s === 'number' ? _gaugeColor(s) : '#B4B2A9';
    html += `
      <div style="background:var(--color-background-primary,#fff);border:0.5px solid var(--color-border-tertiary,#e5e4df);border-radius:12px;padding:10px 12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;font-weight:500;color:var(--color-text-secondary,#888780);text-transform:uppercase;letter-spacing:.5px">${cat.label}</span>
          <span style="font-size:20px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${s}</span>
        </div>
        <div style="height:5px;background:var(--color-background-secondary,#f1efe8);border-radius:3px;margin-bottom:8px">
          <div style="height:100%;border-radius:3px;background:${color};width:${typeof s==='number'?s:50}%"></div>
        </div>
        <div style="font-size:11px">
          ${cat.attrs.map((a,i)=>`<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:0.5px solid var(--color-border-tertiary,#e5e4df)"><span style="color:var(--color-text-secondary,#888780)">${a}</span><span style="font-weight:500;color:var(--color-text-primary,#1a1a18)">${attrs[i]}</span></div>`).join('')}
        </div>
      </div>`;
  });

  html += `</div>`;

  // Magia
  if(scores.magia !== null && scores.magia !== undefined) {
    html += `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--color-background-secondary,#f1efe8);border:0.5px solid var(--color-border-tertiary,#e5e4df);border-radius:8px;padding:6px 12px;font-size:13px;color:var(--color-text-secondary,#888780)">Magia: <strong style="color:var(--color-text-primary,#1a1a18)">${scores.magia}</strong> <span style="font-size:10px">(no incide en rating)</span></div>`;
  }

  // Panel de otras categorías si hay
  if(otrasCats.length) {
    const scoresOtras = _promediarValoraciones(otrasCats);
    const ratingOtras = _calcRating(scoresOtras);
    html += `
      <div style="margin-top:14px;padding:10px 12px;background:var(--color-background-secondary,#f1efe8);border-radius:10px;border:0.5px solid var(--color-border-tertiary,#e5e4df)">
        <div style="font-size:12px;font-weight:500;color:var(--color-text-secondary,#888780);margin-bottom:4px">Valoraciones de otras categorías</div>
        <div style="font-size:22px;font-weight:500;color:var(--color-text-primary,#1a1a18)">${ratingOtras ?? '—'}</div>
        <div style="font-size:11px;color:var(--color-text-secondary,#888780)">${otrasCats.length} valoración(es)</div>
      </div>`;
  }

  el.innerHTML = html;

  // Si es el perfil propio, guardar rating y subcategoría en Firestore
  if(uid === CURRENT_USER?.uid && rating) {
    const prevRating = userData?.perfil?.ratingGeneral;
    const prevSubcat = userData?.perfil?.subcategoria;
    if(prevRating !== rating || prevSubcat !== subcat) {
      if(!userData.perfil) userData.perfil = {};
      userData.perfil.ratingGeneral = rating;
      userData.perfil.subcategoria  = subcat || 'Firme';
      // Guardar cache de scores de categorías para la FIFA card en el home
      userData._scoresCache = {
        defensa: scores.defensa ?? null,
        globo:   scores.globo   ?? null,
        volea:   scores.volea   ?? null,
        aereo:   scores.aereo   ?? null,
        fisico:  scores.fisico  ?? null,
        mental:  scores.mental  ?? null,
      };
      saveData().catch(e => console.error('Error guardando rating:', e));
    }
  }
}

// ── Abrir modal de valoración ──
async function abrirValoracion(uid) {
  _valorandoUid = uid;
  const u = allUsers.find(x => x.uid === uid);
  const nombre = _fmtApodo(u?.perfil?.apodo || (u?.email?.split('@')[0]) || 'Jugador');
  document.getElementById('m-valoracion-nombre').textContent = nombre;

  // Cargar valoración previa si existe
  let prev = null;
  try {
    const snap = await db.collection('valoraciones').doc(uid).collection('ratings').doc(CURRENT_USER.uid).get();
    if(snap.exists) prev = snap.data();
  } catch(e) {}

  // Inicializar sliders
  VAL_CATS.forEach(cat => {
    cat.attrs.forEach((_, i) => {
      const val = prev?.[cat.key]?.[i] ?? 50;
      const slider = document.getElementById(`va-${cat.key}-${i}`);
      const numEl = document.getElementById(`vn-${cat.key}-${i}`);
      if(slider) { slider.value = val; }
      if(numEl) numEl.textContent = val;
    });
    onValSlider(cat.key);
  });
  // Magia
  const magiaVal = prev?.magia?.[0] ?? 50;
  const magiaSlider = document.getElementById('va-magia-0');
  const magiaNum = document.getElementById('vn-magia-0');
  if(magiaSlider) magiaSlider.value = magiaVal;
  if(magiaNum) magiaNum.textContent = magiaVal;
  onValSlider('magia');

  openModal('m-valoracion');
}

// Actualiza el badge de score de una categoría en el modal
function onValSlider(catKey) {
  const cat = VAL_CATS.find(c => c.key === catKey);
  const numAttrs = cat ? cat.attrs.length : 1;
  let sum = 0;
  for(let i = 0; i < numAttrs; i++) {
    const slider = document.getElementById(`va-${catKey}-${i}`);
    const numEl = document.getElementById(`vn-${catKey}-${i}`);
    const val = slider ? parseInt(slider.value) : 50;
    if(numEl) numEl.textContent = val;
    sum += val;
  }
  const avg = Math.round(sum / numAttrs);
  const badge = document.getElementById(`vs-${catKey}`);
  if(badge) badge.textContent = avg;
}

// Guardar valoración en Firestore
async function guardarValoracion() {
  if(!_valorandoUid) return;
  const catEvaluador = userData?.perfil?.categoria || '';
  const data = { categoriaevaluador: catEvaluador, fecha: new Date().toISOString().slice(0,10) };

  VAL_CATS.forEach(cat => {
    data[cat.key] = cat.attrs.map((_, i) => {
      const slider = document.getElementById(`va-${cat.key}-${i}`);
      return slider ? parseInt(slider.value) : 50;
    });
  });
  // Magia
  const magiaSlider = document.getElementById('va-magia-0');
  data['magia'] = [magiaSlider ? parseInt(magiaSlider.value) : 50];

  try {
    await db.collection('valoraciones').doc(_valorandoUid).collection('ratings').doc(CURRENT_USER.uid).set(data);
    toast('Valoración guardada');
    closeModal('m-valoracion');
    // Refrescar panel
    const u = allUsers.find(x => x.uid === _valorandoUid);
    await renderPanelAtributos(_valorandoUid, u?.perfil?.categoria || '');
  } catch(e) {
    console.error(e);
    toast('Error al guardar valoración');
  }
}

// Verifica si el usuario actual puede valorar a uid
// (han jugado juntos según partidos vinculados, o es entrenador)
function _puedeValorar(uid) {
  if(!CURRENT_USER || CURRENT_USER.uid === uid) return false;
  const esEntrenador = userData?.perfil?.rol === 'entrenador';
  if(esEntrenador) return true;
  // Verificar si han jugado en el mismo torneo (equipoUids)
  const torneos = userData?.torneos || [];
  return torneos.some(t => {
    const uids = Object.values(t.equipoUids || {}).flat();
    return uids.includes(uid) && uids.includes(CURRENT_USER.uid);
  });
}

// ══════════════════════════════════════════════
// GENERADOR DE SCOUTING CARD — v1.45
// ══════════════════════════════════════════════
async function generarScoutingCard(uid) {
  toast('Generando imagen...');

  const u = allUsers.find(x => x.uid === uid) || (uid === CURRENT_USER?.uid ? {uid, ...userData, perfil: userData?.perfil} : null);
  const perfil = u?.perfil || {};
  const nombre = _fmtApodo(perfil.apodo || (u?.email?.split('@')[0]) || 'Jugador').toUpperCase();
  const categoria = perfil.categoria || '';
  const posicion  = perfil.posicion  || '';

  const ratings = await _getValoraciones(uid);
  if(!ratings || !ratings.length) { toast('Sin valoraciones para generar imagen'); return; }
  const scores = _promediarValoraciones(ratings);
  const rating = _calcRating(scores);
  const catRatings = allUsers
    .filter(x => x.uid !== uid && (x.perfil?.categoria||'') === categoria && x.ratingGeneral)
    .map(x => x.ratingGeneral);
  if(rating) catRatings.push(rating);
  const subcat = rating ? _calcSubcat(rating, catRatings) : 'Firme';

  // ── Paleta ──
  const GOLD   = '#C9960C';
  const GOLD2  = '#F0C040';
  const WHITE  = '#FFFFFF';
  const BLUE1  = '#1A2A4A'; // fondo oscuro
  const BLUE2  = '#0F1E3A'; // fondo más oscuro
  const BLUE3  = '#243555'; // card bg
  const ACCENT = '#378ADD'; // azul claro
  const GREEN  = '#1D9E75';
  const AMBER  = '#BA7517';
  const RED    = '#D85A30';

  function gaugeColor(s) { return s >= 75 ? GREEN : s >= 55 ? AMBER : RED; }
  function subcatColor(s) { return s==='Alta'?GREEN:s==='Baja'?RED:AMBER; }

  // Canvas: landscape 900x560
  const S = 2;
  const CW = 900, CH = 560;
  const canvas = document.createElement('canvas');
  canvas.width = CW*S; canvas.height = CH*S;
  const cx = canvas.getContext('2d'); cx.scale(S, S);

  // ── Fondo ──
  const bg = cx.createLinearGradient(0,0,CW,CH);
  bg.addColorStop(0, '#1A2A4A');
  bg.addColorStop(1, '#0A1220');
  cx.fillStyle = bg; cx.fillRect(0,0,CW,CH);

  // Grid sutil
  cx.strokeStyle='rgba(255,255,255,0.025)'; cx.lineWidth=1;
  for(let x=0;x<CW;x+=36){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,CH);cx.stroke();}
  for(let y=0;y<CH;y+=36){cx.beginPath();cx.moveTo(0,y);cx.lineTo(CW,y);cx.stroke();}

  // ── Franja dorada superior ──
  const topGrad = cx.createLinearGradient(0,0,CW,0);
  topGrad.addColorStop(0,GOLD2); topGrad.addColorStop(0.5,GOLD); topGrad.addColorStop(1,'#7A5800');
  cx.fillStyle=topGrad; cx.fillRect(0,0,CW,5);

  // ── Panel izquierdo (jugador) ──
  const PW = 200;
  cx.fillStyle='rgba(0,0,0,0.25)';
  cx.beginPath(); cx.roundRect(14, 14, PW, CH-28, 12); cx.fill();
  cx.strokeStyle=GOLD+'55'; cx.lineWidth=0.5;
  cx.beginPath(); cx.roundRect(14, 14, PW, CH-28, 12); cx.stroke();

  // Nombre
  cx.save();
  cx.font='bold italic 40px Impact, Arial Black, sans-serif';
  cx.fillStyle=WHITE;
  cx.textAlign='center';
  // Si nombre es largo, reducir fuente
  let fsize=40;
  while(cx.measureText(nombre).width > PW-20 && fsize>20){fsize--;cx.font=`bold italic ${fsize}px Impact, Arial Black, sans-serif`;}
  cx.fillText(nombre, 14+PW/2, 72);
  cx.restore();

  // Línea dorada bajo nombre
  cx.strokeStyle=GOLD; cx.lineWidth=1.5;
  cx.beginPath(); cx.moveTo(34,82); cx.lineTo(14+PW-20,82); cx.stroke();

  // Categoría · Posición
  cx.font='12px Arial, sans-serif';
  cx.fillStyle='rgba(255,255,255,0.55)';
  cx.textAlign='center';
  cx.fillText([categoria, posicion].filter(Boolean).join(' · '), 14+PW/2, 100);

  // Badge subcategoría
  const sc = subcat || 'Firme';
  cx.fillStyle = subcatColor(sc)+'33';
  cx.strokeStyle = subcatColor(sc);
  cx.lineWidth=1;
  cx.beginPath(); cx.roundRect(14+PW/2-35, 110, 70, 20, 5); cx.fill(); cx.stroke();
  cx.font='bold 11px Arial, sans-serif';
  cx.fillStyle=subcatColor(sc);
  cx.fillText(sc, 14+PW/2, 124);

  // Rating grande
  cx.font='bold 90px Impact, Arial Black, sans-serif';
  cx.fillStyle=GOLD2;
  cx.textAlign='center';
  cx.fillText(rating ?? '—', 14+PW/2, 250);

  cx.font='10px Arial, sans-serif';
  cx.fillStyle='rgba(255,255,255,0.35)';
  cx.fillText('RATING GENERAL', 14+PW/2, 265);

  // Mini stats compactas
  const miniCats = VAL_CATS.map(c=>({lbl:c.label.slice(0,3).toUpperCase(), s:scores[c.key]??0}));
  const MX = 14+16, MY = 285, MW = PW-32, MH = 16;
  miniCats.forEach((mc,i) => {
    const y = MY + i*(MH+4);
    cx.font='9px Arial,sans-serif';
    cx.fillStyle='rgba(255,255,255,0.45)';
    cx.textAlign='left';
    cx.fillText(mc.lbl, MX, y+10);
    cx.font='bold 9px Arial,sans-serif';
    cx.fillStyle=WHITE;
    cx.textAlign='right';
    cx.fillText(mc.s, MX+MW, y+10);
    cx.fillStyle='rgba(255,255,255,0.1)';
    cx.beginPath(); cx.roundRect(MX+28, y+3, MW-32, 5, 2); cx.fill();
    cx.fillStyle=gaugeColor(mc.s);
    cx.beginPath(); cx.roundRect(MX+28, y+3, (MW-32)*(mc.s/99), 5, 2); cx.fill();
  });

  // Valoraciones
  cx.font='10px Arial,sans-serif';
  cx.fillStyle='rgba(255,255,255,0.25)';
  cx.textAlign='center';
  cx.fillText(`${ratings.length} valoración(es)`, 14+PW/2, CH-20);

  // Pádel Hub logo text
  cx.font='bold 11px Arial,sans-serif';
  cx.fillStyle=GOLD+'88';
  cx.fillText('🎾 PÁDEL HUB', 14+PW/2, CH-6);

  // ── Grid de categorías (derecha) ──
  function drawGauge(cx, cx2, cy, r, score, color) {
    // Fondo semicírculo
    cx.strokeStyle='rgba(255,255,255,0.1)';
    cx.lineWidth=8;
    cx.lineCap='round';
    cx.beginPath();
    cx.arc(cx2, cy, r, Math.PI, 0);
    cx.stroke();
    // Arco coloreado
    const angle = Math.PI + (score/99)*Math.PI;
    cx.strokeStyle=color;
    cx.lineWidth=8;
    cx.beginPath();
    cx.arc(cx2, cy, r, Math.PI, angle);
    cx.stroke();
    // Número
    cx.font='bold 20px Impact,Arial Black,sans-serif';
    cx.fillStyle=WHITE;
    cx.textAlign='center';
    cx.fillText(score, cx2, cy+4);
  }

  const GRID_X = 14+PW+16;
  const GRID_W = CW-GRID_X-14;
  const COLS = 4, ROWS = 2;
  const CELL_W = GRID_W/COLS;
  const CELL_H = (CH-28)/ROWS;

  VAL_CATS.forEach((cat, i) => {
    const col = i%COLS;
    const row = Math.floor(i/COLS);
    const cx2 = GRID_X + col*CELL_W + CELL_W/2;
    const cy2 = 14 + row*CELL_H;
    const s = scores[cat.key] ?? 0;
    const color = gaugeColor(s);

    // Card bg
    cx.fillStyle=BLUE3;
    cx.strokeStyle='rgba(255,255,255,0.06)';
    cx.lineWidth=0.5;
    cx.beginPath();
    cx.roundRect(GRID_X+col*CELL_W+4, cy2+4, CELL_W-8, CELL_H-8, 10);
    cx.fill(); cx.stroke();

    // Título categoría
    cx.font='bold 11px Arial,sans-serif';
    cx.fillStyle=GOLD;
    cx.textAlign='center';
    cx.fillText(cat.label.toUpperCase(), cx2, cy2+26);

    // Gauge
    const gaugeY = cy2 + 72;
    const gaugeR = 32;
    drawGauge(cx, cx2, gaugeY, gaugeR, s, color);

    // Sub-atributos
    const attrs = scores[cat.key+'_attrs'] || cat.attrs.map(()=>50);
    const attrStartY = cy2 + 100;
    const attrH = Math.min(18, (CELL_H - 110) / cat.attrs.length);
    cat.attrs.forEach((a, ai) => {
      const ay = attrStartY + ai*attrH;
      if(ay + attrH > cy2+CELL_H-12) return;
      cx.font=`${Math.max(8,Math.min(10,attrH-4))}px Arial,sans-serif`;
      cx.fillStyle='rgba(255,255,255,0.45)';
      cx.textAlign='left';
      const shortA = a.length>14?a.slice(0,13)+'…':a;
      cx.fillText(shortA, GRID_X+col*CELL_W+10, ay+attrH-3);
      cx.font=`bold ${Math.max(8,Math.min(10,attrH-4))}px Arial,sans-serif`;
      cx.fillStyle=WHITE;
      cx.textAlign='right';
      cx.fillText(attrs[ai], GRID_X+col*CELL_W+CELL_W-10, ay+attrH-3);
      // Mini barra
      const bw=CELL_W-20, bh=2;
      cx.fillStyle='rgba(255,255,255,0.08)';
      cx.fillRect(GRID_X+col*CELL_W+10, ay+attrH, bw, bh);
      cx.fillStyle=color;
      cx.fillRect(GRID_X+col*CELL_W+10, ay+attrH, bw*(attrs[ai]/99), bh);
    });
  });

  // Magia (8va posición en el grid — última celda)
  const magiaCol=3, magiaRow=1;
  const mcx2 = GRID_X+magiaCol*CELL_W+CELL_W/2;
  const mcy2 = 14+magiaRow*CELL_H;
  cx.fillStyle=BLUE3;
  cx.strokeStyle='rgba(255,255,255,0.06)'; cx.lineWidth=0.5;
  cx.beginPath(); cx.roundRect(GRID_X+magiaCol*CELL_W+4,mcy2+4,CELL_W-8,CELL_H-8,10); cx.fill(); cx.stroke();
  cx.font='bold 11px Arial,sans-serif'; cx.fillStyle=GOLD; cx.textAlign='center';
  cx.fillText('MAGIA', mcx2, mcy2+26);
  drawGauge(cx, mcx2, mcy2+72, 32, scores.magia??0, ACCENT);
  cx.font='9px Arial,sans-serif'; cx.fillStyle='rgba(255,255,255,0.3)'; cx.textAlign='center';
  cx.fillText('no incide en rating', mcx2, mcy2+110);

  // ── Descargar ──
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scouting-${nombre.toLowerCase().replace(/\s+/g,'-')}.png`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
    toast('Imagen descargada');
  }, 'image/png');
}
