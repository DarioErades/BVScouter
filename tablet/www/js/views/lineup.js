import { register, go } from '../nav.js';
import { getMatch, saveMatch } from '../store.js';
import { startSet, POS_SHORT } from '../engine.js';
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
    if (a === 'start') {
      startSet(m, lineup, serving);
      saveMatch(m);
      toast(`Set ${m.live.set} en marcha`, 'good');
      go('live', m.id);
    }
  };
});
