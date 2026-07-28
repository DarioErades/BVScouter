function esTerminal(accion) {
  if (!accion || ['tiempo_muerto', 'cambio', 'fin_set'].includes(accion.tipo_accion)) return false;
  if (['rival', 'error_general'].includes(accion.tipo_accion)) return true;
  if (['recepcion', 'defensa', 'colocacion', 'freeball'].includes(accion.tipo_accion)) return accion.resultado === '=';
  return ['#', '=', '/'].includes(accion.resultado);
}

function puntoEsperado(accion) {
  if (accion.tipo_accion === 'rival') return accion.resultado === '=' ? 'local' : 'rival';
  if (accion.tipo_accion === 'error_general') return 'rival';
  if (accion.resultado === '/' && accion.tipo_accion === 'ataque') return 'rival';
  if (accion.resultado === '=' && accion.tipo_accion !== 'rival') return 'rival';
  if (accion.resultado === '#' && ['ataque', 'saque', 'bloqueo'].includes(accion.tipo_accion)) return 'local';
  return null;
}

export function validarDatosPista(acciones, roster = []) {
  const issues = [];
  const dorsales = new Set(roster.map(j => Number(j.dorsal)));
  const ordenadas = [...acciones].sort((a, b) => (a.id || 0) - (b.id || 0));

  for (const accion of ordenadas) {
    const rotacion = Number(accion.rotacion);
    if (!Number.isInteger(rotacion) || rotacion < 1 || rotacion > 6) {
      issues.push({ level: 'error', actionId: accion.id, text: `Rotación inválida en la acción #${accion.id}.` });
    }
    if (!['local', 'rival'].includes(accion.equipo_al_saque || '')) {
      issues.push({ level: 'warning', actionId: accion.id, text: `Falta el equipo al saque en la acción #${accion.id}; corresponde a datos anteriores a la migración.` });
    }
    if (accion.dorsal > 0 && !dorsales.has(Number(accion.dorsal))) {
      issues.push({ level: 'warning', actionId: accion.id, text: `El dorsal #${accion.dorsal} de la acción #${accion.id} no pertenece al roster del partido.` });
    }

    const preLocal = Number(accion.marcador_pre_local);
    const preRival = Number(accion.marcador_pre_rival);
    const postLocal = Number(accion.marcador_local);
    const postRival = Number(accion.marcador_rival);
    const ganador = puntoEsperado(accion);
    if (Number(accion.scouting_version) >= 2 && ganador && [preLocal, preRival, postLocal, postRival].every(Number.isFinite)) {
      const esperadoLocal = preLocal + (ganador === 'local' ? 1 : 0);
      const esperadoRival = preRival + (ganador === 'rival' ? 1 : 0);
      if (postLocal !== esperadoLocal || postRival !== esperadoRival) {
        issues.push({ level: 'error', actionId: accion.id, text: `Marcador incoherente tras la acción #${accion.id}.` });
      }
    }
  }

  const ultimaRelevante = [...ordenadas].reverse().find(a => !['tiempo_muerto', 'cambio', 'fin_set'].includes(a.tipo_accion));
  if (ultimaRelevante && !esTerminal(ultimaRelevante)) {
    issues.push({ level: 'warning', actionId: ultimaRelevante.id, text: 'El último rally está abierto: no termina en punto o error.' });
  }

  return {
    issues,
    errors: issues.filter(i => i.level === 'error').length,
    warnings: issues.filter(i => i.level === 'warning').length,
    isValid: !issues.some(i => i.level === 'error')
  };
}
