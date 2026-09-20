// Atajos configurables. Se guardan por modalidad para que playa y pista no se interfieran.
import { getPrefs, savePrefs } from './theme.js';
import { TIPOS_ACCION, SUBTIPOS } from './constants.js';
import { TIPOS_ACCION_PISTA, SUBTIPOS_PISTA } from './constants-pista.js';

const COMMON_PLAYA = [
    ['open-settings', 'Abrir ajustes', 'F10'],
    ['whistle-previous', 'Silbato anterior', 'MouseBack'], ['whistle-next', 'Siguiente silbato', 'MouseForward'],
    ['player-1', 'Jugador 1', '1'], ['player-2', 'Jugador 2', '2'],
    ['result-point', 'Resultado: punto', 'Enter'], ['result-error', 'Resultado: error', 'Backspace'],
    ['result-blocked', 'Resultado: bloqueado', '7'], ['result-positive', 'Resultado: positiva', '+'],
    ['result-negative', 'Resultado: negativa', '!'], ['undo', 'Deshacer última acción', 'z'],
    ['video-play', 'Vídeo: reproducir / pausar', ' '], ['video-forward', 'Vídeo: avanzar', 'ArrowRight'],
    ['video-backward', 'Vídeo: retroceder', 'ArrowLeft'], ['video-frame-forward', 'Vídeo: avanzar fotograma', '.'],
    ['video-slower', 'Vídeo: bajar velocidad', '['], ['video-faster', 'Vídeo: subir velocidad', ']'],
    ['video-fullscreen', 'Vídeo: pantalla completa', 'f'], ['video-speed-3x', 'Vídeo: 3× mientras se mantiene', 'p'],
    ['video-reverse', 'Vídeo: reversa', 'l']
];
const WIZARD_PLAYA = [
    ['wizard-attack', 'Asistente de ataque: ataque', 'a'], ['wizard-touch', 'Asistente de ataque: toque', 't'],
    ['wizard-accelerated', 'Asistente de ataque: acelerada', 'q'], ['wizard-replay', 'Asistente de ataque: rejuego', 'r'],
    ['wizard-fight', 'Asistente de ataque: lucha', 'l']
];

const COMMON_PISTA = [
    ['open-settings', 'Abrir ajustes', 'F10'],
    ['whistle-previous', 'Silbato anterior', 'MouseBack'], ['whistle-next', 'Siguiente silbato', 'MouseForward'],
    ['result-point', 'Resultado: punto', 'Enter'], ['result-error', 'Resultado: error', '='], ['result-error-alt', 'Resultado: error (alternativo)', 'Backspace'],
    ['result-blocked', 'Resultado: bloqueado', '/'], ['result-blocked-alt', 'Resultado: bloqueado (alternativo)', '8'],
    ['result-positive', 'Resultado: positiva', '+'], ['result-negative', 'Resultado: negativa', '!'], ['result-poor', 'Resultado: pobre', '-'], ['undo', 'Deshacer última acción', 'z'],
    ['video-play', 'Vídeo: reproducir / pausar', ' '], ['video-forward', 'Vídeo: avanzar', 'ArrowRight'],
    ['video-backward', 'Vídeo: retroceder', 'ArrowLeft'], ['timeout', 'Registrar tiempo muerto', 't'],
    ['video-speed-3x', 'Vídeo: 3× mientras se mantiene', 'p']
];

function definitions(mode) {
    const types = mode === 'pista' ? TIPOS_ACCION_PISTA : TIPOS_ACCION;
    const subtypes = mode === 'pista' ? SUBTIPOS_PISTA : SUBTIPOS;
    const common = mode === 'pista' ? COMMON_PISTA : COMMON_PLAYA;
    const actions = Object.entries(types)
        .filter(([id]) => !['cambio', 'tiempo_muerto'].includes(id))
        .map(([id, value]) => [`action-${id}`, `Acción: ${value.label}`, value.key]);
    const subtypeRows = Object.entries(subtypes).flatMap(([type, entries]) =>
        entries.map((entry, index) => [`subtype-${type}-${index}`, `${types[type]?.label || type}: ${entry.label}`, entry.key])
    );
    return { actions, common: mode === 'playa' ? [...common, ...WIZARD_PLAYA] : common, subtypeRows };
}

export function getKeybindingDefinitions(mode) {
    return definitions(mode);
}

export function getKeybindings(mode) {
    const saved = getPrefs().keybindings?.[mode] || {};
    const rows = Object.values(definitions(mode)).flat();
    return Object.fromEntries(rows.map(([id,, fallback]) => [id, saved[id] ?? fallback]));
}

export function saveKeybindings(mode, bindings) {
    const all = { ...(getPrefs().keybindings || {}) };
    all[mode] = { ...getKeybindings(mode), ...bindings };
    savePrefs({ keybindings: all });
}

export function resetKeybindings(mode) {
    const all = { ...(getPrefs().keybindings || {}) };
    delete all[mode];
    savePrefs({ keybindings: all });
}

export function actionForKey(mode, key) {
    const bindings = getKeybindings(mode);
    const found = Object.entries(bindings).find(([, value]) => value === key);
    if (!found) return null;
    const [id] = found;
    if (id.startsWith('action-')) return { action: 'selectAction', value: id.slice(7) };
    const map = {
        'player-1': { action: 'selectPlayer', value: 1 }, 'player-2': { action: 'selectPlayer', value: 2 },
        'result-point': { action: 'resultPunto' }, 'result-error': { action: 'resultError' },
        'result-blocked': { action: 'resultBloqueado' }, 'result-blocked-alt': { action: 'resultBloqueado' },
        'result-positive': { action: 'resultPositiva' },
        'result-negative': { action: 'resultNegativa' }, 'result-poor': { action: 'resultPobre' },
        'result-error-alt': { action: 'resultError' }, 'undo': { action: 'undo' },
        'video-play': { action: 'videoPlayPause' }, 'video-forward': { action: 'videoForward' },
        'video-backward': { action: 'videoBackward' }, 'video-frame-forward': { action: 'videoFrameForward' },
        'video-slower': { action: 'videoSlower' }, 'video-faster': { action: 'videoFaster' },
        'video-fullscreen': { action: 'videoFullscreen' }, 'video-speed-3x': { action: 'videoSpeed3x' },
        'video-reverse': { action: 'videoReverse' }, 'timeout': { action: 'registerTimeout' },
        'whistle-previous': { action: 'whistlePrevious' }, 'whistle-next': { action: 'whistleNext' },
        'open-settings': { action: 'openSettings' }
    };
    return map[id] || null;
}

export function subtypeForKey(mode, type, key) {
    const { subtypeRows } = definitions(mode);
    const bindings = getKeybindings(mode);
    const row = subtypeRows.find(([id]) => id.startsWith(`subtype-${type}-`) && bindings[id] === key);
    if (!row) return null;
    const index = Number(row[0].split('-').pop());
    const source = mode === 'pista' ? SUBTIPOS_PISTA : SUBTIPOS;
    return source[type]?.[index] || null;
}

export function keyFor(mode, id) {
    return getKeybindings(mode)[id];
}
