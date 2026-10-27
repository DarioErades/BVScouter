import { router } from '../../router.js';
import { showToast, formatDate, escapeHtml } from '../../utils/helpers.js';
import { analizarEquipo } from '../../utils/estadisticas-equipo-pista.js';

let datos = null;
let seleccion = new Set();
let filtroRival = '';

export function registerEstadisticasEquipoPista() {
    router.register('estadisticas-equipo-pista', async (container, params = {}) => {
        container.innerHTML = '<p style="padding:24px;color:#94a3b8">Cargando estadísticas…</p>';
        try {
            datos = await window.apiPista.getDatosAnalisisEquipo(params.equipoId);
        } catch (e) {
            showToast(e.message || 'No se pudo cargar el equipo', 'error');
            return router.navigate('equipos-pista');
        }
        seleccion = new Set(datos.partidos.map(p => p.id));
        filtroRival = '';
        render(container);
    });
}

const f1 = (v) => (v === null || v === undefined || Number.isNaN(v) ? '–' : v.toFixed(1));
const f0 = (v) => (v === null || v === undefined || Number.isNaN(v) ? '–' : `${Math.round(v)}%`);
const dorsalNombre = (jugadores, d) => {
    const j = jugadores.find(x => x.dorsal === d);
    return `#${d}${j?.nombre ? ' ' + escapeHtml(j.nombre) : ''}`;
};

function barra(valor, color = 'var(--accent-color)', max = 100) {
    const w = Math.max(0, Math.min(100, ((valor || 0) / max) * 100));
    return `<div style="background:#0f172a;border-radius:4px;height:8px;min-width:80px;overflow:hidden"><div style="width:${w}%;height:100%;background:${color}"></div></div>`;
}

function tarjeta(titulo, cuerpo, nota = '') {
    return `<section class="card" style="padding:20px;margin-bottom:16px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:8px">
        <h2 style="margin:0 0 ${nota ? '4px' : '14px'};font-size:1.1rem">${titulo}</h2>
        ${nota ? `<p style="margin:0 0 14px;color:#94a3b8;font-size:0.85rem">${nota}</p>` : ''}
        ${cuerpo}</section>`;
}

