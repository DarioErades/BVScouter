// constantes del scouting de voley pista (indoor)

export const POSICIONES_PISTA = [
  'Colocador', 'Opuesto', 'Central', 'Receptor', 'Líbero'
];

export const TIPOS_ACCION_PISTA = {
  saque:      { label: 'Saque',      key: 's', abbr: 'SAQ', icon: '🏐' },
  recepcion:  { label: 'Recepción',  key: 'r', abbr: 'REC', icon: '🤲' },
  colocacion: { label: 'Colocación', key: 'c', abbr: 'COL', icon: '👆' },
  ataque:     { label: 'Ataque',     key: 'a', abbr: 'ATQ', icon: '💥' },
  bloqueo:    { label: 'Bloqueo',    key: 'b', abbr: 'BLQ', icon: '🛡️' },
  defensa:    { label: 'Defensa',    key: 'd', abbr: 'DEF', icon: '🏊' },
  freeball:   { label: 'Free Ball',  key: 'f', abbr: 'FRB', icon: '🎯' },
  tiempo_muerto: { label: 'Tiempo Muerto', key: 't', abbr: 'TM', icon: '⏱️' },
  cambio:     { label: 'Sustitución',key: '',  abbr: 'CAM', icon: '🔄' },
  rival:      { label: 'Rival',      key: 'v', abbr: 'RIV', icon: '❌' },
  error_general: { label: 'Error General', key: 'e', abbr: 'ERR', icon: '⚠️' },
};

export const SUBTIPOS_PISTA = {
  saque: [
    { label: 'Flotante pie',   key: 'f' },
    { label: 'Flotante salto', key: 'j' },
    { label: 'Potente',        key: 'p' },
    { label: 'Topspin',        key: 't' },
  ],
  recepcion: [
    { label: 'Antebrazos', key: 'a' },
    { label: 'Dedos',      key: 'd' },
  ],
  colocacion: [
    { label: 'Dedos',      key: 'd' },
    { label: 'Antebrazos', key: 'a' },
    { label: 'Salto',      key: 's' },
  ],
  ataque: [
    { label: 'Diagonal',       key: 'd' },
    { label: 'Línea',          key: 'l' },
    { label: 'Centro (rápida)',key: 'm' },
    { label: 'Pipe',           key: 'p' },
    { label: 'Finta/Tip',      key: 't' },
    { label: 'Segundo toque',  key: '2' },
    { label: 'Zaguero',        key: 'z' },
  ],
  bloqueo: [
    { label: 'Individual', key: '1' },
    { label: 'Doble',      key: '2' },
    { label: 'Triple',     key: '3' },
  ],
  defensa: [
    { label: 'Plancha',  key: 'p' },
    { label: 'Rodilla',  key: 'r' },
    { label: 'Normal',   key: 'n' },
  ],
  tiempo_muerto: [
    { label: 'Solicitado por Local', key: 'l' },
    { label: 'Solicitado por Rival', key: 'r' },
  ],
  rival: [
    { label: 'Acierto Rival', key: 'a' },
    { label: 'Error Rival',   key: 'e' },
  ],
  error_general: [
    { label: 'Red / Invasión',      key: 'r' },
    { label: 'Posición / Rotación', key: 'p' },
    { label: 'Retención / Dobles',  key: 'd' },
    { label: 'Conducta / Tarjeta',  key: 'c' },
  ],
};

// Resultados estilo DataVolley
// '#' = Punto/Kill, '+' = Positiva, '!' = Negativa/Pobre,
// '-' = Negativa fuerte, '/' = Bloqueado, '=' = Error
export const RESULTADOS_PISTA = {
  '#': { label: 'Punto',     icon: '#', class: 'punto',     shortcut: 'Enter' },
  '+': { label: 'Positiva',  icon: '+', class: 'positiva',  shortcut: '+' },
  '!': { label: 'Negativa',  icon: '!', class: 'negativa',  shortcut: '!' },
  '-': { label: 'Pobre',     icon: '-', class: 'pobre',     shortcut: '' },
  '/': { label: 'Bloqueado', icon: '/', class: 'bloqueado', shortcut: '7' },
  '=': { label: 'Error',     icon: '=', class: 'error',     shortcut: 'Backspace' },
};

// Resultados aplicables por tipo de acción
export const RESULTADOS_POR_ACCION = {
  saque:      ['#', '+', '-', '='],         // Ace, positivo, negativo, error
  recepcion:  ['#', '+', '!', '-', '/', '='], // La / es una recepción que regala balón, pero no cierra el rally
  colocacion: ['#', '+', '!', '='],         // Asist. punto, buena, mala, error
  ataque:     ['#', '+', '!', '-', '/', '='],    // Kill, continuidad, negativa, pobre, bloqueado, error
  bloqueo:    ['#', '+', '='],              // Stuff block, toque, error
  defensa:    ['#', '+', '!', '/', '='],    // La / es una defensa que regala balón, pero no cierra el rally
  freeball:   ['#', '+', '!', '='],         // Doble positiva, buena, mala, error
  tiempo_muerto: ['+'],                     // Registro de tiempo muerto
  cambio:     ['+'],                        // Cambio realizado con éxito
  rival:      ['#', '='],                   // '#' = Acierto Rival (punto del rival), '=' = Error Rival (punto a favor)
  error_general: ['='],                     // '=' = Error de equipo (punto del rival)
};

export const COMPLEJOS_PISTA = {
  K1: 'K1 (Side-Out)',
  K2: 'K2 (Transición)'
};

export const FASES_TORNEO_PISTA = [
  'Jornada Regular',
  'Fase de Grupos',
  'Dieciseisavos',
  'Octavos de Final',
  'Cuartos de Final',
  'Semifinal',
  'Partido por el 3er puesto',
  'Final'
];

// Atajos de teclado para el scouting de pista
export const SHORTCUTS_PISTA = {
  // tipos de accion
  's': { action: 'selectAction', value: 'saque' },
  'r': { action: 'selectAction', value: 'recepcion' },
  'c': { action: 'selectAction', value: 'colocacion' },
  'a': { action: 'selectAction', value: 'ataque' },
  'b': { action: 'selectAction', value: 'bloqueo' },
  'd': { action: 'selectAction', value: 'defensa' },
  'f': { action: 'selectAction', value: 'freeball' },
  't': { action: 'registerTimeout' },
  'v': { action: 'selectAction', value: 'rival' },
  'e': { action: 'selectAction', value: 'error_general' },

  // resultados
  'Enter': { action: 'resultPunto' },
  'Backspace': { action: 'resultError' },
  '7': { action: 'resultBloqueado' },

  // deshacer
  'z': { action: 'undo' },

  // video
  ' ': { action: 'videoPlayPause' },
  'ArrowRight': { action: 'videoForward' },
  'ArrowLeft': { action: 'videoBackward' },
};
