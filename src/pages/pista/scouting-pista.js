import { router } from '../../router.js';
import { showToast, formatTimestamp, getYoutubeId } from '../../utils/helpers.js';
import { TIPOS_ACCION_PISTA, SUBTIPOS_PISTA, RESULTADOS_PISTA, RESULTADOS_POR_ACCION, SHORTCUTS_PISTA } from '../../utils/constants-pista.js';
import { actionForKey, keyFor, subtypeForKey } from '../../utils/keybindings.js';
import { calcularStatsPista } from '../../utils/stats-calculator-pista.js';
import { getPrefs } from '../../utils/theme.js';
import { applyScoreDelta } from '../../utils/scoring.js';

let scoutingState = null;
let keyHandler = null;
let speedHoldHandler = null;
let ytCurrentTime = 0;
let ytState = -1;
let ytMessageListener = null;
let ytPollInterval = null;
let whistleTimestamps = [];
let mouseWhistleHandler = null;

function setupYoutubeTracking() {
    ytCurrentTime = 0;
    ytState = -1;

    if (ytMessageListener) {
        window.removeEventListener('message', ytMessageListener);
    }
    if (ytPollInterval) {
        clearInterval(ytPollInterval);
    }

    ytMessageListener = (event) => {
        let data = event.data;
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                return;
            }
        }
        if (!data || typeof data !== 'object') return;

        if (data.info && typeof data.info.currentTime === 'number') {
            ytCurrentTime = data.info.currentTime;
        } else if (typeof data.currentTime === 'number') {
            ytCurrentTime = data.currentTime;
        }

        if (data.info && typeof data.info.playerState === 'number') {
            ytState = data.info.playerState;
        }
    };

    window.addEventListener('message', ytMessageListener);

    ytPollInterval = setInterval(() => {
        const iframe = document.getElementById('yt-iframe-player');
        if (iframe && iframe.contentWindow) {
            try {
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }), '*');
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
            } catch (e) {
                // ignore
            }
        }
    }, 250);
}

// La rotación R es la posición del colocador (R6 = colocador en P6...). Al rotar el
// equipo pasa de P6 a P5, P4... P1 y vuelve a P6. El lineup guardado es la colocación
// con el colocador en P1 (R1); al fijar titulares se "deshace" la rotación r.
const rotarAdelante = (r) => (r === 1 ? 6 : r - 1);
const rotarAtras = (r) => (r === 6 ? 1 : r + 1);
const giros = (r) => (7 - r) % 6;
const slotEnPosicion = (posNum, r) => ((posNum - 1 + giros(r)) % 6) + 1;

function lineupEnBaseR1(lineupReal, r) {
    const base = {};
    for (const [pos, dorsal] of Object.entries(lineupReal)) {
        base[slotEnPosicion(Number(pos), r)] = dorsal;
    }
    return base;
}

async function guardarLineupBase(lineup) {
    if (!scoutingState.rotacionesIniciales) scoutingState.rotacionesIniciales = {};
    scoutingState.rotacionesIniciales[scoutingState.setActual] = lineup;
    await window.apiPista.updatePartidoPista(scoutingState.partidoId, {
        rotaciones_iniciales: JSON.stringify(scoutingState.rotacionesIniciales)
    });
}

// R = posición actual del colocador en pista; si no hay uno solo, se usa el estado.
function getRotacionEfectiva() {
    const lineup = scoutingState.rotacionesIniciales?.[scoutingState.setActual] || {};
    const colocadores = Object.values(lineup).filter(d => {
        const p = scoutingState.roster.find(r => Number(r.dorsal) === Number(d));
        return p?.posicion && p.posicion.trim().toLowerCase() === 'colocador';
    });
    if (colocadores.length !== 1) return scoutingState.rotacionActual;
    return getCurrentPositionForDorsal(colocadores[0]) ?? scoutingState.rotacionActual;
}

// Marcador de sets según los sets finalizados (acción fin_set con el ganador).
function getMarcadorSets() {
    let local = 0;
    let rival = 0;
    (scoutingState.acciones || []).forEach(a => {
        if (a.tipo_accion !== 'fin_set') return;
        if (a.resultado === 'local') local++;
        else if (a.resultado === 'rival') rival++;
    });
    return { local, rival };
}

// El saque lo hace siempre el jugador de la posición 1: se marca solo si no hay nadie elegido.
function autoSeleccionarSacador() {
    if (scoutingState.tipoAccion !== 'saque' || scoutingState.dorsalSeleccionado) return;
    if (!scoutingState.partido?.llevar_rotaciones) return;
    const lineup = scoutingState.rotacionesIniciales?.[scoutingState.setActual] || {};
    const dorsal = Number(lineup[slotEnPosicion(1, scoutingState.rotacionActual)]);
    if (Number.isFinite(dorsal)) scoutingState.dorsalSeleccionado = dorsal;
}

function isRotationPending() {
    if (!scoutingState || !scoutingState.partido || !scoutingState.partido.llevar_rotaciones) return false;
    const setLineup = scoutingState.rotacionesIniciales?.[scoutingState.setActual];
    return !setLineup || Object.keys(setLineup).length === 0;
}

export function registerScoutingPista() {
    router.register('scouting-pista', async (container, params) => {
        const partido = await window.apiPista.getPartidoPista(params.partidoId);
        if (!partido) {
            showToast('Partido no encontrado', 'error');
            router.navigate('dashboard-pista');
            return;
        }

        const roster = await window.apiPista.getRoster(params.partidoId);
        const acciones = await window.apiPista.getAccionesPista(params.partidoId);

        let rotIniciales = {};
        try {
            rotIniciales = JSON.parse(partido.rotaciones_iniciales || '{}');
        } catch (e) {
            rotIniciales = {};
        }

        // Estado inicial
        scoutingState = {
            partidoId: params.partidoId,
            partido,
            roster,
            acciones,
            rotacionesIniciales: rotIniciales,
            dorsalSeleccionado: null,
            tipoAccion: null,
            subtipo: null,
            rotacionActual: 1,
            equipoAlSaque: 'local',
            setActual: 1,
            marcadorLocal: 0,
            marcadorRival: 0,
            videoSpeed: getPrefs().videoDefaultSpeed || 1,
            dorsalInput: '',
            dorsalTimer: null,
            wizardModalAbierto: false,
            editingActionId: null
        };

        if (acciones.length > 0) {
            const ultima = acciones[acciones.length - 1];
            scoutingState.setActual = ultima.tipo_accion === 'fin_set' ? Number(ultima.set_numero) + 1 : Number(ultima.set_numero);
            // `rotacion` de una acción es la previa a ella: si ganó el saque, ya rotó después.
            const previa = acciones[acciones.length - 2];
            const rotoDespues = previa && previa.set_numero === ultima.set_numero
                && previa.equipo_al_saque === 'rival' && ultima.equipo_al_saque === 'local';
            const rotUltima = ultima.rotacion || 1;
            scoutingState.rotacionActual = ultima.tipo_accion === 'fin_set' ? 1 : (rotoDespues ? rotarAdelante(rotUltima) : rotUltima);
            scoutingState.equipoAlSaque = ultima.equipo_al_saque || 'local';
        }

        if (partido.resultado) {
            const parts = partido.resultado.split('-');
            if (parts.length === 2) {
                scoutingState.marcadorLocal = parseInt(parts[0]) || 0;
                scoutingState.marcadorRival = parseInt(parts[1]) || 0;
            }
        }

        container.style.padding = '16px';
        renderScoutingUI(container);
        setupVideoPlayer(container);
        setupKeyboardShortcuts(container);
        setupWhistleMouseNavigation();
        refreshTimelineAndStats();
        router.registerDestroy(() => {
            limpiarShortcuts();
            if (mouseWhistleHandler) document.removeEventListener('mousedown', mouseWhistleHandler);
            mouseWhistleHandler = null;
        });
    });
}

let whistleVideoPath = null;
let analizandoSilbatos = false;

async function cargarSilbatos() {
    whistleTimestamps = [];
    if (!whistleVideoPath) return;
    try { whistleTimestamps = await window.api.getWhistles(whistleVideoPath) || []; } catch { whistleTimestamps = []; }
}

// direccion: 1 = siguiente silbato, -1 = anterior. Siempre avisa si no puede moverse.
async function irASilbato(direccion) {
    const video = document.getElementById('local-video');
    if (!video) {
        showToast('Los silbatos solo funcionan con un vídeo local (o de YouTube descargado), no con el reproductor de YouTube', 'warning');
        return;
    }
    if (!whistleTimestamps.length) await cargarSilbatos();
    // Sin resultados guardados (p. ej. tras mejorar el detector): se analizan ahora.
    if (!whistleTimestamps.length && whistleVideoPath && !/^https?:/i.test(whistleVideoPath) && window.api?.analyzeWhistles && !analizandoSilbatos) {
        analizandoSilbatos = true;
        showToast('Analizando silbatos del vídeo, puede tardar un poco...', 'info');
        try {
            whistleTimestamps = await window.api.analyzeWhistles(whistleVideoPath) || [];
            showToast(`Análisis terminado: ${whistleTimestamps.length} silbatos`, 'success');
        } catch (error) {
            showToast(`No se pudieron analizar los silbatos: ${error.message || error}`, 'error');
            return;
        } finally {
            analizandoSilbatos = false;
        }
    } else if (analizandoSilbatos) {
        showToast('Todavía se están analizando los silbatos...', 'info');
        return;
    }
    if (!whistleTimestamps.length) {
        showToast('No hay silbatos analizados para este vídeo. Marca «Analizar silbatos» al crear el partido o descarga el vídeo de YouTube', 'warning');
        return;
    }
    const now = video.currentTime || 0;
    const target = direccion > 0
        ? whistleTimestamps.find(time => time > now + 0.08)
        : [...whistleTimestamps].reverse().find(time => time < now - 0.08);
    if (target === undefined) {
        showToast(direccion > 0 ? 'No hay más silbatos hacia delante' : 'No hay más silbatos hacia atrás', 'info');
        return;
    }
    video.currentTime = target;
    showToast(`Silbato: ${formatTimestamp(target)}`, 'info');
}

async function setupWhistleMouseNavigation(videoPath = scoutingState.partido.video_url) {
    whistleVideoPath = videoPath;
    await cargarSilbatos();
    if (mouseWhistleHandler) document.removeEventListener('mousedown', mouseWhistleHandler);
    mouseWhistleHandler = (event) => {
        if ((event.button !== 3 && event.button !== 4) || event.target.closest('input, textarea, select')) return;
        const mouseKey = event.button === 3 ? 'MouseBack' : 'MouseForward';
        const previous = keyFor('pista', 'whistle-previous') === mouseKey;
        const next = keyFor('pista', 'whistle-next') === mouseKey;
        if (!previous && !next) return;
        event.preventDefault();
        irASilbato(next ? 1 : -1);
    };
    document.addEventListener('mousedown', mouseWhistleHandler);
}

