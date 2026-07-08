// pagina del informe con graficos

import { router } from '../router.js';
import { showToast, formatDate, getChartColors, getChartColorsAlpha } from '../utils/helpers.js';
import { calcularStats, detectarPatrones } from '../utils/stats-calculator.js';

// guardamos refs a los charts para destruirlos al salir
let chartInstances = [];

export function registerInforme() {
    router.register('informe', async (container, params) => {
        // limpiamos charts anteriores
        chartInstances.forEach(c => c.destroy());
        chartInstances = [];

        const partido = await window.api.getPartido(params.partidoId);
        if (!partido) {
            showToast('Partido no encontrado', 'error');
            router.navigate('dashboard');
            return;
        }

        const acciones = await window.api.getAcciones(params.partidoId);
        const stats = calcularStats(acciones, partido.jugador1_id, partido.jugador2_id);
        const j1Nombre = `${partido.jugador1_nombre} ${partido.jugador1_apellidos}`;
        const j2Nombre = `${partido.jugador2_nombre} ${partido.jugador2_apellidos}`;
        const patrones = detectarPatrones(acciones, j1Nombre, j2Nombre, partido.jugador1_id, partido.jugador2_id);

        container.innerHTML = `
            <div class="report-container page-enter">
                <!-- cabecera del informe -->
                <div class="report-header">
                    <h1 class="report-title">📊 Informe de Scouting</h1>
                    <div class="report-meta">
                        <p><strong>${j1Nombre}</strong> / <strong>${j2Nombre}</strong></p>
                        <p>${partido.torneo || 'Sin torneo'} · ${partido.fase || '-'} · ${formatDate(partido.fecha)}</p>
                        <p>Resultado: <strong class="text-accent">${partido.resultado || 'Sin resultado'}</strong> · ${acciones.length} acciones registradas</p>
                    </div>
                </div>

                <!-- seccion 1: side-out -->
                <div class="report-section">
                    <h2 class="report-section-title">⭐ Porcentaje de Side-Out</h2>
                    <div class="report-grid">
                        <div class="report-stat-card">
                            <div class="report-stat-value ${getSoClass(stats.jugador1.sideOutPct)}">${stats.jugador1.sideOutPct}%</div>
                            <div class="report-stat-label">${j1Nombre}</div>
                            <div class="report-stat-sublabel">${stats.jugador1.puntosK1} pts en ${stats.jugador1.totalK1} rallies K1</div>
                        </div>
                        <div class="report-stat-card">
                            <div class="report-stat-value ${getSoClass(stats.jugador2.sideOutPct)}">${stats.jugador2.sideOutPct}%</div>
                            <div class="report-stat-label">${j2Nombre}</div>
                            <div class="report-stat-sublabel">${stats.jugador2.puntosK1} pts en ${stats.jugador2.totalK1} rallies K1</div>
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
                    <div class="report-grid">
                        <div class="chart-container">
                            <div class="chart-title">${partido.jugador1_nombre} - Top Golpes</div>
                            <div class="chart-wrapper">
                                <canvas id="chart-golpes-j1"></canvas>
                            </div>
                        </div>
                        <div class="chart-container">
                            <div class="chart-title">${partido.jugador2_nombre} - Top Golpes</div>
                            <div class="chart-wrapper">
                                <canvas id="chart-golpes-j2"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- seccion 3: distribucion de ataques -->
                <div class="report-section">
                    <h2 class="report-section-title">⚡ Análisis de Ataque</h2>
                    <div class="report-grid">
                        <div class="report-stat-card">
                            <div class="report-stat-value ${stats.jugador1.eficaciaAtaque >= 30 ? 'good' : stats.jugador1.eficaciaAtaque >= 10 ? 'average' : 'bad'}">${stats.jugador1.eficaciaAtaque}%</div>
                            <div class="report-stat-label">Eficacia Ataque ${partido.jugador1_nombre}</div>
                            <div class="report-stat-sublabel">${stats.jugador1.killsAtaque} kills · ${stats.jugador1.erroresAtaque} errores · ${stats.jugador1.totalAtaques} total</div>
                        </div>
                        <div class="report-stat-card">
                            <div class="report-stat-value ${stats.jugador2.eficaciaAtaque >= 30 ? 'good' : stats.jugador2.eficaciaAtaque >= 10 ? 'average' : 'bad'}">${stats.jugador2.eficaciaAtaque}%</div>
                            <div class="report-stat-label">Eficacia Ataque ${partido.jugador2_nombre}</div>
                            <div class="report-stat-sublabel">${stats.jugador2.killsAtaque} kills · ${stats.jugador2.erroresAtaque} errores · ${stats.jugador2.totalAtaques} total</div>
                        </div>
                    </div>
                    <div class="chart-container">
                        <div class="chart-title">Distribución de Tipos de Ataque</div>
                        <div class="chart-wrapper">
                            <canvas id="chart-ataques"></canvas>
                        </div>
                    </div>
                </div>

                <!-- seccion 4: saques -->
                <div class="report-section">
                    <h2 class="report-section-title">🏐 Análisis de Saque</h2>
                    <div class="chart-container">
                        <div class="chart-title">Tipos de Saque Utilizados</div>
                        <div class="chart-wrapper">
                            <canvas id="chart-saques"></canvas>
                        </div>
                    </div>
                </div>

                <!-- seccion 5: recepcion -->
                <div class="report-section">
                    <h2 class="report-section-title">🤲 Análisis de Recepción</h2>
                    <div class="report-grid">
                        <div class="report-stat-card">
                            <div class="report-stat-value ${stats.jugador1.recepcionPromedio >= 2 ? 'good' : stats.jugador1.recepcionPromedio >= 1.5 ? 'average' : 'bad'}">${stats.jugador1.recepcionPromedio}</div>
                            <div class="report-stat-label">Recepción Media ${partido.jugador1_nombre}</div>
                            <div class="report-stat-sublabel">${stats.jugador1.totalRecepciones} recepciones</div>
                        </div>
                        <div class="report-stat-card">
                            <div class="report-stat-value ${stats.jugador2.recepcionPromedio >= 2 ? 'good' : stats.jugador2.recepcionPromedio >= 1.5 ? 'average' : 'bad'}">${stats.jugador2.recepcionPromedio}</div>
                            <div class="report-stat-label">Recepción Media ${partido.jugador2_nombre}</div>
                            <div class="report-stat-sublabel">${stats.jugador2.totalRecepciones} recepciones</div>
                        </div>
                    </div>
                </div>

                <!-- seccion 6: bloqueo -->
                <div class="report-section">
                    <h2 class="report-section-title">🧱 Bloqueo y Defensa</h2>
                    <div class="report-grid">
                        <div class="report-stat-card">
                            <div class="report-stat-value">${stats.jugador1.totalBloqueos}</div>
                            <div class="report-stat-label">Bloqueos ${partido.jugador1_nombre}</div>
                            <div class="report-stat-sublabel">${formatBloqueos(stats.jugador1.distribucionBloqueos)}</div>
                        </div>
                        <div class="report-stat-card">
                            <div class="report-stat-value">${stats.jugador2.totalBloqueos}</div>
                            <div class="report-stat-label">Bloqueos ${partido.jugador2_nombre}</div>
                            <div class="report-stat-sublabel">${formatBloqueos(stats.jugador2.distribucionBloqueos)}</div>
                        </div>
                    </div>
                </div>

                <!-- seccion 7: patrones y conclusiones -->
                <div class="report-section">
                    <h2 class="report-section-title">🧠 Patrones Detectados</h2>
                    ${patrones.length > 0 ? `
                        <ul class="patterns-list">
                            ${patrones.map(p => `
                                <li class="pattern-item">
                                    <span class="pattern-icon">${p.icon}</span>
                                    <span class="pattern-text">${p.text}</span>
                                </li>
                            `).join('')}
                        </ul>
                    ` : `
                        <p class="text-muted" style="padding: 16px;">No se han detectado patrones suficientes. Registra más acciones para obtener análisis automático.</p>
                    `}
                </div>

                <div class="report-section">
                    <h2 class="report-section-title">📝 Conclusiones del Scout</h2>
                    <div class="report-conclusions">
                        <p class="text-muted" style="font-size: 13px;">Añade tus observaciones y conclusiones sobre el partido:</p>
                        <textarea id="conclusiones-text" placeholder="Escribe aquí tus conclusiones...">${partido.notas || ''}</textarea>
                        <button class="btn btn-sm btn-primary mt-16" id="btn-guardar-notas">💾 Guardar Notas</button>
                    </div>
                </div>

                <!-- acciones -->
                <div class="report-actions">
                    <button class="btn btn-primary btn-lg" id="btn-exportar-pdf">📄 Exportar a PDF</button>
                    <button class="btn btn-secondary btn-lg" id="btn-volver-scouting">📋 Volver al Scouting</button>
                    <button class="btn btn-secondary btn-lg" id="btn-volver-dash">← Dashboard</button>
                </div>
            </div>
        `;

        // renderizamos los graficos
        setTimeout(() => renderCharts(stats, j1Nombre, j2Nombre), 100);

        // eventos
        document.getElementById('btn-guardar-notas').addEventListener('click', async () => {
            const notas = document.getElementById('conclusiones-text').value;
            await window.api.updatePartido(params.partidoId, { notas });
            showToast('Notas guardadas', 'success');
        });

        document.getElementById('btn-exportar-pdf').addEventListener('click', () => exportarPDF(container));

        document.getElementById('btn-volver-scouting').addEventListener('click', () => {
            router.navigate('scouting', { partidoId: params.partidoId });
        });

        document.getElementById('btn-volver-dash').addEventListener('click', () => {
            router.navigate('dashboard');
        });
    });
}

