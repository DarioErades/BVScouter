import { router } from '../../router.js';
import { showToast } from '../../utils/helpers.js';
import { getPrefs, savePrefs as setPrefs, applyPrefs as applyTheme, ACCENT_PRESETS } from '../../utils/theme.js';
import { renderKeybindings, bindKeybindings } from '../../utils/settings-ui.js';

// The requested imports ask for setPrefs, applyTheme, applyDensity, applyAccentColor,
// but the underlying theme.js uses savePrefs and applyPrefs. We map them internally
// or just use what we have to make it functional. We import what exists and wrap it.

export function registerAjustesPista() {
    router.register('ajustes-pista', async (container) => {
        renderPage(container);
    });
}

function renderPage(container) {
    const prefs = getPrefs();

    container.innerHTML = `
        <div class="ajustes-page page-enter">
            <div class="page-header" style="margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button class="btn btn-secondary btn-icon" id="btn-back" title="Volver">←</button>
                    <div>
                        <h1 class="page-title">⚙️ Ajustes (Pista)</h1>
                        <p class="page-subtitle">Personaliza el aspecto de la aplicación y gestiona datos</p>
                    </div>
                </div>
            </div>

            <div class="card settings-card" style="margin-bottom:16px; padding:20px;">
                <h3 class="settings-section-title">🎬 Reproducción</h3>
                <div class="setting-row"><div><div class="setting-label">Salto de vídeo</div><div class="setting-hint">Segundos al avanzar o retroceder</div></div><input type="number" id="video-seek-seconds" class="form-input" min="1" max="60" value="${prefs.videoSeekSeconds || 5}" style="width:90px"></div>
                <div class="setting-row"><div><div class="setting-label">Velocidad inicial</div><div class="setting-hint">Se aplica a los nuevos scoutings</div></div><select id="video-default-speed" class="form-input" style="width:90px">${[0.5,0.75,1,1.25,1.5,2].map(speed => `<option value="${speed}" ${Number(prefs.videoDefaultSpeed || 1) === speed ? 'selected' : ''}>${speed}×</option>`).join('')}</select></div>
            </div>

            <div class="card settings-card" style="margin-bottom:16px; padding:20px;">
                <h3 class="settings-section-title">🏐 Selección de jugador</h3>
                <div class="setting-row"><div><div class="setting-label">Teclas numéricas</div><div class="setting-hint">Dorsales: escribes el dorsal. Posiciones (según el colocador, que debe ser único en pista; tras él van receptor, central, opuesto, receptor y central en orden de posición): 1 colocador/opuesto zaguero, 2 colocador/opuesto delantero, 3 central delantero, 4 receptor delantero, 5 central zaguero, 6 receptor zaguero, 7 líbero</div></div>
                    <select id="player-select-mode" class="form-input" style="width:140px"><option value="dorsales" ${prefs.playerSelectMode !== 'posiciones' ? 'selected' : ''}>Dorsales</option><option value="posiciones" ${prefs.playerSelectMode === 'posiciones' ? 'selected' : ''}>Posiciones</option></select></div>
            </div>

            ${renderKeybindings('pista')}

            <div class="card settings-card" style="margin-bottom: 16px; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border);">
                <h3 class="settings-section-title" style="margin-bottom: 16px; color: var(--text-primary);">🎨 Apariencia</h3>

                <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div>
                        <div class="setting-label" style="font-weight: 500; margin-bottom: 4px;">Tema</div>
                        <div class="setting-hint" style="font-size: 13px; color: var(--text-secondary);">Elige entre modo claro u oscuro</div>
                    </div>
                    <div class="theme-toggle-group" style="display: flex; gap: 8px;">
                        <button class="btn theme-opt ${prefs.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}" data-theme="dark">🌙 Oscuro</button>
                        <button class="btn theme-opt ${prefs.theme === 'light' ? 'btn-primary' : 'btn-secondary'}" data-theme="light">☀️ Claro</button>
                    </div>
                </div>

                <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div>
                        <div class="setting-label" style="font-weight: 500; margin-bottom: 4px;">Color de acento</div>
                        <div class="setting-hint" style="font-size: 13px; color: var(--text-secondary);">El color principal de botones y resaltados</div>
                    </div>
                    <div class="accent-picker" style="display: flex; gap: 8px;">
                        ${ACCENT_PRESETS.map(c => `
                            <button class="accent-swatch ${prefs.accent.toLowerCase() === c.value.toLowerCase() ? 'active' : ''}"
                                data-accent="${c.value}" title="${c.name}" style="background:${c.value}; width: 24px; height: 24px; border-radius: 50%; border: ${prefs.accent.toLowerCase() === c.value.toLowerCase() ? '2px solid white' : 'none'}; cursor: pointer;"></button>
                        `).join('')}
                        <label class="accent-swatch accent-custom" title="Color personalizado" style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: #333; cursor: pointer;">
                            <input type="color" id="accent-custom-input" value="${prefs.accent}" style="opacity: 0; position: absolute; width: 0; height: 0;">
                            <span style="font-size: 12px;">🎨</span>
                        </label>
                    </div>
                </div>

                <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div class="setting-label" style="font-weight: 500; margin-bottom: 4px;">Densidad</div>
                        <div class="setting-hint" style="font-size: 13px; color: var(--text-secondary);">Espaciado de la interfaz</div>
                    </div>
                    <div class="theme-toggle-group" style="display: flex; gap: 8px;">
                        <button class="btn density-opt ${prefs.density === 'normal' ? 'btn-primary' : 'btn-secondary'}" data-density="normal">Normal</button>
                        <button class="btn density-opt ${prefs.density === 'compact' ? 'btn-primary' : 'btn-secondary'}" data-density="compact">Compacta</button>
                    </div>
                </div>
                <div class="setting-row" style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
                    <div><div class="setting-label" style="font-weight:500; margin-bottom:4px;">Tamaño de texto</div><div class="setting-hint">Compacto, normal o grande</div></div>
                    <div class="theme-toggle-group"><button class="font-opt ${prefs.fontScale === 'compact' ? 'active' : ''}" data-font="compact">Pequeño</button><button class="font-opt ${(prefs.fontScale || 'normal') === 'normal' ? 'active' : ''}" data-font="normal">Normal</button><button class="font-opt ${prefs.fontScale === 'large' ? 'active' : ''}" data-font="large">Grande</button></div>
                </div>
                <div class="setting-row" style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
                    <div><div class="setting-label" style="font-weight:500; margin-bottom:4px;">Reducir animaciones</div><div class="setting-hint">Para una experiencia más estable durante el scouting</div></div>
                    <label><input type="checkbox" id="reduce-motion" ${prefs.reduceMotion ? 'checked' : ''}> Activado</label>
                </div>
            </div>

            <div class="card settings-card" style="margin-bottom: 16px; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border);">
                <h3 class="settings-section-title" style="margin-bottom: 16px; color: var(--text-primary);">💾 Base de Datos (Pista)</h3>
                <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div>
                        <div class="setting-label" style="font-weight: 500; margin-bottom: 4px;">Exportar copia de seguridad</div>
                        <div class="setting-hint" style="font-size: 13px; color: var(--text-secondary);">Guarda todos los datos de voleibol pista en un archivo .db</div>
                    </div>
                    <button class="btn btn-primary" id="btn-backup-db-pista">📤 Exportar</button>
                </div>
                <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div class="setting-label" style="font-weight: 500; margin-bottom: 4px;">Restaurar copia de seguridad</div>
                        <div class="setting-hint" style="font-size: 13px; color: var(--text-secondary);">Sustituye los datos actuales de pista por una copia anterior</div>
                    </div>
                    <button class="btn btn-secondary" id="btn-restore-db-pista" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">📥 Restaurar</button>
                </div>
            </div>

            <div class="card settings-card" style="padding: 20px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border);">
                <h3 class="settings-section-title" style="margin-bottom: 16px; color: var(--text-primary);">ℹ️ Acerca de BVScouter Pista</h3>
                <div class="setting-row">
                    <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.5;">
                        Módulo de scouting para voleibol indoor. <br>
                        Utiliza el sistema de evaluación DataVolley 4 para análisis estadístico avanzado.
                    </p>
                </div>
            </div>
        </div>
    `;

    bindEvents(container);
}

