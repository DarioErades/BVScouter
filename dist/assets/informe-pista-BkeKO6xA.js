import{r as C}from"./index-mPRRmVeE.js";import{s as q,f as F}from"./helpers-Doah0GRy.js";import{c as z,d as B}from"./stats-calculator-pista-WTzHIEyx.js";function J(r){return!r||["tiempo_muerto","cambio","fin_set"].includes(r.tipo_accion)?!1:["rival","error_general"].includes(r.tipo_accion)?!0:["recepcion","defensa","colocacion","freeball"].includes(r.tipo_accion)?r.resultado==="=":["#","=","/"].includes(r.resultado)}function G(r){return r.tipo_accion==="rival"?r.resultado==="="?"local":"rival":r.tipo_accion==="error_general"||r.resultado==="/"&&r.tipo_accion==="ataque"||r.resultado==="="&&r.tipo_accion!=="rival"?"rival":r.resultado==="#"&&["ataque","saque","bloqueo"].includes(r.tipo_accion)?"local":null}function H(r,m=[]){const i=[],l=new Set(m.map(e=>Number(e.dorsal))),d=[...r].sort((e,f)=>(e.id||0)-(f.id||0));for(const e of d){const f=Number(e.rotacion);(!Number.isInteger(f)||f<1||f>6)&&i.push({level:"error",actionId:e.id,text:`Rotación inválida en la acción #${e.id}.`}),["local","rival"].includes(e.equipo_al_saque||"")||i.push({level:"warning",actionId:e.id,text:`Falta el equipo al saque en la acción #${e.id}; corresponde a datos anteriores a la migración.`}),e.dorsal>0&&!l.has(Number(e.dorsal))&&i.push({level:"warning",actionId:e.id,text:`El dorsal #${e.dorsal} de la acción #${e.id} no pertenece al roster del partido.`});const P=Number(e.marcador_pre_local),w=Number(e.marcador_pre_rival),y=Number(e.marcador_local),_=Number(e.marcador_rival),$=G(e);if(Number(e.scouting_version)>=2&&$&&[P,w,y,_].every(Number.isFinite)){const R=P+($==="local"?1:0),A=w+($==="rival"?1:0);(y!==R||_!==A)&&i.push({level:"error",actionId:e.id,text:`Marcador incoherente tras la acción #${e.id}.`})}}const s=[...d].reverse().find(e=>!["tiempo_muerto","cambio","fin_set"].includes(e.tipo_accion));return s&&!J(s)&&i.push({level:"warning",actionId:s.id,text:"El último rally está abierto: no termina en punto o error."}),{issues:i,errors:i.filter(e=>e.level==="error").length,warnings:i.filter(e=>e.level==="warning").length,isValid:!i.some(e=>e.level==="error")}}let k=[];function W(r){return!r||["tiempo_muerto","cambio"].includes(r.tipo_accion)?!1:r.tipo_accion==="rival"||r.tipo_accion==="error_general"?!0:["recepcion","defensa","colocacion","freeball"].includes(r.tipo_accion)?r.resultado==="=":["#","=","/"].includes(r.resultado)}function Z(r){const m=[],i=[];let l=[];return[...r].sort((d,s)=>(d.id||0)-(s.id||0)).forEach(d=>{if(d.tipo_accion==="tiempo_muerto"&&i.push({set:d.set_numero,punto:m.filter(s=>s.set===d.set_numero).length}),l.push(d),W(d)){const s=l[l.length-1];m.push({set:s.set_numero,local:Number(s.marcador_local||0),rival:Number(s.marcador_rival||0)}),l=[]}}),{puntos:m,tiemposMuertos:i}}function j(){C.register("informe-pista",async(r,m)=>{var N,T;k.forEach(t=>t.destroy()),k=[];const i=m.partidoId,l=await window.apiPista.getPartidoPista(i);if(!l){q("Partido no encontrado","error"),C.navigate("dashboard-pista");return}const d=await window.apiPista.getRoster(i),s=await window.apiPista.getAccionesPista(i),e=Z(s),f=[...new Set(s.map(t=>t.set_numero))].sort((t,n)=>t-n);let P=0,w=0;const y=[];f.forEach(t=>{const n=e.puntos.filter(h=>h.set===t),v=s.filter(h=>h.set_numero===t),b=v[v.length-1],p=n[n.length-1],x=(p==null?void 0:p.local)??Number((b==null?void 0:b.marcador_local)||0),g=(p==null?void 0:p.rival)??Number((b==null?void 0:b.marcador_rival)||0);y.push(`${x}-${g}`),x>g?P++:g>x&&w++});const _=`${P}-${w}`,$=y.length>0?`(${y.join(", ")})`:"",R=l.equipo_nombre||l.equipo_local||"Local",A=l.rival_nombre||l.equipo_visitante||"Rival",S=z?z(s,d):{};B&&B(s,d);const c=H(s,d),D=d.map(t=>{var v,b;const n=((v=S.porJugador)==null?void 0:v[t.dorsal])||((b=S.porJugador)==null?void 0:b[String(t.dorsal)]);return n?{...t,stats:n}:{...t,stats:K()}}),o=(t,n,v=0)=>t&&t[n]!==void 0?t[n]:v,a=S.avanzadas||{sideOut:{recepciones:0,puntos:0,ratio:"0%"},breakPoint:{saques:0,puntos:0,ratio:"0%"},ataquePos:{tot:0,err:0,blq:0,ptsPct:"0%"},ataqueNeg:{tot:0,err:0,blq:0,ptsPct:"0%"},contraataque:{tot:0,err:0,blq:0,ptsPct:"0%"}};if(r.innerHTML=`
            <div class="report-container page-enter">
                <div class="report-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h1 class="report-title">📊 Informe de Partido</h1>
                        <div class="report-meta">
                            <p><strong>${R}</strong> vs <strong>${A}</strong></p>
                            <p>${l.torneo||"Amistoso"} · ${l.fase||"-"} · ${F(l.fecha)}</p>
                            <p>Resultado: <strong class="text-accent">${_} ${$}</strong></p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary" id="btn-back">← Volver</button>
                        <button class="btn btn-secondary" id="btn-export-csv">📥 CSV</button>
                        <button class="btn btn-primary" id="btn-export-pdf">📄 Exportar PDF</button>
                    </div>
                </div>

                <div class="report-section">
                    <div style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:12px; margin-bottom:20px;">
                        <div class="report-stat-card"><div class="report-stat-label">Resultado</div><div class="report-stat-value">${_}</div><div class="report-stat-sublabel">${$||"Sin sets finalizados"}</div></div>
                        <div class="report-stat-card"><div class="report-stat-label">Side-Out</div><div class="report-stat-value">${a.sideOut.ratio}</div><div class="report-stat-sublabel">${a.sideOut.puntos}/${a.sideOut.recepciones} puntos</div></div>
                        <div class="report-stat-card"><div class="report-stat-label">Break Point</div><div class="report-stat-value">${a.breakPoint.ratio}</div><div class="report-stat-sublabel">${a.breakPoint.puntos}/${a.breakPoint.saques} puntos</div></div>
                        <div class="report-stat-card" style="border-color:${c.isValid?"#10b981":"#ef4444"};"><div class="report-stat-label">Calidad del dato</div><div class="report-stat-value" style="color:${c.isValid?"#10b981":"#ef4444"};">${c.isValid?"OK":"REVISAR"}</div><div class="report-stat-sublabel">${c.errors} errores · ${c.warnings} avisos</div></div>
                    </div>
                    ${c.issues.length?`<div style="padding:14px; border-radius:10px; border:1px solid ${c.isValid?"#f59e0b":"#ef4444"}; background:${c.isValid?"rgba(245,158,11,.08)":"rgba(239,68,68,.08)"}; margin-bottom:18px;"><strong>${c.isValid?"Avisos de calidad":"Datos que requieren revisión"}</strong><ul style="margin:8px 0 0 18px; color:var(--text-secondary);">${c.issues.slice(0,5).map(t=>`<li>${t.text}</li>`).join("")}${c.issues.length>5?`<li>Y ${c.issues.length-5} incidencias más.</li>`:""}</ul></div>`:""}
                    <h2 class="report-section-title">Estadísticas de Jugadores</h2>
                    <div style="overflow-x: auto; margin-bottom: 24px;">
                        <table class="data-table" style="width: 100%; font-size: 11px; text-align: center; border-collapse: collapse; min-width: 950px;">
                            <thead>
                                <tr style="background: rgba(255,255,255,0.05);">
                                    <th colspan="6" style="border-right: 1px solid var(--border);">General</th>
                                    <th colspan="4" style="border-right: 1px solid var(--border);">Puntos</th>
                                    <th colspan="3" style="border-right: 1px solid var(--border);">Saque</th>
                                    <th colspan="4" style="border-right: 1px solid var(--border);">Recepción</th>
                                    <th colspan="5" style="border-right: 1px solid var(--border);">Ataque</th>
                                    <th>Bloqueo</th>
                                </tr>
                                <tr style="background: rgba(255,255,255,0.02); color: var(--text-secondary); border-bottom: 1px solid var(--border);">
                                    <th style="padding: 6px;">Nº</th>
                                    <th style="text-align: left;">Nombre</th>
                                    <th>Sets</th>
                                    <th>Voto</th>
                                    <th>FP</th>
                                    <th style="border-right: 1px solid var(--border);">G-P</th>
                                    <th>Saq</th>
                                    <th>Att</th>
                                    <th>BLQ</th>
                                    <th style="border-right: 1px solid var(--border);">ERR</th>
                                    <th>Tot</th>
                                    <th>Err</th>
                                    <th style="border-right: 1px solid var(--border);">Pts</th>
                                    <th>Tot</th>
                                    <th>Err</th>
                                    <th>Pos%</th>
                                    <th style="border-right: 1px solid var(--border);">Exc%</th>
                                    <th>Tot</th>
                                    <th>Err</th>
                                    <th>Blq</th>
                                    <th>Pts</th>
                                    <th style="border-right: 1px solid var(--border);">Pts%</th>
                                    <th>Pts</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${D.map((t,n)=>`
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); ${n%2!==0?"background: rgba(255,255,255,0.02);":""}">
                                        <td style="padding: 6px;"><strong>${t.dorsal}</strong></td>
                                        <td style="text-align: left;">${t.nombre}</td>
                                        <td>${Array.isArray(t.stats.setsJugados)?t.stats.setsJugados.length:o(t.stats,"setsJugados","-")}</td>
                                        <td><strong>${o(t.stats,"voto","6.0")}</strong></td>
                                        <td>${o(t.stats,"fasePunto",0)}</td>
                                        <td style="border-right: 1px solid var(--border); font-weight: bold; color: ${o(t.stats,"gMenosP",0)>=0?"var(--accent-primary)":"#ef4444"};">${o(t.stats,"gMenosP",0)>0?"+":""}${o(t.stats,"gMenosP",0)}</td>
                                        
                                        <td>${o(t.stats,"ptsSaque",0)}</td>
                                        <td>${o(t.stats,"ptsAtaque",0)}</td>
                                        <td>${o(t.stats,"ptsBloqueo",0)}</td>
                                        <td style="border-right: 1px solid var(--border);">${o(t.stats,"errAdversario",0)}</td>
                                        
                                        <td>${o(t.stats,"saqueTot",0)}</td>
                                        <td>${o(t.stats,"saqueErr",0)}</td>
                                        <td style="border-right: 1px solid var(--border);">${o(t.stats,"ptsSaque",0)}</td>
                                        
                                        <td>${o(t.stats,"recTot",0)}</td>
                                        <td>${o(t.stats,"recErr",0)}</td>
                                        <td>${o(t.stats,"recPosPct","0%")}</td>
                                        <td style="border-right: 1px solid var(--border);">${o(t.stats,"recExcPct","0%")}</td>
                                        
                                        <td>${o(t.stats,"attTot",0)}</td>
                                        <td>${o(t.stats,"attErr",0)}</td>
                                        <td>${o(t.stats,"attBlq",0)}</td>
                                        <td>${o(t.stats,"ptsAtaque",0)}</td>
                                        <td style="border-right: 1px solid var(--border);">${o(t.stats,"attPtsPct","0%")}</td>
                                        
                                        <td>${o(t.stats,"ptsBloqueo",0)}</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Salto de página para el PDF -->
                <div class="pdf-page-break" style="page-break-before: always; break-before: page; margin-top: 32px;"></div>

                <div class="report-grid" style="grid-template-columns: 1fr 1fr; gap: 24px;">
                    <div class="report-section">
                        <h2 class="report-section-title">Análisis Avanzado (Side-Out & Break Point)</h2>
                        <div class="report-stat-card" style="margin-bottom: 12px;">
                            <div class="report-stat-label">Side-Out (Recepción a Punto)</div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                                <div class="report-stat-sublabel">${a.sideOut.recepciones} recepciones totales</div>
                                <div class="report-stat-value" style="font-size: 20px;">${a.sideOut.puntos} pts (${a.sideOut.ratio})</div>
                            </div>
                        </div>
                        <div class="report-stat-card" style="margin-bottom: 12px;">
                            <div class="report-stat-label">Break Point (Saque a Punto)</div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                                <div class="report-stat-sublabel">${a.breakPoint.saques} saques totales</div>
                                <div class="report-stat-value" style="font-size: 20px;">${a.breakPoint.puntos} pts (${a.breakPoint.ratio})</div>
                            </div>
                        </div>
                        <div style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
                            <h3 style="font-size: 14px; margin-bottom: 12px; color: var(--text-secondary);">Eficacia de Ataque por Situación</h3>
                            
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                                <span>1er Ataque tras Rec. Positiva</span>
                                <strong>${a.ataquePos.ptsPct}</strong>
                                <span style="font-size: 12px; color: var(--text-secondary);">(${a.ataquePos.tot} tot / ${a.ataquePos.cont||0} cont / ${a.ataquePos.err} err / ${a.ataquePos.blq} blq)</span>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                                <span>1er Ataque tras Rec. Negativa</span>
                                <strong>${a.ataqueNeg.ptsPct}</strong>
                                <span style="font-size: 12px; color: var(--text-secondary);">(${a.ataqueNeg.tot} tot / ${a.ataqueNeg.cont||0} cont / ${a.ataqueNeg.err} err / ${a.ataqueNeg.blq} blq)</span>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between;">
                                <span>Contraataque (Transición)</span>
                                <strong>${a.contraataque.ptsPct}</strong>
                                <span style="font-size: 12px; color: var(--text-secondary);">(${a.contraataque.tot} tot / ${a.contraataque.cont||0} cont / ${a.contraataque.err} err / ${a.contraataque.blq} blq)</span>
                            </div>
                        </div>
                    </div>

                    <div class="report-section">
                        <h2 class="report-section-title">Evolución de Marcador y Rachas</h2>
                        <div class="chart-container" style="height: 220px; margin-bottom: 16px;">
                            <canvas id="chart-ataque-dist"></canvas>
                        </div>
                        <div class="chart-container" style="height: 220px;">
                            <canvas id="chart-rec-quality"></canvas>
                        </div>
                    </div>
                </div>

                <div class="report-section" style="margin-top: 24px;">
                    <h2 class="report-section-title">Evolución del Marcador por Set (Punto a Punto)</h2>
                    <div class="chart-container" style="height: 260px;">
                        <canvas id="chart-puntos-set"></canvas>
                    </div>
                </div>
            </div>
        `,window.Chart){const t=document.getElementById("chart-ataque-dist").getContext("2d"),n=document.getElementById("chart-rec-quality").getContext("2d"),v=document.getElementById("chart-puntos-set").getContext("2d"),b=getComputedStyle(document.documentElement).getPropertyValue("--accent-primary").trim()||"#f59e0b",p=((N=S.totalEquipo)==null?void 0:N.ataque)||{total:0,puntos:0,errores:0,bloqueados:0},x={puntos:p.puntos||0,continuidad:Math.max(0,(p.total||0)-(p.puntos||0)-(p.errores||0)-(p.bloqueados||0)),errores:(p.errores||0)+(p.bloqueados||0)};k.push(new window.Chart(t,{type:"doughnut",data:{labels:["Puntos","Continuidad","Error / Bloqueo"],datasets:[{data:[x.puntos,x.continuidad,x.errores],backgroundColor:["#10b981","#3b82f6","#ef4444"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"right",labels:{color:"#e5e7eb"}},title:{display:!0,text:"Distribución de Ataques",color:"#e5e7eb"}}}}));const g=((T=S.totalEquipo)==null?void 0:T.recepcion)||{total:0,excelentes:0,positivas:0,errores:0},h={perfecta:g.excelentes||0,buena:Math.max(0,(g.positivas||0)-(g.excelentes||0)),mala:Math.max(0,(g.total||0)-(g.positivas||0)-(g.errores||0)),error:g.errores||0};k.push(new window.Chart(n,{type:"doughnut",data:{labels:["Perfecta (#)","Positiva (+)","Negativa (-)","Error (=)"],datasets:[{data:[h.perfecta||0,h.buena||0,h.mala||0,h.error||0],backgroundColor:["#10b981","#3b82f6","#f59e0b","#ef4444"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"right",labels:{color:"#e5e7eb"}},title:{display:!0,text:"Calidad de Recepción",color:"#e5e7eb"}}}}));const E=e.puntos,M=E.map((u,V)=>`${u.set}.${V+1}`),L=E.map((u,V)=>e.tiemposMuertos.some(I=>I.set===u.set&&I.punto===E.filter(O=>O.set===u.set).indexOf(u))?Math.max(u.local,u.rival)+1:null);k.push(new window.Chart(v,{type:"line",data:{labels:M,datasets:[{label:R,data:E.map(u=>u.local),borderColor:b,backgroundColor:b,tension:.15,pointRadius:3},{label:A,data:E.map(u=>u.rival),borderColor:"#94a3b8",backgroundColor:"#94a3b8",tension:.15,pointRadius:3},{label:"Tiempo muerto",data:L,borderColor:"#ef4444",backgroundColor:"#ef4444",showLine:!1,pointRadius:7,pointHoverRadius:9,pointStyle:"rectRot"}]},options:{responsive:!0,maintainAspectRatio:!1,spanGaps:!0,scales:{y:{beginAtZero:!0,grid:{color:"rgba(255,255,255,0.05)"},ticks:{color:"#9ca3af",stepSize:1}},x:{grid:{display:!1},ticks:{color:"#9ca3af",maxRotation:0,autoSkip:!0}}},plugins:{legend:{labels:{color:"#e5e7eb"}},tooltip:{callbacks:{label:u=>`${u.dataset.label}: ${u.parsed.y??""}`}}}}}))}r.querySelector("#btn-back").addEventListener("click",()=>{C.navigate("dashboard-pista")}),r.querySelector("#btn-export-csv").addEventListener("click",async()=>{try{await window.apiPista.exportAccionesPistaCSV(i),q("CSV exportado correctamente","success")}catch{q("Error al exportar CSV","error")}}),r.querySelector("#btn-export-pdf").addEventListener("click",async()=>{try{if(!c.isValid&&!confirm(`El informe contiene ${c.errors} errores de datos. ¿Exportarlo de todos modos?`))return;q("Generando PDF...","info");const n=`
                    <style>
                        body { font-family: sans-serif; color: #333; background: #fff; }
                        .text-accent { color: #f59e0b; }
                        .report-title { font-size: 24px; margin-bottom: 8px; }
                        .report-section-title { font-size: 18px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
                        .data-table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: center; }
                        .data-table th, .data-table td { border: 1px solid #ddd; padding: 4px; }
                        .data-table th { background: #f5f5f5; font-weight: bold; }
                        .btn, .chart-container { display: none !important; }
                    </style>
                    ${document.querySelector(".report-container").outerHTML.replace(/var\(--[a-zA-Z-]+\)/g,"#333")}
                `,v=document.querySelector(".report-container").scrollHeight;await window.api.generatePDF(n,v+100)&&q("PDF exportado correctamente","success")}catch{q("Error al exportar PDF","error")}})})}function K(){return{setsJugados:0,voto:"6.0",fasePunto:0,gMenosP:0,ptsSaque:0,ptsAtaque:0,ptsBloqueo:0,errAdversario:0,saqueTot:0,saqueErr:0,recTot:0,recErr:0,recPosPct:"0%",recExcPct:"0%",attTot:0,attErr:0,attBlq:0,attPtsPct:"0%"}}export{j as registerInformePista};
