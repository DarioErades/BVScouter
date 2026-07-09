// calculador de estadísticas

export function calcularStats(acciones, jugador1Id, jugador2Id) {
    const stats = {
        jugador1: calcularStatsJugador(acciones, jugador1Id),
        jugador2: calcularStatsJugador(acciones, jugador2Id),
        general: calcularStatsGenerales(acciones)
    };
    return stats;
}

function calcularStatsJugador(acciones, jugadorId) {
    const accionesJugador = acciones.filter(a => a.jugador_id === jugadorId);

    // K1 a la primera vs K1 en transicion
    const ralliesK1 = {};
    acciones.forEach(a => {
        if (a.complejo === 'K1') {
            const key = `${a.set_numero}-${a.marcador_local}-${a.marcador_rival}`;
            if (!ralliesK1[key]) ralliesK1[key] = [];
            ralliesK1[key].push(a);
        }
    });

    let fbsoPuntos = 0;
    let transPuntos = 0;
    let fbsoOportunidades = 0;
    let transOportunidades = 0;

    Object.values(ralliesK1).forEach(rally => {
        const ataques = rally.filter(a => a.tipo_accion === 'ataque');
        const defensas = rally.filter(a => a.tipo_accion === 'defensa');
        const isFBSO = ataques.length <= 1 && defensas.length === 0;

        const puntoRally = rally.some(a => a.resultado === 'punto');
        const recibioJugador = rally.some(a => a.tipo_accion === 'recepcion' && a.jugador_id === jugadorId);
        const atacoJugador = rally.some(a => a.tipo_accion === 'ataque' && a.jugador_id === jugadorId);
        const hizoPunto = rally.some(a => a.resultado === 'punto' && a.jugador_id === jugadorId);
        
        // En voley playa, el side-out se atribuye a quien recibe.
        // Si no hay recepcion registrada, se lo atribuimos a quien atacó o hizo el punto.
        const hayRecepcionEnRally = rally.some(a => a.tipo_accion === 'recepcion');
        const participo = hayRecepcionEnRally ? recibioJugador : (atacoJugador || hizoPunto);

        if (participo) {
            if (isFBSO) {
                fbsoOportunidades++;
                if (puntoRally) fbsoPuntos++;
            } else {
                transOportunidades++;
                if (puntoRally) transPuntos++;
            }
        }
    });

    const totalK1 = fbsoOportunidades + transOportunidades;
    const puntosK1 = fbsoPuntos + transPuntos;

    const sideOutFirstPct = totalK1 > 0 ? Math.round((fbsoPuntos / totalK1) * 100) : 0;
    const sideOutTransPct = totalK1 > 0 ? Math.round((puntosK1 / totalK1) * 100) : 0;

    // Marcar ataques con fase (K1 vs K2)
    const ralliesAll = {};
    acciones.forEach(a => {
        const key = `${a.set_numero}-${a.marcador_local}-${a.marcador_rival}`;
        if (!ralliesAll[key]) ralliesAll[key] = [];
        ralliesAll[key].push(a);
    });

    Object.values(ralliesAll).forEach(rally => {
        let firstAttackDone = false;
        rally.forEach(a => {
            if (a.tipo_accion === 'ataque') {
                if (a.complejo === 'K1' && !firstAttackDone) {
                    a._fase = 'K1';
                    firstAttackDone = true;
                } else {
                    a._fase = 'K2';
                }
            }
        });
    });

    // distribucion de ataques
    const ataques = accionesJugador.filter(a => a.tipo_accion === 'ataque');
    const distribucionAtaquesGeneral = {};
    const distribucionAtaquesK1 = {};
    const distribucionAtaquesK2 = {};
    
    ataques.forEach(a => {
        const sub = a.subtipo || 'Sin definir';
        const isK1 = a._fase === 'K1';
        
        // General
        if (!distribucionAtaquesGeneral[sub]) distribucionAtaquesGeneral[sub] = { total: 0, puntos: 0, errores: 0 };
        distribucionAtaquesGeneral[sub].total++;
        if (a.resultado === 'punto') distribucionAtaquesGeneral[sub].puntos++;
        if (a.resultado === 'error') distribucionAtaquesGeneral[sub].errores++;

        // K1
        if (isK1) {
            if (!distribucionAtaquesK1[sub]) distribucionAtaquesK1[sub] = { total: 0, puntos: 0, errores: 0 };
            distribucionAtaquesK1[sub].total++;
            if (a.resultado === 'punto') distribucionAtaquesK1[sub].puntos++;
            if (a.resultado === 'error') distribucionAtaquesK1[sub].errores++;
        } 
        // K2
        else {
            if (!distribucionAtaquesK2[sub]) distribucionAtaquesK2[sub] = { total: 0, puntos: 0, errores: 0 };
            distribucionAtaquesK2[sub].total++;
            if (a.resultado === 'punto') distribucionAtaquesK2[sub].puntos++;
            if (a.resultado === 'error') distribucionAtaquesK2[sub].errores++;
        }
    });

    // distribucion de saques
    const saques = accionesJugador.filter(a => a.tipo_accion === 'saque');
    const distribucionSaques = {};
    saques.forEach(a => {
        const sub = a.subtipo || 'Sin definir';
        if (!distribucionSaques[sub]) {
            distribucionSaques[sub] = { total: 0, puntos: 0, errores: 0 };
        }
        distribucionSaques[sub].total++;
        if (a.resultado === 'punto') distribucionSaques[sub].puntos++;
        if (a.resultado === 'error') distribucionSaques[sub].errores++;
    });

    // calidad de recepcion promedio
    const recepciones = accionesJugador.filter(a => a.tipo_accion === 'recepcion');
    let calidadRecepcion = 0;
    let totalRecepciones = recepciones.length || 1;
    const distribucionRecepcion = {};
    recepciones.forEach(a => {
        const sub = a.subtipo || 'Sin definir';
        if (!distribucionRecepcion[sub]) distribucionRecepcion[sub] = 0;
        distribucionRecepcion[sub]++;

        const match = (a.subtipo || '').match(/\((\d+)\)/);
        if (match) calidadRecepcion += parseInt(match[1]);
    });
    // Sacamos la media sobre 10 (asumiendo que 3 es la nota máxima por acción)
    const recepcionPromedio = ((calidadRecepcion / totalRecepciones) * (10 / 3)).toFixed(1);

    // eficacia de ataque
    const killsAtaque = ataques.filter(a => a.resultado === 'punto').length;
    const erroresAtaque = ataques.filter(a => a.resultado === 'error').length;
    const totalAtaques = ataques.length || 1;
    const eficaciaAtaque = Math.round(((killsAtaque - erroresAtaque) / totalAtaques) * 100);

    // bloqueos
    const bloqueos = accionesJugador.filter(a => a.tipo_accion === 'bloqueo');
    const distribucionBloqueos = {};
    bloqueos.forEach(a => {
        const sub = a.subtipo || 'Sin definir';
        if (!distribucionBloqueos[sub]) distribucionBloqueos[sub] = 0;
        distribucionBloqueos[sub]++;
    });

    // defensas
    const defensas = accionesJugador.filter(a => a.tipo_accion === 'defensa');
    let calidadDefensa = 0;
    let defensasPuntuadas = 0;
    let erroresDefensa = 0;
    defensas.forEach(a => {
        if (a.resultado === 'neutra') return; // las neutras no cuentan para la media
        if (a.resultado === 'error') {
            erroresDefensa++;
        } else {
            const match = (a.subtipo || '').match(/\((\d+)\)/);
            if (match) {
                calidadDefensa += parseInt(match[1]);
                defensasPuntuadas++;
            }
        }
    });
    const defensaPromedio = defensasPuntuadas > 0 ? (calidadDefensa / defensasPuntuadas).toFixed(1) : '0.0';

    // golpes mas repetidos (solo ataques, ignoramos los fallos)
    const golpesRepetidosGeneral = {};
    const golpesRepetidosK1 = {};
    const golpesRepetidosK2 = {};
    
    ataques.forEach(a => {
        if (a.resultado === 'error') return; // si es fallo no cuenta
        const key = a.subtipo || 'Sin definir';
        
        if (!golpesRepetidosGeneral[key]) golpesRepetidosGeneral[key] = 0;
        golpesRepetidosGeneral[key]++;
        
        if (a._fase === 'K1') {
            if (!golpesRepetidosK1[key]) golpesRepetidosK1[key] = 0;
            golpesRepetidosK1[key]++;
        } else {
            if (!golpesRepetidosK2[key]) golpesRepetidosK2[key] = 0;
            golpesRepetidosK2[key]++;
        }
    });

    // ordenamos por frecuencia
    const getTop8 = (dict) => Object.entries(dict).sort((a, b) => b[1] - a[1]).slice(0, 8);
    
    const golpesOrdenadosGeneral = getTop8(golpesRepetidosGeneral);
    const golpesOrdenadosK1 = getTop8(golpesRepetidosK1);
    const golpesOrdenadosK2 = getTop8(golpesRepetidosK2);

    return {
        totalAcciones: accionesJugador.length,
        sideOutFirstPct,
        fbsoPuntos,
        fbsoOportunidades,
        sideOutTransPct,
        transPuntos,
        transOportunidades,
        puntosK1: fbsoPuntos + transPuntos,
        totalK1: fbsoOportunidades + transOportunidades,
        distribucionAtaquesGeneral,
        distribucionAtaquesK1,
        distribucionAtaquesK2,
        distribucionSaques,
        recepcionPromedio: parseFloat(recepcionPromedio),
        totalRecepciones: recepciones.length,
        distribucionRecepcion,
        eficaciaAtaque,
        totalAtaques: ataques.length,
        killsAtaque,
        erroresAtaque,
        distribucionBloqueos,
        totalBloqueos: bloqueos.length,
        defensaPromedio,
        erroresDefensa,
        golpesMasRepetidosGeneral: golpesOrdenadosGeneral,
        golpesMasRepetidosK1: golpesOrdenadosK1,
        golpesMasRepetidosK2: golpesOrdenadosK2,
        puntosDirectos: accionesJugador.filter(a => a.resultado === 'punto' && ['ataque', 'saque', 'bloqueo'].includes(a.tipo_accion)).length,
        erroresPropios: accionesJugador.filter(a => (a.resultado === 'error' || a.resultado === 'bloqueado') && ['ataque', 'saque', 'recepcion', 'defensa', 'colocacion'].includes(a.tipo_accion)).length
    };
}

