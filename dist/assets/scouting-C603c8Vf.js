import{r as A,g as D,T as Q,k as w,S as W,R as Se,a as _e,s as J}from"./index-mPRRmVeE.js";import{s as m,g as ne,b as j}from"./helpers-Doah0GRy.js";import{c as Le}from"./stats-calculator-DFBYOtiv.js";let e=null,z=null,P=null,S=null,M=0,H=-1,_=null,L=null,C=[],R=null;function se(){M=0,H=-1,_&&window.removeEventListener("message",_),L&&clearInterval(L),_=a=>{let t=a.data;if(typeof t=="string")try{t=JSON.parse(t)}catch{return}!t||typeof t!="object"||(t.info&&typeof t.info.currentTime=="number"?M=t.info.currentTime:typeof t.currentTime=="number"&&(M=t.currentTime),t.info&&typeof t.info.playerState=="number"&&(H=t.info.playerState))},window.addEventListener("message",_),L=setInterval(()=>{const a=document.getElementById("yt-iframe-player");if(a&&a.contentWindow)try{a.contentWindow.postMessage(JSON.stringify({event:"command",func:"getCurrentTime",args:[]}),"*"),a.contentWindow.postMessage(JSON.stringify({event:"listening",id:1,channel:"widget"}),"*")}catch{}},250)}function Ve(){A.register("scouting",async(a,t)=>{const n=await window.api.getPartido(t.partidoId);if(!n){m("Partido no encontrado","error"),A.navigate("dashboard");return}const o=await window.api.getAcciones(t.partidoId);if(e={partidoId:t.partidoId,partido:n,acciones:o,jugadorSeleccionado:n.jugador1_nombre,equipoAlSaque:"local",tipoAccion:null,subtipo:null,setActual:1,marcadorLocal:0,marcadorRival:0,videoSpeed:D().videoDefaultSpeed||1,wizardModalAbierto:!1,wizardActionType:null,attackWizard:{step:1,type:null,dir:null,result:null},allowFullscreenSelectors:!0,enterTimer:null,backspaceTimer:null,reverseInterval:null},o.length>0){const i=o[o.length-1];e.setActual=i.set_numero}if(n.resultado){const i=n.resultado.split("-");i.length===2&&(e.marcadorLocal=parseInt(i[0])||0,e.marcadorRival=parseInt(i[1])||0)}a.style.padding="16px",je(a),re(),ze(),le(),x()})}async function le(a=e.partido.video_url){if(C=[],!!a){try{C=await window.api.getWhistles(a)}catch{return}C.length&&(R=t=>{if(t.button!==3&&t.button!==4||t.target.closest("input, textarea, select"))return;const n=t.button===3?"MouseBack":"MouseForward",o=w("playa","whistle-previous")===n,i=w("playa","whistle-next")===n;if(!o&&!i)return;const s=document.getElementById("local-video");if(!s)return;const c=s.currentTime||0,r=i?C.find(l=>l>c+.08):[...C].reverse().find(l=>l<c-.08);t.preventDefault(),r!==void 0&&(s.currentTime=r,m(`Silbato: ${j(r)}`,"info"))},document.addEventListener("mousedown",R))}}function je(a){const{partido:t}=e,n=t.jugador1_nombre,o=t.jugador2_nombre,i=t.video_tipo&&t.video_url;a.innerHTML=`
        <div class="scouting-layout ${i?"":"no-video"} ${t.video_tipo==="youtube"?"youtube-choice-active":""}">
            <!-- cabecera del partido -->
            <div class="scouting-header">
                <div class="match-info">
                    <div>
                        <div class="match-info-label">Torneo</div>
                        <div class="match-info-value">${t.torneo||"Sin torneo"}</div>
                    </div>
                    <div>
                        <div class="match-info-label">Fase</div>
                        <div class="match-info-value">${t.fase||"-"}</div>
                    </div>
                    <div>
                        <div class="match-info-label">Rivales</div>
                        <div class="match-info-value">${n} / ${o}</div>
                    </div>
                </div>
                <div class="flex gap-12 items-center">
                    <label class="switch-container" style="display:flex; align-items:center; gap:8px; margin-right:16px; cursor:pointer;">
                        <span class="form-label" style="margin:0; font-size:12px;">Pantalla Completa</span>
                        <div class="toggle-switch">
                            <input type="checkbox" id="switch-fullscreen" ${e.allowFullscreenSelectors?"checked":""}>
                            <span class="toggle-slider"></span>
                        </div>
                    </label>
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
                    <button class="btn btn-sm btn-primary" id="btn-finalizar-set">🏁 Finalizar Set</button>
                    <button class="btn btn-sm btn-secondary" id="btn-notas-partido">📝 Notas</button>
                    <button class="btn btn-sm btn-secondary" id="btn-ajustes-partido">⚙️ Ajustes</button>
                    <button class="btn btn-sm btn-secondary" id="btn-guardar-partido">💾 Guardar</button>
                    <button class="btn btn-sm btn-secondary" id="btn-generador-videos" ${t.video_tipo==="local"||t.video_tipo==="youtube"?"":'style="display:none;"'}>🎬 Vídeos</button>
                    <button class="btn btn-sm btn-secondary" id="btn-ver-informe">📊 Informe</button>
                    <button class="btn btn-sm btn-secondary" id="btn-volver">← Volver</button>
                </div>
            </div>

            <!-- reproductor de video -->
            <div class="video-container" id="video-container">
                ${$e()}
            </div>

            <!-- panel de acciones -->
            <div class="action-panel">
                <div class="action-panel-title">Panel de Registro</div>

                <!-- seleccion de jugador -->
                <div>
                    <div class="form-label">Jugador</div>
                    <div class="player-selector">
                        <button class="player-btn ${e.jugadorSeleccionado===t.jugador1_nombre?"active":""}"
                                data-player="${t.jugador1_nombre}" id="player-btn-1">
                            ${t.jugador1_nombre}
                            <span class="player-shortcut">Tecla: 1</span>
                        </button>
                        <button class="player-btn ${e.jugadorSeleccionado===t.jugador2_nombre?"active":""}"
                                data-player="${t.jugador2_nombre}" id="player-btn-2">
                            ${t.jugador2_nombre}
                            <span class="player-shortcut">Tecla: 2</span>
                        </button>
                    </div>
                </div>

                <!-- tipo de accion -->
                <div>
                    <div class="form-label">Tipo de Acción</div>
                    <div class="action-buttons">
                        ${Object.entries(Q).map(([s,c])=>`
                            <button class="action-btn ${e.tipoAccion===s?"selected":""}"
                                    data-action="${s}">
                                ${c.label}
                                <span class="shortcut-hint">${c.key.toUpperCase()}</span>
                            </button>
                        `).join("")}
                    </div>
                </div>

                <!-- subtipos (se muestran segun la accion seleccionada) -->
                <div id="subtipo-container" style="${e.tipoAccion&&e.tipoAccion!=="ataque"?"":"display:none;"}">
                    <div class="form-label">Subtipo (Pulsa la tecla para registrar)</div>
                    <div class="subtype-buttons" id="subtype-buttons">
                        ${we()}
                    </div>
                </div>

                <!-- accion actual -->
                <div class="current-action" id="current-action">
                    <div class="current-action-label">Acción Actual</div>
                    <div class="current-action-value" id="current-action-text">Selecciona jugador y acción</div>
                </div>

                <!-- boton confirmar -->
                <button class="confirm-action-btn" id="btn-confirmar">
                    📝 Registrar Acción
                </button>

                <!-- deshacer -->
                <button class="btn btn-sm btn-secondary" id="btn-undo" style="width: 100%; margin-top: 4px;">
                    ↩️ Deshacer Última (Z)
                </button>
            </div>

            <!-- timeline de acciones -->
            <div class="timeline-container" id="timeline-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div class="timeline-title" style="margin-bottom: 0;">Historial de Acciones (${e.acciones.length})</div>
                    <button class="btn btn-sm btn-secondary" id="btn-fullscreen-timeline" title="Alternar pantalla completa" style="padding: 4px 8px;">⛶</button>
                </div>
                <div class="timeline-items" id="timeline-items">
                    ${xe()}
                </div>
            </div>

            <!-- estadisticas en vivo -->
            <div class="live-stats" id="live-stats">
                ${Ae()}
            </div>

            <!-- modal de ataque gigante (wizard) -->
            <div class="attack-modal ${e.allowFullscreenSelectors?"":"inline-modal"}" id="attack-modal" style="display: none;">
                <div class="attack-modal-content" id="attack-modal-content">
                    <!-- Se rellena dinamicamente -->
                </div>
            </div>
        </div>

        <!-- modal de notas del partido -->
        <div class="attack-modal" id="notes-modal" style="display: none;">
            <div class="notes-modal-content">
                <div class="notes-header">
                    <h3>📝 Notas del Partido</h3>
                    <button id="btn-close-notes" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div class="notes-toolbar">
                    <button class="btn btn-sm btn-secondary" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)"><b>B</b></button>
                    <button class="btn btn-sm btn-secondary" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)"><i>I</i></button>
                    <button class="btn btn-sm btn-secondary" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)"><u>U</u></button>
                    <button class="btn btn-sm btn-secondary" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)">• Lista</button>
                    <button class="btn btn-sm btn-secondary" onmousedown="event.preventDefault(); document.execCommand('insertOrderedList', false, null)">1. Lista</button>
                </div>
                <div id="notes-editor" class="notes-editor" contenteditable="true" spellcheck="false"></div>
                <div class="notes-footer">
                    <button id="btn-save-notes" class="btn btn-primary">💾 Guardar Notas</button>
                </div>
            </div>
        </div>

        <!-- modal de videos -->
        <div class="attack-modal" id="videos-modal" style="display: none;">
            <div class="notes-modal-content" style="max-width: 500px;">
                <div class="notes-header">
                    <h3>🎬 Generador de Vídeos</h3>
                    <button id="btn-close-videos" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                    <div style="margin-bottom: 4px;">
                        <label class="form-label">Modo de Generación</label>
                        <select id="vid-generar-modo" class="form-input" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: white; padding: 8px; border-radius: 6px; height: 38px;">
                            <option value="filtrar">Filtrar jugadas específicas</option>
                            <option value="puntos">Todos los puntos completos (de principio a fin)</option>
                            <option value="favoritos">Sólo las jugadas marcadas como Favoritas ⭐</option>
                        </select>
                    </div>
                    
                    <div id="vid-filtros-container" style="display: flex; flex-direction: column; gap: 12px;">
                        <div style="display: flex; gap: 12px;">
                            <div style="flex: 1;">
                                <label class="form-label">Jugador</label>
                                <select id="vid-jugador" class="form-input">
                                    <option value="">Ambos Jugadores</option>
                                    <option value="${t.jugador1_nombre}">${t.jugador1_nombre}</option>
                                    <option value="${t.jugador2_nombre}">${t.jugador2_nombre}</option>
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label class="form-label">Complejo</label>
                                <select id="vid-complejo" class="form-input">
                                    <option value="">Cualquiera</option>
                                    <option value="K1">K1</option>
                                    <option value="K2">K2</option>
                                </select>
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <div style="flex: 1;">
                                <label class="form-label">Tipo de Acción</label>
                                <select id="vid-accion" class="form-input">
                                    <option value="">Todas</option>
                                    <option value="saque">Saque</option>
                                    <option value="recepcion">Recepción</option>
                                    <option value="colocacion">Colocación</option>
                                    <option value="ataque">Ataque</option>
                                    <option value="bloqueo">Bloqueo</option>
                                    <option value="defensa">Defensa</option>
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label class="form-label">Resultado</label>
                                <select id="vid-resultado" class="form-input">
                                    <option value="">Cualquiera</option>
                                    <option value="punto">Punto</option>
                                    <option value="continuidad">Continuidad</option>
                                    <option value="error">Error</option>
                                    <option value="bloqueado">Bloqueado</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <div style="flex: 1;">
                            <label class="form-label">Set</label>
                            <select id="vid-set" class="form-input">
                                <option value="">Todos los sets</option>
                                <option value="1">Primer set</option>
                                <option value="2">Segundo set</option>
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label class="form-label">Margen Antes (s)</label>
                            <input type="number" id="vid-margin-pre" class="form-input" value="3" min="0" max="10">
                        </div>
                        <div style="flex: 1;">
                            <label class="form-label">Margen Después (s)</label>
                            <input type="number" id="vid-margin-post" class="form-input" value="1" min="0" max="10">
                        </div>
                    </div>
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: #e2e8f0; font-size: 0.9rem; padding: 8px 0;">
                        <input type="checkbox" id="vid-mostrar-acciones" style="width: 16px; height: 16px; accent-color: #38bdf8;">
                        🃏 Mostrar tarjeta con las acciones de cada punto en el vídeo
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: #e2e8f0; font-size: 0.9rem; padding: 8px 0; margin-top: -8px;">
                        <input type="checkbox" id="vid-con-marcador" checked style="width: 16px; height: 16px; accent-color: #38bdf8;">
                        💯 Incluir marcador en el vídeo
                    </label>
                    <div id="vid-progress-container" style="display: none; margin-top: 8px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <label class="form-label" style="margin: 0;">Exportando vídeo...</label>
                            <span id="vid-progress-text" style="color: white; font-size: 12px;">0%</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: #334155; border-radius: 4px; overflow: hidden;">
                            <div id="vid-progress-bar" style="width: 0%; height: 100%; background: #38bdf8; transition: width 0.2s;"></div>
                        </div>
                    </div>
                    <button id="btn-generar-videos-run" class="btn btn-primary mt-16" style="width: 100%;">✂️ Generar Vídeo (Combina la jugada)</button>
                </div>
            </div>
        </div>

        <!-- modal de edicion de accion -->
        <div class="attack-modal" id="edit-action-modal" style="display: none;">
            <div class="notes-modal-content" style="max-width: 400px;">
                <div class="notes-header">
                    <h3>✏️ Editar Acción</h3>
                    <button id="btn-close-edit" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <label class="form-label">Jugador</label>
                        <select id="edit-jugador" class="form-input">
                            <option value="${t.jugador1_nombre}">${t.jugador1_nombre}</option>
                            <option value="${t.jugador2_nombre}">${t.jugador2_nombre}</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Tipo de Acción</label>
                        <select id="edit-tipo" class="form-input">
                            <option value="saque">Saque</option>
                            <option value="recepcion">Recepción</option>
                            <option value="colocacion">Colocación</option>
                            <option value="ataque">Ataque</option>
                            <option value="bloqueo">Bloqueo</option>
                            <option value="defensa">Defensa</option>
                            <option value="rival">Acierto Rival</option>
                            <option value="error_general">Error General</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Subtipo (Detalle)</label>
                        <select id="edit-subtipo" class="form-input"></select>
                    </div>
                    <div>
                        <label class="form-label">Tiempo del Vídeo (segundos)</label>
                        <input type="number" id="edit-tiempo" class="form-input" step="0.01" min="0">
                    </div>
                    <div>
                        <label class="form-label">Resultado Final</label>
                        <select id="edit-resultado" class="form-input">
                            <option value="punto">Punto</option>
                            <option value="error">Error</option>
                            <option value="continuidad">Continuidad</option>
                            <option value="bloqueado">Bloqueado</option>
                        </select>
                    </div>
                </div>
                <div class="notes-footer">
                    <button id="btn-save-edit" class="btn btn-primary">💾 Guardar Cambios</button>
                </div>
            </div>
        </div>

        <!-- Modal para ajustes del partido -->
        <div class="attack-modal" id="modal-ajustes-partido" style="display: none;">
            <div class="notes-modal-content" style="max-width: 500px;">
                <div class="notes-header">
                    <h3>⚙️ Ajustes del Partido</h3>
                    <button id="btn-ajustes-cancelar-x" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <label class="form-label">Torneo</label>
                        <input type="text" id="ajustes-torneo" class="form-input" style="width: 100%;">
                    </div>

                    <div>
                        <label class="form-label">Fase</label>
                        <select id="ajustes-fase" class="form-input" style="width: 100%; height: 38px;">
                            <option value="">Seleccionar fase...</option>
                            <option value="Fase de Grupos">Fase de Grupos</option>
                            <option value="Dieciseisavos">Dieciseisavos</option>
                            <option value="Octavos de Final">Octavos de Final</option>
                            <option value="Cuartos de Final">Cuartos de Final</option>
                            <option value="Semifinal">Semifinal</option>
                            <option value="Partido por el Bronce">Partido por el Bronce</option>
                            <option value="Final">Final</option>
                        </select>
                    </div>

                    <div>
                        <label class="form-label">Origen del Vídeo</label>
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

                    <!-- Input YouTube -->
                    <div id="ajustes-group-youtube" style="display: none;">
                        <label class="form-label">Enlace de YouTube</label>
                        <input type="text" id="ajustes-youtube-url" class="form-input" placeholder="https://www.youtube.com/watch?v=..." style="width: 100%;">
                    </div>

                    <!-- Input Local -->
                    <div id="ajustes-group-local" style="display: none;">
                        <label class="form-label">Archivo de Vídeo Local</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="ajustes-local-path" class="form-input" readonly style="flex: 1; background: #0f172a; color: #94a3b8; cursor: not-allowed; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <button class="btn btn-secondary" id="btn-ajustes-elegir-local">Seleccionar...</button>
                        </div>
                    </div>
                </div>
                <div class="notes-footer" style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="btn btn-secondary" id="btn-ajustes-cancelar">Cancelar</button>
                    <button class="btn btn-primary" id="btn-ajustes-guardar">💾 Guardar Cambios</button>
                </div>
            </div>
        </div>
    `,Ce(),Be(),qe(),Ne()}function Be(){const a=document.getElementById("notes-modal"),t=document.getElementById("btn-notas-partido"),n=document.getElementById("btn-close-notes"),o=document.getElementById("btn-save-notes"),i=document.getElementById("notes-editor");t.addEventListener("click",()=>{i.innerHTML=e.partido.notas||"",a.style.display="flex",e.wizardModalAbierto=!0,setTimeout(()=>i.focus(),50)}),n.addEventListener("click",()=>{a.style.display="none",e.wizardModalAbierto=!1}),o.addEventListener("click",async()=>{const s=i.innerHTML;e.partido.notas=s,await window.api.updatePartido(e.partidoId,{notas:s}),m("Notas guardadas","success"),a.style.display="none",e.wizardModalAbierto=!1})}function qe(){var r,l,p;const a=document.getElementById("edit-action-modal"),t=document.getElementById("btn-close-edit"),n=document.getElementById("btn-save-edit");t.addEventListener("click",()=>{a.style.display="none",e.wizardModalAbierto=!1,e.editingActionId=null});const o=document.getElementById("videos-modal"),i=document.getElementById("vid-filtros-container"),s=document.getElementById("vid-generar-modo");s==null||s.addEventListener("change",u=>{i&&(i.style.display=u.target.value==="puntos"?"none":"flex")}),(r=document.getElementById("btn-generador-videos"))==null||r.addEventListener("click",()=>{s&&(s.value="filtrar"),i&&(i.style.display="flex"),o.style.display="flex",e.wizardModalAbierto=!0}),(l=document.getElementById("btn-close-videos"))==null||l.addEventListener("click",()=>{o.style.display="none",e.wizardModalAbierto=!1}),window.api&&window.api.onVideoProgress&&window.api.onVideoProgress(u=>{const d=document.getElementById("vid-progress-bar"),b=document.getElementById("vid-progress-text");d&&b&&(d.style.width=u+"%",b.textContent=u+"%")}),(p=document.getElementById("btn-generar-videos-run"))==null||p.addEventListener("click",async()=>{var te,oe,ae;const u=document.getElementById("btn-generar-videos-run"),d={},b=s?s.value:"filtrar";d.modo=b;const E=document.getElementById("vid-jugador").value,v=document.getElementById("vid-complejo").value,y=document.getElementById("vid-accion").value,f=document.getElementById("vid-resultado").value,k=document.getElementById("vid-margin-pre").value,q=document.getElementById("vid-margin-post").value,$=(te=document.getElementById("vid-set"))==null?void 0:te.value,K=(oe=document.getElementById("vid-mostrar-acciones"))==null?void 0:oe.checked,Ie=((ae=document.getElementById("vid-con-marcador"))==null?void 0:ae.checked)!==!1;b!=="puntos"&&b!=="favoritos"&&(E&&(d.jugador_nombre=E),v&&(d.complejo=v),y&&(d.tipo_accion=y),f&&(d.resultado=f)),$&&(d.set_numero=parseInt($,10)),K&&(d.mostrar_acciones=!0),d.con_marcador=Ie,d.pre_margin=k?parseFloat(k):3,d.post_margin=q?parseFloat(q):1,u.disabled=!0,u.textContent="⏳ Generando...";const O=document.getElementById("vid-progress-container"),Z=document.getElementById("vid-progress-bar"),ee=document.getElementById("vid-progress-text");O&&(O.style.display="block"),Z&&(Z.style.width="0%"),ee&&(ee.textContent="0%");try{await window.api.generateVideoHighlights(e.partidoId,d)&&(m("Vídeo generado con éxito","success"),o.style.display="none",e.wizardModalAbierto=!1)}catch(ie){m(ie.message||"Error al generar vídeo","error")}finally{u.disabled=!1,u.textContent="✂️ Generar Vídeo (Combina la jugada)",O&&(O.style.display="none")}}),document.getElementById("edit-action-modal"),document.getElementById("edit-tipo").addEventListener("change",u=>{ke(u.target.value,"")}),n.addEventListener("click",async()=>{if(!e.editingActionId)return;const u={jugador_nombre:document.getElementById("edit-jugador").value,tipo_accion:document.getElementById("edit-tipo").value,subtipo:document.getElementById("edit-subtipo").value,resultado:document.getElementById("edit-resultado").value,video_timestamp:parseFloat(document.getElementById("edit-tiempo").value)||0};await window.api.updateAccion(e.editingActionId,u);const d=e.acciones.findIndex(b=>b.id===e.editingActionId);d!==-1&&(e.acciones[d]={...e.acciones[d],...u}),m("Acción actualizada","success"),a.style.display="none",e.wizardModalAbierto=!1,e.editingActionId=null,x()})}function $e(){const{partido:a}=e;return!a.video_tipo||!a.video_url?`
            <div class="video-placeholder">
                <div class="video-placeholder-icon">🎬</div>
                <p>Sin vídeo cargado</p>
                <p style="font-size: 12px; margin-top: 4px;">Puedes añadir un vídeo editando el partido</p>
            </div>
        `:a.video_tipo==="youtube"?(ne(a.video_url),`
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
        <video id="local-video" preload="metadata">
            <source src="${a.video_url.startsWith("http")?a.video_url:`local-video://video?path=${encodeURIComponent(a.video_url)}`}">
            Tu navegador no soporta la reproducción de vídeo
        </video>
        <div class="video-controls" id="video-controls">
            <button id="btn-play-pause">▶</button>
            <div class="video-progress" id="video-progress">
                <div class="video-progress-bar" id="video-progress-bar"></div>
            </div>
            <span class="video-time" id="video-time">00:00 / 00:00</span>
            <div style="display:flex; align-items:center; gap:2px; margin-left:8px; margin-right:8px;">
                <button id="btn-speed-down" style="background:transparent; border:none; color:white; cursor:pointer;" title="Reducir Velocidad">-</button>
                <span class="speed-indicator" id="speed-indicator" style="min-width:30px; text-align:center;">1x</span>
                <button id="btn-speed-up" style="background:transparent; border:none; color:white; cursor:pointer;" title="Aumentar Velocidad">+</button>
            </div>
            <button id="btn-fullscreen">⛶</button>
        </div>
    `}function re(a){const t=document.getElementById("btn-yt-iframe"),n=document.getElementById("btn-yt-download");if(t&&n){t.addEventListener("click",()=>{var E;const d=ne(e.partido.video_url),b=document.getElementById("video-container");b&&d?((E=document.querySelector(".scouting-layout"))==null||E.classList.remove("youtube-choice-active"),b.innerHTML=`
                    <div style="position:relative; width:100%; height:100%; aspect-ratio:16/9; background:#000;">
                        <iframe id="yt-iframe-player" src="https://www.youtube.com/embed/${d}?autoplay=1&enablejsapi=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%; height:100%; border:none;"></iframe>
                    </div>
                `,m("Reproduciendo Streaming directo de YouTube","success"),se()):m("URL de YouTube no válida","error")}),n.addEventListener("click",()=>{var d;(d=document.querySelector(".scouting-layout"))==null||d.classList.remove("youtube-choice-active"),m("Preparando vídeo y análisis local de silbatos…","info"),Te()});return}const o=document.getElementById("local-video");if(!o)return;const i=document.getElementById("video-progress-bar"),s=document.getElementById("video-time"),c=document.getElementById("btn-play-pause"),r=document.getElementById("video-progress"),l=document.getElementById("btn-fullscreen");o.addEventListener("timeupdate",()=>{const d=o.currentTime/o.duration*100;i.style.width=d+"%",s.textContent=`${j(o.currentTime)} / ${j(o.duration)}`}),o.addEventListener("play",()=>{c.textContent="⏸"}),o.addEventListener("pause",()=>{c.textContent="▶"}),c.addEventListener("click",()=>{o.paused?o.play():o.pause()}),r.addEventListener("click",d=>{const b=r.getBoundingClientRect(),E=(d.clientX-b.left)/b.width;o.currentTime=E*o.duration}),l.addEventListener("click",()=>{const d=document.getElementById("video-container");document.fullscreenElement?document.exitFullscreen():d.requestFullscreen()});const p=document.getElementById("btn-speed-down");p&&p.addEventListener("click",()=>G(-.25));const u=document.getElementById("btn-speed-up");u&&u.addEventListener("click",()=>G(.25)),o.addEventListener("keydown",d=>{d.key===w("playa","video-backward")?(d.preventDefault(),T(-(D().videoSeekSeconds||5))):d.key===w("playa","video-forward")?(d.preventDefault(),T(D().videoSeekSeconds||5)):d.key===w("playa","video-play")&&(d.preventDefault(),he())})}async function Te(a){var r,l,p;const t=document.getElementById("yt-status-msg"),n=document.getElementById("yt-progress-bar-wrap"),o=document.getElementById("yt-progress-bar-inner"),i=document.getElementById("whistle-progress-wrap"),s=document.getElementById("whistle-progress-bar"),c=document.getElementById("video-container");t&&(t.textContent="Iniciando descarga del vídeo...",t.style.display="block"),n&&(n.style.display="block"),o&&(o.style.width="0%"),(r=window.api)!=null&&r.onYtProgress&&window.api.onYtProgress(u=>{o&&u.percent!==void 0&&(o.style.width=`${Math.min(100,Math.max(0,u.percent))}%`),t&&u.text&&(t.textContent=`Descargando: ${u.text}`)});try{const u=await window.api.resolveYoutube(e.partido.video_url);if(o&&(o.style.width="100%"),t&&(t.textContent="Analizando silbatos localmente…"),i&&(i.style.display="block"),!window.api.analyzeWhistles||!window.api.onWhistleProgress)t&&(t.textContent="⚠️ Reinicia BVScouter para activar el análisis local de silbatos."),m("Reinicia la aplicación para activar el análisis de silbatos","warning");else{(p=(l=window.api).onWhistleProgress)==null||p.call(l,d=>{s&&(s.style.width=`${d.percent||0}%`)});try{const d=await window.api.analyzeWhistles(u);t&&(t.textContent=`✅ Análisis terminado: ${d.length} silbatos cargados`),s&&(s.style.width="100%"),m(`Análisis terminado: ${d.length} silbatos cargados`,"success")}catch(d){console.warn("No se pudo analizar los silbatos:",d),t&&(t.textContent="No se pudieron analizar los silbatos")}}c&&(c.innerHTML=`
                <video id="local-video" preload="metadata">
                    <source src="${u}">
                    Tu navegador no soporta la reproducción de vídeo
                </video>
                <div class="video-controls" id="video-controls">
                    <button id="btn-play-pause">▶</button>
                    <div class="video-progress" id="video-progress">
                        <div class="video-progress-bar" id="video-progress-bar"></div>
                    </div>
                    <span class="video-time" id="video-time">00:00 / 00:00</span>
                    <div style="display:flex; align-items:center; gap:2px; margin-left:8px; margin-right:8px;">
                        <button id="btn-speed-down" style="background:transparent; border:none; color:white; cursor:pointer;" title="Reducir Velocidad">-</button>
                        <span class="speed-indicator" id="speed-indicator" style="min-width:30px; text-align:center;">1x</span>
                        <button id="btn-speed-up" style="background:transparent; border:none; color:white; cursor:pointer;" title="Aumentar Velocidad">+</button>
                    </div>
                    <button id="btn-fullscreen">⛶</button>
                </div>
            `,re(c),window.api.analyzeWhistles&&le(u))}catch(u){t&&(t.textContent=`Error al descargar: ${u.message}`),o&&(o.style.width="0%",o.style.background="#f44")}}function Ce(a){const{partido:t}=e;document.querySelectorAll(".player-btn").forEach(s=>{s.addEventListener("click",()=>{e.jugadorSeleccionado=s.dataset.player,document.querySelectorAll(".player-btn").forEach(c=>c.classList.remove("active")),s.classList.add("active"),B()})});const n=document.getElementById("switch-fullscreen");n&&n.addEventListener("change",s=>{e.allowFullscreenSelectors=s.target.checked;const c=document.getElementById("attack-modal");e.allowFullscreenSelectors?c.classList.remove("inline-modal"):c.classList.add("inline-modal")}),document.querySelectorAll(".action-btn").forEach(s=>{s.addEventListener("click",()=>{de(s.dataset.action)})});const o=document.getElementById("score-local"),i=document.getElementById("score-rival");o.addEventListener("click",()=>h("local",1)),o.addEventListener("contextmenu",s=>{s.preventDefault(),h("local",-1)}),i.addEventListener("click",()=>h("rival",1)),i.addEventListener("contextmenu",s=>{s.preventDefault(),h("rival",-1)}),document.getElementById("server-local").addEventListener("click",()=>U("local")),document.getElementById("server-rival").addEventListener("click",()=>U("rival")),document.getElementById("btn-confirmar").addEventListener("click",g),document.getElementById("btn-undo").addEventListener("click",Ee),document.getElementById("btn-finalizar-set").addEventListener("click",async()=>{if(e.marcadorLocal===e.marcadorRival){m("El marcador está empatado. Imposible finalizar set.","error");return}const s=e.marcadorLocal>e.marcadorRival,c=s?"Nuestra Pareja":"El Rival";confirm(`¿Finalizar el set ${e.setActual}?

Victoria para: ${c} (${e.marcadorLocal}-${e.marcadorRival})`)&&(await window.api.createAccion({partido_id:e.partidoId,jugador_nombre:e.partido.jugador1_nombre,complejo:"K1",tipo_accion:"fin_set",subtipo:"Ganador Set",resultado:s?"local":"rival",set_numero:e.setActual,marcador_local:e.marcadorLocal.toString(),marcador_rival:e.marcadorRival.toString(),video_timestamp:F(),zona_campo:""}),e.setActual++,e.marcadorLocal=0,e.marcadorRival=0,e.equipoAlSaque="local",ge(),x(),m(`Set finalizado. ¡Comienza el set ${e.setActual}!`,"success"))}),document.getElementById("btn-guardar-partido").addEventListener("click",async()=>{await N(),m("Partido guardado","success")}),document.getElementById("btn-ver-informe").addEventListener("click",async()=>{await N(),V(),A.navigate("informe",{partidoId:e.partidoId})}),document.getElementById("btn-volver").addEventListener("click",async()=>{await N(),V(),A.navigate("dashboard")}),document.getElementById("btn-fullscreen-timeline").addEventListener("click",()=>{const s=document.getElementById("timeline-container");s.classList.toggle("fullscreen-mode"),s.classList.contains("fullscreen-mode")?document.getElementById("btn-fullscreen-timeline").textContent="✖ Cerrar":document.getElementById("btn-fullscreen-timeline").textContent="⛶"}),A.registerDestroy(()=>{V(),R&&document.removeEventListener("mousedown",R),R=null})}function ze(a){V(),z=t=>{var i;if(t.target.tagName==="INPUT"||t.target.tagName==="TEXTAREA"||t.target.tagName==="SELECT"||t.target.isContentEditable||A.getCurrentPage()!=="scouting"||e.wizardModalAbierto&&t.key!=="Escape"||t.ctrlKey||t.metaKey||t.altKey)return;const n=t.key,o=_e("playa",n);if(o&&!(o.action==="selectPlayer"&&(e.tipoAccion==="recepcion"||e.tipoAccion==="defensa"))&&!(e.tipoAccion&&J("playa",e.tipoAccion,n)))switch(t.preventDefault(),o.action){case"selectPlayer":const s=o.value===1?e.partido.jugador1_nombre:e.partido.jugador2_nombre;e.jugadorSeleccionado=s,document.querySelectorAll(".player-btn").forEach(r=>r.classList.remove("active")),(i=document.querySelector(`[data-player="${s}"]`))==null||i.classList.add("active"),B();break;case"selectAction":de(o.value);break;case"resultPunto":case"markLastActionAsPoint":if(e.tipoAccion){g("punto");break}if(e.enterTimer){clearTimeout(e.enterTimer),e.enterTimer=null;const r={partido_id:e.partidoId,jugador_nombre:e.partido.jugador1_nombre,complejo:e.equipoAlSaque==="rival"?"K1":"K2",tipo_accion:"rival",subtipo:"Acierto Rival",resultado:"error",set_numero:e.setActual,marcador_local:e.marcadorLocal.toString(),marcador_rival:e.marcadorRival.toString(),video_timestamp:F(),zona_campo:""};window.api.createAccion(r).then(l=>{r.id=l,e.acciones.push(r),h("rival",1);const p=document.querySelector(".action-panel");p.classList.add("action-flash"),setTimeout(()=>p.classList.remove("action-flash"),500),x(),m("Acierto del rival registrado","info")})}else e.enterTimer=setTimeout(()=>{e.enterTimer=null},300);break;case"resultError":case"markLastActionAsError":if(e.tipoAccion){g("error");break}if(e.backspaceTimer){clearTimeout(e.backspaceTimer),e.backspaceTimer=null;const r={partido_id:e.partidoId,jugador_nombre:e.partido.jugador1_nombre,complejo:e.equipoAlSaque==="rival"?"K1":"K2",tipo_accion:"rival",subtipo:"Error Rival",resultado:"punto",set_numero:e.setActual,marcador_local:e.marcadorLocal.toString(),marcador_rival:e.marcadorRival.toString(),video_timestamp:F(),zona_campo:""};window.api.createAccion(r).then(l=>{r.id=l,e.acciones.push(r),h("local",1);const p=document.querySelector(".action-panel");p.classList.add("action-flash"),setTimeout(()=>p.classList.remove("action-flash"),500),x(),m("Error del Rival registrado (punto a favor)","success")})}else e.backspaceTimer=setTimeout(()=>{e.backspaceTimer=null;const r={partido_id:e.partidoId,jugador_nombre:e.partido.jugador1_nombre,complejo:e.equipoAlSaque==="rival"?"K1":"K2",tipo_accion:"error_general",subtipo:"Error",resultado:"error",set_numero:e.setActual,marcador_local:e.marcadorLocal.toString(),marcador_rival:e.marcadorRival.toString(),video_timestamp:F(),zona_campo:""};window.api.createAccion(r).then(l=>{r.id=l,e.acciones.push(r),h("rival",1);const p=document.querySelector(".action-panel");p.classList.add("action-flash"),setTimeout(()=>p.classList.remove("action-flash"),500),x(),m("Error General registrado (punto rival)","error")})},300);break;case"resultBloqueado":e.tipoAccion&&g("bloqueado");break;case"resultPositiva":e.tipoAccion&&g("positiva");break;case"resultNegativa":e.tipoAccion&&g("negativa");break;case"undo":Ee();break;case"videoPlayPause":he();break;case"videoForward":T(D().videoSeekSeconds||5);break;case"videoBackward":T(-(D().videoSeekSeconds||5));break;case"videoFrameForward":T(1/30);break;case"videoFrameBackward":T(-1/30);break;case"videoSlower":G(-.25);break;case"videoFaster":G(.25);break;case"videoFullscreen":const c=document.getElementById("video-container");document.fullscreenElement?document.exitFullscreen():c==null||c.requestFullscreen();break;case"videoReverse":Re();break}},P=t=>{if(!t.defaultPrevented&&!(t.target.tagName==="INPUT"||t.target.tagName==="TEXTAREA"||t.target.tagName==="SELECT"||t.target.isContentEditable)&&A.getCurrentPage()==="scouting"){if(t.key==="Escape"){if(e.wizardModalAbierto){I();return}else if(e.tipoAccion){e.tipoAccion=null,e.subtipo=null,document.querySelectorAll(".action-btn").forEach(n=>n.classList.remove("selected")),document.getElementById("subtipo-container").style.display="none",B();return}}if(e.wizardModalAbierto){fe(t.key.toLowerCase());return}if(e.tipoAccion&&W[e.tipoAccion]){const o=J("playa",e.tipoAccion,t.key);o&&(t.preventDefault(),e.subtipo=o.label,e.ataqueModalAbierto&&closeAttackModal(),g())}}},document.addEventListener("keydown",z),document.addEventListener("keydown",P),S={down:t=>{if(t.key!==w("playa","video-speed-3x")||t.repeat||t.target.tagName==="INPUT"||t.target.tagName==="TEXTAREA"||A.getCurrentPage()!=="scouting"||e.tipoAccion&&J("playa",e.tipoAccion,t.key))return;const n=document.getElementById("local-video");if(n){n.playbackRate=3;const i=document.getElementById("speed-indicator");i&&(i.textContent="3x");return}const o=document.getElementById("yt-iframe-player");if(o){o.contentWindow.postMessage(JSON.stringify({event:"command",func:"setPlaybackRate",args:[3]}),"*");const i=document.getElementById("speed-indicator");i&&(i.textContent="3x")}},up:t=>{if(t.key!==w("playa","video-speed-3x")||A.getCurrentPage()!=="scouting")return;const n=document.getElementById("local-video");if(n){n.playbackRate=e.videoSpeed;const i=document.getElementById("speed-indicator");i&&(i.textContent=`${e.videoSpeed}x`);return}const o=document.getElementById("yt-iframe-player");if(o){o.contentWindow.postMessage(JSON.stringify({event:"command",func:"setPlaybackRate",args:[e.videoSpeed]}),"*");const i=document.getElementById("speed-indicator");i&&(i.textContent=`${e.videoSpeed}x`)}}},document.addEventListener("keydown",S.down),document.addEventListener("keyup",S.up)}function V(){z&&(document.removeEventListener("keydown",z),z=null),P&&(document.removeEventListener("keydown",P),P=null),S&&(document.removeEventListener("keydown",S.down),document.removeEventListener("keyup",S.up),S=null),_&&(window.removeEventListener("message",_),_=null),L&&(clearInterval(L),L=null),e&&e.reverseInterval&&(clearInterval(e.reverseInterval),e.reverseInterval=null)}function de(a){var t;if(e.tipoAccion=a,e.subtipo=null,document.querySelectorAll(".action-btn").forEach(n=>n.classList.remove("selected")),(t=document.querySelector(`[data-action="${a}"]`))==null||t.classList.add("selected"),a==="ataque"||a==="bloqueo"||a==="saque")Pe(a),document.getElementById("subtipo-container").style.display="none";else{const n=document.getElementById("subtipo-container");n.style.display="",document.getElementById("subtype-buttons").innerHTML=we(),document.querySelectorAll(".subtype-btn").forEach(o=>{o.addEventListener("click",()=>{e.subtipo=o.dataset.subtype,g()})})}B()}function Pe(a){e.wizardModalAbierto=!0,e.wizardActionType=a,e.attackWizard={step:1,type:null,dir:null,result:null},document.getElementById("attack-modal").style.display="flex",Y()}function I(){e.wizardModalAbierto=!1,document.getElementById("attack-modal").style.display="none",(e.tipoAccion==="ataque"||e.tipoAccion==="bloqueo"||e.tipoAccion==="saque")&&!e.subtipo&&(e.tipoAccion=null,document.querySelectorAll(".action-btn").forEach(a=>a.classList.remove("selected")),B())}const ce=()=>[{label:"Ataque",key:w("playa","wizard-attack")},{label:"Toque",key:w("playa","wizard-touch")},{label:"Acelerada",key:w("playa","wizard-accelerated")},{label:"Rejuego",key:w("playa","wizard-replay")},{label:"Lucha",key:w("playa","wizard-fight")}],ue=[{label:"Línea Larga",key:"1"},{label:"Línea Corta",key:"2"},{label:"Diago Larga",key:"3"},{label:"Diago Corta",key:"4"},{label:"Centro / Medio",key:"5"}],pe=[{label:"Línea",key:"1"},{label:"Diagonal",key:"2"},{label:"Centro / Medio",key:"3"}],me=[{label:"Punto",key:"1",result:"punto"},{label:"Error",key:"2",result:"error"},{label:"Continuidad (En sistema)",key:"3",result:"continuidad"},{label:"Continuidad (Fuera de sistema)",key:"4",result:"continuidad"},{label:"Bloqueado (Punto Rival)",key:"5",result:"bloqueado"},{label:"Bloqueado (Sigue en juego)",key:"6",result:"continuidad"}],ve=[{label:"Punto (Ace)",key:"1",result:"punto"},{label:"Error",key:"2",result:"error"},{label:"En Sistema",key:"3",result:"continuidad"},{label:"Fuera de Sistema",key:"4",result:"continuidad"}],be=[{label:"Punto (Bloqueo)",key:"1",result:"punto"},{label:"Error",key:"2",result:"error"},{label:"Continuidad",key:"3",result:"continuidad"}],ye=[{label:"Punto",key:"1",result:"punto"},{label:"Error",key:"2",result:"error"},{label:"Sigue en juego",key:"3",result:"continuidad"}];function Y(){const a=document.getElementById("attack-modal-content"),t=e.attackWizard,n=e.wizardActionType;let o="",i=[];n==="ataque"?t.step===1?(o="1. Tipo de Golpe",i=ce()):t.step===2?t.type.label==="Lucha"?(o="Resultado (Lucha)",i=ye):(o=`2. Dirección (${t.type.label})`,i=t.type.label==="Ataque"?pe:ue):t.step===3&&(o=`3. Resultado (${t.type.label} > ${t.dir.label})`,i=me):n==="bloqueo"?t.step===1&&(o="Resultado del Bloqueo",i=be):n==="saque"&&t.step===1&&(o="Resultado del Saque",i=ve),a.innerHTML=`
        <h2>${o}</h2>
        <div class="attack-grid">
            ${i.map(s=>`
                <button class="attack-option-btn wizard-btn" data-key="${s.key}">
                    ${s.label}
                    <span class="attack-shortcut">${s.key.toUpperCase()}</span>
                </button>
            `).join("")}
        </div>
        <div class="attack-hint">Pulsa la tecla correspondiente para seleccionar</div>
        <button class="btn btn-secondary mt-16" id="btn-close-attack">Cancelar (Esc)</button>
    `,document.getElementById("btn-close-attack").addEventListener("click",I),document.querySelectorAll(".wizard-btn").forEach(s=>{s.addEventListener("click",()=>{fe(s.dataset.key)})})}function fe(a){const t=e.attackWizard,n=e.wizardActionType;if(n==="ataque"){if(t.step===1){const o=ce().find(i=>i.key===a);o&&(t.type=o,o.label==="Rejuego"?(e.subtipo="Rejuego",I(),g("continuidad")):(t.step=2,Y()))}else if(t.step===2)if(t.type.label==="Lucha"){const o=ye.find(i=>i.key===a);if(o){t.result=o,e.subtipo="Lucha";const i=t.result.result;I(),g(i)}}else{const i=(t.type.label==="Ataque"?pe:ue).find(s=>s.key===a);i&&(t.dir=i,t.step=3,Y())}else if(t.step===3){const o=me.find(i=>i.key===a);if(o){t.result=o,e.subtipo=`${t.type.label} - ${t.dir.label}`;const i=t.result.result;I(),g(i)}}}else if(n==="bloqueo"){if(t.step===1){const o=be.find(i=>i.key===a);if(o){t.result=o,e.subtipo=o.label;const i=t.result.result;I(),g(i)}}}else if(n==="saque"&&t.step===1){const o=ve.find(i=>i.key===a);if(o){t.result=o,o.label==="En Sistema"||o.label,e.subtipo=o.label;const i=t.result.result;I(),g(i)}}}function h(a,t){a==="local"?(e.marcadorLocal=Math.max(0,e.marcadorLocal+t),t>0&&U("local")):(e.marcadorRival=Math.max(0,e.marcadorRival+t),t>0&&U("rival")),ge()}function U(a){e.equipoAlSaque=a,document.getElementById("server-local").classList.toggle("active",a==="local"),document.getElementById("server-rival").classList.toggle("active",a==="rival")}function ge(){document.getElementById("score-local").textContent=e.marcadorLocal,document.getElementById("score-rival").textContent=e.marcadorRival,document.getElementById("set-label").textContent=`SET ${e.setActual}`}function he(){const a=document.getElementById("local-video");if(a){a.paused?a.play():a.pause();return}const t=document.getElementById("yt-iframe-player");t&&(H===1?t.contentWindow.postMessage(JSON.stringify({event:"command",func:"pauseVideo",args:[]}),"*"):t.contentWindow.postMessage(JSON.stringify({event:"command",func:"playVideo",args:[]}),"*"))}function T(a){const t=document.getElementById("local-video");if(t){const o=Number.isFinite(t.currentTime)?t.currentTime:0,i=Number.isFinite(t.duration)&&t.duration>0?t.duration:null;let s=o+a;i!==null&&(s=Math.min(i,s)),t.currentTime=Math.max(0,s);return}const n=document.getElementById("yt-iframe-player");if(n){const o=M+a;n.contentWindow.postMessage(JSON.stringify({event:"command",func:"seekTo",args:[Math.max(0,o),!0]}),"*")}}function Me(a){const t=document.getElementById("yt-iframe-player");if(t){t.contentWindow.postMessage(JSON.stringify({event:"command",func:"seekTo",args:[a,!0]}),"*"),t.contentWindow.postMessage(JSON.stringify({event:"command",func:"playVideo",args:[]}),"*"),m(`Saltando a ${j(a)} en YouTube Stream`,"info");return}const n=document.getElementById("local-video");n&&Number.isFinite(a)&&(n.currentTime=Math.max(0,a),n.play().catch(()=>{}),m(`Saltando a ${j(a)}`,"info"))}function G(a){const t=document.getElementById("local-video");if(t){X(),e.videoSpeed=Math.max(.25,Math.min(4,e.videoSpeed+a)),t.playbackRate=e.videoSpeed;const o=document.getElementById("speed-indicator");o&&(o.textContent=`${e.videoSpeed}x`),m(`Velocidad: ${e.videoSpeed}x`,"info");return}const n=document.getElementById("yt-iframe-player");if(n){e.videoSpeed=Math.max(.25,Math.min(4,e.videoSpeed+a)),n.contentWindow.postMessage(JSON.stringify({event:"command",func:"setPlaybackRate",args:[e.videoSpeed]}),"*");const o=document.getElementById("speed-indicator");o&&(o.textContent=`${e.videoSpeed}x`),m(`Velocidad: ${e.videoSpeed}x`,"info")}}function X(){e.reverseInterval&&(clearInterval(e.reverseInterval),e.reverseInterval=null)}function Re(){const a=document.getElementById("local-video");if(a)if(e.reverseInterval){X(),a.playbackRate=e.videoSpeed;const t=document.getElementById("speed-indicator");t&&(t.textContent=`${e.videoSpeed}x`),m("Reversa desactivada","info")}else{a.pause(),a.playbackRate=1;const t=document.getElementById("speed-indicator");t&&(t.textContent="-1x"),m("Reversa 1x activada (L para salir)","info"),e.reverseInterval=setInterval(()=>{if(a.currentTime<=0){X();return}a.currentTime=Math.max(0,a.currentTime-.033)},33)}}function F(){const a=document.getElementById("local-video");return a?a.currentTime:document.getElementById("yt-iframe-player")?(L||se(),M||0):window.getCurrentVideoTime?window.getCurrentVideoTime():0}async function g(a=null){if(!e.tipoAccion){m("Selecciona un tipo de acción","error");return}if((e.acciones.length===0||["punto","error","bloqueado"].includes(e.acciones[e.acciones.length-1].resultado))&&e.tipoAccion!=="rival"&&e.tipoAccion!=="error_general"){const r=e.equipoAlSaque==="local"?"saque":"recepcion";if(e.tipoAccion!==r&&!confirm(`⚠️ ALERTA: El equipo ${e.equipoAlSaque} tiene el saque. El primer toque de este punto debería ser "${r.toUpperCase()}".

¿Ignorar y añadir de todos modos?`)){e.tipoAccion=null,e.subtipo=null,document.querySelectorAll(".action-btn").forEach(l=>l.classList.remove("selected")),document.getElementById("subtipo-container").style.display="none",B();return}}const n=e.equipoAlSaque==="rival"?"K1":"K2";let o=typeof a=="string"?a:"continuidad";if((e.subtipo==="Error (0)"||e.subtipo==="Error de Ataque"||e.subtipo==="Error (-)")&&(o="error"),e.subtipo==="Neutra"&&(o="neutra"),e.tipoAccion==="ataque"){let r=[];for(let p=e.acciones.length-1;p>=0;p--){const u=e.acciones[p];if(["punto","error","bloqueado"].includes(u.resultado)||u.tipo_accion==="fin_set")break;r.push(u)}const l=r.find(p=>p.tipo_accion!=="rival"&&p.tipo_accion!=="error_general"&&p.tipo_accion!=="fin_set");l&&(l.tipo_accion==="recepcion"||l.tipo_accion==="defensa")&&l.jugador_nombre!==e.jugadorSeleccionado&&e.subtipo&&!e.subtipo.includes("2º Toque")&&(e.subtipo+=" (2º Toque)")}const i={partido_id:e.partidoId,jugador_nombre:e.jugadorSeleccionado,complejo:n,tipo_accion:e.tipoAccion,subtipo:e.subtipo||"",resultado:o,set_numero:e.setActual,marcador_local:e.marcadorLocal.toString(),marcador_rival:e.marcadorRival.toString(),video_timestamp:F(),zona_campo:""},s=await window.api.createAccion(i);i.id=s,e.acciones.push(i),o==="punto"?(h("local",1),N()):(o==="error"||o==="bloqueado")&&(h("rival",1),N());const c=document.querySelector(".action-panel");c.classList.add("action-flash"),setTimeout(()=>c.classList.remove("action-flash"),500),x(),e.tipoAccion=null,e.subtipo=null,document.querySelectorAll(".action-btn").forEach(r=>r.classList.remove("selected")),document.getElementById("subtipo-container").style.display="none",B(),m(`Acción guardada (J${i.jugador_id} - ${i.tipo_accion})`,"success")}function x(){const a=document.getElementById("timeline-items"),t=document.querySelector(".timeline-title");t.textContent=`Historial de Acciones (${e.acciones.length})`,a.innerHTML=xe(),a.querySelectorAll(".btn-delete-action").forEach(n=>{n.addEventListener("click",async()=>{const o=parseInt(n.dataset.actionId,10);confirm("¿Seguro que quieres eliminar esta acción?")&&(await window.api.deleteAccion(o),e.acciones=e.acciones.filter(i=>i.id!==o),x())})}),a.querySelectorAll(".btn-edit-action").forEach(n=>{n.addEventListener("click",()=>{const o=parseInt(n.dataset.actionId,10),i=e.acciones.find(c=>c.id===o);if(!i)return;e.editingActionId=o,document.getElementById("edit-jugador").value=i.jugador_nombre,document.getElementById("edit-tipo").value=i.tipo_accion,ke(i.tipo_accion,i.subtipo||""),document.getElementById("edit-resultado").value=i.resultado||"continuidad";const s=document.getElementById("edit-tiempo");s&&(s.value=(i.video_timestamp||0).toFixed(2)),document.getElementById("edit-action-modal").style.display="flex",e.wizardModalAbierto=!0})}),a.querySelectorAll(".btn-fav-rally").forEach(n=>{n.addEventListener("click",async()=>{const o=n.dataset.rallyIds;if(!o)return;const i=o.split(",").map(r=>parseInt(r,10)),s=e.acciones.filter(r=>i.includes(r.id));if(s.length===0)return;const c=s.every(r=>r.es_favorito)?0:1;for(const r of s)r.es_favorito=c,await window.api.updateAccion(r.id,{es_favorito:c});m(c?"Punto añadido a favoritos ★":"Punto quitado de favoritos",c?"success":"info"),x()})}),a.querySelectorAll(".btn-delete-rally").forEach(n=>{n.addEventListener("click",async()=>{const o=n.dataset.rallyIds;if(!o)return;const i=o.split(",").map(s=>parseInt(s,10));if(confirm("¿Seguro que quieres eliminar todas las acciones de este punto?")){for(const s of i)await window.api.deleteAccion(s);e.acciones=e.acciones.filter(s=>!i.includes(s.id)),x()}})}),a.querySelectorAll(".timeline-item").forEach(n=>{n.addEventListener("click",o=>{if(o.target.closest("button"))return;const i=parseFloat(n.dataset.timestamp);Number.isFinite(i)&&Me(i)})}),Fe()}async function Ee(){if(e.acciones.length===0){m("No hay acciones para deshacer","error");return}const a=e.acciones[e.acciones.length-1];a.resultado==="punto"?(a.tipo_accion==="error_general"||a.tipo_accion,h("local",-1)):(a.resultado==="error"||a.resultado==="bloqueado")&&(a.tipo_accion==="error_general"||a.tipo_accion,h("rival",-1)),await window.api.undoLastAccion(e.partidoId),e.acciones.pop(),x(),m("Última acción deshecha","info")}async function N(){const a=`${e.marcadorLocal}-${e.marcadorRival}`;e.partido.resultado=a,await window.api.updatePartido(e.partidoId,{resultado:a})}function we(){return e.tipoAccion?(W[e.tipoAccion]||[]).map(t=>`
        <button class="subtype-btn ${e.subtipo===t.label?"selected":""}" data-subtype="${t.label}">
            ${t.label} <span class="shortcut-hint">${t.key.toUpperCase()}</span>
        </button>
    `).join(""):""}function xe(){const a=[];let t=[];const{acciones:n}=e;for(let o=0;o<n.length;o++){const i=n[o];t.push(i);const s=["punto","error","bloqueado"].includes(i.resultado);let c=!1;if(o<n.length-1){const l=n[o+1];(i.marcador_local!==l.marcador_local||i.marcador_rival!==l.marcador_rival)&&(c=!0)}let r=!1;o<n.length-1&&(r=n[o+1].tipo_accion==="saque"),(s||c||r)&&(a.push({marcador_local:t[0].marcador_local,marcador_rival:t[0].marcador_rival,acciones:t}),t=[])}return t.length>0&&a.push({marcador_local:t[0].marcador_local,marcador_rival:t[0].marcador_rival,acciones:t}),a.reverse().map(o=>{const i=o.acciones.map(l=>l.id).join(","),s=o.acciones.length>0&&o.acciones.every(l=>l.es_favorito),c=`<div class="rally-header">
            <span>Marcador: ${o.marcador_local} - ${o.marcador_rival}</span>
            <div class="rally-header-actions">
                <button class="btn-fav-rally ${s?"is-fav":""}" data-rally-ids="${i}" title="${s?"Quitar punto de favoritos":"Marcar punto como favorito"}">
                    <span class="fav-star">${s?"★":"☆"}</span>
                </button>
                <button class="btn-delete-rally" data-rally-ids="${i}" title="Eliminar Punto (y todas sus acciones)">🗑️</button>
            </div>
        </div>`,r=o.acciones.map(l=>{var v,y;const p=l.resultado||"continuidad",u=((v=Q[l.tipo_accion])==null?void 0:v.label)||l.tipo_accion;let b=l.jugador_nombre===e.partido.jugador1_nombre?"J1":"J2";l.tipo_accion==="rival"&&(b="RIVAL"),l.tipo_accion==="error_general"&&(b="LOCAL");const E=l.complejo||"K1";return`
                <div class="timeline-item ${p}" data-timestamp="${l.video_timestamp||0}" style="cursor:pointer;" title="Haz clic para saltar al minuto ${j(l.video_timestamp)} en el vídeo">
                    <span class="timestamp">${j(l.video_timestamp)}</span>
                    <span class="complex-badge">${E}</span>
                    <strong>${b}</strong>
                    ${l.tipo_accion!=="rival"&&l.tipo_accion!=="error_general"?u:""}
                    ${l.subtipo?`· ${l.subtipo}`:""}
                    ${((y=Se[p])==null?void 0:y.icon)||""}
                    <div style="margin-left: auto; display: flex; gap: 4px;">
                        <button class="btn-edit-action" data-action-id="${l.id}" title="Editar Acción">✏️</button>
                        <button class="btn-delete-action" data-action-id="${l.id}" title="Eliminar Acción">×</button>
                    </div>
                </div>
            `}).join("");return`<div class="rally-group">${c}<div class="rally-actions">${r}</div></div>`}).join("")}function Ae(){const{acciones:a,partido:t}=e,n=Le(a,t.jugador1_nombre,t.jugador2_nombre),o=n.jugador1,i=n.jugador2;return`
        <div class="live-stat-card">
            <div class="live-stat-value text-accent" style="font-size: 20px;">${o.sideOutFirstPct}% <span style="font-size: 14px; opacity: 0.7;">(${o.fbsoPuntos}/${o.totalK1})</span></div>
            <div class="live-stat-label">FBSO ${t.jugador1_nombre}</div>
            <div style="font-size: 10px; opacity: 0.5; margin-top: 2px;">Puntos con 1 ataque / recepciones</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value text-accent" style="font-size: 20px;">${i.sideOutFirstPct}% <span style="font-size: 14px; opacity: 0.7;">(${i.fbsoPuntos}/${i.totalK1})</span></div>
            <div class="live-stat-label">FBSO ${t.jugador2_nombre}</div>
            <div style="font-size: 10px; opacity: 0.5; margin-top: 2px;">Puntos con 1 ataque / recepciones</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value" style="font-size: 20px;">${o.totalK1>0?Math.round(o.puntosK1/o.totalK1*100):0}% <span style="font-size: 14px; opacity: 0.7;">(${o.puntosK1}/${o.totalK1})</span></div>
            <div class="live-stat-label">K1 General ${t.jugador1_nombre}</div>
            <div style="font-size: 10px; opacity: 0.5; margin-top: 2px;">Puntos ganados / recepciones</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value" style="font-size: 20px;">${i.totalK1>0?Math.round(i.puntosK1/i.totalK1*100):0}% <span style="font-size: 14px; opacity: 0.7;">(${i.puntosK1}/${i.totalK1})</span></div>
            <div class="live-stat-label">K1 General ${t.jugador2_nombre}</div>
            <div style="font-size: 10px; opacity: 0.5; margin-top: 2px;">Puntos ganados / recepciones</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value" style="color: var(--accent-success)">${o.killsAtaque+i.killsAtaque}</div>
            <div class="live-stat-label">Ataques Ganadores</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value" style="color: var(--accent-error)">${o.erroresAtaque+i.erroresAtaque}</div>
            <div class="live-stat-label">Errores de Ataque</div>
        </div>
    `}function Fe(){const a=document.getElementById("live-stats");a&&(a.innerHTML=Ae())}function B(){const a=document.getElementById("current-action-text");if(!a)return;const t=[],n=e.jugadorSeleccionado===e.partido.jugador1_nombre;t.push(n?e.partido.jugador1_nombre:e.partido.jugador2_nombre);const o=e.equipoAlSaque==="rival"?"K1":"K2";if(t.push(`[${o}]`),e.tipoAccion){const i=Q[e.tipoAccion];i&&t.push(i.label)}e.subtipo&&t.push(e.subtipo),a.textContent=t.join(" → ")}function ke(a,t){const n=document.getElementById("edit-subtipo");if(n&&(n.innerHTML='<option value="">Sin definir</option>',W[a]&&(W[a].forEach(o=>{const i=document.createElement("option");i.value=o.label,i.textContent=o.label,n.appendChild(i)}),a==="saque"&&["En Sistema","Fuera de Sistema","Punto (Ace)","Error"].forEach(i=>{if(!Array.from(n.options).some(s=>s.value===i)){const s=document.createElement("option");s.value=i,s.textContent=i,n.appendChild(s)}})),t))if(Array.from(n.options).some(o=>o.value===t))n.value=t;else{const o=t.split(" - ")[0];if(Array.from(n.options).some(i=>i.value===o))n.value=o;else{const i=document.createElement("option");i.value=t,i.textContent=t+" (Original)",n.appendChild(i),n.value=t}}}function Ne(){var E;console.log("[Ajustes] Inicializando setupAjustesEvents...");const a=document.getElementById("modal-ajustes-partido"),t=document.getElementById("btn-ajustes-partido"),n=document.getElementById("btn-ajustes-cancelar"),o=document.getElementById("btn-ajustes-guardar"),i=document.getElementById("btn-ajustes-elegir-local"),s=document.getElementById("ajustes-torneo"),c=document.getElementById("ajustes-fase"),r=document.getElementById("ajustes-youtube-url"),l=document.getElementById("ajustes-local-path"),p=document.getElementById("ajustes-group-youtube"),u=document.getElementById("ajustes-group-local");console.log("[Ajustes] Elementos encontrados:",{modal:!!a,btnOpen:!!t,btnCancel:!!n,btnSave:!!o,btnElegirLocal:!!i}),document.querySelectorAll('input[name="ajustes-video-tipo"]').forEach(v=>{v.addEventListener("change",y=>{try{const f=y.target.value;console.log("[Ajustes] Cambiado tipo de vídeo a:",f),p&&(p.style.display=f==="youtube"?"block":"none"),u&&(u.style.display=f==="local"?"block":"none")}catch(f){console.error("[Ajustes] Error en radio change:",f)}})}),t?t.addEventListener("click",()=>{console.log("[Ajustes] Click en botón Abrir Ajustes");try{const v=e.partido;if(!v){console.error("[Ajustes] scoutingState.partido está indefinido!");return}s&&(s.value=v.torneo||""),c&&(c.value=v.fase||"");const y=v.video_tipo||"ninguno";console.log("[Ajustes] Tipo de vídeo del partido actual:",y);const f=document.querySelector(`input[name="ajustes-video-tipo"][value="${y}"]`);if(f)f.checked=!0;else{const k=document.querySelector('input[name="ajustes-video-tipo"][value="ninguno"]');k&&(k.checked=!0)}p&&(p.style.display=y==="youtube"?"block":"none"),u&&(u.style.display=y==="local"?"block":"none"),y==="youtube"?r&&(r.value=v.video_url||""):y==="local"?l&&(l.value=v.video_url||""):(r&&(r.value=""),l&&(l.value="")),a?(a.style.setProperty("display","flex","important"),a.style.setProperty("position","fixed","important"),a.style.setProperty("top","0","important"),a.style.setProperty("left","0","important"),a.style.setProperty("width","100vw","important"),a.style.setProperty("height","100vh","important"),a.style.setProperty("z-index","999999","important"),a.style.setProperty("background-color","rgba(10, 14, 23, 0.95)","important"),console.log("[Ajustes] Estilos del modal forzados correctamente a flex.")):console.error("[Ajustes] No se encontró el elemento modal-ajustes-partido en el DOM!"),e.wizardModalAbierto=!0}catch(v){console.error("[Ajustes] Error al abrir el modal:",v)}}):console.warn("[Ajustes] No se encontró el botón btn-ajustes-partido en el DOM");const b=()=>{console.log("[Ajustes] Click en Cancelar/Cerrar"),a&&(a.style.display="none"),e.wizardModalAbierto=!1};n==null||n.addEventListener("click",b),(E=document.getElementById("btn-ajustes-cancelar-x"))==null||E.addEventListener("click",b),i==null||i.addEventListener("click",async()=>{console.log("[Ajustes] Click en Elegir Vídeo Local");try{const v=await window.api.openVideoFile();v&&l&&(l.value=v)}catch(v){console.error("[Ajustes] Error al seleccionar archivo local:",v)}}),o==null||o.addEventListener("click",async()=>{console.log("[Ajustes] Click en Guardar Ajustes");try{const v=s?s.value.trim():"",y=c?c.value:"",f=document.querySelector('input[name="ajustes-video-tipo"]:checked'),k=f?f.value:"ninguno";let q=null,$=null;k==="youtube"?(q="youtube",$=r?r.value.trim():""):k==="local"&&(q="local",$=l?l.value.trim():"");const K={torneo:v,fase:y,video_tipo:q,video_url:$};console.log("[Ajustes] Guardando datos del partido:",K),await window.api.updatePartido(e.partidoId,K),m("Ajustes del partido actualizados","success"),a&&(a.style.display="none"),e.wizardModalAbierto=!1,A.navigate("scouting",{partidoId:e.partidoId})}catch(v){console.error("[Ajustes] Error al guardar cambios:",v)}})}export{Ve as registerScouting};
