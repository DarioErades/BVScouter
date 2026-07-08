// pantalla de scouting en vivo - la mas importante de la app

import { router } from '../router.js';
import { showToast, formatTimestamp, getYoutubeId } from '../utils/helpers.js';
import { TIPOS_ACCION, SUBTIPOS, RESULTADOS, COMPLEJOS, SHORTCUTS } from '../utils/constants.js';
import { calcularStats } from '../utils/stats-calculator.js';

let scoutingState = null;
let keyHandler = null;

export function registerScouting() {
    router.register('scouting', async (container, params) => {
        const partido = await window.api.getPartido(params.partidoId);
        if (!partido) {
            showToast('Partido no encontrado', 'error');
            router.navigate('dashboard');
            return;
        }

        const acciones = await window.api.getAcciones(params.partidoId);

        // estado del scouting
        scoutingState = {
            partidoId: params.partidoId,
            partido,
            acciones,
            jugadorSeleccionado: partido.jugador1_id,
            complejo: 'K1',
            tipoAccion: null,
            subtipo: null,
            resultado: null,
            zona: '',
            setActual: 1,
            marcadorLocal: '0',
            marcadorRival: '0',
            videoSpeed: 1
        };

        // si hay acciones previas, cogemos el ultimo set y marcador
        if (acciones.length > 0) {
            const ultima = acciones[acciones.length - 1];
            scoutingState.setActual = ultima.set_numero;
            scoutingState.marcadorLocal = ultima.marcador_local;
            scoutingState.marcadorRival = ultima.marcador_rival;
        }

        container.style.padding = '16px';
        renderScoutingUI(container);
        setupVideoPlayer(container);
        setupKeyboardShortcuts(container);
        updateLiveStats();
    });
}

