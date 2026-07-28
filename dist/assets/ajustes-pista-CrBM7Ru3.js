import{r as v,g,A as b,b as o}from"./index-mPRRmVeE.js";import{s as r}from"./helpers-Doah0GRy.js";import{r as y,b as m}from"./settings-ui-B172_9p5.js";function E(){v.register("ajustes-pista",async e=>{u(e)})}function u(e){const a=g();e.innerHTML=`
        <div class="ajustes-page page-enter">
            <div class="page-header" style="margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button class="btn btn-secondary btn-icon" id="btn-back" title="Volver">←</button>
                    <div>
                        <h1 class="page-title">⚙️ Ajustes (Pista)</h1>
                        <p class="page-subtitle">Personaliza el aspecto de la aplicación y gestiona datos</p>
                    </div>
                </div>
            </div>

            <div class="card settings-card" style="margin-bottom:16px; padding:20px;">
                <h3 class="settings-section-title">🎬 Reproducción</h3>
                <div class="setting-row"><div><div class="setting-label">Salto de vídeo</div><div class="setting-hint">Segundos al avanzar o retroceder</div></div><input type="number" id="video-seek-seconds" class="form-input" min="1" max="60" value="${a.videoSeekSeconds||5}" style="width:90px"></div>
                <div class="setting-row"><div><div class="setting-label">Velocidad inicial</div><div class="setting-hint">Se aplica a los nuevos scoutings</div></div><select id="video-default-speed" class="form-input" style="width:90px">${[.5,.75,1,1.25,1.5,2].map(i=>`<option value="${i}" ${Number(a.videoDefaultSpeed||1)===i?"selected":""}>${i}×</option>`).join("")}</select></div>
            </div>

            ${y("pista")}

            <div class="card settings-card" style="margin-bottom: 16px; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border);">
                <h3 class="settings-section-title" style="margin-bottom: 16px; color: var(--text-primary);">🎨 Apariencia</h3>

                <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div>
                        <div class="setting-label" style="font-weight: 500; margin-bottom: 4px;">Tema</div>
                        <div class="setting-hint" style="font-size: 13px; color: var(--text-secondary);">Elige entre modo claro u oscuro</div>
                    </div>
                    <div class="theme-toggle-group" style="display: flex; gap: 8px;">
                        <button class="btn theme-opt ${a.theme==="dark"?"btn-primary":"btn-secondary"}" data-theme="dark">🌙 Oscuro</button>
                        <button class="btn theme-opt ${a.theme==="light"?"btn-primary":"btn-secondary"}" data-theme="light">☀️ Claro</button>
                    </div>
                </div>

                <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div>
                        <div class="setting-label" style="font-weight: 500; margin-bottom: 4px;">Color de acento</div>
                        <div class="setting-hint" style="font-size: 13px; color: var(--text-secondary);">El color principal de botones y resaltados</div>
                    </div>
                    <div class="accent-picker" style="display: flex; gap: 8px;">
                        ${b.map(i=>`
                            <button class="accent-swatch ${a.accent.toLowerCase()===i.value.toLowerCase()?"active":""}"
                                data-accent="${i.value}" title="${i.name}" style="background:${i.value}; width: 24px; height: 24px; border-radius: 50%; border: ${a.accent.toLowerCase()===i.value.toLowerCase()?"2px solid white":"none"}; cursor: pointer;"></button>
                        `).join("")}
                        <label class="accent-swatch accent-custom" title="Color personalizado" style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: #333; cursor: pointer;">
                            <input type="color" id="accent-custom-input" value="${a.accent}" style="opacity: 0; position: absolute; width: 0; height: 0;">
                            <span style="font-size: 12px;">🎨</span>
                        </label>
                    </div>
                </div>

                <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div class="setting-label" style="font-weight: 500; margin-bottom: 4px;">Densidad</div>
                        <div class="setting-hint" style="font-size: 13px; color: var(--text-secondary);">Espaciado de la interfaz</div>
                    </div>
                    <div class="theme-toggle-group" style="display: flex; gap: 8px;">
                        <button class="btn density-opt ${a.density==="normal"?"btn-primary":"btn-secondary"}" data-density="normal">Normal</button>
                        <button class="btn density-opt ${a.density==="compact"?"btn-primary":"btn-secondary"}" data-density="compact">Compacta</button>
                    </div>
                </div>
                <div class="setting-row" style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
                    <div><div class="setting-label" style="font-weight:500; margin-bottom:4px;">Tamaño de texto</div><div class="setting-hint">Compacto, normal o grande</div></div>
                    <div class="theme-toggle-group"><button class="font-opt ${a.fontScale==="compact"?"active":""}" data-font="compact">Pequeño</button><button class="font-opt ${(a.fontScale||"normal")==="normal"?"active":""}" data-font="normal">Normal</button><button class="font-opt ${a.fontScale==="large"?"active":""}" data-font="large">Grande</button></div>
                </div>
                <div class="setting-row" style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
                    <div><div class="setting-label" style="font-weight:500; margin-bottom:4px;">Reducir animaciones</div><div class="setting-hint">Para una experiencia más estable durante el scouting</div></div>
                    <label><input type="checkbox" id="reduce-motion" ${a.reduceMotion?"checked":""}> Activado</label>
                </div>
            </div>

            <div class="card settings-card" style="margin-bottom: 16px; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border);">
                <h3 class="settings-section-title" style="margin-bottom: 16px; color: var(--text-primary);">💾 Base de Datos (Pista)</h3>
                <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div>
                        <div class="setting-label" style="font-weight: 500; margin-bottom: 4px;">Exportar copia de seguridad</div>
                        <div class="setting-hint" style="font-size: 13px; color: var(--text-secondary);">Guarda todos los datos de voleibol pista en un archivo .db</div>
                    </div>
                    <button class="btn btn-primary" id="btn-backup-db-pista">📤 Exportar</button>
                </div>
                <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div class="setting-label" style="font-weight: 500; margin-bottom: 4px;">Restaurar copia de seguridad</div>
                        <div class="setting-hint" style="font-size: 13px; color: var(--text-secondary);">Sustituye los datos actuales de pista por una copia anterior</div>
                    </div>
                    <button class="btn btn-secondary" id="btn-restore-db-pista" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">📥 Restaurar</button>
                </div>
            </div>

            <div class="card settings-card" style="padding: 20px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border);">
                <h3 class="settings-section-title" style="margin-bottom: 16px; color: var(--text-primary);">ℹ️ Acerca de BVScouter Pista</h3>
                <div class="setting-row">
                    <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.5;">
                        Módulo de scouting para voleibol indoor. <br>
                        Utiliza el sistema de evaluación DataVolley 4 para análisis estadístico avanzado.
                    </p>
                </div>
            </div>
        </div>
    `,h(e)}function h(e){var i,d,n,c,l,p;(i=e.querySelector("#btn-back"))==null||i.addEventListener("click",()=>{v.navigate("dashboard-pista")}),e.querySelectorAll(".theme-opt").forEach(t=>{t.addEventListener("click",()=>{o({theme:t.dataset.theme}),e.querySelectorAll(".theme-opt").forEach(s=>{s.classList.remove("btn-primary"),s.classList.add("btn-secondary")}),t.classList.add("btn-primary"),t.classList.remove("btn-secondary"),r("Tema actualizado","success")})}),e.querySelectorAll(".density-opt").forEach(t=>{t.addEventListener("click",()=>{o({density:t.dataset.density}),e.querySelectorAll(".density-opt").forEach(s=>{s.classList.remove("btn-primary"),s.classList.add("btn-secondary")}),t.classList.add("btn-primary"),t.classList.remove("btn-secondary")})}),e.querySelectorAll(".font-opt").forEach(t=>t.addEventListener("click",()=>{o({fontScale:t.dataset.font}),e.querySelectorAll(".font-opt").forEach(s=>s.classList.toggle("active",s===t))})),(d=e.querySelector("#reduce-motion"))==null||d.addEventListener("change",t=>o({reduceMotion:t.target.checked})),e.querySelectorAll(".accent-swatch[data-accent]").forEach(t=>{t.addEventListener("click",()=>{o({accent:t.dataset.accent}),e.querySelectorAll(".accent-swatch").forEach(s=>{s.classList.remove("active"),s.style.border="none"}),t.classList.add("active"),t.style.border="2px solid white"})});const a=e.querySelector("#accent-custom-input");a==null||a.addEventListener("input",t=>{o({accent:t.target.value}),e.querySelectorAll(".accent-swatch").forEach(s=>{s.classList.remove("active"),s.style.border="none"})}),(n=e.querySelector("#video-seek-seconds"))==null||n.addEventListener("change",t=>o({videoSeekSeconds:Math.max(1,Math.min(60,Number(t.target.value)||5))})),(c=e.querySelector("#video-default-speed"))==null||c.addEventListener("change",t=>o({videoDefaultSpeed:Number(t.target.value)})),m(e,"pista",()=>u(e)),(l=e.querySelector("#btn-backup-db-pista"))==null||l.addEventListener("click",async()=>{try{await window.apiPista.backupDatabasePista()&&r("Copia de seguridad guardada con éxito","success")}catch(t){r("Error al guardar copia: "+t.message,"error")}}),(p=e.querySelector("#btn-restore-db-pista"))==null||p.addEventListener("click",async()=>{if(confirm("⚠️ ADVERTENCIA: Esta acción sobrescribirá todos los datos actuales de pista. ¿Deseas continuar?"))try{await window.apiPista.restoreDatabasePista()&&r("Base de datos restaurada. Reinicia la aplicación.","success")}catch(t){r("Error al restaurar: "+t.message,"error")}})}export{E as registerAjustesPista};
