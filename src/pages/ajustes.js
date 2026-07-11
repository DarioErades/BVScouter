// pagina de ajustes / preferencias

import { router } from '../router.js';
import { showToast } from '../utils/helpers.js';
import { getPrefs, savePrefs, applyPrefs, ACCENT_PRESETS } from '../utils/theme.js';

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

    container.querySelector('#btn-reset-ajustes')?.addEventListener('click', () => {
        savePrefs({ theme: 'dark', accent: '#f59e0b', density: 'normal' });
        applyPrefs();
        renderPage(container);
        showToast('Ajustes restablecidos', 'info');
    });
}

function markActive(container, selector, active) {
    container.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
    active.classList.add('active');
}
