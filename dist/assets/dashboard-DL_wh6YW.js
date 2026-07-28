import{r as g}from"./index-mPRRmVeE.js";import{f as x}from"./helpers-Doah0GRy.js";let n=null,u=[],s=[],b="";function $(){g.register("dashboard",async r=>{r.innerHTML=`
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">Cargando partidos de Voley Playa...</div>
            </div>
        `,s=await window.api.getPartidos(),u=await window.api.getCarpetas(),n=null,i(r)})}function i(r){const d=n?u.find(a=>a.id===n):null;let o=n?s.filter(a=>a.carpeta_id===n):s.filter(a=>!a.carpeta_id);if(b){const a=b.toLowerCase();o=s.filter(c=>`${c.jugador1_nombre} ${c.jugador2_nombre} ${c.torneo||""} ${c.fase||""}`.toLowerCase().includes(a))}const p=n||b?[]:u;r.innerHTML=`
        <div class="dashboard-page">
            <div class="page-header">
                <h1 class="page-title">🏐 Explorador de Partidos</h1>
                <p class="page-subtitle">Organiza tus partidos en carpetas</p>
            </div>

            <div class="card explorer-card">
                <div class="explorer-header flex justify-between items-center" style="margin-bottom: 20px;">
                    <div class="breadcrumb flex gap-8 items-center font-semibold">
                        <button class="btn btn-sm btn-secondary btn-breadcrumb" data-id="null">🏠 Raíz</button>
                        ${d?`<span style="color: #64748b;">/</span> <span style="color: #38bdf8;">📂 ${d.nombre}</span>`:""}
                    </div>
                    <div class="explorer-actions flex gap-8" style="display: flex; align-items: center; gap: 8px;">
                        <input type="text" id="input-buscar-partido" class="form-input" placeholder="🔍 Buscar partido..." value="${b.replace(/"/g,"&quot;")}" style="width: 220px; background: #0f172a; border: 1px solid #334155; color: white; padding: 7px 12px; border-radius: 6px; font-size: 0.85rem;">
                        ${n?"":'<button class="btn btn-sm btn-secondary" id="btn-nueva-carpeta">📁 Nueva Carpeta</button>'}
                        <button class="btn btn-primary btn-sm" id="btn-nuevo-partido-dash">✚ Nuevo Partido</button>
                    </div>
                </div>

                ${!n&&p.length>0?`
                    <h3 style="margin-bottom: 12px; color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Carpetas</h3>
                    <div class="grid grid-carpetas" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 30px;">
                        ${p.map(a=>`
                            <div class="carpeta-item card-hover" data-id="${a.id}" style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s;">
                                <div class="flex items-center gap-12" style="pointer-events: none;">
                                    <span style="font-size: 1.5rem;">📁</span>
                                    <span class="font-medium text-white">${a.nombre}</span>
                                </div>
                                <button class="btn-eliminar-carpeta" data-id="${a.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; opacity: 0.5; padding: 4px;">🗑️</button>
                            </div>
                        `).join("")}
                    </div>
                `:""}

                <h3 style="margin-bottom: 12px; color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Partidos</h3>
                ${o.length===0?`
                    <div class="empty-state" style="padding: 40px; text-align: center; background: #1e293b; border-radius: 12px; border: 1px dashed #334155;">
                        <div class="empty-state-icon" style="font-size: 3rem; margin-bottom: 10px;">🏖️</div>
                        <p class="empty-state-text font-medium">Esta carpeta está vacía</p>
                    </div>
                `:`
                    <div class="partidos-list" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                        ${o.map(a=>`
                            <div class="partido-item card-hover" draggable="true" data-id="${a.id}" style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; cursor: grab; display: flex; align-items: center; justify-content: space-between; user-select: none; transition: transform 0.2s, box-shadow 0.2s;">
                                <div class="flex items-center gap-12" style="pointer-events: none; display: flex; align-items: center; gap: 16px;">
                                    <span style="font-size: 2rem;">🏐</span>
                                    <div>
                                        <div class="font-semibold text-white" style="font-size: 1rem; margin-bottom: 4px;">
                                            ${a.jugador1_nombre} / ${a.jugador2_nombre}
                                            ${a.finalizado?'<span style="margin-left: 8px; font-size: 0.7rem; padding: 3px 8px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 999px; vertical-align: middle;">✅ FINALIZADO</span>':'<span style="margin-left: 8px; font-size: 0.7rem; padding: 3px 8px; background: rgba(245, 158, 11, 0.12); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 999px; vertical-align: middle;">⏳ EN CURSO</span>'}
                                        </div>
                                        <div style="font-size: 0.85rem; color: #94a3b8;">
                                            📅 ${x(a.fecha)} ${a.torneo?`| 🏆 ${a.torneo}`:""} ${a.fase?`| 🏷️ ${a.fase}`:""}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-12" style="display: flex; align-items: center; gap: 16px;">
                                    <span class="badge badge-info" style="font-family: monospace; font-size: 0.9rem; padding: 6px 12px; background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px;">
                                        Resultado: ${a.resultado||"-"}
                                    </span>
                                    <div class="flex gap-8" style="display: flex; gap: 8px;">
                                        <button class="btn btn-sm btn-secondary btn-scouting" data-id="${a.id}">📋 Scouting</button>
                                        <button class="btn btn-sm btn-secondary btn-informe" data-id="${a.id}">📊 Informe</button>
                                        <button class="btn btn-sm btn-secondary btn-toggle-finalizado" data-id="${a.id}" data-finalizado="${a.finalizado?1:0}" title="${a.finalizado?"Reabrir partido":"Marcar como finalizado"}" style="padding: 0 8px; ${a.finalizado?"color: #f59e0b; border-color: rgba(245, 158, 11, 0.3);":"color: #10b981; border-color: rgba(16, 185, 129, 0.3);"}">${a.finalizado?"🔓":"🏁"}</button>
                                        <button class="btn btn-sm btn-secondary btn-export-csv" data-id="${a.id}" title="Exportar acciones a CSV" style="padding: 0 8px;">📤</button>
                                        <button class="btn btn-sm btn-secondary btn-eliminar-partido" data-id="${a.id}" title="Eliminar Partido" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3); padding: 0 8px;">🗑️</button>
                                    </div>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                `}
            </div>
            <!-- Modal para nueva carpeta -->
            <div id="modal-nueva-carpeta" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                <div class="modal-content card" style="background: #1e293b; border: 1px solid #334155; padding: 24px; border-radius: 12px; width: 400px; max-width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                    <h3 style="margin-top: 0; margin-bottom: 16px; color: white; font-size: 1.2rem;">📁 Crear nueva carpeta</h3>
                    <input type="text" id="input-nombre-carpeta" class="form-input" placeholder="Nombre de la carpeta" style="margin-bottom: 20px; width: 100%; background: #0f172a; border: 1px solid #334155; color: white; padding: 8px 12px; border-radius: 6px;">
                    <div class="flex justify-end gap-12" style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button class="btn btn-secondary" id="btn-cancelar-carpeta">Cancelar</button>
                        <button class="btn btn-primary" id="btn-confirmar-carpeta">Crear</button>
                    </div>
                </div>
            </div>
        </div>
    `,w(r)}function w(r){var c,m,f,y;document.querySelectorAll(".btn-breadcrumb").forEach(e=>{e.addEventListener("click",()=>{n=null,i(r)}),e.addEventListener("dragover",t=>{t.preventDefault(),e.style.background="#0f172a",e.style.borderColor="#38bdf8",e.style.color="#38bdf8"}),e.addEventListener("dragleave",t=>{e.style.background="",e.style.borderColor="",e.style.color=""}),e.addEventListener("drop",async t=>{t.preventDefault(),e.style.background="",e.style.borderColor="",e.style.color="";const l=t.dataTransfer.getData("text/plain");l&&(await window.api.movePartidoToCarpeta(parseInt(l),null),s=await window.api.getPartidos(),i(r))})});const d=document.getElementById("modal-nueva-carpeta"),o=document.getElementById("input-nombre-carpeta");(c=document.getElementById("btn-nueva-carpeta"))==null||c.addEventListener("click",()=>{d&&o&&(o.value="",d.style.display="flex",o.focus())}),(m=document.getElementById("btn-cancelar-carpeta"))==null||m.addEventListener("click",()=>{d&&(d.style.display="none")});const p=async()=>{const e=o==null?void 0:o.value.trim();e&&(await window.api.createCarpeta(e),u=await window.api.getCarpetas(),d&&(d.style.display="none"),i(r))};(f=document.getElementById("btn-confirmar-carpeta"))==null||f.addEventListener("click",p),o==null||o.addEventListener("keypress",e=>{e.key==="Enter"&&p()}),d==null||d.addEventListener("click",e=>{e.target===d&&(d.style.display="none")}),document.querySelectorAll(".carpeta-item").forEach(e=>{e.addEventListener("click",t=>{t.target.closest(".btn-eliminar-carpeta")||(n=parseInt(e.dataset.id),i(r))}),e.addEventListener("dragover",t=>{t.preventDefault(),e.style.borderColor="#38bdf8",e.style.background="#0f172a"}),e.addEventListener("dragleave",t=>{e.style.borderColor="#334155",e.style.background="#1e293b"}),e.addEventListener("drop",async t=>{t.preventDefault(),e.style.borderColor="#334155",e.style.background="#1e293b";const l=t.dataTransfer.getData("text/plain");if(l){const v=parseInt(e.dataset.id);await window.api.movePartidoToCarpeta(parseInt(l),v),s=await window.api.getPartidos(),i(r)}})}),document.querySelectorAll(".btn-eliminar-carpeta").forEach(e=>{e.addEventListener("click",async t=>{t.stopPropagation(),confirm("¿Eliminar esta carpeta? Los partidos que contenga volverán a la Raíz.")&&(await window.api.deleteCarpeta(parseInt(e.dataset.id)),u=await window.api.getCarpetas(),s=await window.api.getPartidos(),i(r))})}),document.querySelectorAll(".partido-item").forEach(e=>{e.addEventListener("dragstart",t=>{t.dataTransfer.setData("text/plain",e.dataset.id),e.style.opacity="0.4",e.style.transform="scale(0.98)"}),e.addEventListener("dragend",t=>{e.style.opacity="1",e.style.transform="none"})}),(y=document.getElementById("btn-nuevo-partido-dash"))==null||y.addEventListener("click",()=>{g.navigate("nuevo-partido")}),document.querySelectorAll(".btn-scouting").forEach(e=>{e.addEventListener("click",()=>{g.navigate("scouting",{partidoId:parseInt(e.dataset.id)})})}),document.querySelectorAll(".btn-informe").forEach(e=>{e.addEventListener("click",()=>{g.navigate("informe",{partidoId:parseInt(e.dataset.id)})})});const a=document.getElementById("input-buscar-partido");a==null||a.addEventListener("input",e=>{b=e.target.value.trim(),i(r);const t=document.getElementById("input-buscar-partido");t&&(t.focus(),t.setSelectionRange(t.value.length,t.value.length))}),document.querySelectorAll(".btn-toggle-finalizado").forEach(e=>{e.addEventListener("click",async()=>{const t=parseInt(e.dataset.id),l=e.dataset.finalizado==="1"?0:1;await window.api.updatePartido(t,{finalizado:l}),s=await window.api.getPartidos(),i(r),showToast(l?"Partido marcado como finalizado":"Partido reabierto","success")})}),document.querySelectorAll(".btn-export-csv").forEach(e=>{e.addEventListener("click",async()=>{try{await window.api.exportAccionesCSV(parseInt(e.dataset.id))&&showToast("Acciones exportadas a CSV","success")}catch(t){showToast(t.message||"Error al exportar CSV","error")}})}),document.querySelectorAll(".btn-eliminar-partido").forEach(e=>{e.addEventListener("click",async()=>{confirm("¿Seguro que quieres eliminar este partido y TODAS sus acciones? Esto no se puede deshacer.")&&(await window.api.deletePartido(parseInt(e.dataset.id)),s=await window.api.getPartidos(),i(r))})})}export{$ as registerDashboard};
