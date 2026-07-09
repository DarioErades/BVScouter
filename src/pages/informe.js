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
        let currentSetFilter = 'all';

        const j1Nombre = `${partido.jugador1_nombre} ${partido.jugador1_apellidos}`;
        const j2Nombre = `${partido.jugador2_nombre} ${partido.jugador2_apellidos}`;

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

            const stats = calcularStats(accionesFiltradas, partido.jugador1_id, partido.jugador2_id);
            const patrones = detectarPatrones(accionesFiltradas, j1Nombre, j2Nombre, partido.jugador1_id, partido.jugador2_id);

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
                                    <div class="report-stat-value ${getSoClass(stats.jugador1.sideOutTransPct)}" style="font-size: 28px;">${stats.jugador1.sideOutTransPct}%</div>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div class="report-stat-label" style="font-size: 14px;">A la Primera</div>
                                        <div class="report-stat-sublabel">${stats.jugador1.fbsoPuntos} pts / ${stats.jugador1.totalK1} K1</div>
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
                                    <div class="report-stat-value ${getSoClass(stats.jugador2.sideOutTransPct)}" style="font-size: 28px;">${stats.jugador2.sideOutTransPct}%</div>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div class="report-stat-label" style="font-size: 14px;">A la Primera</div>
                                        <div class="report-stat-sublabel">${stats.jugador2.fbsoPuntos} pts / ${stats.jugador2.totalK1} K1</div>
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
                            
                            <div class="tab-golpes-content" id="golpes-k1" style="display: none;" data-label="Top Golpes - K1">
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

                            <div class="tab-golpes-content" id="golpes-k2" style="display: none;" data-label="Top Golpes - K2">
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
                            <div class="tab-ataque-content" id="ataque-k1" style="display: none;" data-label="Distribución Ataques - K1">
                                <div class="chart-title">${j1Nombre}</div>
                                <div class="chart-wrapper" style="margin-bottom: 20px;"><canvas id="chart-ataques-k1-j1"></canvas></div>
                                <div class="chart-title">${j2Nombre}</div>
                                <div class="chart-wrapper"><canvas id="chart-ataques-k1-j2"></canvas></div>
                            </div>
                            <div class="tab-ataque-content" id="ataque-k2" style="display: none;" data-label="Distribución Ataques - K2">
                                <div class="chart-title">${j1Nombre}</div>
                                <div class="chart-wrapper" style="margin-bottom: 20px;"><canvas id="chart-ataques-k2-j1"></canvas></div>
                                <div class="chart-title">${j2Nombre}</div>
                                <div class="chart-wrapper"><canvas id="chart-ataques-k2-j2"></canvas></div>
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
                            <div class="chart-wrapper tab-saque-content" id="saque-j2" style="display: none;" data-label="${j2Nombre}">
                                <canvas id="chart-saques-j2"></canvas>
                            </div>
                            <div class="chart-wrapper tab-saque-content" id="saque-ambos" style="display: none;" data-label="Ambos Jugadores">
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

                    <div class="report-section" id="section-highlights" ${partido.video_tipo === 'local' ? '' : 'style="display:none;"'}>
                        <h2 class="report-section-title">🎬 Generador de Highlights</h2>
                        <div class="report-grid" style="background: #1a2332; padding: 20px; border-radius: 12px; border: 1px solid #1e293b;">
                            <div style="flex: 1; min-width: 200px;">
                                <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">Jugador</label>
                                <select id="hl-jugador" class="form-input">
                                    <option value="">Ambos Jugadores</option>
                                    <option value="${partido.jugador1_id}">${partido.jugador1_nombre}</option>
                                    <option value="${partido.jugador2_id}">${partido.jugador2_nombre}</option>
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
                            <div style="display: flex; align-items: flex-end; padding-top: 10px;">
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

            document.getElementById('btn-exportar-pdf').addEventListener('click', () => exportarPDF(container));

            document.getElementById('btn-volver-scouting').addEventListener('click', () => {
                router.navigate('scouting', { partidoId: params.partidoId });
            });

            document.getElementById('btn-volver-dash').addEventListener('click', () => {
                router.navigate('dashboard');
            });

            // evento generar highlights
            const btnHighlights = document.getElementById('btn-generar-highlights');
            if (btnHighlights) {
                btnHighlights.addEventListener('click', async () => {
                    const filters = {};
                    const jug = document.getElementById('hl-jugador').value;
                    const acc = document.getElementById('hl-accion').value;
                    const res = document.getElementById('hl-resultado').value;
                    
                    if (jug) filters.jugador_id = parseInt(jug);
                    if (acc) filters.tipo_accion = acc;
                    if (res) filters.resultado = res;

                    btnHighlights.disabled = true;
                    btnHighlights.textContent = '⏳ Generando (puede tardar)...';
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

async function exportarPDF(container) {
    showToast('Preparando PDF...', 'info');

    // convertir los canvas a imagenes para el PDF
    const canvases = container.querySelectorAll('canvas');
    const placeholders = [];

    canvases.forEach(c => {
        const img = document.createElement('img');
        img.src = c.toDataURL('image/png');
        img.className = 'pdf-chart-img';
        img.style.width = '100%';
        img.style.maxWidth = '500px';
        img.style.margin = '0 auto';
        img.style.display = 'block';
        c.parentNode.insertBefore(img, c);
        c.style.display = 'none';
        placeholders.push({ img, canvas: c });
    });

    const bodyHtml = container.querySelector('.report-container')?.innerHTML || '';

    // restaurar los canvas
    placeholders.forEach(p => {
        p.img.remove();
        p.canvas.style.display = '';
    });

    // cogemos el HTML del informe con estilos para el PDF
    const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Informe BVScouter</title>
            <style>
                @page { margin: 0; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0e17; color: #f1f5f9; padding: 0; width: 100%; margin: 0; }
                h1 { font-size: 26px; text-align: center; margin-bottom: 8px; color: #f1f5f9; padding-top: 20px; }
                h2.report-section-title { font-size: 18px; color: #f59e0b; margin: 20px 20px 10px; border-bottom: 2px solid rgba(245,158,11,0.3); padding-bottom: 8px; }
                .report-meta { text-align: center; color: #94a3b8; font-size: 14px; margin-bottom: 20px; }
                .report-section { page-break-inside: avoid; break-inside: avoid; margin-bottom: 20px; padding: 0 20px; }
                .report-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
                .report-stat-card { flex: 1; min-width: 200px; background: #1a2332; border: 1px solid #1e293b; border-radius: 12px; padding: 15px; text-align: center; break-inside: avoid; page-break-inside: avoid; }
                .report-stat-value { font-size: 32px; font-weight: 800; margin-bottom: 4px; }
                .report-stat-value.good { color: #10b981; }
                .report-stat-value.average { color: #f59e0b; }
                .report-stat-value.bad { color: #ef4444; }
                .report-stat-label { font-size: 14px; color: #e2e8f0; font-weight: 600; margin-bottom: 4px; }
                .report-stat-sublabel { font-size: 12px; color: #94a3b8; }
                .chart-container { background: #1a2332; border: 1px solid #1e293b; border-radius: 12px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; break-inside: avoid; }
                .chart-title { font-size: 14px; color: #94a3b8; text-align: center; margin-bottom: 10px; font-weight: 600; }
                .chart-wrapper { text-align: center; break-inside: avoid; page-break-inside: avoid; }
                .pdf-chart-img { max-width: 100%; height: auto; }
                .patterns-list { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .pattern-item { background: #111827; border: 1px solid rgba(245, 158, 11, 0.2); border-left: 4px solid #f59e0b; padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 10px; break-inside: avoid; page-break-inside: avoid; }
                .pattern-icon { font-size: 20px; }
                .pattern-text { font-size: 14px; color: #e2e8f0; }
                
                /* Ocultar elementos interactivos que no tienen sentido en PDF */
                button, .btn, select, label { display: none !important; }
                .report-conclusions textarea { display: none !important; }
                .report-conclusions p { display: none !important; }
                .report-actions { display: none !important; }
                
                /* Mostrar todas las graficas ocultas en las pestañas y ponerles titulo */
                .tab-ataque-content, .tab-saque-content, .tab-golpes-content { display: block !important; margin-bottom: 25px; }
                .tab-ataque-content::before, .tab-saque-content::before, .tab-golpes-content::before {
                    content: attr(data-label);
                    display: block;
                    font-size: 16px;
                    color: #f59e0b;
                    margin-bottom: 12px;
                    font-weight: 600;
                    text-align: center;
                }
                
                #section-patrones, #section-highlights { display: none !important; }
                
                .report-conclusions::after {
                    content: "${(document.getElementById('conclusiones-text')?.value || '').replace(/\n/g, '\\n')}";
                    display: block;
                    background: #111827;
                    border: 1px solid #1e293b;
                    padding: 15px;
                    border-radius: 8px;
                    color: #e2e8f0;
                    font-size: 14px;
                    white-space: pre-wrap;
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
            </style>
        </head>
        <body>
            <h1>📊 Informe de Scouting - BVScouter</h1>
            ${container.querySelector('.report-header .report-meta')?.outerHTML || ''}
            ${bodyHtml}
        </body>
        </html>
    `;

    try {
        const contentHeight = container.querySelector('.report-container')?.scrollHeight || 3000;
        const result = await window.api.generatePDF(reportHTML, contentHeight);
        if (result) {
            showToast('PDF guardado correctamente', 'success');
        }
    } catch (err) {
        showToast('Error al generar PDF', 'error');
        console.error(err);
    }
}
