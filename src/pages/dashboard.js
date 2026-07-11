// pagina del dashboard

import { router } from '../router.js';
import { formatDate } from '../utils/helpers.js';

let currentFolderId = null;
let allCarpetas = [];
let allPartidos = [];

export function registerDashboard() {
    router.register('dashboard', async (container) => {
        allPartidos = await window.api.getPartidos();
        allCarpetas = await window.api.getCarpetas();
        
        // si entramos de nuevas o el estado de la ruta indica otra cosa, pero por defecto a null (raiz)
        currentFolderId = null;

        renderDashboard(container);
    });
}

function renderDashboard(container) {
    const currentFolder = currentFolderId ? allCarpetas.find(c => c.id === currentFolderId) : null;
    
    // Filtramos partidos
    const partidosToShow = currentFolderId 
        ? allPartidos.filter(p => p.carpeta_id === currentFolderId)
        : allPartidos.filter(p => !p.carpeta_id);
        
    // En la raiz mostramos todas las carpetas. Dentro de una carpeta, no mostramos subcarpetas (solo 1 nivel de momento)
    const carpetasToShow = currentFolderId ? [] : allCarpetas;

    container.innerHTML = `
        <div class="dashboard-page">
            <div class="page-header">
                <h1 class="page-title">🏐 Explorador de Partidos</h1>
                <p class="page-subtitle">Organiza tus partidos en carpetas</p>
            </div>

            <div class="card explorer-card">
                <div class="explorer-header flex justify-between items-center" style="margin-bottom: 20px;">
                    <div class="breadcrumb flex gap-8 items-center font-semibold">
                        <button class="btn btn-sm btn-secondary btn-breadcrumb" data-id="null">🏠 Raíz</button>
                        ${currentFolder ? `<span style="color: #64748b;">/</span> <span style="color: #38bdf8;">📂 ${currentFolder.nombre}</span>` : ''}
                    </div>
                    <div class="explorer-actions flex gap-8">
                        ${!currentFolderId ? `<button class="btn btn-sm btn-secondary" id="btn-nueva-carpeta">📁 Nueva Carpeta</button>` : ''}
                        <button class="btn btn-primary btn-sm" id="btn-nuevo-partido-dash">✚ Nuevo Partido</button>
                    </div>
                </div>

                ${(!currentFolderId && carpetasToShow.length > 0) ? `
                    <h3 style="margin-bottom: 12px; color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Carpetas</h3>
                    <div class="grid grid-carpetas" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 30px;">
                        ${carpetasToShow.map(c => `
                            <div class="carpeta-item card-hover" data-id="${c.id}" style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s;">
                                <div class="flex items-center gap-12" style="pointer-events: none;">
                                    <span style="font-size: 1.5rem;">📁</span>
                                    <span class="font-medium text-white">${c.nombre}</span>
                                </div>
                                <button class="btn-eliminar-carpeta" data-id="${c.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; opacity: 0.5; padding: 4px;">🗑️</button>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <h3 style="margin-bottom: 12px; color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Partidos</h3>
                ${partidosToShow.length === 0 ? `
                    <div class="empty-state" style="padding: 40px; text-align: center; background: #1e293b; border-radius: 12px; border: 1px dashed #334155;">
                        <div class="empty-state-icon" style="font-size: 3rem; margin-bottom: 10px;">🏖️</div>
                        <p class="empty-state-text font-medium">Esta carpeta está vacía</p>
                    </div>
                ` : `
                    <div class="partidos-list" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                        ${partidosToShow.map(p => `
                            <div class="partido-item card-hover" draggable="true" data-id="${p.id}" style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; cursor: grab; display: flex; align-items: center; justify-content: space-between; user-select: none; transition: transform 0.2s, box-shadow 0.2s;">
                                <div class="flex items-center gap-12" style="pointer-events: none; display: flex; align-items: center; gap: 16px;">
                                    <span style="font-size: 2rem;">🏐</span>
                                    <div>
                                        <div class="font-semibold text-white" style="font-size: 1rem; margin-bottom: 4px;">
                                            ${p.jugador1_nombre} / ${p.jugador2_nombre}
                                        </div>
                                        <div style="font-size: 0.85rem; color: #94a3b8;">
                                            📅 ${formatDate(p.fecha)} ${p.torneo ? `| 🏆 ${p.torneo}` : ''} ${p.fase ? `| 🏷️ ${p.fase}` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-12" style="display: flex; align-items: center; gap: 16px;">
                                    <span class="badge badge-info" style="font-family: monospace; font-size: 0.9rem; padding: 6px 12px; background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px;">
                                        Resultado: ${p.resultado || '-'}
                                    </span>
                                    <div class="flex gap-8" style="display: flex; gap: 8px;">
                                        <button class="btn btn-sm btn-secondary btn-scouting" data-id="${p.id}">📋 Scouting</button>
                                        <button class="btn btn-sm btn-secondary btn-informe" data-id="${p.id}">📊 Informe</button>
                                        <button class="btn btn-sm btn-secondary btn-eliminar-partido" data-id="${p.id}" title="Eliminar Partido" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3); padding: 0 8px;">🗑️</button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
            <!-- Modal para nueva carpeta -->
            <div id="modal-nueva-carpeta" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                <div class="modal-content card" style="background: #1e293b; border: 1px solid #334155; padding: 24px; border-radius: 12px; width: 400px; max-width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                    <h3 style="margin-top: 0; margin-bottom: 16px; color: white; font-size: 1.2rem;">📁 Crear nueva carpeta</h3>
                    <input type="text" id="input-nombre-carpeta" class="form-input" placeholder="Nombre de la carpeta" style="margin-bottom: 20px; width: 100%; background: #0f172a; border: 1px solid #334155; color: white; padding: 8px 12px; border-radius: 6px;">
                    <div class="flex justify-end gap-12" style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button class="btn btn-secondary" id="btn-cancelar-carpeta">Cancelar</button>
                        <button class="btn btn-primary" id="btn-confirmar-carpeta">Crear</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    bindEvents(container);
}

function bindEvents(container) {
    // Nav breadcrumbs
    document.querySelectorAll('.btn-breadcrumb').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFolderId = null;
            renderDashboard(container);
        });

        // Eventos Drag and Drop para volver a la raiz (sacar de la carpeta)
        btn.addEventListener('dragover', (e) => {
            e.preventDefault();
            btn.style.background = '#0f172a';
            btn.style.borderColor = '#38bdf8';
            btn.style.color = '#38bdf8';
        });

        btn.addEventListener('dragleave', (e) => {
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        });

        btn.addEventListener('drop', async (e) => {
            e.preventDefault();
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
            
            const partidoId = e.dataTransfer.getData('text/plain');
            if (partidoId) {
                // Mover a la raiz (carpeta_id = null)
                await window.api.movePartidoToCarpeta(parseInt(partidoId), null);
                allPartidos = await window.api.getPartidos(); // recargamos
                renderDashboard(container);
            }
        });
    });

    // Nueva Carpeta (Modal)
    const modal = document.getElementById('modal-nueva-carpeta');
    const inputNombre = document.getElementById('input-nombre-carpeta');
    
    document.getElementById('btn-nueva-carpeta')?.addEventListener('click', () => {
        if (modal && inputNombre) {
            inputNombre.value = '';
            modal.style.display = 'flex';
            inputNombre.focus();
        }
    });

    document.getElementById('btn-cancelar-carpeta')?.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
    });

    const confirmarCarpeta = async () => {
        const nombre = inputNombre?.value.trim();
        if (nombre) {
            await window.api.createCarpeta(nombre);
            allCarpetas = await window.api.getCarpetas();
            if (modal) modal.style.display = 'none';
            renderDashboard(container);
        }
    };

    document.getElementById('btn-confirmar-carpeta')?.addEventListener('click', confirmarCarpeta);

    inputNombre?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmarCarpeta();
        }
    });

    // Cerrar modal al hacer click fuera
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Entrar en carpeta
    document.querySelectorAll('.carpeta-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.btn-eliminar-carpeta')) return;
            currentFolderId = parseInt(item.dataset.id);
            renderDashboard(container);
        });

        // Eventos Drag and Drop para carpeta
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            item.style.borderColor = '#38bdf8';
            item.style.background = '#0f172a';
        });

        item.addEventListener('dragleave', (e) => {
            item.style.borderColor = '#334155';
            item.style.background = '#1e293b';
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            item.style.borderColor = '#334155';
            item.style.background = '#1e293b';
            
            const partidoId = e.dataTransfer.getData('text/plain');
            if (partidoId) {
                const targetCarpetaId = parseInt(item.dataset.id);
                await window.api.movePartidoToCarpeta(parseInt(partidoId), targetCarpetaId);
                allPartidos = await window.api.getPartidos(); // recargamos
                renderDashboard(container);
            }
        });
    });

    // Eliminar Carpeta
    document.querySelectorAll('.btn-eliminar-carpeta').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('¿Eliminar esta carpeta? Los partidos que contenga volverán a la Raíz.')) {
                await window.api.deleteCarpeta(parseInt(btn.dataset.id));
                allCarpetas = await window.api.getCarpetas();
                allPartidos = await window.api.getPartidos();
                renderDashboard(container);
            }
        });
    });

    // Eventos Drag and Drop para partidos
    document.querySelectorAll('.partido-item').forEach(row => {
        row.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', row.dataset.id);
            row.style.opacity = '0.4';
            row.style.transform = 'scale(0.98)';
        });
        row.addEventListener('dragend', (e) => {
            row.style.opacity = '1';
            row.style.transform = 'none';
        });
    });

    // Nuevo Partido
    document.getElementById('btn-nuevo-partido-dash')?.addEventListener('click', () => {
        router.navigate('nuevo-partido');
    });

    // Scouting e Informe y Eliminar
    document.querySelectorAll('.btn-scouting').forEach(btn => {
        btn.addEventListener('click', () => {
            router.navigate('scouting', { partidoId: parseInt(btn.dataset.id) });
        });
    });

    document.querySelectorAll('.btn-informe').forEach(btn => {
        btn.addEventListener('click', () => {
            router.navigate('informe', { partidoId: parseInt(btn.dataset.id) });
        });
    });

    document.querySelectorAll('.btn-eliminar-partido').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('¿Seguro que quieres eliminar este partido y TODAS sus acciones? Esto no se puede deshacer.')) {
                await window.api.deletePartido(parseInt(btn.dataset.id));
                allPartidos = await window.api.getPartidos();
                renderDashboard(container);
            }
        });
    });
}
