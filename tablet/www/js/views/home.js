import { register, go } from '../nav.js';
import { listMatches, deleteMatch, saveMatch } from '../store.js';
import { icon, esc, fmtDate, confirmDlg, toast, saveFile } from '../ui.js';
import { matchResult } from '../engine.js';
import { exportPayload, setScores } from '../stats.js';
import { openReport } from './report.js';
import { uid } from '../engine.js';

function card(m) {
  const done = m.status === 'done';
  const scores = setScores(m).filter((s) => s.done).map((s) => `${s.l}-${s.r}`).join('  ·  ');
  return `<article class="card match-card" data-id="${m.id}">
    <div class="row">
      <span class="pill ${done ? 'good' : 'warn'}">${done ? 'Terminado' : 'En juego'}</span>
      <span class="muted" style="font-size:13px">${fmtDate(m.date)} · al mejor de ${m.bestOf}</span>
      <span class="spacer"></span>
      <button class="icon-btn" data-act="del" aria-label="Borrar">${icon('trash', 20)}</button>
    </div>
    <div class="vs">${esc(m.team)} <span class="muted">vs</span> ${esc(m.rival)}</div>
    <div class="row">
      <div class="res num">${matchResult(m)}</div>
      <div class="muted num" style="font-size:14px;line-height:1.4">${scores || 'Sin sets cerrados'}</div>
    </div>
    <div class="row">
      ${done
        ? `<button class="btn primary" data-act="report" style="flex:1">${icon('chart', 20)} Informe</button>`
        : `<button class="btn primary" data-act="resume" style="flex:1">${icon('play', 20)} Continuar</button>
           <button class="btn" data-act="report">${icon('chart', 20)}</button>`}
      <button class="btn" data-act="export">${icon('download', 20)}</button>
    </div>
  </article>`;
}

function mount(root) {
  const matches = listMatches();
  root.innerHTML = `<div class="screen">
    <div class="hero">
      <div class="logo">${icon('ball', 28)}</div>
      <div><h1>VolleyStats <span class="muted" style="font-weight:600">Tablet</span></h1><p>Estadísticas de partido en tiempo real</p></div>
      <span class="spacer"></span>
      <label class="btn" style="cursor:pointer">${icon('upload', 20)} Importar<input type="file" id="imp" accept=".json,application/json" hidden></label>
      <button class="btn primary big" data-act="new">${icon('plus', 22)} Nuevo partido</button>
    </div>
    <div class="screen-body">
      ${matches.length
        ? `<div class="section-title">Partidos</div><div class="match-grid">${matches.map(card).join('')}</div>`
        : `<div class="empty"><div class="logo">${icon('ball', 44)}</div><h2 style="color:var(--text);margin:0 0 6px">Todavía no hay partidos</h2><p>Crea tu primer partido, elige la alineación y empieza a apuntar. Todo se guarda solo en la tablet.</p></div>`}
    </div>
  </div>`;

  root.onclick = async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const id = t.closest('[data-id]')?.dataset.id;
    const m = matches.find((x) => x.id === id);
    if (t.dataset.act === 'new') return go('setup');
    if (!m) return;
    if (t.dataset.act === 'resume') return go(m.status === 'lineup' ? 'lineup' : 'live', m.id);
    if (t.dataset.act === 'report') return openReport(m);
    if (t.dataset.act === 'export') {
      const name = `partido_${m.team}_vs_${m.rival}_${m.date}.json`.replace(/[^\w.-]+/g, '_');
      try { await saveFile(name, JSON.stringify(exportPayload(m), null, 2)); toast('Partido exportado', 'good'); } catch (err) { toast('No se pudo exportar', 'bad'); }
    }
    if (t.dataset.act === 'del' && await confirmDlg({ title: 'Borrar partido', msg: `Se borrará ${esc(m.team)} vs ${esc(m.rival)} y todas sus estadísticas.`, ok: 'Borrar', danger: true })) {
      deleteMatch(m.id);
      mount(root);
    }
  };

  root.querySelector('#imp')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.tabletMatch) throw new Error('formato');
      const m = { ...data.tabletMatch, id: uid(), createdAt: Date.now(), undo: [] };
      saveMatch(m);
      toast('Partido importado', 'good');
      mount(root);
    } catch (err) {
      toast('Ese archivo no es un partido de VolleyStats Tablet', 'bad');
    }
  });
}

register('home', mount);
