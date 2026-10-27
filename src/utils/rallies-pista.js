// Única fuente de verdad para agrupar las acciones de pista en rallies (puntos).
//
// Cada acción guarda `punto_num` (nº de punto dentro del set) y `saque_inicio` (quién sacaba al
// empezar ese punto). Si existen se usan tal cual; si no (partidos antiguos) se deduce el rally
// mirando qué acciones cierran un punto.

const SIN_RALLY = ['tiempo_muerto', 'cambio', 'fin_set'];

// Acción que, por su tipo y resultado, termina un rally (se usa cuando no hay marcadores fiables).
export function esAccionTerminal(a) {
  if (!a || SIN_RALLY.includes(a.tipo_accion)) return false;
  if (a.tipo_accion === 'rival' || a.tipo_accion === 'error_general') return true;
  if (['recepcion', 'defensa', 'colocacion', 'freeball'].includes(a.tipo_accion)) return a.resultado === '=';
  return ['#', '=', '/'].includes(a.resultado);
}

// Quién suma el punto con esta acción, según su tipo y resultado.
export function ganadorAccion(a) {
  if (!a || SIN_RALLY.includes(a.tipo_accion)) return null;
  if (a.tipo_accion === 'rival') return a.resultado === '=' || a.subtipo === 'Error Rival' ? 'local' : 'rival';
  if (a.tipo_accion === 'error_general') return 'rival';
  if (a.resultado === '/' && a.tipo_accion === 'ataque') return 'rival';
  if (a.resultado === '=') return 'rival';
  if (a.resultado === '#' && ['ataque', 'saque', 'bloqueo'].includes(a.tipo_accion)) return 'local';
  return null;
}

const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));

// ¿Esta acción cerró el punto? Si tiene marcadores previos y posteriores, manda el marcador.
export function cierraPunto(a) {
  if (!a || SIN_RALLY.includes(a.tipo_accion)) return false;
  if (Number(a.scouting_version) >= 2) {
    const pre = num(a.marcador_pre_local) + num(a.marcador_pre_rival);
    const post = num(a.marcador_local) + num(a.marcador_rival);
    if (Number.isFinite(pre) && Number.isFinite(post)) return post > pre;
  }
  return esAccionTerminal(a);
}

function ganadorDeCierre(a) {
  if (Number(a.scouting_version) >= 2) {
    const dl = num(a.marcador_local) - num(a.marcador_pre_local);
    const dr = num(a.marcador_rival) - num(a.marcador_pre_rival);
    if (dl > 0) return 'local';
    if (dr > 0) return 'rival';
  }
  return ganadorAccion(a);
}

