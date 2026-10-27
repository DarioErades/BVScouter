// Motor del partido: alineación, rotaciones, marcador y deshacer.
// Todo son funciones que mutan el objeto `match`; la UI guarda y repinta.

export const POS = { S: 'Colocador', OP: 'Opuesto', MB: 'Central', OH: 'Receptor', L: 'Líbero' };
export const POS_SHORT = { S: 'COL', OP: 'OPU', MB: 'CEN', OH: 'REC', L: 'LIB' };

// kind: win = punto nuestro · good = acierto sin punto (la jugada sigue) · mid = balón en juego
//       blocked / err = punto del rival
// Los códigos (#,+,!,-,/,=) y su significado son los mismos que en la app de escritorio
// (RESULTADOS_POR_ACCION / RESULTADOS_PISTA), para que las estadísticas sean equivalentes y
// una acción de aquí se entienda exactamente igual allí.
const PUNTO = { id: 'punto', label: 'Punto', code: '#', kind: 'win', winner: 'local' };
const POSITIVA = { id: 'positiva', label: 'Positiva', code: '+', kind: 'good' };
const NEGATIVA = { id: 'negativa', label: 'Negativa', code: '!', kind: 'mid' };
const POBRE = { id: 'pobre', label: 'Pobre', code: '-', kind: 'mid' };
const ERROR = { id: 'error', label: 'Error', code: '=', kind: 'err', winner: 'rival' };
// En recepción/defensa el # y el / no terminan el punto (la jugada sigue): son la calidad del
// toque, no un punto directo. Etiquetas iguales a las de escritorio (scouting-pista.js).
const DOBLE_POSITIVA = { id: 'doble_positiva', label: 'Doble Positiva', code: '#', kind: 'good' };
const BALON_REGALADO = { id: 'balon_regalado', label: 'Balón regalado', code: '/', kind: 'mid' };
const BLOQUEADO = { id: 'bloqueado', label: 'Bloqueado', code: '/', kind: 'blocked', winner: 'rival' };

export const SKILLS = {
  ataque: { label: 'Ataque', color: '#fb923c', tipo: 'ataque', results: [PUNTO, POSITIVA, NEGATIVA, POBRE, BLOQUEADO, ERROR] },
  rece: { label: 'Rece', color: '#4cc2ff', tipo: 'recepcion', results: [DOBLE_POSITIVA, POSITIVA, NEGATIVA, POBRE, BALON_REGALADO, ERROR] },
  defensa: { label: 'Defensa', color: '#a78bfa', tipo: 'defensa', results: [DOBLE_POSITIVA, POSITIVA, NEGATIVA, BALON_REGALADO, ERROR] },
  saque: { label: 'Saque', color: '#34d399', tipo: 'saque', results: [{ ...PUNTO, label: 'Ace' }, POSITIVA, POBRE, ERROR] },
  bloqueo: { label: 'Bloqueo', color: '#f472b6', tipo: 'bloqueo', results: [PUNTO, POSITIVA, ERROR] }
};
export const SKILL_KEYS = Object.keys(SKILLS);

// Modo simple: solo se apunta la acción que termina el punto (nada de tocar el chip en cada
// toque intermedio). Cada acción tiene únicamente Acierto (punto nuestro) y Fallo (punto rival).
export const SIMPLE_RESULTS = [
  { id: 'acierto', label: 'Acierto', code: '#', kind: 'win', winner: 'local' },
  { id: 'fallo', label: 'Fallo', code: '=', kind: 'err', winner: 'rival' }
];

// En modo simple la recepción y la defensa nunca dan punto: solo se apunta el fallo.
export const SOLO_FALLO = ['rece', 'defensa'];

// Resultados a mostrar para un fundamento según el modo del partido.
export const resultsFor = (m, skill) => {
  if (m.modo !== 'simple') return SKILLS[skill].results;
  return SOLO_FALLO.includes(skill) ? SIMPLE_RESULTS.filter((r) => r.kind === 'err') : SIMPLE_RESULTS;
};