function renderScoutingUI(container) {
    const { partido, roster } = scoutingState;
    const hasVideo = partido.video_tipo && partido.video_url;

    container.innerHTML = `
        <div class="scouting-layout ${!hasVideo ? 'no-video' : ''} ${partido.video_tipo === 'youtube' ? 'youtube-choice-active' : ''}">
            <div class="scouting-header">
                <div class="match-info">
                    <div>
                        <div class="match-info-label">Torneo</div>
                        <div class="match-info-value">${partido.torneo || 'Sin torneo'}</div>
                    </div>
                    <div>
                        <div class="match-info-label">Partido</div>
                        <div class="match-info-value">${partido.equipo_nombre || 'Local'} vs ${partido.rival_nombre || 'Rival'}</div>
                    </div>
                    <div>
                        <div class="match-info-label">Rotación</div>
                        <div class="match-info-value" style="display: flex; gap: 8px; align-items: center; cursor: pointer;" id="box-rotacion" title="Haz clic para cambiar rotación inicial o actual">
                            <span id="label-rotacion" style="color: var(--accent-primary); font-weight: bold; font-size: 16px;">R${getRotacionEfectiva()}</span>
                            <button class="btn btn-sm btn-secondary" id="btn-rotar" title="Avanzar Rotación (+1)">↻</button>
                        </div>
                    </div>
                </div>
                <div class="flex gap-12 items-center">
                    <div class="scoreboard-controls">
                        <div class="scoreboard">
                            <div class="server-indicator local ${scoutingState.equipoAlSaque === 'local' ? 'active' : ''}" id="server-local">🏐</div>
                            <span class="set-label" id="set-label">SET ${scoutingState.setActual}</span>
                            <span class="score" id="score-local" title="Click Izq: +1 | Click Der: -1">${scoutingState.marcadorLocal}</span>
                            <span class="score-separator">-</span>
                            <span class="score" id="score-rival" title="Click Izq: +1 | Click Der: -1">${scoutingState.marcadorRival}</span>
                            <span id="sets-score" title="Sets ganados (local - rival)" style="font-weight:700; font-size:18px; color:var(--text-secondary); margin-left:6px;">(${getMarcadorSets().local}-${getMarcadorSets().rival})</span>
                            <div class="server-indicator rival ${scoutingState.equipoAlSaque === 'rival' ? 'active' : ''}" id="server-rival">🏐</div>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-primary" id="btn-finalizar-set" title="Finalizar set actual y pasar al siguiente">🏁 Set</button>
                    <button class="btn btn-sm btn-secondary" id="btn-ver-informe" title="Ver informe estadístico DataVolley">📊 Informe</button>
                    <button class="btn btn-sm btn-secondary" id="btn-notas-partido" title="Ver/Editar notas del partido">📝 Notas</button>
                    <button class="btn btn-sm btn-secondary" id="btn-ajustes-partido" title="Ajustes del partido">⚙️ Ajustes</button>
                    <button class="btn btn-sm btn-secondary" id="btn-generador-videos" title="Generar vídeo resúmenes">🎬 Vídeo</button>
                    <button class="btn btn-sm btn-secondary" id="btn-guardar-partido" title="Guardar partido">💾 Guardar</button>
                    <button class="btn btn-sm btn-secondary" id="btn-volver">← Volver</button>
                </div>
            </div>

            <div class="scouting-left-column" id="scouting-left-column">
                <div class="video-container" id="video-container" style="flex: 1 1 auto; min-height: 120px;">
                    ${renderVideoPlayer()}
                </div>

                <div class="resize-handle resize-handle-h" id="resize-handle-video" title="Arrastra para redimensionar"></div>

                <!-- Timeline -->
                <div class="timeline-container" id="timeline-container" style="flex: 0 0 auto; min-height: 60px; height: 150px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div class="timeline-title" style="margin-bottom: 0;">Historial</div>
                    </div>
                    <div class="timeline-items" id="timeline-items"></div>
                </div>

                <div class="resize-handle resize-handle-h" id="resize-handle-timeline" title="Arrastra para redimensionar"></div>

                <!-- Estadísticas Vivo -->
                <div class="live-stats" id="live-stats" style="flex: 0 0 auto; min-height: 60px; height: 180px;">
                    <div style="overflow-x:auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Nº</th>
                                    <th>Nombre</th>
                                    <th title="Saques (Total/Errores/Puntos)">SAQ(T/E/P)</th>
                                    <th title="Recepción (Total/Errores/Positivas%/Errores%)">REC(T/E/P%/E%)</th>
                                    <th title="Ataque (Total/Errores/Bloqueados/Puntos/Puntos%)">ATQ(T/E/B/P/P%)</th>
                                    <th title="Bloqueos Punto">BLQ(P)</th>
                                    <th title="Ganados - Perdidos">G-P</th>
                                </tr>
                            </thead>
                            <tbody id="live-stats-tbody"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="action-panel">
                <div class="action-panel-title">Panel de Registro</div>

                <!-- Campo Virtual (Rotación y Posiciones) -->
                ${scoutingState.partido.llevar_rotaciones ? renderVisualCourtWidget() : ''}

                <!-- Banner Rotación Pendiente -->
                <div id="rotation-pending-banner" style="display: none; background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%); border: 2px dashed #facc15; border-radius: 12px; padding: 24px 20px; text-align: center; margin-top: 12px; box-shadow: 0 10px 25px -5px rgba(234, 179, 8, 0.15);">
                    <div style="font-size: 42px; margin-bottom: 12px;">⏳</div>
                    <h3 style="color: #ffffff; font-size: 18px; font-weight: 800; margin-bottom: 8px;">Set <span id="pending-set-num">${scoutingState.setActual}</span> No Iniciado</h3>
                    <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
                        Reproduce el vídeo para ver la disposición inicial de tu equipo en pista. Una vez identifiques a los titulares y su posición, configura la rotación para iniciar el scouting.
                    </p>
                    <button class="btn btn-primary" id="btn-iniciar-rotacion-banner" style="padding: 12px 24px; font-size: 14px; font-weight: bold; background: linear-gradient(135deg, #facc15 0%, #eab308 100%); color: #000000; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(234, 179, 8, 0.4); cursor: pointer; width: 100%;">
                        ⚙️ Configurar Rotación Set <span id="pending-btn-set-num">${scoutingState.setActual}</span>
                    </button>
                </div>

                <div id="stats-controls-container">
                    <!-- Dorsales Grid -->
                    <div>
                        <div class="form-label" style="display:flex; justify-content:space-between">
                            <span>Jugador (Teclea el número)</span>
                        </div>
                        <div class="dorsal-grid" id="dorsal-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 8px; margin-bottom: 12px;">
                            ${renderDorsalesGrid()}
                        </div>
                    </div>

                    <!-- Tipo Acción -->
                    <div>
                        <div class="form-label">Tipo de Acción</div>
                        <div class="action-buttons" id="action-buttons">
                            ${Object.entries(TIPOS_ACCION_PISTA).filter(([key]) => !['cambio', 'tiempo_muerto'].includes(key)).map(([key, config]) => `
                                <button class="action-btn ${scoutingState.tipoAccion === key ? 'selected' : ''}" data-action="${key}">
                                    ${config.icon} ${config.label}
                                    ${config.key ? `<span class="shortcut-hint">${config.key.toUpperCase()}</span>` : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Subtipo (dinámico) -->
                    <div id="subtipo-container" style="margin-top: 12px; display: ${scoutingState.tipoAccion && SUBTIPOS_PISTA[scoutingState.tipoAccion] ? 'block' : 'none'}">
                        <div class="form-label">Subtipo</div>
                        <div class="subtype-buttons" id="subtype-buttons">
                            ${renderSubtipos()}
                        </div>
                    </div>

                    <!-- Resultados -->
                    <div id="resultados-container" style="margin-top: 12px; display: ${scoutingState.tipoAccion ? 'block' : 'none'}">
                        <div class="form-label">Resultado (Guarda la acción)</div>
                        <div class="action-buttons" id="resultado-buttons">
                            ${renderResultados()}
                        </div>
                    </div>

                    <div class="current-action" id="current-action">
                        <div class="current-action-label">Acción en Curso</div>
                        <div class="current-action-value" id="current-action-text">Selecciona Dorsal...</div>
                    </div>
                </div>

                <button class="btn btn-sm btn-secondary" id="btn-undo" style="width: 100%; margin-top: 8px;">
                    ↩️ Deshacer Última (Z)
                </button>
            </div>
        </div>

        ${renderModals()}
    `;

    setupActionPanelEvents(container);
    setupModalsEvents();
    setupResizeHandles();
}

function renderVisualCourtWidget() {
    return `
        <div id="visual-court-widget" style="margin-bottom: 16px; background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border); border-radius: 12px; padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                <span class="form-label" style="margin-bottom:0; display:flex; align-items:center; gap:8px; font-size:14px;">
                    🏐 Campo Virtual - Set <span style="color:white; font-weight:bold;" id="court-set-label">${scoutingState.setActual}</span> 
                    <span style="background: var(--accent-primary); color: #000; padding: 2px 8px; border-radius: 12px; font-weight: 800; font-size: 13px;" id="court-rot-label">R${getRotacionEfectiva()}</span>
                </span>
                <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                    <button class="btn btn-sm btn-secondary" id="btn-cambio-jugador" title="Registrar un cambio / sustitución" style="padding: 4px 8px; font-size: 11px; background: #334155; color: white;">🔄 Cambio</button>
                    <button class="btn btn-sm btn-secondary" id="btn-edit-lineup-set" title="Configurar titulares de este set" style="padding: 4px 8px; font-size: 11px;">⚙️ Titulares</button>
                    <button class="btn btn-sm btn-secondary" id="btn-rotar-prev" title="Rotar atrás (-1)" style="padding: 4px 8px; font-size: 11px;">↺ -1</button>
                    <button class="btn btn-sm btn-secondary" id="btn-rotar-next" title="Rotar adelante (+1)" style="padding: 4px 8px; font-size: 11px;">↻ +1</button>
                </div>
            </div>
            <div class="volleyball-court-visual" style="background: linear-gradient(180deg, #1e3a8a 0%, #172554 100%); border: 3px solid #3b82f6; border-radius: 12px; padding: 16px 12px; position: relative; box-shadow: inset 0 0 25px rgba(0,0,0,0.5); min-height: 220px; display: flex; flex-direction: column; justify-content: space-around;">
                <!-- Red en la parte superior -->
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 6px; background: repeating-linear-gradient(90deg, #ffffff, #ffffff 12px, #ef4444 12px, #ef4444 24px); border-radius: 9px 9px 0 0; opacity: 0.9;" title="Red"></div>
                <div style="position: absolute; top: 8px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: bold; color: rgba(255,255,255,0.4); letter-spacing: 2px;">RED</div>
                
                <!-- Línea de 3 metros -->
                <div style="position: absolute; top: 48%; left: 0; right: 0; border-top: 2px dashed rgba(255, 255, 255, 0.35); pointer-events: none;"></div>
                <span style="position: absolute; top: 48%; right: 8px; font-size: 10px; color: rgba(255,255,255,0.4); transform: translateY(-120%); pointer-events: none; font-weight: 600;">Línea 3m</span>

                <!-- Fila Delantera: P4, P3, P2 -->
                <div style="display: flex; justify-content: space-around; align-items: center; z-index: 2; margin-top: 16px;" id="court-row-front">
                    ${renderCourtPlayerCircle(4)}
                    ${renderCourtPlayerCircle(3)}
                    ${renderCourtPlayerCircle(2)}
                </div>

                <!-- Fila Trasera: P5, P6, P1 -->
                <div style="display: flex; justify-content: space-around; align-items: center; z-index: 2; margin-bottom: 6px;" id="court-row-back">
                    ${renderCourtPlayerCircle(5)}
                    ${renderCourtPlayerCircle(6)}
                    ${renderCourtPlayerCircle(1)}
                </div>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 8px;">
                💡 Haz clic en cualquier jugador de la cancha para seleccionarlo. Rotación automática al ganar punto al resto (Side-Out).
            </div>
        </div>
    `;
}

function renderCourtPlayerCircle(posNum) {
    const setLineup = scoutingState.rotacionesIniciales?.[scoutingState.setActual] || {};
    const initialPos = slotEnPosicion(posNum, scoutingState.rotacionActual);
    const dorsal = setLineup[initialPos];
    const jugador = dorsal !== undefined ? scoutingState.roster.find(j => j.dorsal == dorsal) : null;
    const isSelected = scoutingState.dorsalSeleccionado == dorsal && dorsal !== undefined;

    return `
        <div class="court-player-circle ${isSelected ? 'selected' : ''}" data-dorsal="${dorsal !== undefined ? dorsal : ''}" title="${jugador ? `#${dorsal} - ${jugador.nombre || ''} ${jugador.apellidos || ''} (${jugador.posicion || ''})` : 'Titular sin fijar'}" style="width: 52px; height: 52px; border-radius: 50%; background: ${isSelected ? 'var(--accent-primary)' : 'rgba(15, 23, 42, 0.95)'}; border: 2px solid ${isSelected ? '#ffffff' : (posNum === 1 ? '#60a5fa' : '#475569')}; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; position: relative; box-shadow: 0 3px 8px rgba(0,0,0,0.5); transform: ${isSelected ? 'scale(1.08)' : 'scale(1)'};">
            <span style="position: absolute; top: -7px; left: 50%; transform: translateX(-50%); background: #0f172a; border: 1px solid ${posNum === 1 ? '#3b82f6' : '#334155'}; font-size: 9px; padding: 0px 5px; border-radius: 8px; font-weight: bold; color: ${posNum === 1 ? '#60a5fa' : '#cbd5e1'}; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.4);">
                P${posNum}${posNum === 1 && scoutingState.equipoAlSaque === 'local' ? ' 🏐' : ''}
            </span>
            <span style="font-size: 15px; font-weight: 900; color: #ffffff; line-height: 1; margin-top: 4px;">
                ${dorsal !== undefined ? `#${dorsal}` : '—'}
            </span>
            <span style="font-size: 9px; color: ${isSelected ? '#ffffff' : '#94a3b8'}; max-width: 48px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; font-weight: 500;">
                ${jugador ? (jugador.apellidos || jugador.nombre || 'D' + dorsal) : 'Fijar'}
            </span>
        </div>
    `;
}

function getCurrentPositionForDorsal(dorsal, rotacion = scoutingState.rotacionActual) {
    const setLineup = scoutingState.rotacionesIniciales?.[scoutingState.setActual] || {};
    const dorsalNumber = Number(dorsal);
    if (!Number.isFinite(dorsalNumber)) return null;

    for (let posNum = 1; posNum <= 6; posNum++) {
        const initialPos = slotEnPosicion(posNum, rotacion);
        if (Number(setLineup[initialPos]) === dorsalNumber) return posNum;
    }
    return null;
}

function attachCourtPlayerEvents() {
    document.querySelectorAll('.court-player-circle').forEach(el => {
        el.addEventListener('click', () => {
            const dorsalStr = el.dataset.dorsal;
            if (dorsalStr !== '' && dorsalStr !== undefined) {
                const dorsal = parseInt(dorsalStr, 10);
                scoutingState.dorsalSeleccionado = dorsal;
                updateUI();
            } else {
                openLineupSetModal();
            }
        });
    });
}

async function createOrGetPlayerByDorsal(dorsal) {
    let player = scoutingState.roster.find(p => p.dorsal === dorsal);
    if (player) return player;

    let jugadorPistaId = null;
    if (scoutingState.partido.equipo_id) {
        const equipoJugadores = await window.apiPista.getJugadoresByEquipo(scoutingState.partido.equipo_id);
        const enEquipo = equipoJugadores.find(j => j.dorsal === dorsal);
        if (enEquipo) {
            jugadorPistaId = enEquipo.id;
        } else {
            const res = await window.apiPista.createJugadorPista({
                equipo_id: scoutingState.partido.equipo_id,
                dorsal: dorsal,
                nombre: 'Jugador',
                apellidos: `#${dorsal}`,
                posicion: '',
                es_libero: 0
            });
            if (res && res.lastInsertRowid) jugadorPistaId = res.lastInsertRowid;
        }
    }

    await window.apiPista.addRosterJugador({
        partido_id: scoutingState.partidoId,
        dorsal: dorsal,
        nombre: 'Jugador',
        apellidos: `#${dorsal}`,
        posicion: '',
        es_libero: 0,
        jugador_pista_id: jugadorPistaId
    });

    scoutingState.roster = await window.apiPista.getRoster(scoutingState.partidoId);
    const dorsalGrid = document.getElementById('dorsal-grid');
    if (dorsalGrid) dorsalGrid.innerHTML = renderDorsalesGrid();
    return scoutingState.roster.find(p => p.dorsal === dorsal);
}

function openLineupSetModal() {
    const modal = document.getElementById('modal-lineup-set');
    if (!modal) return;
    document.getElementById('lineup-modal-title').textContent = `🏐 Titulares y Rotación - Set ${scoutingState.setActual}`;
    
    const optionsHtml = scoutingState.roster.map(j => `<option value="${j.dorsal}">#${j.dorsal} - ${j.nombre || ''} ${j.apellidos || ''} (${j.posicion || 'Jug.'})</option>`).join('');
    const datalist = document.getElementById('roster-dorsals-list');
    if (datalist) datalist.innerHTML = optionsHtml;
    
    const currentLineup = scoutingState.rotacionesIniciales?.[scoutingState.setActual] || {};
    document.querySelectorAll('.lineup-input').forEach(inp => {
        const pos = inp.dataset.pos;
        if (currentLineup[pos] !== undefined) {
            inp.value = currentLineup[pos];
        } else {
            inp.value = "";
        }
    });

    modal.style.display = 'flex';
    scoutingState.wizardModalAbierto = true;
}

const sinTildes = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Acepta un dorsal ("12", "#12 - Ana") o parte del nombre/apellidos. Devuelve null si no hay
// una única coincidencia.
function resolverDorsalEntrada(texto) {
    const t = String(texto || '').trim();
    const numero = /^#?\s*(\d+)\b/.exec(t);
    if (numero) return parseInt(numero[1], 10);
    const buscado = sinTildes(t);
    if (!buscado) return null;
    const coincidencias = scoutingState.roster.filter(j => sinTildes(`${j.nombre || ''} ${j.apellidos || ''}`).includes(buscado));
    if (coincidencias.length === 1) return Number(coincidencias[0].dorsal);
    if (coincidencias.length > 1) showToast('Varios jugadores coinciden, sé más específico o usa el dorsal', 'warning');
    else showToast(`No se encuentra a "${t}" en la plantilla`, 'warning');
    return undefined;
}

function openCambioModal() {
    const modal = document.getElementById('modal-cambio-jugador');
    if (!modal) return;

    const currentLineup = scoutingState.rotacionesIniciales?.[scoutingState.setActual] || {};
    const saleSelect = document.getElementById('cambio-sale');
    const banquilloList = document.getElementById('banquillo-dorsals-list');
    const entraInput = document.getElementById('cambio-entra');
    if (entraInput) entraInput.value = '';

    if (saleSelect) {
        saleSelect.innerHTML = [1,2,3,4,5,6].map(posNum => {
            const initialPos = slotEnPosicion(posNum, scoutingState.rotacionActual);
            const dorsal = currentLineup[initialPos];
            const jug = dorsal !== undefined ? scoutingState.roster.find(j => j.dorsal == dorsal) : null;
            return `<option value="${initialPos}" data-dorsal="${dorsal !== undefined ? dorsal : ''}">P${posNum} - #${dorsal !== undefined ? dorsal : '?'} ${jug ? (jug.nombre || '') + ' ' + (jug.apellidos || '') : ''}</option>`;
        }).join('');
    }

    if (banquilloList) {
        const dorsalesEnPista = Object.values(currentLineup);
        const banquillo = scoutingState.roster.filter(j => !dorsalesEnPista.includes(j.dorsal));
        banquilloList.innerHTML = banquillo.map(j => `<option value="#${j.dorsal} - ${`${j.nombre || ''} ${j.apellidos || ''}`.trim()}">${j.posicion || 'Jug.'}</option>`).join('');
    }

    modal.style.display = 'flex';
    scoutingState.wizardModalAbierto = true;
}

function isPlayerLibero(j) {
    if (!j || !j.posicion) return false;
    const pos = j.posicion.trim().toLowerCase();
    return pos === 'líbero' || pos === 'libero' || pos === 'l';
}

function getDorsalesEnCampo() {
    const setLineup = scoutingState?.rotacionesIniciales?.[scoutingState?.setActual] || {};
    return Object.values(setLineup).map(d => parseInt(d, 10)).filter(d => !isNaN(d));
}

function getLiberosRoster() {
    return scoutingState.roster.filter(j => isPlayerLibero(j));
}

