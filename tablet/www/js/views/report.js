// Informe en tiempo real: resumen, jugadores, rotaciones e historial.
import { computeStats, computeTiempoJugado, describeEvent, setScores, exportPayload, pct, eff } from '../stats.js';
import { POS_SHORT, matchResult } from '../engine.js';
import { openSheet, icon, esc, saveFile, toast, exportarPdf, fmtDate } from '../ui.js';

const num = (v) => `<span class="num">${v}</span>`;

const bar = (label, value, max, cls = 'info') =>
  `<div class="bar-row"><div class="lab">${esc(label)}</div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${max ? Math.max(value ? 3 : 0, (value / max) * 100) : 0}%"></div></div><div class="n num">${value}</div></div>`;

const barPanel = (title, items, cls) => {
  const max = Math.max(1, ...items.map((i) => i.v));
  const rows = items.filter((i) => i.v > 0);
  return `<div class="card panel"><h3>${title}</h3>${rows.length ? rows.map((i) => bar(i.l, i.v, max, cls)).join('') : '<span class="muted">Sin datos todavía.</span>'}</div>`;
};

const kpi = (v, l, s = '', cls = '') => `<div class="card kpi ${cls}"><div class="v num">${v}</div><div class="l">${l}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;

// Informe "simple" si todas las acciones se anotaron en modo simple: ahí la recepción y la
// defensa solo tienen fallos, así que no tiene sentido mostrar aciertos ni porcentajes.
const esSimple = (m) => m.modo === 'simple' && !m.events.some((e) => e.kind === 'skill' && !['acierto', 'fallo'].includes(e.res));

// ---------- pestañas ----------
function resumen(m, st) {
  return indicadores(m, st) + puntosEquipo(m, st);
}

function indicadores(m, st) {
  const t = st.team;
  const a = st.tot.ataque;
  const r = st.tot.rece;
  const own = t.against.ataque + t.against.bloqueado + t.against.saque + t.against.rece + t.against.defensa + t.against.bloqueo + t.against.general;
  const diff = st.pointsFor - st.pointsAgainst;
  return `
    <div class="kpis">
      ${kpi(st.pointsFor, 'Puntos a favor', `${st.pointsAgainst} en contra`, 'good')}
      ${kpi(`${diff > 0 ? '+' : ''}${diff}`, 'Diferencia', 'puntos a favor − en contra', diff >= 0 ? 'good' : 'bad')}
      ${kpi(own, 'Errores propios', `${t.against.general} generales del equipo`, 'bad')}
      ${kpi(eff(a.win - a.err - a.blocked, a.t), 'Eficacia de ataque', `${a.win} puntos de ${a.t} ataques (${pct(a.win, a.t)})`, 'info')}
      ${kpi(pct(st.so.won, st.so.total), 'Side-out', `${st.so.won} de ${st.so.total} al recibir`, 'info')}
      ${kpi(pct(st.bp.won, st.bp.total), 'Break-point', `${st.bp.won} de ${st.bp.total} al sacar`, 'info')}
      ${esSimple(m)
        ? kpi(r.err, 'Errores de recepción', `${st.tot.defensa.err} errores de defensa`, 'bad')
        : kpi(pct(r.good, r.t), 'Recepción positiva', `${r.err} errores en ${r.t} recepciones`, 'info')}
      ${kpi(st.tot.saque.win, 'Aces', `${st.tot.saque.err} errores de saque`, 'info')}
    </div>`;
}

function puntosEquipo(m, st) {
  const t = st.team;
  const scores = setScores(m);
  return `
    <div class="two">
      ${barPanel('Cómo hemos ganado los puntos', [
        { l: 'Ataque', v: t.for.ataque }, { l: 'Saque (aces)', v: t.for.saque }, { l: 'Bloqueo', v: t.for.bloqueo },
        { l: 'Error del rival', v: t.for.rivalError }, { l: 'Manuales', v: t.for.manual }
      ], 'good')}
      ${barPanel('Cómo hemos perdido los puntos', [
        { l: 'Error de ataque', v: t.against.ataque }, { l: 'Ataque bloqueado', v: t.against.bloqueado }, { l: 'Error de saque', v: t.against.saque },
        { l: 'Error de recepción', v: t.against.rece }, { l: 'Error de defensa', v: t.against.defensa }, { l: 'Error de bloqueo', v: t.against.bloqueo },
        { l: 'Error general', v: t.against.general }, { l: 'Punto del rival', v: t.against.rivalPoint }, { l: 'Manuales', v: t.against.manual }
      ], 'bad')}
    </div>
    <div class="two">
      ${Object.keys(t.general).length ? barPanel('Errores generales por tipo', Object.entries(t.general).map(([l, v]) => ({ l, v })), 'bad') : ''}
      <div class="card panel"><h3>Marcador por sets</h3>
        ${scores.length ? scores.map((s) => `<div class="bar-row" style="grid-template-columns:90px 1fr 90px"><div class="lab">Set ${s.n}${s.done ? '' : ' · en juego'}</div><div class="bar-track"><div class="bar-fill ${s.l > s.r ? 'good' : s.l < s.r ? 'bad' : 'info'}" style="width:${Math.min(100, (s.l / Math.max(25, s.l, s.r)) * 100)}%"></div></div><div class="n num">${s.l} – ${s.r}</div></div>`).join('') : '<span class="muted">Sin sets todavía.</span>'}
      </div>
    </div>`;
}

const COLS_COMPLEJO = [
  { key: 'pts', label: 'Pts', get: (r) => r.pts, cls: (r) => (r.pts ? 'pos strong' : '') },
  { key: 'err', label: 'Err', get: (r) => r.err, cls: (r) => (r.err ? 'neg strong' : '') },
  { key: 'net', label: '+/−', get: (r) => r.net, fmt: (r) => (r.net > 0 ? `+${r.net}` : r.net), cls: (r) => (r.net > 0 ? 'pos' : r.net < 0 ? 'neg' : '') },
  { grp: 'Ataque', k: 'ataque', cols: [['t', 'T'], ['win', 'Pts'], ['err', 'Err'], ['blocked', 'Blq']], extra: { label: 'Efic', f: (x) => eff(x.win - x.err - x.blocked, x.t) } },
  { grp: 'Recepción', k: 'rece', cols: [['t', 'T'], ['good', 'Ac'], ['err', 'Err']], extra: { label: '% Ac', f: (x) => pct(x.good, x.t) } },
  { grp: 'Defensa', k: 'defensa', cols: [['t', 'T'], ['good', 'Ac'], ['err', 'Err']], extra: { label: '% Ac', f: (x) => pct(x.good, x.t) } },
  { grp: 'Saque', k: 'saque', cols: [['t', 'T'], ['win', 'Ace'], ['err', 'Err']], extra: { label: '% Err', f: (x) => pct(x.err, x.t) } },
  { grp: 'Bloqueo', k: 'bloqueo', cols: [['t', 'T'], ['win', 'Pts'], ['err', 'Err']] }
];

const COLS_SIMPLE = [
  ...COLS_COMPLEJO.slice(0, 3),
  { grp: 'Ataque', k: 'ataque', cols: [['t', 'T'], ['win', 'Pts'], ['err', 'Err']], extra: { label: 'Efic', f: (x) => eff(x.win - x.err - x.blocked, x.t) } },
  { grp: 'Recepción', k: 'rece', cols: [['err', 'Err']] },
  { grp: 'Defensa', k: 'defensa', cols: [['err', 'Err']] },
  { grp: 'Saque', k: 'saque', cols: [['t', 'T'], ['win', 'Ace'], ['err', 'Err']] },
  { grp: 'Bloqueo', k: 'bloqueo', cols: [['win', 'Pts'], ['err', 'Err']] }
];

const activosDe = (st) => st.rows.filter((r) => r.total > 0 || r.pts || r.err);

function jugadores(m, st, sort, setN) {
  return barrasJugadores(st) + tablaJugadores(m, st, sort) + tiempoJuego(m, st, setN);
}

function barrasJugadores(st) {
  const activos = activosDe(st);
  const maxPts = Math.max(1, ...activos.map((r) => r.pts));
  const maxErr = Math.max(1, ...activos.map((r) => r.err));
  return `
    <div class="two">
      <div class="card panel"><h3>Puntos por jugador</h3>${[...activos].sort((a, b) => b.pts - a.pts).filter((r) => r.pts).map((r) => bar(`#${r.p.dorsal} ${r.p.name || ''}`, r.pts, maxPts, 'good')).join('') || '<span class="muted">Sin puntos todavía.</span>'}</div>
      <div class="card panel"><h3>Errores por jugador</h3>${[...activos].sort((a, b) => b.err - a.err).filter((r) => r.err).map((r) => bar(`#${r.p.dorsal} ${r.p.name || ''}`, r.err, maxErr, 'bad')).join('') || '<span class="muted">Sin errores todavía.</span>'}</div>
    </div>`;
}

function tablaJugadores(m, st, sort) {
  const simple = esSimple(m);
  const COLS = simple ? COLS_SIMPLE : COLS_COMPLEJO;
  const activos = activosDe(st);
  const val = (r) => {
    if (!sort) return r.pts;
    const [a, b] = sort.split('.');
    return b ? r[a][b] : r[a];
  };
  activos.sort((x, y) => val(y) - val(x) || y.pts - x.pts);
  const head1 = COLS.map((c) => (c.grp ? `<th class="grp" colspan="${c.cols.length + (c.extra ? 1 : 0)}">${c.grp}</th>` : '<th class="grp"></th>')).join('');
  const head2 = COLS.map((c) => {
    if (!c.grp) return `<th data-sort="${c.key}" class="${sort === c.key ? 'sorted' : ''}">${c.label}</th>`;
    return c.cols.map(([f, l]) => `<th data-sort="${c.k}.${f}" class="${sort === `${c.k}.${f}` ? 'sorted' : ''}">${l}</th>`).join('') + (c.extra ? `<th>${c.extra.label}</th>` : '');
  }).join('');
  const cells = (r, tot) => COLS.map((c) => {
    if (!c.grp) return `<td class="${c.cls(r)}">${c.fmt ? c.fmt(r) : c.get(r)}</td>`;
    return c.cols.map(([f]) => `<td>${r[c.k][f] || (f === 't' ? 0 : '·')}</td>`).join('') + (c.extra ? `<td>${c.extra.f(r[c.k])}</td>` : '');
  }).join('');
  const body = activos.map((r) => `<tr><td class="l" style="font-weight:800"><span class="pill" style="margin-right:8px">${r.p.dorsal}</span>${esc(r.p.name || 'Jugador')} <span class="muted" style="font-size:11px">${POS_SHORT[r.p.pos]}</span></td>${cells(r)}</tr>`).join('');
  const totRow = { p: null, pts: st.pointsFor - st.team.for.rivalError - st.team.for.manual, err: activos.reduce((a, r) => a + r.err, 0), net: 0, ...st.tot };
  totRow.net = totRow.pts - totRow.err;
  return `
    <div class="tbl-wrap"><table>
      <thead><tr><th class="l grp">Jugador</th>${head1}</tr><tr><th class="l"></th>${head2}</tr></thead>
      <tbody>${body || `<tr><td colspan="30" class="muted" style="padding:24px">Apunta alguna acción para ver las estadísticas.</td></tr>`}</tbody>
      <tfoot><tr><td class="l">EQUIPO</td>${cells(totRow)}</tr></tfoot>
    </table></div>
    <p class="muted nota" style="font-size:12px">Pts = puntos directos (ataque, ace y bloqueo). Err = errores propios${simple ? '' : ', incluidos los ataques bloqueados'}. Efic = (puntos − errores${simple ? '' : ' − bloqueados'}) / ataques.${simple ? ' Modo simple: en recepción y defensa solo se apuntan los fallos.' : ''}<span class="solo-pantalla"> Toca una cabecera para ordenar.</span></p>`;
}

function tiempoJuego(m, st, setN) {
  const t = computeTiempoJugado(m, setN);
  const filas = m.roster
    .filter((p) => t.porJugador[p.id])
    .map((p) => ({ p, t: t.porJugador[p.id] }))
    .sort((a, b) => b.t.puntosJugados - a.t.puntosJugados || Number(a.p.dorsal) - Number(b.p.dorsal));
  if (!t.hayDatos || !filas.length) return '<div class="card panel"><h3>Tiempo de juego (puntos jugados)</h3><span class="muted">Sin datos de alineación todavía.</span></div>';
  const bal = (x) => (x > 0 ? `+${x}` : x);
  return `<div class="card panel"><h3>Tiempo de juego (puntos jugados)</h3>
    <div class="tbl-wrap"><table>
      <thead><tr><th class="l">Jugador</th><th>Sets</th><th>Puntos jugados</th><th>% del total</th><th>Ganados</th><th>Perdidos</th><th>Balance</th></tr></thead>
      <tbody>${filas.map(({ p, t: x }) => {
        const b = x.ganados - x.perdidos;
        return `<tr><td class="l" style="font-weight:800"><span class="pill" style="margin-right:8px">${p.dorsal}</span>${esc(p.name || 'Jugador')} <span class="muted" style="font-size:11px">${POS_SHORT[p.pos]}</span></td><td>${x.sets}</td><td class="strong">${x.puntosJugados}</td><td>${pct(x.puntosJugados, st.rallies)}</td><td>${x.ganados}</td><td>${x.perdidos}</td><td class="${b > 0 ? 'pos' : b < 0 ? 'neg' : ''}">${bal(b)}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <p class="muted nota" style="font-size:12px;margin-bottom:0">Cuenta los puntos disputados con cada jugador en pista, a partir de la alineación inicial de cada set y los cambios.</p></div>`;
}

function rotaciones(st) {
  const cell = (x) => (x.total ? `<div class="rot-cell"><b class="num">${pct(x.won, x.total)}</b><span class="muted num" style="font-size:12px">${x.won}/${x.total}</span></div>` : '<span class="muted">–</span>');
  return `<div class="card panel"><h3>Rendimiento por rotación</h3>
    <div class="tbl-wrap"><table><thead><tr><th class="l">Rotación</th><th>Side-out (recibiendo)</th><th>Break-point (sacando)</th></tr></thead><tbody>
      ${st.byRot.map((r) => `<tr><td class="l" style="font-weight:800">Rotación ${r.rot}</td><td>${cell(r.so)}</td><td>${cell(r.bp)}</td></tr>`).join('')}
    </tbody><tfoot><tr><td class="l">TOTAL</td><td>${cell(st.so)}</td><td>${cell(st.bp)}</td></tr></tfoot></table></div>
    <p class="muted" style="font-size:12px;margin-bottom:0">La rotación es la posición del colocador en pista (1-6), igual que en la app de escritorio.</p></div>`;
}

// Marcador punto por punto: una casilla por punto con el resultado acumulado, como en el informe de playa.
// porFila: en el PDF la línea se parte en bloques de ese nº de columnas para que quepa en la página.
function marcador(m, setN, porFila = Infinity) {
  const sets = [...new Set(m.events.filter((e) => e.winner).map((e) => e.set))]
    .filter((s) => setN == null || s === setN).sort((a, b) => a - b);
  if (!sets.length) return '<div class="empty">Todavía no hay puntos.</div>';
  const finales = Object.fromEntries(setScores(m).map((x) => [x.n, x]));

  return sets.map((s) => {
    const evs = m.events.filter((e) => e.set === s && e.winner);
    // Columnas del timeline: los puntos y, en su sitio cronológico, los tiempos muertos (barra roja).
    const cols = m.events.filter((e) => e.set === s && (e.winner || e.kind === 'timeout'));
    const fin = finales[s] || { l: evs[evs.length - 1].sc.l, r: evs[evs.length - 1].sc.r, done: true };
    // rachas y ventaja máxima (solo cuentan los puntos, no los tiempos muertos)
    let run = 0; let prev = null; const best = { local: 0, rival: 0 }; let up = 0; let down = 0;
    evs.forEach((e) => {
      run = e.winner === prev ? run + 1 : 1; prev = e.winner;
      best[e.winner] = Math.max(best[e.winner], run);
      up = Math.max(up, e.sc.l - e.sc.r); down = Math.max(down, e.sc.r - e.sc.l);
    });
    const timeoutBar = (e) => `<button class="pt timeout" data-pt="${e.id}" title="Tiempo muerto ${e.team === 'local' ? 'nuestro' : 'rival'}">⏱</button>`;
    const box = (e, team) => {
      if (e.kind === 'timeout') return timeoutBar(e);
      return e.winner === team
        ? `<button class="pt ${team}" data-pt="${e.id}">${team === 'local' ? e.sc.l : e.sc.r}</button>`
        : '<span class="pt gap"></span>';
    };
    let numPunto = 0;
    const idxDe = (e) => {
      if (e.kind === 'timeout') return '<span class="pt-idx" style="width:14px"></span>';
      numPunto++;
      return `<span class="pt-idx num">${numPunto % 5 === 0 || numPunto === 1 ? numPunto : ''}</span>`;
    };
    const bloques = [];
    for (let i = 0; i < cols.length; i += porFila) bloques.push(cols.slice(i, i + porFila));
    const flows = bloques.map((b) => `<div class="flow">
        <div class="flow-row"><span class="flow-lab" style="color:var(--good)">NOS</span>${b.map((e) => box(e, 'local')).join('')}</div>
        <div class="flow-row"><span class="flow-lab" style="color:var(--bad)">RIV</span>${b.map((e) => box(e, 'rival')).join('')}</div>
        <div class="flow-row idx"><span class="flow-lab"></span>${b.map(idxDe).join('')}</div>
      </div>`).join('');
    const tone = fin.done ? (fin.l > fin.r ? 'good' : 'bad') : 'warn';
    return `<div class="card panel flow-card" data-flow="${s}">
      <div class="flow-head">
        <h3 style="margin:0">Set ${s}</h3>
        <span class="pill ${tone}">${fin.done ? 'Final' : 'En juego'}: <b class="num">${fin.l} – ${fin.r}</b></span>
        <span class="spacer"></span>
        <span class="pill">Racha máx. nuestra <b class="num">${best.local}</b></span>
        <span class="pill">rival <b class="num">${best.rival}</b></span>
        <span class="pill">Mayor ventaja <b class="num">+${up}</b> / <b class="num">−${down}</b></span>
      </div>
      ${flows}
      <div class="flow-detail muted">Toca un punto o un tiempo muerto para ver el detalle.</div>
    </div>`;
  }).join('');
}

function historial(m, setN) {
  const evs = m.events.filter((e) => setN == null || e.set === setN).slice().reverse();
  if (!evs.length) return '<div class="empty">Todavía no hay acciones.</div>';
  return `<div class="hist" style="gap:8px">${evs.map((e) => {
    const d = describeEvent(m, e);
    return `<div class="h" style="padding:12px 14px;font-size:15px"><span class="tone ${d.tone}"></span><span class="pill">S${e.set}</span><span><b>${esc(d.who)}</b> <span class="muted">${esc(d.what)}</span></span>${e.sc ? `<span class="sc num">${e.sc.l} – ${e.sc.r}</span>` : ''}</div>`;
  }).join('')}</div>`;
}

// ---------- ventana ----------
export function openReport(m, opts = {}) {
  let tab = 'resumen';
  let setN = null;
  let sort = null;
  let timer = null;

  const render = (api) => {
    const st = computeStats(m, setN);
    const sets = [...new Set(m.events.map((e) => e.set))].sort((a, b) => a - b);
    const bodyHtml = tab === 'resumen' ? resumen(m, st) : tab === 'jugadores' ? jugadores(m, st, sort, setN) : tab === 'marcador' ? marcador(m, setN) : tab === 'rotaciones' ? rotaciones(st) : historial(m, setN);
    api.setBody(`
      <div class="rep-head" style="padding:0 0 12px">
        <div class="seg"><button data-set="all" class="${setN == null ? 'on' : ''}">Partido</button>${sets.map((s) => `<button data-set="${s}" class="${setN === s ? 'on' : ''}">Set ${s}</button>`).join('')}</div>
        <span class="spacer"></span>
        <span class="pill good" title="El informe se actualiza solo">● En directo</span>
      </div>
      <div class="tabs" style="padding:0 0 12px">${[['resumen', 'Resumen'], ['jugadores', 'Jugadores'], ['marcador', 'Marcador'], ['rotaciones', 'Rotaciones'], ['historial', 'Historial']].map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      ${bodyHtml}`);
  };

  const api = openSheet({
    title: `${esc(m.team)} <span class="muted" style="font-weight:600">vs</span> ${esc(m.rival)} <span class="pill" style="margin-left:8px;font-size:14px">${matchResult(m)} sets</span>`,
    full: true,
    onClose: () => clearInterval(timer),
    onMount: (ov) => {
      ov.querySelector('.sheet-head').insertAdjacentHTML('beforeend', `<button class="btn sm" data-pdf>${icon('file', 18)} PDF</button><button class="btn sm" data-export>${icon('download', 18)} Exportar</button>`);
      ov.addEventListener('click', async (e) => {
        const tabBtn = e.target.closest('[data-tab]');
        const setBtn = e.target.closest('[data-set]');
        const sortBtn = e.target.closest('[data-sort]');
        const ptBtn = e.target.closest('[data-pt]');
        if (tabBtn) { tab = tabBtn.dataset.tab; render(api); }
        else if (setBtn) { setN = setBtn.dataset.set === 'all' ? null : Number(setBtn.dataset.set); render(api); }
        else if (sortBtn) { sort = sortBtn.dataset.sort; render(api); }
        else if (ptBtn) {
          const ev = m.events.find((x) => x.id === ptBtn.dataset.pt);
          const card = ptBtn.closest('.flow-card');
          card.querySelectorAll('.pt.on').forEach((b) => b.classList.remove('on'));
          ptBtn.classList.add('on');
          if (ev) {
            const d = describeEvent(m, ev);
            const saque = ev.serving ? ` · ${ev.serving === 'local' ? 'sacábamos nosotros' : 'sacaba el rival'}` : '';
            card.querySelector('.flow-detail').innerHTML = `<b>${ev.sc.l} – ${ev.sc.r}</b> · ${esc(d.who)} <span class="muted">${esc(d.what)}</span>${saque}`;
          }
        }
        else if (e.target.closest('[data-pdf]')) pdfSheet(m, setN);
        else if (e.target.closest('[data-export]')) {
          const name = `partido_${m.team}_vs_${m.rival}_${m.date}.json`.replace(/[^\w.-]+/g, '_');
          try { await saveFile(name, JSON.stringify(exportPayload(m), null, 2)); toast('Partido exportado', 'good'); } catch (err) { toast('No se pudo exportar', 'bad'); }
        }
      });
    }
  });
  render(api);
  return api;
}

// ---------- exportar a PDF ----------
const SECCIONES_PDF = [
  { id: 'indicadores', label: 'Indicadores del partido', def: true },
  { id: 'puntos', label: 'Cómo se ganan y pierden los puntos · marcador por sets', def: true },
  { id: 'barras', label: 'Puntos y errores por jugador (gráficas)', def: true },
  { id: 'tabla', label: 'Tabla de estadísticas por jugador', def: true },
  { id: 'tiempo', label: 'Tiempo de juego (puntos jugados)', def: true },
  { id: 'rotaciones', label: 'Rendimiento por rotación', def: true },
  { id: 'marcador', label: 'Marcador punto a punto', def: true },
  { id: 'historial', label: 'Historial de acciones', def: false }
];
const PDF_KEY = 'volleystats.tablet.pdf';

function leerSecciones() {
  try {
    const g = JSON.parse(localStorage.getItem(PDF_KEY));
    if (Array.isArray(g)) return new Set(g);
  } catch (e) { /* sin preferencia guardada */ }
  return new Set(SECCIONES_PDF.filter((x) => x.def).map((x) => x.id));
}
function guardarSecciones(sel) {
  try { localStorage.setItem(PDF_KEY, JSON.stringify([...sel])); } catch (e) { /* no pasa nada */ }
}

function pdfSheet(m, setInicial) {
  const sel = leerSecciones();
  let setN = setInicial;
  const sets = [...new Set(m.events.map((e) => e.set))].sort((a, b) => a - b);
  const body = () => `
    <div class="section-title" style="margin-top:0">Alcance</div>
    <div class="seg" style="margin-bottom:14px"><button data-pset="all" class="${setN == null ? 'on' : ''}">Partido</button>${sets.map((s) => `<button data-pset="${s}" class="${setN === s ? 'on' : ''}">Set ${s}</button>`).join('')}</div>
    <div class="section-title">Qué incluir</div>
    <div class="pick-list">${SECCIONES_PDF.map((x) => `<button class="pickable ${sel.has(x.id) ? 'on' : ''}" data-sec="${x.id}"><span class="check">${sel.has(x.id) ? icon('check', 18) : ''}</span>${x.label}</button>`).join('')}</div>`;
  openSheet({
    title: 'Exportar informe en PDF', html: body(),
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" data-gen>${icon('file', 20)} Generar PDF</button>`,
    onMount: (ov, api) => {
      const gen = ov.querySelector('[data-gen]');
      const refresh = () => { api.setBody(body()); gen.disabled = !sel.size; };
      ov.addEventListener('click', async (e) => {
        const sec = e.target.closest('[data-sec]');
        const ps = e.target.closest('[data-pset]');
        if (sec) { const id = sec.dataset.sec; if (sel.has(id)) sel.delete(id); else sel.add(id); refresh(); }
        else if (ps) { setN = ps.dataset.pset === 'all' ? null : Number(ps.dataset.pset); refresh(); }
        else if (e.target.closest('[data-gen]')) {
          guardarSecciones(sel);
          api.close();
          const alcance = setN == null ? 'partido' : `set${setN}`;
          const nombre = `informe_${m.team}_vs_${m.rival}_${m.date}_${alcance}`.replace(/[^\w.-]+/g, '_');
          try { await exportarPdf(nombre, htmlPdf(m, setN, sel)); } catch (err) { toast('No se pudo generar el PDF', 'bad'); }
        }
      });
    }
  });
}

function htmlPdf(m, setN, sel) {
  const st = computeStats(m, setN);
  const parciales = setScores(m).map((s) => `${s.l}-${s.r}`).join(' · ');
  const bloque = (id, titulo, html) => (sel.has(id) ? `<section>${titulo ? `<h2>${titulo}</h2>` : ''}${html}</section>` : '');
  const partes = [
    bloque('indicadores', 'Resumen', indicadores(m, st)),
    bloque('puntos', '', puntosEquipo(m, st)),
    bloque('barras', '', barrasJugadores(st)),
    bloque('tabla', 'Estadísticas por jugador', tablaJugadores(m, st, null)),
    bloque('tiempo', '', tiempoJuego(m, st, setN)),
    bloque('rotaciones', '', rotaciones(st)),
    bloque('marcador', 'Marcador punto a punto', marcador(m, setN, 34)),
    bloque('historial', 'Historial de acciones', historial(m, setN))
  ].join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(m.team)} vs ${esc(m.rival)}</title><style>${CSS_PDF}</style></head><body>
    <header class="cab">
      <div><h1>${esc(m.team)} <span class="muted">vs</span> ${esc(m.rival)}</h1>
      <div class="muted">${esc(fmtDate(m.date))} · al mejor de ${m.bestOf} · ${setN == null ? 'Partido completo' : `Set ${setN}`}</div></div>
      <div class="res"><b class="num">${matchResult(m)}</b><div class="muted num">${esc(parciales)}</div></div>
    </header>
    ${partes}
    <footer class="muted">Generado con VolleyStats Tablet · ${new Date().toLocaleString('es-ES')}</footer>
    <script>
      document.querySelectorAll('table, .flow').forEach(function (t) {
        var ancho = t.scrollWidth, max = document.body.clientWidth;
        if (ancho > max) t.style.zoom = String(max / ancho);
      });
    </script>
  </body></html>`;
}

const CSS_PDF = `
  @page { size: A4 landscape; margin: 10mm; }
  :root { --good: #15803d; --bad: #be123c; --accent-2: #0e7490; --muted: #64748b; --neutral: #94a3b8; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: 'Inter', system-ui, Roboto, sans-serif; color: #0f172a; background: #fff; font-size: 11px; }
  .muted { color: #64748b; } .num { font-variant-numeric: tabular-nums; }
  .solo-pantalla, .flow-detail, .spacer { display: none; }
  .cab { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #7c6cff; padding-bottom: 8px; margin-bottom: 12px; }
  .cab h1 { margin: 0 0 2px; font-size: 20px; } .cab .res { text-align: right; } .cab .res b { font-size: 26px; }
  section { margin-bottom: 12px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; margin: 14px 0 8px; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
  .panel { padding: 10px 12px; margin-bottom: 10px; break-inside: avoid; }
  .panel h3 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #475569; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
  .kpi { padding: 8px 10px; break-inside: avoid; }
  .kpi .v { font-size: 22px; font-weight: 900; line-height: 1.1; } .kpi .l { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: #64748b; }
  .kpi .s { font-size: 9px; color: #64748b; }
  .kpi.good .v { color: #15803d; } .kpi.bad .v { color: #be123c; } .kpi.info .v { color: #0e7490; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .bar-row { display: grid; grid-template-columns: 140px 1fr 36px; align-items: center; gap: 8px; margin: 4px 0; }
  .bar-row .lab { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .bar-row .n { text-align: right; font-weight: 800; }
  .bar-track { height: 9px; border-radius: 5px; background: #f1f5f9; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 5px; background: #7c6cff; }
  .bar-fill.good { background: #22c55e; } .bar-fill.bad { background: #f43f5e; } .bar-fill.info { background: #22d3ee; }
  .tbl-wrap { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  table { border-collapse: collapse; width: 100%; font-size: 10px; }
  th, td { padding: 4px 5px; text-align: center; white-space: nowrap; border-bottom: 1px solid #eef2f7; }
  th { font-size: 8.5px; text-transform: uppercase; letter-spacing: .04em; color: #475569; background: #f8fafc; }
  th.grp { border-bottom: 1px solid #e2e8f0; } td.l, th.l { text-align: left; }
  tbody tr:nth-child(even) { background: #fafbfd; } tr { break-inside: avoid; }
  tfoot td { font-weight: 900; background: #eef0ff; border-top: 2px solid #7c6cff; }
  td.pos { color: #15803d; font-weight: 800; } td.neg { color: #be123c; font-weight: 800; } td.strong { font-weight: 900; }
  .pill { display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 9px; font-weight: 700; background: #f1f5f9; color: #475569; }
  .pill.good { background: #dcfce7; color: #15803d; } .pill.bad { background: #ffe4e6; color: #be123c; } .pill.warn { background: #fef3c7; color: #92400e; }
  .rot-cell { display: flex; flex-direction: column; align-items: center; }
  .flow-card { break-inside: avoid; } .flow-head { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 6px; }
  .flow { margin-bottom: 6px; } .flow-row { display: flex; align-items: center; }
  .flow-row + .flow-row { margin-top: 2px; }
  .flow-lab { min-width: 30px; font-size: 9px; font-weight: 900; }
  .pt { flex: none; width: 20px; height: 20px; margin: 0 1px; border-radius: 4px; display: grid; place-items: center; font-size: 9px; font-weight: 800; color: #fff; border: 0; padding: 0; font-family: inherit; }
  .pt.local { background: #22c55e; } .pt.rival { background: #f43f5e; }
  .pt.timeout { width: 8px; background: #ef4444; font-size: 0; }
  .pt-idx { flex: none; width: 20px; margin: 0 1px; text-align: center; font-size: 8px; color: #94a3b8; }
  .hist { display: flex; flex-direction: column; } .hist .h { display: flex; align-items: center; gap: 6px; padding: 3px 4px !important; font-size: 10px !important; border-bottom: 1px solid #f1f5f9; break-inside: avoid; }
  .hist .h .sc { margin-left: auto; font-weight: 800; color: #475569; }
  .tone { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; flex: none; } .tone.good { background: #22c55e; } .tone.bad { background: #f43f5e; }
  .empty { color: #64748b; padding: 8px 0; }
  footer { margin-top: 14px; font-size: 9px; text-align: right; }
`;
