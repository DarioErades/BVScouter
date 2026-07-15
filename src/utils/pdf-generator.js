import { formatDate } from './helpers.js';

export function generateCustomPdfHtml(partido, stats, j1Nombre, j2Nombre, accionesFiltradas) {
    const renderBar = (data) => {
        const labels = Object.keys(data);
        if (labels.length === 0) return '<div class="pdf-empty">Sin datos registrados</div>';
        
        let html = '<div class="pdf-bars">';
        
        // Find max total to scale the bars
        const maxTotal = Math.max(...labels.map(l => data[l].total));
        
        labels.forEach(l => {
            const d = data[l];
            const pts = d.puntos || 0;
            const err = d.errores || 0;
            const cont = d.total - pts - err;
            
            const wPts = (pts / maxTotal) * 100;
            const wCont = (cont / maxTotal) * 100;
            const wErr = (err / maxTotal) * 100;
            
            html += `
                <div class="pdf-bar-row">
                    <div class="pdf-bar-label">${l} <span>(${d.total})</span></div>
                    <div class="pdf-bar-track">
                        ${wPts > 0 ? `<div class="pdf-bar-segment pt" style="width: ${wPts}%">${pts}</div>` : ''}
                        ${wCont > 0 ? `<div class="pdf-bar-segment ct" style="width: ${wCont}%">${cont}</div>` : ''}
                        ${wErr > 0 ? `<div class="pdf-bar-segment er" style="width: ${wErr}%">${err}</div>` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    };

    const renderPieData = (data) => {
        const labels = Object.keys(data).sort((a,b) => data[b] - data[a]);
        if (labels.length === 0) return '<div class="pdf-empty">Sin datos registrados</div>';
        let total = labels.reduce((acc, l) => acc + data[l], 0);
        
        let html = '<ul class="pdf-pie-list">';
        labels.slice(0, 5).forEach(l => {
            const val = data[l];
            const pct = Math.round((val/total)*100);
            html += `<li><span class="pie-label">${l}</span> <span class="pie-val">${val} <small>(${pct}%)</small></span></li>`;
        });
        html += '</ul>';
        return html;
    };

    // Calculate score
    let resultadoCalculado = "";
    if (accionesFiltradas.length > 0) {
        let setsLocal = 0;
        let setsRival = 0;
        const sets = [...new Set(accionesFiltradas.map(a => a.set_numero))].sort();
        const scores = [];
        
        sets.forEach(s => {
            const accionesSet = accionesFiltradas.filter(a => a.set_numero === s);
            const lastAction = accionesSet[accionesSet.length - 1];
            let local = parseInt(lastAction.marcador_local) || 0;
            let rival = parseInt(lastAction.marcador_rival) || 0;
            
            if (lastAction.tipo_accion !== 'fin_set') {
                if (lastAction.resultado === 'punto') local += 1;
                else if (lastAction.resultado === 'error' || lastAction.resultado === 'bloqueado') rival += 1;
            }
            scores.push(`${local}-${rival}`);
            if (local > rival) setsLocal++;
            else if (rival > local) setsRival++;
        });
        if (sets.length === 1) resultadoCalculado = scores[0];
        else resultadoCalculado = `${setsLocal}-${setsRival} (${scores.join(' ')})`;
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Informe BVScouter</title>
            <style>
                @page { margin: 15mm; size: A4; }
                body { 
                    font-family: 'Inter', 'Segoe UI', sans-serif; 
                    color: #1e293b; 
                    background: #ffffff;
                    margin: 0;
                    padding: 0;
                    line-height: 1.5;
                }
                .pdf-header {
                    border-bottom: 3px solid #3b82f6;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }
                .pdf-title {
                    font-size: 28px;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0 0 5px 0;
                    text-transform: uppercase;
                    letter-spacing: -0.5px;
                }
                .pdf-subtitle {
                    font-size: 14px;
                    color: #64748b;
                    margin: 0;
                }
                .pdf-meta-box {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 12px 16px;
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 25px;
                    font-size: 13px;
                }
                .meta-item strong { color: #334155; }
                
                .pdf-section {
                    margin-bottom: 25px;
                    page-break-inside: avoid;
                }
                .pdf-section-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: #0f172a;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 6px;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .pdf-grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                
                .pdf-card {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 15px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .pdf-card-title {
                    font-size: 14px;
                    font-weight: 700;
                    color: #3b82f6;
                    margin-bottom: 10px;
                    text-align: center;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                /* Estadisticas Generales Tabla */
                .pdf-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }
                .pdf-table th, .pdf-table td {
                    padding: 8px 6px;
                    text-align: center;
                    border-bottom: 1px solid #e2e8f0;
                }
                .pdf-table th {
                    font-weight: 600;
                    color: #64748b;
                    background: #f8fafc;
                }
                .pdf-table tr:last-child td { border-bottom: none; }
                .text-left { text-align: left !important; }
                
                /* Barras CSS */
                .pdf-bars { display: flex; flex-direction: column; gap: 8px; }
                .pdf-bar-row { display: flex; flex-direction: column; gap: 4px; }
                .pdf-bar-label { font-size: 11px; font-weight: 600; color: #475569; display: flex; justify-content: space-between; }
                .pdf-bar-label span { color: #94a3b8; font-weight: 400; }
                .pdf-bar-track {
                    width: 100%;
                    height: 16px;
                    background: #f1f5f9;
                    border-radius: 4px;
                    display: flex;
                    overflow: hidden;
                }
                .pdf-bar-segment {
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    color: #fff;
                    font-weight: 600;
                }
                .pt { background: #10b981; }
                .ct { background: #f59e0b; }
                .er { background: #ef4444; }
                
                .pdf-empty {
                    padding: 20px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 13px;
                    background: #f8fafc;
                    border-radius: 6px;
                    border: 1px dashed #cbd5e1;
                }
                
                .pdf-pie-list {
                    list-style: none; padding: 0; margin: 0;
                }
                .pdf-pie-list li {
                    display: flex; justify-content: space-between;
                    padding: 6px 0;
                    border-bottom: 1px solid #f1f5f9;
                    font-size: 12px;
                }
                .pdf-pie-list li:last-child { border: none; }
                .pie-label { font-weight: 600; color: #334155; }
                .pie-val { color: #0f172a; }
                .pie-val small { color: #64748b; }
                
                .legend {
                    display: flex;
                    justify-content: center;
                    gap: 15px;
                    font-size: 11px;
                    margin-top: 10px;
                }
                .leg-item { display: flex; align-items: center; gap: 4px; color: #64748b; }
                .leg-box { width: 10px; height: 10px; border-radius: 2px; }
            </style>
        </head>
        <body>
            <div class="pdf-header">
                <h1 class="pdf-title">Informe de Partido</h1>
                <p class="pdf-subtitle">${j1Nombre} & ${j2Nombre} vs ${partido.torneo || 'Rival Desconocido'}</p>
            </div>
            
            <div class="pdf-meta-box">
                <div class="meta-item"><strong>Fecha:</strong> ${formatDate(partido.fecha)}</div>
                <div class="meta-item"><strong>Fase/Torneo:</strong> ${partido.fase || '-'} / ${partido.torneo || '-'}</div>
                <div class="meta-item"><strong>Resultado:</strong> <span style="color:#10b981;font-weight:bold;">${resultadoCalculado}</span></div>
                <div class="meta-item"><strong>Acciones:</strong> ${accionesFiltradas.length}</div>
            </div>

            <!-- Resumen Estadistico -->
            <div class="pdf-section">
                <div class="pdf-section-title">📊 Resumen Estadístico General</div>
                <div class="pdf-card" style="padding: 0; overflow: hidden;">
                    <table class="pdf-table">
                        <thead>
                            <tr>
                                <th class="text-left">Métrica</th>
                                <th>${j1Nombre}</th>
                                <th>${j2Nombre}</th>
                                <th>Equipo</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="text-left"><strong>Ataques (Pts/Err)</strong></td>
                                <td>${stats.jugador1.puntosAtaque} / ${stats.jugador1.erroresAtaque}</td>
                                <td>${stats.jugador2.puntosAtaque} / ${stats.jugador2.erroresAtaque}</td>
                                <td>${stats.general.ataquesTotales} (${stats.general.ataquesPuntos} pts)</td>
                            </tr>
                            <tr>
                                <td class="text-left"><strong>Eficacia Ataque</strong></td>
                                <td>${stats.jugador1.ataqueEficacia}%</td>
                                <td>${stats.jugador2.ataqueEficacia}%</td>
                                <td>${stats.general.ataqueEficaciaGeneral}%</td>
                            </tr>
                            <tr>
                                <td class="text-left"><strong>Eficiencia Ataque</strong></td>
                                <td>${stats.jugador1.ataqueEficiencia}%</td>
                                <td>${stats.jugador2.ataqueEficiencia}%</td>
                                <td>${stats.general.ataqueEficienciaGeneral}%</td>
                            </tr>
                            <tr>
                                <td class="text-left"><strong>Side-Out (K1)</strong></td>
                                <td>${stats.jugador1.sideOutFirstPct}% FBSO</td>
                                <td>${stats.jugador2.sideOutFirstPct}% FBSO</td>
                                <td>-</td>
                            </tr>
                            <tr>
                                <td class="text-left"><strong>Saques (Pts/Err)</strong></td>
                                <td>${stats.jugador1.puntosSaque} / ${stats.jugador1.erroresSaque}</td>
                                <td>${stats.jugador2.puntosSaque} / ${stats.jugador2.erroresSaque}</td>
                                <td>${stats.general.saquesPuntos} / ${stats.general.saquesErrores}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div style="page-break-after: always;"></div>
            
            <div class="pdf-header" style="margin-top: 20px;">
                <h1 class="pdf-title">Distribución de Ataques</h1>
            </div>

            <!-- Ataques K1 -->
            <div class="pdf-section">
                <div class="pdf-section-title">⚔️ Ataques en K1 (Recepción -> Ataque)</div>
                <div class="pdf-grid-2">
                    <div class="pdf-card">
                        <div class="pdf-card-title">${j1Nombre}</div>
                        ${renderBar(stats.jugador1.distribucionAtaquesK1)}
                    </div>
                    <div class="pdf-card">
                        <div class="pdf-card-title">${j2Nombre}</div>
                        ${renderBar(stats.jugador2.distribucionAtaquesK1)}
                    </div>
                </div>
            </div>

            <!-- Ataques K2 -->
            <div class="pdf-section">
                <div class="pdf-section-title">🛡️ Ataques en K2 (Defensa -> Ataque)</div>
                <div class="pdf-grid-2">
                    <div class="pdf-card">
                        <div class="pdf-card-title">${j1Nombre}</div>
                        ${renderBar(stats.jugador1.distribucionAtaquesK2)}
                    </div>
                    <div class="pdf-card">
                        <div class="pdf-card-title">${j2Nombre}</div>
                        ${renderBar(stats.jugador2.distribucionAtaquesK2)}
                    </div>
                </div>
            </div>
            
            <div class="legend">
                <div class="leg-item"><div class="leg-box pt"></div> Puntos</div>
                <div class="leg-item"><div class="leg-box ct"></div> Continuidad</div>
                <div class="leg-item"><div class="leg-box er"></div> Errores</div>
            </div>
            
            <div style="page-break-after: always;"></div>

            <div class="pdf-header" style="margin-top: 20px;">
                <h1 class="pdf-title">Rendimiento Adicional</h1>
            </div>

            <!-- Saques -->
            <div class="pdf-section">
                <div class="pdf-section-title">🎯 Rendimiento de Saques</div>
                <div class="pdf-grid-2">
                    <div class="pdf-card">
                        <div class="pdf-card-title">${j1Nombre}</div>
                        ${renderBar(stats.jugador1.distribucionSaques)}
                    </div>
                    <div class="pdf-card">
                        <div class="pdf-card-title">${j2Nombre}</div>
                        ${renderBar(stats.jugador2.distribucionSaques)}
                    </div>
                </div>
                <div class="legend" style="margin-top: 15px;">
                    <div class="leg-item"><div class="leg-box pt"></div> Puntos Directos (Aces)</div>
                    <div class="leg-item"><div class="leg-box ct"></div> Saques en Juego</div>
                    <div class="leg-item"><div class="leg-box er"></div> Errores de Saque</div>
                </div>
            </div>

            <!-- Golpes Mas Repetidos -->
            <div class="pdf-section">
                <div class="pdf-section-title">🔄 Top Golpes (General)</div>
                <div class="pdf-grid-2">
                    <div class="pdf-card">
                        <div class="pdf-card-title">${j1Nombre}</div>
                        ${renderPieData(stats.jugador1.golpesMasRepetidosGeneral)}
                    </div>
                    <div class="pdf-card">
                        <div class="pdf-card-title">${j2Nombre}</div>
                        ${renderPieData(stats.jugador2.golpesMasRepetidosGeneral)}
                    </div>
                </div>
            </div>

            <!-- Notas del Partido -->
            ${partido.notas ? `
            <div class="pdf-section" style="margin-top: 30px;">
                <div class="pdf-section-title">📝 Notas Finales del Partido</div>
                <div class="pdf-card" style="background: #fefce8; border-color: #fef08a;">
                    <p style="margin:0; white-space: pre-wrap; font-size: 13px; color: #854d0e;">${partido.notas}</p>
                </div>
            </div>
            ` : ''}

        </body>
        </html>
    `;
    return html;
}
