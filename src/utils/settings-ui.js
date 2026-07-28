import { getKeybindingDefinitions, getKeybindings, resetKeybindings, saveKeybindings } from './keybindings.js';
import { showToast } from './helpers.js';

const groups = [['actions', 'Acciones'], ['common', 'Resultados, jugadores y vídeo'], ['subtypeRows', 'Subtipos']];
const keyLabel = (key) => ({ ' ': 'Espacio', MouseBack: 'Mouse Atrás', MouseForward: 'Mouse Adelante' }[key] || key || 'Sin asignar');

export function renderKeybindings(mode) {
    const definitions = getKeybindingDefinitions(mode);
    const values = getKeybindings(mode);
    return `<div class="card settings-card keybindings-card"><div class="settings-heading-row"><div><h3 class="settings-section-title">⌨️ Atajos de teclado</h3><p class="setting-hint">Pulsa una tecla en un campo para reasignarla. Los atajos son independientes para ${mode === 'pista' ? 'Pista' : 'Playa'}.</p></div><button class="btn btn-secondary btn-sm" id="btn-reset-keybindings">↺ Atajos predeterminados</button></div><div class="keybindings-groups">${groups.map(([id, title]) => `<details class="keybinding-group" ${id !== 'subtypeRows' ? 'open' : ''}><summary>${title} <span>${definitions[id].length}</span></summary><div class="keybinding-list">${definitions[id].map(([bindId, label]) => `<label class="keybinding-row"><span>${label}</span><input class="form-input key-capture" data-binding="${bindId}" value="${keyLabel(values[bindId])}" readonly aria-label="Atajo para ${label}"></label>`).join('')}</div></details>`).join('')}</div></div>`;
}

export function bindKeybindings(container, mode, rerender) {
    container.querySelectorAll('.key-capture').forEach(input => {
        const saveCaptured = (key) => {
            const duplicate = Object.entries(getKeybindings(mode)).find(([id, value]) => id !== input.dataset.binding && value === key);
            if (duplicate) return showToast(`La tecla ${keyLabel(key)} ya está asignada. Elige otra.`, 'warning');
            saveKeybindings(mode, { [input.dataset.binding]: key });
            input.value = keyLabel(key); showToast('Atajo actualizado', 'success');
        };
        input.addEventListener('keydown', (event) => {
            event.preventDefault(); event.stopPropagation();
            if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(event.key)) return;
            saveCaptured(event.key);
        });
        input.addEventListener('mousedown', (event) => {
            if (event.button !== 3 && event.button !== 4) return;
            event.preventDefault(); event.stopPropagation();
            saveCaptured(event.button === 3 ? 'MouseBack' : 'MouseForward');
        });
    });
    container.querySelector('#btn-reset-keybindings')?.addEventListener('click', () => {
        if (!confirm('¿Restablecer todos los atajos de esta modalidad?')) return;
        resetKeybindings(mode); rerender(); showToast('Atajos restablecidos', 'info');
    });
}
