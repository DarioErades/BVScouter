// punto de entrada del renderer

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// lo hacemos global para que lo usen las paginas
window.Chart = Chart;

import './styles/main.css';
import './styles/scouting.css';
import './styles/report.css';

import { router } from './router.js';
import { registerDashboard } from './pages/dashboard.js';
import { registerJugadores } from './pages/jugadores.js';
import { registerNuevoPartido } from './pages/nuevo-partido.js';
import { registerScouting } from './pages/scouting.js';
import { registerInforme } from './pages/informe.js';

// registramos todas las paginas
registerDashboard();
registerJugadores();
registerNuevoPartido();
registerScouting();
registerInforme();

// navegacion del sidebar
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) router.navigate(page);
    });
});

// toggle menu lateral
document.getElementById('btn-toggle-sidebar')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
});

// arrancamos en el dashboard
router.navigate('dashboard');