function calcularStatsGenerales(acciones) {
    const totalAcciones = acciones.length;
    const puntos = acciones.filter(a => a.resultado === 'punto').length;
    const errores = acciones.filter(a => a.resultado === 'error').length;

    // side-out general del equipo rival
    const accionesK1 = acciones.filter(a => a.complejo === 'K1');
    const puntosK1 = accionesK1.filter(a => a.resultado === 'punto').length;
    const sideOutGeneral = accionesK1.length > 0
        ? Math.round((puntosK1 / accionesK1.length) * 100)
        : 0;

    // Calcular puntos totales del equipo sumando el máximo marcador local de cada set
    const sets = [...new Set(acciones.map(a => a.set_numero))];
    let puntosTotalesEquipo = 0;
    sets.forEach(s => {
        const accionesSet = acciones.filter(a => a.set_numero === s);
        const lastAction = accionesSet[accionesSet.length - 1];
        let maxScore = parseInt(lastAction.marcador_local) || 0;
        if (lastAction.resultado === 'punto' && lastAction.tipo_accion !== 'fin_set') {
            maxScore += 1;
        }
        puntosTotalesEquipo += maxScore;
    });

    // Errores del rival = Puntos totales - Puntos directos propios
    const puntosDirectosPropios = acciones.filter(a => 
        a.resultado === 'punto' && 
        ['ataque', 'saque', 'bloqueo'].includes(a.tipo_accion)
    ).length;
    const erroresRival = Math.max(0, puntosTotalesEquipo - puntosDirectosPropios);

    return {
        totalAcciones,
        puntos,
        errores,
        sideOutGeneral,
        erroresRival,
        puntosTotalesEquipo
    };
}

