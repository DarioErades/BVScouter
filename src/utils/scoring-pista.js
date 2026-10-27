// Lógica pura de marcador, saque y rotación del scouting de pista (sin DOM ni estado global).

// La rotación R es la posición del colocador (R6 = colocador en P6...). Al rotar el equipo
// pasa de P6 a P5, P4... P1 y vuelve a P6. El lineup guardado es la colocación con el
// colocador en P1 (R1); al fijar titulares se "deshace" la rotación r.
export const rotarAdelante = (r) => (r === 1 ? 6 : r - 1);
export const rotarAtras = (r) => (r === 6 ? 1 : r + 1);
export const giros = (r) => (7 - r) % 6;
export const slotEnPosicion = (posNum, r) => ((posNum - 1 + giros(r)) % 6) + 1;

// Quién anota con una acción y cómo queda normalizada (resultado y subtipo).
export function resolverPunto(tipoAccion, resultado, subtipo) {
  let anota = null;
  if (tipoAccion === 'rival') {
    if (resultado === '#' || subtipo === 'Acierto Rival') {
      anota = 'rival'; resultado = '#'; subtipo = subtipo || 'Acierto Rival';
    } else if (resultado === '=' || subtipo === 'Error Rival') {
      anota = 'local'; resultado = '='; subtipo = subtipo || 'Error Rival';
    }
  } else if (tipoAccion === 'error_general') {
    anota = 'rival'; // el error general del equipo suma punto al rival
  } else if (resultado === '#' && ['ataque', 'saque', 'bloqueo'].includes(tipoAccion)) {
    anota = 'local'; // solo ataque, saque o bloqueo ganadores dan punto directo
  } else if (resultado === '=') {
    anota = 'rival'; // cualquier error propio suma punto al rival
  } else if (resultado === '/' && tipoAccion === 'ataque') {
    anota = 'rival'; // ataque bloqueado
  }
  return { anota, resultado, subtipo };
}

// Aplica un punto al estado: marcador, quién saca y rotación (al recuperar el saque se rota).
export function aplicarPunto({ marcadorLocal, marcadorRival, equipoAlSaque, rotacionActual }, anota) {
  const s = { marcadorLocal, marcadorRival, equipoAlSaque, rotacionActual };
  if (anota === 'local') {
    s.marcadorLocal++;
    if (s.equipoAlSaque === 'rival') s.rotacionActual = rotarAdelante(s.rotacionActual);
    s.equipoAlSaque = 'local';
  } else if (anota === 'rival') {
    s.marcadorRival++;
    s.equipoAlSaque = 'rival';
  } else if (!s.equipoAlSaque) {
    s.equipoAlSaque = 'local';
  }
  return s;
}
