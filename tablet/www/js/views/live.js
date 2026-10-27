import { register, go } from '../nav.js';
import { getMatch, saveMatch, getVistaLive, setVistaLive } from '../store.js';
import * as E from '../engine.js';
import { computeStats, describeEvent, exportPayload, pct, eff } from '../stats.js';
import { icon, esc, toast, openSheet, confirmDlg, saveFile } from '../ui.js';
import { openReport } from './report.js';

let root, m;
let open = null;        // { pid, skill } — fila con los resultados desplegados
let suppress = false;   // ignora el clic que sigue a una pulsación larga
let lpTimer = null;

const COURT_ORDER = [4, 3, 2, 5, 6, 1];
// Acciones de cada recuadro en la vista de campo. El saque solo lo tiene P1 cuando sacamos.
const SKILLS_CAMPO = ['ataque', 'rece', 'defensa', 'bloqueo'];
const SKILLS_LIBERO = ['rece', 'defensa'];

// ---------- pintado ----------
function draw() {
  const L = m.live;
  const st = computeStats(m);
  const byId = Object.fromEntries(st.rows.map((r) => [r.p.id, r]));
  const won = E.setsWon(m);
  const rows = E.liveRows(m);
  const last = m.events.slice(-6).reverse();
  const campo = getVistaLive() === 'campo';

  root.innerHTML = `<div class="live">
    <header class="topbar">
      <div class="left">
        <button class="icon-btn" data-act="home" aria-label="Inicio">${icon('home')}</button>
        <div><div style="font-weight:800">${esc(m.team)}</div><div class="muted" style="font-size:12px">vs ${esc(m.rival)}</div></div>
      </div>
      <div class="board">
        <div class="team-side local">
          <div class="tn">${L.serving === 'local' ? `<span class="serve">${icon('ball', 16)}</span>` : ''}${esc(m.team)}</div>
          <button class="score-btn num" data-score="local">${L.score.l}</button>
        </div>
        <div class="mid"><span class="setno">Set ${L.set}</span><span class="sets num">${won.local} – ${won.rival}</span><span style="font-size:11px">a ${E.setTarget(m)}</span></div>
        <div class="team-side rival">
          <div class="tn">${esc(m.rival)}${L.serving === 'rival' ? `<span class="serve">${icon('ball', 16)}</span>` : ''}</div>
          <button class="score-btn num" data-score="rival">${L.score.r}</button>
        </div>
      </div>
      <div class="right">
        <button class="pill" data-act="menu" title="Toca el menú para cambiarlo" style="cursor:pointer">${m.modo === 'simple' ? 'Simple' : 'Complejo'}</button>
        <button class="icon-btn" data-act="vista" aria-label="${campo ? 'Ver en filas' : 'Ver en el campo'}" title="${campo ? 'Ver en filas' : 'Ver en el campo'}">${icon(campo ? 'list' : 'court')}</button>
        <button class="icon-btn" data-act="undo" ${m.undo.length ? '' : 'disabled'} aria-label="Deshacer">${icon('undo')}</button>
        <button class="icon-btn" data-act="sub" aria-label="Cambio">${icon('swap')}</button>
        <button class="icon-btn" data-act="report" aria-label="Informe">${icon('chart')}</button>
        <button class="icon-btn" data-act="menu" aria-label="Menú">${icon('dots')}</button>
      </div>
    </header>

    <main class="livemain">
      ${campo ? campoHtml(byId) : `<section class="rows">${rows.map(({ p, slot }) => row(p, slot, byId[p.id])).join('')}</section>`}
      <aside class="side">
        <div class="card">
          ${campo ? '' : `<div class="mini-court">${COURT_ORDER.map((n) => miniSlot(n)).join('')}</div>`}
          <div class="rot-bar">
            <button class="icon-btn" data-act="rot-back" aria-label="Rotar atrás">${icon('rotL')}</button>
            <div class="lbl">Rotación ${E.rotacionEfectiva(m)}${E.estadoColocador(m).ok ? '' : ` <span title="No se detecta un único colocador en pista: se mantiene la última rotación conocida">⚠️</span>`}<br><span style="font-weight:600">${L.serving === 'local' ? 'Sacamos nosotros' : 'Saca el rival'}</span></div>
            <button class="icon-btn" data-act="rot-fwd" aria-label="Rotar adelante">${icon('rotR')}</button>
          </div>
        </div>
        <div class="card">
          <div class="section-title" style="margin:0 0 10px">En directo · partido</div>
          <div class="grid-2" style="gap:8px">
            ${liveStat(st.pointsFor, 'Puntos', 'var(--good)')}
            ${liveStat(ownErrors(st), 'Errores propios', 'var(--bad-ink)')}
            ${liveStat(eff(st.tot.ataque.win - st.tot.ataque.err - st.tot.ataque.blocked, st.tot.ataque.t), 'Efic. ataque', 'var(--accent-2)')}
            ${liveStat(pct(st.so.won, st.so.total), 'Side-out', 'var(--accent-2)')}
          </div>
        </div>
        <div class="card">
          <div class="team-actions">
            <button class="btn danger" data-act="rival-point">Punto rival<small class="muted">ace / ataque</small></button>
            <button class="btn t-good" data-act="rival-error">Error rival<small class="muted">punto para nosotros</small></button>
            <button class="btn wide t-warn" data-act="team-error">${icon('alert', 20)} Error general del equipo</button>
            <button class="btn wide t-neutral" data-act="timeout">⏱️ Tiempo muerto</button>
          </div>
        </div>
        <div class="card">
          <div class="section-title" style="margin:0 0 10px">Últimas acciones</div>
          <div class="hist">${last.length ? last.map(histRow).join('') : '<span class="muted" style="font-size:13px">Aún no hay acciones.</span>'}</div>
        </div>
      </aside>
    </main>
  </div>`;
}

