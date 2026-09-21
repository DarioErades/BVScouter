// Informe en tiempo real: resumen, jugadores, rotaciones e historial.
import { computeStats, describeEvent, setScores, exportPayload, pct, eff } from '../stats.js';
import { SKILLS, SKILL_KEYS, POS_SHORT, matchResult } from '../engine.js';
import { openSheet, icon, esc, saveFile, toast } from '../ui.js';

const num = (v) => `<span class="num">${v}</span>`;

const bar = (label, value, max, cls = 'info') =>
  `<div class="bar-row"><div class="lab">${esc(label)}</div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${max ? Math.max(value ? 3 : 0, (value / max) * 100) : 0}%"></div></div><div class="n num">${value}</div></div>`;

const barPanel = (title, items, cls) => {
  const max = Math.max(1, ...items.map((i) => i.v));
  const rows = items.filter((i) => i.v > 0);
  return `<div class="card panel"><h3>${title}</h3>${rows.length ? rows.map((i) => bar(i.l, i.v, max, cls)).join('') : '<span class="muted">Sin datos todavía.</span>'}</div>`;
};

const kpi = (v, l, s = '', cls = '') => `<div class="card kpi ${cls}"><div class="v num">${v}</div><div class="l">${l}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;

// ---------- pestañas ----------
function resumen(m, st) {
  const t = st.team;
  const a = st.tot.ataque;
  const r = st.tot.rece;
  const own = t.against.ataque + t.against.bloqueado + t.against.saque + t.against.rece + t.against.defensa + t.against.bloqueo + t.against.general;
  const diff = st.pointsFor - st.pointsAgainst;
  const scores = setScores(m);
  return `
    <div class="kpis">
      ${kpi(st.pointsFor, 'Puntos a favor', `${st.pointsAgainst} en contra`, 'good')}
      ${kpi(`${diff > 0 ? '+' : ''}${diff}`, 'Diferencia', 'puntos a favor − en contra', diff >= 0 ? 'good' : 'bad')}
      ${kpi(own, 'Errores propios', `${t.against.general} generales del equipo`, 'bad')}
      ${kpi(eff(a.win - a.err - a.blocked, a.t), 'Eficacia de ataque', `${a.win} puntos de ${a.t} ataques (${pct(a.win, a.t)})`, 'info')}
      ${kpi(pct(st.so.won, st.so.total), 'Side-out', `${st.so.won} de ${st.so.total} al recibir`, 'info')}
      ${kpi(pct(st.bp.won, st.bp.total), 'Break-point', `${st.bp.won} de ${st.bp.total} al sacar`, 'info')}
      ${kpi(pct(r.good, r.t), 'Recepción positiva', `${r.err} errores en ${r.t} recepciones`, 'info')}
      ${kpi(st.tot.saque.win, 'Aces', `${st.tot.saque.err} errores de saque`, 'info')}
    </div>
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

const COLS = [
  { key: 'pts', label: 'Pts', get: (r) => r.pts, cls: (r) => (r.pts ? 'pos strong' : '') },
  { key: 'err', label: 'Err', get: (r) => r.err, cls: (r) => (r.err ? 'neg strong' : '') },
  { key: 'net', label: '+/−', get: (r) => r.net, fmt: (r) => (r.net > 0 ? `+${r.net}` : r.net), cls: (r) => (r.net > 0 ? 'pos' : r.net < 0 ? 'neg' : '') },
  { grp: 'Ataque', k: 'ataque', cols: [['t', 'T'], ['win', 'Pts'], ['err', 'Err'], ['blocked', 'Blq']], extra: { label: 'Efic', f: (x) => eff(x.win - x.err - x.blocked, x.t) } },
  { grp: 'Recepción', k: 'rece', cols: [['t', 'T'], ['good', 'Ac'], ['err', 'Err']], extra: { label: '% Ac', f: (x) => pct(x.good, x.t) } },
  { grp: 'Defensa', k: 'defensa', cols: [['t', 'T'], ['good', 'Ac'], ['err', 'Err']], extra: { label: '% Ac', f: (x) => pct(x.good, x.t) } },
  { grp: 'Saque', k: 'saque', cols: [['t', 'T'], ['win', 'Ace'], ['err', 'Err']], extra: { label: '% Err', f: (x) => pct(x.err, x.t) } },
  { grp: 'Bloqueo', k: 'bloqueo', cols: [['t', 'T'], ['win', 'Pts'], ['err', 'Err']] }
];

