import{r as v,N as b}from"./index-mPRRmVeE.js";import{s as d}from"./helpers-Doah0GRy.js";let i=[],l="",s=null;function B(){v.register("jugadores",async e=>{i=await window.api.getJugadores(),l="",y(e)})}function f(){const e=l.trim().toLowerCase();return e?i.filter(t=>`${t.nombre} ${t.apellidos} ${t.nacionalidad} ${t.posicion}`.toLowerCase().includes(e)):i}function y(e){e.innerHTML=`
        <div class="jugadores-page">
            <div class="page-header flex items-center justify-between">
                <div>
                    <h1 class="page-title">👥 Jugadores</h1>
                    <p class="page-subtitle">Gestiona tu base de datos de jugadores</p>
                </div>
                <button class="btn btn-primary" id="btn-nuevo-jugador">➕ Nuevo Jugador</button>
            </div>

            <div class="search-bar" style="margin-bottom: 20px;">
                <span class="search-icon">🔍</span>
                <input type="text" id="input-buscar-jugador" class="form-input search-input"
                    placeholder="Buscar por nombre, apellidos, nacionalidad..." value="${o(l)}">
            </div>

            <div id="jugadores-grid" class="jugadores-grid"></div>
        </div>

        <div id="modal-jugador" class="modal-overlay" style="display:none;">
            <div class="modal-card">
                <h3 id="modal-jugador-title" class="modal-title">Nuevo Jugador</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nombre *</label>
                        <input type="text" id="jug-nombre" class="form-input" placeholder="Ej: Anders">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Apellidos</label>
                        <input type="text" id="jug-apellidos" class="form-input" placeholder="Ej: Mol">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nacionalidad</label>
                        <select id="jug-nacionalidad" class="form-select">
                            <option value="">Sin especificar</option>
                            ${b.map(t=>`<option value="${t}">${t}</option>`).join("")}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Posición / Rol</label>
                        <input type="text" id="jug-posicion" class="form-input" placeholder="Ej: Defensor / Bloqueador">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Notas</label>
                    <textarea id="jug-notas" class="form-textarea" placeholder="Notas sobre el jugador..."></textarea>
                </div>
                <div class="flex gap-12 justify-end" style="margin-top: 20px;">
                    <button class="btn btn-secondary" id="btn-cancelar-jugador">Cancelar</button>
                    <button class="btn btn-primary" id="btn-guardar-jugador">Guardar</button>
                </div>
            </div>
        </div>
    `,r(),document.getElementById("btn-nuevo-jugador").addEventListener("click",()=>g(null)),document.getElementById("input-buscar-jugador").addEventListener("input",t=>{l=t.target.value,r()}),document.getElementById("btn-cancelar-jugador").addEventListener("click",c),document.getElementById("btn-guardar-jugador").addEventListener("click",E),document.getElementById("modal-jugador").addEventListener("click",t=>{t.target.id==="modal-jugador"&&c()})}function r(){const e=document.getElementById("jugadores-grid");if(!e)return;const t=f();if(t.length===0){e.innerHTML=`
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">👤</div>
                <p>${i.length===0?"Todavía no has añadido jugadores":"Ningún jugador coincide con la búsqueda"}</p>
            </div>`;return}e.innerHTML=t.map(a=>{var m,p;const n=`${a.nombre}${a.apellidos?" "+a.apellidos:""}`;return`
            <div class="jugador-card">
                <div class="jugador-avatar">${(((m=a.nombre)==null?void 0:m[0])||"?").toUpperCase()+(((p=a.apellidos)==null?void 0:p[0])||"").toUpperCase()}</div>
                <div class="jugador-info">
                    <div class="jugador-nombre">${o(n)}</div>
                    <div class="jugador-meta">
                        ${a.nacionalidad?`<span class="chip">${o(a.nacionalidad)}</span>`:""}
                        ${a.posicion?`<span class="chip chip-accent">${o(a.posicion)}</span>`:""}
                    </div>
                    ${a.notas?`<div class="jugador-notas">${o(a.notas)}</div>`:""}
                </div>
                <div class="jugador-actions">
                    <button class="icon-btn" data-edit="${a.id}" title="Editar">✏️</button>
                    <button class="icon-btn icon-btn-danger" data-del="${a.id}" title="Eliminar">🗑️</button>
                </div>
            </div>`}).join(""),e.querySelectorAll("[data-edit]").forEach(a=>{a.addEventListener("click",()=>{const n=i.find(u=>u.id===parseInt(a.dataset.edit,10));n&&g(n)})}),e.querySelectorAll("[data-del]").forEach(a=>{a.addEventListener("click",()=>I(parseInt(a.dataset.del,10)))})}function g(e){s=e?e.id:null,document.getElementById("modal-jugador-title").textContent=e?"Editar Jugador":"Nuevo Jugador",document.getElementById("jug-nombre").value=(e==null?void 0:e.nombre)||"",document.getElementById("jug-apellidos").value=(e==null?void 0:e.apellidos)||"",document.getElementById("jug-nacionalidad").value=(e==null?void 0:e.nacionalidad)||"",document.getElementById("jug-posicion").value=(e==null?void 0:e.posicion)||"",document.getElementById("jug-notas").value=(e==null?void 0:e.notas)||"",document.getElementById("modal-jugador").style.display="flex",document.getElementById("jug-nombre").focus()}function c(){document.getElementById("modal-jugador").style.display="none",s=null}async function E(){const e={nombre:document.getElementById("jug-nombre").value.trim(),apellidos:document.getElementById("jug-apellidos").value.trim(),nacionalidad:document.getElementById("jug-nacionalidad").value,posicion:document.getElementById("jug-posicion").value.trim(),notas:document.getElementById("jug-notas").value.trim()};if(!e.nombre){d("El nombre es obligatorio","error");return}s?(await window.api.updateJugador(s,e),d("Jugador actualizado","success")):(await window.api.createJugador(e),d("Jugador creado","success")),i=await window.api.getJugadores(),c(),r()}async function I(e){const t=i.find(a=>a.id===e);t&&confirm(`¿Eliminar a ${t.nombre} ${t.apellidos||""}? Esta acción no se puede deshacer.`)&&(await window.api.deleteJugador(e),i=i.filter(a=>a.id!==e),d("Jugador eliminado","info"),r())}function o(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}export{B as registerJugadores};
