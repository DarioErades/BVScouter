// Reglas puras compartidas por los modos de scouting. Al no depender del DOM
// se pueden probar y reutilizar sin duplicar la lógica del marcador.

export const RESULTADOS_CON_PUNTO_RIVAL = new Set(['error', 'bloqueado']);

export function scoreDeltaForResult(resultado) {
    if (resultado === 'punto') return { local: 1, rival: 0 };
    if (RESULTADOS_CON_PUNTO_RIVAL.has(resultado)) return { local: 0, rival: 1 };
    return { local: 0, rival: 0 };
}

export function applyScoreDelta(score, delta) {
    return {
        local: Math.max(0, Number(score.local || 0) + Number(delta.local || 0)),
        rival: Math.max(0, Number(score.rival || 0) + Number(delta.rival || 0))
    };
}

export function scoreFromActions(acciones) {
    return acciones.reduce((score, accion) => applyScoreDelta(score, scoreDeltaForResult(accion.resultado)), { local: 0, rival: 0 });
}

export function scoreToString(score) {
    return `${score.local}-${score.rival}`;
}
