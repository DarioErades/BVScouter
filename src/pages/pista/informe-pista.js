import { router } from '../../router.js';
import { showToast, formatDate, formatTimestamp, escapeHtml } from '../../utils/helpers.js';
import { TIPOS_ACCION_PISTA, RESULTADOS_PISTA } from '../../utils/constants-pista.js';
import { calcularStatsPista, calcularTiempoJugadoPista, detectarPatronesPista } from '../../utils/stats-calculator-pista.js';
import { validarDatosPista } from '../../utils/data-validation-pista.js';
import { actionsForReview, reviewCategories } from '../../utils/scouting-review.js';
import { resumirRallies, rendimientoPorRotacion, resumenSet } from '../../utils/rallies-pista.js';
import { elegirSeccionesPdf, filtrarSeccionesPdf } from '../../utils/pdf-secciones.js';

let chartInstances = [];

// A partir de los mismos rallies que usan las estadísticas: qué puntos se cerraron y si hubo un
// tiempo muerto antes de completarse (para marcarlo en el gráfico de línea).
function construirLineaPuntos(acciones) {
    const puntos = [];
    const tiemposMuertos = [];
    const cerradosPorSet = {};
    resumirRallies(acciones).forEach(r => {
        if (r.acciones.some(a => a.tipo_accion === 'tiempo_muerto')) {
            tiemposMuertos.push({ set: r.set, punto: cerradosPorSet[r.set] || 0 });
        }
        if (r.cerrado && r.marcador) {
            puntos.push({ set: r.set, local: r.marcador.local, rival: r.marcador.rival });
            cerradosPorSet[r.set] = (cerradosPorSet[r.set] || 0) + 1;
        }
    });
    return { puntos, tiemposMuertos };
}

