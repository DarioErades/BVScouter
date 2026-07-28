import{r as j,g as J,e as T,f as Z,k as G,h as Me,i as se,a as je,s as Ie}from"./index-mPRRmVeE.js";import{s as v,g as ke,b as N}from"./helpers-Doah0GRy.js";import{c as Ne}from"./stats-calculator-pista-WTzHIEyx.js";let e=null,ie=null,H=null,ae=0,ue=-1,W=null,Y=null,oe=[],ne=null;function Be(){ae=0,ue=-1,W&&window.removeEventListener("message",W),Y&&clearInterval(Y),W=o=>{let i=o.data;if(typeof i=="string")try{i=JSON.parse(i)}catch{return}!i||typeof i!="object"||(i.info&&typeof i.info.currentTime=="number"?ae=i.info.currentTime:typeof i.currentTime=="number"&&(ae=i.currentTime),i.info&&typeof i.info.playerState=="number"&&(ue=i.info.playerState))},window.addEventListener("message",W),Y=setInterval(()=>{const o=document.getElementById("yt-iframe-player");if(o&&o.contentWindow)try{o.contentWindow.postMessage(JSON.stringify({event:"command",func:"getCurrentTime",args:[]}),"*"),o.contentWindow.postMessage(JSON.stringify({event:"listening",id:1,channel:"widget"}),"*")}catch{}},250)}function M(){var i;if(!e||!e.partido||!e.partido.llevar_rotaciones)return!1;const o=(i=e.rotacionesIniciales)==null?void 0:i[e.setActual];return!o||Object.keys(o).length===0}function tt(){j.register("scouting-pista",async(o,i)=>{const s=await window.apiPista.getPartidoPista(i.partidoId);if(!s){v("Partido no encontrado","error"),j.navigate("dashboard-pista");return}const a=await window.apiPista.getRoster(i.partidoId),n=await window.apiPista.getAccionesPista(i.partidoId);let t={};try{t=JSON.parse(s.rotaciones_iniciales||"{}")}catch{t={}}if(e={partidoId:i.partidoId,partido:s,roster:a,acciones:n,rotacionesIniciales:t,dorsalSeleccionado:null,tipoAccion:null,subtipo:null,rotacionActual:1,equipoAlSaque:"local",setActual:1,marcadorLocal:0,marcadorRival:0,videoSpeed:J().videoDefaultSpeed||1,dorsalInput:"",dorsalTimer:null,wizardModalAbierto:!1,editingActionId:null},n.length>0){const l=n[n.length-1];e.setActual=l.tipo_accion==="fin_set"?Number(l.set_numero)+1:Number(l.set_numero),e.rotacionActual=l.tipo_accion==="fin_set"?1:l.rotacion||1,e.equipoAlSaque=l.equipo_al_saque||"local"}if(s.resultado){const l=s.resultado.split("-");l.length===2&&(e.marcadorLocal=parseInt(l[0])||0,e.marcadorRival=parseInt(l[1])||0)}o.style.padding="16px",De(o),Ce(),Ze(),Pe(),z(),j.registerDestroy(()=>{de(),ne&&document.removeEventListener("mousedown",ne),ne=null})})}async function Pe(o=e.partido.video_url){if(oe=[],!!o){try{oe=await window.api.getWhistles(o)}catch{return}oe.length&&(ne=i=>{if(i.button!==3&&i.button!==4||i.target.closest("input, textarea, select"))return;const s=i.button===3?"MouseBack":"MouseForward",a=G("pista","whistle-previous")===s,n=G("pista","whistle-next")===s;if(!a&&!n)return;const t=document.getElementById("local-video");if(!t)return;const l=t.currentTime||0,u=n?oe.find(r=>r>l+.08):[...oe].reverse().find(r=>r<l-.08);i.preventDefault(),u!==void 0&&(t.currentTime=u,v(`Silbato: ${N(u)}`,"info"))},document.addEventListener("mousedown",ne))}}function De(o){const{partido:i,roster:s}=e,a=i.video_tipo&&i.video_url;o.innerHTML=`
        <div class="scouting-layout ${a?"":"no-video"} ${i.video_tipo==="youtube"?"youtube-choice-active":""}">
            <div class="scouting-header">
                <div class="match-info">
                    <div>
                        <div class="match-info-label">Torneo</div>
                        <div class="match-info-value">${i.torneo||"Sin torneo"}</div>
                    </div>
                    <div>
                        <div class="match-info-label">Partido</div>
                        <div class="match-info-value">${i.equipo_nombre||"Local"} vs ${i.rival_nombre||"Rival"}</div>
                    </div>
                    <div>
                        <div class="match-info-label">Rotación</div>
                        <div class="match-info-value" style="display: flex; gap: 8px; align-items: center; cursor: pointer;" id="box-rotacion" title="Haz clic para cambiar rotación inicial o actual">
                            <span id="label-rotacion" style="color: var(--accent-primary); font-weight: bold; font-size: 16px;">R${e.rotacionActual}</span>
                            <button class="btn btn-sm btn-secondary" id="btn-rotar" title="Avanzar Rotación (+1)">↻</button>
                        </div>
                    </div>
                </div>
                <div class="flex gap-12 items-center">
                    <div class="scoreboard-controls">
                        <div class="scoreboard">
                            <div class="server-indicator local ${e.equipoAlSaque==="local"?"active":""}" id="server-local">🏐</div>
                            <span class="set-label" id="set-label">SET ${e.setActual}</span>
                            <span class="score" id="score-local" title="Click Izq: +1 | Click Der: -1">${e.marcadorLocal}</span>
                            <span class="score-separator">-</span>
                            <span class="score" id="score-rival" title="Click Izq: +1 | Click Der: -1">${e.marcadorRival}</span>
                            <div class="server-indicator rival ${e.equipoAlSaque==="rival"?"active":""}" id="server-rival">🏐</div>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-primary" id="btn-finalizar-set" title="Finalizar set actual y pasar al siguiente">🏁 Set</button>
                    <button class="btn btn-sm btn-secondary" id="btn-ver-informe" title="Ver informe estadístico DataVolley">📊 Informe</button>
                    <button class="btn btn-sm btn-secondary" id="btn-notas-partido" title="Ver/Editar notas del partido">📝 Notas</button>
                    <button class="btn btn-sm btn-secondary" id="btn-ajustes-partido" title="Ajustes del partido">⚙️ Ajustes</button>
                    <button class="btn btn-sm btn-secondary" id="btn-generador-videos" title="Generar vídeo resúmenes">🎬 Vídeo</button>
                    <button class="btn btn-sm btn-secondary" id="btn-guardar-partido" title="Guardar partido">💾 Guardar</button>
                    <button class="btn btn-sm btn-secondary" id="btn-volver">← Volver</button>
                </div>
            </div>

            <div class="scouting-left-column" id="scouting-left-column">
                <div class="video-container" id="video-container" style="flex: 1 1 auto; min-height: 120px;">
                    ${He()}
                </div>

                <div class="resize-handle resize-handle-h" id="resize-handle-video" title="Arrastra para redimensionar"></div>

                <!-- Timeline -->
                <div class="timeline-container" id="timeline-container" style="flex: 0 0 auto; min-height: 60px; height: 150px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div class="timeline-title" style="margin-bottom: 0;">Historial</div>
                    </div>
                    <div class="timeline-items" id="timeline-items"></div>
                </div>

                <div class="resize-handle resize-handle-h" id="resize-handle-timeline" title="Arrastra para redimensionar"></div>

                <!-- Estadísticas Vivo -->
                <div class="live-stats" id="live-stats" style="flex: 0 0 auto; min-height: 60px; height: 180px;">
                    <div style="overflow-x:auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Nº</th>
                                    <th>Nombre</th>
                                    <th title="Saques (Total/Errores/Puntos)">SAQ(T/E/P)</th>
                                    <th title="Recepción (Total/Errores/Positivas%/Errores%)">REC(T/E/P%/E%)</th>
                                    <th title="Ataque (Total/Errores/Bloqueados/Puntos/Puntos%)">ATQ(T/E/B/P/P%)</th>
                                    <th title="Bloqueos Punto">BLQ(P)</th>
                                    <th title="Ganados - Perdidos">G-P</th>
                                </tr>
                            </thead>
                            <tbody id="live-stats-tbody"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="action-panel">
                <div class="action-panel-title">Panel de Registro</div>

                <!-- Campo Virtual (Rotación y Posiciones) -->
                ${e.partido.llevar_rotaciones?Ve():""}

                <!-- Banner Rotación Pendiente -->
                <div id="rotation-pending-banner" style="display: none; background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%); border: 2px dashed #facc15; border-radius: 12px; padding: 24px 20px; text-align: center; margin-top: 12px; box-shadow: 0 10px 25px -5px rgba(234, 179, 8, 0.15);">
                    <div style="font-size: 42px; margin-bottom: 12px;">⏳</div>
                    <h3 style="color: #ffffff; font-size: 18px; font-weight: 800; margin-bottom: 8px;">Set <span id="pending-set-num">${e.setActual}</span> No Iniciado</h3>
                    <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
                        Reproduce el vídeo para ver la disposición inicial de tu equipo en pista. Una vez identifiques a los titulares y su posición, configura la rotación para iniciar el scouting.
                    </p>
                    <button class="btn btn-primary" id="btn-iniciar-rotacion-banner" style="padding: 12px 24px; font-size: 14px; font-weight: bold; background: linear-gradient(135deg, #facc15 0%, #eab308 100%); color: #000000; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(234, 179, 8, 0.4); cursor: pointer; width: 100%;">
                        ⚙️ Configurar Rotación Set <span id="pending-btn-set-num">${e.setActual}</span>
                    </button>
                </div>

                <div id="stats-controls-container">
                    <!-- Dorsales Grid -->
                    <div>
                        <div class="form-label" style="display:flex; justify-content:space-between">
                            <span>Jugador (Teclea el número)</span>
                        </div>
                        <div class="dorsal-grid" id="dorsal-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 8px; margin-bottom: 12px;">
                            ${qe()}
                        </div>
                    </div>

                    <!-- Tipo Acción -->
                    <div>
                        <div class="form-label">Tipo de Acción</div>
                        <div class="action-buttons" id="action-buttons">
                            ${Object.entries(T).filter(([n])=>!["cambio","tiempo_muerto"].includes(n)).map(([n,t])=>`
                                <button class="action-btn ${e.tipoAccion===n?"selected":""}" data-action="${n}">
                                    ${t.icon} ${t.label}
                                    ${t.key?`<span class="shortcut-hint">${t.key.toUpperCase()}</span>`:""}
                                </button>
                            `).join("")}
                        </div>
                    </div>
                    
                    <!-- Subtipo (dinámico) -->
                    <div id="subtipo-container" style="margin-top: 12px; display: ${e.tipoAccion&&Z[e.tipoAccion]?"block":"none"}">
                        <div class="form-label">Subtipo</div>
                        <div class="subtype-buttons" id="subtype-buttons">
                            ${Re()}
                        </div>
                    </div>

                    <!-- Resultados -->
                    <div id="resultados-container" style="margin-top: 12px; display: ${e.tipoAccion?"block":"none"}">
                        <div class="form-label">Resultado (Guarda la acción)</div>
                        <div class="action-buttons" id="resultado-buttons">
                            ${ze()}
                        </div>
                    </div>

                    <div class="current-action" id="current-action">
                        <div class="current-action-label">Acción en Curso</div>
                        <div class="current-action-value" id="current-action-text">Selecciona Dorsal...</div>
                    </div>
                </div>

                <button class="btn btn-sm btn-secondary" id="btn-undo" style="width: 100%; margin-top: 8px;">
                    ↩️ Deshacer Última (Z)
                </button>
            </div>
        </div>

        ${Je()}
    `,Ye(o),Qe(),Ge()}function Ve(){return`
        <div id="visual-court-widget" style="margin-bottom: 16px; background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border); border-radius: 12px; padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                <span class="form-label" style="margin-bottom:0; display:flex; align-items:center; gap:8px; font-size:14px;">
                    🏐 Campo Virtual - Set <span style="color:white; font-weight:bold;" id="court-set-label">${e.setActual}</span> 
                    <span style="background: var(--accent-primary); color: #000; padding: 2px 8px; border-radius: 12px; font-weight: 800; font-size: 13px;" id="court-rot-label">R${e.rotacionActual}</span>
                </span>
                <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                    <button class="btn btn-sm btn-secondary" id="btn-cambio-jugador" title="Registrar un cambio / sustitución" style="padding: 4px 8px; font-size: 11px; background: #334155; color: white;">🔄 Cambio</button>
                    <button class="btn btn-sm btn-secondary" id="btn-edit-lineup-set" title="Configurar titulares de este set" style="padding: 4px 8px; font-size: 11px;">⚙️ Titulares</button>
                    <button class="btn btn-sm btn-secondary" id="btn-rotar-prev" title="Rotar atrás (-1)" style="padding: 4px 8px; font-size: 11px;">↺ -1</button>
                    <button class="btn btn-sm btn-secondary" id="btn-rotar-next" title="Rotar adelante (+1)" style="padding: 4px 8px; font-size: 11px;">↻ +1</button>
                </div>
            </div>
            <div class="volleyball-court-visual" style="background: linear-gradient(180deg, #1e3a8a 0%, #172554 100%); border: 3px solid #3b82f6; border-radius: 12px; padding: 16px 12px; position: relative; box-shadow: inset 0 0 25px rgba(0,0,0,0.5); min-height: 220px; display: flex; flex-direction: column; justify-content: space-around;">
                <!-- Red en la parte superior -->
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 6px; background: repeating-linear-gradient(90deg, #ffffff, #ffffff 12px, #ef4444 12px, #ef4444 24px); border-radius: 9px 9px 0 0; opacity: 0.9;" title="Red"></div>
                <div style="position: absolute; top: 8px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: bold; color: rgba(255,255,255,0.4); letter-spacing: 2px;">RED</div>
                
                <!-- Línea de 3 metros -->
                <div style="position: absolute; top: 48%; left: 0; right: 0; border-top: 2px dashed rgba(255, 255, 255, 0.35); pointer-events: none;"></div>
                <span style="position: absolute; top: 48%; right: 8px; font-size: 10px; color: rgba(255,255,255,0.4); transform: translateY(-120%); pointer-events: none; font-weight: 600;">Línea 3m</span>

                <!-- Fila Delantera: P4, P3, P2 -->
                <div style="display: flex; justify-content: space-around; align-items: center; z-index: 2; margin-top: 16px;" id="court-row-front">
                    ${R(4)}
                    ${R(3)}
                    ${R(2)}
                </div>

                <!-- Fila Trasera: P5, P6, P1 -->
                <div style="display: flex; justify-content: space-around; align-items: center; z-index: 2; margin-bottom: 6px;" id="court-row-back">
                    ${R(5)}
                    ${R(6)}
                    ${R(1)}
                </div>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 8px;">
                💡 Haz clic en cualquier jugador de la cancha para seleccionarlo. Rotación automática al ganar punto al resto (Side-Out).
            </div>
        </div>
    `}function R(o){var l;const i=((l=e.rotacionesIniciales)==null?void 0:l[e.setActual])||{},s=(o-1+e.rotacionActual-1)%6+1,a=i[s],n=a!==void 0?e.roster.find(u=>u.dorsal==a):null,t=e.dorsalSeleccionado==a&&a!==void 0;return`
        <div class="court-player-circle ${t?"selected":""}" data-dorsal="${a!==void 0?a:""}" title="${n?`#${a} - ${n.nombre||""} ${n.apellidos||""} (${n.posicion||""})`:"Titular sin fijar"}" style="width: 52px; height: 52px; border-radius: 50%; background: ${t?"var(--accent-primary)":"rgba(15, 23, 42, 0.95)"}; border: 2px solid ${t?"#ffffff":o===1?"#60a5fa":"#475569"}; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; position: relative; box-shadow: 0 3px 8px rgba(0,0,0,0.5); transform: ${t?"scale(1.08)":"scale(1)"};">
            <span style="position: absolute; top: -7px; left: 50%; transform: translateX(-50%); background: #0f172a; border: 1px solid ${o===1?"#3b82f6":"#334155"}; font-size: 9px; padding: 0px 5px; border-radius: 8px; font-weight: bold; color: ${o===1?"#60a5fa":"#cbd5e1"}; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.4);">
                P${o}${o===1&&e.equipoAlSaque==="local"?" 🏐":""}
            </span>
            <span style="font-size: 15px; font-weight: 900; color: #ffffff; line-height: 1; margin-top: 4px;">
                ${a!==void 0?`#${a}`:"—"}
            </span>
            <span style="font-size: 9px; color: ${t?"#ffffff":"#94a3b8"}; max-width: 48px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; font-weight: 500;">
                ${n?n.apellidos||n.nombre||"D"+a:"Fijar"}
            </span>
        </div>
    `}function Oe(o,i=e.rotacionActual){var n;const s=((n=e.rotacionesIniciales)==null?void 0:n[e.setActual])||{},a=Number(o);if(!Number.isFinite(a))return null;for(let t=1;t<=6;t++){const l=(t-1+i-1)%6+1;if(Number(s[l])===a)return t}return null}function Se(){document.querySelectorAll(".court-player-circle").forEach(o=>{o.addEventListener("click",()=>{const i=o.dataset.dorsal;if(i!==""&&i!==void 0){const s=parseInt(i,10);e.dorsalSeleccionado=s,A()}else le()})})}async function pe(o){let i=e.roster.find(n=>n.dorsal===o);if(i)return i;let s=null;if(e.partido.equipo_id){const t=(await window.apiPista.getJugadoresByEquipo(e.partido.equipo_id)).find(l=>l.dorsal===o);if(t)s=t.id;else{const l=await window.apiPista.createJugadorPista({equipo_id:e.partido.equipo_id,dorsal:o,nombre:"Jugador",apellidos:`#${o}`,posicion:"",es_libero:0});l&&l.lastInsertRowid&&(s=l.lastInsertRowid)}}await window.apiPista.addRosterJugador({partido_id:e.partidoId,dorsal:o,nombre:"Jugador",apellidos:`#${o}`,posicion:"",es_libero:0,jugador_pista_id:s}),e.roster=await window.apiPista.getRoster(e.partidoId);const a=document.getElementById("dorsal-grid");return a&&(a.innerHTML=qe()),e.roster.find(n=>n.dorsal===o)}function le(){var n;const o=document.getElementById("modal-lineup-set");if(!o)return;document.getElementById("lineup-modal-title").textContent=`🏐 Titulares y Rotación - Set ${e.setActual}`;const i=e.roster.map(t=>`<option value="${t.dorsal}">#${t.dorsal} - ${t.nombre||""} ${t.apellidos||""} (${t.posicion||"Jug."})</option>`).join(""),s=document.getElementById("roster-dorsals-list");s&&(s.innerHTML=i);const a=((n=e.rotacionesIniciales)==null?void 0:n[e.setActual])||{};document.querySelectorAll(".lineup-input").forEach(t=>{const l=t.dataset.pos;a[l]!==void 0?t.value=a[l]:t.value=""}),o.style.display="flex",e.wizardModalAbierto=!0}function Fe(){var t;const o=document.getElementById("modal-cambio-jugador");if(!o)return;const i=((t=e.rotacionesIniciales)==null?void 0:t[e.setActual])||{},s=document.getElementById("cambio-sale"),a=document.getElementById("banquillo-dorsals-list"),n=document.getElementById("cambio-entra");if(n&&(n.value=""),s&&(s.innerHTML=[1,2,3,4,5,6].map(l=>{const u=(l-1+e.rotacionActual-1)%6+1,r=i[u],c=r!==void 0?e.roster.find(m=>m.dorsal==r):null;return`<option value="${u}" data-dorsal="${r!==void 0?r:""}">P${l} - #${r!==void 0?r:"?"} ${c?(c.nombre||"")+" "+(c.apellidos||""):""}</option>`}).join("")),a){const l=Object.values(i),u=e.roster.filter(r=>!l.includes(r.dorsal));a.innerHTML=u.map(r=>`<option value="${r.dorsal}">#${r.dorsal} - ${r.nombre||""} ${r.apellidos||""} (${r.posicion||"Jug."})</option>`).join("")}o.style.display="flex",e.wizardModalAbierto=!0}function me(o){if(!o||!o.posicion)return!1;const i=o.posicion.trim().toLowerCase();return i==="líbero"||i==="libero"||i==="l"}function Le(){var i;const o=((i=e==null?void 0:e.rotacionesIniciales)==null?void 0:i[e==null?void 0:e.setActual])||{};return Object.values(o).map(s=>parseInt(s,10)).filter(s=>!isNaN(s))}function _e(){return e.roster.filter(o=>me(o))}function qe(){const o=Le(),i=_e(),s=o.length>0?e.roster.filter(t=>o.includes(t.dorsal)&&!me(t)):e.roster.filter(t=>!me(t)),a=i.filter(t=>!s.some(l=>l.dorsal===t.dorsal));let n="";return s.length>0?n+=s.map(t=>`
            <button class="dorsal-btn ${e.dorsalSeleccionado===t.dorsal?"active":""}" data-dorsal="${t.dorsal}" style="padding:8px; border-radius:6px; background:#1e293b; border:1px solid #334155; color:white; cursor:pointer; display:flex; flex-direction:column; align-items:center; transition:0.2s;">
                <span style="font-size:1.2rem; font-weight:bold; color:var(--accent);">${t.dorsal}</span>
                <span style="font-size:0.7rem; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center;">${t.apellidos||t.nombre}</span>
            </button>
        `).join(""):n+='<p style="color:var(--text-muted); font-size:12px; grid-column: 1 / -1;">Configura los titulares de este set...</p>',a.length>0&&(n+=a.map(t=>`
            <button class="dorsal-btn dorsal-libero ${e.dorsalSeleccionado===t.dorsal?"active":""}" data-dorsal="${t.dorsal}" style="padding:8px; border-radius:6px; background:#78350f; border:2px solid #f59e0b; color:white; cursor:pointer; display:flex; flex-direction:column; align-items:center; transition:0.2s;">
                <span style="font-size:1.2rem; font-weight:bold; color:#fef08a;">${t.dorsal}</span>
                <span style="font-size:0.7rem; color:#fde68a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center;">${t.apellidos||t.nombre} (L)</span>
            </button>
        `).join("")),n}function Re(){return!e.tipoAccion||!Z[e.tipoAccion]?"":Z[e.tipoAccion].map(o=>`
        <button class="subtype-btn ${e.subtipo===o.label?"selected":""}" data-sub="${o.label}">
            ${o.label}
            ${o.key?`<span class="shortcut-hint">${o.key}</span>`:""}
        </button>
    `).join("")}function ze(){return e.tipoAccion?(Me[e.tipoAccion]||[]).map(i=>{const s=se[i];if(!s)return"";let a=s.label;return(e.tipoAccion==="recepcion"||e.tipoAccion==="defensa")&&i==="#"&&(a="Doble Positiva"),(e.tipoAccion==="recepcion"||e.tipoAccion==="defensa")&&i==="/"&&(a="Balón regalado"),`
        <button class="res-btn ${s.class}" data-res="${i}" style="flex:1; padding:10px; font-weight:bold; border:1px solid #334155; border-radius:6px; background:#0f172a; color:white; cursor:pointer;">
            ${s.icon} ${a}
            ${s.shortcut?`<span class="shortcut-hint" style="display:block; font-size:10px; font-weight:normal; margin-top:4px;">${s.shortcut}</span>`:""}
        </button>
        `}).join(""):""}function Je(){return`
        <!-- Modal Edición Acción -->
        <div class="attack-modal" id="edit-action-modal" style="display: none;">
            <div class="notes-modal-content" style="max-width: 400px;">
                <div class="notes-header"><h3>✏️ Editar Acción</h3><button id="btn-close-edit" class="btn btn-sm btn-secondary">✖</button></div>
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                    <label>Dorsal</label><input type="number" id="edit-dorsal" class="form-input">
                    <label>Tipo de Acción</label>
                    <select id="edit-tipo" class="form-input">
                        ${Object.keys(T).filter(o=>o!=="cambio").map(o=>`<option value="${o}">${T[o].label}</option>`).join("")}
                    </select>
                    <label>Tiempo de vídeo (segundos)</label>
                    <input type="number" id="edit-tiempo" class="form-input" min="0" step="0.01" placeholder="0.00">
                    <label>Resultado</label>
                    <select id="edit-resultado" class="form-input">
                        ${Object.keys(se).map(o=>`<option value="${o}">${se[o].label}</option>`).join("")}
                    </select>
                </div>
                <div class="notes-footer"><button id="btn-save-edit" class="btn btn-primary">💾 Guardar</button></div>
            </div>
        </div>

        <!-- Modal Seleccionar Rotación -->
        <div class="attack-modal floating-modal" id="rotacion-modal" style="display: none;">
            <div class="notes-modal-content" style="max-width: 380px; text-align: center;">
                <div class="notes-header">
                    <h3>🔄 Rotación del Equipo</h3>
                    <button id="btn-close-rotacion" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <p id="rotacion-modal-subtitle" style="font-size: 13px; color: var(--text-muted); margin: 12px 16px;">Selecciona en qué rotación (1 a 6) se encuentra tu equipo en la cancha:</p>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 16px;">
                    ${[1,2,3,4,5,6].map(o=>`
                        <button class="btn btn-secondary btn-select-rotacion" data-rot="${o}" style="padding: 18px; font-size: 20px; font-weight: 800; background: #1e293b; border: 2px solid #334155; color: white; border-radius: 8px; cursor: pointer; transition: 0.2s;">
                            R${o}
                        </button>
                    `).join("")}
                </div>
            </div>
        </div>

        <!-- Modal Notas del Partido -->
        <div class="attack-modal" id="notes-modal" style="display: none;">
            <div class="notes-modal-content" style="max-width: 500px;">
                <div class="notes-header">
                    <h3>📝 Notas del Partido</h3>
                    <button id="btn-close-notes" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px;">
                    <textarea id="partido-notas-text" class="form-input" rows="6" placeholder="Escribe aquí observaciones estratégicas, incidencias del partido..." style="width: 100%; background: #0f172a; color: white; border: 1px solid #334155; padding: 12px; border-radius: 6px; font-family: sans-serif; font-size: 14px; resize: vertical;">${e.partido.notas||""}</textarea>
                </div>
                <div class="notes-footer">
                    <button id="btn-save-notes" class="btn btn-primary" style="width: 100%;">💾 Guardar Notas</button>
                </div>
            </div>
        </div>

        <!-- Modal Rotación Inicial del Set -->
        <div class="attack-modal floating-modal" id="modal-lineup-set" style="display: none;">
            <div class="notes-modal-content" style="max-width: 480px;">
                <div class="notes-header">
                    <h3 id="lineup-modal-title">🏐 Titulares y Rotación - Set 1</h3>
                    <button id="btn-close-lineup" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px;">
                    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                        Escribe o selecciona el dorsal en cada una de las 6 posiciones para este set. Si escribes un dorsal nuevo, se creará automáticamente como jugador.
                    </p>
                    <datalist id="roster-dorsals-list"></datalist>
                    <div style="background: #0f172a; border: 2px solid #334155; border-radius: 10px; padding: 14px; position: relative;">
                        <!-- Red -->
                        <div style="text-align: center; background: #ef4444; color: white; font-weight: bold; font-size: 11px; padding: 2px; border-radius: 4px; margin-bottom: 12px;">RED</div>
                        
                        <!-- Delanteros (P4, P3, P2) -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;">
                            <div style="background: #1e293b; padding: 8px; border-radius: 6px; text-align: center;">
                                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: bold;">P4 (Del. Izq)</label>
                                <input type="number" min="0" max="99" class="form-input lineup-input" data-pos="4" list="roster-dorsals-list" placeholder="Nº" style="width: 100%; padding: 6px; font-weight: bold; text-align: center; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px;">
                            </div>
                            <div style="background: #1e293b; padding: 8px; border-radius: 6px; text-align: center;">
                                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: bold;">P3 (Del. Centro)</label>
                                <input type="number" min="0" max="99" class="form-input lineup-input" data-pos="3" list="roster-dorsals-list" placeholder="Nº" style="width: 100%; padding: 6px; font-weight: bold; text-align: center; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px;">
                            </div>
                            <div style="background: #1e293b; padding: 8px; border-radius: 6px; text-align: center;">
                                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: bold;">P2 (Del. Der)</label>
                                <input type="number" min="0" max="99" class="form-input lineup-input" data-pos="2" list="roster-dorsals-list" placeholder="Nº" style="width: 100%; padding: 6px; font-weight: bold; text-align: center; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px;">
                            </div>
                        </div>

                        <!-- Línea de 3m -->
                        <div style="border-top: 1px dashed #475569; margin: 10px 0; text-align: center;"><span style="font-size: 9px; color: #64748b; background: #0f172a; padding: 0 8px;">Línea 3 metros</span></div>

                        <!-- Zagueros (P5, P6, P1) -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px;">
                            <div style="background: #1e293b; padding: 8px; border-radius: 6px; text-align: center;">
                                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: bold;">P5 (Zag. Izq)</label>
                                <input type="number" min="0" max="99" class="form-input lineup-input" data-pos="5" list="roster-dorsals-list" placeholder="Nº" style="width: 100%; padding: 6px; font-weight: bold; text-align: center; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px;">
                            </div>
                            <div style="background: #1e293b; padding: 8px; border-radius: 6px; text-align: center;">
                                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: bold;">P6 (Zag. Centro)</label>
                                <input type="number" min="0" max="99" class="form-input lineup-input" data-pos="6" list="roster-dorsals-list" placeholder="Nº" style="width: 100%; padding: 6px; font-weight: bold; text-align: center; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px;">
                            </div>
                            <div style="background: rgba(59, 130, 246, 0.15); border: 1px solid #3b82f6; padding: 8px; border-radius: 6px; text-align: center;">
                                <label style="font-size: 11px; color: #60a5fa; display: block; margin-bottom: 4px; font-weight: bold;">P1 (Saque 🏐)</label>
                                <input type="number" min="0" max="99" class="form-input lineup-input" data-pos="1" list="roster-dorsals-list" placeholder="Nº" style="width: 100%; padding: 6px; font-weight: bold; text-align: center; background: #0f172a; color: white; border: 1px solid #3b82f6; border-radius: 4px;">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="notes-footer">
                    <button id="btn-save-lineup" class="btn btn-primary" style="width: 100%;">💾 Confirmar Titulares del Set</button>
                </div>
            </div>
        </div>

        <!-- Modal Cambio / Sustitución de Jugador -->
        <div class="attack-modal" id="modal-cambio-jugador" style="display: none;">
            <div class="notes-modal-content" style="max-width: 450px;">
                <div class="notes-header">
                    <h3>🔄 Sustitución de Jugador</h3>
                    <button id="btn-close-cambio" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px; color: #f87171; font-weight: bold;">🔴 Jugador que SALE (en pista)</label>
                        <select id="cambio-sale" class="form-input" style="width: 100%; padding: 8px; font-size: 14px; font-weight: bold;">
                        </select>
                    </div>
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px; color: #4ade80; font-weight: bold;">🟢 Jugador que ENTRA (dorsal del banquillo o nuevo)</label>
                        <input type="number" min="0" max="99" id="cambio-entra" class="form-input" list="banquillo-dorsals-list" placeholder="Escribe o selecciona dorsal..." style="width: 100%; padding: 8px; font-size: 14px; font-weight: bold; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 6px;">
                        <datalist id="banquillo-dorsals-list"></datalist>
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); background: rgba(255,255,255,0.03); padding: 10px; border-radius: 6px; border: 1px solid var(--border);">
                        ℹ️ Si introduces un dorsal que no existe en la plantilla, se creará de forma automática en el equipo y en el partido.
                    </div>
                </div>
                <div class="notes-footer">
                    <button id="btn-save-cambio" class="btn btn-primary" style="width: 100%;">✅ Confirmar Cambio</button>
                </div>
            </div>
        </div>

        <!-- Modal Ajustes del Partido -->
        <div class="attack-modal" id="modal-ajustes-partido" style="display: none;">
            <div class="notes-modal-content" style="max-width: 500px;">
                <div class="notes-header">
                    <h3>⚙️ Ajustes del Partido</h3>
                    <button id="btn-close-ajustes" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Torneo / Competición</label>
                        <input type="text" id="ajustes-torneo" class="form-input" value="${e.partido.torneo||""}" style="width: 100%;">
                    </div>
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Fase / Jornada</label>
                        <input type="text" id="ajustes-fase" class="form-input" value="${e.partido.fase||""}" style="width: 100%;">
                    </div>
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Origen del Vídeo</label>
                        <div style="display: flex; gap: 16px; margin-top: 6px;">
                            <label style="color: white; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                                <input type="radio" name="ajustes-video-tipo" value="youtube"> YouTube
                            </label>
                            <label style="color: white; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                                <input type="radio" name="ajustes-video-tipo" value="local"> Archivo Local
                            </label>
                            <label style="color: white; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                                <input type="radio" name="ajustes-video-tipo" value="ninguno"> Sin vídeo
                            </label>
                        </div>
                    </div>
                    <div id="ajustes-group-youtube" style="display: none;">
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Enlace de YouTube</label>
                        <input type="text" id="ajustes-youtube-url" class="form-input" placeholder="https://www.youtube.com/watch?v=..." style="width: 100%;">
                    </div>
                    <div id="ajustes-group-local" style="display: none;">
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Archivo de Vídeo Local</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="ajustes-local-path" class="form-input" readonly style="flex: 1; background: #0f172a; color: #94a3b8; cursor: not-allowed; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <button class="btn btn-secondary" id="btn-ajustes-elegir-local" type="button">Seleccionar...</button>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border); margin-top: 4px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-primary); font-weight: 500; margin-bottom: 0; font-size: 13px;">
                            <input type="checkbox" id="ajustes-llevar-rotaciones" ${e.partido.llevar_rotaciones?"checked":""} style="width: 16px; height: 16px;">
                            🔄 Llevar control de rotaciones y posiciones
                        </label>
                    </div>
                </div>
                <div class="notes-footer">
                    <button id="btn-save-ajustes" class="btn btn-primary" style="width: 100%;">💾 Guardar Cambios</button>
                </div>
            </div>
        </div>

        <!-- Modal Generador de Vídeos -->
        <div class="attack-modal" id="videos-modal" style="display: none;">
            <div class="notes-modal-content" style="max-width: 500px;">
                <div class="notes-header">
                    <h3>🎬 Generador de Vídeos</h3>
                    <button id="btn-close-videos" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Modo de Generación</label>
                        <select id="vid-generar-modo" class="form-input pista-select" style="width: 100%;">
                            <option value="filtrar">Filtrar jugadas específicas por jugador/acción</option>
                            <option value="puntos_ataques">Punto completo cuando ataque un jugador</option>
                            <option value="favoritos">Sólo jugadas marcadas como Favoritas ⭐</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Plantilla rápida</label>
                        <select id="vid-plantilla" class="form-input pista-select" style="width:100%;">
                            <option value="">Configurar manualmente</option>
                            <option value="ataques-jugador">Puntos completos de ataques de un jugador</option>
                            <option value="saques">Todos los saques de un jugador</option>
                            <option value="recepciones">Todas las recepciones de un jugador</option>
                            <option value="favoritos">Rallies favoritos</option>
                        </select>
                    </div>
                    
                    <div id="vid-filtros-container" style="display: flex; flex-direction: column; gap: 12px;">
                        <div style="display: flex; gap: 12px;">
                            <div style="flex: 1;">
                                <label for="vid-dorsal" class="form-label" style="display:block; margin-bottom: 4px;">Jugador / Dorsal</label>
                                <select id="vid-dorsal" class="form-input pista-select" style="width: 100%;">
                                    <option value="">Todos los jugadores</option>
                                    ${e.roster.map(o=>`<option value="${o.dorsal}">#${o.dorsal} - ${o.apellidos||o.nombre}</option>`).join("")}
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label class="form-label" style="display:block; margin-bottom: 4px;">Tipo de Acción</label>
                                <select id="vid-accion" class="form-input pista-select" style="width: 100%;">
                                    <option value="">Cualquier acción</option>
                                    ${Object.entries(T).filter(([o])=>o!=="cambio").map(([o,i])=>`<option value="${o}">${i.label}</option>`).join("")}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="form-label" style="display:block; margin-bottom: 4px;">Set</label>
                            <select id="vid-set" class="form-input pista-select" style="width: 100%;">
                                <option value="">Todos los sets</option>
                                ${[1,2,3,4,5].map(o=>`<option value="${o}">Set ${o}</option>`).join("")}
                            </select>
                        </div>
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <div style="flex: 1;">
                            <label class="form-label" style="display:block; margin-bottom: 4px;">Segundos Pre-jugada</label>
                            <input type="number" id="vid-margin-pre" class="form-input" value="3" min="1" max="10" style="width: 100%;">
                        </div>
                        <div style="flex: 1;">
                            <label class="form-label" style="display:block; margin-bottom: 4px;">Segundos Post-jugada</label>
                            <input type="number" id="vid-margin-post" class="form-input" value="2" min="1" max="10" style="width: 100%;">
                        </div>
                    </div>

                    <div id="vid-progress-container" style="display: none; margin-top: 8px;">
                        <div style="background: #1e293b; border-radius: 4px; height: 16px; overflow: hidden; border: 1px solid #334155;">
                            <div id="vid-progress-bar" style="background: var(--accent-primary); width: 0%; height: 100%; transition: width 0.3s;"></div>
                        </div>
                        <div id="vid-progress-text" style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 4px;">0%</div>
                    </div>
                    <div id="vid-preview" style="display:none; border:1px solid var(--border); border-radius:8px; padding:10px; background:rgba(15,23,42,.45);"></div>
                    <button id="btn-previsualizar-videos" class="btn btn-secondary" type="button" style="width:100%;">▶ Previsualizar selección</button>
                </div>
                <div class="notes-footer">
                    <button id="btn-generar-videos-run" class="btn btn-primary" style="width: 100%;">🚀 Exportar Vídeo Resumen</button>
                </div>
            </div>
        </div>
    `}function He(){const{partido:o}=e;return!o||!o.video_url||o.video_tipo==="ninguno"?'<div class="video-placeholder"><p>Sin vídeo</p></div>':o.video_tipo==="youtube"?(ke(o.video_url),`
            <div class="video-placeholder" id="yt-choice-container" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:20px; text-align:center;">
                <div style="font-size: 32px;">📺</div>
                <div style="font-weight: bold; color: white; font-size: 16px;">Vídeo de YouTube Detectado</div>
                <p style="font-size: 12px; color: var(--text-muted); max-width: 320px;">
                    ¿Cómo prefieres reproducir este vídeo para la sesión de scouting?
                </p>
                <div style="display:flex; gap:10px; margin-top:8px; flex-wrap:wrap; justify-content:center;">
                    <button id="btn-yt-iframe" class="btn btn-primary" style="padding:8px 16px; font-size:13px; display:flex; align-items:center; gap:6px;">
                        🔴 Ver con Iframe (Streaming Directo)
                    </button>
                    <button id="btn-yt-download" class="btn btn-secondary" style="padding:8px 16px; font-size:13px; display:flex; align-items:center; gap:6px;">
                        ⬇️ Descargar y Ver Localmente (Offline)
                    </button>
                </div>
                <div id="yt-progress-bar-wrap" style="width:80%;height:4px;background:rgba(255,255,255,0.15);border-radius:4px;margin-top:12px;overflow:hidden;display:none;">
                    <div id="yt-progress-bar-inner" style="height:100%;width:0%;background:var(--accent);transition:width 0.3s;"></div>
                </div>
                <p id="yt-status-msg" style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display:none;"></p>
                <div id="whistle-progress-wrap" style="width:80%; height:5px; background:rgba(255,255,255,.15); border-radius:4px; overflow:hidden; display:none;"><div id="whistle-progress-bar" style="width:0%; height:100%; background:var(--accent-primary); transition:width .2s;"></div></div>
            </div>
        `):`
        <video id="local-video" preload="metadata"><source src="${o.video_url.startsWith("http")?o.video_url:`local-video://video?path=${encodeURIComponent(o.video_url)}`}"></video>
        <div class="video-controls" id="video-controls">
            <button id="btn-play-pause">▶</button>
            <div class="video-progress" id="video-progress"><div class="video-progress-bar" id="video-progress-bar"></div></div>
            <span class="video-time" id="video-time">00:00 / 00:00</span>
            <div style="display:flex; align-items:center; gap:2px; margin-left:8px; margin-right:8px;">
                <button id="btn-speed-down" style="background:transparent; border:none; color:white; cursor:pointer;" title="Reducir Velocidad">-</button>
                <span class="speed-indicator" id="speed-indicator" style="min-width:30px; text-align:center;">1x</span>
                <button id="btn-speed-up" style="background:transparent; border:none; color:white; cursor:pointer;" title="Aumentar Velocidad">+</button>
            </div>
        </div>
    `}function be(){const o=document.getElementById("local-video");if(o){o.paused?o.play():o.pause();return}const i=document.getElementById("yt-iframe-player");i&&(ue===1?i.contentWindow.postMessage(JSON.stringify({event:"command",func:"pauseVideo",args:[]}),"*"):i.contentWindow.postMessage(JSON.stringify({event:"command",func:"playVideo",args:[]}),"*"))}function U(o){const i=document.getElementById("local-video");if(i){const a=Number.isFinite(i.currentTime)?i.currentTime:0,n=Number.isFinite(i.duration)&&i.duration>0?i.duration:null;let t=a+o;n!==null&&(t=Math.min(n,t)),i.currentTime=Math.max(0,t);return}const s=document.getElementById("yt-iframe-player");if(s){const a=ae+o;s.contentWindow.postMessage(JSON.stringify({event:"command",func:"seekTo",args:[Math.max(0,a),!0]}),"*")}}function Te(o){const i=document.getElementById("yt-iframe-player");if(i){i.contentWindow.postMessage(JSON.stringify({event:"command",func:"seekTo",args:[o,!0]}),"*"),i.contentWindow.postMessage(JSON.stringify({event:"command",func:"playVideo",args:[]}),"*"),v(`Saltando a ${N(o)} en YouTube Stream`,"info");return}const s=document.getElementById("local-video");s&&Number.isFinite(o)&&(s.currentTime=Math.max(0,o),s.play().catch(()=>{}),v(`Saltando a ${N(o)}`,"info"))}function ce(){const o=document.getElementById("local-video");return o?o.currentTime:document.getElementById("yt-iframe-player")?(Y||Be(),ae||0):0}function Ae(o){const i=document.getElementById("local-video");if(i){e.videoSpeed=Math.max(.25,Math.min(4,(e.videoSpeed||1)+o)),i.playbackRate=e.videoSpeed;const a=document.getElementById("speed-indicator");a&&(a.textContent=`${e.videoSpeed}x`),v(`Velocidad: ${e.videoSpeed}x`,"info");return}const s=document.getElementById("yt-iframe-player");if(s){e.videoSpeed=Math.max(.25,Math.min(4,(e.videoSpeed||1)+o)),s.contentWindow.postMessage(JSON.stringify({event:"command",func:"setPlaybackRate",args:[e.videoSpeed]}),"*");const a=document.getElementById("speed-indicator");a&&(a.textContent=`${e.videoSpeed}x`),v(`Velocidad: ${e.videoSpeed}x`,"info")}}function Ce(o){const i=document.getElementById("btn-yt-iframe"),s=document.getElementById("btn-yt-download");if(i&&s){i.addEventListener("click",()=>{var w;const b=ke(e.partido.video_url),y=document.getElementById("video-container");y&&b?((w=document.querySelector(".scouting-layout"))==null||w.classList.remove("youtube-choice-active"),y.innerHTML=`
                    <div style="position:relative; width:100%; height:100%; aspect-ratio:16/9; background:#000;">
                        <iframe id="yt-iframe-player" src="https://www.youtube.com/embed/${b}?autoplay=1&enablejsapi=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%; height:100%; border:none;"></iframe>
                    </div>
                `,v("Reproduciendo Streaming directo de YouTube","success"),Be()):v("URL de YouTube no válida","error")}),s.addEventListener("click",()=>{var b;(b=document.querySelector(".scouting-layout"))==null||b.classList.remove("youtube-choice-active"),v("Preparando vídeo y análisis local de silbatos…","info"),We()});return}const a=document.getElementById("local-video");if(!a)return;const n=document.getElementById("btn-play-pause"),t=document.getElementById("video-progress"),l=document.getElementById("video-progress-bar"),u=document.getElementById("video-time");a.addEventListener("timeupdate",()=>{if(!a.duration||!Number.isFinite(a.duration))return;const b=a.currentTime/a.duration*100;l.style.width=b+"%",u.textContent=`${N(a.currentTime)} / ${N(a.duration)}`}),a.addEventListener("play",()=>n.textContent="⏸"),a.addEventListener("pause",()=>n.textContent="▶"),n.addEventListener("click",()=>a.paused?a.play():a.pause()),t.addEventListener("click",b=>{if(!a||!Number.isFinite(a.duration)||a.duration<=0)return;const y=t.getBoundingClientRect(),w=Math.max(0,Math.min(1,(b.clientX-y.left)/y.width));a.currentTime=w*a.duration}),a.addEventListener("keydown",b=>{b.key===G("pista","video-backward")?(b.preventDefault(),U(-(J().videoSeekSeconds||5))):b.key===G("pista","video-forward")?(b.preventDefault(),U(J().videoSeekSeconds||5)):b.key===G("pista","video-play")&&(b.preventDefault(),be())});const r=document.getElementById("btn-speed-down"),c=document.getElementById("btn-speed-up"),m=document.getElementById("speed-indicator");r&&r.addEventListener("click",()=>Ae(-.25)),c&&c.addEventListener("click",()=>Ae(.25)),m&&(m.textContent=`${e.videoSpeed||1}x`),a.playbackRate=e.videoSpeed||1}async function We(o){var r,c,m,b;const i=document.getElementById("yt-status-msg"),s=document.getElementById("yt-progress-bar-wrap"),a=document.getElementById("yt-progress-bar-inner"),n=document.getElementById("whistle-progress-wrap"),t=document.getElementById("whistle-progress-bar"),l=document.getElementById("video-container");i&&(i.textContent="Iniciando descarga del vídeo...",i.style.display="block"),s&&(s.style.display="block"),a&&(a.style.width="0%");const u=((r=window.apiPista)==null?void 0:r.onYtProgress)||((c=window.api)==null?void 0:c.onYtProgress);u&&u(y=>{a&&y.percent!==void 0&&(a.style.width=`${Math.min(100,Math.max(0,y.percent))}%`),i&&y.text&&(i.textContent=`Descargando: ${y.text}`)});try{const y=await window.api.resolveYoutube(e.partido.video_url);if(a&&(a.style.width="100%"),i&&(i.textContent="Analizando silbatos localmente…"),n&&(n.style.display="block"),!window.api.analyzeWhistles||!window.api.onWhistleProgress)i&&(i.textContent="⚠️ Reinicia BVScouter para activar el análisis local de silbatos."),v("Reinicia la aplicación para activar el análisis de silbatos","warning");else{(b=(m=window.api).onWhistleProgress)==null||b.call(m,w=>{t&&(t.style.width=`${w.percent||0}%`)});try{const w=await window.api.analyzeWhistles(y);i&&(i.textContent=`✅ Análisis terminado: ${w.length} silbatos cargados`),t&&(t.style.width="100%"),v(`Análisis terminado: ${w.length} silbatos cargados`,"success")}catch(w){console.warn("No se pudo analizar los silbatos:",w),i&&(i.textContent="No se pudieron analizar los silbatos")}}l&&(l.innerHTML=`
                <video id="local-video" preload="metadata"><source src="${y}"></video>
                <div class="video-controls" id="video-controls">
                    <button id="btn-play-pause">▶</button>
                    <div class="video-progress" id="video-progress"><div class="video-progress-bar" id="video-progress-bar"></div></div>
                    <span class="video-time" id="video-time">00:00 / 00:00</span>
                    <div style="display:flex; align-items:center; gap:2px; margin-left:8px; margin-right:8px;">
                        <button id="btn-speed-down" style="background:transparent; border:none; color:white; cursor:pointer;" title="Reducir Velocidad">-</button>
                        <span class="speed-indicator" id="speed-indicator" style="min-width:30px; text-align:center;">1x</span>
                        <button id="btn-speed-up" style="background:transparent; border:none; color:white; cursor:pointer;" title="Aumentar Velocidad">+</button>
                    </div>
                </div>
            `,Ce(l),window.api.analyzeWhistles&&Pe(y))}catch(y){i&&(i.textContent=`Error al descargar: ${y.message}`),a&&(a.style.width="0%",a.style.background="#f44")}}function Ge(){const o=document.getElementById("resize-handle-video"),i=document.getElementById("resize-handle-timeline");if(!o&&!i)return;function s(a,n,t){if(!a)return;let l=0,u=0,r=0,c=null,m=null;const b=S=>{S.preventDefault(),c=document.getElementById(n),m=document.getElementById(t),!(!c||!m)&&(l=S.clientY,u=c.getBoundingClientRect().height,r=m.getBoundingClientRect().height,c.style.height=u+"px",c.style.flex="0 0 auto",m.style.height=r+"px",m.style.flex="0 0 auto",a.classList.add("active"),document.body.style.cursor="ns-resize",document.body.style.userSelect="none",document.addEventListener("mousemove",y),document.addEventListener("mouseup",w))},y=S=>{const L=S.clientY-l,_=Math.max(60,u+L),d=Math.max(60,r-L);c.style.height=_+"px",m.style.height=d+"px"},w=()=>{a.classList.remove("active"),document.body.style.cursor="",document.body.style.userSelect="",document.removeEventListener("mousemove",y),document.removeEventListener("mouseup",w)};a.addEventListener("mousedown",b)}s(o,"video-container","timeline-container"),s(i,"timeline-container","live-stats")}function Ye(o){var t,l,u,r,c,m,b,y,w,S,L,_;o.addEventListener("click",d=>{const h=d.target.closest("button");h&&h.blur()}),(t=document.getElementById("btn-iniciar-rotacion-banner"))==null||t.addEventListener("click",()=>{le()}),document.getElementById("dorsal-grid").addEventListener("click",d=>{const h=d.target.closest(".dorsal-btn");h&&(e.dorsalSeleccionado=parseInt(h.dataset.dorsal),A())}),document.getElementById("action-buttons").addEventListener("click",d=>{const h=d.target.closest(".action-btn");h&&(e.tipoAccion=h.dataset.action,e.subtipo=null,A())});const a=document.getElementById("subtype-buttons");a&&a.addEventListener("click",d=>{const h=d.target.closest(".subtype-btn");h&&(e.subtipo=h.dataset.sub,A())});const n=document.getElementById("resultado-buttons");n&&n.addEventListener("click",d=>{const h=d.target.closest(".res-btn");if(h){e.dorsalInput&&(clearTimeout(e.dorsalTimer),e.dorsalSeleccionado=parseInt(e.dorsalInput,10),e.dorsalInput="");const D=h.dataset.res;F(D)}}),document.getElementById("btn-rotar").addEventListener("click",d=>{d.stopPropagation(),e.rotacionActual=e.rotacionActual>=6?1:e.rotacionActual+1,A()}),(l=document.getElementById("box-rotacion"))==null||l.addEventListener("click",()=>{e.partido.llevar_rotaciones?le():(document.getElementById("rotacion-modal").style.display="flex",e.wizardModalAbierto=!0)}),(u=document.getElementById("btn-cambio-jugador"))==null||u.addEventListener("click",()=>{if(M()){v("⚠️ Primero debes configurar la rotación y titulares del set","warning");return}Fe()}),(r=document.getElementById("btn-edit-lineup-set"))==null||r.addEventListener("click",()=>le()),(c=document.getElementById("btn-rotar-prev"))==null||c.addEventListener("click",()=>{e.rotacionActual=e.rotacionActual<=1?6:e.rotacionActual-1,A()}),(m=document.getElementById("btn-rotar-next"))==null||m.addEventListener("click",()=>{e.rotacionActual=e.rotacionActual>=6?1:e.rotacionActual+1,A()}),Se(),document.getElementById("score-local").addEventListener("click",d=>re("local",1)),document.getElementById("score-local").addEventListener("contextmenu",d=>{d.preventDefault(),re("local",-1)}),document.getElementById("score-rival").addEventListener("click",d=>re("rival",1)),document.getElementById("score-rival").addEventListener("contextmenu",d=>{d.preventDefault(),re("rival",-1)}),document.getElementById("server-local").addEventListener("click",()=>{M()||(e.equipoAlSaque="local",A())}),document.getElementById("server-rival").addEventListener("click",()=>{M()||(e.equipoAlSaque="rival",A())}),(b=document.getElementById("btn-finalizar-set"))==null||b.addEventListener("click",async()=>{if(M()){v("⚠️ El set actual no ha sido iniciado (falta configurar rotación)","warning");return}if(e.marcadorLocal===e.marcadorRival){v("El marcador está empatado. Imposible finalizar set.","error");return}const d=e.marcadorLocal>e.marcadorRival,h=d?e.partido.equipo_nombre||"Local":e.partido.rival_nombre||"Rival";confirm(`¿Finalizar el Set ${e.setActual}?

