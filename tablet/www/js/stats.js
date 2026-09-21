// Estadísticas calculadas siempre a partir de la lista de eventos.
import { SKILLS, SKILL_KEYS, POS_SHORT, playerById } from './engine.js';

const zero = () => ({ t: 0, win: 0, good: 0, mid: 0, blocked: 0, err: 0 });

export const pct = (a, b, d = 0) => (b ? `${((a / b) * 100).toFixed(d)}%` : '–');
export const eff = (a, b) => (b ? `${((a / b) * 100).toFixed(0)}%` : '–');

export function computeStats(m, setN = null) {
  const evs = m.events.filter((e) => setN == null || e.set === setN);

  const players = {};
  m.roster.forEach((p) => {
    players[p.id] = { p };
    SKILL_KEYS.forEach((k) => { players[p.id][k] = zero(); });
  });

  const team = {
    for: { ataque: 0, saque: 0, bloqueo: 0, rivalError: 0, manual: 0 },
    against: { ataque: 0, bloqueado: 0, saque: 0, rece: 0, defensa: 0, bloqueo: 0, general: 0, rivalPoint: 0, manual: 0 },
    general: {}
  };
  const rallies = [];

  for (const e of evs) {
    if (e.kind === 'skill') {
      const s = players[e.playerId]?.[e.skill];
      if (s) { s.t++; s[e.rk]++; }
      if (e.rk === 'win') team.for[e.skill]++;
      if (e.rk === 'err') team.against[e.skill]++;
      if (e.rk === 'blocked') team.against.bloqueado++;
    } else if (e.kind === 'rivalPoint') team.against.rivalPoint++;
    else if (e.kind === 'rivalError') team.for.rivalError++;
    else if (e.kind === 'teamError') {
      team.against.general++;
      team.general[e.label] = (team.general[e.label] || 0) + 1;
    } else if (e.kind === 'manual') {
      if (e.winner === 'local') team.for.manual++; else team.against.manual++;
    }
    if (e.winner) rallies.push(e);
  }

  const rows = Object.values(players).map((r) => {
    r.pts = r.ataque.win + r.saque.win + r.bloqueo.win;
    r.err = r.ataque.err + r.ataque.blocked + r.rece.err + r.defensa.err + r.saque.err + r.bloqueo.err;
    r.net = r.pts - r.err;
    r.total = SKILL_KEYS.reduce((a, k) => a + r[k].t, 0);
    return r;
  });

  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const pointsFor = sum(team.for);
  const pointsAgainst = sum(team.against);

  // Side-out (puntos ganados al recibir) y break-point (puntos ganados al sacar).
  const rate = (arr) => ({ won: arr.filter((r) => r.winner === 'local').length, total: arr.length });
  const so = rate(rallies.filter((r) => r.serving === 'rival'));
  const bp = rate(rallies.filter((r) => r.serving === 'local'));
  const byRot = [0, 1, 2, 3, 4, 5].map((rot) => ({
    rot,
    so: rate(rallies.filter((r) => r.rot === rot && r.serving === 'rival')),
    bp: rate(rallies.filter((r) => r.rot === rot && r.serving === 'local'))
  }));

  // Totales de equipo por fundamento
  const tot = {};
  SKILL_KEYS.forEach((k) => {
    tot[k] = rows.reduce((a, r) => {
      Object.keys(a).forEach((f) => { a[f] += r[k][f]; });
      return a;
    }, zero());
  });

  return { rows, team, tot, pointsFor, pointsAgainst, so, bp, byRot, rallies: rallies.length };
}

// Marcador final de cada set jugado + el set en curso.
export function setScores(m) {
  const list = m.setsPlayed.map((s) => ({ n: s.n, l: s.l, r: s.r, done: true }));
  if (m.status !== 'done') list.push({ n: m.live.set, l: m.live.score.l, r: m.live.score.r, done: false });
  return list;
}

// ---------- texto de un evento (historial y avisos) ----------
export function playerLabel(m, id) {
  const p = playerById(m, id);
  return p ? `#${p.dorsal} ${p.name || POS_SHORT[p.pos]}` : '—';
}

export function describeEvent(m, e) {
  if (e.kind === 'skill') {
    const sk = SKILLS[e.skill];
    const res = sk.results.find((r) => r.id === e.res);
    return { who: playerLabel(m, e.playerId), what: `${sk.label} · ${res.label}`, tone: toneOf(e.rk), color: sk.color };
  }
  if (e.kind === 'rivalPoint') return { who: m.rival, what: 'Punto del rival', tone: 'bad' };
  if (e.kind === 'rivalError') return { who: m.rival, what: 'Error del rival', tone: 'good' };
  if (e.kind === 'teamError') return { who: m.team, what: `Error general${e.label ? ' · ' + e.label : ''}`, tone: 'bad' };
  if (e.kind === 'manual') return { who: e.winner === 'local' ? m.team : m.rival, what: 'Punto manual', tone: e.winner === 'local' ? 'good' : 'bad' };
  if (e.kind === 'sub') return { who: `Cambio P${e.slot}`, what: `Sale ${playerLabel(m, e.outId)} · Entra ${playerLabel(m, e.inId)}`, tone: 'neutral' };
  return { who: '', what: e.kind, tone: 'neutral' };
}

const toneOf = (rk) => (rk === 'win' || rk === 'good' ? 'good' : rk === 'mid' ? 'neutral' : 'bad');

// ---------- exportación en el formato de acciones de la app de escritorio ----------
export function exportPayload(m) {
  const acciones = m.events.filter((e) => e.kind !== 'sub').map((e) => {
    const base = {
      set_numero: e.set,
      marcador_pre_local: e.pre?.l ?? 0, marcador_pre_rival: e.pre?.r ?? 0,
      marcador_local: e.sc?.l ?? 0, marcador_rival: e.sc?.r ?? 0,
      equipo_al_saque: e.serving || 'local',
      rotacion: e.setter || 1,
      video_timestamp: 0
    };
    if (e.kind === 'skill') {
      const p = playerById(m, e.playerId);
      return { ...base, dorsal: Number(p?.dorsal) || 0, tipo_accion: SKILLS[e.skill].tipo, subtipo: '', resultado: e.code };
    }
    if (e.kind === 'rivalPoint') return { ...base, dorsal: 0, tipo_accion: 'rival', subtipo: 'Acierto Rival', resultado: '#' };
    if (e.kind === 'rivalError') return { ...base, dorsal: 0, tipo_accion: 'rival', subtipo: 'Error Rival', resultado: '=' };
    if (e.kind === 'teamError') return { ...base, dorsal: 0, tipo_accion: 'error_general', subtipo: e.label || '', resultado: '=' };
    return { ...base, dorsal: 0, tipo_accion: e.winner === 'local' ? 'rival' : 'error_general', subtipo: e.winner === 'local' ? 'Error Rival' : 'Manual', resultado: e.winner === 'local' ? '=' : '#' };
  });
  return {
    format: 'volleystats-tablet', version: 1, exportedAt: new Date().toISOString(),
    partido: { equipo: m.team, rival: m.rival, fecha: m.date, formato: `al mejor de ${m.bestOf}`, resultado_sets: m.setsPlayed.map((s) => `${s.l}-${s.r}`).join(', ') },
    roster: m.roster.map((p) => ({ dorsal: Number(p.dorsal), nombre: p.name, posicion: { S: 'Colocador', OP: 'Opuesto', MB: 'Central', OH: 'Receptor', L: 'Líbero' }[p.pos], es_libero: p.pos === 'L' ? 1 : 0 })),
    acciones,
    tabletMatch: { ...m, undo: [] }
  };
}
