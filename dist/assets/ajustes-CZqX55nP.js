import{r as g,g as b,A as m,b as i,c as h}from"./index-mPRRmVeE.js";import{s as c}from"./helpers-Doah0GRy.js";import{r as y,b as f}from"./settings-ui-B172_9p5.js";function $(){g.register("ajustes",async t=>{n(t)})}function n(t){const a=b();t.innerHTML=`
        <div class="ajustes-page">
            <div class="page-header">
                <h1 class="page-title">⚙️ Ajustes</h1>
                <p class="page-subtitle">Personaliza el aspecto de la aplicación</p>
            </div>

            <div class="card settings-card">
                <h3 class="settings-section-title">🎨 Apariencia</h3>

                <div class="setting-row">
                    <div>
                        <div class="setting-label">Tema</div>
                        <div class="setting-hint">Elige entre modo claro u oscuro</div>
                    </div>
                    <div class="theme-toggle-group">
                        <button class="theme-opt ${a.theme==="dark"?"active":""}" data-theme="dark">🌙 Oscuro</button>
                        <button class="theme-opt ${a.theme==="light"?"active":""}" data-theme="light">☀️ Claro</button>
                    </div>
                </div>

                <div class="setting-row">
                    <div>
                        <div class="setting-label">Color de acento</div>
                        <div class="setting-hint">El color principal de botones y resaltados</div>
                    </div>
                    <div class="accent-picker">
                        ${m.map(s=>`
                            <button class="accent-swatch ${a.accent.toLowerCase()===s.value.toLowerCase()?"active":""}"
                                data-accent="${s.value}" title="${s.name}" style="background:${s.value};"></button>
                        `).join("")}
                        <label class="accent-swatch accent-custom" title="Color personalizado">
                            <input type="color" id="accent-custom-input" value="${a.accent}">
                            🎨
                        </label>
                    </div>
                </div>

                <div class="setting-row">
                    <div>
                        <div class="setting-label">Densidad</div>
                        <div class="setting-hint">Espaciado de la interfaz</div>
                    </div>
                    <div class="theme-toggle-group">
                        <button class="density-opt ${a.density==="normal"?"active":""}" data-density="normal">Normal</button>
                        <button class="density-opt ${a.density==="compact"?"active":""}" data-density="compact">Compacta</button>
                    </div>
                </div>
                <div class="setting-row">
                    <div><div class="setting-label">Tamaño de texto</div><div class="setting-hint">Mejora la lectura en pantallas pequeñas o a distancia</div></div>
                    <div class="theme-toggle-group">
                        <button class="font-opt ${a.fontScale==="compact"?"active":""}" data-font="compact">Pequeño</button>
                        <button class="font-opt ${(a.fontScale||"normal")==="normal"?"active":""}" data-font="normal">Normal</button>
                        <button class="font-opt ${a.fontScale==="large"?"active":""}" data-font="large">Grande</button>
                    </div>
                </div>
                <div class="setting-row">
                    <div><div class="setting-label">Reducir animaciones</div><div class="setting-hint">Una interfaz más estable y cómoda durante el scouting</div></div>
                    <label><input type="checkbox" id="reduce-motion" ${a.reduceMotion?"checked":""}> Activado</label>
                </div>
            </div>

            <div class="card settings-card">
                <h3 class="settings-section-title">🎬 Reproducción</h3>
                <div class="setting-row"><div><div class="setting-label">Salto de vídeo</div><div class="setting-hint">Segundos al avanzar o retroceder con el teclado</div></div><input type="number" id="video-seek-seconds" class="form-input" min="1" max="60" value="${a.videoSeekSeconds||5}" style="width:90px"></div>
                <div class="setting-row"><div><div class="setting-label">Velocidad inicial</div><div class="setting-hint">Se aplica al abrir un nuevo scouting</div></div><select id="video-default-speed" class="form-input" style="width:90px">${[.5,.75,1,1.25,1.5,2].map(s=>`<option value="${s}" ${Number(a.videoDefaultSpeed||1)===s?"selected":""}>${s}×</option>`).join("")}</select></div>
            </div>

            <div class="card settings-card">
                <h3 class="settings-section-title">👁️ Vista previa</h3>
                <div class="preview-box">
                    <button class="btn btn-primary">Botón primario</button>
                    <button class="btn btn-secondary">Secundario</button>
                    <span class="chip chip-accent">Etiqueta</span>
                    <span class="text-accent" style="font-weight:700;">Texto de acento</span>
                </div>
            </div>

            <div class="card settings-card">
                <h3 class="settings-section-title">💾 Copias de seguridad</h3>
                <div class="setting-row">
                    <div>
                        <div class="setting-label">Exportar copia de seguridad</div>
                        <div class="setting-hint">Guarda todos tus partidos y acciones en un archivo .db</div>
                    </div>
                    <button class="btn btn-primary" id="btn-backup-db">📤 Exportar</button>
                </div>
                <div class="setting-row">
                    <div>
                        <div class="setting-label">Restaurar copia de seguridad</div>
                        <div class="setting-hint">Sustituye los datos actuales por una copia anterior (la app se reiniciará)</div>
                    </div>
                    <button class="btn btn-secondary" id="btn-restore-db" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">📥 Restaurar</button>
                </div>
            </div>

            ${y("playa")}

            <div class="flex gap-12" style="margin-top: 8px;">
                <button class="btn btn-secondary" id="btn-reset-ajustes">↺ Restablecer valores</button>
            </div>
        </div>
    `,S(t)}function S(t){var s,d,r,v,u,p;t.querySelectorAll(".theme-opt").forEach(e=>{e.addEventListener("click",()=>{i({theme:e.dataset.theme}),l(t,".theme-opt",e),c("Tema actualizado","success")})}),t.querySelectorAll(".density-opt").forEach(e=>{e.addEventListener("click",()=>{i({density:e.dataset.density}),l(t,".density-opt",e)})}),t.querySelectorAll(".font-opt").forEach(e=>e.addEventListener("click",()=>{i({fontScale:e.dataset.font}),l(t,".font-opt",e)})),(s=t.querySelector("#reduce-motion"))==null||s.addEventListener("change",e=>i({reduceMotion:e.target.checked})),(d=t.querySelector("#video-seek-seconds"))==null||d.addEventListener("change",e=>i({videoSeekSeconds:Math.max(1,Math.min(60,Number(e.target.value)||5))})),(r=t.querySelector("#video-default-speed"))==null||r.addEventListener("change",e=>i({videoDefaultSpeed:Number(e.target.value)})),t.querySelectorAll(".accent-swatch[data-accent]").forEach(e=>{e.addEventListener("click",()=>{i({accent:e.dataset.accent}),t.querySelectorAll(".accent-swatch").forEach(o=>o.classList.remove("active")),e.classList.add("active")})});const a=t.querySelector("#accent-custom-input");a==null||a.addEventListener("input",e=>{i({accent:e.target.value}),t.querySelectorAll(".accent-swatch").forEach(o=>o.classList.remove("active"))}),(v=t.querySelector("#btn-backup-db"))==null||v.addEventListener("click",async()=>{try{await window.api.backupDatabase()&&c("Copia de seguridad guardada","success")}catch(e){c(e.message||"Error al crear la copia","error")}}),(u=t.querySelector("#btn-restore-db"))==null||u.addEventListener("click",async()=>{if(confirm(`⚠️ Restaurar una copia SUSTITUIRÁ todos los datos actuales y la app se reiniciará.

¿Continuar?`))try{await window.api.restoreDatabase()}catch(e){c(e.message||"Error al restaurar la copia","error")}}),f(t,"playa",()=>n(t)),(p=t.querySelector("#btn-reset-ajustes"))==null||p.addEventListener("click",()=>{i({theme:"dark",accent:"#f59e0b",density:"normal",fontScale:"normal",reduceMotion:!1,videoSeekSeconds:5,videoDefaultSpeed:1,keybindings:{}}),h(),n(t),c("Ajustes restablecidos","info")})}function l(t,a,s){t.querySelectorAll(a).forEach(d=>d.classList.remove("active")),s.classList.add("active")}export{$ as registerAjustes};
