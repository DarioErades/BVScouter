// constantes del scouting

export const TIPOS_ACCION = {
    saque: 'Saque',
    recepcion: 'Recepción',
    colocacion: 'Colocación',
    ataque: 'Ataque',
    bloqueo: 'Bloqueo',
    defensa: 'Defensa'
};

export const SUBTIPOS = {
    saque: ['Flotante', 'Potente', 'Topspin', 'Skyball'],
    recepcion: ['Perfecta (3)', 'Buena (2)', 'Mala (1)', 'Error (0)'],
    colocacion: ['Manos', 'Antebrazos', 'Salto'],
    ataque: ['Remate Potente', 'Cut Shot', 'Line Shot', 'Poke', 'Rainbow', 'Segundo Toque'],
    bloqueo: ['Stuff Block', 'Touch', 'Split', 'Peel'],
    defensa: ['Dig', 'Emergency', 'Free Ball']
};

export const RESULTADOS = {
    punto: { label: 'Punto', icon: '✓', class: 'punto' },
    error: { label: 'Error', icon: '✗', class: 'error' },
    continuidad: { label: 'Continuidad', icon: '↺', class: 'continuidad' }
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

    // cambiar complejo
    'q': { action: 'toggleComplex' },

    // tipos de accion
    's': { action: 'selectAction', value: 'saque' },
    'r': { action: 'selectAction', value: 'recepcion' },
    'c': { action: 'selectAction', value: 'colocacion' },
    'a': { action: 'selectAction', value: 'ataque' },
    'b': { action: 'selectAction', value: 'bloqueo' },
    'd': { action: 'selectAction', value: 'defensa' },

    // resultados
    'Enter': { action: 'setResult', value: 'punto' },
    'Backspace': { action: 'setResult', value: 'error' },
    'Tab': { action: 'setResult', value: 'continuidad' },

    // deshacer
    'z': { action: 'undo' },

    // marcador y sets
    'p': { action: 'addPoint' },
    'n': { action: 'newSet' },

    // video
    ' ': { action: 'videoPlayPause' },
    'ArrowRight': { action: 'videoForward' },
    'ArrowLeft': { action: 'videoBackward' },
    '.': { action: 'videoFrameForward' },
    ',': { action: 'videoFrameBackward' },
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