function tabla(cabeceras, filas, opciones = {}) {
    return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.88rem;text-align:${opciones.align || 'center'}">
        <thead><tr style="border-bottom:2px solid var(--border-color);color:#94a3b8">${cabeceras.map((h, i) => `<th style="padding:8px 6px;${i === 0 ? 'text-align:left' : ''}">${h}</th>`).join('')}</tr></thead>
        <tbody>${filas.map(fila => `<tr style="border-bottom:1px solid rgba(255,255,255,0.06)">${fila.map((c, i) => `<td style="padding:7px 6px;${i === 0 ? 'text-align:left;white-space:nowrap' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
}

function kpi(etiqueta, valor, sub = '') {
    return `<div style="background:#1a2332;border:1px solid #1e293b;border-radius:10px;padding:14px">
        <div style="color:#94a3b8;font-size:0.75rem;text-transform:uppercase;letter-spacing:.05em">${etiqueta}</div>
        <div style="font-size:1.6rem;font-weight:700;margin:4px 0">${valor}</div>
        <div style="color:#64748b;font-size:0.78rem">${sub}</div></div>`;
}

function listaConteo(dic, color) {
    const total = Object.values(dic).reduce((a, b) => a + b, 0);
    const filas = Object.entries(dic).sort((a, b) => b[1] - a[1]);
    if (!filas.length) return '<p style="color:#64748b">Sin datos.</p>';
    return filas.map(([k, v]) => `<div style="display:grid;grid-template-columns:170px 1fr 70px;gap:10px;align-items:center;margin-bottom:6px;font-size:0.88rem">
        <span>${escapeHtml(k)}</span>${barra(v, color, filas[0][1])}<span style="text-align:right">${v} · ${f0((v / total) * 100)}</span></div>`).join('');
}

function reparto(grupo, jugadores, titulo, nota) {
    if (!grupo.total) return tarjeta(titulo, '<p style="color:#64748b">Sin datos suficientes (hace falta registrar recepciones y ataques en el mismo punto).</p>', nota);
    const filas = grupo.jugadores.map(j => [
        dorsalNombre(jugadores, j.dorsal),
        `<div style="display:flex;align-items:center;gap:8px">${barra(j.reparto, '#38bdf8', Math.max(...grupo.jugadores.map(x => x.reparto)))}<b>${f0(j.reparto)}</b></div>`,
        j.total, j.puntos, j.err + j.bloq, f0(j.puntosPct), f0(j.ef)
    ]);
    return tarjeta(titulo, tabla(['Atacante', 'Reparto', 'Ataques', 'Puntos', 'Err+Blq', '% punto', 'Eficiencia'], filas) +
        `<p style="color:#64748b;font-size:0.8rem;margin:8px 0 0">${grupo.total} ataques en total.</p>`, nota);
}

function render(container) {
    const incluidos = datos.partidos.filter(p => seleccion.has(p.id));
    const r = analizarEquipo(incluidos, datos.jugadores);
    const J = r.jugadores;
    const rivales = [...new Set(datos.partidos.map(p => p.rival_nombre))].sort();
    const so = r.global.so; const bp = r.global.bp;
    const eq = r.equipo;

    container.innerHTML = `
    <div class="estadisticas-equipo page-enter" style="padding-bottom:40px">
        <div class="page-header" style="margin-bottom:20px;display:flex;align-items:center;gap:16px">
            <button class="btn btn-secondary btn-icon" id="btn-volver" title="Volver">←</button>
            <div><h1 class="page-title">📈 ${escapeHtml(datos.equipo.nombre)} — estadísticas conjuntas</h1>
            <p class="page-subtitle">${incluidos.length} de ${datos.partidos.length} partidos incluidos</p></div>
        </div>

        ${datos.partidos.length === 0 ? tarjeta('Sin partidos', '<p>Este equipo todavía no tiene partidos. Importa los de la tablet desde Ajustes → «Importar todos los partidos».</p>') : ''}

        ${tarjeta('Partidos incluidos', `
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
                <button class="btn btn-sm btn-secondary" data-sel="todos">Todos</button>
                <button class="btn btn-sm btn-secondary" data-sel="ninguno">Ninguno</button>
                <button class="btn btn-sm btn-secondary" data-sel="ultimos5">Últimos 5</button>
                <select id="filtro-rival" class="form-input" style="width:200px"><option value="">Todos los rivales</option>${rivales.map(x => `<option value="${escapeHtml(x)}" ${x === filtroRival ? 'selected' : ''}>${escapeHtml(x)}</option>`).join('')}</select>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:6px">
            ${datos.partidos.map(p => {
                const x = r.partidos.find(y => y.id === p.id);
                const info = (x || analizarEquipo([p], datos.jugadores).partidos[0]);
                const color = info.victoria === true ? '#10b981' : info.victoria === false ? '#ef4444' : '#94a3b8';
                return `<label style="display:flex;gap:8px;align-items:center;background:#1a2332;border-radius:6px;padding:7px 10px;cursor:pointer;${filtroRival && p.rival_nombre !== filtroRival ? 'opacity:.4' : ''}">
                    <input type="checkbox" class="chk-partido" data-id="${p.id}" ${seleccion.has(p.id) ? 'checked' : ''}>
                    <span style="flex:1">${formatDate(p.fecha)} · ${escapeHtml(p.rival_nombre)}</span>
                    <b style="color:${color}">${info.sets}</b></label>`;
            }).join('')}
            </div>`)}

        ${incluidos.length === 0 ? '' : `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px">
            ${kpi('Partidos', `${r.victorias}V · ${r.derrotas}D`, `Sets ${r.sets.ganados}-${r.sets.perdidos}`)}
            ${kpi('Puntos', `${r.global.puntosFavor}-${r.global.puntosContra}`, `Diferencia ${r.global.puntosFavor - r.global.puntosContra >= 0 ? '+' : ''}${r.global.puntosFavor - r.global.puntosContra}`)}
            ${kpi('Side-out', f0(pct(so.ganados, so.total)), `${so.ganados}/${so.total} recibiendo`)}
            ${kpi('Break-point', f0(pct(bp.ganados, bp.total)), `${bp.ganados}/${bp.total} sacando`)}
            ${kpi('Recepción positiva', f0(pct(eq.recepcion.positiva, eq.recepcion.total)), `Perfecta ${f0(pct(eq.recepcion.perfecta, eq.recepcion.total))} · Error ${f0(pct(eq.recepcion.err, eq.recepcion.total))}`)}
            ${kpi('Ataque', f0(pct(eq.ataque.puntos, eq.ataque.total)), `Eficiencia ${f0(pct(eq.ataque.puntos - eq.ataque.err - eq.ataque.bloq, eq.ataque.total))} · ${eq.ataque.total} ataques`)}
            ${kpi('Saque', `${eq.saque.ace} aces`, `${eq.saque.err} errores de ${eq.saque.total}`)}
            ${kpi('Bloqueo', `${eq.bloqueo.puntos} pts`, `${eq.defensa.total} defensas · ${f0(pct(eq.defensa.positiva, eq.defensa.total))} positivas`)}
        </div>

        ${tarjeta('🎯 A quién colocan con bola buena', '', 'Quién ataca tras una recepción positiva (# o +). El reparto muestra la tendencia del colocador.')}
        ${reparto(r.colocacion.recBuena, datos.jugadores, 'Con bola buena (recepción # o +)', 'Reparto del primer ataque tras una recepción positiva.')}
        ${reparto(r.colocacion.recMala, datos.jugadores, 'Con bola mala (recepción !, - o /)', 'Cuando la recepción no es buena, ¿en quién confían?')}
        ${reparto(r.colocacion.defensa, datos.jugadores, 'Tras defensa (contraataque)', 'Primer ataque tras una defensa nuestra.')}
        ${reparto(r.colocacion.clutch, datos.jugadores, 'Con bola buena en los puntos finales', 'Recepción positiva con ambos equipos en 20 o más (11 en el set decisivo).')}

        ${tarjeta('🔄 Rotaciones', `
            ${r.rotacionPeor ? `<p style="margin:0 0 12px"><b style="color:#ef4444">R${r.rotacionPeor}</b> es la rotación que más cuesta (menor % de puntos ganados). La mejor es <b style="color:#10b981">R${r.rotacionMejor}</b>.</p>` : ''}
            ${tabla(['Rot.', 'Puntos', '% ganado', 'Dif.', 'Side-out', 'Break-point', 'Rec. +', 'Rec. error', 'Ataque ef.', 'Más colocada'], r.rotaciones.map(z => [
                `<b style="${z.rot === r.rotacionPeor ? 'color:#ef4444' : z.rot === r.rotacionMejor ? 'color:#10b981' : ''}">R${z.rot}</b>`,
                z.puntos, `<div style="display:flex;gap:6px;align-items:center">${barra(z.pct, z.rot === r.rotacionPeor ? '#ef4444' : '#38bdf8')}${f0(z.pct)}</div>`,
                `${z.dif >= 0 ? '+' : ''}${z.dif}`, `${f0(z.soPct)} <small style="color:#64748b">(${z.so.ganados}/${z.so.total})</small>`,
                `${f0(z.bpPct)} <small style="color:#64748b">(${z.bp.ganados}/${z.bp.total})</small>`,
                f0(z.recPos), f0(z.recErr), f0(z.ataqueEf),
                z.colocacion.map(c => `#${c.dorsal} ${f0(c.reparto)}`).join(' · ') || '–'
            ]))}
            <p style="color:#64748b;font-size:0.8rem;margin:10px 0 0">La rotación es la posición del colocador (R1…R6). «Más colocada» = a quién se la dan tras recepción positiva en esa rotación.</p>`)}

        ${tarjeta('👥 Jugadores — acumulado', tabla(
            ['Jugador', 'Part.', 'Sets', 'Voto', 'Pts jugados', 'Ganados', '% gan.', 'Anotados', 'Errores', 'Saldo', 'Anot./punto jug.'],
            J.map(x => [dorsalNombre(datos.jugadores, x.dorsal) + (x.libero ? ' <small style="color:#64748b">(L)</small>' : ''),
                x.partidos, x.setsJugados || '–', f1(x.voto), x.tiempo.puntosJugados || '–', x.tiempo.puntosJugados ? x.tiempo.ganados : '–',
                x.tiempo.puntosJugados ? f0(pct(x.tiempo.ganados, x.tiempo.puntosJugados)) : '–',
                x.anotados, x.errores, `<b style="color:${x.saldo >= 0 ? '#10b981' : '#ef4444'}">${x.saldo >= 0 ? '+' : ''}${x.saldo}</b>`,
                x.tiempo.puntosJugados ? f0(x.anotadosPorPunto) : '–']),
        ), 'Puntos jugados = puntos disputados con el jugador en pista (según titulares y cambios). Saldo = puntos anotados (ataque + ace + bloqueo) − errores propios.')}

        ${tarjeta('💥 Ataque por jugador', tabla(['Jugador', 'Ataques', '% del equipo', 'Puntos', 'Error', 'Bloqueado', '% punto', 'Eficiencia', 'Con bola buena', 'Con bola mala', 'Tras defensa'],
            J.filter(x => x.ataque.total).sort((a, b) => b.ataque.total - a.ataque.total).map(x => {
                const g = (grupo) => { const c = grupo.jugadores.find(y => y.dorsal === x.dorsal); return c ? `${c.total} · ${f0(c.puntosPct)}` : '–'; };
                return [dorsalNombre(datos.jugadores, x.dorsal), x.ataque.total, f0(pct(x.ataque.total, eq.ataque.total)), x.ataque.puntos, x.ataque.err, x.ataque.bloq,
                    f0(pct(x.ataque.puntos, x.ataque.total)), f0(x.ataqueEf), g(r.colocacion.recBuena), g(r.colocacion.recMala), g(r.colocacion.defensa)];
            })), 'Las tres últimas columnas: nº de ataques · % de punto según de dónde viene la bola.')}

        ${tarjeta('🤲 Recepción y 🏐 saque por jugador', tabla(['Jugador', 'Rec.', '% del equipo', 'Perfecta', 'Positiva', 'Error', 'Saques', 'Aces', 'Errores', 'Puntos sacando'],
            J.filter(x => x.recepcion.total || x.saque.total).map(x => [dorsalNombre(datos.jugadores, x.dorsal),
                x.recepcion.total || '–', x.recepcion.total ? f0(pct(x.recepcion.total, eq.recepcion.total)) : '–',
                f0(pct(x.recepcion.perfecta, x.recepcion.total)), f0(pct(x.recepcion.positiva, x.recepcion.total)), f0(pct(x.recepcion.err, x.recepcion.total)),
                x.saque.total || '–', x.saque.ace, x.saque.err,
                x.sacando.total ? `${f0(pct(x.sacando.ganados, x.sacando.total))} <small style="color:#64748b">(${x.sacando.ganados}/${x.sacando.total})</small>` : '–'])))}

        ${tarjeta('🛡️ Bloqueo y defensa por jugador', tabla(['Jugador', 'Bloqueos punto', 'Errores bloqueo', 'Defensas', '% positiva', 'Errores defensa'],
            J.filter(x => x.bloqueo.total || x.defensa.total).map(x => [dorsalNombre(datos.jugadores, x.dorsal), x.bloqueo.puntos, x.bloqueo.err, x.defensa.total, f0(pct(x.defensa.positiva, x.defensa.total)), x.defensa.err])))}

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px">
            ${tarjeta('✅ Cómo ganamos los puntos', listaConteo(r.ganamos, '#10b981'))}
            ${tarjeta('❌ Cómo perdemos los puntos', listaConteo(r.perdemos, '#ef4444'))}
        </div>

        ${tarjeta('Calidad de la bola y ataque', tabla(['Origen de la bola', 'Ataques', 'Puntos', 'Error', 'Bloqueado', '% punto', 'Eficiencia'],
            [['Recepción buena', 'recBuena'], ['Recepción mala', 'recMala'], ['Tras defensa', 'defensa'], ['Otras (free ball, sin registro…)', 'otro']].map(([n, k]) => {
                const c = r.fuenteTotales[k];
                return [n, c.total, c.puntos, c.err, c.bloq, f0(pct(c.puntos, c.total)), f0(pct(c.puntos - c.err - c.bloq, c.total))];
            })))}

        ${Object.keys(r.tiposAtaque).length ? tarjeta('Tipo de ataque', tabla(['Tipo', 'Ataques', 'Puntos', 'Error', 'Bloqueado', '% punto', 'Eficiencia'],
            Object.entries(r.tiposAtaque).sort((a, b) => b[1].total - a[1].total).map(([n, c]) => [escapeHtml(n), c.total, c.puntos, c.err, c.bloq, f0(pct(c.puntos, c.total)), f0(pct(c.puntos - c.err - c.bloq, c.total))]))) : ''}

        ${tarjeta('⏱️ Situaciones', `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
                ${kpi('Puntos finales (20+)', f0(pct(r.clutch.ganados, r.clutch.total)), `${r.clutch.ganados}/${r.clutch.total} · SO ${f0(pct(r.clutch.so.ganados, r.clutch.so.total))} · BP ${f0(pct(r.clutch.bp.ganados, r.clutch.bp.total))}`)}
                ${kpi('Rallies cortos (≤2 toques)', f0(pct(r.largo.corto.ganados, r.largo.corto.total)), `${r.largo.corto.total} puntos`)}
                ${kpi('Rallies medios (3-4)', f0(pct(r.largo.medio.ganados, r.largo.medio.total)), `${r.largo.medio.total} puntos`)}
                ${kpi('Rallies largos (5+)', f0(pct(r.largo.largo.ganados, r.largo.largo.total)), `${r.largo.largo.total} puntos`)}
                ${kpi('Mejor racha', `+${r.rachas.ganadora}`, `Peor racha en contra: ${r.rachas.perdedora}`)}
                ${kpi('Mayor ventaja', `+${r.rachas.ventajaMax}`, 'puntos en un set')}
            </div>
            ${Object.keys(r.porSetNum).length ? `<div style="margin-top:14px">${tabla(['Set', 'Jugados', 'Ganados', '% ganados', 'Dif. media'], Object.entries(r.porSetNum).sort((a, b) => a[0] - b[0]).map(([s, v]) => [`Set ${s}`, v.jugados, v.ganados, f0(pct(v.ganados, v.jugados)), `${v.dif / v.jugados >= 0 ? '+' : ''}${(v.dif / v.jugados).toFixed(1)}`]))}</div>` : ''}`)}

        ${tarjeta('Por rival', tabla(['Rival', 'V', 'D', 'Puntos a favor', 'En contra', 'Dif.'], r.porRival.sort((a, b) => a.rival.localeCompare(b.rival)).map(v => [escapeHtml(v.rival), v.v, v.d, v.favor, v.contra, `${v.favor - v.contra >= 0 ? '+' : ''}${v.favor - v.contra}`])))}

        ${tarjeta('📅 Evolución por partido', tabla(['Fecha', 'Rival', 'Sets', 'Parciales', 'Side-out', 'Break-point', 'Ataque % punto', 'Ataque ef.', 'Rec. +', 'Origen'], r.partidos.map(p => [
            formatDate(p.fecha), escapeHtml(p.rival), `<b style="color:${p.victoria === true ? '#10b981' : p.victoria === false ? '#ef4444' : '#94a3b8'}">${p.sets}</b>`,
            escapeHtml(p.parciales), f0(p.so), f0(p.bp), f0(p.ataquePuntos), f0(p.ataqueEf), f0(p.recPos), p.origen === 'tablet' ? '📲 tablet' : '💻 escritorio'])))}
        `}
    </div>`;

    bind(container);
}

const pct = (a, b) => (b ? (a / b) * 100 : null);

function bind(container) {
    container.querySelector('#btn-volver')?.addEventListener('click', () => router.navigate('equipos-pista'));
    container.querySelectorAll('.chk-partido').forEach(c => c.addEventListener('change', () => {
        const id = Number(c.dataset.id);
        if (c.checked) seleccion.add(id); else seleccion.delete(id);
        render(container);
    }));
    container.querySelectorAll('[data-sel]').forEach(b => b.addEventListener('click', () => {
        const todos = datos.partidos;
        if (b.dataset.sel === 'todos') seleccion = new Set(todos.map(p => p.id));
        else if (b.dataset.sel === 'ninguno') seleccion = new Set();
        else seleccion = new Set(todos.slice(-5).map(p => p.id));
        render(container);
    }));
    container.querySelector('#filtro-rival')?.addEventListener('change', (e) => {
        filtroRival = e.target.value;
        seleccion = new Set(datos.partidos.filter(p => !filtroRival || p.rival_nombre === filtroRival).map(p => p.id));
        render(container);
    });
}
