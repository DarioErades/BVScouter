import { register, go } from '../nav.js';
import { getMatch, saveMatch } from '../store.js';
import { startSet, POS_SHORT, contarColocadores, rotateLineup } from '../engine.js';
import { icon, esc, openSheet, toast } from '../ui.js';

let m, lineup, serving, root;

// Filas del campo mirando a la red: delantera arriba, zaguera abajo.
const ORDEN = [4, 3, 2, 5, 6, 1];

function initState() {
  const prev = m.setsPlayed[m.setsPlayed.length - 1];
  lineup = prev?.startLineup ? { ...prev.startLineup } : {};
  // Saca primero quien no sacó el set anterior; en el set decisivo hay sorteo.
  serving = prev && m.live.set < m.bestOf ? (prev.firstServe === 'local' ? 'rival' : 'local') : null;
}

const slotHtml = (n) => {
  const p = m.roster.find((x) => x.id === lineup[n]);
  return `<button class="slot ${p ? 'filled' : ''} ${p?.pos === 'L' ? 'libero' : ''}" data-slot="${n}">
    <span class="sp">P${n}</span>
    ${n === 1 ? `<span class="ball">${icon('ball', 18)}</span>` : ''}
    ${p ? `<span class="sn num">${p.dorsal}</span><span class="sname">${esc(p.name || POS_SHORT[p.pos])}</span>` : `<span style="opacity:.6">${icon('plus', 26)}</span>`}
  </button>`;
};

// La rotación es la posición del colocador; solo se puede saber si hay uno único colocado.
function rotacionLabel() {
  const cols = Object.entries(lineup).filter(([, id]) => m.roster.find((p) => p.id === id)?.pos === 'S');
  return cols.length === 1 ? `Rotación ${cols[0][0]}` : 'Rotación –';
}

// + sube el número de rotación (el colocador pasa de P1 a P2…) y − lo baja; al girar al revés
// que en un side-out, el número que se ve cambia en el mismo sentido que el botón.
function rotar(dir) {
  const n = rotateLineup(lineup, dir);
  lineup = Object.fromEntries(Object.entries(n).filter(([, id]) => id));
  draw();
}