function getSoClass(pct) {
    if (pct >= 65) return 'good';
    if (pct >= 45) return 'average';
    return 'bad';
}

function formatBloqueos(dist) {
    return Object.entries(dist).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'Sin datos';
}

function renderCharts(stats, j1Nombre, j2Nombre) {
    // grafico de side-out comparativo
    const ctxSO = document.getElementById('chart-sideout');
    if (ctxSO) {
        chartInstances.push(new Chart(ctxSO, {
            type: 'bar',
            data: {
                labels: [j1Nombre, j2Nombre, 'General'],
                datasets: [{
                    label: 'Side-Out %',
                    data: [stats.jugador1.sideOutPct, stats.jugador2.sideOutPct, stats.general.sideOutGeneral],
                    backgroundColor: ['rgba(245, 158, 11, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(139, 92, 246, 0.7)'],
                    borderColor: ['#f59e0b', '#3b82f6', '#8b5cf6'],
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: getChartOptions('Porcentaje (%)', 100)
        }));
    }

    // golpes mas repetidos J1
    renderDoughnutChart('chart-golpes-j1', stats.jugador1.golpesMasRepetidos);
    renderDoughnutChart('chart-golpes-j2', stats.jugador2.golpesMasRepetidos);

    // distribucion de ataques (stacked bar)
    const ctxAtaques = document.getElementById('chart-ataques');
    if (ctxAtaques) {
        const allSubtipos = new Set();
        Object.keys(stats.jugador1.distribucionAtaques).forEach(s => allSubtipos.add(s));
        Object.keys(stats.jugador2.distribucionAtaques).forEach(s => allSubtipos.add(s));
        const labels = Array.from(allSubtipos);
        const colors = getChartColors(labels.length);

        chartInstances.push(new Chart(ctxAtaques, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: j1Nombre,
                        data: labels.map(l => stats.jugador1.distribucionAtaques[l]?.total || 0),
                        backgroundColor: 'rgba(245, 158, 11, 0.7)',
                        borderColor: '#f59e0b',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: j2Nombre,
                        data: labels.map(l => stats.jugador2.distribucionAtaques[l]?.total || 0),
                        backgroundColor: 'rgba(59, 130, 246, 0.7)',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: getChartOptions('Cantidad')
        }));
    }

    // saques
    const ctxSaques = document.getElementById('chart-saques');
    if (ctxSaques) {
        const allSaques = new Set();
        Object.keys(stats.jugador1.distribucionSaques).forEach(s => allSaques.add(s));
        Object.keys(stats.jugador2.distribucionSaques).forEach(s => allSaques.add(s));
        const labels = Array.from(allSaques);

        chartInstances.push(new Chart(ctxSaques, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: j1Nombre,
                        data: labels.map(l => stats.jugador1.distribucionSaques[l]?.total || 0),
                        backgroundColor: 'rgba(245, 158, 11, 0.7)',
                        borderColor: '#f59e0b',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: j2Nombre,
                        data: labels.map(l => stats.jugador2.distribucionSaques[l]?.total || 0),
                        backgroundColor: 'rgba(59, 130, 246, 0.7)',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: getChartOptions('Cantidad')
        }));
    }
}

function renderDoughnutChart(canvasId, golpesData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || golpesData.length === 0) return;

    const labels = golpesData.map(g => g[0]);
    const data = golpesData.map(g => g[1]);
    const colors = getChartColors(labels.length);
    const colorsAlpha = getChartColorsAlpha(labels.length, 0.8);

    chartInstances.push(new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colorsAlpha,
                borderColor: colors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#94a3b8',
                        font: { family: "'Inter', sans-serif", size: 11 },
                        padding: 12
                    }
                }
            }
        }
    }));
}