function jugadores(m, st, sort) {
  const activos = st.rows.filter((r) => r.total > 0 || r.pts || r.err);
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
  const maxPts = Math.max(1, ...activos.map((r) => r.pts));
  const maxErr = Math.max(1, ...activos.map((r) => r.err));
  return `
    <div class="two">
      <div class="card panel"><h3>Puntos por jugador</h3>${[...activos].sort((a, b) => b.pts - a.pts).filter((r) => r.pts).map((r) => bar(`#${r.p.dorsal} ${r.p.name || ''}`, r.pts, maxPts, 'good')).join('') || '<span class="muted">Sin puntos todavía.</span>'}</div>
      <div class="card panel"><h3>Errores por jugador</h3>${[...activos].sort((a, b) => b.err - a.err).filter((r) => r.err).map((r) => bar(`#${r.p.dorsal} ${r.p.name || ''}`, r.err, maxErr, 'bad')).join('') || '<span class="muted">Sin errores todavía.</span>'}</div>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th class="l grp">Jugador</th>${head1}</tr><tr><th class="l"></th>${head2}</tr></thead>
      <tbody>${body || `<tr><td colspan="30" class="muted" style="padding:24px">Apunta alguna acción para ver las estadísticas.</td></tr>`}</tbody>
      <tfoot><tr><td class="l">EQUIPO</td>${cells(totRow)}</tr></tfoot>
    </table></div>
    <p class="muted" style="font-size:12px">Pts = puntos directos (ataque, ace y bloqueo). Err = errores propios, incluidos los ataques bloqueados. Efic = (puntos − errores − bloqueados) / ataques. Toca una cabecera para ordenar.</p>`;
}

function rotaciones(st) {
  const cell = (x) => (x.total ? `<div class="rot-cell"><b class="num">${pct(x.won, x.total)}</b><span class="muted num" style="font-size:12px">${x.won}/${x.total}</span></div>` : '<span class="muted">–</span>');
  return `<div class="card panel"><h3>Rendimiento por rotación</h3>
    <div class="tbl-wrap"><table><thead><tr><th class="l">Rotación</th><th>Side-out (recibiendo)</th><th>Break-point (sacando)</th></tr></thead><tbody>
      ${st.byRot.map((r) => `<tr><td class="l" style="font-weight:800">Rotación ${r.rot + 1}</td><td>${cell(r.so)}</td><td>${cell(r.bp)}</td></tr>`).join('')}
    </tbody><tfoot><tr><td class="l">TOTAL</td><td>${cell(st.so)}</td><td>${cell(st.bp)}</td></tr></tfoot></table></div>
    <p class="muted" style="font-size:12px;margin-bottom:0">Rotación 1 es la de inicio de set; sube una cada vez que ganamos el saque.</p></div>`;
}

// Marcador punto por punto: una casilla por punto con el resultado acumulado, como en el informe de playa.
function marcador(m, setN) {
  const sets = [...new Set(m.events.filter((e) => e.winner).map((e) => e.set))]
    .filter((s) => setN == null || s === setN).sort((a, b) => a - b);
  if (!sets.length) return '<div class="empty">Todavía no hay puntos.</div>';
  const finales = Object.fromEntries(setScores(m).map((x) => [x.n, x]));

  return sets.map((s) => {
    const evs = m.events.filter((e) => e.set === s && e.winner);
    const fin = finales[s] || { l: evs[evs.length - 1].sc.l, r: evs[evs.length - 1].sc.r, done: true };
    // rachas y ventaja máxima
    let run = 0; let prev = null; const best = { local: 0, rival: 0 }; let up = 0; let down = 0;
    evs.forEach((e) => {
      run = e.winner === prev ? run + 1 : 1; prev = e.winner;
      best[e.winner] = Math.max(best[e.winner], run);
      up = Math.max(up, e.sc.l - e.sc.r); down = Math.max(down, e.sc.r - e.sc.l);
    });
    const box = (e, team) => (e.winner === team
      ? `<button class="pt ${team}" data-pt="${e.id}">${team === 'local' ? e.sc.l : e.sc.r}</button>`
      : '<span class="pt gap"></span>');
    const idx = evs.map((e, i) => `<span class="pt-idx num">${(i + 1) % 5 === 0 || i === 0 ? i + 1 : ''}</span>`).join('');
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
      <div class="flow">
        <div class="flow-row"><span class="flow-lab" style="color:var(--good)">NOS</span>${evs.map((e) => box(e, 'local')).join('')}</div>
        <div class="flow-row"><span class="flow-lab" style="color:var(--bad)">RIV</span>${evs.map((e) => box(e, 'rival')).join('')}</div>
        <div class="flow-row idx"><span class="flow-lab"></span>${idx}</div>
      </div>
      <div class="flow-detail muted">Toca un punto para ver cómo se consiguió.</div>
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
    const bodyHtml = tab === 'resumen' ? resumen(m, st) : tab === 'jugadores' ? jugadores(m, st, sort) : tab === 'marcador' ? marcador(m, setN) : tab === 'rotaciones' ? rotaciones(st) : historial(m, setN);
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
      ov.querySelector('.sheet-head').insertAdjacentHTML('beforeend', `<button class="btn sm" data-export>${icon('download', 18)} Exportar</button>`);
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
            card.querySelector('.flow-detail').innerHTML = `<b>${ev.sc.l} – ${ev.sc.r}</b> · ${esc(d.who)} <span class="muted">${esc(d.what)}</span> · ${ev.serving === 'local' ? 'sacábamos nosotros' : 'sacaba el rival'}`;
          }
        }
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