function renderDorsalesGrid() {
    const enCampo = getDorsalesEnCampo();
    const liberos = getLiberosRoster();

    const jugadoresCampo = enCampo.length > 0
        ? scoutingState.roster.filter(j => enCampo.includes(j.dorsal) && !isPlayerLibero(j))
        : scoutingState.roster.filter(j => !isPlayerLibero(j));

    const jugadoresLiberos = liberos.filter(j => !jugadoresCampo.some(c => c.dorsal === j.dorsal));

    let html = '';

    if (jugadoresCampo.length > 0) {
        html += jugadoresCampo.map(j => `
            <button class="dorsal-btn ${scoutingState.dorsalSeleccionado === j.dorsal ? 'active' : ''}" data-dorsal="${j.dorsal}" style="padding:8px; border-radius:6px; background:#1e293b; border:1px solid #334155; color:white; cursor:pointer; display:flex; flex-direction:column; align-items:center; transition:0.2s;">
                <span style="font-size:1.2rem; font-weight:bold; color:var(--accent);">${j.dorsal}</span>
                <span style="font-size:0.7rem; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center;">${j.apellidos || j.nombre}</span>
            </button>
        `).join('');
    } else {
        html += '<p style="color:var(--text-muted); font-size:12px; grid-column: 1 / -1;">Configura los titulares de este set...</p>';
    }

    if (jugadoresLiberos.length > 0) {
        html += jugadoresLiberos.map(j => `
            <button class="dorsal-btn dorsal-libero ${scoutingState.dorsalSeleccionado === j.dorsal ? 'active' : ''}" data-dorsal="${j.dorsal}" style="padding:8px; border-radius:6px; background:#78350f; border:2px solid #f59e0b; color:white; cursor:pointer; display:flex; flex-direction:column; align-items:center; transition:0.2s;">
                <span style="font-size:1.2rem; font-weight:bold; color:#fef08a;">${j.dorsal}</span>
                <span style="font-size:0.7rem; color:#fde68a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center;">${j.apellidos || j.nombre} (L)</span>
            </button>
        `).join('');
    }

    return html;
}

function renderSubtipos() {
    if (!scoutingState.tipoAccion || !SUBTIPOS_PISTA[scoutingState.tipoAccion]) return '';
    return SUBTIPOS_PISTA[scoutingState.tipoAccion].map(sub => `
        <button class="subtype-btn ${scoutingState.subtipo === sub.label ? 'selected' : ''}" data-sub="${sub.label}">
            ${sub.label}
            ${sub.key ? `<span class="shortcut-hint">${sub.key}</span>` : ''}
        </button>
    `).join('');
}

function renderResultados() {
    if (!scoutingState.tipoAccion) return '';
    const permitidos = RESULTADOS_POR_ACCION[scoutingState.tipoAccion] || [];
    return permitidos.map(res => {
        const conf = RESULTADOS_PISTA[res];
        if(!conf) return '';
        let label = conf.label;
        if ((scoutingState.tipoAccion === 'recepcion' || scoutingState.tipoAccion === 'defensa') && res === '#') {
            label = 'Doble Positiva';
        }
        if ((scoutingState.tipoAccion === 'recepcion' || scoutingState.tipoAccion === 'defensa') && res === '/') {
            label = 'Balón regalado';
        }
        return `
        <button class="res-btn ${conf.class}" data-res="${res}" style="flex:1; padding:10px; font-weight:bold; border:1px solid #334155; border-radius:6px; background:#0f172a; color:white; cursor:pointer;">
            ${conf.icon} ${label}
            ${conf.shortcut ? `<span class="shortcut-hint" style="display:block; font-size:10px; font-weight:normal; margin-top:4px;">${conf.shortcut}</span>` : ''}
        </button>
        `;
    }).join('');
}

function renderModals() {
    return `
        <!-- Modal Edición Acción -->
        <div class="attack-modal" id="edit-action-modal" style="display: none;">
            <div class="notes-modal-content" style="max-width: 400px;">
                <div class="notes-header"><h3>✏️ Editar Acción</h3><button id="btn-close-edit" class="btn btn-sm btn-secondary">✖</button></div>
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                    <label>Dorsal</label><input type="number" id="edit-dorsal" class="form-input">
                    <label>Tipo de Acción</label>
                    <select id="edit-tipo" class="form-input">
                        ${Object.keys(TIPOS_ACCION_PISTA).filter(k => k !== 'cambio').map(k => `<option value="${k}">${TIPOS_ACCION_PISTA[k].label}</option>`).join('')}
                    </select>
                    <label>Tiempo de vídeo (segundos)</label>
                    <input type="number" id="edit-tiempo" class="form-input" min="0" step="0.01" placeholder="0.00">
                    <label>Resultado</label>
                    <select id="edit-resultado" class="form-input">
                        ${Object.keys(RESULTADOS_PISTA).map(k => `<option value="${k}">${RESULTADOS_PISTA[k].label}</option>`).join('')}
                    </select>
                </div>
                <div class="notes-footer"><button id="btn-save-edit" class="btn btn-primary">💾 Guardar</button></div>
            </div>
        </div>

        <!-- Modal Seleccionar Rotación -->
        <div class="attack-modal floating-modal" id="rotacion-modal" style="display: none;">
            <div class="notes-modal-content" style="max-width: 380px; text-align: center;">
                <div class="notes-header">
                    <h3>🔄 Rotación del Equipo</h3>
                    <button id="btn-close-rotacion" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <p id="rotacion-modal-subtitle" style="font-size: 13px; color: var(--text-muted); margin: 12px 16px;">Selecciona en qué rotación (1 a 6) se encuentra tu equipo en la cancha:</p>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 16px;">
                    ${[1,2,3,4,5,6].map(r => `
                        <button class="btn btn-secondary btn-select-rotacion" data-rot="${r}" style="padding: 18px; font-size: 20px; font-weight: 800; background: #1e293b; border: 2px solid #334155; color: white; border-radius: 8px; cursor: pointer; transition: 0.2s;">
                            R${r}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Modal Notas del Partido -->
        <div class="attack-modal" id="notes-modal" style="display: none;">
            <div class="notes-modal-content" style="max-width: 500px;">
                <div class="notes-header">
                    <h3>📝 Notas del Partido</h3>
                    <button id="btn-close-notes" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px;">
                    <textarea id="partido-notas-text" class="form-input" rows="6" placeholder="Escribe aquí observaciones estratégicas, incidencias del partido..." style="width: 100%; background: #0f172a; color: white; border: 1px solid #334155; padding: 12px; border-radius: 6px; font-family: sans-serif; font-size: 14px; resize: vertical;">${scoutingState.partido.notas || ''}</textarea>
                </div>
                <div class="notes-footer">
                    <button id="btn-save-notes" class="btn btn-primary" style="width: 100%;">💾 Guardar Notas</button>
                </div>
            </div>
        </div>

        <!-- Modal Rotación Inicial del Set -->
        <div class="attack-modal floating-modal" id="modal-lineup-set" style="display: none;">
            <div class="notes-modal-content" style="max-width: 480px;">
                <div class="notes-header">
                    <h3 id="lineup-modal-title">🏐 Titulares y Rotación - Set 1</h3>
                    <button id="btn-close-lineup" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px;">
                    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                        Escribe o selecciona el dorsal en cada una de las 6 posiciones para este set. Si escribes un dorsal nuevo, se creará automáticamente como jugador.
                    </p>
                    <datalist id="roster-dorsals-list"></datalist>
                    <div style="background: #0f172a; border: 2px solid #334155; border-radius: 10px; padding: 14px; position: relative;">
                        <!-- Red -->
                        <div style="text-align: center; background: #ef4444; color: white; font-weight: bold; font-size: 11px; padding: 2px; border-radius: 4px; margin-bottom: 12px;">RED</div>
                        
                        <!-- Delanteros (P4, P3, P2) -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;">
                            <div style="background: #1e293b; padding: 8px; border-radius: 6px; text-align: center;">
                                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: bold;">P4 (Del. Izq)</label>
                                <input type="number" min="0" max="99" class="form-input lineup-input" data-pos="4" list="roster-dorsals-list" placeholder="Nº" style="width: 100%; padding: 6px; font-weight: bold; text-align: center; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px;">
                            </div>
                            <div style="background: #1e293b; padding: 8px; border-radius: 6px; text-align: center;">
                                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: bold;">P3 (Del. Centro)</label>
                                <input type="number" min="0" max="99" class="form-input lineup-input" data-pos="3" list="roster-dorsals-list" placeholder="Nº" style="width: 100%; padding: 6px; font-weight: bold; text-align: center; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px;">
                            </div>
                            <div style="background: #1e293b; padding: 8px; border-radius: 6px; text-align: center;">
                                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: bold;">P2 (Del. Der)</label>
                                <input type="number" min="0" max="99" class="form-input lineup-input" data-pos="2" list="roster-dorsals-list" placeholder="Nº" style="width: 100%; padding: 6px; font-weight: bold; text-align: center; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px;">
                            </div>
                        </div>

                        <!-- Línea de 3m -->
                        <div style="border-top: 1px dashed #475569; margin: 10px 0; text-align: center;"><span style="font-size: 9px; color: #64748b; background: #0f172a; padding: 0 8px;">Línea 3 metros</span></div>

                        <!-- Zagueros (P5, P6, P1) -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px;">
                            <div style="background: #1e293b; padding: 8px; border-radius: 6px; text-align: center;">
                                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: bold;">P5 (Zag. Izq)</label>
                                <input type="number" min="0" max="99" class="form-input lineup-input" data-pos="5" list="roster-dorsals-list" placeholder="Nº" style="width: 100%; padding: 6px; font-weight: bold; text-align: center; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px;">
                            </div>
                            <div style="background: #1e293b; padding: 8px; border-radius: 6px; text-align: center;">
                                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: bold;">P6 (Zag. Centro)</label>
                                <input type="number" min="0" max="99" class="form-input lineup-input" data-pos="6" list="roster-dorsals-list" placeholder="Nº" style="width: 100%; padding: 6px; font-weight: bold; text-align: center; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px;">
                            </div>
                            <div style="background: rgba(59, 130, 246, 0.15); border: 1px solid #3b82f6; padding: 8px; border-radius: 6px; text-align: center;">
                                <label style="font-size: 11px; color: #60a5fa; display: block; margin-bottom: 4px; font-weight: bold;">P1 (Saque 🏐)</label>
                                <input type="number" min="0" max="99" class="form-input lineup-input" data-pos="1" list="roster-dorsals-list" placeholder="Nº" style="width: 100%; padding: 6px; font-weight: bold; text-align: center; background: #0f172a; color: white; border: 1px solid #3b82f6; border-radius: 4px;">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="notes-footer">
                    <button id="btn-save-lineup" class="btn btn-primary" style="width: 100%;">💾 Confirmar Titulares del Set</button>
                </div>
            </div>
        </div>

        <!-- Modal Cambio / Sustitución de Jugador -->
        <div class="attack-modal" id="modal-cambio-jugador" style="display: none;">
            <div class="notes-modal-content" style="max-width: 450px;">
                <div class="notes-header">
                    <h3>🔄 Sustitución de Jugador</h3>
                    <button id="btn-close-cambio" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px; color: #f87171; font-weight: bold;">🔴 Jugador que SALE (en pista)</label>
                        <select id="cambio-sale" class="form-input" style="width: 100%; padding: 8px; font-size: 14px; font-weight: bold;">
                        </select>
                    </div>
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px; color: #4ade80; font-weight: bold;">🟢 Jugador que ENTRA (dorsal del banquillo o nuevo)</label>
                        <input type="text" id="cambio-entra" class="form-input" list="banquillo-dorsals-list" autocomplete="off" placeholder="Escribe dorsal o nombre..." style="width: 100%; padding: 8px; font-size: 14px; font-weight: bold; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 6px;">
                        <datalist id="banquillo-dorsals-list"></datalist>
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); background: rgba(255,255,255,0.03); padding: 10px; border-radius: 6px; border: 1px solid var(--border);">
                        ℹ️ Si introduces un dorsal que no existe en la plantilla, se creará de forma automática en el equipo y en el partido.
                    </div>
                </div>
                <div class="notes-footer">
                    <button id="btn-save-cambio" class="btn btn-primary" style="width: 100%;">✅ Confirmar Cambio</button>
                </div>
            </div>
        </div>

        <!-- Modal Ajustes del Partido -->
        <div class="attack-modal" id="modal-ajustes-partido" style="display: none;">
            <div class="notes-modal-content" style="max-width: 500px;">
                <div class="notes-header">
                    <h3>⚙️ Ajustes del Partido</h3>
                    <button id="btn-close-ajustes" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Torneo / Competición</label>
                        <input type="text" id="ajustes-torneo" class="form-input" value="${scoutingState.partido.torneo || ''}" style="width: 100%;">
                    </div>
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Fase / Jornada</label>
                        <input type="text" id="ajustes-fase" class="form-input" value="${scoutingState.partido.fase || ''}" style="width: 100%;">
                    </div>
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Origen del Vídeo</label>
                        <div style="display: flex; gap: 16px; margin-top: 6px;">
                            <label style="color: white; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                                <input type="radio" name="ajustes-video-tipo" value="youtube"> YouTube
                            </label>
                            <label style="color: white; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                                <input type="radio" name="ajustes-video-tipo" value="local"> Archivo Local
                            </label>
                            <label style="color: white; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                                <input type="radio" name="ajustes-video-tipo" value="ninguno"> Sin vídeo
                            </label>
                        </div>
                    </div>
                    <div id="ajustes-group-youtube" style="display: none;">
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Enlace de YouTube</label>
                        <input type="text" id="ajustes-youtube-url" class="form-input" placeholder="https://www.youtube.com/watch?v=..." style="width: 100%;">
                    </div>
                    <div id="ajustes-group-local" style="display: none;">
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Archivo de Vídeo Local</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="ajustes-local-path" class="form-input" readonly style="flex: 1; background: #0f172a; color: #94a3b8; cursor: not-allowed; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <button class="btn btn-secondary" id="btn-ajustes-elegir-local" type="button">Seleccionar...</button>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border); margin-top: 4px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-primary); font-weight: 500; margin-bottom: 0; font-size: 13px;">
                            <input type="checkbox" id="ajustes-llevar-rotaciones" ${scoutingState.partido.llevar_rotaciones ? 'checked' : ''} style="width: 16px; height: 16px;">
                            🔄 Llevar control de rotaciones y posiciones
                        </label>
                    </div>
                </div>
                <div class="notes-footer">
                    <button id="btn-save-ajustes" class="btn btn-primary" style="width: 100%;">💾 Guardar Cambios</button>
                </div>
            </div>
        </div>

        <!-- Modal Generador de Vídeos -->
        <div class="attack-modal" id="videos-modal" style="display: none;">
            <div class="notes-modal-content" style="max-width: 500px;">
                <div class="notes-header">
                    <h3>🎬 Generador de Vídeos</h3>
                    <button id="btn-close-videos" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Modo de Generación</label>
                        <select id="vid-generar-modo" class="form-input pista-select" style="width: 100%;">
                            <option value="filtrar">Filtrar jugadas específicas por jugador/acción</option>
                            <option value="puntos_ataques">Punto completo cuando ataque un jugador</option>
                            <option value="aciertos">Todos los aciertos de un jugador (aces, ataques y bloqueos punto)</option>
                            <option value="favoritos">Sólo jugadas marcadas como Favoritas ⭐</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label" style="display:block; margin-bottom: 4px;">Plantilla rápida</label>
                        <select id="vid-plantilla" class="form-input pista-select" style="width:100%;">
                            <option value="">Configurar manualmente</option>
                            <option value="ataques-jugador">Puntos completos de ataques de un jugador</option>
                            <option value="aciertos">Todos los aciertos de un jugador</option>
                            <option value="saques">Todos los saques de un jugador</option>
                            <option value="recepciones">Todas las recepciones de un jugador</option>
                            <option value="favoritos">Rallies favoritos</option>
                        </select>
                    </div>
                    
                    <div id="vid-filtros-container" style="display: flex; flex-direction: column; gap: 12px;">
                        <div style="display: flex; gap: 12px;">
                            <div style="flex: 1;">
                                <label for="vid-dorsal" class="form-label" style="display:block; margin-bottom: 4px;">Jugador / Dorsal</label>
                                <select id="vid-dorsal" class="form-input pista-select" style="width: 100%;">
                                    <option value="">Todos los jugadores</option>
                                    ${scoutingState.roster.map(j => `<option value="${j.dorsal}">#${j.dorsal} - ${j.apellidos || j.nombre}</option>`).join('')}
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label class="form-label" style="display:block; margin-bottom: 4px;">Tipo de Acción</label>
                                <select id="vid-accion" class="form-input pista-select" style="width: 100%;">
                                    <option value="">Cualquier acción</option>
                                    ${Object.entries(TIPOS_ACCION_PISTA).filter(([k]) => k !== 'cambio').map(([k, c]) => `<option value="${k}">${c.label}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="form-label" style="display:block; margin-bottom: 4px;">Set</label>
                            <select id="vid-set" class="form-input pista-select" style="width: 100%;">
                                <option value="">Todos los sets</option>
                                ${[1,2,3,4,5].map(s => `<option value="${s}">Set ${s}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <label id="vid-punto-entero-wrap" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px;">
                        <input type="checkbox" id="vid-punto-entero">
                        <span>Exportar el punto entero de cada jugada (el rally completo, no solo la acción)</span>
                    </label>

                    <div style="display: flex; gap: 12px;">
                        <div style="flex: 1;">
                            <label class="form-label" style="display:block; margin-bottom: 4px;">Segundos Pre-jugada</label>
                            <input type="number" id="vid-margin-pre" class="form-input" value="3" min="1" max="10" style="width: 100%;">
                        </div>
                        <div style="flex: 1;">
                            <label class="form-label" style="display:block; margin-bottom: 4px;">Segundos Post-jugada</label>
                            <input type="number" id="vid-margin-post" class="form-input" value="2" min="1" max="10" style="width: 100%;">
                        </div>
                    </div>

                    <div id="vid-progress-container" style="display: none; margin-top: 8px;">
                        <div style="background: #1e293b; border-radius: 4px; height: 16px; overflow: hidden; border: 1px solid #334155;">
                            <div id="vid-progress-bar" style="background: var(--accent-primary); width: 0%; height: 100%; transition: width 0.3s;"></div>
                        </div>
                        <div id="vid-progress-text" style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 4px;">0%</div>
                    </div>
                    <div id="vid-preview" style="display:none; border:1px solid var(--border); border-radius:8px; padding:10px; background:rgba(15,23,42,.45);"></div>
                    <button id="btn-previsualizar-videos" class="btn btn-secondary" type="button" style="width:100%;">▶ Previsualizar selección</button>
                </div>
                <div class="notes-footer">
                    <button id="btn-generar-videos-run" class="btn btn-primary" style="width: 100%;">🚀 Exportar Vídeo Resumen</button>
                </div>
            </div>
        </div>
    `;
}

function renderVideoPlayer() {
    const { partido } = scoutingState;
    if (!partido || !partido.video_url || partido.video_tipo === 'ninguno') {
        return `<div class="video-placeholder"><p>Sin vídeo</p></div>`;
    }

    if (partido.video_tipo === 'youtube') {
        const ytId = getYoutubeId(partido.video_url);
        return `
            <div class="video-placeholder" id="yt-choice-container" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:20px; text-align:center;">
                <div style="font-size: 32px;">📺</div>
                <div style="font-weight: bold; color: white; font-size: 16px;">Vídeo de YouTube Detectado</div>
                <p style="font-size: 12px; color: var(--text-muted); max-width: 320px;">
                    ¿Cómo prefieres reproducir este vídeo para la sesión de scouting?
                </p>
                <div style="display:flex; gap:10px; margin-top:8px; flex-wrap:wrap; justify-content:center;">
                    <button id="btn-yt-iframe" class="btn btn-primary" style="padding:8px 16px; font-size:13px; display:flex; align-items:center; gap:6px;">
                        🔴 Ver con Iframe (Streaming Directo)
                    </button>
                    <button id="btn-yt-download" class="btn btn-secondary" style="padding:8px 16px; font-size:13px; display:flex; align-items:center; gap:6px;">
                        ⬇️ Descargar y Ver Localmente (Offline)
                    </button>
                </div>
                <div id="yt-progress-bar-wrap" style="width:80%;height:4px;background:rgba(255,255,255,0.15);border-radius:4px;margin-top:12px;overflow:hidden;display:none;">
                    <div id="yt-progress-bar-inner" style="height:100%;width:0%;background:var(--accent);transition:width 0.3s;"></div>
                </div>
                <p id="yt-status-msg" style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display:none;"></p>
                <div id="whistle-progress-wrap" style="width:80%; height:5px; background:rgba(255,255,255,.15); border-radius:4px; overflow:hidden; display:none;"><div id="whistle-progress-bar" style="width:0%; height:100%; background:var(--accent-primary); transition:width .2s;"></div></div>
            </div>
        `;
    }

    const srcUrl = partido.video_url.startsWith('http') ? partido.video_url : `local-video://video?path=${encodeURIComponent(partido.video_url)}`;
    return `
        <video id="local-video" preload="metadata"><source src="${srcUrl}"></video>
        <div class="video-controls" id="video-controls">
            <button id="btn-play-pause">▶</button>
            <div class="video-progress" id="video-progress"><div class="video-progress-bar" id="video-progress-bar"></div></div>
            <span class="video-time" id="video-time">00:00 / 00:00</span>
            <div style="display:flex; align-items:center; gap:2px; margin-left:8px; margin-right:8px;">
                <button id="btn-speed-down" style="background:transparent; border:none; color:white; cursor:pointer;" title="Reducir Velocidad">-</button>
                <span class="speed-indicator" id="speed-indicator" style="min-width:30px; text-align:center;">1x</span>
                <button id="btn-speed-up" style="background:transparent; border:none; color:white; cursor:pointer;" title="Aumentar Velocidad">+</button>
            </div>
        </div>
    `;
}

function toggleVideoPlayPause() {
    const video = document.getElementById('local-video');
    if (video) {
        video.paused ? video.play() : video.pause();
        return;
    }
    const iframe = document.getElementById('yt-iframe-player');
    if (iframe) {
        if (ytState === 1) { // playing
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
        } else {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        }
    }
}

function seekVideo(seconds) {
    const video = document.getElementById('local-video');
    if (video) {
        const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
        const dur = (Number.isFinite(video.duration) && video.duration > 0) ? video.duration : null;
        let target = current + seconds;
        if (dur !== null) {
            target = Math.min(dur, target);
        }
        video.currentTime = Math.max(0, target);
        return;
    }
    const iframe = document.getElementById('yt-iframe-player');
    if (iframe) {
        const target = ytCurrentTime + seconds;
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [Math.max(0, target), true] }), '*');
    }
}