export const GENERAL_ERRORS = ['Red', 'Invasión', 'Posición / Rotación', 'Dobles / Retención', 'Conducta', 'Otro'];

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const clone = (o) => JSON.parse(JSON.stringify(o));

export function newMatch({ team, teamId, rival, date, bestOf, roster, modo }) {
  return {
    v: 1, id: uid(), createdAt: Date.now(),
    team: team || 'Mi equipo', teamId: teamId || '', rival: rival || 'Rival', date, bestOf,
    modo: modo === 'simple' ? 'simple' : 'complejo',
    roster, events: [], setsPlayed: [], undo: [],
    status: 'lineup',
    live: emptyLive(1)
  };
}

export function emptyLive(set) {
  return { set, lineup: {}, startLineup: null, score: { l: 0, r: 0 }, serving: null, startServing: null, rot: 0 };
}

export const playerById = (m, id) => m.roster.find((p) => p.id === id);

// ---------- deshacer ----------
function pushUndo(m) {
  m.undo.push(JSON.stringify({ live: m.live, sets: m.setsPlayed, status: m.status, n: m.events.length }));
  if (m.undo.length > 150) m.undo.shift();
}

export function undo(m) {
  const raw = m.undo.pop();
  if (!raw) return false;
  const s = JSON.parse(raw);
  m.live = s.live;
  m.setsPlayed = s.sets;
  m.status = s.status;
  m.events.length = s.n;
  return true;
}

// ---------- alineación y rotación ----------
export function rotateLineup(lu, dir = 1) {
  const n = {};
  if (dir > 0) { n[1] = lu[2]; n[6] = lu[1]; n[5] = lu[6]; n[4] = lu[5]; n[3] = lu[4]; n[2] = lu[3]; }
  else { n[2] = lu[1]; n[1] = lu[6]; n[6] = lu[5]; n[5] = lu[4]; n[4] = lu[3]; n[3] = lu[2]; }
  return n;
}

export function rotate(m, dir) {
  pushUndo(m);
  const L = m.live;
  L.lineup = rotateLineup(L.lineup, dir);
  L.rot = (L.rot + (dir > 0 ? 1 : 5)) % 6;
  actualizarRotFijada(m);
}

export const slotOf = (m, playerId) => {
  const e = Object.entries(m.live.lineup).find(([, id]) => id === playerId);
  return e ? Number(e[0]) : null;
};

// R (posición del colocador en pista) se detecta buscando al colocador en la alineación actual.
// Si hay 0 o más de un colocador en pista no se puede saber con certeza, así que se avisa y se
// mantiene la última rotación conocida (L.rotFijada) en vez de arriesgar un valor equivocado.
export function colocadoresEnPista(m) {
  return Object.values(m.live.lineup)
    .map((id) => playerById(m, id))
    .filter((p) => p && p.pos === 'S');
}

// null si es ambiguo (0 o >1 colocadores); si no, su posición actual en pista (1-6).
export function slotColocadorDetectado(m) {
  const cs = colocadoresEnPista(m);
  return cs.length === 1 ? slotOf(m, cs[0].id) : null;
}

export const estadoColocador = (m) => {
  const n = colocadoresEnPista(m).length;
  return { ok: n === 1, n };
};

// Igual que colocadoresEnPista pero sobre una alineación cualquiera (para comprobarla antes de
// confirmarla, p. ej. en la pantalla de alineación inicial).
export const contarColocadores = (m, lineup) =>
  Object.values(lineup).map((id) => playerById(m, id)).filter((p) => p && p.pos === 'S').length;

// Actualiza L.rotFijada si se puede detectar un único colocador; si no, la deja como estaba
// (se llama tras cualquier cambio de alineación: rotar, sustituir o empezar un set).
function actualizarRotFijada(m) {
  const detectada = slotColocadorDetectado(m);
  if (detectada != null) m.live.rotFijada = detectada;
  return detectada;
}

