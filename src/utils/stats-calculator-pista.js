// stats-calculator-pista.js
export function calcularStatsPista(acciones, roster) {
  // Inicializar estructuras
  const statsPorJugador = {};
  roster.forEach(j => {
    statsPorJugador[j.dorsal] = getEmptyJugadorStats(j);
  });

  const totalEquipo = getEmptyJugadorStats({ dorsal: 'Equ', nombre: 'Total', apellidos: 'Equipo', posicion: '', es_libero: false });
  const porSet = {};
  const porRotacion = {};
  for (let i = 1; i <= 6; i++) {
    porRotacion[i] = { puntosFavor: 0, puntosContra: 0, diferencia: 0 };
  }

  // El marcador de una acción de pista se guarda después de aplicar el punto.
  // Por eso no se puede agrupar un rally por marcador: la última acción cae
  // en el marcador siguiente y rompe el análisis de side-out.
  const rallies = agruparRallies(acciones);

  // Estructuras de avanzado
  let k1Oportunidades = 0;
  let k1Puntos = 0;
  let k2Oportunidades = 0;
  let k2Puntos = 0;

  const primerAtaquePos = { total: 0, errores: 0, bloqueados: 0, puntos: 0, ptsPct: 0 };
  const primerAtaqueNeg = { total: 0, errores: 0, bloqueados: 0, puntos: 0, ptsPct: 0 };
  const contraataque = { total: 0, errores: 0, bloqueados: 0, puntos: 0, ptsPct: 0 };

  // Analizar cada rally
  rallies.forEach(rally => {
    // Determinar complejo (K1 vs K2)
    const haySaquePropio = rally.some(a => a.tipo_accion === 'saque');
    const hayRecepcionPropia = rally.some(a => a.tipo_accion === 'recepcion');
    
    // Determinar si ganamos el punto
    // Ganamos si hay un '#' en ataque, saque o bloqueo, o si hay un error rival ('rival' o 'error_general' atribuido a nosotros)
    const puntoGanado = rally.some(a => 
      ((a.tipo_accion === 'ataque' || a.tipo_accion === 'saque' || a.tipo_accion === 'bloqueo') && a.resultado === '#') || 
      (a.tipo_accion === 'rival' && (a.subtipo === 'Error Rival' || a.resultado === '=')) ||
      (a.tipo_accion === 'error_general' && (a.subtipo === 'Error Rival' || a.resultado === '#'))
    );
    const puntoPerdido = rally.some(a =>
      (a.resultado === '=' && a.tipo_accion !== 'rival') ||
      (a.resultado === '/' && a.tipo_accion === 'ataque') ||
      (a.tipo_accion === 'rival' && (a.subtipo === 'Acierto Rival' || a.resultado === '#')) ||
      (a.tipo_accion === 'error_general' && a.resultado === '=')
    );

    // K1 / K2
    if (hayRecepcionPropia) {
      k1Oportunidades++;
      if (puntoGanado) k1Puntos++;
    }
    if (haySaquePropio) {
      k2Oportunidades++;
      if (puntoGanado) k2Puntos++;
    }

    // Rotacion stats (usamos la rotación del primer elemento del rally)
    const rot = rally[0]?.rotacion;
    if (rot && porRotacion[rot]) {
      if (puntoGanado) {
        porRotacion[rot].puntosFavor++;
        porRotacion[rot].diferencia++;
      } else if (puntoPerdido) {
        porRotacion[rot].puntosContra++;
        porRotacion[rot].diferencia--;
      }
    }

    // Ataques tras recepción y contraataque
    const recepcion = rally.find(a => a.tipo_accion === 'recepcion');
    const ataques = rally.filter(a => a.tipo_accion === 'ataque');
    
    if (hayRecepcionPropia && recepcion && ataques.length > 0) {
      // Primer ataque (asumimos el primero de la lista)
      const primerAtq = ataques[0];
      const resAtq = primerAtq.resultado;
      
      const esPositiva = recepcion.resultado === '#' || recepcion.resultado === '+';
      const statsAtqRef = esPositiva ? primerAtaquePos : primerAtaqueNeg;
      
      statsAtqRef.total++;
      if (resAtq === '=') statsAtqRef.errores++;
      if (resAtq === '/') statsAtqRef.bloqueados++;
      if (resAtq === '#') statsAtqRef.puntos++;
    }

    if (!hayRecepcionPropia && ataques.length > 0) {
      ataques.forEach(atq => {
        const resAtq = atq.resultado;
        contraataque.total++;
        if (resAtq === '=') contraataque.errores++;
        if (resAtq === '/') contraataque.bloqueados++;
        if (resAtq === '#') contraataque.puntos++;
      });
    }
  });

  // Procesar todas las acciones para jugador / equipo / set
  acciones.forEach(a => {
    // Si no está en el roster, podría ser el equipo rival, etc.
    // Solo procesamos jugadores nuestros o equipo total
    if (a.dorsal && statsPorJugador[a.dorsal]) {
      processActionForStats(a, statsPorJugador[a.dorsal]);
    }
    
    // Total equipo
    processActionForStats(a, totalEquipo);

    // Por set
    if (!porSet[a.set_numero]) {
      porSet[a.set_numero] = getEmptyJugadorStats({ dorsal: 'Equ', nombre: 'Total', apellidos: 'Set ' + a.set_numero, posicion: '', es_libero: false });
    }
    processActionForStats(a, porSet[a.set_numero]);
  });

  // Finalizar cálculos (porcentajes, voto, setsJugados)
  Object.values(statsPorJugador).forEach(s => finalizeStats(s));
  finalizeStats(totalEquipo);
  Object.values(porSet).forEach(s => finalizeStats(s));

  // Porcentajes de avanzado
  if (primerAtaquePos.total > 0) primerAtaquePos.ptsPct = Math.round((primerAtaquePos.puntos / primerAtaquePos.total) * 100);
  if (primerAtaqueNeg.total > 0) primerAtaqueNeg.ptsPct = Math.round((primerAtaqueNeg.puntos / primerAtaqueNeg.total) * 100);
  if (contraataque.total > 0) contraataque.ptsPct = Math.round((contraataque.puntos / contraataque.total) * 100);

  const statsPorId = {};
  roster.forEach(j => {
    if (j.id && statsPorJugador[j.dorsal]) {
      statsPorId[j.id] = statsPorJugador[j.dorsal];
    }
    if (j.jugador_pista_id && statsPorJugador[j.dorsal]) {
      statsPorId[j.jugador_pista_id] = statsPorJugador[j.dorsal];
    }
  });

  return {
    porJugador: statsPorJugador,
    jugadores: { ...statsPorJugador, ...statsPorId },
    totalEquipo,
    porSet,
    sideOut: {
      total: k1Oportunidades,
      puntos: k1Puntos,
      recepciones: k1Oportunidades,
      ratio: k1Oportunidades > 0 ? Math.round((k1Puntos / k1Oportunidades) * 100) + '%' : '0%',
      pct: k1Oportunidades > 0 ? Math.round((k1Puntos / k1Oportunidades) * 100) : 0
    },
    breakPoint: {
      total: k2Oportunidades,
      puntos: k2Puntos,
      saques: k2Oportunidades,
      ratio: k2Oportunidades > 0 ? Math.round((k2Puntos / k2Oportunidades) * 100) + '%' : '0%',
      pct: k2Oportunidades > 0 ? Math.round((k2Puntos / k2Oportunidades) * 100) : 0
    },
    breakPoints: {
      total: k2Oportunidades,
      puntos: k2Puntos,
      saques: k2Oportunidades,
      ratio: k2Puntos > 0 ? (k2Oportunidades / k2Puntos).toFixed(2) : '0',
      pct: k2Oportunidades > 0 ? Math.round((k2Puntos / k2Oportunidades) * 100) : 0
    },
    ataquePos: { tot: primerAtaquePos.total, err: primerAtaquePos.errores, blq: primerAtaquePos.bloqueados, ptsPct: primerAtaquePos.ptsPct + '%' },
    ataqueNeg: { tot: primerAtaqueNeg.total, err: primerAtaqueNeg.errores, blq: primerAtaqueNeg.bloqueados, ptsPct: primerAtaqueNeg.ptsPct + '%' },
    contraataque: { tot: contraataque.total, err: contraataque.errores, blq: contraataque.bloqueados, ptsPct: contraataque.ptsPct + '%' },
    avanzadas: {
      sideOut: { recepciones: k1Oportunidades, puntos: k1Puntos, ratio: k1Oportunidades > 0 ? Math.round((k1Puntos / k1Oportunidades) * 100) + '%' : '0%' },
      breakPoint: { saques: k2Oportunidades, puntos: k2Puntos, ratio: k2Oportunidades > 0 ? Math.round((k2Puntos / k2Oportunidades) * 100) + '%' : '0%' },
      ataquePos: { tot: primerAtaquePos.total, cont: primerAtaquePos.total - primerAtaquePos.errores - primerAtaquePos.bloqueados - primerAtaquePos.puntos, err: primerAtaquePos.errores, blq: primerAtaquePos.bloqueados, ptsPct: primerAtaquePos.ptsPct + '%' },
      ataqueNeg: { tot: primerAtaqueNeg.total, cont: primerAtaqueNeg.total - primerAtaqueNeg.errores - primerAtaqueNeg.bloqueados - primerAtaqueNeg.puntos, err: primerAtaqueNeg.errores, blq: primerAtaqueNeg.bloqueados, ptsPct: primerAtaqueNeg.ptsPct + '%' },
      contraataque: { tot: contraataque.total, cont: contraataque.total - contraataque.errores - contraataque.bloqueados - contraataque.puntos, err: contraataque.errores, blq: contraataque.bloqueados, ptsPct: contraataque.ptsPct + '%' }
    },
    primerAtaquePositivo: primerAtaquePos,
    primerAtaqueNegativo: primerAtaqueNeg,
    porRotacion
  };
}