const ownErrors = (st) => { const a = st.team.against; return a.ataque + a.bloqueado + a.saque + a.rece + a.defensa + a.bloqueo + a.general; };
const liveStat = (v, l, c) => `<div style="background:var(--sunken);border-radius:var(--r-sm);padding:10px 12px"><div class="num" style="font-size:26px;font-weight:var(--fw-black);color:${c};line-height:1.1">${v}</div><div class="muted" style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">${l}</div></div>`;

// El chip de cada acción muestra dos números en vez del total: aciertos (verde) y fallos (rojo).
function chipHtml(skill, s) {
  const buenas = s.win + s.good;
  const malas = s.err + s.blocked;
  const badge = (buenas || malas) ? `<span class="cnt-wrap"><span class="cnt-good num">${buenas}</span><span class="cnt-bad num">${malas}</span></span>` : '';
  return `<button class="chip" style="--c:${E.SKILLS[skill].color}" data-act="skill" data-skill="${skill}">${E.SKILLS[skill].label}${badge}</button>`;
}

function row(p, slot, r) {
  const lib = p.pos === 'L';
  const isOpen = open?.pid === p.id;
  const sk = isOpen ? E.SKILLS[open.skill] : null;
  const results = isOpen ? E.resultsFor(m, open.skill) : null;
  return `<div class="prow card" data-pid="${p.id}">
    <div class="pinfo">
      <div class="dot ${lib ? 'lib' : ''}">${p.dorsal}</div>
      <div style="min-width:0"><div class="nm">${esc(p.name || 'Jugador')}</div>
        <div class="sub">${E.POS_SHORT[p.pos]} ${slot ? `<b>P${slot}</b>` : '<span>Banquillo</span>'}</div></div>
      <div class="mini"><b class="num">${r.pts}</b> pts<br><span class="e num">${r.err} err</span></div>
    </div>
    ${isOpen
      ? `<div class="results" style="--c:${sk.color}">
          <div class="tag">${sk.label}</div>
          ${results.map((x) => `<button class="res ${x.kind}" data-act="res" data-res="${x.id}">${x.label}</button>`).join('')}
          <button class="res close" data-act="close" aria-label="Cancelar">${icon('x', 20)}</button>
        </div>`
      : `<div class="chips">${E.SKILL_KEYS.map((k) => chipHtml(k, r[k])).join('')}</div>`}
  </div>`;
}

