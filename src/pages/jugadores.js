// pagina CRUD de jugadores

import { router } from '../router.js';
import { showToast } from '../utils/helpers.js';
import { NACIONALIDADES } from '../utils/constants.js';

let jugadoresCache = [];
let filtro = '';
let editId = null;

export function registerJugadores() {
    router.register('jugadores', async (container) => {
        jugadoresCache = await window.api.getJugadores();
        filtro = '';
        renderPage(container);
    });
}

function jugadoresFiltrados() {
    const q = filtro.trim().toLowerCase();
    if (!q) return jugadoresCache;
    return jugadoresCache.filter(j =>
        `${j.nombre} ${j.apellidos} ${j.nacionalidad} ${j.posicion}`.toLowerCase().includes(q)
    );
}

function renderPage(container) {
    container.innerHTML = `
        <div class="jugadores-page">
            <div class="page-header flex items-center justify-between">
                <div>
                    <h1 class="page-title">👥 Jugadores</h1>
                    <p class="page-subtitle">Gestiona tu base de datos de jugadores</p>
                </div>
                <button class="btn btn-primary" id="btn-nuevo-jugador">➕ Nuevo Jugador</button>
            </div>

            <div class="search-bar" style="margin-bottom: 20px;">
                <span class="search-icon">🔍</span>
                <input type="text" id="input-buscar-jugador" class="form-input search-input"
                    placeholder="Buscar por nombre, apellidos, nacionalidad..." value="${escapeHtml(filtro)}">
            </div>

            <div id="jugadores-grid" class="jugadores-grid"></div>
        </div>

        <div id="modal-jugador" class="modal-overlay" style="display:none;">
            <div class="modal-card">
                <h3 id="modal-jugador-title" class="modal-title">Nuevo Jugador</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nombre *</label>
                        <input type="text" id="jug-nombre" class="form-input" placeholder="Ej: Anders">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Apellidos</label>
                        <input type="text" id="jug-apellidos" class="form-input" placeholder="Ej: Mol">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nacionalidad</label>
                        <select id="jug-nacionalidad" class="form-select">
                            <option value="">Sin especificar</option>
                            ${NACIONALIDADES.map(n => `<option value="${n}">${n}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Posición / Rol</label>
                        <input type="text" id="jug-posicion" class="form-input" placeholder="Ej: Defensor / Bloqueador">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Notas</label>
                    <textarea id="jug-notas" class="form-textarea" placeholder="Notas sobre el jugador..."></textarea>
                </div>
                <div class="flex gap-12 justify-end" style="margin-top: 20px;">
                    <button class="btn btn-secondary" id="btn-cancelar-jugador">Cancelar</button>
                    <button class="btn btn-primary" id="btn-guardar-jugador">Guardar</button>
                </div>
            </div>
        </div>
    `;

    renderGrid();

    document.getElementById('btn-nuevo-jugador').addEventListener('click', () => openModal(null));
    document.getElementById('input-buscar-jugador').addEventListener('input', (e) => {
        filtro = e.target.value;
        renderGrid();
    });
    document.getElementById('btn-cancelar-jugador').addEventListener('click', closeModal);
    document.getElementById('btn-guardar-jugador').addEventListener('click', guardarJugador);
    document.getElementById('modal-jugador').addEventListener('click', (e) => {
        if (e.target.id === 'modal-jugador') closeModal();
    });
}

function renderGrid() {
    const grid = document.getElementById('jugadores-grid');
    if (!grid) return;
    const lista = jugadoresFiltrados();

    if (lista.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">👤</div>
                <p>${jugadoresCache.length === 0 ? 'Todavía no has añadido jugadores' : 'Ningún jugador coincide con la búsqueda'}</p>
            </div>`;
        return;
    }

    grid.innerHTML = lista.map(j => {
        const nombreCompleto = `${j.nombre}${j.apellidos ? ' ' + j.apellidos : ''}`;
        const iniciales = (j.nombre?.[0] || '?').toUpperCase() + (j.apellidos?.[0] || '').toUpperCase();
        return `
            <div class="jugador-card">
                <div class="jugador-avatar">${iniciales}</div>
                <div class="jugador-info">
                    <div class="jugador-nombre">${escapeHtml(nombreCompleto)}</div>
                    <div class="jugador-meta">
                        ${j.nacionalidad ? `<span class="chip">${escapeHtml(j.nacionalidad)}</span>` : ''}
                        ${j.posicion ? `<span class="chip chip-accent">${escapeHtml(j.posicion)}</span>` : ''}
                    </div>
                    ${j.notas ? `<div class="jugador-notas">${escapeHtml(j.notas)}</div>` : ''}
                </div>
                <div class="jugador-actions">
                    <button class="icon-btn" data-edit="${j.id}" title="Editar">✏️</button>
                    <button class="icon-btn icon-btn-danger" data-del="${j.id}" title="Eliminar">🗑️</button>
                </div>
            </div>`;
    }).join('');

    grid.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
            const j = jugadoresCache.find(x => x.id === parseInt(btn.dataset.edit, 10));
            if (j) openModal(j);
        });
    });
    grid.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => eliminarJugador(parseInt(btn.dataset.del, 10)));
    });
}

function openModal(jugador) {
    editId = jugador ? jugador.id : null;
    document.getElementById('modal-jugador-title').textContent = jugador ? 'Editar Jugador' : 'Nuevo Jugador';
    document.getElementById('jug-nombre').value = jugador?.nombre || '';
    document.getElementById('jug-apellidos').value = jugador?.apellidos || '';
    document.getElementById('jug-nacionalidad').value = jugador?.nacionalidad || '';
    document.getElementById('jug-posicion').value = jugador?.posicion || '';
    document.getElementById('jug-notas').value = jugador?.notas || '';
    document.getElementById('modal-jugador').style.display = 'flex';
    document.getElementById('jug-nombre').focus();
}

function closeModal() {
    document.getElementById('modal-jugador').style.display = 'none';
    editId = null;
}

async function guardarJugador() {
    const data = {
        nombre: document.getElementById('jug-nombre').value.trim(),
        apellidos: document.getElementById('jug-apellidos').value.trim(),
        nacionalidad: document.getElementById('jug-nacionalidad').value,
        posicion: document.getElementById('jug-posicion').value.trim(),
        notas: document.getElementById('jug-notas').value.trim()
    };
    if (!data.nombre) {
        showToast('El nombre es obligatorio', 'error');
        return;
    }
    if (editId) {
        await window.api.updateJugador(editId, data);
        showToast('Jugador actualizado', 'success');
    } else {
        await window.api.createJugador(data);
        showToast('Jugador creado', 'success');
    }
    jugadoresCache = await window.api.getJugadores();
    closeModal();
    renderGrid();
}

async function eliminarJugador(id) {
    const j = jugadoresCache.find(x => x.id === id);
    if (!j) return;
    if (!confirm(`¿Eliminar a ${j.nombre} ${j.apellidos || ''}? Esta acción no se puede deshacer.`)) return;
    await window.api.deleteJugador(id);
    jugadoresCache = jugadoresCache.filter(x => x.id !== id);
    showToast('Jugador eliminado', 'info');
    renderGrid();
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