function seekVideoTo(seconds) {
    const iframe = document.getElementById('yt-iframe-player');
    if (iframe) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }), '*');
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        showToast(`Saltando a ${formatTimestamp(seconds)} en YouTube Stream`, 'info');
        return;
    }

    const video = document.getElementById('local-video');
    if (video && Number.isFinite(seconds)) {
        video.currentTime = Math.max(0, seconds);
        video.play().catch(() => {});
        showToast(`Saltando a ${formatTimestamp(seconds)}`, 'info');
    }
}

function getVideoTimestamp() {
    const video = document.getElementById('local-video');
    if (video) return video.currentTime;
    const iframe = document.getElementById('yt-iframe-player');
    if (iframe) {
        if (!ytPollInterval) {
            setupYoutubeTracking();
        }
        return ytCurrentTime || 0;
    }
    return 0;
}

function changeVideoSpeed(delta) {
    const video = document.getElementById('local-video');
    if (video) {
        scoutingState.videoSpeed = Math.max(0.25, Math.min(4, (scoutingState.videoSpeed || 1) + delta));
        video.playbackRate = scoutingState.videoSpeed;
        const indicator = document.getElementById('speed-indicator');
        if (indicator) indicator.textContent = `${scoutingState.videoSpeed}x`;
        showToast(`Velocidad: ${scoutingState.videoSpeed}x`, 'info');
        return;
    }
    const iframe = document.getElementById('yt-iframe-player');
    if (iframe) {
        scoutingState.videoSpeed = Math.max(0.25, Math.min(4, (scoutingState.videoSpeed || 1) + delta));
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [scoutingState.videoSpeed] }), '*');
        const indicator = document.getElementById('speed-indicator');
        if (indicator) indicator.textContent = `${scoutingState.videoSpeed}x`;
        showToast(`Velocidad: ${scoutingState.videoSpeed}x`, 'info');
    }
}

function setupVideoPlayer(container) {
    const btnIframe = document.getElementById('btn-yt-iframe');
    const btnDownload = document.getElementById('btn-yt-download');

    if (btnIframe && btnDownload) {
        btnIframe.addEventListener('click', () => {
            const ytId = getYoutubeId(scoutingState.partido.video_url);
            const videoContainer = document.getElementById('video-container');
            if (videoContainer && ytId) {
                document.querySelector('.scouting-layout')?.classList.remove('youtube-choice-active');
                videoContainer.innerHTML = `
                    <div style="position:relative; width:100%; height:100%; aspect-ratio:16/9; background:#000;">
                        <iframe id="yt-iframe-player" src="https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%; height:100%; border:none;"></iframe>
                    </div>
                `;
                showToast('Reproduciendo Streaming directo de YouTube', 'success');
                setupYoutubeTracking();
            } else {
                showToast('URL de YouTube no válida', 'error');
            }
        });

        btnDownload.addEventListener('click', () => {
            document.querySelector('.scouting-layout')?.classList.remove('youtube-choice-active');
            showToast('Preparando vídeo y análisis local de silbatos…', 'info');
            setupYoutubeDownload(container);
        });
        return;
    }

    const video = document.getElementById('local-video');
    if (!video) return;
    const playPause = document.getElementById('btn-play-pause');
    const progress = document.getElementById('video-progress');
    const progressBar = document.getElementById('video-progress-bar');
    const timeDisplay = document.getElementById('video-time');

    video.addEventListener('timeupdate', () => {
        if (!video.duration || !Number.isFinite(video.duration)) return;
        const pct = (video.currentTime / video.duration) * 100;
        progressBar.style.width = pct + '%';
        timeDisplay.textContent = `${formatTimestamp(video.currentTime)} / ${formatTimestamp(video.duration)}`;
    });
    video.addEventListener('play', () => playPause.textContent = '⏸');
    video.addEventListener('pause', () => playPause.textContent = '▶');
    playPause.addEventListener('click', () => video.paused ? video.play() : video.pause());
    progress.addEventListener('click', (e) => {
        if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
        const rect = progress.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        video.currentTime = pct * video.duration;
    });

    video.addEventListener('keydown', (e) => {
        if (e.key === keyFor('pista', 'video-backward')) { e.preventDefault(); seekVideo(-(getPrefs().videoSeekSeconds || 5)); }
        else if (e.key === keyFor('pista', 'video-forward')) { e.preventDefault(); seekVideo(getPrefs().videoSeekSeconds || 5); }
        else if (e.key === keyFor('pista', 'video-play')) { e.preventDefault(); toggleVideoPlayPause(); }
    });

    const speedDown = document.getElementById('btn-speed-down');
    const speedUp = document.getElementById('btn-speed-up');
    const speedIndicator = document.getElementById('speed-indicator');
    if (speedDown) speedDown.addEventListener('click', () => changeVideoSpeed(-0.25));
    if (speedUp) speedUp.addEventListener('click', () => changeVideoSpeed(0.25));
    if (speedIndicator) speedIndicator.textContent = `${scoutingState.videoSpeed || 1}x`;
    video.playbackRate = scoutingState.videoSpeed || 1;
}

async function setupYoutubeDownload(container) {
    const statusMsg = document.getElementById('yt-status-msg');
    const progressWrap = document.getElementById('yt-progress-bar-wrap');
    const progressBar = document.getElementById('yt-progress-bar-inner');
    const whistleProgressWrap = document.getElementById('whistle-progress-wrap');
    const whistleProgressBar = document.getElementById('whistle-progress-bar');
    const videoContainer = document.getElementById('video-container');

    if (statusMsg) { statusMsg.textContent = 'Iniciando descarga del vídeo...'; statusMsg.style.display = 'block'; }
    if (progressWrap) progressWrap.style.display = 'block';
    if (progressBar) progressBar.style.width = '0%';

    const onYt = window.apiPista?.onYtProgress || window.api?.onYtProgress;
    if (onYt) {
        onYt((prog) => {
            if (progressBar && prog.percent !== undefined) {
                progressBar.style.width = `${Math.min(100, Math.max(0, prog.percent))}%`;
            }
            if (statusMsg && prog.text) {
                statusMsg.textContent = `Descargando: ${prog.text}`;
            }
        });
    }

    try {
        const localUrl = await window.api.resolveYoutube(scoutingState.partido.video_url);
        if (progressBar) progressBar.style.width = '100%';
        if (statusMsg) statusMsg.textContent = 'Analizando silbatos localmente…';
        if (whistleProgressWrap) whistleProgressWrap.style.display = 'block';
        if (!window.api.analyzeWhistles || !window.api.onWhistleProgress) {
            if (statusMsg) statusMsg.textContent = '⚠️ Reinicia BVScouter para activar el análisis local de silbatos.';
            showToast('Reinicia la aplicación para activar el análisis de silbatos', 'warning');
        } else {
        window.api.onWhistleProgress?.((progress) => {
            if (whistleProgressBar) whistleProgressBar.style.width = `${progress.percent || 0}%`;
        });
        try {
            const whistles = await window.api.analyzeWhistles(localUrl);
            if (statusMsg) statusMsg.textContent = `✅ Análisis terminado: ${whistles.length} silbatos cargados`;
            if (whistleProgressBar) whistleProgressBar.style.width = '100%';
            showToast(`Análisis terminado: ${whistles.length} silbatos cargados`, 'success');
        } catch (error) {
            console.warn('No se pudo analizar los silbatos:', error);
            if (statusMsg) statusMsg.textContent = 'No se pudieron analizar los silbatos';
        }
        }

        if (videoContainer) {
            videoContainer.innerHTML = `
                <video id="local-video" preload="metadata"><source src="${localUrl}"></video>
                <div class="video-controls" id="video-controls">
                    <button id="btn-play-pause">▶</button>
                    <div class="video-progress" id="video-progress"><div class="video-progress-bar" id="video-progress-bar"></div></div>
                    <span class="video-time" id="video-time">00:00 / 00:00</span>
                    <div style="display:flex; align-items:center; gap:2px; margin-left:8px; margin-right:8px;">
                        <button id="btn-speed-down" style="background:transparent; border:none; color:white; cursor:pointer;" title="Reducir Velocidad">-</button>
                        <span class="speed-indicator" id="speed-indicator" style="min-width:30px; text-align:center;">1x</span>
                        <button id="btn-speed-up" style="background:transparent; border:none; color:white; cursor:pointer;" title="Aumentar Velocidad">+</button>
                    </div>
                </div>
            `;
            setupVideoPlayer(videoContainer);
            if (window.api.analyzeWhistles) setupWhistleMouseNavigation(localUrl);
        }
    } catch (err) {
        if (statusMsg) statusMsg.textContent = `Error al descargar: ${err.message}`;
        if (progressBar) { progressBar.style.width = '0%'; progressBar.style.background = '#f44'; }
    }
}