Victoria para: ${h} (${e.marcadorLocal}-${e.marcadorRival})`)&&(await window.apiPista.createAccionPista({partido_id:e.partidoId,dorsal:0,rotacion:e.rotacionActual,tipo_accion:"fin_set",subtipo:"Ganador Set",resultado:d?"local":"rival",set_numero:e.setActual,marcador_local:e.marcadorLocal.toString(),marcador_rival:e.marcadorRival.toString(),video_timestamp:ce(),equipo_al_saque:e.equipoAlSaque}),e.setActual++,e.marcadorLocal=0,e.marcadorRival=0,await window.apiPista.updatePartidoPista(e.partidoId,{resultado:`${e.marcadorLocal}-${e.marcadorRival}`}),A(),z(),v(`Set finalizado. ¡Comienza el Set ${e.setActual}! Configura la rotación.`,"success"),e.partido.llevar_rotaciones?(e.rotacionActual=1,A()):(document.getElementById("rotacion-modal").style.display="flex",e.wizardModalAbierto=!0))}),(y=document.getElementById("btn-ver-informe"))==null||y.addEventListener("click",async()=>{await window.apiPista.updatePartidoPista(e.partidoId,{resultado:`${e.marcadorLocal}-${e.marcadorRival}`}),de(),j.navigate("informe-pista",{partidoId:e.partidoId})}),(w=document.getElementById("btn-notas-partido"))==null||w.addEventListener("click",()=>{document.getElementById("notes-modal").style.display="flex",e.wizardModalAbierto=!0}),(S=document.getElementById("btn-ajustes-partido"))==null||S.addEventListener("click",()=>{const d=e.partido;if(d){const h=document.getElementById("ajustes-torneo"),D=document.getElementById("ajustes-fase"),Q=document.getElementById("ajustes-llevar-rotaciones");h&&(h.value=d.torneo||""),D&&(D.value=d.fase||""),Q&&(Q.checked=!!d.llevar_rotaciones);const C=d.video_tipo||"ninguno",X=document.querySelector(`input[name="ajustes-video-tipo"][value="${C}"]`)||document.querySelector('input[name="ajustes-video-tipo"][value="ninguno"]');X&&(X.checked=!0);const K=document.getElementById("ajustes-group-youtube"),ee=document.getElementById("ajustes-group-local");K&&(K.style.display=C==="youtube"?"block":"none"),ee&&(ee.style.display=C==="local"?"block":"none");const V=document.getElementById("ajustes-youtube-url"),O=document.getElementById("ajustes-local-path");C==="youtube"&&V?V.value=d.video_url||"":V&&(V.value=""),C==="local"&&O?O.value=d.video_url||"":O&&(O.value="")}document.getElementById("modal-ajustes-partido").style.display="flex",e.wizardModalAbierto=!0}),(L=document.getElementById("btn-generador-videos"))==null||L.addEventListener("click",()=>{document.getElementById("videos-modal").style.display="flex",e.wizardModalAbierto=!0}),(_=document.getElementById("btn-guardar-partido"))==null||_.addEventListener("click",async()=>{await window.apiPista.updatePartidoPista(e.partidoId,{resultado:`${e.marcadorLocal}-${e.marcadorRival}`}),v("Partido guardado con éxito","success")}),document.getElementById("btn-undo").addEventListener("click",async()=>{if(e.acciones.length===0)return;await window.apiPista.undoLastAccionPista(e.partidoId),e.acciones.pop();const d=e.acciones[e.acciones.length-1];d?(e.marcadorLocal=d.marcador_local,e.marcadorRival=d.marcador_rival,e.setActual=d.set_numero,e.equipoAlSaque=d.equipo_al_saque,e.rotacionActual=d.rotacion):(e.marcadorLocal=0,e.marcadorRival=0),v("Acción deshecha","info"),A(),z()}),document.getElementById("btn-volver").addEventListener("click",()=>{de(),j.navigate("dashboard-pista")})}function de(){ie&&(document.removeEventListener("keydown",ie),ie=null),H&&(document.removeEventListener("keydown",H.down),document.removeEventListener("keyup",H.up),H=null),W&&(window.removeEventListener("message",W),W=null),Y&&(clearInterval(Y),Y=null)}async function re(o,i){if(M()){v(`⚠️ No puedes modificar el marcador en el Set ${e.setActual} hasta configurar la rotación inicial`,"warning");return}const s=parseInt(e.marcadorLocal||0,10),a=parseInt(e.marcadorRival||0,10),n=parseInt(i,10);o==="local"?e.marcadorLocal=Math.max(0,s+n):e.marcadorRival=Math.max(0,a+n),await window.apiPista.updatePartidoPista(e.partidoId,{resultado:`${e.marcadorLocal}-${e.marcadorRival}`}),A()}function A(){const o=M(),i=document.getElementById("stats-controls-container"),s=document.getElementById("rotation-pending-banner");if(i&&s){i.style.display=o?"none":"block",s.style.display=o?"block":"none";const d=document.getElementById("pending-set-num"),h=document.getElementById("pending-btn-set-num");d&&(d.textContent=e.setActual),h&&(h.textContent=e.setActual)}document.querySelectorAll(".dorsal-btn").forEach(d=>{d.classList.toggle("active",parseInt(d.dataset.dorsal)===e.dorsalSeleccionado)}),document.querySelectorAll(".action-btn").forEach(d=>{d.classList.toggle("selected",d.dataset.action===e.tipoAccion)});const a=document.getElementById("subtipo-container"),n=document.getElementById("subtype-buttons");a&&n&&(e.tipoAccion&&Z[e.tipoAccion]?(a.style.display="block",n.innerHTML=Re()):(a.style.display="none",e.subtipo=null));const t=document.getElementById("resultados-container"),l=document.getElementById("resultado-buttons");t&&l&&(e.tipoAccion?(t.style.display="block",l.innerHTML=ze()):t.style.display="none");let u=[];e.dorsalInput?u.push(`Dorsal: ${e.dorsalInput}...`):e.dorsalSeleccionado&&u.push(`#${e.dorsalSeleccionado}`),e.tipoAccion&&T[e.tipoAccion]&&u.push(T[e.tipoAccion].label),e.subtipo&&u.push(e.subtipo);const r=document.getElementById("current-action-text");r&&(r.textContent=u.join(" > ")||"Selecciona Dorsal...");const c=document.getElementById("set-label"),m=document.getElementById("score-local"),b=document.getElementById("score-rival"),y=document.getElementById("server-local"),w=document.getElementById("server-rival"),S=document.getElementById("label-rotacion");if(c&&(o?(c.textContent=`⏳ SET ${e.setActual} (NO INICIADO)`,c.style.color="#facc15",c.style.borderColor="#facc15",c.style.background="rgba(234, 179, 8, 0.15)"):(c.textContent=`SET ${e.setActual}`,c.style.color="",c.style.borderColor="",c.style.background="")),m&&(m.textContent=e.marcadorLocal,m.style.opacity=o?"0.4":"1",m.style.pointerEvents=o?"none":"auto"),b&&(b.textContent=e.marcadorRival,b.style.opacity=o?"0.4":"1",b.style.pointerEvents=o?"none":"auto"),y){const d=!o&&e.equipoAlSaque==="local";y.classList.toggle("active",d),y.style.opacity=o?"0.2":d?"1":"0.2",y.style.pointerEvents=o?"none":"auto"}if(w){const d=!o&&e.equipoAlSaque==="rival";w.classList.toggle("active",d),w.style.opacity=o?"0.2":d?"1":"0.2",w.style.pointerEvents=o?"none":"auto"}S&&(S.textContent="R"+e.rotacionActual);const L=document.getElementById("court-row-front"),_=document.getElementById("court-row-back");if(L&&_){const d=document.getElementById("court-set-label"),h=document.getElementById("court-rot-label");d&&(d.textContent=e.setActual),h&&(h.textContent="R"+e.rotacionActual),L.innerHTML=`${R(4)}${R(3)}${R(2)}`,_.innerHTML=`${R(5)}${R(6)}${R(1)}`,Se()}}async function F(o){if(M()){v(`⚠️ No puedes registrar stats en el Set ${e.setActual} hasta que configures la rotación inicial`,"warning");return}if(!e.tipoAccion){v("Falta seleccionar una acción","warning");return}if(!e.dorsalSeleccionado)if(e.tipoAccion==="rival"||e.tipoAccion==="error_general")e.dorsalSeleccionado=0;else{v("Falta seleccionar un dorsal","warning");return}const i=ce(),s=e.rotacionActual,a=e.marcadorLocal,n=e.marcadorRival;let t=null;e.tipoAccion==="rival"?o==="#"||e.subtipo==="Acierto Rival"?(t="rival",o="#",e.subtipo||(e.subtipo="Acierto Rival")):(o==="="||e.subtipo==="Error Rival")&&(t="local",o="=",e.subtipo||(e.subtipo="Error Rival")):e.tipoAccion==="error_general"?t="rival":o==="#"&&(e.tipoAccion==="ataque"||e.tipoAccion==="saque"||e.tipoAccion==="bloqueo")?t="local":(o==="="&&e.tipoAccion!=="rival"||o==="/"&&e.tipoAccion==="ataque")&&(t="rival"),t==="local"&&e.marcadorLocal++,t==="rival"&&e.marcadorRival++,t==="local"?(e.equipoAlSaque==="rival"&&(e.rotacionActual=e.rotacionActual===6?1:e.rotacionActual+1),e.equipoAlSaque="local"):t==="rival"?e.equipoAlSaque="rival":e.equipoAlSaque||(e.equipoAlSaque="local");let l=e.subtipo||"";const u=e.tipoAccion==="ataque"?Oe(e.dorsalSeleccionado,s):null;(u===5||u===6)&&!/zaguero/i.test(l)&&(l=l?`${l} · Zaguero`:"Zaguero");const c={partido_id:e.partidoId,set_numero:e.setActual,marcador_local:e.marcadorLocal,marcador_rival:e.marcadorRival,marcador_pre_local:a,marcador_pre_rival:n,dorsal:e.dorsalSeleccionado,rotacion:s,tipo_accion:e.tipoAccion,subtipo:l,resultado:o,equipo_al_saque:e.equipoAlSaque,video_timestamp:i};try{await window.apiPista.createAccionPista(c),await window.apiPista.updatePartidoPista(e.partidoId,{resultado:`${e.marcadorLocal}-${e.marcadorRival}`}),e.tipoAccion=null,e.subtipo=null,e.dorsalSeleccionado=null,e.acciones=await window.apiPista.getAccionesPista(e.partidoId),A(),z();const m=document.querySelector(".action-panel");m&&(m.classList.add("action-flash"),setTimeout(()=>m.classList.remove("action-flash"),400))}catch(m){v("Error al guardar: "+m.message,"error")}}async function $e(){const o=window.prompt("¿De qué equipo es el tiempo muerto? Escribe LOCAL o RIVAL:");if(o===null)return;const i=o.trim().toLowerCase();if(!["local","rival"].includes(i)){v("Escribe LOCAL o RIVAL para registrar el tiempo muerto","warning");return}try{await window.apiPista.createAccionPista({partido_id:e.partidoId,set_numero:e.setActual,marcador_local:e.marcadorLocal,marcador_rival:e.marcadorRival,dorsal:0,rotacion:e.rotacionActual,tipo_accion:"tiempo_muerto",subtipo:i==="local"?"Solicitado por Local":"Solicitado por Rival",resultado:"+",equipo_al_saque:e.equipoAlSaque,video_timestamp:ce()}),e.acciones=await window.apiPista.getAccionesPista(e.partidoId),z(),v(`Tiempo muerto registrado (${i==="local"?"Local":"Rival"})`,"success")}catch(s){v("Error al guardar el tiempo muerto: "+s.message,"error")}}function Ue(){const o=[];let i=[];const{acciones:s}=e;for(let a=0;a<s.length;a++){const n=s[a];i.push(n);const t=["recepcion","defensa","colocacion","freeball"].includes(n.tipo_accion),u=!t&&["#","=","/"].includes(n.resultado)||t&&n.resultado==="="||n.tipo_accion==="rival"||n.tipo_accion==="error_general";let r=!1;if(a<s.length-1){const c=s[a+1];(c.tipo_accion==="saque"||c.tipo_accion==="recepcion")&&(r=!0)}if(u||r){const c=i[i.length-1];o.push({marcador_local:c.marcador_local,marcador_rival:c.marcador_rival,acciones:i}),i=[]}}if(i.length>0){const a=i[i.length-1];o.push({marcador_local:a.marcador_local,marcador_rival:a.marcador_rival,acciones:i})}return o.reverse().map(a=>{const n=a.acciones.map(r=>r.id).join(","),t=a.acciones.length>0&&a.acciones.every(r=>r.es_favorito),l=`<div class="rally-header">
            <span>Marcador: ${a.marcador_local} - ${a.marcador_rival}</span>
            <div class="rally-header-actions">
                <button class="btn-fav-rally ${t?"is-fav":""}" data-rally-ids="${n}" title="${t?"Quitar punto de favoritos":"Marcar punto como favorito"}">
                    <span class="fav-star">${t?"★":"☆"}</span>
                </button>
                <button class="btn-delete-rally" data-rally-ids="${n}" title="Eliminar Punto (y todas sus acciones)">🗑️</button>
            </div>
        </div>`,u=a.acciones.map(r=>{var S,L,_,d;const c=((S=se[r.resultado])==null?void 0:S.class)||"continuidad",m=((L=se[r.resultado])==null?void 0:L.icon)||r.resultado||"",b=((_=T[r.tipo_accion])==null?void 0:_.label)||((d=T[r.tipo_accion])==null?void 0:d.abbr)||r.tipo_accion;let y=`#${r.dorsal}`,w=`<span style="font-weight:bold; margin-left: 2px;">[${m}]</span>`;return r.tipo_accion==="rival"?y="RIVAL":r.tipo_accion==="error_general"?y="EQUIPO":r.tipo_accion==="cambio"&&(y="🔄 CAMBIO",w=""),`
                <div class="timeline-item ${c}" data-id="${r.id}" data-timestamp="${r.video_timestamp}" style="display:flex; align-items:center; gap:8px; padding:8px 12px; cursor:pointer;" title="Haz clic para saltar al minuto ${N(r.video_timestamp)} en el vídeo">
                    <span class="timestamp" data-timestamp="${r.video_timestamp}" style="cursor:pointer; text-decoration:underline; font-weight:bold;">${N(r.video_timestamp)}</span>
                    <strong style="color:var(--accent); font-weight:bold;">${y}</strong>
                    <span>${b}</span>
                    ${r.subtipo?`<span style="color:var(--text-secondary);">· ${r.subtipo}</span>`:""}
                    ${r.tipo_accion==="ataque"&&/zaguero/i.test(r.subtipo||"")?'<span style="color:#facc15; font-weight:800;">ZAG</span>':""}
                    ${w}
                    <div style="margin-left: auto; display: flex; gap: 4px;">
                        <button class="btn-edit-action" data-action-id="${r.id}" title="Editar Acción" style="background:none; border:none; cursor:pointer;">✏️</button>
                        <button class="btn-delete-action" data-action-id="${r.id}" title="Eliminar Acción" style="background:none; border:none; cursor:pointer; font-size:1.1rem; color:var(--text-secondary);">×</button>
                    </div>
                </div>
            `}).join("");return`<div class="rally-group">${l}<div class="rally-actions">${u}</div></div>`}).join("")}function z(){const o=document.getElementById("timeline-items"),i=document.querySelector(".timeline-title");i&&(i.textContent=`Historial (${e.acciones.length} acciones)`),o.innerHTML=Ue(),o.querySelectorAll(".btn-delete-action").forEach(t=>{t.addEventListener("click",async l=>{l.stopPropagation();const u=parseInt(t.dataset.actionId,10);confirm("¿Seguro que quieres eliminar esta acción?")&&(await window.apiPista.deleteAccionPista(u),e.acciones=e.acciones.filter(r=>r.id!==u),z())})}),o.querySelectorAll(".btn-edit-action").forEach(t=>{t.addEventListener("click",l=>{l.stopPropagation();const u=parseInt(t.dataset.actionId,10),r=e.acciones.find(m=>m.id===u);if(!r)return;e.editingActionId=u,document.getElementById("edit-dorsal").value=r.dorsal,document.getElementById("edit-tipo").value=r.tipo_accion,document.getElementById("edit-tiempo").value=Number(r.video_timestamp||0).toFixed(2),document.getElementById("edit-resultado").value=r.resultado;const c=document.getElementById("edit-action-modal");c&&(c.style.display="flex"),e.wizardModalAbierto=!0})}),o.querySelectorAll(".timeline-item").forEach(t=>{t.addEventListener("click",l=>{if(l.target.closest("button"))return;const u=parseFloat(t.dataset.timestamp);Number.isFinite(u)&&Te(u)})}),o.querySelectorAll(".btn-fav-rally").forEach(t=>{t.addEventListener("click",async l=>{l.stopPropagation();const u=t.dataset.rallyIds;if(!u)return;const r=u.split(",").map(b=>parseInt(b,10)),c=e.acciones.filter(b=>r.includes(b.id));if(c.length===0)return;const m=c.every(b=>b.es_favorito)?0:1;for(const b of c)b.es_favorito=m,await window.apiPista.updateAccionPista(b.id,{es_favorito:m});v(m?"Punto añadido a favoritos ★":"Punto quitado de favoritos",m?"success":"info"),z()})}),o.querySelectorAll(".btn-delete-rally").forEach(t=>{t.addEventListener("click",async l=>{l.stopPropagation();const u=t.dataset.rallyIds;if(!u)return;const r=u.split(",").map(c=>parseInt(c,10));if(confirm("¿Seguro que quieres eliminar todas las acciones de este punto?")){for(const c of r)await window.apiPista.deleteAccionPista(c);e.acciones=e.acciones.filter(c=>!r.includes(c.id)),z()}})});const s=document.getElementById("live-stats-tbody"),a=Ne(e.acciones,e.roster),n=Object.values(a.porJugador||{});a.totalEquipo&&n.push(a.totalEquipo),s.innerHTML=n.map(t=>`
        <tr ${t.dorsal==="Equ"?'style="font-weight:bold; background:rgba(255,255,255,0.05); border-top:1px solid var(--border);"':""}>
            <td style="color:var(--accent); font-weight:bold;">${t.dorsal}</td>
            <td>${t.nombre}</td>
            <td>${t.saques_totales}/${t.saques_errores}/${t.saques_puntos}</td>
            <td>${t.recepciones_totales}/${t.recepciones_errores}/${t.recepciones_positivas_pct}%/${t.recepciones_errores_pct}%</td>
            <td>${t.ataques_totales}/${t.ataques_errores}/${t.ataques_bloqueados}/${t.ataques_puntos}/${t.ataques_eficiencia}%</td>
            <td>${t.bloqueos_puntos}</td>
            <td class="${t.ganados_perdidos>0?"text-green-400":t.ganados_perdidos<0?"text-red-400":""}">
                ${t.ganados_perdidos>0?"+":""}${t.ganados_perdidos}
            </td>
        </tr>
    `).join("")}function Ze(o){de();const i=async()=>{if(!e.dorsalInput)return;clearTimeout(e.dorsalTimer);const s=parseInt(e.dorsalInput,10);e.dorsalInput="";const a=Le(),n=_e().map(t=>t.dorsal);a.length>0&&!a.includes(s)&&!n.includes(s)?v(`⚠️ El dorsal #${s} no está en el campo ni es Líbero`,"warning"):await pe(s)&&(e.dorsalSeleccionado=s),A()};ie=async s=>{if(e.wizardModalAbierto||s.target.tagName==="INPUT"||s.target.tagName==="TEXTAREA"||s.target.isContentEditable)return;const a=s.key,n=je("pista",a);if((n==null?void 0:n.action)==="videoPlayPause"||(n==null?void 0:n.action)==="videoBackward"||(n==null?void 0:n.action)==="videoForward"){s.preventDefault(),n.action==="videoPlayPause"?be():n.action==="videoBackward"?U(-(J().videoSeekSeconds||5)):n.action==="videoForward"&&U(J().videoSeekSeconds||5);return}if(M()){(n==null?void 0:n.action)==="undo"?document.getElementById("btn-undo").click():(/[0-9]/.test(a)||n)&&v(`⚠️ No puedes registrar stats en el Set ${e.setActual} hasta que configures la rotación inicial`,"warning");return}if(e.tipoAccion&&Z[e.tipoAccion]){const t=Ie("pista",e.tipoAccion,a);if(t){e.subtipo=t.label,A();return}}if(/[0-9]/.test(a)){clearTimeout(e.dorsalTimer),e.dorsalInput+=a,A(),e.dorsalTimer=setTimeout(i,500);return}if(await i(),(n==null?void 0:n.action)==="registerTimeout"){await $e();return}if(n){const t=n;t.action==="selectAction"?(e.tipoAccion=t.value,e.subtipo=null,A()):t.action==="registerTimeout"?await $e():t.action==="resultPunto"?F("#"):t.action==="resultError"?F("="):t.action==="resultBloqueado"?F("/"):t.action==="resultPositiva"?F("+"):t.action==="resultNegativa"?F("!"):t.action==="resultPobre"?F("-"):t.action==="undo"?document.getElementById("btn-undo").click():t.action==="videoPlayPause"?be():t.action==="videoForward"?U(J().videoSeekSeconds||5):t.action==="videoBackward"&&U(-(J().videoSeekSeconds||5))}else return},document.addEventListener("keydown",ie),H={down:s=>{if(s.key!==G("pista","video-speed-3x")||s.repeat||s.target.tagName==="INPUT"||s.target.tagName==="TEXTAREA"||s.target.isContentEditable||j.getCurrentPage()!=="scouting-pista"||e.tipoAccion&&Z[e.tipoAccion]&&Ie("pista",e.tipoAccion,s.key))return;const a=document.getElementById("local-video");if(a){a.playbackRate=3;const t=document.getElementById("speed-indicator");t&&(t.textContent="3x");return}const n=document.getElementById("yt-iframe-player");if(n){n.contentWindow.postMessage(JSON.stringify({event:"command",func:"setPlaybackRate",args:[3]}),"*");const t=document.getElementById("speed-indicator");t&&(t.textContent="3x")}},up:s=>{if(s.key!==G("pista","video-speed-3x")||j.getCurrentPage()!=="scouting-pista")return;const a=document.getElementById("local-video");if(a){a.playbackRate=e.videoSpeed||1;const t=document.getElementById("speed-indicator");t&&(t.textContent=`${e.videoSpeed||1}x`);return}const n=document.getElementById("yt-iframe-player");if(n){n.contentWindow.postMessage(JSON.stringify({event:"command",func:"setPlaybackRate",args:[e.videoSpeed||1]}),"*");const t=document.getElementById("speed-indicator");t&&(t.textContent=`${e.videoSpeed||1}x`)}}},document.addEventListener("keydown",H.down),document.addEventListener("keyup",H.up)}function Qe(){var S,L,_,d,h,D,Q,C,X,K,ee,V,O,ve,ge,fe;const o=document.getElementById("edit-action-modal");(S=document.getElementById("btn-close-edit"))==null||S.addEventListener("click",()=>{o.style.display="none",e.wizardModalAbierto=!1}),(L=document.getElementById("timeline-items"))==null||L.addEventListener("dblclick",async p=>{const g=p.target.closest(".timeline-item");if(!g)return;const f=parseInt(g.dataset.id),E=e.acciones.find($=>$.id===f);E&&(e.editingActionId=f,document.getElementById("edit-dorsal").value=E.dorsal,document.getElementById("edit-tipo").value=E.tipo_accion,document.getElementById("edit-tiempo").value=Number(E.video_timestamp||0).toFixed(2),document.getElementById("edit-resultado").value=E.resultado,o.style.display="flex",e.wizardModalAbierto=!0)}),(_=document.getElementById("btn-save-edit"))==null||_.addEventListener("click",async()=>{if(!e.editingActionId)return;const p=parseInt(document.getElementById("edit-dorsal").value),g=document.getElementById("edit-tipo").value,f=parseFloat(document.getElementById("edit-tiempo").value),E=document.getElementById("edit-resultado").value;if(!Number.isFinite(f)||f<0){v("Introduce un tiempo de vídeo válido","warning");return}await window.apiPista.updateAccionPista(e.editingActionId,{dorsal:p,tipo_accion:g,resultado:E,video_timestamp:f}),o.style.display="none",e.wizardModalAbierto=!1,e.editingActionId=null,e.acciones=await window.apiPista.getAccionesPista(e.partidoId),z(),A(),v("Acción actualizada con éxito","success")});const i=document.getElementById("rotacion-modal");(d=document.getElementById("btn-close-rotacion"))==null||d.addEventListener("click",()=>{i.style.display="none",e.wizardModalAbierto=!1}),document.querySelectorAll(".btn-select-rotacion").forEach(p=>{p.addEventListener("click",g=>{const f=parseInt(g.target.closest(".btn-select-rotacion").dataset.rot);e.rotacionActual=f,document.getElementById("label-rotacion").textContent="R"+f,i.style.display="none",e.wizardModalAbierto=!1,v(`Rotación inicial fijada en R${f}`,"success")})});const s=document.getElementById("notes-modal");(h=document.getElementById("btn-close-notes"))==null||h.addEventListener("click",()=>{s.style.display="none",e.wizardModalAbierto=!1}),(D=document.getElementById("btn-save-notes"))==null||D.addEventListener("click",async()=>{var g;const p=((g=document.getElementById("partido-notas-text"))==null?void 0:g.value)||"";await window.apiPista.updatePartidoPista(e.partidoId,{notas:p}),e.partido.notas=p,s.style.display="none",e.wizardModalAbierto=!1,v("Notas guardadas","success")});const a=document.getElementById("modal-ajustes-partido");(Q=document.getElementById("btn-close-ajustes"))==null||Q.addEventListener("click",()=>{a.style.display="none",e.wizardModalAbierto=!1});const n=document.getElementById("ajustes-group-youtube"),t=document.getElementById("ajustes-group-local");document.querySelectorAll('input[name="ajustes-video-tipo"]').forEach(p=>{p.addEventListener("change",g=>{const f=g.target.value;n&&(n.style.display=f==="youtube"?"block":"none"),t&&(t.style.display=f==="local"?"block":"none")})}),(C=document.getElementById("btn-ajustes-elegir-local"))==null||C.addEventListener("click",async()=>{try{const p=await window.api.openVideoFile(),g=document.getElementById("ajustes-local-path");p&&g&&(g.value=p)}catch(p){console.error("[Ajustes Pista] Error al seleccionar archivo local:",p)}}),(X=document.getElementById("btn-save-ajustes"))==null||X.addEventListener("click",async()=>{var B,P,I,q,te;const p=((B=document.getElementById("ajustes-torneo"))==null?void 0:B.value)||"",g=((P=document.getElementById("ajustes-fase"))==null?void 0:P.value)||"",f=(I=document.getElementById("ajustes-llevar-rotaciones"))!=null&&I.checked?1:0,E=document.querySelector('input[name="ajustes-video-tipo"]:checked'),$=E?E.value:"ninguno";let x="ninguno",k="";$==="youtube"?(x="youtube",k=((q=document.getElementById("ajustes-youtube-url"))==null?void 0:q.value.trim())||""):$==="local"&&(x="local",k=((te=document.getElementById("ajustes-local-path"))==null?void 0:te.value.trim())||""),await window.apiPista.updatePartidoPista(e.partidoId,{torneo:p,fase:g,llevar_rotaciones:f,video_tipo:x,video_url:k}),e.partido.torneo=p,e.partido.fase=g,e.partido.llevar_rotaciones=f,e.partido.video_tipo=x,e.partido.video_url=k,a.style.display="none",e.wizardModalAbierto=!1,v("Ajustes guardados","success"),j.navigate("scouting-pista",{partidoId:e.partidoId})});const u=document.getElementById("modal-lineup-set");(K=document.getElementById("btn-close-lineup"))==null||K.addEventListener("click",()=>{u.style.display="none",e.wizardModalAbierto=!1}),(ee=document.getElementById("btn-save-lineup"))==null||ee.addEventListener("click",async()=>{const p={};let g=!0;const f=new Set,E=Array.from(document.querySelectorAll(".lineup-input"));for(const x of E){const k=x.dataset.pos,B=x.value;if(!B)g=!1;else{const P=parseInt(B,10);f.has(P)&&(v(`El dorsal #${P} está repetido en la alineación`,"warning"),g=!1),f.add(P),p[k]=P,await pe(P)}}if(!g&&!confirm("Faltan jugadores por asignar o hay dorsales repetidos. ¿Continuar de todas formas?"))return;e.rotacionesIniciales||(e.rotacionesIniciales={}),e.rotacionesIniciales[e.setActual]=p,await window.apiPista.updatePartidoPista(e.partidoId,{rotaciones_iniciales:JSON.stringify(e.rotacionesIniciales)});const $=Object.entries(p).filter(([x,k])=>{const B=e.roster.find(P=>P.dorsal===k);return B&&B.posicion&&B.posicion.toLowerCase()==="colocador"});if(u.style.display="none",e.wizardModalAbierto=!1,$.length===1){const[x,k]=$[0],B=parseInt(x,10)||1;e.rotacionActual=B,v(`✅ Titulares guardados. Rotación R${B} asignada automáticamente (Colocador #${k} en P${x})`,"success")}else{const x=document.getElementById("rotacion-modal-subtitle");x&&($.length===0?x.textContent="⚠️ No se ha detectado ningún Colocador entre los titulares. Selecciona en qué rotación inicial (1 a 6) se encuentra tu equipo:":x.textContent=`ℹ️ Hay ${$.length} colocadores en pista. Selecciona en qué rotación inicial (1 a 6) se encuentra tu equipo:`),document.getElementById("rotacion-modal").style.display="flex",e.wizardModalAbierto=!0,v($.length===0?"Selecciona la rotación inicial del equipo":"Múltiples colocadores detectados, selecciona rotación inicial","info")}A()});const r=document.getElementById("modal-cambio-jugador");(V=document.getElementById("btn-close-cambio"))==null||V.addEventListener("click",()=>{r.style.display="none",e.wizardModalAbierto=!1}),(O=document.getElementById("btn-save-cambio"))==null||O.addEventListener("click",async()=>{var k;const p=document.getElementById("cambio-sale"),g=document.getElementById("cambio-entra");if(!p||!g)return;const f=p.value,E=parseInt((k=p.selectedOptions[0])==null?void 0:k.dataset.dorsal,10)||0,$=g.value;if(!$){v("Por favor, indica el dorsal del jugador que entra","warning");return}const x=parseInt($,10);if(x===E){v("El jugador que entra no puede ser el mismo que sale","warning");return}await pe(x),e.rotacionesIniciales[e.setActual]||(e.rotacionesIniciales[e.setActual]={}),e.rotacionesIniciales[e.setActual][f]=x,await window.apiPista.updatePartidoPista(e.partidoId,{rotaciones_iniciales:JSON.stringify(e.rotacionesIniciales)}),await window.apiPista.createAccionPista({partido_id:e.partidoId,dorsal:x,rotacion:e.rotacionActual,tipo_accion:"cambio",subtipo:`🔄 Entra #${x}, Sale #${E}`,resultado:"+",set_numero:e.setActual,marcador_local:e.marcadorLocal.toString(),marcador_rival:e.marcadorRival.toString(),video_timestamp:ce(),equipo_al_saque:e.equipoAlSaque}),r.style.display="none",e.wizardModalAbierto=!1,v(`🔄 Cambio registrado: Entra #${x} por #${E}`,"success"),e.acciones=await window.apiPista.getAccionesPista(e.partidoId),A(),z()});const c=document.getElementById("videos-modal");(ve=document.getElementById("btn-close-videos"))==null||ve.addEventListener("click",()=>{c.style.display="none",e.wizardModalAbierto=!1});const m=document.getElementById("vid-generar-modo"),b=document.getElementById("vid-filtros-container"),y=document.getElementById("vid-plantilla"),w=()=>{var k,B,P;const p=document.getElementById("vid-preview");if(!p)return;const g=(m==null?void 0:m.value)||"filtrar",f=Number(((k=document.getElementById("vid-dorsal"))==null?void 0:k.value)||0),E=((B=document.getElementById("vid-accion"))==null?void 0:B.value)||"",$=Number(((P=document.getElementById("vid-set"))==null?void 0:P.value)||0);let x=e.acciones.filter(I=>I.video_timestamp>0&&(!$||Number(I.set_numero)===$));if(g==="favoritos")x=x.filter(I=>I.es_favorito);else{f&&(x=x.filter(q=>Number(q.dorsal)===f));const I=g==="puntos_ataques"?"ataque":E;I&&(x=x.filter(q=>q.tipo_accion===I))}if(!x.length){p.style.display="block",p.innerHTML='<span style="color:var(--text-muted);">No hay acciones con vídeo para esta selección.</span>';return}p.style.display="block",p.innerHTML=`<strong style="font-size:12px;">${x.length} acciones seleccionadas</strong><div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">${x.slice(0,12).map(I=>{var q;return`<button class="btn btn-sm btn-secondary btn-preview-video" data-time="${I.video_timestamp}" style="padding:4px 7px;">${N(I.video_timestamp)} · ${((q=T[I.tipo_accion])==null?void 0:q.abbr)||I.tipo_accion}</button>`}).join("")}${x.length>12?`<span style="font-size:12px; color:var(--text-muted); align-self:center;">+${x.length-12} más</span>`:""}</div><p style="font-size:11px; color:var(--text-muted); margin:8px 0 0;">Pulsa un clip para llevar el vídeo a ese punto antes de exportar.</p>`,p.querySelectorAll(".btn-preview-video").forEach(I=>I.addEventListener("click",()=>Te(Number(I.dataset.time))))};m==null||m.addEventListener("change",p=>{b&&(b.style.display=p.target.value==="favoritos"?"none":"flex");const g=document.querySelector('label[for="vid-dorsal"]');g&&(g.textContent=p.target.value==="puntos_ataques"?"Jugador que ataca":"Jugador / Dorsal");const f=document.getElementById("vid-accion");f&&(f.disabled=p.target.value==="puntos_ataques",p.target.value==="puntos_ataques"&&(f.value="ataque")),w()}),y==null||y.addEventListener("change",()=>{const p=y.value,g=document.getElementById("vid-accion");p==="ataques-jugador"?(m.value="puntos_ataques",g.value="ataque"):p==="favoritos"?m.value="favoritos":(p==="saques"||p==="recepciones")&&(m.value="filtrar",g.value=p==="saques"?"saque":"recepcion"),m.dispatchEvent(new Event("change"))}),(ge=document.getElementById("btn-previsualizar-videos"))==null||ge.addEventListener("click",w),window.apiPista&&window.apiPista.onVideoProgressPista&&window.apiPista.onVideoProgressPista(p=>{const g=document.getElementById("vid-progress-bar"),f=document.getElementById("vid-progress-text");g&&f&&(g.style.width=p+"%",f.textContent=p+"%")}),(fe=document.getElementById("btn-generar-videos-run"))==null||fe.addEventListener("click",async()=>{var te,ye,xe,we,he;const p=document.getElementById("btn-generar-videos-run"),g=m?m.value:"filtrar",f={modo:g},E=(te=document.getElementById("vid-dorsal"))==null?void 0:te.value,$=(ye=document.getElementById("vid-accion"))==null?void 0:ye.value,x=(xe=document.getElementById("vid-set"))==null?void 0:xe.value,k=(we=document.getElementById("vid-margin-pre"))==null?void 0:we.value,B=(he=document.getElementById("vid-margin-post"))==null?void 0:he.value;g!=="favoritos"&&(E&&(f.dorsal=parseInt(E,10)),g==="puntos_ataques"?f.tipo_accion="ataque":$&&(f.tipo_accion=$)),x&&(f.set_numero=parseInt(x,10)),f.pre_margin=k?parseFloat(k):3,f.post_margin=B?parseFloat(B):2,p.disabled=!0,p.textContent="⏳ Generando vídeo...";const P=document.getElementById("vid-progress-container"),I=document.getElementById("vid-progress-bar"),q=document.getElementById("vid-progress-text");P&&(P.style.display="block"),I&&(I.style.width="0%"),q&&(q.textContent="0%");try{await window.apiPista.generateVideoHighlightsPista(e.partidoId,f)&&(v("Vídeo resumen exportado con éxito","success"),c.style.display="none",e.wizardModalAbierto=!1)}catch(Ee){v(Ee.message||"Error al exportar vídeo","error")}finally{p.disabled=!1,p.textContent="🚀 Exportar Vídeo Resumen",P&&(P.style.display="none")}})}export{tt as registerScoutingPista};
