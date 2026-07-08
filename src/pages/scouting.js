// pantalla de scouting en vivo - la mas importante de la app

import { router } from '../router.js';
import { showToast, formatTimestamp, getYoutubeId } from '../utils/helpers.js';
import { TIPOS_ACCION, SUBTIPOS, RESULTADOS, COMPLEJOS, SHORTCUTS } from '../utils/constants.js';
import { calcularStats } from '../utils/stats-calculator.js';

let scoutingState = null;
let keyHandler = null;
let processSubtypeKey = null;

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
            equipoAlSaque: 'local', // 'local' o 'rival'
            tipoAccion: null,
            subtipo: null,
            setActual: 1,
            marcadorLocal: 0,
            marcadorRival: 0,
            videoSpeed: 1,
            wizardModalAbierto: false,
            wizardActionType: null,
            attackWizard: { step: 1, type: null, dir: null, result: null },
            allowFullscreenSelectors: true,
            enterTimer: null,
            backspaceTimer: null
        };

        // si hay acciones previas, cogemos el ultimo set
        if (acciones.length > 0) {
            const ultima = acciones[acciones.length - 1];
            scoutingState.setActual = ultima.set_numero;
        }

        // El marcador real final de la sesión está en partido.resultado
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
        refreshTimelineAndStats();
    });
}