function bindEvents(container) {
    container.querySelector('#btn-back')?.addEventListener('click', () => {
        router.navigate('dashboard-pista');
    });

    container.querySelectorAll('.theme-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            setPrefs({ theme: btn.dataset.theme });
            
            // update UI buttons
            container.querySelectorAll('.theme-opt').forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-secondary');
            });
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
            
            showToast('Tema actualizado', 'success');
        });
    });

    container.querySelectorAll('.density-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            setPrefs({ density: btn.dataset.density });
            
            container.querySelectorAll('.density-opt').forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-secondary');
            });
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
        });
    });
    container.querySelectorAll('.font-opt').forEach(btn => btn.addEventListener('click', () => {
        setPrefs({ fontScale: btn.dataset.font });
        container.querySelectorAll('.font-opt').forEach(b => b.classList.toggle('active', b === btn));
    }));
    container.querySelector('#reduce-motion')?.addEventListener('change', e => setPrefs({ reduceMotion: e.target.checked }));

    container.querySelectorAll('.accent-swatch[data-accent]').forEach(btn => {
        btn.addEventListener('click', () => {
            setPrefs({ accent: btn.dataset.accent });
            container.querySelectorAll('.accent-swatch').forEach(b => {
                b.classList.remove('active');
                b.style.border = 'none';
            });
            btn.classList.add('active');
            btn.style.border = '2px solid white';
        });
    });

    const customInput = container.querySelector('#accent-custom-input');
    customInput?.addEventListener('input', (e) => {
        setPrefs({ accent: e.target.value });
        container.querySelectorAll('.accent-swatch').forEach(b => {
            b.classList.remove('active');
            b.style.border = 'none';
        });
    });

    container.querySelector('#video-seek-seconds')?.addEventListener('change', e => setPrefs({ videoSeekSeconds: Math.max(1, Math.min(60, Number(e.target.value) || 5)) }));
    container.querySelector('#video-default-speed')?.addEventListener('change', e => setPrefs({ videoDefaultSpeed: Number(e.target.value) }));
    container.querySelector('#player-select-mode')?.addEventListener('change', e => { setPrefs({ playerSelectMode: e.target.value }); showToast('Modo de selección actualizado', 'success'); });
    bindKeybindings(container, 'pista', () => renderPage(container));

    container.querySelector('#btn-backup-db-pista')?.addEventListener('click', async () => {
        try {
            const success = await window.apiPista.backupDatabasePista();
            if (success) {
                showToast('Copia de seguridad guardada con éxito', 'success');
            }
        } catch (error) {
            showToast('Error al guardar copia: ' + error.message, 'error');
        }
    });

    container.querySelector('#btn-restore-db-pista')?.addEventListener('click', async () => {
        if (confirm('⚠️ ADVERTENCIA: Esta acción sobrescribirá todos los datos actuales de pista. ¿Deseas continuar?')) {
            try {
                const success = await window.apiPista.restoreDatabasePista();
                if (success) {
                    showToast('Base de datos restaurada. Reinicia la aplicación.', 'success');
                }
            } catch (error) {
                showToast('Error al restaurar: ' + error.message, 'error');
            }
        }
    });
}