function esAccionTerminal(a) {
  if (!a || ['tiempo_muerto', 'cambio'].includes(a.tipo_accion)) return false;
  if (a.tipo_accion === 'rival' || a.tipo_accion === 'error_general') return true;
  if (['recepcion', 'defensa', 'colocacion', 'freeball'].includes(a.tipo_accion)) {
    return a.resultado === '=';
  }
  return ['#', '=', '/'].includes(a.resultado);
}

function agruparRallies(acciones) {
  const ordenadas = [...acciones].sort((a, b) => (a.id || 0) - (b.id || 0));
  const rallies = [];
  let actual = [];

  for (const accion of ordenadas) {
    actual.push(accion);
    if (esAccionTerminal(accion)) {
      rallies.push(actual);
      actual = [];
    }
  }
  if (actual.length > 0) rallies.push(actual);
  return rallies;
}

function processActionForStats(a, stats) {
  // Añadir set a setsJugados
  if (!stats.setsJugados.includes(a.set_numero)) {
    stats.setsJugados.push(a.set_numero);
  }

  const res = a.resultado;
  
  if (a.tipo_accion === 'saque') {
    stats.saque.total++;
    if (res === '=') stats.saque.errores++;
    if (res === '#') { stats.saque.puntos++; stats.puntos.saque++; stats.puntos.total++; }
  } 
  else if (a.tipo_accion === 'recepcion') {
    stats.recepcion.total++;
    if (res === '=') stats.recepcion.errores++;
    if (res === '#') stats.recepcion.excelentes++;
    if (res === '#' || res === '+') stats.recepcion.positivas++;
  }
  else if (a.tipo_accion === 'ataque') {
    stats.ataque.total++;
    if (res === '=') stats.ataque.errores++;
    if (res === '/') stats.ataque.bloqueados++;
    if (res === '#') { stats.ataque.puntos++; stats.puntos.ataque++; stats.puntos.total++; }
  }
  else if (a.tipo_accion === 'bloqueo') {
    stats.bloqueo.total++;
    if (res === '=') stats.bloqueo.errores++;
    if (res === '#') { stats.bloqueo.puntos++; stats.puntos.bloqueo++; stats.puntos.total++; }
  }
  else if (a.tipo_accion === 'defensa') {
    stats.defensa.total++;
    if (res === '=') stats.defensa.errores++;
    if (res === '#' || res === '+') stats.defensa.positivas++;
  }
  else if (a.tipo_accion === 'rival' || a.tipo_accion === 'error_general') {
    if (a.subtipo === 'Error Rival') {
      stats.puntos.errorAdversario++;
      stats.puntos.total++;
    }
  }

  if (res === '=') stats._erroresTotales++;
}

