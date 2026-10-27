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
  // rot = R = posición del colocador en pista (rallies[].setter), no un simple contador: así
  // coincide con lo que usa la app de escritorio para side-out/break-point por rotación.
  const byRot = [1, 2, 3, 4, 5, 6].map((rot) => ({
    rot,
    so: rate(rallies.filter((r) => (r.setter || 1) === rot && r.serving === 'rival')),
    bp: rate(rallies.filter((r) => (r.setter || 1) === rot && r.serving === 'local'))
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

// Puntos jugados por jugador (equivalente a calcularTiempoJugadoPista de escritorio): se parte de
// la alineación inicial de cada set y se aplican los cambios en orden; cada punto cuenta para los
// que estaban en pista en ese momento.
export function computeTiempoJugado(m, setN = null) {
  const inicial = Object.fromEntries(m.setsPlayed.map((s) => [s.n, s.startLineup]));
  if (m.status !== 'done' && m.live.startLineup) inicial[m.live.set] = m.live.startLineup;
  const porJugador = {};
  const reg = (id) => (porJugador[id] ||= { sets: new Set(), puntosJugados: 0, ganados: 0, perdidos: 0 });
  let hayDatos = false;

  Object.entries(inicial).forEach(([k, lineup]) => {
    const set = Number(k);
    if (!lineup || (setN != null && set !== setN)) return;
    hayDatos = true;
    const enPista = new Set(Object.values(lineup).filter(Boolean));
    enPista.forEach((id) => reg(id).sets.add(set));
    m.events.filter((e) => e.set === set).forEach((e) => {
      if (e.kind === 'sub') {
        enPista.delete(e.outId);
        enPista.add(e.inId);
        reg(e.inId).sets.add(set);
      } else if (e.winner) {
        enPista.forEach((id) => {
          const r = reg(id);
          r.puntosJugados++;
          if (e.winner === 'local') r.ganados++; else r.perdidos++;
        });
      }
    });
  });

  Object.values(porJugador).forEach((r) => { r.sets = r.sets.size; });
  return { hayDatos, porJugador };
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
    // resLabel queda guardado en el propio evento (ver recordSkill): así una acción anotada en
    // modo simple sigue mostrándose bien aunque el partido pase luego a modo complejo, o viceversa.
    const label = e.resLabel || sk.results.find((r) => r.id === e.res)?.label || e.res;
    return { who: playerLabel(m, e.playerId), what: `${sk.label} · ${label}`, tone: toneOf(e.rk), color: sk.color };
  }
  if (e.kind === 'rivalPoint') return { who: m.rival, what: 'Punto del rival', tone: 'bad' };
  if (e.kind === 'rivalError') return { who: m.rival, what: 'Error del rival', tone: 'good' };
  if (e.kind === 'teamError') return { who: m.team, what: `Error general${e.label ? ' · ' + e.label : ''}`, tone: 'bad' };
  if (e.kind === 'manual') return { who: e.winner === 'local' ? m.team : m.rival, what: 'Punto manual', tone: e.winner === 'local' ? 'good' : 'bad' };
  if (e.kind === 'sub') return { who: `Cambio P${e.slot}`, what: `Sale ${playerLabel(m, e.outId)} · Entra ${playerLabel(m, e.inId)}`, tone: 'neutral' };
  if (e.kind === 'timeout') return { who: e.team === 'local' ? m.team : m.rival, what: 'Tiempo muerto', tone: 'neutral' };
  return { who: '', what: e.kind, tone: 'neutral' };
}

const toneOf = (rk) => (rk === 'win' || rk === 'good' ? 'good' : rk === 'mid' ? 'neutral' : 'bad');

// Puntos jugados por dorsal (la exportación de acciones no lleva los cambios, así que se manda ya calculado).
function tiempoPorDorsal(m) {
  const t = computeTiempoJugado(m);
  if (!t.hayDatos) return null;
  return Object.fromEntries(Object.entries(t.porJugador).map(([id, r]) => [String(playerById(m, id)?.dorsal), r]).filter(([d]) => d !== 'undefined'));
}

// ---------- exportación en el formato de acciones de la app de escritorio ----------
export function exportPayload(m) {
  // Numeramos los puntos por set: cada evento que resuelve un rally (tiene winner) cierra uno.
  const puntoPorSet = {};
  const acciones = m.events.filter((e) => e.kind !== 'sub').map((e) => {
    const n = puntoPorSet[e.set] || 1;
    puntoPorSet[e.set] = n + (e.winner ? 1 : 0);
    const base = {
      set_numero: e.set,
      marcador_pre_local: e.pre?.l ?? 0, marcador_pre_rival: e.pre?.r ?? 0,
      marcador_local: e.sc?.l ?? 0, marcador_rival: e.sc?.r ?? 0,
      equipo_al_saque: e.serving || 'local',
      rotacion: e.setter || 1,
      punto_num: n, saque_inicio: e.serving || 'local',
      video_timestamp: 0
    };
    if (e.kind === 'skill') {
      const p = playerById(m, e.playerId);
      return { ...base, dorsal: Number(p?.dorsal) || 0, tipo_accion: SKILLS[e.skill].tipo, subtipo: '', resultado: e.code };
    }
    if (e.kind === 'rivalPoint') return { ...base, dorsal: 0, tipo_accion: 'rival', subtipo: 'Acierto Rival', resultado: '#' };
    if (e.kind === 'rivalError') return { ...base, dorsal: 0, tipo_accion: 'rival', subtipo: 'Error Rival', resultado: '=' };
    if (e.kind === 'teamError') return { ...base, dorsal: 0, tipo_accion: 'error_general', subtipo: e.label || '', resultado: '=' };
    if (e.kind === 'timeout') return { ...base, dorsal: 0, tipo_accion: 'tiempo_muerto', subtipo: e.team === 'local' ? 'Solicitado por Local' : 'Solicitado por Rival', resultado: '+' };
    return { ...base, dorsal: 0, tipo_accion: e.winner === 'local' ? 'rival' : 'error_general', subtipo: e.winner === 'local' ? 'Error Rival' : 'Manual', resultado: e.winner === 'local' ? '=' : '#' };
  });
  return {
    format: 'volleystats-tablet', version: 1, exportedAt: new Date().toISOString(),
    partido: {
      equipo: m.team, rival: m.rival, fecha: m.date, formato: `al mejor de ${m.bestOf}`, resultado_sets: m.setsPlayed.map((s) => `${s.l}-${s.r}`).join(', '),
      origen_uid: m.id, equipo_uid: m.teamId || '', modo: m.modo || 'complejo', terminado: m.status === 'done'
    },
    tiempoJugado: tiempoPorDorsal(m),
    roster: m.roster.map((p) => ({ dorsal: Number(p.dorsal), nombre: p.name, posicion: { S: 'Colocador', OP: 'Opuesto', MB: 'Central', OH: 'Receptor', L: 'Líbero' }[p.pos], es_libero: p.pos === 'L' ? 1 : 0 })),
    acciones,
    tabletMatch: { ...m, undo: [] }
  };
}

// Exportación masiva: todos los partidos y los equipos guardados en un solo archivo para la app de
// escritorio. Cada partido lleva el id del equipo (si se creó con uno guardado) y su propio id, para
// que el escritorio sepa de qué equipo es y no duplique partidos si se importa dos veces.
export function exportTodo(matches, teams) {
  const porNombre = new Map(teams.map((t) => [normalizar(t.name), t]));
  const partidos = matches.map((m) => {
    const { tabletMatch, ...p } = exportPayload(m);
    if (!p.partido.equipo_uid) p.partido.equipo_uid = porNombre.get(normalizar(m.team))?.id || '';
    return p;
  });
  const equipos = teams.map((t) => ({
    uid: t.id, nombre: t.name,
    roster: t.roster.map((p) => ({ dorsal: Number(p.dorsal), nombre: p.name, pos: p.pos }))
  }));
  return { format: 'volleystats-tablet-bulk', version: 1, exportedAt: new Date().toISOString(), equipos, partidos };
}

const normalizar = (s) => String(s || '').trim().toLowerCase();