function setupResizeHandles() {
    const handleVideo = document.getElementById('resize-handle-video');
    const handleTimeline = document.getElementById('resize-handle-timeline');
    if (!handleVideo && !handleTimeline) return;

    function makeResizable(handle, aboveId, belowId) {
        if (!handle) return;
        let startY = 0;
        let startAboveH = 0;
        let startBelowH = 0;
        let above = null;
        let below = null;

        const onMouseDown = (e) => {
            e.preventDefault();
            above = document.getElementById(aboveId);
            below = document.getElementById(belowId);
            if (!above || !below) return;

            startY = e.clientY;
            startAboveH = above.getBoundingClientRect().height;
            startBelowH = below.getBoundingClientRect().height;

            // Set explicit heights to take over from flex
            above.style.height = startAboveH + 'px';
            above.style.flex = '0 0 auto';
            below.style.height = startBelowH + 'px';
            below.style.flex = '0 0 auto';

            handle.classList.add('active');
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            const delta = e.clientY - startY;
            const newAboveH = Math.max(60, startAboveH + delta);
            const newBelowH = Math.max(60, startBelowH - delta);
            above.style.height = newAboveH + 'px';
            below.style.height = newBelowH + 'px';
        };

        const onMouseUp = () => {
            handle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        handle.addEventListener('mousedown', onMouseDown);
    }

    makeResizable(handleVideo, 'video-container', 'timeline-container');
    makeResizable(handleTimeline, 'timeline-container', 'live-stats');
}

function setupActionPanelEvents(container) {
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn) btn.blur();
    });

    document.getElementById('btn-iniciar-rotacion-banner')?.addEventListener('click', () => {
        openLineupSetModal();
    });

    // Dorsales
    const dorsalGrid = document.getElementById('dorsal-grid');
    dorsalGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.dorsal-btn');
        if (btn) {
            scoutingState.dorsalSeleccionado = parseInt(btn.dataset.dorsal);
            updateUI();
        }
    });

    // Acciones
    const actions = document.getElementById('action-buttons');
    actions.addEventListener('click', (e) => {
        const btn = e.target.closest('.action-btn');
        if (btn) {
            scoutingState.tipoAccion = btn.dataset.action;
            autoSeleccionarSacador();
            scoutingState.subtipo = null;
            updateUI();
        }
    });

    // Subtipos
    const subs = document.getElementById('subtype-buttons');
    if (subs) {
        subs.addEventListener('click', (e) => {
            const btn = e.target.closest('.subtype-btn');
            if (btn) {
                scoutingState.subtipo = btn.dataset.sub;
                updateUI();
            }
        });
    }

    // Resultados
    const res = document.getElementById('resultado-buttons');
    if (res) {
        res.addEventListener('click', (e) => {
            const btn = e.target.closest('.res-btn');
            if (btn) {
                if (scoutingState.dorsalInput) {
                    clearTimeout(scoutingState.dorsalTimer);
                    scoutingState.dorsalSeleccionado = parseInt(scoutingState.dorsalInput, 10);
                    scoutingState.dorsalInput = '';
                }
                const resultado = btn.dataset.res;
                guardarAccion(resultado);
            }
        });
    }

    // Rotación
    document.getElementById('btn-rotar').addEventListener('click', (e) => {
        e.stopPropagation();
        scoutingState.rotacionActual = rotarAdelante(scoutingState.rotacionActual);
        updateUI();
    });

    document.getElementById('box-rotacion')?.addEventListener('click', () => {
        if (scoutingState.partido.llevar_rotaciones) {
            openLineupSetModal();
        } else {
            document.getElementById('rotacion-modal').style.display = 'flex';
            scoutingState.wizardModalAbierto = true;
        }
    });

    document.getElementById('btn-cambio-jugador')?.addEventListener('click', () => {
        if (isRotationPending()) {
            showToast('⚠️ Primero debes configurar la rotación y titulares del set', 'warning');
            return;
        }
        openCambioModal();
    });
    document.getElementById('btn-edit-lineup-set')?.addEventListener('click', () => openLineupSetModal());
    document.getElementById('btn-rotar-prev')?.addEventListener('click', () => {
        scoutingState.rotacionActual = rotarAtras(scoutingState.rotacionActual);
        updateUI();
    });
    document.getElementById('btn-rotar-next')?.addEventListener('click', () => {
        scoutingState.rotacionActual = rotarAdelante(scoutingState.rotacionActual);
        updateUI();
    });
    attachCourtPlayerEvents();
    
    // Marcador manual
    document.getElementById('score-local').addEventListener('click', (e) => updateScore('local', 1));
    document.getElementById('score-local').addEventListener('contextmenu', (e) => { e.preventDefault(); updateScore('local', -1); });
    document.getElementById('score-rival').addEventListener('click', (e) => updateScore('rival', 1));
    document.getElementById('score-rival').addEventListener('contextmenu', (e) => { e.preventDefault(); updateScore('rival', -1); });

    document.getElementById('server-local').addEventListener('click', () => { if (!isRotationPending()) { scoutingState.equipoAlSaque = 'local'; updateUI(); } });
    document.getElementById('server-rival').addEventListener('click', () => { if (!isRotationPending()) { scoutingState.equipoAlSaque = 'rival'; updateUI(); } });

    // Botones de cabecera
    document.getElementById('btn-finalizar-set')?.addEventListener('click', async () => {
        if (isRotationPending()) {
            showToast('⚠️ El set actual no ha sido iniciado (falta configurar rotación)', 'warning');
            return;
        }
        if (scoutingState.marcadorLocal === scoutingState.marcadorRival) {
            showToast('El marcador está empatado. Imposible finalizar set.', 'error');
            return;
        }
        const ganadorLocal = scoutingState.marcadorLocal > scoutingState.marcadorRival;
        const nombreGanador = ganadorLocal ? (scoutingState.partido.equipo_nombre || 'Local') : (scoutingState.partido.rival_nombre || 'Rival');
        
        if (!confirm(`¿Finalizar el Set ${scoutingState.setActual}?\n\nVictoria para: ${nombreGanador} (${scoutingState.marcadorLocal}-${scoutingState.marcadorRival})`)) {
            return;
        }
        
        await window.apiPista.createAccionPista({
            partido_id: scoutingState.partidoId,
            dorsal: 0,
            rotacion: getRotacionEfectiva(),
            tipo_accion: 'fin_set',
            subtipo: 'Ganador Set',
            resultado: ganadorLocal ? 'local' : 'rival',
            set_numero: scoutingState.setActual,
            marcador_local: scoutingState.marcadorLocal.toString(),
            marcador_rival: scoutingState.marcadorRival.toString(),
            video_timestamp: getVideoTimestamp(),
            equipo_al_saque: scoutingState.equipoAlSaque
        });

        scoutingState.setActual++;
        scoutingState.marcadorLocal = 0;
        scoutingState.marcadorRival = 0;
        
        await window.apiPista.updatePartidoPista(scoutingState.partidoId, {
            resultado: `${scoutingState.marcadorLocal}-${scoutingState.marcadorRival}`
        });

        updateUI();
        refreshTimelineAndStats();
        showToast(`Set finalizado. ¡Comienza el Set ${scoutingState.setActual}! Configura la rotación.`, 'success');
        
        if (scoutingState.partido.llevar_rotaciones) {
            scoutingState.rotacionActual = 1;
            updateUI();
        } else {
            document.getElementById('rotacion-modal').style.display = 'flex';
            scoutingState.wizardModalAbierto = true;
        }
    });

    document.getElementById('btn-ver-informe')?.addEventListener('click', async () => {
        await window.apiPista.updatePartidoPista(scoutingState.partidoId, {
            resultado: `${scoutingState.marcadorLocal}-${scoutingState.marcadorRival}`
        });
        limpiarShortcuts();
        router.navigate('informe-pista', { partidoId: scoutingState.partidoId });
    });

    document.getElementById('btn-notas-partido')?.addEventListener('click', () => {
        document.getElementById('notes-modal').style.display = 'flex';
        scoutingState.wizardModalAbierto = true;
    });

    document.getElementById('btn-ajustes-partido')?.addEventListener('click', () => {
        const p = scoutingState.partido;
        if (p) {
            const inputTorneo = document.getElementById('ajustes-torneo');
            const inputFase = document.getElementById('ajustes-fase');
            const checkRot = document.getElementById('ajustes-llevar-rotaciones');
            if (inputTorneo) inputTorneo.value = p.torneo || '';
            if (inputFase) inputFase.value = p.fase || '';
            if (checkRot) checkRot.checked = !!p.llevar_rotaciones;

            const tipo = p.video_tipo || 'ninguno';
            const targetRadio = document.querySelector(`input[name="ajustes-video-tipo"][value="${tipo}"]`) || document.querySelector(`input[name="ajustes-video-tipo"][value="ninguno"]`);
            if (targetRadio) targetRadio.checked = true;

            const groupYoutube = document.getElementById('ajustes-group-youtube');
            const groupLocal = document.getElementById('ajustes-group-local');
            if (groupYoutube) groupYoutube.style.display = tipo === 'youtube' ? 'block' : 'none';
            if (groupLocal) groupLocal.style.display = tipo === 'local' ? 'block' : 'none';

            const inputYoutubeUrl = document.getElementById('ajustes-youtube-url');
            const inputLocalPath = document.getElementById('ajustes-local-path');
            if (tipo === 'youtube' && inputYoutubeUrl) inputYoutubeUrl.value = p.video_url || '';
            else if (inputYoutubeUrl) inputYoutubeUrl.value = '';
            if (tipo === 'local' && inputLocalPath) inputLocalPath.value = p.video_url || '';
            else if (inputLocalPath) inputLocalPath.value = '';
        }
        document.getElementById('modal-ajustes-partido').style.display = 'flex';
        scoutingState.wizardModalAbierto = true;
    });

    document.getElementById('btn-generador-videos')?.addEventListener('click', () => {
        document.getElementById('videos-modal').style.display = 'flex';
        scoutingState.wizardModalAbierto = true;
    });

    document.getElementById('btn-guardar-partido')?.addEventListener('click', async () => {
        await window.apiPista.updatePartidoPista(scoutingState.partidoId, {
            resultado: `${scoutingState.marcadorLocal}-${scoutingState.marcadorRival}`
        });
        showToast('Partido guardado con éxito', 'success');
    });

    // Deshacer
    document.getElementById('btn-undo').addEventListener('click', async () => {
        if (scoutingState.acciones.length === 0) return;
        await window.apiPista.undoLastAccionPista(scoutingState.partidoId);
        const deshecha = scoutingState.acciones.pop();
        
        const prev = scoutingState.acciones[scoutingState.acciones.length - 1];
        if (prev) {
            scoutingState.marcadorLocal = prev.marcador_local;
            scoutingState.marcadorRival = prev.marcador_rival;
            scoutingState.setActual = prev.set_numero;
            scoutingState.equipoAlSaque = prev.equipo_al_saque;
            // La rotación de la acción deshecha es la que había justo antes de ella.
            scoutingState.rotacionActual = deshecha?.rotacion || prev.rotacion || 1;
        } else {
            scoutingState.marcadorLocal = 0;
            scoutingState.marcadorRival = 0;
        }
        
        showToast('Acción deshecha', 'info');
        updateUI();
        refreshTimelineAndStats();
    });

    document.getElementById('btn-volver').addEventListener('click', () => {
        limpiarShortcuts();
        router.navigate('dashboard-pista');
    });
}

function limpiarShortcuts() {
    if (keyHandler) {
        document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
    }
    if (speedHoldHandler) {
        document.removeEventListener('keydown', speedHoldHandler.down);
        document.removeEventListener('keyup',   speedHoldHandler.up);
        speedHoldHandler = null;
    }
    if (ytMessageListener) {
        window.removeEventListener('message', ytMessageListener);
        ytMessageListener = null;
    }
    if (ytPollInterval) {
        clearInterval(ytPollInterval);
        ytPollInterval = null;
    }
}

async function updateScore(team, delta) {
    if (isRotationPending()) {
        showToast(`⚠️ No puedes modificar el marcador en el Set ${scoutingState.setActual} hasta configurar la rotación inicial`, 'warning');
        return;
    }
    const curLocal = parseInt(scoutingState.marcadorLocal || 0, 10);
    const curRival = parseInt(scoutingState.marcadorRival || 0, 10);
    const d = parseInt(delta, 10);

    const score = applyScoreDelta(
        { local: curLocal, rival: curRival },
        team === 'local' ? { local: d, rival: 0 } : { local: 0, rival: d }
    );
    scoutingState.marcadorLocal = score.local;
    scoutingState.marcadorRival = score.rival;
    await window.apiPista.updatePartidoPista(scoutingState.partidoId, {
        resultado: `${scoutingState.marcadorLocal}-${scoutingState.marcadorRival}`
    });
    updateUI();
}

function updateUI() {
    const pending = isRotationPending();
    const statsContainer = document.getElementById('stats-controls-container');
    const pendingBanner = document.getElementById('rotation-pending-banner');
    if (statsContainer && pendingBanner) {
        statsContainer.style.display = pending ? 'none' : 'block';
        pendingBanner.style.display = pending ? 'block' : 'none';
        const pSet = document.getElementById('pending-set-num');
        const pBtnSet = document.getElementById('pending-btn-set-num');
        if (pSet) pSet.textContent = scoutingState.setActual;
        if (pBtnSet) pBtnSet.textContent = scoutingState.setActual;
    }

    // Dorsales
    document.querySelectorAll('.dorsal-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.dorsal) === scoutingState.dorsalSeleccionado);
    });

    // Acciones
    document.querySelectorAll('.action-btn').forEach(b => {
        b.classList.toggle('selected', b.dataset.action === scoutingState.tipoAccion);
    });

    // Subtipos (render dinámico)
    const subContainer = document.getElementById('subtipo-container');
    const subBtns = document.getElementById('subtype-buttons');
    if (subContainer && subBtns) {
        if (scoutingState.tipoAccion && SUBTIPOS_PISTA[scoutingState.tipoAccion]) {
            subContainer.style.display = 'block';
            subBtns.innerHTML = renderSubtipos();
        } else {
            subContainer.style.display = 'none';
            scoutingState.subtipo = null;
        }
    }

    // Resultados
    const resContainer = document.getElementById('resultados-container');
    const resBtns = document.getElementById('resultado-buttons');
    if (resContainer && resBtns) {
        if (scoutingState.tipoAccion) {
            resContainer.style.display = 'block';
            resBtns.innerHTML = renderResultados();
        } else {
            resContainer.style.display = 'none';
        }
    }

    // Texto Actual
    let text = [];
    if (scoutingState.dorsalInput) text.push(`Dorsal: ${scoutingState.dorsalInput}...`);
    else if (scoutingState.dorsalSeleccionado) text.push(`#${scoutingState.dorsalSeleccionado}`);
    if (scoutingState.tipoAccion && TIPOS_ACCION_PISTA[scoutingState.tipoAccion]) text.push(TIPOS_ACCION_PISTA[scoutingState.tipoAccion].label);
    if (scoutingState.subtipo) text.push(scoutingState.subtipo);
    const currTextEl = document.getElementById('current-action-text');
    if (currTextEl) currTextEl.textContent = text.join(' > ') || 'Selecciona Dorsal...';

    // Marcador y Saque
    const setLabelEl = document.getElementById('set-label');
    const scoreLocalEl = document.getElementById('score-local');
    const scoreRivalEl = document.getElementById('score-rival');
    const serverLocalEl = document.getElementById('server-local');
    const serverRivalEl = document.getElementById('server-rival');
    const labelRotEl = document.getElementById('label-rotacion');

    if (setLabelEl) {
        if (pending) {
            setLabelEl.textContent = `⏳ SET ${scoutingState.setActual} (NO INICIADO)`;
            setLabelEl.style.color = '#facc15';
            setLabelEl.style.borderColor = '#facc15';
            setLabelEl.style.background = 'rgba(234, 179, 8, 0.15)';
        } else {
            setLabelEl.textContent = `SET ${scoutingState.setActual}`;
            setLabelEl.style.color = '';
            setLabelEl.style.borderColor = '';
            setLabelEl.style.background = '';
        }
    }

    const setsScoreEl = document.getElementById('sets-score');
    if (setsScoreEl) setsScoreEl.textContent = `(${getMarcadorSets().local}-${getMarcadorSets().rival})`;

    if (scoreLocalEl) {
        scoreLocalEl.textContent = scoutingState.marcadorLocal;
        scoreLocalEl.style.opacity = pending ? '0.4' : '1';
        scoreLocalEl.style.pointerEvents = pending ? 'none' : 'auto';
    }
    if (scoreRivalEl) {
        scoreRivalEl.textContent = scoutingState.marcadorRival;
        scoreRivalEl.style.opacity = pending ? '0.4' : '1';
        scoreRivalEl.style.pointerEvents = pending ? 'none' : 'auto';
    }
    if (serverLocalEl) {
        const isLocalActive = !pending && scoutingState.equipoAlSaque === 'local';
        serverLocalEl.classList.toggle('active', isLocalActive);
        serverLocalEl.style.opacity = pending ? '0.2' : (isLocalActive ? '1' : '0.2');
        serverLocalEl.style.pointerEvents = pending ? 'none' : 'auto';
    }
    if (serverRivalEl) {
        const isRivalActive = !pending && scoutingState.equipoAlSaque === 'rival';
        serverRivalEl.classList.toggle('active', isRivalActive);
        serverRivalEl.style.opacity = pending ? '0.2' : (isRivalActive ? '1' : '0.2');
        serverRivalEl.style.pointerEvents = pending ? 'none' : 'auto';
    }
    if (labelRotEl) labelRotEl.textContent = 'R' + getRotacionEfectiva();

    const frontRow = document.getElementById('court-row-front');
    const backRow = document.getElementById('court-row-back');
    if (frontRow && backRow) {
        const courtSet = document.getElementById('court-set-label');
        const courtRot = document.getElementById('court-rot-label');
        if (courtSet) courtSet.textContent = scoutingState.setActual;
        if (courtRot) courtRot.textContent = 'R' + getRotacionEfectiva();
        frontRow.innerHTML = `${renderCourtPlayerCircle(4)}${renderCourtPlayerCircle(3)}${renderCourtPlayerCircle(2)}`;
        backRow.innerHTML = `${renderCourtPlayerCircle(5)}${renderCourtPlayerCircle(6)}${renderCourtPlayerCircle(1)}`;
        attachCourtPlayerEvents();
    }
}

