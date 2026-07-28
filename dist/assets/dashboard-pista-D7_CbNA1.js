import{r as g}from"./index-mPRRmVeE.js";import{f as x}from"./helpers-Doah0GRy.js";let d=null,u=[],n=[],b="";function E(){g.register("dashboard-pista",async i=>{i.innerHTML=`
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">Cargando partidos de Voley Pista...</div>
            </div>
        `,n=await window.apiPista.getPartidosPista(),u=await window.apiPista.getCarpetasPista(),d=null,o(i)})}function o(i){const r=d?u.find(e=>e.id===d):null;let s=d?n.filter(e=>e.carpeta_id===d):n.filter(e=>!e.carpeta_id);if(b){const e=b.toLowerCase();s=n.filter(c=>`${c.equipo_nombre} ${c.rival_nombre} ${c.torneo||""} ${c.fase||""}`.toLowerCase().includes(e))}const p=d||b?[]:u;i.innerHTML=`
        <div class="dashboard-page">
            <div class="page-header">
                <h1 class="page-title">🏐 Explorador de Partidos (Pista)</h1>
                <p class="page-subtitle">Organiza tus partidos en carpetas</p>
            </div>

            <div class="card explorer-card">
                <div class="explorer-header flex justify-between items-center" style="margin-bottom: 20px;">
                    <div class="breadcrumb flex gap-8 items-center font-semibold">
                        <button class="btn btn-sm btn-secondary btn-breadcrumb" data-id="null">🏠 Raíz</button>
                        ${r?`<span style="color: #64748b;">/</span> <span style="color: #38bdf8;">📂 ${r.nombre}</span>`:""}
                    </div>
                    <div class="explorer-actions flex gap-8" style="display: flex; align-items: center; gap: 8px;">
                        <input type="text" id="input-buscar-partido" class="form-input" placeholder="🔍 Buscar partido..." value="${b.replace(/"/g,"&quot;")}" style="width: 220px; background: #0f172a; border: 1px solid #334155; color: white; padding: 7px 12px; border-radius: 6px; font-size: 0.85rem;">
                        ${d?"":'<button class="btn btn-sm btn-secondary" id="btn-nueva-carpeta">📁 Nueva Carpeta</button>'}
                        <button class="btn btn-primary btn-sm" id="btn-nuevo-partido-dash">✚ Nuevo Partido</button>
                    </div>
                </div>

                ${!d&&p.length>0?`
                    <h3 style="margin-bottom: 12px; color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Carpetas</h3>
                    <div class="grid grid-carpetas" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 30px;">
                        ${p.map(e=>`
                            <div class="carpeta-item card-hover" data-id="${e.id}" style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s;">
                                <div class="flex items-center gap-12" style="pointer-events: none;">
                                    <span style="font-size: 1.5rem;">📁</span>
                                    <span class="font-medium text-white">${e.nombre}</span>
                                </div>
                                <button class="btn-eliminar-carpeta" data-id="${e.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; opacity: 0.5; padding: 4px;">🗑️</button>
                            </div>
                        `).join("")}
                    </div>
                `:""}

                <h3 style="margin-bottom: 12px; color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Partidos</h3>
                ${s.length===0?`
                    <div class="empty-state" style="padding: 40px; text-align: center; background: #1e293b; border-radius: 12px; border: 1px dashed #334155;">
                        <div class="empty-state-icon" style="font-size: 3rem; margin-bottom: 10px;">🏐</div>
                        <p class="empty-state-text font-medium">Esta carpeta está vacía</p>
                    </div>
                `:`
                    <div class="partidos-list" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                        ${s.map(e=>`
                            <div class="partido-item card-hover" draggable="true" data-id="${e.id}" style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; cursor: grab; display: flex; align-items: center; justify-content: space-between; user-select: none; transition: transform 0.2s, box-shadow 0.2s;">
                                <div class="flex items-center gap-12" style="pointer-events: none; display: flex; align-items: center; gap: 16px;">
                                    <span style="font-size: 2rem;">🏐</span>
                                    <div>
                                        <div class="font-semibold text-white" style="font-size: 1rem; margin-bottom: 4px;">
                                            ${e.equipo_nombre} vs ${e.rival_nombre}
                                            ${e.finalizado?'<span style="margin-left: 8px; font-size: 0.7rem; padding: 3px 8px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 999px; vertical-align: middle;">✅ FINALIZADO</span>':'<span style="margin-left: 8px; font-size: 0.7rem; padding: 3px 8px; background: rgba(245, 158, 11, 0.12); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 999px; vertical-align: middle;">⏳ EN CURSO</span>'}
                                        </div>
                                        <div style="font-size: 0.85rem; color: #94a3b8;">
                                            📅 ${x(e.fecha)} ${e.torneo?`| 🏆 ${e.torneo}`:""} ${e.fase?`| 🏷️ ${e.fase}`:""}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-12" style="display: flex; align-items: center; gap: 16px;">
                                    <span class="badge badge-info" style="font-family: monospace; font-size: 0.9rem; padding: 6px 12px; background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px;">
                                        Resultado: ${e.resultado||"-"}
                                    </span>
                                    <div class="flex gap-8" style="display: flex; gap: 8px;">
                                        <button class="btn btn-sm btn-secondary btn-scouting" data-id="${e.id}">📋 Scouting</button>
                                        <button class="btn btn-sm btn-secondary btn-informe" data-id="${e.id}">📊 Informe</button>
                                        <button class="btn btn-sm btn-secondary btn-toggle-finalizado" data-id="${e.id}" data-finalizado="${e.finalizado?1:0}" title="${e.finalizado?"Reabrir partido":"Marcar como finalizado"}" style="padding: 0 8px; ${e.finalizado?"color: #f59e0b; border-color: rgba(245, 158, 11, 0.3);":"color: #10b981; border-color: rgba(16, 185, 129, 0.3);"}">${e.finalizado?"🔓":"🏁"}</button>
                                        <button class="btn btn-sm btn-secondary btn-export-csv" data-id="${e.id}" title="Exportar acciones a CSV" style="padding: 0 8px;">📤</button>
                                        <button class="btn btn-sm btn-secondary btn-eliminar-partido" data-id="${e.id}" title="Eliminar Partido" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3); padding: 0 8px;">🗑️</button>
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
    `,w(i)}function w(i){var c,f,m,y;document.querySelectorAll(".btn-breadcrumb").forEach(a=>{a.addEventListener("click",()=>{d=null,o(i)}),a.addEventListener("dragover",t=>{t.preventDefault(),a.style.background="#0f172a",a.style.borderColor="#38bdf8",a.style.color="#38bdf8"}),a.addEventListener("dragleave",t=>{a.style.background="",a.style.borderColor="",a.style.color=""}),a.addEventListener("drop",async t=>{t.preventDefault(),a.style.background="",a.style.borderColor="",a.style.color="";const l=t.dataTransfer.getData("text/plain");l&&(await window.apiPista.movePartidoPistaToCarpeta(parseInt(l),null),n=await window.apiPista.getPartidosPista(),o(i))})});const r=document.getElementById("modal-nueva-carpeta"),s=document.getElementById("input-nombre-carpeta");(c=document.getElementById("btn-nueva-carpeta"))==null||c.addEventListener("click",()=>{r&&s&&(s.value="",r.style.display="flex",s.focus())}),(f=document.getElementById("btn-cancelar-carpeta"))==null||f.addEventListener("click",()=>{r&&(r.style.display="none")});const p=async()=>{const a=s==null?void 0:s.value.trim();a&&(await window.apiPista.createCarpetaPista(a),u=await window.apiPista.getCarpetasPista(),r&&(r.style.display="none"),o(i))};(m=document.getElementById("btn-confirmar-carpeta"))==null||m.addEventListener("click",p),s==null||s.addEventListener("keypress",a=>{a.key==="Enter"&&p()}),r==null||r.addEventListener("click",a=>{a.target===r&&(r.style.display="none")}),document.querySelectorAll(".carpeta-item").forEach(a=>{a.addEventListener("click",t=>{t.target.closest(".btn-eliminar-carpeta")||(d=parseInt(a.dataset.id),o(i))}),a.addEventListener("dragover",t=>{t.preventDefault(),a.style.borderColor="#38bdf8",a.style.background="#0f172a"}),a.addEventListener("dragleave",t=>{a.style.borderColor="#334155",a.style.background="#1e293b"}),a.addEventListener("drop",async t=>{t.preventDefault(),a.style.borderColor="#334155",a.style.background="#1e293b";const l=t.dataTransfer.getData("text/plain");if(l){const v=parseInt(a.dataset.id);await window.apiPista.movePartidoPistaToCarpeta(parseInt(l),v),n=await window.apiPista.getPartidosPista(),o(i)}})}),document.querySelectorAll(".btn-eliminar-carpeta").forEach(a=>{a.addEventListener("click",async t=>{t.stopPropagation(),confirm("¿Eliminar esta carpeta? Los partidos que contenga volverán a la Raíz.")&&(await window.apiPista.deleteCarpetaPista(parseInt(a.dataset.id)),u=await window.apiPista.getCarpetasPista(),n=await window.apiPista.getPartidosPista(),o(i))})}),document.querySelectorAll(".partido-item").forEach(a=>{a.addEventListener("dragstart",t=>{t.dataTransfer.setData("text/plain",a.dataset.id),a.style.opacity="0.4",a.style.transform="scale(0.98)"}),a.addEventListener("dragend",t=>{a.style.opacity="1",a.style.transform="none"})}),(y=document.getElementById("btn-nuevo-partido-dash"))==null||y.addEventListener("click",()=>{g.navigate("nuevo-partido-pista")}),document.querySelectorAll(".btn-scouting").forEach(a=>{a.addEventListener("click",()=>{g.navigate("scouting-pista",{partidoId:parseInt(a.dataset.id)})})}),document.querySelectorAll(".btn-informe").forEach(a=>{a.addEventListener("click",()=>{g.navigate("informe-pista",{partidoId:parseInt(a.dataset.id)})})});const e=document.getElementById("input-buscar-partido");e==null||e.addEventListener("input",a=>{b=a.target.value.trim(),o(i);const t=document.getElementById("input-buscar-partido");t&&(t.focus(),t.setSelectionRange(t.value.length,t.value.length))}),document.querySelectorAll(".btn-toggle-finalizado").forEach(a=>{a.addEventListener("click",async()=>{const t=parseInt(a.dataset.id),l=a.dataset.finalizado==="1"?0:1;await window.apiPista.updatePartidoPista(t,{finalizado:l}),n=await window.apiPista.getPartidosPista(),o(i),typeof showToast<"u"&&showToast(l?"Partido marcado como finalizado":"Partido reabierto","success")})}),document.querySelectorAll(".btn-export-csv").forEach(a=>{a.addEventListener("click",async()=>{try{await window.apiPista.exportAccionesPistaCSV(parseInt(a.dataset.id))&&typeof showToast<"u"&&showToast("Acciones exportadas a CSV","success")}catch(t){typeof showToast<"u"&&showToast(t.message||"Error al exportar CSV","error")}})}),document.querySelectorAll(".btn-eliminar-partido").forEach(a=>{a.addEventListener("click",async()=>{confirm("¿Seguro que quieres eliminar este partido y TODAS sus acciones? Esto no se puede deshacer.")&&(await window.apiPista.deletePartidoPista(parseInt(a.dataset.id)),n=await window.apiPista.getPartidosPista(),o(i))})})}export{E as registerDashboardPista};
