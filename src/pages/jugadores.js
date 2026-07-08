// pagina de gestion de jugadores

import { router } from '../router.js';
import { showToast } from '../utils/helpers.js';
import { NACIONALIDADES } from '../utils/constants.js';

export function registerJugadores() {
    router.register('jugadores', async (container) => {
        const jugadores = await window.api.getJugadores();

        container.innerHTML = `
            <div class="jugadores-page">
                <div class="page-header flex justify-between items-center">
                    <div>
                        <h1 class="page-title">👥 Jugadores</h1>
                        <p class="page-subtitle">Gestiona los jugadores rivales para el scouting</p>
                    </div>
                    <button class="btn btn-primary" id="btn-nuevo-jugador">✚ Nuevo Jugador</button>
                </div>

                ${jugadores.length === 0 ? `
                    <div class="card">
                        <div class="empty-state">
                            <div class="empty-state-icon">🏃</div>
                            <p class="empty-state-text">No hay jugadores registrados</p>
                            <p class="empty-state-hint">Añade jugadores rivales para poder hacer scouting</p>
                        </div>
                    </div>
                ` : `
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Apellidos</th>
                                    <th>Nacionalidad</th>
                                    <th>Posición</th>
                                    <th>Notas</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${jugadores.map(j => `
                                    <tr>
                                        <td>${j.nombre}</td>
                                        <td>${j.apellidos}</td>
                                        <td>${j.nacionalidad || '-'}</td>
                                        <td>${j.posicion || '-'}</td>
                                        <td class="text-muted">${j.notas ? j.notas.substring(0, 50) + '...' : '-'}</td>
                                        <td>
                                            <div class="flex gap-8">
                                                <button class="btn btn-sm btn-secondary btn-editar" data-id="${j.id}">✏️ Editar</button>
                                                <button class="btn btn-sm btn-danger btn-eliminar" data-id="${j.id}">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;

        // boton nuevo jugador
        document.getElementById('btn-nuevo-jugador').addEventListener('click', () => {
            mostrarFormularioJugador(container);
        });

        // botones editar
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const jugador = await window.api.getJugador(parseInt(btn.dataset.id));
                mostrarFormularioJugador(container, jugador);
            });
        });

        // botones eliminar
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('¿Seguro que quieres eliminar este jugador? Se borrarán también sus acciones.')) {
                    await window.api.deleteJugador(parseInt(btn.dataset.id));
                    showToast('Jugador eliminado', 'success');
                    router.navigate('jugadores');
                }
            });
        });
    });
}

function mostrarFormularioJugador(container, jugador = null) {
    const esEdicion = jugador !== null;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <h2 class="modal-title">${esEdicion ? '✏️ Editar Jugador' : '✚ Nuevo Jugador'}</h2>
            <form id="form-jugador">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nombre *</label>
                        <input type="text" class="form-input" id="input-nombre" value="${jugador?.nombre || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Apellidos *</label>
                        <input type="text" class="form-input" id="input-apellidos" value="${jugador?.apellidos || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nacionalidad</label>
                        <select class="form-select" id="input-nacionalidad">
                            <option value="">Seleccionar...</option>
                            ${NACIONALIDADES.map(n => `
                                <option value="${n}" ${jugador?.nacionalidad === n ? 'selected' : ''}>${n}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Posición</label>
                        <select class="form-select" id="input-posicion">
                            <option value="">Seleccionar...</option>
                            <option value="Bloqueador" ${jugador?.posicion === 'Bloqueador' ? 'selected' : ''}>Bloqueador</option>
                            <option value="Defensor" ${jugador?.posicion === 'Defensor' ? 'selected' : ''}>Defensor</option>
                            <option value="Polivalente" ${jugador?.posicion === 'Polivalente' ? 'selected' : ''}>Polivalente</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Notas</label>
                    <textarea class="form-textarea" id="input-notas" placeholder="Observaciones sobre el jugador...">${jugador?.notas || ''}</textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" id="btn-cancelar">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${esEdicion ? 'Guardar Cambios' : 'Crear Jugador'}</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    // cerrar modal
    document.getElementById('btn-cancelar').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    // submit
    document.getElementById('form-jugador').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            nombre: document.getElementById('input-nombre').value.trim(),
            apellidos: document.getElementById('input-apellidos').value.trim(),
            nacionalidad: document.getElementById('input-nacionalidad').value,
            posicion: document.getElementById('input-posicion').value,
            notas: document.getElementById('input-notas').value.trim()
        };

        if (!data.nombre || !data.apellidos) {
            showToast('Nombre y apellidos son obligatorios', 'error');
            return;
        }

        if (esEdicion) {
            await window.api.updateJugador(jugador.id, data);
            showToast('Jugador actualizado', 'success');
        } else {
            await window.api.createJugador(data);
            showToast('Jugador creado', 'success');
        }

        overlay.remove();
        router.navigate('jugadores');
    });
}
