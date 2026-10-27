// Puente entre la UI y el plugin nativo Actualizador (comprobación e instalación de OTA).
const estado = { fase: 'inicial', versionInstalada: null, versionServidor: null, versionName: '', notas: '', porcentaje: 0, error: '' };
const oyentes = new Set();

const emitir = () => oyentes.forEach((f) => f(estado));

export function suscribir(f) {
  oyentes.add(f);
  f(estado);
  return () => oyentes.delete(f);
}

const plugin = () => window.Capacitor?.Plugins?.Actualizador;

export async function comprobarActualizacion() {
  const p = plugin();
  if (!p) { estado.fase = 'error'; estado.error = 'Solo disponible en la app instalada en la tablet'; emitir(); return; }
  estado.fase = 'comprobando';
  emitir();
  try {
    const r = await p.comprobar();
    Object.assign(estado, { versionInstalada: r.versionInstalada, versionServidor: r.versionServidor, versionName: r.versionName, notas: r.notas });
    estado.fase = r.hayActualizacion ? 'disponible' : 'al_dia';
  } catch (e) {
    estado.fase = 'error';
    estado.error = String(e?.message || e);
  }
  emitir();
}

export async function descargarEInstalar() {
  const p = plugin();
  if (!p) return;
  estado.fase = 'descargando';
  estado.porcentaje = 0;
  emitir();
  const oyente = await p.addListener('progresoDescarga', (d) => { estado.porcentaje = d.porcentaje; emitir(); });
  try {
    await p.descargarEInstalar();
  } catch (e) {
    estado.fase = 'error';
    estado.error = String(e?.message || e);
    emitir();
  } finally {
    await oyente.remove();
  }
}