function draw() {
  const placed = new Set(Object.values(lineup));
  const ready = Object.keys(lineup).length === 6 && serving;
  root.innerHTML = `<div class="screen">
    <div class="screen-head">
      <button class="icon-btn" data-act="home" aria-label="Inicio">${icon('home')}</button>
      <div><h1>Set ${m.live.set} · Alineación inicial</h1><div class="muted">${esc(m.team)} vs ${esc(m.rival)}</div></div>
      <span class="spacer"></span>
      <button class="btn primary big" data-act="start" ${ready ? '' : 'disabled'}>${icon('play', 22)} Empezar set</button>
    </div>
    <div class="screen-body">
      <div class="lineup-wrap">
        <div>
          <div class="court"><div class="court-grid">${ORDEN.map(slotHtml).join('')}</div></div>
          <div class="rot-bar card" style="padding:10px 12px">
            <button class="icon-btn" data-act="rot-back" aria-label="Rotación anterior" ${Object.keys(lineup).length ? '' : 'disabled'}>${icon('minus')}</button>
            <div class="lbl" style="font-size:15px">${rotacionLabel()}<br><span style="font-weight:600;font-size:12px">Gira a todos los jugadores de posición</span></div>
            <button class="icon-btn" data-act="rot-fwd" aria-label="Rotación siguiente" ${Object.keys(lineup).length ? '' : 'disabled'}>${icon('plus')}</button>
          </div>
          <p class="muted" style="margin:12px 4px 0">Toca cada posición para elegir jugador. La posición 1 (abajo a la derecha) es la del saque.</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="card" style="padding:16px">
            <div class="section-title" style="margin-top:0">${icon('ball', 18)} Saque inicial</div>
            <div class="seg" style="width:100%"><button style="flex:1" data-serve="local" class="${serving === 'local' ? 'on' : ''}">Sacamos nosotros</button><button style="flex:1" data-serve="rival" class="${serving === 'rival' ? 'on' : ''}">Saca el rival</button></div>
          </div>
          <div class="card" style="padding:16px">
            <div class="section-title" style="margin-top:0">${icon('users', 18)} Plantilla</div>
            <div class="pick-list">${m.roster.map((p) => `<div class="player-chip ${placed.has(p.id) ? 'used' : ''}"><div class="dot ${p.pos === 'L' ? 'lib' : ''}">${p.dorsal}</div><div><b>${esc(p.name || 'Jugador')}</b><div class="muted" style="font-size:12px">${POS_SHORT[p.pos]}</div></div></div>`).join('')}</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function pick(slot) {
  const placed = new Set(Object.values(lineup));
  const libres = m.roster.filter((p) => !placed.has(p.id));
  openSheet({
    title: `Posición ${slot}`,
    html: `<div class="pick-list">
      ${lineup[slot] ? `<button class="btn danger" data-clear>${icon('trash', 18)} Dejar vacía</button>` : ''}
      ${libres.map((p) => `<button class="player-chip" data-pid="${p.id}"><div class="dot ${p.pos === 'L' ? 'lib' : ''}">${p.dorsal}</div><div><b>${esc(p.name || 'Jugador')}</b><div class="muted" style="font-size:12px">${POS_SHORT[p.pos]}</div></div></button>`).join('') || '<p class="muted">No quedan jugadores libres.</p>'}
    </div>`,
    onMount: (ov, api) => {
      ov.addEventListener('click', (e) => {
        const c = e.target.closest('[data-pid],[data-clear]');
        if (!c) return;
        if (c.dataset.pid) lineup[slot] = c.dataset.pid; else delete lineup[slot];
        api.close();
        draw();
      });
    }
  });
}

// Si no hay un único colocador entre los titulares no se puede detectar sola la rotación: se
// pregunta antes de empezar el set y se anota desde ahí.
function preguntarRotacionInicial(n) {
  return new Promise((resolve) => {
    openSheet({
      title: '¿En qué rotación estáis?',
      html: `<p class="muted" style="margin:0 0 12px">
        ${n === 0 ? 'No hay ningún colocador entre los titulares' : `Hay ${n} colocadores entre los titulares`}:
        no se puede detectar la rotación sola. Dinos en qué rotación empezáis.</p>
        <div class="grid-2">${[1, 2, 3, 4, 5, 6].map((r) => `<button class="btn" style="min-height:60px" data-rot="${r}">Rotación ${r}</button>`).join('')}</div>`,
      onMount: (ov, api) => {
        ov.addEventListener('click', (e) => {
          const r = e.target.closest('[data-rot]')?.dataset.rot;
          if (!r) return;
          // Resolvemos antes de cerrar: api.close() también dispara onClose (resolve(null)) y,
          // como una promesa solo atiende a la primera resolución, tenía que ganar esta.
          resolve(Number(r));
          api.close();
        });
      },
      onClose: () => resolve(null)
    });
  });
}

async function empezar() {
  const n = contarColocadores(m, lineup);
  let rotacionManual;
  if (n !== 1) {
    rotacionManual = await preguntarRotacionInicial(n);
    if (rotacionManual == null) return; // canceló, no arrancamos el set
  }
  startSet(m, lineup, serving, rotacionManual);
  saveMatch(m);
  toast(`Set ${m.live.set} en marcha`, 'good');
  go('live', m.id);
}

register('lineup', (r, nav) => {
  root = r;
  m = getMatch(nav.id);
  initState();
  draw();
  root.onclick = (e) => {
    const s = e.target.closest('[data-slot]');
    if (s) return pick(Number(s.dataset.slot));
    const sv = e.target.closest('[data-serve]');
    if (sv) { serving = sv.dataset.serve; return draw(); }
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'home') return go('home');
    if (a === 'start') return empezar();
    if (a === 'rot-fwd' || a === 'rot-back') return rotar(a === 'rot-fwd' ? -1 : 1);
  };
});
