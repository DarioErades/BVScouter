// pagina de ajustes / preferencias

import { router } from '../router.js';
import { showToast } from '../utils/helpers.js';
import { getPrefs, savePrefs, applyPrefs, ACCENT_PRESETS } from '../utils/theme.js';
import { renderKeybindings, bindKeybindings } from '../utils/settings-ui.js';

export function registerAjustes() {
    router.register('ajustes', async (container) => {
        renderPage(container);
    });
}

function renderPage(container) {
    const prefs = getPrefs();

    container.innerHTML = `
        <div class="ajustes-page">
            <div class="page-header">
                <h1 class="page-title">⚙️ Ajustes</h1>
                <p class="page-subtitle">Personaliza el aspecto de la aplicación</p>
            </div>

            <div class="card settings-card">
                <h3 class="settings-section-title">🎨 Apariencia</h3>

                <div class="setting-row">
                    <div>
                        <div class="setting-label">Tema</div>
                        <div class="setting-hint">Elige entre modo claro u oscuro</div>
                    </div>
                    <div class="theme-toggle-group">
                        <button class="theme-opt ${prefs.theme === 'dark' ? 'active' : ''}" data-theme="dark">🌙 Oscuro</button>
                        <button class="theme-opt ${prefs.theme === 'light' ? 'active' : ''}" data-theme="light">☀️ Claro</button>
                    </div>
                </div>

                <div class="setting-row">
                    <div>
                        <div class="setting-label">Color de acento</div>
                        <div class="setting-hint">El color principal de botones y resaltados</div>
                    </div>
                    <div class="accent-picker">
                        ${ACCENT_PRESETS.map(c => `
                            <button class="accent-swatch ${prefs.accent.toLowerCase() === c.value.toLowerCase() ? 'active' : ''}"
                                data-accent="${c.value}" title="${c.name}" style="background:${c.value};"></button>
                        `).join('')}
                        <label class="accent-swatch accent-custom" title="Color personalizado">
                            <input type="color" id="accent-custom-input" value="${prefs.accent}">
                            🎨
                        </label>
                    </div>
                </div>

                <div class="setting-row">
                    <div>
                        <div class="setting-label">Densidad</div>
                        <div class="setting-hint">Espaciado de la interfaz</div>
                    </div>
                    <div class="theme-toggle-group">
                        <button class="density-opt ${prefs.density === 'normal' ? 'active' : ''}" data-density="normal">Normal</button>
                        <button class="density-opt ${prefs.density === 'compact' ? 'active' : ''}" data-density="compact">Compacta</button>
                    </div>
                </div>
                <div class="setting-row">
                    <div><div class="setting-label">Tamaño de texto</div><div class="setting-hint">Mejora la lectura en pantallas pequeñas o a distancia</div></div>
                    <div class="theme-toggle-group">
                        <button class="font-opt ${prefs.fontScale === 'compact' ? 'active' : ''}" data-font="compact">Pequeño</button>
                        <button class="font-opt ${(prefs.fontScale || 'normal') === 'normal' ? 'active' : ''}" data-font="normal">Normal</button>
                        <button class="font-opt ${prefs.fontScale === 'large' ? 'active' : ''}" data-font="large">Grande</button>
                    </div>
                </div>
                <div class="setting-row">
                    <div><div class="setting-label">Reducir animaciones</div><div class="setting-hint">Una interfaz más estable y cómoda durante el scouting</div></div>
                    <label><input type="checkbox" id="reduce-motion" ${prefs.reduceMotion ? 'checked' : ''}> Activado</label>
                </div>
            </div>

            <div class="card settings-card">
                <h3 class="settings-section-title">🎬 Reproducción</h3>
                <div class="setting-row"><div><div class="setting-label">Salto de vídeo</div><div class="setting-hint">Segundos al avanzar o retroceder con el teclado</div></div><input type="number" id="video-seek-seconds" class="form-input" min="1" max="60" value="${prefs.videoSeekSeconds || 5}" style="width:90px"></div>
                <div class="setting-row"><div><div class="setting-label">Velocidad inicial</div><div class="setting-hint">Se aplica al abrir un nuevo scouting</div></div><select id="video-default-speed" class="form-input" style="width:90px">${[0.5,0.75,1,1.25,1.5,2].map(speed => `<option value="${speed}" ${Number(prefs.videoDefaultSpeed || 1) === speed ? 'selected' : ''}>${speed}×</option>`).join('')}</select></div>
            </div>

            <div class="card settings-card">
                <h3 class="settings-section-title">👁️ Vista previa</h3>
                <div class="preview-box">
                    <button class="btn btn-primary">Botón primario</button>
                    <button class="btn btn-secondary">Secundario</button>
                    <span class="chip chip-accent">Etiqueta</span>
                    <span class="text-accent" style="font-weight:700;">Texto de acento</span>
                </div>
            </div>

            <div class="card settings-card">
                <h3 class="settings-section-title">💾 Copias de seguridad</h3>
                <div class="setting-row">
                    <div>
                        <div class="setting-label">Exportar copia de seguridad</div>
                        <div class="setting-hint">Guarda todos tus partidos y acciones en un archivo .db</div>
                    </div>
                    <button class="btn btn-primary" id="btn-backup-db">📤 Exportar</button>
                </div>
                <div class="setting-row">
                    <div>
                        <div class="setting-label">Restaurar copia de seguridad</div>
                        <div class="setting-hint">Sustituye los datos actuales por una copia anterior (la app se reiniciará)</div>
                    </div>
                    <button class="btn btn-secondary" id="btn-restore-db" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">📥 Restaurar</button>
                </div>
            </div>

            ${renderKeybindings('playa')}

            <div class="flex gap-12" style="margin-top: 8px;">
                <button class="btn btn-secondary" id="btn-reset-ajustes">↺ Restablecer valores</button>
            </div>
        </div>
    `;

    bindEvents(container);
}

