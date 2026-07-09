// pagina del dashboard

import { router } from '../router.js';
import { formatDate } from '../utils/helpers.js';

export function registerDashboard() {
    router.register('dashboard', async (container) => {
        const jugadores = await window.api.getJugadores();
        const partidos = await window.api.getPartidos();

        container.innerHTML = `
            <div class="dashboard-page">
                <div class="page-header">
                    <h1 class="page-title">🏐 Dashboard</h1>
                    <p class="page-subtitle">Resumen general de tu scouting</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${partidos.length}</div>
                        <div class="stat-label">Partidos Analizados</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-value">${getPartidosMes(partidos)}</div>
                        <div class="stat-label">Partidos Este Mes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${getTorneosDiferentes(partidos)}</div>
                        <div class="stat-label">Torneos Diferentes</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Últimos Partidos</h2>
                        <button class="btn btn-primary btn-sm" id="btn-nuevo-partido-dash">
                            ✚ Nuevo Partido
                        </button>
                    </div>
                    ${partidos.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-state-icon">🏖️</div>
                            <p class="empty-state-text">No hay partidos registrados</p>
                            <p class="empty-state-hint">Crea tu primer partido para empezar a hacer scouting</p>
                        </div>
                    ` : `
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Torneo</th>
                                        <th>Fase</th>
                                        <th>Jugadores</th>
                                        <th>Resultado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${partidos.slice(0, 10).map(p => `
                                        <tr>
                                            <td>${formatDate(p.fecha)}</td>
                                            <td>${p.torneo || '-'}</td>
                                            <td><span class="badge badge-info">${p.fase || '-'}</span></td>
                                            <td>${p.jugador1_nombre} ${p.jugador1_apellidos} / ${p.jugador2_nombre} ${p.jugador2_apellidos}</td>
                                            <td class="font-mono">${p.resultado || '-'}</td>
                                            <td>
                                                <div class="flex gap-8">
                                                    <button class="btn btn-sm btn-secondary btn-scouting" data-id="${p.id}">📋 Scouting</button>
                                                    <button class="btn btn-sm btn-secondary btn-informe" data-id="${p.id}">📊 Informe</button>
                                                    <button class="btn btn-sm btn-secondary btn-eliminar-partido" data-id="${p.id}" title="Eliminar Partido" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3); padding: 0 8px;">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;

        // eventos
        document.getElementById('btn-nuevo-partido-dash')?.addEventListener('click', () => {
            router.navigate('nuevo-partido');
        });

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
                    // recargamos el dashboard
                    router.navigate('dashboard');
                }
            });
        });
    });
}

function getPartidosMes(partidos) {
    const ahora = new Date();
    const mes = ahora.getMonth();
    const anio = ahora.getFullYear();
    return partidos.filter(p => {
        const fecha = new Date(p.fecha);
        return fecha.getMonth() === mes && fecha.getFullYear() === anio;
    }).length;
}

function getTorneosDiferentes(partidos) {
    const torneos = new Set(partidos.map(p => p.torneo).filter(Boolean));
    return torneos.size;
}