async function guardarAccion(resultado) {
    if (isRotationPending()) {
        showToast(`⚠️ No puedes registrar stats en el Set ${scoutingState.setActual} hasta que configures la rotación inicial`, 'warning');
        return;
    }
    if (!scoutingState.tipoAccion) {
        showToast('Falta seleccionar una acción', 'warning');
        return;
    }

    autoSeleccionarSacador();
    if (!scoutingState.dorsalSeleccionado) {
        if (scoutingState.tipoAccion === 'rival' || scoutingState.tipoAccion === 'error_general') {
            scoutingState.dorsalSeleccionado = 0;
        } else {
            showToast('Falta seleccionar un dorsal', 'warning');
            return;
        }
    }

    const time = getVideoTimestamp();
    const rotacionAccion = scoutingState.rotacionActual;
    const rotacionEfectivaAccion = getRotacionEfectiva();
    const marcadorPreLocal = scoutingState.marcadorLocal;
    const marcadorPreRival = scoutingState.marcadorRival;
    
    // Auto score y rotacion
    let scored = null;
    if (scoutingState.tipoAccion === 'rival') {
        if (resultado === '#' || scoutingState.subtipo === 'Acierto Rival') {
            scored = 'rival';
            resultado = '#';
            if (!scoutingState.subtipo) scoutingState.subtipo = 'Acierto Rival';
        } else if (resultado === '=' || scoutingState.subtipo === 'Error Rival') {
            scored = 'local';
            resultado = '=';
            if (!scoutingState.subtipo) scoutingState.subtipo = 'Error Rival';
        }
    } else if (scoutingState.tipoAccion === 'error_general') {
        scored = 'rival'; // Error general del equipo suma punto al rival
    } else if (resultado === '#' && (scoutingState.tipoAccion === 'ataque' || scoutingState.tipoAccion === 'saque' || scoutingState.tipoAccion === 'bloqueo')) {
        scored = 'local'; // Solo ataque, saque o bloqueo ganadores (kill, ace, block punto) dan punto directo
    } else if (resultado === '=' && scoutingState.tipoAccion !== 'rival') {
        scored = 'rival'; // Cualquier error propio ('=') suma punto al rival
    } else if (resultado === '/' && scoutingState.tipoAccion === 'ataque') {
        scored = 'rival'; // Ataque bloqueado ('/') suma punto al rival
    }
    
    if (scored === 'local') scoutingState.marcadorLocal++;
    if (scored === 'rival') scoutingState.marcadorRival++;

    if (scored === 'local') {
        if (scoutingState.equipoAlSaque === 'rival') {
            scoutingState.rotacionActual = rotarAdelante(scoutingState.rotacionActual);
        }
        scoutingState.equipoAlSaque = 'local';
    } else if (scored === 'rival') {
        scoutingState.equipoAlSaque = 'rival';
    } else if (!scoutingState.equipoAlSaque) {
        scoutingState.equipoAlSaque = 'local';
    }

    let subtipo = scoutingState.subtipo || '';
    const posicionActual = scoutingState.tipoAccion === 'ataque'
        ? getCurrentPositionForDorsal(scoutingState.dorsalSeleccionado, rotacionAccion)
        : null;
    const esAtaqueZaguero = posicionActual === 5 || posicionActual === 6;
    if (esAtaqueZaguero && !/zaguero/i.test(subtipo)) {
        subtipo = subtipo ? `${subtipo} · Zaguero` : 'Zaguero';
    }

    const accionData = {
        partido_id: scoutingState.partidoId,
        set_numero: scoutingState.setActual,
        marcador_local: scoutingState.marcadorLocal,
        marcador_rival: scoutingState.marcadorRival,
        marcador_pre_local: marcadorPreLocal,
        marcador_pre_rival: marcadorPreRival,
        dorsal: scoutingState.dorsalSeleccionado,
        rotacion: rotacionEfectivaAccion,
        tipo_accion: scoutingState.tipoAccion,
        subtipo,
        resultado: resultado,
        equipo_al_saque: scoutingState.equipoAlSaque,
        video_timestamp: time,
    };

    try {
        await window.apiPista.createAccionPista(accionData);
        
        await window.apiPista.updatePartidoPista(scoutingState.partidoId, {
            resultado: `${scoutingState.marcadorLocal}-${scoutingState.marcadorRival}`
        });

        scoutingState.tipoAccion = null;
        scoutingState.subtipo = null;
        scoutingState.dorsalSeleccionado = null;
        
        scoutingState.acciones = await window.apiPista.getAccionesPista(scoutingState.partidoId);
        
        updateUI();
        refreshTimelineAndStats();
        
        const actionPanel = document.querySelector('.action-panel');
        if (actionPanel) {
            actionPanel.classList.add('action-flash');
            setTimeout(() => actionPanel.classList.remove('action-flash'), 400);
        }
    } catch (e) {
        showToast('Error al guardar: ' + e.message, 'error');
    }
}

// Electron no soporta window.prompt: se pregunta con un pequeño diálogo propio.
function preguntarEquipoTiempoMuerto() {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index:10000;';
        overlay.innerHTML = `<div class="card" style="padding:20px; min-width:300px; text-align:center;">
            <p style="margin:0 0 16px; font-weight:600;">¿De qué equipo es el tiempo muerto?</p>
            <div style="display:flex; gap:8px; justify-content:center;">
                <button class="btn btn-primary" data-eq="local">Local (L)</button>
                <button class="btn btn-primary" data-eq="rival">Rival (R)</button>
                <button class="btn btn-secondary" data-eq="">Cancelar (Esc)</button>
            </div></div>`;
        const cerrar = (equipo) => {
            document.removeEventListener('keydown', teclas, true);
            overlay.remove();
            scoutingState.wizardModalAbierto = false;
            resolve(equipo || null);
        };
        const teclas = (e) => {
            const k = e.key.toLowerCase();
            if (!['l', 'r', 'escape'].includes(k)) return;
            e.preventDefault(); e.stopPropagation();
            cerrar(k === 'l' ? 'local' : (k === 'r' ? 'rival' : null));
        };
        overlay.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-eq]');
            if (btn) cerrar(btn.dataset.eq);
        });
        document.addEventListener('keydown', teclas, true);
        scoutingState.wizardModalAbierto = true;
        document.body.appendChild(overlay);
        overlay.querySelector('button')?.focus();
    });
}

async function registrarTiempoMuerto() {
    const equipo = await preguntarEquipoTiempoMuerto();
    if (!equipo) return;

    try {
        await window.apiPista.createAccionPista({
            partido_id: scoutingState.partidoId,
            set_numero: scoutingState.setActual,
            marcador_local: scoutingState.marcadorLocal,
            marcador_rival: scoutingState.marcadorRival,
            dorsal: 0,
            rotacion: getRotacionEfectiva(),
            tipo_accion: 'tiempo_muerto',
            subtipo: equipo === 'local' ? 'Solicitado por Local' : 'Solicitado por Rival',
            resultado: '+',
            equipo_al_saque: scoutingState.equipoAlSaque,
            video_timestamp: getVideoTimestamp()
        });
        scoutingState.acciones = await window.apiPista.getAccionesPista(scoutingState.partidoId);
        refreshTimelineAndStats();
        showToast(`Tiempo muerto registrado (${equipo === 'local' ? 'Local' : 'Rival'})`, 'success');
    } catch (e) {
        showToast('Error al guardar el tiempo muerto: ' + e.message, 'error');
    }
}

function renderTimelinePista() {
    const rallies = [];
    let currentRally = [];
    const { acciones } = scoutingState;

    for (let i = 0; i < acciones.length; i++) {
        const a = acciones[i];
        currentRally.push(a);

        // Recepción # y Defensa # son Doble Positiva (continuidad), NO son puntos finales de rally
        const isNonTerminalAction = ['recepcion', 'defensa', 'colocacion', 'freeball'].includes(a.tipo_accion);
        const isTerminalResult = (!isNonTerminalAction && ['#', '=', '/'].includes(a.resultado)) || 
                               (isNonTerminalAction && a.resultado === '=');
        const isPointOrError = isTerminalResult || (a.tipo_accion === 'rival') || (a.tipo_accion === 'error_general');
        let nextIsNewRallyStart = false;

        if (i < acciones.length - 1) {
            const nextA = acciones[i+1];
            if (nextA.tipo_accion === 'saque' || nextA.tipo_accion === 'recepcion') {
                nextIsNewRallyStart = true;
            }
        }

        if (isPointOrError || nextIsNewRallyStart) {
            const lastAccion = currentRally[currentRally.length - 1];
            rallies.push({
                marcador_local: lastAccion.marcador_local,
                marcador_rival: lastAccion.marcador_rival,
                acciones: currentRally
            });
            currentRally = [];
        }
    }

    if (currentRally.length > 0) {
        const lastAccion = currentRally[currentRally.length - 1];
        rallies.push({
            marcador_local: lastAccion.marcador_local,
            marcador_rival: lastAccion.marcador_rival,
            acciones: currentRally
        });
    }

    return rallies.reverse().map(rally => {
        const rallyIds = rally.acciones.map(a => a.id).join(',');
        const isFav = rally.acciones.length > 0 && rally.acciones.every(a => a.es_favorito);
        const header = `<div class="rally-header">
            <span>Marcador: ${rally.marcador_local} - ${rally.marcador_rival}</span>
            <div class="rally-header-actions">
                <button class="btn-fav-rally ${isFav ? 'is-fav' : ''}" data-rally-ids="${rallyIds}" title="${isFav ? 'Quitar punto de favoritos' : 'Marcar punto como favorito'}">
                    <span class="fav-star">${isFav ? '★' : '☆'}</span>
                </button>
                <button class="btn-save-rally" data-rally-ids="${rallyIds}" data-score="${rally.marcador_local}-${rally.marcador_rival}" title="Guardar vídeo de este punto">💾</button>
                <button class="btn-delete-rally" data-rally-ids="${rallyIds}" title="Eliminar Punto (y todas sus acciones)">🗑️</button>
            </div>
        </div>`;

        const items = rally.acciones.map(a => {
            const resClass = RESULTADOS_PISTA[a.resultado]?.class || 'continuidad';
            const icon = RESULTADOS_PISTA[a.resultado]?.icon || a.resultado || '';
            const abbr = TIPOS_ACCION_PISTA[a.tipo_accion]?.label || TIPOS_ACCION_PISTA[a.tipo_accion]?.abbr || a.tipo_accion;
            let who = `#${a.dorsal}`;
            let resBadge = `<span style="font-weight:bold; margin-left: 2px;">[${icon}]</span>`;
            if (a.tipo_accion === 'rival') who = 'RIVAL';
            else if (a.tipo_accion === 'error_general') who = 'EQUIPO';
            else if (a.tipo_accion === 'cambio') {
                who = '🔄 CAMBIO';
                resBadge = '';
            }
            return `
                <div class="timeline-item ${resClass}" data-id="${a.id}" data-timestamp="${a.video_timestamp}" style="display:flex; align-items:center; gap:8px; padding:8px 12px; cursor:pointer;" title="Haz clic para saltar al minuto ${formatTimestamp(a.video_timestamp)} en el vídeo">
                    <span class="timestamp" data-timestamp="${a.video_timestamp}" style="cursor:pointer; text-decoration:underline; font-weight:bold;">${formatTimestamp(a.video_timestamp)}</span>
                    <strong style="color:var(--accent); font-weight:bold;">${who}</strong>
                    <span>${abbr}</span>
                    ${a.subtipo ? `<span style="color:var(--text-secondary);">· ${a.subtipo}</span>` : ''}
                    ${a.tipo_accion === 'ataque' && /zaguero/i.test(a.subtipo || '') ? '<span style="color:#facc15; font-weight:800;">ZAG</span>' : ''}
                    ${resBadge}
                    <div style="margin-left: auto; display: flex; gap: 4px;">
                        <button class="btn-edit-action" data-action-id="${a.id}" title="Editar Acción" style="background:none; border:none; cursor:pointer;">✏️</button>
                        <button class="btn-delete-action" data-action-id="${a.id}" title="Eliminar Acción" style="background:none; border:none; cursor:pointer; font-size:1.1rem; color:var(--text-secondary);">×</button>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="rally-group">${header}<div class="rally-actions">${items}</div></div>`;
    }).join('');
}

function refreshTimelineAndStats() {
    // Timeline
    const container = document.getElementById('timeline-items');
    const timelineTitle = document.querySelector('.timeline-title');
    if (timelineTitle) {
        timelineTitle.textContent = `Historial (${scoutingState.acciones.length} acciones)`;
    }
    container.innerHTML = renderTimelinePista();

    // vincular eventos de eliminación de acción
    container.querySelectorAll('.btn-delete-action').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.actionId, 10);
            if (!confirm('¿Seguro que quieres eliminar esta acción?')) return;
            await window.apiPista.deleteAccionPista(id);
            scoutingState.acciones = scoutingState.acciones.filter(a => a.id !== id);
            refreshTimelineAndStats();
        });
    });

    // vincular eventos de edición de acción
    container.querySelectorAll('.btn-edit-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.actionId, 10);
            const accion = scoutingState.acciones.find(a => a.id === id);
            if (!accion) return;

            scoutingState.editingActionId = id;
            document.getElementById('edit-dorsal').value = accion.dorsal;
            document.getElementById('edit-tipo').value = accion.tipo_accion;
            document.getElementById('edit-tiempo').value = Number(accion.video_timestamp || 0).toFixed(2);
            document.getElementById('edit-resultado').value = accion.resultado;

            const editModal = document.getElementById('edit-action-modal');
            if (editModal) editModal.style.display = 'flex';
            scoutingState.wizardModalAbierto = true;
        });
    });

    // vincular clics en minuto/timestamp para ir a ese segundo en el vídeo
    container.querySelectorAll('.timeline-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            const ts = parseFloat(item.dataset.timestamp);
            if (Number.isFinite(ts)) {
                seekVideoTo(ts);
            }
        });
    });

    // vincular eventos favoritos punto
    container.querySelectorAll('.btn-fav-rally').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const idsStr = btn.dataset.rallyIds;
            if (!idsStr) return;
            const ids = idsStr.split(',').map(n => parseInt(n, 10));
            const acciones = scoutingState.acciones.filter(a => ids.includes(a.id));
            if (acciones.length === 0) return;
            const nuevoValor = acciones.every(a => a.es_favorito) ? 0 : 1;
            for (const a of acciones) {
                a.es_favorito = nuevoValor;
                await window.apiPista.updateAccionPista(a.id, { es_favorito: nuevoValor });
            }
            showToast(nuevoValor ? 'Punto añadido a favoritos ★' : 'Punto quitado de favoritos', nuevoValor ? 'success' : 'info');
            refreshTimelineAndStats();
        });
    });

    // guardar vídeo de un punto
    container.querySelectorAll('.btn-save-rally').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const ids = (btn.dataset.rallyIds || '').split(',').map(n => parseInt(n, 10)).filter(Number.isInteger);
            if (!ids.length) return;
            btn.disabled = true;
            showToast('Preparando el vídeo del punto...', 'info');
            try {
                const ruta = await window.apiPista.generateVideoHighlightsPista(scoutingState.partidoId, {
                    modo: 'puntos', ids, pre_margin: 3, post_margin: 2,
                    nombre_archivo: `punto_${scoutingState.setActual}_${btn.dataset.score}`
                });
                if (ruta) showToast('Vídeo del punto guardado', 'success');
            } catch (err) {
                showToast(err.message || 'Error al guardar el vídeo del punto', 'error');
            } finally {
                btn.disabled = false;
            }
        });
    });

    // vincular eventos eliminar punto
    container.querySelectorAll('.btn-delete-rally').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const idsStr = btn.dataset.rallyIds;
            if (!idsStr) return;
            const ids = idsStr.split(',').map(n => parseInt(n, 10));
            if (!confirm('¿Seguro que quieres eliminar todas las acciones de este punto?')) return;
            for (const id of ids) {
                await window.apiPista.deleteAccionPista(id);
            }
            scoutingState.acciones = scoutingState.acciones.filter(a => !ids.includes(a.id));
            refreshTimelineAndStats();
        });
    });

    // Stats
    const tbody = document.getElementById('live-stats-tbody');
    const statsObj = calcularStatsPista(scoutingState.acciones, scoutingState.roster);
    const listaStats = Object.values(statsObj.porJugador || {});
    if (statsObj.totalEquipo) listaStats.push(statsObj.totalEquipo);
    
    tbody.innerHTML = listaStats.map(s => `
        <tr ${s.dorsal === 'Equ' ? 'style="font-weight:bold; background:rgba(255,255,255,0.05); border-top:1px solid var(--border);"' : ''}>
            <td style="color:var(--accent); font-weight:bold;">${s.dorsal}</td>
            <td>${s.nombre}</td>
            <td>${s.saques_totales}/${s.saques_errores}/${s.saques_puntos}</td>
            <td>${s.recepciones_totales}/${s.recepciones_errores}/${s.recepciones_positivas_pct}%/${s.recepciones_errores_pct}%</td>
            <td>${s.ataques_totales}/${s.ataques_errores}/${s.ataques_bloqueados}/${s.ataques_puntos}/${s.ataques_eficiencia}%</td>
            <td>${s.bloqueos_puntos}</td>
            <td class="${s.ganados_perdidos > 0 ? 'text-green-400' : s.ganados_perdidos < 0 ? 'text-red-400' : ''}">
                ${s.ganados_perdidos > 0 ? '+' : ''}${s.ganados_perdidos}
            </td>
        </tr>
    `).join('');
}