// detectar patrones automaticamente
export function detectarPatrones(acciones, jugador1Nombre, jugador2Nombre, jugador1Id, jugador2Id) {
    const patrones = [];

    [
        { id: jugador1Id, nombre: jugador1Nombre },
        { id: jugador2Id, nombre: jugador2Nombre }
    ].forEach(({ id, nombre }) => {
        const accionesJ = acciones.filter(a => a.jugador_id === id);
        const ataques = accionesJ.filter(a => a.tipo_accion === 'ataque');

        // patron: tipo de ataque favorito
        if (ataques.length >= 3) {
            const subtipos = {};
            ataques.forEach(a => {
                const sub = a.subtipo || 'desconocido';
                subtipos[sub] = (subtipos[sub] || 0) + 1;
            });
            const favorito = Object.entries(subtipos).sort((a, b) => b[1] - a[1])[0];
            const pct = Math.round((favorito[1] / ataques.length) * 100);
            if (pct >= 40) {
                patrones.push({
                    icon: '🎯',
                    text: `${nombre} usa "${favorito[0]}" en el ${pct}% de sus ataques`
                });
            }
        }



        // patron: errores frecuentes
        const errores = accionesJ.filter(a => a.resultado === 'error');
        const totalJ = accionesJ.length || 1;
        const pctErrores = Math.round((errores.length / totalJ) * 100);
        if (pctErrores >= 30 && errores.length >= 3) {
            patrones.push({
                icon: '⚠️',
                text: `${nombre} tiene una tasa de error alta (${pctErrores}%)`
            });
        }

        // patron: side-out
        const k1 = accionesJ.filter(a => a.complejo === 'K1');
        const puntosK1 = k1.filter(a => a.resultado === 'punto').length;
        if (k1.length >= 5) {
            const soRate = Math.round((puntosK1 / k1.length) * 100);
            if (soRate >= 75) {
                patrones.push({
                    icon: '🔥',
                    text: `${nombre} tiene un side-out excelente (${soRate}%)`
                });
            } else if (soRate <= 40) {
                patrones.push({
                    icon: '📉',
                    text: `${nombre} tiene un side-out bajo (${soRate}%) - punto débil`
                });
            }
        }
    });

    return patrones;
}