function finalizeStats(stats) {
  // Recepcion
  if (stats.recepcion.total > 0) {
    stats.recepcion.posPct = Math.round((stats.recepcion.positivas / stats.recepcion.total) * 100);
    stats.recepcion.excPct = Math.round((stats.recepcion.excelentes / stats.recepcion.total) * 100);
  }
  // Ataque
  if (stats.ataque.total > 0) {
    stats.ataque.ptsPct = Math.round((stats.ataque.puntos / stats.ataque.total) * 100);
  }
  // Defensa
  if (stats.defensa.total > 0) {
    stats.defensa.posPct = Math.round((stats.defensa.positivas / stats.defensa.total) * 100);
  }

  // Ganancias perdidas
  stats.gananciasPerdidas = stats.puntos.total - stats._erroresTotales;

  // Voto (Rating 0-10)
  // Fórmula simple basada en DataVolley
  let voto = 5.0;
  if (stats.ataque.total > 0 || stats.recepcion.total > 0 || stats.saque.total > 0) {
    voto += (stats.puntos.total * 0.4);
    voto -= (stats._erroresTotales * 0.3);
    voto += (stats.recepcion.excelentes * 0.2);
    voto += (stats.defensa.positivas * 0.1);
    
    if (voto > 10) voto = 10;
    if (voto < 0) voto = 0;
  } else {
    voto = 0; // Sin acciones
  }
  stats.voto = voto > 0 ? parseFloat(voto.toFixed(1)) : 0;

  // Aliases para máxima compatibilidad con frontend (scouting-pista e informe-pista)
  stats.saques_totales = stats.saque.total;
  stats.saques_errores = stats.saque.errores;
  stats.saques_puntos = stats.saque.puntos;
  stats.saqueTot = stats.saque.total;
  stats.saqueErr = stats.saque.errores;
  stats.ptsSaque = stats.saque.puntos;

  stats.recepciones_totales = stats.recepcion.total;
  stats.recepciones_errores = stats.recepcion.errores;
  stats.recepciones_positivas_pct = stats.recepcion.posPct;
  stats.recepciones_errores_pct = stats.recepcion.total > 0
    ? Math.round((stats.recepcion.errores / stats.recepcion.total) * 100)
    : 0;
  stats.recTot = stats.recepcion.total;
  stats.recErr = stats.recepcion.errores;
  stats.recPosPct = stats.recepcion.posPct + '%';
  stats.recExcPct = stats.recepcion.excPct + '%';

  stats.ataques_totales = stats.ataque.total;
  stats.ataques_errores = stats.ataque.errores;
  stats.ataques_bloqueados = stats.ataque.bloqueados;
  stats.ataques_puntos = stats.ataque.puntos;
  stats.ataques_eficiencia = stats.ataque.ptsPct;
  stats.attTot = stats.ataque.total;
  stats.attErr = stats.ataque.errores;
  stats.attBlq = stats.ataque.bloqueados;
  stats.ptsAtaque = stats.ataque.puntos;
  stats.attPtsPct = stats.ataque.ptsPct + '%';

  stats.bloqueos_puntos = stats.bloqueo.puntos;
  stats.ptsBloqueo = stats.bloqueo.puntos;

  stats.errAdversario = stats.puntos.errorAdversario;
  stats.ganados_perdidos = stats.gananciasPerdidas;
  stats.gMenosP = stats.gananciasPerdidas;
}