function bindEvents(container) {
    container.querySelectorAll('.theme-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            savePrefs({ theme: btn.dataset.theme });
            markActive(container, '.theme-opt', btn);
            showToast('Tema actualizado', 'success');
        });
    });

    container.querySelectorAll('.density-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            savePrefs({ density: btn.dataset.density });
            markActive(container, '.density-opt', btn);
        });
    });
    container.querySelectorAll('.font-opt').forEach(btn => btn.addEventListener('click', () => {
        savePrefs({ fontScale: btn.dataset.font }); markActive(container, '.font-opt', btn);
    }));
    container.querySelector('#reduce-motion')?.addEventListener('change', e => savePrefs({ reduceMotion: e.target.checked }));
    container.querySelector('#video-seek-seconds')?.addEventListener('change', e => savePrefs({ videoSeekSeconds: Math.max(1, Math.min(60, Number(e.target.value) || 5)) }));
    container.querySelector('#video-default-speed')?.addEventListener('change', e => savePrefs({ videoDefaultSpeed: Number(e.target.value) }));

    container.querySelectorAll('.accent-swatch[data-accent]').forEach(btn => {
        btn.addEventListener('click', () => {
            savePrefs({ accent: btn.dataset.accent });
            container.querySelectorAll('.accent-swatch').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    const customInput = container.querySelector('#accent-custom-input');
    customInput?.addEventListener('input', (e) => {
        savePrefs({ accent: e.target.value });
        container.querySelectorAll('.accent-swatch').forEach(b => b.classList.remove('active'));
    });

    container.querySelector('#btn-backup-db')?.addEventListener('click', async () => {
        try {
            const path = await window.api.backupDatabase();
            if (path) showToast('Copia de seguridad guardada', 'success');
        } catch (err) {
            showToast(err.message || 'Error al crear la copia', 'error');
        }
    });

    container.querySelector('#btn-restore-db')?.addEventListener('click', async () => {
        if (!confirm('⚠️ Restaurar una copia SUSTITUIRÁ todos los datos actuales y la app se reiniciará.\n\n¿Continuar?')) return;
        try {
            await window.api.restoreDatabase();
        } catch (err) {
            showToast(err.message || 'Error al restaurar la copia', 'error');
        }
    });

    bindKeybindings(container, 'playa', () => renderPage(container));

    container.querySelector('#btn-reset-ajustes')?.addEventListener('click', () => {
        savePrefs({ theme: 'dark', accent: '#f59e0b', density: 'normal', fontScale: 'normal', reduceMotion: false, videoSeekSeconds: 5, videoDefaultSpeed: 1, keybindings: {} });
        applyPrefs();
        renderPage(container);
        showToast('Ajustes restablecidos', 'info');
    });
}

function markActive(container, selector, active) {
    container.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
    active.classList.add('active');
}
