import{r as m,d as C}from"./index-mPRRmVeE.js";import{a as R,s as r}from"./helpers-Doah0GRy.js";function M(){m.register("nuevo-partido-pista",async L=>{var f,h,x;let b=[];try{b=await window.apiPista.getEquipos()}catch(e){console.error("Error cargando equipos",e)}L.innerHTML=`
            <div class="nuevo-partido-page">
                <div class="page-header">
                    <h1 class="page-title">➕ Nuevo Partido (Pista)</h1>
                    <p class="page-subtitle">Configura el partido de voleibol pista antes de empezar el scouting</p>
                </div>

                <div class="card" style="max-width: 900px; margin: 0 auto;">
                    <form id="form-partido">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Fecha del Partido *</label>
                                <input type="date" class="form-input" id="input-fecha" value="${R()}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Torneo</label>
                                <input type="text" class="form-input" id="input-torneo" placeholder="Ej: Superliga 2">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Fase</label>
                                <select class="form-select" id="input-fase">
                                    <option value="">Seleccionar fase...</option>
                                    ${C.map(e=>`<option value="${e}">${e}</option>`).join("")}
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Equipo a Analizar *</label>
                                <select class="form-select" id="select-equipo" required>
                                    <option value="">Selecciona un equipo...</option>
                                    ${b.map(e=>`<option value="${e.id}">${e.nombre}</option>`).join("")}
                                    <option value="NEW">➕ Escribir manualmente (Nuevo equipo)</option>
                                </select>
                                <input type="text" class="form-input mt-2" id="input-equipo-nombre" placeholder="Nombre del equipo" style="display: none; margin-top: 8px;">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Equipo Rival *</label>
                                <input type="text" class="form-input" id="input-rival" placeholder="Ej: CV Teruel" required>
                            </div>
                        </div>

                        <div class="form-group" style="margin-top: 12px; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border);">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 500; color: var(--text-primary); margin-bottom: 0;">
                                <input type="checkbox" id="input-llevar-rotaciones" style="width: 18px; height: 18px; cursor: pointer;">
                                🔄 Llevar control de rotaciones y posiciones en pista
                            </label>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-left: 28px; margin-top: 4px;">
                                Activa el campo virtual en scouting, rotación automática en Side-Out (K1) y configuración inicial por set.
                            </div>
                        </div>

                        <hr style="border: none; border-top: 1px solid var(--border); margin: 24px 0;">

                        <div class="flex justify-between items-center" style="margin-bottom: 16px;">
                            <h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary);">
                                📋 Roster del Partido
                            </h3>
                            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-player">
                                ➕ Añadir Jugador
                            </button>
                        </div>
                        <p class="text-muted" style="font-size:12px; margin-top:-8px; margin-bottom: 16px;">Configura los jugadores que participan en este partido.</p>

                        <div class="table-container" style="margin-bottom: 24px;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th style="width: 80px;">Dorsal</th>
                                        <th>Nombre</th>
                                        <th>Apellidos</th>
                                        <th style="width: 140px;">Posición</th>
                                        <th style="width: 80px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="roster-tbody">
                                    <!-- Rows added dynamically -->
                                </tbody>
                            </table>
                        </div>

                        <hr style="border: none; border-top: 1px solid var(--border); margin: 24px 0;">

                        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">
                            🎬 Vídeo del Partido
                        </h3>

                        <div class="form-group">
                            <label class="form-label">Tipo de Vídeo</label>
                            <div class="flex gap-12">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary);">
                                    <input type="radio" name="video-tipo" value="youtube" checked id="radio-youtube"> YouTube
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary);">
                                    <input type="radio" name="video-tipo" value="local" id="radio-local"> Archivo Local
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary);">
                                    <input type="radio" name="video-tipo" value="none" id="radio-none"> Sin Vídeo
                                </label>
                            </div>
                        </div>

                        <div class="form-group" id="youtube-input-group">
                            <label class="form-label">URL de YouTube</label>
                            <input type="text" class="form-input" id="input-youtube-url" placeholder="https://www.youtube.com/watch?v=...">
                        </div>

                        <div class="form-group" id="local-input-group" style="display: none;">
                            <label class="form-label">Archivo de Vídeo</label>
                            <div class="flex gap-12 items-center">
                                <button type="button" class="btn btn-secondary" id="btn-seleccionar-video">📁 Seleccionar Archivo</button>
                                <span id="video-file-name" class="text-muted" style="font-size: 13px;">Ningún archivo seleccionado</span>
                            </div>
                            <label class="setting-hint" style="display:block; margin-top:10px; cursor:pointer;"><input type="checkbox" id="input-detect-whistles"> Analizar localmente los silbatos para navegar con Mouse Atrás/Adelante</label>
                        </div>

                        <div class="flex gap-12" style="margin-top: 24px;">
                            <button type="submit" class="btn btn-primary btn-lg">
                                🏐 Crear e Iniciar Scouting
                            </button>
                            <button type="button" class="btn btn-secondary btn-lg" id="btn-solo-crear">
                                💾 Solo Guardar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;const c=document.getElementById("select-equipo"),a=document.getElementById("input-equipo-nombre"),l=document.getElementById("roster-tbody"),P=document.getElementById("btn-add-player"),v=(e={})=>{const t=document.createElement("tr");return t.className="roster-row",e.id&&(t.dataset.jugadorId=e.id),t.innerHTML=`
                <td>
                    <input type="number" class="form-input roster-dorsal" style="width: 100%" value="${e.dorsal||""}" min="0" max="99" required>
                </td>
                <td>
                    <input type="text" class="form-input roster-nombre" style="width: 100%" value="${e.nombre||""}" ${e.id?'readonly style="background-color: var(--surface-hover);"':""}>
                </td>
                <td>
                    <input type="text" class="form-input roster-apellidos" style="width: 100%" value="${e.apellidos||""}" ${e.id?'readonly style="background-color: var(--surface-hover);"':""}>
                </td>
                <td>
                    <select class="form-select roster-posicion" style="width: 100%">
                        <option value="">--</option>
                        <option value="Colocador" ${e.posicion==="Colocador"?"selected":""}>Colocador</option>
                        <option value="Opuesto" ${e.posicion==="Opuesto"?"selected":""}>Opuesto</option>
                        <option value="Receptor" ${e.posicion==="Receptor"?"selected":""}>Receptor</option>
                        <option value="Central" ${e.posicion==="Central"?"selected":""}>Central</option>
                        <option value="Líbero" ${e.posicion==="Líbero"?"selected":""}>Líbero</option>
                    </select>
                </td>
                <td style="text-align: right;">
                    <button type="button" class="btn btn-secondary btn-sm text-danger btn-remove-row" title="Eliminar">🗑️</button>
                </td>
            `,t.querySelector(".btn-remove-row").addEventListener("click",()=>{t.remove()}),t};c.addEventListener("change",async e=>{const t=e.target.value;if(t==="NEW")a.style.display="block",a.required=!0,l.innerHTML="";else if(t){a.style.display="none",a.required=!1;try{const i=await window.apiPista.getJugadoresByEquipo(t);l.innerHTML="",i&&i.length>0&&i.forEach(p=>{l.appendChild(v(p))})}catch(i){console.error("Error loading roster",i),r("Error al cargar jugadores del equipo","error"),l.innerHTML=""}}else a.style.display="none",a.required=!1,l.innerHTML=""}),P.addEventListener("click",()=>{l.appendChild(v())}),document.querySelectorAll('input[name="video-tipo"]').forEach(e=>{e.addEventListener("change",()=>{const t=document.querySelector('input[name="video-tipo"]:checked').value;document.getElementById("youtube-input-group").style.display=t==="youtube"?"block":"none",document.getElementById("local-input-group").style.display=t==="local"?"flex":"none"})});let y="";(f=document.getElementById("btn-seleccionar-video"))==null||f.addEventListener("click",async()=>{if(window.api&&window.api.openVideoFile){const e=await window.api.openVideoFile();if(e){y=e;const t=e.split("/").pop().split("\\\\").pop();document.getElementById("video-file-name").textContent=t}}});const g=async e=>{var w,E;const t=c.value,i=document.getElementById("input-rival").value.trim();if(!t||!i){r("Rellena todos los campos obligatorios","error");return}let p=null,u="";if(t==="NEW"){if(u=a.value.trim(),!u){r("Introduce el nombre del nuevo equipo","error");return}}else p=parseInt(t,10),u=c.options[c.selectedIndex].text;const n=document.querySelector('input[name="video-tipo"]:checked').value;let s="";n==="youtube"?s=document.getElementById("input-youtube-url").value.trim():n==="local"&&(s=y);const A={fecha:document.getElementById("input-fecha").value,torneo:document.getElementById("input-torneo").value.trim(),fase:document.getElementById("input-fase").value,equipo_id:p,equipo_nombre:u,rival_nombre:i,video_tipo:n==="none"?"":n,video_url:s,llevar_rotaciones:(w=document.getElementById("input-llevar-rotaciones"))!=null&&w.checked?1:0,rotaciones_iniciales:"{}"};try{const d=await window.apiPista.createPartidoPista(A),q=typeof d=="object"?d.id:d;if(n==="local"&&s&&((E=document.getElementById("input-detect-whistles"))!=null&&E.checked)){r("Analizando silbatos localmente… puede tardar unos minutos","info");try{const o=await window.api.analyzeWhistles(s);r(`${o.length} silbatos detectados. Ya puedes usar Mouse Atrás/Adelante.`,"success")}catch(o){r(`No se pudo analizar el audio: ${o.message}`,"warning")}}const B=document.querySelectorAll(".roster-row"),$=Array.from(B).map(o=>{const I=o.querySelector(".roster-dorsal").value,k=o.querySelector(".roster-nombre").value.trim(),N=o.querySelector(".roster-apellidos").value.trim(),S=o.querySelector(".roster-posicion").value,T=S==="Líbero"?1:0,_=o.dataset.jugadorId?parseInt(o.dataset.jugadorId,10):null;return I?window.apiPista.addRosterJugador({partido_id:q,dorsal:parseInt(I,10),nombre:k||"Desconocido",apellidos:N||"",posicion:S,es_libero:T,jugador_pista_id:_}):Promise.resolve()});await Promise.all($),r("Partido creado correctamente","success"),e?m.navigate("scouting-pista",{partidoId:q}):m.navigate("dashboard-pista")}catch(d){console.error("Error creating partido:",d),r("Error al crear el partido","error")}};(h=document.getElementById("form-partido"))==null||h.addEventListener("submit",e=>{e.preventDefault(),g(!0)}),(x=document.getElementById("btn-solo-crear"))==null||x.addEventListener("click",()=>{const e=document.getElementById("form-partido");e.checkValidity()?g(!1):e.reportValidity()})})}export{M as registerNuevoPartidoPista};