// ---------- vista de campo ----------
function campoHtml(byId) {
  const onCourt = new Set(Object.values(m.live.lineup));
  const liberos = m.roster.filter((p) => p.pos === 'L' && !onCourt.has(p.id)).sort((a, b) => Number(a.dorsal) - Number(b.dorsal));
  return `<section class="campo-live">
    <div class="campo-pista">${COURT_ORDER.map((n) => celdaCampo(n, byId)).join('')}</div>
    <div class="campo-liberos">
      <div class="section-title" style="margin:0">Líberos</div>
      ${liberos.length ? liberos.map((p) => tarjetaJugador(p, null, byId[p.id], SKILLS_LIBERO, true)).join('') : '<span class="muted" style="font-size:13px">Sin líberos fuera de pista.</span>'}
    </div>
  </section>`;
}

function celdaCampo(n, byId) {
  const p = E.playerById(m, m.live.lineup[n]);
  if (!p) return `<div class="campo-celda vacia"><small class="cp">P${n}</small>–</div>`;
  const sacando = n === 1 && m.live.serving === 'local';
  const skills = sacando ? ['saque', ...SKILLS_CAMPO] : SKILLS_CAMPO;
  return tarjetaJugador(p, n, byId[p.id], skills, false, sacando);
}

function tarjetaJugador(p, slot, r, skills, libero, sacando = false) {
  const isOpen = open?.pid === p.id;
  const sk = isOpen ? E.SKILLS[open.skill] : null;
  return `<div class="campo-celda card ${p.pos === 'L' ? 'lib' : ''} ${libero ? 'libero' : ''} ${sacando ? 'sacando' : ''}" data-pid="${p.id}">
    <div class="cc-head">
      <div class="dot ${p.pos === 'L' ? 'lib' : ''}">${p.dorsal}</div>
      <div style="min-width:0;flex:1"><div class="nm">${esc(p.name || 'Jugador')}</div>
        <div class="sub">${E.POS_SHORT[p.pos]}${slot ? ` · <b>P${slot}</b>` : ''}${sacando ? ` <span class="serve">${icon('ball', 14)}</span>` : ''}</div></div>
      <div class="mini"><b class="num">${r.pts}</b> pts<br><span class="e num">${r.err} err</span></div>
      ${slot && p.pos !== 'L' ? `<button class="icon-btn cc-sub" data-act="sub-slot" data-slot="${slot}" aria-label="Cambiar a ${esc(p.name || p.dorsal)}" title="Cambio">${icon('swap', 20)}</button>` : ''}
    </div>
    ${isOpen
      ? `<div class="cc-results" style="--c:${sk.color}">
          <div class="tag">${sk.label}</div>
          ${E.resultsFor(m, open.skill).map((x) => `<button class="res ${x.kind}" data-act="res" data-res="${x.id}">${x.label}</button>`).join('')}
          <button class="res close" data-act="close" aria-label="Cancelar">${icon('x', 20)}</button>
        </div>`
      : `<div class="cc-chips">${skills.map((k) => chipHtml(k, r[k])).join('')}</div>`}
  </div>`;
}

function miniSlot(n) {
  const p = E.playerById(m, m.live.lineup[n]);
  return `<div class="mc ${p?.pos === 'L' ? 'lib' : ''}"><small>P${n}</small>${n === 1 && m.live.serving === 'local' ? `<span class="ball">${icon('ball', 14)}</span>` : ''}${p ? `<span class="num">${p.dorsal}</span><span class="nn">${esc(p.name)}</span>` : '–'}</div>`;
}