// Modo "posiciones": los roles salen del colocador (único en pista). Contando desde su
// posición hacia P+1: receptor, central, opuesto, receptor, central.
// 1/2 = colocador u opuesto (zaguero/delantero), 3/4 = central/receptor delantero,
// 5/6 = central/receptor zaguero, 7 = líbero.
const ROLES_DESDE_COLOCADOR = ['colocador', 'receptor', 'central', 'opuesto', 'receptor', 'central'];
const TECLAS_POSICION = {
    1: { roles: ['colocador', 'opuesto'], zaguero: true },
    2: { roles: ['colocador', 'opuesto'], zaguero: false },
    3: { roles: ['central'], zaguero: false },
    4: { roles: ['receptor'], zaguero: false },
    5: { roles: ['central'], zaguero: true },
    6: { roles: ['receptor'], zaguero: true }
};

function findDorsalByPositionKey(n) {
    if (n === 7) {
        const liberos = getLiberosRoster();
        const enCampo = getDorsalesEnCampo();
        return (liberos.find(j => enCampo.includes(Number(j.dorsal))) || liberos[0])?.dorsal ?? null;
    }
    const def = TECLAS_POSICION[n];
    if (!def) return null;
    const lineup = scoutingState.rotacionesIniciales?.[scoutingState.setActual] || {};
    const colocadores = Object.values(lineup).filter(d => {
        const j = scoutingState.roster.find(r => Number(r.dorsal) === Number(d));
        return j?.posicion && j.posicion.trim().toLowerCase() === 'colocador';
    });
    if (colocadores.length !== 1) return null;
    const posColocador = getCurrentPositionForDorsal(colocadores[0]);
    if (posColocador === null) return null;

    for (let posNum = 1; posNum <= 6; posNum++) {
        const rol = ROLES_DESDE_COLOCADOR[(posNum - posColocador + 6) % 6];
        const zaguero = posNum === 1 || posNum === 5 || posNum === 6;
        if (zaguero === def.zaguero && def.roles.includes(rol)) {
            return lineup[slotEnPosicion(posNum, scoutingState.rotacionActual)] ?? null;
        }
    }
    return null;
}

function setupKeyboardShortcuts(container) {
    limpiarShortcuts();
    
    const resolvePendingDorsal = async () => {
        if (!scoutingState.dorsalInput) return;
        clearTimeout(scoutingState.dorsalTimer);
        const dorsal = parseInt(scoutingState.dorsalInput, 10);
        scoutingState.dorsalInput = '';

        const enCampo = getDorsalesEnCampo();
        const liberosDorsales = getLiberosRoster().map(j => j.dorsal);
        if (enCampo.length > 0 && !enCampo.includes(dorsal) && !liberosDorsales.includes(dorsal)) {
            showToast(`⚠️ El dorsal #${dorsal} no está en el campo ni es Líbero`, 'warning');
        } else {
            const player = await createOrGetPlayerByDorsal(dorsal);
            if (player) scoutingState.dorsalSeleccionado = dorsal;
        }
        updateUI();
    };

    keyHandler = async (e) => {
        if (scoutingState.wizardModalAbierto) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

        const key = e.key;
        const shortcut = actionForKey('pista', key);

        if (shortcut?.action === 'whistlePrevious' || shortcut?.action === 'whistleNext') {
            e.preventDefault();
            irASilbato(shortcut.action === 'whistleNext' ? 1 : -1);
            return;
        }

        // Reproductor de video
        if (shortcut?.action === 'videoPlayPause' || shortcut?.action === 'videoBackward' || shortcut?.action === 'videoForward') {
            e.preventDefault();
            if (shortcut.action === 'videoPlayPause') toggleVideoPlayPause();
            else if (shortcut.action === 'videoBackward') seekVideo(-(getPrefs().videoSeekSeconds || 5));
            else if (shortcut.action === 'videoForward') seekVideo(getPrefs().videoSeekSeconds || 5);
            return;
        }

        if (isRotationPending()) {
            if (shortcut?.action === 'undo') {
                document.getElementById('btn-undo').click();
            } else if (/[0-9]/.test(key) || shortcut) {
                showToast(`⚠️ No puedes registrar stats en el Set ${scoutingState.setActual} hasta que configures la rotación inicial`, 'warning');
            }
            return;
        }

        // Los subtipos tienen prioridad: así también se pueden personalizar con números.
        if (scoutingState.tipoAccion && SUBTIPOS_PISTA[scoutingState.tipoAccion]) {
            const sub = subtypeForKey('pista', scoutingState.tipoAccion, key);
            if (sub) {
                scoutingState.subtipo = sub.label;
                updateUI();
                return;
            }
        }

        // Selección de jugador por posición (1-7) en lugar de dorsal
        const modoPosiciones = getPrefs().playerSelectMode === 'posiciones';
        if (modoPosiciones && /^[1-7]$/.test(key)) {
            const n = Number(key);
            const dorsal = findDorsalByPositionKey(n);
            if (dorsal !== null) {
                scoutingState.dorsalSeleccionado = dorsal;
                updateUI();
            } else {
                showToast(`⚠️ No se encuentra al jugador de la tecla ${n} (¿hay un único colocador en pista?)`, 'warning');
            }
            return;
        }

        // Buffer Dorsal (Números)
        if (!modoPosiciones && /[0-9]/.test(key)) {
            clearTimeout(scoutingState.dorsalTimer);
            scoutingState.dorsalInput += key;
            updateUI();
            
            scoutingState.dorsalTimer = setTimeout(resolvePendingDorsal, 500);
            return;
        }

        // Si se escribe el resultado inmediatamente después del dorsal,
        // resolvemos el buffer antes de guardar para no perder la selección.
        await resolvePendingDorsal();

        // El tiempo muerto es una anotación independiente, no una acción de
        // jugador: la tecla T siempre abre su pregunta de equipo.
        if (shortcut?.action === 'registerTimeout') {
            await registrarTiempoMuerto();
            return;
        }

        // Tipo de Acción y Resultados via Shortcuts definidos
        if (shortcut) {
            const command = shortcut;
            if (command.action === 'selectAction') {
                scoutingState.tipoAccion = command.value;
                autoSeleccionarSacador();
                scoutingState.subtipo = null;
                updateUI();
            } else if (command.action === 'registerTimeout') {
                await registrarTiempoMuerto();
            } else if (command.action === 'resultPunto') {
                guardarAccion('#');
            } else if (command.action === 'resultError') {
                guardarAccion('=');
            } else if (command.action === 'resultBloqueado') {
                guardarAccion('/');
            } else if (command.action === 'resultPositiva') {
                guardarAccion('+');
            } else if (command.action === 'resultNegativa') {
                guardarAccion('!');
            } else if (command.action === 'resultPobre') {
                guardarAccion('-');
            } else if (command.action === 'undo') {
                document.getElementById('btn-undo').click();
            } else if (command.action === 'videoPlayPause') {
                toggleVideoPlayPause();
            } else if (command.action === 'videoForward') {
                seekVideo(getPrefs().videoSeekSeconds || 5);
            } else if (command.action === 'videoBackward') {
                seekVideo(-(getPrefs().videoSeekSeconds || 5));
            }
        } else {
            // Otros resultados directos
            return;
        }
    };
    
    document.addEventListener('keydown', keyHandler);

    speedHoldHandler = {
        down: (e) => {
            if (e.key !== keyFor('pista', 'video-speed-3x')) return;
            if (e.repeat) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
            if (router.getCurrentPage() !== 'scouting-pista') return;
            if (scoutingState.tipoAccion && SUBTIPOS_PISTA[scoutingState.tipoAccion]) {
                if (subtypeForKey('pista', scoutingState.tipoAccion, e.key)) return;
            }
            const video = document.getElementById('local-video');
            if (video) {
                video.playbackRate = 3;
                const indicator = document.getElementById('speed-indicator');
                if (indicator) indicator.textContent = '3x';
                return;
            }
            const iframe = document.getElementById('yt-iframe-player');
            if (iframe) {
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [3] }), '*');
                const indicator = document.getElementById('speed-indicator');
                if (indicator) indicator.textContent = '3x';
            }
        },
        up: (e) => {
            if (e.key !== keyFor('pista', 'video-speed-3x')) return;
            if (router.getCurrentPage() !== 'scouting-pista') return;
            const video = document.getElementById('local-video');
            if (video) {
                video.playbackRate = scoutingState.videoSpeed || 1;
                const indicator = document.getElementById('speed-indicator');
                if (indicator) indicator.textContent = `${scoutingState.videoSpeed || 1}x`;
                return;
            }
            const iframe = document.getElementById('yt-iframe-player');
            if (iframe) {
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [scoutingState.videoSpeed || 1] }), '*');
                const indicator = document.getElementById('speed-indicator');
                if (indicator) indicator.textContent = `${scoutingState.videoSpeed || 1}x`;
            }
        }
    };
    document.addEventListener('keydown', speedHoldHandler.down);
    document.addEventListener('keyup', speedHoldHandler.up);
}

