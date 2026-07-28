import{r as k,P as w}from"./index-mPRRmVeE.js";import{s as a}from"./helpers-Doah0GRy.js";let l=[],r=null,u=[],y=null,b=null;function J(){k.register("equipos-pista",async t=>{l=await window.apiPista.getEquipos(),r=null,u=[],b=null,B(t)})}function B(t){t.innerHTML=`
        <style>
            .equipo-card:hover { border-color: var(--accent-color) !important; }
            .roster-row:hover { background: rgba(255,255,255,0.05) !important; }
            .roster-table th { font-weight: 600; color: #bbb; }
        </style>
        <div class="equipos-pista-page" style="display: flex; gap: 20px; height: 100%; overflow: hidden;">
            <div class="equipos-sidebar" style="width: 320px; display: flex; flex-direction: column; overflow-y: auto;">
                <div class="page-header flex items-center justify-between" style="margin-bottom: 20px;">
                    <div>
                        <h1 class="page-title" style="margin: 0; font-size: 1.5rem;">🏐 Equipos</h1>
                    </div>
                    <button class="btn btn-primary" id="btn-nuevo-equipo" title="Nuevo Equipo">➕ Nuevo</button>
                </div>
                <div id="equipos-list" class="flex flex-col gap-12" style="display:flex; flex-direction:column; gap:10px;"></div>
            </div>

            <div class="roster-main" style="flex: 1; overflow-y: auto; padding: 20px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color);">
                <div id="roster-content" style="height: 100%;">
                    <div class="empty-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#888;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                        <p>Selecciona un equipo para ver su plantilla</p>
                    </div>
                </div>
            </div>
        </div>

        <div id="modal-equipo" class="modal-overlay" style="display:none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); align-items: center; justify-content: center; z-index: 1000;">
            <div class="modal-card" style="background: var(--bg-color); padding: 24px; border-radius: 8px; width: 400px; border: 1px solid var(--border-color);">
                <h3 id="modal-equipo-title" class="modal-title" style="margin-top:0; margin-bottom: 16px;">Nuevo Equipo</h3>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label class="form-label">Nombre *</label>
                    <input type="text" id="eq-nombre" class="form-input" style="width: 100%; box-sizing: border-box;">
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label class="form-label">Abreviatura</label>
                    <input type="text" id="eq-abreviatura" class="form-input" maxlength="4" style="width: 100%; box-sizing: border-box;" placeholder="Ej: MAD">
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                    <label class="form-label">Notas</label>
                    <textarea id="eq-notas" class="form-textarea" style="width: 100%; box-sizing: border-box;"></textarea>
                </div>
                <div class="flex gap-12 justify-end" style="display:flex; gap:10px; justify-content:flex-end;">
                    <button class="btn btn-secondary" id="btn-cancelar-equipo">Cancelar</button>
                    <button class="btn btn-primary" id="btn-guardar-equipo">Guardar</button>
                </div>
            </div>
        </div>
    `,x(),document.getElementById("btn-nuevo-equipo").addEventListener("click",()=>q(null)),document.getElementById("btn-cancelar-equipo").addEventListener("click",h),document.getElementById("btn-guardar-equipo").addEventListener("click",P),document.getElementById("modal-equipo").addEventListener("click",o=>{o.target.id==="modal-equipo"&&h()})}function x(){const t=document.getElementById("equipos-list");if(t){if(l.length===0){t.innerHTML=`
            <div class="empty-state" style="padding: 20px; text-align: center; color: #888;">
                <p>No hay equipos creados</p>
            </div>`;return}t.innerHTML=l.map(o=>{const c=r===o.id?"var(--accent-color)":"var(--border-color)",e=o.player_count!==void 0?o.player_count:0;return`
        <div class="equipo-card" data-id="${o.id}" style="padding: 15px; border-radius: 8px; border: 1px solid ${c}; background: var(--bg-color); cursor: pointer; transition: border-color 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${o.abreviatura?`<span style="background: var(--accent-color); color: #000; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.8rem;">${s(o.abreviatura)}</span>`:""}
                    <h3 style="margin: 0; font-size: 1.1rem;">${s(o.nombre)}</h3>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button class="icon-btn btn-edit-eq" data-id="${o.id}" title="Editar" style="background:none; border:none; cursor:pointer;">✏️</button>
                    <button class="icon-btn btn-del-eq" data-id="${o.id}" title="Eliminar" style="background:none; border:none; cursor:pointer;">🗑️</button>
                </div>
            </div>
            <div style="font-size: 0.9rem; color: #888; display: flex; justify-content: space-between;">
                <span>${o.notas?s(o.notas):""}</span>
                <span>Jugadores: ${e}</span>
            </div>
        </div>
        `}).join(""),t.querySelectorAll(".equipo-card").forEach(o=>{o.addEventListener("click",i=>{i.target.closest(".btn-edit-eq")||i.target.closest(".btn-del-eq")||L(parseInt(o.dataset.id,10))})}),t.querySelectorAll(".btn-edit-eq").forEach(o=>{o.addEventListener("click",i=>{i.stopPropagation();const c=l.find(e=>e.id===parseInt(o.dataset.id,10));c&&q(c)})}),t.querySelectorAll(".btn-del-eq").forEach(o=>{o.addEventListener("click",i=>{i.stopPropagation(),z(parseInt(o.dataset.id,10))})})}}function q(t){y=t?t.id:null,document.getElementById("modal-equipo-title").textContent=t?"Editar Equipo":"Nuevo Equipo",document.getElementById("eq-nombre").value=(t==null?void 0:t.nombre)||"",document.getElementById("eq-abreviatura").value=(t==null?void 0:t.abreviatura)||"",document.getElementById("eq-notas").value=(t==null?void 0:t.notas)||"",document.getElementById("modal-equipo").style.display="flex",document.getElementById("eq-nombre").focus()}function h(){document.getElementById("modal-equipo").style.display="none",y=null}async function P(){const t={nombre:document.getElementById("eq-nombre").value.trim(),abreviatura:document.getElementById("eq-abreviatura").value.trim().toUpperCase(),notas:document.getElementById("eq-notas").value.trim()};if(!t.nombre){a("El nombre es obligatorio","error");return}try{y?(await window.apiPista.updateEquipo(y,t),a("Equipo actualizado","success")):(await window.apiPista.createEquipo(t),a("Equipo creado","success")),l=await window.apiPista.getEquipos(),h(),x(),r===y&&m()}catch(o){a("Error al guardar equipo","error"),console.error(o)}}async function z(t){const o=l.find(i=>i.id===t);if(o&&confirm(`¿Eliminar al equipo ${o.nombre}? También se eliminarán sus jugadores.`))try{await window.apiPista.deleteEquipo(t),l=l.filter(i=>i.id!==t),a("Equipo eliminado","info"),r===t&&(r=null,u=[],m()),x()}catch(i){a("Error al eliminar equipo","error"),console.error(i)}}async function L(t){r=t,x();try{u=await window.apiPista.getJugadoresByEquipo(t),b=null,m()}catch(o){a("Error al cargar plantilla","error"),console.error(o)}}function m(){const t=document.getElementById("roster-content");if(!t)return;if(!r){t.innerHTML=`
            <div class="empty-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#888;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                <p>Selecciona un equipo para ver su plantilla</p>
            </div>
        `;return}const o=l.find(e=>e.id===r);let i=`
        <div style="margin-bottom: 20px;">
            <h2 style="margin:0 0 5px 0; font-size:1.5rem;">${s(o.nombre)} - Plantilla</h2>
            <p style="margin:0; color:#888;">Gestiona los jugadores y sus dorsales.</p>
        </div>
        <div style="overflow-x: auto;">
            <table class="roster-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color);">
                        <th style="padding: 10px; width: 80px;">Dorsal</th>
                        <th style="padding: 10px;">Nombre</th>
                        <th style="padding: 10px;">Apellidos</th>
                        <th style="padding: 10px; width: 150px;">Posición</th>
                        <th style="padding: 10px; width: 100px;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;u.length===0?i+=`
            <tr>
                <td colspan="5" style="padding: 20px; text-align: center; color: #888;">
                    No hay jugadores en este equipo
                </td>
            </tr>
        `:u.forEach(e=>{b===e.id?i+=`
                    <tr style="border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.05);">
                        <td style="padding: 10px;">
                            <input type="number" id="edit-dorsal-${e.id}" class="form-input" style="width: 60px;" min="0" max="99" value="${e.dorsal!==null?e.dorsal:""}">
                        </td>
                        <td style="padding: 10px;">
                            <input type="text" id="edit-nombre-${e.id}" class="form-input" style="width: 100%; box-sizing:border-box;" value="${s(e.nombre)}">
                        </td>
                        <td style="padding: 10px;">
                            <input type="text" id="edit-apellidos-${e.id}" class="form-input" style="width: 100%; box-sizing:border-box;" value="${s(e.apellidos||"")}">
                        </td>
                        <td style="padding: 10px;">
                            <select id="edit-posicion-${e.id}" class="form-select" style="width: 100%; box-sizing:border-box;">
                                <option value="">--</option>
                                ${w.map(n=>`<option value="${n}" ${n===e.posicion?"selected":""}>${n}</option>`).join("")}
                            </select>
                        </td>
                        <td style="padding: 10px;">
                            <div style="display:flex; gap:5px;">
                                <button class="btn btn-primary btn-sm btn-save-jug" data-id="${e.id}" style="padding: 4px 8px;" title="Guardar">💾</button>
                                <button class="btn btn-secondary btn-sm btn-cancel-jug" data-id="${e.id}" style="padding: 4px 8px;" title="Cancelar">❌</button>
                            </div>
                        </td>
                    </tr>
                `:i+=`
                    <tr class="roster-row" style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;">
                        <td style="padding: 10px; font-weight: bold;">${e.dorsal!==null&&e.dorsal!==void 0?e.dorsal:"-"}</td>
                        <td style="padding: 10px;">${s(e.nombre)}</td>
                        <td style="padding: 10px;">${s(e.apellidos||"")}</td>
                        <td style="padding: 10px;">${e.posicion?s(e.posicion):"-"}</td>
                        <td style="padding: 10px;">
                            <div style="display:flex; gap:5px;">
                                <button class="icon-btn btn-edit-jug" data-id="${e.id}" style="background:none; border:none; cursor:pointer;" title="Editar">✏️</button>
                                <button class="icon-btn btn-del-jug" data-id="${e.id}" style="background:none; border:none; cursor:pointer;" title="Eliminar">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `}),i+=`
                </tbody>
                <tfoot>
                    <tr style="border-top: 2px solid var(--border-color); background: rgba(255,255,255,0.02);">
                        <td style="padding: 10px;">
                            <input type="number" id="new-dorsal" class="form-input" style="width: 60px;" min="0" max="99" placeholder="#">
                        </td>
                        <td style="padding: 10px;">
                            <input type="text" id="new-nombre" class="form-input" style="width: 100%; box-sizing:border-box;" placeholder="Nombre *">
                        </td>
                        <td style="padding: 10px;">
                            <input type="text" id="new-apellidos" class="form-input" style="width: 100%; box-sizing:border-box;" placeholder="Apellidos">
                        </td>
                        <td style="padding: 10px;">
                            <select id="new-posicion" class="form-select" style="width: 100%; box-sizing:border-box;">
                                <option value="">Posición</option>
                                ${w.map(e=>`<option value="${e}">${e}</option>`).join("")}
                            </select>
                        </td>
                        <td style="padding: 10px;">
                            <button class="btn btn-primary btn-sm" id="btn-add-jugador" style="padding: 4px 12px; height: 100%;">Añadir</button>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `,t.innerHTML=i,t.querySelectorAll(".btn-edit-jug").forEach(e=>{e.addEventListener("click",()=>{b=parseInt(e.dataset.id,10),m()})}),t.querySelectorAll(".btn-cancel-jug").forEach(e=>{e.addEventListener("click",()=>{b=null,m()})}),t.querySelectorAll(".btn-save-jug").forEach(e=>{e.addEventListener("click",async()=>{const n=parseInt(e.dataset.id,10),d=document.getElementById(`edit-dorsal-${n}`).value,p=d===""?null:parseInt(d,10),g=document.getElementById(`edit-nombre-${n}`).value.trim(),f=document.getElementById(`edit-apellidos-${n}`).value.trim(),v=document.getElementById(`edit-posicion-${n}`).value,I=v==="Líbero"?1:0;if(!g){a("El nombre es obligatorio","error");return}try{await window.apiPista.updateJugadorPista(n,{dorsal:p,nombre:g,apellidos:f,posicion:v,es_libero:I}),a("Jugador actualizado","success"),b=null,await E()}catch($){a("Error al actualizar jugador","error"),console.error($)}})}),t.querySelectorAll(".btn-del-jug").forEach(e=>{e.addEventListener("click",async()=>{const n=parseInt(e.dataset.id,10),d=u.find(p=>p.id===n);if(confirm(`¿Eliminar a ${d.nombre}?`))try{await window.apiPista.deleteJugadorPista(n),a("Jugador eliminado","info"),await E()}catch(p){a("Error al eliminar jugador","error"),console.error(p)}})});const c=document.getElementById("btn-add-jugador");c&&(c.addEventListener("click",async()=>{const e=document.getElementById("new-dorsal").value,n=e===""?null:parseInt(e,10),d=document.getElementById("new-nombre").value.trim(),p=document.getElementById("new-apellidos").value.trim(),g=document.getElementById("new-posicion").value,f=g==="Líbero"?1:0;if(!d){a("El nombre es obligatorio","error");return}try{await window.apiPista.createJugadorPista({equipo_id:r,dorsal:n,nombre:d,apellidos:p,posicion:g,es_libero:f}),a("Jugador añadido","success"),await E()}catch(v){a("Error al añadir jugador","error"),console.error(v)}}),["new-dorsal","new-nombre","new-apellidos","new-posicion"].forEach(e=>{const n=document.getElementById(e);n&&n.addEventListener("keydown",d=>{d.key==="Enter"&&(d.preventDefault(),c.click())})}))}async function E(){r&&(u=await window.apiPista.getJugadoresByEquipo(r),l=await window.apiPista.getEquipos(),x(),m())}function s(t){return String(t??"").replace(/[&<>"']/g,o=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[o])}export{J as registerEquiposPista};