// Devuelve los rallies de cada set: { set, numero, acciones, cerrado, ganador, saqueInicio, rotacion, marcador }.
export function resumirRallies(acciones) {
  const orden = [...acciones].sort((a, b) => (a.id || 0) - (b.id || 0));
  const porSet = new Map();
  orden.forEach((a) => {
    if (a.tipo_accion === 'fin_set') return;
    const s = Number(a.set_numero) || 1;
    if (!porSet.has(s)) porSet.set(s, []);
    porSet.get(s).push(a);
  });

  const rallies = [];
  for (const [set, accs] of [...porSet.entries()].sort((x, y) => x[0] - y[0])) {
    const jugadas = accs.filter((a) => !SIN_RALLY.includes(a.tipo_accion));
    const conNumero = jugadas.length > 0 && jugadas.every((a) => Number(a.punto_num) > 0);

    let grupos;
    if (conNumero) {
      const mapa = new Map();
      let clave = null;
      accs.forEach((a) => {
        const n = Number(a.punto_num) > 0 ? Number(a.punto_num) : clave;
        if (n === null) return;
        clave = n;
        if (!mapa.has(n)) mapa.set(n, []);
        mapa.get(n).push(a);
      });
      grupos = [...mapa.entries()].sort((x, y) => x[0] - y[0]).map(([n, lista]) => ({ n, lista }));
    } else {
      grupos = [];
      let actual = [];
      accs.forEach((a) => {
        actual.push(a);
        if (cierraPunto(a)) { grupos.push({ n: grupos.length + 1, lista: actual }); actual = []; }
      });
      if (actual.length) grupos.push({ n: grupos.length + 1, lista: actual });
    }

    let previo = null;
    grupos.forEach(({ n, lista }) => {
      const cierre = [...lista].reverse().find(cierraPunto) || null;
      const ganador = cierre ? ganadorDeCierre(cierre) : null;
      const primera = lista.find((a) => !SIN_RALLY.includes(a.tipo_accion)) || lista[0];
      let saqueInicio = ['local', 'rival'].includes(primera?.saque_inicio) ? primera.saque_inicio : null;
      if (!saqueInicio && previo?.ganador) saqueInicio = previo.ganador; // quien gana el punto saca el siguiente
      if (!saqueInicio) {
        if (lista.some((a) => a.tipo_accion === 'saque')) saqueInicio = 'local';
        else if (lista.some((a) => a.tipo_accion === 'recepcion')) saqueInicio = 'rival';
        else saqueInicio = primera?.equipo_al_saque === 'rival' ? 'rival' : 'local';
      }
      const r = {
        set, numero: n, acciones: lista, cerrado: !!cierre, ganador, saqueInicio,
        rotacion: Number(primera?.rotacion) || null,
        marcador: cierre ? { local: num(cierre.marcador_local) || 0, rival: num(cierre.marcador_rival) || 0 } : null
      };
      rallies.push(r);
      previo = r;
    });
  }
  return rallies;
}

// Compatibilidad: lista de rallies como arrays de acciones.
export const agruparRallies = (acciones) => resumirRallies(acciones).map((r) => r.acciones);

// Número de punto y saque inicial que le corresponden a la próxima acción de un set.
export function siguientePunto(accionesDelSet, saqueSiVacio = 'local') {
  const rs = resumirRallies(accionesDelSet);
  const ultimo = rs[rs.length - 1];
  if (!ultimo) return { punto_num: 1, saque_inicio: saqueSiVacio };
  if (ultimo.cerrado) return { punto_num: ultimo.numero + 1, saque_inicio: ultimo.ganador || saqueSiVacio };
  return { punto_num: ultimo.numero, saque_inicio: ultimo.saqueInicio };
}

// Puntos ganados/jugados por rotación, separando cuando recibimos (side-out) y cuando sacamos (break-point).
// La rotación es la posición del colocador (R1..R6) que guarda cada acción.
export function rendimientoPorRotacion(rallies) {
  const filas = [1, 2, 3, 4, 5, 6].map((rot) => ({
    rot,
    recibiendo: { ganados: 0, total: 0 },
    sacando: { ganados: 0, total: 0 }
  }));
  rallies.forEach((r) => {
    if (!r.cerrado || !r.ganador || !(r.rotacion >= 1 && r.rotacion <= 6)) return;
    const celda = filas[r.rotacion - 1][r.saqueInicio === 'local' ? 'sacando' : 'recibiendo'];
    celda.total++;
    if (r.ganador === 'local') celda.ganados++;
  });
  return filas;
}

// Resumen de un set para la hoja de puntos: rachas máximas y mayor ventaja de cada equipo.
export function resumenSet(ralliesDelSet) {
  const cerrados = ralliesDelSet.filter((r) => r.cerrado && r.ganador && r.marcador);
  const res = { rachaLocal: 0, rachaRival: 0, ventajaLocal: 0, ventajaRival: 0, puntos: cerrados.length };
  let racha = 0; let previo = null;
  cerrados.forEach((r) => {
    racha = r.ganador === previo ? racha + 1 : 1;
    previo = r.ganador;
    if (r.ganador === 'local') res.rachaLocal = Math.max(res.rachaLocal, racha);
    else res.rachaRival = Math.max(res.rachaRival, racha);
    res.ventajaLocal = Math.max(res.ventajaLocal, r.marcador.local - r.marcador.rival);
    res.ventajaRival = Math.max(res.ventajaRival, r.marcador.rival - r.marcador.local);
  });
  return res;
}