// Marcador punto a punto por set: una casilla por punto con el resultado acumulado (igual que en
// la app de tablet), más la racha máxima y la mayor ventaja de cada equipo.
function renderMarcadorPuntoAPunto(rallies, nombreLocal, nombreRival) {
    const sets = [...new Set(rallies.map(r => r.set))].sort((a, b) => a - b);
    if (!sets.length) return '<p class="report-stat-sublabel">Sin puntos registrados.</p>';

    return sets.map(s => {
        const delSet = rallies.filter(r => r.set === s && r.cerrado && r.marcador);
        if (!delSet.length) return '';
        const resumen = resumenSet(delSet);
        const ultimo = delSet[delSet.length - 1].marcador;
        const box = (r, equipo) => {
            const gana = r.ganador === equipo;
            const num = equipo === 'local' ? r.marcador.local : r.marcador.rival;
            const color = equipo === 'local' ? '#10b981' : '#ef4444';
            return gana
                ? `<span title="${formatTimestamp(r.acciones[r.acciones.length - 1]?.video_timestamp || 0)}" style="display:inline-block; width:26px; height:26px; line-height:26px; text-align:center; background:${color}; color:#fff; border-radius:4px; font-size:11px; font-weight:700; margin:1px;">${num}</span>`
                : `<span style="display:inline-block; width:26px; height:26px; margin:1px;"></span>`;
        };
        return `
            <div style="background: #1a2332; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom: 12px;">
                    <span style="font-size: 14px; font-weight: 700; color: #f59e0b;">Set ${s} — Final: ${ultimo.local}-${ultimo.rival}</span>
                    <span class="report-stat-sublabel">Racha máx. ${escapeHtml(nombreLocal)}: <strong>${resumen.rachaLocal}</strong> · ${escapeHtml(nombreRival)}: <strong>${resumen.rachaRival}</strong></span>
                    <span class="report-stat-sublabel">Mayor ventaja: <strong>+${resumen.ventajaLocal}</strong> / <strong>-${resumen.ventajaRival}</strong></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; overflow-x: auto;">
                    <span style="min-width: 70px; font-size: 11px; font-weight: 600; color: #10b981;">${escapeHtml(nombreLocal).slice(0, 10).toUpperCase()}</span>
                    <div style="display: flex; flex-wrap: nowrap;">${delSet.map(r => box(r, 'local')).join('')}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; overflow-x: auto;">
                    <span style="min-width: 70px; font-size: 11px; font-weight: 600; color: #ef4444;">${escapeHtml(nombreRival).slice(0, 10).toUpperCase()}</span>
                    <div style="display: flex; flex-wrap: nowrap;">${delSet.map(r => box(r, 'rival')).join('')}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Rendimiento por rotación (posición del colocador R1-R6): % de puntos ganados recibiendo
// (side-out) y sacando (break-point), para ver qué rotaciones funcionan y cuáles no.
function renderRendimientoRotaciones(rallies) {
    const filas = rendimientoPorRotacion(rallies);
    const celda = (x) => x.total ? `${Math.round((x.ganados / x.total) * 100)}% <span class="report-stat-sublabel">(${x.ganados}/${x.total})</span>` : '<span class="report-stat-sublabel">–</span>';
    return `
        <table class="data-table" style="width: 100%; font-size: 12px; text-align: center; border-collapse: collapse;">
            <thead><tr style="background: rgba(255,255,255,0.05);"><th>Rotación</th><th>Side-Out (recibiendo)</th><th>Break Point (sacando)</th></tr></thead>
            <tbody>
                ${filas.map(f => `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);"><td><strong>R${f.rot}</strong></td><td>${celda(f.recibiendo)}</td><td>${celda(f.sacando)}</td></tr>`).join('')}
            </tbody>
        </table>
        <p class="report-stat-sublabel" style="margin-top:8px;">R = posición del colocador en pista. Se calcula con la rotación guardada en cada acción, sin necesitar los titulares del set.</p>
    `;
}

export function registerInformePista() {
    router.register('informe-pista', async (container, params) => {
        chartInstances.forEach(c => c.destroy());
        chartInstances = [];

        const partidoId = params.partidoId;
        const partido = await window.apiPista.getPartidoPista(partidoId);
        
        if (!partido) {
            showToast('Partido no encontrado', 'error');
            router.navigate('dashboard-pista');
            return;
        }

        const roster = await window.apiPista.getRoster(partidoId);
        const acciones = await window.apiPista.getAccionesPista(partidoId);

        const lineaPuntos = construirLineaPuntos(acciones);
        const rallies = resumirRallies(acciones);
        const setsResultados = [...new Set(acciones.map(a => a.set_numero))].sort((a, b) => a - b);
        let setsLocal = 0;
        let setsVisitante = 0;
        const scoreStringArr = [];
        const puntosSet = {};
        
        setsResultados.forEach(s => {
            const puntosSetAcciones = lineaPuntos.puntos.filter(p => p.set === s);
            const accionesSet = acciones.filter(a => a.set_numero === s);
            const lastAction = accionesSet[accionesSet.length - 1];
            const ultimoPunto = puntosSetAcciones[puntosSetAcciones.length - 1];
            const local = ultimoPunto?.local ?? Number(lastAction?.marcador_local || 0);
            const rival = ultimoPunto?.rival ?? Number(lastAction?.marcador_rival || 0);

            scoreStringArr.push(`${local}-${rival}`);
            puntosSet[s] = { local, rival };
            if (local > rival) setsLocal++;
            else if (rival > local) setsVisitante++;
        });

        const resultadoGlobal = `${setsLocal}-${setsVisitante}`;
        const scoreDetails = scoreStringArr.length > 0 ? `(${scoreStringArr.join(', ')})` : '';
        const nombreLocal = partido.equipo_nombre || partido.equipo_local || 'Local';
        const nombreRival = partido.rival_nombre || partido.equipo_visitante || 'Rival';

        // Calcular stats generales
        const stats = calcularStatsPista ? calcularStatsPista(acciones, roster) : { jugadores: {} };
        const patrones = detectarPatronesPista ? detectarPatronesPista(acciones, roster) : [];
        let calidadIgnorados = [];
        try { calidadIgnorados = JSON.parse(partido.calidad_ignorados || '[]'); } catch (e) { calidadIgnorados = []; }
        const calidadDatos = validarDatosPista(acciones, roster, calidadIgnorados);
        let currentReviewCategory = 'errors';

        let rotacionesIniciales = {};
        try { rotacionesIniciales = JSON.parse(partido.rotaciones_iniciales || '{}'); } catch (e) { /* sin datos */ }
        const tiempo = calcularTiempoJugadoPista(acciones, roster, rotacionesIniciales);

        // Solo los jugadores que han pisado el campo: titulares, los que entran en un cambio
        // o cualquiera con alguna acción registrada (los líberos entran por esta vía).
        const pisaronCampo = new Set([
            ...Object.keys(tiempo.porJugador).map(Number),
            ...acciones.map(a => Number(a.dorsal))
        ]);
        const jugadoresConStats = roster.filter(j => pisaronCampo.has(Number(j.dorsal))).map(j => {
            const jugadorStats = stats.porJugador?.[j.dorsal] || stats.porJugador?.[String(j.dorsal)];
            return jugadorStats ?
                { ...j, stats: jugadorStats } :
                { ...j, stats: createEmptyStats() };
        });
        const filasTiempo = roster
            .filter(j => tiempo.porJugador[Number(j.dorsal)])
            .map(j => ({ j, t: tiempo.porJugador[Number(j.dorsal)] }))
            .sort((x, y) => y.t.puntosJugados - x.t.puntosJugados);
        const seccionTiempo = `
                <div class="report-section" style="margin-top: 24px;" data-pdf-sec="tiempo">
                    <h2 class="report-section-title">⏱️ Tiempo de juego (puntos jugados)</h2>
                    ${tiempo.hayDatos && filasTiempo.length ? `
                    <table class="data-table" style="width: 100%; font-size: 12px; text-align: center; border-collapse: collapse;">
                        <thead><tr style="background: rgba(255,255,255,0.05);"><th>Nº</th><th style="text-align:left;">Nombre</th><th>Sets</th><th>Puntos jugados</th><th>Ganados</th><th>Perdidos</th><th>Balance</th></tr></thead>
                        <tbody>${filasTiempo.map(({ j, t }) => `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);"><td><strong>${j.dorsal}</strong></td><td style="text-align:left;">${escapeHtml(j.nombre || j.apellidos || '')}</td><td>${t.sets}</td><td><strong>${t.puntosJugados}</strong></td><td>${t.ganados}</td><td>${t.perdidos}</td><td>${t.ganados - t.perdidos > 0 ? '+' : ''}${t.ganados - t.perdidos}</td></tr>`).join('')}</tbody>
                    </table>
                    <p class="report-stat-sublabel" style="margin-top:8px;">Calculado con los titulares de cada set y los cambios registrados. Los líberos no se incluyen.</p>`
                    : '<p class="report-stat-sublabel">Sin datos: activa «Llevar control de rotaciones» y fija los titulares de cada set para calcularlo.</p>'}
                </div>`;

        const getAdvStat = (obj, prop, def = '0%') => obj && obj[prop] !== undefined ? obj[prop] : def;
        const getStat = (obj, prop, def = 0) => obj && obj[prop] !== undefined ? obj[prop] : def;

        // Fila TOTAL de la tabla: suma de todos los jugadores; los porcentajes se recalculan sobre
        // los totales (no se suman ni se promedian los de cada jugador).
        const sumar = (f) => jugadoresConStats.reduce((a, j) => a + (Number(f(j.stats)) || 0), 0);
        const pctDe = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0) + '%';
        const tot = {};
        ['fasePunto', 'aciertos', 'errores', 'gMenosP', 'ptsSaque', 'ptsAtaque', 'ptsBloqueo', 'saqueTot', 'saqueErr', 'saquePos', 'saqueNeg',
            'recTot', 'recErr', 'recNeg', 'attTot', 'attErr', 'attBlq', 'blqErr'].forEach(k => { tot[k] = sumar(st => getStat(st, k, 0)); });
        tot.recPosPct = pctDe(sumar(st => st.recepcion?.positivas), tot.recTot);
        tot.recExcPct = pctDe(sumar(st => st.recepcion?.excelentes), tot.recTot);
        tot.attPtsPct = pctDe(tot.ptsAtaque, tot.attTot);

        const advancedStats = stats.avanzadas || {
            sideOut: { recepciones: 0, puntos: 0, ratio: '0%' },
            breakPoint: { saques: 0, puntos: 0, ratio: '0%' },
            ataquePos: { tot: 0, err: 0, blq: 0, ptsPct: '0%' },
            ataqueNeg: { tot: 0, err: 0, blq: 0, ptsPct: '0%' },
            contraataque: { tot: 0, err: 0, blq: 0, ptsPct: '0%' }
        };

        container.innerHTML = `
            <div class="report-container page-enter">
                <div class="report-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h1 class="report-title">📊 Informe de Partido</h1>
                        <div class="report-meta">
                            <p><strong>${escapeHtml(nombreLocal)}</strong> vs <strong>${escapeHtml(nombreRival)}</strong></p>
                            <p>${escapeHtml(partido.torneo || 'Amistoso')} · ${escapeHtml(partido.fase || '-')} · ${formatDate(partido.fecha)}</p>
                            <p>Resultado: <strong class="text-accent">${resultadoGlobal} ${scoreDetails}</strong></p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary" id="btn-back">← Volver</button>
                        <button class="btn btn-secondary" id="btn-export-csv">📥 CSV</button>
                        <button class="btn btn-secondary" id="btn-export-resumen" title="Una página para repartir a los jugadores">📃 Resumen 1 página</button>
                        <button class="btn btn-primary" id="btn-export-pdf">📄 Exportar PDF</button>
                    </div>
                </div>

                <div class="report-section" id="review-queue-pista">
                    <h2 class="report-section-title">🔎 Cola de revisión</h2>
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
                        ${reviewCategories(acciones).map(option => `<button class="btn btn-sm ${option.id === currentReviewCategory ? 'btn-primary' : 'btn-secondary'} btn-review-filter-pista" data-category="${option.id}">${option.label} (${option.count})</button>`).join('')}
                    </div>
                    <div id="review-items-pista" style="max-height:150px; overflow:auto; display:grid; gap:6px;"></div>
                </div>

                <div class="report-section">
                    <div data-pdf-sec="kpis" data-pdf-label="Resumen (resultado, side-out, break point, calidad del dato)" style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:12px; margin-bottom:20px;">
                        <div class="report-stat-card"><div class="report-stat-label">Resultado</div><div class="report-stat-value">${resultadoGlobal}</div><div class="report-stat-sublabel">${scoreDetails || 'Sin sets finalizados'}</div></div>
                        <div class="report-stat-card"><div class="report-stat-label">Side-Out</div><div class="report-stat-value">${advancedStats.sideOut.ratio}</div><div class="report-stat-sublabel">${advancedStats.sideOut.puntos}/${advancedStats.sideOut.recepciones} puntos</div></div>
                        <div class="report-stat-card"><div class="report-stat-label">Break Point</div><div class="report-stat-value">${advancedStats.breakPoint.ratio}</div><div class="report-stat-sublabel">${advancedStats.breakPoint.puntos}/${advancedStats.breakPoint.saques} puntos</div></div>
                        <div class="report-stat-card" style="border-color:${calidadDatos.isValid ? '#10b981' : '#ef4444'};"><div class="report-stat-label">Calidad del dato</div><div class="report-stat-value" style="color:${calidadDatos.isValid ? '#10b981' : '#ef4444'};">${calidadDatos.isValid ? 'OK' : 'REVISAR'}</div><div class="report-stat-sublabel">${calidadDatos.errors} errores · ${calidadDatos.warnings} avisos</div></div>
                    </div>
                    ${calidadDatos.issues.length ? `<div data-pdf-sec="calidad" data-pdf-label="Avisos de calidad del dato" style="padding:14px; border-radius:10px; border:1px solid ${calidadDatos.isValid ? '#f59e0b' : '#ef4444'}; background:${calidadDatos.isValid ? 'rgba(245,158,11,.08)' : 'rgba(239,68,68,.08)'}; margin-bottom:18px;"><strong>${calidadDatos.isValid ? 'Avisos de calidad' : 'Datos que requieren revisión'}</strong><ul style="list-style:none; margin:8px 0 0; padding:0; display:grid; gap:6px;">${calidadDatos.issues.map(issue => `<li style="display:flex; align-items:center; justify-content:space-between; gap:10px; color:var(--text-secondary);"><span>${escapeHtml(issue.text)}</span><button class="btn btn-sm btn-secondary btn-ignorar-calidad" data-key="${issue.key}" title="Ignorar esta incidencia; no volverá a contar en la calidad del dato">🚫 Ignorar</button></li>`).join('')}</ul></div>` : ''}
                    <div data-pdf-sec="jugadores">
                    <h2 class="report-section-title">Estadísticas de Jugadores</h2>
                    <div style="overflow-x: auto; margin-bottom: 24px;">
                        <table class="data-table" style="width: 100%; font-size: 11px; text-align: center; border-collapse: collapse; min-width: 1150px;">
                            <thead>
                                <tr style="background: rgba(255,255,255,0.05);">
                                    <th colspan="8" style="border-right: 1px solid var(--border);">General</th>
                                    <th colspan="3" style="border-right: 1px solid var(--border);">Puntos</th>
                                    <th colspan="5" style="border-right: 1px solid var(--border);">Saque</th>
                                    <th colspan="5" style="border-right: 1px solid var(--border);">Recepción</th>
                                    <th colspan="5" style="border-right: 1px solid var(--border);">Ataque</th>
                                    <th colspan="2">Bloqueo</th>
                                </tr>
                                <tr style="background: rgba(255,255,255,0.02); color: var(--text-secondary); border-bottom: 1px solid var(--border);">
                                    <th style="padding: 6px;">Nº</th>
                                    <th style="text-align: left;">Nombre</th>
                                    <th>Sets</th>
                                    <th>Voto</th>
                                    <th>FP</th>
                                    <th>Puntos</th>
                                    <th>Errores</th>
                                    <th style="border-right: 1px solid var(--border);">G-P</th>
                                    <th>Saq</th>
                                    <th>Att</th>
                                    <th style="border-right: 1px solid var(--border);">BLQ</th>
                                    <th>Tot</th>
                                    <th>Err</th>
                                    <th>Pos</th>
                                    <th>Neg</th>
                                    <th style="border-right: 1px solid var(--border);">Pts</th>
                                    <th>Tot</th>
                                    <th>Err</th>
                                    <th>Neg</th>
                                    <th>Pos%</th>
                                    <th style="border-right: 1px solid var(--border);">Exc%</th>
                                    <th>Tot</th>
                                    <th>Err</th>
                                    <th>Blq</th>
                                    <th>Pts</th>
                                    <th style="border-right: 1px solid var(--border);">Pts%</th>
                                    <th>Pts</th>
                                    <th>Err</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${jugadoresConStats.map((j, i) => `
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); ${i % 2 !== 0 ? 'background: rgba(255,255,255,0.02);' : ''}">
                                        <td style="padding: 6px;"><strong>${j.dorsal}</strong></td>
                                        <td style="text-align: left;">${j.nombre}</td>
                                        <td>${Array.isArray(j.stats.setsJugados) ? j.stats.setsJugados.length : getStat(j.stats, 'setsJugados', '-')}</td>
                                        <td><strong>${getStat(j.stats, 'voto', '6.0')}</strong></td>
                                        <td>${getStat(j.stats, 'fasePunto', 0)}</td>
                                        <td>${getStat(j.stats, 'aciertos', 0)}</td>
                                        <td>${getStat(j.stats, 'errores', 0)}</td>
                                        <td style="border-right: 1px solid var(--border); font-weight: bold; color: ${getStat(j.stats, 'gMenosP', 0) >= 0 ? 'var(--accent-primary)' : '#ef4444'};">${getStat(j.stats, 'gMenosP', 0) > 0 ? '+' : ''}${getStat(j.stats, 'gMenosP', 0)}</td>
                                        
                                        <td>${getStat(j.stats, 'ptsSaque', 0)}</td>
                                        <td>${getStat(j.stats, 'ptsAtaque', 0)}</td>
                                        <td style="border-right: 1px solid var(--border);">${getStat(j.stats, 'ptsBloqueo', 0)}</td>

                                        <td>${getStat(j.stats, 'saqueTot', 0)}</td>
                                        <td>${getStat(j.stats, 'saqueErr', 0)}</td>
                                        <td>${getStat(j.stats, 'saquePos', 0)}</td>
                                        <td>${getStat(j.stats, 'saqueNeg', 0)}</td>
                                        <td style="border-right: 1px solid var(--border);">${getStat(j.stats, 'ptsSaque', 0)}</td>
                                        
                                        <td>${getStat(j.stats, 'recTot', 0)}</td>
                                        <td>${getStat(j.stats, 'recErr', 0)}</td>
                                        <td>${getStat(j.stats, 'recNeg', 0)}</td>
                                        <td>${getStat(j.stats, 'recPosPct', '0%')}</td>
                                        <td style="border-right: 1px solid var(--border);">${getStat(j.stats, 'recExcPct', '0%')}</td>
                                        
                                        <td>${getStat(j.stats, 'attTot', 0)}</td>
                                        <td>${getStat(j.stats, 'attErr', 0)}</td>
                                        <td>${getStat(j.stats, 'attBlq', 0)}</td>
                                        <td>${getStat(j.stats, 'ptsAtaque', 0)}</td>
                                        <td style="border-right: 1px solid var(--border);">${getStat(j.stats, 'attPtsPct', '0%')}</td>
                                        
                                        <td>${getStat(j.stats, 'ptsBloqueo', 0)}</td>
                                        <td>${getStat(j.stats, 'blqErr', 0)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="border-top: 2px solid var(--border); background: rgba(255,255,255,0.06); font-weight: bold;">
                                    <td style="padding: 6px;"></td>
                                    <td style="text-align: left;">TOTAL</td>
                                    <td>–</td>
                                    <td>–</td>
                                    <td>${tot.fasePunto}</td>
                                    <td>${tot.aciertos}</td>
                                    <td>${tot.errores}</td>
                                    <td style="border-right: 1px solid var(--border); color: ${tot.gMenosP >= 0 ? 'var(--accent-primary)' : '#ef4444'};">${tot.gMenosP > 0 ? '+' : ''}${tot.gMenosP}</td>

                                    <td>${tot.ptsSaque}</td>
                                    <td>${tot.ptsAtaque}</td>
                                    <td style="border-right: 1px solid var(--border);">${tot.ptsBloqueo}</td>

                                    <td>${tot.saqueTot}</td>
                                    <td>${tot.saqueErr}</td>
                                    <td>${tot.saquePos}</td>
                                    <td>${tot.saqueNeg}</td>
                                    <td style="border-right: 1px solid var(--border);">${tot.ptsSaque}</td>

                                    <td>${tot.recTot}</td>
                                    <td>${tot.recErr}</td>
                                    <td>${tot.recNeg}</td>
                                    <td>${tot.recPosPct}</td>
                                    <td style="border-right: 1px solid var(--border);">${tot.recExcPct}</td>

                                    <td>${tot.attTot}</td>
                                    <td>${tot.attErr}</td>
                                    <td>${tot.attBlq}</td>
                                    <td>${tot.ptsAtaque}</td>
                                    <td style="border-right: 1px solid var(--border);">${tot.attPtsPct}</td>

                                    <td>${tot.ptsBloqueo}</td>
                                    <td>${tot.blqErr}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    </div>
                </div>

                ${seccionTiempo}

                <!-- Salto de página para el PDF -->
                <div class="pdf-page-break" style="page-break-before: always; break-before: page; margin-top: 32px;"></div>

                <div class="report-grid" style="grid-template-columns: 1fr 1fr; gap: 24px;">
                    <div class="report-section" data-pdf-sec="avanzado">
                        <h2 class="report-section-title">Análisis Avanzado (Side-Out & Break Point)</h2>
                        <div class="report-stat-card" style="margin-bottom: 12px;">
                            <div class="report-stat-label">Side-Out (Recepción a Punto)</div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                                <div class="report-stat-sublabel">${advancedStats.sideOut.recepciones} recepciones totales</div>
                                <div class="report-stat-value" style="font-size: 20px;">${advancedStats.sideOut.puntos} pts (${advancedStats.sideOut.ratio})</div>
                            </div>
                        </div>
                        <div class="report-stat-card" style="margin-bottom: 12px;">
                            <div class="report-stat-label">Break Point (Saque a Punto)</div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                                <div class="report-stat-sublabel">${advancedStats.breakPoint.saques} saques totales</div>
                                <div class="report-stat-value" style="font-size: 20px;">${advancedStats.breakPoint.puntos} pts (${advancedStats.breakPoint.ratio})</div>
                            </div>
                        </div>
                        <div style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
                            <h3 style="font-size: 14px; margin-bottom: 12px; color: var(--text-secondary);">Eficacia de Ataque por Situación</h3>
                            
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                                <span>1er Ataque tras Rec. Positiva</span>
                                <strong>${advancedStats.ataquePos.ptsPct}</strong>
                                <span style="font-size: 12px; color: var(--text-secondary);">(${advancedStats.ataquePos.tot} tot / ${advancedStats.ataquePos.cont || 0} cont / ${advancedStats.ataquePos.err} err / ${advancedStats.ataquePos.blq} blq)</span>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                                <span>1er Ataque tras Rec. Negativa</span>
                                <strong>${advancedStats.ataqueNeg.ptsPct}</strong>
                                <span style="font-size: 12px; color: var(--text-secondary);">(${advancedStats.ataqueNeg.tot} tot / ${advancedStats.ataqueNeg.cont || 0} cont / ${advancedStats.ataqueNeg.err} err / ${advancedStats.ataqueNeg.blq} blq)</span>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between;">
                                <span>Contraataque (Transición)</span>
                                <strong>${advancedStats.contraataque.ptsPct}</strong>
                                <span style="font-size: 12px; color: var(--text-secondary);">(${advancedStats.contraataque.tot} tot / ${advancedStats.contraataque.cont || 0} cont / ${advancedStats.contraataque.err} err / ${advancedStats.contraataque.blq} blq)</span>
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

                <div class="report-section" style="margin-top: 24px;" data-pdf-sec="rotaciones">
                    <h2 class="report-section-title">🎯 Rendimiento por Rotación</h2>
                    ${renderRendimientoRotaciones(rallies)}
                </div>

                <div class="report-section" style="margin-top: 24px;" data-pdf-sec="marcador">
                    <h2 class="report-section-title">📋 Marcador Punto a Punto</h2>
                    ${renderMarcadorPuntoAPunto(rallies, nombreLocal, nombreRival)}
                </div>
            </div>
        `;

        const renderReviewQueue = () => {
            const list = document.getElementById('review-items-pista');
            if (!list) return;
            const selected = actionsForReview(acciones, currentReviewCategory);
            list.innerHTML = selected.length
                ? selected.slice(0, 30).map(action => `<div class="timeline-item" style="display:flex; gap:10px;"><span class="timestamp">${formatTimestamp(action.video_timestamp)}</span><strong>#${Number(action.dorsal) || '-'}</strong><span>${escapeHtml(TIPOS_ACCION_PISTA[action.tipo_accion]?.label || action.tipo_accion)} · ${escapeHtml(action.subtipo || action.resultado || '')}</span></div>`).join('')
                : '<span class="report-stat-sublabel">No hay jugadas en esta cola.</span>';
        };
        renderReviewQueue();
        container.querySelectorAll('.btn-review-filter-pista').forEach(button => button.addEventListener('click', () => {
            currentReviewCategory = button.dataset.category;
            container.querySelectorAll('.btn-review-filter-pista').forEach(b => b.classList.toggle('btn-primary', b === button));
            container.querySelectorAll('.btn-review-filter-pista').forEach(b => b.classList.toggle('btn-secondary', b !== button));
            renderReviewQueue();
        }));

        // Renderizar charts si Chart.js está disponible
        if (window.Chart) {
            const ctxAtaque = document.getElementById('chart-ataque-dist').getContext('2d');
            const ctxRec = document.getElementById('chart-rec-quality').getContext('2d');
            const ctxPuntos = document.getElementById('chart-puntos-set').getContext('2d');

            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#f59e0b';
            
            // Datos reales; nunca mostramos valores de ejemplo en un informe.
            const atqStats = stats.totalEquipo?.ataque || { total: 0, puntos: 0, errores: 0, bloqueados: 0 };
            const atqData = {
                puntos: atqStats.puntos || 0,
                continuidad: Math.max(0, (atqStats.total || 0) - (atqStats.puntos || 0) - (atqStats.errores || 0) - (atqStats.bloqueados || 0)),
                errores: (atqStats.errores || 0) + (atqStats.bloqueados || 0)
            };
            chartInstances.push(new window.Chart(ctxAtaque, {
                type: 'doughnut',
                data: {
                    labels: ['Puntos', 'Continuidad', 'Error / Bloqueo'],
                    datasets: [{
                        data: [atqData.puntos, atqData.continuidad, atqData.errores],
                        backgroundColor: ['#10b981', '#3b82f6', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#e5e7eb' } }, title: { display: true, text: 'Distribución de Ataques', color: '#e5e7eb' } } }
            }));

            // Recep quality
            const recStats = stats.totalEquipo?.recepcion || { total: 0, excelentes: 0, positivas: 0, errores: 0 };
            const recData = {
                perfecta: recStats.excelentes || 0,
                buena: Math.max(0, (recStats.positivas || 0) - (recStats.excelentes || 0)),
                mala: Math.max(0, (recStats.total || 0) - (recStats.positivas || 0) - (recStats.errores || 0)),
                error: recStats.errores || 0
            };
            chartInstances.push(new window.Chart(ctxRec, {
                type: 'doughnut',
                data: {
                    labels: ['Perfecta (#)', 'Positiva (+)', 'Negativa (-)', 'Error (=)'],
                    datasets: [{
                        data: [recData.perfecta || 0, recData.buena || 0, recData.mala || 0, recData.error || 0],
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#e5e7eb' } }, title: { display: true, text: 'Calidad de Recepción', color: '#e5e7eb' } } }
            }));

            // Línea de puntos: cada punto se coloca en orden cronológico y los
            // tiempos muertos aparecen como marcas rojas en el punto actual.
            const puntos = lineaPuntos.puntos;
            const labelsPuntos = puntos.map((p, i) => `${p.set}.${i + 1}`);
            const timeoutData = puntos.map((p, i) => {
                const hayTimeout = lineaPuntos.tiemposMuertos.some(t => t.set === p.set && t.punto === puntos.filter(x => x.set === p.set).indexOf(p));
                return hayTimeout ? Math.max(p.local, p.rival) + 1 : null;
            });

            chartInstances.push(new window.Chart(ctxPuntos, {
                type: 'line',
                data: {
                    labels: labelsPuntos,
                    datasets: [
                        { label: nombreLocal, data: puntos.map(p => p.local), borderColor: accentColor, backgroundColor: accentColor, tension: 0.15, pointRadius: 3 },
                        { label: nombreRival, data: puntos.map(p => p.rival), borderColor: '#94a3b8', backgroundColor: '#94a3b8', tension: 0.15, pointRadius: 3 },
                        { label: 'Tiempo muerto', data: timeoutData, borderColor: '#ef4444', backgroundColor: '#ef4444', showLine: false, pointRadius: 7, pointHoverRadius: 9, pointStyle: 'rectRot' }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, spanGaps: true, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af', stepSize: 1 } }, x: { grid: { display: false }, ticks: { color: '#9ca3af', maxRotation: 0, autoSkip: true } } }, plugins: { legend: { labels: { color: '#e5e7eb' } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y ?? ''}` } } } }
            }));
        }

        // Bind events
        container.querySelectorAll('.btn-ignorar-calidad').forEach(btn => {
            btn.addEventListener('click', async () => {
                const key = btn.dataset.key;
                const actualizados = [...new Set([...calidadIgnorados, key])];
                await window.apiPista.updatePartidoPista(partidoId, { calidad_ignorados: JSON.stringify(actualizados) });
                router.navigate('informe-pista', params);
            });
        });

        container.querySelector('#btn-back').addEventListener('click', () => {
            if (params.origen === 'scouting-pista') {
                router.navigate('scouting-pista', { partidoId });
            } else {
                router.navigate('dashboard-pista');
            }
        });

        container.querySelector('#btn-export-csv').addEventListener('click', async () => {
            try {
                await window.apiPista.exportAccionesPistaCSV(partidoId);
                showToast('CSV exportado correctamente', 'success');
            } catch (err) {
                showToast('Error al exportar CSV', 'error');
            }
        });

        container.querySelector('#btn-export-resumen').addEventListener('click', async () => {
            try {
                showToast('Generando resumen...', 'info');
                const html = buildResumenUnaPaginaHtml({
                    nombreLocal, nombreRival, partido, resultadoGlobal, scoreDetails,
                    jugadoresConStats, advancedStats
                });
                const result = await window.api.generatePDF(html, 900, { landscape: false });
                if (result) showToast('Resumen exportado correctamente', 'success');
            } catch (err) {
                showToast('Error al exportar el resumen', 'error');
            }
        });

        container.querySelector('#btn-export-pdf').addEventListener('click', async () => {
            try {
                if (!calidadDatos.isValid && !confirm(`El informe contiene ${calidadDatos.errors} errores de datos. ¿Exportarlo de todos modos?`)) return;
                const informe = document.querySelector('.report-container');
                const seleccion = await elegirSeccionesPdf(informe, 'volleystats.pdf.pista');
                if (!seleccion) return;
                showToast('Generando PDF...', 'info');
                const copia = informe.cloneNode(true);
                filtrarSeccionesPdf(copia, seleccion);
                const html = copia.outerHTML;
                // Add basic styles for the PDF
                const styledHtml = `
                    <style>
                        body { font-family: sans-serif; color: #333; background: #fff; }
                        .text-accent { color: #f59e0b; }
                        .report-title { font-size: 24px; margin-bottom: 8px; }
                        .report-section-title { font-size: 18px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
                        .data-table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: center; }
                        .data-table th, .data-table td { border: 1px solid #ddd; padding: 4px; }
                        .data-table th { background: #f5f5f5; font-weight: bold; }
                        .btn, .chart-container { display: none !important; }
                        /* En pantalla la tabla hace scroll horizontal; en el PDF debe verse entera */
                        .report-container, .report-section { max-width: none !important; overflow: visible !important; }
                        div[style*="overflow-x"], div[style*="overflow:"] { overflow: visible !important; max-height: none !important; }
                        #review-queue-pista { display: none !important; }
                        .data-table { min-width: 0 !important; width: 100% !important; font-size: 7px !important; table-layout: auto; }
                        .data-table th, .data-table td { padding: 1px 2px !important; white-space: nowrap; }
                        .data-table th { white-space: normal; }
                        .data-table td:nth-child(2) { white-space: normal; }
                    </style>
                    ${html.replace(/var\(--[a-zA-Z-]+\)/g, '#333')}
                    <script>
                        /* Ajusta cada tabla al ancho útil de una página A4 apaisada */
                        document.querySelectorAll('.data-table').forEach(t => {
                            const ancho = t.scrollWidth;
                            if (ancho > 1040) t.style.zoom = String(1040 / ancho);
                        });
                    </script>
                `;
                const height = informe.scrollHeight;
                const result = await window.api.generatePDF(styledHtml, height + 100, { landscape: true });
                if (result) {
                    showToast('PDF exportado correctamente', 'success');
                }
            } catch (err) {
                showToast('Error al exportar PDF', 'error');
            }
        });
    });
}

// Resumen de una sola página en A4, pensado para repartir a los jugadores tras el partido:
// resultado, side-out/break-point del equipo y una fila compacta por jugador.
function buildResumenUnaPaginaHtml({ nombreLocal, nombreRival, partido, resultadoGlobal, scoreDetails, jugadoresConStats, advancedStats }) {
    const filas = jugadoresConStats
        .filter(j => Number(j.stats.aciertos || 0) + Number(j.stats.errores || 0) > 0)
        .sort((a, b) => Number(b.stats.gMenosP || 0) - Number(a.stats.gMenosP || 0));

    const fila = (j) => `
        <tr>
            <td><strong>${j.dorsal}</strong></td>
            <td style="text-align:left;">${escapeHtml(j.nombre || j.apellidos || '')}</td>
            <td><strong>${j.stats.voto ?? '6.0'}</strong></td>
            <td>${j.stats.aciertos ?? 0}</td>
            <td>${j.stats.errores ?? 0}</td>
            <td style="font-weight:bold; color:${Number(j.stats.gMenosP || 0) >= 0 ? '#0f766e' : '#b91c1c'};">${Number(j.stats.gMenosP || 0) > 0 ? '+' : ''}${j.stats.gMenosP ?? 0}</td>
            <td>${j.stats.saqueTot ?? 0}/${j.stats.saqueErr ?? 0}</td>
            <td>${j.stats.recTot ?? 0}/${j.stats.recErr ?? 0} (${j.stats.recPosPct ?? '0%'})</td>
            <td>${j.stats.attTot ?? 0}/${j.stats.attErr ?? 0} (${j.stats.attPtsPct ?? '0%'})</td>
        </tr>`;

    return `
        <style>
            body { font-family: sans-serif; color: #1e293b; background: #fff; margin: 24px; }
            h1 { font-size: 22px; margin: 0 0 2px; }
            .sub { color: #64748b; font-size: 13px; margin-bottom: 14px; }
            .resultado { font-size: 30px; font-weight: 900; color: #d97706; margin: 6px 0 16px; }
            .kpis { display: flex; gap: 12px; margin-bottom: 18px; }
            .kpi { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
            .kpi b { display: block; font-size: 20px; }
            .kpi span { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: center; }
            th, td { border: 1px solid #e2e8f0; padding: 5px 4px; }
            th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
            td:nth-child(2), th:nth-child(2) { text-align: left; }
        </style>
        <h1>${escapeHtml(nombreLocal)} vs ${escapeHtml(nombreRival)}</h1>
        <div class="sub">${escapeHtml(partido.torneo || 'Amistoso')} · ${formatDate(partido.fecha)}</div>
        <div class="resultado">${resultadoGlobal} ${scoreDetails}</div>
        <div class="kpis">
            <div class="kpi"><b>${advancedStats.sideOut.ratio}</b><span>Side-Out (${advancedStats.sideOut.puntos}/${advancedStats.sideOut.recepciones})</span></div>
            <div class="kpi"><b>${advancedStats.breakPoint.ratio}</b><span>Break Point (${advancedStats.breakPoint.puntos}/${advancedStats.breakPoint.saques})</span></div>
        </div>
        <table>
            <thead><tr><th>Nº</th><th>Jugador</th><th>Voto</th><th>Pts</th><th>Err</th><th>+/-</th><th>Saq T/E</th><th>Rec T/E (%pos)</th><th>Att T/E (%pts)</th></tr></thead>
            <tbody>${filas.map(fila).join('') || '<tr><td colspan="9">Sin acciones registradas.</td></tr>'}</tbody>
        </table>
    `;
}

function createEmptyStats() {
    return {
        setsJugados: 0, voto: '6.0', fasePunto: 0, gMenosP: 0,
        ptsSaque: 0, ptsAtaque: 0, ptsBloqueo: 0, errAdversario: 0,
        saqueTot: 0, saqueErr: 0, recTot: 0, recErr: 0, recPosPct: '0%', recExcPct: '0%',
        attTot: 0, attErr: 0, attBlq: 0, attPtsPct: '0%'
    };
}
