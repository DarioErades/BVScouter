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

    // side-out: rallies ganados en K1
    const accionesK1 = accionesJugador.filter(a => a.complejo === 'K1');
    const puntosK1 = accionesK1.filter(a => a.resultado === 'punto').length;
    const totalK1 = accionesK1.length || 1;
    const sideOutPct = Math.round((puntosK1 / totalK1) * 100);

    // distribucion de ataques
    const ataques = accionesJugador.filter(a => a.tipo_accion === 'ataque');
    const distribucionAtaques = {};
    ataques.forEach(a => {
        const sub = a.subtipo || 'Sin definir';
        if (!distribucionAtaques[sub]) {
            distribucionAtaques[sub] = { total: 0, puntos: 0, errores: 0 };
        }
        distribucionAtaques[sub].total++;
        if (a.resultado === 'punto') distribucionAtaques[sub].puntos++;
        if (a.resultado === 'error') distribucionAtaques[sub].errores++;
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
    recepciones.forEach(a => {
        const match = (a.subtipo || '').match(/\((\d)\)/);
        if (match) calidadRecepcion += parseInt(match[1]);
    });
    const recepcionPromedio = (calidadRecepcion / totalRecepciones).toFixed(1);

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

    // golpes mas repetidos (todos los tipos de accion)
    const golpesMasRepetidos = {};
    accionesJugador.forEach(a => {
        const key = `${a.tipo_accion} - ${a.subtipo || 'Sin definir'}`;
        if (!golpesMasRepetidos[key]) golpesMasRepetidos[key] = 0;
        golpesMasRepetidos[key]++;
    });

    // ordenamos por frecuencia
    const golpesOrdenados = Object.entries(golpesMasRepetidos)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    return {
        totalAcciones: accionesJugador.length,
        sideOutPct,
        puntosK1,
        totalK1: accionesK1.length,
        distribucionAtaques,
        distribucionSaques,
        recepcionPromedio: parseFloat(recepcionPromedio),
        totalRecepciones: recepciones.length,
        eficaciaAtaque,
        totalAtaques: ataques.length,
        killsAtaque,
        erroresAtaque,
        distribucionBloqueos,
        totalBloqueos: bloqueos.length,
        golpesMasRepetidos: golpesOrdenados
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

    return {
        totalAcciones,
        puntos,
        errores,
        sideOutGeneral
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

        // patron: tendencia de saque
        const saques = accionesJ.filter(a => a.tipo_accion === 'saque');
        if (saques.length >= 3) {
            const tiposSaque = {};
            saques.forEach(a => {
                const sub = a.subtipo || 'desconocido';
                tiposSaque[sub] = (tiposSaque[sub] || 0) + 1;
            });
            const fav = Object.entries(tiposSaque).sort((a, b) => b[1] - a[1])[0];
            const pct = Math.round((fav[1] / saques.length) * 100);
            if (pct >= 50) {
                patrones.push({
                    icon: '🏐',
                    text: `${nombre} saca "${fav[0]}" el ${pct}% de las veces`
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