// R efectiva para mostrar y para guardar en las acciones: la detectada ahora mismo, o si es
// ambigua, la última que se pudo detectar (o la que se preguntó al empezar el set).
export const rotacionEfectiva = (m) => m.live.rotFijada ?? 1;

// Filas de la pantalla en vivo: jugadores en pista y líberos que están fuera.
export function liveRows(m) {
  const onCourt = new Set(Object.values(m.live.lineup));
  const rows = m.roster
    .filter((p) => onCourt.has(p.id) || p.pos === 'L')
    .map((p) => ({ p, slot: slotOf(m, p.id) }));
  return rows.sort((a, b) => Number(a.p.dorsal) - Number(b.p.dorsal));
}

export const benchPlayers = (m) => {
  const onCourt = new Set(Object.values(m.live.lineup));
  return m.roster.filter((p) => !onCourt.has(p.id));
};

// Orden de preferencia al sustituir según la posición de quien sale: primero su misma posición;
// colocador y opuesto se cubren entre sí antes que el resto.
const PRIORIDAD_CAMBIO = { S: ['S', 'OP'], OP: ['OP', 'S'] };

// Suplentes para un cambio (sin líberos), ordenados por afinidad con quien sale y por dorsal.
export function candidatosCambio(m, outPos) {
  const orden = PRIORIDAD_CAMBIO[outPos] || (outPos ? [outPos] : []);
  const peso = (p) => { const i = orden.indexOf(p.pos); return i < 0 ? orden.length : i; };
  return benchPlayers(m)
    .filter((p) => p.pos !== 'L')
    .sort((a, b) => peso(a) - peso(b) || Number(a.dorsal) - Number(b.dorsal));
}

// Devuelve { ambiguo, n }: si el cambio deja 0 o más de un colocador en pista no se toca la
// rotación (se mantiene la que había); si no, se actualiza sola a partir del colocador.
export function substitute(m, slot, inId) {
  pushUndo(m);
  const L = m.live;
  const outId = L.lineup[slot];
  L.lineup[slot] = inId;
  m.events.push({ id: uid(), set: L.set, ts: Date.now(), kind: 'sub', outId, inId, slot, sc: { ...L.score } });
  const detectada = actualizarRotFijada(m);
  const n = colocadoresEnPista(m).length;
  return { ambiguo: detectada == null, n };
}

// Cambia el modo de registro a mitad de partido. Las acciones ya guardadas no se tocan: cada
// una conserva el código con el que se anotó.
export function toggleModo(m) {
  pushUndo(m);
  m.modo = m.modo === 'simple' ? 'complejo' : 'simple';
  return m.modo;
}

export function toggleServe(m) {
  pushUndo(m);
  m.live.serving = m.live.serving === 'local' ? 'rival' : 'local';
}

// ---------- puntos ----------
function awardPoint(m, ev, winner) {
  const L = m.live;
  ev.pre = { ...L.score };
  ev.winner = winner;
  ev.serving = L.serving;
  ev.rot = L.rot;
  if (winner === 'local') {
    L.score.l++;
    if (L.serving === 'rival') { // side-out: rotamos y sacamos nosotros
      L.lineup = rotateLineup(L.lineup, 1);
      L.rot = (L.rot + 1) % 6;
      L.serving = 'local';
      actualizarRotFijada(m);
    }
  } else {
    L.score.r++;
    L.serving = 'rival';
  }
  ev.sc = { ...L.score };
}

function baseEvent(m, kind) {
  const L = m.live;
  const detectada = slotColocadorDetectado(m);
  return { id: uid(), set: L.set, ts: Date.now(), kind, serving: L.serving, rot: L.rot, setter: rotacionEfectiva(m), colocadorDetectado: detectada != null, pre: { ...L.score } };
}

