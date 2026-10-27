import { register, go } from '../nav.js';
import { icon, esc, toast, saveFile } from '../ui.js';
import { listMatches, listTeams } from '../store.js';
import { exportTodo } from '../stats.js';
import { TEMAS, temaActual, aplicarTema } from '../tema.js';
import { suscribir, comprobarActualizacion, descargarEInstalar } from '../actualizador.js';

function textoFase(s) {
  if (s.fase === 'comprobando') return 'Buscando actualizaciones…';
  if (s.fase === 'al_dia') return 'Ya tienes la última versión.';
  if (s.fase === 'disponible') return `Hay una versión nueva disponible (${esc(s.versionName)}).`;
  if (s.fase === 'descargando') return `Descargando… ${s.porcentaje}%`;
  if (s.fase === 'error') return s.error;
  return 'Pulsa "Buscar actualización" para comprobar si hay una versión nueva.';
}

function temasHtml(actual) {
  return TEMAS.map((t) => `<button class="tema-opt${t.id === actual ? ' on' : ''}" data-act="tema" data-tema="${t.id}" aria-pressed="${t.id === actual}">
      <span class="tema-prev" style="background:${t.bg}">
        <span style="background:${t.surface}"></span><span style="background:${t.court}"></span><span style="background:${t.accent}"></span>
      </span>
      <span class="tema-txt"><b>${t.nombre}</b><small class="muted">${t.desc}</small></span>
      <span class="check">${t.id === actual ? icon('check', 16) : ''}</span>
    </button>`).join('');
}

function mount(root) {
  root.innerHTML = `<div class="screen">
    <div class="screen-head">
      <button class="icon-btn" data-act="back" aria-label="Volver">${icon('back')}</button>
      <h1>Ajustes</h1>
    </div>
    <div class="screen-body">
      <div class="section-title">Tema</div>
      <div class="tema-grid" id="temas">${temasHtml(temaActual())}</div>
      <div class="section-title" style="margin-top:24px">Datos</div>
      <div class="card" style="padding:4px 18px 18px">
        <p class="muted">Genera un solo archivo con todos los partidos y equipos de esta tablet para importarlo en la app de escritorio y sacar estadísticas conjuntas del equipo.</p>
        <p class="muted" id="exp-info"></p>
        <div class="row">
          <button class="btn primary" data-act="exportar-todo">${icon('download', 20)} Exportar todos los partidos</button>
        </div>
      </div>
      <div class="section-title" style="margin-top:24px">Actualizaciones</div>
      <div class="card" style="padding:4px 18px 18px">
        <p class="muted" id="act-info">Versión instalada: …</p>
        <p id="act-estado">${textoFase({ fase: 'inicial' })}</p>
        <p class="muted" id="act-notas" style="display:none"></p>
        <div class="row">
          <button class="btn primary" data-act="buscar">${icon('download', 20)} Buscar actualización</button>
          <button class="btn primary" data-act="instalar" style="display:none">${icon('download', 20)} Descargar e instalar</button>
        </div>
      </div>
    </div>
  </div>`;

  const n = listMatches().length;
  root.querySelector('#exp-info').textContent = `${n} partido${n === 1 ? '' : 's'} · ${listTeams().length} equipo(s) guardado(s)`;

  window.Capacitor?.Plugins?.App?.getInfo?.()
    ?.then((i) => { root.querySelector('#act-info').textContent = `Versión instalada: ${i.version} (build ${i.build})`; })
    ?.catch(() => { root.querySelector('#act-info').textContent = ''; });

  const quitar = suscribir((s) => {
    root.querySelector('#act-estado').textContent = textoFase(s);
    const notas = root.querySelector('#act-notas');
    notas.style.display = (s.fase === 'disponible' && s.notas) ? '' : 'none';
    notas.textContent = s.notas || '';
    const instalar = root.querySelector('[data-act="instalar"]');
    instalar.style.display = (s.fase === 'disponible' || s.fase === 'descargando') ? '' : 'none';
    instalar.disabled = s.fase === 'descargando';
    root.querySelector('[data-act="buscar"]').disabled = s.fase === 'comprobando' || s.fase === 'descargando';
  });

  root.onclick = async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act === 'back') { quitar(); return go('home'); }
    if (t.dataset.act === 'tema') {
      aplicarTema(t.dataset.tema);
      root.querySelector('#temas').innerHTML = temasHtml(t.dataset.tema);
      return;
    }
    if (t.dataset.act === 'exportar-todo') {
      const matches = listMatches();
      if (!matches.length) return toast('No hay partidos que exportar', 'bad');
      try {
        await saveFile(`volleystats_todos_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exportTodo(matches, listTeams())));
        toast(`${matches.length} partidos exportados`, 'good');
      } catch (err) { toast('No se pudo exportar', 'bad'); }
      return;
    }
    if (t.dataset.act === 'buscar') comprobarActualizacion();
    if (t.dataset.act === 'instalar') descargarEInstalar();
  };
}

register('ajustes', mount);
