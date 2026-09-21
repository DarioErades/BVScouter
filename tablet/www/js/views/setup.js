import { register, go } from '../nav.js';
import { getPrefs, setPrefs, saveMatch } from '../store.js';
import { newMatch, uid, POS } from '../engine.js';
import { icon, esc, toast } from '../ui.js';

let draft;

const blank = () => ({ id: uid(), dorsal: '', name: '', pos: 'OH' });

function initDraft() {
  const prefs = getPrefs();
  const roster = prefs.roster.length ? prefs.roster.map((p) => ({ ...p, id: uid() })) : Array.from({ length: 12 }, blank);
  draft = { team: prefs.team || '', rival: '', date: new Date().toISOString().slice(0, 10), bestOf: 5, roster };
}

function rosterRow(p) {
  return `<div class="roster-row" data-id="${p.id}">
    <input class="input num" data-f="dorsal" type="number" inputmode="numeric" min="0" max="99" placeholder="Nº" value="${esc(p.dorsal)}">
    <input class="input" data-f="name" placeholder="Nombre" value="${esc(p.name)}">
    <select class="input" data-f="pos">${Object.entries(POS).map(([k, v]) => `<option value="${k}" ${p.pos === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <button class="icon-btn" data-act="rm" aria-label="Quitar">${icon('trash', 20)}</button>
  </div>`;
}

function mount(root) {
  if (!draft) initDraft();
  root.innerHTML = `<div class="screen">
    <div class="screen-head">
      <button class="icon-btn" data-act="back" aria-label="Volver">${icon('back')}</button>
      <h1>Nuevo partido</h1><span class="spacer"></span>
      <button class="btn primary big" data-act="create">Elegir alineación ${icon('back', 20).replace('<svg', '<svg style="transform:scaleX(-1)"')}</button>
    </div>
    <div class="screen-body">
      <div class="form-grid">
        <div class="field"><label>Mi equipo</label><input class="input" id="f-team" placeholder="Nombre del equipo" value="${esc(draft.team)}"></div>
        <div class="field"><label>Rival</label><input class="input" id="f-rival" placeholder="Nombre del rival" value="${esc(draft.rival)}"></div>
        <div class="field"><label>Fecha</label><input class="input" id="f-date" type="date" value="${draft.date}"></div>
        <div class="field"><label>Formato</label>
          <div class="seg" id="f-best"><button data-best="3" class="${draft.bestOf === 3 ? 'on' : ''}">Mejor de 3</button><button data-best="5" class="${draft.bestOf === 5 ? 'on' : ''}">Mejor de 5</button></div>
        </div>
      </div>
      <div class="section-title">${icon('users', 18)} Plantilla <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:600">· se recuerda para el próximo partido</span></div>
      <div class="roster" id="roster">${draft.roster.map(rosterRow).join('')}</div>
      <button class="btn" data-act="add" style="margin-top:12px">${icon('plus', 20)} Añadir jugador</button>
    </div>
  </div>`;

  root.oninput = (e) => {
    const t = e.target;
    if (t.id === 'f-team') draft.team = t.value;
    else if (t.id === 'f-rival') draft.rival = t.value;
    else if (t.id === 'f-date') draft.date = t.value;
    else if (t.dataset.f) {
      const p = draft.roster.find((x) => x.id === t.closest('[data-id]').dataset.id);
      if (p) p[t.dataset.f] = t.value;
    }
  };
  root.onchange = root.oninput;

  root.onclick = (e) => {
    const b = e.target.closest('[data-best]');
    if (b) { draft.bestOf = Number(b.dataset.best); return mount(root); }
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act === 'back') { draft = null; return go('home'); }
    if (t.dataset.act === 'add') { draft.roster.push(blank()); mount(root); root.querySelector('.screen-body').scrollTo(0, 99999); return; }
    if (t.dataset.act === 'rm') {
      draft.roster = draft.roster.filter((x) => x.id !== t.closest('[data-id]').dataset.id);
      return mount(root);
    }
    if (t.dataset.act === 'create') crear();
  };
}

function crear() {
  const roster = draft.roster.filter((p) => String(p.dorsal).trim() !== '').map((p) => ({ ...p, dorsal: Number(p.dorsal), name: p.name.trim() }));
  const dorsales = roster.map((p) => p.dorsal);
  if (roster.length < 6) return toast('Necesitas al menos 6 jugadores con dorsal', 'bad');
  if (new Set(dorsales).size !== dorsales.length) return toast('Hay dorsales repetidos', 'bad');
  if (!roster.some((p) => p.pos !== 'L')) return toast('Falta algún jugador de campo', 'bad');
  const m = newMatch({ team: draft.team.trim(), rival: draft.rival.trim(), date: draft.date, bestOf: draft.bestOf, roster });
  setPrefs(m.team, roster);
  saveMatch(m);
  draft = null;
  go('lineup', m.id);
}

register('setup', (root) => { draft = null; mount(root); });