function renderScoutingUI(container) {
    const { partido } = scoutingState;
    const j1Nombre = `${partido.jugador1_nombre} ${partido.jugador1_apellidos}`;
    const j2Nombre = `${partido.jugador2_nombre} ${partido.jugador2_apellidos}`;

    container.innerHTML = `
        <div class="scouting-layout">
            <!-- cabecera del partido -->
            <div class="scouting-header">
                <div class="match-info">
                    <div>
                        <div class="match-info-label">Torneo</div>
                        <div class="match-info-value">${partido.torneo || 'Sin torneo'}</div>
                    </div>
                    <div>
                        <div class="match-info-label">Fase</div>
                        <div class="match-info-value">${partido.fase || '-'}</div>
                    </div>
                    <div>
                        <div class="match-info-label">Rivales</div>
                        <div class="match-info-value">${j1Nombre} / ${j2Nombre}</div>
                    </div>
                </div>
                <div class="flex gap-12 items-center">
                    <div class="scoreboard">
                        <span class="set-label" id="set-label">SET ${scoutingState.setActual}</span>
                        <span class="score" id="score-local">${scoutingState.marcadorLocal}</span>
                        <span class="score-separator">-</span>
                        <span class="score" id="score-rival">${scoutingState.marcadorRival}</span>
                    </div>
                    <button class="btn btn-sm btn-secondary" id="btn-guardar-partido">💾 Guardar</button>
                    <button class="btn btn-sm btn-secondary" id="btn-ver-informe">📊 Informe</button>
                    <button class="btn btn-sm btn-secondary" id="btn-volver">← Volver</button>
                </div>
            </div>

            <!-- reproductor de video -->
            <div class="video-container" id="video-container">
                ${renderVideoPlayer()}
            </div>

            <!-- panel de acciones -->
            <div class="action-panel">
                <div class="action-panel-title">Panel de Registro</div>

                <!-- seleccion de jugador -->
                <div>
                    <div class="form-label">Jugador</div>
                    <div class="player-selector">
                        <button class="player-btn ${scoutingState.jugadorSeleccionado === partido.jugador1_id ? 'active' : ''}"
                                data-player="${partido.jugador1_id}" id="player-btn-1">
                            ${partido.jugador1_nombre} ${partido.jugador1_apellidos.charAt(0)}.
                            <span class="player-shortcut">Tecla: 1</span>
                        </button>
                        <button class="player-btn ${scoutingState.jugadorSeleccionado === partido.jugador2_id ? 'active' : ''}"
                                data-player="${partido.jugador2_id}" id="player-btn-2">
                            ${partido.jugador2_nombre} ${partido.jugador2_apellidos.charAt(0)}.
                            <span class="player-shortcut">Tecla: 2</span>
                        </button>
                    </div>
                </div>

                <!-- seleccion de complejo -->
                <div>
                    <div class="form-label">Complejo <span class="text-muted">(Q)</span></div>
                    <div class="complex-selector">
                        <button class="complex-btn ${scoutingState.complejo === 'K1' ? 'active' : ''}" data-complex="K1">K1 Side-Out</button>
                        <button class="complex-btn ${scoutingState.complejo === 'K2' ? 'active' : ''}" data-complex="K2">K2 Transición</button>
                    </div>
                </div>

                <!-- tipo de accion -->
                <div>
                    <div class="form-label">Tipo de Acción</div>
                    <div class="action-buttons">
                        ${Object.entries(TIPOS_ACCION).map(([key, label]) => `
                            <button class="action-btn ${scoutingState.tipoAccion === key ? 'selected' : ''}"
                                    data-action="${key}">
                                ${label}
                                <span class="shortcut-hint">${key.charAt(0).toUpperCase()}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- subtipos (se muestran segun la accion seleccionada) -->
                <div id="subtipo-container" style="${scoutingState.tipoAccion ? '' : 'display:none;'}">
                    <div class="form-label">Subtipo</div>
                    <div class="subtype-buttons" id="subtype-buttons">
                        ${renderSubtipos()}
                    </div>
                </div>

                <!-- zona del campo -->
                <div>
                    <div class="form-label">Zona del Campo</div>
                    <div class="court-grid" id="court-grid">
                        ${[1, 2, 3, 4, 5, 6].map(z => `
                            <div class="court-zone ${scoutingState.zona === z.toString() ? 'selected' : ''}" data-zone="${z}">${z}</div>
                        `).join('')}
                    </div>
                </div>

                <!-- resultado -->
                <div>
                    <div class="form-label">Resultado</div>
                    <div class="result-buttons">
                        <button class="result-btn punto ${scoutingState.resultado === 'punto' ? 'selected' : ''}" data-result="punto">
                            ✓ Punto
                        </button>
                        <button class="result-btn error ${scoutingState.resultado === 'error' ? 'selected' : ''}" data-result="error">
                            ✗ Error
                        </button>
                        <button class="result-btn continuidad ${scoutingState.resultado === 'continuidad' ? 'selected' : ''}" data-result="continuidad">
                            ↺ Cont.
                        </button>
                    </div>
                </div>

                <!-- accion actual -->
                <div class="current-action" id="current-action">
                    <div class="current-action-label">Acción Actual</div>
                    <div class="current-action-value" id="current-action-text">Selecciona jugador y acción</div>
                </div>

                <!-- boton confirmar -->
                <button class="confirm-action-btn" id="btn-confirmar">
                    📝 Registrar Acción
                </button>

                <!-- deshacer -->
                <button class="btn btn-sm btn-secondary" id="btn-undo" style="width: 100%; margin-top: 4px;">
                    ↩️ Deshacer Última (Z)
                </button>
            </div>

            <!-- timeline de acciones -->
            <div class="timeline-container">
                <div class="timeline-title">Historial de Acciones (${scoutingState.acciones.length})</div>
                <div class="timeline-items" id="timeline-items">
                    ${renderTimeline()}
                </div>
            </div>

            <!-- estadisticas en vivo -->
            <div class="live-stats" id="live-stats">
                ${renderLiveStats()}
            </div>
        </div>
    `;

    setupActionPanelEvents(container);
}

function renderVideoPlayer() {
    const { partido } = scoutingState;

    if (!partido.video_tipo || !partido.video_url) {
        return `
            <div class="video-placeholder">
                <div class="video-placeholder-icon">🎬</div>
                <p>Sin vídeo cargado</p>
                <p style="font-size: 12px; margin-top: 4px;">Puedes añadir un vídeo editando el partido</p>
            </div>
        `;
    }

    if (partido.video_tipo === 'youtube') {
        const youtubeId = getYoutubeId(partido.video_url);
        if (!youtubeId) {
            return `<div class="video-placeholder"><p>URL de YouTube no válida</p></div>`;
        }
        return `
            <iframe id="youtube-player"
                src="https://www.youtube-nocookie.com/embed/${youtubeId}?enablejsapi=1&rel=0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                sandbox="allow-scripts allow-same-origin allow-presentation">
            </iframe>
        `;
    }

    // video local
    return `
        <video id="local-video" preload="metadata">
            <source src="${partido.video_url}" type="video/mp4">
            Tu navegador no soporta la reproducción de vídeo
        </video>
        <div class="video-controls" id="video-controls">
            <button id="btn-play-pause">▶</button>
            <div class="video-progress" id="video-progress">
                <div class="video-progress-bar" id="video-progress-bar"></div>
            </div>
            <span class="video-time" id="video-time">00:00 / 00:00</span>
            <span class="speed-indicator" id="speed-indicator">1x</span>
            <button id="btn-fullscreen">⛶</button>
        </div>
    `;
}

function setupVideoPlayer(container) {
    const video = document.getElementById('local-video');
    if (!video) return;

    const progressBar = document.getElementById('video-progress-bar');
    const timeDisplay = document.getElementById('video-time');
    const playPause = document.getElementById('btn-play-pause');
    const progress = document.getElementById('video-progress');
    const fullscreen = document.getElementById('btn-fullscreen');

    video.addEventListener('timeupdate', () => {
        const pct = (video.currentTime / video.duration) * 100;
        progressBar.style.width = pct + '%';
        timeDisplay.textContent = `${formatTimestamp(video.currentTime)} / ${formatTimestamp(video.duration)}`;
    });

    video.addEventListener('play', () => { playPause.textContent = '⏸'; });
    video.addEventListener('pause', () => { playPause.textContent = '▶'; });

    playPause.addEventListener('click', () => {
        video.paused ? video.play() : video.pause();
    });

    progress.addEventListener('click', (e) => {
        const rect = progress.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        video.currentTime = pct * video.duration;
    });

    fullscreen.addEventListener('click', () => {
        const videoContainer = document.getElementById('video-container');
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            videoContainer.requestFullscreen();
        }
    });
}

function setupActionPanelEvents(container) {
    const { partido } = scoutingState;

    // selector de jugador
    document.querySelectorAll('.player-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            scoutingState.jugadorSeleccionado = parseInt(btn.dataset.player);
            document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCurrentActionText();
        });
    });

    // selector de complejo
    document.querySelectorAll('.complex-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            scoutingState.complejo = btn.dataset.complex;
            document.querySelectorAll('.complex-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCurrentActionText();
        });
    });

    // botones de accion
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            scoutingState.tipoAccion = btn.dataset.action;
            scoutingState.subtipo = null;
            document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            const subtipoContainer = document.getElementById('subtipo-container');
            subtipoContainer.style.display = '';
            document.getElementById('subtype-buttons').innerHTML = renderSubtipos();

            // re-bindear eventos de subtipos
            document.querySelectorAll('.subtype-btn').forEach(sb => {
                sb.addEventListener('click', () => {
                    scoutingState.subtipo = sb.dataset.subtype;
                    document.querySelectorAll('.subtype-btn').forEach(s => s.classList.remove('selected'));
                    sb.classList.add('selected');
                    updateCurrentActionText();
                });
            });

            updateCurrentActionText();
        });
    });

    // zonas del campo
    document.querySelectorAll('.court-zone').forEach(zone => {
        zone.addEventListener('click', () => {
            scoutingState.zona = zone.dataset.zone;
            document.querySelectorAll('.court-zone').forEach(z => z.classList.remove('selected'));
            zone.classList.add('selected');
        });
    });

    // botones de resultado
    document.querySelectorAll('.result-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            scoutingState.resultado = btn.dataset.result;
            document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            updateCurrentActionText();
        });
    });

    // boton confirmar
    document.getElementById('btn-confirmar').addEventListener('click', registrarAccion);

    // boton deshacer
    document.getElementById('btn-undo').addEventListener('click', deshacerUltimaAccion);

    // botones de cabecera
    document.getElementById('btn-guardar-partido').addEventListener('click', async () => {
        await guardarPartido();
        showToast('Partido guardado', 'success');
    });

    document.getElementById('btn-ver-informe').addEventListener('click', () => {
        limpiarShortcuts();
        router.navigate('informe', { partidoId: scoutingState.partidoId });
    });

    document.getElementById('btn-volver').addEventListener('click', () => {
        limpiarShortcuts();
        router.navigate('dashboard');
    });
}

function setupKeyboardShortcuts(container) {
    // limpiamos handler anterior si existe
    limpiarShortcuts();

    keyHandler = (e) => {
        // ignorar si estamos escribiendo en un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (router.getCurrentPage() !== 'scouting') return;

        const key = e.key;
        const shortcut = SHORTCUTS[key];

        if (!shortcut) return;

        e.preventDefault();

        switch (shortcut.action) {
            case 'selectPlayer':
                const playerId = shortcut.value === 1
                    ? scoutingState.partido.jugador1_id
                    : scoutingState.partido.jugador2_id;
                scoutingState.jugadorSeleccionado = playerId;
                document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
                document.querySelector(`[data-player="${playerId}"]`)?.classList.add('active');
                updateCurrentActionText();
                break;

            case 'toggleComplex':
                scoutingState.complejo = scoutingState.complejo === 'K1' ? 'K2' : 'K1';
                document.querySelectorAll('.complex-btn').forEach(b => b.classList.remove('active'));
                document.querySelector(`[data-complex="${scoutingState.complejo}"]`)?.classList.add('active');
                updateCurrentActionText();
                break;

            case 'selectAction':
                document.querySelector(`[data-action="${shortcut.value}"]`)?.click();
                break;

            case 'setResult':
                scoutingState.resultado = shortcut.value;
                document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('selected'));
                document.querySelector(`[data-result="${shortcut.value}"]`)?.classList.add('selected');
                updateCurrentActionText();
                // si ya tenemos todo, registramos directamente
                if (scoutingState.tipoAccion) {
                    registrarAccion();
                }
                break;

            case 'undo':
                deshacerUltimaAccion();
                break;

            case 'addPoint':
                // no hacemos nada extra, ya se gestiona en registrar accion
                break;

            case 'newSet':
                scoutingState.setActual++;
                scoutingState.marcadorLocal = '0';
                scoutingState.marcadorRival = '0';
                document.getElementById('set-label').textContent = `SET ${scoutingState.setActual}`;
                document.getElementById('score-local').textContent = '0';
                document.getElementById('score-rival').textContent = '0';
                showToast(`Set ${scoutingState.setActual} iniciado`, 'info');
                break;

            // controles de video
            case 'videoPlayPause':
                toggleVideoPlayPause();
                break;
            case 'videoForward':
                seekVideo(5);
                break;
            case 'videoBackward':
                seekVideo(-5);
                break;
            case 'videoFrameForward':
                seekVideo(1 / 30);
                break;
            case 'videoFrameBackward':
                seekVideo(-1 / 30);
                break;
            case 'videoSlower':
                changeVideoSpeed(-0.25);
                break;
            case 'videoFaster':
                changeVideoSpeed(0.25);
                break;
            case 'videoFullscreen':
                const vc = document.getElementById('video-container');
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    vc?.requestFullscreen();
                }
                break;
        }
    };

    document.addEventListener('keydown', keyHandler);
}

function limpiarShortcuts() {
    if (keyHandler) {
        document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
    }
}

// funciones de video
function toggleVideoPlayPause() {
    const video = document.getElementById('local-video');
    if (video) {
        video.paused ? video.play() : video.pause();
    }
}

function seekVideo(seconds) {
    const video = document.getElementById('local-video');
    if (video) {
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    }
}

function changeVideoSpeed(delta) {
    const video = document.getElementById('local-video');
    if (video) {
        scoutingState.videoSpeed = Math.max(0.25, Math.min(4, scoutingState.videoSpeed + delta));
        video.playbackRate = scoutingState.videoSpeed;
        const indicator = document.getElementById('speed-indicator');
        if (indicator) indicator.textContent = `${scoutingState.videoSpeed}x`;
        showToast(`Velocidad: ${scoutingState.videoSpeed}x`, 'info');
    }
}

function getVideoTimestamp() {
    const video = document.getElementById('local-video');
    return video ? video.currentTime : 0;
}

// registrar accion
async function registrarAccion() {
    if (!scoutingState.tipoAccion) {
        showToast('Selecciona un tipo de acción', 'error');
        return;
    }

    const data = {
        partido_id: scoutingState.partidoId,
        jugador_id: scoutingState.jugadorSeleccionado,
        complejo: scoutingState.complejo,
        tipo_accion: scoutingState.tipoAccion,
        subtipo: scoutingState.subtipo || '',
        resultado: scoutingState.resultado || 'continuidad',
        set_numero: scoutingState.setActual,
        marcador_local: scoutingState.marcadorLocal,
        marcador_rival: scoutingState.marcadorRival,
        video_timestamp: getVideoTimestamp(),
        zona_campo: scoutingState.zona
    };

    const accionId = await window.api.createAccion(data);
    data.id = accionId;
    scoutingState.acciones.push(data);

    // flash visual
    const panel = document.querySelector('.action-panel');
    panel.classList.add('action-flash');
    setTimeout(() => panel.classList.remove('action-flash'), 500);

    // actualizamos timeline
    const timelineItems = document.getElementById('timeline-items');
    const timelineTitle = document.querySelector('.timeline-title');
    timelineTitle.textContent = `Historial de Acciones (${scoutingState.acciones.length})`;
    timelineItems.innerHTML = renderTimeline();

    // reset parcial del estado
    scoutingState.tipoAccion = null;
    scoutingState.subtipo = null;
    scoutingState.resultado = null;
    scoutingState.zona = '';

    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.court-zone').forEach(z => z.classList.remove('selected'));
    document.querySelectorAll('.subtype-btn').forEach(s => s.classList.remove('selected'));
    document.getElementById('subtipo-container').style.display = 'none';

    updateCurrentActionText();
    updateLiveStats();

    showToast('Acción registrada ✓', 'success');
}

async function deshacerUltimaAccion() {
    if (scoutingState.acciones.length === 0) {
        showToast('No hay acciones para deshacer', 'error');
        return;
    }

    await window.api.undoLastAccion(scoutingState.partidoId);
    scoutingState.acciones.pop();

    const timelineItems = document.getElementById('timeline-items');
    const timelineTitle = document.querySelector('.timeline-title');
    timelineTitle.textContent = `Historial de Acciones (${scoutingState.acciones.length})`;
    timelineItems.innerHTML = renderTimeline();

    updateLiveStats();
    showToast('Última acción deshecha', 'info');
}

async function guardarPartido() {
    const resultado = `${scoutingState.marcadorLocal}-${scoutingState.marcadorRival}`;
    await window.api.updatePartido(scoutingState.partidoId, { resultado });
}

// renders parciales
function renderSubtipos() {
    if (!scoutingState.tipoAccion) return '';
    const subtipos = SUBTIPOS[scoutingState.tipoAccion] || [];
    return subtipos.map(sub => `
        <button class="subtype-btn ${scoutingState.subtipo === sub ? 'selected' : ''}" data-subtype="${sub}">${sub}</button>
    `).join('');
}

function renderTimeline() {
    return scoutingState.acciones.slice(-30).reverse().map(a => {
        const resultado = a.resultado || 'continuidad';
        const tipoLabel = TIPOS_ACCION[a.tipo_accion] || a.tipo_accion;
        const isJ1 = a.jugador_id === scoutingState.partido.jugador1_id;
        const playerTag = isJ1 ? 'J1' : 'J2';
        return `
            <div class="timeline-item ${resultado}">
                <span class="timestamp">${formatTimestamp(a.video_timestamp)}</span>
                <strong>${playerTag}</strong>
                ${tipoLabel}
                ${a.subtipo ? `· ${a.subtipo}` : ''}
                ${RESULTADOS[resultado]?.icon || ''}
            </div>
        `;
    }).join('');
}

function renderLiveStats() {
    const { acciones, partido } = scoutingState;
    const stats = calcularStats(acciones, partido.jugador1_id, partido.jugador2_id);

    const j1 = stats.jugador1;
    const j2 = stats.jugador2;

    return `
        <div class="live-stat-card">
            <div class="live-stat-value text-accent">${j1.sideOutPct}%</div>
            <div class="live-stat-label">Side-Out ${partido.jugador1_nombre}</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value text-accent">${j2.sideOutPct}%</div>
            <div class="live-stat-label">Side-Out ${partido.jugador2_nombre}</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value" style="color: var(--accent-success)">${j1.killsAtaque + j2.killsAtaque}</div>
            <div class="live-stat-label">Ataques Ganadores</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value" style="color: var(--accent-error)">${j1.erroresAtaque + j2.erroresAtaque}</div>
            <div class="live-stat-label">Errores de Ataque</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value">${acciones.length}</div>
            <div class="live-stat-label">Total Acciones</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value">${stats.general.sideOutGeneral}%</div>
            <div class="live-stat-label">Side-Out General</div>
        </div>
    `;
}

function updateLiveStats() {
    const statsContainer = document.getElementById('live-stats');
    if (statsContainer) {
        statsContainer.innerHTML = renderLiveStats();
    }
}

function updateCurrentActionText() {
    const text = document.getElementById('current-action-text');
    if (!text) return;

    const parts = [];
    const isJ1 = scoutingState.jugadorSeleccionado === scoutingState.partido.jugador1_id;
    parts.push(isJ1 ? scoutingState.partido.jugador1_nombre : scoutingState.partido.jugador2_nombre);
    parts.push(`[${scoutingState.complejo}]`);
    if (scoutingState.tipoAccion) parts.push(TIPOS_ACCION[scoutingState.tipoAccion]);
    if (scoutingState.subtipo) parts.push(scoutingState.subtipo);
    if (scoutingState.resultado) parts.push(RESULTADOS[scoutingState.resultado].icon);

    text.textContent = parts.join(' → ');
}
