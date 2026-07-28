import { router } from '../../router.js';
import { showToast, formatDateInput } from '../../utils/helpers.js';
import { FASES_TORNEO_PISTA } from '../../utils/constants-pista.js';

export function registerNuevoPartidoPista() {
    router.register('nuevo-partido-pista', async (container) => {
        let equipos = [];
        try {
            equipos = await window.apiPista.getEquipos();
        } catch (e) {
            console.error("Error cargando equipos", e);
        }

        container.innerHTML = `
            <div class="nuevo-partido-page">
                <div class="page-header">
                    <h1 class="page-title">➕ Nuevo Partido (Pista)</h1>
                    <p class="page-subtitle">Configura el partido de voleibol pista antes de empezar el scouting</p>
                </div>

                <div class="card" style="max-width: 900px; margin: 0 auto;">
                    <form id="form-partido">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Fecha del Partido *</label>
                                <input type="date" class="form-input" id="input-fecha" value="${formatDateInput()}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Torneo</label>
                                <input type="text" class="form-input" id="input-torneo" placeholder="Ej: Superliga 2">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Fase</label>
                                <select class="form-select" id="input-fase">
                                    <option value="">Seleccionar fase...</option>
                                    ${FASES_TORNEO_PISTA.map(f => `<option value="${f}">${f}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Equipo a Analizar *</label>
                                <select class="form-select" id="select-equipo" required>
                                    <option value="">Selecciona un equipo...</option>
                                    ${equipos.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')}
                                    <option value="NEW">➕ Escribir manualmente (Nuevo equipo)</option>
                                </select>
                                <input type="text" class="form-input mt-2" id="input-equipo-nombre" placeholder="Nombre del equipo" style="display: none; margin-top: 8px;">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Equipo Rival *</label>
                                <input type="text" class="form-input" id="input-rival" placeholder="Ej: CV Teruel" required>
                            </div>
                        </div>

                        <div class="form-group" style="margin-top: 12px; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border);">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 500; color: var(--text-primary); margin-bottom: 0;">
                                <input type="checkbox" id="input-llevar-rotaciones" style="width: 18px; height: 18px; cursor: pointer;">
                                🔄 Llevar control de rotaciones y posiciones en pista
                            </label>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-left: 28px; margin-top: 4px;">
                                Activa el campo virtual en scouting, rotación automática en Side-Out (K1) y configuración inicial por set.
                            </div>
                        </div>

                        <hr style="border: none; border-top: 1px solid var(--border); margin: 24px 0;">

                        <div class="flex justify-between items-center" style="margin-bottom: 16px;">
                            <h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary);">
                                📋 Roster del Partido
                            </h3>
                            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-player">
                                ➕ Añadir Jugador
                            </button>
                        </div>
                        <p class="text-muted" style="font-size:12px; margin-top:-8px; margin-bottom: 16px;">Configura los jugadores que participan en este partido.</p>

                        <div class="table-container" style="margin-bottom: 24px;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th style="width: 80px;">Dorsal</th>
                                        <th>Nombre</th>
                                        <th>Apellidos</th>
                                        <th style="width: 140px;">Posición</th>
                                        <th style="width: 80px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="roster-tbody">
                                    <!-- Rows added dynamically -->
                                </tbody>
                            </table>
                        </div>

                        <hr style="border: none; border-top: 1px solid var(--border); margin: 24px 0;">

                        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">
                            🎬 Vídeo del Partido
                        </h3>

                        <div class="form-group">
                            <label class="form-label">Tipo de Vídeo</label>
                            <div class="flex gap-12">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary);">
                                    <input type="radio" name="video-tipo" value="youtube" checked id="radio-youtube"> YouTube
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary);">
                                    <input type="radio" name="video-tipo" value="local" id="radio-local"> Archivo Local
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary);">
                                    <input type="radio" name="video-tipo" value="none" id="radio-none"> Sin Vídeo
                                </label>
                            </div>
                        </div>

                        <div class="form-group" id="youtube-input-group">
                            <label class="form-label">URL de YouTube</label>
                            <input type="text" class="form-input" id="input-youtube-url" placeholder="https://www.youtube.com/watch?v=...">
                        </div>

                        <div class="form-group" id="local-input-group" style="display: none;">
                            <label class="form-label">Archivo de Vídeo</label>
                            <div class="flex gap-12 items-center">
                                <button type="button" class="btn btn-secondary" id="btn-seleccionar-video">📁 Seleccionar Archivo</button>
                                <span id="video-file-name" class="text-muted" style="font-size: 13px;">Ningún archivo seleccionado</span>
                            </div>
                            <label class="setting-hint" style="display:block; margin-top:10px; cursor:pointer;"><input type="checkbox" id="input-detect-whistles"> Analizar localmente los silbatos para navegar con Mouse Atrás/Adelante</label>
                        </div>

                        <div class="flex gap-12" style="margin-top: 24px;">
                            <button type="submit" class="btn btn-primary btn-lg">
                                🏐 Crear e Iniciar Scouting
                            </button>
                            <button type="button" class="btn btn-secondary btn-lg" id="btn-solo-crear">
                                💾 Solo Guardar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const selectEquipo = document.getElementById('select-equipo');
        const inputEquipoNombre = document.getElementById('input-equipo-nombre');
        const rosterTbody = document.getElementById('roster-tbody');
        const btnAddPlayer = document.getElementById('btn-add-player');

        // Render a single row
        const createRosterRow = (jugador = {}) => {
            const tr = document.createElement('tr');
            tr.className = 'roster-row';
            // We use dataset to store the original ID if it comes from the DB
            if (jugador.id) {
                tr.dataset.jugadorId = jugador.id;
            }
            
            tr.innerHTML = `
                <td>
                    <input type="number" class="form-input roster-dorsal" style="width: 100%" value="${jugador.dorsal || ''}" min="0" max="99" required>
                </td>
                <td>
                    <input type="text" class="form-input roster-nombre" style="width: 100%" value="${jugador.nombre || ''}" ${jugador.id ? 'readonly style="background-color: var(--surface-hover);"' : ''}>
                </td>
                <td>
                    <input type="text" class="form-input roster-apellidos" style="width: 100%" value="${jugador.apellidos || ''}" ${jugador.id ? 'readonly style="background-color: var(--surface-hover);"' : ''}>
                </td>
                <td>
                    <select class="form-select roster-posicion" style="width: 100%">
                        <option value="">--</option>
                        <option value="Colocador" ${jugador.posicion === 'Colocador' ? 'selected' : ''}>Colocador</option>
                        <option value="Opuesto" ${jugador.posicion === 'Opuesto' ? 'selected' : ''}>Opuesto</option>
                        <option value="Receptor" ${jugador.posicion === 'Receptor' ? 'selected' : ''}>Receptor</option>
                        <option value="Central" ${jugador.posicion === 'Central' ? 'selected' : ''}>Central</option>
                        <option value="Líbero" ${jugador.posicion === 'Líbero' ? 'selected' : ''}>Líbero</option>
                    </select>
                </td>
                <td style="text-align: right;">
                    <button type="button" class="btn btn-secondary btn-sm text-danger btn-remove-row" title="Eliminar">🗑️</button>
                </td>
            `;

            tr.querySelector('.btn-remove-row').addEventListener('click', () => {
                tr.remove();
            });

            return tr;
        };

        // When team is selected
        selectEquipo.addEventListener('change', async (e) => {
            const val = e.target.value;
            if (val === 'NEW') {
                inputEquipoNombre.style.display = 'block';
                inputEquipoNombre.required = true;
                rosterTbody.innerHTML = '';
            } else if (val) {
                inputEquipoNombre.style.display = 'none';
                inputEquipoNombre.required = false;
                
                // Load roster
                try {
                    const jugadores = await window.apiPista.getJugadoresByEquipo(val);
                    rosterTbody.innerHTML = '';
                    if (jugadores && jugadores.length > 0) {
                        jugadores.forEach(j => {
                            rosterTbody.appendChild(createRosterRow(j));
                        });
                    }
                } catch (error) {
                    console.error("Error loading roster", error);
                    showToast("Error al cargar jugadores del equipo", "error");
                    rosterTbody.innerHTML = '';
                }
            } else {
                inputEquipoNombre.style.display = 'none';
                inputEquipoNombre.required = false;
                rosterTbody.innerHTML = '';
            }
        });

        // Add blank row
        btnAddPlayer.addEventListener('click', () => {
            rosterTbody.appendChild(createRosterRow());
        });

        // Video type toggle
        document.querySelectorAll('input[name="video-tipo"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const tipo = document.querySelector('input[name="video-tipo"]:checked').value;
                document.getElementById('youtube-input-group').style.display = tipo === 'youtube' ? 'block' : 'none';
                document.getElementById('local-input-group').style.display = tipo === 'local' ? 'flex' : 'none';
            });
        });

        // Local video file selection
        let videoFilePath = '';
        document.getElementById('btn-seleccionar-video')?.addEventListener('click', async () => {
            if (window.api && window.api.openVideoFile) {
                const result = await window.api.openVideoFile(); // We reuse the main api for file dialog
                if (result) {
                    videoFilePath = result;
                    const fileName = result.split('/').pop().split('\\\\').pop();
                    document.getElementById('video-file-name').textContent = fileName;
                }
            }
        });

        const handleSubmit = async (startScouting) => {
            const valEquipo = selectEquipo.value;
            const rival = document.getElementById('input-rival').value.trim();

            if (!valEquipo || !rival) {
                showToast('Rellena todos los campos obligatorios', 'error');
                return;
            }

            let equipoId = null;
            let equipoNombre = '';

            if (valEquipo === 'NEW') {
                equipoNombre = inputEquipoNombre.value.trim();
                if (!equipoNombre) {
                    showToast('Introduce el nombre del nuevo equipo', 'error');
                    return;
                }
            } else {
                equipoId = parseInt(valEquipo, 10);
                equipoNombre = selectEquipo.options[selectEquipo.selectedIndex].text;
            }

            // Get video info
            const tipoVideo = document.querySelector('input[name="video-tipo"]:checked').value;
            let videoUrl = '';
            if (tipoVideo === 'youtube') {
                videoUrl = document.getElementById('input-youtube-url').value.trim();
            } else if (tipoVideo === 'local') {
                videoUrl = videoFilePath;
            }

            const data = {
                fecha: document.getElementById('input-fecha').value,
                torneo: document.getElementById('input-torneo').value.trim(),
                fase: document.getElementById('input-fase').value,
                equipo_id: equipoId,
                equipo_nombre: equipoNombre,
                rival_nombre: rival,
                video_tipo: tipoVideo === 'none' ? '' : tipoVideo,
                video_url: videoUrl,
                llevar_rotaciones: document.getElementById('input-llevar-rotaciones')?.checked ? 1 : 0,
                rotaciones_iniciales: '{}'
            };

            try {
                const result = await window.apiPista.createPartidoPista(data);
                const partidoId = typeof result === 'object' ? result.id : result; // Handle both id and object returns
                if (tipoVideo === 'local' && videoUrl && document.getElementById('input-detect-whistles')?.checked) {
                    showToast('Analizando silbatos localmente… puede tardar unos minutos', 'info');
                    try {
                        const whistles = await window.api.analyzeWhistles(videoUrl);
                        showToast(`${whistles.length} silbatos detectados. Ya puedes usar Mouse Atrás/Adelante.`, 'success');
                    } catch (error) {
                        showToast(`No se pudo analizar el audio: ${error.message}`, 'warning');
                    }
                }
                
                // Now insert roster
                const rows = document.querySelectorAll('.roster-row');
                const promises = Array.from(rows).map(row => {
                    const dorsal = row.querySelector('.roster-dorsal').value;
                    const nombre = row.querySelector('.roster-nombre').value.trim();
                    const apellidos = row.querySelector('.roster-apellidos').value.trim();
                    const posicion = row.querySelector('.roster-posicion').value;
                    const es_libero = posicion === 'Líbero' ? 1 : 0;
                    const jugadorId = row.dataset.jugadorId ? parseInt(row.dataset.jugadorId, 10) : null;

                    if (!dorsal) return Promise.resolve(); // skip if no dorsal

                    return window.apiPista.addRosterJugador({
                        partido_id: partidoId,
                        dorsal: parseInt(dorsal, 10),
                        nombre: nombre || 'Desconocido', // Fallback for quick add
                        apellidos: apellidos || '',
                        posicion: posicion,
                        es_libero: es_libero,
                        jugador_pista_id: jugadorId
                    });
                });

                await Promise.all(promises);

                showToast('Partido creado correctamente', 'success');

                if (startScouting) {
                    router.navigate('scouting-pista', { partidoId });
                } else {
                    router.navigate('dashboard-pista');
                }
            } catch (error) {
                console.error("Error creating partido:", error);
                showToast('Error al crear el partido', 'error');
            }
        };

        document.getElementById('form-partido')?.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSubmit(true);
        });

        document.getElementById('btn-solo-crear')?.addEventListener('click', () => {
            // Need HTML5 validation to run, so we check validity
            const form = document.getElementById('form-partido');
            if (form.checkValidity()) {
                handleSubmit(false);
            } else {
                form.reportValidity();
            }
        });
    });
}