function setupModalsEvents() {
    // 1. Edición
    const editModal = document.getElementById('edit-action-modal');
    document.getElementById('btn-close-edit')?.addEventListener('click', () => {
        editModal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
    });

    document.getElementById('timeline-items')?.addEventListener('dblclick', async (e) => {
        const item = e.target.closest('.timeline-item');
        if (!item) return;
        const id = parseInt(item.dataset.id);
        const accion = scoutingState.acciones.find(a => a.id === id);
        if (!accion) return;

        scoutingState.editingActionId = id;
        document.getElementById('edit-dorsal').value = accion.dorsal;
        document.getElementById('edit-tipo').value = accion.tipo_accion;
        document.getElementById('edit-tiempo').value = Number(accion.video_timestamp || 0).toFixed(2);
        document.getElementById('edit-resultado').value = accion.resultado;

        editModal.style.display = 'flex';
        scoutingState.wizardModalAbierto = true;
    });

    document.getElementById('btn-save-edit')?.addEventListener('click', async () => {
        if (!scoutingState.editingActionId) return;
        const dorsal = parseInt(document.getElementById('edit-dorsal').value);
        const tipo = document.getElementById('edit-tipo').value;
        const tiempo = parseFloat(document.getElementById('edit-tiempo').value);
        const res = document.getElementById('edit-resultado').value;

        if (!Number.isFinite(tiempo) || tiempo < 0) {
            showToast('Introduce un tiempo de vídeo válido', 'warning');
            return;
        }

        await window.apiPista.updateAccionPista(scoutingState.editingActionId, {
            dorsal, tipo_accion: tipo, resultado: res, video_timestamp: tiempo
        });

        editModal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
        scoutingState.editingActionId = null;
        scoutingState.acciones = await window.apiPista.getAccionesPista(scoutingState.partidoId);
        refreshTimelineAndStats();
        updateUI();
        showToast('Acción actualizada con éxito', 'success');
    });

    // 2. Rotación Modal
    const rotModal = document.getElementById('rotacion-modal');
    document.getElementById('btn-close-rotacion')?.addEventListener('click', () => {
        scoutingState.lineupPendiente = null;
        rotModal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
    });

    document.querySelectorAll('.btn-select-rotacion').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const rot = parseInt(e.target.closest('.btn-select-rotacion').dataset.rot);
            if (scoutingState.lineupPendiente) {
                await guardarLineupBase(lineupEnBaseR1(scoutingState.lineupPendiente, rot));
                scoutingState.lineupPendiente = null;
            }
            scoutingState.rotacionActual = rot;
            rotModal.style.display = 'none';
            scoutingState.wizardModalAbierto = false;
            updateUI();
            showToast(`Rotación fijada en R${rot}`, 'success');
        });
    });

    // 3. Notas Modal
    const notesModal = document.getElementById('notes-modal');
    document.getElementById('btn-close-notes')?.addEventListener('click', () => {
        notesModal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
    });

    document.getElementById('btn-save-notes')?.addEventListener('click', async () => {
        const notas = document.getElementById('partido-notas-text')?.value || '';
        await window.apiPista.updatePartidoPista(scoutingState.partidoId, { notas });
        scoutingState.partido.notas = notas;
        notesModal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
        showToast('Notas guardadas', 'success');
    });

    // 4. Ajustes Partido Modal
    const ajustesModal = document.getElementById('modal-ajustes-partido');
    document.getElementById('btn-close-ajustes')?.addEventListener('click', () => {
        ajustesModal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
    });

    const groupYoutube = document.getElementById('ajustes-group-youtube');
    const groupLocal = document.getElementById('ajustes-group-local');
    const radiosVideo = document.querySelectorAll('input[name="ajustes-video-tipo"]');
    radiosVideo.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            if (groupYoutube) groupYoutube.style.display = val === 'youtube' ? 'block' : 'none';
            if (groupLocal) groupLocal.style.display = val === 'local' ? 'block' : 'none';
        });
    });

    document.getElementById('btn-ajustes-elegir-local')?.addEventListener('click', async () => {
        try {
            const path = await window.api.openVideoFile();
            const inputLocalPath = document.getElementById('ajustes-local-path');
            if (path && inputLocalPath) {
                inputLocalPath.value = path;
            }
        } catch (err) {
            console.error("[Ajustes Pista] Error al seleccionar archivo local:", err);
        }
    });

    document.getElementById('btn-save-ajustes')?.addEventListener('click', async () => {
        const torneo = document.getElementById('ajustes-torneo')?.value || '';
        const fase = document.getElementById('ajustes-fase')?.value || '';
        const llevar_rotaciones = document.getElementById('ajustes-llevar-rotaciones')?.checked ? 1 : 0;
        
        const selectedRadio = document.querySelector('input[name="ajustes-video-tipo"]:checked');
        const tipoVal = selectedRadio ? selectedRadio.value : 'ninguno';
        let video_tipo = 'ninguno';
        let video_url = '';
        if (tipoVal === 'youtube') {
            video_tipo = 'youtube';
            video_url = document.getElementById('ajustes-youtube-url')?.value.trim() || '';
        } else if (tipoVal === 'local') {
            video_tipo = 'local';
            video_url = document.getElementById('ajustes-local-path')?.value.trim() || '';
        }

        await window.apiPista.updatePartidoPista(scoutingState.partidoId, { torneo, fase, llevar_rotaciones, video_tipo, video_url });
        scoutingState.partido.torneo = torneo;
        scoutingState.partido.fase = fase;
        scoutingState.partido.llevar_rotaciones = llevar_rotaciones;
        scoutingState.partido.video_tipo = video_tipo;
        scoutingState.partido.video_url = video_url;

        ajustesModal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
        showToast('Ajustes guardados', 'success');

        // Recargamos el scouting para aplicar los ajustes y recargar el reproductor
        router.navigate('scouting-pista', { partidoId: scoutingState.partidoId });
    });

    // 4b. Lineup Set Modal
    const lineupModal = document.getElementById('modal-lineup-set');
    document.getElementById('btn-close-lineup')?.addEventListener('click', () => {
        lineupModal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
    });

    document.getElementById('btn-save-lineup')?.addEventListener('click', async () => {
        const newLineup = {};
        let allSelected = true;
        const usedDorsals = new Set();
        const inputs = Array.from(document.querySelectorAll('.lineup-input'));

        for (const inp of inputs) {
            const pos = inp.dataset.pos;
            const val = inp.value;
            if (!val) {
                allSelected = false;
            } else {
                const num = parseInt(val, 10);
                if (usedDorsals.has(num)) {
                    showToast(`El dorsal #${num} está repetido en la alineación`, 'warning');
                    allSelected = false;
                }
                usedDorsals.add(num);
                newLineup[pos] = num;
                await createOrGetPlayerByDorsal(num);
            }
        }

        if (!allSelected) {
            if (!confirm("Faltan jugadores por asignar o hay dorsales repetidos. ¿Continuar de todas formas?")) {
                return;
            }
        }

        const colocadores = Object.entries(newLineup).filter(([pos, dorsal]) => {
            const p = scoutingState.roster.find(r => Number(r.dorsal) === Number(dorsal));
            return p && p.posicion && p.posicion.toLowerCase() === 'colocador';
        });

        lineupModal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;

        if (colocadores.length === 1) {
            const [posColocador, dorsalCol] = colocadores[0];
            // R = posición del colocador (colocador en P6 => R6).
            const rotAuto = parseInt(posColocador, 10) || 1;
            await guardarLineupBase(lineupEnBaseR1(newLineup, rotAuto));
            scoutingState.lineupPendiente = null;
            scoutingState.rotacionActual = rotAuto;
            showToast(`✅ Titulares guardados. Rotación R${rotAuto} asignada automáticamente (Colocador #${dorsalCol} en P${posColocador})`, 'success');
        } else {
            await guardarLineupBase(newLineup);
            scoutingState.lineupPendiente = newLineup;
            scoutingState.rotacionActual = 1;
            const subEl = document.getElementById('rotacion-modal-subtitle');
            if (subEl) {
                if (colocadores.length === 0) {
                    subEl.textContent = "⚠️ No se ha detectado ningún Colocador entre los titulares. Selecciona en qué rotación inicial (1 a 6) se encuentra tu equipo:";
                } else {
                    subEl.textContent = `ℹ️ Hay ${colocadores.length} colocadores en pista. Selecciona en qué rotación inicial (1 a 6) se encuentra tu equipo:`;
                }
            }
            document.getElementById('rotacion-modal').style.display = 'flex';
            scoutingState.wizardModalAbierto = true;
            showToast(colocadores.length === 0 ? "Selecciona la rotación inicial del equipo" : "Múltiples colocadores detectados, selecciona rotación inicial", 'info');
        }

        updateUI();
    });

    // 4c. Cambio Jugador Modal
    const cambioModal = document.getElementById('modal-cambio-jugador');
    document.getElementById('btn-close-cambio')?.addEventListener('click', () => {
        cambioModal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
    });

    document.getElementById('btn-save-cambio')?.addEventListener('click', async () => {
        const saleSelect = document.getElementById('cambio-sale');
        const entraInput = document.getElementById('cambio-entra');
        if (!saleSelect || !entraInput) return;

        const salePos = saleSelect.value;
        const dorsalSale = parseInt(saleSelect.selectedOptions[0]?.dataset.dorsal, 10) || 0;
        const valEntra = entraInput.value;

        if (!valEntra) {
            showToast('Por favor, indica el dorsal del jugador que entra', 'warning');
            return;
        }

        const dorsalEntra = resolverDorsalEntrada(valEntra);
        if (dorsalEntra === undefined) return;
        if (dorsalEntra === null || Number.isNaN(dorsalEntra)) {
            showToast('Indica el dorsal o el nombre del jugador que entra', 'warning');
            return;
        }
        if (dorsalEntra === dorsalSale) {
            showToast('El jugador que entra no puede ser el mismo que sale', 'warning');
            return;
        }

        await createOrGetPlayerByDorsal(dorsalEntra);

        if (!scoutingState.rotacionesIniciales[scoutingState.setActual]) {
            scoutingState.rotacionesIniciales[scoutingState.setActual] = {};
        }
        scoutingState.rotacionesIniciales[scoutingState.setActual][salePos] = dorsalEntra;
        await window.apiPista.updatePartidoPista(scoutingState.partidoId, {
            rotaciones_iniciales: JSON.stringify(scoutingState.rotacionesIniciales)
        });

        await window.apiPista.createAccionPista({
            partido_id: scoutingState.partidoId,
            dorsal: dorsalEntra,
            rotacion: getRotacionEfectiva(),
            tipo_accion: 'cambio',
            subtipo: `🔄 Entra #${dorsalEntra}, Sale #${dorsalSale}`,
            resultado: '+',
            set_numero: scoutingState.setActual,
            marcador_local: scoutingState.marcadorLocal.toString(),
            marcador_rival: scoutingState.marcadorRival.toString(),
            video_timestamp: getVideoTimestamp(),
            equipo_al_saque: scoutingState.equipoAlSaque
        });

        cambioModal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
        showToast(`🔄 Cambio registrado: Entra #${dorsalEntra} por #${dorsalSale}`, 'success');
        scoutingState.acciones = await window.apiPista.getAccionesPista(scoutingState.partidoId);
        updateUI();
        refreshTimelineAndStats();
    });

    // 5. Vídeos Modal
    const videosModal = document.getElementById('videos-modal');
    document.getElementById('btn-close-videos')?.addEventListener('click', () => {
        videosModal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
    });

    const modeSelector = document.getElementById('vid-generar-modo');
    const filtersContainer = document.getElementById('vid-filtros-container');
    const templateSelector = document.getElementById('vid-plantilla');
    const renderPreview = () => {
        const preview = document.getElementById('vid-preview');
        if (!preview) return;
        const modo = modeSelector?.value || 'filtrar';
        const puntoEntero = (modo === 'filtrar' || modo === 'aciertos') && !!document.getElementById('vid-punto-entero')?.checked;
        const dorsal = Number(document.getElementById('vid-dorsal')?.value || 0);
        const tipo = document.getElementById('vid-accion')?.value || '';
        const set = Number(document.getElementById('vid-set')?.value || 0);
        let seleccion = scoutingState.acciones.filter(a => a.video_timestamp > 0 && (!set || Number(a.set_numero) === set));
        if (modo === 'favoritos') seleccion = seleccion.filter(a => a.es_favorito);
        else {
            if (dorsal) seleccion = seleccion.filter(a => Number(a.dorsal) === dorsal);
            const tipoFinal = modo === 'puntos_ataques' ? 'ataque' : tipo;
            if (tipoFinal) seleccion = seleccion.filter(a => a.tipo_accion === tipoFinal);
            if (modo === 'aciertos') seleccion = seleccion.filter(a => a.resultado === '#' && ['saque', 'ataque', 'bloqueo'].includes(a.tipo_accion));
        }
        if (!seleccion.length) {
            preview.style.display = 'block';
            preview.innerHTML = '<span style="color:var(--text-muted);">No hay acciones con vídeo para esta selección.</span>';
            return;
        }
        preview.style.display = 'block';
        preview.innerHTML = `<strong style="font-size:12px;">${seleccion.length} acciones seleccionadas${puntoEntero || modo === 'puntos_ataques' ? ' · se exportará el punto entero de cada una' : ''}</strong><div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">${seleccion.slice(0, 12).map(a => `<button class="btn btn-sm btn-secondary btn-preview-video" data-time="${a.video_timestamp}" style="padding:4px 7px;">${formatTimestamp(a.video_timestamp)} · ${TIPOS_ACCION_PISTA[a.tipo_accion]?.abbr || a.tipo_accion}</button>`).join('')}${seleccion.length > 12 ? `<span style="font-size:12px; color:var(--text-muted); align-self:center;">+${seleccion.length - 12} más</span>` : ''}</div><p style="font-size:11px; color:var(--text-muted); margin:8px 0 0;">Pulsa un clip para llevar el vídeo a ese punto antes de exportar.</p>`;
        preview.querySelectorAll('.btn-preview-video').forEach(btn => btn.addEventListener('click', () => seekVideoTo(Number(btn.dataset.time))));
    };
    modeSelector?.addEventListener('change', (e) => {
        if (filtersContainer) {
            filtersContainer.style.display = e.target.value === 'favoritos' ? 'none' : 'flex';
        }
        const puntoEnteroWrap = document.getElementById('vid-punto-entero-wrap');
        if (puntoEnteroWrap) puntoEnteroWrap.style.display = ['filtrar', 'aciertos'].includes(e.target.value) ? 'flex' : 'none';
        const dorsalLabel = document.querySelector('label[for="vid-dorsal"]');
        if (dorsalLabel) dorsalLabel.textContent = e.target.value === 'puntos_ataques' ? 'Jugador que ataca' : 'Jugador / Dorsal';
        const accion = document.getElementById('vid-accion');
        if (accion) {
            accion.disabled = ['puntos_ataques', 'aciertos'].includes(e.target.value);
            if (e.target.value === 'puntos_ataques') accion.value = 'ataque';
            else if (e.target.value === 'aciertos') accion.value = '';
        }
        renderPreview();
    });

    templateSelector?.addEventListener('change', () => {
        const template = templateSelector.value;
        const accion = document.getElementById('vid-accion');
        if (template === 'ataques-jugador') {
            modeSelector.value = 'puntos_ataques';
            accion.value = 'ataque';
        } else if (template === 'aciertos') {
            modeSelector.value = 'aciertos';
        } else if (template === 'favoritos') {
            modeSelector.value = 'favoritos';
        } else if (template === 'saques' || template === 'recepciones') {
            modeSelector.value = 'filtrar';
            accion.value = template === 'saques' ? 'saque' : 'recepcion';
        }
        modeSelector.dispatchEvent(new Event('change'));
    });
    document.getElementById('btn-previsualizar-videos')?.addEventListener('click', renderPreview);
    document.getElementById('vid-punto-entero')?.addEventListener('change', renderPreview);

    if (window.apiPista && window.apiPista.onVideoProgressPista) {
        window.apiPista.onVideoProgressPista((pct) => {
            const bar = document.getElementById('vid-progress-bar');
            const txt = document.getElementById('vid-progress-text');
            if (bar && txt) {
                bar.style.width = pct + '%';
                txt.textContent = pct + '%';
            }
        });
    }

    document.getElementById('btn-generar-videos-run')?.addEventListener('click', async () => {
        const btnRun = document.getElementById('btn-generar-videos-run');
        let modo = modeSelector ? modeSelector.value : 'filtrar';
        // «Punto entero» sobre jugadas filtradas: mismo comportamiento que el modo de puntos completos.
        const soloAciertos = modo === 'aciertos';
        if (soloAciertos) modo = 'filtrar';
        if (modo === 'filtrar' && document.getElementById('vid-punto-entero')?.checked) modo = 'puntos_ataques';
        const filters = { modo };
        if (soloAciertos) filters.aciertos = true;

        const dorsal = document.getElementById('vid-dorsal')?.value;
        const acc = document.getElementById('vid-accion')?.value;
        const setNum = document.getElementById('vid-set')?.value;
        const mPre = document.getElementById('vid-margin-pre')?.value;
        const mPost = document.getElementById('vid-margin-post')?.value;

        if (modo !== 'favoritos') {
            if (dorsal) filters.dorsal = parseInt(dorsal, 10);
            if (modeSelector?.value === 'puntos_ataques') {
                filters.tipo_accion = 'ataque';
            } else if (acc && !soloAciertos) {
                filters.tipo_accion = acc;
            }
        }
        if (setNum) filters.set_numero = parseInt(setNum, 10);
        filters.pre_margin = mPre ? parseFloat(mPre) : 3;
        filters.post_margin = mPost ? parseFloat(mPost) : 2;

        btnRun.disabled = true;
        btnRun.textContent = '⏳ Generando vídeo...';

        const progContainer = document.getElementById('vid-progress-container');
        const progBar = document.getElementById('vid-progress-bar');
        const progText = document.getElementById('vid-progress-text');
        if (progContainer) progContainer.style.display = 'block';
        if (progBar) progBar.style.width = '0%';
        if (progText) progText.textContent = '0%';

        try {
            const path = await window.apiPista.generateVideoHighlightsPista(scoutingState.partidoId, filters);
            if (path) {
                showToast('Vídeo resumen exportado con éxito', 'success');
                videosModal.style.display = 'none';
                scoutingState.wizardModalAbierto = false;
            }
        } catch (err) {
            showToast(err.message || 'Error al exportar vídeo', 'error');
        } finally {
            btnRun.disabled = false;
            btnRun.textContent = '🚀 Exportar Vídeo Resumen';
            if (progContainer) progContainer.style.display = 'none';
        }
    });
}
