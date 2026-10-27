import { register, go } from '../nav.js';
import { listTeams, saveTeam, deleteTeam } from '../store.js';
import { icon, esc, confirmDlg, toast, saveFile } from '../ui.js';
import { uid, POS } from '../engine.js';

let editando = null; // null = lista de equipos; objeto = editor de plantilla
let origen = 'home'; // pantalla a la que vuelve "Volver": 'home' o 'setup'

const blank = () => ({ id: uid(), dorsal: '', name: '', pos: 'OH' });

function rosterRow(p) {
  return `<div class="roster-row" data-id="${p.id}">
    <input class="input num" data-f="dorsal" type="number" inputmode="numeric" min="0" max="99" placeholder="Nº" value="${esc(p.dorsal)}">
    <input class="input" data-f="name" placeholder="Nombre" value="${esc(p.name)}">
    <select class="input" data-f="pos">${Object.entries(POS).map(([k, v]) => `<option value="${k}" ${p.pos === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <button class="icon-btn" data-act="rm" aria-label="Quitar">${icon('trash', 20)}</button>
  </div>`;
}

function vistaLista(root) {
  const teams = listTeams();
  root.innerHTML = `<div class="screen">
    <div class="screen-head">
      <button class="icon-btn" data-act="back" aria-label="Volver">${icon('back')}</button>
      <h1>Equipos</h1><span class="spacer"></span>
      <label class="btn" style="cursor:pointer">${icon('upload', 20)} Importar<input type="file" id="imp-equipo" accept=".json,application/json" hidden></label>
      <button class="btn primary big" data-act="nuevo">${icon('plus', 22)} Nuevo equipo</button>
    </div>
    <div class="screen-body">
      ${teams.length
        ? `<div class="match-grid">${teams.map((t) => `<article class="card match-card" data-id="${t.id}">
            <div class="vs">${esc(t.name)}</div>
            <p class="muted" style="margin:0">${t.roster.length} jugador${t.roster.length === 1 ? '' : 'es'}</p>
            <div class="row">
              <button class="btn primary" data-act="editar" style="flex:1">${icon('users', 20)} Editar plantilla</button>
              <button class="icon-btn" data-act="exportar" aria-label="Exportar">${icon('download', 20)}</button>
              <button class="icon-btn" data-act="borrar" aria-label="Borrar">${icon('trash', 20)}</button>
            </div>
          </article>`).join('')}</div>`
        : `<div class="empty"><div class="logo">${icon('users', 44)}</div><h2 style="color:var(--text);margin:0 0 6px">Todavía no tienes equipos</h2><p>Crea uno con su plantilla y podrás elegirlo directamente al crear cada partido, sin volver a escribirla.</p></div>`}
    </div>
  </div>`;

  root.onclick = async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act === 'back') return origen === 'setup' ? go('setup', 'volver') : go('home');
    if (t.dataset.act === 'nuevo') { editando = { id: uid(), name: '', roster: Array.from({ length: 12 }, blank) }; return mount(root); }
    const id = t.closest('[data-id]')?.dataset.id;
    const team = teams.find((x) => x.id === id);
    if (!team) return;
    if (t.dataset.act === 'editar') { editando = { id: team.id, name: team.name, roster: team.roster.map((p) => ({ ...p, id: uid() })) }; return mount(root); }
    if (t.dataset.act === 'exportar') {
      const payload = { format: 'volleystats-roster', version: 1, exportedAt: new Date().toISOString(), team: team.name, teamUid: team.id, roster: team.roster };
      const nombre = `plantilla_${team.name}.json`.replace(/[^\w.-]+/g, '_');
      try { await saveFile(nombre, JSON.stringify(payload, null, 2)); toast('Equipo exportado', 'good'); } catch (err) { toast('No se pudo exportar', 'bad'); }
    }
    if (t.dataset.act === 'borrar' && await confirmDlg({ title: 'Borrar equipo', msg: `Se borrará ${esc(team.name)} y su plantilla guardada. Los partidos ya creados no se ven afectados.`, ok: 'Borrar', danger: true })) {
      deleteTeam(id);
      mount(root);
    }
  };

  root.querySelector('#imp-equipo')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.format !== 'volleystats-roster' || !Array.isArray(data.roster)) throw new Error('formato');
      const t = saveTeam({ id: data.teamUid, name: data.team || 'Equipo importado', roster: data.roster });
      toast(`Equipo ${t.name} importado`, 'good');
      mount(root);
    } catch (err) {
      toast('Ese archivo no es una plantilla de VolleyStats', 'bad');
    }
  });
}

function vistaEditor(root) {
  root.innerHTML = `<div class="screen">
    <div class="screen-head">
      <button class="icon-btn" data-act="cancelar" aria-label="Volver">${icon('back')}</button>
      <h1>${editando.name ? 'Editar equipo' : 'Nuevo equipo'}</h1><span class="spacer"></span>
      <button class="btn primary big" data-act="guardar">${icon('check', 20)} Guardar equipo</button>
    </div>
    <div class="screen-body">
      <div class="field"><label>Nombre del equipo</label><input class="input" id="f-name" placeholder="Nombre del equipo" value="${esc(editando.name)}"></div>
      <div class="section-title">${icon('users', 18)} Plantilla</div>
      <div class="roster" id="roster">${editando.roster.map(rosterRow).join('')}</div>
      <button class="btn" data-act="add" style="margin-top:12px">${icon('plus', 20)} Añadir jugador</button>
    </div>
  </div>`;

  root.oninput = (e) => {
    const t = e.target;
    if (t.id === 'f-name') editando.name = t.value;
    else if (t.dataset.f) {
      const p = editando.roster.find((x) => x.id === t.closest('[data-id]').dataset.id);
      if (p) p[t.dataset.f] = t.value;
    }
  };
  root.onchange = root.oninput;

  root.onclick = (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act === 'cancelar') { editando = null; return mount(root); }
    if (t.dataset.act === 'add') { editando.roster.push(blank()); mount(root); root.querySelector('.screen-body').scrollTo(0, 99999); return; }
    if (t.dataset.act === 'rm') { editando.roster = editando.roster.filter((x) => x.id !== t.closest('[data-id]').dataset.id); return mount(root); }
    if (t.dataset.act === 'guardar') guardar(root);
  };
}

function guardar(root) {
  const name = editando.name.trim();
  if (!name) return toast('Ponle un nombre al equipo', 'bad');
  const roster = editando.roster.filter((p) => String(p.dorsal).trim() !== '').map((p) => ({ ...p, dorsal: Number(p.dorsal), name: p.name.trim() }));
  const dorsales = roster.map((p) => p.dorsal);
  if (new Set(dorsales).size !== dorsales.length) return toast('Hay dorsales repetidos', 'bad');
  saveTeam({ id: editando.id, name, roster });
  editando = null;
  toast('Equipo guardado', 'good');
  mount(root);
}

function mount(root) {
  editando ? vistaEditor(root) : vistaLista(root);
}

register('equipos', (root, nav) => { editando = null; origen = nav.id === 'setup' ? 'setup' : 'home'; mount(root); });
