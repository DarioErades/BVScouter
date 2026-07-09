// constantes del scouting

export const TIPOS_ACCION = {
    saque: { label: 'Saque', key: 's' },
    recepcion: { label: 'Recepción', key: 'r' },
    colocacion: { label: 'Colocación', key: 'c' },
    ataque: { label: 'Ataque', key: 'a' },
    bloqueo: { label: 'Bloqueo', key: 'b' },
    defensa: { label: 'Defensa', key: 'd' },
    rival: { label: 'Acierto Rival', key: '' },
    error_general: { label: 'Error General', key: '' }
};

export const SUBTIPOS = {
    saque: [
        { label: 'Flotante', key: 'f' },
        { label: 'Potente', key: 'p' },
        { label: 'Topspin', key: 't' },
        { label: 'Skyball', key: 'y' }
    ],
    recepcion: [
        { label: 'Perfecta (3)', key: '3' },
        { label: 'Buena (2)', key: '2' },
        { label: 'Mala (1)', key: '1' },
        { label: 'Error (0)', key: '0' }
    ],
    colocacion: [
        { label: 'Manos', key: 'm' },
        { label: 'Antebrazos', key: 'a' },
        { label: 'Salto', key: 's' }
    ],
    ataque: [
        { label: 'Remate Potente', key: 'r' },
        { label: 'Cut Shot', key: 'c' },
        { label: 'Line Shot', key: 'l' },
        { label: 'Poke', key: 'p' },
        { label: 'Rainbow', key: 'b' },
        { label: 'Segundo Toque', key: '2' }
    ],
    bloqueo: [
        { label: 'Stuff Block', key: 's' },
        { label: 'Touch', key: 't' },
        { label: 'Split', key: 'p' },
        { label: 'Peel', key: 'l' }
    ],
    defensa: [
        { label: 'Defensa (1)', key: '1' },
        { label: 'Defensa (2)', key: '2' },
        { label: 'Defensa (3)', key: '3' },
        { label: 'Defensa (4)', key: '4' },
        { label: 'Defensa (5)', key: '5' },
        { label: 'Defensa (6)', key: '6' },
        { label: 'Defensa (7)', key: '7' },
        { label: 'Defensa (8)', key: '8' },
        { label: 'Defensa (9)', key: '9' },
        { label: 'Defensa (10)', key: '0' },
        { label: 'Error (-)', key: '-' },
        { label: 'Neutra', key: ',' }
    ]
};

export const RESULTADOS = {
    punto: { label: 'Punto', icon: '✓', class: 'punto' },
    error: { label: 'Error', icon: '✗', class: 'error' },
    continuidad: { label: 'Continuidad', icon: '↺', class: 'continuidad' },
    bloqueado: { label: 'Bloqueado', icon: '🛡️', class: 'bloqueado' },
    neutra: { label: 'Neutra', icon: '—', class: 'continuidad' }
};

export const COMPLEJOS = {
    K1: 'K1 (Side-Out)',
    K2: 'K2 (Transición)'
};

// atajos de teclado para el scouting
export const SHORTCUTS = {
    // seleccion de jugador
    '1': { action: 'selectPlayer', value: 1 },
    '2': { action: 'selectPlayer', value: 2 },

    // tipos de accion
    's': { action: 'selectAction', value: 'saque' },
    'r': { action: 'selectAction', value: 'recepcion' },
    'c': { action: 'selectAction', value: 'colocacion' },
    'a': { action: 'selectAction', value: 'ataque' },
    'b': { action: 'selectAction', value: 'bloqueo' },
    'd': { action: 'selectAction', value: 'defensa' },

    // resultados de la ultima accion
    'Enter': { action: 'markLastActionAsPoint' },
    'Backspace': { action: 'markLastActionAsError' },

    // deshacer
    'z': { action: 'undo' },

    // marcador y sets

    // video
    ' ': { action: 'videoPlayPause' },
    'ArrowRight': { action: 'videoForward' },
    'ArrowLeft': { action: 'videoBackward' },
    '.': { action: 'videoFrameForward' },
    '-': { action: 'videoSlower' },
    '+': { action: 'videoFaster' },
    'f': { action: 'videoFullscreen' }
};

export const FASES_TORNEO = [
    'Fase de Grupos',
    'Dieciseisavos',
    'Octavos de Final',
    'Cuartos de Final',
    'Semifinal',
    'Partido por el Bronce',
    'Final'
];

export const NACIONALIDADES = [
    'España', 'Brasil', 'Estados Unidos', 'Italia', 'Alemania',
    'Noruega', 'Suecia', 'Países Bajos', 'Australia', 'Canadá',
    'Argentina', 'Chile', 'México', 'Qatar', 'Letonia',
    'Polonia', 'República Checa', 'Austria', 'Suiza', 'Francia',
    'Portugal', 'Cuba', 'Japón', 'China', 'Otro'
];