function histRow(e) {
  const d = describeEvent(m, e);
  return `<div class="h"><span class="tone ${d.tone}"></span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${esc(d.who)}</b> <span class="muted">${esc(d.what)}</span></span>${e.sc ? `<span class="sc num">${e.sc.l}-${e.sc.r}</span>` : ''}</div>`;
}

// ---------- acciones ----------
async function afterChange(msg, tone) {
  saveMatch(m);
  draw();
  if (msg) toast(msg, tone);
  const w = E.setWinner(m);
  if (w) await askEndSet(w);
}

async function askEndSet(w) {
  const { l, r } = m.live.score;
  const ok = await confirmDlg({
    title: `Set ${m.live.set} para ${esc(w === 'local' ? m.team : m.rival)}`,
    msg: `Marcador ${l} – ${r}. ¿Cerramos el set?`, ok: 'Cerrar set', cancel: 'Seguir jugando'
  });
  if (ok) closeSet();
}

function closeSet() {
  const res = E.endSet(m);
  saveMatch(m);
  if (res === 'done') return finished();
  toast(`Set cerrado · ${E.matchResult(m)} en sets`, 'good');
  go('lineup', m.id);
}

function finished() {
  const won = E.matchResult(m);
  openSheet({
    title: null, center: true,
    html: `<div style="text-align:center;padding:14px 8px">
      <div class="logo" style="margin:0 auto 14px;width:72px;height:72px;border-radius:24px">${icon('trophy', 38)}</div>
      <h2 style="margin:0 0 4px;font-size:26px">Partido terminado</h2>
      <div class="num" style="font-size:54px;font-weight:900;margin:6px 0">${won}</div>
      <div class="muted">${esc(m.team)} vs ${esc(m.rival)}</div></div>`,
    foot: `<button class="btn" data-home>Inicio</button><button class="btn primary" data-rep>${icon('chart', 20)} Ver informe</button>`,
    onMount: (ov, api) => {
      ov.querySelector('[data-home]').onclick = () => { api.close(); go('home'); };
      ov.querySelector('[data-rep]').onclick = () => { api.close(); go('home'); openReport(m); };
    }
  });
}

function teamErrorSheet() {
  openSheet({
    title: 'Error general del equipo',
    html: `<p class="muted" style="margin:0 0 12px">Suma un punto al rival. ¿Qué ha pasado?</p><div class="grid-2">${E.GENERAL_ERRORS.map((g) => `<button class="btn" style="min-height:64px" data-g="${g}">${g}</button>`).join('')}</div>`,
    onMount: (ov, api) => {
      ov.addEventListener('click', (e) => {
        const g = e.target.closest('[data-g]')?.dataset.g;
        if (!g) return;
        api.close();
        E.recordTeamEvent(m, 'teamError', g);
        afterChange(`Error general · ${g}`, 'bad');
      });
    }
  });
}

function timeoutSheet() {
  openSheet({
    title: 'Tiempo muerto',
    html: `<p class="muted" style="margin:0 0 12px">No suma punto ni cambia el saque. ¿De qué equipo es?</p>
      <div class="grid-2">
        <button class="btn" style="min-height:64px" data-team="local">${esc(m.team)}</button>
        <button class="btn" style="min-height:64px" data-team="rival">${esc(m.rival)}</button>
      </div>`,
    onMount: (ov, api) => {
      ov.addEventListener('click', (e) => {
        const team = e.target.closest('[data-team]')?.dataset.team;
        if (!team) return;
        api.close();
        E.recordTimeout(m, team);
        afterChange(`Tiempo muerto · ${team === 'local' ? esc(m.team) : esc(m.rival)}`, 'neutral');
      });
    }
  });
}

