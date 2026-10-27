// Temas visuales: cada uno es un conjunto de variables CSS en html[data-tema] (ver css/app.css).
const KEY = 'volleystats-tema';

export const TEMAS = [
  { id: 'grafito', nombre: 'Grafito', desc: 'Oscuro neutro', bg: '#121316', surface: '#1b1c20', accent: '#5b8def', court: '#26476b' },
  { id: 'pizarra', nombre: 'Pizarra', desc: 'Azul noche', bg: '#0f1620', surface: '#172230', accent: '#3aa79f', court: '#1f5370' },
  { id: 'claro', nombre: 'Claro', desc: 'Blanco luminoso', bg: '#f4f5f7', surface: '#ffffff', accent: '#2459d3', court: '#2d5f93' },
  { id: 'arena', nombre: 'Arena', desc: 'Claro cálido', bg: '#f3f0e9', surface: '#fbf9f4', accent: '#1f5c48', court: '#b56d3c' },
  { id: 'neon', nombre: 'Neón', desc: 'El diseño original', bg: '#080c1a', surface: '#161c33', accent: '#7c6cff', court: '#12365f' }
];

export function temaActual() {
  let id = null;
  try { id = localStorage.getItem(KEY); } catch (e) { /* sin almacenamiento */ }
  return TEMAS.some((t) => t.id === id) ? id : TEMAS[0].id;
}

export function aplicarTema(id) {
  const t = TEMAS.find((x) => x.id === id) || TEMAS[0];
  document.documentElement.dataset.tema = t.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg);
  try { localStorage.setItem(KEY, t.id); } catch (e) { /* no pasa nada */ }
}
