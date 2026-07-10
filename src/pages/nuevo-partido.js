// pagina de nuevo partido

import { router } from '../router.js';
import { showToast, formatDateInput } from '../utils/helpers.js';
import { FASES_TORNEO } from '../utils/constants.js';

export function registerNuevoPartido() {
    router.register('nuevo-partido', async (container) => {
        container.innerHTML = `
            <div class="nuevo-partido-page">
                <div class="page-header">
                    <h1 class="page-title">➕ Nuevo Partido</h1>
                    <p class="page-subtitle">Configura el partido antes de empezar el scouting</p>
                </div>

                <div class="card" style="max-width: 700px;">
                        <form id="form-partido">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Fecha del Partido *</label>
                                    <input type="date" class="form-input" id="input-fecha" value="${formatDateInput()}" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Torneo</label>
                                    <input type="text" class="form-input" id="input-torneo" placeholder="Ej: World Tour Madrid">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Fase</label>
                                    <select class="form-select" id="input-fase">
                                        <option value="">Seleccionar fase...</option>
                                        ${FASES_TORNEO.map(f => `<option value="${f}">${f}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Pareja a Analizar *</label>
                                    <input type="text" class="form-input" id="input-pareja" placeholder="Ej: Herrera/Gavira" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Pareja Rival *</label>
                                    <input type="text" class="form-input" id="input-rival" placeholder="Ej: Mol/Sorum" required>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Nombre Jugador 1 *</label>
                                    <input type="text" class="form-input" id="input-jugador1" placeholder="Ej: Anders" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Nombre Jugador 2 *</label>
                                    <input type="text" class="form-input" id="input-jugador2" placeholder="Ej: Christian" required>
                                </div>
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
                            </div>

                            <div class="form-group">
                                <label class="form-label">Notas</label>
                                <textarea class="form-textarea" id="input-notas" placeholder="Notas sobre el partido..."></textarea>
                            </div>

                            <div class="flex gap-12" style="margin-top: 24px;">
                                <button type="submit" class="btn btn-primary btn-lg">
                                    🏐 Crear y Empezar Scouting
                                </button>
                                <button type="button" class="btn btn-secondary btn-lg" id="btn-solo-crear">
                                    💾 Solo Guardar
                                </button>
                            </div>
                        </form>
                    </div>
            </div>
        `;

        // toggle video inputs
        document.querySelectorAll('input[name="video-tipo"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const tipo = document.querySelector('input[name="video-tipo"]:checked').value;
                document.getElementById('youtube-input-group').style.display = tipo === 'youtube' ? 'block' : 'none';
                document.getElementById('local-input-group').style.display = tipo === 'local' ? 'flex' : 'none';
            });
        });

        // seleccionar archivo local
        let videoFilePath = '';
        document.getElementById('btn-seleccionar-video')?.addEventListener('click', async () => {
            const result = await window.api.openVideoFile();
            if (result) {
                videoFilePath = result;
                const fileName = result.split('/').pop().split('\\').pop();
                document.getElementById('video-file-name').textContent = fileName;
            }
        });

        // submit del formulario
        const handleSubmit = async (startScouting) => {
            const nombreJ1 = document.getElementById('input-jugador1').value.trim();
            const nombreJ2 = document.getElementById('input-jugador2').value.trim();
            const pareja = document.getElementById('input-pareja').value.trim();
            const rival = document.getElementById('input-rival').value.trim();

            if (!nombreJ1 || !nombreJ2 || !pareja || !rival) {
                showToast('Rellena todos los campos obligatorios de nombres', 'error');
                return;
            }

            // Ya no creamos jugadores, pasamos los nombres directamente
            const tipo = document.querySelector('input[name="video-tipo"]:checked').value;
            let videoUrl = '';
            if (tipo === 'youtube') {
                videoUrl = document.getElementById('input-youtube-url').value.trim();
            } else if (tipo === 'local') {
                videoUrl = videoFilePath;
            }

            const notasGuardadas = document.getElementById('input-notas').value.trim();
            const notasFinales = notasGuardadas ? `Pareja: ${pareja} vs ${rival}\n${notasGuardadas}` : `Pareja: ${pareja} vs ${rival}`;

            const data = {
                fecha: document.getElementById('input-fecha').value,
                torneo: document.getElementById('input-torneo').value.trim(),
                fase: document.getElementById('input-fase').value,
                jugador1_nombre: nombreJ1,
                jugador2_nombre: nombreJ2,
                video_tipo: tipo === 'none' ? '' : tipo,
                video_url: videoUrl,
                notas: notasFinales
            };

            const partidoId = await window.api.createPartido(data);
            showToast('Partido creado correctamente', 'success');

            if (startScouting) {
                router.navigate('scouting', { partidoId });
            } else {
                router.navigate('dashboard');
            }
        };

        document.getElementById('form-partido')?.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSubmit(true);
        });

        document.getElementById('btn-solo-crear')?.addEventListener('click', () => {
            handleSubmit(false);
        });
    });
}