// Cambio de jugador. Con slotFijo (botón de cambio de una tarjeta del campo) ya se sabe quién
// sale y solo se pide quién entra. Los líberos no aparecen en ninguna de las dos listas.
function subSheet(slotFijo = null) {
  const courtSlots = [1, 2, 3, 4, 5, 6];
  let out = slotFijo; let inn = null;
  const outPos = () => E.playerById(m, m.live.lineup[out])?.pos;
  const pl = (p) => `<div class="dot ${p.pos === 'L' ? 'lib' : ''}" style="width:38px;height:38px;font-size:16px">${p.dorsal}</div><div><b>${esc(p.name || 'Jugador')}</b><div class="muted" style="font-size:12px">${E.POS_SHORT[p.pos]}</div></div>`;
  const entra = () => {
    const bench = E.candidatosCambio(m, outPos());
    return `<div class="pick-list">${bench.length ? bench.map((p) => `<button class="pickable ${inn === p.id ? 'on' : ''}" data-in="${p.id}">${pl(p)}</button>`).join('') : '<p class="muted">No hay jugadores en el banquillo.</p>'}</div>`;
  };
  const body = () => slotFijo
    ? `<div class="section-title" style="margin-top:0">Entra</div>${entra()}`
    : `<div class="two-col">
    <div><div class="section-title" style="margin-top:0">Sale</div><div class="pick-list">${courtSlots.map((s) => { const p = E.playerById(m, m.live.lineup[s]); return p && p.pos !== 'L' ? `<button class="pickable ${out === s ? 'on' : ''}" data-out="${s}"><span class="pill">P${s}</span>${pl(p)}</button>` : ''; }).join('')}</div></div>
    <div><div class="section-title" style="margin-top:0">Entra</div>${entra()}</div>
  </div>`;
  const sale = slotFijo ? E.playerById(m, m.live.lineup[slotFijo]) : null;
  openSheet({
    title: sale ? `Cambio · sale ${sale.dorsal} ${esc(sale.name || '')} (P${slotFijo})` : 'Cambio de jugador', html: body(),
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" data-ok disabled>Confirmar cambio</button>',
    onMount: (ov, api) => {
      const refresh = () => { api.setBody(body()); ov.querySelector('[data-ok]').disabled = !(out && inn); };
      ov.addEventListener('click', (e) => {
        const o = e.target.closest('[data-out]'); const i = e.target.closest('[data-in]');
        if (o) { out = Number(o.dataset.out); refresh(); }
        else if (i) { inn = i.dataset.in; refresh(); }
        else if (e.target.closest('[data-ok]')) {
          const { ambiguo, n } = E.substitute(m, out, inn);
          api.close();
          saveMatch(m); draw();
          if (ambiguo) {
            toast(`Cambio en P${out}. ⚠️ No se detecta la rotación (${n} colocadores en pista): se mantiene R${E.rotacionEfectiva(m)}.`, 'bad');
          } else {
            toast(`Cambio en P${out}`, 'good');
          }
        }
      });
    }
  });
}

