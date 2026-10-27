// Reconoce si un equipo que llega de la tablet es uno que ya existe en el escritorio.
// Orden: id conocido (vínculo) → mismo nombre → misma plantilla (dorsales con nombres compatibles).

export const normalizarTexto = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const tokens = (s) => new Set(normalizarTexto(s).split(' ').filter((t) => t.length > 1));

// Dos nombres son compatibles si alguno está vacío o comparten alguna palabra ("Ana" ~ "Ana Pérez").
export function nombresCompatibles(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return true;
  return [...ta].some((t) => tb.has(t));
}

// Fracción de jugadores en común (mismo dorsal y nombre compatible) sobre el equipo más pequeño.
export function similitudPlantillas(a, b) {
  const porDorsal = new Map(b.filter((j) => Number.isFinite(Number(j.dorsal))).map((j) => [Number(j.dorsal), j]));
  let comunes = 0;
  a.forEach((j) => {
    const otro = porDorsal.get(Number(j.dorsal));
    if (otro && nombresCompatibles(j.nombre, otro.nombre)) comunes++;
  });
  const base = Math.min(a.length, b.length);
  return { comunes, puntuacion: base ? comunes / base : 0 };
}

const UMBRAL_PLANTILLA = 0.6;
const MIN_COMUNES = 3;

// equiposPC: [{ id, nombre, jugadores: [{ dorsal, nombre }] }]; vinculos: Map(uid → equipoId).
// entrante: { uid, nombre, roster: [{ dorsal, nombre }] }. Devuelve { equipo, metodo } o null.
export function buscarEquipoCoincidente(equiposPC, vinculos, entrante) {
  if (entrante.uid && vinculos.has(entrante.uid)) {
    const e = equiposPC.find((x) => x.id === vinculos.get(entrante.uid));
    if (e) return { equipo: e, metodo: 'id' };
  }
  const nombre = normalizarTexto(entrante.nombre);
  if (nombre) {
    const e = equiposPC.find((x) => normalizarTexto(x.nombre) === nombre);
    if (e) return { equipo: e, metodo: 'nombre' };
  }
  let mejor = null;
  equiposPC.forEach((e) => {
    const { comunes, puntuacion } = similitudPlantillas(entrante.roster || [], e.jugadores);
    if (comunes >= MIN_COMUNES && puntuacion >= UMBRAL_PLANTILLA && (!mejor || puntuacion > mejor.puntuacion)) {
      mejor = { equipo: e, metodo: 'plantilla', puntuacion };
    }
  });
  return mejor;
}
