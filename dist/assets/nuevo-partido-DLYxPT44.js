import{r as g,F as j}from"./index-mPRRmVeE.js";import{a as B,s as u}from"./helpers-Doah0GRy.js";function L(){g.register("nuevo-partido",async v=>{var o,m,i;const c=await window.api.getJugadores().catch(()=>[]);v.innerHTML=`
            <div class="nuevo-partido-page">
                <div class="page-header">
                    <h1 class="page-title">➕ Nuevo Partido</h1>
                    <p class="page-subtitle">Configura el partido antes de empezar el scouting</p>
                </div>

                <div class="card" style="max-width: 700px;">
                        <form id="form-partido">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Fecha del Partido *</label>
                                    <input type="date" class="form-input" id="input-fecha" value="${B()}" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Torneo</label>
                                    <input type="text" class="form-input" id="input-torneo" placeholder="Ej: World Tour Madrid">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Fase</label>
                                    <select class="form-select" id="input-fase">
                                        <option value="">Seleccionar fase...</option>
                                        ${j.map(t=>`<option value="${t}">${t}</option>`).join("")}
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Pareja a Analizar *</label>
                                    <input type="text" class="form-input" id="input-pareja" placeholder="Ej: Herrera/Gavira" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Pareja Rival *</label>
                                    <input type="text" class="form-input" id="input-rival" placeholder="Ej: Mol/Sorum" required>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Nombre Jugador 1 *</label>
                                    <div class="autocomplete" id="ac-jugador1">
                                        <input type="text" class="form-input" id="input-jugador1" placeholder="Buscar o escribir..." autocomplete="off" required>
                                        <div class="autocomplete-list" id="list-jugador1"></div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Nombre Jugador 2 *</label>
                                    <div class="autocomplete" id="ac-jugador2">
                                        <input type="text" class="form-input" id="input-jugador2" placeholder="Buscar o escribir..." autocomplete="off" required>
                                        <div class="autocomplete-list" id="list-jugador2"></div>
                                    </div>
                                </div>
                            </div>
                            <p class="text-muted" style="font-size:12px; margin-top:-8px;">💡 Sugerencias de tu base de datos de jugadores. Puedes gestionarlos en la sección <strong>Jugadores</strong>.</p>

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
                                <label class="setting-hint" style="display:block; margin-top:10px; cursor:pointer;"><input type="checkbox" id="input-detect-whistles"> Analizar localmente los silbatos para navegar con los botones laterales del ratón</label>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Notas</label>
                                <textarea class="form-textarea" id="input-notas" placeholder="Notas sobre el partido..."></textarea>
                            </div>

                            <div class="flex gap-12" style="margin-top: 24px;">
                                <button type="submit" class="btn btn-primary btn-lg">
                                    🏐 Crear y Empezar Scouting
                                </button>
                                <button type="button" class="btn btn-secondary btn-lg" id="btn-solo-crear">
                                    💾 Solo Guardar
                                </button>
                            </div>
                        </form>
                    </div>
            </div>
        `,h("input-jugador1","list-jugador1",c),h("input-jugador2","list-jugador2",c),document.querySelectorAll('input[name="video-tipo"]').forEach(t=>{t.addEventListener("change",()=>{const e=document.querySelector('input[name="video-tipo"]:checked').value;document.getElementById("youtube-input-group").style.display=e==="youtube"?"block":"none",document.getElementById("local-input-group").style.display=e==="local"?"flex":"none"})});let p="";(o=document.getElementById("btn-seleccionar-video"))==null||o.addEventListener("click",async()=>{const t=await window.api.openVideoFile();if(t){p=t;const e=t.split("/").pop().split("\\").pop();document.getElementById("video-file-name").textContent=e}});const l=async t=>{var y;const e=document.getElementById("input-jugador1").value.trim(),s=document.getElementById("input-jugador2").value.trim(),a=document.getElementById("input-pareja").value.trim(),r=document.getElementById("input-rival").value.trim();if(!e||!s||!a||!r){u("Rellena todos los campos obligatorios de nombres","error");return}const n=document.querySelector('input[name="video-tipo"]:checked').value;let d="";n==="youtube"?d=document.getElementById("input-youtube-url").value.trim():n==="local"&&(d=p);const f=document.getElementById("input-notas").value.trim(),x=f?`Pareja: ${a} vs ${r}
${f}`:`Pareja: ${a} vs ${r}`,E={fecha:document.getElementById("input-fecha").value,torneo:document.getElementById("input-torneo").value.trim(),fase:document.getElementById("input-fase").value,jugador1_nombre:e,jugador2_nombre:s,video_tipo:n==="none"?"":n,video_url:d,notas:x},w=await window.api.createPartido(E);if(n==="local"&&d&&((y=document.getElementById("input-detect-whistles"))!=null&&y.checked)){u("Analizando silbatos localmente… puede tardar unos minutos","info");try{const b=await window.api.analyzeWhistles(d);u(`${b.length} silbatos detectados. Ya puedes usar Mouse Atrás/Adelante.`,"success")}catch(b){u(`No se pudo analizar el audio: ${b.message}`,"warning")}}u("Partido creado correctamente","success"),t?g.navigate("scouting",{partidoId:w}):g.navigate("dashboard")};(m=document.getElementById("form-partido"))==null||m.addEventListener("submit",t=>{t.preventDefault(),l(!0)}),(i=document.getElementById("btn-solo-crear"))==null||i.addEventListener("click",()=>{l(!1)})})}function h(v,c,p){const l=document.getElementById(v),o=document.getElementById(c);if(!l||!o)return;const m=p.map(e=>({full:`${e.nombre}${e.apellidos?" "+e.apellidos:""}`.trim(),sub:[e.nacionalidad,e.posicion].filter(Boolean).join(" · ")}));let i=-1;const t=()=>{const e=l.value.trim().toLowerCase(),s=m.filter(a=>!e||a.full.toLowerCase().includes(e)).slice(0,8);if(s.length===0){o.style.display="none",o.innerHTML="";return}i=-1,o.innerHTML=s.map((a,r)=>`
            <div class="autocomplete-item" data-index="${r}" data-value="${a.full.replace(/"/g,"&quot;")}">
                <span class="ac-name">${a.full}</span>
                ${a.sub?`<span class="ac-sub">${a.sub}</span>`:""}
            </div>
        `).join(""),o.style.display="block",o.querySelectorAll(".autocomplete-item").forEach(a=>{a.addEventListener("mousedown",r=>{r.preventDefault(),l.value=a.dataset.value,o.style.display="none"})})};l.addEventListener("focus",t),l.addEventListener("input",t),l.addEventListener("blur",()=>setTimeout(()=>{o.style.display="none"},120)),l.addEventListener("keydown",e=>{const s=o.querySelectorAll(".autocomplete-item");if(!(o.style.display==="none"||s.length===0)){if(e.key==="ArrowDown")e.preventDefault(),i=Math.min(i+1,s.length-1);else if(e.key==="ArrowUp")e.preventDefault(),i=Math.max(i-1,0);else if(e.key==="Enter"&&i>=0){e.preventDefault(),l.value=s[i].dataset.value,o.style.display="none";return}else return;s.forEach((a,r)=>a.classList.toggle("active",r===i))}})}export{L as registerNuevoPartido};