function getChartOptions(yLabel, maxY = null) {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#94a3b8',
                    font: { family: "'Inter', sans-serif", size: 12 }
                }
            }
        },
        scales: {
            x: {
                ticks: { color: '#64748b', font: { family: "'Inter', sans-serif", size: 11 } },
                grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y: {
                ticks: { color: '#64748b', font: { family: "'Inter', sans-serif", size: 11 } },
                grid: { color: 'rgba(255,255,255,0.05)' },
                title: { display: true, text: yLabel, color: '#64748b' }
            }
        }
    };
    if (maxY) options.scales.y.max = maxY;
    return options;
}

async function exportarPDF(container) {
    showToast('Generando PDF...', 'info');

    // cogemos el HTML del informe con estilos inline simplificados
    const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', sans-serif; background: #0a0e17; color: #f1f5f9; padding: 32px; }
                h1 { font-size: 22px; text-align: center; margin-bottom: 8px; }
                h2 { font-size: 16px; color: #f59e0b; margin: 24px 0 12px; border-bottom: 2px solid rgba(245,158,11,0.3); padding-bottom: 6px; }
                .meta { text-align: center; color: #94a3b8; font-size: 12px; margin-bottom: 24px; }
                .stat-row { display: flex; gap: 16px; margin-bottom: 16px; }
                .stat-box { flex: 1; background: #1a2332; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; text-align: center; }
                .stat-value { font-size: 28px; font-weight: 800; color: #f59e0b; }
                .stat-label { font-size: 12px; color: #94a3b8; margin-top: 4px; }
                .pattern { padding: 8px 12px; background: #111827; border-left: 3px solid #f59e0b; margin-bottom: 6px; border-radius: 4px; font-size: 12px; }
                .nota { background: #111827; padding: 12px; border-radius: 8px; font-size: 12px; color: #94a3b8; white-space: pre-wrap; }
            </style>
        </head>
        <body>
            <h1>📊 Informe de Scouting - BVScouter</h1>
            ${container.querySelector('.report-header .report-meta')?.outerHTML || ''}
            ${container.querySelector('.report-container')?.innerHTML || ''}
        </body>
        </html>
    `;

    try {
        const result = await window.api.generatePDF(reportHTML);
        if (result) {
            showToast('PDF guardado correctamente', 'success');
        }
    } catch (err) {
        showToast('Error al generar PDF', 'error');
        console.error(err);
    }
}
