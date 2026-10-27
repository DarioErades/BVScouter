import { esAccionTerminal as esTerminal, ganadorAccion } from './rallies-pista.js';

// `key` identifica la incidencia de forma estable (código de la comprobación + acción) para que
// se pueda ignorar de forma persistente (ver `calidad_ignorados` en partidos_pista) sin que el
// texto o el orden de las comprobaciones afecte a qué se está ignorando.
function issueKey(code, actionId) {
  return `${code}:${actionId}`;
}

export function validarDatosPista(acciones, roster = [], ignorados = []) {
  const ignoradosSet = new Set(ignorados);
  const issues = [];
  const dorsales = new Set(roster.map(j => Number(j.dorsal)));
  const ordenadas = [...acciones].sort((a, b) => (a.id || 0) - (b.id || 0));

  const push = (code, level, actionId, text) => {
    const key = issueKey(code, actionId);
    if (ignoradosSet.has(key)) return;
    issues.push({ key, level, actionId, text });
  };

  for (const accion of ordenadas) {
    const rotacion = Number(accion.rotacion);
    if (!Number.isInteger(rotacion) || rotacion < 1 || rotacion > 6) {
      push('rotacion_invalida', 'error', accion.id, `Rotación inválida en la acción #${accion.id}.`);
    }
    if (!['local', 'rival'].includes(accion.equipo_al_saque || '')) {
      push('equipo_saque_faltante', 'warning', accion.id, `Falta el equipo al saque en la acción #${accion.id}; corresponde a datos anteriores a la migración.`);
    }
    if (accion.dorsal > 0 && !dorsales.has(Number(accion.dorsal))) {
      push('dorsal_fuera_roster', 'warning', accion.id, `El dorsal #${accion.dorsal} de la acción #${accion.id} no pertenece al roster del partido.`);
    }

    const preLocal = Number(accion.marcador_pre_local);
    const preRival = Number(accion.marcador_pre_rival);
    const postLocal = Number(accion.marcador_local);
    const postRival = Number(accion.marcador_rival);
    const ganador = ganadorAccion(accion);
    if (Number(accion.scouting_version) >= 2 && ganador && [preLocal, preRival, postLocal, postRival].every(Number.isFinite)) {
      const esperadoLocal = preLocal + (ganador === 'local' ? 1 : 0);
      const esperadoRival = preRival + (ganador === 'rival' ? 1 : 0);
      if (postLocal !== esperadoLocal || postRival !== esperadoRival) {
        push('marcador_incoherente', 'error', accion.id, `Marcador incoherente tras la acción #${accion.id}.`);
      }
    }
  }

  const ultimaRelevante = [...ordenadas].reverse().find(a => !['tiempo_muerto', 'cambio', 'fin_set'].includes(a.tipo_accion));
  if (ultimaRelevante && !esTerminal(ultimaRelevante)) {
    push('rally_abierto', 'warning', ultimaRelevante.id, 'El último rally está abierto: no termina en punto o error.');
  }

  return {
    issues,
    errors: issues.filter(i => i.level === 'error').length,
    warnings: issues.filter(i => i.level === 'warning').length,
    isValid: !issues.some(i => i.level === 'error')
  };
}
