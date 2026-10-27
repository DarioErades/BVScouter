import { router } from '../../router.js';
import { showToast, escapeHtml } from '../../utils/helpers.js';
import { POSICIONES_PISTA } from '../../utils/constants-pista.js';

let equiposCache = [];
let selectedEquipoId = null;
let jugadoresCache = [];
let editEquipoId = null;
let editingJugadorId = null;

export function registerEquiposPista() {
    router.register('equipos-pista', async (container) => {
        equiposCache = await window.apiPista.getEquipos();
        selectedEquipoId = null;
        jugadoresCache = [];
        editingJugadorId = null;
        renderPage(container);
    });
}

function renderPage(container) {
    container.innerHTML = `
        <style>
            .equipo-card:hover { border-color: var(--accent-color) !important; }
            .roster-row:hover { background: rgba(255,255,255,0.05) !important; }
            .roster-table th { font-weight: 600; color: #bbb; }
        </style>
        <div class="equipos-pista-page" style="display: flex; gap: 20px; height: 100%; overflow: hidden;">
            <div class="equipos-sidebar" style="width: 320px; display: flex; flex-direction: column; overflow-y: auto;">
                <div class="page-header flex items-center justify-between" style="margin-bottom: 20px;">
                    <div>
                        <h1 class="page-title" style="margin: 0; font-size: 1.5rem;">🏐 Equipos</h1>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-secondary" id="btn-importar-equipo" title="Importar plantilla desde VolleyStats Tablet">📥 Importar</button>
                        <button class="btn btn-primary" id="btn-nuevo-equipo" title="Nuevo Equipo">➕ Nuevo</button>
                    </div>
                </div>
                <div id="equipos-list" class="flex flex-col gap-12" style="display:flex; flex-direction:column; gap:10px;"></div>
            </div>

            <div class="roster-main" style="flex: 1; overflow-y: auto; padding: 20px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color);">
                <div id="roster-content" style="height: 100%;">
                    <div class="empty-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#888;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                        <p>Selecciona un equipo para ver su plantilla</p>
                    </div>
                </div>
            </div>
        </div>

        <div id="modal-equipo" class="modal-overlay" style="display:none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); align-items: center; justify-content: center; z-index: 1000;">
            <div class="modal-card" style="background: var(--bg-color); padding: 24px; border-radius: 8px; width: 400px; border: 1px solid var(--border-color);">
                <h3 id="modal-equipo-title" class="modal-title" style="margin-top:0; margin-bottom: 16px;">Nuevo Equipo</h3>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label class="form-label">Nombre *</label>
                    <input type="text" id="eq-nombre" class="form-input" style="width: 100%; box-sizing: border-box;">
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label class="form-label">Abreviatura</label>
                    <input type="text" id="eq-abreviatura" class="form-input" maxlength="4" style="width: 100%; box-sizing: border-box;" placeholder="Ej: MAD">
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                    <label class="form-label">Notas</label>
                    <textarea id="eq-notas" class="form-textarea" style="width: 100%; box-sizing: border-box;"></textarea>
                </div>
                <div class="flex gap-12 justify-end" style="display:flex; gap:10px; justify-content:flex-end;">
                    <button class="btn btn-secondary" id="btn-cancelar-equipo">Cancelar</button>
                    <button class="btn btn-primary" id="btn-guardar-equipo">Guardar</button>
                </div>
            </div>
        </div>
    `;

    renderEquipos();

    document.getElementById('btn-nuevo-equipo').addEventListener('click', () => openModalEquipo(null));
    document.getElementById('btn-importar-equipo').addEventListener('click', importarEquipo);
    document.getElementById('btn-cancelar-equipo').addEventListener('click', closeModalEquipo);
    document.getElementById('btn-guardar-equipo').addEventListener('click', guardarEquipo);
    document.getElementById('modal-equipo').addEventListener('click', (e) => {
        if (e.target.id === 'modal-equipo') closeModalEquipo();
    });
}

