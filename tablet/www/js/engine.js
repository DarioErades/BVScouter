// Motor del partido: alineación, rotaciones, marcador y deshacer.
// Todo son funciones que mutan el objeto `match`; la UI guarda y repinta.

export const POS = { S: 'Colocador', OP: 'Opuesto', MB: 'Central', OH: 'Receptor', L: 'Líbero' };
export const POS_SHORT = { S: 'COL', OP: 'OPU', MB: 'CEN', OH: 'REC', L: 'LIB' };

// kind: win = punto nuestro · good = acierto sin punto · mid = balón en juego
//       blocked / err = punto del rival
const OK = { id: 'acierto', label: 'Acierto', code: '#', kind: 'good' };
const MID = (label) => ({ id: 'regular', label, code: '+', kind: 'mid' });
const ERR = { id: 'error', label: 'Error', code: '=', kind: 'err', winner: 'rival' };

export const SKILLS = {
  ataque: {
    label: 'Ataque', color: '#fb923c', tipo: 'ataque',
    results: [
      { id: 'punto', label: 'Punto', code: '#', kind: 'win', winner: 'local' },
      MID('Continúa'),
      { id: 'bloqueado', label: 'Bloqueado', code: '/', kind: 'blocked', winner: 'rival' },
      ERR
    ]
  },
  rece: { label: 'Rece', color: '#4cc2ff', tipo: 'recepcion', results: [OK, MID('Regular'), ERR] },
  defensa: { label: 'Defensa', color: '#a78bfa', tipo: 'defensa', results: [OK, MID('Regular'), ERR] },
  saque: {
    label: 'Saque', color: '#34d399', tipo: 'saque',
    results: [{ id: 'punto', label: 'Ace', code: '#', kind: 'win', winner: 'local' }, MID('Regular'), ERR]
  },
  bloqueo: {
    label: 'Bloqueo', color: '#f472b6', tipo: 'bloqueo',
    results: [{ id: 'punto', label: 'Punto', code: '#', kind: 'win', winner: 'local' }, MID('Toque'), ERR]
  }
};
export const SKILL_KEYS = Object.keys(SKILLS);

export const GENERAL_ERRORS = ['Red', 'Invasión', 'Posición / Rotación', 'Dobles / Retención', 'Conducta', 'Otro'];

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const clone = (o) => JSON.parse(JSON.stringify(o));

export function newMatch({ team, rival, date, bestOf, roster }) {
  return {
    v: 1, id: uid(), createdAt: Date.now(),
    team: team || 'Mi equipo', rival: rival || 'Rival', date, bestOf,
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
}

export const slotOf = (m, playerId) => {
  const e = Object.entries(m.live.lineup).find(([, id]) => id === playerId);
  return e ? Number(e[0]) : null;
};

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

export function substitute(m, slot, inId) {
  pushUndo(m);
  const L = m.live;
  const outId = L.lineup[slot];
  L.lineup[slot] = inId;
  m.events.push({ id: uid(), set: L.set, ts: Date.now(), kind: 'sub', outId, inId, slot, sc: { ...L.score } });
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
    }
  } else {
    L.score.r++;
    L.serving = 'rival';
  }
  ev.sc = { ...L.score };
}

function baseEvent(m, kind) {
  const L = m.live;
  const colocador = m.roster.find((p) => p.pos === 'S' && slotOf(m, p.id));
  return { id: uid(), set: L.set, ts: Date.now(), kind, serving: L.serving, rot: L.rot, setter: colocador ? slotOf(m, colocador.id) : null, pre: { ...L.score } };
}

export function recordSkill(m, playerId, skill, resultId) {
  pushUndo(m);
  const res = SKILLS[skill].results.find((r) => r.id === resultId);
  const ev = baseEvent(m, 'skill');
  Object.assign(ev, { playerId, skill, res: res.id, rk: res.kind, code: res.code, slot: slotOf(m, playerId) });
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

export function startSet(m, lineup, serving) {
  pushUndo(m);
  const L = m.live;
  L.lineup = { ...lineup };
  L.startLineup = { ...lineup };
  L.serving = serving;
  L.startServing = serving;
  L.rot = 0;
  m.status = 'live';
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