function menuSheet() {
  openSheet({
    title: 'Partido',
    html: `<div class="menu-list">
      <button class="btn" data-m="modo">${icon('flag', 22)} Modo de registro: ${m.modo === 'simple' ? 'Simple → cambiar a Complejo' : 'Complejo → cambiar a Simple'}</button>
      <button class="btn" data-m="serve">${icon('ball', 22)} Cambiar quién saca</button>
      <button class="btn" data-m="endset">${icon('flag', 22)} Terminar el set ahora</button>
      <button class="btn" data-m="export">${icon('download', 22)} Exportar partido</button>
      <button class="btn" data-m="home">${icon('home', 22)} Salir al inicio</button>
    </div>`,
    onMount: (ov, api) => {
      ov.addEventListener('click', async (e) => {
        const a = e.target.closest('[data-m]')?.dataset.m;
        if (!a) return;
        api.close();
        if (a === 'modo') {
          const nuevo = E.toggleModo(m);
          open = null;
          saveMatch(m);
          draw();
          toast(`Modo de registro: ${nuevo === 'simple' ? 'Simple' : 'Complejo'}`, 'good');
        }
        if (a === 'serve') { E.toggleServe(m); saveMatch(m); draw(); }
        if (a === 'home') go('home');
        if (a === 'endset' && await confirmDlg({ title: `Terminar el set ${m.live.set}`, msg: `Marcador ${m.live.score.l} – ${m.live.score.r}.`, ok: 'Terminar set' })) closeSet();
        if (a === 'export') {
          const name = `partido_${m.team}_vs_${m.rival}_${m.date}.json`.replace(/[^\w.-]+/g, '_');
          try { await saveFile(name, JSON.stringify(exportPayload(m), null, 2)); toast('Partido exportado', 'good'); } catch (err) { toast('No se pudo exportar', 'bad'); }
        }
      });
    }
  });
}

async function onClick(e) {
  if (suppress) { suppress = false; return; }
  const sc = e.target.closest('[data-score]');
  if (sc) {
    E.manualPoint(m, sc.dataset.score);
    return afterChange(`Punto para ${sc.dataset.score === 'local' ? m.team : m.rival}`, sc.dataset.score === 'local' ? 'good' : 'bad');
  }
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  const pid = t.closest('[data-pid]')?.dataset.pid;

  if (act === 'home') return go('home');
  if (act === 'vista') { setVistaLive(getVistaLive() === 'campo' ? 'filas' : 'campo'); open = null; return draw(); }
  if (act === 'skill') { open = { pid, skill: t.dataset.skill }; return draw(); }
  if (act === 'close') { open = null; return draw(); }
  if (act === 'res') {
    const { skill } = open;
    const ev = E.recordSkill(m, pid, skill, t.dataset.res);
    open = null;
    const d = describeEvent(m, ev);
    return afterChange(`${esc(d.who)} · ${esc(d.what)}`, d.tone);
  }
  if (act === 'rival-point') { E.recordTeamEvent(m, 'rivalPoint'); return afterChange('Punto del rival', 'bad'); }
  if (act === 'rival-error') { E.recordTeamEvent(m, 'rivalError'); return afterChange('Error del rival · punto nuestro', 'good'); }
  if (act === 'team-error') return teamErrorSheet();
  if (act === 'timeout') return timeoutSheet();
  if (act === 'rot-fwd' || act === 'rot-back') { E.rotate(m, act === 'rot-fwd' ? 1 : -1); saveMatch(m); return draw(); }
  if (act === 'sub') return subSheet();
  if (act === 'sub-slot') return subSheet(Number(t.dataset.slot));
  if (act === 'report') return openReport(m);
  if (act === 'menu') return menuSheet();
  if (act === 'undo') {
    if (!E.undo(m)) return;
    open = null;
    saveMatch(m);
    if (m.status === 'lineup') return go('lineup', m.id);
    draw();
    toast('Acción deshecha');
  }
}

// Pulsación larga sobre el marcador: resta un punto (corrección).
function onDown(e) {
  const sc = e.target.closest('[data-score]');
  if (!sc) return;
  clearTimeout(lpTimer);
  lpTimer = setTimeout(() => {
    suppress = true;
    if (E.adjustScore(m, sc.dataset.score, -1)) { saveMatch(m); draw(); toast('Marcador corregido (-1)'); }
  }, 600);
}
function onUp() {
  clearTimeout(lpTimer);
  if (suppress) setTimeout(() => { suppress = false; }, 350);
}

register('live', (r, nav) => {
  root = r;
  m = getMatch(nav.id);
  open = null;
  draw();
  root.onclick = onClick;
  root.onpointerdown = onDown;
  root.onpointerup = onUp;
  root.onpointercancel = onUp;
  root.onpointerleave = onUp;
});