function renderScoutingUI(container) {
    const { partido } = scoutingState;
    const j1Nombre = `${partido.jugador1_nombre} ${partido.jugador1_apellidos}`;
    const j2Nombre = `${partido.jugador2_nombre} ${partido.jugador2_apellidos}`;

    const hasVideo = partido.video_tipo && partido.video_url;

    container.innerHTML = `
        <div class="scouting-layout ${!hasVideo ? 'no-video' : ''}">
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
                    <label class="switch-container" style="display:flex; align-items:center; gap:8px; margin-right:16px; cursor:pointer;">
                        <span class="form-label" style="margin:0; font-size:12px;">Pantalla Completa</span>
                        <div class="toggle-switch">
                            <input type="checkbox" id="switch-fullscreen" ${scoutingState.allowFullscreenSelectors ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </div>
                    </label>
                    <div class="scoreboard-controls">
                        <div class="scoreboard">
                            <div class="server-indicator local ${scoutingState.equipoAlSaque === 'local' ? 'active' : ''}" id="server-local">🏐</div>
                            <span class="set-label" id="set-label">SET ${scoutingState.setActual}</span>
                            <span class="score" id="score-local" title="Click Izq: +1 | Click Der: -1">${scoutingState.marcadorLocal}</span>
                            <span class="score-separator">-</span>
                            <span class="score" id="score-rival" title="Click Izq: +1 | Click Der: -1">${scoutingState.marcadorRival}</span>
                            <div class="server-indicator rival ${scoutingState.equipoAlSaque === 'rival' ? 'active' : ''}" id="server-rival">🏐</div>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-primary" id="btn-finalizar-set">🏁 Finalizar Set</button>
                    <button class="btn btn-sm btn-secondary" id="btn-notas-partido">📝 Notas</button>
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

                <!-- tipo de accion -->
                <div>
                    <div class="form-label">Tipo de Acción</div>
                    <div class="action-buttons">
                        ${Object.entries(TIPOS_ACCION).map(([key, config]) => `
                            <button class="action-btn ${scoutingState.tipoAccion === key ? 'selected' : ''}"
                                    data-action="${key}">
                                ${config.label}
                                <span class="shortcut-hint">${config.key.toUpperCase()}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- subtipos (se muestran segun la accion seleccionada) -->
                <div id="subtipo-container" style="${scoutingState.tipoAccion && scoutingState.tipoAccion !== 'ataque' ? '' : 'display:none;'}">
                    <div class="form-label">Subtipo (Pulsa la tecla para registrar)</div>
                    <div class="subtype-buttons" id="subtype-buttons">
                        ${renderSubtipos()}
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
            <div class="timeline-container" id="timeline-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div class="timeline-title" style="margin-bottom: 0;">Historial de Acciones (${scoutingState.acciones.length})</div>
                    <button class="btn btn-sm btn-secondary" id="btn-fullscreen-timeline" title="Alternar pantalla completa" style="padding: 4px 8px;">⛶</button>
                </div>
                <div class="timeline-items" id="timeline-items">
                    ${renderTimeline()}
                </div>
            </div>

            <!-- estadisticas en vivo -->
            <div class="live-stats" id="live-stats">
                ${renderLiveStats()}
            </div>

            <!-- modal de ataque gigante (wizard) -->
            <div class="attack-modal ${scoutingState.allowFullscreenSelectors ? '' : 'inline-modal'}" id="attack-modal" style="display: none;">
                <div class="attack-modal-content" id="attack-modal-content">
                    <!-- Se rellena dinamicamente -->
                </div>
            </div>
        </div>

        <!-- modal de notas del partido -->
        <div class="attack-modal" id="notes-modal" style="display: none;">
            <div class="notes-modal-content">
                <div class="notes-header">
                    <h3>📝 Notas del Partido</h3>
                    <button id="btn-close-notes" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div class="notes-toolbar">
                    <button class="btn btn-sm btn-secondary" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)"><b>B</b></button>
                    <button class="btn btn-sm btn-secondary" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)"><i>I</i></button>
                    <button class="btn btn-sm btn-secondary" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)"><u>U</u></button>
                    <button class="btn btn-sm btn-secondary" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)">• Lista</button>
                    <button class="btn btn-sm btn-secondary" onmousedown="event.preventDefault(); document.execCommand('insertOrderedList', false, null)">1. Lista</button>
                </div>
                <div id="notes-editor" class="notes-editor" contenteditable="true" spellcheck="false"></div>
                <div class="notes-footer">
                    <button id="btn-save-notes" class="btn btn-primary">💾 Guardar Notas</button>
                </div>
            </div>
        </div>

        <!-- modal de edicion de accion -->
        <div class="attack-modal" id="edit-action-modal" style="display: none;">
            <div class="notes-modal-content" style="max-width: 400px;">
                <div class="notes-header">
                    <h3>✏️ Editar Acción</h3>
                    <button id="btn-close-edit" class="btn btn-sm btn-secondary">✖</button>
                </div>
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <label class="form-label">Jugador</label>
                        <select id="edit-jugador" class="form-input">
                            <option value="${partido.jugador1_id}">${partido.jugador1_nombre} ${partido.jugador1_apellidos}</option>
                            <option value="${partido.jugador2_id}">${partido.jugador2_nombre} ${partido.jugador2_apellidos}</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Tipo de Acción</label>
                        <select id="edit-tipo" class="form-input">
                            <option value="saque">Saque</option>
                            <option value="recepcion">Recepción</option>
                            <option value="colocacion">Colocación</option>
                            <option value="ataque">Ataque</option>
                            <option value="bloqueo">Bloqueo</option>
                            <option value="defensa">Defensa</option>
                            <option value="rival">Acierto Rival</option>
                            <option value="error_general">Error General</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Subtipo (Detalle)</label>
                        <select id="edit-subtipo" class="form-input"></select>
                    </div>
                    <div>
                        <label class="form-label">Resultado Final</label>
                        <select id="edit-resultado" class="form-input">
                            <option value="punto">Punto</option>
                            <option value="error">Error</option>
                            <option value="continuidad">Continuidad</option>
                            <option value="bloqueado">Bloqueado</option>
                        </select>
                    </div>
                </div>
                <div class="notes-footer">
                    <button id="btn-save-edit" class="btn btn-primary">💾 Guardar Cambios</button>
                </div>
            </div>
        </div>
    `;

    setupActionPanelEvents(container);
    setupNotesEvents();
    setupEditActionEvents();
}

function setupNotesEvents() {
    const modal = document.getElementById('notes-modal');
    const btnOpen = document.getElementById('btn-notas-partido');
    const btnClose = document.getElementById('btn-close-notes');
    const btnSave = document.getElementById('btn-save-notes');
    const editor = document.getElementById('notes-editor');

    btnOpen.addEventListener('click', () => {
        // Cargar notas actuales
        editor.innerHTML = scoutingState.partido.notas || '';
        modal.style.display = 'flex';
        scoutingState.wizardModalAbierto = true; // reutilizamos esto para pausar atajos
        setTimeout(() => editor.focus(), 50);
    });

    btnClose.addEventListener('click', () => {
        modal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
    });

    btnSave.addEventListener('click', async () => {
        const html = editor.innerHTML;
        scoutingState.partido.notas = html;
        await window.api.updatePartido(scoutingState.partidoId, { notas: html });
        showToast('Notas guardadas', 'success');
        modal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
    });
}

function setupEditActionEvents() {
    const modal = document.getElementById('edit-action-modal');
    const btnClose = document.getElementById('btn-close-edit');
    const btnSave = document.getElementById('btn-save-edit');

    btnClose.addEventListener('click', () => {
        modal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
        scoutingState.editingActionId = null;
    });

    const tipoSelect = document.getElementById('edit-tipo');
    tipoSelect.addEventListener('change', (e) => {
        populateEditSubtipo(e.target.value, '');
    });

    btnSave.addEventListener('click', async () => {
        if (!scoutingState.editingActionId) return;

        const updatedData = {
            jugador_id: parseInt(document.getElementById('edit-jugador').value, 10),
            tipo_accion: document.getElementById('edit-tipo').value,
            subtipo: document.getElementById('edit-subtipo').value,
            resultado: document.getElementById('edit-resultado').value
        };

        await window.api.updateAccion(scoutingState.editingActionId, updatedData);
        
        // update local state
        const idx = scoutingState.acciones.findIndex(a => a.id === scoutingState.editingActionId);
        if (idx !== -1) {
            scoutingState.acciones[idx] = { ...scoutingState.acciones[idx], ...updatedData };
        }

        showToast('Acción actualizada', 'success');
        modal.style.display = 'none';
        scoutingState.wizardModalAbierto = false;
        scoutingState.editingActionId = null;
        
        refreshTimelineAndStats();
    });
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
    const srcUrl = partido.video_url.startsWith('http') ? partido.video_url : `local-video://video?path=${encodeURIComponent(partido.video_url)}`;
    return `
        <video id="local-video" preload="metadata">
            <source src="${srcUrl}">
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

    // toggle pantalla completa selectores
    const switchFullscreen = document.getElementById('switch-fullscreen');
    if (switchFullscreen) {
        switchFullscreen.addEventListener('change', (e) => {
            scoutingState.allowFullscreenSelectors = e.target.checked;
            const modal = document.getElementById('attack-modal');
            if (scoutingState.allowFullscreenSelectors) {
                modal.classList.remove('inline-modal');
            } else {
                modal.classList.add('inline-modal');
            }
        });
    }

    // botones de accion
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectActionType(btn.dataset.action);
        });
    });

    // botones de score (click izq sumar, click der restar)
    const scoreLocal = document.getElementById('score-local');
    const scoreRival = document.getElementById('score-rival');

    scoreLocal.addEventListener('click', () => updateScore('local', 1));
    scoreLocal.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        updateScore('local', -1);
    });

    scoreRival.addEventListener('click', () => updateScore('rival', 1));
    scoreRival.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        updateScore('rival', -1);
    });

    // cambiar saque manual si se clica en el indicador
    document.getElementById('server-local').addEventListener('click', () => setServer('local'));
    document.getElementById('server-rival').addEventListener('click', () => setServer('rival'));

    // Ya no hacemos setup inicial del modal de ataque aqui, se hace en renderAttackModal()
    // boton confirmar manual
    document.getElementById('btn-confirmar').addEventListener('click', registrarAccion);

    // boton deshacer
    document.getElementById('btn-undo').addEventListener('click', deshacerUltimaAccion);

    // botones de cabecera
    document.getElementById('btn-finalizar-set').addEventListener('click', async () => {
        if (scoutingState.marcadorLocal === scoutingState.marcadorRival) {
            showToast('El marcador está empatado. Imposible finalizar set.', 'error');
            return;
        }
        const ganadorLocal = scoutingState.marcadorLocal > scoutingState.marcadorRival;
        const nombreGanador = ganadorLocal ? 'Nuestra Pareja' : 'El Rival';
        
        if (!confirm(`¿Finalizar el set ${scoutingState.setActual}?\n\nVictoria para: ${nombreGanador} (${scoutingState.marcadorLocal}-${scoutingState.marcadorRival})`)) {
            return;
        }
        // registramos el final de set en bbdd
        await window.api.createAccion({
            partido_id: scoutingState.partidoId,
            jugador_id: scoutingState.partido.jugador1_id,
            complejo: 'K1',
            tipo_accion: 'fin_set',
            subtipo: 'Ganador Set',
            resultado: ganadorLocal ? 'local' : 'rival',
            set_numero: scoutingState.setActual,
            marcador_local: scoutingState.marcadorLocal.toString(),
            marcador_rival: scoutingState.marcadorRival.toString(),
            video_timestamp: getVideoTimestamp(),
            zona_campo: ''
        });

        // pasamos al siguiente set
        scoutingState.setActual++;
        scoutingState.marcadorLocal = 0;
        scoutingState.marcadorRival = 0;
        scoutingState.equipoAlSaque = 'local';
        updateScoreUI();
        refreshTimelineAndStats();
        showToast(`Set finalizado. ¡Comienza el set ${scoutingState.setActual}!`, 'success');
    });

    document.getElementById('btn-guardar-partido').addEventListener('click', async () => {
        await guardarPartido();
        showToast('Partido guardado', 'success');
    });

    document.getElementById('btn-ver-informe').addEventListener('click', async () => {
        await guardarPartido();
        limpiarShortcuts();
        router.navigate('informe', { partidoId: scoutingState.partidoId });
    });

    document.getElementById('btn-volver').addEventListener('click', async () => {
        await guardarPartido();
        limpiarShortcuts();
        router.navigate('dashboard');
    });

    // pantalla completa historial
    document.getElementById('btn-fullscreen-timeline').addEventListener('click', () => {
        const tc = document.getElementById('timeline-container');
        tc.classList.toggle('fullscreen-mode');
        // Quitar o poner el body overflow si queremos bloquear el scroll de fondo
        if (tc.classList.contains('fullscreen-mode')) {
            document.getElementById('btn-fullscreen-timeline').textContent = '✖ Cerrar';
        } else {
            document.getElementById('btn-fullscreen-timeline').textContent = '⛶';
        }
    });
}

function setupKeyboardShortcuts(container) {
    // limpiamos handler anterior si existe
    limpiarShortcuts();

    keyHandler = (e) => {
        // ignorar si estamos escribiendo en un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (router.getCurrentPage() !== 'scouting') return;

        // Si el modal wizard está abierto, ignoramos los atajos globales para no interferir
        if (scoutingState.wizardModalAbierto && e.key !== 'Escape') return;

        // ignorar si tiene modificadores para permitir ctrl+c, ctrl+v, etc
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const key = e.key;
        const shortcut = SHORTCUTS[key];

        if (!shortcut) return;

        // Si es 1 o 2 y estamos en recepcion/defensa, IGNORAMOS el atajo global
        // para que processSubtypeKey pueda procesarlo (y no llamamos a preventDefault)
        if (shortcut.action === 'selectPlayer' && (scoutingState.tipoAccion === 'recepcion' || scoutingState.tipoAccion === 'defensa')) {
            return;
        }

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

            case 'selectAction':
                selectActionType(shortcut.value);
                break;

            case 'markLastActionAsPoint':
                if (scoutingState.enterTimer) {
                    // Double Enter
                    clearTimeout(scoutingState.enterTimer);
                    scoutingState.enterTimer = null;
                    
                    const data = {
                        partido_id: scoutingState.partidoId,
                        jugador_id: scoutingState.partido.jugador1_id,
                        complejo: scoutingState.equipoAlSaque === 'rival' ? 'K1' : 'K2',
                        tipo_accion: 'rival',
                        subtipo: 'Acierto Rival',
                        resultado: 'error',
                        set_numero: scoutingState.setActual,
                        marcador_local: scoutingState.marcadorLocal.toString(),
                        marcador_rival: scoutingState.marcadorRival.toString(),
                        video_timestamp: window.getCurrentVideoTime ? window.getCurrentVideoTime() : 0,
                        zona_campo: ''
                    };
                    
                    window.api.createAccion(data).then(id => {
                        data.id = id;
                        scoutingState.acciones.push(data);
                        updateScore('rival', 1);
                        
                        const panel = document.querySelector('.action-panel');
                        panel.classList.add('action-flash');
                        setTimeout(() => panel.classList.remove('action-flash'), 500);
                        
                        refreshTimelineAndStats();
                        showToast('Acierto del rival registrado', 'info');
                    });
                } else {
                    scoutingState.enterTimer = setTimeout(() => {
                        markLastAction('punto');
                        scoutingState.enterTimer = null;
                    }, 300);
                }
                break;
                
            case 'markLastActionAsError':
                if (scoutingState.backspaceTimer) {
                    // Double Backspace -> Error Rival
                    clearTimeout(scoutingState.backspaceTimer);
                    scoutingState.backspaceTimer = null;
                    
                    const data = {
                        partido_id: scoutingState.partidoId,
                        jugador_id: scoutingState.partido.jugador1_id,
                        complejo: scoutingState.equipoAlSaque === 'rival' ? 'K1' : 'K2',
                        tipo_accion: 'rival',
                        subtipo: 'Error Rival',
                        resultado: 'punto', // Error del rival = Punto nuestro
                        set_numero: scoutingState.setActual,
                        marcador_local: scoutingState.marcadorLocal.toString(),
                        marcador_rival: scoutingState.marcadorRival.toString(),
                        video_timestamp: window.getCurrentVideoTime ? window.getCurrentVideoTime() : 0,
                        zona_campo: ''
                    };
                    
                    window.api.createAccion(data).then(id => {
                        data.id = id;
                        scoutingState.acciones.push(data);
                        updateScore('local', 1); // Punto para nosotros
                        
                        const panel = document.querySelector('.action-panel');
                        panel.classList.add('action-flash');
                        setTimeout(() => panel.classList.remove('action-flash'), 500);
                        
                        refreshTimelineAndStats();
                        showToast('Error del Rival registrado (punto a favor)', 'success');
                    });
                } else {
                    scoutingState.backspaceTimer = setTimeout(() => {
                        // Single Backspace -> Error General
                        scoutingState.backspaceTimer = null;
                        
                        const data = {
                            partido_id: scoutingState.partidoId,
                            jugador_id: scoutingState.partido.jugador1_id,
                            complejo: scoutingState.equipoAlSaque === 'rival' ? 'K1' : 'K2',
                            tipo_accion: 'error_general',
                            subtipo: 'Error',
                            resultado: 'error', // Error nuestro = Punto rival
                            set_numero: scoutingState.setActual,
                            marcador_local: scoutingState.marcadorLocal.toString(),
                            marcador_rival: scoutingState.marcadorRival.toString(),
                            video_timestamp: window.getCurrentVideoTime ? window.getCurrentVideoTime() : 0,
                            zona_campo: ''
                        };
                        
                        window.api.createAccion(data).then(id => {
                            data.id = id;
                            scoutingState.acciones.push(data);
                            updateScore('rival', 1); // Punto para el rival
                            
                            const panel = document.querySelector('.action-panel');
                            panel.classList.add('action-flash');
                            setTimeout(() => panel.classList.remove('action-flash'), 500);
                            
                            refreshTimelineAndStats();
                            showToast('Error General registrado (punto rival)', 'error');
                        });
                    }, 300);
                }
                break;

            case 'undo':
                deshacerUltimaAccion();
                break;

            case 'newSet':
                scoutingState.setActual++;
                scoutingState.marcadorLocal = 0;
                scoutingState.marcadorRival = 0;
                scoutingState.equipoAlSaque = 'local';
                updateScoreUI();
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

    // procesar teclas sueltas para subtipos (1, 2, r, etc.)
    processSubtypeKey = (e) => {
        if (e.defaultPrevented) return; // Si la tecla ya fue procesada por keyHandler (ej: para abrir el modal), ignorar

        // ignorar si estamos escribiendo en un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (router.getCurrentPage() !== 'scouting') return;
        
        if (e.key === 'Escape' && scoutingState.wizardModalAbierto) {
            closeWizardModal();
            return;
        }

        if (scoutingState.wizardModalAbierto) {
            handleWizardKey(e.key.toLowerCase());
            return;
        }

        // si hay una accion seleccionada, buscamos si la tecla coincide con un subtipo
        if (scoutingState.tipoAccion) {
            const subs = SUBTIPOS[scoutingState.tipoAccion];
            if (subs) {
                const sub = subs.find(s => s.key === e.key.toLowerCase());
                if (sub) {
                    e.preventDefault();
                    scoutingState.subtipo = sub.label;
                    if (scoutingState.ataqueModalAbierto) closeAttackModal();
                    registrarAccion(); // fast register
                }
            }
        }
    };

    document.addEventListener('keydown', keyHandler);
    document.addEventListener('keydown', processSubtypeKey);
}

function limpiarShortcuts() {
    if (keyHandler) {
        document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
    }
    if (processSubtypeKey) {
        document.removeEventListener('keydown', processSubtypeKey);
        processSubtypeKey = null;
    }
}

// funciones UI dinamicas
function selectActionType(action) {
    scoutingState.tipoAccion = action;
    scoutingState.subtipo = null;
    
    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector(`[data-action="${action}"]`)?.classList.add('selected');

    if (action === 'ataque' || action === 'bloqueo' || action === 'saque') {
        openWizardModal(action);
        document.getElementById('subtipo-container').style.display = 'none';
    } else {
        const subtipoContainer = document.getElementById('subtipo-container');
        subtipoContainer.style.display = '';
        document.getElementById('subtype-buttons').innerHTML = renderSubtipos();
        
        // click events
        document.querySelectorAll('.subtype-btn').forEach(sb => {
            sb.addEventListener('click', () => {
                scoutingState.subtipo = sb.dataset.subtype;
                registrarAccion();
            });
        });
    }
    updateCurrentActionText();
}

function openWizardModal(actionType) {
    scoutingState.wizardModalAbierto = true;
    scoutingState.wizardActionType = actionType;
    scoutingState.attackWizard = { step: 1, type: null, dir: null, result: null };
    document.getElementById('attack-modal').style.display = 'flex';
    renderWizardModal();
}

function closeWizardModal() {
    scoutingState.wizardModalAbierto = false;
    document.getElementById('attack-modal').style.display = 'none';
    
    if ((scoutingState.tipoAccion === 'ataque' || scoutingState.tipoAccion === 'bloqueo' || scoutingState.tipoAccion === 'saque') && !scoutingState.subtipo) {
        // cancelado
        scoutingState.tipoAccion = null;
        document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
        updateCurrentActionText();
    }
}

const ATTACK_TYPES = [
    { label: 'Ataque', key: 'a' },
    { label: 'Toque', key: 't' },
    { label: 'Pockey', key: 'p' },
    { label: 'Rejuego', key: 'r' },
    { label: 'Lucha', key: 'l' }
];
const ATTACK_DIRS_FULL = [
    { label: 'Línea Larga', key: '1' },
    { label: 'Línea Corta', key: '2' },
    { label: 'Diago Larga', key: '3' },
    { label: 'Diago Corta', key: '4' },
    { label: 'Centro / Medio', key: '5' }
];
const ATTACK_DIRS_SIMPLE = [
    { label: 'Línea', key: '1' },
    { label: 'Diagonal', key: '2' },
    { label: 'Centro / Medio', key: '3' }
];
const ATTACK_RESULTS = [
    { label: 'Punto', key: '1', result: 'punto' },
    { label: 'Error', key: '2', result: 'error' },
    { label: 'Continuidad (En sistema)', key: '3', result: 'continuidad' },
    { label: 'Continuidad (Fuera de sistema)', key: '4', result: 'continuidad' },
    { label: 'Bloqueado (Punto Rival)', key: '5', result: 'bloqueado' },
    { label: 'Bloqueado (Sigue en juego)', key: '6', result: 'continuidad' }
];
const SAQUE_RESULTS = [
    { label: 'Punto (Ace)', key: '1', result: 'punto' },
    { label: 'Error', key: '2', result: 'error' },
    { label: 'En Sistema', key: '3', result: 'continuidad' },
    { label: 'Fuera de Sistema', key: '4', result: 'continuidad' }
];
const BLOQUEO_RESULTS = [
    { label: 'Punto (Bloqueo)', key: '1', result: 'punto' },
    { label: 'Error', key: '2', result: 'error' },
    { label: 'Continuidad', key: '3', result: 'continuidad' }
];
const LUCHA_RESULTS = [
    { label: 'Punto', key: '1', result: 'punto' },
    { label: 'Error', key: '2', result: 'error' },
    { label: 'Sigue en juego', key: '3', result: 'continuidad' }
];

function renderWizardModal() {
    const container = document.getElementById('attack-modal-content');
    const wiz = scoutingState.attackWizard;
    const actionType = scoutingState.wizardActionType; // 'ataque' o 'bloqueo'
    let title = '';
    let options = [];

    if (actionType === 'ataque') {
        if (wiz.step === 1) {
            title = '1. Tipo de Golpe';
            options = ATTACK_TYPES;
        } else if (wiz.step === 2) {
            if (wiz.type.label === 'Lucha') {
                title = `Resultado (Lucha)`;
                options = LUCHA_RESULTS;
            } else {
                title = `2. Dirección (${wiz.type.label})`;
                options = wiz.type.label === 'Ataque' ? ATTACK_DIRS_SIMPLE : ATTACK_DIRS_FULL;
            }
        } else if (wiz.step === 3) {
            title = `3. Resultado (${wiz.type.label} > ${wiz.dir.label})`;
            options = ATTACK_RESULTS;
        }
    } else if (actionType === 'bloqueo') {
        if (wiz.step === 1) {
            title = 'Resultado del Bloqueo';
            options = BLOQUEO_RESULTS;
        }
    } else if (actionType === 'saque') {
        if (wiz.step === 1) {
            title = 'Resultado del Saque';
            options = SAQUE_RESULTS;
        }
    }

    container.innerHTML = `
        <h2>${title}</h2>
        <div class="attack-grid">
            ${options.map(opt => `
                <button class="attack-option-btn wizard-btn" data-key="${opt.key}">
                    ${opt.label}
                    <span class="attack-shortcut">${opt.key.toUpperCase()}</span>
                </button>
            `).join('')}
        </div>
        <div class="attack-hint">Pulsa la tecla correspondiente para seleccionar</div>
        <button class="btn btn-secondary mt-16" id="btn-close-attack">Cancelar (Esc)</button>
    `;

    document.getElementById('btn-close-attack').addEventListener('click', closeWizardModal);
    document.querySelectorAll('.wizard-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            handleWizardKey(btn.dataset.key);
        });
    });
}

function handleWizardKey(key) {
    const wiz = scoutingState.attackWizard;
    const actionType = scoutingState.wizardActionType;
    
    if (actionType === 'ataque') {
        if (wiz.step === 1) {
            const opt = ATTACK_TYPES.find(o => o.key === key);
            if (opt) {
                wiz.type = opt;
                if (opt.label === 'Rejuego') {
                    // si es rejuego cortamos directo y mandamos continuidad
                    scoutingState.subtipo = 'Rejuego';
                    closeWizardModal();
                    registrarAccion('continuidad');
                } else {
                    wiz.step = 2;
                    renderWizardModal();
                }
            }
        } else if (wiz.step === 2) {
            if (wiz.type.label === 'Lucha') {
                const opt = LUCHA_RESULTS.find(o => o.key === key);
                if (opt) {
                    wiz.result = opt;
                    scoutingState.subtipo = 'Lucha';
                    const res = wiz.result.result;
                    closeWizardModal();
                    registrarAccion(res);
                }
            } else {
                const validOpts = wiz.type.label === 'Ataque' ? ATTACK_DIRS_SIMPLE : ATTACK_DIRS_FULL;
                const opt = validOpts.find(o => o.key === key);
                if (opt) {
                    wiz.dir = opt;
                    wiz.step = 3;
                    renderWizardModal();
                }
            }
        } else if (wiz.step === 3) {
            const opt = ATTACK_RESULTS.find(o => o.key === key);
            if (opt) {
                wiz.result = opt;
                scoutingState.subtipo = `${wiz.type.label} - ${wiz.dir.label}`;
                const res = wiz.result.result;
                closeWizardModal();
                registrarAccion(res);
            }
        }
    } else if (actionType === 'bloqueo') {
        if (wiz.step === 1) {
            const opt = BLOQUEO_RESULTS.find(o => o.key === key);
            if (opt) {
                wiz.result = opt;
                scoutingState.subtipo = opt.label;
                const res = wiz.result.result;
                closeWizardModal();
                registrarAccion(res);
            }
        }
    } else if (actionType === 'saque') {
        if (wiz.step === 1) {
            const opt = SAQUE_RESULTS.find(o => o.key === key);
            if (opt) {
                wiz.result = opt;
                if (opt.label === 'En Sistema' || opt.label === 'Fuera de Sistema') {
                    scoutingState.subtipo = opt.label;
                } else {
                    scoutingState.subtipo = opt.label;
                }
                const res = wiz.result.result;
                closeWizardModal();
                registrarAccion(res);
            }
        }
    }
}

// control del marcador
function updateScore(team, delta) {
    if (team === 'local') {
        scoutingState.marcadorLocal = Math.max(0, scoutingState.marcadorLocal + delta);
        if (delta > 0) setServer('local');
    } else {
        scoutingState.marcadorRival = Math.max(0, scoutingState.marcadorRival + delta);
        if (delta > 0) setServer('rival');
    }
    updateScoreUI();
}

function setServer(team) {
    scoutingState.equipoAlSaque = team;
    document.getElementById('server-local').classList.toggle('active', team === 'local');
    document.getElementById('server-rival').classList.toggle('active', team === 'rival');
}

function updateScoreUI() {
    document.getElementById('score-local').textContent = scoutingState.marcadorLocal;
    document.getElementById('score-rival').textContent = scoutingState.marcadorRival;
    document.getElementById('set-label').textContent = `SET ${scoutingState.setActual}`;
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

// registrar accion (soporta parametro forceResult para el wizard)
async function registrarAccion(forceResult = null) {
    if (!scoutingState.tipoAccion) {
        showToast('Selecciona un tipo de acción', 'error');
        return;
    }

    // validacion de inicio de rally
    const isFirstOfRally = scoutingState.acciones.length === 0 || 
                           ['punto', 'error', 'bloqueado'].includes(scoutingState.acciones[scoutingState.acciones.length - 1].resultado);
    
    if (isFirstOfRally && scoutingState.tipoAccion !== 'rival' && scoutingState.tipoAccion !== 'error_general') {
        const expectedAction = scoutingState.equipoAlSaque === 'local' ? 'saque' : 'recepcion';
        if (scoutingState.tipoAccion !== expectedAction) {
            if (!confirm(`⚠️ ALERTA: El equipo ${scoutingState.equipoAlSaque} tiene el saque. El primer toque de este punto debería ser "${expectedAction.toUpperCase()}".\n\n¿Ignorar y añadir de todos modos?`)) {
                // reset estado y abortar
                scoutingState.tipoAccion = null;
                scoutingState.subtipo = null;
                document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
                document.getElementById('subtipo-container').style.display = 'none';
                updateCurrentActionText();
                return;
            }
        }
    }

    // Si saca el Rival, nosotros estamos recibiendo -> K1
    // Si saca el Local (nosotros), estamos defendiendo el ataque -> K2
    const complejoActual = scoutingState.equipoAlSaque === 'rival' ? 'K1' : 'K2';

    // por defecto todo es continuidad a menos que le demos a enter/backspace despues
    let res = (typeof forceResult === 'string') ? forceResult : 'continuidad';

    // chequeo automatico de errores: si pulsamos el subtipo de error, lo marcamos como error
    if (scoutingState.subtipo === 'Error (0)' || scoutingState.subtipo === 'Error de Ataque' || scoutingState.subtipo === 'Error (-)') {
        res = 'error';
    }

    // Detector de Ataque de Segundo Toque
    if (scoutingState.tipoAccion === 'ataque') {
        let currentRallyActions = [];
        for (let i = scoutingState.acciones.length - 1; i >= 0; i--) {
            const a = scoutingState.acciones[i];
            if (['punto', 'error', 'bloqueado'].includes(a.resultado) || a.tipo_accion === 'fin_set') break;
            currentRallyActions.push(a);
        }
        
        // Buscamos la última acción de nuestro equipo en este rally
        const ultimaNuestra = currentRallyActions.find(a => a.tipo_accion !== 'rival' && a.tipo_accion !== 'error_general' && a.tipo_accion !== 'fin_set');
        
        if (ultimaNuestra && 
            (ultimaNuestra.tipo_accion === 'recepcion' || ultimaNuestra.tipo_accion === 'defensa') && 
            ultimaNuestra.jugador_id !== scoutingState.jugadorSeleccionado) {
            
            if (scoutingState.subtipo && !scoutingState.subtipo.includes('2º Toque')) {
                scoutingState.subtipo += ' (2º Toque)';
            }
        }
    }

    const data = {
        partido_id: scoutingState.partidoId,
        jugador_id: scoutingState.jugadorSeleccionado,
        complejo: complejoActual,
        tipo_accion: scoutingState.tipoAccion,
        subtipo: scoutingState.subtipo || '',
        resultado: res,
        set_numero: scoutingState.setActual,
        marcador_local: scoutingState.marcadorLocal.toString(),
        marcador_rival: scoutingState.marcadorRival.toString(),
        video_timestamp: getVideoTimestamp(),
        zona_campo: '' // quitado por req
    };

    const accionId = await window.api.createAccion(data);
    data.id = accionId;
    scoutingState.acciones.push(data);

    // auto-sumar punto al equipo correcto
    if (res === 'punto') {
        updateScore('local', 1); // Nuestro jugador hace punto
        guardarPartido(); // auto save score
    } else if (res === 'error' || res === 'bloqueado') {
        updateScore('rival', 1); // Nuestro jugador falla o es bloqueado, punto para el rival
        guardarPartido(); // auto save score
    }

    // flash visual
    const panel = document.querySelector('.action-panel');
    panel.classList.add('action-flash');
    setTimeout(() => panel.classList.remove('action-flash'), 500);

    refreshTimelineAndStats();

    // reset parcial del estado
    scoutingState.tipoAccion = null;
    scoutingState.subtipo = null;
    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('subtipo-container').style.display = 'none';

    updateCurrentActionText();
    showToast(`Acción guardada (J${data.jugador_id} - ${data.tipo_accion})`, 'success');
}

async function markLastAction(resultType) {
    if (scoutingState.acciones.length === 0) return;
    
    // coger la ultima
    const ultima = scoutingState.acciones[scoutingState.acciones.length - 1];
    
    // actualizar db
    await window.api.updateAccion(ultima.id, { resultado: resultType });
    ultima.resultado = resultType;
    
    // auto-sumar punto
    if (resultType === 'punto') {
        updateScore('local', 1); // nuestro jugador hizo punto, sube local
    } else if (resultType === 'error' || resultType === 'bloqueado') {
        updateScore('rival', 1); // nuestro jugador falló o fue bloqueado, sube rival
    }
    
    refreshTimelineAndStats();
    showToast(`Última acción marcada como ${resultType}`, 'info');
}

function refreshTimelineAndStats() {
    const timelineItems = document.getElementById('timeline-items');
    const timelineTitle = document.querySelector('.timeline-title');
    timelineTitle.textContent = `Historial de Acciones (${scoutingState.acciones.length})`;
    timelineItems.innerHTML = renderTimeline();
    
    // vincular eventos de eliminación
    timelineItems.querySelectorAll('.btn-delete-action').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.actionId, 10);
            if (!confirm('¿Seguro que quieres eliminar esta acción?')) return;
            await window.api.deleteAccion(id);
            scoutingState.acciones = scoutingState.acciones.filter(a => a.id !== id);
            refreshTimelineAndStats();
        });
    });

    // vincular eventos de edicion
    timelineItems.querySelectorAll('.btn-edit-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.actionId, 10);
            const action = scoutingState.acciones.find(a => a.id === id);
            if (!action) return;

            scoutingState.editingActionId = id;
            document.getElementById('edit-jugador').value = action.jugador_id;
            document.getElementById('edit-tipo').value = action.tipo_accion;
            populateEditSubtipo(action.tipo_accion, action.subtipo || '');
            document.getElementById('edit-resultado').value = action.resultado || 'continuidad';

            document.getElementById('edit-action-modal').style.display = 'flex';
            scoutingState.wizardModalAbierto = true;
        });
    });

    timelineItems.querySelectorAll('.btn-delete-rally').forEach(btn => {
        btn.addEventListener('click', async () => {
            const idsStr = btn.dataset.rallyIds;
            if (!idsStr) return;
            const ids = idsStr.split(',').map(n => parseInt(n, 10));
            if (!confirm('¿Seguro que quieres eliminar todas las acciones de este punto?')) return;
            for (const id of ids) {
                await window.api.deleteAccion(id);
            }
            scoutingState.acciones = scoutingState.acciones.filter(a => !ids.includes(a.id));
            refreshTimelineAndStats();
        });
    });

    updateLiveStats();
}

async function deshacerUltimaAccion() {
    if (scoutingState.acciones.length === 0) {
        showToast('No hay acciones para deshacer', 'error');
        return;
    }

    await window.api.undoLastAccion(scoutingState.partidoId);
    scoutingState.acciones.pop();

    refreshTimelineAndStats();
    showToast('Última acción deshecha', 'info');
}

async function guardarPartido() {
    const resultado = `${scoutingState.marcadorLocal}-${scoutingState.marcadorRival}`;
    scoutingState.partido.resultado = resultado;
    await window.api.updatePartido(scoutingState.partidoId, { resultado });
}

// renders parciales
function renderSubtipos() {
    if (!scoutingState.tipoAccion) return '';
    const subtipos = SUBTIPOS[scoutingState.tipoAccion] || [];
    return subtipos.map(sub => `
        <button class="subtype-btn ${scoutingState.subtipo === sub.label ? 'selected' : ''}" data-subtype="${sub.label}">
            ${sub.label} <span class="shortcut-hint">${sub.key.toUpperCase()}</span>
        </button>
    `).join('');
}

function renderTimeline() {
    const rallies = [];
    let currentRally = [];
    const { acciones } = scoutingState;

    for (let i = 0; i < acciones.length; i++) {
        const a = acciones[i];
        currentRally.push(a);

        const isPointOrError = ['punto', 'error', 'bloqueado'].includes(a.resultado);
        let scoreChanged = false;
        if (i < acciones.length - 1) {
            const nextA = acciones[i+1];
            if (a.marcador_local !== nextA.marcador_local || a.marcador_rival !== nextA.marcador_rival) {
                scoreChanged = true;
            }
        }
        let nextIsServe = false;
        if (i < acciones.length - 1) {
             nextIsServe = acciones[i+1].tipo_accion === 'saque';
        }

        if (isPointOrError || scoreChanged || nextIsServe) {
            rallies.push({
                marcador_local: currentRally[0].marcador_local,
                marcador_rival: currentRally[0].marcador_rival,
                acciones: currentRally
            });
            currentRally = [];
        }
    }

    if (currentRally.length > 0) {
        rallies.push({
            marcador_local: currentRally[0].marcador_local,
            marcador_rival: currentRally[0].marcador_rival,
            acciones: currentRally
        });
    }

    return rallies.reverse().map(rally => {
        const header = `<div class="rally-header">
            <span>Marcador: ${rally.marcador_local} - ${rally.marcador_rival}</span>
            <button class="btn-delete-rally" data-rally-ids="${rally.acciones.map(a => a.id).join(',')}" title="Eliminar Punto (y todas sus acciones)">🗑️</button>
        </div>`;

        const items = rally.acciones.map(a => {
            const resultado = a.resultado || 'continuidad';
            const tipoLabel = TIPOS_ACCION[a.tipo_accion]?.label || a.tipo_accion;
            const isJ1 = a.jugador_id === scoutingState.partido.jugador1_id;
            let playerTag = isJ1 ? 'J1' : 'J2';
            if (a.tipo_accion === 'rival') playerTag = 'RIVAL';
            if (a.tipo_accion === 'error_general') playerTag = 'LOCAL';
            
            const labelComplejo = a.complejo || 'K1';
            return `
                <div class="timeline-item ${resultado}">
                    <span class="timestamp">${formatTimestamp(a.video_timestamp)}</span>
                    <span class="complex-badge">${labelComplejo}</span>
                    <strong>${playerTag}</strong>
                    ${(a.tipo_accion !== 'rival' && a.tipo_accion !== 'error_general') ? tipoLabel : ''}
                    ${a.subtipo ? `· ${a.subtipo}` : ''}
                    ${RESULTADOS[resultado]?.icon || ''}
                    <div style="margin-left: auto; display: flex; gap: 4px;">
                        <button class="btn-edit-action" data-action-id="${a.id}" title="Editar Acción">✏️</button>
                        <button class="btn-delete-action" data-action-id="${a.id}" title="Eliminar Acción">×</button>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="rally-group">${header}<div class="rally-actions">${items}</div></div>`;
    }).join('');
}

function renderLiveStats() {
    const { acciones, partido } = scoutingState;
    const stats = calcularStats(acciones, partido.jugador1_id, partido.jugador2_id);

    const j1 = stats.jugador1;
    const j2 = stats.jugador2;

    return `
        <div class="live-stat-card">
            <div class="live-stat-value text-accent" style="font-size: 20px;">${j1.sideOutFirstPct}% <span style="font-size: 14px; opacity: 0.7;">(${j1.fbsoPuntos}/${j1.totalK1})</span></div>
            <div class="live-stat-label">Side-Out a la primera ${partido.jugador1_nombre}</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value text-accent" style="font-size: 20px;">${j2.sideOutFirstPct}% <span style="font-size: 14px; opacity: 0.7;">(${j2.fbsoPuntos}/${j2.totalK1})</span></div>
            <div class="live-stat-label">Side-Out a la primera ${partido.jugador2_nombre}</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value" style="font-size: 20px;">${j1.sideOutTransPct}% <span style="font-size: 14px; opacity: 0.7;">(${j1.puntosK1}/${j1.totalK1})</span></div>
            <div class="live-stat-label">Puntos Side-Out Ganados ${partido.jugador1_nombre}</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value" style="font-size: 20px;">${j2.sideOutTransPct}% <span style="font-size: 14px; opacity: 0.7;">(${j2.puntosK1}/${j2.totalK1})</span></div>
            <div class="live-stat-label">Puntos Side-Out Ganados ${partido.jugador2_nombre}</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value" style="color: var(--accent-success)">${j1.killsAtaque + j2.killsAtaque}</div>
            <div class="live-stat-label">Ataques Ganadores</div>
        </div>
        <div class="live-stat-card">
            <div class="live-stat-value" style="color: var(--accent-error)">${j1.erroresAtaque + j2.erroresAtaque}</div>
            <div class="live-stat-label">Errores de Ataque</div>
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
    
    const complejo = scoutingState.equipoAlSaque === 'local' ? 'K1' : 'K2';
    parts.push(`[${complejo}]`);
    
    if (scoutingState.tipoAccion) {
        const t = TIPOS_ACCION[scoutingState.tipoAccion];
        if (t) parts.push(t.label);
    }
    if (scoutingState.subtipo) parts.push(scoutingState.subtipo);

    text.textContent = parts.join(' → ');
}

function populateEditSubtipo(tipo, currentValue) {
    const subtipoSelect = document.getElementById('edit-subtipo');
    if (!subtipoSelect) return;
    subtipoSelect.innerHTML = '<option value="">Sin definir</option>';
    
    if (SUBTIPOS[tipo]) {
        SUBTIPOS[tipo].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.label;
            opt.textContent = sub.label;
            subtipoSelect.appendChild(opt);
        });
    }

    if (currentValue) {
        if (Array.from(subtipoSelect.options).some(o => o.value === currentValue)) {
            subtipoSelect.value = currentValue;
        } else {
            const baseType = currentValue.split(' - ')[0];
            if (Array.from(subtipoSelect.options).some(o => o.value === baseType)) {
                subtipoSelect.value = baseType;
            } else {
                const opt = document.createElement('option');
                opt.value = currentValue;
                opt.textContent = currentValue + ' (Original)';
                subtipoSelect.appendChild(opt);
                subtipoSelect.value = currentValue;
            }
        }
    }
}
