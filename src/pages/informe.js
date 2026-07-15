// pagina del informe con graficos

import { router } from '../router.js';
import { showToast, formatDate, getChartColors, getChartColorsAlpha } from '../utils/helpers.js';
import { calcularStats, detectarPatrones } from '../utils/stats-calculator.js';
import { generateCustomPdfHtml } from '../utils/pdf-generator.js';

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
        let currentSetFilter = 'all';

        const j1Nombre = partido.jugador1_nombre;
        const j2Nombre = partido.jugador2_nombre;

        let resultadoCalculado = partido.resultado || '0-0';
        if (acciones.length > 0) {
            const sets = [...new Set(acciones.map(a => a.set_numero))].sort();
            let setsLocal = 0;
            let setsRival = 0;
            const scores = [];

            sets.forEach(s => {
                const accionesSet = acciones.filter(a => a.set_numero === s);
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

            if (sets.length === 1) {
                resultadoCalculado = scores[0];
            } else {
                resultadoCalculado = `${setsLocal}-${setsRival} (${scores.join(' ')})`;
            }
        }

        const renderReportData = () => {
            chartInstances.forEach(c => c.destroy());
            chartInstances = [];

            const setsDisponibles = [...new Set(acciones.map(a => a.set_numero))].sort();
            const accionesFiltradas = currentSetFilter === 'all' 
                ? acciones 
                : acciones.filter(a => a.set_numero === parseInt(currentSetFilter));

            const stats = calcularStats(accionesFiltradas, partido.jugador1_nombre, partido.jugador2_nombre);
            const patrones = detectarPatrones(accionesFiltradas, partido.jugador1_nombre, partido.jugador2_nombre);

            container.innerHTML = `
                <div class="report-container page-enter">
                    <!-- cabecera del informe -->
                    <div class="report-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h1 class="report-title">📊 Informe de Scouting</h1>
                            <div class="report-meta">
                                <p><strong>${j1Nombre}</strong> / <strong>${j2Nombre}</strong></p>
                                <p>${partido.torneo || 'Sin torneo'} · ${partido.fase || '-'} · ${formatDate(partido.fecha)}</p>
                                <p>Resultado: <strong class="text-accent">${resultadoCalculado}</strong> · ${accionesFiltradas.length} acciones analizadas</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <label style="color: var(--text-secondary); margin-bottom: 4px; display: block; font-size: 13px;">Filtrar por Set:</label>
                            <select id="select-set-filter" class="form-input" style="width: auto; display: inline-block;">
                                <option value="all" ${currentSetFilter === 'all' ? 'selected' : ''}>Todos los Sets</option>
                                ${setsDisponibles.map(s => `<option value="${s}" ${currentSetFilter == s ? 'selected' : ''}>Set ${s}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- seccion 0: rendimiento general -->
                    <div class="report-section">
                        <h2 class="report-section-title">🏆 Rendimiento General</h2>
                        <div class="report-grid" style="grid-template-columns: repeat(5, 1fr); margin-bottom: 24px;">
                            <div class="report-stat-card">
                                <div class="report-stat-value" style="color: var(--accent-success)">${stats.jugador1.puntosDirectos - stats.jugador1.erroresPropios > 0 ? '+' : ''}${stats.jugador1.puntosDirectos - stats.jugador1.erroresPropios}</div>
                                <div class="report-stat-label">G-P ${partido.jugador1_nombre}</div>
                                <div class="report-stat-sublabel">${stats.jugador1.puntosDirectos} puntos · ${stats.jugador1.erroresPropios} errores</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value" style="color: var(--accent-success)">${stats.jugador2.puntosDirectos - stats.jugador2.erroresPropios > 0 ? '+' : ''}${stats.jugador2.puntosDirectos - stats.jugador2.erroresPropios}</div>
                                <div class="report-stat-label">G-P ${partido.jugador2_nombre}</div>
                                <div class="report-stat-sublabel">${stats.jugador2.puntosDirectos} puntos · ${stats.jugador2.erroresPropios} errores</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value">${stats.general.puntosTotalesEquipo}</div>
                                <div class="report-stat-label">Puntos Totales Ganados</div>
                                <div class="report-stat-sublabel">Marcador de equipo</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value text-accent">${stats.general.erroresRival}</div>
                                <div class="report-stat-label">Errores del Rival</div>
                                <div class="report-stat-sublabel">Puntos regalados</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value" style="color: var(--accent-primary)">${stats.jugador1.puntosDirectos + stats.jugador2.puntosDirectos}</div>
                                <div class="report-stat-label">Puntos por Aciertos</div>
                                <div class="report-stat-sublabel">Kills, aces, bloqueos</div>
                            </div>
                        </div>
                    </div>

                    <!-- seccion progresion de puntos -->
                    <div class="report-section" id="section-progresion">
                        <h2 class="report-section-title">📈 Progresión de Puntos</h2>
                        ${renderProgresionPuntos(accionesFiltradas)}
                    </div>

                    <!-- seccion 1: side-out -->
                    <div class="report-section">
                        <h2 class="report-section-title">⭐ Porcentaje de Side-Out</h2>
                        <div class="report-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 24px;">
                            <div class="report-stat-card">
                                <h3 style="margin-bottom: 16px; color: var(--text-primary); font-size: 18px;">${partido.jugador1_nombre}</h3>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
                                    <div>
                                        <div class="report-stat-label" style="font-size: 14px;">General</div>
                                        <div class="report-stat-sublabel">${stats.jugador1.puntosK1} pts / ${stats.jugador1.totalK1} K1</div>
                                    </div>
                                    <div class="report-stat-value ${getSoClass(stats.jugador1.totalK1 > 0 ? Math.round((stats.jugador1.puntosK1 / stats.jugador1.totalK1) * 100) : 0)}" style="font-size: 28px;">${stats.jugador1.totalK1 > 0 ? Math.round((stats.jugador1.puntosK1 / stats.jugador1.totalK1) * 100) : 0}%</div>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div class="report-stat-label" style="font-size: 14px;">A la Primera</div>
                                        <div class="report-stat-sublabel">${stats.jugador1.fbsoPuntos} pts / ${stats.jugador1.fbsoOportunidades} K1</div>
                                    </div>
                                    <div class="report-stat-value ${getSoClass(stats.jugador1.sideOutFirstPct)}" style="font-size: 28px;">${stats.jugador1.sideOutFirstPct}%</div>
                                </div>
                            </div>
                            <div class="report-stat-card">
                                <h3 style="margin-bottom: 16px; color: var(--text-primary); font-size: 18px;">${partido.jugador2_nombre}</h3>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
                                    <div>
                                        <div class="report-stat-label" style="font-size: 14px;">General</div>
                                        <div class="report-stat-sublabel">${stats.jugador2.puntosK1} pts / ${stats.jugador2.totalK1} K1</div>
                                    </div>
                                    <div class="report-stat-value ${getSoClass(stats.jugador2.totalK1 > 0 ? Math.round((stats.jugador2.puntosK1 / stats.jugador2.totalK1) * 100) : 0)}" style="font-size: 28px;">${stats.jugador2.totalK1 > 0 ? Math.round((stats.jugador2.puntosK1 / stats.jugador2.totalK1) * 100) : 0}%</div>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div class="report-stat-label" style="font-size: 14px;">A la Primera</div>
                                        <div class="report-stat-sublabel">${stats.jugador2.fbsoPuntos} pts / ${stats.jugador2.fbsoOportunidades} K1</div>
                                    </div>
                                    <div class="report-stat-value ${getSoClass(stats.jugador2.sideOutFirstPct)}" style="font-size: 28px;">${stats.jugador2.sideOutFirstPct}%</div>
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
                                        <div class="chart-title">${partido.jugador1_nombre}</div>
                                        <div class="chart-wrapper"><canvas id="chart-golpes-general-j1"></canvas></div>
                                    </div>
                                    <div style="flex: 1; text-align: center; min-width: 250px;">
                                        <div class="chart-title">${partido.jugador2_nombre}</div>
                                        <div class="chart-wrapper"><canvas id="chart-golpes-general-j2"></canvas></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="tab-golpes-content tab-hidden-initially" id="golpes-k1" data-label="Top Golpes - K1">
                                <div class="report-grid">
                                    <div style="flex: 1; text-align: center; min-width: 250px;">
                                        <div class="chart-title">${partido.jugador1_nombre}</div>
                                        <div class="chart-wrapper"><canvas id="chart-golpes-k1-j1"></canvas></div>
                                    </div>
                                    <div style="flex: 1; text-align: center; min-width: 250px;">
                                        <div class="chart-title">${partido.jugador2_nombre}</div>
                                        <div class="chart-wrapper"><canvas id="chart-golpes-k1-j2"></canvas></div>
                                    </div>
                                </div>
                            </div>

                            <div class="tab-golpes-content tab-hidden-initially" id="golpes-k2" data-label="Top Golpes - K2">
                                <div class="report-grid">
                                    <div style="flex: 1; text-align: center; min-width: 250px;">
                                        <div class="chart-title">${partido.jugador1_nombre}</div>
                                        <div class="chart-wrapper"><canvas id="chart-golpes-k2-j1"></canvas></div>
                                    </div>
                                    <div style="flex: 1; text-align: center; min-width: 250px;">
                                        <div class="chart-title">${partido.jugador2_nombre}</div>
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
                            <div class="chart-title" style="display: flex; justify-content: space-between; align-items: center;">
                                <span>Distribución de Tipos de Ataque</span>
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn btn-sm btn-primary tab-ataque-btn" data-target="ataque-general">General</button>
                                    <button class="btn btn-sm btn-secondary tab-ataque-btn" data-target="ataque-k1">K1</button>
                                    <button class="btn btn-sm btn-secondary tab-ataque-btn" data-target="ataque-k2">K2</button>
                                </div>
                            </div>
                            <div class="tab-ataque-content" id="ataque-general" data-label="Distribución Ataques - General">
                                <div class="chart-title">${j1Nombre}</div>
                                <div class="chart-wrapper" style="margin-bottom: 20px;"><canvas id="chart-ataques-general-j1"></canvas></div>
                                <div class="chart-title">${j2Nombre}</div>
                                <div class="chart-wrapper"><canvas id="chart-ataques-general-j2"></canvas></div>
                            </div>
                            <div class="tab-ataque-content tab-hidden-initially" id="ataque-k1" data-label="Distribución Ataques - K1">
                                <div class="chart-title">${j1Nombre}</div>
                                <div class="chart-wrapper" style="margin-bottom: 20px;"><canvas id="chart-ataques-k1-j1"></canvas></div>
                                <div class="chart-title">${j2Nombre}</div>
                                <div class="chart-wrapper"><canvas id="chart-ataques-k1-j2"></canvas></div>
                            </div>
                            <div class="tab-ataque-content tab-hidden-initially" id="ataque-k2" data-label="Distribución Ataques - K2">
                                <div class="chart-title">${j1Nombre}</div>
                                <div class="chart-wrapper" style="margin-bottom: 20px;"><canvas id="chart-ataques-k2-j1"></canvas></div>
                                <div class="chart-title">${j2Nombre}</div>
                                <div class="chart-wrapper"><canvas id="chart-ataques-k2-j2"></canvas></div>
                            </div>
                        </div>
                        <div class="report-grid mt-16" style="margin-top: 24px;">
                            <div class="chart-container">
                                <div class="chart-title">Heatmap de Ataque - ${j1Nombre}</div>
                                <div class="heatmap-wrapper" style="display: flex; justify-content: center; align-items: center; padding: 20px;">
                                    ${renderHeatmap(stats.jugador1.distribucionAtaquesGeneral)}
                                </div>
                            </div>
                            <div class="chart-container">
                                <div class="chart-title">Heatmap de Ataque - ${j2Nombre}</div>
                                <div class="heatmap-wrapper" style="display: flex; justify-content: center; align-items: center; padding: 20px;">
                                    ${renderHeatmap(stats.jugador2.distribucionAtaquesGeneral)}
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
                                    <button class="btn btn-sm btn-primary tab-saque-btn" data-target="saque-j1">${j1Nombre}</button>
                                    <button class="btn btn-sm btn-secondary tab-saque-btn" data-target="saque-j2">${j2Nombre}</button>
                                    <button class="btn btn-sm btn-secondary tab-saque-btn" data-target="saque-ambos">Ambos</button>
                                </div>
                            </div>
                            <div class="chart-wrapper tab-saque-content" id="saque-j1" data-label="${j1Nombre}">
                                <canvas id="chart-saques-j1"></canvas>
                            </div>
                            <div class="chart-wrapper tab-saque-content tab-hidden-initially" id="saque-j2" data-label="${j2Nombre}">
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
                                <div class="report-stat-value ${stats.jugador1.recepcionPromedio >= 6 ? 'good' : stats.jugador1.recepcionPromedio >= 4 ? 'average' : 'bad'}">${stats.jugador1.recepcionPromedio}</div>
                                <div class="report-stat-label">Recepción Media ${partido.jugador1_nombre}</div>
                                <div class="report-stat-sublabel" style="line-height: 1.4;">${stats.jugador1.totalRecepciones} recepciones<br><span style="font-size: 11px;">${formatRecepciones(stats.jugador1.distribucionRecepcion)}</span></div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value ${stats.jugador2.recepcionPromedio >= 6 ? 'good' : stats.jugador2.recepcionPromedio >= 4 ? 'average' : 'bad'}">${stats.jugador2.recepcionPromedio}</div>
                                <div class="report-stat-label">Recepción Media ${partido.jugador2_nombre}</div>
                                <div class="report-stat-sublabel" style="line-height: 1.4;">${stats.jugador2.totalRecepciones} recepciones<br><span style="font-size: 11px;">${formatRecepciones(stats.jugador2.distribucionRecepcion)}</span></div>
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
                            <div class="report-stat-card">
                                <div class="report-stat-value ${stats.jugador1.defensaPromedio >= 5 ? 'good' : 'average'}">${stats.jugador1.defensaPromedio}</div>
                                <div class="report-stat-label">Defensa Media ${partido.jugador1_nombre}</div>
                                <div class="report-stat-sublabel">${stats.jugador1.erroresDefensa} errores de defensa</div>
                            </div>
                            <div class="report-stat-card">
                                <div class="report-stat-value ${stats.jugador2.defensaPromedio >= 5 ? 'good' : 'average'}">${stats.jugador2.defensaPromedio}</div>
                                <div class="report-stat-label">Defensa Media ${partido.jugador2_nombre}</div>
                                <div class="report-stat-sublabel">${stats.jugador2.erroresDefensa} errores de defensa</div>
                            </div>
                        </div>
                    </div>

                    <!-- seccion 7: patrones y conclusiones -->
                    <div class="report-section" id="section-patrones">
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

                    <div class="report-section" id="section-highlights" ${(partido.video_tipo === 'local' || partido.video_tipo === 'youtube') ? '' : 'style="display:none;"'}>
                        <h2 class="report-section-title">🎬 Generador de Vídeos</h2>
                        <div class="report-grid" style="background: #1a2332; padding: 20px; border-radius: 12px; border: 1px solid #1e293b;">
                            <div style="flex: 1; min-width: 200px;">
                                <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">Jugador</label>
                                <select id="hl-jugador" class="form-input">
                                    <option value="">Ambos Jugadores</option>
                                    <option value="${partido.jugador1_nombre}">${partido.jugador1_nombre}</option>
                                    <option value="${partido.jugador2_nombre}">${partido.jugador2_nombre}</option>
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
            `;

            // renderizamos los graficos
            setTimeout(() => renderCharts(stats, j1Nombre, j2Nombre), 100);

            // eventos
            document.getElementById('select-set-filter').addEventListener('change', (e) => {
                // guardamos las notas antes de recargar
                partido.notas = document.getElementById('conclusiones-text').value;
                currentSetFilter = e.target.value;
                renderReportData();
            });

            document.getElementById('btn-guardar-notas').addEventListener('click', async () => {
                const notas = document.getElementById('conclusiones-text').value;
                partido.notas = notas; // por si cambiamos de set
                await window.api.updatePartido(params.partidoId, { notas });
                showToast('Notas guardadas', 'success');
            });

            document.getElementById('btn-exportar-pdf').addEventListener('click', async () => {
                showToast('Generando PDF rediseñado...', 'info');
                const reportHTML = generateCustomPdfHtml(partido, stats, j1Nombre, j2Nombre, accionesFiltradas);
                try {
                    const result = await window.api.generatePDF(reportHTML, 2500);
                    if (result) showToast('PDF guardado correctamente', 'success');
                } catch (err) {
                    showToast('Error al generar PDF', 'error');
                    console.error(err);
                }
            });

            document.getElementById('btn-volver-scouting').addEventListener('click', () => {
                router.navigate('scouting', { partidoId: params.partidoId });
            });

            document.getElementById('btn-volver-dash').addEventListener('click', () => {
                router.navigate('dashboard');
            });

            // evento generar highlights
            const btnHighlights = document.getElementById('btn-generar-highlights');
            if (btnHighlights) {
                // IPC Progress listener
                if (window.api && window.api.onVideoProgress) {
                    window.api.onVideoProgress((pct) => {
                        const bar = document.getElementById('hl-progress-bar');
                        const txt = document.getElementById('hl-progress-text');
                        if (bar && txt) {
                            bar.style.width = pct + '%';
                            txt.textContent = pct + '%';
                        }
                    });
                }

                btnHighlights.addEventListener('click', async () => {
                    const filters = {};
                    const jug = document.getElementById('hl-jugador').value;
                    const comp = document.getElementById('hl-complejo').value;
                    const acc = document.getElementById('hl-accion').value;
                    const res = document.getElementById('hl-resultado').value;
                    const mPre = document.getElementById('hl-margin-pre').value;
                    const mPost = document.getElementById('hl-margin-post').value;
                    
                    const setNum = document.getElementById('hl-set')?.value;
                    const mostrarAcciones = document.getElementById('hl-mostrar-acciones')?.checked;
                    const conMarcador = document.getElementById('hl-con-marcador')?.checked !== false; // por defecto true

                    if (jug) filters.jugador_nombre = jug;
                    if (comp) filters.complejo = comp;
                    if (acc) filters.tipo_accion = acc;
                    if (res) filters.resultado = res;
                    if (setNum) filters.set_numero = parseInt(setNum, 10);
                    if (mostrarAcciones) filters.mostrar_acciones = true;
                    filters.con_marcador = conMarcador;
                    filters.pre_margin = mPre ? parseFloat(mPre) : 3;
                    filters.post_margin = mPost ? parseFloat(mPost) : 1;

                    btnHighlights.disabled = true;
                    btnHighlights.textContent = '⏳ Generando (puede tardar)...';
                    
                    const progContainer = document.getElementById('hl-progress-container');
                    const progBar = document.getElementById('hl-progress-bar');
                    const progText = document.getElementById('hl-progress-text');
                    if (progContainer) progContainer.style.display = 'block';
                    if (progBar) progBar.style.width = '0%';
                    if (progText) progText.textContent = '0%';

                    try {
                        const path = await window.api.generateVideoHighlights(params.partidoId, filters);
                        if (path) {
                            showToast('Vídeo generado con éxito', 'success');
                        }
                    } catch (err) {
                        showToast(err.message || 'Error al generar vídeo', 'error');
                    } finally {
                        btnHighlights.disabled = false;
                        btnHighlights.textContent = '✂️ Generar Vídeo';
                        if (progContainer) progContainer.style.display = 'none';
                    }
                });
            }

            // eventos para pestañas de golpes
            document.querySelectorAll('.tab-golpes-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetId = e.target.dataset.target;
                    
                    document.querySelectorAll('.tab-golpes-btn').forEach(b => {
                        b.classList.remove('btn-primary');
                        b.classList.add('btn-secondary');
                    });
                    e.target.classList.remove('btn-secondary');
                    e.target.classList.add('btn-primary');

                    document.querySelectorAll('.tab-golpes-content').forEach(content => {
                        content.style.display = 'none';
                    });
                    document.getElementById(targetId).style.display = 'block';
                });
            });

            // eventos para pestañas de ataques
            document.querySelectorAll('.tab-ataque-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetId = e.target.dataset.target;
                    
                    document.querySelectorAll('.tab-ataque-btn').forEach(b => {
                        b.classList.remove('btn-primary');
                        b.classList.add('btn-secondary');
                    });
                    e.target.classList.remove('btn-secondary');
                    e.target.classList.add('btn-primary');

                    document.querySelectorAll('.tab-ataque-content').forEach(content => {
                        content.style.display = 'none';
                    });
                    document.getElementById(targetId).style.display = 'block';
                });
            });

            document.querySelectorAll('.tab-saque-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.tab-saque-btn').forEach(b => {
                        b.classList.remove('btn-primary');
                        b.classList.add('btn-secondary');
                    });
                    e.target.classList.remove('btn-secondary');
                    e.target.classList.add('btn-primary');

                    document.querySelectorAll('.tab-saque-content').forEach(c => c.style.display = 'none');
                    document.getElementById(e.target.dataset.target).style.display = 'block';
                });
            });
        };

        renderReportData();
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

function formatRecepciones(dist) {
    if (!dist) return 'Sin datos';
    // limpiamos el string para que se vea más corto, por ejemplo "Recepción (3)" -> "(3)"
    return Object.entries(dist).map(([k, v]) => `${k.replace('Recepción ', '')}: ${v}`).join(' · ') || 'Sin datos';
}

function renderProgresionPuntos(acciones) {
    const sets = [...new Set(acciones.map(a => a.set_numero))].sort();
    if (sets.length === 0) return '<p style="color: #64748b; padding: 16px;">Sin datos de puntos.</p>';

    return sets.map(s => {
        const accionesSet = acciones.filter(a => a.set_numero === s && a.tipo_accion !== 'fin_set');
        let nosScore = 0;
        let rivScore = 0;
        const puntos = []; // { pos, nos, riv, team }

        accionesSet.forEach(a => {
            if (a.resultado === 'punto') {
                nosScore++;
                puntos.push({ pos: puntos.length, nos: nosScore, riv: rivScore, team: 'nos' });
            } else if (a.resultado === 'error' || a.resultado === 'bloqueado') {
                rivScore++;
                puntos.push({ pos: puntos.length, nos: nosScore, riv: rivScore, team: 'riv' });
            }
        });

        if (puntos.length === 0) return '';

        // generar las dos filas
        const nosBoxes = puntos.map(p => {
            if (p.team === 'nos') {
                return `<span style="display:inline-block; width:26px; height:26px; line-height:26px; text-align:center; background:#10b981; color:#fff; border-radius:4px; font-size:11px; font-weight:700; margin:1px;">${p.nos}</span>`;
            }
            return `<span style="display:inline-block; width:26px; height:26px; margin:1px;"></span>`;
        }).join('');

        const rivBoxes = puntos.map(p => {
            if (p.team === 'riv') {
                return `<span style="display:inline-block; width:26px; height:26px; line-height:26px; text-align:center; background:#ef4444; color:#fff; border-radius:4px; font-size:11px; font-weight:700; margin:1px;">${p.riv}</span>`;
            }
            return `<span style="display:inline-block; width:26px; height:26px; margin:1px;"></span>`;
        }).join('');

        return `
            <div style="background: #1a2332; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                <div style="font-size: 14px; font-weight: 700; color: #f59e0b; margin-bottom: 12px;">Set ${s} — Final: ${nosScore}-${rivScore}</div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; overflow-x: auto;">
                    <span style="min-width: 36px; font-size: 11px; font-weight: 600; color: #10b981;">NOS</span>
                    <div style="display: flex; flex-wrap: nowrap;">${nosBoxes}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; overflow-x: auto;">
                    <span style="min-width: 36px; font-size: 11px; font-weight: 600; color: #ef4444;">RIV</span>
                    <div style="display: flex; flex-wrap: nowrap;">${rivBoxes}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderCharts(stats, j1Nombre, j2Nombre) {
    // grafico de side-out comparativo
    const ctxSO = document.getElementById('chart-sideout');
    if (ctxSO) {
        chartInstances.push(new Chart(ctxSO, {
            type: 'bar',
            data: {
                labels: [j1Nombre, j2Nombre, 'Equipo General'],
                datasets: [
                    {
                        label: 'Side-Out General %',
                        data: [
                            stats.jugador1.sideOutTransPct, 
                            stats.jugador2.sideOutTransPct, 
                            Math.round(((stats.jugador1.puntosK1 + stats.jugador2.puntosK1) / ((stats.jugador1.totalK1 + stats.jugador2.totalK1) || 1)) * 100)
                        ],
                        backgroundColor: 'rgba(59, 130, 246, 0.7)', // Azul
                        borderColor: '#3b82f6',
                        borderWidth: 2,
                        borderRadius: 4
                    },
                    {
                        label: 'Side-Out a la Primera %',
                        data: [
                            stats.jugador1.sideOutFirstPct, 
                            stats.jugador2.sideOutFirstPct, 
                            Math.round(((stats.jugador1.fbsoPuntos + stats.jugador2.fbsoPuntos) / ((stats.jugador1.totalK1 + stats.jugador2.totalK1) || 1)) * 100)
                        ],
                        backgroundColor: 'rgba(245, 158, 11, 0.7)', // Naranja
                        borderColor: '#f59e0b',
                        borderWidth: 2,
                        borderRadius: 4
                    }
                ]
            },
            options: getChartOptions('Porcentaje (%)', 100)
        }));
    }

    // Renderizamos Golpes más repetidos
    renderDoughnutChart('chart-golpes-general-j1', stats.jugador1.golpesMasRepetidosGeneral);
    renderDoughnutChart('chart-golpes-general-j2', stats.jugador2.golpesMasRepetidosGeneral);
    
    renderDoughnutChart('chart-golpes-k1-j1', stats.jugador1.golpesMasRepetidosK1);
    renderDoughnutChart('chart-golpes-k1-j2', stats.jugador2.golpesMasRepetidosK1);
    
    renderDoughnutChart('chart-golpes-k2-j1', stats.jugador1.golpesMasRepetidosK2);
    renderDoughnutChart('chart-golpes-k2-j2', stats.jugador2.golpesMasRepetidosK2);

    const optionsAtaques = getChartOptions('Cantidad');
    optionsAtaques.scales.x.stacked = true;
    optionsAtaques.scales.y.stacked = true;

    // Ataques - General J1
    const ctxAtaquesGeneralJ1 = document.getElementById('chart-ataques-general-j1');
    if (ctxAtaquesGeneralJ1) {
        chartInstances.push(new Chart(ctxAtaquesGeneralJ1, {
            type: 'bar',
            data: getAtaquesData(stats.jugador1.distribucionAtaquesGeneral),
            options: optionsAtaques
        }));
    }
    
    // Ataques - General J2
    const ctxAtaquesGeneralJ2 = document.getElementById('chart-ataques-general-j2');
    if (ctxAtaquesGeneralJ2) {
        chartInstances.push(new Chart(ctxAtaquesGeneralJ2, {
            type: 'bar',
            data: getAtaquesData(stats.jugador2.distribucionAtaquesGeneral),
            options: optionsAtaques
        }));
    }

    // Ataques - K1 J1
    const ctxAtaquesK1J1 = document.getElementById('chart-ataques-k1-j1');
    if (ctxAtaquesK1J1) {
        chartInstances.push(new Chart(ctxAtaquesK1J1, {
            type: 'bar',
            data: getAtaquesData(stats.jugador1.distribucionAtaquesK1),
            options: optionsAtaques
        }));
    }
    
    // Ataques - K1 J2
    const ctxAtaquesK1J2 = document.getElementById('chart-ataques-k1-j2');
    if (ctxAtaquesK1J2) {
        chartInstances.push(new Chart(ctxAtaquesK1J2, {
            type: 'bar',
            data: getAtaquesData(stats.jugador2.distribucionAtaquesK1),
            options: optionsAtaques
        }));
    }

    // Ataques - K2 J1
    const ctxAtaquesK2J1 = document.getElementById('chart-ataques-k2-j1');
    if (ctxAtaquesK2J1) {
        chartInstances.push(new Chart(ctxAtaquesK2J1, {
            type: 'bar',
            data: getAtaquesData(stats.jugador1.distribucionAtaquesK2),
            options: optionsAtaques
        }));
    }
    
    // Ataques - K2 J2
    const ctxAtaquesK2J2 = document.getElementById('chart-ataques-k2-j2');
    if (ctxAtaquesK2J2) {
        chartInstances.push(new Chart(ctxAtaquesK2J2, {
            type: 'bar',
            data: getAtaquesData(stats.jugador2.distribucionAtaquesK2),
            options: optionsAtaques
        }));
    }

    // saques separados por jugador
    const allSaques = new Set();
    Object.keys(stats.jugador1.distribucionSaques).forEach(s => allSaques.add(s));
    Object.keys(stats.jugador2.distribucionSaques).forEach(s => allSaques.add(s));
    const labelsSaques = Array.from(allSaques);

    const optionsSaques = getChartOptions('Cantidad');
    optionsSaques.scales.x.stacked = true;
    optionsSaques.scales.y.stacked = true;

    const ctxSaquesJ1 = document.getElementById('chart-saques-j1');
    if (ctxSaquesJ1) {
        chartInstances.push(new Chart(ctxSaquesJ1, {
            type: 'bar',
            data: {
                labels: labelsSaques,
                datasets: [
                    {
                        label: 'Puntos',
                        data: labelsSaques.map(l => stats.jugador1.distribucionSaques[l]?.puntos || 0),
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: '#10b981',
                        borderWidth: 1
                    },
                    {
                        label: 'Continuidad',
                        data: labelsSaques.map(l => {
                            const d = stats.jugador1.distribucionSaques[l];
                            return d ? d.total - d.puntos - d.errores : 0;
                        }),
                        backgroundColor: 'rgba(245, 158, 11, 0.8)',
                        borderColor: '#f59e0b',
                        borderWidth: 1
                    },
                    {
                        label: 'Errores',
                        data: labelsSaques.map(l => stats.jugador1.distribucionSaques[l]?.errores || 0),
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: '#ef4444',
                        borderWidth: 1
                    }
                ]
            },
            options: optionsSaques
        }));
    }

    const ctxSaquesJ2 = document.getElementById('chart-saques-j2');
    if (ctxSaquesJ2) {
        chartInstances.push(new Chart(ctxSaquesJ2, {
            type: 'bar',
            data: {
                labels: labelsSaques,
                datasets: [
                    {
                        label: 'Puntos',
                        data: labelsSaques.map(l => stats.jugador2.distribucionSaques[l]?.puntos || 0),
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: '#10b981',
                        borderWidth: 1
                    },
                    {
                        label: 'Continuidad',
                        data: labelsSaques.map(l => {
                            const d = stats.jugador2.distribucionSaques[l];
                            return d ? d.total - d.puntos - d.errores : 0;
                        }),
                        backgroundColor: 'rgba(59, 130, 246, 0.8)', // Azul
                        borderColor: '#3b82f6',
                        borderWidth: 1
                    },
                    {
                        label: 'Errores',
                        data: labelsSaques.map(l => stats.jugador2.distribucionSaques[l]?.errores || 0),
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: '#ef4444',
                        borderWidth: 1
                    }
                ]
            },
            options: optionsSaques
        }));
    }

    const ctxSaquesAmbos = document.getElementById('chart-saques-ambos');
    if (ctxSaquesAmbos) {
        chartInstances.push(new Chart(ctxSaquesAmbos, {
            type: 'bar',
            data: {
                labels: labelsSaques,
                datasets: [
                    {
                        label: 'Puntos',
                        data: labelsSaques.map(l => (stats.jugador1.distribucionSaques[l]?.puntos || 0) + (stats.jugador2.distribucionSaques[l]?.puntos || 0)),
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: '#10b981',
                        borderWidth: 1
                    },
                    {
                        label: 'Continuidad',
                        data: labelsSaques.map(l => {
                            const d1 = stats.jugador1.distribucionSaques[l];
                            const c1 = d1 ? d1.total - d1.puntos - d1.errores : 0;
                            const d2 = stats.jugador2.distribucionSaques[l];
                            const c2 = d2 ? d2.total - d2.puntos - d2.errores : 0;
                            return c1 + c2;
                        }),
                        backgroundColor: 'rgba(139, 92, 246, 0.8)', // Morado para combinados
                        borderColor: '#8b5cf6',
                        borderWidth: 1
                    },
                    {
                        label: 'Errores',
                        data: labelsSaques.map(l => (stats.jugador1.distribucionSaques[l]?.errores || 0) + (stats.jugador2.distribucionSaques[l]?.errores || 0)),
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: '#ef4444',
                        borderWidth: 1
                    }
                ]
            },
            options: optionsSaques
        }));
    }

    // Ocultar las pestañas inactivas reales después de crearlas off-screen
    const hiddens = document.querySelectorAll('.tab-hidden-initially');
    hiddens.forEach(el => {
        el.classList.remove('tab-hidden-initially');
        el.style.display = 'none';
    });
}

function renderHeatmap(distribucion) {
    let zLargaL = 0, zLargaD = 0, zLargaC = 0;
    let zCortaL = 0, zCortaD = 0, zCortaC = 0;
    
    let total = 0;
    Object.keys(distribucion).forEach(k => {
        const amt = distribucion[k].total;
        total += amt;
        const sub = k.toLowerCase();
        
        if (sub.includes('línea larga') || (sub.includes('línea') && !sub.includes('corta'))) zLargaL += amt;
        else if (sub.includes('línea corta')) zCortaL += amt;
        
        else if (sub.includes('diago larga') || (sub.includes('diagonal') && !sub.includes('corta'))) zLargaD += amt;
        else if (sub.includes('diago corta')) zCortaD += amt;
        
        else if (sub.includes('centro') || sub.includes('medio')) {
            // Repartir centro un poco
            zLargaC += Math.ceil(amt * 0.7);
            zCortaC += Math.floor(amt * 0.3);
        }
    });

    if (total === 0) return '<p class="text-muted">No hay datos de dirección de ataque</p>';

    const getIntensity = (val) => {
        if (val === 0) return 'rgba(30, 41, 59, 0.5)';
        const pct = val / total;
        // color gradient from blue to red based on percentage
        if (pct < 0.1) return 'rgba(59, 130, 246, 0.6)'; // blue
        if (pct < 0.25) return 'rgba(16, 185, 129, 0.7)'; // green
        if (pct < 0.4) return 'rgba(245, 158, 11, 0.8)'; // orange
        return 'rgba(239, 68, 68, 0.9)'; // red
    };

    return `
        <div style="width: 240px; height: 240px; border: 2px solid #fff; background: #eab308; position: relative; display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 2px; padding: 2px;">
            <!-- Red / Net indicator -->
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: rgba(255,255,255,0.8); z-index: 10;"></div>
            
            <!-- Fila Fondo (Larga) -->
            <div style="background: ${getIntensity(zLargaL)}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">
                <span style="font-size: 10px; opacity: 0.8;">Línea L</span>
                <span>${zLargaL > 0 ? Math.round((zLargaL/total)*100)+'%' : ''}</span>
            </div>
            <div style="background: ${getIntensity(zLargaC)}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">
                <span style="font-size: 10px; opacity: 0.8;">Fondo M</span>
                <span>${zLargaC > 0 ? Math.round((zLargaC/total)*100)+'%' : ''}</span>
            </div>
            <div style="background: ${getIntensity(zLargaD)}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">
                <span style="font-size: 10px; opacity: 0.8;">Diago L</span>
                <span>${zLargaD > 0 ? Math.round((zLargaD/total)*100)+'%' : ''}</span>
            </div>
            
            <!-- Fila Red (Corta) -->
            <div style="background: ${getIntensity(zCortaL)}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">
                <span style="font-size: 10px; opacity: 0.8;">Línea C</span>
                <span>${zCortaL > 0 ? Math.round((zCortaL/total)*100)+'%' : ''}</span>
            </div>
            <div style="background: ${getIntensity(zCortaC)}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">
                <span style="font-size: 10px; opacity: 0.8;">Corto M</span>
                <span>${zCortaC > 0 ? Math.round((zCortaC/total)*100)+'%' : ''}</span>
            </div>
            <div style="background: ${getIntensity(zCortaD)}; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">
                <span style="font-size: 10px; opacity: 0.8;">Diago C</span>
                <span>${zCortaD > 0 ? Math.round((zCortaD/total)*100)+'%' : ''}</span>
            </div>
        </div>
        <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 8px;">* Vista desde el lado del rival (abajo es la red)</div>
    `;
}

function renderDoughnutChart(canvasId, golpesData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !golpesData || golpesData.length === 0) return;

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

function getAtaquesData(distribucion) {
    const labels = Object.keys(distribucion);
    return {
        labels: labels,
        datasets: [
            {
                label: 'Puntos',
                data: labels.map(l => distribucion[l]?.puntos || 0),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: '#10b981',
                borderWidth: 1
            },
            {
                label: 'Continuidad',
                data: labels.map(l => {
                    const d = distribucion[l];
                    return d ? d.total - d.puntos - d.errores : 0;
                }),
                backgroundColor: 'rgba(245, 158, 11, 0.8)',
                borderColor: '#f59e0b',
                borderWidth: 1
            },
            {
                label: 'Errores',
                data: labels.map(l => distribucion[l]?.errores || 0),
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderColor: '#ef4444',
                borderWidth: 1
            }
        ]
    };
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

// Función exportarPDF eliminada, se usa pdf-generator.js

