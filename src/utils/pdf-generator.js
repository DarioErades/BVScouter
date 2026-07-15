import { formatDate } from './helpers.js';

export function generateCustomPdfHtml(partido, stats, j1Nombre, j2Nombre, accionesFiltradas) {

    // calculamos resultado del partido
    let resultadoCalculado = partido.resultado || '–';
    if (accionesFiltradas.length > 0) {
        const sets = [...new Set(accionesFiltradas.map(a => a.set_numero))].sort();
        const scores = [];
        let setsLocal = 0, setsRival = 0;
        sets.forEach(s => {
            const acc = accionesFiltradas.filter(a => a.set_numero === s);
            const last = acc[acc.length - 1];
            let loc = parseInt(last.marcador_local) || 0;
            let riv = parseInt(last.marcador_rival) || 0;
            if (last.tipo_accion !== 'fin_set') {
                if (last.resultado === 'punto') loc++;
                else if (last.resultado === 'error' || last.resultado === 'bloqueado') riv++;
            }
            scores.push(`${loc}-${riv}`);
            if (loc > riv) setsLocal++; else if (riv > loc) setsRival++;
        });
        resultadoCalculado = sets.length === 1
            ? scores[0]
            : `${setsLocal}-${setsRival} (${scores.join(', ')})`;
    }

    const j1 = stats.jugador1;
    const j2 = stats.jugador2;

    // side-out general (puntosK1/totalK1)
    const j1SoPct = j1.totalK1 > 0 ? Math.round((j1.puntosK1 / j1.totalK1) * 100) : 0;
    const j2SoPct = j2.totalK1 > 0 ? Math.round((j2.puntosK1 / j2.totalK1) * 100) : 0;

    // helpers de renderizado
    const fila = (label, v1, v2) => `
        <tr>
            <td class="col-label">${label}</td>
            <td class="col-val">${v1}</td>
            <td class="col-val">${v2}</td>
        </tr>`;

    const barras = (dist) => {
        const keys = Object.keys(dist);
        if (keys.length === 0) return '<p class="empty">Sin datos</p>';
        const maxTotal = Math.max(...keys.map(k => dist[k].total));
        return keys.map(k => {
            const d = dist[k];
            const wPts  = maxTotal > 0 ? (d.puntos / maxTotal) * 100 : 0;
            const wErr  = maxTotal > 0 ? (d.errores / maxTotal) * 100 : 0;
            const wCont = maxTotal > 0 ? ((d.total - d.puntos - d.errores) / maxTotal) * 100 : 0;
            return `
            <div class="bar-row">
                <div class="bar-label">${k} <span class="bar-total">${d.total}</span></div>
                <div class="bar-track">
                    ${wPts  > 0 ? `<div class="seg seg-pt"  style="width:${wPts.toFixed(1)}%">${d.puntos}</div>` : ''}
                    ${wCont > 0 ? `<div class="seg seg-ct"  style="width:${wCont.toFixed(1)}%">${d.total - d.puntos - d.errores}</div>` : ''}
                    ${wErr  > 0 ? `<div class="seg seg-er"  style="width:${wErr.toFixed(1)}%">${d.errores}</div>` : ''}
                </div>
            </div>`;
        }).join('');
    };

    const topGolpes = (lista) => {
        if (!lista || lista.length === 0) return '<p class="empty">Sin datos</p>';
        const total = lista.reduce((s, [, v]) => s + v, 0);
        return lista.slice(0, 6).map(([k, v], i) => {
            const pct = Math.round((v / total) * 100);
            return `
            <div class="golpe-row">
                <span class="golpe-rank">${i + 1}</span>
                <span class="golpe-name">${k}</span>
                <div class="golpe-bar-wrap">
                    <div class="golpe-bar" style="width:${pct}%"></div>
                </div>
                <span class="golpe-pct">${v} <small>(${pct}%)</small></span>
            </div>`;
        }).join('');
    };

    const recepcionDist = (dist) => {
        const keys = Object.keys(dist);
        if (keys.length === 0) return '<p class="empty">Sin datos</p>';
        const total = keys.reduce((s, k) => s + dist[k], 0);
        return keys.map(k => {
            const pct = Math.round((dist[k] / total) * 100);
            return `
            <div class="bar-row">
                <div class="bar-label">${k} <span class="bar-total">${dist[k]}</span></div>
                <div class="bar-track">
                    <div class="seg seg-pt" style="width:${pct}%">${pct}%</div>
                </div>
            </div>`;
        }).join('');
    };

    const notas = partido.notas
        ? partido.notas.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe BVScouter – ${j1Nombre} / ${j2Nombre}</title>
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
        <p>${j1Nombre} &amp; ${j2Nombre} · ${partido.torneo || 'Sin torneo'} · ${partido.fase || '–'}</p>
    </div>
    <div class="header-right">
        <span class="resultado">${resultadoCalculado}</span>
        ${formatDate(partido.fecha)}
    </div>
</div>

<!-- ====== META ====== -->
<div class="meta-grid">
    <div class="meta-card">
        <div class="meta-label">Torneo</div>
        <div class="meta-val">${partido.torneo || '–'}</div>
    </div>
    <div class="meta-card">
        <div class="meta-label">Fase</div>
        <div class="meta-val">${partido.fase || '–'}</div>
    </div>
    <div class="meta-card">
        <div class="meta-label">Acciones analizadas</div>
        <div class="meta-val">${accionesFiltradas.length}</div>
    </div>
    <div class="meta-card">
        <div class="meta-label">Resultado final</div>
        <div class="meta-val" style="color:#1e40af">${resultadoCalculado}</div>
    </div>
</div>

<!-- ====== RESUMEN GLOBAL ====== -->
<div class="section">
    <div class="section-title">Resumen Estadistico General</div>
    <div class="big-stat-grid">
        <div class="big-stat">
            <div class="bs-val">${j1.killsAtaque + j2.killsAtaque}</div>
            <div class="bs-label">Kills Totales</div>
            <div class="bs-sub">${j1.killsAtaque} · ${j2.killsAtaque}</div>
        </div>
        <div class="big-stat">
            <div class="bs-val">${j1.erroresAtaque + j2.erroresAtaque}</div>
            <div class="bs-label">Errores Ataque</div>
            <div class="bs-sub">${j1.erroresAtaque} · ${j2.erroresAtaque}</div>
        </div>
        <div class="big-stat">
            <div class="bs-val">${j1SoPct}%</div>
            <div class="bs-label">Side-Out ${j1Nombre}</div>
            <div class="bs-sub">${j1.puntosK1}/${j1.totalK1} K1</div>
        </div>
        <div class="big-stat">
            <div class="bs-val">${j2SoPct}%</div>
            <div class="bs-label">Side-Out ${j2Nombre}</div>
            <div class="bs-sub">${j2.puntosK1}/${j2.totalK1} K1</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th class="th-left" style="width:36%">Metrica</th>
                <th>${j1Nombre}</th>
                <th class="col-sep">${j2Nombre}</th>
            </tr>
        </thead>
        <tbody>
            ${fila('Ataques totales', j1.totalAtaques, j2.totalAtaques)}
            ${fila('Kills (puntos de ataque)', `<span class="ok">${j1.killsAtaque}</span>`, `<span class="ok">${j2.killsAtaque}</span>`)}
            ${fila('Errores de ataque', `<span class="bad">${j1.erroresAtaque}</span>`, `<span class="bad">${j2.erroresAtaque}</span>`)}
            ${fila('Eficacia de ataque (Kills-Err / Total)', `<span class="${j1.eficaciaAtaque >= 0 ? 'ok' : 'bad'}">${j1.eficaciaAtaque}%</span>`, `<span class="${j2.eficaciaAtaque >= 0 ? 'ok' : 'bad'}">${j2.eficaciaAtaque}%</span>`)}
            ${fila('Side-Out general (K1)', `<span class="highlight">${j1SoPct}% (${j1.puntosK1}/${j1.totalK1})</span>`, `<span class="highlight">${j2SoPct}% (${j2.puntosK1}/${j2.totalK1})</span>`)}
            ${fila('Side-Out a la primera (FBSO)', `${j1.sideOutFirstPct}% (${j1.fbsoPuntos}/${j1.fbsoOportunidades})`, `${j2.sideOutFirstPct}% (${j2.fbsoPuntos}/${j2.fbsoOportunidades})`)}
            ${fila('Recepciones totales', j1.totalRecepciones, j2.totalRecepciones)}
            ${fila('Calidad media de recepcion (/10)', j1.recepcionPromedio, j2.recepcionPromedio)}
            ${fila('Bloqueos totales', j1.totalBloqueos, j2.totalBloqueos)}
            ${fila('Puntos directos', `<span class="ok">${j1.puntosDirectos}</span>`, `<span class="ok">${j2.puntosDirectos}</span>`)}
            ${fila('Errores propios', `<span class="bad">${j1.erroresPropios}</span>`, `<span class="bad">${j2.erroresPropios}</span>`)}
        </tbody>
    </table>
</div>

<!-- ====== SIDE-OUT ====== -->
<div class="section">
    <div class="section-title">Analisis de Side-Out (K1)</div>
    <div class="two-col">
        <div class="card">
            <div class="card-title">${j1Nombre}</div>
            <table>
                <thead><tr><th class="th-left">Tipo</th><th>Puntos</th><th>Opor.</th><th>%</th></tr></thead>
                <tbody>
                    <tr>
                        <td class="col-label">A la Primera (FBSO)</td>
                        <td>${j1.fbsoPuntos}</td>
                        <td>${j1.fbsoOportunidades}</td>
                        <td class="highlight">${j1.sideOutFirstPct}%</td>
                    </tr>
                    <tr>
                        <td class="col-label">En Transicion</td>
                        <td>${j1.transPuntos}</td>
                        <td>${j1.transOportunidades}</td>
                        <td class="highlight">${j1.sideOutTransPct}%</td>
                    </tr>
                    <tr>
                        <td class="col-label"><strong>Total K1</strong></td>
                        <td><strong>${j1.puntosK1}</strong></td>
                        <td><strong>${j1.totalK1}</strong></td>
                        <td class="highlight"><strong>${j1SoPct}%</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="card">
            <div class="card-title">${j2Nombre}</div>
            <table>
                <thead><tr><th class="th-left">Tipo</th><th>Puntos</th><th>Opor.</th><th>%</th></tr></thead>
                <tbody>
                    <tr>
                        <td class="col-label">A la Primera (FBSO)</td>
                        <td>${j2.fbsoPuntos}</td>
                        <td>${j2.fbsoOportunidades}</td>
                        <td class="highlight">${j2.sideOutFirstPct}%</td>
                    </tr>
                    <tr>
                        <td class="col-label">En Transicion</td>
                        <td>${j2.transPuntos}</td>
                        <td>${j2.transOportunidades}</td>
                        <td class="highlight">${j2.sideOutTransPct}%</td>
                    </tr>
                    <tr>
                        <td class="col-label"><strong>Total K1</strong></td>
                        <td><strong>${j2.puntosK1}</strong></td>
                        <td><strong>${j2.totalK1}</strong></td>
                        <td class="highlight"><strong>${j2SoPct}%</strong></td>
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
            <div class="card-title">${j1Nombre}</div>
            ${barras(j1.distribucionAtaquesK1)}
        </div>
        <div class="card">
            <div class="card-title">${j2Nombre}</div>
            ${barras(j2.distribucionAtaquesK1)}
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
            <div class="card-title">${j1Nombre}</div>
            ${barras(j1.distribucionAtaquesK2)}
        </div>
        <div class="card">
            <div class="card-title">${j2Nombre}</div>
            ${barras(j2.distribucionAtaquesK2)}
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
            <div class="card-title">${j1Nombre}</div>
            ${barras(j1.distribucionSaques)}
        </div>
        <div class="card">
            <div class="card-title">${j2Nombre}</div>
            ${barras(j2.distribucionSaques)}
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
            <div class="card-title">${j1Nombre} – Media: ${j1.recepcionPromedio}/10 (${j1.totalRecepciones} recs.)</div>
            ${recepcionDist(j1.distribucionRecepcion)}
        </div>
        <div class="card">
            <div class="card-title">${j2Nombre} – Media: ${j2.recepcionPromedio}/10 (${j2.totalRecepciones} recs.)</div>
            ${recepcionDist(j2.distribucionRecepcion)}
        </div>
    </div>
</div>

<!-- ====== TOP GOLPES ====== -->
<div class="section">
    <div class="section-title">Top Golpes de Ataque (General)</div>
    <div class="two-col">
        <div class="card">
            <div class="card-title">${j1Nombre}</div>
            ${topGolpes(j1.golpesMasRepetidosGeneral)}
        </div>
        <div class="card">
            <div class="card-title">${j2Nombre}</div>
            ${topGolpes(j2.golpesMasRepetidosGeneral)}
        </div>
    </div>
</div>

<!-- ====== BLOQUEOS ====== -->
<div class="section">
    <div class="section-title">Bloqueos (${j1.totalBloqueos + j2.totalBloqueos} totales)</div>
    <div class="two-col">
        <div class="card">
            <div class="card-title">${j1Nombre} – ${j1.totalBloqueos} bloqueos</div>
            ${Object.keys(j1.distribucionBloqueos).length > 0
                ? Object.entries(j1.distribucionBloqueos).map(([k, v]) =>
                    `<div class="golpe-row"><span class="golpe-name">${k}</span><span class="golpe-pct">${v}</span></div>`
                  ).join('')
                : '<p class="empty">Sin datos</p>'
            }
        </div>
        <div class="card">
            <div class="card-title">${j2Nombre} – ${j2.totalBloqueos} bloqueos</div>
            ${Object.keys(j2.distribucionBloqueos).length > 0
                ? Object.entries(j2.distribucionBloqueos).map(([k, v]) =>
                    `<div class="golpe-row"><span class="golpe-name">${k}</span><span class="golpe-pct">${v}</span></div>`
                  ).join('')
                : '<p class="empty">Sin datos</p>'
            }
        </div>
    </div>
</div>

${notas ? `
<!-- ====== NOTAS ====== -->
<div class="section">
    <div class="section-title">Notas del Partido</div>
    <div class="notas-box">${notas}</div>
</div>
` : ''}

<!-- ====== PIE ====== -->
<div class="footer">
    <span>BVScouter – Informe generado el ${new Date().toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric' })}</span>
    <span>${j1Nombre} &amp; ${j2Nombre} vs ${partido.torneo || 'Rival'} · ${formatDate(partido.fecha)}</span>
</div>

</body>
</html>`;
}
