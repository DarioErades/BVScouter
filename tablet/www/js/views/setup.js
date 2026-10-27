import { register, go } from '../nav.js';
import { listTeams, getUltimoModo, setUltimoModo, getUltimoEquipoId, setUltimoEquipo, saveMatch } from '../store.js';
import { newMatch, uid, POS } from '../engine.js';
import { icon, esc, toast } from '../ui.js';

let draft;

const blank = () => ({ id: uid(), dorsal: '', name: '', pos: 'OH' });

function elegirEquipo(team) {
  draft.teamId = team.id;
  draft.team = team.name;
  draft.roster = team.roster.map((p) => ({ ...p, id: uid() }));
}

function initDraft() {
  draft = { teamId: '', team: '', rival: '', date: new Date().toISOString().slice(0, 10), bestOf: 5, modo: getUltimoModo(), roster: [] };
  const teams = listTeams();
  const ultimo = teams.find((t) => t.id === getUltimoEquipoId()) || teams[0];
  if (ultimo) elegirEquipo(ultimo);
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
  const teams = listTeams();
  root.innerHTML = `<div class="screen">
    <div class="screen-head">
      <button class="icon-btn" data-act="back" aria-label="Volver">${icon('back')}</button>
      <h1>Nuevo partido</h1><span class="spacer"></span>
      <button class="btn primary big" data-act="create">Elegir alineación ${icon('back', 20).replace('<svg', '<svg style="transform:scaleX(-1)"')}</button>
    </div>
    <div class="screen-body">
      <div class="field">
        <label>Mi equipo</label>
        ${teams.length
          ? `<div class="seg" id="f-team-pick">${teams.map((t) => `<button data-team="${t.id}" class="${draft.teamId === t.id ? 'on' : ''}">${esc(t.name)}</button>`).join('')}</div>`
          : `<p class="muted" style="margin:0">Todavía no tienes equipos guardados.</p>`}
        <button class="btn" data-act="equipos" style="margin-top:8px">${icon('users', 18)} ${teams.length ? 'Gestionar equipos' : 'Crear equipo'}</button>
      </div>
      <div class="form-grid">
        <div class="field"><label>Rival</label><input class="input" id="f-rival" placeholder="Nombre del rival" value="${esc(draft.rival)}"></div>
        <div class="field"><label>Fecha</label><input class="input" id="f-date" type="date" value="${draft.date}"></div>
        <div class="field"><label>Formato</label>
          <div class="seg" id="f-best"><button data-best="3" class="${draft.bestOf === 3 ? 'on' : ''}">Mejor de 3</button><button data-best="5" class="${draft.bestOf === 5 ? 'on' : ''}">Mejor de 5</button></div>
        </div>
        <div class="field">
          <label>Modo de registro</label>
          <div class="seg" id="f-modo"><button data-modo="complejo" class="${draft.modo === 'complejo' ? 'on' : ''}">Complejo</button><button data-modo="simple" class="${draft.modo === 'simple' ? 'on' : ''}">Simple</button></div>
        </div>
      </div>
      <p class="muted" style="margin:-6px 0 20px; font-size:13px;">
        ${draft.modo === 'simple'
          ? 'Simple: solo tocas la acción que termina cada punto y eliges Acierto o Fallo. Más rápido, estadísticas básicas.'
          : 'Complejo: cada acción con su calidad (Punto, Positiva, Negativa, Pobre, Bloqueado, Error…), igual que en el ordenador. Estadísticas completas.'}
      </p>
      <div class="section-title">${icon('users', 18)} Plantilla <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:600">· solo para este partido, no cambia el equipo guardado</span></div>
      <div class="roster" id="roster">${draft.roster.map(rosterRow).join('')}</div>
      <button class="btn" data-act="add" style="margin-top:12px">${icon('plus', 20)} Añadir jugador</button>
    </div>
  </div>`;

  root.oninput = (e) => {
    const t = e.target;
    if (t.id === 'f-rival') draft.rival = t.value;
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
    const mo = e.target.closest('[data-modo]');
    if (mo) { draft.modo = mo.dataset.modo; return mount(root); }
    const eq = e.target.closest('[data-team]');
    if (eq) { elegirEquipo(teams.find((x) => x.id === eq.dataset.team)); return mount(root); }
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act === 'back') { draft = null; return go('home'); }
    if (t.dataset.act === 'equipos') return go('equipos', 'setup');
    if (t.dataset.act === 'add') { draft.roster.push(blank()); mount(root); root.querySelector('.screen-body').scrollTo(0, 99999); return; }
    if (t.dataset.act === 'rm') {
      draft.roster = draft.roster.filter((x) => x.id !== t.closest('[data-id]').dataset.id);
      return mount(root);
    }
    if (t.dataset.act === 'create') crear();
  };
}

function crear() {
  if (!draft.teamId) return toast('Elige o crea un equipo primero', 'bad');
  const roster = draft.roster.filter((p) => String(p.dorsal).trim() !== '').map((p) => ({ ...p, dorsal: Number(p.dorsal), name: p.name.trim() }));
  const dorsales = roster.map((p) => p.dorsal);
  if (roster.length < 6) return toast('Necesitas al menos 6 jugadores con dorsal', 'bad');
  if (new Set(dorsales).size !== dorsales.length) return toast('Hay dorsales repetidos', 'bad');
  if (!roster.some((p) => p.pos !== 'L')) return toast('Falta algún jugador de campo', 'bad');
  const m = newMatch({ team: draft.team.trim(), teamId: draft.teamId, rival: draft.rival.trim(), date: draft.date, bestOf: draft.bestOf, modo: draft.modo, roster });
  setUltimoEquipo(draft.teamId);
  setUltimoModo(m.modo);
  saveMatch(m);
  draft = null;
  go('lineup', m.id);
}

register('setup', (root, nav) => { if (nav.id !== 'volver') draft = null; mount(root); });
