// punto de entrada del renderer - routing dual playa/pista

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
window.Chart = Chart;

import './styles/main.css';
import './styles/scouting.css';
import './styles/report.css';
import './styles/mode-selector.css';
import './styles/scouting-pista.css';

import { router } from './router.js';
import { renderModeSelector } from './pages/mode-selector.js';
import { initTheme, setActiveThemeMode } from './utils/theme.js';
import { actionForKey } from './utils/keybindings.js';

// Los diálogos nativos de Electron en Windows dejan la ventana sin foco de teclado:
// tras cerrarlos se lo devolvemos para poder seguir escribiendo en los formularios.
for (const nombre of ['confirm', 'alert']) {
    const nativa = window[nombre].bind(window);
    window[nombre] = (...args) => {
        const resultado = nativa(...args);
        setTimeout(() => window.api?.restoreFocus?.().catch(() => {}), 0);
        return resultado;
    };
}

// aplicamos el tema guardado
initTheme();

// estado global del modo actual
let currentMode = null;

// ---- MODO PLAYA (código actual) ----

async function initPlayaMode() {
    currentMode = 'playa';
    setActiveThemeMode('playa');

    // sidebar de playa
    const sidebarNav = document.getElementById('sidebar-nav-items');
    sidebarNav.innerHTML = `
        <li><a href="#" data-page="dashboard" class="nav-link active"><span class="nav-icon">📊</span> <span class="nav-label">Dashboard</span></a></li>
        <li><a href="#" data-page="nuevo-partido" class="nav-link"><span class="nav-icon">➕</span> <span class="nav-label">Nuevo Partido</span></a></li>
        <li><a href="#" data-page="jugadores" class="nav-link"><span class="nav-icon">👥</span> <span class="nav-label">Jugadores</span></a></li>
        <li><a href="#" data-page="ajustes" class="nav-link"><span class="nav-icon">⚙️</span> <span class="nav-label">Ajustes</span></a></li>
    `;
    const settingsLink = document.getElementById('settings-link');
    if (settingsLink) settingsLink.dataset.page = 'ajustes';

    // importamos las páginas de playa dinámicamente y esperamos a que se registren
    await Promise.all([
        import('./pages/dashboard.js').then(m => m.registerDashboard()),
        import('./pages/nuevo-partido.js').then(m => m.registerNuevoPartido()),
        import('./pages/scouting.js').then(m => m.registerScouting()),
        import('./pages/informe.js').then(m => m.registerInforme()),
        import('./pages/jugadores.js').then(m => m.registerJugadores()),
        import('./pages/ajustes.js').then(m => m.registerAjustes())
    ]);

    setupSidebarNavigation();
    router.navigate('dashboard');
}

// ---- MODO PISTA ----

async function initPistaMode() {
    currentMode = 'pista';
    setActiveThemeMode('pista');

    // sidebar de pista
    const sidebarNav = document.getElementById('sidebar-nav-items');
    sidebarNav.innerHTML = `
        <li><a href="#" data-page="dashboard-pista" class="nav-link active"><span class="nav-icon">📊</span> <span class="nav-label">Dashboard</span></a></li>
        <li><a href="#" data-page="nuevo-partido-pista" class="nav-link"><span class="nav-icon">➕</span> <span class="nav-label">Nuevo Partido</span></a></li>
        <li><a href="#" data-page="equipos-pista" class="nav-link"><span class="nav-icon">🏐</span> <span class="nav-label">Equipos</span></a></li>
        <li><a href="#" data-page="ajustes-pista" class="nav-link"><span class="nav-icon">⚙️</span> <span class="nav-label">Ajustes</span></a></li>
    `;
    const settingsLink = document.getElementById('settings-link');
    if (settingsLink) settingsLink.dataset.page = 'ajustes-pista';

    // importamos las páginas de pista dinámicamente y esperamos a que se registren
    await Promise.all([
        import('./pages/pista/dashboard-pista.js').then(m => m.registerDashboardPista()),
        import('./pages/pista/nuevo-partido-pista.js').then(m => m.registerNuevoPartidoPista()),
        import('./pages/pista/equipos-pista.js').then(m => m.registerEquiposPista()),
        import('./pages/pista/scouting-pista.js').then(m => m.registerScoutingPista()),
        import('./pages/pista/informe-pista.js').then(m => m.registerInformePista()),
        import('./pages/pista/ajustes-pista.js').then(m => m.registerAjustesPista()),
        import('./pages/pista/estadisticas-equipo-pista.js').then(m => m.registerEstadisticasEquipoPista())
    ]);

    setupSidebarNavigation();
    router.navigate('dashboard-pista');
}

// ---- NAVEGACIÓN COMÚN ----

function setupSidebarNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) router.navigate(page);
        });
    });
}

// ---- FLUJO DE INICIO ----

function showModeSelector() {
    setActiveThemeMode(null);
    const appEl = document.getElementById('app');
    const selectorEl = document.getElementById('mode-selector');

    appEl.style.display = 'none';
    selectorEl.style.display = 'block';

    renderModeSelector(selectorEl, async (mode) => {
        selectorEl.style.display = 'none';
        appEl.style.display = 'flex';

        if (mode === 'playa') {
            await initPlayaMode();
        } else {
            await initPistaMode();
        }
    });
}

// botón de volver al selector
document.getElementById('btn-cambiar-modo')?.addEventListener('click', () => {
    // limpiamos el contenido actual
    document.getElementById('content').innerHTML = '';
    currentMode = null;
    showModeSelector();
});

// toggle menu lateral
document.getElementById('btn-toggle-sidebar')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
});

document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!currentMode || (target instanceof Element && (target.matches('input, textarea, select') || target.isContentEditable))) return;
    if (actionForKey(currentMode, event.key)?.action !== 'openSettings') return;
    event.preventDefault();
    router.navigate(currentMode === 'pista' ? 'ajustes-pista' : 'ajustes');
});

// handler de errores global
window.addEventListener('unhandledrejection', e => {
    console.error('Unhandled rejection:', e.reason);
    const msg = e.reason?.message || String(e.reason) || 'Error desconocido';
    if (window.showToast) showToast(`Error: ${msg}`, 'error');
});

// arrancamos mostrando el selector de modalidad
showModeSelector();