function renderEquipos() {
    const list = document.getElementById('equipos-list');
    if (!list) return;

    if (equiposCache.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="padding: 20px; text-align: center; color: #888;">
                <p>No hay equipos creados</p>
            </div>`;
        return;
    }

    list.innerHTML = equiposCache.map(eq => {
        const isSelected = selectedEquipoId === eq.id;
        const borderColor = isSelected ? 'var(--accent-color)' : 'var(--border-color)';
        const playerCount = eq.player_count !== undefined ? eq.player_count : 0;
        return `
        <div class="equipo-card" data-id="${eq.id}" style="padding: 15px; border-radius: 8px; border: 1px solid ${borderColor}; background: var(--bg-color); cursor: pointer; transition: border-color 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${eq.abreviatura ? `<span style="background: var(--accent-color); color: #000; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.8rem;">${escapeHtml(eq.abreviatura)}</span>` : ''}
                    <h3 style="margin: 0; font-size: 1.1rem;">${escapeHtml(eq.nombre)}</h3>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button class="icon-btn btn-export-eq" data-id="${eq.id}" title="Exportar plantilla para la tablet" style="background:none; border:none; cursor:pointer;">📤</button>
                    <button class="icon-btn btn-edit-eq" data-id="${eq.id}" title="Editar" style="background:none; border:none; cursor:pointer;">✏️</button>
                    <button class="icon-btn btn-del-eq" data-id="${eq.id}" title="Eliminar" style="background:none; border:none; cursor:pointer;">🗑️</button>
                </div>
            </div>
            <div style="font-size: 0.9rem; color: #888; display: flex; justify-content: space-between;">
                <span>${eq.notas ? escapeHtml(eq.notas) : ''}</span>
                <span>Jugadores: ${playerCount}</span>
            </div>
        </div>
        `;
    }).join('');

    list.querySelectorAll('.equipo-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-edit-eq') || e.target.closest('.btn-del-eq')) return;
            seleccionarEquipo(parseInt(card.dataset.id, 10));
        });
    });

    list.querySelectorAll('.btn-edit-eq').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const eq = equiposCache.find(x => x.id === parseInt(btn.dataset.id, 10));
            if (eq) openModalEquipo(eq);
        });
    });

    list.querySelectorAll('.btn-del-eq').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            eliminarEquipo(parseInt(btn.dataset.id, 10));
        });
    });

    list.querySelectorAll('.btn-export-eq').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const ruta = await window.apiPista.exportRosterForTablet(parseInt(btn.dataset.id, 10));
                if (ruta) showToast('Plantilla exportada: ábrela con "Importar" en VolleyStats Tablet', 'success');
            } catch (err) {
                showToast(err.message || 'Error al exportar la plantilla', 'error');
            }
        });
    });
}

async function importarEquipo() {
    try {
        const creado = await window.apiPista.importRosterFromTablet();
        if (!creado) return; // canceló el diálogo
        showToast(`Equipo "${creado.nombre}" importado`, 'success');
        equiposCache = await window.apiPista.getEquipos();
        renderEquipos();
        seleccionarEquipo(creado.id);
    } catch (err) {
        showToast(err.message || 'Error al importar la plantilla', 'error');
    }
}

function openModalEquipo(eq) {
    editEquipoId = eq ? eq.id : null;
    document.getElementById('modal-equipo-title').textContent = eq ? 'Editar Equipo' : 'Nuevo Equipo';
    document.getElementById('eq-nombre').value = eq?.nombre || '';
    document.getElementById('eq-abreviatura').value = eq?.abreviatura || '';
    document.getElementById('eq-notas').value = eq?.notas || '';
    document.getElementById('modal-equipo').style.display = 'flex';
    document.getElementById('eq-nombre').focus();
}

function closeModalEquipo() {
    document.getElementById('modal-equipo').style.display = 'none';
    editEquipoId = null;
}

async function guardarEquipo() {
    const data = {
        nombre: document.getElementById('eq-nombre').value.trim(),
        abreviatura: document.getElementById('eq-abreviatura').value.trim().toUpperCase(),
        notas: document.getElementById('eq-notas').value.trim()
    };
    if (!data.nombre) {
        showToast('El nombre es obligatorio', 'error');
        return;
    }
    try {
        if (editEquipoId) {
            await window.apiPista.updateEquipo(editEquipoId, data);
            showToast('Equipo actualizado', 'success');
        } else {
            await window.apiPista.createEquipo(data);
            showToast('Equipo creado', 'success');
        }
        equiposCache = await window.apiPista.getEquipos();
        closeModalEquipo();
        renderEquipos();
        if (selectedEquipoId === editEquipoId) {
            renderRosterPanel(); 
        }
    } catch (e) {
        showToast('Error al guardar equipo', 'error');
        console.error(e);
    }
}

async function eliminarEquipo(id) {
    const eq = equiposCache.find(x => x.id === id);
    if (!eq) return;
    if (!confirm(`¿Eliminar al equipo ${eq.nombre}? También se eliminarán sus jugadores.`)) return;
    try {
        await window.apiPista.deleteEquipo(id);
        equiposCache = equiposCache.filter(x => x.id !== id);
        showToast('Equipo eliminado', 'info');
        if (selectedEquipoId === id) {
            selectedEquipoId = null;
            jugadoresCache = [];
            renderRosterPanel();
        }
        renderEquipos();
    } catch (e) {
        showToast('Error al eliminar equipo', 'error');
        console.error(e);
    }
}

async function seleccionarEquipo(id) {
    selectedEquipoId = id;
    renderEquipos();
    try {
        jugadoresCache = await window.apiPista.getJugadoresByEquipo(id);
        editingJugadorId = null;
        renderRosterPanel();
    } catch (e) {
        showToast('Error al cargar plantilla', 'error');
        console.error(e);
    }
}

function renderRosterPanel() {
    setTimeout(() => document.getElementById('btn-stats-equipo')?.addEventListener('click', () => router.navigate('estadisticas-equipo-pista', { equipoId: selectedEquipoId })), 0);
    const content = document.getElementById('roster-content');
    if (!content) return;

    if (!selectedEquipoId) {
        content.innerHTML = `
            <div class="empty-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#888;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                <p>Selecciona un equipo para ver su plantilla</p>
            </div>
        `;
        return;
    }

    const eq = equiposCache.find(x => x.id === selectedEquipoId);
    
    let tableHtml = `
        <div style="margin-bottom: 20px;">
            <h2 style="margin:0 0 5px 0; font-size:1.5rem;">${escapeHtml(eq.nombre)} - Plantilla</h2>
            <p style="margin:0; color:#888;">Gestiona los jugadores y sus dorsales.</p>
            <button class="btn btn-primary" id="btn-stats-equipo" style="margin-top:12px">📈 Estadísticas del equipo</button>
        </div>
        <div style="overflow-x: auto;">
            <table class="roster-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color);">
                        <th style="padding: 10px; width: 80px;">Dorsal</th>
                        <th style="padding: 10px;">Nombre</th>
                        <th style="padding: 10px;">Apellidos</th>
                        <th style="padding: 10px; width: 150px;">Posición</th>
                        <th style="padding: 10px; width: 100px;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (jugadoresCache.length === 0) {
        tableHtml += `
            <tr>
                <td colspan="5" style="padding: 20px; text-align: center; color: #888;">
                    No hay jugadores en este equipo
                </td>
            </tr>
        `;
    } else {
        jugadoresCache.forEach(j => {
            if (editingJugadorId === j.id) {
                // Edit row
                tableHtml += `
                    <tr style="border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.05);">
                        <td style="padding: 10px;">
                            <input type="number" id="edit-dorsal-${j.id}" class="form-input" style="width: 60px;" min="0" max="99" value="${j.dorsal !== null ? j.dorsal : ''}">
                        </td>
                        <td style="padding: 10px;">
                            <input type="text" id="edit-nombre-${j.id}" class="form-input" style="width: 100%; box-sizing:border-box;" value="${escapeHtml(j.nombre)}">
                        </td>
                        <td style="padding: 10px;">
                            <input type="text" id="edit-apellidos-${j.id}" class="form-input" style="width: 100%; box-sizing:border-box;" value="${escapeHtml(j.apellidos || '')}">
                        </td>
                        <td style="padding: 10px;">
                            <select id="edit-posicion-${j.id}" class="form-select" style="width: 100%; box-sizing:border-box;">
                                <option value="">--</option>
                                ${POSICIONES_PISTA.map(p => `<option value="${p}" ${p === j.posicion ? 'selected' : ''}>${p}</option>`).join('')}
                            </select>
                        </td>
                        <td style="padding: 10px;">
                            <div style="display:flex; gap:5px;">
                                <button class="btn btn-primary btn-sm btn-save-jug" data-id="${j.id}" style="padding: 4px 8px;" title="Guardar">💾</button>
                                <button class="btn btn-secondary btn-sm btn-cancel-jug" data-id="${j.id}" style="padding: 4px 8px;" title="Cancelar">❌</button>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                // Display row
                tableHtml += `
                    <tr class="roster-row" style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;">
                        <td style="padding: 10px; font-weight: bold;">${j.dorsal !== null && j.dorsal !== undefined ? j.dorsal : '-'}</td>
                        <td style="padding: 10px;">${escapeHtml(j.nombre)}</td>
                        <td style="padding: 10px;">${escapeHtml(j.apellidos || '')}</td>
                        <td style="padding: 10px;">${j.posicion ? escapeHtml(j.posicion) : '-'}</td>
                        <td style="padding: 10px;">
                            <div style="display:flex; gap:5px;">
                                <button class="icon-btn btn-edit-jug" data-id="${j.id}" style="background:none; border:none; cursor:pointer;" title="Editar">✏️</button>
                                <button class="icon-btn btn-del-jug" data-id="${j.id}" style="background:none; border:none; cursor:pointer;" title="Eliminar">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
            }
        });
    }

    // Add row
    tableHtml += `
                </tbody>
                <tfoot>
                    <tr style="border-top: 2px solid var(--border-color); background: rgba(255,255,255,0.02);">
                        <td style="padding: 10px;">
                            <input type="number" id="new-dorsal" class="form-input" style="width: 60px;" min="0" max="99" placeholder="#">
                        </td>
                        <td style="padding: 10px;">
                            <input type="text" id="new-nombre" class="form-input" style="width: 100%; box-sizing:border-box;" placeholder="Nombre *">
                        </td>
                        <td style="padding: 10px;">
                            <input type="text" id="new-apellidos" class="form-input" style="width: 100%; box-sizing:border-box;" placeholder="Apellidos">
                        </td>
                        <td style="padding: 10px;">
                            <select id="new-posicion" class="form-select" style="width: 100%; box-sizing:border-box;">
                                <option value="">Posición</option>
                                ${POSICIONES_PISTA.map(p => `<option value="${p}">${p}</option>`).join('')}
                            </select>
                        </td>
                        <td style="padding: 10px;">
                            <button class="btn btn-primary btn-sm" id="btn-add-jugador" style="padding: 4px 12px; height: 100%;">Añadir</button>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    content.innerHTML = tableHtml;

    // Edit Jugador
    content.querySelectorAll('.btn-edit-jug').forEach(btn => {
        btn.addEventListener('click', () => {
            editingJugadorId = parseInt(btn.dataset.id, 10);
            renderRosterPanel();
        });
    });

    // Cancel Edit
    content.querySelectorAll('.btn-cancel-jug').forEach(btn => {
        btn.addEventListener('click', () => {
            editingJugadorId = null;
            renderRosterPanel();
        });
    });

    // Save Edit
    content.querySelectorAll('.btn-save-jug').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id, 10);
            const dorsalVal = document.getElementById(`edit-dorsal-${id}`).value;
            const dorsal = dorsalVal === '' ? null : parseInt(dorsalVal, 10);
            const nombre = document.getElementById(`edit-nombre-${id}`).value.trim();
            const apellidos = document.getElementById(`edit-apellidos-${id}`).value.trim();
            const posicion = document.getElementById(`edit-posicion-${id}`).value;
            const es_libero = posicion === 'Líbero' ? 1 : 0;

            if (!nombre) {
                showToast('El nombre es obligatorio', 'error');
                return;
            }

            try {
                await window.apiPista.updateJugadorPista(id, { dorsal, nombre, apellidos, posicion, es_libero });
                showToast('Jugador actualizado', 'success');
                editingJugadorId = null;
                await refreshJugadores();
            } catch(e) {
                showToast('Error al actualizar jugador', 'error');
                console.error(e);
            }
        });
    });

    // Delete Jugador
    content.querySelectorAll('.btn-del-jug').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id, 10);
            const j = jugadoresCache.find(x => x.id === id);
            if (!confirm(`¿Eliminar a ${j.nombre}?`)) return;
            try {
                await window.apiPista.deleteJugadorPista(id);
                showToast('Jugador eliminado', 'info');
                await refreshJugadores();
            } catch(e) {
                showToast('Error al eliminar jugador', 'error');
                console.error(e);
            }
        });
    });

    // Add Jugador
    const btnAdd = document.getElementById('btn-add-jugador');
    if (btnAdd) {
        btnAdd.addEventListener('click', async () => {
            const dorsalVal = document.getElementById('new-dorsal').value;
            const dorsal = dorsalVal === '' ? null : parseInt(dorsalVal, 10);
            const nombre = document.getElementById('new-nombre').value.trim();
            const apellidos = document.getElementById('new-apellidos').value.trim();
            const posicion = document.getElementById('new-posicion').value;
            const es_libero = posicion === 'Líbero' ? 1 : 0;

            if (!nombre) {
                showToast('El nombre es obligatorio', 'error');
                return;
            }

            try {
                await window.apiPista.createJugadorPista({ equipo_id: selectedEquipoId, dorsal, nombre, apellidos, posicion, es_libero });
                showToast('Jugador añadido', 'success');
                await refreshJugadores();
            } catch(e) {
                showToast('Error al añadir jugador', 'error');
                console.error(e);
            }
        });
        
        ['new-dorsal', 'new-nombre', 'new-apellidos', 'new-posicion'].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        btnAdd.click();
                    }
                });
            }
        });
    }
}

async function refreshJugadores() {
    if (selectedEquipoId) {
        jugadoresCache = await window.apiPista.getJugadoresByEquipo(selectedEquipoId);
        equiposCache = await window.apiPista.getEquipos(); // refresh counts
        renderEquipos();
        renderRosterPanel();
    }
}
