import{r as S}from"./index-mPRRmVeE.js";import{f as z,s as w,c as T,d as F}from"./helpers-Doah0GRy.js";import{c as J,d as W}from"./stats-calculator-DFBYOtiv.js";function V(a,p,e,n,g){let h=a.resultado||"–";if(g.length>0){const r=[...new Set(g.map(i=>i.set_numero))].sort(),c=[];let u=0,d=0;r.forEach(i=>{const x=g.filter(A=>A.set_numero===i),$=x[x.length-1];let q=parseInt($.marcador_local)||0,k=parseInt($.marcador_rival)||0;$.tipo_accion!=="fin_set"&&($.resultado==="punto"?q++:($.resultado==="error"||$.resultado==="bloqueado")&&k++),c.push(`${q}-${k}`),q>k?u++:k>q&&d++}),h=r.length===1?c[0]:`${u}-${d} (${c.join(", ")})`}const s=p.jugador1,o=p.jugador2,y=s.totalK1>0?Math.round(s.puntosK1/s.totalK1*100):0,b=o.totalK1>0?Math.round(o.puntosK1/o.totalK1*100):0,v=(r,c,u)=>`
        <tr>
            <td class="col-label">${r}</td>
            <td class="col-val">${c}</td>
            <td class="col-val">${u}</td>
        </tr>`,t=r=>{const c=Object.keys(r);if(c.length===0)return'<p class="empty">Sin datos</p>';const u=Math.max(...c.map(d=>r[d].total));return c.map(d=>{const i=r[d],x=u>0?i.puntos/u*100:0,$=u>0?i.errores/u*100:0,q=u>0?(i.total-i.puntos-i.errores)/u*100:0;return`
            <div class="bar-row">
                <div class="bar-label">${d} <span class="bar-total">${i.total}</span></div>
                <div class="bar-track">
                    ${x>0?`<div class="seg seg-pt"  style="width:${x.toFixed(1)}%">${i.puntos}</div>`:""}
                    ${q>0?`<div class="seg seg-ct"  style="width:${q.toFixed(1)}%">${i.total-i.puntos-i.errores}</div>`:""}
                    ${$>0?`<div class="seg seg-er"  style="width:${$.toFixed(1)}%">${i.errores}</div>`:""}
                </div>
            </div>`}).join("")},f=r=>{if(!r||r.length===0)return'<p class="empty">Sin datos</p>';const c=r.reduce((u,[,d])=>u+d,0);return r.slice(0,6).map(([u,d],i)=>{const x=Math.round(d/c*100);return`
            <div class="golpe-row">
                <span class="golpe-rank">${i+1}</span>
                <span class="golpe-name">${u}</span>
                <div class="golpe-bar-wrap">
                    <div class="golpe-bar" style="width:${x}%"></div>
                </div>
                <span class="golpe-pct">${d} <small>(${x}%)</small></span>
            </div>`}).join("")},m=r=>{const c=Object.keys(r);if(c.length===0)return'<p class="empty">Sin datos</p>';const u=c.reduce((d,i)=>d+r[i],0);return c.map(d=>{const i=Math.round(r[d]/u*100);return`
            <div class="bar-row">
                <div class="bar-label">${d} <span class="bar-total">${r[d]}</span></div>
                <div class="bar-track">
                    <div class="seg seg-pt" style="width:${i}%">${i}%</div>
                </div>
            </div>`}).join("")},l=a.notas?a.notas.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim():"";return`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe BVScouter – ${e} / ${n}</title>
<style>
    @page { size: A4; margin: 18mm 16mm; }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 11px;
        color: #1a202c;
        background: #ffffff;
        line-height: 1.45;
    }

    /* ---- CABECERA ---- */
    .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 3px solid #1e40af;
        padding-bottom: 10px;
        margin-bottom: 14px;
    }
    .header-left h1 {
        font-size: 22px;
        font-weight: 800;
        color: #1e3a8a;
        letter-spacing: -0.5px;
    }
    .header-left p {
        font-size: 12px;
        color: #475569;
        margin-top: 2px;
    }
    .header-right {
        text-align: right;
        font-size: 11px;
        color: #64748b;
    }
    .header-right .resultado {
        font-size: 18px;
        font-weight: 800;
        color: #1e40af;
        display: block;
    }

    /* ---- META ---- */
    .meta-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 16px;
    }
    .meta-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px 10px;
    }
    .meta-card .meta-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-card .meta-val   { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }

    /* ---- SECCIONES ---- */
    .section {
        margin-bottom: 18px;
        page-break-inside: avoid;
    }
    .section-title {
        font-size: 13px;
        font-weight: 700;
        color: #1e3a8a;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        border-bottom: 1.5px solid #bfdbfe;
        padding-bottom: 4px;
        margin-bottom: 10px;
    }

    /* ---- TABLAS ---- */
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead tr { background: #1e40af; color: #fff; }
    thead th { padding: 7px 8px; font-weight: 600; text-align: center; }
    thead th.th-left { text-align: left; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td { padding: 6px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; }
    tbody td.col-label { text-align: left; font-weight: 600; color: #334155; }
    tbody td.col-val   { font-weight: 500; }
    .highlight { color: #1e40af; font-weight: 700; }
    .ok   { color: #16a34a; font-weight: 700; }
    .warn { color: #b45309; font-weight: 700; }
    .bad  { color: #dc2626; font-weight: 700; }
    .col-sep { border-left: 2px solid #bfdbfe; }

    /* ---- GRID DOS COLUMNAS ---- */
    .two-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }
    .card {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px 12px;
        background: #fff;
    }
    .card-title {
        font-size: 11px;
        font-weight: 700;
        color: #1e40af;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid #e2e8f0;
    }

    /* ---- BARRAS ---- */
    .bar-row { margin-bottom: 6px; }
    .bar-label {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        font-weight: 600;
        color: #475569;
        margin-bottom: 3px;
    }
    .bar-total { color: #94a3b8; font-weight: 400; }
    .bar-track {
        display: flex;
        height: 14px;
        background: #f1f5f9;
        border-radius: 3px;
        overflow: hidden;
    }
    .seg {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: 700;
        color: #fff;
    }
    .seg-pt { background: #16a34a; }
    .seg-ct { background: #ca8a04; }
    .seg-er { background: #dc2626; }

    /* ---- TOP GOLPES ---- */
    .golpe-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 5px;
        font-size: 10px;
    }
    .golpe-rank  { width: 14px; font-weight: 700; color: #94a3b8; text-align: right; flex-shrink: 0; }
    .golpe-name  { width: 90px; font-weight: 600; color: #334155; flex-shrink: 0; }
    .golpe-bar-wrap { flex: 1; height: 10px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
    .golpe-bar   { height: 100%; background: #3b82f6; border-radius: 3px; }
    .golpe-pct   { width: 52px; text-align: right; color: #475569; flex-shrink: 0; }
    .golpe-pct small { color: #94a3b8; }

    /* ---- LEYENDA ---- */
    .legend {
        display: flex;
        gap: 14px;
        font-size: 9.5px;
        color: #64748b;
        margin-top: 6px;
    }
    .leg { display: flex; align-items: center; gap: 4px; }
    .leg-box { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }

    /* ---- STAT GRANDE ---- */
    .big-stat-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 14px;
    }
    .big-stat {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px 8px;
        text-align: center;
        background: #f8fafc;
    }
    .big-stat .bs-val {
        font-size: 24px;
        font-weight: 800;
        color: #1e40af;
        line-height: 1;
    }
    .big-stat .bs-label {
        font-size: 9px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-top: 4px;
    }
    .big-stat .bs-sub {
        font-size: 10px;
        color: #94a3b8;
        margin-top: 2px;
    }

    /* ---- NOTAS ---- */
    .notas-box {
        background: #fffbeb;
        border: 1px solid #fcd34d;
        border-radius: 6px;
        padding: 10px 12px;
        font-size: 11px;
        color: #78350f;
        white-space: pre-wrap;
        line-height: 1.6;
    }

    /* ---- PIE ---- */
    .footer {
        margin-top: 20px;
        border-top: 1px solid #e2e8f0;
        padding-top: 8px;
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        color: #94a3b8;
    }

    .empty { color: #94a3b8; font-style: italic; font-size: 10px; padding: 8px 0; }
    .page-break { page-break-after: always; }
</style>
</head>
<body>

<!-- ====== CABECERA ====== -->
<div class="header">
    <div class="header-left">
        <h1>Informe de Partido</h1>
        <p>${e} &amp; ${n} · ${a.torneo||"Sin torneo"} · ${a.fase||"–"}</p>
    </div>
    <div class="header-right">
        <span class="resultado">${h}</span>
        ${z(a.fecha)}
    </div>
</div>

<!-- ====== META ====== -->
<div class="meta-grid">
    <div class="meta-card">
        <div class="meta-label">Torneo</div>
        <div class="meta-val">${a.torneo||"–"}</div>
    </div>
    <div class="meta-card">
        <div class="meta-label">Fase</div>
        <div class="meta-val">${a.fase||"–"}</div>
    </div>
    <div class="meta-card">
        <div class="meta-label">Acciones analizadas</div>
        <div class="meta-val">${g.length}</div>
    </div>
    <div class="meta-card">
        <div class="meta-label">Resultado final</div>
        <div class="meta-val" style="color:#1e40af">${h}</div>
    </div>
</div>

<!-- ====== RESUMEN GLOBAL ====== -->
<div class="section">
    <div class="section-title">Resumen Estadistico General</div>
    <div class="big-stat-grid">
        <div class="big-stat">
            <div class="bs-val">${s.killsAtaque+o.killsAtaque}</div>
            <div class="bs-label">Kills Totales</div>
            <div class="bs-sub">${s.killsAtaque} · ${o.killsAtaque}</div>
        </div>
        <div class="big-stat">
            <div class="bs-val">${s.erroresAtaque+o.erroresAtaque}</div>
            <div class="bs-label">Errores Ataque</div>
            <div class="bs-sub">${s.erroresAtaque} · ${o.erroresAtaque}</div>
        </div>
        <div class="big-stat">
            <div class="bs-val">${y}%</div>
            <div class="bs-label">Side-Out ${e}</div>
            <div class="bs-sub">${s.puntosK1}/${s.totalK1} K1</div>
        </div>
        <div class="big-stat">
            <div class="bs-val">${b}%</div>
            <div class="bs-label">Side-Out ${n}</div>
            <div class="bs-sub">${o.puntosK1}/${o.totalK1} K1</div>
        </div>
    </div>
    <div class="big-stat-grid" style="margin-top: 10px;">
        <div class="big-stat">
            <div class="bs-val" style="color: #16a34a;">${p.general.puntosTotalesEquipo}</div>
            <div class="bs-label">Puntos Ganados</div>
            <div class="bs-sub">Equipo</div>
        </div>
        <div class="big-stat">
            <div class="bs-val" style="color: #dc2626;">${p.general.puntosPerdidosEquipo}</div>
            <div class="bs-label">Puntos Perdidos</div>
            <div class="bs-sub">Equipo</div>
        </div>
        <div class="big-stat">
            <div class="bs-val" style="color: #dc2626;">${p.general.aciertosRival}</div>
            <div class="bs-label">Aciertos Rival</div>
            <div class="bs-sub">Aciertos oponente</div>
        </div>
        <div class="big-stat">
            <div class="bs-val" style="color: #dc2626;">${p.general.erroresPropiosEquipo}</div>
            <div class="bs-label">Errores Propios</div>
            <div class="bs-sub">Equipo total</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th class="th-left" style="width:36%">Metrica</th>
                <th>${e}</th>
                <th class="col-sep">${n}</th>
            </tr>
        </thead>
        <tbody>
            ${v("Ataques totales",s.totalAtaques,o.totalAtaques)}
            ${v("Kills (puntos de ataque)",`<span class="ok">${s.killsAtaque}</span>`,`<span class="ok">${o.killsAtaque}</span>`)}
            ${v("Errores de ataque",`<span class="bad">${s.erroresAtaque}</span>`,`<span class="bad">${o.erroresAtaque}</span>`)}
            ${v("Eficacia de ataque (Kills-Err / Total)",`<span class="${s.eficaciaAtaque>=0?"ok":"bad"}">${s.eficaciaAtaque}%</span>`,`<span class="${o.eficaciaAtaque>=0?"ok":"bad"}">${o.eficaciaAtaque}%</span>`)}
            ${v("Side-Out general (K1)",`<span class="highlight">${y}% (${s.puntosK1}/${s.totalK1})</span>`,`<span class="highlight">${b}% (${o.puntosK1}/${o.totalK1})</span>`)}
            ${v("Side-Out a la primera (FBSO)",`${s.sideOutFirstPct}% (${s.fbsoPuntos}/${s.fbsoOportunidades})`,`${o.sideOutFirstPct}% (${o.fbsoPuntos}/${o.fbsoOportunidades})`)}
            ${v("Recepciones totales",s.totalRecepciones,o.totalRecepciones)}
            ${v("Calidad media de recepcion (/10)",s.recepcionPromedio,o.recepcionPromedio)}
            ${v("Bloqueos totales",s.totalBloqueos,o.totalBloqueos)}
            ${v("Puntos directos",`<span class="ok">${s.puntosDirectos}</span>`,`<span class="ok">${o.puntosDirectos}</span>`)}
            ${v("Errores propios",`<span class="bad">${s.erroresPropios}</span>`,`<span class="bad">${o.erroresPropios}</span>`)}
        </tbody>
    </table>
</div>

<!-- ====== SIDE-OUT ====== -->
<div class="section">
    <div class="section-title">Analisis de Side-Out (K1)</div>
    <div class="two-col">
        <div class="card">
            <div class="card-title">${e}</div>
            <table>
                <thead><tr><th class="th-left">Tipo</th><th>Puntos</th><th>Opor.</th><th>%</th></tr></thead>
                <tbody>
                    <tr>
                        <td class="col-label">K1 General</td>
                        <td>${s.puntosK1}</td>
                        <td>${s.totalK1}</td>
                        <td class="highlight"><strong>${y}%</strong></td>
                    </tr>
                    <tr>
                        <td class="col-label">A la Primera (FBSO)</td>
                        <td>${s.fbsoPuntos}</td>
                        <td>${s.totalK1}</td>
                        <td class="highlight">${s.sideOutFirstPct}%</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="card">
            <div class="card-title">${n}</div>
            <table>
                <thead><tr><th class="th-left">Tipo</th><th>Puntos</th><th>Opor.</th><th>%</th></tr></thead>
                <tbody>
                    <tr>
                        <td class="col-label">K1 General</td>
                        <td>${o.puntosK1}</td>
                        <td>${o.totalK1}</td>
                        <td class="highlight"><strong>${b}%</strong></td>
                    </tr>
                    <tr>
                        <td class="col-label">A la Primera (FBSO)</td>
                        <td>${o.fbsoPuntos}</td>
                        <td>${o.totalK1}</td>
                        <td class="highlight">${o.sideOutFirstPct}%</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="page-break"></div>

<!-- ====== ATAQUES K1 ====== -->
<div class="section">
    <div class="section-title">Distribucion de Ataques en K1 (Recepcion)</div>
    <div class="two-col">
        <div class="card">
            <div class="card-title">${e}</div>
            ${t(s.distribucionAtaquesK1)}
        </div>
        <div class="card">
            <div class="card-title">${n}</div>
            ${t(o.distribucionAtaquesK1)}
        </div>
    </div>
    <div class="legend">
        <div class="leg"><div class="leg-box" style="background:#16a34a"></div> Puntos</div>
        <div class="leg"><div class="leg-box" style="background:#ca8a04"></div> Continuidad</div>
        <div class="leg"><div class="leg-box" style="background:#dc2626"></div> Errores</div>
    </div>
</div>

<!-- ====== ATAQUES K2 ====== -->
<div class="section">
    <div class="section-title">Distribucion de Ataques en K2 (Defensa)</div>
    <div class="two-col">
        <div class="card">
            <div class="card-title">${e}</div>
            ${t(s.distribucionAtaquesK2)}
        </div>
        <div class="card">
            <div class="card-title">${n}</div>
            ${t(o.distribucionAtaquesK2)}
        </div>
    </div>
    <div class="legend">
        <div class="leg"><div class="leg-box" style="background:#16a34a"></div> Puntos</div>
        <div class="leg"><div class="leg-box" style="background:#ca8a04"></div> Continuidad</div>
        <div class="leg"><div class="leg-box" style="background:#dc2626"></div> Errores</div>
    </div>
</div>

<!-- ====== SAQUES ====== -->
<div class="section">
    <div class="section-title">Rendimiento de Saque</div>
    <div class="two-col">
        <div class="card">
            <div class="card-title">${e}</div>
            ${t(s.distribucionSaques)}
        </div>
        <div class="card">
            <div class="card-title">${n}</div>
            ${t(o.distribucionSaques)}
        </div>
    </div>
    <div class="legend">
        <div class="leg"><div class="leg-box" style="background:#16a34a"></div> Aces</div>
        <div class="leg"><div class="leg-box" style="background:#ca8a04"></div> En juego</div>
        <div class="leg"><div class="leg-box" style="background:#dc2626"></div> Errores</div>
    </div>
</div>

<div class="page-break"></div>

<!-- ====== RECEPCION ====== -->
<div class="section">
    <div class="section-title">Calidad de Recepcion</div>
    <div class="two-col">
        <div class="card">
            <div class="card-title">${e} – Media: ${s.recepcionPromedio}/10 (${s.totalRecepciones} recs.)</div>
            ${m(s.distribucionRecepcion)}
        </div>
        <div class="card">
            <div class="card-title">${n} – Media: ${o.recepcionPromedio}/10 (${o.totalRecepciones} recs.)</div>
            ${m(o.distribucionRecepcion)}
        </div>
    </div>
</div>

<!-- ====== TOP GOLPES ====== -->
<div class="section">
    <div class="section-title">Top Golpes de Ataque (General)</div>
    <div class="two-col">
        <div class="card">
            <div class="card-title">${e}</div>
            ${f(s.golpesMasRepetidosGeneral)}
        </div>
        <div class="card">
            <div class="card-title">${n}</div>
            ${f(o.golpesMasRepetidosGeneral)}
        </div>
    </div>
</div>

<!-- ====== BLOQUEOS ====== -->
<div class="section">
    <div class="section-title">Bloqueos (${s.totalBloqueos+o.totalBloqueos} totales)</div>
    <div class="two-col">
        <div class="card">
            <div class="card-title">${e} – ${s.totalBloqueos} bloqueos</div>
            ${Object.keys(s.distribucionBloqueos).length>0?Object.entries(s.distribucionBloqueos).map(([r,c])=>`<div class="golpe-row"><span class="golpe-name">${r}</span><span class="golpe-pct">${c}</span></div>`).join(""):'<p class="empty">Sin datos</p>'}
        </div>
        <div class="card">
            <div class="card-title">${n} – ${o.totalBloqueos} bloqueos</div>
            ${Object.keys(o.distribucionBloqueos).length>0?Object.entries(o.distribucionBloqueos).map(([r,c])=>`<div class="golpe-row"><span class="golpe-name">${r}</span><span class="golpe-pct">${c}</span></div>`).join(""):'<p class="empty">Sin datos</p>'}
        </div>
    </div>
</div>

${l?`
<!-- ====== NOTAS ====== -->
<div class="section">
    <div class="section-title">Notas del Partido</div>
    <div class="notas-box">${l}</div>
</div>
`:""}

<!-- ====== PIE ====== -->
<div class="footer">
    <span>BVScouter – Informe generado el ${new Date().toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"})}</span>
    <span>${e} &amp; ${n} vs ${a.torneo||"Rival"} · ${z(a.fecha)}</span>
</div>

</body>
</html>`}let j=[];function Z(){S.register("informe",async(a,p)=>{j.forEach(b=>b.destroy()),j=[];const e=await window.api.getPartido(p.partidoId);if(!e){w("Partido no encontrado","error"),S.navigate("dashboard");return}const n=await window.api.getAcciones(p.partidoId);let g="all";const h=e.jugador1_nombre,s=e.jugador2_nombre;let o=e.resultado||"0-0";if(n.length>0){const b=[...new Set(n.map(m=>m.set_numero))].sort();let v=0,t=0;const f=[];b.forEach(m=>{const l=n.filter(d=>d.set_numero===m),r=l[l.length-1];let c=parseInt(r.marcador_local)||0,u=parseInt(r.marcador_rival)||0;r.tipo_accion!=="fin_set"&&(r.resultado==="punto"?c+=1:(r.resultado==="error"||r.resultado==="bloqueado")&&(u+=1)),f.push(`${c}-${u}`),c>u?v++:u>c&&t++}),b.length===1?o=f[0]:o=`${v}-${t} (${f.join(" ")})`}const y=()=>{j.forEach(l=>l.destroy()),j=[];const b=[...new Set(n.map(l=>l.set_numero))].sort(),v=g==="all"?n:n.filter(l=>l.set_numero===parseInt(g)),t=J(v,e.jugador1_nombre,e.jugador2_nombre),f=W(v,e.jugador1_nombre,e.jugador2_nombre);a.innerHTML=`
                <div class="report-container page-enter">
                    <!-- cabecera del informe -->
                    <div class="report-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h1 class="report-title">📊 Informe de Scouting</h1>
                            <div class="report-meta">
                                <p><strong>${h}</strong> / <strong>${s}</strong></p>
                                <p>${e.torneo||"Sin torneo"} · ${e.fase||"-"} · ${z(e.fecha)}</p>
                                <p>Resultado: <strong class="text-accent">${o}</strong> · ${v.length} acciones analizadas</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <label style="color: var(--text-secondary); margin-bottom: 4px; display: block; font-size: 13px;">Filtrar por Set:</label>
                            <select id="select-set-filter" class="form-input" style="width: auto; display: inline-block;">
                                <option value="all" ${g==="all"?"selected":""}>Todos los Sets</option>
                                ${b.map(l=>`<option value="${l}" ${g==l?"selected":""}>Set ${l}</option>`).join("")}
                            </select>
                        </div>
                    </div>

                    <!-- seccion 0: rendimiento general -->
                    <div class="report-section">
                        <h2 class="report-section-title">🏆 Rendimiento General</h2>
                        <div class="report-grid" style="grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
                            <div class="report-stat-card">
                                <div class="report-stat-value ${t.jugador1.puntosDirectos-t.jugador1.erroresPropios>=0?"good":"bad"}">${t.jugador1.puntosDirectos-t.jugador1.erroresPropios>0?"+":""}${t.jugador1.puntosDirectos-t.jugador1.erroresPropios}</div>
                                <div class="report-stat-label">G-P ${e.jugador1_nombre}</div>
                                <div class="report-stat-sublabel">${t.jugador1.puntosDirectos} puntos · ${t.jugador1.erroresPropios} errores</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value ${t.jugador2.puntosDirectos-t.jugador2.erroresPropios>=0?"good":"bad"}">${t.jugador2.puntosDirectos-t.jugador2.erroresPropios>0?"+":""}${t.jugador2.puntosDirectos-t.jugador2.erroresPropios}</div>
                                <div class="report-stat-label">G-P ${e.jugador2_nombre}</div>
                                <div class="report-stat-sublabel">${t.jugador2.puntosDirectos} puntos · ${t.jugador2.erroresPropios} errores</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value good">${t.general.puntosTotalesEquipo}</div>
                                <div class="report-stat-label">Puntos Totales Ganados</div>
                                <div class="report-stat-sublabel">Marcador de equipo</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value bad">${t.general.puntosPerdidosEquipo}</div>
                                <div class="report-stat-label">Puntos Totales Perdidos</div>
                                <div class="report-stat-sublabel">Marcador del rival</div>
                            </div>
                            
                            <div class="report-stat-card">
                                <div class="report-stat-value good">${t.jugador1.puntosDirectos+t.jugador2.puntosDirectos}</div>
                                <div class="report-stat-label">Aciertos Propios</div>
                                <div class="report-stat-sublabel">Kills, aces, bloqueos</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value bad">${t.general.aciertosRival}</div>
                                <div class="report-stat-label">Aciertos del Rival</div>
                                <div class="report-stat-sublabel">Puntos ganados por rival</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value bad">${t.general.erroresPropiosEquipo}</div>
                                <div class="report-stat-label">Errores Propios</div>
                                <div class="report-stat-sublabel">J1 + J2 + Errores equipo</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value good">${t.general.erroresRival}</div>
                                <div class="report-stat-label">Errores del Rival</div>
                                <div class="report-stat-sublabel">Puntos regalados</div>
                            </div>
                        </div>
                    </div>

                    <!-- seccion progresion de puntos -->
                    <div class="report-section" id="section-progresion">
                        <h2 class="report-section-title">📈 Progresión de Puntos</h2>
                        ${U(v)}
                    </div>

                    <!-- seccion 1: side-out -->
                    <div class="report-section">
                        <h2 class="report-section-title">⭐ Porcentaje de Side-Out</h2>
                        <div class="report-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 24px;">
                            <div class="report-stat-card">
                                <h3 style="margin-bottom: 16px; color: var(--text-primary); font-size: 18px;">${e.jugador1_nombre}</h3>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
                                    <div>
                                        <div class="report-stat-label" style="font-size: 14px;">General</div>
                                        <div class="report-stat-sublabel">${t.jugador1.puntosK1} pts / ${t.jugador1.totalK1} K1</div>
                                    </div>
                                    <div class="report-stat-value ${C(t.jugador1.totalK1>0?Math.round(t.jugador1.puntosK1/t.jugador1.totalK1*100):0)}" style="font-size: 28px;">${t.jugador1.totalK1>0?Math.round(t.jugador1.puntosK1/t.jugador1.totalK1*100):0}%</div>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div class="report-stat-label" style="font-size: 14px;">A la Primera</div>
                                        <div class="report-stat-sublabel">${t.jugador1.fbsoPuntos} pts / ${t.jugador1.fbsoOportunidades} K1</div>
                                    </div>
                                    <div class="report-stat-value ${C(t.jugador1.sideOutFirstPct)}" style="font-size: 28px;">${t.jugador1.sideOutFirstPct}%</div>
                                </div>
                            </div>
                            <div class="report-stat-card">
                                <h3 style="margin-bottom: 16px; color: var(--text-primary); font-size: 18px;">${e.jugador2_nombre}</h3>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
                                    <div>
                                        <div class="report-stat-label" style="font-size: 14px;">General</div>
                                        <div class="report-stat-sublabel">${t.jugador2.puntosK1} pts / ${t.jugador2.totalK1} K1</div>
                                    </div>
                                    <div class="report-stat-value ${C(t.jugador2.totalK1>0?Math.round(t.jugador2.puntosK1/t.jugador2.totalK1*100):0)}" style="font-size: 28px;">${t.jugador2.totalK1>0?Math.round(t.jugador2.puntosK1/t.jugador2.totalK1*100):0}%</div>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div class="report-stat-label" style="font-size: 14px;">A la Primera</div>
                                        <div class="report-stat-sublabel">${t.jugador2.fbsoPuntos} pts / ${t.jugador2.fbsoOportunidades} K1</div>
                                    </div>
                                    <div class="report-stat-value ${C(t.jugador2.sideOutFirstPct)}" style="font-size: 28px;">${t.jugador2.sideOutFirstPct}%</div>
                                </div>
                            </div>
                        </div>
                        <div class="chart-container">
                            <div class="chart-title">Comparativa Side-Out por Jugador</div>
                            <div class="chart-wrapper">
                                <canvas id="chart-sideout"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- seccion 2: golpes mas repetidos -->
                    <div class="report-section">
                        <h2 class="report-section-title">🎯 Golpes Más Repetidos</h2>
                        <div class="chart-container">
                            <div class="chart-title" style="display: flex; justify-content: space-between; align-items: center;">
                                <span>Fase de Juego</span>
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn btn-sm btn-primary tab-golpes-btn" data-target="golpes-general">General</button>
                                    <button class="btn btn-sm btn-secondary tab-golpes-btn" data-target="golpes-k1">K1</button>
                                    <button class="btn btn-sm btn-secondary tab-golpes-btn" data-target="golpes-k2">K2</button>
                                </div>
                            </div>
                            
                            <div class="tab-golpes-content" id="golpes-general" data-label="Top Golpes - General">
                                <div class="report-grid">
                                    <div style="flex: 1; text-align: center; min-width: 250px;">
                                        <div class="chart-title">${e.jugador1_nombre}</div>
                                        <div class="chart-wrapper"><canvas id="chart-golpes-general-j1"></canvas></div>
                                    </div>
                                    <div style="flex: 1; text-align: center; min-width: 250px;">
                                        <div class="chart-title">${e.jugador2_nombre}</div>
                                        <div class="chart-wrapper"><canvas id="chart-golpes-general-j2"></canvas></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="tab-golpes-content tab-hidden-initially" id="golpes-k1" data-label="Top Golpes - K1">
                                <div class="report-grid">
                                    <div style="flex: 1; text-align: center; min-width: 250px;">
                                        <div class="chart-title">${e.jugador1_nombre}</div>
                                        <div class="chart-wrapper"><canvas id="chart-golpes-k1-j1"></canvas></div>
                                    </div>
                                    <div style="flex: 1; text-align: center; min-width: 250px;">
                                        <div class="chart-title">${e.jugador2_nombre}</div>
                                        <div class="chart-wrapper"><canvas id="chart-golpes-k1-j2"></canvas></div>
                                    </div>
                                </div>
                            </div>

                            <div class="tab-golpes-content tab-hidden-initially" id="golpes-k2" data-label="Top Golpes - K2">
                                <div class="report-grid">
                                    <div style="flex: 1; text-align: center; min-width: 250px;">
                                        <div class="chart-title">${e.jugador1_nombre}</div>
                                        <div class="chart-wrapper"><canvas id="chart-golpes-k2-j1"></canvas></div>
                                    </div>
                                    <div style="flex: 1; text-align: center; min-width: 250px;">
                                        <div class="chart-title">${e.jugador2_nombre}</div>
                                        <div class="chart-wrapper"><canvas id="chart-golpes-k2-j2"></canvas></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- seccion 3: distribucion de ataques -->
                    <div class="report-section">
                        <h2 class="report-section-title">⚡ Análisis de Ataque</h2>
                        <div class="report-grid">
                            <div class="report-stat-card">
                                <div class="report-stat-value ${t.jugador1.eficaciaAtaque>=30?"good":t.jugador1.eficaciaAtaque>=10?"average":"bad"}">${t.jugador1.eficaciaAtaque}%</div>
                                <div class="report-stat-label">Eficacia Ataque ${e.jugador1_nombre}</div>
                                <div class="report-stat-sublabel">${t.jugador1.killsAtaque} kills · ${t.jugador1.erroresAtaque} errores · ${t.jugador1.totalAtaques} total</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value ${t.jugador2.eficaciaAtaque>=30?"good":t.jugador2.eficaciaAtaque>=10?"average":"bad"}">${t.jugador2.eficaciaAtaque}%</div>
                                <div class="report-stat-label">Eficacia Ataque ${e.jugador2_nombre}</div>
                                <div class="report-stat-sublabel">${t.jugador2.killsAtaque} kills · ${t.jugador2.erroresAtaque} errores · ${t.jugador2.totalAtaques} total</div>
                            </div>
                        </div>
                        <div class="chart-container">
                            <div class="chart-title" style="display: flex; justify-content: space-between; align-items: center;">
                                <span>Distribución de Tipos de Ataque</span>
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn btn-sm btn-primary tab-ataque-btn" data-target="ataque-general">General</button>
                                    <button class="btn btn-sm btn-secondary tab-ataque-btn" data-target="ataque-k1">K1</button>
                                    <button class="btn btn-sm btn-secondary tab-ataque-btn" data-target="ataque-k2">K2</button>
                                </div>
                            </div>
                            <div class="tab-ataque-content" id="ataque-general" data-label="Distribución Ataques - General">
                                <div class="chart-title">${h}</div>
                                <div class="chart-wrapper" style="margin-bottom: 20px;"><canvas id="chart-ataques-general-j1"></canvas></div>
                                <div class="chart-title">${s}</div>
                                <div class="chart-wrapper"><canvas id="chart-ataques-general-j2"></canvas></div>
                            </div>
                            <div class="tab-ataque-content tab-hidden-initially" id="ataque-k1" data-label="Distribución Ataques - K1">
                                <div class="chart-title">${h}</div>
                                <div class="chart-wrapper" style="margin-bottom: 20px;"><canvas id="chart-ataques-k1-j1"></canvas></div>
                                <div class="chart-title">${s}</div>
                                <div class="chart-wrapper"><canvas id="chart-ataques-k1-j2"></canvas></div>
                            </div>
                            <div class="tab-ataque-content tab-hidden-initially" id="ataque-k2" data-label="Distribución Ataques - K2">
                                <div class="chart-title">${h}</div>
                                <div class="chart-wrapper" style="margin-bottom: 20px;"><canvas id="chart-ataques-k2-j1"></canvas></div>
                                <div class="chart-title">${s}</div>
                                <div class="chart-wrapper"><canvas id="chart-ataques-k2-j2"></canvas></div>
                            </div>
                        </div>
                        <div class="report-grid mt-16" style="margin-top: 24px;">
                            <div class="chart-container">
                                <div class="chart-title">Heatmap de Ataque - ${h}</div>
                                <div class="heatmap-wrapper" style="display: flex; justify-content: center; align-items: center; padding: 20px;">
                                    ${G(t.jugador1.distribucionAtaquesGeneral)}
                                </div>
                            </div>
                            <div class="chart-container">
                                <div class="chart-title">Heatmap de Ataque - ${s}</div>
                                <div class="heatmap-wrapper" style="display: flex; justify-content: center; align-items: center; padding: 20px;">
                                    ${G(t.jugador2.distribucionAtaquesGeneral)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- seccion 4: saques -->
                    <div class="report-section">
                        <h2 class="report-section-title">🏐 Análisis de Saque</h2>
                        <div class="chart-container">
                            <div class="chart-title" style="display: flex; justify-content: space-between; align-items: center;">
                                <span>Finalización del Saque</span>
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn btn-sm btn-primary tab-saque-btn" data-target="saque-j1">${h}</button>
                                    <button class="btn btn-sm btn-secondary tab-saque-btn" data-target="saque-j2">${s}</button>
                                    <button class="btn btn-sm btn-secondary tab-saque-btn" data-target="saque-ambos">Ambos</button>
                                </div>
                            </div>
                            <div class="chart-wrapper tab-saque-content" id="saque-j1" data-label="${h}">
                                <canvas id="chart-saques-j1"></canvas>
                            </div>
                            <div class="chart-wrapper tab-saque-content tab-hidden-initially" id="saque-j2" data-label="${s}">
                                <canvas id="chart-saques-j2"></canvas>
                            </div>
                            <div class="chart-wrapper tab-saque-content tab-hidden-initially" id="saque-ambos" data-label="Ambos Jugadores">
                                <canvas id="chart-saques-ambos"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- seccion 5: recepcion -->
                    <div class="report-section">
                        <h2 class="report-section-title">🤲 Análisis de Recepción</h2>
                        <div class="report-grid">
                            <div class="report-stat-card">
                                <div class="report-stat-value ${t.jugador1.recepcionPromedio>=6?"good":t.jugador1.recepcionPromedio>=4?"average":"bad"}">${t.jugador1.recepcionPromedio}</div>
                                <div class="report-stat-label">Recepción Media ${e.jugador1_nombre}</div>
                                <div class="report-stat-sublabel" style="line-height: 1.4;">${t.jugador1.totalRecepciones} recepciones<br><span style="font-size: 11px;">${L(t.jugador1.distribucionRecepcion)}</span></div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value ${t.jugador2.recepcionPromedio>=6?"good":t.jugador2.recepcionPromedio>=4?"average":"bad"}">${t.jugador2.recepcionPromedio}</div>
                                <div class="report-stat-label">Recepción Media ${e.jugador2_nombre}</div>
                                <div class="report-stat-sublabel" style="line-height: 1.4;">${t.jugador2.totalRecepciones} recepciones<br><span style="font-size: 11px;">${L(t.jugador2.distribucionRecepcion)}</span></div>
                            </div>
                        </div>
                    </div>

                    <!-- seccion 6: bloqueo -->
                    <div class="report-section">
                        <h2 class="report-section-title">🧱 Bloqueo y Defensa</h2>
                        <div class="report-grid">
                            <div class="report-stat-card">
                                <div class="report-stat-value">${t.jugador1.totalBloqueos}</div>
                                <div class="report-stat-label">Bloqueos ${e.jugador1_nombre}</div>
                                <div class="report-stat-sublabel">${D(t.jugador1.distribucionBloqueos)}</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value">${t.jugador2.totalBloqueos}</div>
                                <div class="report-stat-label">Bloqueos ${e.jugador2_nombre}</div>
                                <div class="report-stat-sublabel">${D(t.jugador2.distribucionBloqueos)}</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value ${t.jugador1.defensaPromedio>=5?"good":"average"}">${t.jugador1.defensaPromedio}</div>
                                <div class="report-stat-label">Defensa Media ${e.jugador1_nombre}</div>
                                <div class="report-stat-sublabel">${t.jugador1.erroresDefensa} errores de defensa</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value ${t.jugador2.defensaPromedio>=5?"good":"average"}">${t.jugador2.defensaPromedio}</div>
                                <div class="report-stat-label">Defensa Media ${e.jugador2_nombre}</div>
                                <div class="report-stat-sublabel">${t.jugador2.erroresDefensa} errores de defensa</div>
                            </div>
                        </div>
                    </div>

                    <!-- seccion 7: patrones y conclusiones -->
                    <div class="report-section" id="section-patrones">
                        <h2 class="report-section-title">🧠 Patrones Detectados</h2>
                        ${f.length>0?`
                            <ul class="patterns-list">
                                ${f.map(l=>`
                                    <li class="pattern-item">
                                        <span class="pattern-icon">${l.icon}</span>
                                        <span class="pattern-text">${l.text}</span>
                                    </li>
                                `).join("")}
                            </ul>
                        `:`
                            <p class="text-muted" style="padding: 16px;">No se han detectado patrones suficientes. Registra más acciones para obtener análisis automático.</p>
                        `}
                    </div>

                    <div class="report-section">
                        <h2 class="report-section-title">📝 Conclusiones del Scout</h2>
                        <div class="report-conclusions">
                            <p class="text-muted" style="font-size: 13px;">Añade tus observaciones y conclusiones sobre el partido:</p>
                            <textarea id="conclusiones-text" placeholder="Escribe aquí tus conclusiones...">${e.notas||""}</textarea>
                            <button class="btn btn-sm btn-primary mt-16" id="btn-guardar-notas">💾 Guardar Notas</button>
                        </div>
                    </div>

                    <div class="report-section" id="section-highlights" ${e.video_tipo==="local"||e.video_tipo==="youtube"?"":'style="display:none;"'}>
                        <h2 class="report-section-title">🎬 Generador de Vídeos</h2>
                        <div class="report-grid" style="background: #1a2332; padding: 20px; border-radius: 12px; border: 1px solid #1e293b;">
                            <div style="flex: 1; min-width: 200px;">
                                <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">Jugador</label>
                                <select id="hl-jugador" class="form-input">
                                    <option value="">Ambos Jugadores</option>
                                    <option value="${e.jugador1_nombre}">${e.jugador1_nombre}</option>
                                    <option value="${e.jugador2_nombre}">${e.jugador2_nombre}</option>
                                </select>
                            </div>
                            <div style="flex: 1; min-width: 200px;">
                                <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">Complejo</label>
                                <select id="hl-complejo" class="form-input">
                                    <option value="">Cualquiera</option>
                                    <option value="K1">K1</option>
                                    <option value="K2">K2</option>
                                </select>
                            </div>
                            <div style="flex: 1; min-width: 200px;">
                                <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">Tipo de Acción</label>
                                <select id="hl-accion" class="form-input">
                                    <option value="">Todas las Acciones</option>
                                    <option value="saque">Saque</option>
                                    <option value="recepcion">Recepción</option>
                                    <option value="colocacion">Colocación</option>
                                    <option value="ataque">Ataque</option>
                                    <option value="bloqueo">Bloqueo</option>
                                    <option value="defensa">Defensa</option>
                                </select>
                            </div>
                            <div style="flex: 1; min-width: 200px;">
                                <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">Resultado</label>
                                <select id="hl-resultado" class="form-input">
                                    <option value="">Cualquier Resultado</option>
                                    <option value="punto">Punto</option>
                                    <option value="continuidad">Continuidad</option>
                                    <option value="error">Error</option>
                                    <option value="bloqueado">Bloqueado</option>
                                </select>
                            </div>
                            <div style="flex: 1; min-width: 150px;">
                                <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">Set</label>
                                <select id="hl-set" class="form-input">
                                    <option value="">Todos los sets</option>
                                    <option value="1">Primer set</option>
                                    <option value="2">Segundo set</option>
                                </select>
                            </div>
                            <div style="flex: 1; min-width: 100px;">
                                <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">M. Antes (s)</label>
                                <input type="number" id="hl-margin-pre" class="form-input" value="3" min="0" max="10">
                            </div>
                            <div style="flex: 1; min-width: 100px;">
                                <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">M. Después (s)</label>
                                <input type="number" id="hl-margin-post" class="form-input" value="1" min="0" max="10">
                            </div>
                            <div style="flex: 2; min-width: 280px; display: flex; flex-direction: column; justify-content: flex-end; gap: 4px;">
                                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: #e2e8f0; font-size: 13px;">
                                    <input type="checkbox" id="hl-mostrar-acciones" style="width: 16px; height: 16px; accent-color: #38bdf8;">
                                    🃏 Mostrar tarjeta con las acciones de cada punto
                                </label>
                                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: #e2e8f0; font-size: 13px; padding-bottom: 4px;">
                                    <input type="checkbox" id="hl-con-marcador" checked style="width: 16px; height: 16px; accent-color: #38bdf8;">
                                    💯 Incluir marcador en el vídeo
                                </label>
                            </div>
                            <div style="flex: 3; display: flex; flex-direction: column; justify-content: flex-end; padding-top: 10px; min-width: 250px;">
                                <div id="hl-progress-container" style="display: none; margin-bottom: 8px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                        <label class="form-label" style="margin: 0; font-size: 12px;">Exportando vídeo...</label>
                                        <span id="hl-progress-text" style="color: white; font-size: 12px;">0%</span>
                                    </div>
                                    <div style="width: 100%; height: 8px; background: #334155; border-radius: 4px; overflow: hidden;">
                                        <div id="hl-progress-bar" style="width: 0%; height: 100%; background: #38bdf8; transition: width 0.2s;"></div>
                                    </div>
                                </div>
                                <button id="btn-generar-highlights" class="btn btn-primary" style="width: 100%;">✂️ Generar Vídeo</button>
                            </div>
                        </div>
                    </div>

                    <!-- acciones -->
                    <div class="report-actions">
                        <button class="btn btn-primary btn-lg" id="btn-exportar-pdf">📄 Exportar a PDF</button>
                        <button class="btn btn-secondary btn-lg" id="btn-volver-scouting">📋 Volver al Scouting</button>
                        <button class="btn btn-secondary btn-lg" id="btn-volver-dash">← Dashboard</button>
                    </div>
                </div>
            `,setTimeout(()=>H(t,h,s),100),document.getElementById("select-set-filter").addEventListener("change",l=>{e.notas=document.getElementById("conclusiones-text").value,g=l.target.value,y()}),document.getElementById("btn-guardar-notas").addEventListener("click",async()=>{const l=document.getElementById("conclusiones-text").value;e.notas=l,await window.api.updatePartido(p.partidoId,{notas:l}),w("Notas guardadas","success")}),document.getElementById("btn-exportar-pdf").addEventListener("click",async()=>{w("Generando PDF rediseñado...","info");const l=V(e,t,h,s,v);try{await window.api.generatePDF(l,2500)&&w("PDF guardado correctamente","success")}catch(r){w("Error al generar PDF","error"),console.error(r)}}),document.getElementById("btn-volver-scouting").addEventListener("click",()=>{S.navigate("scouting",{partidoId:p.partidoId})}),document.getElementById("btn-volver-dash").addEventListener("click",()=>{S.navigate("dashboard")});const m=document.getElementById("btn-generar-highlights");m&&(window.api&&window.api.onVideoProgress&&window.api.onVideoProgress(l=>{const r=document.getElementById("hl-progress-bar"),c=document.getElementById("hl-progress-text");r&&c&&(r.style.width=l+"%",c.textContent=l+"%")}),m.addEventListener("click",async()=>{var R,O,_;const l={},r=document.getElementById("hl-jugador").value,c=document.getElementById("hl-complejo").value,u=document.getElementById("hl-accion").value,d=document.getElementById("hl-resultado").value,i=document.getElementById("hl-margin-pre").value,x=document.getElementById("hl-margin-post").value,$=(R=document.getElementById("hl-set"))==null?void 0:R.value,q=(O=document.getElementById("hl-mostrar-acciones"))==null?void 0:O.checked,k=((_=document.getElementById("hl-con-marcador"))==null?void 0:_.checked)!==!1;r&&(l.jugador_nombre=r),c&&(l.complejo=c),u&&(l.tipo_accion=u),d&&(l.resultado=d),$&&(l.set_numero=parseInt($,10)),q&&(l.mostrar_acciones=!0),l.con_marcador=k,l.pre_margin=i?parseFloat(i):3,l.post_margin=x?parseFloat(x):1,m.disabled=!0,m.textContent="⏳ Generando (puede tardar)...";const A=document.getElementById("hl-progress-container"),B=document.getElementById("hl-progress-bar"),I=document.getElementById("hl-progress-text");A&&(A.style.display="block"),B&&(B.style.width="0%"),I&&(I.textContent="0%");try{await window.api.generateVideoHighlights(p.partidoId,l)&&w("Vídeo generado con éxito","success")}catch(M){w(M.message||"Error al generar vídeo","error")}finally{m.disabled=!1,m.textContent="✂️ Generar Vídeo",A&&(A.style.display="none")}})),document.querySelectorAll(".tab-golpes-btn").forEach(l=>{l.addEventListener("click",r=>{const c=r.target.dataset.target;document.querySelectorAll(".tab-golpes-btn").forEach(u=>{u.classList.remove("btn-primary"),u.classList.add("btn-secondary")}),r.target.classList.remove("btn-secondary"),r.target.classList.add("btn-primary"),document.querySelectorAll(".tab-golpes-content").forEach(u=>{u.style.display="none"}),document.getElementById(c).style.display="block"})}),document.querySelectorAll(".tab-ataque-btn").forEach(l=>{l.addEventListener("click",r=>{const c=r.target.dataset.target;document.querySelectorAll(".tab-ataque-btn").forEach(u=>{u.classList.remove("btn-primary"),u.classList.add("btn-secondary")}),r.target.classList.remove("btn-secondary"),r.target.classList.add("btn-primary"),document.querySelectorAll(".tab-ataque-content").forEach(u=>{u.style.display="none"}),document.getElementById(c).style.display="block"})}),document.querySelectorAll(".tab-saque-btn").forEach(l=>{l.addEventListener("click",r=>{document.querySelectorAll(".tab-saque-btn").forEach(c=>{c.classList.remove("btn-primary"),c.classList.add("btn-secondary")}),r.target.classList.remove("btn-secondary"),r.target.classList.add("btn-primary"),document.querySelectorAll(".tab-saque-content").forEach(c=>c.style.display="none"),document.getElementById(r.target.dataset.target).style.display="block"})})};y()})}function C(a){return a>=65?"good":a>=45?"average":"bad"}function D(a){return Object.entries(a).map(([p,e])=>`${p}: ${e}`).join(" · ")||"Sin datos"}function L(a){return a&&Object.entries(a).map(([p,e])=>`${p.replace("Recepción ","")}: ${e}`).join(" · ")||"Sin datos"}function U(a){const p=[...new Set(a.map(e=>e.set_numero))].sort();return p.length===0?'<p style="color: #64748b; padding: 16px;">Sin datos de puntos.</p>':p.map(e=>{const n=a.filter(b=>b.set_numero===e&&b.tipo_accion!=="fin_set");let g=0,h=0;const s=[];if(n.forEach(b=>{b.resultado==="punto"?(g++,s.push({pos:s.length,nos:g,riv:h,team:"nos"})):(b.resultado==="error"||b.resultado==="bloqueado")&&(h++,s.push({pos:s.length,nos:g,riv:h,team:"riv"}))}),s.length===0)return"";const o=s.map(b=>b.team==="nos"?`<span style="display:inline-block; width:26px; height:26px; line-height:26px; text-align:center; background:#10b981; color:#fff; border-radius:4px; font-size:11px; font-weight:700; margin:1px;">${b.nos}</span>`:'<span style="display:inline-block; width:26px; height:26px; margin:1px;"></span>').join(""),y=s.map(b=>b.team==="riv"?`<span style="display:inline-block; width:26px; height:26px; line-height:26px; text-align:center; background:#ef4444; color:#fff; border-radius:4px; font-size:11px; font-weight:700; margin:1px;">${b.riv}</span>`:'<span style="display:inline-block; width:26px; height:26px; margin:1px;"></span>').join("");return`
            <div style="background: #1a2332; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                <div style="font-size: 14px; font-weight: 700; color: #f59e0b; margin-bottom: 12px;">Set ${e} — Final: ${g}-${h}</div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; overflow-x: auto;">
                    <span style="min-width: 36px; font-size: 11px; font-weight: 600; color: #10b981;">NOS</span>
                    <div style="display: flex; flex-wrap: nowrap;">${o}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; overflow-x: auto;">
                    <span style="min-width: 36px; font-size: 11px; font-weight: 600; color: #ef4444;">RIV</span>
                    <div style="display: flex; flex-wrap: nowrap;">${y}</div>
                </div>
            </div>
        `}).join("")}function H(a,p,e){const n=document.getElementById("chart-sideout");n&&j.push(new Chart(n,{type:"bar",data:{labels:[p,e,"Equipo General"],datasets:[{label:"Side-Out General %",data:[a.jugador1.sideOutTransPct,a.jugador2.sideOutTransPct,Math.round((a.jugador1.puntosK1+a.jugador2.puntosK1)/(a.jugador1.totalK1+a.jugador2.totalK1||1)*100)],backgroundColor:"rgba(59, 130, 246, 0.7)",borderColor:"#3b82f6",borderWidth:2,borderRadius:4},{label:"Side-Out a la Primera %",data:[a.jugador1.sideOutFirstPct,a.jugador2.sideOutFirstPct,Math.round((a.jugador1.fbsoPuntos+a.jugador2.fbsoPuntos)/(a.jugador1.totalK1+a.jugador2.totalK1||1)*100)],backgroundColor:"rgba(245, 158, 11, 0.7)",borderColor:"#f59e0b",borderWidth:2,borderRadius:4}]},options:K("Porcentaje (%)",100)})),E("chart-golpes-general-j1",a.jugador1.golpesMasRepetidosGeneral),E("chart-golpes-general-j2",a.jugador2.golpesMasRepetidosGeneral),E("chart-golpes-k1-j1",a.jugador1.golpesMasRepetidosK1),E("chart-golpes-k1-j2",a.jugador2.golpesMasRepetidosK1),E("chart-golpes-k2-j1",a.jugador1.golpesMasRepetidosK2),E("chart-golpes-k2-j2",a.jugador2.golpesMasRepetidosK2);const g=K("Cantidad");g.scales.x.stacked=!0,g.scales.y.stacked=!0;const h=document.getElementById("chart-ataques-general-j1");h&&j.push(new Chart(h,{type:"bar",data:P(a.jugador1.distribucionAtaquesGeneral),options:g}));const s=document.getElementById("chart-ataques-general-j2");s&&j.push(new Chart(s,{type:"bar",data:P(a.jugador2.distribucionAtaquesGeneral),options:g}));const o=document.getElementById("chart-ataques-k1-j1");o&&j.push(new Chart(o,{type:"bar",data:P(a.jugador1.distribucionAtaquesK1),options:g}));const y=document.getElementById("chart-ataques-k1-j2");y&&j.push(new Chart(y,{type:"bar",data:P(a.jugador2.distribucionAtaquesK1),options:g}));const b=document.getElementById("chart-ataques-k2-j1");b&&j.push(new Chart(b,{type:"bar",data:P(a.jugador1.distribucionAtaquesK2),options:g}));const v=document.getElementById("chart-ataques-k2-j2");v&&j.push(new Chart(v,{type:"bar",data:P(a.jugador2.distribucionAtaquesK2),options:g}));const t=new Set;Object.keys(a.jugador1.distribucionSaques).forEach(d=>t.add(d)),Object.keys(a.jugador2.distribucionSaques).forEach(d=>t.add(d));const f=Array.from(t),m=K("Cantidad");m.scales.x.stacked=!0,m.scales.y.stacked=!0;const l=document.getElementById("chart-saques-j1");l&&j.push(new Chart(l,{type:"bar",data:{labels:f,datasets:[{label:"Puntos",data:f.map(d=>{var i;return((i=a.jugador1.distribucionSaques[d])==null?void 0:i.puntos)||0}),backgroundColor:"rgba(16, 185, 129, 0.8)",borderColor:"#10b981",borderWidth:1},{label:"Continuidad",data:f.map(d=>{const i=a.jugador1.distribucionSaques[d];return i?i.total-i.puntos-i.errores:0}),backgroundColor:"rgba(245, 158, 11, 0.8)",borderColor:"#f59e0b",borderWidth:1},{label:"Errores",data:f.map(d=>{var i;return((i=a.jugador1.distribucionSaques[d])==null?void 0:i.errores)||0}),backgroundColor:"rgba(239, 68, 68, 0.8)",borderColor:"#ef4444",borderWidth:1}]},options:m}));const r=document.getElementById("chart-saques-j2");r&&j.push(new Chart(r,{type:"bar",data:{labels:f,datasets:[{label:"Puntos",data:f.map(d=>{var i;return((i=a.jugador2.distribucionSaques[d])==null?void 0:i.puntos)||0}),backgroundColor:"rgba(16, 185, 129, 0.8)",borderColor:"#10b981",borderWidth:1},{label:"Continuidad",data:f.map(d=>{const i=a.jugador2.distribucionSaques[d];return i?i.total-i.puntos-i.errores:0}),backgroundColor:"rgba(59, 130, 246, 0.8)",borderColor:"#3b82f6",borderWidth:1},{label:"Errores",data:f.map(d=>{var i;return((i=a.jugador2.distribucionSaques[d])==null?void 0:i.errores)||0}),backgroundColor:"rgba(239, 68, 68, 0.8)",borderColor:"#ef4444",borderWidth:1}]},options:m}));const c=document.getElementById("chart-saques-ambos");c&&j.push(new Chart(c,{type:"bar",data:{labels:f,datasets:[{label:"Puntos",data:f.map(d=>{var i,x;return(((i=a.jugador1.distribucionSaques[d])==null?void 0:i.puntos)||0)+(((x=a.jugador2.distribucionSaques[d])==null?void 0:x.puntos)||0)}),backgroundColor:"rgba(16, 185, 129, 0.8)",borderColor:"#10b981",borderWidth:1},{label:"Continuidad",data:f.map(d=>{const i=a.jugador1.distribucionSaques[d],x=i?i.total-i.puntos-i.errores:0,$=a.jugador2.distribucionSaques[d],q=$?$.total-$.puntos-$.errores:0;return x+q}),backgroundColor:"rgba(139, 92, 246, 0.8)",borderColor:"#8b5cf6",borderWidth:1},{label:"Errores",data:f.map(d=>{var i,x;return(((i=a.jugador1.distribucionSaques[d])==null?void 0:i.errores)||0)+(((x=a.jugador2.distribucionSaques[d])==null?void 0:x.errores)||0)}),backgroundColor:"rgba(239, 68, 68, 0.8)",borderColor:"#ef4444",borderWidth:1}]},options:m})),document.querySelectorAll(".tab-hidden-initially").forEach(d=>{d.classList.remove("tab-hidden-initially"),d.style.display="none"})}function G(a){let p=0,e=0,n=0,g=0,h=0,s=0,o=0;if(Object.keys(a).forEach(b=>{const v=a[b].total;o+=v;const t=b.toLowerCase();t.includes("línea larga")||t.includes("línea")&&!t.includes("corta")?p+=v:t.includes("línea corta")?g+=v:t.includes("diago larga")||t.includes("diagonal")&&!t.includes("corta")?e+=v:t.includes("diago corta")?h+=v:(t.includes("centro")||t.includes("medio"))&&(n+=Math.ceil(v*.7),s+=Math.floor(v*.3))}),o===0)return'<p class="text-muted">No hay datos de dirección de ataque</p>';const y=b=>{if(b===0)return"rgba(30, 41, 59, 0.5)";const v=b/o;return v<.1?"rgba(59, 130, 246, 0.6)":v<.25?"rgba(16, 185, 129, 0.7)":v<.4?"rgba(245, 158, 11, 0.8)":"rgba(239, 68, 68, 0.9)"};return`
        <div style="width: 240px; height: 240px; border: 2px solid #fff; background: #eab308; position: relative; display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 2px; padding: 2px;">
            <!-- Red / Net indicator -->
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: rgba(255,255,255,0.8); z-index: 10;"></div>
            
            <!-- Fila Fondo (Larga) -->
            <div style="background: ${y(p)}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">
                <span style="font-size: 10px; opacity: 0.8;">Línea L</span>
                <span>${p>0?Math.round(p/o*100)+"%":""}</span>
            </div>
            <div style="background: ${y(n)}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">
                <span style="font-size: 10px; opacity: 0.8;">Fondo M</span>
                <span>${n>0?Math.round(n/o*100)+"%":""}</span>
            </div>
            <div style="background: ${y(e)}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">
                <span style="font-size: 10px; opacity: 0.8;">Diago L</span>
                <span>${e>0?Math.round(e/o*100)+"%":""}</span>
            </div>
            
            <!-- Fila Red (Corta) -->
            <div style="background: ${y(g)}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">
                <span style="font-size: 10px; opacity: 0.8;">Línea C</span>
                <span>${g>0?Math.round(g/o*100)+"%":""}</span>
            </div>
            <div style="background: ${y(s)}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">
                <span style="font-size: 10px; opacity: 0.8;">Corto M</span>
                <span>${s>0?Math.round(s/o*100)+"%":""}</span>
            </div>
            <div style="background: ${y(h)}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">
                <span style="font-size: 10px; opacity: 0.8;">Diago C</span>
                <span>${h>0?Math.round(h/o*100)+"%":""}</span>
            </div>
        </div>
        <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 8px;">* Vista desde el lado del rival (abajo es la red)</div>
    `}function E(a,p){const e=document.getElementById(a);if(!e||!p||p.length===0)return;const n=p.map(o=>o[0]),g=p.map(o=>o[1]),h=T(n.length),s=F(n.length,.8);j.push(new Chart(e,{type:"doughnut",data:{labels:n,datasets:[{data:g,backgroundColor:s,borderColor:h,borderWidth:2}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"right",labels:{color:"#94a3b8",font:{family:"'Inter', sans-serif",size:11},padding:12}}}}}))}function P(a){const p=Object.keys(a);return{labels:p,datasets:[{label:"Puntos",data:p.map(e=>{var n;return((n=a[e])==null?void 0:n.puntos)||0}),backgroundColor:"rgba(16, 185, 129, 0.8)",borderColor:"#10b981",borderWidth:1},{label:"Continuidad",data:p.map(e=>{const n=a[e];return n?n.total-n.puntos-n.errores:0}),backgroundColor:"rgba(245, 158, 11, 0.8)",borderColor:"#f59e0b",borderWidth:1},{label:"Errores",data:p.map(e=>{var n;return((n=a[e])==null?void 0:n.errores)||0}),backgroundColor:"rgba(239, 68, 68, 0.8)",borderColor:"#ef4444",borderWidth:1}]}}function K(a,p=null){const e={responsive:!0,maintainAspectRatio:!1,plugins:{legend:{labels:{color:"#94a3b8",font:{family:"'Inter', sans-serif",size:12}}}},scales:{x:{ticks:{color:"#64748b",font:{family:"'Inter', sans-serif",size:11}},grid:{color:"rgba(255,255,255,0.05)"}},y:{ticks:{color:"#64748b",font:{family:"'Inter', sans-serif",size:11}},grid:{color:"rgba(255,255,255,0.05)"},title:{display:!0,text:a,color:"#64748b"}}}};return p&&(e.scales.y.max=p),e}export{Z as registerInforme};