function getEmptyJugadorStats(jugador) {
  return {
    dorsal: jugador.dorsal,
    nombre: jugador.nombre,
    apellidos: jugador.apellidos,
    posicion: jugador.posicion,
    esLibero: jugador.es_libero || false,
    setsJugados: [],
    voto: 0,
    fasePunto: 0,
    gananciasPerdidas: 0,
    _erroresTotales: 0,
    puntos: { saque: 0, ataque: 0, bloqueo: 0, errorAdversario: 0, total: 0 },
    saque:     { total: 0, errores: 0, puntos: 0 },
    recepcion: { total: 0, errores: 0, positivas: 0, excelentes: 0, posPct: 0, excPct: 0 },
    ataque:    { total: 0, errores: 0, bloqueados: 0, puntos: 0, ptsPct: 0 },
    bloqueo:   { total: 0, errores: 0, puntos: 0 },
    defensa:   { total: 0, errores: 0, positivas: 0, posPct: 0 },
  };
}

export function detectarPatronesPista(acciones, roster) {
  const patrones = [];
  
  // Agrupar por jugador
  const porJugador = {};
  roster.forEach(j => { porJugador[j.dorsal] = []; });
  
  acciones.forEach(a => {
    if (a.dorsal && porJugador[a.dorsal]) {
      porJugador[a.dorsal].push(a);
    }
  });

  Object.keys(porJugador).forEach(dorsal => {
    const accs = porJugador[dorsal];
    const jNombre = roster.find(r => r.dorsal == dorsal)?.nombre || `Dorsal ${dorsal}`;
    
    // Tasa de errores
    const errores = accs.filter(a => a.resultado === '=');
    if (accs.length >= 5) {
      const pctErrores = Math.round((errores.length / accs.length) * 100);
      if (pctErrores >= 25) {
        patrones.push({
          icon: '⚠️',
          text: `${jNombre} tiene una tasa de error alta (${pctErrores}%)`
        });
      }
    }

    // Excelencia en ataque
    const ataques = accs.filter(a => a.tipo_accion === 'ataque');
    if (ataques.length >= 5) {
      const kills = ataques.filter(a => a.resultado === '#').length;
      const pctKills = Math.round((kills / ataques.length) * 100);
      if (pctKills >= 50) {
        patrones.push({
          icon: '🔥',
          text: `${jNombre} tiene una excelente eficacia en ataque (${pctKills}%)`
        });
      }
    }
  });

  // Rotaciones
  const porRotacion = {};
  for (let i = 1; i <= 6; i++) porRotacion[i] = { k1: 0, k1Puntos: 0 };
  
  // Agrupar por rallies para ver side-out por rotacion
  const rallies = agruparRallies(acciones);

  rallies.forEach(rally => {
    const rot = rally[0]?.rotacion;
    if (rot && rally.some(a => a.tipo_accion === 'recepcion')) {
      porRotacion[rot].k1++;
      const ganamos = rally.some(a => ((a.tipo_accion === 'ataque' || a.tipo_accion === 'saque' || a.tipo_accion === 'bloqueo') && a.resultado === '#') || (a.tipo_accion === 'rival' && (a.subtipo === 'Error Rival' || a.resultado === '=')) || (a.tipo_accion === 'error_general' && (a.subtipo === 'Error Rival' || a.resultado === '#')));
      if (ganamos) porRotacion[rot].k1Puntos++;
    }
  });

  for (let i = 1; i <= 6; i++) {
    if (porRotacion[i].k1 >= 3) {
      const soPct = Math.round((porRotacion[i].k1Puntos / porRotacion[i].k1) * 100);
      if (soPct <= 30) {
        patrones.push({
          icon: '📉',
          text: `Rotación ${i} sufre en side-out (${soPct}%)`
        });
      }
      if (soPct >= 70) {
        patrones.push({
          icon: '💪',
          text: `Rotación ${i} domina en side-out (${soPct}%)`
        });
      }
    }
  }

  return patrones;
}