export function recordSkill(m, playerId, skill, resultId) {
  pushUndo(m);
  const res = resultsFor(m, skill).find((r) => r.id === resultId);
  const ev = baseEvent(m, 'skill');
  // Guardamos la etiqueta ya resuelta (no solo el id): si se cambia de modo a mitad de partido,
  // las acciones ya anotadas siguen mostrándose con el texto que tenían al registrarlas.
  Object.assign(ev, { playerId, skill, res: res.id, resLabel: res.label, rk: res.kind, code: res.code, slot: slotOf(m, playerId) });
  m.events.push(ev);
  if (res.winner) awardPoint(m, ev, res.winner);
  else ev.sc = { ...m.live.score };
  return ev;
}

export function recordTeamEvent(m, kind, label = '') {
  pushUndo(m);
  const ev = baseEvent(m, kind);
  ev.label = label;
  m.events.push(ev);
  awardPoint(m, ev, kind === 'rivalError' ? 'local' : 'rival');
  return ev;
}

// Tiempo muerto: no suma punto ni toca el saque, solo queda anotado en el historial y en el
// marcador punto a punto (como una marca roja) para saber cuándo se pidió y de qué equipo.
export function recordTimeout(m, team) {
  pushUndo(m);
  const L = m.live;
  const ev = { id: uid(), set: L.set, ts: Date.now(), kind: 'timeout', team, serving: L.serving, sc: { ...L.score } };
  m.events.push(ev);
  return ev;
}

// Toque manual sobre el marcador: cuenta como un punto con toda la lógica de saque y rotación.
export function manualPoint(m, team) {
  pushUndo(m);
  const ev = baseEvent(m, 'manual');
  m.events.push(ev);
  awardPoint(m, ev, team);
  return ev;
}

// Pulsación larga: corrige el marcador sin tocar saque ni rotación.
export function adjustScore(m, team, delta) {
  const key = team === 'local' ? 'l' : 'r';
  if (m.live.score[key] + delta < 0) return false;
  pushUndo(m);
  m.live.score[key] += delta;
  return true;
}

// ---------- sets ----------
export const setTarget = (m) => (m.live.set === m.bestOf ? 15 : 25);

export function setWinner(m) {
  const { l, r } = m.live.score;
  if (Math.max(l, r) >= setTarget(m) && Math.abs(l - r) >= 2) return l > r ? 'local' : 'rival';
  return null;
}

export function setsWon(m) {
  const w = { local: 0, rival: 0 };
  m.setsPlayed.forEach((s) => { w[s.l > s.r ? 'local' : 'rival']++; });
  return w;
}

// rotacionManual: R (1-6) a usar si al empezar el set no hay un único colocador en pista (lo
// pregunta la pantalla de alineación). Si se detecta un colocador único, manda la detección.
export function startSet(m, lineup, serving, rotacionManual) {
  pushUndo(m);
  const L = m.live;
  L.lineup = { ...lineup };
  L.startLineup = { ...lineup };
  L.serving = serving;
  L.startServing = serving;
  L.rot = 0;
  L.rotFijada = undefined;
  m.status = 'live';
  const detectada = actualizarRotFijada(m);
  if (detectada == null) L.rotFijada = rotacionManual || 1;
}

export function endSet(m) {
  pushUndo(m);
  const L = m.live;
  m.setsPlayed.push({ n: L.set, l: L.score.l, r: L.score.r, startLineup: L.startLineup, firstServe: L.startServing });
  const w = setsWon(m);
  const need = Math.ceil(m.bestOf / 2);
  if (w.local >= need || w.rival >= need) {
    m.status = 'done';
    return 'done';
  }
  m.live = emptyLive(L.set + 1);
  m.status = 'lineup';
  return 'next';
}

// Resultado final o parcial, p. ej. "3-1".
export function matchResult(m) {
  const w = setsWon(m);
  return `${w.local}-${w.rival}`;
}
